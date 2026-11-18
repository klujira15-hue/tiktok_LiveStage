/* เอฟเฟกต์ของขวัญที่วาดเอง สำหรับธีมภาพสำเร็จรูป (hud.fxSet) — แทนการโปรยไอคอน
 * แต่ละฉากมีชุดของตัวเอง: ubosot (ไหว้พระในโบสถ์) • church (อธิษฐานในโบสถ์) • wessuwan (ศาลท้าวเวสสุวรรณ) • naga (ศาลพญานาค) • ganesha (ศาลพระพิฆเนศ) • trimurti (ศาลพระตรีมูรติ) • caishen (ศาลไฉ่ซิงเอี๊ยะ)
 * ภาพ (ดอกบัว พวงมาลัย ทองคำเปลว เทียน กุหลาบ นกพิราบ ระฆัง …) วาดครั้งเดียวลงแคนวาสเล็ก แล้วใช้ drawImage → ไม่หน่วงเครื่อง
 * ชั้นหลัง (หลังคนดู): แสงที่องค์พระ/หน้าต่างกุหลาบ ลำแสง วงคลื่นเสียง — วาดใน drawBg ผ่าน SceneFX.drawBack
 * ชั้นหน้า (หน้าคนดู): ของที่ลอยไปหาพระ/แท่นบูชา ใช้ระบบอนุภาคของหน้าเวที (api.spawn)
 */
