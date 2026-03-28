from __future__ import annotations

import logging
import re
from typing import Any
from typing import Iterable

from .hats import DEFAULT_SEQUENCE, HATS, Hat
from .llm import extract_json, generate_chat, get_runtime
from .schemas import HatOutput, ProjectInput, SixHatsRequest, SixHatsResponse

logger = logging.getLogger(__name__)


def _language_system_prompt(language: str) -> str:
    if language == "pl":
        return "Odpowiadaj krótko, precyzyjnie i wyłącznie w języku polskim."
    return "Answer briefly and precisely, only in English."


def _agent_global_system_prompt(language: str) -> str:
    # Global, stable instruction for the hat "agents".
    # Kept mostly language-agnostic; the language constraint is added separately.
    return (
        "You are one component in a Six Thinking Hats multi-agent workflow. "
        "Each Hat is a distinct agent persona (stable voice), but on every turn you must also obey "
        "the active Hat constraints (mode). The active Hat constraints override any default habits.\n\n"
        "Hard rules (always):\n"
        "- Use ONLY the requested output format for this step.\n"
        "- Do NOT invent facts. Use only the provided FOCUS and NOTES.\n"
        "- Be concise. Max 8 bullet points unless instructed otherwise.\n"
        "- Do not argue with other hats; treat their notes as inputs, not truths.\n"
        "- Maintain the Hat persona consistently (tone/style), while staying within the Hat constraints.\n\n"
        "You will be called multiple times, once per Hat. On each call you will receive:\n"
        "- HAT_NAME, HAT_TITLE\n"
        "- PERSONA (stable personality/voice)\n"
        "- CONSTRAINTS (allowed/forbidden thinking for this turn)\n"
        "- FOCUS (project/problem)\n"
        "- NOTES (recent hat outputs)\n\n"
        "Your job on non-final calls:\n"
        "- Produce HAT_NOTES as bullet points (max 8), strictly following CONSTRAINTS and PERSONA.\n"
        "Return only the bullets. No headings. No preamble."
        + ("\n\nIMPORTANT: Output must be in Polish." if language == "pl" else "")
    )


_BULLET_PREFIXES = ("-", "•", "*", "–")


def _normalize_bullets(text: str, *, max_bullets: int = 8) -> str:
    """Normalize model output to strict bullet-only form.

    - Keeps only lines that look like bullets, normalizes prefix to '- '.
    - If no bullet-like lines exist, falls back to turning non-empty lines into bullets.
    - Truncates to max_bullets.
    """

    lines = [ln.rstrip() for ln in (text or "").splitlines()]
    bullet_lines: list[str] = []

    for ln in lines:
        stripped = ln.strip()
        if not stripped:
            continue
        if stripped.startswith(_BULLET_PREFIXES):
            # Remove exactly one leading bullet marker.
            item = stripped[1:].strip()
            if item:
                bullet_lines.append(f"- {item}")

    if not bullet_lines:
        for ln in lines:
            stripped = ln.strip()
            if not stripped:
                continue
            # Avoid accidentally keeping headings.
            if stripped.endswith(":") and len(stripped.split()) <= 6:
                continue
            bullet_lines.append(f"- {stripped}")

    bullet_lines = bullet_lines[: max(1, int(max_bullets))]
    return "\n".join(bullet_lines).strip()


def _token_set(s: str) -> set[str]:
    return {t for t in re.findall(r"[\wąćęłńóśźż]+", (s or "").lower()) if len(t) >= 4}


def _jaccard(a: str, b: str) -> float:
    sa = _token_set(a)
    sb = _token_set(b)
    if not sa or not sb:
        return 0.0
    return len(sa & sb) / max(1, len(sa | sb))


def _too_similar(text: str, previous: Iterable[str], *, threshold: float = 0.65) -> bool:
    for p in previous:
        if _jaccard(text, p) >= threshold:
            return True
    return False


def _project_block(project: ProjectInput) -> str:
    parts: list[str] = [
        f"Tytuł: {project.project_title}",
        f"Opis: {project.project_description}",
    ]
    if project.additional_context:
        parts.append(f"Kontekst dodatkowy: {project.additional_context}")
    return "\n".join(parts)


