import { BackNavigation } from "./BackNavigation";
import React, { useMemo, useState, useEffect, useContext, useRef } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  LayoutAnimation,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { AppIcon } from "./AppIcon";
import { useQuery } from "@tanstack/react-query";
import {
  decodeContent,
  fileFormat,
  treeFiles,
  type Content,
  type GitHubClient,
  type Repository,
} from "@git-client/github";
import { PierreViewer } from "./Viewer";
import { NativeMarkdown } from "./Markdown";
import { Media } from "./Media";
type Palette = {
  canvas: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
};
export function NativeRepositoryCode({
  repo,
  branch,
  api,
  colors,
}: {
  repo: Repository;
  branch: string;
  api: GitHubClient;
  colors: Palette;
}) {
  const [selected, setSelected] = useState("");
  const [drawer, setDrawer] = useState(false);
  const reduceMotion = useRef(true);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) reduceMotion.current = enabled;
    });
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => { reduceMotion.current = enabled; },
    );
    return () => { active = false; subscription.remove(); };
  }, []);
  function selectFile(path: string) {
    if (!reduceMotion.current)
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelected(path);
  }
  const back = useContext(BackNavigation);
  useEffect(
    () =>
      back.register(() => {
        if (drawer) {
          setDrawer(false);
          return true;
        }
        if (selected) {
          selectFile("");
          return true;
        }
        return false;
      }),
    [selected, drawer, back],
  );
  const wide = useWindowDimensions().width >= 760;
  const tree = useQuery({
    queryKey: ["repository-tree", repo.full_name, branch],
    queryFn: () => api.repositoryTree(repo.full_name, branch),
  });
  const files = useMemo(
    () => (tree.data ? treeFiles(tree.data) : []),
    [tree.data],
  );
  const revision = tree.data?.revision;
  const readmePath = files.find(
    (f) =>
      !f.path.includes("/") &&
      /^readme(?:\.md|\.mdx|\.txt|\.rst)?$/i.test(f.name),
  )?.path;
  const readme = useQuery({
    queryKey: ["repo-readme", repo.full_name, revision, readmePath],
    queryFn: () =>
      api.contents(repo.full_name, readmePath!, revision) as Promise<Content>,
    enabled: !!readmePath && !!revision,
    staleTime: Infinity,
  });
  const file = useQuery({
    queryKey: ["selected-file", repo.full_name, revision, selected],
    queryFn: () =>
      api.contents(repo.full_name, selected, revision) as Promise<Content>,
    enabled: !!selected && !!revision,
    staleTime: Infinity,
  });
  let content = "";
  let binary = false;
  if (file.data?.content) {
    try {
      content = decodeContent(file.data.content);
      binary = content.includes("\0");
    } catch {
      binary = true;
    }
  }
  const theme = colors.canvas === "#fcfcfc" ? "light" : "dark";
  const icon = (
    name: keyof typeof AppIcon.glyphMap,
    label: string,
    action: () => void,
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={action}
      style={styles.icon}
    >
      <AppIcon name={name} size={19} color={colors.textMuted} />
    </Pressable>
  );
  const error = (e: unknown) => (
    <Text style={[styles.error, { color: colors.textMuted }]}>
      {e instanceof Error ? e.message : String(e)}
    </Text>
  );
  return (
    <View style={{ gap: 16 }}>
      {!selected &&
        readmePath &&
        (readme.isPending ? (
          <ActivityIndicator color={colors.textMuted} style={{ height: 180 }} />
        ) : readme.error ? (
          error(readme.error)
        ) : readme.data?.content ? (
          <NativeMarkdown
            colors={colors}
            api={api}
            repo={repo.full_name}
            branch={branch}
          >
            {decodeContent(readme.data.content)}
          </NativeMarkdown>
        ) : null)}
      <View style={[styles.explorer, selected && wide && styles.split]}>
        <View
          key="tree"
          style={[
            styles.tree,
            selected && wide
              ? {
                  width: 240,
                  borderRightWidth: 1,
                  borderRightColor: colors.border,
                }
              : undefined,
            selected && !wide
              ? {
                  display: drawer ? "flex" : "none",
                  position: drawer ? "absolute" : "relative",
                  top: 43,
                  left: 0,
                  bottom: 0,
                  width: 270,
                  zIndex: 4,
                  backgroundColor: colors.canvas,
                  borderRightWidth: 1,
                  borderRightColor: colors.border,
                }
              : undefined,
          ]}
        >
          {tree.isPending ? (
            <ActivityIndicator
              color={colors.textMuted}
              style={{ height: 180 }}
            />
          ) : tree.error ? (
            error(tree.error)
          ) : (
            <PierreViewer
              kind="tree"
              files={files}
              theme={theme}
              onOpen={(path) => {
                selectFile(path);
                setDrawer(false);
              }}
            />
          )}
        </View>
        {selected && (
          <View
            key="file"
            style={[styles.file, { backgroundColor: colors.canvas }]}
          >
            <View
              style={[styles.fileHeader, { borderBottomColor: colors.border }]}
            >
              {!wide &&
                icon("list-outline", "Toggle file tree", () =>
                  setDrawer((v) => !v),
                )}
              <Text
                numberOfLines={1}
                style={[styles.path, { color: colors.text }]}
              >
                {selected}
              </Text>
              {icon("close-outline", "Close file", () => {
                selectFile("");
                setDrawer(false);
              })}
            </View>
            {file.isPending ? (
              <ActivityIndicator
                color={colors.textMuted}
                style={{ height: 240 }}
              />
            ) : file.error ? (
              error(file.error)
            ) : file.data ? (
              ["image", "svg", "pdf", "video", "audio", "binary"].includes(
                fileFormat(file.data.name),
              ) || binary ? (
                <Media file={file.data} api={api} colors={colors} />
              ) : file.data.encoding !== "base64" ? (
                error("Preview unavailable.")
              ) : fileFormat(file.data.name) === "markdown" ? (
                <NativeMarkdown
                  colors={colors}
                  api={api}
                  repo={repo.full_name}
                  branch={branch}
                  path={selected.split("/").slice(0, -1).join("/")}
                >
                  {content}
                </NativeMarkdown>
              ) : (
                <PierreViewer
                  name={selected}
                  contents={content}
                  theme={theme}
                />
              )
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  explorer: { position: "relative", minHeight: 180 },
  split: { flexDirection: "row", alignItems: "stretch" },
  tree: { minWidth: 0, flexShrink: 0 },
  file: { flex: 1, minWidth: 0, minHeight: 420 },
  fileHeader: {
    height: 43,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  path: { fontFamily: "GeistMono", fontSize: 11, flex: 1 },
  icon: {
    width: 36,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  error: { fontFamily: "Geist", fontSize: 12, lineHeight: 20, padding: 18 },
});
