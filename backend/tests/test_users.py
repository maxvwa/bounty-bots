from httpx import AsyncClient


async def test_create_user(client: AsyncClient) -> None:
    """Create an example user with a seeded timezone."""

    response = await client.post("/users", json={"timezone_name": "Europe/Amsterdam"})
    assert response.status_code == 201

    payload = response.json()
    assert payload["timezone_name"] == "Europe/Amsterdam"
    assert "reference" in payload


async def test_list_users(client: AsyncClient) -> None:
    """List endpoint returns created users."""

    create_response = await client.post("/users", json={"timezone_name": "UTC"})
    assert create_response.status_code == 201

    response = await client.get("/users")
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, list)
    assert len(payload) >= 1
