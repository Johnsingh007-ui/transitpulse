# 🚦 TransitPulse 🚌

> Real-time transit tracking platform with accurate GTFS-RT integration and timezone-aware predictions

**TransitPulse** is a comprehensive transit monitoring system that provides real-time vehicle tracking, accurate arrival predictions, and performance analytics for public transportation agencies.

## 🚀 Quick Start

```bash
git clone https://github.com/Johnsingh007-ui/transitpulse.git
cd transitpulse
./start_transitpulse_production.sh
```

**Access Points:**
- 🌐 **Frontend**: http://localhost:3002
- 🔧 **Backend API**: http://localhost:9002
- 📚 **API Docs**: http://localhost:9002/docs

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
