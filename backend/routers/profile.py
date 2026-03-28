from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from database import get_db
from models import User, Idea, IdeaStatus
from schemas import UserOut, IdeaOut
from auth import get_current_user
from routers.bets import _bet_to_out
from models import Bet

router = APIRouter(prefix="/api/profile", tags=["profile"])


def _idea_to_out_simple(idea: Idea) -> IdeaOut:
    return IdeaOut(
        id=idea.id,
        title=idea.title,
        description=idea.description,
        category=idea.category,
        status=idea.status,
        validation_score=idea.validation_score,
        yes_pool=idea.yes_pool,
        no_pool=idea.no_pool,
        creator_id=idea.creator_id,
        creator_username=idea.creator.username,
        hat_scores=[
            {"hat_color": hs.hat_color, "score": hs.score, "reasoning": hs.reasoning}
            for hs in idea.hat_scores
        ],
        created_at=idea.created_at,
        market_closes_at=idea.market_closes_at,
        outcome=idea.outcome,
    )


@router.get("", response_model=UserOut)
async def get_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/ideas", response_model=list[IdeaOut])
async def my_ideas(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Idea)
        .options(selectinload(Idea.creator), selectinload(Idea.hat_scores))
        .where(Idea.creator_id == current_user.id)
        .order_by(Idea.created_at.desc())
    )
    ideas = result.scalars().all()
    return [_idea_to_out_simple(i) for i in ideas]
