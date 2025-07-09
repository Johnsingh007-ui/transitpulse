from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class LiveVehiclePositionBase(BaseModel):
    timestamp: datetime
    vehicle_id: str
    trip_id: Optional[str] = None
    route_id: Optional[str] = None
    latitude: float
    longitude: float
    bearing: Optional[float] = None
    speed: Optional[float] = None
    current_status: Optional[int] = None
    congestion_level: Optional[int] = None
    occupancy_status: Optional[int] = None
    stop_id: Optional[str] = None

class LiveVehiclePositionCreate(LiveVehiclePositionBase):
    pass

class LiveVehiclePosition(LiveVehiclePositionBase):
    id: int
    class Config:
        from_attributes = True