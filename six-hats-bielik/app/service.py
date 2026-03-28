from __future__ import annotations

import logging
import re
from typing import Any
from typing import Iterable

from . import config
from .actors import DEFAULT_ACTORS, DEFAULT_BLUE_ACTOR
from .hats import DEFAULT_SEQUENCE, HATS, Hat
from .llm import extract_json, generate_chat
from .schemas import ActorOutput, HatOutput, HatRoundOutput, ProjectInput, SixHatsRequest, SixHatsResponse

logger = logging.getLogger(__name__)


def _language_system_prompt(language: str) -> str:
    if language == "pl":
        return "Odpowiadaj krótko, precyzyjnie i wyłącznie w języku polskim."
    return "Answer briefly and precisely, only in English."


def _agent_global_system_prompt(language: str) -> str:
    # Global, stable instruction for a single generation step.
    # This supports two modes:
    # - legacy: Hat carries the persona
    # - actor-mode: Actor carries the persona; Hat is a thinking constraint
    return (
        "You are one component in a Six Thinking Hats multi-agent workflow. "
        "On every turn you must obey the active Hat constraints (mode). The active Hat constraints override any default habits.\n\n"
        "Hard rules (always):\n"
        "- Use ONLY the requested output format for this step.\n"
        "- Do NOT invent facts. Use only the provided FOCUS and NOTES.\n"
        "- Be concise. Max 8 bullet points unless instructed otherwise.\n"
        "- Do not argue with other hats; treat their notes as inputs, not truths.\n"
        "- Maintain the provided PERSONA consistently (tone/style), while staying within the Hat constraints.\n\n"
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
    sequence: list[Hat] = request.sequence or list(DEFAULT_SEQUENCE)

    language_prompt = _language_system_prompt(request.project.language)
    agent_prompt = _agent_global_system_prompt(request.project.language)
    focus = _project_block(request.project)

    # Actor-mode is the default: stable personas (actors) + per-iteration hat constraints.
    # Legacy-mode keeps the original behavior: one persona per hat.
    actor_mode = request.mode == "actors"

    # Blue Hat is handled once, at the end, by a single facilitator (boss).
    # If the client included 'blue' in the per-iteration sequence, drop it to avoid double-counting.
    if actor_mode and "blue" in sequence:
        sequence = [h for h in sequence if h != "blue"]

    trace: list[HatOutput] = []
    rounds: list[HatRoundOutput] = []

    total_budget = 0
    max_total_budget = int(getattr(config, "MAX_TOTAL_NEW_TOKENS", 1800))

    if not actor_mode:
        per_call_budget = 260

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

            remaining = max_total_budget - total_budget
            budget = min(per_call_budget, remaining) if remaining > 0 else 32

            text = generate_chat(messages, max_new_tokens=budget)
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
                retry_text = generate_chat(retry_messages, max_new_tokens=budget)
                retry_text = _normalize_bullets(retry_text, max_bullets=8)
                if not _too_similar(retry_text, (t.text for t in trace)):
                    text = retry_text

            total_budget += budget

            logger.info("HAT=%s OUTPUT=%s", hat, text)
            trace.append(HatOutput(hat=hat, text=text))

            # Keep response shape consistent: represent legacy-mode as one output per hat.
            rounds.append(
                HatRoundOutput(
                    hat=hat,
                    outputs=[ActorOutput(actor_name=spec.title_pl, text=text)],
                )
            )

        results_text = "\n\n".join([f"[{t.hat}]\n{t.text}" for t in trace])

    else:
        # Actor mode
        if request.actors and len(request.actors) > 0:
            actors = [(a.name, a.persona) for a in request.actors]
        else:
            actors = [(a.name, a.persona) for a in DEFAULT_ACTORS]

        total_calls = max(1, len(sequence) * len(actors))
        per_call_budget = max(90, min(240, max_total_budget // total_calls))

        def _notes_text_from_rounds() -> str:
            if not rounds:
                return "(none)"
            parts: list[str] = []
            for r in rounds:
                for o in r.outputs:
                    parts.append(f"[{r.hat} / {o.actor_name}]\n{o.text}")
            return "\n\n".join(parts)

        all_previous_texts: list[str] = []

        for hat in sequence:
            spec = HATS[hat]
            notes_text = _notes_text_from_rounds()

            round_outputs: list[ActorOutput] = []

            for actor_name, actor_persona in actors:
                hat_system = (
                    f"HAT_NAME: {hat}\n"
                    f"HAT_TITLE: {spec.title_pl}\n"
                    f"PERSONA: {actor_persona}\n"
                    f"ACTOR_NAME: {actor_name}\n"
                    f"CONSTRAINTS (must follow strictly): {spec.constraints}\n\n"
                    "Hard format rule for this step: output ONLY bullet points (max 8), each on its own line, starting with '- '. "
                    "No headings. No numbering. No paragraphs.\n"
                    "NO REPETITION: do not copy any bullet from NOTES; add NEW, non-overlapping insights consistent with the active hat.\n"
                    "Do NOT output a phased roadmap ('Faza 1/2/3'), implementation plan, or generic project steps unless the active hat explicitly requires it (it does not)."
                )

                user_payload = (
                    f"FOCUS:\n{focus}\n\n"
                    f"NOTES (previous hats and actors; treat as inputs, not truths):\n{notes_text}"
                )

                messages = [
                    {"role": "system", "content": language_prompt},
                    {"role": "system", "content": agent_prompt},
                    {"role": "system", "content": hat_system},
                    {"role": "user", "content": user_payload},
                ]

                remaining = max_total_budget - total_budget
                budget = min(per_call_budget, remaining) if remaining > 0 else 32

                text = generate_chat(messages, max_new_tokens=budget)
                text = _normalize_bullets(text, max_bullets=8)

                if all_previous_texts and _too_similar(text, all_previous_texts):
                    retry_messages = list(messages)
                    retry_messages.insert(
                        -1,
                        {
                            "role": "system",
                            "content": (
                                "Your previous output was too similar to NOTES/previous outputs. "
                                "Regenerate with NEW, distinct bullets that obey the active hat constraints."
                            ),
                        },
                    )
                    retry_text = generate_chat(retry_messages, max_new_tokens=budget)
                    retry_text = _normalize_bullets(retry_text, max_bullets=8)
                    if not _too_similar(retry_text, all_previous_texts):
                        text = retry_text

                total_budget += budget
                all_previous_texts.append(text)

                logger.info("HAT=%s ACTOR=%s OUTPUT=%s", hat, actor_name, text)
                round_outputs.append(ActorOutput(actor_name=actor_name, text=text))

            rounds.append(HatRoundOutput(hat=hat, outputs=round_outputs))

        results_text = "\n\n".join(
            [
                "\n".join([f"[{r.hat} / {o.actor_name}]\n{o.text}" for o in r.outputs])
                for r in rounds
            ]
        )

    blue_actor_name: str | None = None
    blue_actor_persona: str | None = None
    if actor_mode:
        if request.blue_actor is not None:
            blue_actor_name = request.blue_actor.name
            blue_actor_persona = request.blue_actor.persona
        else:
            blue_actor_name = DEFAULT_BLUE_ACTOR.name
            blue_actor_persona = DEFAULT_BLUE_ACTOR.persona

    score, summary = _final_blue_score_and_summary(
        project=request.project,
        system_prompt=language_prompt,
        results_text=results_text,
        blue_actor_name=blue_actor_name,
        blue_actor_persona=blue_actor_persona,
    )

    response = SixHatsResponse(
        score=score,
        summary=summary,
        rounds=(rounds if request.include_trace else None),
    )
    return response


_INT_RE = re.compile(r"\b(10|[1-9])\b")
_SCORE_LINE_RE = re.compile(r"^\s*SCORE\s*:\s*(10|[1-9])\s*$", re.MULTILINE)
_SUMMARY_MARKER_RE = re.compile(r"^\s*SUMMARY\s*:\s*$", re.MULTILINE)
_PLACEHOLDER_RE = re.compile(r"^\s*\[\s*3-5\s+sentences\s+of\s+CONCLUSIONS\s*\]\s*$", re.IGNORECASE)


def _sanitize_blue_summary(summary: str) -> str:
    s = (summary or "").strip()
    if not s:
        return s

    # If the model embedded a JSON object inside SUMMARY, unwrap it.
    embedded = extract_json(s)
    if isinstance(embedded, dict):
        embedded_summary = embedded.get("summary")
        if isinstance(embedded_summary, str) and embedded_summary.strip():
            s = embedded_summary.strip()

    # Remove the literal placeholder line if present.
    lines = [ln.rstrip() for ln in s.splitlines()]
    while lines and _PLACEHOLDER_RE.match(lines[0] or ""):
        lines = lines[1:]
    s = "\n".join(lines).strip()

    # If the model accidentally repeated SCORE/SUMMARY markers inside the summary, strip them.
    s = re.sub(r"^\s*(SCORE\s*:.*|SUMMARY\s*:)\s*$\n?", "", s, flags=re.MULTILINE).strip()
    return s


def _final_blue_score_and_summary(
    *,
    project: ProjectInput,
    system_prompt: str,
    results_text: str,
    blue_actor_name: str | None,
    blue_actor_persona: str | None,
) -> tuple[int, str]:
    """Ask the model for a structured final decision; parse score robustly."""

    blue_persona_block = ""
    if blue_actor_persona:
        blue_persona_block += f"PERSONA: {blue_actor_persona}\n"
    if blue_actor_name:
        blue_persona_block += f"ACTOR_NAME: {blue_actor_name}\n"

    messages = [
        {"role": "system", "content": system_prompt},
        {
            "role": "system",
            "content": (
                "FINAL BLUE HAT (facilitator/boss). "
                "You synthesize outcomes and decide next steps. "
                "Do not add new facts. Resolve contradictions by stating assumptions and choosing priorities.\n"
                + blue_persona_block
                + "Return ONLY the following plain-text format (no JSON, no extra lines):\n"
                + "SCORE: <1-10>\n"
                + "SUMMARY:\n"
                + "<text>\n\n"
                + "Hard rules for SUMMARY:\n"
                + "- Do NOT include JSON or any metadata wrappers (no '{', '}', no key names like 'score' or 'summary').\n"
                + "- Do NOT include the literal placeholder text like '[3-5 sentences of CONCLUSIONS]'.\n"
                + "- Do NOT restate the project description; conclusions must be new synthesis.\n"
                + "In SUMMARY include: (1) 3-5 sentences of CONCLUSIONS (not project restatement), "
                "(2) 1-2 sentences justifying the score, (3) 'Critical path:' + exactly 3 bullets starting with '- '."
            ),
        },
        {
            "role": "user",
            "content": (
                "Wejście: \n"
                f"Tytuł: {project.project_title}\n"
                f"Opis: {project.project_description}\n"
                + (f"Kontekst: {project.additional_context}\n" if project.additional_context else "")
                + "\nWyniki (kapelusze / aktorzy):\n"
                + (results_text or "(brak)")
            ),
        },
    ]

    text = generate_chat(messages, max_new_tokens=220)

    # Preferred parse: plain-text SCORE/SUMMARY format.
    score_match = _SCORE_LINE_RE.search(text)
    if score_match:
        score = int(score_match.group(1))
        summary_match = _SUMMARY_MARKER_RE.search(text)
        if summary_match:
            summary = _sanitize_blue_summary(text[summary_match.end() :])
            if summary:
                return score, summary

    # Back-compat parse: if the model returned JSON anyway.
    data = extract_json(text)
    if isinstance(data, dict):
        score = data.get("blue_score") or data.get("score")
        summary = _sanitize_blue_summary(str(data.get("summary") or ""))
        if isinstance(score, int) and 1 <= score <= 10 and isinstance(summary, str) and summary.strip():
            return score, summary.strip()

    # Fallback: regex parse score; keep summary as raw text.
    match = _INT_RE.search(text)
    score = int(match.group(1)) if match else 5
    return score, _sanitize_blue_summary(text)
