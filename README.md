# TransitPulse

A real-time transit monitoring and analytics platform for tracking and analyzing public transportation data using GTFS (General Transit Feed Specification) and GTFS-RT (Real-time) feeds.

**✅ Currently loaded with real Golden Gate Transit GTFS data!**

## Features

- 🚌 **Real GTFS Data**: Loaded with Golden Gate Transit routes and stops
- 🧭 **Route Directions**: View routes by direction with headsigns and trip counts
- 📊 **Route Analytics**: View route statistics and network information  
- 🗺️ **Route Details**: Detailed route information with stop listings
- 🎨 **Modern UI**: Beautiful, responsive interface with route color coding
- ♿ **Accessibility**: Wheelchair accessibility indicators for stops
- 🔗 **External Links**: Direct links to official transit schedules
- 🔄 **Automatic Updates**: Daily GTFS static data updates from transit agency feeds
- 🚍 **Real-time Vehicles**: Live vehicle position tracking with direction information (every 30 seconds)
- 📡 **Multiple Agencies**: Support for Golden Gate Transit, Muni, and AC Transit
- 🔧 **Manual Updates**: Trigger immediate data updates via API

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
