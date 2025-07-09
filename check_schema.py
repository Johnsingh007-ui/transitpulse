import asyncio
import asyncpg

async def check_schema():
    try:
        conn = await asyncpg.connect(
            user='postgres',
            password='mysecretpassword',
            database='transitpulse_db',
            host='localhost',
            port=5432
        )
        
        # Get columns for gtfs_routes table
        print("\n🔍 Schema for gtfs_routes table:")
        columns = await conn.fetch("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'gtfs_routes'
            ORDER BY ordinal_position;
        """)
        
        print("\nColumn Name\t\tData Type\tNullable")
        print("-" * 50)
        for col in columns:
            print(f"{col['column_name']}\t\t{col['data_type']}\t\t{col['is_nullable']}")
        
        # Get row count for each table
        print("\n📊 Table Row Counts:")
        tables = await conn.fetch("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public';
        """)
        
        for table in tables:
            count = await conn.fetchval(f"SELECT COUNT(*) FROM {table['table_name']}")
            print(f"- {table['table_name']}: {count} rows")
        
        await conn.close()
        
    except Exception as e:
        print(f"\n❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(check_schema())
