// frontend/components/api.ts

export const JITSI_BASE =
  process.env.NEXT_PUBLIC_JITSI_BASE || "https://meet.jit.si";

/**
 * API base rules:
 * - If NEXT_PUBLIC_API_BASE is set:
 *   - absolute (http/https) => use it
 *   - relative (/api)       => use it
 * - Otherwise:
 *   - in browser => use same-origin "/api"
 *   - in SSR     => "/api"
 */
export function getApiBase(): string {
  const env = process.env.NEXT_PUBLIC_API_BASE;

  if (env) return env;

  if (typeof window !== "undefined") {
    return "/api";
  }

  return "/api";
}

/**
 * WS base rules:
 * - If NEXT_PUBLIC_WS_BASE is set, use it (ws/wss)
 * - Else if NEXT_PUBLIC_API_BASE is absolute, convert http->ws, https->wss
 * - Else use same-origin ws(s)://host
 */
export function getWsBase(): string {
  const wsEnv = process.env.NEXT_PUBLIC_WS_BASE;
  if (wsEnv) return wsEnv;

  const apiEnv = process.env.NEXT_PUBLIC_API_BASE;
  if (apiEnv && apiEnv.startsWith("https://")) return apiEnv.replace("https://", "wss://");
  if (apiEnv && apiEnv.startsWith("http://")) return apiEnv.replace("http://", "ws://");

  if (typeof window !== "undefined") {
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${window.location.host}`;
  }

  return "";
}

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
  const url = `${base}${path}`;

  const res = await fetch(url, { ...opts, headers });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}
