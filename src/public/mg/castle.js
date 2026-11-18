/* มินิเกม: ป้องกันปราสาท (ภาพ) — มุมสูง 3 เลนคดเคี้ยวจากประตูมิติด้านบนลงมาหาปราสาทหิน
 * มือธนู (คนดู) ยืนบนกำแพงตามเลนที่เลือก ยิงลูกศรใส่ตัวหน้าสุดของเลน • บอสทุก 10 ระลอก
 */
(() => {
  const K = window.PixelKit;
  const { P, O, W, H, hsh, rnd, esc } = K;
  const LX = [32, 90, 148];
  const TOP = 68; // ปากประตูมิติ
  const WALL = 222; // แนวกำแพง
  const yOf = (p) => TOP + (p / 100) * (WALL - TOP - 4);
  const laneX = (l, y) => LX[l] + Math.round(Math.sin(y / 22 + l * 2) * 3);
  const GRIDS = {
    slime: [['....oooo....', '..oo2222oo..', '.o22211222o.', '.o22222222o.', 'o2222222222o', 'o22e2222e22o', 'o2222ee2222o', 'o3333333333o', '.oooooooooo.'], { 2: '#5fd068', 1: '#c8f7c0', 3: '#2f9e44', e: O }],
    bat: [['oo.........oo', 'o2o..o.o..o2o', 'o22ooo2ooo22o', 'o222o2e2e222o', '.o2222222222o', '..o2o.o2o.o2o', '...o...o...o.'], { 2: '#7a4ab8', e: '#ffd166' }],
    skeleton: [['...oooooo...', '..owwwwwwo..', '.owwwwwwwwo.', '.owoowwoowo.', '.owoowwoowo.', '..owwwwwwo..', '...owowowo..', '....oooo....', '..oowwwwoo..', '.ow.owwo.wo.', '.ow.owwo.wo.', '....owwo....', '...ow..wo...', '...ow..wo...', '..ooo..ooo..'], { w: '#e8e4d8' }],
    wisp: [['....oo....', '...o33o...', '..o3223o..', '.o322223o.', '.o221122o.', 'o22e11e22o', 'o22111122o', 'o22111122o', '.o222222o.', '..o2222o..', '.o2o22o2o.', '..o.oo.o..'], { 2: '#5fe0ff', 1: '#e0fbff', 3: '#b28cff', e: O }],
    shroom: [['...oooooo...', '.oo4444444o.', 'o44w444w444o', 'o4www444w44o', 'o4444444444o', '.oooooooooo.', '..o5555555o.', '..o5e555e5o.', '..o5555555o.', '..o55o.o55o.', '..ooo...ooo.'], { 4: '#e8453c', w: '#fff3e0', 5: '#f6e2c0', e: O }],
  };
  const spr = {};
  let field = null;
  let castle = null;
  let boss = null;
  let dragonCv = null;
  function makeDragon() {
    const p = P(56, 36);
    const b1 = '#e0a81e';
    const b2 = '#b07a12';
    p.poly([[14, 17], [24, 0], [35, 3], [30, 17]], O);
    p.poly([[16, 16], [24, 2], [33, 4], [28, 16]], '#9a1f2a');
    p.poly([[0, 23], [8, 20], [17, 19], [15, 22], [6, 25]], b2);
    p.poly([[0, 21], [3, 23], [0, 26]], '#e8453c');
    p.oell(26, 22, 13, 6, b1);
    p.ell(27, 24, 9, 3, '#ffe066');
    p.poly([[35, 20], [41, 11], [45, 13], [39, 22]], b1);
    p.orect(40, 7, 11, 8, b1);
    p.orect(48, 10, 7, 5, b1);
    p.px(46, 9, O);
    p.px(47, 9, '#ffffff');
    p.poly([[41, 7], [40, 2], [44, 7]], '#fff3c4');
    p.poly([[45, 7], [45, 1], [48, 7]], '#fff3c4');
    p.poly([[19, 20], [27, 3], [39, 2], [33, 20]], O);
    p.poly([[21, 19], [28, 5], [37, 4], [32, 19]], '#e8453c');
    for (let i = 0; i < 3; i++) p.line(29 + i * 3, 5 - i, 24 + i * 3, 18, '#9a1f2a');
    p.rect(20, 27, 2, 3, b2);
    p.rect(31, 27, 2, 3, b2);
    return p.cv;
  }
  const st = { foes: new Map(), arrows: [], wall: [0, 0, 0], dragon: 0, rain: 0, hit: 0, laneOf: new Map(), shoot: new Map() };

  function mob(kind) {
    if (spr[kind]) return spr[kind];
    const [g, pal] = GRIDS[kind];
    const p = P(g[0].length, g.length);
    p.grid(g, 0, 0, pal);
    spr[kind] = { cv: p.cv, white: K.tint(p.cv, '#ffffff') };
    return spr[kind];
  }
  function makeBoss() {
    // ราชาเห็ดย่อส่วน (32x30)
    const p = P(34, 32);
    p.oell(17, 22, 9, 8, '#f6e2c0');
    p.rect(12, 19, 3, 3, O);
    p.rect(19, 19, 3, 3, O);
    p.line(11, 17, 15, 18, O);
    p.line(23, 17, 19, 18, O);
    p.rect(14, 25, 6, 2, '#8a2a2a');
    const cap = (rx, ry, col) => {
      const pts = [];
      for (let k = 0; k <= 20; k++) {
        const a = Math.PI + (k / 20) * Math.PI;
        pts.push([17 + Math.cos(a) * rx, 16 + Math.sin(a) * ry]);
      }
      p.poly(pts, col);
    };
    cap(17, 13, O);
    cap(16, 12, '#e8453c');
    p.rect(1, 15, 32, 2, O);
    for (const [a, b, r] of [[9, 10, 2], [17, 6, 3], [25, 10, 2]]) p.oell(a, b, r, r - 1, '#fff3e0');
    for (const x of [13, 15, 17, 19, 21]) p.rect(x, 1, 1, 3, '#ffd166');
    p.rect(12, 3, 11, 1, '#e0a81e');
    return { cv: p.cv, white: K.tint(p.cv, '#ffffff') };
  }

  function makeField() {
    const R = rnd(9);
    const p = P(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) p.px(x, y, ((x * 11 + y * 7) % 17 === 0) ? '#4f9840' : ((x + y * 5) % 23 === 0 ? '#78c060' : '#5fae48'));
    // ป่ามืดด้านบน + ประตูมิติ 3 บาน
    for (let x = -4; x < W + 6; x += 7) {
      p.oell(x, 52 + (x % 3), 6, 6, '#1f4a2a');
      p.ell(x - 1, 50 + (x % 3), 4, 4, '#2f6a3a');
    }
    p.rect(0, 0, W, 48, '#173226');
    for (const l of [0, 1, 2]) {
      const x = LX[l];
      p.oell(x, TOP - 6, 11, 9, '#2a1d4a');
      p.ell(x, TOP - 6, 9, 7, '#4a2a7a');
      p.ell(x, TOP - 6, 6, 5, '#7a3fd1');
      p.ell(x, TOP - 6, 3, 3, '#b28cff');
      for (const s of [-1, 1]) p.orect(x + s * 12 - 2, TOP - 16, 4, 16, '#5a5a6a');
    }
    // ทางเดิน 3 เลน (ร่องล้อ)
    for (const l of [0, 1, 2]) {
      for (let y = TOP - 2; y < WALL; y++) {
        const x = laneX(l, y);
        for (let dx = -10; dx <= 10; dx++) {
          const edge = Math.abs(dx) >= 9;
          p.px(x + dx, y, edge ? '#8a7048' : (dx === -5 || dx === 5) && y % 3 ? '#a08858' : ((x + dx + y) % 7 === 0 ? '#c8a878' : '#b89868'));
        }
      }
    }
    // ต้นไม้ หิน ดอกไม้ ระหว่างเลน
    const free = (x) => LX.every((lx) => Math.abs(x - lx) > 14);
    for (let i = 0; i < 160; i++) {
      const x = Math.floor(R() * W);
      const y = 70 + Math.floor(R() * 150);
      if (!free(x)) continue;
      const k = R();
      if (k < 0.15) {
        p.rect(x, y, 2, 5, '#7a4a2a');
        p.oell(x + 1, y - 3, 5, 4, '#2f7a3a');
        p.ell(x, y - 4, 3, 2, '#4fa848');
      } else if (k < 0.25) {
        p.oell(x, y, 3, 2, '#7a7f89');
        p.px(x - 1, y - 1, '#9aa0b3');
      } else p.px(x, y, ['#ff8fab', '#ffd166', '#ffffff', '#b28cff'][i % 4]);
    }
    // คูน้ำหน้ากำแพง
    p.rect(0, WALL - 4, W, 4, '#3a8ad0');
    for (let x = 0; x < W; x += 4) p.px(x, WALL - 3, '#7ac0f0');
    return p.cv;
  }
  function makeCastle() {
    const p = P(W, 60);
    // กำแพงหิน + เชิงเทิน
    p.orect(0, 8, W, 50, '#8a8fa0');
    for (let y = 10; y < 58; y += 6) for (let x = ((y / 6) % 2) * 6; x < W; x += 12) p.rect(x, y, 11, 5, (x + y) % 3 ? '#9aa0b3' : '#7a7f90');
    for (let x = 0; x < W; x += 8) p.orect(x, 2, 6, 7, '#9aa0b3');
    p.rect(0, 9, W, 2, '#6b7080');
    // ป้อม 3 ป้อม (เหนือเลน) + ธง
    for (const l of [0, 1, 2]) {
      const x = LX[l] - 12;
      p.orect(x, 0, 24, 58, '#a8aec0');
      for (let k = 0; k < 4; k++) p.orect(x + k * 6, -4, 5, 6, '#a8aec0');
      p.rect(x + 9, 30, 6, 10, '#2a2238');
      p.rect(x + 10, 30, 4, 1, '#5a5a6a');
    }
    // ประตูกลาง
    p.orect(80, 36, 20, 22, '#5a3a22');
    for (let x = 82; x < 98; x += 4) p.rect(x, 37, 1, 21, '#3a2410');
    p.ell(90, 36, 10, 4, '#5a3a22');
    return p.cv;
  }

  const G = {
    toastTop: 1000,
    // วิธีเล่นเป็นแถบป้ายเล็ก ๆ ใต้ชื่อเกม (ไม่มีบรรทัดเกร็ด — ด้านบนเป็นทางมอนสเตอร์เข้า ให้บังน้อยที่สุด)
    hintsTop: 188,
    fxWorld: true,
    hints: [
      ['🧭', 'ซ้าย/กลาง/ขวา', 'เลือกเลน'],
      ['🏹', 'ยิง', 'ยิงตัวหน้าสุด'],
      ['🗳️', 'ไฟ/น้ำแข็ง/ธนู', 'โหวตป้อม'],
      ['❤️', 'ไลก์', 'ฝนธนู'],
      ['🐉', 'ของขวัญ', 'มังกร'],
    ],
    init() {
      field = makeField();
      castle = makeCastle();
      boss = makeBoss();
      dragonCv = makeDragon();
    },
    apply(S) {
      const live = new Set();
      for (const [id, lane, kind, y, hp] of S.foes || []) {
        live.add(id);
        const f = st.foes.get(id) || { id, lane, kind, y, dy: y, hp, hit: 0 };
        f.ty = y;
        if (hp < f.hp) f.hit = 0.15;
        f.hp = hp;
        f.lane = lane;
        st.foes.set(id, f);
      }
      for (const [id, f] of st.foes) {
        if (!live.has(id) && !f.dead) {
          f.dead = 0.4;
        }
      }
      if (S.laneOf) for (const [id, l] of Object.entries(S.laneOf)) st.laneOf.set(id, l);
      st.wall = S.walls || [0, 0, 0];
    },
    onEv(d, ctx) {
      if (d.ev === 'lane') {
        st.laneOf.set(d.id, d.lane);
        if (d.moved) ctx.toast(`🧭 ${d.name} ย้ายไปเฝ้าเลน${['ซ้าย', 'กลาง', 'ขวา'][d.lane]}`);
      } else if (d.ev === 'shots') {
        let n = 0;
        for (const s of d.list) {
          if (n++ > 30) break;
          const from = archerPos(s.id, s.lane, ctx);
          const target = [...st.foes.values()].filter((f) => f.lane === s.lane && !f.dead).sort((a, b) => b.dy - a.dy)[0];
          const ty = target ? yOf(target.dy) : yOf(40);
          st.arrows.push({ x0: from.x, y0: from.y, x1: laneX(s.lane, ty), y1: ty, t: 0, crit: s.crit, miss: s.miss });
          if (s.id) {
            st.shoot.set(s.id, 0.3);
            if (s.crit) ctx.num(laneX(s.lane, ty), ty - 8, 'CRIT!', '#ff8a3d', 40);
          }
        }
      } else if (d.ev === 'wave') {
        ctx.toast(d.boss ? `👹 ระลอก ${d.n} — บอสบุก! ทุกคนไปเลนกลาง!` : `🌊 ระลอกที่ ${d.n} มาแล้ว!`, d.boss ? 'big' : '');
        if (d.boss) ctx.fx.shake = 1;
        ctx.sfx(d.boss ? 'boom' : 'whistle');
      } else if (d.ev === 'clear') {
        ctx.toast(`🛡️ ป้องกันระลอก ${d.n} สำเร็จ! ซ่อมกำแพง +120`, 'big');
        ctx.sfx('chime', 1047);
      } else if (d.ev === 'hitwall') {
        st.hit = 0.4;
        ctx.fx.shake = Math.max(ctx.fx.shake, d.boss ? 1.2 : 0.4);
        ctx.num(LX[d.lane], WALL + 4, `-${d.d}`, '#ff4a4a', d.boss ? 60 : 44);
        ctx.boom(LX[d.lane], WALL, 12, ['#9aa0b3', '#ffd166', '#e8453c']);
      } else if (d.ev === 'breach') {
        ctx.api.bigShow(null, 'ปราสาทแตก! ถอยไปตั้งหลัก');
      } else if (d.ev === 'bossDown') {
        ctx.api.bigShow(null, 'ล้มบอสสำเร็จ!');
        ctx.api.fireworks(5);
        if (d.by) setTimeout(() => ctx.toast(`🏆 ${d.by} ยิงปิดบอส!`, 'big'), 1500);
      } else if (d.ev === 'vote') {
        ctx.toast('🗳️ โหวตอัปเกรดป้อม! พิมพ์ “ไฟ” “น้ำแข็ง” หรือ “ธนู” (15 วิ)', 'big');
        ctx.sfx('chime', 880);
      } else if (d.ev === 'upgrade') {
        ctx.toast(`${d.kind === 'fire' ? '🔥' : d.kind === 'ice' ? '❄️' : '🏹'} อัปเกรดป้อม${d.name} เป็นระดับ ${d.lv}!`, 'big');
        for (const l of [0, 1, 2]) ctx.sparkles(LX[l], WALL + 10, 16, d.kind === 'fire' ? '#ff8a3d' : d.kind === 'ice' ? '#9ae8ff' : '#ffd166', 20);
        ctx.api.fireworks(2);
      } else if (d.ev === 'rain') {
        st.rain = 1.6;
        ctx.toast('🏹 ฝนธนู! (ไลก์ครบ)');
      } else if (d.ev === 'gift') {
        if (d.tier === 1) st.rain = 2;
        else if (d.tier === 3) st.dragon = 4;
      }
    },
    gift(tier, user, n, f, ctx) {
      ctx.toast(`${f.icon} ${user?.name || 'มีคน'} → ${f.label}`, tier === 3 ? 'big' : '');
      if (tier === 3) ctx.api.bigShow(user, 'มังกรเผาทั้งสนาม!');
    },
    frame(c, ts, dt, ctx) {
      const S = ctx.S;
      st.hit = Math.max(0, st.hit - dt);
      st.rain = Math.max(0, st.rain - dt);
      st.dragon = Math.max(0, st.dragon - dt);
      c.drawImage(field, 0, 0);
      // ประตูมิติหมุนวน
      for (const l of [0, 1, 2]) {
        for (let k = 0; k < 6; k++) {
          const a = ts * 3 + k + l;
          c.fillStyle = k % 2 ? '#e0c8ff' : '#b28cff';
          c.fillRect(Math.round(LX[l] + Math.cos(a) * 6), Math.round(TOP - 6 + Math.sin(a) * 4), 1, 1);
        }
      }
      // กำแพงไฟ
      for (let l = 0; l < 3; l++) {
        if (!(st.wall[l] > 0)) continue;
        const y = yOf(74);
        for (let k = 0; k < 24; k++) {
          c.fillStyle = ['#ffd166', '#ff8a3d', '#e8453c', '#fff3c4'][k % 4];
          c.fillRect(laneX(l, y) - 10 + Math.floor(Math.random() * 21), y - Math.floor(Math.random() * 8), 1, 2);
        }
        ctx.label('wall' + l, LX[l], y - 9, `🔥 ${st.wall[l]}`, 0.6);
      }
      // ศัตรู (ไล่ตำแหน่งให้นุ่มนวล)
      const list = [...st.foes.values()].sort((a, b) => a.dy - b.dy);
      for (const f of list) {
        if (f.dead !== undefined) {
          f.dead -= dt;
          if (f.dead <= 0) {
            st.foes.delete(f.id);
            continue;
          }
        } else f.dy += (f.ty - f.dy) * Math.min(1, dt * 4) + (f.ty > f.dy ? 0 : dt * 0.5);
        f.hit = Math.max(0, f.hit - dt);
        const y = yOf(f.dy);
        const x = laneX(f.lane, y);
        const s = f.kind === 'boss' ? boss : mob(f.kind);
        const w = s.cv.width;
        const h = s.cv.height;
        const bob = f.kind === 'bat' || f.kind === 'wisp' ? Math.sin(ts * 6 + f.id) * 2 : 0;
        if (f.dead !== undefined) c.globalAlpha = Math.max(0, f.dead / 0.4);
        c.drawImage(f.hit > 0 && Math.floor(ts * 20) % 2 ? s.white : s.cv, Math.round(x - w / 2), Math.round(y - h + bob));
        c.globalAlpha = 1;
        if ((S.up?.ice || 0) > 0 && f.dead === undefined && (f.id + Math.floor(ts * 4)) % 5 === 0) {
          c.fillStyle = '#cff4ff';
          c.fillRect(Math.round(x - w / 2 + ((f.id * 3) % w)), Math.round(y - h / 2), 1, 1);
        }
        if (f.kind === 'skeleton' && f.dead === undefined) {
          c.fillStyle = '#9aa6b8';
          c.fillRect(Math.round(x - w / 2) - 1, Math.round(y - h + 8), 3, 5);
        }
        if (f.dead === undefined) {
          // หลอดเลือดเล็ก
          c.fillStyle = O;
          c.fillRect(Math.round(x - w / 2), Math.round(y - h - 3), w, 2);
          c.fillStyle = f.hp > 50 ? '#5fd068' : f.hp > 25 ? '#ffd166' : '#e8453c';
          c.fillRect(Math.round(x - w / 2), Math.round(y - h - 3), Math.round((w * f.hp) / 100), 2);
        } else if (f.dead > 0.35) ctx.boom(x, y - h / 2, 6, ['#ffffff', '#c8c8d8']);
      }
      // ปราสาท + กะพริบแดงเมื่อโดน
      c.drawImage(castle, 0, WALL);
      if (st.hit > 0) {
        c.globalAlpha = st.hit;
        c.fillStyle = '#e8453c';
        c.fillRect(0, WALL, W, 60);
        c.globalAlpha = 1;
      }
      const up = S.up || { fire: 0, ice: 0, arrow: 0 };
      for (const l of [0, 1, 2]) {
        const x = LX[l];
        if (up.fire || up.ice || up.arrow) {
          const col = up.fire >= up.ice && up.fire >= up.arrow ? '255,138,61' : up.ice >= up.arrow ? '154,232,255' : '255,209,102';
          c.fillStyle = `rgba(${col},${0.12 + 0.06 * Math.sin(ts * 4 + l)})`;
          c.fillRect(x - 14, WALL - 2, 28, 26);
        }
        if (up.fire && Math.random() < 0.15 * up.fire) ctx.parts.push({ x: x + (Math.random() - 0.5) * 16, y: WALL - 2, vx: (Math.random() - 0.5) * 8, vy: -20 - Math.random() * 20, life: 0.6, c: '#ff8a3d', g: 0 });
        c.fillStyle = '#5a3420';
        c.fillRect(x, WALL - 14, 1, 12);
        c.fillStyle = ['#e8453c', '#ffd166', '#3b6fd8'][l];
        c.fillRect(x + 1, WALL - 14 + (Math.sin(ts * 6 + l) > 0 ? 0 : 1), 7, 4);
      }
      // มือธนู (คนดู) บนกำแพงตามเลน
      const actors = ctx.actors();
      const per = [[], [], []];
      for (const a of actors) {
        const l = st.laneOf.has(a.id) ? st.laneOf.get(a.id) : hsh(a.id) % 3;
        if (per[l].length < 7) per[l].push(a);
      }
      st.pos = new Map();
      per.forEach((arr, l) => {
        arr.forEach((a, i) => {
          const x = LX[l] - 18 + (i % 4) * 12 + (i >= 4 ? 6 : 0);
          const y = WALL + 6 + (i >= 4 ? 6 : 0);
          st.pos.set(a.id, { x: x + 6, y: y - 8 });
          const sh = st.shoot.get(a.id) || 0;
          if (sh > 0) st.shoot.set(a.id, sh - dt);
          const spr2 = K.hero(a.id, 0, { tool: 'bow', hat: 'helm', crown: a.id === S.lead, arm: sh > 0 ? 'up' : '' });
          c.drawImage(spr2, x - K.HX, y - 15 - K.HY);
        });
      });
      // ทหารยิงเองเป็นระยะ (เห็นว่ากำแพงไม่ว่าง)
      if (S.phase === 'fight' && Math.random() < 0.25) {
        const l = Math.floor(Math.random() * 3);
        const target = [...st.foes.values()].filter((f) => f.lane === l && f.dead === undefined).sort((a, b) => b.dy - a.dy)[0];
        if (target) st.arrows.push({ x0: LX[l] + (Math.random() - 0.5) * 20, y0: WALL + 2, x1: laneX(l, yOf(target.dy)), y1: yOf(target.dy), t: 0, auto: 1 });
      }
      // ลูกศร
      for (let i = st.arrows.length - 1; i >= 0; i--) {
        const a = st.arrows[i];
        a.t += dt;
        const k = Math.min(1, a.t / 0.35);
        const x = a.x0 + (a.x1 - a.x0) * k;
        const y = a.y0 + (a.y1 - a.y0) * k;
        c.fillStyle = a.auto ? 'rgba(216,216,224,.6)' : a.crit ? '#ffd166' : '#ffffff';
        c.fillRect(Math.round(x), Math.round(y), 1, 4);
        c.fillStyle = '#9aa6b8';
        c.fillRect(Math.round(x), Math.round(y) - 1, 1, 1);
        if (k >= 1) {
          st.arrows.splice(i, 1);
          if (!a.miss && !a.auto) ctx.boom(a.x1, a.y1, 4, ['#ffffff', '#ffd166']);
        }
      }
      if (st.arrows.length > 120) st.arrows.splice(0, st.arrows.length - 120);
      // ฝนธนู
      if (st.rain > 0) for (let k = 0; k < 10; k++) {
        const x = Math.random() * W;
        const y = TOP + Math.random() * (WALL - TOP);
        c.fillStyle = '#ffffff';
        c.fillRect(Math.round(x), Math.round(y), 1, 5);
      }
      // มังกรเผาทั้งสนาม
      if (st.dragon > 0) {
        const k = 1 - st.dragon / 4;
        const dx = -40 + k * (W + 80);
        const dy = 110 + Math.sin(k * 6) * 10;
        c.drawImage(dragonCv, Math.round(dx) - 10, Math.round(dy) - 20 + (Math.sin(ts * 8) > 0 ? 0 : 1));
        for (let j = 0; j < 30; j++) ctx.parts.push({ x: dx + 36 + Math.random() * 6, y: dy - 6, vx: (Math.random() - 0.5) * 20, vy: 50 + Math.random() * 60, life: 0.5, c: ['#ffd166', '#ff8a3d', '#e8453c'][j % 3], g: 0 });
      }
    },
    hud(ctx) {
      const S = ctx.S;
      const n = S.lanes || [0, 0, 0];
      const lanes = [0, 1, 2].map((l) => `<div class="lane${n[l] < Math.max(...n) / 3 && Math.max(...n) > 2 ? ' warn' : ''}" style="left:${LX[l] * 6}px">${['⬅️ ซ้าย', '⬆️ กลาง', '➡️ ขวา'][l]} ${n[l]}</div>`).join('');
      const top = (S.top || []).map((x, i) => `${['🥇', '🥈', '🥉'][i]} ${esc(x.n)} ${x.k}`).join(' · ');
      const hp = S.hp ?? 1000, max = S.max || 1000, up = S.up || {};
      return `<div class="slim" style="top:var(--hb-end, 326px)">
          <div class="l"><span>🌊 ระลอก ${S.wave || 1}${S.phase === 'rest' ? ` · เริ่มใน ${ctx.left()} วิ` : ` · เหลือ ${S.remain || 0} ตัว`}</span><span class="sp"></span><span style="opacity:.85">สถิติ ${S.best || 0} ระลอก</span></div>
          <div class="l"><span>🏰</span>${ctx.bar((hp / max) * 100, hp > 350 ? 'linear-gradient(90deg,#3f9a4a,#5fd068)' : '#e8453c')}<b>${hp}/${max}</b></div>
          ${S.vote ? `<div class="hot">🗳️ โหวต “ไฟ” ${S.vote.c.fire} · “น้ำแข็ง” ${S.vote.c.ice} · “ธนู” ${S.vote.c.arrow} · ${S.vote.left} วิ</div>`
            : `<div class="s">ป้อม 🔥${up.fire || 0} ❄️${up.ice || 0} 🏹${up.arrow || 0}${top ? ` · ${top}` : ''}</div>`}
        </div>${lanes}`;
    },
    onChat(d, ctx) {
      const t = String(d.text).replace(/\s+/g, '');
      if (/^(ยิง|ยิงๆ|ยิงเลย|shoot|ซ้าย|กลาง|ขวา|ไฟ|น้ำแข็ง|ธนู|ป้อมไฟ|ป้อมน้ำแข็ง|ป้อมธนู)$/.test(t)) return;
      const p = st.pos?.get(d.id);
      if (p) ctx.label('s' + d.id, p.x, p.y - 8, esc(String(d.text).slice(0, 20)), 2.5, 'say');
    },
    css: () => `.mg-hud .lane { position: absolute; top: ${(WALL - 22) * 6}px; transform: translateX(-50%); padding: 2px 14px 4px; background: rgba(12,8,24,.9); border: 4px solid #ffffff; font-size: 26px; font-weight: 800; white-space: nowrap; }
      .mg-hud .lane.warn { border-color: #e8453c; color: #ffb0a0; animation: advPulse .6s steps(2) infinite; }
      @keyframes advPulse { 50% { opacity: .55; } }`,
  };
  function archerPos(id, lane, ctx) {
    const p = id && st.pos?.get(id);
    return p || { x: LX[lane] + (Math.random() - 0.5) * 20, y: WALL + 2 };
  }

  window.MG_GAMES.castle = G;
})();
