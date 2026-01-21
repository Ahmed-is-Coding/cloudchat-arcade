// frontend/components/api.ts
// LAN-safe setup: ALWAYS use same-origin paths (/api and /ws) via Nginx reverse proxy.
// This avoids CORS and avoids exposing backend port 8000 to the LAN.

export function getApiBase(): string {
  // Nginx should proxy /api -> backend (http://api:8000)
  return "/api";
}

export function getWsBase(): string {
  // Must return ws(s)://host only (NO /ws here),
  // because callers already append /ws/rooms/...
  if (typeof window === "undefined") return "";
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${window.location.host}`;
}

export const JITSI_BASE =
  process.env.NEXT_PUBLIC_JITSI_BASE || "https://meet.jit.si";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("cc_token");
}

export function setToken(t: string) {
  localStorage.setItem("cc_token", t);
}

export function clearToken() {
  localStorage.removeItem("cc_token");
}

export async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as any),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const base = getApiBase();
  const res = await fetch(`${base}${path}`, { ...opts, headers });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

