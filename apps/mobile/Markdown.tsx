import React from "react";
import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import {
  githubImagePath,
  mimeType,
  type GitHubClient,
  type Content,
} from "@git-client/github";
import { PierreViewer } from "./Viewer";
export function NativeMarkdown({
  children,
  colors,
  api,
  repo,
  branch,
  path = "",
}: {
  children: string;
  colors: { text: string; textMuted: string; surface: string; canvas?: string };
  api: GitHubClient;
  repo: string;
  branch: string;
  path?: string;
}) {
  const baseUrl = `https://github.com/${repo}/blob/${encodeURIComponent(branch || "HEAD")}/${path ? path + "/" : ""}`;
  const images = useQuery({
    queryKey: ["markdown-media", repo, branch, path, children],
    queryFn: async () => {
      const urls = [
        ...children.matchAll(
          /src=["']([^"']+)["']|!\[[^\]]*\]\(\s*<?([^\s)>]+)>?/g,
        ),
      ].map((m) => m[1] || m[2]);
      const entries = await Promise.all(
        urls.map(async (src) => {
          const resolved = new URL(src, baseUrl).href;
          const target = githubImagePath(resolved);
          if (!target) return [resolved, src];
          try {
            const file = (await api.contents(
              target.repo,
              target.path,
              target.ref,
            )) as Content;
            return [
              resolved,
              `data:${mimeType(file.name)};base64,${file.content?.replace(/\s/g, "") || ""}`,
            ];
          } catch {
            return [resolved, src];
          }
        }),
      );
      return Object.fromEntries(entries);
    },
    staleTime: Infinity,
  });
  return (
    <PierreViewer
      kind="markdown"
      contents={children}
      theme={colors.canvas === "#fcfcfc" ? "light" : "dark"}
      baseUrl={baseUrl}
      imageMap={images.data}
    />
  );
}
