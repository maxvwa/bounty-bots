from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Sequence, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Timezone(Base):
    """Timezone lookup row used for stable low-cardinality references."""

    __tablename__ = "timezones"

    timezone_id: Mapped[int] = mapped_column(
        BigInteger,
        Sequence("timezone_id_seq"),
        primary_key=True,
    )
    timezone_name: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False)
