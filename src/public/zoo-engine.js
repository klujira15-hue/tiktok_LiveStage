/* ธีมสวนสัตว์ (เด็กนักเรียนมาทัศนศึกษา) — ใช้ร่วมกัน 5 ธีม ข้อมูลธีมอยู่ใน zoothemes.js
 * ไฟล์ธีม public/themes/<id>.js เรียก window.makeZooTheme('<id>')
 * คนดู = เด็กนักเรียนยืนหันหลัง (ระบบคนดูของหน้าเวที ป้ายชื่อเหนือหัว) • สัตว์ = สไปรต์ขยับทุกเฟรม (ภาพ SVG วาดลงแคนวาสครั้งเดียว)
 */
(() => {
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const meta = () => window.__stage?.api?.meta || {};
  const hud = () => meta().hud || {};
  const cfgZ = () => hud().zoo || {};

  // สไปรต์: [ไฟล์, viewBox x0, y0, w, h] (พิกัดภาพ)
  const SPR = {
    'fish-a': [-26, -16, 52, 32], 'fish-b': [-26, -16, 52, 32], 'fish-c': [-26, -16, 52, 32], 'fish-d': [-26, -16, 52, 32], 'fish-s': [-26, -16, 52, 32],
    turtle: [-42, -28, 84, 56], shark: [-70, -44, 140, 84], 'jelly-p': [-30, -34, 60, 76], 'jelly-v': [-30, -34, 60, 76], 'jelly-b': [-30, -34, 60, 76], whale: [-130, -100, 300, 150],
    trex: [-80, -100, 158, 140], bronto: [-92, -144, 188, 182], trike: [-50, -56, 126, 82], ptero: [-48, -22, 96, 44], egg: [-30, -36, 60, 72],
    giraffe: [-50, -180, 112, 232], elephant: [-62, -72, 132, 122], zebra: [-46, -82, 102, 122], lion: [-62, -60, 94, 70], jeep: [-70, -66, 140, 86],
    monkey: [-20, -72, 52, 94], parrot: [-18, -30, 36, 78], 'parrot-g': [-18, -30, 36, 78], toucan: [-14, -30, 52, 52], sloth: [-28, -46, 56, 68],
    owl: [-24, -30, 48, 54], tiger: [-64, -62, 102, 72],
  };
  // สัตว์ในฉาก: sp=สไปรต์ x,y=จุดกำเนิด (1080x1920) k=ขนาด m=ท่า(swim/walk/fly/idle/hang/drift) key=ชื่อในสมุด A=ระยะ v=ความเร็ว
  const CAST = {
    sea: [
      { sp: 'shark', x: 540, y: 660, k: 2.4, m: 'swim', A: 330, v: 0.18, key: 'shark' },
      { sp: 'turtle', x: 500, y: 940, k: 2.2, m: 'swim', A: 300, v: 0.12, key: 'turtle', ph: 2 },
      { sp: 'jelly-p', x: 920, y: 900, k: 2.4, m: 'drift', key: 'jelly' }, { sp: 'jelly-v', x: 140, y: 660, k: 1.8, m: 'drift', ph: 1 }, { sp: 'jelly-b', x: 960, y: 520, k: 1.4, m: 'drift', ph: 2 },
      { sp: 'fish-a', x: 480, y: 1040, k: 2.4, m: 'swim', A: 260, v: 0.3, key: 'fish' }, { sp: 'fish-c', x: 560, y: 1120, k: 1.8, m: 'swim', A: 300, v: 0.34, ph: 1.5 },
      { sp: 'fish-b', x: 720, y: 1080, k: 2, m: 'swim', A: 220, v: 0.28, ph: 3 }, { sp: 'fish-d', x: 300, y: 1200, k: 1.6, m: 'swim', A: 200, v: 0.4, ph: 4 },
      ...[0, 1, 2, 3, 4, 5].map((i) => ({ sp: 'fish-s', x: 380 + i * 36, y: 540 + (i % 2) * 20, k: 1, m: 'swim', A: 260, v: 0.16, ph: 0.4, school: true })),
    ],
    dino: [
      { sp: 'bronto', x: 720, y: 1040, k: 2.4, m: 'walk', A: 40, v: 0.08, key: 'bronto' },
      { sp: 'trex', x: 300, y: 1120, k: 2.3, m: 'walk', A: 60, v: 0.12, key: 'trex' },
      { sp: 'trike', x: 800, y: 1280, k: 2, m: 'walk', A: 70, v: 0.1, key: 'trike', ph: 2 },
      { sp: 'ptero', x: 240, y: 600, k: 2.4, m: 'fly', v: 0.05, key: 'ptero' }, { sp: 'ptero', x: 400, y: 540, k: 1.4, m: 'fly', v: 0.07, ph: 0.5 },
    ],
    safari: [
      { sp: 'lion', x: 780, y: 940, k: 2, m: 'idle', key: 'lion' },
      { sp: 'giraffe', x: 280, y: 1280, k: 2.3, m: 'walk', A: 40, v: 0.06, key: 'giraffe' },
      { sp: 'elephant', x: 760, y: 1280, k: 2.2, m: 'walk', A: 50, v: 0.07, key: 'elephant', ph: 1 },
      { sp: 'zebra', x: 500, y: 1380, k: 1.8, m: 'walk', A: 80, v: 0.12, key: 'zebra' }, { sp: 'zebra', x: 600, y: 1400, k: 1.5, m: 'walk', A: 70, v: 0.12, ph: 0.6 },
    ],
    rainforest: [
      { sp: 'sloth', x: 400, y: 600, k: 2.2, m: 'hang', key: 'sloth' },
      { sp: 'monkey', x: 260, y: 920, k: 2.6, m: 'hang', key: 'monkey', ph: 1 }, { sp: 'monkey', x: 508, y: 800, k: 2, m: 'hang', ph: 2.4 },
      { sp: 'parrot', x: 160, y: 640, k: 2.8, m: 'idle', key: 'parrot' }, { sp: 'parrot-g', x: 664, y: 720, k: 2.2, m: 'idle', ph: 1 },
      { sp: 'toucan', x: 960, y: 660, k: 2.6, m: 'idle', key: 'toucan', ph: 2 },
    ],
    nightzoo: [
      { sp: 'owl', x: 192, y: 808, k: 2.6, m: 'idle', key: 'owl' }, { sp: 'owl', x: 1000, y: 840, k: 1.8, m: 'idle', ph: 2 },
      { sp: 'tiger', x: 540, y: 1280, k: 3.2, m: 'walk', A: 90, v: 0.07, key: 'tiger' },
    ],
  };
  const FOCUS = { sea: [540, 1060], dino: [540, 1250], safari: [540, 1300], rainforest: [540, 1060], nightzoo: [540, 1300] };
  const ROWS = [{ y: 1560, s: 1, n: 8, x0: 70, x1: 1010, jy: 8 }, { y: 1690, s: 1.18, n: 6, x0: 110, x1: 970, jy: 6 }];
  const FAN_H = 180;

  // ---- เด็กนักเรียน (หันหลัง)
  const HAIR = ['#2a1f1a', '#3a2418', '#1a1a22', '#5a3a22'];
  const SKIN = ['#f1c7a0', '#d9a47c', '#eec39a', '#c98e66'];
  const BAG = ['#ff4f7b', '#3b82f6', '#ffb020', '#22c55e', '#a78bfa', '#ff7a59', '#14b8a6'];
  function hsh(s) {
    let h = 2166136261;
    for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return h >>> 0;
  }
  function kidSvg(fid) {
    const h = hsh(fid);
    const girl = (h >>> 3) % 2 === 0;
    const sk = SKIN[(h >>> 5) % SKIN.length];
    const hr = HAIR[(h >>> 8) % HAIR.length];
    const bag = BAG[(h >>> 11) % BAG.length];
    const cap = (h >>> 14) % 3 === 0;
    const o = ['<ellipse cx="0" cy="0" rx="15" ry="3.6" fill="#000" opacity=".25"/>'];
    o.push(`<rect x="-7" y="-20" width="5" height="18" fill="${sk}"/><rect x="2" y="-20" width="5" height="18" fill="${sk}"/><rect x="-7.5" y="-9" width="6" height="7" fill="#fff"/><rect x="1.5" y="-9" width="6" height="7" fill="#fff"/><path d="M-9 -1 h8 v-3 h-8z M1 -1 h8 v-3 h-8z" fill="#1a1a22"/>`);
    o.push(girl ? '<path d="M-12 -18 L12 -18 L9 -34 L-9 -34z" fill="#1e3a8a"/><path d="M-6 -18 L-5 -33 M0 -18 V-33 M6 -18 L5 -33" stroke="#172a6a" stroke-width="1"/>' : '<path d="M-9 -34 h18 l1 15 h-8 l-1 -6 l-1 6 h-8z" fill="#1e3a8a"/>');
    o.push(`<g class="al"><path d="M-9 -50 q-6 6 -5 16" stroke="#fbfbff" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="-14" cy="-34" r="2.6" fill="${sk}"/></g>`);
    o.push(`<g class="ar"><path d="M9 -50 q6 6 5 16" stroke="#fbfbff" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="14" cy="-34" r="2.6" fill="${sk}"/></g>`);
    o.push('<path d="M-10 -34 Q-11 -50 -7 -54 L7 -54 Q11 -50 10 -34z" fill="#fbfbff"/><path d="M-7 -54 l7 4 l7 -4" stroke="#d8dbe6" stroke-width="1.2" fill="none"/>');
    o.push(`<rect x="-8" y="-51" width="16" height="17" rx="4" fill="${bag}"/><rect x="-6" y="-42" width="12" height="6" rx="2" fill="#fff" opacity=".35"/>`);
    o.push(`<rect x="-2.5" y="-58" width="5" height="5" fill="${sk}"/><circle cx="0" cy="-65" r="9.5" fill="${hr}"/>`);
    if (girl && !cap) o.push((h >>> 16) % 2 ? `<circle cx="-10" cy="-63" r="3.6" fill="${hr}"/><circle cx="10" cy="-63" r="3.6" fill="${hr}"/><circle cx="-9" cy="-65" r="1.8" fill="#ff4f7b"/><circle cx="9" cy="-65" r="1.8" fill="#ff4f7b"/>` : `<path d="M-3 -57 q3 10 6 0" fill="${hr}"/><circle cx="0" cy="-70" r="2.2" fill="#ffd166"/>`);
    o.push(`<ellipse cx="-9.2" cy="-64" rx="1.6" ry="2.6" fill="${sk}"/><ellipse cx="9.2" cy="-64" rx="1.6" ry="2.6" fill="${sk}"/>`);
    if (cap) o.push('<path d="M-10 -66 q0 -11 10 -11 q10 0 10 11z" fill="#ffd166"/><path d="M-10 -66 h20" stroke="#e6a817" stroke-width="2"/>');
    return `<svg viewBox="-24 -96 48 100" width="96" height="180" preserveAspectRatio="xMidYMax meet" style="overflow:visible;display:block">${o.join('')}</svg>`;
  }

  // ---- ภาพ → แคนวาส (ครั้งเดียว)
  const IMG = {};
  function raster(name, w, h) {
    if (IMG[name]) return IMG[name];
    const rec = (IMG[name] = { cv: null, p: null });
    rec.p = new Promise((res) => {
      const im = new Image();
      im.onload = () => {
        const cv = document.createElement('canvas');
        cv.width = w || im.naturalWidth;
        cv.height = h || im.naturalHeight;
        cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
        rec.cv = cv;
        res(cv);
      };
      im.onerror = () => res(null);
      im.src = 'zoo/' + name + '.svg';
    });
    return rec;
  }

  window.makeZooTheme = function makeZooTheme(id) {
    let el = null;
    let API = null;
    const cast = (CAST[id] || []).map((c, i) => ({ ...c, i, ph: c.ph || 0, f: 0, fx: 0, fy: 0, hop: 0 }));
    const st = { seen: new Set(), torch: 0, shake: 0, special: null, roar: 0, rainbow: 0 };
    const [FX, FY] = FOCUS[id] || [540, 1200];

    if (window.SceneLevels?.themes) {
      window.SceneLevels.themes[id] = {
        names: { 2: 'ธงสวนสัตว์ + ไฟประดับ', 3: 'ลูกโป่ง + ป้ายฉลอง' },
        s2(c) {
          const im = IMG[id + '-l2']?.cv;
          if (im) c.drawImage(im, 0, 0);
        },
        s3(c) {
          const im = IMG[id + '-l3']?.cv;
          if (im) c.drawImage(im, 0, 0);
        },
      };
    }

    const T = {
      bpm: 96,
      fanH: FAN_H,
      rows: ROWS,
      get css() {
        return css();
      },
      fanSvg(_c, fid) {
        return kidSvg(fid);
      },
      init(api) {
        API = api;
        el = document.createElement('div');
        el.className = 'zoo-hud';
        document.getElementById('ui').appendChild(el);
        render(api);
        const list = [raster(id + '-bg', 1080, 1920), raster(id + '-l2', 1080, 1920), raster(id + '-l3', 1080, 1920)];
        const need = new Set(cast.map((c) => c.sp));
        if (id === 'sea') need.add('whale');
        if (id === 'dino') ['egg', 'trex'].forEach((x) => need.add(x));
        if (id === 'safari') need.add('jeep');
        if (id === 'rainforest') ['parrot', 'parrot-g'].forEach((x) => need.add(x));
        for (const n of need) {
          const v = SPR[n];
          list.push(raster('a-' + n, v[2] * 4, v[3] * 4));
        }
        Promise.all(list.map((r) => r.p)).then(() => API?.redrawStatic?.());
      },
      drawStatic(c) {
        const im = IMG[id + '-bg']?.cv;
        if (im) return c.drawImage(im, 0, 0);
        c.fillStyle = '#1a2a3a';
        c.fillRect(0, 0, 1080, 1920);
      },
      drawBg(c, t) {
        const ts = t / 1000;
        if (st.shake > 0) {
          st.shake = Math.max(0, st.shake - 0.016);
          c.save();
          c.translate(Math.sin(ts * 60) * 8 * st.shake, 0);
        }
        ambient(c, ts);
        if (st.rainbow > 0) rainbow(c);
        for (const a of cast) if (!a.f) drawAnimal(c, a, ts);
        if (st.special) special(c, ts);
        for (const a of cast) if (a.f) drawAnimal(c, a, ts);
        if (st.torch > 0) torch(c, ts);
        if (st.shake > 0) c.restore();
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
        if (d.type === 'cmd') return onCmd(d, api);
        if (d.type === 'hud') return updateBook(d);
        if (d.type === 'goal') {
          api.toast(`🎯 ${d.key === 'coins' ? 'เพชร' : 'ใจ'}ครบ! → ${d.reward}`, 'big');
          if (d.key === 'coins') bigSpecial(api, null);
          else api.crowdWave?.('wave');
        }
      },
      onLike(d, api) {
        const p = api.fanPos(d.id);
        api.spawn({ type: 'heart', x: p ? p.x : api.rand(200, 880), y: p ? p.y - 120 : 1500, vy: api.rand(-300, -200), max: 1.8, size: api.rand(12, 18), color: '#ff4f7b', fadeIn: 0.1 });
      },
    };

    // ================================================================ สัตว์
    function sprite(name) {
      return IMG['a-' + name]?.cv;
    }
    function drawAnimal(c, a, ts, over) {
      const im = sprite(over?.sp || a.sp);
      if (!im) return;
      const v = SPR[over?.sp || a.sp];
      let x = a.x;
      let y = a.y;
      let k = a.k;
      let flip = false;
      let rot = 0;
      const t = ts + a.ph * 3;
      if (a.m === 'swim') {
        const s = Math.sin(t * a.v * 2 * Math.PI * 0.5 + a.ph);
        x = a.x + s * a.A;
        flip = Math.cos(t * a.v * Math.PI + a.ph) > 0;
        y = a.y + Math.sin(t * 1.4) * 10;
      } else if (a.m === 'walk') {
        x = a.x + Math.sin(t * a.v * Math.PI) * a.A;
        flip = Math.cos(t * a.v * Math.PI) < 0;
        y = a.y - Math.abs(Math.sin(t * 3)) * 4;
      } else if (a.m === 'fly') {
        const u = ((t * a.v + a.ph) % 1.2) - 0.1;
        x = u * 1280 - 100;
        y = a.y + Math.sin(t * 1.6) * 40;
      } else if (a.m === 'drift') {
        y = a.y + Math.sin(t * 0.8) * 40;
        k = a.k * (1 + Math.sin(t * 2.4) * 0.04);
      } else if (a.m === 'hang') {
        rot = Math.sin(t * 1.3) * 0.1;
      } else {
        y = a.y + Math.sin(t * 1.8) * 4;
      }
      // ถูกเรียกมาใกล้ ๆ
      if (a.f > 0) {
        a.f = Math.max(0, a.f - 1 / 60);
        const e = Math.min(1, a.f > 3.4 ? (4 - a.f) / 0.6 : a.f / 0.6);
        const ee = e * e * (3 - 2 * e);
        x += (FX - x) * ee;
        y += (FY - y) * ee;
        k *= 1 + 0.35 * ee;
        rot *= 1 - ee;
        if (a.m === 'fly' || a.m === 'swim') flip = FX < a.x;
      }
      if (a.hop > 0) {
        a.hop = Math.max(0, a.hop - 1 / 50);
        y -= Math.sin(a.hop * Math.PI) * 40;
      }
      const w = v[2] * k;
      const h = v[3] * k;
      c.save();
      c.translate(x, y);
      if (rot) c.rotate(rot);
      c.scale(flip ? -1 : 1, 1);
      c.drawImage(im, v[0] * k, v[1] * k, w, h);
      c.restore();
      a.px = x;
      a.py = y + v[1] * k;
    }
    const byKey = (key) => cast.find((a) => a.key === key);
    function callAnimal(key, api, who) {
      const a = byKey(key);
      seen(key);
      if (!a) return;
      a.f = 4;
      a.hop = 1;
      api.crowdWave?.('wave');
      const b = (cfgZ().book || []).find((x) => x.key === key);
      api.toast(`${b?.emoji || '✨'} ${b?.name || ''}มาแล้ว!${who ? ' — ' + who + ' เรียก' : ''}`);
      for (let i = 0; i < 6; i++) api.spawn({ type: 'heart', x: FX + api.rand(-120, 120), y: FY - 160, vy: api.rand(-260, -160), max: 1.6, size: api.rand(14, 22), color: '#ff4f7b' });
    }
    function seen(key) {
      if (!key || st.seen.has(key)) return;
      st.seen.add(key);
      renderBook();
      const all = [...(cfgZ().book || []).map((b) => b.key), cfgZ().special?.key];
      if (all.every((k) => st.seen.has(k))) {
        API?.bigShow(null, 'สมุดสะสมสัตว์ครบแล้ว!');
        API?.fireworks(8);
        API?.speak('เด็ก ๆ เจอสัตว์ครบทุกตัวแล้ว เก่งมาก');
      }
    }

    // ---- ของเคลื่อนไหวรอบฉาก (ไม่สร้างออบเจกต์ใหม่ทุกเฟรม)
    const hs = (i, k) => {
      const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
      return s - Math.floor(s);
    };
    function ambient(c, ts) {
      if (id === 'sea') {
        c.strokeStyle = 'rgba(191,239,255,.7)';
        c.lineWidth = 2;
        for (let i = 0; i < 24; i++) {
          const x = hs(i, 1) * 1080 + Math.sin(ts + i) * 10;
          const y = 1440 - ((ts * (40 + hs(i, 2) * 50) + hs(i, 3) * 1000) % 1000);
          c.beginPath();
          c.arc(x, y, 3 + hs(i, 4) * 5, 0, Math.PI * 2);
          c.stroke();
        }
      } else if (id === 'nightzoo') {
        for (let i = 0; i < 26; i++) {
          const x = 40 + hs(i, 1) * 1000 + Math.sin(ts * 0.6 + i) * 40;
          const y = 900 + hs(i, 2) * 560 + Math.cos(ts * 0.5 + i * 2) * 30;
          const a = 0.35 + 0.65 * Math.abs(Math.sin(ts * 1.2 + i));
          c.globalAlpha = a * 0.3;
          c.fillStyle = '#fff59a';
          c.beginPath();
          c.arc(x, y, 14, 0, Math.PI * 2);
          c.fill();
          c.globalAlpha = a;
          c.fillStyle = '#fffbd0';
          c.beginPath();
          c.arc(x, y, 3.6, 0, Math.PI * 2);
          c.fill();
        }
        c.globalAlpha = 1;
        // ค้างคาวบิน
        c.fillStyle = '#14101e';
        for (let i = 0; i < 4; i++) {
          const x = (((ts * 60 + i * 300) % 1300) - 110);
          const y = 520 + i * 40 + Math.sin(ts * 3 + i) * 20;
          const w = Math.sin(ts * 14 + i) * 10;
          c.beginPath();
          c.moveTo(x, y);
          c.quadraticCurveTo(x - 18, y - 14 - w, x - 34, y - 6);
          c.quadraticCurveTo(x - 20, y, x, y + 8);
          c.quadraticCurveTo(x + 20, y, x + 34, y - 6);
          c.quadraticCurveTo(x + 18, y - 14 - w, x, y);
          c.fill();
        }
      } else if (id === 'rainforest') {
        c.strokeStyle = 'rgba(191,239,255,.5)';
        c.lineWidth = 2;
        c.beginPath();
        for (let i = 0; i < 30; i++) {
          const x = hs(i, 1) * 1080;
          const y = ((ts * 500 + hs(i, 2) * 1200) % 1100) + 400;
          c.moveTo(x, y);
          c.lineTo(x - 4, y + 20);
        }
        c.stroke();
      } else if (id === 'dino') {
        c.fillStyle = 'rgba(140,140,140,.35)';
        for (let i = 0; i < 6; i++) {
          const k = (ts * 0.12 + i / 6) % 1;
          c.globalAlpha = (1 - k) * 0.6;
          c.beginPath();
          c.arc(890 + Math.sin(k * 6 + i) * 30 * k, 470 - k * 260, 20 + k * 40, 0, Math.PI * 2);
          c.fill();
        }
        c.globalAlpha = 1;
      } else if (id === 'safari') {
        c.strokeStyle = 'rgba(90,40,20,.7)';
        c.lineWidth = 3;
        for (let i = 0; i < 5; i++) {
          const x = ((ts * 50 + i * 230) % 1300) - 100;
          const y = 520 + i * 26 + Math.sin(ts * 2 + i) * 8;
          const w = Math.sin(ts * 10 + i) * 6;
          c.beginPath();
          c.moveTo(x - 14, y - w);
          c.quadraticCurveTo(x - 7, y - 10, x, y);
          c.quadraticCurveTo(x + 7, y - 10, x + 14, y - w);
          c.stroke();
        }
      }
    }
    function torch(c, ts) {
      st.torch = Math.max(0, st.torch - 1 / 60);
      const cx = 540 + Math.sin(ts * 1.4) * 380;
      const cy = 1080 + Math.cos(ts * 1.1) * 160;
      c.save();
      c.globalAlpha = Math.min(1, st.torch) * 0.9;
      const g = c.createRadialGradient(cx, cy, 20, cx, cy, 260);
      g.addColorStop(0, 'rgba(255,248,210,.55)');
      g.addColorStop(1, 'rgba(255,248,210,0)');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(540, 1520);
      c.lineTo(cx - 200, cy);
      c.arc(cx, cy, 200, Math.PI, 0);
      c.closePath();
      c.fill();
      // ตาเรืองแสงในไฟส่อง
      c.fillStyle = '#d9ff7a';
      for (const [ex, ey] of [[940, 1200], [180, 1280], [700, 1000], [360, 980]]) {
        if (Math.hypot(ex - cx, ey - cy) > 240) continue;
        c.beginPath();
        c.arc(ex - 14, ey, 6, 0, Math.PI * 2);
        c.arc(ex + 14, ey, 6, 0, Math.PI * 2);
        c.fill();
      }
      c.restore();
    }
    function rainbow(c) {
      st.rainbow = Math.max(0, st.rainbow - 1 / 60);
      const cols = ['#ff6b6b', '#ffb020', '#ffe066', '#5fd068', '#5db8f5', '#a78bfa'];
      c.save();
      c.globalAlpha = Math.min(1, st.rainbow) * 0.55;
      c.lineWidth = 16;
      cols.forEach((col, i) => {
        c.strokeStyle = col;
        c.beginPath();
        c.arc(540, 1300, 620 - i * 16, Math.PI, 0);
        c.stroke();
      });
      c.restore();
    }
    // สัตว์พิเศษ (ของขวัญใหญ่)
    function special(c, ts) {
      const S = st.special;
      S.t += 1 / 60;
      const u = S.t / S.dur;
      if (u >= 1) {
        st.special = null;
        return;
      }
      if (S.kind === 'whale' || S.kind === 'jeep') {
        const im = sprite(S.kind);
        const v = SPR[S.kind];
        const k = S.kind === 'whale' ? 3.2 : 2.6;
        const x = -500 + u * 2100;
        const y = S.kind === 'whale' ? 800 + Math.sin(ts * 1.2) * 20 : 1430 + Math.abs(Math.sin(ts * 9)) * 4;
        if (im) {
          c.save();
          c.translate(x, y);
          c.scale(S.kind === 'whale' ? -1 : 1, 1);
          c.drawImage(im, v[0] * k, v[1] * k, v[2] * k, v[3] * k);
          c.restore();
        }
      } else if (S.kind === 'egg') {
        const v = SPR.egg;
        const im = sprite('egg');
        const shakeX = u < 0.45 ? Math.sin(ts * 30) * 8 * u : 0;
        if (u < 0.5 && im) c.drawImage(im, FX + shakeX + v[0] * 3, 1300 + v[1] * 3, v[2] * 3, v[3] * 3);
        else {
          const tr = sprite('trex');
          const tv = SPR.trex;
          const k = 1.1;
          if (tr) c.drawImage(tr, FX + tv[0] * k, 1330 + tv[1] * k - Math.abs(Math.sin(ts * 5)) * 16, tv[2] * k, tv[3] * k);
          if (im) {
            c.globalAlpha = Math.max(0, 1 - (u - 0.5) * 3);
            c.drawImage(im, FX - 120 + v[0] * 2, 1340 + v[1] * 2, v[2] * 2, v[3] * 2);
            c.globalAlpha = 1;
          }
        }
      } else if (S.kind === 'flock') {
        for (let i = 0; i < 12; i++) {
          const im = sprite(i % 2 ? 'parrot' : 'parrot-g');
          const v = SPR.parrot;
          const x = -200 + u * 1500 + hs(i, 1) * 300 - 150;
          const y = 500 + hs(i, 2) * 400 + Math.sin(ts * 6 + i) * 20;
          if (im) {
            c.save();
            c.translate(x, y);
            c.rotate(-0.3);
            c.scale(-1, 1);
            c.drawImage(im, v[0] * 1.4, v[1] * 1.4, v[2] * 1.4, v[3] * 1.4);
            c.restore();
          }
        }
      }
    }

    // ================================================================ เหตุการณ์
    function onCmd(d, api) {
      const p = api.fanPos(d.id);
      if (p) emoji(api, d.emoji || '✨', p.x, p.y - 140);
      const action = cfgZ().action;
      if (action && d.cmd === action.c) {
        if (id === 'dino') {
          callAnimal('trex', api, d.name);
          st.shake = 1;
          api.toast('🦖 โฮกกกก!', 'big');
          api.flash?.('#ffffff', 300, 0.2);
        } else if (id === 'rainforest') {
          callAnimal('monkey', api, d.name);
          toss(api, p, '🍌');
        } else if (id === 'nightzoo') {
          st.torch = 4;
          seen('eyes');
        }
        return;
      }
      if (d.zone === 'firefly') {
        heartFireflies(api);
        seen('firefly');
        return;
      }
      if (d.zone === 'bat') {
        seen('bat');
        api.toast('🦇 ค้างคาวบินผ่าน!');
        return;
      }
      callAnimal(d.zone, api, d.name);
    }
    function emoji(api, e, x, y) {
      api.spawn({
        x, y, vy: -170, max: 1.4, size: 54,
        draw(c, q) {
          window.drawEmoji(c, e, q.x, q.y - q.size * 0.35, q.size); // เส้นฐานตัวอักษร → กึ่งกลาง
        },
      });
    }
    function toss(api, p, e) {
      const sx = p ? p.x : 540;
      const sy = p ? p.y - 120 : 1500;
      const T0 = 0.9;
      const g = 1400;
      api.spawn({
        x: sx, y: sy, vx: (FX - sx) / T0, vy: (FY - 120 - sy - 0.5 * g * T0 * T0) / T0, g, max: T0, size: 60, vr: 6,
        draw(c, q) {
          c.save();
          c.translate(q.x, q.y);
          c.rotate(q.rot);
          window.drawEmoji(c, e, 0, -q.size * 0.35, q.size);
          c.restore();
        },
      });
    }
    function heartFireflies(api) {
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2;
        const hx = 16 * Math.pow(Math.sin(a), 3);
        const hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
        api.spawn({
          x: 540 + hx * 14, y: 900 + hy * 14, max: 3.2, fadeIn: 0.4,
          draw(c, q) {
            c.fillStyle = 'rgba(255,245,154,.35)';
            c.beginPath();
            c.arc(q.x, q.y, 14, 0, Math.PI * 2);
            c.fill();
            c.fillStyle = '#fffbd0';
            c.beginPath();
            c.arc(q.x, q.y, 4, 0, Math.PI * 2);
            c.fill();
          },
        });
      }
    }
    function bigSpecial(api, user) {
      const sp = cfgZ().special;
      seen(sp?.key);
      api.bigShow(user, sp?.name ? `${sp.name}มาแล้ว!` : 'ว้าว!');
      api.crowdWave?.('wave');
      if (id === 'sea') st.special = { kind: 'whale', t: 0, dur: 9 };
      else if (id === 'dino') {
        st.special = { kind: 'egg', t: 0, dur: 10 };
        setTimeout(() => api.fireworks(4), 4800);
      } else if (id === 'safari') st.special = { kind: 'jeep', t: 0, dur: 8 };
      else if (id === 'rainforest') {
        st.special = { kind: 'flock', t: 0, dur: 7 };
        st.rainbow = 7;
      } else if (id === 'nightzoo') {
        callAnimal('tiger', api, user?.name);
        st.torch = 5;
      }
      api.speak(`ว้าว ${sp?.name || ''}มาแล้ว ขอบคุณ${user?.name ? ' ' + user.name : 'ทุกคน'}`);
    }
    const lastGift = new Map();
    function gift(fx, user, n, label, api) {
      const tier = Number(String(fx.kind).slice(3)) || 1;
      const key = (user?.id || '?') + '|' + tier;
      if (performance.now() - (lastGift.get(key) || 0) < 2500) return;
      lastGift.set(key, performance.now());
      api.toast(`${tier === 3 ? '🎆' : '🌹'} ${user?.name || 'ทุกคน'} → ${fx.label}`, tier === 3 ? 'big' : '');
      const book = (cfgZ().book || []).filter((b) => byKey(b.key));
      if (tier === 1) {
        const a = byKey(book[Math.floor(Math.random() * book.length)]?.key);
        if (a) {
          a.hop = 1;
          const fxx = a.px || a.x;
          const fyy = a.py || a.y - 100;
          for (let i = 0; i < 10; i++) api.spawn({ x: fxx + api.rand(-80, 80), y: fyy - 200, vy: api.rand(120, 220), max: 1.6, size: api.rand(5, 9), color: ['#ffd166', '#ff8fab', '#5fd068'][i % 3], type: 'glow' });
          api.spawn({ type: 'heart', x: fxx, y: fyy, vy: -180, max: 1.6, size: 20, color: '#ff4f7b' });
        }
        api.sfx.chime?.(784);
      } else if (tier === 2) {
        const b = book[Math.floor(Math.random() * book.length)];
        if (b) callAnimal(b.key, api, user?.name);
        api.sfx.pop?.();
      } else {
        bigSpecial(api, user);
        api.fireworks(5);
      }
    }

    // ================================================================ แผงบนจอ
    function css() {
      const p = hud().palette || {};
      const r = `#root.theme-${id}`;
      return `
        ${r} { --glass: ${p.panel}; --panel-border: rgba(255,255,255,.2); --heading: ${p.soft}; --toast-bg: ${p.accent}; --toast-glow: ${p.accent};
          --big-grad: linear-gradient(180deg, #ffffff, ${p.accent2}); --big-bg: radial-gradient(circle at 50% 45%, rgba(0,0,0,.2), rgba(0,0,0,.66) 70%);
          --card-bg: ${p.panel}; --card-top: 700px; --team-top: 640px; --fortune-top: 720px; }
        ${r} #header, ${r} #songPanel, ${r} #giftPanel, ${r} #topPanel { display: none !important; }
        ${r} #hype { left: 24px; width: 420px; top: 356px; padding: 10px 14px 12px; border-radius: 22px; background: ${p.panel}; border: 2px solid rgba(255,255,255,.18); }
        ${r} #hype .label { font-size: 21px; }
        ${r} #hype .bar { height: 16px; }
        ${r} #feed { top: 356px !important; left: auto !important; right: 24px; width: 420px; }
        ${r} #toasts { top: 700px; }
        ${r} .fan .body { left: -48px; width: 96px; height: 180px; animation: zKid calc(var(--beat) * 2) ease-in-out infinite alternate; animation-delay: var(--ph, 0s); }
        ${r} .fan .body svg { width: 96px; height: 180px; }
        ${r} .fan .tag { top: calc(var(--fs, 1) * -186px - 30px); } ${r} { --pfp-lift: -46px; } ${r}[data-pfp="bigname"] .fan .tag { top: 6px; } /* รูปใหญ่ + ชื่อ: ชื่อย้ายไปใต้เท้า รูปอยู่บนหัว */ /* เด็กนักเรียนเตี้ยกว่ากรอบตัวละคร → รูปโปรไฟล์เหนือหัวลดลงมา */
        ${r} .fan .al { transform-origin: -9px -50px; } ${r} .fan .ar { transform-origin: 9px -50px; }
        ${r} .fan.wave .al { animation: zArmL .7s ease-out 1; } ${r} .fan.wave .ar { animation: zArmR .7s ease-out 1; }
        ${r} .fan.enter .body { animation: walkIn 1.4s ease-out both !important; }
        @keyframes zKid { from { transform: rotate(-1.5deg); } to { transform: rotate(1.5deg) translateY(-2px); } }
        @keyframes zArmL { 40% { transform: rotate(140deg); } }
        @keyframes zArmR { 40% { transform: rotate(-140deg); } }

        .zoo-hud { position: absolute; inset: 0; pointer-events: none; font-family: 'Kanit', 'Leelawadee UI', sans-serif; color: #fff; z-index: 3; }
        .zoo-hud * { box-sizing: border-box; }
        .zoo-hud .hp { background: ${p.panel}; border: 2px solid rgba(255,255,255,.2); border-radius: 30px; box-shadow: 0 10px 28px rgba(0,0,0,.35); }
        .zoo-hud .zttl { position: absolute; left: 50%; top: 36px; transform: translateX(-50%); padding: 16px 52px 20px; border-radius: 44px; text-align: center; white-space: nowrap;
          background: linear-gradient(90deg, ${p.accent}, ${p.accent2}); box-shadow: 0 16px 40px rgba(0,0,0,.4); max-width: 1000px; }
        .zoo-hud .zttl b { display: block; font-size: 58px; line-height: 1.05; font-weight: 800; overflow: hidden; text-overflow: ellipsis; }
        .zoo-hud .zttl small { display: block; font-size: 26px; font-weight: 500; opacity: .95; overflow: hidden; text-overflow: ellipsis; }
        .zoo-hud .zbook { position: absolute; left: 24px; right: 24px; top: 210px; padding: 14px 22px; }
        .zoo-hud .zbook .hd { display: flex; justify-content: space-between; font-size: 25px; color: ${p.soft}; font-weight: 600; }
        .zoo-hud .zbook .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
        .zoo-hud .zbook .chips span { padding: 4px 16px; border-radius: 99px; background: rgba(255,255,255,.08); font-size: 22px; color: rgba(255,255,255,.5); }
        .zoo-hud .zbook .chips span.on { background: rgba(255,209,102,.28); color: #fff; }
        .zoo-hud .zbook .chips span.pop { animation: zPop .8s ease-out; }
        @keyframes zPop { 0% { transform: scale(1.4); background: #ffd166; } }
        .zoo-hud .zbot { position: absolute; left: 24px; right: 24px; bottom: 22px; padding: 14px 22px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px 22px; }
        .zoo-hud .zbot div { display: flex; gap: 12px; align-items: center; font-size: 22px; line-height: 1.25; }
        .zoo-hud .zbot i { font-style: normal; font-size: 30px; flex: none; }
        .zoo-hud .zbot b { color: ${p.soft}; }
      `;
    }
    function render(api) {
      const m = meta();
      const t = api.t || {};
      const Z = cfgZ();
      const b = Z.book || [];
      const names = b.slice(0, 2).map((x) => `“${(hud().cmds || []).find((c) => c.zone === x.key)?.c || x.name}”`).join(' / ');
      const act = Z.action ? [Z.action.emoji, `พิมพ์ “${Z.action.c}”`, Z.action.a] : ['🔎', `พิมพ์ชื่อสัตว์ ${names}`, 'สัตว์ตัวนั้นมาใกล้ ๆ'];
      const rows = [
        ['💬', 'คอมเมนต์', 'เด็กนักเรียนมายืนดู มีชื่อเหนือหัว'],
        act,
        [window.giftIconHtml?.('Rose', '🌹') || '🌹', 'ของขวัญ', Z.gifts?.[0]], // รูปกุหลาบจริงจาก TikTok ถ้ามี
        ['🎆', 'ของขวัญใหญ่ 100+', Z.gifts?.[2]],
      ];
      el.innerHTML = `
        <div class="zttl"><b>🎒 ${esc(t.title || m.defaults?.title)}</b><small>${esc(t.subtitle || m.defaults?.subtitle || '')}</small></div>
        <div class="zbook hp"><div class="hd"><span>📒 สมุดสะสมสัตว์ (<b class="cnt">0</b>/${b.length + 1})</span><span>🎒 นักเรียน <b class="kids">0</b> คน</span></div><div class="chips"></div></div>
        <div class="zbot hp">${rows.map(([e, k, v]) => `<div><i>${e}</i><span><b>${esc(k)}</b> → ${esc(v)}</span></div>`).join('')}</div>`;
      renderBook();
      clearInterval(T._k);
      T._k = setInterval(() => {
        const n = el?.querySelector('.kids');
        if (n && API?.fans) n.textContent = String(API.fans.size);
      }, 1000);
    }
    let lastSeen = 0;
    function renderBook() {
      const box = el?.querySelector('.zbook .chips');
      if (!box) return;
      const Z = cfgZ();
      const all = [...(Z.book || []), Z.special ? { key: Z.special.key, name: Z.special.name, emoji: '⭐' } : null].filter(Boolean);
      box.innerHTML = all.map((b) => `<span class="${st.seen.has(b.key) ? 'on' : ''}${st.seen.has(b.key) && st.seen.size > lastSeen ? ' pop' : ''}" data-k="${esc(b.key)}">${st.seen.has(b.key) ? '✓ ' + esc(b.emoji || '') + ' ' + esc(b.name) : '? ???'}</span>`).join('');
      lastSeen = st.seen.size;
      el.querySelector('.cnt').textContent = String(all.filter((b) => st.seen.has(b.key)).length);
    }
    function updateBook(d) {
      let changed = false;
      for (const [k, n] of Object.entries(d.zones || {})) {
        if (n > 0 && !st.seen.has(k)) {
          st.seen.add(k);
          changed = true;
        }
      }
      if (changed) renderBook();
    }

    return T;
  };
})();