def run_six_hats(request: SixHatsRequest) -> SixHatsResponse:
    runtime = get_runtime()

    sequence: list[Hat] = request.sequence or list(DEFAULT_SEQUENCE)

    language_prompt = _language_system_prompt(request.project.language)
    agent_prompt = _agent_global_system_prompt(request.project.language)
    focus = _project_block(request.project)

    trace: list[HatOutput] = []

    total_budget = 0
    per_hat_budget = 260

    for hat in sequence:
        spec = HATS[hat]

        # NOTES: provide all previous hats (small N by default sequence).
        notes_text = "\n\n".join([f"[{t.hat}]\n{t.text}" for t in trace]) if trace else "(none)"

        hat_system = (
            f"HAT_NAME: {hat}\n"
            f"HAT_TITLE: {spec.title_pl}\n"
            f"PERSONA: {spec.persona}\n"
            f"CONSTRAINTS (must follow strictly): {spec.constraints}\n\n"
            "Hard format rule for this step: output ONLY bullet points (max 8), each on its own line, starting with '- '. "
            "No headings. No numbering. No paragraphs.\n"
            "NO REPETITION: do not copy any bullet from NOTES; add NEW, non-overlapping insights consistent with the active hat.\n"
            "Do NOT output a phased roadmap ('Faza 1/2/3'), implementation plan, or generic project steps unless the active hat explicitly requires it (it does not)."
        )

        user_payload = (
            f"FOCUS:\n{focus}\n\n"
            f"NOTES (previous hats; treat as inputs, not truths):\n{notes_text}"
        )

        messages = [
            {"role": "system", "content": language_prompt},
            {"role": "system", "content": agent_prompt},
            {"role": "system", "content": hat_system},
            {"role": "user", "content": user_payload},
        ]

        if total_budget + per_hat_budget > 1800:
            per_hat_budget = max(120, 1800 - total_budget)

        text = generate_chat(messages, max_new_tokens=per_hat_budget)
        text = _normalize_bullets(text, max_bullets=8)

        # One retry if the model echoed earlier hats.
        if trace and _too_similar(text, (t.text for t in trace)):
            retry_messages = list(messages)
            retry_messages.insert(
                -1,
                {
                    "role": "system",
                    "content": (
                        "Your previous output was too similar to NOTES/previous hats. "
                        "Regenerate with NEW, distinct bullets that obey the active hat constraints. "
                        "Do not repeat phrases like 'Faza 1/2/3'."
                    ),
                },
            )
            retry_text = generate_chat(retry_messages, max_new_tokens=per_hat_budget)
            retry_text = _normalize_bullets(retry_text, max_bullets=8)
            if not _too_similar(retry_text, (t.text for t in trace)):
                text = retry_text
        total_budget += per_hat_budget

        logger.info("HAT=%s OUTPUT=%s", hat, text)
        trace.append(HatOutput(hat=hat, text=text))

    blue_score, summary = _final_blue_score_and_summary(
        project=request.project,
        system_prompt=language_prompt,
        trace=trace,
    )

    response = SixHatsResponse(
        project_title=request.project.project_title,
        model_name=runtime.model_name,
        device=runtime.device,
        sequence=sequence,
        blue_score=blue_score,
        summary=summary,
        trace=trace if request.include_trace else None,
    )
    return response


_INT_RE = re.compile(r"\b(10|[1-9])\b")


def _final_blue_score_and_summary(*, project: ProjectInput, system_prompt: str, trace: list[HatOutput]) -> tuple[int, str]:
    """Ask the model for a structured final decision; parse score robustly."""

    messages = [
        {"role": "system", "content": system_prompt},
        {
            "role": "system",
            "content": (
                "Jesteś NIEBIESKIM kapeluszem na finiszu. Masz zsyntetyzować wyniki. "
                "Nie dodawaj nowych faktów. Zwróć JSON o formacie: "
                '{"blue_score": 1-10, "summary": "..."}. '
                "W summary uwzględnij: (1) 3-5 zdań syntezy WNIOSKÓW (nie streszczaj projektu), "
                "(2) 1-2 zdania uzasadnienia oceny, (3) 'Critical path:' + dokładnie 3 punkty (zaczynające się od '- ')."
            ),
        },
        {
            "role": "user",
            "content": (
                "Wejście: \n"
                f"Tytuł: {project.project_title}\n"
                f"Opis: {project.project_description}\n"
                + (f"Kontekst: {project.additional_context}\n" if project.additional_context else "")
                + "\nWyniki kapeluszy:\n"
                + "\n\n".join([f"[{t.hat}]\n{t.text}" for t in trace])
            ),
        },
    ]

    text = generate_chat(messages, max_new_tokens=220)

    data = extract_json(text)
    if isinstance(data, dict):
        score = data.get("blue_score")
        summary = data.get("summary")
        if isinstance(score, int) and 1 <= score <= 10 and isinstance(summary, str) and summary.strip():
            return score, summary.strip()

    # Fallback: regex parse score; keep summary as raw text.
    match = _INT_RE.search(text)
    score = int(match.group(1)) if match else 5
    return score, text.strip()
