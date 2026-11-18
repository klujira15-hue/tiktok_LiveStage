// มินิเกม: ป้องกันปราสาท 3 เลน — มอนสเตอร์เดินลงมาเป็นระลอก คนดูเลือกเลน “ซ้าย/กลาง/ขวา” แล้ว “ยิง”
// ทหารบนกำแพงยิงเองช้า ๆ (ยิ่งคนเฝ้าเลนเยอะ ยิ่งแรง) • ทุก 10 ระลอกเจอบอส • ปราสาทแตก = ถอยกลับ 3 ระลอก (ไม่มีใครเสียอะไร)
// เก็บข้ามไลฟ์: ระลอกสูงสุด, มือธนูที่ล้มศัตรูมากสุด
'use strict';

const LANES = ['ซ้าย', 'กลาง', 'ขวา'];
const KINDS = {
  slime: { hp: 20, sp: 7, dmg: 30 }, bat: { hp: 14, sp: 11, dmg: 25 }, skeleton: { hp: 34, sp: 6, dmg: 45 },
  wisp: { hp: 24, sp: 9, dmg: 35 }, shroom: { hp: 46, sp: 5, dmg: 60 }, boss: { hp: 900, sp: 2.4, dmg: 400 },
};
const HP_MAX = 1000;
const UP = { fire: 'ไฟ', ice: 'น้ำแข็ง', arrow: 'ธนู' };
const UP_WORD = { ไฟ: 'fire', ป้อมไฟ: 'fire', น้ำแข็ง: 'ice', ป้อมน้ำแข็ง: 'ice', ธนู: 'arrow', ป้อมธนู: 'arrow' };
const SHOT_CD = 2000;

