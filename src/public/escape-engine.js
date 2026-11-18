/* เกมหนีออกจากตึก “ตึกเงียบ 19 ชั้น” — ภาพฝั่งหน้าเวที (ธีม escape)
 * เซิร์ฟเวอร์ (mg/escape.js) ตัดสินประตู/ผล/เวลา → ไฟล์นี้เล่นภาพตามช่วง (phase): ห้อง → โหวต → เดินเข้าประตู → ผล → คัทซีน
 * มุมมองหลังตัวละคร ทางเดินแบบจุดลับตาเดียว • ทั้งจอมืด เห็นแค่ตรงที่ไฟฉายส่อง (ชั้นความมืดวาดครึ่งความละเอียดแล้วขยาย)
 * แคนวาส 1080x1920 • กรอบข้อความอยู่ในพื้นที่ที่มือถือเห็นครบ (ข้าง 110 • บน 190 • ล่างไม่เกิน ~1330) ใต้นั้นเป็นแค่พื้น
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
  const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1); // ช่วงย่อยของไทม์ไลน์ 0..1
  const hsh = (n) => {
    let h = (n | 0) ^ 0x9e3779b9;
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const rng = (seed) => {
    let s = seed >>> 0 || 1;
    return () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  // ตัดข้อความเป็นตัวอักษรแบบไม่แยกสระ/วรรณยุกต์ (พิมพ์ทีละตัว)
  const SEG = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('th', { granularity: 'grapheme' }) : null;
  const graphemes = (s) => (SEG ? [...SEG.segment(s)].map((x) => x.segment) : [...s]);

  // ================================================================ ทางเดินแบบจุดลับตาเดียว
  const VP = { x: 540, y: 640 };
  const HW = 300; // ครึ่งความกว้างผนังหลัง (z = 1)
  const TOP = -170; // เพดาน (ผนังหลังบน y 470)
  const BOT = 260; // พื้น (ผนังหลังล่าง y 900)
  const ZN = 0.2;
  const P = (wx, wy, z) => [VP.x + wx / z, VP.y + wy / z];
  const Dz = (d) => 1 / d; // ความลึก d (1 = ผนังหลัง) → z
  function poly(c, pts, fill, stroke, lw) {
    c.beginPath();
    pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
    c.closePath();
    if (fill) {
      c.fillStyle = fill;
      c.fill();
    }
    if (stroke) {
      c.strokeStyle = stroke;
      c.lineWidth = lw || 2;
      c.lineJoin = 'round';
      c.stroke();
    }
  }
  const wallQ = (side, wy0, wy1, z0, z1) => [P(side * HW, wy0, z0), P(side * HW, wy1, z0), P(side * HW, wy1, z1), P(side * HW, wy0, z1)];
  const flatQ = (wx0, wx1, z0, z1, wy) => [P(wx0, wy, z0), P(wx1, wy, z0), P(wx1, wy, z1), P(wx0, wy, z1)];
  const line = (c, a, b, col, lw) => {
    c.strokeStyle = col;
    c.lineWidth = lw || 1;
    c.beginPath();
    c.moveTo(a[0], a[1]);
    c.lineTo(b[0], b[1]);
    c.stroke();
  };
  const rr = (c, x, y, w, h, r, fill, stroke, lw) => {
    c.beginPath();
    c.roundRect(x, y, w, h, r);
    if (fill) {
      c.fillStyle = fill;
      c.fill();
    }
    if (stroke) {
      c.strokeStyle = stroke;
      c.lineWidth = lw || 2;
      c.stroke();
    }
  };
  const ell = (c, x, y, rx, ry, fill) => {
    c.beginPath();
    c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU);
    c.fillStyle = fill;
    c.fill();
  };
  const lg = (c, x0, y0, x1, y1, stops) => {
    const g = c.createLinearGradient(x0, y0, x1, y1);
    stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s));
    return g;
  };
  const rg = (c, x, y, r0, r1, stops) => {
    const g = c.createRadialGradient(x, y, r0, x, y, r1);
    stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s));
    return g;
  };

  // ================================================================ 8 ฉาก (โซน) + เนื้อเรื่อง
  const ZONES = [
    { k: 'hotel', name: 'โรงแรมร้าง', icon: '🏨', floors: '19–17', door: 'wood', light: '255,190,120', dark: 0.93,
      pal: { ceil: '#1d1012', wall: '#4a1c24', wall2: '#5e2430', low: '#2e1a12', floor: '#3a1d18', run: '#6a1822', trim: '#b08a3e', back: '#45202a', frame: '#24120c', d1: '#6a3a22', d2: '#3e1e10' },
      line: '📢 “ยินดีต้อนรับกลับ… ห้อง 1913 ยังรอคุณอยู่”' },
    { k: 'hospital', name: 'โรงพยาบาลเก่า', icon: '🏥', floors: '16–14', door: 'ward', light: '200,255,235', dark: 0.93,
      pal: { ceil: '#1a201f', wall: '#55645f', wall2: '#61716c', low: '#3b4844', floor: '#353c3a', trim: '#9fb3ad', back: '#4a5653', frame: '#262c2a', d1: '#7d8a86', d2: '#4c5653' },
      line: '📢 “ห้ามวิ่งในทางเดิน… คนไข้กำลังหลับ”' },
    { k: 'void', name: 'ชั้นที่ไม่มีอยู่จริง', icon: '🕳️', floors: '13', door: 'iron', light: '255,70,60', dark: 0.95,
      pal: { ceil: '#0e0b0b', wall: '#3a3433', wall2: '#463e3c', low: '#2a2423', floor: '#262120', trim: '#7a2020', back: '#332c2b', frame: '#1a1414', d1: '#6a4234', d2: '#3a221c' },
      line: '📢 “ป้ายชั้น 13 ถูกขูดออก… มีบางอย่างรออยู่ตรงบันได”' },
    { k: 'school', name: 'โรงเรียนกลางคืน', icon: '🏫', floors: '12–10', door: 'class', light: '180,210,255', dark: 0.92,
      pal: { ceil: '#141a24', wall: '#3c4a5e', wall2: '#475872', low: '#2a3242', floor: '#4a3a2a', trim: '#8aa0c0', back: '#3a465a', frame: '#202836', d1: '#7a5a3a', d2: '#4e3520' },
      line: '🔔 กริ่งเข้าเรียนดังขึ้น… ทั้งที่ไม่มีนักเรียนเหลืออยู่' },
    { k: 'library', name: 'ห้องสมุดเงียบ', icon: '📚', floors: '9–7', door: 'lib', light: '255,210,140', dark: 0.92,
      pal: { ceil: '#1a120c', wall: '#4a3422', wall2: '#58412b', low: '#2e2016', floor: '#3e2a1a', trim: '#a07a42', back: '#3e2c1c', frame: '#22160c', d1: '#6a4424', d2: '#40260e' },
      line: '📖 หนังสือทุกเล่ม… มีชื่อของคุณเขียนไว้หน้าสุดท้าย' },
    { k: 'theater', name: 'โรงละครตุ๊กตา', icon: '🎭', floors: '6–4', door: 'curtain', light: '255,170,220', dark: 0.93,
      pal: { ceil: '#140a1c', wall: '#3a1a4a', wall2: '#4c2462', low: '#24102e', floor: '#2a1a30', run: '#5a1030', trim: '#c9a24a', back: '#2e1640', frame: '#1a0c24', d1: '#6a1a3a', d2: '#3e0e26' },
      line: '🎭 การแสดงรอบสุดท้าย… ผู้ชมทุกคนยังนั่งรออยู่ที่เดิม' },
    { k: 'boiler', name: 'ห้องเครื่องใต้ตึก', icon: '⚙️', floors: '3–2', door: 'hatch', light: '255,150,60', dark: 0.93,
      pal: { ceil: '#0f1214', wall: '#343c40', wall2: '#3e484d', low: '#262c2f', floor: '#22282a', trim: '#d08a2a', back: '#30383c', frame: '#181c1e', d1: '#5c666b', d2: '#3a4246' },
      line: '⚙️ เครื่องจักรยังทำงานอยู่… ใครเป็นคนเปิด?' },
    { k: 'lobby', name: 'ล็อบบี้ทางออก', icon: '🚪', floors: '1', door: 'glass', light: '190,220,255', dark: 0.9,
      pal: { ceil: '#12161c', wall: '#3e444c', wall2: '#4a525c', low: '#2c3138', floor: '#4a5058', trim: '#c8b27a', back: '#353b44', frame: '#1c2026', d1: '#2a3a4a', d2: '#1a2430' },
      line: '🚪 ทางออกอยู่ตรงหน้า… แต่ผู้ดูแลก็เช่นกัน' },
  ];
  const NOTES = [
    'บันทึกยามกะดึก #1\nคืนนั้นไฟดับทั้งตึก… ผมสัญญากับทุกคนว่าจะพาลงไปให้ถึงชั้นล่าง',
    'บันทึกยามกะดึก #2\nประตูเปลี่ยนที่ทุกครั้งที่ไม่มีใครมอง อย่าปล่อยให้ไฟฉายดับเด็ดขาด',
    'บันทึกยามกะดึก #3\nใครก็ได้ช่วยยกคัตเอาต์ที่ชั้น 1 ที… ผมลงไปไม่ถึง',
    'บันทึกยามกะดึก #4\nได้ยินเสียงฝีเท้าตามหลังมา… ถ้ามีคนช่วยกันวิ่ง มันจะตามไม่ทัน',
    'บันทึกยามกะดึก #5\nชั้น 13 ไม่มีอยู่ในแบบแปลน แต่ผมเดินผ่านมันทุกคืน',
    'บันทึกยามกะดึก #6\nตุ๊กตาพวกนั้นจะไม่ขยับ… ตราบใดที่ยังมีคนดูอยู่',
    'บันทึกยามกะดึก #7\nผมไม่ได้ไล่ตามพวกคุณ… ผมแค่อยากให้มีใครสักคนออกไปได้',
    'บันทึกยามกะดึก #8\nคัตเอาต์หลักอยู่หลังเคาน์เตอร์ล็อบบี้ ยกมันขึ้น แล้วทุกคนจะได้กลับบ้าน',
  ];
  const OUT = {
    stairs: ['🪜', 'บันไดลงชั้น'], exit: ['🚪', 'ทางออก!'], hall: ['🚶', 'ทางเดินต่อ'], key: ['🗝️', 'กุญแจ'], trap: ['⚠️', 'กับดัก'],
    dead: ['🧱', 'ทางตัน'], ghost: ['👻', 'ผู้ดูแล!'], note: ['📜', 'บันทึก'], treasure: ['💰', 'สมบัติ'],
  };
  const OUT_GLOW = { stairs: '120,255,170', exit: '255,240,170', hall: '200,200,210', key: '255,215,90', trap: '255,120,40', dead: '150,150,150', ghost: '255,40,40', note: '240,225,180', treasure: '255,200,60' };

  // ================================================================ ประตู
  function doorBox(i, n) {
    if (n >= 3) {
      const cx = [340, 540, 740][i];
      return { cx, x0: cx - 66, x1: cx + 66, y0: 668, y1: 900, w: 132, h: 232, hinge: i === 2 ? 1 : -1 };
    }
    const cx = [390, 690][i];
    return { cx, x0: cx - 82, x1: cx + 82, y0: 650, y1: 900, w: 164, h: 250, hinge: i ? 1 : -1 };
  }
  // วาดประตู 1 บาน: open 0..1 (เปิดเข้าด้านใน) • glow = สีแสงหลังประตู
  function drawDoor(c, b, Z, o) {
    const pal = Z.pal;
    const st = Z.door;
    const arch = st === 'lib' || st === 'curtain';
    const shape = (x0, y0, x1, y1) => {
      c.beginPath();
      if (arch) {
        const r = (x1 - x0) / 2;
        c.moveTo(x0, y1);
        c.lineTo(x0, y0 + r);
        c.arc((x0 + x1) / 2, y0 + r, r, Math.PI, 0);
        c.lineTo(x1, y1);
      } else c.rect(x0, y0, x1 - x0, y1 - y0);
      c.closePath();
    };
    // กรอบ
    shape(b.x0 - 12, b.y0 - 12, b.x1 + 12, b.y1);
    c.fillStyle = st === 'curtain' || st === 'wood' ? pal.trim : pal.frame;
    c.fill();
    shape(b.x0 - 5, b.y0 - 5, b.x1 + 5, b.y1);
    c.fillStyle = pal.frame;
    c.fill();
    // ช่องประตู (ด้านหลัง)
    c.save();
    shape(b.x0, b.y0, b.x1, b.y1);
    c.clip();
    c.fillStyle = '#010101';
    c.fillRect(b.x0, b.y0, b.w, b.h);
    if (o.open > 0 && o.glow) {
      c.fillStyle = rg(c, b.cx, b.y0 + b.h * 0.55, 4, b.h * 0.8, [`rgba(${o.glow},${0.85 * o.open})`, `rgba(${o.glow},${0.25 * o.open})`, `rgba(${o.glow},0)`]);
      c.fillRect(b.x0, b.y0, b.w, b.h);
    }
    // บานประตู
    const a = o.open * 1.3;
    const ww = b.w * Math.cos(a);
    const hx = b.hinge < 0 ? b.x0 : b.x1;
    const fx = hx - b.hinge * ww;
    const sk = Math.sin(a) * 18;
    const g = lg(c, b.x0, 0, b.x1, 0, [pal.d1, pal.d2]);
    if (o.open > 0.01) {
      poly(c, [[hx, b.y0], [hx, b.y1], [fx, b.y1 - sk * 0.5], [fx, b.y0 + sk]], g, 'rgba(0,0,0,.6)', 2);
    } else {
      c.fillStyle = g;
      c.fillRect(b.x0, b.y0, b.w, b.h);
      doorDetail(c, b, Z, o);
    }
    c.restore();
    if (o.gone) {
      // ไม้ตีปิด + กากบาท
      c.save();
      shape(b.x0, b.y0, b.x1, b.y1);
      c.clip();
      for (let k = 0; k < 3; k++) {
        const y = b.y0 + b.h * (0.25 + k * 0.25);
        c.save();
        c.translate(b.cx, y);
        c.rotate((k % 2 ? 1 : -1) * 0.18);
        rr(c, -b.w * 0.62, -11, b.w * 1.24, 22, 3, '#5a4028', 'rgba(0,0,0,.6)', 2);
        c.restore();
      }
      c.strokeStyle = 'rgba(200,30,30,.85)';
      c.lineWidth = 9;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(b.x0 + 26, b.y0 + 40);
      c.lineTo(b.x1 - 26, b.y1 - 50);
      c.moveTo(b.x1 - 26, b.y0 + 40);
      c.lineTo(b.x0 + 26, b.y1 - 50);
      c.stroke();
      c.restore();
    }
    if (o.lock && !o.gone && o.open < 0.05) padlock(c, b.cx, b.y0 + b.h * 0.52, 1 + (o.rattle || 0) * 0.1);
  }
  function padlock(c, x, y, s) {
    c.save();
    c.translate(x, y);
    c.scale(s, s);
    c.strokeStyle = '#c9c9c9';
    c.lineWidth = 7;
    c.beginPath();
    c.arc(0, -14, 14, Math.PI, 0);
    c.stroke();
    rr(c, -22, -14, 44, 36, 6, '#d9a52a', '#5a3a0a', 3);
    ell(c, 0, 0, 5, 6, '#3a2400');
    c.restore();
  }
  function doorDetail(c, b, Z, o) {
    const st = Z.door;
    const { x0, y0, x1, y1, w, h, cx } = b;
    const knobX = b.hinge < 0 ? x1 - 22 : x0 + 22;
    const knob = (col) => ell(c, knobX, y0 + h * 0.56, 7, 7, col);
    c.fillStyle = 'rgba(0,0,0,.18)';
    c.fillRect(b.hinge < 0 ? x1 - w * 0.22 : x0, y0, w * 0.22, h); // เงาด้านบานพับ
    if (st === 'wood') {
      rr(c, x0 + 18, y0 + 22, w - 36, h * 0.36, 4, null, 'rgba(0,0,0,.45)', 3);
      rr(c, x0 + 18, y0 + h * 0.48, w - 36, h * 0.42, 4, null, 'rgba(0,0,0,.45)', 3);
      rr(c, cx - 26, y0 + h * 0.4, 52, 20, 3, '#c9a24a');
      c.fillStyle = '#3a2408';
      c.font = '700 15px Kanit, sans-serif';
      c.textAlign = 'center';
      c.fillText(String(o.num || ''), cx, y0 + h * 0.4 + 16);
      knob('#e3b94a');
    } else if (st === 'ward') {
      rr(c, cx - w * 0.22, y0 + 26, w * 0.44, h * 0.3, 3, '#0a1212', '#a9b6b2', 3);
      c.fillStyle = 'rgba(200,255,240,.12)';
      c.fillRect(cx - w * 0.2, y0 + 30, w * 0.14, h * 0.28);
      c.fillStyle = '#9aa7a3';
      c.fillRect(x0 + 8, y1 - 40, w - 16, 26);
      c.fillRect(x0 + 14, y0 + h * 0.52, w - 28, 8);
    } else if (st === 'iron') {
      for (let i = 0; i < 6; i++) for (const yy of [y0 + 14, y1 - 14]) ell(c, x0 + 14 + (i * (w - 28)) / 5, yy, 3.5, 3.5, '#8a5a40');
      c.strokeStyle = 'rgba(20,8,4,.7)';
      c.lineWidth = 2;
      const r = rng(o.num || 13);
      for (let i = 0; i < 7; i++) {
        const sx = x0 + 16 + r() * (w - 32);
        const sy = y0 + 40 + r() * (h * 0.6);
        c.beginPath();
        c.moveTo(sx, sy);
        c.lineTo(sx + 10 + r() * 14, sy + 30 + r() * 30);
        c.stroke();
      }
      c.fillStyle = 'rgba(255,60,50,.45)';
      c.font = '800 40px Kanit, sans-serif';
      c.textAlign = 'center';
      c.fillText('13', cx, y0 + h * 0.42);
      knob('#6a6a6a');
    } else if (st === 'class') {
      rr(c, cx - w * 0.3, y0 + 18, w * 0.6, h * 0.34, 3, '#0b1220', '#a07a52', 4);
      line(c, [cx, y0 + 18], [cx, y0 + 18 + h * 0.34], '#a07a52', 3);
      c.fillStyle = 'rgba(180,210,255,.12)';
      c.fillRect(cx - w * 0.27, y0 + 22, w * 0.18, h * 0.3);
      knob('#c9c9c9');
    } else if (st === 'lib') {
      for (let i = 1; i < 4; i++) line(c, [x0 + (w * i) / 4, y0 + 30], [x0 + (w * i) / 4, y1], 'rgba(0,0,0,.35)', 3);
      ell(c, cx - 8, y0 + h * 0.6, 6, 6, '#d9b45a');
      ell(c, cx + 8, y0 + h * 0.6, 6, 6, '#d9b45a');
    } else if (st === 'curtain') {
      for (let i = 0; i < 6; i++) {
        c.fillStyle = i % 2 ? 'rgba(0,0,0,.22)' : 'rgba(255,255,255,.05)';
        c.fillRect(x0 + (w * i) / 6, y0, w / 6, h);
      }
      c.fillStyle = '#e8c35a';
      c.font = '800 30px Kanit, sans-serif';
      c.textAlign = 'center';
      c.fillText('★', cx, y0 + h * 0.45);
    } else if (st === 'hatch') {
      c.save();
      c.beginPath();
      c.rect(x0, y1 - 46, w, 46);
      c.clip();
      for (let i = -4; i < 12; i++) poly(c, [[x0 + i * 26, y1], [x0 + i * 26 + 13, y1], [x0 + i * 26 + 59, y1 - 46], [x0 + i * 26 + 46, y1 - 46]], '#d9a21a');
      c.restore();
      c.strokeStyle = '#9aa4a8';
      c.lineWidth = 7;
      c.beginPath();
      c.arc(cx, y0 + h * 0.42, 28, 0, TAU);
      c.stroke();
      for (let i = 0; i < 4; i++) {
        const an = (i * TAU) / 4 + 0.4;
        line(c, [cx, y0 + h * 0.42], [cx + Math.cos(an) * 28, y0 + h * 0.42 + Math.sin(an) * 28], '#9aa4a8', 5);
      }
    } else if (st === 'glass') {
      c.fillStyle = lg(c, x0, y0, x1, y1, ['rgba(120,160,200,.35)', 'rgba(20,30,40,.6)', 'rgba(140,180,220,.25)']);
      c.fillRect(x0 + 10, y0 + 10, w - 20, h - 20);
      line(c, [cx, y0], [cx, y1], '#8a96a6', 6);
      line(c, [x0 + 22, y0 + h * 0.55], [cx - 12, y0 + h * 0.55], '#c8d0dc', 5);
      line(c, [cx + 12, y0 + h * 0.55], [x1 - 22, y0 + h * 0.55], '#c8d0dc', 5);
      c.fillStyle = 'rgba(255,255,255,.12)';
      poly(c, [[x0 + 20, y0 + 20], [x0 + 50, y0 + 20], [x0 + 20, y0 + 90]], 'rgba(255,255,255,.12)');
    }
  }

  // ================================================================ ห้อง (ส่วนนิ่ง วาดครั้งเดียวต่อห้อง)
  function roomStatic(Z, seed, n, floor) {
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const c = cv.getContext('2d');
    const pal = Z.pal;
    const r = rng(seed);
    const lights = [];
    // เพดาน / ผนัง / พื้น
    poly(c, flatQ(-HW, HW, 1, ZN, TOP), lg(c, 0, 470, 0, 0, [pal.ceil, '#000000']));
    poly(c, wallQ(-1, TOP, BOT, 1, ZN), lg(c, 240, 0, 0, 0, [pal.wall, pal.wall2]));
    poly(c, wallQ(1, TOP, BOT, 1, ZN), lg(c, 840, 0, W, 0, [pal.wall, pal.wall2]));
    poly(c, flatQ(-HW, HW, 1, ZN, BOT), lg(c, 0, 900, 0, H, [pal.floor, pal.floor]));
    const lowY = Z.k === 'library' || Z.k === 'theater' ? 200 : 120;
    for (const s of [-1, 1]) {
      poly(c, wallQ(s, lowY, BOT, 1, ZN), pal.low);
      line(c, P(s * HW, lowY, 1), P(s * HW, lowY, ZN), pal.trim, 3);
    }
    // พื้น: เส้นกระเบื้อง/ไม้
    c.globalAlpha = 0.5;
    if (Z.k === 'library' || Z.k === 'school') for (let wx = -HW; wx <= HW; wx += 30) line(c, P(wx, BOT, 1), P(wx, BOT, ZN), 'rgba(0,0,0,.45)', 1.5);
    else {
      for (let wx = -HW; wx <= HW; wx += 75) line(c, P(wx, BOT, 1), P(wx, BOT, ZN), 'rgba(0,0,0,.5)', 1.5);
      for (let d = 1; d < 5; d += 0.4) line(c, P(-HW, BOT, Dz(d)), P(HW, BOT, Dz(d)), 'rgba(0,0,0,.5)', 1.5);
    }
    c.globalAlpha = 1;
    if (pal.run) {
      poly(c, flatQ(-150, 150, 1, ZN, BOT), pal.trim);
      poly(c, flatQ(-135, 135, 1, ZN, BOT), pal.run);
    }
    // ผนังหลัง
    c.fillStyle = lg(c, 0, 470, 0, 900, [pal.back, pal.back]);
    c.fillRect(240, 470, 600, 430);
    c.fillStyle = pal.low;
    c.fillRect(240, 860, 600, 40);
    line(c, [240, 860], [840, 860], pal.trim, 3);
    // ---- ของประดับตามฉาก
    const ZD = {
      hotel() {
        c.fillStyle = 'rgba(214,170,90,.22)';
        for (const s of [-1, 1])
          for (let d = 1.08; d < 5; d += 0.26)
            for (let wy = -150; wy < 100; wy += 40) {
              const [x, y] = P(s * HW, wy + ((d * 10) % 2 > 1 ? 20 : 0), Dz(d));
              const k = 5 / d;
              poly(c, [[x, y - k * 1.6], [x + k * 0.6, y], [x, y + k * 1.6], [x - k * 0.6, y]], 'rgba(214,170,90,.22)');
            }
        for (let x = 262; x < 840; x += 40) for (let y = 490; y < 850; y += 44) poly(c, [[x, y - 7], [x + 4, y], [x, y + 7], [x - 4, y]], 'rgba(214,170,90,.2)');
        for (const [s, d0, d1] of [[-1, 1.3, 1.85], [1, 1.45, 2.05]]) {
          poly(c, wallQ(s, -120, -20, Dz(d0), Dz(d1)), '#9a7a36');
          poly(c, wallQ(s, -110, -30, Dz(d0 + 0.05), Dz(d1 - 0.05)), '#1e2a26');
        }
        for (const s of [-1, 1])
          for (const d of [1.12, 2.3]) {
            const [x, y] = P(s * (HW - 2), -40, Dz(d));
            const k = 1 / d;
            rr(c, x - 10 * k, y - 4 * k, 20 * k, 26 * k, 4 * k, '#c9a24a');
            ell(c, x, y - 10 * k, 12 * k, 14 * k, '#ffd9a0');
            lights.push({ x, y: y - 8 * k, r: 150 * k, rgb: '255,190,120', a: 0.75, fl: hsh(d * 99 + s) });
          }
      },
      hospital() {
        c.globalAlpha = 0.35;
        for (const s of [-1, 1]) {
          for (let wy = lowY; wy < BOT; wy += 28) line(c, P(s * HW, wy, 1), P(s * HW, wy, ZN), '#1e2826', 1);
          for (let d = 1; d < 5; d += 0.18) line(c, P(s * HW, lowY, Dz(d)), P(s * HW, BOT, Dz(d)), '#1e2826', 1);
        }
        c.globalAlpha = 1;
        for (const s of [-1, 1]) line(c, P(s * (HW - 6), 90, 1), P(s * (HW - 6), 90, ZN), '#b9c6c2', 5);
        for (const [d0, d1] of [[1.2, 1.45], [1.9, 2.25], [3.0, 3.6]]) {
          poly(c, flatQ(-40, 40, Dz(d0), Dz(d1), TOP), '#cfe7df');
          const [x, y] = P(0, TOP, Dz((d0 + d1) / 2));
          lights.push({ x, y: y + 30, r: 260 / d0, rgb: '200,255,235', a: 0.6, fl: d0 > 1.8 ? 0.95 : 0.2, tube: true });
        }
        // รถเข็นวีลแชร์ชิดผนังซ้าย
        const [wx, wy] = P(-HW + 60, BOT, Dz(1.5));
        const k = 1 / 1.5;
        c.strokeStyle = '#1a1f1e';
        c.lineWidth = 8 * k;
        c.beginPath();
        c.arc(wx, wy - 50 * k, 48 * k, 0, TAU);
        c.stroke();
        rr(c, wx - 40 * k, wy - 120 * k, 80 * k, 16 * k, 4 * k, '#1a1f1e');
        rr(c, wx + 20 * k, wy - 200 * k, 14 * k, 90 * k, 4 * k, '#1a1f1e');
        rr(c, 520, 486, 40, 40, 4, '#e8eeec');
        c.fillStyle = '#c82828';
        c.fillRect(534, 492, 12, 28);
        c.fillRect(526, 500, 28, 12);
      },
      void() {
        for (let i = 0; i < 9; i++) {
          const x = 260 + r() * 560;
          const y = 500 + r() * 360;
          c.fillStyle = rg(c, x, y, 2, 40 + r() * 40, ['rgba(10,5,4,.6)', 'rgba(10,5,4,0)']);
          c.fillRect(x - 80, y - 80, 160, 160);
        }
        c.save();
        c.globalAlpha = 0.5;
        c.fillStyle = '#7a1a1a';
        c.font = '900 150px Kanit, sans-serif';
        c.textAlign = 'center';
        c.fillText('13', 540, 610);
        c.restore();
        for (const s of [-1, 1])
          for (let d = 1.2; d < 4; d += 0.5)
            for (let j = 0; j < 5; j++) line(c, P(s * HW, -60 + j * 8, Dz(d)), P(s * HW, 10 + j * 8, Dz(d + 0.06)), 'rgba(15,5,5,.7)', 2);
        const tape = (d) => {
          const a = P(-HW, TOP + 40, Dz(d));
          const b = P(HW, TOP + 120, Dz(d));
          const k = 22 / d;
          poly(c, [[a[0], a[1]], [b[0], b[1]], [b[0], b[1] + k], [a[0], a[1] + k]], '#d9b21a');
          for (let i = 0; i < 1; i += 0.08) {
            const p0 = [lerp(a[0], b[0], i), lerp(a[1], b[1], i)];
            poly(c, [p0, [p0[0] + 18 / d, p0[1] + (b[1] - a[1]) / 60], [p0[0] + 28 / d, p0[1] + k], [p0[0] + 10 / d, p0[1] + k]], '#1a1a1a');
          }
        };
        tape(1.5);
        const [x, y] = P(0, TOP, Dz(1.35));
        rr(c, x - 22, y, 44, 26, 8, '#5a1010');
        lights.push({ x, y: y + 20, r: 300, rgb: '255,50,40', a: 0.8, spin: true });
      },
      school() {
        for (let d = 1.08; d < 3.9; d += 0.3) {
          poly(c, wallQ(-1, -70, 200, Dz(d), Dz(d + 0.26)), lg(c, ...P(-HW, 0, Dz(d)), ...P(-HW, 0, Dz(d + 0.26)), ['#3a5a7a', '#4a6a8a']), 'rgba(0,0,0,.5)', 1.5);
          for (let j = 0; j < 3; j++) line(c, P(-HW, -55 + j * 8, Dz(d + 0.06)), P(-HW, -55 + j * 8, Dz(d + 0.2)), 'rgba(0,0,0,.45)', 1.5);
        }
        for (const [d0, d1] of [[1.15, 1.75], [2.1, 2.95]]) {
          poly(c, wallQ(1, -120, 30, Dz(d0), Dz(d1)), '#8a96a8');
          poly(c, wallQ(1, -112, 22, Dz(d0 + 0.04), Dz(d1 - 0.05)), lg(c, 0, 300, 0, 800, ['#1a2a4a', '#0a1426']));
          line(c, P(HW, -112, Dz((d0 + d1) / 2)), P(HW, 22, Dz((d0 + d1) / 2)), '#8a96a8', 4);
          const [x, y] = P(HW, -45, Dz((d0 + d1) / 2));
          lights.push({ x, y, r: 160 / d0, rgb: '150,180,255', a: 0.35, win: true });
        }
        ell(c, 540, 520, 34, 34, '#d8dde6');
        c.strokeStyle = '#1a2230';
        c.lineWidth = 4;
        c.beginPath();
        c.arc(540, 520, 34, 0, TAU);
        c.moveTo(540, 520);
        c.lineTo(540, 496);
        c.moveTo(540, 520);
        c.lineTo(556, 528);
        c.stroke();
      },
      library() {
        const cols = ['#5a2a1a', '#2a3a5a', '#3a4a2a', '#6a5a2a', '#4a2a4a', '#2a2a2a', '#7a3a2a'];
        for (const s of [-1, 1]) {
          for (let row = 0; row < 6; row++) {
            const y0 = -160 + row * 58;
            line(c, P(s * HW, y0 + 56, 1), P(s * HW, y0 + 56, ZN), '#2a1a0e', 4);
            let d = 1.02;
            while (d < 4.6) {
              const dw = 0.025 + r() * 0.03;
              const hgt = 38 + r() * 16;
              poly(c, wallQ(s, y0 + 56 - hgt, y0 + 56, Dz(d), Dz(d + dw)), cols[Math.floor(r() * cols.length)]);
              d += dw + 0.004;
            }
          }
        }
        for (const s of [-1, 1]) {
          const [x, y] = P(s * (HW - 4), -80, Dz(1.7));
          lights.push({ x, y, r: 120, rgb: '255,210,140', a: 0.55, fl: 0.4 });
        }
        for (let i = 0; i < 4; i++) {
          rr(c, 270 + i * 150, 490 + (i % 2) * 18, 14, 50, 2, cols[i]);
        }
      },
      theater() {
        for (const s of [-1, 1])
          for (let d = 1; d < 5; d += 0.16) poly(c, wallQ(s, TOP, lowY, Dz(d), Dz(d + 0.08)), 'rgba(0,0,0,.25)');
        for (const s of [-1, 1]) line(c, P(s * HW, TOP + 30, 1), P(s * HW, TOP + 30, ZN), '#c9a24a', 4);
        // หุ่นตุ๊กตายืนเรียงริมผนัง
        for (const [s, d] of [[-1, 1.3], [1, 1.55], [-1, 2.2], [1, 2.8], [-1, 3.4]]) {
          const [x, y] = P(s * (HW - 70), BOT, Dz(d));
          mannequin(c, x, y, 330 / d);
          lights.push({ x, y: y - 300 / d, r: 6, rgb: '255,80,80', a: 0.9, eye: true, ph: hsh(d * 77) });
        }
        poly(c, [[250, 470], [830, 470], [830, 520], [250, 520]], '#5a1030');
        for (let x = 250; x < 830; x += 30) ell(c, x + 15, 520, 15, 10, '#5a1030');
        lights.push({ x: 540, y: 1180, r: 200, rgb: '255,170,220', a: 0.4, flr: true });
      },
      boiler() {
        for (const s of [-1, 1])
          for (const [wy, rad, col] of [[-130, 16, '#5a646a'], [-90, 11, '#7a5a3a'], [70, 20, '#4a545a']]) {
            poly(c, [P(s * (HW - rad), wy - rad, 1), P(s * (HW - rad), wy + rad, 1), P(s * (HW - rad), wy + rad, ZN), P(s * (HW - rad), wy - rad, ZN)], col);
            line(c, P(s * (HW - rad), wy - rad * 0.4, 1), P(s * (HW - rad), wy - rad * 0.4, ZN), 'rgba(255,255,255,.18)', 2);
            for (let d = 1.3; d < 4; d += 0.9) {
              const [x, y] = P(s * (HW - rad), wy, Dz(d));
              ell(c, x, y, (rad * 1.3) / d, (rad * 2.4) / d, '#2a3034');
            }
          }
        c.save();
        c.beginPath();
        c.rect(240, 860, 600, 40);
        c.clip();
        for (let x = 200; x < 880; x += 40) poly(c, [[x, 900], [x + 20, 900], [x + 60, 860], [x + 40, 860]], '#c98a1a');
        c.restore();
        for (const s of [-1, 1]) {
          const [x, y] = P(s * (HW - 4), -40, Dz(1.4));
          rr(c, x - 9, y - 9, 18, 18, 9, '#ff8a20');
          lights.push({ x, y, r: 180, rgb: '255,140,40', a: 0.6, spin2: true, ph: s });
        }
      },
      lobby() {
        c.globalAlpha = 0.18;
        for (let i = 0; i < 10; i++)
          for (let j = 0; j < 12; j++) if ((i + j) % 2) poly(c, flatQ(-HW + i * 60, -HW + (i + 1) * 60, Dz(1 + j * 0.35), Dz(1 + (j + 1) * 0.35), BOT), '#c8d0dc');
        c.globalAlpha = 1;
        for (const s of [-1, 1])
          for (const d of [1.3, 2.4]) {
            poly(c, wallQ(s, TOP, BOT, Dz(d), Dz(d + 0.12)), '#6a727e');
            line(c, P(s * HW, TOP, Dz(d + 0.04)), P(s * HW, BOT, Dz(d + 0.04)), 'rgba(255,255,255,.2)', 3);
          }
        const a = P(-HW, 60, Dz(1.05));
        rr(c, 250, 760, 120, 140, 6, '#4a3a2a', 'rgba(0,0,0,.6)', 2);
        line(c, [250, 770], [370, 770], '#c8b27a', 4);
        void a;
        rr(c, 470, 476, 140, 46, 6, '#0d6a3a');
        c.fillStyle = '#d9ffe9';
        c.font = '800 28px Kanit, sans-serif';
        c.textAlign = 'center';
        c.fillText('ทางออก', 540, 510);
        lights.push({ x: 540, y: 500, r: 130, rgb: '60,255,140', a: 0.7, fl: 0.15 });
      },
    };
    ZD[Z.k]?.();
    // หมอกจาง ๆ ไกลตา
    c.fillStyle = rg(c, VP.x, VP.y + 60, 30, 420, ['rgba(0,0,0,.45)', 'rgba(0,0,0,0)']);
    c.fillRect(0, 200, W, 900);
    return { cv, lights, floor, n };
  }
  function mannequin(c, x, y, h) {
    const u = h / 100;
    c.fillStyle = '#1a1220';
    ell(c, x, y - 92 * u, 8 * u, 9 * u, '#2a2030');
    poly(c, [[x - 14 * u, y - 82 * u], [x + 14 * u, y - 82 * u], [x + 11 * u, y - 40 * u], [x - 11 * u, y - 40 * u]], '#2a2030');
    poly(c, [[x - 11 * u, y - 40 * u], [x + 11 * u, y - 40 * u], [x + 6 * u, y], [x - 6 * u, y]], '#221a28');
    line(c, [x - 14 * u, y - 80 * u], [x - 18 * u, y - 45 * u], '#2a2030', 4 * u);
    line(c, [x + 14 * u, y - 80 * u], [x + 18 * u, y - 45 * u], '#2a2030', 4 * u);
  }

  // ================================================================ ตัวละคร (มองจากด้านหลัง) + ผู้ดูแล
  function drawHero(c, x, y, s, t, o = {}) {
    const w = o.walk || 0; // เฟสก้าวเดิน
    const bob = Math.abs(Math.sin(w)) * (o.run ? 9 : 5);
    const lgA = Math.sin(w) * (o.run ? 12 : 7);
    const rim = o.rim || '150,200,255';
    c.save();
    c.translate(x - 180 * s, y - 540 * s);
    c.scale(s, s);
    c.save();
    c.filter = 'blur(5px)';
    ell(c, 180, 543, 50, 11, 'rgba(0,0,0,.75)');
    c.restore();
    c.translate(0, -bob);
    // ขา + รองเท้า
    for (const [lx, dy] of [[160, lgA], [184, -lgA]]) {
      rr(c, lx, 468, 17, 66 - Math.max(0, dy), 6, '#1b2433');
      rr(c, lx - 3, 524 - Math.max(0, dy), 23, 15, 6, '#3a3f48');
      c.fillStyle = '#c9ccd2';
      c.fillRect(lx - 2, 535 - Math.max(0, dy), 21, 3);
    }
    // แขนซ้าย (ห้อย แกว่งตามก้าว)
    c.save();
    c.translate(138, 406);
    c.rotate(Math.sin(w) * (o.run ? 0.35 : 0.12));
    poly(c, [[-8, 0], [8, -2], [8, 64], [-8, 60]], '#222c3a');
    ell(c, 0, 66, 9, 9, '#c8a184');
    c.restore();
    // ลำตัว ฮู้ด กระเป๋า
    poly(c, [[142, 400], [218, 400], [226, 486], [134, 486]], '#273246');
    poly(c, [[180, 400], [218, 400], [226, 486], [180, 486]], '#1d2636');
    poly(c, [[134, 476], [226, 476], [226, 488], [134, 488]], '#18202e');
    ell(c, 180, 402, 36, 15, '#1d2636');
    rr(c, 150, 410, 60, 62, 14, '#5a3a2a');
    c.fillStyle = '#4a2e20';
    c.beginPath();
    c.roundRect(180, 410, 30, 62, [0, 14, 14, 0]);
    c.fill();
    rr(c, 161, 440, 38, 24, 7, '#6e4a36');
    c.fillStyle = '#d9b45a';
    c.fillRect(176, 446, 8, 3);
    // แขนขวา ยกไฟฉายส่องไปข้างหน้า (ปลายแขนชี้ตามจุดเล็ง)
    const ax = clamp(((o.aimX ?? 540) - x) / s, -90, 90);
    const ay = clamp(((o.aimY ?? 700) - y) / s, -420, -200);
    const hx = 214 + ax * 0.22;
    const hy = 386 + (ay + 300) * 0.05;
    c.strokeStyle = '#222c3a';
    c.lineWidth = 15;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(212, 410);
    c.quadraticCurveTo(226, 398, hx, hy);
    c.stroke();
    rr(c, hx - 7, hy - 12, 14, 18, 4, '#2a2f36');
    ell(c, hx + ax * 0.02, hy - 13, 6, 4, '#fff6d6');
    // หัว (ผมจากด้านหลัง) + หู
    ell(c, 145, 370, 7, 9, '#7a5a48');
    ell(c, 215, 370, 7, 9, '#6a4a3a');
    ell(c, 180, 366, 37, 37, '#16110f');
    ell(c, 170, 352, 16, 9, 'rgba(255,255,255,.07)');
    poly(c, [[160, 395], [170, 386], [178, 398]], '#16110f');
    poly(c, [[182, 398], [192, 384], [200, 396]], '#16110f');
    // ขอบแสง
    c.strokeStyle = `rgba(${rim},.55)`;
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(180, 366, 37, 37, 0, Math.PI * 0.95, Math.PI * 1.7);
    c.stroke();
    c.beginPath();
    c.moveTo(141, 404);
    c.lineTo(135, 480);
    c.stroke();
    c.restore();
    return { hx: x + (hx - 180) * s, hy: y + (hy - 13 - 540) * s - bob * s };
  }
  // ผู้ดูแล: เงาสูง สวมหมวกยาม ตาเรืองแสง (ไม่มีเลือด/ไม่น่ากลัวเกินไลฟ์)
  function drawKeeper(c, x, y, h, t, a, eye = '255,60,50') {
    if (a <= 0) return;
    const u = h / 100;
    c.save();
    c.globalAlpha = a;
    const sway = Math.sin(t * 1.7) * 2 * u;
    c.translate(x + sway, y);
    c.fillStyle = '#030405';
    c.beginPath();
    c.moveTo(-26 * u, 0);
    for (let i = 0; i <= 10; i++) c.lineTo(-26 * u + i * 5.2 * u, (i % 2 ? -6 : 2) * u + Math.sin(t * 4 + i) * 2 * u);
    c.lineTo(24 * u, -60 * u);
    c.lineTo(20 * u, -68 * u);
    c.lineTo(9 * u, -73 * u);
    c.lineTo(-9 * u, -73 * u);
    c.lineTo(-20 * u, -68 * u);
    c.lineTo(-24 * u, -60 * u);
    c.closePath();
    c.fill();
    // แขนยาวถึงเข่า
    for (const s of [-1, 1]) {
      c.save();
      c.translate(s * 21 * u, -66 * u);
      c.rotate(s * (0.12 + Math.sin(t * 1.3 + s) * 0.05));
      poly(c, [[-4 * u, 0], [4 * u, 0], [3 * u, 50 * u], [-3 * u, 50 * u]], '#030405');
      for (let f = -1.5; f <= 1.5; f++) line(c, [f * 2 * u, 50 * u], [f * 3 * u, 58 * u], '#030405', 1.6 * u);
      c.restore();
    }
    ell(c, 0, -80 * u, 9 * u, 10 * u, '#030405');
    poly(c, [[-15 * u, -86 * u], [15 * u, -86 * u], [11 * u, -90 * u], [-11 * u, -90 * u]], '#030405');
    poly(c, [[-11 * u, -90 * u], [11 * u, -90 * u], [9 * u, -99 * u], [-9 * u, -99 * u]], '#030405');
    c.shadowColor = `rgb(${eye})`;
    c.shadowBlur = 12 * u;
    ell(c, -3.6 * u, -80 * u, 2.2 * u, 1.3 * u, `rgb(${eye})`);
    ell(c, 3.6 * u, -80 * u, 2.2 * u, 1.3 * u, `rgb(${eye})`);
    c.restore();
  }
  // มือผู้ดูแลเอื้อมจากขอบล่างตอนไล่ (reach 0 = ไกล .. 1 = ถึงตัว)
  function drawGrab(c, side, reach, t) {
    const bx = side < 0 ? -60 : W + 60;
    const by = H + 80;
    const tx = 540 + side * lerp(400, 150, reach);
    const ty = lerp(1560, 1020, reach) + Math.sin(t * 6 + side) * 18;
    const ang = Math.atan2(ty - by, tx - bx);
    c.save();
    c.translate(tx, ty);
    c.rotate(ang + Math.PI / 2);
    const len = Math.hypot(tx - bx, ty - by);
    c.fillStyle = '#020203';
    c.beginPath();
    c.scale(1.6, 1.6);
    c.moveTo(-30, 0);
    c.lineTo(30, 0);
    c.lineTo(48, len);
    c.lineTo(-48, len);
    c.closePath();
    c.fill();
    for (let f = -2; f <= 2; f++) {
      c.save();
      c.rotate(f * 0.28 + Math.sin(t * 9 + f) * 0.06);
      c.beginPath();
      c.moveTo(-7, 0);
      c.lineTo(0, -110 - Math.abs(f) * -14);
      c.lineTo(7, 0);
      c.fill();
      c.restore();
    }
    c.strokeStyle = 'rgba(255,50,40,.45)';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(-30, 0);
    c.lineTo(-48, len);
    c.stroke();
    c.restore();
  }

  // ================================================================ ฉากคัทซีน
  // ตัวละครมุมข้าง (ใช้ตอนเดินลงบันได) — dir 1 = หันขวา, -1 = หันซ้าย • (x, y) = เท้า
  function drawHeroSide(c, x, y, s, t, dir, w, rim) {
    const sw = Math.sin(w);
    c.save();
    c.translate(x, y);
    c.scale(s * dir, s);
    c.save();
    c.filter = 'blur(3px)';
    ell(c, 0, 2, 34, 6, 'rgba(0,0,0,.7)');
    c.restore();
    const bob = Math.abs(Math.cos(w)) * 3;
    c.translate(0, -bob);
    const leg = (a, col, shoe) => {
      c.save();
      c.translate(0, -78);
      c.rotate(a);
      rr(c, -8, 0, 16, 74, 7, col);
      rr(c, -8, 66, 28, 13, 6, shoe);
      c.fillStyle = '#c9ccd2';
      c.fillRect(-8, 76, 28, 3);
      c.restore();
    };
    // แขนหลัง + ขาหลัง (เข้มกว่า)
    c.save();
    c.translate(-2, -142);
    c.rotate(-sw * 0.5);
    rr(c, -7, 0, 14, 56, 7, '#1a2230');
    c.restore();
    leg(-sw * 0.45, '#141c28', '#2a2e36');
    // กระเป๋าเป้ (ด้านหลัง) + ลำตัว
    rr(c, -46, -148, 28, 58, 9, '#4a2e20');
    rr(c, -42, -140, 12, 30, 5, '#6e4a36');
    rr(c, -22, -152, 42, 80, 14, '#273246');
    c.fillStyle = '#1d2636';
    c.fillRect(-22, -82, 42, 10);
    leg(sw * 0.45, '#1b2433', '#3a3f48');
    // หัว: ผมด้านหลัง/บน หน้าด้านหน้า
    ell(c, 2, -176, 25, 25, '#e0b48e');
    c.fillStyle = '#16110f';
    c.beginPath();
    c.ellipse(-3, -180, 25, 24, 0, Math.PI * 0.62, Math.PI * 2.08);
    c.fill();
    ell(c, -2, -172, 5, 7, '#c99a74');
    ell(c, 18, -176, 2.5, 3, '#1a1010');
    // แขนหน้า ถือไฟฉายส่องไปข้างหน้าเฉียงลง
    c.strokeStyle = '#222c3a';
    c.lineWidth = 14;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(4, -140);
    c.quadraticCurveTo(22, -116, 40, -112);
    c.stroke();
    c.save();
    c.translate(44, -112);
    c.rotate(0.45);
    rr(c, -4, -7, 26, 14, 4, '#2a2f36');
    ell(c, 23, 0, 4, 7, '#fff6d6');
    c.restore();
    // ขอบแสง
    c.strokeStyle = `rgba(${rim},.5)`;
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(2, -176, 25, 25, 0, Math.PI * 1.1, Math.PI * 1.75);
    c.stroke();
    c.restore();
    return { lx: x + dir * (44 + 26) * s, ly: y - (112 - 10) * s };
  }
  // บันไดหนีไฟ (มองจากด้านข้าง): ช่วงละ 12 ขั้น สลับซ้าย–ขวา ตัวละครเดินลง เลี้ยวที่ชานพัก แล้วลงช่วงถัดไป
  function drawStairwell(c, t, k, from, to, light) {
    const SH = 50; // สูงต่อขั้น
    const SW = 88; // กว้างต่อขั้น
    const N = 9; // ขั้นต่อช่วง
    const M = (W - N * SW) / 2; // ขอบซ้าย/ขวาของช่วงบันได
    const GAP = N * SH + SH; // ระยะระหว่างช่วงบันได (N ขั้น + ชานพัก)
    const Y0 = 300;
    const fy = (f) => Y0 + f * GAP;
    const sx = (f, p) => (f % 2 === 0 ? M + p * SW + SW / 2 : W - M - p * SW - SW / 2); // กลางขั้นที่ p
    const stepY = (f, p) => fy(f) + (Math.floor(p) + ease(clamp(((p % 1) - 0.55) / 0.45, 0, 1))) * SH;
    // ทางเดินของตัวละคร
    let hx;
    let hy;
    let dir;
    let w;
    if (k < 0.48) {
      const p = (k / 0.48) * N;
      hx = sx(0, p);
      hy = stepY(0, Math.min(p, N));
      dir = 1;
      w = p * Math.PI;
    } else if (k < 0.58) {
      const q = seg(k, 0.48, 0.58);
      hx = lerp(sx(0, N), sx(1, 0), q);
      hy = fy(0) + N * SH + ease(q) * SH;
      dir = q < 0.5 ? 1 : -1;
      w = N * Math.PI + q * 2;
    } else {
      const p = ((k - 0.58) / 0.42) * (N - 1);
      hx = sx(1, p);
      hy = stepY(1, p);
      dir = -1;
      w = p * Math.PI;
    }
    // กล้องตามตัวละคร (ตัวละครอยู่กลางจอค่อนล่าง)
    const cam = hy - 1060;
    c.fillStyle = '#16191b';
    c.fillRect(0, 0, W, H);
    c.save();
    c.translate(0, -cam);
    for (let f = -1; f < 3; f++) {
      const y0 = fy(f);
      const right = f % 2 === 0;
      // ผนังปูน + ตัวเลขชั้นทาสีแดง
      c.fillStyle = 'rgba(220,60,40,.55)';
      c.font = '900 240px Kanit, sans-serif';
      c.textAlign = 'center';
      const num = f === -1 ? from + 1 : f === 0 ? from : f === 1 ? to : to - 1;
      if (num >= 1 && num <= 19) c.fillText(String(num), right ? 820 : 260, y0 + 200);
      // ชานพัก
      c.fillStyle = '#26292c';
      if (right) c.fillRect(M + N * SW, y0 + N * SH, W, SH + 6);
      else c.fillRect(-10, y0 + N * SH, M + 10, SH + 6);
      // ขั้นบันได (สามเหลี่ยมขั้น ๆ ถมด้านล่าง)
      for (let s2 = 0; s2 < N; s2++) {
        const x0 = right ? M + s2 * SW : W - M - (s2 + 1) * SW;
        const y = y0 + s2 * SH;
        c.fillStyle = s2 % 2 ? '#34383c' : '#2e3236';
        c.fillRect(x0, y, SW, SH);
        c.fillStyle = '#222528';
        c.fillRect(x0, y + SH, SW, SH * 0.6);
        line(c, [x0, y], [x0 + SW, y], '#4a5056', 3);
      }
      // ราวจับ
      const a = right ? [M - 10, y0 - 100] : [W - M + 10, y0 - 100];
      const b = right ? [M + N * SW, y0 + N * SH - 100] : [W - M - N * SW, y0 + N * SH - 100];
      line(c, a, b, '#6a7076', 7);
      for (let i = 0; i <= 4; i++) line(c, [lerp(a[0], b[0], i / 4), lerp(a[1], b[1], i / 4)], [lerp(a[0], b[0], i / 4), lerp(a[1], b[1], i / 4) + 100], '#4a5056', 4);
    }
    const L = drawHeroSide(c, hx, hy, 1.45, t, dir, w, light);
    c.restore();
    // ไฟฉายส่องไปข้างหน้าเฉียงลง (ตามทิศที่เดิน)
    const sy0 = L.ly - cam;
    const ax = L.lx + dir * 280;
    const ay = sy0 + 200;
    const dk = 0.86 - 0.1 * Math.sin(t * 13) * (hsh(Math.floor(t * 8)) > 0.8 ? 1 : 0);
    darkness(c, { a: dk, spots: [{ x: ax, y: ay, rx: 300, ry: 230 }], cone: { hx: L.lx, hy: sy0, ax, ay, w: 120 }, amb: { x: hx, y: hy - cam - 90, r: 300, a: 0.55 }, lights: [] });
    // วาดตัวละครทับความมืดให้เห็นชัด
    c.save();
    c.translate(0, -cam);
    drawHeroSide(c, hx, hy, 1.45, t, dir, w, light);
    c.restore();
  }
  function drawElevator(c, t, k, from, to) {
    const shakeY = k > 0.18 && k < 0.82 ? Math.sin(t * 50) * 4 : 0;
    c.save();
    c.translate(0, shakeY);
    c.fillStyle = '#1a1d20';
    c.fillRect(0, 0, W, H);
    poly(c, [[0, 0], [240, 360], [240, 1100], [0, H]], lg(c, 0, 0, 240, 0, ['#4a5056', '#2a2e32']));
    poly(c, [[W, 0], [840, 360], [840, 1100], [W, H]], lg(c, W, 0, 840, 0, ['#4a5056', '#2a2e32']));
    poly(c, [[240, 1100], [840, 1100], [W, H], [0, H]], '#2a2c2e');
    for (const s of [-1, 1]) line(c, [540 + s * 300, 860], [540 + s * 540, 1260], '#9aa2aa', 8);
    // ประตูลิฟต์ (ด้านหน้าตัวละคร)
    const open = k < 0.12 ? 1 - seg(k, 0, 0.12) : k > 0.86 ? seg(k, 0.86, 0.98) : 0;
    c.fillStyle = '#05070a';
    c.fillRect(300, 420, 480, 680);
    if (open > 0) {
      c.fillStyle = rg(c, 540, 760, 10, 420, ['rgba(255,230,170,.5)', 'rgba(255,230,170,0)']);
      c.fillRect(300, 420, 480, 680);
    }
    const pw = 240 * (1 - open);
    c.fillStyle = lg(c, 300, 0, 540, 0, ['#8a929a', '#5a6168', '#7a828a']);
    c.fillRect(300, 420, pw, 680);
    c.fillRect(780 - pw, 420, pw, 680);
    line(c, [300 + pw, 420], [300 + pw, 1100], '#2a2e32', 3);
    line(c, [780 - pw, 420], [780 - pw, 1100], '#2a2e32', 3);
    rr(c, 230, 340, 620, 80, 10, '#3a3e42');
    // ตัวเลขชั้น
    const f = Math.round(lerp(from, to, ease(seg(k, 0.15, 0.85))));
    rr(c, 440, 250, 200, 80, 10, '#050505', '#5a6168', 3);
    c.fillStyle = '#ff5a3a';
    c.font = '800 60px Kanit, sans-serif';
    c.textAlign = 'center';
    c.shadowColor = '#ff5a3a';
    c.shadowBlur = 16;
    c.fillText(`${f} ▼`, 540, 312);
    c.shadowBlur = 0;
    c.restore();
    drawHero(c, 540, 1290, 1.9, t, { aimX: 540, aimY: 700, rim: '255,200,140' });
    // ประกายไฟร่วงจากเพดาน
    if (k > 0.2 && k < 0.8)
      for (let i = 0; i < 18; i++) {
        const sx = 260 + hsh(i * 13) * 560;
        const sy = ((t * (500 + hsh(i) * 500) + hsh(i * 7) * 1600) % 1500) + 200;
        ell(c, sx, sy, 3, 3, 'rgba(255,200,80,.9)');
      }
    const flick = k > 0.3 && k < 0.7 && hsh(Math.floor(t * 10)) > 0.75 ? 0.25 : 0;
    darkness(c, { a: 0.55 + flick, spots: [{ x: 540, y: 300, rx: 260, ry: 220 }], amb: { x: 540, y: 900, r: 600, a: 0.6 }, lights: [] });
  }
  function drawTower(c, t, k) {
    const sun = seg(k, 0.4, 1);
    c.fillStyle = lg(c, 0, 0, 0, H, [`rgb(${Math.round(lerp(8, 80, sun))},${Math.round(lerp(10, 90, sun))},${Math.round(lerp(30, 160, sun))})`, `rgb(${Math.round(lerp(20, 255, sun))},${Math.round(lerp(20, 160, sun))},${Math.round(lerp(50, 110, sun))})`]);
    c.fillRect(0, 0, W, H);
    if (sun > 0) {
      c.fillStyle = rg(c, 540, 1500, 20, 700, [`rgba(255,230,160,${0.9 * sun})`, 'rgba(255,180,90,0)']);
      c.fillRect(0, 700, W, 1220);
    }
    c.fillStyle = '#0b0d12';
    c.fillRect(0, 1480, W, 440);
    c.fillStyle = '#12151c';
    c.fillRect(360, 300, 360, 1180);
    poly(c, [[360, 300], [540, 230], [720, 300]], '#12151c');
    const lit = seg(k, 0.05, 0.55) * 19;
    for (let f = 0; f < 19; f++) {
      const y = 1430 - f * 60;
      for (let i = 0; i < 5; i++) {
        const on = f < lit;
        c.fillStyle = on ? (hsh(f * 9 + i) > 0.2 ? '#ffd27a' : '#fff1c4') : '#1c2028';
        c.fillRect(384 + i * 66, y, 46, 34);
      }
    }
    // ยามผู้ดูแลที่หน้าต่างชั้นบนสุด โบกมือ แล้วจางเป็นแสง
    const ka = seg(k, 0.55, 0.65) * (1 - seg(k, 0.85, 0.95));
    if (ka > 0) {
      c.save();
      c.globalAlpha = ka;
      drawKeeper(c, 540, 380, 70, t, 1, '255,230,160');
      c.restore();
      c.fillStyle = `rgba(255,230,160,${0.5 * seg(k, 0.8, 0.9) * ka})`;
      c.beginPath();
      c.arc(540, 340, 60, 0, TAU);
      c.fill();
    }
  }

  // ================================================================ ชั้นความมืด (ไฟฉาย)
  let dkCv = null;
  function darkness(c, o) {
    if (!dkCv) {
      dkCv = document.createElement('canvas');
      dkCv.width = W / 2;
      dkCv.height = H / 2;
    }
    const k = dkCv.getContext('2d');
    k.setTransform(0.5, 0, 0, 0.5, 0, 0);
    k.globalCompositeOperation = 'source-over';
    k.clearRect(0, 0, W, H);
    if (o.a <= 0.01) return;
    k.fillStyle = `rgba(2,3,5,${o.a})`;
    k.fillRect(0, 0, W, H);
    k.globalCompositeOperation = 'destination-out';
    for (const s of o.spots || []) {
      k.save();
      k.translate(s.x, s.y);
      k.scale(s.rx / s.ry, 1);
      k.fillStyle = rg(k, 0, 0, 0, s.ry, [`rgba(0,0,0,${s.a ?? 1})`, `rgba(0,0,0,${(s.a ?? 1) * 0.9})`, 'rgba(0,0,0,0)']);
      k.fillRect(-s.ry, -s.ry, s.ry * 2, s.ry * 2);
      k.restore();
    }
    if (o.cone) {
      const { hx, hy, ax, ay, w } = o.cone;
      const dx = ax - hx;
      const dy = ay - hy;
      const L = Math.hypot(dx, dy) || 1;
      const nx = -dy / L;
      const ny = dx / L;
      k.beginPath();
      k.moveTo(hx, hy);
      k.lineTo(ax + nx * w, ay + ny * w);
      k.lineTo(ax - nx * w, ay - ny * w);
      k.closePath();
      k.fillStyle = lg(k, hx, hy, ax, ay, ['rgba(0,0,0,.55)', 'rgba(0,0,0,.25)']);
      k.fill();
    }
    if (o.amb) {
      k.fillStyle = rg(k, o.amb.x, o.amb.y, 10, o.amb.r, [`rgba(0,0,0,${o.amb.a})`, 'rgba(0,0,0,0)']);
      k.fillRect(o.amb.x - o.amb.r, o.amb.y - o.amb.r, o.amb.r * 2, o.amb.r * 2);
    }
    for (const L of o.lights || []) {
      if (L.a <= 0.01) continue;
      k.fillStyle = rg(k, L.x, L.y, 1, L.r, [`rgba(0,0,0,${L.a})`, 'rgba(0,0,0,0)']);
      k.fillRect(L.x - L.r, L.y - L.r, L.r * 2, L.r * 2);
    }
    c.drawImage(dkCv, 0, 0, W, H);
    // แสงอุ่นของไฟฉาย + สีของแหล่งไฟ
    c.save();
    c.globalCompositeOperation = 'lighter';
    if (o.cone) {
      const { hx, hy, ax, ay, w } = o.cone;
      const dx = ax - hx;
      const dy = ay - hy;
      const L = Math.hypot(dx, dy) || 1;
      const nx = -dy / L;
      const ny = dx / L;
      c.beginPath();
      c.moveTo(hx, hy);
      c.lineTo(ax + nx * w * 0.9, ay + ny * w * 0.9);
      c.lineTo(ax - nx * w * 0.9, ay - ny * w * 0.9);
      c.closePath();
      c.fillStyle = lg(c, hx, hy, ax, ay, ['rgba(255,235,180,.2)', 'rgba(255,235,180,.03)']);
      c.fill();
    }
    for (const s of o.spots || []) {
      if (s.tint === false) continue;
      c.fillStyle = rg(c, s.x, s.y, 0, s.ry * 0.8, ['rgba(255,225,160,.13)', 'rgba(255,225,160,0)']);
      c.fillRect(s.x - s.ry, s.y - s.ry, s.ry * 2, s.ry * 2);
    }
    for (const L of o.lights || []) {
      if (L.a <= 0.01 || !L.rgb) continue;
      c.fillStyle = rg(c, L.x, L.y, 0, L.r * 0.7, [`rgba(${L.rgb},${0.22 * L.a})`, `rgba(${L.rgb},0)`]);
      c.fillRect(L.x - L.r, L.y - L.r, L.r * 2, L.r * 2);
    }
    c.restore();
  }

  // ================================================================ ธีม
  window.makeEscapeTheme = function makeEscapeTheme(id) {
    let API = null;
    let el = null;
    let S = { phase: 'intro', pid: 0, dur: 14000, left: 14000, floor: 19, floors: 19, zone: 0, roomNo: 0, seed: 1, doors: [{}, {}], votes: [0, 0], voters: 0, hearts: 3, keys: 0, charm: 0, bell: 0, notes: 0, charge: 0, chargeMax: 300, exp: [], guides: [], ph: {}, pick: -1 };
    let cut = { phase: 'intro', pid: -1, t0: 0, dur: 14, ph: {} };
    let room = null;
    let roomKey = '';
    let roomIn = 0; // เวลาเริ่มห้องใหม่ (เฟดเข้า)
    let lastT = 0;
    let aim = { x: 540, y: 760 };
    let walkPh = 0;
    let shake = 0;
    let flash = 0;
    let flashCol = '255,255,255';
    let lightning = 0;
    const parts = [];
    const chips = [];
    const host = () => (API?.t?.host || meta().defaults?.host || 'น้องกล้า').trim();
    const Zc = () => ZONES[clamp(S.zone | 0, 0, 7)];

    function getRoom() {
      const key = `${S.run}|${S.floor}|${S.roomNo}|${S.seed}|${S.doors.length}`;
      if (key !== roomKey) {
        roomKey = key;
        room = roomStatic(Zc(), S.seed, S.doors.length, S.floor);
        roomIn = performance.now() / 1000;
      }
      return room;
    }

    // ---------------------------------------------------------------- อนุภาค
    function burst(x, y, n, cols, o = {}) {
      for (let i = 0; i < n; i++) {
        const a = o.a0 != null ? o.a0 + (Math.random() - 0.5) * (o.spread || 1) : Math.random() * TAU;
        const v = (o.v0 || 100) + Math.random() * ((o.v1 || 400) - (o.v0 || 100));
        parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: o.g ?? 600, life: 0, max: (o.max || 1.4) * (0.6 + Math.random() * 0.6), s: (o.size || 6) * (0.6 + Math.random() * 0.8), col: cols[i % cols.length], rect: o.rect, text: o.text });
      }
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
        c.globalAlpha = clamp(1 - p.life / p.max, 0, 1);
        if (p.text) {
          c.font = `${p.s}px "Segoe UI Emoji", sans-serif`;
          c.textAlign = 'center';
          c.fillText(p.text, p.x, p.y);
        } else if (p.rect) {
          c.fillStyle = p.col;
          c.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s * 0.6);
        } else ell(c, p.x, p.y, p.s / 2, p.s / 2, p.col);
      }
      c.globalAlpha = 1;
    }

    // ---------------------------------------------------------------- ห้องปัจจุบัน + กล้อง
    // cam: { f: [x,y] จุดซูม, z: ซูม } • op: เปิดประตู pick
    function drawRoomView(c, t, o = {}) {
      const R = getRoom();
      const Z = Zc();
      const n = S.doors.length;
      const zf = o.zoom || 1;
      const F = o.focus || [540, 780];
      c.save();
      c.translate(F[0], F[1]);
      c.scale(zf, zf);
      c.translate(-F[0], -F[1]);
      c.drawImage(R.cv, 0, 0);
      // ของในห้องที่ขยับ
      roomDyn(c, t, Z, R);
      for (let i = 0; i < n; i++) {
        const b = doorBox(i, n);
        const d = S.doors[i] || {};
        const open = i === o.pick ? o.open || 0 : 0;
        drawDoor(c, b, Z, { open, glow: o.glow || OUT_GLOW[d.o] || '255,230,170', gone: d.gone, lock: d.lock || (i === o.pick && o.lock), num: S.floor * 100 + S.roomNo * 3 + i + 1, rattle: i === o.pick ? o.rattle : 0 });
      }
      if (o.wall) o.wall(c);
      c.restore();
      const tx = (p) => [F[0] + (p[0] - F[0]) * zf, F[1] + (p[1] - F[1]) * zf];
      const lights = R.lights.map((L) => {
        let a = L.a;
        if (L.fl != null) a *= hsh(Math.floor(t * 9 + L.fl * 50)) < L.fl * 0.35 ? 0.15 : 1;
        if (L.tube && L.fl > 0.5) a *= Math.sin(t * 31) > 0.4 || hsh(Math.floor(t * 4)) > 0.6 ? 1 : 0.1;
        if (L.spin) a *= 0.55 + 0.45 * Math.sin(t * 5);
        if (L.spin2) a *= 0.5 + 0.5 * Math.sin(t * 4 + L.ph * 1.5);
        if (L.eye) a *= hsh(Math.floor(t * 0.7 + L.ph * 9)) > 0.75 ? 1 : 0;
        if (L.win) a *= 0.4 + lightning * 2;
        const p = tx([L.x, L.y]);
        return { x: p[0], y: p[1], r: L.r * zf, rgb: L.rgb, a: a * (o.lightMul ?? 1) };
      });
      return { tx, lights };
    }
    function roomDyn(c, t, Z, R) {
      if (Z.k === 'void') {
        // ไฟฉุกเฉินหมุน
        const [x, y] = P(0, TOP, Dz(1.35));
        c.save();
        c.globalCompositeOperation = 'lighter';
        const an = t * 3;
        for (const s of [0, Math.PI]) {
          c.fillStyle = lg(c, x, y, x + Math.cos(an + s) * 600, y + Math.sin(an + s) * 300 + 200, ['rgba(255,40,30,.35)', 'rgba(255,40,30,0)']);
          c.beginPath();
          c.moveTo(x, y + 14);
          c.lineTo(x + Math.cos(an + s - 0.25) * 700, y + 300 + Math.sin(an + s - 0.25) * 300);
          c.lineTo(x + Math.cos(an + s + 0.25) * 700, y + 300 + Math.sin(an + s + 0.25) * 300);
          c.fill();
        }
        c.restore();
      } else if (Z.k === 'boiler') {
        // ไอน้ำ
        c.save();
        for (let i = 0; i < 10; i++) {
          const s = i % 2 ? 1 : -1;
          const k = (t * 0.25 + hsh(i * 7)) % 1;
          const [x, y] = P(s * (HW - 20), -130, Dz(1.3 + hsh(i) * 2.5));
          c.globalAlpha = 0.18 * (1 - k);
          ell(c, x - s * k * 120, y - k * 160, 30 + k * 80, 24 + k * 60, '#c8d0d4');
        }
        c.restore();
      } else if (Z.k === 'library') {
        // กระดาษลอย
        for (let i = 0; i < 7; i++) {
          const k = (t * 0.06 + hsh(i * 3)) % 1;
          const x = 300 + hsh(i * 5) * 480 + Math.sin(t + i) * 40;
          const y = 1000 - k * 600;
          c.save();
          c.translate(x, y);
          c.rotate(Math.sin(t * 1.5 + i) * 0.8);
          c.globalAlpha = 0.6 * Math.sin(k * Math.PI);
          c.fillStyle = '#e8dcc0';
          c.fillRect(-14, -18, 28, 36);
          c.restore();
        }
      }
    }
    // จุดเล็งไฟฉาย: ตอนโหวตเล็งไปประตูที่นำอยู่ (ไม่มีใครโหวต = กวาดไปมา)
    function aimTarget(t) {
      const n = S.doors.length;
      if (cut.phase === 'vote') {
        const v = S.votes || [];
        const best = Math.max(0, ...v);
        if (best > 0) {
          const i = v.indexOf(best);
          const b = doorBox(i, n);
          return [b.cx + Math.sin(t * 1.3) * 20, 770 + Math.cos(t * 1.1) * 30];
        }
        return [540 + Math.sin(t * 0.7) * 230, 770 + Math.sin(t * 1.3) * 40];
      }
      if (S.pick >= 0) {
        const b = doorBox(S.pick, n);
        return [b.cx, 770];
      }
      return [540, 760];
    }

    // ================================================================ วาดทุกเฟรม
    function frame(c, t) {
      const dt = lastT ? Math.min(0.1, t - lastT) : 0.016;
      lastT = t;
      const el2 = t - cut.t0;
      const k = clamp(el2 / cut.dur, 0, 1);
      if (Math.random() < 0.0015 && (Zc().k === 'school' || Zc().k === 'hotel')) lightning = 0.6;
      lightning = Math.max(0, lightning - dt * 1.6);
      const [tx, ty] = aimTarget(t);
      aim.x = lerp(aim.x, tx, Math.min(1, dt * 3));
      aim.y = lerp(aim.y, ty, Math.min(1, dt * 3));
      c.save();
      if (shake > 0) {
        c.translate((Math.random() - 0.5) * shake * 40, (Math.random() - 0.5) * shake * 40);
        shake = Math.max(0, shake - dt * 2.2);
      }
      c.fillStyle = '#000';
      c.fillRect(-60, -60, W + 120, H + 120);
      const ph = cut.phase;
      const Z = Zc();
      const heroAt = (o = {}) => drawHero(c, o.x ?? 540, o.y ?? 1290, o.s ?? 1.9, t, { walk: walkPh, run: o.run, aimX: aim.x, aimY: aim.y, rim: Z.light });
      const std = (o = {}) => {
        // ฉากห้อง + ตัวละคร + ไฟฉาย (ใช้กับหลายช่วง)
        const v = drawRoomView(c, t, o);
        if (o.keeper) o.keeper(c, v);
        const h = o.noHero ? null : heroAt(o.hero || {});
        const base = Z.dark - lightning * 0.35 - (o.lit || 0);
        const ap = o.aim || [aim.x, aim.y];
        darkness(c, {
          a: clamp(base * (o.darkMul ?? 1), 0, 0.97),
          spots: [{ x: ap[0], y: ap[1], rx: 230 * (o.spotMul || 1), ry: 170 * (o.spotMul || 1) }, ...(o.spots || [])],
          cone: h ? { hx: h.hx, hy: h.hy, ax: ap[0], ay: ap[1], w: 150 } : null,
          amb: { x: 540, y: 1150, r: 420, a: 0.55 },
          lights: [...v.lights, ...(o.lights || [])],
        });
        if (h && !o.noHero) heroAt(o.hero || {}); // วาดตัวละครทับความมืด (ให้เห็นชัด)
        if (o.after) o.after(c, v);
        return v;
      };
      const fadeBlack = (a) => {
        if (a <= 0) return;
        c.fillStyle = `rgba(0,0,0,${clamp(a, 0, 1)})`;
        c.fillRect(-60, -60, W + 120, H + 120);
      };
      const n = S.doors.length;
      const pb = S.pick >= 0 ? doorBox(S.pick, n) : doorBox(0, n);
      const pf = [pb.cx, 790];
      const ZOOM = 2.1;
      switch (ph) {
        case 'intro': {
          if (el2 < 3.2) fadeBlack(1);
          else {
            const on = el2 < 3.6 ? (hsh(Math.floor(el2 * 30)) > 0.5 ? 1 : 0) : 1;
            if (on) std({ darkMul: 1, spotMul: 0.6 + seg(el2, 3.2, 6) * 0.4 });
            else fadeBlack(1);
            fadeBlack(1 - seg(el2, 3.2, 4.5) * 0.85 - 0.15);
          }
          break;
        }
        case 'zone': {
          if (el2 < 3.4) drawStairwell(c, t, seg(el2, 0, 3.4), S.floor + 1, S.floor, Z.light);
          else {
            std({});
            fadeBlack(1 - seg(el2, 3.4, 4.4));
          }
          break;
        }
        case 'vote': {
          walkPh += dt * 0.0;
          std({});
          fadeBlack(1 - seg(t - roomIn, 0, 0.8));
          break;
        }
        case 'walk': {
          const kz = ease(seg(k, 0.12, 0.85));
          walkPh += dt * 9 * (kz > 0 && kz < 1 ? 1 : 0);
          const open = ease(seg(k, 0.55, 0.9));
          std({ zoom: lerp(1, ZOOM, kz), focus: pf, pick: S.pick, open, aim: [pb.cx, 760], hero: { y: 1290 - kz * 20 } });
          if (k > 0.55 && !cut._creak) {
            cut._creak = 1;
            API?.sfx?.whoosh?.();
          }
          break;
        }
        case 'hall':
        case 'key':
        case 'treasure':
        case 'note':
        case 'trap':
        case 'unlock': {
          const lock = ph === 'unlock' && k < 0.45;
          const open = ph === 'unlock' ? ease(seg(k, 0.45, 0.8)) : 1;
          std({ zoom: ZOOM + (ph === 'hall' ? k * 0.8 : 0), focus: pf, pick: S.pick, open, lock, aim: [pb.cx, 760], lit: ph === 'treasure' ? 0.2 : 0 });
          const P0 = [540, 780];
          if (ph === 'key' && el2 < 2.2) {
            const yy = lerp(860, 640, ease(seg(el2, 0, 1.2)));
            c.save();
            c.translate(P0[0], yy);
            c.rotate(Math.sin(t * 3) * 0.3);
            c.shadowColor = '#ffd54a';
            c.shadowBlur = 40;
            c.font = '170px "Segoe UI Emoji", sans-serif';
            c.textAlign = 'center';
            c.fillText('🗝️', 0, 60);
            c.restore();
          }
          if (ph === 'hall' || ph === 'key' || ph === 'treasure' || ph === 'trap') fadeBlack(seg(k, 0.82, 1));
          if (ph === 'note') {
            fadeBlack(0.55 * seg(el2, 0, 0.6));
            fadeBlack(seg(k, 0.9, 1));
          }
          break;
        }
        case 'dead':
        case 'locked': {
          const back = ease(seg(k, 0.55, 0.95));
          const open = ph === 'dead' ? 1 - seg(k, 0.5, 0.65) : 0;
          std({
            zoom: lerp(ZOOM, 1, back), focus: pf, pick: S.pick, open, aim: [pb.cx, 760], rattle: ph === 'locked' ? Math.sin(t * 40) : 0, lock: ph === 'locked' && !S.ph?.bash,
            wall: ph === 'dead' && k < 0.6 ? (cc) => {
              cc.save();
              cc.beginPath();
              cc.rect(pb.x0, pb.y0, pb.w, pb.h);
              cc.clip();
              cc.fillStyle = '#4a3a34';
              cc.fillRect(pb.x0, pb.y0, pb.w, pb.h);
              for (let y = pb.y0; y < pb.y1; y += 16) for (let x = pb.x0 - ((y / 16) % 2) * 15; x < pb.x1; x += 30) cc.strokeRect(x, y, 30, 16);
              cc.fillStyle = '#c8281e';
              cc.font = '800 22px Kanit, sans-serif';
              cc.textAlign = 'center';
              cc.fillText('ไม่ใช่', pb.cx, pb.y0 + pb.h * 0.42);
              cc.fillText('ทางนี้', pb.cx, pb.y0 + pb.h * 0.55);
              cc.restore();
            } : null,
          });
          break;
        }
        case 'stairs': {
          if (k < 0.3) {
            std({ zoom: ZOOM + seg(k, 0, 0.3) * 1.5, focus: pf, pick: S.pick, open: 1, aim: [pb.cx, 760] });
            fadeBlack(seg(k, 0.18, 0.3));
          } else drawStairwell(c, t, seg(k, 0.3, 1), S.ph?.from ?? S.floor, S.ph?.to ?? S.floor - 1, Z.light);
          break;
        }
        case 'ghost': {
          // ไฟกะพริบ ผู้ดูแลค่อย ๆ โผล่จากประตู
          const fl = hsh(Math.floor(t * 14)) > 0.55 ? 1 : 0;
          const boss = S.ph?.kind === 'boss';
          const fin = S.ph?.kind === 'finale';
          const app = ease(seg(k, 0.15, 0.85));
          std({
            zoom: boss || fin ? 1 : lerp(ZOOM, 1.3, ease(seg(k, 0, 0.3))), focus: pf, pick: S.pick, open: boss || fin ? 1 : 1, aim: [pb.cx, 760],
            darkMul: fl ? 1 : 1.04, spotMul: fl ? 1 : 0.4,
            keeper: (cc) => drawKeeper(cc, boss || fin ? 540 : 540, boss || fin ? 900 : 1060, lerp(150, boss ? 520 : 420, app), t, app, boss ? '255,40,30' : '255,70,60'),
          });
          if (k > 0.75 && !cut._roar) {
            cut._roar = 1;
            shake = 0.7;
            flash = 0.5;
            flashCol = '255,0,0';
            API?.sfx?.roar?.(boss ? 1.4 : 0.9);
          }
          break;
        }
        case 'chase': {
          walkPh += dt * 16;
          chaseView(c, t, dt);
          break;
        }
        case 'escaped':
        case 'hit': {
          if (ph === 'escaped') {
            std({ zoom: 1, lit: 0.1 });
            fadeBlack(1 - seg(el2, 0, 0.3));
            fadeBlack(seg(k, 0.85, 1));
          } else {
            chaseView(c, t, dt, 1);
            c.fillStyle = `rgba(160,0,0,${0.5 * (1 - seg(el2, 0, 1.2))})`;
            c.fillRect(0, 0, W, H);
            fadeBlack(seg(k, 0.85, 1));
          }
          break;
        }
        case 'caught': {
          // ผู้ดูแลพุ่งเข้าหาจอ → ดับมืด → ตื่นใหม่
          if (el2 < 1.6) {
            std({ keeper: (cc) => drawKeeper(cc, 540, lerp(1100, 2400, ease(seg(el2, 0, 1.6))), lerp(400, 2400, ease(seg(el2, 0, 1.6))), t, 1), darkMul: 1.02 });
            if (!cut._roar) {
              cut._roar = 1;
              API?.sfx?.roar?.(1.6);
              shake = 1;
            }
          } else fadeBlack(1);
          break;
        }
        case 'power': {
          // ไฟกลับมา: ไฟสว่างทีละดวงทั้งทางเดิน แล้วรีบลงบันได
          if (k < 0.55) {
            const on = seg(k, 0.05, 0.35);
            const fl = on < 1 && hsh(Math.floor(t * 20)) > 0.5 ? 0.3 : 0;
            std({ darkMul: lerp(1, 0.28, on) + fl, lit: 0 });
            if (on > 0 && on < 1 && Math.random() < 0.3) burst(200 + Math.random() * 680, 300 + Math.random() * 200, 4, ['#fff6a0', '#ffd23f'], { v0: 100, v1: 300, g: 900, size: 5, max: 0.8 });
          } else drawStairwell(c, t, seg(k, 0.55, 1), S.ph?.from ?? S.floor, S.ph?.to ?? S.floor - 1, '255,240,180');
          break;
        }
        case 'elevator':
          drawElevator(c, t, k, S.ph?.from ?? S.floor, S.ph?.to ?? S.floor - 3);
          break;
        case 'ending': {
          if (el2 < 5) {
            // ยกคัตเอาต์ในล็อบบี้
            std({ darkMul: el2 > 3.2 ? lerp(1, 0.15, seg(el2, 3.2, 4.2)) : 1, aim: [540, 760] });
            const lv = ease(seg(el2, 1.2, 3));
            c.save();
            c.translate(540, 760);
            rr(c, -90, -120, 180, 240, 14, '#2a2e34', '#8a929a', 4);
            c.rotate(lerp(0.9, -0.9, lv));
            rr(c, -10, -110, 20, 110, 6, '#c8281e');
            ell(c, 0, -110, 22, 22, '#e8e8e8');
            c.restore();
            if (el2 > 3 && !cut._zap) {
              cut._zap = 1;
              API?.sfx?.zap?.();
              burst(540, 760, 60, ['#fff6a0', '#ffd23f', '#ffffff'], { v0: 200, v1: 700, g: 700, size: 6, max: 1.2 });
              flash = 0.8;
              flashCol = '255,250,220';
            }
          } else if (el2 < 15) drawTower(c, t, seg(el2, 5, 15));
          else {
            // เดินออกสู่แสงเช้า
            const k2 = seg(el2, 15, 22);
            walkPh += dt * 8 * (k2 < 1 ? 1 : 0);
            c.fillStyle = lg(c, 0, 0, 0, H, ['#ffb070', '#ffe2b0', '#fff4dc']);
            c.fillRect(0, 0, W, H);
            c.fillStyle = rg(c, 540, 700, 20, 700 + k2 * 300, ['rgba(255,255,240,1)', 'rgba(255,240,200,0)']);
            c.fillRect(0, 0, W, H);
            poly(c, [[0, 1150], [W, 1150], [W, H], [0, H]], '#d9a070');
            c.globalAlpha = 1 - seg(el2, 20.5, 22.5); // จางหายก่อนเครดิตขึ้น
            drawHero(c, 540, lerp(1290, 1180, k2), lerp(1.9, 1.3, k2), t, { walk: walkPh, aimX: 540, aimY: 700, rim: '255,230,170' });
            c.globalAlpha = 1;
            c.fillStyle = 'rgba(255,240,210,.25)';
            c.fillRect(0, 0, W, H);
          }
          break;
        }
        default:
          std({});
      }
      // อนุภาค + แฟลช
      stepParts(c, dt);
      if (flash > 0) {
        c.fillStyle = `rgba(${flashCol},${flash})`;
        c.fillRect(-60, -60, W + 120, H + 120);
        flash = Math.max(0, flash - dt * 1.8);
      }
      c.restore();
      updateDom(t, el2, k);
    }
    // มุมมองตอนถูกไล่: ทางเดินพุ่งผ่าน + มือผู้ดูแลเอื้อมจากขอบล่าง
    function chaseView(c, t, dt, caughtNow) {
      const Z = Zc();
      const pal = Z.pal;
      const C = S.chase || { got: 0, need: 1 };
      const dist = clamp(C.got / Math.max(1, C.need), 0, 1);
      const speed = 2.2;
      poly(c, flatQ(-HW, HW, 1, ZN, TOP), pal.ceil);
      poly(c, wallQ(-1, TOP, BOT, 1, ZN), pal.wall2);
      poly(c, wallQ(1, TOP, BOT, 1, ZN), pal.wall2);
      poly(c, flatQ(-HW, HW, 1, ZN, BOT), pal.floor);
      for (let i = 0; i < 6; i++) {
        const d = 1 + ((i * 0.8 - t * speed * 0.9) % 4.8 + 4.8) % 4.8;
        poly(c, flatQ(-HW, HW, Dz(d), Dz(d + 0.05), BOT), 'rgba(255,255,255,.08)');
      }
      c.fillStyle = '#000';
      c.fillRect(240, 470, 600, 430);
      for (let i = 0; i < 9; i++) {
        const d = 1 + ((i * 0.55 - t * speed) % 4.95 + 4.95) % 4.95;
        const z = Dz(d);
        for (const s of [-1, 1]) poly(c, wallQ(s, -110, BOT, z, Dz(d + 0.18)), i % 3 ? pal.d2 : pal.frame);
        poly(c, flatQ(-60, 60, z, Dz(d + 0.1), TOP), i % 2 ? '#cfe7df' : pal.ceil);
      }
      // เส้นความเร็ว
      c.save();
      c.globalAlpha = 0.25;
      for (let i = 0; i < 26; i++) {
        const a = hsh(i * 3) * TAU;
        const r0 = ((t * 900 + hsh(i) * 900) % 900) + 120;
        line(c, [VP.x + Math.cos(a) * r0, VP.y + Math.sin(a) * r0], [VP.x + Math.cos(a) * (r0 + 140), VP.y + Math.sin(a) * (r0 + 140)], '#ffffff', 2);
      }
      c.restore();
      const h = drawHero(c, 540, 1290, 1.9, t, { walk: walkPh, run: true, aimX: 540 + Math.sin(t * 7) * 80, aimY: 700, rim: Z.light });
      darkness(c, { a: Z.dark - 0.08, spots: [{ x: 540 + Math.sin(t * 7) * 80, y: 700, rx: 300, ry: 240 }], cone: { hx: h.hx, hy: h.hy, ax: 540 + Math.sin(t * 7) * 80, ay: 700, w: 140 }, amb: { x: 540, y: 1150, r: 420, a: 0.5 }, lights: [] });
      drawHero(c, 540, 1290, 1.9, t, { walk: walkPh, run: true, aimX: 540 + Math.sin(t * 7) * 80, aimY: 700, rim: Z.light });
      const reach = caughtNow ? 1 : clamp(1 - dist, 0, 1) * 0.9;
      drawGrab(c, -1, reach, t);
      drawGrab(c, 1, reach * 0.95, t + 1.3);
      // ขอบจอแดงเต้นตามหัวใจ
      const beat = Math.pow(Math.max(0, Math.sin(t * (6 + reach * 6))), 6);
      c.fillStyle = rg(c, 540, 960, 300, 1100, ['rgba(120,0,0,0)', `rgba(150,0,0,${0.25 + 0.35 * reach * beat})`]);
      c.fillRect(0, 0, W, H);
      if (beat > 0.95 && !chaseView._b) {
        chaseView._b = 1;
        API?.sfx?.boom?.();
      } else if (beat < 0.5) chaseView._b = 0;
      void dt;
    }

    // ================================================================ กรอบข้อความ (DOM)
    const $ = (s) => el?.querySelector(s);
    function renderStatic() {
      const m = meta();
      const tt = API?.t || {};
      const gifts = (tt.gifts || m.defaults?.gifts || []).slice(0, 9);
      const fx = m.effects || {};
      el.innerHTML = `
        <div class="es-top"><div class="ico">🔦</div><div class="tt"><b>${esc(tt.title || m.defaults?.title || 'ตึกเงียบ 19 ชั้น')}</b><small class="zn"></small></div><div class="inv"></div></div>
        <div class="es-fl"></div>
        <div class="es-pills"></div>
        <div class="es-ban"></div>
        <div class="es-tags"></div>
        <div class="es-tm"><b></b></div>
        <div class="es-gl"><h4>🎁 ของขวัญ = ตัวช่วย</h4>${gifts.map((g) => `<div>${window.giftIconHtml ? window.giftIconHtml(g.name, fx[g.effect]?.icon || '🎁') : esc(fx[g.effect]?.icon || '🎁')} ${window.giftIcon?.(g.name) ? '' : `<b>${esc(g.name)}</b> `}${esc(fx[g.effect]?.label || '')}</div>`).join('')}</div>
        <div class="es-rk"><h4>🧭 นักสำรวจตาไว</h4><div class="rows"></div><div class="chg"><span></span><i><b></b></i></div></div>
        <div class="es-chase"><div class="tx"></div><i><b></b></i><div class="rn"></div></div>
        <div class="es-big"></div>
        <div class="es-sub"></div>
        <div class="es-note"><div class="pp"></div></div>
        <div class="es-cred"><div class="roll"></div></div>`;
      updatePanels();
    }
    function updatePanels() {
      if (!el) return;
      const Z = Zc();
      $('.es-top .zn').textContent = `ชั้น ${S.floor} · ${Z.icon} ${Z.name}`;
      $('.es-top .inv').innerHTML = `<span class="hp">${'❤️'.repeat(clamp(S.hearts, 0, 5))}${'🖤'.repeat(Math.max(0, 3 - S.hearts))}</span><span>🗝️×${S.keys}</span>${S.charm ? `<span>🧿×${S.charm}</span>` : ''}${S.bell ? `<span>🔔${S.bell}</span>` : ''}`;
      // แถบชั้น 19 → 1
      const fl = [];
      for (let f = 19; f >= 1; f--) fl.push(`<i class="${f > S.floor ? 'done' : f === S.floor ? 'now' : ''}${f === 13 ? ' b13' : ''}${[17, 14, 13, 10, 7, 4, 2].includes(f) ? ' zb' : ''}">${f === S.floor ? '🔦' : f === 13 ? '13' : f === 1 ? '🚪' : ''}</i>`);
      $('.es-fl').innerHTML = `<span>19</span>${fl.join('')}<span>ทางออก</span>`;
      const rows = (S.exp || []).slice(0, 4);
      $('.es-rk .rows').innerHTML = rows.length ? rows.map((r, i) => `<div class="r">${['🥇', '🥈', '🥉'][i] || '•'} <span>${esc(r.n)}</span><b>${r.p}</b></div>`).join('') : '<div class="emp">พิมพ์ 1 หรือ 2 เลือกประตู<br>เลือกถูกได้แต้ม!</div>';
      $('.es-rk .chg span').textContent = `🔦 กดใจ ${S.charge || 0}/${S.chargeMax || 300} = ส่องฟรี`;
      $('.es-rk .chg b').style.width = clamp(((S.charge || 0) / (S.chargeMax || 300)) * 100, 0, 100).toFixed(1) + '%';
      tagsHtml();
    }
    function tagsHtml() {
      const n = S.doors.length;
      const names = n >= 3 ? ['ซ้าย', 'กลาง', 'ขวา'] : ['ซ้าย', 'ขวา'];
      const tot = (S.votes || []).reduce((a, b) => a + b, 0);
      const html = S.doors
        .map((d, i) => {
          const b = doorBox(i, n);
          const v = S.votes?.[i] || 0;
          const pc = tot ? Math.round((v / tot) * 100) : 0;
          const rev = d.o ? `<div class="rv ${d.o}">${OUT[d.o]?.[0] || '?'} ${OUT[d.o]?.[1] || ''}${d.lock ? ' 🔒' : ''}</div>` : '';
          return `<div class="tg${d.gone ? ' gone' : ''}" style="left:${b.cx}px"><span class="k">${i + 1}</span><span class="nm">${names[i]}</span>${d.gone ? '<div class="x">✖ ปิดแล้ว</div>' : `<div class="pc">${v} โหวต · ${pc}%</div><i><b style="width:${pc}%"></b></i>`}${rev}</div>`;
        })
        .join('');
      const box = $('.es-tags');
      if (box && box._h !== html) {
        box._h = html;
        box.innerHTML = html;
      }
    }
    let typed = { key: '', n: -1 };
    function type(elm, text, n, key) {
      if (!elm) return;
      const g = graphemes(text);
      const m = clamp(Math.floor(n), 0, g.length);
      if (typed[key] === text + '|' + m) return;
      typed[key] = text + '|' + m;
      elm.innerHTML = esc(g.slice(0, m).join('')).replace(/\n/g, '<br>');
    }
    function big(html, on) {
      const b = $('.es-big');
      if (!b) return;
      if (on && b._h !== html) {
        b._h = html;
        b.innerHTML = html;
      }
      b.classList.toggle('on', !!on);
    }
    function sub(text, el2, speed = 22, on = true) {
      const s = $('.es-sub');
      if (!s) return;
      s.classList.toggle('on', !!on && !!text);
      if (on && text) type(s, text, el2 * speed, 'sub');
    }
    function updateDom(t, el2, k) {
      if (!el) return;
      const ph = cut.phase;
      const Z = Zc();
      const voting = ph === 'vote';
      el.classList.toggle('voting', voting);
      el.classList.toggle('cine', !['vote', 'walk'].includes(ph)); // ช่วงผล/คัทซีน: ซ่อนแผงข้างให้ภาพเต็มตา
      // เวลาโหวต
      const leftS = Math.max(0, Math.ceil(cut.dur - el2));
      const tm = $('.es-tm');
      if (tm) {
        tm.classList.toggle('on', voting);
        tm.classList.toggle('n3', S.doors.length >= 3);
        tm.classList.toggle('hot', voting && leftS <= 5);
        tm.querySelector('b').textContent = leftS;
        tm.style.setProperty('--p', `${clamp(1 - el2 / cut.dur, 0, 1) * 360}deg`);
      }
      // คำแนะนำตามช่วง
      const pills = voting
        ? `<span>💬 พิมพ์ <b>1</b>${S.doors.length >= 3 ? ' / <b>2</b> / <b>3</b>' : ' หรือ <b>2</b>'} เลือกประตู</span><span>🎁 ของขวัญ = ตัวช่วย</span>`
        : ph === 'chase' || ph === 'ghost'
          ? '<span>❤️ กดใจรัว ๆ + พิมพ์ <b>วิ่ง</b> ช่วยหนี!</span>'
          : `<span>${S.voters ? `👥 ${S.voters} คนเลือกประตูนี้` : '🔦 ช่วยกันพาไปให้ถึงชั้น 1'}</span>`;
      const pe = $('.es-pills');
      if (pe && pe._h !== pills) {
        pe._h = pills;
        pe.innerHTML = pills;
      }
      // ไล่ล่า
      const ch = $('.es-chase');
      const C = S.chase;
      if (ch) {
        const on = ph === 'chase' && C;
        ch.classList.toggle('on', !!on);
        if (on) {
          const p = clamp(C.got / Math.max(1, C.need), 0, 1);
          ch.querySelector('.tx').innerHTML = `${C.kind === 'boss' ? '👹 ผู้ดูแลชั้น 13 ไล่ล่า!' : C.kind === 'finale' ? '🚪 หนีรอบสุดท้าย!' : '👻 ผู้ดูแลไล่มาแล้ว!'} <small>${Math.max(0, Math.ceil(cut.dur - el2))} วิ</small>`;
          ch.querySelector('b').style.width = (p * 100).toFixed(1) + '%';
          ch.querySelector('.rn').textContent = `ระยะหนี ${Math.round(p * 100)}% • ❤️ กดใจ = 1 • พิมพ์ “วิ่ง” = 10`;
        }
      }
      // ข้อความใหญ่/บรรยายตามช่วง
      const H = host();
      const fn = ['ห้องถัดไป…', ''];
      let bigH = '';
      let subT = '';
      let subOn = false;
      switch (ph) {
        case 'intro': {
          const L = ['ตี 3:00 · ไฟดับทั้งตึก', `${H} ตื่นขึ้นมาที่ชั้น 19 ของ “อาคารรัตติกาล”\nตึกที่ถูกปิดตายมา 20 ปี`, '📢 “ประตูทุกบานจะสลับที่ทุกคืน… อย่าให้ผู้ดูแลจับได้”'];
          const i = el2 < 3.2 ? 0 : el2 < 6.8 ? 1 : 2;
          subT = L[i];
          subOn = el2 < 10;
          sub(subT, el2 - [0, 3.2, 6.8][i], 24, subOn);
          if (el2 > 9.6) bigH = `ตึกเงียบ 19 ชั้น<small>ช่วยกันพิมพ์ 1 หรือ 2 พา${esc(H)}ลงไปให้ถึงชั้น 1 ก่อนฟ้าสาง</small>`;
          break;
        }
        case 'zone': {
          if (el2 > 3.4) {
            bigH = S.ph?.why === 'caught' ? `ตื่นขึ้นอีกครั้ง…<small>ชั้น ${S.floor} · ${Z.icon} ${esc(Z.name)}</small>` : `${Z.icon} ${esc(Z.name)}<small>ชั้น ${Z.floors}</small>`;
            sub(Z.line, el2 - 4, 22, true);
            subOn = true;
          } else bigH = `ชั้น ${S.floor}`;
          break;
        }
        case 'walk':
          if (el2 < 1.6) bigH = `<span class="sm">${S.ph?.auto ? `ไม่มีใครเลือก… ${esc(H)}เลือกเอง` : `ไปทาง <b>${S.pick + 1}</b>!`}</span>`;
          break;
        case 'hall':
          bigH = '<span class="sm">🚶 ทางเดินต่อ…</span>';
          break;
        case 'key':
          bigH = `🗝️ เจอกุญแจ!<small>มีกุญแจ ${S.keys} ดอก</small>`;
          break;
        case 'treasure':
          bigH = `💰 เจอสมบัติ!<small>${S.ph?.n ? `${S.ph.n} คนที่เลือกประตูนี้ได้เหรียญ 🪙` : 'เหรียญทองกระจายเต็มห้อง!'}</small>`;
          break;
        case 'trap':
          bigH = S.ph?.blocked ? '🧿 เครื่องรางกันไว้!<small>รอดจากกับดัก</small>' : `⚠️ กับดัก!<small>❤️ −1 (เหลือ ${S.hearts})</small>`;
          break;
        case 'dead':
          bigH = '🧱 ทางตัน!<small>ย้อนกลับไปเลือกใหม่</small>';
          break;
        case 'locked':
          bigH = S.ph?.bash ? `💥 ${esc(H)}พังประตู!<small>ไม่มีกุญแจ ❤️ −1</small>` : '🔒 ประตูล็อก!<small>ต้องมีกุญแจ 🗝️ — ย้อนกลับไปเลือกใหม่</small>';
          break;
        case 'unlock':
          bigH = '🗝️ ไขกุญแจ…<small>คลิก!</small>';
          break;
        case 'stairs':
          if (k > 0.3) bigH = `ชั้น ${k < 0.65 ? S.ph?.from ?? S.floor : S.ph?.to ?? S.floor - 1}<small>🪜 ลงบันได</small>`;
          break;
        case 'ghost':
          if (k > 0.7) bigH = S.ph?.kind === 'boss' ? '👹 ผู้ดูแลชั้น 13!' : S.ph?.kind === 'finale' ? '🚪 ผู้ดูแลขวางทางออก!' : '👻 ผู้ดูแล!';
          break;
        case 'escaped':
          bigH = `${S.ph?.charm ? '🧿 เครื่องรางช่วยไว้!' : '🏃 หนีรอด!'}<small>${S.ph?.top ? `วิ่งเก่งสุด: ${esc(S.ph.top)}` : 'ผู้ดูแลตามไม่ทัน'}</small>`;
          break;
        case 'hit':
          bigH = `💢 โดนจับได้!<small>❤️ −1 (เหลือ ${S.hearts})</small>`;
          break;
        case 'caught':
          if (el2 > 1.8) {
            sub(`…${H}ถูกผู้ดูแลจับได้\nตื่นขึ้นอีกครั้งที่ชั้น ${S.ph?.to ?? S.floor}`, el2 - 1.8, 20, true);
            subOn = true;
          }
          break;
        case 'power':
          bigH = k < 0.55 ? `⚡ ไฟกลับมาแล้ว!<small>${S.ph?.by ? `โดย ${esc(S.ph.by)} · ` : ''}ลงไปชั้น ${S.ph?.to}</small>` : `ชั้น ${S.ph?.to}`;
          break;
        case 'elevator':
          bigH = k < 0.3 ? `🛗 ลิฟต์ฉุกเฉิน!<small>${S.ph?.by ? `โดย ${esc(S.ph.by)} · ` : ''}ลง ${(S.ph?.from || 0) - (S.ph?.to || 0)} ชั้น</small>` : '';
          break;
        case 'ending': {
          const L = [`${H} ยกคัตเอาต์หลักขึ้น…`, 'ไฟทั้ง 19 ชั้นสว่างขึ้นพร้อมกัน', '“ขอบคุณที่พาทุกคนกลับบ้าน” — ยามกะดึก', 'ฟ้าสางแล้ว… หนีออกจากตึกสำเร็จ!'];
          const i = el2 < 5 ? 0 : el2 < 10 ? 1 : el2 < 15 ? 2 : 3;
          sub(L[i], el2 - [0, 5, 10, 15][i], 22, el2 < 22);
          subOn = el2 < 22;
          if (el2 > 15 && el2 < 21) bigH = `🌅 หนีออกจากตึกสำเร็จ!<small>สำเร็จทั้งหมด ${S.ph?.wins || 1} ครั้ง · ถูกจับ ${S.ph?.deaths || 0} ครั้ง</small>`;
          break;
        }
        default:
      }
      void fn;
      if (!subOn) sub('', 0, 0, false);
      big(bigH, !!bigH);
      // บันทึกเนื้อเรื่อง
      const nt = $('.es-note');
      if (nt) {
        const on = ph === 'note' && el2 > 0.5 && k < 0.92;
        nt.classList.toggle('on', on);
        if (on) type(nt.querySelector('.pp'), NOTES[S.ph?.n ?? 0] || NOTES[0], (el2 - 0.5) * 20, 'note');
      }
      // เครดิตท้ายเรื่อง
      const cr = $('.es-cred');
      if (cr) {
        const on = ph === 'ending' && el2 > 21.5;
        if (on && !cr.classList.contains('on')) {
          const ex = (S.ph?.exp || []).map((r, i) => `<div>${['🥇', '🥈', '🥉', '4.', '5.'][i]} ${esc(r.n)} <b>${r.p} แต้ม</b></div>`).join('') || '<div>ทุกคนที่ช่วยกันเลือกประตู</div>';
          const gd = (S.ph?.guides || []).map((r) => `<div>🔦 ${esc(r.n)}</div>`).join('') || '<div>ทุกคนที่กดใจ</div>';
          cr.querySelector('.roll').innerHTML = `<h3>ตึกเงียบ 19 ชั้น</h3><p>ขอบคุณที่พา${esc(host())}กลับบ้าน</p><h4>🧭 นักสำรวจตาไว</h4>${ex}<h4>🔦 ผู้ส่องทาง</h4>${gd}<h4>🌙 รอบใหม่กำลังจะเริ่ม…</h4>`;
        }
        cr.classList.toggle('on', on);
      }
      // ชิปชื่อคนโหวตลอยขึ้น
      for (let i = chips.length - 1; i >= 0; i--) {
        const c = chips[i];
        if (t - c.t0 > 1.6) {
          c.el.remove();
          chips.splice(i, 1);
        }
      }
    }
    let banT = null;
    function banner(html, cls = 'gold', sec = 3) {
      const b = $('.es-ban');
      if (!b) return;
      b.className = `es-ban ${cls} on`;
      b.innerHTML = html;
      clearTimeout(banT);
      banT = setTimeout(() => b.classList.remove('on'), sec * 1000);
    }
    function chip(d, name) {
      if (!el || chips.length > 8 || cut.phase !== 'vote') return;
      const b = doorBox(d, S.doors.length);
      const c = document.createElement('div');
      c.className = 'es-chip';
      c.textContent = `+ ${name}`;
      c.style.left = b.cx + (Math.random() - 0.5) * 60 + 'px';
      el.appendChild(c);
      chips.push({ el: c, t0: lastT });
    }

    // ================================================================ รับข้อมูลจากเซิร์ฟเวอร์
    function apply(s) {
      const prevPid = S.pid;
      const prevVotes = S.votes;
      S = { ...S, ...s };
      if (s.pid !== prevPid || cut.pid < 0) {
        const dur = (s.dur || 1000) / 1000;
        const nowS = performance.now() / 1000; // เวลาจริง (เฟรมอาจหยุดตอนแท็บซ่อน — ไม่ใช้ lastT)
        cut = { phase: s.phase, pid: s.pid, ph: s.ph || {}, dur, t0: nowS - Math.max(0, dur - (s.left || 0) / 1000) };
        onPhase(s.phase, cut.t0 >= nowS - 0.3);
      }
      void prevVotes;
      updatePanels();
    }
    function onPhase(ph, fresh) {
      if (!fresh) return;
      const sfx = API?.sfx || {};
      if (ph === 'vote') sfx.chime?.(520);
      if (ph === 'key') {
        sfx.chime?.(880);
        burst(540, 760, 30, ['#ffd54a', '#fff3b0'], { v0: 100, v1: 380, g: 200, size: 7, max: 1.2 });
      }
      if (ph === 'treasure') {
        sfx.cheer?.();
        for (let i = 0; i < 3; i++) setTimeout(() => burst(540, 760, 24, ['#ffd23f'], { v0: 300, v1: 800, g: 1300, size: 70, max: 1.6, text: '🪙' }), i * 250);
      }
      if (ph === 'trap') {
        if (S.ph?.blocked) {
          sfx.bell?.(392);
          burst(540, 900, 50, ['#7fd3ff', '#ffffff'], { v0: 200, v1: 600, g: 0, size: 7, max: 1 });
        } else {
          sfx.boom?.();
          shake = 1;
          flash = 0.55;
          flashCol = '255,40,0';
          burst(540, 700, 40, ['#5a4a3a', '#3a2a1a', '#8a7a6a'], { v0: 100, v1: 500, g: 1200, size: 14, max: 1.6, rect: true });
        }
      }
      if (ph === 'dead') sfx.pop?.();
      if (ph === 'locked') {
        sfx.boom?.();
        shake = S.ph?.bash ? 1 : 0.35;
      }
      if (ph === 'unlock') sfx.chime?.(660);
      if (ph === 'stairs') sfx.whoosh?.();
      if (ph === 'zone') sfx.bell?.(147);
      if (ph === 'note') sfx.chime?.(392);
      if (ph === 'ghost') sfx.whistle?.();
      if (ph === 'escaped') {
        sfx.fanfare?.();
        flash = 0.4;
        flashCol = '255,255,255';
      }
      if (ph === 'hit') {
        sfx.boom?.();
        shake = 1;
      }
      if (ph === 'power') {
        sfx.zap?.();
        flash = 0.6;
        flashCol = '255,250,210';
      }
      if (ph === 'elevator') sfx.bell?.(880);
      if (ph === 'ending') sfx.fanfare?.();
      if (ph === 'intro') {
        chips.length = 0;
        const cr = $('.es-cred');
        if (cr) cr.classList.remove('on');
      }
    }
    const GTXT = {
      peek: ['🔦', 'ส่องไฟฉาย'], peekAll: ['💡', 'ไฟฉายแรงสูง ส่องทุกประตู'], rush: ['⏩', 'เร่ง! ตัดสินใน 3 วิ'], key: ['🗝️', 'ให้กุญแจ +1'], heart: ['❤️', 'ให้หัวใจ +1'],
      charm: ['🧿', 'ให้เครื่องรางกันผี'], bell: ['🔔', 'สั่นระฆังไล่ผี 5 ห้อง'], power: ['⚡', 'กู้ไฟ! ลงทันที 1 ชั้น'], elevator: ['🛗', 'เรียกลิฟต์ฉุกเฉิน ลง 3 ชั้น!'],
      likePeek: ['❤️', 'กดใจครบ! ไฟฉายส่องฟรี'], cheer: ['📣', 'ส่งกำลังใจ'],
    };
    function onEv(d) {
      switch (d.ev) {
        case 'vote':
          chip(d.d, d.by);
          API?.sfx?.pop?.();
          break;
        case 'peek': {
          const s = d.shown.map((x) => `ประตู ${x.d + 1}: ${OUT[x.o]?.[0] || ''} ${OUT[x.o]?.[1] || ''}${x.lock ? ' 🔒' : ''}`).join(' · ');
          if (!d.quiet || d.shown.length) banner(`🔦 ${esc(d.by || 'ไฟฉาย')} ส่องเห็น — ${esc(s)}`, 'gold', 4);
          API?.sfx?.chime?.(990);
          for (const x of d.shown) {
            const b = doorBox(x.d, S.doors.length);
            burst(b.cx, 760, 18, ['#fff6c0', '#ffd54a'], { v0: 60, v1: 220, g: -60, size: 6, max: 1.2 });
          }
          break;
        }
        case 'gift': {
          const g = GTXT[d.k] || GTXT.cheer;
          if (d.k === 'peek' || d.k === 'peekAll') {
            if (d.later) banner(`${g[0]} ${esc(d.by)} ${g[1]} <small>(ใช้ในห้องถัดไป)</small>`, 'gold', 3);
            break;
          }
          banner(`${g[0]} <b>${esc(d.by)}</b> ${g[1]}${d.later ? ' <small>(ใช้ห้องถัดไป)</small>' : ''}`, d.k === 'power' || d.k === 'elevator' ? 'big' : 'good', 3.5);
          if (d.k === 'heart') burst(540, 1000, 14, ['#ff4f6a'], { v0: 200, v1: 500, g: -200, size: 64, max: 1.5, text: '❤️' });
          if (d.k === 'key') burst(540, 1000, 8, ['#ffd54a'], { v0: 200, v1: 400, g: -200, size: 64, max: 1.5, text: '🗝️' });
          if (d.k === 'bell') {
            API?.sfx?.bell?.(523);
            flash = 0.3;
            flashCol = '255,240,200';
          }
          if (d.k === 'charm') API?.sfx?.chime?.(784);
          if (d.k === 'rush') API?.sfx?.whoosh?.();
          break;
        }
        case 'run':
          if (Math.random() < 0.5) burst(540 + (Math.random() - 0.5) * 400, 1150, 1, ['#fff'], { v0: 200, v1: 300, a0: -Math.PI / 2, spread: 0.6, g: 0, size: 54, max: 1, text: '🏃' });
          break;
        case 'newRun':
          banner('🌙 รอบใหม่! กลับไปตื่นที่ชั้น 19…', 'gold', 4);
          break;
        default:
      }
    }

    function css() {
      return `
        #root.theme-${id} #header, #root.theme-${id} #songPanel, #root.theme-${id} #giftPanel, #root.theme-${id} #topPanel, #root.theme-${id} #feed, #root.theme-${id} #hype, #root.theme-${id} #crowd { display: none !important; }
        #root.theme-${id} #avatar, #root.theme-${id} #avatar2d { display: none !important; }
        #root.theme-${id} { --toast-bg: #ffd54a; --toast-glow: #ffd54a; --big-grad: linear-gradient(180deg, #ffffff, #ffd54a); }
        #root.theme-${id} #toasts { top: 868px; left: 110px; right: 658px; } /* เหนือแผงของขวัญ ไม่บังตัวละคร */
        .es-ui { position: absolute; inset: 0; pointer-events: none; font-family: 'Kanit', 'IBM Plex Sans Thai', sans-serif; color: #fff; z-index: 3; }
        .es-ui * { box-sizing: border-box; }
        .es-ui .es-top { position: absolute; left: 110px; right: 110px; top: 196px; height: 92px; display: flex; align-items: center; gap: 14px; padding: 10px 16px; border-radius: 24px; background: rgba(6,8,12,.8); border: 2px solid rgba(255,213,74,.55); box-shadow: 0 0 28px rgba(255,213,74,.18); }
        .es-ui .es-top .ico { flex: none; width: 66px; height: 66px; border-radius: 18px; display: grid; place-items: center; font-size: 40px; background: linear-gradient(135deg, #ffd54a, #ff9f43); }
        .es-ui .es-top .tt { flex: 1; min-width: 0; }
        .es-ui .es-top .tt b { display: block; font-size: 32px; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .es-ui .es-top .tt small { display: block; font-size: 20px; color: #ffe9a8; white-space: nowrap; }
        .es-ui .es-top .inv { flex: none; display: flex; flex-direction: column; align-items: flex-end; gap: 2px; font-size: 21px; }
        .es-ui .es-top .inv span:not(.hp) { display: inline-block; margin-left: 8px; }
        .es-ui .es-top .inv { flex-direction: row; flex-wrap: wrap; justify-content: flex-end; max-width: 330px; }
        .es-ui .es-top .hp { font-size: 22px; letter-spacing: 1px; }
        .es-ui .es-fl { position: absolute; left: 110px; right: 110px; top: 298px; height: 34px; display: flex; align-items: center; gap: 3px; padding: 0 12px; border-radius: 17px; background: rgba(6,8,12,.72); font-size: 15px; font-weight: 700; }
        .es-ui .es-fl span { flex: none; color: #c9c2d9; padding: 0 4px; }
        .es-ui .es-fl i { flex: 1; height: 16px; border-radius: 5px; background: rgba(255,255,255,.14); display: grid; place-items: center; font-style: normal; font-size: 12px; color: #ff8a8a; }
        .es-ui .es-fl i.zb { margin-right: 6px; }
        .es-ui .es-fl i.done { background: linear-gradient(90deg, #ffd54a, #ff9f43); }
        .es-ui .es-fl i.now { height: 28px; background: #2dff8f; color: #000; font-size: 18px; box-shadow: 0 0 12px #2dff8f; }
        .es-ui .es-fl i.b13 { color: #ff5a5a; }
        .es-ui .es-pills { position: absolute; left: 110px; right: 110px; top: 342px; display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
        .es-ui .es-pills span { background: rgba(6,8,12,.74); border: 1px solid rgba(255,255,255,.18); border-radius: 999px; padding: 3px 16px; font-size: 21px; white-space: nowrap; }
        .es-ui .es-pills b { color: #ffd54a; font-size: 24px; }
        .es-ui .es-ban { position: absolute; left: 50%; top: 396px; transform: translateX(-50%) scale(.6); opacity: 0; max-width: 860px; padding: 6px 22px; border-radius: 16px; font-size: 23px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #1b1426; background: linear-gradient(90deg, #ffcf3f, #ff9f43); box-shadow: 0 6px 20px rgba(0,0,0,.5); transition: transform .25s cubic-bezier(.2,1.6,.4,1), opacity .25s; }
        .es-ui .es-ban.on { opacity: 1; transform: translateX(-50%) scale(1); }
        .es-ui .es-ban.good { background: linear-gradient(90deg, #2dff8f, #7fd3ff); }
        .es-ui .es-ban.big { background: linear-gradient(90deg, #ff4fd8, #ffd54a); font-size: 26px; }
        .es-ui .es-ban small { font-size: 18px; opacity: .8; }
        .es-ui .es-tags { position: absolute; inset: 0; opacity: 0; transition: opacity .35s; }
        .es-ui.voting .es-tags { opacity: 1; }
        .es-ui .tg { position: absolute; top: 528px; width: 168px; transform: translateX(-50%); text-align: center; background: rgba(6,8,12,.78); border: 2px solid rgba(255,213,74,.7); border-radius: 16px; padding: 4px 8px 6px; }
        .es-ui .tg .k { display: inline-block; min-width: 38px; border-radius: 10px; background: #ffd54a; color: #1b1426; font-weight: 800; font-size: 26px; line-height: 34px; margin-right: 6px; }
        .es-ui .tg .nm { font-size: 22px; font-weight: 700; }
        .es-ui .tg .pc { font-size: 17px; color: #ffe9a8; margin-top: 2px; }
        .es-ui .tg i { display: block; height: 8px; border-radius: 4px; background: rgba(255,255,255,.18); margin-top: 3px; overflow: hidden; }
        .es-ui .tg i b { display: block; height: 100%; background: linear-gradient(90deg, #ffd54a, #ff9f43); transition: width .3s; }
        .es-ui .tg.gone { border-color: rgba(200,40,40,.7); opacity: .75; }
        .es-ui .tg .x { font-size: 17px; color: #ff8a8a; }
        .es-ui .tg .rv { position: absolute; left: 50%; top: 168px; transform: translateX(-50%); white-space: nowrap; padding: 4px 12px; border-radius: 12px; font-size: 21px; font-weight: 700; background: rgba(255,240,190,.95); color: #2a1a00; box-shadow: 0 0 22px rgba(255,220,120,.8); }
        .es-ui .tg .rv.ghost, .es-ui .tg .rv.trap { background: rgba(255,90,70,.95); color: #fff; box-shadow: 0 0 22px rgba(255,60,40,.9); }
        .es-ui .tg .rv.stairs, .es-ui .tg .rv.exit { background: rgba(80,255,160,.95); color: #00200f; box-shadow: 0 0 22px rgba(60,255,140,.9); }
        .es-ui .es-tm { position: absolute; left: 540px; top: 712px; width: 92px; height: 92px; margin-left: -46px; border-radius: 50%; display: grid; place-items: center; opacity: 0; transition: opacity .3s;
          background: conic-gradient(#ffd54a var(--p, 360deg), rgba(255,255,255,.15) 0); }
        .es-ui .es-tm::before { content: ''; position: absolute; inset: 8px; border-radius: 50%; background: rgba(6,8,12,.9); }
        .es-ui .es-tm b { position: relative; font-size: 40px; font-weight: 800; }
        .es-ui .es-tm.on { opacity: 1; }
        .es-ui .es-tm.n3 { top: 432px; }
        .es-ui .es-tm.hot b { color: #ff6a5a; animation: esPulse .5s infinite alternate; }
        @keyframes esPulse { to { transform: scale(1.18); } }
        .es-ui .es-gl, .es-ui .es-rk { position: absolute; top: 958px; width: 312px; border-radius: 20px; padding: 10px 14px; background: rgba(6,8,12,.7); transition: opacity .4s; }
        .es-ui .es-gl { left: 110px; border: 2px solid rgba(127,211,255,.5); }
        .es-ui .es-rk { right: 110px; border: 2px solid rgba(255,213,74,.5); }
        .es-ui.cine .es-gl, .es-ui.cine .es-rk, .es-ui.cine .es-fl, .es-ui.cine .es-pills { opacity: 0; }
        .es-ui .es-gl h4, .es-ui .es-rk h4 { margin: 0 0 4px; font-size: 20px; }
        .es-ui .es-gl div { font-size: 17.5px; line-height: 1.62; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .es-ui .es-gl img.gicon { width: 1.35em; height: 1.35em; vertical-align: -0.35em; }
        .es-ui .es-rk .r { display: flex; gap: 8px; font-size: 19px; padding: 2px 0; }
        .es-ui .es-rk .r span { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .es-ui .es-rk .emp { font-size: 18px; opacity: .8; line-height: 1.4; }
        .es-ui .es-rk .chg { margin-top: 8px; font-size: 16px; font-weight: 600; }
        .es-ui .es-rk .chg i { display: block; height: 10px; border-radius: 5px; background: rgba(255,255,255,.18); margin-top: 4px; overflow: hidden; }
        .es-ui .es-rk .chg b { display: block; height: 100%; width: 0; background: linear-gradient(90deg, #ff4f8a, #ffd54a); transition: width .4s; }
        .es-ui .es-chase { position: absolute; left: 150px; right: 150px; top: 404px; padding: 10px 20px 12px; border-radius: 22px; background: rgba(40,0,0,.82); border: 3px solid #ff4a3a; box-shadow: 0 0 40px rgba(255,40,30,.5); text-align: center; opacity: 0; transform: scale(.8); transition: opacity .25s, transform .25s; }
        .es-ui .es-chase.on { opacity: 1; transform: scale(1); }
        .es-ui .es-chase .tx { font-size: 34px; font-weight: 800; }
        .es-ui .es-chase .tx small { font-size: 24px; color: #ffd0c8; margin-left: 8px; }
        .es-ui .es-chase i { display: block; height: 22px; border-radius: 11px; background: rgba(255,255,255,.15); margin: 6px 0 4px; overflow: hidden; }
        .es-ui .es-chase i b { display: block; height: 100%; width: 0; background: linear-gradient(90deg, #ff4a3a, #ffd54a, #2dff8f); transition: width .2s; }
        .es-ui .es-chase .rn { font-size: 19px; color: #ffd0c8; }
        .es-ui .es-big { position: absolute; left: 0; right: 0; top: 560px; text-align: center; font-size: 92px; font-weight: 900; line-height: 1.05; color: #fff; opacity: 0; transform: scale(.5);
          -webkit-text-stroke: 4px rgba(0,0,0,.85); paint-order: stroke fill; text-shadow: 0 0 40px rgba(255,213,74,.7), 0 8px 0 rgba(0,0,0,.4); transition: transform .35s cubic-bezier(.2,1.6,.4,1), opacity .3s; }
        .es-ui .es-big small { display: block; font-size: 36px; font-weight: 700; -webkit-text-stroke: 2px rgba(0,0,0,.85); margin-top: 10px; color: #ffe9a8; }
        .es-ui .es-big .sm { font-size: 60px; }
        .es-ui .es-big .sm b { color: #ffd54a; }
        .es-ui .es-big.on { opacity: 1; transform: scale(1); }
        .es-ui .es-sub { position: absolute; left: 130px; right: 130px; top: 840px; text-align: center; font-size: 34px; font-weight: 600; line-height: 1.45; padding: 14px 22px; border-radius: 18px; background: rgba(0,0,0,.6); color: #f2ecff; opacity: 0; transition: opacity .3s; text-shadow: 0 2px 6px #000; }
        .es-ui .es-sub.on { opacity: 1; }
        .es-ui .es-note { position: absolute; left: 180px; right: 180px; top: 520px; padding: 34px 38px; border-radius: 10px; transform: rotate(-2deg) scale(.7); opacity: 0; transition: opacity .3s, transform .4s cubic-bezier(.2,1.4,.4,1);
          background: linear-gradient(180deg, #f3e7c8, #e2d0a4); color: #3a2a14; box-shadow: 0 20px 60px rgba(0,0,0,.7); font-size: 32px; line-height: 1.55; min-height: 320px; }
        .es-ui .es-note::before { content: '📜 พบบันทึก'; display: block; font-size: 22px; font-weight: 800; color: #8a5a20; margin-bottom: 8px; }
        .es-ui .es-note.on { opacity: 1; transform: rotate(-2deg) scale(1); }
        .es-ui .es-cred { position: absolute; left: 160px; right: 160px; top: 300px; height: 1020px; overflow: hidden; opacity: 0; transition: opacity .6s; -webkit-mask-image: linear-gradient(transparent, #000 12%, #000 88%, transparent); }
        .es-ui .es-cred.on { opacity: 1; }
        .es-ui .es-cred .roll { text-align: center; color: #3a2410; font-weight: 600; font-size: 30px; line-height: 1.6; padding-top: 1020px; }
        .es-ui .es-cred.on .roll { animation: esRoll 12s linear forwards; }
        .es-ui .es-cred h3 { font-size: 64px; margin: 0; color: #2a1406; }
        .es-ui .es-cred h4 { font-size: 34px; margin: 40px 0 6px; color: #8a3a10; }
        .es-ui .es-cred p { font-size: 32px; margin: 6px 0; }
        @keyframes esRoll { to { transform: translateY(-100%); } }
        .es-ui .es-chip { position: absolute; top: 500px; transform: translateX(-50%); font-size: 20px; font-weight: 700; color: #ffe9a8; text-shadow: 0 2px 4px #000; white-space: nowrap; animation: esChip 1.6s ease-out forwards; }
        @keyframes esChip { from { opacity: 1; transform: translate(-50%, 0); } to { opacity: 0; transform: translate(-50%, -80px); } }
      `;
    }

    const T = {
      bpm: 90,
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
        window.__escDbg = () => ({ cut, S, lastT });
        el = document.createElement('div');
        el.className = 'es-ui';
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
        cx.fillStyle = '#000';
        cx.fillRect(0, 0, W, H);
      },
      // ใช้เวลาจริงของเฟรม (performance.now) ให้ตรงกับเวลาเริ่มช่วงที่คำนวณจากเซิร์ฟเวอร์
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
