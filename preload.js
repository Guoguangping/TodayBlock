'use strict';

const { contextBridge, ipcRenderer, webUtils } = require('electron');

function subscribe(channel, callback) {
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('today', {
  getState: () => ipcRenderer.invoke('app:get-state'),
  createTask: (task) => ipcRenderer.invoke('task:create', task),
  updateTask: (id, patch) => ipcRenderer.invoke('task:update', id, patch),
  toggleTask: (id) => ipcRenderer.invoke('task:toggle', id),
  deleteTask: (id) => ipcRenderer.invoke('task:delete', id),
  bulkCreate: (payload) => ipcRenderer.invoke('task:bulk-create', payload),
  parseFiles: (paths) => ipcRenderer.invoke('file:parse', paths),
  openFilesInPanel: (paths) => ipcRenderer.invoke('file:open-in-panel', paths),
  parseText: (text) => ipcRenderer.invoke('text:parse', text),
  readClipboardText: () => ipcRenderer.invoke('clipboard:read-text'),
  getPathForFile: (file) => webUtils.getPathForFile(file),
  updateSettings: (patch) => ipcRenderer.invoke('settings:update', patch),
  testAI: () => ipcRenderer.invoke('ai:test'),
  exportBackup: () => ipcRenderer.invoke('backup:export'),
  openDataFolder: () => ipcRenderer.invoke('data:open-folder'),
  clearDemo: () => ipcRenderer.invoke('data:clear-demo'),
  openSource: (path) => ipcRenderer.invoke('app:open-source', path),
  setExpanded: (value) => ipcRenderer.invoke('window:set-expanded', value),
  resetPosition: () => ipcRenderer.invoke('window:reset-position'),
  dragStart: () => ipcRenderer.send('window:drag-start'),
  dragTo: (point) => ipcRenderer.send('window:drag-to', point),
  dragEnd: () => ipcRenderer.send('window:drag-end'),
  hide: () => ipcRenderer.send('window:hide'),
  quit: () => ipcRenderer.send('window:quit'),
  onStateChanged: (callback) => subscribe('state:changed', callback),
  onExpanded: (callback) => subscribe('ui:expanded', callback),
  onOpenSettings: (callback) => subscribe('ui:open-settings', callback),
  onFocusTask: (callback) => subscribe('ui:focus-task', callback),
  onShowPreview: (callback) => subscribe('ui:show-preview', callback),
  onShowParseError: (callback) => subscribe('ui:show-parse-error', callback)
});
