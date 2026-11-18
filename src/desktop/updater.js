/* อัปเดตอัตโนมัติจาก tubhool.com/live-stage/updates/ (เหมือนแอปมือถือ)
 *  Windows:
 *   - เปิดโปรแกรม → เช็คเวอร์ชันใหม่ก่อน (รอไม่เกิน 4 วิ) ถ้ามี → ขึ้นจอ "กำลังอัปเดต" พร้อมแถบความคืบหน้า
 *     โหลดเสร็จ → ติดตั้งแบบเงียบ (ไม่มีหน้า Next) แล้วเปิดโปรแกรมใหม่เอง • กด "ข้ามไปก่อน" ได้ (จะติดตั้งตอนปิดโปรแกรม)
 *   - ระหว่างใช้งาน: เช็คทุก 6 ชม. โหลดเงียบ ๆ แล้วถาม (กำลังไลฟ์ = ติดตั้งตอนปิดโปรแกรม)
 *  Mac: ยังไม่ได้เซ็นชื่อกับ Apple จึงติดตั้งเองไม่ได้ → แจ้งว่ามีเวอร์ชันใหม่ แล้วพาไปหน้าดาวน์โหลด
 *  บันทึกการทำงานอยู่ที่ userData/logs/updater.log (รวมอยู่ในไฟล์แจ้งปัญหา)
 */
'use strict';
const { app, BrowserWindow, dialog, shell } = require('electron');
const fs = require('fs');
const path = require('path');

const SIX_HOURS = 6 * 3600_000;
const CHECK_WAIT_MS = 4000;
const newer = (a, b) => {
  const pa = String(a).split(/[.-]/).map((x) => parseInt(x, 10) || 0);
  const pb = String(b).split(/[.-]/).map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  return false;
};

function createLog() {
  const file = path.join(app.getPath('userData'), 'logs', 'updater.log');
  global.__liveStageUpdaterLogPath = file;
  const write = (level, args) => {
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      // เก็บแค่ ~200 KB ล่าสุด
      if (fs.existsSync(file) && fs.statSync(file).size > 200_000) fs.writeFileSync(file, fs.readFileSync(file, 'utf8').slice(-100_000));
      fs.appendFileSync(file, `${new Date().toISOString()} [${level}] ${args.map((a) => (a instanceof Error ? a.message : typeof a === 'string' ? a : JSON.stringify(a))).join(' ')}\n`);
    } catch {}
  };
  return { info: (...a) => write('info', a), warn: (...a) => write('warn', a), error: (...a) => write('error', a), debug: () => {} };
}

