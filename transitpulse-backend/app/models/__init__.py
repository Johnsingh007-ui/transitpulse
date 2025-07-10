# Import all models here so they're properly registered with SQLAlchemy

from app.core.base import Base
from app.models.agency import *
from app.models.gtfs_static import *
from app.models.vehicle import *
from app.models.kpi import *

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