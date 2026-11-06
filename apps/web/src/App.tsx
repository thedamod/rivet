import { useAppHistory } from "./useAppHistory";
import { IssueGlyph } from "./ui/status";
import { CommandPalette } from "./ui/primitives";
import { Button } from "./ui/primitives";
import { ProfileView } from "./ProfileView";
import { ProfileNavigation } from "./navigation";
import { useEffect, useState, useDeferredValue } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Github as GithubLogo,
  BookOpen,
  Star,
  GitPullRequestArrow as GitPullRequest,
  CircleDot as Circle,
  Bell,
  Search as MagnifyingGlass,
  Settings as GearSix,
  Plus,
  RefreshCw as ArrowClockwise,
  Command,
  Sun,
  Moon,
  X,
  Menu as List,
  GitBranch,
  Code2 as Code,
  ArrowLeft,
  ExternalLink as ArrowSquareOut,
} from "lucide-react";
import type { Repository, Issue } from "@git-client/github";
import { api, openExternal } from "./api";
import { Empty, ErrorBox, Loading, Pager, Time } from "./components";
import { RepositoryView } from "./RepositoryView";
import { IssueDetail } from "./PullRequestView";
type View =
  | "repositories"
  | "starred"
  | "pulls"
  | "issues"
  | "notifications"
  | "settings";
