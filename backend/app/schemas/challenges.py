from datetime import datetime

from pydantic import BaseModel, field_validator


class ChallengeListItem(BaseModel):
    """Public challenge list entry without the secret value."""

    challenge_id: int
    title: str
    description: str
    difficulty: str
    cost_per_attempt_cents: int
    attack_cost_credits: int
    prize_pool_cents: int
    is_active: bool

    model_config = {"from_attributes": True}


class ChallengeDetail(BaseModel):
    """Public challenge detail payload without the secret value."""

    challenge_id: int
    title: str
    description: str
    difficulty: str
    cost_per_attempt_cents: int
    attack_cost_credits: int
    prize_pool_cents: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConversationRead(BaseModel):
    """Conversation response payload."""

    conversation_id: int
    user_id: int
    challenge_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MessageCreate(BaseModel):
    """Request payload for posting a conversation message."""

    content: str

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str) -> str:
        """Require non-empty message content."""

        normalized = value.strip()
        if not normalized:
            raise ValueError("content must not be empty")
        return normalized


class MessageRead(BaseModel):
    """Message response payload."""

    message_id: int
    conversation_id: int
    role: str
    content: str
    is_secret_exposure: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class SendMessageResponse(BaseModel):
    """Response containing both user and mock-assistant messages."""

    user_message: MessageRead
    bot_message: MessageRead
    did_expose_secret: bool
    credits_charged: int
    remaining_credits: int
    updated_prize_pool_cents: int
