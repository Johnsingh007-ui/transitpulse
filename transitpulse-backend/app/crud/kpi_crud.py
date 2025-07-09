from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.kpi import KPISummary
from app.schemas.kpi import KPISummaryCreate
from datetime import datetime

async def get_kpi_summary(db: AsyncSession):
    # For real-time, we'd typically fetch the latest entry
    result = await db.execute(
        select(KPISummary).order_by(KPISummary.timestamp.desc()).limit(1)
    )
    return result.scalars().first()

async def create_kpi_summary(db: AsyncSession, kpi_data: KPISummaryCreate):
    db_kpi = KPISummary(**kpi_data.model_dump(), timestamp=datetime.utcnow()) # Use model_dump() for Pydantic v2
    db.add(db_kpi)
    await db.commit()
    await db.refresh(db_kpi)
    return db_kpi
