const {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} = require("node:crypto");
const cookieName = "__Host-rivet_session";
const associatedData = Buffer.from("rivet-session-v1");
function keyFrom(secret) {
  const key = Buffer.from(secret || "", "base64url");
  if (key.length !== 32)
    throw new Error("Web session encryption is not configured.");
  return key;
}
function sealSession(state, secret, now = Date.now()) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFrom(secret), iv);
  cipher.setAAD(associatedData);
  const lifetime =
    state.pending && !state.credentials
      ? 15 * 60 * 1000
      : 30 * 24 * 60 * 60 * 1000;
  const clear = JSON.stringify({ v: 1, exp: now + lifetime, state });
  const encrypted = Buffer.concat([
    cipher.update(clear, "utf8"),
    cipher.final(),
  ]);
  const value = [iv, encrypted, cipher.getAuthTag()]
    .map((b) => b.toString("base64url"))
    .join(".");
  if (value.length > 3600)
    throw new Error("The GitHub session is too large to save.");
  return `${cookieName}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${lifetime / 1000}`;
}
function openSession(cookie, secret, now = Date.now()) {
  const key = keyFrom(secret);
  const value = new RegExp(`(?:^|;\\s*)${cookieName}=([^;]+)`).exec(
    cookie || "",
  )?.[1];
  if (!value) return null;
  try {
    const parts = value.split(".");
    if (parts.length !== 3 || value.length > 3600) return null;
    const [iv, encrypted, tag] = parts.map((p) => Buffer.from(p, "base64url"));
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAAD(associatedData);
    decipher.setAuthTag(tag);
    const data = JSON.parse(
      Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
        "utf8",
      ),
    );
    return data.v === 1 && data.exp > now ? data.state : null;
  } catch {
    return null;
  }
}
const clearSession = () =>
  `${cookieName}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
module.exports = { sealSession, openSession, clearSession, cookieName };
