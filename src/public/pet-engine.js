/* ธีมสัตว์เลี้ยง (ไลฟ์ให้อาหารน้อง) — ใช้ร่วมกัน 10 ธีม ข้อมูลธีมอยู่ใน petthemes.js
 * ไฟล์ธีม public/themes/<id>.js เรียก window.makePetTheme('<id>')
 * ภาพทั้งหมด (SVG ใน public/pets/) วาดลงแคนวาสครั้งเดียวตอนโหลด แล้วใช้ซ้ำทุกเฟรม → ไม่กระตุก
 * ฉากหลัง = ชั้นนิ่ง (วาดครั้งเดียว) • น้อง/อาหาร/หัวใจ/หิมะ = ชั้นเคลื่อนไหว (วาดภาพที่เตรียมไว้ จำนวนจำกัด)
 */
(() => {
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const meta = () => window.__stage?.api?.meta || {};
  const hud = () => meta().hud || {};
  const petCfg = () => hud().pet || {};

  // ---- ขนาด/ตำแหน่งภาพ (พิกัดดีไซน์ 540x960 → คูณ 2)
  const VB = {
    cat: [-30, -32, 60, 64], dog: [-30, -32, 60, 64], bun: [-30, -40, 60, 72], ham: [-40, -38, 80, 74], peng: [-36, -44, 72, 88], panda: [-44, -46, 88, 92],
    capy: [-46, -40, 92, 76], hippo: [-46, -40, 92, 80], ele: [-52, -46, 104, 92], dkl: [-28, -30, 56, 52], duck: [-30, -26, 60, 46],
  };
  // ตา (สำหรับกะพริบ/ตายิ้ม) • ปาก (จุดที่อาหารลง) — พิกัดในภาพ
  const FACE = {
    cat: { eyes: [[-5.5, -9], [5.5, -9]], r: 2.9, lid: '#f4a259', mouth: [0, -2] },
    dog: { eyes: [[-5.5, -10], [5.5, -10]], r: 2.8, lid: '#e0954a', mouth: [0, 0] },
    bun: { eyes: [[-4.6, -7], [4.6, -7]], r: 2.7, lid: '#fcfcfc', mouth: [0, -1] },
    ham: { eyes: [[-11, -6], [11, -6]], r: 4.7, lid: '#f2bd85', mouth: [0, 12] },
    peng: { eyes: [[-8, -14], [8, -14]], r: 3.8, lid: '#ffffff', mouth: [0, -6] },
    panda: { eyes: [[-9, -15], [9, -15]], r: 2.8, lid: '#2a2a33', line: '#ffffff', mouth: [0, -3] },
    capy: { eyes: [], r: 0, lid: '', mouth: [0, 4] },
    hippo: { eyes: [[-10, -20], [10, -20]], r: 3.7, lid: '#8a87a0', mouth: [0, 6] },
    ele: { eyes: [[-9, -13], [9, -13]], r: 3.4, lid: '#a7b3c8', mouth: [8, 8] },
    dkl: { eyes: [[11, -12]], r: 2.3, lid: '#ffd84d', mouth: [21, -8] },
    duck: { eyes: [[14, -11]], r: 1.9, lid: '#ffffff', mouth: [24, -8] },
  };
  // ตัวละครในฉาก: [ภาพ, x, y, กว้าง] (พิกัด 540)
  const CAST = {
    cat: [['cat', 270, 585, 190]], shiba: [['dog', 270, 580, 200]], bunny: [['bun', 270, 575, 170]], hamster: [['ham', 270, 590, 210]],
    penguin: [['peng', 270, 580, 160]], panda: [['panda', 270, 575, 200]], capybara: [['capy', 270, 600, 210]], hippo: [['hippo', 270, 640, 210]],
    elephant: [['ele', 250, 600, 220]], duckling: [['duck', 190, 610, 120], ['dkl', 278, 640, 52], ['dkl', 338, 652, 48], ['dkl', 392, 662, 46], ['dkl', 444, 672, 44]],
  };
  // น้องโต 5 ร่าง: ขนาด + ของแต่ง • จุดหัว (หมวก/มงกุฎ) และคอ (โบว์/ผ้าคลุม) ในพิกัดภาพ
  const GROW_SCALE = [0.8, 0.9, 1, 1.1, 1.2];
  const FORM = ['ลูกน้อย', 'วัยซน', 'โตเต็มวัย', 'ร่างเท่', 'ร่างตำนาน'];
  const GAIN = ['', 'โบว์ผูกคอ', 'มงกุฎดอกไม้', 'ผ้าคลุม + มงกุฎเงิน', 'มงกุฎทอง + ออร่าแสง'];
  const REF = {
    cat: [[0, -22], [0, 5]], dog: [[0, -22], [0, 6]], bun: [[0, -18], [0, 5]], ham: [[0, -30], [0, 25]], peng: [[0, -38], [0, -1]], panda: [[0, -38], [0, 10]],
    capy: [[0, -32], [0, 12]], hippo: [[0, -30], [0, 6]], ele: [[0, -34], [0, 13]], dkl: [[8, -22], [6, 0]], duck: [[12, -18], [10, -2]],
  };
  const AMBIENT = { cat: 'dust', shiba: 'petal', bunny: 'twinkle', hamster: '', penguin: 'snow', panda: 'petal', capybara: 'snow', hippo: 'glint', elephant: 'glint', duckling: 'firefly' };
  const ROWS = [
    { y: 1500, s: 0.8, n: 7, x0: 90, x1: 990, vip: true },
    { y: 1632, s: 0.94, n: 7, x0: 60, x1: 1020 },
  ];

  // ---- โหลดภาพ SVG → แคนวาส (ครั้งเดียว)
  const IMG = {};
  function raster(name, w, h) {
    if (IMG[name]) return IMG[name];
    const rec = (IMG[name] = { cv: null, p: null });
    rec.p = new Promise((res) => {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => {
        const cv = document.createElement('canvas');
        cv.width = w || im.naturalWidth;
        cv.height = h || im.naturalHeight;
        cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
        rec.cv = cv;
        res(cv);
      };
      im.onerror = () => res(null);
      im.src = 'pets/' + name + '.svg';
    });
    return rec;
  }
  const food = (f) => raster('food-' + f, 128, 0).cv;

  window.makePetTheme = function makePetTheme(id) {
    let el = null;
    let API = null;
    const cast = (CAST[id] || CAST.cat).map(([sym, x, y, w], i) => {
      const vb = VB[sym];
      const W = w * 2;
      const H = (W * vb[3]) / vb[2];
      return { sym, i, cx: x * 2, cy: y * 2, W, H, k: W / vb[2], vb, face: FACE[sym], squash: 0, hop: 0, happy: 0, wig: 0, blinkAt: 2 + Math.random() * 3, ph: Math.random() * 6 };
    });
    const main = cast[0];
    const st = { full: 40, rate: 100 / 600, at: performance.now(), bites: 0, fulls: 0, sleep: 0, wheel: 0, wheelV: 0.8, spray: 0, aurora: 0, extraDucks: 0, bubble: null, likeAt: 0,
      grow: { on: false, pts: 0, stage: 1, next: null, step: 10 }, evo: 0 };
    for (const a of cast) a.s = a.sT = 1;
    // พิกัดในภาพ → จอ (ก่อนย่อขยายตามร่าง) / หลังย่อขยาย (ยึดเท้าน้อง)
    const toRaw = (a, sx, sy) => [a.cx - a.W / 2 + (sx - a.vb[0]) * a.k, a.cy - a.H / 2 + (sy - a.vb[1]) * a.k];
    const toPx = (a, sx, sy) => {
      const [x, y] = toRaw(a, sx, sy);
      const fy = a.cy + a.H / 2;
      return [a.cx + (x - a.cx) * a.s, fy + (y - fy) * a.s];
    };
    const stage = () => (st.grow.on ? st.grow.stage : 3);

    function preload() {
      const list = [raster(id + '-bg', 1080, 1920), raster(id + '-l2', 1080, 1920), raster(id + '-l3', 1080, 1920)];
      for (const a of cast) list.push(raster('pet-' + a.sym, Math.round(a.W * 1.2), Math.round(a.H * 1.2)));
      if (id === 'capybara') list.push(raster('capybara-front', 1080, 1920));
      if (id === 'elephant') list.push(raster('elephant-spray', 1080, 1920));
      const foods = new Set(['grose', 'hrt', ...(petCfg().foods || []), ...(petCfg().gifts || []).map((g) => g[0])]);
      if (id === 'capybara') foods.add('yuzu');
      for (const f of foods) list.push(raster('food-' + f, 128, 0));
      Promise.all(list.map((r) => r.p)).then(() => API?.redrawStatic?.());
    }

    // ---- ฉากเปลี่ยนตามเป้า (ขั้น 2 เพื่อนมาเยี่ยม • ขั้น 3 ปาร์ตี้)
    if (window.SceneLevels?.themes) {
      window.SceneLevels.themes[id] = {
        names: { 2: 'เพื่อน ๆ มาเยี่ยม + ไฟประดับ', 3: 'ปาร์ตี้ของ' + (petCfg().name || 'น้อง') },
        s2(c) {
          const im = IMG[id + '-l2']?.cv;
          if (im) c.drawImage(im, 0, 0);
        },
        s3(c) {
          const im = IMG[id + '-l3']?.cv;
          if (im) c.drawImage(im, 0, 0);
        },
        a3(c, t) {
          // กระดาษสีโปรยเบา ๆ (คำนวณจากเวลา ไม่สร้างออบเจกต์ใหม่)
          const cols = ['#ff6b6b', '#ffd166', '#7cc6f2', '#a78bfa', '#5fd068'];
          for (let i = 0; i < 26; i++) {
            const x = (i * 197 + Math.sin(t / 900 + i) * 40 + 1080) % 1080;
            const y = ((t / 7 + i * 263) % 1300) + 560;
            c.fillStyle = cols[i % 5];
            c.globalAlpha = 0.85;
            c.fillRect(x, y, 10, 6 + 4 * Math.abs(Math.sin(t / 300 + i)));
          }
          c.globalAlpha = 1;
        },
      };
    }

    const T = {
      bpm: 92,
      fanH: 116,
      rows: ROWS,
      get css() {
        return css();
      },
      fanSvg(color, fid, api) {
        const body = hud().palette?.body || [color];
        return api.standingFan(color, fid, { legs: '#2a2438', shirtColor: (_c, h) => body[h % body.length] });
      },
      init(api) {
        API = api;
        el = document.createElement('div');
        el.className = 'pet-hud';
        document.getElementById('ui').appendChild(el);
        render(api);
        preload();
        clearInterval(T._tick);
        T._tick = setInterval(updateMeter, 1000);
      },
      drawStatic(c) {
        const im = IMG[id + '-bg']?.cv;
        if (im) return c.drawImage(im, 0, 0);
        const p = hud().palette || {};
        const g = c.createLinearGradient(0, 0, 0, 1920);
        g.addColorStop(0, p.accent2 || '#9fd8ff');
        g.addColorStop(1, p.accent || '#6bbf59');
        c.fillStyle = g;
        c.fillRect(0, 0, 1080, 1920);
      },
      drawBg(c, t) {
        ambient(c, t);
        if (id === 'hamster') wheel(c);
      },
      drawFxBack(c, t, _bt, api) {
        const dt = Math.min(0.05, (t - (T._lt || t)) / 1000);
        T._lt = t;
        step(dt, t / 1000);
        if (st.evo > 0) evoRays(c, t / 1000);
        for (const a of cast) drawActor(c, a, t / 1000);
        if (id === 'capybara') {
          const fr = IMG['capybara-front']?.cv;
          if (fr) c.drawImage(fr, 0, 1000, 1080, 560, 0, 1000, 1080, 560);
        }
        if (st.spray > 0 && IMG['elephant-spray']?.cv) {
          c.globalAlpha = Math.min(1, st.spray);
          c.drawImage(IMG['elephant-spray'].cv, 560, 560, 520, 520, 560, 560, 520, 520);
          c.globalAlpha = 1;
        }
        if (st.aurora > 0) aurora(c, t);
        if (st.bubble) bubble(c, api);
      },
      effects: new Proxy({}, {
        get(_o, key) {
          const fx = meta().effects?.[key];
          if (!fx) return undefined;
          return (user, n, label, api) => gift(fx, user, n, label, api);
        },
        has: (_o, key) => !!meta().effects?.[key],
        ownKeys: () => Object.keys(meta().effects || {}),
        getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
      }),
      onEvent(d, api) {
        if (d.type === 'hud') return updateHud(d);
        if (d.type === 'cmd') return onCmd(d, api);
        if (d.type === 'petFull') return onFull(d, api);
        if (d.type === 'petGrow') return onGrow(d, api);
        if (d.type === 'goal') {
          api.toast(`🎯 ${d.key === 'coins' ? 'เพชร' : 'ใจ'}ครบ! → ${d.reward}`, 'big');
          shower(api, (petCfg().foods || ['fish'])[0], 2600);
          dance(4);
          api.speak(`เป้าหมายครบแล้ว ${d.reward}`);
        }
      },
      onLike(d, api) {
        const p = api.fanPos(d.id);
        api.spawn({ type: 'heart', x: p ? p.x : api.rand(860, 1040), y: p ? p.y - 20 : api.rand(1600, 1800), vy: api.rand(-300, -200), max: 1.8, size: api.rand(12, 18), color: '#ff4f7b', fadeIn: 0.1 });
        const now = performance.now();
        if (now - st.likeAt < 1200) return;
        st.likeAt = now;
        trick(api, 1);
      },
      onTop() {},
    };

    // ================================================================ วาดน้อง
    function step(dt, ts) {
      for (const a of cast) {
        a.squash = Math.max(0, a.squash - dt * 3.2);
        a.happy = Math.max(0, a.happy - dt);
        a.wig = Math.max(0, a.wig - dt);
        if (a.hop > 0) a.hop = Math.max(0, a.hop - dt * 1.6);
        if (ts > a.blinkAt + 0.14) a.blinkAt = ts + 2.5 + Math.random() * 3.5;
        a.sT = GROW_SCALE[stage() - 1];
        a.s += (a.sT - a.s) * Math.min(1, dt * (st.evo > 0 ? 2.2 : 4));
      }
      st.evo = Math.max(0, st.evo - dt);
      st.sleep = Math.max(0, st.sleep - dt);
      st.spray = Math.max(0, st.spray - dt * 0.6);
      st.aurora = Math.max(0, st.aurora - dt * 0.2);
      st.wheelV += (0.8 - st.wheelV) * Math.min(1, dt * 0.6);
      st.wheel += st.wheelV * dt;
      if (st.bubble && (st.bubble.until -= dt) <= 0) st.bubble = null;
    }

    function drawActor(c, a, ts) {
      const im = IMG['pet-' + a.sym]?.cv;
      if (!im) return;
      const sleeping = st.sleep > 0;
      const bob = Math.sin(ts * (sleeping ? 1.2 : 2.2) + a.ph) * (a.sym === 'dkl' || a.sym === 'duck' ? 5 : 4);
      const hop = a.hop > 0 ? -Math.sin(a.hop * Math.PI) * (id === 'bunny' ? 90 : 46) : 0;
      const sq = Math.sin(a.squash * Math.PI) * 0.12;
      const wig = a.wig > 0 ? Math.sin(ts * 18) * 0.09 * Math.min(1, a.wig) : 0;
      const sx = 1 + sq + (sleeping ? 0.04 : 0);
      const sy = 1 - sq - (sleeping ? 0.05 : 0) + Math.sin(ts * 2.2 + a.ph) * 0.012;
      const footY = a.cy + a.H / 2;
      const lv = stage();
      const spin = st.evo > 1.6 ? Math.cos((2.8 - st.evo) * Math.PI * 2.5) : 1; // หมุนตัวตอนเปลี่ยนร่าง
      if (lv >= 5 && st.grow.on) aura(c, a, ts);
      c.save();
      c.translate(a.cx, footY + bob * 0.3 + hop);
      c.rotate(wig);
      c.scale(sx * a.s * spin, sy * a.s);
      c.translate(-a.cx, -footY);
      if (st.grow.on && lv >= 4) cape(c, a);
      c.drawImage(im, a.cx - a.W / 2, a.cy - a.H / 2, a.W, a.H);
      if (st.grow.on) wear(c, a, lv);
      // แก้มตุ่ย (แฮมสเตอร์) โตตามจำนวนเมล็ด
      if (a.sym === 'ham' && st.bites > 0) {
        const g = Math.min(1, st.bites / 20);
        for (const s of [-1, 1]) {
          const [x, y] = toRaw(a, 20 * s, 7);
          c.fillStyle = '#fff6ea';
          c.beginPath();
          c.ellipse(x + s * g * 10, y, a.k * (11 + 6 * g), a.k * (9 + 5 * g), 0, 0, Math.PI * 2);
          c.fill();
          c.fillStyle = 'rgba(255,143,163,.55)';
          c.beginPath();
          c.ellipse(x + s * g * 10, y + 2 * a.k, a.k * (6 + 3 * g), a.k * (3.4 + 1.6 * g), 0, 0, Math.PI * 2);
          c.fill();
        }
      }
      // ตา: กะพริบ / ยิ้มตาปิด / หลับ
      const f = a.face;
      const closed = sleeping || a.happy > 0 || (ts > a.blinkAt && ts < a.blinkAt + 0.14);
      if (closed && f.eyes.length) {
        for (const [ex, ey] of f.eyes) {
          const [x, y] = toRaw(a, ex, ey);
          const r = f.r * a.k;
          c.fillStyle = f.lid;
          c.beginPath();
          c.ellipse(x, y, r * 1.2, r * 1.25, 0, 0, Math.PI * 2);
          c.fill();
          c.strokeStyle = f.line || '#2a1f1a';
          c.lineWidth = Math.max(2, r * 0.42);
          c.lineCap = 'round';
          c.beginPath();
          if (a.happy > 0 && !sleeping) c.arc(x, y + r * 0.5, r * 0.85, Math.PI * 1.15, Math.PI * 1.85);
          else c.arc(x, y - r * 0.3, r * 0.85, Math.PI * 0.15, Math.PI * 0.85);
          c.stroke();
        }
      }
      c.restore();
      // ส้มซ้อนบนหัวคาปิบาร่า
      if (a.sym === 'capy') {
        const yz = food('yuzu');
        const n = Math.min(12, st.bites);
        if (yz)
          for (let i = 0; i < n; i++) {
            const [x, y] = toPx(a, (i % 2 ? 1.5 : -1.5) + Math.sin(ts * 1.4 + i) * 0.6, -30 - i * 13.5 - (st.grow.on && stage() >= 3 ? 8 : 0));
            const z = 60 * a.s;
            c.drawImage(yz, x - z / 2, y - z / 2 + bob * 0.3, z, z);
          }
      }
      if (sleeping && a.i === 0) {
        c.fillStyle = '#ffffff';
        c.font = '700 44px Kanit, sans-serif';
        c.textAlign = 'center';
        for (let i = 0; i < 3; i++) {
          const k = (ts * 0.5 + i / 3) % 1;
          c.globalAlpha = 1 - k;
          c.fillText('z', a.cx + a.W * 0.32 * a.s + k * 50, a.cy + a.H / 2 - a.H * a.s * 0.95 - k * 120);
        }
        c.globalAlpha = 1;
      }
    }

    // ---- ของแต่งตามร่าง (วาดในพิกัดภาพก่อนย่อขยาย)
    const capeCol = () => hud().palette?.accent || '#e8453c';
    function cape(c, a) {
      const [nx, ny] = toRaw(a, ...(REF[a.sym] || REF.cat)[1]);
      const fy = a.cy + a.H / 2;
      const w = a.W;
      c.fillStyle = capeCol();
      c.beginPath();
      c.moveTo(nx - w * 0.28, ny);
      c.lineTo(nx + w * 0.28, ny);
      c.lineTo(nx + w * 0.46, fy);
      c.quadraticCurveTo(nx, fy + w * 0.12, nx - w * 0.46, fy);
      c.closePath();
      c.fill();
      c.strokeStyle = 'rgba(255,255,255,.35)';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(nx - w * 0.2, ny + 10);
      c.lineTo(nx - w * 0.34, fy - 6);
      c.stroke();
    }
    function wear(c, a, lv) {
      const [head, neck] = REF[a.sym] || REF.cat;
      const k = a.W / 240;
      if (lv >= 2) {
        const [x, y] = toRaw(a, ...neck);
        c.save();
        c.translate(x, y);
        c.scale(k, k);
        c.fillStyle = capeCol();
        c.beginPath();
        c.moveTo(0, 0); c.lineTo(-22, -12); c.lineTo(-22, 12); c.closePath();
        c.moveTo(0, 0); c.lineTo(22, -12); c.lineTo(22, 12); c.closePath();
        c.fill();
        c.fillStyle = '#ffd166';
        c.beginPath();
        c.arc(0, 0, 6, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }
      const [hx, hy] = toRaw(a, ...head);
      c.save();
      c.translate(hx, hy);
      c.scale(k, k);
      if (lv === 3) {
        for (const [x, y, col] of [[-26, 4, '#ff8fab'], [-13, -4, '#ffd166'], [0, -6, '#ffffff'], [13, -4, '#a78bfa'], [26, 4, '#7cc6f2']]) {
          c.fillStyle = col;
          c.beginPath();
          c.arc(x, y, 7, 0, Math.PI * 2);
          c.fill();
        }
      } else if (lv >= 4) {
        c.translate(0, 4);
        c.fillStyle = lv >= 5 ? '#ffd166' : '#c8ceda';
        c.strokeStyle = '#b8860b';
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(-24, 6); c.lineTo(-24, -14); c.lineTo(-12, -2); c.lineTo(0, -20); c.lineTo(12, -2); c.lineTo(24, -14); c.lineTo(24, 6);
        c.closePath();
        c.fill();
        c.stroke();
        for (const [x, y, r, col] of [[0, -20, 4, '#e11d48'], [-24, -14, 3.4, '#7cc6f2'], [24, -14, 3.4, '#7cc6f2']]) {
          c.fillStyle = col;
          c.beginPath();
          c.arc(x, y, r, 0, Math.PI * 2);
          c.fill();
        }
      }
      c.restore();
    }
    let AURA = null;
    function aura(c, a, ts) {
      if (!AURA) {
        AURA = document.createElement('canvas');
        AURA.width = AURA.height = 256;
        const g = AURA.getContext('2d');
        const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
        gr.addColorStop(0, 'rgba(255,243,176,.9)');
        gr.addColorStop(0.6, 'rgba(255,209,102,.35)');
        gr.addColorStop(1, 'rgba(255,209,102,0)');
        g.fillStyle = gr;
        g.fillRect(0, 0, 256, 256);
      }
      const r = a.W * a.s * 0.85;
      const cy = a.cy + a.H / 2 - a.H * a.s * 0.5;
      c.globalAlpha = 0.8 + 0.2 * Math.sin(ts * 2);
      c.drawImage(AURA, a.cx - r, cy - r, r * 2, r * 2);
      c.fillStyle = '#fff3b0';
      for (let i = 0; i < 6; i++) {
        const t = ts * 0.6 + i * 1.047;
        const x = a.cx + Math.cos(t) * r * 1.05;
        const y = cy + Math.sin(t) * r * 0.82;
        const q = 7 + 3 * Math.sin(ts * 3 + i);
        c.globalAlpha = 0.9;
        c.beginPath();
        c.moveTo(x, y - q * 2); c.lineTo(x + q * 0.4, y - q * 0.4); c.lineTo(x + q * 2, y); c.lineTo(x + q * 0.4, y + q * 0.4);
        c.lineTo(x, y + q * 2); c.lineTo(x - q * 0.4, y + q * 0.4); c.lineTo(x - q * 2, y); c.lineTo(x - q * 0.4, y - q * 0.4);
        c.fill();
      }
      c.globalAlpha = 1;
    }
    function evoRays(c, ts) {
      const a = main;
      const cx = a.cx;
      const cy = a.cy + a.H / 2 - a.H * a.s * 0.5;
      c.save();
      c.globalAlpha = Math.min(1, st.evo) * 0.4;
      c.fillStyle = '#fff3b0';
      c.translate(cx, cy);
      c.rotate(ts * 0.6);
      for (let i = 0; i < 12; i++) {
        c.rotate(Math.PI / 6);
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(1300, -70);
        c.lineTo(1300, 70);
        c.closePath();
        c.fill();
      }
      c.restore();
    }

    // ล้อวิ่งแฮมสเตอร์ (หมุนเร็วขึ้นตอนกดไลค์)
    function wheel(c) {
      const cx = 200;
      const cy = 840;
      c.save();
      c.translate(cx, cy);
      c.rotate(st.wheel);
      c.strokeStyle = '#ffb3c7';
      c.lineWidth = 6;
      c.beginPath();
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6;
        c.moveTo(0, 0);
        c.lineTo(Math.cos(a) * 166, Math.sin(a) * 166);
      }
      c.stroke();
      c.fillStyle = '#ff8fab';
      c.beginPath();
      c.arc(0, 0, 20, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }

    // ของเล็ก ๆ ที่ลอยในฉาก (ไม่สร้างออบเจกต์ใหม่ทุกเฟรม)
    const hsh = (i, k) => {
      const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
      return s - Math.floor(s);
    };
    function ambient(c, t) {
      const kind = AMBIENT[id];
      if (!kind) return;
      const ts = t / 1000;
      if (kind === 'snow') {
        c.fillStyle = '#ffffff';
        for (let i = 0; i < 46; i++) {
          const sp = 40 + hsh(i, 1) * 60;
          const y = ((ts * sp + hsh(i, 2) * 1920) % 1500) + 460;
          const x = (hsh(i, 3) * 1080 + Math.sin(ts * 0.8 + i) * 26 + 1080) % 1080;
          c.globalAlpha = 0.5 + hsh(i, 4) * 0.5;
          c.beginPath();
          c.arc(x, y, 2 + hsh(i, 5) * 4, 0, Math.PI * 2);
          c.fill();
        }
      } else if (kind === 'petal') {
        c.fillStyle = '#ffb3cf';
        for (let i = 0; i < 18; i++) {
          const y = ((ts * (36 + hsh(i, 1) * 30) + hsh(i, 2) * 1500) % 1400) + 480;
          const x = (hsh(i, 3) * 1080 + Math.sin(ts + i) * 40 + 1080) % 1080;
          c.globalAlpha = 0.85;
          c.save();
          c.translate(x, y);
          c.rotate(ts * 1.5 + i);
          c.beginPath();
          c.ellipse(0, 0, 8, 4.5, 0, 0, Math.PI * 2);
          c.fill();
          c.restore();
        }
      } else if (kind === 'dust') {
        c.fillStyle = '#fff6d0';
        for (let i = 0; i < 18; i++) {
          const x = 260 + hsh(i, 1) * 600 + Math.sin(ts * 0.4 + i) * 30;
          const y = 880 + hsh(i, 2) * 480 + Math.cos(ts * 0.3 + i) * 30;
          c.globalAlpha = 0.25 + 0.45 * Math.abs(Math.sin(ts * 0.8 + i));
          c.beginPath();
          c.arc(x, y, 2 + hsh(i, 3) * 2.5, 0, Math.PI * 2);
          c.fill();
        }
      } else if (kind === 'twinkle' || kind === 'glint') {
        c.fillStyle = '#ffffff';
        const y0 = kind === 'glint' ? 1060 : 1000;
        const y1 = kind === 'glint' ? 420 : 520;
        for (let i = 0; i < 16; i++) {
          const a = Math.max(0, Math.sin(ts * 1.6 + i * 1.9));
          if (a < 0.05) continue;
          const x = 30 + hsh(i, 1) * 1020;
          const y = y0 + hsh(i, 2) * y1;
          const r = (4 + hsh(i, 3) * 5) * a;
          c.globalAlpha = a;
          c.beginPath();
          c.moveTo(x, y - r * 2);
          c.lineTo(x + r * 0.4, y - r * 0.4);
          c.lineTo(x + r * 2, y);
          c.lineTo(x + r * 0.4, y + r * 0.4);
          c.lineTo(x, y + r * 2);
          c.lineTo(x - r * 0.4, y + r * 0.4);
          c.lineTo(x - r * 2, y);
          c.lineTo(x - r * 0.4, y - r * 0.4);
          c.fill();
        }
      } else if (kind === 'firefly') {
        for (let i = 0; i < 22; i++) {
          const x = 40 + hsh(i, 1) * 1000 + Math.sin(ts * 0.6 + i) * 40;
          const y = 760 + hsh(i, 2) * 760 + Math.cos(ts * 0.5 + i * 2) * 30;
          const a = 0.35 + 0.65 * Math.abs(Math.sin(ts * 1.2 + i));
          c.globalAlpha = a * 0.3;
          c.fillStyle = '#fff59a';
          c.beginPath();
          c.arc(x, y, 16, 0, Math.PI * 2);
          c.fill();
          c.globalAlpha = a;
          c.fillStyle = '#fffbd0';
          c.beginPath();
          c.arc(x, y, 4, 0, Math.PI * 2);
          c.fill();
        }
      }
      c.globalAlpha = 1;
    }

    let AUR = null;
    function aurora(c, t) {
      if (!AUR) {
        AUR = c.createLinearGradient(0, 0, 1080, 0);
        AUR.addColorStop(0, 'rgba(93,255,176,.55)');
        AUR.addColorStop(0.5, 'rgba(93,224,255,.55)');
        AUR.addColorStop(1, 'rgba(176,124,255,.55)');
      }
      c.globalAlpha = Math.min(1, st.aurora);
      c.fillStyle = AUR;
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.moveTo(0, 420 + i * 90);
        for (let x = 0; x <= 1080; x += 60) c.lineTo(x, 420 + i * 90 + Math.sin(x / 160 + t / 900 + i) * 50);
        c.lineTo(1080, 560 + i * 90);
        c.lineTo(0, 560 + i * 90);
        c.fill();
      }
      c.globalAlpha = 1;
    }

    function bubble(c) {
      const b = st.bubble;
      const a = cast[b.who] || main;
      c.font = '600 30px Kanit, sans-serif';
      const w = c.measureText(b.text).width + 50;
      const x = Math.max(w / 2 + 16, Math.min(1080 - w / 2 - 16, a.cx + 40));
      const y = a.cy + a.H / 2 - a.H * a.s - 70 - (id === 'capybara' ? Math.min(12, st.bites) * 27 * a.s : 0);
      c.globalAlpha = Math.min(1, b.until * 3);
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.roundRect(x - w / 2, y - 30, w, 60, 30);
      c.moveTo(x - 30, y + 28);
      c.lineTo(x - 40, y + 50);
      c.lineTo(x - 10, y + 28);
      c.fill();
      c.fillStyle = '#1d1714';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(b.text, x, y + 1);
      c.globalAlpha = 1;
    }

    // ================================================================ เหตุการณ์
    const eatTarget = () => (id === 'duckling' ? cast[1 + Math.floor(Math.random() * (cast.length - 1))] : main);
    function chomp(a, who, api, gain = '+5') {
      a.squash = 1;
      a.happy = 0.9;
      api.spawn({ type: 'heart', x: a.cx + api.rand(-60, 60), y: a.cy - a.H * 0.4, vy: api.rand(-220, -150), max: 1.4, size: api.rand(14, 20), color: '#ff4f7b' });
      api.spawn({
        x: a.cx + a.W * 0.42, y: a.cy - a.H * 0.35, vy: -90, max: 1.2, fadeOut: 0.5,
        draw(c, p) {
          c.font = '800 34px Kanit, sans-serif';
          c.textAlign = 'center';
          c.lineWidth = 6;
          c.strokeStyle = '#16a34a';
          c.strokeText(gain + ' อิ่ม', p.x, p.y);
          c.fillStyle = '#ffffff';
          c.fillText(gain + ' อิ่ม', p.x, p.y);
        },
      });
      api.sfx.pop?.();
      if (who && !st.bubble) st.bubble = { text: `อร่อยจัง~ ขอบคุณ${who}!`, until: 2.2, who: a.i };
    }

    // โยนอาหารจากตัวละครคนดู → ปากน้อง (โค้งพาราโบลา)
    function toss(api, f, from, a, who) {
      const im = food(f);
      if (!im) return chomp(a, who, api);
      const [mx, my] = toPx(a, ...a.face.mouth);
      const T0 = 0.9;
      const g = 1500;
      const vx = (mx - from.x) / T0;
      const vy = (my - from.y - 0.5 * g * T0 * T0) / T0;
      const s = 70 / Math.max(im.width, im.height);
      api.spawn({
        x: from.x, y: from.y, vx, vy, g, max: T0, fadeOut: 0.97, vr: api.rand(-6, 6),
        draw(c, p) {
          c.save();
          c.translate(p.x, p.y);
          c.rotate(p.rot);
          c.drawImage(im, (-im.width * s) / 2, (-im.height * s) / 2, im.width * s, im.height * s);
          c.restore();
        },
      });
      setTimeout(() => chomp(a, who, api), T0 * 1000);
    }

    // อาหารตกจากฟ้า (ของขวัญ)
    function drop(api, f, a, delay, size = 80, who = '') {
      const im = food(f);
      if (!im) return;
      const [mx, my] = toPx(a, ...a.face.mouth);
      const x = mx + api.rand(-40, 40);
      const s = size / Math.max(im.width, im.height);
      setTimeout(() => {
        const T0 = 0.85;
        api.spawn({
          x, y: my - 640, vy: 640 / T0, max: T0, fadeOut: 0.97, vr: api.rand(-3, 3),
          draw(c, p) {
            c.save();
            c.translate(p.x, p.y);
            c.rotate(p.rot);
            c.globalAlpha *= 0.35;
            c.fillStyle = '#ffffff';
            c.fillRect(-3, -size * 1.4, 6, size * 0.9);
            c.globalAlpha /= 0.35;
            c.drawImage(im, (-im.width * s) / 2, (-im.height * s) / 2, im.width * s, im.height * s);
            c.restore();
          },
        });
        setTimeout(() => chomp(a, who, api, size > 100 ? '+35' : '+12'), T0 * 1000);
      }, delay);
    }

    function shower(api, f, ms) {
      const im = food(f);
      if (!im) return;
      api.emitter(ms, () => {
        if (Math.random() > 0.25) return;
        const s = 60 / Math.max(im.width, im.height);
        api.spawn({
          x: api.rand(40, 1040), y: -60, vy: api.rand(380, 560), vx: api.rand(-40, 40), max: 4, vr: api.rand(-4, 4),
          draw(c, p) {
            c.save();
            c.translate(p.x, p.y);
            c.rotate(p.rot);
            c.drawImage(im, (-im.width * s) / 2, (-im.height * s) / 2, im.width * s, im.height * s);
            c.restore();
          },
        });
      });
    }

    function dance(sec) {
      for (const a of cast) {
        a.wig = sec;
        a.happy = Math.min(sec, 2);
      }
    }

    // ท่าน่ารักตอนกดไลค์ / พิมพ์คำสั่งท่า
    function trick(api, power) {
      for (const a of cast) a.hop = 1;
      main.happy = 0.8;
      if (id === 'hamster') st.wheelV = 3 + 4 * power;
      if (id === 'elephant') st.spray = 1.4 + power;
      if (id === 'penguin' || id === 'panda') main.wig = 1.2 * power;
      if (id === 'capybara' || id === 'hippo' || id === 'cat' || id === 'shiba' || id === 'duckling') {
        const kind = { capybara: 'steam', hippo: 'drop', cat: 'feather', shiba: 'heart', duckling: 'quack' }[id];
        for (let i = 0; i < 4 + power * 3; i++) {
          if (kind === 'heart') {
            api.spawn({ type: 'heart', x: main.cx + api.rand(-90, 90), y: main.cy - main.H * 0.4, vy: api.rand(-260, -160), max: 1.6, size: api.rand(14, 22), color: '#ff4f7b' });
            continue;
          }
          api.spawn({
            x: main.cx + api.rand(-main.W * 0.4, main.W * 0.4), y: main.cy - main.H * (kind === 'drop' ? 0 : 0.3), vx: api.rand(-160, 160),
            vy: kind === 'steam' ? api.rand(-120, -60) : api.rand(-520, -300), g: kind === 'steam' ? 0 : 900, max: kind === 'steam' ? 2.4 : 1.1, size: api.rand(10, 18),
            draw(c, p) {
              if (kind === 'steam') {
                c.fillStyle = 'rgba(255,255,255,.35)';
                c.beginPath();
                c.arc(p.x, p.y, p.size * 2.4, 0, Math.PI * 2);
                c.fill();
              } else if (kind === 'drop') {
                c.fillStyle = '#bfefff';
                c.beginPath();
                c.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
                c.fill();
              } else if (kind === 'feather') {
                c.fillStyle = '#ff6fb1';
                c.beginPath();
                c.ellipse(p.x, p.y, p.size * 0.9, p.size * 0.35, p.life * 6, 0, Math.PI * 2);
                c.fill();
              } else {
                c.font = '800 32px Kanit, sans-serif';
                c.fillStyle = '#ffffff';
                c.textAlign = 'center';
                c.fillText('ก๊าบ!', p.x, p.y);
              }
            },
          });
          if (kind === 'quack') break;
        }
      }
    }

    function onCmd(d, api) {
      const p = api.fanPos(d.id);
      const from = p ? { x: p.x, y: p.y - 20 } : { x: api.rand(140, 940), y: 1560 };
      if (d.kind === 'feed') {
        toss(api, d.food || (petCfg().foods || ['fish'])[0], from, eatTarget(), d.name);
      } else {
        api.spawn({
          x: from.x, y: from.y - 40, vy: -160, max: 1.4, size: 56,
          draw(c, q) {
            window.drawEmoji(c, d.emoji || '✨', q.x, q.y - q.size * 0.35, q.size);
          },
        });
        trick(api, 2);
      }
      const sign = el?.querySelector(`.chip[data-cmd="${CSS.escape(d.cmd)}"]`);
      if (sign) {
        sign.classList.remove('on');
        void sign.offsetWidth;
        sign.classList.add('on');
      }
    }

    // ของขวัญ = อาหาร (ทำซ้ำได้หลายครั้งต่อของขวัญเดียว → ป้ายขึ้นครั้งเดียว อาหารตกตามจำนวน)
    const lastGift = new Map();
    function gift(fx, user, n, label, api) {
      const tier = Number(String(fx.kind).slice(3)) || 1;
      const a = eatTarget();
      const key = (user?.id || '?') + '|' + tier;
      const fresh = performance.now() - (lastGift.get(key) || 0) > 2500;
      lastGift.set(key, performance.now());
      const name = user?.name || 'ทุกคน';
      if (fresh) giftToast(name, tier, n, fx.label);
      if (tier === 1) {
        const k = fresh ? Math.min(6, n) : 1;
        for (let i = 0; i < k; i++) drop(api, fx.food, a, i * 260, 80, i === 0 ? name : '');
        return;
      }
      if (tier === 2) {
        drop(api, fx.food, a, 0, 150, name);
        api.spawn({ type: 'ring', x: a.cx, y: a.cy, size: 260, max: 0.8, color: hud().palette?.accent2 || '#ffd166' });
        setTimeout(() => (a.hop = 1), 900);
        api.sfx.chime?.(784);
        return;
      }
      // ระดับ 3: โชว์ใหญ่ของแต่ละธีม
      if (!fresh) return;
      api.bigShow(user, fx.label);
      api.fireworks(5);
      drop(api, fx.food, main, 200, 220, name);
      shower(api, (petCfg().foods || [fx.food])[0], 3200);
      dance(4.5);
      if (id === 'penguin') st.aurora = 6;
      if (id === 'elephant') st.spray = 5;
      if (id === 'hamster') st.wheelV = 10;
      if (id === 'duckling' && cast.length < 8) {
        const last = cast[cast.length - 1];
        const vb = VB.dkl;
        const W = 40 * 2;
        cast.push({ sym: 'dkl', i: cast.length, cx: last.cx + 90 > 1040 ? 120 + cast.length * 30 : last.cx + 90, cy: last.cy + 18, W, H: (W * vb[3]) / vb[2], k: W / vb[2], vb, face: FACE.dkl, squash: 1, hop: 1, happy: 2, wig: 0, blinkAt: 3, ph: Math.random() * 6 });
      }
      api.speak(`ขอบคุณ ${name} ที่เลี้ยง${petCfg().name || 'น้อง'}`);
    }

    function giftToast(name, tier, n, label) {
      const box = el?.querySelector('.pgift');
      if (!box) return;
      const icon = tier === 1 ? '<img src="pets/food-grose.svg" alt="">' : tier === 2 ? '💝' : '🎁';
      const what = tier === 1 ? `ส่งของขวัญ${n > 1 ? ' ×' + n : ''}` : tier === 2 ? 'ส่งของขวัญ' : 'ส่งของขวัญใหญ่';
      box.innerHTML = `<span class="gi">${icon}</span><span><b>${esc(name)}</b> ${what} → <em>${esc(label)}</em> ให้${esc(petCfg().name || 'น้อง')}!</span>`;
      box.classList.remove('on');
      void box.offsetWidth;
      box.classList.add('on');
      clearTimeout(giftToast._t);
      giftToast._t = setTimeout(() => box.classList.remove('on'), 3800);
    }

    function onGrow(d, api) {
      st.grow.stage = d.stage;
      st.grow.pts = d.pts;
      st.evo = 2.8;
      api.flash('#fff6d0', 900, 0.55);
      api.fireworks(d.stage >= 5 ? 9 : 5);
      dance(2);
      const box = el?.querySelector('.pevo');
      if (box) {
        box.querySelector('.n').textContent = `ร่าง ${d.stage} · ${FORM[d.stage - 1]}`;
        box.querySelector('.d').innerHTML = `ได้${esc(GAIN[d.stage - 1])}${d.name ? ` · ขอบคุณ <b>${esc(d.name)}</b> ที่ทำให้น้องโต!` : ''}`;
        box.classList.remove('on');
        void box.offsetWidth;
        box.classList.add('on');
        clearTimeout(onGrow._t);
        onGrow._t = setTimeout(() => box.classList.remove('on'), 5200);
      }
      api.speak(`${petCfg().name || 'น้อง'}โตขึ้นแล้ว เป็นร่าง${FORM[d.stage - 1]}${d.name ? ' ขอบคุณ ' + d.name : ''}`);
      updateMeter();
    }

    function onFull(d, api) {
      st.sleep = 7;
      st.bites = 0;
      dance(1.2);
      api.bigShow(d.id ? { id: d.id, name: d.name } : null, 'อิ่มพุงกาง!', 6500);
      api.fireworks(4);
      api.speak(`${petCfg().name || 'น้อง'}อิ่มพุงกางแล้ว ขอบคุณ${d.name ? ' ' + d.name : 'ทุกคน'}`);
      st.full = 30;
      st.at = performance.now();
      st.fulls = d.fulls || st.fulls + 1;
      updateMeter();
    }

    // ================================================================ แผงบนจอ
    function css() {
      const p = hud().palette || {};
      const r = `#root.theme-${id}`;
      return `
        ${r} { --glass: ${p.panel}; --panel-border: rgba(255,255,255,.2); --heading: ${p.soft}; --toast-bg: ${p.accent}; --toast-glow: ${p.accent};
          --big-grad: linear-gradient(180deg, #ffffff, ${p.accent2}); --big-bg: radial-gradient(circle at 50% 45%, rgba(0,0,0,.2), rgba(0,0,0,.66) 70%);
          --card-bg: ${p.panel}; --card-top: 700px; --team-top: 640px; --fortune-top: 720px; }
        ${r} #header, ${r} #songPanel, ${r} #giftPanel, ${r} #topPanel, ${r} #feed { display: none !important; }
        ${r} #hype { left: 392px; width: 296px; top: 232px; padding: 10px 14px 12px; border-radius: 22px; background: ${p.panel}; border: 2px solid rgba(255,255,255,.18); }
        ${r} #hype .label { font-size: 21px; }
        ${r} #hype .bar { height: 16px; }
        ${r} #hype .ml { font-size: 17px !important; }
        ${r} #toasts { top: 1380px; }
        .pet-hud { position: absolute; inset: 0; pointer-events: none; font-family: 'Kanit', 'Leelawadee UI', sans-serif; color: #fff; z-index: 3; }
        .pet-hud * { box-sizing: border-box; }
        .pet-hud .hp { background: ${p.panel}; border: 2px solid rgba(255,255,255,.2); border-radius: 30px; box-shadow: 0 10px 28px rgba(0,0,0,.3); }
        .pet-hud .pttl { position: absolute; left: 50%; top: 40px; transform: translateX(-50%); padding: 18px 56px 22px; border-radius: 44px; text-align: center; white-space: nowrap;
          background: linear-gradient(90deg, ${p.accent}, ${p.accent2}); box-shadow: 0 16px 40px rgba(0,0,0,.3); max-width: 1000px; }
        .pet-hud .pttl b { display: block; font-size: 62px; line-height: 1.05; font-weight: 800; overflow: hidden; text-overflow: ellipsis; }
        .pet-hud .pttl small { display: block; font-size: 27px; font-weight: 500; opacity: .95; overflow: hidden; text-overflow: ellipsis; }
        .pet-hud h4 { margin: 0; font-size: 25px; line-height: 1.3; color: ${p.soft}; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pet-hud .pfull { position: absolute; left: 28px; top: 232px; width: 350px; padding: 16px 20px; }
        .pet-hud .pfull .row { display: flex; align-items: center; gap: 12px; margin-top: 10px; }
        .pet-hud .pfull .bar { flex: 1; height: 20px; border-radius: 20px; background: rgba(255,255,255,.16); overflow: hidden; }
        .pet-hud .pfull .bar i { display: block; height: 100%; width: 40%; border-radius: 20px; background: linear-gradient(90deg, #5fd068, #c6f36a); transition: width .8s; }
        .pet-hud .pfull.low .bar i { background: linear-gradient(90deg, #ff6b6b, #ffb020); }
        .pet-hud .pfull .pct { font-size: 26px; min-width: 70px; text-align: right; }
        .pet-hud .pfull .mood { margin-top: 8px; font-size: 22px; line-height: 1.3; opacity: .95; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pet-hud .pfull.low .mood { color: #ffd0d0; animation: petPulse 1.2s ease-in-out infinite; }
        .pet-hud .pfull .cnt { font-size: 19px; opacity: .75; }
        .pet-hud .pgrow { margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,.14); }
        .pet-hud .pgrow[hidden] { display: none; }
        .pet-hud .pgrow .gt { font-size: 22px; font-weight: 600; color: ${p.soft}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pet-hud .pgrow .seg { display: flex; gap: 6px; margin-top: 6px; }
        .pet-hud .pgrow .seg i { flex: 1; height: 14px; border-radius: 14px; background: rgba(255,255,255,.18); }
        .pet-hud .pgrow .seg i.on { background: linear-gradient(90deg, #ffd166, #ffb020); box-shadow: 0 0 8px rgba(255,209,102,.6); }
        .pet-hud .pgrow .nx { margin-top: 5px; font-size: 20px; opacity: .92; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pet-hud .pevo { position: absolute; left: 50%; top: 640px; width: 880px; transform: translate(-50%, -30px) scale(.9); padding: 26px 34px 30px; border-radius: 50px; text-align: center;
          background: linear-gradient(180deg, #2a1640, #4a1f5a); border: 6px solid #ffd166; box-shadow: 0 0 80px rgba(255,209,102,.6); opacity: 0; transition: opacity .35s, transform .45s cubic-bezier(.2,1.6,.4,1); z-index: 2; }
        .pet-hud .pevo.on { opacity: 1; transform: translate(-50%, 0) scale(1); }
        .pet-hud .pevo .k { font-size: 30px; color: #ffd166; font-weight: 700; letter-spacing: 2px; }
        .pet-hud .pevo .n { font-size: 80px; line-height: 1.1; font-weight: 800; }
        .pet-hud .pevo .d { font-size: 30px; opacity: .95; }
        .pet-hud .pevo .d b { color: #ffd166; }
        @keyframes petPulse { 50% { opacity: .55; } }
        .pet-hud .pboard { position: absolute; right: 28px; top: 232px; width: 300px; padding: 16px 20px; }
        .pet-hud .pboard .r { display: flex; justify-content: space-between; gap: 8px; margin-top: 8px; font-size: 24px; }
        .pet-hud .pboard .r span:first-child { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .pet-hud .pboard .r b { color: #ffd166; margin-right: 6px; }
        .pet-hud .pboard .empty { margin-top: 8px; font-size: 21px; opacity: .8; }
        .pet-hud .pgift { position: absolute; left: 50%; top: 520px; transform: translate(-50%, -20px); display: flex; align-items: center; gap: 14px; padding: 10px 30px 10px 12px;
          border-radius: 99px; background: linear-gradient(90deg, #e11d48, #ff7a59); box-shadow: 0 12px 30px rgba(225,29,72,.45); font-size: 27px; white-space: nowrap;
          max-width: 1030px; opacity: 0; transition: opacity .3s, transform .3s; }
        .pet-hud .pgift.on { opacity: 1; transform: translate(-50%, 0); }
        .pet-hud .pgift .gi { flex: none; width: 58px; height: 58px; border-radius: 50%; background: #fff; display: grid; place-items: center; font-size: 34px; }
        .pet-hud .pgift .gi img { width: 40px; height: 48px; }
        .pet-hud .pgift span:last-child { overflow: hidden; text-overflow: ellipsis; }
        .pet-hud .pgift em { font-style: normal; font-weight: 700; color: #fff3b0; }
        .pet-hud .pbot { position: absolute; left: 28px; right: 28px; bottom: 24px; padding: 18px 22px; }
        .pet-hud .pbot .ln { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; font-size: 25px; }
        .pet-hud .pbot .ln + .ln { margin-top: 10px; }
        .pet-hud .pbot .lb { width: 112px; font-weight: 700; color: ${p.soft}; }
        .pet-hud .pbot .chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 18px; border-radius: 99px; background: rgba(255,255,255,.14); }
        .pet-hud .pbot .chip b { color: #ffd166; }
        .pet-hud .pbot .chip.rose { background: rgba(255,90,120,.3); padding-left: 8px; }
        .pet-hud .pbot .chip img { width: 26px; height: 32px; }
        .pet-hud .pbot .chip.on { animation: petPing .6s ease-out; }
        @keyframes petPing { 0% { transform: scale(1.15); background: rgba(255,209,102,.55); } }
        .pet-hud .pbot .like { margin-top: 10px; font-size: 22px; opacity: .9; }
      `;
    }

    function render(api) {
      const m = meta();
      const t = api.t || {};
      const pc = petCfg();
      const g = pc.gifts || [];
      const cmds = hud().cmds || [];
      el.innerHTML = `
        <div class="pttl"><b>${esc(t.title || m.defaults?.title)}</b><small>${esc(t.subtitle || m.defaults?.subtitle || '')}</small></div>
        <div class="pfull hp"><h4>ความอิ่ม · ${esc(pc.name)}</h4><div class="row"><div class="bar"><i></i></div><b class="pct">40%</b></div><div class="mood"></div><div class="cnt"></div><div class="pgrow" hidden><div class="gt"></div><div class="seg"><i></i><i></i><i></i><i></i><i></i></div><div class="nx"></div></div></div>
        <div class="pboard hp"><h4>🏆 คนเลี้ยงใจดี</h4><div class="rows"><div class="empty">ยังไม่มีใครป้อน — เป็นคนแรกเลย!</div></div></div>
        <div class="pgift"></div>
        <div class="pevo"><div class="k">✨ น้องโตขึ้นแล้ว! ✨</div><div class="n"></div><div class="d"></div></div>
        <div class="pbot hp">
          <div class="ln"><span class="lb">พิมพ์</span>${cmds.map((c) => `<span class="chip" data-cmd="${esc(c.c)}"><b>${esc(c.c)}</b> → ${esc(c.a)}</span>`).join('')}</div>
          <div class="ln"><span class="lb">ของขวัญ</span><span class="chip rose">${window.giftIcon?.('Rose') ? window.giftIconHtml('Rose') : '<img src="pets/food-grose.svg" alt="">'}<b>กุหลาบ</b> → ${esc(g[0]?.[1])}</span><span class="chip"><b>10+ เพชร</b> → ${esc(g[1]?.[1])}</span><span class="chip"><b>100+ เพชร</b> → ${esc(g[2]?.[1])}</span></div>
          <div class="like">❤️ กดไลค์ = ${esc(pc.like)} · ยิ่งป้อน น้องยิ่งอิ่ม</div>
        </div>`;
      updateMeter();
    }

    function updateMeter() {
      if (!el) return;
      const pc = petCfg();
      const cur = Math.max(0, Math.min(100, st.full - ((performance.now() - st.at) / 1000) * st.rate));
      const box = el.querySelector('.pfull');
      if (!box) return;
      box.querySelector('.bar i').style.width = cur.toFixed(1) + '%';
      box.querySelector('.pct').textContent = Math.round(cur) + '%';
      const feed = hud().cmds?.find((c) => c.kind === 'feed')?.c || 'ให้อาหาร';
      const mood = st.sleep > 0 ? 'อิ่มแปล้ หลับปุ๋ย zZ' : cur < 25 ? `หิวแล้ว! พิมพ์ “${feed}”` : cur < 60 ? 'อยากกินอีกนิด~' : cur < 90 ? (id === 'hamster' ? `แก้มตุ่ย ${Math.min(20, st.bites)} เมล็ด` : id === 'capybara' ? `ส้มบนหัว ${Math.min(12, st.bites)} ลูก` : pc.mood) : 'เกือบอิ่มแล้ว อีกนิดเดียว!';
      box.querySelector('.mood').textContent = mood;
      box.querySelector('.cnt').textContent = st.fulls ? `อิ่มพุงกางแล้ว ${st.fulls} ครั้ง` : 'ป้อนจนเต็มหลอด = โชว์อิ่มพุงกาง';
      box.classList.toggle('low', cur < 25 && st.sleep <= 0);
      const g = st.grow;
      const gb = box.querySelector('.pgrow');
      gb.hidden = !g.on;
      if (g.on) {
        gb.querySelector('.gt').textContent = `ร่าง ${g.stage}/5 · ${FORM[g.stage - 1]}`;
        gb.querySelectorAll('.seg i').forEach((x, i) => x.classList.toggle('on', i < g.stage));
        gb.querySelector('.nx').textContent = g.next == null ? 'ร่างตำนานแล้ว! ✨' : `อีก ${Math.max(1, g.next - g.pts).toLocaleString('en-US')} เพชร (🌹 = 1) → ${FORM[g.stage]}`;
      }
    }

    function updateHud(d) {
      if (d.pet) {
        st.full = d.pet.full;
        st.rate = d.pet.rate;
        st.at = performance.now();
        st.bites = d.pet.bites;
        st.fulls = d.pet.fulls;
        if (d.pet.grow) st.grow = d.pet.grow;
        updateMeter();
      }
      const rows = el?.querySelector('.pboard .rows');
      if (rows) {
        rows.innerHTML = d.zboard?.length
          ? d.zboard.map((r, i) => `<div class="r"><span><b>${i + 1}</b>${esc(r.n)}</span><span>${Number(r.s).toLocaleString('en-US')} ครั้ง</span></div>`).join('')
          : '<div class="empty">ยังไม่มีใครป้อน — เป็นคนแรกเลย!</div>';
      }
      for (const fid of d.crowned || []) window.__stage?.api?.bump?.(fid, 'crowned', 6 * 3600_000);
    }

    return T;
  };
})();
