import {
  CircleCheck,
  CircleDot,
  GitMerge,
  GitPullRequestArrow,
  GitPullRequestClosed,
  GitPullRequestDraft,
} from "lucide-react";
import type { Issue } from "@git-client/github";
/** T3 pullRequestIcons.tsx uses a different glyph and tone for every PR state. */
export function IssueGlyph({
  issue,
  pull = !!issue.pull_request,
  size = 16,
}: {
  issue: Issue;
  pull?: boolean;
  size?: number;
}) {
  const state =
    issue.merged_at || issue.pull_request?.merged_at
      ? "merged"
      : issue.draft
        ? "draft"
        : issue.state === "closed"
          ? "closed"
          : "open";
  const Icon = pull
    ? {
        merged: GitMerge,
        draft: GitPullRequestDraft,
        closed: GitPullRequestClosed,
        open: GitPullRequestArrow,
      }[state]
    : state === "open"
      ? CircleDot
      : CircleCheck;
  return (
    <Icon
      size={size}
      className={`issue-state-icon state-${state}`}
      aria-label={state}
    />
  );
}