module.exports = function castle(G) {
  const D = G.data;
  D.best ||= 0;
  D.archers ||= {};
  let S;
  let eid = 0;

  function reset() {
    S = { up: { fire: 0, ice: 0, arrow: 0 }, vote: null, wave: 1, phase: 'rest', until: Date.now() + 5000, hp: HP_MAX, foes: [], toSpawn: [], nextSpawn: 0, lane: new Map(), last: new Map(), kills: {}, walls: [0, 0, 0], likes: 0, shots: [], pts: new Map() };
  }
  const laneCount = () => {
    const n = [0, 0, 0];
    for (const l of S.lane.values()) n[l] += 1;
    return n;
  };
  function laneOf(u) {
    if (!S.lane.has(u.id)) {
      const n = laneCount();
      const l = n.indexOf(Math.min(...n));
      S.lane.set(u.id, l);
      G.ev({ ev: 'lane', id: u.id, name: u.name, lane: l });
    }
    return S.lane.get(u.id);
  }
  function startWave(t) {
    const w = S.wave;
    const boss = w % 10 === 0;
    const count = Math.min(26, 5 + Math.floor(w * 1.6) + Math.floor(Math.min(30, G.crowd()) / 4));
    const pool = w < 3 ? ['slime', 'bat'] : w < 6 ? ['slime', 'bat', 'skeleton'] : ['slime', 'bat', 'skeleton', 'wisp', 'shroom'];
    S.toSpawn = [];
    for (let i = 0; i < count; i++) S.toSpawn.push({ kind: pool[Math.floor(Math.random() * pool.length)], lane: Math.floor(Math.random() * 3) });
    if (boss) S.toSpawn.push({ kind: 'boss', lane: 1 });
    S.phase = 'fight';
    S.nextSpawn = t + 800;
    G.ev({ ev: 'wave', n: w, boss });
    G.push(true);
  }
  function spawn(s) {
    const k = KINDS[s.kind];
    const scale = (1 + (S.wave - 1) * 0.12) * (1 + Math.min(40, G.crowd()) * 0.04);
    const hp = Math.round(k.hp * scale * (s.kind === 'boss' ? 1 + Math.min(30, G.crowd()) * 0.05 : 1));
    S.foes.push({ id: ++eid, lane: s.lane, kind: s.kind, hp, max: hp, y: 0, sp: k.sp * (0.85 + Math.random() * 0.3), boss: s.kind === 'boss' });
  }
  function hurt(f, d, u, crit = false) {
    if (f.kind === 'skeleton' && u?.id && !crit) d *= 0.6;
    f.hp -= d;
    if (f.hp > 0) return false;
    S.foes = S.foes.filter((x) => x !== f);
    if (f.kind === 'shroom') {
      for (const dy of [-3, 3]) {
        spawn({ kind: 'slime', lane: f.lane });
        S.foes[S.foes.length - 1].y = Math.max(0, f.y + dy);
      }
    }
    if (u?.id) {
      const k = (S.kills[u.id] ||= { n: u.name, k: 0 });
      k.k += 1;
      G.coin(u, f.boss ? 30 : 1);
      G.stat(u, 'kill', 1);
      if (!G.test(u.id)) {
        const a = (D.archers[u.id] ||= { n: u.name, k: 0 });
        a.n = u.name;
        a.k += 1;
        G.save();
      }
    }
    if (f.boss) {
      G.ev({ ev: 'bossDown', by: u?.name || null });
      G.log('game', `🏰 ล้มบอสระลอก ${S.wave} สำเร็จ!${u ? ` (ยิงปิด: ${u.name})` : ''}`);
    }
    return true;
  }
  const front = (lane) => S.foes.filter((f) => f.lane === lane).sort((a, b) => b.y - a.y)[0];

  function tick(dt, t) {
    if (S.vote && t >= S.vote.until) {
        const order = Object.entries(S.vote.c).filter(([k]) => S.up[k] < 3).sort((a, b) => b[1] - a[1]);
        const k = order[0]?.[1] > 0 ? order[0][0] : order[Math.floor(Math.random() * order.length)]?.[0];
        if (k) {
          S.up[k] += 1;
          G.ev({ ev: 'upgrade', kind: k, name: UP[k], lv: S.up[k], votes: S.vote.c });
        }
        S.vote = null;
        G.push(true);
    }
    if (S.phase === 'rest') {
      if (t >= S.until) startWave(t);
      return;
    }
    // ส่งมอนสเตอร์ทีละตัว
    if (S.toSpawn.length && t >= S.nextSpawn && S.foes.length < 30) {
      spawn(S.toSpawn.shift());
      S.nextSpawn = t + Math.max(500, 1600 - S.wave * 60);
    }
    // เดินลงมา (เลนที่มีกำแพงไฟ = หยุด + โดนไฟลวก)
    for (const f of [...S.foes]) {
      if (S.up.fire && f.y > 55) hurt(f, 3 * S.up.fire * dt, null);
      if (!S.foes.includes(f)) continue;
      const slow = 1 - 0.12 * S.up.ice;
      if (t < S.walls[f.lane] && f.kind !== 'bat') {
        if (f.y > 70) hurt(f, 10 * dt, null);
        if (f.y < 74) f.y += f.sp * slow * dt;
      } else f.y += f.sp * slow * dt;
      if (f.y >= 100) {
        S.foes = S.foes.filter((x) => x !== f);
        const d = Math.round(KINDS[f.kind].dmg * (1 + (S.wave - 1) * 0.05));
        S.hp = Math.max(0, S.hp - d);
        G.ev({ ev: 'hitwall', lane: f.lane, d, boss: f.boss });
      }
    }
    // ทหารบนกำแพงยิงเอง (ช้า ๆ) — คนเฝ้าเลนเยอะ = แรงขึ้น
    const n = laneCount();
    for (let l = 0; l < 3; l++) {
      const f = front(l);
      if (f && f.y > 8) {
        const dps = (2 + n[l] * 0.45) * (1 + 0.4 * S.up.arrow);
        if (hurt(f, dps * dt, null)) S.shots.push({ lane: l, id: null, kill: 1 });
      }
    }
    if (S.hp <= 0) {
      G.ev({ ev: 'breach', wave: S.wave });
      G.log('game', `🏰 ปราสาทแตกที่ระลอก ${S.wave} — ถอยไปตั้งหลัก`);
      S.wave = Math.max(1, S.wave - 3);
      S.hp = HP_MAX;
      S.foes = [];
      S.toSpawn = [];
      S.phase = 'rest';
      S.until = t + 8000;
    } else if (!S.toSpawn.length && !S.foes.length) {
      D.best = Math.max(D.best, S.wave);
      G.save();
      G.ev({ ev: 'clear', n: S.wave });
      const voteNow = S.wave % 3 === 0 && Object.values(S.up).some((v) => v < 3);
      S.wave += 1;
      S.hp = Math.min(HP_MAX, S.hp + 120);
      S.phase = 'rest';
      S.until = t + (voteNow ? 15_000 : 6000);
      if (voteNow) {
        S.vote = { until: S.until - 500, c: { fire: 0, ice: 0, arrow: 0 }, who: new Set() };
        G.ev({ ev: 'vote' });
      }
    }
    if (S.shots.length) G.ev({ ev: 'shots', list: S.shots.splice(0, 50) });
    G.push();
  }
  function onChat(u, n) {
    if (UP_WORD[n]) {
      if (S.vote && !S.vote.who.has(u.id) && S.up[UP_WORD[n]] < 3) {
        S.vote.who.add(u.id);
        S.vote.c[UP_WORD[n]] += 1;
        G.push();
      }
      return true;
    }
    const li = { ซ้าย: 0, กลาง: 1, ขวา: 2, left: 0, mid: 1, right: 2 }[n];
    if (li !== undefined) {
      S.lane.set(u.id, li);
      G.ev({ ev: 'lane', id: u.id, name: u.name, lane: li, moved: true });
      G.push();
      return true;
    }
    const l = laneOf(u);
    if (!['ยิง', 'ยิงๆ', 'shoot', 'ยิงเลย'].includes(n)) return false;
    const t = Date.now();
    if (t - (S.last.get(u.id) || 0) < SHOT_CD) return true;
    S.last.set(u.id, t);
    if (t - (S.pts.get(u.id) || 0) > 20_000) {
      S.pts.set(u.id, t);
      G.addPoints(u, 1);
    }
    const f = front(l);
    if (!f || S.phase !== 'fight') {
      S.shots.push({ lane: l, id: u.id, miss: 1 });
      return true;
    }
    const crit = Math.random() < 0.15;
    const kill = hurt(f, (8 + S.wave * 0.6) * (crit ? 2.5 : 1), u, crit);
    S.shots.push({ lane: l, id: u.id, crit: crit ? 1 : 0, kill: kill ? 1 : 0, fy: Math.round(f.y) });
    return true;
  }
  function onLike(u, count) {
    S.likes += count;
    if (S.likes >= 120 && S.phase === 'fight') {
      S.likes = 0;
      for (const f of [...S.foes]) hurt(f, 15, null);
      G.ev({ ev: 'rain' });
    }
  }
  function onGift(u, total, tier) {
    laneOf(u);
    if (tier === 1) for (const f of [...S.foes]) hurt(f, 20 + total * 2, u);
    else if (tier === 2) {
      const cnt = [0, 1, 2].map((l) => S.foes.filter((f) => f.lane === l).length);
      const l = cnt.indexOf(Math.max(...cnt));
      S.walls[l] = Date.now() + 10_000;
    } else {
      for (const f of [...S.foes]) hurt(f, f.boss ? f.max * 0.3 : f.hp, u);
      S.hp = Math.min(HP_MAX, S.hp + 200);
    }
    G.ev({ ev: 'gift', tier, id: u.id, name: u.name });
    G.push(true);
  }
  function onGoal(goal) {
    if (goal?.effect === 'g9') {
      for (const f of [...S.foes]) hurt(f, f.boss ? f.max * 0.3 : f.hp, null);
      G.ev({ ev: 'gift', tier: 3 });
    }
  }
  function snapshot(full) {
    const t = Date.now();
    const s = {
      wave: S.wave, phase: S.phase, left: S.phase === 'rest' ? Math.max(0, Math.round((S.until - t) / 1000)) : 0, hp: S.hp, max: HP_MAX,
      foes: S.foes.map((f) => [f.id, f.lane, f.kind, Math.round(f.y * 10) / 10, Math.round((f.hp / f.max) * 100)]),
      lanes: laneCount(), walls: S.walls.map((w) => Math.max(0, Math.ceil((w - t) / 1000))), remain: S.toSpawn.length + S.foes.length,
      top: Object.values(S.kills).sort((a, b) => b.k - a.k).slice(0, 3), best: D.best, lead: G.topId(), up: S.up,
      vote: S.vote ? { c: S.vote.c, left: Math.max(0, Math.ceil((S.vote.until - t) / 1000)) } : null,
    };
    if (full) {
      s.laneOf = Object.fromEntries(S.lane);
      s.fame = Object.values(D.archers).sort((a, b) => b.k - a.k).slice(0, 3);
    }
    return s;
  }
  function admin(action) {
    if (action === 'vote') {
      if (!S.vote) {
        S.vote = { until: Date.now() + 14_500, c: { fire: 0, ice: 0, arrow: 0 }, who: new Set() };
        if (S.phase === 'rest') S.until = Date.now() + 15_000;
        G.ev({ ev: 'vote' });
        G.push(true);
        return { ok: true };
      }
      return { ok: false, error: 'กำลังโหวตอยู่' };
    }
    if (action === 'wave') {
      if (S.phase === 'rest') startWave(Date.now());
      return { ok: true };
    }
    if (action === 'boss') {
      S.wave = Math.ceil(S.wave / 10) * 10;
      if (S.phase === 'rest') startWave(Date.now());
      else S.toSpawn.push({ kind: 'boss', lane: 1 });
      return { ok: true };
    }
    if (action === 'reset') {
      D.best = 0;
      D.archers = {};
      G.save();
      return { ok: true };
    }
    return { ok: false, error: 'ไม่รู้จักคำสั่ง' };
  }
  return { reset, tick, onChat, onLike, onGift, onGoal, snapshot, admin };
};
