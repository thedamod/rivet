const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("desktop", {
  request: (path, options) =>
    ipcRenderer.invoke("github:request", path, options),
  openExternal: (url) => ipcRenderer.invoke("external:open", url),
  clone: (repo) => ipcRenderer.invoke("repo:clone", repo),
});