module.exports = function createUpdater({ base }) {
  const feed = `${base.replace(/\/+$/, '')}/live-stage/updates/`;
  const enabled = app.isPackaged || !!process.env.LIVESTAGE_TEST_UPDATES;
  const win32 = process.platform === 'win32';
  const log = createLog();
  let au = null;
  let installing = false;
  let handled = ''; // เวอร์ชันที่ถามไปแล้ว
  let onDownloaded = null; // ตัวจัดการตอนนี้ (จอเปิดโปรแกรม หรือ ระหว่างใช้งาน)

  function updater() {
    if (au) return au;
    au = require('electron-updater').autoUpdater;
    au.logger = log;
    au.setFeedURL({ provider: 'generic', url: feed });
    au.autoDownload = true;
    au.autoInstallOnAppQuit = true; // ไม่ได้กดติดตั้ง → ติดตั้งเงียบ ๆ ตอนปิดโปรแกรม
    au.disableWebInstaller = true;
    au.on('update-downloaded', (info) => onDownloaded?.(info));
    au.on('error', (e) => log.warn('update error', e));
    return au;
  }
  // ติดตั้งแบบเงียบ (ไม่มีหน้า Next) แล้วเปิดโปรแกรมใหม่เอง
  function installNow(splash) {
    if (installing) return;
    installing = true;
    log.info('install now (silent) and relaunch');
    // ใช้ทดสอบเท่านั้น: ไม่ติดตั้งจริง (กันทับโปรแกรมที่ติดตั้งในเครื่อง) + เก็บภาพจออัปเดตไว้ดู
    if (process.env.LIVESTAGE_TEST_NO_INSTALL) {
      splash?.webContents.capturePage().then((img) => fs.writeFileSync(path.join(app.getPath('userData'), 'splash.png'), img.toPNG())).catch(() => {});
      return;
    }
    setImmediate(() => updater().quitAndInstall(true, true));
  }

  // ---------------------------------------------------------------- ตอนเปิดโปรแกรม (ก่อนขึ้นหน้าต่างหลัก)
  async function startup() {
    if (!enabled || !win32) return;
    let result = null;
    try {
      result = await Promise.race([updater().checkForUpdates(), new Promise((r) => setTimeout(() => r(null), CHECK_WAIT_MS))]);
    } catch (e) {
      log.warn('startup check failed', e);
    }
    const info = result?.updateInfo;
    if (!info || !newer(info.version, app.getVersion())) return;
    log.info('startup: update available', info.version);

    return new Promise((resolve) => {
      const splash = new BrowserWindow({
        width: 460, height: 300, frame: false, resizable: false, maximizable: false, fullscreenable: false,
        backgroundColor: '#0b0b0c', title: 'กำลังอัปเดต Live Stage', show: false, center: true,
        icon: path.join(__dirname, '..', 'build', 'icon.png'),
        webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
      });
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        au.removeListener('download-progress', progress);
        au.removeListener('error', failed);
        onDownloaded = null;
        resolve();
      };
      const send = (js) => splash.isDestroyed() || splash.webContents.executeJavaScript(js).catch(() => {});
      const progress = (p) => send(`window.setProgress(${Number(p.percent) || 0}, ${Number(p.transferred) || 0}, ${Number(p.total) || 0}, ${Number(p.bytesPerSecond) || 0})`);
      const failed = () => {
        send('window.setFailed()');
        setTimeout(() => {
          if (!splash.isDestroyed()) splash.destroy();
          finish();
        }, 2500);
      };
      au.on('download-progress', progress);
      au.on('error', failed);
      onDownloaded = (i) => {
        handled = i.version;
        send('window.setInstalling()');
        setTimeout(() => installNow(splash), 600);
      };
      // กด "ข้ามไปก่อน" (ปิดจอ) → ใช้เวอร์ชันเดิมไปก่อน โหลดต่อเบื้องหลังแล้วติดตั้งตอนปิดโปรแกรม
      splash.on('closed', () => {
        if (!installing) log.info('startup: user skipped update');
        finish();
      });
      splash.loadFile(path.join(__dirname, 'update.html'), { query: { v: info.version, cur: app.getVersion() } });
      splash.once('ready-to-show', () => splash.show());
    });
  }

  // ---------------------------------------------------------------- ระหว่างใช้งาน
  function background({ getWindow, isLive }) {
    if (!enabled) return;
    if (win32) {
      onDownloaded = async (info) => {
        if (handled === info.version) return;
        handled = info.version;
        const live = await isLive();
        const win = getWindow();
        const opts = {
          type: 'info',
          title: 'มีเวอร์ชันใหม่',
          message: `Live Stage เวอร์ชัน ${info.version} พร้อมแล้ว`,
          detail: live
            ? 'กำลังไลฟ์อยู่ — จะอัปเดตให้เองตอนปิดโปรแกรม ไม่ต้องทำอะไร'
            : 'กด “อัปเดตเลย” โปรแกรมจะปิดแล้วเปิดใหม่เป็นเวอร์ชันใหม่ภายในไม่กี่วินาที (ไม่ต้องกดติดตั้ง)',
          buttons: live ? ['ตกลง'] : ['อัปเดตเลย', 'ไว้ทีหลัง'],
          defaultId: 0,
        };
        const { response } = win ? await dialog.showMessageBox(win, opts) : await dialog.showMessageBox(opts);
        if (!live && response === 0) installNow();
      };
      const check = () => updater().checkForUpdates().catch((e) => log.warn('check failed', e));
      setTimeout(check, 60_000);
      setInterval(check, SIX_HOURS);
      return;
    }
    // Mac
    let dismissed = '';
    const check = async () => {
      try {
        const text = await (await fetch(feed + 'latest-mac.yml', { cache: 'no-store' })).text();
        const v = /^version:\s*['"]?([^'"\s]+)/m.exec(text)?.[1];
        if (!v || !newer(v, app.getVersion()) || v === dismissed || (await isLive())) return;
        dismissed = v;
        const win = getWindow();
        const opts = {
          type: 'info',
          title: 'มีเวอร์ชันใหม่',
          message: `Live Stage เวอร์ชัน ${v} ออกแล้ว (เครื่องนี้ ${app.getVersion()})`,
          detail: 'ดาวน์โหลดตัวใหม่จากเว็บ แล้วลากไปแทนที่ใน Applications — การตั้งค่าและบัญชีอยู่ครบ',
          buttons: ['ไปหน้าดาวน์โหลด', 'ไว้ทีหลัง'],
          defaultId: 0,
        };
        const { response } = win ? await dialog.showMessageBox(win, opts) : await dialog.showMessageBox(opts);
        if (response === 0) shell.openExternal(`${base.replace(/\/+$/, '')}/live-stage/`);
      } catch {}
    };
    setTimeout(check, 5000);
    setInterval(check, SIX_HOURS);
  }

  return { startup, background, isInstalling: () => installing };
};
module.exports.newer = newer;
