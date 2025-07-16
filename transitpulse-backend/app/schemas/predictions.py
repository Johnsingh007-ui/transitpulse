"""
Pydantic schemas for real-time arrival predictions

Focused on computed predictions derived from existing data sources:
- Live vehicle positions
- GTFS-RT data (handled by AutoGTFSUpdater)
- Static schedule data
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import IntEnum
from uuid import UUID


class PredictionSource(IntEnum):
    """Source of prediction data"""
    SCHEDULE = 1      # Based on static GTFS schedule
    VEHICLE_POSITION = 2  # Calculated from real-time vehicle position
    GTFS_RT = 3       # From GTFS-RT trip updates feed
    COMPUTED = 4      # Algorithm-computed from multiple sources


class StopPredictionBase(BaseModel):
    """Base schema for stop predictions"""
    stop_id: str
    route_id: str
    trip_id: str
    vehicle_id: Optional[str] = None
    
    # Prediction times
    predicted_arrival_time: Optional[datetime] = None
    predicted_departure_time: Optional[datetime] = None
    
    # Reference scheduled times
    scheduled_arrival_time: Optional[datetime] = None
    scheduled_departure_time: Optional[datetime] = None
    
    # Delay information (in seconds)
    arrival_delay_seconds: int = 0
    departure_delay_seconds: int = 0
    
    # Prediction metadata
    confidence_level: float = 0.8
    prediction_source: str = 'computed'
    is_real_time: bool = True
    
    # Trip details for display
    headsign: Optional[str] = None
    direction_id: Optional[int] = None
    stop_sequence: Optional[int] = None


class StopPredictionCreate(StopPredictionBase):
    """Schema for creating new predictions"""
    expires_at: Optional[datetime] = None


class StopPrediction(StopPredictionBase):
    """Full prediction schema with database fields"""
    id: UUID
    created_at: datetime
    expires_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class StopPredictionDisplay(BaseModel):
    """Schema for API display with human-readable fields"""
    stop_id: str
    stop_name: Optional[str] = None
    route_id: str
    route_short_name: Optional[str] = None
    trip_id: str
    vehicle_id: Optional[str] = None
    headsign: Optional[str] = None
    direction_id: Optional[int] = None
    direction_name: Optional[str] = None
    
    # Human-readable times
    predicted_arrival: Optional[str] = None      # "5 min"
    predicted_departure: Optional[str] = None
    scheduled_arrival: Optional[str] = None      # "3:45 PM"
    scheduled_departure: Optional[str] = None
    
    # Delay information
    arrival_delay_minutes: Optional[float] = None
    departure_delay_minutes: Optional[float] = None
    
    # Status indicators
    status: str = "scheduled"  # scheduled, predicted, delayed, early, on_time
    confidence_level: float = 0.8
    is_real_time: bool = False
    
    # Timing
    minutes_until_arrival: Optional[int] = None
    last_updated: Optional[datetime] = None


class StopPredictionsResponse(BaseModel):
    """Response schema for stop predictions endpoint"""
    stop_id: str
    stop_name: Optional[str] = None
    status: str = "success"
    message: str = ""
    predictions: List[StopPredictionDisplay] = []
    last_updated: Optional[datetime] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }


class RoutePredictionsResponse(BaseModel):
    """Response schema for route predictions endpoint"""
    route_id: str
    route_short_name: Optional[str] = None
    status: str = "success"
    message: str = ""
    predictions_by_stop: Dict[str, List[StopPredictionDisplay]] = {}
    last_updated: Optional[datetime] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }


class PredictionStats(BaseModel):
    """Statistics about prediction accuracy and performance"""
    total_predictions: int = 0
    real_time_predictions: int = 0
    average_confidence: float = 0.0
    prediction_sources: Dict[str, int] = {}
    last_updated: Optional[datetime] = None
