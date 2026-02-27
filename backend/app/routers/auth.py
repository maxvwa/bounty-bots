import uuid

import pendulum
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.users import User
from app.routers.helpers import get_next_sequence_value
from app.schemas import LoginRequest, RegisterRequest, TokenResponse, UserMeResponse
from app.services.auth import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Create a local user account and return a bearer token."""

    existing_result = await db.execute(select(User.user_id).where(User.email == payload.email))
    if existing_result.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="Email already registered")

    now = pendulum.now("UTC").naive()
    new_user = User(
        user_id=await get_next_sequence_value(db, "user_id_seq"),
        reference=uuid.uuid4(),
        timezone_id=1,
        email=payload.email,
        password_hash=hash_password(payload.password),
        created_at=now,
        updated_at=now,
    )
    db.add(new_user)

    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Failed to register user") from exc

    access_token = create_access_token(user_id=new_user.user_id, email=payload.email)
    return TokenResponse(access_token=access_token)


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    """Authenticate a user using email/password credentials."""

    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalars().first()
    if user is None or user.password_hash is None:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return TokenResponse(
        access_token=create_access_token(user_id=user.user_id, email=payload.email)
    )


@router.get("/me", response_model=UserMeResponse)
async def me(current_user: User = Depends(get_current_user)) -> UserMeResponse:
    """Return the authenticated user profile."""

    return UserMeResponse.model_validate(current_user)
