// มินิเกม: หมู่บ้านของเรา — ทั้งห้องช่วยกันทำฟาร์ม ผลผลิตไปสร้างสิ่งก่อสร้าง (เก็บข้ามไลฟ์)
// แปลง 12 แปลง: ว่าง → เมล็ด → ต้นอ่อน → โต → พร้อมเก็บ • “ปลูก” “รดน้ำ” “เก็บ”
// ไม่มีคนพิมพ์นาน ๆ ชาวบ้าน (NPC) ช่วยทำเอง ช้า ๆ ให้ฉากไม่นิ่ง
'use strict';

const BUILDINGS = [
  { key: 'pond', name: 'บ่อเลี้ยงปลา', need: 300 },
  { key: 'market', name: 'ตลาดนัด', need: 500 },
  { key: 'sala', name: 'ศาลาริมทาง', need: 750 },
  { key: 'mill', name: 'โรงสีข้าว', need: 1000 },
  { key: 'garden', name: 'สวนดอกไม้', need: 1300 },
  { key: 'tree', name: 'บ้านต้นไม้', need: 1600 },
  { key: 'ferris', name: 'ชิงช้าสวรรค์', need: 2000 },
  { key: 'tower', name: 'หอกังหันลม', need: 2500 },
  { key: 'gate', name: 'ซุ้มประตูหมู่บ้าน', need: 3000 },
  { key: 'hall', name: 'ศาลาประชาคม', need: 3600 },
];
const PLOTS = 12;
const STAGE_SEC = 18; // วินาทีต่อระยะ (รดน้ำแล้วโตไวขึ้น 2 เท่า)
const CD = 4000;
const crop = (i) => (i >= 8 ? 'rice' : 'veg');

