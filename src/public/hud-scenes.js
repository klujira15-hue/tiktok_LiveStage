/* ฉากวาดละเอียดของธีมเลย์เอาต์ "ลานกิจกรรม" 8 ฉาก (ใช้กับ hud-engine.js)
 * draw(c, P) = วาดครั้งเดียวลงชั้นฉากนิ่ง (ท้องฟ้า สิ่งก่อสร้าง พื้น) — P = palette ของธีม (ธีมที่สร้างเองเปลี่ยนสีได้)
 * anim(c, t) = วาดทับทุกเฟรม (เมฆ นก ควัน ไฟ คลื่น ฯลฯ) — ต้องเบา ไม่สร้าง gradient ใหญ่ทุกเฟรม
 * พิกัดเวที 1080 × 1920 • เส้นขอบฟ้าราว y 880 • แผงข้อมูลอยู่ซ้าย/ขวาบน จุดเด่นของฉากจึงอยู่กลางจอช่วง y 330–880
 */
(() => {
  const TAU = Math.PI * 2;
  // ---------------------------------------------------------------- เครื่องมือวาด
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const lin = (c, x0, y0, x1, y1, stops) => {
    const g = c.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(([o, col]) => g.addColorStop(o, col));
    return g;
  };
  const rad = (c, x, y, r0, r1, stops) => {
    const g = c.createRadialGradient(x, y, r0, x, y, r1);
    stops.forEach(([o, col]) => g.addColorStop(o, col));
    return g;
  };
  function poly(c, pts, fill, stroke, lw) {
    c.beginPath();
    pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath();
    if (fill) {
      c.fillStyle = fill;
      c.fill();
    }
    if (stroke) {
      c.strokeStyle = stroke;
      c.lineWidth = lw || 2;
      c.stroke();
    }
  }
  function rr(c, x, y, w, h, r, fill, stroke, lw) {
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
  }
  function circle(c, x, y, r, fill) {
    c.beginPath();
    c.arc(x, y, r, 0, TAU);
    c.fillStyle = fill;
    c.fill();
  }
  function glow(c, x, y, r, rgb, a = 0.6) {
    c.fillStyle = rad(c, x, y, 0, r, [[0, `rgba(${rgb},${a})`], [1, `rgba(${rgb},0)`]]);
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function sky(c, P, y1 = 880) {
    c.fillStyle = lin(c, 0, 0, 0, y1, [[0, P.sky], [1, P.sky2]]);
    c.fillRect(0, 0, 1080, y1);
  }
  function ground(c, y0, a, b) {
    c.fillStyle = lin(c, 0, y0, 0, 1920, [[0, a], [1, b]]);
    c.fillRect(0, y0, 1080, 1920 - y0);
  }
  function cloud(c, x, y, s, a = 0.85) {
    c.fillStyle = `rgba(255,255,255,${a})`;
    c.beginPath();
    for (const [dx, dy, r] of [[0, 0, 40], [38, -18, 46], [86, -4, 38], [118, 8, 28], [-34, 10, 28], [20, 18, 30], [64, 18, 32], [100, 20, 22]]) {
      c.moveTo(x + (dx + r) * s, y + dy * s);
      c.arc(x + dx * s, y + dy * s, r * s, 0, TAU);
    }
    c.fill();
  }
  function ridge(c, yBase, amp, color, seed, step = 60, rough = 0.5) {
    const r = rng(seed);
    c.beginPath();
    c.moveTo(0, 1920);
    let y = yBase - amp * r();
    for (let x = 0; x <= 1080 + step; x += step) {
      y = yBase - amp * (0.35 + 0.65 * Math.abs(Math.sin(x * 0.006 + seed))) - amp * rough * (r() - 0.5);
      c.lineTo(x, y);
    }
    c.lineTo(1080, 1920);
    c.closePath();
    c.fillStyle = color;
    c.fill();
  }
  function palm(c, x, y, h, lean, trunk = '#7a5230', leaf = '#2f8a4a') {
    const tx = x + lean;
    const ty = y - h;
    c.strokeStyle = trunk;
    c.lineCap = 'round';
    for (let i = 0; i < 10; i++) {
      const k0 = i / 10;
      const k1 = (i + 1) / 10;
      c.lineWidth = 26 - i * 1.4;
      c.beginPath();
      c.moveTo(x + lean * k0 * k0, y - h * k0);
      c.lineTo(x + lean * k1 * k1, y - h * k1);
      c.stroke();
    }
    c.fillStyle = leaf;
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (i - 4) * 0.42 + (i > 4 ? 0.2 : -0.2);
      const L = 150 + (i % 2) * 30;
      const ex = tx + Math.cos(a) * L;
      const ey = ty + Math.sin(a) * L * 0.55 + 40;
      c.beginPath();
      c.moveTo(tx, ty);
      c.quadraticCurveTo(tx + Math.cos(a) * L * 0.5, ty + Math.sin(a) * L * 0.5 - 40, ex, ey);
      c.quadraticCurveTo(tx + Math.cos(a) * L * 0.5 + 14, ty + Math.sin(a) * L * 0.5 - 10, tx, ty + 8);
      c.fill();
    }
    for (const [dx, dy] of [[-10, 14], [10, 16], [0, 22]]) circle(c, tx + dx, ty + dy, 11, '#5a3a1a');
  }
  function bushyTree(c, x, y, r, dark, light, seed) {
    const g = rng(seed);
    c.fillStyle = '#4a3020';
    c.fillRect(x - r * 0.12, y - r * 0.3, r * 0.24, r * 1.2);
    for (let i = 0; i < 14; i++) {
      const a = g() * TAU;
      const d = g() * r * 0.7;
      circle(c, x + Math.cos(a) * d, y - r * 0.4 + Math.sin(a) * d * 0.7, r * (0.35 + g() * 0.25), i < 9 ? dark : light);
    }
  }
  function stringLights(c, x0, y0, x1, y1, sag, n, cols, r = 7) {
    c.strokeStyle = 'rgba(20,15,10,.7)';
    c.lineWidth = 2;
    c.beginPath();
    const pt = (k) => [x0 + (x1 - x0) * k, y0 + (y1 - y0) * k + Math.sin(k * Math.PI) * sag];
    for (let i = 0; i <= 30; i++) {
      const [x, y] = pt(i / 30);
      i ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.stroke();
    const out = [];
    for (let i = 1; i < n; i++) {
      const [x, y] = pt(i / n);
      const col = cols[i % cols.length];
      glow(c, x, y + r, r * 4, '255,220,150', 0.35);
      circle(c, x, y + r, r, col);
      out.push([x, y + r, col]);
    }
    return out;
  }
  function crowdRows(c, y0, y1, rows, color, seed, x0 = 0, x1 = 1080) {
    const g = rng(seed);
    for (let i = 0; i < rows; i++) {
      const y = y0 + ((y1 - y0) * i) / rows;
      const s = 0.55 + (0.45 * i) / rows;
      for (let x = x0 + g() * 20; x < x1; x += 26 * s + g() * 10) {
        c.fillStyle = color;
        circle(c, x, y - 18 * s, 10 * s, color);
        rr(c, x - 13 * s, y - 8 * s, 26 * s, 26 * s, 10 * s, color);
      }
    }
  }
  const birdsAt = (c, t, y, n, col, speed = 0.04, seed = 3) => {
    const g = rng(seed);
    c.strokeStyle = col;
    c.lineWidth = 3;
    for (let i = 0; i < n; i++) {
      const x = ((t * speed * (0.7 + g() * 0.6) + g() * 1400) % 1400) - 160;
      const yy = y + g() * 140 + Math.sin(t / 600 + i) * 8;
      const w = Math.sin(t / 130 + i * 2) * 8;
      c.beginPath();
      c.moveTo(x - 14, yy - w);
      c.quadraticCurveTo(x - 6, yy - 6, x, yy);
      c.quadraticCurveTo(x + 6, yy - 6, x + 14, yy - w);
      c.stroke();
    }
  };

  // ---------------------------------------------------------------- 1) งานวัด
  function thaiRoof(c, cx, base, w, h, fill, edge) {
    poly(c, [[cx - w / 2, base], [cx + w / 2, base], [cx, base - h]], fill, edge, 7);
    // หางหงส์ปลายชาย
    c.strokeStyle = edge;
    c.lineWidth = 6;
    c.lineCap = 'round';
    for (const s of [-1, 1]) {
      c.beginPath();
      c.moveTo(cx + (s * w) / 2, base);
      c.quadraticCurveTo(cx + s * (w / 2 + 18), base - 4, cx + s * (w / 2 + 14), base - 30);
      c.stroke();
    }
  }
  function chofa(c, x, y, col) {
    c.strokeStyle = col;
    c.lineWidth = 7;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(x, y + 10);
    c.quadraticCurveTo(x - 4, y - 30, x + 22, y - 44);
    c.stroke();
  }
  function chedi(c, x, base, h, body, gold) {
    poly(c, [[x - h * 0.34, base], [x + h * 0.34, base], [x + h * 0.26, base - h * 0.12], [x - h * 0.26, base - h * 0.12]], body);
    rr(c, x - h * 0.22, base - h * 0.2, h * 0.44, h * 0.08, 6, body);
    c.fillStyle = body;
    c.beginPath();
    c.moveTo(x - h * 0.2, base - h * 0.2);
    c.bezierCurveTo(x - h * 0.22, base - h * 0.5, x - h * 0.06, base - h * 0.52, x - h * 0.05, base - h * 0.56);
    c.lineTo(x + h * 0.05, base - h * 0.56);
    c.bezierCurveTo(x + h * 0.06, base - h * 0.52, x + h * 0.22, base - h * 0.5, x + h * 0.2, base - h * 0.2);
    c.fill();
    for (let i = 0; i < 6; i++) rr(c, x - h * (0.05 - i * 0.006), base - h * (0.58 + i * 0.045), h * (0.1 - i * 0.012), h * 0.035, 3, gold);
    poly(c, [[x - h * 0.012, base - h * 0.84], [x + h * 0.012, base - h * 0.84], [x, base - h]], gold);
    glow(c, x, base - h * 0.95, 30, '255,220,120', 0.5);
  }
  const temple = {
    draw(c, P) {
      sky(c, P);
      glow(c, 540, 600, 420, '255,236,190', 0.55);
      for (const [x, y, s] of [[120, 300, 0.9], [760, 250, 0.7], [420, 200, 0.6]]) cloud(c, x, y, s, 0.7);
      ridge(c, 820, 120, 'rgba(120,150,170,.55)', 2, 50, 0.3);
      ridge(c, 860, 70, 'rgba(70,120,90,.7)', 5, 40, 0.6);
      // ต้นไม้ริมขอบฟ้า
      const g = rng(11);
      for (let x = -20; x < 1100; x += 46) circle(c, x, 860 - g() * 30, 40 + g() * 20, g() > 0.5 ? '#2f6b45' : '#3b7f52');
      // เจดีย์สองข้าง
      chedi(c, 190, 880, 380, '#f6f1e6', '#e3b341');
      chedi(c, 890, 880, 380, '#f6f1e6', '#e3b341');
      // ต้นโพธิ์ใหญ่ขอบจอ
      bushyTree(c, -50, 840, 150, '#245c3a', '#2f7448', 7);
      bushyTree(c, 1130, 840, 150, '#245c3a', '#2f7448', 9);
      // ฐานโบสถ์ + บันได
      rr(c, 280, 820, 520, 60, 6, '#efe7d6');
      poly(c, [[470, 880], [610, 880], [590, 830], [490, 830]], '#e2d6bd');
      for (let i = 0; i < 4; i++) c.fillRect(480 + i * 4, 840 + i * 10, 120 - i * 8, 3);
      // นาคราวบันได
      c.strokeStyle = '#3c9a5e';
      c.lineWidth = 9;
      for (const s of [-1, 1]) {
        c.beginPath();
        c.moveTo(540 + s * 70, 880);
        c.quadraticCurveTo(540 + s * 60, 840, 540 + s * 52, 826);
        c.stroke();
        circle(c, 540 + s * 72, 872, 10, '#e3b341');
      }
      // หลังคาซ้อน 3 ชั้น (หลังสุดก่อน)
      thaiRoof(c, 540, 600, 260, 210, '#d9622b', '#e8b33a');
      thaiRoof(c, 540, 632, 380, 220, '#2f7d4f', '#e8b33a');
      thaiRoof(c, 540, 664, 500, 220, '#e0702e', '#e8b33a');
      chofa(c, 540, 392, '#f1c24b');
      // หน้าบัน
      poly(c, [[420, 664], [660, 664], [540, 530]], '#e8b33a');
      poly(c, [[444, 656], [636, 656], [540, 550]], '#b8321f');
      circle(c, 540, 618, 24, '#f6d36a');
      circle(c, 540, 618, 12, '#b8321f');
      for (let i = 0; i < 7; i++) circle(c, 470 + i * 23, 646, 4, '#f6d36a');
      // ผนัง เสา ประตูหน้าต่าง
      rr(c, 330, 664, 420, 160, 4, '#fbf7ee');
      for (let i = 0; i < 6; i++) {
        const x = 342 + i * 78;
        rr(c, x, 664, 18, 160, 3, '#ffffff');
        rr(c, x - 4, 664, 26, 14, 3, '#e3b341');
      }
      for (const x of [388, 506, 624]) {
        rr(c, x, 712, 66, 112, [33, 33, 0, 0], '#9c2a1c');
        rr(c, x + 6, 718, 54, 106, [27, 27, 0, 0], null, '#e3b341', 4);
        c.fillStyle = '#e3b341';
        c.fillRect(x + 31, 730, 4, 94);
      }
      // ธงตะขาบ (เสา)
      for (const x of [300, 780]) {
        c.fillStyle = '#c9b48a';
        c.fillRect(x - 4, 420, 8, 460);
        circle(c, x, 418, 10, '#e3b341');
      }
      // ลานวัด: แผ่นอิฐปูพื้นมีมุมมอง
      ground(c, 880, P.ground, P.ground2);
      c.strokeStyle = 'rgba(120,90,40,.16)';
      c.lineWidth = 2;
      for (let i = -12; i <= 12; i++) {
        c.beginPath();
        c.moveTo(540 + i * 40, 880);
        c.lineTo(540 + i * 260, 1920);
        c.stroke();
      }
      for (let y = 900, k = 1; y < 1920; y += 20 * k, k *= 1.18) {
        c.beginPath();
        c.moveTo(0, y);
        c.lineTo(1080, y);
        c.stroke();
      }
      // กระถางธูปใหญ่กลางลาน
      rr(c, 500, 900, 80, 40, 10, '#a8742c');
      rr(c, 490, 892, 100, 14, 6, '#c8923c');
      c.fillStyle = 'rgba(0,0,0,.1)';
      c.beginPath();
      c.ellipse(540, 1380, 420, 160, 0, 0, TAU);
      c.fill();
    },
    anim(c, t) {
      // ธงตะขาบพลิ้ว
      const cols = ['#ff5f5f', '#ffd166', '#5ed6a0', '#7aa7ff', '#ff9ad5'];
      for (const [k, x] of [[0, 300], [1, 780]]) {
        for (let i = 0; i < 9; i++) {
          const y = 440 + i * 34;
          const sw = Math.sin(t / 500 + i * 0.6 + k) * 10;
          c.fillStyle = cols[(i + k) % cols.length];
          c.beginPath();
          c.moveTo(x + 4, y);
          c.lineTo(x + 4 + 54 + sw, y + 8);
          c.lineTo(x + 4 + 40 + sw, y + 30);
          c.lineTo(x + 4, y + 26);
          c.fill();
        }
      }
      // ควันธูป
      c.strokeStyle = 'rgba(255,255,255,.35)';
      c.lineWidth = 4;
      for (let k = 0; k < 3; k++) {
        c.beginPath();
        for (let y = 0; y < 220; y += 10) {
          const x = 520 + k * 20 + Math.sin(y / 30 + t / 700 + k) * (6 + y / 14);
          y ? c.lineTo(x, 890 - y) : c.moveTo(x, 890);
        }
        c.stroke();
      }
      birdsAt(c, t, 300, 5, 'rgba(40,50,60,.65)', 0.05, 4);
      // ลำแสงเช้า
      c.fillStyle = `rgba(255,240,200,${0.05 + Math.sin(t / 2200) * 0.03})`;
      for (let i = 0; i < 4; i++) poly(c, [[540, 300], [200 + i * 220, 880], [260 + i * 220, 880]], c.fillStyle);
    },
  };

  // ---------------------------------------------------------------- 2) ตลาดน้ำ
  function stiltHouse(c, x, base, w, h, wall, roof, flip) {
    // เสา
    c.fillStyle = '#5a3a22';
    for (let i = 0; i < 5; i++) c.fillRect(x + 10 + (i * (w - 20)) / 4, base - 30, 9, 120);
    // ระเบียง
    rr(c, x - 10, base - 40, w + 20, 14, 3, '#7a4f2c');
    for (let i = 0; i < 12; i++) c.fillRect(x - 6 + (i * (w + 12)) / 11, base - 70, 4, 32);
    c.fillRect(x - 10, base - 74, w + 20, 6);
    // ผนังไม้
    rr(c, x, base - 40 - h, w, h, 2, wall);
    c.strokeStyle = 'rgba(0,0,0,.12)';
    c.lineWidth = 2;
    for (let i = 1; i < 10; i++) {
      c.beginPath();
      c.moveTo(x + (i * w) / 10, base - 40 - h);
      c.lineTo(x + (i * w) / 10, base - 40);
      c.stroke();
    }
    // หน้าต่างบานเปิด + ไฟในบ้าน
    rr(c, x + w * 0.3, base - 40 - h * 0.75, w * 0.4, h * 0.45, 3, '#ffcf7a');
    glow(c, x + w * 0.5, base - 40 - h * 0.55, w * 0.5, '255,200,120', 0.25);
    // หลังคาจั่ว
    poly(c, [[x - 30, base - 40 - h], [x + w + 30, base - 40 - h], [x + w / 2, base - 40 - h - h * 0.75]], roof);
    poly(c, [[x + w / 2 - 6, base - 40 - h - h * 0.75], [x + w / 2 + 6, base - 40 - h - h * 0.75], [x + w / 2 + (flip ? -1 : 1) * 24, base - 40 - h - h * 0.95]], roof);
    // กระถางต้นไม้ / ของแขวน
    for (let i = 0; i < 4; i++) {
      rr(c, x + 6 + i * (w / 4), base - 92, 22, 18, 4, '#b5562a');
      circle(c, x + 17 + i * (w / 4), base - 98, 14, '#3f8f4a');
    }
  }
  function sampan(c, x, y, w, load) {
    c.fillStyle = '#4a2c18';
    c.beginPath();
    c.moveTo(x - w / 2 - 20, y - 18);
    c.quadraticCurveTo(x, y + 26, x + w / 2 + 20, y - 18);
    c.lineTo(x + w / 2, y);
    c.lineTo(x - w / 2, y);
    c.fill();
    const g = rng(load);
    const fr = ['#ff9f1c', '#e84a5f', '#ffd166', '#6cc551', '#c86bfa'];
    for (let i = 0; i < 10; i++) circle(c, x - w / 2 + 14 + g() * (w - 28), y - 18 - g() * 14, 9, fr[i % fr.length]);
    // แม่ค้าใส่งอบ
    rr(c, x + w * 0.2, y - 64, 26, 40, 10, '#2e86de');
    circle(c, x + w * 0.2 + 13, y - 74, 11, '#e2b48a');
    poly(c, [[x + w * 0.2 - 16, y - 76], [x + w * 0.2 + 42, y - 76], [x + w * 0.2 + 13, y - 100]], '#d8b26a');
  }
  const floating = {
    draw(c, P) {
      sky(c, P, 800);
      glow(c, 760, 380, 300, '255,220,160', 0.6);
      circle(c, 760, 380, 60, '#fff3c8');
      for (const [x, y, s] of [[90, 330, 0.8], [600, 260, 0.6]]) cloud(c, x, y, s, 0.75);
      // แนวมะพร้าวไกล ๆ
      ridge(c, 790, 40, '#7fb69a', 21, 30, 0.8);
      for (let i = 0; i < 9; i++) palm(c, 330 + i * 52, 800, 150 + (i % 3) * 30, (i % 2 ? 1 : -1) * 20, '#6c8c78', '#5f9a7e');
      // สะพานไม้โค้งกลางคลอง
      c.strokeStyle = '#6b4226';
      c.lineWidth = 16;
      c.beginPath();
      c.moveTo(340, 800);
      c.quadraticCurveTo(540, 650, 740, 800);
      c.stroke();
      c.lineWidth = 5;
      for (let i = 0; i <= 12; i++) {
        const k = i / 12;
        const x = 340 + 400 * k;
        const y = 800 - Math.sin(k * Math.PI) * 75;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x, y - 38);
        c.stroke();
      }
      c.beginPath();
      c.moveTo(340, 762);
      c.quadraticCurveTo(540, 612, 740, 762);
      c.stroke();
      // บ้านริมคลองสองฝั่ง
      stiltHouse(c, -40, 790, 300, 170, '#a86b3c', '#7c3b22', false);
      stiltHouse(c, 820, 790, 300, 170, '#b57a45', '#8a4326', true);
      palm(c, 300, 800, 330, -40);
      palm(c, 790, 800, 300, 50);
      // น้ำในคลอง
      ground(c, 800, P.ground, P.ground2);
      c.fillStyle = 'rgba(255,255,255,.07)';
      for (let i = 0; i < 6; i++) c.fillRect(0, 812 + i * i * 22, 1080, 3);
      // เงาสะท้อนบ้าน/สะพาน
      for (const x0 of [-40, 820]) {
        c.fillStyle = lin(c, 0, 800, 0, 960, [[0, 'rgba(90,55,30,.3)'], [1, 'rgba(90,55,30,0)']]);
        c.fillRect(x0, 800, 300, 160);
      }
      c.beginPath();
      c.moveTo(340, 800);
      c.quadraticCurveTo(540, 900, 740, 800);
      c.lineWidth = 12;
      c.strokeStyle = 'rgba(70,40,20,.2)';
      c.stroke();
      // แสงแดดบนน้ำ
      for (let i = 0; i < 18; i++) rr(c, 700 + Math.sin(i) * 60, 830 + i * 18, 60 - i * 2, 4, 2, 'rgba(255,240,200,.35)');
      // เรือจอดริมคลอง + ผักตบชวา
      sampan(c, 150, 900, 190, 3);
      sampan(c, 930, 920, 170, 8);
      const g = rng(31);
      for (let i = 0; i < 16; i++) {
        const x = i < 8 ? g() * 200 : 880 + g() * 200;
        const y = 980 + g() * 600;
        circle(c, x, y, 26 + g() * 16, '#2f8a4a');
        circle(c, x + 10, y - 10, 18, '#3fa35a');
        circle(c, x - 6, y - 16, 6, '#b48ae6');
      }
    },
    anim(c, t) {
      // ระลอกน้ำ
      c.strokeStyle = 'rgba(255,255,255,.22)';
      c.lineWidth = 3;
      for (let i = 0; i < 14; i++) {
        const y = 840 + ((i * 83 + t / 40) % 1000);
        const x = (i * 197) % 1080;
        const w = 40 + (y - 840) / 12;
        c.beginPath();
        c.moveTo(x - w, y);
        c.quadraticCurveTo(x, y - 6, x + w, y);
        c.stroke();
      }
      // เรือลอยผ่านหลังสะพาน
      const x = ((t / 30) % 1500) - 200;
      c.fillStyle = 'rgba(74,44,24,.85)';
      c.beginPath();
      c.moveTo(x - 60, 812);
      c.quadraticCurveTo(x, 832, x + 60, 812);
      c.fill();
      poly(c, [[x - 20, 790], [x + 18, 790], [x, 774]], 'rgba(216,178,106,.9)');
      birdsAt(c, t, 280, 4, 'rgba(60,40,30,.6)', 0.04, 6);
    },
  };

  // ---------------------------------------------------------------- 3) ตลาดนัดกลางคืน
  function stall(c, x, base, w, h, stripe, sign, seed) {
    const g = rng(seed);
    // ตัวร้านมีไฟในร้าน
    rr(c, x, base - h, w, h, 4, '#2a2238');
    glow(c, x + w / 2, base - h * 0.4, w * 0.8, '255,190,110', 0.45);
    // ของบนแผง
    for (let i = 0; i < 8; i++) rr(c, x + 8 + g() * (w - 30), base - 26 - g() * 30, 16 + g() * 10, 12, 4, ['#ff8f5a', '#ffd166', '#ff5fa2', '#7ee0b8'][i % 4]);
    rr(c, x - 6, base - 20, w + 12, 20, 3, '#5a3a2a');
    // ผ้าใบลายทาง
    const cw = w + 30;
    for (let i = 0; i < 8; i++) {
      poly(
        c,
        [[x - 15 + (i * cw) / 8, base - h], [x - 15 + ((i + 1) * cw) / 8, base - h], [x - 15 + ((i + 1) * cw) / 8, base - h - 40], [x - 15 + (i * cw) / 8, base - h - 40]],
        i % 2 ? '#fff6ea' : stripe,
      );
    }
    for (let i = 0; i < 8; i++) {
      c.fillStyle = i % 2 ? '#fff6ea' : stripe;
      c.beginPath();
      c.arc(x - 15 + ((i + 0.5) * cw) / 8, base - h, cw / 16, 0, Math.PI);
      c.fill();
    }
    // ป้ายร้าน
    rr(c, x + w * 0.15, base - h - 80, w * 0.7, 34, 8, '#120f1e', sign, 3);
    glow(c, x + w / 2, base - h - 63, w * 0.5, '255,120,180', 0.25);
  }
  const nightmarket = {
    stars: null,
    draw(c, P) {
      sky(c, P);
      const g = rng(41);
      for (let i = 0; i < 120; i++) circle(c, g() * 1080, g() * 640, g() * 2 + 0.5, `rgba(255,255,255,${0.3 + g() * 0.6})`);
      glow(c, 850, 300, 140, '255,250,220', 0.35);
      circle(c, 850, 300, 46, '#fff7d6');
      circle(c, 868, 290, 42, P.sky);
      // ตึกเมือง
      for (let x = -10; x < 1090; ) {
        const w = 60 + g() * 90;
        const h = 160 + g() * 260;
        rr(c, x, 800 - h, w, h + 80, 2, '#16132e');
        for (let yy = 800 - h + 16; yy < 780; yy += 26)
          for (let xx = x + 10; xx < x + w - 14; xx += 20) {
            if (g() < 0.55) continue;
            c.fillStyle = g() > 0.5 ? 'rgba(255,214,120,.8)' : 'rgba(150,200,255,.55)';
            c.fillRect(xx, yy, 9, 12);
          }
        x += w + 6;
      }
      // ซุ้มป้ายทางเข้า
      c.fillStyle = '#3a2c4e';
      c.fillRect(368, 470, 20, 410);
      c.fillRect(692, 470, 20, 410);
      rr(c, 350, 420, 380, 92, 22, '#1a1430', '#ff5fa2', 6);
      glow(c, 540, 466, 230, '255,95,162', 0.35);
      c.font = '800 46px Kanit, "Leelawadee UI", sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillStyle = '#ffe9f4';
      c.shadowColor = '#ff5fa2';
      c.shadowBlur = 24;
      c.fillText('ตลาดนัดกลางคืน', 540, 468);
      c.shadowBlur = 0;
      for (let i = 0; i < 20; i++) circle(c, 364 + i * 18.6, 426, 4, i % 2 ? '#ffd166' : '#ffffff');
      for (let i = 0; i < 20; i++) circle(c, 364 + i * 18.6, 506, 4, i % 2 ? '#ffffff' : '#ffd166');
      // ร้านสองฝั่ง (ไกล → ใกล้)
      stall(c, 380, 870, 140, 110, '#e74c3c', '#ffd166', 1);
      stall(c, 560, 870, 140, 110, '#2980b9', '#7ee0b8', 2);
      stall(c, 120, 880, 200, 140, '#f39c12', '#ff5fa2', 3);
      stall(c, 760, 880, 200, 140, '#8e44ad', '#ffd166', 4);
      stall(c, -80, 900, 220, 170, '#27ae60', '#ffd166', 5);
      stall(c, 940, 900, 220, 170, '#e74c3c', '#7ee0b8', 6);
      // ไฟประดับขึงข้ามทาง
      nightmarket.bulbs = [
        ...stringLights(c, 0, 560, 1080, 600, 70, 22, ['#ffd166', '#ff5fa2', '#7ee0b8', '#ffffff']),
        ...stringLights(c, 0, 660, 1080, 640, 50, 18, ['#ff8f5a', '#ffffff', '#8fb8ff']),
      ];
      // ถนนยางมะตอยมีแสงไฟส่อง
      ground(c, 880, P.ground, P.ground2);
      for (const x of [200, 540, 880]) {
        c.fillStyle = rad(c, x, 1000, 0, 300, [[0, 'rgba(255,190,110,.22)'], [1, 'rgba(255,190,110,0)']]);
        c.fillRect(x - 300, 880, 600, 500);
      }
      c.strokeStyle = 'rgba(255,255,255,.12)';
      c.setLineDash([40, 40]);
      c.lineWidth = 6;
      c.beginPath();
      c.moveTo(540, 900);
      c.lineTo(540, 1920);
      c.stroke();
      c.setLineDash([]);
    },
    anim(c, t) {
      // ไฟกะพริบ
      for (const [i, [x, y, col]] of (nightmarket.bulbs || []).entries()) {
        const a = 0.55 + 0.45 * Math.abs(Math.sin(t / 900 + i * 1.7));
        c.globalAlpha = a;
        circle(c, x, y, 9, col);
        c.globalAlpha = a * 0.35;
        circle(c, x, y, 20, col);
      }
      c.globalAlpha = 1;
      // ควันปิ้งย่างจากร้านใกล้
      for (const sx of [30, 1050]) {
        for (let k = 0; k < 4; k++) {
          const p = ((t / 1600 + k / 4) % 1);
          c.fillStyle = `rgba(230,230,240,${0.22 * (1 - p)})`;
          circle(c, sx + Math.sin(p * 6 + k) * 30, 760 - p * 260, 22 + p * 40, c.fillStyle);
        }
      }
      // ป้ายนีออนกะพริบเบา ๆ
      c.fillStyle = `rgba(255,95,162,${0.06 + Math.abs(Math.sin(t / 700)) * 0.08})`;
      c.fillRect(350, 420, 380, 92);
    },
  };

  // ---------------------------------------------------------------- ตัวละครนักกีฬา (วาดสดทุกเฟรม)
  const DEG = Math.PI / 180;
  // แขน/ขา 2 ท่อน — มุมวัดจากแนวดิ่งลง (+ = ไปทางที่หันหน้า) • f = 1 หันขวา, -1 หันซ้าย
  function limb(c, x, y, a1, l1, a2, l2, w, col, f) {
    const x1 = x + Math.sin(a1 * DEG) * l1 * f;
    const y1 = y + Math.cos(a1 * DEG) * l1;
    const x2 = x1 + Math.sin(a2 * DEG) * l2 * f;
    const y2 = y1 + Math.cos(a2 * DEG) * l2;
    c.strokeStyle = col;
    c.lineWidth = w;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x1, y1);
    c.lineTo(x2, y2);
    c.stroke();
    return [x1, y1, x2, y2];
  }
  const SKIN = '#c98e5c';
  const SKIN_D = '#a8703f';
  // ท่านักมวย: [แขนหลัง a1,a2] [แขนหน้า a1,a2] [ขาหลัง a1,a2] [ขาหน้า a1,a2] เอนตัว
  const BOX_POSES = {
    guard: { ba: [120, 175], fa: [105, 168], bl: [-22, -8], fl: [18, 6], lean: 6 },
    jab: { ba: [120, 175], fa: [92, 92], bl: [-26, -10], fl: [24, 8], lean: 14 },
    cross: { ba: [95, 95], fa: [120, 178], bl: [-30, -10], fl: [20, 6], lean: 18 },
    kick: { ba: [140, 175], fa: [70, 150], bl: [-12, 0], fl: [100, 92], lean: -16 },
    knee: { ba: [130, 160], fa: [130, 160], bl: [-14, -4], fl: [95, -10], lean: 4 },
    hit: { ba: [150, 175], fa: [140, 172], bl: [-30, -12], fl: [10, 0], lean: -18 },
    win: { ba: [178, 180], fa: [172, 180], bl: [-16, -6], fl: [16, 6], lean: 0 },
    wai: { ba: [150, 165], fa: [150, 165], bl: [-90, 10], fl: [70, 160], lean: 10 },
  };
  function boxer(c, x, y, s, col, f, poseName, t) {
    const P = BOX_POSES[poseName] || BOX_POSES.guard;
    const bob = poseName === 'guard' ? Math.sin(t / 140) * 4 * s : 0;
    const hipX = x;
    const hipY = y - 92 * s + bob;
    const sx = hipX + P.lean * 1.4 * s * f;
    const sy = hipY - 64 * s;
    // เงา
    c.fillStyle = 'rgba(0,0,0,.28)';
    c.beginPath();
    c.ellipse(x, y + 4, 46 * s, 10 * s, 0, 0, TAU);
    c.fill();
    // ขาหลัง + แขนหลัง
    limb(c, hipX - 6 * s * f, hipY, P.bl[0], 50 * s, P.bl[1], 48 * s, 16 * s, SKIN_D, f);
    const b = limb(c, sx - 8 * s * f, sy + 6 * s, P.ba[0], 34 * s, P.ba[1], 32 * s, 13 * s, SKIN_D, f);
    circle(c, b[2], b[3], 12 * s, shadeHex(col, -30));
    // ลำตัว
    c.strokeStyle = SKIN;
    c.lineWidth = 34 * s;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(hipX, hipY - 8 * s);
    c.lineTo(sx, sy + 10 * s);
    c.stroke();
    // กางเกงมวย
    rr(c, hipX - 22 * s, hipY - 18 * s, 44 * s, 30 * s, 8 * s, col);
    c.fillStyle = '#fff';
    c.fillRect(hipX - 22 * s, hipY - 18 * s, 44 * s, 5 * s);
    // ขาหน้า
    limb(c, hipX + 6 * s * f, hipY, P.fl[0], 50 * s, P.fl[1], 48 * s, 17 * s, SKIN, f);
    // หัว + มงคล
    const hx = sx + 6 * s * f;
    const hy = sy - 22 * s;
    circle(c, hx, hy, 17 * s, SKIN);
    c.fillStyle = '#1b1210';
    c.beginPath();
    c.arc(hx, hy - 3 * s, 17 * s, Math.PI * 1.05, Math.PI * 1.95);
    c.fill();
    c.strokeStyle = '#f3efe4';
    c.lineWidth = 5 * s;
    c.beginPath();
    c.ellipse(hx, hy - 6 * s, 18 * s, 6 * s, 0, 0, TAU);
    c.stroke();
    circle(c, hx + 9 * s * f, hy, 2.2 * s, '#1b1210');
    // แขนหน้า + ประเจียด + นวม
    const a = limb(c, sx + 6 * s * f, sy + 6 * s, P.fa[0], 34 * s, P.fa[1], 32 * s, 14 * s, SKIN, f);
    c.strokeStyle = col;
    c.lineWidth = 6 * s;
    c.beginPath();
    c.moveTo(sx + 6 * s * f, sy + 14 * s);
    c.lineTo((sx + 6 * s * f + a[0]) / 2, (sy + 6 * s + a[1]) / 2);
    c.stroke();
    circle(c, a[2], a[3], 13 * s, col);
    circle(c, a[2] - 4 * s, a[3] - 4 * s, 4 * s, 'rgba(255,255,255,.35)');
  }
  function shadeHex(hex, d) {
    const n = parseInt(hex.slice(1), 16);
    const cl = (v) => Math.max(0, Math.min(255, v + d));
    return `rgb(${cl(n >> 16)},${cl((n >> 8) & 255)},${cl(n & 255)})`;
  }
  // นักวิ่ง: ท่าวิ่งเป็นรอบ (phase)
  function runner(c, x, y, s, col, ph) {
    const sw = Math.sin(ph);
    const hipY = y - 56 * s;
    const sx = x + 8 * s;
    const sy = hipY - 40 * s;
    c.fillStyle = 'rgba(0,0,0,.22)';
    c.beginPath();
    c.ellipse(x, y + 3, 26 * s, 6 * s, 0, 0, TAU);
    c.fill();
    limb(c, x, hipY, -40 * sw, 30 * s, -40 * sw - 50 - 30 * Math.max(0, sw), 30 * s, 10 * s, SKIN_D, 1);
    limb(c, sx, sy + 4 * s, 50 * sw, 22 * s, 50 * sw + 70, 20 * s, 8 * s, SKIN_D, 1);
    c.strokeStyle = col;
    c.lineWidth = 22 * s;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(x, hipY - 4 * s);
    c.lineTo(sx, sy + 6 * s);
    c.stroke();
    rr(c, x - 12 * s, hipY - 8 * s, 24 * s, 16 * s, 5 * s, '#1f2a44');
    limb(c, x, hipY, 40 * sw, 30 * s, 40 * sw - 50 - 30 * Math.max(0, -sw), 30 * s, 11 * s, SKIN, 1);
    circle(c, sx + 4 * s, sy - 14 * s, 12 * s, SKIN);
    c.fillStyle = '#1b1210';
    c.beginPath();
    c.arc(sx + 4 * s, sy - 17 * s, 12 * s, Math.PI, TAU);
    c.fill();
    c.fillStyle = col;
    c.fillRect(sx - 8 * s, sy - 20 * s, 24 * s, 4 * s);
    limb(c, sx, sy + 4 * s, -50 * sw, 22 * s, -50 * sw + 70, 20 * s, 8 * s, SKIN, 1);
  }

  // ---------------------------------------------------------------- 4) มวยไทย
  // นักมวยมุมแดง (ซ้าย) vs มุมน้ำเงิน (ขวา) ชกกันบนเวทีเองตลอด • คนดูพิมพ์ "แดง"/"น้ำเงิน" = มุมนั้นออกอาวุธ
  const RING = { back: 770, front: 905, bl: 320, br: 760, fl: 250, fr: 830 };
  const fighters = {
    red: { col: '#d8342c', x: 470, pose: 'guard', until: 0 },
    blue: { col: '#2f6fd6', x: 610, pose: 'guard', until: 0 },
    next: 0,
  };
  function attack(side, t, move) {
    const me = fighters[side];
    const other = fighters[side === 'red' ? 'blue' : 'red'];
    me.pose = move || ['jab', 'cross', 'kick', 'knee'][Math.floor(Math.random() * 4)];
    me.until = t + 420;
    other.pose = 'hit';
    other.until = t + 320;
    other.x += (side === 'red' ? 1 : -1) * 6;
  }
  const muay = {
    draw(c, P) {
      c.fillStyle = lin(c, 0, 0, 0, 900, [[0, '#07060d'], [1, P.sky2]]);
      c.fillRect(0, 0, 1080, 900);
      // โครงหลังคา
      c.strokeStyle = 'rgba(70,66,90,.6)';
      c.lineWidth = 4;
      for (let x = -60; x < 1140; x += 120) {
        c.beginPath();
        c.moveTo(x, 0);
        c.lineTo(x + 60, 120);
        c.lineTo(x + 120, 0);
        c.moveTo(x, 120);
        c.lineTo(x + 120, 120);
        c.stroke();
      }
      // ธงชาติราวแขวน
      for (let i = 0; i < 16; i++) {
        const x = 20 + i * 68;
        const y = 52 + Math.sin((i / 15) * Math.PI) * 20;
        [['#e2231a', 0], ['#ffffff', 6], ['#2d2a6e', 12], ['#ffffff', 24], ['#e2231a', 30]].forEach(([col, dy]) => {
          c.fillStyle = col;
          c.fillRect(x, y + dy, 40, dy === 12 ? 12 : 6);
        });
      }
      // คานไฟ
      c.fillStyle = '#2a2836';
      c.fillRect(0, 250, 1080, 14);
      for (const x of [220, 400, 680, 860]) {
        rr(c, x - 22, 262, 44, 28, 6, '#3b3848');
        circle(c, x, 288, 11, '#fff6d6');
        glow(c, x, 288, 46, '255,250,220', 0.6);
      }
      // อัฒจันทร์คนดูแน่น
      for (let i = 0; i < 8; i++) {
        c.fillStyle = i % 2 ? '#191624' : '#1e1a2b';
        c.fillRect(0, 400 + i * 54, 1080, 54);
      }
      crowdRows(c, 450, 820, 8, 'rgba(60,54,80,.95)', 51);
      // ป้ายใหญ่ห้อยเหนือเวที (กลางจอ ไม่ชนแผงข้อมูล)
      c.strokeStyle = '#555';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(430, 264);
      c.lineTo(440, 480);
      c.moveTo(650, 264);
      c.lineTo(640, 480);
      c.stroke();
      rr(c, 400, 480, 280, 74, 14, '#141220', '#ffd166', 5);
      glow(c, 540, 517, 180, '232,69,60', 0.25);
      c.font = '800 40px Kanit, "Leelawadee UI", sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillStyle = '#ffd166';
      c.shadowColor = '#e8453c';
      c.shadowBlur = 18;
      c.fillText('ศึกมวยไทย', 540, 519);
      c.shadowBlur = 0;
      // พื้นเวที + ขอบหน้าเวที
      poly(c, [[RING.fl, RING.front], [RING.fr, RING.front], [RING.br, RING.back], [RING.bl, RING.back]], '#e9eef6');
      poly(c, [[RING.fl, RING.front], [RING.fr, RING.front], [RING.fr, RING.front + 30], [RING.fl, RING.front + 30]], '#2b2f45');
      c.fillStyle = 'rgba(47,111,214,.22)';
      c.beginPath();
      c.ellipse(540, 838, 120, 38, 0, 0, TAU);
      c.fill();
      // เสามุมหลัง + เชือกด้านหลัง/ข้าง (เชือกหน้าวาดทับนักมวยใน anim)
      rr(c, RING.bl - 9, RING.back - 120, 18, 124, 4, '#c0392b');
      rr(c, RING.br - 9, RING.back - 120, 18, 124, 4, '#2f6fd6');
      const ropeCols = ['#e8453c', '#ffffff', '#2f6fd6', '#e8453c'];
      for (let i = 0; i < 4; i++) {
        const d = 26 + i * 26;
        c.strokeStyle = ropeCols[i];
        c.lineWidth = 5;
        c.beginPath();
        c.moveTo(RING.fl, RING.front - d);
        c.lineTo(RING.bl, RING.back - d);
        c.lineTo(RING.br, RING.back - d);
        c.lineTo(RING.fr, RING.front - d);
        c.stroke();
      }
      ground(c, 935, P.ground, '#16141e');
      c.fillStyle = rad(c, 540, 980, 0, 520, [[0, 'rgba(255,250,220,.16)'], [1, 'rgba(255,250,220,0)']]);
      c.fillRect(0, 935, 1080, 700);
    },
    anim(c, t) {
      fighters.now = t;
      // สปอตไลต์ส่ายช้า ๆ
      for (const [i, x] of [220, 400, 680, 860].entries()) {
        const sw = Math.sin(t / 2200 + i * 1.3) * 110;
        c.fillStyle = 'rgba(255,250,220,.06)';
        poly(c, [[x - 10, 292], [x + 10, 292], [540 + sw + 120, 900], [540 + sw - 120, 900]], c.fillStyle);
      }
      // แฟลชกล้อง: ค่อย ๆ จางหาย ไม่กระพริบกระโดด
      for (let i = 0; i < 4; i++) {
        const cyc = 2600 + i * 700;
        const p = ((t + i * 911) % cyc) / cyc;
        if (p > 0.12) continue;
        const g = rng(Math.floor((t + i * 911) / cyc) * 7 + i);
        const a = 0.8 * (1 - p / 0.12);
        c.fillStyle = `rgba(255,255,255,${a})`;
        circle(c, 60 + g() * 960, 470 + g() * 320, 7, c.fillStyle);
        c.fillStyle = `rgba(255,255,255,${a * 0.25})`;
        circle(c, 60 + g() * 960, 470 + g() * 320, 20, c.fillStyle);
      }
      // นักมวย: ออกอาวุธสลับกันเอง
      if (t > fighters.next) {
        attack(Math.random() < 0.5 ? 'red' : 'blue', t);
        fighters.next = t + 1100 + Math.random() * 1200;
      }
      for (const side of ['red', 'blue']) {
        const fz = fighters[side];
        if (t > fz.until && fz.pose !== 'guard') fz.pose = 'guard';
        const home = side === 'red' ? 470 : 610;
        fz.x += (home - fz.x) * 0.06;
      }
      boxer(c, fighters.red.x, 868, 1.05, fighters.red.col, 1, fighters.red.pose, t);
      boxer(c, fighters.blue.x, 868, 1.05, fighters.blue.col, -1, fighters.blue.pose, t + 300);
      // เชือกหน้า + เสามุมหน้า (ทับนักมวย)
      const ropeCols = ['#e8453c', '#ffffff', '#2f6fd6', '#e8453c'];
      for (let i = 0; i < 4; i++) {
        const d = 26 + i * 26;
        c.strokeStyle = ropeCols[i];
        c.lineWidth = 5;
        c.beginPath();
        c.moveTo(RING.fl, RING.front - d);
        c.lineTo(RING.fr, RING.front - d);
        c.stroke();
      }
      rr(c, RING.fl - 9, RING.front - 120, 18, 124, 4, '#ffffff');
      rr(c, RING.fr - 9, RING.front - 120, 18, 124, 4, '#ffffff');
    },
    onCmd(d) {
      const t = fighters.now || 0;
      if (d.zone === 'red' || d.zone === 'blue') {
        attack(d.zone, t);
        fighters.next = t + 900;
      } else if (d.kind === 'dance') {
        for (const s of ['red', 'blue']) {
          fighters[s].pose = 'wai';
          fighters[s].until = t + 1800;
        }
        fighters.next = t + 2000;
      }
    },
    onGoal() {
      const t = fighters.now || 0;
      for (const s of ['red', 'blue']) {
        fighters[s].pose = 'win';
        fighters[s].until = t + 2500;
      }
      fighters.next = t + 2600;
    },
  };

  // ---------------------------------------------------------------- 5) ริมหาด
  const beach = {
    draw(c, P) {
      c.fillStyle = lin(c, 0, 0, 0, 780, [[0, '#4aa8e8'], [0.55, '#ffb38a'], [1, '#ffd98c']]);
      c.fillRect(0, 0, 1080, 780);
      glow(c, 540, 740, 420, '255,200,120', 0.6);
      circle(c, 540, 740, 110, '#fff1b8');
      for (const [x, y, s] of [[120, 320, 0.9], [760, 260, 0.8], [380, 180, 0.6]]) cloud(c, x, y, s, 0.55);
      // เกาะไกล
      c.fillStyle = '#5a6f8a';
      c.beginPath();
      c.ellipse(170, 780, 180, 46, 0, Math.PI, 0);
      c.fill();
      c.beginPath();
      c.ellipse(900, 780, 130, 36, 0, Math.PI, 0);
      c.fill();
      // ทะเล
      c.fillStyle = lin(c, 0, 780, 0, 990, [[0, '#2e7fb8'], [1, P.sky2]]);
      c.fillRect(0, 780, 1080, 210);
      for (let i = 0; i < 16; i++) rr(c, 540 - 100 + Math.sin(i * 1.7) * 30 - i * 3, 790 + i * 12, 200 + i * 6, 4, 2, 'rgba(255,230,170,.45)');
      // หาดทราย
      ground(c, 990, P.ground, P.ground2);
      c.fillStyle = 'rgba(255,255,255,.5)';
      c.beginPath();
      c.moveTo(0, 990);
      for (let x = 0; x <= 1080; x += 30) c.lineTo(x, 990 + Math.sin(x / 70) * 8);
      c.lineTo(1080, 1010);
      c.lineTo(0, 1010);
      c.fill();
      c.fillStyle = 'rgba(160,120,60,.12)';
      c.fillRect(0, 1010, 1080, 26);
      // ร่ม + เก้าอี้ชายหาด
      for (const [x, y, a, b] of [[160, 1120, '#ff6b6b', '#ffffff'], [930, 1100, '#4ecdc4', '#ffe66d']]) {
        c.fillStyle = '#ddd';
        c.fillRect(x - 4, y - 150, 8, 170);
        for (let i = 0; i < 6; i++) {
          c.fillStyle = i % 2 ? a : b;
          c.beginPath();
          c.moveTo(x, y - 160);
          c.arc(x, y - 110, 110, Math.PI + (i * Math.PI) / 6, Math.PI + ((i + 1) * Math.PI) / 6);
          c.fill();
        }
        poly(c, [[x + 30, y + 10], [x + 120, y + 10], [x + 100, y - 30], [x + 40, y - 30]], '#f7f1e3', '#b88b4a', 3);
      }
      // ต้นมะพร้าวกรอบภาพ
      palm(c, 40, 1000, 520, 140);
      palm(c, 1060, 1000, 480, -150);
      palm(c, 1000, 990, 360, -60, '#6c4a2c', '#2a7a44');
      // ดาวทะเล เปลือกหอย กระดานโต้คลื่น
      const g = rng(61);
      for (let i = 0; i < 10; i++) {
        const x = g() > 0.5 ? g() * 260 : 820 + g() * 260;
        const y = 1300 + g() * 500;
        c.fillStyle = ['#ff8a65', '#fff3e0', '#ffb74d'][i % 3];
        c.beginPath();
        for (let k = 0; k < 10; k++) {
          const r = k % 2 ? 6 : 15;
          c.lineTo(x + Math.cos((k * Math.PI) / 5) * r, y + Math.sin((k * Math.PI) / 5) * r);
        }
        c.fill();
      }
      c.save();
      c.translate(260, 1180);
      c.rotate(-0.25);
      rr(c, -18, -120, 36, 200, 18, '#ffe66d', '#ff6b6b', 4);
      c.restore();
    },
    anim(c, t) {
      // ฟองคลื่นซัดเข้าออก
      const off = Math.sin(t / 1300) * 14;
      c.strokeStyle = 'rgba(255,255,255,.7)';
      c.lineWidth = 6;
      c.beginPath();
      for (let x = 0; x <= 1080; x += 20) {
        const y = 996 + off + Math.sin(x / 60 + t / 500) * 6;
        x ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.stroke();
      // ระยิบแสงบนทะเล
      const g = rng(Math.floor(t / 250));
      for (let i = 0; i < 12; i++) {
        const x = 380 + g() * 320;
        const y = 790 + g() * 190;
        c.fillStyle = 'rgba(255,255,230,.9)';
        c.fillRect(x, y, 10 + g() * 10, 2);
      }
      // เรือใบ
      const bx = ((t / 60) % 1400) - 160;
      poly(c, [[bx - 30, 790], [bx + 30, 790], [bx + 20, 800], [bx - 20, 800]], '#3a3a4a');
      poly(c, [[bx, 788], [bx, 730], [bx + 30, 786]], '#ffffff');
      birdsAt(c, t, 320, 4, 'rgba(255,255,255,.85)', 0.06, 9);
    },
  };

  // ---------------------------------------------------------------- 6) ทุ่งนา
  const farm = {
    draw(c, P) {
      c.fillStyle = lin(c, 0, 0, 0, 760, [[0, '#7cc3f0'], [1, '#e8f4e0']]);
      c.fillRect(0, 0, 1080, 760);
      for (const [x, y, s] of [[140, 300, 1], [700, 250, 0.9], [440, 190, 0.6]]) cloud(c, x, y, s, 0.85);
      ridge(c, 690, 200, '#9db7c9', 71, 60, 0.4);
      ridge(c, 740, 140, '#7aa58a', 72, 50, 0.6);
      ridge(c, 780, 90, '#5f9a5e', 73, 40, 0.6);
      // นาขั้นบันไดบนเนิน
      for (let i = 0; i < 7; i++) {
        c.fillStyle = i % 2 ? '#a7c957' : '#d4b94a';
        c.beginPath();
        c.moveTo(0, 760 + i * 18);
        c.quadraticCurveTo(540, 700 + i * 22, 1080, 770 + i * 16);
        c.lineTo(1080, 790 + i * 16);
        c.quadraticCurveTo(540, 722 + i * 22, 0, 780 + i * 18);
        c.fill();
      }
      // ต้นไม้ใหญ่กลางนา (ซ้าย)
      bushyTree(c, 230, 800, 190, '#2f6b3a', '#3f8a4a', 77);
      // กระท่อมปลายนา (ขวา)
      c.fillStyle = '#5a3a22';
      for (const x of [650, 700, 760, 810]) c.fillRect(x, 760, 8, 110);
      rr(c, 630, 740, 200, 26, 3, '#8a5a32');
      rr(c, 650, 660, 160, 82, 2, '#b78a54');
      rr(c, 700, 690, 50, 50, 2, '#4a3020');
      poly(c, [[610, 670], [850, 670], [790, 590], [670, 590]], '#c9a45a');
      c.strokeStyle = 'rgba(90,60,20,.35)';
      c.lineWidth = 2;
      for (let i = 0; i < 14; i++) {
        c.beginPath();
        c.moveTo(615 + i * 17, 670);
        c.lineTo(672 + i * 8.5, 592);
        c.stroke();
      }
      // หุ่นไล่กา
      c.fillStyle = '#6b4a2a';
      c.fillRect(436, 760, 8, 120);
      c.fillRect(400, 790, 80, 7);
      rr(c, 420, 790, 40, 50, 6, '#c0392b');
      circle(c, 440, 776, 15, '#e9d8a6');
      poly(c, [[416, 770], [464, 770], [440, 742]], '#c9a45a');
      // ควาย
      c.fillStyle = '#3a3438';
      rr(c, 880, 800, 110, 50, 24, '#3a3438');
      rr(c, 960, 790, 46, 34, 14, '#3a3438');
      for (const x of [890, 912, 954, 974]) c.fillRect(x, 838, 9, 34);
      c.strokeStyle = '#3a3438';
      c.lineWidth = 6;
      c.beginPath();
      c.arc(984, 786, 22, Math.PI * 1.1, Math.PI * 1.9);
      c.stroke();
      // แปลงนาเบื้องหน้า (มุมมอง)
      ground(c, 880, P.ground, P.ground2);
      for (let i = 0; i < 14; i++) {
        c.strokeStyle = i % 2 ? 'rgba(120,150,40,.22)' : 'rgba(255,240,170,.18)';
        c.lineWidth = 10 + i * 3;
        c.beginPath();
        c.moveTo(540 + (i - 7) * 30, 880);
        c.lineTo(540 + (i - 7) * 260, 1920);
        c.stroke();
      }
      c.strokeStyle = 'rgba(110,80,30,.35)';
      c.lineWidth = 8;
      for (const y of [960, 1140, 1460]) {
        c.beginPath();
        c.moveTo(0, y);
        c.quadraticCurveTo(540, y - 30, 1080, y);
        c.stroke();
      }
      // ต้นข้าวเป็นกอ ๆ ตามแนวคันนาใกล้ตา
      const gr = rng(79);
      c.strokeStyle = 'rgba(90,120,30,.5)';
      c.lineWidth = 3;
      for (let i = 0; i < 60; i++) {
        const x = gr() * 1080;
        const y = 1500 + gr() * 400;
        for (let k = -2; k <= 2; k++) {
          c.beginPath();
          c.moveTo(x, y);
          c.quadraticCurveTo(x + k * 4, y - 20, x + k * 9, y - 34);
          c.stroke();
        }
      }
    },
    anim(c, t) {
      // ข้าวพลิ้วเป็นคลื่นแสง
      for (let i = 0; i < 3; i++) {
        const x = ((t / 12 + i * 500) % 1700) - 300;
        c.fillStyle = 'rgba(255,250,200,.10)';
        poly(c, [[x, 880], [x + 160, 880], [x + 420, 1920], [x + 100, 1920]], c.fillStyle);
      }
      // นกยางขาว
      birdsAt(c, t, 330, 6, 'rgba(255,255,255,.95)', 0.045, 12);
      // เมฆลอย
      c.fillStyle = 'rgba(255,255,255,.35)';
      for (let i = 0; i < 2; i++) circle(c, ((t / 70 + i * 700) % 1400) - 160, 230 + i * 80, 50, c.fillStyle);
    },
  };

  // ---------------------------------------------------------------- 7) คาเฟ่ฝนพรำ
  const cafe = {
    draw(c, P) {
      // ผนังไม้อุ่น ๆ
      c.fillStyle = lin(c, 0, 0, 0, 900, [[0, '#3a2a20'], [1, '#5a4030']]);
      c.fillRect(0, 0, 1080, 900);
      c.strokeStyle = 'rgba(0,0,0,.18)';
      c.lineWidth = 3;
      for (let x = 0; x < 1080; x += 54) {
        c.beginPath();
        c.moveTo(x, 0);
        c.lineTo(x, 900);
        c.stroke();
      }
      // หน้าต่างบานใหญ่เห็นเมืองยามฝนตก
      const wx = 300;
      const wy = 330;
      const ww = 480;
      const wh = 420;
      c.fillStyle = lin(c, 0, wy, 0, wy + wh, [[0, P.sky], [1, '#2a3446']]);
      c.fillRect(wx, wy, ww, wh);
      const g = rng(81);
      for (let i = 0; i < 9; i++) {
        const h = 90 + g() * 200;
        c.fillStyle = 'rgba(30,38,55,.9)';
        c.fillRect(wx + i * 56, wy + wh - h, 50, h);
      }
      for (let i = 0; i < 40; i++) glow(c, wx + g() * ww, wy + wh * 0.4 + g() * wh * 0.6, 10 + g() * 18, g() > 0.5 ? '255,200,120' : '255,120,120', 0.5);
      c.fillStyle = 'rgba(200,220,255,.08)';
      c.fillRect(wx, wy, ww, wh);
      // กรอบไม้หน้าต่าง
      c.strokeStyle = '#2a1a10';
      c.lineWidth = 18;
      c.strokeRect(wx, wy, ww, wh);
      c.lineWidth = 9;
      c.beginPath();
      c.moveTo(wx + ww / 2, wy);
      c.lineTo(wx + ww / 2, wy + wh);
      c.moveTo(wx, wy + wh * 0.45);
      c.lineTo(wx + ww, wy + wh * 0.45);
      c.stroke();
      cafe.win = [wx, wy, ww, wh];
      // ชั้นวางสองข้าง
      for (const sx of [40, 820]) {
        for (let k = 0; k < 3; k++) {
          const y = 470 + k * 120;
          rr(c, sx, y, 220, 12, 3, '#7a5236');
          for (let i = 0; i < 5; i++) {
            const x = sx + 14 + i * 42;
            if ((i + k) % 3 === 0) {
              rr(c, x, y - 30, 26, 30, 4, '#c8743a');
              for (let l = 0; l < 4; l++) circle(c, x + 13 + Math.cos(l * 1.6) * 14, y - 40 - Math.sin(l * 1.6) * 8, 11, '#4f9a5a');
            } else if ((i + k) % 3 === 1) rr(c, x, y - 40, 24, 40, 6, 'rgba(220,240,255,.5)', '#e8e0d0', 2);
            else {
              rr(c, x, y - 22, 28, 22, [0, 0, 8, 8], '#f4efe6');
              c.strokeStyle = '#f4efe6';
              c.lineWidth = 3;
              c.beginPath();
              c.arc(x + 30, y - 12, 7, -1.4, 1.4);
              c.stroke();
            }
          }
        }
      }
      // โคมไฟห้อยเพดาน
      cafe.lamps = [];
      for (const x of [200, 420, 660, 880]) {
        c.strokeStyle = '#1a120c';
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(x, 0);
        c.lineTo(x, 240);
        c.stroke();
        poly(c, [[x - 36, 280], [x + 36, 280], [x + 16, 240], [x - 16, 240]], '#2c2c2c');
        glow(c, x, 300, 150, '255,200,130', 0.45);
        circle(c, x, 284, 10, '#ffe6b0');
        cafe.lamps.push(x);
      }
      // เคาน์เตอร์บาร์ + เครื่องชงกาแฟ + ป้ายเมนู
      rr(c, 0, 790, 1080, 110, 0, '#6b4a32');
      rr(c, 0, 780, 1080, 18, 4, '#8a6244');
      rr(c, 420, 700, 120, 82, 10, '#c9ced6');
      rr(c, 436, 714, 88, 30, 6, '#7a828e');
      circle(c, 458, 762, 8, '#2a2a2a');
      circle(c, 502, 762, 8, '#2a2a2a');
      rr(c, 620, 730, 70, 52, [35, 35, 4, 4], 'rgba(230,240,255,.35)', '#e8eef6', 2);
      circle(c, 655, 766, 22, '#e6a3b8');
      rr(c, 160, 640, 120, 130, 8, '#1e2a22', '#8a6244', 6);
      c.font = '700 22px Kanit, sans-serif';
      c.fillStyle = '#f4efe6';
      c.textAlign = 'center';
      c.fillText('MENU', 220, 670);
      c.strokeStyle = 'rgba(244,239,230,.6)';
      c.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        c.beginPath();
        c.moveTo(178, 694 + i * 18);
        c.lineTo(262 - (i % 2) * 20, 694 + i * 18);
        c.stroke();
      }
      // พื้นไม้
      ground(c, 900, P.ground, P.ground2);
      c.strokeStyle = 'rgba(60,35,20,.25)';
      c.lineWidth = 3;
      for (let i = -14; i <= 14; i++) {
        c.beginPath();
        c.moveTo(540 + i * 44, 900);
        c.lineTo(540 + i * 220, 1920);
        c.stroke();
      }
      c.fillStyle = 'rgba(180,90,60,.22)';
      c.beginPath();
      c.ellipse(540, 1400, 430, 170, 0, 0, TAU);
      c.fill();
      // ต้นไม้กระถางใหญ่มุมห้อง
      for (const x of [60, 1020]) {
        rr(c, x - 40, 1500, 80, 90, 10, '#c8743a');
        for (let l = 0; l < 7; l++) {
          c.fillStyle = l % 2 ? '#3f8a4a' : '#2f6b3a';
          c.beginPath();
          c.ellipse(x + Math.cos(l) * 50, 1440 - l * 30, 50, 22, l * 0.7, 0, TAU);
          c.fill();
        }
      }
    },
    anim(c, t) {
      // ฝนบนกระจก
      const [wx, wy, ww, wh] = cafe.win || [300, 330, 480, 420];
      c.save();
      c.beginPath();
      c.rect(wx + 9, wy + 9, ww - 18, wh - 18);
      c.clip();
      c.strokeStyle = 'rgba(200,220,255,.45)';
      c.lineWidth = 2;
      for (let i = 0; i < 60; i++) {
        const x = wx + ((i * 97 + t / 6) % ww);
        const y = wy + ((i * 53 + t / 2) % wh);
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x - 5, y + 20);
        c.stroke();
      }
      for (let i = 0; i < 8; i++) {
        const y = wy + ((i * 61 + t / 30) % wh);
        circle(c, wx + 30 + i * 56, y, 4, 'rgba(220,235,255,.6)');
      }
      c.restore();
      // ไอกาแฟจากเครื่องชง/แก้ว
      c.strokeStyle = 'rgba(255,255,255,.3)';
      c.lineWidth = 4;
      for (const x0 of [480, 655]) {
        c.beginPath();
        for (let y = 0; y < 90; y += 6) {
          const x = x0 + Math.sin(y / 14 + t / 500) * 8;
          y ? c.lineTo(x, 700 - y) : c.moveTo(x, 700);
        }
        c.stroke();
      }
      // โคมไฟสั่นไหวเบา ๆ
      for (const x of cafe.lamps || []) {
        c.fillStyle = `rgba(255,210,140,${0.05 + Math.abs(Math.sin(t / 900 + x)) * 0.05})`;
        poly(c, [[x - 30, 284], [x + 30, 284], [x + 130, 760], [x - 130, 760]], c.fillStyle);
      }
    },
  };

  // ---------------------------------------------------------------- 8) กีฬาสี
  // นักวิ่ง 4 สีวิ่งแข่งรอบลู่ (โค้งด้านหลังสนาม) • พิมพ์ "แดง"/"น้ำเงิน" = สีนั้นเร่ง • "วิ่ง" = ทุกคนเร่ง
  const TRACK = { cx: 540, cy: 1500, rx0: 380, ry0: 440, drx: 55, dry: 60 };
  const TEAM = [['แดง', '#e74c3c', 'red'], ['เหลือง', '#f1c40f', 'yellow'], ['น้ำเงิน', '#2f6fd6', 'blue'], ['เขียว', '#27ae60', 'green']];
  const FINISH = 64; // องศาของเส้นชัย (โค้งหลังสนาม ด้านขวา)
  const race = {
    runners: TEAM.map(([name, col, id], k) => ({ name, col, id, lane: k, th: 128 - k * 4, v: 0, boost: 0, ph: k })),
    last: 0,
    banner: null,
  };
  const laneXY = (lane, th) => {
    const rx = TRACK.rx0 + TRACK.drx * (lane + 0.5);
    const ry = TRACK.ry0 + TRACK.dry * (lane + 0.5);
    return [TRACK.cx + rx * Math.cos(th * DEG), TRACK.cy - ry * Math.sin(th * DEG)];
  };
  const school = {
    draw(c, P) {
      sky(c, P, 840);
      for (const [x, y, s] of [[120, 300, 0.9], [780, 230, 0.8]]) cloud(c, x, y, s, 0.9);
      c.fillStyle = '#5aa84a';
      c.fillRect(0, 760, 1080, 80);
      // อาคารเรียน 3 ชั้น + หอนาฬิกา
      rr(c, 110, 470, 860, 300, 4, '#f3ead2');
      poly(c, [[90, 480], [990, 480], [960, 430], [120, 430]], '#c8553d');
      for (let f = 0; f < 3; f++) {
        c.fillStyle = '#d9cba6';
        c.fillRect(110, 560 + f * 86, 860, 8);
        for (let i = 0; i < 12; i++) {
          if (i === 5 || i === 6) continue;
          rr(c, 134 + i * 70, 492 + f * 86, 46, 56, 3, '#7fb7e0', '#ffffff', 3);
        }
      }
      rr(c, 470, 370, 140, 400, 4, '#efe2c2');
      poly(c, [[450, 380], [630, 380], [540, 312]], '#c8553d');
      circle(c, 540, 440, 40, '#ffffff');
      c.strokeStyle = '#333';
      c.lineWidth = 5;
      c.beginPath();
      c.moveTo(540, 440);
      c.lineTo(540, 412);
      c.moveTo(540, 440);
      c.lineTo(560, 450);
      c.stroke();
      rr(c, 500, 680, 80, 90, [40, 40, 0, 0], '#7a4f2c');
      // เสาธงชาติบนหอ
      c.fillStyle = '#ccc';
      c.fillRect(562, 300, 5, 90);
      school.flag = [567, 304];
      for (const x of [80, 1000]) bushyTree(c, x, 760, 120, '#2f7a3f', '#3f9a50', x);
      // อัฒจันทร์เชียร์ 4 สี
      for (const [, col, , x] of TEAM.map((tm, i) => [...tm, 80 + i * 260])) {
        for (let r = 0; r < 4; r++) rr(c, x - 10 + r * 6, 790 - r * 26, 160 - r * 12, 22, 3, '#9aa0aa');
        const g = rng(x);
        for (let r = 0; r < 4; r++) for (let i = 0; i < 8 - r; i++) circle(c, x + 6 + r * 6 + i * 19, 778 - r * 26, 8, g() > 0.3 ? col : '#ffffff');
        rr(c, x + 20, 804, 110, 30, 6, col);
      }
      // ลู่วิ่ง (ตัดไม่ให้เส้นลู่ทับอัฒจันทร์)
      c.save();
      c.beginPath();
      c.rect(0, 846, 1080, 1100);
      c.clip();
      ground(c, 846, P.ground2, '#b5653c');
      c.fillStyle = P.ground;
      c.beginPath();
      c.ellipse(TRACK.cx, TRACK.cy, TRACK.rx0 - 10, TRACK.ry0 - 10, 0, 0, TAU);
      c.fill();
      c.strokeStyle = 'rgba(255,255,255,.75)';
      c.lineWidth = 4;
      for (let i = 0; i <= 4; i++) {
        c.beginPath();
        c.ellipse(TRACK.cx, TRACK.cy, TRACK.rx0 + i * TRACK.drx, TRACK.ry0 + i * TRACK.dry, 0, 0, TAU);
        c.stroke();
      }
      // เส้นชัยลายหมากรุก
      for (let k = 0; k < 4; k++) {
        const [x0, y0] = laneXY(k - 0.5, FINISH);
        const [x1, y1] = laneXY(k + 0.5, FINISH);
        for (let j = 0; j < 6; j++) {
          c.fillStyle = (j + k) % 2 ? '#ffffff' : '#222';
          const a = j / 6;
          const b = (j + 1) / 6;
          poly(c, [[x0 + (x1 - x0) * a, y0 + (y1 - y0) * a], [x0 + (x1 - x0) * b, y0 + (y1 - y0) * b], [x0 + (x1 - x0) * b + 10, y0 + (y1 - y0) * b + 4], [x0 + (x1 - x0) * a + 10, y0 + (y1 - y0) * a + 4]], c.fillStyle);
        }
      }
      c.restore();
      school.poles = [60, 260, 820, 1020];
      for (const x of school.poles) {
        c.fillStyle = '#ddd';
        c.fillRect(x - 3, 880, 6, 150);
      }
    },
    anim(c, t) {
      const dt = Math.min(0.05, (t - (race.last || t)) / 1000);
      race.last = t;
      race.now = t;
      // ธงชาติโบก
      const [fx, fy] = school.flag || [567, 304];
      const stripes = ['#e2231a', '#ffffff', '#2d2a6e', '#2d2a6e', '#ffffff', '#e2231a'];
      for (let i = 0; i < 6; i++) {
        c.fillStyle = stripes[i];
        c.beginPath();
        for (let x = 0; x <= 70; x += 10) {
          const y = fy + i * 7 + Math.sin(x / 18 - t / 250) * 4 * (x / 70);
          x ? c.lineTo(fx + x, y) : c.moveTo(fx, y);
        }
        for (let x = 70; x >= 0; x -= 10) c.lineTo(fx + x, fy + (i + 1) * 7 + Math.sin(x / 18 - t / 250) * 4 * (x / 70));
        c.fill();
      }
      // ธงสีทีมรอบสนาม
      (school.poles || []).forEach((x, i) => {
        c.fillStyle = TEAM[i][1];
        c.beginPath();
        c.moveTo(x + 3, 884);
        for (let k = 0; k <= 70; k += 10) c.lineTo(x + 3 + k, 884 + Math.sin(k / 15 - t / 300 + i) * 6);
        for (let k = 70; k >= 0; k -= 10) c.lineTo(x + 3 + k, 930 + Math.sin(k / 15 - t / 300 + i) * 6);
        c.fill();
      });
      // นักวิ่ง: วิ่งตามโค้งจากซ้ายไปขวา (มุมลดลง) เข้าเส้นชัยแล้ววนใหม่
      const order = [...race.runners].sort((a, b) => b.lane - a.lane); // ลู่นอก (ไกล) วาดก่อน
      for (const r of race.runners) {
        r.boost = Math.max(0, r.boost - dt);
        const sp = 7 + Math.sin(t / 1300 + r.lane * 2) * 1.6 + (r.boost > 0 ? 10 : 0); // องศาต่อวินาที
        const before = r.th;
        r.th -= sp * dt;
        r.ph += dt * (r.boost > 0 ? 18 : 12);
        if (before > FINISH && r.th <= FINISH && !race.banner) race.banner = { text: `🏁 สี${r.name} เข้าเส้นชัย!`, col: r.col, until: t + 2200 };
        // วิ่งเฉพาะโค้งหลังสนาม (ไม่ทับคนดูด้านหน้า) แล้ววนกลับจุดเริ่ม
        if (r.th < 52) r.th = 130 + Math.random() * 6;
      }
      for (const r of order) {
        const [x, y] = laneXY(r.lane, r.th);
        const s = 0.62 + (y - 840) / 900;
        runner(c, x, y, s, r.col, r.ph);
        if (r.boost > 0) {
          c.fillStyle = 'rgba(255,255,255,.6)';
          for (let k = 1; k <= 3; k++) c.fillRect(x - 30 * s - k * 12, y - 60 * s + k * 8, 18, 3);
        }
      }
      // ประกาศเข้าเส้นชัย
      if (race.banner && t < race.banner.until) {
        const a = Math.min(1, (race.banner.until - t) / 400);
        c.globalAlpha = a;
        rr(c, 330, 860, 420, 64, 32, 'rgba(20,20,40,.82)', race.banner.col, 4);
        c.font = '800 34px Kanit, "Leelawadee UI", sans-serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillStyle = '#fff';
        c.fillText(race.banner.text, 540, 893);
        c.globalAlpha = 1;
      } else if (race.banner) race.banner = null;
      // กระดาษสีโปรยเบา ๆ (เฉพาะท้องฟ้า)
      const g = rng(7);
      for (let i = 0; i < 18; i++) {
        const x = (g() * 1080 + Math.sin(t / 900 + i) * 30) % 1080;
        const y = (g() * 760 + t / (14 + g() * 10)) % 760;
        c.fillStyle = TEAM[i % 4][1];
        c.save();
        c.translate(x, y);
        c.rotate(t / 300 + i);
        c.fillRect(-5, -3, 10, 6);
        c.restore();
      }
    },
    onCmd(d) {
      const r = race.runners.find((x) => x.id === d.zone);
      if (r) r.boost = 1.6;
      else if (d.kind === 'dance') for (const x of race.runners) x.boost = 1.2;
    },
    onGoal() {
      for (const x of race.runners) x.boost = 2;
    },
  };

  // ================================================================ ธีมเทศกาลรอบปี
  function heartPath(c, cx, cy, k) {
    c.beginPath();
    for (let i = 0; i <= 60; i++) {
      const t = (i / 60) * TAU;
      const x = 16 * Math.sin(t) ** 3;
      const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      i ? c.lineTo(cx + x * k, cy - y * k) : c.moveTo(cx + x * k, cy - y * k);
    }
    c.closePath();
  }
  const heartPts = (cx, cy, k, n) =>
    Array.from({ length: n }, (_, i) => {
      const t = (i / n) * TAU;
      return [cx + 16 * Math.sin(t) ** 3 * k, cy - (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * k];
    });
  function heartShape(c, x, y, s, fill) {
    c.save();
    c.translate(x, y);
    c.scale(s, s);
    c.beginPath();
    c.moveTo(0, 9);
    c.bezierCurveTo(-14, 0, -11, -11, -4, -10);
    c.bezierCurveTo(-1, -9.5, 0, -7, 0, -6);
    c.bezierCurveTo(0, -7, 1, -9.5, 4, -10);
    c.bezierCurveTo(11, -11, 14, 0, 0, 9);
    c.fillStyle = fill;
    c.fill();
    c.restore();
  }
  function rose(c, x, y, r) {
    circle(c, x, y, r, '#c8104a');
    c.fillStyle = '#ff4f7b';
    c.beginPath();
    c.ellipse(x - r * 0.15, y - r * 0.25, r * 0.6, r * 0.35, -0.3, 0, TAU);
    c.fill();
    c.strokeStyle = '#7a0a2c';
    c.lineWidth = r * 0.18;
    c.beginPath();
    c.arc(x, y + r * 0.05, r * 0.5, 0.3, Math.PI - 0.3);
    c.stroke();
    circle(c, x + r * 0.05, y, r * 0.22, '#7a0a2c');
    c.fillStyle = '#2f7a3a';
    c.beginPath();
    c.ellipse(x + r * 0.9, y + r * 0.6, r * 0.5, r * 0.22, 0.6, 0, TAU);
    c.fill();
  }
  function tinyPerson(c, x, y, s, shirt, hair = '#2a1f1a') {
    c.fillStyle = 'rgba(0,0,0,.22)';
    c.beginPath();
    c.ellipse(x, y + 38 * s, 10 * s, 2.4 * s, 0, 0, TAU);
    c.fill();
    rr(c, x - 9 * s, y + 13 * s, 18 * s, 23 * s, 8 * s, shirt);
    c.fillStyle = '#2a2633';
    c.fillRect(x - 6 * s, y + 32 * s, 5 * s, 7 * s);
    c.fillRect(x + 1 * s, y + 32 * s, 5 * s, 7 * s);
    circle(c, x, y + 6 * s, 8 * s, '#f1c7a0');
    c.fillStyle = hair;
    c.beginPath();
    c.arc(x, y + 4 * s, 8.4 * s, Math.PI, 0);
    c.fill();
  }

  // ---------------------------------------------------------------- 9) วาเลนไทน์
  const valentine = {
    float: [],
    draw(c, P) {
      c.fillStyle = lin(c, 0, 0, 0, 940, [[0, '#14082a'], [0.35, '#4a1650'], [0.62, '#b8327a'], [0.82, '#ff7d9a'], [1, '#ffb3b0']]);
      c.fillRect(0, 0, 1080, 940);
      const g = rng(901);
      for (let i = 0; i < 80; i++) circle(c, g() * 1080, g() * 520, g() * 1.8 + 0.4, `rgba(255,240,250,${0.4 + g() * 0.5})`);
      // จันทร์เสี้ยว
      circle(c, 690, 380, 46, '#ffe8f0');
      circle(c, 708, 368, 42, '#5a1a58');
      // เมืองยามค่ำ
      const cg = rng(907);
      let x = -10;
      while (x < 1090) {
        const w = 40 + cg() * 70;
        const h = 90 + cg() * 200;
        c.fillStyle = cg() > 0.5 ? '#3a1640' : '#2e1036';
        c.fillRect(x, 900 - h, w, h);
        for (let wy = 900 - h + 14; wy < 890; wy += 22)
          for (let wx = x + 8; wx < x + w - 10; wx += 16) if (cg() > 0.45) {
            c.fillStyle = cg() > 0.7 ? 'rgba(255,200,230,.75)' : 'rgba(255,220,150,.7)';
            c.fillRect(wx, wy, 7, 10);
          }
        x += w + 4;
      }
      glow(c, 540, 640, 460, '255,170,210', 0.55);
      // ซุ้มกุหลาบรูปหัวใจ
      c.lineWidth = 18;
      c.strokeStyle = '#ffe3ec';
      heartPath(c, 540, 650, 14.5);
      c.stroke();
      const pts = heartPts(540, 650, 14.5, 46);
      for (const [px, py] of pts) rose(c, px, py, 15);
      // ลานหน้าซุ้ม
      c.fillStyle = lin(c, 0, 900, 0, 1920, [[0, '#7a2a5a'], [0.4, '#4a1638'], [1, '#22091c']]);
      c.fillRect(0, 900, 1080, 1020);
      c.strokeStyle = 'rgba(255,190,220,.14)';
      c.lineWidth = 2;
      for (let yy = 930; yy < 1920; yy += 46) {
        c.beginPath();
        c.moveTo(0, yy);
        c.lineTo(1080, yy);
        c.stroke();
      }
      for (let k = -12; k <= 12; k++) {
        c.beginPath();
        c.moveTo(540 + k * 30, 900);
        c.lineTo(540 + k * 160, 1920);
        c.stroke();
      }
      glow(c, 540, 930, 300, '255,140,190', 0.35);
      // ร้านกาแฟ LOVE CAFÉ (ซ้าย)
      rr(c, 40, 760, 230, 140, 10, '#ffe3ec');
      rr(c, 56, 790, 198, 70, 6, '#5a1a3a');
      for (let i = 0; i < 5; i++) circle(c, 84 + i * 36, 825, 10, ['#ffd166', '#ff8fab', '#ffffff'][i % 3]);
      for (let i = 0; i < 6; i++) {
        c.fillStyle = i % 2 ? '#ffffff' : '#ff4f8b';
        poly(c, [[30 + i * 42, 760], [72 + i * 42, 760], [64 + i * 40, 720], [36 + i * 40, 720]], c.fillStyle);
      }
      rr(c, 98, 870, 114, 24, 6, '#c2407a');
      c.font = '800 18px Kanit, sans-serif';
      c.fillStyle = '#ffffff';
      c.textAlign = 'center';
      c.fillText('LOVE CAFÉ', 155, 888);
      // ม้านั่ง + คู่รัก (ขวา)
      rr(c, 800, 850, 220, 14, 5, '#8a4a2a');
      rr(c, 800, 818, 220, 12, 5, '#8a4a2a');
      c.fillStyle = '#6a3820';
      c.fillRect(812, 864, 10, 36);
      c.fillRect(998, 864, 10, 36);
      tinyPerson(c, 880, 790, 1.6, '#3b82f6');
      tinyPerson(c, 940, 790, 1.6, '#ff4f8b', '#3a2016');
      heartShape(c, 910, 770, 1.6, '#ff2d6f');
      // โคมหัวใจห้อย (ซ้าย/ขวา ใต้แผงข้อมูล)
      for (const [x0, x1] of [[0, 300], [780, 1080]]) {
        c.strokeStyle = 'rgba(90,30,70,.9)';
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(x0, 690);
        c.quadraticCurveTo((x0 + x1) / 2, 740, x1, 690);
        c.stroke();
        for (let i = 1; i < 6; i++) {
          const u = i / 6;
          const hx = x0 + (x1 - x0) * u;
          const hy = 690 + Math.sin(u * Math.PI) * 25;
          c.beginPath();
          c.moveTo(hx, hy);
          c.lineTo(hx, hy + 26);
          c.stroke();
          glow(c, hx, hy + 40, 40, '255,120,170', 0.4);
          heartShape(c, hx, hy + 38, 1.6, i % 2 ? '#ff4f8b' : '#ffd0de');
        }
      }
    },
    anim(c, t) {
      // ไฟกะพริบบนซุ้ม
      c.save();
      c.globalCompositeOperation = 'lighter';
      heartPts(540, 650, 14.5, 46).forEach(([x, y], i) => {
        const a = 0.25 + 0.35 * Math.max(0, Math.sin(t / 300 + i * 0.7));
        glow(c, x, y - 8, 22, '255,230,170', a);
      });
      c.restore();
      // ลูกโป่งหัวใจลอยขึ้น
      for (let i = 0; i < 6; i++) {
        const g = rng(930 + i);
        const sp = 40 + g() * 30;
        const y = 1000 - (((t / 1000) * sp + g() * 700) % 700);
        const x = (i % 2 ? 330 + g() * 120 : 630 + g() * 120) + Math.sin(t / 900 + i) * 16;
        c.strokeStyle = 'rgba(255,255,255,.5)';
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(x, y + 22);
        c.lineTo(x + Math.sin(t / 500 + i) * 6, y + 70);
        c.stroke();
        heartShape(c, x, y, 2.4, ['#ff4f8b', '#ff8fab', '#ffd0de'][i % 3]);
      }
      // กลีบกุหลาบปลิว
      for (let i = 0; i < 14; i++) {
        const g = rng(950 + i);
        const y = ((t / 1000) * (50 + g() * 40) + g() * 1000) % 1000 + 300;
        const x = g() * 1080 + Math.sin(t / 700 + i) * 30;
        c.fillStyle = 'rgba(255,90,130,.85)';
        c.beginPath();
        c.ellipse(x, y, 7, 4, t / 400 + i, 0, TAU);
        c.fill();
      }
      // หัวใจจากคำสั่ง "รัก"
      this.float = this.float.filter((f) => t - f.t0 < 2600);
      for (const f of this.float) {
        const k = (t - f.t0) / 2600;
        c.globalAlpha = 1 - k;
        heartShape(c, f.x + Math.sin(k * 8 + f.x) * 20, 900 - k * 520, 2 + k * 2, '#ff2d6f');
        c.globalAlpha = 1;
      }
      if (!this.now) this.now = t;
      this.now = t;
    },
    onCmd(d) {
      if (d.cmd === 'รัก' || d.kind === 'emote') for (let i = 0; i < 3; i++) this.float.push({ x: 360 + Math.random() * 360, t0: (this.now || 0) + i * 160 });
    },
    onGoal() {
      for (let i = 0; i < 14; i++) this.float.push({ x: 300 + Math.random() * 480, t0: (this.now || 0) + i * 90 });
    },
  };

  // ---------------------------------------------------------------- 10) บุญบั้งไฟ
  function rocketShape(c, x, y, s, body, tip) {
    c.save();
    c.translate(x, y);
    c.scale(s, s);
    rr(c, -12, -90, 24, 110, 5, body);
    c.strokeStyle = 'rgba(80,40,10,.6)';
    c.lineWidth = 2;
    for (const yy of [-66, -40, -14]) {
      c.beginPath();
      c.moveTo(-12, yy);
      c.lineTo(12, yy);
      c.stroke();
    }
    poly(c, [[-12, -90], [0, -122], [12, -90]], tip);
    c.fillStyle = '#5a3a1a';
    c.fillRect(-3, 20, 6, 70);
    c.restore();
  }
  const rocket = {
    fuel: { red: 0, blue: 0 },
    flights: [],
    draw(c, P) {
      c.fillStyle = lin(c, 0, 0, 0, 920, [[0, '#2565ad'], [0.5, '#79bfe8'], [0.85, '#ffe0a8'], [1, '#ffd08a']]);
      c.fillRect(0, 0, 1080, 920);
      glow(c, 840, 560, 260, '255,240,190', 0.55);
      circle(c, 840, 560, 54, '#fff4cf');
      for (const [x, y, s] of [[90, 300, 0.9], [620, 230, 0.7], [380, 420, 0.5]]) cloud(c, x, y, s, 0.85);
      ridge(c, 820, 110, '#6f8fb0', 1001, 70, 0.4);
      ridge(c, 860, 60, '#5d8a68', 1002, 50, 0.6);
      // ต้นตาล
      for (const [x, h, l] of [[60, 330, 20], [170, 280, -10], [930, 320, -20], [1030, 260, 10]]) palm(c, x, 900, h, l, '#4a3a2a', '#2f6a32');
      // ทุ่งนา
      c.fillStyle = lin(c, 0, 880, 0, 1920, [[0, '#9fd062'], [0.3, '#7ab84c'], [1, '#3f7a2c']]);
      c.fillRect(0, 880, 1080, 1040);
      c.strokeStyle = 'rgba(60,110,40,.45)';
      c.lineWidth = 3;
      for (let yy = 900; yy < 1920; yy += 34 + (yy - 900) * 0.05) {
        c.beginPath();
        c.moveTo(0, yy);
        c.quadraticCurveTo(540, yy - 10, 1080, yy);
        c.stroke();
      }
      // ค้างบั้งไฟไม้ไผ่ (กลาง)
      c.strokeStyle = '#a07a44';
      c.lineCap = 'round';
      c.lineWidth = 12;
      c.beginPath();
      c.moveTo(500, 920);
      c.lineTo(528, 380);
      c.moveTo(580, 920);
      c.lineTo(552, 380);
      c.stroke();
      c.lineWidth = 6;
      c.strokeStyle = '#c89a5a';
      for (let y = 880; y > 400; y -= 52) {
        const k = (920 - y) / 540;
        c.beginPath();
        c.moveTo(500 + 28 * k, y);
        c.lineTo(580 - 28 * k, y);
        c.stroke();
      }
      c.strokeStyle = '#8a6a3a';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(540, 380);
      c.lineTo(540, 330);
      c.stroke();
      poly(c, [[540, 330], [580, 342], [540, 354]], '#e8453c');
      rocketShape(c, 540, 470, 1.15, '#d9a441', '#3b82f6');
      // ธงริ้ว
      for (const [x, col] of [[440, '#e8453c'], [640, '#3b82f6']]) {
        c.strokeStyle = '#5a3a20';
        c.lineWidth = 4;
        c.beginPath();
        c.moveTo(x, 920);
        c.lineTo(x, 700);
        c.stroke();
        poly(c, [[x, 700], [x + 50, 716], [x, 732]], col);
      }
      // ฐานยิงทีมแดง/น้ำเงิน
      for (const [x, col] of [[400, '#e8453c'], [680, '#3b82f6']]) {
        rr(c, x - 40, 900, 80, 22, 6, '#6b4a2a');
        rr(c, x - 30, 880, 60, 22, 6, col);
      }
    },
    anim(c, t) {
      this.now = t;
      // จรวดทีมที่ตั้งรอบนฐาน
      for (const [team, x, col] of [['red', 400, '#e8453c'], ['blue', 680, '#3b82f6']]) {
        const flying = this.flights.some((f) => f.team === team && t - f.t0 < 3200);
        if (!flying) rocketShape(c, x, 878, 0.9, col, '#ffd166');
        const k = Math.min(1, (this.fuel[team] % 12) / 12);
        rr(c, x - 34, 940, 68, 10, 5, 'rgba(0,0,0,.35)');
        rr(c, x - 34, 940, 68 * k, 10, 5, col);
      }
      // เที่ยวบิน (ควันยาว)
      this.flights = this.flights.filter((f) => t - f.t0 < 4200);
      for (const f of this.flights) {
        const k = Math.min(1, (t - f.t0) / 3200);
        const x = f.x + Math.sin(k * 3) * 40 * f.dir;
        const y = 870 - k * k * 900;
        c.strokeStyle = 'rgba(255,255,255,.75)';
        c.lineWidth = 22;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(f.x, 870);
        for (let i = 1; i <= 16; i++) {
          const kk = (k * i) / 16;
          c.lineTo(f.x + Math.sin(kk * 3) * 40 * f.dir, 870 - kk * kk * 900);
        }
        c.stroke();
        if (k < 1) {
          glow(c, x, y + 50, 50, '255,170,60', 0.8);
          rocketShape(c, x, y, 0.9, f.col, '#ffd166');
        }
      }
      // ควันที่ฐานค้างใหญ่ (เบา ๆ)
      for (let i = 0; i < 6; i++) {
        const g = rng(1010 + i);
        const p = ((t / 1000) * 0.3 + g()) % 1;
        c.fillStyle = `rgba(255,255,255,${0.35 * (1 - p)})`;
        circle(c, 540 + (g() - 0.5) * 120 * p, 900 - p * 90, 24 + p * 50, c.fillStyle);
      }
      // ขบวนบั้งไฟพญานาค (ไกล ๆ)
      const nx = 1200 - (((t / 1000) * 55) % 1500);
      c.strokeStyle = '#2f9a5a';
      c.lineWidth = 22;
      c.beginPath();
      for (let i = 0; i <= 12; i++) {
        const px = nx + i * 24;
        const py = 980 + Math.sin(t / 500 + i * 0.6) * 8;
        i ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      c.stroke();
      poly(c, [[nx - 10, 976], [nx - 40, 958], [nx - 18, 990]], '#e8453c');
      circle(c, nx - 2, 974, 5, '#ffffff');
      for (let i = 0; i < 4; i++) tinyPerson(c, nx + 30 + i * 70, 990, 1.2, ['#e8453c', '#ffd166', '#3b82f6', '#22c55e'][i]);
    },
    onCmd(d) {
      if (d.zone !== 'red' && d.zone !== 'blue') return;
      this.fuel[d.zone] += 1;
      if (this.fuel[d.zone] % 12 === 0) this.launch(d.zone);
    },
    launch(team) {
      this.flights.push({ team, t0: this.now || 0, x: team === 'red' ? 400 : 680, dir: team === 'red' ? -1 : 1, col: team === 'red' ? '#e8453c' : '#3b82f6' });
    },
    onGoal() {
      this.launch('red');
      this.launch('blue');
    },
  };

  // ---------------------------------------------------------------- 11) วันแม่
  function jasmine(c, x, y, r) {
    c.fillStyle = '#ffffff';
    for (let k = 0; k < 5; k++) {
      c.beginPath();
      c.ellipse(x + Math.cos((k / 5) * TAU) * r * 0.55, y + Math.sin((k / 5) * TAU) * r * 0.55, r * 0.55, r * 0.32, (k / 5) * TAU, 0, TAU);
      c.fill();
    }
    circle(c, x, y, r * 0.25, '#f4d35e');
  }
  const mother = {
    petals: [],
    draw(c, P) {
      c.fillStyle = lin(c, 0, 0, 0, 920, [[0, '#7cb9f2'], [0.6, '#cfe7ff'], [1, '#fff3df']]);
      c.fillRect(0, 0, 1080, 920);
      glow(c, 860, 360, 300, '255,246,200', 0.6);
      circle(c, 860, 360, 50, '#fffbe6');
      c.save();
      c.globalAlpha = 0.18;
      c.fillStyle = '#fff6cc';
      for (const a of [2.2, 2.45, 2.7]) {
        c.beginPath();
        c.moveTo(860, 360);
        c.lineTo(860 + Math.cos(a - 0.04) * 900, 360 + Math.sin(a - 0.04) * 900);
        c.lineTo(860 + Math.cos(a + 0.04) * 900, 360 + Math.sin(a + 0.04) * 900);
        c.fill();
      }
      c.restore();
      for (const [x, y, s] of [[120, 300, 0.9], [440, 250, 0.6]]) cloud(c, x, y, s, 0.9);
      ridge(c, 860, 70, '#9cc3a0', 1101, 60, 0.4);
      // พวงมาลัยมะลิพาดบน
      c.strokeStyle = '#6f9a5e';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(330, 360);
      c.quadraticCurveTo(540, 470, 750, 360);
      c.stroke();
      for (let i = 0; i <= 18; i++) {
        const u = i / 18;
        const x = (1 - u) * (1 - u) * 330 + 2 * (1 - u) * u * 540 + u * u * 750;
        const y = (1 - u) * (1 - u) * 360 + 2 * (1 - u) * u * 470 + u * u * 360;
        jasmine(c, x, y, 13);
      }
      for (const dx of [-10, 0, 10]) {
        c.strokeStyle = '#e8453c';
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(540 + dx, 418);
        c.lineTo(540 + dx * 2, 480);
        c.stroke();
      }
      circle(c, 540, 418, 11, '#e8453c');
      // เรือนไทย
      c.fillStyle = '#7a5434';
      for (const x of [380, 470, 610, 700]) c.fillRect(x, 780, 14, 120);
      rr(c, 350, 760, 380, 22, 4, '#8a6440');
      rr(c, 380, 640, 320, 122, 4, '#c4935e');
      c.strokeStyle = '#a87a4a';
      c.lineWidth = 2;
      for (let y = 656; y < 760; y += 16) {
        c.beginPath();
        c.moveTo(380, y);
        c.lineTo(700, y);
        c.stroke();
      }
      rr(c, 420, 670, 60, 72, 4, 'rgba(90,143,208,.6)');
      rr(c, 600, 670, 60, 72, 4, 'rgba(90,143,208,.6)');
      rr(c, 510, 660, 60, 100, 4, '#6a4428');
      poly(c, [[350, 646], [540, 520], [730, 646]], '#9a3e2e', '#e6b84a', 4);
      poly(c, [[540, 520], [530, 494], [550, 494]], '#e6b84a');
      c.strokeStyle = '#e6b84a';
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(730, 646);
      c.quadraticCurveTo(752, 640, 752, 616);
      c.moveTo(350, 646);
      c.quadraticCurveTo(328, 640, 328, 616);
      c.stroke();
      // ราวระเบียง + บันได
      c.fillStyle = '#7a5434';
      for (let x = 356; x < 724; x += 18) c.fillRect(x, 734, 6, 28);
      rr(c, 350, 730, 380, 8, 3, '#7a5434');
      for (let i = 0; i < 6; i++) rr(c, 490 + i * 3, 790 + i * 20, 100 - i * 6, 8, 3, '#8a6440');
      // กระถางต้นไม้
      for (const x of [372, 708]) {
        rr(c, x - 14, 742, 28, 20, 4, '#c0563f');
        circle(c, x, 734, 16, '#4f8f46');
      }
      // สนามหญ้า + ทางเดิน
      c.fillStyle = lin(c, 0, 880, 0, 1920, [[0, '#b5dd98'], [0.4, '#8cc272'], [1, '#5f9a4c']]);
      c.fillRect(0, 880, 1080, 1040);
      c.fillStyle = 'rgba(240,226,200,.8)';
      c.beginPath();
      c.moveTo(500, 900);
      c.lineTo(580, 900);
      c.lineTo(760, 1920);
      c.lineTo(320, 1920);
      c.closePath();
      c.fill();
      // พุ่มมะลิสองข้าง
      for (const [cx, cy, seed] of [[120, 900, 1110], [960, 910, 1111], [250, 960, 1112], [840, 970, 1113]]) {
        const g = rng(seed);
        for (let k = 0; k < 7; k++) circle(c, cx + (g() - 0.5) * 160, cy + (g() - 0.5) * 50, 40 + g() * 26, k % 2 ? '#4f8f46' : '#63a656');
        for (let k = 0; k < 16; k++) jasmine(c, cx + (g() - 0.5) * 170, cy - 20 + (g() - 0.5) * 70, 8 + g() * 3);
      }
      // แม่กับลูกหน้าบันได
      tinyPerson(c, 470, 830, 2.4, '#5a8fd0', '#3a2a22');
      tinyPerson(c, 525, 862, 1.6, '#ffd166');
      c.strokeStyle = '#f1c7a0';
      c.lineWidth = 7;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(486, 878);
      c.lineTo(514, 888);
      c.stroke();
      jasmine(c, 540, 872, 10);
    },
    anim(c, t) {
      this.now = t;
      // ผีเสื้อ
      for (let i = 0; i < 4; i++) {
        const x = 360 + i * 110 + Math.sin(t / 900 + i * 2) * 60;
        const y = 560 + Math.cos(t / 700 + i) * 50 + (i % 2) * 140;
        const f = Math.abs(Math.sin(t / 90 + i));
        c.fillStyle = ['#ffb3c7', '#ffd166', '#a5d8ff', '#ffffff'][i];
        c.beginPath();
        c.ellipse(x - 7 * f, y, 9 * f + 2, 7, -0.4, 0, TAU);
        c.ellipse(x + 7 * f, y, 9 * f + 2, 7, 0.4, 0, TAU);
        c.fill();
      }
      // ดอกมะลิลอยช้า ๆ
      for (let i = 0; i < 10; i++) {
        const g = rng(1130 + i);
        const y = ((t / 1000) * (30 + g() * 20) + g() * 800) % 800 + 360;
        const x = g() * 1080 + Math.sin(t / 800 + i) * 24;
        jasmine(c, x, y, 7);
      }
      this.petals = this.petals.filter((p) => t - p.t0 < 3200);
      for (const p of this.petals) {
        const k = (t - p.t0) / 3200;
        c.globalAlpha = 1 - k;
        jasmine(c, p.x + Math.sin(k * 6) * 30, 1000 - k * 640, 12 + k * 6);
        c.globalAlpha = 1;
      }
    },
    onCmd(d) {
      if (d.kind === 'emote' || d.zone === 'garland') for (let i = 0; i < 3; i++) this.petals.push({ x: 380 + Math.random() * 320, t0: (this.now || 0) + i * 200 });
    },
    onGoal() {
      for (let i = 0; i < 16; i++) this.petals.push({ x: 300 + Math.random() * 480, t0: (this.now || 0) + i * 80 });
    },
  };

  // ---------------------------------------------------------------- 12) ไหว้พระจันทร์
  function redLantern(c, x, y, s) {
    glow(c, x, y, 60 * s, '255,110,60', 0.5);
    c.fillStyle = '#d62f2f';
    c.beginPath();
    c.ellipse(x, y, 22 * s, 26 * s, 0, 0, TAU);
    c.fill();
    c.strokeStyle = '#a01f1f';
    c.lineWidth = 1.5;
    for (const dx of [-10, 0, 10]) {
      c.beginPath();
      c.ellipse(x, y, Math.abs(dx) * s + 1, 25 * s, 0, 0, TAU);
      c.stroke();
    }
    c.fillStyle = '#e6b84a';
    c.fillRect(x - 11 * s, y - 28 * s, 22 * s, 6 * s);
    c.fillRect(x - 11 * s, y + 22 * s, 22 * s, 6 * s);
    c.strokeStyle = '#ffd166';
    c.beginPath();
    for (const dx of [-5, 0, 5]) {
      c.moveTo(x + dx * s, y + 28 * s);
      c.lineTo(x + dx * s, y + 44 * s);
    }
    c.stroke();
  }
  function mooncake(c, x, y, r) {
    c.fillStyle = '#a8743a';
    c.beginPath();
    c.ellipse(x, y + r * 0.35, r, r * 0.4, 0, 0, TAU);
    c.fill();
    c.fillStyle = '#d9a441';
    c.fillRect(x - r, y - r * 0.2, r * 2, r * 0.55);
    c.fillStyle = '#e6b85a';
    c.beginPath();
    c.ellipse(x, y - r * 0.2, r, r * 0.4, 0, 0, TAU);
    c.fill();
    c.strokeStyle = '#a8743a';
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(x, y - r * 0.2, r * 0.45, r * 0.18, 0, 0, TAU);
    c.stroke();
  }
  const moon = {
    wishes: [],
    draw(c, P) {
      c.fillStyle = lin(c, 0, 0, 0, 920, [[0, '#03061a'], [0.5, '#141a4a'], [1, '#3a2658']]);
      c.fillRect(0, 0, 1080, 920);
      const g = rng(1201);
      for (let i = 0; i < 120; i++) circle(c, g() * 1080, g() * 700, g() * 1.8 + 0.3, `rgba(255,255,255,${0.3 + g() * 0.6})`);
      glow(c, 540, 520, 380, '255,240,190', 0.5);
      c.fillStyle = rad(c, 520, 500, 10, 170, [[0, '#fffbe6'], [1, '#f1dc9c']]);
      c.beginPath();
      c.arc(540, 520, 160, 0, TAU);
      c.fill();
      for (const [x, y, r] of [[490, 470, 24], [600, 560, 18], [580, 450, 9], [470, 580, 13]]) circle(c, x, y, r, 'rgba(220,196,130,.45)');
      // กระต่ายตำยาบนดวงจันทร์
      c.fillStyle = 'rgba(214,190,128,.85)';
      c.beginPath();
      c.ellipse(510, 560, 34, 22, 0, 0, TAU);
      c.ellipse(536, 534, 16, 14, 0, 0, TAU);
      c.ellipse(536, 506, 6, 18, -0.2, 0, TAU);
      c.ellipse(548, 508, 6, 18, 0.2, 0, TAU);
      c.fill();
      rr(c, 566, 550, 36, 26, 4, 'rgba(214,190,128,.85)');
      c.strokeStyle = 'rgba(214,190,128,.85)';
      c.lineWidth = 6;
      c.beginPath();
      c.moveTo(550, 530);
      c.lineTo(584, 556);
      c.stroke();
      // เมืองเก่า/หลังคาจีนไกล ๆ
      c.fillStyle = '#1a1438';
      for (const [x, w, h] of [[0, 180, 120], [170, 120, 80], [760, 140, 100], [890, 190, 140]]) {
        c.fillRect(x, 900 - h, w, h);
        poly(c, [[x - 16, 900 - h], [x + w / 2, 900 - h - 40], [x + w + 16, 900 - h]], '#241a48');
      }
      // ราวโคมแดง (ใต้ดวงจันทร์)
      c.strokeStyle = 'rgba(80,30,20,.9)';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(250, 720);
      c.quadraticCurveTo(540, 800, 830, 720);
      c.stroke();
      for (let i = 1; i < 8; i++) {
        const u = i / 8;
        const x = (1 - u) * (1 - u) * 250 + 2 * (1 - u) * u * 540 + u * u * 830;
        const y = (1 - u) * (1 - u) * 720 + 2 * (1 - u) * u * 800 + u * u * 720;
        redLantern(c, x, y + 36, 0.85);
      }
      // ลานไม้ + สระสะท้อนจันทร์
      c.fillStyle = lin(c, 0, 900, 0, 1920, [[0, '#2a1a3a'], [1, '#100a1c']]);
      c.fillRect(0, 900, 1080, 1020);
      c.fillStyle = 'rgba(30,40,90,.8)';
      c.beginPath();
      c.ellipse(860, 1040, 200, 60, 0, 0, TAU);
      c.fill();
      for (let i = 0; i < 6; i++) rr(c, 820 - i * 6, 1010 + i * 10, 80 + i * 12, 3, 2, 'rgba(255,242,196,.55)');
      for (const [x, y] of [[740, 1050], [960, 1030], [900, 1080]]) {
        c.fillStyle = '#2f6a4a';
        c.beginPath();
        c.ellipse(x, y, 30, 9, 0, 0, TAU);
        c.fill();
      }
      poly(c, [[742, 1044], [752, 1018], [762, 1044]], '#ff8fab');
      // โต๊ะไหว้
      rr(c, 300, 900, 480, 26, 4, '#b8322a');
      poly(c, [[300, 926], [780, 926], [760, 1010], [320, 1010]], '#9a2a22');
      poly(c, [[500, 926], [580, 926], [580, 970], [500, 970]], '#e6b84a');
      c.strokeStyle = '#e6b84a';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(380, 926);
      c.lineTo(390, 1010);
      c.moveTo(700, 926);
      c.lineTo(690, 1010);
      c.stroke();
      c.fillStyle = '#f4f1ec';
      c.beginPath();
      c.ellipse(390, 900, 52, 12, 0, 0, TAU);
      c.ellipse(690, 900, 52, 12, 0, 0, TAU);
      c.fill();
      mooncake(c, 372, 884, 22);
      mooncake(c, 410, 884, 22);
      mooncake(c, 390, 860, 20);
      circle(c, 680, 870, 26, '#9acd4a');
      circle(c, 704, 878, 20, '#b5d85a');
      rr(c, 520, 860, 40, 40, 8, '#d9a441');
      for (const x of [450, 630]) {
        rr(c, x - 6, 846, 12, 54, 3, '#e8453c');
      }
    },
    anim(c, t) {
      this.now = t;
      // เมฆลอยผ่านดวงจันทร์
      for (let i = 0; i < 2; i++) {
        const x = ((t / 1000) * (14 + i * 6) + i * 600) % 1500 - 300;
        c.fillStyle = 'rgba(40,40,90,.55)';
        c.beginPath();
        c.ellipse(x, 470 + i * 110, 150, 18, 0, 0, TAU);
        c.ellipse(x + 80, 460 + i * 110, 90, 14, 0, 0, TAU);
        c.fill();
      }
      // เปลวเทียน + ควันธูป
      for (const x of [450, 630]) {
        const f = 1 + Math.sin(t / 90 + x) * 0.2;
        glow(c, x, 838, 40, '255,200,100', 0.6);
        c.fillStyle = '#ffd166';
        c.beginPath();
        c.ellipse(x, 836, 5 * f, 11 * f, 0, 0, TAU);
        c.fill();
      }
      c.strokeStyle = 'rgba(230,226,245,.35)';
      c.lineWidth = 3;
      c.beginPath();
      for (let k = 0; k <= 16; k++) {
        const y = 856 - k * 16;
        const x = 540 + Math.sin(t / 700 + k * 0.5) * (4 + k * 1.5);
        k ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.stroke();
      // โคมลอยขึ้นฟ้า
      for (let i = 0; i < 10; i++) {
        const g = rng(1240 + i);
        const sp = 18 + g() * 20;
        const span = 620;
        const p = ((t / 1000) * sp + g() * span) % span;
        const y = 860 - p;
        const x = 280 + g() * 520 + Math.sin(t / 1400 + i) * 14;
        const s = 0.6 + g() * 0.6;
        c.globalAlpha = Math.min(1, p / 60) * Math.min(1, (span - p) / 120);
        glow(c, x, y, 30 * s, '255,180,80', 0.55);
        poly(c, [[x - 9 * s, y - 13 * s], [x + 9 * s, y - 13 * s], [x + 6 * s, y + 12 * s], [x - 6 * s, y + 12 * s]], '#ff9f43');
        c.globalAlpha = 1;
      }
      // โคมขอพรจากคอมเมนต์ (มีชื่อ)
      this.wishes = this.wishes.filter((w) => t - w.t0 < 7000);
      for (const w of this.wishes) {
        const k = (t - w.t0) / 7000;
        const y = 1050 - k * 700;
        const x = w.x + Math.sin(k * 5) * 30;
        c.globalAlpha = Math.min(1, (1 - k) * 2);
        glow(c, x, y, 44, '255,180,80', 0.6);
        poly(c, [[x - 14, y - 20], [x + 14, y - 20], [x + 10, y + 18], [x - 10, y + 18]], '#ff9f43');
        c.font = '600 22px Kanit, sans-serif';
        c.textAlign = 'center';
        c.fillStyle = '#ffe9a8';
        c.fillText(w.name, x, y + 46);
        c.globalAlpha = 1;
      }
    },
    onCmd(d) {
      if (d.kind === 'emote' || d.cmd === 'ขอพร') this.wishes.push({ x: 320 + Math.random() * 440, name: String(d.name || '').slice(0, 14), t0: this.now || 0 });
    },
    onGoal() {
      for (let i = 0; i < 10; i++) this.wishes.push({ x: 300 + Math.random() * 480, name: '', t0: (this.now || 0) + i * 200 });
    },
  };

  window.HUD_SCENES = { temple, floating, nightmarket, muay, beach, farm, cafe, school, valentine, rocket, mother, moon };
})();
