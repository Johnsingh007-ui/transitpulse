from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
import logging

from app.schemas.gtfs import GTFSShape
from app.db.session import get_db
from app.utils.gtfs_utils import get_all_gtfs_shapes  # ✅ THIS IS CRUCIAL

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/shapes", response_model=List[GTFSShape])
async def get_shapes(
    shape_id: Optional[str] = Query(None, description="Optional shape_id to filter"),
    db: AsyncSession = Depends(get_db)
):
    logger.info(f"🔍 GET /shapes called with shape_id={shape_id}")
    try:
        shapes = await get_all_gtfs_shapes(db=db, shape_id=shape_id)
        logger.info(f"✅ Retrieved {len(shapes)} shapes")
        return shapes
    except Exception as e:
        logger.error(f"❌ Error in get_shapes: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {e}")
