#!/usr/bin/env python3
"""
Simple vehicle position updater
Continuously fetches and saves vehicle positions to database
"""

import asyncio
import logging
from data_ingestion.auto_gtfs_updater import AutoGTFSUpdater

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def run_vehicle_updates():
    """Run continuous vehicle position updates."""
    logger.info("Starting vehicle position updater...")
    
    updater = AutoGTFSUpdater()
    
    # Start real-time vehicle updates for Golden Gate Transit
    await updater.start_realtime_updates(["golden_gate"])

if __name__ == "__main__":
    try:
        asyncio.run(run_vehicle_updates())
    except KeyboardInterrupt:
        logger.info("Vehicle updater stopped by user")
    except Exception as e:
        logger.error(f"Vehicle updater failed: {e}")
