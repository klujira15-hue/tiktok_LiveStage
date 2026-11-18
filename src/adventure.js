/* Live Stage — เกมธีม "ปาร์ตี้ผจญภัย" (ฝั่งเซิร์ฟเวอร์เป็นคนตัดสินทุกอย่าง: เลือดศัตรู ดาเมจ เลเวล ทอง)
 * หน้าเวทีแค่วาดตามสถานะที่ส่งไป → เปิดหน้าเวทีหลายจอ (OBS + พรีวิว) ก็ไม่นับซ้ำ
 *  - ฮีโร่ (คนดู) เก็บข้ามไลฟ์ใน data/adventure.json: เลเวล XP ทอง ของแต่งตัว สถิติ ดาเมจรายสัปดาห์
 *  - รอบไลฟ์: 3 ขั้นฉาก × 5 ด่าน (ด่าน 5 = บอสประจำขั้น) • ด่าน 3 มีทางแยกให้โหวต • ผ่านครบ 3 ขั้น = รอบใหม่ (ยากขึ้น)
 *  - บอสชาร์จท่าไม้ตาย → ทั้งห้องพิมพ์ “กัน” ให้ครบ → บอสมึน (ดาเมจ ×2) / กันไม่ทัน = ปาร์ตี้เจ็บหนัก
 *  - สไลม์ทองคำโผล่สุ่ม 20 วินาที • ช่วง XP ×2 ทุก 30 นาที • ภารกิจของไลฟ์ • หอเกียรติยศ
 *  - ร้านค้า: ใช้ทองซื้อของแต่งตัว (ของจากของขวัญไม่มีการสุ่ม — ได้ผลทันทีเท่านั้น)
 *  - แพ้ = ถอยไปตั้งหลักแล้วสู้ใหม่ ไม่มีใครเสียอะไร
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { STAGES, MOB_NAMES, classOf, TIER_NAMES, tierOf, ITEMS, QUESTS } = require('./advtheme');

const norm = (s) => String(s || '').toLowerCase().replace(/[\s"'“”‘’!?.。,]+/g, '');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const R = (a, b) => a + Math.random() * (b - a);

const WAVES = 5;
const CD = { atk: 2500, magic: 6000, heal: 6000 };
const POWER_MAX = 300; // ไลก์ต่อท่าไม้ตาย
const VOTE_WORDS = { left: ['ซ้าย', 'left'], right: ['ขวา', 'right'] };
const needXp = (lv) => 30 + lv * 20;
const BOOST_EVERY = 30 * 60_000; // ช่วง XP ×2 ทุก 30 นาที
const BOOST_LEN = 5 * 60_000;
const GOLD_CHANCE = 0.12; // โอกาสสไลม์ทองคำโผล่หลังเดินจบแต่ละช่วง
const weekId = () => Math.floor((Date.now() + 7 * 3600_000 - 4 * 86400_000) / (7 * 86400_000)); // สัปดาห์เริ่มวันจันทร์ (เวลาไทย)
const titleOf = (id, lv) => TIER_NAMES[classOf(id)][tierOf(lv)];

module.exports = function createAdventure(ctx) {
  // ctx: { io, log, dataDir, theme(), addPoints(u, n), topId(), crowd(), audienceIds() }
  const { io, log } = ctx;
  const FILE = path.join(ctx.dataDir, 'adventure.json');
  let heroes = {};
  // ความอึดศัตรู (คูณเลือดมอนสเตอร์/บอส) — ปรับได้ที่หลังบ้าน “เกมในไลฟ์ → ตั้งค่าเกมนี้”
  const TOUGH = [1, 1.5, 2, 3];
  let tough = 2;
  try {
    const f = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    heroes = f.heroes || {};
    if (TOUGH.includes(f.tough)) tough = f.tough;
  } catch {}
  let dirty = false;
  const save = () => {
    if (!dirty) return;
    dirty = false;
    try {
      fs.mkdirSync(ctx.dataDir, { recursive: true });
      // คนดูทดสอบ (test:...) ไม่บันทึกลงไฟล์
      const keep = Object.fromEntries(Object.entries(heroes).filter(([id]) => !id.startsWith('test:')));
      fs.writeFileSync(FILE, JSON.stringify({ v: 1, tough, heroes: keep }));
    } catch (e) {
      log('error', 'บันทึกเลเวลนักผจญภัยไม่สำเร็จ: ' + e.message);
    }
  };
  setInterval(save, 10_000);

  const on = () => !!ctx.theme()?.adv;
  const cmdsOf = () => ctx.theme()?.hud?.cmds || [];
  const say = (u, text) => io.emit('say', { id: u.id, text });
  function ev(d) {
    io.emit('themeEvent', { type: 'adv', ...d });
  }

  // ---------------------------------------------------------------- ฮีโร่
  function hero(u) {
    const h = (heroes[u.id] ||= { n: u.name, lv: 1, xp: 0, gold: 0, k: 0, b: 0 });
    if (u.name) h.n = u.name;
    return h;
  }
  const boostOn = () => S && Date.now() < S.boostUntil;
  function addXp(u, n) {
    if (!u?.id || n <= 0) return;
    const h = hero(u);
    h.xp += Math.round(n * (boostOn() ? 2 : 1));
    const t0 = tierOf(h.lv);
    let up = false;
    while (h.xp >= needXp(h.lv) && h.lv < 99) {
      h.xp -= needXp(h.lv);
      h.lv += 1;
      up = true;
    }
    dirty = true;
    if (up) {
      const t1 = tierOf(h.lv);
      const evolve = t1 > t0 ? titleOf(u.id, h.lv) : null;
      ev({ ev: 'lvup', id: u.id, name: h.n, lv: h.lv, evolve, eq: eqStr(h) });
      if (evolve) log('game', `🌟 ${h.n} วิวัฒน์เป็น${evolve} (Lv.${h.lv})`);
    }
  }
  function addGold(id, n) {
    const h = heroes[id];
    if (!h || n <= 0) return;
    h.gold += Math.round(n * (boostOn() ? 2 : 1));
    dirty = true;
  }
  const eqStr = (h) => [h.eq?.back || '', h.eq?.head || '', h.eq?.pet || '', h.eq?.aura || ''].join(',');
  function give(id, key) {
    const h = heroes[id];
    const it = ITEMS[key];
    if (!h || !it) return false;
    h.own ||= [];
    const isNew = !h.own.includes(key);
    if (isNew) h.own.push(key);
    h.eq ||= {};
    if (isNew || !h.eq[it.slot]) h.eq[it.slot] = key;
    dirty = true;
    return true;
  }

  // ---------------------------------------------------------------- สถานะรอบไลฟ์
  let S = null;
  function reset() {
    const t = Date.now();
    S = {
      stage: 0, round: 1, wave: 1, phase: 'walk', until: t + 5000,
      enemy: null, hp: 100, power: 0, vote: null, voted: false, skip: false, afterBonus: false,
      allies: [], fighters: new Set(), active: new Map(), joined: new Set(), welcomed: new Set(), dmg: {}, last: new Map(), pts: new Map(),
      nextHit: 0, hits: [], charge: null, nextCharge: 0, stun: 0, lastHit: null,
      boostAt: t + 15 * 60_000, boostUntil: 0, titles: {}, qi: 0, qn: 0, bosses: 0, kills: 0, guards: 0, walks: 0,
    };
    push(true);
  }
  const diff = () => (1 + 0.6 * S.stage) * (1 + 0.5 * (S.round - 1));
  const activeN = () => {
    const t = Date.now() - 180_000;
    let n = 0;
    for (const [id, at] of S.active) if (at >= t) n++;
    else S.active.delete(id);
    return n;
  };
  const crowd = () => clamp(ctx.crowd?.() || 0, 0, 40);

  function spawn() {
    const st = STAGES[S.stage];
    const N = activeN();
    const t = Date.now();
    if (S.wave >= WAVES) {
      const max = Math.round((300 + 120 * N) * diff() * tough);
      S.enemy = { kind: st.boss.key, name: st.boss.name, hp: max, max, boss: true, n: 1 };
      S.nextHit = t + 5000;
      S.nextCharge = t + 25_000;
      ev({ ev: 'boss', name: st.boss.name, kind: st.boss.key });
      log('game', `👹 บอสปรากฏ: ${st.boss.name} (ขั้น ${S.stage + 1})`);
    } else {
      const kind = st.mobs[(S.wave - 1 + S.round) % st.mobs.length];
      const max = Math.round((40 + 25 * N) * diff() * tough);
      S.enemy = { kind, name: MOB_NAMES[kind] || kind, hp: max, max, boss: false, n: 3 };
      S.nextHit = t + 4000;
    }
    S.fighters = new Set();
    S.phase = 'fight';
    S.until = 0;
    S.charge = null;
    S.stun = 0;
    push(true);
  }
  // สไลม์ทองคำ (ด่านโบนัส ไม่นับเป็นด่าน) — ล้มไม่ทันใน 20 วินาที = หนีไป
  function spawnGolden() {
    const max = Math.round((60 + 20 * activeN()) * diff());
    S.enemy = { kind: 'gslime', name: MOB_NAMES.gslime, hp: max, max, boss: false, n: 1, bonus: true };
    S.fighters = new Set();
    S.phase = 'fight';
    S.until = Date.now() + 20_000;
    S.nextHit = Infinity;
    ev({ ev: 'golden' });
    push(true);
  }

  function damage(u, dmg, kind, crit) {
    if (S.phase !== 'fight' || !S.enemy) return 0;
    const stun = Date.now() < S.stun ? 2 : 1;
    const d = Math.max(1, Math.round(Math.min(dmg * stun, S.enemy.hp)));
    S.enemy.hp -= d;
    if (u?.id) {
      S.fighters.add(u.id);
      const b = (S.dmg[u.id] ||= { n: u.name, d: 0 });
      b.n = u.name;
      b.d += d;
      const h = hero(u);
      h.d = (h.d || 0) + d;
      const wk = weekId();
      if (h.wk !== wk) (h.wk = wk), (h.wd = 0);
      h.wd += d;
    }
    S.lastHit = u?.id ? { id: u.id, name: u.name } : S.lastHit;
    if (u?.id || kind !== 'auto') S.hits.push({ id: u?.id || null, k: kind, d, c: crit || stun > 1 ? 1 : 0 });
    if (S.enemy.hp <= 0) win();
    else push();
    return d;
  }

  function quest(kind, n = 1) {
    const q = QUESTS[S.qi % QUESTS.length];
    if (q.kind !== kind) return;
    S.qn += n;
    if (S.qn < q.need) return;
    // ครบ: ให้รางวัลทุกคนที่ร่วมไลฟ์นี้
    let got = 0;
    for (const id of S.joined) {
      if (!heroes[id]) continue;
      if (q.reward.item) give(id, q.reward.item);
      if (q.reward.gold) heroes[id].gold += q.reward.gold;
      got++;
    }
    dirty = true;
    ev({ ev: 'quest', text: q.text, rtext: q.rtext, n: got, item: q.reward.item || null });
    log('game', `📜 ภารกิจไลฟ์สำเร็จ: ${q.text} → ${q.rtext} (${got} คน)`);
    S.qi += 1;
    S.qn = 0;
    if (q.reward.item) io.emit('themeEvent', snapshot(true));
  }

  function win() {
    const e = S.enemy;
    const mult = diff();
    const gold = Math.round((e.boss ? 30 : e.bonus ? 25 : 3) * mult);
    const xp = Math.round((e.boss ? 60 : e.bonus ? 30 : 10) * mult);
    for (const id of S.fighters) {
      const h = heroes[id];
      if (!h) continue;
      addGold(id, gold);
      if (e.boss) h.b += 1;
      else h.k += 1;
      addXp({ id, name: h.n }, xp);
    }
    flushHits();
    let killer = null;
    if (e.boss && S.lastHit) {
      killer = S.lastHit;
      S.titles[killer.id] = 'ผู้พิชิต' + e.name;
    }
    ev({ ev: e.boss ? 'bossDown' : e.bonus ? 'goldenDown' : 'kill', name: e.name, kind: e.kind, gold: Math.round(gold * (boostOn() ? 2 : 1)), xp: Math.round(xp * (boostOn() ? 2 : 1)), n: S.fighters.size, killer, title: killer ? S.titles[killer.id] : null });
    if (e.boss) {
      log('game', `🏆 ปาร์ตี้ล้ม ${e.name} สำเร็จ! (คนช่วยตี ${S.fighters.size} คน${killer ? ` • ปิดบอส: ${killer.name}` : ''})`);
      S.bosses += 1;
      quest('boss');
    } else if (!e.bonus) {
      S.kills += 1;
      quest('kill');
    }
    S.afterBonus = !!e.bonus;
    S.enemy = null;
    S.allies = [];
    S.charge = null;
    S.phase = e.boss ? 'clear' : 'loot';
    S.until = Date.now() + (e.boss ? 7000 : 2500);
    push(true);
  }

  function nextWave() {
    if (S.afterBonus) {
      S.afterBonus = false;
      S.phase = 'walk';
      S.until = Date.now() + 3000;
      return push(true);
    }
    S.wave += S.skip && S.wave === 3 ? 2 : 1;
    S.skip = false;
    if (S.wave > WAVES) {
      S.wave = 1;
      S.voted = false;
      S.stage += 1;
      if (S.stage >= STAGES.length) {
        S.stage = 0;
        S.round += 1;
        ev({ ev: 'round', round: S.round });
      }
      ev({ ev: 'stage', stage: S.stage, name: STAGES[S.stage].name });
    }
    S.phase = 'walk';
    S.walks += 1;
    S.until = Date.now() + 5000;
    push(true);
  }

  function startBoost(len = BOOST_LEN) {
    const t = Date.now();
    S.boostUntil = t + len;
    S.boostAt = t + BOOST_EVERY;
    ev({ ev: 'boost', min: Math.round(len / 60_000) });
    log('game', `⏰ เริ่มช่วง XP ×2 + ทอง ×2 (${Math.round(len / 60_000)} นาที)`);
    push(true);
  }

  // ---------------------------------------------------------------- ทุก 0.25 วินาที
  let lastTick = Date.now();
  setInterval(() => {
    const t = Date.now();
    const dt = Math.min(1, (t - lastTick) / 1000);
    lastTick = t;
    if (!on() || !S) return;
    if (!boostOn() && t >= S.boostAt) startBoost();
    if (S.phase === 'walk' && t >= S.until) {
      if (S.wave === 3 && !S.voted) {
        S.voted = true;
        S.vote = { l: 0, r: 0, who: new Set(), until: t + 15000 };
        S.phase = 'vote';
        S.until = S.vote.until;
        ev({ ev: 'vote' });
        push(true);
      } else if (S.wave < WAVES && !S.afterGold && Math.random() < GOLD_CHANCE) {
        S.afterGold = true;
        spawnGolden();
      } else {
        S.afterGold = false;
        spawn();
      }
    } else if (S.phase === 'vote' && t >= S.until) {
      const left = S.vote.l >= S.vote.r;
      if (left) {
        // ทางลับ: ขบวนเลี้ยวซ้ายเข้าถ้ำลับ เปิดหีบสมบัติ ทุกคนได้ทอง + ฟื้นพลังเต็ม แล้วกลับมาเดินทางต่อ (หน้าเวทีเล่นภาพ ~7.5 วิ)
        S.hp = 100;
        for (const id of S.active.keys()) addGold(id, 8 * diff());
      } else S.wave = WAVES; // ทางลัด: วิ่งตรงไปเจอบอสเลย (ข้ามด่าน 3-4)
      ev({ ev: 'voted', side: left ? 'left' : 'right', l: S.vote.l, r: S.vote.r });
      S.vote = null;
      S.phase = 'walk';
      S.afterGold = true;
      S.until = t + (left ? 7800 : 3600);
      push(true);
    } else if ((S.phase === 'loot' || S.phase === 'clear') && t >= S.until) nextWave();
    else if (S.phase === 'retreat' && t >= S.until) {
      S.hp = 100;
      if (S.enemy) S.enemy.hp = S.enemy.max;
      S.phase = 'fight';
      S.nextHit = t + 5000;
      S.nextCharge = t + 25_000;
      S.charge = null;
      ev({ ev: 'return' });
      push(true);
    } else if (S.phase === 'fight' && S.enemy) {
      const e = S.enemy;
      // สไลม์ทองคำหนีไป
      if (e.bonus && t >= S.until) {
        ev({ ev: 'escape' });
        S.enemy = null;
        S.afterBonus = true;
        S.phase = 'loot';
        S.until = t + 1500;
        push(true);
        return flushHits();
      }
      // ปาร์ตี้ตีเอง (ช้า ๆ ให้จอไม่นิ่งแม้ไม่มีใครพิมพ์) + สัตว์ช่วยรบ
      let auto = (4 + crowd() * 0.4) * Math.sqrt(diff()) * dt;
      S.allies = S.allies.filter((a) => a.until > t);
      for (const a of S.allies) auto += a.dps * dt;
      S.autoAcc = (S.autoAcc || 0) + auto;
      if (S.autoAcc >= 1) {
        const d = Math.floor(S.autoAcc);
        S.autoAcc -= d;
        damage(null, d, 'auto', false);
      }
      if (S.phase !== 'fight' || !S.enemy) return flushHits();
      S.hp = Math.min(100, S.hp + 0.5 * dt);
      // บอสชาร์จท่าไม้ตาย → ทั้งห้องพิมพ์ “กัน”
      if (e.boss && !S.charge && t >= S.nextCharge && t >= S.stun) {
        const need = clamp(Math.round(activeN() * 0.5), 3, 20);
        S.charge = { need, n: 0, who: new Set(), until: t + 15_000 };
        ev({ ev: 'charge', need, sec: 15, name: e.name });
        push(true);
      }
      if (S.charge && t >= S.charge.until) {
        const d = Math.round(45 * Math.sqrt(diff()));
        S.hp = Math.max(0, S.hp - d);
        S.charge = null;
        S.nextCharge = t + 40_000;
        S.nextHit = t + 6000;
        ev({ ev: 'guardFail', d, name: e.name });
        push(true);
      } else if (!S.charge && t >= S.nextHit && t >= S.stun) {
        const d = Math.round((e.boss ? R(8, 12) : R(2, 4)) * Math.sqrt(diff()));
        S.hp = Math.max(0, S.hp - d);
        S.nextHit = t + (e.boss ? 6000 : 5000);
        ev({ ev: 'enemyAtk', d, boss: e.boss });
        push(true);
      }
      if (S.hp <= 0) {
        S.phase = 'retreat';
        S.until = t + 10000;
        S.allies = [];
        S.charge = null;
        ev({ ev: 'retreat', name: e.name });
        log('game', `🏳️ ปาร์ตี้ถอยไปตั้งหลัก (สู้ ${e.name})`);
        push(true);
      }
    }
    flushHits();
  }, 250);

  // ---------------------------------------------------------------- ส่งสถานะไปหน้าเวที
  function flushHits() {
    if (!S.hits.length) return;
    ev({ ev: 'hits', list: S.hits.slice(-40) });
    S.hits = [];
  }
  // หอเกียรติยศ (คำนวณใหม่ทุก 30 วินาที)
  let fameAt = 0;
  let fameCache = null;
  function fame() {
    if (fameCache && Date.now() - fameAt < 30_000) return fameCache;
    const all = Object.entries(heroes).filter(([id]) => !id.startsWith('test:') || Object.keys(heroes).every((k) => k.startsWith('test:')));
    const lv = all.sort((a, b) => b[1].lv - a[1].lv || b[1].xp - a[1].xp).slice(0, 5).map(([id, h]) => ({ n: h.n, lv: h.lv, t: titleOf(id, h.lv) }));
    const wk = weekId();
    const wd = all.filter(([, h]) => h.wk === wk && h.wd > 0).sort((a, b) => b[1].wd - a[1].wd).slice(0, 3).map(([, h]) => ({ n: h.n, d: h.wd }));
    fameCache = { lv, wd };
    fameAt = Date.now();
    return fameCache;
  }
  function snapshot(full) {
    const st = STAGES[S.stage];
    const t = Date.now();
    const top = Object.entries(S.dmg).map(([id, v]) => ({ id, n: v.n, d: v.d })).sort((a, b) => b.d - a.d).slice(0, 3);
    const q = QUESTS[S.qi % QUESTS.length];
    const s = {
      type: 'advState', stage: S.stage, stageName: st.name, stageIcon: st.icon, round: S.round, wave: S.wave, waves: WAVES, phase: S.phase,
      left: S.until ? Math.max(0, Math.round((S.until - t) / 1000)) : 0,
      enemy: S.enemy ? { kind: S.enemy.kind, name: S.enemy.name, hp: S.enemy.hp, max: S.enemy.max, boss: S.enemy.boss, n: S.enemy.n, bonus: !!S.enemy.bonus } : null,
      hp: Math.round(S.hp), power: S.power, powerMax: POWER_MAX, vote: S.vote ? { l: S.vote.l, r: S.vote.r } : null,
      charge: S.charge ? { need: S.charge.need, n: S.charge.n, left: Math.max(0, Math.ceil((S.charge.until - t) / 1000)) } : null,
      stun: Math.max(0, Math.ceil((S.stun - t) / 1000)),
      boost: boostOn() ? { on: true, left: Math.ceil((S.boostUntil - t) / 1000) } : { on: false, left: Math.max(0, Math.ceil((S.boostAt - t) / 1000)) },
      quest: { text: q.text, n: S.qn, need: q.need, rtext: q.rtext, done: S.qi },
      allies: S.allies.length, lead: ctx.topId?.() || null, top,
    };
    if (S.phase === 'walk' && S.walks % 2 === 1) s.fame = fame();
    if (full) {
      const hs = {};
      for (const id of ctx.audienceIds?.() || []) {
        const h = heroes[id];
        if (h) hs[id] = [h.lv, eqStr(h), S.titles[id] || ''];
      }
      s.heroes = hs;
    }
    return s;
  }
  let pushT = null;
  function push(now) {
    if (!on()) return;
    if (now) {
      clearTimeout(pushT);
      pushT = null;
      io.emit('themeEvent', snapshot(false));
    } else if (!pushT)
      pushT = setTimeout(() => {
        pushT = null;
        if (on()) io.emit('themeEvent', snapshot(false));
      }, 300);
  }
  setInterval(() => on() && S && io.emit('themeEvent', snapshot(true)), 3000);

  // ---------------------------------------------------------------- เหตุการณ์จากไลฟ์
  function seen(u) {
    if (!on() || !u?.id || !S) return;
    S.active.set(u.id, Date.now());
    S.joined.add(u.id);
    // ฮีโร่ประจำกลับมา: ประกาศครั้งแรกของไลฟ์ (เลเวล 5 ขึ้นไป)
    if (!S.welcomed.has(u.id)) {
      S.welcomed.add(u.id);
      const h = heroes[u.id];
      if (h && h.lv >= 5) ev({ ev: 'heroJoin', id: u.id, name: u.name || h.n, lv: h.lv, title: titleOf(u.id, h.lv), eq: eqStr(h) });
    }
  }
  const findItem = (want) => Object.entries(ITEMS).find(([, it]) => [it.name, ...(it.alias || [])].some((x) => norm(x) === want));
  // คืน true = คำสั่งของเกมนี้ (ไม่ต้องส่งต่อให้ระบบคำสั่งทั่วไป)
  function onChat(u, text) {
    if (!on() || !u?.id || !S) return false;
    const n = norm(text);
    seen(u);
    if (S.phase === 'vote' && S.vote) {
      const side = VOTE_WORDS.left.includes(n) ? 'l' : VOTE_WORDS.right.includes(n) ? 'r' : null;
      if (side) {
        if (!S.vote.who.has(u.id)) {
          S.vote.who.add(u.id);
          S.vote[side] += 1;
          push();
        }
        return true;
      }
    }
    if (n === 'เลเวล' || n === 'level' || n === 'lv' || n === 'สถานะ') {
      const h = hero(u);
      say(u, `⚔️ ${titleOf(u.id, h.lv)} Lv.${h.lv} (${h.xp}/${needXp(h.lv)} XP) • 🪙 ${h.gold} • ล้มศัตรู ${h.k} • ล้มบอส ${h.b}`);
      return true;
    }
    // ร้านค้า
    if (n === 'ร้าน' || n === 'ร้านค้า' || n === 'shop') {
      const list = Object.values(ITEMS).filter((x) => !x.quest).map((x) => `${x.name} ${x.cost}`);
      say(u, `🛒 ${list.join(' • ')} (พิมพ์ “ซื้อ ปีก”) • มี 🪙${hero(u).gold}`);
      return true;
    }
    if (n === 'ถอด' || n === 'ถอดหมด') {
      const h = hero(u);
      h.eq = {};
      dirty = true;
      ev({ ev: 'equip', id: u.id, eq: eqStr(h) });
      return true;
    }
    if ((n.startsWith('ซื้อ') && n.length > 4) || (n.startsWith('ใส่') && n.length > 3)) {
      const buy = n.startsWith('ซื้อ');
      const found = findItem(n.slice(buy ? 4 : 3));
      if (!found) return false;
      const [key, it] = found;
      const h = hero(u);
      h.own ||= [];
      if (h.own.includes(key)) {
        h.eq ||= {};
        h.eq[it.slot] = key;
        dirty = true;
        ev({ ev: 'equip', id: u.id, name: u.name, eq: eqStr(h), item: it.name, worn: true });
        return true;
      }
      if (it.quest) {
        say(u, `${it.name} ได้จากภารกิจไลฟ์เท่านั้น`);
        return true;
      }
      if (!buy) {
        say(u, `ยังไม่มี${it.name} (พิมพ์ “ซื้อ ${it.name}” ${it.cost} ทอง)`);
        return true;
      }
      if (h.gold < it.cost) {
        say(u, `ทองไม่พอ (มี 🪙${h.gold} ต้องใช้ ${it.cost}) • ช่วยตีศัตรูเพื่อเก็บทอง`);
        return true;
      }
      h.gold -= it.cost;
      give(u.id, key);
      h.eq[it.slot] = key;
      ev({ ev: 'equip', id: u.id, name: u.name, eq: eqStr(h), item: it.name });
      log('game', `🛒 ${u.name} ซื้อ${it.name} (${it.cost} ทอง)`);
      return true;
    }
    const cmd = cmdsOf().find((x) => norm(x.c) === n || (x.alias || []).some((a) => norm(a) === n));
    if (!cmd) return false;
    const zone = cmd.zone;
    // “กัน” ตอนบอสชาร์จ
    if (zone === 'guard') {
      const c = S.charge;
      if (c && !c.who.has(u.id)) {
        c.who.add(u.id);
        c.n += 1;
        addXp(u, 5);
        S.hits.push({ id: u.id, k: 'guard', d: 0, c: 0 });
        if (c.n >= c.need) {
          const t = Date.now();
          S.charge = null;
          S.stun = t + 8000;
          S.nextCharge = t + 45_000;
          S.nextHit = t + 9000;
          S.guards += 1;
          ev({ ev: 'guardOk', n: c.n, name: S.enemy?.name || '' });
          quest('guard');
          push(true);
        } else push();
      }
      return true;
    }
    if (!CD[zone]) return false;
    const t = Date.now();
    const key = u.id + '|' + zone;
    if (t - (S.last.get(key) || 0) < CD[zone]) return true;
    S.last.set(key, t);
    if (t - (S.pts.get(u.id) || 0) > 20_000) {
      S.pts.set(u.id, t);
      ctx.addPoints?.(u, 1);
    }
    const h = hero(u);
    const cls = classOf(u.id);
    const tier = tierOf(h.lv);
    if (zone === 'heal') {
      const amt = Math.round((6 + h.lv) * (cls === 'cleric' ? 1.8 : 1));
      S.hp = Math.min(100, S.hp + amt);
      S.hits.push({ id: u.id, k: 'heal', d: amt, c: 0 });
      addXp(u, 4);
      push();
      return true;
    }
    if (S.phase !== 'fight') {
      S.hits.push({ id: u.id, k: zone === 'magic' ? 'magic' : 'atk', d: 0, c: 0 });
      return true;
    }
    const crit = Math.random() < 0.12 + tier * 0.03;
    // อาชีพมีผล: นักเวทเก่งเวท • นักดาบ/นักธนูตีแรง • นักบวชฮีลแรง • ร่างวิวัฒน์ +10% ต่อขั้น
    const base = zone === 'magic' ? (9 + h.lv * 2) * ({ mage: 1.8, cleric: 1.1 }[cls] || 0.9) : (6 + h.lv * 1.5) * ({ sword: 1.4, archer: 1.3 }[cls] || 0.8);
    damage(u, base * (1 + tier * 0.1) * R(0.85, 1.15) * (crit ? 2 : 1), zone === 'magic' ? 'magic' : 'atk', crit);
    addXp(u, zone === 'magic' ? 4 : 3);
    return true;
  }
  function onLike(u, count) {
    if (!on() || !S) return;
    seen(u);
    S.power += count;
    if (S.power >= POWER_MAX) {
      S.power = 0;
      if (S.phase === 'fight' && S.enemy) {
        ev({ ev: 'ult' });
        damage(null, S.enemy.boss ? S.enemy.max * 0.25 : S.enemy.max, 'ult', true);
      } else S.hp = 100;
    }
    push();
  }
  function onGift(u, total, g) {
    if (!on() || !S || !u?.id) return;
    seen(u);
    const tier = Number(String(ctx.theme()?.effects?.[g?.effect]?.kind || '').slice(3)) || (total >= 169 ? 3 : total >= 20 ? 2 : 1);
    addXp(u, Math.min(3000, total * 3));
    if (tier === 3) dragon(u, total);
    else if (tier === 2) {
      S.allies.push({ until: Date.now() + 15000, dps: (8 + total * 0.15) * Math.sqrt(diff()) });
      if (S.phase === 'fight' && S.enemy) damage(u, total * 4 + 15, 'wolf', false);
    } else {
      S.hp = Math.min(100, S.hp + 5 * (g?.count || 1));
      if (S.phase === 'fight' && S.enemy) setTimeout(() => S.enemy && damage(u, total * 12 + 10, 'fire', false), 900);
    }
    push();
  }
  function dragon(u, total) {
    S.hp = 100;
    for (const id of S.active.keys()) addGold(id, 10 * diff());
    if (S.phase === 'fight' && S.enemy) setTimeout(() => S.enemy && damage(u, Math.max((total || 0) * 3, S.enemy.max * 0.45), 'dragon', true), 1800);
  }
  // เป้าหมายรวม (แถบเพชร/ใจของหน้าเวที) ครบ
  function onGoal(g) {
    if (!on() || !S) return;
    if (g?.effect === 'g9') dragon(null, 0);
    else if (S.phase === 'fight' && S.enemy) {
      ev({ ev: 'ult' });
      damage(null, S.enemy.boss ? S.enemy.max * 0.25 : S.enemy.max, 'ult', true);
    }
  }

  function register(socket) {
    const ok = (ack) => typeof ack === 'function' && ack({ ok: true });
    socket.on('adv:get', (_, ack) => typeof ack === 'function' && ack(S ? snapshot(true) : null));
    // ทดสอบ/แอดมิน: กระโดดไปขั้น/ด่านที่ต้องการ
    socket.on('adv:set', (d, ack) => {
      if (!S) return;
      S.stage = clamp(d?.stage | 0, 0, STAGES.length - 1);
      S.wave = clamp(d?.wave | 0 || 1, 1, WAVES);
      S.voted = S.wave > 3;
      S.enemy = null;
      S.charge = null;
      S.phase = 'walk';
      S.until = Date.now() + 1500;
      S.afterGold = true;
      ev({ ev: 'stage', stage: S.stage, name: STAGES[S.stage].name });
      push(true);
      ok(ack);
    });
    // ปุ่มหลังบ้าน
    socket.on('adv:boss', (_, ack) => {
      if (!S || S.enemy?.boss) return ok(ack);
      S.wave = WAVES;
      S.voted = true;
      S.enemy = null;
      S.charge = null;
      S.phase = 'walk';
      S.until = Date.now() + 1500;
      S.afterGold = true;
      push(true);
      ok(ack);
    });
    // เรียกทางแยกทันที (ไม่ตัดกลางศึกบอส)
    socket.on('adv:vote', (_, ack) => {
      if (!S) return ok(ack);
      if (S.enemy?.boss) return typeof ack === 'function' && ack({ ok: false, error: 'กำลังสู้บอสอยู่ — รอให้จบศึกก่อนแล้วกดใหม่' });
      if (S.phase === 'vote') return ok(ack);
      S.wave = 3;
      S.voted = false;
      S.enemy = null;
      S.charge = null;
      S.allies = [];
      S.phase = 'walk';
      S.afterGold = true;
      S.until = Date.now() + 1200;
      push(true);
      ok(ack);
    });
    socket.on('adv:golden', (_, ack) => {
      if (!S) return ok(ack);
      if (S.phase === 'walk' || S.phase === 'loot') spawnGolden();
      else if (S.phase === 'fight' && !S.enemy?.boss && !S.enemy?.bonus) spawnGolden();
      ok(ack);
    });
    socket.on('adv:chest', (_, ack) => {
      if (!S) return ok(ack);
      S.hp = 100;
      for (const id of S.active.keys()) addGold(id, 15 * diff());
      ev({ ev: 'chest' });
      push(true);
      ok(ack);
    });
    socket.on('adv:boost', (d, ack) => {
      if (!S) return ok(ack);
      if (d?.stop) {
        S.boostUntil = 0;
        S.boostAt = Date.now() + BOOST_EVERY;
        push(true);
      } else startBoost();
      ok(ack);
    });
    socket.on('adv:fame', (_, ack) => typeof ack === 'function' && ack({ ...((fameAt = 0), fame()), heroes: Object.keys(heroes).filter((id) => !id.startsWith('test:')).length }));
    // ความอึดศัตรู: ไม่ส่งค่า = แค่ถาม • เปลี่ยนแล้วมีผลกับตัวที่กำลังสู้อยู่ทันที (สไลม์ทองคำมีเวลาจำกัด ไม่คูณ)
    socket.on('adv:tough', (d, ack) => {
      const v = Number(d?.tough);
      if (TOUGH.includes(v) && v !== tough) {
        const e = S?.enemy;
        if (e && !e.bonus) {
          const r = v / tough;
          e.max = Math.max(1, Math.round(e.max * r));
          e.hp = Math.max(1, Math.min(e.max, Math.round(e.hp * r)));
          push(true);
        }
        tough = v;
        dirty = true;
        save();
        log('game', `⚔️ ความอึดศัตรู ×${v}`);
      }
      if (typeof ack === 'function') ack({ ok: true, tough, choices: TOUGH });
    });
    socket.on('adv:resetHeroes', (_, ack) => {
      heroes = {};
      dirty = true;
      save();
      fameAt = 0;
      log('game', '⚔️ ล้างเลเวลนักผจญภัยทั้งหมดแล้ว');
      ok(ack);
    });
  }

  reset();
  return {
    onChat, onLike, onGift, onGoal, register, reset, seen,
    levelOf: (id) => heroes[id]?.lv || 0,
    flush: () => {
      dirty = true;
      save();
    },
  };
};