const navigation = [
  ["repositories", "Repositories", BookOpen],
  ["pulls", "Pull requests", GitPullRequest],
  ["issues", "Issues", Circle],
  ["starred", "Starred", Star],
  ["notifications", "Inbox", Bell],
] as const;
export function App() {
  const client = useQueryClient();
  const viewer = useQuery({ queryKey: ["viewer"], queryFn: api.viewer });
  const [profile, setProfile] = useState<string | null>(null);
  const [view, setView] = useState<View>("repositories");
  const [repo, setRepo] = useState<Repository | null>(null);
  const [issue, setIssue] = useState<{
    repo: string;
    number: number;
    pull: boolean;
    initial?: Issue;
  } | null>(null);
  const goBack = useAppHistory({ profile, view, repo, issue }, (r) => {
    setProfile(r.profile);
    setView(r.view as View);
    setRepo(r.repo);
    setIssue(r.issue);
  });
  const [search, setSearch] = useState("");
  const deferred = useDeferredValue(search);
  const [page, setPage] = useState(1);
  const [state, setState] = useState("open");

  const [palette, setPalette] = useState(false);
  const [command, setCommand] = useState("");
  const [theme, setTheme] = useState(
    () => localStorage.getItem("git-client-theme") || "dark",
  );
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("git-client-theme", theme);
  }, [theme]);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPalette((v) => !v);
      }
      if (e.key === "Escape") {
        setPalette(false);
      }
    }
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);
  function navigate(next: View) {
    setProfile(null);
    setView(next);
    setRepo(null);
    setIssue(null);
    setPage(1);
    setSearch("");
  }
  const repositories = useQuery({
    queryKey: ["repositories", view, page, deferred],
    queryFn: () =>
      view === "starred"
        ? api.starred(page)
        : deferred.trim()
          ? api
              .searchRepos(`${deferred} user:${viewer.data!.login}`, page)
              .then((r) => r.items)
          : api.repositories(page),
    enabled: !!viewer.data && (view === "repositories" || view === "starred"),
  });
  const personal = useQuery({
    queryKey: ["personal", view, state, page, viewer.data?.login],
    queryFn: () =>
      api.issues(
        viewer.data!.login,
        view === "pulls" ? "pr" : "issue",
        state,
        page,
      ),
    enabled: !!viewer.data && (view === "pulls" || view === "issues"),
  });
  const notifications = useQuery({
    queryKey: ["notifications", page],
    queryFn: () => api.notifications(page),
    enabled: !!viewer.data && view === "notifications",
  });
  const jumpRepos = useQuery({
    queryKey: ["jump-repos"],
    queryFn: () => api.repositories(),
    enabled: !!viewer.data,
  });
  const title = navigation.find((n) => n[0] === view)?.[1] || "Settings";
  const shownRepos = repositories.data?.filter(
    (r) =>
      view !== "starred" ||
      `${r.full_name} ${r.description}`
        .toLowerCase()
        .includes(deferred.toLowerCase()),
  );
  return (
    <ProfileNavigation.Provider value={setProfile}>
      <div className="app-shell">
        <main className="main">
          <header className="topbar">
            <Button
              className="icon home-icon"
              aria-label="Home"
              title="Home"
              onClick={() => navigate("repositories")}
            >
              <GithubLogo size={23} />
            </Button>
            <nav className="top-navigation" aria-label="Primary navigation">
              {navigation.map(([key, label, Icon]) => (
                <Button
                  key={key}
                  className={`icon ${view === key && !repo ? "active" : ""}`}
                  title={label}
                  aria-label={label}
                  aria-current={view === key && !repo ? "page" : undefined}
                  onClick={() => navigate(key)}
                >
                  <Icon size={16} />
                </Button>
              ))}
            </nav>
            {repo && <span className="top-repo-name">{repo.full_name}</span>}
            <div className="top-actions">
              <Button
                className="icon"
                title="Search (⌘ K)"
                aria-label="Search"
                onClick={() => setPalette(true)}
              >
                <MagnifyingGlass size={16} />
              </Button>
              <Button
                className="icon"
                title="Refresh"
                aria-label="Refresh"
                onClick={() => client.invalidateQueries()}
              >
                <ArrowClockwise size={16} />
              </Button>
              <Button
                className="icon"
                title="Appearance"
                aria-label="Toggle theme"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </Button>
              <Button
                className="icon"
                title="Profile"
                aria-label="Profile"
                onClick={() => viewer.data && setProfile(viewer.data.login)}
              >
                {viewer.data ? (
                  <img
                    className="nav-avatar"
                    src={viewer.data.avatar_url}
                    alt=""
                  />
                ) : (
                  <GearSix size={16} />
                )}
              </Button>
              <Button
                className="icon"
                aria-label="Settings"
                title="Settings"
                onClick={() => navigate("settings")}
              >
                <GearSix size={16} />
              </Button>
            </div>
          </header>
          {viewer.isPending ? (
            <Loading />
          ) : viewer.error ? (
            <ErrorBox error={viewer.error} retry={() => viewer.refetch()} />
          ) : profile ? (
            <ProfileView
              key={profile}
              login={profile}
              onBack={goBack}
              onRepository={(r) => {
                setProfile(null);
                setIssue(null);
                setRepo(r);
              }}
            />
          ) : issue ? (
            <IssueDetail
              key={`${issue.repo}/${issue.number}`}
              {...issue}
              onBack={goBack}
            />
          ) : repo ? (
            <RepositoryView
              key={repo.id}
              repo={repo}
              onBack={goBack}
              onIssue={(number, pull) =>
                setIssue({ repo: repo.full_name, number, pull })
              }
            />
          ) : view === "settings" ? (
            <div className="page settings">
              <h1>Settings</h1>

              <section>
                <h2>GitHub account</h2>
                <div className="account-detail">
                  <img src={viewer.data!.avatar_url} alt="" />
                  <div>
                    <strong>{viewer.data!.name || viewer.data!.login}</strong>
                    <p>@{viewer.data!.login}</p>
                  </div>
                  <span className="badge green">Connected</span>
                </div>
                <p>
                  Desktop uses your local GitHub CLI session. To switch
                  accounts, run <code>gh auth switch</code>, then restart Git
                  Client. Tokens stay in the main process.
                </p>
                <Button onClick={() => openExternal(viewer.data!.html_url)}>
                  Open GitHub profile <ArrowSquareOut />
                </Button>
              </section>
              <section>
                <h2>Appearance</h2>
                <div className="segmented">
                  {["dark", "light"].map((t) => (
                    <Button
                      key={t}
                      className={theme === t ? "active" : ""}
                      onClick={() => setTheme(t)}
                    >
                      {t === "dark" ? <Moon /> : <Sun />}
                      {t === "dark" ? "Dark" : "Light"}
                    </Button>
                  ))}
                </div>
              </section>
              <section>
                <h2>Keyboard shortcuts</h2>
                <p>
                  <kbd>⌘ / Ctrl K</kbd> Open command menu
                </p>
                <p>
                  <kbd>Esc</kbd> Close command menu
                </p>
              </section>
            </div>
          ) : (
            <div className="page">
              <div className="list-toolbar">
                <div className="input-icon">
                  <MagnifyingGlass size={16} />
                  <input
                    aria-label={`Filter ${title}`}
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder={`Find ${title.toLowerCase()}…`}
                  />
                  {search && (
                    <Button
                      className="icon"
                      aria-label="Clear filter"
                      onClick={() => setSearch("")}
                    >
                      <X size={13} />
                    </Button>
                  )}
                </div>
                {view === "issues" || view === "pulls" ? (
                  <div className="segmented">
                    {["open", "closed"].map((s) => (
                      <Button
                        key={s}
                        className={state === s ? "active" : ""}
                        onClick={() => {
                          setState(s);
                          setPage(1);
                        }}
                      >
                        {s === "open" ? "Open" : "Closed"}
                      </Button>
                    ))}
                  </div>
                ) : null}
              </div>
              {view === "repositories" || view === "starred" ? (
                <>
                  {repositories.isPending ? (
                    <Loading />
                  ) : repositories.error ? (
                    <ErrorBox
                      error={repositories.error}
                      retry={() => repositories.refetch()}
                    />
                  ) : (
                    <>
                      <div className="table-heading">
                        <span>Repository</span>
                        <span>Updated</span>
                      </div>
                      <div className="repo-list">
                        {shownRepos?.map((r) => (
                          <Button
                            key={r.id}
                            className="repo-row"
                            onClick={() => setRepo(r)}
                          >
                            <BookOpen size={16} />
                            <div className="repo-row-main">
                              <div className="repo-title">
                                <span className="muted">
                                  {r.owner.login} /{" "}
                                </span>
                                <strong>{r.name}</strong>
                                {r.private && (
                                  <span className="badge">Private</span>
                                )}
                                {r.archived && (
                                  <span className="badge">Archived</span>
                                )}
                              </div>
                              <p>{r.description || ""}</p>
                              <div className="repo-meta">
                                {r.language && <span>{r.language}</span>}
                                <span>
                                  <Star size={12} />
                                  {r.stargazers_count.toLocaleString()}
                                </span>
                                <span>
                                  <GitBranch size={12} />
                                  {r.forks_count.toLocaleString()}
                                </span>
                                {r.fork && <span>Fork</span>}
                              </div>
                            </div>
                            <Time value={r.pushed_at || r.updated_at} />
                          </Button>
                        ))}
                      </div>
                      {!shownRepos?.length && (
                        <Empty title="No repositories found">
                          Try another search, or check your GitHub account’s
                          access.
                        </Empty>
                      )}
                      <Pager
                        page={page}
                        setPage={setPage}
                        hasNext={(repositories.data?.length || 0) === 50}
                      />
                    </>
                  )}
                </>
              ) : view === "notifications" ? (
                notifications.isPending ? (
                  <Loading />
                ) : notifications.error ? (
                  <ErrorBox error={notifications.error} />
                ) : (
                  <>
                    {notifications.data
                      ?.filter((n) =>
                        n.subject.title
                          .toLowerCase()
                          .includes(deferred.toLowerCase()),
                      )
                      .map((n) => (
                        <div className="notification-row" key={n.id}>
                          <Bell size={17} />
                          <Button
                            className="notification-main"
                            onClick={() => {
                              const match = n.subject.url?.match(
                                /\/repos\/([^/]+\/[^/]+)\/(issues|pulls)\/(\d+)/,
                              );
                              if (match)
                                setIssue({
                                  repo: match[1],
                                  number: Number(match[3]),
                                  pull: match[2] === "pulls",
                                });
                              else openExternal(n.repository.html_url);
                            }}
                          >
                            <small>
                              {n.repository.full_name} ·{" "}
                              {n.reason.replaceAll("_", " ")}
                            </small>
                            <strong>{n.subject.title}</strong>
                          </Button>
                          <Time value={n.updated_at} />
                          <Button
                            onClick={async () => {
                              try {
                                await api.markRead(n.id);
                                client.invalidateQueries({
                                  queryKey: ["notifications"],
                                });
                              } catch (e) {
                                alert(
                                  e instanceof Error
                                    ? e.message
                                    : "Could not mark notification read",
                                );
                              }
                            }}
                          >
                            Mark read
                          </Button>
                        </div>
                      ))}
                    {!notifications.data?.length && (
                      <Empty title="You’re all caught up">
                        No unread notifications from GitHub.
                      </Empty>
                    )}
                    <Pager
                      page={page}
                      setPage={setPage}
                      hasNext={notifications.data?.length === 50}
                    />
                  </>
                )
              ) : personal.isPending ? (
                <Loading />
              ) : personal.error ? (
                <ErrorBox error={personal.error} />
              ) : (
                <>
                  <IssueList
                    issues={
                      personal.data?.items.filter((i) =>
                        i.title.toLowerCase().includes(deferred.toLowerCase()),
                      ) || []
                    }
                    onSelect={(i) =>
                      setIssue({
                        repo: i.repository_url.split("/repos/")[1],
                        number: i.number,
                        pull: !!i.pull_request,
                        initial: i,
                      })
                    }
                  />
                  <Pager
                    page={page}
                    setPage={setPage}
                    hasNext={(personal.data?.total_count || 0) > page * 50}
                  />
                </>
              )}
            </div>
          )}
        </main>
        <CommandPalette
          open={palette}
          onOpenChange={(open) => {
            setPalette(open);
            if (!open) setCommand("");
          }}
          query={command}
          onQueryChange={setCommand}
          items={[
            ...navigation
              .filter((n) => n[1].toLowerCase().includes(command.toLowerCase()))
              .map(([key, label, Icon]) => ({
                id: key,
                label,
                icon: <Icon size={16} />,
                onSelect: () => {
                  navigate(key);
                  setPalette(false);
                  setCommand("");
                },
              })),
            ...(jumpRepos.data || [])
              .filter((r) =>
                r.full_name.toLowerCase().includes(command.toLowerCase()),
              )
              .map((r) => ({
                id: String(r.id),
                label: r.full_name,
                icon: <BookOpen size={16} />,
                onSelect: () => {
                  setProfile(null);
                  setRepo(r);
                  setIssue(null);
                  setPalette(false);
                  setCommand("");
                },
              })),
          ]}
        />
      </div>
    </ProfileNavigation.Provider>
  );
}
export function IssueList({
  issues,
  onSelect,
}: {
  issues: Issue[];
  onSelect: (issue: Issue) => void;
}) {
  return (
    <div className="issue-list">
      {issues.map((i) => (
        <Button className="issue-row" key={i.id} onClick={() => onSelect(i)}>
          <IssueGlyph issue={i} />
          <div>
            <strong>{i.title}</strong>
            <p>
              #{i.number} · {i.user.login} · updated{" "}
              <Time value={i.updated_at} />
            </p>
            <div className="labels">
              {i.labels.map((l) => (
                <span className="badge" key={l.name}>
                  {l.name}
                </span>
              ))}
            </div>
          </div>
          <span className="muted small">{i.comments} comments</span>
        </Button>
      ))}
      {!issues.length && (
        <Empty title="Nothing here">No matching issues or pull requests.</Empty>
      )}
    </div>
  );
}
