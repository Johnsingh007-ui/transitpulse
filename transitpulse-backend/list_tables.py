import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import settings

async def list_tables():
    engine = create_async_engine(settings.DATABASE_URL)
    
    try:
        async with engine.connect() as conn:
            # Get list of tables
            result = await conn.execute(
                text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name;
                """)
            )
            
            tables = result.fetchall()
            print("\nDatabase Tables:")
            print("-" * 50)
            for table in tables:
                print(f"- {table[0]}")
            print("-" * 50)
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    print(f"Connecting to database: {settings.DATABASE_URL}")
    asyncio.run(list_tables())
