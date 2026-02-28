import uuid

import pendulum
from fastapi import Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.credit_wallets import CreditWallet
from app.models.users import User
from app.routers.helpers import get_next_sequence_value
from app.services.auth import decode_access_token

_bearer_scheme = HTTPBearer(auto_error=False)
_DEMO_USER_EMAIL = "demo@local"


def _unauthorized_error() -> HTTPException:
    """Build a consistent unauthorized exception payload."""

    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Resolve and return the authenticated user for bearer-token requests."""

    if settings.DEMO_SKIP_AUTH and settings.APP_ENV == "local":
        result = await db.execute(select(User).where(User.email == _DEMO_USER_EMAIL))
        demo_user = result.scalars().first()
        if demo_user is not None:
            return demo_user

        now = pendulum.now("UTC").naive()
        demo_user = User(
            user_id=await get_next_sequence_value(db, "user_id_seq"),
            reference=uuid.uuid4(),
            timezone_id=1,
            email=_DEMO_USER_EMAIL,
            password_hash=None,
            created_at=now,
            updated_at=now,
        )
        db.add(demo_user)
        await db.flush()
        db.add(
            CreditWallet(
                credit_wallet_id=await get_next_sequence_value(db, "credit_wallet_id_seq"),
                user_id=demo_user.user_id,
                balance_credits=0,
                created_at=now,
                updated_at=now,
            )
        )
        try:
            await db.commit()
        except IntegrityError:
            await db.rollback()
            result = await db.execute(select(User).where(User.email == _DEMO_USER_EMAIL))
            existing_demo_user = result.scalars().first()
            if existing_demo_user is not None:
                return existing_demo_user
            raise
        await db.refresh(demo_user)
        return demo_user

    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _unauthorized_error()

    try:
        payload = decode_access_token(credentials.credentials)
        user_id = int(payload["sub"])
    except (ValueError, KeyError):
        raise _unauthorized_error() from None

    result = await db.execute(select(User).where(User.user_id == user_id))
    user = result.scalars().first()
    if user is None:
        raise _unauthorized_error()
    return user
