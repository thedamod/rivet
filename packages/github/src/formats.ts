export function fileFormat(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (
    [
      "png",
      "jpg",
      "jpeg",
      "gif",
      "webp",
      "bmp",
      "ico",
      "avif",
      "heic",
      "heif",
    ].includes(ext)
  )
    return "image";
  if (ext === "svg") return "svg";
  if (ext === "pdf") return "pdf";
  if (["mp4", "mov", "webm", "m4v"].includes(ext)) return "video";
  if (["mp3", "wav", "m4a", "aac", "ogg", "flac"].includes(ext)) return "audio";
  if (["md", "mdx", "markdown"].includes(ext)) return "markdown";
  if (
    [
      "zip",
      "gz",
      "tar",
      "7z",
      "rar",
      "exe",
      "dll",
      "so",
      "dylib",
      "woff",
      "woff2",
      "ttf",
      "otf",
      "sqlite",
      "db",
      "bin",
      "psd",
      "sketch",
    ].includes(ext)
  )
    return "binary";
  return "code";
}
export function mimeType(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return (
    (
      {
        svg: "image/svg+xml",
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        gif: "image/gif",
        webp: "image/webp",
        avif: "image/avif",
        pdf: "application/pdf",
        mp4: "video/mp4",
        mov: "video/quicktime",
        webm: "video/webm",
        mp3: "audio/mpeg",
        wav: "audio/wav",
        m4a: "audio/mp4",
      } as Record<string, string>
    )[ext] || "application/octet-stream"
  );
}
