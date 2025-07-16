"""
Database models for Real-time Arrival Predictions

This module focuses on computed predictions derived from existing real-time data sources:
- Live vehicle positions (already tracked in live_vehicle_positions table)
- GTFS-RT trip updates (handled by AutoGTFSUpdater)
- Static schedule data (gtfs_stop_times table)

The models here store processed predictions for quick API responses.
"""

from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, Text, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

from app.core.base import Base


class StopPrediction(Base):
    """
    Computed arrival/departure predictions for stops.
    
    This table stores processed predictions calculated from:
    - Real-time vehicle positions
    - GTFS-RT trip updates 
    - Static schedule data
    - Historical performance data
    
    Used for fast API responses without real-time computation.
    """
    __tablename__ = "stop_predictions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Core identifiers
    stop_id = Column(String(100), nullable=False, index=True)
    route_id = Column(String(100), nullable=False, index=True)
    trip_id = Column(String(100), nullable=False)
    vehicle_id = Column(String(100), index=True)
    
    # Prediction times
    predicted_arrival_time = Column(DateTime(timezone=True))
    predicted_departure_time = Column(DateTime(timezone=True))
    
    # Reference scheduled times
    scheduled_arrival_time = Column(DateTime(timezone=True))
    scheduled_departure_time = Column(DateTime(timezone=True))
    
    # Delay information (in seconds)
    arrival_delay_seconds = Column(Integer, default=0)
    departure_delay_seconds = Column(Integer, default=0)
    
    # Prediction metadata
    confidence_level = Column(Float, default=0.8)  # 0.0 to 1.0
    prediction_source = Column(String(20), default='computed')  # 'gtfs_rt', 'vehicle_position', 'schedule', 'computed'
    is_real_time = Column(Boolean, default=True)
    
    # Trip details for display
    headsign = Column(String(255))
    direction_id = Column(Integer)
    stop_sequence = Column(Integer)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))  # When this prediction expires
    
    # Composite indexes for efficient querying
    __table_args__ = (
        Index('idx_stop_predictions_stop_route', 'stop_id', 'route_id'),
        Index('idx_stop_predictions_vehicle', 'vehicle_id', 'trip_id'),
        Index('idx_stop_predictions_active', 'stop_id', 'expires_at'),
        {"comment": "Computed real-time arrival predictions for transit stops"}
    )
