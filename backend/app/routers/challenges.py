import pendulum
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.challenges import Challenge
from app.models.conversations import Conversation
from app.models.credit_transactions import CreditTransaction
from app.models.messages import Message
from app.models.users import User
from app.routers.helpers import get_next_sequence_value
from app.schemas import (
    ChallengeDetail,
    ChallengeListItem,
    ConversationRead,
    MessageCreate,
    MessageRead,
    SendMessageResponse,
)
from app.services.credits import get_or_create_wallet_for_update
from app.services.mock_bot import get_mock_reply
from app.static_data.economy import CENTS_PER_CREDIT

router = APIRouter(tags=["challenges"])


async def _get_owned_conversation(
    db: AsyncSession,
    conversation_id: int,
    user_id: int,
) -> Conversation:
    """Load a conversation when it belongs to the authenticated user."""

    result = await db.execute(
        select(Conversation).where(
            Conversation.conversation_id == conversation_id,
            Conversation.user_id == user_id,
        )
    )
    conversation = result.scalars().first()
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@router.get("/challenges", response_model=list[ChallengeListItem])
async def list_challenges(db: AsyncSession = Depends(get_db)) -> list[ChallengeListItem]:
    """Return active challenges for public browsing."""

    result = await db.execute(
        select(Challenge).where(Challenge.is_active.is_(True)).order_by(Challenge.challenge_id.asc())
    )
    challenges = result.scalars().all()
    return [ChallengeListItem.model_validate(challenge) for challenge in challenges]


@router.get("/challenges/{challenge_id}", response_model=ChallengeDetail)
async def get_challenge(challenge_id: int, db: AsyncSession = Depends(get_db)) -> ChallengeDetail:
    """Return one active challenge by id."""

    result = await db.execute(
        select(Challenge).where(
            Challenge.challenge_id == challenge_id,
            Challenge.is_active.is_(True),
        )
    )
    challenge = result.scalars().first()
    if challenge is None:
        raise HTTPException(status_code=404, detail="Challenge not found")
    return ChallengeDetail.model_validate(challenge)


@router.post(
    "/challenges/{challenge_id}/conversations",
    response_model=ConversationRead,
    status_code=201,
)
async def create_conversation(
    challenge_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConversationRead:
    """Create an authenticated conversation for a challenge."""

    challenge_result = await db.execute(
        select(Challenge.challenge_id).where(
            Challenge.challenge_id == challenge_id,
            Challenge.is_active.is_(True),
        )
    )
    if challenge_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Challenge not found")

    now = pendulum.now("UTC").naive()
    conversation = Conversation(
        conversation_id=await get_next_sequence_value(db, "conversation_id_seq"),
        user_id=current_user.user_id,
        challenge_id=challenge_id,
        created_at=now,
        updated_at=now,
    )
    db.add(conversation)
    await db.commit()
    return ConversationRead.model_validate(conversation)


@router.get("/challenges/{challenge_id}/conversations", response_model=list[ConversationRead])
async def list_user_conversations(
    challenge_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ConversationRead]:
    """List authenticated user conversations for one challenge."""

    result = await db.execute(
        select(Conversation)
        .where(
            Conversation.user_id == current_user.user_id,
            Conversation.challenge_id == challenge_id,
        )
        .order_by(Conversation.conversation_id.desc())
    )
    conversations = result.scalars().all()
    return [ConversationRead.model_validate(conversation) for conversation in conversations]


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageRead])
async def get_conversation_messages(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[MessageRead]:
    """List messages for an owned conversation."""

    await _get_owned_conversation(db, conversation_id, current_user.user_id)
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.message_id.asc())
    )
    messages = result.scalars().all()
    return [MessageRead.model_validate(message) for message in messages]


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=SendMessageResponse,
    status_code=201,
)
async def send_message(
    conversation_id: int,
    payload: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SendMessageResponse:
    """Create a user message while charging credits and updating challenge bounty."""

    conversation = await _get_owned_conversation(db, conversation_id, current_user.user_id)
    challenge_result = await db.execute(
        select(Challenge)
        .where(
            Challenge.challenge_id == conversation.challenge_id,
            Challenge.is_active.is_(True),
        )
        .with_for_update()
    )
    challenge = challenge_result.scalars().first()
    if challenge is None:
        raise HTTPException(status_code=404, detail="Challenge not found")

    wallet = await get_or_create_wallet_for_update(db, current_user.user_id)
    credits_charged = challenge.attack_cost_credits
    if wallet.balance_credits < credits_charged:
        raise HTTPException(
            status_code=402,
            detail="Insufficient credits to perform attack message",
        )

    now = pendulum.now("UTC").naive()
    wallet.balance_credits -= credits_charged
    wallet.updated_at = now

    db.add(
        CreditTransaction(
            credit_transaction_id=await get_next_sequence_value(db, "credit_transaction_id_seq"),
            user_id=current_user.user_id,
            challenge_id=challenge.challenge_id,
            credit_purchase_id=None,
            delta_credits=-credits_charged,
            transaction_type="attack_spend",
            created_at=now,
        )
    )

    challenge.prize_pool_cents += credits_charged * CENTS_PER_CREDIT
    challenge.updated_at = now

    user_message = Message(
        message_id=await get_next_sequence_value(db, "message_id_seq"),
        conversation_id=conversation_id,
        role="user",
        content=payload.content,
        is_secret_exposure=False,
        created_at=now,
    )
    db.add(user_message)

    mock_reply = get_mock_reply(challenge.secret)
    bot_message = Message(
        message_id=await get_next_sequence_value(db, "message_id_seq"),
        conversation_id=conversation_id,
        role="assistant",
        content=mock_reply.content,
        is_secret_exposure=mock_reply.did_expose_secret,
        created_at=now,
    )
    db.add(bot_message)

    conversation.updated_at = now
    await db.commit()

    return SendMessageResponse(
        user_message=MessageRead.model_validate(user_message),
        bot_message=MessageRead.model_validate(bot_message),
        did_expose_secret=mock_reply.did_expose_secret,
        credits_charged=credits_charged,
        remaining_credits=wallet.balance_credits,
        updated_prize_pool_cents=challenge.prize_pool_cents,
    )
