import httpx
import time
import os
import sys
from datetime import datetime
from google.transit import gtfs_realtime_pb2
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from sqlalchemy import update, text, create_engine
from databases import Database
import asyncio
import logging

# Add the project root to the Python path to allow imports from app.*
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Now import the app modules
try:
    from app.core.database import SessionLocal
    from app.models.vehicle import LiveVehiclePosition
    from app.schemas.vehicle import LiveVehiclePositionCreate
    from app.core.config import settings
    DATABASE_URL = settings.DATABASE_URL
except ImportError as e:
    print(f"Error importing app modules: {e}")
    raise

# Configure logging for better visibility
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('gtfs_rt_processor.log')
    ]
)
logger = logging.getLogger(__name__)

# --- Configuration ---
# Golden Gate Transit direct GTFS-RT API (no API key needed)
GGT_AGENCY_ID = "GG"  # Golden Gate Transit Agency ID

# Using Golden Gate Transit's official GTFS-RT feed
GTFS_RT_VEHICLE_POSITIONS_URL = "https://api.goldengate.org/public/gtfs-rt/vehicles"

class GTFSRTProcessor:
    """
    Handles real-time GTFS-RT data processing for vehicle positions.
    """
    
    def __init__(self):
        """Initialize the GTFS-RT processor."""
        self.logger = logging.getLogger(__name__)
    
    async def fetch_and_store_vehicle_positions(self):
        """
        Fetches and stores vehicle positions from the real-time feed.
        This is the method called by the scheduler.
        """
        return await fetch_and_process_gtfs_rt_data()

# --- Database Connection Test Function ---
async def test_database_connection(db_url: str) -> bool:
    logger.info("Testing database connection...")
    try:
        test_db_connection = Database(db_url)
        await test_db_connection.connect()
        await test_db_connection.execute(text("SELECT 1"))
        await test_db_connection.disconnect()
        logger.info("Database connection test passed!")
        return True
    except Exception as e:
        logger.error(f"Database connection test failed: {e}")
        logger.info(f"Database URL: {db_url}")
        logger.info("Make sure PostgreSQL is running and accessible with the provided credentials.")
        return False

