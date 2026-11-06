const { randomBytes } = require("node:crypto");
const {
  createOAuthSession,
} = require("../../../packages/github/src/oauth.cjs");
// Dev browser credentials stay in memory, isolated by an HttpOnly cookie.
function createBrowserSessions(clientId) {
  const sessions = new Map();
  return (req, res) => {
    const now = Date.now();
    for (const [key, value] of sessions) {
      if (now - value.touched > 24 * 60 * 60 * 1000) {
        void value.auth.logout();
        sessions.delete(key);
      }
    }
    let id = /(?:^|;\s*)git_client_session=([a-f0-9]{64})(?:;|$)/.exec(
      req.headers.cookie || "",
    )?.[1];
    if (!id || !sessions.has(id)) {
      if (sessions.size >= 1000)
        throw new Error(
          "Too many browser sessions. Restart the development server.",
        );
      id = randomBytes(32).toString("hex");
      sessions.set(id, {
        touched: now,
        auth: createOAuthSession({ clientId }),
      });
      res.setHeader(
        "Set-Cookie",
        `git_client_session=${id}; Path=/api; HttpOnly; SameSite=Strict`,
      );
    }
    const session = sessions.get(id);
    session.touched = now;
    return session.auth;
  };
}
module.exports = { createBrowserSessions };
