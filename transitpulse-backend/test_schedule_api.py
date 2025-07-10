#!/usr/bin/env python3
"""
Test script for the new schedule API endpoints
"""

import asyncio
import sys
from datetime import date, timedelta
from app.core.database import get_db
from app.api.endpoints.gtfs import get_route_schedule, get_route_schedule_summary

async def test_schedule_endpoints():
    """Test the schedule API endpoints"""
    print("Testing Schedule API Endpoints")
    print("=" * 50)
    
    # Test date (today)
    test_date = date.today().strftime("%Y-%m-%d")
    test_route = "101"  # Golden Gate Transit route
    
    print(f"Testing route {test_route} on {test_date}")
    print("-" * 30)
    
    async for db in get_db():
        try:
            # Test schedule endpoint
            print("1. Testing get_route_schedule...")
            schedule_result = await get_route_schedule(test_route, test_date, db)
            
            print(f"   Route ID: {schedule_result.get('route_id')}")
            print(f"   Date: {schedule_result.get('date')}")
            print(f"   Day of week: {schedule_result.get('day_of_week')}")
            print(f"   Total trips: {schedule_result.get('total_trips', 0)}")
            print(f"   Active services: {len(schedule_result.get('active_services', []))}")
            
            if schedule_result.get('trips'):
                print(f"   Sample trip: {schedule_result['trips'][0].get('trip_id')}")
                if schedule_result['trips'][0].get('stops'):
                    print(f"   Stops in first trip: {len(schedule_result['trips'][0]['stops'])}")
            
            print("   ✅ Schedule endpoint working")
            
            # Test summary endpoint
            print("2. Testing get_route_schedule_summary...")
            summary_result = await get_route_schedule_summary(test_route, test_date, db)
            
            summary = summary_result.get('summary', {})
            print(f"   Total trips: {summary.get('total_trips', 0)}")
            print(f"   Direction 0 trips: {summary.get('direction_0_trips', 0)}")
            print(f"   Direction 1 trips: {summary.get('direction_1_trips', 0)}")
            print(f"   First departure: {summary.get('first_departure', 'N/A')}")
            print(f"   Last departure: {summary.get('last_departure', 'N/A')}")
            print(f"   Service span: {summary.get('service_span', 'N/A')}")
            
            print("   ✅ Summary endpoint working")
            
            # Test with different dates
            print("3. Testing different dates...")
            tomorrow = (date.today() + timedelta(days=1)).strftime("%Y-%m-%d")
            tomorrow_result = await get_route_schedule(test_route, tomorrow, db)
            print(f"   Tomorrow ({tomorrow}): {tomorrow_result.get('total_trips', 0)} trips")
            
            yesterday = (date.today() - timedelta(days=1)).strftime("%Y-%m-%d")
            yesterday_result = await get_route_schedule(test_route, yesterday, db)
            print(f"   Yesterday ({yesterday}): {yesterday_result.get('total_trips', 0)} trips")
            
            print("   ✅ Date range testing complete")
            
        except Exception as e:
            print(f"   ❌ Error: {e}")
            print(f"   Error type: {type(e).__name__}")
            
        finally:
            await db.close()
        break
    
    print("\n" + "=" * 50)
    print("Schedule API Test Complete!")

if __name__ == "__main__":
    asyncio.run(test_schedule_endpoints())
