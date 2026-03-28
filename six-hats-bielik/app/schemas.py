from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


Hat = Literal["blue", "white", "red", "black", "yellow", "green"]


class ActorInput(BaseModel):
    name: str = Field(..., min_length=1)
    persona: str = Field(..., min_length=1)


class ProjectInput(BaseModel):
    project_title: str = Field(..., min_length=1)
    project_description: str = Field(..., min_length=1)
    additional_context: str | None = None
    language: Literal["pl", "en"] = "pl"


class SixHatsRequest(BaseModel):
    project: ProjectInput
    # Execution mode:
    # - 'actors' (default): stable Actor personas; Hats are per-iteration thinking constraints
    # - 'legacy': one output per Hat, where the Hat carries the persona (backwards compatible)
    mode: Literal["actors", "legacy"] = "actors"
    # Optional stable personas (actors). Used only when mode='actors'.
    # If omitted in actor-mode, DEFAULT_ACTORS are used.
    actors: list[ActorInput] | None = None

    # Optional dedicated persona for the final Blue Hat synthesis ("boss").
    # In a real workflow Blue Hat is typically facilitated by a single leader, not all actors.
    blue_actor: ActorInput | None = None
    # If true, returns per-hat outputs in the response.
    include_trace: bool = True
    # Optional custom sequence of hats. If omitted, a default sequence is used.
    sequence: list[Hat] | None = None


class HatOutput(BaseModel):
    hat: Hat
    text: str


class ActorOutput(BaseModel):
    actor_name: str
    text: str


class HatRoundOutput(BaseModel):
    hat: Hat
    outputs: list[ActorOutput]


class SixHatsResponse(BaseModel):
    score: int = Field(..., ge=1, le=10)
    summary: str
    # Per Hat, multiple Actor outputs (actor-mode) or a single synthesized output (legacy-mode).
    rounds: list[HatRoundOutput] | None = None
