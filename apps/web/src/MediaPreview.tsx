import { useQuery } from "@tanstack/react-query";
import { fileFormat, mimeType, type Content } from "@git-client/github";
import { api } from "./api";
import { Loading, ErrorBox, External } from "./components";
export function MediaPreview({ file, repo }: { file: Content; repo: string }) {
  const format = fileFormat(file.name);
  const content = useQuery({
    queryKey: ["media", repo, file.sha],
    queryFn: async () => {
      if (file.size > 25 * 1024 * 1024)
        throw new Error("This file exceeds the 25 MB preview limit.");
      if (file.content && file.encoding === "base64") return file.content;
      return (
        await api.request<{ content: string }>(
          `/repos/${repo}/git/blobs/${file.sha}`,
        )
      ).content;
    },
  });
  if (content.isPending) return <Loading />;
  if (content.error)
    return (
      <>
        <ErrorBox error={content.error} />
        <External url={file.html_url} />
      </>
    );
  const src = `data:${mimeType(file.name)};base64,${content.data.replace(/\s/g, "")}`;
  return (
    <div className="media-preview">
      {format === "image" || format === "svg" ? (
        <img src={src} alt={file.name} />
      ) : format === "video" ? (
        <video controls src={src} />
      ) : format === "audio" ? (
        <audio controls src={src} />
      ) : format === "pdf" ? (
        <iframe title={file.name} sandbox="allow-same-origin" src={src} />
      ) : (
        <External url={file.html_url} />
      )}
    </div>
  );
}
