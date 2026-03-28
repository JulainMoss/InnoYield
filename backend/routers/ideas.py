from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from datetime import datetime, timedelta, timezone
from database import get_db
from models import User, Idea, HatScore, IdeaStatus
from schemas import IdeaCreate, IdeaOut, ValidationStatusOut
from auth import get_current_user
from agents.mock_validator import run_mock_validation
import uuid

router = APIRouter(prefix="/api/ideas", tags=["ideas"])


def _idea_to_out(idea: Idea) -> IdeaOut:
    return IdeaOut(
        id=idea.id,
        title=idea.title,
        description=idea.description,
        milestone=idea.milestone,
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


@router.get("", response_model=list[IdeaOut])
async def list_ideas(
    sort: str = "hottest",
    category: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    q = (
        select(Idea)
        .options(selectinload(Idea.creator), selectinload(Idea.hat_scores))
        .where(Idea.status == IdeaStatus.VALIDATED)
    )
    if category:
        q = q.where(Idea.category == category)

    result = await db.execute(q)
    ideas = result.scalars().all()

    if sort == "hottest":
        ideas = sorted(ideas, key=lambda i: i.yes_pool + i.no_pool, reverse=True)
    elif sort == "newest":
        ideas = sorted(ideas, key=lambda i: i.created_at, reverse=True)
    elif sort == "closing":
        ideas = sorted(ideas, key=lambda i: i.market_closes_at or datetime.max.replace(tzinfo=timezone.utc))

    return [_idea_to_out(i) for i in ideas]


@router.get("/{idea_id}", response_model=IdeaOut)
async def get_idea(idea_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Idea)
        .options(selectinload(Idea.creator), selectinload(Idea.hat_scores))
        .where(Idea.id == idea_id)
    )
    idea = result.scalar_one_or_none()
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    return _idea_to_out(idea)


@router.post("", response_model=dict, status_code=202)
async def submit_idea(
    body: IdeaCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    idea = Idea(
        id=str(uuid.uuid4()),
        creator_id=current_user.id,
        title=body.title,
        description=body.description,
        milestone=body.milestone,
        category=body.category,
        status=IdeaStatus.PENDING,
    )
    db.add(idea)
    await db.commit()
    await db.refresh(idea)

    background_tasks.add_task(run_mock_validation, idea.id)

    return {"idea_id": idea.id, "status": "PENDING"}


@router.get("/{idea_id}/validation", response_model=ValidationStatusOut)
async def get_validation_status(idea_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Idea)
        .options(selectinload(Idea.hat_scores))
        .where(Idea.id == idea_id)
    )
    idea = result.scalar_one_or_none()
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")

    return ValidationStatusOut(
        status=idea.status,
        validation_score=idea.validation_score,
        hat_scores=[
            {"hat_color": hs.hat_color, "score": hs.score, "reasoning": hs.reasoning}
            for hs in idea.hat_scores
        ],
    )
