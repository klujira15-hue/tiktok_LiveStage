// เกมที่คนดูเล่นได้ฟรีผ่านคอมเมนต์
// - แบ่งทีมแข่ง (ชักเย่อ)   - โพลโหวต   - ควิซ   - ทายเลข   - เซียมซี   - เลเวลแฟนประจำ (จำข้ามไลฟ์)
const fs = require('fs');
const path = require('path');

const FORTUNES = [
  ['ดีเยี่ยม', 'โชคลาภไหลมาเทมา งานที่ทำจะสำเร็จเกินคาด'],
  ['ดีเยี่ยม', 'มีผู้ใหญ่คอยอุปถัมภ์ ขอสิ่งใดได้สมหวัง'],
  ['ดีเยี่ยม', 'ความรักสดใส คนที่รอจะเข้ามาในเร็ววัน'],
  ['ดีเยี่ยม', 'การเงินมั่นคง มีรายได้พิเศษเข้ามา'],
  ['ดีมาก', 'สุขภาพแข็งแรง จิตใจเบิกบาน ทำอะไรก็ราบรื่น'],
  ['ดีมาก', 'ค้าขายคล่องมือ ลูกค้าเยอะ กำไรงาม'],
  ['ดีมาก', 'เดินทางปลอดภัย จะได้เจอเรื่องดี ๆ ระหว่างทาง'],
  ['ดีมาก', 'คนรอบตัวรักและเอ็นดู มีเสน่ห์มากกว่าปกติ'],
  ['ดีมาก', 'การเรียนการสอบผ่านฉลุย ตั้งใจอีกนิดเดียว'],
  ['ดีมาก', 'เรื่องที่กังวลอยู่จะคลี่คลายไปในทางที่ดี'],
  ['ดี', 'ค่อยเป็นค่อยไป แล้วทุกอย่างจะลงตัวเอง'],
  ['ดี', 'มีโอกาสใหม่เข้ามา อย่ารีบปฏิเสธ'],
  ['ดี', 'ครอบครัวอบอุ่น มีข่าวดีจากคนใกล้ตัว'],
  ['ดี', 'ความพยายามที่ผ่านมาจะเริ่มเห็นผล'],
  ['ดี', 'เพื่อนจะช่วยให้ผ่านเรื่องยากไปได้'],
  ['ดี', 'ใจเย็น ๆ แล้วจะได้สิ่งที่ดีกว่าที่คิด'],
  ['ดี', 'งานเยอะหน่อยแต่คุ้มค่า มีคนเห็นความตั้งใจ'],
  ['ดี', 'ทำบุญแล้วสบายใจ สิ่งดี ๆ จะตามมา'],
  ['ปานกลาง', 'ระวังเรื่องการใช้จ่าย เก็บออมไว้บ้างจะดี'],
  ['ปานกลาง', 'อย่าเพิ่งตัดสินใจเรื่องใหญ่ รอจังหวะอีกนิด'],
  ['ปานกลาง', 'พักผ่อนให้พอ แล้วพลังจะกลับมาเต็มร้อย'],
  ['ปานกลาง', 'พูดน้อยฟังมาก จะได้ข้อมูลที่เป็นประโยชน์'],
  ['ปานกลาง', 'เรื่องหัวใจต้องใช้เวลา อย่าใจร้อน'],
  ['ปานกลาง', 'ตรวจทานงานให้ดี ความรอบคอบช่วยได้มาก'],
  ['ระวัง', 'ระวังของหาย เช็กกระเป๋าก่อนออกจากบ้าน'],
  ['ระวัง', 'ใจเย็นกับคนรอบข้าง อย่าใช้อารมณ์ตัดสิน'],
  ['ระวัง', 'ขับขี่ระมัดระวัง เดินทางช้า ๆ ปลอดภัยกว่า'],
  ['ระวัง', 'อย่าเพิ่งให้ใครยืมเงินช่วงนี้'],
];

// ธีมตกปลา: [ชื่อ, รูปแบบ, สี, ขนาดต่ำสุด, สูงสุด (ซม.), น้ำหนักโอกาส, ระดับ]
const FISH = [
  ['ปลาซิว', 'small', '#c9d6e0', 5, 12, 26, 'ธรรมดา'],
  ['ปลานิล', 'medium', '#7a8a96', 15, 40, 22, 'ธรรมดา'],
  ['ปลาตะเพียน', 'medium', '#d9d0a0', 15, 35, 18, 'ธรรมดา'],
  ['ปลาช่อน', 'long', '#4a5a3a', 30, 80, 11, 'ดี'],
  ['ปลาดุก', 'catfish', '#5a4a3a', 25, 60, 11, 'ดี'],
  ['กุ้งแม่น้ำ', 'shrimp', '#ff8a5a', 10, 30, 8, 'ดี'],
  ['ปลากราย', 'long', '#b8b8c8', 40, 90, 5, 'หายาก'],
  ['ปลาสวาย', 'medium', '#8a9aa8', 50, 120, 4, 'หายาก'],
  ['ปลาบึก', 'giant', '#6a7a8a', 120, 250, 1.2, 'ตำนาน'],
  ['ปลาทองคำ', 'gold', '#ffc21a', 20, 45, 0.8, 'ตำนาน'],
  ['รองเท้าแตะ', 'shoe', '#3a8ad9', 0, 0, 6, 'ขยะ'],
  ['กระป๋องเปล่า', 'can', '#c43a3a', 0, 0, 4, 'ขยะ'],
];
const RARITY_BOOST = { ธรรมดา: 0, ดี: 1, หายาก: 2, ตำนาน: 3, ขยะ: -1 };

