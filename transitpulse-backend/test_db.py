import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv

async def test_connection():
    # Load environment variables
    load_dotenv()
    
    # Get database URL from environment or use default
    db_url = os.getenv("DATABASE_URL", "postgresql+asyncpg://user:password@localhost:5432/transitpulse")
    
    print(f"\n🔌 Testing database connection to: {db_url}")
    
    try:
        # Create a new engine
        engine = create_async_engine(db_url)
        
        # Test connection
        async with engine.connect() as conn:
            print("✅ Successfully connected to the database")
            
            # List all tables
            result = await conn.execute(
                """
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name;
                """
            )
            
            tables = [row[0] for row in result]
            print("\n📋 Available tables:")
            for table in tables:
                print(f"- {table}")
                
                # Show column info for each table
                if table.startswith('gtfs_'):
                    columns = await conn.execute(
                        f"""
                        SELECT column_name, data_type 
                        FROM information_schema.columns 
                        WHERE table_name = '{table}'
                        ORDER BY ordinal_position;
                        """
                    )
                    print(f"  Columns: {', '.join(f'{col[0]} ({col[1]})' for col in columns)}")
            
            # Count rows in each GTFS table
            print("\n📊 Row counts:")
            for table in tables:
                if table.startswith('gtfs_'):
                    try:
                        count = await conn.scalar(f"SELECT COUNT(*) FROM {table}")
                        print(f"- {table}: {count} rows")
                    except Exception as e:
                        print(f"- {table}: Error - {str(e)[:100]}")
            
    except Exception as e:
        print(f"❌ Error connecting to database: {e}")
    finally:
        if 'engine' in locals():
            await engine.dispose()
            print("\n🔌 Database connection closed")

if __name__ == "__main__":
    asyncio.run(test_connection())
