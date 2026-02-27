import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import pendulum
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db, init_db_schema
from app.models.timezones import Timezone
from app.routers import health, users
from app.static_data.timezones import TimezoneEnum

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Initialize schema and seed static data at startup."""

    logger.info("Starting template backend")
    settings.validate_runtime_config()

    async for db in get_db():
        await init_db_schema(db)
        await seed_timezones(db)
        break

    yield
    logger.info("Shutting down template backend")


async def seed_timezones(db: AsyncSession) -> None:
    """Seed stable timezone rows used by example user records."""

    now = pendulum.now("UTC").naive()
    for timezone_enum in TimezoneEnum:
        result = await db.execute(
            select(Timezone).where(Timezone.timezone_id == int(timezone_enum.value))
        )
        existing_timezone = result.scalars().first()
        if existing_timezone is not None:
            continue
        db.add(
            Timezone(
                timezone_id=int(timezone_enum.value),
                timezone_name=timezone_enum.timezone_name,
                created_at=now,
            )
        )
    await db.commit()


app = FastAPI(
    title="Starter Template API",
    description="Reusable FastAPI + Postgres local development scaffold",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(users.router)


@app.get("/")
async def root() -> dict[str, str]:
    """Return basic API metadata."""

    return {"message": "Starter Template API", "docs": "/docs"}
