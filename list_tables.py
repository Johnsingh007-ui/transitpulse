import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
import os
from dotenv import load_dotenv

async def list_tables():
    # Load environment variables
    load_dotenv()
    
    # Get database URL from environment or use default
    db_url = os.getenv("DATABASE_URL", "postgresql+asyncpg://transitpulse_user:mysecretpassword@localhost:5432/transitpulse_db")
    
    print(f"Connecting to database: {db_url}")
    
    try:
        # Create engine
        engine = create_async_engine(db_url)
        
        # Test connection
        async with engine.connect() as conn:
            print("✅ Successfully connected to the database")
            
            # List all tables
            result = await conn.execute(
                text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name;
                """)
            )
            
            tables = [row[0] for row in result]
            
            if tables:
                print("\n📋 Available tables:")
                for table in tables:
                    print(f"- {table}")
            else:
                print("\n❌ No tables found in the database")
                
    except Exception as e:
        print(f"\n❌ Error: {e}")
    finally:
        if 'engine' in locals():
            await engine.dispose()
            print("\n🔌 Database connection closed")

if __name__ == "__main__":
    asyncio.run(list_tables())
