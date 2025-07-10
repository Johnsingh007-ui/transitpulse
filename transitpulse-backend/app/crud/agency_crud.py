from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.agency import Agency
from app.schemas.agency import AgencyCreate, AgencyUpdate

class AgencyCRUD:
    async def get_agency_by_id(self, db: AsyncSession, agency_id: str) -> Optional[Agency]:
        """Get agency by agency_id"""
        result = await db.execute(select(Agency).where(Agency.agency_id == agency_id))
        return result.scalar_one_or_none()
    
    async def get_agency(self, db: AsyncSession, id: int) -> Optional[Agency]:
        """Get agency by database id"""
        result = await db.execute(select(Agency).where(Agency.id == id))
        return result.scalar_one_or_none()
    
    async def get_agencies(self, db: AsyncSession, enabled_only: bool = True, skip: int = 0, limit: int = 100) -> List[Agency]:
        """Get all agencies"""
        query = select(Agency)
        if enabled_only:
            query = query.where(Agency.enabled == True)
        
        query = query.offset(skip).limit(limit).order_by(Agency.display_name)
        result = await db.execute(query)
        return result.scalars().all()
    
    async def create_agency(self, db: AsyncSession, agency: AgencyCreate) -> Agency:
        """Create a new agency"""
        db_agency = Agency(**agency.model_dump())
        db.add(db_agency)
        await db.commit()
        await db.refresh(db_agency)
        return db_agency
    
    async def update_agency(self, db: AsyncSession, agency_id: str, agency_update: AgencyUpdate) -> Optional[Agency]:
        """Update an existing agency"""
        result = await db.execute(select(Agency).where(Agency.agency_id == agency_id))
        db_agency = result.scalar_one_or_none()
        
        if not db_agency:
            return None
        
        update_data = agency_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_agency, field, value)
        
        await db.commit()
        await db.refresh(db_agency)
        return db_agency
    
    async def delete_agency(self, db: AsyncSession, agency_id: str) -> bool:
        """Delete an agency"""
        result = await db.execute(select(Agency).where(Agency.agency_id == agency_id))
        db_agency = result.scalar_one_or_none()
        
        if not db_agency:
            return False
        
        await db.delete(db_agency)
        await db.commit()
        return True

# Create singleton instance
agency_crud = AgencyCRUD()
