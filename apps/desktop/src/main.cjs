const {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  dialog,
  safeStorage,
} = require("electron");
const path = require("node:path");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const gateway = require("./gateway.cjs");
const { cloneOptions } = require("./clone.cjs");
const exec = promisify(execFile);
app.setName("Rivet");
let window;
function trusted(event) {
  return (
    event.sender === window?.webContents &&
    event.senderFrame === window.webContents.mainFrame
  );
}
app.whenReady().then(() => {
  if (!app.isPackaged) {
    try {
      process.loadEnvFile(path.join(__dirname, "../../../.env"));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  const { createOAuthSession } = require(
    app.isPackaged
      ? path.join(process.resourcesPath, "oauth.cjs")
      : "../../../packages/github/src/oauth.cjs",
  );
  const config = require(
    app.isPackaged
      ? path.join(process.resourcesPath, "github-oauth.json")
      : "../../../github-oauth.json",
  );
  const { encryptedStorage } = require("./oauth-storage.cjs");
  const auth = createOAuthSession({
    clientId: process.env.RIVET_GITHUB_CLIENT_ID || config.clientId,
    storage: encryptedStorage(
      path.join(app.getPath("userData"), "github-oauth.enc"),
      safeStorage,
    ),
  });
  window = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 760,
    minHeight: 600,
    title: "Rivet",
    backgroundColor: "#0a0a0a",
    icon: path.join(__dirname, "../assets/icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  window.on("app-command", (_event, command) => {
    const h = window.webContents.navigationHistory;
    if (command === "browser-backward" && h.canGoBack()) h.goBack();
    if (command === "browser-forward" && h.canGoForward()) h.goForward();
  });
  window.webContents.on("before-input-event", (event, input) => {
    if (
      input.type === "keyDown" &&
      input.alt &&
      ["ArrowLeft", "ArrowRight"].includes(input.key)
    ) {
      event.preventDefault();
      const h = window.webContents.navigationHistory;
      if (input.key === "ArrowLeft" && h.canGoBack()) h.goBack();
      if (input.key === "ArrowRight" && h.canGoForward()) h.goForward();
    }
  });
  ipcMain.handle("github:request", async (event, apiPath, options) => {
    if (!trusted(event)) throw new Error("Untrusted frame");
    const token = await auth.accessToken();
    const result = await gateway.request(apiPath, options, token);
    if (result.status === 401) await auth.invalidate(token);
    return result;
  });
  ipcMain.handle("auth:action", (event, action) => {
    if (
      !trusted(event) ||
      !["status", "begin", "poll", "cancel", "logout"].includes(action)
    )
      throw new Error("Invalid authentication request");
    return auth[action]();
  });
  ipcMain.handle("external:open", (event, url) => {
    if (trusted(event) && typeof url === "string" && /^https:\/\//.test(url))
      return shell.openExternal(url);
  });
  ipcMain.handle("repo:clone", async (event, repo) => {
    if (
      !trusted(event) ||
      typeof repo !== "string" ||
      !/^[-\w.]+\/[-\w.]+$/.test(repo)
    )
      throw new Error("Invalid repository");
    const result = await dialog.showOpenDialog(window, {
      properties: ["openDirectory", "createDirectory"],
      title: "Choose a parent folder for the repository",
    });
    if (result.canceled) return { canceled: true };
    const destination = path.join(result.filePaths[0], repo.split("/")[1]);
    try {
      const token = await auth.accessToken();
      if (!token) return { error: "Sign in with GitHub before cloning." };
      const options = cloneOptions(token);
      await exec(
        "git",
        [
          ...options.args,
          "clone",
          `https://github.com/${repo}.git`,
          destination,
        ],
        {
          env: options.env,
          timeout: 300000,
          maxBuffer: 1024 * 1024,
        },
      );
      return { path: destination };
    } catch {
      return {
        error:
          "Could not clone repository. Install Git and choose a folder without an existing checkout.",
      };
    }
  });
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, url) => {
    if (url !== window.webContents.getURL()) event.preventDefault();
  });
  window.webContents.session.setPermissionRequestHandler(
    (_contents, _permission, callback) => callback(false),
  );
  if (app.isPackaged)
    window.loadFile(path.join(process.resourcesPath, "web", "index.html"));
  else window.loadURL("http://127.0.0.1:5173");
});
app.on("window-all-closed", () => app.quit());
