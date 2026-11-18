// มินิเกม: แข่งเรือยาวแบ่งทีม (แดง/น้ำเงิน) — รอบละ ~2 นาที
// ready (นับถอยหลัง) → race (พิมพ์ “พาย” ดันเรือ ถึง 100 ก่อนชนะ) → finish (ฉลอง) → รอบใหม่
// เก็บข้ามไลฟ์: จำนวนครั้งที่แต่ละทีมชนะ, สถิติชนะติดกัน, ฝีพายที่พายมากสุดตลอดกาล
'use strict';

const TEAMS = ['r', 'b'];
const NAME = { r: 'ทีมแดง', b: 'ทีมน้ำเงิน' };
const ROW_CD = 1500;
const RACE_MAX = 150_000;

module.exports = function boat(G) {
  const D = G.data;
  D.wins ||= { r: 0, b: 0 };
  D.streak ||= { t: null, n: 0 };
  D.rowers ||= {}; // id → { n, s (ครั้งที่พาย), w (รอบที่ชนะ) }
  let S;

  function reset() {
    S = { heave: null, nextHeave: 0, surge: { r: 0, b: 0 }, round: 1, phase: 'ready', until: Date.now() + 9000, p: { r: 0, b: 0 }, team: new Map(), last: new Map(), strokes: {}, boost: { r: 0, b: 0 }, drum: { r: null, b: null }, giftBy: {}, mvp: null, winner: null, batch: [], pts: new Map() };
  }
  const count = (t) => {
    let n = 0;
    for (const v of S.team.values()) if (v === t) n++;
    return n;
  };
  function teamOf(u, join = true) {
    let t = S.team.get(u.id);
    if (!t && join) {
      t = count('r') <= count('b') ? 'r' : 'b';
      S.team.set(u.id, t);
      G.ev({ ev: 'join', id: u.id, name: u.name, team: t });
      G.push();
    }
    return t;
  }
  const mult = (t) => (Date.now() < S.boost[t] ? 2 : 1);
  function add(t, v, stroke = false) {
    if (S.phase !== 'race') return;
    const o = t === 'r' ? 'b' : 'r';
    // แรงฮึด: ทีมตามหลังช่วงท้ายได้แรงพายเพิ่ม
    if (stroke && S.p[o] >= 80 && S.p[o] - S.p[t] >= 8) {
      v *= 1.5;
      S.surge[t] = Date.now() + 1500;
    }
    S.p[t] = Math.min(100, S.p[t] + v);
    if (S.p[t] >= 100) finish(t);
  }
  function finish(t) {
    S.phase = 'finish';
    S.winner = t;
    S.until = Date.now() + 9000;
    // MVP = พายมากสุดในรอบนี้ (ทีมไหนก็ได้)
    const best = Object.entries(S.strokes).sort((a, b) => b[1].n - a[1].n)[0];
    S.mvp = best ? { id: best[0], name: best[1].name, n: best[1].n } : null;
    if (S.mvp) G.coin({ id: S.mvp.id, name: S.mvp.name }, 10);
    S.heave = null;
    D.wins[t] = (D.wins[t] || 0) + 1;
    if (D.streak.t === t) D.streak.n += 1;
    else D.streak = { t, n: 1 };
    for (const [id, tm] of S.team) {
      if (tm !== t || !S.strokes[id]) continue;
      if (!G.test(id)) (D.rowers[id] ||= { n: S.strokes[id].name, s: 0, w: 0 }).w += 1;
      G.addPoints({ id, name: S.strokes[id].name }, 3);
      G.coin({ id, name: S.strokes[id].name }, 5);
    }
    G.save();
    G.ev({ ev: 'finish', winner: t, mvp: S.mvp, streak: D.streak.n });
    G.log('game', `🚣 รอบที่ ${S.round}: ${NAME[t]}ชนะ!${S.mvp ? ` (ฝีพายเด่น ${S.mvp.name} ${S.mvp.n} ครั้ง)` : ''}`);
    G.push(true);
  }
  function start() {
    S.phase = 'race';
    S.p = { r: 0, b: 0 };
    S.strokes = {};
    S.winner = null;
    S.mvp = null;
    S.until = Date.now() + RACE_MAX;
    S.nextHeave = Date.now() + 30_000 + Math.random() * 15_000;
    S.heave = null;
    G.ev({ ev: 'start', round: S.round });
    G.push(true);
  }

  function tick(dt, t) {
    if (S.phase === 'ready' && t >= S.until) start();
    else if (S.phase === 'race') {
      // เรือไหลเองช้า ๆ (จอไม่นิ่งแม้ไม่มีคนพิมพ์) — ทีมที่มีคนเยอะไม่ได้เปรียบตรงนี้
      for (const tm of TEAMS) add(tm, 0.18 * dt * mult(tm));
      // สัญญาณ “ฮึบ” พร้อมกันทั้งทีม (6 วิ)
      if (!S.heave && t >= S.nextHeave && S.phase === 'race') {
        S.heave = { until: t + 6000, cnt: { r: 0, b: 0 }, who: new Set(), need: { r: Math.max(2, Math.ceil(count('r') * 0.35)), b: Math.max(2, Math.ceil(count('b') * 0.35)) } };
        G.ev({ ev: 'heave', need: S.heave.need });
        G.push(true);
      } else if (S.heave && t >= S.heave.until) {
        const ok = { r: S.heave.cnt.r >= S.heave.need.r, b: S.heave.cnt.b >= S.heave.need.b };
        for (const tm of TEAMS) if (ok[tm]) add(tm, 7 * mult(tm));
        G.ev({ ev: 'heaveEnd', ok, cnt: S.heave.cnt });
        S.heave = null;
        S.nextHeave = t + 35_000 + Math.random() * 15_000;
      }
      if (S.phase === 'race' && t >= S.until) finish(S.p.r >= S.p.b ? 'r' : 'b');
      else G.push();
    } else if (S.phase === 'finish' && t >= S.until) {
      S.round += 1;
      S.phase = 'ready';
      S.until = t + 8000;
      S.p = { r: 0, b: 0 };
      G.push(true);
    }
    if (S.batch.length) {
      G.ev({ ev: 'strokes', list: S.batch.splice(0, 60) });
    }
  }

  function onChat(u, n) {
    if (n === 'ทีมแดง' || n === 'แดง' || n === 'ทีมน้ำเงิน' || n === 'น้ำเงิน') {
      const want = n.includes('แดง') ? 'r' : 'b';
      const cur = S.team.get(u.id);
      if (cur === want) return true;
      // ย้ายได้เมื่อไม่ทำให้ทีมห่างกันเกิน 2 คน
      if (count(want) - (cur ? 1 : 0) > count(want === 'r' ? 'b' : 'r') + 2 - (cur ? 1 : 0)) {
        G.say(u, `${NAME[want]}คนเยอะกว่าแล้ว ช่วย${NAME[want === 'r' ? 'b' : 'r']}ก่อนนะ`);
        return true;
      }
      S.team.set(u.id, want);
      G.ev({ ev: 'join', id: u.id, name: u.name, team: want, moved: true });
      G.push(true);
      return true;
    }
    if (n === 'ทีม' || n === 'ทีมไหน') {
      G.say(u, `อยู่${NAME[teamOf(u)]} 🚣 พิมพ์ “พาย” ช่วยจ้ำ!`);
      return true;
    }
    const t = teamOf(u);
    if (['ฮึบ', 'ฮึบๆ', 'ฮึ้บ', 'ฮึบบ'].includes(n)) {
      if (S.heave && !S.heave.who.has(u.id)) {
        S.heave.who.add(u.id);
        S.heave.cnt[t] += 1;
        G.push();
      }
      return true;
    }
    if (!['พาย', 'พายเลย', 'จ้ำ', 'ซู่', 'row', 'พายๆ'].includes(n)) return false;
    const now = Date.now();
    if (now - (S.last.get(u.id) || 0) < ROW_CD) return true;
    S.last.set(u.id, now);
    if (S.phase !== 'race') return true;
    // พายพร้อมกันหลายคน = ทุกคนได้แรงเท่ากัน (ทีมเล็กจึงยังลุ้นได้ ถ้าพิมพ์ถี่กว่า)
    add(t, 0.9 * mult(t), true);
    G.stat(u, 'stroke');
    const st = (S.strokes[u.id] ||= { name: u.name, n: 0 });
    st.n += 1;
    if (!G.test(u.id)) {
      const r = (D.rowers[u.id] ||= { n: u.name, s: 0, w: 0 });
      r.n = u.name;
      r.s += 1;
      G.save();
    }
    if (now - (S.pts.get(u.id) || 0) > 20_000) {
      S.pts.set(u.id, now);
      G.addPoints(u, 1);
    }
    S.batch.push({ id: u.id, t });
    return true;
  }
  function onLike(u, count) {
    teamOf(u);
    if (S.phase === 'race') for (const tm of TEAMS) add(tm, 0.01 * count);
  }
  function onGift(u, total, tier) {
    const t = teamOf(u);
    S.giftBy[u.id] = (S.giftBy[u.id] || 0) + total;
    // คนตีกลอง = ส่งของขวัญรวมมากสุดในทีม (ไลฟ์นี้)
    const cur = S.drum[t];
    if (!cur || S.giftBy[u.id] > (S.giftBy[cur.id] || 0)) S.drum[t] = { id: u.id, name: u.name };
    if (tier === 1) add(t, Math.min(8, 2 + total * 0.4));
    else if (tier === 2) {
      S.boost[t] = Math.max(Date.now(), S.boost[t]) + 10_000;
      add(t, 3);
    } else {
      S.boost[t] = Math.max(Date.now(), S.boost[t]) + 12_000;
      add(t, 15);
    }
    G.ev({ ev: 'gift', team: t, tier, id: u.id, name: u.name });
    G.push(true);
  }
  function onGoal(goal) {
    if (goal?.effect === 'g9' && S.phase === 'race') {
      for (const tm of TEAMS) (S.boost[tm] = Date.now() + 12_000), add(tm, 10);
      G.ev({ ev: 'gift', team: 'all', tier: 3 });
    }
  }

  function snapshot(full) {
    const t = Date.now();
    const s = {
      phase: S.phase, round: S.round, left: Math.max(0, Math.round((S.until - t) / 1000)), p: { r: +S.p.r.toFixed(1), b: +S.p.b.toFixed(1) },
      n: { r: count('r'), b: count('b') }, boost: { r: Math.max(0, Math.ceil((S.boost.r - t) / 1000)), b: Math.max(0, Math.ceil((S.boost.b - t) / 1000)) },
      drum: S.drum, winner: S.winner, mvp: S.mvp, wins: D.wins, streak: D.streak, lead: G.topId(),
      heave: S.heave ? { left: Math.max(0, Math.ceil((S.heave.until - t) / 1000)), cnt: S.heave.cnt, need: S.heave.need } : null,
      surge: { r: t < S.surge.r ? 1 : 0, b: t < S.surge.b ? 1 : 0 },
    };
    if (full) {
      s.teams = Object.fromEntries(S.team);
      // ไม้พายทอง: พายสะสมครบ 100 ครั้ง
      s.gold = [...S.team.keys()].filter((id) => (G.profOf(id)?.st?.stroke || 0) >= 100);
      s.fame = Object.values(D.rowers).sort((a, b) => b.s - a.s).slice(0, 5).map((r) => ({ n: r.n, s: r.s, w: r.w }));
    }
    return s;
  }
  function admin(action) {
    if (action === 'heave') {
      if (S.phase === 'race') S.nextHeave = 0;
      return { ok: S.phase === 'race', error: 'ต้องอยู่ระหว่างแข่ง' };
    }
    if (action === 'start') {
      if (S.phase !== 'race') start();
      return { ok: true };
    }
    if (action === 'reset') {
      D.wins = { r: 0, b: 0 };
      D.streak = { t: null, n: 0 };
      D.rowers = {};
      G.save();
      return { ok: true };
    }
    return { ok: false, error: 'ไม่รู้จักคำสั่ง' };
  }
  return { reset, tick, onChat, onLike, onGift, onGoal, snapshot, admin };
};
