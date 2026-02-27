from httpx import AsyncClient
from pytest import MonkeyPatch


async def _register_and_get_token(client: AsyncClient, email: str) -> str:
    """Create a user and return its bearer token."""

    response = await client.post(
        "/auth/register",
        json={"email": email, "password": "supersecret"},
    )
    assert response.status_code == 201
    return str(response.json()["access_token"])


async def test_create_and_get_payment_status(
    client: AsyncClient,
    monkeypatch: MonkeyPatch,
) -> None:
    """Create payment should return checkout data and persist local status."""

    def _mock_create_payment(**_: object) -> dict[str, str]:
        return {
            "mollie_payment_id": "tr_test_1",
            "checkout_url": "https://checkout.example/tr_test_1",
            "status": "open",
        }

    monkeypatch.setattr("app.routers.payments.create_mollie_payment", _mock_create_payment)

    token = await _register_and_get_token(client, "payments@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    create_response = await client.post("/payments", headers=headers, json={"challenge_id": 1})
    assert create_response.status_code == 201
    create_payload = create_response.json()
    assert create_payload["checkout_url"].startswith("https://checkout.example/")
    assert create_payload["status"] == "open"
    payment_id = create_payload["payment_id"]

    status_response = await client.get(f"/payments/{payment_id}", headers=headers)
    assert status_response.status_code == 200
    status_payload = status_response.json()
    assert status_payload["mollie_payment_id"] == "tr_test_1"
    assert status_payload["status"] == "open"


async def test_payment_webhook_updates_status(
    client: AsyncClient,
    monkeypatch: MonkeyPatch,
) -> None:
    """Webhook callback should update persisted payment status idempotently."""

    def _mock_create_payment(**_: object) -> dict[str, str]:
        return {
            "mollie_payment_id": "tr_test_2",
            "checkout_url": "https://checkout.example/tr_test_2",
            "status": "open",
        }

    def _mock_get_payment(_: str) -> dict[str, str]:
        return {"mollie_payment_id": "tr_test_2", "status": "paid"}

    monkeypatch.setattr("app.routers.payments.create_mollie_payment", _mock_create_payment)
    monkeypatch.setattr("app.routers.payments.get_mollie_payment", _mock_get_payment)

    token = await _register_and_get_token(client, "webhook@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    create_response = await client.post("/payments", headers=headers, json={"challenge_id": 1})
    payment_id = create_response.json()["payment_id"]

    webhook_response = await client.post("/payments/webhook", data={"id": "tr_test_2"})
    assert webhook_response.status_code == 200
    assert webhook_response.json()["status"] == "ok"

    status_response = await client.get(f"/payments/{payment_id}", headers=headers)
    assert status_response.status_code == 200
    assert status_response.json()["status"] == "paid"


async def test_payment_ownership_enforced(
    client: AsyncClient,
    monkeypatch: MonkeyPatch,
) -> None:
    """Users should not access payment records owned by other users."""

    def _mock_create_payment(**_: object) -> dict[str, str]:
        return {
            "mollie_payment_id": "tr_test_3",
            "checkout_url": "https://checkout.example/tr_test_3",
            "status": "open",
        }

    monkeypatch.setattr("app.routers.payments.create_mollie_payment", _mock_create_payment)

    token_a = await _register_and_get_token(client, "owner@example.com")
    token_b = await _register_and_get_token(client, "other@example.com")

    create_response = await client.post(
        "/payments",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"challenge_id": 1},
    )
    payment_id = create_response.json()["payment_id"]

    response = await client.get(
        f"/payments/{payment_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert response.status_code == 404
