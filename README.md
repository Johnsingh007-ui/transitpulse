# 🚦 TransitPulse 🚌

> Real-time transit tracking platform with accurate GTFS-RT integration and timezone-aware predictions

**TransitPulse** is a comprehensive transit monitoring system that provides real-time vehicle tracking, accurate arrival predictions, and performance analytics for public transportation agencies.

## 🚀 Quick Start

**One-Command Launch:**
```bash
git clone https://github.com/Johnsingh007-ui/transitpulse.git
cd transitpulse
./launch.sh
```

The universal launcher will:
- ✅ Start PostgreSQL database (Docker)
- ✅ Install Python and Node.js dependencies
- ✅ Initialize database with proper timing
- ✅ Launch backend API server
- ✅ Start frontend development server
- ✅ Verify all services are running

**Access Points:**
- 🌐 **Frontend**: http://localhost:3002
- 🔧 **Backend API**: http://localhost:9002
- 📚 **API Docs**: http://localhost:9002/docs

**Alternative Scripts:**
- `./dev_start.sh` - Quick development start
- `./setup_and_start.sh` - Full setup with database initialization

**⚠️ If launch.sh fails with HTTP 404/401 errors**, see the **🚨 RELIABLE STARTUP** section in Troubleshooting below for guaranteed working commands.

## 🎯 Project Data Policy

**⚠️ IMPORTANT: NO MOCK DATA OR TEST DATA**

This project is committed to using **REAL DATA ONLY**:

- ✅ **Real Transit Data**: Golden Gate Transit GTFS-RT feeds
- ✅ **Live API Integration**: 511 Bay Area API for traffic and trip updates
- ✅ **Actual Vehicle Positions**: Real-time tracking from transit agencies
- ✅ **Authentic Predictions**: Genuine arrival/departure times with real delays

**❌ NEVER ADD:**
- Mock data or dummy data in APIs
- Hardcoded sample responses
- Test data in production endpoints
- Fake vehicle positions or times
- Simulated delay calculations

**Why?** TransitPulse is designed to be a production-ready transit monitoring system. All features, calculations, and displays must reflect real-world transit operations to be valuable for actual transit agencies and passengers.

If real data is temporarily unavailable, the system should return appropriate error messages rather than fallback to mock data.

## ✨ Key Features

- **Real-time Vehicle Tracking** - Live positions and trip progress
- **Accurate Predictions** - Timezone-aware arrival/departure times
- **Delay Analysis** - Color-coded delay status with realistic calculations
- **Route Monitoring** - Complete trip details and stop sequences
- **Performance Metrics** - On-time performance and analytics
- **GTFS-RT Integration** - Direct Golden Gate Transit data feeds

## 🔧 Manual Setup (Development)

### Prerequisites
- Python 3.8+
- Node.js 16+
- PostgreSQL 12+

### Backend Setup
```bash
cd transitpulse-backend
pip install -r requirements.txt
python init_db.py
python -m uvicorn app.main:app --host 0.0.0.0 --port 9002 --reload
```

### Frontend Setup
```bash
cd transitpulse-frontend
npm install
npm run dev
```

## 📊 Data Sources (Golden Gate Transit)

- **GTFS Static**: Route schedules and stop information
- **Vehicle Positions**: Real-time vehicle locations and status
- **Trip Updates**: Live arrival/departure predictions with delays

## 🐛 Major Issues Resolved

### Issue #1: Massive Delay Calculations (25,000+ seconds)
**Problem**: System was showing unrealistic delays like 25,397 seconds instead of actual delays

**Root Cause**: 
- Manual delay calculations overriding GTFS-RT data
- Timezone conversion errors between UTC and Pacific Time
- Fallback logic interfering with real-time predictions

**Solution**:
- ✅ Use GTFS-RT delay values directly without recalculation
- ✅ Implemented proper UTC to Pacific timezone conversion using `pytz`
- ✅ Removed fallback calculation logic when real-time data exists
- ✅ Added `convert_gtfs_time_to_datetime()` helper with timezone awareness

**Result**: Now showing realistic delays like -28 seconds (28 seconds early)

### Issue #2: Incorrect Predicted Arrival Times
**Problem**: Predicted times showing as 21:47:32 vs scheduled 14:48:00 (7-hour difference)

**Root Cause**: 
- GTFS-RT timestamps are Unix timestamps in UTC
- System treating them as local time without timezone conversion
- No proper handling of GTFS time overflow (>24:00:00)

**Solution**:
- ✅ Enhanced timezone conversion in `convert_gtfs_time_to_datetime()`
- ✅ Added `compute_scheduled_datetime()` for GTFS time overflow handling
- ✅ Implemented pytz-based UTC to America/Los_Angeles conversion
- ✅ Proper Unix timestamp detection (values > 86400)

**Result**: Accurate predictions showing 14:47:32 vs scheduled 14:48:00

### Issue #3: Frontend HTTP 404 Errors
**Problem**: Frontend couldn't connect to backend API

