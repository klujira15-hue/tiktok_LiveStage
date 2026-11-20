/* Live Stage by TubHool — โปรแกรมติดตั้ง (Electron)
 * เปิดเซิร์ฟเวอร์หน้าเวทีในตัว (server.js) แล้วแสดงหน้าต่างโปรแกรม (public/app.html)
 * ข้อมูลผู้ใช้เก็บที่ userData/data (Windows: %APPDATA%\Live Stage, Mac: ~/Library/Application Support/Live Stage)
 * โทเคนบัญชี TubHool เข้ารหัสด้วยระบบของเครื่อง (Windows DPAPI / macOS Keychain) ผ่าน safeStorage
 */
'use strict';
const { app, BrowserWindow, Menu, dialog, ipcMain, safeStorage, shell } = require('electron');
const fs = require('fs');
const net = require('net');
const path = require('path');
require('./stdio-guard')();
// Keep the animation clock and preview painting live when another window covers the app.
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-features','CalculateNativeWinOcclusion');


// พอร์ตของหน้าเวที: ใช้พอร์ตเดิมที่เคยใช้ (ลิงก์ใน LIVE Studio จะได้ไม่เปลี่ยน) ถ้าไม่ว่างค่อยหาพอร์ตอื่น
let PORT = Number(process.env.LIVESTAGE_PORT) || 3030;
let ORIGIN = `http://127.0.0.1:${PORT}`;
let win = null;
// ใช้ทดสอบ: เก็บข้อมูลไว้โฟลเดอร์อื่น ไม่ปนกับของจริง
if (process.env.LIVESTAGE_USERDATA) app.setPath('userData', process.env.LIVESTAGE_USERDATA);

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  });
}

