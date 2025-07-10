import asyncpg
import asyncio

async def check_permissions():
    print("Checking database permissions...")
    try:
        # Connect to the database
        conn = await asyncpg.connect(
            host='localhost',
            port=5432,
            user='transitpulse_user',
            password='transitpulse_pass',
            database='transitpulse_db'
        )
        
        print("✅ Successfully connected to the database")
        
        # Check if we can query the pg_tables view
        tables = await conn.fetch(
            "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
        )
        
        if tables:
            print("\nAvailable tables:")
            for table in tables:
                print(f"- {table['tablename']}")
        else:
            print("\nNo tables found in the public schema")
            
        # Check if we can query the gtfs_routes table if it exists
        try:
            routes = await conn.fetch("SELECT COUNT(*) FROM gtfs_routes")
            print(f"\n✅ Successfully queried gtfs_routes table. Row count: {routes[0]['count']}")
        except Exception as e:
            print(f"\n❌ Error querying gtfs_routes table: {e}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        if 'conn' in locals():
            await conn.close()

if __name__ == "__main__":
    asyncio.run(check_permissions())
