// TikTok Live Stage — server
// เชื่อม TikTok Live -> ส่งเหตุการณ์ (คอมเมนต์, ของขวัญ, ไลก์, ติดตาม, แชร์) ไปหน้าเวที ผ่าน Socket.IO
// รองรับหลายธีม (คอนเสิร์ต / ไหว้ศาล / ลอยกระทง) เปลี่ยนได้จากแผงควบคุม
const path = require('path');
const fairConnection=require('./fair-connection');
const fs = require('fs');
const http = require('http');
const os = require('os');
const express = require('express');
const { Server } = require('socket.io');
const { THEMES } = require('./themes');
const { HUD_THEMES, buildCustom, sanitizeCustom, specOf } = require('./hudthemes');
// คลังการ์ดของหน้า "สร้างธีมเอง": เอฟเฟกต์ + คำสั่งจากทุกธีมต้นแบบ (ไม่ซ้ำ) ให้ลากไปใช้
let customLib = null;
function customLibrary() {
  if (customLib) return customLib;
  const fx = new Map();
  const cmds = new Map();
  for (const [id, t] of Object.entries(HUD_THEMES)) {
    const s = specOf(t);
    for (const f of s.fx) if (!fx.has(f[0] + f[1])) fx.set(f[0] + f[1], { icon: f[0], label: f[1], kind: f[2], emoji: f[3], from: id });
    for (const c of s.cmds) if (!cmds.has(c.c)) cmds.set(c.c, { c: c.c, a: c.a, kind: c.kind, emoji: c.emoji, from: id });
  }
  return (customLib = { fx: [...fx.values()], cmds: [...cmds.values()] });
}
const createGames = require('./games');
const createExtras = require('./extras');
const createLicense = require('./local-services');
const createPlay = require('./play');
const createAdventure = require('./adventure');
const createMiniGames = require('./minigames');
const createCF = require('./cf');
const createYouTube = require('./youtube');
const { DEFAULT_MISSIONS, sanitizeMissions, sanitizeScene } = createExtras;
const tts = require('./tts');
const { createSafety, DEFAULTS: SAFETY_DEFAULTS, DEFAULT_WORDS, CATEGORY_LABEL } = require('./safety');

const PORT = Number(process.env.PORT) || 3030;
const DESKTOP = process.env.LIVESTAGE_DESKTOP === '1';
// DATA_DIR เปลี่ยนได้ (ใช้รันเซิร์ฟเวอร์ทดสอบแยก ไม่ให้กระทบไลฟ์จริง)
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, 'data');
const TEST_LIVE = process.env.TEST_LIVE === '1'; // ทดสอบ: ทำเหมือนกำลังไลฟ์ (เกมอัตโนมัติทำงานได้โดยไม่ต่อ TikTok)
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const AVATAR_FILE = path.join(DATA_DIR, 'avatar.vrm');
const MOTION_DIR = path.join(DATA_DIR, 'motions');
// ตัวละครที่ติดมากับระบบ (ใบอนุญาตดู public/avatar/LICENSES.txt)
const AVATAR_MODELS = {
  fumiriya: 'ฟุมิริยะ — ผมสั้นเท่ (VRoid)',
  hair_male: 'หนุ่มผมยาวปิดหู (VRoid)',
  base_male: 'หนุ่มพื้นฐาน ผมสั้น (VRoid)',
};
let avatarRev = Date.now();

// ---------------------------------------------------------------- config
const DEFAULT_CONFIG = {
  platform: 'tiktok', // tiktok | youtube
  username: '',
  youtube: '', // @ช่อง หรือลิงก์ไลฟ์ YouTube
  signApiKey: '',
  theme: 'concert',
  maxAudience: 40,
  idleMinutes: 10,
  hypeGoal: 3000, // แต้ม (ไลก์ 1 แต้ม, เพชร 1 = 5 แต้ม) จนเกิดโชว์ใหญ่อัตโนมัติ
  // เสียงพูด: engine 'edge' = เสียงธรรมชาติ (ฟรี), 'browser' = เสียงของเครื่อง
  tts: {
    engine: 'edge', voice: 'th-TH-NiwatNeural', rate: 1.05, pitch: 0, volume: 0.9,
    gifts: true, minDiamonds: 0, follows: true, joins: false, comments: false, wins: true, welcome: true,
    giftNames: '',
  },
  sound: true,
  // ดนตรีพื้นหลัง: สังเคราะห์สดในหน้าเวที (ไม่มีไฟล์เพลง ไม่ติดลิขสิทธิ์) style 'auto' = ตามธีม
  music: { enabled: true, volume: 0.35, style: 'auto', duck: true },
  // โหมดเผื่อขอบมือถือ: ย่อกล่องข้อความเข้ากลาง ไม่ให้มือถือจอยาวตัดขอบ/แถบ TikTok ทับ (level: low | mid | high)
  safeArea: { enabled: true, level: 'mid' }, // เผื่อขอบมือถือคนดู: เปิด "พอดี" เป็นค่าเริ่มต้น (1.6.0)
  // ตัวละคร 3D (VRM): ตำแหน่งในฉาก 1080x1920 — x = กึ่งกลาง, y = ระดับเท้า, h = ความสูงตัวละคร (px)
  // model: 'auto' = ตัวละคร+ชุดตามธีม, หรือชื่อโมเดล / 'custom' • layouts = ตำแหน่งแยกแต่ละธีม • outfit = แต่งตัวตามธีม
  avatar: { enabled: false, model: 'auto', x: 540, y: 1700, h: 780, react: true, map: {}, outfit: true, framing: 'full', layouts: {}, themeModels: {}, outline: 1, front: false, aa: '8x', style: '3d', bubble: true, wander: true },
  // ภารกิจไลฟ์หลายขั้น (ไลค์/เพชร/ผู้ติดตาม ครบเป้า → ฉลอง) • ตัวเฝ้าการเชื่อมต่อ • ปรับคุณภาพภาพอัตโนมัติ
  missions: structuredClone(DEFAULT_MISSIONS),
  watchdog: { enabled: true, minutes: 2, autoFix: true },
  perf: { auto: true },
  // บัญชี TubHool: ส่งสรุปไลฟ์ขึ้นหน้า "รายงานไลฟ์" / สำรองการตั้งค่าอัตโนมัติหลังไลฟ์จบ
  cloud: { reports: true, autoBackup: true },
  // ตัวละคร AI ตอบคอมเมนต์ (ผู้สนับสนุน TubHool) — chance = สัดส่วนคอมเมนต์ที่ตอบ, gap = เว้นอย่างน้อยกี่วินาที
  ai: { enabled: false, name: '', role: '', style: '', chance: 0.3, gap: 20, questionsOnly: false },
  // คำสั่งพิมพ์ / แต้มคนดู / ร้านแลกแต้ม (play.js)
  play: createPlay.DEFAULT_PLAY,
  petGrow: createPlay.DEFAULT_GROW, // ธีมสัตว์เลี้ยง: น้องโตตามเช็คพอยต์
  // เปลี่ยนเกมอัตโนมัติระหว่างไลฟ์ (มินิเกม/ปาร์ตี้ผจญภัย) — เปลี่ยนเฉพาะตอนธีมที่ใช้อยู่อยู่ในรายการ
  mgRotate: { on: false, minutes: 15, list: ['boatrace', 'pixelquiz', 'castle', 'angler'] },
  bustle: 2, // คนเดินไปมาในฉาก 0 = ปิด, 1 = น้อย, 2 = ปานกลาง, 3 = เยอะ
  // ซูมหาคนส่งของขวัญ (ทุกธีมที่มีคนดูในฉาก) — min = เหรียญขั้นต่ำ, k = ระยะซูม, sec = นานกี่วินาที • kidQueue = ธีมศาล: คนดูเดินเข้าไหว้ทีละคน
  zoom: { enabled: true, min: 0, k: 2, sec: 5, hideHud: true, kidQueue: true },
  pfp: 'small', // รูปโปรไฟล์คนดู: off = ไม่แสดง, small = เล็กข้างชื่อ, big = ใหญ่ลอยเหนือหัว (ไม่มีชื่อ), bigname = ใหญ่เหนือหัว + ชื่อ
  // เพลงในไลฟ์: เพลย์ลิสต์ไฟล์ในเครื่อง (เก็บสำเนาไว้ที่ DATA_DIR/music) — หน้าเวทีที่มีเสียงเป็นคนเล่น
  playlist: { items: [], volume: 0.7, duckTo: 0.35, loop: true, shuffle: false, fade: 2, stopBg: true, showTitle: true, autoStart: false, ack: false }, // ack = ยืนยันแล้วว่าใช้เฉพาะเพลงที่มีสิทธิ์
  games: { fortune: true, fortuneCommand: 'เซียมซี', welcome: true, levels: true },
  safety: structuredClone(SAFETY_DEFAULTS), // ตัวกรองคำต้องห้าม / โหมดปลอดภัย / รายชื่อบล็อก
  // ข้อความแนะนำที่หมุนในกล่องซ้ายของหน้าเวที
  hints: { request: true, theme: true, fortune: true, level: true, team: true, game: true, custom: [], seconds: 4 },
  themes: {}, // ค่าที่ผู้ใช้แก้ของแต่ละธีม { concert: { title, gifts, ... } }
};

function sanitizeAi(a) {
  const s = (v, n) => String(v || '').replace(/[\x00-\x1f]/g, ' ').trim().slice(0, n);
  return {
    enabled: !!a?.enabled,
    name: s(a?.name, 30), role: s(a?.role, 60), style: s(a?.style, 200),
    chance: Math.min(1, Math.max(0.05, Number(a?.chance) || 0.3)),
    gap: Math.min(300, Math.max(8, Math.round(Number(a?.gap) || 20))),
    questionsOnly: !!a?.questionsOnly,
  };
}

// ชื่อเดิม → [ชื่อใหม่, เพชร, เพชรเดิม] — ของขวัญที่เห็นในแผงของขวัญ TikTok ไทยจริง (พ.ย. 2026)
const GIFT_RENAMES = { lollipop: ['Rosa', 10, 10], 'hand hearts': ['Confetti', 100, 100], butterfly: ['Peeka-Bro', 199, 169], swan: ['Corgi', 299, 699], 'gold mine': ['Travel with You', 999, 1000] };
// ซูมหาคนส่งของขวัญ: รับเฉพาะค่าที่มีในตัวเลือกของห้องควบคุมไลฟ์
function sanitizeZoom(z) {
  z = z || {};
  const one = (v, list, d) => (list.includes(Number(v)) ? Number(v) : d);
  return { enabled: z.enabled !== false, min: one(z.min, [0, 5, 30, 100], 0), k: one(z.k, [1.5, 2, 2.5], 2), sec: one(z.sec, [3, 5, 7], 5), hideHud: z.hideHud !== false, kidQueue: z.kidQueue !== false };
}
function loadConfig() {
  let saved = {};
  try {
    saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch {}
  // ย้ายค่าจากเวอร์ชันแรก (ยังไม่มีธีม) ไปไว้ในธีมคอนเสิร์ต
  if (!saved.themes && (saved.gifts || saved.title)) {
    const c = {};
    for (const k of ['title', 'subtitle', 'nowPlaying', 'artist', 'bpm', 'showPerformer', 'gifts']) if (k in saved) c[k] = saved[k];
    if ('songCommand' in saved) c.requestCommand = saved.songCommand;
    saved.themes = { concert: c };
  }
  const cfg = { ...structuredClone(DEFAULT_CONFIG), ...saved, tts: { ...DEFAULT_CONFIG.tts, ...(saved.tts || {}) }, music: { ...DEFAULT_CONFIG.music, ...(saved.music || {}) }, safeArea: saved.safeArea?.user ? { ...DEFAULT_CONFIG.safeArea, ...saved.safeArea } : { ...DEFAULT_CONFIG.safeArea }, avatar: { ...DEFAULT_CONFIG.avatar, ...(saved.avatar || {}) }, games: { ...DEFAULT_CONFIG.games, ...(saved.games || {}) }, hints: { ...DEFAULT_CONFIG.hints, ...(saved.hints || {}) }, playlist: { ...DEFAULT_CONFIG.playlist, ...(saved.playlist || {}) }, safety: { ...DEFAULT_CONFIG.safety, ...(saved.safety || {}), cats: { ...DEFAULT_CONFIG.safety.cats, ...(saved.safety?.cats || {}) } } };
  // ธีมที่สร้างเอง (ผู้สนับสนุน) — สร้างใหม่จากค่าที่บันทึกไว้ทุกครั้งที่โหลด
  THEMES.custom = buildCustom(saved.customTheme);
  cfg.customTheme = THEMES.custom.spec;
  if (!THEMES[cfg.theme]) cfg.theme = 'concert';
  // 1.6.0: ของขวัญ 5 ชิ้นในรายการเดิมไม่มีในแผงของขวัญ TikTok ไทยแล้ว → เปลี่ยนชื่อในค่าที่ผู้ใช้บันทึกไว้ (ราคาเดิม = ราคาใหม่)
  for (const t of Object.values(cfg.themes || {})) for (const g of Array.isArray(t?.gifts) ? t.gifts : []) {
    const n = GIFT_RENAMES[String(g?.name || '').trim().toLowerCase()];
    if (!n) continue;
    if (Number(g.diamonds) === n[2]) g.diamonds = n[1];
    g.name = n[0];
  }
  cfg.missions = saved.missions ? sanitizeMissions(saved.missions) : structuredClone(DEFAULT_MISSIONS);
  cfg.sceneLevels = sanitizeScene(saved.sceneLevels);
  cfg.shareGoal = sanitizeShare(saved.shareGoal);
  cfg.watchdog = { ...DEFAULT_CONFIG.watchdog, ...(saved.watchdog || {}) };
  cfg.perf = { ...DEFAULT_CONFIG.perf, ...(saved.perf || {}) };
  cfg.zoom = sanitizeZoom(saved.zoom);
  cfg.platform = saved.platform === 'youtube' ? 'youtube' : 'tiktok';
  cfg.youtube = String(saved.youtube || '').trim().slice(0, 200);
  cfg.cloud = { reports: saved.cloud?.reports !== false, autoBackup: saved.cloud?.autoBackup !== false };
  cfg.ai = sanitizeAi(saved.ai);
  cfg.play = createPlay.sanitizePlay(saved.play || DEFAULT_CONFIG.play);
  cfg.petGrow = createPlay.sanitizeGrow(saved.petGrow || DEFAULT_CONFIG.petGrow);
  cfg.mgRotate = sanitizeRotate(saved.mgRotate || DEFAULT_CONFIG.mgRotate);
  // โมเดลที่ไม่มีแล้ว (เช่น ตัวละครผู้หญิงชุดเก่า) → ตามธีม
  if (!AVATAR_MODELS[cfg.avatar.model] && !['custom', 'auto'].includes(cfg.avatar.model)) cfg.avatar.model = 'auto';
  for (const k of ['gifts', 'title', 'subtitle', 'nowPlaying', 'artist', 'bpm', 'showPerformer', 'songCommand']) delete cfg[k];
  return cfg;
}
function sanitizeRotate(r) {
  const list = [...new Set((Array.isArray(r?.list) ? r.list : []).map(String))].filter((id) => THEMES[id] && (THEMES[id].mg || THEMES[id].adv)).slice(0, 10);
  return { on: !!r?.on, minutes: Math.min(120, Math.max(3, Math.round(Number(r?.minutes) || 15))), list };
}
function saveConfig() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}
require('./local-backup').applyPending(DATA_DIR);
let config = loadConfig();

const theme = () => THEMES[config.theme];
function themeSettings(id) {
  const def = structuredClone(THEMES[id].defaults);
  const setting = { ...def, ...(config.themes[id] || {}) };
  if(id==='templefair') setting.gifts=require('./fair-gifts').normalize(setting.gifts);
  if (def.host && !config.themes[id]?.host) setting.host = 'ผู้จัดไลฟ์';
  return setting;
}
const active = () => themeSettings(config.theme);

// ลิงก์ในวง Wi-Fi บ้าน (ให้มือถือเปิดหน้าเวที/หลังบ้านได้)
function lanUrls() {
  const out = [];
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    for (const a of list || []) {
      if (a.family === 'IPv4' && !a.internal && !a.address.startsWith('169.254.')) out.push({ name, url: `http://${a.address}:${PORT}` });
    }
  }
  const score = (u) => (u.url.includes('//192.168.') ? 0 : u.url.includes('//10.') ? 1 : 2) + (/vEthernet|VirtualBox|VMware|WSL|Hyper-V/i.test(u.name) ? 5 : 0);
  return out.sort((a, b) => score(a) - score(b));
}

