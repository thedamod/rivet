import React from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
const schema = {
  ...defaultSchema,
  tagNames: [
    ...defaultSchema.tagNames!,
    "video",
    "audio",
    "source",
    "details",
    "summary",
  ],
  attributes: {
    ...defaultSchema.attributes,
    img: [...(defaultSchema.attributes?.img || []), "width", "height"],
    video: ["src", "controls", "width", "height", "poster"],
    audio: ["src", "controls"],
    source: ["src", "type"],
    details: ["open"],
  },
};
export function MarkdownBody({
  children,
  components,
  baseUrl,
}: {
  children: string;
  components?: Components;
  baseUrl?: string;
}) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw, [rehypeSanitize, schema]]}
      components={components}
      urlTransform={(url) => {
        try {
          if (url.startsWith("data:image/")) return url;
          if (baseUrl && !/^[a-z]+:/i.test(url) && !url.startsWith("#"))
            return new URL(url, baseUrl).href;
          const parsed = new URL(url, "https://github.com");
          return ["https:", "http:", "mailto:"].includes(parsed.protocol)
            ? url
            : "";
        } catch {
          return "";
        }
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
