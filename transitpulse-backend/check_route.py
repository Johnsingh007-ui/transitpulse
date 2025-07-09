import asyncio
from app.core.database import SessionLocal, engine
from sqlalchemy import text

async def check_route():
    async with SessionLocal() as db:
        # First, check if the gtfs_routes table exists
        result = await db.execute(
            """
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'gtfs_routes'
            )
            """
        )
        table_exists = result.scalar()
        print(f"gtfs_routes table exists: {table_exists}")
        
        if table_exists:
            # Get all routes
            result = await db.execute("SELECT route_id, route_short_name, route_long_name FROM gtfs_routes LIMIT 10")
            routes = result.fetchall()
            print("\nFirst 10 routes in the database:")
            for route in routes:
                print(f"ID: {route[0]}, Short Name: {route[1]}, Long Name: {route[2]}")
            
            # Check if route 101 exists
            result = await db.execute("SELECT * FROM gtfs_routes WHERE route_id = '101'")
            route_101 = result.fetchone()
            if route_101:
                print("\nFound route 101:")
                print(dict(route_101._mapping) if hasattr(route_101, '_mapping') else route_101)
            else:
                print("\nRoute 101 not found in the database")
        else:
            # Check what tables do exist
            result = await db.execute(
                "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
            )
            tables = [row[0] for row in result.fetchall()]
            print("\nAvailable tables:", tables)

if __name__ == "__main__":
    import sys
    import os
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    asyncio.run(check_route())
