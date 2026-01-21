"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/components/api";
import { useRouter } from "next/navigation";

export default function Register() {
  const router = useRouter();
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [ok, setOk] = useState(false);
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
      await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, username, password }),
      });
      setOk(true);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="neon-card max-w-md w-full p-8">
        <h1 className="text-2xl font-bold">Register</h1>
        {ok ? (
          <div className="mt-6">
            <p className="text-green-200">Account created.</p>
            <Link className="neon-btn inline-block mt-4" href="/login">Go to login</Link>
          </div>
        ) : (
          <form className="mt-5 space-y-3" onSubmit={submit}>
            <input className="neon-input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
            <input className="neon-input" placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} />
            <input className="neon-input" placeholder="Password (min 6 chars)" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
            {err && <div className="text-red-300 text-sm">{err}</div>}
            <button className="neon-btn w-full" type="submit">Create account</button>
          </form>
        )}
        <div className="mt-4 text-sm text-zinc-400">
          Already have an account? <Link className="text-indigo-300 hover:underline" href="/login">Login</Link>
        </div>
      </div>
    </main>
  );
}
