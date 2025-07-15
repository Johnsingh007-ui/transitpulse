"""
Analytics Schemas for TransitPulse API

These Pydantic models define the structure for analytics API responses,
ensuring consistent and well-documented data formats.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class FleetMetrics(BaseModel):
    """Real-time fleet overview metrics"""
    total_vehicles: int = Field(description="Total number of vehicles in fleet")
    active_vehicles: int = Field(description="Number of vehicles currently moving")
    vehicles_in_service: int = Field(description="Number of vehicles actively serving routes")
    average_speed: float = Field(description="Average speed of active vehicles (km/h)")
    coverage_area_km2: float = Field(description="Geographic coverage area (square kilometers)")
    last_updated: datetime = Field(description="Timestamp of last data update")

    class Config:
        json_schema_extra = {
            "example": {
                "total_vehicles": 125,
                "active_vehicles": 89,
                "vehicles_in_service": 82,
                "average_speed": 23.5,
                "coverage_area_km2": 450.2,
                "last_updated": "2025-07-15T10:30:00Z"
            }
        }


class RoutePerformance(BaseModel):
    """Performance metrics for a specific route"""
    route_id: str = Field(description="Unique route identifier")
    route_name: str = Field(description="Human-readable route name")
    active_vehicles: int = Field(description="Number of vehicles currently on this route")
    average_speed: float = Field(description="Average speed for vehicles on this route (km/h)")
    total_trips: int = Field(description="Total number of trips on this route")
    service_frequency: float = Field(description="Service frequency (vehicles per hour)")
    last_updated: datetime = Field(description="Timestamp of last calculation")

    class Config:
        json_schema_extra = {
            "example": {
                "route_id": "101",
                "route_name": "Golden Gate Transit 101",
                "active_vehicles": 8,
                "average_speed": 25.3,
                "total_trips": 45,
                "service_frequency": 4.2,
                "last_updated": "2025-07-15T10:30:00Z"
            }
        }


class ServiceReliability(BaseModel):
    """Service reliability and on-time performance metrics"""
    on_time_percentage: float = Field(description="Percentage of services running on time")
    average_delay_minutes: float = Field(description="Average delay in minutes")
    service_interruptions: int = Field(description="Number of service interruptions")
    customer_satisfaction_score: float = Field(description="Customer satisfaction score (1-5)")
    total_trips_analyzed: int = Field(description="Total number of trips in analysis")
    analysis_period: str = Field(description="Time period analyzed (e.g., '24h', '7d')")
    last_updated: datetime = Field(description="Timestamp of analysis")

    class Config:
        json_schema_extra = {
            "example": {
                "on_time_percentage": 85.3,
                "average_delay_minutes": 2.1,
                "service_interruptions": 3,
                "customer_satisfaction_score": 4.2,
                "total_trips_analyzed": 1247,
                "analysis_period": "24h",
                "last_updated": "2025-07-15T10:30:00Z"
            }
        }


class OperationalKPI(BaseModel):
    """Key performance indicators for operations dashboard"""
    fleet_utilization_percent: float = Field(description="Percentage of fleet currently active")
    service_coverage_percent: float = Field(description="Percentage of routes with active service")
    average_vehicle_speed: float = Field(description="System-wide average vehicle speed (km/h)")
    system_health_score: float = Field(description="Overall system health score (0-100)")
    active_routes: int = Field(description="Number of routes with active vehicles")
    total_routes: int = Field(description="Total number of routes in system")
    data_freshness_minutes: int = Field(description="Age of most recent data (minutes)")
    last_calculated: datetime = Field(description="Timestamp of KPI calculation")

    class Config:
        json_schema_extra = {
            "example": {
                "fleet_utilization_percent": 78.5,
                "service_coverage_percent": 92.3,
                "average_vehicle_speed": 22.7,
                "system_health_score": 95.2,
                "active_routes": 12,
                "total_routes": 13,
                "data_freshness_minutes": 3,
                "last_calculated": "2025-07-15T10:30:00Z"
            }
        }


class AnalyticsTimeRange(BaseModel):
    """Time range specification for analytics queries"""
    start_time: datetime = Field(description="Start of analysis period")
    end_time: datetime = Field(description="End of analysis period")
    period_name: str = Field(description="Human-readable period name (e.g., 'Last 24 hours')")

    class Config:
        json_schema_extra = {
            "example": {
                "start_time": "2025-07-14T10:30:00Z",
                "end_time": "2025-07-15T10:30:00Z",
                "period_name": "Last 24 hours"
            }
        }


class TrendDataPoint(BaseModel):
    """Single data point in a trend analysis"""
    timestamp: datetime = Field(description="Time of measurement")
    value: float = Field(description="Measured value")
    label: Optional[str] = Field(None, description="Human-readable label for this point")

    class Config:
        json_schema_extra = {
            "example": {
                "timestamp": "2025-07-15T10:00:00Z",
                "value": 85.3,
                "label": "10:00 AM"
            }
        }


class TrendAnalysis(BaseModel):
    """Trend analysis results over time"""
    metric_name: str = Field(description="Name of the metric being analyzed")
    metric_unit: str = Field(description="Unit of measurement")
    time_period: str = Field(description="Time period covered")
    data_points: List[TrendDataPoint] = Field(description="Time series data points")
    summary_stats: Dict[str, float] = Field(description="Summary statistics (min, max, avg, etc.)")
    generated_at: datetime = Field(description="Timestamp of analysis generation")

    class Config:
        json_schema_extra = {
            "example": {
                "metric_name": "Active Vehicles",
                "metric_unit": "vehicles",
                "time_period": "Last 24 hours",
                "data_points": [
                    {
                        "timestamp": "2025-07-15T09:00:00Z",
                        "value": 82,
                        "label": "9:00 AM"
                    },
                    {
                        "timestamp": "2025-07-15T10:00:00Z", 
                        "value": 85,
                        "label": "10:00 AM"
                    }
                ],
                "summary_stats": {
                    "min": 45,
                    "max": 105,
                    "average": 78.3,
                    "trend": 2.1
                },
                "generated_at": "2025-07-15T10:30:00Z"
            }
        }


class CustomReportRequest(BaseModel):
    """Request parameters for custom report generation"""
    report_type: str = Field(description="Type of report to generate")
    start_date: Optional[datetime] = Field(None, description="Start date for analysis")
    end_date: Optional[datetime] = Field(None, description="End date for analysis")
    filters: Optional[Dict[str, Any]] = Field(None, description="Additional filters to apply")
    format: str = Field(default="json", description="Output format (json, csv, pdf)")

    class Config:
        json_schema_extra = {
            "example": {
                "report_type": "fleet_summary",
                "start_date": "2025-07-14T00:00:00Z",
                "end_date": "2025-07-15T23:59:59Z",
                "filters": {
                    "route_ids": ["101", "130"],
                    "min_speed": 10
                },
                "format": "json"
            }
        }


class CustomReportResponse(BaseModel):
    """Response for custom report generation"""
    report_id: str = Field(description="Unique identifier for this report")
    report_type: str = Field(description="Type of report generated")
    status: str = Field(description="Report generation status")
    data: Dict[str, Any] = Field(description="Report data")
    metadata: Dict[str, Any] = Field(description="Report metadata")
    generated_at: datetime = Field(description="Report generation timestamp")
    expires_at: Optional[datetime] = Field(None, description="When this report expires")

    class Config:
        json_schema_extra = {
            "example": {
                "report_id": "rpt_fleet_20250715_103045",
                "report_type": "fleet_summary",
                "status": "completed",
                "data": {
                    "summary": {
                        "total_vehicles": 125,
                        "active_vehicles": 89
                    }
                },
                "metadata": {
                    "records_analyzed": 1247,
                    "time_period": "24h",
                    "filters_applied": ["route_filter"]
                },
                "generated_at": "2025-07-15T10:30:45Z",
                "expires_at": "2025-07-22T10:30:45Z"
            }
        }


# Error response schemas
class AnalyticsError(BaseModel):
    """Standard error response for analytics endpoints"""
    error_code: str = Field(description="Machine-readable error code")
    error_message: str = Field(description="Human-readable error message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")
    timestamp: datetime = Field(description="Error occurrence timestamp")

    class Config:
        json_schema_extra = {
            "example": {
                "error_code": "INSUFFICIENT_DATA",
                "error_message": "Not enough data available for the requested time period",
                "details": {
                    "requested_period": "7d",
                    "available_data": "2d"
                },
                "timestamp": "2025-07-15T10:30:00Z"
            }
        }
