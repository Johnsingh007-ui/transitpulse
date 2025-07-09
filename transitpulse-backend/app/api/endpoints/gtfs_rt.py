from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Dict, Any
import os
import sys

# Add the data_ingestion directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '../../..', 'data_ingestion'))
from data_ingestion.gtfs_ingestor import GTFSIngestor
from data_ingestion.gtfsrt_ingestor import GTFSRTIngestor
from app.core.database import get_db

router = APIRouter()

# Get API key from environment variables
API_KEY = os.getenv('GTFS_API_KEY')

@router.post("/gtfs/update", response_model=Dict[str, Any])
async def update_gtfs_data(db: Session = Depends(get_db)):
    """
    Trigger an update of the GTFS static data.
    """
    if not API_KEY:
        raise HTTPException(
            status_code=500,
            detail="GTFS_API_KEY environment variable not set"
        )
    
    try:
        ingestor = GTFSIngestor(api_key=API_KEY, db_session=db)
        result = ingestor.update_gtfs_data()
        
        if not result['success']:
            raise HTTPException(
                status_code=500,
                detail=result.get('message', 'Failed to update GTFS data')
            )
            
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error updating GTFS data: {str(e)}"
        )

@router.post("/gtfs-rt/update", response_model=Dict[str, Any])
async def update_gtfs_rt_data(db: Session = Depends(get_db)):
    """
    Trigger an update of the GTFS-RT (real-time) data.
    """
    if not API_KEY:
        raise HTTPException(
            status_code=500,
            detail="GTFS_API_KEY environment variable not set"
        )
    
    try:
        ingestor = GTFSRTIngestor(api_key=API_KEY, db_session=db)
        result = ingestor.update_vehicle_positions()
        
        if not result['success']:
            raise HTTPException(
                status_code=500,
                detail=result.get('message', 'Failed to update GTFS-RT data')
            )
            
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error updating GTFS-RT data: {str(e)}"
        )

@router.get("/gtfs/routes", response_model=Dict[str, Any])
async def get_gtfs_routes(db: Session = Depends(get_db)):
    """
    Get all routes from the GTFS data.
    """
    try:
        # TODO: Replace with actual database query
        # Example:
        # routes = db.query(Route).all()
        # return {"routes": [route.to_dict() for route in routes]}
        return {"routes": []}
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching routes: {str(e)}"
        )

@router.get("/gtfs-rt/vehicles", response_model=Dict[str, Any])
async def get_vehicle_positions(db: Session = Depends(get_db)):
    """
    Get current vehicle positions from the GTFS-RT data.
    """
    try:
        # TODO: Replace with actual database query
        # Example:
        # vehicles = db.query(VehiclePosition).order_by(VehiclePosition.timestamp.desc()).limit(1000).all()
        # return {"vehicles": [vehicle.to_dict() for vehicle in vehicles]}
        return {"vehicles": []}
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching vehicle positions: {str(e)}"
        )
