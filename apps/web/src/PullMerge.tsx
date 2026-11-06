import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GitMerge } from "lucide-react";
import { Button, Modal } from "./ui/primitives";
import { api } from "./api";
import type { Issue } from "@git-client/github";
import { ErrorBox } from "./components";
export function PullMerge({
  repo,
  number,
  issue,
}: {
  repo: string;
  number: number;
  issue: Issue & { head?: { sha: string } };
}) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<"merge" | "squash" | "rebase">("squash");
  const client = useQueryClient();
  const settings = useQuery({
    queryKey: ["merge-settings", repo],
    queryFn: () => api.repo(repo),
  });
  const methods = (
    [
      ["squash", "Squash and merge", settings.data?.allow_squash_merge],
      ["merge", "Create merge commit", settings.data?.allow_merge_commit],
      ["rebase", "Rebase and merge", settings.data?.allow_rebase_merge],
    ] as const
  ).filter((m) => m[2] !== false);
  const chosen = methods.some((m) => m[0] === method)
    ? method
    : methods[0]?.[0];
  const blocked = issue.draft
    ? "Draft pull request"
    : issue.mergeable === false
      ? "Resolve conflicts before merging"
      : settings.isPending
        ? "Loading merge permissions"
        : settings.error
          ? "Could not load merge permissions"
          : !settings.data?.permissions?.push
            ? "Repository write access required"
            : !issue.head?.sha
              ? "Loading head revision"
              : !chosen
                ? "Merging is disabled for this repository"
                : undefined;
  const merge = useMutation({
    mutationFn: async () => {
      if (blocked || !chosen || !issue.head?.sha)
        throw new Error(blocked || "Merge unavailable");
      const result = await api.mergePull(repo, number, issue.head.sha, chosen);
      if (!result.merged) throw new Error(result.message);
      return result;
    },
    onSuccess: () => {
      setOpen(false);
      client.invalidateQueries({ queryKey: ["issue", repo, number] });
      client.invalidateQueries({ queryKey: ["pr-timeline", repo, number] });
      client.invalidateQueries({ queryKey: ["personal"] });
      client.invalidateQueries({ queryKey: ["repo-issues"] });
    },
  });
  if (issue.state !== "open" || issue.merged_at) return null;
  return (
    <>
      <Button
        className="primary pr-merge-button"
        title={blocked || "Merge pull request"}
        aria-label="Merge pull request"
        aria-disabled={!!blocked}
        onClick={() => setOpen(true)}
      >
        <GitMerge size={14} />
        Merge
      </Button>
      <Modal
        open={open}
        onOpenChange={(v) => {
          if (!merge.isPending) setOpen(v);
        }}
        title="Merge pull request"
      >
        <div className="t3-issue-form">
          <h2>Merge #{number}</h2>
          <p>{issue.title}</p>
          <div role="radiogroup" aria-label="Merge method">
            {methods.map(([id, label]) => (
              <Button
                key={id}
                role="radio"
                aria-checked={chosen === id}
                className={
                  chosen === id ? "merge-method selected" : "merge-method"
                }
                onClick={() => setMethod(id)}
              >
                {label}
              </Button>
            ))}
          </div>
          {blocked && <p role="status">{blocked}</p>}
          {merge.error && <ErrorBox error={merge.error} />}
          <div className="dialog-actions">
            <Button disabled={merge.isPending} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              className="primary"
              disabled={!!blocked || merge.isPending}
              onClick={() => merge.mutate()}
            >
              {merge.isPending ? "Merging…" : "Confirm merge"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
