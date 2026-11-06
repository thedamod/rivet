const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const exec = promisify(execFile);
let cachedToken;
let expires = 0;
function validPath(path) {
  return (
    typeof path === "string" &&
    /^\/(user(?:s)?|repos|search|notifications|graphql)(?:\/|\?|$)/.test(path) &&
    !/[\\\r\n#]/.test(path) &&
    !path.includes("..") &&
    !/%(?:2f|5c|2e)/i.test(path.split("?")[0])
  );
}
async function request(path, options = {}) {
  if (!validPath(path))
    return {
      status: 400,
      body: { message: "Invalid GitHub API path" },
      headers: {},
    };
  const method = options.method || "GET";
  if (!["GET", "POST", "PATCH", "PUT", "DELETE"].includes(method))
    return {
      status: 405,
      body: { message: "Unsupported method" },
      headers: {},
    };
  try {
    if (!cachedToken || Date.now() > expires) {
      cachedToken =
        process.env.GH_TOKEN ||
        process.env.GITHUB_TOKEN ||
        (await exec("gh", ["auth", "token"], { timeout: 10000 })).stdout.trim();
      expires = Date.now() + 60000;
    }
    const response = await fetch("https://api.github.com" + path, {
      method,
      body: options.body || undefined,
      signal: AbortSignal.timeout(30000),
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: "Bearer " + cachedToken,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        "User-Agent": "Git-Client",
      },
    });
    if (response.status === 401) {
      cachedToken = undefined;
      expires = 0;
    }
    return {
      status: response.status,
      body: response.status === 204 ? null : await response.json(),
      headers: {
        "x-ratelimit-remaining":
          response.headers.get("x-ratelimit-remaining") || "",
        "x-ratelimit-reset": response.headers.get("x-ratelimit-reset") || "",
      },
    };
  } catch (error) {
    return {
      status: 503,
      body: {
        message:
          error.code === "ENOENT"
            ? "Install GitHub CLI and run gh auth login, or set GH_TOKEN."
            : "GitHub connection failed. Check gh auth status and your network.",
      },
      headers: {},
    };
  }
}
module.exports = { request, validPath };
