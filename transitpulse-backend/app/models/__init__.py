# Import all models here so they're properly registered with SQLAlchemy
from app.models.gtfs_static import (
    GTFSRoute,
    GTFSStop,
    GTFSShape,
    GTFSTrip,
    GTFSStopTime,
    GTFSCalendar,
    GTFSCalendarDate
)
from app.models.vehicle import LiveVehiclePosition

# This ensures that all models are imported and their metadata is available for table creation
__all__ = [
    'GTFSRoute',
    'GTFSStop',
    'GTFSShape',
    'GTFSTrip',
    'GTFSStopTime',
    'GTFSCalendar',
    'GTFSCalendarDate',
    'LiveVehiclePosition'
]