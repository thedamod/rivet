import { test } from "node:test";
import assert from "node:assert/strict";
import { createOAuthSession, type OAuthCredentials } from "./oauth.cjs";
function fixture(responses: unknown[], saved: OAuthCredentials | null = null) {
  let time = 100000;
  const requests: { url: string; body: string }[] = [];
  const store: (OAuthCredentials | null)[] = [];
  const session = createOAuthSession({
    clientId: "public-app-id",
    now: () => time,
    storage: {
      load: async () => saved,
      save: async (value) => {
        store.push(value);
      },
    },
    fetch: (async (url, options) => {
      requests.push({ url: String(url), body: String(options?.body ?? "") });
      assert.ok(responses.length, "Unexpected OAuth network request");
      return Response.json(responses.shift());
    }) as typeof fetch,
  });
  return {
    session,
    requests,
    store,
    advance: (ms = 5000) => {
      time += ms;
    },
  };
}
const code = {
  device_code: "private-device-code",
  user_code: "ABCD-EFGH",
  verification_uri: "https://evil.example",
  expires_in: 900,
  interval: 5,
};
const grant = {
  access_token: "oauth-access",
  token_type: "bearer",
  refresh_token: "oauth-refresh",
  expires_in: 28800,
  refresh_token_expires_in: 15897600,
};
test("device OAuth limits polling, handles slow_down, and never exposes credentials in public state", async () => {
  const f = fixture([
    code,
    { error: "authorization_pending" },
    { error: "slow_down", interval: 10 },
    grant,
    { login: "viewer" },
  ]);
  const initial = await f.session.begin();
  assert.equal(
    initial.pending?.verificationUri,
    "https://github.com/login/device",
  );
  assert.equal(initial.pending?.userCode, "ABCD-EFGH");
  await f.session.poll();
  assert.equal(f.requests.length, 1);
  f.advance();
  await f.session.poll();
  f.advance();
  assert.equal((await f.session.poll()).pending?.interval, 10);
  f.advance();
  await f.session.poll();
  assert.equal(f.requests.length, 3);
  f.advance();
  const complete = await f.session.poll();
  assert.equal(complete.authenticated, true);
  assert.equal(complete.pending, null);
  assert.equal(await f.session.accessToken(), "oauth-access");
  assert.equal(f.store.length, 1);
  assert.doesNotMatch(
    JSON.stringify([initial, complete]),
    /private-device-code|oauth-access|oauth-refresh/,
  );
  assert.equal(
    new URLSearchParams(f.requests[1].body).get("grant_type"),
    "urn:ietf:params:oauth:grant-type:device_code",
  );
  assert.ok(f.requests.every((r) => !r.body.includes("client_secret")));
});
test("device OAuth reports denial and expiry without saving a session", async () => {
  const f = fixture([code, { error: "access_denied" }, code]);
  await f.session.begin();
  f.advance();
  await assert.rejects(f.session.poll(), /cancelled/);
  assert.equal((await f.session.status()).pending, null);
  await f.session.begin();
  f.advance(901000);
  await assert.rejects(f.session.poll(), /expired/);
  assert.equal(f.store.length, 0);
});
test("refresh rotates and persists credentials once for concurrent API calls", async () => {
  const saved = {
    clientId: "public-app-id",
    accessToken: "old",
    refreshToken: "old-refresh",
    expiresAt: 120000,
    refreshExpiresAt: 999999,
  };
  const f = fixture([grant], saved);
  assert.deepEqual(
    await Promise.all([f.session.accessToken(), f.session.accessToken()]),
    ["oauth-access", "oauth-access"],
  );
  assert.equal(f.requests.length, 1);
  assert.equal(
    new URLSearchParams(f.requests[0].body).get("refresh_token"),
    "old-refresh",
  );
  assert.equal(f.store[0]?.refreshToken, "oauth-refresh");
  await f.session.invalidate("old");
  assert.equal((await f.session.status()).authenticated, true);
  await f.session.invalidate("oauth-access");
  assert.equal((await f.session.status()).authenticated, false);
  assert.equal(f.store.at(-1), null);
});
test("an invalid refresh grant clears the saved session", async () => {
  const f = fixture([{ error: "bad_refresh_token" }], {
    clientId: "public-app-id",
    accessToken: "old",
    refreshToken: "bad",
    expiresAt: 1,
  });
  assert.equal(await f.session.accessToken(), null);
  assert.equal(f.store.at(-1), null);
});
test("cancellation discards an in-flight authorization grant", async () => {
  let finish!: (value: Response) => void;
  let time = 0;
  let calls = 0;
  const saves: unknown[] = [];
  const auth = createOAuthSession({
    clientId: "id",
    now: () => time,
    storage: {
      load: async () => null,
      save: async (value) => {
        saves.push(value);
      },
    },
    fetch: (async () =>
      ++calls === 1
        ? Response.json(code)
        : new Promise<Response>((resolve) => {
            finish = resolve;
          })) as typeof fetch,
  });
  await auth.begin();
  time = 5000;
  const poll = auth.poll();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await auth.cancel();
  finish(Response.json(grant));
  await poll;
  assert.equal((await auth.status()).authenticated, false);
  assert.equal(saves.length, 0);
});
test("a storage failure cannot report a successful sign-in and can be retried", async () => {
  let time = 0;
  const responses = [code, grant, {}];
  const auth = createOAuthSession({
    clientId: "id",
    now: () => time,
    storage: {
      load: async () => {
        throw new Error("locked");
      },
      save: async () => {
        throw new Error("locked");
      },
    },
    fetch: (async () => Response.json(responses.shift())) as typeof fetch,
  });
  await auth.begin();
  time = 5000;
  await assert.rejects(auth.poll(), /locked/);
  assert.equal((await auth.status()).authenticated, false);
});
