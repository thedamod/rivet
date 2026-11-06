const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createHandler } = require("./http.cjs");
const { sealSession, openSession } = require("./session-cookie.cjs");
const secret = Buffer.alloc(32, 7).toString("base64url");
const state = {
  clientId: "public-id",
  credentials: {
    clientId: "public-id",
    accessToken: "fixture-access",
    refreshToken: "fixture-refresh",
    expiresAt: Date.now() + 3600000,
  },
  pending: null,
};
async function invoke(
  options = {},
  { path = "/api/auth/status", method = "GET", headers = {}, body } = {},
) {
  const outgoing = {};
  const response = {
    statusCode: 200,
    setHeader: (key, value) => {
      outgoing[key.toLowerCase()] = value;
    },
    end: (value) => {
      response.text = value;
    },
  };
  await createHandler({ secret, clientId: "public-id", ...options })(
    {
      url: path,
      method,
      headers: { host: "rivet.test", "x-rivet": "1", ...headers },
      body,
    },
    response,
  );
  return {
    status: response.statusCode,
    headers: outgoing,
    data: response.text ? JSON.parse(response.text) : null,
  };
}
test("web session cookies are encrypted, authenticated, expiring and host-bound", () => {
  const cookie = sealSession(state, secret, 1000);
  assert.match(cookie, /^__Host-rivet_session=/);
  assert.match(cookie, /Path=\/; HttpOnly; Secure; SameSite=Strict/);
  assert.doesNotMatch(cookie, /fixture-access|fixture-refresh/);
  assert.deepEqual(openSession(cookie, secret, 1001), state);
  const value = cookie.split(";")[0];
  const [prefix, cipher, tag] = value.split(".");
  const alteredCipher = (cipher[0] === "a" ? "b" : "a") + cipher.slice(1);
  assert.equal(
    openSession([prefix, alteredCipher, tag].join("."), secret, 1001),
    null,
  );
  assert.equal(
    openSession(cookie, secret, 1000 + 31 * 24 * 60 * 60 * 1000),
    null,
  );
  assert.equal(
    openSession(cookie, Buffer.alloc(32, 8).toString("base64url"), 1001),
    null,
  );
});
test("production API checks the request marker, origin and auth methods", async () => {
  assert.equal((await invoke({}, { headers: { "x-rivet": "" } })).status, 403);
  assert.equal(
    (await invoke({}, { headers: { origin: "https://evil.test" } })).status,
    403,
  );
  assert.equal(
    (await invoke({}, { headers: { "sec-fetch-site": "cross-site" } })).status,
    403,
  );
  assert.equal((await invoke({}, { path: "/api/auth/logout" })).status, 405);
  assert.equal(
    (await invoke({}, { path: "/api/auth/accessToken", method: "POST" }))
      .status,
    404,
  );
  const result = await invoke(
    {},
    { headers: { origin: "https://rivet.test" } },
  );
  assert.equal(result.status, 200);
  assert.deepEqual(Object.keys(result.data).sort(), [
    "authenticated",
    "configured",
    "pending",
  ]);
  assert.equal(result.data.authenticated, false);
  assert.match(result.headers["cache-control"], /no-store/);
});
test("device sign-in survives separate serverless invocations without returning tokens", async () => {
  const code = {
    device_code: "fixture-device",
    user_code: "ABCD-EFGH",
    expires_in: 900,
    interval: 5,
  };
  const begin = await invoke(
    { fetch: async () => Response.json(code) },
    { path: "/api/auth/begin", method: "POST" },
  );
  assert.equal(begin.data.pending.userCode, "ABCD-EFGH");
  const restored = openSession(begin.headers["set-cookie"], secret);
  restored.pending.nextPollAt = 0;
  const responses = [
    {
      access_token: "fixture-access",
      token_type: "bearer",
      expires_in: 3600,
      refresh_token: "fixture-refresh",
    },
    { login: "user" },
  ];
  const poll = await invoke(
    { fetch: async () => Response.json(responses.shift()) },
    {
      path: "/api/auth/poll",
      method: "POST",
      headers: { cookie: sealSession(restored, secret) },
    },
  );
  assert.equal(poll.data.authenticated, true);
  assert.equal(poll.data.pending, null);
  assert.doesNotMatch(
    JSON.stringify(poll.data),
    /fixture-access|fixture-refresh|fixture-device/,
  );
  const result = await invoke(
    {
      request: async (path, options, token) => {
        assert.equal(path, "/user?detail=1");
        assert.equal(token, "fixture-access");
        return { status: 200, body: { login: "user" }, headers: {} };
      },
    },
    {
      path: "/api/github/user?detail=1",
      headers: { cookie: poll.headers["set-cookie"] },
    },
  );
  assert.equal(result.status, 200);
  assert.equal(result.headers["set-cookie"], undefined);
});
test("expired access is refreshed only through the serialized auth route before replaying writes", async () => {
  const expired = {
    ...state,
    credentials: { ...state.credentials, expiresAt: 1 },
  };
  const cookie = sealSession(expired, secret);
  const result = await invoke(
    {
      request: async () => {
        throw new Error("Must not forward the write before refresh");
      },
    },
    {
      path: "/api/github/repos/a/b/issues",
      method: "POST",
      headers: { cookie },
      body: { title: "Issue" },
    },
  );
  assert.equal(result.status, 409);
  assert.equal(result.data.code, "SESSION_REFRESH_REQUIRED");
  const refreshed = await invoke(
    {
      fetch: async () =>
        Response.json({
          access_token: "new-access",
          refresh_token: "new-refresh",
          token_type: "bearer",
          expires_in: 3600,
        }),
    },
    { headers: { cookie } },
  );
  assert.equal(refreshed.data.authenticated, true);
  assert.equal(
    openSession(refreshed.headers["set-cookie"], secret).credentials
      .accessToken,
    "new-access",
  );
});
test("sign-out and GitHub 401 responses clear the host session cookie", async () => {
  const cookie = sealSession(state, secret);
  const logout = await invoke(
    {},
    { path: "/api/auth/logout", method: "POST", headers: { cookie } },
  );
  assert.equal(logout.data.authenticated, false);
  assert.match(logout.headers["set-cookie"], /Max-Age=0/);
  const revoked = await invoke(
    {
      request: async () => ({
        status: 401,
        body: { message: "Bad credentials" },
        headers: {},
      }),
    },
    { path: "/api/github/user", headers: { cookie } },
  );
  assert.equal(revoked.status, 401);
  assert.match(revoked.headers["set-cookie"], /Max-Age=0/);
});
