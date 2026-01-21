from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, or_, exists
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import Server, Room, RoomMember, User
from app.schemas.servers import ServerCreate, ServerOut, RoomCreate, RoomOut
from app.api.deps import get_current_user

router = APIRouter(prefix="/servers", tags=["servers"])


@router.get("", response_model=list[ServerOut])
async def list_servers(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    res = await db.execute(select(Server).order_by(Server.id.asc()))
    return res.scalars().all()


@router.post("", response_model=ServerOut)
async def create_server(data: ServerCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    server = Server(name=data.name, owner_id=user.id)
    db.add(server)
    await db.commit()
    await db.refresh(server)

    # Create default room + membership
    room = Room(server_id=server.id, name="general")
    db.add(room)
    await db.commit()
    await db.refresh(room)

    db.add(RoomMember(room_id=room.id, user_id=user.id, role="admin"))
    await db.commit()

    return server


@router.get("/{server_id}/rooms", response_model=list[RoomOut])
async def list_rooms(server_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    # Public rooms are visible to everyone.
    # Private rooms are visible only to members.
    member_exists = exists(
        select(RoomMember.id).where((RoomMember.room_id == Room.id) & (RoomMember.user_id == user.id))
    )
    q = (
        select(Room)
        .where(Room.server_id == server_id)
        .where(or_(Room.is_private == False, member_exists))
        .order_by(Room.id.asc())
    )
    res = await db.execute(q)
    return res.scalars().all()


@router.post("/{server_id}/rooms", response_model=RoomOut)
async def create_room(server_id: int, data: RoomCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    srv = await db.execute(select(Server).where(Server.id == server_id))
    if not srv.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Server not found")

    room = Room(server_id=server_id, name=data.name, is_private=bool(getattr(data, "is_private", False)))
    db.add(room)
    await db.commit()
    await db.refresh(room)

    # Join creator (admin)
    db.add(RoomMember(room_id=room.id, user_id=user.id, role="admin"))

    # Invite members for private rooms (by username)
    invited = list(getattr(data, "invited_usernames", []) or [])
    if room.is_private and invited:
        # Normalize + de-dup + skip creator
        norm = []
        seen = set()
        for u in invited:
            uu = (u or "").strip()
            if not uu:
                continue
            key = uu.lower()
            if key in seen:
                continue
            seen.add(key)
            if key == user.username.lower():
                continue
            norm.append(uu)

        if norm:
            resu = await db.execute(select(User).where(User.username.in_(norm)))
            users = resu.scalars().all()
            found = {u.username for u in users}
            missing = [x for x in norm if x not in found]
            if missing:
                raise HTTPException(status_code=400, detail=f"Unknown usernames: {', '.join(missing)}")
            for u in users:
                db.add(RoomMember(room_id=room.id, user_id=u.id, role="member"))

    await db.commit()

    return room
