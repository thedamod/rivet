import { test } from "node:test";
import assert from "node:assert/strict";
import { currentMonth, profilePeriod, contributionLevel } from "./activity";
import type { ProfileExtras } from "./profile";
const data: ProfileExtras = {
  total: 8,
  totals: {
    commits: 7,
    pullRequests: 1,
    issues: 0,
    reviews: 0,
    repositories: 0,
  },
  pinned: [],
  errors: [],
  months: [],
  weeks: [
    {
      contributionDays: [
        {
          date: "2026-11-06",
          contributionCount: 3,
          contributionLevel: "FIRST_QUARTILE",
        },
        {
          date: "2026-10-31",
          contributionCount: 5,
          contributionLevel: "FOURTH_QUARTILE",
        },
      ],
    },
  ],
  commits: [
    {
      repo: "a/repo",
      date: "2026-11-06T10:00:00Z",
      count: 2,
      url: "https://github.com/a/repo",
    },
    {
      repo: "a/repo",
      date: "2026-10-31T10:00:00Z",
      count: 5,
      url: "https://github.com/a/repo",
    },
  ],
  pullRequests: [
    {
      repo: "a/repo",
      date: "2026-11-06T10:00:00Z",
      title: "Change",
      url: "https://github.com/a/repo/pull/1",
    },
  ],
};
test("profile activity defaults to the UTC current month and keeps empty months empty", () => {
  assert.equal(currentMonth(new Date("2026-12-01T00:30:00Z")), "2026-12");
  assert.equal(profilePeriod(data, "2026-12").contributions, 0);
  assert.equal(profilePeriod(data, "2026-12").commits.length, 0);
  assert.equal(profilePeriod(data, "2026-11").commitCount, 2);
  assert.equal(profilePeriod(data, "2026-10").commitCount, 5);
});
test("selecting a contribution day filters both commits and pull requests", () => {
  const selected = profilePeriod(data, "2026-11", "2026-11-06");
  assert.equal(selected.contributions, 3);
  assert.equal(selected.commitCount, 2);
  assert.equal(selected.pullRequests.length, 1);
  assert.equal(profilePeriod(data, "2026-11", "2026-11-05").commitCount, 0);
  assert.equal(contributionLevel("FIRST_QUARTILE"), 1);
  assert.equal(contributionLevel("unknown"), 0);
});
