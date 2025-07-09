# TransitPulse

A real-time transit monitoring and analytics platform.

## Prerequisites

- Windows 10/11
- PowerShell 5.1+
- Python 3.11+
- Node.js 16+
- PostgreSQL 15+
- Redis (optional, for real-time features)

## Quick Start

1. **Run the setup script (Admin PowerShell required)**
   ```powershell
   Set-ExecutionPolicy Bypass -Scope Process -Force
   .\setup.ps1
   ```
   This will:
   - Install PostgreSQL if needed
   - Set up the database
   - Configure Python environment
   - Install all dependencies

2. **Start the application**
   ```powershell
   .\start.ps1
   ```
   This will launch:
   - Backend: http://localhost:9000
   - Frontend: http://localhost:3002

## Project Structure

- `transitpulse-backend/` - FastAPI backend application
- `transitpulse-frontend/` - React frontend application
- `setup.ps1` - One-time setup script
- `start.ps1` - Application launcher

## Environment Variables

Backend looks for these environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection URL (optional)

Default values are set in `start.ps1`.

## Development

### Backend
```bash
cd transitpulse-backend
.venv\Scripts\Activate
uvicorn app.main:app --reload
```

### Frontend
```bash
cd transitpulse-frontend
npm run dev
```

## Troubleshooting

- **Port conflicts**: Ensure ports 9000 (backend) and 3002 (frontend) are available
- **Database issues**: Verify PostgreSQL is running and accessible
- **Missing dependencies**: Run `setup.ps1` to ensure all dependencies are installed

## License

MIT
