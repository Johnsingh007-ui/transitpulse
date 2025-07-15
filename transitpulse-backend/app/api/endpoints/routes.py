from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import text
from typing import List, Dict, Any
import json

from app.core.database import get_db
from app.models.gtfs_static import GTFSRoute, GTFSShape, GTFSTrip
from app.schemas.gtfs import GTFSRoute as GTFSRouteSchema, GTFSRouteResponse

router = APIRouter()

@router.get("/", response_model=GTFSRouteResponse)
@router.get("", response_model=GTFSRouteResponse)
async def get_routes(
    db: AsyncSession = Depends(get_db),
    limit: int = Query(100, gt=0, le=1000),
    offset: int = Query(0, ge=0)
):
    """
    Get GTFS bus routes that have active real-time vehicle data.
    Only returns routes with route_type = 3 (bus routes) and active vehicles.
    """
    try:
        # Get routes that have active vehicles with real-time data
        query = text("""
            SELECT DISTINCT r.*
            FROM gtfs_routes r
            INNER JOIN live_vehicle_positions lv ON r.route_id = lv.route_id
            WHERE r.route_type = 3 
            AND lv.route_id IS NOT NULL 
            AND lv.route_id != ''
            ORDER BY r.route_short_name
            LIMIT :limit OFFSET :offset
        """)
        
        result = await db.execute(query, {"limit": limit, "offset": offset})
        db_routes = result.fetchall()

        routes = []
        for route in db_routes:
            route_dict = {
                "route_id": route.route_id,
                "agency_id": getattr(route, 'agency_id', None),
                "route_short_name": route.route_short_name,
                "route_long_name": route.route_long_name,
                "route_desc": getattr(route, 'route_desc', None),
                "route_type": route.route_type,
                "route_url": getattr(route, 'route_url', None),
                "route_color": route.route_color,
                "route_text_color": route.route_text_color,
                "route_sort_order": getattr(route, 'route_sort_order', None)
            }
            routes.append(GTFSRouteSchema.model_validate(route_dict))

        return {
            "routes": routes,
            "status": "success",
            "message": f"{len(routes)} bus routes with active real-time data"
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "status": "error",
                "message": str(e),
                "data": []
            }
        )

@router.get("/directions")
async def get_routes_with_directions(db: AsyncSession = Depends(get_db)):
    """
    Get routes with direction information (Inbound/Outbound) that have active real-time vehicles
    """
    try:
        query = text("""
            SELECT DISTINCT 
                r.route_id,
                r.route_short_name,
                r.route_long_name,
                r.route_color,
                r.route_text_color,
                t.direction_id,
                t.trip_headsign,
                COUNT(DISTINCT t.trip_id) as trip_count,
                COUNT(DISTINCT lv.vehicle_id) as active_vehicles
            FROM gtfs_routes r
            JOIN gtfs_trips t ON r.route_id = t.route_id
            INNER JOIN live_vehicle_positions lv ON r.route_id = lv.route_id
            WHERE r.route_type = 3
            AND lv.route_id IS NOT NULL 
            AND lv.route_id != ''
            GROUP BY r.route_id, r.route_short_name, r.route_long_name, 
                     r.route_color, r.route_text_color, t.direction_id, t.trip_headsign
            ORDER BY r.route_short_name, t.direction_id
        """)
        
        result = await db.execute(query)
        rows = result.fetchall()
        
        routes_dict = {}
        for row in rows:
            route_id = row.route_id
            if route_id not in routes_dict:
                routes_dict[route_id] = {
                    "route_id": route_id,
                    "route_short_name": row.route_short_name,
                    "route_long_name": row.route_long_name,
                    "route_color": row.route_color,
                    "route_text_color": row.route_text_color,
                    "active_vehicles": row.active_vehicles,
                    "directions": []
                }
            
            direction_name = "Inbound" if row.direction_id == 1 else "Outbound"
            routes_dict[route_id]["directions"].append({
                "direction_id": row.direction_id,
                "direction_name": direction_name,
                "headsign": row.trip_headsign,
                "trip_count": row.trip_count
            })
        
        routes_list = list(routes_dict.values())
        
        return {
            "routes": routes_list,
            "status": "success",
            "message": f"{len(routes_list)} routes with active real-time vehicles and direction information"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/test-tables")
async def test_tables(db: AsyncSession = Depends(get_db)):
    """Test endpoint to check database tables"""
    try:
        # Check if required tables exist
        result = await db.execute(
            """
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
            """
        )
        tables = [row[0] for row in result.fetchall()]
        
        # Check for required tables
        required_tables = ['gtfs_routes', 'gtfs_trips', 'gtfs_shapes']
        missing_tables = [t for t in required_tables if t not in tables]
        
        return {
            "all_tables": tables,
            "missing_required_tables": missing_tables,
            "has_all_required_tables": len(missing_tables) == 0
        }
    except Exception as e:
        return {"error": str(e), "type": type(e).__name__}

@router.get("/with-shapes")
async def get_routes_with_shapes(db: AsyncSession = Depends(get_db)):
    """
    Retrieve routes with their associated shapes and color information.
    Only returns routes that have active real-time vehicles.
    """
    try:
        # Get routes that have active vehicles and shapes
        query = text("""
            SELECT DISTINCT r.route_id, r.route_short_name, r.route_long_name, r.route_color
            FROM gtfs_routes r
            INNER JOIN gtfs_trips t ON r.route_id = t.route_id
            INNER JOIN live_vehicle_positions lv ON r.route_id = lv.route_id
            WHERE r.route_type = 3
            AND t.shape_id IS NOT NULL
            AND lv.route_id IS NOT NULL 
            AND lv.route_id != ''
        """)
        
        result = await db.execute(query)
        active_routes = result.fetchall()
        
        route_data = []
        for route_row in active_routes:
            route_id = route_row.route_id
            
            # Get shape_ids for this route
            shapes_query = text("""
                SELECT DISTINCT t.shape_id
                FROM gtfs_trips t
                WHERE t.route_id = :route_id AND t.shape_id IS NOT NULL
            """)
            
            shapes_result = await db.execute(shapes_query, {"route_id": route_id})
            shape_ids = [row.shape_id for row in shapes_result.fetchall()]
            
            if not shape_ids:
                continue
            
            # Get all shape points for these shapes
            points_query = text("""
                SELECT shape_id, shape_pt_lat, shape_pt_lon, shape_pt_sequence
                FROM gtfs_shapes
                WHERE shape_id = ANY(:shape_ids)
                ORDER BY shape_id, shape_pt_sequence
            """)
            
            points_result = await db.execute(points_query, {"shape_ids": shape_ids})
            shapes = points_result.fetchall()
            
            # Group points by shape_id
            shape_groups = {}
            for shape in shapes:
                if shape.shape_id not in shape_groups:
                    shape_groups[shape.shape_id] = []
                shape_groups[shape.shape_id].append([shape.shape_pt_lat, shape.shape_pt_lon])
            
            # Convert shape groups to array of coordinates
            route_shapes = list(shape_groups.values())
            
            # Default color if not provided
            route_color = f"#{route_row.route_color}" if route_row.route_color else "#1a56db"
            
            route_data.append({
                "route_id": route_id,
                "route_short_name": route_row.route_short_name or "",
                "route_long_name": route_row.route_long_name or "",
                "route_color": route_color,
                "shapes": route_shapes
            })
        
        return {
            "routes": route_data,
            "status": "success", 
            "message": f"{len(route_data)} routes with active vehicles and shape data"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
