from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, JSON
from sqlalchemy.sql import func
from app.core.base import Base

class Agency(Base):
    __tablename__ = "agencies"
    
    id = Column(Integer, primary_key=True, index=True)
    agency_id = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    display_name = Column(String(255), nullable=False)
    short_name = Column(String(50))
    website = Column(String(500))
    
    # Branding
    color_primary = Column(String(7))  # Hex color code
    color_secondary = Column(String(7))  # Hex color code
    logo_url = Column(String(500))
    
    # GTFS Configuration
    gtfs_static_url = Column(String(1000))
    gtfs_rt_vehicles_url = Column(String(1000))
    gtfs_rt_alerts_url = Column(String(1000))
    gtfs_rt_trip_updates_url = Column(String(1000))
    
    # Configuration
    config = Column(JSON)  # Additional agency-specific settings
    enabled = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<Agency(agency_id='{self.agency_id}', name='{self.name}')>"
