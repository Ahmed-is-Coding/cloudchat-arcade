from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import hash_password, create_access_token
from app.models import User
from app.schemas.auth import RegisterIn, TokenOut, UserOut

router = APIRouter(prefix="/setup", tags=["setup"])


@router.get("/status")
async def status(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(func.count(User.id)))
    count = int(res.scalar_one() or 0)
    return {"needs_setup": count == 0}


@router.post("/initialize", response_model=TokenOut)
async def initialize(data: RegisterIn, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(func.count(User.id)))
    count = int(res.scalar_one() or 0)
    if count != 0:
        raise HTTPException(status_code=409, detail="Setup already completed")

    user = User(
        email=data.email,
        username=data.username,
        display_name=data.username,
        password_hash=hash_password(data.password),
        role="admin",
        is_banned=False,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(str(user.id))
    return TokenOut(access_token=token)
