// มินิเกม: ตกปลาสะสมสมุดปลา
// “ตก” → เหวี่ยงเบ็ด (2.5-6 วิ) → ได้ปลา (สุ่มจากการพิมพ์เท่านั้น — ของขวัญเป็นเอฟเฟกต์ ไม่เพิ่มโอกาส)
// เก็บข้ามไลฟ์: สมุดปลาของแต่ละคน, สมุดปลาของห้อง (ใครตกได้คนแรก), สถิติตัวใหญ่สุดประจำสัปดาห์
'use strict';
const { FISH, JUNK } = require('../mgthemes');

const CAST_CD = 12_000;
const BITE_MS = 3500; // ช่วงให้พิมพ์ “ดึง”
const VALUE = { c: 2, r: 8, l: 40 };
// ร้านอุปกรณ์ (เหรียญกลาง) — เปลี่ยนแค่หน้าตา ไม่เพิ่มโอกาสได้ปลา
const GEAR = {
  silver: { name: 'เบ็ดเงิน', slot: 'rod', cost: 80, alias: ['เบ็ดเงิน'] },
  gold: { name: 'เบ็ดทอง', slot: 'rod', cost: 250, alias: ['เบ็ดทอง'] },
  captain: { name: 'หมวกกัปตัน', slot: 'hat', cost: 150, alias: ['หมวกกัปตัน', 'หมวก'] },
  cat: { name: 'แมวคู่ใจ', slot: 'pet', cost: 300, alias: ['แมว', 'แมวคู่ใจ'] },
};
const thNow = () => new Date(Date.now() + 7 * 3600_000);
const isNight = () => {
  const h = thNow().getUTCHours();
  return h >= 18 || h < 6;
};
const isWeekend = () => [0, 6].includes(thNow().getUTCDay());
const inSeason = (f) => !f.when || (f.when === 'night' ? isNight() : f.when === 'weekend' ? isWeekend() : true);
const ODDS = { junk: 0.07, l: 0.025, r: 0.17 }; // ที่เหลือ = ปลาธรรมดา
const weekId = () => Math.floor((Date.now() + 7 * 3600_000 - 4 * 86400_000) / (7 * 86400_000));
const pick = (a) => a[Math.floor(Math.random() * a.length)];

