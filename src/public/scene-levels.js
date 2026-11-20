/* ฉากเปลี่ยนตามเป้า — ของที่เพิ่มในฉากเมื่อไลค์/ของขวัญรวมของไลฟ์ครบ (ขั้น 2 และ 3) ทุกธีม
 * stage.js เรียก:
 *   SceneLevels.drawStatic(ctx, themeId, level, api)  → วาดทับชั้นฉากนิ่ง (วาดใหม่เฉพาะตอนขั้นเปลี่ยน)
 *   SceneLevels.drawAnim(ctx, themeId, level, t, api) → ทุกเฟรม หลังฉากหลัง (อยู่หลังคนในฉาก)
 *   SceneLevels.drawFront(ctx, themeId, level, t, api) → ทุกเฟรม ชั้นเอฟเฟกต์ (อยู่หน้าคน) — ใช้น้อย ๆ
 *   SceneLevels.label(themeId, level) → ชื่อสิ่งที่ปลดล็อก (แถบความคืบหน้า + ป้าย)
 * พิกัดเวที 1080 × 1920 · แผงข้อมูลบังด้านซ้าย/ขวาบน → ของสำคัญวางกลางจอ x 320–760 หรือพื้นล่าง
 */
(() => {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);
  // สุ่มแบบกำหนดผลได้ (เฟรมเดียวกันได้ค่าเดิม ไม่กระพริบมั่ว)
  const rng = (seed) => {
    let s = (seed * 2654435761) >>> 0 || 1;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  };
  const hexRgb = (h) => {
    const n = parseInt(h.slice(1), 16);
    return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  };

  // ------------------------------------------------------------ เครื่องมือวาด
  function glow(c, x, y, r, col, a = 0.6) {
    const rgb = col.startsWith('#') ? hexRgb(col) : col;
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb},${a})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    c.fillStyle = g;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const qpt = (x0, x1, y, dip, u) => {
    const cx = (x0 + x1) / 2;
    const cy = y + dip * 2;
    return [(1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * cx + u * u * x1, (1 - u) * (1 - u) * y + 2 * (1 - u) * u * cy + u * u * y];
  };
  function wire(c, x0, x1, y, dip, col = 'rgba(40,30,40,.8)', w = 3) {
    c.strokeStyle = col;
    c.lineWidth = w;
    c.beginPath();
    c.moveTo(x0, y);
    c.quadraticCurveTo((x0 + x1) / 2, y + dip * 2, x1, y);
    c.stroke();
  }
  // ธงทิวสามเหลี่ยม
  function bunting(c, x0, x1, y, dip, n, cols) {
    wire(c, x0, x1, y, dip);
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n;
      const [x, yy] = qpt(x0, x1, y, dip, u);
      c.fillStyle = cols[i % cols.length];
      c.beginPath();
      c.moveTo(x - 15, yy);
      c.lineTo(x + 15, yy);
      c.lineTo(x, yy + 34);
      c.closePath();
      c.fill();
      c.fillStyle = 'rgba(255,255,255,.18)';
      c.beginPath();
      c.moveTo(x - 15, yy);
      c.lineTo(x, yy);
      c.lineTo(x, yy + 34);
      c.closePath();
      c.fill();
    }
  }
  // หลอดไฟห้อย (นิ่ง) — twinkle ใช้ bulbsTwinkle ในชั้นเคลื่อนไหว
  function bulbs(c, x0, x1, y, dip, n, col = '#ffd98a') {
    wire(c, x0, x1, y, dip, 'rgba(30,25,35,.85)', 2.5);
    for (let i = 0; i < n; i++) {
      const [x, yy] = qpt(x0, x1, y, dip, (i + 0.5) / n);
      glow(c, x, yy + 8, 26, col, 0.55);
      c.fillStyle = '#fff7dc';
      c.beginPath();
      c.arc(x, yy + 8, 6, 0, TAU);
      c.fill();
    }
  }
  function bulbsTwinkle(c, x0, x1, y, dip, n, t, col = '#ffd98a') {
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const a = 0.18 + 0.18 * Math.sin(t / 380 + i * 1.9);
      if (a <= 0.05) continue;
      const [x, yy] = qpt(x0, x1, y, dip, (i + 0.5) / n);
      glow(c, x, yy + 8, 36, col, a);
    }
    c.restore();
  }
  function lantern(c, x, y, s = 1, col = '#d62f2f') {
    c.save();
    c.translate(x, y);
    c.scale(s, s);
    c.strokeStyle = 'rgba(60,30,20,.9)';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(0, -40);
    c.lineTo(0, -22);
    c.stroke();
    glow(c, 0, 0, 52, col === '#d62f2f' ? '#ff6a3d' : col, 0.45);
    c.fillStyle = col;
    c.beginPath();
    c.ellipse(0, 0, 22, 25, 0, 0, TAU);
    c.fill();
    c.fillStyle = 'rgba(255,220,150,.35)';
    c.beginPath();
    c.ellipse(-4, -2, 9, 18, 0, 0, TAU);
    c.fill();
    c.fillStyle = '#e6b84a';
    c.fillRect(-11, -25, 22, 6);
    c.fillRect(-11, 19, 22, 6);
    c.strokeStyle = '#ffd166';
    c.beginPath();
    for (const dx of [-5, 0, 5]) {
      c.moveTo(dx, 25);
      c.lineTo(dx, 40);
    }
    c.stroke();
    c.restore();
  }
  function lanternRow(c, x0, x1, y, dip, n, col) {
    wire(c, x0, x1, y, dip, 'rgba(60,30,20,.9)', 2.5);
    for (let i = 0; i < n; i++) {
      const [x, yy] = qpt(x0, x1, y, dip, (i + 0.5) / n);
      lantern(c, x, yy + 40, 0.8, col);
    }
  }
  // ซุ้มขายของ
  function stall(c, x, y, w, col, goods = '#ffd166') {
    const h = w * 0.75;
    c.fillStyle = '#6b4226';
    c.fillRect(x + w * 0.06, y + h * 0.35, w * 0.88, h * 0.65);
    c.fillStyle = '#3a2418';
    c.fillRect(x + w * 0.1, y + h * 0.4, w * 0.8, h * 0.28);
    c.fillStyle = '#9a6640';
    c.fillRect(x + w * 0.02, y + h * 0.72, w * 0.96, h * 0.28);
    for (let i = 0; i < 5; i++) {
      c.fillStyle = i % 2 ? '#ffffff' : col;
      c.beginPath();
      c.moveTo(x + (i * w) / 5, y + h * 0.36);
      c.lineTo(x + ((i + 1) * w) / 5, y + h * 0.36);
      c.lineTo(x + w * 0.1 + ((i + 1) * w * 0.8) / 5, y + h * 0.08);
      c.lineTo(x + w * 0.1 + (i * w * 0.8) / 5, y + h * 0.08);
      c.closePath();
      c.fill();
    }
    c.fillStyle = col;
    for (let i = 0; i < 6; i++) {
      c.beginPath();
      c.arc(x + w * (i + 0.5) / 6, y + h * 0.36, w / 12, 0, Math.PI);
      c.fill();
    }
    c.fillStyle = goods;
    for (let i = 0; i < 4; i++) {
      c.beginPath();
      c.arc(x + w * (0.22 + i * 0.19), y + h * 0.56, w * 0.05, 0, TAU);
      c.fill();
    }
    glow(c, x + w / 2, y + h * 0.55, w * 0.6, '#ffd98a', 0.28);
  }
  // คนตัวเล็ก (ฉากหลัง)
  function person(c, x, y, s, shirt, skin = '#f1c7a0') {
    c.fillStyle = 'rgba(0,0,0,.25)';
    c.beginPath();
    c.ellipse(x, y + 38 * s, 9 * s, 2 * s, 0, 0, TAU);
    c.fill();
    c.fillStyle = shirt;
    c.beginPath();
    c.roundRect(x - 8 * s, y + 14 * s, 16 * s, 22 * s, 7 * s);
    c.fill();
    c.fillStyle = '#2a2633';
    c.fillRect(x - 5 * s, y + 32 * s, 4 * s, 6 * s);
    c.fillRect(x + 1 * s, y + 32 * s, 4 * s, 6 * s);
    c.fillStyle = skin;
    c.beginPath();
    c.arc(x, y + 8 * s, 7 * s, 0, TAU);
    c.fill();
    c.fillStyle = '#2a1f1a';
    c.beginPath();
    c.arc(x, y + 6 * s, 7 * s, Math.PI, 0);
    c.fill();
  }
  function crowdRow(c, x0, x1, y, n, s, seed, cols) {
    const r = rng(seed);
    for (let i = 0; i < n; i++) person(c, x0 + ((x1 - x0) * (i + r() * 0.6)) / n, y + r() * 14, s, cols[Math.floor(r() * cols.length)]);
  }
  function rainbow(c, cx, cy, r, a = 0.5) {
    const cols = ['#ff5a5a', '#ff9f43', '#ffd166', '#3ddc84', '#4fc3ff', '#7c5cff'];
    c.save();
    c.globalAlpha = a;
    c.lineWidth = r * 0.06;
    cols.forEach((col, i) => {
      c.strokeStyle = col;
      c.beginPath();
      c.arc(cx, cy, r - i * r * 0.06, Math.PI, 0);
      c.stroke();
    });
    c.restore();
  }
  function neon(c, x, y, text, col, size = 60) {
    c.save();
    c.font = `800 ${size}px Kanit, "Leelawadee UI", sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.shadowColor = col;
    c.shadowBlur = 30;
    c.fillStyle = col;
    c.fillText(text, x, y);
    c.shadowBlur = 8;
    c.fillStyle = '#ffffff';
    c.fillText(text, x, y);
    c.restore();
  }
  function trophy(c, x, y, s = 1) {
    c.save();
    c.translate(x, y);
    c.scale(s, s);
    glow(c, 0, -40, 130, '#ffd166', 0.45);
    c.fillStyle = '#8a5a1e';
    c.fillRect(-46, 40, 92, 26);
    c.fillStyle = '#5a3a14';
    c.fillRect(-56, 62, 112, 16);
    c.fillStyle = '#e6b84a';
    c.fillRect(-10, 0, 20, 42);
    c.beginPath();
    c.moveTo(-50, -80);
    c.lineTo(50, -80);
    c.quadraticCurveTo(46, 6, 0, 10);
    c.quadraticCurveTo(-46, 6, -50, -80);
    c.fill();
    c.strokeStyle = '#e6b84a';
    c.lineWidth = 9;
    c.beginPath();
    c.arc(-50, -50, 22, Math.PI * 0.5, Math.PI * 1.5);
    c.arc(50, -50, 22, Math.PI * 1.5, Math.PI * 0.5);
    c.stroke();
    c.fillStyle = '#fff2b0';
    c.fillRect(-30, -74, 12, 60);
    c.restore();
  }

  // ------------------------------------------------------------ ของเคลื่อนไหว
  // พลุ: n ลูกหมุนเวียน ตำแหน่งสุ่มใหม่ทุกรอบ
  function fireworks(c, t, o) {
    const { x0, x1, y0, y1, n = 3, period = 2600, cols, R = 120, ground = 1100 } = o;
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (let k = 0; k < n; k++) {
      const tt = t + (k * period) / n;
      const cyc = Math.floor(tt / period);
      const age = (tt % period) / period;
      const r = rng(cyc * 131 + k * 17 + 3);
      const x = x0 + (x1 - x0) * r();
      const y = y0 + (y1 - y0) * r();
      const col = cols[Math.floor(r() * cols.length)];
      const rgb = hexRgb(col);
      if (age < 0.18) {
        const u = age / 0.18;
        const yy = ground + (y - ground) * ease(u);
        c.strokeStyle = `rgba(${rgb},.8)`;
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(x, yy + 40);
        c.lineTo(x, yy);
        c.stroke();
        continue;
      }
      const a = (age - 0.18) / 0.82;
      const rad = R * ease(a * 1.4);
      const alpha = Math.max(0, 1 - a * 1.1);
      if (a < 0.12) glow(c, x, y, R * 1.2, col, 0.35 * (1 - a / 0.12));
      const rays = 26;
      for (let i = 0; i < rays; i++) {
        const ang = (i / rays) * TAU + cyc;
        const px = x + Math.cos(ang) * rad;
        const py = y + Math.sin(ang) * rad + a * a * 60;
        c.fillStyle = `rgba(${rgb},${alpha})`;
        c.beginPath();
        c.arc(px, py, 4.2 * (1 - a * 0.6), 0, TAU);
        c.fill();
        c.strokeStyle = `rgba(${rgb},${alpha * 0.35})`;
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(x + Math.cos(ang) * rad * 0.55, y + Math.sin(ang) * rad * 0.55 + a * a * 30);
        c.lineTo(px, py);
        c.stroke();
      }
    }
    c.restore();
  }
  // โคมลอยขึ้นฟ้า
  function skyLanterns(c, t, o) {
    const { x0, x1, y0, y1, n = 10, speed = 26, seed = 1, s = 1 } = o;
    for (let i = 0; i < n; i++) {
      const r = rng(seed * 50 + i);
      const depth = 0.45 + r() * 0.75;
      const span = y1 - y0;
      const p = ((t / 1000) * speed * depth + r() * span) % span;
      const y = y1 - p;
      const x = x0 + (x1 - x0) * r() + Math.sin(t / 1400 + i) * 14;
      const k = depth * s;
      const fade = clamp(p / 80) * clamp((span - p) / 120);
      c.globalAlpha = fade;
      glow(c, x, y, 34 * k, '#ffb347', 0.5);
      c.fillStyle = '#ff9f43';
      c.beginPath();
      c.moveTo(x - 10 * k, y - 14 * k);
      c.lineTo(x + 10 * k, y - 14 * k);
      c.lineTo(x + 7 * k, y + 13 * k);
      c.lineTo(x - 7 * k, y + 13 * k);
      c.closePath();
      c.fill();
      c.fillStyle = '#ffe2a8';
      c.fillRect(x - 4 * k, y - 10 * k, 8 * k, 20 * k);
      c.globalAlpha = 1;
    }
  }
  function fireflies(c, t, o) {
    const { x0, x1, y0, y1, n = 24, col = '#d8ff7a', seed = 2 } = o;
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const r = rng(seed * 70 + i);
      const x = x0 + (x1 - x0) * r() + Math.sin(t / (900 + r() * 700) + i) * 26;
      const y = y0 + (y1 - y0) * r() + Math.cos(t / (1100 + r() * 600) + i * 2) * 18;
      const a = 0.25 + 0.5 * Math.max(0, Math.sin(t / 500 + i * 2.3));
      glow(c, x, y, 14, col, a);
      c.fillStyle = `rgba(255,255,220,${a})`;
      c.beginPath();
      c.arc(x, y, 2.4, 0, TAU);
      c.fill();
    }
    c.restore();
  }
  // ของตก (กระดาษสี/กลีบ/หิมะ/โฟม)
  function fall(c, t, o) {
    const { n = 40, cols, kind = 'paper', speed = 120, seed = 3, x0 = 0, x1 = 1080, y0 = -40, y1 = 1920, size = 1 } = o;
    for (let i = 0; i < n; i++) {
      const r = rng(seed * 90 + i);
      const span = y1 - y0;
      const sp = speed * (0.6 + r() * 0.8);
      const y = y0 + ((t / 1000) * sp + r() * span) % span;
      const x = x0 + (x1 - x0) * r() + Math.sin(t / 700 + i) * 30;
      const rot = t / (400 + r() * 500) + i;
      c.save();
      c.translate(x, y);
      c.rotate(rot);
      c.fillStyle = cols[i % cols.length];
      if (kind === 'paper') c.fillRect(-7 * size, -4 * size, 14 * size, 8 * size * Math.abs(Math.cos(rot * 1.7)) + 1);
      else if (kind === 'petal') {
        c.beginPath();
        c.ellipse(0, 0, 9 * size, 5 * size, 0, 0, TAU);
        c.fill();
      } else if (kind === 'snow') {
        c.globalAlpha = 0.85;
        c.beginPath();
        c.arc(0, 0, 4 * size * (0.6 + r()), 0, TAU);
        c.fill();
      } else if (kind === 'bubble') {
        c.globalAlpha = 0.6;
        c.strokeStyle = cols[i % cols.length];
        c.lineWidth = 2;
        c.beginPath();
        c.arc(0, 0, 10 * size * (0.6 + r()), 0, TAU);
        c.stroke();
      }
      c.restore();
    }
  }
  // ลำแสง (เลเซอร์/สปอตไลต์) จากจุดต้นทาง ส่ายไปมา
  function beams(c, t, o) {
    const { from, cols, len = 1400, width = 0.05, speed = 1, alpha = 0.32, base = Math.PI / 2, swing = 0.5 } = o;
    c.save();
    c.globalCompositeOperation = 'lighter';
    from.forEach(([x, y], i) => {
      const ang = base + Math.sin((t / 1000) * speed + i * 1.7) * swing;
      const col = hexRgb(cols[i % cols.length]);
      const g = c.createLinearGradient(x, y, x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      g.addColorStop(0, `rgba(${col},${alpha})`);
      g.addColorStop(1, `rgba(${col},0)`);
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + Math.cos(ang - width) * len, y + Math.sin(ang - width) * len);
      c.lineTo(x + Math.cos(ang + width) * len, y + Math.sin(ang + width) * len);
      c.closePath();
      c.fill();
    });
    c.restore();
  }
  function lightning(c, t, o) {
    const { period = 5200, x0 = 300, x1 = 780 } = o;
    const cyc = Math.floor(t / period);
    const age = (t % period) / period;
    if (age > 0.06) return;
    const r = rng(cyc * 7 + 1);
    const k = 1 - age / 0.06;
    c.fillStyle = `rgba(200,230,255,${0.25 * k})`;
    c.fillRect(0, 0, 1080, 1920);
    let x = x0 + (x1 - x0) * r();
    let y = 120;
    c.strokeStyle = `rgba(230,245,255,${k})`;
    c.lineWidth = 6;
    c.shadowColor = '#bfe6ff';
    c.shadowBlur = 24;
    c.beginPath();
    c.moveTo(x, y);
    while (y < 700) {
      x += (r() - 0.5) * 90;
      y += 50 + r() * 50;
      c.lineTo(x, y);
    }
    c.stroke();
    c.shadowBlur = 0;
  }
  function bats(c, t, o) {
    const { n = 8, y0 = 200, y1 = 600, seed = 4 } = o;
    c.fillStyle = '#0a0a12';
    for (let i = 0; i < n; i++) {
      const r = rng(seed * 30 + i);
      const sp = 90 + r() * 80;
      const x = ((t / 1000) * sp + r() * 1400) % 1400 - 160;
      const y = y0 + (y1 - y0) * r() + Math.sin(t / 300 + i) * 20;
      const f = Math.sin(t / 70 + i) * 10;
      const s = 0.7 + r() * 0.6;
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(x - 14 * s, y - 10 * s - f, x - 30 * s, y - 2 * s + f);
      c.quadraticCurveTo(x - 16 * s, y + 2 * s, x, y + 6 * s);
      c.quadraticCurveTo(x + 16 * s, y + 2 * s, x + 30 * s, y - 2 * s + f);
      c.quadraticCurveTo(x + 14 * s, y - 10 * s - f, x, y);
      c.fill();
    }
  }
  // วัตถุลอยบนน้ำไหลช้า ๆ (กระทง/เรือ)
  function drift(c, t, o, draw) {
    const { n = 6, y0, y1, speed = 18, seed = 5, x0 = -80, x1 = 1160 } = o;
    for (let i = 0; i < n; i++) {
      const r = rng(seed * 40 + i);
      const depth = r();
      const y = y0 + (y1 - y0) * depth;
      const sp = speed * (0.6 + depth * 0.8) * (r() > 0.5 ? 1 : -1);
      const span = x1 - x0;
      let x = (((t / 1000) * sp + r() * span) % span + span) % span + x0;
      draw(c, x, y + Math.sin(t / 600 + i) * 3, 0.55 + depth * 0.65, i, t);
    }
  }
  function krathongItem(c, x, y, s, i, t) {
    c.save();
    c.translate(x, y);
    c.scale(s, s);
    glow(c, 0, -26, 50, '#ffcf6a', 0.45 + 0.15 * Math.sin(t / 200 + i));
    c.fillStyle = '#2f7a3a';
    c.beginPath();
    c.ellipse(0, 0, 34, 10, 0, 0, TAU);
    c.fill();
    const petals = ['#ff8fab', '#ffd166', '#ffffff', '#ffb3c7'];
    for (let k = -2; k <= 2; k++) {
      c.fillStyle = petals[(i + k + 4) % 4];
      c.beginPath();
      c.ellipse(k * 11, -8, 8, 13, k * 0.3, 0, TAU);
      c.fill();
    }
    c.fillStyle = '#fff3cf';
    c.fillRect(-2, -34, 4, 22);
    c.fillStyle = '#ffb347';
    c.beginPath();
    c.ellipse(0, -38, 3.5, 7, 0, 0, TAU);
    c.fill();
    c.fillStyle = 'rgba(255,207,106,.25)';
    c.fillRect(-6, 10, 12, 30);
    c.restore();
  }
  function boatItem(c, x, y, s, i, t, lit = true) {
    c.save();
    c.translate(x, y);
    c.scale(s, s);
    if (lit) glow(c, 0, -20, 90, '#ffcf6a', 0.35);
    c.fillStyle = '#5a3a24';
    c.beginPath();
    c.moveTo(-80, -6);
    c.quadraticCurveTo(0, 26, 80, -6);
    c.lineTo(70, 4);
    c.quadraticCurveTo(0, 30, -70, 4);
    c.closePath();
    c.fill();
    c.fillStyle = '#8a5a34';
    c.fillRect(-60, -10, 120, 8);
    const cols = ['#e8453c', '#ffd166', '#3ddc84', '#4fc3ff', '#ff8fab'];
    for (let k = 0; k < 5; k++) {
      c.fillStyle = cols[(k + i) % 5];
      c.beginPath();
      c.arc(-44 + k * 22, -18, 9, 0, TAU);
      c.fill();
    }
    if (lit) {
      c.strokeStyle = 'rgba(60,40,30,.8)';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(-60, -50);
      c.quadraticCurveTo(0, -34, 60, -50);
      c.stroke();
      for (let k = 0; k < 6; k++) {
        const bx = -60 + k * 24;
        const by = -50 + Math.sin((k / 5) * Math.PI) * 10;
        glow(c, bx, by, 14, '#ffd98a', 0.6);
        c.fillStyle = '#fff3cf';
        c.beginPath();
        c.arc(bx, by, 3.5, 0, TAU);
        c.fill();
      }
      c.fillStyle = '#5a3a24';
      c.fillRect(-62, -52, 4, 44);
      c.fillRect(58, -52, 4, 44);
    }
    c.restore();
  }
  function pulseGlow(c, t, x, y, r, col, a = 0.4, speed = 900) {
    glow(c, x, y, r, col, a * (0.7 + 0.3 * Math.sin(t / speed)));
  }
  // ---------------------------------------------------------------- ชิงช้าสวรรค์ / ม้าหมุน / ว่าว / สิงโต / มังกร
  function ferrisWheel(c, t, x, y, R) {
    c.save();
    c.strokeStyle = '#8e8aa8';
    c.lineWidth = 8;
    c.beginPath();
    c.moveTo(x - R * 0.45, y + R * 1.3);
    c.lineTo(x, y);
    c.lineTo(x + R * 0.45, y + R * 1.3);
    c.stroke();
    const rot = t / 6000;
    c.strokeStyle = '#ffd166';
    c.lineWidth = 5;
    c.beginPath();
    c.arc(x, y, R, 0, TAU);
    c.stroke();
    c.strokeStyle = 'rgba(201,154,58,.8)';
    c.lineWidth = 2.5;
    const cols = ['#e8453c', '#3b82f6', '#22c55e', '#ffd166', '#ff4fa3', '#8a6bd1', '#ff9f43', '#4fc3ff'];
    for (let i = 0; i < 8; i++) {
      const a = rot + (i / 8) * TAU;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R);
      c.stroke();
    }
    for (let i = 0; i < 16; i++) {
      const a = rot + (i / 16) * TAU;
      const lx = x + Math.cos(a) * R;
      const ly = y + Math.sin(a) * R;
      const on = 0.5 + 0.5 * Math.sin(t / 200 + i);
      glow(c, lx, ly, 16, '#ffe8a8', 0.5 * on + 0.2);
    }
    for (let i = 0; i < 8; i++) {
      const a = rot + (i / 8) * TAU;
      const cx = x + Math.cos(a) * R;
      const cy = y + Math.sin(a) * R;
      c.fillStyle = cols[i];
      c.beginPath();
      c.roundRect(cx - 13, cy + 2, 26, 20, 5);
      c.fill();
      c.fillStyle = 'rgba(255,240,200,.7)';
      c.fillRect(cx - 9, cy + 6, 18, 7);
    }
    c.fillStyle = '#ffd166';
    c.beginPath();
    c.arc(x, y, 10, 0, TAU);
    c.fill();
    c.restore();
  }
  function kites(c, t, o) {
    const { n = 4, x0 = 320, x1 = 760, y0 = 220, y1 = 520, seed = 6 } = o;
    const cols = [['#e8453c', '#ffd166'], ['#3b82f6', '#ffffff'], ['#22c55e', '#ff4fa3'], ['#8a6bd1', '#ffd166']];
    for (let i = 0; i < n; i++) {
      const r = rng(seed * 20 + i);
      const x = x0 + (x1 - x0) * r() + Math.sin(t / 1300 + i) * 30;
      const y = y0 + (y1 - y0) * r() + Math.cos(t / 1100 + i * 2) * 18;
      const s = 0.7 + r() * 0.6;
      const [a, b] = cols[i % cols.length];
      c.save();
      c.translate(x, y);
      c.rotate(Math.sin(t / 900 + i) * 0.15);
      c.scale(s, s);
      c.fillStyle = a;
      c.beginPath();
      c.moveTo(0, -40);
      c.lineTo(28, 0);
      c.lineTo(0, 50);
      c.lineTo(-28, 0);
      c.closePath();
      c.fill();
      c.fillStyle = b;
      c.beginPath();
      c.moveTo(0, -40);
      c.lineTo(28, 0);
      c.lineTo(0, 6);
      c.closePath();
      c.fill();
      c.strokeStyle = 'rgba(255,255,255,.6)';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(0, 50);
      for (let k = 1; k < 6; k++) c.lineTo(Math.sin(t / 250 + k) * 10, 50 + k * 16);
      c.stroke();
      c.restore();
    }
  }
  function lionDance(c, t, x, y, s = 1) {
    const hop = Math.abs(Math.sin(t / 260)) * 18;
    c.save();
    c.translate(x, y - hop);
    c.scale(s, s);
    // ตัว (ผ้าคลุม)
    c.fillStyle = '#e8453c';
    c.beginPath();
    c.ellipse(70, 10, 80, 34, 0, 0, TAU);
    c.fill();
    c.fillStyle = '#ffd166';
    for (let i = 0; i < 6; i++) {
      c.beginPath();
      c.arc(20 + i * 22, 36, 8, 0, Math.PI);
      c.fill();
    }
    c.fillStyle = '#2a2633';
    for (const lx of [30, 60, 110, 140]) c.fillRect(lx, 38, 10, 26);
    // หัว
    c.save();
    c.rotate(Math.sin(t / 300) * 0.15);
    c.fillStyle = '#ffd166';
    c.beginPath();
    c.ellipse(-10, -10, 46, 40, 0, 0, TAU);
    c.fill();
    c.fillStyle = '#e8453c';
    c.beginPath();
    c.ellipse(-10, -34, 40, 18, 0, 0, TAU);
    c.fill();
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(-26, -12, 10, 0, TAU);
    c.arc(4, -12, 10, 0, TAU);
    c.fill();
    c.fillStyle = '#1d1714';
    c.beginPath();
    c.arc(-24, -12, 5, 0, TAU);
    c.arc(6, -12, 5, 0, TAU);
    c.fill();
    c.fillStyle = '#c0302a';
    c.beginPath();
    c.ellipse(-10, 16, 26, 10 + Math.abs(Math.sin(t / 200)) * 6, 0, 0, TAU);
    c.fill();
    c.fillStyle = '#ffffff';
    c.fillRect(-30, 8, 40, 5);
    c.fillStyle = '#3ddc84';
    c.beginPath();
    c.arc(-10, -52, 9, 0, TAU);
    c.fill();
    c.restore();
    c.restore();
  }
  function dragon(c, t, o) {
    const { y = 420, amp = 50, len = 26, x0 = 1180 } = o;
    const head = ((t / 1000) * 150) % 1700;
    const pts = [];
    for (let i = 0; i < len; i++) {
      const x = x0 - head + i * 38;
      pts.push([x, y + Math.sin(t / 400 - i * 0.45) * amp]);
    }
    for (let i = len - 1; i >= 1; i--) {
      const [x, yy] = pts[i];
      const r = 26 - i * 0.55;
      c.fillStyle = i % 2 ? '#d4a017' : '#f2c84b';
      c.beginPath();
      c.arc(x, yy, r, 0, TAU);
      c.fill();
      c.fillStyle = '#e8453c';
      c.beginPath();
      c.moveTo(x - 8, yy - r + 2);
      c.lineTo(x, yy - r - 14);
      c.lineTo(x + 8, yy - r + 2);
      c.closePath();
      c.fill();
    }
    const [hx, hy] = pts[0];
    glow(c, hx, hy, 80, '#ffd166', 0.4);
    c.fillStyle = '#f2c84b';
    c.beginPath();
    c.ellipse(hx - 10, hy, 44, 30, 0, 0, TAU);
    c.fill();
    c.fillStyle = '#e8453c';
    c.beginPath();
    c.moveTo(hx - 50, hy + 8);
    c.lineTo(hx - 20, hy + 26);
    c.lineTo(hx + 10, hy + 14);
    c.closePath();
    c.fill();
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(hx - 24, hy - 8, 7, 0, TAU);
    c.fill();
    c.fillStyle = '#1d1714';
    c.beginPath();
    c.arc(hx - 26, hy - 8, 3.5, 0, TAU);
    c.fill();
    c.strokeStyle = '#e8453c';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(hx - 40, hy - 4);
    c.quadraticCurveTo(hx - 80, hy - 30, hx - 96, hy - 10 + Math.sin(t / 150) * 8);
    c.stroke();
  }
  function fireSpinner(c, t, x, y) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 14; k++) {
      const a = t / 140 - k * 0.12;
      const fx = x + Math.cos(a) * 70;
      const fy = y - 60 + Math.sin(a) * 70;
      glow(c, fx, fy, 26 - k, k < 2 ? '#fff3cf' : '#ff8a3d', 0.55 * (1 - k / 14));
    }
    c.restore();
    person(c, x, y - 30, 2, '#1d1714', '#c99a72');
  }
  function belt(c, t, x, yTop, yEnd) {
    const k = ease(((t / 1000) % 9) / 3);
    const y = yTop + (yEnd - yTop) * k;
    c.strokeStyle = 'rgba(220,220,230,.7)';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x - 60, 0);
    c.lineTo(x - 60, y);
    c.moveTo(x + 60, 0);
    c.lineTo(x + 60, y);
    c.stroke();
    glow(c, x, y + 20, 140, '#ffd166', 0.5);
    c.fillStyle = '#c99a3a';
    c.beginPath();
    c.roundRect(x - 120, y, 240, 44, 16);
    c.fill();
    c.fillStyle = '#ffd166';
    c.beginPath();
    c.ellipse(x, y + 22, 52, 34, 0, 0, TAU);
    c.fill();
    c.fillStyle = '#e8453c';
    c.beginPath();
    c.arc(x, y + 22, 18, 0, TAU);
    c.fill();
    c.fillStyle = '#fff3cf';
    c.beginPath();
    c.arc(x - 8, y + 14, 6, 0, TAU);
    c.fill();
  }

  // ================================================================= ธีม
  const PARTY = ['#ff5a5a', '#ffd166', '#3ddc84', '#4fc3ff', '#ff4fa3', '#b28cff'];
  const L = {};

  // ---- คอนเสิร์ต
  L.concert = {
    names: { 2: 'เลเซอร์ + แท่งไฟเต็มฮอลล์', 3: 'พลุบนเวที + กระดาษทองโปรย' },
    s2(c) {
      glow(c, 540, 380, 380, '#ff4fd8', 0.18);
      bulbs(c, 300, 780, 520, 10, 14, '#ff7ad9');
    },
    a2(c, t) {
      // เลเซอร์จากขอบเวทีกวาดลงไปทั่วฮอลล์
      beams(c, t, { from: [[330, 530], [750, 530], [540, 520], [420, 525], [660, 525]], cols: ['#3ddcff', '#ff4fd8', '#3dff9e', '#ff4fd8', '#3ddcff'], base: Math.PI / 2, swing: 0.75, speed: 1.4, width: 0.01, alpha: 0.55, len: 1500 });
      fireflies(c, t, { x0: 60, x1: 1020, y0: 980, y1: 1700, n: 40, col: '#ff7ad9', seed: 11 });
      fireflies(c, t, { x0: 60, x1: 1020, y0: 980, y1: 1700, n: 30, col: '#3ddcff', seed: 12 });
    },
    s3(c) {
      for (const x of [340, 740]) {
        c.fillStyle = '#2a2235';
        c.fillRect(x - 30, 470, 60, 60);
        c.fillStyle = '#4a3a5a';
        c.fillRect(x - 36, 466, 72, 10);
      }
    },
    a3(c, t) {
      for (const [x, ph] of [[340, 0], [740, 600]]) {
        const k = Math.max(0, Math.sin((t + ph) / 260));
        const h = 120 + 260 * k;
        c.save();
        c.globalCompositeOperation = 'lighter';
        const g = c.createLinearGradient(x, 470, x, 470 - h);
        g.addColorStop(0, 'rgba(255,240,180,.9)');
        g.addColorStop(0.4, 'rgba(255,140,40,.7)');
        g.addColorStop(1, 'rgba(255,60,20,0)');
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(x - 26, 470);
        c.quadraticCurveTo(x - 30, 470 - h * 0.6, x, 470 - h);
        c.quadraticCurveTo(x + 30, 470 - h * 0.6, x + 26, 470);
        c.closePath();
        c.fill();
        c.restore();
      }
      fireworks(c, t, { x0: 360, x1: 720, y0: 700, y1: 880, n: 3, cols: ['#ffd166', '#ff4fd8', '#3ddcff'], R: 110, ground: 1100 });
    },
    f3(c, t) {
      fall(c, t, { n: 60, cols: ['#ffd166', '#f2c84b', '#fff3cf', '#e6b84a'], kind: 'paper', speed: 140, seed: 13, size: 1.3 });
    },
  };

  // ---- ไหว้ศาล
  L.shrine = {
    names: { 2: 'พวงมาลัยดาวเรือง + ธูปเทียนสว่าง', 3: 'แสงทองจากศาล + ผ้าแพรเจ็ดสี' },
    s2(c) {
      // พวงมาลัยดาวเรืองห้อยหน้าศาล
      lanternRow(c, 320, 760, 600, 20, 5, '#ff9f1a');
      for (const [x0, x1, y, dip] of [[320, 760, 690, 26], [340, 740, 740, 20]]) {
        wire(c, x0, x1, y, dip, 'rgba(90,60,20,.8)', 2);
        for (let i = 0; i < 22; i++) {
          const [x, yy] = qpt(x0, x1, y, dip, (i + 0.5) / 22);
          c.fillStyle = i % 3 === 0 ? '#ff9f1a' : '#ffc61a';
          c.beginPath();
          c.arc(x, yy + 4, 13, 0, TAU);
          c.fill();
        }
      }
      // เทียนสองแถวข้างทางเดิน
      for (let i = 0; i < 6; i++) {
        for (const side of [-1, 1]) {
          const x = 540 + side * (150 + i * 46);
          const y = 760 + i * 70;
          c.fillStyle = '#fff2d6';
          c.fillRect(x - 5, y - 26, 10, 26);
          glow(c, x, y - 32, 36, '#ffb347', 0.6);
        }
      }
    },
    a2(c, t) {
      for (let i = 0; i < 6; i++) {
        for (const side of [-1, 1]) {
          const x = 540 + side * (150 + i * 46);
          const y = 760 + i * 70;
          const f = 1 + Math.sin(t / 90 + i * 3 + side) * 0.2;
          c.fillStyle = '#ffcf5a';
          c.beginPath();
          c.ellipse(x, y - 34, 4 * f, 9 * f, 0, 0, TAU);
          c.fill();
        }
      }
      // ควันธูปเป็นสาย
      c.strokeStyle = 'rgba(235,230,245,.25)';
      c.lineWidth = 4;
      for (const bx of [470, 540, 610]) {
        c.beginPath();
        for (let k = 0; k <= 20; k++) {
          const y = 640 - k * 16;
          const x = bx + Math.sin(t / 700 + k * 0.5 + bx) * (6 + k * 1.4);
          k ? c.lineTo(x, y) : c.moveTo(x, y);
        }
        c.stroke();
      }
    },
    s3(c) {
      // ผ้าแพรเจ็ดสีพันต้นไม้ (ซ้าย/ขวา)
      const cols = ['#e8453c', '#ff9f43', '#ffd166', '#3ddc84', '#4fc3ff', '#7c5cff', '#ff4fa3'];
      for (const x of [230, 850]) {
        cols.forEach((col, i) => {
          c.fillStyle = col;
          c.fillRect(x - 40, 880 + i * 14, 80, 12);
        });
        c.fillStyle = 'rgba(255,255,255,.25)';
        c.fillRect(x - 40, 880, 80, 3);
      }
    },
    a3(c, t) {
      pulseGlow(c, t, 540, 400, 420, '#ffd166', 0.45, 700);
      c.save();
      c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 9; i++) {
        const a = -Math.PI / 2 + (i - 4) * 0.22 + Math.sin(t / 2000) * 0.05;
        const g = c.createLinearGradient(540, 380, 540 + Math.cos(a) * 900, 380 + Math.sin(a) * 900);
        g.addColorStop(0, 'rgba(255,220,120,.22)');
        g.addColorStop(1, 'rgba(255,220,120,0)');
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(540, 380);
        c.lineTo(540 + Math.cos(a - 0.04) * 900, 380 + Math.sin(a - 0.04) * 900);
        c.lineTo(540 + Math.cos(a + 0.04) * 900, 380 + Math.sin(a + 0.04) * 900);
        c.fill();
      }
      c.restore();
    },
    f3(c, t) {
      fall(c, t, { n: 34, cols: ['#ffc61a', '#ff9f1a', '#ffffff', '#ff8fab'], kind: 'petal', speed: 90, seed: 21 });
    },
  };

  // ---- ลอยกระทง
  L.krathong = {
    names: { 2: 'กระทงเต็มแม่น้ำ + ไฟริมน้ำ', 3: 'โคมลอยเต็มฟ้า + พลุสะท้อนน้ำ' },
    s2(c) {
      bulbs(c, -20, 540, 930, 14, 14, '#ffd98a');
      bulbs(c, 540, 1100, 930, 14, 14, '#ffb3c7');
    },
    a2(c, t) {
      drift(c, t, { n: 9, y0: 1010, y1: 1220, speed: 16, seed: 31 }, krathongItem);
      bulbsTwinkle(c, -20, 540, 930, 14, 14, t);
      bulbsTwinkle(c, 540, 1100, 930, 14, 14, t + 500, '#ffb3c7');
    },
    a3(c, t) {
      skyLanterns(c, t, { x0: 320, x1: 760, y0: 150, y1: 820, n: 16, speed: 30, seed: 32, s: 1.1 });
      fireworks(c, t, { x0: 360, x1: 720, y0: 200, y1: 420, n: 2, cols: ['#ffd166', '#ff8fab', '#7ad7ff'], R: 100, ground: 800 });
      // เงาพลุบนน้ำ
      c.save();
      c.globalAlpha = 0.25;
      c.globalCompositeOperation = 'lighter';
      fireworks(c, t, { x0: 360, x1: 720, y0: 1300, y1: 1080, n: 2, cols: ['#ffd166', '#ff8fab', '#7ad7ff'], R: 70, ground: 820 });
      c.restore();
      drift(c, t, { n: 2, y0: 1150, y1: 1230, speed: 22, seed: 33 }, (cc, x, y, s, i, tt) => boatItem(cc, x, y, s * 1.1, i, tt));
    },
  };

  // ---- ตกปลาริมบึง
  L.fishing = {
    names: { 2: 'เรือพาย + หิ่งห้อยกลางบึง', 3: 'ปลาทองยักษ์ + รุ้งข้ามบึง' },
    s2(c) {
      // ตอไม้กับนกกระยาง
      c.fillStyle = '#4a3326';
      c.fillRect(760, 1060, 22, 70);
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.ellipse(771, 1040, 14, 22, 0.2, 0, TAU);
      c.fill();
      c.beginPath();
      c.arc(778, 1012, 8, 0, TAU);
      c.fill();
      c.fillStyle = '#ffb347';
      c.fillRect(784, 1010, 16, 3);
    },
    a2(c, t) {
      fireflies(c, t, { x0: 300, x1: 780, y0: 760, y1: 1150, n: 30, seed: 41 });
      drift(c, t, { n: 1, y0: 1120, y1: 1130, speed: 20, seed: 42 }, (cc, x, y, s, i, tt) => {
        boatItem(cc, x, y, 1, i, tt, false);
        person(cc, x, y - 64, 1.4, '#3b82f6');
      });
    },
    s3(c) {
      rainbow(c, 540, 860, 420, 0.4);
    },
    a3(c, t) {
      const per = 4200;
      const age = (t % per) / per;
      if (age < 0.4) {
        const u = age / 0.4;
        const x = 420 + u * 240;
        const y = 1100 - Math.sin(u * Math.PI) * 260;
        c.save();
        c.translate(x, y);
        c.rotate(-0.8 + u * 1.6);
        glow(c, 0, 0, 90, '#ffd166', 0.4);
        c.fillStyle = '#ff9f1a';
        c.beginPath();
        c.ellipse(0, 0, 60, 26, 0, 0, TAU);
        c.fill();
        c.beginPath();
        c.moveTo(-50, 0);
        c.lineTo(-90, -26);
        c.lineTo(-84, 0);
        c.lineTo(-90, 26);
        c.closePath();
        c.fill();
        c.fillStyle = '#ffffff';
        c.beginPath();
        c.arc(36, -6, 6, 0, TAU);
        c.fill();
        c.fillStyle = '#1d1714';
        c.beginPath();
        c.arc(38, -6, 3, 0, TAU);
        c.fill();
        c.restore();
        // ละอองน้ำ
        for (let k = 0; k < 10; k++) {
          c.fillStyle = 'rgba(200,235,255,.7)';
          c.beginPath();
          c.arc(420 + k * 8 - 40, 1100 - u * 60 + k * 4, 3, 0, TAU);
          c.fill();
        }
      }
      // ฝูงปลาว่ายวน (เงาใต้น้ำ)
      c.fillStyle = 'rgba(255,170,60,.35)';
      for (let i = 0; i < 8; i++) {
        const a = t / 1600 + (i / 8) * TAU;
        c.beginPath();
        c.ellipse(540 + Math.cos(a) * 160, 1180 + Math.sin(a) * 40, 18, 7, a + Math.PI / 2, 0, TAU);
        c.fill();
      }
    },
  };

  // ---- สงกรานต์
  L.songkran = {
    names: { 2: 'รถน้ำแห่ + ธงทิวเต็มถนน', 3: 'ขบวนนางสงกรานต์ + ปาร์ตี้โฟม + รุ้ง' },
    s2(c) {
      bunting(c, 120, 960, 700, 18, 20, PARTY);
      bunting(c, 60, 1020, 760, 26, 24, ['#ffffff', '#4fc3ff', '#ff8fab', '#ffd166']);
    },
    a2(c, t) {
      // รถกระบะถังน้ำวิ่งข้ามถนน
      const x = (((t / 1000) * 120) % 1500) - 260;
      const y = 1000;
      c.save();
      c.translate(x, y);
      c.fillStyle = '#3b82f6';
      c.beginPath();
      c.roundRect(0, 0, 200, 60, 10);
      c.fill();
      c.fillStyle = '#2f6fb8';
      c.beginPath();
      c.roundRect(130, -46, 70, 50, 10);
      c.fill();
      c.fillStyle = '#bfe6ff';
      c.fillRect(150, -36, 40, 24);
      c.fillStyle = '#1d1714';
      for (const wx of [40, 160]) {
        c.beginPath();
        c.arc(wx, 64, 20, 0, TAU);
        c.fill();
      }
      c.fillStyle = '#9ad7ff';
      c.fillRect(20, -40, 90, 42);
      person(c, 40, -90, 1.5, '#ff4fa3');
      person(c, 90, -90, 1.5, '#ffd166');
      c.restore();
      // สาดน้ำเป็นสาย
      c.strokeStyle = 'rgba(160,220,255,.75)';
      c.lineWidth = 6;
      for (let k = 0; k < 3; k++) {
        const ph = (t / 300 + k) % 3;
        c.beginPath();
        c.moveTo(x + 60, y - 60);
        c.quadraticCurveTo(x - 40 - k * 30, y - 160 - k * 20, x - 120 - ph * 20, y - 40 + k * 20);
        c.stroke();
      }
    },
    s3(c) {
      rainbow(c, 540, 820, 380, 0.45);
    },
    a3(c, t) {
      // ขบวนแห่ (รถบุษบก) เคลื่อนช้า ๆ
      const x = 1180 - (((t / 1000) * 70) % 1600);
      c.save();
      c.translate(x, 1120);
      c.fillStyle = '#e6b84a';
      c.beginPath();
      c.roundRect(0, 0, 240, 56, 14);
      c.fill();
      c.fillStyle = '#ff8fab';
      for (let i = 0; i < 8; i++) {
        c.beginPath();
        c.arc(16 + i * 30, 4, 12, 0, TAU);
        c.fill();
      }
      c.fillStyle = '#c0302a';
      c.beginPath();
      c.moveTo(70, 0);
      c.lineTo(120, -120);
      c.lineTo(170, 0);
      c.closePath();
      c.fill();
      c.fillStyle = '#ffd166';
      c.beginPath();
      c.moveTo(120, -150);
      c.lineTo(110, -120);
      c.lineTo(130, -120);
      c.closePath();
      c.fill();
      person(c, 120, -84, 1.9, '#ffd166');
      c.fillStyle = '#1d1714';
      for (const wx of [40, 200]) {
        c.beginPath();
        c.arc(wx, 60, 16, 0, TAU);
        c.fill();
      }
      c.restore();
    },
    f3(c, t) {
      fall(c, t, { n: 40, cols: ['#ffffff', '#bfe6ff', '#ffe3f0'], kind: 'bubble', speed: -60, seed: 51, y0: 900, y1: 1900, size: 1.6 });
    },
  };

  // ---- ตรุษจีน
  L.cny = {
    names: { 2: 'โคมแดงเต็มลาน + ประทัด', 3: 'เชิดสิงโต + มังกรทอง' },
    s2(c) {
      lanternRow(c, 300, 780, 470, 14, 6, '#d62f2f');
      lanternRow(c, 260, 820, 600, 18, 8, '#d62f2f');
    },
    a2(c, t) {
      // ประทัดแตก
      for (const [bx, ph] of [[340, 0], [740, 900]]) {
        const age = ((t + ph) % 1800) / 1800;
        if (age < 0.35) {
          const u = age / 0.35;
          c.save();
          c.globalCompositeOperation = 'lighter';
          for (let i = 0; i < 16; i++) {
            const a = (i / 16) * TAU + ph;
            const r = 20 + u * 90;
            glow(c, bx + Math.cos(a) * r, 960 + Math.sin(a) * r * 0.6, 16, i % 2 ? '#ffd166' : '#ff5a3a', 0.7 * (1 - u));
          }
          c.restore();
        }
      }
      fall(c, t, { n: 16, cols: ['#e8453c', '#d62f2f'], kind: 'paper', speed: 80, seed: 61, x0: 300, x1: 780, y0: 400, y1: 1100, size: 1.6 });
    },
    a3(c, t) {
      dragon(c, t, { y: 1010, amp: 36, len: 24 });
      lionDance(c, t, 470 + Math.sin(t / 2500) * 90, 1240, 1.5);
    },
  };

  // ---- บ้านผีสิง
  L.ghost = {
    names: { 2: 'หมอกหนา + ดวงไฟผีลอย', 3: 'ฟ้าผ่า + ฝูงค้างคาว + เรือนเรืองแสง' },
    a2(c, t) {
      for (let i = 0; i < 5; i++) {
        const x = ((t / 1000) * (20 + i * 6) + i * 300) % 1400 - 160;
        const g = c.createRadialGradient(x, 960 + i * 50, 0, x, 960 + i * 50, 320);
        g.addColorStop(0, 'rgba(200,220,210,.18)');
        g.addColorStop(1, 'rgba(200,220,210,0)');
        c.fillStyle = g;
        c.fillRect(x - 320, 640 + i * 50, 640, 640);
      }
      c.save();
      c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 6; i++) {
        const x = 340 + i * 80 + Math.sin(t / 900 + i) * 40;
        const y = 760 + Math.cos(t / 1100 + i * 2) * 70 + i * 30;
        glow(c, x, y, 40, '#7dffb0', 0.35 + 0.2 * Math.sin(t / 300 + i));
        c.fillStyle = 'rgba(220,255,230,.8)';
        c.beginPath();
        c.arc(x, y, 6, 0, TAU);
        c.fill();
      }
      c.restore();
    },
    a3(c, t) {
      pulseGlow(c, t, 540, 700, 360, '#3dff9e', 0.32, 260);
      bats(c, t, { n: 10, y0: 220, y1: 640 });
      lightning(c, t, { period: 5200 });
    },
  };

  // ---- เคาท์ดาวน์ปีใหม่
  L.newyear = {
    names: { 2: 'ไฟต้นคริสต์มาสครบ + หิมะโปรย', 3: 'พลุเต็มฟ้า + กระดาษสายรุ้ง' },
    s2(c) {
      bulbs(c, 300, 780, 1040, 12, 16, '#ffd98a');
    },
    a2(c, t) {
      // ไฟบนต้น (กะพริบ)
      c.save();
      c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 26; i++) {
        const r = rng(71 + i);
        const yy = 520 + r() * 460;
        const half = ((yy - 480) / 520) * 150;
        const x = 540 + (r() * 2 - 1) * half;
        const col = PARTY[i % PARTY.length];
        glow(c, x, yy, 18, col, 0.3 + 0.4 * Math.max(0, Math.sin(t / 260 + i)));
      }
      c.restore();
      fall(c, t, { n: 50, cols: ['#ffffff'], kind: 'snow', speed: 70, seed: 72, size: 1.2 });
    },
    a3(c, t) {
      fireworks(c, t, { x0: 330, x1: 430, y0: 420, y1: 640, n: 2, cols: PARTY, R: 95, ground: 1000, period: 2400 });
      fireworks(c, t + 1200, { x0: 650, x1: 750, y0: 420, y1: 640, n: 2, cols: PARTY, R: 95, ground: 1000, period: 2400 });
    },
    f3(c, t) {
      fall(c, t, { n: 50, cols: PARTY, kind: 'paper', speed: 150, seed: 73, size: 1.2 });
    },
  };

  // ---- งานวัด (ลานกิจกรรม)
  L.temple = {
    names: { 2: 'ไฟประดับ + ธงทิว + ซุ้มขายของ', 3: 'ชิงช้าสวรรค์ + พลุ + โคมลอย' },
    s2(c) {
      bunting(c, 300, 780, 360, 16, 16, PARTY);
      bulbs(c, 300, 780, 420, 18, 14);
      stall(c, 330, 760, 130, '#e8453c');
      stall(c, 620, 760, 130, '#3b82f6');
      crowdRow(c, 340, 740, 860, 9, 1.4, 81, ['#3b82f6', '#e8453c', '#ffd166', '#22c55e', '#ff4fa3']);
    },
    a2(c, t) {
      bulbsTwinkle(c, 300, 780, 420, 18, 14, t);
    },
    a3(c, t) {
      ferrisWheel(c, t, 700, 790, 100);
      fireworks(c, t, { x0: 340, x1: 600, y0: 180, y1: 320, n: 3, cols: PARTY, R: 90, ground: 700 });
      skyLanterns(c, t, { x0: 330, x1: 600, y0: 200, y1: 700, n: 8, speed: 26, seed: 82, s: 0.9 });
    },
  };

  // ---- ตลาดน้ำ
  L.floating = {
    names: { 2: 'เรือขายของเพิ่ม + ไฟริมคลอง', 3: 'ขบวนเรือประดับไฟ + โคมลอย' },
    s2(c) {
      bulbs(c, 300, 780, 560, 16, 14, '#ffd98a');
    },
    a2(c, t) {
      bulbsTwinkle(c, 300, 780, 560, 16, 14, t);
      drift(c, t, { n: 4, y0: 860, y1: 1080, speed: 14, seed: 91 }, (cc, x, y, s, i, tt) => {
        boatItem(cc, x, y, s, i, tt, false);
        person(cc, x - 30 * s, y - 60 * s, 1.3 * s, ['#e8453c', '#3b82f6', '#22a06b', '#ff9f43'][i % 4]);
      });
    },
    a3(c, t) {
      drift(c, t, { n: 3, y0: 920, y1: 1060, speed: 20, seed: 92 }, (cc, x, y, s, i, tt) => boatItem(cc, x, y, s * 1.2, i, tt, true));
      skyLanterns(c, t, { x0: 320, x1: 760, y0: 180, y1: 760, n: 12, speed: 28, seed: 93 });
    },
  };

  // ---- ตลาดนัดกลางคืน
  L.nightmarket = {
    names: { 2: 'ร้านเพิ่ม + ไฟนีออน', 3: 'ป้ายนีออนยักษ์ + วงดนตรีเปิดหมวก' },
    s2(c) {
      stall(c, 320, 760, 140, '#ff4fa3', '#ff9f43');
      stall(c, 620, 760, 140, '#7c5cff', '#3ddc84');
      bulbs(c, 300, 780, 700, 14, 16, '#ff7ad9');
    },
    a2(c, t) {
      bulbsTwinkle(c, 300, 780, 700, 14, 16, t, '#ff7ad9');
      // ควันปิ้งย่าง
      c.fillStyle = 'rgba(230,230,240,.12)';
      for (let k = 0; k < 8; k++) {
        const y = 760 - ((t / 20 + k * 40) % 300);
        c.beginPath();
        c.arc(390 + Math.sin(t / 500 + k) * 20, y, 24 + (760 - y) * 0.08, 0, TAU);
        c.fill();
      }
    },
    a3(c, t) {
      const on = 0.75 + 0.25 * Math.sin(t / 120) * (Math.sin(t / 1700) > 0.9 ? 1 : 0.2);
      c.globalAlpha = on;
      neon(c, 540, 790, 'NIGHT MARKET', '#ff4fd8', 58);
      c.globalAlpha = 1;
      // วงดนตรี 3 คน
      const bop = Math.abs(Math.sin(t / 240)) * 6;
      c.fillStyle = '#3a2a4a';
      c.fillRect(420, 960, 240, 22);
      person(c, 470, 880 - bop, 1.8, '#ffd166');
      person(c, 540, 880 - bop * 0.6, 1.8, '#3ddc84');
      person(c, 610, 880 - bop, 1.8, '#4fc3ff');
      beams(c, t, { from: [[540, 700]], cols: ['#ff4fd8'], base: Math.PI / 2, swing: 0.3, width: 0.14, alpha: 0.18, len: 320 });
    },
  };

  // ---- มวยไทย
  L.muay = {
    names: { 2: 'ป้ายไฟรอบเวที + กองเชียร์เต็ม', 3: 'สปอตไลต์ + เข็มขัดแชมป์ลงจากเพดาน' },
    s2(c) {
      crowdRow(c, 330, 750, 572, 15, 1.1, 101, ['#e8453c', '#3b82f6', '#e8453c', '#3b82f6', '#ffd166']);
      crowdRow(c, 320, 760, 612, 16, 1.2, 102, ['#e8453c', '#3b82f6', '#ffffff']);
      c.fillStyle = '#1d1714';
      c.fillRect(260, 912, 560, 28);
    },
    a2(c, t) {
      // ป้ายไฟวิ่ง
      for (let i = 0; i < 22; i++) {
        const on = (Math.floor(t / 120) + i) % 4 === 0;
        c.fillStyle = on ? '#ffd166' : 'rgba(255,209,102,.25)';
        c.beginPath();
        c.arc(275 + i * 25, 926, 5, 0, TAU);
        c.fill();
      }
    },
    a3(c, t) {
      beams(c, t, { from: [[360, 0], [720, 0], [540, 0]], cols: ['#ffffff', '#ffffff', '#ffe8a8'], base: Math.PI / 2, swing: 0.25, speed: 0.9, width: 0.07, alpha: 0.2, len: 1000 });
      belt(c, t, 540, -60, 410);
    },
    f3(c, t) {
      fall(c, t, { n: 40, cols: ['#e8453c', '#3b82f6', '#ffffff', '#ffd166'], kind: 'paper', speed: 130, seed: 103, size: 1.3 });
    },
  };

  // ---- ริมหาด
  L.beach = {
    names: { 2: 'กองไฟชายหาด + ไฟระย้า', 3: 'โชว์ควงไฟ + พลุริมทะเล' },
    s2(c) {
      bulbs(c, 300, 780, 520, 20, 14, '#ffd98a');
      c.fillStyle = '#5a3a24';
      for (let k = 0; k < 5; k++) {
        c.save();
        c.translate(540, 1160);
        c.rotate((k / 5) * Math.PI - Math.PI / 2 + 0.3);
        c.fillRect(-40, -6, 80, 12);
        c.restore();
      }
    },
    a2(c, t) {
      bulbsTwinkle(c, 300, 780, 520, 20, 14, t);
      c.save();
      c.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 7; k++) {
        const h = 50 + 40 * Math.abs(Math.sin(t / 120 + k * 1.7));
        const x = 510 + k * 10;
        const g = c.createLinearGradient(x, 1160, x, 1160 - h);
        g.addColorStop(0, 'rgba(255,220,120,.9)');
        g.addColorStop(1, 'rgba(255,80,20,0)');
        c.fillStyle = g;
        c.beginPath();
        c.ellipse(x, 1160 - h / 2, 12, h / 2, 0, 0, TAU);
        c.fill();
      }
      glow(c, 540, 1140, 180, '#ff9f43', 0.35);
      c.restore();
    },
    a3(c, t) {
      fireSpinner(c, t, 380, 1180);
      fireworks(c, t, { x0: 360, x1: 720, y0: 200, y1: 380, n: 3, cols: PARTY, R: 100, ground: 700 });
    },
  };

  // ---- ทุ่งนา
  L.farm = {
    names: { 2: 'ควายเพิ่ม + หุ่นไล่กา + หิ่งห้อย', 3: 'ข้าวสุกเหลืองทอง + ว่าวเต็มฟ้า' },
    s2(c) {
      // ควาย
      c.fillStyle = '#3a3238';
      c.beginPath();
      c.ellipse(420, 820, 60, 30, 0, 0, TAU);
      c.fill();
      c.beginPath();
      c.ellipse(372, 808, 20, 16, 0, 0, TAU);
      c.fill();
      c.fillRect(380, 840, 10, 30);
      c.fillRect(450, 840, 10, 30);
      c.strokeStyle = '#d8d0c6';
      c.lineWidth = 5;
      c.beginPath();
      c.arc(372, 800, 18, Math.PI * 1.1, Math.PI * 1.9);
      c.stroke();
      // หุ่นไล่กา
      c.strokeStyle = '#6b4226';
      c.lineWidth = 6;
      c.beginPath();
      c.moveTo(680, 900);
      c.lineTo(680, 760);
      c.moveTo(640, 790);
      c.lineTo(720, 790);
      c.stroke();
      c.fillStyle = '#e6b84a';
      c.beginPath();
      c.arc(680, 750, 16, 0, TAU);
      c.fill();
      c.fillStyle = '#c0563f';
      c.fillRect(664, 780, 32, 44);
      c.fillStyle = '#a8823e';
      c.beginPath();
      c.ellipse(680, 738, 28, 7, 0, 0, TAU);
      c.fill();
    },
    a2(c, t) {
      fireflies(c, t, { x0: 320, x1: 760, y0: 700, y1: 980, n: 24, seed: 111 });
    },
    s3(c) {
      const g = c.createLinearGradient(0, 860, 0, 1920);
      g.addColorStop(0, 'rgba(255,200,60,.35)');
      g.addColorStop(1, 'rgba(255,180,40,.15)');
      c.fillStyle = g;
      c.fillRect(0, 860, 1080, 1060);
    },
    a3(c, t) {
      kites(c, t, { n: 4, x0: 340, x1: 740, y0: 230, y1: 520, seed: 112 });
    },
  };

  // ---- คาเฟ่ฝนตก
  L.cafe = {
    names: { 2: 'ไฟอุ่น ๆ + แมวในร้าน', 3: 'ฝนหยุด รุ้ง + ดนตรีสด' },
    s2(c) {
      for (const [x, y] of [[400, 470], [540, 500], [680, 470]]) {
        c.strokeStyle = '#2a1f1a';
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(x, 300);
        c.lineTo(x, y - 24);
        c.stroke();
        glow(c, x, y + 10, 130, '#ffcf7a', 0.5);
        c.fillStyle = '#e6b84a';
        c.beginPath();
        c.moveTo(x - 30, y);
        c.lineTo(x + 30, y);
        c.lineTo(x + 14, y - 26);
        c.lineTo(x - 14, y - 26);
        c.closePath();
        c.fill();
        c.fillStyle = '#fff3cf';
        c.beginPath();
        c.arc(x, y + 4, 7, 0, TAU);
        c.fill();
      }
      // แมวนอน
      c.fillStyle = '#ff9f43';
      c.beginPath();
      c.ellipse(700, 900, 40, 18, 0, 0, TAU);
      c.fill();
      c.beginPath();
      c.arc(668, 890, 15, 0, TAU);
      c.fill();
      c.beginPath();
      c.moveTo(658, 880);
      c.lineTo(662, 866);
      c.lineTo(670, 878);
      c.moveTo(672, 878);
      c.lineTo(680, 866);
      c.lineTo(682, 882);
      c.fill();
      c.strokeStyle = '#ff9f43';
      c.lineWidth = 7;
      c.beginPath();
      c.moveTo(738, 904);
      c.quadraticCurveTo(760, 890, 752, 870);
      c.stroke();
    },
    a2(c, t) {
      c.strokeStyle = 'rgba(255,255,255,.22)';
      c.lineWidth = 3;
      for (const bx of [470, 610]) {
        c.beginPath();
        for (let k = 0; k <= 10; k++) {
          const y = 860 - k * 9;
          const x = bx + Math.sin(t / 500 + k * 0.6) * 6;
          k ? c.lineTo(x, y) : c.moveTo(x, y);
        }
        c.stroke();
      }
    },
    s3(c) {
      rainbow(c, 540, 700, 220, 0.5);
    },
    a3(c, t) {
      const bop = Math.abs(Math.sin(t / 300)) * 4;
      person(c, 420, 830 - bop, 1.9, '#7c5cff');
      c.fillStyle = '#c99a5a';
      c.beginPath();
      c.ellipse(450, 900, 26, 12, -0.5, 0, TAU);
      c.fill();
      c.fillStyle = '#ffd166';
      c.font = '700 34px Kanit, sans-serif';
      for (let k = 0; k < 3; k++) {
        const p = ((t / 1200 + k / 3) % 1);
        c.globalAlpha = 1 - p;
        c.fillText('♪', 470 + k * 26 + Math.sin(p * 6) * 10, 800 - p * 140);
      }
      c.globalAlpha = 1;
    },
  };

  // ---- กีฬาสี
  L.school = {
    names: { 2: 'กองเชียร์เต็มสแตนด์ + ป้ายผ้า', 3: 'ถ้วยรางวัล + พลุกระดาษ' },
    s2(c) {
      crowdRow(c, 300, 780, 690, 18, 1.4, 121, ['#e8453c', '#3b82f6', '#ffd166', '#22c55e']);
      const cols = ['#e8453c', '#3b82f6', '#ffd166', '#22c55e'];
      const names = ['สีแดง', 'สีน้ำเงิน', 'สีเหลือง', 'สีเขียว'];
      cols.forEach((col, i) => {
        c.fillStyle = col;
        c.fillRect(320 + i * 112, 640, 100, 36);
        c.fillStyle = '#ffffff';
        c.font = '700 22px Kanit, sans-serif';
        c.textAlign = 'center';
        c.fillText(names[i], 370 + i * 112, 666);
      });
      c.textAlign = 'left';
    },
    a2(c, t) {
      for (let i = 0; i < 6; i++) {
        const x = 330 + i * 80;
        const y = 560 + Math.sin(t / 700 + i) * 10;
        c.strokeStyle = 'rgba(255,255,255,.6)';
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(x, y + 28);
        c.lineTo(x + Math.sin(t / 900 + i) * 6, y + 70);
        c.stroke();
        c.fillStyle = ['#e8453c', '#3b82f6', '#ffd166', '#22c55e'][i % 4];
        c.beginPath();
        c.ellipse(x, y, 22, 28, 0, 0, TAU);
        c.fill();
      }
    },
    s3(c) {
      trophy(c, 540, 470, 1);
    },
    a3(c, t) {
      fireworks(c, t, { x0: 340, x1: 740, y0: 180, y1: 320, n: 3, cols: ['#e8453c', '#3b82f6', '#ffd166', '#22c55e'], R: 90, ground: 600 });
    },
    f3(c, t) {
      fall(c, t, { n: 50, cols: ['#e8453c', '#3b82f6', '#ffd166', '#22c55e'], kind: 'paper', speed: 140, seed: 122, size: 1.3 });
    },
  };

  // ---- วาเลนไทน์
  L.valentine = {
    names: { 2: 'ไฟหัวใจรอบลาน + ลูกโป่งลอย', 3: 'พลุหัวใจ + ฝนกลีบกุหลาบ' },
    s2(c) {
      bulbs(c, 0, 540, 900, 16, 12, '#ff9fc4');
      bulbs(c, 540, 1080, 900, 16, 12, '#ffd98a');
    },
    a2(c, t) {
      bulbsTwinkle(c, 0, 540, 900, 16, 12, t, '#ff9fc4');
      bulbsTwinkle(c, 540, 1080, 900, 16, 12, t + 400);
      for (let i = 0; i < 8; i++) {
        const r = rng(201 + i);
        const y = 1050 - (((t / 1000) * (40 + r() * 30) + r() * 800) % 800);
        const x = (i % 2 ? 60 + r() * 220 : 800 + r() * 220) + Math.sin(t / 900 + i) * 18;
        c.fillStyle = ['#ff4f8b', '#ffd0de', '#ff8fab'][i % 3];
        c.beginPath();
        c.moveTo(x, y + 20);
        c.bezierCurveTo(x - 30, y, x - 24, y - 24, x - 9, y - 22);
        c.bezierCurveTo(x - 2, y - 21, x, y - 15, x, y - 13);
        c.bezierCurveTo(x, y - 15, x + 2, y - 21, x + 9, y - 22);
        c.bezierCurveTo(x + 24, y - 24, x + 30, y, x, y + 20);
        c.fill();
      }
    },
    a3(c, t) {
      fireworks(c, t, { x0: 360, x1: 720, y0: 380, y1: 560, n: 3, cols: ['#ff4f8b', '#ffd0de', '#ff8fab', '#ffd166'], R: 110, ground: 900 });
    },
    f3(c, t) {
      fall(c, t, { n: 40, cols: ['#ff2d6f', '#ff6f9a', '#c8104a'], kind: 'petal', speed: 90, seed: 211 });
    },
  };
  // ---- บุญบั้งไฟ
  L.rocket = {
    names: { 2: 'ธงทิวกลางทุ่ง + ขบวนเซิ้ง', 3: 'บั้งไฟแสนพุ่งพร้อมกัน + พลุ' },
    s2(c) {
      bunting(c, 0, 1080, 760, 22, 26, ['#e8453c', '#ffd166', '#3b82f6', '#22c55e', '#ff4fa3']);
    },
    a2(c, t) {
      for (let i = 0; i < 7; i++) {
        const x = 260 + i * 90;
        const hop = Math.abs(Math.sin(t / 260 + i)) * 10;
        person(c, x, 1010 - hop, 1.5, ['#e8453c', '#ffd166', '#3b82f6', '#ff4fa3'][i % 4]);
      }
    },
    a3(c, t) {
      for (let k = 0; k < 3; k++) {
        const per = 3600;
        const age = ((t + k * 1200) % per) / per;
        const x0 = 360 + k * 180;
        const y = 900 - age * age * 900;
        c.strokeStyle = 'rgba(255,255,255,.7)';
        c.lineWidth = 18;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(x0, 900);
        c.quadraticCurveTo(x0 + 20, 900 - (900 - y) * 0.5, x0 + Math.sin(age * 3) * 30, y);
        c.stroke();
        glow(c, x0 + Math.sin(age * 3) * 30, y + 30, 46, '#ffb347', 0.8);
      }
      fireworks(c, t, { x0: 360, x1: 720, y0: 360, y1: 520, n: 2, cols: PARTY, R: 100, ground: 900 });
    },
  };
  // ---- วันแม่
  L.mother = {
    names: { 2: 'มาลัยยาวเต็มสวน + ผีเสื้อฝูงใหญ่', 3: 'รุ้งกลางฟ้า + ฝนดอกมะลิ' },
    s2(c) {
      for (const [x0, x1, y, dip] of [[0, 330, 700, 18], [750, 1080, 700, 18]]) {
        wire(c, x0, x1, y, dip, 'rgba(90,130,80,.9)', 3);
        for (let i = 0; i < 12; i++) {
          const [x, yy] = qpt(x0, x1, y, dip, (i + 0.5) / 12);
          c.fillStyle = '#ffffff';
          c.beginPath();
          c.arc(x, yy + 4, 10, 0, TAU);
          c.fill();
          c.fillStyle = '#f4d35e';
          c.beginPath();
          c.arc(x, yy + 4, 3, 0, TAU);
          c.fill();
        }
      }
    },
    a2(c, t) {
      const cols = ['#ffb3c7', '#ffd166', '#a5d8ff', '#ffffff', '#c4b5fd'];
      for (let i = 0; i < 10; i++) {
        const r = rng(301 + i);
        const x = 320 + r() * 440 + Math.sin(t / 800 + i * 2) * 60;
        const y = 520 + r() * 360 + Math.cos(t / 650 + i) * 40;
        const f = Math.abs(Math.sin(t / 90 + i));
        c.fillStyle = cols[i % cols.length];
        c.beginPath();
        c.ellipse(x - 7 * f, y, 9 * f + 2, 7, -0.4, 0, TAU);
        c.ellipse(x + 7 * f, y, 9 * f + 2, 7, 0.4, 0, TAU);
        c.fill();
      }
    },
    s3(c) {
      rainbow(c, 540, 860, 360, 0.45);
    },
    f3(c, t) {
      fall(c, t, { n: 40, cols: ['#ffffff', '#fffbe6'], kind: 'petal', speed: 70, seed: 311, size: 1.1 });
    },
  };
  // ---- ไหว้พระจันทร์
  L.moon = {
    names: { 2: 'โคมแดงเต็มลาน', 3: 'โคมลอยเต็มฟ้า + พลุคืนเพ็ญ' },
    s2(c) {
      lanternRow(c, 0, 320, 690, 20, 4, '#d62f2f');
      lanternRow(c, 760, 1080, 690, 20, 4, '#d62f2f');
      lanternRow(c, 280, 800, 840, 14, 7, '#d62f2f');
    },
    a3(c, t) {
      skyLanterns(c, t, { x0: 300, x1: 780, y0: 150, y1: 860, n: 22, speed: 26, seed: 401, s: 1.1 });
      fireworks(c, t, { x0: 340, x1: 740, y0: 260, y1: 420, n: 2, cols: ['#ffd166', '#ff5a3a', '#ffe9a8'], R: 100, ground: 860 });
    },
  };

  // ศาลท้าวเวสสุวรรณใช้ภาพ 2.5D ที่วาดทับชั้น static ทุกเฟรม
  // วาดขั้นปลดล็อกใน a2/a3 หลังภาพพื้นหลัง เพื่อให้เห็นจริงบน OBS ด้วย
  L.wessuwan = {
    names: { 2: 'วงแสงทอง + กลีบดอกไม้', 3: 'โคมทอง + ฝนกลีบดอกไม้' },
    a2(c, t) {
      c.save();
      const wash = c.createLinearGradient(0, 0, 0, 1920);
      wash.addColorStop(0, 'rgba(255,205,80,.20)');
      wash.addColorStop(.6, 'rgba(255,216,120,.03)');
      wash.addColorStop(1, 'rgba(232,172,44,.13)');
      c.fillStyle = wash;
      c.fillRect(0, 0, 1080, 1920);
      // วงแสงบนพื้นอยู่หลังตัวละคร ไม่ทับป้ายข้อมูล
      for (let i = 0; i < 3; i++) {
        c.strokeStyle = 'rgba(255,225,135,' + (.32 - i * .06) + ')';
        c.lineWidth = 5 - i;
        c.beginPath();
        c.ellipse(540, 1390, 290 + i * 58, 82 + i * 18, 0, 0, TAU);
        c.stroke();
      }
      for (let i = 0; i < 14; i++) {
        const angle = i * TAU / 14 + t / 13000;
        const x = 540 + Math.cos(angle) * 350;
        const y = 1390 + Math.sin(angle) * 102;
        glow(c, x, y, 27, '#ffdc83', .58);
        c.fillStyle = '#fff3ca';
        c.beginPath(); c.arc(x, y, 3.5, 0, TAU); c.fill();
      }
      c.restore();
    },
    f2(c, t) {
      fall(c, t, { n: 26, cols: ['#ffe6a0', '#fff1c7', '#f4b8ba'], kind: 'petal', speed: 48, seed: 521, size: 1.15 });
    },
    a3(c, t) {
      lanternRow(c, 50, 1030, 110, 65, 9, '#d7a540');
      pulseGlow(c, t, 540, 230, 370, '#ffda7b', .24, 1800);
    },
    f3(c, t) {
      fall(c, t, { n: 36, cols: ['#ffe2a1', '#fff6dc', '#edb6bf'], kind: 'petal', speed: 62, seed: 522, size: 1.35 });
    },
  };

  // ธีมที่สร้างเองใช้ชุดของธีมต้นแบบ
  const pick = (id) => L[id] || null;

  window.SceneLevels = {
    themes: L,
    label(id, level) {
      return pick(id)?.names?.[level] || '';
    },
    drawStatic(c, id, level, api) {
      const T = pick(id);
      if (!T) return;
      c.save();
      if (level >= 2) T.s2?.(c, api);
      if (level >= 3) T.s3?.(c, api);
      c.restore();
    },
    drawAnim(c, id, level, t, api) {
      const T = pick(id);
      if (!T) return;
      c.save();
      if (level >= 2) T.a2?.(c, t, api);
      if (level >= 3) T.a3?.(c, t, api);
      c.restore();
    },
    drawFront(c, id, level, t, api) {
      const T = pick(id);
      if (!T) return;
      c.save();
      if (level >= 2) T.f2?.(c, t, api);
      if (level >= 3) T.f3?.(c, t, api);
      c.restore();
    },
  };
})();
