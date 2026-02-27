import pendulum
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.credit_wallets import CreditWallet
from app.routers.helpers import get_next_sequence_value


async def get_or_create_wallet_for_update(db: AsyncSession, user_id: int) -> CreditWallet:
    """Return a user's wallet row while holding a write lock."""

    result = await db.execute(
        select(CreditWallet).where(CreditWallet.user_id == user_id).with_for_update()
    )
    wallet = result.scalars().first()
    if wallet is not None:
        return wallet

    now = pendulum.now("UTC").naive()
    wallet = CreditWallet(
        credit_wallet_id=await get_next_sequence_value(db, "credit_wallet_id_seq"),
        user_id=user_id,
        balance_credits=0,
        created_at=now,
        updated_at=now,
    )
    db.add(wallet)
    await db.flush()
    return wallet