// ข้อมูลที่ส่งให้หน้าเว็บ (ไม่มี API key)
function publicConfig() {
  const themes = {};
  for (const id of Object.keys(THEMES)) themes[id] = { meta: THEMES[id], t: themeSettings(id) };
  return {
    platform: license.features().youtube ? config.platform : 'tiktok',
    features: license.features(),
    username: config.username,
    youtube: config.youtube,
    cloud: config.cloud,
    ai: config.ai,
    hasSignKey: !!config.signApiKey,
    theme: config.theme,
    giftIcons: giftIconsPublic(),
    maxAudience: config.maxAudience,
    idleMinutes: config.idleMinutes,
    hypeGoal: config.hypeGoal,
    tts: config.tts,
    sound: config.sound,
    music: config.music,
    safeArea: config.safeArea,
    missions: config.missions,
    sceneLevels: config.sceneLevels,
    shareGoal: config.shareGoal,
    watchdog: config.watchdog,
    plan: { mode: license.state().mode, watermark: license.state().watermark, themes: license.allowedThemes() },
    perf: config.perf,
    zoom: config.zoom, // ซูมหาคนส่งของขวัญ (หน้าเวที + ห้องควบคุมไลฟ์อ่านค่านี้)
    play: config.play,
    petGrow: config.petGrow,
    mgRotate: config.mgRotate,
    shopItems: createPlay.DEFAULT_SHOP,
    avatar: { ...config.avatar, custom: fs.existsSync(AVATAR_FILE), rev: avatarRev, models: AVATAR_MODELS },
    voices: tts.VOICES,
    // โปรแกรมติดตั้ง: รับเฉพาะในเครื่องตัวเอง (ไม่มีหน้าเตือน Firewall) เว้นแต่เปิดโหมดมือถือไว้
    lanUrls: DESKTOP && !config.lanAccess ? [] : lanUrls(),
    lanAccess: !!config.lanAccess,
    desktop: DESKTOP,
    bustle: config.bustle,
    pfp: config.pfp,
    playlist: config.playlist,
    games: config.games,
    safety: { safeMode: !!config.safety.safeMode, filter: !!config.safety.filter },
    hints: config.hints,
    themes,
  };
}

// ---------------------------------------------------------------- state
const state = {
  status: 'idle', // idle | connecting | connected | offline | error
  statusText: 'ยังไม่เชื่อมต่อ',
  roomId: null,
  viewers: 0,
  totalLikes: 0,
  hype: 0,
  audience: new Map(), // id -> { id, name, avatar, color, lastActive, vip }
  leaderboard: new Map(), // id -> { id, name, avatar, diamonds }
  requests: [], // { id, uid, by, text, at } (ขอเพลง / ขอพร / อธิษฐาน)
  filtered: [], // ข้อความ/ชื่อที่ถูกกรอง (ให้แอดมินดู)
  modRecent: [], // คอมเมนต์ล่าสุด (ให้แอดมินซ่อน/บล็อก)
  log: [],
};

const fairBridge = new (require('./fair-live-bridge').FairLiveBridge)({dir:DATA_DIR,emit:(...args)=>io.emit(...args),mode:()=>wantConnected||state.status==='connected'?'live':'test',room:()=>state.roomId,enabled:()=>config.theme==='templefair',settings:()=>themeSettings('templefair'),meta:()=>THEMES.templefair});
let fairLastSession = null;
const COLORS = ['#ff4fa3', '#39d5ff', '#ffd23f', '#8b5cff', '#3dff9e', '#ff7b39', '#ff3b5c', '#4fffe6'];
const colorFor = (id) => {
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
};

const topList = () => [...state.leaderboard.values()].sort((a, b) => b.diamonds - a.diamonds).slice(0, 5);
const audienceList = () => [...state.audience.values()];
function snapshot() {
  return {
    config: publicConfig(),
    status: state.status,
    statusText: state.statusText,
    viewers: state.viewers,
    totalLikes: state.totalLikes,
    hype: state.hype,
    audience: audienceList(),
    top: topList(),
    requests: state.requests,
    games: games.state(),
  };
}

function log(type, text) {
  const entry = { t: Date.now(), type, text };
  state.log.unshift(entry);
  state.log.length = Math.min(state.log.length, 300);
  io.emit('log', entry);
}

// ---------------------------------------------------------------- core event handling (ใช้ทั้งไลฟ์จริงและโหมดทดสอบ)
// ---------------------------------------------------------------- ระบบกันความเสี่ยง
const safety = createSafety(() => config.safety);
const strictSafety = createSafety(() => ({ ...config.safety, filter: true }));
const GAME_STRICT = [
  'หวย', 'ล็อตเตอรี่', 'ลอตเตอรี่', 'สลากกินแบ่ง', 'เลขเด็ด', 'เลขนำโชค', 'เลขมงคล', 'งวดนี้', 'งวดหน้า', 'รางวัลที่1',
  'พนัน', 'เดิมพัน', 'แทง', 'บาคาร่า', 'คาสิโน', 'สล็อต',
  'โอนเงิน', 'บัญชี', 'พร้อมเพย์', 'promptpay', 'ไลน์', 'line', 'แอด', 'อินบ็อกซ์', 'inbox', 'ทักแชท',
  'ส่งของขวัญ', 'ของขวัญมา', 'gift',
];
const flaggedNames = new Set();
function reportFiltered(u, text, reasons, where) {
  const item = { t: Date.now(), id: u.id, name: u.name, text: String(text).slice(0, 140), reasons, where };
  state.filtered.unshift(item);
  state.filtered.length = Math.min(state.filtered.length, 150);
  io.to('admin').emit('filtered', item);
  log('filtered', `🛡️ กรอง${where}ของ ${u.name}: [${reasons.join(', ')}]`);
}
// ชื่อคนดูที่มีลิงก์/เบอร์/คำต้องห้าม หรือคนที่ถูกบล็อก → แสดงเป็น "ผู้ชม"
function safeUser(u) {
  if (!u) return u;
  if (safety.isBlocked(u.id)) return { ...u, name: 'ผู้ชม', avatar: '' };
  const r = safety.safeName(u.name);
  if (!r.hit) return u;
  if (!flaggedNames.has(u.id)) {
    flaggedNames.add(u.id);
    reportFiltered(u, u.name, r.reasons, 'ชื่อ');
  }
  return { ...u, name: r.name };
}
function modFeed(u, text, hidden) {
  const item = { t: Date.now(), id: u.id, name: u.name, text, hidden };
  state.modRecent.unshift(item);
  state.modRecent.length = Math.min(state.modRecent.length, 40);
  io.to('admin').emit('modChat', item);
}

function touchUser(u) {
  if (!u || !u.id) return null;
  if (safety.isBlocked(u.id)) return null;
  let a = state.audience.get(u.id);
  if (!a) {
    // เต็มแล้ว -> ไล่คนที่เงียบนานสุดที่ไม่ใช่ VIP
    if (state.audience.size >= config.maxAudience) {
      const victim = audienceList()
        .filter((x) => !x.vip)
        .sort((x, y) => x.lastActive - y.lastActive)[0];
      if (!victim) return null;
      state.audience.delete(victim.id);
      io.emit('leave', { id: victim.id });
    }
    const wear = play.wearOf?.(u.id) || null; // ชุดที่ซื้อไว้ (จำข้ามไลฟ์)
    a = { id: u.id, name: u.name, avatar: u.avatar || '', color: wear?.color || colorFor(u.id), wear, lastActive: Date.now(), vip: false, lv: 1 };
    state.audience.set(u.id, a);
    games.onEnter(u, a);
    io.emit('join', a);
    fairBridge.push('join', u);
  } else {
    a.lastActive = Date.now();
    if (u.avatar && !a.avatar) a.avatar = u.avatar;
    if (u.name) a.name = u.name;
  }
  return a;
}

function addHype(points, alreadyBig = false) {
  state.hype += points;
  if (state.hype >= config.hypeGoal) {
    state.hype = 0;
    // ถ้าของขวัญชิ้นนี้เป็นโชว์ใหญ่อยู่แล้ว ไม่ต้องยิงซ้ำ (ไม่งั้นชื่อคนส่งโดนทับ)
    if (!alreadyBig) {
      io.emit('effect', { effect: theme().bigEffect, user: null, label: theme().texts.hypeFull, count: 1 });
      log('hype', `หลอดพลังเต็ม → ${theme().texts.bigWord}`);
      extras.highlight('hype', `⚡ หลอดพลังเต็ม → ${theme().texts.bigWord}`);
    }
  }
  io.emit('hype', { hype: state.hype, goal: config.hypeGoal });
}

function handleChat(u, comment) {
  const realName = u.name;
  u = safeUser(u);
  const raw = String(comment || '').slice(0, 120);
  if (safety.isBlocked(u.id)) return log('filtered', `🚫 (บล็อกอยู่) ${realName}: ${raw}`);
  let text = raw;
  const chk = safety.check(raw);
  if (chk.hit) {
    reportFiltered(u, raw, chk.reasons, 'คอมเมนต์');
    if (safety.cfg().mode !== 'mask') return modFeed(u, raw, true);
    text = chk.masked;
  }
  const a = touchUser(u);
  io.emit('chat', { id: u.id, name: u.name, text, inCrowd: !!a });
  fairBridge.push('chat', u, {text});
  extras.onEvent('chat', u);
  // วาเลนไทน์: พิมพ์ "จับคู่" = ลงชื่อลุ้นเป็นคู่รักประจำไลฟ์
  if (config.theme === 'valentine' && text.replace(/\s+/g, '') === 'จับคู่') couplePool.set(u.id, { id: u.id, name: u.name, at: Date.now() });
  // ฉากรอเริ่ม: พิมพ์ "มาแล้ว" = จองที่หน้าเวที (ได้แต้มพิเศษ)
  if (stageMode?.kind === 'soon' && /มาแล้ว|มาละ|มาแร้ว|^มา$/.test(text.replace(/\s+/g, ''))) {
    if (!stageMode.early.some((e) => e.id === u.id) && stageMode.early.length < 200) {
      stageMode.early.push({ id: u.id, name: u.name });
      play.addPoints?.(u, 10);
      io.emit('stageMode', modePublic());
    }
  }
  // ขายของ: "CF A1" → จดออเดอร์ (ไม่นับเป็นคำสั่ง/เกม/AI)
  if (cf.onChat(u, text)) {
    modFeed(u, text, false);
    log('chat', `${u.name}: ${text}`);
    return;
  }
  const fairCommand = config.theme==='templefair' && ['สาธุ','สาธุๆ','เซียมซี'].includes(text.trim());
  const wasCommand = fairCommand || adventure.onChat(u, text) || minigames.onChat(u, text) || play.onChat(u, text);
  modFeed(u, text, false);
  if (!wasCommand) { aiMaybe(u, text); ownedGemini.onComment(u,text).catch(() => {}); }
  log('chat', `${u.name}: ${text}`);
  if(config.theme!=='templefair') games.onChat(u, text);
  else if(text.trim()==='เซียมซี') games.fortune(u);

  const cmd = (active().requestCommand || '').trim();
  if (cmd && text.startsWith(cmd)) {
    const req = text.slice(cmd.length).replace(/^[\s:：-]+/, '').trim();
    if (req) {
      state.requests.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, uid: u.id, by: u.name, text: req.slice(0, 60), at: Date.now() });
      if (state.requests.length > 30) state.requests.shift();
      io.emit('requests', state.requests);
      log('song', `${u.name} ${cmd}: ${req}`);
    }
  }
}

function effectForGift(name, diamonds) {
  const gifts = active().gifts || [];
  const lower = String(name || '').toLowerCase();
  const exact = gifts.find((g) => g.name.toLowerCase() === lower || config.theme==='templefair'&&g.aliases?.some(alias=>alias.toLowerCase()===lower));
  if (exact) return exact.effect;
  // ของขวัญที่ไม่ได้ตั้งค่า -> เลือกเอฟเฟกต์ตามมูลค่าเพชรที่ใกล้เคียง
  const tiers = [...gifts].sort((a, b) => a.diamonds - b.diamonds);
  let pick = tiers[0]?.effect || Object.keys(theme().effects)[0];
  for (const g of tiers) if (diamonds >= g.diamonds) pick = g.effect;
  return pick;
}

