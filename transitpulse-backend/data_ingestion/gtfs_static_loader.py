import zipfile
import io
import csv
from datetime import datetime, time, date
from typing import List, Dict, Any, Optional

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from sqlalchemy.future import select

from app.core.database import SessionLocal, create_db_and_tables
from app.models.gtfs_static import (
    GTFSRoute, GTFSStop, GTFSShape, GTFSTrip,
    GTFSStopTime, GTFSCalendar, GTFSCalendarDate
)
from app.schemas.gtfs_static import (
    GTFSRouteBase, GTFSStopBase, GTFSShapeBase, GTFSTripBase,
    GTFSStopTimeBase, GTFSCalendarBase, GTFSCalendarDateBase
)

# --- Configuration ---
# Operator IDs for Golden Gate Transit and Ferry
GGT_OPERATOR_ID = "GG"  # Golden Gate Transit (bus) operator ID
GGF_OPERATOR_ID = "GF"  # Golden Gate Ferry operator ID
FIVE_ELEVEN_API_KEY = "b43cedb9-b614-4739-bb3a-e3c07f895fab"  # 511 API key

# URL for 511 MTC GTFS DataFeed Download API (for a specific operator_id)
GTFS_DATA_URL_TEMPLATE = "http://api.511.org/transit/datafeeds?api_key={api_key}&operator_id={operator_id}"

# --- Data Parsing and Loading Functions ---

async def _load_csv_to_db(
    db: AsyncSession,
    zip_file: zipfile.ZipFile,
    csv_filename: str,
    model_class,
    schema_class,
    primary_key_field: str = None  # Field to check for existing records (e.g., 'route_id' for GTFSRoute)
):
    print(f"Loading {csv_filename}...")
    try:
        with zip_file.open(csv_filename) as f:
            # Decode as UTF-8, ignore errors
            reader = csv.DictReader(io.TextIOWrapper(f, 'utf-8', errors='ignore'))
            rows_to_insert = []
            existing_records_count = 0
            total_records = 0

            for row in reader:
                total_records += 1
                # Clean up data: replace empty strings with None
                cleaned_row = {k: (v if v != '' else None) for k, v in row.items()}

                # Convert types as necessary for SQLAlchemy models
                if model_class == GTFSStop:
                    # Handle potential non-numeric values for lat/lon
                    try:
                        cleaned_row['stop_lat'] = float(cleaned_row['stop_lat']) if cleaned_row.get('stop_lat') else None
                        cleaned_row['stop_lon'] = float(cleaned_row['stop_lon']) if cleaned_row.get('stop_lon') else None
                    except (ValueError, TypeError):
                        print(f"Warning: Invalid lat/lon for stop {cleaned_row.get('stop_id')}")
                        continue  # Skip invalid stop

                if model_class == GTFSTrip:
                    cleaned_row['direction_id'] = int(cleaned_row['direction_id']) if cleaned_row.get('direction_id') else None
                    cleaned_row['wheelchair_accessible'] = int(cleaned_row['wheelchair_accessible']) if cleaned_row.get('wheelchair_accessible') else None
                    cleaned_row['bikes_allowed'] = int(cleaned_row['bikes_allowed']) if cleaned_row.get('bikes_allowed') else None

                if model_class == GTFSCalendar:
                    for day in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']:
                        cleaned_row[day] = int(cleaned_row[day]) if cleaned_row.get(day) else 0
                    cleaned_row['start_date'] = datetime.strptime(cleaned_row['start_date'], '%Y%m%d').date() if cleaned_row.get('start_date') else None
                    cleaned_row['end_date'] = datetime.strptime(cleaned_row['end_date'], '%Y%m%d').date() if cleaned_row.get('end_date') else None

                if model_class == GTFSStopTime:
                    cleaned_row['stop_sequence'] = int(cleaned_row['stop_sequence']) if cleaned_row.get('stop_sequence') else None
                    cleaned_row['arrival_time'] = (
                        datetime.strptime(cleaned_row['arrival_time'], '%H:%M:%S').time()
                        if cleaned_row.get('arrival_time') else None
                    )
                    cleaned_row['departure_time'] = (
                        datetime.strptime(cleaned_row['departure_time'], '%H:%M:%S').time()
                        if cleaned_row.get('departure_time') else None
                    )
                    cleaned_row['pickup_type'] = int(cleaned_row['pickup_type']) if cleaned_row.get('pickup_type') else None
                    cleaned_row['drop_off_type'] = int(cleaned_row['drop_off_type']) if cleaned_row.get('drop_off_type') else None
                    cleaned_row['shape_dist_traveled'] = float(cleaned_row['shape_dist_traveled']) if cleaned_row.get('shape_dist_traveled') else None

                if model_class == GTFSShape:
                    cleaned_row['shape_pt_lat'] = float(cleaned_row['shape_pt_lat']) if cleaned_row.get('shape_pt_lat') else None
                    cleaned_row['shape_pt_lon'] = float(cleaned_row['shape_pt_lon']) if cleaned_row.get('shape_pt_lon') else None
                    cleaned_row['shape_pt_sequence'] = int(cleaned_row['shape_pt_sequence']) if cleaned_row.get('shape_pt_sequence') else None
                    cleaned_row['shape_dist_traveled'] = float(cleaned_row['shape_dist_traveled']) if cleaned_row.get('shape_dist_traveled') else None

                if model_class == GTFSCalendarDate:
                    cleaned_row['date'] = datetime.strptime(cleaned_row['date'], '%Y%m%d').date() if cleaned_row.get('date') else None
                    cleaned_row['exception_type'] = int(cleaned_row['exception_type']) if cleaned_row.get('exception_type') else None

                try:
                    # Validate data with Pydantic schema
                    validated_data = schema_class(**cleaned_row)
                    rows_to_insert.append(validated_data.model_dump())  # Use model_dump() for Pydantic v2
                except Exception as e:
                    print(f"Schema validation error for row in {csv_filename}: {e} - Row: {cleaned_row}")
                    continue

                # Batch insert
                if len(rows_to_insert) >= 1000:  # Adjust batch size as needed
                    await db.execute(model_class.__table__.insert(), rows_to_insert)
                    rows_to_insert = []

            if rows_to_insert:  # Insert any remaining rows
                await db.execute(model_class.__table__.insert(), rows_to_insert)

        print(f"Finished loading {csv_filename}. Total records: {total_records}, Existing records skipped: {existing_records_count}")

    except KeyError as e:
        print(f"Warning: Expected column '{e}' not found in {csv_filename}. Skipping file.")
    except zipfile.BadZipFile:
        print(f"Error: {csv_filename} is not a valid file in the zip archive.")
    except Exception as e:
        print(f"Error processing {csv_filename}: {e}")


