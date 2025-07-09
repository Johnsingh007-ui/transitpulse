import asyncio
from sqlalchemy import text
from app.core.database import engine

async def test_connection():
    try:
        async with engine.connect() as conn:
            # Test connection
            result = await conn.execute(text("SELECT 1"))
            print("✅ Database connection successful")
            
            # Check if gtfs_stops table exists
            result = await conn.execute(
                text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'gtfs_stops'
                )
                """)
            )
            table_exists = result.scalar()
            print(f"📋 gtfs_stops table exists: {table_exists}")
            
            if table_exists:
                # Count stops
                result = await conn.execute(text("SELECT COUNT(*) FROM gtfs_stops"))
                count = result.scalar()
                print(f"🔢 Number of stops in gtfs_stops: {count}")
                
                # Get sample stops
                result = await conn.execute(
                    text("SELECT stop_id, stop_name FROM gtfs_stops LIMIT 5")
                )
                print("\nSample stops:")
                for row in result:
                    print(f"- {row.stop_id}: {row.stop_name}")
            
            # Check if gtfs_trips table exists
            result = await conn.execute(
                text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'gtfs_trips'
                )
                """)
            )
            trips_table_exists = result.scalar()
            print(f"\n📋 gtfs_trips table exists: {trips_table_exists}")
            
            if trips_table_exists:
                # Count trips
                result = await conn.execute(text("SELECT COUNT(*) FROM gtfs_trips"))
                count = result.scalar()
                print(f"🔢 Number of trips in gtfs_trips: {count}")
                
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_connection())
