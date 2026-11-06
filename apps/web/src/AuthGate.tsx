import { RivetMark } from "./RivetMark";
import { useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ExternalLink, X, LogOut } from "lucide-react";
import type { OAuthStatus } from "@rivet/github/oauth";
import { authAction, openExternal } from "./api";
import { Button } from "./ui/primitives";
import "./auth.css";
export function SignOut() {
  const client = useQueryClient();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await client.cancelQueries();
            await authAction("logout");
            client.clear();
            window.dispatchEvent(new Event("github-signed-out"));
          } catch (e) {
            setError(e instanceof Error ? e.message : "Sign out failed.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <LogOut /> Sign out
      </Button>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
export function AuthGate({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const [status, setStatus] = useState<OAuthStatus | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    authAction("status")
      .then((s) => {
        if (active) setStatus(s);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    const signedOut = () => {
      void client.cancelQueries().then(() => client.clear());
      setStatus((s) => ({
        configured: s?.configured ?? true,
        authenticated: false,
        pending: null,
      }));
    };
    window.addEventListener("github-signed-out", signedOut);
    return () => {
      active = false;
      window.removeEventListener("github-signed-out", signedOut);
    };
  }, [client]);
  useEffect(() => {
    if (!status?.pending) return;
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const next = await authAction("poll");
        if (active) {
          setStatus(next);
          setError("");
        }
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : "GitHub sign-in failed.");
          // Recover authoritative state after denial, expiry or a transient network error.
          authAction("status")
            .then((s) => {
              if (active) setStatus(s);
            })
            .catch(() => {
              if (active) setStatus((s) => (s ? { ...s } : s));
            });
        }
      }
    }, status.pending.interval * 1000);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [status]);
  async function begin() {
    setBusy(true);
    setError("");
    try {
      const next = await authAction("begin");
      setStatus(next);
      if (next.pending && window.desktop)
        openExternal(next.pending.verificationUri);
    } catch (e) {
      setError(e instanceof Error ? e.message : "GitHub sign-in failed.");
    } finally {
      setBusy(false);
    }
  }
  if (status?.authenticated) return children;
  return (
    <main className="auth-page">
      <div className="auth-content">
        <RivetMark size={48} />
        <h1>Rivet</h1>
        {status?.pending ? (
          <>
            <code className="auth-code" aria-label="GitHub verification code">
              {status.pending.userCode}
            </code>
            <Button
              className="primary"
              onClick={() => openExternal(status.pending!.verificationUri)}
            >
              Continue on GitHub <ExternalLink />
            </Button>
            <Button
              aria-label="Cancel sign-in"
              title="Cancel sign-in"
              onClick={async () => {
                try {
                  setStatus(await authAction("cancel"));
                  setError("");
                } catch (e) {
                  setError(
                    e instanceof Error
                      ? e.message
                      : "Could not cancel sign-in.",
                  );
                }
              }}
            >
              <X />
            </Button>
          </>
        ) : (
          <Button
            className="primary"
            disabled={
              busy || (!status && !error) || status?.configured === false
            }
            onClick={
              status
                ? begin
                : async () => {
                    setError("");
                    try {
                      setStatus(await authAction("status"));
                    } catch (e) {
                      setError(
                        e instanceof Error ? e.message : "Could not connect.",
                      );
                    }
                  }
            }
          >
            <RivetMark size={18} />{" "}
            {busy
              ? "Connecting…"
              : !status && error
                ? "Retry connection"
                : "Sign in with GitHub"}
          </Button>
        )}
        {status?.configured === false && (
          <p>
            Set your OAuth App’s public client ID in{" "}
            <code>github-oauth.json</code> and enable device flow.
          </p>
        )}
        {!status && !error && <span role="status">Connecting…</span>}
        {error && <p role="alert">{error}</p>}
      </div>
    </main>
  );
}
