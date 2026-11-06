import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import gateway from "../desktop/src/gateway.cjs";
export default defineConfig({
  base: "./",
  plugins: [
    react(),
    {
      name: "github-api",
      configureServer(server) {
        server.middlewares.use("/api/github", async (req, res) => {
          const origin = req.headers.origin;
          if (origin && origin !== `http://${req.headers.host}`) {
            res.writeHead(403).end();
            return;
          }
          if (req.headers["x-git-client"] !== "1") {
            res.writeHead(403).end();
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
          const result = await gateway.request(req.url || "/", {
            method: req.method,
            body,
          });
          res.writeHead(result.status, {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
            ...result.headers,
          });
          res.end(
            result.body === null ? undefined : JSON.stringify(result.body),
          );
        });
      },
    },
  ],
  server: { port: 5173, strictPort: true },
});
