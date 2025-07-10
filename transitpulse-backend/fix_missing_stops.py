#!/usr/bin/env python3
"""
Script to fix missing stops data by reloading GTFS data cleanly.
"""
import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.gtfs_static import GTFSRoute, GTFSStop, GTFSTrip, GTFSStopTime, GTFSCalendar, GTFSCalendarDate, GTFSShape
from data_ingestion.gtfs_static_loader import load_gtfs_static_data, GGT_OPERATOR_ID, FIVE_ELEVEN_API_KEY

async def clear_gtfs_data():
    """Clear all GTFS data from the database."""
    print("🧹 Clearing existing GTFS data...")
    async with SessionLocal() as db:
        # Delete in reverse dependency order
        await db.execute("DELETE FROM gtfs_stop_times")
        await db.execute("DELETE FROM gtfs_calendar_dates") 
        await db.execute("DELETE FROM gtfs_calendar")
        await db.execute("DELETE FROM gtfs_trips")
        await db.execute("DELETE FROM gtfs_shapes")
        await db.execute("DELETE FROM gtfs_stops")
        await db.execute("DELETE FROM gtfs_routes")
        await db.commit()
        print("✅ All GTFS data cleared successfully")

async def check_data_status():
    """Check the current state of GTFS data."""
    print("\n📊 Checking data status...")
    async with SessionLocal() as db:
        routes_count = await db.execute("SELECT COUNT(*) FROM gtfs_routes")
        stops_count = await db.execute("SELECT COUNT(*) FROM gtfs_stops") 
        trips_count = await db.execute("SELECT COUNT(*) FROM gtfs_trips")
        stop_times_count = await db.execute("SELECT COUNT(*) FROM gtfs_stop_times")
        
        # Check how many routes have stop_times data
        routes_with_stops = await db.execute("""
            SELECT COUNT(DISTINCT t.route_id) 
            FROM gtfs_trips t 
            JOIN gtfs_stop_times st ON t.trip_id = st.trip_id
        """)
        
        routes_result = routes_count.scalar()
        stops_result = stops_count.scalar()
        trips_result = trips_count.scalar()
        stop_times_result = stop_times_count.scalar()
        routes_with_stops_result = routes_with_stops.scalar()
        
        print(f"Routes: {routes_result}")
        print(f"Stops: {stops_result}")
        print(f"Trips: {trips_result}")
        print(f"Stop Times: {stop_times_result}")
        print(f"Routes with Stop Times: {routes_with_stops_result}/{routes_result}")
        
        return {
            'routes': routes_result,
            'stops': stops_result,
            'trips': trips_result,
            'stop_times': stop_times_result,
            'routes_with_stops': routes_with_stops_result
        }

async def main():
    """Main function to fix the missing stops issue."""
    print("🚌 TransitPulse GTFS Data Fix")
    print("=============================")
    
    # Check current status
    initial_status = await check_data_status()
    
    # Check if all routes have stop times data
    routes_without_stops = initial_status['routes'] - initial_status['routes_with_stops']
    if routes_without_stops > 0:
        print(f"\n⚠️  {routes_without_stops} routes missing stop times data - proceeding with fix")
    elif initial_status['stop_times'] > 0 and initial_status['trips'] > 0:
        ratio = initial_status['stop_times'] / initial_status['trips']
        print(f"\n⚠️  Stop Times to Trips ratio: {ratio:.1f}")
        if ratio < 5:  # Typically should be 10-20 stops per trip
            print("❌ Data appears incomplete - proceeding with fix")
        else:
            print("✅ Data looks complete - no fix needed")
            return True
    else:
        print("\n❌ No data found - proceeding with initial load")
    
    # Clear existing data
    await clear_gtfs_data()
    
    # Reload fresh data
    print("\n🔄 Loading fresh GTFS data from Golden Gate Transit...")
    success = await load_gtfs_static_data(GGT_OPERATOR_ID, FIVE_ELEVEN_API_KEY)
    
    if success:
        print("✅ GTFS data reload completed successfully")
        
        # Check final status  
        print("\n📊 Final data status:")
        final_status = await check_data_status()
        
        if final_status['stop_times'] > 0 and final_status['trips'] > 0:
            ratio = final_status['stop_times'] / final_status['trips']
            print(f"Stop Times per Trip: {ratio:.1f}")
            
        print("\n🎉 Fix completed! All routes should now have stops data.")
    else:
        print("❌ Failed to reload GTFS data")
        return False
    
    return True

if __name__ == "__main__":
    success = asyncio.run(main())
    if success:
        print("\n✅ You can now test the routes with stops:")
        print("curl 'http://localhost:8000/api/v1/stops?route_id=101'")
        print("curl 'http://localhost:8000/api/v1/stops?route_id=130'")
    else:
        print("\n❌ Fix failed - check logs for details")
        sys.exit(1)
