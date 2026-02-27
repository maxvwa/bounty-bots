import pendulum
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.challenges import Challenge
from app.models.conversations import Conversation
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
from app.services.mock_bot import get_mock_reply

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
    """Create a user message and immediate mock-bot reply for an owned conversation."""

    conversation = await _get_owned_conversation(db, conversation_id, current_user.user_id)

    now = pendulum.now("UTC").naive()
    user_message = Message(
        message_id=await get_next_sequence_value(db, "message_id_seq"),
        conversation_id=conversation_id,
        role="user",
        content=payload.content,
        created_at=now,
    )
    db.add(user_message)

    bot_message = Message(
        message_id=await get_next_sequence_value(db, "message_id_seq"),
        conversation_id=conversation_id,
        role="assistant",
        content=get_mock_reply(),
        created_at=now,
    )
    db.add(bot_message)

    conversation.updated_at = now
    await db.commit()

    return SendMessageResponse(
        user_message=MessageRead.model_validate(user_message),
        bot_message=MessageRead.model_validate(bot_message),
    )
