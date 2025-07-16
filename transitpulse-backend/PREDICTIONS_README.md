# Real-time Arrival Predictions API

This module provides computed arrival predictions for transit stops by integrating multiple data sources:

## Overview

The predictions system is designed to **complement** existing real-time data rather than duplicate it:

- **Live Vehicle Positions** → Already tracked in `live_vehicle_positions` table
- **GTFS-RT Trip Updates** → Already handled by `AutoGTFSUpdater` 
- **Static Schedule Data** → Available in `gtfs_stop_times` table
- **Computed Predictions** → New layer that combines all sources

## Architecture

### Data Flow
```
Real-time Sources → Prediction Engine → API Responses
     ↓                    ↓                 ↓
• Vehicle positions  • Integration     • /predictions/stop/{id}
• GTFS-RT feeds     • Algorithms      • /predictions/route/{id}
• Static schedules  • Confidence      • /predictions/vehicle/{id}
```

### Key Components

1. **Models** (`app/models/predictions.py`)
   - `StopPrediction` - Computed predictions with metadata
   - Simplified from original complex trip update models

2. **Schemas** (`app/schemas/predictions.py`)
   - `StopPredictionDisplay` - Human-readable API responses
   - `PredictionStats` - System performance metrics

3. **CRUD** (`app/crud/predictions_crud.py`)
   - `compute_predictions_from_vehicles()` - Core prediction algorithm
   - `get_predictions_with_stop_info()` - Enhanced queries with stop details

4. **API** (`app/api/endpoints/predictions.py`)
   - RESTful endpoints for accessing predictions
   - Background tasks for cleanup and computation

## API Endpoints

### GET `/api/v1/predictions/stop/{stop_id}`
Get real-time predictions for a specific stop.

**Query Parameters:**
- `route_id` (optional) - Filter by specific route
- `limit` (default: 10) - Maximum predictions to return

**Response:**
```json
{
  "stop_id": "12345",
  "stop_name": "Main St & 1st Ave",
  "status": "success",
  "predictions": [
    {
      "route_id": "101",
      "route_short_name": "101",
      "headsign": "Downtown",
      "predicted_arrival": "5 min",
      "minutes_until_arrival": 5,
      "status": "on_time",
      "confidence_level": 0.8,
      "is_real_time": true
    }
  ]
}
```

### GET `/api/v1/predictions/route/{route_id}`
Get predictions for all stops on a route.

### GET `/api/v1/predictions/vehicle/{vehicle_id}`
Get upcoming stops for a specific vehicle.

### POST `/api/v1/predictions/compute`
Trigger new prediction computation.

### GET `/api/v1/predictions/stats`
Get system performance statistics.

## Integration with Existing System

### Uses Existing Data
- `live_vehicle_positions` - Current vehicle locations
- `gtfs_stop_times` - Scheduled arrival times
- `gtfs_trips` - Trip metadata (headsign, direction)
- `gtfs_stops` - Stop information
- `AutoGTFSUpdater` - Real-time feed processing

### Adds New Capability
- **Prediction Computation** - Algorithms to estimate arrivals
- **Confidence Scoring** - Reliability metrics for predictions
- **Expiration Management** - Automatic cleanup of stale data
- **Multi-source Integration** - Combines schedule + real-time data

## Example Usage

```python
# Get predictions for a stop
predictions = await get_predictions_with_stop_info(db, "12345", limit=5)

# Compute new predictions from current vehicle positions
new_predictions = await compute_predictions_from_vehicles(db, route_id="101")

# Clean up expired predictions
deleted_count = await clean_expired_predictions(db)
```

## Future Enhancements

1. **Machine Learning** - Historical performance-based predictions
2. **Traffic Integration** - Real-time traffic delay factors
3. **Weather Impact** - Weather-based delay adjustments
4. **Passenger Load** - Crowding-based delay estimates
5. **Event Detection** - Automatic incident impact assessment

## Database Schema

```sql
CREATE TABLE stop_predictions (
    id UUID PRIMARY KEY,
    stop_id VARCHAR(100) NOT NULL,
    route_id VARCHAR(100) NOT NULL,
    trip_id VARCHAR(100) NOT NULL,
    vehicle_id VARCHAR(100),
    predicted_arrival_time TIMESTAMPTZ,
    scheduled_arrival_time TIMESTAMPTZ,
    arrival_delay_seconds INTEGER DEFAULT 0,
    confidence_level FLOAT DEFAULT 0.8,
    prediction_source VARCHAR(20) DEFAULT 'computed',
    is_real_time BOOLEAN DEFAULT true,
    headsign VARCHAR(255),
    direction_id INTEGER,
    stop_sequence INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- Indexes for efficient querying
CREATE INDEX idx_stop_predictions_stop_route ON stop_predictions(stop_id, route_id);
CREATE INDEX idx_stop_predictions_vehicle ON stop_predictions(vehicle_id, trip_id);
CREATE INDEX idx_stop_predictions_active ON stop_predictions(stop_id, expires_at);
```

## Testing

Use the `/api/v1/predictions/compute` endpoint to generate test predictions based on current vehicle positions and schedules.
