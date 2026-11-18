/* ธีม "ปาร์ตี้ผจญภัย" — เกมพิกเซลอาร์ตเล่นกับคนดู (ข้อมูลธีม advtheme.js • กติกา/ดาเมจ/เลเวล adventure.js ฝั่งเซิร์ฟเวอร์)
 * ไฟล์ธีม public/themes/adventure.js เรียก window.makeAdventureTheme('adventure')
 * วาดทุกอย่างบนแคนวาส 180x320 แล้วขยาย 6 เท่าแบบคม (image-rendering: pixelated) → เบามาก เครื่องสเปกต่ำก็ลื่น
 * สไปรต์ทั้งหมดวาดด้วยโค้ดทีละพิกเซล (ไม่มีไฟล์ภาพ) แล้วเก็บเป็นแคนวาสเล็ก ๆ ไว้ใช้ซ้ำ
 * คนดู = ฮีโร่ในขบวน (TH.slots: ตำแหน่งบนจอคูณ 6 จากพิกัดพิกเซล) → หน้าเวทีวางป้ายชื่อ/ฟองคำพูดให้ ส่วนตัวละครวาดบนแคนวาส
 */
(() => {
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const meta = () => window.__stage?.api?.meta || {};
  const hud = () => meta().hud || {};
  const W = 180;
  const H = 320;
  const K = 6; // 180x320 → 1080x1920
  const G0 = 205; // ระดับพื้น
  const O = '#1b1426';
  const hsh = (s) => {
    let h = 2166136261;
    for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return h >>> 0;
  };
  const CLS = ['sword', 'mage', 'archer', 'cleric']; // ต้องตรงกับ classOf() ใน advtheme.js
  const classOf = (id) => CLS[hsh(id) % 4];
  const rnd = (seed) => {
    let s = seed % 2147483647 || 7;
    return () => ((s = (s * 16807) % 2147483647) / 2147483647);
  };

  // ================================================================ ตัววาดพิกเซล (ทุกอย่างลงพิกัดจำนวนเต็ม ไม่มีขอบเบลอ)
  function P(w, h) {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const c = cv.getContext('2d');
    const p = {
      cv, c, w, h,
      px(x, y, col) {
        c.fillStyle = col;
        c.fillRect(Math.round(x), Math.round(y), 1, 1);
      },
      rect(x, y, ww, hh, col) {
        if (ww <= 0 || hh <= 0) return;
        c.fillStyle = col;
        c.fillRect(Math.round(x), Math.round(y), Math.round(ww), Math.round(hh));
      },
      orect(x, y, ww, hh, col, o = O) {
        p.rect(x, y, ww, hh, o);
        p.rect(x + 1, y + 1, ww - 2, hh - 2, col);
      },
      // เติมรูปหลายเหลี่ยมแบบสแกนทีละแถว (คมทุกพิกเซล)
      poly(pts, col) {
        c.fillStyle = col;
        const ys = pts.map((q) => q[1]);
        const y0 = Math.floor(Math.min(...ys));
        const y1 = Math.ceil(Math.max(...ys));
        for (let y = y0; y <= y1; y++) {
          const yy = y + 0.5;
          const xs = [];
          for (let i = 0; i < pts.length; i++) {
            const [ax, ay] = pts[i];
            const [bx, by] = pts[(i + 1) % pts.length];
            if ((ay <= yy && by > yy) || (by <= yy && ay > yy)) xs.push(ax + ((yy - ay) / (by - ay)) * (bx - ax));
          }
          xs.sort((a, b) => a - b);
          for (let i = 0; i + 1 < xs.length; i += 2) {
            const a = Math.round(xs[i]);
            const b = Math.round(xs[i + 1]);
            if (b > a) c.fillRect(a, y, b - a, 1);
          }
        }
      },
      ell(cx, cy, rx, ry, col) {
        c.fillStyle = col;
        for (let y = -ry; y <= ry; y++) {
          const w2 = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry + 0.01))));
          if (w2 > 0) c.fillRect(Math.round(cx - w2), Math.round(cy + y), w2 * 2, 1);
        }
      },
      line(x0, y0, x1, y1, col) {
        x0 = Math.round(x0);
        y0 = Math.round(y0);
        x1 = Math.round(x1);
        y1 = Math.round(y1);
        const dx = Math.abs(x1 - x0);
        const dy = -Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let e = dx + dy;
        c.fillStyle = col;
        for (;;) {
          c.fillRect(x0, y0, 1, 1);
          if (x0 === x1 && y0 === y1) break;
          const e2 = 2 * e;
          if (e2 >= dy) (e += dy), (x0 += sx);
          if (e2 <= dx) (e += dx), (y0 += sy);
        }
      },
      // ไล่สีแบบตาราง dither (สไตล์เกม 16-bit)
      dither(y0, y1, c1, c2, x0 = 0, x1 = w) {
        const B = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
        for (let y = y0; y < y1; y++) {
          const t = (y - y0 + 0.5) / Math.max(1, y1 - y0);
          for (let x = x0; x < x1; x++) p.px(x, y, t > (B[y % 4][x % 4] + 0.5) / 16 ? c2 : c1);
        }
      },
      bands(y0, cols, hb) {
        let y = y0;
        for (let i = 0; i < cols.length - 1; i++) {
          p.dither(y, y + hb, cols[i], cols[i + 1]);
          y += hb;
        }
        return y;
      },
      grid(rows, x, y, pal, flip = false) {
        rows.forEach((row, r) => {
          const n = row.length;
          for (let i = 0; i < n; i++) {
            const ch = row[i];
            if (ch === '.') continue;
            const col = ch === 'o' ? O : pal[ch];
            if (col) p.px(x + (flip ? n - 1 - i : i), y + r, col);
          }
        });
      },
    };
    return p;
  }
  // สำเนาสีขาวล้วน (กะพริบตอนโดนตี)
  function whiteOf(cv) {
    const w = document.createElement('canvas');
    w.width = cv.width;
    w.height = cv.height;
    const c = w.getContext('2d');
    c.drawImage(cv, 0, 0);
    c.globalCompositeOperation = 'source-in';
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, w.width, w.height);
    return w;
  }
  function flipOf(cv) {
    const w = document.createElement('canvas');
    w.width = cv.width;
    w.height = cv.height;
    const c = w.getContext('2d');
    c.scale(-1, 1);
    c.drawImage(cv, -cv.width, 0);
    return w;
  }

  // ================================================================ ฮีโร่ (12x15 หันขวา)
  const HERO = ['...oooooo...', '..ohhhhhhho.', '.ohhhhhhhhho', '.ohhsssssho.', '.ohsesssesho', '.ohsssssssho', '..ossppsssso', '..occccccco.', '.oscccccccso', '.oscdcccdcso', '..occccccco.', '..odddddddo.'];
  const LEGS = [
    ['..odd...ddo.', '..obb...bbo.', '..ooo...ooo.'],
    ['..odd..ddo..', '.obb...obbo.', '.ooo....ooo.'],
    ['...odd.ddo..', '..obbo.bbo..', '..ooo..ooo..'],
  ];
  const CLASS_COL = { sword: ['#3b6fd8', '#24408a'], mage: ['#8a3fd1', '#5a2a8f'], archer: ['#3f9a4a', '#26663a'], cleric: ['#f2efe6', '#e9e2cf'] };
  const SKIN = ['#f6d2b0', '#f1c7a0', '#e0ac85', '#c98e66'];
  const HAIR = ['#2a1f1a', '#5a3a22', '#c8642a', '#f2d16b', '#3a2a5e', '#e8e8f0'];
  const HX = 6; // ระยะขอบในแคนวาสฮีโร่ (ให้อาวุธ/หมวก/มงกุฎล้นตัวได้)
  const HY = 9;
  const heroCache = new Map();
  function heroSprite(cls, skin, hair, frame, act, crown, tier = 0, back = '', head = '') {
    const key = [cls, skin, hair, frame, act || '', crown ? 1 : 0, tier, back, head].join('|');
    let s = heroCache.get(key);
    if (s) return s;
    const p = P(26, 26);
    const x = HX;
    const y = HY;
    const fx = (i) => x + i;
    const [cc, dd] = CLASS_COL[cls];
    const gold = tier >= 1; // ร่าง 2 ขึ้นไป: อาวุธทอง
    // ของด้านหลัง (วาดก่อนตัว)
    if (back === 'cape') {
      for (let r = 7; r < 15; r++) {
        const w = 2 + Math.floor((r - 7) / 3);
        for (let i = 0; i < w; i++) p.px(fx(1 - i), y + r, i === w - 1 ? O : r % 3 ? '#c8323a' : '#9a1f2a');
      }
    } else if (back === 'wings') {
      for (const [a, b, w] of [[-1, 5, 3], [-2, 6, 4], [-3, 7, 5], [-4, 8, 5], [-4, 9, 4], [-3, 10, 3], [-2, 11, 2]]) {
        for (let i = 0; i < w; i++) p.px(fx(a + i), y + b, i === 0 ? O : (b + i) % 3 ? '#ffffff' : '#cfe8ff');
      }
    }
    p.grid([...HERO, ...LEGS[frame % 3]], x, y, { h: hair, s: skin, e: O, p: '#ff9aa8', c: cc, d: tier >= 2 && cls !== 'cleric' ? '#e0a81e' : dd, b: '#5a3a2a' });
    if (cls === 'cleric') for (const r of [8, 9, 10]) p.px(fx(6), y + r, '#d9a43a');
    if (tier >= 2) {
      // ร่าง 3 ขึ้นไป: เกราะไหล่ทอง + เข็มขัดทอง
      for (const i of [1, 2, 9, 10]) p.px(fx(i), y + 7, '#ffd166');
      for (let i = 3; i < 9; i++) p.px(fx(i), y + 10, '#ffd166');
    }
    const hatOff = head === 'helm' || head === 'gcrown';
    if (cls === 'mage' && !hatOff) {
      for (let r = 0; r < 6; r++) {
        const w = 1 + r * 2;
        for (let i = 0; i < w; i++) p.px(fx(6 - r + i + (r < 2 ? 1 : 0)), y - 5 + r, i === 0 || i === w - 1 ? O : dd);
      }
      for (let i = 0; i < 12; i++) p.px(fx(i), y + 1, i === 0 || i === 11 ? O : dd);
      p.px(fx(7), y - 5, '#ffd166');
    }
    if (cls === 'archer' && !hatOff) {
      for (let i = 2; i < 10; i++) p.px(fx(i), y, dd);
      for (let i = 1; i < 11; i++) p.px(fx(i), y + 1, dd);
      p.px(fx(1), y + 2, dd);
      p.px(fx(10), y + 2, dd);
    }
    const lift = act === 'cast' ? -3 : 0;
    if (cls === 'sword') {
      if (act === 'attack') {
        for (let i = 0; i < 7; i++) p.px(fx(11 + i), y + 8 - i, '#e8eef5'), p.px(fx(11 + i), y + 9 - i, '#9aa6b8');
        p.px(fx(11), y + 9, '#d9a43a');
      } else {
        for (let r = 1; r < 8; r++) p.px(fx(11), y + r + lift, gold ? '#fff3c4' : '#e8eef5'), p.px(fx(12), y + r + lift, gold ? '#e0a81e' : '#9aa6b8');
        for (const i of [10, 11, 12, 13]) p.px(fx(i), y + 8 + lift, '#d9a43a');
        p.px(fx(11), y + 9 + lift, '#7a4a2a');
      }
    } else if (cls === 'mage') {
      const l = act ? -3 : 0;
      for (let r = 2; r < 14; r++) p.px(fx(12), y + r + l, '#7a4a2a');
      for (const [a, b] of [[11, 0], [12, 0], [13, 0], [12, -1], [12, 1]]) p.px(fx(a), y + b + l, gold ? '#ff6bd5' : '#5fe0ff');
      p.px(fx(12), y + l, '#ffffff');
    } else if (cls === 'archer') {
      for (const [a, b] of [[11, 3], [12, 4], [13, 5], [13, 6], [13, 7], [13, 8], [13, 9], [12, 10], [11, 11]]) p.px(fx(a), y + b, gold ? '#e0a81e' : '#9a5a2a');
      for (let b = 4; b < 11; b++) p.px(fx(act === 'attack' ? 9 : 11), y + b, '#d8d8e0');
      if (act === 'attack') for (let i = 0; i < 4; i++) p.px(fx(10 + i), y + 7, '#d8d8e0');
    } else {
      const l = act ? -3 : 0;
      for (let r = 3; r < 14; r++) p.px(fx(12), y + r + l, '#c8963a');
      for (const [a, b] of [[12, 0], [11, 1], [12, 1], [13, 1], [12, 2]]) p.px(fx(a), y + b + l, gold ? '#ffffff' : '#ffe066');
    }
    // ของบนหัว
    if (head === 'helm') {
      for (let i = 2; i < 10; i++) p.px(fx(i), y - 1, i === 2 || i === 9 ? O : '#9aa6b8');
      for (let i = 1; i < 11; i++) p.px(fx(i), y, i === 1 || i === 10 ? O : '#c8d0dc');
      for (let i = 1; i < 11; i++) p.px(fx(i), y + 1, i === 1 || i === 10 ? O : '#9aa6b8');
      for (let i = 1; i < 11; i++) p.px(fx(i), y + 2, i % 2 ? '#6b7280' : '#9aa6b8');
      p.px(fx(5), y - 2, '#e8453c');
      p.px(fx(6), y - 2, '#e8453c');
    } else if (head === 'band') {
      for (let i = 1; i < 11; i++) p.px(fx(i), y + 2, '#e8453c');
      p.px(fx(0), y + 3, '#e8453c');
      p.px(fx(-1), y + 4, '#e8453c');
      p.px(fx(0), y + 4, '#9a1f2a');
    } else if (head === 'gcrown') {
      for (const i of [2, 4, 6, 8, 10]) p.px(fx(i), y - 3, '#ffd166');
      for (let i = 2; i < 11; i++) p.px(fx(i), y - 2, '#ffd166'), p.px(fx(i), y - 1, '#e0a81e');
      p.px(fx(4), y - 2, '#5fe0ff');
      p.px(fx(8), y - 2, '#e8453c');
    }
    if (crown && head !== 'gcrown') {
      const cy = cls === 'mage' && !hatOff ? y - 8 : head === 'helm' ? y - 5 : y - 3;
      for (const i of [3, 5, 7, 9]) p.px(fx(i), cy, '#ffd166');
      for (let i = 3; i < 10; i++) p.px(fx(i), cy + 1, '#ffd166'), p.px(fx(i), cy + 2, '#e0a81e');
      p.px(fx(6), cy + 1, '#e8453c');
    }
    s = p.cv;
    heroCache.set(key, s);
    return s;
  }

  // ================================================================ มอนสเตอร์
  const GRIDS = {
    slime: ['....oooo....', '..oo2222oo..', '.o22211222o.', '.o22222222o.', 'o2222222222o', 'o22e2222e22o', 'o2222ee2222o', 'o3333333333o', '.oooooooooo.'],
    shroom: ['...oooooo...', '.oo4444444o.', 'o44w444w444o', 'o4www444w44o', 'o4444444444o', '.oooooooooo.', '..o5555555o.', '..o5e555e5o.', '..o5555555o.', '..o55o.o55o.', '..ooo...ooo.'],
    bat: ['oo.........oo', 'o2o..o.o..o2o', 'o22ooo2ooo22o', 'o222o2e2e222o', '.o2222222222o', '..o2o.o2o.o2o', '...o...o...o.'],
    spider: ['....oooooo....', '...o222222o...', 'o.o22e22e22o.o', '.oo22222222oo.', 'o.o22111122o.o', '.o.o222222o.o.', 'o...oooooo...o'],
    skeleton: ['...oooooo...', '..owwwwwwo..', '.owwwwwwwwo.', '.owoowwoowo.', '.owoowwoowo.', '..owwwwwwo..', '...owowowo..', '....oooo....', '..oowwwwoo..', '.ow.owwo.wo.', '.ow.owwo.wo.', '....owwo....', '...ow..wo...', '...ow..wo...', '..ooo..ooo..'],
    wisp: ['....oo....', '...o33o...', '..o3223o..', '.o322223o.', '.o221122o.', 'o22e11e22o', 'o22111122o', 'o22111122o', '.o222222o.', '..o2222o..', '.o2o22o2o.', '..o.oo.o..'],
  };
  const PET = ['.oooo.', 'o2222o', '2e22e2', 'o2222o', '.oooo.'];
  let petCv = null;
  const petSprite = () => {
    if (petCv) return petCv;
    const p = P(6, 5);
    p.grid(PET, 0, 0, { 2: '#ff8fab', e: O }, false);
    petCv = p.cv;
    return petCv;
  };
  function tintOf(cv, col) {
    const w = whiteOf(cv);
    const c = w.getContext('2d');
    c.globalCompositeOperation = 'source-in';
    c.fillStyle = col;
    c.fillRect(0, 0, w.width, w.height);
    return w;
  }
  const MOBS = {
    gslime: { g: 'slime', pal: { 2: '#ffd166', 1: '#fff8d8', 3: '#e0a81e', e: O } },
    slime: { g: 'slime', pal: { 2: '#5fd068', 1: '#c8f7c0', 3: '#2f9e44', e: O } },
    cslime: { g: 'slime', pal: { 2: '#5fc8ff', 1: '#e0fbff', 3: '#3a7ad8', e: O } },
    shroom: { g: 'shroom', pal: { 4: '#e8453c', w: '#fff3e0', 5: '#f6e2c0', e: O } },
    pshroom: { g: 'shroom', pal: { 4: '#7a3fd1', w: '#d8c8ff', 5: '#c8b8e0', e: '#ffd166' } },
    bat: { g: 'bat', pal: { 2: '#7a4ab8', e: '#ffd166' }, fly: true },
    spider: { g: 'spider', pal: { 2: '#4a3c74', 1: '#5fe0ff', e: '#ff4a4a' } },
    skeleton: { g: 'skeleton', pal: { w: '#e8e4d8' } },
    wisp: { g: 'wisp', pal: { 2: '#5fe0ff', 1: '#e0fbff', 3: '#b28cff', e: O }, fly: true },
  };
  const mobCache = new Map();
  function mobSprite(kind) {
    let s = mobCache.get(kind);
    if (s) return s;
    const m = MOBS[kind] || MOBS.slime;
    const g = GRIDS[m.g];
    const p = P(g[0].length, g.length);
    p.grid(g, 0, 0, m.pal, true); // หันซ้าย (เข้าหาปาร์ตี้)
    s = { cv: p.cv, white: whiteOf(p.cv), fly: !!m.fly };
    mobCache.set(kind, s);
    return s;
  }

  // ================================================================ บอสประจำขั้น (วาดหันซ้าย)
  function drawGolem(p, x, y, seed) {
    const R = rnd(seed);
    const st = '#6b6f80';
    const sd = '#464a5a';
    const sl = '#9aa0b3';
    const blk = (a, b, w, h, c = st) => {
      p.orect(x + a, y + b, w, h, c);
      p.rect(x + a + 1, y + b + 1, w - 2, 2, sl);
      p.rect(x + a + 1, y + b + h - 3, w - 2, 2, sd);
      for (let i = 0; i < (w * h) / 18; i++) p.px(x + a + 2 + Math.floor(R() * Math.max(1, w - 4)), y + b + 3 + Math.floor(R() * Math.max(1, h - 6)), R() < 0.5 ? sd : sl);
    };
    blk(26, 70, 18, 26);
    blk(54, 70, 18, 26);
    blk(20, 26, 58, 48);
    for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) if (dx * dx + dy * dy <= 36 && (dx + dy) % 2 === 0) p.px(x + 49 + dx, y + 45 + dy, '#ff9a4a');
    p.rect(x + 46, y + 42, 6, 6, '#ffd166');
    p.rect(x + 47, y + 43, 4, 4, '#fff3c4');
    blk(4, 24, 22, 20);
    blk(72, 24, 22, 20);
    blk(2, 44, 18, 30);
    blk(78, 44, 18, 30);
    blk(0, 72, 22, 16, '#5c6070');
    blk(76, 72, 22, 16, '#5c6070');
    for (const [a, b] of [[6, 23], [10, 22], [14, 23], [76, 23], [80, 22], [86, 23]]) p.rect(x + a, y + b, 5, 2, '#5fd068'), p.px(x + a + 1, y + b + 2, '#3f9a4a');
    blk(34, 4, 30, 24);
    p.rect(x + 39, y + 14, 7, 4, O);
    p.rect(x + 52, y + 14, 7, 4, O);
    p.rect(x + 40, y + 15, 5, 2, '#ffb347');
    p.rect(x + 53, y + 15, 5, 2, '#ffb347');
    p.px(x + 41, y + 15, '#fff3c4');
    p.px(x + 54, y + 15, '#fff3c4');
    p.rect(x + 43, y + 22, 12, 2, O);
    for (const i of [44, 47, 50, 53]) p.px(x + i, y + 22, '#ffb347');
    for (const [a, h] of [[36, 6], [42, 9], [49, 11], [56, 9], [62, 6]]) {
      p.rect(x + a - 1, y + 4 - h, 3, h, '#ffd166');
      p.px(x + a, y + 3 - h, '#e0a81e');
    }
    p.rect(x + 34, y + 2, 31, 3, '#e0a81e');
    p.px(x + 49, y + 1, '#e8453c');
  }
  function drawShroomKing(p, x, y) {
    // ราชาเห็ดยักษ์: หมวกแดงจุดขาว หน้าโกรธ แขนสั้น ถือคทาไม้ยอดใบไม้
    p.rect(x + 26, y + 84, 14, 8, O);
    p.rect(x + 54, y + 84, 14, 8, O);
    p.rect(x + 27, y + 84, 12, 7, '#d8c09a');
    p.rect(x + 55, y + 84, 12, 7, '#d8c09a');
    for (let i = 0; i < 46; i++) p.rect(x + 8, y + 38 + i, 3, 1, i % 6 ? '#7a4a2a' : '#5a3420');
    p.ell(x + 9, y + 36, 5, 5, '#2f9e44');
    p.ell(x + 9, y + 36, 3, 3, '#5fd068');
    p.ell(x + 47, y + 64, 26, 24, O);
    p.ell(x + 47, y + 64, 25, 23, '#f6e2c0');
    p.ell(x + 47, y + 74, 21, 12, '#ead2aa');
    p.ell(x + 16, y + 66, 7, 5, O);
    p.ell(x + 16, y + 66, 6, 4, '#f6e2c0');
    p.ell(x + 78, y + 66, 7, 5, O);
    p.ell(x + 78, y + 66, 6, 4, '#f6e2c0');
    p.rect(x + 34, y + 54, 9, 7, O);
    p.rect(x + 52, y + 54, 9, 7, O);
    p.rect(x + 35, y + 55, 7, 5, '#ffffff');
    p.rect(x + 53, y + 55, 7, 5, '#ffffff');
    p.rect(x + 35, y + 57, 3, 3, O);
    p.rect(x + 53, y + 57, 3, 3, O);
    p.line(x + 32, y + 50, x + 43, y + 53, O);
    p.line(x + 32, y + 51, x + 43, y + 54, O);
    p.line(x + 63, y + 50, x + 52, y + 53, O);
    p.line(x + 63, y + 51, x + 52, y + 54, O);
    p.rect(x + 40, y + 67, 15, 7, O);
    p.rect(x + 41, y + 68, 13, 5, '#8a2a2a');
    for (const i of [42, 46, 50]) p.rect(x + i, y + 68, 2, 2, '#ffffff');
    // หมวก = ครึ่งวงรีด้านบน
    const cap = (rx, ry, col) => {
      const pts = [];
      for (let k = 0; k <= 32; k++) {
        const a = Math.PI + (k / 32) * Math.PI;
        pts.push([x + 47 + Math.cos(a) * rx, y + 46 + Math.sin(a) * ry]);
      }
      p.poly(pts, col);
    };
    cap(47, 40, O);
    cap(46, 39, '#e8453c');
    cap(38, 30, '#ff6b5a');
    p.rect(x + 1, y + 44, 93, 3, O);
    p.rect(x + 3, y + 42, 89, 2, '#b5303a');
    for (const [a, b, r] of [[22, 30, 6], [47, 18, 7], [72, 30, 6], [34, 38, 4], [60, 38, 4], [10, 38, 3], [84, 38, 3]]) {
      p.ell(x + a, y + b, r + 1, r, O);
      p.ell(x + a, y + b, r, r - 1, '#fff3e0');
    }
    for (const [a, h] of [[37, 7], [42, 10], [47, 12], [52, 10], [57, 7]]) {
      p.rect(x + a - 1, y + 8 - h, 3, h, '#ffd166');
      p.px(x + a, y + 7 - h, '#e0a81e');
    }
    p.rect(x + 35, y + 6, 25, 3, '#e0a81e');
    p.px(x + 47, y + 5, '#5fe0ff');
  }
  function drawSpiderQueen(p, x, y) {
    // ราชินีแมงมุมคริสตัล: ท้องใหญ่มีคริสตัล ตาแดง 6 ดวง ขา 8 ขา
    const legs = [[30, 52, 6, 30, 0, 74], [36, 54, 14, 26, 10, 80], [58, 54, 70, 26, 82, 80], [64, 52, 80, 30, 94, 74], [26, 58, 4, 52, -2, 86], [70, 58, 92, 52, 98, 86], [40, 58, 26, 66, 22, 88], [56, 58, 70, 66, 74, 88]];
    for (const [ax, ay, bx, by, cx, cy] of legs) {
      for (const o of [0, 1]) {
        p.line(x + ax, y + ay + o, x + bx, y + by + o, O);
        p.line(x + bx, y + by + o, x + cx, y + cy + o, O);
      }
      p.line(x + ax, y + ay - 1, x + bx, y + by - 1, '#3a2e5e');
      p.line(x + bx, y + by - 1, x + cx, y + cy - 1, '#3a2e5e');
      p.px(x + bx, y + by - 2, '#5fe0ff');
    }
    p.ell(x + 62, y + 40, 30, 24, O);
    p.ell(x + 62, y + 40, 29, 23, '#3a2e5e');
    p.ell(x + 62, y + 36, 24, 15, '#4a3c74');
    for (const [a, b, h] of [[50, 26, 14], [60, 20, 18], [70, 24, 14], [78, 32, 10], [44, 34, 9]]) {
      p.poly([[x + a - 4, y + b + 6], [x + a, y + b - h + 6], [x + a + 4, y + b + 6]], O);
      p.poly([[x + a - 3, y + b + 5], [x + a, y + b - h + 7], [x + a + 3, y + b + 5]], '#5fe0ff');
      p.line(x + a, y + b - h + 8, x + a, y + b + 4, '#e0fbff');
    }
    p.ell(x + 30, y + 54, 17, 13, O);
    p.ell(x + 30, y + 54, 16, 12, '#4a3c74');
    for (const [a, b] of [[22, 50], [29, 48], [36, 50], [24, 56], [34, 56]]) p.rect(x + a, y + b, 3, 3, '#ff4a4a'), p.px(x + a, y + b, '#ffd0d0');
    p.rect(x + 22, y + 62, 3, 6, '#e0fbff');
    p.rect(x + 34, y + 62, 3, 6, '#e0fbff');
    for (const [a, h] of [[22, 5], [26, 8], [30, 10], [34, 8], [38, 5]]) {
      p.rect(x + a - 1, y + 42 - h, 3, h, '#ffd166');
      p.px(x + a, y + 41 - h, '#e0a81e');
    }
    p.rect(x + 20, y + 41, 21, 2, '#e0a81e');
  }
  const BOSS = {
    shroomking: { w: 96, h: 94, draw: (p) => drawShroomKing(p, 0, 2) },
    spiderqueen: { w: 100, h: 92, draw: (p) => drawSpiderQueen(p, 0, 4) },
    golem: { w: 98, h: 98, draw: (p) => drawGolem(p, 0, 2, 3) },
  };
  const bossCache = new Map();
  function bossSprite(kind) {
    let s = bossCache.get(kind);
    if (s) return s;
    const b = BOSS[kind] || BOSS.golem;
    const p = P(b.w, b.h);
    b.draw(p);
    s = { cv: p.cv, white: whiteOf(p.cv), red: tintOf(p.cv, '#ff3a3a'), w: b.w, h: b.h };
    bossCache.set(kind, s);
    return s;
  }

  // ================================================================ ตัวช่วยจากของขวัญ
  let wolfCv = null;
  function wolfSprite() {
    if (wolfCv) return wolfCv;
    const p = P(22, 14);
    const c = '#c8d0dc';
    const d = '#8a94a8';
    p.poly([[0, 5], [5, 7], [4, 9], [0, 8]], O);
    p.poly([[1, 6], [5, 8], [1, 8]], d);
    p.orect(3, 5, 12, 6, c);
    p.rect(4, 9, 10, 1, d);
    p.orect(13, 2, 7, 6, c);
    p.orect(18, 4, 4, 3, c);
    p.px(19, 6, O);
    p.px(16, 4, '#5fe0ff');
    p.poly([[13, 3], [14, 0], [16, 3]], O);
    p.poly([[16, 3], [17, 0], [19, 3]], O);
    for (const lx of [4, 7, 11, 13]) p.rect(lx, 10, 2, 4, O), p.rect(lx, 10, 1, 3, d);
    wolfCv = p.cv;
    return wolfCv;
  }
  let dragonCv = null;
  function dragonSprite() {
    if (dragonCv) return dragonCv;
    const p = P(72, 46);
    const b1 = '#e0a81e';
    const b2 = '#b07a12';
    p.poly([[18, 22], [30, 0], [44, 4], [38, 22]], O);
    p.poly([[20, 21], [30, 2], [42, 5], [36, 21]], '#9a1f2a');
    p.poly([[0, 30], [10, 26], [22, 24], [20, 28], [8, 32]], O);
    p.poly([[2, 30], [10, 27], [21, 25], [19, 28], [8, 31]], b2);
    p.poly([[0, 27], [4, 30], [0, 33]], '#e8453c');
    p.ell(33, 28, 17, 8, O);
    p.ell(33, 28, 16, 7, b1);
    p.ell(34, 31, 12, 4, '#ffe066');
    p.poly([[44, 26], [52, 14], [58, 16], [50, 28]], O);
    p.poly([[45, 26], [52, 15], [57, 17], [49, 27]], b1);
    p.orect(52, 9, 14, 10, b1);
    p.orect(62, 13, 9, 6, b1);
    p.rect(63, 16, 7, 2, b2);
    p.px(59, 12, O);
    p.px(60, 12, '#ffffff');
    p.poly([[53, 9], [51, 3], [56, 9]], '#fff3c4');
    p.poly([[57, 9], [57, 2], [60, 9]], '#fff3c4');
    for (const a of [28, 34, 40]) p.poly([[a, 22], [a + 2, 18], [a + 4, 22]], '#e8453c');
    p.poly([[24, 26], [34, 4], [50, 2], [42, 26]], O);
    p.poly([[26, 25], [35, 6], [48, 4], [41, 25]], '#e8453c');
    for (let i = 0; i < 3; i++) p.line(36 + i * 4, 6 - i, 30 + i * 4, 24, '#9a1f2a');
    p.rect(24, 35, 3, 4, b2);
    p.rect(38, 35, 3, 4, b2);
    dragonCv = p.cv;
    return dragonCv;
  }
  let chestCv = null;
  let chestOpenCv = null;
  function chestOpenSprite() {
    if (chestOpenCv) return chestOpenCv;
    const p = P(14, 16);
    p.orect(0, 0, 14, 5, '#c8803a');
    p.rect(1, 1, 12, 2, '#e0a050');
    p.orect(0, 6, 14, 10, '#9a5a2a');
    p.rect(1, 6, 12, 3, '#ffd166');
    p.rect(2, 7, 10, 1, '#fff3c4');
    p.rect(6, 10, 3, 3, '#ffd166');
    chestOpenCv = p.cv;
    return chestOpenCv;
  }
  function chestSprite() {
    if (chestCv) return chestCv;
    const p = P(14, 10);
    p.orect(0, 0, 14, 10, '#9a5a2a');
    p.rect(1, 1, 12, 3, '#c8803a');
    p.rect(1, 4, 12, 1, O);
    p.rect(6, 3, 3, 3, '#ffd166');
    chestCv = p.cv;
    return chestCv;
  }

  // ================================================================ ฉากหลัง 3 ขั้น: back (นิ่ง) + front (กว้าง 360 เลื่อนตอนเดิน)
  const FW = 360;
  function wrapDraw(fn, x) {
    fn(x);
    if (x < 20) fn(x + FW);
    if (x > FW - 20) fn(x - FW);
  }
  function bgForest() {
    const R = rnd(11);
    const b = P(W, H);
    const cols = ['#1d1640', '#2b1d55', '#4a2a6a', '#7a3b74', '#b5536b', '#e07a5f', '#f2a65a'];
    b.bands(0, cols, Math.floor(G0 / 6) + 1);
    for (let i = 0; i < 30; i++) b.px(Math.floor(R() * W), Math.floor(R() * 70), ['#ffffff', '#ffe9b0', '#a8c8ff'][i % 3]);
    for (let dy = -13; dy <= 13; dy++) for (let dx = -13; dx <= 13; dx++) if (dx * dx + dy * dy <= 169) b.px(132 + dx, G0 - 66 + dy, dy < 4 || dy % 3 ? '#ffd27a' : '#f2a65a');
    let pts = [[0, G0 - 40]];
    for (let x = 0; x < W + 26; x += 26) pts.push([x + 13, G0 - 92 + R() * 22], [x + 26, G0 - 58 + R() * 10]);
    b.poly([...pts, [W, G0], [0, G0]], '#4a2c62');
    pts = [[0, G0 - 30]];
    for (let x = 0; x < W + 18; x += 18) pts.push([x + 9, G0 - 70 + R() * 18], [x + 18, G0 - 46 + R() * 8]);
    b.poly([...pts, [W, G0], [0, G0]], '#33244e');
    const f = P(FW, H);
    const pine = (x, base, h, c1, c2) => {
      f.rect(x - 1, base - 4, 3, 5, '#2a1a14');
      for (let i = 0; i < h; i++) {
        const w = 1 + (i % 6) + Math.floor(i / 3);
        const yy = base - 4 - h + i;
        f.rect(x - Math.floor(w / 2), yy, w, 1, c1);
        f.px(x - Math.floor(w / 2), yy, c2);
      }
    };
    for (let x = 0; x < FW; x += 9) {
      const xx = x + Math.floor(R() * 5);
      const h = 20 + Math.floor(R() * 12);
      wrapDraw((q) => pine(q, G0 - 8, h, '#1d3a3c', '#2c5050'), xx);
    }
    for (let x = 0; x < FW; x += 15) {
      const xx = x + Math.floor(R() * 7);
      const h = 28 + Math.floor(R() * 16);
      wrapDraw((q) => pine(q, G0 + 1, h, '#173226', '#2c5a3c'), xx);
    }
    f.rect(0, G0, FW, 4, '#5fd068');
    f.rect(0, G0 + 4, FW, 3, '#3f9a4a');
    for (let x = 0; x < FW; x += 3) {
      if (R() < 0.6) f.px(x, G0 - 1, '#5fd068');
      if (R() < 0.2) f.px(x, G0 - 2, '#8ee88a');
    }
    f.dither(G0 + 7, G0 + 22, '#8a5a3a', '#7a4c30');
    f.dither(G0 + 22, H, '#7a4c30', '#4a2e22');
    for (let i = 0; i < 100; i++) {
      const sx = Math.floor(R() * FW);
      const sy = G0 + 10 + Math.floor(R() * (H - G0 - 10));
      f.px(sx, sy, '#a0704a');
      f.px((sx + 1) % FW, sy, '#5a3a28');
    }
    for (let i = 0; i < 28; i++) f.px(Math.floor(R() * FW), G0 + 1 + Math.floor(R() * 4), ['#ff8fab', '#ffd166', '#ffffff'][i % 3]);
    return { back: b.cv, front: f.cv, torches: [] };
  }
  function bgCave() {
    const R = rnd(9);
    const b = P(W, H);
    b.bands(0, ['#0e0b1a', '#151027', '#1c1534', '#231a40'], Math.floor(G0 / 3) + 1);
    b.rect(0, G0, W, H - G0, '#231a40');
    for (let x = 0; x < W; x += 10) {
      const h = 8 + Math.floor(R() * 30);
      for (let i = 0; i < h; i++) {
        const w = Math.max(1, 7 - Math.floor((i * 7) / h));
        b.rect(x + 5 - Math.floor(w / 2), i, w, 1, i < h - 2 ? '#2e2448' : '#3c3060');
      }
    }
    const f = P(FW, H);
    for (let x = -10; x < FW; x += 34) {
      const h = 20 + Math.floor(R() * 40);
      wrapDraw((q) => {
        for (let i = 0; i < h; i++) {
          const w = 2 + Math.floor((i * 14) / h);
          f.rect(q + 17 - Math.floor(w / 2), G0 - h + i, w, 1, i % 7 ? '#3a2e5e' : '#4a3c74');
        }
      }, x);
    }
    for (let i = 0; i < 90; i++) {
      const cx = Math.floor(R() * FW);
      const cy = 50 + Math.floor(R() * (G0 - 50));
      const col = ['#5fe0ff', '#b28cff', '#7dff8a'][i % 3];
      for (let k = 0; k < 5; k++) f.px(cx, cy - k, col);
      f.px(cx - 1, cy - 1, col);
      f.px(cx + 1, cy - 2, col);
    }
    f.rect(0, G0, FW, 3, '#5a4a7a');
    f.dither(G0 + 3, H, '#3a2e58', '#1c1530');
    for (let i = 0; i < 80; i++) f.px(Math.floor(R() * FW), G0 + 5 + Math.floor(R() * (H - G0 - 5)), '#4c3e70');
    return { back: b.cv, front: f.cv, torches: [] };
  }
  function bgCastle() {
    const R = rnd(23);
    const b = P(W, H);
    b.rect(0, 0, W, H, '#2a2238');
    const f = P(FW, H);
    for (let row = 0; row < G0; row += 9) {
      const off = (row / 9) % 2 ? 0 : 9;
      for (let x = -18; x < FW; x += 18) {
        f.rect(x + off + 1, row + 1, 16, 7, ['#3a3050', '#352c4a', '#40365a'][Math.floor(R() * 3)]);
        f.px(x + off + 2, row + 2, '#4c4268');
      }
    }
    for (const wx of [49, 229]) {
      const wy = 44;
      f.rect(wx - 11, wy, 22, 44, O);
      for (let dy = 0; dy < 12; dy++) for (let dx = -11; dx < 11; dx++) if (dx * dx + (dy - 11) ** 2 <= 121) f.px(wx + dx, wy - 11 + dy, O);
      f.dither(wy - 9, wy + 42, '#1a2a5a', '#2a3f7a', wx - 9, wx + 9);
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) if (dx * dx + dy * dy <= 16) f.px(wx + dx + 2, wy + 4 + dy, '#f2efd0');
    }
    for (const px of [8, 140, 278]) {
      f.rect(px - 8, 24, 16, G0 - 24, '#4c4268');
      f.rect(px - 8, 24, 3, G0 - 24, '#5c5280');
      f.rect(px + 5, 24, 3, G0 - 24, '#3a3050');
      f.rect(px - 10, 20, 20, 5, '#5c5280');
    }
    for (const bx of [140]) {
      f.rect(bx - 9, 34, 18, 52, '#9a1f2a');
      f.rect(bx - 9, 34, 18, 3, '#ffd166');
      for (let i = 0; i < 9; i++) f.rect(bx - 9 + i, 86, 1, 1 + Math.floor((8 - i) / 2), '#9a1f2a'), f.rect(bx + 8 - i, 86, 1, 1 + Math.floor((8 - i) / 2), '#9a1f2a');
      for (let dy = 0; dy < 7; dy++) {
        const w = 7 - Math.abs(dy - 3) * 2;
        f.rect(bx - Math.floor(w / 2), 54 + dy, w, 1, '#ffd166');
      }
    }
    const torches = [80, 200, 330];
    for (const tx of torches) f.rect(tx - 1, 112, 3, 10, '#7a4a2a');
    f.rect(0, G0, FW, 3, '#6a5e8a');
    for (let row = G0 + 3; row < H; row += 10) {
      const off = ((row - G0 - 3) / 10) % 2 ? 0 : 10;
      for (let x = -20; x < FW; x += 20) f.rect(x + off + 1, row + 1, 18, 8, ['#3a3050', '#352c4a', '#2e2642'][Math.floor(R() * 3)]);
    }
    f.rect(0, G0 + 6, FW, 14, '#7a1a24');
    f.rect(0, G0 + 6, FW, 1, '#ffd166');
    f.rect(0, G0 + 19, FW, 1, '#ffd166');
    return { back: b.cv, front: f.cv, torches };
  }
  function bgSecret() {
    // ถ้ำลับ: ผนังหินม่วงเข้ม คริสตัลทอง กองสมบัติวิบวับ (ไม่เลื่อน)
    const R = rnd(31);
    const b = P(W, H);
    b.bands(0, ['#120c1e', '#1c1430', '#2a1c3e', '#3a2448'], Math.floor(G0 / 3) + 1);
    for (let x = 0; x < W; x += 9) {
      const h = 10 + Math.floor(R() * 34);
      for (let i = 0; i < h; i++) {
        const w = Math.max(1, 6 - Math.floor((i * 6) / h));
        b.rect(x + 4 - Math.floor(w / 2), i, w, 1, i < h - 2 ? '#2e2246' : '#4a3468');
      }
    }
    // แสงทองจากกองสมบัติ
    for (let dy = -50; dy <= 50; dy++) for (let dx = -70; dx <= 70; dx++) {
      const d = (dx * dx) / 4900 + (dy * dy) / 2500;
      if (d < 1 && (dx + dy) % 2 === 0) b.px(130 + dx, G0 - 10 + dy, d < 0.35 ? '#6a4a3a' : '#4a3048');
    }
    for (let i = 0; i < 40; i++) {
      const cx = Math.floor(R() * W);
      const cy = 40 + Math.floor(R() * (G0 - 50));
      const col = ['#ffd166', '#ffe9a0', '#ff8fab'][i % 3];
      for (let k = 0; k < 4; k++) b.px(cx, cy - k, col);
      b.px(cx - 1, cy - 1, col);
    }
    // กองเหรียญ
    for (let i = 0; i < 260; i++) {
      const a = R() * Math.PI;
      const r = R();
      b.px(Math.round(150 + Math.cos(a) * 26 * r), Math.round(G0 + 2 - Math.sin(a) * 12 * r), R() < 0.5 ? '#ffd166' : '#e0a81e');
    }
    b.rect(0, G0 + 2, W, 3, '#6a5080');
    b.dither(G0 + 5, H, '#3a2a50', '#1a1228');
    for (let i = 0; i < 50; i++) b.px(Math.floor(R() * W), G0 + 6 + Math.floor(R() * (H - G0 - 6)), R() < 0.3 ? '#ffd166' : '#4c3a68');
    return { back: b.cv, front: P(FW, H).cv, torches: [] };
  }
  const BG = { forest: bgForest, cave: bgCave, castle: bgCastle, secret: bgSecret };
  const bgCache = new Map();
  const bgOf = (key) => {
    if (!bgCache.has(key)) bgCache.set(key, (BG[key] || bgForest)());
    return bgCache.get(key);
  };

  // ================================================================ ขบวนปาร์ตี้ (ที่นั่งตายตัว: พิกัดเท้าบนพิกเซล → จอ ×6)
  const FEET = [];
  FEET.push({ x: 92, y: G0 + 44, vip: true }); // ผู้นำทัพ (หน้าสุด)
  for (const [ri, y, x0, n, vip] of [[0, G0 + 44, 79, 6, 2], [1, G0 + 30, 86, 7, 0], [2, G0 + 16, 79, 7, 0], [3, G0 + 4, 86, 7, 0]]) {
    for (let i = 0; i < n; i++) FEET.push({ x: x0 - i * 12, y, vip: i < vip, row: ri });
  }
  const SLOTS = FEET.map((f) => ({ x: f.x * K, y: (f.y - 15) * K, s: 1, vip: f.vip }));
  // เกินที่นั่ง: กองหนุนยืนหลังขบวน (วาดจางลง)
  const ROWS = [{ y: (G0 - 8 - 15) * K, s: 1, n: 10, x0: 14 * K, x1: 90 * K, jy: 6 }];

  window.makeAdventureTheme = function makeAdventureTheme(id) {
    let API = null;
    let el = null;
    let cv = null;
    let ctx = null;
    let lastT = 0;
    let scroll = 0;
    // สถานะจากเซิร์ฟเวอร์
    const S = { stage: 0, stageName: 'ป่าลึก', stageIcon: '🌲', round: 1, wave: 1, waves: 5, phase: 'walk', left: 0, enemy: null, hp: 100, power: 0, powerMax: 300, vote: null, lead: null, top: [], allies: 0 };
    const HEROES = new Map(); // id → { lv, eq: { back, head, pet, aura }, title }
    const tierOf = (lv) => (lv >= 50 ? 3 : lv >= 25 ? 2 : lv >= 10 ? 1 : 0);
    const parseEq = (str) => {
      const [back, head, pet, aura] = String(str || '').split(',');
      return { back: back || '', head: head || '', pet: pet || '', aura: aura || '' };
    };
    const heroInfo = (fid) => HEROES.get(fid) || { lv: 1, eq: {}, title: '' };
    const setHero = (fid, patch) => HEROES.set(fid, { ...heroInfo(fid), ...patch });
    const STG = () => hud().adv?.stages || [{ key: 'forest' }, { key: 'cave' }, { key: 'castle' }];
    // สิ่งที่เคลื่อนไหวบนจอ
    const acts = new Map(); // id → { a: 'attack'|'cast', t }
    const shots = []; // กระสุน/เวท/ลูกศร
    const parts = []; // อนุภาคพิกเซล
    const nums = []; // ตัวเลขดาเมจ (DOM)
    const wolves = [];
    let dragon = null;
    let chest = null;
    const fx = { shake: 0, flash: 0, flashC: '#ffffff', hit: 0, enter: 0, dead: 0, deadKind: null, fade: 0, bossIn: 0, partyHit: 0, retreat: 0, cheer: 0, last: 0 };
    let shownStage = 0;
    let route = null; // { side: 'left'|'right', t, opened }
    let enemyKey = '';
    let lastToast = 0;

    if (window.SceneLevels?.themes) window.SceneLevels.themes[id] = { names: { 2: 'หิ่งห้อย + ดาวตก', 3: 'ออร่าทองรอบปาร์ตี้ + พลุ' }, s2() {}, s3() {} };

    const T = {
      bpm: 132,
      fanH: 1,
      rows: ROWS,
      slots: SLOTS,
      get css() {
        return css();
      },
      fanSvg() {
        return '';
      },
      init(api) {
        API = api;
        el = document.createElement('div');
        el.className = 'adv-hud';
        document.getElementById('ui').appendChild(el);
        cv = document.createElement('canvas');
        cv.id = 'advpx';
        cv.width = W;
        cv.height = H;
        cv.style.cssText = 'position:absolute;left:0;top:0;width:1080px;height:1920px;image-rendering:pixelated;';
        document.getElementById('bg').after(cv);
        ctx = cv.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        render(api);
        // ขอสถานะล่าสุดจากเซิร์ฟเวอร์ (ไม่ต้องรอรอบส่งปกติ)
        try {
          const sk = window.io?.();
          sk?.emit('adv:get', null, (s) => {
            if (s) apply(s);
            sk.disconnect();
          });
        } catch {}
      },
      drawStatic(c) {
        c.fillStyle = '#1b1426';
        c.fillRect(0, 0, 1080, 1920);
      },
      drawBg(_c, t) {
        if (ctx) frame(t / 1000);
      },
      effects: new Proxy({}, {
        get(_o, key) {
          const f = meta().effects?.[key];
          if (!f) return undefined;
          return (user, n, label, api) => gift(f, user, n, label, api);
        },
        has: (_o, key) => !!meta().effects?.[key],
        ownKeys: () => Object.keys(meta().effects || {}),
        getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
      }),
      onEvent(d, api) {
        if (d.type === 'advState') return apply(d);
        if (d.type === 'adv') return onAdv(d, api);
        if (d.type === 'mgNext') return api.toast(`🎮 อีก ${d.left >= 60 ? Math.round(d.left / 60) + ' นาที' : d.left + ' วิ'} เปลี่ยนเป็น ${d.icon} ${d.name}!`, d.left <= 10 ? 'big' : '');
        if (d.type === 'goal') {
          api.toast(`🎯 ${d.key === 'coins' ? 'เพชร' : 'ใจ'}ครบ! → ${d.reward}`, 'big');
          if (d.key === 'coins') summonDragon(api, null);
        }
      },
      onLike(d, api) {
        const p = api.fanPos(d.id);
        api.spawn({ type: 'heart', x: p ? p.x : api.rand(200, 600), y: p ? p.y - 60 : 1300, vy: api.rand(-300, -200), max: 1.6, size: api.rand(12, 18), color: '#ff4fa3', fadeIn: 0.1 });
      },
    };

    // ---------------------------------------------------------------- สถานะ
    function apply(s) {
      const prevPhase = S.phase;
      Object.assign(S, s);
      const pn = performance.now();
      S.deadline = pn + (s.left || 0) * 1000;
      if (s.boost) S.boostDeadline = pn + s.boost.left * 1000;
      if ('charge' in s) S.chargeDeadline = s.charge ? pn + s.charge.left * 1000 : 0;
      if ('stun' in s) S.stunDeadline = pn + (s.stun || 0) * 1000;
      if (!('fame' in s)) S.fame = null;
      if (s.heroes) for (const [k, v] of Object.entries(s.heroes)) setHero(k, { lv: v[0], eq: parseEq(v[1]), title: v[2] || '' });
      const ek = S.enemy ? S.enemy.kind + '|' + S.enemy.max : '';
      if (ek && ek !== enemyKey) {
        fx.enter = 1;
        fx.dead = 0;
      }
      enemyKey = ek;
      if (S.stage !== shownStage) {
        shownStage = S.stage;
        fx.fade = 1;
      }
      if (prevPhase !== 'retreat' && S.phase === 'retreat') fx.retreat = 1;
      renderDyn();
    }
    const enemyBox = () => {
      const e = S.enemy;
      if (!e) return null;
      if (e.boss) {
        const b = bossSprite(e.kind);
        const x = W + 8 - b.w + (fx.enter > 0 ? fx.enter * 90 : 0);
        return { x, y: G0 + 46 - b.h, w: b.w, h: b.h, cx: x + b.w * 0.45, cy: G0 + 46 - b.h * 0.55 };
      }
      return { x: 128, y: G0 + 8, w: 46, h: 36, cx: 150 + (fx.enter > 0 ? fx.enter * 60 : 0), cy: G0 + 24 };
    };
    const heroAt = (fid) => {
      const f = API?.fans?.get(fid);
      if (!f?.slot) return null;
      return { x: f.slot.x / K, y: f.slot.y / K + 15 };
    };

    // ---------------------------------------------------------------- เหตุการณ์จากเซิร์ฟเวอร์
    function onAdv(d, api) {
      const now = performance.now() / 1000;
      if (d.ev === 'hits') {
        let n = 0;
        for (const h of d.list) {
          if (n++ > 24) break;
          hitFx(h, api);
        }
      } else if (d.ev === 'kill') {
        fx.dead = 1;
        fx.deadKind = S.enemy?.kind || null;
        coins(150, G0 + 24, 14);
        if (d.n) api.toast(`⚔️ ล้ม${d.name}! ทุกคนที่ช่วยตี +${d.xp} XP · 🪙${d.gold}`);
        api.sfx.chime?.(988);
      } else if (d.ev === 'bossDown') {
        fx.dead = 1.6;
        fx.deadKind = S.enemy?.kind || null;
        fx.shake = 1.2;
        fx.flash = 0.6;
        fx.flashC = '#ffffff';
        fx.cheer = 4;
        chest = { x: 132, y: G0 + 30, t: 0 };
        coins(140, G0 + 10, 40);
        api.bigShow(null, `ล้ม${d.name}สำเร็จ!`);
        if (d.killer) {
          setHero(d.killer.id, { title: d.title });
          showTag(d.killer.id, 8);
          setTimeout(() => api.toast(`🏆 ${d.killer.name} ปิดบอส! ได้ฉายา “${d.title}”`, 'big'), 1500);
        }
        api.fireworks(5);
        api.sfx.boom?.();
      } else if (d.ev === 'boss') {
        fx.bossIn = 2;
        fx.shake = 1;
        api.toast(`👹 บอสปรากฏ! ${d.name}`, 'big');
        api.sfx.boom?.();
      } else if (d.ev === 'stage') {
        fx.fade = 1;
        api.toast(`🗺️ เข้าสู่ขั้น ${d.stage + 1} · ${d.name}`, 'big');
      } else if (d.ev === 'round') {
        api.toast(`🔁 การผจญภัยรอบที่ ${d.round} — ศัตรูแข็งแกร่งขึ้น!`, 'big');
      } else if (d.ev === 'vote') {
        api.toast('🪧 ทางแยก! พิมพ์ “ซ้าย” หรือ “ขวา” โหวตเส้นทาง');
        api.sfx.chime?.(660);
      } else if (d.ev === 'voted') {
        route = { side: d.side, t: 0, opened: false };
        if (d.side === 'left') api.toast(`⬅️ ซ้ายชนะ (${d.l}:${d.r}) → เลี้ยวเข้าทางลับ!`, 'big');
        else api.toast(`➡️ ขวาชนะ (${d.l}:${d.r}) → ทางลัด วิ่งตรงไปหาบอส!`, 'big');
      } else if (d.ev === 'enemyAtk') {
        fx.partyHit = 0.5;
        fx.shake = Math.max(fx.shake, d.boss ? 0.6 : 0.25);
        fx.lunge = 0.5;
        num(56, G0 + 14, `-${d.d}`, '#ff6b6b', 50);
      } else if (d.ev === 'retreat') {
        fx.retreat = 1;
        api.toast(`🏳️ ปาร์ตี้ถอยไปตั้งหลัก... ${d.name} แข็งแกร่งเกินไป!`, 'big');
      } else if (d.ev === 'return') {
        api.toast('⚔️ ฟื้นพลังแล้ว กลับไปสู้ใหม่!', 'big');
      } else if (d.ev === 'lvup') {
        setHero(d.id, { lv: d.lv, ...(d.eq !== undefined ? { eq: parseEq(d.eq) } : {}) });
        showTag(d.id, 5);
        if (d.evolve) {
          api.toast(`🌟 ${d.name} วิวัฒน์เป็น “${d.evolve}”! (Lv.${d.lv})`, 'big');
          const hp = heroAt(d.id);
          if (hp) for (let i = 0; i < 36; i++) parts.push({ x: hp.x, y: hp.y - 8, vx: Math.cos(i / 5.7) * 40, vy: Math.sin(i / 5.7) * 40 - 10, life: 1.2, c: ['#ffd166', '#ffffff', '#ff6bd5'][i % 3], g: 0 });
          fx.flash = Math.max(fx.flash, 0.25);
          fx.flashC = '#fff3c4';
          api.sfx.chime?.(1175);
          lastToast = now;
        }
        const h = heroAt(d.id);
        if (h) for (let i = 0; i < 12; i++) parts.push({ x: h.x + (Math.random() - 0.5) * 10, y: h.y - 8, vx: (Math.random() - 0.5) * 20, vy: -20 - Math.random() * 30, life: 1, c: '#ffd166', g: 0 });
        if (!d.evolve && (now - lastToast > 2.5 || d.lv % 5 === 0)) {
          lastToast = now;
          api.toast(`⭐ ${d.name} เลเวลอัป! Lv.${d.lv}`);
        }
        syncTags();
      } else if (d.ev === 'equip') {
        setHero(d.id, { eq: parseEq(d.eq) });
        showTag(d.id, 4);
        const hp = heroAt(d.id);
        if (hp) for (let i = 0; i < 16; i++) parts.push({ x: hp.x + (Math.random() - 0.5) * 12, y: hp.y - Math.random() * 16, vx: 0, vy: -25, life: 0.9, c: i % 2 ? '#ffd166' : '#ffffff', g: 0 });
        if (d.item && !d.worn) api.toast(`🛒 ${d.name} ซื้อ${d.item}!`);
      } else if (d.ev === 'heroJoin') {
        setHero(d.id, { lv: d.lv, eq: parseEq(d.eq) });
        showTag(d.id, 6);
        api.toast(`⚔️ ${d.title} Lv.${d.lv} ${d.name} กลับมาร่วมปาร์ตี้!`, d.lv >= 25 ? 'big' : '');
        api.sfx.chime?.(880);
      } else if (d.ev === 'charge') {
        fx.shake = Math.max(fx.shake, 0.5);
        api.sfx.whistle?.();
      } else if (d.ev === 'guardOk') {
        fx.flash = 0.4;
        fx.flashC = '#cfe8ff';
        fx.cheer = 2;
        api.toast(`🛡️ กันสำเร็จ ${d.n} คน! บอสมึน ดาเมจ ×2`, 'big');
        api.sfx.chime?.(1319);
      } else if (d.ev === 'guardFail') {
        fx.shake = 1.4;
        fx.partyHit = 1;
        fx.flash = 0.5;
        fx.flashC = '#ff3a3a';
        num(56, G0 + 10, `-${d.d}`, '#ff4a4a', 66);
        api.toast(`💥 กันไม่ทัน! ปาร์ตี้โดนหนัก -${d.d}`);
        api.sfx.boom?.();
      } else if (d.ev === 'golden') {
        api.toast('✨ สไลม์ทองคำโผล่! ตีให้ทันใน 20 วิ', 'big');
        api.sfx.chime?.(1568);
      } else if (d.ev === 'goldenDown') {
        fx.dead = 1;
        fx.deadKind = 'gslime';
        coins(150, G0 + 24, 50);
        api.toast(`💰 ล้มสไลม์ทองคำ! ทุกคนที่ช่วยตี +🪙${d.gold} · +${d.xp} XP`, 'big');
        api.sfx.chime?.(1760);
      } else if (d.ev === 'escape') {
        api.toast('💨 สไลม์ทองคำหนีไปแล้ว... รอบหน้าตีให้ไวกว่านี้!');
      } else if (d.ev === 'boost') {
        api.toast(`⏰ ช่วงทอง! XP ×2 + ทอง ×2 นาน ${d.min} นาที`, 'big');
        api.fireworks(3);
      } else if (d.ev === 'quest') {
        api.toast(`📜 ภารกิจไลฟ์สำเร็จ! ${d.text} → ${d.rtext}`, 'big');
        api.fireworks(3);
        fx.cheer = 3;
        api.sfx.chime?.(1047);
      } else if (d.ev === 'chest') {
        chest = { x: 132, y: G0 + 30, t: 0 };
        coins(138, G0 + 26, 30);
        api.toast('🎁 หีบสมบัติ! ทุกคนได้ทอง + ฟื้นพลังเต็ม', 'big');
      } else if (d.ev === 'ult') {
        fx.flash = 0.8;
        fx.flashC = '#fff3c4';
        fx.cheer = 1.5;
        fx.shake = 1;
        const e = enemyBox();
        if (e) for (let i = 0; i < 40; i++) parts.push({ x: e.cx + (Math.random() - 0.5) * 40, y: e.cy + (Math.random() - 0.5) * 40, vx: (Math.random() - 0.5) * 120, vy: (Math.random() - 0.5) * 120, life: 0.9, c: ['#ffd166', '#ffffff', '#ff8a3d'][i % 3], g: 0 });
        api.toast('⚡ พลังปาร์ตี้เต็ม! ท่าไม้ตายรวม!', 'big');
        api.sfx.boom?.();
      }
    }
    function hitFx(h, api) {
      const e = enemyBox();
      const me = h.id ? heroAt(h.id) : null;
      if (h.id && me) acts.set(h.id, { a: h.k === 'atk' ? 'attack' : 'cast', t: 0.45 });
      if (h.id) showTag(h.id);
      if (h.k === 'heal') {
        for (let i = 0; i < 10; i++) parts.push({ x: 20 + Math.random() * 90, y: G0 + 10 + Math.random() * 30, vx: 0, vy: -18 - Math.random() * 12, life: 1.2, c: '#7dff8a', g: 0, plus: true });
        if (me) num(me.x, me.y - 24, `+${h.d}`, '#7dff8a', 44);
        return;
      }
      if (!e || !h.d) return;
      const land = () => {
        fx.hit = 0.12;
        num(e.cx + (Math.random() - 0.5) * 24, e.cy - 10 - Math.random() * 14, (h.c ? 'CRIT ' : '') + `-${h.d}`, h.c ? '#ff8a3d' : { magic: '#c8a8ff', fire: '#ffb347', wolf: '#cfe8ff', dragon: '#ffd166', ult: '#fff3c4' }[h.k] || '#ffffff', h.c || h.k === 'dragon' ? 66 : 50);
        for (let i = 0; i < 6; i++) parts.push({ x: e.cx + (Math.random() - 0.5) * 12, y: e.cy + (Math.random() - 0.5) * 12, vx: (Math.random() - 0.5) * 70, vy: (Math.random() - 0.5) * 70, life: 0.35, c: h.c ? '#ffd166' : '#ffffff', g: 0 });
      };
      if (!me || shots.length > 50) return land();
      const cls = classOf(h.id);
      const sx = me.x + 8;
      const sy = me.y - 9;
      if (h.k === 'atk' && cls === 'sword') {
        shots.push({ kind: 'slash', x: e.cx - 6, y: e.cy, t: 0, dur: 0.25, land });
      } else {
        const kind = h.k === 'magic' ? (cls === 'mage' ? 'bolt' : 'spark') : cls === 'archer' ? 'arrow' : cls === 'mage' ? 'bolt' : 'star';
        shots.push({ kind, x: sx, y: sy, sx, sy, tx: e.cx - 4, ty: e.cy + (Math.random() - 0.5) * 10, t: 0, dur: 0.35 + Math.random() * 0.1, land });
      }
    }
    function coins(x, y, n) {
      for (let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - 0.5) * 80, vy: -40 - Math.random() * 60, life: 1.4, c: i % 3 ? '#ffd166' : '#e0a81e', g: 140, coin: true });
    }
    // ตัวเลขดาเมจ = ข้อความ DOM คมชัด (ตำแหน่งพิกเซล ×6)
    function num(x, y, text, color, size) {
      if (!el) return;
      if (nums.length > 26) nums.shift().remove();
      const d = document.createElement('div');
      d.className = 'adv-num';
      d.textContent = text;
      d.style.cssText = `left:${Math.round(x * K)}px;top:${Math.round(y * K)}px;color:${color};font-size:${size}px;`;
      el.appendChild(d);
      nums.push(d);
      setTimeout(() => {
        d.remove();
        const i = nums.indexOf(d);
        if (i >= 0) nums.splice(i, 1);
      }, 1100);
    }

    // ---------------------------------------------------------------- ของขวัญ (ภาพ) — ดาเมจจริงคิดที่เซิร์ฟเวอร์
    const lastGift = new Map();
    function gift(f, user, n, label, api) {
      const tier = Number(String(f.kind).slice(3)) || 1;
      const key = (user?.id || '?') + '|' + tier;
      if (performance.now() - (lastGift.get(key) || 0) < 1800) return;
      lastGift.set(key, performance.now());
      const who = user?.name || 'มีคน';
      if (tier === 1) {
        api.toast(`🔥 ${who} → ${f.label}!`);
        const e = enemyBox();
        const tx = e ? e.cx : 150;
        const ty = e ? e.cy : G0 + 20;
        for (let i = 0; i < Math.min(6, 2 + (n || 1)); i++) shots.push({ kind: 'fireball', x: tx - 40 + i * 14, y: -10 - i * 12, sx: tx - 40 + i * 14, sy: -10 - i * 12, tx: tx + (Math.random() - 0.5) * 16, ty, t: -i * 0.08, dur: 0.7, land: () => boom(tx, ty) });
        api.sfx.whistle?.();
      } else if (tier === 2) {
        api.toast(`🐺 ${who} → ${f.label} 15 วินาที!`);
        wolves.push({ x: -24, y: G0 + 36 + Math.random() * 10, t: 0, life: 15 });
        api.sfx.pop?.();
      } else summonDragon(api, user);
    }
    function summonDragon(api, user) {
      dragon = { x: -80, y: 70, t: 0 };
      api.bigShow(user, 'มังกรผู้พิทักษ์มาช่วยรบ!');
      fx.shake = 0.8;
      api.sfx.boom?.();
    }
    function boom(x, y) {
      fx.shake = Math.max(fx.shake, 0.25);
      for (let i = 0; i < 14; i++) parts.push({ x, y, vx: (Math.random() - 0.5) * 90, vy: (Math.random() - 0.5) * 90 - 20, life: 0.5, c: ['#ffd166', '#ff8a3d', '#e8453c'][i % 3], g: 60 });
    }

    // ================================================================ วาดทุกเฟรม
    let lastSync = 0;
    function frame(ts) {
      const dt = Math.min(0.05, ts - lastT || 0.016);
      lastT = ts;
      if (ts - lastSync > 0.4) {
        lastSync = ts;
        syncTags();
        renderDyn();
      }
      const c = ctx;
      const st = STG()[S.stage] || STG()[0];
      // เส้นทางจากโหวต
      let routeFade = 0;
      let inSecret = false;
      let face = 1;
      let partyDx = 0;
      let rush = false;
      if (route) {
        route.t += dt;
        const t = route.t;
        if (route.side === 'left') {
          // 0-0.4 หันกลับ • 0.4-2.0 เดินไปทางซ้าย • มืด • 2.6 ถึงถ้ำลับ • 4.0 เปิดหีบ • 6.4 มืด • 7.0 กลับเส้นทางเดิม
          if (t < 2.4) {
            face = -1;
            partyDx = -Math.max(0, Math.min(1, (t - 0.4) / 1.6)) * 55;
            if (t > 0.4) scroll = (scroll - dt * 40 + FW) % FW;
          }
          inSecret = t >= 2.4 && t < 6.8;
          routeFade = t < 1.4 ? 0 : t < 2.4 ? (t - 1.4) : t < 3.0 ? 1 - (t - 2.4) / 0.6 : t < 6.2 ? 0 : t < 6.8 ? (t - 6.2) / 0.6 : t < 7.4 ? 1 - (t - 6.8) / 0.6 : 0;
          if (inSecret && t >= 4.0 && !route.opened) {
            route.opened = true;
            fx.cheer = 2.6;
            fx.flash = 0.35;
            fx.flashC = '#fff3c4';
            coins(132, G0 + 22, 60);
            for (let i = 0; i < 30; i++) parts.push({ x: 132, y: G0 + 22, vx: (Math.random() - 0.5) * 60, vy: -40 - Math.random() * 50, life: 1.2, c: i % 2 ? '#ffffff' : '#ffd166', g: 0 });
            API?.toast?.('🎁 เจอหีบสมบัติ! ทุกคนได้ทอง + ฟื้นพลังเต็ม', 'big');
            API?.sfx?.chime?.(1568);
          }
          if (t > 7.5) route = null;
        } else {
          rush = route.t < 3.2;
          if (route.t > 3.4) route = null;
        }
      }
      const bg = bgOf(inSecret ? 'secret' : st.key);
      const walking = route?.side === 'left' ? route.t > 0.4 && route.t < 2.4 : S.phase === 'walk' || S.phase === 'clear';
      if (walking && !route) scroll = (scroll + dt * 34) % FW;
      if (rush) scroll = (scroll + dt * 150) % FW;
      if (fx.retreat > 0) scroll = (scroll - dt * 50 + FW) % FW;
      for (const k of ['shake', 'flash', 'hit', 'enter', 'fade', 'bossIn', 'partyHit', 'retreat', 'cheer', 'lunge']) if (fx[k] > 0) fx[k] = Math.max(0, fx[k] - dt * (k === 'enter' ? 1.4 : k === 'fade' ? 1.2 : 1));
      if (fx.dead > 0) fx.dead = Math.max(0, fx.dead - dt);
      const sh = fx.shake > 0 ? Math.round((Math.random() - 0.5) * 4 * fx.shake) : 0;
      c.setTransform(1, 0, 0, 1, sh, fx.shake > 0 ? Math.round((Math.random() - 0.5) * 3 * fx.shake) : 0);
      c.drawImage(bg.back, 0, 0);
      const sx = -Math.floor(scroll);
      c.drawImage(bg.front, sx, 0);
      c.drawImage(bg.front, sx + FW, 0);
      // คบเพลิง (ปราสาท)
      for (const tx of bg.torches) {
        const x = ((tx + sx) % FW + FW) % FW;
        if (x > W + 4) continue;
        const fl = Math.sin(ts * 14 + tx) > 0;
        c.fillStyle = 'rgba(255,170,90,.10)';
        c.fillRect(x - 10, 98, 21, 24);
        for (const [a, b, col] of [[0, -1, '#ffd166'], [0, -2, '#ffd166'], [-1, -2, '#f2a65a'], [1, fl ? -3 : -2, '#f2a65a'], [0, -3, '#ffe9b0'], [0, fl ? -5 : -4, '#e8453c'], [0, 0, '#f2a65a']]) {
          c.fillStyle = col;
          c.fillRect(x + a, 112 + b, 1, 1);
        }
      }
      // ขั้นฉาก 2-3: หิ่งห้อย / ออร่าทอง
      const lvl = API?.level || 1;
      if (lvl >= 2) {
        for (let i = 0; i < 14; i++) {
          const x = (i * 37 + ts * 6 * (1 + (i % 3))) % W;
          const y = 90 + ((i * 53) % 100) + Math.sin(ts * 2 + i) * 6;
          c.fillStyle = Math.sin(ts * 5 + i * 2) > 0 ? '#e8ff8a' : '#a8c85a';
          c.fillRect(Math.floor(x), Math.floor(y), 1, 1);
        }
      }
      // ป้ายทางแยก
      if (S.phase === 'vote') drawSign(c, 136, ts);
      // หีบสมบัติ
      if (chest) {
        chest.t += dt;
        c.drawImage(chestSprite(), Math.round(chest.x), Math.round(chest.y));
        if (Math.sin(ts * 8) > 0) (c.fillStyle = '#ffe066'), c.fillRect(Math.round(chest.x) + 15, Math.round(chest.y) - 2, 1, 1);
        if (chest.t > 6) chest = null;
      }
      if (inSecret) {
        const cx = 126;
        const cy = G0 + 24;
        if (route.opened) {
          c.drawImage(chestOpenSprite(), cx, cy - 6);
          if (Math.random() < 0.5) parts.push({ x: cx + 3 + Math.random() * 8, y: cy - 4, vx: 0, vy: -30, life: 0.6, c: '#ffd166', g: 0 });
        } else {
          c.drawImage(chestSprite(), cx, cy);
          if (Math.sin(ts * 10) > 0) (c.fillStyle = '#ffffff'), c.fillRect(cx + 15, cy - 2, 1, 1), c.fillRect(cx - 2, cy + 3, 1, 1);
        }
      }
      if (rush) {
        for (let i = 0; i < 18; i++) {
          const y = 60 + ((i * 47 + Math.floor(ts * 30) * 13) % 190);
          const x = W - ((ts * 420 + i * 61) % (W + 40));
          c.fillStyle = i % 3 ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.25)';
          c.fillRect(Math.round(x), y, 10 + (i % 4) * 4, 1);
        }
        if (Math.random() < 0.7) parts.push({ x: 10 + Math.random() * 90, y: G0 + 30 + Math.random() * 18, vx: -40 - Math.random() * 30, vy: -8, life: 0.4, c: '#c8a878', g: 0 });
      }
      drawEnemy(c, ts, dt);
      drawParty(c, ts, walking || rush, lvl, face, partyDx, rush);
      // หมาป่าช่วยรบ
      for (let i = wolves.length - 1; i >= 0; i--) {
        const w = wolves[i];
        w.t += dt;
        const e = enemyBox();
        const tx = e ? e.x - 6 : 120;
        if (w.x < tx - 12) w.x += dt * 90;
        else if (Math.floor(w.t * 3) % 2 === 0) w.x = tx - 6;
        else w.x = tx - 14;
        const bob = Math.abs(Math.sin(w.t * 14)) * 2;
        c.drawImage(wolfSprite(), Math.round(w.x), Math.round(w.y - 14 - bob));
        if (w.t > w.life) wolves.splice(i, 1);
      }
      // กระสุน
      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i];
        s.t += dt;
        if (s.t < 0) continue;
        const k = Math.min(1, s.t / s.dur);
        if (s.kind === 'slash') {
          const a0 = -1.3 + k * 2.4;
          for (let j = 0; j < 8; j++) {
            const a = a0 - j * 0.12;
            c.fillStyle = j < 3 ? '#ffffff' : '#cfe8ff';
            c.fillRect(Math.round(s.x + Math.cos(a) * 12), Math.round(s.y + Math.sin(a) * 14), 2, 1);
          }
        } else {
          const x = s.sx + (s.tx - s.sx) * k;
          const y = s.sy + (s.ty - s.sy) * k - (s.kind === 'arrow' ? Math.sin(k * Math.PI) * 10 : 0);
          drawShot(c, s.kind, x, y, ts);
          if (s.kind === 'fireball' || s.kind === 'bolt') parts.push({ x, y, vx: 0, vy: 0, life: 0.2, c: s.kind === 'fireball' ? '#ff8a3d' : '#8a5ad8', g: 0 });
        }
        if (k >= 1) {
          shots.splice(i, 1);
          s.land?.();
        }
      }
      // มังกร
      if (dragon) {
        dragon.t += dt;
        const t = dragon.t;
        dragon.x = t < 1.2 ? -80 + t * 60 : t < 3.4 ? -8 : -8 + (t - 3.4) * 120;
        dragon.y = 64 + Math.sin(t * 3) * 4;
        c.drawImage(dragonSprite(), Math.round(dragon.x), Math.round(dragon.y));
        if (t > 1.2 && t < 3.4) {
          const e = enemyBox();
          const tx = e ? e.cx : 150;
          const ty = e ? e.cy - 10 : G0;
          for (let j = 0; j < 30; j++) {
            const k = Math.random();
            const spread = 2 + k * 12;
            c.fillStyle = k < 0.2 ? '#fff3c4' : ['#ffd166', '#f2a65a', '#ff7a2a', '#e8453c'][j % 4];
            c.fillRect(Math.round(dragon.x + 70 + (tx - dragon.x - 70) * k + (Math.random() - 0.5) * spread * 0.5), Math.round(dragon.y + 16 + (ty - dragon.y - 16) * k + (Math.random() - 0.5) * spread), 2, 1);
          }
        }
        if (t > 5.2) dragon = null;
      }
      // อนุภาค
      for (let i = parts.length - 1; i >= 0; i--) {
        const q = parts[i];
        q.life -= dt;
        if (q.life <= 0) {
          parts.splice(i, 1);
          continue;
        }
        q.vy += (q.g || 0) * dt;
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        if (q.coin && q.y > G0 + 40) (q.y = G0 + 40), (q.vy *= -0.4), (q.vx *= 0.6);
        c.fillStyle = q.c;
        const x = Math.round(q.x);
        const y = Math.round(q.y);
        if (q.plus) {
          c.fillRect(x - 1, y, 3, 1);
          c.fillRect(x, y - 1, 1, 3);
        } else c.fillRect(x, y, q.coin ? 2 : 1, q.coin ? 2 : 1);
      }
      if (parts.length > 400) parts.splice(0, parts.length - 400);
      // แฟลช / เปลี่ยนฉาก
      c.setTransform(1, 0, 0, 1, 0, 0);
      if (fx.flash > 0) {
        c.globalAlpha = Math.min(0.7, fx.flash);
        c.fillStyle = fx.flashC;
        c.fillRect(0, 0, W, H);
        c.globalAlpha = 1;
      }
      if (fx.partyHit > 0) {
        c.globalAlpha = fx.partyHit * 0.5;
        c.fillStyle = '#e8453c';
        c.fillRect(0, G0 - 20, 120, 70);
        c.globalAlpha = 1;
      }
      if (fx.fade > 0 || routeFade > 0) {
        c.globalAlpha = Math.min(1, Math.max(fx.fade * 1.4, routeFade * 1.2));
        c.fillStyle = '#000000';
        c.fillRect(0, 0, W, H);
        c.globalAlpha = 1;
      }
    }
    function drawShot(c, kind, x, y, ts) {
      x = Math.round(x);
      y = Math.round(y);
      if (kind === 'arrow') {
        c.fillStyle = '#d8d8e0';
        c.fillRect(x - 6, y, 7, 1);
        c.fillStyle = '#ffd166';
        c.fillRect(x + 1, y, 1, 1);
      } else if (kind === 'bolt') {
        c.fillStyle = '#b28cff';
        c.fillRect(x - 1, y - 1, 3, 3);
        c.fillStyle = '#ffffff';
        c.fillRect(x, y, 1, 1);
      } else if (kind === 'spark') {
        c.fillStyle = '#5fe0ff';
        c.fillRect(x - 1, y, 3, 1);
        c.fillRect(x, y - 1, 1, 3);
      } else if (kind === 'star') {
        c.fillStyle = '#ffe066';
        c.fillRect(x - 1, y, 3, 1);
        c.fillRect(x, y - 1, 1, 3);
      } else if (kind === 'fireball') {
        c.fillStyle = '#e8453c';
        c.fillRect(x - 2, y - 2, 5, 5);
        c.fillStyle = '#ffb347';
        c.fillRect(x - 1, y - 1, 3, 3);
        c.fillStyle = '#fff3c4';
        c.fillRect(x, y, 1, 1);
      }
      void ts;
    }
    function drawSign(c, x, ts) {
      c.fillStyle = '#7a4a2a';
      c.fillRect(x + 20, G0 - 30, 3, 34);
      for (const [bx, by, dir] of [[x, G0 - 32, -1], [x + 22, G0 - 22, 1]]) {
        c.fillStyle = O;
        c.fillRect(bx, by, 22, 9);
        c.fillStyle = '#c8964a';
        c.fillRect(bx + 1, by + 1, 20, 7);
        c.fillStyle = O;
        for (let i = 0; i < 3; i++) c.fillRect(dir < 0 ? bx + 2 + i : bx + 19 - i, by + 4 - (i === 1 ? 1 : 0), 1, i === 1 ? 3 : 1);
      }
      if (Math.sin(ts * 6) > 0) (c.fillStyle = '#ffd166'), c.fillRect(x + 21, G0 - 36, 1, 3);
    }
    function drawEnemy(c, ts, dt) {
      const e = S.enemy;
      const dying = fx.dead > 0 && fx.deadKind;
      if (!e && !dying) return;
      const kind = e ? e.kind : fx.deadKind;
      const boss = e ? e.boss : !!BOSS[kind];
      const lunge = fx.lunge > 0 ? Math.sin(fx.lunge * Math.PI * 2) * 6 : 0;
      const blink = fx.hit > 0 && Math.floor(ts * 20) % 2 === 0;
      if (boss) {
        const b = bossSprite(kind);
        const x = W + 8 - b.w + (fx.enter > 0 ? fx.enter * 90 : 0) - lunge;
        const y = G0 + 46 - b.h + (Math.sin(ts * 2) > 0.6 ? 1 : 0);
        if (dying) {
          c.globalAlpha = Math.max(0, Math.min(1, fx.dead));
          c.drawImage(Math.sin(ts * 30) > 0 ? b.white : b.cv, Math.round(x), Math.round(y));
          c.globalAlpha = 1;
          if (Math.random() < 0.6) parts.push({ x: x + Math.random() * b.w, y: y + Math.random() * b.h, vx: 0, vy: -10, life: 0.4, c: ['#ffd166', '#ffffff', '#ff8a3d'][Math.floor(Math.random() * 3)], g: 0 });
          return;
        }
        c.drawImage(blink ? b.white : b.cv, Math.round(x), Math.round(y));
        if (S.charge) {
          c.globalAlpha = 0.25 + Math.abs(Math.sin(ts * 8)) * 0.45;
          c.drawImage(b.red, Math.round(x), Math.round(y));
          c.globalAlpha = 1;
          if (Math.random() < 0.5) parts.push({ x: x + Math.random() * b.w, y: y + b.h, vx: 0, vy: -30 - Math.random() * 30, life: 0.6, c: '#ff4a4a', g: 0 });
        } else if (S.stun > 0) {
          for (let k = 0; k < 3; k++) {
            const ang = ts * 4 + k * 2.1;
            const sx = Math.round(x + b.w * 0.5 + Math.cos(ang) * 14);
            const sy = Math.round(y + 2 + Math.sin(ang) * 4);
            c.fillStyle = '#ffd166';
            c.fillRect(sx - 1, sy, 3, 1);
            c.fillRect(sx, sy - 1, 1, 3);
          }
        }
        if (fx.bossIn > 0) {
          c.globalAlpha = Math.min(0.5, fx.bossIn * 0.3);
          c.fillStyle = '#e8453c';
          c.fillRect(0, 0, W, H);
          c.globalAlpha = 1;
        }
        return;
      }
      const s = mobSprite(kind);
      const alive = e ? Math.max(1, Math.ceil((e.hp / e.max) * (e.n || 3))) : 0;
      const spots = [[134, G0 + 21], [154, G0 + 33], [160, G0 + 15]];
      spots.forEach(([x0, y0], i) => {
        const gone = i >= alive;
        if (gone && !(dying && i === 0)) {
          if (gone && e && !s.gone?.[i]) poof(x0 + 6, y0 + 4);
          (s.gone ||= {})[i] = true;
          return;
        }
        if (s.gone) s.gone[i] = false;
        const bob = s.fly ? Math.sin(ts * 6 + i) * 3 - 22 : Math.abs(Math.sin(ts * 4 + i)) * -1;
        const x = x0 + (fx.enter > 0 ? fx.enter * 60 : 0) - (fx.lunge > 0 && i === 0 ? lunge : 0);
        if (dying) c.globalAlpha = Math.max(0, fx.dead);
        c.drawImage(blink && i === 0 ? s.white : s.cv, Math.round(x), Math.round(y0 + bob));
        if (kind === 'gslime' && Math.random() < 0.3) parts.push({ x: x + Math.random() * 12, y: y0 + bob + Math.random() * 9, vx: 0, vy: -12, life: 0.5, c: '#fff8d8', g: 0 });
        c.globalAlpha = 1;
      });
      void dt;
    }
    function poof(x, y) {
      for (let i = 0; i < 10; i++) parts.push({ x, y, vx: (Math.random() - 0.5) * 50, vy: -Math.random() * 40, life: 0.5, c: i % 2 ? '#ffffff' : '#c8c8d8', g: 0 });
    }
    function drawParty(c, ts, walking, lvl, face = 1, partyDx = 0, rush = false) {
      if (!API?.fans) return;
      const list = [];
      for (const [fid, f] of API.fans) if (f.slot) list.push([fid, f]);
      list.sort((a, b) => a[1].slot.y - b[1].slot.y);
      const off = (fx.retreat > 0 ? -Math.sin(fx.retreat * Math.PI) * 20 : 0) + partyDx;
      for (const [fid, f] of list) {
        const h = hsh(fid);
        const cls = classOf(fid);
        const a = acts.get(fid);
        if (a) {
          a.t -= 1 / 60;
          if (a.t <= 0) acts.delete(fid);
        }
        const lead = fid === S.lead;
        const seq = [1, 0, 2, 0];
        const frameN = walking || fx.retreat > 0 ? seq[Math.floor(ts * (rush ? 16 : 8) + (h % 4)) % 4] : 0;
        const info = heroInfo(fid);
        const tier = tierOf(info.lv || 1);
        const eq = info.eq || {};
        const spr = heroSprite(cls, SKIN[h % 4], HAIR[(h >> 2) % 6], frameN, a ? a.a : null, lead || !!f.data?.vip, tier, eq.back || '', eq.head || '');
        const fx0 = f.slot.x / K;
        const fy = f.slot.y / K + 15;
        let jump = 0;
        if (fx.cheer > 0) jump = Math.abs(Math.sin(ts * 9 + (h % 7))) * 4;
        else if (!walking && Math.floor(ts * 1.5 + (h % 5) * 0.4) % 4 === 0) jump = 1;
        if (a?.a === 'attack' && cls === 'sword') jump = 0;
        const dash = a?.a === 'attack' && cls === 'sword' ? 4 : 0;
        const x = Math.round(fx0 - 6 - HX + dash + off);
        const y = Math.round(fy - 15 - HY - jump);
        const reserve = f.slot.i === undefined;
        if (reserve) c.globalAlpha = 0.65;
        if (lvl >= 3 && !reserve) {
          // ขั้นฉาก 3: ประกายทองลอยขึ้นรอบตัว
          const k = (ts * 1.6 + (h % 10) / 10) % 1;
          c.fillStyle = k < 0.5 ? '#ffd166' : '#fff3c4';
          c.fillRect(x + HX + (h % 13), Math.round(y + HY + 15 - k * 18), 1, 1);
        }
        // ออร่า: ร่างสูงสุด (สีอาชีพ) / ออร่าไฟจากร้าน
        if (!reserve && (eq.aura || tier >= 3)) {
          const col = eq.aura ? ['#ff8a3d', '#e8453c', '#ffd166'] : [CLASS_COL[cls][0], '#ffffff', '#ffd166'];
          for (let k = 0; k < 6; k++) {
            const ang = ts * 3 + k * 1.05 + h;
            c.fillStyle = col[k % 3];
            c.fillRect(Math.round(x + HX + 6 + Math.cos(ang) * 8), Math.round(y + HY + 9 + Math.sin(ang) * 9 - ((ts * 10 + k * 3) % 6)), 1, 1);
          }
        }
        if (lead) drawFlag(c, x + HX, y + HY, ts);
        if (face < 0) {
          c.save();
          c.translate(x + spr.width, y);
          c.scale(-1, 1);
          c.drawImage(spr, 0, 0);
          c.restore();
        } else c.drawImage(spr, x, y);
        if (eq.pet && !reserve) c.drawImage(petSprite(), Math.round(x + HX - 7), Math.round(y + HY + 10 - Math.abs(Math.sin(ts * 6 + h)) * 2));
        c.globalAlpha = 1;
      }
    }
    function drawFlag(c, x, y, ts) {
      c.fillStyle = '#7a4a2a';
      c.fillRect(x, y - 14, 1, 26);
      const wv = Math.floor(ts * 6) % 2;
      for (let r = 0; r < 6; r++) {
        const w = 9 - Math.floor(r / 2);
        for (let i = 0; i < w; i++) {
          c.fillStyle = (r + i + wv) % 5 ? '#e8453c' : '#ffd166';
          c.fillRect(x - 1 - i, y - 14 + r + (i > 5 ? wv : 0), 1, 1);
        }
      }
    }

    const tagT = new Map();
    function showTag(fid, sec = 4) {
      const f = API?.fans?.get(fid);
      if (!f?.el) return;
      f.el.classList.add('adv-show');
      clearTimeout(tagT.get(fid));
      tagT.set(fid, setTimeout(() => f.el.classList.remove('adv-show'), sec * 1000));
    }
    // ---------------------------------------------------------------- ป้ายชื่อ: แสดงเลเวลนักผจญภัยแทนเลเวลทั่วไป
    function syncTags() {
      if (!API?.fans) return;
      for (const [fid, f] of API.fans) {
        const tag = f.el?.querySelector('.tag');
        if (!tag) continue;
        let chip = tag.querySelector('.hlv');
        const info = heroInfo(fid);
        if (!chip) {
          chip = document.createElement('em');
          chip.className = 'hlv';
          tag.appendChild(chip);
        }
        const t = `${info.title ? '🏆' : ''}Lv.${info.lv || 1}`;
        if (chip.textContent !== t) chip.textContent = t;
        const tc = 't' + tierOf(info.lv || 1);
        if (chip.dataset.t !== tc) chip.dataset.t = tc;
        f.el.classList.toggle('adv-lead', fid === S.lead);
      }
    }

    // ================================================================ แผงบนจอ
    function css() {
      const p = hud().palette || {};
      const r = `#root.theme-${id}`;
      const BOX = 'border: 6px solid #ffffff; box-shadow: 8px 8px 0 #000; border-radius: 0;';
      return `
        ${r} { --glass: ${p.panel}; --panel-border: #ffffff; --heading: ${p.soft}; --toast-bg: ${p.accent}; --toast-glow: ${p.accent};
          --big-grad: linear-gradient(180deg, #ffffff, ${p.accent2}); --big-bg: radial-gradient(circle at 50% 45%, rgba(0,0,0,.2), rgba(0,0,0,.66) 70%);
          --card-bg: ${p.panel}; --card-top: 700px; --team-top: 640px; --fortune-top: 720px; }
        ${r} #header, ${r} #songPanel, ${r} #giftPanel, ${r} #topPanel, ${r} #feed { display: none !important; }
        ${r} #hype { left: 24px; width: 480px; top: 212px; padding: 10px 14px 12px; border-radius: 0; background: ${p.panel}; ${BOX} }
        ${r} #hype .label { font-size: 26px; }
        ${r} #hype .bar { height: 18px; border-radius: 0; }
        ${r} #hype .ml { font-size: 24px !important; font-weight: 600; }
        ${r} #toasts { top: 950px; }
        ${r} .toast { border-radius: 0 !important; ${BOX} font-size: 34px; white-space: normal; max-width: 900px; text-align: center; line-height: 1.25; }
        ${r} .toast.big { font-size: 38px; }
        ${r} .fan .body, ${r} .fan .crown, ${r} .fan .wear-pet, ${r} .fan .wear-hat, ${r} .fan .tag .lv { display: none !important; }
        ${r} .fan .tag { top: -54px; border-radius: 0; opacity: 0; transition: opacity .25s; font-size: 28px; font-weight: 700; max-width: 320px; border-width: 3px; background: rgba(12,8,24,.92); }
        ${r} .fan .tag .pic { width: 32px !important; height: 32px !important; font-size: 20px; }
        ${r} .fan.adv-show .tag, ${r} .fan.adv-lead .tag, ${r} .fan.vip .tag, ${r} .fan:has(.bubble.show) .tag { opacity: 1; }
        ${r} .fan .tag .hlv { font-style: normal; margin-left: 6px; padding: 0 7px; background: #ffd166; color: #1b1426; font-weight: 800; font-size: .85em; flex: none; }
        ${r} .fan .tag .hlv[data-t="t1"] { background: #5fe0ff; }
        ${r} .fan .tag .hlv[data-t="t2"] { background: #c8a8ff; }
        ${r} .fan .tag .hlv[data-t="t3"] { background: linear-gradient(90deg, #ffd166, #ff6bd5); }
        ${r} .fan.adv-lead .tag { background: #ffd166; color: #1b1426; }
        ${r} .fan.adv-lead .tag .hlv { background: #1b1426; color: #ffd166; }
        ${r} .fan .bubble { bottom: 60px !important; font-size: 34px !important; font-weight: 800; }
        .adv-hud { position: absolute; inset: 0; pointer-events: none; font-family: 'Kanit', 'Leelawadee UI', sans-serif; color: #fff; z-index: 3; }
        .adv-hud * { box-sizing: border-box; }
        .adv-hud .bx { background: ${p.panel}; ${BOX} }
        .adv-hud .ttl { position: absolute; left: 50%; top: 32px; transform: translateX(-50%); padding: 14px 48px 18px; text-align: center; white-space: nowrap; background: ${p.accent}; ${BOX} max-width: 1000px; }
        .adv-hud .ttl b { display: block; font-size: 56px; line-height: 1.05; font-weight: 800; overflow: hidden; text-overflow: ellipsis; }
        .adv-hud .ttl small { display: block; font-size: 30px; font-weight: 500; opacity: .95; overflow: hidden; text-overflow: ellipsis; }
        .adv-hud .st { position: absolute; right: 24px; top: 212px; width: 520px; padding: 12px 18px 14px; font-size: 27px; font-weight: 600; }
        .adv-hud .st .h { font-size: 33px; font-weight: 800; display: flex; justify-content: space-between; align-items: baseline; }
        .adv-hud .st .h small { font-size: 25px; font-weight: 600; opacity: .75; }
        .adv-hud .row { display: flex; justify-content: space-between; margin-top: 8px; }
        .adv-hud .bar { height: 22px; background: #3a3050; border: 4px solid #1b1426; margin-top: 4px; position: relative; }
        .adv-hud .bar i { position: absolute; left: 0; top: 0; bottom: 0; transition: width .3s; box-shadow: inset 0 -5px 0 rgba(0,0,0,.25); }
        .adv-hud .boss { position: absolute; left: 24px; right: 24px; top: 640px; padding: 12px 18px 14px; display: none; }
        .adv-hud .boss .h { display: flex; justify-content: space-between; align-items: baseline; font-size: 46px; font-weight: 800; }
        .adv-hud .boss .h small { font-size: 27px; font-weight: 600; opacity: .8; }
        .adv-hud .boss .bar { height: 36px; background: #3a1a24; }
        .adv-hud .mob { position: absolute; left: 730px; top: 1120px; width: 320px; padding: 6px 12px 10px; font-size: 30px; font-weight: 700; display: none; text-align: center; }
        .adv-hud .mob .bar { height: 18px; }
        .adv-hud .vote { position: absolute; left: 50%; top: 640px; transform: translateX(-50%); width: 860px; padding: 14px 24px 18px; display: none; font-size: 32px; font-weight: 600; }
        .adv-hud .vote .h { font-size: 44px; font-weight: 800; display: flex; justify-content: space-between; }
        .adv-hud .vote .h span { color: #ffd166; }
        .adv-hud .st .quest { font-size: 24px; margin-top: 10px; }
        .adv-hud .st .rw { font-size: 21px; opacity: .85; margin-top: 2px; }
        .adv-hud .st .boost { font-size: 24px; }
        .adv-hud .st .boost.on { color: #ffd166; animation: advPulse 1s steps(2) infinite; }
        .adv-hud .st .topd { display: block; margin-top: 8px; font-size: 23px; line-height: 1.35; }
        @keyframes advPulse { 50% { opacity: .55; } }
        .adv-hud .chg { position: absolute; left: 60px; right: 60px; top: 830px; padding: 12px 20px 16px; display: none; font-size: 32px; font-weight: 700; background: #6a141c; animation: advPulse .6s steps(2) infinite; }
        .adv-hud .chg .h { display: flex; justify-content: space-between; font-size: 42px; font-weight: 800; color: #ffd166; }
        .adv-hud .fame { position: absolute; left: 50%; top: 640px; transform: translateX(-50%); width: 760px; padding: 12px 24px 16px; display: none; font-size: 28px; font-weight: 600; }
        .adv-hud .fame .h { font-size: 40px; font-weight: 800; color: #ffd166; margin-bottom: 4px; }
        .adv-hud .fame .row { margin-top: 4px; }
        .adv-hud .fame small { font-size: 22px; opacity: .75; margin-left: 6px; }
        .adv-hud .fame .wk { margin-top: 10px; padding-top: 8px; border-top: 3px dashed rgba(255,255,255,.25); font-size: 24px; }
        .adv-hud .mob.gold { border-color: #ffd166; color: #ffd166; }
        .adv-hud .phase { position: absolute; left: 50%; top: 640px; transform: translateX(-50%); padding: 8px 28px; font-size: 38px; font-weight: 800; display: none; white-space: nowrap; }
        .adv-hud .bot { position: absolute; left: 20px; right: 20px; bottom: 20px; padding: 14px 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px 22px; }
        .adv-hud .bot div { display: flex; gap: 10px; align-items: center; font-size: 27px; font-weight: 600; line-height: 1.25; }
        .adv-hud .bot i { font-style: normal; font-size: 34px; flex: none; }
        .adv-hud .bot b { color: ${p.soft}; }
        .adv-hud .bot .foot { grid-column: 1 / -1; border-top: 3px dashed rgba(255,255,255,.25); padding-top: 6px; margin-top: 2px; font-size: 24px; opacity: .9; }
        .adv-num { position: absolute; transform: translate(-50%, 0); font-family: 'Kanit', sans-serif; font-weight: 800; white-space: nowrap; pointer-events: none;
          -webkit-text-stroke: 3px #1b1426; paint-order: stroke fill; text-shadow: 5px 0 0 #1b1426, -5px 0 0 #1b1426, 0 5px 0 #1b1426, 0 -5px 0 #1b1426, 6px 6px 0 #1b1426; animation: advNum 1.1s steps(11) forwards; }
        @keyframes advNum { 0% { transform: translate(-50%, 10px) scale(.6); opacity: 1; } 20% { transform: translate(-50%, -18px) scale(1.15); } 70% { opacity: 1; } 100% { transform: translate(-50%, -70px) scale(1); opacity: 0; } }
      `;
    }
    function render(api) {
      const m = meta();
      const t = api.t || {};
      const rows = [
        ['💬', 'คอมเมนต์', 'เข้าปาร์ตี้ สุ่มอาชีพ'],
        ['⚔️', 'พิมพ์ “ตี”', 'โจมตีศัตรู'],
        ['✨', 'พิมพ์ “เวท”', 'ยิงเวท ดาเมจสูง'],
        ['💚', 'พิมพ์ “ฮีล”', 'รักษาทั้งทีม'],
        ['🛡️', 'พิมพ์ “กัน”', 'ตอนบอสชาร์จท่า'],
        ['❤️', 'ไลก์', 'ชาร์จท่าไม้ตายรวม'],
        ['🎁', 'ของขวัญ', 'ลูกไฟ · หมาป่า · มังกร'],
        ['🛒', 'พิมพ์ “ร้าน”', 'ใช้ทองซื้อชุด'],
      ];
      el.innerHTML = `
        <div class="ttl"><b>⚔️ ${esc(t.title || m.defaults?.title)}</b><small>${esc(t.subtitle || m.defaults?.subtitle || '')}</small></div>
        <div class="st bx"></div>
        <div class="boss bx"></div>
        <div class="mob bx"></div>
        <div class="vote bx"></div>
        <div class="chg bx"></div>
        <div class="fame bx"></div>
        <div class="phase bx"></div>
        <div class="bot bx">${rows.map(([e, k, v]) => `<div><i>${e}</i><span><b>${esc(k)}</b> → ${esc(v)}</span></div>`).join('')}
          <div class="foot">พิมพ์ “เลเวล” ดูเลเวลตัวเอง · เลเวล/ทอง/ชุด เก็บข้ามไลฟ์ · Lv.10/25/50 วิวัฒน์ร่างใหม่</div></div>`;
      renderDyn();
    }
    const bar = (pct, bg) => `<div class="bar"><i style="width:${Math.max(0, Math.min(100, pct)).toFixed(1)}%;background:${bg}"></i></div>`;
    const mmss = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
    const until = (k) => Math.max(0, Math.ceil(((S[k] || 0) - performance.now()) / 1000));
    function renderDyn() {
      if (!el) return;
      const q = (s) => el.querySelector(s);
      const st = q('.st');
      if (!st) return;
      const left = until('deadline');
      const qu = S.quest;
      const bl = until('boostDeadline');
      const boost = S.boost?.on ? `<div class="row boost on"><span>🔥 ช่วงทอง XP ×2 · ทอง ×2</span><b>${mmss(bl)}</b></div>` : S.boost ? `<div class="row boost"><span>⏰ ช่วงทอง XP ×2 อีก</span><b>${mmss(bl)}</b></div>` : '';
      st.innerHTML = `<div class="h"><span>${S.stageIcon || '🌲'} ขั้น ${S.stage + 1} · ${esc(S.stageName || '')}</span><small>ด่าน ${Math.min(S.wave, S.waves)}/${S.waves}${S.round > 1 ? ` · รอบ ${S.round}` : ''}</small></div>
        <div class="row"><span>❤️ HP ปาร์ตี้</span><span>${S.hp}/100</span></div>${bar(S.hp, S.hp > 35 ? '#5fd068' : '#e8453c')}
        <div class="row"><span>⚡ ท่าไม้ตาย (ไลก์)</span><span>${S.power}/${S.powerMax}</span></div>${bar((S.power / S.powerMax) * 100, '#ffd166')}
        ${qu ? `<div class="row quest"><span>📜 ${esc(qu.text)}</span><b>${Math.min(qu.n, qu.need)}/${qu.need}</b></div>${bar((qu.n / qu.need) * 100, '#b28cff')}<div class="rw">🎁 ${esc(qu.rtext)}</div>` : ''}
        ${boost}
        ${S.top?.[0] ? `<div class="row topd">🥇 ตีแรงสุด: <b style="color:#ffd166">${esc(S.top[0].n)}</b> ${S.top[0].d.toLocaleString('en-US')}</div>` : ''}`;
      const e = S.enemy;
      const boss = q('.boss');
      const mob = q('.mob');
      const stun = until('stunDeadline');
      if (e?.boss && S.phase !== 'vote') {
        boss.style.display = 'block';
        boss.innerHTML = `<div class="h"><span>👹 ${esc(e.name)}</span><small>บอสประจำ${esc(S.stageName)}</small></div>${bar((e.hp / e.max) * 100, 'linear-gradient(90deg,#e8453c,#ff8a3d)')}<div class="row" style="font-size:28px;font-weight:700"><span>❤️ ${Math.max(0, e.hp).toLocaleString('en-US')} / ${e.max.toLocaleString('en-US')}</span><span>${stun ? `<b style="color:#ffd166">💫 มึน! ดาเมจ ×2 · ${stun} วิ</b>` : ''}${S.allies ? ` 🐺 ×${S.allies}` : ''}</span></div>`;
      } else boss.style.display = 'none';
      if (e && !e.boss) {
        mob.style.display = 'block';
        mob.classList.toggle('gold', !!e.bonus);
        mob.innerHTML = `${e.bonus ? '✨ ' : ''}${esc(e.name)}${e.bonus ? ` · ${left} วิ` : ''}${bar((e.hp / e.max) * 100, e.bonus ? '#ffd166' : '#e8453c')}`;
      } else mob.style.display = 'none';
      const chg = q('.chg');
      if (S.charge && e?.boss) {
        const cl = until('chargeDeadline');
        chg.style.display = 'block';
        chg.innerHTML = `<div class="h"><span>⚠️ บอสชาร์จท่าไม้ตาย!</span><span>${cl} วิ</span></div><div class="row"><span>พิมพ์ <b>“กัน”</b> ให้ครบ ${S.charge.need} คน</span><b>${S.charge.n}/${S.charge.need}</b></div>${bar((S.charge.n / S.charge.need) * 100, '#5fe0ff')}`;
      } else chg.style.display = 'none';
      const vote = q('.vote');
      if (S.phase === 'vote' && S.vote) {
        const n = S.vote.l + S.vote.r || 1;
        vote.style.display = 'block';
        vote.innerHTML = `<div class="h">🪧 ทางแยก! พิมพ์โหวต <span>${left} วิ</span></div>
          <div class="row"><span>“ซ้าย” · ทางลับ (หีบสมบัติ)</span><b>${S.vote.l}</b></div>${bar((S.vote.l / n) * 100, '#5fe0ff')}
          <div class="row"><span>“ขวา” · ทางลัด (ข้ามไปเจอบอส)</span><b>${S.vote.r}</b></div>${bar((S.vote.r / n) * 100, '#ff8a3d')}`;
      } else vote.style.display = 'none';
      const fame = q('.fame');
      const showFame = S.phase === 'walk' && S.fame && (S.fame.lv?.length || S.fame.wd?.length);
      if (showFame) {
        fame.style.display = 'block';
        const lv = (S.fame.lv || []).map((x, i) => `<div class="row"><span>${['🥇', '🥈', '🥉', '4.', '5.'][i]} ${esc(x.n)} <small>${esc(x.t)}</small></span><b>Lv.${x.lv}</b></div>`).join('');
        const wd = (S.fame.wd || []).map((x, i) => `${['🥇', '🥈', '🥉'][i]} ${esc(x.n)} ${x.d.toLocaleString('en-US')}`).join(' · ');
        fame.innerHTML = `<div class="h">🏆 หอเกียรติยศ</div>${lv}${wd ? `<div class="wk">⚔️ ตีแรงสุดสัปดาห์นี้: ${wd}</div>` : ''}`;
      } else fame.style.display = 'none';
      const ph = q('.phase');
      const msg = S.phase === 'retreat' ? `🏳️ ถอยไปตั้งหลัก... ${left} วิ` : S.phase === 'walk' && !showFame ? (S.wave >= S.waves ? '⚠️ บอสอยู่ข้างหน้า!' : '🚶 ออกสำรวจ...') : '';
      ph.style.display = msg ? 'block' : 'none';
      ph.textContent = msg;
    }

    return T;
  };
})();
