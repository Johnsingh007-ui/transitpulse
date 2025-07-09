from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.vehicle import LiveVehiclePosition
from typing import List, Optional

async def get_all_live_vehicle_positions(db: AsyncSession) -> List[LiveVehiclePosition]:
    """
    Retrieve all live vehicle positions from the database.
    
    Args:
        db: AsyncSession - Database session
        
    Returns:
        List[LiveVehiclePosition]: List of all live vehicle positions
    """
    result = await db.execute(
        select(LiveVehiclePosition)
    )
    return result.scalars().all()

async def get_live_vehicle_position_by_id(db: AsyncSession, vehicle_id: str) -> Optional[LiveVehiclePosition]:
    """
    Retrieve a specific live vehicle position by vehicle ID.
    
    Args:
        db: AsyncSession - Database session
        vehicle_id: str - The ID of the vehicle to retrieve
        
    Returns:
        Optional[LiveVehiclePosition]: The vehicle position if found, None otherwise
    """
    result = await db.execute(
        select(LiveVehiclePosition).where(LiveVehiclePosition.vehicle_id == vehicle_id)
    )
    return result.scalars().first()