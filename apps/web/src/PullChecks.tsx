import {
  CircleCheck,
  CircleSlash,
  CircleDashed,
  CircleDot,
  CircleX,
  Clock,
  ChevronDown,
  LockKeyhole,
} from "lucide-react";
import { checkLabel, type PullChecks as Checks } from "@rivet/github";
import { Button } from "./ui/primitives";
import { openExternal } from "./api";
import { ErrorBox } from "./components";
export function PullChecks({
  data,
  error,
  loading,
  open,
  onToggle,
}: {
  data?: Checks;
  error: unknown;
  loading: boolean;
  open: boolean;
  onToggle: (value: boolean) => void;
}) {
  return (
    <details
      className="pr-checks t3-checks"
      open={open}
      onToggle={(e) => onToggle(e.currentTarget.open)}
    >
      <summary>
        Checks
        <ChevronDown size={12} />
      </summary>
      {loading ? (
        <div className="pr-skeleton" style={{ height: 32 }} />
      ) : error ? (
        <ErrorBox error={error} />
      ) : (
        <>
          {data?.restricted && (
            <p className="checks-permission">
              <LockKeyhole size={14} />
              Some checks require Checks and Commit statuses read access for
              this repository.
            </p>
          )}
          {data?.partial && !data.restricted && (
            <p className="checks-permission">
              Some check results are unavailable. Refresh to retry.
            </p>
          )}
          {!data?.items.length && !data?.restricted && (
            <p className="muted small">No checks reported.</p>
          )}
          {data?.items.map((c) => {
            const Icon =
              c.state === "pending"
                ? Clock
                : ["failure", "cancelled"].includes(c.state)
                  ? CircleX
                  : c.state === "skipped"
                    ? CircleSlash
                    : c.state === "neutral"
                      ? CircleDashed
                      : c.state === "action-required"
                        ? CircleDot
                        : CircleCheck;
            return (
              <Button
                key={c.id}
                className="pr-check-row"
                disabled={!c.url}
                onClick={() => c.url && openExternal(c.url)}
              >
                <Icon size={14} className={`check-${c.state}`} />
                <span>{c.name}</span>
                <span className="muted">{checkLabel(c.state)}</span>
              </Button>
            );
          })}
        </>
      )}
    </details>
  );
}
