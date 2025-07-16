"""
API endpoints for real-time arrival predictions

This module provides endpoints for accessing computed predictions
that integrate live vehicle positions, GTFS-RT data, and schedules.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.crud.predictions_crud import (
    get_predictions_for_stop,
    get_predictions_for_route, 
    get_predictions_for_vehicle,
    compute_predictions_from_vehicles,
    clean_expired_predictions,
    get_predictions_with_stop_info
)
from app.schemas.predictions import (
    StopPredictionsResponse,
    RoutePredictionsResponse,
    PredictionStats,
    StopPredictionDisplay
)

router = APIRouter(prefix="/predictions", tags=["predictions"])


@router.get("/stop/{stop_id}", response_model=StopPredictionsResponse)
async def get_stop_predictions(
    stop_id: str,
    route_id: Optional[str] = Query(None, description="Filter by specific route"),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of predictions"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get real-time arrival predictions for a specific stop.
    
    Returns upcoming arrivals with estimated times based on:
    - Live vehicle positions
    - GTFS-RT trip updates 
    - Static schedule data
    - Historical performance
    """
    try:
        predictions = await get_predictions_with_stop_info(db, stop_id, limit)
        
        # Get stop name from first prediction or query database
        stop_name = predictions[0].stop_name if predictions else None
        
        return StopPredictionsResponse(
            stop_id=stop_id,
            stop_name=stop_name,
            status="success",
            message=f"Found {len(predictions)} upcoming arrivals",
            predictions=predictions,
            last_updated=datetime.utcnow()
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching predictions for stop {stop_id}: {str(e)}"
        )


