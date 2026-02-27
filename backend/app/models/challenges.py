from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, Sequence, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Challenge(Base):
    """Prompt injection challenge with secret, pricing, and prize pool."""

    __tablename__ = "challenges"

    challenge_id: Mapped[int] = mapped_column(
        BigInteger, Sequence("challenge_id_seq"), primary_key=True
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    difficulty: Mapped[str] = mapped_column(Text, nullable=False)
    secret: Mapped[str] = mapped_column(Text, nullable=False)
    cost_per_attempt_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    attack_cost_credits: Mapped[int] = mapped_column(BigInteger, nullable=False)
    prize_pool_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False)
