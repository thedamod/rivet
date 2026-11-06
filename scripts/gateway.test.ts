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
        headers: { "X-Rivet": "1", Origin: "https://evil.test" },
      })
    ).status,
    403,
  );
});
test("gateway requires an explicit OAuth session and never falls back to environment tokens", async () => {
  const previous = process.env.GH_TOKEN;
  process.env.GH_TOKEN = "ignored-pat";
  try {
    assert.equal((await gateway.request("/user")).status, 401);
  } finally {
    if (previous === undefined) delete process.env.GH_TOKEN;
    else process.env.GH_TOKEN = previous;
  }
});
test("OAuth development endpoints enforce origin, marker, and HTTP method", async () => {
  if (!process.env.TEST_BASE_URL) return;
  const url = process.env.TEST_BASE_URL + "/api/auth/";
  assert.equal((await fetch(url + "status")).status, 403);
  assert.equal(
    (
      await fetch(url + "begin", {
        method: "POST",
        headers: { "X-Rivet": "1", Origin: "https://evil.test" },
      })
    ).status,
    403,
  );
  assert.equal(
    (await fetch(url + "logout", { headers: { "X-Rivet": "1" } })).status,
    405,
  );
  const response = await fetch(url + "status", {
    headers: { "X-Rivet": "1" },
  });
  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("set-cookie") || "",
    /HttpOnly; SameSite=Strict/,
  );
  assert.deepEqual(Object.keys(await response.json()).sort(), [
    "authenticated",
    "configured",
    "pending",
  ]);
});
