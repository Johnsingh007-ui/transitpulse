"""
Automated GTFS Data Fetcher and Real-time Vehicle Position Updater

This module automatically fetches GTFS static data and real-time vehicle positions
from transit agencies and updates the database periodically.
"""

import asyncio
import httpx
import zipfile
import io
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import json
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import SessionLocal
from app.models.gtfs_static import GTFSRoute, GTFSStop, GTFSTrip, GTFSStopTime, GTFSCalendar, GTFSCalendarDate, GTFSShape
from app.schemas.gtfs_static import (
    GTFSRouteBase, GTFSStopBase, GTFSTripBase, GTFSStopTimeBase, 
    GTFSCalendarBase, GTFSCalendarDateBase, GTFSShapeBase
)
from data_ingestion.gtfs_static_loader import _load_csv_to_db

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AutoGTFSUpdater:
    """Automatically updates GTFS static and real-time data from transit agency feeds."""
    
    def __init__(self):
        self.session_timeout = httpx.Timeout(60.0)  # 60 second timeout
        
        # GTFS Static Feed URLs - Multiple transit agencies
        self.gtfs_feeds = {
            "golden_gate": {
                "name": "Golden Gate Transit", 
                "static_url": "https://realtime.goldengate.org/gtfsstatic/GTFSTransitData.zip",
                "realtime_url": "https://realtime.goldengate.org/gtfsrealtime/VehiclePositions",
                "trip_updates_url": "https://realtime.goldengate.org/gtfsrealtime/TripUpdates",
                "agency_id": "GG"
            },
            "muni": {
                "name": "San Francisco Muni",
                "static_url": "https://transitfeeds.com/p/san-francisco-municipal-transportation-agency/60/latest/download", 
                "realtime_url": "https://api.511.org/transit/VehiclePositions?api_key=b43cedb9-b614-4739-bb3a-e3c07f895fab&agency=SF",
                "agency_id": "SF"
            },
            "ac_transit": {
                "name": "AC Transit",
                "static_url": "https://transitfeeds.com/p/ac-transit/121/latest/download",
                "realtime_url": "https://api.511.org/transit/VehiclePositions?api_key=b43cedb9-b614-4739-bb3a-e3c07f895fab&agency=AC", 
                "agency_id": "AC"
            }
        }
        
        # Update intervals
        self.static_update_interval = timedelta(hours=24)  # Update static data daily
        self.realtime_update_interval = timedelta(seconds=30)  # Update vehicles every 30 seconds
        
        self.last_static_update = {}
        self.vehicle_positions = {}
        
    async def download_gtfs_static(self, agency_key: str) -> Optional[bytes]:
        """Download GTFS static data for an agency."""
        feed_info = self.gtfs_feeds.get(agency_key)
        if not feed_info:
            logger.error(f"Unknown agency: {agency_key}")
            return None
            
        try:
            logger.info(f"Downloading GTFS static data for {feed_info['name']}...")
            async with httpx.AsyncClient(timeout=self.session_timeout) as client:
                response = await client.get(feed_info["static_url"])
                response.raise_for_status()
                logger.info(f"Downloaded {len(response.content)} bytes for {feed_info['name']}")
                return response.content
                
        except Exception as e:
            logger.error(f"Failed to download GTFS static data for {agency_key}: {e}")
            return None
    
    async def update_static_data(self, agency_key: str = "golden_gate") -> bool:
        """Update GTFS static data for an agency."""
        feed_info = self.gtfs_feeds.get(agency_key)
        if not feed_info:
            logger.error(f"Unknown agency: {agency_key}")
            return False
            
        # Check if update is needed
        last_update = self.last_static_update.get(agency_key)
        if last_update and datetime.now() - last_update < self.static_update_interval:
            logger.info(f"Static data for {agency_key} is up to date")
            return True
            
        # Download new data
        gtfs_data = await self.download_gtfs_static(agency_key)
        if not gtfs_data:
            return False
            
        try:
            # Use existing loader function to actually load the data
            gtfs_zip = zipfile.ZipFile(io.BytesIO(gtfs_data))
            
            async with SessionLocal() as db:
                logger.info(f"Loading GTFS data for {feed_info['name']} into database...")
                
                # Load each GTFS file in proper order
                await self._load_gtfs_files(db, gtfs_zip, agency_key)
                await db.commit()
                
                logger.info(f"Successfully loaded GTFS data for {feed_info['name']}")
                self.last_static_update[agency_key] = datetime.now()
                return True
                    
        except Exception as e:
            logger.error(f"Error processing static data for {agency_key}: {e}")
            return False
    
    async def fetch_realtime_vehicles(self, agency_key: str = "golden_gate") -> Optional[List[Dict]]:
        """Fetch real-time vehicle positions."""
        feed_info = self.gtfs_feeds.get(agency_key)
        if not feed_info:
            logger.error(f"Unknown agency: {agency_key}")
            return None
            
        try:
            async with httpx.AsyncClient(timeout=self.session_timeout) as client:
                response = await client.get(feed_info["realtime_url"])
                response.raise_for_status()
                
                vehicles = []
                
                if agency_key == "golden_gate":
                    # Golden Gate Transit uses GTFS-RT protobuf format
                    try:
                        # Try to parse as protobuf (GTFS-RT)
                        import google.transit.gtfs_realtime_pb2 as gtfs_realtime_pb2
                        
                        feed = gtfs_realtime_pb2.FeedMessage()
                        feed.ParseFromString(response.content)
                        
                        for entity in feed.entity:
                            if entity.HasField('vehicle'):
                                vehicle = entity.vehicle
                                if vehicle.HasField('position'):
                                    vehicles.append({
                                        "vehicle_id": vehicle.vehicle.id if vehicle.HasField('vehicle') else entity.id,
                                        "route_id": vehicle.trip.route_id if vehicle.HasField('trip') else None,
                                        "trip_id": vehicle.trip.trip_id if vehicle.HasField('trip') else None,
                                        "latitude": vehicle.position.latitude,
                                        "longitude": vehicle.position.longitude,
                                        "bearing": vehicle.position.bearing if vehicle.position.HasField('bearing') else None,
                                        "speed": vehicle.position.speed if vehicle.position.HasField('speed') else None,
                                        "timestamp": datetime.now().isoformat(),
                                        "agency": feed_info["agency_id"],
                                        "status": vehicle.current_status if vehicle.HasField('current_status') else None
                                    })
                    except ImportError:
                        logger.warning("GTFS-RT protobuf library not available, trying JSON fallback")
                        # Fallback to treating as JSON
                        data = response.json()
                        vehicles = self._parse_json_vehicles(data, feed_info)
                    except Exception as e:
                        logger.error(f"Error parsing GTFS-RT protobuf: {e}")
                        return None
                else:
                    # Other agencies use JSON format (511 API)
                    data = response.json()
                    vehicles = self._parse_json_vehicles(data, feed_info)
                
                logger.info(f"Fetched {len(vehicles)} vehicles for {feed_info['name']}")
                return vehicles
                
        except Exception as e:
            logger.error(f"Failed to fetch real-time vehicles for {agency_key}: {e}")
            return None
    
    def _parse_json_vehicles(self, data: Dict, feed_info: Dict) -> List[Dict]:
        """Parse vehicle data from JSON format (511 API)."""
        vehicles = []
        
        if isinstance(data, dict) and "entity" in data:
            for entity in data["entity"]:
                if "vehicle" in entity:
                    vehicle = entity["vehicle"]
                    if "position" in vehicle:
                        vehicles.append({
                            "vehicle_id": vehicle.get("vehicle", {}).get("id", "unknown"),
                            "route_id": vehicle.get("trip", {}).get("route_id"),
                            "trip_id": vehicle.get("trip", {}).get("trip_id"),
                            "latitude": vehicle["position"].get("latitude"),
                            "longitude": vehicle["position"].get("longitude"),
                            "bearing": vehicle["position"].get("bearing"),
                            "speed": vehicle["position"].get("speed"),
                            "timestamp": datetime.now().isoformat(),
                            "agency": feed_info["agency_id"]
                        })
        
        return vehicles
    
    async def update_vehicle_positions(self, agency_key: str = "golden_gate"):
        """Update vehicle positions in memory for WebSocket broadcasting."""
        vehicles = await self.fetch_realtime_vehicles(agency_key)
        if vehicles:
            self.vehicle_positions[agency_key] = {
                "timestamp": datetime.now(),
                "vehicles": vehicles
            }
            
            # TODO: Broadcast to WebSocket clients
            logger.info(f"Updated {len(vehicles)} vehicle positions for {agency_key}")
    
    async def get_current_vehicles(self, agency_key: str = "golden_gate", route_id: str = None) -> List[Dict]:
        """Get current vehicle positions, optionally filtered by route."""
        agency_data = self.vehicle_positions.get(agency_key, {})
        vehicles = agency_data.get("vehicles", [])
        
        if route_id:
            vehicles = [v for v in vehicles if v.get("route_id") == route_id]
            
        return vehicles
    
    async def start_realtime_updates(self, agencies: List[str] = None):
        """Start continuous real-time vehicle position updates."""
        if agencies is None:
            agencies = ["golden_gate"]
            
        logger.info(f"Starting real-time updates for agencies: {agencies}")
        
        while True:
            try:
                for agency in agencies:
                    await self.update_vehicle_positions(agency)
                    
                await asyncio.sleep(self.realtime_update_interval.total_seconds())
                
            except Exception as e:
                logger.error(f"Error in real-time update loop: {e}")
                await asyncio.sleep(5)  # Wait before retrying
    
    async def start_daily_static_updates(self, agencies: List[str] = None):
        """Start daily GTFS static data updates."""
        if agencies is None:
            agencies = ["golden_gate"]
            
        logger.info(f"Starting daily static updates for agencies: {agencies}")
        
        while True:
            try:
                for agency in agencies:
                    await self.update_static_data(agency)
                    
                # Wait until next day
                await asyncio.sleep(self.static_update_interval.total_seconds())
                
            except Exception as e:
                logger.error(f"Error in static update loop: {e}")
                await asyncio.sleep(3600)  # Wait 1 hour before retrying
    
    async def fetch_trip_updates(self, agency_key: str = "golden_gate") -> Optional[List[Dict]]:
        """Fetch real-time trip updates."""
        feed_info = self.gtfs_feeds.get(agency_key)
        if not feed_info or "trip_updates_url" not in feed_info:
            logger.info(f"No trip updates URL for agency: {agency_key}")
            return None
            
        try:
            async with httpx.AsyncClient(timeout=self.session_timeout) as client:
                response = await client.get(feed_info["trip_updates_url"])
                response.raise_for_status()
                
                trip_updates = []
                
                try:
                    # Parse GTFS-RT protobuf format
                    import google.transit.gtfs_realtime_pb2 as gtfs_realtime_pb2
                    
                    feed = gtfs_realtime_pb2.FeedMessage()
                    feed.ParseFromString(response.content)
                    
                    for entity in feed.entity:
                        if entity.HasField('trip_update'):
                            trip_update = entity.trip_update
                            stop_updates = []
                            
                            for stop_time_update in trip_update.stop_time_update:
                                stop_update = {
                                    "stop_id": stop_time_update.stop_id,
                                    "stop_sequence": stop_time_update.stop_sequence if stop_time_update.HasField('stop_sequence') else None,
                                    "arrival_delay": stop_time_update.arrival.delay if stop_time_update.HasField('arrival') and stop_time_update.arrival.HasField('delay') else None,
                                    "departure_delay": stop_time_update.departure.delay if stop_time_update.HasField('departure') and stop_time_update.departure.HasField('delay') else None,
                                    "arrival_time": stop_time_update.arrival.time if stop_time_update.HasField('arrival') and stop_time_update.arrival.HasField('time') else None,
                                    "departure_time": stop_time_update.departure.time if stop_time_update.HasField('departure') and stop_time_update.departure.HasField('time') else None
                                }
                                stop_updates.append(stop_update)
                            
                            trip_updates.append({
                                "trip_id": trip_update.trip.trip_id,
                                "route_id": trip_update.trip.route_id if trip_update.trip.HasField('route_id') else None,
                                "start_date": trip_update.trip.start_date if trip_update.trip.HasField('start_date') else None,
                                "schedule_relationship": trip_update.trip.schedule_relationship if trip_update.trip.HasField('schedule_relationship') else None,
                                "delay": trip_update.delay if trip_update.HasField('delay') else None,
                                "timestamp": datetime.now().isoformat(),
                                "agency": feed_info["agency_id"],
                                "stop_time_updates": stop_updates
                            })
                    
                    logger.info(f"Fetched {len(trip_updates)} trip updates for {feed_info['name']}")
                    return trip_updates
                    
                except ImportError:
                    logger.warning("GTFS-RT protobuf library not available for trip updates")
                    return None
                except Exception as e:
                    logger.error(f"Error parsing trip updates: {e}")
                    return None
                
        except Exception as e:
            logger.error(f"Failed to fetch trip updates for {agency_key}: {e}")
            return None
    
    async def _load_gtfs_files(self, db: AsyncSession, gtfs_zip: zipfile.ZipFile, agency_key: str):
        """Load GTFS files into database in proper order."""
        try:
            # Load in order of dependencies
            await _load_csv_to_db(db, gtfs_zip, 'routes.txt', GTFSRoute, GTFSRouteBase)
            await _load_csv_to_db(db, gtfs_zip, 'stops.txt', GTFSStop, GTFSStopBase)
            await _load_csv_to_db(db, gtfs_zip, 'shapes.txt', GTFSShape, GTFSShapeBase)
            await _load_csv_to_db(db, gtfs_zip, 'trips.txt', GTFSTrip, GTFSTripBase)
            await _load_csv_to_db(db, gtfs_zip, 'stop_times.txt', GTFSStopTime, GTFSStopTimeBase)
            await _load_csv_to_db(db, gtfs_zip, 'calendar.txt', GTFSCalendar, GTFSCalendarBase)
            
            # calendar_dates.txt is optional
            if 'calendar_dates.txt' in gtfs_zip.namelist():
                await _load_csv_to_db(db, gtfs_zip, 'calendar_dates.txt', GTFSCalendarDate, GTFSCalendarDateBase)
            
            logger.info(f"All GTFS files loaded successfully for {agency_key}")
            
        except Exception as e:
            logger.error(f"Error loading GTFS files for {agency_key}: {e}")
            raise

# Global updater instance
auto_updater = AutoGTFSUpdater()

async def main():
    """Main function to start automated updates."""
    # Start both static and real-time updates concurrently
    await asyncio.gather(
        auto_updater.start_daily_static_updates(["golden_gate"]),
        auto_updater.start_realtime_updates(["golden_gate"])
    )

if __name__ == "__main__":
    asyncio.run(main())
