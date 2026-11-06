import { CommentEditor } from "./CommentEditor";
import { NativeComment, NativeComments } from "./NativeComments";
import { SvgUri } from "react-native-svg";
import { Sheet } from "./Sheet";
import { MenuView } from "./Menu";
import { githubImagePath, mimeType, type Content } from "@git-client/github";
import { NativePullMerge } from "./PullMerge";
import { checkLabel } from "@git-client/github";
import { issueIcon } from "./IssueStatus";
import React, { useState, useEffect, useRef } from "react";
import {
  Image,
  Animated,
  Modal,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AppIcon } from "./AppIcon";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { GitHubClient, Issue, User } from "@git-client/github";
import { NativeMarkdown } from "./Markdown";
import { PierreViewer } from "./Viewer";

type Palette = {
  canvas: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  accent: string;
  errorForeground: string;
  errorSurface: string;
};
type PullDetail = Issue & {
  changed_files?: number;
  requested_reviewers?: User[];
  head?: { ref: string; sha?: string };
  base?: { ref: string };
};
type TimelineEvent = {
  sha?: string;
  message?: string;
  author?: { name: string; date?: string; avatar_url?: string; login?: string };
  committer?: { name: string; date?: string };
  id?: number;
  node_id?: string;
  event: string;
  actor?: User;
  user?: User;
  created_at?: string;
  submitted_at?: string;
  body?: string;
  state?: string;
  commit_id?: string;
  html_url?: string;
  label?: { name: string };
  requested_reviewer?: User;
};
type Check = {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  html_url: string;
};
type Icon = keyof typeof AppIcon.glyphMap;

