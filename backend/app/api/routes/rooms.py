import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.redis import redis_client
from app.models import Room, RoomMember, Message, User
from app.schemas.messages import MessageOut
from app.api.deps import get_current_user

router = APIRouter(prefix="/rooms", tags=["rooms"])


async def _enforce_access(db: AsyncSession, room_id: int, user: User) -> Room:
    room_res = await db.execute(select(Room).where(Room.id == room_id))
    room = room_res.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    if getattr(room, "is_private", False):
        mem_res = await db.execute(
            select(RoomMember).where((RoomMember.room_id == room_id) & (RoomMember.user_id == user.id))
        )
        if not mem_res.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="This room is private.")

    return room


@router.post("/{room_id}/join")
async def join_room(room_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    room_res = await db.execute(select(Room).where(Room.id == room_id))
    room = room_res.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    mem_res = await db.execute(
        select(RoomMember).where((RoomMember.room_id == room_id) & (RoomMember.user_id == user.id))
    )
    if mem_res.scalar_one_or_none():
        return {"ok": True}

    if getattr(room, "is_private", False):
        raise HTTPException(status_code=403, detail="This room is private.")

    db.add(RoomMember(room_id=room_id, user_id=user.id, role="member"))
    await db.commit()
    return {"ok": True}


@router.get("/{room_id}/messages", response_model=list[MessageOut])
async def get_messages(
    room_id: int,
    limit: int = 50,
    before_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await _enforce_access(db, room_id, user)

    q = (
        select(Message, User)
        .join(User, User.id == Message.sender_id)
        .where(Message.room_id == room_id)
        .order_by(desc(Message.id))
        .limit(min(limit, 200))
    )
    if before_id:
        q = q.where(Message.id < before_id)

    res = await db.execute(q)
    items = list(res.all())
    items.reverse()

    out: list[MessageOut] = []
    for m, u in items:
        out.append(
            MessageOut(
                id=m.id,
                room_id=m.room_id,
                sender_id=m.sender_id,
                username=u.username,
                display_name=u.display_name or u.username,
                avatar_color=u.avatar_color or "#00f5ff",
                avatar_url=u.avatar_url or "",
                content=m.content,
                created_at=m.created_at.isoformat(),
            )
        )
    return out


def _presence_meta_key(room_id: int) -> str:
    return f"room:{room_id}:online:meta"


@router.get("/{room_id}/online-count")
async def online_count(room_id: int, user: User = Depends(get_current_user)):
    meta_key = _presence_meta_key(room_id)
    count = int(await redis_client.hlen(meta_key) or 0)
    if count == 0:
        legacy = f"room:{room_id}:online"
        count = int(await redis_client.scard(legacy) or 0)
    return {"room_id": room_id, "online": count}


@router.get("/{room_id}/online-users")
async def online_users(room_id: int, user: User = Depends(get_current_user)):
    meta_key = _presence_meta_key(room_id)
    raw = await redis_client.hgetall(meta_key)
    users: list[dict] = []
    for _, v in raw.items():
        try:
            users.append(json.loads(v))
        except Exception:
            continue

    return {"room_id": room_id, "online": len(users), "users": users}
