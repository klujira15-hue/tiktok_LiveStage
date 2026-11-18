// มินิเกม: ครัวช่วยกันทำออเดอร์ — บิลมาเรื่อย ๆ (สูงสุด 3 ใบ) พิมพ์ชื่อวัตถุดิบเติมบิลที่เก่าสุดที่ยังขาด
// ครบแล้วพิมพ์ “เสิร์ฟ” (ไม่มีใครพิมพ์ 6 วิ เสิร์ฟเองได้ทิปครึ่งเดียว) • หมดเวลา = ลูกค้าเดินออก คอมโบหาย
// เก็บข้ามไลฟ์: จานที่เสิร์ฟทั้งหมด คอมโบสูงสุด เชฟที่ช่วยมากสุด
'use strict';

const ING = {
  หมู: ['หมู', 'หมูสับ', 'pork'], ไก่: ['ไก่', 'chicken'], กุ้ง: ['กุ้ง', 'shrimp'], ไข่: ['ไข่', 'egg'], ผัก: ['ผัก', 'veg'], พริก: ['พริก', 'chili'],
  กระเทียม: ['กระเทียม', 'garlic'], ข้าว: ['ข้าว', 'rice'], เส้น: ['เส้น', 'เส้นก๋วยเตี๋ยว', 'noodle'], มะนาว: ['มะนาว', 'lime'], ซอส: ['ซอส', 'ซีอิ๊ว', 'sauce'],
};
const RECIPES = [
  ['กะเพราหมูสับ', ['หมู', 'พริก', 'กระเทียม', 'ข้าว']], ['ไข่เจียวหมูสับ', ['ไข่', 'หมู']], ['ข้าวผัดกุ้ง', ['ข้าว', 'กุ้ง', 'ไข่']], ['ผัดไทยกุ้งสด', ['เส้น', 'กุ้ง', 'ไข่']],
  ['ต้มยำกุ้ง', ['กุ้ง', 'พริก', 'มะนาว']], ['ผัดผักรวม', ['ผัก', 'กระเทียม', 'ซอส']], ['ก๋วยเตี๋ยวไก่', ['เส้น', 'ไก่', 'ผัก']], ['ไก่ทอดกระเทียม', ['ไก่', 'กระเทียม']],
  ['ส้มตำ', ['ผัก', 'พริก', 'มะนาว']], ['ข้าวมันไก่', ['ข้าว', 'ไก่', 'ซอส']], ['ผัดซีอิ๊ว', ['เส้น', 'หมู', 'ซอส']], ['ยำวุ้นเส้น', ['เส้น', 'กุ้ง', 'มะนาว', 'พริก']],
];
// เมนูลูกค้าดัง (5 อย่าง ทิป ×3)
const CELEB = [['ข้าวผัดอเมริกัน', ['ข้าว', 'ไก่', 'ไข่', 'ซอส', 'ผัก']], ['ต้มยำทะเลรวม', ['กุ้ง', 'พริก', 'มะนาว', 'ผัก', 'เส้น']], ['ผัดไทยจัมโบ้', ['เส้น', 'กุ้ง', 'ไข่', 'ผัก', 'มะนาว']], ['ข้าวกะเพราไข่ดาว', ['ข้าว', 'หมู', 'พริก', 'กระเทียม', 'ไข่']]];
// สถานี: ใส่วัตถุดิบของสถานีตัวเอง = ลงได้ 2 บิลพร้อมกัน
const STATION = { หมู: 'fry', ไก่: 'fry', กุ้ง: 'fry', ไข่: 'fry', ผัก: 'cut', พริก: 'cut', กระเทียม: 'cut', มะนาว: 'cut', ข้าว: 'boil', เส้น: 'boil', ซอส: 'boil' };
const ST_WORD = { หั่น: 'cut', ผัด: 'fry', ทอด: 'fry', ต้ม: 'boil' };
const ST_NAME = { cut: 'หั่น', fry: 'ผัด', boil: 'ต้ม' };
const MAX_BILLS = 3;
const ING_CD = 1500;
const lookup = new Map();
for (const [k, al] of Object.entries(ING)) for (const a of al) lookup.set(a.toLowerCase().replace(/\s+/g, ''), k);

