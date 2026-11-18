// เกมหนีออกจากตึก (ธีม escape “ตึกเงียบ 19 ชั้น”) — มุมมองหลังตัวละคร ไฟฉายส่องทาง
// เดินลงจากชั้น 19 ถึงชั้น 1 ทีละห้อง: แต่ละห้องมีประตู 2–3 บาน คนดูพิมพ์ 1/2/3 โหวต ประตูที่ได้มากสุดคือทางที่เดิน
// หลังประตูมี: บันไดลงชั้น / ทางเดินต่อ / กุญแจ / กับดัก / ทางตัน / ผู้ดูแลไล่ (ต้องกดใจ+พิมพ์ “วิ่ง” ให้ทัน) / บันทึกเนื้อเรื่อง / สมบัติ
// ชั้น 13 มีบอส • ชั้น 1 ต้องหนีรอบสุดท้ายก่อนออกจากตึก → ฉากจบ แล้วเริ่มรอบใหม่
// เซิร์ฟเวอร์ตัดสินทุกอย่าง (ประตู/ผล/เวลา) หน้าเวทีแค่เล่นภาพตามช่วง (phase) ที่ส่งไป
'use strict';

const FLOORS = 19;
// โซนฉาก (ชั้นบนสุดของโซนคือจุดเริ่มใหม่ตอนถูกจับ)
const ZONES = [[19, 18, 17], [16, 15, 14], [13], [12, 11, 10], [9, 8, 7], [6, 5, 4], [3, 2], [1]];
const zoneOf = (f) => Math.max(0, ZONES.findIndex((z) => z.includes(f)));
const BOSS_FLOOR = 13;
const NOTES = 8;
const MAX = { hearts: 5, keys: 3, charm: 2 };
const LIKE_PEEK = 300; // กดใจครบ = ไฟฉายส่องฟรี 1 ประตู
const RUN_WORTH = 10; // พิมพ์ “วิ่ง” 1 ครั้ง = ใจ 10 ดวงตอนหนีผี
const DUR = {
  intro: 14000, zone: 8000, vote: 15000, walk: 3200,
  hall: 1800, key: 3000, trap: 3600, dead: 3000, locked: 3400, unlock: 3000, note: 9000, treasure: 3600, stairs: 3800,
  ghost: 3200, escaped: 3000, hit: 3400, caught: 7000, power: 6000, elevator: 8000, ending: 34000,
};
const CHASE = { ghost: 12000, boss: 18000, finale: 22000 };
const OUT_OK = new Set(['stairs', 'exit', 'hall', 'key', 'trap', 'dead', 'ghost', 'note', 'treasure']);
const GOOD = new Set(['stairs', 'hall', 'key', 'note', 'treasure', 'exit']);
const RUN_WORDS = new Set(['วิ่ง', 'วิ่งๆ', 'วิ่งๆๆ', 'วิ่งเร็ว', 'หนี', 'หนีๆ', 'รีบ', 'run', 'go']);
// คำโหวต → ประตู (2 บาน: ซ้าย/ขวา • 3 บาน: ซ้าย/กลาง/ขวา)
const PICK = { 1: 0, '๑': 0, ซ้าย: 0, left: 0, l: 0, 2: 1, '๒': 1, 3: 2, '๓': 2, กลาง: 1, ตรง: 1, center: 1, c: 1 };

