#!/usr/bin/env python3
import asyncio
import os
import sys

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.core.database import create_db_and_tables
from data_ingestion.gtfs_static_loader import load_gtfs_static_data

GGT_OPERATOR_ID = "GG"
FIVE_ELEVEN_API_KEY = "b43cedb9-b614-4739-bb3a-e3c07f895fab"

async def init_db():
    print("Initializing database...")
    await create_db_and_tables()

    print("Loading GTFS data for Golden Gate Transit...")
    success = await load_gtfs_static_data(GGT_OPERATOR_ID, FIVE_ELEVEN_API_KEY)
    if success:
        print(f"✅ GTFS load succeeded for {GGT_OPERATOR_ID}")
    else:
        print(f"❌ GTFS load failed for {GGT_OPERATOR_ID}")

if __name__ == "__main__":
    asyncio.run(init_db())
