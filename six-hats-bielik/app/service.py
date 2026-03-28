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


_HAT_NAME_TOKENS = {
    # English
    "hat",
    "blue",
    "white",
    "red",
    "black",
    "yellow",
    "green",
    # Polish (common forms)
    "kapelusz",
    "niebieski",
    "bialy",
    "biały",
    "czerwony",
    "czarny",
    "zolty",
    "żółty",
    "zielony",
}


_ROLE_TOKENS = {
    # English role/job-title tokens
    "ceo",
    "cfo",
    "cto",
    "coo",
    "cmo",
    "cio",
    "ciso",
    "vp",
    "director",
    "head",
    "lead",
    "manager",
    "owner",
    "analyst",
    "engineer",
    "architect",
    "designer",
    "researcher",
    "product",
    "operations",
    "security",
    "legal",
    "compliance",
    "privacy",
    "finance",
    "marketing",
    "sales",
    "support",
    "customer",
    "procurement",
    "risk",
    "data",
    "ml",
    "ai",
    "ux",
    "ui",
    # Polish role/job-title tokens
    "prezes",
    "dyrektor",
    "kierownik",
    "menedzer",
    "menedżer",
    "lider",
    "szef",
    "wlasciciel",
    "właściciel",
    "analityk",
    "inzynier",
    "inżynier",
    "architekt",
    "projektant",
    "badacz",
    "produkt",
    "operacje",
    "bezpieczenstwo",
    "bezpieczeństwo",
    "prawny",
    "prawnik",
    "radca",
    "rodo",
    "zgodnosc",
    "zgodność",
    "prywatnosc",
    "prywatność",
    "finanse",
    "marketing",
    "sprzedaz",
    "sprzedaż",
    "obsluga",
    "obsługa",
    "klienta",
    "zakupy",
    "zamowien",
    "zamówień",
    "ryzyko",
    "dane",
    "urzędnik",
    "urzednik",
    "koordynator",
    "inspektor",
    "inspektorka",
    "specjalista",
    "specjalistka",
    "partner",
}


_PERSON_NAME_LIKE_RE = re.compile(
    r"^\s*[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+(?:-[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)?\s+"
    r"[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+(?:-[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)?\s*$"
)


def _contains_acronym_role(name: str) -> bool:
    # E.g. CTO, CFO, CISO, VP (2-5 letters) possibly with dots.
    return bool(re.search(r"\b[A-Z]{2,5}\b", name or ""))


def _tokenize_name(name: str) -> list[str]:
    return [t for t in re.findall(r"[\wąćęłńóśźż]+", (name or "").lower()) if t]


def _is_valid_actor_name(name: str) -> bool:
    if not isinstance(name, str):
        return False
    name = name.strip()
    if not name:
        return False

    words = [w for w in name.split() if w.strip()]
    # Prefer role/job-title strings (often 2-6 words), but allow acronyms like CTO.
    if len(words) == 1:
        if not _contains_acronym_role(name):
            return False
    elif not (2 <= len(words) <= 7):
        return False

    tokens = set(_tokenize_name(name))
    if tokens & _HAT_NAME_TOKENS:
        return False

    # Must look like a role/job title, not a personal name.
    has_role_token = bool(tokens & _ROLE_TOKENS)
    has_ds_marker = "ds" in tokens or "ds." in (name.lower())
    has_acronym = _contains_acronym_role(name)

    if not (has_role_token or has_ds_marker or has_acronym):
        return False

    # Reject person-name-like strings unless they clearly contain role tokens.
    if _PERSON_NAME_LIKE_RE.match(name) and not has_role_token:
        return False

    return True


def _is_valid_persona(persona: str) -> bool:
    if not isinstance(persona, str):
        return False
    persona = persona.strip()
    if not persona:
        return False
    # Avoid accidentally embedding JSON/metadata inside persona.
    if "{" in persona or "}" in persona:
        return False
    # Keep it short: 1-2 sentences.
    if len(persona) > 400:
        return False
    return True


