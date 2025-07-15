from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import logging
import sys
import os
from geopy.distance import geodesic
import math

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
            FROM gtfs_trips t
            JOIN gtfs_routes r ON t.route_id = r.route_id
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
            FROM gtfs_stop_times st
            JOIN gtfs_stops s ON st.stop_id = s.stop_id
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
                "scheduled_arrival": stop.arrival_time.strftime('%H:%M:%S') if stop.arrival_time else None,
                "scheduled_departure": stop.departure_time.strftime('%H:%M:%S') if stop.departure_time else None,
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
                lv.timestamp
            FROM live_vehicle_positions lv
            WHERE lv.vehicle_id = :vehicle_id
            ORDER BY lv.timestamp DESC
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
            "direction_name": None,  # Not available in current schema
            "last_updated": vehicle_info.timestamp.isoformat() if vehicle_info.timestamp else None
        }
        
        # Calculate predictions based on vehicle position
        trip_details["stops"] = calculate_predictions_from_vehicle_position(
            trip_details["stops"],
            {
                "latitude": vehicle_info.latitude,
                "longitude": vehicle_info.longitude
            },
            {
                "arrival_time": trip_details["stops"][0]["scheduled_arrival"] if trip_details["stops"] else None,
                "departure_time": trip_details["stops"][0]["scheduled_departure"] if trip_details["stops"] else None
            }
        )
        
        return trip_details
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching vehicle trip details: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def calculate_predictions_from_vehicle_position(stops_data, vehicle_position, scheduled_times):
    """
    Calculate arrival predictions based on vehicle position and scheduled times.
    """
    if not vehicle_position or not vehicle_position.get('latitude') or not vehicle_position.get('longitude'):
        return stops_data
    
    vehicle_lat = float(vehicle_position['latitude'])
    vehicle_lon = float(vehicle_position['longitude'])
    current_time = datetime.now()
    
    # Find the closest upcoming stop
    closest_stop_index = None
    min_distance = float('inf')
    
    for i, stop in enumerate(stops_data):
        if stop['stop_lat'] and stop['stop_lon']:
            distance = geodesic(
                (vehicle_lat, vehicle_lon),
                (stop['stop_lat'], stop['stop_lon'])
            ).meters
            
            if distance < min_distance:
                min_distance = distance
                closest_stop_index = i
    
    if closest_stop_index is not None and min_distance < 500:  # Within 500 meters
        # Estimate average speed (assuming 25 km/h in city traffic)
        avg_speed_kmh = 25
        avg_speed_ms = avg_speed_kmh * 1000 / 3600  # meters per second
        
        # Calculate predictions for upcoming stops
        for i in range(closest_stop_index, len(stops_data)):
            stop = stops_data[i]
            if stop['stop_lat'] and stop['stop_lon']:
                distance_to_stop = geodesic(
                    (vehicle_lat, vehicle_lon),
                    (stop['stop_lat'], stop['stop_lon'])
                ).meters
                
                # Calculate estimated travel time
                travel_time_seconds = distance_to_stop / avg_speed_ms
                predicted_arrival = current_time + timedelta(seconds=travel_time_seconds)
                
                # Calculate delay compared to schedule
                if stop['scheduled_arrival']:
                    try:
                        # Parse scheduled time (format: "HH:MM:SS")
                        scheduled_time_parts = stop['scheduled_arrival'].split(':')
                        scheduled_hour = int(scheduled_time_parts[0])
                        scheduled_minute = int(scheduled_time_parts[1])
                        scheduled_second = int(scheduled_time_parts[2])
                        
                        # Handle times after midnight (>24 hours)
                        if scheduled_hour >= 24:
                            scheduled_date = current_time.date() + timedelta(days=1)
                            scheduled_hour -= 24
                        else:
                            scheduled_date = current_time.date()
                        
                        scheduled_datetime = datetime.combine(
                            scheduled_date,
                            datetime.min.time().replace(
                                hour=scheduled_hour,
                                minute=scheduled_minute,
                                second=scheduled_second
                            )
                        )
                        
                        delay_seconds = (predicted_arrival - scheduled_datetime).total_seconds()
                        
                        stop['predicted_arrival'] = predicted_arrival.strftime('%H:%M:%S')
                        stop['arrival_delay'] = int(delay_seconds)
                        stop['status'] = 'predicted'
                        
                        # If delay is significant, mark as delayed
                        if delay_seconds > 300:  # 5 minutes late
                            stop['status'] = 'delayed'
                        elif delay_seconds < -300:  # 5 minutes early
                            stop['status'] = 'early'
                        
                    except (ValueError, IndexError):
                        # If we can't parse the scheduled time, just show predicted time
                        stop['predicted_arrival'] = predicted_arrival.strftime('%H:%M:%S')
                        stop['status'] = 'predicted'
    
    return stops_data
