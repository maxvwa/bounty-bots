import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, DateTime, ForeignKey, Sequence, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.timezones import Timezone


class User(Base):
    """Example user model with a stable timezone foreign-key reference."""

    __tablename__ = "users"

    user_id: Mapped[int] = mapped_column(BigInteger, Sequence("user_id_seq"), primary_key=True)
    reference: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), unique=True, index=True)
    timezone_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("timezones.timezone_id"),
        nullable=False,
    )
    email: Mapped[str | None] = mapped_column(Text, unique=True, nullable=True)
    password_hash: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False)

    timezone: Mapped["Timezone"] = relationship()
