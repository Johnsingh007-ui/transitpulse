"""
CRUD operations for stop predictions

This module handles database operations for computed arrival predictions.
It integrates with existing real-time data sources rather than duplicating them.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, and_, or_, text
from sqlalchemy.orm import selectinload

from app.models.predictions import StopPrediction
from app.models.vehicle import LiveVehiclePosition
from app.models.gtfs_static import GTFSStopTime, GTFSTrip, GTFSStop, GTFSRoute
from app.schemas.predictions import StopPredictionCreate, StopPredictionDisplay


async def create_prediction(
    db: AsyncSession, 
    prediction: StopPredictionCreate
) -> StopPrediction:
    """Create a new stop prediction"""
    db_prediction = StopPrediction(**prediction.model_dump())
    db.add(db_prediction)
    await db.commit()
    await db.refresh(db_prediction)
    return db_prediction


async def get_predictions_for_stop(
    db: AsyncSession,
    stop_id: str,
    limit: int = 10,
    route_id: Optional[str] = None
) -> List[StopPrediction]:
    """Get active predictions for a specific stop"""
    query = select(StopPrediction).where(
        and_(
            StopPrediction.stop_id == stop_id,
            or_(
                StopPrediction.expires_at.is_(None),
                StopPrediction.expires_at > datetime.utcnow()
            )
        )
    )
    
    if route_id:
        query = query.where(StopPrediction.route_id == route_id)
        
    query = query.order_by(StopPrediction.predicted_arrival_time).limit(limit)
    
    result = await db.execute(query)
    return result.scalars().all()


async def get_predictions_for_route(
    db: AsyncSession,
    route_id: str,
    limit: int = 50
) -> List[StopPrediction]:
    """Get active predictions for all stops on a route"""
    query = select(StopPrediction).where(
        and_(
            StopPrediction.route_id == route_id,
            or_(
                StopPrediction.expires_at.is_(None),
                StopPrediction.expires_at > datetime.utcnow()
            )
        )
    ).order_by(
        StopPrediction.stop_id,
        StopPrediction.predicted_arrival_time
    ).limit(limit)
    
    result = await db.execute(query)
    return result.scalars().all()


async def get_predictions_for_vehicle(
    db: AsyncSession,
    vehicle_id: str
) -> List[StopPrediction]:
    """Get predictions for a specific vehicle"""
    query = select(StopPrediction).where(
        and_(
            StopPrediction.vehicle_id == vehicle_id,
            or_(
                StopPrediction.expires_at.is_(None),
                StopPrediction.expires_at > datetime.utcnow()
            )
        )
    ).order_by(StopPrediction.predicted_arrival_time)
    
    result = await db.execute(query)
    return result.scalars().all()


async def clean_expired_predictions(db: AsyncSession) -> int:
    """Remove expired predictions from the database"""
    query = delete(StopPrediction).where(
        and_(
            StopPrediction.expires_at.is_not(None),
            StopPrediction.expires_at < datetime.utcnow()
        )
    )
    
    result = await db.execute(query)
    await db.commit()
    return result.rowcount


async def compute_predictions_from_vehicles(
    db: AsyncSession,
    route_id: Optional[str] = None
) -> List[StopPrediction]:
    """
    Compute predictions based on current vehicle positions and schedules.
    This integrates live vehicle data with static schedule data.
    """
    
    # Get active vehicles
    vehicle_query = select(LiveVehiclePosition)
    if route_id:
        vehicle_query = vehicle_query.where(LiveVehiclePosition.route_id == route_id)
        
    vehicle_result = await db.execute(vehicle_query)
    vehicles = vehicle_result.scalars().all()
    
    predictions = []
    
    for vehicle in vehicles:
        if not vehicle.trip_id or not vehicle.route_id:
            continue
            
        # Get scheduled stops for this trip
        stop_times_query = select(GTFSStopTime).where(
            GTFSStopTime.trip_id == vehicle.trip_id
        ).order_by(GTFSStopTime.stop_sequence)
        
        stop_times_result = await db.execute(stop_times_query)
        stop_times = stop_times_result.scalars().all()
        
        if not stop_times:
            continue
            
        # Get trip information for headsign and direction
        trip_query = select(GTFSTrip).where(GTFSTrip.trip_id == vehicle.trip_id)
        trip_result = await db.execute(trip_query)
        trip = trip_result.scalar_one_or_none()
        
        # Simple prediction logic: estimate arrival times based on schedule
        # In a real implementation, this would use more sophisticated algorithms
        current_time = datetime.utcnow()
        
        for stop_time in stop_times:
            if not stop_time.arrival_time:
                continue
                
            # Calculate estimated arrival (simplified approach)
            # This should be replaced with proper prediction algorithms
            scheduled_time = datetime.combine(current_time.date(), stop_time.arrival_time)
            
            # Adjust for next day if needed
            if scheduled_time < current_time:
                scheduled_time += timedelta(days=1)
                
            # Simple delay estimation (would be more sophisticated in practice)
            estimated_delay = 0  # Default to on-time
            predicted_time = scheduled_time + timedelta(seconds=estimated_delay)
            
            # Only create predictions for future arrivals
            if predicted_time > current_time:
                prediction = StopPrediction(
                    stop_id=stop_time.stop_id,
                    route_id=vehicle.route_id,
                    trip_id=vehicle.trip_id,
                    vehicle_id=vehicle.vehicle_id,
                    predicted_arrival_time=predicted_time,
                    scheduled_arrival_time=scheduled_time,
                    arrival_delay_seconds=estimated_delay,
                    confidence_level=0.7,  # Medium confidence for computed predictions
                    prediction_source='computed',
                    is_real_time=True,
                    headsign=trip.trip_headsign if trip else None,
                    direction_id=trip.direction_id if trip else None,
                    stop_sequence=stop_time.stop_sequence,
                    expires_at=current_time + timedelta(minutes=30)  # Expire in 30 minutes
                )
                predictions.append(prediction)
    
    return predictions


async def get_predictions_with_stop_info(
    db: AsyncSession,
    stop_id: str,
    limit: int = 10
) -> List[StopPredictionDisplay]:
    """
    Get predictions for a stop with enhanced display information
    """
    
    # Complex query to join predictions with stop and route information
    query = text("""
        SELECT 
            p.*,
            s.stop_name,
            r.route_short_name,
            CASE 
                WHEN p.direction_id = 0 THEN 'Outbound'
                WHEN p.direction_id = 1 THEN 'Inbound'
                ELSE 'Unknown'
            END as direction_name
        FROM stop_predictions p
        LEFT JOIN gtfs_stops s ON p.stop_id = s.stop_id
        LEFT JOIN gtfs_routes r ON p.route_id = r.route_id
        WHERE p.stop_id = :stop_id
        AND (p.expires_at IS NULL OR p.expires_at > NOW())
        ORDER BY p.predicted_arrival_time
        LIMIT :limit
    """)
    
    result = await db.execute(query, {"stop_id": stop_id, "limit": limit})
    rows = result.fetchall()
    
    predictions = []
    for row in rows:
        # Convert to display format with human-readable times
        prediction = StopPredictionDisplay(
            stop_id=row.stop_id,
            stop_name=row.stop_name,
            route_id=row.route_id,
            route_short_name=row.route_short_name,
            trip_id=row.trip_id,
            vehicle_id=row.vehicle_id,
            headsign=row.headsign,
            direction_id=row.direction_id,
            direction_name=row.direction_name,
            arrival_delay_minutes=row.arrival_delay_seconds / 60 if row.arrival_delay_seconds else None,
            confidence_level=row.confidence_level,
            is_real_time=row.is_real_time,
            last_updated=row.created_at
        )
        
        # Calculate minutes until arrival
        if row.predicted_arrival_time:
            time_diff = row.predicted_arrival_time - datetime.utcnow()
            prediction.minutes_until_arrival = max(0, int(time_diff.total_seconds() / 60))
            prediction.predicted_arrival = f"{prediction.minutes_until_arrival} min"
            
        # Set status based on delay
        if row.arrival_delay_seconds:
            if row.arrival_delay_seconds > 300:  # 5+ minutes late
                prediction.status = "delayed"
            elif row.arrival_delay_seconds < -60:  # 1+ minute early
                prediction.status = "early"
            else:
                prediction.status = "on_time"
        else:
            prediction.status = "scheduled" if not row.is_real_time else "predicted"
            
        predictions.append(prediction)
    
    return predictions
