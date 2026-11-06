import type { Issue } from "@rivet/github";
import type { AppIconName } from "./AppIcon";
export function issueIcon(
  issue: Issue,
  pull = !!issue.pull_request,
): AppIconName {
  if (!pull)
    return issue.state === "closed"
      ? "checkmark-circle-outline"
      : "ellipse-outline";
  if (issue.merged_at || issue.pull_request?.merged_at)
    return "git-merge-outline";
  if (issue.draft) return "git-pull-request-draft";
  return issue.state === "closed"
    ? "git-pull-request-closed"
    : "git-pull-request-outline";
}
