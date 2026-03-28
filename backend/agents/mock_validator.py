"""
Validation agent — calls run_six_hats directly (no separate HTTP service).
"""
import asyncio
import uuid
import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from database import SessionLocal
from models import Idea, HatScore, IdeaStatus, HatColor
from agents.schemas import SixHatsRequest, ProjectInput
from agents.service import run_six_hats

logger = logging.getLogger(__name__)

HAT_COLOR_MAP: dict[str, HatColor] = {
    "white":  HatColor.WHITE,
    "red":    HatColor.RED,
    "black":  HatColor.BLACK,
    "yellow": HatColor.YELLOW,
    "green":  HatColor.GREEN,
    "blue":   HatColor.BLUE,
}

# Per-hat score bias applied to the overall blue score
HAT_BIAS = {"white": 0, "red": 0, "black": -1, "yellow": 1, "green": 0, "blue": 0}


async def run_mock_validation(idea_id: str) -> None:
    try:
        await _run_validation(idea_id)
    except Exception as e:
        logger.error(f"Validation crashed for {idea_id}: {e}", exc_info=True)
        await _save_fallback_scores(idea_id)


async def _run_validation(idea_id: str) -> None:
    logger.info(f"Starting validation for idea {idea_id}")

    async with SessionLocal() as db:
        result = await db.execute(select(Idea).where(Idea.id == idea_id))
        idea = result.scalar_one_or_none()
        if not idea:
            logger.error(f"Idea {idea_id} not found")
            return
        idea_title = idea.title
        idea_description = idea.description

    request = SixHatsRequest(
        project=ProjectInput(
            project_title=idea_title,
            project_description=idea_description,
            language="pl",
        ),
        mode="actors",
        include_trace=True,
    )

    try:
        logger.info("Running six-hats analysis")
        response = await asyncio.to_thread(run_six_hats, request)
        logger.info(f"Six-hats completed with score={response.score}")
    except Exception as e:
        logger.warning(f"Six-hats failed: {e} — using fallback mock scores")
        await _save_fallback_scores(idea_id)
        return

    blue_score = response.score

    # Build hat_texts: concatenate all actor outputs per hat
    hat_texts: dict[str, str] = {}
    if response.rounds:
        for round_ in response.rounds:
            texts = [o.text for o in round_.outputs]
            hat_texts[round_.hat] = "\n".join(texts)

    import random
    score_map: dict[str, int] = {}
    for hat_name in HAT_COLOR_MAP:
        bias = HAT_BIAS.get(hat_name, 0)
        score_map[hat_name] = max(1, min(10, blue_score + bias + random.randint(-1, 1)))

    async with SessionLocal() as db:
        total_score = 0
        for hat_name, hat_color in HAT_COLOR_MAP.items():
            text = hat_texts.get(hat_name, response.summary)
            score = score_map[hat_name]
            total_score += score

            db.add(HatScore(
                id=str(uuid.uuid4()),
                idea_id=idea_id,
                hat_color=hat_color,
                score=score,
                reasoning=text[:1000] if text else "Brak szczegółów.",
            ))
            await db.commit()
            logger.info(f"Saved hat {hat_name} score={score}")

        result = await db.execute(select(Idea).where(Idea.id == idea_id))
        idea = result.scalar_one_or_none()
        if idea:
            idea.validation_score = total_score
            idea.status = IdeaStatus.VALIDATED if total_score >= 5 else IdeaStatus.REJECTED
            if idea.status == IdeaStatus.VALIDATED:
                idea.market_closes_at = datetime.now(timezone.utc) + timedelta(days=30)
            await db.commit()
            logger.info(f"Idea {idea_id} finalized: status={idea.status} score={total_score}")


async def _save_fallback_scores(idea_id: str) -> None:
    import random
    async with SessionLocal() as db:
        total_score = 0
        for hat_color in HAT_COLOR_MAP.values():
            score = random.randint(5, 8)
            total_score += score
            db.add(HatScore(
                id=str(uuid.uuid4()),
                idea_id=idea_id,
                hat_color=hat_color,
                score=score,
                reasoning="(Usługa walidacji niedostępna — wynik mockowy)",
            ))
            await db.commit()

        result = await db.execute(select(Idea).where(Idea.id == idea_id))
        idea = result.scalar_one_or_none()
        if idea:
            idea.validation_score = total_score
            idea.status = IdeaStatus.VALIDATED if total_score >= 36 else IdeaStatus.REJECTED
            if idea.status == IdeaStatus.VALIDATED:
                idea.market_closes_at = datetime.now(timezone.utc) + timedelta(days=30)
            await db.commit()
            logger.info(f"Fallback scores saved for {idea_id}: status={idea.status} score={total_score}")