**Root Cause**: 
- Proxy configuration issues in Vite
- Port conflicts between services
- npm dependency conflicts

**Solution**:
- ✅ Fixed Vite proxy configuration for backend API
- ✅ Standardized ports (Frontend: 3002, Backend: 9002)
- ✅ Used `npx vite` as fallback for npm issues
- ✅ Added proper error handling for API connectivity

**Result**: Seamless frontend-backend communication

## 🛠️ API Endpoints

### Vehicle & Trip Information
```bash
# Get active vehicles
GET /api/v1/trips/active-trips

# Get vehicle trip details with real-time updates
GET /api/v1/trips/vehicle-trip-details/{vehicle_id}

# Get optimized trip summary for frontend
GET /api/v1/trips/vehicle-trip-summary/{vehicle_id}

# Get detailed trip progress
GET /api/v1/trips/trip-progress/{trip_id}
```

### Real-time Data
```bash
# Test real-time predictions
curl "http://localhost:9002/api/v1/trips/vehicle-trip-details/1939"

# Get countdown timers and delay status
curl "http://localhost:9002/api/v1/trips/vehicle-trip-summary/1939"
```

## 📁 Project Structure

```
transitpulse/
├── transitpulse-backend/           # FastAPI backend
│   ├── app/
│   │   ├── api/endpoints/         # API routes
│   │   ├── models/                # Database models
│   │   ├── schemas/               # Pydantic schemas
│   │   └── utils/                 # Helper functions
│   ├── data_ingestion/            # GTFS processing
│   └── requirements.txt
├── transitpulse-frontend/          # React frontend
│   ├── src/
│   │   ├── components/            # UI components
│   │   ├── api/                   # API client
│   │   └── types/                 # TypeScript types
│   └── package.json
└── docker-compose.yml             # PostgreSQL setup
```

## 🔄 Data Pipeline

1. **GTFS Static Import** - Route and schedule data
2. **Real-time Vehicle Tracking** - Live positions every 30 seconds
3. **Trip Updates Processing** - Predictions and delays
4. **Timezone Conversion** - UTC to Pacific Time
5. **Frontend Display** - Real-time countdowns and status

## 🛠️ Troubleshooting

### Quick Service Status Check
```bash
./status.sh                    # Check all services
docker ps                     # Check database container
curl http://localhost:9002/health  # Test backend
```

### 🚨 RELIABLE STARTUP (If launch.sh fails)

**If you're getting HTTP 404/401 errors or services won't start**, use these **guaranteed working commands**:

#### Step 1: Kill Everything
```bash
pkill -f "python.*main.py"
pkill -f "vite"
pkill -f "http.server"
docker-compose down
```

#### Step 2: Start Backend (Reliable Method)
```bash
cd transitpulse-backend
PYTHONPATH=/workspaces/transitpulse/transitpulse-backend uvicorn app.main:app --host 0.0.0.0 --port 9002
```

#### Step 3: Start Frontend (Reliable Method)
```bash
cd transitpulse-frontend
chmod +x node_modules/vite/bin/vite.js
NODE_PATH=/workspaces/transitpulse/transitpulse-frontend/node_modules /workspaces/transitpulse/transitpulse-frontend/node_modules/vite/bin/vite.js --host 0.0.0.0 --port 3002
```

**✅ Success Indicators:**
- Backend: `INFO: Uvicorn running on http://0.0.0.0:9002`
- Frontend: `VITE v4.5.14 ready in XXXms`
- Both accessible: http://localhost:9002/docs and http://localhost:3002

### Common Issues

1. **Port conflicts**: If ports 3002 or 9002 are busy, stop other services first
2. **Database connection**: Wait for Docker container to fully start (may take 30+ seconds)
3. **Dependencies missing**: Run `./fix_requirements.sh` if packages are missing
4. **Permission denied**: Make scripts executable with `chmod +x *.sh`
5. **npm/vite issues**: Use the reliable frontend startup method above
6. **Python path issues**: Use PYTHONPATH environment variable as shown

### Clean Restart Protocol
```bash
# Full system reset
docker-compose down
pkill -f "python"
pkill -f "vite"
pkill -f "node"

# Wait 10 seconds, then restart
docker-compose up -d
# Wait for database to start, then use reliable startup commands above
```

### Environment Validation
```bash
# Verify tools are available
python --version    # Should be 3.8+
node --version      # Should be 16+
npm --version       # Should be 8+
docker --version    # Should be 20+
```

## 🎨 Color Coding System

- 🟢 **Green**: On-time (within 3 minutes)
- 🔵 **Blue**: Early (more than 3 minutes early)
- 🔴 **Red**: Delayed (more than 5 minutes late)
- ⚪ **Gray**: No real-time data available

## 📝 License

MIT License - See [LICENSE](LICENSE) for details

---

**Built with ❤️ for public transit agencies**

*Last updated: July 2025*
