import { useEffect, useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import type { OAuthStatus } from "@git-client/github/oauth";
import { oauth } from "./oauth";
import { AppIcon } from "./AppIcon";
export function OAuthLogin({
  colors,
  onConnected,
}: {
  colors: { text: string; textMuted: string; accent: string };
  onConnected: () => void;
}) {
  const [status, setStatus] = useState<OAuthStatus | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    oauth
      .status()
      .then((s) => {
        if (active) setStatus(s);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (status?.authenticated) {
      onConnected();
      return;
    }
    if (!status?.pending) return;
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const next = await oauth.poll();
        if (active) {
          setStatus(next);
          setError("");
        }
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : "GitHub sign-in failed.");
          oauth
            .status()
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
  }, [status, onConnected]);
  async function connect() {
    setBusy(true);
    setError("");
    try {
      const next = status?.pending ? status : await oauth.begin();
      setStatus(next);
      if (next.pending) await Linking.openURL(next.pending.verificationUri);
    } catch (e) {
      setError(e instanceof Error ? e.message : "GitHub sign-in failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ alignItems: "center", gap: 22, paddingVertical: 28 }}>
      {status?.pending && (
        <Text
          selectable
          accessibilityLabel="GitHub verification code"
          style={{
            fontFamily: "GeistMono",
            fontSize: 28,
            color: colors.text,
            letterSpacing: 3,
          }}
        >
          {status.pending.userCode}
        </Text>
      )}
      <Pressable
        accessibilityRole="button"
        disabled={busy || status?.configured === false}
        onPress={connect}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          borderRadius: 8,
          padding: 15,
          backgroundColor: colors.accent,
          opacity: busy || status?.configured === false ? 0.5 : 1,
        }}
      >
        <AppIcon name="logo-github" size={20} color="#fff" />
        <Text
          style={{ fontFamily: "GeistMedium", color: "#fff", fontSize: 15 }}
        >
          {status?.pending
            ? "Continue on GitHub"
            : busy
              ? "Connecting…"
              : "Sign in with GitHub"}
        </Text>
      </Pressable>
      {status?.pending && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel sign-in"
          onPress={async () => {
            try {
              setStatus(await oauth.cancel());
              setError("");
            } catch {
              setError("Could not cancel sign-in.");
            }
          }}
          style={{ padding: 12 }}
        >
          <AppIcon name="close" size={20} color={colors.textMuted} />
        </Pressable>
      )}
      {status?.configured === false && (
        <Text
          style={{
            fontFamily: "Geist",
            color: colors.textMuted,
            textAlign: "center",
            lineHeight: 22,
          }}
        >
          Set your OAuth App’s public client ID in github-oauth.json and enable
          device flow.
        </Text>
      )}
      {!!error && (
        <Text
          accessibilityRole="alert"
          style={{
            fontFamily: "Geist",
            color: colors.text,
            textAlign: "center",
            lineHeight: 22,
          }}
        >
          {error}
        </Text>
      )}
    </View>
  );
}
