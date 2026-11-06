import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MarkdownBody } from "@git-client/markdown";
import { githubImagePath } from "@git-client/github";
test("preserves GitHub HTML tables and image metadata without executable HTML", () => {
  const source =
    'Text **as authored**.\n\n| Overlay | Diagram |\n| --- | --- |\n| <img src="https://github.com/owner/repo/blob/abc/docs/a.png?raw=true" width="480" alt="Exact description"> | Second cell |\n\n<script>alert(1)</script><img src="x" onerror="alert(2)">';
  const html = renderToStaticMarkup(
    React.createElement(MarkdownBody, { children: source }),
  );
  assert.match(html, /<table>/);
  assert.match(html, /width="480"/);
  assert.match(html, /alt="Exact description"/);
  assert.match(html, /Second cell/);
  assert.doesNotMatch(html, /<script|onerror/);
});
test("resolves private repository image assets at their original revision", () => {
  assert.deepEqual(
    githubImagePath(
      "https://github.com/owner/repo/blob/abc/docs/a.png?raw=true",
    ),
    { repo: "owner/repo", ref: "abc", path: "docs/a.png" },
  );
  assert.equal(githubImagePath("https://example.org/a.png"), null);
});
test("shared Markdown highlights fenced source and preserves inline code and safe escaping", () => {
  const html = renderToStaticMarkup(
    React.createElement(MarkdownBody, {
      children:
        'Inline `const value = 1`.\n\n```ts\nconst greeting: string = "hello";\n```\n\n```python\ndef greet():\n    return "hi"\n```\n\n```unknown-language\n<script>unsafe()</script>\n```',
    }),
  );
  assert.match(html, /hljs-keyword/);
  assert.match(html, /hljs-string/);
  assert.match(html, /language-ts/);
  assert.match(html, /language-python/);
  assert.match(html, /<code>const value = 1<\/code>/);
  assert.match(html, /&lt;script&gt;unsafe\(\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});
