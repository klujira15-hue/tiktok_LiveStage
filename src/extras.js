/* Live Stage — ระบบเสริม
 *  - ภารกิจไลฟ์หลายขั้น (ไลค์/เพชร/ผู้ติดตาม/แชร์/คอมเมนต์ ครบเป้า → ตัวละคร/เอฟเฟกต์ฉลอง)
 *  - คะแนนเกม + แชมป์วันนี้/7 วัน (บันทึกข้ามไลฟ์ data/scores.json)
 *  - สรุปไลฟ์แต่ละรอบ (data/sessions/*.json) + เครดิตขอบคุณท้ายไลฟ์
 *  - ตัวเฝ้าการเชื่อมต่อ (ข้อมูลไม่เข้านานผิดปกติ → เตือน + ต่อใหม่ให้เอง)
 *  - รายชื่อหน้าเวทีที่เปิดอยู่ (เช็คเสียงซ้อน/ความละเอียด/ความลื่น)
 *  - สำรองข้อมูลอัตโนมัติรายวัน (data/backups/วันที่/)
 */
'use strict';
const fs = require('fs');
const path = require('path');

const MISSION_KINDS = {
  likes: { label: '❤ ไลค์', unit: 'ไลค์' },
  diamonds: { label: '💎 เพชร', unit: 'เพชร' },
  follows: { label: '➕ ผู้ติดตามใหม่', unit: 'คน' },
  shares: { label: '↗ แชร์ไลฟ์', unit: 'ครั้ง' },
  comments: { label: '💬 คอมเมนต์', unit: 'ข้อความ' },
};
const MISSION_REWARDS = ['cheer', 'dance', 'bow', 'wai', 'bless', 'heart', 'happy', 'clap', 'spin', 'big', 'fireworks'];
const DEFAULT_MISSIONS = {
  enabled: true,
  steps: [
    { kind: 'likes', target: 1000, reward: 'cheer' },
    { kind: 'follows', target: 5, reward: 'bow' },
    { kind: 'likes', target: 5000, reward: 'dance' },
    { kind: 'diamonds', target: 500, reward: 'big' },
  ],
};
const POINTS = { quiz: 10, type: 10, guess: 10, team: 3 };
const day = (t = Date.now()) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function sanitizeMissions(m) {
  const steps = (Array.isArray(m?.steps) ? m.steps : [])
    .filter((s) => s && MISSION_KINDS[s.kind])
    .map((s) => ({
      kind: s.kind,
      target: Math.min(10_000_000, Math.max(1, Math.round(Number(s.target) || 1))),
      reward: MISSION_REWARDS.includes(s.reward) ? s.reward : 'cheer',
    }))
    .slice(0, 8);
  return { enabled: m?.enabled !== false, steps };
}

