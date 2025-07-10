#!/usr/bin/env python3
"""
Simple script to load GTFS data.
"""
import asyncio
import httpx
import zipfile
import io
import csv
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import SessionLocal
from app.models.gtfs_static import GTFSRoute, GTFSStop, GTFSTrip, GTFSShape, GTFSStopTime

async def load_gtfs_data():
    """Load GTFS data from 511.org API"""
    print("Starting GTFS data loading...")
    
    # Golden Gate Transit operator ID and API key
    operator_id = "GG"
    api_key = "b43cedb9-b614-4739-bb3a-e3c07f895fab"
    
    # Download GTFS data
    url = f"http://api.511.org/transit/datafeeds?api_key={api_key}&operator_id={operator_id}"
    print(f"Downloading GTFS data from: {url}")
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            print(f"Downloaded {len(response.content)} bytes")
            
            # Extract ZIP file
            with zipfile.ZipFile(io.BytesIO(response.content)) as zip_file:
                print("ZIP file contents:", zip_file.namelist())
                
                # Load data into database
                async with SessionLocal() as db:
                    await load_routes(db, zip_file)
                    await load_stops(db, zip_file)
                    await db.commit()
                    print("Data loaded successfully!")
                    
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

async def load_routes(db: AsyncSession, zip_file: zipfile.ZipFile):
    """Load routes from routes.txt"""
    try:
        with zip_file.open('routes.txt') as f:
            reader = csv.DictReader(io.TextIOWrapper(f, 'utf-8', errors='ignore'))
            count = 0
            for row in reader:
                route = GTFSRoute(
                    route_id=row.get('route_id'),
                    agency_id=row.get('agency_id'),
                    route_short_name=row.get('route_short_name'),
                    route_long_name=row.get('route_long_name'),
                    route_desc=row.get('route_desc'),
                    route_type=int(row.get('route_type', 0)),
                    route_url=row.get('route_url'),
                    route_color=row.get('route_color'),
                    route_text_color=row.get('route_text_color')
                )
                db.add(route)
                count += 1
            print(f"Loaded {count} routes")
    except Exception as e:
        print(f"Error loading routes: {e}")

async def load_stops(db: AsyncSession, zip_file: zipfile.ZipFile):
    """Load stops from stops.txt"""
    try:
        with zip_file.open('stops.txt') as f:
            reader = csv.DictReader(io.TextIOWrapper(f, 'utf-8', errors='ignore'))
            count = 0
            for row in reader:
                stop = GTFSStop(
                    stop_id=row.get('stop_id'),
                    stop_code=row.get('stop_code'),
                    stop_name=row.get('stop_name'),
                    stop_desc=row.get('stop_desc'),
                    stop_lat=float(row.get('stop_lat', 0)),
                    stop_lon=float(row.get('stop_lon', 0)),
                    zone_id=row.get('zone_id'),
                    stop_url=row.get('stop_url'),
                    location_type=int(row.get('location_type', 0)),
                    parent_station=row.get('parent_station'),
                    wheelchair_boarding=int(row.get('wheelchair_boarding', 0))
                )
                db.add(stop)
                count += 1
            print(f"Loaded {count} stops")
    except Exception as e:
        print(f"Error loading stops: {e}")

if __name__ == "__main__":
    asyncio.run(load_gtfs_data())
