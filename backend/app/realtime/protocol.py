# WebSocket event protocol.
#
# Every message is JSON:
# { "type": "<event_type>", "payload": { ... } }

# Incoming types from client:
# - "chat.send" payload: { room_id, content }
# - "typing" payload: { room_id, is_typing }
# - "game.join" payload: { room_id, game_key }
# - "game.reset" payload: { room_id, game_key }
# - "game.event" payload: { room_id, game_key, event: {...} }
# - "snake.score" payload: { room_id, score }

# Outgoing types to client:
# - "chat.message" payload: { id, room_id, sender_id, username, content, created_at }
# - "typing" payload: { user_id, username, is_typing }
# - "presence" payload: { user_id, username, status }  status: "online"/"offline"
# - "room.online" payload: { room_id, online }
# - "game.state" payload: { room_id, game_key, state, you: {symbol} }
# - "game.event" payload: { room_id, game_key, state }
# - "snake.leaderboard" payload: { room_id, leaderboard: [{user_id, username, best_score}] }
