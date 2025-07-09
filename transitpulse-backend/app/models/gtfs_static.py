from sqlalchemy import Column, String, Float, Integer, Text, Time, Date
from app.core.database import Base

# GTFS Static Models
class GTFSRoute(Base):
    __tablename__ = "gtfs_routes"
    route_id = Column(String, primary_key=True, index=True)
    agency_id = Column(String, index=True)
    route_short_name = Column(String)
    route_long_name = Column(String)
    route_desc = Column(Text)
    route_type = Column(Integer)
    route_url = Column(String)
    route_color = Column(String)
    route_text_color = Column(String)

class GTFSStop(Base):
    __tablename__ = "gtfs_stops"
    stop_id = Column(String, primary_key=True, index=True)
    stop_code = Column(String)
    stop_name = Column(String)
    stop_desc = Column(Text)
    stop_lat = Column(Float)
    stop_lon = Column(Float)
    zone_id = Column(String)
    stop_url = Column(String)
    location_type = Column(Integer)
    parent_station = Column(String)
    wheelchair_boarding = Column(Integer)

class GTFSShape(Base):
    __tablename__ = "gtfs_shapes"
    id = Column(Integer, primary_key=True, autoincrement=True) # Auto-incrementing ID
    shape_id = Column(String, index=True)
    shape_pt_lat = Column(Float)
    shape_pt_lon = Column(Float)
    shape_pt_sequence = Column(Integer)
    shape_dist_traveled = Column(Float)

class GTFSTrip(Base):
    __tablename__ = "gtfs_trips"
    trip_id = Column(String, primary_key=True, index=True)
    route_id = Column(String, index=True)
    service_id = Column(String, index=True)
    trip_headsign = Column(String)
    trip_short_name = Column(String)
    direction_id = Column(Integer)
    block_id = Column(String)
    shape_id = Column(String, index=True)
    wheelchair_accessible = Column(Integer)
    bikes_allowed = Column(Integer)

class GTFSStopTime(Base):
    __tablename__ = "gtfs_stop_times"
    id = Column(Integer, primary_key=True, autoincrement=True)
    trip_id = Column(String, index=True)
    arrival_time = Column(Time)
    departure_time = Column(Time)
    stop_id = Column(String, index=True)
    stop_sequence = Column(Integer)
    stop_headsign = Column(String)
    pickup_type = Column(Integer)
    drop_off_type = Column(Integer)
    shape_dist_traveled = Column(Float)

class GTFSCalendar(Base):
    __tablename__ = "gtfs_calendar"
    service_id = Column(String, primary_key=True, index=True)
    monday = Column(Integer)
    tuesday = Column(Integer)
    wednesday = Column(Integer)
    thursday = Column(Integer)
    friday = Column(Integer)
    saturday = Column(Integer)
    sunday = Column(Integer)
    start_date = Column(Date)
    end_date = Column(Date)

class GTFSCalendarDate(Base):
    __tablename__ = "gtfs_calendar_dates"
    id = Column(Integer, primary_key=True, autoincrement=True)
    service_id = Column(String, index=True)
    date = Column(Date)
    exception_type = Column(Integer)
