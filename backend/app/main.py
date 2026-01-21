import os
from fastapi import FastAPI, WebSocket, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import JWTError

from app.core.config import settings
from app.core.database import get_db
from app.core.security import decode_token
from app.api.routes.router import api_router
from app.models import User
from app.realtime.manager import ws_room_handler
from app.db_init import init_db


app = FastAPI(title=settings.app_name)

# Static media (avatars)
MEDIA_DIR = os.getenv("MEDIA_DIR", "/tmp/cloudchat_media")
os.makedirs(os.path.join(MEDIA_DIR, "avatars"), exist_ok=True)
app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")

# CORS
# In dev we allow any origin to prevent the common LAN/localhost mismatch that causes
# browser errors like "Failed to fetch". Auth uses Bearer tokens, not cookies.
if (settings.environment or "dev").lower() == "dev":
    allow_origins = ["*"]
    allow_credentials = False
else:
    allow_origins = settings.cors_origin_list
    allow_credentials = True

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.on_event("startup")
async def on_startup():
    await init_db()


async def get_user_from_token(db: AsyncSession, token: str) -> User:
    try:
        user_id = int(decode_token(token))
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if getattr(user, "is_banned", False):
        raise HTTPException(status_code=403, detail="Account banned")
    return user


@app.websocket("/ws/rooms/{room_id}")
async def ws_room(room_id: int, websocket: WebSocket, db: AsyncSession = Depends(get_db)):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4401)
        return
    user = await get_user_from_token(db, token)
    await ws_room_handler(websocket, db, room_id, user)


@app.get("/healthz")
async def healthz():
    return {"ok": True}
