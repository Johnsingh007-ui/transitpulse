import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os
from dotenv import load_dotenv

async def check_gtfs_data():
    # Load environment variables
    load_dotenv()
    database_url = os.getenv("DATABASE_URL")
    
    if not database_url:
        print("Error: DATABASE_URL not found in .env file")
        return
    
    print(f"Connecting to database: {database_url}")
    
    # Create async engine
    engine = create_async_engine(database_url)
    
    try:
        async with engine.begin() as conn:
            # Check if gtfs_shapes table exists
            result = await conn.execute(
                text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'gtfs_shapes'
                );
                """)
            )
            table_exists = result.scalar()
            
            if not table_exists:
                print("Error: gtfs_shapes table does not exist in the database")
                return
            
            # Count shapes
            result = await conn.execute(
                text("SELECT COUNT(*) FROM gtfs_shapes")
            )
            shape_count = result.scalar()
            print(f"Found {shape_count} shape points in gtfs_shapes table")
            
            # Get distinct shape_ids
            result = await conn.execute(
                text("SELECT COUNT(DISTINCT shape_id) FROM gtfs_shapes")
            )
            distinct_shapes = result.scalar()
            print(f"Found {distinct_shapes} distinct shape_ids")
            
            # Get sample of shape points
            if shape_count > 0:
                result = await conn.execute(
                    text("""
                    SELECT shape_id, COUNT(*) as point_count 
                    FROM gtfs_shapes 
                    GROUP BY shape_id 
                    ORDER BY point_count DESC 
                    LIMIT 5
                    """)
                )
                print("\nSample shape counts:")
                for row in result:
                    print(f"Shape ID: {row[0]}, Points: {row[1]}")
                
                # Get routes information if available
                try:
                    result = await conn.execute(
                        text("SELECT COUNT(*) FROM gtfs_routes")
                    )
                    route_count = result.scalar()
                    print(f"\nFound {route_count} routes in gtfs_routes table")
                    
                    if route_count > 0:
                        result = await conn.execute(
                            text("""
                            SELECT route_id, route_short_name, route_long_name, route_color 
                            FROM gtfs_routes 
                            LIMIT 5
                            """)
                        )
                        print("\nSample routes:")
                        for row in result:
                            print(f"ID: {row[0]}, Short: {row[1]}, Name: {row[2]}, Color: {row[3]}")
                except Exception as e:
                    print(f"\nCould not query gtfs_routes table: {e}")
    
    except Exception as e:
        print(f"Error connecting to database: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_gtfs_data())
