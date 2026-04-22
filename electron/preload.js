const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getDeviceId:  () => ipcRenderer.invoke('get-device-id'),
  getLicense:   () => ipcRenderer.invoke('get-license'),
  saveLicense:  (key) => ipcRenderer.invoke('save-license', key),
  clearLicense: () => ipcRenderer.invoke('clear-license'),
});
