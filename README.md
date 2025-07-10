# TransitPulse 🚌

A real-time transit monitoring and analytics platform designed for **transit agencies** to track their own fleet operations, generate performance reports, and monitor service quality. Currently focused on **Golden Gate Transit** with easy onboarding for additional agencies.

**✅ Currently loaded with real Golden Gate Transit GTFS data!**

## ✨ Features for Transit Agencies

- 🚌 **Fleet Monitoring**: Real-time tracking of your agency's vehicles with live position updates
- 🧭 **Route Management**: View routes by direction with headsigns and trip counts
- 📊 **Performance Analytics**: Route statistics and network performance metrics for your agency  
- 🗺️ **Route Details**: Detailed route information with stop listings and service patterns
- 🎨 **Modern Dashboard**: Beautiful, responsive interface with your agency's route color coding
- ♿ **Accessibility Tracking**: Monitor wheelchair accessibility across your fleet and stops
- 🔗 **Integration Ready**: Direct links to your official transit schedules and external systems
- 🔄 **Automatic Updates**: Daily GTFS static data updates from your agency's feeds
- 🚍 **Real-time Fleet**: Live vehicle position tracking with direction information (30-second updates)
- 📡 **Multi-Agency Support**: Currently Golden Gate Transit, with easy onboarding for new agencies
- 🔧 **On-Demand Updates**: Trigger immediate data updates via API for schedule changes
- 📈 **Agency Reports**: Generate performance reports and analytics for your operations

## Prerequisites

- Docker and Docker Compose
- Python 3.11+
- Node.js 18+
- Git

## Quick Start

### 1. Clone and Setup Database

```bash
# Start PostgreSQL database using Docker Compose
docker-compose up -d

# Wait a few seconds for the database to be ready
```

### 2. Setup Backend

```bash
cd transitpulse-backend

# Install Python dependencies
pip install -r requirements.txt

# Initialize database tables
python init_db.py

# Load sample GTFS data (Golden Gate Transit already loaded)
python -m data_ingestion.gtfs_static_loader --gtfs-zip path/to/gtfs.zip

# Start the FastAPI backend
python main.py
# OR alternatively:
# python -m uvicorn app.main:app --host 0.0.0.0 --port 9002 --reload
```

The backend will be available at: **http://localhost:9002**

### 3. Setup Frontend

```bash
cd transitpulse-frontend

# Install Node.js dependencies
npm install

# Start the development server
npm run dev
```

The frontend will be available at: **http://localhost:3002**

**Note**: The frontend is configured to proxy API requests to the backend at port 9002.

## 🌐 Access Information

Once both services are running:

- **Frontend (Web Interface)**: http://localhost:3002
- **Backend API**: http://localhost:9002  
- **API Documentation**: http://localhost:9002/docs
- **PostgreSQL Database**: localhost:5432 (via Docker)

> **For Agencies**: The web interface at port 3002 is your main dashboard for monitoring your transit operations, generating reports, and viewing real-time vehicle positions.

## Project Structure

```
transitpulse/
├── docker-compose.yml              # PostgreSQL database service
├── transitpulse-backend/           # FastAPI backend application
│   ├── app/                        # Main application package
│   │   ├── api/endpoints/          # API route handlers
│   │   ├── core/                   # Core configuration and database
│   │   ├── crud/                   # Database operations
│   │   ├── models/                 # SQLAlchemy models
│   │   ├── schemas/                # Pydantic schemas
│   │   ├── utils/                  # Utility functions
│   │   └── websocket/              # WebSocket management
│   ├── data_ingestion/             # GTFS data processing
│   ├── scripts/                    # Database initialization scripts
│   ├── requirements.txt            # Python dependencies
│   ├── main.py                     # Application entry point
│   └── .env                        # Environment variables
└── transitpulse-frontend/          # React frontend application
    ├── src/
    │   ├── api/                    # API client and types
    │   ├── components/             # React components
    │   ├── hooks/                  # Custom React hooks
    │   └── types/                  # TypeScript type definitions
    ├── package.json                # Node.js dependencies
    └── vite.config.ts              # Vite configuration
```

## Environment Variables

The backend uses the following environment variables (configured in `transitpulse-backend/.env`):

