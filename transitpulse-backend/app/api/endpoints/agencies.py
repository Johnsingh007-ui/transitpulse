from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.crud.agency_crud import agency_crud
from app.schemas.agency import Agency, AgencyCreate, AgencyUpdate, AgencyPublic
from app.core.config import settings

router = APIRouter()

@router.get("/", response_model=List[AgencyPublic])
async def get_agencies(
    enabled_only: bool = True,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """Get list of all agencies"""
    agencies = await agency_crud.get_agencies(db, enabled_only=enabled_only, skip=skip, limit=limit)
    return agencies

@router.get("/current", response_model=AgencyPublic)
async def get_current_agency(db: AsyncSession = Depends(get_db)):
    """Get the current default agency"""
    agency = await agency_crud.get_agency_by_id(db, settings.DEFAULT_AGENCY_ID)
    if not agency:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Default agency not found"
        )
    return agency

@router.get("/{agency_id}", response_model=Agency)
async def get_agency(agency_id: str, db: AsyncSession = Depends(get_db)):
    """Get specific agency by ID"""
    agency = await agency_crud.get_agency_by_id(db, agency_id)
    if not agency:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agency not found"
        )
    return agency

@router.post("/", response_model=Agency)
async def create_agency(agency: AgencyCreate, db: AsyncSession = Depends(get_db)):
    """Create a new agency"""
    # Check if agency already exists
    existing_agency = await agency_crud.get_agency_by_id(db, agency.agency_id)
    if existing_agency:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Agency with this ID already exists"
        )
    
    return await agency_crud.create_agency(db, agency)

@router.put("/{agency_id}", response_model=Agency)
async def update_agency(
    agency_id: str,
    agency_update: AgencyUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update an existing agency"""
    agency = await agency_crud.update_agency(db, agency_id, agency_update)
    if not agency:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agency not found"
        )
    return agency

@router.delete("/{agency_id}")
async def delete_agency(agency_id: str, db: AsyncSession = Depends(get_db)):
    """Delete an agency"""
    success = await agency_crud.delete_agency(db, agency_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agency not found"
        )
    return {"message": "Agency deleted successfully"}
