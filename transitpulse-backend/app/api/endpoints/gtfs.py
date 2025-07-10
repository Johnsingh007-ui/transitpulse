import asyncio
import json
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Dict, List, Optional, Any, Union
import logging

from app.core.database import get_db
from app.models.gtfs_static import (
    GTFSRoute as GTFSRouteModel, 
    GTFSStop as GTFSStopModel, 
    GTFSStopTime, 
    GTFSTrip,
    GTFSShape
)
from app.websocket.manager import manager
from app.schemas.gtfs import GTFSRoute, GTFSRouteResponse, GTFSStop as GTFSStopSchema, GTFSStopResponse
from data_ingestion.auto_gtfs_updater import auto_updater

# Set up logging
logger = logging.getLogger(__name__)

# In-memory storage for vehicle positions (for demo purposes)
vehicle_positions: Dict[str, Dict] = {}

router = APIRouter(
    tags=["gtfs"],
    responses={404: {"description": "Not found"}},
)

@router.get("/routes", response_model=GTFSRouteResponse)
async def get_gtfs_routes(
    db: AsyncSession = Depends(get_db),
    limit: int = Query(100, gt=0, le=1000),
    offset: int = Query(0, ge=0)
):
    """
    Get GTFS bus routes from the database with pagination.
    Only returns routes with route_type = 3 (bus routes).
    """
    try:
        result = await db.execute(
            select(GTFSRouteModel)
            .where(GTFSRouteModel.route_type == 3)  # Only bus routes
            .order_by(GTFSRouteModel.route_short_name)
            .offset(offset)
            .limit(limit)
        )
        db_routes = result.scalars().all()

        routes = [
            GTFSRoute.model_validate({
                col.name: getattr(route, col.name)
                for col in route.__table__.columns
            })
            for route in db_routes
        ]

        return {
            "routes": routes,
            "status": "success",
            "message": f"{len(routes)} bus routes returned"
        }

    except Exception as e:
        logger.error("Error fetching bus routes", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "status": "error",
                "message": str(e),
                "data": []
            }
        )

@router.get("/test")
async def test_connection():
    """Test endpoint to verify API is running."""
    return {"port": 8000, "status": "success", "message": "API is running"}

