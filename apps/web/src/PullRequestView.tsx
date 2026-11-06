import { useHashFields } from "./useHashFields";
import { useEffect, useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ArrowLeft,
  ExternalLink,
  BookOpenText,
  MessagesSquare,
  Code2,
  GitCommitHorizontal,
  File,
  ChevronDown,
  Users,
  Tag,
  CircleCheck,
  Columns2,
  Rows2,
  WrapText,
  ListOrdered,
  ChevronsUpDown,
  Send,
  RefreshCw,
} from "lucide-react";
import type { Issue, User, DiffFile } from "@git-client/github";
import { api, openExternal } from "./api";
import { Markdown, ErrorBox, Time } from "./components";
import { Button } from "./ui/primitives";
import { IssueGlyph } from "./ui/status";
import { PullMerge } from "./PullMerge";
import { PullChecks } from "./PullChecks";
import { CommentEditor } from "./CommentEditor";
import {
  ActivityRow,
  ActivityControls,
  filterActivity,
  type ActivityEvent,
  type ActivityFilter,
} from "./Activity";
import { CodeDiff } from "./Pierre";
import { useOpenProfile } from "./navigation";
type PullDetail = Issue & {
  head?: { ref: string; sha: string };
  changed_files?: number;
  requested_reviewers?: User[];
  requested_teams?: { id: number; name: string }[];
};
export function IssueDetail({
  repo,
  number,
  pull,
  initial,
}: {
  repo: string;
  number: number;
  pull: boolean;
  onBack: () => void;
  initial?: Issue;
}) {
  const client = useQueryClient();
  const openProfile = useOpenProfile();
  const [location, setLocation] = useHashFields({ section: "summary" });
  const tab = location.section as "summary" | "timeline" | "code";
  const setTab = (section: typeof tab) => setLocation({ section });
  const [compact, setCompact] = useState(false);
  const [descriptionOpen, setDescriptionOpen] = useState(true);
  const [commentsOpen, setCommentsOpen] = useState(true);
  const [checksOpen, setChecksOpen] = useState(false);
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const [newest, setNewest] = useState(true);
  const [body, setBody] = useState("");
  const [split, setSplit] = useState(false);
  const [wrap, setWrap] = useState(false);
  const [lineNumbers, setLineNumbers] = useState(true);
  const [allExpanded, setAllExpanded] = useState(false);
  const [viewed, setViewed] = useState<Set<string>>(new Set());
  useEffect(() => {
    const main = document.querySelector(".main");
    if (!main) return;
    const scroll = () =>
      setCompact((v) =>
        main.scrollTop > 110 ? true : main.scrollTop < 28 ? false : v,
      );
    main.addEventListener("scroll", scroll, { passive: true });
    scroll();
    return () => main.removeEventListener("scroll", scroll);
  }, []);
  const detail = useQuery({
    queryKey: ["issue", repo, number, pull],
    queryFn: () => api.issue(repo, number, pull) as Promise<PullDetail>,
    placeholderData: initial as PullDetail | undefined,
  });
  const i = detail.data;
  const timeline = useInfiniteQuery({
    queryKey: ["pr-timeline", repo, number],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      api.request<ActivityEvent[]>(
        `/repos/${repo.split("/").map(encodeURIComponent).join("/")}/issues/${number}/timeline?per_page=100&page=${pageParam}`,
      ),
    getNextPageParam: (last, pages) =>
      last.length === 100 ? pages.length + 1 : undefined,
  });
  const commits = useQuery({
    queryKey: ["pr-commits", repo, number],
    enabled: pull && tab === "timeline",
    queryFn: async () => {
      const all: import("@git-client/github").Commit[] = [];
      for (let page = 1; ; page++) {
        const batch = await api.pullCommits(repo, number, page);
        all.push(...batch);
        if (batch.length < 100) return all;
      }
    },
  });
  const comments = useInfiniteQuery({
    queryKey: ["pr-comments", repo, number],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => api.comments(repo, number, pageParam),
    getNextPageParam: (last, pages) =>
      last.length === 100 ? pages.length + 1 : undefined,
  });
  const files = useInfiniteQuery({
    queryKey: ["pr-files", repo, number],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => api.diff(repo, number, pageParam),
    getNextPageParam: (last, pages) =>
      last.length === 100 ? pages.length + 1 : undefined,
    enabled: pull && tab === "code",
  });
  const checks = useQuery({
    queryKey: ["pr-checks", repo, i?.head?.sha],
    queryFn: () => api.pullChecks(repo, i!.head!.sha),
    enabled: pull && !!i?.head?.sha,
  });
  const refresh = () => {
    client.invalidateQueries({ queryKey: ["issue", repo, number] });
    client.invalidateQueries({ queryKey: ["pr-timeline", repo, number] });
    client.invalidateQueries({ queryKey: ["pr-comments", repo, number] });
    client.invalidateQueries({ queryKey: ["personal"] });
    client.invalidateQueries({ queryKey: ["repo-issues"] });
  };
  const comment = useMutation({
    mutationFn: () => api.comment(repo, number, body),
    onSuccess: () => {
      setBody("");
      refresh();
    },
  });
  const state = useMutation({
    mutationFn: () =>
      api.setIssueState(repo, number, i?.state === "open" ? "closed" : "open"),
    onSuccess: refresh,
  });
  const passed =
    checks.data?.items.filter((c) => c.state === "success").length || 0;
  const checksCount = checks.data?.items.length || 0;
  const commitMap = new Map(commits.data?.map((c) => [c.sha, c]));
  const events = (timeline.data?.pages.flat() || []).map((e) => {
    const c = commitMap.get(e.sha || e.commit_id || "");
    return c
      ? {
          ...e,
          actor: e.actor || c.author,
          message: e.message || c.commit.message,
        }
      : e;
  });
  const commentEvents =
    comments.data?.pages.flat().map((c) => ({ ...c, event: "commented" })) ||
    [];
  const more = (label: string, pending: boolean, load: () => void) => (
    <Button
      className="icon pr-more"
      title={label}
      aria-label={label}
      disabled={pending}
      onClick={load}
    >
      <ChevronDown size={16} />
    </Button>
  );
  const controls = (
    <ActivityControls
      filter={filter}
      onFilter={setFilter}
      newest={newest}
      onOrder={() => setNewest((v) => !v)}
    />
  );
  return (
    <div className="pr-detail" aria-busy={detail.isPending}>
      <div className={`pr-sticky ${compact ? "compact-pr" : ""}`}>
        <header className="pr-header">
          <div className="pr-location">
            <span>{repo}</span>
            <a
              href={
                i?.html_url ||
                `https://github.com/${repo}/${pull ? "pull" : "issues"}/${number}`
              }
              onClick={(e) => {
                e.preventDefault();
                openExternal(e.currentTarget.href);
              }}
            >
              #{number}
            </a>
            <span className="spacer" />
            {pull && i && <PullMerge repo={repo} number={number} issue={i} />}
            <Button
              className="icon"
              title="Open on GitHub"
              onClick={() =>
                openExternal(
                  i?.html_url ||
                    `https://github.com/${repo}/${pull ? "pull" : "issues"}/${number}`,
                )
              }
            >
              <ExternalLink size={16} />
            </Button>
          </div>
          <div className="pr-title-row">
            {i ? (
              <h1>{i.title}</h1>
            ) : (
              <div className="pr-skeleton pr-title-skeleton" />
            )}
          </div>
          <div className="pr-author-row">
            {i ? (
              <>
                <Button
                  className="pr-author-link"
                  title={i.user.login}
                  onClick={() => openProfile(i.user.login)}
                >
                  <img width={18} height={18} src={i.user.avatar_url} alt="" />
                  <span>{i.user.login}</span>
                </Button>
                <span className="muted">
                  updated <Time value={i.updated_at} />
                </span>
                <IssueGlyph issue={i} pull={pull} size={14} />
              </>
            ) : (
              <div className="pr-skeleton" style={{ width: 170, height: 18 }} />
            )}
          </div>
          <div className="pr-branch-row">
            {pull && (
              <div className="pr-branches">
                <span>{i?.base?.ref || "—"}</span>
                <ArrowLeft size={12} />
                <span>{i?.head?.ref || "—"}</span>
              </div>
            )}
            <span className="spacer" />
            {pull && (
              <div className="pr-statistics">
                <span aria-label="Changed files">
                  <File size={14} />
                  {i?.changed_files ?? "—"}
                </span>
                <span className="green-text">
                  {i?.additions === undefined
                    ? "—"
                    : `+${i.additions.toLocaleString()}`}
                </span>
                <span className="red-text">
                  {i?.deletions === undefined
                    ? "—"
                    : `−${i.deletions.toLocaleString()}`}
                </span>
              </div>
            )}
          </div>
        </header>
        <nav className="pr-tabs" aria-label="Pull request sections">
          <div className="pr-tab-group">
            {(
              [
                ["summary", "Summary", BookOpenText],
                ["timeline", "Timeline", MessagesSquare],
                ...(pull ? [["code", "Code", Code2]] : []),
              ] as const
            ).map(([id, label, Icon]) => (
              <Button
                key={id as string}
                className={`icon ${tab === id ? "active" : ""}`}
                title={label as string}
                aria-label={label as string}
                aria-pressed={tab === id}
                onClick={() => setTab(id as typeof tab)}
              >
                <Icon size={16} />
              </Button>
            ))}
          </div>
          {tab === "timeline" ? (
            <div className="timeline-toolbar">
              <span>
                <MessagesSquare size={12} />
                {i?.comments ?? 0}
              </span>
              <span>
                <GitCommitHorizontal size={12} />
                {events.filter((e) => e.sha || e.event === "committed").length}
              </span>
              {controls}
            </div>
          ) : (
            pull && (
              <Button
                className="pr-check-summary"
                title="Checks"
                onClick={() => {
                  setTab("summary");
                  setChecksOpen((v) => !v);
                }}
              >
                <CircleCheck size={14} />
                {passed} of {checksCount} passing
              </Button>
            )
          )}
        </nav>
      </div>
      {detail.error && (
        <ErrorBox error={detail.error} retry={() => detail.refetch()} />
      )}
      <section
        className="pr-tab-panel"
        hidden={tab !== "summary"}
        aria-label="Summary"
      >
        <div className="pr-metadata">
          {pull && (
            <div className="pr-meta-row">
              <Users size={15} />
              <span className="pr-meta-label">Reviewers</span>
              <div className="pr-meta-value">
                {i?.requested_reviewers?.length ||
                i?.requested_teams?.length ? (
                  <>
                    {i.requested_reviewers?.map((u) => (
                      <Button
                        className="pr-author-link"
                        key={u.login}
                        title={u.login}
                        onClick={() => openProfile(u.login)}
                      >
                        <img
                          width={20}
                          height={20}
                          src={u.avatar_url}
                          alt={u.login}
                        />
                      </Button>
                    ))}
                    {i.requested_teams?.map((t) => (
                      <span key={t.id}>{t.name}</span>
                    ))}
                  </>
                ) : (
                  <span className="muted">None</span>
                )}
              </div>
            </div>
          )}
          <div className="pr-meta-row">
            <Tag size={15} />
            <span className="pr-meta-label">Labels</span>
            <div className="pr-meta-value">
              {i?.labels.length ? (
                i.labels.map((l) => (
                  <span className="pr-label" key={l.name}>
                    {l.name}
                  </span>
                ))
              ) : (
                <span className="muted">None</span>
              )}
            </div>
          </div>
        </div>
        <div className="pr-description">
          <Button
            className="pr-section-toggle"
            aria-expanded={descriptionOpen}
            onClick={() => setDescriptionOpen((v) => !v)}
          >
            Description
            <ChevronDown
              size={12}
              style={{ rotate: descriptionOpen ? "0deg" : "-90deg" }}
            />
          </Button>
          <div hidden={!descriptionOpen}>
            {i ? (
              <Markdown baseUrl={`https://github.com/${repo}/`}>
                {i.body || ""}
              </Markdown>
            ) : (
              <DescriptionSkeleton />
            )}
          </div>
        </div>
        {pull && (
          <PullChecks
            data={checks.data}
            error={checks.error}
            loading={checks.isPending}
            open={checksOpen}
            onToggle={setChecksOpen}
          />
        )}
        <section className="pr-comments">
          <div className="comments-toolbar">
            <Button
              className="pr-section-toggle"
              aria-expanded={commentsOpen}
              onClick={() => setCommentsOpen((v) => !v)}
            >
              Comments ({i?.comments ?? 0})
              <ChevronDown
                size={12}
                style={{ rotate: commentsOpen ? "0deg" : "-90deg" }}
              />
            </Button>
            {controls}
          </div>
          {commentsOpen &&
            (comments.error ? (
              <ErrorBox error={comments.error} />
            ) : comments.isPending ? (
              <DescriptionSkeleton />
            ) : (
              <>
                {filterActivity(commentEvents, filter, newest).map((e) => (
                  <ActivityRow key={e.id} event={e} repo={repo} />
                ))}
                {comments.hasNextPage &&
                  more("Load more comments", comments.isFetchingNextPage, () =>
                    comments.fetchNextPage(),
                  )}
              </>
            ))}
        </section>
      </section>
      <section
        className="pr-tab-panel pr-timeline"
        hidden={tab !== "timeline"}
        aria-label="Timeline"
      >
        {timeline.isPending ? (
          <DescriptionSkeleton />
        ) : timeline.error ? (
          <ErrorBox error={timeline.error} retry={() => timeline.refetch()} />
        ) : (
          <>
            {filterActivity(events, filter, newest).map((e, index) => (
              <ActivityRow
                key={e.id || `${e.event}:${index}`}
                event={e}
                repo={repo}
              />
            ))}
            {timeline.hasNextPage &&
              more("Load more events", timeline.isFetchingNextPage, () =>
                timeline.fetchNextPage(),
              )}
          </>
        )}
      </section>
      <section className="pr-tab-panel pr-timeline" hidden={tab === "code"}>
        <form
          className="pr-composer"
          onSubmit={(e) => {
            e.preventDefault();
            comment.mutate();
          }}
        >
          <CommentEditor
            label="Comment"
            placeholder="Comment…"
            value={body}
            onChange={setBody}
            rows={4}
            baseUrl={`https://github.com/${repo}/`}
          />
          <div className="pr-composer-actions">
            {!pull && (
              <Button
                className="icon"
                title={i?.state === "open" ? "Close issue" : "Reopen issue"}
                disabled={state.isPending}
                onClick={() => state.mutate()}
              >
                <RefreshCw size={16} />
              </Button>
            )}
            <Button
              className="icon"
              type="submit"
              title="Comment"
              disabled={!body.trim() || comment.isPending}
            >
              <Send size={16} />
            </Button>
          </div>
          {comment.error && <ErrorBox error={comment.error} />}{" "}
          {state.error && <ErrorBox error={state.error} />}
        </form>
      </section>
      {pull && (
        <section
          className="pr-tab-panel pr-code"
          hidden={tab !== "code"}
          aria-label="Code"
        >
          <div className="pr-code-actions">
            <span className="muted small">
              {i?.changed_files ?? files.data?.pages.flat().length ?? "—"} files
              · {viewed.size} viewed
            </span>
            <span className="spacer" />
            <Button
              className="icon"
              title={split ? "Unified diff" : "Split diff"}
              onClick={() => setSplit((v) => !v)}
            >
              {split ? <Columns2 size={16} /> : <Rows2 size={16} />}
            </Button>
            <Button
              className="icon"
              title="Wrap lines"
              aria-pressed={wrap}
              onClick={() => setWrap((v) => !v)}
            >
              <WrapText size={16} />
            </Button>
            <Button
              className="icon"
              title="Line numbers"
              aria-pressed={lineNumbers}
              onClick={() => setLineNumbers((v) => !v)}
            >
              <ListOrdered size={16} />
            </Button>
            <Button
              className="icon"
              title={allExpanded ? "Collapse all files" : "Expand all files"}
              onClick={() => setAllExpanded((v) => !v)}
            >
              <ChevronsUpDown size={16} />
            </Button>
          </div>
          {files.isPending ? (
            <DescriptionSkeleton />
          ) : files.error ? (
            <ErrorBox error={files.error} retry={() => files.refetch()} />
          ) : (
            <>
              {files.data?.pages.flat().map((f) => (
                <DiffRow
                  key={f.filename}
                  file={f}
                  split={split}
                  wrap={wrap}
                  lineNumbers={lineNumbers}
                  forceOpen={allExpanded}
                  viewed={viewed.has(f.filename)}
                  onViewed={() =>
                    setViewed((v) => {
                      const n = new Set(v);
                      n.has(f.filename)
                        ? n.delete(f.filename)
                        : n.add(f.filename);
                      return n;
                    })
                  }
                  url={`${i?.html_url}/files`}
                />
              ))}
              {files.hasNextPage &&
                more("Load more files", files.isFetchingNextPage, () =>
                  files.fetchNextPage(),
                )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
function DescriptionSkeleton() {
  return (
    <div
      className="pr-description-skeleton"
      role="status"
      aria-label="Loading description"
    >
      {[98, 93, 100, 85, 97, 90, 100, 92, 78].map((w, index) => (
        <div
          className="pr-skeleton"
          key={index}
          style={{ width: `${w}%`, height: 12 }}
        />
      ))}
    </div>
  );
}
function DiffRow({
  file,
  split,
  wrap,
  lineNumbers,
  forceOpen,
  viewed,
  onViewed,
  url,
}: {
  file: DiffFile;
  split: boolean;
  wrap: boolean;
  lineNumbers: boolean;
  forceOpen: boolean;
  viewed: boolean;
  onViewed: () => void;
  url: string;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(forceOpen), [forceOpen]);
  return (
    <details
      className="pr-diff"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>
        <ChevronDown size={14} />
        <span
          className={`diff-status diff-${file.status}`}
          aria-label={file.status}
        >
          {file.status === "added"
            ? "+"
            : file.status === "removed"
              ? "−"
              : file.status === "renamed"
                ? "→"
                : ""}
        </span>
        <span>{file.filename}</span>
        <span className="green-text">+{file.additions}</span>
        <span className="red-text">−{file.deletions}</span>
        <label className="diff-viewed" onClick={(e) => e.stopPropagation()}>
          <input type="checkbox" checked={viewed} onChange={onViewed} />
          Viewed
        </label>
      </summary>
      {open &&
        (file.patch ? (
          <CodeDiff
            name={file.filename}
            patch={file.patch}
            split={split}
            wrap={wrap}
            lineNumbers={lineNumbers}
          />
        ) : (
          <div className="pr-diff-unavailable">
            <Button
              className="icon"
              title="Open full diff on GitHub"
              onClick={() => openExternal(url)}
            >
              <ExternalLink size={17} />
            </Button>
          </div>
        ))}
    </details>
  );
}
