/* เกมปีนขึ้นฟ้า — ภาพฝั่งหน้าเวที (ธีม climbcity ปีนตึกนีออน / climbsky เกาะลอยฟ้า)
 * เซิร์ฟเวอร์ (mg/climb.js) ตัดสินความสูง/การแกล้งทั้งหมด → ไฟล์นี้วาดตาม: โลกแนวตั้งหน่วยเป็นเมตร กล้องตามน้องเด้ง
 * วาดบนแคนวาสพื้นหลัง 1080x1920 ทุกเฟรม: ท้องฟ้าไล่สีตามด่าน → ฉากไกล/กลาง (พารัลแลกซ์) → ตึก/เกาะ → แท่น → ของแกล้ง → น้องเด้ง → อนุภาค
 * กรอบข้อความทั้งหมดอยู่ในพื้นที่ที่มือถือคนดูเห็นครบ (ข้าง 110 • บน 190 • ล่างไม่เกิน ~1330) ส่วนล่างของจอเป็นแค่ฉาก
 */
(() => {
  'use strict';
  const W = 1080;
  const H = 1920;
  const PX = 64; // พิกเซลต่อเมตร
  const STEP = 2.4; // ระยะแท่นแนวตั้ง (เมตร)
  const HERO_Y = 1250; // ระดับเท้าน้องเด้งบนจอ (ใต้กรอบของขวัญ ตามดีไซน์)
  const TAU = Math.PI * 2;
  const meta = () => window.__stage?.api?.meta || {};
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const ease = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
  const lerp = (a, b, k) => a + (b - a) * k;
  const hsh = (n) => {
    let h = (n | 0) ^ 0x9e3779b9;
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const hex2 = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mix = (a, b, k) => {
    const A = hex2(a);
    const B = hex2(b);
    return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',')})`;
  };
  const cache = new Map();
  function mk(key, w, h, fn) {
    let cv = cache.get(key);
    if (cv) return cv;
    cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    fn(cv.getContext('2d'), w, h);
    cache.set(key, cv);
    return cv;
  }
  const glowImg = (rgb) =>
    mk('g' + rgb, 128, 128, (x) => {
      const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, `rgba(${rgb},1)`);
      g.addColorStop(0.35, `rgba(${rgb},.42)`);
      g.addColorStop(1, `rgba(${rgb},0)`);
      x.fillStyle = g;
      x.fillRect(0, 0, 128, 128);
    });
  const rr = (c, x, y, w, h, r) => {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  };

  // ================================================================ ฉาก 2 แบบ × 5 ด่าน
  const SCENES = {
    city: {
      hero: '#ff8a3d', name: 'ปีนตึกนีออน', goal: 'ยอดตึก',
      sky: [['#2a0f4a', '#6a1f7a', '#ff6a7a'], ['#0b0726', '#2a1150', '#7a2a8a'], ['#070b2a', '#1d1f5a', '#4a2a8a'], ['#06122e', '#123064', '#3a5a9a'], ['#02020a', '#0a0a26', '#1e1046']],
      plat: { norm: '#5ef0ff', crack: '#ff9a62', spring: '#3ddc84', move: '#c9a6ff' },
      ui: { panel: 'rgba(18,12,48,.84)', ink: '#ffffff', a1: '#ff4fd8', a2: '#7c5cff', soft: '#ffd6f5', good: '#3ddc84' },
    },
    sky: {
      hero: '#ff6fae', name: 'เกาะลอยฟ้า', goal: 'ปราสาท',
      sky: [['#6cc8ff', '#b8e6ff', '#fff3d9'], ['#5fb8d8', '#bfe8d8', '#fff0c8'], ['#8fbfff', '#d8ebff', '#ffffff'], ['#ff9fc8', '#ffd0a0', '#bfe4ff'], ['#ffc070', '#ffe0b0', '#fff4e0']],
      plat: { norm: '#6ccf5a', crack: '#d9c08a', spring: '#ff5e5e', move: '#ffffff' },
      ui: { panel: 'rgba(255,255,255,.88)', ink: '#2a1a3a', a1: '#ffb020', a2: '#ff8fb5', soft: '#ff6fae', good: '#2fb36b' },
    },
  };

  window.makeClimbTheme = function makeClimbTheme(id) {
    let API = null;
    let el = null;
    const S = { h: 0, best: 0, allBest: 0, top: 500, zone: 100, check: 50, rate: 1.6, shield: 0, hub: 0, hubMax: 20, likes: 0, likeMax: 500, fog: 0, rain: 0, pranks: [], helps: [], round: 1 };
    let stAt = 0;
    let disp = 0; // ความสูงที่วาด (เมตร)
    let cam = 0;
    let anim = null; // { type: knock/fall/rocket/teleport, ... }
    let lastT = 0;
    let shake = 0;
    let flash = 0;
    let flashCol = '255,255,255';
    let fogUntil = 0;
    let rainUntil = 0;
    let stormUntil = 0; // เป้าเพชรครบ = พายุจอมแกล้ง (ปีนช้า)
    let stormAt = 0;
    let lightning = 0;
    let shieldPop = 0;
    const parts = [];
    const props = []; // ของแกล้งในโลก (กล้วย มือ นก ระเบิด) — วาดในพิกัดโลก
    const broken = new Map(); // แท่นที่พัง (k → เวลาพัง)
    const scn = () => SCENES[meta().hud?.climb?.scene] || SCENES.city;
    const zones = () => meta().hud?.climb?.zones || ['ด่าน 1', 'ด่าน 2', 'ด่าน 3', 'ด่าน 4', 'ด่าน 5'];

    // ---------------------------------------------------------------- แท่น (สุ่มคงที่ต่อรอบ)
    const seed = () => (S.round || 1) * 7919;
    function plat(k) {
      const r = (i) => hsh(seed() + k * 31 + i);
      // ทางปีนอยู่ฝั่งขวาของตึก (x 530–770) — ฝั่งซ้ายมีกรอบข้อความ ขวาสุดมีแถบความสูง
      const prev = k > 0 ? 530 + hsh(seed() + (k - 1) * 31) * 240 : 650;
      let x = 530 + r(0) * 240;
      if (Math.abs(x - prev) < 90) x = x > 650 ? x - 120 : x + 120;
      const z = Math.min(4, Math.floor((k * STEP) / (S.zone || 100)));
      const q = r(2);
      const kind = k < 2 ? 'norm' : q < 0.1 + z * 0.035 ? 'crack' : q < 0.18 + z * 0.035 ? 'spring' : q < 0.26 + z * 0.06 ? 'move' : 'norm';
      return { k, x, w: 150 + r(3) * 40, kind, ph: r(4) * TAU };
    }
    const platX = (p, t) => (p.kind === 'move' ? p.x + Math.sin(t * 1.2 + p.ph) * 70 : p.x);
    const sy = (m) => HERO_Y - (m - cam) * PX; // เมตร → พิกัดจอ

    // ---------------------------------------------------------------- ตำแหน่งน้องเด้งจากความสูง (กระโดดทีละแท่น)
    const TOPX = 600; // กลางแท่นยอด
    const topK = () => Math.floor(((S.top || 500) - 1.5) / STEP); // แท่นสุดท้ายก่อนแท่นยอด
    function heroPos(m, t) {
      const top = S.top || 500;
      if (m >= top - 0.01) return { x: TOPX, m: top, air: false, p: 0, k: topK() + 1 };
      const k = Math.min(Math.floor(m / STEP), topK());
      const last = k === topK(); // กระโดดขึ้นแท่นยอด
      const m0 = k * STEP;
      const span = last ? top - m0 : STEP;
      const f = clamp((m - m0) / span, 0, 1);
      const a = plat(k);
      const p = clamp((f - 0.22) / 0.78, 0, 1); // ยืน 22% แล้วกระโดด
      const hi = a.kind === 'spring' ? 2.6 : 1.5;
      return {
        x: lerp(platX(a, t), last ? TOPX : platX(plat(k + 1), t), ease(p)),
        m: m0 + span * ease(p) + Math.sin(Math.PI * p) * hi,
        air: p > 0.02 && p < 0.98,
        p, k,
      };
    }

    // ================================================================ วาดฉาก
    function drawSky(c, t) {
      const sc = scn();
      const zf = clamp(cam / (S.zone || 100), 0, 4.999);
      const z = Math.floor(zf);
      const k = clamp((zf - z - 0.82) / 0.18, 0, 1); // ไล่สีช่วงท้ายของด่าน
      const A = sc.sky[z];
      const B = sc.sky[Math.min(4, z + 1)];
      const g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, mix(A[0], B[0], k));
      g.addColorStop(0.55, mix(A[1], B[1], k));
      g.addColorStop(1, mix(A[2], B[2], k));
      c.fillStyle = g;
      c.fillRect(-80, -80, W + 160, H + 160); // เผื่อขอบตอนจอสั่น
      return zf;
    }
    // ดาว (เมือง: ทุกด่าน มากขึ้นเรื่อย ๆ • เกาะ: เฉพาะด่านท้ายตอนพลบค่ำไม่มี)
    function drawStars(c, t, zf, n, alpha) {
      if (alpha <= 0) return;
      for (let i = 0; i < n; i++) {
        const x = hsh(i * 3 + 1) * W;
        const y = ((hsh(i * 3 + 2) * H + cam * PX * 0.04) % H + H) % H;
        const tw = 0.5 + 0.5 * Math.sin(t * (1 + hsh(i) * 3) + i);
        c.globalAlpha = alpha * (0.35 + 0.65 * tw);
        c.fillStyle = '#ffffff';
        const s = hsh(i * 7) < 0.1 ? 3 : 2;
        c.fillRect(x, y, s, s);
      }
      c.globalAlpha = 1;
    }
    // ของประดับฉาก: วางตามความสูงในโลก + พารัลแลกซ์ (p < 1 = ไกล เลื่อนช้า)
    function decoY(m, p) {
      return HERO_Y - (m - cam) * PX * p;
    }
    function drawCity(c, t, zf) {
      // ---- ไฟสปอตไลต์กวาดฟ้าจากเมืองด้านล่าง (ตลาดนัด–ดาดฟ้า)
      const beamA = clamp(1 - (zf - 1.8) / 0.8, 0, 1);
      if (beamA > 0) {
        const by = Math.min(H + 80, decoY(0, 0.22) + 160);
        c.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 4; i++) {
          const bx = [90, 330, 760, 1000][i];
          const a = -Math.PI / 2 + Math.sin(t * (0.35 + i * 0.08) + i * 1.7) * 0.45;
          const g = c.createLinearGradient(bx, by, bx + Math.cos(a) * 1500, by + Math.sin(a) * 1500);
          const col = i % 2 ? '255,79,216' : '94,240,255';
          g.addColorStop(0, `rgba(${col},${0.22 * beamA})`);
          g.addColorStop(1, `rgba(${col},0)`);
          c.fillStyle = g;
          c.beginPath();
          c.moveTo(bx, by);
          c.lineTo(bx + Math.cos(a - 0.06) * 1600, by + Math.sin(a - 0.06) * 1600);
          c.lineTo(bx + Math.cos(a + 0.06) * 1600, by + Math.sin(a + 0.06) * 1600);
          c.fill();
        }
        c.globalCompositeOperation = 'source-over';
      }
      // ---- ไกล: ตึกเงาพร้อมหน้าต่าง (ตลาดนัด–ดาดฟ้า) จางลงเมื่อสูง
      const farA = clamp(1 - (zf - 2.2) / 0.8, 0, 1);
      if (farA > 0) {
        c.globalAlpha = farA;
        for (let L = 0; L < 2; L++) {
          const p = L ? 0.12 : 0.22;
          const base = decoY(0, p) + 120;
          for (let i = 0; i < 16; i++) {
            const w = 70 + hsh(i * 13 + L) * 90;
            const x = -40 + i * 74 + hsh(i * 5 + L) * 30;
            const hh = (500 + hsh(i * 7 + L * 9) * 900) * (L ? 1.4 : 1);
            c.fillStyle = L ? '#160b33' : '#22114a';
            c.fillRect(x, base - hh, w, hh + 2000);
            c.fillStyle = L ? 'rgba(255,214,120,.22)' : 'rgba(120,220,255,.3)';
            for (let yy = base - hh + 18; yy < Math.min(H, base + 2000); yy += 30) {
              if (yy < -20) continue;
              for (let xx = x + 8; xx < x + w - 12; xx += 20) if (hsh(xx * 3 + yy * 7 + L) < 0.38) c.fillRect(xx, yy, 9, 14);
            }
          }
        }
        c.globalAlpha = 1;
      }
      // ---- พระจันทร์ (ดาดฟ้า–เหนือเมฆ)
      const moonA = clamp(Math.min(zf - 1.6, 4.2 - zf), 0, 1);
      if (moonA > 0) {
        c.globalAlpha = moonA;
        c.globalCompositeOperation = 'lighter';
        c.drawImage(glowImg('255,240,200'), 760, 210, 260, 260);
        c.globalCompositeOperation = 'source-over';
        c.fillStyle = '#fff4d6';
        c.beginPath();
        c.arc(890, 340, 64, 0, TAU);
        c.fill();
        c.fillStyle = 'rgba(200,190,160,.35)';
        c.beginPath();
        c.arc(870, 326, 12, 0, TAU);
        c.arc(910, 360, 8, 0, TAU);
        c.fill();
        c.globalAlpha = 1;
      }
      // ---- ทะเลเมฆ (เหนือเมฆ)
      const cloudA = clamp(Math.min(zf - 2.6, 4.4 - zf) * 1.4, 0, 1);
      if (cloudA > 0) {
        for (let L = 0; L < 3; L++) {
          const y0 = decoY(300 + L * 18, 0.5 + L * 0.2);
          c.globalAlpha = cloudA * (0.45 + L * 0.18);
          c.fillStyle = L === 2 ? '#d9e4ff' : L ? '#9fb3ea' : '#6f80c8';
          c.beginPath();
          for (let i = -1; i < 12; i++) {
            const x = i * 110 + ((t * (8 + L * 6)) % 110);
            c.moveTo(x, y0);
            c.arc(x, y0, 70 + hsh(i + L * 20) * 40, Math.PI, 0);
          }
          c.rect(-100, y0, W + 200, 900);
          c.fill();
        }
        c.globalAlpha = 1;
      }
      // ---- อวกาศ: ดาวเคราะห์มีวงแหวน + ดาวเทียม + แสงออโรร่า
      const spaceA = clamp((zf - 3.6) / 0.6, 0, 1);
      if (spaceA > 0) {
        c.globalAlpha = spaceA;
        const py = decoY(455, 0.35);
        c.globalCompositeOperation = 'lighter';
        c.drawImage(glowImg('160,110,255'), 40, py - 190, 380, 380);
        c.globalCompositeOperation = 'source-over';
        const g = c.createRadialGradient(200, py - 30, 10, 230, py, 110);
        g.addColorStop(0, '#ffb3e6');
        g.addColorStop(1, '#6a3aa8');
        c.fillStyle = g;
        c.beginPath();
        c.arc(230, py, 100, 0, TAU);
        c.fill();
        c.strokeStyle = 'rgba(255,210,150,.85)';
        c.lineWidth = 9;
        c.beginPath();
        c.ellipse(230, py, 175, 38, -0.3, 0, TAU);
        c.stroke();
        // ออโรร่า
        for (let i = 0; i < 3; i++) {
          c.strokeStyle = `rgba(${i ? '94,240,255' : '61,220,132'},.18)`;
          c.lineWidth = 60 - i * 14;
          c.beginPath();
          for (let x = -20; x <= W + 20; x += 40) {
            const y = decoY(430 + i * 8, 0.3) + Math.sin(x * 0.006 + t * 0.6 + i) * 60;
            x < 0 ? c.moveTo(x, y) : c.lineTo(x, y);
          }
          c.stroke();
        }
        // ดาวเทียม
        const sx = (t * 40) % (W + 300) - 150;
        const sy2 = decoY(470, 0.4);
        c.fillStyle = '#c8d0e0';
        c.fillRect(sx - 14, sy2 - 10, 28, 20);
        c.fillStyle = '#3a6ad8';
        c.fillRect(sx - 60, sy2 - 6, 40, 12);
        c.fillRect(sx + 20, sy2 - 6, 40, 12);
        c.fillStyle = Math.sin(t * 6) > 0 ? '#ff5e5e' : '#5a1a1a';
        c.fillRect(sx - 3, sy2 - 16, 6, 6);
        c.globalAlpha = 1;
      }
    }
    // ตึก (เมือง): ตัวตึก + หน้าต่าง + แถบนีออน + ป้ายชั้น ติดกับโลก (เลื่อนตามกล้องเต็มที่)
    function drawTower(c, t, zf) {
      const x0 = 250;
      const x1 = 830;
      const trussA = clamp((zf - 2.8) / 0.8, 0, 1); // เหนือเมฆ/อวกาศ = โครงลิฟต์อวกาศโปร่ง
      c.globalAlpha = 1 - trussA * 0.75;
      const g = c.createLinearGradient(x0, 0, x1, 0);
      g.addColorStop(0, '#171836');
      g.addColorStop(0.5, '#2b2e62');
      g.addColorStop(1, '#171836');
      c.fillStyle = g;
      c.fillRect(x0, 0, x1 - x0, H);
      // หน้าต่าง (แถวละ 1.5 ม.)
      const m0 = cam - (H - HERO_Y) / PX - 2;
      const m1 = cam + HERO_Y / PX + 2;
      for (let r = Math.floor(m0 / 1.5); r <= m1 / 1.5; r++) {
        const y = sy(r * 1.5);
        for (let i = 0; i < 9; i++) {
          const q = hsh(r * 17 + i * 5);
          c.fillStyle = q < 0.45 ? 'rgba(120,220,255,.35)' : q < 0.55 ? 'rgba(255,120,220,.4)' : 'rgba(255,255,255,.05)';
          c.fillRect(x0 + 24 + i * 62, y - 40, 36, 52);
        }
      }
      c.globalAlpha = 1;
      // แถบนีออนขอบตึก
      c.globalCompositeOperation = 'lighter';
      for (const [x, col] of [[x0, '94,240,255'], [x1, '255,79,216']]) {
        c.fillStyle = `rgba(${col},.85)`;
        c.fillRect(x - 3, 0, 6, H);
        c.fillStyle = `rgba(${col},.18)`;
        c.fillRect(x - 18, 0, 36, H);
      }
      c.globalCompositeOperation = 'source-over';
      // โครงลิฟต์อวกาศ
      if (trussA > 0) {
        c.globalAlpha = trussA;
        c.strokeStyle = 'rgba(160,200,255,.55)';
        c.lineWidth = 4;
        for (let r = Math.floor(m0 / 3); r <= m1 / 3; r++) {
          const y = sy(r * 3);
          c.beginPath();
          c.moveTo(x0, y);
          c.lineTo(x1, y - 3 * PX);
          c.moveTo(x1, y);
          c.lineTo(x0, y - 3 * PX);
          c.stroke();
        }
        c.globalAlpha = 1;
      }
      // ป้ายชั้น ทุก 10 ม. (ฝั่งซ้ายนอกตึก — ไม่ทับแท่น)
      c.font = '800 22px "IBM Plex Sans Thai", sans-serif';
      c.textAlign = 'center';
      for (let m = Math.ceil(m0 / 10) * 10; m <= m1; m += 10) {
        if (m <= 0 || m % S.check === 0) continue;
        const y = sy(m);
        c.fillStyle = 'rgba(10,8,30,.75)';
        rr(c, x0 + 6, y - 18, 74, 30, 10);
        c.fill();
        c.fillStyle = '#9fe9ff';
        c.fillText(`${m} ม.`, x0 + 43, y + 4);
      }
      c.textAlign = 'left';
    }
    function drawSkyWorld(c, t, zf) {
      // ---- แสงอาทิตย์ส่องเป็นลำ (ทุ่งดอกไม้–ทะเลเมฆ)
      const sunA = clamp(1 - (zf - 2.6) / 0.8, 0, 1);
      if (sunA > 0) {
        const sx = 860;
        const sy0 = 120;
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = sunA;
        c.drawImage(glowImg('255,244,200'), sx - 260, sy0 - 260, 520, 520);
        for (let i = 0; i < 9; i++) {
          const a = Math.PI * 0.55 + i * 0.13 + Math.sin(t * 0.2 + i) * 0.03;
          c.fillStyle = `rgba(255,248,215,${0.035 + (i % 3) * 0.015})`;
          c.beginPath();
          c.moveTo(sx, sy0);
          c.lineTo(sx + Math.cos(a - 0.035) * 2300, sy0 + Math.sin(a - 0.035) * 2300);
          c.lineTo(sx + Math.cos(a + 0.035) * 2300, sy0 + Math.sin(a + 0.035) * 2300);
          c.fill();
        }
        c.globalAlpha = 1;
        c.globalCompositeOperation = 'source-over';
      }
      // ---- เมฆลอยหลายชั้น (ทุกด่าน)
      for (let L = 0; L < 3; L++) {
        const p = 0.18 + L * 0.22;
        const n = 7;
        for (let i = 0; i < n * 6; i++) {
          const m = i * (90 / n) + hsh(i * 11 + L) * 8;
          const y = decoY(m, p);
          if (y < -200 || y > H + 200) continue;
          const x = ((hsh(i * 7 + L) * (W + 400) + t * (6 + L * 5)) % (W + 400)) - 200;
          const s = (0.6 + hsh(i * 3 + L) * 0.9) * (0.7 + L * 0.25);
          c.globalAlpha = 0.45 + L * 0.2;
          c.fillStyle = '#ffffff';
          c.beginPath();
          for (const [dx, dy, r] of [[0, 0, 60], [55, -22, 50], [105, 0, 55], [50, 16, 55]]) {
            c.moveTo(x + dx * s + r * s, y + dy * s);
            c.arc(x + dx * s, y + dy * s, r * s, 0, TAU);
          }
          c.fill();
        }
      }
      c.globalAlpha = 1;
      // ---- ผีเสื้อบินวน (ทุ่งดอกไม้–ป่าเห็ด)
      const bfA = clamp(1 - (zf - 1.6) / 0.6, 0, 1);
      if (bfA > 0) {
        for (let i = 0; i < 7; i++) {
          const x = ((hsh(i * 13) * (W + 200) + t * (30 + i * 9)) % (W + 200)) - 100;
          const y = 300 + hsh(i * 17) * 1200 + Math.sin(t * 1.3 + i) * 50;
          const f = Math.abs(Math.sin(t * 14 + i * 2));
          c.globalAlpha = bfA;
          c.fillStyle = ['#ff8fb5', '#ffd23f', '#c9a6ff', '#5ab0ff'][i % 4];
          c.beginPath();
          c.ellipse(x - 9 * f, y, 10 * f + 2, 12, -0.3, 0, TAU);
          c.ellipse(x + 9 * f, y, 10 * f + 2, 12, 0.3, 0, TAU);
          c.fill();
          c.fillStyle = '#3a2a4a';
          c.fillRect(x - 1.5, y - 9, 3, 18);
        }
        c.globalAlpha = 1;
      }
      // ---- ทุ่งดอกไม้ (ด่าน 1): เนินหญ้าพร้อมดอกไม้ด้านล่าง
      const y0 = decoY(0, 1) + 60;
      if (y0 < H + 300) {
        c.fillStyle = '#7fd36a';
        c.beginPath();
        c.moveTo(0, y0);
        for (let x = 0; x <= W; x += 60) c.quadraticCurveTo(x + 30, y0 - 40 - hsh(x) * 30, x + 60, y0);
        c.lineTo(W, H + 400);
        c.lineTo(0, H + 400);
        c.fill();
        for (let i = 0; i < 40; i++) {
          const x = hsh(i * 9) * W;
          const yy = y0 + 20 + hsh(i * 4) * 160;
          c.fillStyle = ['#ff8fb5', '#ffd23f', '#ffffff', '#c9a6ff'][i % 4];
          c.beginPath();
          c.arc(x, yy, 7, 0, TAU);
          c.fill();
        }
      }
      // ---- ป่าเห็ด (ด่าน 2): เห็ดยักษ์สองข้าง
      for (let i = 0; i < 6; i++) {
        const m = 110 + i * 15;
        const y = decoY(m, 0.6);
        if (y < -300 || y > H + 300) continue;
        const left = i % 2 === 0;
        const x = left ? 60 + hsh(i) * 80 : W - 60 - hsh(i) * 80;
        c.fillStyle = '#fff3e0';
        c.fillRect(x - 16, y - 120, 32, 140);
        c.fillStyle = ['#ff5e5e', '#ff8a3d', '#c9a6ff'][i % 3];
        c.beginPath();
        c.ellipse(x, y - 120, 90, 54, 0, Math.PI, 0);
        c.fill();
        c.fillStyle = 'rgba(255,255,255,.9)';
        for (const [dx, dy] of [[-40, -140], [10, -160], [45, -135]]) {
          c.beginPath();
          c.arc(x + dx, y + dy, 11, 0, TAU);
          c.fill();
        }
      }
      // ---- สะพานรุ้ง (ด่าน 4)
      const rbA = clamp(Math.min(zf - 2.7, 4.3 - zf) * 1.3, 0, 1);
      if (rbA > 0) {
        const y = decoY(360, 0.45);
        c.globalAlpha = rbA * 0.7;
        ['#ff5e5e', '#ff9a3d', '#ffd23f', '#3ddc84', '#5ab0ff', '#9a6aff'].forEach((col, i) => {
          c.strokeStyle = col;
          c.lineWidth = 22;
          c.beginPath();
          c.arc(540, y + 500, 620 - i * 22, Math.PI * 1.05, Math.PI * 1.95);
          c.stroke();
        });
        c.globalAlpha = 1;
      }
      // ---- ปราสาทบนเมฆ (ด่าน 5 / ยอด)
      const caA = clamp((zf - 3.4) / 0.7, 0, 1);
      if (caA > 0) {
        const y = decoY(S.top || 500, 1); // ตั้งอยู่บนแท่นยอดพอดี
        c.globalAlpha = caA;
        c.globalCompositeOperation = 'lighter';
        c.drawImage(glowImg('255,236,180'), 240, y - 520, 600, 600);
        c.globalCompositeOperation = 'source-over';
        c.drawImage(castleImg(), 600 - 240, y - 666 * 0.8, 480, 576);
        // ธงโบกบนยอดหอ
        for (const [fx, fy] of [[600 - 6, y - 500], [452 - 6, y - 405], [748 - 6, y - 405]]) {
          c.fillStyle = '#ffd23f';
          c.beginPath();
          c.moveTo(fx + 6, fy);
          c.quadraticCurveTo(fx + 30, fy + 4 + Math.sin(t * 6 + fx) * 6, fx + 52, fy + 10);
          c.lineTo(fx + 6, fy + 26);
          c.fill();
        }
        c.globalAlpha = 1;
      }
    }

    // ปราสาทบนเมฆ (สไปรต์ 600x720: ฐานเมฆที่ y=666)
    const castleImg = () =>
      mk('castle', 600, 720, (x) => {
        x.translate(0, 100);
        const wall = (px, py, w, h) => {
          const g = x.createLinearGradient(px, 0, px + w, 0);
          g.addColorStop(0, '#fff7fb');
          g.addColorStop(1, '#f1d7f5');
          x.fillStyle = g;
          x.fillRect(px, py, w, h);
          x.strokeStyle = '#b77fc4';
          x.lineWidth = 4;
          x.strokeRect(px, py, w, h);
          // ใบเสมา
          x.fillStyle = '#f1d7f5';
          for (let i = 0; i < w - 10; i += 24) {
            x.fillRect(px + i + 2, py - 14, 14, 14);
            x.strokeRect(px + i + 2, py - 14, 14, 14);
          }
        };
        const roof = (cx, py, w, h) => {
          const g = x.createLinearGradient(0, py - h, 0, py);
          g.addColorStop(0, '#ff6fae');
          g.addColorStop(1, '#c94f9a');
          x.fillStyle = g;
          x.beginPath();
          x.moveTo(cx - w / 2 - 12, py);
          x.lineTo(cx, py - h);
          x.lineTo(cx + w / 2 + 12, py);
          x.closePath();
          x.fill();
          x.strokeStyle = '#8a2f6a';
          x.lineWidth = 3;
          x.stroke();
          x.fillStyle = '#7a5a2a';
          x.fillRect(cx - 2, py - h - 30, 4, 32);
        };
        const win = (cx, py) => {
          x.fillStyle = '#5ab0ff';
          rr(x, cx - 12, py, 24, 34, 12);
          x.fill();
          x.strokeStyle = '#b77fc4';
          x.lineWidth = 3;
          x.stroke();
        };
        wall(140, 300, 320, 260); // ตัวปราสาท
        wall(70, 210, 90, 350); // หอซ้าย
        wall(440, 210, 90, 350); // หอขวา
        wall(250, 120, 100, 440); // หอกลาง
        roof(115, 210, 90, 120);
        roof(485, 210, 90, 120);
        roof(300, 120, 100, 150);
        win(115, 260);
        win(485, 260);
        win(300, 180);
        win(200, 360);
        win(400, 360);
        // ประตูทอง
        x.fillStyle = '#ffd23f';
        rr(x, 262, 440, 76, 120, 38);
        x.fill();
        x.strokeStyle = '#b8860b';
        x.lineWidth = 4;
        x.stroke();
        // ฐานเมฆ
        x.fillStyle = '#ffffff';
        x.beginPath();
        for (let i = 0; i < 9; i++) {
          const cx = 30 + i * 68;
          const r = 46 + (i % 3) * 12;
          x.moveTo(cx + r, 566);
          x.arc(cx, 566, r, 0, TAU);
        }
        x.fill();
      });

    // ---------------------------------------------------------------- แท่น
    function platSprite(sceneKey, kind) {
      return mk(`p:${sceneKey}:${kind}`, 220, 120, (x) => {
        const sc = SCENES[sceneKey];
        const col = sc.plat[kind];
        x.translate(110, 40);
        if (sceneKey === 'city') {
          x.shadowColor = col;
          x.shadowBlur = 20;
          x.fillStyle = '#20224a';
          rr(x, -85, 0, 170, 26, 10);
          x.fill();
          x.shadowBlur = 0;
          x.fillStyle = col;
          rr(x, -85, 0, 170, 7, 4);
          x.fill();
          x.fillStyle = 'rgba(255,255,255,.08)';
          for (let i = -70; i < 80; i += 28) x.fillRect(i, 11, 14, 8);
          if (kind === 'crack') {
            x.strokeStyle = col;
            x.lineWidth = 3;
            x.beginPath();
            x.moveTo(-10, 2);
            x.lineTo(2, 14);
            x.lineTo(-6, 24);
            x.moveTo(30, 3);
            x.lineTo(22, 18);
            x.stroke();
          }
        } else {
          // เกาะลอย: ดินสามเหลี่ยม + หญ้า (+ ของตกแต่ง)
          x.fillStyle = '#a8703f';
          x.beginPath();
          x.moveTo(-85, 12);
          x.lineTo(85, 12);
          x.lineTo(40, 58);
          x.lineTo(0, 78);
          x.lineTo(-42, 54);
          x.closePath();
          x.fill();
          x.fillStyle = '#8a5a30';
          x.beginPath();
          x.moveTo(0, 78);
          x.lineTo(40, 58);
          x.lineTo(85, 12);
          x.lineTo(20, 20);
          x.fill();
          if (kind === 'move') {
            // ก้อนเมฆ
            x.clearRect(-110, -40, 220, 160);
            x.fillStyle = '#ffffff';
            x.beginPath();
            for (const [dx, dy, r] of [[-50, 14, 30], [-10, 4, 38], [40, 12, 32], [10, 22, 34]]) {
              x.moveTo(dx + r, dy);
              x.arc(dx, dy, r, 0, TAU);
            }
            x.fill();
            return;
          }
          x.fillStyle = col;
          rr(x, -88, 0, 176, 22, 11);
          x.fill();
          x.fillStyle = 'rgba(255,255,255,.25)';
          rr(x, -80, 2, 160, 6, 3);
          x.fill();
          if (kind === 'crack') {
            x.strokeStyle = '#7a5a2a';
            x.lineWidth = 3;
            x.beginPath();
            x.moveTo(-20, 0);
            x.lineTo(-8, 30);
            x.lineTo(-16, 50);
            x.stroke();
          }
          if (kind === 'norm') {
            for (let i = 0; i < 3; i++) {
              x.fillStyle = ['#ff8fb5', '#ffd23f', '#ffffff'][i];
              x.beginPath();
              x.arc(-40 + i * 36, -4, 6, 0, TAU);
              x.fill();
            }
          }
        }
        if (kind === 'spring') {
          x.strokeStyle = '#e9e9f2';
          x.lineWidth = 4;
          x.beginPath();
          for (let k = 0; k < 5; k++) {
            x.moveTo(-14, -4 - k * 6);
            x.lineTo(14, -7 - k * 6);
          }
          x.stroke();
          x.fillStyle = col;
          rr(x, -24, -38, 48, 9, 4);
          x.fill();
        }
      });
    }
    function drawPlatforms(c, t) {
      const sk = meta().hud?.climb?.scene === 'sky' ? 'sky' : 'city';
      const m0 = cam - (H - HERO_Y) / PX - 3;
      const m1 = cam + HERO_Y / PX + 3;
      // ชั้นเซฟทุก 50 ม. (กว้างเต็มตึก มีธง)
      const ck = S.check || 50;
      for (let m = Math.max(ck, Math.ceil(m0 / ck) * ck); m <= Math.min(m1, (S.top || 500) - 1); m += ck) {
        const y = sy(m) + 4;
        c.save();
        c.shadowColor = '#ffd23f';
        c.shadowBlur = 22;
        c.fillStyle = sk === 'city' ? '#2a2246' : '#b07a4a';
        rr(c, 262, y, 556, 22, 10);
        c.fill();
        c.shadowBlur = 0;
        c.fillStyle = '#ffd23f';
        rr(c, 262, y, 556, 6, 3);
        c.fill();
        c.restore();
        const fx = 790;
        c.fillStyle = '#f4f4f6';
        c.fillRect(fx, y - 90, 5, 90);
        c.fillStyle = '#ffd23f';
        c.beginPath();
        c.moveTo(fx + 5, y - 90);
        c.quadraticCurveTo(fx + 40, y - 82 + Math.sin(t * 5) * 6, fx + 66, y - 76);
        c.lineTo(fx + 5, y - 58);
        c.fill();
        c.font = '800 22px "IBM Plex Sans Thai", sans-serif';
        c.fillStyle = sk === 'city' ? '#ffe9a8' : '#5a3a10';
        c.fillText(`🚩 เซฟ ${m} ม.`, 280, y + 46);
      }
      // ยอด (500 ม.)
      const ty = sy(S.top || 500);
      if (ty > -200 && ty < H + 50) {
        if (S.atTop) {
          // ขึ้นถึงยอด: ลำแสงทองพุ่งขึ้นฟ้า
          c.globalCompositeOperation = 'lighter';
          const g = c.createLinearGradient(0, ty, 0, ty - 1400);
          g.addColorStop(0, 'rgba(255,220,120,.55)');
          g.addColorStop(1, 'rgba(255,220,120,0)');
          c.fillStyle = g;
          const bw = 150 + Math.sin(t * 5) * 20;
          c.fillRect(TOPX - bw / 2, ty - 1400, bw, 1400);
          c.drawImage(glowImg('255,220,120'), TOPX - 260, ty - 200, 520, 300);
          c.globalCompositeOperation = 'source-over';
        }
        c.save();
        c.shadowColor = '#ffd23f';
        c.shadowBlur = 30;
        c.fillStyle = '#ffd23f';
        rr(c, TOPX - 240, ty, 480, 26, 12);
        c.fill();
        c.restore();
        c.font = '900 34px "IBM Plex Sans Thai", sans-serif';
        c.textAlign = 'center';
        c.fillStyle = '#fff';
        c.strokeStyle = 'rgba(0,0,0,.5)';
        c.lineWidth = 6;
        const txt = `🏆 ${scn().goal} ${S.top || 500} ม.`;
        c.strokeText(txt, TOPX, ty + 76);
        c.fillText(txt, TOPX, ty + 76);
        c.textAlign = 'left';
      }
      for (let k = Math.max(0, Math.floor(m0 / STEP)); k <= m1 / STEP && k <= topK(); k++) {
        const p = plat(k);
        const bt = broken.get(k);
        if (bt) {
          // แท่นที่พัง/ระเบิด หายไป 6 วินาทีแล้วงอกกลับมา
          if (t - bt > 6) broken.delete(k);
          else if (t - bt > 0.3) continue;
        }
        const x = platX(p, t);
        const y = sy(k * STEP);
        const img = platSprite(sk, p.kind);
        const sw = p.w / 170;
        c.drawImage(img, x - 110 * sw, y - 40, 220 * sw, 120);
        if (sk === 'city' && p.kind === 'move') {
          c.fillStyle = 'rgba(201,166,255,.85)';
          c.font = '900 24px Arial';
          c.fillText('◀', x - p.w / 2 - 30, y + 20);
          c.fillText('▶', x + p.w / 2 + 6, y + 20);
        }
      }
    }

    // ---------------------------------------------------------------- น้องเด้ง (วาดสด — ท่ายืน/กระโดด/ตก/จรวด)
    function drawHero(c, x, y, pose, t, rot = 0) {
      const col = scn().hero;
      const s = 1.3;
      c.save();
      c.translate(x, y);
      // เงา
      if (pose !== 'fall') {
        c.fillStyle = 'rgba(0,0,0,.25)';
        c.beginPath();
        c.ellipse(0, 0, 36, 8, 0, 0, TAU);
        c.fill();
      }
      c.translate(0, -62 * s);
      c.rotate(rot);
      c.scale(s, s);
      if (pose === 'rocket') {
        c.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 3; i++) c.drawImage(glowImg(i ? '255,160,60' : '255,240,180'), -40 - i * 4 - 26, 40 + i * 14, 52 + i * 8, 70 + i * 26 + Math.sin(t * 40 + i) * 10);
        c.globalCompositeOperation = 'source-over';
        c.fillStyle = '#9aa0ad';
        rr(c, -46, -6, 16, 40, 6);
        c.fill();
      }
      // ขา
      c.strokeStyle = '#3a2a4a';
      c.lineWidth = 9;
      c.lineCap = 'round';
      c.beginPath();
      if (pose === 'jump' || pose === 'rocket') {
        c.moveTo(-12, 30);
        c.lineTo(-20, 50);
        c.moveTo(12, 30);
        c.lineTo(22, 44);
      } else if (pose === 'fall') {
        c.moveTo(-12, 30);
        c.lineTo(-26, 20);
        c.moveTo(12, 30);
        c.lineTo(28, 18);
      } else {
        c.moveTo(-12, 30);
        c.lineTo(-12, 56);
        c.moveTo(12, 30);
        c.lineTo(12, 56);
      }
      c.stroke();
      // เป้
      c.fillStyle = '#4f7bff';
      rr(c, -36, -6, 18, 34, 8);
      c.fill();
      // ตัว
      const g = c.createRadialGradient(-10, -20, 6, 0, 0, 48);
      g.addColorStop(0, '#ffd0a3');
      g.addColorStop(1, col);
      c.fillStyle = g;
      const sq = pose === 'stand' ? 1 + Math.sin(t * 8) * 0.03 : 1;
      c.beginPath();
      c.ellipse(0, 4, 40 / sq, 42 * sq, 0, 0, TAU);
      c.fill();
      c.fillStyle = col;
      c.beginPath();
      c.ellipse(-20, -40, 9, 16, -0.3, 0, TAU);
      c.ellipse(20, -40, 9, 16, 0.3, 0, TAU);
      c.fill();
      c.fillStyle = '#fff3e6';
      c.beginPath();
      c.ellipse(0, -2, 28, 24, 0, 0, TAU);
      c.fill();
      c.fillStyle = '#2b1a12';
      if (pose === 'fall') {
        c.lineWidth = 3.4;
        c.strokeStyle = '#2b1a12';
        for (const [a, b] of [[-10, -6], [10, -6]]) {
          c.beginPath();
          c.moveTo(a - 5, b - 5);
          c.lineTo(a + 5, b + 5);
          c.moveTo(a + 5, b - 5);
          c.lineTo(a - 5, b + 5);
          c.stroke();
        }
        c.beginPath();
        c.ellipse(0, 10, 6, 7, 0, 0, TAU);
        c.fill();
      } else {
        const blink = Math.sin(t * 2.3) > 0.97;
        c.beginPath();
        c.ellipse(-10, -6, 4.5, blink ? 0.8 : 6, 0, 0, TAU);
        c.ellipse(10, -6, 4.5, blink ? 0.8 : 6, 0, 0, TAU);
        c.fill();
        c.fillStyle = '#fff';
        c.beginPath();
        c.arc(-8.5, -8, 1.8, 0, TAU);
        c.arc(11.5, -8, 1.8, 0, TAU);
        c.fill();
        c.strokeStyle = '#a8323e';
        c.lineWidth = 3;
        c.beginPath();
        if (pose === 'rocket') c.ellipse(0, 9, 6, 5, 0, 0, TAU);
        else c.arc(0, 6, 7, 0.1, Math.PI - 0.1);
        c.stroke();
      }
      c.fillStyle = 'rgba(255,120,150,.45)';
      c.beginPath();
      c.ellipse(-20, 4, 6, 3.5, 0, 0, TAU);
      c.ellipse(20, 4, 6, 3.5, 0, 0, TAU);
      c.fill();
      c.strokeStyle = col;
      c.lineWidth = 10;
      c.beginPath();
      if (pose === 'fall') {
        c.moveTo(-34, 0);
        c.lineTo(-50, -26);
        c.moveTo(34, 0);
        c.lineTo(50, -26);
      } else if (pose === 'rocket' || pose === 'jump') {
        c.moveTo(-34, 2);
        c.lineTo(-46, -22);
        c.moveTo(34, 2);
        c.lineTo(48, -20);
      } else {
        c.moveTo(-34, 6);
        c.lineTo(-44, 22);
        c.moveTo(34, 6);
        c.lineTo(44, 22);
      }
      c.stroke();
      c.restore();
    }
    function drawShield(c, x, y, t) {
      if (!S.shield && shieldPop <= 0) return;
      const r = 104 + Math.sin(t * 4) * 4;
      const cy = y - 80;
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = S.shield ? 0.9 : shieldPop;
      c.drawImage(glowImg('61,220,132'), x - r * 1.3, cy - r * 1.3, r * 2.6, r * 2.6);
      c.globalCompositeOperation = 'source-over';
      c.strokeStyle = 'rgba(120,255,190,.9)';
      c.lineWidth = 6;
      c.beginPath();
      c.arc(x, cy, r, 0, TAU);
      c.stroke();
      c.fillStyle = 'rgba(61,220,132,.12)';
      c.fill();
      if (S.shield > 1) {
        c.strokeStyle = 'rgba(120,255,190,.5)';
        c.beginPath();
        c.arc(x, cy, r + 14, 0, TAU);
        c.stroke();
      }
      c.restore();
    }
    // ป้ายชื่อบนจอ (วาดบนแคนวาส ตามพิกัดโลก)
    function pill(c, x, y, text, bg, fg = '#fff', size = 22) {
      c.font = `800 ${size}px "IBM Plex Sans Thai", sans-serif`;
      const w = c.measureText(text).width + 26;
      c.fillStyle = bg;
      rr(c, x - w / 2, y - size - 6, w, size + 16, (size + 16) / 2);
      c.fill();
      c.fillStyle = fg;
      c.textAlign = 'center';
      c.fillText(text, x, y + 2);
      c.textAlign = 'left';
    }

    // ---------------------------------------------------------------- ของแกล้ง (พิกัดโลก: m = ความสูง, x)
    function drawProp(c, p, t) {
      const age = t - p.t0;
      const k = clamp(age / p.dur, 0, 1);
      const x = p.x;
      const y = sy(p.m);
      c.save();
      if (p.type === 'banana') {
        c.translate(x, y - 10);
        c.rotate(-0.3 + age * (p.fly ? 8 : 0));
        if (p.fly) c.translate(age * 300, -age * 200);
        c.fillStyle = '#ffe14d';
        c.beginPath();
        c.ellipse(0, 0, 24, 10, 0, 0, TAU);
        c.fill();
        c.beginPath();
        c.moveTo(-6, -2);
        c.quadraticCurveTo(-28, -26, -36, -10);
        c.quadraticCurveTo(-26, -10, -8, 2);
        c.moveTo(6, -2);
        c.quadraticCurveTo(26, -28, 36, -12);
        c.quadraticCurveTo(24, -10, 8, 2);
        c.fill();
      } else if (p.type === 'hand') {
        // มือยักษ์ยื่นลงมาจากด้านบน แล้วผลัก
        const reach = k < 0.45 ? ease(k / 0.45) : k < 0.6 ? 1 : 1 - ease((k - 0.6) / 0.4);
        const hy = y - 520 + reach * 380;
        c.translate(x, hy);
        c.rotate(Math.PI / 2);
        c.fillStyle = '#ffd0a3';
        rr(c, -170, -46, 220, 92, 34);
        c.fill();
        for (let i = 0; i < 4; i++) {
          rr(c, 40, -42 + i * 22, 58, 18, 9);
          c.fill();
        }
        c.fillStyle = p.col || '#ff4fd8';
        rr(c, -300, -56, 140, 112, 14);
        c.fill();
      } else if (p.type === 'bird') {
        const bx = lerp(W + 160, -200, k);
        const by = y - 90 + Math.sin(k * Math.PI) * -60;
        c.translate(bx, by);
        c.scale(1.4, 1.4);
        c.fillStyle = '#5a4a8a';
        c.beginPath();
        c.ellipse(0, 0, 50, 24, 0.1, 0, TAU);
        c.fill();
        const flap = Math.sin(t * 22) * 30;
        c.beginPath();
        c.moveTo(-6, -8);
        c.quadraticCurveTo(10, -70 - flap, 50, -60 - flap);
        c.quadraticCurveTo(26, -30, 22, -6);
        c.fill();
        c.fillStyle = '#ffb347';
        c.beginPath();
        c.moveTo(-46, -6);
        c.lineTo(-80, 2);
        c.lineTo(-46, 8);
        c.fill();
        c.fillStyle = '#fff';
        c.beginPath();
        c.arc(-30, -8, 7, 0, TAU);
        c.fill();
        c.fillStyle = '#000';
        c.beginPath();
        c.arc(-32, -8, 3.5, 0, TAU);
        c.fill();
      } else if (p.type === 'bomb') {
        const fall = ease(clamp(age / 0.8, 0, 1));
        const by = lerp(y - 700, y - 20, fall);
        if (age < 0.8) {
          c.translate(x, by);
          c.fillStyle = '#20202a';
          c.beginPath();
          c.arc(0, 0, 26, 0, TAU);
          c.fill();
          c.fillStyle = '#ff4f4f';
          c.fillRect(-4, -36, 8, 12);
          c.globalCompositeOperation = 'lighter';
          c.drawImage(glowImg('255,200,80'), -18, -58, 36, 36);
        }
      }
      c.restore();
      if (p.label && k < 0.98) pill(c, p.lx ?? x, sy(p.m) - (p.ly || 70), p.label, p.lbg || 'rgba(255,79,216,.95)');
    }

    // ---------------------------------------------------------------- อนุภาค
    function burst(x, y, n, cols, o = {}) {
      for (let i = 0; i < n; i++) {
        const a = (o.a0 ?? 0) + Math.random() * (o.spread ?? TAU);
        const v = (o.v0 ?? 120) + Math.random() * (o.v1 ?? 380);
        parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (o.up || 0), g: o.g ?? 700, life: 0, max: o.max ?? 1.1 + Math.random() * 0.6, size: o.size ?? 5 + Math.random() * 6, col: cols[i % cols.length], glow: o.glow, rect: o.rect, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12 });
      }
    }
    function stepParts(c, dt) {
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life += dt;
        if (p.life >= p.max) {
          parts.splice(i, 1);
          continue;
        }
        p.vy += p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        const a = 1 - p.life / p.max;
        if (p.glow) {
          c.globalCompositeOperation = 'lighter';
          c.globalAlpha = a;
          c.drawImage(glowImg(p.glow), p.x - p.size * 2, p.y - p.size * 2, p.size * 4, p.size * 4);
          c.globalCompositeOperation = 'source-over';
        } else {
          c.globalAlpha = a;
          c.fillStyle = p.col;
          if (p.rect) {
            c.save();
            c.translate(p.x, p.y);
            c.rotate(p.rot);
            c.fillRect(-p.size, -p.size * 0.6, p.size * 2, p.size * 1.2);
            c.restore();
          } else {
            c.beginPath();
            c.arc(p.x, p.y, p.size, 0, TAU);
            c.fill();
          }
        }
      }
      c.globalAlpha = 1;
      if (parts.length > 700) parts.splice(0, parts.length - 700);
    }
    // ลม / ฝน / หมอก (ทับฉาก ใต้กรอบข้อความ)
    function drawWeather(c, t) {
      if (anim?.type === 'knock' && anim.kind === 'wind') {
        c.strokeStyle = 'rgba(210,240,255,.75)';
        c.lineWidth = 5;
        c.lineCap = 'round';
        for (let i = 0; i < 16; i++) {
          const y = HERO_Y - 300 + hsh(i) * 420;
          const x = ((hsh(i * 3) * W + (t - anim.t0) * 1400) % (W + 400)) - 200;
          c.beginPath();
          c.moveTo(x, y);
          c.bezierCurveTo(x + 60, y - 14, x + 120, y + 14, x + 200, y);
          c.stroke();
        }
      }
      if (t < stormUntil + 1.2) {
        const k = clamp((stormUntil - t) / 1.2 + 1, 0, 1) * clamp((t - stormAt) / 0.8, 0, 1);
        const city = meta().hud?.climb?.scene !== 'sky';
        c.fillStyle = `rgba(${city ? '20,6,40' : '60,50,90'},${0.28 * k})`;
        c.fillRect(-80, -80, W + 160, H + 160);
        // ลมเฉียงแรง ๆ
        c.strokeStyle = `rgba(${city ? '190,160,255' : '235,240,255'},${0.6 * k})`;
        c.lineCap = 'round';
        for (let i = 0; i < 30; i++) {
          const sp = 1600 + hsh(i * 5) * 900;
          const y0 = hsh(i) * (H + 400) - 200;
          const x = ((hsh(i * 3) * (W + 600) + t * sp) % (W + 600)) - 300;
          const y = y0 + ((t * sp * 0.18) % 300);
          c.lineWidth = 2 + hsh(i * 9) * 5;
          c.beginPath();
          c.moveTo(x, y);
          c.bezierCurveTo(x + 70, y + 4, x + 140, y + 22, x + 230, y + 36);
          c.stroke();
        }
        // เศษของปลิวหมุน (เมือง: กระดาษนีออน • เกาะ: ใบไม้)
        for (let i = 0; i < 18; i++) {
          const sp = 700 + hsh(i * 11) * 700;
          const x = ((hsh(i * 13) * (W + 300) + t * sp) % (W + 300)) - 150;
          const y = hsh(i * 17) * H + Math.sin(t * 3 + i) * 90;
          c.save();
          c.globalAlpha = k;
          c.translate(x, y);
          c.rotate(t * (4 + hsh(i) * 6) + i);
          c.fillStyle = city ? ['#ff4fd8', '#5ef0ff', '#ffd23f'][i % 3] : ['#6ccf5a', '#ffd23f', '#ff8fb5'][i % 3];
          if (city) c.fillRect(-10, -6, 20, 12);
          else {
            c.beginPath();
            c.ellipse(0, 0, 13, 6, 0, 0, TAU);
            c.fill();
          }
          c.restore();
        }
      }
      if (t < rainUntil) {
        c.strokeStyle = 'rgba(180,210,255,.55)';
        c.lineWidth = 3;
        c.beginPath();
        for (let i = 0; i < 110; i++) {
          const x = (hsh(i * 7) * (W + 200) - 100 + t * 200) % (W + 200) - 100;
          const y = (hsh(i * 3) * H + t * 1400 * (0.8 + hsh(i) * 0.4)) % H;
          c.moveTo(x, y);
          c.lineTo(x - 16, y + 46);
        }
        c.stroke();
        if (Math.random() < 0.006) lightning = 0.35;
      }
      if (lightning > 0) {
        c.fillStyle = `rgba(230,240,255,${lightning})`;
        c.fillRect(0, 0, W, H);
      }
      if (t < fogUntil) {
        const a = clamp((fogUntil - t) / 1.5, 0, 1) * 0.85;
        for (let i = 0; i < 9; i++) {
          const x = ((hsh(i) * (W + 600) + t * (30 + i * 6)) % (W + 600)) - 300;
          const y = HERO_Y - 520 + hsh(i * 5) * 600;
          c.globalAlpha = a * 0.7;
          c.drawImage(glowImg('235,240,250'), x - 260, y - 200, 520, 400);
        }
        c.globalAlpha = 1;
      }
    }

    // ================================================================ อัปเดตต่อเฟรม
    function frame(c, t) {
      const dt = Math.min(0.05, t - lastT || 0.016);
      lastT = t;
      const pn = performance.now();
      // ความสูงเป้าหมาย (ประมาณต่อระหว่างรอข้อมูลจากเซิร์ฟเวอร์)
      const est = S.paused || S.atTop ? S.h : Math.min(S.h + 1.2, S.h + (S.rate || 1.6) * (S.fog ? 0.55 : 1) * (S.storm ? 0.5 : 1) * ((pn - stAt) / 1000));
      let pose = 'stand';
      let rot = 0;
      let hx = null;
      if (anim) {
        const a = anim;
        const age = t - a.t0;
        if (a.type === 'knock') {
          // ช่วงโดนแกล้ง: ค้าง/กระเด็นนิดหน่อยก่อนตก
          pose = 'fall';
          rot = Math.sin(age * 18) * 0.25;
          if (a.kind === 'wind') hx = (a.x0 ?? 540) + ease(age / a.dur) * 160;
          if (age >= a.dur) anim = { type: 'fall', t0: t, from: disp, to: a.to, v: 2, x0: hx };
        } else if (a.type === 'fall') {
          pose = 'fall';
          a.v += 42 * dt;
          disp = Math.max(a.to, disp - a.v * dt);
          rot = age * 9;
          hx = a.x0;
          if (disp <= a.to + 0.001) {
            anim = null;
            shake = Math.max(shake, 0.5);
            const hp = heroPos(disp, t);
            burst(hp.x, HERO_Y, 22, ['#c9b8a0', '#a89880', '#ffffff'], { a0: Math.PI, spread: Math.PI, v0: 60, v1: 220, g: 500, size: 6, max: 0.7 });
            API?.sfx?.boom?.();
          }
        } else if (a.type === 'rocket') {
          pose = 'rocket';
          const k = ease(clamp(age / a.dur, 0, 1));
          disp = lerp(a.from, a.to, k);
          if (Math.random() < 0.7) burst(heroPos(disp, t).x, HERO_Y + 10, 2, ['#ffd23f', '#ff8a3d'], { a0: Math.PI * 0.35, spread: Math.PI * 0.3, v0: 200, v1: 300, g: 300, max: 0.6, glow: '255,170,60', size: 10 });
          if (age >= a.dur) anim = null;
        } else if (a.type === 'teleport') {
          disp = a.to;
          anim = null;
        }
      } else if (est > disp) disp += Math.min(est - disp, Math.max(0.2, (est - disp) * 4) * dt * 3);
      else if (disp - est > 1.5) anim = { type: 'fall', t0: t, from: disp, to: est, v: 2 };
      cam += (disp - cam) * Math.min(1, dt * 6);
      if (Math.abs(disp - cam) > 40) cam = disp;

      // ---- วาด
      shake = Math.max(0, shake - dt);
      flash = Math.max(0, flash - dt * 1.8);
      lightning = Math.max(0, lightning - dt * 2);
      shieldPop = Math.max(0, shieldPop - dt);
      c.save();
      if (shake > 0) c.translate((Math.random() - 0.5) * 28 * shake, (Math.random() - 0.5) * 22 * shake);
      const city = meta().hud?.climb?.scene !== 'sky';
      const zf = drawSky(c, t);
      if (city) {
        drawStars(c, t, zf, 140, clamp(0.3 + zf * 0.18, 0, 1));
        drawCity(c, t, zf);
        drawTower(c, t, zf);
      } else {
        drawStars(c, t, zf, 60, clamp((zf - 3.2) * 0.4, 0, 0.5));
        drawSkyWorld(c, t, zf);
      }
      drawPlatforms(c, t);
      for (let i = props.length - 1; i >= 0; i--) {
        const p = props[i];
        if (t - p.t0 > p.dur + 0.2) {
          props.splice(i, 1);
          continue;
        }
        drawProp(c, p, t);
      }
      const hp = heroPos(disp, t);
      if (!anim && hp.air) pose = 'jump';
      const stormy = t < stormUntil;
      const heroX = hx ?? hp.x + (stormy ? Math.sin(t * 3.2) * 16 : 0);
      const heroY = anim?.type === 'fall' || anim?.type === 'rocket' ? HERO_Y : sy(hp.m);
      drawShield(c, heroX, heroY, t);
      drawHero(c, heroX, heroY, pose, t, rot);
      pill(c, heroX, heroY - 190, `${city ? '🧡' : '🩷'} ${API?.t?.host || meta().defaults?.host || 'น้องเด้ง'}`, city ? 'rgba(255,138,61,.95)' : 'rgba(255,111,174,.95)');
      if (stormy) pill(c, heroX, heroY - 236, `🌪️ พายุจอมแกล้ง ${Math.ceil(stormUntil - t)} วิ`, 'rgba(90,40,160,.92)');
      stepParts(c, dt);
      drawWeather(c, t);
      c.restore();
      if (flash > 0) {
        c.fillStyle = `rgba(${flashCol},${flash * 0.6})`;
        c.fillRect(0, 0, W, H);
      }
      // พาเนลความสูงขยับลื่น ๆ
      if (t - (frame._u || 0) > 0.25) {
        frame._u = t;
        updateMeter();
      }
    }

    // ================================================================ เหตุการณ์จากเซิร์ฟเวอร์
    function heroNow(t) {
      return heroPos(disp, t);
    }
    function banner(html, cls = 'bad', sec = 3.2) {
      const b = el?.querySelector('.cl-ban');
      if (!b) return;
      b.className = 'cl-ban ' + cls;
      b.innerHTML = html;
      void b.offsetWidth;
      b.classList.add('on');
      clearTimeout(banner._t);
      banner._t = setTimeout(() => b.classList.remove('on'), sec * 1000);
    }
    function bigTitle(html, sec = 2.8) {
      const b = el?.querySelector('.cl-big');
      if (!b) return;
      b.innerHTML = html;
      b.classList.remove('on');
      void b.offsetWidth;
      b.classList.add('on');
      clearTimeout(bigTitle._t);
      bigTitle._t = setTimeout(() => b.classList.remove('on'), sec * 1000);
    }
    function onEv(d) {
      const t = lastT || performance.now() / 1000;
      const hp = heroNow(t);
      const sc = scn();
      const tag = (name) => `😈 ${name}`;
      switch (d.ev) {
        case 'prank': {
          const lost = d.lost > 0 ? ` −${d.lost} ม.!` : '';
          banner(`😈 <b>${esc(d.by)}</b> ${esc(d.name)}${lost}`, 'bad');
          const knock = { type: 'knock', kind: d.kind, t0: t, dur: 0.7, to: d.to, x0: hp.x };
          const nk = plat(hp.k + 1);
          if (d.kind === 'banana') {
            props.push({ type: 'banana', x: platX(nk, t), m: (hp.k + 1) * STEP, t0: t, dur: 3, label: tag(d.by) });
            knock.dur = 0.9;
            API?.sfx?.pop?.();
          } else if (d.kind === 'wind') {
            knock.dur = 1.2;
            API?.sfx?.whoosh?.();
          } else if (d.kind === 'crumble') {
            broken.set(hp.k, t);
            const p = plat(hp.k);
            for (let i = 0; i < 14; i++) burst(platX(p, t) + (Math.random() - 0.5) * 140, sy(hp.k * STEP) + 10, 1, [city() ? sc.plat.crack : '#a8703f', '#5a4a3a'], { a0: Math.PI * 0.3, spread: Math.PI * 0.4, v0: 60, v1: 160, g: 900, rect: true, size: 10, max: 1.4 });
            pillAt(platX(p, t), hp.k * STEP, tag(d.by));
            knock.dur = 0.35;
            API?.sfx?.boom?.();
          } else if (d.kind === 'fog') {
            fogUntil = t + (d.fog || 12);
            pillAt(hp.x, disp + 4, tag(d.by) + ' 🌫️');
            knock.dur = 0.5;
          } else if (d.kind === 'hand') {
            props.push({ type: 'hand', x: hp.x - 30, m: disp, t0: t, dur: 1.6, label: tag(d.by), ly: 560, col: sc.ui.a1 });
            knock.dur = 0.85;
            setTimeout(() => {
              shake = 0.4;
              API?.sfx?.boom?.();
            }, 700);
          } else if (d.kind === 'bird') {
            props.push({ type: 'bird', x: hp.x, m: disp, t0: t, dur: 1.1, label: tag(d.by), lx: hp.x, ly: 260 });
            knock.dur = 0.65;
            setTimeout(() => {
              const h2 = heroNow(lastT);
              burst(h2.x, HERO_Y - 90, 26, ['#5a4a8a', '#8a7ac0', '#ffffff'], { v0: 80, v1: 260, g: 200, rect: true, size: 7, max: 1.6 });
              shake = 0.35;
            }, 520);
            API?.sfx?.whoosh?.();
          } else if (d.kind === 'rain') {
            rainUntil = t + (d.rain || 15);
            lightning = 0.6;
            pillAt(hp.x, disp + 4, tag(d.by) + ' 🌧️');
            knock.dur = 0.6;
          } else if (d.kind === 'bomb') {
            for (let i = -1; i <= 1; i++) {
              const kk = hp.k + i;
              const p = plat(kk);
              props.push({ type: 'bomb', x: platX(p, t), m: kk * STEP, t0: t + Math.abs(i) * 0.15, dur: 0.8, label: i === 0 ? tag(d.by) : '', ly: 600 });
              setTimeout(() => {
                broken.set(kk, lastT);
                const ex = platX(p, lastT);
                const ey = sy(kk * STEP);
                burst(ex, ey, 34, ['#ffd23f', '#ff8a3d', '#ff4f4f'], { v0: 120, v1: 520, g: 300, glow: '255,170,60', size: 14, max: 0.9 });
                burst(ex, ey, 18, ['#3a3a4a', '#6a6a7a'], { v0: 80, v1: 300, g: 900, rect: true, size: 9, max: 1.3 });
                flash = 0.5;
                flashCol = '255,220,160';
                shake = 0.6;
                API?.sfx?.boom?.();
              }, 800 + Math.abs(i) * 150);
            }
            knock.dur = 1.3;
          } else if (d.kind === 'quake') {
            shake = 2.6;
            bigTitle('🌋 แผ่นดินไหว!<small>' + esc(d.by) + ' ส่งของขวัญใหญ่ — ตก ' + d.lost + ' ม.</small>', 3.2);
            for (let i = 0; i < 6; i++) setTimeout(() => burst(Math.random() * W, 300 + Math.random() * 600, 14, ['#5a4a3a', '#8a7a6a', '#c9b8a0'], { a0: Math.PI * 0.4, spread: Math.PI * 0.2, v0: 50, v1: 120, g: 900, rect: true, size: 12, max: 2 }), i * 260);
            knock.dur = 1.6;
            API?.sfx?.boom?.();
          }
          if (d.lost > 0 || d.kind !== 'fog') anim = knock;
          else anim = knock;
          if (!(d.lost > 0)) knock.to = disp; // ตกไม่ได้ (อยู่ชั้นเซฟพอดี) = แค่โดนแกล้ง
          break;
        }
        case 'slip':
          anim = { type: 'knock', kind: 'slip', t0: t, dur: 0.4, to: Math.max(0, disp - d.lost), x0: hp.x };
          break;
        case 'blocked': {
          shieldPop = 1;
          flash = 0.4;
          flashCol = '120,255,190';
          burst(hp.x, HERO_Y - 80, 40, ['#3ddc84', '#a8ffd8', '#ffffff'], { v0: 200, v1: 420, g: 0, glow: '61,220,132', size: 9, max: 0.9 });
          banner(`🛡️ โล่ของ <b>${esc(d.helper || 'ทีมช่วย')}</b> บล็อก${esc(prankName(d.kind))}ของ <b>${esc(d.by)}</b>!`, 'good');
          if (d.kind === 'banana') props.push({ type: 'banana', x: hp.x, m: disp + 1, t0: t, dur: 1.2, fly: true });
          API?.sfx?.chime?.(880);
          break;
        }
        case 'shield':
          shieldPop = 1.4;
          burst(hp.x, HERO_Y - 80, 30, ['#3ddc84', '#a8ffd8'], { v0: 100, v1: 300, g: -100, glow: '61,220,132', size: 8, max: 1.2 });
          banner(`🛡️ <b>${esc(d.by)}</b> เติมโล่ครบ! กันแกล้งได้ ${d.n} ครั้ง`, 'good', 2.6);
          API?.sfx?.chime?.(660);
          break;
        case 'hub':
          // ใจเชียร์ลอยขึ้นจากด้านล่างไปหาน้องเด้ง
          parts.push({ x: 200 + Math.random() * 680, y: 1320, vx: (hp.x - 540) * 0.2, vy: -420, g: 60, life: 0, max: 1.2, size: 12, col: '#3ddc84', glow: '61,220,132' });
          break;
        case 'storm':
          if (t >= stormUntil) stormAt = t;
          stormUntil = t + (d.sec || 15);
          flash = 0.3;
          flashCol = '120,80,200';
          shake = Math.max(shake, 0.4);
          // มากับของขวัญชิ้นใหญ่ → ขึ้นต่อจากป้ายแกล้ง (ไม่ทับกัน)
          clearTimeout(onEv._storm);
          onEv._storm = setTimeout(() => banner(`🌪️ เพชรครบเป้า! <b>พายุจอมแกล้ง</b> น้องปีนช้าลง ${Math.max(1, Math.ceil(stormUntil - lastT))} วิ`, 'bad', 3.2), 2800);
          API?.sfx?.whoosh?.();
          break;
        case 'rocket':
          anim = { type: 'rocket', t0: t, dur: 2.3, from: disp, to: d.to };
          flash = 0.35;
          flashCol = '255,220,150';
          banner(`🚀 <b>${esc(d.by || 'ทุกคน')}</b> ${d.why === 'goal' ? 'ครบเป้า! ' : ''}จุดจรวด +${Math.round(d.to - d.from)} ม.!`, 'good', 2.8);
          API?.sfx?.whistle?.();
          break;
        case 'check':
          banner(`🚩 ถึงชั้นเซฟ <b>${d.h} ม.</b> ตกไม่ต่ำกว่านี้แล้ว!`, 'gold', 2.6);
          burst(540, sy(d.h), 30, ['#ffd23f', '#ffffff'], { a0: Math.PI, spread: Math.PI, v0: 100, v1: 300, g: 400, glow: '255,210,63', size: 8, max: 1 });
          break;
        case 'zone': {
          const z = zones()[d.z] || `ด่าน ${d.z + 1}`;
          bigTitle(`ด่าน ${d.z + 1}<small>${esc(z)}</small>`, 2.6);
          flash = 0.5;
          flashCol = '255,255,255';
          API?.sfx?.fanfare?.();
          break;
        }
        case 'record':
          banner(`🏆 สถิติใหม่ของไลฟ์ <b>${d.h} ม.</b>!`, 'gold', 2.6);
          break;
        case 'top': {
          bigTitle(`🏆 ถึง${esc(sc.goal)}แล้ว!<small>รอบที่ ${d.round} ${d.pr ? `• จอมแกล้ง ${esc(d.pr.n)}` : ''} ${d.hp ? `• ฮีโร่ ${esc(d.hp.n)}` : ''}</small>`, 6);
          API?.fireworks?.(10, { y0: 1300, yMin: 260, yMax: 800 });
          for (let i = 0; i < 4; i++) setTimeout(() => burst(540, 600, 70, ['#ff4fd8', '#5ef0ff', '#ffd23f', '#3ddc84', '#ffffff'], { v0: 200, v1: 700, g: 500, rect: true, size: 8, max: 3 }), i * 600);
          API?.sfx?.fanfare?.();
          API?.crowdWave?.('wave');
          break;
        }
        case 'round':
          anim = { type: 'teleport', to: 0 };
          disp = 0;
          cam = 0;
          broken.clear();
          bigTitle(`รอบที่ ${d.round}<small>น้องเด้งเริ่มปีนใหม่!</small>`, 2.4);
          break;
      }
    }
    const city = () => meta().hud?.climb?.scene !== 'sky';
    const PNAME = { banana: 'เปลือกกล้วย', wind: 'ลม', crumble: 'แท่นหลอก', fog: 'หมอก', hand: 'มือยักษ์', bird: 'นก', rain: 'ฝน', bomb: 'ระเบิด', quake: 'แผ่นดินไหว' };
    const prankName = (k) => PNAME[k] || 'การแกล้ง';
    function pillAt(x, m, text) {
      props.push({ type: 'tag', x, m, t0: lastT, dur: 2.6, label: text, ly: 30 });
    }

    // ================================================================ กรอบข้อความ (DOM) — ตำแหน่งตามดีไซน์ที่ตกลง
    function renderStatic() {
      const m = meta();
      const t = API?.t || {};
      const gifts = (t.gifts || m.defaults?.gifts || []).slice(0, 9);
      const fx = m.effects || {};
      el.innerHTML = `
        <div class="cl-ttl"><div class="ico">${esc(m.icon || '🎮')}</div><div style="min-width:0"><b>${esc(t.title || m.defaults?.title)}</b><small>${esc(t.subtitle || m.defaults?.subtitle || '')}</small></div></div>
        <div class="cl-pn cl-pr"><h4>😈 จอมแกล้ง (ทำตกมากสุด)</h4><div class="rows"></div></div>
        <div class="cl-pn cl-hp"><h4>🛡️ ทีมช่วยน้อง</h4><div class="rows"></div></div>
        <div class="cl-mb cl-sh"><span class="tx"></span><i><b></b></i></div>
        <div class="cl-mb cl-rk"><span class="tx"></span><i><b></b></i></div>
        <div class="cl-lg"><h4>🎁 ของขวัญ = แกล้ง</h4>${gifts.map((g) => `<div>${window.giftIconHtml ? window.giftIconHtml(g.name, fx[g.effect]?.icon || '🎁') : esc(fx[g.effect]?.icon || '🎁')} ${window.giftIcon?.(g.name) ? '' : `<b>${esc(g.name)}</b> `}${esc(fx[g.effect]?.label || '')}</div>`).join('')}</div>
        <div class="cl-mt"><h4>ความสูง<b class="now">0 ม.</b></h4><div class="bar"><div class="fill"></div><div class="rec"><span>สถิติ</span></div><div class="me">${city() ? '🧡' : '🩷'}</div>${zones().map((z, i) => `<div class="zn" style="bottom:${(i / 5) * 100}%">${esc(z)}</div>`).join('')}</div></div>
        <div class="cl-ban"></div>
        <div class="cl-big"></div>`;
      updatePanels();
      updateMeter();
    }
    function updatePanels() {
      if (!el) return;
      const row = (r, i, sign) => `<div class="r">${['🥇', '🥈', '🥉'][i] || '•'} <span>${esc(r.n)}</span><b>${sign === '-' ? `−${r.m} ม.` : r.m > 0 ? `+${r.m} ม.` : `ฮึบ ×${r.hub || 0}`}</b></div>`;
      const pr = (S.pranks || []).slice(0, 3);
      const hp = (S.helps || []).slice(0, 2);
      el.querySelector('.cl-pr .rows').innerHTML = pr.length ? pr.map((r, i) => row(r, i, '-')).join('') : '<div class="emp">ยังไม่มีใครแกล้ง — ส่งกุหลาบดูสิ!</div>';
      el.querySelector('.cl-hp .rows').innerHTML = hp.length ? hp.map((r, i) => row(r, i, '+')).join('') : '<div class="emp">พิมพ์ “ฮึบ” ช่วยน้องทำโล่!</div>';
      el.querySelector('.cl-sh .tx').textContent = S.shield ? `🛡️ โล่พร้อม ×${S.shield} • ฮึบ ${S.hub}/${S.hubMax}` : `🛡️ โล่กันแกล้ง (พิมพ์ “ฮึบ” ${S.hubMax} ครั้ง) ${S.hub}/${S.hubMax}`;
      el.querySelector('.cl-sh b').style.width = (S.shield >= 2 ? 100 : (S.hub / (S.hubMax || 20)) * 100).toFixed(1) + '%';
      el.querySelector('.cl-rk .tx').textContent = `🚀 จรวดพุ่ง +20 ม. (กดใจ ${S.likeMax}) ${S.likes}/${S.likeMax}`;
      el.querySelector('.cl-rk b').style.width = ((S.likes / (S.likeMax || 500)) * 100).toFixed(1) + '%';
    }
    function updateMeter() {
      if (!el) return;
      const top = S.top || 500;
      const f = clamp(disp / top, 0, 1);
      const now = el.querySelector('.cl-mt .now');
      if (now) now.textContent = `${Math.floor(disp)} ม.`;
      const fill = el.querySelector('.cl-mt .fill');
      if (fill) fill.style.height = (f * 100).toFixed(2) + '%';
      const me = el.querySelector('.cl-mt .me');
      if (me) me.style.bottom = (f * 100).toFixed(2) + '%';
      const rec = el.querySelector('.cl-mt .rec');
      if (rec) {
        rec.style.bottom = (clamp(Math.max(S.best || 0, S.allBest || 0) / top, 0, 1) * 100).toFixed(2) + '%';
        rec.querySelector('span').textContent = `สถิติ ${Math.floor(Math.max(S.best || 0, S.allBest || 0))}`;
      }
    }
    function apply(s) {
      Object.assign(S, s);
      stAt = performance.now();
      if (s.fog) fogUntil = Math.max(fogUntil, (lastT || 0) + s.fog);
      if (s.rain) rainUntil = Math.max(rainUntil, (lastT || 0) + s.rain);
      if (s.storm && !(stormUntil > (lastT || 0))) {
        stormAt = lastT || 0;
        stormUntil = (lastT || 0) + s.storm;
      }
      if (!stAt || !apply._init) {
        apply._init = true;
        disp = cam = S.h; // เปิดหน้าเวทีกลางเกม: เริ่มที่ความสูงปัจจุบัน
      }
      updatePanels();
    }

    function css() {
      const u = scn().ui;
      const light = !city();
      return `
        #root.theme-${id} #header, #root.theme-${id} #songPanel, #root.theme-${id} #giftPanel, #root.theme-${id} #topPanel, #root.theme-${id} #feed, #root.theme-${id} #hype, #root.theme-${id} #crowd { display: none !important; }
        /* ตัวละครหน้าเวทีบังทางปีน — เกมนี้มีน้องเด้งเป็นตัวเอกแล้ว */
        #root.theme-${id} #avatar, #root.theme-${id} #avatar2d { display: none !important; }
        #root.theme-${id} { --toast-bg: ${u.a1}; --toast-glow: ${u.a1}; --big-grad: linear-gradient(180deg, #ffffff, ${u.a1}); }
        #root.theme-${id} #toasts { top: 430px; left: 480px; right: 250px; }
        .cl-ui { position: absolute; inset: 0; pointer-events: none; font-family: 'IBM Plex Sans Thai', 'Kanit', sans-serif; color: ${u.ink}; z-index: 3; }
        .cl-ui * { box-sizing: border-box; }
        .cl-ui .cl-ttl { position: absolute; left: 110px; top: 196px; width: 600px; padding: 14px 20px; border-radius: 26px; display: flex; gap: 16px; align-items: center; color: ${light ? '#3a1a2a' : '#fff'};
          background: linear-gradient(120deg, ${u.a1}, ${u.a2}); box-shadow: 0 0 30px ${light ? 'rgba(0,0,0,.15)' : 'rgba(255,79,216,.5)'}; }
        .cl-ui .cl-ttl .ico { flex: none; width: 84px; height: 84px; border-radius: 22px; display: grid; place-items: center; font-size: 50px; background: rgba(255,255,255,.25); }
        .cl-ui .cl-ttl b { display: block; font-size: 38px; line-height: 1.1; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cl-ui .cl-ttl small { display: block; font-size: 21px; opacity: .92; line-height: 1.3; }
        .cl-ui .cl-pn { position: absolute; left: 110px; width: 360px; border-radius: 22px; padding: 12px 16px; background: ${u.panel}; }
        .cl-ui .cl-pr { top: 324px; border: 2px solid ${u.a1}; }
        .cl-ui .cl-hp { top: 488px; border: 2px solid ${u.good}; }
        .cl-ui .cl-pn h4 { margin: 0 0 6px; font-size: 19px; }
        .cl-ui .cl-pn .r { display: flex; gap: 8px; align-items: center; font-size: 19px; padding: 3px 0; }
        .cl-ui .cl-pn .r span { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cl-ui .cl-pn .r b { flex: none; }
        .cl-ui .cl-pn .emp { font-size: 18px; opacity: .75; }
        .cl-ui .cl-mb { position: absolute; left: 110px; width: 360px; border-radius: 18px; padding: 8px 14px; font-size: 18px; font-weight: 700; background: ${u.panel}; }
        .cl-ui .cl-sh { top: 620px; border: 2px solid ${u.good}; }
        .cl-ui .cl-rk { top: 696px; border: 2px solid #ffd23f; }
        .cl-ui .cl-mb .tx { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cl-ui .cl-mb i { display: block; height: 12px; border-radius: 6px; margin-top: 6px; background: ${light ? 'rgba(0,0,0,.1)' : 'rgba(255,255,255,.2)'}; overflow: hidden; }
        .cl-ui .cl-mb i b { display: block; height: 100%; width: 0; border-radius: 6px; transition: width .4s; }
        .cl-ui .cl-sh i b { background: linear-gradient(90deg, #3ddc84, #5ef0ff); }
        .cl-ui .cl-rk i b { background: linear-gradient(90deg, #ffd23f, #ff7a3d); }
        .cl-ui .cl-lg { position: absolute; left: 110px; top: 770px; width: 360px; border-radius: 22px; padding: 10px 14px; background: ${u.panel}; border: 2px solid ${u.a2}; }
        .cl-ui .cl-lg h4 { margin: 0 0 2px; font-size: 19px; }
        .cl-ui .cl-lg div { font-size: 18px; line-height: 1.6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cl-ui .cl-lg img.gicon { width: 1.35em; height: 1.35em; vertical-align: -0.35em; }
        .cl-ui .cl-mt { position: absolute; right: 110px; top: 196px; width: 128px; height: 1130px; border-radius: 30px; padding: 16px 10px; background: ${u.panel}; border: 2px solid ${u.a1}; }
        .cl-ui .cl-mt h4 { margin: 0; text-align: center; font-size: 18px; line-height: 1.2; }
        .cl-ui .cl-mt h4 b { display: block; font-size: 32px; }
        .cl-ui .cl-mt .bar { position: absolute; right: 24px; top: 92px; bottom: 26px; width: 16px; border-radius: 8px; background: ${light ? 'rgba(0,0,0,.1)' : 'rgba(255,255,255,.18)'}; }
        .cl-ui .cl-mt .fill { position: absolute; left: 0; right: 0; bottom: 0; border-radius: 8px; background: linear-gradient(0deg, ${u.a2}, ${u.a1}); transition: height .25s linear; }
        .cl-ui .cl-mt .me { position: absolute; left: 50%; width: 52px; height: 52px; margin-left: -26px; transform: translateY(50%); border-radius: 50%; display: grid; place-items: center; font-size: 28px; background: ${u.a1}; box-shadow: 0 0 14px ${u.a1}; transition: bottom .25s linear; }
        .cl-ui .cl-mt .rec { position: absolute; left: -16px; right: -16px; height: 0; border-top: 3px dashed #ffd23f; }
        .cl-ui .cl-mt .rec span { position: absolute; right: -4px; top: -24px; font-size: 13px; color: #ffd23f; font-weight: 800; white-space: nowrap; text-shadow: 0 1px 2px #000; }
        .cl-ui .cl-mt .zn { position: absolute; right: 26px; transform: translateY(50%); font-size: 15px; font-weight: 700; white-space: nowrap; text-shadow: ${light ? 'none' : '0 1px 3px #000'}; }
        .cl-ui .cl-ban { position: absolute; left: 662px; top: 338px; transform: translateX(-50%) rotate(-2deg) scale(.6); opacity: 0; padding: 8px 18px; border-radius: 18px; font-size: 27px; font-weight: 800; white-space: nowrap; max-width: 470px; overflow: hidden; text-overflow: ellipsis;
          color: #fff; box-shadow: 0 10px 30px rgba(0,0,0,.45); transition: transform .25s cubic-bezier(.2,1.6,.4,1), opacity .25s; }
        .cl-ui .cl-ban.on { opacity: 1; transform: translateX(-50%) rotate(-2deg) scale(1); }
        .cl-ui .cl-ban.bad { background: #ff4fd8; }
        .cl-ui .cl-ban.good { background: #3ddc84; color: #05200f; }
        .cl-ui .cl-ban.gold { background: #ffd23f; color: #3a2a00; }
        .cl-ui .cl-big { position: absolute; left: 0; right: 0; top: 860px; text-align: center; font-size: 96px; font-weight: 900; color: #fff; opacity: 0; transform: scale(.4);
          -webkit-text-stroke: 4px rgba(20,10,40,.85); paint-order: stroke fill; text-shadow: 0 0 30px ${u.a1}, 0 8px 0 rgba(0,0,0,.35); transition: transform .35s cubic-bezier(.2,1.6,.4,1), opacity .3s; }
        .cl-ui .cl-big small { display: block; font-size: 38px; -webkit-text-stroke: 2px rgba(20,10,40,.85); margin-top: 6px; }
        .cl-ui .cl-big.on { opacity: 1; transform: scale(1); }
      `;
    }

    const T = {
      bpm: 120,
      fanH: 1,
      ownSafe: true, // กรอบข้อความวางในพื้นที่ที่มือถือเห็นครบอยู่แล้ว — โหมดเผื่อขอบมือถือไม่ต้องย่อซ้ำ
      rows: [{ y: 2400, s: 1, n: 80, x0: 0, x1: 1080, jy: 0 }], // ไม่ใช้ตัวละครคนดูปกติ
      get css() {
        return css();
      },
      fanSvg() {
        return '';
      },
      init(api) {
        API = api;
        el = document.createElement('div');
        el.className = 'cl-ui';
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
        cx.fillStyle = '#0b0726';
        cx.fillRect(0, 0, W, H);
      },
      drawBg(c, tt) {
        frame(c, tt / 1000);
      },
      // ของขวัญ: ภาพมาจากเหตุการณ์ "prank" ของเซิร์ฟเวอร์ (ตัดสินความสูงที่นั่น) — ตรงนี้ไม่ต้องทำอะไร
      effects: new Proxy({}, {
        get(_o, key) {
          return meta().effects?.[key] ? () => {} : undefined;
        },
        has: (_o, key) => !!meta().effects?.[key],
        ownKeys: () => Object.keys(meta().effects || {}),
        getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
      }),
      onEvent(d, api) {
        if (d.type === 'mgState') return apply(d);
        if (d.type === 'mg') return onEv(d);
      },
      onLike(d, api) {
        // ใจลอยขึ้นไปหาหลอดจรวด
        api.spawn({ type: 'heart', x: api.rand(300, 800), y: 1300, vy: api.rand(-320, -220), max: 1.4, size: api.rand(12, 18), color: '#ff4fa3', fadeIn: 0.1 });
      },
    };
    return T;
  };
})();
