from datetime import datetime

from pydantic import BaseModel, field_validator


class SecretSubmitRequest(BaseModel):
    """Request payload for submitting a paid secret guess."""

    challenge_id: int
    payment_id: int
    submitted_secret: str

    @field_validator("submitted_secret")
    @classmethod
    def validate_submitted_secret(cls, value: str) -> str:
        """Require a non-empty guess value."""

        normalized = value.strip()
        if not normalized:
            raise ValueError("submitted_secret must not be empty")
        return normalized


class AttemptRead(BaseModel):
    """Serialized attempt row returned by listing endpoints."""

    attempt_id: int
    user_id: int
    challenge_id: int
    payment_id: int | None
    is_correct: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AttemptResponse(BaseModel):
    """Response payload for a secret submission outcome."""

    attempt: AttemptRead
    message: str
