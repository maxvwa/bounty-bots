from datetime import datetime

from pydantic import BaseModel


class PaymentCreateRequest(BaseModel):
    """Request payload to initiate a challenge payment."""

    challenge_id: int


class PaymentCreateResponse(BaseModel):
    """Response payload for newly created payments."""

    payment_id: int
    checkout_url: str
    status: str


class PaymentStatusResponse(BaseModel):
    """Response payload for persisted payment status records."""

    payment_id: int
    user_id: int
    challenge_id: int
    mollie_payment_id: str | None
    amount_cents: int
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
