import type { OAuthStatus } from "@rivet/github/oauth";
import { createClient } from "@rivet/github";
declare global {
  interface Window {
    desktop?: {
      auth: (action: AuthAction) => Promise<OAuthStatus>;
      request: (
        path: string,
        options: { method?: string; body?: string },
      ) => Promise<{
        status: number;
        body: unknown;
        headers: Record<string, string>;
      }>;
      openExternal: (url: string) => void;
      clone: (
        repo: string,
      ) => Promise<{ canceled?: boolean; path?: string; error?: string }>;
    };
  }
}
type AuthAction = "status" | "begin" | "poll" | "cancel" | "logout";
let authQueue: Promise<unknown> = Promise.resolve();
async function withAuthLock<T>(work: () => Promise<T>): Promise<T> {
  if (navigator.locks) return navigator.locks.request("rivet-oauth", work);
  const next = authQueue.then(work, work);
  authQueue = next.catch(() => {});
  return next;
}
export async function authAction(action: AuthAction): Promise<OAuthStatus> {
  if (window.desktop) return window.desktop.auth(action);
  return withAuthLock(() => browserAuthAction(action));
}
async function browserAuthAction(action: AuthAction): Promise<OAuthStatus> {
  if (window.desktop) return window.desktop.auth(action);
  const response = await fetch("/api/auth/" + action, {
    method: action === "status" ? "GET" : "POST",
    headers: { "X-Rivet": "1" },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message || "GitHub sign-in failed.");
  return body;
}
export const api = createClient(async (path, init) => {
  if (window.desktop) {
    const r = await window.desktop.request(path, {
      method: init?.method,
      body: init?.body as string,
    });
    if (r.status === 401) window.dispatchEvent(new Event("github-signed-out"));
    return new Response(r.status === 204 ? null : JSON.stringify(r.body), {
      status: r.status,
      headers: r.headers,
    });
  }
  const request = () =>
    fetch("/api/github" + path, {
      ...init,
      headers: { "Content-Type": "application/json", "X-Rivet": "1" },
    });
  let response = await request();
  if (
    response.status === 409 &&
    (
      await response
        .clone()
        .json()
        .catch(() => ({}))
    ).code === "SESSION_REFRESH_REQUIRED"
  ) {
    const status = await authAction("status");
    if (status.authenticated) response = await request();
    else
      response = new Response(
        JSON.stringify({ message: "Sign in with GitHub to continue." }),
        { status: 401 },
      );
  }
  if (response.status === 401)
    window.dispatchEvent(new Event("github-signed-out"));
  return response;
});
export const openExternal = (url: string) =>
  window.desktop
    ? window.desktop.openExternal(url)
    : window.open(url, "_blank", "noopener,noreferrer");
