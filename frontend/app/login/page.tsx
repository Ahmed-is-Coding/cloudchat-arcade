"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, setToken } from "@/components/api";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/setup/status")
      .then((d) => {
        const ns = !!d.needs_setup;
        setNeedsSetup(ns);
        if (ns) router.push("/setup");
      })
      .catch(() => setNeedsSetup(null));
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(data.access_token);
      window.location.href = "/app";
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="neon-card max-w-md w-full p-8">
        <h1 className="text-2xl font-bold">Login</h1>
        <form className="mt-5 space-y-3" onSubmit={submit}>
          <input className="neon-input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
          <input className="neon-input" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
          {err && <div className="text-red-300 text-sm">{err}</div>}
          <button className="neon-btn w-full" type="submit">Login</button>
        </form>
        <div className="mt-4 text-sm text-zinc-400">
          No account? <Link className="text-indigo-300 hover:underline" href="/register">Register</Link>
        </div>
      </div>
    </main>
  );
}
