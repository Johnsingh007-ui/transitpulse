from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.dialects.postgresql import insert
from app.models.vehicle import LiveVehiclePosition
from typing import List, Optional
from datetime import datetime

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

async def create_or_update_vehicle_position(
    db: AsyncSession, 
    vehicle_id: str,
    route_id: str,
    latitude: float,
    longitude: float,
    speed: Optional[float] = None,
    bearing: Optional[float] = None,
    trip_id: Optional[str] = None,
    timestamp: Optional[datetime] = None
) -> LiveVehiclePosition:
    """
    Create or update a live vehicle position in the database.
    
    Args:
        db: AsyncSession - Database session
        vehicle_id: str - Unique identifier for the vehicle
        route_id: str - Route identifier
        latitude: float - Vehicle latitude
        longitude: float - Vehicle longitude
        speed: Optional[float] - Vehicle speed
        bearing: Optional[float] - Vehicle bearing/heading
        trip_id: Optional[str] - Trip identifier
        timestamp: Optional[datetime] - Position timestamp
        
    Returns:
        LiveVehiclePosition: The created or updated vehicle position
    """
    if timestamp is None:
        timestamp = datetime.utcnow()
    
    # Use PostgreSQL's ON CONFLICT DO UPDATE for upsert
    stmt = insert(LiveVehiclePosition).values(
        vehicle_id=vehicle_id,
        route_id=route_id,
        latitude=latitude,
        longitude=longitude,
        speed=speed,
        bearing=bearing,
        trip_id=trip_id,
        timestamp=timestamp
    )
    
    # Update existing record if vehicle_id already exists
    stmt = stmt.on_conflict_do_update(
        index_elements=['vehicle_id'],
        set_={
            'route_id': stmt.excluded.route_id,
            'latitude': stmt.excluded.latitude,
            'longitude': stmt.excluded.longitude,
            'speed': stmt.excluded.speed,
            'bearing': stmt.excluded.bearing,
            'trip_id': stmt.excluded.trip_id,
            'timestamp': stmt.excluded.timestamp
        }
    )
    
    await db.execute(stmt)
    await db.commit()
    
    # Return the updated/created record
    result = await db.execute(
        select(LiveVehiclePosition).where(LiveVehiclePosition.vehicle_id == vehicle_id)
    )
    return result.scalars().first()

async def bulk_create_or_update_vehicle_positions(
    db: AsyncSession,
    vehicle_positions: List[dict]
) -> None:
    """
    Bulk create or update multiple vehicle positions.
    
    Args:
        db: AsyncSession - Database session
        vehicle_positions: List[dict] - List of vehicle position data
    """
    if not vehicle_positions:
        return
    
    # Add timestamp to all positions if not present
    for position in vehicle_positions:
        if 'timestamp' not in position or position['timestamp'] is None:
            position['timestamp'] = datetime.utcnow()
    
    stmt = insert(LiveVehiclePosition).values(vehicle_positions)
    
    # Update existing records if vehicle_id already exists
    stmt = stmt.on_conflict_do_update(
        index_elements=['vehicle_id'],
        set_={
            'route_id': stmt.excluded.route_id,
            'latitude': stmt.excluded.latitude,
            'longitude': stmt.excluded.longitude,
            'speed': stmt.excluded.speed,
            'bearing': stmt.excluded.bearing,
            'trip_id': stmt.excluded.trip_id,
            'timestamp': stmt.excluded.timestamp
        }
    )
    
    await db.execute(stmt)
    await db.commit()

async def delete_old_vehicle_positions(db: AsyncSession, older_than_minutes: int = 30) -> int:
    """
    Delete vehicle positions older than specified minutes.
    
    Args:
        db: AsyncSession - Database session
        older_than_minutes: int - Delete positions older than this many minutes
        
    Returns:
        int: Number of records deleted
    """
    from sqlalchemy import delete
    from datetime import datetime, timedelta
    
    cutoff_time = datetime.utcnow() - timedelta(minutes=older_than_minutes)
    
    stmt = delete(LiveVehiclePosition).where(LiveVehiclePosition.timestamp < cutoff_time)
    result = await db.execute(stmt)
    await db.commit()
    
    return result.rowcount