(function () {
  const TAU = Math.PI * 2;
  const now = () => performance.now() / 1000;
  const ease = (k) => (k < 0 ? 0 : k > 1 ? 1 : k * k * (3 - 2 * k));
  const back = []; // { t0, dur, draw(c, k, el) }
  // ชั้นหลังซ้อนกันได้ไม่เกิน 16 ชั้น (ของขวัญใหญ่รัว ๆ → ตัดชั้นเก่าสุดทิ้ง ภาพไม่กระตุก)
  const addBack = (dur, draw) => {
    if (back.length >= 16) back.shift();
    back.push({ t0: now(), dur, draw });
  };

  // ---------------------------------------------------------------- ภาพที่เตรียมไว้
  const cache = new Map();
  function mk(key, w, h, fn) {
    let c = cache.get(key);
    if (c) return c;
    c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    fn(c.getContext('2d'), w, h);
    cache.set(key, c);
    return c;
  }
  const glow = (rgb) =>
    mk('glow' + rgb, 128, 128, (x) => {
      const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, `rgba(${rgb},1)`);
      g.addColorStop(0.35, `rgba(${rgb},.45)`);
      g.addColorStop(1, `rgba(${rgb},0)`);
      x.fillStyle = g;
      x.fillRect(0, 0, 128, 128);
    });
  function petalPath(x, L, W) {
    x.beginPath();
    x.moveTo(0, 0);
    x.quadraticCurveTo(W, -L * 0.55, 0, -L);
    x.quadraticCurveTo(-W, -L * 0.55, 0, 0);
  }
  const lotus = (open) =>
    mk('lotus' + open, 140, 140, (x) => {
      x.translate(70, 96);
      const layers = open ? [[7, 78, 16, 46, '#ffe4ee', '#ff86b0'], [5, 50, 14, 52, '#fff3f7', '#ff6f9f']] : [[3, 22, 13, 46, '#ffe9f1', '#ff7aa8'], [2, 12, 12, 50, '#fff5f8', '#ff5f95']];
      for (const [n, spread, W, L, c0, c1] of layers) {
        for (let i = 0; i < n; i++) {
          x.save();
          x.rotate(((n === 1 ? 0 : -spread + (2 * spread * i) / (n - 1)) * Math.PI) / 180);
          const g = x.createLinearGradient(0, 0, 0, -L);
          g.addColorStop(0, c0);
          g.addColorStop(1, c1);
          x.fillStyle = g;
          petalPath(x, L, W);
          x.fill();
          x.strokeStyle = 'rgba(214,70,120,.55)';
          x.lineWidth = 1.2;
          x.stroke();
          x.restore();
        }
      }
      if (open) {
        x.fillStyle = '#ffd34d';
        x.beginPath();
        x.ellipse(0, -10, 11, 6, 0, 0, TAU);
        x.fill();
      }
      x.fillStyle = '#5fb36a';
      x.beginPath();
      x.ellipse(0, 6, 30, 8, 0, 0, TAU);
      x.fill();
    });
  const garland = () =>
    mk('garland', 120, 170, (x) => {
      const dots = 28;
      for (let i = 0; i < dots; i++) {
        const a = (i / dots) * TAU;
        const px = 60 + Math.cos(a) * 40;
        const py = 58 + Math.sin(a) * 46;
        x.fillStyle = '#ffffff';
        x.beginPath();
        x.arc(px, py, 6, 0, TAU);
        x.fill();
        x.fillStyle = '#d9f0c8';
        x.beginPath();
        x.arc(px, py, 2, 0, TAU);
        x.fill();
      }
      x.fillStyle = '#4f9a57';
      x.beginPath();
      x.ellipse(48, 108, 9, 4, -0.5, 0, TAU);
      x.ellipse(72, 108, 9, 4, 0.5, 0, TAU);
      x.fill();
      for (const [r, col] of [[12, '#c8233c'], [8, '#e8455c'], [4, '#ff8094']]) {
        x.fillStyle = col;
        x.beginPath();
        x.arc(60, 106, r, 0, TAU);
        x.fill();
      }
      x.strokeStyle = '#fff';
      x.lineWidth = 2;
      for (const dx of [-8, 0, 8]) {
        for (let k = 0; k < 4; k++) {
          x.fillStyle = k === 3 ? '#e8455c' : '#ffffff';
          x.beginPath();
          x.arc(60 + dx, 124 + k * 11, k === 3 ? 4 : 3.4, 0, TAU);
          x.fill();
        }
      }
    });
  const goldLeaf = () =>
    mk('gold', 28, 28, (x) => {
      const g = x.createLinearGradient(0, 0, 28, 28);
      g.addColorStop(0, '#fff6c2');
      g.addColorStop(0.45, '#f2c14a');
      g.addColorStop(0.7, '#ffe48a');
      g.addColorStop(1, '#c8902a');
      x.fillStyle = g;
      x.beginPath();
      x.moveTo(3, 5);
      x.lineTo(24, 2);
      x.lineTo(26, 23);
      x.lineTo(5, 26);
      x.closePath();
      x.fill();
    });
  const rose = () =>
    mk('rose', 110, 110, (x) => {
      x.translate(55, 55);
      x.fillStyle = '#5aa55f';
      for (const a of [0.7, 2.4, 4.1]) {
        x.save();
        x.rotate(a);
        x.beginPath();
        x.ellipse(0, 40, 9, 16, 0, 0, TAU);
        x.fill();
        x.restore();
      }
      for (const [n, R, rx, ry, col] of [[6, 22, 18, 22, '#ff9ebd'], [5, 13, 15, 18, '#ff7aa5'], [4, 6, 11, 13, '#f25d8e']]) {
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU + R;
          x.fillStyle = col;
          x.beginPath();
          x.ellipse(Math.cos(a) * R, Math.sin(a) * R, rx, ry, a, 0, TAU);
          x.fill();
          x.strokeStyle = 'rgba(190,40,90,.35)';
          x.lineWidth = 1;
          x.stroke();
        }
      }
      x.strokeStyle = '#c9346c';
      x.lineWidth = 2;
      x.beginPath();
      for (let i = 0; i < 60; i++) {
        const a = i * 0.32;
        const r = 1 + i * 0.13;
        i ? x.lineTo(Math.cos(a) * r, Math.sin(a) * r) : x.moveTo(0, 0);
      }
      x.stroke();
    });
  const petal = (c0, c1) =>
    mk('petal' + c0, 34, 24, (x) => {
      const g = x.createLinearGradient(0, 0, 34, 0);
      g.addColorStop(0, c0);
      g.addColorStop(1, c1);
      x.fillStyle = g;
      x.beginPath();
      x.ellipse(17, 12, 15, 9, 0, 0, TAU);
      x.fill();
    });
  const flower = (col) =>
    mk('flower' + col, 64, 64, (x) => {
      x.translate(32, 32);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU;
        x.fillStyle = col;
        x.beginPath();
        x.ellipse(Math.cos(a) * 13, Math.sin(a) * 13, 12, 9, a, 0, TAU);
        x.fill();
      }
      x.fillStyle = '#ffd96b';
      x.beginPath();
      x.arc(0, 0, 8, 0, TAU);
      x.fill();
      x.fillStyle = 'rgba(255,255,255,.5)';
      x.beginPath();
      x.arc(-3, -3, 3, 0, TAU);
      x.fill();
    });
  const dove = (f) =>
    mk('dove' + f, 130, 100, (x) => {
      x.fillStyle = '#ffffff';
      x.strokeStyle = '#c9d0e2';
      x.lineWidth = 1.6;
      const wing = [
        [[58, 48], [44, 6], [62, 4], [78, 44]],
        [[56, 48], [10, 34], [30, 26], [80, 44]],
        [[58, 50], [36, 92], [56, 90], [78, 50]],
      ][f];
      const tail = () => {
        x.beginPath();
        x.moveTo(40, 52);
        x.lineTo(14, 44);
        x.lineTo(16, 62);
        x.closePath();
        x.fill();
        x.stroke();
      };
      tail();
      if (f !== 2) {
        x.beginPath();
        x.moveTo(...wing[0]);
        x.quadraticCurveTo(...wing[1], ...wing[2]);
        x.lineTo(...wing[3]);
        x.closePath();
        x.fill();
        x.stroke();
      }
      x.beginPath();
      x.ellipse(62, 52, 28, 13, -0.08, 0, TAU);
      x.fill();
      x.stroke();
      x.beginPath();
      x.arc(92, 42, 10, 0, TAU);
      x.fill();
      x.stroke();
      x.fillStyle = '#ffb347';
      x.beginPath();
      x.moveTo(101, 41);
      x.lineTo(110, 44);
      x.lineTo(101, 47);
      x.fill();
      x.fillStyle = '#2b2440';
      x.beginPath();
      x.arc(95, 40, 1.8, 0, TAU);
      x.fill();
      if (f === 2) {
        x.fillStyle = '#ffffff';
        x.beginPath();
        x.moveTo(...wing[0]);
        x.quadraticCurveTo(...wing[1], ...wing[2]);
        x.lineTo(...wing[3]);
        x.closePath();
        x.fill();
        x.stroke();
      }
    });
  const bell = () =>
    mk('bell', 110, 130, (x) => {
      const g = x.createLinearGradient(10, 0, 100, 0);
      g.addColorStop(0, '#b9852a');
      g.addColorStop(0.35, '#ffe08a');
      g.addColorStop(0.6, '#f0b93e');
      g.addColorStop(1, '#a5741f');
      x.fillStyle = g;
      x.beginPath();
      x.moveTo(55, 18);
      x.bezierCurveTo(25, 18, 26, 60, 22, 84);
      x.quadraticCurveTo(16, 100, 8, 106);
      x.lineTo(102, 106);
      x.quadraticCurveTo(94, 100, 88, 84);
      x.bezierCurveTo(84, 60, 85, 18, 55, 18);
      x.fill();
      x.strokeStyle = '#8a5d16';
      x.lineWidth = 3;
      x.beginPath();
      x.arc(55, 12, 8, 0, TAU);
      x.stroke();
      x.fillStyle = '#e7b14a';
      x.fillRect(6, 104, 98, 7);
      x.fillStyle = '#8a5d16';
      x.beginPath();
      x.arc(55, 118, 9, 0, TAU);
      x.fill();
    });
  const orb = (rgb) => glow(rgb);

  // ---------------------------------------------------------------- ตัวช่วย
  const draw = (c, img, x, y, s, rot = 0) => {
    const w = img.width * s;
    const h = img.height * s;
    if (!rot) return c.drawImage(img, x - w / 2, y - h / 2, w, h);
    c.save();
    c.translate(x, y);
    c.rotate(rot);
    c.drawImage(img, -w / 2, -h / 2, w, h);
    c.restore();
  };
  const add = (c, img, x, y, s) => {
    c.globalCompositeOperation = 'lighter';
    draw(c, img, x, y, s);
  };
  // เคลื่อนตามเส้นโค้ง (จุดเริ่ม → จุดควบคุม → ปลายทาง)
  function fly(api, o) {
    const { from, to, dur, delay = 0 } = o;
    const ctrl = o.ctrl || { x: (from.x + to.x) / 2 + api.rand(-160, 160), y: Math.min(from.y, to.y) - api.rand(80, 220) };
    return api.spawn({
      x: from.x, y: from.y, max: delay + dur + (o.hold || 0.25), fadeIn: 0.15, fadeOut: 0.9, ph: Math.random() * 6,
      update(p) {
        const k = ease((p.life - delay) / dur);
        const u = 1 - k;
        p.x = u * u * from.x + 2 * u * k * ctrl.x + k * k * to.x;
        p.y = u * u * from.y + 2 * u * k * ctrl.y + k * k * to.y;
        p.k = k;
        if (o.trail && p.life > delay && Math.random() < 0.5) sparkle(api, p.x + api.rand(-10, 10), p.y + api.rand(-10, 10), o.trail, 0.7);
        if (p.life > delay) o.tick?.(p);
        if (k >= 1 && !p.done) {
          p.done = true;
          o.onArrive?.(p);
        }
      },
      draw(c, p) {
        if (p.life < delay) return;
        o.draw(c, p, p.k || 0);
      },
    });
  }
  function sparkle(api, x, y, rgb, max = 1, size = 1) {
    api.spawn({
      x, y, vx: api.rand(-20, 20), vy: api.rand(-50, -10), max: max * api.rand(0.6, 1.1), fadeIn: 0.05, fadeOut: 0.4,
      draw(c, p, k) {
        add(c, orb(rgb), p.x, p.y, (0.16 + 0.1 * Math.sin(p.life * 20)) * size * (1 - k * 0.5));
      },
    });
  }
  function rain(api, imgs, ms, rate, o = {}) {
    api.emitter(ms, () => {
      if (Math.random() > rate) return;
      const img = imgs[(Math.random() * imgs.length) | 0];
      const s = api.rand(o.s0 || 0.45, o.s1 || 0.8);
      api.spawn({
        x: api.rand(-20, 1100), y: -40, vx: api.rand(-40, 40), vy: api.rand(110, 190), max: 9, fadeIn: 0.3, ph: Math.random() * 6, vr: api.rand(-1.5, 1.5),
        update(p) {
          p.x += Math.sin(p.life * 1.6 + p.ph) * 0.8;
          if (p.y > 1960) p.life = p.max;
        },
        draw(c, p) {
          c.save();
          c.translate(p.x, p.y);
          c.rotate(p.rot);
          c.scale(1, 0.55 + 0.45 * Math.abs(Math.cos(p.life * 2.2 + p.ph)));
          c.drawImage(img, (-img.width * s) / 2, (-img.height * s) / 2, img.width * s, img.height * s);
          c.restore();
        },
      });
    });
  }
  // วงคลื่นแสง/เสียงขยายออก (ชั้นหลัง)
  function rings(cx, cy, rgb, n = 4, dur = 3, maxR = 520) {
    for (let i = 0; i < n; i++) {
      addBack(dur, (c, k) => {
        const kk = k * 1.0 - i * 0.18;
        if (kk <= 0 || kk >= 1) return;
        c.strokeStyle = `rgba(${rgb},${0.55 * (1 - kk)})`;
        c.lineWidth = 10 * (1 - kk) + 2;
        c.beginPath();
        c.arc(cx, cy, 40 + kk * maxR, 0, TAU);
        c.stroke();
      });
    }
  }
  function haloGlow(cx, cy, rgb, r, dur, peak = 0.5) {
    addBack(dur, (c, k) => {
      const a = peak * Math.sin(Math.PI * Math.min(1, k * 1.15));
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = Math.max(0, a);
      c.drawImage(glow(rgb), cx - r, cy - r, r * 2, r * 2);
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'source-over';
    });
  }
  function rays(cx, cy, cols, dur, o = {}) {
    const n = o.n || 12;
    addBack(dur, (c, k, el) => {
      const a = (o.peak || 0.32) * Math.sin(Math.PI * Math.min(1, k * 1.1));
      if (a <= 0) return;
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.translate(cx, cy);
      for (let i = 0; i < n; i++) {
        const base = o.down ? Math.PI / 2 + ((i / (n - 1)) - 0.5) * (o.fan || 1.6) : (i / n) * TAU;
        const ang = base + Math.sin(el * 0.6 + i) * 0.05 + (o.down ? 0 : el * 0.12);
        const L = o.len || 900;
        const w = (o.width || 0.07) * (1 + 0.3 * Math.sin(el * 2 + i * 1.7));
        const g = c.createLinearGradient(0, 0, Math.cos(ang) * L, Math.sin(ang) * L);
        const col = cols[i % cols.length];
        g.addColorStop(0, `rgba(${col},${a})`);
        g.addColorStop(1, `rgba(${col},0)`);
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(0, 0);
        c.arc(0, 0, L, ang - w, ang + w);
        c.closePath();
        c.fill();
      }
      c.restore();
    });
  }
  function candle(api, x, y, ms, onDone) {
    api.spawn({
      x, y, vy: -12, max: ms / 1000, fadeIn: 0.3, fadeOut: 0.85, ph: Math.random() * 6,
      update(p) {
        if (Math.random() < 0.08) {
          api.spawn({
            x: p.x + api.rand(-5, 5), y: p.y - 80, vy: -50, max: 1.6, fadeOut: 0.3, ph: Math.random() * 6,
            draw(c, q, k) {
              c.strokeStyle = `rgba(230,225,240,${0.35 * (1 - k)})`;
              c.lineWidth = 3;
              c.beginPath();
              c.moveTo(q.x, q.y);
              c.quadraticCurveTo(q.x + Math.sin(q.life * 3 + q.ph) * 12, q.y - 14, q.x + Math.sin(q.life * 2 + q.ph) * 6, q.y - 28);
              c.stroke();
            },
          });
        }
        if (p.life >= p.max - 0.05 && !p.done) {
          p.done = true;
          onDone?.(p);
        }
      },
      draw(c, p) {
        c.save();
        c.translate(p.x, p.y);
        c.scale(1.7, 1.7);
        c.translate(-p.x, -p.y);
        drawCandle(c, p);
        c.restore();
      },
    });
    function drawCandle(c, p) {
      {
        const fl = 1 + Math.sin(p.life * 23 + p.ph) * 0.08 + Math.sin(p.life * 37) * 0.05;
        add(c, glow('255,190,90'), p.x, p.y - 38, 0.9 * fl);
        c.globalCompositeOperation = 'source-over';
        const g = c.createLinearGradient(p.x - 9, 0, p.x + 9, 0);
        g.addColorStop(0, '#f1e3cf');
        g.addColorStop(0.5, '#fffaf0');
        g.addColorStop(1, '#e2cfb5');
        c.fillStyle = g;
        c.fillRect(p.x - 9, p.y - 26, 18, 44);
        c.fillStyle = '#fff6e6';
        c.beginPath();
        c.ellipse(p.x, p.y - 26, 9, 3, 0, 0, TAU);
        c.fill();
        c.save();
        c.translate(p.x, p.y - 30);
        c.scale(fl, fl);
        const f = c.createLinearGradient(0, 0, 0, -26);
        f.addColorStop(0, '#ff9a2e');
        f.addColorStop(0.5, '#ffd25a');
        f.addColorStop(1, '#fff6c8');
        c.fillStyle = f;
        c.beginPath();
        c.moveTo(0, 0);
        c.quadraticCurveTo(8, -10, 0, -26);
        c.quadraticCurveTo(-8, -10, 0, 0);
        c.fill();
        c.restore();
      }
    }
  }
  const fansList = (api) => [...(api.fans?.values?.() || [])].filter((f) => f.slot);
  const headOf = (f) => ({ x: f.slot.x, y: f.slot.y - 80 * f.slot.s });

  // ---------------------------------------------------------------- ไหว้พระในโบสถ์
  const BUDDHA = { x: 540, y: 600 };
  const FACE = { x: 540, y: 470 };
  const ALTAR = { x: 540, y: 960 };
  const LOTUS_PETALS = [petal('#fff0f5', '#ff9ec0'), petal('#ffe6ef', '#ff7aa8'), petal('#fff8e6', '#ffd38a')];
  const ubosot = {
    // ถวายดอกบัว: ดอกบัวตูมผลิบานที่คนส่ง แล้วลอยไปวางที่โต๊ะหมู่บูชา
    g1(api, user, n, o) {
      for (let i = 0; i < 1; i++) { // ของขวัญหลายชิ้น: หน้าเวทีเรียกซ้ำให้เองตามจำนวน (runEffect)
        fly(api, {
          from: { x: o.x + api.rand(-30, 30), y: o.y - 60 }, to: { x: ALTAR.x + api.rand(-160, 160), y: ALTAR.y + api.rand(-10, 20) }, dur: 1.8, delay: 0.55 + i * 0.25, trail: '255,200,120',
          draw(c, p, k) {
            const bloom = Math.min(1, p.life / 0.55);
            const s = (0.6 + 0.65 * bloom) * (1 - k * 0.3);
            add(c, glow('255,170,200'), p.x, p.y, 1.5 * s);
            c.globalCompositeOperation = 'source-over';
            const a0 = c.globalAlpha;
            c.globalAlpha = a0 * (1 - bloom);
            draw(c, lotus(false), p.x, p.y, s);
            c.globalAlpha = a0 * bloom;
            draw(c, lotus(true), p.x, p.y, s, Math.sin(p.life * 2) * 0.08);
          },
          onArrive: (p) => haloGlow(p.x, p.y, '255,190,120', 120, 1.2, 0.6),
        });
      }
      api.sfx.chime(880);
    },
    // จุดเทียนบูชา: เทียนติดไฟหน้าคนส่ง ควันลอย แล้วดวงไฟลอยขึ้นไปหาองค์พระ
    g2(api, user, n, o) {
      candle(api, o.x, o.y - 20, 3800, (p) => {
        fly(api, {
          from: { x: p.x, y: p.y - 50 }, to: FACE, dur: 1.6, trail: '255,210,120',
          draw(c, q, k) {
            add(c, glow('255,200,110'), q.x, q.y, 0.9 + 0.3 * Math.sin(q.life * 9));
          },
          onArrive: () => haloGlow(FACE.x, FACE.y, '255,200,110', 200, 1.4, 0.4),
        });
      });
      api.sfx.chime(660);
    },
    // ถวายพวงมาลัย: พวงมาลัยมะลิแกว่งลอยขึ้นไปคล้องที่ตักพระ ดอกมะลิร่วงตาม
    g3(api, user, n, o) {
      fly(api, {
        from: { x: o.x, y: o.y - 70 }, to: { x: BUDDHA.x, y: BUDDHA.y + 90 }, dur: 2.2, delay: 0.1, hold: 0.6, trail: '255,255,235',
        draw(c, p, k) {
          add(c, glow('255,250,215'), p.x, p.y, 1.6 - k * 0.4);
          c.globalCompositeOperation = 'source-over';
          draw(c, garland(), p.x, p.y, 1.15 - k * 0.3, Math.sin(p.life * 3) * 0.18);
        },
        onArrive: (p) => {
          haloGlow(p.x, p.y, '255,250,220', 160, 1.4, 0.55);
          for (let i = 0; i < 10; i++) sparkle(api, p.x + api.rand(-60, 60), p.y + api.rand(-40, 40), '255,255,240', 1.2);
        },
      });
      api.sfx.chime(784);
    },
    // ปิดทองพระ: แผ่นทองคำเปลวพลิ้วลอยไปติดองค์พระ แล้วองค์พระเปล่งแสงทอง
    g4(api, user, n, o) {
      api.spot(user, { rgb: '255,230,160', fallback: { x: 540, y: 1500 } });
      for (let i = 0; i < 24; i++) {
        fly(api, {
          from: { x: o.x + api.rand(-40, 40), y: o.y - 60 }, to: { x: BUDDHA.x + api.rand(-130, 130), y: BUDDHA.y + api.rand(-170, 170) }, dur: api.rand(1.6, 2.4), delay: i * 0.06,
          draw(c, p) {
            c.save();
            c.translate(p.x, p.y);
            c.rotate(p.life * 3 + p.ph);
            c.scale(Math.cos(p.life * 7 + p.ph), 1);
            c.drawImage(goldLeaf(), -20, -20, 40, 40);
            c.restore();
          },
          tick: (p) => Math.random() < 0.15 && sparkle(api, p.x, p.y, '255,220,120', 0.6, 0.7),
        });
      }
      setTimeout(() => {
        haloGlow(BUDDHA.x, BUDDHA.y - 40, '255,205,90', 330, 2.6, 0.55);
        rays(FACE.x, FACE.y, ['255,215,120'], 2.6, { n: 14, len: 520, peak: 0.22 });
      }, 1700);
      api.sfx.chime(660);
    },
    // สวดมนต์พร้อมกัน: ทุกคนมีแสงบุญ ดวงไฟทองลอยจากทุกคนขึ้นไปรวมที่องค์พระ คลื่นแสงแผ่ออก
    g5(api) {
      api.crowdWave('happy');
      const list = fansList(api).slice(0, 40);
      list.forEach((f, i) => {
        const h = headOf(f);
        fly(api, {
          from: h, to: { x: FACE.x + api.rand(-40, 40), y: FACE.y + api.rand(-30, 60) }, dur: 2, delay: 0.3 + (i % 10) * 0.08,
          draw(c, p) {
            add(c, glow('255,215,130'), p.x, p.y, 0.5);
          },
        });
      });
      setTimeout(() => {
        haloGlow(FACE.x, FACE.y + 60, '255,205,100', 360, 3, 0.5);
        rings(FACE.x, FACE.y + 40, '255,220,140', 4, 3.2, 600);
      }, 1800);
      api.sfx.chime(523);
    },
    // ตีระฆังรับบุญ: ระฆังทองแกว่งเหนือแท่นบูชา คลื่นเสียงทองแผ่ไปทั้งโบสถ์
    g6(api) {
      // ระฆังทอง 2 ใบ แขวนที่เสาซ้าย-ขวา (กลางบนโดนแผงพลังคนดูบัง)
      for (const [bx, by, ph] of [[150, 760, 0], [930, 960, 1.3]]) {
        api.spawn({
          x: bx, y: by, max: 3.4, fadeIn: 0.2, fadeOut: 0.8,
          draw(c, p) {
            c.save();
            c.translate(p.x, p.y - 90);
            c.rotate(Math.sin(p.life * 6 + ph) * 0.35 * Math.exp(-p.life * 0.5));
            add(c, glow('255,210,110'), 0, 100, 2.2);
            c.globalCompositeOperation = 'source-over';
            c.drawImage(bell(), -80, 0, 160, 190);
            c.restore();
          },
        });
        for (let i = 0; i < 3; i++) setTimeout(() => rings(bx, by, '255,215,120', 2, 2.2, 650), i * 700);
      }
      [784, 659, 523].forEach((f, i) => setTimeout(() => api.sfx.chime(f), i * 700));
    },
    // บัวบานทั่วโบสถ์: ดอกบัวผุดบานทั่วพื้นโบสถ์ กลีบบัวโปรยปราย
    g7(api) {
      for (let i = 0; i < 12; i++) {
        const x = api.rand(90, 990);
        const y = api.rand(1250, 1850);
        api.spawn({
          x, y, vy: -16, max: 4.2, fadeIn: 0.2, fadeOut: 0.75, delay: i * 0.12, ph: Math.random() * 6,
          draw(c, p) {
            const t = p.life - i * 0.12;
            if (t <= 0) return;
            const bloom = Math.min(1, t / 0.8);
            add(c, glow('255,160,200'), p.x, p.y, 1.4 * bloom);
            c.globalCompositeOperation = 'source-over';
            draw(c, lotus(bloom > 0.5), p.x, p.y, 0.45 + 0.6 * bloom, Math.sin(p.life * 1.5 + p.ph) * 0.06);
          },
        });
      }
      rain(api, LOTUS_PETALS, 3500, 0.55, { s0: 0.6, s1: 1 });
      api.sfx.chime(988);
    },
    // แสงบุญส่องโบสถ์: ฉัพพรรณรังสีแผ่จากพระพักตร์ ประกายทองลอยทั่วโบสถ์
    g8(api) {
      haloGlow(FACE.x, FACE.y, '255,215,140', 300, 4.5, 0.55);
      rays(FACE.x, FACE.y, ['255,214,120', '255,170,190', '170,210,255', '255,245,200', '255,190,120'], 4.5, { n: 18, len: 1100, peak: 0.26, width: 0.06 });
      api.emitter(4000, () => Math.random() < 0.5 && sparkle(api, api.rand(40, 1040), api.rand(300, 1300), '255,225,150', 1.6, 1.2));
      api.sfx.chime(698);
    },
    // ทำบุญใหญ่: ทุกอย่างรวมกัน + ข้อความ "สาธุ!"
    g9(api, user, n, o, label) {
      window.PicScene?.kick();
      api.bigShow(user, label);
      api.crowdWave('happy');
      haloGlow(BUDDHA.x, BUDDHA.y - 40, '255,205,100', 420, 6, 0.6);
      rays(FACE.x, FACE.y, ['255,214,120', '255,170,190', '170,210,255', '255,245,200', '255,190,120'], 6, { n: 20, len: 1300, peak: 0.3, width: 0.06 });
      rings(FACE.x, FACE.y + 40, '255,220,140', 5, 4, 700);
      rain(api, [...LOTUS_PETALS, lotus(true)], 5000, 0.6, { s0: 0.45, s1: 0.9 });
      api.sfx.chime(523);
    },
  };

  // ---------------------------------------------------------------- อธิษฐานในโบสถ์
  const WINDOW = { x: 540, y: 560 };
  const ALTAR2 = { x: 540, y: 1210 };
  const PASTEL = ['#ffc7dc', '#cfe3ff', '#fff0b8', '#d9f5e4', '#e6d6ff', '#ffd9c2'];
  const ROSE_PETALS = [petal('#ffe0ea', '#ff9fbf'), petal('#fff0f5', '#ffb8d0'), petal('#f3e8ff', '#d6b8ff')];
  const RAINBOW = ['255,170,200', '255,210,150', '255,245,170', '180,240,200', '170,210,255', '210,180,255'];
  function doves(api, count, dir = Math.random() < 0.5 ? 1 : -1) {
    for (let i = 0; i < count; i++) {
      const y0 = api.rand(900, 1500);
      const sp = api.rand(260, 360);
      const s = api.rand(0.95, 1.35);
      api.spawn({
        x: dir > 0 ? -80 - i * 70 : 1160 + i * 70, y: y0, vx: dir * sp, vy: -api.rand(90, 160), max: 5.5, fadeIn: 0.1, ph: Math.random() * 6,
        update(p) {
          p.y += Math.sin(p.life * 3 + p.ph) * 0.8;
          if (Math.random() < 0.04) {
            api.spawn({
              x: p.x, y: p.y + 10, vx: api.rand(-20, 20), vy: 40, max: 2.4, vr: api.rand(-2, 2), fadeOut: 0.5,
              draw(c, q) {
                c.save();
                c.translate(q.x + Math.sin(q.life * 3) * 8, q.y);
                c.rotate(q.rot);
                c.fillStyle = 'rgba(255,255,255,.9)';
                c.beginPath();
                c.ellipse(0, 0, 3, 9, 0, 0, TAU);
                c.fill();
                c.restore();
              },
            });
          }
        },
        draw(c, p) {
          const f = [0, 1, 2, 1][((p.life * 9 + p.ph) | 0) % 4];
          c.save();
          c.translate(p.x, p.y);
          c.scale(dir * s, s);
          c.drawImage(dove(f), -65, -50);
          c.restore();
        },
      });
    }
  }
  const church = {
    // ถวายดอกกุหลาบ: กุหลาบลอยขึ้นจากคนส่งไปวางที่แท่นบูชา กลีบกุหลาบปลิวตาม
    g1(api, user, n, o) {
      for (let i = 0; i < 1; i++) { // ของขวัญหลายชิ้น: หน้าเวทีเรียกซ้ำให้เองตามจำนวน (runEffect)
        fly(api, {
          from: { x: o.x + api.rand(-30, 30), y: o.y - 60 }, to: { x: ALTAR2.x + api.rand(-170, 170), y: ALTAR2.y + api.rand(-20, 10) }, dur: 1.9, delay: 0.2 + i * 0.25,
          draw(c, p, k) {
            add(c, glow('255,180,210'), p.x, p.y, 1.5);
            c.globalCompositeOperation = 'source-over';
            draw(c, rose(), p.x, p.y, 1.2 - k * 0.35, p.life * 0.8);
          },
          tick(p) {
            if (Math.random() > 0.25) return;
            const img = ROSE_PETALS[(Math.random() * 3) | 0];
            api.spawn({
              x: p.x, y: p.y, vx: api.rand(-60, 60), vy: api.rand(20, 80), g: 40, max: 1.8, vr: api.rand(-3, 3), fadeOut: 0.4,
              draw: (cc, q) => draw(cc, img, q.x, q.y, 0.9, q.rot),
            });
          },
          onArrive: (p) => haloGlow(p.x, p.y, '255,190,215', 120, 1.2, 0.5),
        });
      }
      api.sfx.chime(880);
    },
    // จุดเทียนอธิษฐาน: เทียนสว่างนวล แล้วดวงไฟลอยขึ้นไปที่หน้าต่างกุหลาบ
    g2(api, user, n, o) {
      candle(api, o.x, o.y - 20, 3800, (p) => {
        fly(api, {
          from: { x: p.x, y: p.y - 50 }, to: { x: WINDOW.x + api.rand(-120, 120), y: WINDOW.y + api.rand(-120, 120) }, dur: 1.8, trail: '255,235,200',
          draw(c, q) {
            add(c, glow('255,235,190'), q.x, q.y, 0.85 + 0.25 * Math.sin(q.life * 9));
          },
          onArrive: (q) => haloGlow(q.x, q.y, '255,240,210', 160, 1.4, 0.4),
        });
      });
      api.sfx.chime(660);
    },
    // ช่อดอกไม้: ดอกไม้พาสเทลบานกระจายรอบคนส่ง ลอยพลิ้วลงช้า ๆ
    g3(api, user, n, o) {
      for (let i = 0; i < 16; i++) {
        const img = flower(PASTEL[i % PASTEL.length]);
        const a = (i / 16) * TAU;
        const sp = api.rand(160, 300);
        api.spawn({
          x: o.x, y: o.y - 70, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 160, g: 160, drag: 1.6, max: 2.6, vr: api.rand(-3, 3), fadeOut: 0.6,
          draw: (c, p, k) => draw(c, img, p.x, p.y, 0.8 + 0.4 * Math.sin(Math.min(1, p.life * 3) * 1.57), p.rot),
        });
      }
      haloGlow(o.x, o.y - 70, '255,220,235', 140, 1.2, 0.5);
      api.sfx.chime(988);
    },
    // แสงพรส่องคุณ: ลำแสงนุ่ม ๆ ส่องลงมาจากเพดานที่คนส่ง ประกายร่วงในลำแสง
    g4(api, user, n, o) {
      api.spot(user, { rgb: '255,245,220', fallback: { x: 540, y: 1500 } });
      const x = o.x;
      const y = o.y;
      api.spawn({
        x, y, max: 3, fadeIn: 0.4, fadeOut: 0.6,
        draw(c, p) {
          c.globalCompositeOperation = 'lighter';
          const g = c.createLinearGradient(0, 0, 0, y);
          g.addColorStop(0, 'rgba(255,250,230,0)');
          g.addColorStop(0.6, 'rgba(255,245,220,.34)');
          g.addColorStop(1, 'rgba(255,240,210,.6)');
          c.fillStyle = g;
          c.beginPath();
          c.moveTo(x - 30, 0);
          c.lineTo(x + 30, 0);
          c.lineTo(x + 90, y);
          c.lineTo(x - 90, y);
          c.closePath();
          c.fill();
        },
        update: () => Math.random() < 0.5 && sparkle(api, x + api.rand(-60, 60), api.rand(200, y), '255,250,230', 1.2),
      });
      api.sfx.chime(784);
    },
    // อธิษฐานพร้อมกัน: ดวงไฟจากทุกคนลอยขึ้นไปรวมที่หน้าต่างกุหลาบ หน้าต่างเรืองแสง
    g5(api) {
      api.crowdWave('happy');
      fansList(api).slice(0, 40).forEach((f, i) => {
        fly(api, {
          from: headOf(f), to: { x: WINDOW.x + api.rand(-200, 200), y: WINDOW.y + api.rand(-200, 200) }, dur: 2.2, delay: 0.3 + (i % 10) * 0.08,
          draw: (c, p) => add(c, glow(RAINBOW[i % RAINBOW.length]), p.x, p.y, 0.5),
        });
      });
      setTimeout(() => {
        haloGlow(WINDOW.x, WINDOW.y, '255,235,250', 380, 3, 0.45);
        rings(WINDOW.x, WINDOW.y, '230,215,255', 4, 3, 600);
      }, 2000);
      api.sfx.chime(523);
    },
    // ระฆังโบสถ์ดัง: ระฆังแกว่งหน้าหน้าต่างกุหลาบ คลื่นเสียงแผ่ทั่วโบสถ์
    g6(api) {
      const bx = WINDOW.x;
      const by = WINDOW.y;
      api.spawn({
        x: bx, y: by, max: 3.2, fadeIn: 0.2, fadeOut: 0.8,
        draw(c, p) {
          c.save();
          c.translate(p.x, p.y - 95);
          c.rotate(Math.sin(p.life * 6) * 0.35 * Math.exp(-p.life * 0.5));
          add(c, glow('255,235,190'), 0, 100, 2.3);
          c.globalCompositeOperation = 'source-over';
          c.drawImage(bell(), -80, 0, 160, 190);
          c.restore();
        },
      });
      for (let i = 0; i < 3; i++) setTimeout(() => rings(bx, by, '240,225,255', 2, 2.2, 700), i * 700);
      [784, 659, 523].forEach((f, i) => setTimeout(() => api.sfx.chime(f), i * 700));
    },
    // นกพิราบบินทั่วโบสถ์: ฝูงนกพิราบขาวกระพือปีกบินผ่าน ขนนกร่วงเบา ๆ
    g7(api) {
      doves(api, 7);
      api.sfx.whoosh?.();
    },
    // แสงหน้าต่างสีรุ้ง: ลำแสงสีรุ้งส่องจากหน้าต่างกุหลาบลงมาถึงพื้น
    g8(api) {
      haloGlow(WINDOW.x, WINDOW.y, '255,240,255', 330, 4.5, 0.45);
      rays(WINDOW.x, WINDOW.y, RAINBOW, 4.5, { n: 12, down: true, fan: 1.4, len: 1500, peak: 0.2, width: 0.05 });
      api.emitter(4000, () => Math.random() < 0.45 && sparkle(api, api.rand(150, 930), api.rand(700, 1700), RAINBOW[(Math.random() * 6) | 0], 1.5));
      api.sfx.chime(698);
    },
    // พรอันยิ่งใหญ่: หน้าต่างเรืองแสง ลำแสงสีรุ้ง นกพิราบ กลีบกุหลาบ + "อาเมน!"
    g9(api, user, n, o, label) {
      window.PicScene?.kick();
      api.bigShow(user, label);
      api.crowdWave('happy');
      haloGlow(WINDOW.x, WINDOW.y, '255,240,255', 430, 6, 0.55);
      rays(WINDOW.x, WINDOW.y, RAINBOW, 6, { n: 14, down: true, fan: 1.6, len: 1600, peak: 0.24, width: 0.05 });
      doves(api, 6, 1);
      setTimeout(() => doves(api, 5, -1), 1500);
      rain(api, ROSE_PETALS, 5000, 0.55, { s0: 0.6, s1: 1 });
      api.sfx.chime(523);
    },
  };

  // ---------------------------------------------------------------- มัสยิด (ละหมาด)
  // ไม่มีเสียงระฆัง/ดนตรี — ใช้แสง โคมไฟ จันทร์เสี้ยว ลวดลายเรขาคณิต
  const Z = (x, y) => ({ x: 540 + (x - 540) * 1.06, y: 960 + (y - 960) * 1.06 }); // ภาพซูม 1.06 (pic-scene)
  const LANTERNS = [[419, 277], [653, 277], [542, 481], [225, 447], [857, 447], [440, 549], [637, 549], [339, 621], [742, 621], [46, 868], [1034, 868]].map(([x, y]) => Z(x, y));
  const MIHRAB = Z(540, 880);
  const NICHE = Z(540, 820);
  const WIN = Z(540, 631);
  const lantern = () =>
    mk('lantern', 90, 160, (x) => {
      x.strokeStyle = '#a9792c';
      x.lineWidth = 2;
      x.beginPath();
      x.moveTo(45, 0);
      x.lineTo(45, 22);
      x.stroke();
      const gold = x.createLinearGradient(15, 0, 75, 0);
      gold.addColorStop(0, '#9c6b22');
      gold.addColorStop(0.5, '#ffe08a');
      gold.addColorStop(1, '#9c6b22');
      x.fillStyle = gold;
      x.beginPath();
      x.moveTo(45, 20);
      x.quadraticCurveTo(22, 30, 20, 44);
      x.lineTo(70, 44);
      x.quadraticCurveTo(68, 30, 45, 20);
      x.fill();
      const core = x.createRadialGradient(45, 82, 4, 45, 82, 36);
      core.addColorStop(0, '#fffbe0');
      core.addColorStop(0.5, '#ffd56a');
      core.addColorStop(1, '#f0a83a');
      x.fillStyle = core;
      x.beginPath();
      x.moveTo(22, 46);
      x.lineTo(68, 46);
      x.quadraticCurveTo(78, 84, 60, 118);
      x.lineTo(30, 118);
      x.quadraticCurveTo(12, 84, 22, 46);
      x.fill();
      x.strokeStyle = '#b07e2e';
      x.lineWidth = 2;
      x.stroke();
      x.lineWidth = 1.4;
      for (let k = -3; k <= 3; k++) {
        x.beginPath();
        x.moveTo(45 + k * 9, 48);
        x.lineTo(45 - k * 9, 116);
        x.stroke();
      }
      x.fillStyle = gold;
      x.fillRect(26, 116, 38, 7);
      x.beginPath();
      x.moveTo(36, 123);
      x.lineTo(54, 123);
      x.lineTo(45, 150);
      x.fill();
    });
  const dateFruit = () =>
    mk('date', 40, 26, (x) => {
      const g = x.createLinearGradient(0, 0, 0, 26);
      g.addColorStop(0, '#c0702f');
      g.addColorStop(1, '#5e2a12');
      x.fillStyle = g;
      x.beginPath();
      x.ellipse(20, 13, 17, 10, 0, 0, TAU);
      x.fill();
      x.fillStyle = 'rgba(255,230,190,.55)';
      x.beginPath();
      x.ellipse(15, 8, 6, 2.6, -0.3, 0, TAU);
      x.fill();
    });
  const crescent = () =>
    mk('crescent', 160, 160, (x) => {
      const g = x.createLinearGradient(20, 20, 140, 140);
      g.addColorStop(0, '#fff3b8');
      g.addColorStop(0.6, '#f2c14a');
      g.addColorStop(1, '#d99a2a');
      x.fillStyle = g;
      x.beginPath();
      x.arc(78, 80, 58, 0, TAU);
      x.fill();
      x.globalCompositeOperation = 'destination-out';
      x.beginPath();
      x.arc(102, 66, 52, 0, TAU);
      x.fill();
      x.globalCompositeOperation = 'source-over';
      x.fillStyle = '#ffe9a0';
      x.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const r = i % 2 ? 7 : 17;
        x.lineTo(124 + Math.cos(a) * r, 92 + Math.sin(a) * r);
      }
      x.closePath();
      x.fill();
    });
  const twinkle = () =>
    mk('twinkle', 64, 64, (x) => {
      const g = x.createRadialGradient(32, 32, 0, 32, 32, 30);
      g.addColorStop(0, 'rgba(255,250,220,1)');
      g.addColorStop(1, 'rgba(255,230,150,0)');
      x.fillStyle = g;
      x.beginPath();
      x.moveTo(32, 0);
      x.quadraticCurveTo(35, 29, 64, 32);
      x.quadraticCurveTo(35, 35, 32, 64);
      x.quadraticCurveTo(29, 35, 0, 32);
      x.quadraticCurveTo(29, 29, 32, 0);
      x.fill();
    });
  function stars(api, n, ms, y0 = 160, y1 = 900) {
    for (let i = 0; i < n; i++) {
      const x = api.rand(40, 1040);
      const y = api.rand(y0, y1);
      const d = api.rand(0, 1.2);
      addBack(ms / 1000, (c, k, el) => {
        if (el < d) return;
        const tw = 0.5 + 0.5 * Math.sin((el - d) * 5 + i);
        const a = Math.min(1, (el - d) * 2) * (1 - Math.max(0, (k - 0.75) / 0.25));
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = a * (0.4 + 0.6 * tw);
        const s = 22 + 18 * tw;
        c.drawImage(twinkle(), x - s / 2, y - s / 2, s, s);
      });
    }
  }
  // ลวดลายเรขาคณิตอิสลาม: ดาว 8 แฉก (สี่เหลี่ยมซ้อน 2 ชั้น) หลายวง หมุนสวนกัน
  function mandala(cx, cy, dur, maxR = 420, peak = 0.75) {
    addBack(dur, (c, k, el) => {
      const a = peak * Math.sin(Math.PI * Math.min(1, k * 1.05));
      if (a <= 0) return;
      c.save();
      c.translate(cx, cy);
      c.globalCompositeOperation = 'lighter';
      const grow = ease(Math.min(1, el / 1.2));
      [0.3, 0.52, 0.76, 1].forEach((f, ri) => {
        const r = maxR * f * grow;
        const rot = el * (ri % 2 ? -0.25 : 0.2) + ri * 0.2;
        c.strokeStyle = `rgba(255,${210 + ri * 8},${120 + ri * 20},${a * (0.9 - ri * 0.12)})`;
        c.lineWidth = 3.2 - ri * 0.4;
        for (const off of [0, Math.PI / 4]) {
          c.beginPath();
          for (let i = 0; i <= 4; i++) {
            const ang = rot + off + (i * Math.PI) / 2;
            if (i) c.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
            else c.moveTo(Math.cos(ang) * r, Math.sin(ang) * r);
          }
          c.stroke();
        }
        c.beginPath();
        c.arc(0, 0, r * 0.71, 0, TAU);
        c.stroke();
        c.globalAlpha = a;
        for (let i = 0; i < 16; i++) {
          const ang = rot + (i * Math.PI) / 8;
          c.drawImage(glow('255,225,150'), Math.cos(ang) * r - 7, Math.sin(ang) * r - 7, 14, 14);
        }
        c.globalAlpha = 1;
      });
      c.restore();
    });
  }
  const lanternsGlow = (dur, peak = 0.7, stagger = 0.12) =>
    LANTERNS.forEach((l, i) => setTimeout(() => { haloGlow(l.x, l.y, '255,205,110', 170, dur, peak); rings(l.x, l.y, '255,215,130', 1, 1.6, 120); }, i * stagger * 1000));
  const mosque = {
    // ลอยโคมไฟแห่งความสงบ: โคมทองลอยจากคนส่งขึ้นไปรวมกับโคมบนโดม
    g1(api, user, n, o) {
      const l = LANTERNS[(Math.random() * 9) | 0];
      fly(api, {
        from: { x: o.x, y: o.y - 80 }, to: { x: l.x + api.rand(-50, 50), y: l.y + api.rand(30, 80) }, dur: 2.4, delay: 0.2, hold: 0.5, trail: '255,215,130',
        draw(c, p, k) {
          add(c, glow('255,200,110'), p.x, p.y + 10, 1.6 - k * 0.5);
          c.globalCompositeOperation = 'source-over';
          draw(c, lantern(), p.x, p.y, 0.95 - k * 0.4, Math.sin(p.life * 2.4) * 0.08);
        },
        onArrive: (p) => haloGlow(p.x, p.y, '255,205,110', 130, 1.6, 0.7),
      });
      api.sfx.whoosh?.();
    },
    // แบ่งปันอินทผลัม: อินทผลัมลอยจากคนส่งไปหาพี่น้องที่นั่งใกล้ ๆ คนละผล
    g2(api, user, n, o) {
      const near = fansList(api)
        .filter((f) => f.data?.id !== user?.id)
        .map((f) => ({ f, d: Math.hypot(f.slot.x - o.x, f.slot.y - o.y) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 6);
      near.forEach(({ f }, i) => {
        const h = headOf(f);
        fly(api, {
          from: { x: o.x, y: o.y - 70 }, to: h, dur: 1.1, delay: i * 0.15, trail: '255,220,160',
          draw: (c, p) => draw(c, dateFruit(), p.x, p.y, 1.9, p.life * 4),
          onArrive: () => {
            api.bump(f.data.id, 'happy', 1600);
            for (let k = 0; k < 6; k++) sparkle(api, h.x + api.rand(-24, 24), h.y + api.rand(-20, 10), '255,220,150', 1);
          },
        });
      });
      if (!near.length) haloGlow(o.x, o.y - 70, '255,220,150', 120, 1.2, 0.6);
    },
    // ลูกประคำเรืองแสง (ตัสบีห์ 33 เม็ด): เม็ดประคำค่อย ๆ สว่างเป็นวงรอบคนส่ง แล้วลอยขึ้นสู่หน้าต่าง
    g3(api, user, n, o) {
      const cx = o.x;
      const cy = Math.max(300, o.y - 150);
      api.spawn({
        x: cx, y: cy, max: 3, fadeIn: 0.1, fadeOut: 0.8,
        draw(c, p) {
          c.globalCompositeOperation = 'lighter';
          const lit = Math.min(33, Math.floor(p.life / 0.05));
          for (let i = 0; i < 33; i++) {
            const a = -Math.PI / 2 + (i / 33) * TAU + p.life * 0.6;
            const bx = cx + Math.cos(a) * 92;
            const by = cy + Math.sin(a) * 92 * 0.62;
            const on = i < lit;
            const s = on ? 40 : 18;
            c.drawImage(glow(on ? '255,215,120' : '210,200,180'), bx - s / 2, by - s / 2, s, s);
            c.globalCompositeOperation = 'source-over';
            c.fillStyle = on ? '#d9a63a' : '#a68a5c';
            c.beginPath();
            c.arc(bx, by, on ? 6.5 : 5, 0, TAU);
            c.fill();
            c.fillStyle = 'rgba(255,255,240,.8)';
            c.beginPath();
            c.arc(bx - 2, by - 2, 2, 0, TAU);
            c.fill();
            c.globalCompositeOperation = 'lighter';
          }
        },
        update(p) {
          if (p.life > 2.2 && !p.done) {
            p.done = true;
            for (let i = 0; i < 8; i++) {
              const a = (i / 8) * TAU;
              fly(api, { from: { x: cx + Math.cos(a) * 92, y: cy + Math.sin(a) * 57 }, to: { x: WIN.x + api.rand(-40, 40), y: WIN.y + api.rand(-30, 30) }, dur: 1.5, delay: i * 0.05, draw: (c, q) => add(c, glow('255,225,150'), q.x, q.y, 0.45) });
            }
            setTimeout(() => haloGlow(WIN.x, WIN.y, '255,235,190', 150, 1.4, 0.6), 1500);
          }
        },
      });
    },
    // แสงนูรส่องคุณ: ลำแสงจากหน้าต่างเหนือมิห์รอบส่องลงมาที่คนส่ง
    g4(api, user, n, o) {
      api.spot(user, { rgb: '255,245,215', fallback: { x: 540, y: 1500 } });
      const { x, y } = o;
      api.spawn({
        x, y, max: 3.2, fadeIn: 0.4, fadeOut: 0.6,
        draw(c) {
          c.globalCompositeOperation = 'lighter';
          const g = c.createLinearGradient(WIN.x, WIN.y, x, y);
          g.addColorStop(0, 'rgba(255,250,225,.55)');
          g.addColorStop(1, 'rgba(255,240,200,.3)');
          c.fillStyle = g;
          c.beginPath();
          c.moveTo(WIN.x - 26, WIN.y);
          c.lineTo(WIN.x + 26, WIN.y);
          c.lineTo(x + 95, y);
          c.lineTo(x - 95, y);
          c.closePath();
          c.fill();
        },
        update: () => Math.random() < 0.5 && sparkle(api, WIN.x + (x - WIN.x) * Math.random() + api.rand(-40, 40), WIN.y + (y - WIN.y) * Math.random(), '255,245,215', 1.2),
      });
      haloGlow(WIN.x, WIN.y, '255,240,200', 140, 3, 0.6);
    },
    // ขอดุอาอ์พร้อมกัน: แสงจากทุกคนลอยไปรวมที่มิห์รอบ มิห์รอบเรืองแสงพร้อมลวดลายเรขาคณิต
    g5(api) {
      api.crowdWave('happy');
      fansList(api).slice(0, 40).forEach((f, i) => {
        fly(api, {
          from: headOf(f), to: { x: NICHE.x + api.rand(-60, 60), y: NICHE.y + api.rand(-40, 60) }, dur: 2, delay: 0.3 + (i % 10) * 0.08,
          draw: (c, p) => add(c, glow('255,225,150'), p.x, p.y, 0.5),
        });
      });
      setTimeout(() => {
        haloGlow(NICHE.x, NICHE.y, '255,215,140', 260, 3, 0.55);
        mandala(MIHRAB.x, MIHRAB.y - 40, 3.2, 300, 0.6);
      }, 1900);
    },
    // จันทร์เสี้ยวและดวงดาว: จันทร์เสี้ยวทองลอยขึ้นเหนือมิห์รอบ ดาวระยิบทั่วโดม
    g6(api) {
      const from = { x: MIHRAB.x, y: MIHRAB.y };
      const to = { x: MIHRAB.x, y: MIHRAB.y - 230 };
      api.spawn({
        x: from.x, y: from.y, max: 4.5, fadeIn: 0.4, fadeOut: 0.8,
        update(p) {
          p.y = from.y + (to.y - from.y) * ease(p.life / 1.6);
        },
        draw(c, p) {
          add(c, glow('255,225,140'), p.x, p.y, 2.6);
          c.globalCompositeOperation = 'source-over';
          draw(c, crescent(), p.x, p.y, 1.2, -0.2 + Math.sin(p.life) * 0.05);
        },
      });
      stars(api, 30, 4500);
    },
    // โคมไฟสว่างทั้งมัสยิด: โคมทุกดวงในภาพสว่างไล่กัน โคมเล็กลอยขึ้นจากพื้น
    g7(api) {
      lanternsGlow(4, 1);
      for (let i = 0; i < 6; i++) {
        const x = api.rand(120, 960);
        fly(api, {
          from: { x, y: api.rand(1500, 1850) }, to: { x: x + api.rand(-120, 120), y: api.rand(300, 700) }, dur: 3, delay: i * 0.25, trail: '255,210,120',
          draw(c, p, k) {
            add(c, glow('255,200,110'), p.x, p.y + 8, 1.1);
            c.globalCompositeOperation = 'source-over';
            draw(c, lantern(), p.x, p.y, 0.6 - k * 0.2);
          },
        });
      }
    },
    // ลวดลายเรขาคณิตเรืองแสง: ดาว 8 แฉกหลายวงหมุนแผ่จากมิห์รอบ + ลำแสง
    g8() {
      mandala(MIHRAB.x, MIHRAB.y - 40, 5, 480, 0.8);
      haloGlow(NICHE.x, NICHE.y, '255,215,140', 300, 5, 0.5);
      rays(NICHE.x, NICHE.y, ['255,220,140', '170,235,220', '255,245,210'], 5, { n: 16, len: 1100, peak: 0.18, width: 0.05 });
    },
    // พรอันยิ่งใหญ่: โคมทั้งมัสยิด ลวดลายเรขาคณิต จันทร์เสี้ยว ดาว แสงนูรโปรย + ข้อความใหญ่
    g9(api, user, n, o, label) {
      window.PicScene?.kick();
      api.bigShow(user, label);
      api.crowdWave('happy');
      lanternsGlow(6, 0.8, 0.08);
      mandala(MIHRAB.x, MIHRAB.y - 40, 6, 520, 0.85);
      stars(api, 36, 6000);
      haloGlow(NICHE.x, NICHE.y, '255,215,140', 360, 6, 0.55);
      api.emitter(5000, () => Math.random() < 0.55 && sparkle(api, api.rand(40, 1040), api.rand(150, 1400), '255,230,160', 2, 1.3));
    },
  };

  // ---------------------------------------------------------------- รถแห่แดนซ์ (ฉาก public/scenes/rodhae)
  // พิกัดบนจอ 1080x1920 (วัดจากหน้าเวทีจริง): ไฟมูฟวิ่งเฮดบนโครงทรัส • ตู้ลำโพงซ้าย • พื้นเวทีบนรถ • ขอบไฟนีออน
  const RD = {
    lights: [{ x: 452, y: 814 }, { x: 724, y: 840 }, { x: 814, y: 856 }],
    speakers: [{ x: 115, y: 830 }, { x: 290, y: 830 }, { x: 115, y: 1040 }, { x: 290, y: 1040 }],
    stack: { x: 230, y: 940 },
    deck: { x0: 470, x1: 860, y: 1130 },
    edge: { x0: 70, x1: 930, y: 1156 },
    stage: { x: 600, y: 930 },
    corners: [{ x: 120, y: 740 }, { x: 880, y: 780 }],
  };
  const NEON = ['255,79,216', '94,240,255', '61,220,132', '160,110,255', '255,210,63'];
  const pickN = () => NEON[(Math.random() * NEON.length) | 0];
  const bubble = () =>
    mk('bubble', 96, 96, (x) => {
      const g = x.createRadialGradient(48, 48, 26, 48, 48, 46);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.75, 'rgba(180,240,255,.18)');
      g.addColorStop(0.92, 'rgba(255,170,250,.55)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g;
      x.beginPath();
      x.arc(48, 48, 46, 0, TAU);
      x.fill();
      x.strokeStyle = 'rgba(200,250,255,.5)';
      x.lineWidth = 1.5;
      x.beginPath();
      x.arc(48, 48, 41, 0, TAU);
      x.stroke();
      x.fillStyle = 'rgba(255,255,255,.85)';
      x.beginPath();
      x.ellipse(34, 30, 9, 5, -0.6, 0, TAU);
      x.fill();
      x.fillStyle = 'rgba(255,255,255,.5)';
      x.beginPath();
      x.arc(62, 66, 3, 0, TAU);
      x.fill();
    });
  function bubbles(api, n, from, o = {}) {
    for (let i = 0; i < n; i++) {
      setTimeout(() => {
        const s = api.rand(o.s0 || 0.35, o.s1 || 0.85);
        api.spawn({
          x: from.x + api.rand(-40, 40), y: from.y + api.rand(-20, 20), vx: api.rand(-170, 170), vy: api.rand(-160, 30), max: api.rand(4, 7), fadeIn: 0.2, fadeOut: 0.6, ph: Math.random() * 6,
          update(p, dt) {
            p.vy += 22 * dt;
            p.vx *= Math.pow(0.995, dt * 60);
            p.x += Math.sin(p.life * 1.7 + p.ph) * 42 * dt;
          },
          draw(c, p) {
            c.globalCompositeOperation = 'source-over';
            draw(c, bubble(), p.x, p.y, s * (1 + 0.04 * Math.sin(p.life * 6 + p.ph)));
          },
        });
      }, (o.spread || 0) * Math.random() * 1000);
    }
  }
  // ละอองฟองพุ่งจากขวด (น้ำอัดลมเขย่า) — หยดขาว + ฟองสีตามขวด เป็นน้ำพุเหนือหัวคนส่ง
  function spray(api, x, y, n, rgb) {
    for (let i = 0; i < n; i++) {
      const big = i % 3 === 0;
      api.spawn({
        x: x + api.rand(-6, 6), y, vx: api.rand(-260, 260), vy: api.rand(-980, -520), g: 1150, max: api.rand(0.9, 1.4), fadeOut: 0.55, size: big ? api.rand(0.35, 0.6) : api.rand(0.18, 0.32),
        draw(c, p, k) {
          add(c, glow(big ? rgb : '255,255,255'), p.x, p.y, p.size * (1 - k * 0.4));
          c.globalCompositeOperation = 'source-over';
          c.fillStyle = 'rgba(255,255,255,.95)';
          c.beginPath();
          c.arc(p.x, p.y, (big ? 6 : 4) * (1 - k * 0.5), 0, TAU);
          c.fill();
        },
      });
    }
    haloGlow(x, y, rgb, 110, 0.8, 0.7);
  }
  // ลำแสงเลเซอร์กวาด (ชั้นหน้า ทับคนดู) — เส้นบางสว่าง + เรืองรอบเส้น
  function lasers(api, from, dur, o = {}) {
    const n = o.n || 8;
    const cols = o.cols || NEON;
    const span = o.span || 1.25;
    const base = o.base ?? Math.PI / 2; // ชี้ลงหาคนดู
    api.spawn({
      x: from.x, y: from.y, max: dur, fadeIn: 0.25, fadeOut: 0.6,
      draw(c, p, k) {
        const a = Math.min(1, p.life / 0.25) * (k > 0.8 ? (1 - k) / 0.2 : 1);
        c.save();
        c.globalCompositeOperation = 'lighter';
        c.lineCap = 'round';
        for (let i = 0; i < n; i++) {
          const ang = base + ((i / (n - 1)) - 0.5) * span + Math.sin(p.life * (o.speed || 1.6) + i * 0.7) * (o.sway || 0.35);
          const L = 1900;
          const ex = from.x + Math.cos(ang) * L;
          const ey = from.y + Math.sin(ang) * L;
          const col = cols[i % cols.length];
          c.strokeStyle = `rgba(${col},${0.16 * a})`;
          c.lineWidth = 16;
          c.beginPath();
          c.moveTo(from.x, from.y);
          c.lineTo(ex, ey);
          c.stroke();
          c.strokeStyle = `rgba(${col},${0.85 * a})`;
          c.lineWidth = 3;
          c.stroke();
        }
        add(c, glow('255,255,255'), from.x, from.y, 0.9 * a);
        c.restore();
      },
    });
  }
  // ควัน CO2 พุ่งเป็นลำสูงจากพื้นเวที (เริ่มเป็นลำแคบ แล้วบานออกตอนปลาย) ไฟสีส่องควัน
  function co2(api, x, y, ms, rgb) {
    api.emitter(ms, () => {
      for (let j = 0; j < 2; j++) {
        api.spawn({
          x: x + api.rand(-4, 4), y, vx: api.rand(-30, 30), vy: api.rand(-1600, -1350), max: api.rand(1.1, 1.5), fadeIn: 0.04, fadeOut: 0.55, size: 0.16,
          update(p, dt) {
            p.vy *= Math.pow(0.955, dt * 60);
            p.vx *= Math.pow(0.97, dt * 60);
            p.size += 0.9 * dt;
          },
          draw(c, p, k) {
            c.globalCompositeOperation = 'source-over';
            const a = c.globalAlpha;
            c.globalAlpha = a * 0.42;
            draw(c, glow('240,244,255'), p.x, p.y, p.size * 1.5);
            c.globalAlpha = a * 0.7;
            add(c, glow(rgb), p.x, p.y, p.size * 0.7);
            c.globalAlpha = a;
          },
        });
      }
    });
  }
  // กระดาษพลุ + ริบบิ้น
  const CONF = ['#ff4fd8', '#5ef0ff', '#3ddc84', '#ffd23f', '#ff7a3d', '#a06eff', '#ffffff'];
  function confetti(api, from, n, dir) {
    for (let i = 0; i < n; i++) {
      const col = CONF[(Math.random() * CONF.length) | 0];
      const ribbon = Math.random() < 0.18;
      api.spawn({
        x: from.x, y: from.y, vx: dir * api.rand(220, 820) + api.rand(-80, 80), vy: api.rand(-900, -420), g: 520, max: api.rand(4, 6.5), fadeOut: 0.5, ph: Math.random() * 6, vr: api.rand(-8, 8),
        update(p, dt) {
          p.vx *= Math.pow(0.985, dt * 60);
          if (p.vy > 140) p.vy = 140 + Math.sin(p.life * 3 + p.ph) * 30; // ร่วงช้า ๆ ปลิว ๆ
          p.x += Math.sin(p.life * 2.4 + p.ph) * 84 * dt;
        },
        draw(c, p) {
          c.globalCompositeOperation = 'source-over';
          c.save();
          c.translate(p.x, p.y);
          c.rotate(p.life * p.vr);
          c.scale(1, Math.cos(p.life * 7 + p.ph));
          c.fillStyle = col;
          if (ribbon) c.fillRect(-3, -18, 6, 36);
          else c.fillRect(-7, -4.5, 14, 9);
          c.restore();
        },
      });
    }
  }
  // พลุไฟเย็น (น้ำพุประกายไฟ) ตามขอบรถ
  function gerb(api, x, y, ms, h = 1) {
    api.emitter(ms, () => {
      for (let j = 0; j < 2; j++) {
        api.spawn({
          x: x + api.rand(-5, 5), y, vx: api.rand(-90, 90), vy: api.rand(-950, -650) * h, g: 1200, max: api.rand(0.6, 1), fadeOut: 0.5,
          draw(c, p, k) {
            add(c, glow('255,214,120'), p.x, p.y, 0.16 * (1 - k * 0.6));
            c.globalCompositeOperation = 'lighter';
            c.strokeStyle = `rgba(255,240,200,${0.9 * (1 - k)})`;
            c.lineWidth = 2;
            c.beginPath();
            c.moveTo(p.x, p.y);
            c.lineTo(p.x - p.vx * 0.025, p.y - p.vy * 0.025);
            c.stroke();
          },
        });
      }
    });
    haloGlow(x, y - 60, '255,200,110', 160, ms / 1000 + 0.5, 0.45);
  }
  // เบสกระแทก: ตู้ลำโพงเรืองแสงตามจังหวะ + คลื่นเสียงขยายออก
  function bassHits(api, beats, beat = 0.469) {
    for (let i = 0; i < beats; i++) {
      setTimeout(() => {
        RD.speakers.forEach((s) => haloGlow(s.x, s.y, i % 2 ? '94,240,255' : '255,79,216', 150, 0.45, 0.75));
        rings(RD.stack.x, RD.stack.y, i % 2 ? '94,240,255' : '255,79,216', 2, 0.9, 620);
        if (i % 2 === 0) api.shake();
        api.sfx.boom?.();
      }, i * beat * 1000);
    }
  }
  const rodhae = {
    // เขย่าขวดฉีดฟอง: คนส่งเขย่าขวด ฟองพุ่งขึ้นเหนือหัว + ฟองสบู่เล็ก ๆ
    g1(api, user, n, o) {
      if (user?.id) api.bump(user.id, 'happy', 1500);
      const rgb = pickN();
      spray(api, o.x + 20, o.y - 90, 40 + Math.min(n, 5) * 8, rgb);
      bubbles(api, 4, { x: o.x, y: o.y - 110 }, { s0: 0.3, s1: 0.5 });
      api.sfx.pop();
    },
    // ฟองสบู่ลอยทั้งลาน: เครื่องเป่าฟองบนโครงทรัสพ่นฟองลงมาหาคนดู
    g2(api) {
      RD.lights.forEach((l, i) => setTimeout(() => bubbles(api, 22, { x: l.x, y: l.y + 20 }, { spread: 3, s0: 0.45, s1: 1.05 }), i * 200));
      bubbles(api, 22, RD.corners[0], { spread: 3, s0: 0.45, s1: 1.05 });
      api.sfx.soft?.(880);
    },
    // มูฟวิ่งเฮดส่องคุณ: ไฟบนรถหันมาส่องคนส่ง สีนีออน + ประกาย
    g3(api, user, n, o) {
      const l = RD.lights[(Math.random() * RD.lights.length) | 0];
      api.spot(user, { rgb: pickN(), sx: l.x, sy: l.y, dur: 6000, fallback: { x: 540, y: 1500 } });
      haloGlow(l.x, l.y, '255,255,255', 110, 6, 0.6);
      for (let i = 0; i < 10; i++) setTimeout(() => sparkle(api, o.x + api.rand(-40, 40), o.y - api.rand(40, 130), pickN(), 1.2, 1.4), i * 120);
      api.sfx.zap?.();
    },
    // ควันพุ่ง CO2: ลำควันขาวพุ่งจากพื้นเวทีบนรถ 4 จุด ไฟสีส่องควัน
    g4(api) {
      const xs = [RD.deck.x0 + 20, 590, 690, RD.deck.x1 - 30];
      xs.forEach((x, i) => setTimeout(() => co2(api, x, RD.deck.y, 1100, NEON[i % NEON.length]), i * 90));
      window.PicScene?.kick();
      api.sfx.whoosh?.();
    },
    // เลเซอร์กวาดทั้งลาน: ลำเลเซอร์จากเวทีกวาดผ่านคนดู คนดูกระโดดพร้อมกัน
    g5(api) {
      lasers(api, { x: RD.stage.x, y: RD.stage.y - 60 }, 5.5, { n: 9, span: 1.5, sway: 0.4 });
      setTimeout(() => api.crowdWave('wave'), 400);
      setTimeout(() => api.crowdWave('wave'), 2300);
      api.sfx.zap?.();
    },
    // เบสแตก! ลำโพงสั่น: ตู้ลำโพงเรืองแสงตามจังหวะ คลื่นเสียง จอสั่น คนดูกระโดด
    g6(api) {
      bassHits(api, 8);
      api.crowdWave('wave');
      setTimeout(() => api.crowdWave('wave'), 1900);
      window.PicScene?.kick();
    },
    // ยิงพลุกระดาษ: ปืนกระดาษ 2 มุมรถยิงกระดาษสีกับริบบิ้นปลิวทั้งจอ
    g7(api) {
      confetti(api, RD.corners[0], 90, 1);
      confetti(api, RD.corners[1], 90, -1);
      setTimeout(() => confetti(api, { x: RD.stage.x, y: RD.deck.y }, 60, Math.random() < 0.5 ? 1 : -1), 600);
      api.sfx.pop();
      api.sfx.cheer?.();
    },
    // พลุไฟเย็นรอบรถ: น้ำพุประกายไฟตามขอบรถ + พลุบนฟ้า
    g8(api) {
      for (let i = 0; i < 6; i++) {
        const x = RD.edge.x0 + ((RD.edge.x1 - RD.edge.x0) * i) / 5;
        setTimeout(() => gerb(api, x, RD.edge.y, 3600), i * 120);
      }
      api.fireworks(5, { y0: 1100, yMin: 160, yMax: 560 });
      api.sfx.whoosh?.();
    },
    // รถแห่จัดเต็ม: เลเซอร์ + ควัน + เบส + ไฟเย็น + กระดาษพลุ + พลุบนฟ้า + ข้อความใหญ่
    g9(api, user, n, o, label) {
      window.PicScene?.kick();
      api.bigShow(user, label);
      api.flash('#ff4fd8', 600, 0.25);
      bassHits(api, 12);
      lasers(api, { x: RD.stage.x, y: RD.stage.y - 60 }, 8, { n: 12, span: 1.8, sway: 0.5, speed: 2.2 });
      lasers(api, RD.lights[0], 8, { n: 5, span: 1.1, base: Math.PI * 0.62, cols: ['94,240,255', '61,220,132'] });
      [RD.deck.x0 + 20, 590, 690, RD.deck.x1 - 30].forEach((x, i) => setTimeout(() => co2(api, x, RD.deck.y, 1400, NEON[i % NEON.length]), 300 + i * 90));
      for (let i = 0; i < 6; i++) setTimeout(() => gerb(api, RD.edge.x0 + ((RD.edge.x1 - RD.edge.x0) * i) / 5, RD.edge.y, 4200), 1200 + i * 100);
      setTimeout(() => {
        confetti(api, RD.corners[0], 110, 1);
        confetti(api, RD.corners[1], 110, -1);
      }, 2000);
      api.fireworks(8, { y0: 1100, yMin: 140, yMax: 600 });
      RD.lights.forEach((l) => bubbles(api, 10, { x: l.x, y: l.y + 20 }, { spread: 4 }));
      api.crowdWave('wave');
      setTimeout(() => api.crowdWave('hdance'), 2000);
      setTimeout(() => api.crowdWave('wave'), 4500);
    },
  };

  // ---------------------------------------------------------------- ดีเจคลับใต้น้ำ (ฉาก public/scenes/djclub)
  // พิกัดบนจอ 1080x1920: ตู้แมงกะพรุน 2 ข้าง • หลอดนีออน 4 แท่งหลังบูธ • บูธ/จอ LED • ดีเจ
  const DJ = {
    tanks: [{ x: 75, y0: 270, y1: 1220 }, { x: 1005, y0: 270, y1: 1220 }],
    tubes: [{ x: 420, y0: 430, y1: 1000, rgb: '94,240,255' }, { x: 464, y0: 580, y1: 1000, rgb: '120,160,255' }, { x: 604, y0: 600, y1: 960, rgb: '255,79,216' }, { x: 660, y0: 640, y1: 1000, rgb: '94,240,255' }],
    booth: { x: 540, y: 1040 },
    led: { x: 538, y: 1198 },
    head: { x: 540, y: 925 },
    corners: [{ x: 330, y: 1045 }, { x: 750, y: 1045 }],
  };
  const DJC = ['94,240,255', '255,79,216', '201,166,255', '61,220,132'];
  // แมงกะพรุนเรืองแสง: ร่มบาน-หุบ + หนวดพลิ้ว (วาดสดทีละเฟรม มีไม่กี่ตัว)
  function jellyDraw(c, x, y, s, t, rgb) {
    const pulse = 1 + 0.12 * Math.sin(t * 3.2);
    const w = 34 * s * pulse;
    const h = 26 * s / pulse;
    c.globalCompositeOperation = 'lighter';
    c.drawImage(glow(rgb), x - w * 2.2, y - h * 2.2, w * 4.4, h * 4.4);
    c.globalCompositeOperation = 'source-over';
    c.strokeStyle = `rgba(${rgb},.75)`;
    c.lineWidth = 2.2 * s;
    c.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const tx = x - w * 0.7 + (i / 5) * w * 1.4;
      c.beginPath();
      c.moveTo(tx, y + h * 0.15);
      for (let k = 1; k <= 4; k++) c.lineTo(tx + Math.sin(t * 3 + i + k * 0.9) * 6 * s, y + h * 0.15 + k * 15 * s);
      c.stroke();
    }
    const g = c.createRadialGradient(x, y - h * 0.4, 1, x, y, w);
    g.addColorStop(0, 'rgba(255,255,255,.95)');
    g.addColorStop(0.5, `rgba(${rgb},.75)`);
    g.addColorStop(1, `rgba(${rgb},.25)`);
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(x, y + h * 0.15, w, h, 0, Math.PI, 0);
    c.quadraticCurveTo(x, y + h * 0.45, x - w, y + h * 0.15);
    c.fill();
  }
  function jellies(api, n, from, o = {}) {
    for (let i = 0; i < n; i++) {
      const rgb = o.rgb || (i % 3 === 2 ? '201,166,255' : '255,110,220');
      const s = (o.s || 1) * api.rand(0.8, 1.2);
      const x0 = from.x + api.rand(-60, 60);
      api.spawn({
        x: x0, y: from.y + api.rand(-20, 20), vy: -api.rand(o.v0 || 70, o.v1 || 120), max: o.max || api.rand(5.5, 7.5), fadeIn: 0.5, fadeOut: 0.75, ph: Math.random() * 6,
        update(p, dt) {
          p.vy = -Math.max(20, (o.v1 || 120) * (0.6 + 0.4 * Math.max(0, Math.sin(p.life * 3.2 + p.ph))));
          p.x = x0 + Math.sin(p.life * 0.8 + p.ph) * 40;
          void dt;
        },
        draw(c, p) {
          jellyDraw(c, p.x, p.y, s, p.life + p.ph, rgb);
        },
      });
    }
  }
  // ปลาเรืองแสงว่ายเป็นฝูงผ่านจอ (ตัวเล็ก วาดง่าย)
  function fishSchool(api, n, dir = Math.random() < 0.5 ? 1 : -1) {
    const y0 = api.rand(650, 1150);
    for (let i = 0; i < n; i++) {
      const rgb = DJC[i % DJC.length];
      const s = api.rand(0.7, 1.15);
      const dy = api.rand(-150, 150);
      const delay = (i % 6) * 0.12 + Math.floor(i / 6) * 0.35;
      api.spawn({
        x: dir > 0 ? -80 - i * 14 : 1160 + i * 14, y: y0 + dy, vx: dir * api.rand(300, 380), max: 5, fadeIn: 0.2, fadeOut: 0.9, ph: Math.random() * 6,
        update(p, dt) {
          if (p.life < delay) p.x -= p.vx * dt;
          p.y = y0 + dy + Math.sin(p.life * 2.6 + p.ph) * 26;
        },
        draw(c, p) {
          c.save();
          c.translate(p.x, p.y);
          c.scale(dir * s, s);
          c.globalCompositeOperation = 'lighter';
          c.drawImage(glow(rgb), -40, -26, 80, 52);
          c.globalCompositeOperation = 'source-over';
          c.fillStyle = `rgba(${rgb},.95)`;
          c.beginPath();
          c.ellipse(0, 0, 18, 8, 0, 0, TAU);
          c.fill();
          const wag = Math.sin(p.life * 14 + p.ph) * 5;
          c.beginPath();
          c.moveTo(-14, 0);
          c.lineTo(-28, -9 + wag);
          c.lineTo(-28, 9 + wag);
          c.closePath();
          c.fill();
          c.fillStyle = '#fff';
          c.beginPath();
          c.arc(9, -2, 2.2, 0, TAU);
          c.fill();
          c.restore();
        },
      });
    }
  }
  // หลอดนีออนหลังบูธสว่างวาบไล่กันตามจังหวะ (ชั้นหลัง)
  function tubeChase(dur, beat = 0.484) {
    addBack(dur, (c, k, el) => {
      const step = Math.floor(el / (beat / 2));
      c.globalCompositeOperation = 'lighter';
      DJ.tubes.forEach((t, i) => {
        const on = (step + i) % DJ.tubes.length === 0 || (step % 8 === 7);
        const a = (on ? 0.9 : 0.15) * Math.sin(Math.PI * Math.min(1, k * 1.1));
        if (a <= 0) return;
        const g = c.createLinearGradient(t.x - 40, 0, t.x + 40, 0);
        g.addColorStop(0, `rgba(${t.rgb},0)`);
        g.addColorStop(0.5, `rgba(${t.rgb},${a})`);
        g.addColorStop(1, `rgba(${t.rgb},0)`);
        c.fillStyle = g;
        c.fillRect(t.x - 40, t.y0, 80, t.y1 - t.y0);
      });
      c.globalCompositeOperation = 'source-over';
    });
  }
  // ตู้แมงกะพรุนเรืองวาบ + ฟองพุ่งในตู้
  function tankPulse(api, dur = 2) {
    DJ.tanks.forEach((tk) => {
      haloGlow(tk.x, (tk.y0 + tk.y1) / 2, '255,110,220', 420, dur, 0.4);
      for (let i = 0; i < 10; i++) setTimeout(() => bubbles(api, 1, { x: tk.x + api.rand(-50, 50), y: tk.y1 - 40 }, { s0: 0.2, s1: 0.45 }), i * 90);
    });
  }
  const djclub = {
    // ฟองอากาศพุ่ง: ฟองใหญ่เล็กพุ่งจากคนส่งลอยขึ้น
    g1(api, user, n, o) {
      if (user?.id) api.bump(user.id, 'happy', 1500);
      bubbles(api, 10 + Math.min(n, 5) * 2, { x: o.x, y: o.y - 100 }, { s0: 0.3, s1: 0.75, spread: 0.6 });
      api.sfx.pop();
    },
    // แมงกะพรุนเรืองแสงลอยขึ้นจากคนส่ง
    g2(api, user, n, o) {
      jellies(api, 2, { x: o.x, y: o.y - 120 }, { s: 0.9 });
      api.sfx.soft?.(988);
    },
    // ไฟบูธส่องคนส่ง (ชื่อขึ้นจอ LED อยู่แล้ว) + คลื่นแสงจากจอ
    g3(api, user, n, o) {
      api.spot(user, { rgb: '120,240,255', sx: DJ.booth.x, sy: DJ.booth.y - 40, dur: 6000, fallback: { x: 540, y: 1550 } });
      rings(DJ.led.x, DJ.led.y, '255,79,216', 3, 1.6, 300);
      for (let i = 0; i < 8; i++) setTimeout(() => sparkle(api, o.x + api.rand(-40, 40), o.y - api.rand(40, 130), '120,240,255', 1.2, 1.4), i * 120);
      api.sfx.zap?.();
    },
    // นีออนกะพริบไล่ตามบีต
    g4(api) {
      tubeChase(4);
      api.flash('#5ef0ff', 220, 0.12);
      api.sfx.zap?.();
    },
    // เลเซอร์ใต้น้ำกวาดจากบูธ คนดูกระโดดพร้อมกัน
    g5(api) {
      lasers(api, { x: DJ.booth.x, y: DJ.booth.y - 30 }, 5.5, { n: 10, span: 1.6, sway: 0.42, cols: DJC });
      setTimeout(() => api.crowdWave('wave'), 400);
      setTimeout(() => api.crowdWave('wave'), 2300);
      api.sfx.zap?.();
    },
    // เบสดรอป: คลื่นเบสจากบูธ ตู้ปลาสั่นเรืองแสง ฟองพุ่งในตู้ จอสั่น
    g6(api) {
      for (let i = 0; i < 8; i++) {
        setTimeout(() => {
          rings(DJ.booth.x, DJ.booth.y, i % 2 ? '94,240,255' : '255,79,216', 2, 0.9, 700);
          if (i % 2 === 0) api.shake();
          api.sfx.boom?.();
        }, i * 484);
      }
      tankPulse(api, 3.5);
      api.crowdWave('wave');
      setTimeout(() => api.crowdWave('wave'), 1940);
      window.PicScene?.kick();
    },
    // ฝูงปลาเรืองแสงว่ายผ่านคลับ
    g7(api) {
      fishSchool(api, 18);
      setTimeout(() => fishSchool(api, 10), 1600);
      api.sfx.whoosh?.();
    },
    // ควัน CO2 จากมุมบูธ + กระดาษพลุสีนีออนพุ่งจากบูธ
    g8(api) {
      DJ.corners.forEach((p, i) => setTimeout(() => co2(api, p.x, p.y, 1300, DJC[i]), i * 120));
      setTimeout(() => {
        confetti(api, { x: DJ.booth.x - 120, y: DJ.booth.y - 20 }, 70, -1);
        confetti(api, { x: DJ.booth.x + 120, y: DJ.booth.y - 20 }, 70, 1);
      }, 500);
      api.sfx.whoosh?.();
    },
    // DROP!: แมงกะพรุนยักษ์ลอยขึ้นกลางคลับ + เลเซอร์ + เบส + ฟอง + ปลา + กระดาษพลุ
    g9(api, user, n, o, label) {
      window.PicScene?.kick();
      api.bigShow(user, label);
      api.flash('#ff4fd8', 600, 0.22);
      jellies(api, 1, { x: 540, y: 1500 }, { s: 3.4, v0: 90, v1: 150, max: 8, rgb: '255,120,230' });
      setTimeout(() => jellies(api, 3, { x: 200, y: 1400 }, { s: 1.3 }), 600);
      setTimeout(() => jellies(api, 3, { x: 880, y: 1400 }, { s: 1.3 }), 900);
      lasers(api, { x: DJ.booth.x, y: DJ.booth.y - 30 }, 8, { n: 12, span: 1.9, sway: 0.5, speed: 2.2, cols: DJC });
      tubeChase(8);
      tankPulse(api, 5);
      for (let i = 0; i < 12; i++) setTimeout(() => rings(DJ.booth.x, DJ.booth.y, DJC[i % 2], 1, 0.9, 760), i * 484);
      DJ.corners.forEach((p, i) => setTimeout(() => co2(api, p.x, p.y, 1500, DJC[i]), 1200 + i * 120));
      setTimeout(() => fishSchool(api, 16), 2500);
      setTimeout(() => {
        confetti(api, { x: DJ.booth.x - 120, y: DJ.booth.y - 20 }, 90, -1);
        confetti(api, { x: DJ.booth.x + 120, y: DJ.booth.y - 20 }, 90, 1);
      }, 2000);
      api.crowdWave('wave');
      setTimeout(() => api.crowdWave('hdance'), 2000);
      setTimeout(() => api.crowdWave('wave'), 4500);
    },
  };

  // ---------------------------------------------------------------- ศาลท้าวเวสสุวรรณ (ภาพ public/scenes/wessuwan)
  // โทนหยก + ทอง: ของไหว้ลอยไปหาองค์ท่าน • ของใหญ่ = ยันต์ทองหมุนหลังองค์ท่าน เหรียญทองโปรย คลื่นพลังจากไม้เท้า
  // ลื่นไหล: ภาพทุกชิ้นวาดลงแคนวาสเล็กครั้งเดียว • แสงใหญ่อยู่ชั้นหลัง (วาดทีละเฟรมไม่กี่เส้น) • อนุภาคมีเพดานรวมของหน้าเวที
  const WS = { face: { x: 540, y: 350 }, chest: { x: 540, y: 500 }, body: { x: 540, y: 590 }, altar: { x: 540, y: 950 }, base: { x: 540, y: 1100 } };
  const JADE = '120,230,170';
  const GOLD = '255,212,110';
  const coin = () =>
    mk('wcoin', 64, 64, (x) => {
      const g = x.createRadialGradient(24, 22, 4, 32, 32, 31);
      g.addColorStop(0, '#fff7c8');
      g.addColorStop(0.45, '#f6c64e');
      g.addColorStop(1, '#b77a17');
      x.fillStyle = g;
      x.beginPath();
      x.arc(32, 32, 30, 0, TAU);
      x.fill();
      x.strokeStyle = '#fff0b0';
      x.lineWidth = 2.5;
      x.beginPath();
      x.arc(32, 32, 22, 0, TAU);
      x.stroke();
      x.fillStyle = '#a86d10'; // ลายกลีบบัวกลางเหรียญ
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.42;
        x.beginPath();
        x.ellipse(32 + Math.cos(a) * 6, 35 + Math.sin(a) * 6, 3.4, 8, a + Math.PI / 2, 0, TAU);
        x.fill();
      }
    });
  const JASMINE = [petal('#ffffff', '#e9f6e2'), petal('#fffdf2', '#f5e8b8')];
  // ยันต์ทองหมุน (ชั้นหลัง หลังองค์ท่าน): วงกลมซ้อน + ดาว 8 แฉก + กลีบบัว 8 กลีบ + จุดรอบวง
  function yantra(cx, cy, r, dur, rgb = GOLD, peak = 0.75) {
    addBack(dur, (c, k, el) => {
      const a = peak * Math.min(1, k * 5) * Math.min(1, (1 - k) * 3);
      if (a <= 0) return;
      c.translate(cx, cy);
      const s = 0.82 + 0.18 * ease(Math.min(1, k * 3));
      c.scale(s, s);
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = a * 0.5;
      c.drawImage(glow(rgb), -r * 1.1, -r * 1.1, r * 2.2, r * 2.2);
      for (const wide of [true, false]) {
        c.lineWidth = wide ? 10 : 3;
        c.strokeStyle = `rgba(${rgb},${wide ? 0.35 : 1})`;
        c.globalAlpha = a * (wide ? 0.5 : 1);
        c.save();
        c.rotate(el * 0.35);
        c.beginPath();
        c.arc(0, 0, r, 0, TAU);
        c.moveTo(r * 0.86, 0);
        c.arc(0, 0, r * 0.86, 0, TAU);
        c.stroke();
        c.beginPath();
        for (let q = 0; q < 2; q++) {
          for (let i = 0; i <= 4; i++) {
            const an = (i / 4) * TAU + q * (Math.PI / 4);
            const px = Math.cos(an) * r * 0.8;
            const py = Math.sin(an) * r * 0.8;
            if (i) c.lineTo(px, py);
            else c.moveTo(px, py);
          }
        }
        c.stroke();
        c.restore();
        c.save();
        c.rotate(-el * 0.5);
        c.beginPath();
        for (let i = 0; i < 8; i++) {
          const an = (i / 8) * TAU;
          c.moveTo(Math.cos(an) * r * 0.3, Math.sin(an) * r * 0.3);
          c.quadraticCurveTo(Math.cos(an + 0.4) * r * 0.62, Math.sin(an + 0.4) * r * 0.62, Math.cos(an) * r * 0.55, Math.sin(an) * r * 0.55);
          c.quadraticCurveTo(Math.cos(an - 0.4) * r * 0.62, Math.sin(an - 0.4) * r * 0.62, Math.cos(an) * r * 0.3, Math.sin(an) * r * 0.3);
        }
        c.moveTo(r * 0.3, 0);
        c.arc(0, 0, r * 0.3, 0, TAU);
        c.stroke();
        c.restore();
      }
      c.globalAlpha = a;
      c.fillStyle = `rgba(${rgb},1)`;
      c.beginPath();
      for (let i = 0; i < 24; i++) {
        const an = (i / 24) * TAU + el * 0.35;
        const px = Math.cos(an) * r * 0.93;
        const py = Math.sin(an) * r * 0.93;
        c.moveTo(px + (i % 3 ? 3 : 6), py);
        c.arc(px, py, i % 3 ? 3 : 6, 0, TAU);
      }
      c.fill();
    });
  }
  // แสงวาบพาดผ่านองค์ท่าน (เหมือนทองสะท้อนแสง)
  function sheen(dur = 1.4, delay = 0) {
    setTimeout(
      () =>
        addBack(dur, (c, k) => {
          const a = 0.38 * Math.sin(Math.PI * k);
          if (a <= 0) return;
          c.globalCompositeOperation = 'lighter';
          c.translate(300 + ease(k) * 480, 600);
          c.rotate(0.35);
          const g = c.createLinearGradient(-70, 0, 70, 0);
          g.addColorStop(0, 'rgba(255,240,190,0)');
          g.addColorStop(0.5, `rgba(255,240,190,${a})`);
          g.addColorStop(1, 'rgba(255,240,190,0)');
          c.fillStyle = g;
          c.fillRect(-70, -460, 140, 920);
        }),
      delay * 1000,
    );
  }
  // คลื่นพลังจากไม้เท้าแผ่ไปตามพื้น (วงรีตามมุมมอง อยู่หลังคนดู)
  function floorWave(rgb, n = 3, dur = 2.4, gap = 0.35, base = WS.base) {
    addBack(dur + n * gap, (c, k, el) => {
      c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < n; i++) {
        const kk = (el - i * gap) / dur;
        if (kk <= 0 || kk >= 1) continue;
        const R = 60 + ease(kk) * 900;
        c.strokeStyle = `rgba(${rgb},${0.6 * (1 - kk)})`;
        c.lineWidth = 14 * (1 - kk) + 3;
        c.beginPath();
        c.ellipse(base.x, base.y + 20, R, R * 0.26, 0, 0, TAU);
        c.stroke();
      }
    });
  }
  // เหรียญทองโปรยลงมา กระดอนบนพื้นศาล แล้วค่อย ๆ จางไป
  let coinsUntil = []; // เวลาที่เหรียญแต่ละเหรียญจะหายไป — บนจอพร้อมกันไม่เกิน 70 เหรียญ
  function coinShower(api, count, ms = 2600) {
    let left = count;
    api.emitter(ms, () => {
      if (left <= 0 || Math.random() > 0.55) return;
      const t = now();
      coinsUntil = coinsUntil.filter((x) => x > t);
      if (coinsUntil.length >= 70) return;
      coinsUntil.push(t + 4.2);
      left--;
      const s = 0.55 + Math.random() * 0.45;
      api.spawn({
        x: api.rand(60, 1020), y: -40, vx: api.rand(-40, 40), vy: api.rand(200, 420), g: 900, max: 4.2, fadeOut: 0.8, fy: api.rand(1150, 1680), hops: 0,
        update(p) {
          if (p.y > p.fy && p.vy > 0) {
            p.y = p.fy;
            p.hops++;
            if (p.hops === 1) sparkle(api, p.x, p.y, GOLD, 0.6);
            if (p.hops > 2) {
              p.vy = 0;
              p.vx = 0;
              p.g = 0;
            } else {
              p.vy *= -0.42;
              p.vx *= 0.7;
            }
          }
        },
        draw(c, p) {
          if (p.hops < 3) add(c, glow(GOLD), p.x, p.y, 0.35 * s);
          c.globalCompositeOperation = 'source-over';
          c.save();
          c.translate(p.x, p.y);
          c.scale(p.hops > 2 ? s : Math.max(0.15, Math.abs(Math.cos(p.life * 9 + p.ph))) * s, s);
          c.drawImage(coin(), -32, -32);
          c.restore();
        },
      });
    });
  }
  const wessuwan = {
    // ถวายดอกบัว: บัวตูมผลิบานที่คนส่ง ลอยโค้งไปวางบนโต๊ะบูชา ทิ้งหางประกายหยก
    g1(api, user, n, o) {
      fly(api, {
        from: { x: o.x + api.rand(-30, 30), y: o.y - 60 }, to: { x: WS.altar.x + api.rand(-150, 150), y: WS.altar.y + api.rand(-10, 20) }, dur: 1.7, delay: 0.5, trail: JADE,
        draw(c, p, k) {
          const bloom = Math.min(1, p.life / 0.5);
          const s = (0.65 + 0.7 * bloom) * (1 - k * 0.3);
          add(c, glow('255,170,200'), p.x, p.y, 1.5 * s);
          c.globalCompositeOperation = 'source-over';
          const a0 = c.globalAlpha;
          c.globalAlpha = a0 * (1 - bloom);
          draw(c, lotus(false), p.x, p.y, s);
          c.globalAlpha = a0 * bloom;
          draw(c, lotus(true), p.x, p.y, s, Math.sin(p.life * 2) * 0.08);
        },
        onArrive: (p) => {
          haloGlow(p.x, p.y, JADE, 140, 1.2, 0.6);
          for (let i = 0; i < 6; i++) sparkle(api, p.x + api.rand(-40, 40), p.y + api.rand(-30, 10), GOLD, 1);
        },
      });
      api.sfx.chime(880);
    },
    // จุดเทียนบูชา: เทียนติดไฟหน้าคนส่ง แล้วดวงไฟลอยขึ้นไปเปล่งแสงที่พระพักตร์องค์ท่าน
    g2(api, user, n, o) {
      candle(api, o.x, o.y - 20, 3200, (p) => {
        fly(api, {
          from: { x: p.x, y: p.y - 50 }, to: WS.face, dur: 1.5, trail: GOLD,
          draw(c, q) {
            add(c, glow('255,200,110'), q.x, q.y, 0.95 + 0.3 * Math.sin(q.life * 9));
          },
          onArrive: () => {
            haloGlow(WS.face.x, WS.face.y, JADE, 230, 1.6, 0.55);
            rings(WS.face.x, WS.face.y, GOLD, 2, 1.6, 260);
          },
        });
      });
      api.sfx.chime(660);
    },
    // ถวายพวงมาลัย: พวงมาลัยมะลิลอยไปคล้องไม้เท้า ดอกมะลิร่วงพรู
    g3(api, user, n, o) {
      fly(api, {
        from: { x: o.x, y: o.y - 70 }, to: { x: WS.chest.x, y: WS.chest.y + 20 }, dur: 2, hold: 0.8, trail: '255,255,235',
        draw(c, p, k) {
          add(c, glow('255,250,215'), p.x, p.y, 1.7 - k * 0.4);
          c.globalCompositeOperation = 'source-over';
          draw(c, garland(), p.x, p.y, 1.2 - k * 0.3, Math.sin(p.life * 3) * 0.18);
        },
        onArrive: (p) => {
          haloGlow(p.x, p.y, '255,250,220', 180, 1.5, 0.55);
          for (let i = 0; i < 14; i++) {
            const img = JASMINE[i % 2];
            api.spawn({
              x: p.x + api.rand(-60, 60), y: p.y + api.rand(-20, 30), vx: api.rand(-60, 60), vy: api.rand(-40, 40), g: 120, max: 2.6, vr: api.rand(-3, 3), fadeOut: 0.6,
              draw(c, q) {
                draw(c, img, q.x, q.y, 0.55, q.rot);
              },
            });
          }
        },
      });
      api.sfx.chime(784);
    },
    // ปิดทององค์ท่าน: ทองคำเปลวหมุนเป็นเกลียวรอบองค์ท่าน แล้วติดองค์ แสงวาบพาดผ่านทั้งองค์
    g4(api, user, n, o) {
      api.spot(user, { rgb: '255,230,160', fallback: { x: 540, y: 1400 } });
      const sx = o.x;
      const sy = o.y - 60;
      for (let i = 0; i < 30; i++) {
        const tx = WS.body.x + api.rand(-110, 110);
        const ty = WS.body.y + api.rand(-250, 250);
        api.spawn({
          x: sx, y: sy, max: 2.6, fadeIn: 0.1, fadeOut: 0.85, ph: (i / 30) * TAU,
          update(p) {
            const m = ease(Math.min(1, p.life / 0.7)); // ช่วงแรกพุ่งจากคนส่งไปหาองค์ท่าน
            const k = ease(Math.min(1, p.life / 2.2)); // แล้ววงเกลียวหดเข้าติดองค์
            const R = 230 * (1 - k) + 8;
            const ang = p.ph + p.life * 3.2;
            const ox = tx + Math.cos(ang) * R;
            const oy = ty + Math.sin(ang) * R * 0.45;
            p.x = sx + (ox - sx) * m;
            p.y = sy + (oy - sy) * m;
            if (Math.random() < 0.1) sparkle(api, p.x, p.y, GOLD, 0.5, 0.7);
          },
          draw(c, p) {
            c.save();
            c.translate(p.x, p.y);
            c.rotate(p.life * 3 + p.ph);
            c.scale(Math.cos(p.life * 7 + p.ph), 1);
            c.drawImage(goldLeaf(), -20, -20, 40, 40);
            c.restore();
          },
        });
      }
      setTimeout(() => {
        haloGlow(WS.body.x, WS.body.y - 60, GOLD, 360, 2.4, 0.4);
        rays(WS.face.x, WS.face.y, [GOLD, '255,240,200'], 2.4, { n: 14, len: 560, peak: 0.22 });
      }, 1900);
      sheen(1.3, 2.0);
      api.sfx.chime(660);
    },
    // สวดคาถาบูชา: ดวงไฟทอง/หยกลอยจากทุกคนขึ้นไปรวมที่องค์ท่าน ยันต์ทองหมุนเปล่งแสงหลังองค์
    g5(api) {
      api.crowdWave('happy');
      fansList(api).slice(0, 36).forEach((f, i) => {
        const col = i % 2 ? GOLD : JADE;
        fly(api, {
          from: headOf(f), to: { x: WS.chest.x + api.rand(-50, 50), y: WS.chest.y + api.rand(-60, 60) }, dur: 1.9, delay: 0.2 + (i % 12) * 0.07,
          draw(c, p) {
            add(c, glow(col), p.x, p.y, 0.5);
          },
        });
      });
      setTimeout(() => {
        yantra(WS.chest.x, WS.chest.y - 40, 300, 4.2, GOLD, 0.7);
        rings(WS.chest.x, WS.chest.y, JADE, 3, 2.6, 520);
      }, 1500);
      api.sfx.chime(523);
    },
    // ตีระฆังรับโชค: ระฆังทอง 2 ใบแกว่งข้างพระเศียร คลื่นเสียงทองแผ่ • เหรียญทองร่วงกราวลงพื้นศาล
    g6(api) {
      window.PicScene?.kick();
      for (const [bx, by, ph] of [[400, 330, 0], [680, 330, 1.3]]) {
        api.spawn({
          x: bx, y: by, max: 3.4, fadeIn: 0.2, fadeOut: 0.8,
          draw(c, p) {
            c.save();
            c.translate(p.x, p.y - 70);
            c.rotate(Math.sin(p.life * 6 + ph) * 0.35 * Math.exp(-p.life * 0.5));
            add(c, glow(GOLD), 0, 80, 1.8);
            c.globalCompositeOperation = 'source-over';
            c.drawImage(bell(), -60, 0, 120, 142);
            c.restore();
          },
        });
        for (let i = 0; i < 3; i++) setTimeout(() => rings(bx, by + 40, GOLD, 2, 2, 560), i * 650);
      }
      coinShower(api, 26, 2600);
      [784, 659, 523].forEach((f, i) => setTimeout(() => api.sfx.chime(f), i * 650));
    },
    // บัวบานทั่วศาล: หมอกหยกลอยทั่วพื้น ดอกบัวผุดบานรอบคนดู กลีบบัวโปรยทั้งจอ
    g7(api) {
      window.PicScene?.kick();
      addBack(4.6, (c, k, el) => {
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = 0.5 * Math.sin(Math.PI * k);
        for (let i = 0; i < 5; i++) {
          const x = ((i * 260 + el * 70) % 1400) - 160;
          c.drawImage(glow(JADE), x - 260, 1060 + (i % 2) * 220, 520, 240);
        }
      });
      for (let i = 0; i < 14; i++) {
        const delay = i * 0.11;
        api.spawn({
          x: api.rand(80, 1000), y: api.rand(1180, 1700), vy: -12, max: 4.4, fadeIn: 0.2, fadeOut: 0.75,
          draw(c, p) {
            const t = p.life - delay;
            if (t <= 0) return;
            const bloom = Math.min(1, t / 0.8);
            add(c, glow('255,160,200'), p.x, p.y, 1.4 * bloom);
            c.globalCompositeOperation = 'source-over';
            draw(c, lotus(bloom > 0.5), p.x, p.y, 0.45 + 0.6 * bloom, Math.sin(p.life * 1.5 + p.ph) * 0.06);
          },
        });
      }
      rain(api, LOTUS_PETALS, 3800, 0.6, { s0: 0.6, s1: 1 });
      api.sfx.chime(988);
    },
    // แสงทองส่องศาล: รัศมีทองหมุนจากองค์ท่าน ลำแสงสาดทั้งจอ ประกายลอยทั่วศาล + ยันต์จาง ๆ
    g8(api) {
      window.PicScene?.kick();
      haloGlow(WS.face.x, WS.face.y + 80, GOLD, 380, 4.6, 0.42);
      rays(WS.face.x, WS.face.y + 40, [GOLD, '170,240,200', '255,245,210', '255,190,120'], 4.6, { n: 20, len: 1300, peak: 0.2, width: 0.06 });
      yantra(WS.chest.x, WS.chest.y - 40, 360, 4.6, '255,230,150', 0.4);
      sheen(1.2, 0.4);
      api.emitter(4000, () => Math.random() < 0.55 && sparkle(api, api.rand(40, 1040), api.rand(260, 1700), GOLD, 1.6, 1.2));
      api.sfx.chime(698);
    },
    // ท่านท้าวประทานพร: แสงวาบทอง → ยันต์ใหญ่ + รัศมี → ไม้เท้ากระแทกพื้น คลื่นพลังหยกแผ่ไปทั้งศาล
    //  → เหรียญทอง + กลีบบัวโปรยทั้งจอ ทุกคนกระโดดดีใจ (ราว 7 วินาที)
    g9(api, user, n, o, label) {
      window.PicScene?.kick();
      api.flash('#ffe7a6', 700, 0.28);
      api.bigShow(user, label);
      haloGlow(WS.body.x, WS.body.y - 60, GOLD, 520, 7, 0.4);
      yantra(WS.chest.x, WS.chest.y - 40, 420, 7, GOLD, 0.65);
      rays(WS.face.x, WS.face.y + 40, [GOLD, '170,240,200', '255,245,210', '255,190,120'], 7, { n: 22, len: 1500, peak: 0.2, width: 0.06 });
      sheen(1.4, 0.3);
      setTimeout(() => {
        window.PicScene?.kick();
        api.flash('#bff5d6', 400, 0.18);
        floorWave(JADE, 4, 2.6, 0.3);
        rings(WS.base.x, WS.base.y - 40, GOLD, 3, 2.2, 420);
        api.crowdWave('wave');
      }, 1300);
      setTimeout(() => coinShower(api, 44, 4200), 1600);
      setTimeout(() => rain(api, [...LOTUS_PETALS, lotus(true)], 4500, 0.55, { s0: 0.45, s1: 0.9 }), 1800);
      setTimeout(() => api.crowdWave('happy'), 3600);
      api.sfx.chime(523);
      setTimeout(() => api.sfx.chime(784), 1300);
    },
  };

  // ---- คำสั่งพิมพ์ในแชทของธีมศาล (ไม่ใช่ของขวัญ → เบา ๆ ไม่บังฉาก แต่เห็นชัดว่า "ได้อะไร")
  //  สาธุ = ลำแสงทองจากองค์ท่านส่องลงมาที่คนพิมพ์ + คำอวยพรเหนือหัว • ขอพร = ดวงไฟลอยขึ้นไปหาองค์ท่าน
  //  จุดธูป = ควันธูปลอยขึ้น + ประกายไฟ • ถวายบัว = ดอกบัวลอยไปวางบนโต๊ะบูชา
  const BLESS = ['รับพรแล้ว ✨', 'รวย ๆ ปัง ๆ', 'โชคดีมีชัย', 'ค้าขายร่ำรวย', 'สุขภาพแข็งแรง', 'ปลอดภัยทุกทาง', 'สมหวังดังใจ', 'งานปัง เงินปัง', 'เฮง ๆ รวย ๆ', 'คนรักคนหลง'];
  let beamTimes = [];
  // ลำแสงเรียวจากองค์ท่านลงมาที่หัวคนดู (ชั้นหลัง — อยู่หลังตัวละคร)
  function beam(x, y, rgb = GOLD, from = WS.face) {
    const fx = from.x;
    const fy = from.y + 60;
    addBack(1.9, (c, k) => {
      const a = 0.7 * Math.sin(Math.PI * Math.min(1, k * 1.25));
      if (a <= 0) return;
      c.globalCompositeOperation = 'lighter';
      const g = c.createLinearGradient(fx, fy, x, y);
      g.addColorStop(0, `rgba(${rgb},${a * 0.25})`);
      g.addColorStop(0.75, `rgba(${rgb},${a * 0.7})`);
      g.addColorStop(1, `rgba(${rgb},${a})`);
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(fx - 8, fy);
      c.lineTo(fx + 8, fy);
      c.lineTo(x + 56, y);
      c.lineTo(x - 56, y);
      c.closePath();
      c.fill();
      c.globalAlpha = a;
      c.drawImage(glow(rgb), x - 80, y - 50, 160, 100);
    });
  }
  // ข้อความลอยขึ้นเหนือหัว — อยู่ชั้นบนสุด (#ui) ไม่โดนตัวละคร/ลูกโป่งคำพูดบัง • บนจอพร้อมกันไม่เกิน 8 อัน
  function floatText(api, x, y, text, col = '#ffe7a6') {
    const ui = document.getElementById('ui');
    if (!ui || ui.querySelectorAll('.fx-bless').length >= 8) return;
    const el = document.createElement('div');
    el.className = 'fx-bless';
    el.textContent = text;
    el.style.cssText = `left:${Math.max(120, Math.min(960, x))}px;top:${y}px;color:${col}`;
    ui.appendChild(el);
    setTimeout(() => el.remove(), 2300);
  }
  const shrineCmd = (A) => (api, d) => {
    const fp = api.fanPos(d.id);
    const x = fp ? fp.x : api.rand(240, 840);
    const feet = fp ? fp.feetY : 1500;
    const s = fp ? fp.s : 1;
    const head = feet - 118 * s; // ตัวละครเด็กผมจุก สูง 118 (kid-fan)
    const ty = head - 108 * s; // ข้อความลอยเหนือลูกโป่งคำพูด (ลูกโป่งเป็น DOM อยู่ชั้นบนกว่า)
    const cmd = String(d.cmd || '');
    if (d.zone === 'wish' || /ขอพร/.test(cmd)) {
      fly(api, {
        from: { x, y: head - 10 }, to: { x: A.face.x + api.rand(-40, 40), y: A.face.y + api.rand(0, 60) }, dur: 1.6, trail: '255,236,170',
        draw(c, p) {
          add(c, glow('255,236,170'), p.x, p.y, 0.55 + 0.12 * Math.sin(p.life * 10));
        },
        onArrive: (p) => haloGlow(p.x, p.y, '255,236,170', 120, 1, 0.5),
      });
      floatText(api, x, ty, 'ขอให้สมหวัง 🌟');
      return true;
    }
    if (d.zone === 'incense' || /ธูป/.test(cmd)) {
      for (let i = 0; i < 3; i++) {
        api.spawn({
          x: x + (i - 1) * 8, y: head + 20, vy: -60, max: 2.4, fadeIn: 0.2, fadeOut: 0.5, ph: Math.random() * 6,
          draw(c, p, k) {
            c.strokeStyle = `rgba(235,230,245,${0.45 * (1 - k)})`;
            c.lineWidth = 4;
            c.beginPath();
            c.moveTo(p.x, p.y);
            c.quadraticCurveTo(p.x + Math.sin(p.life * 3 + p.ph) * 16, p.y - 20, p.x + Math.sin(p.life * 2 + p.ph) * 8, p.y - 40);
            c.stroke();
            add(c, glow('255,150,80'), x + (i - 1) * 8, head + 22, 0.12);
          },
        });
      }
      for (let i = 0; i < 5; i++) sparkle(api, x + api.rand(-20, 20), head + api.rand(-10, 20), '255,170,90', 1.2, 0.8);
      floatText(api, x, ty, 'จุดธูปบูชา 🕯️', '#ffd2a6');
      return true;
    }
    if (/บัว|กุหลาบ|ส้ม/.test(cmd)) {
      const rose = /กุหลาบ/.test(cmd);
      const orange = /ส้ม/.test(cmd);
      fly(api, {
        from: { x, y: head }, to: { x: A.altar.x + api.rand(-150, 150), y: A.altar.y + api.rand(-10, 20) }, dur: 1.5, trail: rose ? '255,120,170' : JADE,
        draw(c, p, k) {
          add(c, glow(rose ? '255,90,120' : '255,170,200'), p.x, p.y, 0.8);
          c.globalCompositeOperation = 'source-over';
          draw(c, orange ? mandarin() : rose ? redRose() : lotus(true), p.x, p.y, (orange ? 0.7 : rose ? 0.5 : 0.55) - k * 0.15);
        },
      });
      return true;
    }
    // สาธุ (และคำสั่งอื่น ๆ ที่ไม่มีท่าเฉพาะ): ลำแสงรับพร — คนพิมพ์พร้อมกันเยอะ ส่องได้ทีละไม่เกิน 6 ลำ (เกินนั้นได้แค่แสงรอบตัว + คำอวยพร)
    const t = now();
    beamTimes = beamTimes.filter((b) => b > t);
    if (beamTimes.length < 6) {
      beamTimes.push(t + 1.9);
      beam(x, head + 30, GOLD, A.face);
    }
    for (let i = 0; i < 6; i++) sparkle(api, x + api.rand(-34, 34), head + api.rand(-10, 60), GOLD, 1.3, 0.9);
    const words = A.bless || BLESS;
    floatText(api, x, ty, words[(Math.random() * words.length) | 0]);
    return true;
  };

  const wessuwanCmd = shrineCmd(WS);

  // ---------------------------------------------------------------- ศาลพญานาค (ภาพ public/scenes/naga + หน้ากาก live.png = รูปปั้นขยับ/ตาเรืองแสง)
  // โทนฟ้าเทอร์ควอยซ์ + ทอง • ของใหญ่ = ปลุกพญานาค (PicScene.rage: หัวส่ายแรง ตาลุกโชน) + นาคแสงเลื้อยวนรอบองค์ + แก้วมณีจากสระ
  // พิกัดบนจอคิดจากตำแหน่งในภาพ (ภาพ 1116x2000 เต็มความกว้างจอ ซูม ~1.06 รอบกลางจอ)
  const NP = (xn, yn) => ({ x: 540 + (xn * 1080 - 540) * 1.06, y: 960 + (yn * 1935 - 967) * 1.06 });
  const hp = (cx, cy) => NP((460 + cx / 1.5504) / 1536, (412 + cy / 1.5504) / 2752); // ตำแหน่งในภาพตัดหัวนาค → จอ
  const NG = {
    face: hp(480, 250), crown: NP(0.5, 0.13), chest: NP(0.5, 0.33), coil: NP(0.5, 0.42), pond: NP(0.5, 0.455), altar: NP(0.5, 0.505), base: NP(0.5, 0.57),
    heads: [hp(480, 300), hp(318, 320), hp(240, 400), hp(185, 495), hp(632, 320), hp(718, 400), hp(780, 495)],
  };
  const AQUA = '110,235,225';
  const SAPH = '120,170,255';
  const NPIV = NP(0.5, 0.3); // โคนคอ (บนจอ)
  // ไอหมอกพ่นจากปากทั้ง 7 เศียรตอนคำราม (พุ่งออกตามทิศที่เศียรชี้ แล้วฟุ้งจาง)
  function roarBreath(api, v = 1, delay = 0.35) {
    NG.heads.forEach((h, i) => {
      const dx = h.x - NPIV.x;
      const dy = h.y - NPIV.y - 120;
      const L = Math.hypot(dx, dy) || 1;
      for (let k = 0; k < 5; k++) {
        const sp = (180 + k * 60) * v;
        const d0 = delay + k * 0.07 + i * 0.02;
        api.spawn({
          x: h.x, y: h.y + 10, vx: (dx / L) * sp + api.rand(-30, 30), vy: (dy / L) * sp + api.rand(-30, 30), drag: 1.6, max: d0 + 1.5, fadeIn: 0.05, fadeOut: 0.6,
          draw(c, p) {
            const t = p.life - d0;
            if (t <= 0) {
              p.x = h.x;
              p.y = h.y + 10;
              return;
            }
            add(c, glow(k % 2 ? AQUA : '200,255,245'), p.x, p.y, (0.5 + t * 1.3) * v);
          },
        });
      }
    });
  }
  // ท่าของพญานาคตามขนาดของขวัญ: hiss = ชูคอนิด ๆ ขู่ฟ่อ • roar = ชูคอสูง คำราม พ่นไอหมอก จอสะเทือน
  const nagaHiss = (api, v = 0.35) => {
    window.PicScene?.act?.(v, { ms: 1400 });
    api.sfx.hiss?.();
  };
  const nagaRoar = (api, v = 0.8, ms = 2600) => {
    window.PicScene?.act?.(v, { ms, roar: true });
    setTimeout(() => api.sfx.roar?.(v), ms * 0.15);
    roarBreath(api, v, (ms / 1000) * 0.15);
  };
  // นาคแสง: ลำตัวเรืองแสงเลื้อยเป็นเกลียววนรอบองค์พญานาคขึ้นไปบนฟ้า (ชั้นหลัง — จุดเรืองแสงเรียงเป็นลำตัว ~46 จุด)
  function lightNaga(dur, rgb = AQUA, dir = 1, delay = 0) {
    setTimeout(
      () =>
        addBack(dur, (c, k, el) => {
          const fade = Math.min(1, k * 6) * Math.min(1, (1 - k) * 4);
          if (fade <= 0) return;
          c.globalCompositeOperation = 'lighter';
          const head = ease(Math.min(1, el / (dur * 0.75))) * 1.15;
          const N = 46;
          for (let i = 0; i < N; i++) {
            const u = head - i * 0.022;
            if (u < 0) break;
            const ang = dir * (u * 9.5 + el * 0.6);
            const R = 150 * (1 - u * 0.5);
            const x = NG.chest.x + Math.cos(ang) * R;
            const y = NG.base.y - u * 1050 + Math.sin(ang) * R * 0.22;
            const s = (1 - i / N) * (i === 0 ? 1.7 : 1);
            c.globalAlpha = fade * (0.45 + 0.55 * (1 - i / N));
            const r = 52 * s + 10;
            c.drawImage(glow(i % 6 === 0 ? GOLD : rgb), x - r, y - r, r * 2, r * 2);
          }
        }),
      delay * 1000,
    );
  }
  // วงคลื่นบนผิวน้ำในสระ (วงรีตามมุมมอง ชั้นหลัง)
  function pondRipples(n = 3, dur = 2.4, x = NG.pond.x, y = NG.pond.y, maxR = 360, rgb = AQUA) {
    addBack(dur + n * 0.4, (c, k, el) => {
      c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < n; i++) {
        const kk = (el - i * 0.4) / dur;
        if (kk <= 0 || kk >= 1) continue;
        const R = 30 + ease(kk) * maxR;
        c.strokeStyle = `rgba(${rgb},${0.55 * (1 - kk)})`;
        c.lineWidth = 6 * (1 - kk) + 2;
        c.beginPath();
        c.ellipse(x, y, R, R * 0.2, 0, 0, TAU);
        c.stroke();
      }
    });
  }
  // แก้วมณี (ดวงแก้วของพญานาค) วาดครั้งเดียว
  const gem = () =>
    mk('ngem', 96, 96, (x) => {
      const g = x.createRadialGradient(40, 36, 4, 48, 48, 46);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.25, '#c8fff6');
      g.addColorStop(0.6, '#4fd8d0');
      g.addColorStop(1, 'rgba(30,120,150,0)');
      x.fillStyle = g;
      x.beginPath();
      x.arc(48, 48, 46, 0, TAU);
      x.fill();
      x.strokeStyle = 'rgba(255,240,190,.9)';
      x.lineWidth = 2;
      x.beginPath();
      x.arc(48, 48, 24, 0, TAU);
      x.stroke();
    });
  const naga = {
    // ถวายดอกบัว: บัวผลิบาน ลอยโค้งไปวางบนโต๊ะบูชา น้ำในสระกระเพื่อม
    g1(api, user, n, o) {
      fly(api, {
        from: { x: o.x + api.rand(-30, 30), y: o.y - 60 }, to: { x: NG.altar.x + api.rand(-150, 150), y: NG.altar.y + api.rand(-5, 25) }, dur: 1.7, delay: 0.5, trail: AQUA,
        draw(c, p, k) {
          const bloom = Math.min(1, p.life / 0.5);
          const s = (0.65 + 0.7 * bloom) * (1 - k * 0.3);
          add(c, glow('255,170,200'), p.x, p.y, 1.5 * s);
          c.globalCompositeOperation = 'source-over';
          const a0 = c.globalAlpha;
          c.globalAlpha = a0 * (1 - bloom);
          draw(c, lotus(false), p.x, p.y, s);
          c.globalAlpha = a0 * bloom;
          draw(c, lotus(true), p.x, p.y, s, Math.sin(p.life * 2) * 0.08);
        },
        onArrive: (p) => {
          haloGlow(p.x, p.y, AQUA, 140, 1.2, 0.6);
          pondRipples(2, 1.8, p.x, NG.pond.y, 220);
          nagaHiss(api, 0.3);
        },
      });
      api.sfx.chime(880);
    },
    // จุดเทียนบูชา: ดวงไฟลอยไปหาเศียรกลาง → ตาพญานาคลุกวาบ
    g2(api, user, n, o) {
      candle(api, o.x, o.y - 20, 3000, (p) => {
        fly(api, {
          from: { x: p.x, y: p.y - 50 }, to: NG.face, dur: 1.5, trail: GOLD,
          draw(c, q) {
            add(c, glow('255,200,110'), q.x, q.y, 0.95 + 0.3 * Math.sin(q.life * 9));
          },
          onArrive: () => {
            nagaHiss(api, 0.4);
            haloGlow(NG.face.x, NG.face.y, AQUA, 230, 1.6, 0.55);
            rings(NG.face.x, NG.face.y, GOLD, 2, 1.6, 260);
          },
        });
      });
      api.sfx.chime(660);
    },
    // ถวายพวงมาลัย: พวงมาลัยลอยไปคล้องลำคอพญานาค ดอกมะลิร่วงพรู
    g3(api, user, n, o) {
      fly(api, {
        from: { x: o.x, y: o.y - 70 }, to: { x: NG.chest.x, y: NG.chest.y + 10 }, dur: 2, hold: 0.8, trail: '255,255,235', tick: (p) => p.k > 0.98 && !p.hissed && ((p.hissed = true), nagaHiss(api, 0.4)),
        draw(c, p, k) {
          add(c, glow('255,250,215'), p.x, p.y, 1.7 - k * 0.4);
          c.globalCompositeOperation = 'source-over';
          draw(c, garland(), p.x, p.y, 1.2 - k * 0.3, Math.sin(p.life * 3) * 0.18);
        },
        onArrive: (p) => {
          haloGlow(p.x, p.y, '255,250,220', 180, 1.5, 0.55);
          for (let i = 0; i < 14; i++) {
            const img = JASMINE[i % 2];
            api.spawn({
              x: p.x + api.rand(-60, 60), y: p.y + api.rand(-20, 30), vx: api.rand(-60, 60), vy: api.rand(-40, 40), g: 120, max: 2.6, vr: api.rand(-3, 3), fadeOut: 0.6,
              draw(c, q) {
                draw(c, img, q.x, q.y, 0.55, q.rot);
              },
            });
          }
        },
      });
      api.sfx.chime(784);
    },
    // ปิดทองเกล็ดนาค: ทองคำเปลวหมุนเกลียวเข้าหาลำตัว แสงวาบไล่จากเศียรลงมาตามลำคอ
    g4(api, user, n, o) {
      api.spot(user, { rgb: '255,230,160', fallback: { x: 540, y: 1400 } });
      const sx = o.x;
      const sy = o.y - 60;
      for (let i = 0; i < 30; i++) {
        const tx = NG.chest.x + api.rand(-120, 120);
        const ty = NG.chest.y + api.rand(-220, 200);
        api.spawn({
          x: sx, y: sy, max: 2.6, fadeIn: 0.1, fadeOut: 0.85, ph: (i / 30) * TAU,
          update(p) {
            const m = ease(Math.min(1, p.life / 0.7));
            const k = ease(Math.min(1, p.life / 2.2));
            const R = 230 * (1 - k) + 8;
            const ang = p.ph + p.life * 3.2;
            p.x = sx + (tx + Math.cos(ang) * R - sx) * m;
            p.y = sy + (ty + Math.sin(ang) * R * 0.45 - sy) * m;
            if (Math.random() < 0.1) sparkle(api, p.x, p.y, GOLD, 0.5, 0.7);
          },
          draw(c, p) {
            c.save();
            c.translate(p.x, p.y);
            c.rotate(p.life * 3 + p.ph);
            c.scale(Math.cos(p.life * 7 + p.ph), 1);
            c.drawImage(goldLeaf(), -20, -20, 40, 40);
            c.restore();
          },
        });
      }
      setTimeout(() => {
        nagaRoar(api, 0.55, 2200);
        haloGlow(NG.chest.x, NG.chest.y - 80, GOLD, 340, 2.2, 0.4);
        addBack(1.4, (c, k) => {
          const a = 0.4 * Math.sin(Math.PI * k);
          if (a <= 0) return;
          c.globalCompositeOperation = 'lighter';
          const y = NG.crown.y + ease(k) * 700;
          const g = c.createLinearGradient(0, y - 70, 0, y + 70);
          g.addColorStop(0, 'rgba(255,240,190,0)');
          g.addColorStop(0.5, `rgba(255,240,190,${a})`);
          g.addColorStop(1, 'rgba(255,240,190,0)');
          c.fillStyle = g;
          c.fillRect(NG.chest.x - 260, y - 70, 520, 140);
        });
      }, 1900);
      api.sfx.chime(660);
    },
    // สวดบูชาพญานาค: ดวงไฟจากทุกคนลอยไปรวมที่เศียร ยันต์ฟ้าหมุนหลังองค์ ตาทั้ง 7 เศียรลุกโชน
    g5(api) {
      api.crowdWave('happy');
      fansList(api).slice(0, 36).forEach((f, i) => {
        const col = i % 2 ? GOLD : AQUA;
        fly(api, {
          from: headOf(f), to: { x: NG.face.x + api.rand(-60, 60), y: NG.face.y + api.rand(-20, 80) }, dur: 1.9, delay: 0.2 + (i % 12) * 0.07,
          draw(c, p) {
            add(c, glow(col), p.x, p.y, 0.5);
          },
        });
      });
      setTimeout(() => {
        nagaRoar(api, 0.65, 2400);
        yantra(NG.face.x, NG.face.y + 40, 320, 4.2, AQUA, 0.6);
        rings(NG.face.x, NG.face.y, GOLD, 3, 2.6, 520);
      }, 1500);
      api.sfx.chime(523);
    },
    // แก้วมณีนาคา: ดวงแก้วผุดจากสระ ลอยขึ้นเหนือเศียร หมุนเปล่งแสง • เหรียญทองร่วงกราว
    g6(api) {
      window.PicScene?.kick();
      window.PicScene?.act?.(0.6, { ms: 2400 });
      api.sfx.hiss?.();
      pondRipples(3, 2.2);
      const top = { x: NG.crown.x, y: NG.crown.y - 20 };
      api.spawn({
        x: NG.pond.x, y: NG.pond.y, max: 4, fadeIn: 0.2, fadeOut: 0.8,
        update(p) {
          const k = ease(Math.min(1, p.life / 1.4));
          p.x = NG.pond.x;
          p.y = NG.pond.y + (top.y - NG.pond.y) * k + Math.sin(p.life * 3) * 6 * k;
          if (Math.random() < 0.25) sparkle(api, p.x + api.rand(-26, 26), p.y + api.rand(-26, 26), AQUA, 0.8);
        },
        draw(c, p) {
          const s = 1 + 0.1 * Math.sin(p.life * 6);
          c.globalAlpha *= 0.85;
          add(c, glow(AQUA), p.x, p.y, 1.25 * s);
          add(c, gem(), p.x, p.y, 0.8 * s);
        },
      });
      setTimeout(() => {
        rays(top.x, top.y, [AQUA, GOLD], 2.4, { n: 16, len: 640, peak: 0.18 });
        rings(top.x, top.y, AQUA, 3, 2.2, 480);
      }, 1400);
      coinShower(api, 24, 2600);
      [784, 988, 659].forEach((f, i) => setTimeout(() => api.sfx.chime(f), i * 500));
    },
    // บัวบานทั่วสระ: น้ำกระเพื่อมทั้งสระ หมอกฟ้าลอยคลุมพื้น ดอกบัวผุดบานรอบคนดู กลีบบัวโปรย
    g7(api) {
      window.PicScene?.kick();
      nagaRoar(api, 0.75, 2600);
      pondRipples(4, 2.6, NG.pond.x, NG.pond.y, 520);
      addBack(4.6, (c, k, el) => {
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = 0.45 * Math.sin(Math.PI * k);
        for (let i = 0; i < 5; i++) {
          const x = ((i * 260 + el * 70) % 1400) - 160;
          c.drawImage(glow(AQUA), x - 260, 1060 + (i % 2) * 220, 520, 240);
        }
      });
      for (let i = 0; i < 14; i++) {
        const delay = i * 0.11;
        api.spawn({
          x: api.rand(80, 1000), y: api.rand(1180, 1700), vy: -12, max: 4.4, fadeIn: 0.2, fadeOut: 0.75,
          draw(c, p) {
            const t = p.life - delay;
            if (t <= 0) return;
            const bloom = Math.min(1, t / 0.8);
            add(c, glow('255,160,200'), p.x, p.y, 1.4 * bloom);
            c.globalCompositeOperation = 'source-over';
            draw(c, lotus(bloom > 0.5), p.x, p.y, 0.45 + 0.6 * bloom, Math.sin(p.life * 1.5 + p.ph) * 0.06);
          },
        });
      }
      rain(api, LOTUS_PETALS, 3800, 0.6, { s0: 0.6, s1: 1 });
      api.sfx.chime(988);
    },
    // รัศมี 7 เศียร: ลำแสงพุ่งจากทั้ง 7 เศียรขึ้นฟ้า ตาลุกโชน นาคแสงเลื้อยวน 1 รอบ
    g8(api) {
      window.PicScene?.kick();
      nagaRoar(api, 0.9, 2800);
      NG.heads.forEach((h, i) =>
        setTimeout(() => {
          const ang = -Math.PI / 2 + (h.x - NG.face.x) / 420;
          addBack(3.4, (c, k, el) => {
            const a = 0.32 * Math.sin(Math.PI * Math.min(1, k * 1.2));
            if (a <= 0) return;
            c.globalCompositeOperation = 'lighter';
            c.translate(h.x, h.y);
            const L = 1100;
            const w = 0.05 + 0.015 * Math.sin(el * 3 + i);
            const g = c.createLinearGradient(0, 0, Math.cos(ang) * L, Math.sin(ang) * L);
            g.addColorStop(0, `rgba(${i % 2 ? AQUA : GOLD},${a})`);
            g.addColorStop(1, `rgba(${i % 2 ? AQUA : GOLD},0)`);
            c.fillStyle = g;
            c.beginPath();
            c.moveTo(0, 0);
            c.arc(0, 0, L, ang - w, ang + w);
            c.closePath();
            c.fill();
          });
        }, i * 90),
      );
      lightNaga(3.6, AQUA, 1, 0.3);
      api.emitter(3600, () => Math.random() < 0.5 && sparkle(api, api.rand(40, 1040), api.rand(260, 1700), AQUA, 1.6, 1.2));
      api.sfx.chime(698);
    },
    // พญานาคประทานพร (ราว 7 วินาที): ปลุกพญานาคเต็มที่ → นาคแสง 2 สายเลื้อยวนสวนกัน → ยันต์ใหญ่ + แก้วมณีเหนือเศียร
    //  → คลื่นพลังแผ่จากสระไปทั้งพื้น → เหรียญทอง + กลีบบัวโปรยทั้งจอ ทุกคนกระโดดดีใจ
    g9(api, user, n, o, label) {
      window.PicScene?.kick();
      nagaRoar(api, 1, 3000);
      setTimeout(() => nagaRoar(api, 1, 2600), 3700);
      api.flash('#bff7f0', 700, 0.26);
      api.bigShow(user, label);
      haloGlow(NG.chest.x, NG.chest.y - 120, AQUA, 520, 7, 0.4);
      yantra(NG.face.x, NG.face.y + 40, 430, 7, AQUA, 0.6);
      lightNaga(4.2, AQUA, 1, 0.2);
      lightNaga(4.2, GOLD, -1, 0.9);
      rays(NG.crown.x, NG.crown.y + 40, [AQUA, GOLD, '255,255,255', SAPH], 7, { n: 22, len: 1500, peak: 0.18, width: 0.06 });
      setTimeout(() => {
        window.PicScene?.kick();
        api.flash('#d6fff4', 400, 0.16);
        pondRipples(4, 2.6, NG.pond.x, NG.pond.y, 700);
        floorWave(AQUA, 4, 2.6, 0.3, NG.base);
        api.crowdWave('wave');
      }, 1600);
      setTimeout(() => coinShower(api, 44, 4200), 1900);
      setTimeout(() => rain(api, [...LOTUS_PETALS, lotus(true)], 4500, 0.55, { s0: 0.45, s1: 0.9 }), 2100);
      setTimeout(() => api.crowdWave('happy'), 3800);
      api.sfx.chime(523);
      setTimeout(() => api.sfx.chime(784), 1600);
    },
  };


  // ---------------------------------------------------------------- ศาลพระพิฆเนศ (ภาพ public/scenes/ganesha + live.png: งวงไกว / พวงมาลัยไกว / เปลวประทีประริก)
  // โทนส้มดาวเรือง + ทอง • ของขวัญ = ประทีปลุกโชน งวงไกวดีใจ (PicScene.rage) • ของใหญ่ = ยันต์ทอง หนูทองวิ่งรอบลาน ขนมโมทกะ + ดาวเรืองโปรย
  const SG = (cx, cy) => NP((552 + cx / 1.8561) / 1536, (467 + cy / 1.8561) / 2752); // ภาพตัดองค์พระ → จอ
  const WG = (cx, cy) => NP((276 + cx / 1.0173) / 1536, (137 + cy / 1.0173) / 2752); // ภาพตัดทั้งแท่นบูชา → จอ
  const GN = {
    face: SG(420, 330), chest: SG(420, 560), body: SG(420, 640), base: SG(420, 1040), altar: WG(500, 960), modak: WG(310, 1030), fruit: WG(690, 1020), floor: WG(500, 1200),
    lamps: [WG(270, 440), WG(735, 440), WG(185, 480), WG(815, 480), WG(70, 550), WG(930, 550), WG(190, 735), WG(815, 735), WG(85, 885), WG(920, 885)],
  };
  const SAFF = '255,170,60';
  const WARM = '255,210,120';
  const MARI_PETALS = [petal('#ffc266', '#ff7a00'), petal('#ffe066', '#ffb000'), petal('#ffd08a', '#ff9418')];
  const marigold = (yellow) =>
    mk('mari' + (yellow ? 'y' : 'o'), 80, 80, (x) => {
      x.translate(40, 40);
      const c0 = yellow ? '#ffe680' : '#ffb347';
      const c1 = yellow ? '#ffbf00' : '#ff6a00';
      for (const [n, r, s] of [[14, 30, 9], [11, 21, 8], [8, 12, 7], [1, 0, 7]]) {
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU + r;
          const g = x.createRadialGradient(Math.cos(a) * r, Math.sin(a) * r, 0, Math.cos(a) * r, Math.sin(a) * r, s);
          g.addColorStop(0, c0);
          g.addColorStop(1, c1);
          x.fillStyle = g;
          x.beginPath();
          x.arc(Math.cos(a) * r, Math.sin(a) * r, s, 0, TAU);
          x.fill();
        }
      }
    });
  const modak = () =>
    mk('modak', 60, 64, (x) => {
      const g = x.createLinearGradient(10, 10, 50, 60);
      g.addColorStop(0, '#fffaf0');
      g.addColorStop(1, '#e9c98f');
      x.fillStyle = g;
      x.beginPath();
      x.moveTo(30, 4);
      x.bezierCurveTo(36, 18, 54, 30, 52, 46);
      x.quadraticCurveTo(48, 60, 30, 60);
      x.quadraticCurveTo(12, 60, 8, 46);
      x.bezierCurveTo(6, 30, 24, 18, 30, 4);
      x.fill();
      x.strokeStyle = 'rgba(170,120,60,.55)';
      x.lineWidth = 1.6;
      for (const dx of [-14, -7, 0, 7, 14]) {
        x.beginPath();
        x.moveTo(30, 8);
        x.quadraticCurveTo(30 + dx * 1.3, 36, 30 + dx, 58);
        x.stroke();
      }
    });
  const diya = () =>
    mk('diya', 90, 50, (x) => {
      const g = x.createLinearGradient(0, 14, 0, 46);
      g.addColorStop(0, '#d9783a');
      g.addColorStop(1, '#8a3d17');
      x.fillStyle = g;
      x.beginPath();
      x.moveTo(6, 18);
      x.quadraticCurveTo(45, 62, 84, 18);
      x.quadraticCurveTo(66, 10, 76, 6);
      x.lineTo(84, 18);
      x.closePath();
      x.fill();
      x.fillStyle = '#f2b35e';
      x.beginPath();
      x.ellipse(45, 18, 39, 6, 0, 0, TAU);
      x.fill();
      x.fillStyle = '#c25a20';
      for (let i = 0; i < 5; i++) {
        x.beginPath();
        x.arc(20 + i * 12, 30, 2.4, 0, TAU);
        x.fill();
      }
    });
  const mouse = () =>
    mk('gmouse', 120, 70, (x) => {
      const g = x.createLinearGradient(0, 10, 0, 64);
      g.addColorStop(0, '#fff1b0');
      g.addColorStop(0.5, '#f2c14a');
      g.addColorStop(1, '#b7801c');
      x.fillStyle = g;
      x.beginPath();
      x.ellipse(52, 42, 34, 20, 0, 0, TAU); // ลำตัว
      x.fill();
      x.beginPath();
      x.ellipse(88, 36, 16, 12, -0.3, 0, TAU); // หัว
      x.fill();
      x.beginPath();
      x.moveTo(98, 34);
      x.lineTo(114, 38);
      x.lineTo(99, 42);
      x.fill(); // จมูก
      x.beginPath();
      x.arc(82, 24, 8, 0, TAU); // หู
      x.fill();
      x.fillStyle = '#ffd6e0';
      x.beginPath();
      x.arc(82, 24, 4.5, 0, TAU);
      x.fill();
      x.fillStyle = '#3a2410';
      x.beginPath();
      x.arc(94, 33, 2.4, 0, TAU);
      x.fill();
      x.strokeStyle = '#d9a43a';
      x.lineWidth = 4;
      x.lineCap = 'round';
      x.beginPath();
      x.moveTo(20, 44);
      x.quadraticCurveTo(2, 40, 6, 22); // หาง
      x.stroke();
      x.fillStyle = '#b7801c';
      for (const fx of [38, 66]) {
        x.beginPath();
        x.ellipse(fx, 60, 6, 4, 0, 0, TAU);
        x.fill();
      }
    });
  // ประทีปทุกดวงในศาลลุกโชน (แสงวาบที่ตะเกียงแต่ละดวง + ให้เปลวในภาพสว่างขึ้นด้วย rage)
  function lampFlare(api, v = 1, ms = 1800) {
    window.PicScene?.rage?.(v, ms);
    GN.lamps.forEach((l, i) =>
      api.spawn({
        x: l.x, y: l.y, max: ms / 1000, fadeIn: 0.15, fadeOut: 0.6, ph: i,
        draw(c, p) {
          add(c, glow(WARM), p.x, p.y, (0.9 + 0.25 * Math.sin(p.life * 11 + p.ph)) * v);
        },
      }),
    );
  }
  const ganesha = {
    // ถวายดอกดาวเรือง: ดอกดาวเรืองบานที่คนส่ง ลอยโค้งไปวางบนแท่นบูชา กลีบส้มแตกกระจาย งวงไกวดีใจ
    g1(api, user, n, o) {
      const yellow = Math.random() < 0.5;
      fly(api, {
        from: { x: o.x + api.rand(-30, 30), y: o.y - 60 }, to: { x: GN.altar.x + api.rand(-170, 170), y: GN.altar.y + api.rand(-6, 10) }, dur: 1.7, delay: 0.4, trail: SAFF,
        draw(c, p, k) {
          const bloom = Math.min(1, p.life / 0.4);
          const s = (0.5 + 0.55 * bloom) * (1 - k * 0.25);
          add(c, glow(SAFF), p.x, p.y, 1.3 * s);
          c.globalCompositeOperation = 'source-over';
          draw(c, marigold(yellow), p.x, p.y, s, p.life * 1.5);
        },
        onArrive: (p) => {
          haloGlow(p.x, p.y, SAFF, 130, 1.1, 0.55);
          for (let i = 0; i < 10; i++) {
            const img = MARI_PETALS[i % 3];
            api.spawn({
              x: p.x, y: p.y, vx: api.rand(-160, 160), vy: api.rand(-220, -60), g: 420, max: 1.4, vr: api.rand(-4, 4), fadeOut: 0.6,
              draw(c, q) {
                draw(c, img, q.x, q.y, 0.45, q.rot);
              },
            });
          }
          window.PicScene?.rage?.(0.3, 1000);
        },
      });
      api.sfx.chime(880);
    },
    // จุดประทีปบูชา: ประทีปดินเผาจุดไฟหน้าคนส่ง → ดวงไฟลอยไปที่องค์พระ → ประทีปทั้งศาลลุกโชน
    g2(api, user, n, o) {
      const x0 = o.x;
      const y0 = o.y - 30;
      api.spawn({
        x: x0, y: y0, max: 1.6, fadeIn: 0.2, fadeOut: 0.8,
        draw(c, p) {
          draw(c, diya(), p.x, p.y, 0.8);
          const fl = 1 + Math.sin(p.life * 23) * 0.1;
          add(c, glow('255,190,90'), p.x + 4, p.y - 18, 0.75 * fl);
        },
      });
      setTimeout(
        () =>
          fly(api, {
            from: { x: x0 + 4, y: y0 - 18 }, to: GN.face, dur: 1.4, trail: WARM,
            draw(c, q) {
              add(c, glow('255,200,110'), q.x, q.y, 0.95 + 0.3 * Math.sin(q.life * 9));
            },
            onArrive: () => {
              lampFlare(api, 0.6, 1600);
              haloGlow(GN.face.x, GN.face.y, WARM, 220, 1.6, 0.55);
              rings(GN.face.x, GN.face.y, SAFF, 2, 1.6, 260);
            },
          }),
        900,
      );
      api.sfx.chime(660);
    },
    // ถวายพวงมาลัย: พวงมาลัยลอยไปคล้ององค์พระ ดอกไม้ร่วงพรู
    g3(api, user, n, o) {
      fly(api, {
        from: { x: o.x, y: o.y - 70 }, to: { x: GN.chest.x, y: GN.chest.y - 10 }, dur: 2, hold: 0.8, trail: '255,240,210',
        draw(c, p, k) {
          add(c, glow('255,240,200'), p.x, p.y, 1.6 - k * 0.4);
          c.globalCompositeOperation = 'source-over';
          draw(c, garland(), p.x, p.y, 1 - k * 0.3, Math.sin(p.life * 3) * 0.18);
        },
        onArrive: (p) => {
          haloGlow(p.x, p.y, '255,240,210', 170, 1.5, 0.55);
          window.PicScene?.rage?.(0.4, 1400);
          for (let i = 0; i < 14; i++) {
            const img = i % 2 ? JASMINE[0] : MARI_PETALS[i % 3];
            api.spawn({
              x: p.x + api.rand(-60, 60), y: p.y + api.rand(-20, 30), vx: api.rand(-60, 60), vy: api.rand(-40, 40), g: 120, max: 2.6, vr: api.rand(-3, 3), fadeOut: 0.6,
              draw(c, q) {
                draw(c, img, q.x, q.y, 0.5, q.rot);
              },
            });
          }
        },
      });
      api.sfx.chime(784);
    },
    // ถวายขนมโมทกะ: ขนมโมทกะ (ขนมโปรดของพระพิฆเนศ) ลอยเรียงไปกองบนจาน งวงไกวดีใจ
    g4(api, user, n, o) {
      api.spot(user, { rgb: '255,220,160', fallback: { x: 540, y: 1400 } });
      for (let i = 0; i < 7; i++) {
        fly(api, {
          from: { x: o.x + api.rand(-20, 20), y: o.y - 60 }, to: { x: GN.modak.x + api.rand(-40, 40), y: GN.modak.y - 6 - (i % 3) * 8 }, dur: 1.3, delay: 0.2 + i * 0.16, trail: WARM,
          draw(c, p, k) {
            add(c, glow(WARM), p.x, p.y, 0.6);
            c.globalCompositeOperation = 'source-over';
            draw(c, modak(), p.x, p.y, 0.75 - k * 0.2, Math.sin(p.life * 4) * 0.2);
          },
          onArrive: (p) => sparkle(api, p.x, p.y - 10, WARM, 0.9),
        });
      }
      setTimeout(() => {
        window.PicScene?.rage?.(0.8, 2200);
        haloGlow(GN.face.x, GN.face.y + 20, WARM, 260, 2, 0.5);
        for (let i = 0; i < 12; i++) sparkle(api, GN.face.x + api.rand(-90, 90), GN.face.y + api.rand(-60, 80), GOLD, 1.2);
      }, 1700);
      api.sfx.chime(660);
    },
    // สวดมนต์บูชา: ดวงไฟจากทุกคนลอยไปรวมที่องค์พระ ยันต์ทองหมุนหลังองค์ ประทีปลุกโชน
    g5(api) {
      api.crowdWave('happy');
      fansList(api).slice(0, 36).forEach((f, i) => {
        const col = i % 2 ? GOLD : SAFF;
        fly(api, {
          from: headOf(f), to: { x: GN.chest.x + api.rand(-60, 60), y: GN.chest.y + api.rand(-80, 40) }, dur: 1.9, delay: 0.2 + (i % 12) * 0.07,
          draw(c, p) {
            add(c, glow(col), p.x, p.y, 0.5);
          },
        });
      });
      setTimeout(() => {
        lampFlare(api, 0.7, 2600);
        yantra(GN.chest.x, GN.chest.y - 30, 260, 4.2, GOLD, 0.65);
        rings(GN.chest.x, GN.chest.y, SAFF, 3, 2.6, 480);
      }, 1500);
      api.sfx.chime(523);
    },
    // ตีระฆังรับโชค: ระฆังทอง 2 ใบแกว่งข้างองค์พระ คลื่นเสียงทองแผ่ • เหรียญทองร่วงกราว
    g6(api) {
      window.PicScene?.kick();
      window.PicScene?.rage?.(0.5, 2400);
      for (const [bx, by, ph] of [[GN.face.x - 170, GN.face.y - 40, 0], [GN.face.x + 170, GN.face.y - 40, 1.3]]) {
        api.spawn({
          x: bx, y: by, max: 3.4, fadeIn: 0.2, fadeOut: 0.8,
          draw(c, p) {
            c.save();
            c.translate(p.x, p.y - 70);
            c.rotate(Math.sin(p.life * 6 + ph) * 0.35 * Math.exp(-p.life * 0.5));
            add(c, glow(GOLD), 0, 80, 1.6);
            c.globalCompositeOperation = 'source-over';
            c.drawImage(bell(), -55, 0, 110, 130);
            c.restore();
          },
        });
        for (let i = 0; i < 3; i++) setTimeout(() => rings(bx, by + 40, GOLD, 2, 2, 520), i * 650);
      }
      coinShower(api, 24, 2600);
      [784, 659, 523].forEach((f, i) => setTimeout(() => api.sfx.chime(f), i * 650));
    },
    // ดาวเรืองบาน: ดอกดาวเรืองผุดบานทั่วลานรอบคนดู แสงอุ่นลอยคลุมพื้น กลีบส้มเหลืองโปรยทั้งจอ
    g7(api) {
      window.PicScene?.kick();
      lampFlare(api, 0.5, 2200);
      addBack(4.6, (c, k, el) => {
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = 0.4 * Math.sin(Math.PI * k);
        for (let i = 0; i < 5; i++) {
          const x = ((i * 260 + el * 70) % 1400) - 160;
          c.drawImage(glow(SAFF), x - 260, 1000 + (i % 2) * 240, 520, 240);
        }
      });
      for (let i = 0; i < 16; i++) {
        const delay = i * 0.1;
        const yellow = i % 2 === 0;
        api.spawn({
          x: api.rand(80, 1000), y: api.rand(1100, 1680), vy: -10, max: 4.4, fadeIn: 0.2, fadeOut: 0.75,
          draw(c, p) {
            const t = p.life - delay;
            if (t <= 0) return;
            const bloom = Math.min(1, t / 0.7);
            add(c, glow(SAFF), p.x, p.y, 1.2 * bloom);
            c.globalCompositeOperation = 'source-over';
            draw(c, marigold(yellow), p.x, p.y, 0.25 + 0.55 * ease(bloom), p.life * 0.6);
          },
        });
      }
      rain(api, MARI_PETALS, 3800, 0.65, { s0: 0.55, s1: 0.95 });
      api.sfx.chime(988);
    },
    // แสงทองส่องศาล: รัศมีทองจากองค์พระสาดทั้งจอ ประทีปทุกดวงลุกโชน แสงวาบพาดผ่านองค์ ประกายลอยทั่วศาล
    g8(api) {
      window.PicScene?.kick();
      lampFlare(api, 1, 3600);
      haloGlow(GN.face.x, GN.face.y + 80, GOLD, 360, 4.4, 0.3);
      rays(GN.face.x, GN.face.y + 40, [GOLD, SAFF, '255,245,210', '255,190,120'], 4.4, { n: 20, len: 1300, peak: 0.14, width: 0.06 });
      yantra(GN.chest.x, GN.chest.y - 30, 300, 4.4, '255,230,150', 0.4);
      sheen(1.2, 0.4);
      api.emitter(4000, () => Math.random() < 0.55 && sparkle(api, api.rand(40, 1040), api.rand(260, 1700), GOLD, 1.6, 1.2));
      api.sfx.chime(698);
    },
    // พิฆเนศประทานพร (ราว 7 วินาที): แสงวาบ → ยันต์ใหญ่ + รัศมี ประทีปลุกโชนทั้งศาล งวงไกวแรง
    //  → หนูทอง (พาหนะของพระพิฆเนศ) วิ่งข้ามลาน → คลื่นทองแผ่ทั่วพื้น → ขนมโมทกะ + ดาวเรือง + เหรียญทองโปรยทั้งจอ
    g9(api, user, n, o, label) {
      window.PicScene?.kick();
      api.flash('#ffe2a8', 700, 0.26);
      api.bigShow(user, label);
      lampFlare(api, 1, 6500);
      haloGlow(GN.chest.x, GN.chest.y - 60, GOLD, 480, 7, 0.28);
      yantra(GN.chest.x, GN.chest.y - 30, 380, 7, GOLD, 0.6);
      rays(GN.face.x, GN.face.y + 40, [GOLD, SAFF, '255,245,210', '255,190,120'], 7, { n: 22, len: 1500, peak: 0.14, width: 0.06 });
      sheen(1.4, 0.3);
      // หนูทองวิ่งข้ามลาน (ซ้าย → ขวา) ทิ้งประกายทองตามทาง
      setTimeout(() => {
        api.spawn({
          x: -80, y: 1030, vx: 430, max: 3.2, fadeIn: 0.1, fadeOut: 0.95,
          update(p) {
            p.y = 1030 + Math.abs(Math.sin(p.life * 14)) * -14;
            if (Math.random() < 0.6) sparkle(api, p.x - 40, p.y + 20, GOLD, 0.9);
          },
          draw(c, p) {
            add(c, glow(GOLD), p.x, p.y, 1.1);
            c.globalCompositeOperation = 'source-over';
            draw(c, mouse(), p.x, p.y, 1.1);
          },
        });
      }, 900);
      setTimeout(() => {
        window.PicScene?.kick();
        floorWave(SAFF, 4, 2.6, 0.3, GN.floor);
        api.crowdWave('wave');
      }, 1500);
      setTimeout(() => coinShower(api, 36, 4000), 1900);
      setTimeout(() => rain(api, [...MARI_PETALS, modak(), marigold(false), marigold(true)], 4500, 0.6, { s0: 0.45, s1: 0.85 }), 2100);
      setTimeout(() => api.crowdWave('happy'), 3800);
      api.sfx.chime(523);
      setTimeout(() => api.sfx.fanfare?.(), 1500);
    },
  };

  // ---------------------------------------------------------------- ศาลพระตรีมูรติ (ภาพ public/scenes/trimurti + live: ซุ้มกุหลาบไกว / เปลวเทียน+ไฟเมืองระยิบ, live2: องค์พระหายใจ)
  // โทนชมพู-แดงกุหลาบ + ทอง (ขอพรความรัก) • ด้ายแดงผูกรัก ควันธูปเป็นรูปหัวใจ หัวใจแสงยักษ์ล้อมองค์พระ
  const TS = (cx, cy) => NP((337 + cx / 1.16144) / 1536, (357 + cy / 1.16144) / 2752); // ภาพตัดซุ้มกุหลาบ → จอ
  const TM = {
    face: TS(500, 410), chest: TS(500, 520), lap: TS(500, 680), base: TS(500, 840), incense: TS(505, 870), altar: TS(505, 1060), floor: TS(500, 1440), archTop: TS(505, 110),
    candles: [TS(183, 995), TS(230, 915), TS(300, 958), TS(705, 955), TS(772, 915), TS(830, 995)],
    bless: ['สมหวังในรัก 💗', 'คนรักรักมั่น', 'โสดจะได้เจอคนดี', 'รักกันนาน ๆ', 'มีแต่คนเอ็นดู', 'เสน่ห์แรงสุด ๆ', 'หัวใจพองโต', 'คู่แท้อยู่ไม่ไกล', 'รักปัง งานปัง', 'สมหวังดังใจ'],
  };
  const PINK = '255,120,170';
  const ROSEG = '255,90,120';
  const RED_PETALS = [petal('#ff7a8a', '#c4102c'), petal('#ff9aa8', '#e0203f'), petal('#ffc0cc', '#ff5c7a')];
  const redRose = () =>
    mk('redrose', 110, 110, (x) => {
      x.translate(55, 55);
      x.fillStyle = '#2f7a3a';
      for (const a of [0.7, 2.4, 4.1]) {
        x.save();
        x.rotate(a);
        x.beginPath();
        x.ellipse(0, 40, 9, 16, 0, 0, TAU);
        x.fill();
        x.restore();
      }
      for (const [n, R, rx, ry, c0, c1] of [[6, 22, 18, 22, '#e8304c', '#8f0a1e'], [5, 13, 15, 18, '#f0405a', '#a80e26'], [4, 6, 11, 13, '#ff5a72', '#c0122e']]) {
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU + R;
          const g = x.createRadialGradient(Math.cos(a) * R * 0.6, Math.sin(a) * R * 0.6, 2, Math.cos(a) * R * 0.6, Math.sin(a) * R * 0.6, ry);
          g.addColorStop(0, c0);
          g.addColorStop(1, c1);
          x.fillStyle = g;
          x.beginPath();
          x.ellipse(Math.cos(a) * R * 0.6, Math.sin(a) * R * 0.6, rx, ry, a, 0, TAU);
          x.fill();
        }
      }
      x.fillStyle = '#7a0618';
      x.beginPath();
      x.arc(0, 0, 4, 0, TAU);
      x.fill();
    });
  const heart = (col = '#ff4f86') =>
    mk('heart' + col, 64, 60, (x) => {
      const g = x.createRadialGradient(22, 18, 2, 32, 30, 34);
      g.addColorStop(0, '#fff0f5');
      g.addColorStop(0.35, col);
      g.addColorStop(1, '#a8123e');
      x.fillStyle = g;
      x.beginPath();
      x.moveTo(32, 56);
      x.bezierCurveTo(4, 36, 0, 16, 14, 8);
      x.bezierCurveTo(24, 2, 32, 10, 32, 16);
      x.bezierCurveTo(32, 10, 40, 2, 50, 8);
      x.bezierCurveTo(64, 16, 60, 36, 32, 56);
      x.fill();
    });
  // จุดบนเส้นรูปหัวใจ (t 0..2π) → ขนาดราว -1..1
  const heartPt = (t) => ({ x: Math.pow(Math.sin(t), 3), y: -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16 });
  function floatHearts(api, x, y, n = 3, spread = 30) {
    for (let i = 0; i < n; i++) {
      const col = ['#ff4f86', '#ff6b9d', '#ff2d55'][i % 3];
      api.spawn({
        x: x + api.rand(-spread, spread), y, vx: api.rand(-30, 30), vy: api.rand(-150, -90), max: 1.8, fadeIn: 0.1, fadeOut: 0.55, ph: Math.random() * 6, delay: i * 0.08,
        draw(c, p) {
          const s = 0.45 + 0.08 * Math.sin(p.life * 8 + p.ph);
          add(c, glow(PINK), p.x, p.y, 0.5);
          c.globalCompositeOperation = 'source-over';
          draw(c, heart(col), p.x, p.y, s, Math.sin(p.life * 3 + p.ph) * 0.2);
        },
      });
    }
  }
  // ด้ายแดง: เส้นแสงสีแดงลากจาก a ผ่านเหนือองค์พระ ไป b (ค่อย ๆ ลากเส้น แล้วเรืองค้าง)
  function redThread(a, b, dur = 3.6) {
    const c1 = { x: (a.x + TM.face.x) / 2 - 60, y: TM.face.y - 40 };
    const c2 = { x: (b.x + TM.face.x) / 2 + 60, y: TM.face.y - 40 };
    const pt = (t) => {
      const u = 1 - t;
      return { x: u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * b.x, y: u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * b.y };
    };
    addBack(dur, (c, k, el) => {
      const prog = Math.min(1, k / 0.35);
      const fade = Math.min(1, (1 - k) * 4);
      c.globalCompositeOperation = 'lighter';
      for (const [w, al, col] of [[16, 0.18, ROSEG], [6, 0.6, '255,60,90'], [2, 0.9, '255,220,230']]) {
        c.strokeStyle = `rgba(${col},${al * fade})`;
        c.lineWidth = w;
        c.lineCap = 'round';
        c.beginPath();
        for (let i = 0; i <= 60 * prog; i++) {
          const p = pt(i / 60);
          if (i) c.lineTo(p.x, p.y);
          else c.moveTo(p.x, p.y);
        }
        c.stroke();
      }
      // ประกายวิ่งไปตามเส้น
      const q = pt((el * 0.6) % 1);
      c.globalAlpha = fade;
      c.drawImage(glow('255,200,220'), q.x - 22, q.y - 22, 44, 44);
    });
  }
  const trimurti = {
    // ถวายกุหลาบแดง: กุหลาบแดงบานที่คนส่ง ลอยไปวางบนแปลงกุหลาบหน้าองค์พระ กลีบแดงแตกกระจาย
    g1(api, user, n, o) {
      fly(api, {
        from: { x: o.x + api.rand(-30, 30), y: o.y - 60 }, to: { x: TM.altar.x + api.rand(-170, 170), y: TM.altar.y + api.rand(-8, 10) }, dur: 1.7, delay: 0.4, trail: PINK,
        draw(c, p, k) {
          const bloom = Math.min(1, p.life / 0.4);
          const s = (0.45 + 0.5 * bloom) * (1 - k * 0.25);
          add(c, glow(ROSEG), p.x, p.y, 1.3 * s);
          c.globalCompositeOperation = 'source-over';
          draw(c, redRose(), p.x, p.y, s, Math.sin(p.life * 2) * 0.15);
        },
        onArrive: (p) => {
          haloGlow(p.x, p.y, PINK, 130, 1.1, 0.55);
          window.PicScene?.rage?.(0.3, 1000);
          for (let i = 0; i < 10; i++) {
            const img = RED_PETALS[i % 3];
            api.spawn({
              x: p.x, y: p.y, vx: api.rand(-160, 160), vy: api.rand(-220, -60), g: 420, max: 1.4, vr: api.rand(-4, 4), fadeOut: 0.6,
              draw(c, q) {
                draw(c, img, q.x, q.y, 0.45, q.rot);
              },
            });
          }
        },
      });
      api.sfx.chime(880);
    },
    // จุดเทียนอธิษฐาน: เทียนติดไฟหน้าคนส่ง ดวงไฟลอยไปหาองค์พระ → เทียนทุกเล่มลุกโชน ชมพูเรืองทั้งองค์
    g2(api, user, n, o) {
      candle(api, o.x, o.y - 20, 3000, (p) => {
        fly(api, {
          from: { x: p.x, y: p.y - 50 }, to: TM.face, dur: 1.4, trail: '255,200,160',
          draw(c, q) {
            add(c, glow('255,190,140'), q.x, q.y, 0.95 + 0.3 * Math.sin(q.life * 9));
          },
          onArrive: () => {
            window.PicScene?.rage?.(0.6, 1600);
            haloGlow(TM.face.x, TM.face.y + 40, PINK, 230, 1.6, 0.5);
            rings(TM.face.x, TM.face.y, '255,200,220', 2, 1.6, 260);
            floatHearts(api, TM.face.x, TM.face.y - 20, 3);
          },
        });
      });
      api.sfx.chime(660);
    },
    // ถวายพวงมาลัย: พวงมาลัยลอยไปคล้ององค์พระ กลีบกุหลาบร่วงพรู
    g3(api, user, n, o) {
      fly(api, {
        from: { x: o.x, y: o.y - 70 }, to: { x: TM.chest.x, y: TM.chest.y }, dur: 2, hold: 0.8, trail: '255,230,240',
        draw(c, p, k) {
          add(c, glow('255,230,240'), p.x, p.y, 1.6 - k * 0.4);
          c.globalCompositeOperation = 'source-over';
          draw(c, garland(), p.x, p.y, 1 - k * 0.3, Math.sin(p.life * 3) * 0.18);
        },
        onArrive: (p) => {
          haloGlow(p.x, p.y, PINK, 170, 1.5, 0.5);
          window.PicScene?.rage?.(0.4, 1400);
          for (let i = 0; i < 14; i++) {
            const img = RED_PETALS[i % 3];
            api.spawn({
              x: p.x + api.rand(-60, 60), y: p.y + api.rand(-20, 30), vx: api.rand(-60, 60), vy: api.rand(-40, 40), g: 120, max: 2.6, vr: api.rand(-3, 3), fadeOut: 0.6,
              draw(c, q) {
                draw(c, img, q.x, q.y, 0.5, q.rot);
              },
            });
          }
        },
      });
      api.sfx.chime(784);
    },
    // ธูปอธิษฐานรัก: ควันธูปลอยขึ้นแล้วรวมตัวเป็นรูปหัวใจ ค่อย ๆ ขยาย เรืองชมพู
    g4(api, user, n, o) {
      api.spot(user, { rgb: '255,200,220', fallback: { x: 540, y: 1400 } });
      const src = TM.incense;
      const N = 40;
      for (let i = 0; i < N; i++) {
        const t = (i / N) * TAU;
        const hp0 = heartPt(t);
        api.spawn({
          x: src.x, y: src.y, max: 3.4, fadeIn: 0.3, fadeOut: 0.6, ph: Math.random() * 6,
          update(p) {
            const k = ease(Math.min(1, p.life / 2.2));
            const S = 20 + k * 120;
            p.x = src.x + hp0.x * S + Math.sin(p.life * 2 + p.ph) * 4;
            p.y = src.y - k * 300 + hp0.y * S;
          },
          draw(c, p) {
            c.globalAlpha *= 0.55;
            add(c, glow(i % 3 ? PINK : '255,230,240'), p.x, p.y, 0.32);
          },
        });
      }
      setTimeout(() => {
        window.PicScene?.rage?.(0.5, 1600);
        floatHearts(api, src.x, src.y - 300, 5, 80);
      }, 2200);
      api.sfx.chime(660);
    },
    // สวดขอพรความรัก: ดวงไฟจากทุกคนลอยไปรวมที่องค์พระ ยันต์ชมพูหมุนหลังองค์ หัวใจลอยขึ้น
    g5(api) {
      api.crowdWave('happy');
      fansList(api).slice(0, 36).forEach((f, i) => {
        const col = i % 2 ? GOLD : PINK;
        fly(api, {
          from: headOf(f), to: { x: TM.chest.x + api.rand(-60, 60), y: TM.chest.y + api.rand(-80, 40) }, dur: 1.9, delay: 0.2 + (i % 12) * 0.07,
          draw(c, p) {
            add(c, glow(col), p.x, p.y, 0.5);
          },
        });
      });
      setTimeout(() => {
        window.PicScene?.rage?.(0.7, 2600);
        yantra(TM.chest.x, TM.chest.y - 30, 260, 4.2, PINK, 0.6);
        rings(TM.chest.x, TM.chest.y, '255,200,220', 3, 2.6, 480);
        floatHearts(api, TM.chest.x, TM.chest.y, 6, 120);
      }, 1500);
      api.sfx.chime(523);
    },
    // ด้ายแดงผูกรัก: ด้ายแดงเรืองแสงโยงจากคนส่ง ผ่านเหนือองค์พระ ไปหาอีกคนในลาน หัวใจผุดสองปลาย • กลีบกุหลาบโปรย
    g6(api, user) {
      window.PicScene?.kick();
      window.PicScene?.rage?.(0.5, 2400);
      const list = fansList(api);
      const me = user && api.fanPos(user.id);
      const a = me ? { x: me.x, y: me.y - 20 } : list[0] ? headOf(list[0]) : { x: 260, y: 1300 };
      const others = list.map(headOf).filter((h) => Math.abs(h.x - a.x) > 220);
      const b = others.length ? others[(Math.random() * others.length) | 0] : { x: 1080 - a.x, y: a.y };
      redThread(a, b, 3.8);
      setTimeout(() => {
        floatHearts(api, a.x, a.y - 30, 4);
        floatHearts(api, b.x, b.y - 30, 4);
        haloGlow(TM.face.x, TM.face.y - 40, PINK, 160, 1.6, 0.5);
        floatHearts(api, TM.face.x, TM.face.y - 60, 3);
      }, 1300);
      rain(api, RED_PETALS, 2800, 0.55, { s0: 0.5, s1: 0.9 });
      [784, 988, 1175].forEach((f, i) => setTimeout(() => api.sfx.chime(f), i * 450));
    },
    // กุหลาบบานทั่วลาน: กุหลาบแดงผุดบานรอบคนดู หมอกชมพูคลุมพื้น กลีบแดงโปรยทั้งจอ
    g7(api) {
      window.PicScene?.kick();
      window.PicScene?.rage?.(0.5, 2200);
      addBack(4.6, (c, k, el) => {
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = 0.4 * Math.sin(Math.PI * k);
        for (let i = 0; i < 5; i++) {
          const x = ((i * 260 + el * 70) % 1400) - 160;
          c.drawImage(glow(PINK), x - 260, 1100 + (i % 2) * 240, 520, 240);
        }
      });
      for (let i = 0; i < 16; i++) {
        const delay = i * 0.1;
        api.spawn({
          x: api.rand(80, 1000), y: api.rand(1160, 1700), vy: -10, max: 4.4, fadeIn: 0.2, fadeOut: 0.75, ph: Math.random() * 6,
          draw(c, p) {
            const t = p.life - delay;
            if (t <= 0) return;
            const bloom = Math.min(1, t / 0.7);
            add(c, glow(ROSEG), p.x, p.y, 1.1 * bloom);
            c.globalCompositeOperation = 'source-over';
            draw(c, redRose(), p.x, p.y, 0.2 + 0.5 * ease(bloom), Math.sin(p.life * 1.4 + p.ph) * 0.1);
          },
        });
      }
      rain(api, RED_PETALS, 3800, 0.65, { s0: 0.55, s1: 0.95 });
      api.sfx.chime(988);
    },
    // แสงรักส่องศาล: รัศมีชมพูทองจากองค์พระสาดทั้งจอ เทียนลุกโชน หัวใจลอยขึ้นทั่วศาล
    g8(api) {
      window.PicScene?.kick();
      window.PicScene?.rage?.(1, 3600);
      haloGlow(TM.face.x, TM.face.y + 80, PINK, 360, 4.4, 0.32);
      rays(TM.face.x, TM.face.y + 40, [PINK, GOLD, '255,230,240', ROSEG], 4.4, { n: 20, len: 1300, peak: 0.16, width: 0.06 });
      sheen(1.2, 0.4);
      api.emitter(3800, () => {
        if (Math.random() < 0.2) floatHearts(api, api.rand(60, 1020), api.rand(900, 1700), 1, 0);
        if (Math.random() < 0.4) sparkle(api, api.rand(40, 1040), api.rand(260, 1700), '255,200,220', 1.4, 1.1);
      });
      api.sfx.chime(698);
    },
    // ประทานพรความรัก (ราว 7 วินาที): แสงวาบชมพู → หัวใจแสงยักษ์ค่อย ๆ วาดล้อมองค์พระ เต้นตุบ ๆ
    //  → หัวใจแตกเป็นกลีบกุหลาบพุ่งออก → คลื่นชมพูแผ่ทั่วพื้น → หัวใจ + กลีบกุหลาบโปรยทั้งจอ ทุกคนกระโดดดีใจ
    g9(api, user, n, o, label) {
      window.PicScene?.kick();
      window.PicScene?.rage?.(1, 6500);
      api.flash('#ffd6e4', 700, 0.26);
      api.bigShow(user, label);
      yantra(TM.chest.x, TM.chest.y - 30, 360, 7, PINK, 0.5);
      rays(TM.face.x, TM.face.y + 40, [PINK, GOLD, '255,230,240'], 7, { n: 22, len: 1500, peak: 0.14, width: 0.06 });
      const C = { x: TM.chest.x, y: TM.chest.y - 10 };
      const SZ = 330;
      addBack(5.2, (c, k, el) => {
        const fade = Math.min(1, (1 - k) * 5);
        const drawn = Math.min(1, el / 1.4);
        const beat = 1 + 0.06 * Math.max(0, Math.sin(el * 7)) * (el > 1.4 ? 1 : 0);
        c.globalCompositeOperation = 'lighter';
        const N = 90;
        for (let i = 0; i < N * drawn; i++) {
          const p = heartPt((i / N) * TAU);
          const x = C.x + p.x * SZ * beat;
          const y = C.y + p.y * SZ * beat;
          c.globalAlpha = fade * 0.9;
          c.drawImage(glow(i % 4 ? ROSEG : '255,230,240'), x - 26, y - 26, 52, 52);
        }
      });
      setTimeout(() => {
        window.PicScene?.kick();
        api.flash('#ffe4ee', 400, 0.18);
        for (let i = 0; i < 44; i++) {
          const p = heartPt((i / 44) * TAU);
          const img = RED_PETALS[i % 3];
          api.spawn({
            x: C.x + p.x * SZ, y: C.y + p.y * SZ, vx: p.x * 260 + api.rand(-40, 40), vy: p.y * 260 - 60, g: 140, max: 2.6, vr: api.rand(-4, 4), fadeOut: 0.6,
            draw(c, q) {
              draw(c, img, q.x, q.y, 0.6, q.rot);
            },
          });
        }
        floorWave(PINK, 4, 2.6, 0.3, TM.floor);
        api.crowdWave('wave');
      }, 3200);
      setTimeout(() => rain(api, [...RED_PETALS, heart('#ff4f86'), heart('#ff2d55'), redRose()], 4500, 0.6, { s0: 0.4, s1: 0.8 }), 3400);
      setTimeout(() => api.crowdWave('happy'), 4600);
      api.sfx.chime(523);
      setTimeout(() => api.sfx.fanfare?.(), 3200);
    },
  };

  // ---------------------------------------------------------------- ศาลไฉ่ซิงเอี๊ยะ (ภาพ public/scenes/caishen + live: มังกรทองบนเสาเลื้อย / โคมแดงแกว่ง / แสงโคม+เทียน, live2: องค์หายใจ)
  // โทนแดงจีน + ทอง (โชคลาภ เงินทอง) • ก้อนทอง ส้มมงคล อั่งเปา ฝนเหรียญ มังกรทองเหินรอบองค์ ประทัด
  const CP = (cx, cy) => NP(cx / 1000, cy / 1791.7); // ภาพตัด c_wide → จอ
  const CS = {
    face: CP(500, 470), ingot: CP(500, 565), chest: CP(500, 600), lap: CP(500, 690), base: CP(500, 750), altar: CP(500, 790), incense: CP(500, 770), floor: CP(500, 1060),
    oranges: [CP(330, 790), CP(665, 790)], top: CP(500, 330),
    bless: ['รวย ๆ เฮง ๆ', 'เงินไหลมาเทมา', 'ค้าขายร่ำรวย', 'โชคลาภมาเต็ม', 'ปังทั้งปี', 'ทรัพย์สมบูรณ์', 'เฮงตลอดปี', 'มั่งมีศรีสุข', 'กระเป๋าตุง ๆ', 'งานปัง เงินปัง'],
  };
  const CRED = '255,70,50';
  const CGOLD = '255,200,90';
  const CNY_CONF = [petal('#ff5040', '#c41010'), petal('#ffd24a', '#e0a010'), petal('#ff7a5a', '#e02a1a')];
  const mandarin = () =>
    mk('mandarin', 64, 64, (x) => {
      const g = x.createRadialGradient(24, 24, 3, 32, 34, 28);
      g.addColorStop(0, '#ffd27a');
      g.addColorStop(0.5, '#ff9a1f');
      g.addColorStop(1, '#d4620a');
      x.fillStyle = g;
      x.beginPath();
      x.ellipse(32, 36, 26, 23, 0, 0, TAU);
      x.fill();
      x.fillStyle = '#3d8a3a';
      x.beginPath();
      x.ellipse(40, 12, 11, 5, -0.5, 0, TAU);
      x.fill();
      x.fillStyle = '#5a3a1a';
      x.fillRect(31, 10, 3, 6);
    });
  const yuanbao = () =>
    mk('yuanbao', 96, 64, (x) => {
      const g = x.createLinearGradient(0, 10, 0, 60);
      g.addColorStop(0, '#fff3b0');
      g.addColorStop(0.45, '#f6c64e');
      g.addColorStop(1, '#b7801c');
      x.fillStyle = g;
      x.beginPath(); // ตัวเรือ
      x.moveTo(4, 26);
      x.quadraticCurveTo(10, 60, 48, 60);
      x.quadraticCurveTo(86, 60, 92, 26);
      x.quadraticCurveTo(70, 40, 48, 40);
      x.quadraticCurveTo(26, 40, 4, 26);
      x.fill();
      x.beginPath(); // โดมกลาง
      x.ellipse(48, 32, 20, 16, 0, Math.PI, 0);
      x.fill();
      x.strokeStyle = 'rgba(255,250,220,.8)';
      x.lineWidth = 2;
      x.beginPath();
      x.ellipse(48, 30, 13, 9, 0, Math.PI * 1.1, Math.PI * 1.6);
      x.stroke();
    });
  const angpao = () =>
    mk('angpao', 56, 76, (x) => {
      const g = x.createLinearGradient(0, 0, 56, 76);
      g.addColorStop(0, '#ff4a3a');
      g.addColorStop(1, '#b80c12');
      x.fillStyle = g;
      x.beginPath();
      x.roundRect(4, 4, 48, 68, 6);
      x.fill();
      x.fillStyle = '#9a0a10';
      x.beginPath();
      x.moveTo(4, 10);
      x.quadraticCurveTo(28, 34, 52, 10);
      x.lineTo(52, 6);
      x.lineTo(4, 6);
      x.fill();
      x.fillStyle = '#ffd24a';
      x.beginPath();
      x.arc(28, 42, 11, 0, TAU);
      x.fill();
      x.fillStyle = '#c41010';
      x.font = 'bold 14px sans-serif';
      x.textAlign = 'center';
      x.fillText('福', 28, 47);
    });
  const lanternS = () =>
    mk('lanternS', 70, 110, (x) => {
      x.strokeStyle = '#c99a2e';
      x.lineWidth = 2;
      x.beginPath();
      x.moveTo(35, 0);
      x.lineTo(35, 14);
      x.stroke();
      x.fillStyle = '#d9a43a';
      x.fillRect(22, 12, 26, 6);
      x.fillRect(22, 76, 26, 6);
      const g = x.createRadialGradient(28, 40, 4, 35, 46, 34);
      g.addColorStop(0, '#ffb070');
      g.addColorStop(0.5, '#f02a1a');
      g.addColorStop(1, '#a00a0a');
      x.fillStyle = g;
      x.beginPath();
      x.ellipse(35, 47, 31, 30, 0, 0, TAU);
      x.fill();
      x.strokeStyle = 'rgba(120,10,10,.5)';
      x.lineWidth = 1.5;
      for (const dx of [-18, -6, 6, 18]) {
        x.beginPath();
        x.ellipse(35, 47, Math.abs(dx), 30, 0, 0, TAU);
        x.stroke();
      }
      x.strokeStyle = '#ffc94a';
      x.lineWidth = 2;
      for (let i = 0; i < 7; i++) {
        x.beginPath();
        x.moveTo(29 + i * 2, 82);
        x.lineTo(28 + i * 2.3, 106);
        x.stroke();
      }
    });
  // มังกรแสง: ลำตัวเรืองแสงเลื้อยเป็นเกลียวรอบองค์ไฉ่ซิงเอี๊ยะขึ้นไปด้านบน (แบบเดียวกับนาคแสง แต่โทนทอง/แดง มีเกล็ดระยิบ)
  function dragonRibbon(dur, rgb = CGOLD, dir = 1, delay = 0) {
    setTimeout(
      () =>
        addBack(dur, (c, k, el) => {
          const fade = Math.min(1, k * 6) * Math.min(1, (1 - k) * 4);
          if (fade <= 0) return;
          c.globalCompositeOperation = 'lighter';
          const head = ease(Math.min(1, el / (dur * 0.75))) * 1.15;
          const N = 50;
          for (let i = 0; i < N; i++) {
            const u = head - i * 0.02;
            if (u < 0) break;
            const ang = dir * (u * 10 + el * 0.7);
            const R = 140 * (1 - u * 0.45);
            const x = CS.chest.x + Math.cos(ang) * R;
            const y = CS.floor.y - 60 - u * 980 + Math.sin(ang) * R * 0.22;
            const s = (1 - i / N) * (i === 0 ? 1.9 : 1) * (1 + 0.15 * Math.sin(i * 1.7 + el * 8));
            c.globalAlpha = fade * (0.45 + 0.55 * (1 - i / N));
            const r = 50 * s + 10;
            c.drawImage(glow(i % 5 === 0 ? '255,255,220' : rgb), x - r, y - r, r * 2, r * 2);
          }
        }),
      delay * 1000,
    );
  }
  // ประทัด: ประกายแดง/ทองแตกกระจาย + เสียงปัง
  function firecracker(api, x, y) {
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * TAU;
      const sp = api.rand(140, 340);
      api.spawn({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 300, drag: 1.2, max: api.rand(0.6, 1.1), fadeOut: 0.4,
        draw(c, p) {
          add(c, glow(i % 2 ? CRED : CGOLD), p.x, p.y, 0.22);
        },
      });
    }
    haloGlow(x, y, CGOLD, 90, 0.5, 0.6);
    api.sfx.pop?.();
  }
  function rainItems(api, imgs, ms, rate, s0 = 0.5, s1 = 0.85) {
    api.emitter(ms, () => {
      if (Math.random() > rate) return;
      const img = imgs[(Math.random() * imgs.length) | 0];
      const s = api.rand(s0, s1);
      api.spawn({
        x: api.rand(30, 1050), y: -50, vx: api.rand(-30, 30), vy: api.rand(160, 260), max: 9, vr: api.rand(-2, 2), fadeIn: 0.2, ph: Math.random() * 6,
        update(p) {
          p.x += Math.sin(p.life * 2 + p.ph) * 0.8;
          if (p.y > 1960) p.life = p.max;
        },
        draw(c, p) {
          draw(c, img, p.x, p.y, s, p.rot);
        },
      });
    });
  }
  const caishen = {
    // ถวายส้มมงคล: ส้มลอยโค้งไปวางบนกองส้มบนโต๊ะบูชา ประกายทอง
    g1(api, user, n, o) {
      const to = CS.oranges[o.x < 540 ? 0 : 1];
      fly(api, {
        from: { x: o.x + api.rand(-30, 30), y: o.y - 60 }, to: { x: to.x + api.rand(-30, 30), y: to.y - 10 }, dur: 1.5, delay: 0.3, trail: CGOLD,
        draw(c, p, k) {
          add(c, glow('255,170,60'), p.x, p.y, 0.9);
          c.globalCompositeOperation = 'source-over';
          draw(c, mandarin(), p.x, p.y, 0.75 - k * 0.2, p.life * 2);
        },
        onArrive: (p) => {
          haloGlow(p.x, p.y, CGOLD, 110, 1, 0.6);
          for (let i = 0; i < 8; i++) sparkle(api, p.x + api.rand(-30, 30), p.y + api.rand(-30, 10), CGOLD, 1);
          window.PicScene?.rage?.(0.3, 1000);
        },
      });
      api.sfx.chime(880);
    },
    // จุดเทียนแดง: ดวงไฟลอยไปหาองค์ไฉ่ซิงเอี๊ยะ โคมแดงทั้งศาลสว่างวาบ
    g2(api, user, n, o) {
      candle(api, o.x, o.y - 20, 3000, (p) => {
        fly(api, {
          from: { x: p.x, y: p.y - 50 }, to: CS.face, dur: 1.4, trail: CGOLD,
          draw(c, q) {
            add(c, glow('255,190,90'), q.x, q.y, 0.95 + 0.3 * Math.sin(q.life * 9));
          },
          onArrive: () => {
            window.PicScene?.rage?.(0.7, 1600);
            haloGlow(CS.face.x, CS.face.y + 30, CGOLD, 230, 1.6, 0.5);
            rings(CS.face.x, CS.face.y, CGOLD, 2, 1.6, 260);
          },
        });
      });
      api.sfx.chime(660);
    },
    // แขวนโคมมงคล: โคมแดงดวงเล็กลอยขึ้นไปแขวนกลางศาล แกว่งไกว เรืองแสง
    g3(api, user, n, o) {
      const tx = api.rand(420, 660);
      const ty = api.rand(250, 330);
      api.spawn({
        x: o.x, y: o.y - 60, max: 4.2, fadeIn: 0.2, fadeOut: 0.8,
        update(p) {
          const k = ease(Math.min(1, p.life / 1.6));
          p.x = o.x + (tx - o.x) * k;
          p.y = o.y - 60 + (ty - (o.y - 60)) * k;
        },
        draw(c, p) {
          add(c, glow(CRED), p.x, p.y + 10, 1.4 + 0.15 * Math.sin(p.life * 4));
          c.globalCompositeOperation = 'source-over';
          draw(c, lanternS(), p.x, p.y, 0.95, Math.sin(p.life * 2.2) * 0.14);
        },
      });
      setTimeout(() => {
        window.PicScene?.rage?.(0.5, 1600);
        for (let i = 0; i < 10; i++) sparkle(api, tx + api.rand(-40, 40), ty + api.rand(-20, 60), CGOLD, 1.2);
      }, 1600);
      api.sfx.chime(784);
    },
    // ก้อนทองไหลมา: ก้อนทอง 8 ก้อนลอยเรียงเข้าหาก้อนทองในมือองค์พระ แล้วก้อนทองเปล่งประกาย
    g4(api, user, n, o) {
      api.spot(user, { rgb: '255,220,150', fallback: { x: 540, y: 1400 } });
      for (let i = 0; i < 8; i++) {
        fly(api, {
          from: { x: o.x + api.rand(-20, 20), y: o.y - 60 }, to: { x: CS.ingot.x + api.rand(-40, 40), y: CS.ingot.y + api.rand(-10, 10) }, dur: 1.3, delay: 0.2 + i * 0.15, trail: CGOLD,
          draw(c, p, k) {
            add(c, glow(CGOLD), p.x, p.y, 0.7);
            c.globalCompositeOperation = 'source-over';
            draw(c, yuanbao(), p.x, p.y, 0.6 - k * 0.25, Math.sin(p.life * 4) * 0.2);
          },
          onArrive: (p) => sparkle(api, p.x, p.y - 10, CGOLD, 0.9),
        });
      }
      setTimeout(() => {
        window.PicScene?.rage?.(0.7, 2000);
        haloGlow(CS.ingot.x, CS.ingot.y, CGOLD, 220, 2, 0.6);
        rays(CS.ingot.x, CS.ingot.y, [CGOLD, '255,245,200'], 2.2, { n: 14, len: 520, peak: 0.2 });
        sheen(1.2, 0);
      }, 1600);
      api.sfx.chime(660);
    },
    // สวดขอโชคลาภ: ดวงไฟจากทุกคนรวมที่องค์พระ ยันต์ทองแดงหมุนหลังองค์
    g5(api) {
      api.crowdWave('happy');
      fansList(api).slice(0, 36).forEach((f, i) => {
        const col = i % 2 ? CGOLD : CRED;
        fly(api, {
          from: headOf(f), to: { x: CS.chest.x + api.rand(-60, 60), y: CS.chest.y + api.rand(-80, 40) }, dur: 1.9, delay: 0.2 + (i % 12) * 0.07,
          draw(c, p) {
            add(c, glow(col), p.x, p.y, 0.5);
          },
        });
      });
      setTimeout(() => {
        window.PicScene?.rage?.(0.7, 2600);
        yantra(CS.chest.x, CS.chest.y - 30, 260, 4.2, CGOLD, 0.6);
        rings(CS.chest.x, CS.chest.y, CRED, 3, 2.6, 480);
      }, 1500);
      api.sfx.chime(523);
    },
    // ฝนเหรียญทอง: เหรียญทอง + ก้อนทองร่วงกราวทั้งศาล โคมสว่าง
    g6(api) {
      window.PicScene?.kick();
      window.PicScene?.rage?.(0.6, 2400);
      haloGlow(CS.ingot.x, CS.ingot.y, CGOLD, 200, 1.6, 0.5);
      coinShower(api, 34, 2800);
      rainItems(api, [yuanbao()], 2400, 0.12, 0.35, 0.55);
      [784, 988, 1175].forEach((f, i) => setTimeout(() => api.sfx.chime(f), i * 400));
    },
    // โปรยอั่งเปา: ซองแดงโปรยลงมาทั้งจอ + กระดาษมงคลแดงทอง • คนดูดีใจ
    g7(api) {
      window.PicScene?.kick();
      window.PicScene?.rage?.(0.5, 2200);
      api.crowdWave('happy');
      rainItems(api, [angpao()], 3600, 0.45, 0.6, 0.95);
      rain(api, CNY_CONF, 3600, 0.6, { s0: 0.4, s1: 0.75 });
      api.sfx.chime(988);
    },
    // มังกรทองเหินฟ้า: มังกรแสงทองเลื้อยวนรอบองค์ขึ้นฟ้า มังกรบนเสาตื่น โคมสว่าง รัศมีทอง
    g8(api) {
      window.PicScene?.kick();
      window.PicScene?.rage?.(1, 3800);
      dragonRibbon(3.8, CGOLD, 1, 0.1);
      haloGlow(CS.face.x, CS.face.y + 60, CGOLD, 340, 4.2, 0.32);
      rays(CS.face.x, CS.face.y + 40, [CGOLD, CRED, '255,245,210'], 4.2, { n: 20, len: 1300, peak: 0.15, width: 0.06 });
      api.emitter(3600, () => Math.random() < 0.5 && sparkle(api, api.rand(40, 1040), api.rand(260, 1700), CGOLD, 1.5, 1.1));
      api.sfx.whoosh?.();
      setTimeout(() => api.sfx.chime(698), 400);
    },
    // ประทานทรัพย์ (ราว 7 วินาที): แสงวาบทอง → มังกรทอง/แดง 2 ตัวเลื้อยวนสวนกัน → ก้อนทองยักษ์ผุดเหนือองค์ หมุนเปล่งรัศมี
    //  → ประทัดแตกสองข้าง → คลื่นทองแผ่ทั่วพื้น → เหรียญ ก้อนทอง อั่งเปา โปรยทั้งจอ ทุกคนกระโดดดีใจ
    g9(api, user, n, o, label) {
      window.PicScene?.kick();
      window.PicScene?.rage?.(1, 6500);
      api.flash('#ffe7a6', 700, 0.26);
      api.bigShow(user, label);
      dragonRibbon(4.4, CGOLD, 1, 0.2);
      dragonRibbon(4.4, CRED, -1, 0.7);
      yantra(CS.chest.x, CS.chest.y - 30, 360, 7, CGOLD, 0.55);
      const T0 = { x: CS.top.x, y: CS.top.y - 20 };
      setTimeout(() => {
        api.spawn({
          x: T0.x, y: T0.y, max: 4.6, fadeIn: 0.3, fadeOut: 0.75,
          draw(c, p) {
            const s = Math.min(1, p.life / 0.6) * (1.6 + 0.08 * Math.sin(p.life * 5));
            add(c, glow(CGOLD), p.x, p.y, 2.2 * s);
            c.globalCompositeOperation = 'source-over';
            draw(c, yuanbao(), p.x, p.y + Math.sin(p.life * 2) * 6, s);
          },
        });
        rays(T0.x, T0.y, [CGOLD, '255,255,230', CRED], 4.4, { n: 22, len: 1400, peak: 0.16, width: 0.06 });
      }, 1100);
      [[420, 290], [660, 300], [400, 980], [690, 970], [260, 1180], [820, 1190]].forEach(([x, y], i) => setTimeout(() => firecracker(api, x, y), 1800 + i * 230));
      setTimeout(() => {
        window.PicScene?.kick();
        floorWave(CGOLD, 4, 2.6, 0.3, CS.floor);
        api.crowdWave('wave');
      }, 2200);
      setTimeout(() => coinShower(api, 40, 4000), 2400);
      setTimeout(() => rainItems(api, [angpao(), yuanbao(), mandarin()], 4200, 0.45, 0.45, 0.8), 2500);
      setTimeout(() => api.crowdWave('happy'), 4200);
      api.sfx.chime(523);
      setTimeout(() => api.sfx.fanfare?.(), 2200);
    },
  };

  // ---------------------------------------------------------------- บรรยากาศต่อเนื่องของฉาก (ไม่ต้องมีของขวัญ) — เรียกครั้งเดียวตอนเปิดธีม
  // ศาลพระพิฆเนศ: ควันธูปลอยขึ้นจากกระถางธูปตลอด + กลีบดาวเรืองร่วงจากพวงมาลัยเป็นระยะ (อนุภาคน้อย ไม่กินเครื่อง)
  const ambientSets = {
    // ศาลไฉ่ซิงเอี๊ยะ: ควันธูปจากกระถางกลาง + กระดาษมงคลแดงทองปลิวร่วงเป็นระยะ + ประกายวิบที่ก้อนทองในมือองค์พระ
    caishen(api) {
      const pot = CS.incense;
      let tSmoke = 0;
      let tConf = 0;
      let tGlint = 0;
      api.emitter(1e9, () => {
        if (document.hidden) return;
        const t = performance.now();
        if (t > tSmoke) {
          tSmoke = t + 220;
          api.spawn({
            x: pot.x + api.rand(-8, 8), y: pot.y, vx: api.rand(-6, 6), vy: api.rand(-46, -34), max: api.rand(3.2, 4.2), fadeIn: 0.4, fadeOut: 0.55, ph: Math.random() * 6,
            update(p) {
              p.x += Math.sin(p.life * 1.4 + p.ph) * 0.35;
            },
            draw(c, p, k) {
              c.globalAlpha *= 0.2;
              draw(c, glow('245,235,225'), p.x, p.y, 0.22 + k * 0.55);
            },
          });
        }
        if (t > tConf) {
          tConf = t + api.rand(600, 1300);
          const img = CNY_CONF[(Math.random() * 3) | 0];
          api.spawn({
            x: api.rand(360, 720), y: api.rand(200, 420), vx: api.rand(-14, 14), vy: api.rand(40, 70), max: 10, fadeIn: 0.3, fadeOut: 0.85, vr: api.rand(-2, 2), ph: Math.random() * 6,
            update(p) {
              p.x += Math.sin(p.life * 2 + p.ph) * 0.8;
              if (p.y > 1750) p.life = p.max;
            },
            draw(c, p) {
              c.save();
              c.translate(p.x, p.y);
              c.rotate(p.rot);
              c.scale(1, 0.4 + 0.6 * Math.abs(Math.cos(p.life * 2.6 + p.ph)));
              c.drawImage(img, -img.width * 0.2, -img.height * 0.2, img.width * 0.4, img.height * 0.4);
              c.restore();
            },
          });
        }
        if (t > tGlint) {
          tGlint = t + api.rand(1400, 2600);
          sparkle(api, CS.ingot.x + api.rand(-50, 50), CS.ingot.y + api.rand(-20, 10), '255,250,220', 1.1, 1.3);
        }
      });
    },
    // ศาลพระตรีมูรติ: ควันธูปลอยจากกระถางกลาง + กลีบกุหลาบร่วงจากซุ้ม + หัวใจชมพูดวงเล็กลอยขึ้นรอบซุ้มเป็นระยะ
    trimurti(api) {
      const pot = TM.incense;
      let tSmoke = 0;
      let tPetal = 0;
      let tHeart = 0;
      api.emitter(1e9, () => {
        if (document.hidden) return;
        const t = performance.now();
        if (t > tSmoke) {
          tSmoke = t + 200;
          api.spawn({
            x: pot.x + api.rand(-26, 26), y: pot.y, vx: api.rand(-6, 6), vy: api.rand(-48, -34), max: api.rand(3.2, 4.2), fadeIn: 0.4, fadeOut: 0.55, ph: Math.random() * 6,
            update(p) {
              p.x += Math.sin(p.life * 1.4 + p.ph) * 0.35;
            },
            draw(c, p, k) {
              c.globalAlpha *= 0.2;
              draw(c, glow('245,228,235'), p.x, p.y, 0.22 + k * 0.55);
            },
          });
        }
        if (t > tPetal) {
          tPetal = t + api.rand(500, 1200);
          const img = RED_PETALS[(Math.random() * 3) | 0];
          const ang = api.rand(-1.25, 1.25);
          api.spawn({
            x: TM.archTop.x + Math.sin(ang) * 290, y: TM.archTop.y + 230 - Math.cos(ang) * 210, vx: api.rand(-12, 12), vy: api.rand(40, 70), max: 9, fadeIn: 0.3, fadeOut: 0.85, vr: api.rand(-1.5, 1.5), ph: Math.random() * 6,
            update(p) {
              p.x += Math.sin(p.life * 2 + p.ph) * 0.7;
              if (p.y > 1750) p.life = p.max;
            },
            draw(c, p) {
              c.save();
              c.translate(p.x, p.y);
              c.rotate(p.rot);
              c.scale(1, 0.5 + 0.5 * Math.abs(Math.cos(p.life * 2.4 + p.ph)));
              c.drawImage(img, -img.width * 0.22, -img.height * 0.22, img.width * 0.44, img.height * 0.44);
              c.restore();
            },
          });
        }
        if (t > tHeart) {
          tHeart = t + api.rand(900, 1800);
          const col = ['#ff4f86', '#ff6b9d', '#ff8fb5'][(Math.random() * 3) | 0];
          api.spawn({
            x: api.rand(380, 700), y: api.rand(700, 1000), vx: api.rand(-8, 8), vy: api.rand(-34, -22), max: 5, fadeIn: 0.6, fadeOut: 0.6, ph: Math.random() * 6,
            update(p) {
              p.x += Math.sin(p.life * 1.3 + p.ph) * 0.5;
            },
            draw(c, p) {
              c.globalAlpha *= 0.75;
              add(c, glow(PINK), p.x, p.y, 0.35);
              c.globalCompositeOperation = 'source-over';
              draw(c, heart(col), p.x, p.y, 0.3 + 0.03 * Math.sin(p.life * 6));
            },
          });
        }
      });
    },
    ganesha(api) {
      const pot = WG(500, 1035); // กลางโต๊ะบูชา (กระถางธูปจริงในภาพอยู่หลังป้ายขวา มองไม่เห็นควัน)
      const strandX = [73, 126, 178, 231, 305, 355, 647, 697, 775, 825, 877, 930].map((cx) => WG(cx, 0).x);
      let tSmoke = 0;
      let tPetal = 0;
      api.emitter(1e9, () => {
        if (document.hidden) return;
        const t = performance.now();
        if (t > tSmoke) {
          tSmoke = t + 220;
          api.spawn({
            x: pot.x + api.rand(-6, 6), y: pot.y, vx: api.rand(-6, 6), vy: api.rand(-46, -34), max: api.rand(3.2, 4.2), fadeIn: 0.4, fadeOut: 0.55, ph: Math.random() * 6,
            update(p) {
              p.x += Math.sin(p.life * 1.4 + p.ph) * 0.35;
            },
            draw(c, p, k) {
              c.globalAlpha *= 0.22;
              draw(c, glow('240,232,225'), p.x, p.y, 0.22 + k * 0.55);
            },
          });
        }
        if (t > tPetal) {
          tPetal = t + api.rand(700, 1600);
          const img = MARI_PETALS[(Math.random() * 3) | 0];
          const x = strandX[(Math.random() * strandX.length) | 0] + api.rand(-8, 8);
          api.spawn({
            x, y: api.rand(150, 700), vx: api.rand(-10, 10), vy: api.rand(40, 70), max: 8, fadeIn: 0.3, fadeOut: 0.85, vr: api.rand(-1.5, 1.5), ph: Math.random() * 6,
            update(p) {
              p.x += Math.sin(p.life * 2 + p.ph) * 0.7;
              if (p.y > 1750) p.life = p.max;
            },
            draw(c, p) {
              c.save();
              c.translate(p.x, p.y);
              c.rotate(p.rot);
              c.scale(1, 0.5 + 0.5 * Math.abs(Math.cos(p.life * 2.4 + p.ph)));
              c.drawImage(img, -img.width * 0.22, -img.height * 0.22, img.width * 0.44, img.height * 0.44);
              c.restore();
            },
          });
        }
      });
    },
  };

  window.SceneFX = {
    sets: { ubosot, church, mosque, rodhae, djclub, wessuwan, naga, ganesha, trimurti, caishen },
    // บรรยากาศต่อเนื่องของฉาก (hud-engine เรียกตอนเปิดธีม)
    ambient(set, api) {
      ambientSets[set]?.(api);
    },
    cmdSets: { wessuwan: wessuwanCmd, naga: shrineCmd(NG), ganesha: shrineCmd(GN), trimurti: shrineCmd(TM), caishen: shrineCmd(CS) },
    // คำสั่งพิมพ์ในแชท: คืน true = ฉากนี้มีท่าของตัวเองแล้ว (ไม่ต้องลอยอีโมจิแบบปกติ)
    cmd(set, d, api) {
      const fn = this.cmdSets[set];
      return fn ? !!fn(api, d) : false;
    },
    // คืน true = เล่นเอฟเฟกต์ของฉากแล้ว (ไม่ต้องใช้แบบโปรยไอคอน)
    play(set, key, api, user, n, label) {
      const fn = this.sets[set]?.[key];
      if (!fn) return false;
      fn(api, user, Math.max(1, n || 1), api.originFor(user), label);
      return true;
    },
    drawBack(c) {
      if (!back.length) return;
      const t = now();
      for (let i = back.length - 1; i >= 0; i--) {
        const b = back[i];
        const el = t - b.t0;
        if (el >= b.dur) {
          back.splice(i, 1);
          continue;
        }
        c.save();
        b.draw(c, el / b.dur, el);
        c.restore();
      }
    },
  };
})();
