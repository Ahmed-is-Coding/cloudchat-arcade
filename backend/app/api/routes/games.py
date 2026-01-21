from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import Game, GameScore, User
from app.schemas.games import GameOut, LeaderboardEntry
from app.services.games import get_leaderboard_for_room

router = APIRouter(prefix="/games", tags=["games"])


@router.get("/catalog", response_model=list[GameOut])
async def catalog(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    res = await db.execute(select(Game).order_by(Game.id.asc()))
    return res.scalars().all()


@router.get("/rooms/{room_id}/leaderboard/{game_key}", response_model=list[LeaderboardEntry])
async def leaderboard(room_id: int, game_key: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return await get_leaderboard_for_room(db, room_id, game_key)
