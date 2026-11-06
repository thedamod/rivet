import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient, GitHubError } from "./index";
test("CI permission failures preserve accessible commit statuses", async () => {
  const api = createClient(
    async (path) =>
      new Response(
        JSON.stringify(
          path.includes("check-runs")
            ? { message: "Resource not accessible by personal access token" }
            : {
                statuses: [
                  {
                    id: 1,
                    context: "Vercel",
                    state: "success",
                    target_url: "https://example.com/check",
                  },
                ],
              },
        ),
        { status: path.includes("check-runs") ? 403 : 200 },
      ),
  );
  const result = await api.pullChecks("owner/repo", "abc");
  assert.equal(result.restricted, true);
  assert.deepEqual(
    result.items.map((c) => [c.name, c.state]),
    [["Vercel", "success"]],
  );
});
test("CI authentication errors are not treated as missing permissions", async () => {
  const api = createClient(
    async () =>
      new Response(JSON.stringify({ message: "Bad credentials" }), {
        status: 401,
      }),
  );
  await assert.rejects(
    api.pullChecks("owner/repo", "abc"),
    (e) => e instanceof GitHubError && e.status === 401,
  );
});
test("merge sends the reviewed head SHA and chosen method", async () => {
  let call: any;
  const api = createClient(async (path, init) => {
    call = { path, init };
    return new Response(
      JSON.stringify({ merged: true, sha: "merged", message: "Merged" }),
      { status: 200 },
    );
  });
  await api.mergePull("owner/repo", 14, "reviewed-sha", "squash");
  assert.equal(call.path, "/repos/owner/repo/pulls/14/merge");
  assert.equal(call.init.method, "PUT");
  assert.deepEqual(JSON.parse(call.init.body), {
    sha: "reviewed-sha",
    merge_method: "squash",
  });
});
test("denied CI endpoints return a scoped permission state instead of a PR error", async () => {
  const api = createClient(
    async () =>
      new Response(
        JSON.stringify({
          message: "Resource not accessible by personal access token",
        }),
        { status: 403 },
      ),
  );
  const checks = await api.pullChecks("owner/repo", "sha");
  assert.deepEqual(checks.items, []);
  assert.equal(checks.restricted, true);
  assert.equal(checks.partial, true);
});
