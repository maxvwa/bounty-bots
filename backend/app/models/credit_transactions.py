from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Sequence, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class CreditTransaction(Base):
    """Immutable credit ledger row for top-ups and attack spending."""

    __tablename__ = "credit_transactions"

    credit_transaction_id: Mapped[int] = mapped_column(
        BigInteger,
        Sequence("credit_transaction_id_seq"),
        primary_key=True,
    )
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.user_id"), nullable=False)
    challenge_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("challenges.challenge_id"),
        nullable=True,
    )
    credit_purchase_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("credit_purchases.credit_purchase_id"),
        nullable=True,
    )
    delta_credits: Mapped[int] = mapped_column(BigInteger, nullable=False)
    transaction_type: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False)
