from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Sequence, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Attempt(Base):
    """Submitted secret guess linked to user, challenge, and optional payment."""

    __tablename__ = "attempts"

    attempt_id: Mapped[int] = mapped_column(
        BigInteger,
        Sequence("attempt_id_seq"),
        primary_key=True,
    )
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.user_id"), nullable=False)
    challenge_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("challenges.challenge_id"),
        nullable=False,
    )
    payment_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("payments.payment_id"),
        nullable=True,
    )
    submitted_secret: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False)
