import asyncio
import json
from typing import Any, Dict

from fastapi import WebSocket
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis import redis_client
from app.models import Message, RoomMember, User, Room
from app.services.games import (
    load_state, save_state, reset_game, assign_symbol, clear_players,
    ttt_check, c4_check, c4_drop,
    upsert_best_score, get_leaderboard_for_room, QUIZ_QUESTIONS, word_new_state
)

ROOM_CHANNEL = "room:{room_id}:events"


def room_pubsub_channel(room_id: int) -> str:
    return ROOM_CHANNEL.format(room_id=room_id)


async def publish_room(room_id: int, event: Dict[str, Any]) -> None:
    await redis_client.publish(room_pubsub_channel(room_id), json.dumps(event))


def _presence_counts_key(room_id: int) -> str:
    return f"room:{room_id}:online:counts"


def _presence_meta_key(room_id: int) -> str:
    return f"room:{room_id}:online:meta"


async def set_online(room_id: int, user: User, online: bool) -> tuple[int, list[dict]]:
    """Room presence that works with multiple tabs/windows.

    - counts hash: user_id -> connection_count
    - meta hash: user_id -> json payload (username/display_name/avatar)
    Online count = HLEN(meta)
    """
    counts_key = _presence_counts_key(room_id)
    meta_key = _presence_meta_key(room_id)
    uid = str(user.id)

    if online:
        new_count = int(await redis_client.hincrby(counts_key, uid, 1))
        if new_count == 1:
            meta = {
                "id": user.id,
                "username": user.username,
                "display_name": (user.display_name or user.username),
                "avatar_color": (user.avatar_color or "#00f5ff"),
                "avatar_url": (getattr(user, "avatar_url", "") or ""),
            }
            await redis_client.hset(meta_key, uid, json.dumps(meta))
    else:
        cur = await redis_client.hget(counts_key, uid)
        cur_i = int(cur) if cur is not None else 0
        new_count = cur_i - 1
        if new_count <= 0:
            await redis_client.hdel(counts_key, uid)
            await redis_client.hdel(meta_key, uid)
        else:
            await redis_client.hset(counts_key, uid, new_count)

    await redis_client.expire(counts_key, 60 * 60)
    await redis_client.expire(meta_key, 60 * 60)

    raw = await redis_client.hgetall(meta_key)
    users: list[dict] = []
    for _, v in raw.items():
        try:
            users.append(json.loads(v))
        except Exception:
            continue
    users.sort(key=lambda x: (x.get("username") or "").lower())
    return len(users), users


async def ensure_member(db: AsyncSession, room_id: int, user_id: int, allow_auto_join: bool) -> None:
    res = await db.execute(select(RoomMember).where((RoomMember.room_id == room_id) & (RoomMember.user_id == user_id)))
    if not res.scalar_one_or_none():
        if not allow_auto_join:
            return
        # Auto-join for MVP convenience (public rooms only)
        db.add(RoomMember(room_id=room_id, user_id=user_id, role="member"))
        await db.commit()


def rps_winner(a: str, b: str) -> int:
    # returns 0 draw, 1 if a wins, 2 if b wins
    beats = {"rock": "scissors", "paper": "rock", "scissors": "paper"}
    if a == b:
        return 0
    return 1 if beats.get(a) == b else 2


def quiz_public_state(state: Dict[str, Any]) -> Dict[str, Any]:
    s = dict(state)
    q = s.get("question")
    if isinstance(q, dict) and "a" in q:
        q2 = dict(q)
        q2.pop("a", None)
        s["question"] = q2
    return s


def word_public_state(state: Dict[str, Any]) -> Dict[str, Any]:
    s = dict(state)
    word = s.pop("word", None)
    if s.get("done") and word:
        s["answer"] = word
    return s


