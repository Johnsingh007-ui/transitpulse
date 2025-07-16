#!/usr/bin/env python3

import asyncio
import sys
import traceback

try:
    from data_ingestion.gtfs_trip_updates_processor import fetch_and_process_trip_updates
    print('Import successful')
    
    async def test_trip_updates():
        print('Testing real-time trip updates fetch...')
        success = await fetch_and_process_trip_updates()
        print(f'Trip updates fetch successful: {success}')

    asyncio.run(test_trip_updates())

except Exception as e:
    print(f'Error: {e}')
    traceback.print_exc()
    sys.exit(1)
