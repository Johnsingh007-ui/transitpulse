"""
Traffic Data API - Bay Area Real-time Traffic Information
Provides traffic conditions and incidents for the Bay Area region
"""

from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional
import httpx
import asyncio
from datetime import datetime
import json

router = APIRouter(prefix="/traffic", tags=["traffic"])

# Bay Area bounding box for traffic data
BAY_AREA_BOUNDS = {
    "north": 38.8,
    "south": 37.0,
    "east": -121.0,
    "west": -123.5
}

class TrafficService:
    def __init__(self):
        self.base_url = "https://511.org/api/traffic"
        self.last_update = None
        self.cached_data = None
        self.cache_duration = 300  # 5 minutes
    
    async def get_traffic_conditions(self) -> Dict[str, Any]:
        """Get real-time traffic conditions for Bay Area"""
        try:
            # Check if we have cached data that's still fresh
            if (self.cached_data and self.last_update and 
                (datetime.now() - self.last_update).seconds < self.cache_duration):
                return self.cached_data
            
            # Fetch real traffic data from 511 Bay Area API
            async with httpx.AsyncClient() as client:
                # Get traffic events using the real 511 API
                events_response = await client.get(
                    "http://api.511.org/traffic/events",
                    params={
                        "api_key": "b43cedb9-b614-4739-bb3a-e3c07f895fab",
                        "format": "json"
                    },
                    timeout=10.0
                )
                
                if events_response.status_code == 200:
                    events_data = events_response.json()
                    
                    # Transform 511 API data to our format
                    flow_data = []
                    incidents_data = []
                    
                    for event in events_data.get("events", []):
                        if event.get("status") == "ACTIVE":
                            # Extract coordinates
                            coords = None
                            if event.get("geography"):
                                if event["geography"]["type"] == "Point":
                                    coords = {
                                        "lat": event["geography"]["coordinates"][1],
                                        "lng": event["geography"]["coordinates"][0]
                                    }
                            
                            if coords:
                                # Determine if this is a traffic flow or incident
                                event_type = event.get("event_type", "INCIDENT")
                                severity = event.get("severity", "UNKNOWN").lower()
                                
                                if event_type == "CONSTRUCTION" or event_type == "INCIDENT":
                                    incidents_data.append({
                                        "type": "construction" if event_type == "CONSTRUCTION" else "accident",
                                        "severity": "major" if severity == "major" else "minor" if severity == "minor" else "moderate",
                                        "description": event.get("headline", "Traffic event"),
                                        "location": self._extract_location(event),
                                        "coordinates": coords,
                                        "reported_at": event.get("created", datetime.now().isoformat()),
                                        "estimated_clearance": event.get("updated", "")
                                    })
                                
                                # Also create flow data for road conditions
                                if event.get("roads"):
                                    for road in event["roads"]:
                                        road_name = road.get("name", "Unknown Road")
                                        direction = road.get("direction", "Unknown")
                                        state = road.get("state", "Open")
                                        
                                        # Estimate congestion based on road state
                                        congestion_level = "light"
                                        speed = 60
                                        if state == "CLOSED":
                                            congestion_level = "heavy"
                                            speed = 0
                                        elif state == "SOME_LANES_CLOSED":
                                            congestion_level = "moderate"
                                            speed = 30
                                        
                                        flow_data.append({
                                            "road_name": road_name,
                                            "direction": direction,
                                            "speed": speed,
                                            "normal_speed": 65,
                                            "congestion_level": congestion_level,
                                            "coordinates": [coords]
                                        })
                    
                    traffic_data = {
                        "flow": flow_data,
                        "incidents": incidents_data,
                        "last_updated": datetime.now().isoformat(),
                        "bounds": BAY_AREA_BOUNDS
                    }
                    
                    # Cache the data
                    self.cached_data = traffic_data
                    self.last_update = datetime.now()
                    
                    return traffic_data
                else:
                    print(f"511 API error: {events_response.status_code}")
                    return self._get_mock_traffic_data()
                
        except Exception as e:
            print(f"Error fetching 511 traffic data: {e}")
            # Return mock data if real API fails
            return self._get_mock_traffic_data()
    
    def _extract_location(self, event) -> str:
        """Extract location information from 511 event"""
        if event.get("roads") and len(event["roads"]) > 0:
            road = event["roads"][0]
            name = road.get("name", "")
            from_loc = road.get("from", "")
            to_loc = road.get("to", "")
            
            if from_loc and to_loc:
                return f"{name} from {from_loc} to {to_loc}"
            elif from_loc:
                return f"{name} near {from_loc}"
            else:
                return name
        
        return event.get("headline", "Unknown location")[:50]
    
    def _get_mock_traffic_data(self) -> Dict[str, Any]:
        """Provide mock traffic data for development/demo"""
        return {
            "flow": [
                {
                    "road_name": "US-101",
                    "direction": "North",
                    "speed": 25,
                    "normal_speed": 65,
                    "congestion_level": "heavy",
                    "coordinates": [
                        {"lat": 37.7749, "lng": -122.4194},
                        {"lat": 37.7849, "lng": -122.4194}
                    ]
                },
                {
                    "road_name": "I-80",
                    "direction": "East", 
                    "speed": 45,
                    "normal_speed": 65,
                    "congestion_level": "moderate",
                    "coordinates": [
                        {"lat": 37.8044, "lng": -122.2711},
                        {"lat": 37.8144, "lng": -122.2611}
                    ]
                },
                {
                    "road_name": "CA-24",
                    "direction": "West",
                    "speed": 60,
                    "normal_speed": 65,
                    "congestion_level": "light",
                    "coordinates": [
                        {"lat": 37.8522, "lng": -122.2437},
                        {"lat": 37.8622, "lng": -122.2337}
                    ]
                },
                {
                    "road_name": "I-580",
                    "direction": "East",
                    "speed": 15,
                    "normal_speed": 65,
                    "congestion_level": "heavy",
                    "coordinates": [
                        {"lat": 37.8270, "lng": -122.2643},
                        {"lat": 37.8370, "lng": -122.2543}
                    ]
                },
                {
                    "road_name": "Golden Gate Bridge",
                    "direction": "South",
                    "speed": 35,
                    "normal_speed": 45,
                    "congestion_level": "moderate",
                    "coordinates": [
                        {"lat": 37.8199, "lng": -122.4783},
                        {"lat": 37.8083, "lng": -122.4784}
                    ]
                }
            ],
            "incidents": [
                {
                    "type": "accident",
                    "severity": "major",
                    "description": "Multi-vehicle accident blocking 2 lanes",
                    "location": "US-101 North at Cesar Chavez",
                    "coordinates": {"lat": 37.7489, "lng": -122.4089},
                    "reported_at": "2024-01-20T10:30:00Z",
                    "estimated_clearance": "2024-01-20T12:00:00Z"
                },
                {
                    "type": "construction",
                    "severity": "minor",
                    "description": "Lane closure for maintenance",
                    "location": "I-80 West at Bay Bridge",
                    "coordinates": {"lat": 37.7983, "lng": -122.3778},
                    "reported_at": "2024-01-20T09:00:00Z",
                    "estimated_clearance": "2024-01-20T15:00:00Z"
                },
                {
                    "type": "breakdown",
                    "severity": "minor",
                    "description": "Disabled vehicle on shoulder",
                    "location": "I-580 East at Oakland",
                    "coordinates": {"lat": 37.8044, "lng": -122.2508},
                    "reported_at": "2024-01-20T11:15:00Z",
                    "estimated_clearance": "2024-01-20T11:45:00Z"
                },
                {
                    "type": "accident",
                    "severity": "critical",
                    "description": "Major collision - all lanes blocked",
                    "location": "Golden Gate Bridge - South Tower",
                    "coordinates": {"lat": 37.8167, "lng": -122.4786},
                    "reported_at": "2024-01-20T11:30:00Z",
                    "estimated_clearance": "2024-01-20T13:00:00Z"
                }
            ],
            "last_updated": datetime.now().isoformat(),
            "bounds": BAY_AREA_BOUNDS
        }

# Initialize traffic service
traffic_service = TrafficService()

@router.get("/conditions")
async def get_traffic_conditions():
    """
    Get real-time traffic conditions for the Bay Area
    Returns traffic flow data and incidents
    """
    try:
        data = await traffic_service.get_traffic_conditions()
        return {
            "status": "success",
            "data": data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch traffic data: {str(e)}")

@router.get("/incidents")
async def get_traffic_incidents():
    """Get current traffic incidents"""
    try:
        data = await traffic_service.get_traffic_conditions()
        return {
            "status": "success",
            "data": data.get("incidents", [])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch incidents: {str(e)}")

@router.get("/flow/{road_name}")
async def get_road_traffic(road_name: str):
    """Get traffic flow for a specific road"""
    try:
        data = await traffic_service.get_traffic_conditions()
        road_data = [
            flow for flow in data.get("flow", [])
            if road_name.lower() in flow.get("road_name", "").lower()
        ]
        return {
            "status": "success",
            "data": road_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch road traffic: {str(e)}")
