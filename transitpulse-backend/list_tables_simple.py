import asyncpg
import asyncio

async def list_tables():
    print("Connecting to database...")
    try:
        conn = await asyncpg.connect(
            host='localhost',
            port=5432,
            user='transitpulse_user',
            password='transitpulse_pass',
            database='transitpulse_db'
        )
        
        print("✅ Connected to database")
        
        # List all tables
        print("\nTables in the database:")
        print("-" * 50)
        
        # Get list of all tables
        tables = await conn.fetch("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)
        
        if not tables:
            print("No tables found in the database")
        else:
            for table in tables:
                print(f"- {table['table_name']}")
        
        print("-" * 50)
        
        # Check if gtfs_routes exists
        routes_exists = await conn.fetchval("""
            SELECT EXISTS (
                SELECT 1 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'gtfs_routes'
            );
        """)
        
        if routes_exists:
            print("\n✅ gtfs_routes table exists")
            # Count rows in gtfs_routes
            count = await conn.fetchval("SELECT COUNT(*) FROM gtfs_routes")
            print(f"   - Contains {count} rows")
        else:
            print("\n❌ gtfs_routes table does not exist")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        if 'conn' in locals():
            await conn.close()
            print("\nDatabase connection closed")

if __name__ == "__main__":
    asyncio.run(list_tables())
