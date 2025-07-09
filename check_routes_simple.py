import asyncio
import asyncpg

async def check_routes():
    try:
        conn = await asyncpg.connect(
            user='postgres',
            password='mysecretpassword',
            database='transitpulse_db',
            host='localhost',
            port=5432
        )
        
        # List all tables
        print("\n📋 All tables in the database:")
        tables = await conn.fetch("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)
        for table in tables:
            print(f"- {table['table_name']}")
        
        # Check routes table
        print("\n🚌 First 5 routes:")
        routes = await conn.fetch("SELECT * FROM gtfs_routes LIMIT 5")
        for i, route in enumerate(routes, 1):
            print(f"\nRoute {i}:")
            for key, value in route.items():
                if value is not None:
                    print(f"  {key}: {value}")
        
        await conn.close()
        
    except Exception as e:
        print(f"\n❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(check_routes())
