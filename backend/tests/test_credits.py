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


async def test_credit_purchase_webhook_updates_balance_once(
    client: AsyncClient,
    monkeypatch: MonkeyPatch,
) -> None:
    """Paid webhook transitions should credit balance once even if replayed."""

    def _mock_create_payment(**_: object) -> dict[str, str]:
        return {
            "mollie_payment_id": "tr_credit_test_1",
            "checkout_url": "https://checkout.example/tr_credit_test_1",
            "status": "open",
        }

    def _mock_get_payment(_: str) -> dict[str, str]:
        return {"mollie_payment_id": "tr_credit_test_1", "status": "paid"}

    monkeypatch.setattr("app.routers.credits.create_mollie_payment", _mock_create_payment)
    monkeypatch.setattr("app.routers.credits.get_mollie_payment", _mock_get_payment)

    token = await _register_and_get_token(client, "credits@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    create_response = await client.post(
        "/credits/purchases",
        headers=headers,
        json={"amount_cents": 1200},
    )
    assert create_response.status_code == 201
    create_payload = create_response.json()
    assert create_payload["credits_purchased"] == 120

    initial_balance_response = await client.get("/credits/balance", headers=headers)
    assert initial_balance_response.status_code == 200
    assert initial_balance_response.json()["balance_credits"] == 0

    webhook_response = await client.post(
        "/credits/purchases/webhook",
        data={"id": "tr_credit_test_1"},
    )
    assert webhook_response.status_code == 200

    second_webhook_response = await client.post(
        "/credits/purchases/webhook",
        data={"id": "tr_credit_test_1"},
    )
    assert second_webhook_response.status_code == 200

    balance_response = await client.get("/credits/balance", headers=headers)
    assert balance_response.status_code == 200
    assert balance_response.json()["balance_credits"] == 120


async def test_credit_purchase_requires_divisible_amount(client: AsyncClient) -> None:
    """Purchase amounts must align with the cents-per-credit conversion."""

    token = await _register_and_get_token(client, "credits-invalid@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    response = await client.post(
        "/credits/purchases",
        headers=headers,
        json={"amount_cents": 125},
    )
    assert response.status_code == 400


async def test_credit_purchase_ownership_enforced(
    client: AsyncClient,
    monkeypatch: MonkeyPatch,
) -> None:
    """Users must not access other users' credit purchase records."""

    def _mock_create_payment(**_: object) -> dict[str, str]:
        return {
            "mollie_payment_id": "tr_credit_test_2",
            "checkout_url": "https://checkout.example/tr_credit_test_2",
            "status": "open",
        }

    monkeypatch.setattr("app.routers.credits.create_mollie_payment", _mock_create_payment)

    token_a = await _register_and_get_token(client, "credits-owner@example.com")
    token_b = await _register_and_get_token(client, "credits-other@example.com")

    create_response = await client.post(
        "/credits/purchases",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"amount_cents": 1000},
    )
    assert create_response.status_code == 201
    purchase_id = create_response.json()["credit_purchase_id"]

    response = await client.get(
        f"/credits/purchases/{purchase_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert response.status_code == 404
