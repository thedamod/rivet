const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
const path = require("node:path");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const gateway = require("./gateway.cjs");
const exec = promisify(execFile);
let window;
function trusted(event) {
  return (
    event.sender === window?.webContents &&
    event.senderFrame === window.webContents.mainFrame
  );
}
app.whenReady().then(() => {
  window = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 760,
    minHeight: 600,
    title: "Git Client",
    backgroundColor: "#0a0a0a",
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
  ipcMain.handle("github:request", (event, apiPath, options) => {
    if (!trusted(event)) throw new Error("Untrusted frame");
    return gateway.request(apiPath, options);
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
      await exec("gh", ["repo", "clone", repo, destination], {
        timeout: 300000,
        maxBuffer: 1024 * 1024,
      });
      return { path: destination };
    } catch {
      return {
        error:
          "Could not clone repository. Check gh authentication and choose a folder without an existing checkout.",
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
