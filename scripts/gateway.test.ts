import { test } from "node:test";
import assert from "node:assert/strict";
import gateway from "../apps/desktop/src/gateway.cjs";
test("gateway rejects unsafe paths and unsupported verbs without authentication", async () => {
  assert.equal((await gateway.request("//evil.test")).status, 400);
  assert.equal(
    (await gateway.request("/user", { method: "CONNECT" })).status,
    405,
  );
});
test("development API requires its request marker and same origin", async () => {
  if (!process.env.TEST_BASE_URL) return;
  const url = process.env.TEST_BASE_URL + "/api/github/user";
  assert.equal((await fetch(url)).status, 403);
  assert.equal(
    (
      await fetch(url, {
        headers: { "X-Git-Client": "1", Origin: "https://evil.test" },
      })
    ).status,
    403,
  );
});
