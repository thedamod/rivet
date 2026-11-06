function validPath(path) {
  return (
    typeof path === "string" &&
    /^\/(user(?:s)?|repos|search|notifications|graphql)(?:\/|\?|$)/.test(
      path,
    ) &&
    !/[\\\r\n#]/.test(path) &&
    !path.includes("..") &&
    !/%(?:2f|5c|2e)/i.test(path.split("?")[0])
  );
}
async function request(path, options = {}, token) {
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
    if (!token)
      return {
        status: 401,
        body: { message: "Sign in with GitHub to continue." },
        headers: {},
      };
    const response = await fetch("https://api.github.com" + path, {
      method,
      body: options.body || undefined,
      signal: AbortSignal.timeout(30000),
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: "Bearer " + token,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        "User-Agent": "Rivet",
      },
    });
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
        message: "GitHub connection failed. Check your network and try again.",
      },
      headers: {},
    };
  }
}
module.exports = { request, validPath };
