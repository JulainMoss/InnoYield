from __future__ import annotations

import json
import logging
import re

from openai import OpenAI

from . import config

logger = logging.getLogger(__name__)

_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=config.OPENAI_API_KEY)
    return _client


def generate_chat(messages: list[dict], *, max_new_tokens: int) -> str:
    client = _get_client()
    max_tokens = max(16, min(int(max_new_tokens), config.MAX_NEW_TOKENS))

    response = client.chat.completions.create(
        model=config.OPENAI_MODEL,
        messages=messages,
        max_tokens=max_tokens,
        temperature=config.TEMPERATURE,
        top_p=config.TOP_P,
    )

    text = response.choices[0].message.content or ""
    return text.strip()


_JSON_RE = re.compile(r"\{.*\}", re.DOTALL)


def extract_json(text: str) -> dict | None:
    match = _JSON_RE.search(text)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except Exception:
        return None
