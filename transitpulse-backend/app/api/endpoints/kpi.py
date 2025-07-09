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
        # For demonstration, return dummy data if no data exists
        return KPISummary(
            id=1,
            timestamp=datetime.now(), # Use datetime.now() for current time
            attendance_rate=94.0,
            absences_today=8,
            vehicles_on_road="56/64",
            coach_swaps=3,
            on_time_performance=88.2,
            canceled_trips="4 (14.1 hrs / 208 miles)",
            operator_cost="$32,789 $56.71/hr"
        )
    return kpi_summary
