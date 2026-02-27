from fastapi import HTTPException
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.timezones import Timezone
from app.static_data.timezones import TimezoneEnum


async def get_next_sequence_value(db: AsyncSession, sequence_name: str) -> int:
    """Fetch the next BIGINT value from a database sequence."""

    result = await db.execute(text(f"SELECT nextval('{sequence_name}')"))
    next_value = result.scalar_one()
    return int(next_value)


async def resolve_timezone_id(db: AsyncSession, timezone_name: str) -> int:
    """Resolve a timezone name to its stable integer id."""

    normalized_timezone_name = timezone_name.strip()
    if not normalized_timezone_name:
        raise HTTPException(status_code=400, detail="timezone_name must not be empty")

    try:
        static_timezone = TimezoneEnum.from_name(normalized_timezone_name)
        return int(static_timezone.value)
    except ValueError:
        pass

    result = await db.execute(
        select(Timezone.timezone_id).where(Timezone.timezone_name == normalized_timezone_name)
    )
    timezone_id = result.scalar_one_or_none()
    if timezone_id is None:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported timezone_name: {normalized_timezone_name}",
        )
    return int(timezone_id)
