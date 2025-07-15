"""
TransitPulse Background Scheduler
Runs automatic GTFS updates and real-time data processing
"""

import asyncio
import schedule
import time
from datetime import datetime, timedelta
from typing import Dict, Any
import logging
from data_ingestion.auto_gtfs_updater import AutoGTFSUpdater
from data_ingestion.gtfs_rt_processor import GTFSRTProcessor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('transitpulse_scheduler.log')
    ]
)
logger = logging.getLogger(__name__)

class TransitPulseScheduler:
    """Background scheduler for TransitPulse data updates."""
    
    def __init__(self):
        self.gtfs_updater = AutoGTFSUpdater()
        self.rt_processor = GTFSRTProcessor()
        self.is_running = False
        
    async def update_static_data_job(self):
        """Daily GTFS static data update job."""
        logger.info("🔄 Starting daily GTFS static data update...")
        try:
            # Update Golden Gate Transit data
            success = await self.gtfs_updater.update_static_data("golden_gate")
            if success:
                logger.info("✅ Daily GTFS static update completed successfully")
            else:
                logger.error("❌ Daily GTFS static update failed")
        except Exception as e:
            logger.error(f"❌ Error during daily GTFS update: {e}")
    
    async def update_realtime_vehicles_job(self):
        """Real-time vehicle position update job (every 30 seconds)."""
        try:
            await self.rt_processor.fetch_and_store_vehicle_positions()
            logger.debug("📍 Real-time vehicle positions updated")
        except Exception as e:
            logger.error(f"❌ Error updating real-time vehicles: {e}")
    
    def setup_schedule(self):
        """Setup the automated schedule."""
        # Daily GTFS static update at 3:00 AM
        schedule.every().day.at("03:00").do(self.run_async_job, self.update_static_data_job)
        
        # Real-time vehicle updates every 30 seconds
        schedule.every(30).seconds.do(self.run_async_job, self.update_realtime_vehicles_job)
        
        logger.info("📅 Scheduled jobs:")
        logger.info("  • GTFS Static Data: Daily at 3:00 AM")
        logger.info("  • Real-time Vehicles: Every 30 seconds")
    
    def run_async_job(self, job_func):
        """Run an async job in the event loop."""
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(job_func())
        except Exception as e:
            logger.error(f"Error running scheduled job: {e}")
        finally:
            loop.close()
    
    async def start_scheduler(self):
        """Start the background scheduler."""
        self.setup_schedule()
        self.is_running = True
        
        logger.info("🚀 TransitPulse Scheduler started")
        logger.info("   Real-time updates: Every 30 seconds")
        logger.info("   Static data updates: Daily at 3:00 AM")
        
        # Run initial updates
        logger.info("🔄 Running initial data updates...")
        await self.update_static_data_job()
        await self.update_realtime_vehicles_job()
        
        # Start the scheduler loop
        while self.is_running:
            schedule.run_pending()
            await asyncio.sleep(1)
    
    def stop_scheduler(self):
        """Stop the background scheduler."""
        self.is_running = False
        logger.info("🛑 TransitPulse Scheduler stopped")

# Entry point for running the scheduler
async def main():
    """Main entry point for the scheduler."""
    scheduler = TransitPulseScheduler()
    
    try:
        await scheduler.start_scheduler()
    except KeyboardInterrupt:
        logger.info("⚡ Received interrupt signal")
        scheduler.stop_scheduler()
    except Exception as e:
        logger.error(f"❌ Scheduler error: {e}")
        scheduler.stop_scheduler()

if __name__ == "__main__":
    asyncio.run(main())
