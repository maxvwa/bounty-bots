import uuid

import pendulum
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.database import get_db
from app.models.users import User
from app.routers.helpers import get_next_sequence_value, resolve_timezone_id
from app.schemas import UserCreate, UserRead

router = APIRouter(prefix="/users", tags=["users"])


async def _load_user_by_reference(db: AsyncSession, reference: uuid.UUID) -> User:
    """Load a user with timezone relation for response serialization."""

    result = await db.execute(
        select(User).options(joinedload(User.timezone)).where(User.reference == reference)
    )
    user = result.scalars().first()
    if user is None:
        raise HTTPException(status_code=500, detail="Created user could not be reloaded")
    return user


@router.post("", response_model=UserRead, status_code=201)
async def create_user(payload: UserCreate, db: AsyncSession = Depends(get_db)) -> UserRead:
    """Create an example user with explicit sequence-driven BIGINT primary key."""

    timezone_id = await resolve_timezone_id(db, payload.timezone_name)
    now = pendulum.now("UTC").naive()
    reference = uuid.uuid4()

    user = User(
        user_id=await get_next_sequence_value(db, "user_id_seq"),
        reference=reference,
        timezone_id=timezone_id,
        created_at=now,
        updated_at=now,
    )
    db.add(user)

    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Failed to create user") from exc

    created_user = await _load_user_by_reference(db, reference)
    return UserRead.model_validate(created_user)


@router.get("", response_model=list[UserRead])
async def list_users(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
) -> list[UserRead]:
    """List example users in descending creation order."""

    safe_limit = max(1, min(limit, 200))
    result = await db.execute(
        select(User).options(joinedload(User.timezone)).order_by(User.user_id.desc()).limit(safe_limit)
    )
    users = result.scalars().all()
    return [UserRead.model_validate(user) for user in users]
