import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { File, PatchDiff } from "@pierre/diffs/react";
import { FileTree, useFileTree } from "@pierre/trees/react";
import {
  repositoryFileIcons,
  repositoryTreeCSS,
} from "@git-client/theme/fileTree";
import "./file-tree.css";
import type { Content } from "@git-client/github";
const fontStyles = {
  "--diffs-font-family": '"Geist Mono", monospace',
  "--diffs-header-font-family": "Geist, sans-serif",
  "--diffs-font-size": "13px",
  "--diffs-line-height": "20px",
} as CSSProperties;
export function useAppearance() {
  const [theme, setTheme] = useState<"dark" | "light">(
    document.documentElement.dataset.theme === "light" ? "light" : "dark",
  );
  useEffect(() => {
    const observer = new MutationObserver(() =>
      setTheme(
        document.documentElement.dataset.theme === "light" ? "light" : "dark",
      ),
    );
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);
  return theme;
}
export function CodeFile({
  name,
  contents,
}: {
  name: string;
  contents: string;
}) {
  const theme = useAppearance();
  const file = useMemo(() => ({ name, contents }), [name, contents]);
  const options = useMemo(
    () => ({
      theme: { dark: "pierre-dark", light: "pierre-light" },
      themeType: theme,
      disableFileHeader: true,
      overflow: "scroll" as const,
    }),
    [theme],
  );
  return <File file={file} options={options} style={fontStyles} />;
}
export function CodeDiff({
  name,
  patch,
  split = false,
  wrap = false,
  lineNumbers = true,
}: {
  name: string;
  patch: string;
  split?: boolean;
  wrap?: boolean;
  lineNumbers?: boolean;
}) {
  const theme = useAppearance();
  const fullPatch = useMemo(
    () =>
      `diff --git a/${name} b/${name}\n--- a/${name}\n+++ b/${name}\n${patch}\n`,
    [name, patch],
  );
  const options = useMemo(
    () => ({
      theme: { dark: "pierre-dark", light: "pierre-light" },
      themeType: theme,
      diffStyle: split ? ("split" as const) : ("unified" as const),
      overflow: wrap ? ("wrap" as const) : ("scroll" as const),
      disableLineNumbers: !lineNumbers,
      disableFileHeader: true,
    }),
    [theme, split, wrap, lineNumbers],
  );
  return <PatchDiff patch={fullPatch} options={options} style={fontStyles} />;
}
export function DirectoryTree({
  files,
  onOpen,
  selected,
  compact = false,
}: {
  files: Pick<Content, "name" | "path" | "type">[];
  selected?: string;
  compact?: boolean;
  onOpen: (path: string) => void;
}) {
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;
  const filesRef = useRef(files);
  filesRef.current = files;
  const theme = useAppearance();
  const paths = useMemo(
    () => files.map((f) => f.path + (f.type === "dir" ? "/" : "")),
    [files],
  );
  const { model } = useFileTree({
    paths,
    density: compact ? "compact" : "relaxed",
    itemHeight: compact ? 24 : 36,
    initialExpansion: "closed",
    flattenEmptyDirectories: true,
    icons: repositoryFileIcons,
    unsafeCSS:
      repositoryTreeCSS +
      (compact
        ? ""
        : "\n:host{--trees-item-height:36px;--trees-font-size-override:14px;}"),
    search: false,
    onSelectionChange: (selected) => {
      const name = selected.at(-1)?.replace(/\/$/, "");
      const file = filesRef.current.find((f) => f.path === name);
      if (file && file.type !== "dir") onOpenRef.current(file.path);
    },
  });
  useEffect(() => model.resetPaths(paths), [model, paths]);
  const [visibleCount, setVisibleCount] = useState(() =>
    model.getVisibleCount(),
  );
  useEffect(
    () => model.subscribe(() => setVisibleCount(model.getVisibleCount())),
    [model],
  );
  useEffect(() => {
    if (!selected) return;
    const parts = selected.split("/");
    for (let i = 1; i < parts.length; i++) {
      const directory = model.getItem(parts.slice(0, i).join("/"));
      if (directory && "expand" in directory) directory.expand();
    }
    if (!model.getItem(selected)?.isSelected())
      model.getItem(selected)?.select();
  }, [model, selected]);
  return (
    <FileTree
      model={model}
      aria-label="Repository files"
      className={`pierre-tree ${compact ? "compact-tree" : ""}`}
      style={
        {
          height: compact
            ? "100%"
            : Math.max(72, Math.min(visibleCount * 36 + 24, 720)),
          colorScheme: theme,
          "--trees-fg-override": "var(--text)",
          "--trees-font-family-override": "Geist, sans-serif",
          "--trees-font-size-override": compact ? "12px" : "14px",
          "--trees-item-height": compact ? "24px" : "36px",
        } as CSSProperties
      }
    />
  );
}
