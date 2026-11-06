import { oauth } from "./oauth";
import { OAuthLogin } from "./OAuthLogin";
import { CommentEditor } from "./CommentEditor";
import { BackNavigation } from "./BackNavigation";
import { issueIcon } from "./IssueStatus";
import { MenuView } from "./Menu";
import type { MenuAction } from "@react-native-menu/menu";
import { Sheet } from "./Sheet";
import { NativeRepositoryCode } from "./RepositoryCode";
import { NativeProfileView } from "./ProfileView";
import { NativePullRequest } from "./PullRequestView";
import { useFonts } from "expo-font";
import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  PanResponder,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AppIcon } from "./AppIcon";
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createClient,
  tokenTransport,
  type GitHubClient,
  type Repository,
} from "@git-client/github";
import {
  T3_CODE_DARK_THEME_COLORS as dark,
  T3_CODE_LIGHT_THEME_COLORS as light,
} from "@git-client/theme";
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60000, retry: 1 } },
});
const Context = React.createContext<{
  api: GitHubClient;
  colors: typeof dark | typeof light;
}>({ api: createClient(tokenTransport("")), colors: dark });
const useApp = () => React.useContext(Context);
export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <Session />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
function Session() {
  const [fontsReady, fontError] = useFonts({
    Geist: require("@expo-google-fonts/geist/400Regular/Geist_400Regular.ttf"),
    GeistMedium: require("@expo-google-fonts/geist/500Medium/Geist_500Medium.ttf"),
    GeistSemiBold: require("@expo-google-fonts/geist/600SemiBold/Geist_600SemiBold.ttf"),
    GeistMono: require("@expo-google-fonts/geist-mono/400Regular/GeistMono_400Regular.ttf"),
  });
  const [authenticated, setAuthenticated] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"dark" | "light">("dark");
  const colors = mode === "dark" ? dark : light;
  const api = useMemo(
    () =>
      createClient(async (path, init) => {
        const token = await oauth.accessToken();
        if (!token) {
          queryClient.clear();
          setAuthenticated(false);
          return new Response(
            JSON.stringify({ message: "Sign in with GitHub to continue." }),
            { status: 401 },
          );
        }
        const response = await tokenTransport(token)(path, init);
        if (response.status === 401) {
          await oauth.invalidate(token);
          queryClient.clear();
          setAuthenticated(false);
        }
        return response;
      }),
    [],
  );
  useEffect(() => {
    let active = true;
    oauth
      .status()
      .then((s) => {
        if (active) setAuthenticated(s.authenticated);
      })
      .catch(() => {
        if (active) setError("Could not restore your GitHub session.");
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  async function logout() {
    try {
      await queryClient.cancelQueries();
      await oauth.logout();
      setAuthenticated(false);
      queryClient.clear();
    } catch {
      Alert.alert(
        "Could not sign out",
        "Secure storage could not be updated. Try again.",
      );
    }
  }
  return (
    <Context.Provider value={{ api, colors }}>
      <SafeAreaView style={[s.safe, { backgroundColor: colors.canvas }]}>
        <StatusBar style={mode === "dark" ? "light" : "dark"} />
        {!ready || !fontsReady ? (
          <ActivityIndicator style={{ flex: 1 }} color={colors.text} />
        ) : !authenticated ? (
          <ScrollView contentContainerStyle={s.login}>
            <AppIcon name="logo-github" size={44} color={colors.text} />
            <Txt style={s.loginTitle}>Git Client</Txt>

            <OAuthLogin
              colors={colors}
              onConnected={() => {
                setError("");
                setAuthenticated(true);
              }}
            />
            {!!error && (
              <Txt style={{ color: colors.errorForeground }}>{error}</Txt>
            )}
          </ScrollView>
        ) : (
          <Workspace
            logout={logout}
            toggleTheme={() => setMode(mode === "dark" ? "light" : "dark")}
          />
        )}
      </SafeAreaView>
    </Context.Provider>
  );
}
function Txt({
  children,
  muted = false,
  style,
}: {
  children: React.ReactNode;
  muted?: boolean;
  style?: any;
}) {
  const { colors } = useApp();
  return (
    <Text
      style={[
        {
          fontFamily: "Geist",
          color: muted ? colors.textMuted : colors.text,
          fontSize: 16,
          lineHeight: 23,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
function Btn({
  title,
  onPress,
  disabled = false,
  primary = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  const { colors } = useApp();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        {
          borderColor: colors.border,
          backgroundColor: primary ? colors.accent : colors.surface,
          opacity: disabled ? 0.64 : pressed ? 0.7 : 1,
        },
      ]}
    >
      {title.startsWith("Branch:") ? (
        <View style={{ flexDirection: "row", gap: 7, alignItems: "center" }}>
          <AppIcon name="git-branch-outline" size={17} color={colors.text} />
          <Txt>{title.slice(8)}</Txt>
        </View>
      ) : (
        <AppIcon
          name={buttonIcon(title)}
          size={18}
          color={primary ? colors.accentForeground : colors.text}
        />
      )}
    </Pressable>
  );
}
function Problem({ error }: { error: unknown }) {
  const { colors } = useApp();
  return (
    <View style={[s.problem, { backgroundColor: colors.errorSurface }]}>
      <Txt style={{ color: colors.errorForeground }}>
        {error instanceof Error ? error.message : String(error)}
      </Txt>
    </View>
  );
}
function Busy() {
  const { colors } = useApp();
  return <ActivityIndicator color={colors.textMuted} style={{ margin: 40 }} />;
}
function Row({
  icon,
  title,
  subtitle,
  onPress,
  right,
}: {
  icon: keyof typeof AppIcon.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  right?: string;
}) {
  const { colors } = useApp();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        s.row,
        {
          borderBottomColor: colors.border,
          backgroundColor: pressed ? colors.sidebarRowHover : "transparent",
        },
      ]}
    >
      <AppIcon name={icon} size={19} color={colors.iconMuted} />
      <View style={{ flex: 1, gap: 4 }}>
        <Txt style={{ fontWeight: "500" }}>{title}</Txt>
        {!!subtitle && (
          <Txt muted style={{ fontSize: 11, lineHeight: 17 }}>
            {subtitle}
          </Txt>
        )}
      </View>
      {right && (
        <Txt muted style={{ fontSize: 11 }}>
          {right}
        </Txt>
      )}
      <AppIcon name="chevron-forward" size={13} color={colors.iconMuted} />
    </Pressable>
  );
}
function Pages({
  page,
  setPage,
  next,
}: {
  page: number;
  setPage: (p: number) => void;
  next: boolean;
}) {
  return (
    <View style={s.pages}>
      <Btn
        title="Previous"
        disabled={page === 1}
        onPress={() => setPage(page - 1)}
      />
      <Txt muted>{page}</Txt>
      <Btn title="Next" disabled={!next} onPress={() => setPage(page + 1)} />
    </View>
  );
}
type Route =
  | { kind: "profile"; login: string }
  | { kind: "repo"; repo: Repository }
  | { kind: "issue"; repo: string; number: number; pull: boolean };
function Workspace({
  logout,
  toggleTheme,
}: {
  logout: () => void;
  toggleTheme: () => void;
}) {
  const { api, colors } = useApp();
  const client = useQueryClient();
  const viewer = useQuery({ queryKey: ["viewer"], queryFn: api.viewer });
  const [tab, setTab] = useState("repositories");
  const [routes, setRoutes] = useState<Route[]>([]);
  const [activityRequest, setActivityRequest] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectIssueRepo, setSelectIssueRepo] = useState(false);
  const [issueRepo, setIssueRepo] = useState<Repository | null>(null);
  const [issueRepoPage, setIssueRepoPage] = useState(1);
  const [state, setState] = useState("open");
  const backX = useRef(new Animated.Value(0)).current;
  const childBack = useRef<(() => boolean) | null>(null);
  const backContext = useMemo(
    () => ({
      register: (handler: () => boolean) => {
        childBack.current = handler;
        return () => {
          if (childBack.current === handler) childBack.current = null;
        };
      },
    }),
    [],
  );
  const back = () => {
    if (childBack.current?.()) return;
    if (routes.length) setRoutes((v) => v.slice(0, -1));
    else if (tab !== "repositories") setTab("repositories");
  };
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!routes.length && tab === "repositories") return false;
      back();
      return true;
    });
    return () => sub.remove();
  }, [routes.length, tab]);
  const backGesture = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          routes.length > 0 && g.x0 < 24 && g.dx > 18 && Math.abs(g.dy) < 20,
        onPanResponderMove: (_, g) => backX.setValue(Math.max(0, g.dx)),
        onPanResponderRelease: (_, g) => {
          if (g.dx > 72 || g.vx > 0.6) {
            Animated.timing(backX, {
              toValue: 420,
              duration: 120,
              useNativeDriver: true,
            }).start(() => {
              back();
              backX.setValue(0);
            });
          } else
            Animated.spring(backX, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
        },
        onPanResponderTerminate: () => backX.setValue(0),
      }),
    [routes.length, tab],
  );
  const route = routes.at(-1);
  const repos = useQuery({
    queryKey: ["repos", tab, page],
    queryFn: () =>
      tab === "starred" ? api.starred(page) : api.repositories(page),
    enabled: !!viewer.data && (tab === "repositories" || tab === "starred"),
  });
  const issueRepos = useQuery({
    queryKey: ["issue-create-repos", issueRepoPage],
    queryFn: () => api.repositories(issueRepoPage),
    enabled: selectIssueRepo,
  });
  const issues = useQuery({
    queryKey: ["issues", tab, state, page],
    queryFn: () =>
      api.issues(
        viewer.data!.login,
        tab === "pulls" ? "pr" : "issue",
        state,
        page,
      ),
    enabled: !!viewer.data && (tab === "pulls" || tab === "issues"),
  });
  const inbox = useQuery({
    queryKey: ["notifications", page],
    queryFn: () => api.notifications(page),
    enabled: !!viewer.data && tab === "inbox",
  });
  const open = (r: Route) => {
    if (r.kind === "issue") setActivityRequest(0);
    setRoutes((v) => [...v, r]);
  };
  const names: Record<string, string> = {
    repositories: "Repositories",
    starred: "Starred",
    pulls: "Pull requests",
    issues: "Issues",
    inbox: "Inbox",
    settings: "Settings",
  };
  return (
    <BackNavigation.Provider value={backContext}>
      <Animated.View
        style={{ flex: 1, transform: [{ translateX: backX }] }}
        {...backGesture.panHandlers}
      >
        <View
          style={[
            s.header,
            { borderBottomColor: colors.border },
            route?.kind === "issue" && {
              height: 72,
              backgroundColor: colors.surface,
              borderBottomWidth: 0,
            },
          ]}
        >
          {route ? (
            <Pressable accessibilityLabel="Back" onPress={back}>
              <AppIcon
                name={route.kind === "issue" ? "arrow-back" : "chevron-back"}
                size={22}
                color={colors.text}
              />
            </Pressable>
          ) : (
            <AppIcon name="logo-github" size={23} color={colors.text} />
          )}
          <TextInput
            accessibilityLabel="Search current view"
            value={search}
            onChangeText={setSearch}
            placeholder="Search"
            placeholderTextColor={colors.placeholder}
            style={[
              s.input,
              {
                flex: 1,
                height: 36,
                paddingVertical: 0,
                borderColor: colors.input,
                color: colors.text,
                backgroundColor: colors.surface,
              },
            ]}
          />
          {route?.kind === "issue" ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Activity"
                onPress={() => setActivityRequest((v) => v + 1)}
                style={{ padding: 8 }}
              >
                <AppIcon
                  name="chatbubble-outline"
                  size={22}
                  color={colors.text}
                />
              </Pressable>
              <MenuView
                themeVariant={colors.canvas === "#fcfcfc" ? "light" : "dark"}
                actions={[
                  { id: "refresh", title: "Refresh" },
                  { id: "github", title: "Open on GitHub" },
                  { id: "settings", title: "Settings" },
                ]}
                onPressAction={({ nativeEvent: { event } }) => {
                  if (event === "refresh") client.invalidateQueries();
                  else if (event === "github")
                    Linking.openURL(
                      `https://github.com/${route.repo}/${route.pull ? "pull" : "issues"}/${route.number}`,
                    );
                  else {
                    setRoutes([]);
                    setTab("settings");
                  }
                }}
              >
                <View
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel="Pull request actions"
                  style={{ padding: 8 }}
                >
                  <AppIcon
                    name="ellipsis-horizontal"
                    size={22}
                    color={colors.text}
                  />
                </View>
              </MenuView>
            </>
          ) : (
            <>
              <Pressable
                accessibilityLabel="Refresh"
                onPress={() => client.invalidateQueries()}
              >
                <AppIcon
                  name="refresh-outline"
                  size={20}
                  color={colors.iconMuted}
                />
              </Pressable>
              <Pressable
                accessibilityLabel="Your profile"
                onPress={() => {
                  if (viewer.data)
                    open({ kind: "profile", login: viewer.data.login });
                }}
              >
                {viewer.data ? (
                  <Image
                    source={{ uri: viewer.data.avatar_url }}
                    style={s.avatar}
                  />
                ) : (
                  <AppIcon
                    name="settings-outline"
                    size={20}
                    color={colors.iconMuted}
                  />
                )}
              </Pressable>
              <Pressable
                accessibilityLabel="Settings"
                onPress={() => {
                  setRoutes([]);
                  setTab("settings");
                }}
              >
                <AppIcon
                  name="settings-outline"
                  size={19}
                  color={colors.iconMuted}
                />
              </Pressable>
            </>
          )}
        </View>
        {viewer.isPending ? (
          <Busy />
        ) : viewer.error ? (
          <Problem error={viewer.error} />
        ) : route ? (
          route.kind === "profile" ? (
            <NativeProfileView
              key={route.login}
              login={route.login}
              search={search}
              api={api}
              colors={colors}
              onProfile={(login) => open({ kind: "profile", login })}
              onRepository={(repo) => open({ kind: "repo", repo })}
            />
          ) : route.kind === "repo" ? (
            <NativeRepository
              key={route.repo.id}
              repo={route.repo}
              search={search}
              open={open}
            />
          ) : (
            <NativePullRequest
              activityRequest={activityRequest}
              key={`${route.repo}/${route.number}`}
              repo={route.repo}
              number={route.number}
              pull={route.pull}
              api={api}
              colors={colors}
              onProfile={(login) => open({ kind: "profile", login })}
            />
          )
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={s.content}
            keyboardShouldPersistTaps="handled"
          >
            {tab === "settings" ? (
              <>
                <View style={s.profile}>
                  <Image
                    source={{ uri: viewer.data!.avatar_url }}
                    style={{ width: 48, height: 48, borderRadius: 24 }}
                  />
                  <View>
                    <Txt>{viewer.data!.name || viewer.data!.login}</Txt>
                    <Txt muted>@{viewer.data!.login}</Txt>
                  </View>
                </View>
                <Btn title="Change appearance" onPress={toggleTheme} />
                <Btn
                  title="Open GitHub profile"
                  onPress={() => Linking.openURL(viewer.data!.html_url)}
                />
                <Txt muted>
                  Credentials are stored in your device’s secure storage.
                </Txt>
                <Btn
                  title="Sign out"
                  onPress={() =>
                    Alert.alert(
                      "Sign out?",
                      "Sign out of GitHub on this device?",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Sign out",
                          style: "destructive",
                          onPress: logout,
                        },
                      ],
                    )
                  }
                />
              </>
            ) : (
              <>
                {(tab === "issues" || tab === "pulls") && (
                  <View style={s.chips}>
                    {["open", "closed"].map((x) => (
                      <Btn
                        key={x}
                        title={x}
                        onPress={() => {
                          setState(x);
                          setPage(1);
                        }}
                        primary={state === x}
                      />
                    ))}
                  </View>
                )}
                {tab === "repositories" || tab === "starred" ? (
                  repos.isPending ? (
                    <Busy />
                  ) : repos.error ? (
                    <Problem error={repos.error} />
                  ) : (
                    <>
                      {repos.data
                        ?.filter((r) =>
                          `${r.full_name} ${r.description}`
                            .toLowerCase()
                            .includes(search.toLowerCase()),
                        )
                        .map((r) => (
                          <Row
                            key={r.id}
                            icon={
                              r.private ? "lock-closed-outline" : "book-outline"
                            }
                            title={r.name}
                            subtitle={`${r.owner.login}${r.description ? " · " + r.description : ""}\n${r.language || "Code"} · ${r.stargazers_count} stars`}
                            onPress={() => open({ kind: "repo", repo: r })}
                          />
                        ))}
                      {!repos.data?.length && (
                        <Txt muted>No repositories found.</Txt>
                      )}
                      <Pages
                        page={page}
                        setPage={setPage}
                        next={repos.data?.length === 50}
                      />
                    </>
                  )
                ) : tab === "inbox" ? (
                  inbox.isPending ? (
                    <Busy />
                  ) : inbox.error ? (
                    <Problem error={inbox.error} />
                  ) : (
                    <>
                      {inbox.data
                        ?.filter((n) =>
                          n.subject.title
                            .toLowerCase()
                            .includes(search.toLowerCase()),
                        )
                        .map((n) => (
                          <View key={n.id}>
                            <Row
                              icon="notifications-outline"
                              title={n.subject.title}
                              subtitle={`${n.repository.full_name} · ${n.reason}`}
                              onPress={() => {
                                const m = n.subject.url?.match(
                                  /\/repos\/([^/]+\/[^/]+)\/(issues|pulls)\/(\d+)/,
                                );
                                if (m)
                                  open({
                                    kind: "issue",
                                    repo: m[1],
                                    number: Number(m[3]),
                                    pull: m[2] === "pulls",
                                  });
                                else Linking.openURL(n.repository.html_url);
                              }}
                            />
                            <Btn
                              title="Mark read"
                              onPress={async () => {
                                try {
                                  await api.markRead(n.id);
                                  client.invalidateQueries({
                                    queryKey: ["notifications"],
                                  });
                                } catch (e) {
                                  Alert.alert(
                                    "Could not mark read",
                                    e instanceof Error
                                      ? e.message
                                      : "Try again",
                                  );
                                }
                              }}
                            />
                          </View>
                        ))}
                      {!inbox.data?.length && (
                        <Txt muted>You’re all caught up.</Txt>
                      )}
                      <Pages
                        page={page}
                        setPage={setPage}
                        next={inbox.data?.length === 50}
                      />
                    </>
                  )
                ) : issues.isPending ? (
                  <Busy />
                ) : issues.error ? (
                  <Problem error={issues.error} />
                ) : (
                  <>
                    {issues.data?.items
                      .filter((i) =>
                        i.title.toLowerCase().includes(search.toLowerCase()),
                      )
                      .map((i) => (
                        <Row
                          key={i.id}
                          icon={issueIcon(i)}
                          title={i.title}
                          subtitle={`#${i.number} · ${i.user.login} · ${i.state}`}
                          onPress={() =>
                            open({
                              kind: "issue",
                              repo: i.repository_url.split("/repos/")[1],
                              number: i.number,
                              pull: !!i.pull_request,
                            })
                          }
                        />
                      ))}
                    {!issues.data?.items.length && (
                      <View style={{ gap: 12 }}>
                        <Txt muted>No matching conversations.</Txt>
                        {tab === "issues" && (
                          <Btn
                            title="New issue"
                            onPress={() => {
                              setIssueRepoPage(1);
                              setSelectIssueRepo(true);
                            }}
                          />
                        )}
                      </View>
                    )}
                    <Pages
                      page={page}
                      setPage={setPage}
                      next={(issues.data?.total_count || 0) > page * 50}
                    />
                  </>
                )}
              </>
            )}
          </ScrollView>
        )}
        <Sheet
          visible={selectIssueRepo}
          onClose={() => {
            setSelectIssueRepo(false);
            setIssueRepo(null);
          }}
          title={issueRepo ? "New issue" : "Choose a repository"}
          subtitle={issueRepo?.full_name}
          colors={colors}
        >
          {issueRepo ? (
            <Composer
              embedded
              visible
              repo={issueRepo.full_name}
              onClose={() => {
                setSelectIssueRepo(false);
                setIssueRepo(null);
              }}
              onCreated={(number) => {
                const repo = issueRepo.full_name;
                setSelectIssueRepo(false);
                setIssueRepo(null);
                client.invalidateQueries({ queryKey: ["issues"] });
                client.invalidateQueries({ queryKey: ["repoIssues", repo] });
                open({ kind: "issue", repo, number, pull: false });
              }}
            />
          ) : (
            <ScrollView contentContainerStyle={s.content}>
              {issueRepos.isPending ? (
                <Busy />
              ) : issueRepos.error ? (
                <Problem error={issueRepos.error} />
              ) : (
                <>
                  {issueRepos.data
                    ?.filter(
                      (repo) =>
                        repo.permissions?.push ||
                        repo.permissions?.admin ||
                        repo.permissions?.maintain,
                    )
                    .map((repo) => (
                      <Row
                        key={repo.id}
                        icon="book-outline"
                        title={repo.name}
                        subtitle={repo.full_name}
                        onPress={() => {
                          setIssueRepo(repo);
                        }}
                      />
                    ))}
                  {!issueRepos.data?.some(
                    (repo) =>
                      repo.permissions?.push ||
                      repo.permissions?.admin ||
                      repo.permissions?.maintain,
                  ) && <Txt muted>No writable repositories on this page.</Txt>}
                  <Pages
                    page={issueRepoPage}
                    setPage={setIssueRepoPage}
                    next={issueRepos.data?.length === 50}
                  />
                </>
              )}
            </ScrollView>
          )}
        </Sheet>
        <View
          style={[
            s.tabbar,
            {
              backgroundColor: colors.sidebar,
              borderTopColor: colors.sidebarBorder,
            },
          ]}
        >
          {[
            ["repositories", "book-outline"],
            ["pulls", "git-pull-request-outline"],
            ["issues", "ellipse-outline"],
            ["starred", "star-outline"],
            ["inbox", "notifications-outline"],
          ].map(([id, icon]) => (
            <Pressable
              accessibilityRole="tab"
              accessibilityLabel={names[id]}
              accessibilityState={{ selected: tab === id && !route }}
              key={id}
              onPress={() => {
                setTab(id);
                setRoutes([]);
                setPage(1);
                setSearch("");
              }}
              style={s.tab}
            >
              <AppIcon
                name={icon as any}
                size={21}
                color={tab === id && !route ? colors.text : colors.iconMuted}
              />
            </Pressable>
          ))}
        </View>
      </Animated.View>
    </BackNavigation.Provider>
  );
}
function NativeRepository({
  repo,
  search,
  open,
}: {
  repo: Repository;
  search: string;
  open: (route: Route) => void;
}) {
  const { api, colors } = useApp();
  const client = useQueryClient();
  const [tab, setTab] = useState("code");
  const [branch, setBranch] = useState(repo.default_branch);
  const [page, setPage] = useState(1);
  const [pickBranch, setPickBranch] = useState(false);
  const [branchSearch, setBranchSearch] = useState("");
  const [create, setCreate] = useState(false);
  const [state, setState] = useState("open");
  const branches = useQuery({
    queryKey: ["branches", repo.full_name],
    queryFn: async () => {
      const all: { name: string }[] = [];
      for (let p = 1; ; p++) {
        const batch = await api.branches(repo.full_name, p);
        all.push(...batch);
        if (batch.length < 100) return all;
      }
    },
  });
  const star = useQuery({
    queryKey: ["star", repo.full_name],
    queryFn: () => api.isStarred(repo.full_name),
  });
  const toggleStar = useMutation({
    mutationFn: () => api.star(repo.full_name, !star.data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["star", repo.full_name] });
      client.invalidateQueries({ queryKey: ["repos", "starred"] });
    },
  });
  const issues = useQuery({
    queryKey: ["repoIssues", repo.full_name, tab, state, page],
    queryFn: () =>
      api.repoIssues(
        repo.full_name,
        tab === "pulls" ? "pulls" : "issues",
        state,
        page,
      ),
    enabled: tab === "issues" || tab === "pulls",
  });
  const commits = useQuery({
    queryKey: ["commits", repo.full_name, branch, page],
    queryFn: () => api.commits(repo.full_name, branch, page),
    enabled: tab === "commits",
  });

  return (
    <>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.content}>
        <View style={s.repoToolbar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Branch: ${branch}`}
            onPress={() => setPickBranch(true)}
            style={s.repoBranch}
          >
            <AppIcon
              name="git-branch-outline"
              size={16}
              color={colors.textMuted}
            />
            <Text
              numberOfLines={1}
              style={[s.repoBranchText, { color: colors.text }]}
            >
              {branch}
            </Text>
            <AppIcon name="chevron-down" size={11} color={colors.textMuted} />
          </Pressable>
          {(
            [
              ["code", "code-slash-outline", "Code"],
              ["issues", "ellipse-outline", "Issues"],
              ["pulls", "git-pull-request-outline", "Pull requests"],
              ["commits", "git-commit-outline", "Commits"],
            ] as const
          ).map(([id, icon, label]) => (
            <Pressable
              key={id}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: tab === id }}
              onPress={() => {
                setTab(id);
                setPage(1);
              }}
              style={[
                s.repoTab,
                tab === id && { backgroundColor: colors.surface },
              ]}
            >
              <AppIcon
                name={icon}
                size={18}
                color={tab === id ? colors.text : colors.iconMuted}
              />
            </Pressable>
          ))}
          <MenuView
            themeVariant={colors.canvas === "#fcfcfc" ? "light" : "dark"}
            isAnchoredToRight
            actions={(
              [
                {
                  id: "star",
                  title: star.data ? "Unstar" : "Star",
                  image:
                    Platform.OS === "ios"
                      ? star.data
                        ? "star.fill"
                        : "star"
                      : "btn_star",
                  attributes: {
                    disabled:
                      toggleStar.isPending || star.isPending || star.isError,
                  },
                },
                {
                  id: "github",
                  title: "Open on GitHub",
                  image: Platform.OS === "ios" ? "safari" : "ic_menu_view",
                },
                ...(tab === "issues"
                  ? [
                      {
                        id: "create",
                        title: "New issue",
                        image: Platform.OS === "ios" ? "plus" : "ic_menu_add",
                      },
                    ]
                  : []),
                ...(tab === "issues" || tab === "pulls"
                  ? ["open", "closed"].map((id) => ({
                      id,
                      title: id === "open" ? "Open" : "Closed",
                      state: state === id ? "on" : "off",
                    }))
                  : []),
              ] as MenuAction[]
            ).map((action) => ({
              ...action,
              titleColor: colors.text,
              imageColor: colors.text,
            }))}
            onPressAction={({ nativeEvent: { event } }) => {
              if (event === "star") toggleStar.mutate();
              else if (event === "github") Linking.openURL(repo.html_url);
              else if (event === "create") setCreate(true);
              else if (event === "open" || event === "closed") {
                setState(event);
                setPage(1);
              }
            }}
          >
            <View
              accessible
              accessibilityRole="button"
              accessibilityLabel="Repository actions"
              style={s.repoTab}
            >
              <AppIcon
                name="ellipsis-horizontal"
                size={20}
                color={colors.textMuted}
              />
            </View>
          </MenuView>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View ${repo.owner.login}'s profile`}
          onPress={() => open({ kind: "profile", login: repo.owner.login })}
        >
          <Txt muted>{repo.full_name}</Txt>
        </Pressable>
        {!!repo.description && (
          <Txt style={{ fontSize: 13, lineHeight: 21 }}>{repo.description}</Txt>
        )}
        {toggleStar.error && <Problem error={toggleStar.error} />}
        {tab === "code" ? (
          <NativeRepositoryCode
            key={branch}
            repo={repo}
            branch={branch}
            api={api}
            colors={colors}
          />
        ) : tab === "commits" ? (
          commits.isPending ? (
            <Busy />
          ) : commits.error ? (
            <Problem error={commits.error} />
          ) : (
            <>
              {commits.data?.map((c) => (
                <Row
                  key={c.sha}
                  icon="git-commit-outline"
                  title={c.commit.message.split("\n")[0]}
                  subtitle={c.commit.author.name}
                  right={c.sha.slice(0, 7)}
                  onPress={() => Linking.openURL(c.html_url)}
                />
              ))}
              <Pages
                page={page}
                setPage={setPage}
                next={commits.data?.length === 50}
              />
            </>
          )
        ) : issues.isPending ? (
          <Busy />
        ) : issues.error ? (
          <Problem error={issues.error} />
        ) : (
          <>
            {issues.data
              ?.filter(
                (i) =>
                  (tab === "pulls" || !i.pull_request) &&
                  i.title.toLowerCase().includes(search.toLowerCase()),
              )
              .map((i) => (
                <Row
                  key={i.id}
                  icon={issueIcon(i, tab === "pulls")}
                  title={i.title}
                  subtitle={`#${i.number} · ${i.user.login}`}
                  onPress={() =>
                    open({
                      kind: "issue",
                      repo: repo.full_name,
                      number: i.number,
                      pull: tab === "pulls",
                    })
                  }
                />
              ))}
            {!issues.data?.filter((i) => tab === "pulls" || !i.pull_request)
              .length && (
              <View style={{ gap: 12 }}>
                <Txt muted>
                  {tab === "issues"
                    ? "No issues here."
                    : "No pull requests here."}
                </Txt>
                {tab === "issues" && (
                  <Btn title="New issue" onPress={() => setCreate(true)} />
                )}
              </View>
            )}
            <Pages
              page={page}
              setPage={setPage}
              next={issues.data?.length === 50}
            />
          </>
        )}
      </ScrollView>
      <Sheet
        visible={pickBranch}
        onClose={() => setPickBranch(false)}
        title="Branches"
        subtitle={repo.full_name}
        colors={colors}
      >
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16 }}>
          <TextInput
            accessibilityLabel="Search branches"
            placeholder="Search branches…"
            placeholderTextColor={colors.placeholder}
            value={branchSearch}
            onChangeText={setBranchSearch}
            autoCapitalize="none"
            autoCorrect={false}
            style={[
              s.input,
              {
                color: colors.text,
                borderColor: colors.input,
                marginBottom: 12,
              },
            ]}
          />
          {branches.isPending && <Busy />}
          {branches.error && <Problem error={branches.error} />}{" "}
          {branches.data
            ?.filter((b) =>
              b.name.toLowerCase().includes(branchSearch.toLowerCase()),
            )
            .map((b) => (
              <Row
                icon="git-branch-outline"
                title={b.name}
                right={branch === b.name ? "✓" : undefined}
                key={b.name}
                onPress={() => {
                  setBranch(b.name);
                  setPage(1);
                  setPickBranch(false);
                }}
              />
            ))}
        </ScrollView>
      </Sheet>
      <Composer
        visible={create}
        repo={repo.full_name}
        onClose={() => setCreate(false)}
        onCreated={(n) => {
          setCreate(false);
          client.invalidateQueries({
            queryKey: ["repoIssues", repo.full_name],
          });
          open({ kind: "issue", repo: repo.full_name, number: n, pull: false });
        }}
      />
    </>
  );
}
function Composer({
  visible,
  repo,
  onClose,
  onCreated,
  embedded = false,
}: {
  embedded?: boolean;
  visible: boolean;
  repo: string;
  onClose: () => void;
  onCreated: (n: number) => void;
}) {
  const { api, colors } = useApp();
  const [heading, setHeading] = useState("");
  const [body, setBody] = useState("");
  const mutation = useMutation({
    mutationFn: () => api.createIssue(repo, heading, body),
    onSuccess: (i) => {
      setHeading("");
      setBody("");
      onCreated(i.number);
    },
  });
  const content = (
    <ScrollView
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
    >
      <Txt>Title</Txt>
      <TextInput
        accessibilityLabel="Issue title"
        value={heading}
        onChangeText={setHeading}
        style={[s.input, { color: colors.text, borderColor: colors.input }]}
      />
      <Txt>Description</Txt>
      <CommentEditor
        label="Issue description"
        value={body}
        onChangeText={setBody}
        api={api}
        repo={repo}
        branch="HEAD"
        colors={colors}
      />
      {mutation.error && <Problem error={mutation.error} />}
      <Btn
        title={mutation.isPending ? "Creating…" : "Create issue"}
        primary
        disabled={!heading.trim() || mutation.isPending}
        onPress={() => mutation.mutate()}
      />
    </ScrollView>
  );
  return embedded ? (
    content
  ) : (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="New issue"
      subtitle={repo}
      colors={colors}
    >
      {content}
    </Sheet>
  );
}
const s = StyleSheet.create({
  repoToolbar: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  repoBranch: {
    minWidth: 50,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    height: 44,
    paddingRight: 6,
  },
  repoBranchText: { fontFamily: "GeistMono", fontSize: 11, flexShrink: 1 },
  repoTab: {
    height: 44,
    width: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 7,
  },
  safe: { flex: 1 },
  header: {
    height: 52,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatar: { width: 25, height: 25, borderRadius: 13 },
  content: { padding: 20, gap: 13, paddingBottom: 40 },
  eyebrow: { fontSize: 11, letterSpacing: 1.3, marginTop: 8 },
  heading: {
    fontFamily: "GeistSemiBold",
    fontSize: 26,
    fontWeight: "600",
    lineHeight: 32,
    letterSpacing: -0.6,
    marginBottom: 8,
  },
  login: { padding: 28, paddingTop: 65, gap: 16 },
  loginTitle: {
    fontFamily: "GeistSemiBold",
    fontSize: 30,
    fontWeight: "600",
    lineHeight: 36,
    letterSpacing: -0.7,
    marginTop: 20,
  },
  input: {
    fontFamily: "Geist",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  button: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 13,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 17,
    borderBottomWidth: 1,
  },
  tabbar: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingTop: 10,
    paddingBottom: 5,
  },
  tab: { flex: 1, alignItems: "center", gap: 4, paddingVertical: 4 },
  pages: {
    flexDirection: "row",
    gap: 15,
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 15,
  },
  chips: { flexDirection: "row", gap: 8, marginVertical: 5 },
  profile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginVertical: 20,
  },
  problem: { margin: 14, padding: 17, borderRadius: 8 },
  source: {
    fontFamily: "GeistMono",
    fontSize: 11,
    lineHeight: 19,
    padding: 13,
  },
  sectionTitle: { fontSize: 15, fontWeight: "500", marginTop: 20 },
  conversation: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    gap: 12,
    marginTop: 10,
  },
  commentAuthor: { flexDirection: "row", alignItems: "center", gap: 9 },
});

