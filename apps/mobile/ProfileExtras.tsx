import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Linking,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import {
  contributionLevel,
  currentMonth,
  profileMonths,
  profilePeriod,
  type GitHubClient,
  type Repository,
} from "@git-client/github";
import { AppIcon, type AppIconName } from "./AppIcon";
import { MenuView } from "./Menu";
const monthLabel = (month: string) =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
const dateLabel = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
type Palette = {
  canvas: string;
  accent: string;
  text: string;
  textMuted: string;
  surface: string;
  border: string;
};
export function NativeProfileExtras({
  api,
  login,
  colors,
  onRepository,
}: {
  api: GitHubClient;
  login: string;
  colors: Palette;
  onRepository: (r: Repository) => void;
}) {
  const [month, setMonth] = useState(currentMonth);
  const [day, setDay] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [width, setWidth] = useState(0);
  const graph = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const query = useQuery({
    queryKey: ["profile-extras", login, "overview"],
    queryFn: () => api.profileExtras(login),
  });
  const data = query.data;
  const period = useMemo(
    () => (data ? profilePeriod(data, month, day) : null),
    [data, month, day],
  );
  const months = useMemo(() => (data ? profileMonths(data) : []), [data]);
  const text = (value: string, muted = false) => (
    <Text style={[s.text, { color: muted ? colors.textMuted : colors.text }]}>
      {value}
    </Text>
  );
  if (query.isPending) return <ActivityIndicator color={colors.textMuted} />;
  if (query.error) return text(query.error.message, true);
  if (!data || !period) return null;
  const fills = [
    colors.canvas,
    `${colors.accent}40`,
    `${colors.accent}7a`,
    `${colors.accent}bd`,
    colors.accent,
  ];
  const entries = [
    ...period.commits.map((repo) => ({
      key: repo.repo,
      title: repo.repo,
      detail: `${repo.count} commits`,
      url: repo.url,
      icon: "git-commit-outline" as AppIconName,
    })),
    ...period.pullRequests.map((pr) => ({
      key: pr.url,
      title: pr.title,
      detail: pr.repo,
      url: pr.url,
      icon: "git-pull-request-outline" as AppIconName,
    })),
  ];
  const overview: { label: string; value: number; icon: AppIconName }[] = [
    {
      label: "Commits",
      value: data.totals.commits,
      icon: "git-commit-outline",
    },
    {
      label: "Pull requests",
      value: data.totals.pullRequests,
      icon: "git-pull-request-outline",
    },
    { label: "Issues", value: data.totals.issues, icon: "ellipse-outline" },
    {
      label: "Reviews",
      value: data.totals.reviews,
      icon: "chatbubble-outline",
    },
    {
      label: "Repositories created",
      value: data.totals.repositories,
      icon: "book-outline",
    },
  ];
  const largest = Math.max(1, ...overview.map((row) => row.value));
  return (
    <View
      style={{ gap: 12, paddingVertical: 12 }}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      {!!data.pinned.length && (
        <>
          {text("Pinned")}
          {data.pinned.map((repo) => (
            <Pressable
              key={repo.id}
              accessibilityRole="button"
              onPress={() => onRepository(repo)}
              style={[s.pin, { borderBottomColor: colors.border }]}
            >
              <AppIcon name="book-outline" size={15} color={colors.textMuted} />
              <View style={{ flex: 1, gap: 4 }}>
                {text(repo.full_name)}
                {repo.description && text(repo.description, true)}
              </View>
            </Pressable>
          ))}
        </>
      )}
      <View style={s.heading}>
        {text(`${data.total.toLocaleString()} contributions`)}
        {text(day ? dateLabel(day) : "Last year", true)}
      </View>
      <ScrollView
        ref={graph}
        horizontal
        showsHorizontalScrollIndicator={false}
        onContentSizeChange={() =>
          graph.current?.scrollToEnd({ animated: false })
        }
      >
        <View style={{ flexDirection: "row", gap: 3, padding: 2 }}>
          {data.weeks.map((week, index) => (
            <View key={index} style={{ gap: 3 }}>
              {week.contributionDays.map((item) => (
                <Pressable
                  key={item.date}
                  accessibilityRole="button"
                  accessibilityLabel={`${dateLabel(item.date)}: ${item.contributionCount} contributions`}
                  accessibilityState={{ selected: day === item.date }}
                  onPress={() => {
                    setDay((previous) =>
                      previous === item.date ? null : item.date,
                    );
                    setMonth(item.date.slice(0, 7));
                    setExpanded(false);
                  }}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 3,
                    backgroundColor:
                      fills[contributionLevel(item.contributionLevel)],
                    borderWidth: 1,
                    borderColor:
                      day === item.date ? colors.text : colors.border,
                  }}
                />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
      <View
        style={[
          s.split,
          {
            flexDirection: width >= 540 ? "row" : "column",
            borderTopColor: colors.border,
          },
        ]}
      >
        <View style={{ flex: width >= 540 ? 1.3 : undefined, minWidth: 0 }}>
          <View style={s.heading}>
            <MenuView
              themeVariant={colors.canvas === "#fcfcfc" ? "light" : "dark"}
              actions={months.map((value) => ({
                id: value,
                title: monthLabel(value),
                state: value === month ? ("on" as const) : ("off" as const),
              }))}
              onPressAction={({ nativeEvent }) => {
                setMonth(nativeEvent.event);
                setDay(null);
                setExpanded(false);
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Activity month"
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingVertical: 8,
                }}
              >
                {text(monthLabel(month))}
                <AppIcon
                  name="chevron-down"
                  size={13}
                  color={colors.textMuted}
                />
              </Pressable>
            </MenuView>
            {text(period.contributions.toLocaleString(), true)}
            {day && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear date filter"
                onPress={() => setDay(null)}
                style={s.icon}
              >
                <AppIcon name="close" size={15} color={colors.textMuted} />
              </Pressable>
            )}
          </View>
          {(expanded ? entries : entries.slice(0, 5)).map((item) => (
            <Pressable
              key={item.key}
              accessibilityRole="link"
              onPress={() => Linking.openURL(item.url)}
              style={s.entry}
            >
              <AppIcon name={item.icon} size={15} color={colors.textMuted} />
              <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                <Text
                  numberOfLines={1}
                  style={[
                    s.text,
                    { color: colors.text, fontFamily: "GeistMedium" },
                  ]}
                >
                  {item.title}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[s.small, { color: colors.textMuted }]}
                >
                  {item.detail}
                </Text>
              </View>
            </Pressable>
          ))}
          {!entries.length && text("No commits or pull requests.", true)}
          {entries.length > 5 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                expanded
                  ? "Show less activity"
                  : `Show all ${entries.length} activities`
              }
              accessibilityState={{ expanded }}
              onPress={() => setExpanded((value) => !value)}
              style={s.icon}
            >
              <AppIcon
                name="chevron-down"
                style={{
                  transform: [{ rotate: expanded ? "180deg" : "0deg" }],
                }}
                size={16}
                color={colors.textMuted}
              />
            </Pressable>
          )}
        </View>
        <View
          style={{
            flex: width >= 540 ? 1 : undefined,
            minWidth: 0,
            borderLeftWidth: width >= 540 ? StyleSheet.hairlineWidth : 0,
            borderTopWidth: width >= 540 ? 0 : StyleSheet.hairlineWidth,
            borderColor: colors.border,
            paddingLeft: width >= 540 ? 20 : 0,
            paddingTop: width >= 540 ? 0 : 8,
          }}
        >
          <View style={s.heading}>
            {text("Overview")}
            {text("Last year", true)}
          </View>
          {overview.map((item) => (
            <View key={item.label} style={{ paddingVertical: 5, gap: 5 }}>
              <View
                style={{ flexDirection: "row", gap: 8, alignItems: "center" }}
              >
                <AppIcon name={item.icon} size={14} color={colors.textMuted} />
                <Text style={[s.small, { flex: 1, color: colors.textMuted }]}>
                  {item.label}
                </Text>
                {text(item.value.toLocaleString())}
              </View>
              <View
                style={{
                  height: 3,
                  marginLeft: 22,
                  borderRadius: 2,
                  overflow: "hidden",
                  backgroundColor: colors.border,
                }}
              >
                <View
                  style={{
                    height: 3,
                    width: `${(item.value / largest) * 100}%`,
                    backgroundColor: colors.accent,
                  }}
                />
              </View>
            </View>
          ))}
        </View>
      </View>
      {data.errors.map((error) => (
        <React.Fragment key={error}>{text(error, true)}</React.Fragment>
      ))}
    </View>
  );
}
const s = StyleSheet.create({
  text: { fontFamily: "Geist", fontSize: 12, lineHeight: 18 },
  small: { fontFamily: "Geist", fontSize: 11, lineHeight: 16 },
  pin: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    minHeight: 34,
  },
  split: { gap: 16, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8 },
  entry: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 7,
    alignItems: "flex-start",
  },
  icon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
});
