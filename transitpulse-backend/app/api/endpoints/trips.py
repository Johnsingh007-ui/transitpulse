from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List, Dict, Optional
from datetime import datetime, timedelta, time
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

def compute_scheduled_datetime(gtfs_time: time, reference: datetime) -> datetime:
    """
    Adjusts GTFS stop_time (possibly >24:00:00) to correct datetime based on current time.
    
    Args:
        gtfs_time: The scheduled time from GTFS (may be >24:00:00)
        reference: Current datetime for context
        
    Returns:
        Properly adjusted datetime for the scheduled time
    """
    if not gtfs_time:
        return reference

    # Handle GTFS time overflow past midnight (e.g., 25:15:00)
    hour = gtfs_time.hour
    minute = gtfs_time.minute
    second = gtfs_time.second

    if hour >= 24:
        # Overflow to next day
        adjusted_time = time(hour=hour - 24, minute=minute, second=second)
        scheduled_date = reference.date() + timedelta(days=1)
    else:
        adjusted_time = gtfs_time
        scheduled_date = reference.date()

    scheduled_datetime = datetime.combine(scheduled_date, adjusted_time)

    # If it's too far in the past, assume it's for the next service day
    if scheduled_datetime < reference - timedelta(hours=6):
        scheduled_datetime += timedelta(days=1)

    return scheduled_datetime