@router.get("/route/{route_id}", response_model=RoutePredictionsResponse)
async def get_route_predictions(
    route_id: str,
    limit: int = Query(50, ge=1, le=200, description="Maximum number of predictions"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get real-time predictions for all stops on a route.
    
    Returns predictions organized by stop with vehicle information.
    """
    try:
        predictions = await get_predictions_for_route(db, route_id, limit)
        
        # Organize predictions by stop
        predictions_by_stop = {}
        route_short_name = None
        
        for pred in predictions:
            if pred.stop_id not in predictions_by_stop:
                predictions_by_stop[pred.stop_id] = []
                
            # Convert to display format
            display_pred = StopPredictionDisplay(
                stop_id=pred.stop_id,
                route_id=pred.route_id,
                trip_id=pred.trip_id,
                vehicle_id=pred.vehicle_id,
                headsign=pred.headsign,
                direction_id=pred.direction_id,
                arrival_delay_minutes=pred.arrival_delay_seconds / 60 if pred.arrival_delay_seconds else None,
                confidence_level=pred.confidence_level,
                is_real_time=pred.is_real_time,
                last_updated=pred.created_at
            )
            
            # Calculate human-readable times
            if pred.predicted_arrival_time:
                time_diff = pred.predicted_arrival_time - datetime.utcnow()
                minutes = max(0, int(time_diff.total_seconds() / 60))
                display_pred.minutes_until_arrival = minutes
                display_pred.predicted_arrival = f"{minutes} min"
                
            predictions_by_stop[pred.stop_id].append(display_pred)
        
        return RoutePredictionsResponse(
            route_id=route_id,
            route_short_name=route_short_name,
            status="success", 
            message=f"Found predictions for {len(predictions_by_stop)} stops",
            predictions_by_stop=predictions_by_stop,
            last_updated=datetime.utcnow()
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching predictions for route {route_id}: {str(e)}"
        )


@router.get("/vehicle/{vehicle_id}")
async def get_vehicle_predictions(
    vehicle_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get predictions for stops that a specific vehicle will visit.
    """
    try:
        predictions = await get_predictions_for_vehicle(db, vehicle_id)
        
        display_predictions = []
        for pred in predictions:
            display_pred = StopPredictionDisplay(
                stop_id=pred.stop_id,
                route_id=pred.route_id,
                trip_id=pred.trip_id,
                vehicle_id=pred.vehicle_id,
                headsign=pred.headsign,
                direction_id=pred.direction_id,
                stop_sequence=pred.stop_sequence,
                confidence_level=pred.confidence_level,
                is_real_time=pred.is_real_time,
                last_updated=pred.created_at
            )
            
            if pred.predicted_arrival_time:
                time_diff = pred.predicted_arrival_time - datetime.utcnow()
                minutes = max(0, int(time_diff.total_seconds() / 60))
                display_pred.minutes_until_arrival = minutes
                display_pred.predicted_arrival = f"{minutes} min"
                
            display_predictions.append(display_pred)
        
        return {
            "vehicle_id": vehicle_id,
            "status": "success",
            "message": f"Found {len(predictions)} upcoming stops",
            "predictions": display_predictions,
            "last_updated": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching predictions for vehicle {vehicle_id}: {str(e)}"
        )


@router.post("/compute")
async def compute_new_predictions(
    background_tasks: BackgroundTasks,
    route_id: Optional[str] = Query(None, description="Compute for specific route only"),
    db: AsyncSession = Depends(get_db)
):
    """
    Trigger computation of new predictions based on current vehicle positions.
    
    This endpoint integrates live vehicle data with schedules to generate
    updated arrival predictions.
    """
    try:
        # Clean up expired predictions first
        background_tasks.add_task(clean_expired_predictions, db)
        
        # Compute new predictions
        predictions = await compute_predictions_from_vehicles(db, route_id)
        
        # Save new predictions to database
        for pred in predictions:
            db.add(pred)
            
        await db.commit()
        
        return {
            "status": "success",
            "message": f"Computed {len(predictions)} new predictions",
            "route_id": route_id,
            "computation_time": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error computing predictions: {str(e)}"
        )


@router.get("/stats", response_model=PredictionStats)
async def get_prediction_stats(
    route_id: Optional[str] = Query(None, description="Stats for specific route"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get statistics about prediction accuracy and data sources.
    """
    try:
        from sqlalchemy import text, func
        
        # Base query for prediction counts
        if route_id:
            count_query = text("""
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN is_real_time = true THEN 1 END) as real_time,
                    AVG(confidence_level) as avg_confidence,
                    prediction_source,
                    COUNT(*) as source_count
                FROM stop_predictions 
                WHERE route_id = :route_id
                AND (expires_at IS NULL OR expires_at > NOW())
                GROUP BY prediction_source
            """)
            result = await db.execute(count_query, {"route_id": route_id})
        else:
            count_query = text("""
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN is_real_time = true THEN 1 END) as real_time,
                    AVG(confidence_level) as avg_confidence,
                    prediction_source,
                    COUNT(*) as source_count
                FROM stop_predictions 
                WHERE (expires_at IS NULL OR expires_at > NOW())
                GROUP BY prediction_source
            """)
            result = await db.execute(count_query)
            
        rows = result.fetchall()
        
        total_predictions = sum(row.source_count for row in rows)
        real_time_predictions = sum(row.source_count for row in rows if row.real_time)
        avg_confidence = sum(row.avg_confidence * row.source_count for row in rows) / total_predictions if total_predictions > 0 else 0
        
        prediction_sources = {row.prediction_source: row.source_count for row in rows}
        
        return PredictionStats(
            total_predictions=total_predictions,
            real_time_predictions=real_time_predictions,
            average_confidence=round(avg_confidence, 2),
            prediction_sources=prediction_sources,
            last_updated=datetime.utcnow()
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching prediction stats: {str(e)}"
        )


@router.delete("/cleanup")
async def cleanup_expired_predictions(
    db: AsyncSession = Depends(get_db)
):
    """
    Remove expired predictions from the database.
    """
    try:
        deleted_count = await clean_expired_predictions(db)
        
        return {
            "status": "success",
            "message": f"Cleaned up {deleted_count} expired predictions",
            "deleted_count": deleted_count,
            "cleanup_time": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error cleaning up predictions: {str(e)}"
        )
