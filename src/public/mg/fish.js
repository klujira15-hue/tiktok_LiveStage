/* มินิเกม: ตกปลาสะสม (ภาพ) — ทะเลสาบยามพระอาทิตย์ตก ท่าเรือไม้มีโคมไฟ เห็นโลกใต้น้ำ
 * คนดูยืนตกปลาบนท่า (9 จุด) • ปลา 30 ชนิดวาดด้วยโค้ด (รูปทรง/สี/ลายตามข้อมูลใน mgthemes.js)
 */
(() => {
  const K = window.PixelKit;
  const { P, O, W, H, hsh, rnd, esc } = K;
  const WL = 146; // ผิวน้ำ
  const DECK = 136; // พื้นท่าเรือ
  const SPOTS = [4, 18, 32, 46, 60, 74, 88, 102, 116];
  const RC = { c: '#ffffff', r: '#c8a8ff', l: '#ffd166' };
  const RN = { c: '', r: 'หายาก', l: 'ตำนาน!' };
  const labY = (i) => DECK - 18 - (i % 2) * 9;
  let lastRoomToast = 0;
  let sky = null;
  let under = null;
  let deck = null;
  const fishCache = new Map();
  const st = { gear: new Map(), bite: new Map(), spot: new Map(), lastAct: new Map(), cast: new Map(), shown: [], amb: [], whale: 0, light: 0, feed: 0, school: 0 };
  const fishList = () => window.__stage?.api?.meta?.hud?.mg?.fish || [];

  // ---------------------------------------------------------------- ปลา (วาดตามข้อมูล)
  function fishSprite(f) {
    if (fishCache.has(f.key)) return fishCache.get(f.key);
    const L = f.L;
    const h = f.h;
    const p = P(L + 10, h + 10);
    const x0 = 4;
    const cy = Math.floor((h + 10) / 2);
    const body = (len, hh, col, bel) => {
      for (let i = 0; i < len; i++) {
        const t = i / len;
        const hh2 = Math.max(1, Math.round(hh * Math.sin(Math.PI * Math.min(1, t * 1.1 + 0.05)) / 2));
        p.rect(x0 + i, cy - hh2, 1, hh2 * 2 + 1, O);
      }
      for (let i = 1; i < len - 1; i++) {
        const t = i / len;
        const hh2 = Math.max(0, Math.round(hh * Math.sin(Math.PI * Math.min(1, t * 1.1 + 0.05)) / 2) - 1);
        p.rect(x0 + i, cy - hh2, 1, hh2 + 1, col);
        p.rect(x0 + i, cy + 1, 1, hh2, bel);
      }
    };
    if (f.k === 'crab') {
      p.oell(x0 + 5, cy + 1, 4, 3, f.c);
      p.rect(x0 + 3, cy, 4, 1, f.b);
      for (const s of [-1, 1]) {
        p.rect(x0 + 5 + s * 5, cy - 2, 2, 2, f.c);
        p.px(x0 + 5 + s * 6, cy - 3, O);
        for (let k = 0; k < 3; k++) p.px(x0 + 5 + s * (3 + k), cy + 4, O);
      }
      p.px(x0 + 4, cy - 2, O);
      p.px(x0 + 6, cy - 2, O);
    } else if (f.k === 'turtle') {
      p.oell(x0 + 5, cy, 5, 3, f.c);
      p.rect(x0 + 3, cy - 1, 2, 1, f.b);
      p.rect(x0 + 6, cy, 2, 1, f.b);
      p.orect(x0 + 10, cy - 1, 3, 3, f.f);
      p.px(x0 + 12, cy - 1, O);
      for (const [a, b] of [[1, cy + 3], [8, cy + 3], [1, cy - 4], [8, cy - 4]]) p.rect(x0 + a, b, 2, 1, f.f);
    } else if (f.k === 'ray') {
      p.poly([[x0, cy], [x0 + L / 2, cy - h / 2], [x0 + L - 2, cy], [x0 + L / 2, cy + h / 2]], O);
      p.poly([[x0 + 1, cy], [x0 + L / 2, cy - h / 2 + 1], [x0 + L - 3, cy], [x0 + L / 2, cy + h / 2 - 1]], f.c);
      p.poly([[x0 + 4, cy], [x0 + L / 2, cy - 2], [x0 + L - 6, cy]], f.b);
      p.line(x0, cy, x0 - 4, cy + 2, f.f);
      p.px(x0 + L - 6, cy - 1, O);
    } else if (f.k === 'shrimp') {
      for (let i = 0; i < L; i++) {
        const y = cy + Math.round(Math.sin((i / L) * Math.PI) * -2);
        p.rect(x0 + i, y - 1, 1, 3, i % 3 === 0 ? f.b : f.c);
      }
      p.line(x0 + L - 1, cy - 2, x0 + L + 4, cy - 5, f.f);
      p.line(x0 + L - 2, cy - 2, x0 + L + 3, cy - 6, f.f);
      p.rect(x0 - 2, cy, 3, 2, f.c);
      p.px(x0 + L - 2, cy - 2, O);
    } else if (f.k === 'eel') {
      for (let i = 0; i < L + 2; i++) {
        const y = cy + Math.round(Math.sin(i / 2.5) * 1.5);
        p.rect(x0 - 2 + i, y - 1, 1, 3, O);
        p.px(x0 - 2 + i, y, i % 4 === 0 ? f.b : f.c);
      }
      p.px(x0 + L - 1, cy - 1, f.f);
    } else {
      // ปลาทั่วไป / ปลาดุก / ปลากราย / ปลากัด
      if (f.k === 'betta') {
        p.poly([[x0 + 2, cy], [x0 - 4, cy - 5], [x0 - 4, cy + 5]], f.f);
        p.poly([[x0 + 3, cy - 2], [x0 + 6, cy - 6], [x0 + 8, cy - 2]], f.b);
        p.poly([[x0 + 3, cy + 2], [x0 + 6, cy + 6], [x0 + 8, cy + 2]], f.b);
      } else {
        p.poly([[x0 + 1, cy], [x0 - 3, cy - Math.max(2, h / 2)], [x0 - 3, cy + Math.max(2, h / 2)]], O);
        p.poly([[x0 + 1, cy], [x0 - 2, cy - Math.max(1, h / 2 - 1)], [x0 - 2, cy + Math.max(1, h / 2 - 1)]], f.f);
        p.poly([[x0 + L / 3, cy - h / 2], [x0 + L / 2, cy - h / 2 - 2], [x0 + (L * 2) / 3, cy - h / 2]], f.f);
      }
      body(L, f.k === 'knife' ? h : h, f.c, f.b);
      if (f.k === 'knife') p.poly([[x0 + 1, cy + 1], [x0 + L - 4, cy + 2], [x0 + 2, cy + 3]], f.f);
      if (f.p === 'stripe') for (let i = 3; i < L - 3; i += 3) p.rect(x0 + i, cy - Math.floor(h / 2) + 1, 1, Math.max(1, h - 3), f.f);
      if (f.p === 'tiger') for (let i = 2; i < L - 2; i += 3) p.rect(x0 + i, cy - Math.floor(h / 2) + 1, 2, Math.max(1, h - 2), f.f);
      if (f.p === 'spot') for (let i = 3; i < L - 2; i += 3) p.px(x0 + i, cy - 1 + (i % 2), f.f);
      if (f.p === 'scale') for (let i = 2; i < L - 2; i += 2) p.px(x0 + i, cy - 1 + ((i / 2) % 2), '#fff8d8');
      if (f.p === 'koi') for (const [a, b] of [[3, -1], [4, 0], [7, -2], [8, -1], [10, 0]]) if (a < L - 2) p.rect(x0 + a, cy + b, 2, 1, f.f);
      if (f.k === 'cat') {
        p.line(x0 + L - 1, cy + 1, x0 + L + 3, cy + 3, O);
        p.line(x0 + L - 1, cy, x0 + L + 3, cy - 1, O);
      }
      p.px(x0 + L - 3, cy - 1, O);
      p.px(x0 + L - 2, cy - 1, '#ffffff');
    }
    const s = { cv: p.cv, flip: null };
    fishCache.set(f.key, s);
    return s;
  }
  function drawFish(c, f, x, y, left = false, scale = 1) {
    const s = fishSprite(f);
    if (left) {
      if (!s.flip) {
        const w = document.createElement('canvas');
        w.width = s.cv.width;
        w.height = s.cv.height;
        const cc = w.getContext('2d');
        cc.scale(-1, 1);
        cc.drawImage(s.cv, -s.cv.width, 0);
        s.flip = w;
      }
      c.drawImage(s.flip, Math.round(x - (s.cv.width * scale) / 2), Math.round(y - (s.cv.height * scale) / 2), s.cv.width * scale, s.cv.height * scale);
    } else c.drawImage(s.cv, Math.round(x - (s.cv.width * scale) / 2), Math.round(y - (s.cv.height * scale) / 2), s.cv.width * scale, s.cv.height * scale);
  }

  // ---------------------------------------------------------------- ฉาก (วาดครั้งเดียว)
  function makeSky() {
    const R = rnd(7);
    const p = P(W, WL + 2);
    p.bands(0, ['#1a1440', '#2a1d5a', '#4a2a72', '#7a3a7a', '#b8506e', '#e8785a', '#f8a85a'], Math.ceil(WL / 6));
    for (let i = 0; i < 34; i++) p.px(Math.floor(R() * W), Math.floor(R() * 50), R() < 0.5 ? '#ffffff' : '#ffe9b0');
    // พระอาทิตย์ครึ่งดวง
    for (let dy = -14; dy <= 0; dy++) for (let dx = -14; dx <= 14; dx++) if (dx * dx + dy * dy <= 196) p.px(132 + dx, WL - 22 + dy, dy > -4 && dy % 2 ? '#f8a85a' : '#ffd88a');
    // ภูเขา 2 ชั้น
    let pts = [[0, WL - 30]];
    for (let x = 0; x <= W + 24; x += 24) pts.push([x + 12, WL - 56 + R() * 18], [x + 24, WL - 34 + R() * 6]);
    p.poly([...pts, [W, WL], [0, WL]], '#5a3a7a');
    pts = [[0, WL - 16]];
    for (let x = 0; x <= W + 16; x += 16) pts.push([x + 8, WL - 34 + R() * 12], [x + 16, WL - 20 + R() * 4]);
    p.poly([...pts, [W, WL], [0, WL]], '#3a2a5a');
    // แนวต้นไม้ฝั่งไกล
    for (let x = 0; x < W; x += 3) {
      const h = 3 + Math.floor(R() * 5);
      p.rect(x, WL - 8 - h, 3, h + 8, '#2a2048');
      p.px(x + 1, WL - 9 - h, '#3a2e5e');
    }
    // ศาลากลางน้ำ (ขวา)
    const sx = 146;
    for (const px of [sx, sx + 26]) p.rect(px, WL - 30, 2, 34, '#5a3420');
    p.orect(sx - 2, WL - 12, 32, 4, '#9a6a3a');
    p.poly([[sx - 6, WL - 30], [sx + 14, WL - 46], [sx + 34, WL - 30]], O);
    p.poly([[sx - 4, WL - 31], [sx + 14, WL - 44], [sx + 32, WL - 31]], '#c8643a');
    p.rect(sx - 4, WL - 31, 36, 2, '#ffd166');
    p.line(sx + 14, WL - 46, sx + 14, WL - 52, '#ffd166');
    return p.cv;
  }
  function makeUnder() {
    const R = rnd(13);
    const p = P(W, H - WL);
    const h = H - WL;
    p.bands(0, ['#2a7ab0', '#1f5f98', '#184a80', '#123868', '#0c2850'], Math.ceil(h / 4));
    // พื้นทราย + หิน + เรือจม
    const sand = h - 26;
    for (let x = 0; x < W; x++) {
      const y = sand + Math.round(Math.sin(x / 14) * 2);
      p.rect(x, y, 1, h - y, (x * 7) % 5 === 0 ? '#8a7a5a' : '#a8946a');
      p.px(x, y, '#c8b48a');
    }
    for (let i = 0; i < 9; i++) {
      const x = Math.floor(R() * W);
      p.oell(x, sand + 4, 4 + Math.floor(R() * 4), 3, '#5a5a6a');
      p.px(x - 1, sand + 2, '#7a7a8a');
    }
    // เรือไม้จม
    p.poly([[118, sand - 2], [160, sand - 8], [166, sand + 2], [122, sand + 6]], O);
    p.poly([[120, sand - 1], [159, sand - 7], [164, sand + 1], [123, sand + 5]], '#4a3420');
    for (let x = 124; x < 160; x += 6) p.line(x, sand - 1 - (x - 120) / 7, x + 2, sand + 4, '#3a2410');
    p.rect(140, sand - 26, 2, 20, '#3a2410');
    // หีบสมบัติจมครึ่ง
    p.orect(40, sand - 4, 12, 8, '#7a4a2a');
    p.rect(41, sand - 3, 10, 2, '#a86a3a');
    p.rect(45, sand - 1, 2, 2, '#ffd166');
    return p.cv;
  }
  function makeDeck() {
    const p = P(140, 60);
    // เสาท่า
    for (let x = 4; x < 136; x += 22) {
      p.rect(x, 4, 4, 54, '#5a3a22');
      p.rect(x, 4, 1, 54, '#7a5232');
    }
    // พื้นไม้
    p.rect(0, 0, 136, 5, O);
    for (let x = 0; x < 136; x += 6) {
      p.rect(x, 1, 5, 3, x % 12 ? '#b07a4a' : '#9a6a3a');
      p.px(x, 1, '#c8925a');
    }
    p.rect(0, 4, 136, 1, '#6a4428');
    return p.cv;
  }

  // ---------------------------------------------------------------- คนบนท่า
  function spotOf(id, ctx) {
    if (st.spot.has(id)) return st.spot.get(id);
    const used = new Set(st.spot.values());
    let i = SPOTS.findIndex((_, k) => !used.has(k));
    if (i < 0) {
      // แทนคนที่นิ่งนานสุด (ไม่ได้กำลังตก)
      let old = null;
      for (const [fid, k] of st.spot) if (!st.cast.has(fid) && (!old || (st.lastAct.get(fid) || 0) < (st.lastAct.get(old) || 0))) old = fid;
      if (!old) return -1;
      i = st.spot.get(old);
      st.spot.delete(old);
    }
    st.spot.set(id, i);
    return i;
  }

  const G = {
    toastTop: 1180, // ป้ายของขวัญลอยกลางน้ำ (บนฟ้าทับป้ายเหนือหัว)
    // วิธีเล่นเป็นแถบป้ายเล็ก ๆ ใต้ชื่อเกม (ด้านล่างโดนคอมเมนต์ TikTok ทับ) • ใต้น้ำปล่อยโล่งให้เห็นปลา
    hintsTop: 188,
    fxWorld: true,
    hints: [
      ['🎣', 'ตก', 'เหวี่ยงเบ็ด'],
      ['💪', 'ดึง', 'ตอนปลากิน'],
      ['🛒', 'ร้าน', 'ซื้อเบ็ด/หมวก'],
      ['📖', 'สมุด', 'ดูปลาที่ได้'],
      ['❤️', 'ไลก์', 'ฝูงปลามา'],
      ['🐋', 'ของขวัญ', 'อาหารปลา·วาฬ'],
    ],
    foot: 'ตกได้ทุก 12 วิ · ปลาบางชนิดออกเฉพาะกลางคืน/เสาร์-อาทิตย์ · ของขวัญเป็นเอฟเฟกต์ ไม่เพิ่มโอกาสได้ปลา',
    init() {
      sky = makeSky();
      under = makeUnder();
      deck = makeDeck();
      const R = rnd(3);
      const commons = () => fishList().filter((f) => f.r === 'c' && f.k !== 'crab' && f.k !== 'turtle');
      for (let i = 0; i < 14; i++) st.amb.push({ i, x: R() * W, y: WL + 22 + R() * 96, v: (R() < 0.5 ? -1 : 1) * (6 + R() * 10), ph: R() * 6, f: null, pick: commons });
    },
    apply(S) {
      if (S.gear) for (const [id, g] of Object.entries(S.gear)) st.gear.set(id, g);
    },
    onEv(d, ctx) {
      const now = performance.now() / 1000;
      if (d.ev === 'bite') {
        st.bite.set(d.id, now + 3.5);
        const i = st.spot.get(d.id);
        if (i !== undefined) ctx.label('n' + d.id, SPOTS[i] + 6, labY(i), `❗ ดึง!`, 3.5, 'gold');
        ctx.sfx('pop');
        return;
      }
      if (d.ev === 'gear') {
        st.gear.set(d.id, d.fg);
        ctx.toast(`🛒 ${d.name} ได้${d.item}!`);
        const i = st.spot.get(d.id);
        if (i !== undefined) ctx.sparkles(SPOTS[i] + 6, DECK - 8, 14, '#ffd166', 12);
        return;
      }
      if (d.ev === 'cast') {
        const i = spotOf(d.id, ctx);
        st.lastAct.set(d.id, now);
        if (i < 0) return;
        const bx = SPOTS[i] + 22 + Math.random() * 6;
        st.cast.set(d.id, { t: 0, bx, dur: d.ms / 1000 });
        ctx.label('n' + d.id, SPOTS[i] + 6, labY(i), `🎣 ${ctx.nm(d.id, d.name)}`, 2);
      } else if (d.ev === 'catch') {
        const cs = st.cast.get(d.id);
        st.cast.delete(d.id);
        st.bite.delete(d.id);
        st.lastAct.set(d.id, now);
        const i = st.spot.has(d.id) ? st.spot.get(d.id) : spotOf(d.id, ctx);
        const sx = i >= 0 ? SPOTS[i] : 60;
        const bx = cs?.bx || sx + 24;
        for (let k = 0; k < 12; k++) ctx.parts.push({ x: bx, y: WL, vx: (Math.random() - 0.5) * 40, vy: -30 - Math.random() * 40, life: 0.6, c: k % 2 ? '#ffffff' : '#cfe8ff', g: 120 });
        if (d.junk) {
          st.shown.push({ junk: d.junk, t: 0, x0: bx, x1: sx + 6, id: d.id });
          ctx.label('n' + d.id, sx + 6, labY(i), `${esc(d.name)} · ${esc(d.jname)} 555`, 3);
          return;
        }
        const f = fishList().find((x) => x.key === d.fish);
        st.shown.push({ f, t: 0, x0: bx, x1: sx + 6, id: d.id, r: d.r });
        const tag = `<b style="color:${RC[d.r]}">${esc(d.fname)}</b> <small>${d.cm} ซม.${d.isNew ? ' 📖ใหม่' : ''}</small>`;
        ctx.label('n' + d.id, sx + 6, labY(i), tag, 3.5, d.r === 'l' ? 'gold' : '');
        if (d.r === 'l') {
          ctx.fx.flash = 0.5;
          ctx.fx.flashC = '#fff3c4';
          ctx.api.bigShow({ id: d.id, name: d.name }, `${d.fname} ${d.cm} ซม.!`);
          ctx.api.fireworks(4);
          ctx.sfx('boom');
        } else if (d.r === 'r') {
          ctx.toast(`✨ ${d.name} ตกได้ปลาหายาก “${d.fname}” ${d.cm} ซม.!`, 'big');
          ctx.sfx('chime', 1319);
        } else ctx.sfx('pop');
        if (d.roomNew && (d.r !== 'c' || now - lastRoomToast > 8)) {
          lastRoomToast = now;
          setTimeout(() => ctx.toast(`📖 ปลาชนิดใหม่ของห้อง! ${d.name} เจอ “${d.fname}” เป็นคนแรก`), 1200);
        }
        if (d.record) setTimeout(() => ctx.toast(`🏆 สถิติใหม่ของสัปดาห์! ${d.fname} ${d.cm} ซม.`, 'big'), 2400);
      } else if (d.ev === 'school') {
        st.school = 6;
        ctx.toast('🐟 ฝูงปลาว่ายเข้าฝั่ง!');
      } else if (d.ev === 'gift') {
        if (d.tier === 1) st.feed = 8;
        else if (d.tier === 2) st.light = 15;
        else st.whale = 9;
      }
    },
    gift(tier, user, n, f, ctx) {
      ctx.toast(`${f.icon} ${user?.name || 'มีคน'} → ${f.label}`, tier === 3 ? 'big' : '');
      if (tier === 3) ctx.api.bigShow(user, 'วาฬยักษ์โผล่!');
    },
    frame(c, ts, dt, ctx) {
      for (const k of ['whale', 'light', 'feed', 'school']) st[k] = Math.max(0, st[k] - dt);
      c.drawImage(sky, 0, 0);
      // เมฆลอย
      for (let i = 0; i < 4; i++) {
        const x = ((i * 61 + ts * (2 + i)) % (W + 40)) - 30;
        const y = 22 + i * 13;
        c.fillStyle = i % 2 ? 'rgba(255,200,220,.35)' : 'rgba(255,230,200,.3)';
        c.fillRect(Math.round(x), y, 22, 3);
        c.fillRect(Math.round(x) + 4, y - 2, 12, 2);
      }
      // นกบิน
      for (let i = 0; i < 3; i++) {
        const x = ((i * 47 + ts * 9) % (W + 20)) - 10;
        const y = 56 + i * 7 + Math.sin(ts * 2 + i) * 2;
        const flap = Math.sin(ts * 10 + i) > 0;
        c.fillStyle = '#2a1d4a';
        c.fillRect(Math.round(x), Math.round(y), 1, 1);
        c.fillRect(Math.round(x) - 1, Math.round(y) - (flap ? 1 : 0), 1, 1);
        c.fillRect(Math.round(x) + 1, Math.round(y) - (flap ? 1 : 0), 1, 1);
      }
      // ใต้น้ำ
      c.drawImage(under, 0, WL);
      if (st.light > 0) {
        c.globalAlpha = Math.min(0.35, st.light * 0.1);
        c.fillStyle = '#9ae8ff';
        c.fillRect(0, WL, W, H - WL);
        c.globalAlpha = 1;
      }
      // แสงลอดน้ำ (แถบเฉียงเลื่อนช้า ๆ)
      c.fillStyle = 'rgba(180,230,255,.08)';
      for (let i = 0; i < 5; i++) {
        const x0 = ((i * 44 + ts * 4) % (W + 60)) - 40;
        for (let y = WL; y < H - 30; y += 2) c.fillRect(Math.round(x0 + (y - WL) * 0.35), y, 8, 2);
      }
      // สาหร่ายไหว
      for (let i = 0; i < 16; i++) {
        const bx = 6 + i * 11 + (i % 3);
        const hgt = 14 + ((i * 7) % 18);
        for (let k = 0; k < hgt; k++) {
          c.fillStyle = k % 4 === 0 ? '#5fd068' : '#2f9e44';
          c.fillRect(Math.round(bx + Math.sin(ts * 1.5 + i + k / 5) * (k / 7)), H - 30 - k, 1, 1);
        }
      }
      // ปลาว่ายวนใต้น้ำ
      for (const a of st.amb) {
        if (!a.f) {
          const list = a.pick();
          if (list.length) a.f = list[(a.i * 5) % list.length];
          else continue;
        }
        a.x += a.v * dt * (st.feed > 0 ? 2 : 1);
        if (a.x < -20) a.x = W + 18;
        if (a.x > W + 20) a.x = -18;
        const ty = st.feed > 0 ? WL + 10 + (a.i % 3) * 4 : a.y;
        a.y += (ty - a.y) * dt * (st.feed > 0 ? 2 : 0.2);
        drawFish(c, a.f, a.x, a.y + Math.sin(ts * 2 + a.ph) * 2, a.v < 0, 1);
      }
      // ฝูงปลาเล็ก (ไลก์)
      if (st.school > 0) {
        const sxp = W + 20 - (6 - st.school) * 45;
        for (let k = 0; k < 40; k++) {
          c.fillStyle = k % 3 ? '#c8d8e8' : '#ffffff';
          c.fillRect(Math.round(sxp + (k % 10) * 5 + Math.sin(ts * 6 + k) * 2), Math.round(WL + 40 + Math.floor(k / 10) * 6 + Math.cos(ts * 5 + k) * 2), 3, 1);
        }
      }
      // วาฬยักษ์ว่ายผ่าน + พ่นน้ำ
      if (st.whale > 0) {
        const k = 1 - st.whale / 9;
        const wx = -70 + k * (W + 140);
        const wy = WL + 50;
        c.fillStyle = O;
        c.fillRect(Math.round(wx) - 1, wy - 13, 74, 28);
        c.fillStyle = '#2a4a7a';
        c.fillRect(Math.round(wx), wy - 12, 72, 26);
        c.fillStyle = '#c8d8e8';
        c.fillRect(Math.round(wx) + 8, wy + 6, 58, 8);
        c.fillStyle = '#2a4a7a';
        c.fillRect(Math.round(wx) - 16, wy - 10, 16, 6);
        c.fillRect(Math.round(wx) - 16, wy + 6, 16, 6);
        c.fillStyle = '#ffffff';
        c.fillRect(Math.round(wx) + 60, wy - 6, 3, 3);
        if (st.whale > 2 && st.whale < 7) for (let j = 0; j < 8; j++) ctx.parts.push({ x: wx + 50 + Math.random() * 6, y: WL - 2, vx: (Math.random() - 0.5) * 30, vy: -80 - Math.random() * 40, life: 0.8, c: j % 2 ? '#ffffff' : '#9ae8ff', g: 120 });
      }
      // ผิวน้ำระยิบ + เงาพระอาทิตย์
      for (let x = 0; x < W; x++) {
        const s = Math.sin(x * 0.7 + ts * 3);
        c.fillStyle = s > 0.6 ? '#9ad0f0' : '#4a90c8';
        c.fillRect(x, WL, 1, 1);
      }
      for (let i = 0; i < 9; i++) {
        const y = WL + 2 + i * 2;
        const w = 12 - i;
        if (Math.sin(ts * 4 + i) > -0.3) {
          c.fillStyle = '#ffd88a';
          c.fillRect(132 - w / 2 + Math.round(Math.sin(ts * 3 + i) * 2), y, w, 1);
        }
      }
      // ท่าเรือ + โคมไฟ
      c.drawImage(deck, 0, DECK);
      for (const lx of [24, 72, 120]) {
        c.fillStyle = '#5a3a22';
        c.fillRect(lx, DECK - 20, 1, 20);
        c.fillRect(lx, DECK - 20, 4, 1);
        const fl = 0.75 + Math.sin(ts * 9 + lx) * 0.25;
        c.globalAlpha = 0.22 * fl;
        c.fillStyle = '#ffd88a';
        c.fillRect(lx - 4, DECK - 26, 15, 14);
        c.globalAlpha = 1;
        c.fillStyle = O;
        c.fillRect(lx + 2, DECK - 19, 5, 6);
        c.fillStyle = fl > 0.8 ? '#fff0b0' : '#ffd166';
        c.fillRect(lx + 3, DECK - 18, 3, 4);
      }
      drawAnglers(c, ts, dt, ctx);
      // ปลาที่ตกได้ลอยขึ้นไปหาคนตก
      for (let i = st.shown.length - 1; i >= 0; i--) {
        const s = st.shown[i];
        s.t += dt;
        const k = Math.min(1, s.t / 0.8);
        const x = s.x0 + (s.x1 - s.x0) * k;
        const y = WL - Math.sin(k * Math.PI) * 30 - k * (WL - DECK + 26);
        if (s.junk) {
          c.fillStyle = O;
          c.fillRect(Math.round(x) - 3, Math.round(y) - 2, 7, 5);
          c.fillStyle = s.junk === 'boot' ? '#5a3a22' : s.junk === 'can' ? '#9aa6b8' : '#2f9e44';
          c.fillRect(Math.round(x) - 2, Math.round(y) - 1, 5, 3);
        } else if (s.f) {
          drawFish(c, s.f, x, y + (k >= 1 ? Math.sin(s.t * 12) * 1 : 0), false, s.r === 'l' ? 2 : 1);
          if (s.r !== 'c' && Math.random() < 0.5) ctx.parts.push({ x: x + (Math.random() - 0.5) * 16, y: y + (Math.random() - 0.5) * 10, vx: 0, vy: -16, life: 0.6, c: RC[s.r], g: 0 });
        }
        if (s.t > 3.2) st.shown.splice(i, 1);
      }
    },
    hud(ctx) {
      const S = ctx.S;
      const rc = S.rc || { c: 0, r: 0, l: 0 };
      const rt = S.rt || { c: 16, r: 10, l: 4 };
      const wk = (S.week || [])[0];
      const l2 = [`หายาก <b style="color:#c8a8ff">${rc.r}/${rt.r}</b> · ตำนาน <b class="gold">${rc.l}/${rt.l}</b>`, wk ? `🏆 ใหญ่สุดสัปดาห์ <b class="gold">${esc(wk.n)}</b> ${esc(wk.name)} ${wk.cm} ซม.` : '', (S.season || []).length ? `🌙 ${(S.season || []).map(esc).join(' · ')}` : ''].filter(Boolean).join(' · ');
      return `<div class="slim" style="top:var(--hb-end, 358px)">
          <div class="l"><span>📖 สมุดปลา <b>${S.room || 0}/${S.total || 30}</b></span>${ctx.bar(((S.room || 0) / (S.total || 30)) * 100, 'linear-gradient(90deg,#5fe0ff,#b28cff)')}<span>ตกได้ <b>${S.catches || 0}</b> ตัว</span></div>
          <div class="s">${l2}</div>
        </div>`;
    },
    onChat(d, ctx) {
      const t = String(d.text).replace(/\s+/g, '');
      if (/^(ตก|ตกปลา|เหวี่ยง|fish|ตกๆ|สมุด|สมุดปลา|ดึง|ดึงๆ|ดึงเลย|ร้าน|ซื้อ.*)$/i.test(t)) return;
      const i = st.spot.has(d.id) ? st.spot.get(d.id) : -1;
      if (i < 0) return;
      ctx.label('n' + d.id, SPOTS[i] + 6, labY(i), esc(String(d.text).slice(0, 24)), 2.5, 'say');
    },
  };

  function drawAnglers(c, ts, dt, ctx) {
    // คนที่อยู่ในไลฟ์: เติมจุดว่างบนท่าก่อน
    const actors = ctx.actors();
    const here = new Set(actors.map((a) => a.id));
    for (const id of [...st.spot.keys()]) if (!here.has(id)) st.spot.delete(id), st.cast.delete(id);
    for (const a of actors) if (st.spot.size < SPOTS.length && !st.spot.has(a.id)) spotOf(a.id, ctx);
    for (const [id, i] of st.spot) {
      const x = SPOTS[i];
      const h = hsh(id);
      const cs = st.cast.get(id);
      if (cs) cs.t += dt;
      const lead = id === ctx.S.lead;
      const spr = K.hero(id, 0, { hat: h % 3 === 0 ? 'straw' : h % 3 === 1 ? 'cap' : '', tool: 'rod', crown: lead });
      c.drawImage(spr, x - K.HX, DECK - 15 - K.HY);
      const gr = st.gear.get(id) || {};
      if (gr.rod) {
        c.fillStyle = gr.rod === 'gold' ? '#ffd166' : '#d8dce8';
        for (let k = 0; k <= 15; k++) c.fillRect(x + 10 + Math.round((k * 7) / 15), DECK - 15 + 9 - k, 1, 1);
        if (gr.rod === 'gold' && Math.random() < 0.05) ctx.parts.push({ x: x + 17, y: DECK - 21, vx: 0, vy: -8, life: 0.5, c: '#fff3c4', g: 0 });
      }
      if (gr.hat === 'captain') {
        c.fillStyle = O;
        c.fillRect(x + 1, DECK - 16, 10, 4);
        c.fillStyle = '#ffffff';
        c.fillRect(x + 2, DECK - 15, 8, 2);
        c.fillStyle = '#1b2a5a';
        c.fillRect(x + 1, DECK - 13, 11, 1);
        c.fillStyle = '#ffd166';
        c.fillRect(x + 5, DECK - 15, 2, 1);
      }
      if (gr.pet === 'cat') {
        const cx = x - 4;
        const cy = DECK - 5;
        c.fillStyle = O;
        c.fillRect(cx - 1, cy - 1, 7, 6);
        c.fillStyle = '#ff9f43';
        c.fillRect(cx, cy, 5, 4);
        c.fillRect(cx, cy - 2, 1, 2);
        c.fillRect(cx + 3, cy - 2, 1, 2);
        c.fillStyle = O;
        c.fillRect(cx + 1, cy + 1, 1, 1);
        c.fillRect(cx + 3, cy + 1, 1, 1);
        c.fillStyle = '#ff9f43';
        c.fillRect(cx + 5, cy + 2 - (Math.sin(ts * 3 + h) > 0 ? 1 : 0), 2, 1);
      }
      // สายเบ็ด + ทุ่น
      const tipX = x + 11 + 6;
      const tipY = DECK - 15 - 6;
      if (cs) {
        const throwK = Math.min(1, cs.t / 0.5);
        const bx = x + 12 + (cs.bx - x - 12) * throwK;
        const biting = (st.bite.get(id) || 0) > performance.now() / 1000;
        const dip = biting ? 2 + Math.abs(Math.sin(ts * 25)) * 3 : cs.t > cs.dur - 0.6 ? Math.sin(ts * 30) * 1.5 + 1 : Math.sin(ts * 4 + h) * 0.6;
        if (biting && Math.random() < 0.3) ctx.parts.push({ x: cs.bx, y: WL, vx: (Math.random() - 0.5) * 20, vy: -10, life: 0.4, c: '#ffffff', g: 40 });
        const by = throwK < 1 ? tipY + (WL - tipY) * throwK - Math.sin(throwK * Math.PI) * 10 : WL - 1 + dip;
        c.fillStyle = 'rgba(230,230,240,.8)';
        const n = 12;
        for (let k = 0; k <= n; k++) c.fillRect(Math.round(tipX + ((bx - tipX) * k) / n), Math.round(tipY + ((by - tipY) * k) / n + Math.sin((k / n) * Math.PI) * 3), 1, 1);
        c.fillStyle = O;
        c.fillRect(Math.round(bx) - 1, Math.round(by) - 2, 3, 4);
        c.fillStyle = '#e8453c';
        c.fillRect(Math.round(bx), Math.round(by) - 1, 1, 1);
        c.fillStyle = '#ffffff';
        c.fillRect(Math.round(bx), Math.round(by), 1, 1);
        if (throwK >= 1 && Math.random() < 0.05) ctx.parts.push({ x: bx, y: WL, vx: (Math.random() - 0.5) * 10, vy: 0, life: 0.5, c: '#cfe8ff', g: 0 });
      } else {
        c.fillStyle = 'rgba(230,230,240,.55)';
        for (let k = 0; k < 8; k++) c.fillRect(tipX + 1, tipY + k * 2, 1, 1);
      }
    }
  }

  window.MG_GAMES.fish = G;
})();