module.exports = function createExtras(ctx) {
  // ctx: { io, log, dataDir, config(), save(), status(), reconnect(), theme() }
  const { io, log, dataDir } = ctx;
  const SCORES_FILE = path.join(dataDir, 'scores.json');
  const SESS_DIR = path.join(dataDir, 'sessions');
  const BACKUP_DIR = path.join(dataDir, 'backups');

  // ================================================================ คะแนนเกม
  let scores = { days: {} }; // days[YYYY-MM-DD][id] = { n: ชื่อ, p: คะแนน, w: ชนะกี่ครั้ง }
  try {
    scores = JSON.parse(fs.readFileSync(SCORES_FILE, 'utf8'));
    if (!scores.days) scores = { days: {} };
  } catch {}
  let scoresDirty = false;
  function addPoints(u, pts) {
    if (!u?.id || !pts) return;
    const d = (scores.days[day()] ||= {});
    const r = (d[u.id] ||= { n: u.name, p: 0, w: 0 });
    r.n = u.name || r.n;
    r.p += pts;
    r.w += 1;
    scoresDirty = true;
    pushChamps();
  }
  function champs(days) {
    const out = new Map();
    for (let i = 0; i < days; i++) {
      const d = scores.days[day(Date.now() - i * 86400_000)];
      if (!d) continue;
      for (const [id, r] of Object.entries(d)) {
        const o = out.get(id) || { id, name: r.n, pts: 0, wins: 0 };
        o.pts += r.p;
        o.wins += r.w;
        if (i === 0 || !o.name) o.name = r.n;
        out.set(id, o);
      }
    }
    return [...out.values()].sort((a, b) => b.pts - a.pts || b.wins - a.wins);
  }
  const champState = () => ({ today: champs(1).slice(0, 5), week: champs(7).slice(0, 5) });
  let champTimer = null;
  function pushChamps() {
    clearTimeout(champTimer);
    champTimer = setTimeout(() => io.emit('champs', champState()), 400);
  }

  // ================================================================ สรุปไลฟ์ (รอบละไฟล์)
  let sess = null;
  let sessDirty = false;
  function newSession(roomId) {
    finishSession();
    const t = Date.now();
    sess = {
      id: new Date(t).toISOString().replace(/[:.]/g, '-').slice(0, 19),
      roomId: roomId || null, theme: ctx.config().theme, startAt: t, endAt: t,
      peakViewers: 0, likes: 0, comments: 0, follows: 0, shares: 0, diamonds: 0, giftCount: 0,
      gifters: {}, followers: [], winners: {}, chatters: {}, missionsDone: 0, timeline: [], highlights: [], hlPeak: 0, hlPeakAt: 0,
    };
    mission.idx = 0;
    mission.doneAt = 0;
    sessDirty = true;
    pushMissions(true);
    sceneForced = null;
    pushScene(true);
    return sess;
  }
  const S = () => sess || newSession(null);
  // ไฮไลต์: ช่วงเวลาเด็ดของไลฟ์ (นาทีที่เท่าไร) ไว้ตัดคลิปจากไฟล์บันทึกไลฟ์ / ใส่ไทม์สแตมป์
  function highlight(kind, text) {
    const s = S();
    const t = Math.max(0, Math.round((Date.now() - s.startAt) / 1000));
    const list = (s.highlights ||= []);
    // เหตุการณ์ชนิดเดียวกันติดกันภายใน 20 วิ → รวมเป็นอันเดียว
    const last = list[list.length - 1];
    if (last && last.kind === kind && t - last.t < 20) last.text = text;
    else list.push({ t, kind, text: String(text).slice(0, 80) });
    if (list.length > 80) list.shift();
    sessDirty = true;
    io.to('admin').emit('highlight', list[list.length - 1]);
  } // ทดสอบ/ยังไม่ได้ต่อไลฟ์: เริ่มรอบให้เองเมื่อมีเหตุการณ์แรก
  function saveSession() {
    if (!sess || !sessDirty) return;
    sessDirty = false;
    try {
      fs.mkdirSync(SESS_DIR, { recursive: true });
      fs.writeFileSync(path.join(SESS_DIR, sess.id + '.json'), JSON.stringify(sess));
    } catch (e) {
      log('error', 'บันทึกสรุปไลฟ์ไม่สำเร็จ: ' + e.message);
    }
  }
  function finishSession() {
    if (!sess) return;
    sess.endAt = Date.now();
    sessDirty = true;
    // รอบที่ไม่มีอะไรเกิดขึ้นเลย ไม่ต้องเก็บ
    const empty = !sess.likes && !sess.comments && !sess.diamonds && !sess.follows && !sess.shares;
    if (!empty) saveSession();
    // ไลฟ์จริง (มี roomId) ที่จบแล้ว → ส่งสรุปขึ้นบัญชี TubHool (server.js ตัดสินว่าจะส่งไหม)
    if (!empty && sess.roomId) {
      try {
        ctx.onFinished?.(summary(sess));
      } catch {}
    }
    sess = null;
  }
  function summary(s = sess) {
    if (!s) return null;
    const top = (o, k) => Object.entries(o).map(([id, v]) => ({ id, ...v })).sort((a, b) => b[k] - a[k]);
    return {
      id: s.id, theme: s.theme, startAt: s.startAt, endAt: s === sess ? Date.now() : s.endAt,
      peakViewers: s.peakViewers, likes: s.likes, comments: s.comments, follows: s.follows, shares: s.shares,
      diamonds: s.diamonds, giftCount: s.giftCount, missionsDone: s.missionsDone,
      gifters: top(s.gifters, 'd').slice(0, 40),
      winners: top(s.winners, 'w').slice(0, 20),
      followers: s.followers.slice(-40),
      chatters: top(s.chatters, 'c').slice(0, 40),
      chatterCount: Object.keys(s.chatters).length,
      timeline: s.timeline || [],
      highlights: s.highlights || [],
    };
  }
  function listSessions() {
    try {
      return fs.readdirSync(SESS_DIR).filter((f) => f.endsWith('.json')).sort().reverse().slice(0, 30).map((f) => {
        try {
          return summary(JSON.parse(fs.readFileSync(path.join(SESS_DIR, f), 'utf8')));
        } catch {
          return null;
        }
      }).filter(Boolean);
    } catch {
      return [];
    }
  }

  // ================================================================ ภารกิจ
  const mission = { idx: 0, doneAt: 0 };
  const mcfg = () => ctx.config().missions || DEFAULT_MISSIONS;
  const valueOf = (kind) => (sess ? sess[kind] || 0 : 0);
  function missionState() {
    const m = mcfg();
    const steps = m.steps || [];
    const cur = steps[mission.idx];
    return {
      enabled: !!m.enabled && steps.length > 0, idx: mission.idx, total: steps.length,
      kind: cur?.kind || null, label: cur ? MISSION_KINDS[cur.kind].label : '', unit: cur ? MISSION_KINDS[cur.kind].unit : '',
      target: cur?.target || 0, value: cur ? valueOf(cur.kind) : 0, reward: cur?.reward || '', allDone: !cur && steps.length > 0,
    };
  }
  let mTimer = null;
  let mLast = '';
  function pushMissions(now) {
    if (now) {
      clearTimeout(mTimer);
      mTimer = null;
      const st = missionState();
      mLast = JSON.stringify(st);
      io.emit('missions', st);
      return;
    }
    if (mTimer) return;
    mTimer = setTimeout(() => {
      mTimer = null;
      const st = missionState();
      const j = JSON.stringify(st);
      if (j !== mLast) {
        mLast = j;
        io.emit('missions', st);
      }
    }, 700);
  }
  function checkMissions() {
    const m = mcfg();
    if (!m.enabled) return;
    let changed = false;
    // ครบหลายขั้นพร้อมกันได้ (เช่น ของขวัญก้อนใหญ่) → ฉลองทีละขั้น
    while (m.steps[mission.idx] && valueOf(m.steps[mission.idx].kind) >= m.steps[mission.idx].target) {
      const step = m.steps[mission.idx];
      mission.idx += 1;
      S().missionsDone = mission.idx;
      sessDirty = true;
      changed = true;
      const label = `${MISSION_KINDS[step.kind].label} ครบ ${step.target.toLocaleString('en-US')}`;
      log('hype', `🎯 ภารกิจสำเร็จ: ${label}`);
      highlight('mission', `🎯 ภารกิจสำเร็จ: ${label}`);
      io.emit('missionDone', { idx: mission.idx, total: m.steps.length, label, reward: step.reward, allDone: !m.steps[mission.idx] });
    }
    pushMissions(changed);
  }

  // ================================================================ เหตุการณ์จากไลฟ์
  let lastData = 0; // ข้อมูลอะไรก็ได้จาก TikTok (รวมยอดคนดูที่ส่งมาเป็นระยะ) = การเชื่อมต่อยังมีชีวิต
  function heartbeat() {
    lastData = Date.now();
    if (alertOn) setAlert(null);
  }
  function onEvent(kind, u, data = {}) {
    heartbeat();
    const s = S();
    sessDirty = true;
    if (kind === 'chat') {
      s.comments += 1;
      const c = (s.chatters[u.id] ||= { name: u.name, c: 0 });
      c.name = u.name;
      c.c += 1;
    } else if (kind === 'gift') {
      s.diamonds += data.total || 0;
      s.giftCount += data.count || 1;
      const g = (s.gifters[u.id] ||= { name: u.name, d: 0 });
      g.name = u.name;
      g.d += data.total || 0;
      if ((data.total || 0) >= 100) highlight('gift', `🎁 ${u.name} ส่ง ${data.name || 'ของขวัญ'}${data.count > 1 ? ' x' + data.count : ''} (${data.total} 💎)`);
    } else if (kind === 'like') {
      const before = s.likes;
      const first = !s.likesTotal;
      if (data.total > 0) {
        // หัวใจของไลฟ์ = ยอดรวมจาก TikTok (ตรงกับ LIVE Studio แม้เปิดโปรแกรมทีหลัง) ลบส่วนก่อนคนไลฟ์กดรีเซ็ตเป้า
        // TikTok ส่งยอดรวมมาไม่เรียงบางที → ไม่นับถอยหลัง
        s.likesTotal = Math.max(s.likesTotal || 0, data.total);
        s.likes = Math.max(s.likes, s.likesTotal - (s.likesBase || 0));
      } else s.likes += data.count || 1;
      // ยอดที่มีอยู่ก่อนต่อโปรแกรม ไม่นับเป็นไฮไลต์ "หัวใจครบ"
      if (!(first && data.total > 0) && Math.floor(s.likes / 10000) > Math.floor(before / 10000)) highlight('likes', `❤️ หัวใจครบ ${(Math.floor(s.likes / 10000) * 10000).toLocaleString('en-US')}`);
    }
    else if (kind === 'follow') {
      s.follows += 1;
      if (!s.followers.includes(u.name)) s.followers.push(u.name);
    } else if (kind === 'share') s.shares += 1;
    checkMissions();
    if (kind === 'like' || kind === 'gift') pushScene();
  }

  // ================================================================ ฉากเปลี่ยนตามเป้า (3 ขั้น ทุกธีม)
  // ขั้น 1 = ฉากปกติ · ขั้น 2/3 = ไลค์หรือเพชรรวมของไลฟ์นี้ครบ → หน้าเวทีวาดของเพิ่ม (public/scene-levels.js)
  const SCENE_DEFAULT = { enabled: true, l2Likes: 5000, l2Diamonds: 300, l3Likes: 20000, l3Diamonds: 1000 };
  const sceneCfg = () => ({ ...SCENE_DEFAULT, ...(ctx.config().sceneLevels || {}) });
  let sceneForced = null; // ทดสอบ/คนไลฟ์เลือกขั้นเอง
  let sceneShown = 0;
  let sceneTimer = null;
  function sceneState() {
    const c = sceneCfg();
    const likes = sess?.likes || 0;
    const diamonds = sess?.diamonds || 0;
    let level = 1;
    if (c.enabled !== false) {
      if (likes >= c.l2Likes || diamonds >= c.l2Diamonds) level = 2;
      if (likes >= c.l3Likes || diamonds >= c.l3Diamonds) level = 3;
    }
    if (sceneForced) level = sceneForced;
    const next = level === 1 ? { likes: c.l2Likes, diamonds: c.l2Diamonds } : level === 2 ? { likes: c.l3Likes, diamonds: c.l3Diamonds } : null;
    return { level, likes, diamonds, next, enabled: c.enabled !== false, forced: !!sceneForced };
  }
  // ขั้นเปลี่ยน → ส่งทันที · แค่ตัวเลขขยับ → ส่งอย่างมากวินาทีละครั้ง
  function pushScene(force) {
    const st = sceneState();
    if (force || st.level !== sceneShown) {
      clearTimeout(sceneTimer);
      sceneTimer = null;
      if (!force && st.level > sceneShown && sceneShown) highlight('scene', `🏮 ฉากปลดล็อกขั้น ${st.level}`);
      sceneShown = st.level;
      io.emit('sceneLevel', st);
      return;
    }
    if (!sceneTimer) sceneTimer = setTimeout(() => {
      sceneTimer = null;
      io.emit('sceneLevel', sceneState());
    }, 1000);
  }
  function onViewers(n) {
    heartbeat();
    if (sess && n > sess.peakViewers) {
      sess.peakViewers = n;
      sessDirty = true;
      // คนดูพุ่งสูงสุดใหม่ (โตขึ้น 20% และห่างจากครั้งก่อน 5 นาที)
      if (n >= 20 && n >= (sess.hlPeak || 0) * 1.2 && Date.now() - (sess.hlPeakAt || 0) > 300_000) {
        sess.hlPeak = n;
        sess.hlPeakAt = Date.now();
        highlight('peak', `👀 คนดูสูงสุดใหม่ ${n.toLocaleString('en-US')} คน`);
      }
    }
    // คนดูตามเวลา (นาทีละจุด) ไว้ทำกราฟในรายงานไลฟ์
    if (sess) {
      const sec = Math.round((Date.now() - sess.startAt) / 1000);
      const tl = (sess.timeline ||= []);
      if (!tl.length || sec - tl[tl.length - 1][0] >= 60) {
        tl.push([sec, n]);
        if (tl.length > 240) tl.splice(0, tl.length - 240);
        sessDirty = true;
      }
    }
  }
  function onWin(u, kind) {
    addPoints(u, POINTS[kind] || 10);
    const s = S();
    const w = (s.winners[u.id] ||= { name: u.name, w: 0 });
    w.name = u.name;
    w.w += 1;
    sessDirty = true;
  }
  function onTeamWin(users) {
    for (const u of users) addPoints(u, POINTS.team);
  }
  function onConnected(roomId, isNewRoom) {
    heartbeat();
    if (isNewRoom || !sess || (sess.roomId && sess.roomId !== roomId)) newSession(roomId);
    else sess.roomId = roomId;
  }
  function onEnded() {
    finishSession();
    pushMissions(true);
  }

  // ================================================================ ตัวเฝ้าการเชื่อมต่อ
  let alertOn = null;
  let lastAutoFix = 0;
  function setAlert(a) {
    alertOn = a;
    io.to('admin').emit('liveAlert', a);
  }
  setInterval(() => {
    const cfg = ctx.config();
    const w = cfg.watchdog || {};
    if (ctx.status() !== 'connected' || w.enabled === false) {
      if (alertOn?.kind === 'quiet') setAlert(null);
      return;
    }
    const quiet = (Date.now() - lastData) / 1000;
    const warnSec = (w.minutes || 2) * 60;
    if (quiet >= warnSec) {
      const msg = `📡 ไม่มีข้อมูลจาก TikTok มา ${Math.floor(quiet / 60)} นาที — การเชื่อมต่ออาจค้าง`;
      if (alertOn?.text !== msg) setAlert({ kind: 'quiet', level: 'bad', text: msg });
      // ค้างนานเกิน → ต่อใหม่ให้เอง (ไม่เกิน 1 ครั้ง/5 นาที)
      if (w.autoFix !== false && quiet >= warnSec + 60 && Date.now() - lastAutoFix > 300_000) {
        lastAutoFix = Date.now();
        log('system', '📡 การเชื่อมต่อเงียบผิดปกติ — ต่อใหม่ให้อัตโนมัติ');
        ctx.reconnect();
      }
    }
  }, 10_000);

  // ================================================================ หน้าเวทีที่เปิดอยู่
  const stages = new Map(); // socket.id -> ข้อมูลที่หน้าเวทีรายงาน
  let stTimer = null;
  const stageList = () => [...stages.values()];
  function pushStages() {
    clearTimeout(stTimer);
    stTimer = setTimeout(() => io.to('admin').emit('stages', stageList()), 300);
  }
  const str = (v, n = 80) => String(v ?? '').slice(0, n);
  const num = (v) => (Number.isFinite(Number(v)) ? Math.round(Number(v) * 10) / 10 : 0);

  // ================================================================ สำรองข้อมูลรายวัน
  let lastBackup = null;
  function backup(force = false) {
    const d = day();
    const dir = path.join(BACKUP_DIR, d);
    try {
      if (!force && fs.existsSync(dir)) {
        lastBackup = d;
        return;
      }
      fs.mkdirSync(dir, { recursive: true });
      for (const f of ['config.json', 'fans.json', 'scores.json']) {
        const src = path.join(dataDir, f);
        if (fs.existsSync(src)) fs.copyFileSync(src, path.join(dir, f));
      }
      lastBackup = d;
      // เก็บไว้ 14 วันล่าสุด
      const all = fs.readdirSync(BACKUP_DIR).filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x)).sort();
      for (const old of all.slice(0, Math.max(0, all.length - 14))) fs.rmSync(path.join(BACKUP_DIR, old), { recursive: true, force: true });
    } catch (e) {
      log('error', 'สำรองข้อมูลไม่สำเร็จ: ' + e.message);
    }
  }
  setTimeout(() => backup(), 5000);
  setInterval(() => backup(), 3600_000);

  // บันทึกลงไฟล์เป็นระยะ
  setInterval(() => {
    if (scoresDirty) {
      scoresDirty = false;
      // เก็บย้อนหลัง 60 วัน
      const keep = new Set(Array.from({ length: 60 }, (_, i) => day(Date.now() - i * 86400_000)));
      for (const k of Object.keys(scores.days)) if (!keep.has(k)) delete scores.days[k];
      try {
        fs.mkdirSync(dataDir, { recursive: true });
        fs.writeFileSync(SCORES_FILE, JSON.stringify(scores));
      } catch (e) {
        log('error', 'บันทึกคะแนนเกมไม่สำเร็จ: ' + e.message);
      }
    }
    saveSession();
  }, 15_000);

  // ================================================================ sockets
  function register(socket) {
    socket.emit('champs', champState());
    socket.emit('missions', missionState());
    socket.emit('sceneLevel', sceneState());

    // หน้าเวทีรายงานตัว (ทุก ~5 วิ)
    socket.on('stage:stat', (d = {}) => {
      const first = !stages.has(socket.id);
      stages.set(socket.id, {
        id: socket.id, silent: !!d.silent, thumb: !!d.thumb, mobile: !!d.mobile, theme: str(d.theme, 20),
        w: num(d.w), h: num(d.h), px: num(d.px), dpr: num(d.dpr), audio: !!d.audio, fps: num(d.fps), qual: num(d.qual),
        ua: str(d.ua, 60), since: stages.get(socket.id)?.since || Date.now(), at: Date.now(),
      });
      if (first || d.changed) pushStages();
    });
    socket.on('disconnect', () => {
      if (stages.delete(socket.id)) pushStages();
    });

    // ---------------- แอดมิน
    socket.on('pre:get', (_, ack) => ack?.({ stages: stageList(), lastBackup, alert: alertOn, lastData, session: summary() }));
    socket.on('pre:identify', () => {
      let i = 0;
      for (const s of stages.values()) if (!s.thumb && !s.silent) io.to(s.id).emit('stage:identify', { no: ++i });
    });
    socket.on('pre:backupNow', (_, ack) => {
      backup(true);
      ack?.({ ok: true, lastBackup });
    });
    socket.on('missions:save', (m, ack) => {
      const cfg = ctx.config();
      cfg.missions = sanitizeMissions(m);
      ctx.save();
      // ขั้นที่ทำไปแล้วยังนับอยู่ (ถ้าลดจำนวนขั้น → ไม่เกินจำนวนขั้นใหม่)
      mission.idx = Math.min(mission.idx, cfg.missions.steps.length);
      checkMissions();
      pushMissions(true);
      ack?.({ ok: true, missions: cfg.missions });
    });
    socket.on('missions:reset', (_, ack) => {
      mission.idx = 0;
      if (sess) {
        for (const k of ['likes', 'diamonds', 'follows', 'shares', 'comments']) sess[k] = 0;
        sess.likesBase = sess.likesTotal || 0; // เริ่มนับหัวใจใหม่จากตอนนี้
        sess.missionsDone = 0;
      }
      pushMissions(true);
      pushScene(true);
      ack?.({ ok: true });
    });
    socket.on('scene:save', (v, ack) => {
      const cfg = ctx.config();
      cfg.sceneLevels = sanitizeScene(v || {});
      ctx.save();
      pushScene(true);
      ack?.({ ok: true, sceneLevels: cfg.sceneLevels });
    });
    socket.on('scene:setLevel', (n, ack) => {
      sceneForced = [1, 2, 3].includes(n) ? n : null;
      pushScene(true);
      ack?.({ ok: true, scene: sceneState() });
    });
    socket.on('champs:get', (_, ack) => ack?.({ today: champs(1).slice(0, 20), week: champs(7).slice(0, 20) }));
    socket.on('champs:reset', (what, ack) => {
      if (what === 'today') delete scores.days[day()];
      else scores.days = {};
      scoresDirty = true;
      pushChamps();
      ack?.({ ok: true });
    });
    socket.on('session:get', (_, ack) => ack?.({ current: summary(), past: listSessions() }));
    socket.on('session:new', (_, ack) => {
      newSession(sess?.roomId || null);
      ack?.({ ok: true });
    });
    socket.on('credits:show', (_, ack) => {
      const s = summary() || { gifters: [], winners: [], followers: [], chatters: [] };
      io.emit('credits', { ...s, title: ctx.theme()?.name || '' });
      log('system', '🎬 ขึ้นเครดิตขอบคุณท้ายไลฟ์');
      ack?.({ ok: true });
    });
    socket.on('credits:stop', () => io.emit('credits', null));
  }

  return {
    register, onEvent, onViewers, onWin, onTeamWin, onConnected, onEnded, heartbeat, highlight,
    missionState, champState, summary, sceneState,
    // รวมคะแนนเกมรายวันที่ 1.4.1 บันทึกไว้ใต้ชื่อผู้ใช้ (from) เข้ากับ id ถาวร (to)
    mergeId(from, to) {
      if (from === to) return false;
      let any = false;
      for (const d of Object.values(scores.days || {})) {
        const a = d[from];
        if (!a) continue;
        const b = d[to];
        if (!b) d[to] = a;
        else {
          b.p = (b.p || 0) + (a.p || 0);
          b.w = (b.w || 0) + (a.w || 0);
          b.n = a.n || b.n;
        }
        delete d[from];
        any = true;
      }
      if (any) scoresDirty = true;
      return any;
    },
    flush: () => {
      saveSession();
      if (scoresDirty) fs.writeFileSync(SCORES_FILE, JSON.stringify(scores));
    },
  };
};
module.exports.DEFAULT_MISSIONS = DEFAULT_MISSIONS;
// ฉากเปลี่ยนตามเป้า: เปิด/ปิด + เป้าไลค์/เพชรของขั้น 2 และ 3 (ขั้น 3 ต้องมากกว่าขั้น 2)
function sanitizeScene(v = {}) {
  const n = (x, d, max) => {
    const k = Math.round(Number(x));
    return Number.isFinite(k) && k > 0 ? Math.min(k, max) : d;
  };
  const l2Likes = n(v.l2Likes, 5000, 10_000_000);
  const l2Diamonds = n(v.l2Diamonds, 300, 1_000_000);
  return {
    enabled: v.enabled !== false,
    l2Likes,
    l2Diamonds,
    l3Likes: Math.max(l2Likes + 1, n(v.l3Likes, 20000, 50_000_000)),
    l3Diamonds: Math.max(l2Diamonds + 1, n(v.l3Diamonds, 1000, 5_000_000)),
  };
}
module.exports.sanitizeScene = sanitizeScene;
module.exports.MISSION_KINDS = MISSION_KINDS;
module.exports.MISSION_REWARDS = MISSION_REWARDS;
module.exports.sanitizeMissions = sanitizeMissions;
