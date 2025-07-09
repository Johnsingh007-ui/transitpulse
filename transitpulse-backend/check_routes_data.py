import asyncio
from sqlalchemy import text
from app.core.database import engine

async def check_data():
    try:
        async with engine.connect() as conn:
            # Check if table exists
            result = await conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'gtfs_routes'
                )
            """))
            table_exists = result.scalar()
            print(f"Table gtfs_routes exists: {table_exists}")
            
            if table_exists:
                # Get column information
                result = await conn.execute(text("""
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = 'gtfs_routes'
                """))
                print("\nColumns in gtfs_routes:")
                for row in result:
                    print(f"- {row.column_name} ({row.data_type})")
                
                # Get row count
                result = await conn.execute(text("SELECT COUNT(*) FROM gtfs_routes"))
                count = result.scalar()
                print(f"\nTotal rows in gtfs_routes: {count}")
                
                # Get sample data
                if count > 0:
                    result = await conn.execute(text("SELECT * FROM gtfs_routes LIMIT 1"))
                    row = result.first()
                    print("\nSample row data:")
                    print(dict(row._mapping))
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_data())
