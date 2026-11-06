import React, { useEffect, useState } from "react";
import { Image, View, Text, Pressable, Linking } from "react-native";
import { WebView } from "react-native-webview";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { VideoView, useVideoPlayer } from "expo-video";
import { useAudioPlayer } from "expo-audio";
import {
  fileFormat,
  mimeType,
  type Content,
  type GitHubClient,
} from "@git-client/github";
export function Media({
  file,
  api,
  colors,
}: {
  file: Content;
  api: GitHubClient;
  colors: { text: string; textMuted: string; canvas: string };
}) {
  const [uri, setUri] = useState("");
  const [error, setError] = useState("");
  const format = fileFormat(file.name);
  useEffect(() => {
    let active = true;
    let cache: File | undefined;
    async function load() {
      try {
        let encoded = file.content;
        if (!encoded || file.encoding !== "base64") {
          if (file.size > 25 * 1024 * 1024)
            throw new Error(
              "This file is larger than the 25 MB preview limit.",
            );
          const ownerRepo = new URL(file.html_url).pathname
            .split("/")
            .slice(1, 3)
            .join("/");
          const blob = await api.request<{ content: string }>(
            `/repos/${ownerRepo}/git/blobs/${file.sha}`,
          );
          encoded = blob.content;
        }
        if (!encoded) throw new Error("No preview data");
        const data = encoded.replace(/\s/g, "");
        if (format === "image" || format === "svg") {
          if (active) setUri(`data:${mimeType(file.name)};base64,${data}`);
        } else {
          cache = new File(
            Paths.cache,
            `git-client-${file.sha}-${file.name.replace(/[^\w.-]/g, "_")}`,
          );
          cache.write(Uint8Array.from(atob(data), (c) => c.charCodeAt(0)));
          if (active) setUri(cache.uri);
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Preview failed");
      }
    }
    load();
    return () => {
      active = false;
      try {
        cache?.delete();
      } catch {}
    };
  }, [file.sha]);
  if (error)
    return (
      <Text style={{ color: colors.textMuted, fontFamily: "Geist" }}>
        {error}
      </Text>
    );
  if (!uri)
    return (
      <View
        style={{ height: 180, backgroundColor: colors.canvas }}
        accessibilityLabel="Loading preview"
      />
    );
  if (format === "image")
    return (
      <Image
        accessibilityLabel={file.name}
        source={{ uri }}
        resizeMode="contain"
        style={{ height: 340, width: "100%" }}
      />
    );
  if (format === "svg")
    return (
      <WebView
        style={{ height: 320, backgroundColor: colors.canvas }}
        originWhitelist={["about:blank"]}
        javaScriptEnabled={false}
        onShouldStartLoadWithRequest={(r) => r.url === "about:blank"}
        source={{
          html: `<meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'"><style>body{margin:0;display:grid;place-items:center;height:100vh}img{max-width:100%;max-height:100vh}</style><img src="${uri}" alt="">`,
        }}
      />
    );
  if (format === "video") return <Video uri={uri} />;
  if (format === "audio") return <Audio uri={uri} color={colors.text} />;
  return (
    <View style={{ gap: 15 }}>
      {format === "pdf" && (
        <WebView
          source={{ uri }}
          originWhitelist={["file://*"]}
          allowFileAccess
          javaScriptEnabled={false}
          style={{ height: 480, backgroundColor: colors.canvas }}
        />
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open or share file"
        onPress={async () => {
          try {
            if (await Sharing.isAvailableAsync())
              await Sharing.shareAsync(uri, { mimeType: mimeType(file.name) });
            else await Linking.openURL(file.html_url);
          } catch {
            setError("Could not open file.");
          }
        }}
        style={{ padding: 15 }}
      >
        <Text style={{ color: colors.text, fontFamily: "Geist" }}>↗</Text>
      </Pressable>
    </View>
  );
}
function Video({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri);
  return (
    <VideoView
      player={player}
      nativeControls
      style={{ height: 260, width: "100%" }}
    />
  );
}
function Audio({ uri, color }: { uri: string; color: string }) {
  const player = useAudioPlayer(uri);
  const [playing, setPlaying] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={playing ? "Pause" : "Play"}
      onPress={() => {
        playing ? player.pause() : player.play();
        setPlaying(!playing);
      }}
      style={{ padding: 25, alignItems: "center" }}
    >
      <Text style={{ color, fontFamily: "Geist", fontSize: 30 }}>
        {playing ? "Ⅱ" : "▷"}
      </Text>
    </Pressable>
  );
}
