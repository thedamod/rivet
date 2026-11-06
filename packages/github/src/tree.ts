export interface TreeEntry {
  path: string;
  sha: string;
  type: "tree" | "blob" | "commit";
  size?: number;
  mode?: string;
}
export interface RepositoryTree {
  sha: string;
  revision: string;
  tree: TreeEntry[];
  truncated: boolean;
}
type Request = <T>(path: string) => Promise<T>;
/** Resolve a ref once so a moving branch cannot mix revisions in the explorer. */
export async function loadRepositoryTree(
  request: Request,
  repo: string,
  ref: string,
): Promise<RepositoryTree> {
  const prefix = "/repos/" + repo.split("/").map(encodeURIComponent).join("/");
  const commits = await request<
    { sha: string; commit: { tree: { sha: string } } }[]
  >(`${prefix}/commits?sha=${encodeURIComponent(ref)}&per_page=1`);
  if (!commits.length)
    return { sha: "", revision: "", tree: [], truncated: false };
  const sha = commits[0].commit.tree.sha;
  const snapshot = await request<RepositoryTree>(
    `${prefix}/git/trees/${sha}?recursive=1`,
  );
  if (!snapshot.truncated) return { ...snapshot, revision: commits[0].sha };
  // GitHub caps recursive responses. Walk complete directory trees rather than silently losing files.
  const queue = [{ sha, path: "" }];
  const tree: TreeEntry[] = [];
  while (queue.length) {
    const batch = queue.splice(0, 4);
    const results = await Promise.all(
      batch.map(async (directory) => ({
        directory,
        result: await request<RepositoryTree>(
          `${prefix}/git/trees/${directory.sha}`,
        ),
      })),
    );
    for (const { directory, result } of results) {
      if (result.truncated)
        throw new Error("GitHub could not return the complete directory tree.");
      for (const item of result.tree) {
        const path = [directory.path, item.path].filter(Boolean).join("/");
        tree.push({ ...item, path });
        if (item.type === "tree") queue.push({ sha: item.sha, path });
      }
    }
  }
  return { sha, revision: commits[0].sha, tree, truncated: false };
}
export function treeFiles(tree: RepositoryTree) {
  return tree.tree.map((entry) => ({
    name: entry.path.split("/").at(-1)!,
    path: entry.path,
    type:
      entry.type === "tree"
        ? "dir"
        : entry.type === "commit"
          ? "submodule"
          : "file",
    sha: entry.sha,
    size: entry.size || 0,
  }));
}
