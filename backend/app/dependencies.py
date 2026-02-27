from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.users import User
from app.services.auth import decode_access_token

_bearer_scheme = HTTPBearer(auto_error=False)


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
