// มินิเกม: ทายภาพพิกเซล — ภาพ (อีโมจิแปลงเป็นพิกเซล 24×24) เปิดทีละช่องจาก 16 ช่อง
// ตอบถูกคนแรกได้แต้ม (ยิ่งเปิดน้อยยิ่งได้มาก) • ตอบใกล้เคียงบอก “ใกล้แล้ว!” • เก็บแต้มสะสมข้ามไลฟ์
'use strict';

// คลังคำถาม: e = อีโมจิ, a = คำตอบที่ยอมรับ (คำแรกคือคำตอบหลัก), c = หมวด
const BANK = [
  ['🥭', ['มะม่วง', 'mango'], 'ผลไม้'], ['🍉', ['แตงโม', 'watermelon'], 'ผลไม้'], ['🍌', ['กล้วย', 'banana'], 'ผลไม้'], ['🍍', ['สับปะรด', 'สัปปะรด', 'pineapple'], 'ผลไม้'],
  ['🍓', ['สตรอว์เบอร์รี', 'สตรอเบอรี่', 'สตอเบอรี่', 'strawberry'], 'ผลไม้'], ['🍇', ['องุ่น', 'grape'], 'ผลไม้'], ['🍊', ['ส้ม', 'orange'], 'ผลไม้'], ['🍎', ['แอปเปิ้ล', 'แอปเปิล', 'apple'], 'ผลไม้'],
  ['🥥', ['มะพร้าว', 'coconut'], 'ผลไม้'], ['🍒', ['เชอร์รี่', 'เชอรี่', 'cherry'], 'ผลไม้'], ['🍑', ['ลูกพีช', 'พีช', 'peach'], 'ผลไม้'], ['🥝', ['กีวี่', 'กีวี', 'kiwi'], 'ผลไม้'],
  ['🍋', ['มะนาว', 'เลมอน', 'lemon'], 'ผลไม้'], ['🍐', ['ลูกแพร์', 'แพร์', 'pear'], 'ผลไม้'], ['🫐', ['บลูเบอร์รี่', 'blueberry'], 'ผลไม้'],
  ['🍜', ['ก๋วยเตี๋ยว', 'ราเมง', 'บะหมี่', 'noodle'], 'อาหาร'], ['🍣', ['ซูชิ', 'sushi'], 'อาหาร'], ['🍕', ['พิซซ่า', 'pizza'], 'อาหาร'], ['🍔', ['แฮมเบอร์เกอร์', 'เบอร์เกอร์', 'burger'], 'อาหาร'],
  ['🍟', ['เฟรนช์ฟรายส์', 'เฟรนฟราย', 'มันฝรั่งทอด', 'fries'], 'อาหาร'], ['🍳', ['ไข่ดาว', 'ไข่ทอด', 'egg'], 'อาหาร'], ['🍦', ['ไอศกรีม', 'ไอติม', 'icecream'], 'อาหาร'], ['🍩', ['โดนัท', 'donut'], 'อาหาร'],
  ['🍰', ['เค้ก', 'cake'], 'อาหาร'], ['🍙', ['ข้าวปั้น', 'โอนิกิริ', 'onigiri'], 'อาหาร'], ['🌭', ['ฮอทดอก', 'ฮอตด็อก', 'hotdog'], 'อาหาร'], ['🥐', ['ครัวซองต์', 'ครัวซอง', 'croissant'], 'อาหาร'],
  ['🍞', ['ขนมปัง', 'bread'], 'อาหาร'], ['🧁', ['คัพเค้ก', 'cupcake'], 'อาหาร'], ['🍫', ['ช็อกโกแลต', 'ช็อคโกแลต', 'chocolate'], 'อาหาร'], ['🍪', ['คุกกี้', 'cookie'], 'อาหาร'],
  ['🐘', ['ช้าง', 'elephant'], 'สัตว์'], ['🐈', ['แมว', 'cat'], 'สัตว์'], ['🐕', ['หมา', 'สุนัข', 'dog'], 'สัตว์'], ['🐟', ['ปลา', 'fish'], 'สัตว์'], ['🐢', ['เต่า', 'turtle'], 'สัตว์'],
  ['🐧', ['เพนกวิน', 'penguin'], 'สัตว์'], ['🦒', ['ยีราฟ', 'giraffe'], 'สัตว์'], ['🐼', ['แพนด้า', 'panda'], 'สัตว์'], ['🐸', ['กบ', 'frog'], 'สัตว์'], ['🦋', ['ผีเสื้อ', 'butterfly'], 'สัตว์'],
  ['🐙', ['ปลาหมึก', 'หมึก', 'octopus'], 'สัตว์'], ['🦀', ['ปู', 'crab'], 'สัตว์'], ['🐝', ['ผึ้ง', 'bee'], 'สัตว์'], ['🦁', ['สิงโต', 'lion'], 'สัตว์'], ['🐯', ['เสือ', 'tiger'], 'สัตว์'],
  ['🐰', ['กระต่าย', 'rabbit'], 'สัตว์'], ['🐷', ['หมู', 'pig'], 'สัตว์'], ['🐔', ['ไก่', 'chicken'], 'สัตว์'], ['🦆', ['เป็ด', 'duck'], 'สัตว์'], ['🐬', ['โลมา', 'dolphin'], 'สัตว์'],
  ['🐳', ['วาฬ', 'ปลาวาฬ', 'whale'], 'สัตว์'], ['🦄', ['ยูนิคอร์น', 'unicorn'], 'สัตว์'], ['🐍', ['งู', 'snake'], 'สัตว์'], ['🦊', ['จิ้งจอก', 'หมาจิ้งจอก', 'fox'], 'สัตว์'], ['🦉', ['นกฮูก', 'owl'], 'สัตว์'],
  ['🚗', ['รถยนต์', 'รถ', 'car'], 'ยานพาหนะ'], ['✈️', ['เครื่องบิน', 'plane'], 'ยานพาหนะ'], ['🚲', ['จักรยาน', 'bike'], 'ยานพาหนะ'], ['🚢', ['เรือ', 'เรือใหญ่', 'ship'], 'ยานพาหนะ'], ['🚀', ['จรวด', 'rocket'], 'ยานพาหนะ'],
  ['🚂', ['รถไฟ', 'train'], 'ยานพาหนะ'], ['🚁', ['เฮลิคอปเตอร์', 'ฮอ', 'helicopter'], 'ยานพาหนะ'], ['🛵', ['มอเตอร์ไซค์', 'มอไซค์', 'สกู๊ตเตอร์', 'scooter'], 'ยานพาหนะ'], ['🚌', ['รถบัส', 'รถเมล์', 'bus'], 'ยานพาหนะ'],
  ['☀️', ['พระอาทิตย์', 'ดวงอาทิตย์', 'sun'], 'ธรรมชาติ'], ['🌙', ['พระจันทร์', 'ดวงจันทร์', 'moon'], 'ธรรมชาติ'], ['🌈', ['รุ้ง', 'สายรุ้ง', 'rainbow'], 'ธรรมชาติ'], ['🌵', ['กระบองเพชร', 'cactus'], 'ธรรมชาติ'],
  ['🌻', ['ทานตะวัน', 'ดอกทานตะวัน', 'sunflower'], 'ธรรมชาติ'], ['🌹', ['กุหลาบ', 'ดอกกุหลาบ', 'rose'], 'ธรรมชาติ'], ['🍄', ['เห็ด', 'mushroom'], 'ธรรมชาติ'], ['🌋', ['ภูเขาไฟ', 'volcano'], 'ธรรมชาติ'],
  ['⛄', ['ตุ๊กตาหิมะ', 'มนุษย์หิมะ', 'snowman'], 'ธรรมชาติ'], ['🌴', ['ต้นมะพร้าว', 'ต้นปาล์ม', 'palm'], 'ธรรมชาติ'], ['⭐', ['ดาว', 'ดวงดาว', 'star'], 'ธรรมชาติ'], ['🔥', ['ไฟ', 'fire'], 'ธรรมชาติ'],
  ['⚽', ['ฟุตบอล', 'ลูกฟุตบอล', 'football'], 'กีฬาและของเล่น'], ['🏀', ['บาสเกตบอล', 'บาส', 'basketball'], 'กีฬาและของเล่น'], ['🎸', ['กีตาร์', 'guitar'], 'กีฬาและของเล่น'], ['🎮', ['จอยเกม', 'จอยสติ๊ก', 'เกม', 'controller'], 'กีฬาและของเล่น'],
  ['🎈', ['ลูกโป่ง', 'balloon'], 'กีฬาและของเล่น'], ['🎁', ['ของขวัญ', 'กล่องของขวัญ', 'gift'], 'กีฬาและของเล่น'], ['🎂', ['เค้กวันเกิด', 'วันเกิด'], 'กีฬาและของเล่น'], ['🪁', ['ว่าว', 'kite'], 'กีฬาและของเล่น'],
  ['☂️', ['ร่ม', 'umbrella'], 'ของใช้'], ['👓', ['แว่นตา', 'แว่น', 'glasses'], 'ของใช้'], ['⏰', ['นาฬิกาปลุก', 'นาฬิกา', 'clock'], 'ของใช้'], ['📱', ['มือถือ', 'โทรศัพท์', 'phone'], 'ของใช้'],
  ['💡', ['หลอดไฟ', 'bulb'], 'ของใช้'], ['🔑', ['กุญแจ', 'key'], 'ของใช้'], ['✏️', ['ดินสอ', 'pencil'], 'ของใช้'], ['👑', ['มงกุฎ', 'crown'], 'ของใช้'], ['🎩', ['หมวก', 'หมวกทรงสูง', 'hat'], 'ของใช้'],
  ['👟', ['รองเท้า', 'รองเท้าผ้าใบ', 'shoe'], 'ของใช้'], ['🧸', ['ตุ๊กตาหมี', 'ตุ๊กตา', 'teddy'], 'ของใช้'], ['🎒', ['กระเป๋าเป้', 'กระเป๋า', 'bag'], 'ของใช้'], ['🏠', ['บ้าน', 'house'], 'ของใช้'],
].map(([e, a, c]) => ({ e, a, c }));

