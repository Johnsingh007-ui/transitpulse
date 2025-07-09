import asyncio
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

async def query_database():
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        print("❌ DATABASE_URL environment variable not set")
        return
    
    engine = create_async_engine(db_url)
    
    try:
        async with engine.connect() as conn:
            # Get count of routes
            result = await conn.execute(text("SELECT COUNT(*) FROM gtfs_routes"))
            count = result.scalar()
            print(f"Total routes: {count}")
            
            # Get sample routes
            result = await conn.execute(text("SELECT * FROM gtfs_routes LIMIT 5"))
            rows = result.mappings().all()
            
            print("\nSample routes:")
            for row in rows:
                print(dict(row))
                
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(query_database())
