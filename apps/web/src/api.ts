import { createClient } from "@git-client/github";
declare global {
  interface Window {
    desktop?: {
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
export const api = createClient(async (path, init) => {
  if (window.desktop) {
    const r = await window.desktop.request(path, {
      method: init?.method,
      body: init?.body as string,
    });
    return new Response(r.status === 204 ? null : JSON.stringify(r.body), {
      status: r.status,
      headers: r.headers,
    });
  }
  return fetch("/api/github" + path, {
    ...init,
    headers: { "Content-Type": "application/json", "X-Git-Client": "1" },
  });
});
export const openExternal = (url: string) =>
  window.desktop
    ? window.desktop.openExternal(url)
    : window.open(url, "_blank", "noopener,noreferrer");
