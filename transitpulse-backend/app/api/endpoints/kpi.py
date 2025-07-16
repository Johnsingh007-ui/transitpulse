from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.crud import kpi_crud
from app.schemas.kpi import KPISummary
from app.core.database import get_db
from datetime import datetime

router = APIRouter()

@router.get("/kpi/summary", response_model=KPISummary)
async def read_kpi_summary(db: AsyncSession = Depends(get_db)):
    kpi_summary = await kpi_crud.get_kpi_summary(db)
    if kpi_summary is None:
        # Calculate basic KPIs from available vehicle data
        from sqlalchemy import text
        
        # Get active vehicles
        vehicle_result = await db.execute(
            text("SELECT COUNT(*) FROM live_vehicle_positions WHERE timestamp > NOW() - INTERVAL '30 minutes'")
        )
        active_vehicles = vehicle_result.scalar() or 0
        
        # Estimate total fleet size (rough calculation)
        total_vehicles_result = await db.execute(
            text("SELECT COUNT(DISTINCT vehicle_id) FROM live_vehicle_positions WHERE timestamp > NOW() - INTERVAL '24 hours'")
        )
        total_vehicles = total_vehicles_result.scalar() or 0
        
        return KPISummary(
            id=1,
            timestamp=datetime.now(),
            attendance_rate=0.0,  # Requires operator attendance data
            absences_today=0,     # Requires operator data
            vehicles_on_road=f"{active_vehicles}/{total_vehicles}" if total_vehicles > 0 else "0/0",
            coach_swaps=0,        # Requires maintenance data
            on_time_performance=0.0,  # Requires GTFS-RT trip update data
            canceled_trips="0 (no trip data)",
            operator_cost="$0 (no cost data)"
        )
    return kpi_summary
