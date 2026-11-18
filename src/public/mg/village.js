/* มินิเกม: หมู่บ้านของเรา (ภาพ) — มุมสูงเฉียง หมู่บ้านด้านบน ทุ่งนา 12 แปลงด้านล่าง
 * สิ่งก่อสร้าง 10 อย่างโผล่ทีละอย่างเมื่อสร้างเสร็จ (กำลังสร้างมีนั่งร้าน) • ชาวบ้าน = คนดู เดินไปทำงานที่แปลง
 */
(() => {
  const K = window.PixelKit;
  const { P, O, W, H, hsh, rnd, esc } = K;
  const ROAD = 160;
  const PLOT = (i) => ({ x: 8 + (i % 4) * 42, y: 174 + Math.floor(i / 4) * 29, w: 36, h: 24 });
  const LOTS = {
    pond: [4, 70, 38, 26], market: [46, 68, 42, 28], sala: [94, 68, 36, 28], mill: [136, 64, 40, 32],
    garden: [30, 102, 32, 24], tree: [66, 96, 28, 32], ferris: [100, 94, 34, 38], tower: [146, 98, 24, 36],
    gate: [70, 134, 32, 22], hall: [112, 132, 36, 26],
  };
  const HOUSES = [[4, 132, '#e8453c'], [150, 136, '#3b6fd8']];
  let base = null;
  const sprites = {};
  const st = { vill: new Map(), rain: 0, fest: 0, fert: 0, builtFx: 0 };

  // ---------------------------------------------------------------- พื้นหลัง
  function makeBase() {
    const R = rnd(21);
    const p = P(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) p.px(x, y, ((x * 7 + y * 13) % 19 === 0) ? '#6fbc58' : ((x * 3 + y * 5) % 23 === 0 ? '#4f9840' : '#5fae4a'));
    // แนวป่าด้านบน
    for (let x = -6; x < W + 6; x += 9) {
      const r = 7 + Math.floor(R() * 4);
      const cy = 48 + Math.floor(R() * 10);
      p.oell(x, cy, r, r - 1, '#2f7a3a');
      p.ell(x - 2, cy - 2, r - 3, r - 4, '#3f9a4a');
      p.px(x - 3, cy - 4, '#5fd068');
    }
    // ถนนดินกลาง + รั้ว
    for (let x = 0; x < W; x++) {
      p.rect(x, ROAD, 1, 9, (x * 5) % 7 === 0 ? '#c8a868' : '#d8b878');
      p.px(x, ROAD, '#b8985a');
      p.px(x, ROAD + 8, '#b8985a');
    }
    for (let x = 2; x < W; x += 8) {
      p.rect(x, ROAD + 10, 2, 5, '#9a6a3a');
      p.px(x, ROAD + 10, '#c8925a');
    }
    p.rect(0, ROAD + 11, W, 1, '#7a5232');
    // ทางหินในหมู่บ้าน
    for (const [x0, x1] of [[20, 26], [84, 90], [128, 134]]) {
      for (let y = 96; y < ROAD; y++) for (let x = x0; x < x1; x++) p.px(x, y, (x + y) % 3 === 0 ? '#a8a090' : '#c8c0a8');
    }
    for (let x = 0; x < W; x++) for (let y = 128; y < 132; y++) p.px(x, y, (x + y) % 3 === 0 ? '#a8a090' : '#c8c0a8');
    // คลองส่งน้ำระหว่างแถวนา
    for (const y of [199, 228]) {
      p.rect(0, y, W, 3, '#3a8ad0');
      for (let x = 0; x < W; x += 5) p.px(x, y + 1, '#7ac0f0');
    }
    // ฟางข้าว + รั้วล่าง
    for (let x = 6; x < W; x += 30) {
      p.oell(x + 6, 266, 6, 4, '#e0b85a');
      p.rect(x + 2, 265, 8, 1, '#b8903a');
    }
    const free = (x, y, m = 3) => !Object.values(LOTS).some(([lx, ly, lw, lh]) => x > lx - m && x < lx + lw + m && y > ly - 8 && y < ly + lh + m) &&
      !HOUSES.some(([hx, hy]) => x > hx - 3 && x < hx + 28 && y > hy - 4 && y < hy + 26) && !(y > 126 && y < 134) && ![[20, 26], [84, 90], [128, 134]].some(([a, b]) => x > a - 3 && x < b + 3);
    for (let i = 0; i < 700; i++) {
      const x = 2 + Math.floor(R() * (W - 4));
      const y = 64 + Math.floor(R() * 92);
      if (!free(x, y)) continue;
      const k = R();
      if (k < 0.12) {
        p.oell(x, y, 3, 2, '#3f8a3a');
        p.px(x - 1, y - 1, '#5fae48');
        if (R() < 0.5) p.px(x + 1, y, ['#ff8fab', '#ffd166', '#ffffff'][i % 3]);
      } else if (k < 0.2 && free(x, y, 8)) {
        p.rect(x, y - 2, 2, 6, '#7a4a2a');
        p.oell(x + 1, y - 6, 5, 4, '#2f7a3a');
        p.ell(x, y - 7, 3, 2, '#4fa848');
      } else if (k < 0.5) p.px(x, y, ['#ff8fab', '#ffd166', '#ffffff', '#b28cff', '#ff8a3d'][i % 5]);
      else if (k < 0.56) {
        p.px(x, y, '#8a8a8a');
        p.px(x + 1, y, '#a8a8a8');
      }
    }
    // บ่อน้ำบาดาล + ป้ายหมู่บ้าน
    p.oell(64, 146, 4, 3, '#9aa6b8');
    p.ell(64, 146, 2, 1, '#3a6aa0');
    p.rect(60, 140, 1, 5, '#7a4a2a');
    p.rect(68, 140, 1, 5, '#7a4a2a');
    p.rect(59, 139, 11, 2, '#c8643a');
    // บ้าน 2 หลังถาวร
    for (const [x, y, roof] of HOUSES) house(p, x, y, roof);
    return p.cv;
  }
  function house(p, x, y, roof) {
    p.orect(x + 1, y + 9, 22, 14, '#f2e6c8');
    p.rect(x + 10, y + 15, 4, 8, '#7a4a2a');
    p.rect(x + 4, y + 12, 4, 3, '#7cc6f2');
    p.rect(x + 16, y + 12, 4, 3, '#7cc6f2');
    p.poly([[x - 2, y + 10], [x + 12, y - 1], [x + 26, y + 10]], O);
    p.poly([[x, y + 9], [x + 12, y + 1], [x + 24, y + 9]], roof);
    p.rect(x + 17, y, 3, 5, '#9a6a3a');
  }

  // ---------------------------------------------------------------- สิ่งก่อสร้าง
  const DRAW = {
    pond(p, w, h) {
      p.oell(w / 2, h / 2 + 1, w / 2 - 3, h / 2 - 3, '#3a8ad0');
      p.ell(w / 2 - 3, h / 2 - 1, w / 2 - 9, h / 2 - 7, '#5fa8e0');
      for (const [a, b] of [[10, 10], [24, 16], [16, 18]]) p.oell(a, b, 2, 1, '#3f9a4a');
      p.px(25, 15, '#ff8fab');
      for (let x = 2; x < w; x += 5) p.rect(x, h - 3, 1, 3, '#9a6a3a'), p.rect(x, 1, 1, 3, '#9a6a3a');
    },
    market(p) {
      const cols = [['#e8453c', '#ffffff'], ['#ffd166', '#3f9a4a'], ['#3b6fd8', '#ffffff']];
      cols.forEach(([a, b], i) => {
        const x = 1 + i * 14;
        p.orect(x, 12, 13, 14, '#c8925a');
        for (let k = 0; k < 13; k++) p.rect(x + k, 6, 1, 6, k % 4 < 2 ? a : b);
        p.rect(x, 5, 13, 1, O);
        for (let k = 0; k < 4; k++) p.px(x + 2 + k * 3, 15, ['#e8453c', '#ffd166', '#5fd068', '#ff8a3d'][(k + i) % 4]);
        for (let k = 0; k < 4; k++) p.px(x + 3 + k * 2, 18, ['#ffffff', '#c8925a', '#5fd068'][(k + i) % 3]);
      });
    },
    sala(p, w, h) {
      p.orect(4, 14, w - 8, 12, '#c8925a');
      for (const x of [6, w - 8]) p.rect(x, 12, 2, 12, '#7a4a2a');
      p.poly([[0, 14], [w / 2, 1], [w, 14]], O);
      p.poly([[2, 13], [w / 2, 3], [w - 2, 13]], '#c8643a');
      p.poly([[7, 13], [w / 2, 6], [w - 7, 13]], '#e8845a');
      p.rect(2, 13, w - 4, 1, '#ffd166');
      p.line(w / 2, 1, w / 2, -2, '#ffd166');
    },
    mill(p, w, h) {
      p.orect(2, 12, 28, 18, '#b8403a');
      p.rect(3, 13, 26, 2, '#d8584a');
      p.poly([[0, 13], [16, 2], [32, 13]], O);
      p.poly([[2, 12], [16, 4], [30, 12]], '#7a4a2a');
      p.rect(13, 20, 6, 10, '#5a3420');
      p.oell(34, 20, 5, 8, '#9a6a3a');
      for (let a = 0; a < 6; a++) p.line(34, 20, 34 + Math.cos(a) * 5, 20 + Math.sin(a) * 8, '#5a3420');
      for (const x of [4, 9]) p.orect(x, 25, 5, 5, '#f2e6c8');
    },
    garden(p, w, h) {
      p.orect(0, 0, w, h, '#4f9840');
      for (let y = 3; y < h - 2; y += 4) for (let x = 3; x < w - 2; x += 3) p.px(x, y, ['#ff8fab', '#ffd166', '#e8453c', '#b28cff', '#ffffff'][(x + y) % 5]);
      p.rect(w / 2 - 1, 0, 3, h, '#c8c0a8');
      p.oell(w / 2, h / 2, 4, 3, '#9aa6b8');
      p.ell(w / 2, h / 2, 2, 1, '#7ac0f0');
    },
    tree(p, w, h) {
      p.rect(w / 2 - 2, 14, 5, 18, '#7a4a2a');
      p.oell(w / 2, 10, 13, 10, '#2f7a3a');
      p.ell(w / 2 - 2, 8, 10, 7, '#3f9a4a');
      p.orect(w / 2 - 6, 8, 12, 9, '#c8925a');
      p.poly([[w / 2 - 8, 9], [w / 2, 3], [w / 2 + 8, 9]], '#c8643a');
      p.rect(w / 2 - 1, 12, 3, 5, '#5a3420');
      for (let y = 17; y < 31; y += 2) p.rect(w / 2 + 4, y, 3, 1, '#9a6a3a');
    },
    ferris(p, w, h) {
      p.line(w / 2, 17, 6, h - 1, '#9aa6b8');
      p.line(w / 2, 17, w - 6, h - 1, '#9aa6b8');
      p.rect(4, h - 2, w - 8, 2, '#7a7f89');
    },
    tower(p, w, h) {
      p.poly([[5, h], [w / 2, 10], [w - 5, h]], O);
      p.poly([[6, h - 1], [w / 2, 11], [w - 6, h - 1]], '#f2e6c8');
      p.rect(w / 2 - 2, h - 8, 4, 8, '#7a4a2a');
      p.rect(w / 2 - 1, 18, 3, 3, '#7cc6f2');
    },
    gate(p, w, h) {
      for (const x of [2, w - 6]) p.orect(x, 6, 4, h - 6, '#e8453c');
      p.orect(0, 3, w, 5, '#c8643a');
      p.poly([[0, 3], [w / 2, -2], [w, 3]], '#ffd166');
      p.orect(6, 9, w - 12, 5, '#fff3c4');
    },
    hall(p, w, h) {
      p.orect(2, 12, w - 4, h - 12, '#f2e6c8');
      for (let x = 5; x < w - 4; x += 6) p.rect(x, 14, 2, h - 14, '#c8925a');
      p.poly([[0, 13], [w / 2, 2], [w, 13]], O);
      p.poly([[2, 12], [w / 2, 4], [w - 2, 12]], '#3b6fd8');
      p.rect(2, 12, w - 4, 1, '#ffd166');
      p.rect(w / 2 - 3, h - 8, 6, 8, '#7a4a2a');
      p.line(w / 2, 2, w / 2, -6, '#5a3420');
      p.rect(w / 2 + 1, -6, 6, 4, '#e8453c');
    },
  };
  function sprite(key) {
    if (sprites[key]) return sprites[key];
    const [, , w, h] = LOTS[key];
    const p = P(w + 2, h + 8);
    p.c.translate(1, 6);
    DRAW[key](p, w, h);
    sprites[key] = p.cv;
    return p.cv;
  }

  // ---------------------------------------------------------------- พืช
  function drawPlot(c, i, data, ts) {
    const { x, y, w, h } = PLOT(i);
    const [s, rice, wet, prog] = data || [0, i >= 8 ? 1 : 0, 0, 0];
    c.fillStyle = O;
    c.fillRect(x - 1, y - 1, w + 2, h + 2);
    c.fillStyle = wet ? '#5a3a24' : '#7a4c30';
    c.fillRect(x, y, w, h);
    for (let r = y + 3; r < y + h - 1; r += 5) {
      c.fillStyle = wet ? '#4a2c18' : '#5a3420';
      c.fillRect(x + 1, r, w - 2, 1);
      for (let cx = x + 3; cx < x + w - 2; cx += 5) {
        if (s === 1) {
          c.fillStyle = '#c8a878';
          c.fillRect(cx, r - 1, 1, 1);
        } else if (s === 2) {
          c.fillStyle = '#8ee88a';
          c.fillRect(cx, r - 1, 1, 1);
          c.fillRect(cx + 1, r - 2, 1, 1);
        } else if (s === 3) {
          c.fillStyle = rice ? '#78c060' : '#4fae48';
          c.fillRect(cx - 1, r - 2, 3, 2);
          c.fillStyle = '#8ee88a';
          c.fillRect(cx, r - 3, 1, 1);
        } else if (s === 4) {
          if (rice) {
            const sway = Math.round(Math.sin(ts * 2 + cx * 0.3) * 0.6);
            c.fillStyle = '#e0a81e';
            c.fillRect(cx - 1 + sway, r - 4, 1, 4);
            c.fillRect(cx + 1 + sway, r - 4, 1, 4);
            c.fillStyle = '#ffd166';
            c.fillRect(cx + sway, r - 5, 1, 4);
          } else {
            const col = ['#5fd068', '#ff8a3d', '#e8453c', '#b28cff'][(i + cx) % 4];
            c.fillStyle = O;
            c.fillRect(cx - 1, r - 3, 4, 3);
            c.fillStyle = col;
            c.fillRect(cx - 1, r - 3, 3, 2);
            c.fillStyle = '#c8f7c0';
            c.fillRect(cx, r - 3, 1, 1);
          }
        }
      }
    }
    if (wet && Math.sin(ts * 3 + i) > 0.6) {
      c.fillStyle = '#cfe8ff';
      c.fillRect(x + 4 + ((i * 7) % (w - 8)), y + 4, 1, 1);
    }
    // ระยะโต (แถบเล็ก)
    if (s >= 1 && s < 4) {
      c.fillStyle = O;
      c.fillRect(x + 2, y + h - 3, w - 4, 2);
      c.fillStyle = '#5fd068';
      c.fillRect(x + 2, y + h - 3, Math.round((w - 4) * ((s - 1 + prog) / 3)), 2);
    }
    if (s === 4 && Math.sin(ts * 5 + i) > 0.7) {
      c.fillStyle = '#ffffff';
      c.fillRect(x + w - 4, y + 2, 1, 1);
    }
  }

  // ---------------------------------------------------------------- ชาวบ้าน
  function villager(id, ctx) {
    let v = st.vill.get(id);
    if (!v) {
      const h = hsh(id);
      v = { x: 10 + (h % 160), y: ROAD + 2 + (h % 5), tx: null, ty: null, job: null, t: 0, ph: (h % 100) / 10, idleAt: 0 };
      st.vill.set(id, v);
    }
    return v;
  }

  const G = {
    toastTop: 590, // ป้ายของขวัญอยู่บนลานหญ้า (ถนนกับแปลงผักมีชาวบ้านเดิน)
    // วิธีเล่นเป็นแถบป้ายเล็ก ๆ ใต้ชื่อเกม (ไม่มีบรรทัดเกร็ด — ด้านบนเป็นที่ตั้งบ้านที่สร้าง ให้บังน้อยที่สุด)
    hintsTop: 188,
    fxWorld: true,
    hints: [
      ['🌱', 'ปลูก', 'หว่านเมล็ด'],
      ['💧', 'รดน้ำ', 'โตไว 2 เท่า'],
      ['🧺', 'เก็บ', 'ไปสร้างบ้าน'],
      ['🏷️', 'จอง', 'แปลงของฉัน ×1.5'],
      ['🐦', 'ไล่/ขาย', 'อีกา/พ่อค้า'],
      ['🎁', 'ไลก์/ของขวัญ', 'ฝน·ปุ๋ย·ช่าง'],
    ],
    init() {
      base = makeBase();
    },
    onEv(d, ctx) {
      if (d.ev === 'act') {
        const id = d.id || 'npc';
        const v = villager(id, ctx);
        const pl = PLOT(d.plot);
        v.tx = pl.x + pl.w / 2 - 6;
        v.ty = pl.y + pl.h - 2;
        v.job = d.kind;
        v.t = 0;
        v.idleAt = 0;
        const icon = { plant: '🌱', water: '💧', harvest: '🧺' }[d.kind];
        ctx.label('v' + id, pl.x + pl.w / 2, pl.y - 1, `${icon} ${id === 'npc' ? esc(d.name) : ctx.nm(id, d.name)}`, 2.2);
        if (d.gain) setTimeout(() => ctx.num(pl.x + pl.w / 2, pl.y - 6, `+${d.gain} ${pl.y > 220 ? '🌾' : '🥬'}`, '#c8f7c0', 40), 900);
      } else if (d.ev === 'none') {
        const msg = { plant: 'แปลงเต็ม → รดน้ำ', water: 'ยังไม่มีให้รด', harvest: 'ยังไม่สุก' }[d.kind];
        const v = st.vill.get(d.id);
        if (v) ctx.label('v' + d.id, v.x + 6, v.y - 16, esc(msg), 1.4);
      } else if (d.ev === 'built') {
        st.builtFx = 4;
        const [x, y, w] = LOTS[d.key];
        ctx.api.bigShow(null, `สร้าง${d.name}เสร็จ!`);
        ctx.api.fireworks(4);
        ctx.sparkles(x + w / 2, y + 10, 40, '#ffd166', w);
        if (d.top?.length) setTimeout(() => ctx.toast(`🏗️ ${d.name} — ขอบคุณผู้ช่วยสร้าง: ${d.top.join(' · ')}`, 'big'), 1800);
      } else if (d.ev === 'levelup') {
        ctx.toast(`🎉 หมู่บ้านครบทุกสิ่งก่อสร้าง! เริ่มรอบที่ ${d.lv} (สร้างใหม่ใหญ่กว่าเดิม)`, 'big');
      } else if (d.ev === 'claim') {
        const pl = PLOT(d.plot);
        ctx.sparkles(pl.x + pl.w / 2, pl.y + pl.h / 2, 16, '#ffd166', pl.w);
        ctx.toast(`🏷️ ${d.name} จองแปลงที่ ${d.plot + 1} แล้ว!`);
      } else if (d.ev === 'crows') {
        ctx.toast(`🐦 อีกาบุกแปลงผัก! พิมพ์ “ไล่” ให้ครบ ${d.need} คนใน 15 วิ`, 'big');
        ctx.sfx('whistle');
      } else if (d.ev === 'crowsEnd') {
        ctx.toast(d.ok ? '🎉 ไล่อีกาสำเร็จ! ผักปลอดภัย' : '😢 ไล่ไม่ทัน อีกากินเมล็ดไปแล้ว', d.ok ? 'big' : '');
        if (d.ok) for (const i of d.plots) {
          const pl = PLOT(i);
          ctx.boom(pl.x + pl.w / 2, pl.y + 4, 10, ['#1b1426', '#3a3a4a']);
        }
      } else if (d.ev === 'merchant') {
        ctx.toast('🛒 พ่อค้าเร่มาแล้ว! พิมพ์ “ขาย” ภายใน 20 วิ ได้เงินสร้างหมู่บ้าน', 'big');
        ctx.sfx('chime', 880);
      } else if (d.ev === 'sold') {
        ctx.num(46, ROAD - 14, `+15 💰`, '#ffd166', 36);
      } else if (d.ev === 'merchantEnd') {
        if (d.n) ctx.toast(`💰 ขายให้พ่อค้าได้ ${d.n} คน ได้เงินสร้างหมู่บ้าน +${d.n * 15}`);
      } else if (d.ev === 'rain') {
        st.rain = 6;
        ctx.toast('🌧️ ฝนตก! ทุกแปลงโตขึ้น');
      } else if (d.ev === 'gift') {
        if (d.tier === 1) st.fert = 3;
        else if (d.tier === 3) st.fest = 12;
        if (d.tier === 2) {
          const k = ctx.S.cur?.key;
          if (k) ctx.sparkles(LOTS[k][0] + LOTS[k][2] / 2, LOTS[k][1] + 10, 24, '#ffffff', LOTS[k][2]);
        }
      }
    },
    gift(tier, user, n, f, ctx) {
      ctx.toast(`${f.icon} ${user?.name || 'มีคน'} → ${f.label}`, tier === 3 ? 'big' : '');
      if (tier === 3) ctx.api.bigShow(user, 'เทศกาลหมู่บ้าน!');
    },
    frame(c, ts, dt, ctx) {
      const S = ctx.S;
      for (const k of ['rain', 'fest', 'fert', 'builtFx']) st[k] = Math.max(0, st[k] - dt);
      c.drawImage(base, 0, 0);
      const built = new Set(S.built || []);
      // สิ่งก่อสร้าง: เสร็จแล้ว / กำลังสร้าง / ที่ว่าง
      for (const [key, [x, y, w, h]] of Object.entries(LOTS)) {
        if (built.has(key)) {
          c.drawImage(sprite(key), x - 1, y - 6);
          animBuilding(c, key, x, y, w, h, ts);
        } else if (S.cur?.key === key) {
          const pr = Math.min(1, (S.cur.prog || 0) / (S.cur.need || 1));
          c.globalAlpha = 0.25 + pr * 0.6;
          c.drawImage(sprite(key), x - 1, y - 6);
          c.globalAlpha = 1;
          c.fillStyle = '#9a6a3a';
          for (let xx = x; xx <= x + w; xx += 6) c.fillRect(xx, y - 2, 1, h + 2);
          for (let yy = y; yy <= y + h; yy += 7) c.fillRect(x - 1, yy, w + 2, 1);
          if (Math.random() < 0.08) ctx.parts.push({ x: x + Math.random() * w, y: y + Math.random() * h, vx: 0, vy: -10, life: 0.5, c: '#fff3c4', g: 0 });
          ctx.label('cur', x + w / 2, y + h + 7, `🏗️ ${esc(S.cur.name)} ${Math.floor(pr * 100)}%`, 1, 'gold');
        } else {
          c.fillStyle = 'rgba(255,255,255,.18)';
          for (let xx = x; xx < x + w; xx += 4) c.fillRect(xx, y + h - 1, 2, 1);
          c.fillStyle = '#9a6a3a';
          c.fillRect(x, y + h - 4, 1, 4);
          c.fillRect(x + w - 1, y + h - 4, 1, 4);
        }
      }
      // ควันปล่องไฟ
      for (const [x, y] of HOUSES) {
        if (Math.random() < 0.06) ctx.parts.push({ x: x + 18, y: y - 1, vx: 3, vy: -8, life: 2, c: 'rgba(240,240,240,.7)', g: 0 });
      }
      // แปลงนา (+ป้ายเจ้าของ)
      for (let i = 0; i < 12; i++) {
        drawPlot(c, i, S.plots?.[i], ts);
        const own = S.plots?.[i]?.[4];
        if (own) {
          const pl = PLOT(i);
          ctx.label('own' + i, pl.x + pl.w / 2, pl.y + pl.h + 1, `🏷️ ${esc(own)}`, 1, 'own');
        }
      }
      // อีกาบินวนเหนือแปลงเป้าหมาย
      if (S.crows) {
        for (const i of S.crows.plots) {
          const pl = PLOT(i);
          for (let k = 0; k < 3; k++) {
            const a = ts * 3 + k * 2.1 + i;
            const x = Math.round(pl.x + pl.w / 2 + Math.cos(a) * 12);
            const y = Math.round(pl.y + 6 + Math.sin(a) * 5);
            const flap = Math.sin(ts * 16 + k) > 0;
            c.fillStyle = O;
            c.fillRect(x - 1, y, 3, 2);
            c.fillRect(x - 3, y - (flap ? 1 : 0), 2, 1);
            c.fillRect(x + 2, y - (flap ? 1 : 0), 2, 1);
            c.fillStyle = '#ffd166';
            c.fillRect(x + 1, y + 1, 1, 1);
          }
        }
      }
      // รถเข็นพ่อค้าเร่บนถนน
      if (S.merchant) {
        const mx = 30;
        const my = ROAD - 12;
        c.fillStyle = O;
        c.fillRect(mx - 1, my - 1, 32, 12);
        c.fillStyle = '#c8925a';
        c.fillRect(mx, my, 30, 10);
        for (let k = 0; k < 30; k++) {
          c.fillStyle = k % 6 < 3 ? '#e8453c' : '#ffffff';
          c.fillRect(mx + k, my - 5, 1, 4);
        }
        c.fillStyle = '#3a3d45';
        c.fillRect(mx + 4, my + 10, 4, 3);
        c.fillRect(mx + 22, my + 10, 4, 3);
        for (let k = 0; k < 5; k++) {
          c.fillStyle = ['#5fd068', '#ffd166', '#ff8a3d', '#e8453c', '#b28cff'][k];
          c.fillRect(mx + 3 + k * 5, my + 2, 3, 3);
        }
        c.drawImage(K.hero('merchant', 0, { hat: 'straw', shirt: ['#b8403a', '#7a1f1a'] }), mx + 32 - K.HX, my + 12 - 15 - K.HY);
      }
      // ไก่เดินเล่น
      for (let i = 0; i < 3; i++) {
        const x = 40 + i * 46 + Math.sin(ts * 0.7 + i) * 12;
        const y = ROAD - 6 + (i % 2) * 2;
        c.fillStyle = O;
        c.fillRect(Math.round(x) - 1, y - 1, 5, 4);
        c.fillStyle = '#ffffff';
        c.fillRect(Math.round(x), y, 3, 2);
        c.fillStyle = '#e8453c';
        c.fillRect(Math.round(x) + (Math.sin(ts + i) > 0 ? 3 : -1), y - 1, 1, 1);
        if (Math.sin(ts * 4 + i * 2) > 0.9) {
          c.fillStyle = '#ffd166';
          c.fillRect(Math.round(x) + 3, y + 1, 1, 1);
        }
      }
      // ชาวบ้าน (คนดู + ชาวบ้าน NPC)
      const actors = ctx.actors().slice(-18);
      const ids = new Set(actors.map((a) => a.id));
      ids.add('npc');
      for (const id of [...st.vill.keys()]) if (!ids.has(id)) st.vill.delete(id);
      const list = [...ids].map((id) => [id, villager(id, ctx)]).sort((a, b) => a[1].y - b[1].y);
      for (const [id, v] of list) {
        if (v.tx !== null) {
          const dx = v.tx - v.x;
          const dy = v.ty - v.y;
          const d = Math.hypot(dx, dy);
          if (d > 1) {
            const sp = Math.min(d, dt * 40);
            v.x += (dx / d) * sp;
            v.y += (dy / d) * sp;
          } else {
            v.t += dt;
            if (v.t > 2.2) {
              v.tx = null;
              v.job = null;
              v.idleAt = 0;
            }
          }
        } else {
          if (!v.idleAt || ts > v.idleAt) {
            v.idleAt = ts + 3 + Math.random() * 5;
            v.wx = Math.max(6, Math.min(166, v.x + (Math.random() - 0.5) * 40));
            v.wy = ROAD + 1 + Math.random() * 5;
          }
          const dx = v.wx - v.x;
          const dy = v.wy - v.y;
          const d = Math.hypot(dx, dy);
          if (d > 1) {
            v.x += (dx / d) * Math.min(d, dt * 12);
            v.y += (dy / d) * Math.min(d, dt * 12);
          }
        }
        const moving = v.tx !== null && Math.hypot(v.tx - v.x, v.ty - v.y) > 1;
        const frame = moving || (v.tx === null && Math.hypot((v.wx ?? v.x) - v.x, (v.wy ?? v.y) - v.y) > 1) ? [1, 0, 2, 0][Math.floor(ts * 8 + v.ph) % 4] : 0;
        const tool = v.job === 'water' ? 'can' : null;
        const spr = K.hero(id, frame, { hat: id === 'npc' || hsh(id) % 2 ? 'straw' : '', tool, crown: id === S.lead, arm: v.job === 'harvest' && v.t > 0 ? 'up' : '' });
        c.drawImage(spr, Math.round(v.x) - K.HX, Math.round(v.y) - 15 - K.HY);
        if (v.job === 'water' && v.t > 0) for (let k = 0; k < 2; k++) ctx.parts.push({ x: v.x + 15, y: v.y - 6, vx: 10, vy: 20, life: 0.3, c: '#9ae8ff', g: 60 });
        if (v.job === 'plant' && v.t > 0 && Math.random() < 0.3) ctx.parts.push({ x: v.x + 6, y: v.y - 4, vx: (Math.random() - 0.5) * 10, vy: 10, life: 0.4, c: '#c8a878', g: 40 });
      }
      // เงาเมฆ + ฝน + ปุ๋ย + เทศกาล
      for (let i = 0; i < 2; i++) {
        const x = ((i * 97 + ts * 5) % (W + 80)) - 60;
        c.fillStyle = 'rgba(20,40,20,.10)';
        c.fillRect(Math.round(x), 90 + i * 110, 50, 18);
        c.fillRect(Math.round(x) + 8, 86 + i * 110, 30, 26);
      }
      if (st.rain > 0) {
        c.fillStyle = 'rgba(40,60,90,.18)';
        c.fillRect(0, 0, W, H);
        c.fillStyle = 'rgba(200,230,255,.8)';
        for (let i = 0; i < 70; i++) {
          const x = (i * 37 + ts * 40) % W;
          const y = (i * 53 + ts * 220) % H;
          c.fillRect(Math.round(x), Math.round(y), 1, 3);
        }
      }
      if (st.fert > 0) for (let i = 0; i < 12; i++) {
        const pl = PLOT(i);
        if (Math.random() < 0.3) ctx.parts.push({ x: pl.x + Math.random() * pl.w, y: pl.y + Math.random() * pl.h, vx: 0, vy: -14, life: 0.7, c: '#c8f7c0', g: 0, plus: true });
      }
      if (st.fest > 0) {
        for (let x = 0; x < W; x += 6) {
          const y = 70 + Math.sin(x / 15) * 4;
          c.fillStyle = ['#e8453c', '#ffd166', '#5fd068', '#3b6fd8'][(x / 6) % 4];
          c.fillRect(x, Math.round(y), 2, 3);
          if (Math.sin(ts * 6 + x) > 0) {
            c.fillStyle = '#fff3c4';
            c.fillRect(x, Math.round(y) + 3, 2, 1);
          }
        }
        if (Math.random() < 0.05) ctx.api.fireworks(1);
      }
    },
    hud(ctx) {
      const S = ctx.S;
      const cur = S.cur || { name: '-', need: 1, prog: 0 };
      const top = (S.top || []).map((x) => esc(x.n)).join(' · ');
      const nf = (x) => (x || 0).toLocaleString('en-US');
      const alert = S.crows ? `<div class="hot" style="color:#ff8a6a">🐦 อีกาบุก! พิมพ์ “ไล่” ${S.crows.n}/${S.crows.need} · ${S.crows.left} วิ</div>`
        : S.merchant ? `<div class="hot">🛒 พ่อค้าเร่! พิมพ์ “ขาย” (${S.merchant.n} คนแล้ว) · ${S.merchant.left} วิ</div>` : '';
      return `<div class="slim" style="top:var(--hb-end, 326px)">
          <div class="l"><span>🏡 หมู่บ้านรอบที่ ${S.lv || 1} · สร้างแล้ว ${(S.built || []).length}/10</span><span class="sp"></span><span>🥬 ${nf(S.res?.veg)} · 🌾 ${nf(S.res?.rice)}</span></div>
          <div class="l"><span>🏗️ <b class="gold">${esc(cur.name)}</b></span>${ctx.bar(((cur.prog || 0) / cur.need) * 100, 'linear-gradient(90deg,#e0a81e,#ffd166)')}<b>${nf(cur.prog)}/${nf(cur.need)}</b></div>
          ${alert || (top ? `<div class="s">💪 ช่วยสร้างมากสุด ${top}</div>` : '')}
        </div>`;
    },
    onChat(d, ctx) {
      const t = String(d.text).replace(/\s+/g, '');
      if (/^(ปลูก|หว่าน|รดน้ำ|รด|เก็บ|เก็บเกี่ยว|จอง|จองแปลง|ไล่|ไล่อีกา|ชู่ว|ขาย|ขายผัก)$/.test(t)) return;
      const v = st.vill.get(d.id);
      if (v) ctx.label('v' + d.id, v.x + 6, v.y - 17, esc(String(d.text).slice(0, 24)), 2.5, 'say');
    },
  };

  function animBuilding(c, key, x, y, w, h, ts) {
    if (key === 'ferris') {
      const cx = x + w / 2;
      const cy = y + 16;
      for (let k = 0; k < 8; k++) {
        const a = ts * 0.6 + (k / 8) * Math.PI * 2;
        const px = Math.round(cx + Math.cos(a) * 13);
        const py = Math.round(cy + Math.sin(a) * 13);
        c.fillStyle = '#9aa6b8';
        line(c, cx, cy, px, py);
        c.fillStyle = O;
        c.fillRect(px - 2, py - 1, 5, 4);
        c.fillStyle = ['#e8453c', '#ffd166', '#3b6fd8', '#5fd068'][k % 4];
        c.fillRect(px - 1, py, 3, 2);
      }
      c.fillStyle = '#ffd166';
      c.fillRect(cx - 1, cy - 1, 3, 3);
    } else if (key === 'tower') {
      const cx = x + w / 2;
      const cy = y + 10;
      for (let k = 0; k < 4; k++) {
        const a = ts * 2 + (k * Math.PI) / 2;
        c.fillStyle = '#9a6a3a';
        line(c, cx, cy, cx + Math.cos(a) * 11, cy + Math.sin(a) * 11);
        c.fillStyle = '#f2e6c8';
        c.fillRect(Math.round(cx + Math.cos(a) * 8) - 1, Math.round(cy + Math.sin(a) * 8) - 1, 3, 3);
      }
    } else if (key === 'pond') {
      for (let k = 0; k < 2; k++) {
        const fx = x + 10 + ((ts * 6 + k * 13) % 20);
        c.fillStyle = 'rgba(255,138,61,.8)';
        c.fillRect(Math.round(fx), y + 12 + k * 4, 3, 1);
      }
      c.fillStyle = '#ffffff';
      const dx = x + 8 + Math.sin(ts * 0.6) * 6;
      c.fillRect(Math.round(dx), y + 8, 3, 2);
      c.fillStyle = '#ffd166';
      c.fillRect(Math.round(dx) + 3, y + 8, 1, 1);
    } else if (key === 'hall') {
      c.fillStyle = Math.sin(ts * 4) > 0 ? '#e8453c' : '#ff6b5a';
      c.fillRect(x + w / 2 + 2, y - 6, 6, 4);
    } else if (key === 'garden') {
      if (Math.random() < 0.05) {
        // ผีเสื้อ
        st.bf = { x: x + Math.random() * w, y: y + Math.random() * h, t: 2 };
      }
      if (st.bf && st.bf.t > 0) {
        st.bf.t -= 1 / 60;
        st.bf.x += Math.sin(ts * 3) * 0.4;
        st.bf.y -= 0.15;
        c.fillStyle = Math.sin(ts * 20) > 0 ? '#ff8fab' : '#ffd166';
        c.fillRect(Math.round(st.bf.x), Math.round(st.bf.y), 2, 1);
      }
    }
  }
  function line(c, x0, y0, x1, y1) {
    const n = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    for (let i = 0; i <= n; i++) c.fillRect(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), 1, 1);
  }

  G.css = () => '.mg-lab.own { transform: translate(-50%, 0); font-size: 18px; padding: 0 8px 2px; border-width: 3px; background: rgba(12,8,24,.75); }';
  window.MG_GAMES.village = G;
})();
