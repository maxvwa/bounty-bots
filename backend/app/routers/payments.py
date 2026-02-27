from urllib.parse import parse_qs

import pendulum
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.challenges import Challenge
from app.models.payments import Payment
from app.models.users import User
from app.routers.helpers import get_next_sequence_value
from app.schemas import PaymentCreateRequest, PaymentCreateResponse, PaymentStatusResponse
from app.services.mollie import create_mollie_payment, get_mollie_payment

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("", response_model=PaymentCreateResponse, status_code=201)
async def create_payment(
    payload: PaymentCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaymentCreateResponse:
    """Create a payment in Mollie and persist the local payment record."""

    challenge_result = await db.execute(
        select(Challenge).where(
            Challenge.challenge_id == payload.challenge_id,
            Challenge.is_active.is_(True),
        )
    )
    challenge = challenge_result.scalars().first()
    if challenge is None:
        raise HTTPException(status_code=404, detail="Challenge not found")

    now = pendulum.now("UTC").naive()
    payment = Payment(
        payment_id=await get_next_sequence_value(db, "payment_id_seq"),
        user_id=current_user.user_id,
        challenge_id=challenge.challenge_id,
        mollie_payment_id=None,
        amount_cents=challenge.cost_per_attempt_cents,
        status="pending",
        created_at=now,
        updated_at=now,
    )
    db.add(payment)

    redirect_base_url = settings.MOLLIE_REDIRECT_BASE_URL.rstrip("/")
    redirect_url = (
        f"{redirect_base_url}/challenges/{challenge.challenge_id}?payment_id={payment.payment_id}"
    )
    webhook_base_url = settings.MOLLIE_WEBHOOK_BASE_URL.rstrip("/")
    webhook_url = f"{webhook_base_url}/payments/webhook"

    try:
        mollie_result = create_mollie_payment(
            amount_cents=payment.amount_cents,
            description=f"Challenge attempt #{challenge.challenge_id}",
            redirect_url=redirect_url,
            webhook_url=webhook_url,
            metadata={
                "payment_id": str(payment.payment_id),
                "challenge_id": str(challenge.challenge_id),
                "user_id": str(current_user.user_id),
            },
        )
        payment.mollie_payment_id = mollie_result["mollie_payment_id"]
        payment.status = mollie_result["status"]
        payment.updated_at = pendulum.now("UTC").naive()
        await db.commit()
    except (ValueError, RuntimeError) as exc:
        await db.rollback()
        raise HTTPException(status_code=502, detail="Payment provider unavailable") from exc
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Failed to create payment") from exc

    return PaymentCreateResponse(
        payment_id=payment.payment_id,
        checkout_url=mollie_result["checkout_url"],
        status=payment.status,
    )


@router.post("/webhook")
async def payment_webhook(request: Request, db: AsyncSession = Depends(get_db)) -> dict[str, str]:
    """Handle Mollie webhook updates and persist the latest payment status."""

    content_type = request.headers.get("content-type", "")
    mollie_payment_id = ""
    if "multipart/form-data" in content_type:
        form = await request.form()
        mollie_payment_id = str(form.get("id") or "")
    else:
        body = (await request.body()).decode("utf-8")
        parsed = parse_qs(body)
        mollie_payment_id = parsed.get("id", [""])[0]

    if not mollie_payment_id:
        raise HTTPException(status_code=400, detail="Missing Mollie payment id")

    payment_result = await db.execute(
        select(Payment).where(Payment.mollie_payment_id == mollie_payment_id)
    )
    payment = payment_result.scalars().first()
    if payment is None:
        return {"status": "ignored"}

    try:
        mollie_payment = get_mollie_payment(mollie_payment_id)
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=502, detail="Payment provider unavailable") from exc

    if payment.status != mollie_payment["status"]:
        payment.status = mollie_payment["status"]
        payment.updated_at = pendulum.now("UTC").naive()
        await db.commit()

    return {"status": "ok"}


@router.get("/{payment_id}", response_model=PaymentStatusResponse)
async def get_payment_status(
    payment_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaymentStatusResponse:
    """Return payment status for the authenticated owner."""

    result = await db.execute(
        select(Payment).where(
            Payment.payment_id == payment_id,
            Payment.user_id == current_user.user_id,
        )
    )
    payment = result.scalars().first()
    if payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    return PaymentStatusResponse.model_validate(payment)
