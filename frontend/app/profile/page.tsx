"use client";

import { useEffect, useState } from "react";
import { apiFetch, getApiBase, getToken } from "@/components/api";
import Link from "next/link";

export default function ProfilePage() {
  const [me, setMe] = useState<any>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarColor, setAvatarColor] = useState("#00f5ff");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/auth/me")
      .then((u) => {
        setMe(u);
        setDisplayName(u.display_name || "");
        setBio(u.bio || "");
        setAvatarColor(u.avatar_color || "#00f5ff");
      })
      .catch(() => setMe(null));
  }, []);

  async function save() {
    setMsg(null);
    try {
      const u = await apiFetch("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ display_name: displayName, bio, avatar_color: avatarColor }),
      });
      setMe(u);
      setMsg("Saved.");
    } catch (e:any) {
      setMsg(e?.message || "Save failed");
    }
  }

  async function uploadAvatar() {
    if (!avatarFile) return;
    setMsg(null);
    setAvatarBusy(true);
    try {
      const token = getToken();
      if (!token) throw new Error("Not logged in");
      const fd = new FormData();
      fd.append("file", avatarFile);
      const res = await fetch(`${getApiBase()}/auth/me/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }
      const u = await res.json();
      setMe(u);
      setAvatarFile(null);
      setMsg("Avatar updated.");
    } catch (e: any) {
      setMsg(e?.message || "Avatar upload failed");
    } finally {
      setAvatarBusy(false);
    }
  }

  async function deleteAvatar() {
    setMsg(null);
    setAvatarBusy(true);
    try {
      const u = await apiFetch("/auth/me/avatar", { method: "DELETE" });
      setMe(u);
      setMsg("Avatar removed.");
    } catch (e: any) {
      setMsg(e?.message || "Avatar delete failed");
    } finally {
      setAvatarBusy(false);
    }
  }

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Your Profile</h1>
          <Link className="px-4 py-2 rounded-xl border border-zinc-800/70 hover:border-indigo-400/50" href="/app">Back</Link>
        </div>

        <div className="mt-6 p-6 rounded-2xl border border-zinc-800/70 bg-zinc-950/30">
          <div className="flex items-center gap-4">
            {me?.avatar_url ? (
              <img
                src={me.avatar_url.startsWith("http") ? me.avatar_url : `${getApiBase()}${me.avatar_url}`}
                className="w-14 h-14 rounded-2xl border border-zinc-800/70 object-cover"
                alt=""
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl border border-zinc-800/70" style={{ background: avatarColor }} />
            )}
            <div>
              <div className="text-sm text-zinc-400">Signed in as</div>
              <div className="font-semibold">{me?.username || "-"}</div>
              <div className="text-xs text-zinc-500">Role: {me?.role || "user"}</div>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-2xl border border-zinc-800/70 bg-zinc-950/20">
            <div className="font-semibold">Profile picture</div>
            <div className="mt-2 text-xs text-zinc-500">PNG/JPEG/WebP • max 3MB</div>
            <div className="mt-3 flex flex-col md:flex-row md:items-center gap-3">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="block text-sm text-zinc-300 file:mr-3 file:rounded-lg file:border file:border-zinc-700/60 file:bg-zinc-900/30 file:px-3 file:py-2 file:text-zinc-200 hover:file:border-indigo-400/50"
                onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
              />
              <div className="flex gap-2">
                <button
                  className="neon-btn px-4 py-2 disabled:opacity-50"
                  disabled={!avatarFile || avatarBusy}
                  onClick={uploadAvatar}
                >
                  Upload
                </button>
                <button
                  className="px-4 py-2 rounded-xl border border-zinc-800/70 hover:border-indigo-400/50 disabled:opacity-50"
                  disabled={avatarBusy || !me?.avatar_url}
                  onClick={deleteAvatar}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div>
              <div className="text-xs text-zinc-500 mb-1">Display name</div>
              <input className="neon-input" value={displayName} onChange={(e)=>setDisplayName(e.target.value)} />
            </div>

            <div>
              <div className="text-xs text-zinc-500 mb-1">Bio</div>
              <textarea className="neon-input min-h-[100px]" value={bio} onChange={(e)=>setBio(e.target.value)} />
            </div>

            <div className="flex items-center gap-3">
              <div className="text-xs text-zinc-500">Avatar color</div>
              <input type="color" value={avatarColor} onChange={(e)=>setAvatarColor(e.target.value)} className="w-12 h-10 rounded-xl border border-zinc-800/70 bg-transparent" />
              <input className="neon-input flex-1" value={avatarColor} onChange={(e)=>setAvatarColor(e.target.value)} />
            </div>

            {msg && <div className="text-sm text-zinc-300">{msg}</div>}

            <button className="neon-btn px-4 py-3" onClick={save}>Save changes</button>
          </div>
        </div>
      </div>
    </main>
  );
}
