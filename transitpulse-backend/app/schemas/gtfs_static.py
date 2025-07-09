from pydantic import BaseModel, Field
from datetime import time, date
from typing import Optional

# Schemas for GTFS Static Data
class GTFSRouteBase(BaseModel):
    route_id: str
    agency_id: Optional[str] = None
    route_short_name: Optional[str] = None
    route_long_name: Optional[str] = None
    route_desc: Optional[str] = None
    route_type: Optional[int] = None
    route_url: Optional[str] = None
    route_color: Optional[str] = None
    route_text_color: Optional[str] = None

class GTFSRoute(GTFSRouteBase):
    class Config:
        from_attributes = True

class GTFSStopBase(BaseModel):
    stop_id: str
    stop_code: Optional[str] = None
    stop_name: Optional[str] = None
    stop_desc: Optional[str] = None
    stop_lat: Optional[float] = None
    stop_lon: Optional[float] = None
    zone_id: Optional[str] = None
    stop_url: Optional[str] = None
    location_type: Optional[int] = None
    parent_station: Optional[str] = None
    wheelchair_boarding: Optional[int] = None

class GTFSStop(GTFSStopBase):
    class Config:
        from_attributes = True

class GTFSShapeBase(BaseModel):
    shape_id: str
    shape_pt_lat: float
    shape_pt_lon: float
    shape_pt_sequence: int
    shape_dist_traveled: Optional[float] = None

class GTFSShape(GTFSShapeBase):
    id: int
    class Config:
        from_attributes = True

class GTFSTripBase(BaseModel):
    trip_id: str
    route_id: str
    service_id: str
    trip_headsign: Optional[str] = None
    trip_short_name: Optional[str] = None
    direction_id: Optional[int] = None
    block_id: Optional[str] = None
    shape_id: Optional[str] = None
    wheelchair_accessible: Optional[int] = None
    bikes_allowed: Optional[int] = None

class GTFSTrip(GTFSTripBase):
    class Config:
        from_attributes = True

class GTFSStopTimeBase(BaseModel):
    trip_id: str
    arrival_time: Optional[time] = None
    departure_time: Optional[time] = None
    stop_id: str
    stop_sequence: int
    stop_headsign: Optional[str] = None
    pickup_type: Optional[int] = None
    drop_off_type: Optional[int] = None
    shape_dist_traveled: Optional[float] = None

class GTFSStopTime(GTFSStopTimeBase):
    id: int
    class Config:
        from_attributes = True

class GTFSCalendarBase(BaseModel):
    service_id: str
    monday: int
    tuesday: int
    wednesday: int
    thursday: int
    friday: int
    saturday: int
    sunday: int
    start_date: date
    end_date: date

class GTFSCalendar(GTFSCalendarBase):
    class Config:
        from_attributes = True

class GTFSCalendarDateBase(BaseModel):
    service_id: str
    date: date
    exception_type: int

class GTFSCalendarDate(GTFSCalendarDateBase):
    id: int
    class Config:
        from_attributes = True
