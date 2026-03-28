from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional
from models import IdeaStatus, HatColor, BetPosition, RedemptionStatus


# ── Auth ──────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str

    @field_validator("username")
    @classmethod
    def username_valid(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2 or len(v) > 50:
            raise ValueError("Username must be 2–50 characters")
        return v

    @field_validator("password")
    @classmethod
    def password_valid(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ── User ──────────────────────────────────────────────────────────────────────

class UserOut(BaseModel):
    id: str
    username: str
    email: str
    coin_balance: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Hat scores ────────────────────────────────────────────────────────────────

class HatScoreOut(BaseModel):
    hat_color: HatColor
    score: int
    reasoning: str

    model_config = {"from_attributes": True}


# ── Ideas ─────────────────────────────────────────────────────────────────────

class IdeaCreate(BaseModel):
    title: str
    description: str
    milestone: str
    category: str = "Inne"

    @field_validator("title")
    @classmethod
    def title_valid(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 5 or len(v) > 200:
            raise ValueError("Title must be 5–200 characters")
        return v

    @field_validator("description")
    @classmethod
    def description_valid(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 50:
            raise ValueError("Description must be at least 50 characters")
        return v


class IdeaOut(BaseModel):
    id: str
    title: str
    description: str
    milestone: str
    category: str
    status: IdeaStatus
    validation_score: int
    yes_pool: int
    no_pool: int
    creator_id: str
    creator_username: str
    hat_scores: list[HatScoreOut]
    created_at: datetime
    market_closes_at: Optional[datetime]
    outcome: Optional[BetPosition]

    model_config = {"from_attributes": True}


class ValidationStatusOut(BaseModel):
    status: IdeaStatus
    validation_score: int
    hat_scores: list[HatScoreOut]


# ── Bets ──────────────────────────────────────────────────────────────────────

class BetCreate(BaseModel):
    idea_id: str
    position: BetPosition
    amount: int

    @field_validator("amount")
    @classmethod
    def amount_valid(cls, v: int) -> int:
        if v < 1:
            raise ValueError("Amount must be at least 1")
        return v


class BetOut(BaseModel):
    id: str
    idea_id: str
    idea_title: str
    idea_milestone: str
    position: BetPosition
    amount: int
    multiplier: Optional[float]
    payout: Optional[int]
    created_at: datetime
    resolved_at: Optional[datetime]
    market_closes_at: Optional[datetime]
    current_probability: int

    model_config = {"from_attributes": True}


class BetStatsOut(BaseModel):
    yes_pool: int
    no_pool: int
    probability: int  # % YES


# ── Redemptions ───────────────────────────────────────────────────────────────

class RedemptionCreate(BaseModel):
    reward_type: str


class RedemptionOut(BaseModel):
    id: str
    reward_type: str
    cost: int
    status: RedemptionStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class MarketItemOut(BaseModel):
    id: str
    name: str
    description: str
    price: int
    image_emoji: str
    category: str
    available: bool
