/* Live Stage — บัญชี TubHool (ใช้เมื่อรันเป็นโปรแกรมติดตั้ง: LIVESTAGE_DESKTOP=1)
 *
 * เข้าสู่ระบบแบบเดียวกับ "Sign in with Google" ของโปรแกรมบนคอม (OAuth loopback + PKCE):
 *   1. เปิดเบราว์เซอร์ไปที่ tubhool.com/liveapp/authorize?port=…&state=…&challenge=…
 *   2. สมาชิกกด "อนุญาต" → เว็บส่งกลับมาที่ http://127.0.0.1:<port>/auth/callback?code=…&state=…
 *   3. เอา code + verifier ไปแลกเป็นโทเคน (POST /api/liveapp/token) แล้วเช็คแพ็กเกจ (GET /api/liveapp/me)
 *
 * แพ็กเกจ: สมาชิกฟรี = 1 ธีมที่เลือกเอง (เปลี่ยนได้วันละครั้ง) + ชื่อ TubHool เล็ก ๆ ที่มุมจอ
 *          ผู้สนับสนุน TubHool = ทุกธีม ไม่มีชื่อที่มุมจอ
 * เน็ตหลุด: ใช้ต่อได้ OFFLINE_DAYS วันนับจากเช็คสำเร็จครั้งล่าสุด • หมดสิทธิ์กลางไลฟ์: ไม่เปลี่ยนธีมจนกว่าจะจบไลฟ์
 * โหมดนักพัฒนา (รันด้วย start.bat / node server.js ปกติ): ไม่ต้องล็อกอิน ใช้ได้ทุกธีม
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const OFFLINE_DAYS = 3;
const REFRESH_MS = 3600_000; // ตรวจบัญชี + สวิตช์เมนูจากหลังบ้าน TubHool ทุก 1 ชั่วโมง

const b64url = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

module.exports = function createLicense(ctx) {
  // ctx: { dataDir, port, log(type, text), onChange(state), isLive() }
  const desktop = process.env.LIVESTAGE_DESKTOP === '1';
  const BASE = (process.env.TUBHOOL_URL || 'https://tubhool.com').replace(/\/+$/, '');
  const CACHE_FILE = path.join(ctx.dataDir, 'account-cache.json');
  const TOKEN_FILE = path.join(ctx.dataDir, 'account-token.json');

  // ที่เก็บโทเคน: โปรแกรมติดตั้ง (Electron) ส่งตัวเก็บแบบเข้ารหัสของเครื่องมาให้ทาง global (Windows DPAPI / macOS Keychain)
  const store = global.__liveStageTokenStore || {
    get() {
      try {
        return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8')).token || '';
      } catch {
        return '';
      }
    },
    set(token) {
      try {
        if (token) fs.writeFileSync(TOKEN_FILE, JSON.stringify({ token }));
        else fs.rmSync(TOKEN_FILE, { force: true });
      } catch {}
    },
  };

  let cache = { user: null, verifiedAt: 0 };
  try {
    cache = { ...cache, ...JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) };
  } catch {}
  let pending = null; // { state, verifier, at }
  let lastError = '';
  let busy = false;

  const saveCache = () => {
    try {
      fs.mkdirSync(ctx.dataDir, { recursive: true });
      fs.writeFileSync(CACHE_FILE, JSON.stringify(cache));
    } catch {}
  };

  // ---------------------------------------------------------------- สถานะ
  function signedIn() {
    if (!desktop) return true;
    if (!store.get() || !cache.user) return false;
    return Date.now() - cache.verifiedAt < OFFLINE_DAYS * 86400_000;
  }
  // null = ทุกธีม
  function allowedThemes() {
    if (!desktop) return null;
    if (!signedIn()) return [];
    if (cache.user.supporter) {
      // หมดอายุผู้สนับสนุนระหว่างที่ยังไม่ได้เช็คกับเว็บ → ถือว่าหมด
      const until = Date.parse(cache.user.supporter_until || '');
      if (!until || until > Date.now()) return null;
    }
    // ธีมฟรี 1 ธีม (ยกเว้นธีมที่กำลังเปิดให้เม้นปลดล็อก) + ธีมที่เม้นใต้โพสต์เพจปลดล็อกไว้ (ชั่วคราว)
    const free = cache.user.free_theme;
    const cu = cache.user.comment_unlocks || {};
    const out = free && !(cu[free]?.running && !grantActive(free)) ? [free] : [];
    for (const t of Object.keys(cu)) if (grantActive(t) && !out.includes(t)) out.push(t);
    return out;
  }
  // เม้นปลดล็อก: ใช้ได้ถึงเวลาที่เว็บบอก (นับด้วยนาฬิกาเว็บ) — ตัวจริงที่กันคือเว็บไม่ส่งโค้ดธีมให้
  function grantActive(t) {
    const s = cache.user?.comment_unlocks?.[t];
    return !!s && s.state === 'granted' && Date.parse(s.until) > Date.now() + skew();
  }
  // เมนูที่หลังบ้าน TubHool เปิด/ปิดได้ (ไม่มีข้อมูล = เปิด)
  // OPT_IN = ต้องเปิดจากหลังบ้านก่อนถึงจะเห็น (ไม่มีข้อมูล/เว็บรุ่นเก่า = ปิด) — ธีมเกม 7 ธีมที่ยังไม่ปล่อย
  const FEATURES = ['custom', 'ai', 'widgets', 'youtube', 'shop', 'cloud', 'games'];
  const OPT_IN = new Set(['games']);
  function features() {
    if (!desktop) return Object.fromEntries(FEATURES.map((k) => [k, true])); // รันจากซอร์ส (ทดสอบ) = เห็นทุกอย่าง
    const f = cache.user?.features || {};
    return Object.fromEntries(FEATURES.map((k) => [k, OPT_IN.has(k) ? f[k] === true : f[k] !== false]));
  }
  // ธีมที่หลังบ้านตั้งล็อก = เฉพาะผู้สนับสนุนตลอดไป • ก่อนครบเวลา ผู้สนับสนุนต้องซื้อใช้ก่อน
  // นับเวลาด้วยนาฬิกาของเว็บ (เผื่อนาฬิกาเครื่องคลาด) — ตัวจริงที่กันคือเว็บไม่ส่งโค้ดธีมให้
  const skew = () => {
    const st = Date.parse(cache.user?.server_time || '');
    return st && cache.verifiedAt ? st - cache.verifiedAt : 0;
  };
  function lockOf(theme) {
    const l = desktop && cache.user?.theme_locks?.[theme];
    if (!l) return null;
    const left = Date.parse(l.until) - (Date.now() + skew());
    const state = allowedThemes() !== null ? 'sup' : left <= 0 ? 'open' : l.purchased ? 'owned' : 'early';
    return { state, until: l.until, left: Math.max(0, left), price: l.price, buy_url: l.buy_url };
  }
  const blockedByLock = (theme) => ['sup', 'early'].includes(lockOf(theme)?.state);
  const isAllowed = (theme) => {
    if (theme === 'custom' && !features().custom) return false;
    if (blockedByLock(theme)) return false;
    const need = ctx.themeFeature?.(theme); // ธีมที่ผูกกับสวิตช์หลังบ้าน (เช่น ธีมเกม → games)
    if (need && !features()[need]) return false;
    const a = allowedThemes();
    return a === null || a.includes(theme);
  };
  function state() {
    const a = allowedThemes();
    return {
      mode: desktop ? 'desktop' : 'dev',
      signedIn: signedIn(),
      user: desktop ? cache.user : null,
      plan: !desktop ? 'owner' : a === null ? 'supporter' : 'member',
      themes: a, // null = ทุกธีม
      watermark: desktop && a !== null,
      offlineSince: desktop && cache.verifiedAt && Date.now() - cache.verifiedAt > REFRESH_MS + 600_000 ? cache.verifiedAt : 0,
      offlineDays: OFFLINE_DAYS,
      error: lastError,
      busy,
      site: BASE,
      features: features(),
      promos: (desktop && cache.user?.promos) || {},
      locks: Object.fromEntries(Object.keys((desktop && cache.user?.theme_locks) || {}).map((t) => [t, lockOf(t)])),
      comment: Object.fromEntries(Object.entries((desktop && a !== null && cache.user?.comment_unlocks) || {}).map(([t, c]) => [t, { ...c, active: grantActive(t) }])),
      skew: skew(),
    };
  }
  let expiryTimer = null;
  const changed = () => {
    forgetThemes();
    ctx.onChange?.(state());
    // สิทธิ์เม้นปลดล็อกหมดเวลา → แจ้งให้เปลี่ยนธีม (ถ้าไลฟ์อยู่ server.js รอจนจบไลฟ์)
    clearTimeout(expiryTimer);
    const ends = Object.keys(cache.user?.comment_unlocks || {}).filter(grantActive).map((t) => Date.parse(cache.user.comment_unlocks[t].until) - (Date.now() + skew()));
    if (ends.length) expiryTimer = setTimeout(changed, Math.min(...ends) + 1500);
  };

  // ---------------------------------------------------------------- คุยกับเว็บ
  async function api(method, urlPath, body) {
    const token = store.get();
    const res = await fetch(BASE + urlPath, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), 'User-Agent': 'LiveStage-Desktop' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15000),
    });
    let data = {};
    try {
      data = await res.json();
    } catch {}
    return { status: res.status, data };
  }
  function acceptUser(user) {
    cache = { user, verifiedAt: Date.now() };
    saveCache();
    lastError = '';
  }
  function signOutLocal(reason) {
    store.set('');
    cache = { user: null, verifiedAt: 0 };
    saveCache();
    lastError = reason || '';
  }

  async function refresh() {
    if (!desktop || !store.get()) return state();
    try {
      const { status, data } = await api('GET', '/api/liveapp/me');
      if (status === 200 && data.user) acceptUser(data.user);
      else if (status === 401) {
        signOutLocal('บัญชีนี้ถูกตัดการเชื่อมต่อจากเว็บ กรุณาเข้าสู่ระบบใหม่');
        ctx.log('system', '🔐 บัญชี TubHool ถูกตัดการเชื่อมต่อ — ต้องเข้าสู่ระบบใหม่');
      } else lastError = data.error || `เว็บ TubHool ตอบกลับผิดปกติ (${status})`;
    } catch {
      lastError = 'เชื่อมต่อเว็บ TubHool ไม่ได้ — ใช้ข้อมูลล่าสุดไปก่อน';
    }
    changed();
    return state();
  }

  function startLogin() {
    const verifier = b64url(crypto.randomBytes(48));
    const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
    const st = b64url(crypto.randomBytes(24));
    pending = { state: st, verifier, at: Date.now() };
    const q = new URLSearchParams({
      port: String(ctx.port), state: st, challenge,
      device: os.hostname().slice(0, 60), platform: process.platform === 'darwin' ? 'mac' : 'win',
    });
    lastError = '';
    return `${BASE}/liveapp/authorize?${q}`;
  }

  async function handleCallback(query) {
    if (!pending || query.state !== pending.state || Date.now() - pending.at > 15 * 60_000) {
      return { ok: false, error: 'ลิงก์เข้าสู่ระบบนี้หมดอายุ กรุณากดเข้าสู่ระบบในโปรแกรมใหม่' };
    }
    const { verifier } = pending;
    pending = null;
    if (query.error) {
      lastError = 'ยกเลิกการเข้าสู่ระบบแล้ว';
      changed();
      return { ok: false, error: 'คุณกดไม่อนุญาต — ถ้าจะใช้งานให้กดเข้าสู่ระบบในโปรแกรมอีกครั้ง' };
    }
    busy = true;
    changed();
    try {
      const { status, data } = await api('POST', '/api/liveapp/token', { code: String(query.code || ''), verifier });
      if (status !== 200 || !data.token) throw new Error(data.error || `เว็บตอบกลับผิดปกติ (${status})`);
      store.set(data.token);
      acceptUser(data.user);
      ctx.log('system', `🔐 เข้าสู่ระบบ TubHool แล้ว: ${data.user.name} (${data.user.supporter ? 'ผู้สนับสนุน' : 'สมาชิกฟรี'})`);
      return { ok: true, user: data.user };
    } catch (e) {
      lastError = e.name === 'TimeoutError' ? 'เว็บ TubHool ตอบช้าเกินไป ลองใหม่อีกครั้ง' : String(e.message || e);
      return { ok: false, error: lastError };
    } finally {
      busy = false;
      changed();
    }
  }

  async function logout() {
    try {
      if (store.get()) await api('POST', '/api/liveapp/logout');
    } catch {}
    signOutLocal('');
    ctx.log('system', '🔐 ออกจากระบบ TubHool แล้ว');
    changed();
  }

  async function setFreeTheme(theme) {
    if (!desktop) return { ok: true };
    try {
      const { status, data } = await api('POST', '/api/liveapp/free-theme', { theme });
      if (data.user) acceptUser(data.user);
      changed();
      if (status === 200) return { ok: true };
      if (status === 401) {
        signOutLocal('กรุณาเข้าสู่ระบบใหม่');
        changed();
      }
      return { ok: false, error: data.error || 'บันทึกธีมไม่สำเร็จ', nextChange: data.next_change };
    } catch {
      return { ok: false, error: 'เชื่อมต่อเว็บ TubHool ไม่ได้ — ต้องต่อเน็ตเพื่อเลือกธีม' };
    }
  }

  // ---------------------------------------------------------------- เม้นปลดล็อก (สมาชิกฟรีเม้นรหัสใต้โพสต์เพจ TubHool → ใช้ธีมฟรีชั่วคราว)
  async function commentCall(theme, action, now) {
    if (!desktop) return { ok: false, error: 'ใช้ได้เฉพาะโปรแกรมที่ติดตั้งแล้ว' };
    try {
      const q = action === 'check' && now ? '?now=1' : '';
      const { status, data } = await api('POST', `/api/liveapp/comment-unlock/${encodeURIComponent(theme)}/${action}${q}`);
      if (data.user) acceptUser(data.user);
      if (status === 401) signOutLocal('กรุณาเข้าสู่ระบบใหม่');
      changed();
      if (status !== 200) return { ok: false, error: data.error || `เว็บตอบกลับ ${status}`, code: data.code };
      return { ok: true, ...data, user: undefined };
    } catch {
      return { ok: false, error: 'เชื่อมต่อเว็บ TubHool ไม่ได้ ลองใหม่อีกครั้ง' };
    }
  }
  const commentCode = (theme) => commentCall(theme, 'code');
  const commentCheck = (theme, now) => commentCall(theme, 'check', now);

  // ---------------------------------------------------------------- โค้ดธีม (ธีมที่ไม่ได้มากับโปรแกรม โหลดจากเว็บตามสิทธิ์)
  // เก็บสำเนาเข้ารหัสไว้ในเครื่อง ใช้ตอนเน็ตหลุดได้ OFFLINE_DAYS วัน
  const THEME_CACHE = path.join(ctx.dataDir, 'theme-cache');
  const box = global.__liveStageSecretBox || { seal: (t) => Buffer.from(t, 'utf8'), open: (b) => b.toString('utf8') };
  const themeMem = new Map();
  function readThemeCache(id) {
    try {
      const st = fs.statSync(path.join(THEME_CACHE, id + '.bin'));
      if (Date.now() - st.mtimeMs > OFFLINE_DAYS * 86400_000) return null;
      return box.open(fs.readFileSync(path.join(THEME_CACHE, id + '.bin')));
    } catch {
      return null;
    }
  }
  async function themeCode(id) {
    if (!isAllowed(id)) return null;
    if (themeMem.has(id)) return themeMem.get(id);
    try {
      const res = await fetch(`${BASE}/api/liveapp/theme/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${store.get()}`, 'User-Agent': 'LiveStage-Desktop' },
        signal: AbortSignal.timeout(20000),
      });
      if (res.status === 200) {
        const code = await res.text();
        themeMem.set(id, code);
        try {
          fs.mkdirSync(THEME_CACHE, { recursive: true });
          fs.writeFileSync(path.join(THEME_CACHE, id + '.bin'), box.seal(code));
        } catch {}
        return code;
      }
      if (res.status === 401 || res.status === 403) return null;
    } catch {}
    const cached = readThemeCache(id); // เน็ตหลุด / เว็บล่ม
    if (cached) themeMem.set(id, cached);
    return cached;
  }
  function forgetThemes() {
    for (const id of [...themeMem.keys()]) if (!isAllowed(id)) themeMem.delete(id);
  }

  if (desktop) {
    setTimeout(refresh, 1500);
    setInterval(refresh, REFRESH_MS);
  }

  // ---------------------------------------------------------------- สรุปไลฟ์ + สำรองการตั้งค่า (บัญชี TubHool)
  async function cloud(method, urlPath, body) {
    if (!desktop || !store.get() || !signedIn()) return { ok: false, error: 'ยังไม่ได้เข้าสู่ระบบ TubHool' };
    try {
      const { status, data } = await api(method, urlPath, body);
      if (status === 401) return { ok: false, error: 'ต้องเข้าสู่ระบบ TubHool ใหม่' };
      if (status !== 200) return { ok: false, error: data.error || `เว็บตอบกลับ ${status}` };
      return { ok: true, ...data };
    } catch {
      return { ok: false, error: 'เชื่อมต่อเว็บ TubHool ไม่ได้' };
    }
  }
  const uploadReport = (body) => cloud('POST', '/api/liveapp/report', body);
  const getSettings = () => cloud('GET', '/api/liveapp/settings');
  const putSettings = (data) => cloud('PUT', '/api/liveapp/settings', { data });
  const aiReply = (body) => cloud('POST', '/api/liveapp/ai-reply', body);

  return { desktop, state, allowedThemes, isAllowed, startLogin, handleCallback, logout, refresh, setFreeTheme, commentCode, commentCheck, themeCode, signedIn, uploadReport, getSettings, putSettings, aiReply, features, base: BASE };
};
