import { Button } from "./ui/primitives";
import { useMemo, useRef, useLayoutEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, File } from "lucide-react";
import {
  decodeContent,
  fileFormat,
  treeFiles,
  type Repository,
  type Content,
} from "@git-client/github";
import { api } from "./api";
import { CodeFile, DirectoryTree } from "./Pierre";
import {
  CopyButton,
  Empty,
  ErrorBox,
  External,
  Loading,
  Markdown,
} from "./components";
import { MediaPreview } from "./MediaPreview";
export function RepositoryCode({
  repo,
  branch,
  selected,
  onSelect,
}: {
  repo: Repository;
  branch: string;
  selected: string;
  onSelect: (path: string) => void;
}) {
  const setSelected = onSelect;
  const filePanel = useRef<HTMLDivElement>(null);
  const previousSelection = useRef(selected);
  const browseScroll = useRef(0);
  function changeSelection(path: string) {
    if (path && !selected)
      browseScroll.current = document.querySelector(".main")?.scrollTop || 0;
    setSelected(path);
  }
  function openFile(path: string) {
    changeSelection(path);
  }
  useLayoutEffect(() => {
    if (!selected && previousSelection.current)
      document.querySelector(".main")?.scrollTo({ top: browseScroll.current });
    if (selected && previousSelection.current !== selected)
      filePanel.current?.scrollTo({ top: 0 });
    previousSelection.current = selected;
  }, [selected]);
  const tree = useQuery({
    queryKey: ["repository-tree", repo.full_name, branch],
    queryFn: () => api.repositoryTree(repo.full_name, branch),
    staleTime: 60000,
  });
  const files = useMemo(
    () => (tree.data ? treeFiles(tree.data) : []),
    [tree.data],
  );
  const readmePath = files.find(
    (f) =>
      !f.path.includes("/") &&
      /^readme(?:\.md|\.mdx|\.txt|\.rst)?$/i.test(f.name),
  )?.path;
  const readme = useQuery({
    queryKey: ["repo-readme", repo.full_name, tree.data?.revision, readmePath],
    queryFn: () =>
      api.contents(
        repo.full_name,
        readmePath!,
        tree.data!.revision,
      ) as Promise<Content>,
    enabled: !!readmePath && !!tree.data?.revision,
    staleTime: Infinity,
  });
  const file = useQuery({
    queryKey: ["selected-file", repo.full_name, tree.data?.revision, selected],
    queryFn: () =>
      api.contents(
        repo.full_name,
        selected,
        tree.data!.revision,
      ) as Promise<Content>,
    enabled: !!selected && !!tree.data?.revision,
    staleTime: Infinity,
  });
  let decoded = "";
  let binary = false;
  if (file.data?.content) {
    try {
      decoded = decodeContent(file.data.content);
      binary = decoded.includes("\0");
    } catch {
      binary = true;
    }
  }
  const viewer = (
    <>
      <div className="panel-title">
        <File size={15} />
        <span className="viewer-path">{selected}</span>
        <div className="spacer" />
        {!!file.data?.content && !binary && <CopyButton value={decoded} />}{" "}
        {file.data && <External url={file.data.html_url} />}
        <Button
          className="icon"
          title="Close file"
          aria-label="Close file"
          onClick={() => changeSelection("")}
        >
          <X size={16} />
        </Button>
      </div>
      {file.isPending ? (
        <Loading />
      ) : file.error ? (
        <ErrorBox error={file.error} retry={() => file.refetch()} />
      ) : file.data ? (
        ["image", "svg", "pdf", "video", "audio", "binary"].includes(
          fileFormat(file.data.name),
        ) ? (
          <MediaPreview file={file.data} repo={repo.full_name} />
        ) : binary || file.data.encoding !== "base64" ? (
          <Empty title="Preview unavailable">
            <External url={file.data.html_url} />
          </Empty>
        ) : fileFormat(file.data.name) === "markdown" ? (
          <Markdown
            baseUrl={`https://github.com/${repo.full_name}/blob/${encodeURIComponent(branch)}/${selected.split("/").slice(0, -1).join("/")}/`}
          >
            {decoded}
          </Markdown>
        ) : (
          <CodeFile name={selected} contents={decoded} />
        )
      ) : null}
    </>
  );
  return (
    <div className={`repository-explorer ${selected ? "has-file" : ""}`}>
      <div className="readme repository-readme" hidden={!!selected}>
        {readme.isPending && readmePath ? (
          <Loading />
        ) : readme.error ? (
          <ErrorBox error={readme.error} retry={() => readme.refetch()} />
        ) : readme.data?.content ? (
          <>
            <Markdown
              baseUrl={`https://github.com/${repo.full_name}/blob/${encodeURIComponent(branch)}/`}
            >
              {decodeContent(readme.data.content)}
            </Markdown>
          </>
        ) : null}
      </div>
      <div className="explorer-split">
        <div className="explorer-tree" aria-label="Repository explorer">
          {tree.isPending ? (
            <Loading />
          ) : tree.error ? (
            <ErrorBox error={tree.error} retry={() => tree.refetch()} />
          ) : files.length ? (
            <DirectoryTree
              files={files}
              compact={!!selected}
              selected={selected}
              onOpen={openFile}
            />
          ) : (
            <Empty title="Empty repository" />
          )}
        </div>
        {selected && (
          <div
            ref={filePanel}
            className="explorer-file"
            aria-label="File contents"
          >
            {viewer}
          </div>
        )}
      </div>
    </div>
  );
}
