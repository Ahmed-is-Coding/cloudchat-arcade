from __future__ import annotations

import json
import random
from typing import Any, Dict, List, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis import redis_client
from app.models import GameScore, User
from app.schemas.games import LeaderboardEntry


# ---------- Redis keys ----------
def session_key(room_id: int, game_key: str) -> str:
    return f"game:{room_id}:{game_key}:state"


def players_key(room_id: int, game_key: str) -> str:
    return f"game:{room_id}:{game_key}:players"


# ---------- Shared state helpers ----------
async def load_state(room_id: int, game_key: str) -> Dict[str, Any]:
    raw = await redis_client.get(session_key(room_id, game_key))
    if not raw:
        return await reset_game(room_id, game_key)
    try:
        return json.loads(raw)
    except Exception:
        return await reset_game(room_id, game_key)


async def save_state(room_id: int, game_key: str, state: Dict[str, Any]) -> None:
    await redis_client.set(session_key(room_id, game_key), json.dumps(state), ex=60 * 60)  # 1 hour


async def reset_game(room_id: int, game_key: str) -> Dict[str, Any]:
    if game_key == "ttt":
        state = {"board": [""] * 9, "turn": "X", "winner": "", "draw": False}
    elif game_key == "c4":
        state = {"grid": [[0] * 7 for _ in range(6)], "turn": "R", "winner": "", "draw": False}
    elif game_key == "quiz":
        state = quiz_new_state()
    elif game_key == "snake":
        state = {"leaderboard": []}
    elif game_key == "rps":
        state = {"moves": {}, "scores": {}, "last": None}  # moves: {user_id: choice}
    elif game_key == "word":
        state = word_new_state()
    else:
        state = {}
    await save_state(room_id, game_key, state)
    return state


async def assign_symbol(room_id: int, game_key: str, user_id: int) -> str:
    """Deterministic player assignment per room/game."""
    raw = await redis_client.get(players_key(room_id, game_key))
    players: List[int] = []
    if raw:
        try:
            players = json.loads(raw)
        except Exception:
            players = []

    if user_id not in players:
        players.append(user_id)
        await redis_client.set(players_key(room_id, game_key), json.dumps(players), ex=60 * 60)

    idx = players.index(user_id)

    if game_key == "ttt":
        return "X" if idx % 2 == 0 else "O"
    if game_key == "c4":
        return "R" if idx % 2 == 0 else "Y"
    if game_key == "rps":
        return "P1" if idx % 2 == 0 else "P2"
    return "P"


async def clear_players(room_id: int, game_key: str) -> None:
    await redis_client.delete(players_key(room_id, game_key))


# ---------- TicTacToe ----------
def ttt_check(board: List[str]) -> Tuple[str, bool]:
    wins = [
        (0, 1, 2), (3, 4, 5), (6, 7, 8),
        (0, 3, 6), (1, 4, 7), (2, 5, 8),
        (0, 4, 8), (2, 4, 6),
    ]
    for a, b, c in wins:
        if board[a] and board[a] == board[b] == board[c]:
            return board[a], False
    if all(board):
        return "", True
    return "", False


# ---------- Connect4 ----------
def c4_drop(grid: List[List[int]], col: int, token: int) -> bool:
    if col < 0 or col > 6:
        return False
    for row in range(5, -1, -1):
        if grid[row][col] == 0:
            grid[row][col] = token
            return True
    return False


def c4_check(grid: List[List[int]]) -> Tuple[str, bool]:
    # token 1 => R, token 2 => Y
    def sym(v: int) -> str:
        return "R" if v == 1 else "Y"

    # check win
    for r in range(6):
        for c in range(7):
            v = grid[r][c]
            if v == 0:
                continue
            # right
            if c <= 3 and all(grid[r][c + i] == v for i in range(4)):
                return sym(v), False
            # down
            if r <= 2 and all(grid[r + i][c] == v for i in range(4)):
                return sym(v), False
            # diag down-right
            if r <= 2 and c <= 3 and all(grid[r + i][c + i] == v for i in range(4)):
                return sym(v), False
            # diag down-left
            if r <= 2 and c >= 3 and all(grid[r + i][c - i] == v for i in range(4)):
                return sym(v), False

    # draw
    if all(grid[0][c] != 0 for c in range(7)):
        return "", True
    return "", False


# ---------- Quiz ----------
QUIZ_QUESTIONS = [
    {"q": "Kubernetes default namespace?", "options": ["kube-system", "default", "prod", "main"], "a": 1},
    {"q": "What is a Pod?", "options": ["A node", "A workload unit", "A Service", "A Volume"], "a": 1},
    {"q": "Ingress is for…", "options": ["Storage", "External HTTP routing", "DNS only", "CPU scaling"], "a": 1},
    {"q": "Redis best use here?", "options": ["Chat history", "Presence + pub/sub", "Video calls", "TLS"], "a": 1},
]


def quiz_new_state() -> Dict[str, Any]:
    return {"running": False, "idx": 0, "scores": {}, "answered": {}, "question": QUIZ_QUESTIONS[0]}


# ---------- Word Guess ----------
_WORDS = [
    "KUBERNETES", "FASTAPI", "POSTGRES", "REDIS", "INGRESS",
    "DEVOPS", "MICROSERVICE", "DOCKER", "GRAFANA", "PROMETHEUS",
]

def word_new_state() -> Dict[str, Any]:
    word = random.choice(_WORDS)
    return {
        "word": word,
        "masked": ["_" if ch.isalpha() else ch for ch in word],
        "guessed": [],
        "misses": 0,
        "max_misses": 6,
        "scores": {},
        "done": False,
        "last_winner": None,
    }


# ---------- Scores (Snake leaderboard) ----------
async def upsert_best_score(db: AsyncSession, room_id: int, game_key: str, user_id: int, score: int):
    res = await db.execute(select(GameScore).where(
        (GameScore.room_id == room_id) & (GameScore.game_key == game_key) & (GameScore.user_id == user_id)
    ))
    item = res.scalar_one_or_none()
    if not item:
        item = GameScore(room_id=room_id, game_key=game_key, user_id=user_id, best_score=score)
        db.add(item)
    else:
        if score > item.best_score:
            item.best_score = score
            db.add(item)
    await db.commit()


async def get_leaderboard_for_room(db: AsyncSession, room_id: int, game_key: str) -> List[LeaderboardEntry]:
    res = await db.execute(
        select(GameScore.user_id, User.username, GameScore.best_score)
        .join(User, User.id == GameScore.user_id)
        .where((GameScore.room_id == room_id) & (GameScore.game_key == game_key))
        .order_by(GameScore.best_score.desc())
        .limit(20)
    )
    out: List[LeaderboardEntry] = []
    for user_id, username, best_score in res.all():
        out.append(LeaderboardEntry(user_id=user_id, username=username, best_score=best_score))
    return out
