# TransitPulse

A real-time transit monitoring and analytics platform for tracking and analyzing public transportation data using GTFS (General Transit Feed Specification) and GTFS-RT (Real-time) feeds.

**✅ Currently loaded with real Golden Gate Transit GTFS data!**

## Features

- 🚌 **Real GTFS Data**: Loaded with Golden Gate Transit routes and stops
- 📊 **Route Analytics**: View route statistics and network information  
- 🗺️ **Route Details**: Detailed route information with stop listings
- 🎨 **Modern UI**: Beautiful, responsive interface with route color coding
- ♿ **Accessibility**: Wheelchair accessibility indicators for stops
- 🔗 **External Links**: Direct links to official transit schedules

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
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will be available at: **http://localhost:8000**

### 3. Setup Frontend

```bash
cd transitpulse-frontend

# Install Node.js dependencies
npm install

# Start the development server
npm run dev
```

The frontend will be available at: **http://localhost:3002**

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
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

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
- Interactive API docs: http://localhost:8000/docs
- OpenAPI spec: http://localhost:8000/openapi.json
- Test endpoint: http://localhost:8000/api/v1/test

## GTFS Data Loading

To load GTFS static data into the database:

```bash
cd transitpulse-backend
python -m data_ingestion.gtfs_static_loader --gtfs-zip path/to/gtfs.zip
```

## Current Data

The application currently comes pre-loaded with real **Golden Gate Transit** GTFS data including:

- **12 bus routes** with complete route information
- **500+ stops** with GPS coordinates and accessibility data  
- **Route colors and branding** from the official Golden Gate Transit system
- **Direct links** to official schedules and route information
- **Wheelchair accessibility** indicators for all stops

### Sample Routes Available:
- Route 101: Santa Rosa - San Francisco
- Route 125: San Rafael - San Francisco  
- Route 580: San Rafael - Richmond
- And 9 more Golden Gate Transit routes

## API Endpoints

The backend provides several REST API endpoints:

- `GET /api/v1/routes` - List all available routes
- `GET /api/v1/routes/{route_id}` - Get detailed route information
- `GET /api/v1/stops?route_id={route_id}` - Get stops for a specific route
- `GET /api/v1/test` - Health check endpoint

## Troubleshooting

### Database Issues
- **Connection refused**: Ensure Docker is running and `docker-compose up -d` has been executed
- **Authentication failed**: Check the password in `transitpulse-backend/.env` matches `docker-compose.yml`
- **Tables not found**: Run `python init_db.py` to create database tables

### Backend Issues
- **Port 8000 in use**: Check if another process is using port 8000: `lsof -i :8000`
- **Import errors**: Ensure you're running from the `transitpulse-backend` directory
- **Database connection**: Verify PostgreSQL is running with `docker-compose ps`

### Frontend Issues
- **Port 3002 in use**: Vite will automatically use the next available port
- **API connection**: Ensure the backend is running at http://localhost:8000
- **Build errors**: Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- **HTTP 401 errors**: Check that the vite.config.ts proxy points to the correct backend port (8000)

### General
- **Docker issues**: Ensure Docker Desktop/Engine is running
- **Permission errors**: Make sure you have proper permissions for the workspace directory

## License

MIT
