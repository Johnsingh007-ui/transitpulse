from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime

class AgencyBase(BaseModel):
    agency_id: str = Field(..., description="Unique identifier for the agency")
    name: str = Field(..., description="Full agency name")
    display_name: str = Field(..., description="Display name for the agency")
    short_name: Optional[str] = Field(None, description="Short abbreviation")
    website: Optional[str] = Field(None, description="Agency website URL")
    
    # Branding
    color_primary: Optional[str] = Field(None, description="Primary brand color (hex)")
    color_secondary: Optional[str] = Field(None, description="Secondary brand color (hex)")
    logo_url: Optional[str] = Field(None, description="Logo image URL")
    
    # GTFS Configuration
    gtfs_static_url: Optional[str] = Field(None, description="GTFS static feed URL")
    gtfs_rt_vehicles_url: Optional[str] = Field(None, description="GTFS-RT vehicles feed URL")
    gtfs_rt_alerts_url: Optional[str] = Field(None, description="GTFS-RT alerts feed URL")
    gtfs_rt_trip_updates_url: Optional[str] = Field(None, description="GTFS-RT trip updates feed URL")
    
    # Configuration
    config: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional settings")
    enabled: bool = Field(True, description="Whether the agency is active")

class AgencyCreate(AgencyBase):
    pass

class AgencyUpdate(BaseModel):
    name: Optional[str] = None
    display_name: Optional[str] = None
    short_name: Optional[str] = None
    website: Optional[str] = None
    color_primary: Optional[str] = None
    color_secondary: Optional[str] = None
    logo_url: Optional[str] = None
    gtfs_static_url: Optional[str] = None
    gtfs_rt_vehicles_url: Optional[str] = None
    gtfs_rt_alerts_url: Optional[str] = None
    gtfs_rt_trip_updates_url: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    enabled: Optional[bool] = None

class Agency(AgencyBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class AgencyPublic(BaseModel):
    """Public agency info for frontend display"""
    agency_id: str
    name: str
    display_name: str
    short_name: Optional[str]
    color_primary: Optional[str]
    color_secondary: Optional[str]
    logo_url: Optional[str]
    enabled: bool
    
    class Config:
        from_attributes = True
