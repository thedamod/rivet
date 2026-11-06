import { useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  GitCommitHorizontal,
  GitPullRequest,
  CircleDot,
  MessageSquare,
  BookOpen,
  X,
} from "lucide-react";
import {
  contributionLevel,
  currentMonth,
  profileMonths,
  profilePeriod,
  type ProfileExtras,
} from "@rivet/github";
import { Button, Hint } from "./ui/primitives";
import { openExternal } from "./api";
const monthLabel = (month: string) =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
const dateLabel = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
function ContributionCalendar({
  data,
  selected,
  onSelect,
}: {
  data: ProfileExtras;
  selected: string | null;
  onSelect: (day: string) => void;
}) {
  const days = useMemo(
    () => data.weeks.flatMap((week) => week.contributionDays),
    [data],
  );
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const [focused, setFocused] = useState("");
  const [hovered, setHovered] = useState<(typeof days)[number] | null>(null);
  let index = 0;
  return (
    <>
      <div className="profile-calendar-heading">
        <h2>{data.total.toLocaleString()} contributions</h2>
        <span className="profile-calendar-detail" aria-live="polite">
          {hovered
            ? `${dateLabel(hovered.date)} · ${hovered.contributionCount}`
            : selected
              ? dateLabel(selected)
              : "Last year"}
        </span>
      </div>
      <div className="contribution-calendar" aria-label="Contribution history">
        {data.weeks.map((week, w) => (
          <div className="contribution-week" key={w}>
            {week.contributionDays.map((day) => {
              const dayIndex = index++;
              const label = `${dateLabel(day.date)}: ${day.contributionCount} contributions`;
              return (
                <Hint key={day.date} label={label}>
                  <button
                    ref={(element) => {
                      buttons.current[dayIndex] = element;
                    }}
                    type="button"
                    className={`contribution-day contribution-${contributionLevel(day.contributionLevel)}`}
                    aria-label={label}
                    aria-pressed={selected === day.date}
                    tabIndex={
                      day.date === (focused || selected || days.at(-1)?.date)
                        ? 0
                        : -1
                    }
                    onPointerEnter={() => setHovered(day)}
                    onPointerLeave={() => setHovered(null)}
                    onFocus={() => {
                      setFocused(day.date);
                      setHovered(day);
                    }}
                    onBlur={() => setHovered(null)}
                    onClick={() => onSelect(day.date)}
                    onKeyDown={(event) => {
                      const offsets: Record<string, number> = {
                        ArrowLeft: -7,
                        ArrowRight: 7,
                        ArrowUp: -1,
                        ArrowDown: 1,
                        Home: -dayIndex,
                        End: days.length - 1 - dayIndex,
                      };
                      if (event.key in offsets) {
                        event.preventDefault();
                        buttons.current[
                          Math.max(
                            0,
                            Math.min(
                              days.length - 1,
                              dayIndex + offsets[event.key],
                            ),
                          )
                        ]?.focus();
                      }
                    }}
                  />
                </Hint>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}
export function ProfileActivity({ data }: { data: ProfileExtras }) {
  const [month, setMonth] = useState(currentMonth);
  const [day, setDay] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const period = useMemo(
    () => profilePeriod(data, month, day),
    [data, month, day],
  );
  const months = useMemo(() => profileMonths(data), [data]);
  const entries = [
    ...period.commits.map((repo) => ({
      key: repo.repo,
      title: repo.repo,
      detail: `${repo.count} commits`,
      url: repo.url,
      Icon: GitCommitHorizontal,
    })),
    ...period.pullRequests.map((pr) => ({
      key: pr.url,
      title: pr.title,
      detail: pr.repo,
      url: pr.url,
      Icon: GitPullRequest,
    })),
  ];
  const overview = [
    { label: "Commits", value: data.totals.commits, Icon: GitCommitHorizontal },
    {
      label: "Pull requests",
      value: data.totals.pullRequests,
      Icon: GitPullRequest,
    },
    { label: "Issues", value: data.totals.issues, Icon: CircleDot },
    { label: "Reviews", value: data.totals.reviews, Icon: MessageSquare },
    {
      label: "Repositories created",
      value: data.totals.repositories,
      Icon: BookOpen,
    },
  ];
  const largest = Math.max(1, ...overview.map((row) => row.value));
  return (
    <div className="profile-activity">
      <ContributionCalendar
        data={data}
        selected={day}
        onSelect={(date) => {
          setDay((current) => (current === date ? null : date));
          setMonth(date.slice(0, 7));
          setExpanded(false);
        }}
      />
      <div className="profile-activity-split">
        <section className="profile-period" aria-label="Contribution activity">
          <div className="profile-activity-heading">
            <select
              aria-label="Activity month"
              value={month}
              onChange={(event) => {
                setMonth(event.target.value);
                setDay(null);
                setExpanded(false);
              }}
            >
              {months.map((value) => (
                <option value={value} key={value}>
                  {monthLabel(value)}
                </option>
              ))}
            </select>
            <span>{period.contributions.toLocaleString()}</span>
            {day && (
              <Button
                className="icon"
                title="Clear date filter"
                onClick={() => setDay(null)}
              >
                <X size={14} />
              </Button>
            )}
          </div>
          <div className="profile-activity-entries">
            {(expanded ? entries : entries.slice(0, 5)).map(
              ({ key, title, detail, url, Icon }) => (
                <Button
                  className="profile-activity-entry"
                  key={key}
                  onClick={() => openExternal(url)}
                >
                  <Icon size={15} />
                  <span>
                    <strong>{title}</strong>
                    <small>{detail}</small>
                  </span>
                </Button>
              ),
            )}
            {!entries.length && (
              <p className="muted small">No commits or pull requests.</p>
            )}
          </div>
          {entries.length > 5 && (
            <Button
              className="icon"
              title={
                expanded
                  ? "Show less activity"
                  : `Show all ${entries.length} activities`
              }
              aria-expanded={expanded}
              onClick={() => setExpanded((value) => !value)}
            >
              <ChevronDown
                size={16}
                style={{ transform: expanded ? "rotate(180deg)" : undefined }}
              />
            </Button>
          )}
        </section>
        <section className="profile-overview" aria-label="Activity overview">
          <div className="profile-activity-heading">
            <h3>Overview</h3>
            <span>Last year</span>
          </div>
          {overview.map(({ label, value, Icon }) => (
            <div className="profile-overview-row" key={label}>
              <Icon size={14} />
              <span>{label}</span>
              <strong>{value.toLocaleString()}</strong>
              <div className="profile-overview-track">
                <span style={{ width: `${(value / largest) * 100}%` }} />
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
