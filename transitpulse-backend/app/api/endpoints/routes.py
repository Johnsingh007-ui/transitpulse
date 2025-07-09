from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Dict, Any
import json

from app.core.database import get_db
from app.models.gtfs_static import GTFSRoute, GTFSShape, GTFSTrip

router = APIRouter()

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
    Retrieve all routes with their associated shapes and color information.
    Returns a list of routes, each with its shapes and style information.
    """
    try:
        # Query routes with their trips and shapes
        result = await db.execute(
            select(GTFSRoute).distinct()
            .join(GTFSTrip, GTFSTrip.route_id == GTFSRoute.route_id)
            .filter(GTFSTrip.shape_id.isnot(None))
            .options(selectinload(GTFSRoute.trips).selectinload(GTFSTrip.shape))
        )
        routes = result.scalars().all()

        # Process routes and their shapes
        route_data = []
        for route in routes:
            # Get unique shape_ids for this route
            shape_ids = set()
            for trip in route.trips:
                if trip.shape_id:
                    shape_ids.add(trip.shape_id)
            
            if not shape_ids:
                continue

            # Get all shape points for these shapes
            shapes_result = await db.execute(
                select(GTFSShape)
                .where(GTFSShape.shape_id.in_(shape_ids))
                .order_by(GTFSShape.shape_id, GTFSShape.shape_pt_sequence)
            )
            shapes = shapes_result.scalars().all()
            
            # Group points by shape_id
            shape_groups = {}
            for shape in shapes:
                if shape.shape_id not in shape_groups:
                    shape_groups[shape.shape_id] = []
                shape_groups[shape.shape_id].append([shape.shape_pt_lat, shape.shape_pt_lon])
            
            # Convert shape groups to array of coordinates
            route_shapes = list(shape_groups.values())
            
            # Default color if not provided
            route_color = f"#{route.route_color}" if route.route_color else "#1a56db"
            
            route_data.append({
                "route_id": route.route_id,
                "route_short_name": route.route_short_name or "",
                "route_long_name": route.route_long_name or "",
                "route_color": route_color,
                "shapes": route_shapes
            })
        
        return {"routes": route_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
