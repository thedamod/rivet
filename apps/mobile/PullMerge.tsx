import React, { useState } from "react";
import { Alert, Platform, Pressable, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { GitHubClient, Issue } from "@git-client/github";
import { AppIcon } from "./AppIcon";
export function NativePullMerge({
  api,
  repo,
  number,
  issue,
  colors,
}: {
  api: GitHubClient;
  repo: string;
  number: number;
  issue: Issue & { head?: { sha?: string } };
  colors: { accent: string };
}) {
  const [method, setMethod] = useState<"squash" | "merge" | "rebase">("squash");
  const client = useQueryClient();
  const settings = useQuery({
    queryKey: ["merge-settings", repo],
    queryFn: () => api.repo(repo),
  });
  const merge = useMutation({
    mutationFn: async (method: "merge" | "squash" | "rebase") => {
      if (!issue.head?.sha) throw new Error("Head revision unavailable");
      const r = await api.mergePull(repo, number, issue.head.sha, method);
      if (!r.merged) throw new Error(r.message);
      return r;
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["issue", repo, number] });
      client.invalidateQueries({ queryKey: ["pr-timeline", repo, number] });
      client.invalidateQueries({ queryKey: ["issues"] });
      client.invalidateQueries({ queryKey: ["repoIssues"] });
    },
    onError: (e) => Alert.alert("Merge unavailable", e.message),
  });
  if (issue.state !== "open" || issue.merged_at) return null;
  const methods = (
    [
      ["squash", "Squash and merge", settings.data?.allow_squash_merge],
      ["merge", "Create merge commit", settings.data?.allow_merge_commit],
      ["rebase", "Rebase and merge", settings.data?.allow_rebase_merge],
    ] as const
  ).filter((m) => m[2] !== false);
  const chosen = methods.find((m) => m[0] === method) || methods[0];
  const blocked = issue.draft
    ? "Draft pull requests cannot be merged."
    : issue.mergeable === false
      ? "Resolve conflicts before merging."
      : !settings.data?.permissions?.push
        ? "Repository write access is required to merge."
        : !chosen
          ? "Merging is disabled for this repository."
          : undefined;
  const confirm = () => {
    if (blocked || !chosen) {
      Alert.alert("Merge unavailable", blocked);
      return;
    }
    Alert.alert(`Merge #${number}?`, issue.title, [
      { text: "Cancel", style: "cancel" },
      { text: "Merge", onPress: () => merge.mutate(chosen[0]) },
    ]);
  };
  const select = () =>
    Alert.alert(
      "Merge method",
      undefined,
      [
        ...methods.map(([id, text]) => ({
          text,
          onPress: () => setMethod(id),
        })),
        ...(Platform.OS === "ios"
          ? [{ text: "Cancel", style: "cancel" as const }]
          : []),
      ],
      { cancelable: true },
    );
  const disabled = merge.isPending || settings.isPending;
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 2,
        opacity: disabled ? 0.64 : 1,
        marginTop: 12,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={chosen?.[1] || "Merge pull request"}
        disabled={disabled}
        onPress={confirm}
        style={{
          backgroundColor: colors.accent,
          borderTopLeftRadius: 28,
          borderBottomLeftRadius: 28,
          borderTopRightRadius: 5,
          borderBottomRightRadius: 5,
          height: 48,
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <AppIcon name="git-merge-outline" color="#fff" size={18} />
        <Text
          style={{ fontFamily: "GeistMedium", fontSize: 16, color: "#fff" }}
        >
          {merge.isPending ? "Merging…" : chosen?.[1] || "Merge"}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Merge method"
        disabled={disabled}
        onPress={select}
        style={{
          width: 48,
          height: 48,
          backgroundColor: colors.accent,
          borderTopRightRadius: 28,
          borderBottomRightRadius: 28,
          borderTopLeftRadius: 5,
          borderBottomLeftRadius: 5,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <AppIcon name="chevron-down" size={18} color="#fff" />
      </Pressable>
    </View>
  );
}