// ---------------------------------------------------------------- รูปของขวัญจริงจาก TikTok
// จำแค่ "ลิงก์รูป" บนเซิร์ฟเวอร์ TikTok (ไม่ดาวน์โหลด/ไม่แจกรูปต่อ) — ได้จากรายการของขวัญของห้องตอนเชื่อมต่อ และจากของขวัญทุกชิ้นที่มีคนส่ง
// แผงของขวัญทุกธีมใช้รูปจริง คนดูเห็นตรงกับในแอป TikTok • ยังไม่เคยเชื่อมต่อไลฟ์ = ใช้อีโมจิของเอฟเฟกต์เหมือนเดิม
const GIFT_ICON_FILE = path.join(DATA_DIR, 'gift-icons.json');
let giftIcons = {};
try {
  giftIcons = JSON.parse(fs.readFileSync(GIFT_ICON_FILE, 'utf8')) || {};
} catch {}
let giftIconT = null;
function noteGiftIcon(name, url) {
  const k = String(name || '').trim().toLowerCase();
  if (!k || !/^https:\/\//.test(url || '') || giftIcons[k] === url) return false;
  giftIcons[k] = url;
  clearTimeout(giftIconT);
  giftIconT = setTimeout(() => {
    try {
      fs.writeFileSync(GIFT_ICON_FILE, JSON.stringify(giftIcons));
    } catch {}
    io.emit('giftIcons', giftIconsPublic());
  }, 1500);
  return true;
}
// รายการของขวัญทั้งร้านจาก TikTok — ลิงก์เดียวกับที่หน้าเว็บ TikTok ใช้ ไม่ต้องเซ็นคำขอ
// (conn.fetchAvailableGifts() ของไลบรารีต้องใช้แพ็กเกจเสียเงินของผู้ให้บริการเซ็น เลยล้มเหลวเงียบ ๆ และไม่เคยได้รูป)
// เรียกตอนเปิดโปรแกรม (ไม่เกินทุก 6 ชม.) และตอนเชื่อมต่อไลฟ์ (ห้องนั้น) • ชื่อภาษาอังกฤษให้ตรงกับชื่อที่ไลฟ์ส่งมา
let giftListAt = 0;
async function loadGiftList(roomId = '') {
  if (!roomId && Date.now() - giftListAt < 6 * 3600_000) return;
  giftListAt = Date.now();
  const q = new URLSearchParams({ aid: '1988', app_name: 'tiktok_web', device_platform: 'web_pc', app_language: 'en-US', webcast_language: 'en' });
  if (roomId) q.set('room_id', String(roomId));
  try {
    const r = await fetch(`https://webcast.tiktok.com/webcast/gift/list/?${q}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36' },
      signal: AbortSignal.timeout(15000),
    });
    const d = await r.json();
    let n = 0;
    for (const g of d?.data?.gifts || []) if (noteGiftIcon(g?.name, findUrl(g?.image) || findUrl(g?.icon))) n++;
    if (n) log('system', `โหลดรูปของขวัญจาก TikTok ${n} รายการ`);
  } catch {}
}
// ส่งให้หน้าเวทีเฉพาะของขวัญที่ธีมใช้ (ร้านของขวัญมีหลายร้อยชิ้น ไม่ต้องส่งทั้งหมด)
function giftIconsPublic() {
  const names = new Set(['rose']);
  for (const id of Object.keys(THEMES)) for (const g of themeSettings(id).gifts || []) names.add(String(g.name || '').toLowerCase());
  const out = {};
  for (const n of names) if (giftIcons[n]) out[n] = giftIcons[n];
  return out;
}

function handleGift(u, gift) {
  if(config.theme==='templefair'&&gift.receiptId&&fairBridge.store().seen.has(String(gift.receiptId)))return;
  u = safeUser(u);
  const count = Math.max(1, gift.count | 0);
  const diamondsEach = Math.max(0, gift.diamonds | 0);
  const total = diamondsEach * count;
  noteGiftIcon(gift.name, gift.image);
  const a = touchUser(u);

  const lb = state.leaderboard.get(u.id) || { id: u.id, name: u.name, avatar: u.avatar || '', diamonds: 0 };
  lb.diamonds += total;
  lb.name = u.name;
  if (u.avatar) lb.avatar = u.avatar;
  state.leaderboard.set(u.id, lb);

  // Top 5 = แถวหน้า VIP
  const topIds = new Set(topList().map((x) => x.id));
  for (const m of state.audience.values()) {
    const vip = topIds.has(m.id);
    if (m.vip !== vip) {
      m.vip = vip;
      io.emit('vip', { id: m.id, vip });
    }
  }

  const effect = effectForGift(gift.name, diamondsEach);
  fairBridge.gift(u, gift, effect);
  io.emit('gift', {
    user: { id: u.id, name: u.name, avatar: u.avatar || '', color: a?.color || colorFor(u.id) },
    gift: { id: gift.id||null, receiptId:gift.receiptId||null, name: gift.name, image: gift.image || '', diamonds: diamondsEach, count, total },
    effect,
  });
  io.emit('top', topList());
  log('gift', `${u.name} ส่ง ${gift.name} x${count} (${total}💎) → ${theme().effects[effect]?.label || effect}`);
  games.onGift(u, total);
  extras.onEvent('gift', u, { total, count, name: gift.name });
  play.onGift(u, total, { diamonds: diamondsEach, count });
  adventure.onGift(u, total, { diamonds: diamondsEach, count, effect });
  minigames.onGift(u, total, { diamonds: diamondsEach, count, effect });
  addHype(total * 5, effect === theme().bigEffect);
}

function handleLike(u, count, total) {
  u = safeUser(u);
  touchUser(u);
  if (total) state.totalLikes = total;
  else state.totalLikes += count;
  io.emit('like', { id: u.id, name: u.name, count, total: state.totalLikes });
  fairBridge.push('like', u, {quantity:Math.max(0,Math.floor(Number(count)||0)),total:Math.max(0,Math.floor(Number(state.totalLikes)||0))});
  games.onLike(u, count);
  extras.onEvent('like', u, { count, total: state.totalLikes });
  play.onLike(u, count, state.totalLikes);
  adventure.onLike(u, count);
  minigames.onLike(u, count);
  addHype(count);
}

function handleSocial(u, kind) {
  u = safeUser(u);
  touchUser(u);
  io.emit('social', { id: u.id, name: u.name, kind });
  fairBridge.push(kind, u);
  games.onSocial(u, kind);
  extras.onEvent(kind, u);
  play.onSocial(u, kind);
  log(kind, `${u.name} ${kind === 'follow' ? 'กดติดตาม' : 'แชร์ไลฟ์'}`);
  addHype(kind === 'follow' ? 50 : 30);
  if (kind === 'share') onShareGoal(u);
}

// ---------------- รางวัลชวนแชร์: แชร์ครบเป้า → โชว์ใหญ่ทั้งเวที + กำแพงขอบคุณคนแชร์ (นับใหม่ทุกไลฟ์)
const shareGoal = { count: 0, by: new Map() };
function sanitizeShare(v = {}) {
  return { enabled: v.enabled !== false, target: Math.max(3, Math.min(1000, Math.round(Number(v.target) || 20))) };
}
function sharePublic() {
  const c = config.shareGoal || sanitizeShare();
  return { enabled: c.enabled, count: shareGoal.count, target: c.target, top: [...shareGoal.by.values()].sort((a, b) => b.n - a.n).slice(0, 8) };
}
function resetShareGoal() {
  shareGoal.count = 0;
  shareGoal.by.clear();
  io.emit('shareGoal', sharePublic());
}
function onShareGoal(u) {
  const c = config.shareGoal || sanitizeShare();
  if (!c.enabled) return;
  shareGoal.count += 1;
  const r = shareGoal.by.get(u.id) || { name: u.name, n: 0 };
  r.name = u.name;
  r.n += 1;
  shareGoal.by.set(u.id, r);
  play.addPoints?.(u, 17); // รวมกับแต้มแชร์ปกติ (+3) = +20
  if (shareGoal.count >= c.target) {
    io.emit('effect', { effect: theme().bigEffect, user: null, label: `แชร์ครบ ${c.target} ครั้ง! ขอบคุณทุกคน`, count: 1 });
    log('share', `🔗 แชร์ครบเป้า ${c.target} ครั้ง → โชว์ใหญ่`);
    extras.highlight('share', `🔗 แชร์ครบ ${c.target} ครั้ง`);
    io.emit('shareGoal', { ...sharePublic(), count: c.target, done: true });
    shareGoal.count = 0;
    return;
  }
  io.emit('shareGoal', sharePublic());
}

function handleJoin(u) {
  extras.heartbeat();
  u = safeUser(u);
  if (!touchUser(u)) return;
  log('join', `${u.name} ${theme().texts.joinVerb}`);
}

// ไล่คนที่เงียบนานออก
setInterval(() => {
  const cutoff = Date.now() - config.idleMinutes * 60_000;
  for (const a of audienceList()) {
    if (!a.vip && a.lastActive < cutoff) {
      state.audience.delete(a.id);
      io.emit('leave', { id: a.id });
    }
  }
}, 30_000);

// ---------------------------------------------------------------- TikTok connection
let connection = null;
let wantConnected = false;
let reconnectTimer = null;
const streaks = new Map(); // key -> repeatCount ที่ประมวลผลไปแล้ว

function findUrl(obj, depth = 0) {
  if (!obj || depth > 4) return '';
  if (typeof obj === 'string') return /^https?:\/\//.test(obj) ? obj : '';
  if (Array.isArray(obj)) {
    for (const v of obj) {
      const r = findUrl(v, depth + 1);
      if (r) return r;
    }
    return '';
  }
  if (typeof obj === 'object') {
    for (const k of ['url', 'urlList', 'url_list', 'mUrls', 'urls']) {
      const r = findUrl(obj[k], depth + 1);
      if (r) return r;
    }
  }
  return '';
}

// ---------------------------------------------------------------- ข้อมูลคนดูจาก 1.4.1
// 1.4.1 (12 พ.ย. 2026) บันทึกเลเวล/แต้ม/ชุด/คะแนน/บล็อก ไว้ใต้ชื่อผู้ใช้ TikTok แทน secUid
// คนดูกลับมา → ย้ายก้อนนั้นมารวมกับข้อมูลเดิม (เช็กครั้งเดียวต่อคนต่อการเปิดโปรแกรม ไม่เจอก็ไม่ทำอะไร)
const legacyChecked = new Set();
function mergeLegacyId(from, to, name) {
  if (legacyChecked.has(to)) return;
  legacyChecked.add(to);
  try {
    let any = false;
    any = games.mergeId(from, to) || any;
    any = play.mergeId(from, to) || any;
    any = extras.mergeId(from, to) || any;
    const bl = config.safety?.blocked || [];
    const old = bl.find((b) => b.id === from);
    if (old) {
      if (bl.some((b) => b.id === to)) config.safety.blocked = bl.filter((b) => b !== old);
      else old.id = to;
      saveConfig();
      any = true;
    }
    if (any) log('system', `รวมข้อมูลคนดู ${name} ที่บันทึกตอนใช้เวอร์ชัน 1.4.1 กลับเข้าข้อมูลเดิมแล้ว`);
  } catch (e) {
    log('error', 'รวมข้อมูลคนดูจาก 1.4.1 ไม่สำเร็จ: ' + e.message);
  }
}

function normUser(raw) {
  const u = raw?.user || raw || {};
  // id ต้องคงที่: แต้ม/เลเวล/ชุด/บล็อก ของคนดูทุกไฟล์ผูกกับ id นี้ (ข้อมูลเดิมเป็น secUid "MS4w…")
  // โปรโตคอล v3 ไม่มี uniqueId/userId จึงได้ secUid มาตลอด — ห้ามสลับไปใช้ displayId (เปลี่ยนชื่อผู้ใช้ได้ และไม่ตรงกับข้อมูลเดิม)
  const id = String(u.uniqueId || u.userId || u.secUid || u.displayId || u.id || '');
  // 1.4.1 ใช้ชื่อผู้ใช้ (displayId) เป็น id → รวมข้อมูลช่วงนั้นกลับเข้า id ถาวรครั้งเดียวต่อคน
  if (u.displayId && id === String(u.secUid || '') && u.displayId !== id) mergeLegacyId(String(u.displayId), id, u.nickname || u.displayId);
  return {
    id,
    name: u.nickname || u.uniqueId || u.displayId || 'ผู้ชม',
    avatar: findUrl(u.profilePicture) || findUrl(u.avatarThumb) || '',
  };
}

// สถานะเพลงในไลฟ์ (หน้าเวทีที่เล่นรายงานมา)
const musicState = { id: null, title: '', playing: false, pos: 0, dur: 0, blocked: false, at: 0 };
const musicPlayers = new Set();
let musicPlayer = null;
function setStatus(status, text) {
  // ไลฟ์จบ → ธีมที่สิทธิ์หมดระหว่างไลฟ์ (เช่น เม้นปลดล็อกครบเวลา) ค่อยเปลี่ยนตอนนี้
  if (state.status === 'connected' && status !== 'connected') setTimeout(enforceTheme, 1000);
  // เริ่มเพลย์ลิสต์เองตอนเชื่อมต่อไลฟ์ (ถ้าตั้งไว้)
  if (status === 'connected' && state.status !== 'connected' && config.playlist?.autoStart && config.playlist.items.length && !musicState.playing && musicPlayer) io.to(musicPlayer).emit('music:cmd', { action: 'play' });
  state.status = status;
  state.statusText = text;
  io.emit('status', { status, statusText: text, username: config.username, roomId: state.roomId });
  if(config.theme==='templefair'){const snapshot=fairBridge.snapshot();if(snapshot.sessionId!==fairLastSession){fairLastSession=snapshot.sessionId;io.emit('themeEvent',{type:'fairSession',snapshot:{...snapshot,activeViewers:audienceList()}});}}
  // โปรแกรมเดสก์ท็อป: เปิดห้องควบคุมไลฟ์เองตอนเชื่อมต่อสำเร็จ ปิดเองตอนไลฟ์จบ/หลุด (desktop/main.js)
  try {
    global.__liveStageOnStatus?.(status);
  } catch {}
}

// รับได้ทั้ง "name", "@name", "name/live", "https://www.tiktok.com/@name/live?..."
function cleanUsername(s) {
  s = String(s || '').trim();
  const m = s.match(/tiktok\.com\/@([^/?#\s]+)/i);
  if (m) s = m[1];
  return s.replace(/^@+/, '').split(/[/?#\s]/)[0].trim();
}

// จำว่ากำลังเชื่อมต่ออยู่ — ถ้าเซิร์ฟเวอร์ล่ม/รีสตาร์ทระหว่างไลฟ์ จะต่อกลับให้เอง
function setAutoConnect(on) {
  if (!!config.autoConnect === on) return;
  config.autoConnect = on;
  saveConfig();
}

// เชื่อมต่อไลฟ์ตามแพลตฟอร์มที่เลือก (ชื่อเดิม connectTikTok ใช้อยู่หลายที่)
function connectTikTok() {
  return config.platform === 'youtube' && license.features().youtube ? connectYouTube() : connectTikTokLive();
}

// ---------------------------------------------------------------- YouTube Live (youtube.js)
let yt = null;
async function connectYouTube() {
  await disconnectTikTok(false);
  wantConnected = true;
  clearTimeout(reconnectTimer);
  if (license.desktop && !license.state().signedIn) {
    wantConnected = false;
    setStatus('error', 'กรุณาเข้าสู่ระบบ TubHool ก่อนเชื่อมต่อไลฟ์');
    return;
  }
  const target = String(config.youtube || '').trim();
  if (!target) {
    setStatus('error', 'ยังไม่ได้ใส่ช่อง YouTube');
    return;
  }
  setStatus('connecting', `กำลังเชื่อมต่อ YouTube ${target} ...`);
  const me = createYouTube({
    chat: (u, t) => handleChat(u, t),
    superchat: (u, g) => handleGift(u, { ...g, count: 1 }),
    member: (u) => handleSocial(u, 'follow'),
    viewers: (n) => {
      state.viewers = n;
      io.emit('viewers', n);
      extras.onViewers(n);
    },
    end: (err) => {
      if (yt !== me) return;
      if (err) {
        log('error', err.message);
        return scheduleReconnect('หลุดการเชื่อมต่อ YouTube');
      }
      extras.onEnded();
      setAutoConnect(false);
      log('system', 'ไลฟ์ YouTube จบแล้ว');
      resetCounters();
      setStatus('offline', 'ไลฟ์จบแล้ว');
      wantConnected = false;
    },
  });
  yt = me;
  try {
    const r = await me.connect(target);
    if (yt !== me) return;
    const roomId = 'yt:' + r.videoId;
    const newRoom = roomId !== state.roomId;
    if (newRoom) resetCounters();
    state.roomId = roomId;
    extras.onConnected(roomId, newRoom);
    if (newRoom) {
      play.reset();
      adventure.reset();
      minigames.reset();
      resetShareGoal();
      clearTestLeftovers();
    }
    setStatus('connected', `เชื่อมต่อ YouTube แล้ว${r.title ? ' — ' + r.title.slice(0, 50) : ''}`);
    log('system', `เชื่อมต่อไลฟ์ YouTube ${r.videoId} สำเร็จ`);
  } catch (err) {
    if (yt !== me) return;
    log('error', `เชื่อมต่อ YouTube ไม่สำเร็จ: ${String(err?.message || err).slice(0, 200)}`);
    scheduleReconnect(err?.offline ? `${target} ยังไม่ได้เปิดไลฟ์` : 'เชื่อมต่อ YouTube ไม่สำเร็จ');
  }
}

async function connectTikTokLive() {
  const { TikTokLiveConnection, WebcastEvent, ControlEvent } = require('tiktok-live-connector');
  await disconnectTikTok(false);
  wantConnected = true;
  clearTimeout(reconnectTimer);

  const username = cleanUsername(config.username);
  if (license.desktop && !license.state().signedIn) {
    wantConnected = false;
    setStatus('error', 'กรุณาเข้าสู่ระบบ TubHool ก่อนเชื่อมต่อไลฟ์');
    return;
  }
  if (!username) {
    setStatus('error', 'ยังไม่ได้ใส่ชื่อผู้ใช้ TikTok');
    return;
  }
  setStatus('connecting', `กำลังเชื่อมต่อ @${username} ...`);

  // อย่าเปิด enableExtendedGiftInfo: ตอนนี้ต้องใช้แพ็กเกจ Business ของ Euler ไม่งั้นเชื่อมต่อล้มทั้งหมด
  // (ชื่อ/ราคา/รูปของขวัญมากับ giftDetails ในแต่ละอีเวนต์อยู่แล้ว)
  const opts = { enableExtendedGiftInfo: false, processInitialData: false };
  if (config.signApiKey) opts.signApiKey = config.signApiKey;
  const conn = new TikTokLiveConnection(username, opts);
  connection = conn;

  conn.on(WebcastEvent.CHAT, (d) => {
    const u = normUser(d);
    // โปรโตคอลใหม่ (v3): ข้อความอยู่ที่ content (รุ่นเก่าคือ comment)
    if (u.id) handleChat(u, d.content ?? d.comment);
  });

  conn.on(WebcastEvent.MEMBER, (d) => {
    const u = normUser(d);
    if (u.id) handleJoin(u);
  });

  conn.on(WebcastEvent.GIFT, (d) => {
    const u = normUser(d);
    if (!u.id) return;
    // โปรโตคอลใหม่ (v3): ชื่อ/ราคา/รูป/ประเภท อยู่ใน d.gift (รุ่นเก่าคือ giftDetails)
    const det = d.gift || d.giftDetails || d.extendedGiftInfo || {};
    const name = det.name || det.giftName || d.extendedGiftInfo?.name || `Gift#${d.giftId}`;
    const diamonds = Number(det.diamondCount ?? d.extendedGiftInfo?.diamond_count) || 0;
    const image = findUrl(det.image) || findUrl(det.giftImage) || findUrl(det.icon) || findUrl(d.extendedGiftInfo?.image) || '';
    const giftType = det.type ?? det.giftType ?? d.extendedGiftInfo?.type;
    const repeat = Math.max(1, Number(d.repeatCount) || 1);

    let count = repeat;
    if (giftType === 1) {
      // ของขวัญแบบคอมโบ: ประมวลผลเฉพาะส่วนต่างทันทีที่เข้ามา จะได้มีเอฟเฟกต์ทันทีและไม่นับซ้ำ
      const key = `${u.id}:${d.giftId}:${d.groupId || ''}`;
      count = require('./gift-streak')(streaks,key,repeat,!!d.repeatEnd);
      if (count <= 0) return;
    }
    handleGift(u, { id:d.giftId, receiptId:(d.msgId||d.common?.msgId||d.groupId)?'tiktok:'+u.id+':'+d.giftId+':'+(d.msgId||d.common?.msgId||d.groupId)+':'+repeat:undefined, name, diamonds, image, count });
  });

  conn.on(WebcastEvent.LIKE, (d) => {
    const u = normUser(d);
    // โปรโตคอลใหม่ (v3): count / total (รุ่นเก่าคือ likeCount / totalLikeCount)
    if (u.id) handleLike(u, Number(d.count ?? d.likeCount) || 1, Number(d.total ?? d.totalLikeCount) || 0);
  });

  conn.on(WebcastEvent.FOLLOW, (d) => {
    const u = normUser(d);
    if (u.id) handleSocial(u, 'follow');
  });
  conn.on(WebcastEvent.SHARE, (d) => {
    const u = normUser(d);
    if (u.id) handleSocial(u, 'share');
  });

  conn.on(WebcastEvent.ROOM_USER, (d) => {
    // โปรโตคอลใหม่: total = คนดูตอนนี้ (viewerCount เป็นของรุ่นเก่า)
    const v = Number(d.total ?? d.viewerCount);
    if (Number.isFinite(v)) state.viewers = v;
    io.emit('viewers', state.viewers);
    extras.onViewers(state.viewers);
  });

  conn.on(WebcastEvent.STREAM_END, () => {
    if(config.theme==='templefair'&&connection!==conn)return;
    if(fairConnection.keepWatching({theme:config.theme,wanted:wantConnected,autoConnect:config.autoConnect})){extras.onEnded();resetCounters();log('system','งานวัด: ไลฟ์จบแล้ว รอเชื่อมรอบใหม่');scheduleReconnect('รอไลฟ์รอบใหม่');return;}
    extras.onEnded();
    setAutoConnect(false);
    log('system', 'ไลฟ์จบแล้ว');
    resetCounters();
    setStatus('offline', 'ไลฟ์จบแล้ว');
    wantConnected = false;
  });

  conn.on(ControlEvent.DISCONNECTED, () => {
    if (connection !== conn) return;
    log('system', 'หลุดการเชื่อมต่อ');
    if (wantConnected) scheduleReconnect('หลุดการเชื่อมต่อ');
  });
  conn.on(ControlEvent.ERROR, (err) => {
    log('error', String(err?.message || err?.info || err).slice(0, 200));
  });

  try {
    let authenticatedRoomId=null;
    if(config.theme==='templefair'){
      const lookup=await fairConnection.resolveRoom({username,fetchApi:id=>require('tiktok-live-connector').fetchRoomInfoFromApiLiveRoute({webClient:conn.webClient,uniqueId:id}),fetchSaved:global.__liveStageTikTokAccount?id=>global.__liveStageTikTokAccount.readLiveRoom(id,{timeoutMs:4500}):null});
      authenticatedRoomId=lookup.roomId;
      if(connection!==conn||!wantConnected)return;
      if(authenticatedRoomId)log('system','งานวัด: พบห้อง LIVE จาก '+lookup.source);
    }else if(global.__liveStageTikTokAccount){
      authenticatedRoomId=await global.__liveStageTikTokAccount.readLiveRoom(username);
      if(connection!==conn||!wantConnected)return;
      if(authenticatedRoomId)log('system','พบห้อง LIVE จาก session TikTok ในเครื่อง');
    }
    const st = await conn.connect(authenticatedRoomId||undefined);
    if(config.theme==='templefair'&&(connection!==conn||!wantConnected)){await conn.disconnect();return;}
    const newRoom = st.roomId !== state.roomId;
    if (newRoom) resetCounters(); // ไลฟ์รอบใหม่ (ต่อกลับห้องเดิมหลังหลุด = นับต่อ)
    state.roomId = st.roomId;
    extras.onConnected(st.roomId, newRoom);
    if (newRoom) {
      play.reset();
      adventure.reset();
      minigames.reset();
      resetShareGoal();
      clearTestLeftovers();
    }
    setStatus('connected', `เชื่อมต่อ @${username} แล้ว`);
    log('system', `เชื่อมต่อห้อง ${st.roomId} สำเร็จ`);
    // รายการของขวัญของห้อง → จำรูปของขวัญจริงไว้ใช้ในแผงของขวัญ (ไม่รอ ไม่ทำให้เชื่อมต่อช้า)
    loadGiftList(st.roomId);
  } catch (err) {
    if(config.theme==='templefair'&&(connection!==conn||!wantConnected))return;
    const msg = String(err?.message || err);
    const offline = /offline|not live|UserOffline/i.test(msg + (err?.constructor?.name || ''));
    log('error', `เชื่อมต่อไม่สำเร็จ: ${msg.slice(0, 200)}`);
    scheduleReconnect(offline ? `@${username} ยังไม่ได้เปิดไลฟ์` : 'เชื่อมต่อไม่สำเร็จ');
  }
}

function scheduleReconnect(reason) {
  if (!wantConnected) return;
  const delay=fairConnection.retryMs(config.theme);
  setStatus('offline', `${reason} — ลองใหม่ใน ${delay/1000} วินาที`);
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => wantConnected && connectTikTok().catch(() => {}), delay);
}

