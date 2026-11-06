import React from "react";
import { createRoot } from "react-dom/client";
import { MarkdownBody } from "@git-client/markdown";
import {
  File,
  FileDiff,
  parsePatchFiles,
  setLanguageOverride,
} from "@pierre/diffs";
import { FileTree } from "@pierre/trees";
import {
  repositoryFileIcons,
  mobileRepositoryTreeCSS,
} from "@git-client/theme/fileTree";
const root = document.getElementById("root")!;
const data = (window as any).viewerData;
const post = (value: unknown) =>
  (window as any).ReactNativeWebView?.postMessage(JSON.stringify(value));
const extension = (data.name || "").split(".").pop()?.toLowerCase();
const nativeLanguages: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  json: "json",
  css: "css",
  html: "html",
  md: "markdown",
  py: "python",
  rs: "rust",
  go: "go",
  sh: "bash",
  yml: "yaml",
  yaml: "yaml",
  swift: "swift",
  kt: "kotlin",
  sql: "sql",
  diff: "diff",
};
const lang = (nativeLanguages[extension] || "text") as any;
const options = {
  theme: { dark: "pierre-dark", light: "pierre-light" },
  themeType: data.theme,
  disableFileHeader: true,
  overflow: "wrap" as const,
  preferredHighlighter: "shiki-js" as const,
};
if (data.kind === "markdown") {
  createRoot(root).render(
    React.createElement(
      "div",
      { className: "markdown" },
      React.createElement(MarkdownBody, {
        baseUrl: data.baseUrl,
        components: {
          img: ({ node, ...props }: any) =>
            React.createElement("img", {
              ...props,
              style: {
                width: props.width ? Number(props.width) : undefined,
                height: props.height ? Number(props.height) : undefined,
                display:
                  (Number(props.width) > 0 && Number(props.width) <= 40) ||
                  (Number(props.height) > 0 && Number(props.height) <= 32)
                    ? "inline-block"
                    : undefined,
              },
              src: data.imageMap?.[props.src] || props.src,
            }),
          a: ({ href, children }: any) =>
            React.createElement(
              "a",
              {
                href,
                onClick: (e: any) => {
                  e.preventDefault();
                  post({ type: "link", url: href });
                },
              },
              children,
            ),
        },
        children: data.contents,
      }),
    ),
  );
} else if (data.kind === "tree") {
  const tree = new FileTree({
    paths: data.files.map((f: any) => f.path + (f.type === "dir" ? "/" : "")),
    initialExpansion: "closed",
    density: 1.4,
    itemHeight: 42,
    icons: repositoryFileIcons,
    unsafeCSS: mobileRepositoryTreeCSS,
    search: false,
    onSelectionChange: (paths) => {
      const file = data.files.find(
        (f: any) => f.path === paths.at(-1)?.replace(/\/$/, ""),
      );
      if (file && file.type !== "dir") post({ type: "open", path: file.path });
    },
  });
  (window as any).clearTreeSelection = () => {
    for (const path of tree.getSelectedPaths()) tree.getItem(path)?.deselect();
  };
  // Native T3 Files rows are 42 px, have 17 px Pierre icons and 14 px labels.
  const resizeTree = () => {
    root.style.height = `${Math.max(120, Math.min(tree.getVisibleCount() * 42 + 16, 2400))}px`;
  };
  resizeTree();
  tree.subscribe(resizeTree);
  root.style.color = data.theme === "dark" ? "#f5f5f5" : "#27272a";
  const host = document.createElement("file-tree-container");
  host.style.height = "100%";
  host.style.width = "100%";
  host.style.colorScheme = data.theme;
  host.style.setProperty(
    "--text",
    data.theme === "dark" ? "#f5f5f5" : "#27272a",
  );
  host.style.setProperty(
    "--textMuted",
    data.theme === "dark" ? "#818181" : "#71717b",
  );
  root.appendChild(host);
  tree.render({ fileTreeContainer: host });
} else if (data.kind === "diff") {
  const patch = `diff --git a/${data.name} b/${data.name}\n--- a/${data.name}\n+++ b/${data.name}\n${data.contents}\n`;
  const diff = parsePatchFiles(patch)[0]?.files[0];
  if (diff)
    new FileDiff({ ...options, diffStyle: "unified" }).render({
      fileDiff: setLanguageOverride(diff, lang),
      containerWrapper: root,
    });
} else
  new File(options).render({
    file: { name: data.name, contents: data.contents, lang },
    containerWrapper: root,
  });
new ResizeObserver(() =>
  post({
    type: "height",
    height: Math.min(
      Math.max(document.documentElement.scrollHeight, 120),
      6000,
    ),
  }),
).observe(root);
