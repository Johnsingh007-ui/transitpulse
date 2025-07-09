from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class GTFSShape(BaseModel):
    id: int | None = None
    shape_id: str
    shape_pt_lat: float
    shape_pt_lon: float
    shape_pt_sequence: int
    shape_dist_traveled: float | None = None

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "shape_id": "101",
                "shape_pt_lat": 40.7128,
                "shape_pt_lon": -74.0060,
                "shape_pt_sequence": 1,
                "shape_dist_traveled": 0.0
            }
        }

class GTFSRouteBase(BaseModel):
    route_id: str
    agency_id: str | None = None
    route_short_name: str | None = None
    route_long_name: str | None = None
    route_desc: str | None = None
    route_type: int | None = None
    route_url: str | None = None
    route_color: str | None = None
    route_text_color: str | None = None
    route_sort_order: int | None = None

class GTFSRouteCreate(GTFSRouteBase):
    pass

class GTFSRoute(GTFSRouteBase):
    class Config:
        from_attributes = True

class GTFSRouteResponse(BaseModel):
    routes: List[GTFSRoute]
    status: str
    message: str

    class Config:
        from_attributes = True


class GTFSStop(BaseModel):
    stop_id: str
    stop_code: Optional[str] = None
    stop_name: str
    stop_lat: float
    stop_lon: float
    zone_id: Optional[str] = None
    wheelchair_boarding: Optional[bool] = None

    class Config:
        from_attributes = True


class GTFSStopResponse(BaseModel):
    status: str
    message: str
    data: List[GTFSStop]

    class Config:
        from_attributes = True
