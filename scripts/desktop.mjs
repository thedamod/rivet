import { spawn } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const vite = spawn(
  process.execPath,
  [
    new URL("../node_modules/vite/bin/vite.js", import.meta.url).pathname,
    "--host",
    "127.0.0.1",
  ],
  { cwd: new URL("../apps/web", import.meta.url), stdio: "inherit" },
);
let desktop;
function stop() {
  desktop?.kill();
  vite.kill();
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
for (let i = 0; i < 100; i++) {
  if (vite.exitCode !== null) process.exit(vite.exitCode);
  try {
    const response = await fetch("http://127.0.0.1:5173");
    if (response.ok) {
      desktop = spawn(require("electron"), ["."], {
        cwd: new URL("../apps/desktop", import.meta.url),
        stdio: "inherit",
        env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined },
      });
      desktop.on("exit", (code) => {
        vite.kill();
        process.exit(code || 0);
      });
      break;
    }
  } catch {}
  await new Promise((resolve) => setTimeout(resolve, 200));
}
if (!desktop) {
  stop();
  throw new Error("Vite did not start");
}