def _generate_actors_via_llm(project: ProjectInput, *, system_prompt: str) -> list[tuple[str, str]] | None:
    """Generate exactly 3 actor personas tailored to the project.

    Returns a list of (name, persona) tuples or None if generation/parsing fails.
    """

    user_context = (
        f"Tytuł: {project.project_title}\n"
        f"Opis: {project.project_description}\n"
        + (f"Kontekst: {project.additional_context}\n" if project.additional_context else "")
    )

    base_system = (
        "You are generating 3 stable workshop ACTORS (personas) for a Six Thinking Hats workflow. "
        "Actors are NOT hats. They are COMPANY/ORGANIZATION ROLES (job titles) with a consistent voice.\n\n"
        "Return STRICT JSON only, no markdown, no commentary, no extra keys.\n"
        "Schema: {\"actors\": [{\"name\": \"<ROLE/JOB TITLE>\", \"persona\": \"...\"}, ...]}\n"
        "Rules:\n"
        "- Exactly 3 actors.\n"
        "- Each actor name MUST be a role/job title relevant to the domain described in the project (NOT a person's name).\n"
        "- Choose roles that would realistically participate in a decision in this domain (budget, delivery, compliance, operations, customer impact). Avoid generic roles like 'Employee'/'Person'.\n"
        "- Good examples: 'Dyrektor produktu', 'Kierownik operacji', 'Radca prawny (RODO)', 'CTO', 'Head of Partnerships'.\n"
        "- Bad examples (forbidden): 'Anna Kowalska', 'Jan Nowak', any random citizen name.\n"
        "- Names should be short (prefer 2-7 words; acronyms like CTO/CFO allowed) and distinct.\n"
        "- Do NOT use hat/color words in names (forbidden tokens include: hat/kapelusz and blue/white/red/black/yellow/green or PL equivalents).\n"
        "- Personas must be 1-2 sentences, practical, and tailored to the project; they should match the responsibilities of the ROLE.\n"
        "- Do NOT include any JSON/braces in persona text.\n"
        "- Output language must match the project language.\n"
        "- IMPORTANT: Do not invent personal names; only roles."
    )

    for attempt in range(3):
        extra = ""
        if attempt == 1:
            extra = (
                "\n\nYour previous output violated rules. Regenerate correctly. "
                "Common violations: using personal names instead of roles, or using hat/color words."
            )
        elif attempt == 2:
            extra = (
                "\n\nRegenerate with real stakeholder ROLES tailored to THIS project domain. "
                "Pick roles that would exist inside the organization(s) described (e.g., product, engineering, operations, legal/privacy, finance, procurement, customer). "
                "Do NOT output personal names."
            )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "system", "content": base_system + extra},
            {"role": "user", "content": f"Project context:\n{user_context}"},
        ]

        text = generate_chat(messages, max_new_tokens=220)
        data = extract_json(text)
        if not isinstance(data, dict):
            continue

        raw_actors = data.get("actors")
        if not isinstance(raw_actors, list) or len(raw_actors) != 3:
            continue

        actors: list[tuple[str, str]] = []
        seen_names: set[str] = set()
        ok = True

        for item in raw_actors:
            if not isinstance(item, dict):
                ok = False
                break
            name = item.get("name")
            persona = item.get("persona")
            if not isinstance(name, str):
                ok = False
                break
            if not isinstance(persona, str):
                ok = False
                break

            name = name.strip()
            persona = " ".join(persona.strip().split())

            if not _is_valid_actor_name(name):
                ok = False
                break
            if not _is_valid_persona(persona):
                ok = False
                break

            lowered = name.lower()
            if lowered in seen_names:
                ok = False
                break
            seen_names.add(lowered)

            actors.append((name, persona))

        if ok and len(actors) == 3:
            return actors

    return None


def _language_system_prompt(language: str) -> str:
    if language == "pl":
        return "Odpowiadaj krótko, precyzyjnie i wyłącznie w języku polskim."
    return "Answer briefly and precisely, only in English."


def _blue_language_system_prompt(language: str) -> str:
    # Blue Hat synthesis should be more expansive; do not force brevity here.
    if language == "pl":
        return "Odpowiadaj precyzyjnie i wyłącznie w języku polskim."
    return "Answer precisely, only in English."


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
            generated = _generate_actors_via_llm(request.project, system_prompt=language_prompt)
            if generated:
                actors = generated
                logger.info("Generated %d actors via LLM: %s", len(actors), [a[0] for a in actors])
            else:
                # Fallback: keep the pipeline working.
                actors = [(a.name, a.persona) for a in DEFAULT_ACTORS[:3]]
                logger.warning("Actor generation failed; falling back to %d default actors.", len(actors))

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
_SUMMARY_MARKER_RE = re.compile(r"^\s*SUMMARY\s*:\s*(.*)\s*$", re.MULTILINE)
_PLACEHOLDER_RE = re.compile(r"^\s*\[\s*3-5\s+sentences\s+of\s+CONCLUSIONS\s*\]\s*$", re.IGNORECASE)
_CODE_FENCE_RE = re.compile(r"```.*?```", re.DOTALL)


def _blue_summary_sentence_count(text: str) -> int:
    s = (text or "").strip()
    if not s:
        return 0
    # Count sentence-ending punctuation; works reasonably for PL/EN.
    return len(re.findall(r"[.!?](?:\s|$)", s))


