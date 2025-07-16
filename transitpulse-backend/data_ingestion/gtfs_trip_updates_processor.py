import httpx
import time
import os
import sys
from datetime import datetime, timedelta
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
    from app.models.predictions import StopPrediction
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
        logging.FileHandler('gtfs_trip_updates.log')
    ]
)
logger = logging.getLogger(__name__)

# --- Configuration ---
# Golden Gate Transit direct GTFS-RT API (no API key needed)
GTFS_RT_TRIP_UPDATES_URL = "https://api.goldengate.org/public/gtfs-rt/trip-updates"

class GTFSTripUpdatesProcessor:
    """
    Handles real-time GTFS-RT trip updates processing.
    """
    
    def __init__(self):
        """Initialize the GTFS-RT trip updates processor."""
        self.logger = logging.getLogger(__name__)
    
    async def fetch_and_store_trip_updates(self):
        """
        Fetches and stores trip updates from the real-time feed.
        This is the method called by the scheduler.
        """
        return await fetch_and_process_trip_updates()

# --- Database Connection Test Function ---
async def test_database_connection(db_url: str) -> bool:
    logger.info("Testing database connection...")
    try:
        test_db_connection = Database(db_url)
        await test_db_connection.connect()
        await test_db_connection.disconnect()
        logger.info("Database connection test successful.")
        return True
    except Exception as e:
        logger.error(f"Database connection test failed: {e}")
        return False

