import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "./index";
test("profile pins and contribution history use GraphQL variables and preserve API data", async () => {
  let input: any;
  const api = createClient(async (path, init) => {
    assert.equal(path, "/graphql");
    input = JSON.parse(String(init?.body));
    return new Response(
      JSON.stringify({
        data: {
          user: {
            pinnedItems: { nodes: [] },
            contributionsCollection: {
              contributionCalendar: {
                totalContributions: 42,
                weeks: [
                  {
                    contributionDays: [
                      {
                        date: "2026-11-06",
                        contributionCount: 2,
                        contributionLevel: "FIRST_QUARTILE",
                      },
                    ],
                  },
                ],
              },
              commitContributionsByRepository: [
                {
                  repository: { nameWithOwner: "a/repo" },
                  contributions: {
                    nodes: [
                      {
                        occurredAt: "2026-11-06",
                        commitCount: 2,
                        url: "https://github.com/a/repo/commits",
                      },
                    ],
                  },
                },
              ],
            },
          },
        },
      }),
      { status: 200 },
    );
  });
  const result = await api.profileExtras("a");
  assert.deepEqual(input.variables, { login: "a" });
  assert.equal(result.total, 42);
  assert.equal(result.weeks[0].contributionDays[0].contributionCount, 2);
  assert.equal(result.commits[0].count, 2);
});
test("GraphQL permission errors do not turn into a fake empty profile", async () => {
  const api = createClient(
    async () =>
      new Response(
        JSON.stringify({ errors: [{ message: "Access denied" }], data: null }),
        { status: 200 },
      ),
  );
  await assert.rejects(api.profileExtras("a"), /Access denied/);
});
test("profile README uses the README endpoint and treats only a missing resource as absent", async () => {
  let requested = "";
  const api = createClient(async (path) => {
    requested = path;
    return new Response(JSON.stringify({ message: "Not Found" }), {
      status: 404,
    });
  });
  assert.equal(await api.profileReadme("a"), null);
  assert.equal(requested, "/repos/a/a/readme");
});
