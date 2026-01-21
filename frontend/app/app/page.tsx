"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch, getToken, clearToken, JITSI_BASE } from "@/components/api";
import { ChatPanel } from "@/components/chat/ChatPanel";
import Link from "next/link";

type Server = { id: number; name: string; owner_id: number };
type Room = { id: number; server_id: number; name: string; is_private?: boolean };

export default function AppPage() {
  // Avoid hydration mismatch: token is only available on the client.
  const [token, setTokenState] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [me, setMe] = useState<any>(null);
  const [servers, setServers] = useState<Server[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [serverId, setServerId] = useState<number | null>(null);
  const [roomId, setRoomId] = useState<number | null>(null);
  const [tab, setTab] = useState<"chat" | "call">("chat");
  const [online, setOnline] = useState<number>(0);

  const callUrl = useMemo(() => {
    if (!serverId || !roomId) return null;
    const roomName = `CloudChatArcade-${serverId}-${roomId}`;
    return `${JITSI_BASE}/${encodeURIComponent(roomName)}`;
  }, [serverId, roomId]);

  async function load(currentToken: string) {
    const m = await apiFetch("/auth/me");
    setMe(m);
    const s = await apiFetch("/servers");
    setServers(s);
    const first = s?.[0]?.id ?? null;
    setServerId(first);
  }

  useEffect(() => {
    setMounted(true);
    setTokenState(getToken());
    apiFetch("/setup/status")
      .then((d) => setNeedsSetup(!!d.needs_setup))
      .catch(() => setNeedsSetup(null));
  }, []);

  useEffect(() => {
    if (!token) return;
    load(token).catch(console.error);
  }, [token]);

  useEffect(() => {
    if (!serverId) return;
    // When switching servers, reset room selection.
    setRooms([]);
    setRoomId(null);
    apiFetch(`/servers/${serverId}/rooms`).then(setRooms).catch(console.error);
  }, [serverId]);

  useEffect(() => {
    if (!rooms || rooms.length === 0) {
      setRoomId(null);
      return;
    }
    if (!roomId || !rooms.find((r) => r.id === roomId)) {
      setRoomId(rooms[0].id);
    }
  }, [rooms, roomId]);

  async function createServer() {
    const name = prompt("Server name?");
    if (!name) return;
    const s = await apiFetch("/servers", { method: "POST", body: JSON.stringify({ name }) });
    const all = await apiFetch("/servers");
    setServers(all);
    setServerId(s.id);
  }

  async function createRoom() {
    if (!serverId) return;
    const name = prompt("Room name? (example: general, devops, games)");
    if (!name) return;
    const isPrivate = confirm("Make this a PRIVATE room?\n\nOK = Private (invite-only)\nCancel = Public");
    let invited_usernames: string[] = [];
    if (isPrivate) {
      const raw = prompt("Invite usernames (comma-separated). Example: ahmed, laurence, ridoy\n\nLeave empty to create a private room with only you.") || "";
      invited_usernames = raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    const r = await apiFetch(`/servers/${serverId}/rooms`, {
      method: "POST",
      body: JSON.stringify({ name, is_private: isPrivate, invited_usernames }),
    });
    const rs = await apiFetch(`/servers/${serverId}/rooms`);
    setRooms(rs);
    setRoomId(r.id);
  }

  function logout() {
    clearToken();
    window.location.href = "/";
  }

  function openArcadeWindow() {
    if (!roomId) {
      alert("Select a room first.");
      return;
    }
    const url = `/arcade?roomId=${roomId}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  if (!mounted) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="neon-card p-8 max-w-lg">
          <h1 className="text-2xl font-bold">Loading…</h1>
          <p className="mt-2 text-zinc-300">Initializing session.</p>
        </div>
      </main>
    );
  }

  if (!token) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-3xl rounded-3xl border border-zinc-800/70 bg-zinc-950/35 backdrop-blur p-10 cc-glow cc-shine">
          <div className="text-4xl font-black tracking-tight">CloudChat Arcade</div>
          <div className="mt-2 text-sm text-zinc-400">
            Real-time rooms • invites • calls • arcade games • private channels
          </div>

          {needsSetup ? (
            <div className="mt-7 p-5 rounded-2xl border border-indigo-400/30 bg-indigo-500/10">
              <div className="font-semibold text-indigo-200">First-time setup required</div>
              <div className="text-sm text-zinc-300 mt-1">
                No users found. Create the first admin account.
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link className="neon-btn px-4 py-2" href="/setup">Open Setup</Link>
                <Link className="px-4 py-2 rounded-xl border border-zinc-800/70 hover:border-indigo-400/50" href="/">Home</Link>
              </div>
            </div>
          ) : (
            <div className="mt-7 flex flex-wrap gap-3">
              <Link className="neon-btn px-4 py-2" href="/login">Login</Link>
              <Link className="px-4 py-2 rounded-xl border border-zinc-800/70 hover:border-indigo-400/50" href="/register">Register</Link>
              <Link className="px-4 py-2 rounded-xl border border-zinc-800/70 hover:border-indigo-400/50" href="/">Home</Link>
            </div>
          )}

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-4 rounded-2xl border border-zinc-800/70 bg-zinc-950/20">
              <div className="font-semibold">Online users</div>
              <div className="text-zinc-400 mt-1">See who is online per room and invite them to play.</div>
            </div>
            <div className="p-4 rounded-2xl border border-zinc-800/70 bg-zinc-950/20">
              <div className="font-semibold">Private rooms</div>
              <div className="text-zinc-400 mt-1">Invite-only channels for friends or class groups.</div>
            </div>
            <div className="p-4 rounded-2xl border border-zinc-800/70 bg-zinc-950/20">
              <div className="font-semibold">Arcade</div>
              <div className="text-zinc-400 mt-1">Play in a separate window with chat side-by-side.</div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto grid grid-cols-12 gap-4">
        {/* Servers */}
        <aside className="col-span-2 neon-card p-3">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Servers</div>
            <button className="text-xs px-2 py-1 rounded border border-zinc-700/60 hover:border-zinc-500/70" onClick={createServer}>+</button>
          </div>
          <div className="mt-3 space-y-1">
            {servers.map(s => (
              <button
                key={s.id}
                onClick={() => { setServerId(s.id); setTab("chat"); }}
                className={`w-full text-left px-2 py-2 rounded-lg border transition ${serverId===s.id ? "border-indigo-400/60 bg-indigo-500/10" : "border-zinc-800/80 hover:border-zinc-600/60"}`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </aside>

        {/* Rooms */}
        <aside className="col-span-2 neon-card p-3">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Rooms</div>
            <button className="text-xs px-2 py-1 rounded border border-zinc-700/60 hover:border-zinc-500/70" onClick={createRoom}>+</button>
          </div>
          <div className="mt-3 space-y-1">
            {rooms.map(r => (
              <button
                key={r.id}
                onClick={() => { setRoomId(r.id); setTab("chat"); }}
                className={`w-full text-left px-2 py-2 rounded-lg border transition ${roomId===r.id ? "border-pink-400/50 bg-pink-500/10" : "border-zinc-800/80 hover:border-zinc-600/60"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="truncate">#{r.name}</div>
                  {r.is_private ? <div className="text-xs text-zinc-400">🔒</div> : null}
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Main */}
        <main className="col-span-8 neon-card p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="text-sm text-zinc-400">Logged in as</div>
              <div className="font-semibold">{me?.username ?? "..."}</div>
              <div className="ml-3 text-xs px-2 py-1 rounded border border-zinc-700/60">
                Online in room: <span className="text-green-200 font-semibold">{online}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className={tab==="chat" ? "neon-btn" : "px-3 py-2 rounded-lg border border-zinc-700/60 hover:border-zinc-500/70"} onClick={()=>setTab("chat")}>Chat</button>
              <button className="neon-btn-alt" onClick={openArcadeWindow}>Arcade</button>
              <button className={tab==="call" ? "neon-btn" : "px-3 py-2 rounded-lg border border-zinc-700/60 hover:border-zinc-500/70"} onClick={()=>setTab("call")}>Join Call</button>
              <Link className="px-3 py-2 rounded-lg border border-zinc-700/60 hover:border-zinc-500/70" href="/profile">Profile</Link>
              {me?.role === "admin" && (
                <Link className="px-3 py-2 rounded-lg border border-indigo-400/40 bg-indigo-500/10 hover:border-indigo-300/70" href="/admin">
                  Admin
                </Link>
              )}
              <button className="px-3 py-2 rounded-lg border border-zinc-700/60 hover:border-zinc-500/70" onClick={logout}>Logout</button>
            </div>
          </div>

          <div className="mt-3">
            {!roomId ? (
              <div className="text-zinc-400 p-6">Create/select a room.</div>
            ) : tab === "chat" ? (
              <ChatPanel roomId={roomId} me={me} onOnlineChange={setOnline} />
            ) : (
              <div className="h-[74vh] rounded-xl border border-zinc-800/80 overflow-hidden">
                {callUrl ? (
                  <iframe className="w-full h-full" src={callUrl} allow="camera; microphone; fullscreen; display-capture" />
                ) : (
                  <div className="p-6 text-zinc-400">Select a room to start a call.</div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
