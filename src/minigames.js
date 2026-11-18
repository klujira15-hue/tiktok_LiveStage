/* Live Stage — มินิเกม 6 ธีม (แข่งเรือยาว ตกปลา หมู่บ้าน ทายภาพ ครัว ป้องกันปราสาท)
 * ไฟล์นี้เป็นตัวกลาง: เลือกเกมตามธีมที่ใช้อยู่ (THEMES[id].mg) ส่งคอมเมนต์/ไลก์/ของขวัญให้เกมนั้น
 * แต่ละเกมอยู่ใน mg/<เกม>.js — เซิร์ฟเวอร์เป็นคนตัดสินผลทั้งหมด หน้าเวทีแค่วาดตาม (เปิดหลายจอก็ไม่นับซ้ำ)
 * ข้อมูลที่เก็บข้ามไลฟ์ (สมุดปลา หมู่บ้าน สถิติ) อยู่ใน data/minigames.json แยกตามเกม
 */
'use strict';
const fs = require('fs');
const path = require('path');

const norm = (s) => String(s || '').toLowerCase().replace(/[\s"'“”‘’!?.。,]+/g, '');
const FACT = {
  boat: () => require('./mg/boat'),
  fish: () => require('./mg/fish'),
  village: () => require('./mg/village'),
  quiz: () => require('./mg/quiz'),
  kitchen: () => require('./mg/kitchen'),
  castle: () => require('./mg/castle'),
  climb: () => require('./mg/climb'), // เกมปีนขึ้นฟ้า (2 ฉาก: climbcity / climbsky)
  escape: () => require('./mg/escape'), // เกมหนีออกจากตึก 19 ชั้น
  brawl: () => require('./mg/brawl'), // ศึกหัวร้อน (คนดูทุกคนมีตัวละคร ตีกัน)
  pet: () => require('./mg/pet'), // เลี้ยงน้องกวางวิเศษ (3D โตข้ามไลฟ์)
};

module.exports = function createMiniGames(ctx) {
  let rot = null; // ตัวบอกเกมถัดไป (ตั้งจาก server.js)
  // ctx: { io, log, dataDir, theme(), addPoints(u, n), topId(), crowd(), audienceIds() }
  const { io, log } = ctx;
  const FILE = path.join(ctx.dataDir, 'minigames.json');
  let store = {};
  try {
    store = JSON.parse(fs.readFileSync(FILE, 'utf8')) || {};
  } catch {}
  let dirty = false;
  const save = () => {
    if (!dirty) return;
    dirty = false;
    try {
      fs.mkdirSync(ctx.dataDir, { recursive: true });
      fs.writeFileSync(FILE, JSON.stringify(store));
    } catch (e) {
      log('error', 'บันทึกข้อมูลมินิเกมไม่สำเร็จ: ' + e.message);
    }
  };
  setInterval(save, 10_000);

  const keyNow = () => ctx.theme()?.mg || null;
  // บั๊กในเกมต้องไม่ทำให้โปรแกรมทั้งตัวล่มกลางไลฟ์ — จับไว้แล้วบันทึก log (เตือนซ้ำไม่เกินนาทีละครั้ง)
  let lastErr = 0;
  const safe = (fn, fallback) => {
    try {
      return fn();
    } catch (e) {
      if (Date.now() - lastErr > 60_000) {
        lastErr = Date.now();
        log('error', `มินิเกม ${keyNow()}: ${e?.message || e}`);
      }
      return fallback;
    }
  };
  // ---------------------------------------------------------------- โปรไฟล์กลาง (ใช้ร่วมทุกเกม): เหรียญ + ป้ายเซียน
  const BADGES = {
    boat: { stat: 'stroke', need: 100, icon: '🚣', name: 'ฝีพายทอง' },
    fish: { stat: 'species', need: 10, icon: '🎣', name: 'เซียนตกปลา' },
    village: { stat: 'farm', need: 100, icon: '🌾', name: 'ชาวนาดีเด่น' },
    quiz: { stat: 'correct', need: 10, icon: '🖼️', name: 'เซียนทายภาพ' },
    kitchen: { stat: 'cook', need: 50, icon: '🍳', name: 'เชฟมือทอง' },
    castle: { stat: 'kill', need: 50, icon: '🏹', name: 'มือธนูเทพ' },
    escape: { stat: 'good', need: 30, icon: '🔦', name: 'นักหนีตึก' },
    brawl: { stat: 'ko', need: 50, icon: '👊', name: 'ราชาสังเวียน' },
    pet: { stat: 'care', need: 300, icon: '🦌', name: 'พ่อแม่ใจดี' },
  };
  const PROF = (store._prof ||= {});
  const tmpProf = {};
  const isTest = (id) => String(id || '').startsWith('test:');
  function prof(u) {
    const bag = isTest(u.id) ? tmpProf : PROF;
    const p = (bag[u.id] ||= { n: u.name, coins: 0, st: {}, b: [] });
    if (u.name) p.n = u.name;
    return p;
  }
  const icons = (id) => {
    const p = PROF[id] || tmpProf[id];
    return p ? p.b.map((k) => BADGES[k]?.icon || '').join('') : '';
  };
  function coin(u, n) {
    if (!u?.id || !n) return 0;
    const p = prof(u);
    p.coins = Math.max(0, p.coins + Math.round(n));
    dirty = true;
    return p.coins;
  }
  // นับสถิติ (set = ตั้งค่าแทนการบวก) — ถึงเกณฑ์ได้ป้ายเซียนของเกมนั้น
  function stat(u, key, name, n = 1, set = false) {
    if (!u?.id) return;
    const p = prof(u);
    p.st[name] = set ? n : (p.st[name] || 0) + n;
    dirty = true;
    const bd = BADGES[key];
    if (bd && bd.stat === name && p.st[name] >= bd.need && !p.b.includes(key)) {
      p.b.push(key);
      coin(u, 50);
      io.emit('themeEvent', { type: 'mg', game: keyNow(), ev: 'badge', id: u.id, name: u.name, icon: bd.icon, title: bd.name });
      log('game', `${bd.icon} ${u.name} ได้ป้าย “${bd.name}”`);
    }
  }

  const inst = {};
  function game(key) {
    if (!key || !FACT[key]) return null;
    if (!inst[key]) {
      const api = {
        key, log, norm,
        data: (store[key] ||= {}),
        save: () => (dirty = true),
        ev: (d) => keyNow() === key && io.emit('themeEvent', { type: 'mg', game: key, ...d }),
        push: (now) => push(key, now),
        say: (u, text) => io.emit('say', { id: u.id, text }),
        addPoints: (u, n) => ctx.addPoints?.(u, n),
        crowd: () => ctx.crowd?.() || 0,
        audienceIds: () => ctx.audienceIds?.() || [],
        member: (id) => ctx.member?.(id) || null, // { name, color, avatar } ของคนดูที่อยู่ในไลฟ์
        topId: () => ctx.topId?.() || null,
        scene: () => ctx.theme()?.hud?.climb?.scene || null, // ฉากของธีมที่ใช้เกมเดียวกัน (เกมปีน: city / sky)
        test: isTest,
        prof, coin, icons,
        profOf: (id) => PROF[id] || tmpProf[id] || null,
        stat: (u, name, n, set) => stat(u, key, name, n, set),
      };
      const g = safe(() => FACT[key]()(api), null);
      if (!g) return null;
      inst[key] = g;
      safe(() => g.reset?.());
    }
    return inst[key];
  }
  const cur = () => game(keyNow());

  let pushT = null;
  function push(key, now) {
    if (keyNow() !== key) return;
    const send = () => {
      pushT = null;
      const g = cur();
      if (g) safe(() => io.emit('themeEvent', { type: 'mgState', game: keyNow(), ...g.snapshot(false) }));
    };
    if (now) {
      clearTimeout(pushT);
      send();
    } else if (!pushT) pushT = setTimeout(send, 300);
  }
  setInterval(() => {
    const g = cur();
    if (g) safe(() => {
        const badges = {};
        for (const id of ctx.audienceIds?.() || []) {
          const ic = icons(id);
          if (ic) badges[id] = ic;
        }
        io.emit('themeEvent', { type: 'mgState', game: keyNow(), ...g.snapshot(true), badges, next: rot?.() || null });
      });
  }, 3000);
  let last = Date.now();
  setInterval(() => {
    const t = Date.now();
    const dt = Math.min(1, (t - last) / 1000);
    last = t;
    const g = cur();
    if (g) safe(() => g.tick?.(dt, t));
  }, 250);

  const tierOf = (g, total) => Number(String(ctx.theme()?.effects?.[g?.effect]?.kind || '').replace(/\D/g, '')) || (total >= 169 ? 3 : total >= 20 ? 2 : 1);
  return {
    // คืน true = เป็นคำสั่งของเกม (ไม่ต้องส่งต่อให้ระบบคำสั่งทั่วไป)
    onChat(u, text) {
      const g = cur();
      if (!g || !u?.id) return false;
      const n0 = norm(text);
      if (n0 === 'โปรไฟล์' || n0 === 'เหรียญ' || n0 === 'profile') {
        const p = prof(u);
        const b = p.b.map((k) => `${BADGES[k].icon}${BADGES[k].name}`).join(' ');
        io.emit('say', { id: u.id, text: `🪙 ${p.coins.toLocaleString('en-US')} เหรียญ${b ? ` • ${b}` : ' • ยังไม่มีป้ายเซียน'}` });
        return true;
      }
      return !!safe(() => g.onChat?.(u, norm(text), String(text || '').trim()), false);
    },
    onLike(u, count) {
      const g = cur();
      if (g && u?.id) safe(() => g.onLike?.(u, count));
    },
    onGift(u, total, g) {
      const gm = cur();
      if (gm && u?.id) safe(() => gm.onGift?.(u, total, tierOf(g, total), g));
    },
    onGoal(goal) {
      const g = cur();
      if (g) safe(() => g.onGoal?.(goal));
    },
    reset() {
      for (const g of Object.values(inst)) safe(() => g.reset?.());
    },
    register(socket) {
      socket.on('mg:get', (_, ack) => {
        const g = cur();
        if (typeof ack === 'function') ack(g ? safe(() => ({ type: 'mgState', game: keyNow(), ...g.snapshot(true), next: rot?.() || null }), null) : null);
      });
      // เฉลยทายภาพ (หลังบ้านเท่านั้น)
      socket.on('mg:quizAnswer', (_, ack) => {
        const g = keyNow() === 'quiz' ? cur() : null;
        if (typeof ack === 'function') ack(g?.peek ? safe(() => g.peek(), null) : null);
      });
      // คำถามของช่อง (ทายภาพ) ตั้งได้แม้ไม่ได้ใช้ธีมนั้นอยู่
      socket.on('mg:quizCustom', (d, ack) => {
        const D = (store.quiz ||= {});
        if (typeof d?.text === 'string') {
          D.customText = d.text.slice(0, 20_000);
          dirty = true;
        }
        const count = require('./mg/quiz').parseCustom(D.customText || '').length;
        if (typeof ack === 'function') ack({ ok: true, text: D.customText || '', count });
      });
      // ปุ่มหลังบ้าน/ทดสอบ: { action }
      socket.on('mg:admin', (d, ack) => {
        const g = cur();
        const r = (g && safe(() => g.admin?.(d?.action, d), { ok: false, error: 'เกิดข้อผิดพลาด' })) || { ok: !!g };
        if (typeof ack === 'function') ack(r);
      });
    },
    setRotation(fn) {
      rot = fn;
    },
    flush() {
      dirty = true;
      save();
    },
  };
};
