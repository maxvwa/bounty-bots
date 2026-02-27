import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class UserCreate(BaseModel):
    """Request payload for creating an example user."""

    timezone_name: str

    @field_validator("timezone_name")
    @classmethod
    def validate_timezone_name(cls, value: str) -> str:
        """Require a non-empty timezone name."""

        normalized_value = value.strip()
        if not normalized_value:
            raise ValueError("timezone_name must not be empty")
        return normalized_value


class UserRead(BaseModel):
    """Response model for example user records."""

    reference: uuid.UUID
    timezone_name: str = Field(..., alias="timezone")
    created_at: datetime
    updated_at: datetime

    @field_validator("timezone_name", mode="before")
    @classmethod
    def extract_timezone_name(cls, value: object) -> str:
        """Serialize joined timezone ORM objects as timezone strings."""

        timezone_name = getattr(value, "timezone_name", value)
        return str(timezone_name)

    model_config = {"from_attributes": True, "populate_by_name": True}
