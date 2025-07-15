# 📋 CHANGELOG

All notable changes and issue resolutions for TransitPulse.

## [2.0.0] - 2025-07-15

### 🐛 Critical Fixes

#### Fixed Massive Delay Calculation Errors
- **Issue**: System showing unrealistic delays (25,397 seconds vs actual delays)
- **Files Modified**: `transitpulse-backend/app/api/endpoints/trips.py`
- **Changes**:
  - Removed manual delay calculations that override GTFS-RT data
  - Use GTFS-RT delay values directly from `stop_time_updates`
  - Eliminated fallback prediction logic when real-time data exists
  - Added proper debug logging for delay verification
- **Result**: Now shows realistic delays like -28 seconds (28 seconds early)

#### Fixed Timezone Conversion Issues
- **Issue**: Predicted times showing wrong timezone (21:47:32 vs 14:48:00)
- **Files Modified**: `transitpulse-backend/app/api/endpoints/trips.py`
- **Changes**:
  - Enhanced `convert_gtfs_time_to_datetime()` with proper timezone handling
  - Added `pytz` library for UTC to America/Los_Angeles conversion
  - Implemented Unix timestamp detection (values > 86400)
  - Added proper GTFS time overflow handling for times > 24:00:00
- **Result**: Accurate predictions showing 14:47:32 vs scheduled 14:48:00

#### Fixed Frontend-Backend Communication
- **Issue**: Frontend HTTP 404 errors when connecting to backend
- **Files Modified**: `transitpulse-frontend/vite.config.ts`, proxy settings
- **Changes**:
  - Fixed Vite proxy configuration for backend API
  - Standardized ports (Frontend: 3002, Backend: 9002)
  - Added fallback to `npx vite` for npm conflicts
  - Improved error handling for API connectivity
- **Result**: Seamless communication between frontend and backend

### ✨ New Features

#### Enhanced Trip Endpoints
- Added `vehicle-trip-summary` endpoint for frontend optimization
- Implemented color-coded delay status system
- Added countdown timers for upcoming stops
- Enhanced real-time data processing with timezone awareness

#### Improved Data Processing
- Added `compute_scheduled_datetime()` helper for GTFS time handling
- Enhanced error handling and fallback mechanisms
- Improved logging for debugging real-time data issues
- Added frontend-optimized response formats

### 🧹 Code Cleanup

#### Removed Test and Backup Files
- Removed `transitpulse-backend/test_gtfs_rt.py`
- Removed `transitpulse-frontend/src/App.tsx.backup`
- Removed `transitpulse-frontend/src/components/MapView.tsx.backup`
- Cleaned up development artifacts

#### Updated Documentation
- Complete README.md rewrite with issue resolution documentation
- Added detailed API endpoint documentation
- Included troubleshooting guide for common issues
- Added color coding system documentation

### 🔧 Technical Improvements

#### Backend Enhancements
- Enhanced GTFS-RT data processing pipeline
- Improved timezone handling with pytz library
- Better error handling for real-time data timeouts
- Optimized database queries for vehicle tracking

#### Frontend Optimizations
- Improved real-time data display with accurate countdowns
- Enhanced color coding for delay status visualization
- Better error handling for API connectivity
- Optimized rendering for real-time updates

### 📊 Data Pipeline Improvements

#### GTFS-RT Integration
- Direct use of GTFS-RT delay values without modification
- Proper handling of Unix timestamps in UTC
- Enhanced trip updates processing with timezone conversion
- Improved vehicle position tracking accuracy

#### Real-time Predictions
- Timezone-aware arrival/departure time calculations
- Accurate countdown timers for upcoming stops
- Color-coded delay status (Green/Blue/Red/Gray)
- Enhanced prediction accuracy with proper data handling

## [1.0.0] - 2025-07-01

### 🎉 Initial Release
- Basic GTFS-RT integration with Golden Gate Transit
- Real-time vehicle tracking system
- Frontend dashboard with React and Vite
- FastAPI backend with PostgreSQL database
- Docker-based development environment

---

## Development Notes

### Known Issues Resolved
1. **Timezone Conversion**: All times now properly converted from UTC to Pacific
2. **Delay Calculations**: Using GTFS-RT values directly instead of manual calculations
3. **Frontend Connectivity**: Proxy configuration fixed for seamless API communication
4. **Data Accuracy**: Real-time predictions now match expected arrival times

### Performance Improvements
- Reduced API response times with optimized endpoints
- Enhanced frontend rendering with proper state management
- Improved real-time data processing efficiency
- Better error handling and recovery mechanisms

### Security & Stability
- Added proper error handling for external API timeouts
- Enhanced data validation for GTFS-RT feeds
- Improved logging for debugging and monitoring
- Added fallback mechanisms for service reliability

---

**Maintained by**: TransitPulse Development Team  
**Last Updated**: July 15, 2025
