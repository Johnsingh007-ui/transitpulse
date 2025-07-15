from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import logging
import sys
import os

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

from app.db.session import get_db
from data_ingestion.auto_gtfs_updater import AutoGTFSUpdater

router = APIRouter(tags=["trips"])
logger = logging.getLogger(__name__)

@router.get("/otp")
async def get_trips_otp():
    # Placeholder for on-time performance data
    return {"message": "Trips OTP endpoint - Coming Soon!"}

@router.get("/trip-details/{trip_id}")
async def get_trip_details_with_updates(
    trip_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get trip details including scheduled stops and real-time updates.
    """
    try:
        # Get trip basic info and route
        trip_query = text("""
            SELECT 
                t.trip_id,
                t.route_id,
                t.trip_headsign,
                t.direction_id,
                r.route_short_name,
                r.route_long_name,
                r.route_color,
                r.route_text_color
            FROM trips t
            JOIN routes r ON t.route_id = r.route_id
            WHERE t.trip_id = :trip_id
        """)
        
        result = await db.execute(trip_query, {"trip_id": trip_id})
        trip_info = result.fetchone()
        
        if not trip_info:
            raise HTTPException(status_code=404, detail="Trip not found")
        
        # Get all stops for this trip with scheduled times
        stops_query = text("""
            SELECT 
                st.stop_sequence,
                st.stop_id,
                st.arrival_time,
                st.departure_time,
                s.stop_name,
                s.stop_lat,
                s.stop_lon,
                s.stop_code
            FROM stop_times st
            JOIN stops s ON st.stop_id = s.stop_id
            WHERE st.trip_id = :trip_id
            ORDER BY st.stop_sequence
        """)
        
        result = await db.execute(stops_query, {"trip_id": trip_id})
        stops = result.fetchall()
        
        # Get real-time trip updates
        updater = AutoGTFSUpdater()
        trip_updates = await updater.fetch_trip_updates("golden_gate")
        
        # Find updates for this specific trip
        current_trip_updates = None
        if trip_updates:
            for update in trip_updates:
                if update["trip_id"] == trip_id:
                    current_trip_updates = update
                    break
        
        # Merge scheduled data with real-time updates
        stops_with_updates = []
        for stop in stops:
            stop_data = {
                "stop_sequence": stop.stop_sequence,
                "stop_id": stop.stop_id,
                "stop_name": stop.stop_name,
                "stop_lat": float(stop.stop_lat) if stop.stop_lat else None,
                "stop_lon": float(stop.stop_lon) if stop.stop_lon else None,
                "stop_code": stop.stop_code,
                "scheduled_arrival": stop.arrival_time,
                "scheduled_departure": stop.departure_time,
                "predicted_arrival": None,
                "predicted_departure": None,
                "arrival_delay": None,
                "departure_delay": None,
                "status": "scheduled"
            }
            
            # Add real-time updates if available
            if current_trip_updates and "stop_time_updates" in current_trip_updates:
                for stop_update in current_trip_updates["stop_time_updates"]:
                    if stop_update["stop_id"] == stop.stop_id:
                        stop_data["arrival_delay"] = stop_update.get("arrival_delay")
                        stop_data["departure_delay"] = stop_update.get("departure_delay")
                        stop_data["predicted_arrival"] = stop_update.get("arrival_time")
                        stop_data["predicted_departure"] = stop_update.get("departure_time")
                        
                        # Calculate predicted times if we have delays
                        if stop_update.get("arrival_delay") is not None:
                            stop_data["status"] = "updated"
                        break
            
            stops_with_updates.append(stop_data)
        
        return {
            "trip_info": {
                "trip_id": trip_info.trip_id,
                "route_id": trip_info.route_id,
                "trip_headsign": trip_info.trip_headsign,
                "direction_id": trip_info.direction_id,
                "route_short_name": trip_info.route_short_name,
                "route_long_name": trip_info.route_long_name,
                "route_color": trip_info.route_color,
                "route_text_color": trip_info.route_text_color
            },
            "stops": stops_with_updates,
            "real_time_updates": current_trip_updates,
            "last_updated": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error fetching trip details: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/vehicle-trip-details/{vehicle_id}")
async def get_vehicle_trip_details(
    vehicle_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get trip details for a specific vehicle including all stops and real-time updates.
    """
    try:
        # Get current trip for this vehicle
        vehicle_query = text("""
            SELECT 
                lv.trip_id,
                lv.route_id,
                lv.vehicle_id,
                lv.latitude,
                lv.longitude,
                lv.bearing,
                lv.speed,
                lv.occupancy_status,
                lv.direction_name,
                lv.last_updated
            FROM live_vehicle_positions lv
            WHERE lv.vehicle_id = :vehicle_id
            ORDER BY lv.last_updated DESC
            LIMIT 1
        """)
        
        result = await db.execute(vehicle_query, {"vehicle_id": vehicle_id})
        vehicle_info = result.fetchone()
        
        if not vehicle_info:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        
        if not vehicle_info.trip_id:
            raise HTTPException(status_code=404, detail="No active trip for this vehicle")
        
        # Get trip details using the trip_id
        trip_details = await get_trip_details_with_updates(vehicle_info.trip_id, db)
        
        # Add vehicle information
        trip_details["vehicle_info"] = {
            "vehicle_id": vehicle_info.vehicle_id,
            "latitude": float(vehicle_info.latitude) if vehicle_info.latitude else None,
            "longitude": float(vehicle_info.longitude) if vehicle_info.longitude else None,
            "bearing": vehicle_info.bearing,
            "speed": vehicle_info.speed,
            "occupancy_status": vehicle_info.occupancy_status,
            "direction_name": vehicle_info.direction_name,
            "last_updated": vehicle_info.last_updated.isoformat() if vehicle_info.last_updated else None
        }
        
        return trip_details
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching vehicle trip details: {e}")
        raise HTTPException(status_code=500, detail=str(e))
