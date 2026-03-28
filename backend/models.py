import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, Float, DateTime, ForeignKey, Text, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base
import enum


def utcnow():
    return datetime.now(timezone.utc)


def new_uuid():
    return str(uuid.uuid4())


class IdeaStatus(str, enum.Enum):
    PENDING = "PENDING"
    VALIDATED = "VALIDATED"
    REJECTED = "REJECTED"
    RESOLVED = "RESOLVED"


class HatColor(str, enum.Enum):
    WHITE = "WHITE"
    RED = "RED"
    BLACK = "BLACK"
    YELLOW = "YELLOW"
    GREEN = "GREEN"
    BLUE = "BLUE"


class BetPosition(str, enum.Enum):
    YES = "YES"
    NO = "NO"


class RedemptionStatus(str, enum.Enum):
    PENDING = "PENDING"
    FULFILLED = "FULFILLED"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    coin_balance: Mapped[int] = mapped_column(Integer, default=20, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    ideas: Mapped[list["Idea"]] = relationship(back_populates="creator")
    bets: Mapped[list["Bet"]] = relationship(back_populates="user")
    redemptions: Mapped[list["Redemption"]] = relationship(back_populates="user")


class Idea(Base):
    __tablename__ = "ideas"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    creator_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="Inne")
    status: Mapped[IdeaStatus] = mapped_column(SAEnum(IdeaStatus), default=IdeaStatus.PENDING)
    validation_score: Mapped[int] = mapped_column(Integer, default=0)
    yes_pool: Mapped[int] = mapped_column(Integer, default=0)
    no_pool: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    market_closes_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    outcome: Mapped[BetPosition | None] = mapped_column(SAEnum(BetPosition), nullable=True)

    creator: Mapped["User"] = relationship(back_populates="ideas")
    hat_scores: Mapped[list["HatScore"]] = relationship(back_populates="idea", cascade="all, delete-orphan")
    bets: Mapped[list["Bet"]] = relationship(back_populates="idea", cascade="all, delete-orphan")


class HatScore(Base):
    __tablename__ = "hat_scores"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    idea_id: Mapped[str] = mapped_column(ForeignKey("ideas.id"), nullable=False)
    hat_color: Mapped[HatColor] = mapped_column(SAEnum(HatColor), nullable=False)
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    reasoning: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    idea: Mapped["Idea"] = relationship(back_populates="hat_scores")


class Bet(Base):
    __tablename__ = "bets"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    idea_id: Mapped[str] = mapped_column(ForeignKey("ideas.id"), nullable=False)
    position: Mapped[BetPosition] = mapped_column(SAEnum(BetPosition), nullable=False)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    multiplier: Mapped[float | None] = mapped_column(Float, nullable=True)
    payout: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship(back_populates="bets")
    idea: Mapped["Idea"] = relationship(back_populates="bets")


class Redemption(Base):
    __tablename__ = "redemptions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    reward_type: Mapped[str] = mapped_column(String(100), nullable=False)
    cost: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[RedemptionStatus] = mapped_column(SAEnum(RedemptionStatus), default=RedemptionStatus.PENDING)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    user: Mapped["User"] = relationship(back_populates="redemptions")
