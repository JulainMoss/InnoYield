from __future__ import annotations

import asyncio
import json
import random
from pathlib import Path
from typing import Any, AsyncIterator

from fastapi import APIRouter
from fastapi.responses import JSONResponse, StreamingResponse

router = APIRouter(prefix="/api/mock", tags=["mock"])


def _repo_root() -> Path:
    # backend/routers/mock_six_hats.py -> parents[0]=routers, [1]=backend, [2]=repo root
    return Path(__file__).resolve().parents[2]


def _load_mock_payload() -> dict[str, Any]:
    test_json = _repo_root() / "six-hats-bielik" / "test.json"
    if test_json.exists():
        return json.loads(test_json.read_text(encoding="utf-8"))

    # Fallback minimal payload (keeps API stable if file missing).
    return {
        "score": 7,
        "summary": "(mock) summary unavailable",
        "rounds": [],
    }


MOCK_SIX_HATS: dict[str, Any] = _load_mock_payload()


def _sse(event: str, data: Any) -> str:
    payload = json.dumps(data, ensure_ascii=False)
    return f"event: {event}\ndata: {payload}\n\n"


@router.get("/six-hats", response_class=JSONResponse)
async def get_mock_six_hats() -> Any:
    return MOCK_SIX_HATS


@router.get("/six-hats/stream")
async def stream_mock_six_hats(
    delay_ms: int = 650,
    jitter_ms: int = 350,
    prompt: str | None = None,
) -> StreamingResponse:
    base_delay_ms = max(0, delay_ms)
    jitter_ms = max(0, jitter_ms)

    def _sleep_s() -> float:
        if base_delay_ms <= 0 and jitter_ms <= 0:
            return 0.0

        delta = random.randint(-jitter_ms, jitter_ms) if jitter_ms else 0
        sleep_ms = base_delay_ms + delta
        # Keep it feeling "human" and avoid too-long stalls.
        sleep_ms = max(60, min(1600, sleep_ms))
        return sleep_ms / 1000.0

    async def gen() -> AsyncIterator[str]:
        yield _sse(
            "meta",
            {
                "source": "mock",
                "delay_ms": base_delay_ms,
                "jitter_ms": jitter_ms,
                "prompt": prompt,
            },
        )

        for round_item in MOCK_SIX_HATS.get("rounds", []) or []:
            hat = round_item.get("hat")
            for out in round_item.get("outputs", []) or []:
                yield _sse(
                    "hat_output",
                    {
                        "hat": hat,
                        "actor_name": out.get("actor_name"),
                        "text": out.get("text"),
                    },
                )
                await asyncio.sleep(_sleep_s())

        yield _sse(
            "blue",
            {
                "score": MOCK_SIX_HATS.get("score"),
                "summary": MOCK_SIX_HATS.get("summary"),
            },
        )
        yield _sse("done", {"ok": True})

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )
