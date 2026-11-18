// เกมปีนขึ้นฟ้า (ธีม climbcity ปีนตึกนีออน / climbsky เกาะลอยฟ้า) — น้องเด้งกระโดดขึ้นเองเรื่อย ๆ
// ของขวัญ = แกล้งให้ตก (ผลทันที ไม่สุ่มของ) • พิมพ์ "ฮึบ" ครบ 20 = โล่บล็อกการแกล้ง 1 ครั้ง • กดใจครบ 500 = จรวด +20 ม.
// ทุก 50 ม. มีชั้นเซฟ (ตกไม่ต่ำกว่านั้น) • ทุก 100 ม. เปลี่ยนด่าน • ถึง 500 ม. = ขึ้นถึงยอด ฉลองแล้วเริ่มรอบใหม่ (เก็บสถิติ)
// เซิร์ฟเวอร์ตัดสินความสูงทั้งหมด หน้าเวทีแค่วาดตาม (เปิดหลายจอก็ตรงกัน)
'use strict';

const TOP = 500;
const ZONE = 100;
const CHECK = 50;
const RATE = 1.6; // ม./วินาที ตอนปกติ
const HUB_NEED = 20;
const LIKE_NEED = 500;
const ROCKET = 20;
const SHIELD_MAX = 2;
const STORM = 15; // เป้าเพชรครบ = พายุจอมแกล้ง (วินาที) — ปีนช้าลง ไม่หักความสูง
const STORM_MAX = 45;
const HUB_WORDS = new Set(['ฮึบ', 'ฮึบๆ', 'ฮึบๆๆ', 'ฮึ้บ', 'สู้', 'สู้ๆ', 'สู้ๆๆ', 'เชียร์', 'ไปต่อ', 'go', 'gogo']);
// ของขวัญ → การแกล้ง (ตกกี่เมตร) • fog/rain มีผลค้างชั่วครู่
const PRANK = {
  g1: { kind: 'banana', min: 2, max: 4, name: 'วางเปลือกกล้วย' },
  g2: { kind: 'wind', min: 3, max: 5, name: 'ลมพัด' },
  g3: { kind: 'crumble', min: 5, max: 8, name: 'แท่นหลอกพัง' },
  g4: { kind: 'fog', min: 1, max: 2, name: 'หมอกบังทาง', fog: 12 },
  g5: { kind: 'hand', min: 8, max: 13, name: 'มือยักษ์ผลัก' },
  g6: { kind: 'bird', min: 12, max: 17, name: 'นกโฉบ' },
  g7: { kind: 'rain', min: 6, max: 9, name: 'ฝนตกแท่นลื่น', rain: 15 },
  g8: { kind: 'bomb', min: 18, max: 24, name: 'ระเบิดแท่น 3 อัน' },
  g9: { kind: 'quake', min: 30, max: 30, name: 'แผ่นดินไหว' },
};
const r1 = (n) => Math.round(n * 10) / 10;

