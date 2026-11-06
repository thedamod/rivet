import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Linking,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import type { GitHubClient, Repository } from "@git-client/github";
import { AppIcon } from "./AppIcon";
export function NativeProfileExtras({
  api,
  login,
  colors,
  onRepository,
}: {
  api: GitHubClient;
  login: string;
  colors: { text: string; textMuted: string; surface: string; border: string };
  onRepository: (r: Repository) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["profile-extras", login],
    queryFn: () => api.profileExtras(login),
  });
  const text = (value: string, muted = false) => (
    <Text
      style={{
        fontFamily: "Geist",
        fontSize: 13,
        lineHeight: 19,
        color: muted ? colors.textMuted : colors.text,
      }}
    >
      {value}
    </Text>
  );
  if (query.isPending) return <ActivityIndicator color={colors.textMuted} />;
  if (query.error) return text(query.error.message, true);
  const data = query.data;
  const levels = [
    "NONE",
    "FIRST_QUARTILE",
    "SECOND_QUARTILE",
    "THIRD_QUARTILE",
    "FOURTH_QUARTILE",
  ];
  const fills = [colors.surface, "#0e4429", "#006d32", "#26a641", "#39d353"];
  return (
    <View style={{ gap: 14, paddingVertical: 16 }}>
      {!!data.pinned.length && (
        <>
          {text("Pinned")}
          {data.pinned.map((r) => (
            <Pressable
              key={r.id}
              accessibilityRole="button"
              onPress={() => onRepository(r)}
              style={{
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                gap: 5,
              }}
            >
              <View
                style={{ flexDirection: "row", gap: 8, alignItems: "center" }}
              >
                <AppIcon
                  name="book-outline"
                  size={16}
                  color={colors.textMuted}
                />
                {text(r.full_name)}
              </View>
              {r.description && text(r.description, true)}
            </Pressable>
          ))}
        </>
      )}
      {text(`${data.total.toLocaleString()} contributions in the last year`)}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: "row", gap: 3 }}>
          {data.weeks.map((week, i) => (
            <View key={i} style={{ gap: 3 }}>
              {week.contributionDays.map((day) => (
                <View
                  key={day.date}
                  accessible
                  accessibilityLabel={`${day.date}: ${day.contributionCount} contributions`}
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    backgroundColor:
                      fills[Math.max(0, levels.indexOf(day.contributionLevel))],
                  }}
                />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
      {text("Contribution activity")}
      {data.months.map((month, index) => {
        const total = month.commits.reduce((sum, repo) => sum + repo.count, 0);
        const open = expanded === month.month || (expanded === null && index === 0);
        return <View key={month.month} style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setExpanded(open ? "" : month.month)} style={{ paddingVertical: 12, flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
            {text(new Date(`${month.month}-01T00:00:00Z`).toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" }))}
            {text(`${total.toLocaleString()} commits${month.pullRequests.length ? ` · ${month.pullRequests.length} PRs` : ""}`, true)}
          </Pressable>
          {open && <View style={{ gap: 12, paddingBottom: 14 }}>
            {month.commits.map((repo) => <Pressable key={repo.repo} accessibilityRole="link" onPress={() => Linking.openURL(repo.url)} style={{ gap: 5 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>{text(repo.repo)}{text(repo.count.toLocaleString(), true)}</View>
              <View style={{ height: 4, backgroundColor: colors.surface, borderRadius: 2 }}><View style={{ width: `${total ? (repo.count / total) * 100 : 0}%`, height: 4, backgroundColor: "#2e8b57", borderRadius: 2 }} /></View>
            </Pressable>)}
            {month.pullRequests.map((pr) => <Pressable key={pr.url} accessibilityRole="link" onPress={() => Linking.openURL(pr.url)}>{text(pr.title)}{text(pr.repo, true)}</Pressable>)}
          </View>}
        </View>;
      })}
      {data.errors.map((e) => (
        <React.Fragment key={e}>{text(e, true)}</React.Fragment>
      ))}
    </View>
  );
}
