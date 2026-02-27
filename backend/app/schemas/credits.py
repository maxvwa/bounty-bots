from datetime import datetime

from pydantic import BaseModel, field_validator


class CreditPurchaseCreateRequest(BaseModel):
    """Request payload for creating a credit purchase checkout."""

    amount_cents: int

    @field_validator("amount_cents")
    @classmethod
    def validate_amount_cents(cls, value: int) -> int:
        """Require a positive purchase amount."""

        if value <= 0:
            raise ValueError("amount_cents must be greater than zero")
        return value


class CreditPurchaseCreateResponse(BaseModel):
    """Response payload for a newly created credit purchase."""

    credit_purchase_id: int
    credits_purchased: int
    amount_cents: int
    status: str
    checkout_url: str


class CreditPurchaseReadResponse(BaseModel):
    """Response payload for a stored credit purchase."""

    credit_purchase_id: int
    user_id: int
    mollie_payment_id: str | None
    amount_cents: int
    credits_purchased: int
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CreditBalanceResponse(BaseModel):
    """Response payload for wallet balance reads."""

    balance_credits: int
