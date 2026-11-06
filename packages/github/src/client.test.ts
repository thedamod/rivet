import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createClient,
  GitHubError,
  decodeContent,
  validatePath,
  fileFormat,
} from "./index";
test("rejects host escapes and traversal before sending credentials", async () => {
  for (const path of [
    "https://evil.test/user",
    "//evil.test/user",
    "/repos/../user",
    "/repos/%2e%2e/user",
    "/repos/a\\b",
    "/repos/a#x",
  ]) {
    assert.equal(validatePath(path), false);
    await assert.rejects(
      createClient(async () => {
        throw Error("transport called");
      }).request(path),
      /Invalid GitHub API path/,
    );
  }
});
test("encodes refs and file paths without altering their hierarchy", async () => {
  let actual = "";
  const client = createClient(async (path) => {
    actual = path;
    return Response.json([]);
  });
  await client.contents("owner/repo", "docs/hello world.md", "feature/topic");
  assert.equal(
    actual,
    "/repos/owner/repo/contents/docs/hello%20world.md?ref=feature%2Ftopic",
  );
});
test("distinguishes missing star from failed authentication", async () => {
  assert.equal(
    await createClient(
      async () => new Response(null, { status: 404 }),
    ).isStarred("a/b"),
    false,
  );
  await assert.rejects(
    createClient(async () =>
      Response.json({ message: "Bad credentials" }, { status: 401 }),
    ).isStarred("a/b"),
    (e) => e instanceof GitHubError && e.status === 401,
  );
});
test("handles no-content writes and preserves request body", async () => {
  let actual: RequestInit | undefined;
  const client = createClient(async (_path, init) => {
    actual = init;
    return new Response(null, { status: 204 });
  });
  await client.comment("a/b", 3, "Hello");
  assert.equal(actual?.method, "POST");
  assert.deepEqual(JSON.parse(actual?.body as string), { body: "Hello" });
});
test("retains rate limit reset metadata", async () => {
  await assert.rejects(
    createClient(async () =>
      Response.json(
        { message: "Rate limited" },
        { status: 403, headers: { "x-ratelimit-reset": "1234" } },
      ),
    ).viewer(),
    (e) => e instanceof GitHubError && e.reset === "1234",
  );
});
test("decodes UTF-8 source and recognizes media formats", () => {
  assert.equal(
    decodeContent(Buffer.from("café → code").toString("base64")),
    "café → code",
  );
  for (const [file, kind] of [
    ["diagram.SVG", "svg"],
    ["photo.png", "image"],
    ["manual.pdf", "pdf"],
    ["clip.mp4", "video"],
    ["sound.flac", "audio"],
    ["data.zip", "binary"],
    ["README.md", "markdown"],
    ["app.tsx", "code"],
  ])
    assert.equal(fileFormat(file), kind);
});
