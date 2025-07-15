from fastapi import APIRouter
from .endpoints import vehicles, gtfs, kpi, trips, routes, agencies, predictions

api_router = APIRouter()

# Include all API endpoints
api_router.include_router(agencies.router, prefix="/agencies", tags=["agencies"])
api_router.include_router(vehicles.router, prefix="/vehicles", tags=["vehicles"])
api_router.include_router(gtfs.router, prefix="/gtfs", tags=["gtfs"])
api_router.include_router(kpi.router, prefix="/kpi", tags=["kpi"])
api_router.include_router(trips.router, prefix="/trips", tags=["trips"])
api_router.include_router(routes.router, prefix="/routes", tags=["routes"])
api_router.include_router(predictions.router, prefix="/predictions", tags=["predictions"])