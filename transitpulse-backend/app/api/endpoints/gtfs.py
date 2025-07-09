import asyncio
import json
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Dict, List, Optional

from app.core.database import get_db
from app.models.gtfs_static import GTFSRoute as GTFSRouteModel, GTFSStop, GTFSStopTime, GTFSTrip
from app.websocket.manager import manager
from app.schemas.gtfs import GTFSRoute, GTFSRouteResponse, GTFSStop, GTFSStopResponse
from typing import List, Dict, Any, Optional, Union
import logging

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
                select(GTFSStop)
                .join(GTFSStopTime, GTFSStop.stop_id == GTFSStopTime.stop_id)
                .where(GTFSStopTime.trip_id.in_(trip_ids))
                .distinct()
            )
            stops = [{
                "stop_id": stop.stop_id,
                "stop_name": stop.stop_name,
                "stop_lat": float(stop.stop_lat),
                "stop_lon": float(stop.stop_lon),
                "wheelchair_boarding": stop.wheelchair_boarding
            } for stop in result.scalars().all()]
        
        # Get shapes
        shape_result = await db.execute(
            select(GTFSShape)
            .where(GTFSShape.shape_id.in_([t.shape_id for t in trips if t.shape_id]))
            .order_by(GTFSShape.shape_pt_sequence)
        )
        
        # Group shape points by shape_id
        shapes_dict = {}
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
    # If route_id is numeric, try to find a matching route with any agency prefix
    if route_id.isdigit():
        result = await db.execute(
            select(GTFSRouteModel.route_id)
            .where(GTFSRouteModel.route_id.endswith(f'_{route_id}'))
        )
        matching_route = result.scalar_one_or_none()
        if matching_route:
            route_id = matching_route  # Use the full route ID
    try:
        # Get trips for this route
        result = await db.execute(
            select(GTFSTrip.trip_id)
            .where(GTFSTrip.route_id == route_id)
        )
        trip_ids = [trip[0] for trip in result.fetchall()]
        
        if not trip_ids:
            return {
                "status": "success",
                "message": "No trips found for this route",
                "data": []
            }
        
        # Get stops via stop_times
        result = await db.execute(
            select(
                GTFSStop.stop_id,
                GTFSStop.stop_code,
                GTFSStop.stop_name,
                GTFSStop.stop_lat,
                GTFSStop.stop_lon,
                GTFSStop.zone_id,
                GTFSStop.wheelchair_boarding
            )
            .select_from(GTFSStop)
            .join(GTFSStopTime, GTFSStop.stop_id == GTFSStopTime.stop_id)
            .where(GTFSStopTime.trip_id.in_(trip_ids))
            .distinct()
            .order_by(GTFSStop.stop_name)
        )
        
        # Convert Row objects to dictionaries and ensure all required fields exist
        stops = []
        for row in result.all():
            stop_dict = {
                'stop_id': row[0],  # stop_id
                'stop_code': row[1],  # stop_code
                'stop_name': row[2],  # stop_name
                'stop_lat': float(row[3]) if row[3] is not None else None,  # stop_lat
                'stop_lon': float(row[4]) if row[4] is not None else None,  # stop_lon
                'zone_id': row[5],  # zone_id
                'wheelchair_boarding': row[6]  # wheelchair_boarding
            }
            # Only add the stop if it has a valid stop_id
            if stop_dict['stop_id'] is not None:
                stops.append(stop_dict)
        
        return {
            "status": "success",
            "message": f"Found {len(stops)} stops for route {route_id}",
            "data": stops
        }
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error in get_stops_by_route: {error_details}")
        raise HTTPException(
            status_code=500,
            detail={
                "status": "error",
                "message": f"Error fetching stops: {str(e)}",
                "details": str(e)
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

# The simulate_vehicle_updates function is now called from main.py
