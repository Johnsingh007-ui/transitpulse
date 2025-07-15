# TransitPulse 🚌

> **🎉 SYSTEM READY** - Real-time transit monitoring platform with live Golden Gate Transit data

A comprehensive real-time transit monitoring and analytics platform designed for **transit agencies** to track their own fleet operations, generate performance reports, and monitor service quality. Currently loaded with **Golden Gate Transit** real data with easy onboarding for additional agencies.

**✅ Currently loaded with real Golden Gate Transit GTFS data!**

## Prerequisites

### Dependencies
Before launching TransitPulse, ensure all dependencies are installed:

#### Python Dependencies
```bash
cd transitpulse-backend
pip install -r requirements.txt
```

#### Node.js Dependencies
```bash
cd transitpulse-frontend
npm install
```

### Environment Setup
Configure the backend environment variables:

1. Copy the example environment file:
   ```bash
   cd transitpulse-backend
   cp .env.example .env
   ```

2. Update the `.env` file with your configuration:
   - `DATABASE_URL`: URL for the PostgreSQL database
   - `DB_HOST`: Host for the database (default: `localhost`)
   - `DB_PORT`: Port for the database (default: `5432`)
   - `API_PORT`: Port for the backend API (default: `9002`)
   - `FRONTEND_PORT`: Port for the frontend (default: `3002`)

## 🚀 Steps to Launch the Project

### Production Setup (Recommended)
Run the automated production script:
```bash
git clone https://github.com/Johnsingh007-ui/transitpulse.git
cd transitpulse
./start_transitpulse_production.sh
```

### Development Setup
For development with manual control over each service:

1. **Start the database:**
   ```bash
   docker-compose up -d
   ```

2. **Initialize the database:**
   ```bash
   cd transitpulse-backend
   python init_db.py
   ```

3. **Load GTFS static data:**
   ```bash
   python -m data_ingestion.gtfs_static_loader
   ```

4. **Launch the backend API:**
   ```bash
   python -m uvicorn app.main:app --host 0.0.0.0 --port 9002 --reload
   ```

5. **Launch the frontend application:**
   ```bash
   cd transitpulse-frontend
   npm run dev -- --host 0.0.0.0 --port 3002
   ```

### Access Points
- **Frontend**: http://localhost:3002
- **Backend API**: http://localhost:9002
- **API Documentation**: http://localhost:9002/docs

### ✅ **Latest Startup Verification (July 14, 2025)**
- Successfully launched with all fixes applied
- Backend: FastAPI server running with uvicorn reload support ✅
- Frontend: Vite dev server with all dependencies resolved ✅  
- Database: PostgreSQL with Golden Gate Transit GTFS data ✅
- Real-time tracking: 28+ active vehicles being monitored ✅

## 📊 Current System Status
✅ **Fully Operational** (Last updated: July 14, 2025)
- 28 active vehicles tracked in real-time
- 12 GTFS routes available (101, 114, 130, 132, 150, 154, 164, 172, 172X, 580, 580X, 704)
- Real-time Golden Gate Transit data integration
- Route selection and vehicle status working correctly
- Production-ready with clean console output

## 🔧 Port Configuration
- **Frontend (React + Vite)**: Port 3002
- **Backend (FastAPI)**: Port 9002
- **Database (PostgreSQL)**: Port 5432

## ✨ Features for Transit Agencies

- 🚌 **Fleet Monitoring**: Real-time tracking of your agency's vehicles with live position updates
- 📋 **Collapsible Trip Details**: Expandable vehicle cards showing complete stop lists with scheduled vs actual arrival times
- 🚦 **Real-time Predictions**: Live arrival times with delay indicators using 511 Bay Area Trip Updates API
- 🔄 **Traffic-Aware Updates**: Real-time adjustments for delays and traffic conditions
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

**✅ LIVE SYSTEM - Fully Loaded with Golden Gate Transit:**

- **12 active bus routes** with complete route information and official branding
- **Complete GTFS dataset** with routes, stops, trips, and schedule information  
- **Official route colors and branding** from Golden Gate Transit system
- **Direct links** to official schedules and route information on goldengatetransit.org
- **Real-time vehicle integration** configured for live position tracking
- **Calendar-based scheduling** with date picker and multiple view modes
- **Performance analytics** and route statistics ready for agency monitoring

**🎨 Frontend Features Active:**
- **Route Management Dashboard** - Browse all routes with official colors
- **Enhanced Route Schedule Component** - Calendar interface with historical data analysis (starting from yesterday)
- **Live Operations Monitor** - Card-based vehicle display with expandable trip details **🆕**
- **Collapsible Trip Details** - Expandable vehicle cards showing complete stop schedules with real-time predictions **🆕**
- **Real-time Arrival Predictions** - Live stop-time predictions with delay indicators using 511 Bay Area API **🆕**
- **Traffic Condition Monitoring** - Real-time traffic impact display with color-coded delay indicators **🆕**
- **On-Time Performance Analysis** - Historical performance tracking with detailed trip-by-trip analysis
- **User-Friendly Date Selection** - Clear date formatting without confusing "Today/Tomorrow" labels
- **Direction Filtering** - View routes by Inbound/Outbound direction with visual indicators
- **Performance Stats** - Analytics for route efficiency and service quality with percentage breakdowns
- **Modern UI** - Responsive design with Golden Gate Transit branding and intuitive navigation

