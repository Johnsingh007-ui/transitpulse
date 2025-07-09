import asyncio
from sqlalchemy import select, text
from app.core.database import engine

async def check_routes():
    print("🔍 Starting database check...")
    try:
        async with engine.connect() as conn:
            print("✅ Connected to database")
            
            # First try raw SQL
            print("\n🔍 Running raw SQL query...")
            result = await conn.execute(text("SELECT * FROM gtfs_routes LIMIT 5"))
            rows = result.fetchall()
            print(f"📊 Found {len(rows)} routes with raw SQL")
            
            if rows:
                print("\n📋 First row (raw SQL):")
                print(dict(rows[0]))
            
            # Now try ORM
            print("\n🔍 Running ORM query...")
            from app.models.gtfs_static import GTFSRoute as GTFSRouteModel
            result = await conn.execute(select(GTFSRouteModel).limit(5))
            orm_rows = result.scalars().all()
            print(f"📊 Found {len(orm_rows)} routes with ORM")
            
            if orm_rows:
                print("\n📋 First row (ORM):")
                for column in GTFSRouteModel.__table__.columns:
                    print(f"   - {column.name}: {getattr(orm_rows[0], column.name, None)}")
                    
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_routes())
