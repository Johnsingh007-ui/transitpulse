import asyncio
from sqlalchemy import text
from app.core.database import engine

async def check_db():
    print("🔍 Starting database check...")
    try:
        async with engine.connect() as conn:
            print("✅ Connected to database")
            
            # Get column names first
            print("\n📋 Table columns:")
            result = await conn.execute(text("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'gtfs_routes'
            """))
            columns = [row[0] for row in result]
            print("\n".join(f"- {col}" for col in columns))
            
            # Get sample data
            print("\n📋 Sample data (first 5 rows):")
            result = await conn.execute(text("SELECT * FROM gtfs_routes LIMIT 5"))
            for i, row in enumerate(result, 1):
                print(f"\nRow {i}:")
                for col, val in zip(columns, row):
                    print(f"  {col}: {val}")
                    
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_db())
