"""
Mock validation agent — simulates 6 De Bono hat agents.
Real LLM implementation to be added later.
"""
import asyncio
import random
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from database import SessionLocal
from models import Idea, HatScore, IdeaStatus, HatColor
import uuid

MOCK_HAT_DATA = {
    HatColor.WHITE: {
        "reasonings": [
            "Rynek dla tego rozwiązania jest dobrze udokumentowany. Istnieje solidna baza danych potwierdzająca potrzebę.",
            "Dane rynkowe wspierają ten kierunek. Analogi w innych krajach pokazują pozytywne wyniki.",
            "Brak twardych danych rynkowych. Założenia wymagają weryfikacji statystykami.",
        ],
        "score_range": (5, 9),
    },
    HatColor.RED: {
        "reasonings": [
            "Pomysł wywołuje entuzjazm i rezonuje emocjonalnie z grupą docelową.",
            "Silny sentyment wśród potencjalnych użytkowników. Rozwiązuje odczuwalny ból.",
            "Umiarkowany rezonans emocjonalny. Wymaga lepszego storytellingu.",
        ],
        "score_range": (5, 9),
    },
    HatColor.BLACK: {
        "reasonings": [
            "Ryzyka są zarządzalne. Konkurencja istnieje, ale nisza jest wystarczająco duża.",
            "Główne ryzyka: czas realizacji i pozyskanie pierwszych klientów. Plan wymaga buforów.",
            "Wysokie ryzyko techniczne i operacyjne. Milestone wymaga znacznych zasobów.",
        ],
        "score_range": (4, 8),
    },
    HatColor.YELLOW: {
        "reasonings": [
            "Potencjał komercjalizacji jest wysoki. Kilka ścieżek monetyzacji jest możliwych.",
            "Subscription model z upsell opportunities. Rynek jest gotowy na to rozwiązanie.",
            "Ograniczony potencjał monetyzacji w krótkim terminie. Długoterminowo obiecujące.",
        ],
        "score_range": (5, 9),
    },
    HatColor.GREEN: {
        "reasonings": [
            "Podejście łączy znane elementy w nowy, wartościowy sposób. Innowacja ewolucyjna.",
            "Wyraźna innowacja w podejściu do problemu. Wyróżnik jest łatwo komunikowalny.",
            "Koncepcja nie jest wysoce innowacyjna, ale solidna i sprawdzona.",
        ],
        "score_range": (4, 8),
    },
    HatColor.BLUE: {
        "reasonings": [
            "Milestone jest konkretny i mierzalny. Plan działania wygląda realistycznie.",
            "Dobra struktura planu. Twórca ma kompetencje do realizacji w podanym czasie.",
            "Plan jest ambitny. Rekomendowane uszczegółowienie kroków i zasobów.",
        ],
        "score_range": (5, 9),
    },
}


async def run_mock_validation(idea_id: str) -> None:
    """Runs mock validation in background, saving hat scores one by one."""
    await asyncio.sleep(1)  # small initial delay

    async with SessionLocal() as db:
        result = await db.execute(select(Idea).where(Idea.id == idea_id))
        idea = result.scalar_one_or_none()
        if not idea:
            return

        total_score = 0

        for hat_color, data in MOCK_HAT_DATA.items():
            await asyncio.sleep(1.2)  # simulate LLM latency per agent

            score = random.randint(*data["score_range"])
            reasoning = random.choice(data["reasonings"])

            hat_score = HatScore(
                id=str(uuid.uuid4()),
                idea_id=idea_id,
                hat_color=hat_color,
                score=score,
                reasoning=reasoning,
            )
            db.add(hat_score)
            total_score += score
            await db.commit()

        # Update idea status
        idea.validation_score = total_score
        if total_score >= 36:
            idea.status = IdeaStatus.VALIDATED
            idea.market_closes_at = datetime.now(timezone.utc) + timedelta(days=30)
        else:
            idea.status = IdeaStatus.REJECTED

        await db.commit()
