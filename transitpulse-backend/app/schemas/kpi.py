from pydantic import BaseModel
from datetime import datetime

class KPISummaryBase(BaseModel):
    attendance_rate: float
    absences_today: int
    vehicles_on_road: str
    coach_swaps: int
    on_time_performance: float
    canceled_trips: str
    operator_cost: str

class KPISummaryCreate(KPISummaryBase):
    pass

class KPISummary(KPISummaryBase):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True # Important for Pydantic v2 with SQLAlchemy
