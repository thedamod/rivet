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
    const header = new TextDecoder().decode(bytes.slice(0, 16384));
    const svg = header.match(/<svg\b[^>]*>/i)?.[0];
    if (svg) {
      const attribute = (name: string) =>
        svg.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1];
      const viewBox = attribute("viewBox")
        ?.trim()
        .split(/[\s,]+/)
        .map(Number);
      const width = attribute("width");
      const height = attribute("height");
      const w =
        width && !width.includes("%") ? Number.parseFloat(width) : viewBox?.[2];
      const h =
        height && !height.includes("%")
          ? Number.parseFloat(height)
          : viewBox?.[3];
      if (w && h && Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0)
        return { width: w, height: h };
    }
    return null;
  } catch {
    return null;
  }
}
