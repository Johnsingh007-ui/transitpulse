from sqlalchemy import Column, String, Float, Integer, DateTime
from app.core.database import Base
from datetime import datetime

class LiveVehiclePosition(Base):
    __tablename__ = "live_vehicle_positions"
    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    vehicle_id = Column(String, index=True, unique=True) # Unique per vehicle for current position
    trip_id = Column(String, index=True)
    route_id = Column(String, index=True)
    latitude = Column(Float)
    longitude = Column(Float)
    bearing = Column(Float)
    speed = Column(Float) # Speed in meters per second or km/h (GTFS-RT spec varies)
    current_status = Column(Integer) # e.g., IN_TRANSIT_TO (from GTFS-RT enum)
    congestion_level = Column(Integer) # (from GTFS-RT enum)
    occupancy_status = Column(Integer) # (from GTFS-RT enum)
    stop_id = Column(String, nullable=True) # Last stop ID vehicle passed/is at