"use client";

import { useEffect, useState } from "react";
import { apiFetch, setToken } from "@/components/api";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SetupPage() {
  const router = useRouter();
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");

  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/setup/status")
      .then((d) => setNeedsSetup(!!d.needs_setup))
      .catch(() => setNeedsSetup(null));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      const token = await apiFetch("/setup/initialize", {
        method: "POST",
        body: JSON.stringify({ email, username, password }),
      });
      setToken(token.access_token);
      router.push("/app");
    } catch (e: any) {
      setErr(e?.message || "Setup failed");
    }
  }

  if (needsSetup === false) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full p-6 rounded-2xl border border-zinc-800/70 bg-zinc-950/30">
          <h1 className="text-2xl font-bold">Setup already completed</h1>
          <p className="mt-2 text-sm text-zinc-400">Go to login.</p>
          <Link className="mt-5 inline-block neon-btn px-4 py-2" href="/login">Login</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full p-6 rounded-2xl border border-zinc-800/70 bg-zinc-950/30">
        <h1 className="text-2xl font-bold">First-time Setup</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Create the initial <span className="text-indigo-300 font-semibold">admin</span> account. After this, normal registration is enabled.
        </p>

        <form className="mt-5 space-y-3" onSubmit={submit}>
          <input className="neon-input" placeholder="Admin email" value={email} onChange={(e)=>setEmail(e.target.value)} />
          <input className="neon-input" placeholder="Admin username" value={username} onChange={(e)=>setUsername(e.target.value)} />
          <input className="neon-input" placeholder="Admin password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
          {err && <div className="text-red-300 text-sm">{err}</div>}
          <button className="neon-btn w-full" type="submit">Create Admin</button>
        </form>

        <div className="mt-4 text-xs text-zinc-500">
          If you already have users, this page will refuse setup.
        </div>
      </div>
    </main>
  );
}
