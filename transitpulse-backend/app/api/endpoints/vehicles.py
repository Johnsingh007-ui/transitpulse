from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.crud import vehicle_crud
from app.schemas.vehicle import LiveVehiclePosition
from app.core.database import get_db
from typing import List

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