function buttonIcon(title: string): keyof typeof AppIcon.glyphMap {
  const t = title.toLowerCase();
  if (t.includes("previous")) return "chevron-back";
  if (t.includes("next")) return "chevron-forward";
  if (t.includes("cancel")) return "close";
  if (t.includes("star")) return t === "starred" ? "star" : "star-outline";
  if (t.includes("github") || t.includes("file on")) return "open-outline";
  if (t.includes("appearance")) return "contrast-outline";
  if (t.includes("sign out")) return "log-out-outline";
  if (t.includes("pull")) return "git-pull-request-outline";
  if (t === "code") return "code-slash-outline";
  if (t === "issues") return "ellipse-outline";
  if (t === "commits") return "git-commit-outline";
  if (t === "open") return "ellipse-outline";
  if (t === "closed" || t.includes("close issue"))
    return "checkmark-circle-outline";
  if (t.includes("reopen")) return "refresh-outline";
  if (t.includes("new issue") || t.includes("create issue"))
    return "add-outline";
  if (t.includes("comment") || t.includes("conversation"))
    return "chatbubble-outline";
  if (t.includes("files changed")) return "git-compare-outline";
  if (t.includes("mark read")) return "checkmark-done-outline";
  if (t.includes("token")) return "key-outline";
  return "arrow-forward";
}
