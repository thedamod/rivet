import "@git-client/markdown/styles.css";
import { Button, Hint } from "./ui/primitives";
import { MarkdownBody } from "@git-client/markdown";
import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import {
  githubImagePath,
  imageDimensions,
  mimeType,
  type Content,
} from "@git-client/github";
import { useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ExternalLink as ArrowSquareOut,
  CircleAlert as WarningCircle,
  ChevronLeft as CaretLeft,
  ChevronRight as CaretRight,
  Copy,
  Check,
} from "lucide-react";
import { openExternal } from "./api";
export function Markdown({
  children,
  baseUrl,
}: {
  children: string;
  baseUrl?: string;
}) {
  return (
    <div className="markdown">
      <MarkdownBody
        baseUrl={baseUrl}
        components={{
          a: ({ href, children }) => (
            <a
              href={href}
              onClick={(e) => {
                e.preventDefault();
                if (href && /^https?:\/\//.test(href)) openExternal(href);
              }}
            >
              {children}
            </a>
          ),
          img: ({ node, ...props }) => (
            <MarkdownImage {...props} baseUrl={baseUrl} />
          ),
        }}
      >
        {children}
      </MarkdownBody>
    </div>
  );
}
function MarkdownImage({
  src,
  alt,
  width,
  height,
  baseUrl,
}: {
  src?: string;
  alt?: string;
  width?: string | number;
  height?: string | number;
  baseUrl?: string;
}) {
  const target = githubImagePath(src || "", baseUrl);
  const image = useQuery({
    queryKey: ["markdown-image", target?.repo, target?.ref, target?.path],
    queryFn: async () => {
      const f = (await api.contents(
        target!.repo,
        target!.path,
        target!.ref,
      )) as Content;
      if (!f.content) throw new Error("Image preview unavailable");
      return {
        src: `data:${mimeType(f.name)};base64,${f.content.replace(/\s/g, "")}`,
        dimensions: imageDimensions(f.content),
      };
    },
    enabled: !!target,
    staleTime: Infinity,
  });
  const [naturalSmall, setNaturalSmall] = useState(false);
  const w = Number(width),
    h = Number(height);
  const inline = naturalSmall || (w > 0 && w <= 40) || (h > 0 && h <= 32);
  return (
    <span
      className={inline ? "markdown-inline-image" : "markdown-media"}
      style={{
        maxWidth: w > 0 ? w : undefined,
        aspectRatio: !inline && w > 0 && h > 0 ? `${w}/${h}` : undefined,
      }}
    >
      {(!target || image.data) && (
        <img
          src={image.data?.src || src}
          alt={alt || ""}
          width={width}
          height={height}
          onLoad={(e) =>
            setNaturalSmall(
              e.currentTarget.naturalWidth <= 40 &&
                e.currentTarget.naturalHeight <= 32,
            )
          }
          style={{
            width: w > 0 ? w : undefined,
            height: h > 0 ? h : undefined,
          }}
          decoding="async"
        />
      )}
      {image.error && (
        <span className="muted small">{alt || "Image unavailable"}</span>
      )}
    </span>
  );
}
export function External({
  url,
  children,
}: {
  url: string;
  children?: ReactNode;
}) {
  return (
    <Button
      className="icon"
      title={typeof children === "string" ? children : "Open on GitHub"}
      aria-label={typeof children === "string" ? children : "Open on GitHub"}
      onClick={() => openExternal(url)}
    >
      <ArrowSquareOut size={14} />
    </Button>
  );
}
export function ErrorBox({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  return (
    <div className="error" role="alert">
      <WarningCircle size={20} />
      <div>
        <strong>Couldn’t load this from GitHub</strong>
        <p>{error instanceof Error ? error.message : String(error)}</p>
        {retry && <Button onClick={retry}>Try again</Button>}
      </div>
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" aria-label="Loading" role="status">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div className="skeleton" key={i} style={{ width: `${87 - i * 7}%` }} />
      ))}
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      <p>{children}</p>
    </div>
  );
}
export function Pager({
  page,
  setPage,
  hasNext,
}: {
  page: number;
  setPage: (n: number) => void;
  hasNext: boolean;
}) {
  return (
    <div className="pager">
      <Button
        aria-label="Previous page"
        title="Previous page"
        disabled={page === 1}
        onClick={() => setPage(page - 1)}
      >
        <CaretLeft size={16} />
      </Button>
      <span>{page}</span>
      <Button
        aria-label="Next page"
        title="Next page"
        disabled={!hasNext}
        onClick={() => setPage(page + 1)}
      >
        <CaretRight size={16} />
      </Button>
    </div>
  );
}
export function Time({ value }: { value: string }) {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 60000),
  );
  const days = Math.floor(minutes / 1440);
  return (
    <Hint label={new Date(value).toLocaleString()}>
      <time dateTime={value}>
        {minutes < 1
          ? "now"
          : minutes < 60
            ? `${minutes}m ago`
            : minutes < 1440
              ? `${Math.floor(minutes / 60)}h ago`
              : days === 0
                ? "today"
                : days === 1
                  ? "yesterday"
                  : days < 30
                    ? `${days}d ago`
                    : new Date(value).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
      </time>
    </Hint>
  );
}
export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      aria-label="Copy"
      title="Copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </Button>
  );
}
