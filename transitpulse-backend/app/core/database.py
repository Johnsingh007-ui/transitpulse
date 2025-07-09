from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from databases import Database # Still use this for direct connection mgmt
from app.core.config import settings
import asyncio # Import asyncio for running create_db_and_tables

DATABASE_URL = settings.DATABASE_URL

# Use asyncpg driver with databases library
database = Database(DATABASE_URL)

# Use asyncpg driver with SQLAlchemy
engine = create_async_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, class_=AsyncSession)
Base = declarative_base()

async def get_db():
    async with SessionLocal() as session:
        yield session

async def create_db_and_tables():
    """Creates all database tables defined in Base.metadata."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

if __name__ == "__main__":
    # This block runs when database.py is executed directly via `python -m app.core.database`
    print("Attempting to create database tables...")
    asyncio.run(create_db_and_tables())
    print("Database table creation process completed.")
