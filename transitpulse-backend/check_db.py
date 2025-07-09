import asyncio
import asyncpg
import sys

async def check_db():
    print("Testing database connection...")
    try:
        # Try to connect to the database
        conn = await asyncpg.connect(
            host='localhost',
            port=5432,
            user='transitpulse_user',
            password='mysecretpassword',
            database='transitpulse_db'
        )
        
        print("✅ Successfully connected to the database!")
        
        # Check if the live_vehicle_positions table exists
        table_exists = await conn.fetchval(
            """
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'live_vehicle_positions'
            )
            """
        )
        
        if table_exists:
            print("✅ Table 'live_vehicle_positions' exists")
            
            # Count records in the table
            count = await conn.fetchval("SELECT COUNT(*) FROM live_vehicle_positions")
            print(f"📊 Found {count} records in live_vehicle_positions")
        else:
            print("❌ Table 'live_vehicle_positions' does not exist")
        
        await conn.close()
        
    except Exception as e:
        print(f"❌ Error connecting to the database: {e}")
        print(f"Error type: {type(e).__name__}")
        return False
    
    return True

if __name__ == "__main__":
    asyncio.run(check_db())
