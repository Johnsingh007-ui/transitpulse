from sqlalchemy import Column, Float, Integer, String, DateTime
from app.core.database import Base
from datetime import datetime

class KPISummary(Base):
    __tablename__ = "kpi_summary"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    attendance_rate = Column(Float)
    absences_today = Column(Integer)
    vehicles_on_road = Column(String) # e.g., "56/64"
    coach_swaps = Column(Integer)
    on_time_performance = Column(Float)
    canceled_trips = Column(String) # e.g., "4 (14.1 hrs / 208 miles)"
    operator_cost = Column(String) # e.g., "$32,789 $56.71/hr"