module.exports = function village(G) {
  const D = G.data;
  D.lv ||= 1; // รอบของหมู่บ้าน (สร้างครบ 10 อย่าง = ขึ้นรอบใหม่ ค่าก่อสร้างแพงขึ้น)
  D.res ||= { veg: 0, rice: 0 };
  D.built ||= [];
  D.prog ||= 0;
  D.names ||= {}; // key → [ชื่อคนช่วยมากสุด 3 คน]
  D.helpers ||= {}; // id → { n, c } ตลอดกาล
  let S;

  const curB = () => BUILDINGS[D.built.length % BUILDINGS.length];
  const needOf = (b) => Math.round(b.need * (1 + 0.5 * (D.lv - 1)));

  function reset() {
    const t = Date.now();
    S = { plots: Array.from({ length: PLOTS }, (_, i) => ({ s: 0, t: 0, w: 0, c: crop(i), own: null })), last: new Map(), live: {}, lastPlayer: 0, npcAt: 0, likes: 0, pts: new Map(),
      crows: null, nextCrow: t + 70_000, merchant: null, nextMerchant: t + 110_000 };
  }
  function contribute(u, amount) {
    D.prog += amount;
    if (u?.id) {
      const lv = (S.live[u.id] ||= { n: u.name, c: 0 });
      lv.c += amount;
      if (!G.test(u.id)) {
        const h = (D.helpers[u.id] ||= { n: u.name, c: 0 });
        h.n = u.name;
        h.c += amount;
      }
    }
    const b = curB();
    if (D.prog >= needOf(b)) {
      D.prog -= needOf(b);
      const top = Object.values(S.live).sort((a, c) => c.c - a.c).slice(0, 3).map((x) => x.n);
      D.names[b.key] = top;
      D.built.push(b.key);
      if (D.built.length >= BUILDINGS.length) {
        D.lv += 1;
        D.built = [];
        G.ev({ ev: 'levelup', lv: D.lv });
      }
      G.ev({ ev: 'built', key: b.key, name: b.name, top });
      G.log('game', `🏗️ หมู่บ้านสร้าง${b.name}เสร็จ! (ช่วยมากสุด: ${top.join(', ') || '-'})`);
    }
    G.save();
  }
  function act(u, kind) {
    const P = S.plots;
    if (kind === 'plant') {
      const mine = u?.id ? P.findIndex((p) => p.s === 0 && p.own?.id === u.id) : -1;
      const i = mine >= 0 ? mine : P.findIndex((p) => p.s === 0);
      if (i < 0) return -1;
      Object.assign(P[i], { s: 1, t: 0, w: 0 });
      return i;
    }
    if (kind === 'water') {
      const cand = P.map((p, i) => [p, i]).filter(([p]) => p.s >= 1 && p.s < 4).sort((a, b) => a[0].w - b[0].w);
      if (!cand.length) return -1;
      const [p, i] = cand[0];
      p.w = Math.max(p.w, Date.now() + 30_000);
      return i;
    }
    if (kind === 'harvest') {
      const i = P.findIndex((p) => p.s === 4);
      if (i < 0) return -1;
      const c = P[i].c;
      const own = P[i].own;
      Object.assign(P[i], { s: 0, t: 0, w: 0 });
      const amt = Math.round((c === 'rice' ? 14 : 10) * (own && own.id === u?.id ? 1.5 : 1));
      if (u?.id) G.coin(u, 3);
      if (own && own.id !== u?.id) G.coin(own, 2);
      D.res[c] += amt;
      contribute(u, amt);
      return i;
    }
    return -1;
  }
  const KIND = { ปลูก: 'plant', หว่าน: 'plant', รดน้ำ: 'water', รด: 'water', เก็บ: 'harvest', เก็บเกี่ยว: 'harvest' };

  function tick(dt, t) {
    let changed = false;
    for (const p of S.plots) {
      if (p.s < 1 || p.s >= 4) continue;
      p.t += dt * (t < p.w ? 2 : 1);
      if (p.t >= STAGE_SEC) {
        p.t = 0;
        p.s += 1;
        changed = true;
      }
    }
    // ชาวบ้านช่วยเมื่อไม่มีใครพิมพ์ 20 วินาที
    if (t - S.lastPlayer > 20_000 && t >= S.npcAt) {
      S.npcAt = t + 9000;
      for (const k of ['harvest', 'plant', 'water']) {
        const i = act(null, k);
        if (i >= 0) {
          G.ev({ ev: 'act', kind: k, plot: i, id: null, name: 'ชาวบ้าน' });
          changed = true;
          break;
        }
      }
    }
    // อีกาบุก: ทั้งห้องพิมพ์ “ไล่” ให้ครบใน 15 วิ ไม่งั้นเมล็ดในแปลงเป้าหมายโดนกิน
    const growing = S.plots.map((p, i) => [p, i]).filter(([p]) => p.s >= 1);
    if (!S.crows && t >= S.nextCrow && growing.length >= 2) {
      const tg = growing.sort(() => Math.random() - 0.5).slice(0, Math.min(3, growing.length)).map(([, i]) => i);
      S.crows = { plots: tg, until: t + 15_000, n: 0, need: Math.max(2, Math.ceil(Math.min(30, G.crowd()) * 0.25)), who: new Set() };
      G.ev({ ev: 'crows', plots: tg, need: S.crows.need });
      changed = true;
    } else if (S.crows && t >= S.crows.until) {
      const ok = S.crows.n >= S.crows.need;
      if (!ok) for (const i of S.crows.plots) Object.assign(S.plots[i], { s: 0, t: 0, w: 0 });
      G.ev({ ev: 'crowsEnd', ok, plots: S.crows.plots });
      S.crows = null;
      S.nextCrow = t + 60_000 + Math.random() * 40_000;
      changed = true;
    }
    // พ่อค้าเร่: พิมพ์ “ขาย” ใน 20 วิ ได้เงินสร้างหมู่บ้านพิเศษ
    if (!S.merchant && t >= S.nextMerchant) {
      S.merchant = { until: t + 20_000, n: 0, who: new Set() };
      G.ev({ ev: 'merchant' });
      changed = true;
    } else if (S.merchant && t >= S.merchant.until) {
      G.ev({ ev: 'merchantEnd', n: S.merchant.n });
      S.merchant = null;
      S.nextMerchant = t + 100_000 + Math.random() * 50_000;
      changed = true;
    }
    if (changed) G.push();
  }
  function onChat(u, n) {
    if (n === 'จอง' || n === 'จองแปลง') {
      if (S.plots.some((p) => p.own?.id === u.id)) {
        G.say(u, 'จองแปลงไว้แล้ว 🏷️ “ปลูก” จะลงแปลงตัวเองก่อน');
        return true;
      }
      const i = S.plots.findIndex((p) => !p.own);
      if (i < 0) {
        G.say(u, 'แปลงถูกจองครบแล้ว ช่วยแปลงส่วนรวมได้เลย');
        return true;
      }
      S.plots[i].own = { id: u.id, name: u.name };
      G.ev({ ev: 'claim', plot: i, id: u.id, name: u.name });
      G.push(true);
      return true;
    }
    if (n === 'ไล่' || n === 'ไล่อีกา' || n === 'ชู่ว') {
      if (S.crows && !S.crows.who.has(u.id)) {
        S.crows.who.add(u.id);
        S.crows.n += 1;
        G.coin(u, 3);
        G.stat(u, 'farm', 1);
        G.push();
      }
      return true;
    }
    if (n === 'ขาย' || n === 'ขายผัก') {
      if (S.merchant && !S.merchant.who.has(u.id) && S.merchant.n < 15) {
        S.merchant.who.add(u.id);
        S.merchant.n += 1;
        contribute(u, 15);
        G.coin(u, 3);
        G.ev({ ev: 'sold', id: u.id, name: u.name });
        G.push();
      }
      return true;
    }
    const kind = KIND[n];
    if (!kind) return false;
    const now = Date.now();
    const key = u.id + kind;
    if (now - (S.last.get(key) || 0) < CD) return true;
    S.last.set(key, now);
    S.lastPlayer = now;
    const i = act(u, kind);
    if (i < 0) {
      G.ev({ ev: 'none', kind, id: u.id, name: u.name });
      return true;
    }
    if (kind !== 'harvest') contribute(u, 1);
    G.stat(u, 'farm', 1);
    if (now - (S.pts.get(u.id) || 0) > 20_000) {
      S.pts.set(u.id, now);
      G.addPoints(u, 1);
    }
    G.ev({ ev: 'act', kind, plot: i, id: u.id, name: u.name, gain: kind === 'harvest' ? (crop(i) === 'rice' ? 14 : 10) : 0 });
    G.push();
    return true;
  }
  function grow(all) {
    for (const p of S.plots) {
      if (p.s === 0 && all) Object.assign(p, { s: 1, t: 0, w: 0 });
      if (p.s >= 1 && p.s < 4) p.s = all ? 4 : Math.min(4, p.s + 1);
    }
  }
  function onLike(u, count) {
    S.likes += count;
    if (S.likes >= 150) {
      S.likes = 0;
      grow(false);
      G.ev({ ev: 'rain' });
      G.push(true);
    }
  }
  function onGift(u, total, tier) {
    if (tier === 1) grow(true);
    else if (tier === 2) contribute(u, Math.round(needOf(curB()) * 0.12));
    else {
      grow(true);
      contribute(u, Math.round(needOf(curB()) * 0.25));
    }
    G.ev({ ev: 'gift', tier, id: u.id, name: u.name });
    G.push(true);
  }
  function onGoal(goal) {
    if (goal?.effect === 'g9') {
      grow(true);
      contribute(null, Math.round(needOf(curB()) * 0.2));
      G.ev({ ev: 'gift', tier: 3 });
      G.push(true);
    }
  }
  function snapshot(full) {
    const b = curB();
    const s = {
      plots: S.plots.map((p) => [p.s, p.c === 'rice' ? 1 : 0, Date.now() < p.w ? 1 : 0, +(p.t / STAGE_SEC).toFixed(2), p.own?.name || '']),
      crows: S.crows ? { plots: S.crows.plots, n: S.crows.n, need: S.crows.need, left: Math.max(0, Math.ceil((S.crows.until - Date.now()) / 1000)) } : null,
      merchant: S.merchant ? { n: S.merchant.n, left: Math.max(0, Math.ceil((S.merchant.until - Date.now()) / 1000)) } : null,
      res: D.res, lv: D.lv, built: D.built, cur: { key: b.key, name: b.name, need: needOf(b), prog: Math.floor(D.prog) },
      top: Object.values(S.live).sort((a, c) => c.c - a.c).slice(0, 3), lead: G.topId(),
    };
    if (full) s.names = D.names;
    return s;
  }
  function admin(action) {
    if (action === 'crows') {
      S.nextCrow = 0;
      grow(false);
      return { ok: true };
    }
    if (action === 'merchant') {
      S.nextMerchant = 0;
      return { ok: true };
    }
    if (action === 'grow') {
      grow(true);
      G.push(true);
      return { ok: true };
    }
    if (action === 'reset') {
      Object.assign(D, { lv: 1, res: { veg: 0, rice: 0 }, built: [], prog: 0, names: {}, helpers: {} });
      G.save();
      G.push(true);
      return { ok: true };
    }
    return { ok: false, error: 'ไม่รู้จักคำสั่ง' };
  }
  return { reset, tick, onChat, onLike, onGift, onGoal, snapshot, admin };
};
module.exports.BUILDINGS = BUILDINGS;
