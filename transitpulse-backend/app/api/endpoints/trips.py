from fastapi import APIRouter

router = APIRouter()

@router.get("/trips/otp")
async def get_trips_otp():
    # Placeholder for on-time performance data
    return {"message": "Trips OTP endpoint - Coming Soon!"}