def format_delay_display(delay_seconds: int) -> str:
    """Format delay in seconds to human-readable display string"""
    if not delay_seconds or abs(delay_seconds) < 60:
        return "On time"
    
    minutes = abs(round(delay_seconds / 60, 1))
    direction = "early" if delay_seconds < 0 else "late"
    return f"{minutes:.1f} min {direction}"

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
        
        # Get current vehicle position for this trip
        vehicle_query = text("""
            SELECT vehicle_id, stop_id, current_status, timestamp
            FROM live_vehicle_positions 
            WHERE trip_id = :trip_id 
            ORDER BY timestamp DESC 
            LIMIT 1
        """)
        
        vehicle_result = await db.execute(vehicle_query, {"trip_id": trip_id})
        current_vehicle = vehicle_result.fetchone()
        
        # Get real-time trip updates with timeout and fallback
        current_trip_updates = None
        try:
            updater = AutoGTFSUpdater()
            # Use asyncio.wait_for to add timeout to avoid hanging
            import asyncio
            trip_updates = await asyncio.wait_for(
                updater.fetch_trip_updates("golden_gate"), 
                timeout=5.0  # 5 second timeout
            )
            
            # Find updates for this specific trip
            if trip_updates:
                for update in trip_updates:
                    # Handle different GTFS-RT feed structures for trip_id
                    update_trip_id = None
                    if "trip_id" in update:
                        update_trip_id = update["trip_id"]
                    elif "trip" in update:
                        if isinstance(update["trip"], dict):
                            update_trip_id = update["trip"].get("trip_id")
                            # Some feeds have nested structure
                            if not update_trip_id and "trip" in update["trip"]:
                                update_trip_id = update["trip"]["trip"].get("trip_id")
                    
                    if update_trip_id == trip_id:
                        current_trip_updates = update
                        break
        except (asyncio.TimeoutError, Exception) as e:
            logger.warning(f"Could not fetch real-time trip updates: {e}")
            # Continue without real-time updates - we'll use vehicle position for predictions
        
        # Determine current vehicle position in the stop sequence
        current_stop_sequence = None
        if current_vehicle and current_vehicle.stop_id:
            for stop in stops:
                if stop.stop_id == current_vehicle.stop_id:
                    current_stop_sequence = stop.stop_sequence
                    break
        
        # Merge scheduled data with real-time updates
        stops_with_updates = []
        current_time = datetime.now()
        
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
                "actual_arrival": None,
                "actual_departure": None,
                "arrival_delay": None,
                "departure_delay": None,
                "status": "no_data"  # Default to no_data unless we have real-time info
            }
            
            # ONLY use real-time updates from GTFS-RT - enhanced with better status logic
            if current_trip_updates and "stop_time_updates" in current_trip_updates:
                for stop_update in current_trip_updates["stop_time_updates"]:
                    if stop_update["stop_id"] == stop.stop_id:
                        # Use the delay values directly from GTFS-RT (they are already correct)
                        stop_data["arrival_delay"] = stop_update.get("arrival_delay")
                        stop_data["departure_delay"] = stop_update.get("departure_delay")
                        
                        # Add debug logging to verify delay calculations
                        if stop_update.get("arrival_delay"):
                            logger.debug(f"Stop {stop.stop_id} ({stop.stop_name}): GTFS-RT delay={stop_update.get('arrival_delay')}s")
                        
                        # Determine status based on current time vs predicted time
                        current_timestamp = current_time.timestamp()
                        
                        if stop_update.get("arrival_time"):
                            arrival_timestamp = stop_update["arrival_time"]
                            
                            if arrival_timestamp <= current_timestamp:
                                # Stop has been passed - show actual times
                                stop_data["status"] = "passed"
                                actual_time = convert_gtfs_time_to_datetime(arrival_timestamp, current_time)
                                if actual_time:
                                    stop_data["actual_arrival"] = actual_time.strftime('%H:%M:%S')
                                    
                                    # Add countdown for passed stops (negative = how long ago)
                                    time_since_arrival = int(current_timestamp - arrival_timestamp)
                                    stop_data["time_since_arrival_seconds"] = time_since_arrival
                                    stop_data["time_since_arrival_minutes"] = round(time_since_arrival / 60, 1)
                            else:
                                # Upcoming stop - show predictions and countdown
                                stop_data["status"] = "upcoming"
                                pred_time = convert_gtfs_time_to_datetime(arrival_timestamp, current_time)
                                if pred_time:
                                    stop_data["predicted_arrival"] = pred_time.strftime('%H:%M:%S')
                                    
                                    # Add countdown to arrival
                                    seconds_to_arrival = int(arrival_timestamp - current_timestamp)
                                    stop_data["seconds_to_arrival"] = seconds_to_arrival
                                    stop_data["minutes_to_arrival"] = round(seconds_to_arrival / 60, 1)
                                    
                                    # Determine delay status for color coding
                                    if stop_data["arrival_delay"]:
                                        delay_seconds = stop_data["arrival_delay"]
                                        if delay_seconds > 300:  # More than 5 minutes late
                                            stop_data["delay_status"] = "delayed"
                                        elif delay_seconds < -180:  # More than 3 minutes early
                                            stop_data["delay_status"] = "early"
                                        else:
                                            stop_data["delay_status"] = "on_time"
                                    else:
                                        stop_data["delay_status"] = "on_time"
                        
                        if stop_update.get("departure_time"):
                            departure_timestamp = stop_update["departure_time"]
                            
                            if departure_timestamp <= current_timestamp:
                                # Vehicle has departed this stop
                                actual_time = convert_gtfs_time_to_datetime(departure_timestamp, current_time)
                                if actual_time:
                                    stop_data["actual_departure"] = actual_time.strftime('%H:%M:%S')
                            else:
                                # Upcoming departure
                                pred_time = convert_gtfs_time_to_datetime(departure_timestamp, current_time)
                                if pred_time:
                                    stop_data["predicted_departure"] = pred_time.strftime('%H:%M:%S')
                                    
                                    # Add countdown to departure (if different from arrival)
                                    seconds_to_departure = int(departure_timestamp - current_timestamp)
                                    stop_data["seconds_to_departure"] = seconds_to_departure
                                    stop_data["minutes_to_departure"] = round(seconds_to_departure / 60, 1)
                        
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
            "vehicle_info": {
                "vehicle_id": current_vehicle.vehicle_id if current_vehicle else None,
                "current_stop_id": current_vehicle.stop_id if current_vehicle else None,
                "current_stop_sequence": current_stop_sequence,
                "current_status": current_vehicle.current_status if current_vehicle else None,
                "last_updated": current_vehicle.timestamp.isoformat() if current_vehicle and current_vehicle.timestamp else None
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
        
        # Add vehicle information - no fallback calculations, real-time data only
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
        
        return trip_details
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching vehicle trip details: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/trip-progress/{trip_id}")
async def get_trip_progress(
    trip_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed trip progress including actual arrival times for completed stops.
    
    This endpoint provides:
    - Actual arrival/departure times for stops already visited
    - Real-time predictions for upcoming stops
    - Current vehicle position and status
    - Stop-by-stop progress through the route
    """
    try:
        # Get trip and route information
        trip_query = text("""
            SELECT 
                t.trip_id,
                t.route_id,
                t.trip_headsign,
                t.direction_id,
                t.service_id,
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
        
        # Get all stops for this trip
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
        
        # Get current vehicle position
        vehicle_query = text("""
            SELECT 
                vehicle_id, 
                trip_id,
                route_id,
                latitude,
                longitude,
                bearing,
                speed,
                current_status,
                stop_id,
                timestamp
            FROM live_vehicle_positions 
            WHERE trip_id = :trip_id 
            ORDER BY timestamp DESC 
            LIMIT 1
        """)
        
        vehicle_result = await db.execute(vehicle_query, {"trip_id": trip_id})
        current_vehicle = vehicle_result.fetchone()
        
        # Get trip updates with historical data and timeout
        current_trip_updates = None
        try:
            updater = AutoGTFSUpdater()
            import asyncio
            trip_updates = await asyncio.wait_for(
                updater.fetch_trip_updates("golden_gate"), 
                timeout=5.0
            )
            
            if trip_updates:
                for update in trip_updates:
                    if update["trip_id"] == trip_id:
                        current_trip_updates = update
                        break
        except (asyncio.TimeoutError, Exception) as e:
            logger.warning(f"Could not fetch real-time trip updates: {e}")
            # Continue with fallback predictions based on vehicle position
        
        # Build comprehensive stop data
        stop_progress = []
        current_time = datetime.now()
        current_stop_sequence = None
        
        # Determine current position in sequence
        if current_vehicle and current_vehicle.stop_id:
            for stop in stops:
                if stop.stop_id == current_vehicle.stop_id:
                    current_stop_sequence = stop.stop_sequence
                    break
        
        for stop in stops:
            # Base stop information
            stop_data = {
                "stop_sequence": stop.stop_sequence,
                "stop_id": stop.stop_id,
                "stop_name": stop.stop_name,
                "stop_code": stop.stop_code,
                "location": {
                    "lat": float(stop.stop_lat) if stop.stop_lat else None,
                    "lon": float(stop.stop_lon) if stop.stop_lon else None
                },
                "scheduled": {
                    "arrival": stop.arrival_time.strftime('%H:%M:%S') if stop.arrival_time else None,
                    "departure": stop.departure_time.strftime('%H:%M:%S') if stop.departure_time else None
                },
                "actual": {
                    "arrival": None,
                    "departure": None
                },
                "predicted": {
                    "arrival": None,
                    "departure": None
                },
                "delay": {
                    "arrival_seconds": None,
                    "departure_seconds": None,
                    "arrival_minutes": None,
                    "departure_minutes": None
                },
                "status": "scheduled",
                "is_current": False,
                "distance_from_vehicle": None
            }
            
            # Determine status based on vehicle position
            if current_stop_sequence is not None:
                if stop.stop_sequence < current_stop_sequence:
                    stop_data["status"] = "completed"
                elif stop.stop_sequence == current_stop_sequence:
                    stop_data["status"] = "current"
                    stop_data["is_current"] = True
                else:
                    stop_data["status"] = "upcoming"
            else:
                # Fallback to time-based status
                if stop.arrival_time:
                    scheduled_datetime = compute_scheduled_datetime(stop.arrival_time, current_time)
                    if scheduled_datetime < current_time:
                        stop_data["status"] = "completed"
            
            # Add real-time data from trip updates
            if current_trip_updates and "stop_time_updates" in current_trip_updates:
                for stop_update in current_trip_updates["stop_time_updates"]:
                    if stop_update["stop_id"] == stop.stop_id:
                        # Get delays
                        arrival_delay = stop_update.get("arrival_delay")
                        departure_delay = stop_update.get("departure_delay")
                        
                        if arrival_delay is not None:
                            stop_data["delay"]["arrival_seconds"] = arrival_delay
                            stop_data["delay"]["arrival_minutes"] = round(arrival_delay / 60, 1)
                        
                        if departure_delay is not None:
                            stop_data["delay"]["departure_seconds"] = departure_delay
                            stop_data["delay"]["departure_minutes"] = round(departure_delay / 60, 1)
                        
                        # Handle actual vs predicted times
                        if stop_data["status"] == "completed":
                            # Show actual times for completed stops
                            if stop_update.get("arrival_time"):
                                actual_time = convert_gtfs_time_to_datetime(stop_update["arrival_time"], current_time)
                                if actual_time:
                                    stop_data["actual"]["arrival"] = actual_time.strftime('%H:%M:%S')
                                
                            if stop_update.get("departure_time"):
                                actual_time = convert_gtfs_time_to_datetime(stop_update["departure_time"], current_time)
                                if actual_time:
                                    stop_data["actual"]["departure"] = actual_time.strftime('%H:%M:%S')
                        
                        elif stop_data["status"] in ["current", "upcoming"]:
                            # Show predictions for current/upcoming stops
                            if stop_update.get("arrival_time"):
                                pred_time = convert_gtfs_time_to_datetime(stop_update["arrival_time"], current_time)
                                if pred_time:
                                    stop_data["predicted"]["arrival"] = pred_time.strftime('%H:%M:%S')
                                
                            if stop_update.get("departure_time"):
                                pred_time = convert_gtfs_time_to_datetime(stop_update["departure_time"], current_time)
                                if pred_time:
                                    stop_data["predicted"]["departure"] = pred_time.strftime('%H:%M:%S')
                        
                        break
            
            # Calculate distance from current vehicle position (if available)
            if (current_vehicle and current_vehicle.latitude and current_vehicle.longitude and 
                stop.stop_lat and stop.stop_lon):
                from math import radians, cos, sin, asin, sqrt
                
                def haversine(lon1, lat1, lon2, lat2):
                    # Convert decimal degrees to radians
                    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
                    # Haversine formula
                    dlon = lon2 - lon1
                    dlat = lat2 - lat1
                    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
                    c = 2 * asin(sqrt(a))
                    r = 6371  # Radius of earth in kilometers
                    return c * r * 1000  # Return distance in meters
                
                distance = haversine(
                    current_vehicle.longitude, current_vehicle.latitude,
                    float(stop.stop_lon), float(stop.stop_lat)
                )
                stop_data["distance_from_vehicle"] = round(distance, 0)
            
            stop_progress.append(stop_data)
        
        # Summary statistics
        total_stops = len(stops)
        completed_stops = len([s for s in stop_progress if s["status"] == "completed"])
        current_stops = len([s for s in stop_progress if s["status"] == "current"])
        upcoming_stops = len([s for s in stop_progress if s["status"] == "upcoming"])
        
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
            "vehicle_info": {
                "vehicle_id": current_vehicle.vehicle_id if current_vehicle else None,
                "position": {
                    "latitude": float(current_vehicle.latitude) if current_vehicle and current_vehicle.latitude else None,
                    "longitude": float(current_vehicle.longitude) if current_vehicle and current_vehicle.longitude else None,
                    "bearing": float(current_vehicle.bearing) if current_vehicle and current_vehicle.bearing else None,
                    "speed": float(current_vehicle.speed) if current_vehicle and current_vehicle.speed else None
                },
                "current_stop_id": current_vehicle.stop_id if current_vehicle else None,
                "current_stop_sequence": current_stop_sequence,
                "status": current_vehicle.current_status if current_vehicle else None,
                "last_updated": current_vehicle.timestamp.isoformat() if current_vehicle and current_vehicle.timestamp else None
            },
            "progress_summary": {
                "total_stops": total_stops,
                "completed_stops": completed_stops,
                "current_stops": current_stops,
                "upcoming_stops": upcoming_stops,
                "progress_percentage": round((completed_stops / total_stops) * 100, 1) if total_stops > 0 else 0
            },
            "stops": stop_progress,
            "last_updated": current_time.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error fetching trip progress: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def convert_gtfs_time_to_datetime(gtfs_time: int, reference_datetime: datetime) -> Optional[datetime]:
    """
    Converts GTFS-RT times to datetime:
    - If value is > 86400: it's a Unix timestamp (handle timezone correctly)
    - Else: it's seconds since midnight of service day
    """
    try:
        if gtfs_time > 86400:
            # Unix timestamp (seconds since epoch)
            # GTFS-RT timestamps are typically in UTC, convert to Pacific Time
            import pytz
            
            # Create UTC datetime and convert to Pacific time
            utc_datetime = datetime.utcfromtimestamp(gtfs_time)
            utc_datetime = pytz.utc.localize(utc_datetime)
            
            # Convert to Pacific time (handles PST/PDT automatically)
            pacific_tz = pytz.timezone("America/Los_Angeles")
            local_datetime = utc_datetime.astimezone(pacific_tz).replace(tzinfo=None)
                
            return local_datetime
        else:
            # Seconds since midnight of service day
            hours = gtfs_time // 3600
            minutes = (gtfs_time % 3600) // 60
            seconds = gtfs_time % 60

            base_date = reference_datetime.date()

            if hours >= 24:
                base_date += timedelta(days=1)
                hours -= 24

            return datetime.combine(base_date, time(hour=hours, minute=minutes, second=seconds))
    except Exception as e:
        logger.warning(f"GTFS time conversion failed for {gtfs_time}: {e}")
        # Fallback: just use the timestamp as-is without timezone conversion
        if gtfs_time > 86400:
            return datetime.fromtimestamp(gtfs_time)
        return None

@router.get("/active-trips")
async def get_active_trips(
    route_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Get all currently active trips sorted by vehicle/bus numbers.
    Only shows trips that have vehicles currently assigned and operating.
    """
    try:
        # Query for active trips with vehicle information
        active_trips_query = text("""
            SELECT 
                t.trip_id,
                t.route_id,
                t.trip_headsign,
                t.direction_id,
                r.route_short_name,
                r.route_long_name,
                r.route_color,
                r.route_text_color,
                lv.vehicle_id,
                lv.latitude,
                lv.longitude,
                lv.bearing,
                lv.speed,
                lv.current_status,
                lv.stop_id,
                lv.timestamp as last_updated,
                -- Calculate approximate progress through trip
                CASE 
                    WHEN lv.stop_id IS NOT NULL THEN (
                        SELECT stop_sequence 
                        FROM gtfs_stop_times st 
                        WHERE st.trip_id = t.trip_id AND st.stop_id = lv.stop_id
                        LIMIT 1
                    )
                    ELSE 0
                END as current_stop_sequence,
                (
                    SELECT COUNT(*) 
                    FROM gtfs_stop_times st 
                    WHERE st.trip_id = t.trip_id
                ) as total_stops,
                -- Add vehicle sort number for ordering
                CASE 
                    WHEN lv.vehicle_id ~ '^[0-9]+$' THEN lv.vehicle_id::integer
                    ELSE 999999
                END as vehicle_sort_num
            FROM gtfs_trips t
            JOIN gtfs_routes r ON t.route_id = r.route_id
            JOIN live_vehicle_positions lv ON t.trip_id = lv.trip_id
            WHERE lv.timestamp > NOW() - INTERVAL '10 minutes'  -- Only recent vehicle updates
            AND lv.trip_id IS NOT NULL
            AND lv.trip_id != ''
            {}
            ORDER BY 
                vehicle_sort_num,
                lv.vehicle_id,
                r.route_short_name
        """.format("AND t.route_id = :route_id" if route_id else ""))
        
        params = {"route_id": route_id} if route_id else {}
        result = await db.execute(active_trips_query, params)
        active_trips = result.fetchall()
        
        if not active_trips:
            return {
                "status": "success",
                "message": "No active trips found",
                "total_trips": 0,
                "trips": []
            }
        
        # Format the response
        formatted_trips = []
        
        for trip in active_trips:
            # Calculate progress percentage
            progress_percentage = 0
            if trip.total_stops and trip.current_stop_sequence:
                progress_percentage = round((trip.current_stop_sequence / trip.total_stops) * 100, 1)
            
            # Determine trip status
            status = "active"
            if trip.current_status == 1:  # STOPPED_AT
                status = "stopped"
            elif trip.current_status == 2:  # IN_TRANSIT_TO
                status = "in_transit"
            elif trip.current_status == 0:  # INCOMING_AT
                status = "approaching"
            
            # Get current stop name if available
            current_stop_name = None
            if trip.stop_id:
                stop_query = text("SELECT stop_name FROM gtfs_stops WHERE stop_id = :stop_id")
                stop_result = await db.execute(stop_query, {"stop_id": trip.stop_id})
                stop_info = stop_result.fetchone()
                if stop_info:
                    current_stop_name = stop_info.stop_name
            
            trip_data = {
                "trip_id": trip.trip_id,
                "route_id": trip.route_id,
                "route_short_name": trip.route_short_name,
                "route_long_name": trip.route_long_name,
                "route_color": trip.route_color,
                "route_text_color": trip.route_text_color,
                "trip_headsign": trip.trip_headsign,
                "direction_id": trip.direction_id,
                "direction_name": "Outbound" if trip.direction_id == 0 else "Inbound",
                "vehicle_info": {
                    "vehicle_id": trip.vehicle_id,
                    "bus_number": trip.vehicle_id,  # Alias for clarity
                    "position": {
                        "latitude": float(trip.latitude) if trip.latitude else None,
                        "longitude": float(trip.longitude) if trip.longitude else None,
                        "bearing": float(trip.bearing) if trip.bearing else None,
                        "speed": float(trip.speed) if trip.speed else None
                    },
                    "status": status,
                    "current_stop_id": trip.stop_id,
                    "current_stop_name": current_stop_name,
                    "last_updated": trip.last_updated.isoformat() if trip.last_updated else None
                },
                "progress": {
                    "current_stop_sequence": trip.current_stop_sequence,
                    "total_stops": trip.total_stops,
                    "progress_percentage": progress_percentage,
                    "stops_remaining": trip.total_stops - (trip.current_stop_sequence or 0) if trip.total_stops else None
                }
            }
            
            formatted_trips.append(trip_data)
        
        return {
            "status": "success",
            "message": f"Found {len(formatted_trips)} active trips",
            "total_trips": len(formatted_trips),
            "route_filter": route_id,
            "trips": formatted_trips,
            "last_updated": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error fetching active trips: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/active-trips/by-route")
async def get_active_trips_by_route(
    db: AsyncSession = Depends(get_db)
):
    """
    Get active trips grouped by route, sorted by bus numbers within each route.
    """
    try:
        # Get all active trips first
        active_trips_response = await get_active_trips(None, db)
        
        if not active_trips_response["trips"]:
            return {
                "status": "success",
                "message": "No active trips found",
                "total_routes": 0,
                "total_trips": 0,
                "routes": []
            }
        
        # Group trips by route
        routes_dict = {}
        
        for trip in active_trips_response["trips"]:
            route_id = trip["route_id"]
            
            if route_id not in routes_dict:
                routes_dict[route_id] = {
                    "route_id": route_id,
                    "route_short_name": trip["route_short_name"],
                    "route_long_name": trip["route_long_name"],
                    "route_color": trip["route_color"],
                    "route_text_color": trip["route_text_color"],
                    "active_trips_count": 0,
                    "trips": []
                }
            
            routes_dict[route_id]["trips"].append(trip)
            routes_dict[route_id]["active_trips_count"] += 1
        
        # Convert to list and sort routes by route number
        routes_list = list(routes_dict.values())
        routes_list.sort(key=lambda x: (
            int(x["route_short_name"]) if x["route_short_name"].isdigit() else 999999,
            x["route_short_name"]
        ))
        
        return {
            "status": "success",
            "message": f"Found {len(routes_list)} routes with active trips",
            "total_routes": len(routes_list),
            "total_trips": sum(route["active_trips_count"] for route in routes_list),
            "routes": routes_list,
            "last_updated": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error fetching active trips by route: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/vehicles/active")
async def get_active_vehicles(
    route_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Get list of active vehicle/bus numbers sorted numerically.
    Simple endpoint for quick reference of which buses are currently active.
    """
    try:
        vehicles_query = text("""
            SELECT 
                lv.vehicle_id,
                lv.route_id,
                r.route_short_name,
                lv.trip_id,
                t.trip_headsign,
                lv.timestamp as last_updated,
                -- Add vehicle sort number for ordering
                CASE 
                    WHEN lv.vehicle_id ~ '^[0-9]+$' THEN lv.vehicle_id::integer
                    ELSE 999999
                END as vehicle_sort_num
            FROM live_vehicle_positions lv
            JOIN gtfs_routes r ON lv.route_id = r.route_id
            LEFT JOIN gtfs_trips t ON lv.trip_id = t.trip_id
            WHERE lv.timestamp > NOW() - INTERVAL '10 minutes'
            AND lv.trip_id IS NOT NULL
            AND lv.trip_id != ''
            {}
            ORDER BY 
                vehicle_sort_num,
                lv.vehicle_id
        """.format("AND lv.route_id = :route_id" if route_id else ""))
        
        params = {"route_id": route_id} if route_id else {}
        result = await db.execute(vehicles_query, params)
        vehicles = result.fetchall()
        
        formatted_vehicles = []
        for vehicle in vehicles:
            formatted_vehicles.append({
                "vehicle_id": vehicle.vehicle_id,
                "bus_number": vehicle.vehicle_id,
                "route_id": vehicle.route_id,
                "route_short_name": vehicle.route_short_name,
                "trip_id": vehicle.trip_id,
                "trip_headsign": vehicle.trip_headsign,
                "last_updated": vehicle.last_updated.isoformat() if vehicle.last_updated else None
            })
        
        return {
            "status": "success",
            "message": f"Found {len(formatted_vehicles)} active vehicles",
            "total_vehicles": len(formatted_vehicles),
            "route_filter": route_id,
            "vehicles": formatted_vehicles,
            "last_updated": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error fetching active vehicles: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/vehicle-trip-summary/{vehicle_id}")
async def get_vehicle_trip_summary(
    vehicle_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get optimized trip summary for frontend with:
    - Real-time countdowns
    - Color coding for delays
    - Only upcoming stops for clean UI
    - Frontend-friendly format
    """
    try:
        # Get full trip details
        trip_details = await get_vehicle_trip_details(vehicle_id, db)
        
        # Filter and enhance for frontend
        upcoming_stops = []
        passed_stops_count = 0
        total_stops = len(trip_details.get("stops", []))
        
        for stop in trip_details.get("stops", []):
            if stop["status"] == "passed":
                passed_stops_count += 1
            elif stop["status"] == "upcoming" and stop.get("predicted_arrival"):
                # Enhanced stop data for frontend with proper delay calculation
                arrival_delay_seconds = stop.get("arrival_delay", 0)
                
                # Debug logging for delay verification
                logger.debug(f"Stop {stop['stop_name']}: scheduled={stop['scheduled_arrival']}, "
                           f"predicted={stop.get('predicted_arrival')}, delay={arrival_delay_seconds}s")
                
                stop_summary = {
                    "stop_name": stop["stop_name"],
                    "scheduled_time": stop["scheduled_arrival"],
                    "predicted_time": stop["predicted_arrival"],
                    "countdown": {
                        "seconds": stop.get("seconds_to_arrival", 0),
                        "minutes": stop.get("minutes_to_arrival", 0),
                        "display": f"{stop.get('minutes_to_arrival', 0):.0f} min" if stop.get("minutes_to_arrival", 0) > 0 else "Arriving now"
                    },
                    "delay": {
                        "seconds": arrival_delay_seconds,
                        "minutes": round(arrival_delay_seconds / 60, 1) if arrival_delay_seconds else 0,
                        "status": stop.get("delay_status", "unknown"),
                        "display": format_delay_display(arrival_delay_seconds)
                    },
                    "color_code": {
                        "status": stop.get("delay_status", "unknown"),
                        "css_class": f"delay-{stop.get('delay_status', 'unknown')}",
                        "color": {
                            "on_time": "#10B981",    # Green
                            "early": "#3B82F6",     # Blue  
                            "delayed": "#EF4444",   # Red
                            "unknown": "#6B7280"    # Gray
                        }.get(stop.get("delay_status", "unknown"), "#6B7280")
                    }
                }
                upcoming_stops.append(stop_summary)
        
        # Trip progress summary
        progress = {
            "completed_stops": passed_stops_count,
            "total_stops": total_stops,
            "upcoming_stops": len(upcoming_stops),
            "progress_percentage": round((passed_stops_count / total_stops) * 100, 1) if total_stops > 0 else 0
        }
        
        # Vehicle summary
        vehicle_info = trip_details.get("vehicle_info", {})
        trip_info = trip_details.get("trip_info", {})
        
        return {
            "status": "success",
            "vehicle": {
                "id": vehicle_info.get("vehicle_id"),
                "route": {
                    "number": trip_info.get("route_short_name"),
                    "name": trip_info.get("route_long_name"),
                    "destination": trip_info.get("trip_headsign"),
                    "color": trip_info.get("route_color", "#3366FF"),
                    "text_color": trip_info.get("route_text_color", "#FFFFFF")
                },
                "position": {
                    "lat": vehicle_info.get("latitude"),
                    "lon": vehicle_info.get("longitude"),
                    "last_updated": vehicle_info.get("last_updated")
                }
            },
            "progress": progress,
            "upcoming_stops": upcoming_stops[:10],  # Limit to next 10 stops for clean UI
            "has_real_time_data": len(upcoming_stops) > 0,
            "last_updated": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching vehicle trip summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))
