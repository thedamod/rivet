import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import gateway from "../desktop/src/gateway.cjs";
import { createBrowserSessions } from "../desktop/src/dev-auth.cjs";
import config from "../../github-oauth.json";
export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: [
    react(),
    {
      name: "github-api",
      configureServer(server) {
        const env = loadEnv(
          mode,
          new URL("../..", import.meta.url).pathname,
          "",
        );
        const session = createBrowserSessions(
          process.env.GIT_CLIENT_GITHUB_CLIENT_ID ||
            env.GIT_CLIENT_GITHUB_CLIENT_ID ||
            config.clientId,
        );
        server.middlewares.use("/api", async (req, res, next) => {
          if (!req.url?.startsWith("/github") && !req.url?.startsWith("/auth/"))
            return next();
          const origin = req.headers.origin;
          if (
            (origin && origin !== `http://${req.headers.host}`) ||
            req.headers["x-git-client"] !== "1"
          ) {
            res.writeHead(403).end();
            return;
          }
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Cache-Control", "no-store");
          try {
            const auth = session(req, res);
            if (req.url.startsWith("/auth/")) {
              const action = req.url.slice(6);
              if (
                !["status", "begin", "poll", "cancel", "logout"].includes(
                  action,
                ) ||
                req.method !== (action === "status" ? "GET" : "POST")
              ) {
                res.writeHead(405).end();
                return;
              }
              const result =
                await auth[
                  action as "status" | "begin" | "poll" | "cancel" | "logout"
                ]();
              res.end(JSON.stringify(result));
              return;
            }
            let body = "";
            for await (const part of req) {
              body += part;
              if (body.length > 1000000) {
                res.writeHead(413).end();
                return;
              }
            }
            const token = await auth.accessToken();
            const result = await gateway.request(
              req.url.slice(7) || "/",
              { method: req.method, body },
              token,
            );
            if (result.status === 401) await auth.invalidate(token);
            res.writeHead(result.status, result.headers);
            res.end(
              result.body === null ? undefined : JSON.stringify(result.body),
            );
          } catch (error) {
            res
              .writeHead(503)
              .end(
                JSON.stringify({
                  message:
                    error instanceof Error
                      ? error.message
                      : "GitHub sign-in failed.",
                }),
              );
          }
        });
      },
    },
  ],
  server: { host: "0.0.0.0", port: 5173, strictPort: true },
}));
