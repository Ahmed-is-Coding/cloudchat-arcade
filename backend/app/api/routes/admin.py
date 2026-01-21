from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin
from app.core.database import get_db
from app.models import User, Server, Game
from app.schemas.admin import (
    AdminUserOut, AdminUserUpdateIn,
    AdminServerOut,
    AdminGameOut, AdminGameUpdateIn,
)

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=list[AdminUserOut])
async def list_users(db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    res = await db.execute(select(User).order_by(User.id.asc()))
    return res.scalars().all()


@router.patch("/users/{user_id}", response_model=AdminUserOut)
async def update_user(user_id: int, data: AdminUserUpdateIn, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    res = await db.execute(select(User).where(User.id == user_id))
    u = res.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    if u.id == admin.id and data.is_banned:
        raise HTTPException(status_code=400, detail="You cannot ban yourself")

    if data.role is not None:
        if data.role not in {"user", "mod", "admin"}:
            raise HTTPException(status_code=400, detail="Invalid role")
        u.role = data.role
    if data.is_banned is not None:
        u.is_banned = data.is_banned
    if data.username is not None:
        u.username = data.username
    if data.display_name is not None:
        u.display_name = data.display_name

    db.add(u)
    await db.commit()
    await db.refresh(u)
    return u


@router.get("/servers", response_model=list[AdminServerOut])
async def list_servers(db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    res = await db.execute(select(Server).order_by(Server.id.asc()))
    return res.scalars().all()


@router.delete("/servers/{server_id}")
async def delete_server(server_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    res = await db.execute(select(Server).where(Server.id == server_id))
    s = res.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Server not found")
    await db.delete(s)
    await db.commit()
    return {"ok": True}


@router.get("/games", response_model=list[AdminGameOut])
async def list_games(db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    res = await db.execute(select(Game).order_by(Game.id.asc()))
    return res.scalars().all()


@router.patch("/games/{game_id}", response_model=AdminGameOut)
async def update_game(game_id: int, data: AdminGameUpdateIn, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    res = await db.execute(select(Game).where(Game.id == game_id))
    g = res.scalar_one_or_none()
    if not g:
        raise HTTPException(status_code=404, detail="Game not found")

    if data.enabled is not None:
        g.enabled = data.enabled
    if data.name is not None:
        g.name = data.name
    if data.description is not None:
        g.description = data.description
    if data.min_players is not None:
        g.min_players = data.min_players
    if data.max_players is not None:
        g.max_players = data.max_players

    db.add(g)
    await db.commit()
    await db.refresh(g)
    return g