async function disconnectTikTok(updateStatus = true) {
  clearTimeout(reconnectTimer);
  if (updateStatus) wantConnected = false;
  const conn = connection;
  connection = null;
  streaks.clear();
  if (yt) {
    yt.disconnect();
    yt = null;
  }
  if (conn) {
    try {
      await conn.disconnect();
    } catch {}
  }
  if (updateStatus) {
    extras.onEnded();
    resetCounters();
    setStatus('idle', 'ยังไม่เชื่อมต่อ');
  }
}

// ผู้ชม/ไลก์เป็นของไลฟ์รอบนั้น — ตัดการเชื่อมต่อ/ไลฟ์จบ/ต่อเข้าไลฟ์รอบใหม่ = เริ่ม 0
// ไลฟ์รอบใหม่ (ห้องใหม่): ล้างหลอดพลังคนดู + ลบคนดูทดสอบ/ยอดของขวัญทดสอบ (ไอดีขึ้นต้น test:) ออกจากฉากและ Top 5
// ทดสอบก่อนไลฟ์แล้วเริ่มไลฟ์ต่อเลย ชื่อทดสอบจะไม่ค้างเป็นเจ้าภาพ • คนดูจริงไม่โดนลบ • ต่อกลับห้องเดิมหลังเน็ตหลุด = ไม่เรียก
function clearTestLeftovers() {
  state.hype = 0;
  const isTest = (id) => String(id).startsWith('test:');
  let n = 0;
  for (const id of [...state.audience.keys()]) {
    if (!isTest(id)) continue;
    state.audience.delete(id);
    n++;
  }
  for (const id of [...state.leaderboard.keys()]) if (isTest(id)) state.leaderboard.delete(id);
  io.emit('snapshot', snapshot());
  io.emit('hype', { hype: 0, goal: config.hypeGoal });
  if (n) log('system', `เริ่มไลฟ์รอบใหม่: เอาคนดูทดสอบ ${n} คนออกจากฉาก และล้างยอดทดสอบใน Top 5`);
}

function resetCounters() {
  state.viewers = 0;
  state.totalLikes = 0;
  io.emit('counters', { viewers: 0, totalLikes: 0 });
}

