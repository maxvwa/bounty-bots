import bcrypt
import jwt
import pendulum
from jwt import InvalidTokenError

from app.config import settings


def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt."""

    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Return whether a plaintext password matches a bcrypt hash."""

    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(user_id: int, email: str) -> str:
    """Create a signed HS256 access token for a user."""

    issued_at = pendulum.now("UTC")
    expires_at = issued_at.add(hours=settings.JWT_EXPIRY_HOURS)
    payload: dict[str, str | int] = {
        "sub": str(user_id),
        "email": email,
        "iat": issued_at.int_timestamp,
        "exp": expires_at.int_timestamp,
    }
    return str(jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256"))


def decode_access_token(token: str) -> dict[str, str | int]:
    """Decode and validate an access token payload."""

    try:
        raw_payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
    except InvalidTokenError as exc:
        raise ValueError("Invalid or expired access token") from exc

    subject = raw_payload.get("sub")
    if subject is None:
        raise ValueError("Access token missing subject")

    email_value = raw_payload.get("email")
    iat_value = raw_payload.get("iat")
    exp_value = raw_payload.get("exp")

    return {
        "sub": str(subject),
        "email": str(email_value) if email_value is not None else "",
        "iat": int(iat_value) if iat_value is not None else 0,
        "exp": int(exp_value) if exp_value is not None else 0,
    }