async def load_gtfs_static_data(operator_id: str, api_key: str):
    """
    Downloads GTFS static data for a given operator, parses it, and loads it into the database.
    """
    url = GTFS_DATA_URL_TEMPLATE.format(api_key=api_key, operator_id=operator_id)
    print(f"Attempting to download GTFS data for {operator_id} from {url}")

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, follow_redirects=True, timeout=30.0)  # Add timeout
            response.raise_for_status()  # Raise an exception for bad status codes

            # Check if the response is actually a ZIP file
            if 'content-type' not in response.headers or 'zip' not in response.headers['content-type']:
                print(f"Error: Expected ZIP file but received {response.headers.get('content-type')}. "
                      f"Content snippet: {response.text[:500]}...")
                # If it's not a zip, it might be an API error message
                if response.status_code == 401:
                    print("Authentication Error: Invalid API Key. Please check your API key.")
                elif response.status_code == 404:
                    print(f"Not Found: Operator ID '{operator_id}' might be incorrect or data not available.")
                return False  # Indicate failure

            zip_file_bytes = io.BytesIO(response.content)
            with zipfile.ZipFile(zip_file_bytes, 'r') as zf:
                print(f"Successfully downloaded and opened GTFS zip for {operator_id}.")

                async with SessionLocal() as db:
                    # Order of loading matters due to foreign key relationships in real GTFS data
                    # though our models don't enforce them with SQLAlchemy directly, it's good practice.
                    await _load_csv_to_db(db, zf, 'routes.txt', GTFSRoute, GTFSRouteBase)
                    await _load_csv_to_db(db, zf, 'stops.txt', GTFSStop, GTFSStopBase)
                    await _load_csv_to_db(db, zf, 'shapes.txt', GTFSShape, GTFSShapeBase)
                    await _load_csv_to_db(db, zf, 'trips.txt', GTFSTrip, GTFSTripBase)
                    await _load_csv_to_db(db, zf, 'stop_times.txt', GTFSStopTime, GTFSStopTimeBase)
                    await _load_csv_to_db(db, zf, 'calendar.txt', GTFSCalendar, GTFSCalendarBase)
                    # calendar_dates.txt is optional, check if it exists
                    if 'calendar_dates.txt' in zf.namelist():
                        await _load_csv_to_db(db, zf, 'calendar_dates.txt', GTFSCalendarDate, GTFSCalendarDateBase)
                    else:
                        print("calendar_dates.txt not found in zip, skipping.")

                    await db.commit()
                    print(f"GTFS static data for {operator_id} loaded successfully.")
                    return True
        except httpx.HTTPStatusError as e:
            print(f"HTTP error occurred during download for {operator_id}: {e.response.status_code} - {e.response.text}")
            if e.response.status_code == 401:
                print("Authentication Error: Invalid API Key. Please check your API key.")
            elif e.response.status_code == 404:
                print(f"Not Found: Operator ID '{operator_id}' might be incorrect or data not available.")
            return False
        except httpx.RequestError as e:
            print(f"Network error during download for {operator_id}: {e}")
            return False
        except zipfile.BadZipFile as e:
            print(f"Downloaded file is not a valid ZIP archive for {operator_id}: {e}")
            return False
        except Exception as e:
            print(f"An unexpected error occurred while loading GTFS data for {operator_id}: {e}")
            return False

if __name__ == "__main__":
    import asyncio
    print("Starting GTFS static data loading process...")
    
    # Load Golden Gate Transit (Bus) data
    success_ggt = asyncio.run(load_gtfs_static_data(GGT_OPERATOR_ID, FIVE_ELEVEN_API_KEY))
    if success_ggt:
        print(f"Successfully loaded static GTFS for {GGT_OPERATOR_ID}.")
    else:
        print(f"Failed to load static GTFS for {GGT_OPERATOR_ID}. Check logs for details.")

    # Note: Ferry data loading is commented out by default
    # Uncomment the following lines if you want to load ferry data as well
    # print("\n--- Loading Golden Gate Ferry Data ---")
    # success_ggf = asyncio.run(load_gtfs_static_data(GGF_OPERATOR_ID, FIVE_ELEVEN_API_KEY))
    # if success_ggf:
    #     print(f"Successfully loaded static GTFS for {GGF_OPERATOR_ID}.")
    # else:
    #     print(f"Failed to load static GTFS for {GGF_OPERATOR_ID}. Check logs for details.")

    print("GTFS static data loading process finished.")