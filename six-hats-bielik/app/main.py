from __future__ import annotations

import logging

from fastapi import FastAPI

from .schemas import SixHatsRequest, SixHatsResponse
from .service import run_six_hats

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s - %(message)s",
)

app = FastAPI(title="Six Thinking Hats API (Bielik)", version="0.1.0")


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.post("/v1/six-hats", response_model=SixHatsResponse)
def six_hats(req: SixHatsRequest) -> SixHatsResponse:
    return run_six_hats(req)