// ---------------------------------------------------------------- HTTP + sockets
const app = express();
app.use(express.json({limit:'7mb'}));
// โค้ดธีม: โปรแกรมติดตั้งมีแค่ธีมคอนเสิร์ต ธีมอื่นโหลดจาก tubhool.com ตามสิทธิ์ของบัญชี (ดู license.js)
// ตัวติดตั้งจริง: ใช้ไฟล์ธีมในเครื่องได้เฉพาะธีมที่ติดมากับตัวติดตั้ง — ธีมอื่นมาจาก tubhool.com ตามสิทธิ์บัญชีเสมอ
// (กันคนเอาไฟล์ธีมที่หลุดออกไปมาวางในโฟลเดอร์โปรแกรม) • ตอนพัฒนา (ไม่ใช่ตัวติดตั้ง) ยังใช้ไฟล์ในเครื่องได้ทุกธีม
const BUNDLED_THEMES = new Set(['concert', 'custom']);
const PACKAGED = (() => {
  try {
    return !!require('electron').app?.isPackaged;
  } catch {
    return false;
  }
})();
app.get('/themes/:file', async (req, res, next) => {
  const id = String(req.params.file).replace(/\.js$/, '');
  if (!THEMES[id]) return next();
  const local = (!PACKAGED || BUNDLED_THEMES.has(id)) && fs.existsSync(path.join(__dirname, 'public', 'themes', id + '.js'));
  const forceRemote = process.env.LIVESTAGE_REMOTE_THEMES === '1' && id !== 'concert';
  if (local && !forceRemote) return next();
  res.type('application/javascript').set('Cache-Control', 'no-store');
  if (!license.desktop) return res.status(404).send('/* ไม่มีไฟล์ธีม */');
  const code = await license.themeCode(id);
  if (!code) return res.status(403).send(`/* ธีม ${id} ล็อกอยู่ หรือยังโหลดจาก TubHool ไม่ได้ */`);
  res.send(code);
});
// ห้องควบคุมไลฟ์: เฉพาะผู้สนับสนุน (รันจากซอร์ส/โหมดเจ้าของระบบ = ใช้ได้) — สมาชิกฟรีเปิดลิงก์ตรงก็ได้หน้าชวนสมัครแทน
// ไฟล์จริงอยู่ในโฟลเดอร์ supporter/ (ไม่อยู่ใน public) → เปิดได้ทางนี้ทางเดียว เลี่ยงด้วยการเขียนที่อยู่แปลก ๆ ไม่ได้
// desktop/main.js ใช้ global นี้ตัดสินว่าจะเด้งหน้าต่างห้องควบคุมตอนเริ่มไลฟ์หรือไม่
const controlOk = () => license.allowedThemes() === null;
global.__liveStageControlOk = controlOk;
global.__liveStageFairWaiting=()=>config.theme==='templefair'&&wantConnected&&config.autoConnect;
app.get(['/control.html', '/control.js'], (req, res) => {
  const js = /\.js$/i.test(req.path);
  res.set('Cache-Control', 'no-store');
  if (controlOk()) return res.sendFile(path.join(__dirname, 'supporter', js ? 'control.js' : 'control.html'));
  if (js) return res.status(403).type('application/javascript').send('/* ห้องควบคุมไลฟ์: เฉพาะผู้สนับสนุน */');
  res.sendFile(path.join(__dirname, 'public', 'control-locked.html'));
});
app.use(express.static(path.join(__dirname, 'public')));
// ไลบรารี 3D (เสิร์ฟจากเครื่อง ไม่พึ่ง CDN ระหว่างไลฟ์)
// ส่วนเสริม three.js (ตัวโหลดโมเดล 3D): โปรแกรมติดตั้งเก็บไว้ที่ vendor/three-addons (ดู scripts/copy-vendor.js)
const THREE_ADDONS = path.join(__dirname, 'vendor', 'three-addons');
if (fs.existsSync(THREE_ADDONS)) app.use('/vendor/three/examples/jsm', express.static(THREE_ADDONS));
app.use('/vendor/three', express.static(path.join(__dirname, 'node_modules', 'three')));
app.use('/vendor/three-vrm', express.static(path.join(__dirname, 'node_modules', '@pixiv', 'three-vrm', 'lib')));
app.use('/vendor/three-vrm-animation', express.static(path.join(__dirname, 'node_modules', '@pixiv', 'three-vrm-animation', 'lib')));
// ท่าทาง mocap ที่อัปโหลดเอง (.vrma / .fbx จาก Mixamo)
app.use('/motions', express.static(MOTION_DIR));
const motionName = (n) => {
  const b = path.basename(String(n || ''));
  return /^[\w\-. ()ก-๙]{1,80}\.(vrma|fbx)$/i.test(b) ? b : null;
};
app.get('/api/motions', (_req, res) => {
  let list = [];
  try {
    list = fs.readdirSync(MOTION_DIR).filter(motionName).map((f) => ({ name: f, size: fs.statSync(path.join(MOTION_DIR, f)).size }));
  } catch {}
  res.json(list);
});
app.post('/api/motions', express.raw({ type: '*/*', limit: '60mb' }), (req, res) => {
  const name = motionName(req.query.name);
  if (!name) return res.status(400).json({ error: 'ชื่อไฟล์ต้องลงท้าย .vrma หรือ .fbx' });
  const b = req.body;
  if (!Buffer.isBuffer(b) || b.length < 100) return res.status(400).json({ error: 'ไฟล์ว่างหรือเสีย' });
  const isGlb = b.toString('utf8', 0, 4) === 'glTF';
  const isFbx = b.toString('utf8', 0, 18) === 'Kaydara FBX Binary' || /^; FBX/.test(b.toString('utf8', 0, 6));
  if (/\.vrma$/i.test(name) ? !isGlb : !isFbx) return res.status(400).json({ error: 'ไฟล์ไม่ตรงกับนามสกุล (.vrma ต้องเป็น glTF, .fbx ต้องเป็น FBX)' });
  fs.mkdirSync(MOTION_DIR, { recursive: true });
  fs.writeFileSync(path.join(MOTION_DIR, name), b);
  log('system', `เพิ่มท่าทาง ${name}`);
  res.json({ ok: true, name });
});
app.delete('/api/motions/:name', (req, res) => {
  const name = motionName(req.params.name);
  if (name) {
    try {
      fs.unlinkSync(path.join(MOTION_DIR, name));
    } catch {}
  }
  res.json({ ok: true });
});
// โมเดลตัวละคร: ไฟล์ที่อัปโหลดเอง (data/avatar.vrm) หรือโมเดลตัวอย่าง
app.get('/avatar/current.vrm', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  if (fs.existsSync(AVATAR_FILE)) return res.sendFile(AVATAR_FILE);
  res.sendFile(path.join(__dirname, 'public', 'avatar', 'fumiriya.vrm'));
});
// ---------------------------------------------------------------- เพลงในไลฟ์ (ไฟล์เพลงในเครื่อง)
const MUSIC_DIR = path.join(DATA_DIR, 'music');
const MUSIC_EXT = ['mp3', 'mp4', 'm4a', 'm4v', 'wav', 'ogg', 'oga', 'aac', 'flac', 'webm'];
const MUSIC_MAX = 600 * 1024 * 1024;
const MUSIC_MAX_ITEMS = 300;
const cleanTitle = (t) => String(t || '').replace(/[\x00-\x1f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
function sanitizePlaylist(p, prev) {
  const num = (v, a, b, d) => (Number.isFinite(Number(v)) ? Math.min(b, Math.max(a, Number(v))) : d);
  const D = DEFAULT_CONFIG.playlist;
  const byId = new Map((prev?.items || []).map((x) => [x.id, x]));
  // รายการ: เรียงตามที่ส่งมา แต่ใช้เฉพาะเพลงที่มีไฟล์อยู่แล้ว (เพิ่มเพลงใหม่ต้องอัปโหลดผ่าน /api/music/upload)
  const items = [];
  for (const it of Array.isArray(p?.items) ? p.items : prev?.items || []) {
    const old = byId.get(it?.id);
    if (!old || items.some((x) => x.id === old.id)) continue;
    items.push({ ...old, title: cleanTitle(it.title) || old.title });
  }
  return {
    items,
    volume: num(p?.volume, 0, 1, D.volume),
    duckTo: num(p?.duckTo, 0, 1, D.duckTo),
    loop: p?.loop !== false,
    shuffle: !!p?.shuffle,
    fade: num(p?.fade, 0, 8, D.fade),
    stopBg: p?.stopBg !== false,
    showTitle: p?.showTitle !== false,
    autoStart: !!p?.autoStart,
    ack: !!(p?.ack || prev?.ack), // ยืนยันครั้งเดียวพอ
  };
}
function removeMusicFile(file, tries = 0) {
  fs.rm(path.join(MUSIC_DIR, path.basename(file)), { force: true }, (e) => {
    if (e && tries < 5) setTimeout(() => removeMusicFile(file, tries + 1), 60000); // Windows: ไฟล์ที่กำลังเล่นลบไม่ได้ → ลองใหม่ทีหลัง
  });
}
// ไฟล์ที่ไม่มีในรายการแล้ว (ลบไม่สำเร็จรอบก่อน) → เก็บกวาดตอนเปิดโปรแกรม
try {
  const keep = new Set((config.playlist?.items || []).map((x) => x.file));
  for (const f of fs.existsSync(MUSIC_DIR) ? fs.readdirSync(MUSIC_DIR) : []) if (!keep.has(f)) removeMusicFile(f);
} catch {}
app.use('/music-files', express.static(MUSIC_DIR, { fallthrough: false }));
app.post('/api/music/upload', (req, res) => {
  let name = '';
  try { name = decodeURIComponent(String(req.headers['x-name'] || '')); } catch {}
  name = name.replace(/[\\/:*?"|]/g, ' ');
  const ext = (name.match(/\.([a-z0-9]{2,4})$/i)?.[1] || '').toLowerCase();
  if (!config.playlist.ack) return res.status(403).json({ error: 'ยืนยันเรื่องลิขสิทธิ์เพลงก่อน (ติ๊กในหน้า เพลงในไลฟ์)' });
  if (!MUSIC_EXT.includes(ext)) return res.status(400).json({ error: 'รองรับเฉพาะไฟล์ mp3 mp4 m4a wav ogg' });
  if ((config.playlist.items || []).length >= MUSIC_MAX_ITEMS) return res.status(400).json({ error: `มีเพลงครบ ${MUSIC_MAX_ITEMS} เพลงแล้ว` });
  if (Number(req.headers['content-length']) > MUSIC_MAX) return res.status(413).json({ error: 'ไฟล์ใหญ่เกิน 600 MB' });
  fs.mkdirSync(MUSIC_DIR, { recursive: true });
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const file = `${id}.${ext}`;
  const dest = path.join(MUSIC_DIR, file);
  const out = fs.createWriteStream(dest);
  let size = 0, failed = false;
  const fail = (code, error) => {
    if (failed) return;
    failed = true;
    out.destroy();
    removeMusicFile(file);
    if (!res.headersSent) res.status(code).json({ error });
  };
  req.on('data', (ch) => {
    size += ch.length;
    if (size > MUSIC_MAX) { fail(413, 'ไฟล์ใหญ่เกิน 600 MB'); req.destroy(); }
  });
  req.on('aborted', () => fail(400, 'อัปโหลดไม่สำเร็จ'));
  out.on('error', () => fail(500, 'บันทึกไฟล์ไม่สำเร็จ'));
  out.on('finish', () => {
    if (failed) return;
    if (size < 1000) return fail(400, 'ไฟล์ว่างหรือเสีย');
    const item = { id, file, title: cleanTitle(name.replace(/\.[^.]+$/, '')) || 'เพลง', ext, dur: Math.max(0, Math.round(Number(req.headers['x-dur']) || 0)) };
    config.playlist.items.push(item);
    saveConfig();
    log('system', `เพิ่มเพลงในไลฟ์: ${item.title} (${(size / 1e6).toFixed(1)} MB)`);
    io.emit('config', publicConfig());
    res.json({ ok: true, item });
  });
  req.pipe(out);
});
app.post('/api/music/remove', (req, res) => {
  const id = String(req.body?.id || '');
  const it = config.playlist.items.find((x) => x.id === id);
  if (!it) return res.status(404).json({ error: 'ไม่พบเพลงนี้' });
  config.playlist.items = config.playlist.items.filter((x) => x.id !== id);
  saveConfig();
  if (musicState.id === id) io.to(musicPlayer || '').emit('music:cmd', { action: musicState.playing ? 'next' : 'stop' });
  removeMusicFile(it.file);
  io.emit('config', publicConfig());
  res.json({ ok: true });
});

app.post('/api/avatar', express.raw({ type: '*/*', limit: '80mb' }), (req, res) => {
  const b = req.body;
  if (!Buffer.isBuffer(b) || b.length < 1000 || b.toString('utf8', 0, 4) !== 'glTF') return res.status(400).json({ error: 'ไม่ใช่ไฟล์ .vrm' });
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(AVATAR_FILE, b);
  config.avatar.model = 'custom';
  saveConfig();
  avatarRev = Date.now();
  log('system', `อัปโหลดตัวละครใหม่ (${(b.length / 1e6).toFixed(1)} MB)`);
  io.emit('config', publicConfig());
  res.json({ ok: true });
});
app.delete('/api/avatar', (_req, res) => {
  try {
    fs.unlinkSync(AVATAR_FILE);
  } catch {}
  if (config.avatar.model === 'custom') config.avatar.model = 'auto';
  for (const [t, m] of Object.entries(config.avatar.themeModels || {})) if (m === 'custom') delete config.avatar.themeModels[t];
  saveConfig();
  avatarRev = Date.now();
  io.emit('config', publicConfig());
  res.json({ ok: true });
});
// ภาพฉาก 2.5D ที่สร้างเอง (ภาพ + แผนที่ความลึก) ตั้งชื่อตามเนื้อไฟล์ → อัปโหลดซ้ำไม่เปลืองที่
const PIC_DIR = path.join(DATA_DIR, 'pics');
app.use('/pics', express.static(PIC_DIR, { maxAge: '365d', immutable: true }));
app.post('/api/pic', express.raw({ type: '*/*', limit: '20mb' }), (req, res) => {
  const b = req.body;
  if (!Buffer.isBuffer(b) || b.length < 100) return res.status(400).json({ error: 'ไฟล์ว่าง' });
  const ext = b[0] === 0xff && b[1] === 0xd8 ? 'jpg' : b.readUInt32BE(0) === 0x89504e47 ? 'png' : '';
  if (!ext) return res.status(400).json({ error: 'รองรับเฉพาะภาพ JPG / PNG' });
  const name = require('crypto').createHash('sha1').update(b).digest('hex') + '.' + ext;
  fs.mkdirSync(PIC_DIR, { recursive: true });
  const f = path.join(PIC_DIR, name);
  if (!fs.existsSync(f)) fs.writeFileSync(f, b);
  res.json({ ok: true, url: '/pics/' + name });
});
app.get('/', (_req, res) => res.redirect(license.desktop ? '/app.html' : '/admin.html'));

// หน้าที่เบราว์เซอร์เห็นหลังกดอนุญาตบน tubhool.com
const callbackPage = (ok, text) => `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Live Stage</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0b0c;color:#f4f1ec;font-family:'IBM Plex Sans Thai','Leelawadee UI',sans-serif}
.c{max-width:440px;margin:24px;padding:32px;border-radius:24px;background:#161413;border:1px solid #2a2623;text-align:center}
.i{width:64px;height:64px;border-radius:50%;margin:0 auto 16px;display:grid;place-items:center;font-size:32px;font-weight:700;background:${ok ? '#173123' : '#2a1c1a'};color:${ok ? '#4fc483' : '#ff8a80'}}
h1{font-size:24px;margin:0 0 8px}p{color:#a8a29a;line-height:1.6;margin:0}</style></head>
<body><div class="c"><div class="i">${ok ? '✓' : '!'}</div><h1>${ok ? 'เข้าสู่ระบบสำเร็จ' : 'เข้าสู่ระบบไม่สำเร็จ'}</h1><p>${text}</p></div></body></html>`;
const escHtml = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const isLocal = (req) => /^(::1|127\.|::ffff:127\.)/.test(req.socket.remoteAddress || '');
function localOnly(req, res, next) {
  if (!isLocal(req)) return res.status(403).json({ error: 'ใช้ได้จากเครื่องนี้เท่านั้น' });
  next();
}

app.get('/auth/callback', async (req, res) => {
  const r = await license.handleCallback(req.query || {});
  res.set('Cache-Control', 'no-store');
  res.send(r.ok
    ? callbackPage(true, `ยินดีต้อนรับ ${escHtml(r.user.name)} — กลับไปที่โปรแกรม Live Stage ได้เลย ปิดหน้านี้ได้`)
    : callbackPage(false, escHtml(r.error)));
});
// รูปสินค้า CF (เก็บใน data/cf-images)
app.get('/cf-img/:f', (req, res) => {
  if (!cf.IMG_RE.test(req.params.f)) return res.sendStatus(404);
  res.sendFile(path.join(cf.IMG_DIR, req.params.f), { maxAge: '1d' }, (e) => e && !res.headersSent && res.sendStatus(404));
});
require('./local-backup').install({app,localOnly,dir:DATA_DIR,getConfig:()=>config,isLive:()=>wantConnected || state.status === 'connected'});
app.get('/api/account', localOnly, (_req, res) => res.json({ ...license.state(), version: require('./package.json').version }));
// ---------------------------------------------------------------- คลิปตัวอย่างธีม 10 วิ (หน้าเลือกธีม → ปุ่ม ▶ ดูตัวอย่าง)
// คลิปอยู่บน tubhool.com/static/liveapp/clips/ (index.json = { ธีม: เวอร์ชัน }) • โหลดครั้งแรกแล้วเก็บไว้ในเครื่อง ดูซ้ำไม่ต้องโหลดใหม่
// LIVESTAGE_CLIPS_DIR = โฟลเดอร์คลิปในเครื่อง (ไว้ทดสอบก่อนอัปขึ้นเว็บ)
const CLIP_DIR = path.join(DATA_DIR, 'clip-cache');
const CLIP_LOCAL = process.env.LIVESTAGE_CLIPS_DIR ? path.resolve(process.env.LIVESTAGE_CLIPS_DIR) : '';
const CLIP_ID = /^[a-z0-9_-]{1,40}$/;
const CLIP_MAX = 20 * 1024 * 1024;
let clipIndex = { at: 0, list: null };
const clipClean = (j) => Object.fromEntries(Object.entries(j && typeof j === 'object' ? j : {}).filter(([id, v]) => CLIP_ID.test(id) && THEMES[id] && /^[\w.-]{1,40}$/.test(String(v))).map(([id, v]) => [id, String(v)]));
async function clipList() {
  if (license.state().mode === 'local') return {};
  if (CLIP_LOCAL) {
    try {
      return Object.fromEntries(fs.readdirSync(CLIP_LOCAL).filter((f) => f.endsWith('.mp4')).map((f) => [f.slice(0, -4), String(Math.round(fs.statSync(path.join(CLIP_LOCAL, f)).mtimeMs))]).filter(([id]) => CLIP_ID.test(id) && THEMES[id]));
    } catch {
      return {};
    }
  }
  if (clipIndex.list && Date.now() - clipIndex.at < 3600_000) return clipIndex.list;
  const saved = path.join(CLIP_DIR, 'index.json');
  try {
    const r = await fetch(license.base + '/static/liveapp/clips/index.json', { signal: AbortSignal.timeout(8000), cache: 'no-store' });
    if (!r.ok && r.status !== 404) throw new Error('HTTP ' + r.status);
    clipIndex = { at: Date.now(), list: r.ok ? clipClean(await r.json()) : {} };
    try {
      fs.mkdirSync(CLIP_DIR, { recursive: true });
      fs.writeFileSync(saved, JSON.stringify(clipIndex.list));
    } catch {}
  } catch {
    // ออฟไลน์ → ใช้รายการที่เคยโหลดไว้ แล้วลองใหม่ใน 5 นาที
    let old = clipIndex.list;
    if (!old) try {
      old = clipClean(JSON.parse(fs.readFileSync(saved, 'utf8')));
    } catch {}
    clipIndex = { at: Date.now() - 3300_000, list: old || {} };
  }
  return clipIndex.list;
}
const clipLoading = new Map();
async function clipFile(id) {
  const ver = (await clipList())[id];
  if (!ver) return '';
  if (CLIP_LOCAL) return path.join(CLIP_LOCAL, id + '.mp4');
  const file = path.join(CLIP_DIR, `${id}-${ver}.mp4`);
  if (fs.existsSync(file)) return file;
  if (!clipLoading.has(id)) clipLoading.set(id, (async () => {
    try {
      const r = await fetch(`${license.base}/static/liveapp/clips/${id}.mp4?v=${encodeURIComponent(ver)}`, { signal: AbortSignal.timeout(60000) });
      if (!r.ok) return '';
      const buf = Buffer.from(await r.arrayBuffer());
      if (!buf.length || buf.length > CLIP_MAX) return '';
      fs.mkdirSync(CLIP_DIR, { recursive: true });
      for (const f of fs.readdirSync(CLIP_DIR)) if (f.startsWith(id + '-') && f.endsWith('.mp4')) fs.rmSync(path.join(CLIP_DIR, f), { force: true }); // คลิปเวอร์ชันเก่า
      fs.writeFileSync(file + '.part', buf);
      fs.renameSync(file + '.part', file);
      return file;
    } catch {
      return '';
    } finally {
      clipLoading.delete(id);
    }
  })());
  return clipLoading.get(id);
}
app.get('/api/theme-clips', localOnly, async (_req, res) => res.set('Cache-Control', 'no-store').json(Object.keys(await clipList())));
app.get('/theme-clips/:file', localOnly, async (req, res) => {
  const id = String(req.params.file).replace(/\.mp4$/, '');
  const file = CLIP_ID.test(id) ? await clipFile(id) : '';
  if (!file) return res.sendStatus(404);
  res.sendFile(file, { maxAge: 0, headers: { 'Cache-Control': 'no-cache' } }, (e) => e && !res.headersSent && res.sendStatus(404));
});
// ใช้ตอนกดปิดโปรแกรม: ถ้ากำลังไลฟ์อยู่ให้ถามก่อน
app.get('/api/fair/state', localOnly, (_req,res)=>res.set('Cache-Control','no-store').json({...fairBridge.snapshot(),activeViewers:audienceList(),theme:config.theme,status:state.status,gifts:themeSettings('templefair').gifts,effects:THEMES.templefair.effects}));
app.get('/api/live-status', localOnly, (_req, res) => res.json({ status: state.status, viewers: state.viewers }));
// ไฟล์บันทึกปัญหา (ส่งให้ทีมงานช่วยดู) — ไม่มีรหัส/โทเคน/API key
app.get('/api/support-bundle', localOnly, (_req, res) => {
  const { signApiKey, ...safeConfig } = config;
  const acc = license.state();
  const bundle = {
    created: new Date().toISOString(),
    app: { version: require('./package.json').version, desktop: DESKTOP, platform: process.platform, arch: process.arch, node: process.versions.node, electron: process.versions.electron || null, os: os.release() },
    account: { mode: acc.mode, signedIn: acc.signedIn, plan: acc.plan, error: acc.error, user: acc.user ? { id: acc.user.id, name: acc.user.name, supporter: acc.user.supporter } : null },
    live: { status: state.status, statusText: state.statusText, viewers: state.viewers, roomId: state.roomId ? 'yes' : 'no' },
    config: { ...safeConfig, hasSignApiKey: !!signApiKey, themes: Object.keys(config.themes || {}) },
    log: state.log.slice(0, 300),
    updaterLog: (() => {
      try {
        return fs.readFileSync(global.__liveStageUpdaterLogPath, 'utf8').slice(-20000).split('\n');
      } catch {
        return null;
      }
    })(),
  };
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  res.set('Content-Disposition', `attachment; filename="LiveStage-log-${stamp}.json"`);
  res.type('application/json').send(JSON.stringify(bundle, null, 2));
});
app.get('/api/owned-gemini/status',localOnly,(_req,res)=>res.json({...ownedGemini.status(),tts:{engine:config.tts.engine,voice:config.tts.voice,rate:config.tts.rate,pitch:config.tts.pitch,volume:config.tts.volume}}));
app.post('/api/owned-gemini/settings',localOnly,(req,res)=>res.json({ok:true,...ownedGemini.configure(req.body||{})}));
app.post('/api/owned-gemini/key',localOnly,(req,res)=>{try{res.json({ok:true,...ownedGemini.setKey(req.body?.key)});}catch(e){res.status(400).json({ok:false,error:e.message});}});
app.post('/api/owned-gemini/test',localOnly,async(req,res)=>res.json(await ownedGemini.reply('ผู้ทดสอบ',String(req.body?.text||'สวัสดี ช่วยทักทายสั้น ๆ หน่อย').slice(0,400))));
app.post('/api/account/login', localOnly, (_req, res) => res.status(410).json({ ok: false, error: 'รุ่น Local ไม่มีการสมัครหรือล็อกอินผู้ให้บริการ' }));
app.post('/api/account/refresh', localOnly, async (_req, res) => res.json(await license.refresh()));
app.post('/api/account/logout', localOnly, async (_req, res) => {
  await license.logout();
  res.json(license.state());
});
app.post('/api/account/free-theme', localOnly, async (req, res) => {
  const theme = String(req.body?.theme || '');
  if (!THEMES[theme]) return res.status(400).json({ ok: false, error: 'ไม่มีธีมนี้' });
  const r = await license.setFreeTheme(theme);
  if (r.ok && license.isAllowed(theme) && theme !== config.theme) applyTheme(theme);
  res.json({ ...r, account: license.state() });
});
// เม้นปลดล็อก: ขอรหัส / ตรวจว่าเม้นแล้วหรือยัง (เว็บ TubHool อ่านเม้นใต้โพสต์เพจ)
app.post('/api/account/comment-code', localOnly, async (req, res) => {
  const theme = String(req.body?.theme || '');
  if (!THEMES[theme]) return res.status(400).json({ ok: false, error: 'ไม่มีธีมนี้' });
  res.json({ ...(await license.commentCode(theme)), account: license.state() });
});
app.post('/api/account/comment-check', localOnly, async (req, res) => {
  const theme = String(req.body?.theme || '');
  if (!THEMES[theme]) return res.status(400).json({ ok: false, error: 'ไม่มีธีมนี้' });
  res.json({ ...(await license.commentCheck(theme, !!req.body?.now)), account: license.state() });
});


// สร้างเสียงพูด (mp3) — หน้าเวทีเรียกใช้ ถ้าล้มเหลวจะใช้เสียงเครื่องแทน
app.get('/api/tts', async (req, res) => {
  try {
    const buf = await tts.speak(req.query.text, { voice: req.query.voice, rate: req.query.rate, pitch: req.query.pitch, strict: req.query.strict === '1' });
    res.set('Content-Type', 'audio/mpeg');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(buf);
  } catch (e) {
    res.status(503).json({ error: String(e?.message || e).slice(0, 200) });
  }
});

const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 3e6 }); // รูปสินค้า CF ส่งผ่าน socket (ย่อแล้ว ~100-300 KB)
const games = createGames({
  io,
  log: (type, text) => log(type, text),
  dataDir: DATA_DIR,
  cfg: () => config.games,
  themeId: () => config.theme,
  themeAlias: (id) => THEMES[id]?.alias,
  audience: state.audience,
  save: () => saveConfig(),
  isLive: () => TEST_LIVE || state.status === 'connected',
  safeMode: () => !!config.safety.safeMode,
  // คำถามเกม: ตรวจด้วยตัวกรองเสมอ แม้แอดมินปิดตัวกรองคอมเมนต์ไว้
  // + คำต้องห้ามเฉพาะเกม (เข้มกว่าคอมเมนต์: หวย/ตัวเลขนำโชค/การเงิน/ชวนติดต่อ/ให้ส่งของขวัญ)
  onWin: (u, kind) => {
    extras.onWin(u, kind);
    play.onWin(u);
  },
  onTeamWin: (users) => extras.onTeamWin(users),
  isSafe: (text) => {
    if (strictSafety.check(text).hit) return false;
    const t = String(text || '').toLowerCase().replace(/\s+/g, '');
    return !GAME_STRICT.some((w) => t.includes(w));
  },
});

const FAKE_NAMES = ['น้องเมย์', 'พี่ต้น', 'ปลาทู', 'แม่ค้าออนไลน์', 'ก้อย_99', 'มะม่วง', 'ลูกชิ้น', 'ฟ้าใส', 'คุณชายไอติม', 'บอสใหญ่', 'แพรวา', 'โอ๊ตโอ๊ต', 'จูน', 'เต้ย', 'มิ้นท์', 'ข้าวหอม', 'นัท', 'ใบเตย', 'ตังเม', 'กาแฟเย็น'];
const FAKE_COMMENTS = {
  concert: ['เพลงเพราะมากกก', 'ขอเพลง ทะเลสีดำ', 'มาแล้วจ้า', 'เปิดไฟโทรศัพท์!!', 'ร้องอีกๆ', 'ซึ้งมาก 😭', 'อังกอร์!'],
  shrine: ['สาธุ 🙏', 'ขอพร ให้ครอบครัวมีความสุข', 'ขอให้การงานรุ่งเรือง', 'ขอพร สุขภาพแข็งแรง', 'มาไหว้ค่ะ', 'ขอให้ความรักสมหวัง'],
  krathong: ['สุขสันต์วันลอยกระทง', 'อธิษฐาน ขอให้ปีนี้ดีกว่าเดิม', 'กระทงสวยมาก', 'ขอให้สิ่งไม่ดีลอยไป', 'อธิษฐาน ขอให้เจอคนที่ใช่', 'พระจันทร์สวยจัง 🌕'],
};
// ธีมสัตว์เลี้ยง: ข้อความทดสอบ = ชื่ออาหาร/คำสั่งของธีมนั้น
for (const [id, m] of Object.entries(THEMES)) if (m.mookata) FAKE_COMMENTS[id] = [...m.hud.cmds.map((c) => c.c), 'หิวเลย', 'น่ากินมาก', 'ขอหมูเพิ่ม', 'ชนนน', 'อร่อยยย'];
for (const [id, m] of Object.entries(THEMES)) if (m.mg) FAKE_COMMENTS[id] = { boat: ['พาย', 'พาย', 'พายเลย', 'สู้ๆ', 'ทีมแดง'], fish: ['ตก', 'ตก', 'ตกปลา', 'สมุด', 'ได้ตัวใหญ่ไหม'], village: ['ปลูก', 'รดน้ำ', 'เก็บ', 'สวยจัง'], quiz: ['มะม่วง', 'ช้าง', 'ก๋วยเตี๋ยว', 'แมว', 'ไม่รู้'], kitchen: ['หมู', 'ไข่', 'พริก', 'เสิร์ฟ', 'ผัก'], castle: ['ยิง', 'ซ้าย', 'กลาง', 'ขวา', 'ยิง'] }[m.mg] || ['สวัสดี'];
for (const [id, m] of Object.entries(THEMES)) if (m.adv) FAKE_COMMENTS[id] = ['ตี', 'ตี', 'เวท', 'ฮีล', 'ตี', 'สู้ๆ', 'ลุยยย', 'เลเวล'];
for (const [id, m] of Object.entries(THEMES)) if (m.zoo) FAKE_COMMENTS[id] = [...m.hud.cmds.map((c) => c.c), 'น่ารักมาก', 'ตัวใหญ่จัง', 'มาเที่ยวแล้ว', 'ว้าวว'];
for (const [id, m] of Object.entries(THEMES)) if (m.dance) FAKE_COMMENTS[id] = [...m.hud.cmds.map((c) => c.c), 'สนุกมาก', 'ขอขึ้นเวทีด้วย', 'มาแล้วจ้า', 'ม่วน ๆ', 'สวยมาก'];
for (const [id, m] of Object.entries(THEMES)) if (m.picTheme && id === 'mosque') FAKE_COMMENTS[id] = [...m.hud.cmds.map((c) => c.c), 'อามีน', 'สลามทุกคนครับ', 'สวยงามมาก', 'มาชาอัลลอฮ์', 'สงบมากเลย'];
for (const [id, m] of Object.entries(THEMES)) if (m.picTheme && id === 'church') FAKE_COMMENTS[id] = [...m.hud.cmds.map((c) => c.c), 'อาเมน', 'ขอพระเจ้าอวยพร', 'สวยมากเลย', 'ขอบคุณพระเจ้า', 'สงบจัง'];
for (const [id, m] of Object.entries(THEMES)) if (m.picTheme && id === 'ubosot') FAKE_COMMENTS[id] = [...m.hud.cmds.map((c) => c.c), 'สาธุ', 'สาธุ ขอให้ร่ำรวย', 'ขอให้สุขภาพแข็งแรง', 'อนุโมทนาบุญค่ะ', 'สวยงามมาก'];
for (const [id, m] of Object.entries(THEMES)) if (m.picTheme && id === 'rodhae') FAKE_COMMENTS[id] = [...m.hud.cmds.map((c) => c.c), 'ม่วน', 'ม่วนๆ', 'เบสแน่นมาก', 'มันส์สุด', 'ขอเพลงแดนซ์', 'โยกกก']; // รถแห่แดนซ์
for (const [id, m] of Object.entries(THEMES)) if (m.picTheme && id === 'djclub') FAKE_COMMENTS[id] = ['ดรอป', 'ขอเพลง เพลงแดนซ์มันส์ ๆ', 'เบส', 'ยกมือ', 'เพลงนี้มันส์มาก', 'ดีเจเท่มาก', 'ขอเพลง Remix ลูกทุ่ง']; // ดีเจคลับ
for (const [id, m] of Object.entries(THEMES)) if (m.mg === 'pet') FAKE_COMMENTS[id] = ['ให้อาหาร', 'เล่น', 'ลูบหัว', 'น่ารักมาก', 'อาบน้ำ', 'เดินเล่น', 'โตไวๆนะ', 'ให้อาหาร']; // เลี้ยงน้องกวาง
for (const [id, m] of Object.entries(THEMES)) if (m.mg === 'brawl') FAKE_COMMENTS[id] = ['ตี', 'ตี', 'ต่อย', 'หลบ', 'ตี', 'เตะ', 'ฮ่าๆๆ', 'แรงมาก', 'ตี']; // ศึกหัวร้อน
for (const [id, m] of Object.entries(THEMES)) if (m.mg === 'escape') FAKE_COMMENTS[id] = ['1', '2', '1', 'ซ้าย', 'ขวา', '2', 'วิ่ง', 'วิ่ง', 'น่ากลัวมาก', 'ไปทางไหนดี']; // เกมหนีออกจากตึก
for (const [id, m] of Object.entries(THEMES)) if (m.molamStage) FAKE_COMMENTS[id] = [...m.hud.cmds.map((c) => c.c), 'กุหลาบ', 'ตี', 'ม่วนคัก', 'ร้องเพราะมาก', 'สวยมาก', 'โยกกก']; // เวทีหมอลำ 3D
for (const [id, m] of Object.entries(THEMES)) if (m.mg === 'climb') FAKE_COMMENTS[id] = ['ฮึบ', 'ฮึบ', 'สู้ๆ', 'น้องเด้งสู้ๆ', 'ตกอีกแล้ว 555', 'ใกล้ถึงแล้ว', 'ฮึบ']; // เกมปีน
FAKE_COMMENTS.templefair = ['สาธุ','ขอให้รวย','ไหว้พระ','เซียมซี','เดินเล่น','1','2','3','4'];
FAKE_COMMENTS.cemetery = ['จุดเทียน', 'จุดเทียน', 'ขนลุกเลย', 'กลัวมากกก', 'ใครอยู่ตรงนั้น', 'อย่าหันหลังนะ', 'หลอนจัด'];
FAKE_COMMENTS.ghostgate = ['จุดธูป', 'จุดธูป', 'ขนลุกเลย', 'กลัวมากกก', 'ประตูขยับ!', 'ได้ยินเสียงไหม', 'หลอนจัด'];
for (const [id, m] of Object.entries(THEMES)) if (m.pet) FAKE_COMMENTS[id] = [...m.hud.cmds.map((c) => c.c), ...m.hud.cmds.filter((c) => c.kind === 'feed').map((c) => c.c), 'น่ารักจัง', 'อยากเลี้ยงบ้าง'];
const fakeUser = (name) => {
  const n = name || FAKE_NAMES[Math.floor(Math.random() * FAKE_NAMES.length)];
  return { id: `test:${n}`, name: n, avatar: '' };
};

// ---------------------------------------------------------------- บัญชี TubHool: สรุปไลฟ์ + สำรองการตั้งค่า
// ไม่ส่ง: คีย์/รหัสใด ๆ, การตั้งค่าเฉพาะเครื่อง (lanAccess), ไอดีคนดู, ข้อความคอมเมนต์
const CLOUD_SKIP = ['signApiKey', 'lanAccess', 'cloud', 'playlist']; // playlist = ไฟล์เพลงในเครื่องนี้
const cloudState = { lastBackup: null, lastReport: null, lastError: null };
function exportSettings() {
  const c = structuredClone(config);
  for (const k of CLOUD_SKIP) delete c[k];
  return { app: 'live-stage', savedAt: Date.now(), config: c };
}
function reportBody(s) {
  const pick = (list, n, k) => (list || []).slice(0, n).map((x) => ({ name: x.name, [k]: x[k], ...(k === 'd' ? { c: x.c || 0 } : {}) }));
  return {
    id: s.id, theme: s.theme, startAt: s.startAt, endAt: s.endAt,
    peakViewers: s.peakViewers, likes: s.likes, comments: s.comments, follows: s.follows, shares: s.shares,
    diamonds: s.diamonds, giftCount: s.giftCount, missionsDone: s.missionsDone, chatterCount: s.chatterCount,
    newFollowers: s.follows, gifters: pick(s.gifters, 10, 'd'), winners: pick(s.winners, 5, 'w'), chatters: pick(s.chatters, 5, 'c'),
    timeline: s.timeline || [],
    highlights: (s.highlights || []).slice(0, 80).map((h) => ({ t: h.t, text: h.text })),
  };
}
async function cloudBackup() {
  const r = await license.putSettings(exportSettings());
  if (r.ok) cloudState.lastBackup = Date.now();
  else cloudState.lastError = r.error;
  io.to('admin').emit('cloud', cloudInfo());
  return r;
}
async function cloudRestore() {
  const r = await license.getSettings();
  if (!r.ok) return r;
  const c = r.data?.config;
  if (!c || typeof c !== 'object') return { ok: false, error: 'บัญชีนี้ยังไม่มีการตั้งค่าที่สำรองไว้' };
  // เก็บของเดิมไว้ก่อน เผื่ออยากย้อนกลับ
  try {
    const dir = path.join(DATA_DIR, 'backups');
    fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(CONFIG_FILE, path.join(dir, `config-before-restore-${Date.now()}.json`));
  } catch {}
  const merged = { ...c };
  for (const k of CLOUD_SKIP) merged[k] = config[k];
  if (!THEMES[merged.theme] || !license.isAllowed(merged.theme)) merged.theme = config.theme;
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2));
  config = loadConfig();
  saveConfig();
  io.emit('config', publicConfig());
  io.emit('snapshot', snapshot());
  log('system', '☁️ ดึงการตั้งค่าจากบัญชี TubHool แล้ว');
  return { ok: true, savedAt: r.data?.savedAt || null };
}
function cloudInfo() {
  return { desktop: license.desktop, signedIn: license.desktop && license.signedIn(), ...cloudState, reportsUrl: license.base + '/live-stage/reports' };
}
function cloudAfterLive(s) {
  if (!license.desktop || !license.signedIn() || !license.features().cloud) return;
  if (config.cloud?.reports !== false) {
    license.uploadReport(reportBody(s)).then((r) => {
      if (r.ok) {
        cloudState.lastReport = Date.now();
        log('system', '☁️ ส่งสรุปไลฟ์ขึ้นหน้า “รายงานไลฟ์” บน TubHool แล้ว');
      } else {
        cloudState.lastError = r.error;
        log('error', 'ส่งสรุปไลฟ์ไม่สำเร็จ: ' + r.error);
      }
      io.to('admin').emit('cloud', cloudInfo());
    });
  }
  if (config.cloud?.autoBackup !== false) cloudBackup();
}

