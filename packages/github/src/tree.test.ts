import { test } from "node:test";
import assert from "node:assert/strict";
import { loadRepositoryTree, treeFiles } from "./tree";
test("pins a complete nested tree to one commit for slash-containing branches", async () => {
  const paths: string[] = [];
  const request = async <T>(path: string): Promise<T> => {
    paths.push(path);
    return (
      path.includes("/commits?")
        ? [{ sha: "commit-1", commit: { tree: { sha: "tree-1" } } }]
        : {
            sha: "tree-1",
            truncated: false,
            tree: [
              { path: "src", sha: "tree-2", type: "tree" },
              { path: "src/app.tsx", sha: "blob-1", type: "blob", size: 42 },
            ],
          }
    ) as T;
  };
  const tree = await loadRepositoryTree(request, "owner/repo", "feature/topic");
  assert.equal(tree.revision, "commit-1");
  assert.equal(tree.sha, "tree-1");
  assert.equal(
    paths[0],
    "/repos/owner/repo/commits?sha=feature%2Ftopic&per_page=1",
  );
  assert.equal(paths[1], "/repos/owner/repo/git/trees/tree-1?recursive=1");
  assert.deepEqual(
    treeFiles(tree).map((f) => [f.path, f.type]),
    [
      ["src", "dir"],
      ["src/app.tsx", "file"],
    ],
  );
});
test("walks complete directory responses when GitHub truncates the recursive result", async () => {
  const request = async <T>(path: string): Promise<T> => {
    if (path.includes("/commits?"))
      return [{ sha: "revision", commit: { tree: { sha: "root" } } }] as T;
    if (path.endsWith("?recursive=1"))
      return { sha: "root", truncated: true, tree: [] } as T;
    if (path.endsWith("/root"))
      return {
        sha: "root",
        truncated: false,
        tree: [
          { path: "src", sha: "nested", type: "tree" },
          { path: "README.md", sha: "readme", type: "blob" },
        ],
      } as T;
    return {
      sha: "nested",
      truncated: false,
      tree: [{ path: "index.ts", sha: "source", type: "blob" }],
    } as T;
  };
  const result = await loadRepositoryTree(request, "owner/repo", "main");
  assert.equal(result.truncated, false);
  assert.equal(result.revision, "revision");
  assert.deepEqual(
    result.tree.map((f) => f.path),
    ["src", "README.md", "src/index.ts"],
  );
});
