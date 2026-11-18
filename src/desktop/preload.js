/* ส่งความสามารถของโปรแกรมให้หน้าต่าง (app.html) ใช้อย่างจำกัด: เปิดลิงก์ด้วยเบราว์เซอร์ + เวอร์ชัน */
'use strict';
const { contextBridge, ipcRenderer } = require('electron');

const info = ipcRenderer.sendSync('app-info') || {};
contextBridge.exposeInMainWorld('liveStage', {
  isDesktop: true,
  startLiveOutput: () => ipcRenderer.invoke('live-output:start'),
  openLiveManager: () => ipcRenderer.invoke('tiktok-account:manager'),
  tiktokAccountStatus: () => ipcRenderer.invoke('tiktok-account:status'),
  tiktokAccountLogin: () => ipcRenderer.invoke('tiktok-account:login'),
  tiktokAccountLogout: () => ipcRenderer.invoke('tiktok-account:logout'),
  version: info.version || '',
  platform: info.platform || '',
  openExternal: (url) => ipcRenderer.send('open-external', String(url || '')),
  // หน้าต่างพรีวิวแยก (ลอยบนสุดได้)
  openPreview: () => ipcRenderer.send('preview-open'),
  setPreviewPin: (on) => ipcRenderer.send('preview-pin', !!on),
  getPreviewPin: () => !!ipcRenderer.sendSync('preview-get-pin'),
  // ห้องควบคุมไลฟ์ (เด้งเองตอนเริ่มไลฟ์ / เปิดเองจากหน้าหลัก)
  openControl: () => ipcRenderer.send('control-open'),
  setControlPin: (on) => ipcRenderer.send('control-pin', !!on),
  getControlPin: () => !!ipcRenderer.sendSync('control-get-pin'),
});
