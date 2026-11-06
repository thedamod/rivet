import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { encryptedStorage } = require("../apps/desktop/src/oauth-storage.cjs");
const { createBrowserSessions } = require("../apps/desktop/src/dev-auth.cjs");
test("desktop credential persistence encrypts, restores and deletes the session", async () => {
  const dir = await mkdtemp(join(tmpdir(), "git-client-auth-"));
  const file = join(dir, "oauth.enc");
  let plaintext = "";
  const safeStorage = {
    isAsyncEncryptionAvailable: async () => true,
    getSelectedStorageBackend: () => "gnome_libsecret",
    encryptStringAsync: async (value: string) => {
      plaintext = value;
      return Buffer.from("encrypted-fixture");
    },
    decryptStringAsync: async () => ({
      result: plaintext,
      shouldReEncrypt: false,
    }),
  };
  try {
    const storage = encryptedStorage(file, safeStorage);
    assert.equal(await storage.load(), null);
    const credentials = {
      clientId: "id",
      accessToken: "oauth-secret",
      refreshToken: "refresh-secret",
    };
    await storage.save(credentials);
    assert.equal(await readFile(file, "utf8"), "encrypted-fixture");
    assert.deepEqual(await storage.load(), credentials);
    await storage.save(null);
    await assert.rejects(readFile(file), { code: "ENOENT" });
    const locked = encryptedStorage(file, {
      ...safeStorage,
      isAsyncEncryptionAvailable: async () => false,
    });
    await assert.rejects(locked.save(credentials), /keyring/);
    await assert.rejects(readFile(file), { code: "ENOENT" });
    if (process.platform === "linux") {
      const insecure = encryptedStorage(file, {
        ...safeStorage,
        getSelectedStorageBackend: () => "basic_text",
      });
      await assert.rejects(insecure.save(credentials), /keyring/);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("development browser sessions are isolated by opaque HttpOnly cookies", () => {
  const session = createBrowserSessions("id");
  const cookies: string[] = [];
  const res = {
    setHeader: (_name: string, value: string) => {
      cookies.push(value);
    },
  };
  const first = session({ headers: {} }, res);
  const second = session({ headers: {} }, res);
  assert.notEqual(first, second);
  const cookie = cookies[0].split(";")[0];
  assert.equal(session({ headers: { cookie } }, res), first);
  assert.match(cookies[0], /HttpOnly; SameSite=Strict/);
  assert.doesNotMatch(cookies[0], /oauth-secret|refresh/);
});
test("cloning supplies OAuth through a temporary Git helper without credentials in argv", async () => {
  const { cloneOptions } = require("../apps/desktop/src/clone.cjs");
  const { execFileSync } = await import("node:child_process");
  const options = cloneOptions("fixture-oauth-credential");
  assert.doesNotMatch(JSON.stringify(options.args), /fixture-oauth-credential/);
  const result = execFileSync("git", [...options.args, "credential", "fill"], {
    env: options.env,
    input: "protocol=https\nhost=github.com\n\n",
    encoding: "utf8",
  });
  assert.match(result, /username=x-access-token/);
  assert.match(result, /password=fixture-oauth-credential/);
});
