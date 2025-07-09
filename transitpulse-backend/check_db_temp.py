import asyncio
from sqlalchemy import text
from app.core.database import engine

async def check_db():
    try:
        async with engine.connect() as conn:
            print("✅ Connected to database")
            # Execute a simple query
            result = await conn.execute(text("SELECT * FROM gtfs_routes LIMIT 5"))
            rows = result.fetchall()
            print(f"Found {len(rows)} routes")
            if rows:
                print("\nFirst route:")
                print(dict(rows[0]))
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_db())
