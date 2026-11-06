export type CheckState =
  | "success"
  | "failure"
  | "cancelled"
  | "skipped"
  | "neutral"
  | "action-required"
  | "pending";
export type PullCheck = {
  id: string;
  name: string;
  state: CheckState;
  url: string | null;
};
export type PullChecks = {
  items: PullCheck[];
  restricted: boolean;
  partial: boolean;
};
export function checkLabel(state: CheckState) {
  return {
    success: "Passed",
    failure: "Failed",
    cancelled: "Cancelled",
    skipped: "Skipped",
    pending: "Running",
    neutral: "Neutral",
    "action-required": "Awaiting action",
  }[state];
}
export async function loadPullChecks(
  request: <T>(path: string) => Promise<T>,
  repo: string,
  sha: string,
): Promise<PullChecks> {
  const root = `/repos/${repo.split("/").map(encodeURIComponent).join("/")}/commits/${encodeURIComponent(sha)}`;
  const [runs, statuses] = await Promise.allSettled([
    (async () => {
      const all: PullCheck[] = [];
      for (let page = 1; ; page++) {
        const r = await request<{
          check_runs: {
            id: number;
            name: string;
            status: string;
            conclusion: string | null;
            html_url: string;
          }[];
        }>(`${root}/check-runs?per_page=100&page=${page}`);
        all.push(
          ...r.check_runs.map((c) => ({
            id: `run-${c.id}`,
            name: c.name,
            url: c.html_url,
            state: (c.status !== "completed"
              ? "pending"
              : c.conclusion === "success"
                ? "success"
                : ["skipped", "neutral", "action_required"].includes(
                      c.conclusion || "",
                    )
                  ? c.conclusion === "action_required"
                    ? "action-required"
                    : c.conclusion
                  : c.conclusion === "cancelled"
                    ? "cancelled"
                    : "failure") as CheckState,
          })),
        );
        if (r.check_runs.length < 100) return all;
      }
    })(),
    (async () => {
      const all: PullCheck[] = [];
      for (let page = 1; ; page++) {
        const r = await request<{
          statuses: {
            id: number;
            context: string;
            state: string;
            target_url: string | null;
          }[];
        }>(`${root}/status?per_page=100&page=${page}`);
        all.push(
          ...r.statuses.map((c) => ({
            id: `status-${c.id}`,
            name: c.context,
            url: c.target_url,
            state: (c.state === "success"
              ? "success"
              : c.state === "pending"
                ? "pending"
                : "failure") as CheckState,
          })),
        );
        if (r.statuses.length < 100) return all;
      }
    })(),
  ]);
  // A permission failure is local to CI. Authentication, rate limits and network failures remain errors.
  const denied = (e: unknown) =>
    !!e &&
    typeof e === "object" &&
    "status" in e &&
    e.status === 403 &&
    "message" in e &&
    /resource not accessible|permission|integration/i.test(String(e.message));
  const rejected = [runs, statuses].filter((r) => r.status === "rejected");
  if (
    runs.status === "rejected" &&
    statuses.status === "rejected" &&
    !rejected.every((r) => r.status === "rejected" && denied(r.reason))
  )
    throw runs.reason;
  return {
    items: [
      ...(runs.status === "fulfilled" ? runs.value : []),
      ...(statuses.status === "fulfilled" ? statuses.value : []),
    ],
    partial: rejected.length > 0,
    restricted: rejected.some(
      (r) => r.status === "rejected" && denied(r.reason),
    ),
  };
}
