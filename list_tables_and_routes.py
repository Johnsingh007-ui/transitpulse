import asyncio
import asyncpg

async def list_tables_and_routes():
    try:
        # Connect to the database
        conn = await asyncpg.connect(
            user='postgres',
            password='mysecretpassword',
            database='transitpulse_db',
            host='localhost',
            port=5432
        )
        print("✅ Successfully connected to the database!")
        
        # List all tables
        print("\n📋 List of all tables in the database:")
        tables = await conn.fetch("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)
        
        for table in tables:
            print(f"- {table['table_name']}")
        
        # Check if gtfs_routes table exists
        routes_exist = await conn.fetchval("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'gtfs_routes'
            )
        """)
        
        if routes_exist:
            print("\n🚌 Routes in gtfs_routes table:")
            routes = await conn.fetch("SELECT route_id, route_short_name, route_long_name FROM gtfs_routes LIMIT 10")
            
            if routes:
                for route in routes:
                    print(f"ID: {route['route_id']}, Short Name: {route['route_short_name']}, Long Name: {route['route_long_name']}")
                
                # Check if route 101 exists
                route_101 = await conn.fetchrow(
                    "SELECT * FROM gtfs_routes WHERE route_id = $1",
                    '101'
                )
                
                if route_101:
                    print("\n✅ Found route 101:")
                    for key, value in route_101.items():
                        print(f"{key}: {value}")
                else:
                    print("\n❌ Route 101 not found in gtfs_routes table")
            else:
                print("\n❌ No routes found in gtfs_routes table")
        else:
            print("\n❌ gtfs_routes table does not exist")
        
        await conn.close()
        
    except Exception as e:
        print(f"\n❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(list_tables_and_routes())