- `DATABASE_URL`: PostgreSQL connection string
- `DB_HOST`: Database host (default: localhost)
- `DB_PORT`: Database port (default: 5432)
- `DB_NAME`: Database name (default: transitpulse)
- `DB_USER`: Database user (default: postgres)
- `DB_PASSWORD`: Database password (default: your_password_here)

## Development

### Database Management

```bash
# Start the database
docker-compose up -d

# Stop the database
docker-compose down

# View database logs
docker-compose logs postgres

# Reset database (WARNING: This will delete all data)
docker-compose down -v
docker-compose up -d
cd transitpulse-backend && python init_db.py
```

### Backend Development

```bash
cd transitpulse-backend

# Start with auto-reload for development
python -m uvicorn app.main:app --host 0.0.0.0 --port 9002 --reload

# Run database initialization
python init_db.py

# Load GTFS data
python -m data_ingestion.gtfs_static_loader --gtfs-zip path/to/gtfs.zip

# Check database connection
python test_db_connection.py

# Test API endpoints
python test_api.py
```

### Frontend Development

```bash
cd transitpulse-frontend

# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### API Documentation

When the backend is running, you can access:
- Interactive API docs: http://localhost:9002/docs
- OpenAPI spec: http://localhost:9002/openapi.json
- Test endpoint: http://localhost:9002/api/v1/test

## GTFS Data Loading

To load GTFS static data into the database:

```bash
cd transitpulse-backend
python -m data_ingestion.gtfs_static_loader --gtfs-zip path/to/gtfs.zip
```

## Current Data

The application currently comes pre-loaded with real **Golden Gate Transit** GTFS data including:

- **25 bus routes** with complete route information and official branding
- **437 stops** with GPS coordinates and accessibility data  
- **Route colors and branding** from the official Golden Gate Transit system
- **Direct links** to official schedules and route information
- **Wheelchair accessibility** indicators for all stops
- **🔴 LIVE: 24+ vehicles** currently tracked in real-time via official feeds
- **Stop schedules** available for select routes (more being loaded)

### Sample Routes Available:
- Route 101: Santa Rosa - San Francisco (5 live vehicles)
- Route 130: San Rafael - San Francisco (4 live vehicles)
- Route 150: San Rafael - San Francisco (2 live vehicles, 52 stops)
- Route 580: Del Norte BART - San Rafael (1 live vehicle, 31 stops)
- Route 154: Novato - San Francisco
- Route 164: Petaluma - San Francisco  
- Route 172: Santa Rosa - San Francisco
- And 18 more Golden Gate Transit routes with live tracking

## Current Status

**✅ Fully Operational:**
- **Routes**: 25 Golden Gate Transit bus routes loaded with official colors and branding
- **Real-time Vehicles**: 24 active vehicles with live GPS tracking (updated every 30 seconds)
- **API Endpoints**: All REST APIs functional and responsive
- **Vehicle Tracking**: Live positions for routes 101, 130, 150, 580, 23, 36, 71, 35, etc.

**🔄 Partially Working:**
- **Stop Schedules**: Available for some routes (e.g., Route 580: 31 stops, Route 150: 52 stops)
- **Trip Data**: 582 trips loaded, some routes need stop schedule completion

**🎯 Next Steps:**
- Complete stop schedule data loading for all routes
- Add trip update feeds for arrival predictions

## API Endpoints

The backend provides several REST API endpoints:

- `GET /api/v1/routes` - List all available routes
- `GET /api/v1/routes/directions` - Get routes with direction information (Inbound/Outbound)
- `GET /api/v1/routes/directions?route_id={route_id}` - Get direction info for specific route
- `GET /api/v1/routes/{route_id}` - Get detailed route information
- `GET /api/v1/stops?route_id={route_id}` - Get stops for a specific route
- `GET /api/v1/vehicles/realtime` - Get live vehicle positions with direction information
- `GET /api/v1/vehicles/realtime?route_id={route_id}` - Filter vehicles by route
- `POST /api/v1/data/update-static` - Trigger manual GTFS data update
- `GET /api/v1/data/status` - Get current data update status
- `GET /api/v1/test` - Health check endpoint
- `GET /api/v1/debug/trips` - Debug endpoint for trip data inspection

## Automated Data Updates

TransitPulse automatically fetches fresh data from official transit agency feeds:

### GTFS Static Data
- **Frequency**: Daily updates
- **Source**: https://realtime.goldengate.org/gtfsstatic/GTFSTransitData.zip
- **Golden Gate Transit**: Official GTFS static feed
- **Trigger**: `POST /api/v1/data/update-static?agency=golden_gate`

### Real-time Vehicle Positions  
- **Frequency**: Every 30 seconds
- **Source**: https://realtime.goldengate.org/gtfsrealtime/VehiclePositions
- **Protocol**: GTFS-Realtime protobuf format
- **Status**: ✅ **24 active vehicles currently tracked**
- **Endpoint**: `GET /api/v1/vehicles/realtime?route_id=101`

### Trip Updates (Future Release)
- **Source**: https://realtime.goldengate.org/gtfsrealtime/TripUpdates
- **Protocol**: GTFS-Realtime protobuf format

### Supported Transit Agencies
- **Golden Gate Transit** (GG) - Bus routes connecting Marin and Sonoma counties
  - Static: https://realtime.goldengate.org/gtfsstatic/GTFSTransitData.zip
  - Vehicles: https://realtime.goldengate.org/gtfsrealtime/VehiclePositions
  - Trip Updates: https://realtime.goldengate.org/gtfsrealtime/TripUpdates
- **San Francisco Muni** (SF) - San Francisco city transit (planned)
- **AC Transit** (AC) - Alameda and Contra Costa county buses (planned)

The system automatically handles data validation, deduplication, and database updates without manual intervention.

## Onboarding New Transit Agencies

TransitPulse is designed to support multiple transit agencies. While currently focused on **Golden Gate Transit**, you can easily add new agencies by configuring their GTFS feeds in the following locations:

### 📋 Agency Onboarding Checklist

When adding a new transit agency, you need to configure three types of feeds:

1. **GTFS Static Feed** (routes, stops, schedules)
2. **Vehicle Positions Feed** (real-time vehicle locations)  
3. **Trip Updates Feed** (arrival predictions)

### 🔧 Configuration File Locations

#### 1. GTFS Static Feed URLs
**File**: `transitpulse-backend/data_ingestion/gtfs_static_loader.py`

Add your agency's static GTFS feed URL to the agency configuration:

```python
# Around line 20-30, add to the agency_feeds dictionary:
agency_feeds = {
    'golden_gate': 'https://realtime.goldengate.org/gtfsstatic/GTFSTransitData.zip',
    'muni': 'https://gtfs.sfmta.com/transitdata/google_transit.zip',  # Example
    'ac_transit': 'https://gtfs.actransit.org/gtfs/google_transit.zip',  # Example
    'your_agency': 'https://your-agency.com/gtfs/gtfs.zip'  # Add your agency here
}
```

#### 2. Auto-Update Configuration
**File**: `transitpulse-backend/data_ingestion/auto_gtfs_updater.py`

Add your agency to the auto-update scheduler:

```python
# Around line 15-25, add to the AGENCY_URLS dictionary:
AGENCY_URLS = {
    'golden_gate': 'https://realtime.goldengate.org/gtfsstatic/GTFSTransitData.zip',
    'your_agency': 'https://your-agency.com/gtfs/gtfs.zip'  # Add here
}
```

#### 3. Real-time Vehicle Positions
**File**: `transitpulse-backend/data_ingestion/gtfs_rt_processor.py`

Configure the vehicle positions feed URL:

```python
# Around line 10-20, add to vehicle_feeds:
vehicle_feeds = {
    'golden_gate': 'https://realtime.goldengate.org/gtfsrealtime/VehiclePositions',
    'your_agency': 'https://your-agency.com/gtfs-realtime/vehicle-positions'  # Add here
}
```

#### 4. Real-time Trip Updates
**File**: `transitpulse-backend/data_ingestion/gtfsrt_ingestor.py`

Add trip updates feed for arrival predictions:

```python
# Around line 15-25, add to trip_update_feeds:
trip_update_feeds = {
    'golden_gate': 'https://realtime.goldengate.org/gtfsrealtime/TripUpdates',
    'your_agency': 'https://your-agency.com/gtfs-realtime/trip-updates'  # Add here
}
```

#### 5. Backend API Configuration
**File**: `transitpulse-backend/app/api/endpoints/gtfs.py`

Add agency support to API endpoints:

```python
# Around line 200-210, add to supported agencies:
@router.post("/data/update-static")
async def update_static_data(agency: str = "golden_gate"):
    """
    Supported agencies:
    - golden_gate: Golden Gate Transit
    - your_agency: Your Agency Name  # Add here
    """
