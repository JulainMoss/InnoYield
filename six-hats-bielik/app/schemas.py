from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


Hat = Literal["blue", "white", "red", "black", "yellow", "green"]


class ProjectInput(BaseModel):
    project_title: str = Field(..., min_length=1)
    project_description: str = Field(..., min_length=1)
    additional_context: str | None = None
    language: Literal["pl", "en"] = "pl"


class SixHatsRequest(BaseModel):
    project: ProjectInput
    # If true, returns per-hat outputs in the response.
    include_trace: bool = True
    # Optional custom sequence of hats. If omitted, a default sequence is used.
    sequence: list[Hat] | None = None


class HatOutput(BaseModel):
    hat: Hat
    text: str


class SixHatsResponse(BaseModel):
    project_title: str
    model_name: str
    device: str
    sequence: list[Hat]
    blue_score: int = Field(..., ge=1, le=10)
    summary: str
    trace: list[HatOutput] | None = None
