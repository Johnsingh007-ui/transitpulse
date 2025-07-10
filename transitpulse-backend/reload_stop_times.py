#!/usr/bin/env python3
"""
Simple script to reload just the stop_times data with fixed time parsing.
"""
import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx
import zipfile
import io
import csv
from app.core.database import SessionLocal
from app.models.gtfs_static import GTFSStopTime
from data_ingestion.gtfs_static_loader import parse_gtfs_time, FIVE_ELEVEN_API_KEY, GGT_OPERATOR_ID

async def reload_stop_times():
    """Reload stop_times data with fixed parsing."""
    print("🚌 Reloading stop_times data...")
    
    # Download GTFS data
    url = f"http://api.511.org/transit/datafeeds?api_key={FIVE_ELEVEN_API_KEY}&operator_id={GGT_OPERATOR_ID}"
    print(f"Downloading GTFS data from {url}")
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.get(url)
        if response.status_code != 200:
            print(f"Failed to download: {response.status_code}")
            return False
    
    # Open ZIP file
    with zipfile.ZipFile(io.BytesIO(response.content)) as zip_file:
        print("Loading stop_times.txt...")
        
        async with SessionLocal() as db:
            with zip_file.open('stop_times.txt') as f:
                reader = csv.DictReader(io.TextIOWrapper(f, 'utf-8', errors='ignore'))
                
                batch_size = 1000
                batch = []
                total_processed = 0
                
                for row in reader:
                    # Parse and clean the row
                    cleaned_row = {}
                    for key, value in row.items():
                        cleaned_row[key] = value.strip() if value and value.strip() else None
                    
                    # Parse times with our fixed function
                    cleaned_row['stop_sequence'] = int(cleaned_row['stop_sequence']) if cleaned_row.get('stop_sequence') else None
                    cleaned_row['arrival_time'] = parse_gtfs_time(cleaned_row.get('arrival_time'))
                    cleaned_row['departure_time'] = parse_gtfs_time(cleaned_row.get('departure_time'))
                    cleaned_row['pickup_type'] = int(cleaned_row['pickup_type']) if cleaned_row.get('pickup_type') else None
                    cleaned_row['drop_off_type'] = int(cleaned_row['drop_off_type']) if cleaned_row.get('drop_off_type') else None
                    cleaned_row['shape_dist_traveled'] = float(cleaned_row['shape_dist_traveled']) if cleaned_row.get('shape_dist_traveled') else None
                    
                    # Only keep fields that exist in our model
                    model_fields = {
                        'trip_id', 'arrival_time', 'departure_time', 'stop_id', 
                        'stop_sequence', 'stop_headsign', 'pickup_type', 'drop_off_type', 
                        'shape_dist_traveled'
                    }
                    filtered_row = {k: v for k, v in cleaned_row.items() if k in model_fields}
                    
                    # Create model instance
                    stop_time = GTFSStopTime(**filtered_row)
                    batch.append(stop_time)
                    total_processed += 1
                    
                    # Insert in batches
                    if len(batch) >= batch_size:
                        db.add_all(batch)
                        await db.commit()
                        print(f"Processed {total_processed} stop_times...")
                        batch = []
                
                # Insert remaining batch
                if batch:
                    db.add_all(batch)
                    await db.commit()
                    
                print(f"✅ Successfully loaded {total_processed} stop_times records")
    
    return True

if __name__ == "__main__":
    success = asyncio.run(reload_stop_times())
    if success:
        print("✅ Stop times reloaded successfully!")
    else:
        print("❌ Failed to reload stop times")
        sys.exit(1)
