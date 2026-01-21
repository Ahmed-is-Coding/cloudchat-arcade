from sqlalchemy import select, text

from app.core.database import engine, Base, SessionLocal
from app.models import Game

DEFAULT_GAMES = [
    {"key": "ttt", "name": "Tic-Tac-Toe", "description": "Classic 1v1 grid battle.", "min_players": 2, "max_players": 2, "enabled": True},
    {"key": "c4", "name": "Connect-4", "description": "Drop tokens. First to 4 wins.", "min_players": 2, "max_players": 2, "enabled": True},
    {"key": "quiz", "name": "Quiz Rush", "description": "Fast trivia for the room.", "min_players": 1, "max_players": 8, "enabled": True},
    {"key": "snake", "name": "Neon Snake", "description": "Single-player. Compete by score.", "min_players": 1, "max_players": 1, "enabled": True},
    {"key": "rps", "name": "Rock Paper Scissors", "description": "Quick 1v1 rounds.", "min_players": 2, "max_players": 2, "enabled": True},
    {"key": "word", "name": "Word Guess", "description": "Hangman-style room challenge.", "min_players": 1, "max_players": 12, "enabled": True},
]


async def init_db():
    # Simple MVP init: create tables + seed game catalog.
    # Also applies tiny, safe "ADD COLUMN" migrations (no Alembic in this MVP).
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        dialect = conn.dialect.name
        # Postgres supports IF NOT EXISTS, SQLite often doesn't.
        if dialect == "postgresql":
            await conn.execute(text("ALTER TABLE rooms ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(255) DEFAULT ''"))
        else:
            # Best-effort for SQLite or others.
            try:
                await conn.execute(text("ALTER TABLE rooms ADD COLUMN is_private BOOLEAN DEFAULT 0"))
            except Exception:
                pass
            try:
                await conn.execute(text("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(255) DEFAULT ''"))
            except Exception:
                pass

    async with SessionLocal() as db:
        res = await db.execute(select(Game))
        existing = {g.key for g in res.scalars().all()}
        for g in DEFAULT_GAMES:
            if g["key"] not in existing:
                db.add(Game(**g))
        await db.commit()
