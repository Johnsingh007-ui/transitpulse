from fastapi import APIRouter, Query

router = APIRouter()

@router.get("/shapes")
def get_shapes(route_id: str = Query(..., description="The route ID")):
    return {"message": f"Returning shapes for route_id {route_id}"}
