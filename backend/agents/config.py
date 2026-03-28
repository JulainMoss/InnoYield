from __future__ import annotations

import os


def _env(name: str, default: str) -> str:
    value = os.getenv(name)
    return default if value is None or value == "" else value


OPENAI_API_KEY: str = _env("OPENAI_API_KEY", "")
OPENAI_MODEL: str = _env("OPENAI_MODEL", "gpt-4o-mini")

MAX_NEW_TOKENS: int = int(_env("MAX_NEW_TOKENS", "512"))
TEMPERATURE: float = float(_env("TEMPERATURE", "0.7"))
TOP_P: float = float(_env("TOP_P", "0.9"))

# Hard limit so one request doesn't explode token cost.
MAX_TOTAL_NEW_TOKENS: int = int(_env("MAX_TOTAL_NEW_TOKENS", "3000"))
