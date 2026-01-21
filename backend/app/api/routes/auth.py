import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.models import User
from app.schemas.auth import RegisterIn, LoginIn, TokenOut, UserOut, ProfileUpdateIn
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


def _media_dir() -> str:
    return os.getenv("MEDIA_DIR", "/tmp/cloudchat_media")


async def _needs_setup(db: AsyncSession) -> bool:
    res = await db.execute(select(func.count(User.id)))
    return (res.scalar_one() or 0) == 0


@router.post("/register", response_model=UserOut)
async def register(data: RegisterIn, db: AsyncSession = Depends(get_db)):
    # Enforce initial setup (first user must be created via /setup)
    if await _needs_setup(db):
        raise HTTPException(status_code=403, detail="Setup required. Create the first admin at /setup.")

    exists = await db.execute(select(User).where((User.email == data.email) | (User.username == data.username)))
    if exists.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email or username already exists")

    user = User(
        email=data.email,
        username=data.username,
        display_name=data.username,
        password_hash=hash_password(data.password),
        role="user",
        is_banned=False,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/login", response_model=TokenOut)
async def login(data: LoginIn, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(User).where(User.email == data.email))
    user = res.scalar_one_or_none()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Wrong email or password")
    if getattr(user, "is_banned", False):
        raise HTTPException(status_code=403, detail="Account banned")

    token = create_access_token(str(user.id))
    return TokenOut(access_token=token)


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=UserOut)
async def update_me(data: ProfileUpdateIn, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    user.display_name = data.display_name
    user.bio = data.bio
    user.avatar_color = data.avatar_color
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/me/avatar", response_model=UserOut)
async def upload_avatar(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ct = (file.content_type or "").lower()
    if ct not in {"image/png", "image/jpeg", "image/webp"}:
        raise HTTPException(status_code=400, detail="Avatar must be PNG, JPEG, or WebP")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty upload")
    if len(data) > 3_000_000:
        raise HTTPException(status_code=413, detail="Avatar too large (max 3MB)")

    ext = ".png" if ct == "image/png" else (".webp" if ct == "image/webp" else ".jpg")
    media = _media_dir()
    avatars_dir = os.path.join(media, "avatars")
    os.makedirs(avatars_dir, exist_ok=True)

    fname = f"u{user.id}_{uuid.uuid4().hex}{ext}"
    path = os.path.join(avatars_dir, fname)
    with open(path, "wb") as f:
        f.write(data)

    # Best-effort cleanup of previous avatar file
    prev = getattr(user, "avatar_url", "") or ""
    if prev.startswith("/media/avatars/"):
        try:
            old = os.path.join(avatars_dir, os.path.basename(prev))
            if os.path.exists(old) and old != path:
                os.remove(old)
        except Exception:
            pass

    user.avatar_url = f"/media/avatars/{fname}"
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/me/avatar", response_model=UserOut)
async def delete_avatar(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    media = _media_dir()
    avatars_dir = os.path.join(media, "avatars")
    prev = getattr(user, "avatar_url", "") or ""
    if prev.startswith("/media/avatars/"):
        try:
            old = os.path.join(avatars_dir, os.path.basename(prev))
            if os.path.exists(old):
                os.remove(old)
        except Exception:
            pass
    user.avatar_url = ""
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
