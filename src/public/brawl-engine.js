/* เกม “ศึกหัวร้อน” — ภาพฝั่งหน้าเวที (ธีม brawl) สไตล์การ์ตูนหัวโต
 * เซิร์ฟเวอร์ (mg/brawl.js) ตัดสินดาเมจ/KO → ไฟล์นี้วาดตัวละครของคนดูทุกคนในสนาม + เล่นท่าต่อย/สกิลตามเหตุการณ์ hit
 * แคนวาส 1080x1920 • ข้อความสำคัญอยู่ในพื้นที่ที่มือถือเห็นครบ (ข้าง 110 • บน 190 • ล่างไม่เกิน ~1330) ใต้นั้นเป็นแค่พื้นสนาม
 */
(() => {
  'use strict';
  const W = 1080;
  const H = 1920;
  const TAU = Math.PI * 2;
  const meta = () => window.__stage?.api?.meta || {};
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
  const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const hsh = (n) => {
    let h = (n | 0) ^ 0x9e3779b9;
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const strHash = (s) => {
    let h = 7;
    for (const ch of String(s)) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
    return h >>> 0;
  };

  // ---------------------------------------------------------------- หน้าตาตัวละคร (สุ่มจากลำดับที่เข้าสนาม + id)
  const SHIRTS = ['#ff5a5f', '#3fa7ff', '#ffd23f', '#41d67a', '#b36bff', '#ff8a3d', '#ff6fb5', '#3de0d0', '#f4f4f4', '#7c8cff', '#9be15d', '#ff4fd8'];
  const HAIRS = ['#1c1420', '#3a2418', '#e8b84a', '#c2462e', '#6a4bd6', '#f06aa5', '#2e7dd7', '#1c1420', '#5a3a22'];
  const SKINS = ['#ffd7b0', '#f3c39a', '#e0a77c'];
  const PANTS = ['#2c3e66', '#3a3a48', '#2f5d8a', '#5a3d2b', '#1f4f3a'];
  const BANDS = ['#ff3b3b', '#1d1a24', '#ffffff', '#ffd23f'];
  function lookOf(id, c, bot) {
    const h = strHash(id);
    const r = (k) => hsh(h + k * 7919);
    if (bot) return { shirt: '#4a4a56', hair: '#1c1420', skin: SKINS[1], pants: '#26262e', style: 0, band: '#1d1a24', shades: 1, stripe: '#ffd23f' };
    return {
      shirt: SHIRTS[(c + Math.floor(r(1) * 3)) % SHIRTS.length], hair: HAIRS[Math.floor(r(2) * HAIRS.length)], skin: SKINS[Math.floor(r(3) * SKINS.length)],
      pants: PANTS[Math.floor(r(4) * PANTS.length)], style: Math.floor(r(5) * 3), band: r(6) < 0.35 ? BANDS[Math.floor(r(7) * BANDS.length)] : null,
      stripe: r(8) < 0.4 ? '#ffffff' : null,
    };
  }

  function rr(c, x, y, w, h, r) {
    c.beginPath();
    c.roundRect(x, y, w, h, r);
  }
  function line(c, pts, w, col, ol, olw) {
    c.save();
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.beginPath();
    pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    if (ol) {
      c.strokeStyle = ol;
      c.lineWidth = w + olw * 2;
      c.stroke();
    }
    c.strokeStyle = col;
    c.lineWidth = w;
    c.stroke();
    c.restore();
  }
  function star(c, x, y, r1, r2, n, fill, stroke, rot = 0, lw = 3) {
    c.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = rot + (i / (n * 2)) * TAU;
      const r = i % 2 ? r2 : r1 * (0.85 + ((i * 37) % 10) / 40);
      c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    c.closePath();
    c.fillStyle = fill;
    c.fill();
    if (stroke) {
      c.strokeStyle = stroke;
      c.lineWidth = lw;
      c.stroke();
    }
  }
  function word(c, x, y, t, size, fill, rot = 0, shadow = '#e8212b') {
    c.save();
    c.translate(x, y);
    c.rotate(rot);
    c.font = `italic 800 ${size}px Kanit, sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineJoin = 'round';
    c.fillStyle = shadow;
    c.fillText(t, size * 0.06, size * 0.08);
    c.lineWidth = size / 6;
    c.strokeStyle = '#1b1020';
    c.strokeText(t, 0, 0);
    c.fillStyle = fill;
    c.fillText(t, 0, 0);
    c.restore();
  }

  // ---------------------------------------------------------------- ตัวละครการ์ตูนหัวโต (หน่วย: เท้าที่ 0 หัวสูง ~76)
  function drawChibi(c, x, y, s, o) {
    const ol = '#1d1a24';
    const f = o.face || 1;
    const lw = 2.3;
    const L = o.look;
    const sk = L.skin;
    const P = o.pose || 'idle';
    c.save();
    c.translate(x, y);
    if (P === 'ko') {
      c.translate(0, -15 * s);
      c.rotate(-Math.PI / 2);
    }
    if (o.rot) c.rotate(o.rot);
    c.scale(s * f, s);
    c.strokeStyle = ol;
    c.lineWidth = lw;
    c.lineJoin = 'round';
    // ขา
    const sw = Math.sin(o.ph || 0) * 6;
    const legs =
      P === 'kick' ? [[-4, -15, -10, -2], [5, -17, 24, -24]]
      : P === 'punch' || P === 'punch2' ? [[-5, -15, -12, -1], [5, -15, 11, -1]]
      : P === 'hit' ? [[-4, -15, -9, -2], [4, -15, 3, 1]]
      : P === 'run' || P === 'jump' ? [[-4, -15, -4 - sw, -1], [4, -15, 4 + sw, -1]]
      : P === 'win' ? [[-5, -15, -10, -1], [5, -15, 10, -1]]
      : [[-5, -15, -8, -1], [5, -15, 8, -1]];
    for (const [x1, y1, x2, y2] of legs) {
      line(c, [[x1, y1], [x2, y2 - 2]], 6.5, L.pants, ol, lw);
      c.fillStyle = '#fff';
      rr(c, x2 - 5, y2 - 4, 10, 5, 2.5);
      c.fill();
      c.stroke();
    }
    const arm = (pts) => {
      line(c, pts, 5.5, L.shirt, ol, lw);
      const [fx, fy] = pts[pts.length - 1];
      c.fillStyle = o.glove || sk;
      c.beginPath();
      c.arc(fx, fy, o.glove ? 5.6 : 4.6, 0, TAU);
      c.fill();
      c.stroke();
    };
    // แขนหลัง
    if (P === 'hit' || P === 'ko') arm([[-6, -31], [-15, -44]]);
    else if (P === 'win') arm([[-6, -31], [-12, -44], [-13, -57]]);
    else if (P === 'kick') arm([[-6, -31], [-15, -27]]);
    else if (P === 'punch2') arm([[-6, -31], [8, -30], [26, -29]]);
    else arm([[-6, -31], [-3, -23], [5, -29]]);
    // ผมหางม้า (อยู่หลังหัว)
    if (L.style === 2) {
      c.fillStyle = L.hair;
      c.beginPath();
      c.ellipse(-17, -52, 6.5, 11, 0.5 + Math.sin(o.ph || 0) * 0.15, 0, TAU);
      c.fill();
      c.stroke();
    }
    // ลำตัว
    c.fillStyle = L.shirt;
    rr(c, -10, -38, 20, 24, 6);
    c.fill();
    c.stroke();
    if (L.stripe) {
      c.fillStyle = L.stripe;
      c.fillRect(-9, -29, 18, 4);
    }
    c.fillStyle = 'rgba(255,255,255,.35)';
    rr(c, -7, -35, 5, 12, 3);
    c.fill();
    // แขนหน้า
    if (P === 'punch') arm([[6, -31], [16, -32], [27, -33]]);
    else if (P === 'punch2') arm([[6, -31], [10, -24], [14, -32]]);
    else if (P === 'hit' || P === 'ko') arm([[6, -31], [15, -45]]);
    else if (P === 'cast' || P === 'win') arm([[6, -31], [13, -42], [15, -56]]);
    else if (P === 'kick') arm([[6, -31], [-2, -40]]);
    else if (P === 'run' || P === 'jump') arm([[6, -31], [12, -26 + sw * 0.6], [16, -32 + sw]]);
    else arm([[6, -31], [12, -24], [14, -33]]);
    if (P === 'punch') {
      c.save();
      c.strokeStyle = '#fff';
      c.lineWidth = 1.8;
      for (const dy of [-38, -33, -28]) {
        c.beginPath();
        c.moveTo(-4, dy);
        c.lineTo(12, dy);
        c.stroke();
      }
      c.restore();
    }
    // หัว
    c.fillStyle = sk;
    c.beginPath();
    c.arc(0, -52, 16, 0, TAU);
    c.fill();
    c.stroke();
    c.fillStyle = L.hair;
    c.beginPath();
    if (L.style === 0) {
      c.moveTo(-16, -52);
      c.quadraticCurveTo(-17, -71, 0, -70);
      c.lineTo(4, -76);
      c.lineTo(7, -69);
      c.lineTo(13, -73);
      c.lineTo(13, -65);
      c.quadraticCurveTo(17, -60, 16, -55);
      c.quadraticCurveTo(8, -63, -2, -61);
      c.quadraticCurveTo(-9, -59, -12, -50);
    } else {
      c.ellipse(0, -56, 17.5, 15, 0, Math.PI, 0);
      c.lineTo(16.5, -52);
      c.quadraticCurveTo(9, -61, -1, -58);
      c.quadraticCurveTo(-11, -56, -17, -46);
    }
    c.closePath();
    c.fill();
    c.stroke();
    if (L.band) {
      c.fillStyle = L.band;
      c.fillRect(-15, -61, 31, 5);
      c.strokeRect(-15, -61, 31, 5);
      c.beginPath();
      c.moveTo(-15, -59);
      c.lineTo(-25, -55 + Math.sin(o.ph || 0) * 3);
      c.lineTo(-23, -62);
      c.closePath();
      c.fill();
      c.stroke();
    }
    // หน้า
    c.fillStyle = ol;
    c.strokeStyle = ol;
    if (P === 'hit' || P === 'ko') {
      c.lineWidth = 2;
      for (const ex of [4, 11]) {
        c.beginPath();
        c.moveTo(ex - 2.5, -53);
        c.lineTo(ex + 2.5, -48);
        c.moveTo(ex + 2.5, -53);
        c.lineTo(ex - 2.5, -48);
        c.stroke();
      }
      c.beginPath();
      c.ellipse(8, -42, 3, 2.5, 0, 0, TAU);
      c.fill();
    } else if (P === 'win') {
      c.lineWidth = 2;
      for (const ex of [4, 11]) {
        c.beginPath();
        c.arc(ex, -49, 2.5, Math.PI * 1.1, Math.PI * 1.9);
        c.stroke();
      }
      c.fillStyle = '#c0283a';
      c.beginPath();
      c.arc(8, -44, 4, 0, Math.PI);
      c.fill();
      c.stroke();
    } else {
      if (L.shades) {
        c.fillStyle = '#111';
        rr(c, 0, -54, 15, 6, 2);
        c.fill();
      } else {
        for (const ex of [4, 11]) {
          c.beginPath();
          c.ellipse(ex, -50, 1.8, 2.6, 0, 0, TAU);
          c.fill();
        }
      }
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(1, -57);
      c.lineTo(6, -55);
      c.moveTo(9, -55);
      c.lineTo(14, -57.5);
      c.stroke();
      c.lineWidth = 1.6;
      c.beginPath();
      if (P === 'punch' || P === 'punch2' || P === 'cast' || P === 'kick') {
        c.moveTo(4, -43);
        c.lineTo(11, -43);
        c.lineTo(10, -41);
        c.lineTo(5, -41);
        c.closePath();
        c.fillStyle = '#fff';
        c.fill();
        c.stroke();
      } else {
        c.moveTo(5, -43);
        c.quadraticCurveTo(8, -45, 11, -43);
        c.stroke();
      }
    }
    c.fillStyle = 'rgba(255,110,110,.45)';
    c.beginPath();
    c.ellipse(-1, -46, 3, 2, 0, 0, TAU);
    c.fill();
    c.restore();
  }

  // ---------------------------------------------------------------- ฉากหลัง: ลานกว้างหลังตึก ตอนกลางวัน
  const RING = { x: 540, y: 1050, rx: 470, ry: 215 };
  let BG = null;
  function makeBg() {
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const c = cv.getContext('2d');
    let s = 5;
    const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
    let g = c.createLinearGradient(0, 0, 0, 800);
    g.addColorStop(0, '#4bb8f7');
    g.addColorStop(1, '#cdefff');
    c.fillStyle = g;
    c.fillRect(0, 0, W, 800);
    // ตึกด้านหลัง
    const bx = -15, by = 420, bw = 760, bh = 380;
    c.fillStyle = '#f3e2c0';
    c.fillRect(bx, by, bw, bh);
    c.fillStyle = '#e2c99a';
    c.fillRect(bx, by, bw, 28);
    c.strokeStyle = '#b89a6a';
    c.lineWidth = 5;
    c.strokeRect(bx, by, bw, bh);
    for (let r = 0; r < 3; r++) {
      for (let i = 0; i < 6; i++) {
        const wx = 25 + i * 120;
        const wy = 478 + r * 104;
        c.fillStyle = '#7fc4e8';
        c.fillRect(wx, wy, 80, 70);
        c.fillStyle = 'rgba(255,255,255,.5)';
        c.fillRect(wx + 6, wy + 6, 22, 58);
        c.strokeStyle = '#8a6d45';
        c.lineWidth = 5;
        c.strokeRect(wx, wy, 80, 70);
        c.beginPath();
        c.moveTo(wx + 40, wy);
        c.lineTo(wx + 40, wy + 70);
        c.stroke();
      }
    }
    // ต้นไม้
    c.fillStyle = '#7a4e2a';
    c.fillRect(870, 560, 42, 240);
    for (const [x, y, r] of [[890, 500, 120], [810, 570, 76], [985, 560, 84], [895, 400, 86], [1040, 470, 70]]) {
      c.fillStyle = '#3cae5a';
      c.beginPath();
      c.arc(x, y, r, 0, TAU);
      c.fill();
    }
    for (const [x, y, r] of [[850, 440, 46], [940, 430, 30], [800, 540, 26]]) {
      c.fillStyle = '#5fd07a';
      c.beginPath();
      c.arc(x, y, r, 0, TAU);
      c.fill();
    }
    // รั้วตาข่าย
    c.strokeStyle = 'rgba(120,132,145,.85)';
    c.lineWidth = 2.5;
    for (let x = -40; x < W + 40; x += 27) {
      c.beginPath();
      c.moveTo(x, 640);
      c.lineTo(x + 84, 806);
      c.moveTo(x + 84, 640);
      c.lineTo(x, 806);
      c.stroke();
    }
    c.strokeStyle = '#7d8790';
    c.lineWidth = 9;
    c.beginPath();
    c.moveTo(0, 640);
    c.lineTo(W, 640);
    c.stroke();
    for (let x = 60; x < W; x += 240) {
      c.lineWidth = 8;
      c.beginPath();
      c.moveTo(x, 636);
      c.lineTo(x, 806);
      c.stroke();
    }
    // พื้นทราย
    g = c.createLinearGradient(0, 790, 0, H);
    g.addColorStop(0, '#e9c98c');
    g.addColorStop(0.55, '#d9b071');
    g.addColorStop(1, '#b8894f');
    c.fillStyle = g;
    c.fillRect(0, 790, W, H - 790);
    c.fillStyle = 'rgba(120,80,40,.25)';
    c.fillRect(0, 790, W, 10);
    for (let i = 0; i < 160; i++) {
      c.fillStyle = 'rgba(180,130,70,.5)';
      c.beginPath();
      c.ellipse(R() * W, 810 + R() * 1100, 4 + R() * 8, 2 + R() * 2, 0, 0, TAU);
      c.fill();
    }
    // วงสังเวียน
    c.strokeStyle = 'rgba(255,251,232,.95)';
    c.lineWidth = 12;
    c.beginPath();
    c.ellipse(RING.x, RING.y, RING.rx + 30, RING.ry + 40, 0, 0, TAU);
    c.stroke();
    c.lineWidth = 6;
    c.setLineDash([30, 24]);
    c.beginPath();
    c.ellipse(RING.x, RING.y, 170, 74, 0, 0, TAU);
    c.stroke();
    c.setLineDash([]);
    // ยางรถยนต์ + กรวย ข้างสนาม
    for (const [x, y] of [[70, 860], [1010, 880]]) {
      c.fillStyle = '#2a2a30';
      c.beginPath();
      c.ellipse(x, y, 46, 20, 0, 0, TAU);
      c.fill();
      c.fillStyle = '#d9b071';
      c.beginPath();
      c.ellipse(x, y - 4, 20, 8, 0, 0, TAU);
      c.fill();
    }
    for (const x of [140, 950]) {
      c.fillStyle = '#ff7a1a';
      c.beginPath();
      c.moveTo(x - 20, 830);
      c.lineTo(x, 770);
      c.lineTo(x + 20, 830);
      c.fill();
      c.fillStyle = '#fff';
      c.fillRect(x - 12, 795, 24, 8);
    }
    return cv;
  }
  function drawClouds(c, t) {
    for (const [x0, y, s, v] of [[100, 150, 1.6, 9], [640, 110, 2.1, 6], [980, 300, 1.2, 12], [380, 330, 1.0, 14]]) {
      const x = ((x0 + t * v) % (W + 400)) - 200;
      c.fillStyle = 'rgba(255,255,255,.95)';
      for (const [dx, dy, r] of [[0, 0, 32], [34, -14, 40], [70, 0, 30], [36, 12, 28]]) {
        c.beginPath();
        c.arc(x + dx * s, y + dy * s, r * s, 0, TAU);
        c.fill();
      }
    }
  }
  function drawTornado(c, x, y, h, t, alpha = 1) {
    c.save();
    c.globalAlpha = alpha;
    c.fillStyle = 'rgba(220,230,250,.35)';
    c.beginPath();
    c.moveTo(x - 20, y);
    c.quadraticCurveTo(x - 80, y - h * 0.5, x - 230, y - h);
    c.lineTo(x + 250, y - h);
    c.quadraticCurveTo(x + 80, y - h * 0.5, x + 20, y);
    c.fill();
    for (let i = 0; i < 30; i++) {
      const k = i / 29;
      const yy = y - k * h;
      const w = 26 + k * k * 230;
      const sw = Math.sin(k * 5 + t * 6) * 30;
      c.strokeStyle = `rgba(${235 - k * 40},${240 - k * 30},255,${0.8 - k * 0.3})`;
      c.lineWidth = 13 - k * 6;
      c.beginPath();
      c.ellipse(x + sw, yy, w, 10 + w * 0.18, 0, 0.15 + t * 9 + k * 3, Math.PI * 1.75 + t * 9 + k * 3);
      c.stroke();
    }
    c.fillStyle = 'rgba(200,160,100,.55)';
    c.beginPath();
    c.ellipse(x, y + 4, 130, 30, 0, 0, TAU);
    c.fill();
    for (let i = 0; i < 16; i++) {
      const a = i * 2.4 + t * 7;
      const hh = (i * 0.137 + t * 0.6) % 1;
      c.fillStyle = ['#3cae5a', '#c89a58', '#ffffff', '#ff5a5f'][i % 4];
      c.save();
      c.translate(x + Math.cos(a) * (40 + hh * 190), y - 60 - hh * h * 0.85);
      c.rotate(a);
      c.fillRect(-9, -6, 20, 12);
      c.restore();
    }
    c.restore();
  }
  function drawSlipper(c, x, y, rot, s = 1) {
    c.save();
    c.translate(x, y);
    c.rotate(rot);
    c.scale(s, s);
    c.fillStyle = '#3fa7ff';
    rr(c, -18, -36, 36, 72, 18);
    c.fill();
    c.strokeStyle = '#1d1a24';
    c.lineWidth = 5;
    c.stroke();
    c.strokeStyle = '#ffffff';
    c.lineWidth = 6;
    c.beginPath();
    c.moveTo(-14, -6);
    c.lineTo(0, -18);
    c.lineTo(14, -6);
    c.stroke();
    c.restore();
  }

  window.makeBrawlTheme = function makeBrawlTheme(id) {
    let API = null;
    let el = null;
    let S = { phase: 'fight', pid: 0, dur: 180000, left: 180000, round: 1, f: [], total: 0, standing: 0, rank: [], champ: null, podium: [], champs: [], best: null, rageMax: 30, maxHp: 100 };
    let cut = { phase: 'fight', pid: -1, t0: 0, dur: 180, end: 0 };
    const F = new Map(); // id → ตัวละครบนจอ
    let cap = 0;
    let lastT = 0;
    let shake = 0;
    let flash = 0;
    let flashCol = '255,255,255';
    let redSky = 0;
    let redSkyTo = 0;
    const parts = [];
    const fx = []; // เอฟเฟกต์ที่มีไทม์ไลน์ { t0, dur, draw(c, t, k), top }
    const timers = [];
    const pending = [];
    let popAt = 0;
    const $ = (s) => el?.querySelector(s);
    const tnow = () => performance.now() / 1000;
    const later = (d, fn) => timers.push({ at: tnow() + d, fn });
    const sfx = (k, ...a) => API?.sfx?.[k]?.(...a);

    // ---------------------------------------------------------------- ตำแหน่งในสนาม
    const TIERS = [6, 10, 16, 24, 30];
    function slotPos(i, n) {
      const r = Math.sqrt((i + 0.5) / n);
      const a = i * 2.399963 + 0.6;
      return [RING.x + Math.cos(a) * r * (RING.rx - 40), RING.y + Math.sin(a) * r * (RING.ry - 25)];
    }
    const baseScale = () => (cap <= 6 ? 3.2 : cap <= 10 ? 2.85 : cap <= 16 ? 2.4 : cap <= 24 ? 2.05 : 1.85);
    const depth = (y) => 0.8 + 0.34 * clamp((y - (RING.y - RING.ry)) / (RING.ry * 2), 0, 1);
    function layout() {
      const n = F.size;
      const want = TIERS.find((x) => x >= n) || n;
      const all = [...F.values()];
      if (want !== cap) {
        cap = want;
        all.sort((a, b) => a.hx - b.hx).forEach((f) => (f.slot = -1));
      }
      const used = new Set(all.filter((f) => f.slot >= 0 && f.slot < cap).map((f) => f.slot));
      for (const f of all) {
        if (f.slot >= 0 && f.slot < cap) continue;
        let i = 0;
        // คนใหม่ไปอยู่ช่องว่างที่ห่างจากคนอื่น (สุ่มเริ่มจาก id)
        const start = strHash(f.id) % cap;
        for (let k = 0; k < cap; k++) {
          i = (start + k) % cap;
          if (!used.has(i)) break;
        }
        used.add(i);
        f.slot = i;
      }
      for (const f of all) {
        const [x, y] = slotPos(f.slot, cap);
        f.hx = x;
        f.hy = y;
      }
    }

    // ---------------------------------------------------------------- สถานะจากเซิร์ฟเวอร์
    function apply(s) {
      const prevPid = S.pid;
      S = { ...S, ...s };
      const t = tnow();
      if (s.pid !== prevPid || cut.pid < 0) {
        const dur = (s.dur || 1000) / 1000;
        cut = { phase: s.phase, pid: s.pid, dur, t0: t - Math.max(0, dur - (s.left || 0) / 1000), end: t + (s.left || 0) / 1000 };
        onPhase(s.phase, cut.t0 >= t - 0.4);
      } else cut.end = t + (s.left || 0) / 1000;
      if (Array.isArray(s.f)) {
        const seen = new Set();
        let added = false;
        for (const [fid, name, col, hp, koLeft, kos, flags, rage] of s.f) {
          seen.add(fid);
          let f = F.get(fid);
          if (!f) {
            f = {
              id: fid, n: name, c: col, look: lookOf(fid, col, flags & 16), hp, hpD: hp, ko: koLeft > 0, koEnd: t + koLeft / 1000, kos, flags, rage,
              slot: -1, hx: RING.x, hy: RING.y, x: 0, y: 0, face: 1, ph: Math.random() * 6, spawn: t, lock: 0, A: null, hitUntil: 0, kbx: 0, lift: 0, gs: 1, ws: hsh(strHash(fid)) * 6,
            };
            F.set(fid, f);
            added = true;
          }
          f.n = name;
          f.kos = kos;
          f.rage = rage;
          if ((flags & 1) && !(f.flags & 1)) f.shieldT = t;
          f.flags = flags;
          if (t >= f.lock) f.hp = hp;
          else f.hpQ = hp;
          if (koLeft > 0) {
            f.koEnd = t + koLeft / 1000;
            if (!f.ko && t >= f.lock) f.ko = true;
          } else if (f.ko && t >= f.lock) standUp(f);
        }
        for (const fid of [...F.keys()]) if (!seen.has(fid)) F.delete(fid);
        if (added || F.size > cap || TIERS.find((x) => x >= F.size) !== cap) layout();
        for (const f of F.values()) {
          if (f.x === 0 && f.y === 0) {
            f.x = f.hx;
            f.y = f.hy;
            f.lift = 900; // หล่นลงมาจากฟ้า
          }
        }
      }
      // เหตุการณ์ที่มาก่อนตัวละคร
      for (let i = pending.length - 1; i >= 0; i--) {
        const p = pending[i];
        if (F.has(p.d.a) || t > p.exp) {
          pending.splice(i, 1);
          if (F.has(p.d.a)) onEv(p.d);
        }
      }
      updatePanels();
    }
    function standUp(f) {
      f.ko = false;
      f.A = { kind: 'stand', t0: tnow(), dur: 0.5 };
      burst(f.x, f.y - 60, 14, ['#fff7a8', '#ffffff', '#7fffb0'], { v0: 120, v1: 360, g: -100, size: 14, max: 0.9 });
    }
    function onPhase(ph, fresh) {
      if (!fresh) return;
      if (ph === 'fight') {
        big('ไฟต์!', 'fight', 1.6);
        sfx('whistle');
        for (const f of F.values()) {
          f.ko = false;
          f.A = { kind: 'cheer', t0: tnow(), dur: 0.6 };
        }
      }
      if (ph === 'result') {
        sfx('fanfare');
        for (let i = 0; i < 3; i++) later(i * 0.5, () => burst(540, 900, 50, ['#ffd23f', '#ff5a5f', '#3fa7ff', '#41d67a', '#ff6fb5', '#ffffff'], { v0: 400, v1: 1100, a0: -Math.PI / 2, spread: 1.6, g: 900, size: 18, max: 2.6, rect: 1 }));
      }
      if (ph === 'ready') {
        for (let i = 0; i < 3; i++) later(1.6 + i, () => (big(String(3 - i), 'count', 0.9), sfx('bell', 523)));
        big(`รอบ ${S.round + 1}`, 'round', 1.5);
      }
    }

    // ---------------------------------------------------------------- อนุภาค
    function burst(x, y, n, cols, o = {}) {
      for (let i = 0; i < n; i++) {
        const a = o.a0 != null ? o.a0 + (Math.random() - 0.5) * (o.spread || 1) : Math.random() * TAU;
        const v = (o.v0 || 100) + Math.random() * ((o.v1 || 400) - (o.v0 || 100));
        parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: o.g ?? 600, life: 0, max: (o.max || 1.4) * (0.6 + Math.random() * 0.6), s: (o.size || 6) * (0.6 + Math.random() * 0.8), col: cols[i % cols.length], rect: o.rect, text: o.text, rot: Math.random() * 6 });
      }
    }
    function floatText(x, y, text, col, size = 54, o = {}) {
      parts.push({ x, y, vx: o.vx ?? 0, vy: o.vy ?? -260, g: o.g ?? 260, life: 0, max: o.max || 1.1, s: size, col, word: text, pop: 1 });
    }
    function stepParts(c, dt) {
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life += dt;
        if (p.life > p.max) {
          parts.splice(i, 1);
          continue;
        }
        p.vy += p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const k = p.life / p.max;
        c.globalAlpha = clamp((1 - k) * 2.2, 0, 1);
        if (p.word) {
          const sc = p.pop ? 1 + Math.max(0, 0.6 - p.life * 4) : 1;
          c.save();
          c.font = `800 ${p.s * sc}px Kanit, sans-serif`;
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          c.lineJoin = 'round';
          c.lineWidth = p.s / 5;
          c.strokeStyle = '#1b1020';
          c.strokeText(p.word, p.x, p.y);
          c.fillStyle = p.col;
          c.fillText(p.word, p.x, p.y);
          c.restore();
        } else if (p.text) {
          c.font = `${p.s}px "Segoe UI Emoji", sans-serif`;
          c.textAlign = 'center';
          c.fillText(p.text, p.x, p.y);
        } else if (p.rect) {
          c.save();
          c.translate(p.x, p.y);
          c.rotate(p.rot + p.life * 8);
          c.fillStyle = p.col;
          c.fillRect(-p.s / 2, -p.s * 0.3, p.s, p.s * 0.6);
          c.restore();
        } else {
          c.fillStyle = p.col;
          c.beginPath();
          c.arc(p.x, p.y, p.s / 2, 0, TAU);
          c.fill();
        }
      }
      c.globalAlpha = 1;
    }

    // ---------------------------------------------------------------- ท่าทางของแต่ละคน
    const scaleOf = (f) => baseScale() * depth(f.y) * f.gs;
    const headY = (f) => f.y - f.lift - 60 * scaleOf(f);
    function contact(att, tgt, gap = 58) {
      const dir = Math.sign(tgt.x - att.x) || 1;
      return { x: tgt.x - dir * gap * scaleOf(tgt), y: tgt.y + 2, dir };
    }
    const SFXW = ['ปั้ก!', 'โป๊ก!', 'ตุ้บ!', 'พลั่ก!', 'เปรี้ยง!'];
    // ผลที่ตกถึงเป้า ณ จังหวะกระทบ
    function impact(att, r, o = {}) {
      const tgt = F.get(r.id);
      if (!tgt) return;
      const t = tnow();
      tgt.lock = 0;
      if (tgt.hpQ != null) tgt.hp = tgt.hpQ;
      const s = scaleOf(tgt);
      const hx = tgt.x;
      const hy = tgt.y - tgt.lift - 34 * s;
      if (r.blk === 'shield') {
        floatText(hx, hy - 60 * s, 'กันได้!', '#9be7ff', 46);
        tgt.shieldT = t;
        sfx('chime', 1046);
        return;
      }
      if (r.blk === 'dodge') {
        const dir = att ? Math.sign(tgt.x - att.x) || 1 : 1;
        tgt.A = { kind: 'hop', t0: t, dur: 0.45, dx: dir * 70 };
        floatText(hx, hy - 60 * s, 'หลบ!', '#7fffb0', 46);
        if (att) floatText(att.x, att.y - 80 * scaleOf(att), 'วืด!', '#ffffff', 36);
        sfx('whoosh');
        return;
      }
      const dir = o.dir ?? (att ? Math.sign(tgt.x - att.x) || 1 : 1);
      tgt.hitUntil = t + (o.long ? 0.6 : 0.35);
      tgt.kbx = dir * (o.kb ?? 30);
      tgt.face = -dir;
      if (!o.noStar) {
        const bx = tgt.x - dir * 18 * s;
        fx.push({ t0: t, dur: 0.32, draw: (c, _t, k) => {
          const sc = (o.big ? 1.8 : 1) * s * (0.7 + 0.5 * Math.sin(k * Math.PI));
          star(c, bx, hy, 26 * sc, 11 * sc, 9, o.col || '#ffe34d', '#1d1a24', k, 4);
          if (!o.big) word(c, bx, hy + 2, o.w || SFXW[Math.floor(Math.random() * SFXW.length)], 18 * sc, '#d11', 0, 'rgba(0,0,0,0)');
        } });
      }
      if (r.d) floatText(tgt.x + (Math.random() - 0.5) * 30, hy - 50 * s, '-' + r.d, o.crit ? '#ffd23f' : '#ff4a4a', o.crit ? 70 : 52, { vx: dir * 60 });
      if (t - popAt > 0.09) {
        popAt = t;
        sfx(o.big ? 'boom' : 'pop');
      }
      if (o.big) shake = Math.max(shake, 16);
      if (r.ko) {
        tgt.ko = true;
        tgt.A = { kind: 'fly', t0: t, dur: 1.15, dir, x0: tgt.x, y0: tgt.y };
        fx.push({ t0: t, dur: 0.9, draw: (c, _t, k) => {
          const sc = 1 + 0.6 * Math.sin(Math.min(1, k * 2) * Math.PI * 0.5);
          star(c, hx, hy - 30, 70 * sc, 30 * sc, 10, '#fff7a8', '#1d1a24', 0.2, 5);
          word(c, hx, hy - 34, 'KO!', 64 * sc, '#ffffff', -0.15);
        } });
        sfx('boom');
        shake = Math.max(shake, 10);
        if (att) feed(`💥 <b>${esc(att.n)}</b> KO <span>${esc(tgt.n)}</span>`);
        if (r.streak >= 3 && att) {
          big(`${esc(att.n)}<br><span>KO ${r.streak} ติด!</span>`, 'streak', 1.8);
          sfx('cheer');
        }
      }
    }
    // เดินไปต่อยแล้วกลับ
    function moveTo(att, x, y, dur, pose, o = {}) {
      att.A = { kind: 'go', t0: tnow(), dur, x0: att.x, y0: att.y, x1: x, y1: y, pose, jump: o.jump || 0, hold: o.hold ?? 0.35, out: o.out ?? 0.3, alt: o.alt };
    }
    function doPunch(att, res, crit) {
      const r = res[0];
      const tgt = r && F.get(r.id);
      if (!tgt) return;
      tgt.lock = tnow() + 2.5;
      const p = contact(att, tgt);
      att.face = p.dir;
      moveTo(att, p.x, p.y, 0.75, 'punch', { out: 0.25, hold: 0.3 });
      later(0.26, () => impact(att, r, { crit, big: crit, kb: crit ? 70 : 30, w: crit ? 'คริ!' : undefined }));
      if (crit) later(0.26, () => {
        flash = 0.25;
        flashCol = '255,240,180';
        burst(tgt.x, tgt.y - 60, 20, ['#ff8a1e', '#ffd23f', '#fff'], { v0: 200, v1: 600, g: 200, size: 14, max: 0.8 });
      });
    }

    // ---------------------------------------------------------------- สกิล
    function skillFx(d, att) {
      const t = tnow();
      const res = d.t || [];
      for (const r of res) {
        const g = F.get(r.id);
        if (g) g.lock = t + 6;
      }
      const tgts = res.map((r) => [r, F.get(r.id)]).filter(([, g]) => g);
      switch (d.k) {
        case 'g1': {
          const [r, tgt] = tgts[0] || [];
          if (!tgt) break;
          const p = contact(att, tgt);
          att.face = p.dir;
          moveTo(att, p.x, p.y, 1.15, 'punch', { out: 0.22, hold: 0.62, alt: 1 });
          const each = Math.round((r.d || 0) / 3);
          for (let i = 0; i < 3; i++) {
            later(0.24 + i * 0.16, () => {
              const last = i === 2;
              impact(att, last ? r : { id: r.id, d: r.blk ? 0 : each, blk: r.blk }, { kb: last ? 60 : 12, big: last });
              if (!last) {
                const g = F.get(r.id);
                if (g) g.lock = tnow() + 2;
              }
            });
          }
          break;
        }
        case 'g2': {
          sfx('chime', 784);
          later(0.1, () => sfx('chime', 1175));
          att.A = { kind: 'cheer', t0: t, dur: 0.7 };
          fx.push({ t0: t, dur: 1.2, draw: (c, tt, k) => {
            const s = scaleOf(att);
            c.save();
            c.globalAlpha = 1 - k;
            c.strokeStyle = '#5dff9a';
            c.lineWidth = 10;
            c.beginPath();
            c.ellipse(att.x, att.y, 40 * s + k * 60 * s, 12 * s + k * 18 * s, 0, 0, TAU);
            c.stroke();
            c.restore();
          } });
          burst(att.x, att.y - 40 * scaleOf(att), 10, ['#ff4f6a'], { v0: 100, v1: 260, a0: -Math.PI / 2, spread: 1.4, g: -120, size: 48, max: 1.5, text: '💚' });
          burst(att.x, att.y - 40 * scaleOf(att), 26, ['#5dff9a', '#ffffff', '#b8ffd2'], { v0: 80, v1: 300, g: -200, size: 12, max: 1.2 });
          floatText(att.x, headY(att) - 60, '+' + (d.n > 1 ? 50 * d.n : 50), '#5dff9a', 64);
          break;
        }
        case 'g3': {
          const [r, tgt] = tgts[0] || [];
          if (!tgt) break;
          const p = contact(att, tgt, 70);
          att.face = p.dir;
          sfx('whoosh');
          moveTo(att, p.x, p.y, 1.25, 'kick', { out: 0.4, hold: 0.45, jump: 230 });
          later(0.42, () => {
            impact(att, r, { big: 1, kb: 160, long: 1, crit: 1, noStar: 0 });
            flash = 0.35;
            flashCol = '255,255,255';
            const ix = tgt.x;
            const iy = tgt.y - 50 * scaleOf(tgt);
            fx.push({ t0: tnow(), dur: 0.55, draw: (c, _t, k) => {
              c.save();
              c.globalAlpha = 1 - k;
              for (let i = 0; i < 40; i++) {
                const a = (i / 40) * TAU + i * 0.13;
                const r0 = 90 + k * 160;
                c.fillStyle = 'rgba(255,255,255,.75)';
                c.beginPath();
                c.moveTo(ix + Math.cos(a) * r0, iy + Math.sin(a) * r0 * 0.7);
                c.lineTo(ix + Math.cos(a - 0.02) * 900, iy + Math.sin(a - 0.02) * 700);
                c.lineTo(ix + Math.cos(a + 0.02) * 900, iy + Math.sin(a + 0.02) * 700);
                c.fill();
              }
              c.restore();
              word(c, clamp(ix + 40, 260, 820), iy - 150, 'ตูม!!', 120 * (1 + 0.3 * (1 - k)), '#ffffff', -0.15);
            } });
          });
          break;
        }
        case 'g4':
          att.shieldT = t;
          sfx('chime', 988);
          att.A = { kind: 'cheer', t0: t, dur: 0.6 };
          burst(att.x, att.y - 50 * scaleOf(att), 24, ['#9be7ff', '#ffffff'], { v0: 200, v1: 420, g: 0, size: 12, max: 0.7 });
          break;
        case 'g5': {
          if (!tgts.length) break;
          att.A = { kind: 'pose', t0: t, dur: 0.5, pose: 'cast' };
          sfx('whoosh');
          const legs = 0.32;
          const pts = [() => ({ x: att.x + 20 * att.face, y: att.y - 70 * scaleOf(att) }), ...tgts.map(([, g]) => () => ({ x: g.x, y: g.y - g.lift - 50 * scaleOf(g) })), () => ({ x: att.x, y: att.y - 70 * scaleOf(att) })];
          const dur = legs * (pts.length - 1);
          fx.push({ t0: t + 0.15, dur, top: 1, draw: (c, tt, k) => {
            const u = k * (pts.length - 1);
            const i = Math.min(pts.length - 2, Math.floor(u));
            const a = pts[i]();
            const b = pts[i + 1]();
            const e = u - i;
            const x = lerp(a.x, b.x, e);
            const y = lerp(a.y, b.y, e) - Math.sin(e * Math.PI) * 120;
            drawSlipper(c, x, y, tt * 22, 1.1);
          } });
          tgts.forEach(([r], i) => later(0.15 + legs * (i + 1), () => impact(att, r, { kb: 50, w: 'แปะ!' })));
          break;
        }
        case 'g6': {
          if (!tgts.length) break;
          att.A = { kind: 'pose', t0: t, dur: 0.6 + tgts.length * 0.12, pose: 'punch' };
          sfx('zap');
          fx.push({ t0: t, dur: 0.6, draw: (c, _tt, k) => {
            const s = scaleOf(att);
            for (let i = 0; i < 3; i++) {
              c.fillStyle = `rgba(255,${120 + i * 50},30,${0.5 * (1 - k)})`;
              c.beginPath();
              c.ellipse(att.x, att.y - 40 * s, (50 + i * 16) * s * (0.6 + k), (60 + i * 18) * s * (0.6 + k), 0, 0, TAU);
              c.fill();
            }
          } });
          tgts.forEach(([r, g], i) => {
            const t0 = 0.5 + i * 0.12;
            const fly = 0.32;
            later(t0, () => {
              const sx = att.x + att.face * 60 * scaleOf(att);
              const sy = att.y - 40 * scaleOf(att);
              fx.push({ t0: tnow(), dur: fly, top: 1, draw: (c, tt, k) => {
                const x = lerp(sx, g.x, k);
                const y = lerp(sy, g.y - 45 * scaleOf(g), k);
                const rg = c.createRadialGradient(x, y, 4, x, y, 46);
                rg.addColorStop(0, '#fffbe0');
                rg.addColorStop(0.4, '#ffb020');
                rg.addColorStop(1, 'rgba(255,60,0,0)');
                c.fillStyle = rg;
                c.beginPath();
                c.arc(x, y, 46, 0, TAU);
                c.fill();
                if (Math.random() < 0.7) burst(x, y, 1, ['#ff8a1e', '#ffd23f'], { v0: 20, v1: 80, g: -120, size: 18, max: 0.4 });
              } });
            });
            later(t0 + fly, () => {
              impact(att, r, { kb: 55, col: '#ff8a1e', w: 'ฟู่!' });
              burst(g.x, g.y - 45 * scaleOf(g), 22, ['#ff5a1e', '#ffb020', '#ffe066'], { v0: 150, v1: 420, g: -80, size: 20, max: 0.7 });
            });
          });
          break;
        }
        case 'g7': {
          att.giantT = t;
          sfx('roar', 1.2);
          att.A = { kind: 'stomp', t0: t, dur: 1.1 };
          later(0.95, () => {
            shake = Math.max(shake, 26);
            sfx('boom');
            const gx = att.x;
            const gy = att.y;
            fx.push({ t0: tnow(), dur: 0.8, draw: (c, _tt, k) => {
              for (const [d0, al] of [[0, 0.9], [0.15, 0.6], [0.3, 0.35]]) {
                const kk = clamp(k - d0, 0, 1);
                if (!kk) continue;
                c.strokeStyle = `rgba(200,140,255,${al * (1 - kk)})`;
                c.lineWidth = 18;
                c.beginPath();
                c.ellipse(gx, gy, 60 + kk * 520, 20 + kk * 220, 0, 0, TAU);
                c.stroke();
              }
            } });
            fx.push({ t0: tnow(), dur: 2.2, under: 1, draw: (c, _tt, k) => {
              c.save();
              c.globalAlpha = 1 - k;
              c.strokeStyle = '#4a2a10';
              c.lineWidth = 6;
              for (let i = 0; i < 9; i++) {
                const a = (i / 9) * TAU + 0.3;
                c.beginPath();
                c.moveTo(gx, gy);
                let x = gx;
                let y = gy;
                for (let j = 0; j < 4; j++) {
                  x += Math.cos(a + Math.sin(i * 3 + j) * 0.4) * 46;
                  y += Math.sin(a + Math.sin(i * 3 + j) * 0.4) * 22;
                  c.lineTo(x, y);
                }
                c.stroke();
              }
              c.restore();
            } });
            tgts.forEach(([r, g]) => later(0.05 + Math.hypot(g.x - gx, (g.y - gy) * 2) / 2600, () => impact(att, r, { kb: 120, dir: Math.sign(g.x - gx) || 1, w: 'ตึง!' })));
          });
          break;
        }
        case 'g8': {
          if (!tgts.length) break;
          sfx('whoosh');
          att.A = { kind: 'pose', t0: t, dur: 0.8, pose: 'cast' };
          const list = tgts.slice().sort((a, b) => (a[1].x - b[1].x) * (att.x < 540 ? 1 : -1));
          const per = Math.min(0.5, 3.2 / list.length);
          const way = [{ x: att.x + att.face * 120, y: att.y }, ...list.map(([, g]) => ({ x: g.x, y: g.y }))];
          const total = 0.6 + per * list.length + 0.9;
          const pos = (tt) => {
            const u = clamp((tt - 0.6) / per, 0, list.length);
            const i = Math.min(way.length - 2, Math.floor(u));
            const e = ease(u - i);
            return { x: lerp(way[i].x, way[i + 1].x, e), y: lerp(way[i].y, way[i + 1].y, e) };
          };
          fx.push({ t0: t, dur: total, draw: (c, tt, k, el) => {
            const p = pos(el);
            const a = Math.min(1, el * 2.5) * Math.min(1, (total - el) * 2);
            drawTornado(c, p.x, p.y + 10, 620 * Math.min(1, el * 1.8), tt, a);
          } });
          list.forEach(([r, g], i) => {
            const at = 0.6 + per * (i + 1);
            later(at, () => {
              g.A = { kind: 'lift', t0: tnow(), dur: 0.95 };
              sfx('whoosh');
            });
            later(at + 0.95, () => impact(att, r, { kb: 40, w: 'ตุ้บ!' }));
          });
          break;
        }
        case 'g9': {
          redSkyTo = 1;
          shake = Math.max(shake, 6);
          sfx('roar', 1.6);
          big(`☄️ อุกกาบาตถล่ม!<br><span>${esc(d.by)}</span>`, 'meteor', 2.2);
          att.A = { kind: 'pose', t0: t, dur: 1.2, pose: 'cast' };
          const n = tgts.length;
          const gap = n ? Math.min(0.18, 2.6 / n) : 0;
          tgts.forEach(([r, g], i) => {
            const t0 = 1.0 + i * gap;
            const fall = 0.5;
            const ang = -0.9 + Math.random() * 0.3;
            later(t0, () => {
              fx.push({ t0: tnow(), dur: fall, top: 1, draw: (c, _tt, k) => {
                const ex = g.x;
                const ey = g.y - 20;
                const L = 900 * (1 - k);
                const x = ex + Math.cos(ang) * -L * -1;
                const y = ey - Math.sin(-ang) * L;
                for (let j = 10; j >= 0; j--) {
                  const tx = x + Math.cos(ang) * -j * -16;
                  const ty = y - Math.sin(-ang) * j * 16;
                  c.fillStyle = j < 2 ? '#fffbe0' : j < 5 ? '#ffd23f' : j < 8 ? '#ff8a1e' : '#c2261e';
                  c.globalAlpha = 1 - j / 12;
                  c.beginPath();
                  c.arc(tx, ty, 34 - j * 2.4, 0, TAU);
                  c.fill();
                }
                c.globalAlpha = 1;
              } });
            });
            later(t0 + fall, () => {
              impact(att, r, { big: 1, kb: 90, noStar: 1, dir: Math.random() < 0.5 ? -1 : 1 });
              const ex = g.x;
              const ey = g.y - 20;
              fx.push({ t0: tnow(), dur: 0.6, draw: (c, _tt, k) => {
                for (const [rad, col] of [[1, '#c2261e'], [0.75, '#ff8a1e'], [0.5, '#ffd23f'], [0.25, '#fffbe0']]) {
                  c.fillStyle = col;
                  c.globalAlpha = 1 - k;
                  c.beginPath();
                  c.ellipse(ex, ey, rad * (90 + k * 120), rad * (50 + k * 60), 0, 0, TAU);
                  c.fill();
                }
                c.globalAlpha = 1;
              } });
              burst(ex, ey, 18, ['#ff5a1e', '#ffb020', '#5a3a22'], { v0: 200, v1: 600, a0: -Math.PI / 2, spread: 2.2, g: 1200, size: 16, max: 0.9 });
              shake = Math.max(shake, 14);
            });
          });
          later(1.2 + n * gap + 0.6, () => {
            flash = 0.6;
            flashCol = '255,240,220';
            redSkyTo = 0;
          });
          break;
        }
      }
    }

    // ---------------------------------------------------------------- เหตุการณ์จากเซิร์ฟเวอร์
    const GTIER = { g1: 1, g2: 1, g3: 1, g4: 2, g5: 2, g6: 2, g7: 3, g8: 3, g9: 3 };
    function onEv(d) {
      const t = tnow();
      switch (d.ev) {
        case 'hit': {
          const att = F.get(d.a);
          if (!att) {
            if (pending.length < 20) pending.push({ d, exp: t + 1.5 });
            return;
          }
          if (att.ko && d.k !== 'g2') att.ko = false;
          if (d.k === 'punch' || d.k === 'crit') return doPunch(att, d.t || [], d.k === 'crit');
          const icon = meta().effects?.[d.k]?.icon || '✨';
          const tier = GTIER[d.k] || 1;
          banner(`${icon} <b>${esc(d.by)}</b> ใช้สกิล ${esc(d.name || '')}${d.n > 1 ? ` ×${d.n}` : ''}!`, 't' + tier, tier === 3 ? 4.5 : 3.2);
          if (tier >= 2 && d.k !== 'g9') big(`${icon} ${esc(d.name || '')}!<br><span>${esc(d.by)}</span>`, 'skill' + tier, 1.6);
          skillFx(d, att);
          return;
        }
        case 'revive': {
          const f = F.get(d.id);
          if (f && f.ko) standUp(f);
          if (f) f.lock = 0;
          return;
        }
        case 'dodge': {
          const f = F.get(d.id);
          if (f) floatText(f.x, headY(f) - 70, '💨 พร้อมหลบ', '#bfe9ff', 34, { vy: -120, g: 0, max: 1.2 });
          return;
        }
        case 'rage': {
          const f = F.get(d.id);
          if (f) {
            floatText(f.x, headY(f) - 70, '🔥 โกรธเต็ม!', '#ffb020', 40, { vy: -140, g: 0, max: 1.3 });
            burst(f.x, f.y - 50, 16, ['#ff5a1e', '#ffb020'], { v0: 100, v1: 300, g: -300, size: 16, max: 0.8 });
            sfx('zap');
          }
          return;
        }
        case 'join':
          feed(`👋 <b>${esc(d.name)}</b> ลงสนาม`);
          return;
        case 'cheer': {
          const f = F.get(d.id);
          if (f) f.A = { kind: 'cheer', t0: t, dur: 0.7 };
          return;
        }
        case 'party':
          if (d.k === 'heal') {
            banner('💚 เป้าเพชรครบ! ฮีลทั้งสนาม ทุกคนฟื้น!', 't2', 4);
            for (const f of F.values()) burst(f.x, f.y - 50, 8, ['#5dff9a', '#ffffff'], { v0: 80, v1: 240, g: -200, size: 12, max: 1 });
            sfx('fanfare');
          } else {
            banner('🔥 เป้าใจครบ! ทุกคนโกรธเต็ม หมัดถัดไปคริติคอล!', 't3', 4);
            for (const f of F.values()) burst(f.x, f.y - 50, 8, ['#ff5a1e', '#ffb020'], { v0: 80, v1: 240, g: -300, size: 14, max: 0.8 });
            sfx('zap');
          }
          return;
        case 'badge':
          banner(`${esc(d.icon)} <b>${esc(d.name)}</b> ได้ป้าย “${esc(d.title)}”`, 't2', 4);
          return;
      }
    }

    // ---------------------------------------------------------------- วาดต่อเฟรม
    function updateFighter(f, t, dt) {
      if (t >= f.lock && f.hpQ != null) {
        f.hp = f.hpQ;
        f.hpQ = null;
      }
      f.hpD = lerp(f.hpD, f.hp, 1 - Math.exp(-dt * 6));
      f.kbx *= Math.exp(-dt * 5);
      // ร่างยักษ์ ขยาย/หดช้า ๆ
      const giant = f.flags & 2 ? 1.75 : 1;
      f.gs = lerp(f.gs, giant, 1 - Math.exp(-dt * 5));
      if (f.lift > 0 && !f.A) f.lift = Math.max(0, f.lift - dt * 2400);
      f.ph += dt * 6;
      const wob = f.ko ? 0 : Math.sin(t * 0.8 + f.ws) * 14;
      let x = f.hx + wob + f.kbx;
      let y = f.hy + Math.cos(t * 0.6 + f.ws) * 5;
      let pose = f.ko ? 'ko' : t < f.hitUntil ? 'hit' : 'idle';
      let lift = f.lift;
      let rot = 0;
      if (!f.ko && pose === 'idle' && !f.A) f.face = f.hx < RING.x ? 1 : -1; // หันหน้าเข้ากลางสนาม
      const A = f.A;
      if (A) {
        const k = (t - A.t0) / A.dur;
        if (k >= 1) f.A = null;
        else if (A.kind === 'go') {
          const kIn = A.out;
          const kHold = A.out + A.hold;
          let e;
          if (k < kIn) e = ease(k / kIn);
          else if (k < kHold) e = 1;
          else e = 1 - ease((k - kHold) / (1 - kHold));
          x = lerp(A.x0, A.x1, e);
          y = lerp(A.y0, A.y1, e);
          if (A.jump) lift = Math.sin(clamp(k / (kIn + 0.05), 0, 1) * Math.PI) * A.jump * (k < kIn + 0.05 ? 1 : 0);
          pose = k < kIn * 0.8 ? 'run' : k < kHold ? (A.alt ? (Math.floor((t - A.t0 - A.dur * kIn) / 0.08) % 2 ? 'punch2' : 'punch') : A.pose) : 'run';
          if (k >= kHold) f.face = Math.sign(A.x0 - A.x1) || f.face;
        } else if (A.kind === 'fly') {
          // KO: ปลิวขึ้นหมุนแล้วตกลงนอนที่เดิม
          const up = Math.sin(k * Math.PI) * 360;
          x = lerp(A.x0, f.hx, k) + A.dir * Math.sin(k * Math.PI) * 140;
          y = lerp(A.y0, f.hy, k);
          lift = up;
          rot = k * TAU * 1.5 * A.dir;
          pose = 'hit';
        } else if (A.kind === 'hop') {
          x += Math.sin(k * Math.PI) * A.dx;
          lift = Math.sin(k * Math.PI) * 50;
          pose = 'jump';
        } else if (A.kind === 'cheer') {
          lift = Math.abs(Math.sin(k * Math.PI * 2)) * 50;
          pose = 'win';
        } else if (A.kind === 'pose') pose = A.pose;
        else if (A.kind === 'stand') {
          pose = k < 0.4 ? 'ko' : 'win';
          lift = k > 0.4 ? Math.sin(((k - 0.4) / 0.6) * Math.PI) * 60 : 0;
        } else if (A.kind === 'stomp') {
          pose = k < 0.6 ? 'win' : 'idle';
          lift = k > 0.55 && k < 0.86 ? Math.sin(((k - 0.55) / 0.31) * Math.PI) * 160 : 0;
        } else if (A.kind === 'lift') {
          lift = Math.sin(k * Math.PI) * 420;
          rot = k * TAU * 3;
          pose = 'hit';
          x += Math.sin(k * 14) * 40;
        }
      }
      f.x = x;
      f.y = y;
      f.dl = lift;
      f.rot = rot;
      f.pose = pose;
    }
    function drawFighter(c, f, t) {
      const s = scaleOf(f);
      const x = f.x;
      const y = f.y;
      const lift = f.dl;
      // เงา
      c.fillStyle = `rgba(60,30,0,${0.28 * clamp(1 - lift / 600, 0.2, 1)})`;
      c.beginPath();
      c.ellipse(x, y, 17 * s * (f.ko ? 2.4 : 1), 5 * s, 0, 0, TAU);
      c.fill();
      // ออร่า
      if (f.flags & 2) {
        const g = c.createRadialGradient(x, y - lift - 40 * s, 5, x, y - lift - 40 * s, 70 * s);
        g.addColorStop(0, 'rgba(215,155,255,.55)');
        g.addColorStop(1, 'rgba(138,61,255,0)');
        c.fillStyle = g;
        c.beginPath();
        c.arc(x, y - lift - 40 * s, 70 * s, 0, TAU);
        c.fill();
      }
      if (f.flags & 8 && !f.ko) {
        for (let i = 0; i < 7; i++) {
          const a = i / 7;
          const h = (30 + Math.sin(t * 13 + i * 2) * 10) * s;
          const fx0 = x + (a - 0.5) * 34 * s;
          c.fillStyle = i % 2 ? 'rgba(255,90,30,.55)' : 'rgba(255,190,40,.55)';
          c.beginPath();
          c.moveTo(fx0 - 8 * s, y - lift);
          c.quadraticCurveTo(fx0 - 6 * s, y - lift - h * 0.6, fx0 + Math.sin(t * 9 + i) * 4 * s, y - lift - h - 34 * s);
          c.quadraticCurveTo(fx0 + 6 * s, y - lift - h * 0.6, fx0 + 8 * s, y - lift);
          c.fill();
        }
      }
      const alpha = f.lift > 0 && !f.A ? 1 : 1;
      c.globalAlpha = alpha;
      drawChibi(c, x, y - lift, s, { look: f.look, pose: f.pose, face: f.face, rot: f.rot, ph: f.ph, glove: f.flags & 2 ? '#8a3dff' : null });
      // โล่
      if (f.flags & 1 && !f.ko) {
        const pulse = f.shieldT && t - f.shieldT < 0.3 ? 1 + (0.3 - (t - f.shieldT)) * 1.5 : 1;
        c.save();
        c.globalAlpha = 0.85;
        const g = c.createRadialGradient(x - 14 * s, y - lift - 56 * s, 4, x, y - lift - 38 * s, 50 * s * pulse);
        g.addColorStop(0, 'rgba(255,255,255,.55)');
        g.addColorStop(0.7, 'rgba(120,210,255,.18)');
        g.addColorStop(1, 'rgba(120,210,255,.5)');
        c.fillStyle = g;
        c.strokeStyle = `rgba(160,230,255,${0.6 + Math.sin(t * 6) * 0.2})`;
        c.lineWidth = 3 * s;
        c.beginPath();
        c.ellipse(x, y - lift - 38 * s, 32 * s * pulse, 46 * s * pulse, 0, 0, TAU);
        c.fill();
        c.stroke();
        c.restore();
      }
      // ดาวหมุนตอน KO
      if (f.ko && !f.A) {
        const hx = x - 50 * s;
        const hy = y - 22 * s;
        for (let i = 0; i < 3; i++) {
          const a = t * 4 + (i / 3) * TAU;
          star(c, hx + Math.cos(a) * 18 * s, hy - 14 * s + Math.sin(a) * 6 * s, 6 * s, 2.6 * s, 5, '#ffe34d', '#1d1a24', a, 1.5);
        }
      }
      c.globalAlpha = 1;
    }
    function drawTag(c, f, t, leader) {
      const s = scaleOf(f);
      const top = f.ko && !f.A ? f.y - 52 * s : f.y - f.dl - 82 * s;
      const fs = Math.round(clamp(9.5 * s + 4, 17, 32));
      const w = clamp(38 * s, 64, 120);
      const bh = clamp(3.6 * s, 8, 13);
      c.save();
      c.font = `700 ${fs}px Kanit, sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'alphabetic';
      c.lineJoin = 'round';
      c.lineWidth = fs / 4;
      c.strokeStyle = 'rgba(20,10,20,.9)';
      const bot = f.flags & 16;
      const name = (f.n.length > 12 ? f.n.slice(0, 11) + '…' : f.n) + (f.flags & 8 ? ' 🔥' : '');
      const ny = top - bh - 6;
      c.strokeText(name, f.x, ny);
      c.fillStyle = bot ? '#d6d6e0' : leader ? '#ffe36b' : '#ffffff';
      c.fillText(name, f.x, ny);
      if (bot) {
        c.font = `600 ${Math.round(fs * 0.62)}px Kanit, sans-serif`;
        c.strokeText('ตัวป่วน', f.x, ny - fs * 0.95);
        c.fillStyle = '#ffb3b3';
        c.fillText('ตัวป่วน', f.x, ny - fs * 0.95);
      }
      if (leader) {
        c.font = `${Math.round(fs * 1.25)}px "Segoe UI Emoji", sans-serif`;
        c.fillText('👑', f.x, ny - fs * 1.05);
      }
      // แถบเลือด
      const k = clamp(f.hpD / (S.maxHp || 100), 0, 1);
      c.fillStyle = 'rgba(20,10,20,.8)';
      rr(c, f.x - w / 2 - 2, top - bh - 2, w + 4, bh + 4, (bh + 4) / 2);
      c.fill();
      if (f.ko) {
        const left = Math.max(0, Math.ceil(f.koEnd - t));
        c.font = `700 ${Math.round(fs * 0.8)}px Kanit, sans-serif`;
        c.fillStyle = '#ffb3b3';
        c.textBaseline = 'middle';
        c.fillText(left ? `ฟื้นใน ${left}` : 'กำลังฟื้น', f.x, top - bh / 2);
      } else {
        const col = k > 0.5 ? '#3dff7a' : k > 0.25 ? '#ffd23f' : '#ff4040';
        c.fillStyle = col;
        rr(c, f.x - w / 2, top - bh, Math.max(bh, w * k), bh, bh / 2);
        c.fill();
        c.fillStyle = 'rgba(255,255,255,.4)';
        c.fillRect(f.x - w / 2 + bh / 2, top - bh + 1, Math.max(0, w * k - bh), bh * 0.3);
      }
      c.restore();
    }

    function frame(c, t) {
      const dt = clamp(t - (lastT || t), 0, 0.1);
      lastT = t;
      for (let i = timers.length - 1; i >= 0; i--) {
        if (t >= timers[i].at) {
          const fn = timers[i].fn;
          timers.splice(i, 1);
          try {
            fn();
          } catch (e) {
            console.warn('brawl fx', e);
          }
        }
      }
      if (!BG) BG = makeBg();
      c.save();
      if (shake > 0.3) c.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
      shake *= Math.exp(-dt * 7);
      c.drawImage(BG, 0, 0);
      drawClouds(c, t);
      redSky = lerp(redSky, redSkyTo, 1 - Math.exp(-dt * 3));
      if (redSky > 0.01) {
        const g = c.createLinearGradient(0, 0, 0, 900);
        g.addColorStop(0, `rgba(60,0,20,${0.85 * redSky})`);
        g.addColorStop(1, `rgba(200,50,20,${0.45 * redSky})`);
        c.fillStyle = g;
        c.fillRect(0, 0, W, 900);
        c.fillStyle = `rgba(80,10,20,${0.28 * redSky})`;
        c.fillRect(0, 900, W, H - 900);
      }
      // เอฟเฟกต์ใต้ตัวละคร (รอยร้าวพื้น)
      runFx(c, t, (e) => e.under);
      const list = [...F.values()];
      for (const f of list) updateFighter(f, t, dt);
      list.sort((a, b) => a.y - b.y);
      const res = S.phase === 'result';
      if (res) c.globalAlpha = 0.35;
      for (const f of list) drawFighter(c, f, t);
      c.globalAlpha = 1;
      runFx(c, t, (e) => !e.under && !e.top);
      if (!res) {
        const lead = S.rank?.[0]?.k > 0 ? S.rank[0].id : null;
        for (const f of list) drawTag(c, f, t, f.id === lead);
      }
      runFx(c, t, (e) => e.top);
      if (res) drawResult(c, t);
      stepParts(c, dt);
      c.restore();
      if (flash > 0.01) {
        c.fillStyle = `rgba(${flashCol},${Math.min(1, flash)})`;
        c.fillRect(0, 0, W, H);
        flash *= Math.exp(-dt * 5);
      }
      tickHud(t);
    }
    function runFx(c, t, pick) {
      for (let i = fx.length - 1; i >= 0; i--) {
        const e = fx[i];
        if (!pick(e)) continue;
        const el = t - e.t0;
        if (el < 0) continue;
        if (el > e.dur) {
          fx.splice(i, 1);
          continue;
        }
        try {
          e.draw(c, t, el / e.dur, el);
        } catch (err) {
          fx.splice(i, 1);
        }
      }
    }
    // ประกาศแชมป์: ตัวละครแชมป์ยืนกลางจอ + ที่ 2/3 ข้าง ๆ
    function drawResult(c, t) {
      const P = S.podium || [];
      const k = clamp((t - cut.t0) / 0.8, 0, 1);
      c.fillStyle = `rgba(20,10,30,${0.45 * k})`;
      c.fillRect(0, 0, W, H);
      const spots = [[540, 1230, 4.0], [250, 1260, 2.9], [830, 1260, 2.9]];
      // แท่นรับรางวัล
      for (const [i, [x, y]] of spots.entries()) {
        if (!P[i]) continue;
        const h = [120, 80, 56][i];
        c.fillStyle = ['#ffd23f', '#d9dee8', '#e0a070'][i];
        c.strokeStyle = '#1d1a24';
        c.lineWidth = 6;
        rr(c, x - 130, y, 260, h, 14);
        c.fill();
        c.stroke();
        word(c, x, y + h / 2 + 4, String(i + 1), 64, '#ffffff', 0, 'rgba(0,0,0,.3)');
      }
      for (const [i, [x, y, s]] of spots.entries()) {
        const p = P[i];
        if (!p) continue;
        const ap = clamp((t - cut.t0 - 0.3 - i * 0.25) / 0.5, 0, 1);
        if (!ap) continue;
        const jump = i === 0 ? Math.abs(Math.sin(t * 3.2)) * 40 : Math.abs(Math.sin(t * 2.6 + i)) * 20;
        c.globalAlpha = ap;
        drawChibi(c, x, y - jump - (1 - ap) * 200, s, { look: lookOf(p.id, p.c || 0, false), pose: 'win', face: i === 2 ? -1 : 1, ph: t * 6 });
        if (i === 0) {
          c.font = '150px "Segoe UI Emoji", sans-serif';
          c.textAlign = 'center';
          c.fillText('👑', x, y - jump - 76 * s - 10 + Math.sin(t * 3) * 6);
        }
        c.globalAlpha = 1;
      }
      if (Math.random() < 0.25) burst(Math.random() * W, -20, 1, ['#ffd23f', '#ff5a5f', '#3fa7ff', '#41d67a', '#ff6fb5'], { v0: 40, v1: 120, a0: Math.PI / 2, spread: 0.6, g: 300, size: 18, max: 4, rect: 1 });
    }

    // ---------------------------------------------------------------- แผง HTML
    let banT = 0;
    let bigT = 0;
    function banner(html, cls = 't1', sec = 3) {
      const b = $('.bw-ban');
      if (!b) return;
      b.className = `bw-ban ${cls} on`;
      b.innerHTML = html;
      clearTimeout(banT);
      banT = setTimeout(() => b.classList.remove('on'), sec * 1000);
    }
    function big(html, cls, sec) {
      const b = $('.bw-big');
      if (!b) return;
      b.className = `bw-big ${cls}`;
      b.innerHTML = html;
      void b.offsetWidth;
      b.classList.add('on');
      clearTimeout(bigT);
      bigT = setTimeout(() => b.classList.remove('on'), sec * 1000);
    }
    const feedRows = [];
    function feed(html) {
      const box = $('.bw-feed');
      if (!box) return;
      const d = document.createElement('div');
      d.innerHTML = html;
      box.prepend(d);
      feedRows.unshift(d);
      while (feedRows.length > 3) feedRows.pop().remove();
      setTimeout(() => d.classList.add('old'), 6000);
    }
    function renderStatic() {
      const m = meta();
      const tt = API?.t || {};
      const gifts = (tt.gifts || m.defaults?.gifts || []).slice(0, 9);
      const efx = m.effects || {};
      el.innerHTML = `
        <div class="bw-top"><div class="ico">👊</div><div class="tt"><b>${esc(tt.title || m.defaults?.title || 'ศึกหัวร้อน')}</b><small class="sub"></small></div><div class="tm"><small>เหลือเวลา</small><b>3:00</b></div></div>
        <div class="bw-pills"></div>
        <div class="bw-ban"></div>
        <div class="bw-gl"><h4>🎁 ของขวัญ = สกิล</h4>${gifts.map((g) => `<div>${window.giftIconHtml ? window.giftIconHtml(g.name, efx[g.effect]?.icon || '🎁') : esc(efx[g.effect]?.icon || '🎁')} ${window.giftIcon?.(g.name) ? '' : `<b>${esc(g.name)}</b> `}${esc(efx[g.effect]?.label || '')}</div>`).join('')}</div>
        <div class="bw-rk"><h4>👊 KO มากสุดรอบนี้</h4><div class="rows"></div></div>
        <div class="bw-feed"></div>
        <div class="bw-hint">พิมพ์ <b>ตี</b> ต่อยคนสุ่ม • <b>ตี ชื่อ</b> เลือกเป้า • <b>หลบ</b> • ❤️ กดใจ 30 ที = หมัดคริ</div>
        <div class="bw-big"></div>
        <div class="bw-res"></div>`;
      updatePanels();
    }
    let lastSec = -1;
    function tickHud(t) {
      if (!el) return;
      const left = Math.max(0, cut.end - t);
      const sec = Math.ceil(left);
      if (sec === lastSec) return;
      lastSec = sec;
      const tm = $('.bw-top .tm');
      if (!tm) return;
      tm.querySelector('b').textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
      tm.querySelector('small').textContent = S.phase === 'fight' ? 'เหลือเวลา' : S.phase === 'result' ? 'ประกาศผล' : 'รอบใหม่ใน';
      tm.classList.toggle('hot', S.phase === 'fight' && sec <= 10);
      if (S.phase === 'fight' && sec <= 5 && sec > 0) {
        big(String(sec), 'count', 0.8);
        sfx('bell', 440);
      }
      if (S.phase === 'result') {
        const r = $('.bw-res .nx');
        if (r) r.textContent = `รอบใหม่ใน ${sec + 5} วิ`;
      }
    }
    function updatePanels() {
      if (!el) return;
      el.classList.toggle('res', S.phase === 'result');
      $('.bw-top .sub').textContent = `รอบ ${S.round} • ยังยืนอยู่ ${S.standing}/${S.total} คน`;
      const pills = [];
      if (S.champs?.[0]) pills.push(`<span>👑 แชมป์รอบก่อน <b>${esc(S.champs[0].n)}</b> ${S.champs[0].k} KO</span>`);
      if (S.best) pills.push(`<span>🏆 สถิติ <b>${esc(S.best.n)}</b> ${S.best.k} KO</span>`);
      if (!pills.length) pills.push('<span>🥊 KO ได้มากสุดเมื่อหมดเวลา = <b>แชมป์</b></span>');
      const pl = $('.bw-pills');
      const ph = pills.join('');
      if (pl._h !== ph) pl.innerHTML = pl._h = ph;
      const rows = (S.rank || []).slice(0, 5);
      $('.bw-rk .rows').innerHTML = rows.length ? rows.map((r, i) => `<div class="r">${['🥇', '🥈', '🥉'][i] || '•'} <span>${esc(r.n)}</span><b>${r.k} KO</b></div>`).join('') : '<div class="emp">ยังไม่มีใคร KO ใคร<br>พิมพ์ “ตี” เลย!</div>';
      const R = $('.bw-res');
      if (S.phase === 'result') {
        const P = S.podium || [];
        const html = P.length
          ? `<h3>🏆 แชมป์รอบที่ ${S.round}</h3><div class="w">${esc(P[0].n)}</div><div class="k">${P[0].k ? `${P[0].k} KO • ` : ''}ดาเมจรวม ${P[0].d}</div>${P.slice(1).map((p, i) => `<div class="o">${['🥈', '🥉'][i]} ${esc(p.n)} — ${p.k} KO</div>`).join('')}<div class="nx"></div>`
          : '<h3>หมดเวลา!</h3><div class="w sm">รอบนี้ยังไม่มีใครตีใครเลย 😅</div><div class="k">รอบหน้าพิมพ์ “ตี” กันนะ</div><div class="nx"></div>';
        if (R._h !== html) R.innerHTML = R._h = html;
        R.classList.add('on');
      } else R.classList.remove('on');
    }

    function css() {
      return `
        #root.theme-${id} #header, #root.theme-${id} #songPanel, #root.theme-${id} #giftPanel, #root.theme-${id} #topPanel, #root.theme-${id} #feed, #root.theme-${id} #hype, #root.theme-${id} #crowd { display: none !important; }
        #root.theme-${id} #avatar, #root.theme-${id} #avatar2d { display: none !important; }
        #root.theme-${id} { --toast-bg: #ffd23f; --toast-glow: #ffd23f; --big-grad: linear-gradient(180deg, #ffffff, #ffd23f); }
        #root.theme-${id} #toasts { top: 1335px; left: 110px; right: 110px; } /* ใต้แถบคำสั่ง ไม่บังสนาม */
        .bw-ui { position: absolute; inset: 0; pointer-events: none; font-family: 'Kanit', 'IBM Plex Sans Thai', sans-serif; color: #fff; z-index: 3; }
        .bw-ui * { box-sizing: border-box; }
        .bw-ui .bw-top { position: absolute; left: 110px; right: 110px; top: 196px; height: 96px; display: flex; align-items: center; gap: 14px; padding: 10px 16px; border-radius: 26px; background: rgba(28,16,40,.86); border: 4px solid #1d1a24; box-shadow: 0 6px 0 rgba(0,0,0,.25); }
        .bw-ui .bw-top .ico { flex: none; width: 70px; height: 70px; border-radius: 20px; display: grid; place-items: center; font-size: 44px; background: linear-gradient(135deg, #ffd23f, #ff5a5f); border: 3px solid #1d1a24; }
        .bw-ui .bw-top .tt { flex: 1; min-width: 0; }
        .bw-ui .bw-top .tt b { display: block; font-size: 36px; font-weight: 800; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .bw-ui .bw-top .tt small { display: block; font-size: 22px; color: #ffe9a8; white-space: nowrap; }
        .bw-ui .bw-top .tm { flex: none; text-align: center; background: #ffd23f; color: #1d1a24; border-radius: 18px; padding: 2px 18px 4px; border: 3px solid #1d1a24; min-width: 150px; }
        .bw-ui .bw-top .tm small { display: block; font-size: 16px; font-weight: 600; }
        .bw-ui .bw-top .tm b { display: block; font-size: 40px; line-height: 1; font-weight: 800; font-variant-numeric: tabular-nums; }
        .bw-ui .bw-top .tm.hot { background: #ff4a4a; color: #fff; animation: bwPulse .5s ease-in-out infinite alternate; }
        @keyframes bwPulse { to { transform: scale(1.08); } }
        .bw-ui .bw-pills { position: absolute; left: 110px; right: 110px; top: 304px; display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
        .bw-ui .bw-pills span { background: rgba(28,16,40,.8); border: 2px solid rgba(255,255,255,.2); border-radius: 999px; padding: 3px 16px; font-size: 21px; white-space: nowrap; }
        .bw-ui .bw-pills b { color: #ffd23f; }
        .bw-ui .bw-ban { position: absolute; left: 50%; top: 360px; transform: translateX(-50%) scale(.6); opacity: 0; max-width: 860px; padding: 8px 26px; border-radius: 18px; font-size: 28px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #1d1a24; background: linear-gradient(90deg, #fff, #ffe9a8); border: 4px solid #1d1a24; box-shadow: 0 6px 0 rgba(0,0,0,.3); transition: transform .25s cubic-bezier(.2,1.6,.4,1), opacity .25s; }
        .bw-ui .bw-ban.on { opacity: 1; transform: translateX(-50%) scale(1); }
        .bw-ui .bw-ban.t2 { background: linear-gradient(90deg, #9be7ff, #b8ffd2); }
        .bw-ui .bw-ban.t3 { background: linear-gradient(90deg, #ff9bd7, #ffd23f); font-size: 31px; }
        .bw-ui .bw-gl { position: absolute; left: 110px; top: 430px; width: 330px; padding: 10px 14px; border-radius: 20px; background: rgba(28,16,40,.72); border: 3px solid rgba(0,0,0,.4); font-size: 16.5px; line-height: 1.38; }
        .bw-ui .bw-gl h4 { margin: 0 0 4px; font-size: 21px; color: #ffd23f; }
        .bw-ui .bw-gl div { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .bw-ui .bw-gl .gicon { width: 26px; height: 26px; vertical-align: -6px; }
        .bw-ui .bw-rk { position: absolute; right: 110px; top: 430px; width: 300px; padding: 10px 14px; border-radius: 20px; background: rgba(28,16,40,.72); border: 3px solid rgba(0,0,0,.4); font-size: 21px; }
        .bw-ui .bw-rk h4 { margin: 0 0 4px; font-size: 21px; color: #ffd23f; }
        .bw-ui .bw-rk .r { display: flex; gap: 6px; align-items: center; white-space: nowrap; }
        .bw-ui .bw-rk .r span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
        .bw-ui .bw-rk .r b { color: #ffd23f; }
        .bw-ui .bw-rk .emp { color: #e8dcf5; font-size: 18px; line-height: 1.35; }
        .bw-ui .bw-feed { position: absolute; right: 110px; top: 640px; width: 300px; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
        .bw-ui .bw-feed div { background: rgba(28,16,40,.8); border-radius: 12px; padding: 2px 12px; font-size: 18px; max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: opacity 1s; }
        .bw-ui .bw-feed div.old { opacity: .45; }
        .bw-ui .bw-feed b { color: #ffd23f; }
        .bw-ui .bw-feed span { color: #ff9b9b; }
        .bw-ui .bw-hint { position: absolute; left: 110px; right: 110px; top: 1262px; text-align: center; font-size: 23px; padding: 8px 14px; border-radius: 18px; background: rgba(28,16,40,.82); border: 3px solid #1d1a24; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .bw-ui .bw-hint b { color: #ffd23f; }
        .bw-ui .bw-big { position: absolute; left: 110px; right: 110px; top: 560px; text-align: center; font-size: 150px; font-weight: 800; font-style: italic; line-height: 1.05; color: #fff; -webkit-text-stroke: 8px #1d1a24; paint-order: stroke fill; text-shadow: 8px 10px 0 #e8212b; opacity: 0; transform: scale(.4) rotate(-6deg); }
        .bw-ui .bw-big span { font-size: .45em; color: #ffd23f; -webkit-text-stroke-width: 6px; }
        .bw-ui .bw-big.on { animation: bwBig .35s cubic-bezier(.2,1.6,.4,1) forwards; }
        .bw-ui .bw-big.count { font-size: 220px; top: 620px; }
        .bw-ui .bw-big.round { font-size: 130px; }
        .bw-ui .bw-big.streak, .bw-ui .bw-big.skill2 { font-size: 90px; text-shadow: 6px 8px 0 #8a3dff; }
        .bw-ui .bw-big.skill3, .bw-ui .bw-big.meteor { font-size: 104px; text-shadow: 6px 8px 0 #c2261e; }
        @keyframes bwBig { to { opacity: 1; transform: scale(1) rotate(-4deg); } }
        .bw-ui .bw-res { position: absolute; left: 160px; right: 160px; top: 400px; text-align: center; padding: 18px 20px 20px; border-radius: 30px; background: rgba(28,16,40,.9); border: 5px solid #ffd23f; box-shadow: 0 0 40px rgba(255,210,63,.4); opacity: 0; transform: translateY(-40px); transition: opacity .4s, transform .5s cubic-bezier(.2,1.6,.4,1); }
        .bw-ui .bw-res.on { opacity: 1; transform: none; }
        .bw-ui .bw-res h3 { margin: 0; font-size: 34px; color: #ffd23f; }
        .bw-ui .bw-res .w { font-size: 72px; font-weight: 800; line-height: 1.15; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .bw-ui .bw-res .w.sm { font-size: 40px; }
        .bw-ui .bw-res .k { font-size: 28px; color: #ffe9a8; }
        .bw-ui .bw-res .o { font-size: 26px; margin-top: 4px; }
        .bw-ui .bw-res .nx { margin-top: 10px; font-size: 22px; color: #c9bfd6; }
        .bw-ui.res .bw-gl, .bw-ui.res .bw-rk, .bw-ui.res .bw-feed, .bw-ui.res .bw-pills, .bw-ui.res .bw-hint { opacity: 0; }
      `;
    }

    const T = {
      bpm: 120,
      fanH: 1,
      ownSafe: true,
      rows: [{ y: 2400, s: 1, n: 80, x0: 0, x1: 1080, jy: 0 }],
      get css() {
        return css();
      },
      fanSvg() {
        return '';
      },
      init(api) {
        API = api;
        window.__brawlDbg = () => ({ S, cut, F, fx: fx.length, parts: parts.length });
        el = document.createElement('div');
        el.className = 'bw-ui';
        document.getElementById('ui').appendChild(el);
        renderStatic();
        try {
          const sk = window.io?.();
          sk?.emit('mg:get', null, (s) => {
            if (s) apply(s);
            sk.disconnect();
          });
        } catch {}
      },
      refresh() {
        if (el) renderStatic();
      },
      drawStatic(cx) {
        cx.fillStyle = '#5cc4ff';
        cx.fillRect(0, 0, W, H);
      },
      drawBg(c, _tt, _bt, _api, now) {
        frame(c, (now ?? performance.now()) / 1000);
      },
      effects: new Proxy({}, {
        get(_o, key) {
          return meta().effects?.[key] ? () => {} : undefined;
        },
        has: (_o, key) => !!meta().effects?.[key],
        ownKeys: () => Object.keys(meta().effects || {}),
        getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
      }),
      onEvent(d) {
        if (d.type === 'mgState') return apply(d);
        if (d.type === 'mg') return onEv(d);
      },
      onLike() {},
    };
    return T;
  };
})();