/** Matches T3's mobile PR hierarchy and row geometry, with the requested flat surfaces. */
export function NativePullRequest({
  repo,
  number,
  pull,
  api,
  colors,
  onProfile,
  activityRequest = 0,
}: {
  repo: string;
  number: number;
  pull: boolean;
  api: GitHubClient;
  colors: Palette;
  onProfile?: (login: string) => void;
  activityRequest?: number;
}) {
  const client = useQueryClient();
  const [tab, setTab] = useState<"summary" | "timeline" | "code">("summary");
  const [page, setPage] = useState(1);
  useEffect(() => {
    if (activityRequest) {
      setTab("timeline");
      setPage(1);
    }
  }, [activityRequest]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [compact, setCompact] = useState(false);
  const headerAnimation = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(headerAnimation, {
      toValue: compact ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [compact]);
  const [checksOpen, setChecksOpen] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [descriptionOpen, setDescriptionOpen] = useState(true);
  const [hideTests, setHideTests] = useState(false);
  const [viewed, setViewed] = useState<Set<string>>(new Set());
  const [activityFilter, setActivityFilter] = useState<
    "all" | "comments" | "commits"
  >("all");
  const [newest, setNewest] = useState(true);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewers, setReviewers] = useState("");
  const review = useMutation({
    mutationFn: () =>
      api.request(`/repos/${repo}/pulls/${number}/requested_reviewers`, {
        method: "POST",
        body: JSON.stringify({
          reviewers: reviewers
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      }),
    onSuccess: () => {
      setReviewOpen(false);
      setReviewers("");
      client.invalidateQueries({ queryKey: ["issue", repo, number] });
    },
  });

  const detail = useQuery({
    queryKey: ["issue", repo, number, pull],
    queryFn: () => api.issue(repo, number, pull) as Promise<PullDetail>,
  });
  const commits = useQuery({
    queryKey: ["pr-commits", repo, number],
    enabled: pull && tab === "timeline",
    queryFn: async () => {
      const all: import("@git-client/github").Commit[] = [];
      for (let page = 1; ; page++) {
        const r = await api.pullCommits(repo, number, page);
        all.push(...r);
        if (r.length < 100) return all;
      }
    },
  });
  const timeline = useQuery({
    queryKey: ["pr-timeline", repo, number, page],
    queryFn: () =>
      api.request<TimelineEvent[]>(
        `/repos/${repo}/issues/${number}/timeline?per_page=50&page=${page}`,
      ),
    enabled: tab === "timeline",
  });
  const files = useQuery({
    queryKey: ["diff", repo, number, page],
    queryFn: () => api.diff(repo, number, page),
    enabled: pull && tab === "summary",
  });
  const checks = useQuery({
    queryKey: ["pr-checks", repo, detail.data?.head?.sha],
    queryFn: () => api.pullChecks(repo, detail.data!.head!.sha!),
    enabled: pull && !!detail.data?.head?.sha,
  });
  const comment = useMutation({
    mutationFn: () => api.comment(repo, number, body),
    onSuccess: () => {
      setBody("");
      client.invalidateQueries({ queryKey: ["pr-timeline", repo, number] });
      client.invalidateQueries({ queryKey: ["comments", repo, number] });
      client.invalidateQueries({ queryKey: ["issue", repo, number] });
    },
  });
  const change = useMutation({
    mutationFn: () =>
      api.setIssueState(
        repo,
        number,
        detail.data?.state === "open" ? "closed" : "open",
      ),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["issue", repo, number] });
      client.invalidateQueries({ queryKey: ["issues"] });
      client.invalidateQueries({ queryKey: ["repoIssues"] });
    },
  });
  const text = (children: React.ReactNode, muted = false, extra?: object) => (
    <Text
      style={[
        styles.text,
        { color: muted ? colors.textMuted : colors.text },
        extra,
      ]}
    >
      {children}
    </Text>
  );
  function iconButton(
    icon: Icon,
    label: string,
    action: () => void,
    disabled = false,
    selected = false,
  ) {
    return (
      <Pressable
        key={label}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected, disabled }}
        disabled={disabled}
        onPress={action}
        hitSlop={4}
        style={({ pressed }) => [
          styles.iconButton,
          {
            opacity: disabled ? 0.4 : pressed ? 0.6 : 1,
            backgroundColor: selected ? colors.surface : "transparent",
          },
        ]}
      >
        <AppIcon
          name={icon}
          size={18}
          color={selected ? colors.text : colors.textMuted}
        />
      </Pressable>
    );
  }
  function error(error: unknown) {
    return (
      <View
        accessibilityRole="alert"
        style={[styles.error, { backgroundColor: colors.errorSurface }]}
      >
        {text(
          error instanceof Error ? error.message : "Could not load from GitHub",
          false,
          { color: colors.errorForeground },
        )}
      </View>
    );
  }
  function skeleton() {
    return (
      <View
        accessibilityLabel="Loading pull request details"
        accessibilityState={{ busy: true }}
        style={styles.loading}
      >
        {[0.32, 0.95, 0.7, 0.3, 0.9, 0.95, 0.84, 0.76].map((w, i) => (
          <View
            key={i}
            style={{
              height: i === 1 ? 28 : 13,
              width: `${w * 100}%`,
              backgroundColor: colors.surface,
              marginBottom: i === 3 ? 32 : 10,
              borderRadius: 3,
            }}
          />
        ))}
      </View>
    );
  }
  function pager(hasNext: boolean) {
    return (
      <View style={styles.pager}>
        {iconButton(
          "chevron-back",
          "Previous page",
          () => setPage(page - 1),
          page === 1,
        )}
        {text(page, true, { fontFamily: "GeistMono", fontSize: 11 })}
        {iconButton(
          "chevron-forward",
          "Next page",
          () => setPage(page + 1),
          !hasNext,
        )}
      </View>
    );
  }
  if (detail.isPending)
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        {skeleton()}
      </ScrollView>
    );
  if (detail.error)
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        {error(detail.error)}
        {iconButton("refresh-outline", "Retry", () => detail.refetch())}
      </ScrollView>
    );
  const pr = detail.data!;
  const markdownProps = {
    colors,
    api,
    repo,
    branch: pr.head?.ref || pr.base?.ref || "HEAD",
  };
  const passed =
    checks.data?.items.filter((c) => c.state === "success").length || 0;
  const green = colors.canvas === "#fcfcfc" ? "#059669" : "#34d399";
  const activity = (timeline.data || []).filter(
    (e) =>
      activityFilter === "all" ||
      (activityFilter === "comments" ? !!e.body : !e.body && !!e.message),
  );
  const commitMap = new Map(commits.data?.map((c) => [c.sha, c]));
  const enriched = activity.map((e) => {
    const c = commitMap.get(e.sha || e.commit_id || "");
    return c
      ? {
          ...e,
          actor: e.actor || c.author,
          message: e.message || c.commit.message,
        }
      : e;
  });
  const ordered = newest ? [...enriched].reverse() : enriched;
  const visibleFiles = (files.data || []).filter(
    (f) =>
      !hideTests ||
      !/(?:^|[/.])(test|tests|spec|__tests__)(?:[/.]|$)/i.test(f.filename),
  );
  const images = pr.body
    ? [
        ...pr.body.matchAll(
          /<img\b[^>]*src=["']([^"']+)["'][^>]*>|!\[([^\]]*)\]\(([^\s)]+)\)/g,
        ),
      ].map((m) => ({
        url: m[1] || m[3],
        caption: m[2] || m[0].match(/alt=["']([^"']*)/)?.[1] || "",
      }))
    : [];
  const prose = (pr.body || "").replace(
    /<img\b[^>]*>|!\[[^\]]*\]\([^\s)]+\)/g,
    "",
  );
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.canvas }}
      contentContainerStyle={styles.content}
      stickyHeaderIndices={[0]}
      scrollEventThrottle={16}
      onScroll={(e) => {
        const y = e.nativeEvent.contentOffset.y;
        setCompact((v) => (y > 120 ? true : y < 28 ? false : v));
      }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ backgroundColor: colors.canvas, paddingBottom: 16 }}>
        <View style={[styles.row, { paddingVertical: 8, flexWrap: "wrap" }]}>
          <AppIcon name={issueIcon(pr, pull)} size={14} color={green} />
          {text(
            pr.merged_at
              ? "Merged"
              : pr.draft
                ? "Draft"
                : pr.state === "open"
                  ? "Open"
                  : "Closed",
            false,
            { color: green, fontSize: 13 },
          )}
          {pull && (
            <>
              {text(`+${(pr.additions || 0).toLocaleString()}`, false, {
                color: green,
                fontSize: 12,
              })}
              {text(`−${(pr.deletions || 0).toLocaleString()}`, false, {
                color: colors.errorForeground,
                fontSize: 12,
              })}
              {text(`${pr.changed_files ?? "—"} files`, true, { fontSize: 12 })}
            </>
          )}
          <View style={{ flex: 1 }} />
          {iconButton("open-outline", "Open on GitHub", () =>
            Linking.openURL(pr.html_url),
          )}
        </View>
        <Animated.Text
          selectable
          style={[
            styles.title,
            {
              color: colors.text,
              marginVertical: headerAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [12, 4],
              }),
              fontSize: headerAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 14],
              }),
              lineHeight: headerAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [28, 20],
              }),
            },
          ]}
        >
          {pr.title}
        </Animated.Text>
        <Animated.View
          style={{
            maxHeight: headerAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [88, 0],
            }),
            opacity: headerAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0],
            }),
            overflow: "hidden",
          }}
        >
          <View style={[styles.row, { marginBottom: 14 }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`View ${pr.user.login}'s profile`}
              onPress={() => onProfile?.(pr.user.login)}
              style={styles.row}
            >
              <Image
                source={{ uri: pr.user.avatar_url }}
                style={styles.avatar}
              />
              {text(pr.user.login, false, {
                fontFamily: "GeistMedium",
                fontSize: 13,
              })}
            </Pressable>
            <View style={{ flex: 1 }} />
            {text(
              `Updated ${Math.max(0, Math.floor((Date.now() - Date.parse(pr.updated_at)) / 3600000))}h ago`,
              true,
              { fontSize: 12 },
            )}
          </View>
          {pull && (
            <Text
              style={[
                styles.mono,
                { color: colors.textMuted, fontSize: 12, marginBottom: 18 },
              ]}
            >
              {pr.base?.ref} ← {pr.head?.ref}
            </Text>
          )}
        </Animated.View>
        <View
          accessibilityRole="tablist"
          style={{
            flexDirection: "row",
            padding: 3,
            borderRadius: 24,
            backgroundColor: colors.surface,
          }}
        >
          {(["summary", "timeline"] as const).map((t) => (
            <Pressable
              key={t}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === t }}
              onPress={() => {
                setTab(t);
                setPage(1);
              }}
              style={{
                flex: 1,
                minHeight: 30,
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor:
                  tab === t
                    ? colors.canvas === "#fcfcfc"
                      ? "#e4e4e7"
                      : "#525252"
                    : "transparent",
              }}
            >
              <Text
                style={{
                  fontFamily: tab === t ? "GeistSemiBold" : "Geist",
                  color: tab === t ? colors.text : colors.textMuted,
                  fontSize: 14,
                }}
              >
                {t === "summary" ? "Overview" : "Activity"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      {tab === "summary" ? (
        <>
          {pull && (
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 24,
                padding: 12,
                marginBottom: 18,
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: checksOpen }}
                onPress={() => setChecksOpen((v) => !v)}
                style={styles.controlRow}
              >
                <AppIcon
                  name={
                    checks.data?.items.some((c) => c.state === "failure")
                      ? "close-circle-outline"
                      : "checkmark-circle-outline"
                  }
                  size={18}
                  color={green}
                />
                {text(
                  checks.isPending
                    ? "Loading checks"
                    : checks.data?.items.some((c) => c.state === "pending")
                      ? "Checks running"
                      : checks.data?.restricted && !checks.data.items.length
                        ? "Checks unavailable"
                        : checks.data?.items.some((c) => c.state === "failure")
                          ? "Checks failed"
                          : "Checks completed",
                  false,
                  { flex: 1, fontSize: 14 },
                )}
                {text(`${passed} of ${checks.data?.items.length || 0}`, true, {
                  fontSize: 12,
                })}
                <AppIcon
                  name="chevron-down"
                  size={12}
                  color={colors.textMuted}
                />
              </Pressable>
              {checksOpen && (
                <View>
                  {checks.error ? (
                    error(checks.error)
                  ) : (
                    <>
                      {checks.data?.restricted &&
                        text(
                          "Some checks require Checks and Commit statuses read access.",
                          true,
                          { fontSize: 12 },
                        )}
                      {checks.data?.items.map((c) => (
                        <Pressable
                          key={c.id}
                          disabled={!c.url}
                          onPress={() => c.url && Linking.openURL(c.url)}
                          style={styles.check}
                        >
                          <AppIcon
                            name={
                              c.state === "pending"
                                ? "time-outline"
                                : ["failure", "cancelled"].includes(c.state)
                                  ? "close-circle-outline"
                                  : "checkmark-circle-outline"
                            }
                            size={14}
                            color={
                              c.state === "success" ? green : colors.textMuted
                            }
                          />
                          {text(c.name, false, { flex: 1, fontSize: 12 })}
                          {text(checkLabel(c.state), true, { fontSize: 11 })}
                        </Pressable>
                      ))}
                    </>
                  )}
                </View>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Request a review"
                onPress={() => setReviewOpen(true)}
                style={styles.controlRow}
              >
                <AppIcon
                  name="people-outline"
                  size={18}
                  color={colors.textMuted}
                />
                {text("Request a review", false, { flex: 1, fontSize: 14 })}
                {text(
                  pr.requested_reviewers?.map((u) => u.login).join(", ") ||
                    "None assigned",
                  true,
                  { fontSize: 12, flexShrink: 1 },
                )}
                <AppIcon
                  name="chevron-down"
                  size={12}
                  color={colors.textMuted}
                />
              </Pressable>
              <View style={styles.controlRow}>
                <AppIcon
                  name={
                    pr.mergeable === false
                      ? "close-circle-outline"
                      : pr.mergeable === true
                        ? "checkmark-circle-outline"
                        : "time-outline"
                  }
                  size={18}
                  color={pr.mergeable === true ? green : colors.textMuted}
                />
                {text(
                  pr.mergeable === false
                    ? "Conflicts must be resolved"
                    : pr.mergeable === true
                      ? `No conflicts with ${pr.base?.ref}`
                      : "Checking for conflicts",
                  false,
                  { fontSize: 14, flex: 1 },
                )}
              </View>
              <NativePullMerge
                api={api}
                repo={repo}
                number={number}
                issue={pr}
                colors={colors}
              />
            </View>
          )}
          {!!pr.labels.length && (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 6,
                marginBottom: 16,
              }}
            >
              {pr.labels.map((l) => (
                <View
                  key={l.name}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 16,
                    backgroundColor: colors.surface,
                  }}
                >
                  <AppIcon
                    name="pricetag-outline"
                    size={13}
                    color={colors.textMuted}
                  />
                  {text(l.name, true, { fontSize: 12 })}
                </View>
              ))}
            </View>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: descriptionOpen }}
            onPress={() => setDescriptionOpen((v) => !v)}
            style={{
              flexDirection: "row",
              gap: 6,
              alignItems: "center",
              minHeight: 40,
            }}
          >
            {text("Description", false, { fontSize: 16 })}
            <AppIcon name="chevron-down" size={12} color={colors.textMuted} />
          </Pressable>
          {descriptionOpen && (
            <>
              <View
                style={{
                  maxHeight: descriptionExpanded ? undefined : 240,
                  overflow: "hidden",
                }}
              >
                <NativeMarkdown {...markdownProps}>{prose}</NativeMarkdown>
              </View>
              {prose.length > 600 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    descriptionExpanded
                      ? "Collapse description"
                      : "Expand description"
                  }
                  onPress={() => setDescriptionExpanded((v) => !v)}
                  style={{
                    minHeight: 44,
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
                    gap: 6,
                  }}
                >
                  {text(
                    descriptionExpanded ? "Show less" : "Show more",
                    false,
                    {
                      fontSize: 13,
                    },
                  )}
                  <AppIcon
                    name="chevron-down"
                    size={12}
                    color={colors.textMuted}
                  />
                </Pressable>
              )}
            </>
          )}
          {!!images.length && (
            <View style={{ marginTop: 20, gap: 12 }}>
              {text("Attachments", false, { fontSize: 16 })}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12 }}
              >
                {images.map((image, index) => (
                  <PullAttachment
                    key={`${image.url}:${index}`}
                    {...image}
                    api={api}
                    colors={colors}
                  />
                ))}
              </ScrollView>
            </View>
          )}
          <NativeComments
            api={api}
            repo={repo}
            number={number}
            branch={markdownProps.branch}
            colors={colors}
          />
          {pull && (
            <View
              style={{
                marginTop: 28,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: colors.border,
                paddingTop: 20,
              }}
            >
              {text("Changed files", false, { fontSize: 16, marginBottom: 8 })}
              <View style={styles.row}>
                {text(
                  `${pr.changed_files ?? files.data?.length ?? "—"} changed files · ${viewed.size} viewed`,
                  true,
                  { fontSize: 12, flex: 1 },
                )}
                {iconButton(
                  "settings-outline",
                  hideTests ? "Include test files" : "Hide test files",
                  () => setHideTests((v) => !v),
                  false,
                  hideTests,
                )}
              </View>
              {files.isPending
                ? skeleton()
                : files.error
                  ? error(files.error)
                  : visibleFiles.map((file) => (
                      <View
                        key={file.filename}
                        style={[
                          styles.diff,
                          { borderBottomColor: colors.border },
                        ]}
                      >
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={file.filename}
                          onPress={() =>
                            setExpanded(
                              expanded === file.filename ? null : file.filename,
                            )
                          }
                          style={styles.fileHeader}
                        >
                          <AppIcon
                            name={
                              file.filename.endsWith(".yml")
                                ? "git-compare-outline"
                                : file.filename.endsWith(".gitignore")
                                  ? "git-branch-outline"
                                  : "document-text-outline"
                            }
                            size={20}
                            color={
                              file.filename.endsWith(".yml")
                                ? colors.errorForeground
                                : colors.textMuted
                            }
                          />
                          <View style={{ flex: 1, gap: 3 }}>
                            <Text
                              numberOfLines={1}
                              style={{
                                fontFamily: "GeistMedium",
                                fontSize: 14,
                                color: colors.text,
                              }}
                            >
                              {file.filename.split("/").at(-1)}
                            </Text>
                            <Text
                              numberOfLines={1}
                              style={{
                                fontFamily: "Geist",
                                fontSize: 12,
                                color: colors.textMuted,
                              }}
                            >
                              {file.filename.includes("/")
                                ? file.filename.slice(
                                    0,
                                    file.filename.lastIndexOf("/"),
                                  )
                                : ""}
                            </Text>
                          </View>
                          {file.additions > 0 &&
                            text(`+${file.additions}`, false, {
                              color: green,
                              fontSize: 12,
                            })}
                          {file.deletions > 0 &&
                            text(`−${file.deletions}`, false, {
                              color: colors.errorForeground,
                              fontSize: 12,
                            })}
                          <AppIcon
                            name="chevron-forward"
                            size={12}
                            color={colors.textMuted}
                          />
                        </Pressable>
                        {expanded === file.filename && (
                          <>
                            <Pressable
                              accessibilityRole="checkbox"
                              accessibilityState={{
                                checked: viewed.has(file.filename),
                              }}
                              onPress={() =>
                                setViewed((v) => {
                                  const n = new Set(v);
                                  n.has(file.filename)
                                    ? n.delete(file.filename)
                                    : n.add(file.filename);
                                  return n;
                                })
                              }
                              style={styles.controlRow}
                            >
                              <AppIcon
                                name="checkmark-circle-outline"
                                size={16}
                                color={
                                  viewed.has(file.filename)
                                    ? green
                                    : colors.textMuted
                                }
                              />
                              {text("Viewed", true, { fontSize: 12 })}
                            </Pressable>
                            {file.patch ? (
                              <PierreViewer
                                kind="diff"
                                name={file.filename}
                                contents={file.patch}
                                theme={
                                  colors.canvas === "#fcfcfc" ? "light" : "dark"
                                }
                              />
                            ) : (
                              iconButton("open-outline", "Open full diff", () =>
                                Linking.openURL(`${pr.html_url}/files`),
                              )
                            )}
                          </>
                        )}
                      </View>
                    ))}
              {pager(files.data?.length === 100)}
            </View>
          )}
        </>
      ) : (
        <>
          <View style={[styles.row, { paddingVertical: 12 }]}>
            <MenuView
              themeVariant={colors.canvas === "#fcfcfc" ? "light" : "dark"}
              actions={["all", "comments", "commits"].map((id) => ({
                id,
                title:
                  id === "all"
                    ? "All activity"
                    : id === "comments"
                      ? "Comments"
                      : "Commits",
                state: activityFilter === id ? "on" : "off",
              }))}
              onPressAction={({ nativeEvent: { event } }) =>
                setActivityFilter(event as typeof activityFilter)
              }
            >
              <View style={styles.row}>
                {text(
                  activityFilter === "all"
                    ? "All activity"
                    : activityFilter === "comments"
                      ? "Comments"
                      : "Commits",
                  false,
                  { fontSize: 14 },
                )}
                <AppIcon
                  name="chevron-down"
                  size={12}
                  color={colors.textMuted}
                />
              </View>
            </MenuView>
            <View style={{ flex: 1 }} />
            {text(
              `${(timeline.data?.length || 0) - activity.length} hidden`,
              true,
              { fontSize: 12 },
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reverse activity order"
              onPress={() => setNewest((v) => !v)}
            >
              {text(newest ? "↓ Newest" : "↑ Oldest", true, { fontSize: 12 })}
            </Pressable>
          </View>
          {timeline.isPending
            ? skeleton()
            : timeline.error
              ? error(timeline.error)
              : ordered.map((event, index) => (
                  <View
                    key={event.node_id || `${event.id}:${index}`}
                    style={{ flexDirection: "row", gap: 10 }}
                  >
                    <View style={{ width: 28, alignItems: "center" }}>
                      <View
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: colors.surface,
                        }}
                      >
                        <AppIcon
                          name={
                            event.body
                              ? "chatbubble-outline"
                              : "git-commit-outline"
                          }
                          size={14}
                          color={colors.textMuted}
                        />
                      </View>
                      <View
                        style={{
                          width: 1,
                          flex: 1,
                          backgroundColor: colors.border,
                        }}
                      />
                    </View>
                    <View style={{ flex: 1, paddingBottom: 16 }}>
                      <View style={[styles.row, { minHeight: 34 }]}>
                        {(event.actor || event.user || event.author)
                          ?.avatar_url && (
                          <Image
                            source={{
                              uri: (event.actor || event.user || event.author)!
                                .avatar_url,
                            }}
                            style={styles.avatar}
                          />
                        )}
                        <Text
                          numberOfLines={event.body ? undefined : 1}
                          style={{
                            flex: 1,
                            fontFamily: "Geist",
                            fontSize: 14,
                            color: colors.text,
                          }}
                        >
                          {event.body
                            ? (event.actor || event.user || event.author)?.login
                            : event.message?.split("\n")[0] ||
                              `${event.actor?.login || event.user?.login || ""} ${event.event.replaceAll("_", " ")}`}
                        </Text>
                        {text(
                          (event.sha || event.commit_id || "").slice(0, 7),
                          true,
                          { fontFamily: "GeistMono", fontSize: 12 },
                        )}
                      </View>
                      {event.body && (
                        <NativeComment
                          {...markdownProps}
                          body={event.body}
                          login={
                            (event.actor || event.user || event.author)
                              ?.login || ""
                          }
                        />
                      )}
                    </View>
                  </View>
                ))}
          {pager(timeline.data?.length === 50)}
          <View style={[styles.composer, { borderTopColor: colors.border }]}>
            <CommentEditor
              label="Comment"
              value={body}
              onChangeText={setBody}
              {...markdownProps}
            />
            <View style={[styles.row, { justifyContent: "flex-end" }]}>
              {!pull &&
                iconButton(
                  pr.state === "open"
                    ? "checkmark-circle-outline"
                    : "refresh-outline",
                  pr.state === "open" ? "Close issue" : "Reopen issue",
                  () => change.mutate(),
                  change.isPending,
                )}
              {iconButton(
                "arrow-up",
                "Post comment",
                () => comment.mutate(),
                !body.trim() || comment.isPending,
              )}
            </View>
            {comment.error && error(comment.error)}
            {change.error && error(change.error)}
          </View>
        </>
      )}
      <Sheet
        visible={reviewOpen}
        onClose={() => setReviewOpen(false)}
        title="Request a review"
        subtitle={repo}
        colors={colors}
      >
        <View style={{ padding: 16, gap: 12 }}>
          <TextInput
            accessibilityLabel="GitHub reviewer usernames"
            placeholder="username, username"
            placeholderTextColor={colors.textMuted}
            value={reviewers}
            onChangeText={setReviewers}
            autoCapitalize="none"
            autoCorrect={false}
            style={[
              styles.input,
              { minHeight: 44, color: colors.text, borderColor: colors.border },
            ]}
          />
          {review.error && error(review.error)}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Request review"
            disabled={!reviewers.trim() || review.isPending}
            onPress={() => review.mutate()}
            style={{
              backgroundColor: colors.accent,
              borderRadius: 24,
              padding: 14,
              alignItems: "center",
            }}
          >
            <Text style={{ fontFamily: "GeistMedium", color: "#fff" }}>
              Request review
            </Text>
          </Pressable>
        </View>
      </Sheet>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },
  controlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 40,
  },
  text: { fontFamily: "Geist", fontSize: 14, lineHeight: 22 },
  mono: { fontFamily: "GeistMono", fontSize: 11, lineHeight: 17 },
  header: { gap: 12, paddingBottom: 16 },
  title: { fontFamily: "GeistSemiBold", fontSize: 20, lineHeight: 28 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatar: { width: 20, height: 20, borderRadius: 10 },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
  },
  tabs: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    minHeight: 48,
    marginHorizontal: -16,
    paddingHorizontal: 12,
  },
  stats: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    minHeight: 20,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 44,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  values: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    flex: 1,
  },
  description: { paddingTop: 12, minHeight: 120 },
  section: { marginTop: 20, borderTopWidth: StyleSheet.hairlineWidth },
  check: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 44,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  event: {
    paddingVertical: 16,
    gap: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  composer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    fontFamily: "Geist",
    fontSize: 14,
    lineHeight: 22,
    textAlignVertical: "top",
    minHeight: 100,
    padding: 12,
    borderWidth: 1,
    borderRadius: 6,
  },
  error: { padding: 12, marginVertical: 12, borderRadius: 4 },
  loading: { paddingTop: 14, minHeight: 360, gap: 12 },
  pager: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
  },
  diff: { borderBottomWidth: StyleSheet.hairlineWidth },
  fileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    minHeight: 48,
    paddingVertical: 12,
  },
});