### Sample Routes Available:
- **Route 101**: Santa Rosa - San Francisco (Blue #3366FF)
- **Route 114**: Mill Valley - San Francisco (Red #CC3333)  
- **Route 130**: San Rafael - San Francisco (Blue #3366FF)
- **Route 132**: San Anselmo - San Francisco (Red #CC3333)
- **Route 150**: San Rafael - San Francisco (Blue #3366FF)
- **Route 154**: Novato - San Francisco (Red #CC3333)
- **Route 164**: Petaluma - San Francisco (Red #CC3333)  
- **Route 172**: Santa Rosa - San Francisco (Red #CC3333)
- **Route 172X**: Santa Rosa - San Francisco Express (Red #CC3333)
- **Route 580**: Del Norte BART - San Rafael (Blue #3366FF)
- **Route 580X**: Del Norte BART - San Rafael Express (Blue #3366FF)
- **Route 704**: Del Norte BART - San Francisco (Red #CC3333)

**All routes feature official Golden Gate Transit branding and colors**

## Current Status

**✅ FULLY LAUNCHED AND OPERATIONAL:**
- **Full Stack Running**: Database, Backend API (port 9002), and Frontend (port 3002) all active
- **Routes**: 12 Golden Gate Transit bus routes loaded with official colors and branding
- **Frontend Dashboard**: Modern React interface with route management and schedule features
- **API Endpoints**: All REST APIs functional and responsive at http://localhost:9002
- **Schedule Feature**: Enhanced calendar/schedule component with historical data analysis and user-friendly date selection
- **Route Management**: Full route listing with direction information and official GGT branding
- **Performance Analytics**: Route statistics and network performance metrics available

**🔄 Real-time Data Loading:**
- **Vehicle Positions**: Real-time vehicle feed integration configured and processing
- **GTFS Static**: 12 routes with complete schedule and stop information loaded
- **Live Updates**: 30-second refresh interval for vehicle position updates

**🎯 Ready for Agency Testing:**
- **Web Interface**: http://localhost:3002 - Complete dashboard for transit operations
- **Route Schedules**: Calendar-based schedule viewing with comparison modes
- **Multi-Agency Ready**: Easy onboarding process documented for new transit agencies
- **Performance Reports**: Analytics and KPI tracking for fleet operations

## API Endpoints

The backend provides several REST API endpoints:

- `GET /api/v1/routes` - List all available routes
- `GET /api/v1/routes/directions` - Get routes with direction information (Inbound/Outbound)
- `GET /api/v1/routes/directions?route_id={route_id}` - Get direction info for specific route
- `GET /api/v1/routes/{route_id}` - Get detailed route information
- `GET /api/v1/stops?route_id={route_id}` - Get stops for a specific route
- `GET /api/v1/vehicles/realtime` - Get live vehicle positions with direction information
- `GET /api/v1/vehicles/realtime?route_id={route_id}` - Filter vehicles by route
- `GET /api/v1/trips/{trip_id}/details-with-updates` - Get comprehensive trip details with real-time GTFS-RT predictions **🆕**
- `GET /api/v1/trips/vehicle/{vehicle_id}/details` - Get trip details for a specific vehicle with stop times **🆕**
- `GET /api/v1/traffic/conditions` - Get current traffic conditions and delays **🆕**
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

### Trip Updates ✅ **NOW IMPLEMENTED**
- **Source**: https://realtime.goldengate.org/gtfsrealtime/TripUpdates
- **Protocol**: GTFS-Realtime protobuf format
- **Integration**: 511 Bay Area API for enhanced real-time predictions
- **Features**: Stop-level arrival predictions with delay calculations
- **Status**: ✅ **Active - Real-time predictions displayed in collapsible trip details**

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

### Common Launch Issues

#### Port Conflicts
Check if required ports are already in use:
```bash
# Check specific ports
lsof -i :3002  # Frontend port
lsof -i :9002  # Backend port  
lsof -i :5432  # Database port
```

Stop conflicting processes:
```bash
# Kill process using specific port
lsof -ti:9002 | xargs kill -9
```

#### API Mapping Issues
- **Backend API not accessible**: Ensure the backend is running at http://localhost:9002
- **Test API endpoints manually**:
  ```bash
  curl http://localhost:9002/api/v1/test
  curl http://localhost:9002/api/v1/routes
  ```
- **Use Postman or similar tools** to test endpoints like `/api/v1/routes`

#### Missing Dependencies
If dependencies are missing, reinstall:
```bash
# Python dependencies
cd transitpulse-backend
pip install -r requirements.txt

# Node.js dependencies  
cd transitpulse-frontend
npm install
```

#### GTFS Data Issues
- **Data not pulling**: Verify GTFS feeds are accessible and check logs for errors during ingestion
- **Manual data reload**:
  ```bash
  cd transitpulse-backend
  python -m data_ingestion.gtfs_static_loader
  ```
- **Check database connection**:
  ```bash
  python test_db_connection.py
  ```

### Specific Error Fixes

#### ✅ Fixed: Uvicorn Reload Warning
**Issue**: Backend failed to start with warning about import strings.
**Solution**: Use proper import string format:
```python
uvicorn.run("app.main:app", host="0.0.0.0", port=9002, reload=True)
```

#### ✅ Fixed: Python Command Not Found  
**Issue**: System doesn't have `python` symlink.
**Solution**: Use `python3` explicitly in commands.

#### Database Connection Issues
- **Connection refused**: Ensure Docker is running and execute `docker-compose up -d`
- **Authentication failed**: Check password in `.env` matches `docker-compose.yml`
- **Tables not found**: Run `python init_db.py` to create database tables

#### Frontend Build Issues
- **Missing @chakra-ui/icons**: Fixed with `npm install @chakra-ui/icons`
- **Build errors**: Clear cache and reinstall:
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```
- **HTTP 401 errors**: Check `vite.config.ts` proxy points to correct backend port (9002)

## License

MIT
