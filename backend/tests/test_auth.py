from httpx import AsyncClient


async def test_register_and_login_flow(client: AsyncClient) -> None:
    """Register and login should both return bearer access tokens."""

    register_response = await client.post(
        "/auth/register",
        json={"email": "test@example.com", "password": "supersecret"},
    )
    assert register_response.status_code == 201
    register_payload = register_response.json()
    assert register_payload["token_type"] == "bearer"
    assert register_payload["access_token"]

    login_response = await client.post(
        "/auth/login",
        json={"email": "test@example.com", "password": "supersecret"},
    )
    assert login_response.status_code == 200
    login_payload = login_response.json()
    assert login_payload["token_type"] == "bearer"
    assert login_payload["access_token"]


async def test_auth_me_requires_token(client: AsyncClient) -> None:
    """Current user endpoint should reject unauthenticated requests."""

    response = await client.get("/auth/me")
    assert response.status_code == 401


async def test_auth_me_with_token(client: AsyncClient) -> None:
    """Current user endpoint should return user info for valid tokens."""

    register_response = await client.post(
        "/auth/register",
        json={"email": "me@example.com", "password": "supersecret"},
    )
    token = register_response.json()["access_token"]

    response = await client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["email"] == "me@example.com"
    assert payload["timezone_id"] == 1
