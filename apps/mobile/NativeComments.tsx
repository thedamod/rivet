import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useQuery } from "@tanstack/react-query";
import type { GitHubClient, Comment } from "@rivet/github";
import { NativeMarkdown } from "./Markdown";
import { AppIcon } from "./AppIcon";
import { MenuView } from "./Menu";
type Palette = {
  canvas: string;
  surface: string;
  text: string;
  textMuted: string;
};
export function NativeComment({
  body,
  login,
  api,
  repo,
  branch,
  colors,
}: {
  body: string;
  login: string;
  api: GitHubClient;
  repo: string;
  branch: string;
  colors: Palette;
}) {
  const bot = /\[bot\]$|^(vercel|dependabot|github-actions)$/i.test(login);
  const [open, setOpen] = useState(!bot);
  return (
    <View style={{ paddingVertical: 10, opacity: bot ? 0.7 : 1 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${login} comment`}
        onPress={() => setOpen((v) => !v)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          minHeight: 30,
        }}
      >
        <Text
          style={{
            flex: 1,
            fontFamily: "GeistMedium",
            fontSize: 13,
            color: colors.text,
          }}
        >
          {login}
        </Text>
        <AppIcon name="chevron-down" size={12} color={colors.textMuted} />
      </Pressable>
      {open && (
        <NativeMarkdown colors={colors} api={api} repo={repo} branch={branch}>
          {body}
        </NativeMarkdown>
      )}
    </View>
  );
}
export function NativeComments({
  api,
  repo,
  number,
  branch,
  colors,
  children,
}: {
  api: GitHubClient;
  repo: string;
  number: number;
  branch: string;
  colors: Palette;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const [filter, setFilter] = useState("all");
  const [newest, setNewest] = useState(true);
  const query = useQuery({
    queryKey: ["pr-comments", repo, number],
    queryFn: async () => {
      const all: Comment[] = [];
      for (let page = 1; ; page++) {
        const r = await api.comments(repo, number, page);
        all.push(...r);
        if (r.length < 100) return all;
      }
    },
  });
  const list = (query.data || []).filter(
    (c) =>
      filter === "all" ||
      (filter === "bots"
        ? /\[bot\]$/.test(c.user.login)
        : !/\[bot\]$/.test(c.user.login)),
  );
  if (newest) list.reverse();
  return (
    <View style={{ marginVertical: 20 }}>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen((v) => !v)}
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            minHeight: 40,
          }}
        >
          <Text
            style={{ fontFamily: "Geist", fontSize: 14, color: colors.text }}
          >
            Comments ({query.data?.length ?? "…"})
          </Text>
          <AppIcon name="chevron-down" size={12} color={colors.textMuted} />
        </Pressable>
        <MenuView
          themeVariant={colors.canvas === "#fcfcfc" ? "light" : "dark"}
          actions={["all", "people", "bots"].map((id) => ({
            id,
            title:
              id === "all"
                ? "All comments"
                : id === "people"
                  ? "People"
                  : "Bots",
            state: filter === id ? "on" : "off",
          }))}
          onPressAction={({ nativeEvent: { event } }) => setFilter(event)}
        >
          <View
            accessible
            accessibilityLabel="Filter comments"
            style={{ padding: 8 }}
          >
            <AppIcon
              name="settings-outline"
              size={16}
              color={colors.textMuted}
            />
          </View>
        </MenuView>
        <Pressable
          accessibilityLabel="Reverse comments order"
          onPress={() => setNewest((v) => !v)}
        >
          <AppIcon
            name={newest ? "arrow-up" : "arrow-forward"}
            size={16}
            color={colors.textMuted}
          />
        </Pressable>
      </View>
      {open &&
        (query.error ? (
          <Text style={{ fontFamily: "Geist", color: colors.textMuted }}>
            {query.error.message}
          </Text>
        ) : (
          list.map((c) => (
            <NativeComment
              key={c.id}
              body={c.body || ""}
              login={c.user.login}
              api={api}
              repo={repo}
              branch={branch}
              colors={colors}
            />
          ))
        ))}
      {open && children}
    </View>
  );
}
