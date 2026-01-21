from sqlalchemy import String, DateTime, func, ForeignKey, UniqueConstraint, Integer, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class Game(Base):
    __tablename__ = "games"

    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(40), unique=True, index=True)  # ttt, c4, quiz, snake, rps, word
    name: Mapped[str] = mapped_column(String(80))
    description: Mapped[str] = mapped_column(String(160), default="")
    min_players: Mapped[int] = mapped_column(Integer, default=1)
    max_players: Mapped[int] = mapped_column(Integer, default=8)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)


class GameScore(Base):
    __tablename__ = "game_scores"
    __table_args__ = (UniqueConstraint("room_id", "game_key", "user_id", name="uq_score_room_game_user"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id", ondelete="CASCADE"), index=True)
    game_key: Mapped[str] = mapped_column(String(40), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    best_score: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
