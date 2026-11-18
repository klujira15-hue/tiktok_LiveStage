// มินิเกม “เลี้ยงน้องกวางวิเศษ” — ทั้งไลฟ์ช่วยกันเลี้ยงน้อง 1 ตัว (โมเดล 3D) • น้องโตข้ามไลฟ์ (เก็บใน data/minigames.json)
// คนดูพิมพ์ ให้อาหาร / เล่น / เดินเล่น / ลูบหัว / อาบน้ำ / นอน / ตื่น → น้องทำท่าตามคิว • กดใจ = ความสุข • ของขวัญ = ของพิเศษ
// ค่าอิ่ม สุข พลัง สะอาด ลดลงเองระหว่างไลฟ์ (ไม่มีวันตาย แค่งอแงบอกว่าอยากได้อะไร)
// วัย: เด็กน้อย → เด็ก → วัยรุ่น → โตเต็มวัย (ร่างตอนโตแยกตามวิธีเลี้ยง: สายกิน / สายซน / สายอ้อน)
'use strict';

const STAGES = [
  { name: 'เด็กน้อย', need: 0 },
  { name: 'วัยเด็ก', need: 400 },
  { name: 'วัยรุ่น', need: 1500 },
  { name: 'โตเต็มวัย', need: 4000 },
];
const FORMS = { feed: 'สายกิน', play: 'สายซน', pet: 'สายอ้อน' };
// คำสั่ง → ท่า
const WORDS = {
  feed: ['ให้อาหาร', 'กิน', 'อาหาร', 'ป้อน', 'ป้อนข้าว', 'หิว', 'feed', 'กินข้าว'],
  play: ['เล่น', 'เล่นกัน', 'play', 'วิ่ง'],
  walk: ['เดินเล่น', 'เดิน', 'walk', 'พาเดิน'],
  pet: ['ลูบหัว', 'ลูบ', 'หอม', 'กอด', 'pet', 'เกาคาง'],
  bath: ['อาบน้ำ', 'อาบ', 'bath', 'ล้าง'],
  sleep: ['นอน', 'ไปนอน', 'sleep', 'นอนได้แล้ว'],
  wake: ['ตื่น', 'ตื่นได้แล้ว', 'wake', 'ตื่นนน'],
};
const CMD = {};
for (const [k, list] of Object.entries(WORDS)) for (const w of list) CMD[w] = k;
const DUR = { feed: 6200, play: 7200, walk: 7000, pet: 2800, bath: 5200, gift: 4200, evolve: 6500 };
// ผลของแต่ละท่า (ต่อครั้ง) — ค่าเพิ่มตามจำนวนคนที่ช่วยกันสั่ง (สูงสุด ×3)
const EFFECT = {
  feed: { F: 22, H: 4, E: 0, C: -3, xp: 12 },
  play: { F: -6, H: 18, E: -12, C: -6, xp: 14 },
  walk: { F: -4, H: 12, E: -6, C: -3, xp: 10 },
  pet: { F: 0, H: 10, E: 0, C: 0, xp: 6 },
  bath: { F: 0, H: 4, E: -2, C: 40, xp: 10 },
};
// ของขวัญ = ของพิเศษ
const ITEMS = {
  g1: { name: 'ขนมหวาน', icon: '🍬', anim: 'feed', F: 15, H: 8, xp: 20 },
  g2: { name: 'หอมแก้ม', icon: '😘', anim: 'pet', H: 20, xp: 25 },
  g3: { name: 'ลูกบอล', icon: '⚽', anim: 'play', H: 22, E: -6, xp: 35 },
  g4: { name: 'สบู่ฟองฟู่', icon: '🫧', anim: 'bath', C: 60, H: 6, xp: 45 },
  g5: { name: 'ตะกร้าผลไม้', icon: '🧺', anim: 'feed', F: 60, H: 12, xp: 60 },
  g6: { name: 'หมอนเมฆนุ่ม', icon: '☁️', anim: 'gift', E: 100, H: 10, xp: 120 },
  g7: { name: 'มงกุฎดอกไม้', icon: '🌸', anim: 'gift', H: 30, xp: 200, crown: 1 },
  g8: { name: 'ฝูงผีเสื้อทอง', icon: '🦋', anim: 'gift', F: 40, H: 40, E: 40, C: 40, xp: 300 },
  g9: { name: 'พรแห่งป่า', icon: '🌟', anim: 'gift', F: 100, H: 100, E: 100, C: 100, xp: 800, glow: 1 },
};
const LIKE_STEP = 100; // กดใจครบทุก 100 = สุข +4 + หัวใจลอย
// ไข่: คนดูช่วยกันอุ่นไข่ (คอมเมนต์อะไรก็ได้ = 6 • กดใจ = 1 • ของขวัญ = เพชร×3) ครบเป้าแล้วฟัก (คัทซีน)
const HATCH_NEED = 400;
// สุ่มชนิดน้องตอนฟัก (โมเดลใน public/models/pet-<id>.glb)
const SPECIES = { stag: 'กวางวิเศษ', deer: 'กวางน้อย', fox: 'จิ้งจอกส้ม', shiba: 'ชิบะ', alpaca: 'อัลปาก้า', husky: 'ฮัสกี้', dragon: 'มังกรน้อย', bee: 'ผึ้งน้อย', frog: 'กบน้อย' };
const HATCH_MS = 10_500;
const CARE_PTS = { feed: 3, play: 3, walk: 2, pet: 2, bath: 3 };

