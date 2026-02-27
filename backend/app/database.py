import logging
from collections.abc import AsyncGenerator
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

logger = logging.getLogger(__name__)

engine = create_async_engine(settings.DATABASE_URL, echo=settings.DEBUG)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    """Base class for SQLAlchemy ORM models."""


DB_INIT_ORDER = [
    "timezones.sql",
    "users.sql",
    "challenges.sql",
    "conversations.sql",
    "messages.sql",
    "payments.sql",
    "attempts.sql",
]


def _candidate_db_dirs() -> list[Path]:
    """Return candidate schema directories for local and container runtimes."""

    app_dir = Path(__file__).resolve().parent
    backend_dir = app_dir.parent
    root_dir = backend_dir.parent
    return [
        root_dir / "db",
        backend_dir / "db",
        Path("/app/db"),
    ]


def _find_db_dir() -> Path:
    """Resolve the schema directory that contains SQL initialization files."""

    for candidate in _candidate_db_dirs():
        if candidate.exists():
            return candidate
    candidate_text = ", ".join(str(path) for path in _candidate_db_dirs())
    raise FileNotFoundError(f"Could not find db directory. Tried: {candidate_text}")


async def init_db_schema(db: AsyncSession) -> None:
    """Initialize schema by applying SQL files in dependency-safe order."""

    db_dir = _find_db_dir()
    for sql_file_name in DB_INIT_ORDER:
        sql_path = db_dir / sql_file_name
        if not sql_path.exists():
            raise FileNotFoundError(f"Required schema file missing: {sql_path}")

        sql_content = sql_path.read_text(encoding="utf-8")
        statements = [
            statement.strip()
            for statement in sql_content.split(";")
            if statement.strip()
        ]

        for statement in statements:
            await db.execute(text(statement))

    await db.commit()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield a request-scoped async database session."""

    async with AsyncSessionLocal() as session:
        yield session
