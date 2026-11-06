const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("desktop", {
  auth: (action) => ipcRenderer.invoke("auth:action", action),
  request: (path, options) =>
    ipcRenderer.invoke("github:request", path, options),
  openExternal: (url) => ipcRenderer.invoke("external:open", url),
  clone: (repo) => ipcRenderer.invoke("repo:clone", repo),
});
