from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models import User, Redemption
from schemas import RedemptionCreate, RedemptionOut, MarketItemOut
from auth import get_current_user
import uuid

router = APIRouter(prefix="/api/redemptions", tags=["redemptions"])

CATALOG: list[dict] = [
    {"id": "item-1", "name": "Kawa w Starbucks", "description": "Dowolny napój do 30 zł w Starbucks", "price": 50, "image_emoji": "☕", "category": "Jedzenie", "available": True},
    {"id": "item-2", "name": "Żappsy 50 zł", "description": "50 zł do wykorzystania w aplikacji Żabka", "price": 120, "image_emoji": "🛒", "category": "Zakupy", "available": True},
    {"id": "item-3", "name": "Netflix 1 miesiąc", "description": "Miesięczna subskrypcja Netflix Standard", "price": 200, "image_emoji": "🎬", "category": "Rozrywka", "available": True},
    {"id": "item-4", "name": "Amazon Gift Card $10", "description": "$10 do wydania na Amazon", "price": 250, "image_emoji": "📦", "category": "Zakupy", "available": True},
    {"id": "item-5", "name": "Steam Wallet 50 zł", "description": "50 zł do wydania na Steam", "price": 150, "image_emoji": "🎮", "category": "Gaming", "available": True},
    {"id": "item-6", "name": "Audioteka Premium", "description": "3 miesiące Audioteka Premium", "price": 100, "image_emoji": "🎧", "category": "Rozrywka", "available": True},
    {"id": "item-7", "name": "Voucher Allegro 100 zł", "description": "100 zł na zakupy w Allegro", "price": 350, "image_emoji": "🏷️", "category": "Zakupy", "available": True},
    {"id": "item-8", "name": "Spotify Premium", "description": "3 miesiące Spotify Premium", "price": 90, "image_emoji": "🎵", "category": "Muzyka", "available": True},
]

CATALOG_MAP = {item["id"]: item for item in CATALOG}


@router.get("/catalog", response_model=list[MarketItemOut])
async def get_catalog():
    return [MarketItemOut(**item) for item in CATALOG]


@router.post("", response_model=RedemptionOut, status_code=201)
async def redeem(
    body: RedemptionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = CATALOG_MAP.get(body.reward_type)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found in catalog")

    if current_user.coin_balance < item["price"]:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient coins. Need {item['price']}, have {current_user.coin_balance}",
        )

    current_user.coin_balance -= item["price"]

    redemption = Redemption(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        reward_type=body.reward_type,
        cost=item["price"],
    )
    db.add(redemption)
    await db.commit()
    await db.refresh(redemption)
    return redemption