module.exports = function fish(G) {
  const D = G.data;
  D.users ||= {}; // id → { n, dex: { key: ซม.ที่ใหญ่สุด }, t: จำนวนที่ตกได้ }
  D.room ||= {}; // key → { by, cm }
  D.week ||= { w: weekId(), top: [] }; // top: [{ n, key, name, cm }]
  let S;
  const byRar = { c: FISH.filter((f) => f.r === 'c'), r: FISH.filter((f) => f.r === 'r'), l: FISH.filter((f) => f.r === 'l') };

  function reset() {
    S = { last: new Map(), pending: [], biting: new Map(), recent: [], casting: new Map(), likes: 0, catches: 0, best: null };
  }
  const pool = (r) => byRar[r].filter(inSeason);
  function roll(pulled) {
    const x = Math.random();
    // ดึงทัน: ไม่ได้ขยะ และลุ้นปลาหายากเพิ่มนิดหน่อย (จากฝีมือ ไม่ใช่ของขวัญ)
    const junk = pulled ? 0 : ODDS.junk;
    const rb = pulled ? 1.3 : 1;
    if (x < junk) return { junk: pick(JUNK) };
    if (x < junk + ODDS.l * rb) return { fish: pick(pool('l')) };
    if (x < junk + (ODDS.l + ODDS.r) * rb) return { fish: pick(pool('r')) };
    return { fish: pick(pool('c')) };
  }
  function land(p, pulled = false) {
    S.casting.delete(p.id);
    S.biting.delete(p.id);
    const r = roll(pulled);
    if (r.junk) {
      G.coin(p, 1);
      G.ev({ ev: 'catch', id: p.id, name: p.name, junk: r.junk.key, jname: r.junk.name });
      return;
    }
    const f = r.fish;
    // ขนาด: ส่วนใหญ่ตัวกลาง ๆ ตัวใหญ่มาก ๆ หายาก
    const k = pulled ? Math.pow(Math.random(), 0.9) : Math.pow(Math.random(), 2.2);
    const cm = Math.round(f.min + (f.max - f.min) * k);
    const u = G.test(p.id) ? (S.tmp ||= {})[p.id] ||= { n: p.name, dex: {}, t: 0 } : (D.users[p.id] ||= { n: p.name, dex: {}, t: 0 });
    u.n = p.name;
    const isNew = !(f.key in u.dex);
    if (isNew || cm > u.dex[f.key]) u.dex[f.key] = cm;
    u.t += 1;
    const roomNew = !D.room[f.key];
    if (roomNew) D.room[f.key] = { by: p.name, cm };
    if (D.week.w !== weekId()) D.week = { w: weekId(), top: [] };
    let record = false;
    if (!G.test(p.id)) {
      const top = D.week.top;
      if (top.length < 3 || cm > top[top.length - 1].cm) {
        top.push({ n: p.name, key: f.key, name: f.name, cm });
        top.sort((a, b) => b.cm - a.cm);
        top.length = Math.min(3, top.length);
        record = top[0].cm === cm && top[0].n === p.name;
      }
    }
    G.save();
    S.catches += 1;
    S.recent.unshift({ n: p.name, name: f.name, cm, r: f.r });
    S.recent.length = Math.min(5, S.recent.length);
    if (!S.best || cm > S.best.cm) S.best = { n: p.name, name: f.name, cm };
    G.addPoints(p, f.r === 'l' ? 10 : f.r === 'r' ? 3 : 1);
    const coins = Math.round(VALUE[f.r] * (1 + cm / f.max));
    G.coin(p, coins);
    G.stat(p, 'species', Object.keys(u.dex).length, true);
    G.ev({ ev: 'catch', id: p.id, name: p.name, fish: f.key, fname: f.name, r: f.r, cm, isNew, roomNew, record, dex: Object.keys(u.dex).length, pulled, coins });
    if (f.r !== 'c') G.log('game', `🎣 ${p.name} ตกได้${f.name} ${cm} ซม. (${f.r === 'l' ? 'ตำนาน!' : 'หายาก'})`);
    G.push(true);
  }

  function tick(dt, t) {
    // ถึงเวลา → ปลากินเบ็ด (รอให้พิมพ์ “ดึง”)
    for (let i = S.pending.length - 1; i >= 0; i--) {
      if (S.pending[i].at <= t) {
        const p = S.pending.splice(i, 1)[0];
        S.biting.set(p.id, { p, until: t + BITE_MS });
        G.ev({ ev: 'bite', id: p.id, name: p.name });
      }
    }
    for (const [id, b] of S.biting) if (t >= b.until) land(b.p, false);
  }
  function onChat(u, n) {
    if (n === 'สมุด' || n === 'สมุดปลา') {
      const me = (G.test(u.id) ? S.tmp?.[u.id] : D.users[u.id]) || { dex: {}, t: 0 };
      const keys = Object.keys(me.dex);
      const cnt = (r) => keys.filter((k) => FISH.find((f) => f.key === k)?.r === r).length;
      const big = keys.map((k) => ({ k, cm: me.dex[k] })).sort((a, b) => b.cm - a.cm)[0];
      G.say(u, `📖 สะสม ${keys.length}/${FISH.length} (ธรรมดา ${cnt('c')}/${byRar.c.length} · หายาก ${cnt('r')}/${byRar.r.length} · ตำนาน ${cnt('l')}/${byRar.l.length})${big ? ` • ใหญ่สุด ${FISH.find((f) => f.key === big.k).name} ${big.cm} ซม.` : ''}`);
      return true;
    }
    if (['ดึง', 'ดึงๆ', 'ดึงเลย', 'pull'].includes(n)) {
      const b = S.biting.get(u.id);
      if (b) land(b.p, true);
      return true;
    }
    if (n === 'ร้าน' || n === 'ร้านค้า') {
      G.say(u, `🛒 ${Object.values(GEAR).map((g) => `${g.name} ${g.cost}`).join(' • ')} (พิมพ์ “ซื้อ เบ็ดทอง”) • มี 🪙${G.prof(u).coins}`);
      return true;
    }
    if (n.startsWith('ซื้อ') && n.length > 4) {
      const want = n.slice(4);
      const found = Object.entries(GEAR).find(([, g]) => g.alias.includes(want) || g.name === want);
      if (!found) return false;
      const [key, g] = found;
      const pf = G.prof(u);
      pf.fg ||= {};
      pf.own ||= [];
      if (!pf.own.includes(key)) {
        if (pf.coins < g.cost) {
          G.say(u, `เหรียญไม่พอ (มี 🪙${pf.coins} ต้องใช้ ${g.cost}) • ตกปลาได้เหรียญ`);
          return true;
        }
        G.coin(u, -g.cost);
        pf.own.push(key);
      }
      pf.fg[g.slot] = key;
      G.save();
      G.ev({ ev: 'gear', id: u.id, name: u.name, item: g.name, fg: pf.fg });
      return true;
    }
    if (!['ตก', 'ตกปลา', 'เหวี่ยง', 'fish', 'ตกๆ'].includes(n)) return false;
    const now = Date.now();
    if (now - (S.last.get(u.id) || 0) < CAST_CD || S.casting.has(u.id) || S.biting.has(u.id)) return true;
    S.last.set(u.id, now);
    const wait = 2500 + Math.random() * 3500;
    S.casting.set(u.id, now + wait);
    S.pending.push({ id: u.id, name: u.name, at: now + wait });
    G.ev({ ev: 'cast', id: u.id, name: u.name, ms: Math.round(wait) });
    return true;
  }
  function onLike(u, count) {
    S.likes += count;
    if (S.likes >= 200) {
      S.likes = 0;
      G.ev({ ev: 'school' });
    }
  }
  function onGift(u, total, tier) {
    G.ev({ ev: 'gift', tier, id: u.id, name: u.name });
  }
  function onGoal(goal) {
    if (goal?.effect === 'g9') G.ev({ ev: 'gift', tier: 3 });
  }
  function snapshot(full) {
    const room = Object.keys(D.room).length;
    const cnt = (r) => Object.keys(D.room).filter((k) => FISH.find((f) => f.key === k)?.r === r).length;
    const s = {
      room, total: FISH.length, rc: { c: cnt('c'), r: cnt('r'), l: cnt('l') }, rt: { c: byRar.c.length, r: byRar.r.length, l: byRar.l.length },
      week: D.week.w === weekId() ? D.week.top : [], recent: S.recent, best: S.best, catches: S.catches, lead: G.topId(),
      season: FISH.filter((f) => f.when && inSeason(f)).map((f) => f.name),
    };
    if (full) {
      s.roomDex = Object.keys(D.room);
      const gear = {};
      for (const id of G.audienceIds()) {
        const fg = G.profOf(id)?.fg;
        if (fg) gear[id] = fg;
      }
      s.gear = gear;
    }
    return s;
  }
  function admin(action) {
    if (action === 'school') {
      G.ev({ ev: 'school' });
      return { ok: true };
    }
    if (action === 'reset') {
      D.users = {};
      D.room = {};
      D.week = { w: weekId(), top: [] };
      G.save();
      return { ok: true };
    }
    return { ok: false, error: 'ไม่รู้จักคำสั่ง' };
  }
  return { reset, tick, onChat, onLike, onGift, onGoal, snapshot, admin };
};
