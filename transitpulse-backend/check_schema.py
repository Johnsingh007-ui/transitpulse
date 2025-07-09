import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import settings

async def check_schema():
    # Create a new async engine
    engine = create_async_engine(settings.DATABASE_URL)
    
    async with engine.connect() as conn:
        # Get table information
        result = await conn.execute(text(
            """
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'live_vehicle_positions'
            ORDER BY ordinal_position;
            """
        ))
        
        print("\n=== Database Schema ===")
        print(f"{'Column Name':<20} | {'Data Type':<20} | {'Nullable'}")
        print("-" * 50)
        for row in result:
            print(f"{row[0]:<20} | {row[1]:<20} | {row[2]}")
        
        # Check if delay column exists
        result = await conn.execute(text(
            """
            SELECT EXISTS (
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_name='live_vehicle_positions' 
                AND column_name='delay'
            );
            """
        ))
        has_delay = result.scalar()
        print(f"\nHas 'delay' column: {has_delay}")
        
        # Get row count
        result = await conn.execute(text("SELECT COUNT(*) FROM live_vehicle_positions"))
        count = result.scalar()
        print(f"\nTotal rows in table: {count}")
        
        # Get sample data
        if count > 0:
            result = await conn.execute(text("SELECT * FROM live_vehicle_positions LIMIT 1"))
            row = result.first()
            print("\nSample row column names:", list(row.keys()))
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_schema())
