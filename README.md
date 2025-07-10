# TransitPulse

A real-time transit monitoring and analytics platform for tracking and analyzing public transportation data using GTFS (General Transit Feed Specification) and GTFS-RT (Real-time) feeds.

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

# Start the FastAPI backend
python main.py
```

The backend will be available at: http://localhost:9000

### 3. Setup Frontend

```bash
cd transitpulse-frontend

# Install Node.js dependencies
npm install

# Start the development server
npm run dev
```

The frontend will be available at: http://localhost:5173

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
python main.py

# Run database initialization
python init_db.py

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
- Interactive API docs: http://localhost:9000/docs
- OpenAPI spec: http://localhost:9000/openapi.json

## GTFS Data Loading

To load GTFS static data into the database:

```bash
cd transitpulse-backend
python -m data_ingestion.gtfs_static_loader --gtfs-zip path/to/gtfs.zip
```

## Troubleshooting

### Database Issues
- **Connection refused**: Ensure Docker is running and `docker-compose up -d` has been executed
- **Authentication failed**: Check the password in `transitpulse-backend/.env` matches `docker-compose.yml`
- **Tables not found**: Run `python init_db.py` to create database tables

### Backend Issues
- **Port 9000 in use**: Check if another process is using port 9000
- **Import errors**: Ensure you're running from the `transitpulse-backend` directory
- **Database connection**: Verify PostgreSQL is running with `docker-compose ps`

### Frontend Issues
- **Port 5173 in use**: Vite will automatically use the next available port
- **API connection**: Ensure the backend is running at http://localhost:9000
- **Build errors**: Clear node_modules and reinstall: `rm -rf node_modules && npm install`

### General
- **Docker issues**: Ensure Docker Desktop/Engine is running
- **Permission errors**: Make sure you have proper permissions for the workspace directory

## License

MIT