// ---------------------------------------------------------------- ตัวละคร AI ตอบคอมเมนต์ (ผู้สนับสนุน)
// เลือกตอบบางคอมเมนต์ (คำถามได้ก่อน) ทีละอัน เว้นช่วงตามที่ตั้ง — ไม่ตอบระหว่างเกมคอมเมนต์ (คำตอบเกมไม่ใช่บทสนทนา)
const ai = { busy: false, last: 0, used: 0, lastError: '' };
const QUESTION = /[?？]|ไหม|มั้ย|อะไร|ยังไง|อย่างไร|ทำไม|เมื่อไร|เมื่อไหร่|ที่ไหน|กี่|เหรอ|หรอ|ใคร|ป่าว|รึเปล่า|หรือเปล่า/;
function aiMaybe(u, text) {
  const c = config.ai;
  if (!c?.enabled || ai.busy || !license.desktop || license.state().plan !== 'supporter' || !license.features().ai) return;
  if (state.status !== 'connected' && !TEST_LIVE && !String(u.id).startsWith('test:')) return;
  if (Date.now() - ai.last < c.gap * 1000) return;
  const t = String(text || '').trim();
  if (t.length < 2 || /^[\d\s.,!+-]+$/.test(t)) return;
  if (games.state().card?.status === 'running') return;
  const q = QUESTION.test(t);
  if (c.questionsOnly ? !q : !q && Math.random() > c.chance) return;
  ai.busy = true;
  ai.last = Date.now();
  license
    .aiReply({ comment: t, name: u.name, theme: config.theme, persona: { name: c.name || active().host || '', role: c.role, style: c.style } })
    .then((r) => {
      if (!r.ok) {
        ai.lastError = r.error;
        if (!/ครบโควตา|ยุ่ง/.test(r.error || '')) log('error', 'ตัวละคร AI: ' + r.error);
        return;
      }
      ai.lastError = '';
      if (!r.reply) return;
      ai.used += 1;
      io.emit('aiReply', { id: u.id, name: u.name, comment: t, text: r.reply, by: c.name || active().host || 'ตัวละคร' });
      log('chat', `🤖 ตอบ ${u.name}: ${r.reply}`);
    })
    .finally(() => (ai.busy = false));
}

// คำสั่งพิมพ์ / โซนกิจกรรม / เป้าหมาย / แต้มคนดู / ร้านแลกแต้ม
const play = createPlay({
  io,
  log: (type, text) => log(type, text),
  dataDir: DATA_DIR,
  totalLikes: () => state.totalLikes,
  theme: () => THEMES[config.theme],
  cfg: () => (license.features().shop ? config.play : { ...config.play, points: false, shop: false }),
  growCfg: () => config.petGrow,
  onGoal: (g) => {
    extras.highlight('goal', `🏁 เป้าหมาย${g.label}ครบ → ${g.reward}`);
    adventure.onGoal(g);
    minigames.onGoal(g);
  },
  onWear: (id, w) => {
    const a = state.audience.get(id);
    if (!a) return;
    a.wear = { ...w };
    if (w.color) a.color = w.color;
    else if (!w.color) a.color = colorFor(id);
  },
});

// ธีมปาร์ตี้ผจญภัย: เกมคุมฝั่งเซิร์ฟเวอร์ (เลเวลคนดูเก็บข้ามไลฟ์ data/adventure.json)
const adventure = createAdventure({
  io,
  log: (type, text) => log(type, text),
  dataDir: DATA_DIR,
  theme: () => THEMES[config.theme],
  addPoints: (u, n) => play.addPoints?.(u, n),
  topId: () => topList()[0]?.id || null,
  crowd: () => state.audience.size,
  audienceIds: () => [...state.audience.keys()].slice(-120),
});
// มินิเกม 6 ธีม (แข่งเรือ ตกปลา หมู่บ้าน ทายภาพ ครัว ป้องกันปราสาท) — ข้อมูลข้ามไลฟ์ data/minigames.json
const minigames = createMiniGames({
  // (เกมถัดไปของระบบเปลี่ยนเกมอัตโนมัติ ตั้งด้านล่างด้วย setRotation)
  io,
  log: (type, text) => log(type, text),
  dataDir: DATA_DIR,
  theme: () => THEMES[config.theme],
  addPoints: (u, n) => play.addPoints?.(u, n),
  topId: () => topList()[0]?.id || null,
  crowd: () => state.audience.size,
  audienceIds: () => [...state.audience.keys()].slice(-120),
  member: (id) => state.audience.get(id) || null,
});
minigames.setRotation(() => rotInfo());

