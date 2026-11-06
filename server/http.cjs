const { createOAuthSession } = require("../packages/github/src/oauth.cjs");
const gateway = require("../apps/desktop/src/gateway.cjs");
const config = require("../github-oauth.json");
const {
  sealSession,
  openSession,
  clearSession,
} = require("./session-cookie.cjs");
function createHandler(options = {}) {
  return async function handler(req, res) {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    res.setHeader("Vercel-CDN-Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    const send = (status, value) => {
      res.statusCode = status;
      res.end(value == null ? undefined : JSON.stringify(value));
    };
    const origin = req.headers.origin;
    if (
      req.headers["x-rivet"] !== "1" ||
      req.headers["sec-fetch-site"] === "cross-site" ||
      (origin && origin !== `https://${req.headers.host}`)
    )
      return send(403, { message: "Request origin is not allowed." });
    let auth;
    let secret;
    let authRoute = false;
    try {
      secret = options.secret || process.env.RIVET_SESSION_SECRET;
      const initialState = openSession(req.headers.cookie, secret);
      auth = createOAuthSession({
        clientId:
          options.clientId ||
          process.env.RIVET_GITHUB_CLIENT_ID ||
          config.clientId,
        initialState,
        fetch: options.fetch,
      });
      const url = new URL(req.url, "https://rivet.invalid");
      if (url.pathname.startsWith("/api/auth/")) {
        authRoute = true;
        const action = url.pathname.slice("/api/auth/".length);
        if (!["status", "begin", "poll", "cancel", "logout"].includes(action))
          return send(404, { message: "Not found." });
        if (req.method !== (action === "status" ? "GET" : "POST"))
          return send(405, { message: "Unsupported method." });
        const state = await auth[action]();
        res.setHeader(
          "Set-Cookie",
          action === "logout"
            ? clearSession()
            : sealSession(await auth.exportState(), secret),
        );
        return send(200, state);
      }
      if (!url.pathname.startsWith("/api/github/"))
        return send(404, { message: "Not found." });
      const state = await auth.exportState();
      if (
        state.credentials?.expiresAt &&
        state.credentials.expiresAt <= Date.now() + 60000
      )
        return send(409, {
          code: "SESSION_REFRESH_REQUIRED",
          message: "Refresh your GitHub session.",
        });
      const body =
        req.body == null
          ? undefined
          : typeof req.body === "string"
            ? req.body
            : JSON.stringify(req.body);
      if (body && Buffer.byteLength(body) > 1000000)
        return send(413, { message: "Request body is too large." });
      const token = await auth.accessToken({ refresh: false });
      const result = await (options.request || gateway.request)(
        url.pathname.slice("/api/github".length) + url.search,
        { method: req.method, body },
        token,
      );
      if (result.status === 401) res.setHeader("Set-Cookie", clearSession());
      for (const [key, value] of Object.entries(result.headers))
        res.setHeader(key, value);
      return send(result.status, result.body);
    } catch (error) {
      // Persist expiry/denial transitions too, so a stale device code does not keep polling.
      if (authRoute && auth && secret) {
        try {
          res.setHeader(
            "Set-Cookie",
            sealSession(await auth.exportState(), secret),
          );
        } catch {
          /* fail closed */
        }
      }
      return send(503, {
        message:
          error instanceof Error ? error.message : "GitHub request failed.",
      });
    }
  };
}
module.exports = { createHandler };
