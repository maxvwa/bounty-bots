from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Sequence, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class CreditPurchase(Base):
    """Mollie-backed credit purchase record."""

    __tablename__ = "credit_purchases"

    credit_purchase_id: Mapped[int] = mapped_column(
        BigInteger,
        Sequence("credit_purchase_id_seq"),
        primary_key=True,
    )
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.user_id"), nullable=False)
    mollie_payment_id: Mapped[str | None] = mapped_column(Text, unique=True, nullable=True)
    amount_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    credits_purchased: Mapped[int] = mapped_column(BigInteger, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False)
