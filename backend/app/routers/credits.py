from urllib.parse import parse_qs

import pendulum
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.credit_purchases import CreditPurchase
from app.models.credit_transactions import CreditTransaction
from app.models.credit_wallets import CreditWallet
from app.models.users import User
from app.routers.helpers import get_next_sequence_value
from app.schemas import (
    CreditBalanceResponse,
    CreditPurchaseCreateRequest,
    CreditPurchaseCreateResponse,
    CreditPurchaseReadResponse,
)
from app.services.credits import get_or_create_wallet_for_update
from app.services.mollie import create_mollie_payment, get_mollie_payment
from app.static_data.economy import CENTS_PER_CREDIT

router = APIRouter(prefix="/credits", tags=["credits"])


@router.post("/purchases", response_model=CreditPurchaseCreateResponse, status_code=201)
async def create_credit_purchase(
    payload: CreditPurchaseCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CreditPurchaseCreateResponse:
    """Create a Mollie checkout for a credit top-up purchase."""

    if payload.amount_cents % CENTS_PER_CREDIT != 0:
        raise HTTPException(
            status_code=400,
            detail=f"amount_cents must be divisible by {CENTS_PER_CREDIT}",
        )

    credits_purchased = payload.amount_cents // CENTS_PER_CREDIT
    if credits_purchased <= 0:
        raise HTTPException(status_code=400, detail="credits_purchased must be greater than zero")

    now = pendulum.now("UTC").naive()
    purchase = CreditPurchase(
        credit_purchase_id=await get_next_sequence_value(db, "credit_purchase_id_seq"),
        user_id=current_user.user_id,
        mollie_payment_id=None,
        amount_cents=payload.amount_cents,
        credits_purchased=credits_purchased,
        status="pending",
        created_at=now,
        updated_at=now,
    )
    db.add(purchase)

    redirect_base_url = settings.MOLLIE_REDIRECT_BASE_URL.rstrip("/")
    redirect_url = (
        f"{redirect_base_url}/challenges?credit_purchase_id={purchase.credit_purchase_id}"
    )
    webhook_base_url = settings.MOLLIE_WEBHOOK_BASE_URL.rstrip("/")
    webhook_url = f"{webhook_base_url}/credits/purchases/webhook"

    try:
        mollie_result = create_mollie_payment(
            amount_cents=purchase.amount_cents,
            description=f"Credit purchase #{purchase.credit_purchase_id}",
            redirect_url=redirect_url,
            webhook_url=webhook_url,
            metadata={
                "credit_purchase_id": str(purchase.credit_purchase_id),
                "user_id": str(current_user.user_id),
                "credits_purchased": str(credits_purchased),
            },
        )
        purchase.mollie_payment_id = mollie_result["mollie_payment_id"]
        purchase.status = mollie_result["status"]
        purchase.updated_at = pendulum.now("UTC").naive()
        await db.commit()
    except (ValueError, RuntimeError) as exc:
        await db.rollback()
        raise HTTPException(status_code=502, detail="Payment provider unavailable") from exc
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Failed to create credit purchase") from exc

    return CreditPurchaseCreateResponse(
        credit_purchase_id=purchase.credit_purchase_id,
        credits_purchased=purchase.credits_purchased,
        amount_cents=purchase.amount_cents,
        status=purchase.status,
        checkout_url=mollie_result["checkout_url"],
    )


@router.post("/purchases/webhook")
async def credit_purchase_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Handle Mollie purchase status callbacks and credit wallets on paid transitions."""

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

    purchase_result = await db.execute(
        select(CreditPurchase).where(CreditPurchase.mollie_payment_id == mollie_payment_id)
    )
    purchase = purchase_result.scalars().first()
    if purchase is None:
        return {"status": "ignored"}

    try:
        mollie_payment = get_mollie_payment(mollie_payment_id)
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=502, detail="Payment provider unavailable") from exc

    next_status = mollie_payment["status"]
    if purchase.status == next_status:
        return {"status": "ok"}

    now = pendulum.now("UTC").naive()
    if purchase.status != "paid" and next_status == "paid":
        wallet = await get_or_create_wallet_for_update(db, purchase.user_id)
        wallet.balance_credits += purchase.credits_purchased
        wallet.updated_at = now

        db.add(
            CreditTransaction(
                credit_transaction_id=await get_next_sequence_value(
                    db, "credit_transaction_id_seq"
                ),
                user_id=purchase.user_id,
                challenge_id=None,
                credit_purchase_id=purchase.credit_purchase_id,
                delta_credits=purchase.credits_purchased,
                transaction_type="purchase",
                created_at=now,
            )
        )

    purchase.status = next_status
    purchase.updated_at = now
    await db.commit()
    return {"status": "ok"}


@router.get("/purchases/{credit_purchase_id}", response_model=CreditPurchaseReadResponse)
async def get_credit_purchase(
    credit_purchase_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CreditPurchaseReadResponse:
    """Return one credit purchase record owned by the authenticated user."""

    result = await db.execute(
        select(CreditPurchase).where(
            CreditPurchase.credit_purchase_id == credit_purchase_id,
            CreditPurchase.user_id == current_user.user_id,
        )
    )
    purchase = result.scalars().first()
    if purchase is None:
        raise HTTPException(status_code=404, detail="Credit purchase not found")
    return CreditPurchaseReadResponse.model_validate(purchase)


@router.get("/balance", response_model=CreditBalanceResponse)
async def get_credit_balance(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CreditBalanceResponse:
    """Return the authenticated user's available credit balance."""

    result = await db.execute(
        select(CreditWallet.balance_credits).where(CreditWallet.user_id == current_user.user_id)
    )
    balance_value = result.scalar_one_or_none()
    if balance_value is None:
        return CreditBalanceResponse(balance_credits=0)
    return CreditBalanceResponse(balance_credits=int(balance_value))
