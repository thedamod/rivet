import type { Repository } from "./index";
export type ProfileExtras = {
  pinned: Repository[];
  total: number;
  weeks: {
    contributionDays: {
      date: string;
      contributionCount: number;
      contributionLevel: string;
    }[];
  }[];
  commits: { repo: string; date: string; count: number; url: string }[];
  pullRequests: { repo: string; date: string; url: string; title: string }[];
  months: {
    month: string;
    commits: { repo: string; count: number; url: string }[];
    pullRequests: { repo: string; date: string; url: string; title: string }[];
  }[];
  errors: string[];
};
export async function loadProfileExtras(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  login: string,
): Promise<ProfileExtras> {
  const result = await request<any>("/graphql", {
    method: "POST",
    body: JSON.stringify({
      query: `query Profile($login:String!){user(login:$login){pinnedItems(first:6,types:REPOSITORY){nodes{... on Repository{databaseId name nameWithOwner description isPrivate isFork url stargazerCount forkCount updatedAt pushedAt defaultBranchRef{name} owner{login avatarUrl url} primaryLanguage{name}}}} contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount contributionLevel}}} commitContributionsByRepository(maxRepositories:100){repository{nameWithOwner url} contributions(first:100){nodes{occurredAt commitCount url}}} pullRequestContributionsByRepository(maxRepositories:100){repository{nameWithOwner} contributions(first:100){nodes{occurredAt pullRequest{url title}}}}}}}`,
      variables: { login },
    }),
  });
  const user = result.data?.user;
  if (!user)
    throw new Error(
      result.errors?.map((e: any) => e.message).join("; ") ||
        "Profile contribution data unavailable",
    );
  const collection = user.contributionsCollection;
  const commits: ProfileExtras["commits"] = (
    collection?.commitContributionsByRepository || []
  )
    .flatMap((r: any) =>
      (r.contributions?.nodes || []).map((c: any) => ({
        repo: r.repository.nameWithOwner,
        date: c.occurredAt,
        count: c.commitCount,
        url: c.url,
      })),
    )
    .sort((a: any, b: any) => b.date.localeCompare(a.date));
  const pullRequests: ProfileExtras["pullRequests"] = (
    collection?.pullRequestContributionsByRepository || []
  )
    .flatMap((r: any) =>
      (r.contributions?.nodes || [])
        .filter((c: any) => c.pullRequest)
        .map((c: any) => ({
          repo: r.repository.nameWithOwner,
          date: c.occurredAt,
          url: c.pullRequest.url,
          title: c.pullRequest.title,
        })),
    )
    .sort((a: any, b: any) => b.date.localeCompare(a.date));
  const monthMap = new Map<string, ProfileExtras["months"][number]>();
  const monthFor = (date: string) => {
    const month = date.slice(0, 7);
    if (!monthMap.has(month))
      monthMap.set(month, { month, commits: [], pullRequests: [] });
    return monthMap.get(month)!;
  };
  for (const commit of commits) {
    const month = monthFor(commit.date);
    const repo = month.commits.find((item) => item.repo === commit.repo);
    if (repo) repo.count += commit.count;
    else
      month.commits.push({
        repo: commit.repo,
        count: commit.count,
        url: commit.url,
      });
  }
  for (const pr of pullRequests) monthFor(pr.date).pullRequests.push(pr);
  const months = [...monthMap.values()].sort((a, b) =>
    b.month.localeCompare(a.month),
  );
  for (const month of months)
    month.commits.sort(
      (a, b) => b.count - a.count || a.repo.localeCompare(b.repo),
    );
  return {
    pinned: (user.pinnedItems?.nodes || []).filter(Boolean).map(
      (r: any) =>
        ({
          id: r.databaseId,
          name: r.name,
          full_name: r.nameWithOwner,
          description: r.description,
          private: r.isPrivate,
          fork: r.isFork,
          archived: false,
          language: r.primaryLanguage?.name || null,
          stargazers_count: r.stargazerCount,
          forks_count: r.forkCount,
          open_issues_count: 0,
          default_branch: r.defaultBranchRef?.name || "HEAD",
          updated_at: r.updatedAt,
          pushed_at: r.pushedAt,
          html_url: r.url,
          owner: {
            login: r.owner.login,
            avatar_url: r.owner.avatarUrl,
            html_url: r.owner.url,
          },
        }) as Repository,
    ),
    total: collection?.contributionCalendar.totalContributions || 0,
    weeks: collection?.contributionCalendar.weeks || [],
    commits,
    pullRequests,
    months,
    errors: result.errors?.map((e: any) => e.message) || [],
  };
}