module.exports = function pet(G) {
  const D = G.data;
  D.pet ||= { egg: true, warm: 0, xp: 0, stage: 0, form: null, care: { feed: 0, play: 0, pet: 0 }, born: Date.now(), lives: 0 };
  D.pet.st ||= { F: 70, H: 70, E: 80, C: 80 };
  D.parents ||= {}; // คนดูแลรวมทุกไลฟ์ { id: { n, p } }
  const P = D.pet;
  let S;
  const now = () => Date.now();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function reset() {
    S = { pid: 1, act: null, queue: [], sleep: false, sleepAt: 0, likes: 0, crown: 0, glow: 0, carers: new Map(), want: null, wantAt: 0, lastDecay: now(), lastSay: 0, warmAt: new Map(), warmEv: 0, warmAcc: 0 };
    P.lives = (P.lives || 0) + 1;
    G.save();
  }
  const stageOf = (xp) => STAGES.reduce((s, x, i) => (xp >= x.need ? i : s), 0);
  function addStats(e, k = 1) {
    for (const key of ['F', 'H', 'E', 'C']) if (e[key]) P.st[key] = clamp(P.st[key] + e[key] * k, 0, 100);
  }
  function care(u, pts) {
    if (!u?.id || u.id === 'admin' || u.id === 'goal') return;
    const r = S.carers.get(u.id) || { n: u.name, p: 0 };
    r.n = u.name || r.n;
    r.p += pts;
    S.carers.set(u.id, r);
    const g = (D.parents[u.id] ||= { n: u.name, p: 0 });
    g.n = u.name || g.n;
    g.p += pts;
    G.stat(u, 'care', pts);
  }
  function grow(xp, kind) {
    const was = P.stage;
    P.xp += Math.round(xp);
    if (kind && P.care[kind] != null) P.care[kind] += 1;
    const st = stageOf(P.xp);
    if (st > was) {
      P.stage = st;
      if (st === 3 && !P.form) {
        const top = Object.entries(P.care).sort((a, b) => b[1] - a[1])[0][0];
        P.form = top;
      }
      // พิธีโต: เล่นต่อจากท่าที่ทำอยู่
      // พิธีโตต่อคิวหลังพิธีโตอันก่อน (โตหลายขั้นติดกันจะเล่นตามลำดับ)
      let at = 0;
      while (at < S.queue.length && S.queue[at].k === 'evolve') at++;
      S.queue.splice(at, 0, { k: 'evolve', by: '', ids: [], n: 1, stage: st });
      G.log?.('game', `🌟 น้องโตเป็น${STAGES[st].name}แล้ว (${P.xp} แต้มเติบโต)`);
    }
    G.save();
  }

  // ---------------------------------------------------------------- ไข่ → ฟัก
  const hatching = () => S.act?.k === 'hatch';
  function warm(u, pts, o = {}) {
    if (!P.egg || hatching()) return;
    P.warm = Math.min(HATCH_NEED, (P.warm || 0) + pts);
    care(u, pts * 0.5);
    // แจ้งหน้าเวทีให้ไข่ขยับ (รวมแต้มทุก ~0.35 วิ ไม่ยิงถี่เกิน)
    S.warmAcc += pts;
    if (o.gift || now() - S.warmEv > 350) {
      G.ev({ ev: 'warm', by: u?.name || '', pts: S.warmAcc, gift: o.gift || null });
      S.warmAcc = 0;
      S.warmEv = now();
    }
    if (P.warm >= HATCH_NEED) startHatch();
    G.push();
  }
  function startHatch() {
    // สุ่มชนิด (ไม่ซ้ำตัวที่เพิ่งเลี้ยงถ้าเลือกได้)
    const ids = Object.keys(SPECIES).filter((k) => k !== P.lastSpecies);
    P.species = ids[Math.floor(Math.random() * ids.length)];
    S.queue = [];
    S.sleep = false;
    S.act = { k: 'hatch', by: '', ids: [], n: 1, pid: ++S.pid, t0: now(), until: now() + HATCH_MS, dur: HATCH_MS, species: P.species };
    G.ev({ ev: 'act', ...S.act });
    G.log?.('game', `🐣 ไข่กำลังฟัก! ได้น้อง${SPECIES[P.species]}`);
    G.push(true);
  }
  function finishHatch() {
    Object.assign(P, { egg: false, warm: 0, xp: 0, stage: 0, form: null, care: { feed: 0, play: 0, pet: 0 }, born: now(), st: { F: 80, H: 90, E: 80, C: 90 } });
    G.save();
  }

  // ---------------------------------------------------------------- คิวท่าทาง
  function enqueue(k, u, extra = {}) {
    if (S.sleep && k !== 'wake') {
      // นอนอยู่: ปลุกก่อนถ้าสั่งอย่างอื่น (ยกเว้นลูบหัว = ลูบเบา ๆ ตอนหลับ)
      if (k === 'pet') {
        addStats({ H: 3 });
        care(u, 1);
        G.ev({ ev: 'sleepPet', by: u.name });
        return G.push();
      }
      wake(u);
    }
    const last = S.queue[S.queue.length - 1];
    const cur = S.act;
    // คนสั่งท่าเดียวกันซ้ำ = มาช่วยกัน (ไม่ต่อคิวใหม่)
    const same = !extra.item && (cur && cur.k === k && !cur.item && now() < cur.until - 800 ? cur : last && last.k === k && !last.item ? last : null);
    if (same) {
      if (!same.ids.includes(u.id)) {
        same.ids.push(u.id);
        same.n = Math.min(3, same.ids.length);
        care(u, CARE_PTS[k] || 1);
        G.ev({ ev: 'join', k, by: u.name, n: same.ids.length });
      }
      return G.push();
    }
    if (S.queue.length >= 4 && !extra.item) {
      G.ev({ ev: 'busy', by: u.name });
      return;
    }
    S.queue.push({ k, by: u.name, ids: [u.id], n: 1, ...extra });
    if (!extra.item) care(u, CARE_PTS[k] || 1);
    if (!S.act) next();
    G.push(true);
  }
  function next() {
    const a = S.queue.shift();
    if (!a) {
      S.act = null;
      return G.push(true);
    }
    const ms = DUR[a.item ? (ITEMS[a.item].anim === 'gift' ? 'gift' : ITEMS[a.item].anim) : a.k] || 4000;
    S.act = { ...a, pid: ++S.pid, t0: now(), until: now() + ms, dur: ms };
    // ผลเกิดตอนเริ่มท่า (หน้าเวทีเล่นภาพตามเวลาเอง)
    if (a.item) {
      const it = ITEMS[a.item];
      addStats(it, 1);
      if (it.crown) S.crown = 1;
      if (it.glow) S.glow = now() + 120_000;
      grow(it.xp * (a.count || 1), null);
    } else if (EFFECT[a.k]) {
      addStats(EFFECT[a.k], 1 + (a.n - 1) * 0.5);
      grow(EFFECT[a.k].xp * (1 + (a.n - 1) * 0.5), a.k);
    }
    G.ev({ ev: 'act', ...S.act });
    G.push(true);
  }
  function sleep(u) {
    if (S.sleep) return;
    S.queue = [];
    S.act = null;
    S.sleep = true;
    S.sleepAt = now();
    G.ev({ ev: 'sleep', by: u?.name || '' });
    G.push(true);
  }
  function wake(u) {
    if (!S.sleep) return;
    S.sleep = false;
    G.ev({ ev: 'wake', by: u?.name || '' });
    G.push(true);
  }

  // น้องอยากได้อะไร (ค่าไหนต่ำสุดและต่ำกว่า 35)
  function wantOf() {
    if (P.egg) return null;
    if (S.sleep) return P.st.E >= 100 ? 'wake' : null;
    const low = [['F', 'feed'], ['C', 'bath'], ['E', 'sleep'], ['H', 'play']].filter(([k]) => P.st[k] < 35).sort((a, b) => P.st[a[0]] - P.st[b[0]]);
    return low[0]?.[1] || null;
  }

  function tick() {
    const t = now();
    if (S.act && t >= S.act.until) {
      if (S.act.k === 'hatch') finishHatch();
      next();
    }
    // ค่าลดลงเอง (เฉพาะตอนมีคนดู) ต่อวินาที
    const dt = (t - S.lastDecay) / 1000;
    if (dt >= 5) {
      S.lastDecay = t;
      if (P.egg) {
        // ไข่ไม่หิวไม่ง่วง
      } else if (G.crowd() > 0) {
        if (S.sleep) addStats({ E: 1.2 * dt, F: -0.02 * dt, H: 0, C: 0 });
        else addStats({ F: -0.05 * dt, H: -0.035 * dt, E: -0.02 * dt, C: -0.025 * dt });
      } else if (S.sleep) addStats({ E: 1.2 * dt });
      // นอนจนพลังเต็มแล้วตื่นเอง
      if (S.sleep && P.st.E >= 100 && t - S.sleepAt > 20_000) wake(null);
      const w = wantOf();
      if (w !== S.want) {
        S.want = w;
        if (w && t - S.lastSay > 20_000) {
          S.lastSay = t;
          G.ev({ ev: 'want', k: w });
        }
      }
      G.push();
      G.save();
    }
  }

  const carers = (n) => [...S.carers.values()].sort((a, b) => b.p - a.p).slice(0, n);
  const parents = (n) => Object.values(D.parents).sort((a, b) => b.p - a.p).slice(0, n);

  reset();
  return {
    reset() {
      reset();
      G.push(true);
    },
    tick,
    onChat(u, n) {
      const k = CMD[n];
      if (P.egg) {
        // คอมเมนต์อะไรก็ได้ช่วยอุ่นไข่ (คนละครั้งทุก 2.5 วิ) • คำสั่งดูแลน้องถือเป็นการอุ่นไข่ด้วย
        const last = S.warmAt.get(u.id) || 0;
        if (now() - last >= 2500) {
          S.warmAt.set(u.id, now());
          warm(u, 6);
        }
        return !!k;
      }
      if (!k) return false;
      if (k === 'sleep') {
        care(u, 1);
        sleep(u);
        return true;
      }
      if (k === 'wake') {
        care(u, 1);
        wake(u);
        return true;
      }
      enqueue(k, u);
      return true;
    },
    onLike(u, count) {
      if (P.egg) return warm(u, count);
      S.likes += count;
      while (S.likes >= LIKE_STEP) {
        S.likes -= LIKE_STEP;
        addStats({ H: 4 });
        grow(4, null);
        G.ev({ ev: 'love' });
      }
      care(u, count * 0.05);
      G.push();
    },
    onGift(u, total, tier, g) {
      const key = g?.effect && ITEMS[g.effect] ? g.effect : ['g1', 'g5', 'g8'][tier - 1];
      const it = ITEMS[key];
      if (P.egg) return warm(u, Math.max(30, (total || 1) * 3), { gift: it.icon });
      care(u, 5 + Math.min(200, total || 1));
      if (S.sleep && key !== 'g6') wake(u);
      // ของขวัญได้คิวก่อน (ต่อหลังท่าที่ทำอยู่)
      const item = { k: it.anim, by: u.name, ids: [u.id], n: 1, item: key, count: Math.max(1, Math.min(5, g?.count || 1)) };
      const firstPlain = S.queue.findIndex((q) => !q.item && q.k !== 'evolve');
      if (firstPlain >= 0) S.queue.splice(firstPlain, 0, item);
      else S.queue.push(item);
      if (S.queue.length > 8) S.queue.length = 8;
      if (!S.act) next();
      G.push(true);
    },
    // เป้าเพชรครบ = ฝูงผีเสื้อทอง (ทุกค่า +40) • เป้าใจครบ = หอมแก้ม
    onGoal(goal) {
      if (P.egg) return warm({ id: 'goal', name: goal?.label === 'เพชร' ? 'เป้าเพชร' : 'เป้าใจ' }, 150, { gift: '🎯' });
      this.onGift({ id: 'goal', name: goal?.label === 'เพชร' ? 'เป้าเพชร' : 'เป้าใจ' }, 0, 1, { effect: goal?.label === 'เพชร' ? 'g8' : 'g2' });
    },
    admin(action, d) {
      const sys = { id: 'admin', name: 'ผู้จัดไลฟ์' };
      // ปุ่ม "ล้างข้อมูลข้ามไลฟ์ของเกมนี้": เริ่มเลี้ยงตัวใหม่ตั้งแต่ไข่ + ล้างรายชื่อคนดูแลสะสม
      if (action === 'reset') {
        D.parents = {};
        reset();
        return this.admin('newpet');
      }
      if (action === 'setstage' && STAGES[d?.st]) {
        // ทดสอบ: ตั้งวัยทันที (ไม่มีพิธีโต)
        Object.assign(P, { stage: d.st, xp: STAGES[d.st].need, egg: false });
        return G.push(true), { ok: true };
      }
      if (action === 'species' && SPECIES[d?.s]) {
        // ทดสอบ: เปลี่ยนชนิดน้องทันที
        P.species = d.s;
        return G.push(true), { ok: true };
      }
      if (action === 'hatch') {
        if (!P.egg) return { ok: false, error: 'น้องฟักออกมาแล้ว' };
        if (hatching()) return { ok: false, error: 'กำลังฟักอยู่' };
        P.warm = HATCH_NEED;
        return startHatch(), { ok: true };
      }
      if (P.egg && (WORDS[action] || ['item', 'grow', 'hungry', 'setform'].includes(action))) return { ok: false, error: 'ยังเป็นไข่อยู่ — กด “ฟักเลย” ก่อน' };
      if (WORDS[action]) {
        if (action === 'sleep') return S.sleep ? wake(sys) : sleep(sys), { ok: true };
        if (action === 'wake') return wake(sys), { ok: true };
        return enqueue(action, sys), { ok: true };
      }
      if (action === 'item' && ITEMS[d?.k]) return this.onGift(sys, 0, 1, { effect: d.k }), { ok: true };
      if (action === 'grow') {
        const nx = STAGES[P.stage + 1];
        if (!nx) return { ok: false, error: 'น้องโตเต็มวัยแล้ว' };
        return grow(nx.need - P.xp, null), !S.act && next(), G.push(true), { ok: true };
      }
      if (action === 'hungry') {
        // ทดสอบ: ค่าลดฮวบให้เห็นตอนงอแง
        P.st = { F: 12, H: 30, E: 50, C: 25 };
        return G.push(true), { ok: true };
      }
      if (action === 'newpet') {
        // เลี้ยงตัวใหม่ (เริ่มจากเด็กน้อย) — ปุ่มหลังบ้านมีกล่องยืนยัน
        P.lastSpecies = P.species || 'stag';
        Object.assign(P, { egg: true, warm: 0, xp: 0, stage: 0, form: null, care: { feed: 0, play: 0, pet: 0 }, born: Date.now(), lives: 1, st: { F: 70, H: 70, E: 80, C: 80 } });
        S.queue = [];
        S.act = null;
        S.crown = 0;
        S.glow = 0;
        S.sleep = false;
        return G.save(), G.push(true), { ok: true, reload: true };
      }
      if (action === 'setform' && (d?.f in FORMS || d?.f === null)) {
        // ทดสอบ: ดูร่างโตเต็มวัยแต่ละแบบ
        Object.assign(P, { xp: Math.max(P.xp, STAGES[3].need), stage: 3, form: d.f });
        return G.push(true), { ok: true };
      }
      return { ok: false };
    },
    snapshot() {
      const t = now();
      const a = S.act;
      const st = P.stage;
      return {
        egg: !!P.egg, warm: Math.round(P.warm || 0), warmNeed: HATCH_NEED,
        // ระหว่างเป็นไข่ยังไม่บอกชนิด (ลุ้นตอนฟัก) — เปิดเผยตอนเริ่มคัทซีน
        species: P.egg && !hatching() ? null : P.species || 'stag', speciesName: P.egg && !hatching() ? null : SPECIES[P.species || 'stag'],
        xp: P.xp, stage: st, stageName: STAGES[st].name, nextNeed: STAGES[st + 1]?.need || null, prevNeed: STAGES[st].need, form: P.form, formName: P.form ? FORMS[P.form] : null,
        st: { F: Math.round(P.st.F), H: Math.round(P.st.H), E: Math.round(P.st.E), C: Math.round(P.st.C) },
        act: a ? { k: a.k, pid: a.pid, by: a.by, n: a.ids.length, item: a.item || null, count: a.count || 1, left: Math.max(0, a.until - t), dur: a.dur, stage: a.stage } : null,
        queue: S.queue.map((q) => ({ k: q.k, by: q.by, n: q.ids.length, item: q.item || null })),
        sleep: S.sleep, want: S.want, crown: S.crown, glow: S.glow > t, likes: S.likes, likeStep: LIKE_STEP,
        carers: carers(5).map((r) => ({ n: r.n, p: Math.round(r.p) })), parents: parents(3).map((r) => ({ n: r.n, p: Math.round(r.p) })),
        days: Math.max(1, Math.floor((t - (P.born || t)) / 86_400_000) + 1), lives: P.lives || 1,
        items: Object.fromEntries(Object.entries(ITEMS).map(([k, v]) => [k, { name: v.name, icon: v.icon }])),
      };
    },
  };
};
