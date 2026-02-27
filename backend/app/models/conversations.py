from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Sequence
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Conversation(Base):
    """Conversation between a user and a challenge bot session."""

    __tablename__ = "conversations"

    conversation_id: Mapped[int] = mapped_column(
        BigInteger,
        Sequence("conversation_id_seq"),
        primary_key=True,
    )
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.user_id"), nullable=False)
    challenge_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("challenges.challenge_id"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False)