module.exports = function kitchen(G) {
  const D = G.data;
  D.served ||= 0;
  D.best ||= 0;
  D.chefs ||= {};
  let S;
  let seq = 0;

  function reset() {
    S = { station: new Map(), nextCeleb: Date.now() + 80_000, bills: [], nextBill: Date.now() + 2500, combo: 0, served: 0, tips: 0, missed: 0, last: new Map(), live: {}, likes: 0, vipUntil: 0, pts: new Map(), hist: [] };
  }
  const crowd = () => Math.min(40, G.crowd());
  function addBill(vip = false, celeb = false) {
    const [dish, need] = celeb ? CELEB[Math.floor(Math.random() * CELEB.length)] : RECIPES[Math.floor(Math.random() * RECIPES.length)];
    const max = (vip ? 60 : celeb ? 75 : 32 + need.length * 9) * 1000;
    S.bills.push({ id: ++seq, dish, need, have: [], t0: Date.now(), until: Date.now() + max, max, ready: 0, vip, celeb, by: {} });
    G.ev({ ev: 'bill', dish, vip, celeb });
  }
  function stationOf(u) {
    if (!S.station.has(u.id)) {
      const n = { cut: 0, fry: 0, boil: 0 };
      for (const s of S.station.values()) n[s] += 1;
      const s = Object.entries(n).sort((a, b) => a[1] - b[1])[0][0];
      S.station.set(u.id, s);
      G.ev({ ev: 'station', id: u.id, name: u.name, st: s, auto: true });
    }
    return S.station.get(u.id);
  }
  function credit(u, n = 1) {
    if (!u?.id) return;
    const l = (S.live[u.id] ||= { n: u.name, c: 0 });
    l.n = u.name;
    l.c += n;
    if (!G.test(u.id)) {
      const c = (D.chefs[u.id] ||= { n: u.name, c: 0 });
      c.n = u.name;
      c.c += n;
    }
  }
  function serve(b, u, auto) {
    S.bills = S.bills.filter((x) => x !== b);
    S.combo += 1;
    S.served += 1;
    D.served += 1;
    D.best = Math.max(D.best, S.combo);
    const fast = 1 - (Date.now() - b.t0) / b.max;
    let tip = Math.round((10 + b.need.length * 5) * (1 + fast) * (1 + Math.min(10, S.combo) * 0.1) * (b.vip ? 4 : b.celeb ? 3 : 1) * (auto ? 0.5 : 1));
    S.tips += tip;
    S.hist.push(1);
    S.hist = S.hist.slice(-12);
    for (const id of Object.keys(b.by)) {
      G.addPoints({ id, name: b.by[id] }, 1);
      G.coin({ id, name: b.by[id] }, Math.max(2, Math.round(tip / 10)));
    }
    if (u) credit(u, 2);
    G.save();
    G.ev({ ev: 'serve', bid: b.id, dish: b.dish, tip, combo: S.combo, by: u?.name || null, auto: !!auto, vip: b.vip, celeb: b.celeb });
    if (S.combo % 5 === 0) G.log('game', `🍳 คอมโบ ×${S.combo}! (${b.dish})`);
  }

  function tick(dt, t) {
    // บิลหมดเวลา
    for (const b of [...S.bills]) {
      if (t >= b.until) {
        S.bills = S.bills.filter((x) => x !== b);
        S.combo = 0;
        S.missed += 1;
        S.hist.push(0);
        S.hist = S.hist.slice(-12);
        G.ev({ ev: 'expire', bid: b.id, dish: b.dish });
        G.push(true);
      } else if (b.ready && t - b.ready > 6000) {
        serve(b, null, true);
        G.push(true);
      }
    }
    // บิลใหม่ (คนดูเยอะ = มาไวขึ้น) • ลูกค้าดังนาน ๆ มาที
    if (S.bills.length < MAX_BILLS && t >= S.nextBill) {
      const celeb = t >= S.nextCeleb;
      if (celeb) S.nextCeleb = t + 80_000 + Math.random() * 40_000;
      addBill(t < S.vipUntil, celeb);
      S.nextBill = t + Math.max(4000, 12_000 - crowd() * 200) + Math.random() * 3000;
      G.push(true);
    }
  }
  function onChat(u, n) {
    if (['เสิร์ฟ', 'เสริฟ', 'ส่ง', 'serve'].includes(n)) {
      const b = S.bills.filter((x) => x.ready).sort((a, c) => a.ready - c.ready)[0];
      if (b) {
        serve(b, u, false);
        G.push(true);
      }
      return true;
    }
    if (ST_WORD[n]) {
      S.station.set(u.id, ST_WORD[n]);
      G.ev({ ev: 'station', id: u.id, name: u.name, st: ST_WORD[n] });
      G.push();
      return true;
    }
    const ing = lookup.get(n);
    if (!ing) return false;
    const mySt = stationOf(u);
    const t = Date.now();
    const key = u.id + ing;
    if (t - (S.last.get(key) || 0) < ING_CD) return true;
    S.last.set(key, t);
    // ใส่ให้บิลที่เก่าสุดที่ยังขาดวัตถุดิบนี้ (สถานีตรง = ลงได้ 2 บิล)
    const cand = S.bills.filter((x) => !x.ready && x.need.includes(ing) && !x.have.includes(ing)).sort((a, c) => a.t0 - c.t0);
    const b = cand[0];
    if (!b) {
      G.ev({ ev: 'waste', id: u.id, name: u.name, ing });
      return true;
    }
    const expert = STATION[ing] === mySt;
    for (const bb of expert ? cand.slice(0, 2) : [b]) {
      bb.have.push(ing);
      bb.by[u.id] = u.name;
      if (bb.have.length >= bb.need.length) bb.ready = t;
    }
    credit(u, expert ? 2 : 1);
    G.stat(u, 'cook', 1);
    if (t - (S.pts.get(u.id) || 0) > 20_000) {
      S.pts.set(u.id, t);
      G.addPoints(u, 1);
    }
    G.ev({ ev: 'add', id: u.id, name: u.name, ing, bid: b.id, ready: !!b.ready, expert, n: expert ? Math.min(2, cand.length) : 1 });
    G.push();
    return true;
  }
  function fillOne() {
    const b = S.bills.filter((x) => !x.ready).sort((a, c) => a.t0 - c.t0)[0];
    if (!b) return null;
    const miss = b.need.find((i) => !b.have.includes(i));
    if (!miss) return null;
    b.have.push(miss);
    if (b.have.length >= b.need.length) b.ready = Date.now();
    return { bid: b.id, ing: miss };
  }
  function onLike(u, count) {
    S.likes += count;
    if (S.likes >= 100) {
      S.likes = 0;
      const r = fillOne();
      if (r) G.ev({ ev: 'add', id: null, name: 'ไฟลุกโชน', ...r });
      G.push();
    }
  }
  function onGift(u, total, tier) {
    if (tier === 1) {
      const r = fillOne();
      if (r) G.ev({ ev: 'add', id: u.id, name: u.name, ...r });
    } else if (tier === 2) {
      for (const b of S.bills) b.until += 15_000;
    } else {
      S.vipUntil = Date.now() + 60_000;
      for (let k = 0; k < 3; k++) fillOne();
      if (S.bills.length < MAX_BILLS) addBill(true);
    }
    G.ev({ ev: 'gift', tier, id: u.id, name: u.name });
    G.push(true);
  }
  function onGoal(goal) {
    if (goal?.effect === 'g9') {
      S.vipUntil = Date.now() + 60_000;
      for (let k = 0; k < 4; k++) fillOne();
      G.ev({ ev: 'gift', tier: 3 });
      G.push(true);
    }
  }
  function snapshot(full) {
    const t = Date.now();
    const rate = S.hist.length ? S.hist.reduce((a, b) => a + b, 0) / S.hist.length : 1;
    const s = {
      bills: S.bills.map((b) => ({ id: b.id, dish: b.dish, need: b.need, have: b.have, left: Math.max(0, Math.ceil((b.until - t) / 1000)), max: Math.round(b.max / 1000), ready: !!b.ready, vip: b.vip, celeb: b.celeb })),
      stations: (() => {
        const n = { cut: 0, fry: 0, boil: 0 };
        for (const s of S.station.values()) n[s] += 1;
        return n;
      })(),
      combo: S.combo, served: S.served, tips: S.tips, missed: S.missed, stars: Math.max(1, Math.min(5, Math.round(rate * 5))), best: D.best, total: D.served,
      top: Object.values(S.live).sort((a, b) => b.c - a.c).slice(0, 3), vip: t < S.vipUntil, lead: G.topId(),
    };
    if (full) {
      s.fame = Object.values(D.chefs).sort((a, b) => b.c - a.c).slice(0, 3);
      s.stationOf = Object.fromEntries(S.station);
    }
    return s;
  }
  function admin(action) {
    if (action === 'celeb') {
      S.nextCeleb = 0;
      S.nextBill = 0;
      if (S.bills.length >= MAX_BILLS) S.bills.shift();
      return { ok: true };
    }
    if (action === 'bill') {
      if (S.bills.length < MAX_BILLS) addBill(false);
      G.push(true);
      return { ok: true };
    }
    if (action === 'reset') {
      Object.assign(D, { served: 0, best: 0, chefs: {} });
      G.save();
      return { ok: true };
    }
    return { ok: false, error: 'ไม่รู้จักคำสั่ง' };
  }
  return { reset, tick, onChat, onLike, onGift, onGoal, snapshot, admin };
};
module.exports.ING = ING;
module.exports.RECIPES = RECIPES;
