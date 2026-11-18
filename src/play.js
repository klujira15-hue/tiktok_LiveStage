/* Live Stage — ระบบเล่นด้วยการพิมพ์ (ใช้กับทุกธีม)
 *  - คำสั่งพิมพ์ของธีม (เช่น "รำ" "ให้อาหารปลา") → ตัวละครคนดูทำท่า / โซนกิจกรรมนับเพิ่ม
 *  - เป้าหมาย 2 แถบ: เหรียญ (เพชร) และ ใจ (ไลค์) ครบแล้วเกิดกิจกรรมใหญ่ แล้วเริ่มนับรอบใหม่
 *  - แต้มคนดู (สะสมข้ามไลฟ์ data/points.json): พิมพ์คำสั่ง ไลค์ ส่งของขวัญ ชนะเกม ติดตาม แชร์
 *  - ร้านแลกแต้ม: พิมพ์ "แต้ม" ดูแต้ม • "แลก" ดูของ • "แลก มงกุฎ" แลกของ
 * ธีมที่มีข้อมูล hud (ดู hudthemes.js) แสดงแผงครบชุดบนหน้าเวที ธีมอื่นใช้แต้ม/ร้านแลกได้เหมือนกัน
 */
'use strict';
const fs = require('fs');
const path = require('path');

