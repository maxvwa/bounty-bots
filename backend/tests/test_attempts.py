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


async def _create_paid_payment(
    client: AsyncClient,
    monkeypatch: MonkeyPatch,
    token: str,
    challenge_id: int,
    mollie_payment_id: str,
) -> int:
    """Create a payment and advance it to paid using the webhook endpoint."""

    def _mock_create_payment(**_: object) -> dict[str, str]:
        return {
            "mollie_payment_id": mollie_payment_id,
            "checkout_url": f"https://checkout.example/{mollie_payment_id}",
            "status": "open",
        }

    def _mock_get_payment(_: str) -> dict[str, str]:
        return {"mollie_payment_id": mollie_payment_id, "status": "paid"}

    monkeypatch.setattr("app.routers.payments.create_mollie_payment", _mock_create_payment)
    monkeypatch.setattr("app.routers.payments.get_mollie_payment", _mock_get_payment)

    headers = {"Authorization": f"Bearer {token}"}
    create_response = await client.post(
        "/payments",
        headers=headers,
        json={"challenge_id": challenge_id},
    )
    assert create_response.status_code == 201
    payment_id = int(create_response.json()["payment_id"])

    webhook_response = await client.post("/payments/webhook", data={"id": mollie_payment_id})
    assert webhook_response.status_code == 200
    assert webhook_response.json()["status"] == "ok"
    return payment_id


async def test_submit_secret_requires_paid_payment(
    client: AsyncClient,
    monkeypatch: MonkeyPatch,
) -> None:
    """Submitting with unpaid payments should be rejected."""

    def _mock_create_payment(**_: object) -> dict[str, str]:
        return {
            "mollie_payment_id": "tr_open_1",
            "checkout_url": "https://checkout.example/tr_open_1",
            "status": "open",
        }

    monkeypatch.setattr("app.routers.payments.create_mollie_payment", _mock_create_payment)

    token = await _register_and_get_token(client, "attempt-open@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    create_response = await client.post("/payments", headers=headers, json={"challenge_id": 1})
    payment_id = create_response.json()["payment_id"]

    submit_response = await client.post(
        "/attempts",
        headers=headers,
        json={
            "challenge_id": 1,
            "payment_id": payment_id,
            "submitted_secret": "saffron-kite",
        },
    )
    assert submit_response.status_code == 402


async def test_submit_secret_correct_and_incorrect(
    client: AsyncClient,
    monkeypatch: MonkeyPatch,
) -> None:
    """Secret submission should return correctness without leaking secrets."""

    token = await _register_and_get_token(client, "attempt-results@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    first_payment_id = await _create_paid_payment(client, monkeypatch, token, 1, "tr_paid_1")
    correct_response = await client.post(
        "/attempts",
        headers=headers,
        json={
            "challenge_id": 1,
            "payment_id": first_payment_id,
            "submitted_secret": "saffron-kite",
        },
    )
    assert correct_response.status_code == 201
    assert correct_response.json()["attempt"]["is_correct"] is True

    second_payment_id = await _create_paid_payment(client, monkeypatch, token, 1, "tr_paid_2")
    incorrect_response = await client.post(
        "/attempts",
        headers=headers,
        json={
            "challenge_id": 1,
            "payment_id": second_payment_id,
            "submitted_secret": "wrong-secret",
        },
    )
    assert incorrect_response.status_code == 201
    assert incorrect_response.json()["attempt"]["is_correct"] is False


async def test_submit_secret_blocks_payment_reuse(
    client: AsyncClient,
    monkeypatch: MonkeyPatch,
) -> None:
    """A paid payment id can only be used for one submission attempt."""

    token = await _register_and_get_token(client, "attempt-reuse@example.com")
    headers = {"Authorization": f"Bearer {token}"}
    payment_id = await _create_paid_payment(client, monkeypatch, token, 1, "tr_paid_reuse")

    first_response = await client.post(
        "/attempts",
        headers=headers,
        json={
            "challenge_id": 1,
            "payment_id": payment_id,
            "submitted_secret": "saffron-kite",
        },
    )
    assert first_response.status_code == 201

    second_response = await client.post(
        "/attempts",
        headers=headers,
        json={
            "challenge_id": 1,
            "payment_id": payment_id,
            "submitted_secret": "saffron-kite",
        },
    )
    assert second_response.status_code == 409


async def test_list_attempts_with_filter(
    client: AsyncClient,
    monkeypatch: MonkeyPatch,
) -> None:
    """Attempt list endpoint should support challenge_id filtering."""

    token = await _register_and_get_token(client, "attempt-list@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    payment_one = await _create_paid_payment(client, monkeypatch, token, 1, "tr_paid_list_1")
    payment_two = await _create_paid_payment(client, monkeypatch, token, 2, "tr_paid_list_2")

    first_attempt = await client.post(
        "/attempts",
        headers=headers,
        json={
            "challenge_id": 1,
            "payment_id": payment_one,
            "submitted_secret": "wrong",
        },
    )
    assert first_attempt.status_code == 201

    second_attempt = await client.post(
        "/attempts",
        headers=headers,
        json={
            "challenge_id": 2,
            "payment_id": payment_two,
            "submitted_secret": "wrong",
        },
    )
    assert second_attempt.status_code == 201

    list_response = await client.get("/attempts", headers=headers)
    assert list_response.status_code == 200
    assert len(list_response.json()) == 2

    filtered_response = await client.get("/attempts?challenge_id=1", headers=headers)
    assert filtered_response.status_code == 200
    filtered_payload = filtered_response.json()
    assert len(filtered_payload) == 1
    assert filtered_payload[0]["challenge_id"] == 1
