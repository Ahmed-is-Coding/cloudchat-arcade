from sqlalchemy import String, DateTime, func, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)

    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    username: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))

    # Profile
    display_name: Mapped[str] = mapped_column(String(60), default="")
    bio: Mapped[str] = mapped_column(String(200), default="")
    avatar_color: Mapped[str] = mapped_column(String(24), default="#00f5ff")
    avatar_url: Mapped[str] = mapped_column(String(255), default="")


    # Access control
    role: Mapped[str] = mapped_column(String(20), default="user")  # user/mod/admin
    is_banned: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
