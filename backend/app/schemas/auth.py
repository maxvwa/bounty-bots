import re
import uuid
from datetime import datetime

from pydantic import BaseModel, field_validator

_EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class RegisterRequest(BaseModel):
    """Payload for registering a new local account."""

    email: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        """Validate and normalize an email string."""

        normalized = value.strip().lower()
        if not _EMAIL_REGEX.match(normalized):
            raise ValueError("Invalid email format")
        return normalized

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        """Require a reasonable password length."""

        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters")
        return value


class LoginRequest(BaseModel):
    """Payload for local email/password login."""

    email: str
    password: str

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        """Normalize an email string for lookups."""

        return value.strip().lower()


class TokenResponse(BaseModel):
    """Auth token response payload."""

    access_token: str
    token_type: str = "bearer"


class UserMeResponse(BaseModel):
    """Authenticated user details returned by /auth/me."""

    user_id: int
    reference: uuid.UUID
    email: str | None
    timezone_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