function PullAttachment({
  url,
  caption,
  api,
  colors,
}: {
  url: string;
  caption: string;
  api: GitHubClient;
  colors: Palette;
}) {
  const [open, setOpen] = useState(false);
  const target = githubImagePath(url);
  const media = useQuery({
    queryKey: ["attachment", url],
    enabled: !!target,
    queryFn: async () => {
      const file = (await api.contents(
        target!.repo,
        target!.path,
        target!.ref,
      )) as Content;
      return `data:${mimeType(file.name)};base64,${file.content?.replace(/\s/g, "") || ""}`;
    },
    staleTime: Infinity,
  });
  const uri = media.data || url;
  const svg = /\.svg(?:[?#]|$)|^data:image\/svg/i.test(uri);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={caption || "Open attachment"}
        onPress={() => setOpen(true)}
        style={{ width: 172, gap: 8 }}
      >
        <View
          style={{
            height: 110,
            borderRadius: 16,
            backgroundColor: colors.surface,
            overflow: "hidden",
            justifyContent: "center",
          }}
        >
          {svg ? (
            <SvgUri uri={uri} width="100%" height="100%" />
          ) : (
            <Image
              source={{ uri }}
              resizeMode="contain"
              style={{ width: "100%", height: "100%" }}
            />
          )}
        </View>
        <Text
          numberOfLines={1}
          style={{ fontFamily: "Geist", fontSize: 12, color: colors.textMuted }}
        >
          {caption}
        </Text>
      </Pressable>
      <Modal visible={open} transparent onRequestClose={() => setOpen(false)}>
        <View
          style={{ flex: 1, backgroundColor: colors.canvas, paddingTop: 48 }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close attachment"
            onPress={() => setOpen(false)}
            style={{ padding: 16 }}
          >
            <AppIcon name="close" size={24} color={colors.text} />
          </Pressable>
          <ScrollView
            maximumZoomScale={5}
            minimumZoomScale={1}
            contentContainerStyle={{ flex: 1, justifyContent: "center" }}
          >
            {svg ? (
              <SvgUri uri={uri} width="100%" height="100%" />
            ) : (
              <Image
                source={{ uri }}
                resizeMode="contain"
                style={{ width: "100%", height: "100%" }}
              />
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}
