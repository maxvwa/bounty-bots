from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db

router = APIRouter(prefix="/health", tags=["health"])


@router.get("")
async def health_check() -> dict[str, str]:
    """Return service liveness status."""

    return {"status": "ok"}


@router.get("/db")
async def db_health(db: AsyncSession = Depends(get_db)) -> dict[str, str]:
    """Verify database connectivity with a simple query."""

    await db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "connected"}
