"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch, getToken, getWsBase } from "@/components/api";
import { TicTacToe } from "./TicTacToe";
import { Connect4 } from "./Connect4";
import { QuizRush } from "./QuizRush";
import { NeonSnake } from "./NeonSnake";
import { RockPaperScissors } from "./RockPaperScissors";
import { WordGuess } from "./WordGuess";

type Game = { key: string; name: string; description: string; min_players: number; max_players: number; enabled: boolean };

export function GamesPanel({ roomId, initialGameKey }: { roomId: number; initialGameKey?: string }) {
  const [catalog, setCatalog] = useState<Game[]>([]);
  const [online, setOnline] = useState<number>(1);
  const [selected, setSelected] = useState<string>(initialGameKey || "ttt");

  const [ws, setWs] = useState<WebSocket | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [gameState, setGameState] = useState<any>(null);
  const [youInfo, setYouInfo] = useState<any>(null);
  const [lbSnake, setLbSnake] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);

  const available = useMemo(() => {
    // Show all enabled games. If the room doesn't have enough / has too many players,
    // we label the game as waiting/full rather than hiding it.
    return catalog.filter((g) => g.enabled);
  }, [catalog]);

  const playerStatus = (g: Game) => {
    const on = Math.max(1, online);
    if (on < g.min_players) return "waiting";
    if (on > g.max_players) return "full";
    return `${g.min_players}–${g.max_players} players`;
  };

  useEffect(() => {
    apiFetch("/games/catalog").then(setCatalog).catch(() => setCatalog([]));
    apiFetch("/auth/me").then(setMe).catch(() => setMe(null));
  }, []);

  useEffect(() => {
    // Ensure selected exists in available list
    if (!available.find((g) => g.key === selected)) {
      setSelected(available[0]?.key || "ttt");
      setGameState(null);
    }
  }, [available, selected]);

  useEffect(() => {
    // connect WS for this room
    const token = getToken();
    if (!token) return;

    const wsUrl = getWsBase() + `/ws/rooms/${roomId}?token=${encodeURIComponent(token)}`;
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;
    setWs(socket);

    socket.onopen = () => {
      // join current game if visible
      socket.send(JSON.stringify({ type: "game.join", payload: { room_id: roomId, game_key: selected } }));
    };

    socket.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        const t = msg.type;
        const p = msg.payload || {};

        if (t === "room.online") {
          setOnline(Number(p.online || 1));
        }

        if (t === "game.state") {
          if (p.game_key === selected) {
            setGameState(p.state);
            setYouInfo(p.you || null);
          }
        }

        if (t === "game.event") {
          if (p.game_key === selected) {
            setGameState(p.state);
          }
        }

        if (t === "snake.leaderboard") {
          setLbSnake(p.leaderboard || []);
        }
      } catch {}
    };

    socket.onclose = () => {
      if (wsRef.current === socket) wsRef.current = null;
      setWs(null);
    };

    return () => {
      try {
        socket.close();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  useEffect(() => {
    setYouInfo(null);
    // when selected changes, request state for that game
    const socket = wsRef.current;
    if (!socket || socket.readyState !== 1) return;
    socket.send(JSON.stringify({ type: "game.join", payload: { room_id: roomId, game_key: selected } }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  function send(type: string, payload: any) {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== 1) return;
    socket.send(JSON.stringify({ type, payload }));
  }

  const selectedMeta = catalog.find((g) => g.key === selected);

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-bold text-lg">Arcade</div>
          <div className="text-xs text-zinc-500">Online in room: <span className="text-emerald-200 font-semibold">{online}</span></div>
        </div>

        <div className="flex items-center gap-2">
          {["ttt","c4","quiz","rps","word"].includes(selected) && (
            <button className="neon-btn px-3 py-2 text-xs" onClick={() => send("game.reset", { room_id: roomId, game_key: selected })}>
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {available.map((g) => (
          <button
            key={g.key}
            onClick={() => setSelected(g.key)}
            className={`px-3 py-2 rounded-xl border text-sm transition ${
              selected === g.key
                ? "border-indigo-300/80 bg-indigo-500/15"
                : "border-zinc-800/70 bg-zinc-900/20 hover:border-indigo-400/50"
            }`}
            title={g.description}
          >
            <div className="font-semibold">{g.name}</div>
            <div className="text-xs text-zinc-500">{playerStatus(g)}</div>
          </button>
        ))}
        {available.length === 0 && (
          <div className="text-sm text-zinc-500">No games are enabled.</div>
        )}
      </div>

      {selectedMeta?.description && (
        <div className="text-xs text-zinc-500">{selectedMeta.description}</div>
      )}

      <section className="flex-1 rounded-2xl border border-zinc-800/70 bg-zinc-950/20 p-4 overflow-auto">
        {selected === "ttt" && (
          <TicTacToe
            state={gameState}
            you={{ ...(me || {}), symbol: youInfo?.symbol }}
            onMove={(idx) => send("game.event", { room_id: roomId, game_key: "ttt", event: { idx } })}
          />
        )}

        {selected === "c4" && (
          <Connect4
            state={gameState}
            you={{ ...(me || {}), token: youInfo?.token }}
            onDrop={(col) => send("game.event", { room_id: roomId, game_key: "c4", event: { col } })}
          />
        )}

        {selected === "quiz" && (
          <QuizRush
            state={gameState}
            onAction={(action, extra) => send("game.event", { room_id: roomId, game_key: "quiz", event: { action, ...(extra || {}) } })}
          />
        )}

        {selected === "snake" && (
          <NeonSnake onScore={(score) => send("snake.score", { room_id: roomId, score })} leaderboard={lbSnake} />
        )}

        {selected === "rps" && (
          <RockPaperScissors
            state={gameState}
            you={{ user_id: me?.id }}
            onPick={(choice) => send("game.event", { room_id: roomId, game_key: "rps", event: { choice } })}
          />
        )}

        {selected === "word" && (
          <WordGuess
            state={gameState}
            onGuess={(letter) => send("game.event", { room_id: roomId, game_key: "word", event: { letter } })}
            onNew={() => send("game.event", { room_id: roomId, game_key: "word", event: { action: "new" } })}
          />
        )}
      </section>
    </div>
  );
}
