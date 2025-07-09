from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.models.gtfs_static import GTFSRoute, GTFSTrip, GTFSShape, GTFSStopTime, GTFSStop
from typing import List, Optional, Dict, Any

async def get_all_gtfs_shapes(db: AsyncSession, shape_id: Optional[str] = None) -> List[GTFSShape]:
    """Get all GTFS shapes or filter by shape_id"""
    query = select(GTFSShape).order_by(GTFSShape.shape_id, GTFSShape.shape_pt_sequence)
    if shape_id:
        query = query.where(GTFSShape.shape_id == shape_id)
    result = await db.execute(query)
    return result.scalars().all()

async def get_all_routes(db: AsyncSession) -> List[Dict[str, Any]]:
    """Get all transit routes with their basic information"""
    result = await db.execute(
        select(GTFSRoute)
        .order_by(GTFSRoute.route_short_name)
    )
    routes = result.scalars().all()
    
    # Convert SQLAlchemy objects to dictionaries
    return [{
        "route_id": route.route_id,
        "route_short_name": route.route_short_name or "",
        "route_long_name": route.route_long_name or "",
        "route_type": route.route_type,
        "route_color": route.route_color or "000000",
        "route_text_color": route.route_text_color or "FFFFFF",
        "route_desc": route.route_desc or ""
    } for route in routes]

async def get_route_details(db: AsyncSession, route_id: str) -> Optional[Dict[str, Any]]:
    """Get detailed information about a specific route"""
    # Get the route
    route_result = await db.execute(
        select(GTFSRoute)
        .where(GTFSRoute.route_id == route_id)
    )
    route = route_result.scalars().first()
    
    if not route:
        return None
    
    # Get all trips for this route
    trips_result = await db.execute(
        select(GTFSTrip)
        .where(GTFSTrip.route_id == route_id)
        .distinct(GTFSTrip.shape_id)
    )
    trips = trips_result.scalars().all()
    
    # Get shape information for each trip
    shapes = []
    for trip in trips:
        if trip.shape_id:
            shape_result = await db.execute(
                select(GTFSShape)
                .where(GTFSShape.shape_id == trip.shape_id)
                .order_by(GTFSShape.shape_pt_sequence)
            )
            shape_points = shape_result.scalars().all()
            if shape_points:
                shapes.append({
                    "shape_id": trip.shape_id,
                    "points": [{
                        "lat": float(point.shape_pt_lat),
                        "lon": float(point.shape_pt_lon),
                        "sequence": int(point.shape_pt_sequence)
                    } for point in shape_points]
                })
    
    # Get all stops for this route
    stops_result = await db.execute(
        select(GTFSStop)
        .join(GTFSStopTime, GTFSStop.stop_id == GTFSStopTime.stop_id)
        .join(GTFSTrip, GTFSTrip.trip_id == GTFSStopTime.trip_id)
        .where(GTFSTrip.route_id == route_id)
        .distinct()
    )
    stops = stops_result.scalars().all()
    
    return {
        "route": {
            "route_id": route.route_id,
            "route_short_name": route.route_short_name or "",
            "route_long_name": route.route_long_name or "",
            "route_type": route.route_type,
            "route_color": route.route_color or "000000",
            "route_text_color": route.route_text_color or "FFFFFF",
            "route_desc": route.route_desc or ""
        },
        "shapes": shapes,
        "stops": [{
            "stop_id": stop.stop_id,
            "stop_name": stop.stop_name or "",
            "stop_lat": float(stop.stop_lat) if stop.stop_lat else 0,
            "stop_lon": float(stop.stop_lon) if stop.stop_lon else 0,
            "wheelchair_boarding": bool(stop.wheelchair_boarding) if stop.wheelchair_boarding is not None else None
        } for stop in stops]
    }
