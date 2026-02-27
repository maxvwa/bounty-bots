from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Sequence, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Payment(Base):
    """Payment intent and status for a challenge attempt purchase."""

    __tablename__ = "payments"

    payment_id: Mapped[int] = mapped_column(
        BigInteger,
        Sequence("payment_id_seq"),
        primary_key=True,
    )
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.user_id"), nullable=False)
    challenge_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("challenges.challenge_id"),
        nullable=False,
    )
    mollie_payment_id: Mapped[str | None] = mapped_column(Text, unique=True, nullable=True)
    amount_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False)
