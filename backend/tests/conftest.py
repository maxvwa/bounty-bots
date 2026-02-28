import os
from collections.abc import AsyncGenerator

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine

from app.config import settings
from app.database import get_db, init_db_schema
from app.main import app, seed_challenges, seed_timezones

_BASE_URL = os.environ.get("TEST_DATABASE_BASE_URL", settings.DATABASE_URL.rsplit("/", 1)[0])
TEST_DATABASE_URL = f"{_BASE_URL}/app_db_test"


@pytest_asyncio.fixture(scope="session", autouse=True)
async def test_settings_overrides() -> AsyncGenerator[None]:
    """Force auth-sensitive tests to run with auth enforcement enabled."""

    previous_demo_skip_auth = settings.DEMO_SKIP_AUTH
    previous_demo_skip_credits_checkout = settings.DEMO_SKIP_CREDITS_CHECKOUT
    settings.DEMO_SKIP_AUTH = False
    settings.DEMO_SKIP_CREDITS_CHECKOUT = False
    try:
        yield
    finally:
        settings.DEMO_SKIP_AUTH = previous_demo_skip_auth
        settings.DEMO_SKIP_CREDITS_CHECKOUT = previous_demo_skip_credits_checkout


@pytest_asyncio.fixture(scope="session")
async def test_engine() -> AsyncGenerator[AsyncEngine]:
    """Create and drop a dedicated test database for the session."""

    admin_engine = create_async_engine(f"{_BASE_URL}/postgres", isolation_level="AUTOCOMMIT")
    async with admin_engine.connect() as conn:
        await conn.execute(text("DROP DATABASE IF EXISTS app_db_test"))
        await conn.execute(text("CREATE DATABASE app_db_test"))
    await admin_engine.dispose()

    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with AsyncSession(engine) as session:
        await init_db_schema(session)
        await seed_timezones(session)
        await seed_challenges(session)

    yield engine

    await engine.dispose()

    admin_engine = create_async_engine(f"{_BASE_URL}/postgres", isolation_level="AUTOCOMMIT")
    async with admin_engine.connect() as conn:
        await conn.execute(text("DROP DATABASE IF EXISTS app_db_test"))
    await admin_engine.dispose()


@pytest_asyncio.fixture
async def db_session(test_engine: AsyncEngine) -> AsyncGenerator[AsyncSession]:
    """Provide a transactional async session per test case."""

    conn = await test_engine.connect()
    outer_transaction = await conn.begin()
    session = AsyncSession(bind=conn, expire_on_commit=False)

    @event.listens_for(session.sync_session, "after_transaction_end")
    def restart_savepoint(session_sync: object, transaction: object) -> None:
        """Re-open nested transactions after endpoint commits within tests."""

        is_nested = bool(getattr(transaction, "nested", False))
        parent = getattr(transaction, "_parent", None)
        parent_is_nested = bool(getattr(parent, "nested", False))
        if is_nested and not parent_is_nested:
            begin_nested = getattr(session_sync, "begin_nested", None)
            if callable(begin_nested):
                begin_nested()

    await session.begin_nested()

    yield session

    await session.close()
    await outer_transaction.rollback()
    await conn.close()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient]:
    """Provide an HTTP client with the app DB dependency overridden."""

    async def _override_get_db() -> AsyncGenerator[AsyncSession]:
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as async_client:
        yield async_client

    app.dependency_overrides.clear()
