from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.gtfs_static import GTFSShape

async def get_all_gtfs_shapes(db: AsyncSession, shape_id: Optional[str] = None) -> List[GTFSShape]:
    """
    Helper function to get all GTFS shapes, optionally filtered by shape_id.
    
    Args:
        db: Database session
        shape_id: Optional shape_id to filter by
        
    Returns:
        List of GTFSShape objects
    """
    query = select(GTFSShape)
    if shape_id:
        query = query.where(GTFSShape.shape_id == shape_id)
    query = query.order_by(GTFSShape.shape_id, GTFSShape.shape_pt_sequence)
    
    result = await db.execute(query)
    return result.scalars().all()
