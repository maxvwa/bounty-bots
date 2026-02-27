import pendulum
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.attempts import Attempt
from app.models.challenges import Challenge
from app.models.payments import Payment
from app.models.users import User
from app.routers.helpers import get_next_sequence_value
from app.schemas import AttemptRead, AttemptResponse, SecretSubmitRequest

router = APIRouter(prefix="/attempts", tags=["attempts"])


@router.post("", response_model=AttemptResponse, status_code=201)
async def submit_secret(
    payload: SecretSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AttemptResponse:
    """Submit a paid secret guess for a challenge."""

    payment_result = await db.execute(
        select(Payment).where(
            Payment.payment_id == payload.payment_id,
            Payment.user_id == current_user.user_id,
            Payment.challenge_id == payload.challenge_id,
        )
    )
    payment = payment_result.scalars().first()
    if payment is None or payment.status != "paid":
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="A paid payment is required before submitting a secret",
        )

    used_attempt_result = await db.execute(
        select(Attempt.attempt_id).where(Attempt.payment_id == payment.payment_id)
    )
    if used_attempt_result.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="Payment already used for an attempt")

    challenge_result = await db.execute(
        select(Challenge).where(Challenge.challenge_id == payload.challenge_id)
    )
    challenge = challenge_result.scalars().first()
    if challenge is None:
        raise HTTPException(status_code=404, detail="Challenge not found")

    normalized_submission = payload.submitted_secret.strip().lower()
    normalized_secret = challenge.secret.strip().lower()
    is_correct = normalized_submission == normalized_secret

    now = pendulum.now("UTC").naive()
    attempt = Attempt(
        attempt_id=await get_next_sequence_value(db, "attempt_id_seq"),
        user_id=current_user.user_id,
        challenge_id=payload.challenge_id,
        payment_id=payment.payment_id,
        submitted_secret=payload.submitted_secret,
        is_correct=is_correct,
        created_at=now,
    )
    db.add(attempt)
    await db.commit()

    result_message = (
        "Correct secret submitted. Your attempt is successful."
        if is_correct
        else "Incorrect secret submitted. Please try again with a new payment."
    )
    return AttemptResponse(attempt=AttemptRead.model_validate(attempt), message=result_message)


@router.get("", response_model=list[AttemptRead])
async def list_attempts(
    challenge_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[AttemptRead]:
    """List authenticated user attempts with optional challenge filtering."""

    query = select(Attempt).where(Attempt.user_id == current_user.user_id)
    if challenge_id is not None:
        query = query.where(Attempt.challenge_id == challenge_id)

    result = await db.execute(query.order_by(Attempt.attempt_id.desc()))
    attempts = result.scalars().all()
    return [AttemptRead.model_validate(attempt) for attempt in attempts]
