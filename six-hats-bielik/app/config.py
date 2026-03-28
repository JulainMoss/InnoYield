from __future__ import annotations

import os


def _env(name: str, default: str) -> str:
    value = os.getenv(name)
    return default if value is None or value == "" else value


MODEL_NAME: str = _env("MODEL_NAME", "speakleash/Bielik-1.5B-v3.0-Instruct")

# If DEVICE is not set, we auto-detect (cuda -> mps -> cpu) in llm.py
DEVICE: str | None = os.getenv("DEVICE")

MAX_NEW_TOKENS: int = int(_env("MAX_NEW_TOKENS", "320"))
TEMPERATURE: float = float(_env("TEMPERATURE", "0.7"))
TOP_P: float = float(_env("TOP_P", "0.9"))

# Mild anti-repetition (helps prevent copying NOTES verbatim).
REPETITION_PENALTY: float = float(_env("REPETITION_PENALTY", "1.05"))

# Hard limit so one request doesn't explode latency.
MAX_TOTAL_NEW_TOKENS: int = int(_env("MAX_TOTAL_NEW_TOKENS", "1800"))