```

#### 6. Database Models (if needed)
**File**: `transitpulse-backend/app/models/gtfs_static.py`

Ensure agency_id support is enabled in your models:

```python
# Verify agency_id field exists in relevant models:
class Routes(Base):
    # ...existing code...
    agency_id: Mapped[Optional[str]] = mapped_column(String(255))
```

#### 7. Frontend API Client
**File**: `transitpulse-frontend/src/api/apiClient.ts`

Add agency parameter support to API calls:

```typescript
// Add agency parameter to data update calls:
export const updateStaticData = async (agency: string = 'golden_gate') => {
  return api.post(`/data/update-static?agency=${agency}`);
};
```

#### 8. Environment Variables
**File**: `transitpulse-backend/.env`

Add any agency-specific API keys or tokens:

```env
# Golden Gate Transit (current)
GOLDEN_GATE_API_KEY=your_api_key_here

# Add new agency credentials as needed:
YOUR_AGENCY_API_KEY=your_agency_api_key
YOUR_AGENCY_TOKEN=your_agency_token
```

### 🚀 Testing New Agency Integration

After configuring the files above:

1. **Load Static Data**:
   ```bash
   cd transitpulse-backend
   python -m data_ingestion.gtfs_static_loader --agency your_agency
   ```

2. **Test Vehicle Feed**:
   ```bash
   python -m data_ingestion.gtfs_rt_processor --agency your_agency
   ```

3. **Verify API Endpoints**:
   ```bash
   curl "http://localhost:9002/api/v1/routes?agency=your_agency"
   curl "http://localhost:9002/api/v1/vehicles/realtime?agency=your_agency"
   ```

4. **Enable Auto-Updates**:
   ```bash
   python -m data_ingestion.auto_gtfs_updater --agency your_agency
   ```

### 📝 Agency-Specific Notes

- **Feed Format**: Ensure GTFS feeds follow the [GTFS specification](https://gtfs.org/schedule/reference/)
- **Real-time Format**: Vehicle and trip feeds should use [GTFS-Realtime](https://gtfs.org/realtime/reference/) protobuf format
- **Authentication**: Some agencies require API keys - add them to `.env` file
- **Update Frequency**: Configure appropriate update intervals (daily for static, 30s for real-time)
- **Agency Colors**: Route colors will be automatically imported from the GTFS `routes.txt` file

### 🎯 Current Focus: Golden Gate Transit

**Currently Active Configuration:**
- **Agency**: Golden Gate Transit (Marin/Sonoma County Bus Service)
- **Static Feed**: https://realtime.goldengate.org/gtfsstatic/GTFSTransitData.zip
- **Vehicle Positions**: https://realtime.goldengate.org/gtfsrealtime/VehiclePositions  
- **Trip Updates**: https://realtime.goldengate.org/gtfsrealtime/TripUpdates
- **Routes**: 25 bus routes with live tracking
- **Vehicles**: 24+ vehicles currently tracked in real-time

---

## Troubleshooting

### Database Issues
- **Connection refused**: Ensure Docker is running and `docker-compose up -d` has been executed
- **Authentication failed**: Check the password in `transitpulse-backend/.env` matches `docker-compose.yml`
- **Tables not found**: Run `python init_db.py` to create database tables

### Backend Issues
- **Port 9002 in use**: Check if another process is using port 9002: `lsof -i :9002`
- **Import errors**: Ensure you're running from the `transitpulse-backend` directory
- **Database connection**: Verify PostgreSQL is running with `docker-compose ps`

### Frontend Issues
- **Port 3002 in use**: Vite will automatically use the next available port
- **API connection**: Ensure the backend is running at http://localhost:9002
- **Build errors**: Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- **HTTP 401 errors**: Check that the vite.config.ts proxy points to the correct backend port (9002)

### General
- **Docker issues**: Ensure Docker Desktop/Engine is running
- **Permission errors**: Make sure you have proper permissions for the workspace directory

## License

MIT
