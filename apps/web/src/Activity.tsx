import { useState } from "react";
import {
  ChevronDown,
  GitCommitHorizontal,
  MessageSquare,
  ArrowUpDown,
  Filter,
} from "lucide-react";
import { Menu } from "@base-ui/react/menu";
import { Button } from "./ui/primitives";
import { Markdown, Time } from "./components";
export type ActivityEvent = {
  id?: number;
  sha?: string;
  event: string;
  message?: string;
  body?: string | null;
  actor?: { login: string; avatar_url: string; type?: string } | null;
  user?: { login: string; avatar_url: string; type?: string } | null;
  author?: {
    name?: string;
    login?: string;
    avatar_url?: string;
    date?: string;
  };
  committer?: { name: string; date?: string };
  created_at?: string;
  submitted_at?: string;
  commit_id?: string;
  state?: string;
};
export type ActivityFilter = "all" | "people" | "bots";
export function ActivityControls({
  filter,
  onFilter,
  newest,
  onOrder,
}: {
  filter: ActivityFilter;
  onFilter: (v: ActivityFilter) => void;
  newest: boolean;
  onOrder: () => void;
}) {
  return (
    <div className="activity-controls">
      <Menu.Root>
        <Menu.Trigger
          render={
            <Button title="Filter activity" className="activity-control" />
          }
        >
          <Filter size={12} />
          Filter
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner
            align="end"
            sideOffset={4}
            className="t3-popup-positioner"
          >
            <Menu.Popup className="t3-menu">
              <div className="t3-menu-items">
                {(["all", "people", "bots"] as const).map((v) => (
                  <Menu.Item
                    className="t3-menu-item"
                    key={v}
                    onClick={() => onFilter(v)}
                  >
                    {v === "all"
                      ? "All comments"
                      : v === "people"
                        ? "People"
                        : "Bots"}
                    {filter === v ? " ✓" : ""}
                  </Menu.Item>
                ))}
              </div>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      <Button
        className="activity-control"
        onClick={onOrder}
        title="Reverse order"
      >
        <ArrowUpDown size={12} />
        {newest ? "Newest first" : "Oldest first"}
      </Button>
    </div>
  );
}
export const isBot = (e: ActivityEvent) => {
  const actor = e.actor || e.user;
  return (
    actor?.type === "Bot" ||
    /\[bot\]$|^(vercel|dependabot|github-actions)$/i.test(actor?.login || "")
  );
};
export function filterActivity(
  events: ActivityEvent[],
  filter: ActivityFilter,
  newest: boolean,
) {
  const result = events.filter(
    (e) => filter === "all" || (filter === "bots" ? isBot(e) : !isBot(e)),
  );
  result.sort(
    (a, b) =>
      (Date.parse(a.created_at || a.submitted_at || a.author?.date || "") ||
        0) -
      (Date.parse(b.created_at || b.submitted_at || b.author?.date || "") || 0),
  );
  return newest ? result.reverse() : result;
}
export function ActivityRow({
  event: e,
  repo,
}: {
  event: ActivityEvent;
  repo: string;
}) {
  const actor = e.actor || e.user || e.author;
  const name =
    actor && "login" in actor
      ? actor.login
      : actor && "name" in actor
        ? actor.name
        : "";
  const bot = isBot(e);
  const [open, setOpen] = useState(!bot);
  const date = e.created_at || e.submitted_at || e.author?.date;
  return (
    <article
      className={`activity-row ${bot ? "bot-activity" : ""} ${e.body ? "comment-activity" : ""}`}
    >
      <div className="activity-node">
        {actor?.avatar_url ? (
          <img src={actor.avatar_url} alt="" width={24} height={24} />
        ) : e.body ? (
          <MessageSquare size={16} />
        ) : (
          <GitCommitHorizontal size={16} />
        )}
      </div>
      <div className="activity-content">
        {e.body ? (
          <>
            <Button
              className="activity-comment-heading"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              <strong>{name}</strong>
              <span>commented</span>
              {date && <Time value={date} />}
              <ChevronDown
                size={12}
                style={{ rotate: open ? "0deg" : "-90deg" }}
              />
            </Button>
            {open && (
              <Markdown baseUrl={`https://github.com/${repo}/`}>
                {e.body}
              </Markdown>
            )}
          </>
        ) : (
          <>
            <div className="activity-commit-title">
              {e.message?.split("\n")[0] ||
                `${name || ""} ${e.event.replaceAll("_", " ")}`}
            </div>
            <div className="activity-commit-meta">
              <code>{(e.sha || e.commit_id || "").slice(0, 7)}</code>
              {date && <Time value={date} />}
            </div>
          </>
        )}
      </div>
    </article>
  );
}
