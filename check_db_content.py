import asyncio
import asyncpg

async def check_db_content():
    try:
        conn = await asyncpg.connect(
            user='postgres',
            password='mysecretpassword',
            database='transitpulse_db',
            host='localhost',
            port=5432
        )
        
        # Check routes table
        print("\n🔍 Routes in the database:")
        routes = await conn.fetch("SELECT * FROM gtfs_routes")
        print(f"Found {len(routes)} routes")
        
        if routes:
            print("\nFirst route as an example:")
            for key, value in routes[0].items():
                if value is not None:
                    print(f"{key}: {value}")
        
        # Check stops table
        print("\n\n🔍 Stops in the database:")
        stops_count = await conn.fetchval("SELECT COUNT(*) FROM gtfs_stops")
        print(f"Total stops: {stops_count}")
        
        if stops_count > 0:
            sample_stop = await conn.fetchrow("SELECT * FROM gtfs_stops LIMIT 1")
            print("\nSample stop:")
            for key, value in sample_stop.items():
                if value is not None:
                    print(f"{key}: {value}")
        
        await conn.close()
        
    except Exception as e:
        print(f"\n❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(check_db_content())