async def ws_room_handler(ws: WebSocket, db: AsyncSession, room_id: int, user: User):
    # Validate room + access
    rres = await db.execute(select(Room).where(Room.id == room_id))
    room = rres.scalar_one_or_none()
    if not room:
        await ws.close(code=4404)
        return

    allow_auto_join = not bool(getattr(room, "is_private", False))
    if not allow_auto_join:
        mem = await db.execute(select(RoomMember).where((RoomMember.room_id == room_id) & (RoomMember.user_id == user.id)))
        if not mem.scalar_one_or_none():
            await ws.close(code=4403)
            return

    await ws.accept()

    await ensure_member(db, room_id, user.id, allow_auto_join=allow_auto_join)

    # Presence online
    online_count, online_users = await set_online(room_id, user, True)
    await publish_room(room_id, {"type": "presence", "payload": {"user_id": user.id, "username": user.username, "status": "online"}})
    await publish_room(room_id, {"type": "room.online", "payload": {"room_id": room_id, "online": online_count}})
    await publish_room(room_id, {"type": "room.online-users", "payload": {"room_id": room_id, "online": online_count, "users": online_users}})

    pubsub = redis_client.pubsub()
    await pubsub.subscribe(room_pubsub_channel(room_id))

    async def sender():
        async for msg in pubsub.listen():
            if msg is None:
                continue
            if msg.get("type") != "message":
                continue
            data = msg.get("data")
            if not data or isinstance(data, int):
                continue
            try:
                await ws.send_text(data)
            except Exception:
                break

    # Send snapshot to this client immediately (helps new window load user list)
    try:
        await ws.send_text(json.dumps({"type": "room.online-users", "payload": {"room_id": room_id, "online": online_count, "users": online_users}}))
    except Exception:
        pass

    async def receiver():
        while True:
            raw = await ws.receive_text()
            try:
                obj = json.loads(raw)
            except Exception:
                continue
            et = obj.get("type")
            payload = obj.get("payload") or {}

            if et == "chat.send":
                content = (payload.get("content") or "").strip()
                if not content:
                    continue
                msg = Message(room_id=room_id, sender_id=user.id, content=content)
                db.add(msg)
                await db.commit()
                await db.refresh(msg)
                out = {
                    "type": "chat.message",
                    "payload": {
                        "id": msg.id,
                        "room_id": room_id,
                        "sender_id": user.id,
                        "username": user.username,
                        "display_name": (user.display_name or user.username),
                        "avatar_color": (user.avatar_color or "#00f5ff"),
                        "avatar_url": (getattr(user, "avatar_url", "") or ""),
                        "content": msg.content,
                        "created_at": msg.created_at.isoformat(),
                    },
                }
                await publish_room(room_id, out)

            elif et == "invite.play":
                try:
                    to_user_id = int(payload.get("to_user_id") or 0)
                except Exception:
                    to_user_id = 0
                if to_user_id <= 0 or to_user_id == user.id:
                    continue
                game_key = payload.get("game_key") or None
                await publish_room(
                    room_id,
                    {
                        "type": "invite.play",
                        "payload": {
                            "room_id": room_id,
                            "to_user_id": to_user_id,
                            "from_user_id": user.id,
                            "from_username": user.username,
                            "from_display_name": (user.display_name or user.username),
                            "game_key": game_key,
                        },
                    },
                )

            elif et == "typing":
                await publish_room(room_id, {
                    "type": "typing",
                    "payload": {"user_id": user.id, "username": user.username, "is_typing": bool(payload.get("is_typing"))},
                })

            elif et == "game.join":
                game_key = payload.get("game_key")
                if game_key not in {"ttt", "c4", "quiz", "snake", "rps", "word"}:
                    continue
                you = {"symbol": await assign_symbol(room_id, game_key, user.id)}
                state = await load_state(room_id, game_key)
                if game_key == "quiz":
                    state = quiz_public_state(state)
                if game_key == "word":
                    state = word_public_state(state)
                await ws.send_text(json.dumps({"type": "game.state", "payload": {"room_id": room_id, "game_key": game_key, "state": state, "you": you}}))

            elif et == "game.reset":
                game_key = payload.get("game_key")
                if game_key not in {"ttt", "c4", "quiz", "rps", "word"}:
                    continue
                await clear_players(room_id, game_key)
                state = await reset_game(room_id, game_key)
                if game_key == "quiz":
                    state = quiz_public_state(state)
                if game_key == "word":
                    state = word_public_state(state)
                await publish_room(room_id, {"type": "game.event", "payload": {"room_id": room_id, "game_key": game_key, "state": state}})

            elif et == "game.event":
                game_key = payload.get("game_key")
                ev = payload.get("event") or {}

                if game_key == "ttt":
                    state = await load_state(room_id, "ttt")
                    if state.get("winner") or state.get("draw"):
                        continue
                    idx = int(ev.get("idx", -1))
                    if idx < 0 or idx > 8:
                        continue
                    board = state.get("board", [""] * 9)
                    if board[idx]:
                        continue
                    symbol = await assign_symbol(room_id, "ttt", user.id)
                    if symbol != state.get("turn"):
                        continue
                    board[idx] = symbol
                    win, draw = ttt_check(board)
                    state["board"] = board
                    if win:
                        state["winner"] = win
                    if draw:
                        state["draw"] = True
                    state["turn"] = "O" if state.get("turn") == "X" else "X"
                    await save_state(room_id, "ttt", state)
                    await publish_room(room_id, {"type": "game.event", "payload": {"room_id": room_id, "game_key": "ttt", "state": state}})

                elif game_key == "c4":
                    state = await load_state(room_id, "c4")
                    if state.get("winner") or state.get("draw"):
                        continue
                    col = int(ev.get("col", -1))
                    if col < 0 or col > 6:
                        continue
                    token = await assign_symbol(room_id, "c4", user.id)
                    if token != state.get("turn"):
                        continue
                    grid = state.get("grid")
                    if not isinstance(grid, list):
                        continue
                    ok = c4_drop(grid, col, 1 if token == "R" else 2)
                    if not ok:
                        continue
                    win, draw = c4_check(grid)
                    state["grid"] = grid
                    if win:
                        state["winner"] = win
                    if draw:
                        state["draw"] = True
                    state["turn"] = "Y" if state.get("turn") == "R" else "R"
                    await save_state(room_id, "c4", state)
                    await publish_room(room_id, {"type": "game.event", "payload": {"room_id": room_id, "game_key": "c4", "state": state}})

                elif game_key == "quiz":
                    state = await load_state(room_id, "quiz")
                    action = ev.get("action")
                    if action == "start":
                        state = {"running": True, "idx": 0, "scores": {}, "answered": {}, "question": QUIZ_QUESTIONS[0]}
                        await save_state(room_id, "quiz", state)
                        await publish_room(room_id, {"type": "game.event", "payload": {"room_id": room_id, "game_key": "quiz", "state": quiz_public_state(state)}})
                    elif action == "answer":
                        if not state.get("running"):
                            continue
                        idxq = int(state.get("idx", 0))
                        q = QUIZ_QUESTIONS[idxq]
                        ans = int(ev.get("answer", -1))
                        answered = state.get("answered", {})
                        if str(user.id) in answered:
                            continue
                        answered[str(user.id)] = ans
                        state["answered"] = answered
                        if ans == q["a"]:
                            scores = state.get("scores", {})
                            scores[str(user.id)] = int(scores.get(str(user.id), 0)) + 1
                            state["scores"] = scores
                        await save_state(room_id, "quiz", state)
                        await publish_room(room_id, {"type": "game.event", "payload": {"room_id": room_id, "game_key": "quiz", "state": quiz_public_state(state)}})
                    elif action == "next":
                        if not state.get("running"):
                            continue
                        idxq = int(state.get("idx", 0)) + 1
                        if idxq >= len(QUIZ_QUESTIONS):
                            state["running"] = False
                        else:
                            state["idx"] = idxq
                            state["answered"] = {}
                            state["question"] = QUIZ_QUESTIONS[idxq]
                        await save_state(room_id, "quiz", state)
                        await publish_room(room_id, {"type": "game.event", "payload": {"room_id": room_id, "game_key": "quiz", "state": quiz_public_state(state)}})

                elif game_key == "rps":
                    state = await load_state(room_id, "rps")
                    choice = (ev.get("choice") or "").lower()
                    if choice not in {"rock", "paper", "scissors"}:
                        continue
                    moves = state.get("moves", {})
                    moves[str(user.id)] = choice
                    state["moves"] = moves

                    if len(moves.keys()) >= 2:
                        ids = list(moves.keys())[:2]
                        a_id, b_id = ids[0], ids[1]
                        a, b = moves[a_id], moves[b_id]
                        res = rps_winner(a, b)
                        scores = state.get("scores", {})
                        if res == 1:
                            scores[a_id] = int(scores.get(a_id, 0)) + 1
                            state["last"] = {"winner": a_id, "a": a, "b": b}
                        elif res == 2:
                            scores[b_id] = int(scores.get(b_id, 0)) + 1
                            state["last"] = {"winner": b_id, "a": a, "b": b}
                        else:
                            state["last"] = {"winner": None, "a": a, "b": b}
                        state["scores"] = scores
                        state["moves"] = {}

                    await save_state(room_id, "rps", state)
                    await publish_room(room_id, {"type": "game.event", "payload": {"room_id": room_id, "game_key": "rps", "state": state}})

                elif game_key == "word":
                    state = await load_state(room_id, "word")
                    action = ev.get("action") or "guess"
                    if action == "new":
                        state = word_new_state()
                        await save_state(room_id, "word", state)
                        await publish_room(room_id, {"type": "game.event", "payload": {"room_id": room_id, "game_key": "word", "state": word_public_state(state)}})
                        continue

                    if state.get("done"):
                        continue

                    letter = (ev.get("letter") or "").upper()
                    if not letter.isalpha() or len(letter) != 1:
                        continue
                    guessed = set(state.get("guessed", []))
                    if letter in guessed:
                        continue
                    guessed.add(letter)
                    word = state.get("word", "")
                    masked = state.get("masked", [])
                    hit = False
                    for i, ch in enumerate(word):
                        if ch == letter:
                            masked[i] = letter
                            hit = True
                    if not hit:
                        state["misses"] = int(state.get("misses", 0)) + 1
                    state["guessed"] = sorted(list(guessed))
                    state["masked"] = masked

                    if "_" not in masked:
                        state["done"] = True
                        state["last_winner"] = str(user.id)
                        scores = state.get("scores", {})
                        scores[str(user.id)] = int(scores.get(str(user.id), 0)) + 1
                        state["scores"] = scores
                    elif int(state.get("misses", 0)) >= int(state.get("max_misses", 6)):
                        state["done"] = True
                        state["last_winner"] = None

                    await save_state(room_id, "word", state)
                    await publish_room(room_id, {"type": "game.event", "payload": {"room_id": room_id, "game_key": "word", "state": word_public_state(state)}})

            elif et == "snake.score":
                score = int(payload.get("score", 0))
                if score <= 0:
                    continue
                await upsert_best_score(db, room_id, "snake", user.id, score)
                leaderboard = await get_leaderboard_for_room(db, room_id, "snake")
                await publish_room(room_id, {"type": "snake.leaderboard", "payload": {"room_id": room_id, "leaderboard": [e.model_dump() for e in leaderboard]}})
            else:
                continue

    send_task = asyncio.create_task(sender())
    recv_task = asyncio.create_task(receiver())
    done, pending = await asyncio.wait({send_task, recv_task}, return_when=asyncio.FIRST_COMPLETED)

    for t in pending:
        t.cancel()

    try:
        await pubsub.unsubscribe(room_pubsub_channel(room_id))
        await pubsub.close()
    except Exception:
        pass

    # Presence offline
    online_count, online_users = await set_online(room_id, user, False)
    await publish_room(room_id, {"type": "presence", "payload": {"user_id": user.id, "username": user.username, "status": "offline"}})
    await publish_room(room_id, {"type": "room.online", "payload": {"room_id": room_id, "online": online_count}})
    await publish_room(room_id, {"type": "room.online-users", "payload": {"room_id": room_id, "online": online_count, "users": online_users}})
