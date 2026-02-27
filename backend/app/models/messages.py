from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Sequence, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Message(Base):
    """Single message inside a user challenge conversation."""

    __tablename__ = "messages"

    message_id: Mapped[int] = mapped_column(
        BigInteger,
        Sequence("message_id_seq"),
        primary_key=True,
    )
    conversation_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("conversations.conversation_id"),
        nullable=False,
    )
    role: Mapped[str] = mapped_column(Text, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False)