// วาเลนไทน์: สุ่มจับคู่คนที่พิมพ์ "จับคู่" ทุก ~1 นาที (มีคนลงชื่ออย่างน้อย 2 คน) → คู่รักประจำไลฟ์
const couplePool = new Map();
let coupleNow = null;
let coupleLast = 0;
setInterval(() => {
  if (config.theme !== 'valentine') return;
  const now = Date.now();
  for (const [id, p] of couplePool) if (now - p.at > 10 * 60_000 || !state.audience.has(id)) couplePool.delete(id);
  if (couplePool.size < 2 || now - coupleLast < 60_000) return;
  const list = [...couplePool.values()];
  const a = list.splice(Math.floor(Math.random() * list.length), 1)[0];
  const b = list[Math.floor(Math.random() * list.length)];
  couplePool.delete(a.id);
  couplePool.delete(b.id);
  coupleLast = now;
  coupleNow = { a: { id: a.id, name: a.name }, b: { id: b.id, name: b.name }, at: now };
  io.emit('couple', coupleNow);
  io.emit('effect', { effect: 'g7', user: null, label: `${a.name} 💘 ${b.name}`, count: 1 });
  log('game', `💘 คู่รักประจำไลฟ์: ${a.name} กับ ${b.name}`);
  extras.highlight('couple', `💘 คู่รักประจำไลฟ์: ${a.name} กับ ${b.name}`);
}, 4000);

// ฉากรอเริ่ม / พักเบรก (คนไลฟ์กดจากโปรแกรม) — คอมเมนต์ เกม ของขวัญ ยังทำงานตามปกติ
let stageMode = null; // { kind: 'soon'|'brb', until, title, sub, early: [{id,name}] }
const modePublic = () => (stageMode ? { kind: stageMode.kind, until: stageMode.until, now: Date.now(), title: stageMode.title, sub: stageMode.sub, early: stageMode.early.slice(0, 12).map((e) => e.name), earlyCount: stageMode.early.length } : null);

// ขายของ (CF): สินค้า + ออเดอร์จากคอมเมนต์
// ขายของ CF: เฉพาะผู้สนับสนุน (โหมดเจ้าของระบบ/ไม่ใช่โปรแกรมติดตั้ง = ใช้ได้)
const cf = createCF({ io, log: (type, text) => log(type, text), dataDir: DATA_DIR, onOrder: (o) => extras.heartbeat(), allowed: () => license.allowedThemes() === null });

// บัญชี TubHool (โปรแกรมติดตั้ง): ธีมที่ใช้ได้ตามแพ็กเกจ
const license = createLicense({
  themeFeature: (id) => THEMES[id]?.feature, // ธีมเกม = 'games' (ดู themes.js)
  dataDir: DATA_DIR,
  port: PORT,
  log: (type, text) => log(type, text),
  isLive: () => state.status === 'connected',
  onChange: (st) => {
    io.emit('account', st);
    io.emit('config', publicConfig());
    enforceTheme();
    cf.refresh();
  },
});
// Separate user-owned Gemini service; original license and original AI gates remain intact.
const ownedGemini = require('./owned-gemini')({dir:DATA_DIR,isSafe:t=>!strictSafety.check(t).hit,gameRunning:()=>games.state().card?.status==='running',liveOrTest:u=>state.status==='connected'||String(u.id).startsWith('test:'),emit:d=>io.emit('aiReply',d)});
// ---------------------------------------------------------------- เปลี่ยนเกมอัตโนมัติ (นับถอยหลังบนหน้าเวที 2 นาที / 30 วิ / 10 วิ)
let rotAt = 0;
const rotWarn = new Set();
function rotNext() {
  const r = config.mgRotate;
  if (!r?.on || r.list.length < 2 || !r.list.includes(config.theme)) return null;
  const ok = r.list.filter((id) => !license.desktop || license.isAllowed(id));
  if (ok.length < 2) return null;
  return ok[(ok.indexOf(config.theme) + 1) % ok.length] || ok[0];
}
function rotInfo() {
  const nx = rotNext();
  if (!nx || !rotAt) return null;
  return { id: nx, name: THEMES[nx].name, icon: THEMES[nx].icon, left: Math.max(0, Math.round((rotAt - Date.now()) / 1000)) };
}
setInterval(() => {
  const nx = rotNext();
  if (!nx) {
    rotAt = 0;
    return;
  }
  const t = Date.now();
  if (!rotAt) {
    rotAt = t + config.mgRotate.minutes * 60_000;
    rotWarn.clear();
    return;
  }
  const left = rotAt - t;
  for (const w of [120_000, 30_000, 10_000]) {
    if (left <= w && !rotWarn.has(w)) {
      rotWarn.add(w);
      io.emit('themeEvent', { type: 'mgNext', ...rotInfo() });
    }
  }
  if (left <= 0) {
    rotAt = 0;
    log('system', `🔁 เปลี่ยนเกมอัตโนมัติ → ${THEMES[nx].icon} ${THEMES[nx].name}`);
    applyTheme(nx);
  }
}, 1000);
function applyTheme(id) {
  rotAt = 0;
  config.theme = id;
  saveConfig();
  state.requests = [];
  state.hype = 0;
  log('system', `เปลี่ยนธีมเป็น ${THEMES[id].icon} ${THEMES[id].name}`);
  io.emit('snapshot', snapshot());
  play.reset(); // เป้าหมาย/โซนเป็นของธีม เริ่มนับใหม่
  adventure.reset();
  minigames.reset();
}
// ธีมที่ใช้อยู่ไม่อยู่ในแพ็กเกจ (เช่น ผู้สนับสนุนหมดอายุ) → เปลี่ยนเป็นธีมที่ใช้ได้ แต่ไม่เปลี่ยนกลางไลฟ์
function enforceTheme() {
  if (license.state().mode === 'local' && !license.isAllowed(config.theme)) { applyTheme('concert'); return; }
  if (!license.desktop || license.isAllowed(config.theme) || state.status === 'connected') return;
  // ผู้สนับสนุน (ทุกธีม) ที่ค้างอยู่ในธีมที่หลังบ้านปิดไว้ (เช่น ธีมเกม) → กลับไปธีมแรกที่ใช้ได้
  const pick = (license.allowedThemes() || Object.keys(THEMES)).find((id) => THEMES[id] && license.isAllowed(id));
  if (pick) applyTheme(pick);
}

const extras = createExtras({
  io,
  log: (type, text) => log(type, text),
  dataDir: DATA_DIR,
  config: () => config,
  save: () => saveConfig(),
  status: () => state.status,
  theme: () => theme(),
  reconnect: () => wantConnected && connectTikTok().catch(() => {}),
  onFinished: (s) => cloudAfterLive(s),
});
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    try {
      extras.flush();
      cf.flush();
      play.flush();
      adventure.flush();
      minigames.flush();
    } catch {}
    process.exit(0);
  });
}

let testCrowdGeneration=0,testCrowdSerial=0;
const THEME_FIELDS = ['fair','title', 'subtitle', 'requestCommand', 'gifts', 'nowPlaying', 'artist', 'bpm', 'showPerformer', 'host'];

