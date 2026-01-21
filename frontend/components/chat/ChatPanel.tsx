"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch, getToken, getWsBase, getApiBase } from "@/components/api";

type ChatMsg = {
  id: number;
  room_id?: number;
  sender_id: number;
  username?: string;
  display_name?: string;
  avatar_color?: string;
  avatar_url?: string;
  content: string;
  created_at: string;
};
type TypingState = { user_id: number; username: string; is_typing: boolean };

type OnlineUser = {
  id: number;
  username: string;
  display_name?: string;
  avatar_color?: string;
  avatar_url?: string;
};

const EMOJIS = ["😀","😁","😂","🤣","🙂","😉","😍","😘","😎","🤝","👍","🔥","🎮","⚡","💯","✅","❌","😭","🙏","🚀"];

export function ChatPanel({ roomId, me, onOnlineChange }: { roomId: number; me: any; onOnlineChange: (n:number)=>void }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState<TypingState | null>(null);
  const [status, setStatus] = useState<string>("connecting...");
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [inviteGame, setInviteGame] = useState<string>("ttt");
  const [invite, setInvite] = useState<any | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const typingTimer = useRef<any>(null);

  async function loadHistory() {
    const msgs = await apiFetch(`/rooms/${roomId}/messages?limit=80`);
    setMessages(msgs);
  }

  useEffect(() => {
    loadHistory().catch(console.error);
  }, [roomId]);

  useEffect(() => {
    // Best-effort: fetch list (WS will also broadcast live updates)
    apiFetch(`/rooms/${roomId}/online-users`)
      .then((d) => {
        setOnlineUsers(d.users || []);
        onOnlineChange(d.online || 0);
      })
      .catch(() => {});
  }, [roomId]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    setStatus("connecting...");
    const ws = new WebSocket(`${getWsBase()}/ws/rooms/${roomId}?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;

    ws.onopen = () => setStatus("live");
    ws.onclose = () => setStatus("disconnected");

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        const t = msg.type;
        const p = msg.payload || {};
        if (t === "chat.message") {
          setMessages((prev) => [...prev, p]);
        } else if (t === "typing") {
          if (p.user_id === me?.id) return;
          setTyping(p);
          setTimeout(()=>setTyping(null), 1200);
        } else if (t === "room.online") {
          onOnlineChange(p.online ?? 0);
        } else if (t === "room.online-users") {
          setOnlineUsers(p.users || []);
          onOnlineChange(p.online ?? (p.users?.length || 0));
        } else if (t === "invite.play") {
          if ((p.to_user_id ?? 0) === me?.id) {
            setInvite(p);
          }
        }
      } catch {}
    };

    return () => {
      try { ws.close(); } catch {}
      wsRef.current = null;
    };
  }, [roomId]);

  function sendTyping(is_typing: boolean) {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "typing", payload: { room_id: roomId, is_typing } }));
  }

  function onChange(v: string) {
    setInput(v);
    sendTyping(true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => sendTyping(false), 800);
  }

  function send() {
    const content = input.trim();
    if (!content) return;
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "chat.send", payload: { room_id: roomId, content } }));
    setInput("");
    sendTyping(false);
  }

  function sendInvite(to: OnlineUser) {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ type: "invite.play", payload: { room_id: roomId, to_user_id: to.id, game_key: inviteGame } }));
  }

  function acceptInvite() {
    if (!invite) return;
    const game = invite.game_key || "ttt";
    const url = `/arcade?roomId=${roomId}&game=${encodeURIComponent(game)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setInvite(null);
  }

  function addEmoji(e: string) {
    setInput((prev) => prev + e);
    setEmojiOpen(false);
  }

  const renderAvatar = (u: any) => {
    const url = u?.avatar_url || "";
    if (url) {
      const src = url.startsWith("http") ? url : `${getApiBase()}${url}`;
      return <img src={src} className="w-9 h-9 rounded-full object-cover border border-zinc-800/70" alt="" />;
    }
    const bg = u?.avatar_color || "#00f5ff";
    const label = (u?.display_name || u?.username || "U").slice(0, 1).toUpperCase();
    return (
      <div className="w-9 h-9 rounded-full border border-zinc-800/70 flex items-center justify-center font-bold" style={{ background: bg }}>
        {label}
      </div>
    );
  };

  return (
    <div className="h-[74vh] grid grid-rows-[1fr_auto] gap-2">
      {/* Invite toast */}
      {invite && (
        <div className="rounded-xl border border-pink-400/30 bg-pink-500/10 p-3 flex items-center justify-between gap-3">
          <div className="text-sm">
            <span className="font-semibold">{invite.from_display_name || invite.from_username}</span> invited you to play
            {invite.game_key ? <span className="ml-1 text-pink-200 font-semibold">{invite.game_key}</span> : null}.
          </div>
          <div className="flex items-center gap-2">
            <button className="neon-btn-alt" onClick={acceptInvite}>Accept</button>
            <button className="px-3 py-2 rounded-lg border border-zinc-700/60 hover:border-zinc-500/70" onClick={()=>setInvite(null)}>Dismiss</button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-[260px_1fr] grid-cols-1 gap-2 h-full">
        {/* Online users */}
        <div className="rounded-xl border border-zinc-800/80 overflow-hidden bg-zinc-950/20">
          <div className="px-3 py-2 border-b border-zinc-800/70 flex items-center justify-between">
            <div className="font-semibold">Online</div>
            <div className="text-xs text-zinc-400">{onlineUsers.length}</div>
          </div>
          <div className="p-3 space-y-2 overflow-auto max-h-[58vh]">
            <div className="flex items-center gap-2">
              <select className="neon-input !py-2" value={inviteGame} onChange={(e)=>setInviteGame(e.target.value)}>
                <option value="ttt">Tic-Tac-Toe</option>
                <option value="c4">Connect-4</option>
                <option value="rps">RPS</option>
                <option value="quiz">Quiz</option>
                <option value="word">Word</option>
                <option value="snake">Snake</option>
              </select>
            </div>
            {onlineUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-2 p-2 rounded-xl border border-zinc-800/70 bg-zinc-900/20">
                <div className="flex items-center gap-2 min-w-0">
                  {renderAvatar(u)}
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{u.display_name || u.username}</div>
                    <div className="text-xs text-zinc-500 truncate">@{u.username}{u.id === me?.id ? " (you)" : ""}</div>
                  </div>
                </div>
                {u.id !== me?.id && (
                  <button className="px-2 py-1 rounded-lg border border-indigo-400/40 bg-indigo-500/10 hover:border-indigo-300/70 text-xs" onClick={() => sendInvite(u)}>
                    Invite
                  </button>
                )}
              </div>
            ))}
            {onlineUsers.length === 0 && <div className="text-sm text-zinc-500">No one online.</div>}
          </div>
        </div>

        {/* Chat */}
        <div className="rounded-xl border border-zinc-800/80 overflow-hidden">
          <div className="px-3 py-2 border-b border-zinc-800/70 flex items-center justify-between">
            <div className="font-semibold">Room Chat</div>
            <div className="text-xs text-zinc-400">WS: {status}</div>
          </div>
          <div className="h-[58vh] p-3 overflow-auto space-y-2">
            {messages.map((m) => (
              <div key={m.id} className="flex gap-3">
                {renderAvatar(m)}
                <div className="flex-1">
                  <div className="text-sm">
                    <span className="font-semibold">{m.display_name || m.username || ("User#" + m.sender_id)}</span>
                    {m.username && m.display_name && m.display_name !== m.username && (
                      <span className="ml-2 text-xs text-zinc-500">@{m.username}</span>
                    )}
                    <span className="ml-2 text-xs text-zinc-500">{new Date(m.created_at).toLocaleString()}</span>
                  </div>
                  <div className="text-zinc-200 whitespace-pre-wrap break-words">{m.content}</div>
                </div>
              </div>
            ))}
            {typing?.is_typing && (
              <div className="text-sm text-zinc-400">{typing.username} is typing...</div>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2 relative">
        <button
          className="px-3 py-2 rounded-lg border border-zinc-700/60 hover:border-zinc-500/70"
          onClick={() => setEmojiOpen((v) => !v)}
          title="Emoji"
        >
          😀
        </button>
        {emojiOpen && (
          <div className="absolute bottom-12 left-0 z-20 p-3 rounded-xl border border-zinc-800/80 bg-zinc-950/95 backdrop-blur shadow-xl">
            <div className="grid grid-cols-10 gap-1">
              {EMOJIS.map((e) => (
                <button key={e} className="w-8 h-8 rounded-lg hover:bg-zinc-800/60" onClick={() => addEmoji(e)}>
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}
        <input
          className="neon-input"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
        />
        <button className="neon-btn" onClick={send}>Send</button>
      </div>
    </div>
  );
}
