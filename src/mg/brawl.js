// มินิเกม “ศึกหัวร้อน” — คนดูทุกคนได้ตัวละครการ์ตูน 1 ตัว มีเลือด 100 • พิมพ์ “ตี” = ต่อยคนสุ่ม • “หลบ” = หลบหมัดถัดไป
// ของขวัญ = สกิล (ยิ่งแพงยิ่งแรง/โดนหลายคน) • กดใจ = พลังโกรธ (เต็มแล้วหมัดถัดไปคริติคอล) • เลือดหมด = KO กลับมาใหม่หลัง 15 วิ
// รอบละ 3 นาที → คนที่ KO ได้มากสุดเป็นแชมป์ • คนน้อยมีตัวป่วน (บอท) ลงมาให้ตี
// เซิร์ฟเวอร์ตัดสินดาเมจ/KO ทั้งหมด หน้าเวที (public/brawl-engine.js) เล่นภาพตามเหตุการณ์ hit
'use strict';

const MAX_HP = 100;
const ROSTER = 30; // ตัวละครบนจอพร้อมกันสูงสุด (คนอื่นรอข้างสนาม เข้ามาแทนคนที่เงียบนานสุด)
const ROUND_MS = 180_000;
const RESULT_MS = 12_000;
const READY_MS = 5_000;
const RESPAWN_MS = 15_000;
const HIT_CD = 1_400;
const DODGE_CD = 10_000;
const DODGE_MS = 8_000;
const RAGE_MAX = 30; // กดใจ 30 ครั้ง = หมัดคริติคอล 1 ที
const BOT_MIN = 4; // คนจริงน้อยกว่านี้ → มีตัวป่วนลงมาเติม
const BOT_NAMES = ['เจ้าเปี๊ยก', 'ไอ้ตี๋', 'เสือดำ', 'บิ๊กบึ้ม'];
const HIT_WORDS = new Set(['ตี', 'ต่อย', 'ชก', 'เตะ', 'ตบ', 'hit', 'ตีๆ', 'ตีเลย', 'ต่อยเลย', 'อัด', 'ซัด']);
const DODGE_WORDS = new Set(['หลบ', 'dodge', 'หลบๆ', 'กัน']);
// สกิลจากของขวัญ: n = จำนวนเป้า (0 = ทุกคน) • dmg ต่อเป้า • heal • ms = ระยะเวลาสถานะ
const SKILL = {
  g1: { name: 'หมัดชุด', n: 1, dmg: 24 },
  g2: { name: 'ยาแดงวิเศษ', heal: 50 },
  g3: { name: 'เตะลอยฟ้า', n: 1, dmg: 45 },
  g4: { name: 'โล่พลัง', shield: 12_000 },
  g5: { name: 'ขว้างรองเท้าแตะ', n: 3, dmg: 18 },
  g6: { name: 'หมัดพลังไฟ', n: 5, dmg: 24 },
  g7: { name: 'ร่างยักษ์', n: 4, dmg: 25, giant: 15_000 },
  g8: { name: 'พายุทอร์นาโด', frac: 0.6, dmg: 35 },
  g9: { name: 'อุกกาบาตถล่ม', n: 0, dmg: 60 },
};

