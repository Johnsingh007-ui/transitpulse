from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.crud import vehicle_crud
from app.schemas.vehicle import LiveVehiclePosition
from app.core.database import get_db
from typing import List, Optional
from datetime import datetime

router = APIRouter()

@router.get("/vehicles/live", response_model=List[LiveVehiclePosition])
async def read_live_vehicles(db: AsyncSession = Depends(get_db)):
    """
    Retrieves all live vehicle positions currently stored in the database.
    
    Returns:
        List[LiveVehiclePosition]: A list of all live vehicle positions
        
    Raises:
        HTTPException: 404 if no live vehicle data is found
    """
    vehicles = await vehicle_crud.get_all_live_vehicle_positions(db)
    if not vehicles:
        raise HTTPException(status_code=404, detail="No live vehicle data found.")
    return vehicles

@router.get("/realtime")
async def get_realtime_vehicles(
    db: AsyncSession = Depends(get_db),
    route_id: Optional[str] = Query(None, description="Filter by route ID"),
    agency: Optional[str] = Query(None, description="Filter by agency")
):
    """
    Get real-time vehicle positions with enhanced data including direction information.
    Only returns vehicles that have active route assignments.
    """
    try:
        # Base query for vehicle positions with route information - only vehicles with route assignments
        query = text("""
            SELECT DISTINCT
                lv.vehicle_id,
                lv.route_id,
                lv.trip_id,
                lv.latitude,
                lv.longitude,
                lv.bearing,
                lv.speed,
                lv.timestamp,
                lv.current_status,
                lv.occupancy_status,
                'GG' as agency,
                CASE 
                    WHEN t.direction_id = 0 THEN 'Outbound'
                    WHEN t.direction_id = 1 THEN 'Inbound'
                    ELSE NULL
                END as direction_name,
                t.direction_id,
                t.trip_headsign as headsign
            FROM live_vehicle_positions lv
            LEFT JOIN gtfs_trips t ON lv.trip_id = t.trip_id
            WHERE lv.latitude IS NOT NULL 
            AND lv.longitude IS NOT NULL
            AND lv.route_id IS NOT NULL 
            AND lv.route_id != ''
        """)
        
        # Add route filter if specified
        if route_id:
            query = text(str(query) + " AND lv.route_id = :route_id")
        
        query = text(str(query) + " ORDER BY lv.timestamp DESC")
        
        # Execute query
        if route_id:
            result = await db.execute(query, {"route_id": route_id})
        else:
            result = await db.execute(query)
        
        vehicles = result.fetchall()
        
        # Format response
        vehicle_data = []
        for vehicle in vehicles:
            vehicle_dict = {
                "vehicle_id": vehicle.vehicle_id,
                "route_id": vehicle.route_id,
                "trip_id": vehicle.trip_id,
                "latitude": float(vehicle.latitude) if vehicle.latitude else None,
                "longitude": float(vehicle.longitude) if vehicle.longitude else None,
                "bearing": vehicle.bearing,
                "speed": vehicle.speed,
                "timestamp": vehicle.timestamp.isoformat() if vehicle.timestamp else None,
                "agency": vehicle.agency,
                "status": vehicle.current_status,
                "direction_id": vehicle.direction_id,
                "direction_name": vehicle.direction_name,
                "headsign": vehicle.headsign
            }
            vehicle_data.append(vehicle_dict)
        
        return {
            "status": "success",
            "message": f"Found {len(vehicle_data)} active vehicles with route assignments",
            "data": vehicle_data,
            "last_updated": datetime.now().isoformat(),
            "agency": agency or "golden_gate"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
