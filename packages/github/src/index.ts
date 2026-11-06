import { loadProfileExtras } from "./profile";
export { type ProfileExtras } from "./profile";
import { loadPullChecks } from "./checks";
export { checkLabel, type PullCheck, type PullChecks } from "./checks";
import { loadRepositoryTree } from "./tree";
export interface User {
  login: string;
  avatar_url: string;
  name?: string;
  bio?: string;
  html_url: string;
  public_repos: number;
  followers: number;
  following?: number;
  location?: string | null;
  company?: string | null;
  blog?: string;
  twitter_username?: string | null;
  created_at?: string;
  type?: string;
}
export interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  fork: boolean;
  archived: boolean;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  default_branch: string;
  updated_at: string;
  pushed_at: string;
  html_url: string;
  permissions?: { push?: boolean; admin?: boolean; maintain?: boolean };
  allow_merge_commit?: boolean;
  allow_squash_merge?: boolean;
  allow_rebase_merge?: boolean;
  owner: User;
}
export interface Issue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: string;
  html_url: string;
  updated_at: string;
  created_at: string;
  user: User;
  comments: number;
  labels: { name: string; color: string }[];
  pull_request?: { url: string; merged_at?: string | null };
  repository_url: string;
  draft?: boolean;
  merged_at?: string;
  mergeable?: boolean | null;
  mergeable_state?: string;
  additions?: number;
  deletions?: number;
  head?: { ref: string };
  base?: { ref: string };
}
export interface Content {
  name: string;
  path: string;
  type: string;
  sha: string;
  size: number;
  content?: string;
  encoding?: string;
  html_url: string;
  download_url: string | null;
}
export interface Comment {
  id: number;
  body: string;
  user: User;
  created_at: string;
}
export interface Commit {
  sha: string;
  html_url: string;
  commit: { message: string; author: { name: string; date: string } };
  author: User | null;
}
export interface DiffFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string;
}
export interface Notification {
  id: string;
  unread: boolean;
  updated_at: string;
  repository: Repository;
  subject: { title: string; type: string; url: string | null };
  reason: string;
}
export class GitHubError extends Error {
  constructor(
    message: string,
    public status: number,
    public reset?: string,
  ) {
    super(message);
    this.name = "GitHubError";
  }
}
export type Transport = (path: string, init?: RequestInit) => Promise<Response>;
export const validatePath = (path: string) =>
  /^\/(user(?:s)?|repos|search|notifications|graphql)(?:\/|\?|$)/.test(path) &&
  !/[\\\r\n#]/.test(path) &&
  !path.includes("..") &&
  !/%(?:2f|5c|2e)/i.test(path.split("?")[0]);
export function createClient(transport: Transport) {
  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    if (!validatePath(path)) throw new Error("Invalid GitHub API path");
    const response = await transport(path, init);
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new GitHubError(
        error.message || `GitHub request failed (${response.status})`,
        response.status,
        response.headers.get("x-ratelimit-reset") ?? undefined,
      );
    }
    return response.status === 204 ? (undefined as T) : response.json();
  }
  const enc = encodeURIComponent;
  const repoPath = (repo: string) => repo.split("/").map(enc).join("/");
  return {
    request,
    profileExtras: (login: string) => loadProfileExtras(request, login),
    profileReadme: async (login: string) => {
      try {
        return await request<Content>(
          `/repos/${enc(login)}/${enc(login)}/readme`,
        );
      } catch (e) {
        if (e instanceof GitHubError && e.status === 404) return null;
        throw e;
      }
    },
    viewer: () => request<User>("/user"),
    user: (login: string) => request<User>(`/users/${enc(login)}`),
    userRepositories: (login: string, page = 1) =>
      request<Repository[]>(
        `/users/${enc(login)}/repos?sort=pushed&per_page=50&page=${page}`,
      ),
    userStarred: (login: string, page = 1) =>
      request<Repository[]>(
        `/users/${enc(login)}/starred?per_page=50&page=${page}`,
      ),
    userConnections: (
      login: string,
      kind: "followers" | "following",
      page = 1,
    ) =>
      request<User[]>(`/users/${enc(login)}/${kind}?per_page=50&page=${page}`),
    repositoryTree: (repo: string, ref: string) =>
      loadRepositoryTree(request, repo, ref),
    repositories: (page = 1) =>
      request<Repository[]>(
        `/user/repos?sort=pushed&per_page=50&page=${page}&affiliation=owner,collaborator,organization_member`,
      ),
    starred: (page = 1) =>
      request<Repository[]>(
        `/user/starred?sort=updated&per_page=50&page=${page}`,
      ),
    searchRepos: (query: string, page = 1) =>
      request<{ items: Repository[]; total_count: number }>(
        `/search/repositories?q=${enc(query)}&per_page=50&page=${page}`,
      ),
    issues: (login: string, kind: "issue" | "pr", state = "open", page = 1) =>
      request<{ items: Issue[]; total_count: number }>(
        `/search/issues?q=${enc(`is:${kind} involves:${login} is:${state}`)}&sort=updated&per_page=50&page=${page}`,
      ),
    repo: (repo: string) => request<Repository>(`/repos/${repoPath(repo)}`),
    contents: (repo: string, path = "", ref?: string) =>
      request<Content[] | Content>(
        `/repos/${repoPath(repo)}/contents${path ? "/" + path.split("/").map(enc).join("/") : ""}${ref ? "?ref=" + enc(ref) : ""}`,
      ),
    branches: (repo: string, page = 1) =>
      request<{ name: string }[]>(
        `/repos/${repoPath(repo)}/branches?per_page=100&page=${page}`,
      ),
    commits: (repo: string, ref: string, page = 1) =>
      request<Commit[]>(
        `/repos/${repoPath(repo)}/commits?sha=${enc(ref)}&per_page=50&page=${page}`,
      ),
    repoIssues: (
      repo: string,
      kind: "issues" | "pulls",
      state = "open",
      page = 1,
    ) =>
      request<Issue[]>(
        `/repos/${repoPath(repo)}/${kind}?state=${enc(state)}&sort=updated&per_page=50&page=${page}`,
      ),
    issue: (repo: string, number: number, pull = false) =>
      request<Issue>(
        `/repos/${repoPath(repo)}/${pull ? "pulls" : "issues"}/${number}`,
      ),
    comments: (repo: string, number: number, page = 1) =>
      request<Comment[]>(
        `/repos/${repoPath(repo)}/issues/${number}/comments?per_page=100&page=${page}`,
      ),
    diff: (repo: string, number: number, page = 1) =>
      request<DiffFile[]>(
        `/repos/${repoPath(repo)}/pulls/${number}/files?per_page=100&page=${page}`,
      ),
    pullChecks: (repo: string, sha: string) =>
      loadPullChecks(request, repo, sha),
    mergePull: (
      repo: string,
      number: number,
      sha: string,
      merge_method: "merge" | "squash" | "rebase",
    ) =>
      request<{ merged: boolean; message: string; sha: string }>(
        `/repos/${repoPath(repo)}/pulls/${number}/merge`,
        { method: "PUT", body: JSON.stringify({ sha, merge_method }) },
      ),
    pullCommits: (repo: string, number: number, page = 1) =>
      request<Commit[]>(
        `/repos/${repoPath(repo)}/pulls/${number}/commits?per_page=100&page=${page}`,
      ),
    comment: (repo: string, number: number, body: string) =>
      request<Comment>(`/repos/${repoPath(repo)}/issues/${number}/comments`, {
        method: "POST",
        body: JSON.stringify({ body }),
      }),
    createIssue: (repo: string, title: string, body: string) =>
      request<Issue>(`/repos/${repoPath(repo)}/issues`, {
        method: "POST",
        body: JSON.stringify({ title, body }),
      }),
    setIssueState: (repo: string, number: number, state: "open" | "closed") =>
      request<Issue>(`/repos/${repoPath(repo)}/issues/${number}`, {
        method: "PATCH",
        body: JSON.stringify({ state }),
      }),
    isStarred: async (repo: string) => {
      try {
        await request(`/user/starred/${repoPath(repo)}`);
        return true;
      } catch (e) {
        if (e instanceof GitHubError && e.status === 404) return false;
        throw e;
      }
    },
    star: (repo: string, starred: boolean) =>
      request<void>(`/user/starred/${repoPath(repo)}`, {
        method: starred ? "PUT" : "DELETE",
      }),
    notifications: (page = 1) =>
      request<Notification[]>(`/notifications?per_page=50&page=${page}`),
    markRead: (id: string) =>
      request<void>(`/notifications/threads/${enc(id)}`, { method: "PATCH" }),
  };
}
export type GitHubClient = ReturnType<typeof createClient>;
export function tokenTransport(token: string): Transport {
  return (path, init) =>
    fetch(`https://api.github.com${path}`, {
      ...init,
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
}
export function decodeContent(content: string) {
  const bytes = Uint8Array.from(atob(content.replace(/\s/g, "")), (c) =>
    c.charCodeAt(0),
  );
  return new TextDecoder().decode(bytes);
}
export { fileFormat, mimeType } from "./formats";
export { githubImagePath, imageDimensions } from "./media";

export {
  loadRepositoryTree,
  treeFiles,
  type RepositoryTree,
  type TreeEntry,
} from "./tree";