module.exports = function brawl(G) {
  const D = G.data;
  D.champs ||= []; // แชมป์ย้อนหลัง [{n, k, at}]
  D.best ||= null; // KO มากสุดในรอบเดียว {n, k}
  let S;
  let botSeq = 0;
  const now = () => Date.now();
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const shuffle = (a) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  function reset() {
    S = { phase: 'fight', pid: 1, until: now() + ROUND_MS, dur: ROUND_MS, round: 1, F: new Map(), seq: 0, champ: null, podium: [], lastBot: 0, lastSync: 0 };
    syncAudience(true);
  }
  function setPhase(p, ms) {
    S.phase = p;
    S.pid += 1;
    S.dur = ms;
    S.until = now() + ms;
    G.push(true);
  }

  // ---------------------------------------------------------------- ตัวละคร
  function fighter(u, bot = false) {
    if (!u?.id) return null;
    let f = S.F.get(u.id);
    if (!f) {
      f = { id: u.id, n: String(u.name || 'คนดู').slice(0, 24), c: (S.seq = (S.seq + 1) % 1e6), hp: MAX_HP, ko: 0, kos: 0, dmg: 0, streak: 0, shield: 0, giant: 0, dodge: 0, dodgeAt: 0, rage: 0, hitAt: 0, act: now(), bot, in: now() };
      S.F.set(u.id, f);
      if (!bot) G.ev({ ev: 'join', id: f.id, name: f.n });
    } else if (u.name && !bot) f.n = String(u.name).slice(0, 24);
    return f;
  }
  const touch = (f) => f && (f.act = now());
  // บนจอ = คนที่ขยับล่าสุด ROSTER คน (บอทอยู่ท้ายสุด)
  function roster() {
    return [...S.F.values()].sort((a, b) => (a.bot - b.bot) || b.act - a.act).slice(0, ROSTER);
  }
  const alive = (f) => f && !f.ko;
  function targets(att, n, list = roster()) {
    const pool = list.filter((f) => f.id !== att.id && alive(f));
    shuffle(pool);
    // ชอบตีคนที่ยังไม่มีโล่ก่อน
    pool.sort((a, b) => (a.shield > now()) - (b.shield > now()));
    return n ? pool.slice(0, n) : pool;
  }

  function syncAudience(force) {
    if (!force && now() - S.lastSync < 1000) return;
    S.lastSync = now();
    for (const id of G.audienceIds()) {
      if (S.F.has(id)) continue;
      const a = G.member?.(id);
      if (a) fighter({ id, name: a.name });
    }
    // ตัวป่วน: เติมให้มีอย่างน้อย BOT_MIN ตัวที่ยังยืน (นับคนจริงด้วย)
    const real = [...S.F.values()].filter((f) => !f.bot).length;
    const bots = [...S.F.values()].filter((f) => f.bot);
    const want = Math.max(0, BOT_MIN - real);
    for (let i = bots.length; i < want; i++) fighter({ id: 'bot:' + ++botSeq, name: BOT_NAMES[(botSeq - 1) % BOT_NAMES.length] }, true);
    if (bots.length > want) for (const b of bots.slice(want)) if (b.ko || b.hp === MAX_HP) S.F.delete(b.id);
  }

  // ---------------------------------------------------------------- ดาเมจ
  // คืนรายการผล [{id, d, ko, blk}] blk: 'shield' | 'dodge'
  function hurt(att, list, dmg, o = {}) {
    const res = [];
    for (const t of list) {
      if (!alive(t)) continue;
      if (t.shield > now()) {
        res.push({ id: t.id, d: 0, blk: 'shield' });
        continue;
      }
      if (o.dodgeable && t.dodge > now()) {
        t.dodge = 0;
        res.push({ id: t.id, d: 0, blk: 'dodge' });
        continue;
      }
      const d = Math.max(1, Math.round(dmg * (att.giant > now() ? 2 : 1) * (0.85 + Math.random() * 0.3)));
      t.hp = Math.max(0, t.hp - d);
      if (!att.bot) att.dmg += d;
      const r = { id: t.id, d };
      if (t.hp <= 0) {
        t.ko = now() + RESPAWN_MS;
        t.streak = 0;
        t.shield = 0;
        t.giant = 0;
        r.ko = 1;
        if (!att.bot && !t.bot) {
          att.kos += 1;
          att.streak += 1;
          G.stat({ id: att.id, name: att.n }, 'ko', 1);
          G.coin({ id: att.id, name: att.n }, 2);
          if (att.streak >= 3) r.streak = att.streak;
        } else if (!att.bot && t.bot) {
          att.kos += 1;
          att.streak += 1;
          G.coin({ id: att.id, name: att.n }, 1);
        }
      }
      res.push(r);
    }
    return res;
  }

  function punch(f, target) {
    const crit = f.rage >= RAGE_MAX;
    if (crit) f.rage = 0;
    const [t] = target ? [target] : targets(f, 1);
    if (!t) return false;
    const res = hurt(f, [t], crit ? rnd(20, 26) : rnd(6, 10), { dodgeable: true });
    G.ev({ ev: 'hit', k: crit ? 'crit' : 'punch', a: f.id, by: f.n, t: res });
    G.push();
    return true;
  }

  function skill(f, key, count = 1) {
    const K = SKILL[key];
    if (!K) return;
    const reps = Math.max(1, Math.min(5, count || 1));
    // ส่งของขวัญตอนโดน KO = ฟื้นทันที
    if (f.ko) {
      f.ko = 0;
      f.hp = MAX_HP;
      G.ev({ ev: 'revive', id: f.id, by: f.n });
    }
    touch(f);
    const out = { ev: 'hit', k: key, a: f.id, by: f.n, name: K.name, n: reps, t: [] };
    if (K.heal) {
      f.hp = Math.min(MAX_HP, f.hp + K.heal * reps);
      out.heal = f.hp;
    }
    if (K.shield) f.shield = Math.max(f.shield, now()) + K.shield * reps;
    if (K.giant) f.giant = Math.max(f.giant, now()) + K.giant * Math.min(reps, 3);
    if (K.dmg) {
      const pool = targets(f, 0);
      const n = K.frac ? Math.max(1, Math.ceil(pool.length * K.frac)) : K.n === 0 ? pool.length : Math.min(pool.length, K.n * (key === 'g1' || key === 'g3' ? 1 : Math.min(reps, 3)));
      const list = pool.slice(0, n);
      out.t = hurt(f, list, K.dmg * (key === 'g1' || key === 'g3' ? reps : 1));
    }
    G.ev(out);
    G.push(true);
  }

  // ---------------------------------------------------------------- รอบ
  function endRound() {
    const real = [...S.F.values()].filter((f) => !f.bot);
    const rank = real.filter((f) => f.kos > 0 || f.dmg > 0).sort((a, b) => b.kos - a.kos || b.dmg - a.dmg);
    S.podium = rank.slice(0, 3).map((f) => ({ id: f.id, n: f.n, k: f.kos, d: f.dmg, c: f.c }));
    S.champ = S.podium[0] || null;
    if (S.champ) {
      D.champs.unshift({ n: S.champ.n, k: S.champ.k, at: now() });
      D.champs.length = Math.min(D.champs.length, 10);
      if (!D.best || S.champ.k > D.best.k) D.best = { n: S.champ.n, k: S.champ.k };
      G.stat({ id: S.champ.id, name: S.champ.n }, 'champ', 1);
      G.coin({ id: S.champ.id, name: S.champ.n }, 20);
      G.addPoints({ id: S.champ.id, name: S.champ.n }, 50);
      G.log?.('game', `👑 ${S.champ.n} เป็นแชมป์ศึกหัวร้อน รอบ ${S.round} (${S.champ.k} KO)`);
      G.save();
    }
    setPhase('result', RESULT_MS);
  }
  function newRound() {
    S.round += 1;
    for (const f of S.F.values()) Object.assign(f, { hp: MAX_HP, ko: 0, kos: 0, dmg: 0, streak: 0, shield: 0, giant: 0, dodge: 0, rage: 0 });
    S.champ = null;
    S.podium = [];
    setPhase('fight', ROUND_MS);
  }

  function tick() {
    const t = now();
    syncAudience();
    if (S.phase === 'fight') {
      for (const f of S.F.values()) {
        if (f.ko && t >= f.ko) {
          f.ko = 0;
          f.hp = MAX_HP;
          G.ev({ ev: 'revive', id: f.id });
          G.push();
        }
      }
      // ตัวป่วนต่อยคนสุ่มเป็นระยะ (ยิ่งคนน้อยยิ่งบ่อย ให้มีอะไรขยับตลอด)
      const bots = [...S.F.values()].filter((f) => f.bot && alive(f));
      if (bots.length && t - S.lastBot > 2600) {
        S.lastBot = t;
        const b = bots[Math.floor(Math.random() * bots.length)];
        const [v] = targets(b, 1);
        if (v) {
          const res = hurt(b, [v], rnd(3, 6), { dodgeable: true });
          G.ev({ ev: 'hit', k: 'punch', a: b.id, by: b.n, t: res, bot: 1 });
          G.push();
        }
      }
      if (t >= S.until) endRound();
    } else if (S.phase === 'result' && t >= S.until) setPhase('ready', READY_MS);
    else if (S.phase === 'ready' && t >= S.until) newRound();
  }

  // ตี ชื่อคน → ตีคนนั้น (ถ้าอยู่บนจอและยังยืน)
  function named(f, raw) {
    const m = String(raw || '').trim().match(/^(?:ตี|ต่อย|ชก|เตะ|ตบ|อัด|ซัด)\s*@?(.+)$/);
    if (!m) return null;
    const q = m[1].trim().toLowerCase();
    if (!q) return null;
    return roster().find((x) => x.id !== f.id && alive(x) && x.n.toLowerCase().startsWith(q)) || null;
  }

  const rankNow = () => [...S.F.values()].filter((f) => !f.bot && (f.kos || f.dmg)).sort((a, b) => b.kos - a.kos || b.dmg - a.dmg).slice(0, 5).map((f) => ({ id: f.id, n: f.n, k: f.kos, d: f.dmg }));

  reset();
  return {
    reset() {
      reset();
    },
    tick,
    onChat(u, n, raw) {
      const f = fighter(u);
      if (!f) return false;
      touch(f);
      const tgt = S.phase === 'fight' ? named(f, raw) : null;
      if (HIT_WORDS.has(n) || tgt) {
        if (S.phase !== 'fight') return true;
        if (f.ko) return true; // นอนอยู่ ตีไม่ได้ (ส่งของขวัญเพื่อฟื้นทันที)
        if (now() - f.hitAt < HIT_CD) return true;
        f.hitAt = now();
        punch(f, tgt);
        return true;
      }
      if (DODGE_WORDS.has(n)) {
        if (S.phase !== 'fight' || f.ko) return true;
        if (now() - f.dodgeAt < DODGE_CD) return true;
        f.dodgeAt = now();
        f.dodge = now() + DODGE_MS;
        G.ev({ ev: 'dodge', id: f.id });
        G.push();
        return true;
      }
      G.push(); // คนใหม่โผล่บนจอ
      return false;
    },
    onLike(u, count) {
      const f = fighter(u);
      if (!f) return;
      touch(f);
      const was = f.rage >= RAGE_MAX;
      f.rage = Math.min(RAGE_MAX, f.rage + count);
      if (!was && f.rage >= RAGE_MAX) G.ev({ ev: 'rage', id: f.id });
      G.push();
    },
    onGift(u, total, tier, g) {
      const f = fighter(u);
      if (!f) return;
      if (S.phase !== 'fight') {
        // ช่วงประกาศผล: เก็บเป็นฮีล/โล่ไว้ใช้รอบหน้าไม่คุ้ม → เต้นฉลองแทน
        touch(f);
        return G.ev({ ev: 'cheer', id: f.id, by: f.n });
      }
      skill(f, g?.effect || ['g1', 'g6', 'g9'][tier - 1], g?.count || 1);
    },
    // เป้าเพชรครบ = ทุกคนเลือดเต็ม + ฟื้นหมด • เป้าใจครบ = ทุกคนพลังโกรธเต็ม
    onGoal(goal) {
      if (S.phase !== 'fight') return;
      if (goal?.label === 'เพชร') {
        for (const f of S.F.values()) Object.assign(f, { hp: MAX_HP, ko: 0 });
        G.ev({ ev: 'party', k: 'heal' });
      } else {
        for (const f of S.F.values()) if (!f.bot) f.rage = RAGE_MAX;
        G.ev({ ev: 'party', k: 'rage' });
      }
      G.push(true);
    },
    admin(action, d) {
      if (action === 'reset') return reset(), G.push(true), { ok: true };
      if (action === 'end') {
        if (S.phase !== 'fight') return { ok: false, error: 'ใช้ได้ตอนกำลังต่อสู้' };
        return endRound(), { ok: true };
      }
      if (action === 'next') return (S.until = 0), tick(), { ok: true };
      if (action === 'heal') return this.onGoal({ label: 'เพชร' }), { ok: true };
      if (action === 'rage') return this.onGoal({ label: 'ใจ' }), { ok: true };
      // ปุ่มทดสอบสกิล: ผู้จัดไลฟ์ลงสนามเอง
      if (action === 'skill' && SKILL[d?.k]) {
        if (S.phase !== 'fight') return { ok: false, error: 'ใช้ได้ตอนกำลังต่อสู้' };
        const f = fighter({ id: 'admin', name: 'ผู้จัดไลฟ์' });
        return skill(f, d.k, 1), { ok: true };
      }
      if (action === 'bots') {
        // ทดสอบ: ใส่คนดูปลอม n คน
        for (let i = 0; i < Math.min(40, d?.n || 10); i++) fighter({ id: 'test:b' + i, name: 'นักสู้' + (i + 1) });
        return G.push(true), { ok: true };
      }
      return { ok: false };
    },
    snapshot() {
      const t = now();
      return {
        phase: S.phase, pid: S.pid, dur: S.dur, left: Math.max(0, S.until - t), round: S.round,
        // [id, ชื่อ, สี, เลือด, KO อีกกี่ms, KO ได้, สถานะ(1=โล่ 2=ยักษ์ 4=หลบ 8=โกรธเต็ม 16=บอท), พลังโกรธ]
        f: roster().map((f) => [f.id, f.n, f.c, f.hp, f.ko ? Math.max(0, f.ko - t) : 0, f.kos, (f.shield > t ? 1 : 0) | (f.giant > t ? 2 : 0) | (f.dodge > t ? 4 : 0) | (f.rage >= RAGE_MAX ? 8 : 0) | (f.bot ? 16 : 0), f.rage]),
        total: [...S.F.values()].filter((f) => !f.bot).length,
        standing: [...S.F.values()].filter((f) => !f.bot && alive(f)).length,
        rank: rankNow(), champ: S.champ, podium: S.podium, champs: D.champs.slice(0, 3), best: D.best, rageMax: RAGE_MAX, maxHp: MAX_HP,
      };
    },
  };
};
