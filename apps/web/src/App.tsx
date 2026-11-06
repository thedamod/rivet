import { RivetMark } from "./RivetMark";
import { SignOut } from "./AuthGate";
import { useAppHistory } from "./useAppHistory";
import { IssueGlyph } from "./ui/status";
import { NavbarSearch } from "./NavbarSearch";
import "./navbar.css";
import { Button } from "./ui/primitives";
import { ProfileView } from "./ProfileView";
import { ProfileNavigation } from "./navigation";
import { useEffect, useState, useDeferredValue, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
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
import type { Repository, Issue } from "@rivet/github";
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
  const navbar = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!navbar.current) return;
    const resize = new ResizeObserver(() =>
      document.documentElement.style.setProperty(
        "--app-navbar-height",
        `${navbar.current?.getBoundingClientRect().height || 40}px`,
      ),
    );
    resize.observe(navbar.current);
    return () => resize.disconnect();
  }, []);
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

  const [theme, setTheme] = useState(
    () => localStorage.getItem("rivet-theme") || "dark",
  );
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("rivet-theme", theme);
  }, [theme]);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        const input = document.getElementById(
          "global-search",
        ) as HTMLInputElement | null;
        input?.focus();
        input?.select();
      }
      if (e.key === "Escape") {
        (document.activeElement as HTMLElement)?.blur();
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
    <ProfileNavigation.Provider
      value={(login) => {
        setSearch("");
        setProfile(login);
      }}
    >
      <div className="app-shell">
        <main className="main">
          <header className="topbar" ref={navbar}>
            <Button
              className="icon navbar-back"
              aria-label="Back"
              title="Back"
              disabled={
                !profile &&
                !repo &&
                !issue &&
                view === "repositories" &&
                !(history.state?.depth > 0)
              }
              onClick={goBack}
            >
              <ArrowLeft size={16} />
            </Button>
            <span title="Rivet" aria-label="Rivet">
              <RivetMark size={22} />
            </span>
            <nav className="top-navigation" aria-label="Primary navigation">
              {navigation.map(([key, label, Icon]) => (
                <Button
                  key={key}
                  className={`icon ${view === key && !repo && !profile && !issue ? "active" : ""}`}
                  title={label}
                  aria-label={label}
                  aria-current={
                    view === key && !repo && !profile && !issue
                      ? "page"
                      : undefined
                  }
                  onClick={() => navigate(key)}
                >
                  <Icon size={16} />
                </Button>
              ))}
            </nav>
            <NavbarSearch
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              repositories={jumpRepos.data || []}
              sections={navigation.map(([id, label, Icon]) => ({
                id,
                label,
                icon: <Icon size={14} />,
                onSelect: () => navigate(id),
              }))}
              onRepository={(r) => {
                setSearch("");
                setProfile(null);
                setIssue(null);
                setRepo(r);
              }}
              onProfile={(login) => {
                setSearch("");
                setProfile(login);
              }}
            />
            <div className="top-actions">
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
                onClick={() => {
                  setSearch("");
                  if (viewer.data) setProfile(viewer.data.login);
                }}
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
              search={search}
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
                <SignOut />
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
                  <kbd>⌘ / Ctrl K</kbd> Focus search
                </p>
                <p>
                  <kbd>Esc</kbd> Dismiss search
                </p>
              </section>
            </div>
          ) : (
            <div className="page">
              <div className="list-toolbar">
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