async def fetch_and_process_trip_updates():
    """
    Fetches GTFS-Realtime Trip Updates from Golden Gate Transit, parses them, and updates the database.
    """
    headers = {"Accept": "application/x-google-protobuf"}

    logger.info(f"Fetching real-time trip updates from Golden Gate Transit: {GTFS_RT_TRIP_UPDATES_URL}...")

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                GTFS_RT_TRIP_UPDATES_URL, 
                headers=headers, 
                timeout=20.0,
                follow_redirects=True
            )
            response.raise_for_status()

            # Parse the GTFS-RT protobuf data
            feed = gtfs_realtime_pb2.FeedMessage()
            feed.ParseFromString(response.content)

            logger.info(f"Received GTFS-RT feed with {len(feed.entity)} entities")

            if len(feed.entity) == 0:
                logger.warning("No trip update entities found in the feed")
                return False

            # Connect to database
            async with SessionLocal() as session:
                try:
                    trip_updates_data = []
                    
                    for entity in feed.entity:
                        if entity.HasField('trip_update'):
                            trip_update = entity.trip_update
                            
                            # Extract trip information
                            trip_id = trip_update.trip.trip_id if trip_update.trip.HasField('trip_id') else None
                            route_id = trip_update.trip.route_id if trip_update.trip.HasField('route_id') else None
                            start_date = trip_update.trip.start_date if trip_update.trip.HasField('start_date') else None
                            
                            # Extract delay information
                            delay_seconds = trip_update.delay if trip_update.HasField('delay') else 0
                            
                            # Extract stop time updates
                            stop_time_updates = []
                            for stop_time_update in trip_update.stop_time_update:
                                stop_update = {
                                    'stop_id': stop_time_update.stop_id if stop_time_update.HasField('stop_id') else None,
                                    'stop_sequence': stop_time_update.stop_sequence if stop_time_update.HasField('stop_sequence') else None,
                                    'arrival_delay': stop_time_update.arrival.delay if stop_time_update.HasField('arrival') and stop_time_update.arrival.HasField('delay') else None,
                                    'departure_delay': stop_time_update.departure.delay if stop_time_update.HasField('departure') and stop_time_update.departure.HasField('delay') else None,
                                    'arrival_time': stop_time_update.arrival.time if stop_time_update.HasField('arrival') and stop_time_update.arrival.HasField('time') else None,
                                    'departure_time': stop_time_update.departure.time if stop_time_update.HasField('departure') and stop_time_update.departure.HasField('time') else None,
                                }
                                stop_time_updates.append(stop_update)
                            
                            trip_update_data = {
                                'trip_id': trip_id,
                                'route_id': route_id,
                                'start_date': start_date,
                                'delay_seconds': delay_seconds,
                                'stop_time_updates': stop_time_updates,
                                'timestamp': datetime.utcnow(),
                                'feed_timestamp': datetime.fromtimestamp(feed.header.timestamp) if feed.header.HasField('timestamp') else datetime.utcnow()
                            }
                            
                            trip_updates_data.append(trip_update_data)

                    # Log the processed data
                    logger.info(f"Processed GTFS-RT for Golden Gate Transit: {len(trip_updates_data)} trip updates processed.")
                    
                    # Store trip updates as stop predictions in the database
                    predictions_stored = 0
                    for trip_update_data in trip_updates_data:
                        for stop_update in trip_update_data['stop_time_updates']:
                            if stop_update['stop_id']:
                                # Create or update stop prediction
                                prediction = StopPrediction(
                                    stop_id=stop_update['stop_id'],
                                    route_id=trip_update_data['route_id'],
                                    trip_id=trip_update_data['trip_id'],
                                    stop_sequence=stop_update['stop_sequence'],
                                    arrival_delay_seconds=stop_update['arrival_delay'] or 0,
                                    departure_delay_seconds=stop_update['departure_delay'] or 0,
                                    prediction_source='gtfs_rt',
                                    is_real_time=True,
                                    expires_at=datetime.utcnow() + timedelta(minutes=10)  # Expire in 10 minutes
                                )
                                
                                # Set predicted times if available
                                if stop_update['arrival_time']:
                                    prediction.predicted_arrival_time = datetime.fromtimestamp(stop_update['arrival_time'])
                                if stop_update['departure_time']:
                                    prediction.predicted_departure_time = datetime.fromtimestamp(stop_update['departure_time'])
                                
                                session.add(prediction)
                                predictions_stored += 1
                    
                    logger.info(f"Stored {predictions_stored} stop predictions from trip updates in database.")
                    
                    await session.commit()
                    return True

                except Exception as db_error:
                    logger.error(f"Database error while processing trip updates: {db_error}")
                    await session.rollback()
                    return False

        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error fetching GTFS-RT for Golden Gate Transit: {e.response.status_code} - {e.response.text}")
            
            if e.response.status_code == 404:
                logger.error(f"Not Found: Golden Gate Transit trip updates feed might not be available.")
            return False
            
        except httpx.RequestError as e:
            logger.error(f"Network error fetching GTFS-RT for Golden Gate Transit: {e}")
            return False
            
        except Exception as e:
            logger.error(f"An unexpected error occurred during GTFS-RT processing for Golden Gate Transit: {e}")
            return False

# Main loop for continuous processing
async def main_loop():
    # Test DB connection once at startup
    if not await test_database_connection(DATABASE_URL):
        logger.error("GTFS-RT trip updates processor stopped due to database connection failure.")
        return

    FETCH_INTERVAL_SECONDS = 60  # Fetch trip updates every 60 seconds
    logger.info("Starting continuous GTFS-RT trip updates processing loop...")

    while True:
        start_time = datetime.utcnow()
        success = await fetch_and_process_trip_updates()

        processing_time = (datetime.utcnow() - start_time).total_seconds()
        sleep_time = max(0, FETCH_INTERVAL_SECONDS - processing_time)

        if not success:
            logger.warning(f"Error during GTFS-RT trip updates fetch. Retrying in {int(sleep_time)} seconds...")
        else:
            logger.info(f"Trip updates processing cycle completed in {processing_time:.2f} seconds.")
            logger.info(f"Sleeping for {int(sleep_time)} seconds...")

        await asyncio.sleep(sleep_time)

if __name__ == "__main__":
    logger.info("Starting GTFS-RT Trip Updates Processor...")
    asyncio.run(main_loop())
