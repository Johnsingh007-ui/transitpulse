import asyncio
import asyncpg

async def check_route_ids():
    try:
        conn = await asyncpg.connect(
            user='postgres',
            password='mysecretpassword',
            database='transitpulse_db',
            host='localhost',
            port=5432
        )
        
        print("Route IDs in the database:")
        routes = await conn.fetch("""
            SELECT route_id, route_short_name, route_long_name 
            FROM gtfs_routes 
            ORDER BY route_short_name NULLS LAST, route_id
        """)
        
        print("\n{:<15} {:<15} {}".format("Route ID", "Short Name", "Long Name"))
        print("-" * 70)
        for route in routes:
            print("{:<15} {:<15} {}".format(
                route['route_id'], 
                route['route_short_name'] or 'N/A', 
                route['route_long_name'] or 'N/A'
            ))
        
        await conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(check_route_ids())