# --- GTFS-RT Processing Function ---
async def fetch_and_process_gtfs_rt_data():
    """
    Fetches GTFS-Realtime Vehicle Positions from Golden Gate Transit, parses them, and updates the database.
    """
    headers = {"Accept": "application/x-google-protobuf"}

    logger.info(f"Fetching real-time vehicle positions from Golden Gate Transit: {GTFS_RT_VEHICLE_POSITIONS_URL}...")

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                GTFS_RT_VEHICLE_POSITIONS_URL, 
                headers=headers, 
                timeout=20.0,
                follow_redirects=True
            )
            response.raise_for_status()

            # Parse the Protocol Buffer response
            feed = gtfs_realtime_pb2.FeedMessage()
            feed.ParseFromString(response.content)

            async with SessionLocal() as db:
                updated_count = 0
                new_count = 0

                for entity in feed.entity:
                    if entity.HasField('vehicle'):
                        vehicle = entity.vehicle

                        vehicle_id_from_feed = entity.id

                        # Ensure all fields are properly typed before validation
                        vehicle_data = {
                            "timestamp": datetime.fromtimestamp(vehicle.timestamp) if vehicle.HasField('timestamp') else datetime.utcnow(),
                            "vehicle_id": str(vehicle.vehicle.id) if vehicle.HasField('vehicle') and vehicle.vehicle.HasField('id') else str(vehicle_id_from_feed),
                            "trip_id": str(vehicle.trip.trip_id) if vehicle.HasField('trip') and vehicle.trip.HasField('trip_id') else None,
                            "route_id": str(vehicle.trip.route_id) if vehicle.HasField('trip') and vehicle.trip.HasField('route_id') else None,
                            "latitude": float(vehicle.position.latitude) if vehicle.HasField('position') and vehicle.position.HasField('latitude') else None,
                            "longitude": float(vehicle.position.longitude) if vehicle.HasField('position') and vehicle.position.HasField('longitude') else None,
                            "bearing": float(vehicle.position.bearing) if vehicle.HasField('position') and vehicle.position.HasField('bearing') else None,
                            "speed": float(vehicle.position.speed) if vehicle.HasField('position') and vehicle.position.HasField('speed') else None,
                            "current_status": int(vehicle.current_status) if vehicle.HasField('current_status') else None,
                            "congestion_level": int(vehicle.congestion_level) if vehicle.HasField('congestion_level') else None,
                            "occupancy_status": int(vehicle.occupancy_status) if vehicle.HasField('occupancy_status') else None,
                            "stop_id": str(vehicle.stop_id) if vehicle.HasField('stop_id') else None,
                        }

                        try:
                            validated_vehicle = LiveVehiclePositionCreate(**vehicle_data)
                        except Exception as e:
                            logger.warning(f"Validation error for vehicle {vehicle_id_from_feed}: {e} - Data: {vehicle_data}")
                            continue

                        # Attempt to update existing record, or create new one
                        update_data = validated_vehicle.model_dump()
                        
                        stmt = update(LiveVehiclePosition).where(
                            LiveVehiclePosition.vehicle_id == validated_vehicle.vehicle_id
                        ).values(
                            timestamp=update_data['timestamp'],
                            vehicle_id=update_data['vehicle_id'],
                            trip_id=update_data['trip_id'],
                            route_id=update_data['route_id'],
                            latitude=update_data['latitude'],
                            longitude=update_data['longitude'],
                            bearing=update_data['bearing'],
                            speed=update_data['speed'],
                            current_status=update_data['current_status'],
                            congestion_level=update_data['congestion_level'],
                            occupancy_status=update_data['occupancy_status'],
                            stop_id=update_data['stop_id']
                        )
                        
                        result = await db.execute(stmt)

                        if result.rowcount == 0:
                            # If no row was updated, it means the vehicle_id doesn't exist, so create a new one
                            new_vehicle = LiveVehiclePosition(**validated_vehicle.model_dump())
                            db.add(new_vehicle)
                            new_count += 1
                        else:
                            updated_count += 1

                await db.commit()
                logger.info(f"Processed GTFS-RT for Golden Gate Transit: {updated_count} vehicles updated, {new_count} new vehicles added.")
                return True

        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error fetching GTFS-RT for Golden Gate Transit: {e.response.status_code} - {e.response.text}")
            if e.response.status_code == 401:
                logger.error("Authentication Error: Invalid API Key for GTFS-RT. Please check your API key.")
            elif e.response.status_code == 404:
                logger.error(f"Not Found: Golden Gate Transit GTFS-RT feed might not be available.")
            return False
        except httpx.RequestError as e:
            logger.error(f"Network error fetching GTFS-RT for Golden Gate Transit: {e}")
            return False
        except Exception as e:
            logger.error(f"An unexpected error occurred during GTFS-RT processing for Golden Gate Transit: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return False

# --- Main Execution Loop ---
async def main_loop():
    # Test DB connection once at startup
    if not await test_database_connection(DATABASE_URL):
        logger.error("GTFS-RT processor stopped due to database connection failure.")
        return

    FETCH_INTERVAL_SECONDS = 30  # Fetch data every 30 seconds
    logger.info("Starting continuous GTFS-RT processing loop...")

    while True:
        start_time = datetime.utcnow()
        success = await fetch_and_process_gtfs_rt_data()

        processing_time = (datetime.utcnow() - start_time).total_seconds()
        sleep_time = max(0, FETCH_INTERVAL_SECONDS - processing_time)

        if not success:
            logger.warning(f"Error during GTFS-RT fetch. Retrying in {int(sleep_time)} seconds...")
        else:
            logger.info(f"Processing cycle completed in {processing_time:.2f} seconds.")
            logger.info(f"Sleeping for {int(sleep_time)} seconds...")

        await asyncio.sleep(sleep_time)

if __name__ == "__main__":
    try:
        logger.info("Starting GTFS-RT processor...")
        asyncio.run(main_loop())
    except KeyboardInterrupt:
        logger.info("GTFS-RT processor stopped by user.")
    except Exception as e:
        logger.error(f"Fatal error in GTFS-RT processor: {e}")
        import traceback
        logger.error(traceback.format_exc())
    finally:
        logger.info("GTFS-RT processor stopped.")
