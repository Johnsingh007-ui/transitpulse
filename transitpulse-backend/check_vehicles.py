import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

# Database configuration
DATABASE_URL = "postgresql+asyncpg://user:transitpulse_pass@localhost:5432/transitpulse_db"

# Create engine and session
engine = create_async_engine(DATABASE_URL)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def check_vehicles():
    try:
        async with AsyncSessionLocal() as session:
            # Count total vehicles
            result = await session.execute(select([sqlalchemy.func.count()]).select_from(LiveVehiclePosition.__table__))
            count = result.scalar()
            print(f"Total vehicles in database: {count}")
            
            # Get some sample data
            if count > 0:
                result = await session.execute(
                    select(LiveVehiclePosition)
                    .order_by(LiveVehiclePosition.timestamp.desc())
                    .limit(5)
                )
                print("\nLatest vehicle positions:")
                for vehicle in result.scalars():
                    print(f"- {vehicle.vehicle_id} on route {vehicle.route_id} at {vehicle.latitude}, {vehicle.longitude}")
    except Exception as e:
        print(f"Error checking vehicles: {e}")

if __name__ == "__main__":
    # Import the model
    from data_ingestion.gtfs_rt_processor import LiveVehiclePosition
    import sqlalchemy
    
    asyncio.run(check_vehicles())
