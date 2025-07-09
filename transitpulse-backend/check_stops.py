import asyncio
from app.core.database import engine
from sqlalchemy import text

async def check_stops():
    try:
        async with engine.connect() as conn:
            # Check if table exists
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
            print(f"gtfs_stops table exists: {table_exists}")
            
            if table_exists:
                # Count stops
                result = await conn.execute(text("SELECT COUNT(*) FROM gtfs_stops"))
                count = result.scalar()
                print(f"Number of stops: {count}")
                
                # Sample some stops
                if count > 0:
                    result = await conn.execute(
                        text("SELECT stop_id, stop_name FROM gtfs_stops LIMIT 5")
                    )
                    print("\nSample stops:")
                    for row in result:
                        print(f"- {row.stop_id}: {row.stop_name}")
    except Exception as e:
        print(f"Error checking stops: {e}")

if __name__ == "__main__":
    asyncio.run(check_stops())