const BANK = require('./gamebank');

const THDIGIT = '๐๑๒๓๔๕๖๗๘๙';
const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[๐-๙]/g, (d) => THDIGIT.indexOf(d))
    .replace(/[\s\-_.,!?'"`~:;()[\]{}]/g, '');
// คำลงท้ายที่คนชอบพิมพ์ต่อคำตอบ เช่น "ปลากัดค่ะ" "เปียโนครับ"
const TAIL = /(ครับผม|ครับ|คับ|ค้าบ|ค่ะ|คะ|ค่า|คร่า|จ้า+|จ้ะ|นะ|น้า|ฮะ|งับ|เลย|แน่นอน)+$/;
function matches(n, answers) {
  const m = n.replace(TAIL, '');
  return answers.some((a) => {
    const x = norm(a);
    return x && (x === n || x === m);
  });
}
// คำใบ้ตอนผ่านไปครึ่งเวลา
const graphemes = (s) => {
  try {
    return [...new Intl.Segmenter('th', { granularity: 'grapheme' }).segment(String(s))].map((x) => x.segment);
  } catch {
    return [...String(s)];
  }
};
function makeHint(a) {
  const s = String(a).trim();
  if (/^\d+$/.test(s)) return `เป็นตัวเลข ${s.length} หลัก`;
  const g = graphemes(s);
  return `ขึ้นต้นด้วย "${g[0]}" • ${'◻'.repeat(Math.max(0, Math.min(g.length, 12) - 1))}`;
}

// เกมอัตโนมัติ
const AUTO_DEFAULTS = { enabled: false, minMin: 3, maxMin: 5, quiet: true, quietSec: 90, types: { quiz: true, poll: true, type: true, guess: true } };
const AUTO_SEC = { quiz: 45, poll: 40, type: 30, guess: 60 };
const AUTO_WEIGHT = { quiz: 3, type: 2, poll: 2, guess: 1 };
const KIND_LABEL = { quiz: '❓ ควิซ', poll: '📊 โหวต', type: '⚡ ใครพิมพ์ไวสุดชนะ', guess: '🔢 ทายเลข' };
const MIN_GAP = 120_000; // ระยะห่างขั้นต่ำระหว่างเกมอัตโนมัติ (ไม่ให้ดูสแปม)
const NO_NUMBER_THEMES = ['shrine', 'cny']; // ธีมที่ตัวเลขดูเหมือนเลขนำโชค
const levelOf = (xp) => Math.floor(Math.sqrt(Math.max(0, xp) / 8)) + 1;
const today = () => new Date().toISOString().slice(0, 10);

module.exports = function createGames(ctx) {
  // ctx: { io, log, dataDir, cfg(): config.games, saveConfig(), audience: Map, bigEffectFor(): string }
  const { io, log } = ctx;
  const FANS_FILE = path.join(ctx.dataDir, 'fans.json');

  // ---------------- แฟนประจำ (บันทึกข้ามไลฟ์)
  let fans = {};
  try {
    fans = JSON.parse(fs.readFileSync(FANS_FILE, 'utf8'));
  } catch {}
  let dirty = false;
  setInterval(() => {
    if (!dirty) return;
    dirty = false;
    try {
      fs.mkdirSync(ctx.dataDir, { recursive: true });
      fs.writeFileSync(FANS_FILE, JSON.stringify(fans));
    } catch (e) {
      log('error', 'บันทึกข้อมูลแฟนไม่สำเร็จ: ' + e.message);
    }
  }, 10_000);

  const greeted = new Set(); // ทักแล้วในรอบเซิร์ฟเวอร์นี้
  const lastChatXp = new Map();
  const likeAcc = new Map();

  function fan(u) {
    let f = fans[u.id];
    const d = today();
    if (!f) {
      f = fans[u.id] = { name: u.name, xp: 0, lives: 1, firstDay: d, lastDay: d, comments: 0, diamonds: 0 };
      dirty = true;
    }
    if (f.lastDay !== d) {
      f.lives += 1;
      f.lastDay = d;
      dirty = true;
    }
    if (u.name && f.name !== u.name) f.name = u.name;
    return f;
  }

  function addXp(u, amount) {
    if (!amount) return;
    const f = fan(u);
    const before = levelOf(f.xp);
    f.xp += amount;
    dirty = true;
    const after = levelOf(f.xp);
    if (after !== before) {
      const a = ctx.audience.get(u.id);
      if (a) a.lv = after;
      io.emit('lv', { id: u.id, lv: after });
      if (after >= 2 && ctx.cfg().levels !== false) io.emit('levelup', { id: u.id, name: u.name, lv: after });
    }
  }

  // ---------------- สถานะเกม
  let team = null; // { nameA, nameB, scoreA, scoreB, members:{id:'a'|'b'}, endsAt, status, winner }
  let card = null; // poll | quiz | guess
  let cardClearTimer = null;
  let teamClearTimer = null;
  const lastGuess = new Map();
  const lastFortune = new Map();
  const lastTeamChat = new Map();

  function publicCard() {
    if (!card) return null;
    const c = { ...card };
    delete c.answers;
    delete c.secret;
    delete c.votes;
    return c;
  }
  function publicTeam() {
    if (!team) return null;
    const ids = Object.keys(team.members);
    const countA = ids.filter((id) => team.members[id] === 'a').length;
    return { ...team, members: Object.fromEntries(ids.slice(-600).map((id) => [id, team.members[id]])), countA, countB: ids.length - countA };
  }
  function publicState() {
    return { now: Date.now(), team: publicTeam(), card: publicCard(), cfg: ctx.cfg(), auto: publicAuto() };
  }
  function push() {
    io.emit('games', publicState());
  }
  // อัปเดตถี่ ๆ (เช่น ไลก์รัว ๆ) ให้รวมส่งทีละ 250ms
  let pushTimer = null;
  function pushSoon() {
    if (pushTimer) return;
    pushTimer = setTimeout(() => {
      pushTimer = null;
      push();
    }, 250);
  }

  // ---------------- ทีม
  function teamAdd(id, pts) {
    if (!team || team.status !== 'running') return;
    const side = team.members[id];
    if (!side) return;
    if (side === 'a') team.scoreA += pts;
    else team.scoreB += pts;
    pushSoon();
  }
  function endTeam() {
    if (!team || team.status !== 'running') return;
    team.status = 'ended';
    team.winner = team.scoreA === team.scoreB ? 'draw' : team.scoreA > team.scoreB ? 'a' : 'b';
    const name = team.winner === 'draw' ? 'เสมอ' : team.winner === 'a' ? team.nameA : team.nameB;
    log('game', `แข่งทีมจบ: ${team.nameA} ${team.scoreA} - ${team.scoreB} ${team.nameB} → ${team.winner === 'draw' ? 'เสมอ' : 'ทีม' + name + 'ชนะ'}`);
    io.emit('gameWin', { kind: 'team', winner: team.winner, name });
    if (team.winner !== 'draw') {
      const ids = Object.entries(team.members).filter(([, s]) => s === team.winner).map(([id]) => id);
      ctx.onTeamWin?.(ids.map((id) => ({ id, name: ctx.audience.get(id)?.name || fans[id]?.name || '' })));
    }
    push();
    clearTimeout(teamClearTimer);
    teamClearTimer = setTimeout(() => {
      if (team && team.status === 'ended') {
        team = null;
        push();
      }
    }, 15_000);
  }

  // ---------------- การ์ด (โพล / ควิซ / ทายเลข)
  function finishCard(result) {
    if (!card) return;
    card.status = 'ended';
    Object.assign(card, result || {});
    auto.lastEnd = Date.now();
    push();
    clearTimeout(cardClearTimer);
    cardClearTimer = setTimeout(() => {
      if (card && card.status === 'ended') {
        card = null;
        push();
      }
    }, 12_000);
  }
  function endPoll() {
    if (!card || card.kind !== 'poll' || card.status !== 'running') return;
    const max = Math.max(...card.counts);
    const winners = card.counts.map((n, i) => (n === max && max > 0 ? i : -1)).filter((i) => i >= 0);
    log('game', `โพลจบ: ${card.question} → ${winners.map((i) => card.options[i]).join(', ') || 'ไม่มีคนโหวต'}`);
    finishCard({ winners });
  }

  const revealOf = (c) => (c.kind === 'guess' ? c.secret : c.answers[0]);

  setInterval(() => {
    const now = Date.now();
    if (team && team.status === 'running' && team.endsAt && now >= team.endsAt) endTeam();
    // ควิซผ่านไปครึ่งเวลา → ขึ้นคำใบ้
    if (card && card.kind === 'quiz' && card.status === 'running' && card.endsAt && !card.hint && now >= card.endsAt - card.dur / 2) {
      card.hint = makeHint(card.answers[0]);
      push();
    }
    if (card && card.status === 'running' && card.endsAt && now >= card.endsAt) {
      if (card.kind === 'poll') endPoll();
      else {
        log('game', `${KIND_LABEL[card.kind]} หมดเวลา ไม่มีใครตอบถูก`);
        finishCard({ timeout: true, reveal: revealOf(card) });
      }
    }
    autoTick(now);
  }, 500);

  // ---------------- เริ่มเกมการ์ด (ใช้ทั้งปุ่มในหลังบ้านและเกมอัตโนมัติ)
  function newCard(c, seconds) {
    clearTimeout(cardClearTimer);
    const s = Math.max(0, Number(seconds) || 0);
    card = { ...c, status: 'running', startAt: Date.now(), endsAt: s ? Date.now() + s * 1000 : 0, dur: s * 1000 };
    // เฉลยส่งให้หลังบ้านเท่านั้น (หน้าเวทีไม่ได้รับ)
    if (card.answers) io.to('admin').emit('game:answer', card.answers);
    if (card.kind === 'guess') io.to('admin').emit('game:secret', card.secret);
    push();
    return true;
  }
  function startPoll({ question, options, seconds, auto: isAuto } = {}) {
    const opts = (options || []).map((o) => String(o || '').trim().slice(0, 40)).filter(Boolean).slice(0, 4);
    if (opts.length < 2) return false;
    log('game', `เริ่มโพล${isAuto ? ' (อัตโนมัติ)' : ''}: ${question}`);
    return newCard({ kind: 'poll', auto: !!isAuto, question: String(question || 'โหวตกันหน่อย').slice(0, 90), options: opts, counts: opts.map(() => 0), votes: {}, total: 0 }, seconds);
  }
  function startQuiz({ question, answer, seconds, auto: isAuto } = {}) {
    const answers = String(answer || '').split('|').map((a) => a.trim()).filter(Boolean);
    if (!answers.length) return false;
    log('game', `เริ่มควิซ${isAuto ? ' (อัตโนมัติ)' : ''}: ${question} (คำตอบ: ${answers.join(' / ')})`);
    return newCard({ kind: 'quiz', auto: !!isAuto, question: String(question || '').slice(0, 120), answers }, seconds);
  }
  function startType({ phrase, seconds, auto: isAuto } = {}) {
    const p = String(phrase || '').trim().slice(0, 40);
    if (!norm(p)) return false;
    log('game', `เริ่มเกมพิมพ์ไว${isAuto ? ' (อัตโนมัติ)' : ''}: ${p}`);
    return newCard({ kind: 'type', auto: !!isAuto, question: p, answers: [p] }, seconds);
  }
  function startGuess({ min, max, seconds, question, auto: isAuto } = {}) {
    const lo = Math.floor(Number(min) || 1);
    let hi = Math.floor(Number(max) || 100);
    if (hi <= lo) hi = lo + 10;
    const secret = lo + Math.floor(Math.random() * (hi - lo + 1));
    log('game', `เริ่มทายเลข${isAuto ? ' (อัตโนมัติ)' : ''} ${lo}-${hi} (เลขลับ: ${secret})`);
    newCard({ kind: 'guess', auto: !!isAuto, question: question ? String(question).slice(0, 90) : '', min: lo, max: hi, lo, hi, secret, guesses: [], count: 0 }, seconds);
    return secret;
  }

  // ---------------- เกมอัตโนมัติ
  // สุ่มเกมตามช่วงเวลา (หรือเร็วขึ้นเมื่อคอมเมนต์เงียบ) ใช้คลังของธีม + คำถามที่เพิ่มเอง ผ่านตัวกรองความปลอดภัยทุกข้อ
  const auto = { phase: 'off', nextAt: 0, kind: null, item: null, startAt: 0, lastEnd: 0, lastKind: null, note: '' };
  let lastChatAt = Date.now();
  const bags = new Map();
  const acfg = () => {
    const a = ctx.cfg().auto || {};
    return { ...AUTO_DEFAULTS, ...a, types: { ...AUTO_DEFAULTS.types, ...(a.types || {}) } };
  };

  // คำถามที่เพิ่มเอง (หลังบ้าน) — บรรทัดละข้อ
  function parseCustom(themeId) {
    const c = ctx.cfg().custom?.[themeId] || {};
    const lines = (s) => String(s || '').split('\n').map((l) => l.trim()).filter(Boolean);
    const split2 = (l) => {
      const i = l.indexOf('=');
      return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).split('/').map((x) => x.trim()).filter(Boolean)] : null;
    };
    return {
      quiz: lines(c.quiz).map(split2).filter((x) => x && x[0] && x[1].length).map(([q, a]) => [q, a.join('|')]),
      poll: lines(c.poll).map(split2).filter((x) => x && x[0] && x[1].length >= 2).map(([q, o]) => [q, o.slice(0, 4)]),
      type: lines(c.type).filter((l) => l.length <= 40),
    };
  }
  const itemText = (kind, it) => (kind === 'type' ? it : kind === 'guess' ? it.q : kind === 'poll' ? `${it[0]} ${it[1].join(' ')}` : `${it[0]} ${it[1]}`);
  function pool(kind, themeId = ctx.themeId()) {
    const bank = BANK[themeId] || BANK[ctx.themeAlias?.(themeId)] || {};
    if (kind === 'guess' && (ctx.safeMode() || NO_NUMBER_THEMES.includes(themeId))) return [];
    const custom = kind === 'guess' ? [] : parseCustom(themeId)[kind] || [];
    // ผ่านตัวกรองคำต้องห้ามทุกข้อ (รวมคำที่ตั้งเพิ่มเองในแท็บความปลอดภัย)
    return [...(bank[kind] || []), ...custom].filter((it) => ctx.isSafe(itemText(kind, it)));
  }
  function availableKinds() {
    const a = acfg();
    return Object.keys(AUTO_WEIGHT).filter((k) => a.types[k] && pool(k).length);
  }
  function pickKind(exclude) {
    let ks = availableKinds();
    if (ks.length > 1) ks = ks.filter((k) => k !== (exclude || auto.lastKind));
    if (!ks.length) return null;
    let r = Math.random() * ks.reduce((s, k) => s + AUTO_WEIGHT[k], 0);
    for (const k of ks) if ((r -= AUTO_WEIGHT[k]) <= 0) return k;
    return ks[0];
  }
  // สุ่มแบบไม่ซ้ำจนกว่าจะครบทุกข้อในคลัง
  function pickItem(kind) {
    const list = pool(kind);
    if (!list.length) return null;
    const key = `${ctx.themeId()}:${kind}`;
    let bag = bags.get(key);
    const valid = (i) => i < list.length;
    if (!bag || !bag.filter(valid).length) {
      bag = list.map((_, i) => i).sort(() => Math.random() - 0.5);
      bags.set(key, bag);
    }
    let i;
    do i = bag.pop();
    while (i != null && !valid(i));
    return list[i ?? 0];
  }
  function scheduleNext(now = Date.now()) {
    const a = acfg();
    const lo = Math.max(2, Number(a.minMin) || 3);
    const hi = Math.max(lo, Number(a.maxMin) || lo);
    auto.nextAt = now + (lo + Math.random() * (hi - lo)) * 60_000;
    auto.kind = pickKind();
  }
  function announce(now = Date.now(), sec = 10) {
    const kind = auto.kind && availableKinds().includes(auto.kind) ? auto.kind : pickKind();
    const item = kind && pickItem(kind);
    if (!item) {
      auto.note = 'ไม่มีเกมที่เล่นได้ในธีมนี้ (ตรวจประเภทเกมที่เลือกไว้)';
      auto.nextAt = now + 60_000;
      return false;
    }
    auto.kind = kind;
    auto.item = item;
    auto.phase = 'announce';
    auto.startAt = now + sec * 1000;
    auto.note = '';
    io.emit('gameSoon', { kind, label: KIND_LABEL[kind], sec });
    log('game', `เกมอัตโนมัติ: อีก ${sec} วิ เริ่ม ${KIND_LABEL[kind]}`);
    push();
    return true;
  }
  function launch() {
    const { kind, item } = auto;
    const sec = AUTO_SEC[kind];
    if (kind === 'quiz') startQuiz({ question: item[0], answer: item[1], seconds: sec, auto: true });
    else if (kind === 'poll') startPoll({ question: item[0], options: item[1], seconds: sec, auto: true });
    else if (kind === 'type') startType({ phrase: item, seconds: sec, auto: true });
    else if (kind === 'guess') startGuess({ question: item.q, min: item.min, max: item.max, seconds: sec, auto: true });
    auto.lastKind = kind;
    auto.kind = null;
    auto.item = null;
    auto.nextAt = 0;
    auto.phase = 'busy';
  }
  function autoTick(now) {
    const a = acfg();
    const prev = `${auto.phase}|${auto.nextAt}|${auto.kind}`;
    if (!a.enabled) {
      auto.phase = 'off';
      auto.nextAt = 0;
    } else if (auto.phase === 'announce') {
      if (card && card.status === 'running') {
        // มีคนเปิดเกมเองระหว่างนับถอยหลัง → ยกเลิกรอบนี้
        auto.phase = 'busy';
        io.emit('gameSoon', { cancel: true });
      } else if (now >= auto.startAt) launch();
    } else if (!ctx.isLive()) {
      auto.phase = 'offline';
      auto.nextAt = 0;
    } else if (card || (team && team.status === 'running')) {
      auto.phase = 'busy';
      auto.nextAt = 0;
    } else {
      if (!auto.nextAt) scheduleNext(now);
      auto.phase = 'wait';
      const gapOk = now - auto.lastEnd >= MIN_GAP;
      // คอมเมนต์เงียบนาน → เริ่มเกมเร็วขึ้นเพื่อปลุกไลฟ์
      if (a.quiet && gapOk && now - lastChatAt > (Number(a.quietSec) || 90) * 1000 && auto.nextAt - now > 12_000) {
        auto.nextAt = now;
        log('game', 'คอมเมนต์เงียบ — เริ่มเกมอัตโนมัติเร็วขึ้น');
      }
      if (now >= auto.nextAt) {
        if (gapOk) announce(now);
        else auto.nextAt = auto.lastEnd + MIN_GAP;
      }
    }
    if (prev !== `${auto.phase}|${auto.nextAt}|${auto.kind}`) push();
  }
  function publicAuto() {
    return { ...acfg(), phase: auto.phase, nextAt: auto.nextAt, startAt: auto.startAt, kind: auto.kind, label: KIND_LABEL[auto.kind] || '', note: auto.note, kinds: availableKinds(), noNumber: NO_NUMBER_THEMES.includes(ctx.themeId()) || ctx.safeMode() };
  }

  function win(u, kind, extra) {
    addXp(u, 30);
    ctx.onWin?.(u, kind);
    io.emit('gameWin', { kind, user: { id: u.id, name: u.name, avatar: u.avatar || '' }, ...extra });
  }

  // ---------------- ธีมตกปลา
  const lastCast = new Map();
  let fishBoard = []; // ปลาตัวใหญ่สุดของวัน
  function castLine(u, boost = 1) {
    // boost > 1 = เหยื่อดี: ปลาหายากมีโอกาสมากขึ้น ขยะน้อยลง
    const weights = FISH.map((f) => f[5] * Math.pow(boost, RARITY_BOOST[f[6]]));
    let r = Math.random() * weights.reduce((a, b) => a + b, 0);
    let i = 0;
    while (r > weights[i]) r -= weights[i++];
    const [name, kind, color, min, max, , rarity] = FISH[i];
    const size = max ? Math.round(min + Math.pow(Math.random(), 1.6 / Math.min(boost, 3)) * (max - min)) : 0;
    const fish = { name, kind, color, size, rarity };
    if (size) {
      fishBoard.push({ name: u.name, fish: name, size, rarity });
      fishBoard.sort((a, b) => b.size - a.size);
      fishBoard = fishBoard.slice(0, 5);
    }
    if (rarity === 'หายาก' || rarity === 'ตำนาน') addXp(u, rarity === 'ตำนาน' ? 40 : 15);
    log('game', `${u.name} ตกได้ ${name}${size ? ` ${size} ซม.` : ''} (${rarity})`);
    io.emit('themeEvent', { type: 'catch', user: { id: u.id, name: u.name, avatar: u.avatar || '' }, fish, board: fishBoard, boost });
  }

  // ---------------- รับคอมเมนต์
  function fortune(u) {
    const now = Date.now();
      if (now - (lastFortune.get(u.id) || 0) > 60_000) {
        lastFortune.set(u.id, now);
        const no = Math.floor(Math.random() * FORTUNES.length);
        const [level, msg] = FORTUNES[no];
        io.emit('fortune', { user: { id: u.id, name: u.name, avatar: u.avatar || '' }, no: no + 1, level, text: msg });
        log('game', `${u.name} เสี่ยงเซียมซีได้ใบที่ ${no + 1} (${level})`);
      }
  }

  function onChat(u, text) {
    const t = String(text || '').trim();
    const n = norm(t);
    const f = fan(u);
    f.comments += 1;
    const now = Date.now();
    lastChatAt = now;
    if (now - (lastChatXp.get(u.id) || 0) > 15_000) {
      lastChatXp.set(u.id, now);
      addXp(u, 2);
    }
    const cfg = ctx.cfg();

    // เลเวล
    if (cfg.levels !== false && (n === 'เลเวล' || n === 'level' || n === 'lv')) {
      const lv = levelOf(f.xp);
      io.emit('say', { id: u.id, text: `Lv.${lv} • XP ${Math.floor(f.xp)} • มาแล้ว ${f.lives} ไลฟ์` });
    }

    // ตกปลา (เฉพาะธีมตกปลา)
    if (ctx.themeId() === 'fishing' && ['ตก', 'ตกปลา', 'fish', 'ตกเบ็ด', 'เหวี่ยงเบ็ด'].includes(n)) {
      if (now - (lastCast.get(u.id) || 0) > 12_000) {
        lastCast.set(u.id, now);
        castLine(u, 1);
      }
    }

    // เซียมซี
    const fcmd = norm(cfg.fortuneCommand || 'เซียมซี');
    if (cfg.fortune !== false && (n === fcmd || n === 'ดูดวง' || n === 'เสี่ยงเซียมซี')) {
      fortune(u);
    }

    // ทีม
    if (team && team.status === 'running') {
      const a = norm(team.nameA);
      const b = norm(team.nameB);
      const pick = n === a || n === 'ทีม' + a ? 'a' : n === b || n === 'ทีม' + b ? 'b' : null;
      if (pick && !team.members[u.id]) {
        team.members[u.id] = pick;
        if (pick === 'a') team.scoreA += 5;
        else team.scoreB += 5;
        io.emit('teamJoin', { id: u.id, name: u.name, team: pick });
        pushSoon();
      } else if (team.members[u.id] && now - (lastTeamChat.get(u.id) || 0) > 5000) {
        lastTeamChat.set(u.id, now);
        teamAdd(u.id, 1);
      }
    }

    // การ์ด
    if (card && card.status === 'running') {
      if (card.kind === 'poll') {
        const m = t.match(/^(?:โหวต\s*)?([1-9])$/);
        const idx = m ? Number(m[1]) - 1 : -1;
        if (idx >= 0 && idx < card.options.length) {
          const prev = card.votes[u.id];
          if (prev !== idx) {
            if (prev != null) card.counts[prev]--;
            card.votes[u.id] = idx;
            card.counts[idx]++;
            card.total = Object.keys(card.votes).length;
            pushSoon();
          }
        }
      } else if (card.kind === 'quiz' || card.kind === 'type') {
        if (matches(n, card.answers)) {
          const sec = Math.round((now - card.startAt) / 100) / 10;
          log('game', `${u.name} ${card.kind === 'quiz' ? 'ตอบควิซถูก' : `พิมพ์ไวสุด (${sec} วิ)`}: ${t}`);
          win(u, card.kind, { answer: card.answers[0], sec });
          finishCard({ winner: { id: u.id, name: u.name, avatar: u.avatar || '' }, reveal: card.answers[0], sec });
        }
      } else if (card.kind === 'guess') {
        const m = t.match(/^\d{1,6}$/);
        if (m && now - (lastGuess.get(u.id) || 0) > 3000) {
          lastGuess.set(u.id, now);
          const g = Number(t);
          if (g >= card.lo && g <= card.hi) {
            let dir = 0;
            if (g === card.secret) dir = 0;
            else if (g < card.secret) {
              dir = 1;
              card.lo = g + 1;
            } else {
              dir = -1;
              card.hi = g - 1;
            }
            card.guesses.unshift({ name: u.name, n: g, dir });
            card.guesses.length = Math.min(card.guesses.length, 5);
            card.count = (card.count || 0) + 1;
            if (dir === 0) {
              log('game', `${u.name} ทายเลขถูก: ${g}`);
              win(u, 'guess', { answer: g });
              finishCard({ winner: { id: u.id, name: u.name, avatar: u.avatar || '' }, reveal: g });
            } else pushSoon();
          }
        }
      }
    }
  }

  function onLike(u, count) {
    teamAdd(u.id, count);
    const acc = (likeAcc.get(u.id) || 0) + count;
    const xp = Math.floor(acc / 10);
    likeAcc.set(u.id, acc - xp * 10);
    if (xp) addXp(u, xp);
  }
  function onGift(u, diamonds) {
    teamAdd(u.id, diamonds * 10);
    if (ctx.themeId() === 'fishing') castLine(u, Math.min(6, 1.6 + Math.log10(diamonds + 1) * 1.6));
    const f = fan(u);
    f.diamonds += diamonds;
    addXp(u, diamonds * 2);
  }
  function onSocial(u, kind) {
    teamAdd(u.id, kind === 'follow' ? 20 : 10);
    addXp(u, kind === 'follow' ? 10 : 5);
  }
  // คนเข้ามาในฉาก: ใส่เลเวล + ทักคนที่กลับมา
  function onEnter(u, a) {
    const f = fan(u);
    a.lv = levelOf(f.xp);
    if (greeted.has(u.id)) return;
    greeted.add(u.id);
    if (ctx.cfg().welcome !== false && f.firstDay !== today()) {
      io.emit('welcome', { id: u.id, name: u.name, lv: a.lv, lives: f.lives });
    }
  }

  // ---------------- แผงควบคุม
  function register(socket) {
    socket.emit('games', publicState());
    socket.emit('themeEvent', { type: 'board', board: fishBoard });
    socket.on('game:teamStart', ({ nameA, nameB, minutes } = {}) => {
      clearTimeout(teamClearTimer);
      const m = Math.max(0, Number(minutes) || 0);
      team = {
        nameA: String(nameA || 'แดง').trim().slice(0, 12) || 'แดง',
        nameB: String(nameB || 'ฟ้า').trim().slice(0, 12) || 'ฟ้า',
        scoreA: 0, scoreB: 0, members: {}, status: 'running',
        endsAt: m ? Date.now() + m * 60_000 : 0, winner: null,
      };
      log('game', `เริ่มแข่งทีม ${team.nameA} vs ${team.nameB}${m ? ` (${m} นาที)` : ''}`);
      push();
    });
    socket.on('game:teamEnd', () => endTeam());
    socket.on('game:teamClear', () => {
      team = null;
      push();
    });

    socket.on('game:pollStart', (o = {}) => startPoll(o));
    socket.on('game:quizStart', (o = {}) => startQuiz(o));
    socket.on('game:typeStart', (o = {}) => startType(o));
    socket.on('game:guessStart', (o = {}) => {
      const secret = startGuess(o);
      socket.emit('game:secret', secret);
    });
    // เกมอัตโนมัติ
    socket.on('game:autoSave', ({ auto: a, custom } = {}, ack) => {
      const g = ctx.cfg();
      if (a) {
        const lo = Math.min(30, Math.max(2, Number(a.minMin) || 3));
        const hi = Math.min(60, Math.max(lo, Number(a.maxMin) || lo));
        g.auto = {
          enabled: !!a.enabled, minMin: lo, maxMin: hi, quiet: !!a.quiet, quietSec: Math.min(600, Math.max(30, Number(a.quietSec) || 90)),
          types: Object.fromEntries(Object.keys(AUTO_WEIGHT).map((k) => [k, !!a.types?.[k]])),
        };
      }
      const rejected = [];
      if (custom) {
        // คำถามที่เพิ่มเอง: บรรทัดไหนติดตัวกรองคำต้องห้าม → ไม่บันทึก แจ้งกลับ
        const clean = (txt) =>
          String(txt || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 100).filter((l) => {
            if (ctx.isSafe(l)) return true;
            rejected.push(l);
            return false;
          }).map((l) => l.slice(0, 160)).join(String.fromCharCode(10));
        g.custom = g.custom || {};
        g.custom[ctx.themeId()] = { quiz: clean(custom.quiz), poll: clean(custom.poll), type: clean(custom.type) };
      }
      ctx.save();
      bags.clear();
      if (a) {
        auto.nextAt = 0;
        auto.kind = null;
      }
      push();
      ack?.({ ok: true, rejected });
    });
    socket.on('game:autoNow', (_, ack) => {
      if (card && card.status === 'running') return ack?.({ ok: false, error: 'มีเกมเล่นอยู่' });
      if (auto.phase === 'announce') return ack?.({ ok: false, error: 'กำลังนับถอยหลังอยู่แล้ว' });
      clearTimeout(cardClearTimer);
      card = null;
      const ok = announce(Date.now(), 5);
      ack?.({ ok, error: ok ? '' : auto.note });
    });
    socket.on('game:autoSkip', (_, ack) => {
      if (auto.phase === 'announce') io.emit('gameSoon', { cancel: true });
      const cur = auto.kind;
      scheduleNext();
      if (cur && auto.kind === cur) auto.kind = pickKind(cur);
      auto.phase = 'wait';
      push();
      ack?.({ ok: true });
    });
    socket.on('game:bank', (_, ack) => {
      const th = ctx.themeId();
      ack?.({ theme: th, custom: ctx.cfg().custom?.[th] || {}, counts: Object.fromEntries(Object.keys(AUTO_WEIGHT).map((k) => [k, pool(k).length])), builtin: Object.fromEntries(Object.keys(AUTO_WEIGHT).map((k) => [k, ((BANK[th] || BANK[ctx.themeAlias?.(th)])?.[k] || []).length])) });
    });
    socket.on('game:cardEnd', () => {
      if (!card || card.status !== 'running') return;
      if (card.kind === 'poll') endPoll();
      else finishCard({ cancelled: true, reveal: revealOf(card) });
    });
    socket.on('game:cardClear', () => {
      card = null;
      push();
    });
    socket.on('game:topFans', (_, ack) => {
      const list = Object.entries(fans)
        .map(([id, f]) => ({ id, name: f.name, xp: Math.floor(f.xp), lv: levelOf(f.xp), lives: f.lives }))
        .sort((a, b) => b.xp - a.xp)
        .slice(0, 20);
      ack?.(list);
    });
    socket.on('game:resetFans', (_, ack) => {
      fans = {};
      greeted.clear();
      dirty = true;
      for (const a of ctx.audience.values()) a.lv = 1;
      log('system', 'ล้างข้อมูลเลเวลแฟนทั้งหมด');
      ack?.({ ok: true });
    });
  }

  // รวมข้อมูลแฟนที่ 1.4.1 บันทึกไว้ใต้ชื่อผู้ใช้ (from) เข้ากับ id ถาวร (to)
  function mergeId(from, to) {
    const a = fans[from];
    if (!a || from === to) return false;
    const b = fans[to];
    if (!b) fans[to] = a;
    else {
      b.xp = (b.xp || 0) + (a.xp || 0);
      b.lives = (b.lives || 0) + (a.lives || 0);
      b.comments = (b.comments || 0) + (a.comments || 0);
      b.diamonds = (b.diamonds || 0) + (a.diamonds || 0);
      if (a.firstDay && (!b.firstDay || a.firstDay < b.firstDay)) b.firstDay = a.firstDay;
      if (a.lastDay && (!b.lastDay || a.lastDay > b.lastDay)) {
        b.lastDay = a.lastDay;
        if (a.name) b.name = a.name;
      }
    }
    delete fans[from];
    dirty = true;
    return true;
  }

  return { onChat, fortune, onLike, onGift, onSocial, onEnter, register, state: publicState, levelOf, mergeId };
};
