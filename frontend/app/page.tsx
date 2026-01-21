"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch, getToken } from "@/components/api";

export default function Home() {
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    apiFetch("/setup/status").then((d)=>setNeedsSetup(!!d.needs_setup)).catch(()=>setNeedsSetup(null));
    setHasToken(!!getToken());
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-4xl w-full rounded-3xl border border-zinc-800/70 bg-zinc-950/35 backdrop-blur p-10 cc-glow cc-shine">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div className="text-4xl md:text-5xl font-black tracking-tight">CloudChat Arcade</div>
            <div className="mt-3 text-sm md:text-base text-zinc-300/80 max-w-2xl">
              Discord-style servers + rooms with real-time chat, invites, private channels, and an arcade you can open in a separate window.
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            {hasToken && <Link className="neon-btn px-4 py-2" href="/app">Open App</Link>}
            <Link className="px-4 py-2 rounded-xl border border-zinc-800/70 hover:border-indigo-400/50" href="/login">Login</Link>
            <Link className="px-4 py-2 rounded-xl border border-zinc-800/70 hover:border-indigo-400/50" href="/register">Register</Link>
          </div>
        </div>

        {needsSetup ? (
          <div className="mt-6 p-4 rounded-2xl border border-indigo-400/30 bg-indigo-500/10">
            <div className="font-semibold text-indigo-200">Setup required</div>
            <div className="text-sm text-zinc-300 mt-1">No users found. Create the first admin.</div>
            <Link className="inline-block mt-3 neon-btn px-4 py-2" href="/setup">Open Setup</Link>
          </div>
        ) : null}

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-4 rounded-2xl border border-zinc-800/70 bg-zinc-950/20">
            <div className="font-semibold">Rooms</div>
            <div className="text-zinc-400 mt-1">Servers, channels, real-time chat + typing indicators.</div>
          </div>
          <div className="p-4 rounded-2xl border border-zinc-800/70 bg-zinc-950/20">
            <div className="font-semibold">Arcade</div>
            <div className="text-zinc-400 mt-1">Play games alongside the chat, in a separate window.</div>
          </div>
          <div className="p-4 rounded-2xl border border-zinc-800/70 bg-zinc-950/20">
            <div className="font-semibold">Private rooms</div>
            <div className="text-zinc-400 mt-1">Invite specific users (by username) into locked channels.</div>
          </div>
        </div>
      </div>
    </main>
  );
}
