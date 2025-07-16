#!/usr/bin/env python3
"""
Simple vehicle position updater
Continuously fetches and saves vehicle positions to database
"""

import asyncio
import logging
import os
from dotenv import load_dotenv
from data_ingestion.auto_gtfs_updater import AutoGTFSUpdater

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

async def run_vehicle_updates():
    """Run continuous vehicle position updates."""
    logger.info("Starting vehicle position updater...")
    
    # Get agency name from environment variable
    agency_name = os.getenv('AGENCY_NAME')
    if not agency_name:
        logger.error("AGENCY_NAME environment variable is not set. Please set it in the .env file.")
        return
    
    logger.info(f"Using agency: {agency_name}")
    
    updater = AutoGTFSUpdater()
    
    # Start real-time vehicle updates for the configured agency
    await updater.start_realtime_updates([agency_name])

if __name__ == "__main__":
    try:
        asyncio.run(run_vehicle_updates())
    except KeyboardInterrupt:
        logger.info("Vehicle updater stopped by user")
    except Exception as e:
        logger.error(f"Vehicle updater failed: {e}")
