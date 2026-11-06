/** Resolve repository image URLs to an authenticated Contents API request. */
export function githubImagePath(src: string, baseUrl?: string) {
  try {
    const url = new URL(src, baseUrl);
    const parts = url.pathname
      .split("/")
      .filter(Boolean)
      .map(decodeURIComponent);
    if (
      url.hostname === "github.com" &&
      parts[2] === "blob" &&
      parts.length > 4
    )
      return {
        repo: parts.slice(0, 2).join("/"),
        ref: parts[3],
        path: parts.slice(4).join("/"),
      };
    if (url.hostname === "raw.githubusercontent.com" && parts.length > 3)
      return {
        repo: parts.slice(0, 2).join("/"),
        ref: parts[2],
        path: parts.slice(3).join("/"),
      };
    return null;
  } catch {
    return null;
  }
}
export function imageDimensions(base64: string) {
  try {
    const bytes = Uint8Array.from(atob(base64.replace(/\s/g, "")), (c) =>
      c.charCodeAt(0),
    );
    if (bytes[0] === 137 && bytes[1] === 80) {
      const view = new DataView(bytes.buffer);
      return { width: view.getUint32(16), height: view.getUint32(20) };
    }
    return null;
  } catch {
    return null;
  }
}