@router.get("/stops", response_model=GTFSStopResponse, name="get_stops")
async def get_stops_by_route(
    route_id: str = Query(..., description="Filter stops by route ID (can be full ID like 'GG_101' or just the number '101')"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all stops for a specific route.
    
    This endpoint returns all stops that are served by trips belonging to the specified route.
    Accepts both full route IDs (e.g., 'GG_101') and numeric route IDs (e.g., '101').
    """
    try:
        # If route_id is numeric, try to find a matching route with any agency prefix
        actual_route_id = route_id
        if route_id.isdigit():
            result = await db.execute(
                select(GTFSRouteModel.route_id)
                .where(GTFSRouteModel.route_id.endswith(f'_{route_id}'))
            )
            matching_route = result.scalar_one_or_none()
            if matching_route:
                actual_route_id = matching_route  # Use the full route ID

        # Get trips for this route
        result = await db.execute(
            select(GTFSTrip.trip_id)
            .where(GTFSTrip.route_id == actual_route_id)
        )
        trip_ids = [trip[0] for trip in result.fetchall()]
        
        if not trip_ids:
            return {
                "status": "success", 
                "message": f"Route {route_id} exists but has no trips defined",
                "data": []
            }
        
        # Get stops via stop_times
        result = await db.execute(
            select(GTFSStopModel)
            .join(GTFSStopTime, GTFSStopModel.stop_id == GTFSStopTime.stop_id)
            .where(GTFSStopTime.trip_id.in_(trip_ids))
            .distinct()
            .order_by(GTFSStopModel.stop_name)
        )
        
        # Convert SQLAlchemy objects to dictionaries
        stops = []
        for stop in result.scalars().all():
            stop_dict = {
                'stop_id': stop.stop_id,
                'stop_code': stop.stop_code,
                'stop_name': stop.stop_name,
                'stop_lat': float(stop.stop_lat) if stop.stop_lat is not None else None,
                'stop_lon': float(stop.stop_lon) if stop.stop_lon is not None else None,
                'zone_id': stop.zone_id,
                'wheelchair_boarding': stop.wheelchair_boarding
            }
            # Only add the stop if it has a valid stop_id
            if stop_dict['stop_id'] is not None:
                stops.append(stop_dict)
        
        if not stops:
            return {
                "status": "success",
                "message": f"Route {route_id} has {len(trip_ids)} trips but no stop schedule data loaded",
                "data": []
            }
        
        return {
            "status": "success",
            "message": f"Found {len(stops)} stops for route {route_id}",
            "data": stops
        }
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"Error in get_stops_by_route: {error_details}")
        raise HTTPException(
            status_code=500,
            detail={
                "status": "error",
                "message": f"Error fetching stops: {str(e)}",
                "details": str(e)
            }
        )

async def get_route_details(db: AsyncSession, route_id: str) -> Optional[Dict[str, Any]]:
    """Helper function to get detailed route information including shapes and stops."""
    try:
        # Get the route
        result = await db.execute(
            select(GTFSRouteModel)
            .where(GTFSRouteModel.route_id == route_id)
        )
        route = result.scalar_one_or_none()
        
        if not route:
            return None
            
        # Get trips for this route
        result = await db.execute(
            select(GTFSTrip)
            .where(GTFSTrip.route_id == route_id)
        )
        trips = result.scalars().all()
        trip_ids = [trip.trip_id for trip in trips]
        
        # Get stops via stop_times
        stops = []
        if trip_ids:
            result = await db.execute(
                select(GTFSStopModel)
                .join(GTFSStopTime, GTFSStopModel.stop_id == GTFSStopTime.stop_id)
                .where(GTFSStopTime.trip_id.in_(trip_ids))
                .distinct()
            )
            stops = [{
                "stop_id": stop.stop_id,
                "stop_name": stop.stop_name,
                "stop_lat": float(stop.stop_lat) if stop.stop_lat else None,
                "stop_lon": float(stop.stop_lon) if stop.stop_lon else None,
                "wheelchair_boarding": stop.wheelchair_boarding
            } for stop in result.scalars().all()]
        
        # Get shapes
        shapes_dict = {}
        if trip_ids:
            shape_result = await db.execute(
                select(GTFSShape)
                .join(GTFSTrip, GTFSShape.shape_id == GTFSTrip.shape_id)
                .where(GTFSTrip.route_id == route_id)
                .order_by(GTFSShape.shape_id, GTFSShape.shape_pt_sequence)
            )
            
            # Group shape points by shape_id
            for shape in shape_result.scalars().all():
                if shape.shape_id not in shapes_dict:
                    shapes_dict[shape.shape_id] = []
                shapes_dict[shape.shape_id].append({
                    "lat": float(shape.shape_pt_lat),
                    "lon": float(shape.shape_pt_lon),
                    "sequence": shape.shape_pt_sequence
                })
        
        # Convert route to dict
        route_dict = {
            col.name: getattr(route, col.name)
            for col in route.__table__.columns
        }
        
        return {
            "route": route_dict,
            "shapes": [{"shape_id": sid, "points": pts} for sid, pts in shapes_dict.items()],
            "stops": stops
        }
        
    except Exception as e:
        logger.error(f"Error getting route details for {route_id}", exc_info=True)
        return None

@router.get("/routes/directions")
async def get_routes_with_directions(
    db: AsyncSession = Depends(get_db),
    route_id: Optional[str] = Query(None, description="Filter by specific route ID")
):
    """
    Get routes with their direction information.
    Returns routes grouped by direction with headsigns and trip counts.
    """
    try:
        logger.info(f"Getting routes with directions for route_id: {route_id}")
        
        # Build WHERE clause for route filtering
        where_clauses = [GTFSRouteModel.route_type == 3]  # Only bus routes
        
        if route_id:
            # Handle both short IDs (like "101") and full IDs (like "101-265")
            if route_id.isdigit():
                # For numeric IDs, find routes that contain this number
                where_clauses.append(GTFSRouteModel.route_short_name == route_id)
                logger.info(f"Looking for route with short name: {route_id}")
            else:
                # For full IDs, use exact match
                where_clauses.append(GTFSRouteModel.route_id == route_id)
                logger.info(f"Looking for route with route_id: {route_id}")
        
        # Base query for routes with directions
        query = select(
            GTFSRouteModel.route_id,
            GTFSRouteModel.route_short_name,
            GTFSRouteModel.route_long_name,
            GTFSRouteModel.route_color,
            GTFSRouteModel.route_text_color,
            GTFSTrip.direction_id,
            GTFSTrip.trip_headsign
        ).select_from(
            GTFSRouteModel
        ).join(
            GTFSTrip, GTFSRouteModel.route_id == GTFSTrip.route_id
        ).where(*where_clauses).distinct()
        
        logger.info(f"Executing query: {query}")
        result = await db.execute(query)
        rows = result.fetchall()
        logger.info(f"Found {len(rows)} rows")
        
        if not rows:
            logger.warning(f"No direction information found for route {route_id}")
            return {
                "status": "success",
                "message": f"No direction information found{f' for route {route_id}' if route_id else ''}",
                "data": []
            }
        
        # Group by route and direction
        routes_data = {}
        for row in rows:
            route_key = row.route_id
            if route_key not in routes_data:
                routes_data[route_key] = {
                    "route_id": row.route_id,
                    "route_short_name": row.route_short_name,
                    "route_long_name": row.route_long_name,
                    "route_color": row.route_color,
                    "route_text_color": row.route_text_color,
                    "directions": {}
                }
            
            direction_key = row.direction_id or 0
            if direction_key not in routes_data[route_key]["directions"]:
                routes_data[route_key]["directions"][direction_key] = {
                    "direction_id": direction_key,
                    "direction_name": "Outbound" if direction_key == 0 else "Inbound",
                    "headsigns": set(),
                    "trip_count": 0
                }
            
            if row.trip_headsign:
                routes_data[route_key]["directions"][direction_key]["headsigns"].add(row.trip_headsign)
        
        # Get trip counts for each direction
        for route_id_key, route_data in routes_data.items():
            for direction_id in route_data["directions"]:
                count_result = await db.execute(
                    select(GTFSTrip.trip_id)
                    .where(GTFSTrip.route_id == route_id_key)
                    .where(GTFSTrip.direction_id == direction_id)
                )
                trip_count = len(count_result.fetchall())
                route_data["directions"][direction_id]["trip_count"] = trip_count
                route_data["directions"][direction_id]["headsigns"] = list(route_data["directions"][direction_id]["headsigns"])
        
        # Convert to list and clean up
        routes_list = []
        for route_data in routes_data.values():
            route_data["directions"] = list(route_data["directions"].values())
            routes_list.append(route_data)
        
        routes_list.sort(key=lambda x: x["route_short_name"] or "")
        
        logger.info(f"Returning {len(routes_list)} routes with direction information")
        return {
            "status": "success",
            "message": f"Found {len(routes_list)} routes with direction information",
            "data": routes_list
        }
        
    except Exception as e:
        logger.error(f"Error fetching routes with directions: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail={
                "status": "error",
                "message": f"Error fetching routes with directions: {str(e)}"
            }
        )

@router.get("/routes/{route_id}", response_model=Dict[str, Any])
async def get_route(
    route_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed information about a specific route by ID.
    
    Accepts both full route IDs (e.g., 'GG_101') and numeric route IDs (e.g., '101').
    If a numeric ID is provided, it will try to find a matching route with any agency prefix.
    
    Returns route details including shapes and stops.
    """
    # First try with the exact route_id
    route_details = await get_route_details(db, route_id)
    
    # If not found and route_id is numeric, try to find a matching route with any agency prefix
    if not route_details and route_id.isdigit():
        # Get all routes that end with the numeric ID
        result = await db.execute(
            select(GTFSRouteModel)
            .where(GTFSRouteModel.route_id.endswith(f'_{route_id}'))
        )
        matching_routes = result.scalars().all()
        
        if matching_routes:
            # Use the first matching route
            route_details = await get_route_details(db, matching_routes[0].route_id)
    
    if not route_details:
        raise HTTPException(
            status_code=404,
            detail={
                "status": "error",
                "message": f"Route {route_id} not found. Try using the full route ID (e.g., 'GG_101')."
            }
        )
    return {
        **route_details,
        "status": "success",
        "message": "Route details retrieved successfully"
    }

@router.websocket("/ws/vehicles/{route_id}")
async def websocket_vehicle_updates(websocket: WebSocket, route_id: str):
    """
    WebSocket endpoint for real-time vehicle position updates for a specific route.
    """
    await manager.connect(websocket, route_id)
    try:
        while True:
            # Keep connection alive
            await asyncio.sleep(10)
            await websocket.send_json({"type": "ping", "message": "Connection alive"})
    except WebSocketDisconnect:
        await manager.disconnect(websocket, route_id)
    except Exception as e:
        print(f"WebSocket error: {e}")
        await manager.disconnect(websocket, route_id)

async def simulate_vehicle_updates(manager):
    """Simulate vehicle position updates (replace with real data source)
    
    Args:
        manager: WebSocket manager instance for broadcasting updates
    """
    while True:
        try:
            # In a real app, this would query your real-time data source
            # For demo, we'll just move some vehicles around
            for route_id in list(manager.active_connections.keys()):
                if route_id not in vehicle_positions:
                    vehicle_positions[route_id] = {}
                
                vehicles = vehicle_positions[route_id]
                
                # Move existing vehicles
                for vehicle_id, vehicle in list(vehicles.items()):
                    # Add some randomness to the movement
                    vehicle["latitude"] += (0.001 * (0.5 - 0.1 * len(vehicles)))
                    vehicle["longitude"] += (0.001 * (0.5 - 0.1 * len(vehicles)))
                    vehicle["bearing"] = (vehicle.get("bearing", 0) + 5) % 360
                    
                    # Update timestamp
                    vehicle["timestamp"] = int(asyncio.get_event_loop().time())
                    
                    # Broadcast update to all connected clients for this route
                    await manager.broadcast(route_id, {
                        "type": "vehicle_update",
                        "data": vehicle
                    })
            
            # Add some demo vehicles if none exist
            if not vehicle_positions:
                for i in range(1, 4):
                    route_id = f"route_{i}"
                    vehicle_positions[route_id] = {}
                    
                    # Add 1-2 vehicles per route
                    for j in range(1, 3):
                        vehicle_id = f"vehicle_{route_id}_{j}"
                        vehicle_positions[route_id][vehicle_id] = {
                            "vehicle_id": vehicle_id,
                            "route_id": route_id,
                            "latitude": 37.7749 + (0.1 * j),
                            "longitude": -122.4194 + (0.1 * j),
                            "bearing": 90 * j,
                            "speed": 25,
                            "timestamp": int(asyncio.get_event_loop().time()),
                            "label": f"Bus {j}",
                            "current_status": "IN_TRANSIT_TO"
                        }
            
            await asyncio.sleep(1)  # Update every second
            
        except Exception as e:
            print(f"Error in vehicle update simulation: {e}")
            await asyncio.sleep(5)  # Wait before retrying

@router.get("/vehicles/realtime")
async def get_realtime_vehicles(
    route_id: Optional[str] = Query(None, description="Filter vehicles by route ID"),
    agency: str = Query("golden_gate", description="Transit agency"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get real-time vehicle positions from live feeds with direction information.
    
    Returns current vehicle positions updated from real transit agency APIs,
    enhanced with direction_id and headsign information from GTFS data.
    """
    try:
        vehicles = await auto_updater.get_current_vehicles(agency, route_id)
        
        # Enhance vehicles with direction information by looking up trip data
        enhanced_vehicles = []
        for vehicle in vehicles:
            enhanced_vehicle = dict(vehicle)
            
            # Look up trip information to get direction_id and headsign
            if vehicle.get('trip_id'):
                try:
                    trip_result = await db.execute(
                        select(GTFSTrip.direction_id, GTFSTrip.trip_headsign)
                        .where(GTFSTrip.trip_id == vehicle['trip_id'])
                    )
                    trip_data = trip_result.fetchone()
                    
                    if trip_data:
                        enhanced_vehicle['direction_id'] = trip_data.direction_id
                        enhanced_vehicle['direction_name'] = "Outbound" if trip_data.direction_id == 0 else "Inbound"
                        enhanced_vehicle['headsign'] = trip_data.trip_headsign
                    else:
                        enhanced_vehicle['direction_id'] = None
                        enhanced_vehicle['direction_name'] = None
                        enhanced_vehicle['headsign'] = None
                except Exception as e:
                    logger.warning(f"Could not fetch trip data for trip_id {vehicle.get('trip_id')}: {e}")
                    enhanced_vehicle['direction_id'] = None
                    enhanced_vehicle['direction_name'] = None
                    enhanced_vehicle['headsign'] = None
            else:
                enhanced_vehicle['direction_id'] = None
                enhanced_vehicle['direction_name'] = None
                enhanced_vehicle['headsign'] = None
            
            enhanced_vehicles.append(enhanced_vehicle)
        
        return {
            "status": "success",
            "message": f"Found {len(enhanced_vehicles)} active vehicles",
            "data": enhanced_vehicles,
            "last_updated": auto_updater.vehicle_positions.get(agency, {}).get("timestamp"),
            "agency": agency
        }
        
    except Exception as e:
        logger.error(f"Error fetching real-time vehicles: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "status": "error", 
                "message": f"Failed to fetch vehicle positions: {str(e)}"
            }
        )

@router.post("/data/update-static")
async def trigger_static_update(
    agency: str = Query("golden_gate", description="Transit agency to update")
):
    """
    Manually trigger a GTFS static data update from the transit agency feed.
    
    This will download the latest GTFS data and update the database.
    """
    try:
        logger.info(f"Manual static data update triggered for {agency}")
        success = await auto_updater.update_static_data(agency)
        
        if success:
            return {
                "status": "success",
                "message": f"Successfully updated static data for {agency}",
                "timestamp": auto_updater.last_static_update.get(agency)
            }
        else:
            return {
                "status": "error", 
                "message": f"Failed to update static data for {agency}"
            }
            
    except Exception as e:
        logger.error(f"Error in manual static update: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "status": "error",
                "message": f"Update failed: {str(e)}"
            }
        )

@router.get("/data/status")
async def get_data_status():
    """
    Get the current status of static and real-time data updates.
    """
    try:
        status = {
            "static_data": {},
            "realtime_data": {},
            "available_agencies": list(auto_updater.gtfs_feeds.keys())
        }
        
        for agency in auto_updater.gtfs_feeds.keys():
            # Static data status
            last_static = auto_updater.last_static_update.get(agency)
            status["static_data"][agency] = {
                "last_updated": last_static.isoformat() if last_static else None,
                "name": auto_updater.gtfs_feeds[agency]["name"]
            }
            
            # Real-time data status  
            realtime_data = auto_updater.vehicle_positions.get(agency, {})
            status["realtime_data"][agency] = {
                "last_updated": realtime_data.get("timestamp").isoformat() if realtime_data.get("timestamp") else None,
                "active_vehicles": len(realtime_data.get("vehicles", []))
            }
        
        return {
            "status": "success",
            "data": status
        }
        
    except Exception as e:
        logger.error(f"Error getting data status: {e}")
        raise HTTPException(
            status_code=500, 
            detail={"status": "error", "message": str(e)}
        )

@router.get("/debug/trips")
async def debug_trips(db: AsyncSession = Depends(get_db)):
    """Debug endpoint to check trip data"""
    try:
        # Check trips count
        trip_count_result = await db.execute(select(GTFSTrip).limit(1))
        trip_count = len(trip_count_result.fetchall())
        
        # Get sample trips
        sample_trips_result = await db.execute(
            select(GTFSTrip.trip_id, GTFSTrip.route_id, GTFSTrip.direction_id, GTFSTrip.trip_headsign)
            .limit(10)
        )
        sample_trips = sample_trips_result.fetchall()
        
        # Check routes count  
        route_count_result = await db.execute(select(GTFSRouteModel).limit(1))
        route_count = len(route_count_result.fetchall())
        
        return {
            "trip_count": trip_count,
            "route_count": route_count,
            "sample_trips": [
                {
                    "trip_id": t.trip_id,
                    "route_id": t.route_id, 
                    "direction_id": t.direction_id,
                    "trip_headsign": t.trip_headsign
                } for t in sample_trips
            ]
        }
    except Exception as e:
        return {"error": str(e), "type": type(e).__name__}
