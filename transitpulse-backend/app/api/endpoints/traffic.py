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
                    raise HTTPException(status_code=502, detail="511 API returned error")
                
        except Exception as e:
            print(f"Error fetching 511 traffic data: {e}")
            raise HTTPException(status_code=502, detail=f"Failed to fetch 511 traffic data: {str(e)}")
    
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
