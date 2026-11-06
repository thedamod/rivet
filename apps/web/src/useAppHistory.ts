import { useEffect, useRef } from "react";
import type { Repository, Issue } from "@git-client/github";
import { api } from "./api";
export type AppRoute = {
  profile: string | null;
  view: string;
  repo: Repository | null;
  issue: {
    repo: string;
    number: number;
    pull: boolean;
    initial?: Issue;
  } | null;
};
const routeKey = (r: AppRoute) =>
  r.profile
    ? `/profile/${encodeURIComponent(r.profile)}`
    : r.issue
      ? `/${r.issue.pull ? "pull" : "issue"}/${r.issue.repo}/${r.issue.number}`
      : r.repo
        ? `/repo/${r.repo.full_name}`
        : `/${r.view}`;
export function useAppHistory(route: AppRoute, restore: (r: AppRoute) => void) {
  const current = useRef(route);
  current.current = route;
  const apply = useRef(restore);
  apply.current = restore;
  const skip = useRef<string | null>(null);
  const initialized = useRef(false);
  const depth = useRef(0);
  const key = routeKey(route);
  useEffect(() => {
    const read = async () => {
      const saved = history.state?.gitClientRoute as AppRoute | undefined;
      if (saved) {
        depth.current = history.state.depth || 0;
        skip.current =
          routeKey(saved) === routeKey(current.current)
            ? null
            : routeKey(saved);
        apply.current(saved);
        return;
      }
      const parts = location.hash
        .replace(/^#\/?/, "")
        .split("?")[0]
        .split("/")
        .map(decodeURIComponent);
      let next: AppRoute = {
        profile: null,
        view: "repositories",
        repo: null,
        issue: null,
      };
      if (parts[0] === "profile" && parts[1]) next.profile = parts[1];
      else if (["pull", "issue"].includes(parts[0]) && parts.length === 4)
        next.issue = {
          repo: `${parts[1]}/${parts[2]}`,
          number: Number(parts[3]),
          pull: parts[0] === "pull",
        };
      else if (parts[0] === "repo" && parts.length === 3) {
        try {
          next.repo = await api.repo(`${parts[1]}/${parts[2]}`);
        } catch {
          return;
        }
      } else if (
        [
          "repositories",
          "starred",
          "pulls",
          "issues",
          "notifications",
          "settings",
        ].includes(parts[0])
      )
        next.view = parts[0];
      skip.current = routeKey(next);
      history.replaceState(
        { gitClientRoute: next, depth: 0 },
        "",
        `#${routeKey(next)}${location.hash.includes("?") ? "?" + location.hash.split("?")[1] : ""}`,
      );
      apply.current(next);
    };
    void read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, []);
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      if (skip.current === key) skip.current = null;
      return;
    }
    if (skip.current === key) {
      skip.current = null;
      return;
    }
    depth.current = (history.state?.depth || 0) + 1;
    history.pushState(
      { gitClientRoute: current.current, depth: depth.current },
      "",
      `#${key}`,
    );
    document.querySelector(".main")?.scrollTo(0, 0);
  }, [key]);
  return () => {
    if ((history.state?.depth || 0) > 0) history.back();
    else
      apply.current({
        profile: null,
        repo: null,
        issue: null,
        view: "repositories",
      });
  };
}