// พอร์ตว่างไหม: (1) ต่อเข้าไปดูว่ามีโปรแกรมอื่นเปิดอยู่ไหม (2) ลองเปิดรับที่ 127.0.0.1 จริงสั้น ๆ
// ข้อ 2 จำเป็น: Windows ที่มี WSL/Hyper-V/Docker จะสุ่ม "จองพอร์ต" ไว้ทุกครั้งที่เปิดเครื่อง — ไม่มีใครใช้อยู่ แต่เปิดไม่ได้ (EACCES)
// (เปิดรับเฉพาะ 127.0.0.1 ไม่มีหน้าเตือน Firewall)
function portInUse(port) {
  return new Promise((resolve) => {
    const sock = net.connect({ host: '127.0.0.1', port });
    sock.setTimeout(800);
    sock.once('connect', () => {
      sock.destroy();
      resolve(true);
    });
    sock.once('timeout', () => {
      sock.destroy();
      resolve(false);
    });
    sock.once('error', () => resolve(false));
  });
}
function canBind(port) {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.once('error', () => resolve(false));
    s.listen({ port, host: '127.0.0.1', exclusive: true }, () => s.close(() => resolve(true)));
  });
}
async function portFree(port) {
  if (await portInUse(port)) return false;
  return canBind(port);
}
// พอร์ตที่ลอง: พอร์ตเดิม → 3030–3049 → ชุดสำรองหลายช่วง (Windows จองทีละ 100 พอร์ต ช่วงห่าง ๆ จึงมีโอกาสว่างสูง)
// 20030/40030 อยู่นอกช่วงที่ Windows สุ่มจองแทบทุกเครื่อง
const range = (a, n) => Array.from({ length: n }, (_, i) => a + i);
const PORT_LIST = [...range(3030, 20), ...range(4030, 10), ...range(6030, 10), ...range(8030, 10), ...range(20030, 10), ...range(40030, 10)];
async function choosePort() {
  if (process.env.LIVESTAGE_PORT) return (await portFree(PORT)) ? { port: PORT, from: null } : null;
  const file = path.join(app.getPath('userData'), 'port.json');
  let saved = 3030;
  try {
    saved = Number(JSON.parse(fs.readFileSync(file, 'utf8')).port) || 3030;
  } catch {}
  const list = [saved, ...PORT_LIST].filter((p, i, a) => a.indexOf(p) === i);
  for (const p of list) {
    if (!(await portFree(p))) continue;
    if (p !== saved) {
      try {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, JSON.stringify({ port: p }));
      } catch {}
    }
    return { port: p, from: p !== saved ? saved : null };
  }
  return null;
}
async function waitForServer(ms = 20000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      const r = await fetch(`${ORIGIN}/api/account`);
      if (r.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

// เปิดลิงก์ภายนอกด้วยเบราว์เซอร์ของเครื่อง (เฉพาะ http/https)
const isExternal = (url) => /^https?:\/\//i.test(url) && !url.startsWith(ORIGIN + '/');
function openExternal(url) {
  try { if (/(^|\.)tubhool\.com$/i.test(new URL(url).hostname)) return; } catch { return; }
  if (/^https?:\/\//i.test(String(url))) shell.openExternal(String(url));
}

// เข้ารหัสไฟล์ในเครื่อง (ธีมที่โหลดจากเว็บ) ด้วยระบบของเครื่องเดียวกับโทเคน
function installSecretBox() {
  const enc = () => safeStorage.isEncryptionAvailable();
  global.__liveStageSecretBox = {
    seal: (text) => (enc() ? safeStorage.encryptString(text) : Buffer.from(text, 'utf8')),
    open: (buf) => (enc() ? safeStorage.decryptString(buf) : buf.toString('utf8')),
  };
}

function installTokenStore() {
  const file = path.join(app.getPath('userData'), 'account.bin');
  const enc = () => safeStorage.isEncryptionAvailable();
  global.__liveStageTokenStore = {
    get() {
      try {
        const buf = fs.readFileSync(file);
        return enc() ? safeStorage.decryptString(buf) : buf.toString('utf8');
      } catch {
        return '';
      }
    },
    set(token) {
      try {
        if (!token) return fs.rmSync(file, { force: true });
        fs.writeFileSync(file, enc() ? safeStorage.encryptString(token) : Buffer.from(token, 'utf8'));
      } catch {}
    },
  };
}

function buildMenu() {
  const mac = process.platform === 'darwin';
  const template = [
    ...(mac ? [{ role: 'appMenu' }] : []),
    { label: 'แก้ไข', submenu: [{ role: 'undo', label: 'เลิกทำ' }, { role: 'redo', label: 'ทำซ้ำ' }, { type: 'separator' }, { role: 'cut', label: 'ตัด' }, { role: 'copy', label: 'คัดลอก' }, { role: 'paste', label: 'วาง' }, { role: 'selectAll', label: 'เลือกทั้งหมด' }] },
    { label: 'มุมมอง', submenu: [{ role: 'reload', label: 'โหลดใหม่' }, { role: 'resetZoom', label: 'ขนาดปกติ' }, { role: 'zoomIn', label: 'ขยาย' }, { role: 'zoomOut', label: 'ย่อ' }, { type: 'separator' }, { role: 'togglefullscreen', label: 'เต็มจอ' }] },
    { label: 'ช่วยเหลือ', submenu: [{ label: 'บันทึกไฟล์แจ้งปัญหา…', click: () => win?.webContents.downloadURL(`${ORIGIN}/api/support-bundle`) }, { label: 'เปิดโฟลเดอร์ข้อมูล', click: () => shell.openPath(path.join(app.getPath('userData'), 'data')) }, { role: 'toggleDevTools', label: 'เครื่องมือนักพัฒนา' }] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0b0b0c',
    title: 'TikTok LiveStage — Local',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    autoHideMenuBar: process.platform !== 'darwin',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      backgroundThrottling: false,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  // ลิงก์ที่เปิดหน้าต่างใหม่ / ออกนอกโปรแกรม → เบราว์เซอร์ของเครื่อง
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternal(url) || url.startsWith(ORIGIN + '/stage.html')) openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(ORIGIN + '/')) {
      e.preventDefault();
      openExternal(url);
    }
  });
  if(process.env.LIVESTAGE_OPEN_TIKTOK_LOGIN==='1')win.webContents.once('did-finish-load',()=>global.__liveStageTikTokAccount.open().catch(()=>{}));
  win.loadURL(`${ORIGIN}/app.html`);
  // ปิดหน้าต่างระหว่างไลฟ์ = หน้าเวทีใน LIVE Studio ดับ → ถามก่อน
  let closing = false;
  win.on('close', (e) => {
    if (closing) return;
    e.preventDefault();
    fetch(`${ORIGIN}/api/live-status`)
      .then((r) => r.json())
      .catch(() => ({}))
      .then(async (st) => {
        if (st.status === 'connected') {
          const { response } = await dialog.showMessageBox(win, {
            type: 'warning',
            buttons: ['ยังไม่ปิด', 'ปิดโปรแกรม'],
            defaultId: 0,
            cancelId: 0,
            title: 'กำลังไลฟ์อยู่',
            message: 'กำลังไลฟ์อยู่ — ปิดโปรแกรมตอนนี้หน้าเวทีใน LIVE Studio จะดับทันที',
            detail: 'ถ้าจะซ่อนหน้าต่าง ให้กดย่อ (—) แทน',
          });
          if (response !== 1) return;
        }
        closing = true;
        win.close();
      });
  });
  win.on('closed', () => {
    win = null;
    // ปิดหน้าต่างหลัก = ปิดโปรแกรม (ปิดหน้าต่างพรีวิวด้วย)
    if (previewWin && !previewWin.isDestroyed()) previewWin.destroy();
    if (controlWin && !controlWin.isDestroyed()) controlWin.destroy();
  });
}

ipcMain.on('open-external', (_e, url) => openExternal(url));
// ---------------------------------------------------------------- หน้าต่างพรีวิวแยก (แบบ B)
// แนวตั้ง ปิดเสียง ปักหมุดบนสุดได้ จำตำแหน่ง/ขนาด/การปักหมุดไว้ที่ userData/preview.json
let previewWin = null;
const previewFile = () => path.join(app.getPath('userData'), 'preview.json');
function previewPrefs() {
  try {
    return { pin: true, ...JSON.parse(fs.readFileSync(previewFile(), 'utf8')) };
  } catch {
    return { pin: true };
  }
}
function savePreviewPrefs(patch) {
  try {
    fs.writeFileSync(previewFile(), JSON.stringify({ ...previewPrefs(), ...patch }));
  } catch {}
}
function openPreview() {
  if (previewWin && !previewWin.isDestroyed()) {
    previewWin.show();
    previewWin.focus();
    return;
  }
  const p = previewPrefs();
  const b = { ...(p.bounds || {}) };
  // จอที่เคยวางไว้ถูกถอดออก → กลับมาวางตำแหน่งปกติ
  const { screen } = require('electron');
  const onScreen = screen.getAllDisplays().some((d) => b.x >= d.workArea.x - 50 && b.y >= d.workArea.y - 50 && b.x < d.workArea.x + d.workArea.width - 80 && b.y < d.workArea.y + d.workArea.height - 80);
  if (!onScreen) delete b.x, delete b.y;
  previewWin = new BrowserWindow({
    width: b.width || 380,
    height: b.height || 780,
    x: Number.isFinite(b.x) ? b.x : undefined,
    y: Number.isFinite(b.y) ? b.y : undefined,
    minWidth: 260,
    minHeight: 480,
    title: 'พรีวิวหน้าเวที — Live Stage',
    backgroundColor: '#0b0b0c',
    autoHideMenuBar: true,
    alwaysOnTop: !!p.pin,
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), backgroundThrottling: false, contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  if (p.pin) previewWin.setAlwaysOnTop(true, 'floating');
  previewWin.setMenu(null);
  previewWin.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  previewWin.loadURL(`${ORIGIN}/preview.html`);
  let t = null;
  const remember = () => {
    clearTimeout(t);
    t = setTimeout(() => previewWin && !previewWin.isDestroyed() && savePreviewPrefs({ bounds: previewWin.getBounds() }), 400);
  };
  previewWin.on('move', remember);
  previewWin.on('resize', remember);
  previewWin.on('closed', () => (previewWin = null));
  // ใช้ทดสอบ: บันทึกสถานะหน้าต่างพรีวิวไว้ดู
  if (process.env.LIVESTAGE_TEST_PREVIEW) {
    previewWin.webContents.once('did-finish-load', () =>
      fs.writeFileSync(path.join(app.getPath('userData'), 'preview-test.json'), JSON.stringify({ title: previewWin.getTitle(), bounds: previewWin.getBounds(), onTop: previewWin.isAlwaysOnTop(), url: previewWin.webContents.getURL() })),
    );
  }
}
ipcMain.on('preview-open', () => openPreview());
ipcMain.on('preview-pin', (_e, on) => {
  savePreviewPrefs({ pin: !!on });
  if (previewWin && !previewWin.isDestroyed()) previewWin.setAlwaysOnTop(!!on, 'floating');
});
ipcMain.on('preview-get-pin', (e) => {
  e.returnValue = !!previewPrefs().pin;
});

// ---------------------------------------------------------------- ห้องควบคุมไลฟ์ (หน้าต่างลอย public/control.html)
// เด้งขึ้นเองเมื่อเชื่อมต่อไลฟ์สำเร็จ • ปิดเองเมื่อไลฟ์จบ/ตัดการเชื่อมต่อ (หลุดแล้วกำลังต่อกลับ = รอ 10 วิ ไม่ปิดทันที)
// จำตำแหน่ง/ขนาด/การปักหมุดไว้ที่ userData/control.json
let controlWin = null;
const controlFile = () => path.join(app.getPath('userData'), 'control.json');
function controlPrefs() {
  try {
    return { pin: true, ...JSON.parse(fs.readFileSync(controlFile(), 'utf8')) };
  } catch {
    return { pin: true };
  }
}
function saveControlPrefs(patch) {
  try {
    fs.writeFileSync(controlFile(), JSON.stringify({ ...controlPrefs(), ...patch }));
  } catch {}
}
// ห้องควบคุมไลฟ์เป็นของผู้สนับสนุน (server.js controlOk) — สมาชิกฟรีไม่เด้ง ไม่เปิด (ปุ่มในโปรแกรมโชว์หน้าต่างชวนสมัครแทน)
const controlAllowed = () => global.__liveStageControlOk?.() !== false;
function openControl(focus = true) {
  if (!controlAllowed()) return;
  if (controlWin && !controlWin.isDestroyed()) {
    controlWin.show();
    if (focus) controlWin.focus();
    return;
  }
  const p = controlPrefs();
  const b = { ...(p.bounds || {}) };
  const { screen } = require('electron');
  const onScreen = screen.getAllDisplays().some((d) => b.x >= d.workArea.x - 50 && b.y >= d.workArea.y - 50 && b.x < d.workArea.x + d.workArea.width - 80 && b.y < d.workArea.y + d.workArea.height - 80);
  if (!onScreen) delete b.x, delete b.y;
  controlWin = new BrowserWindow({
    width: b.width || 1040,
    height: b.height || 690,
    x: Number.isFinite(b.x) ? b.x : undefined,
    y: Number.isFinite(b.y) ? b.y : undefined,
    minWidth: 860,
    minHeight: 560,
    title: 'ห้องควบคุมไลฟ์ — Live Stage',
    backgroundColor: '#0b0b0c',
    autoHideMenuBar: true,
    alwaysOnTop: !!p.pin,
    show: false,
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), backgroundThrottling: false, contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  if (p.pin) controlWin.setAlwaysOnTop(true, 'floating');
  controlWin.setMenu(null);
  controlWin.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  controlWin.loadURL(`${ORIGIN}/control.html`);
  // เด้งขึ้นเองตอนเริ่มไลฟ์: โชว์โดยไม่แย่งโฟกัสจากหน้าต่างที่ใช้อยู่ (เช่น LIVE Studio)
  controlWin.once('ready-to-show', () => (focus ? controlWin.show() : controlWin.showInactive()));
  let t = null;
  const remember = () => {
    clearTimeout(t);
    t = setTimeout(() => controlWin && !controlWin.isDestroyed() && saveControlPrefs({ bounds: controlWin.getBounds() }), 400);
  };
  controlWin.on('move', remember);
  controlWin.on('resize', remember);
  controlWin.on('closed', () => (controlWin = null));
}
let wasLive = false;
let controlCloseT = null;
// server.js setStatus() เรียกทุกครั้งที่สถานะการเชื่อมต่อไลฟ์เปลี่ยน
global.__liveStageOnStatus = (status) => {
  if (!booted) return;
  if(global.__liveStageFairWaiting?.()&&['connecting','offline'].includes(status)){clearTimeout(controlCloseT);openControl(false);return;}
  if (status === 'connected') {
    clearTimeout(controlCloseT);
    if (!wasLive) openControl(false);
    wasLive = true;
    return;
  }
  if (!wasLive) return; // ยังไม่เคยไลฟ์ (เช่น เปิดห้องควบคุมเองตอนเตรียมไลฟ์) → ไม่ปิดให้
  clearTimeout(controlCloseT);
  const close = () => {
    wasLive = false;
    if (controlWin && !controlWin.isDestroyed()) controlWin.close();
  };
  if (status === 'connecting') controlCloseT = setTimeout(close, 10000); // หลุดแล้วกำลังต่อกลับเอง
  else close(); // ไลฟ์จบ / กดตัดการเชื่อมต่อ / เชื่อมต่อไม่ได้
};
ipcMain.on('control-open', () => openControl(true));
ipcMain.on('control-pin', (_e, on) => {
  saveControlPrefs({ pin: !!on });
  if (controlWin && !controlWin.isDestroyed()) controlWin.setAlwaysOnTop(!!on, 'floating');
});
ipcMain.on('control-get-pin', (e) => {
  e.returnValue = !!controlPrefs().pin;
});

ipcMain.on('app-info', (e) => {
  e.returnValue = { version: app.getVersion(), platform: process.platform };
});

let booted = false;
const updates = () => ({startup: async () => {}, isInstalling: () => false, background: () => {}});

app.whenReady().then(async () => {
  buildMenu();
  // เช็คเวอร์ชันใหม่ก่อนเปิด (เหมือนแอปมือถือ) — มี → จออัปเดต แล้วติดตั้งเงียบ ๆ เปิดใหม่เอง
  await updates().startup();
  if (updates().isInstalling()) return;
  const picked = await choosePort();
  if (!picked) {
    dialog.showErrorBox('Live Stage เปิดไม่ได้', 'หาพอร์ตว่างไม่ได้ (พอร์ตที่ลองถูกใช้หรือถูก Windows จองไว้หมด) — ลองรีสตาร์ทเครื่องแล้วเปิดใหม่');
    app.quit();
    return;
  }
  PORT = picked.port;
  ORIGIN = `http://127.0.0.1:${PORT}`;
  process.env.LIVESTAGE_DESKTOP = '1';
  process.env.PORT = String(PORT);
  process.env.DATA_DIR = path.join(app.getPath('userData'), 'data');
  installTokenStore();
  installSecretBox();
  // เปิดพอร์ตไม่ได้จริง (ถูกแย่งระหว่างเช็คกับเปิด) → ล้างพอร์ตที่จำไว้ ครั้งหน้าหาใหม่ • แจ้งเป็นภาษาคน แทนหน้าต่าง error ของระบบ
  global.__liveStageListenError = (e) => {
    try {
      fs.rmSync(path.join(app.getPath('userData'), 'port.json'), { force: true });
    } catch {}
    dialog.showErrorBox('Live Stage เปิดไม่ได้', `เปิดหน้าเวทีที่พอร์ต ${PORT} ไม่ได้ (${e?.code || e?.message || e})
ปิดแล้วเปิดโปรแกรมใหม่อีกครั้ง โปรแกรมจะหาพอร์ตอื่นให้เอง`);
    app.exit(1);
  };
  global.__liveStageTikTokAccount = require('./tiktok-account.cjs').install({getWindow:()=>win,getOrigin:()=>ORIGIN});
  require('./live-manager-output.cjs').install({getWindow:()=>win,getOrigin:()=>ORIGIN});
  require('../server.js');

  if (!(await waitForServer())) {
    dialog.showErrorBox('Live Stage เปิดไม่ได้', 'ระบบหน้าเวทีไม่ตอบสนอง ลองปิดแล้วเปิดโปรแกรมใหม่');
    app.quit();
    return;
  }
  createWindow();
  booted = true;
  if (process.env.LIVESTAGE_TEST_PREVIEW) setTimeout(openPreview, 1500);
  // พอร์ตเดิมไม่ว่าง → ลิงก์หน้าเวทีเปลี่ยน ต้องไปแก้ใน LIVE Studio
  if (picked.from) {
    win.webContents.once('did-finish-load', () =>
      dialog.showMessageBox(win, {
        type: 'warning',
        title: 'ลิงก์หน้าเวทีเปลี่ยน',
        message: `พอร์ต ${picked.from} ใช้ไม่ได้ (โปรแกรมอื่นใช้อยู่ หรือ Windows จองไว้) เลยเปิดที่พอร์ต ${PORT} แทน`,
        detail:
          `ลิงก์หน้าเวทีใหม่: ${ORIGIN}/stage.html\n\n` +
          'ถ้าเคยใส่ลิงก์เก่าในแหล่ง Link ของ LIVE Studio ให้แก้เป็นลิงก์นี้ (ครั้งหน้าจะใช้พอร์ตนี้ต่อ ลิงก์ไม่เปลี่ยนอีก)\n' +
          'ถ้าเปิด Live Stage แบบเก่า (start.bat) ค้างไว้ ปิดตัวนั้นได้เลย',
        buttons: ['เข้าใจแล้ว'],
      }),
    );
  }
  updates().background({
    getWindow: () => win,
    isLive: () => fetch(`${ORIGIN}/api/live-status`).then((r) => r.json()).then((s) => s.status === 'connected').catch(() => false),
  });
  app.on('activate', () => {
    if (!BrowserWindow.getAllWindows().length) createWindow();
  });
});

// ปิดหน้าต่าง = ปิดโปรแกรม
app.on('window-all-closed', () => {
  if (booted) app.quit(); // ปิดจออัปเดต (ข้ามไปก่อน) ตอนเปิดโปรแกรม ≠ ปิดโปรแกรม
});
// ก่อนปิด: บอกหน้าเวทีใน LIVE Studio ให้ขึ้นจอ "Live Stage ปิดอยู่" และหยุดเสียง
// (หน้าเวทีอยู่ในเบราว์เซอร์ของ LIVE Studio — ถ้าไม่บอก มันจะเล่นฉากเดิมค้างไว้แม้ปิดโปรแกรมแล้ว)
let stagesNotified = false;
app.on('before-quit', (e) => {
  if (stagesNotified || !global.__liveStageShutdown) return;
  stagesNotified = true;
  e.preventDefault();
  try {
    global.__liveStageShutdown();
  } catch {}
  setTimeout(() => app.quit(), 400);
});
