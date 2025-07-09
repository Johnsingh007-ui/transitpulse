# TransitPulse Backend

A real-time transit operations monitoring system backend, built with FastAPI and PostgreSQL.

## Features

- Real-time KPI monitoring for transit operations
- Vehicle tracking and management
- Trip performance metrics
- Integration with GTFS and GTFS-RT data feeds

## Tech Stack

- **API Framework**: FastAPI
- **Database**: PostgreSQL with TimescaleDB
- **Caching**: Redis
- **Task Queue**: Celery
- **Containerization**: Docker

## Getting Started

1. **Prerequisites**:
   - Docker and Docker Compose
   - Python 3.11+

2. **Environment Setup**:
   - Copy `.env.example` to `.env` and update the variables
   - Run `docker-compose up -d` to start the services

3. **API Documentation**:
   - Swagger UI: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

## Project Structure

```
transitpulse-backend/
├── app/                    # Application code
│   ├── api/                # API endpoints
│   ├── core/               # Core functionality
│   ├── crud/               # Database operations
│   ├── models/             # SQLAlchemy models
│   └── schemas/            # Pydantic models
├── data_ingestion/         # Data processing modules
├── .env                    # Environment variables
├── docker-compose.yml      # Docker Compose configuration
├── Dockerfile             # Docker configuration
└── requirements.txt       # Python dependencies
```

## License

This project is proprietary and confidential.