module.exports = function escape(G) {
  const D = G.data;
  D.wins ||= 0; // หนีออกจากตึกสำเร็จกี่รอบ (ตลอดกาล)
  D.lowest ||= FLOORS; // ชั้นต่ำสุดที่เคยไปถึง
  let S;
  const now = () => Date.now();
  const rnd = Math.random;
  const ri = (n) => Math.floor(rnd() * n);

  function reset(keepRun) {
    S = {
      run: keepRun ? S.run + 1 : (S?.run || 0) + 1,
      floor: FLOORS, roomNo: 0, doors: [], seed: 1, phase: 'intro', until: now() + DUR.intro, dur: DUR.intro, pid: (S?.pid || 0) + 1, ph: {},
      votes: new Map(), pick: -1, res: null,
      hearts: 3, keys: 0, charm: 0, bell: 0, notes: 0, charge: 0, pendPeek: 0, rush: false, queue: [],
      chase: null, mercy: 1, exp: new Map(), guides: new Map(), deaths: 0,
    };
    newRoom(true);
  }

  // ---------------------------------------------------------------- ห้อง/ประตู
  function newRoom(first) {
    S.roomNo = first ? 0 : S.roomNo + 1;
    const z = zoneOf(S.floor);
    const n = S.floor === 1 || S.floor === BOSS_FLOOR ? 2 : z >= 3 && rnd() < 0.3 ? 3 : 2;
    const pS = (S.floor === 1 ? [0.5, 0.8, 1] : [0.4, 0.65, 1])[Math.min(2, S.roomNo)];
    const doors = Array.from({ length: n }, () => ({ o: 'hall', rev: false, gone: false, lock: false }));
    if (rnd() < pS) {
      const d = doors[ri(n)];
      d.o = S.floor === 1 ? 'exit' : 'stairs';
      d.lock = d.o === 'stairs' && z >= 1 && S.floor !== BOSS_FLOOR && rnd() < 0.22;
    }
    const table = [
      ['hall', 3], ['key', S.keys < MAX.keys ? 1.6 : 0.2], ['trap', 1.2 + z * 0.15], ['dead', 1.4],
      ['ghost', S.bell > 0 || S.floor === 1 ? 0 : 0.9 + z * 0.12], ['note', S.notes < NOTES ? 2 : 0], ['treasure', 0.8],
    ];
    const sum = table.reduce((a, [, w]) => a + w, 0);
    for (const d of doors) {
      if (d.o === 'stairs' || d.o === 'exit') continue;
      let x = rnd() * sum;
      for (const [o, w] of table) if ((x -= w) <= 0) { d.o = o; break; }
    }
    S.doors = doors;
    S.seed = 1 + ri(1e9);
    S.bell = Math.max(0, S.bell - 1);
  }
  const open = () => S.doors.map((d, i) => (d.gone ? -1 : i)).filter((i) => i >= 0);

  // ---------------------------------------------------------------- ช่วงเวลา
  function setPhase(name, ms, ph = {}) {
    S.phase = name;
    S.until = now() + ms;
    S.dur = ms;
    S.pid += 1;
    S.ph = ph;
    G.push(true);
  }
  function startVote() {
    // ของขวัญใหญ่ที่รอคิว (ไฟกลับมา / ลิฟต์) ทำก่อนโหวตห้องถัดไป
    const q = S.queue.shift();
    if (q) return skipFloors(q.type, q.n, q.by);
    S.votes = new Map();
    S.pick = -1;
    S.res = null;
    if (S.pendPeek) {
      const n = S.pendPeek;
      S.pendPeek = 0;
      peek(null, n, true);
    }
    const left = open();
    let ms = left.length <= 1 ? 4000 : DUR.vote;
    if (S.rush) {
      S.rush = false;
      ms = Math.min(ms, 5000);
    }
    setPhase('vote', ms);
  }
  function enterFloor(f, why) {
    const z0 = zoneOf(S.floor);
    S.floor = f;
    D.lowest = Math.min(D.lowest, f);
    G.save();
    newRoom(true);
    if (zoneOf(f) !== z0 || why === 'caught') setPhase('zone', DUR.zone, { z: zoneOf(f), why });
    else startVote();
  }
  function counts() {
    const c = S.doors.map(() => 0);
    for (const d of S.votes.values()) if (c[d] !== undefined) c[d] += 1;
    return c;
  }
  function decide() {
    const c = counts();
    const left = open();
    const best = Math.max(0, ...left.map((i) => c[i]));
    const tied = left.filter((i) => c[i] === best);
    S.pick = tied[ri(tied.length)];
    const total = c.reduce((a, b) => a + b, 0);
    setPhase('walk', DUR.walk, { pick: S.pick, auto: total === 0, n: c[S.pick] || 0, total });
  }
  function credit(o) {
    const good = GOOD.has(o);
    for (const [id, d] of S.votes) {
      if (d !== S.pick) continue;
      const r = S.exp.get(id);
      if (!r) continue;
      if (good) {
        r.p += o === 'stairs' || o === 'exit' ? 2 : 1;
        G.stat({ id, name: r.n }, 'good', 1);
        G.coin({ id, name: r.n }, o === 'treasure' ? 5 : o === 'stairs' || o === 'exit' ? 2 : 1);
      }
    }
  }
  function resolve() {
    const d = S.doors[S.pick];
    const o = d.o;
    S.res = o;
    d.rev = true;
    credit(o);
    switch (o) {
      case 'stairs':
      case 'exit':
        if (d.lock) {
          if (S.keys > 0) {
            S.keys -= 1;
            d.lock = false;
            return setPhase('unlock', DUR.unlock, { pick: S.pick });
          }
          // ไม่มีกุญแจ: ถ้ายังมีประตูอื่นให้ย้อนกลับไปเลือกใหม่ • ไม่มีทางอื่นแล้ว = พังประตู (เสียหัวใจ)
          if (open().length > 1) {
            d.gone = true;
            return setPhase('locked', DUR.locked, { pick: S.pick, back: true });
          }
          d.lock = false;
          hurt(1);
          return setPhase('locked', DUR.locked, { pick: S.pick, bash: true });
        }
        if (S.floor === BOSS_FLOOR || o === 'exit') return startChase(o === 'exit' ? 'finale' : 'boss');
        return setPhase('stairs', DUR.stairs, { from: S.floor, to: S.floor - 1 });
      case 'key':
        S.keys = Math.min(MAX.keys, S.keys + 1);
        return setPhase('key', DUR.key);
      case 'trap':
        if (S.charm > 0) {
          S.charm -= 1;
          return setPhase('trap', DUR.trap, { blocked: true });
        }
        hurt(1);
        return setPhase('trap', DUR.trap, { hearts: S.hearts });
      case 'dead':
        d.gone = true;
        return setPhase('dead', DUR.dead, { pick: S.pick });
      case 'ghost':
        return startChase('ghost');
      case 'note':
        S.notes = Math.min(NOTES, S.notes + 1);
        return setPhase('note', DUR.note, { n: S.notes - 1 });
      case 'treasure':
        return setPhase('treasure', DUR.treasure, { n: [...S.votes.values()].filter((v) => v === S.pick).length });
      default:
        return setPhase('hall', DUR.hall);
    }
  }
  function hurt(n) {
    S.hearts = Math.max(0, S.hearts - n);
  }
  // เป้าวิ่งหนี: ตามจำนวนคนดู • หนีไม่รอดบอส/ทางออกซ้ำ ๆ เป้าจะลดลงเรื่อย ๆ (ไลฟ์คนน้อยก็จบเกมได้)
const need = (kind) => Math.max(20, Math.round(Math.min(1500, 60 + G.crowd() * 12) * (kind === 'boss' ? 2 : kind === 'finale' ? 2.5 : 1) * S.mercy));
  function startChase(kind) {
    S.chase = { kind, got: 0, need: need(kind), runners: new Map() };
    setPhase('ghost', DUR.ghost, { kind });
  }
  function endChase() {
    const C = S.chase;
    const ok = C.got >= C.need || S.mercy < 0.25;
    const top = [...C.runners.values()].sort((a, b) => b.v - a.v)[0] || null;
    if (ok || S.charm > 0) {
      if (!ok) S.charm -= 1;
      S.chase = null;
      S.mercy = 1;
      return setPhase('escaped', DUR.escaped, { kind: C.kind, charm: !ok, top: top?.n || '' });
    }
    hurt(1);
    if (C.kind !== 'ghost') S.mercy *= 0.6;
    setPhase('hit', DUR.hit, { kind: C.kind, hearts: S.hearts });
  }
  // ถูกจับ: กลับไปชั้นบนสุดของโซน หัวใจเต็ม 3 กุญแจหาย
  function caught() {
    S.deaths += 1;
    const top = ZONES[zoneOf(S.floor)][0];
    setPhase('caught', DUR.caught, { to: top });
  }
  function skipFloors(type, n, by) {
    const to = Math.max(1, S.floor - n);
    setPhase(type, DUR[type], { from: S.floor, to, by: by || '' });
  }

  // ---------------------------------------------------------------- เดินเวลา
  function tick() {
    const t = now();
    if (S.phase === 'chase' && S.chase && S.chase.got >= S.chase.need) return endChase();
    if (t < S.until) return;
    switch (S.phase) {
      case 'intro':
        return startVote();
      case 'zone':
        return startVote();
      case 'vote':
        return decide();
      case 'walk':
        return resolve();
      case 'stairs':
        return enterFloor(S.ph.to);
      case 'unlock':
        if (S.floor === BOSS_FLOOR || S.res === 'exit') return startChase(S.res === 'exit' ? 'finale' : 'boss');
        return setPhase('stairs', DUR.stairs, { from: S.floor, to: S.floor - 1 });
      case 'locked':
        if (S.ph.bash) {
          if (S.hearts <= 0) return caught();
          if (S.floor === BOSS_FLOOR || S.res === 'exit') return startChase(S.res === 'exit' ? 'finale' : 'boss');
          return setPhase('stairs', DUR.stairs, { from: S.floor, to: S.floor - 1 });
        }
        return startVote();
      case 'dead':
        return startVote();
      case 'trap':
        if (S.hearts <= 0) return caught();
        newRoom();
        return startVote();
      case 'ghost':
        return setPhase('chase', CHASE[S.chase.kind], { kind: S.chase.kind });
      case 'chase':
        return endChase();
      case 'escaped':
        if (S.ph.kind === 'boss') return setPhase('stairs', DUR.stairs, { from: S.floor, to: S.floor - 1 });
        if (S.ph.kind === 'finale') return finish();
        newRoom();
        return startVote();
      case 'hit':
        if (S.hearts <= 0) {
          S.chase = null;
          return caught();
        }
        // บอส/ทางออก: ต้องหนีให้รอด — เริ่มไล่ใหม่ • ผีธรรมดา: ไปห้องถัดไป
        if (S.ph.kind !== 'ghost') return startChase(S.ph.kind);
        S.chase = null;
        newRoom();
        return startVote();
      case 'caught':
        S.hearts = 3;
        S.keys = 0;
        S.queue = [];
        return enterFloor(S.ph.to, 'caught');
      case 'power':
      case 'elevator':
        return enterFloor(S.ph.to);
      case 'ending':
        G.ev({ ev: 'newRun', run: S.run + 1 });
        return reset(true);
      default:
        newRoom();
        return startVote();
    }
  }
  function finish() {
    D.wins += 1;
    D.lowest = 1;
    G.save();
    G.log('game', `🚪 หนีออกจากตึกสำเร็จ! (รอบที่ ${S.run} • ถูกจับ ${S.deaths} ครั้ง)`);
    setPhase('ending', DUR.ending, { wins: D.wins, deaths: S.deaths, exp: topExp(5), guides: topGuides(5) });
  }

  // ---------------------------------------------------------------- ของขวัญ / ใจ
  function peek(u, n, quiet) {
    const hidden = S.doors.map((d, i) => (!d.gone && !d.rev ? i : -1)).filter((i) => i >= 0);
    const shown = [];
    for (let k = 0; k < n && hidden.length; k++) {
      const i = hidden.splice(ri(hidden.length), 1)[0];
      S.doors[i].rev = true;
      shown.push({ d: i, o: S.doors[i].o, lock: S.doors[i].lock });
    }
    if (shown.length) G.ev({ ev: 'peek', by: u?.name || '', shown, quiet: !!quiet });
    G.push(true);
    return shown.length;
  }
  const inRoom = () => S.phase === 'vote';
  function guide(u, v) {
    const r = S.guides.get(u.id) || { n: u.name, v: 0 };
    r.n = u.name || r.n;
    r.v += v;
    S.guides.set(u.id, r);
  }
  function gift(u, key, count, total) {
    count = Math.max(1, Math.min(9, count || 1));
    guide(u, total || 1);
    const by = u.name;
    switch (key) {
      case 'g1':
      case 'g6': {
        const n = key === 'g6' ? 9 : count;
        if (inRoom()) peek(u, n);
        else S.pendPeek = Math.min(3, S.pendPeek + n);
        return G.ev({ ev: 'gift', k: key === 'g6' ? 'peekAll' : 'peek', by, later: !inRoom() });
      }
      case 'g2':
        if (inRoom()) S.until = Math.min(S.until, now() + 3000);
        else S.rush = true;
        G.push(true);
        return G.ev({ ev: 'gift', k: 'rush', by });
      case 'g3':
        S.keys = Math.min(MAX.keys, S.keys + count);
        G.push(true);
        return G.ev({ ev: 'gift', k: 'key', by, n: S.keys });
      case 'g4':
        S.hearts = Math.min(MAX.hearts, S.hearts + count);
        G.push(true);
        return G.ev({ ev: 'gift', k: 'heart', by, n: S.hearts });
      case 'g5':
        S.charm = Math.min(MAX.charm, S.charm + 1);
        G.push(true);
        return G.ev({ ev: 'gift', k: 'charm', by, n: S.charm });
      case 'g7':
        S.bell = 5;
        if (S.chase && (S.phase === 'chase' || S.phase === 'ghost')) S.chase.got = S.chase.need;
        G.push(true);
        return G.ev({ ev: 'gift', k: 'bell', by });
      case 'g8':
      case 'g9': {
        const type = key === 'g8' ? 'power' : 'elevator';
        const n = key === 'g8' ? 1 : 3;
        if (S.floor === 1) return G.ev({ ev: 'gift', k: 'cheer', by });
        if (inRoom()) skipFloors(type, n, by);
        else if (S.queue.length < 3) S.queue.push({ type, n, by });
        return G.ev({ ev: 'gift', k: type, by, later: !inRoom() });
      }
      default:
        return G.ev({ ev: 'gift', k: 'cheer', by });
    }
  }

  const topExp = (n) => [...S.exp.values()].filter((r) => r.p > 0).sort((a, b) => b.p - a.p).slice(0, n);
  const topGuides = (n) => [...S.guides.values()].sort((a, b) => b.v - a.v).slice(0, n);

  reset();
  return {
    reset() {
      S = null;
      reset();
    },
    tick,
    onChat(u, n) {
      if (S.phase === 'chase' || S.phase === 'ghost') {
        if (!RUN_WORDS.has(n)) return false;
        const C = S.chase;
        const r = C.runners.get(u.id) || { n: u.name, v: 0, at: 0 };
        if (now() - r.at < 800) return true;
        r.at = now();
        r.v += RUN_WORTH;
        C.runners.set(u.id, r);
        C.got += RUN_WORTH; // นับตั้งแต่ผู้ดูแลโผล่ (ช่วง ghost) ด้วย
        G.ev({ ev: 'run', by: u.name });
        G.push();
        return true;
      }
      if (S.phase !== 'vote') return false;
      let d = PICK[n];
      if (n === 'ขวา' || n === 'right' || n === 'r') d = S.doors.length - 1;
      if (d === undefined || !S.doors[d] || S.doors[d].gone) return false;
      const was = S.votes.get(u.id);
      S.votes.set(u.id, d);
      const r = S.exp.get(u.id) || { n: u.name, p: 0 };
      r.n = u.name || r.n;
      S.exp.set(u.id, r);
      if (was !== d) G.ev({ ev: 'vote', d, by: u.name, id: u.id });
      G.push();
      return true;
    },
    onLike(u, count) {
      if ((S.phase === 'chase' || S.phase === 'ghost') && S.chase) {
        S.chase.got += count;
        const r = S.chase.runners.get(u.id) || { n: u.name, v: 0, at: 0 };
        r.v += count;
        S.chase.runners.set(u.id, r);
        return G.push();
      }
      S.charge += count;
      if (S.charge >= LIKE_PEEK) {
        S.charge -= LIKE_PEEK;
        if (inRoom()) peek({ name: 'พลังใจ' }, 1);
        else S.pendPeek = Math.min(3, S.pendPeek + 1);
        G.ev({ ev: 'gift', k: 'likePeek', by: 'พลังใจทุกคน', later: !inRoom() });
      }
      G.push();
    },
    onGift(u, total, tier, g) {
      gift(u, g?.effect || ['g1', 'g4', 'g8'][tier - 1], g?.count || 1, total);
    },
    // เป้าเพชรครบ = ไฟกลับมา (ลง 1 ชั้น) • เป้าใจครบ = หัวใจ +1
    onGoal(goal) {
      if (goal?.label === 'เพชร') gift({ id: 'goal', name: 'เป้าเพชร' }, 'g8', 1, 0);
      else gift({ id: 'goal', name: 'เป้าใจ' }, 'g4', 1, 0);
    },
    admin(action, d) {
      const sys = { id: 'admin', name: 'ผู้จัดไลฟ์' };
      // ทดสอบ: บังคับผลหลังประตูทุกบานในห้องนี้ (ไม่มีปุ่มในหลังบ้าน)
      if (action === 'force' && S.phase === 'vote' && OUT_OK.has(d?.o)) {
        for (const x of S.doors) Object.assign(x, { o: d.o, lock: !!d.lock, gone: false });
        return { ok: true };
      }
      if (action === 'reset') return reset(), G.push(true), { ok: true };
      if (action === 'next') return (S.until = 0), tick(), { ok: true };
      if (action === 'ghost') {
        if (S.phase !== 'vote') return { ok: false, error: 'ใช้ได้ตอนกำลังโหวตประตู' };
        return startChase('ghost'), { ok: true };
      }
      if (action === 'power') return gift(sys, 'g8', 1, 0), { ok: true };
      if (action === 'elevator') return gift(sys, 'g9', 1, 0), { ok: true };
      if (action === 'peek') return gift(sys, 'g6', 1, 0), { ok: true };
      if (action === 'goto' && d?.f >= 1 && d.f <= FLOORS) return enterFloor(Math.round(d.f), 'goto'), { ok: true }; // ทดสอบ: กระโดดไปชั้น
      if (action === 'finale') {
        if (S.phase !== 'vote') return { ok: false, error: 'ใช้ได้ตอนกำลังโหวตประตู' };
        return skipFloors('elevator', S.floor - 1, 'ผู้จัดไลฟ์'), { ok: true };
      }
      return { ok: false };
    },
    snapshot() {
      const C = S.chase;
      return {
        run: S.run, floor: S.floor, floors: FLOORS, zone: zoneOf(S.floor), roomNo: S.roomNo, seed: S.seed,
        doors: S.doors.map((d) => ({ o: d.rev ? d.o : null, lock: d.rev && d.lock, gone: d.gone })),
        phase: S.phase, pid: S.pid, dur: S.dur, left: Math.max(0, S.until - now()), ph: S.ph, pick: S.pick, res: S.phase === 'vote' ? null : S.res,
        votes: counts(), voters: S.votes.size,
        hearts: S.hearts, keys: S.keys, charm: S.charm, bell: S.bell, notes: S.notes, queue: S.queue.length,
        chase: C ? { kind: C.kind, got: Math.min(C.got, C.need), need: C.need } : null,
        charge: S.charge, chargeMax: LIKE_PEEK,
        exp: topExp(5), guides: topGuides(3), wins: D.wins, lowest: D.lowest, deaths: S.deaths,
      };
    },
  };
};
