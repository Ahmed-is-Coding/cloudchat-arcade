"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GamesPanel } from "@/components/games/GamesPanel";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { apiFetch, getToken } from "@/components/api";

export default function ArcadePage() {
  // IMPORTANT (Next.js hydration): avoid reading search params / localStorage in render.
  // Server render does not have access to window/search params; doing so causes hydration mismatches.
  const [mounted, setMounted] = useState(false);
  const [roomId, setRoomId] = useState<number | null>(null);
  const [initialGameKey, setInitialGameKey] = useState<string | undefined>(undefined);
  const [token, setToken] = useState<string | null>(null);

  const [me, setMe] = useState<any>(null);
  const [online, setOnline] = useState<number>(0);

  useEffect(() => {
    setMounted(true);
    try {
      const sp = new URLSearchParams(window.location.search);
      const raw = sp.get("roomId");
      const n = raw ? Number(raw) : NaN;
      setRoomId(Number.isFinite(n) && n > 0 ? n : null);

      const g = (sp.get("game") || "").trim();
      setInitialGameKey(g || undefined);
    } catch {
      setRoomId(null);
      setInitialGameKey(undefined);
    }
    setToken(getToken());
  }, []);

  useEffect(() => {
    if (!token) {
      setMe(null);
      return;
    }
    apiFetch("/auth/me").then(setMe).catch(() => setMe(null));
  }, [token]);

  if (!mounted) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="neon-card max-w-xl w-full p-8">
          <h1 className="text-2xl font-bold">Arcade</h1>
          <p className="mt-2 text-zinc-300">Loading…</p>
        </div>
      </main>
    );
  }

  if (!roomId) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="neon-card max-w-xl w-full p-8">
          <h1 className="text-2xl font-bold">Arcade</h1>
          <p className="mt-2 text-zinc-300">No room selected. Open the arcade from the main app window.</p>
          <div className="mt-4">
            <Link className="neon-btn" href="/app">Back to App</Link>
          </div>
        </div>
      </main>
    );
  }

  if (!token) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="neon-card max-w-xl w-full p-8">
          <h1 className="text-2xl font-bold">Arcade</h1>
          <p className="mt-2 text-zinc-300">You are not logged in.</p>
          <div className="mt-4 flex gap-3">
            <Link className="neon-btn" href="/login">Login</Link>
            <Link className="px-4 py-2 rounded-xl border border-zinc-800/70 hover:border-indigo-400/50" href="/register">Register</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold">Arcade</h1>
            <div className="text-sm text-zinc-400">Room #{roomId} • Online: <span className="text-emerald-200 font-semibold">{online}</span></div>
          </div>
          <div className="flex items-center gap-2">
            <Link className="px-3 py-2 rounded-lg border border-zinc-700/60 hover:border-zinc-500/70" href="/app">Back to App</Link>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8">
            <div className="neon-card p-4">
              <GamesPanel roomId={roomId} initialGameKey={initialGameKey} />
            </div>
          </div>
          <div className="lg:col-span-4">
            <div className="neon-card p-4">
              <ChatPanel roomId={roomId} me={me} onOnlineChange={setOnline} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
