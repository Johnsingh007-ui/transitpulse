#!/usr/bin/env python3
"""
Initialize agencies in the database.
This script populates the agencies table with the default configuration.
"""

import asyncio
import sys
import os

# Add the parent directory to sys.path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import async_engine
from app.models import Base
from app.models.agency import Agency
from app.core.config import settings
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

async def init_agencies():
    """Initialize agencies in the database"""
    
    # Create all tables if they don't exist
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Create async session
    async with AsyncSession(async_engine) as session:
        try:
            # Check if Golden Gate Transit agency already exists
            result = await session.execute(
                select(Agency).where(Agency.agency_id == "golden_gate_transit")
            )
            existing_agency = result.scalar_one_or_none()
            
            if existing_agency:
                print("✅ Golden Gate Transit agency already exists in database")
                return
            
            # Create Golden Gate Transit agency
            ggt_agency = Agency(
                agency_id="golden_gate_transit",
                name="Golden Gate Transit",
                display_name="Golden Gate Transit",
                short_name="GGT",
                website="https://www.goldengate.org/",
                color_primary="#0052A3",
                color_secondary="#FFD700",
                logo_url="/logos/ggt-logo.png",
                gtfs_static_url="https://gtfs.goldengate.org/gtfs/google_transit.zip",
                gtfs_rt_vehicles_url="https://api.goldengate.org/public/gtfs-rt/vehicles",
                config={
                    "update_frequency_minutes": 30,
                    "timezone": "America/Los_Angeles",
                    "feed_version": "1.0"
                },
                enabled=True
            )
            
            session.add(ggt_agency)
            await session.commit()
            print("✅ Successfully created Golden Gate Transit agency")
            
        except Exception as e:
            print(f"❌ Error creating agencies: {e}")
            await session.rollback()
            raise

async def main():
    try:
        await init_agencies()
        print("🎉 Agency initialization completed successfully!")
    except Exception as e:
        print(f"💥 Agency initialization failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
