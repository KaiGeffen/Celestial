const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  quit: () => ipcRenderer.send('quit'),
  getSteamAuthSession: () => ipcRenderer.invoke('steam:getAuthSession'),
})