def _is_clean_blue_summary(text: str) -> bool:
    s = (text or "").strip()
    if not s:
        return False

    forbidden_substrings = (
        "{",
        "}",
        "```",
        "\"score\"",
        "\"summary\"",
        "\"rounds\"",
        "score:",
        "summary:",
    )
    lowered = s.lower()
    if any(f in s for f in forbidden_substrings):
        return False
    if "score:" in lowered or "summary:" in lowered:
        return False

    # No markdown-ish headings / bullets.
    if re.search(r"(^|\s)[#*\-•]\s*", s):
        return False

    # Require a non-trivial number of full sentences.
    if _blue_summary_sentence_count(s) < 8:
        return False

    return True


def _compact_results_for_blue(results_text: str, *, max_chars: int = 12000) -> str:
    """Bound the Blue Hat input while preserving coverage across hats/actors.

    We want Blue to *see every* hat/actor section even when the transcript is long.
    This function parses sections like `[hat / actor]` and then allocates a small quota
    to each section so none are completely dropped.
    """

    s = (results_text or "").strip()
    if not s:
        return "(brak)"
    if len(s) <= max_chars:
        return s

    lines = [ln.rstrip() for ln in s.splitlines()]

    sections: list[tuple[str, list[str]]] = []
    current_header: str | None = None
    current_body: list[str] = []

    def _flush() -> None:
        nonlocal current_header, current_body
        if current_header is None:
            return
        sections.append((current_header, current_body))
        current_header = None
        current_body = []

    for ln in lines:
        t = ln.strip()
        if t.startswith("[") and t.endswith("]"):
            _flush()
            current_header = t
            continue
        if current_header is None:
            continue
        if t:
            current_body.append(t)
    _flush()

    if not sections:
        return s[:max_chars].rstrip()

    n = len(sections)
    # Allocate budget per section, keeping at least a little room for each.
    per_section = max(120, (max_chars - (n * 2)) // n)

    out: list[str] = []
    used = 0

    for header, body in sections:
        chunk: list[str] = [header]

        bullets = [b for b in body if b.startswith(_BULLET_PREFIXES)]
        free = [b for b in body if not b.startswith(_BULLET_PREFIXES)]

        if bullets:
            chunk.extend(bullets[:3])
        elif free:
            chunk.append(free[0][:240])

        piece = "\n".join(chunk).strip()
        if len(piece) > per_section:
            # Hard trim: keep header + the first content line trimmed.
            if len(chunk) >= 2:
                first = chunk[1]
                chunk = [header, first[: max(0, per_section - len(header) - 2)]]
                piece = "\n".join([c for c in chunk if c]).strip()
            else:
                piece = header

        need = len(piece) + 1
        if used + need > max_chars:
            break
        out.append(piece)
        out.append("")
        used += need

    compact = "\n".join(out).strip()
    return compact if compact else s[:max_chars].rstrip()


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

    # Drop code fences / accidental markdown blocks.
    s = _CODE_FENCE_RE.sub(" ", s).strip()

    # Strip leading markdown emphasis / quotes / list markers.
    s = re.sub(r"^\s*[>*_`~\-•\s]+", "", s).strip()

    # Strip common leading metadata/labels.
    s = re.sub(
        r"^\s*(final\s*(blue\s*hat)?|response|output|wynik|odpowied[źz]|podsumowanie|summary)\s*[:\-]+\s*",
        "",
        s,
        flags=re.IGNORECASE,
    ).strip()

    # Strip inline "SCORE: <n>" and/or "SUMMARY:" wrappers even if surrounded by markdown asterisks.
    # Example: "*SCORE: 7** *SUMMARY:** ..."
    s = re.sub(
        r"^\s*(?:[*_`~\s]+)*SCORE\s*:\s*(?:10|[1-9])\s*(?:[*_`~\s]+)*(?:SUMMARY\s*:\s*)?",
        "",
        s,
        flags=re.IGNORECASE,
    ).strip()
    s = re.sub(r"^\s*(?:[*_`~\s]+)*SUMMARY\s*:\s*(?:[*_`~\s]+)*", "", s, flags=re.IGNORECASE).strip()

    # If the model echoed SCORE/SUMMARY lines inside the summary, strip those lines.
    s = re.sub(r"^\s*(SCORE\s*:.*|SUMMARY\s*:.*)\s*$\n?", "", s, flags=re.MULTILINE).strip()

    # Remove stray markdown emphasis markers that sometimes remain.
    s = re.sub(r"[*_`~]+", "", s).strip()

    # Convert any bullet-style formatting into a single plain-text paragraph.
    raw_lines = [ln.strip() for ln in s.splitlines() if ln.strip()]
    parts: list[str] = []
    for ln in raw_lines:
        if ln.startswith("#"):
            continue
        # Drop short heading-like lines (e.g., "Critical path:").
        if ln.endswith(":") and len(ln.split()) <= 5:
            continue
        if ln.startswith(_BULLET_PREFIXES):
            ln = ln[1:].strip()
        parts.append(ln)

    s = " ".join(parts).strip()
    s = re.sub(r"\s+", " ", s).strip()
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
        {"role": "system", "content": _blue_language_system_prompt(project.language)},
        {
            "role": "system",
            "content": (
                "FINAL BLUE HAT (facilitator/boss). "
                "You synthesize outcomes and decide next steps. "
                "Do not add new facts. Resolve contradictions by stating assumptions and choosing priorities.\n"
                + blue_persona_block
                + "Return ONLY the following plain-text format (no JSON, no extra lines):\n"
                + "SCORE: <1-10>\n"
                + "SUMMARY: <one plain-text paragraph>\n\n"
                + "Hard rules for SUMMARY:\n"
                + "- Plain text only: no markdown, no headings, no bullet lists, no numbering, no JSON.\n"
                + "- Do NOT use markdown characters at all (no '*', '_', '`', '#').\n"
                + "- Do NOT include JSON or any metadata wrappers (no '{', '}', no key names like 'score' or 'summary').\n"
                + "- Do NOT include the literal placeholder text like '[3-5 sentences of CONCLUSIONS]'.\n"
                + "- Do NOT restate the project description; the summary must be a NEW synthesis.\n"
                + "- Write an ELABORATED summary: 12-18 sentences total, still concise per sentence.\n"
                + "- Structure it as: (1) decision + rationale, (2) key trade-offs & risks, (3) recommended next steps and success criteria.\n"
                + "- You MUST incorporate signals from all hats/actors; do not focus on only one perspective."
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
                + _compact_results_for_blue(results_text)
            ),
        },
    ]

    text = generate_chat(messages, max_new_tokens=420)

    # Preferred parse: plain-text SCORE/SUMMARY format.
    score_match = _SCORE_LINE_RE.search(text)
    if score_match:
        score = int(score_match.group(1))
        summary_match = _SUMMARY_MARKER_RE.search(text)
        if summary_match:
            inline = (summary_match.group(1) or "").strip()
            tail = text[summary_match.end() :].strip()
            summary_raw = (inline + "\n" + tail).strip() if inline else tail
            summary = _sanitize_blue_summary(summary_raw)
            if summary:
                if _is_clean_blue_summary(summary):
                    return score, summary

                # One retry when the model included metadata/formatting instead of clean sentences.
                retry_messages = list(messages)
                retry_messages.insert(
                    -1,
                    {
                        "role": "system",
                        "content": (
                            "Your previous SUMMARY violated the rules (it contained metadata/labels/markdown or was too short). "
                            "Regenerate. SUMMARY must be a single plain-text paragraph of full sentences only. "
                            "Do not include SCORE/SUMMARY labels inside the summary. Do not use '*' or '-' or headings."
                        ),
                    },
                )
                retry_text = generate_chat(retry_messages, max_new_tokens=420)
                retry_score_match = _SCORE_LINE_RE.search(retry_text)
                retry_summary_match = _SUMMARY_MARKER_RE.search(retry_text)
                if retry_score_match and retry_summary_match:
                    retry_score = int(retry_score_match.group(1))
                    inline2 = (retry_summary_match.group(1) or "").strip()
                    tail2 = retry_text[retry_summary_match.end() :].strip()
                    retry_raw = (inline2 + "\n" + tail2).strip() if inline2 else tail2
                    retry_summary = _sanitize_blue_summary(retry_raw)
                    if retry_summary and _is_clean_blue_summary(retry_summary):
                        return retry_score, retry_summary
                # Fall back to the sanitized original.
                return score, summary

    # Back-compat parse: if the model returned JSON anyway.
    data = extract_json(text)
    if isinstance(data, dict):
        score = data.get("blue_score") or data.get("score")
        summary = _sanitize_blue_summary(str(data.get("summary") or ""))
        if isinstance(score, int) and 1 <= score <= 10 and isinstance(summary, str) and summary.strip():
            cleaned = summary.strip()
            if _is_clean_blue_summary(cleaned):
                return score, cleaned

    # Fallback: regex parse score; keep summary as raw text.
    match = _INT_RE.search(text)
    score = int(match.group(1)) if match else 5
    return score, _sanitize_blue_summary(text)
