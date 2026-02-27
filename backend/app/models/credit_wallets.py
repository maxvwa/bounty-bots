from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Sequence
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class CreditWallet(Base):
    """Current credit balance per user with one wallet per user."""

    __tablename__ = "credit_wallets"

    credit_wallet_id: Mapped[int] = mapped_column(
        BigInteger,
        Sequence("credit_wallet_id_seq"),
        primary_key=True,
    )
    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.user_id"),
        nullable=False,
        unique=True,
    )
    balance_credits: Mapped[int] = mapped_column(BigInteger, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False)
