"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/components/api";
import Link from "next/link";

type Tab = "users" | "servers" | "games";

export default function AdminPage() {
  const [me, setMe] = useState<any>(null);
  const [tab, setTab] = useState<Tab>("users");

  const [users, setUsers] = useState<any[]>([]);
  const [servers, setServers] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    setErr(null);
    try {
      const [u, s, g] = await Promise.all([
        apiFetch("/admin/users"),
        apiFetch("/admin/servers"),
        apiFetch("/admin/games"),
      ]);
      setUsers(u);
      setServers(s);
      setGames(g);
    } catch (e:any) {
      setErr(e?.message || "Failed to load admin data");
    }
  }

  useEffect(() => {
    apiFetch("/auth/me").then(setMe).catch(() => setMe(null));
  }, []);

  useEffect(() => {
    if (me?.role === "admin") refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.role]);

  async function banToggle(u: any) {
    await apiFetch(`/admin/users/${u.id}`, { method: "PATCH", body: JSON.stringify({ is_banned: !u.is_banned }) });
    refresh();
  }

  async function setRole(u: any, role: string) {
    await apiFetch(`/admin/users/${u.id}`, { method: "PATCH", body: JSON.stringify({ role }) });
    refresh();
  }

  async function deleteServer(id: number) {
    await apiFetch(`/admin/servers/${id}`, { method: "DELETE" });
    refresh();
  }

  async function toggleGame(g: any) {
    await apiFetch(`/admin/games/${g.id}`, { method: "PATCH", body: JSON.stringify({ enabled: !g.enabled }) });
    refresh();
  }

  if (me && me.role !== "admin") {
    return (
      <main className="min-h-screen p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Admin Console</h1>
            <Link className="px-4 py-2 rounded-xl border border-zinc-800/70 hover:border-indigo-400/50" href="/app">Back</Link>
          </div>
          <div className="mt-6 p-6 rounded-2xl border border-zinc-800/70 bg-zinc-950/30">
            <div className="text-zinc-300">Access denied.</div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admin Console</h1>
            <div className="text-xs text-zinc-500">Ban control · management · game catalog</div>
          </div>
          <div className="flex items-center gap-2">
            <button className="neon-btn px-3 py-2 text-xs" onClick={refresh}>Refresh</button>
            <Link className="px-4 py-2 rounded-xl border border-zinc-800/70 hover:border-indigo-400/50" href="/app">Back</Link>
          </div>
        </div>

        {err && <div className="mt-4 text-sm text-red-300">{err}</div>}

        <div className="mt-6 flex gap-2">
          {(["users","servers","games"] as Tab[]).map((t)=>(
            <button
              key={t}
              onClick={()=>setTab(t)}
              className={`px-4 py-2 rounded-xl border text-sm ${tab===t ? "border-indigo-300/80 bg-indigo-500/15" : "border-zinc-800/70 bg-zinc-950/20 hover:border-indigo-400/50"}`}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="mt-4 p-5 rounded-2xl border border-zinc-800/70 bg-zinc-950/25">
          {tab === "users" && (
            <div className="space-y-3">
              <div className="text-sm text-zinc-400">Users: {users.length}</div>
              <div className="grid gap-2">
                {users.map((u)=>(
                  <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl border border-zinc-800/70 bg-zinc-950/20">
                    <div>
                      <div className="font-semibold">{u.username} <span className="text-xs text-zinc-500">#{u.id}</span></div>
                      <div className="text-xs text-zinc-500">{u.email}</div>
                      <div className="text-xs text-zinc-500">Role: <span className="text-indigo-200">{u.role}</span> · {u.is_banned ? <span className="text-red-300">BANNED</span> : <span className="text-emerald-200">OK</span>}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        className="px-3 py-2 rounded-xl border border-zinc-800/70 bg-transparent text-sm"
                        value={u.role}
                        onChange={(e)=>setRole(u, e.target.value)}
                      >
                        <option value="user">user</option>
                        <option value="mod">mod</option>
                        <option value="admin">admin</option>
                      </select>
                      <button className="neon-btn px-3 py-2 text-xs" onClick={()=>banToggle(u)}>
                        {u.is_banned ? "Unban" : "Ban"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "servers" && (
            <div className="space-y-3">
              <div className="text-sm text-zinc-400">Servers: {servers.length}</div>
              <div className="grid gap-2">
                {servers.map((s)=>(
                  <div key={s.id} className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-zinc-800/70 bg-zinc-950/20">
                    <div>
                      <div className="font-semibold">{s.name} <span className="text-xs text-zinc-500">#{s.id}</span></div>
                      <div className="text-xs text-zinc-500">Owner: user #{s.owner_id}</div>
                    </div>
                    <button className="px-3 py-2 rounded-xl border border-red-400/30 bg-red-500/10 hover:border-red-300/60 text-xs" onClick={()=>deleteServer(s.id)}>
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "games" && (
            <div className="space-y-3">
              <div className="text-sm text-zinc-400">Games: {games.length}</div>
              <div className="grid gap-2">
                {games.map((g)=>(
                  <div key={g.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl border border-zinc-800/70 bg-zinc-950/20">
                    <div>
                      <div className="font-semibold">{g.name} <span className="text-xs text-zinc-500">({g.key})</span></div>
                      <div className="text-xs text-zinc-500">{g.description}</div>
                      <div className="text-xs text-zinc-500">{g.min_players}–{g.max_players} players · {g.enabled ? <span className="text-emerald-200">enabled</span> : <span className="text-red-300">disabled</span>}</div>
                    </div>
                    <button className="neon-btn px-3 py-2 text-xs" onClick={()=>toggleGame(g)}>
                      {g.enabled ? "Disable" : "Enable"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 text-xs text-zinc-500">
          Banned users cannot login or connect to websockets. If you changed database schema, run a clean start (docker compose down -v).
        </div>
      </div>
    </main>
  );
}
