import asyncio
from sqlalchemy import inspect
from app.core.database import database, engine
from app.models.gtfs_static import Base

async def check_tables():
    # Create tables if they don't exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Get table information
    inspector = inspect(engine)
    tables = await database.fetch_all("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
    
    print("\nTables in the database:")
    for table in tables:
        print(f"- {table['table_name']}")
    
    # Check if required tables exist
    required_tables = ['gtfs_routes', 'gtfs_trips', 'gtfs_shapes']
    print("\nChecking required tables:")
    for table in required_tables:
        exists = await database.fetch_val(f"""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = :table_name
            )
        "", {"table_name": table})
        print(f"- {table}: {'✅ Found' if exists else '❌ Missing'}")

if __name__ == "__main__":
    asyncio.run(check_tables())
