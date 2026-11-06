import type { ProfileExtras } from "./profile";
export const contributionLevels = [
  "NONE",
  "FIRST_QUARTILE",
  "SECOND_QUARTILE",
  "THIRD_QUARTILE",
  "FOURTH_QUARTILE",
];
export function contributionLevel(level: string) {
  return Math.max(0, contributionLevels.indexOf(level));
}
export function currentMonth(now = new Date()) {
  return now.toISOString().slice(0, 7);
}
export function profileMonths(data: ProfileExtras) {
  return [
    ...new Set([
      currentMonth(),
      ...data.weeks.flatMap((week) =>
        week.contributionDays.map((day) => day.date.slice(0, 7)),
      ),
    ]),
  ]
    .sort()
    .reverse();
}
export function profilePeriod(
  data: ProfileExtras,
  month: string,
  date?: string | null,
) {
  const inPeriod = (value: string) =>
    date ? value.slice(0, 10) === date : value.slice(0, 7) === month;
  const repositories = new Map<
    string,
    { repo: string; url: string; count: number }
  >();
  for (const commit of data.commits.filter((item) => inPeriod(item.date))) {
    const existing = repositories.get(commit.repo);
    if (existing) existing.count += commit.count;
    else
      repositories.set(commit.repo, {
        repo: commit.repo,
        url: commit.url,
        count: commit.count,
      });
  }
  const commits = [...repositories.values()].sort(
    (a, b) => b.count - a.count || a.repo.localeCompare(b.repo),
  );
  return {
    contributions: data.weeks
      .flatMap((week) => week.contributionDays)
      .filter((day) => inPeriod(day.date))
      .reduce((sum, day) => sum + day.contributionCount, 0),
    commitCount: commits.reduce((sum, repo) => sum + repo.count, 0),
    commits,
    pullRequests: data.pullRequests.filter((item) => inPeriod(item.date)),
  };
}