io.on('connection', (socket) => {
  socket.emit('snapshot', snapshot());
  socket.emit('music:state', musicState);
  // ---- เพลงในไลฟ์: หน้าเวทีที่มีเสียง (ไม่ silent) ประกาศตัว → ส่งคำสั่งไปที่ตัวล่าสุดตัวเดียว (กันเพลงเล่นซ้อน 2 ที่)
  socket.on('music:hello', () => {
    musicPlayers.add(socket.id);
    musicPlayer = socket.id;
  });
  socket.on('music:status', (st) => {
    if (socket.id !== musicPlayer || !st) return;
    const it = config.playlist.items.find((x) => x.id === st.id);
    Object.assign(musicState, {
      id: it ? it.id : null, title: it ? it.title : '', playing: !!(it && st.playing),
      pos: Math.max(0, Number(st.pos) || 0), dur: Math.max(0, Number(st.dur) || 0), blocked: !!st.blocked, at: Date.now(),
    });
    io.emit('music:state', musicState);
  });
  socket.on('music:cmd', (c) => {
    if (!c || typeof c.action !== 'string' || !musicPlayer) return;
    io.to(musicPlayer).emit('music:cmd', { action: c.action.slice(0, 10), id: c.id ? String(c.id).slice(0, 40) : undefined, pos: Number(c.pos) || 0 });
  });
  socket.on('disconnect', () => {
    if (!musicPlayers.delete(socket.id) || musicPlayer !== socket.id) return;
    musicPlayer = [...musicPlayers].pop() || null;
    if (!musicPlayer) {
      Object.assign(musicState, { playing: false, at: 0 });
      io.emit('music:state', musicState);
    }
  });
  socket.emit('logs', state.log.slice(0, 150));
  extras.register(socket);
  cf.register(socket);
  socket.emit('stageMode', modePublic());
  socket.emit('shareGoal', sharePublic());
  if (coupleNow && config.theme === 'valentine' && Date.now() - coupleNow.at < 30 * 60_000) socket.emit('couple', coupleNow);
  socket.on('share:save', (v, ack) => {
    config.shareGoal = sanitizeShare(v || {});
    saveConfig();
    io.emit('shareGoal', sharePublic());
    ack?.({ ok: true, shareGoal: config.shareGoal });
  });
  socket.on('share:reset', () => resetShareGoal());
  socket.on('mode:set', (v = {}, ack) => {
    const kind = v.kind === 'brb' ? 'brb' : 'soon';
    const min = Math.max(0, Math.min(120, Number(v.minutes) || 0));
    const clean = (x, n) => String(x ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
    stageMode = { kind, until: min ? Date.now() + min * 60000 : 0, title: clean(v.title, 60), sub: clean(v.sub, 80), early: stageMode?.kind === kind ? stageMode.early : [] };
    io.emit('stageMode', modePublic());
    log('system', kind === 'soon' ? `⏳ ฉากรอเริ่มไลฟ์ (${min} นาที)` : `☕ พักเบรก (${min} นาที)`);
    ack?.({ ok: true, mode: modePublic() });
  });
  socket.on('mode:clear', (_, ack) => {
    stageMode = null;
    io.emit('stageMode', null);
    log('system', '▶ กลับเข้าไลฟ์ (ปิดฉากรอ/พัก)');
    ack?.({ ok: true });
  });
  play.register(socket);
  adventure.register(socket);
  socket.on('mg:rotateNow', (_, ack) => {
    const nx = rotNext();
    if (!nx) return ack?.({ ok: false, error: 'เปิดเปลี่ยนเกมอัตโนมัติ และเลือกธีมที่อยู่ในรายการก่อน' });
    rotAt = Date.now() + 11_000;
    rotWarn.clear();
    rotWarn.add(120_000);
    rotWarn.add(30_000);
    ack?.({ ok: true });
  });
  minigames.register(socket);
  socket.on('cloud:info', (_, ack) => ack?.(cloudInfo()));
  socket.on('ai:info', (_, ack) => ack?.({ desktop: license.desktop, plan: license.state().plan, used: ai.used, lastError: ai.lastError }));
  socket.on('cloud:backup', async (_, ack) => ack?.({ ...(await cloudBackup()), info: cloudInfo() }));
  socket.on('cloud:restore', async (_, ack) => ack?.({ ...(await cloudRestore()), info: cloudInfo() }));
  socket.emit('account', license.state());

  // ---------------- ความปลอดภัย (เฉพาะหน้าแอดมิน)
  const safetyFull = () => ({ cfg: config.safety, defaults: DEFAULT_WORDS, labels: CATEGORY_LABEL, filtered: state.filtered.slice(0, 100), recent: state.modRecent });
  socket.on('admin:hello', () => {
    socket.join('admin');
    socket.emit('safetyFull', safetyFull());
  });
  socket.on('safety:save', (patch, ack) => {
    const cur = config.safety;
    const next = { ...cur };
    for (const k of ['filter', 'safeMode', 'links', 'phones', 'contacts']) if (patch && k in patch) next[k] = !!patch[k];
    if (patch?.mode) next.mode = patch.mode === 'mask' ? 'mask' : 'hide';
    if (patch?.cats) next.cats = { ...cur.cats, ...patch.cats };
    if (patch?.words) next.words = Object.fromEntries(Object.entries(patch.words).map(([k, v]) => [k, String(v || '').slice(0, 6000)]));
    if (patch && 'allow' in patch) next.allow = String(patch.allow || '').slice(0, 2000);
    config.safety = next;
    flaggedNames.clear();
    saveConfig();
    io.emit('config', publicConfig());
    io.to('admin').emit('safetyFull', safetyFull());
    log('system', `🛡️ บันทึกการตั้งค่าความปลอดภัย${next.safeMode ? ' (โหมดปลอดภัย: เปิด)' : ''}`);
    ack?.({ ok: true });
  });
  socket.on('safety:check', (text, ack) => ack?.(safety.check(text)));
  socket.on('safety:hide', (id) => io.emit('hideBubble', { id }));
  socket.on('safety:block', ({ id, name } = {}) => {
    if (!id || safety.isBlocked(id)) return;
    config.safety.blocked = [...(config.safety.blocked || []), { id, name: String(name || id).slice(0, 40), at: Date.now() }];
    saveConfig();
    if (state.audience.delete(id)) io.emit('leave', { id });
    io.emit('hideBubble', { id });
    const before = state.requests.length;
    state.requests = state.requests.filter((r) => r.uid !== id);
    if (state.requests.length !== before) io.emit('requests', state.requests);
    const lb = state.leaderboard.get(id);
    if (lb) {
      lb.name = 'ผู้ชม';
      lb.avatar = '';
      io.emit('top', topList());
    }
    log('system', `🚫 บล็อก ${name || id} — ข้อความจะไม่ขึ้นหน้าเวที`);
    io.to('admin').emit('safetyFull', safetyFull());
  });
  socket.on('safety:unblock', (id) => {
    config.safety.blocked = (config.safety.blocked || []).filter((b) => b.id !== id);
    saveConfig();
    log('system', `ปลดบล็อก ${id}`);
    io.to('admin').emit('safetyFull', safetyFull());
  });
  games.register(socket);

  // ค่าทั่วไป (ไม่ขึ้นกับธีม)
  socket.on('admin:saveConfig', (patch, ack) => {
    const prevGames = config.games;
    const prevPlaylist = config.playlist;
    const allowed = ['platform', 'youtube', 'username', 'signApiKey', 'maxAudience', 'idleMinutes', 'hypeGoal', 'tts', 'sound', 'music', 'safeArea', 'avatar', 'bustle', 'pfp', 'games', 'hints', 'watchdog', 'perf', 'lanAccess', 'play', 'cloud', 'ai', 'zoom'];
    for (const k of allowed) if (patch && k in patch) config[k] = patch[k];
    if (patch && 'username' in patch) config.username = cleanUsername(config.username);
    if (patch && 'platform' in patch) config.platform = patch.platform === 'youtube' ? 'youtube' : 'tiktok';
    if (patch && 'youtube' in patch) config.youtube = String(patch.youtube || '').trim().slice(0, 200);
    // games: รวมกับของเดิม (ไม่ให้ตั้งค่าเซียมซี/เลเวลไปลบค่าเกมอัตโนมัติ)
    if (patch && 'games' in patch) config.games = { ...prevGames, ...(patch.games || {}), auto: prevGames.auto, custom: prevGames.custom };
    config.bustle = Math.min(3, Math.max(0, Math.round(Number(config.bustle ?? 2))));
    if (!['off', 'small', 'big', 'bigname'].includes(config.pfp)) config.pfp = 'small';
    if (patch && 'playlist' in patch) config.playlist = sanitizePlaylist(patch.playlist, prevPlaylist);
    if (patch && 'watchdog' in patch) {
      const w = patch.watchdog || {};
      config.watchdog = { enabled: w.enabled !== false, minutes: Math.min(10, Math.max(1, Math.round(Number(w.minutes) || 2))), autoFix: w.autoFix !== false };
    }
    if (patch && 'perf' in patch) config.perf = { auto: patch.perf?.auto !== false };
    if (patch && 'ai' in patch) config.ai = sanitizeAi(patch.ai);
    if (patch && 'cloud' in patch) config.cloud = { reports: patch.cloud?.reports !== false, autoBackup: patch.cloud?.autoBackup !== false };
    if (patch && 'lanAccess' in patch) config.lanAccess = !!patch.lanAccess;
    if (patch && 'play' in patch) config.play = createPlay.sanitizePlay(patch.play);
    if (patch && 'mgRotate' in patch) {
  // ห้องควบคุมไลฟ์: ปุ่ม "ลองซูม" → หน้าเวทีซูมหาคนดูที่อยู่ในฉากหนึ่งคน (ไม่มีของขวัญจริง)
  socket.on('zoom:test', () => io.emit('zoomTest', {}));
      config.mgRotate = sanitizeRotate(patch.mgRotate);
      rotAt = 0;
    }
    if (patch && 'petGrow' in patch) {
      config.petGrow = createPlay.sanitizeGrow(patch.petGrow);
      play.refreshPet();
    }
    if (patch && 'tts' in patch) {
      const t = { ...DEFAULT_CONFIG.tts, ...(patch.tts || {}) };
      t.engine = t.engine === 'browser' ? 'browser' : 'edge';
      t.rate = Math.min(1.6, Math.max(0.6, Number(t.rate) || 1));
      t.pitch = Math.min(30, Math.max(-30, Number(t.pitch) || 0));
      t.volume = Math.min(1, Math.max(0, Number(t.volume ?? 0.9)));
      t.minDiamonds = Math.max(0, Number(t.minDiamonds) || 0);
      t.giftNames = String(t.giftNames || '').slice(0, 4000);
      config.tts = t;
    }
    if (patch && 'avatar' in patch) {
    if (patch && 'zoom' in patch) config.zoom = sanitizeZoom(patch.zoom);
      const a = { ...DEFAULT_CONFIG.avatar, ...(patch.avatar || {}) };
      const n = (v, lo, hi, d) => Math.min(hi, Math.max(lo, Math.round(Number(v) || d)));
      const map = {};
      for (const [k, v] of Object.entries(a.map || {})) if (/^[a-zA-Z]{2,16}$/.test(k)) map[k] = String(v || '').slice(0, 80);
      const okModel = (m) => AVATAR_MODELS[m] || m === 'custom' || m === 'auto';
      const layouts = { ...(config.avatar.layouts || {}) };
      for (const [t, l] of Object.entries(a.layouts || {})) {
        if (THEMES[t.replace(/_2d$/, '').replace(/_half$/, '')] && l) layouts[t] = { x: n(l.x, 0, 1080, 540), y: n(l.y, 300, 2600, 1700), h: n(l.h, 200, 2400, 780) };
      }
      const themeModels = {};
      for (const [t, m] of Object.entries(a.themeModels || {})) if (THEMES[t] && okModel(m) && m !== 'auto') themeModels[t] = m;
      config.avatar = {
        enabled: !!a.enabled, model: okModel(a.model) ? a.model : 'auto',
        x: n(a.x, 0, 1080, 540), y: n(a.y, 300, 2600, 1700), h: n(a.h, 200, 2400, 780), react: a.react !== false, map,
        outfit: a.outfit !== false, framing: a.framing === 'half' ? 'half' : 'full', layouts, themeModels,
        outline: Math.min(3, Math.max(0, Math.round(Number(a.outline ?? 1)))), front: !!a.front,
        aa: ['8x', '4x', 'lite'].includes(a.aa) ? a.aa : '8x',
        style: a.style === '2d' ? '2d' : '3d',
        bubble: a.bubble !== false, wander: a.wander !== false,
      };
    }
    if (patch && 'safeArea' in patch) {
      const a = patch.safeArea || {};
      // user: ตั้งเองแล้ว (ไม่ใช่ค่าเริ่มต้นที่บันทึกติดมาจากเวอร์ชันก่อน) — ค่าที่ตั้งเองจะไม่ถูกค่าเริ่มต้นใหม่ทับ
      config.safeArea = { enabled: !!a.enabled, level: ['low', 'mid', 'high'].includes(a.level) ? a.level : 'mid', user: true };
    }
    if (patch && 'music' in patch) {
      const m = { ...DEFAULT_CONFIG.music, ...(patch.music || {}) };
      config.music = {
        enabled: !!m.enabled,
        volume: Math.min(1, Math.max(0, Number(m.volume) || 0)),
        style: /^[a-z]{2,20}$/.test(String(m.style)) ? String(m.style) : 'auto',
        duck: !!m.duck,
      };
    }
    if (patch && 'hints' in patch) {
      const h = { ...DEFAULT_CONFIG.hints, ...(patch.hints || {}) };
      h.custom = (Array.isArray(h.custom) ? h.custom : []).map((x) => String(x).trim().slice(0, 60)).filter(Boolean).slice(0, 10);
      h.seconds = Math.min(30, Math.max(2, Number(h.seconds) || 4));
      config.hints = h;
    }
    config.maxAudience = Math.min(80, Math.max(5, Number(config.maxAudience) || 40));
    config.idleMinutes = Math.min(120, Math.max(1, Number(config.idleMinutes) || 10));
    config.hypeGoal = Math.max(100, Number(config.hypeGoal) || 3000);
    saveConfig();
    io.emit('config', publicConfig());
    ack?.({ ok: true });
  });

  // ค่าของธีม (ชื่อไลฟ์, ของขวัญ, ฯลฯ) — ถ้าไม่ระบุ id = ธีมที่ใช้อยู่
  socket.on('admin:saveTheme', ({ id, patch } = {}, ack) => {
    const tid = THEMES[id] ? id : config.theme;
    const meta = THEMES[tid];
    const cur = { ...(config.themes[tid] || {}) };
    for (const k of THEME_FIELDS) if (patch && k in patch) cur[k] = patch[k];
    if(tid==='templefair'&&cur.fair)cur.fair={showSigns:cur.fair.showSigns!==false,ambient:cur.fair.ambient!==false,sound:cur.fair.sound!==false,paused:cur.fair.paused===true,music:{enabled:cur.fair.music?.enabled===true,id:String(cur.fair.music?.id||'').slice(0,80),loop:cur.fair.music?.loop!==false}};
    if ('bpm' in cur) cur.bpm = Math.min(200, Math.max(40, Number(cur.bpm) || 112));
    if (cur.gifts) {
      cur.gifts = cur.gifts
        .filter((g) => g && g.name)
        .map((g) => ({ name: String(g.name).trim(), diamonds: Number(g.diamonds) || 0, effect: meta.effects[g.effect] ? g.effect : Object.keys(meta.effects)[0] }));
    }
    if(tid==='templefair'&&cur.gifts)cur.gifts=require('./fair-gifts').normalize(cur.gifts);
    config.themes[tid] = cur;
    saveConfig();
    io.emit('config', publicConfig());
    ack?.({ ok: true });
  });

  socket.on('admin:resetTheme', (id, ack) => {
    if (THEMES[id]) delete config.themes[id];
    saveConfig();
    io.emit('config', publicConfig());
    ack?.({ ok: true });
  });

  socket.on('admin:setTheme', (id, ack) => {
    if (!THEMES[id] || id === config.theme) return ack?.({ ok: false });
    if (!license.isAllowed(id)) return ack?.({ ok: false, locked: true, error: THEMES[id]?.feature && !license.features()[THEMES[id].feature] ? 'ธีมนี้ยังไม่เปิดให้ใช้' : 'ธีมนี้สำหรับผู้สนับสนุน TubHool' });
    applyTheme(id);
    ack?.({ ok: true });
  });

  // ---------------- ธีมที่สร้างเอง
  socket.on('custom:get', (_, ack) =>
    ack?.({ spec: THEMES.custom.spec, allowed: license.isAllowed('custom'), bases: Object.keys(HUD_THEMES).map((id) => ({ id, name: HUD_THEMES[id].name, icon: HUD_THEMES[id].icon })), library: customLibrary() }),
  );
  socket.on('custom:base', (id, ack) => ack?.({ spec: sanitizeCustom({ base: id }) }));
  socket.on('custom:save', (spec, ack) => {
    if (!license.features().custom) return ack?.({ ok: false, error: 'เมนูสร้างธีมเองถูกปิดอยู่' });
    THEMES.custom = buildCustom(spec);
    config.customTheme = THEMES.custom.spec;
    saveConfig();
    io.emit('config', publicConfig());
    if (config.theme === 'custom') {
      play.reset();
      io.emit('stage:reload');
    }
    log('system', `🎨 บันทึกธีมที่สร้างเอง “${THEMES.custom.name}”`);
    ack?.({ ok: true, spec: THEMES.custom.spec });
  });

  socket.on('admin:ttsTest', (text) => io.emit('ttsTest', { text: String(text || '').slice(0, 200) }));
  // ตัวละคร: ปุ่มทดสอบท่า / ระดับเสียงไมค์จากหลังบ้าน (ปากขยับตามเสียงคนไลฟ์)
  socket.on('avatar:pose', (name) => io.emit('avatar:pose', String(name || '').slice(0, 20)));
  socket.on('avatar:mouth', (v) => socket.broadcast.volatile.emit('avatar:mouth', Math.max(0, Math.min(1, Number(v) || 0))));

  socket.on('admin:connect', (_, ack) => {
    if (license.desktop && !license.state().signedIn) return ack?.({ ok: false, error: 'กรุณาเข้าสู่ระบบ TubHool ก่อน' });
    if (!license.isAllowed(config.theme)) return ack?.({ ok: false, error: 'เลือกธีมฟรีของคุณก่อน (เมนู "ธีม")' });
    setAutoConnect(true);
    connectTikTok().catch((e) => log('error', String(e?.message || e)));
    ack?.({ ok: true });
  });
  socket.on('admin:disconnect', async (_, ack) => {
    setAutoConnect(false);
    await disconnectTikTok();
    log('system', 'ตัดการเชื่อมต่อแล้ว');
    ack?.({ ok: true });
  });

  // โหมดทดสอบ
  // ระหว่างไลฟ์จริง ห้ามทดสอบ: ของขวัญ/เพชร/คอมเมนต์ปลอมจะขึ้นในไลฟ์ให้คนดูเห็น (TikTok อาจมองว่าหลอกลวง)
  const testOk = () => {
    if (!(wantConnected || state.status === 'connected')) return true;
    socket.emit('test:blocked');
    return false;
  };
  socket.on('test:chat', ({ name, text } = {}) => {
    if (!testOk()) return;
    const list = FAKE_COMMENTS[config.theme] || FAKE_COMMENTS.concert;
    handleChat(fakeUser(name), text || list[Math.floor(Math.random() * list.length)]);
  });
  socket.on('test:gift', ({ name, gift, count } = {},ack) => {
    if (!testOk()) return ack?.({ok:false,error:'ปิดการจำลองระหว่างไลฟ์จริง'});
    const g = active().gifts.find(x=>x.name===gift);
    if(!g)return ack?.({ok:false,error:'ไม่พบของขวัญนี้ในธีมปัจจุบัน กรุณาโหลดหน้าทดสอบใหม่'});
    if(config.theme==='templefair'&&!theme().effects[g.effect]?.activity)return ack?.({ok:false,error:'ของขวัญนี้ยังไม่ได้ผูกกิจกรรม กรุณาตั้งค่าในของขวัญ'});
    handleGift(fakeUser(name), {name:g.name,diamonds:g.diamonds,count:count||1});
    ack?.({ok:true,activity:theme().effects[g.effect]?.activity,activityLabel:theme().effects[g.effect]?.label});
  });
  socket.on('test:join', ({ name } = {}) => testOk() && handleJoin(fakeUser(name)));
  socket.on('test:like', ({ name,count } = {},ack) => {if(!testOk())return ack?.({ok:false,error:'ปิดการจำลองระหว่างไลฟ์จริง'});const n=Number.isSafeInteger(count)&&count>0&&count<=1000?count:15;handleLike(fakeUser(name),n,0);ack?.({ok:true,likes:state.totalLikes});});
  socket.on('test:follow', ({ name } = {}) => testOk() && handleSocial(fakeUser(name), 'follow'));
  socket.on('test:share', ({ name } = {}) => testOk() && handleSocial(fakeUser(name), 'share'));
  socket.on('test:crowd', (_payload, ack) => {
    if (!testOk()) return ack?.({ok:false,error:'ปิดการจำลองระหว่างไลฟ์จริง'});
    const generation=testCrowdGeneration, run=++testCrowdSerial;
    const names=config.theme==='templefair'?Array.from({length:10},(_,i)=>'ผู้ชมจำลอง '+run+'-'+(i+1)):[...FAKE_NAMES].sort(()=>Math.random()-.5).slice(0,10);
    names.forEach((name,i)=>setTimeout(()=>{if(generation!==testCrowdGeneration||wantConnected||state.status==='connected')return;handleJoin({...fakeUser(name),character:i%4});},i*150));
    ack?.({ok:true,count:names.length});
  });
  const resetPreview=()=>{if(!testOk())return{ok:false,error:'ปิดการล้างฉากทดสอบระหว่างไลฟ์จริง'};
    const result=config.theme==='templefair'?fairBridge.resetTest():{ok:true};if(!result.ok)return result;testCrowdGeneration++;
    state.audience.clear();state.leaderboard.clear();state.requests=[];state.hype=0;resetCounters();resetShareGoal();
    if(result.snapshot){fairLastSession=result.snapshot.sessionId;io.emit('themeEvent',{type:'fairSession',snapshot:{...result.snapshot,activeViewers:[]}});}
    io.emit('snapshot',snapshot());log('system','ล้างฉากทดสอบและคิวกิจกรรมแล้ว');return{ok:true,sessionId:result.snapshot?.sessionId};
  };
  socket.on('test:reset',(_payload,ack)=>{const result=resetPreview();ack?.(result);});
  socket.on('test:fairActivities',(_payload,ack)=>{if(!testOk())return ack?.({ok:false,error:'ปิดการจำลองระหว่างไลฟ์จริง'});if(config.theme!=='templefair')return ack?.({ok:false,error:'กิจกรรมนี้สำหรับธีมงานวัด'});const run=++testCrowdSerial;const activities=['sparklers','water','lantern','wheel','dance','sangha'];for(const [i,activity]of activities.entries()){const gift=(active().gifts||[]).find(g=>theme().effects[g.effect]?.activity===activity);if(gift)handleGift(fakeUser('กิจกรรมทดลอง '+run+'-'+(i+1)),{...gift,count:1});}return ack?.({ok:true});});
  socket.on('admin:clearAudience',(_payload,ack)=>{if(config.theme==='templefair'){const result=resetPreview();ack?.(result);return;}state.audience.clear();io.emit('snapshot',snapshot());log('system','ให้ทุกคนออกจากฉาก');ack?.({ok:true});});

  socket.on('admin:clearTop', () => {
    state.leaderboard.clear();
    for (const a of state.audience.values()) a.vip = false;
    io.emit('snapshot', snapshot());
    log('system', 'ล้าง Top 5');
  });
  socket.on('admin:requestDone', (id) => {
    state.requests = state.requests.filter((s) => s.id !== id);
    io.emit('requests', state.requests);
  });
  socket.on('admin:clearRequests', () => {
    state.requests = [];
    io.emit('requests', state.requests);
  });
  socket.on('admin:effect', (effect) => {
    if(config.theme==='templefair'){if(!testOk())return;const activity=THEMES.templefair.effects[effect]?.activity;if(activity)fairBridge.push('gift',{id:'fair-operator',name:'ผู้จัดงานทดลอง'},{giftId:'live:'+activity,quantity:1});return;}
    const th = theme();
    const e = th.effects[effect];
    if (!e) return;
    io.emit('effect', { effect, user: null, label: effect === th.bigEffect ? '' : e.label, count: 1 });
    // ธีมเกม: ของขวัญทำงานในตัวเกมฝั่งเซิร์ฟเวอร์ (หน้าเวทีแค่วาดตาม) → ปุ่มเอฟเฟกต์ = ผู้จัดไลฟ์ส่งของขวัญชิ้นนั้นเอง
    if (th.mg || th.adv) {
      const g = (active().gifts || []).find((x) => x.effect === effect);
      const diamonds = Number(g?.diamonds) || 1;
      const sys = { id: 'admin', name: 'ผู้จัดไลฟ์' };
      adventure.onGift(sys, diamonds, { diamonds, count: 1, effect });
      minigames.onGift(sys, diamonds, { diamonds, count: 1, effect });
    }
  });
  socket.on('admin:resetHype', () => {
    state.hype = 0;
    io.emit('hype', { hype: 0, goal: config.hypeGoal });
  });
});

// โปรแกรมติดตั้งกำลังปิด → บอกหน้าเวที (ใน LIVE Studio) ให้ขึ้นจอ "ปิดอยู่" และหยุดเสียง
global.__liveStageShutdown = () => io.emit('stage:shutdown');
const HOST = DESKTOP && !config.lanAccess ? '127.0.0.1' : '0.0.0.0';
// เปิดพอร์ตไม่ได้ (เช่น Windows จองพอร์ตไว้ → EACCES): โปรแกรมติดตั้งแจ้งผู้ใช้เอง ไม่เด้งหน้าต่าง error ของระบบ
server.on('error', (e) => {
  if (global.__liveStageListenError && (e.code === 'EACCES' || e.code === 'EADDRINUSE')) return global.__liveStageListenError(e);
  throw e;
});
server.listen(PORT, HOST, () => {
  if (config.tts?.engine !== 'browser') tts.warmup();
  loadGiftList(); // รูปของขวัญจริงพร้อมตั้งแต่ก่อนไลฟ์ครั้งแรก
  if (config.autoConnect && config.username) {
    log('system', 'เซิร์ฟเวอร์เริ่มใหม่ — กำลังต่อไลฟ์กลับให้อัตโนมัติ');
    connectTikTok().catch((e) => log('error', String(e?.message || e)));
  }
  console.log(`\n  🎤 TikTok Live Stage  (ธีม: ${theme().icon} ${theme().name})`);
  console.log(`  แผงควบคุม : http://localhost:${PORT}/admin.html`);
  console.log(`  หน้าเวที   : http://localhost:${PORT}/stage.html  (ใส่ใน TikTok LIVE Studio / OBS)\n`);
});
