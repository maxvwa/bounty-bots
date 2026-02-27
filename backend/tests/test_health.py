from httpx import AsyncClient


async def test_health_check(client: AsyncClient) -> None:
    """Health endpoint returns liveness status."""

    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


async def test_db_health_check(client: AsyncClient) -> None:
    """DB health endpoint verifies database connectivity."""

    response = await client.get("/health/db")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "connected"}