const TILES = 16;
const RANK = [1, 0.7, 0.5, 0.35, 0.25]; // 5 คนแรกที่ตอบถูกได้แต้มลดหลั่น
const AFTER_MS = 7000; // หลังมีคนตอบถูกคนแรก เปิดให้ตอบต่ออีก 7 วิ
const TEAM_EVERY = 5; // ทุก 5 รอบ = รอบทีมแดง/น้ำเงิน
// คำถามของช่อง (ตั้งในหลังบ้าน): “อีโมจิ | คำตอบ1, คำตอบ2” บรรทัดละข้อ
function parseCustom(text) {
  return String(text || '').split(/\r?\n/).map((l) => l.split('|')).filter((p) => p.length >= 2 && p[0].trim() && p[1].trim()).slice(0, 200)
    .map(([e, a]) => ({ e: [...e.trim()].slice(0, 4).join(''), a: a.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 8), c: 'ของช่อง' }));
}
const SHOW_MS = 45_000;
const ANSWER_MS = 7_000;
const norm = (s) => String(s || '').toLowerCase().replace(/[\s"'“”‘’!?.。,~]+/g, '').replace(/ๆ/g, '');
function lev(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 9;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

module.exports = function quiz(G) {
  const D = G.data;
  D.users ||= {}; // id → { n, s, w }
  D.customText ||= '';
  let S;
  let deck = [];
  let cdeck = [];
  const custom = () => parseCustom(D.customText);
  // คำถามของช่อง: ทุก 3 รอบ (ถ้ามี)
  const draw = () => {
    const cu = custom();
    if (cu.length && S.round % 3 === 0) {
      if (!cdeck.length) cdeck = cu.map((_, i) => i).sort(() => Math.random() - 0.5);
      return cu[cdeck.pop() % cu.length];
    }
    if (!deck.length) deck = BANK.map((_, i) => i).sort(() => Math.random() - 0.5);
    return BANK[deck.pop()];
  };

  function reset() {
    S = { round: 0, phase: 'answer', until: Date.now() + 3000, q: null, mask: 0, nextTile: 0, hint: 0, winner: null, board: {}, near: new Map(), likes: 0, double: false, order: [],
      solved: [], team: new Map(), teamMode: false, tscore: { r: 0, b: 0 }, tround: { r: 0, b: 0 } };
  }
  function newRound(t) {
    S.round += 1;
    S.q = draw();
    S.mask = 0;
    S.hint = 0;
    S.winner = null;
    S.solved = [];
    S.teamMode = S.round % TEAM_EVERY === 0;
    S.tround = { r: 0, b: 0 };
    S.order = Array.from({ length: TILES }, (_, i) => i).sort(() => Math.random() - 0.5);
    S.phase = 'show';
    S.until = t + SHOW_MS;
    S.nextTile = t + 1500;
    reveal(2);
    G.ev({ ev: 'round', round: S.round, c: S.q.c, double: S.double, team: S.teamMode });
    G.push(true);
  }
  const opened = () => S.mask.toString(2).replace(/0/g, '').length;
  function reveal(n) {
    for (let k = 0; k < n; k++) {
      const i = S.order.find((x) => !(S.mask & (1 << x)));
      if (i === undefined) return;
      S.mask |= 1 << i;
    }
  }
  function end(winner) {
    S.phase = 'answer';
    S.winner = winner;
    S.mask = 0xffff;
    S.until = Date.now() + ANSWER_MS;
    let tw = null;
    if (S.teamMode && (S.tround.r || S.tround.b)) {
      tw = S.tround.r === S.tround.b ? 'draw' : S.tround.r > S.tround.b ? 'r' : 'b';
      S.tscore.r += S.tround.r;
      S.tscore.b += S.tround.b;
      if (tw !== 'draw') for (const [id, t] of S.team) if (t === tw && S.solved.some((x) => x.id === id)) G.coin({ id, name: '' }, 10);
    }
    G.ev({ ev: 'answer', winner, a: S.q.a[0], solved: S.solved, team: S.teamMode ? { win: tw, r: S.tround.r, b: S.tround.b } : null });
    G.push(true);
  }
  const teamOf = (u) => {
    if (!S.team.has(u.id)) {
      let r = 0;
      let b = 0;
      for (const t of S.team.values()) t === 'r' ? r++ : b++;
      S.team.set(u.id, r <= b ? 'r' : 'b');
    }
    return S.team.get(u.id);
  };

  function tick(dt, t) {
    if (S.phase === 'answer' && t >= S.until) newRound(t);
    else if (S.phase === 'show') {
      if (t >= S.nextTile) {
        reveal(1);
        S.nextTile = t + 2600;
        if (!S.hint && t > S.until - SHOW_MS / 2) S.hint = 1;
        G.push();
      }
      if (t >= S.until) end(S.solved[0] || null);
    }
  }
  function onChat(u, n, raw) {
    if (n === 'คะแนน' || n === 'แต้มทาย') {
      const me = D.users[u.id] || S.board[u.id] || { s: 0, w: 0 };
      G.say(u, `🏆 แต้มทายภาพสะสม ${me.s} • ทายถูก ${me.w} ครั้ง`);
      return true;
    }
    if (S.phase !== 'show' || !S.q) return false;
    const t = norm(raw);
    if (!t) return false;
    const answers = S.q.a.map(norm);
    if (answers.includes(t)) {
      if (S.solved.some((x) => x.id === u.id) || S.solved.length >= RANK.length) return false;
      const rank = S.solved.length;
      const pts = Math.round((10 + (TILES - opened()) * 5) * (S.double ? 2 : 1) * RANK[rank]);
      const rec = G.test(u.id) ? (S.board[u.id] ||= { n: u.name, s: 0, w: 0 }) : (D.users[u.id] ||= { n: u.name, s: 0, w: 0 });
      rec.n = u.name;
      rec.s += pts;
      rec.w += 1;
      const b = (S.board[u.id] ||= { n: u.name, s: 0, w: 0 });
      if (b !== rec) (b.s += pts), (b.w += 1);
      G.save();
      G.addPoints(u, Math.round(pts / 5));
      G.coin(u, Math.max(2, Math.round(pts / 5)));
      G.stat(u, 'correct');
      const team = S.teamMode ? teamOf(u) : null;
      if (team) S.tround[team] += pts;
      S.solved.push({ id: u.id, name: u.name, pts, team });
      G.ev({ ev: 'correct', id: u.id, name: u.name, pts, rank: rank + 1, opened: opened(), team });
      if (rank === 0) {
        G.log('game', `🖼️ ${u.name} ทายถูก “${S.q.a[0]}” เป็นคนแรก (+${pts})`);
        S.until = Math.min(S.until, Date.now() + AFTER_MS);
      }
      if (S.solved.length >= RANK.length) end(S.solved[0]);
      else G.push(true);
      // ไม่บอกคำตอบในฟองคำพูด (คนอื่นจะลอก) — ซ่อนฟองข้อความนี้
      return true;
    }
    // ใกล้แล้ว: สะกดผิด 1 ตัว หรือมีคำตอบอยู่ในข้อความ
    const near = answers.some((a) => (a.length >= 3 && lev(a, t) === 1) || (a.length >= 3 && t.length > a.length && t.includes(a)));
    if (near && Date.now() - (S.near.get(u.id) || 0) > 5000) {
      S.near.set(u.id, Date.now());
      G.ev({ ev: 'near', id: u.id, name: u.name });
    }
    return false;
  }
  function onLike(u, count) {
    S.likes += count;
    if (S.likes >= 60 && S.phase === 'show') {
      S.likes = 0;
      reveal(1);
      G.ev({ ev: 'likeOpen' });
      G.push();
    }
  }
  function onGift(u, total, tier) {
    if (S.phase === 'show') {
      if (tier === 1) reveal(1);
      else if (tier === 2) {
        S.hint = 2;
        reveal(1);
      } else reveal(8);
    }
    G.ev({ ev: 'gift', tier, id: u.id, name: u.name });
    G.push(true);
  }
  function onGoal(goal) {
    if (goal?.effect === 'g9') {
      S.double = true;
      G.ev({ ev: 'double' });
    }
  }
  function snapshot(full) {
    const q = S.q;
    const a0 = q?.a[0] || '';
    const s = {
      phase: S.phase, round: S.round, left: Math.max(0, Math.round((S.until - Date.now()) / 1000)), e: q?.e || null, c: q?.c || '', mask: S.mask, opened: opened(),
      hint: S.hint ? (S.hint >= 2 ? `${[...a0].length} ตัวอักษร · ขึ้นต้น “${[...a0][0]}” ลงท้าย “${[...a0].slice(-1)[0]}”` : `${[...a0].length} ตัวอักษร · ขึ้นต้นด้วย “${[...a0][0]}”`) : '',
      answer: S.phase === 'answer' ? a0 : null, winner: S.winner, double: S.double, solved: S.solved.map((x) => ({ n: x.name, pts: x.pts, team: x.team })),
      teamMode: S.teamMode, tscore: S.tscore, tround: S.tround,
      board: Object.values(S.board).sort((a, b) => b.s - a.s).slice(0, 3).map((x) => ({ n: x.n, s: x.s })),
    };
    if (full) s.fame = Object.values(D.users).sort((a, b) => b.s - a.s).slice(0, 3).map((x) => ({ n: x.n, s: x.s, w: x.w }));
    return s;
  }
  function admin(action, d) {
    if (action === 'custom') {
      if (typeof d?.text === 'string') {
        D.customText = d.text.slice(0, 20_000);
        G.save();
      }
      return { ok: true, text: D.customText, count: custom().length };
    }
    if (action === 'next') {
      if (S.phase === 'show') end(null);
      else newRound(Date.now());
      return { ok: true };
    }
    if (action === 'reset') {
      D.users = {};
      G.save();
      return { ok: true };
    }
    return { ok: false, error: 'ไม่รู้จักคำสั่ง' };
  }
  // เฉลยสำหรับหลังบ้าน (ไม่ส่งขึ้นหน้าเวที)
  function peek() {
    return { round: S.round, phase: S.phase, e: S.q?.e || null, c: S.q?.c || '', a: S.q?.a || [], left: Math.max(0, Math.round((S.until - Date.now()) / 1000)), solved: S.solved.map((x) => x.name), opened: opened() };
  }
  return { reset, tick, onChat, onLike, onGift, onGoal, snapshot, admin, peek };
};
module.exports.BANK = BANK;
module.exports.parseCustom = parseCustom;
