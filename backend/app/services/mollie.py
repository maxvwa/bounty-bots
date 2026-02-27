from typing import TypedDict

from mollie.api.client import Client

from app.config import settings


class MollieCreatePaymentResult(TypedDict):
    """Relevant fields from Mollie create-payment responses."""

    mollie_payment_id: str
    checkout_url: str
    status: str


class MolliePaymentStatusResult(TypedDict):
    """Relevant fields from Mollie payment-status responses."""

    mollie_payment_id: str
    status: str


def _create_client() -> Client:
    """Build and configure the Mollie API client."""

    if not settings.MOLLIE_API_KEY.strip():
        raise ValueError("MOLLIE_API_KEY is not configured")

    client = Client()
    client.set_api_key(settings.MOLLIE_API_KEY)
    return client


def _format_amount_cents(amount_cents: int) -> str:
    """Convert integer cents to Mollie decimal-string amount format."""

    return f"{amount_cents / 100:.2f}"


def create_mollie_payment(
    *,
    amount_cents: int,
    description: str,
    redirect_url: str,
    webhook_url: str,
    metadata: dict[str, str],
) -> MollieCreatePaymentResult:
    """Create a Mollie payment and return only fields needed by the app."""

    client = _create_client()
    payment = client.payments.create(
        {
            "amount": {
                "currency": "EUR",
                "value": _format_amount_cents(amount_cents),
            },
            "description": description,
            "redirectUrl": redirect_url,
            "webhookUrl": webhook_url,
            "metadata": metadata,
        }
    )
    return {
        "mollie_payment_id": str(payment.id),
        "checkout_url": str(payment.checkout_url),
        "status": str(payment.status),
    }


def get_mollie_payment(mollie_payment_id: str) -> MolliePaymentStatusResult:
    """Fetch a Mollie payment and return its id and status."""

    client = _create_client()
    payment = client.payments.get(mollie_payment_id)
    return {
        "mollie_payment_id": str(payment.id),
        "status": str(payment.status),
    }
