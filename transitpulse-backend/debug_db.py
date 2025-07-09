import asyncio
from sqlalchemy import select, text
from app.core.database import engine
from app.models.gtfs_static import GTFSRoute as GTFSRouteModel

async def test_db():
    print("🔍 Testing database connection...")
    try:
        async with engine.connect() as conn:
            print("✅ Connected to database")
            
            # Test raw SQL query
            print("\n🔍 Testing raw SQL query...")
            result = await conn.execute(text("SELECT * FROM gtfs_routes LIMIT 5"))
            rows = result.fetchall()
            print(f"✅ Retrieved {len(rows)} rows with raw SQL")
            if rows:
                print("\n📋 First row data:")
                print(dict(rows[0]))
            
            # Test ORM query
            print("\n🔍 Testing ORM query...")
            result = await conn.execute(select(GTFSRouteModel).limit(5))
            routes = result.scalars().all()
            print(f"✅ Retrieved {len(routes)} routes with ORM")
            if routes:
                print("\n📋 First route data:")
                route_dict = {col.name: getattr(routes[0], col.name) for col in GTFSRouteModel.__table__.columns}
                print(route_dict)
                
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_db())
