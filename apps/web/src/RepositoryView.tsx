import { useHashFields } from "./useHashFields";
import { Modal, BranchPicker } from "./ui/primitives";
import { Button } from "./ui/primitives";
import { useOpenProfile } from "./navigation";
import { RepositoryCode } from "./RepositoryCode";
import { MediaPreview } from "./MediaPreview";
import { fileFormat } from "@git-client/github";
import { CodeFile, CodeDiff, DirectoryTree } from "./Pierre";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Star,
  GitBranch,
  Code2 as Code,
  GitPullRequestArrow as GitPullRequest,
  CircleDot as Circle,
  GitCommitHorizontal as GitCommit,
  Folder,
  File,
  ChevronRight as CaretRight,
  Download as DownloadSimple,
  Plus,
  ExternalLink as ArrowSquareOut,
} from "lucide-react";
import {
  decodeContent,
  type Repository,
  type Content,
} from "@git-client/github";
import { api, openExternal } from "./api";
import {
  CopyButton,
  Empty,
  ErrorBox,
  External,
  Loading,
  Markdown,
  Pager,
  Time,
} from "./components";
import { IssueList } from "./App";
import { CommentEditor } from "./CommentEditor";
export function RepositoryView({
  repo,
  onIssue,
}: {
  repo: Repository;
  onBack: () => void;
  onIssue: (n: number, pull: boolean) => void;
}) {
  const openProfile = useOpenProfile();
  const [location, setLocation] = useHashFields({
    tab: "code",
    branch: repo.default_branch,
    file: "",
  });
  const { tab, branch, file: path } = location;
  const setTab = (tab: string) => setLocation({ tab, file: "" });
  const setBranch = (branch: string) => setLocation({ branch, file: "" });
  const setPath = (file: string) => setLocation({ file });
  const [page, setPage] = useState(1);
  const [state, setState] = useState("open");
  const [creating, setCreating] = useState(false);
  const [cloneResult, setCloneResult] = useState("");
  const client = useQueryClient();
  const branches = useQuery({
    queryKey: ["branches", repo.full_name],
    queryFn: async () => {
      const all: { name: string }[] = [];
      for (let page = 1; ; page++) {
        const batch = await api.branches(repo.full_name, page);
        all.push(...batch);
        if (batch.length < 100) break;
      }
      return all;
    },
  });
  const starred = useQuery({
    queryKey: ["star", repo.full_name],
    queryFn: () => api.isStarred(repo.full_name),
  });
  const star = useMutation({
    mutationFn: () => api.star(repo.full_name, !starred.data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["star", repo.full_name] });
      client.invalidateQueries({ queryKey: ["repositories", "starred"] });
    },
  });
  const commits = useQuery({
    queryKey: ["commits", repo.full_name, branch, page],
    queryFn: () => api.commits(repo.full_name, branch, page),
    enabled: tab === "commits",
  });
  const issues = useQuery({
    queryKey: ["repo-issues", repo.full_name, tab, state, page],
    queryFn: () =>
      api.repoIssues(
        repo.full_name,
        tab === "pulls" ? "pulls" : "issues",
        state,
        page,
      ),
    enabled: tab === "issues" || tab === "pulls",
  });

  return (
    <div className="repository-view">
      <div className="repo-header">
        <div className="repo-header-title">
          <BookOpen size={22} />
          <h1>
            <Button
              className="owner-link"
              onClick={() => openProfile(repo.owner.login)}
            >
              {repo.owner.login}
            </Button>
            <span> / </span>
            {repo.name}
          </h1>
          <span className="badge">{repo.private ? "Private" : "Public"}</span>
          <div className="repo-header-actions">
            <Button
              aria-label={starred.data ? "Unstar" : "Star"}
              title={starred.data ? "Unstar" : "Star"}
              disabled={star.isPending || starred.isPending || starred.isError}
              onClick={() => star.mutate()}
            >
              <Star size={16} fill={starred.data ? "currentColor" : "none"} />
            </Button>
            <External url={repo.html_url} />
          </div>
        </div>
        <p className="muted">{repo.description}</p>
        {star.error && <ErrorBox error={star.error} />}
        <div className="tabs">
          {[
            ["code", "Code", Code],
            ["issues", "Issues", Circle],
            ["pulls", "Pull requests", GitPullRequest],
            ["commits", "Commits", GitCommit],
          ].map(([id, label, Icon]) => (
            <Button
              key={id as string}
              aria-label={label as string}
              title={label as string}
              className={tab === id ? "active" : ""}
              onClick={() => {
                setTab(id as string);
                setPage(1);
              }}
            >
              <Icon size={16} />
            </Button>
          ))}
          <BranchPicker
            value={branch}
            branches={branches.data || [{ name: repo.default_branch }]}
            onChange={(branch) => {
              setBranch(branch);
              setPath("");
              setPage(1);
            }}
          />{" "}
        </div>
      </div>
      <div className="repository-body">
        <div className="repository-content">
          <div className="code-toolbar">
            {tab === "code" ? null : tab === "issues" || tab === "pulls" ? (
              <div className="segmented">
                {["open", "closed"].map((s) => (
                  <Button
                    className={state === s ? "active" : ""}
                    key={s}
                    onClick={() => {
                      setState(s);
                      setPage(1);
                    }}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            ) : null}
            <div className="spacer" />
            {tab === "issues" && (
              <Button
                aria-label="New issue"
                title="New issue"
                onClick={() => setCreating(true)}
              >
                <Plus size={14} />
              </Button>
            )}
            {tab === "code" && window.desktop && (
              <Button
                aria-label="Clone"
                title="Clone"
                disabled={cloneResult === "Cloning…"}
                onClick={async () => {
                  setCloneResult("Cloning…");
                  try {
                    const result = await window.desktop!.clone(repo.full_name);
                    setCloneResult(
                      result.error ||
                        (result.canceled ? "" : `Cloned to ${result.path}`),
                    );
                  } catch {
                    setCloneResult("Clone failed");
                  }
                }}
              >
                <DownloadSimple size={14} />
              </Button>
            )}
          </div>
          {cloneResult && (
            <p className="notice" role="status">
              {cloneResult}
            </p>
          )}
          {branches.error && <ErrorBox error={branches.error} />}
          {tab === "code" ? (
            <RepositoryCode
              key={branch}
              repo={repo}
              branch={branch}
              selected={path}
              onSelect={setPath}
            />
          ) : tab === "commits" ? (
            commits.isPending ? (
              <Loading />
            ) : commits.error ? (
              <ErrorBox error={commits.error} />
            ) : (
              <>
                {commits.data?.map((c) => (
                  <div className="commit-row" key={c.sha}>
                    <GitCommit size={16} />
                    <div>
                      <Button
                        className="subtle commit-title"
                        onClick={() => openExternal(c.html_url)}
                      >
                        {c.commit.message.split("\n")[0]}
                      </Button>
                      <p>
                        {c.commit.author.name} committed{" "}
                        <Time value={c.commit.author.date} />
                      </p>
                    </div>
                    <Button
                      className="sha"
                      onClick={() => openExternal(c.html_url)}
                    >
                      {c.sha.slice(0, 7)}
                    </Button>
                  </div>
                ))}
                {!commits.data?.length && <Empty title="No commits" />}
                <Pager
                  page={page}
                  setPage={setPage}
                  hasNext={commits.data?.length === 50}
                />
              </>
            )
          ) : issues.isPending ? (
            <Loading />
          ) : issues.error ? (
            <ErrorBox error={issues.error} />
          ) : (
            <>
              <IssueList
                issues={
                  issues.data?.filter(
                    (i) => tab === "pulls" || !i.pull_request,
                  ) || []
                }
                onSelect={(i) => onIssue(i.number, tab === "pulls")}
              />
              <Pager
                page={page}
                setPage={setPage}
                hasNext={issues.data?.length === 50}
              />
            </>
          )}
        </div>
      </div>
      {
        <NewIssue
          open={creating}
          repo={repo.full_name}
          onClose={() => setCreating(false)}
          onCreated={(n) => {
            setCreating(false);
            client.invalidateQueries({
              queryKey: ["repo-issues", repo.full_name],
            });
            onIssue(n, false);
          }}
        />
      }
    </div>
  );
}
function formatBytes(n: number) {
  return n < 1024
    ? `${n} B`
    : n < 1048576
      ? `${(n / 1024).toFixed(1)} KB`
      : `${(n / 1048576).toFixed(1)} MB`;
}
function NewIssue({
  open,
  repo,
  onClose,
  onCreated,
}: {
  open: boolean;
  repo: string;
  onClose: () => void;
  onCreated: (n: number) => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const create = useMutation({
    mutationFn: () => api.createIssue(repo, title, body),
    onSuccess: (i) => {
      setTitle("");
      setBody("");
      onCreated(i.number);
    },
  });
  return (
    <Modal
      open={open}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="New issue"
    >
      <form
        className="t3-issue-form"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <h2>New issue</h2>
        <p className="muted">{repo}</p>
        <label>
          Title
          <input
            autoFocus
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <div>
          <div className="issue-description-label">Description</div>
          <CommentEditor
            label="Description"
            value={body}
            onChange={setBody}
            rows={8}
            baseUrl={`https://github.com/${repo}/`}
          />
        </div>
        {create.error && <ErrorBox error={create.error} />}
        <div className="dialog-actions">
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            className="primary"
            disabled={!title.trim() || create.isPending}
          >
            {create.isPending ? "Creating…" : "Create issue"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
