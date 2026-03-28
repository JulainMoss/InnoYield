from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from database import get_db
from models import User, Idea, Bet, IdeaStatus
from schemas import BetCreate, BetOut, BetStatsOut
from auth import get_current_user
import uuid

router = APIRouter(prefix="/api/bets", tags=["bets"])


def _calc_prob(yes_pool: int, no_pool: int) -> int:
    total = yes_pool + no_pool
    if total == 0:
        return 50
    return round((yes_pool / total) * 100)


def _bet_to_out(bet: Bet) -> BetOut:
    return BetOut(
        id=bet.id,
        idea_id=bet.idea_id,
        idea_title=bet.idea.title,
        idea_milestone=bet.idea.milestone,
        position=bet.position,
        amount=bet.amount,
        multiplier=bet.multiplier,
        payout=bet.payout,
        created_at=bet.created_at,
        resolved_at=bet.resolved_at,
        market_closes_at=bet.idea.market_closes_at,
        current_probability=_calc_prob(bet.idea.yes_pool, bet.idea.no_pool),
    )


@router.post("", response_model=BetOut, status_code=201)
async def place_bet(
    body: BetCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Idea)
        .options(selectinload(Idea.creator))
        .where(Idea.id == body.idea_id)
    )
    idea = result.scalar_one_or_none()
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    if idea.status != IdeaStatus.VALIDATED:
        raise HTTPException(status_code=400, detail="Idea is not open for betting")

    if current_user.coin_balance < body.amount:
        raise HTTPException(status_code=400, detail="Insufficient coin balance")

    # Deduct coins and update pool
    current_user.coin_balance -= body.amount
    if body.position == "YES":
        idea.yes_pool += body.amount
    else:
        idea.no_pool += body.amount

    bet = Bet(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        idea_id=idea.id,
        position=body.position,
        amount=body.amount,
    )
    db.add(bet)
    await db.commit()
    await db.refresh(bet)

    # Reload with relations
    result2 = await db.execute(
        select(Bet).options(selectinload(Bet.idea)).where(Bet.id == bet.id)
    )
    bet = result2.scalar_one()
    return _bet_to_out(bet)


@router.get("/me", response_model=list[BetOut])
async def my_bets(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Bet)
        .options(selectinload(Bet.idea))
        .where(Bet.user_id == current_user.id)
        .order_by(Bet.created_at.desc())
    )
    bets = result.scalars().all()
    return [_bet_to_out(b) for b in bets]


@router.get("/idea/{idea_id}", response_model=BetStatsOut)
async def idea_bet_stats(idea_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Idea).where(Idea.id == idea_id))
    idea = result.scalar_one_or_none()
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")

    return BetStatsOut(
        yes_pool=idea.yes_pool,
        no_pool=idea.no_pool,
        probability=_calc_prob(idea.yes_pool, idea.no_pool),
    )