module.exports = function climb(G) {
  const D = G.data;
  D.best ||= {}; // สถิติสูงสุดตลอดกาล แยกฉาก
  D.tops ||= {}; // ขึ้นถึงยอดกี่ครั้ง แยกฉาก
  let S;
  const scene = () => G.scene?.() || 'city';

  function reset() {
    S = {
      h: 0, best: S?.best || 0, round: (S?.round || 0) + 1, pause: 0, fogUntil: 0, rainUntil: 0, stormUntil: 0, nextSlip: 0, topAt: 0,
      shield: 0, shieldBy: [], hub: 0, likes: 0, lastHub: new Map(),
      pranks: S?.pranks || new Map(), helps: S?.helps || new Map(), lastZone: 0, lastCheck: 0,
    };
  }
  const credit = (map, u, m) => {
    const r = map.get(u.id) || { n: u.name, m: 0 };
    r.n = u.name || r.n;
    r.m = r1(r.m + m);
    map.set(u.id, r);
  };
  const top5 = (map) => [...map.values()].filter((r) => r.m > 0 || r.hub).sort((a, b) => b.m * 10 + (b.hub || 0) - (a.m * 10 + (a.hub || 0))).slice(0, 5);
  const floorOf = (h) => Math.floor(h / CHECK) * CHECK;

  function setH(h, why) {
    const before = S.h;
    S.h = Math.max(0, Math.min(TOP, h));
    // ชั้นเซฟ / ด่าน / สถิติ (เฉพาะตอนขึ้น)
    if (S.h > before) {
      const ck = floorOf(S.h);
      if (ck > S.lastCheck && ck > 0 && ck < TOP) {
        S.lastCheck = ck;
        G.ev({ ev: 'check', h: ck });
      }
      const z = Math.min(4, Math.floor(S.h / ZONE));
      if (z > S.lastZone) {
        S.lastZone = z;
        G.ev({ ev: 'zone', z });
      }
      if (S.h > S.best + 0.05) {
        const rec = Math.floor(S.best / 10) < Math.floor(S.h / 10) && S.best > 20;
        S.best = r1(S.h);
        if (S.h > (D.best[scene()] || 0)) {
          D.best[scene()] = r1(S.h);
          G.save();
        }
        if (rec && why !== 'tick') G.ev({ ev: 'record', h: S.best });
      }
    }
    if (S.h >= TOP && !S.topAt) {
      S.topAt = Date.now();
      D.tops[scene()] = (D.tops[scene()] || 0) + 1;
      G.save();
      G.ev({ ev: 'top', round: S.round, tops: D.tops[scene()], pr: top5(S.pranks)[0] || null, hp: top5(S.helps)[0] || null });
      G.log('game', `🏆 น้องเด้งขึ้นถึงยอด ${TOP} ม. แล้ว! (รอบที่ ${S.round})`);
    }
    G.push();
  }

  function tick(dt, t) {
    if (S.topAt) {
      // ฉลองบนยอด 12 วินาที แล้วเริ่มรอบใหม่ (สถิติ/อันดับอยู่ต่อ)
      if (t - S.topAt > 12000) {
        const keep = { best: S.best, round: S.round, pranks: S.pranks, helps: S.helps, shield: S.shield, shieldBy: S.shieldBy };
        reset();
        Object.assign(S, keep, { round: keep.round + 1, h: 0, lastZone: 0, lastCheck: 0 });
        G.ev({ ev: 'round', round: S.round });
        G.push(true);
      }
      return;
    }
    if (t < S.pause) return;
    let rate = RATE * (t < S.fogUntil ? 0.55 : 1) * (t < S.stormUntil ? 0.5 : 1) * (1 + Math.min(0.25, G.crowd() * 0.01));
    setH(S.h + rate * dt, 'tick');
    // ฝนตก: ลื่นเองเป็นระยะ
    if (t < S.rainUntil && t > S.nextSlip) {
      S.nextSlip = t + 3500 + Math.random() * 1500;
      const to = Math.max(floorOf(S.h), S.h - (1 + Math.random() * 2));
      const lost = r1(S.h - to);
      if (lost > 0.3) {
        if (S.rainBy) credit(S.pranks, S.rainBy, lost);
        setH(to, 'slip');
        S.pause = t + 900;
        G.ev({ ev: 'slip', lost, by: S.rainBy?.name || '' });
      }
    }
  }

  function prank(u, key, count) {
    const P = PRANK[key] || PRANK.g1;
    const t = Date.now();
    if (S.topAt) return;
    // โล่ของทีมช่วยบล็อกได้ 1 ครั้ง
    if (S.shield > 0) {
      S.shield -= 1;
      const maker = S.shieldBy.shift() || null;
      const saved = r1((P.min + P.max) / 2);
      if (maker) credit(S.helps, maker, saved);
      G.ev({ ev: 'blocked', kind: P.kind, by: u.name, id: u.id, helper: maker?.name || '', saved });
      G.log('game', `🛡️ โล่ของ ${maker?.name || 'ทีมช่วย'} บล็อก${P.name}ของ ${u.name}`);
      G.push(true);
      return;
    }
    const mult = 1 + 0.5 * (Math.min(5, count || 1) - 1);
    const drop = (P.min + Math.random() * (P.max - P.min)) * (P.kind === 'quake' ? 1 : mult);
    const from = S.h;
    const to = Math.max(floorOf(from), from - drop);
    const lost = r1(from - to);
    if (P.fog) S.fogUntil = t + P.fog * 1000;
    if (P.rain) {
      S.rainUntil = t + P.rain * 1000;
      S.nextSlip = t + 3000;
      S.rainBy = { id: u.id, name: u.name };
    }
    if (lost > 0) credit(S.pranks, u, lost);
    S.pause = t + (P.kind === 'quake' ? 2600 : P.kind === 'bomb' ? 2200 : 1600);
    G.ev({ ev: 'prank', kind: P.kind, name: P.name, by: u.name, id: u.id, lost, from: r1(from), to: r1(to), safe: floorOf(from), fog: P.fog || 0, rain: P.rain || 0 });
    G.log('game', `😈 ${u.name} ${P.name} → น้องเด้งตก ${lost} ม.`);
    setH(to, 'prank');
    G.push(true);
  }

  function rocket(u, why) {
    if (S.topAt) return;
    const from = S.h;
    const to = Math.min(TOP, from + ROCKET);
    if (u) credit(S.helps, u, r1(to - from));
    S.pause = Date.now() + 2400;
    G.ev({ ev: 'rocket', by: u?.name || '', from: r1(from), to: r1(to), why });
    setH(to, 'rocket');
    G.push(true);
  }

  // เป้าเพชรครบ (ยอดของขวัญ = ฝั่งจอมแกล้ง): พายุพัดน้องเด้ง ปีนช้าลงครึ่งหนึ่ง • ครบหลายรอบในชิ้นเดียว = ต่อเวลา (สูงสุด 45 วิ)
  function storm() {
    if (S.topAt) return;
    const t = Date.now();
    S.stormUntil = Math.min(t + STORM_MAX * 1000, Math.max(t, S.stormUntil) + STORM * 1000);
    const sec = Math.ceil((S.stormUntil - t) / 1000);
    G.ev({ ev: 'storm', sec });
    G.log('game', `🌪️ เพชรครบเป้า — พายุจอมแกล้ง น้องเด้งปีนช้าลง (${sec} วิ)`);
    G.push(true);
  }

  reset();
  return {
    reset() {
      S = null;
      reset();
    },
    tick,
    onChat(u, n) {
      if (!HUB_WORDS.has(n)) return false;
      const t = Date.now();
      if (t - (S.lastHub.get(u.id) || 0) < 1500) return true; // กันพิมพ์รัวคนเดียว
      S.lastHub.set(u.id, t);
      S.hub += 1;
      const r = S.helps.get(u.id) || { n: u.name, m: 0 };
      r.n = u.name;
      r.hub = (r.hub || 0) + 1; // นับคนช่วยเชียร์ (อันดับทีมช่วย = เมตรที่ช่วยไว้ + จำนวนฮึบ)
      S.helps.set(u.id, r);
      G.ev({ ev: 'hub', id: u.id, by: u.name, hub: S.hub });
      if (S.hub >= HUB_NEED) {
        S.hub = 0;
        if (S.shield < SHIELD_MAX) {
          S.shield += 1;
          S.shieldBy.push({ id: u.id, name: u.name });
          G.ev({ ev: 'shield', by: u.name, n: S.shield });
          G.log('game', `🛡️ ${u.name} พิมพ์ครบ — ได้โล่กันแกล้ง (มี ${S.shield})`);
        }
      }
      G.push();
      return true;
    },
    onLike(u, count) {
      S.likes += count;
      if (S.likes >= LIKE_NEED) {
        S.likes -= LIKE_NEED;
        rocket(u, 'like');
      } else G.push();
    },
    onGift(u, total, tier, g) {
      prank(u, g?.effect || ['g1', 'g4', 'g8'][tier - 1], g?.count || 1);
    },
    // ใจครบเป้า (ฝั่งคนช่วย) = จรวด • เพชรครบเป้า (ฝั่งจอมแกล้ง) = พายุ — ของขวัญจึงไม่ทำให้น้องสูงขึ้น
    onGoal(goal) {
      if (goal?.label === 'เพชร') storm();
      else rocket(null, 'goal');
    },
    admin(action) {
      if (action === 'reset') {
        S = null;
        reset();
        G.push(true);
        return { ok: true };
      }
      if (action === 'rocket') return rocket(null, 'admin'), { ok: true };
      if (action === 'storm') return storm(), { ok: true };
      return { ok: false };
    },
    snapshot() {
      const t = Date.now();
      return {
        scene: scene(), h: r1(S.h), best: S.best, allBest: D.best[scene()] || 0, tops: D.tops[scene()] || 0, round: S.round,
        top: TOP, zone: ZONE, check: CHECK, rate: RATE,
        shield: S.shield, hub: S.hub, hubMax: HUB_NEED, likes: S.likes, likeMax: LIKE_NEED,
        fog: Math.max(0, Math.ceil((S.fogUntil - t) / 1000)), rain: Math.max(0, Math.ceil((S.rainUntil - t) / 1000)), storm: Math.max(0, Math.ceil((S.stormUntil - t) / 1000)),
        paused: t < S.pause, atTop: !!S.topAt,
        pranks: top5(S.pranks), helps: top5(S.helps),
      };
    },
  };
};