const norm = (s) => String(s || '').toLowerCase().replace(/[\s"'“”‘’!?.。,]+/g, '');

const DEFAULT_SHOP = [
  { key: 'wave', name: 'ทักทาย', alias: ['โบกมือ', 'wave', 'hi'], cost: 20, desc: 'ตัวละครหลักโบกมือเรียกชื่อคุณ' },
  { key: 'spot', name: 'สปอตไลต์', alias: ['ไฟส่อง', 'สปอต', 'spot'], cost: 40, desc: 'ไฟส่องคุณกลางฉาก + ประกาศชื่อ' },
  { key: 'fireworks', name: 'พลุ', alias: ['ดอกไม้ไฟ', 'fireworks'], cost: 80, desc: 'จุดพลุเต็มฟ้าในชื่อคุณ' },
  { key: 'crown', name: 'มงกุฎ', alias: ['มงกุด', 'crown'], cost: 150, desc: 'ใส่มงกุฎตลอดไลฟ์นี้' },
];
// ตู้เสื้อผ้าคนดู (ซื้อด้วยแต้ม · จำไว้ข้ามไลฟ์ใน data/points.json) — พิมพ์ "แต่งตัว หมวก" / "แต่งตัว สีแดง" / "แต่งตัว ถอด"
const WEAR = [
  { key: 'hat', slot: 'hat', name: 'หมวก', alias: ['หมวกสาน', 'hat'], cost: 80 },
  { key: 'cap', slot: 'hat', name: 'หมวกแก๊ป', alias: ['แก๊ป', 'cap'], cost: 60 },
  { key: 'tiara', slot: 'hat', name: 'มงกุฎทอง', alias: ['มงกุฎถาวร', 'tiara'], cost: 300 },
  { key: 'cat', slot: 'pet', name: 'แมว', alias: ['น้องแมว', 'cat'], cost: 500 },
  { key: 'dog', slot: 'pet', name: 'หมา', alias: ['น้องหมา', 'dog'], cost: 500 },
];
const WEAR_COLORS = { แดง: '#e8453c', ส้ม: '#ff9f43', เหลือง: '#ffd166', เขียว: '#22c55e', ฟ้า: '#4fc3ff', น้ำเงิน: '#3b82f6', ม่วง: '#8a6bd1', ชมพู: '#ff4fa3', ดำ: '#2a2633', ขาว: '#f4f1ec' };
const WEAR_COLOR_COST = 40;
const DEFAULT_PLAY = { enabled: true, points: true, shop: true, cooldown: 20, items: DEFAULT_SHOP.map((s) => ({ key: s.key, cost: s.cost, on: true })) };
const EARN = { cmd: 1, likes10: 1, diamond: 2, win: 10, follow: 5, share: 3 };
// ธีมสัตว์เลี้ยง: น้องโตตามเช็คพอยต์ — step = เพชรต่อร่าง (กุหลาบ 1 ดอก = 1 เพชร) ร่าง 2/3/4/5 ที่ step×1/2/3/5 • keep = จำร่างข้ามไลฟ์
const DEFAULT_GROW = { on: true, step: 10, keep: false };
function sanitizeGrow(g) {
  return { on: g?.on !== false, step: Math.min(100000, Math.max(1, Math.round(Number(g?.step) || 10))), keep: !!g?.keep };
}
const growStage = (pts, step) => 1 + [1, 2, 3, 5].filter((k) => pts >= k * step).length;
const growNext = (stage, step) => (stage >= 5 ? null : [1, 2, 3, 5][stage - 1] * step);

function sanitizePlay(p) {
  const items = DEFAULT_SHOP.map((s) => {
    const x = (p?.items || []).find((i) => i && i.key === s.key) || {};
    return { key: s.key, cost: Math.min(100000, Math.max(1, Math.round(Number(x.cost) || s.cost))), on: x.on !== false };
  });
  return {
    enabled: p?.enabled !== false,
    points: p?.points !== false,
    shop: p?.shop !== false,
    cooldown: Math.min(300, Math.max(3, Math.round(Number(p?.cooldown) || 20))),
    items,
  };
}

module.exports = function createPlay(ctx) {
  // ctx: { io, log, dataDir, theme(): THEMES[current], cfg(): config.play }
  const { io, log } = ctx;
  const FILE = path.join(ctx.dataDir, 'points.json');
  // ร่างน้องที่จำข้ามไลฟ์ (เฉพาะตอนเปิด keep) — { ธีม: เพชรสะสม }
  const GROW_FILE = path.join(ctx.dataDir, 'pet-grow.json');
  let growSaved = {};
  try {
    growSaved = JSON.parse(fs.readFileSync(GROW_FILE, 'utf8')) || {};
  } catch {}
  const growCfg = () => sanitizeGrow(ctx.growCfg?.());
  const themeId = () => ctx.theme()?.id || '';
  let growT = null;
  function saveGrow() {
    clearTimeout(growT);
    growT = setTimeout(() => {
      try {
        fs.writeFileSync(GROW_FILE, JSON.stringify(growSaved));
      } catch {}
    }, 1500);
  }
  let points = {};
  try {
    points = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {}
  let dirty = false;
  setInterval(() => {
    if (!dirty) return;
    dirty = false;
    try {
      fs.mkdirSync(ctx.dataDir, { recursive: true });
      fs.writeFileSync(FILE, JSON.stringify(points));
    } catch (e) {
      log('error', 'บันทึกแต้มไม่สำเร็จ: ' + e.message);
    }
  }, 10_000);

  const cfg = () => ctx.cfg() || DEFAULT_PLAY;
  const hud = () => ctx.theme()?.hud || null;

  // รวมแต้ม/ชุดที่ 1.4.1 บันทึกไว้ใต้ชื่อผู้ใช้ (from) เข้ากับ id ถาวร (to) — ชุดล่าสุดมาจาก 1.4.1
  function mergeId(from, to) {
    const a = points[from];
    if (!a || from === to) return false;
    const b = points[to];
    if (!b) points[to] = a;
    else {
      b.p = (b.p || 0) + (a.p || 0);
      if (a.w && Object.keys(a.w).length) b.w = { ...(b.w || {}), ...a.w };
      if (a.n) b.n = a.n;
    }
    delete points[from];
    dirty = true;
    return true;
  }
  // ---------------------------------------------------------------- แต้ม
  function pt(u) {
    const r = (points[u.id] ||= { n: u.name, p: 0 });
    if (u.name) r.n = u.name;
    return r;
  }
  function addPts(u, n) {
    if (!u?.id || !n || !cfg().points) return;
    pt(u).p += n;
    dirty = true;
  }

  // ---------------------------------------------------------------- สถานะไลฟ์รอบนี้
  let S = null;
  function reset() {
    S = { zones: {}, board: {}, coins: 0, coinsDone: 0, likes: 0, likesDone: 0, likesAt: null, crowned: [], pet: { full: 40, at: Date.now(), bites: 0, fulls: 0, grow: growCfg().keep ? growSaved[themeId()] || 0 : 0 } };
    syncLikes(ctx.totalLikes?.() || 0);
    push(true);
  }
  // หลอดเป้าหมายหัวใจ = ยอดหัวใจรวมของไลฟ์ (ตรงกับ TikTok) — ต่อไลฟ์ช้า/เปลี่ยนธีมกลางไลฟ์ หลอดก็เริ่มจากยอดรวม
  // ส่วนที่มีอยู่ก่อนแล้วตั้งค่าเงียบ ๆ ไม่ยิงรางวัลย้อนหลัง • รางวัลยิงเฉพาะตอนข้ามเป้าระหว่างไลฟ์
  function syncLikes(total) {
    if (!(total > 0) || S.likesAt != null) return false;
    S.likesAt = total;
    const max = hud()?.goals?.[1]?.max;
    if (max > 0) {
      S.likes = total % max;
      S.likesDone = Math.floor(total / max);
    }
    return true;
  }
  // ---------------------------------------------------------------- ธีมสัตว์เลี้ยง: หลอดอิ่ม (ลดลงเรื่อย ๆ 100 → 0 ใน 10 นาที)
  const PET_RATE = 100 / 600;
  const petOn = () => !!hud()?.pet;
  const petCur = () => Math.max(0, S.pet.full - ((Date.now() - S.pet.at) / 1000) * PET_RATE);
  function petAdd(u, amount, bites) {
    if (!petOn()) return;
    const f = petCur() + amount;
    S.pet.at = Date.now();
    S.pet.bites += bites;
    if (f >= 100) {
      S.pet.fulls += 1;
      S.pet.full = 30;
      S.pet.bites = 0;
      io.emit('themeEvent', { type: 'petFull', id: u?.id || null, name: u?.name || '', fulls: S.pet.fulls });
      log('game', `🍽️ ${hud().pet.name}อิ่มพุงกาง! (ครั้งที่ ${S.pet.fulls}) — ป้อนคำสุดท้ายโดย ${u?.name || '-'}`);
    } else S.pet.full = f;
    push();
  }
  function petBoard(u, n) {
    S.zones.feed = (S.zones.feed || 0) + n;
    const b = (S.board[u.id] ||= { n: u.name, s: 0 });
    b.n = u.name;
    b.s += n;
  }
  function state() {
    const h = hud();
    const goals = h
      ? [
          { key: 'coins', label: h.goals[0].label, reward: h.goals[0].reward, cur: S.coins, max: h.goals[0].max, done: S.coinsDone },
          { key: 'likes', label: h.goals[1].label, reward: h.goals[1].reward, cur: S.likes, max: h.goals[1].max, done: S.likesDone },
        ]
      : [];
    const board = Object.entries(S.board).map(([id, v]) => ({ id, n: v.n, s: v.s })).sort((a, b) => b.s - a.s).slice(0, 3);
    const gc = growCfg();
    const stage = gc.on ? growStage(S.pet.grow, gc.step) : 1;
    const pet = petOn()
      ? { full: Math.round(petCur() * 10) / 10, rate: PET_RATE, bites: S.pet.bites, fulls: S.pet.fulls, grow: { on: gc.on, pts: S.pet.grow, stage, next: gc.on ? growNext(stage, gc.step) : null, step: gc.step } }
      : null;
    return { type: 'hud', goals, zones: S.zones, zboard: board, crowned: S.crowned, pet };
  }
  let pushT = null;
  function push(now) {
    clearTimeout(pushT);
    const send = () => hud() && io.emit('themeEvent', state());
    if (now) send();
    else pushT = setTimeout(send, 500);
  }
  reset();

  // ---------------------------------------------------------------- เป้าหมาย
  function goalTick(key, add) {
    const h = hud();
    if (!h) return;
    const i = key === 'coins' ? 0 : 1;
    const g = h.goals[i];
    S[key] += add;
    // ของขวัญใหญ่ชิ้นเดียวอาจครบเป้าหลายรอบ (เช่น 999 เพชร กับเป้า 100) → ยิงรางวัลครั้งเดียว บอกจำนวนรอบ ไม่ให้เอฟเฟกต์ซ้อนกันหลายชั้น
    let times = 0;
    while (S[key] >= g.max) {
      S[key] -= g.max;
      S[key + 'Done'] += 1;
      times++;
    }
    if (times) {
      io.emit('themeEvent', { type: 'goal', key, reward: g.reward, effect: g.effect, done: S[key + 'Done'], times });
      log('hype', `🎯 เป้าหมาย${g.label}ครบ → ${g.reward} (ครั้งที่ ${S[key + 'Done']}${times > 1 ? ` • ครบทีเดียว ${times} รอบ` : ''})`);
      ctx.onGoal?.(g);
    }
    push();
  }

  // ---------------------------------------------------------------- เหตุการณ์จากไลฟ์
  const lastCmd = new Map();
  const likeAcc = new Map();
  function onChat(u, text) {
    const c = cfg();
    if (!c.enabled) return false;
    const n = norm(text);
    const raw = String(text || '').trim();
    // แต้ม / ร้านแลก (ทุกธีม)
    if (c.points && (n === 'แต้ม' || n === 'point' || n === 'points')) {
      io.emit('say', { id: u.id, text: `มี ${pt(u).p.toLocaleString('en-US')} แต้ม • พิมพ์ "แลก" ดูของ` });
      return true;
    }
    if (c.points && c.shop && (n === 'แลก' || n === 'ร้าน' || n === 'shop')) {
      const list = c.items.filter((i) => i.on).map((i) => `${DEFAULT_SHOP.find((s) => s.key === i.key).name} ${i.cost}`);
      io.emit('say', { id: u.id, text: `แลก: ${list.join(' • ')} แต้ม (พิมพ์ "แลก ชื่อของ")` });
      return true;
    }
    if (c.points && c.shop && n.startsWith('แลก') && n.length > 3) {
      const want = n.slice(3);
      const item = c.items.find((i) => {
        const d = DEFAULT_SHOP.find((s) => s.key === i.key);
        return i.on && [d.name, ...(d.alias || [])].some((x) => norm(x) === want);
      });
      if (!item) return false;
      const r = pt(u);
      const def = DEFAULT_SHOP.find((s) => s.key === item.key);
      if (r.p < item.cost) {
        io.emit('say', { id: u.id, text: `แต้มไม่พอ (มี ${r.p} ต้องใช้ ${item.cost})` });
        return true;
      }
      if (item.key === 'crown' && S.crowned.includes(u.id)) {
        io.emit('say', { id: u.id, text: 'ใส่มงกุฎอยู่แล้ว 👑' });
        return true;
      }
      r.p -= item.cost;
      dirty = true;
      if (item.key === 'crown') S.crowned.push(u.id);
      io.emit('shop', { item: item.key, name: def.name, user: { id: u.id, name: u.name, avatar: u.avatar || '' } });
      log('game', `🛍️ ${u.name} แลก ${def.name} (${item.cost} แต้ม)`);
      push();
      return true;
    }
    // ตู้เสื้อผ้า (จำข้ามไลฟ์)
    if (c.points && c.shop && n.startsWith('แต่งตัว')) {
      const want = n.slice(7);
      const r = pt(u);
      if (!want) {
        io.emit('say', { id: u.id, text: `แต่งตัว: ${WEAR.map((w) => `${w.name} ${w.cost}`).join(' • ')} • สีเสื้อ ${WEAR_COLOR_COST} แต้ม (พิมพ์ "แต่งตัว หมวก" / "แต่งตัว สีแดง")` });
        return true;
      }
      if (want === 'ถอด' || want === 'ถอดหมด') {
        r.w = {};
        dirty = true;
        io.emit('wear', { id: u.id, wear: {} });
        ctx.onWear?.(u.id, {});
        return true;
      }
      const colorName = Object.keys(WEAR_COLORS).find((k) => want === k || want === 'สี' + k || want === 'เสื้อ' + k || want === 'เสื้อสี' + k);
      const item = colorName ? null : WEAR.find((w) => [w.name, ...w.alias].some((x) => norm(x) === want));
      if (!colorName && !item) return false;
      const cost = colorName ? WEAR_COLOR_COST : item.cost;
      const w = (r.w ||= {});
      if (item && w[item.slot] === item.key) {
        io.emit('say', { id: u.id, text: `ใส่${item.name}อยู่แล้ว` });
        return true;
      }
      if (r.p < cost) {
        io.emit('say', { id: u.id, text: `แต้มไม่พอ (มี ${r.p} ต้องใช้ ${cost})` });
        return true;
      }
      r.p -= cost;
      if (colorName) w.color = WEAR_COLORS[colorName];
      else w[item.slot] = item.key;
      dirty = true;
      io.emit('wear', { id: u.id, name: u.name, wear: w, got: colorName ? `เสื้อสี${colorName}` : item.name });
      ctx.onWear?.(u.id, w);
      log('game', `👕 ${u.name} แต่งตัว: ${colorName ? 'สี' + colorName : item.name} (${cost} แต้ม)`);
      return true;
    }
    // คำสั่งของธีม
    const h = hud();
    if (!h) return false;
    const cmd = h.cmds.find((x) => norm(x.c) === n || (x.alias || []).some((a) => norm(a) === n));
    if (!cmd) return false;
    const now = Date.now();
    const key = u.id + '|' + cmd.c;
    if (now - (lastCmd.get(key) || 0) < c.cooldown * 1000) return true;
    lastCmd.set(key, now);
    addPts(u, EARN.cmd);
    if (cmd.zone) {
      S.zones[cmd.zone] = (S.zones[cmd.zone] || 0) + 1;
      const b = (S.board[u.id] ||= { n: u.name, s: 0 });
      b.n = u.name;
      b.s += 1;
      push();
    }
    if (cmd.kind === 'feed') petAdd(u, 5, 1);
    io.emit('themeEvent', { type: 'cmd', id: u.id, name: u.name, cmd: cmd.c, kind: cmd.kind || 'emote', emoji: cmd.emoji || '', zone: cmd.zone || null, label: cmd.a, food: cmd.food || null });
    void raw;
    return true;
  }
  function onLike(u, count, total) {
    let add = count;
    if (total > 0) {
      if (syncLikes(total)) add = 0; // หัวใจครั้งแรกที่เห็น: ยอดรวมรวมครั้งนี้ไว้แล้ว
      else {
        add = Math.max(0, total - S.likesAt); // TikTok ส่งยอดรวมมาไม่เรียงบางที → ไม่นับถอยหลัง
        S.likesAt = Math.max(S.likesAt, total);
      }
    }
    if (add) goalTick('likes', add);
    else push();
    const acc = (likeAcc.get(u.id) || 0) + count;
    likeAcc.set(u.id, acc % 10);
    addPts(u, Math.floor(acc / 10) * EARN.likes10);
  }
  function onGift(u, diamonds, g) {
    goalTick('coins', diamonds);
    addPts(u, diamonds * EARN.diamond);
    if (petOn() && u?.id) {
      // ของขวัญ = อาหาร: 1-9 เพชร +12 ต่อชิ้น • 10-99 +35 • 100+ อิ่มเต็มหลอด
      const each = g?.diamonds ?? diamonds;
      const count = Math.max(1, g?.count ?? 1);
      petBoard(u, count);
      petAdd(u, each >= 100 ? 100 : each >= 10 ? 35 : Math.min(60, 12 * count), each >= 10 ? 3 : count);
      growAdd(u, diamonds);
    }
  }
  // น้องโต: เพชรสะสมครบเช็คพอยต์ → เปลี่ยนร่าง (ข้ามหลายร่างได้ถ้าของขวัญใหญ่)
  function growAdd(u, pts) {
    const gc = growCfg();
    if (!gc.on || !pts) return;
    const before = growStage(S.pet.grow, gc.step);
    S.pet.grow += pts;
    if (gc.keep) {
      growSaved[themeId()] = S.pet.grow;
      saveGrow();
    }
    const after = growStage(S.pet.grow, gc.step);
    if (after > before) {
      io.emit('themeEvent', { type: 'petGrow', stage: after, from: before, id: u?.id || null, name: u?.name || '', pts: S.pet.grow });
      log('game', `🌱 ${hud()?.pet?.name || 'น้อง'}โตเป็นร่าง ${after} — ขอบคุณ ${u?.name || '-'} (${S.pet.grow} เพชร)`);
    }
    push(true);
  }
  function growSet(stage) {
    const gc = growCfg();
    const before = growStage(S.pet.grow, gc.step);
    S.pet.grow = stage <= 1 ? 0 : [1, 2, 3, 5][stage - 2] * gc.step;
    if (gc.keep) {
      growSaved[themeId()] = S.pet.grow;
      saveGrow();
    }
    const after = growStage(S.pet.grow, gc.step);
    if (after > before) io.emit('themeEvent', { type: 'petGrow', stage: after, from: before, id: null, name: '', pts: S.pet.grow });
    push(true);
  }
  function onSocial(u, kind) {
    addPts(u, kind === 'follow' ? EARN.follow : EARN.share);
  }
  function onWin(u) {
    addPts(u, EARN.win);
  }

  function register(socket) {
    if (hud()) socket.emit('themeEvent', state());
    socket.on('play:resetPoints', (_, ack) => {
      for (const k of Object.keys(points)) delete points[k];
      dirty = true;
      log('system', 'ล้างแต้มคนดูทั้งหมดแล้ว');
      ack?.();
    });
    socket.on('pet:growSet', (stage, ack) => {
      if (!petOn()) return ack?.({ ok: false, error: 'ใช้ได้กับธีมสัตว์เลี้ยง' });
      growSet(Math.max(1, Math.min(5, Math.round(Number(stage) || 1))));
      ack?.({ ok: true });
    });
    socket.on('pet:growReset', (_, ack) => {
      growSaved = {};
      saveGrow();
      S.pet.grow = 0;
      push(true);
      ack?.({ ok: true });
    });
    socket.on('play:topPoints', (_, ack) =>
      ack?.(Object.entries(points).map(([id, r]) => ({ id, n: r.n, p: r.p })).sort((a, b) => b.p - a.p).slice(0, 20)),
    );
  }

  return { onChat, onLike, onGift, onSocial, onWin, register, reset, state, refreshPet: () => push(true), addPoints: (u, n) => addPts(u, n), wearOf: (id) => points[id]?.w || null, themeChanged: reset, flush: () => fs.writeFileSync(FILE, JSON.stringify(points)), mergeId };
};
module.exports.DEFAULT_PLAY = DEFAULT_PLAY;
module.exports.DEFAULT_SHOP = DEFAULT_SHOP;
module.exports.sanitizePlay = sanitizePlay;
module.exports.sanitizeGrow = sanitizeGrow;
module.exports.DEFAULT_GROW = DEFAULT_GROW;
