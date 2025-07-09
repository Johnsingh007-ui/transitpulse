import asyncio
import asyncpg

async def check_db():
    try:
        # Try connecting with the application credentials
        conn = await asyncpg.connect(
            user='postgres',
            password='mysecretpassword',
            database='transitpulse_db',
            host='localhost',
            port=5432
        )
        print("✅ Successfully connected to the database!")
        
        # Check if the database exists
        result = await conn.fetch("SELECT 1")
        print(f"✅ Database query successful. Result: {result}")
        
        await conn.close()
        return True
    except Exception as e:
        print(f"❌ Error connecting to the database: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(check_db())
