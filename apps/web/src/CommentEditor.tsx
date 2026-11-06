import {
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  Bold,
  Code2,
  Heading,
  Italic,
  Link,
  List,
  ListChecks,
  ListOrdered,
  Quote,
} from "lucide-react";
import { Markdown } from "./components";
import { Button } from "./ui/primitives";
import "./comment-editor.css";

type Props = {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  baseUrl?: string;
  rows?: number;
  footer?: ReactNode;
};

export function CommentEditor({
  value,
  onChange,
  label,
  placeholder,
  baseUrl,
  rows = 6,
  footer,
}: Props) {
  const [preview, setPreview] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const id = useId();

  function format(before: string, after = "", fallback = "text", line = false) {
    const input = textarea.current;
    if (!input) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selected = value.slice(start, end) || fallback;
    const prefix = line && start > 0 && value[start - 1] !== "\n" ? "\n" : "";
    const replacement = prefix + before + selected + after;
    onChange(value.slice(0, start) + replacement + value.slice(end));
    requestAnimationFrame(() => {
      input.focus();
      const selectionStart = start + prefix.length + before.length;
      input.setSelectionRange(selectionStart, selectionStart + selected.length);
    });
  }

  const actions = [
    {
      label: "Add heading",
      icon: Heading,
      run: () => format("## ", "", "Heading", true),
    },
    { label: "Bold", icon: Bold, run: () => format("**", "**") },
    { label: "Italic", icon: Italic, run: () => format("*", "*") },
    { label: "Quote", icon: Quote, run: () => format("> ", "", "Quote", true) },
    { label: "Code", icon: Code2, run: () => format("`", "`", "code") },
    {
      label: "Insert link",
      icon: Link,
      run: () => format("[", "](url)", "link text"),
    },
    {
      label: "Bulleted list",
      icon: List,
      run: () => format("- ", "", "List item", true),
    },
    {
      label: "Numbered list",
      icon: ListOrdered,
      run: () => format("1. ", "", "List item", true),
    },
    {
      label: "Task list",
      icon: ListChecks,
      run: () => format("- [ ] ", "", "Task", true),
    },
  ];

  return (
    <div
      className="comment-editor"
      style={
        {
          "--editor-height": `${Math.max(4, rows) * 22 + 24}px`,
        } as CSSProperties
      }
    >
      <div className="comment-editor-bar">
        <div
          className="comment-editor-tabs"
          role="tablist"
          aria-label={`${label} editor`}
        >
          <button
            type="button"
            role="tab"
            aria-selected={!preview}
            aria-controls={`${id}-write`}
            id={`${id}-write-tab`}
            onClick={() => setPreview(false)}
          >
            Write
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={preview}
            aria-controls={`${id}-preview`}
            id={`${id}-preview-tab`}
            onClick={() => setPreview(true)}
          >
            Preview
          </button>
        </div>
        {!preview && (
          <div
            className="comment-editor-tools"
            role="toolbar"
            aria-label="Markdown formatting"
          >
            {actions.map(({ label: actionLabel, icon: Icon, run }) => (
              <Button
                type="button"
                key={actionLabel}
                title={actionLabel}
                aria-label={actionLabel}
                onMouseDown={(event) => event.preventDefault()}
                onClick={run}
              >
                <Icon size={15} />
              </Button>
            ))}
          </div>
        )}
      </div>
      <div
        role="tabpanel"
        id={`${id}-write`}
        aria-labelledby={`${id}-write-tab`}
        hidden={preview}
      >
        <textarea
          ref={textarea}
          aria-label={label}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={rows}
        />
      </div>
      <div
        role="tabpanel"
        id={`${id}-preview`}
        aria-labelledby={`${id}-preview-tab`}
        hidden={!preview}
        className="comment-editor-preview"
      >
        {value.trim() ? (
          <Markdown baseUrl={baseUrl}>{value}</Markdown>
        ) : (
          <span className="muted">Nothing to preview</span>
        )}
      </div>
      {footer && <div className="comment-editor-footer">{footer}</div>}
    </div>
  );
}
