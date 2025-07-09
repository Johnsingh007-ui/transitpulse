#!/usr/bin/env python3
"""
Script to initialize GTFS data and start real-time updates.
"""
import os
import sys
import logging
from datetime import datetime, timedelta
import asyncio
from sqlalchemy.orm import Session

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal, engine
from app.core.config import settings
from data_ingestion.gtfs_ingestor import GTFSIngestor
from data_ingestion.gtfsrt_ingestor import GTFSRTIngestor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def init_db():
    """Initialize the database with required tables."""
    # Import models to ensure they are registered with SQLAlchemy
    from app.models import Base
    
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created")

def load_initial_gtfs_data():
    """Load initial GTFS data into the database."""
    db = SessionLocal()
    try:
        api_key = os.getenv('GTFS_API_KEY')
        if not api_key:
            logger.error("GTFS_API_KEY environment variable not set")
            return False
            
        ingestor = GTFSIngestor(api_key=api_key, db_session=db)
        result = ingestor.update_gtfs_data()
        
        if result['success']:
            logger.info(f"Successfully loaded GTFS data in {result['duration']:.2f} seconds")
            return True
        else:
            logger.error(f"Failed to load GTFS data: {result.get('message', 'Unknown error')}")
            return False
            
    except Exception as e:
        logger.error(f"Error loading GTFS data: {e}")
        return False
    finally:
        db.close()

async def run_gtfsrt_updates():
    """Run the GTFS-RT update loop."""
    db = SessionLocal()
    try:
        api_key = os.getenv('GTFS_API_KEY')
        if not api_key:
            logger.error("GTFS_API_KEY environment variable not set")
            return
            
        ingestor = GTFSRTIngestor(api_key=api_key, db_session=db)
        logger.info("Starting GTFS-RT update loop...")
        await asyncio.to_thread(ingestor.start)
        
    except Exception as e:
        logger.error(f"Error in GTFS-RT update loop: {e}")
    finally:
        db.close()

def main():
    """Main function to initialize the database and start services."""
    logger.info("Starting TransitPulse data initialization...")
    
    # Initialize the database
    init_db()
    
    # Load initial GTFS data
    if not load_initial_gtfs_data():
        logger.error("Failed to load initial GTFS data")
        return
    
    # Start the GTFS-RT update loop
    logger.info("Starting GTFS-RT update service...")
    try:
        asyncio.run(run_gtfsrt_updates())
    except KeyboardInterrupt:
        logger.info("Stopping GTFS-RT update service...")
    except Exception as e:
        logger.error(f"Error in GTFS-RT service: {e}")
    
    logger.info("TransitPulse data initialization complete")

if __name__ == "__main__":
    main()
