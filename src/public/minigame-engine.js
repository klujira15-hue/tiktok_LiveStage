/* มินิเกม 6 ธีม — ตัวกลางฝั่งหน้าเวที (แต่ละเกมอยู่ใน public/mg/<เกม>.js แล้วลงทะเบียนที่ window.MG_GAMES)
 * ไฟล์ธีม public/themes/<id>.js เรียก window.makeMiniTheme('<id>') — เกมไหนดูจาก META.mg
 * วาดบนแคนวาส 180x320 ขยาย 6 เท่าแบบคม • ตัวละครคนดูเกมวาดเองทั้งหมด (ซ่อนตัวละครปกติของหน้าเวที)
 * มีชุดเครื่องมือวาดพิกเซล window.PixelKit ให้ทุกเกมใช้ร่วมกัน
 */
(() => {
  const W = 180;
  const H = 320;
  const K = 6;
  const O = '#1b1426';
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const meta = () => window.__stage?.api?.meta || {};
  const hsh = (s) => {
    let h = 2166136261;
    for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return h >>> 0;
  };
  const rnd = (seed) => {
    let s = seed % 2147483647 || 7;
    return () => ((s = (s * 16807) % 2147483647) / 2147483647);
  };

  // ================================================================ ตัววาดพิกเซล
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
      oell(cx, cy, rx, ry, col, o = O) {
        p.ell(cx, cy, rx + 1, ry + 1, o);
        p.ell(cx, cy, rx, ry, col);
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
      dither(y0, y1, c1, c2, x0 = 0, x1 = w) {
        const B = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
        for (let y = y0; y < y1; y++) {
          const t = (y - y0 + 0.5) / Math.max(1, y1 - y0);
          for (let x = x0; x < x1; x++) p.px(x, y, t > (B[((y % 4) + 4) % 4][((x % 4) + 4) % 4] + 0.5) / 16 ? c2 : c1);
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
      // กระพริบประกาย
      spark(x, y, col = '#ffffff', s = 1) {
        p.px(x, y, col);
        for (let i = 1; i <= s; i++) for (const [a, b] of [[i, 0], [-i, 0], [0, i], [0, -i]]) p.px(x + a, y + b, col);
      },
    };
    return p;
  }
  function tint(cv, col) {
    const w = document.createElement('canvas');
    w.width = cv.width;
    w.height = cv.height;
    const c = w.getContext('2d');
    c.drawImage(cv, 0, 0);
    c.globalCompositeOperation = 'source-in';
    c.fillStyle = col;
    c.fillRect(0, 0, w.width, w.height);
    return w;
  }

  // ================================================================ ตัวละครคนดู (ชุดเดียวกับปาร์ตี้ผจญภัย) + หมวกตามเกม
  const HERO = ['...oooooo...', '..ohhhhhhho.', '.ohhhhhhhhho', '.ohhsssssho.', '.ohsesssesho', '.ohsssssssho', '..ossppsssso', '..occccccco.', '.oscccccccso', '.oscdcccdcso', '..occccccco.', '..odddddddo.'];
  const LEGS = [
    ['..odd...ddo.', '..obb...bbo.', '..ooo...ooo.'],
    ['..odd..ddo..', '.obb...obbo.', '.ooo....ooo.'],
    ['...odd.ddo..', '..obbo.bbo..', '..ooo..ooo..'],
  ];
  const SHIRTS = [['#3b6fd8', '#24408a'], ['#8a3fd1', '#5a2a8f'], ['#3f9a4a', '#26663a'], ['#e8453c', '#9a1f2a'], ['#ff8a3d', '#b85a1a'], ['#22b8c8', '#127080'], ['#ff6bb0', '#b8407a'], ['#f2efe6', '#c8c2b0']];
  const SKIN = ['#f6d2b0', '#f1c7a0', '#e0ac85', '#c98e66'];
  const HAIR = ['#2a1f1a', '#5a3a22', '#c8642a', '#f2d16b', '#3a2a5e', '#e8e8f0'];
  const HX = 6;
  const HY = 9;
  const cache = new Map();
  // ตัวละคร 12x15 หันขวา ในแคนวาส 26x26 (ขอบ HX/HY ให้ของล้นตัวได้) • opt: { shirt:[c,d], hat:'chef'|'straw'|'helm'|'cap', tool:'rod'|'can'|'bow'|'sword'|'paddle'|null, crown, arm:'up' }
  function hero(id, frame = 0, opt = {}) {
    const h = hsh(id);
    const shirt = opt.shirt || SHIRTS[h % SHIRTS.length];
    const key = [h % 997, frame, shirt[0], opt.hat || '', opt.tool || '', opt.crown ? 1 : 0, opt.arm || ''].join('|');
    let cv = cache.get(key);
    if (cv) return cv;
    const p = P(26, 26);
    const x = HX;
    const y = HY;
    const skin = SKIN[h % 4];
    const hair = HAIR[(h >> 2) % 6];
    p.grid([...HERO, ...LEGS[frame % 3]], x, y, { h: hair, s: skin, e: O, p: '#ff9aa8', c: shirt[0], d: shirt[1], b: '#5a3a2a' });
    const fx = (i) => x + i;
    if (opt.hat === 'chef') {
      p.orect(fx(2), y - 6, 8, 7, '#ffffff');
      p.rect(fx(1), y, 10, 2, '#ffffff');
      p.rect(fx(1), y + 1, 10, 1, '#d8d8e0');
    } else if (opt.hat === 'straw') {
      p.rect(fx(-1), y + 1, 14, 2, '#e0b85a');
      p.rect(fx(-1), y + 2, 14, 1, '#b8903a');
      p.orect(fx(2), y - 3, 8, 5, '#e0b85a');
      p.rect(fx(3), y, 6, 1, '#e8453c');
    } else if (opt.hat === 'helm') {
      for (let i = 1; i < 11; i++) p.px(fx(i), y - 1, i === 1 || i === 10 ? O : '#9aa6b8');
      for (let i = 1; i < 11; i++) p.px(fx(i), y, '#c8d0dc'), p.px(fx(i), y + 1, '#9aa6b8');
      p.px(fx(5), y - 2, '#e8453c');
      p.px(fx(6), y - 2, '#e8453c');
    } else if (opt.hat === 'cap') {
      p.rect(fx(2), y - 1, 8, 3, shirt[0]);
      p.rect(fx(9), y + 1, 4, 1, shirt[1]);
    }
    const t = opt.tool;
    if (t === 'rod') {
      p.line(fx(10), y + 9, fx(17), y - 6, '#7a4a2a');
    } else if (t === 'can') {
      p.orect(fx(10), y + 7, 5, 4, '#7cc6f2');
      p.px(fx(15), y + 7, '#7cc6f2');
    } else if (t === 'bow') {
      for (const [a, b] of [[11, 3], [12, 4], [13, 5], [13, 6], [13, 7], [13, 8], [13, 9], [12, 10], [11, 11]]) p.px(fx(a), y + b, '#9a5a2a');
      for (let b = 4; b < 11; b++) p.px(fx(11), y + b, '#d8d8e0');
    } else if (t === 'sword') {
      for (let r = 1; r < 8; r++) p.px(fx(11), y + r, '#e8eef5'), p.px(fx(12), y + r, '#9aa6b8');
      for (const i of [10, 11, 12, 13]) p.px(fx(i), y + 8, '#d9a43a');
    } else if (t === 'pan') {
      p.rect(fx(11), y + 8, 5, 1, '#3a3d45');
      p.rect(fx(10), y + 9, 7, 1, '#3a3d45');
      p.rect(fx(16), y + 7, 3, 1, '#7a4a2a');
    }
    if (opt.arm === 'up') {
      p.rect(fx(10), y + 3, 2, 5, skin);
      p.px(fx(10), y + 2, skin);
    }
    if (opt.crown) {
      const cy = opt.hat === 'chef' ? y - 9 : y - 3;
      for (const i of [3, 5, 7, 9]) p.px(fx(i), cy, '#ffd166');
      for (let i = 3; i < 10; i++) p.px(fx(i), cy + 1, '#ffd166'), p.px(fx(i), cy + 2, '#e0a81e');
      p.px(fx(6), cy + 1, '#e8453c');
    }
    cv = p.cv;
    cache.set(key, cv);
    return cv;
  }
  // คนมองจากด้านบน 6x6 (เรือ/หมู่บ้านมุมสูง)
  const TOP = ['.oooo.', 'ohhhho', 'ohhhho', 'occcco', 'occcco', '.oooo.'];
  function topPerson(id, shirt) {
    const h = hsh(id);
    const key = 'top|' + (h % 997) + '|' + (shirt || '');
    let cv = cache.get(key);
    if (cv) return cv;
    const p = P(6, 6);
    p.grid(TOP, 0, 0, { h: HAIR[(h >> 2) % 6], c: shirt || SHIRTS[h % SHIRTS.length][0] });
    cv = p.cv;
    cache.set(key, cv);
    return cv;
  }
  window.PixelKit = { P, tint, hero, topPerson, hsh, rnd, esc, O, W, H, K, HX, HY, SHIRTS, SKIN, HAIR };
  window.MG_GAMES = window.MG_GAMES || {};

  // ================================================================ ธีม (ตัวกลาง)
  window.makeMiniTheme = function makeMiniTheme(id) {
    let API = null;
    let el = null;
    let dyn = null;
    let fxl = null;
    let fxWorld = null;
    let cv = null;
    let c = null;
    let G = null;
    let lastT = 0;
    let lastHud = 0;
    const S = {};
    const parts = [];
    const fx = { shake: 0, flash: 0, flashC: '#ffffff' };
    const labels = new Map();
    const badges = new Map(); // id → ไอคอนป้ายเซียน (ข้ามเกม)
    const lastGift = new Map();
    const game = () => (G ||= window.MG_GAMES[meta().mg] || null);
    const ctx = {
      W, H, K, O, S, parts, fx, esc,
      // ชื่อคนดู + ป้ายเซียน (ใช้ในป้ายชื่อทุกเกม)
      nm: (id, name) => `${badges.get(id) || ''}${esc(name)}`,
      get api() {
        return API;
      },
      get c() {
        return c;
      },
      get hud() {
        return meta().hud || {};
      },
      // ตัวเลข/ข้อความลอย (DOM คมชัด) ที่พิกัดพิกเซล
      num(x, y, text, color = '#ffffff', size = 46) {
        if (!fxl) return;
        while (fxl.querySelectorAll('.mg-num').length > 24) fxl.querySelector('.mg-num').remove();
        const d = document.createElement('div');
        d.className = 'mg-num';
        d.textContent = text;
        d.style.cssText = `left:${Math.round(x * K)}px;top:${Math.round(y * K)}px;color:${color};font-size:${size}px;`;
        fxl.appendChild(d);
        setTimeout(() => d.remove(), 1200);
      },
      // ป้ายชื่อ/ฟองคำพูดเหนือตัวละคร (อยู่ไม่กี่วินาที) — key เดิมจะแทนที่ของเก่า
      label(key, x, y, html, sec = 3, cls = '') {
        if (!fxl) return;
        let d = labels.get(key);
        if (!d) {
          d = document.createElement('div');
          labels.set(key, d);
          fxl.appendChild(d);
        }
        const cn = 'mg-lab ' + cls;
        if (d.className !== cn) d.className = cn;
        if (d._h !== html) {
          d._h = html;
          d.innerHTML = html;
        }
        d.style.left = Math.round(x * K) + 'px';
        d.style.top = Math.round(y * K) + 'px';
        clearTimeout(d._t);
        d._t = setTimeout(() => {
          d.remove();
          labels.delete(key);
        }, sec * 1000);
      },
      moveLabel(key, x, y) {
        const d = labels.get(key);
        if (!d) return;
        d.style.left = Math.round(x * K) + 'px';
        d.style.top = Math.round(y * K) + 'px';
      },
      bar(pct, col, h = 22, bg = '#3a3050') {
        return `<div class="bar" style="height:${h}px;background:${bg}"><i style="width:${Math.max(0, Math.min(100, pct)).toFixed(1)}%;background:${col}"></i></div>`;
      },
      mmss: (sec) => `${Math.floor(sec / 60)}:${String(Math.max(0, sec) % 60).padStart(2, '0')}`,
      left: (k = 'deadline') => Math.max(0, Math.ceil(((S[k] || 0) - performance.now()) / 1000)),
      actors() {
        const out = [];
        if (API?.fans) for (const [fid, f] of API.fans) out.push({ id: fid, name: f.data?.name || '', vip: !!f.data?.vip, at: f.at || 0 });
        return out;
      },
      toast: (t, cls = '') => API?.toast(t, cls),
      sfx: (k, a) => API?.sfx?.[k]?.(a),
      boom(x, y, n = 14, cols = ['#ffd166', '#ff8a3d', '#e8453c']) {
        for (let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - 0.5) * 90, vy: (Math.random() - 0.5) * 90 - 20, life: 0.6, c: cols[i % cols.length], g: 60 });
      },
      coins(x, y, n = 20) {
        for (let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - 0.5) * 80, vy: -40 - Math.random() * 60, life: 1.4, c: i % 3 ? '#ffd166' : '#e0a81e', g: 140, sz: 2, floor: y + 18 });
      },
      sparkles(x, y, n = 12, col = '#ffd166', w = 12) {
        for (let i = 0; i < n; i++) parts.push({ x: x + (Math.random() - 0.5) * w, y: y + (Math.random() - 0.5) * w, vx: 0, vy: -20 - Math.random() * 20, life: 0.9, c: col, g: 0 });
      },
    };

    const T = {
      bpm: 120,
      fanH: 1,
      // ตัวละครปกติของหน้าเวทีซ่อนไว้ (เกมวาดคนดูเอง) — แถวนี้อยู่นอกจอ
      rows: [{ y: 2400, s: 1, n: 80, x0: 0, x1: 1080, jy: 0 }],
      get css() {
        return css();
      },
      fanSvg() {
        return '';
      },
      init(api) {
        API = api;
        el = document.createElement('div');
        el.className = 'mg-hud';
        document.getElementById('ui').appendChild(el);
        cv = document.createElement('canvas');
        cv.id = 'mgpx';
        cv.width = W;
        cv.height = H;
        cv.style.cssText = 'position:absolute;left:0;top:0;width:1080px;height:1920px;image-rendering:pixelated;';
        document.getElementById('bg').after(cv);
        c = cv.getContext('2d');
        c.imageSmoothingEnabled = false;
        game()?.init?.(ctx);
        renderStatic();
        try {
          const sk = window.io?.();
          sk?.emit('mg:get', null, (s) => {
            if (s) apply(s);
            sk.disconnect();
          });
        } catch {}
      },
      drawStatic(cx) {
        cx.fillStyle = '#1b1426';
        cx.fillRect(0, 0, 1080, 1920);
      },
      drawBg(_c, t) {
        if (c) frame(t / 1000);
      },
      effects: new Proxy({}, {
        get(_o, key) {
          const f = meta().effects?.[key];
          if (!f) return undefined;
          return (user, n) => {
            const tier = Number(String(f.kind).replace(/\D/g, '')) || 1;
            const k = (user?.id || '?') + '|' + tier;
            if (performance.now() - (lastGift.get(k) || 0) < 1800) return;
            lastGift.set(k, performance.now());
            game()?.gift?.(tier, user, n || 1, f, ctx);
          };
        },
        has: (_o, key) => !!meta().effects?.[key],
        ownKeys: () => Object.keys(meta().effects || {}),
        getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
      }),
      onEvent(d, api) {
        if (d.type === 'mgState') return apply(d);
        if (d.type === 'mgNext') {
          S.next = d;
          S.nextAt = performance.now() + (d.left || 0) * 1000;
          api.toast(`🎮 อีก ${d.left >= 60 ? Math.round(d.left / 60) + ' นาที' : d.left + ' วิ'} เปลี่ยนเป็น ${d.icon} ${d.name}!`, d.left <= 10 ? 'big' : '');
          return renderDyn();
        }
        if (d.type === 'mg' && d.ev === 'badge') {
          badges.set(d.id, (badges.get(d.id) || '') + d.icon);
          api.toast(`🏅 ${d.name} ได้ป้าย “${d.title}” ${d.icon} (+50 เหรียญ)`, 'big');
          api.fireworks(2);
          return;
        }
        if (d.type === 'mg') return game()?.onEv?.(d, ctx);
        if (d.type === 'goal') {
          api.toast(`🎯 ${d.key === 'coins' ? 'เพชร' : 'ใจ'}ครบ! → ${d.reward}`, 'big');
          game()?.goal?.(d, ctx);
        }
      },
      onChat(d) {
        game()?.onChat?.(d, ctx);
      },
      onLike(d, api) {
        api.spawn({ type: 'heart', x: api.rand(200, 880), y: 1300, vy: api.rand(-300, -200), max: 1.6, size: api.rand(12, 18), color: '#ff4fa3', fadeIn: 0.1 });
      },
    };

    function apply(s) {
      const prev = { ...S };
      Object.assign(S, s);
      const pn = performance.now();
      S.deadline = pn + (s.left || 0) * 1000;
      if (s.badges) for (const [k, v] of Object.entries(s.badges)) badges.set(k, v);
      if ('next' in s) {
        S.next = s.next;
        S.nextAt = s.next ? pn + s.next.left * 1000 : 0;
      }
      game()?.apply?.(S, prev, ctx);
      renderDyn();
    }

    function frame(ts) {
      const dt = Math.min(0.05, ts - lastT || 0.016);
      lastT = ts;
      if (ts - lastHud > 0.4) {
        lastHud = ts;
        renderDyn();
      }
      fx.shake = Math.max(0, fx.shake - dt);
      fx.flash = Math.max(0, fx.flash - dt);
      const sh = fx.shake > 0 ? Math.round((Math.random() - 0.5) * 4 * fx.shake) : 0;
      c.setTransform(1, 0, 0, 1, sh, fx.shake > 0 ? Math.round((Math.random() - 0.5) * 3 * fx.shake) : 0);
      c.clearRect(-4, -4, W + 8, H + 8);
      game()?.frame?.(c, ts, dt, ctx);
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
        if (q.floor && q.y > q.floor) (q.y = q.floor), (q.vy *= -0.4), (q.vx *= 0.6);
        c.fillStyle = q.c;
        const sz = q.sz || 1;
        if (q.plus) {
          c.fillRect(Math.round(q.x) - 1, Math.round(q.y), 3, 1);
          c.fillRect(Math.round(q.x), Math.round(q.y) - 1, 1, 3);
        } else c.fillRect(Math.round(q.x), Math.round(q.y), sz, sz);
      }
      if (parts.length > 500) parts.splice(0, parts.length - 500);
      c.setTransform(1, 0, 0, 1, 0, 0);
      if (fx.flash > 0) {
        c.globalAlpha = Math.min(0.7, fx.flash);
        c.fillStyle = fx.flashC;
        c.fillRect(0, 0, W, H);
        c.globalAlpha = 1;
      }
    }

    // ---------------------------------------------------------------- แผงบนจอ
    function renderStatic() {
      const m = meta();
      const t = API?.t || {};
      const g = game();
      const rows = g?.hints || [];
      el.classList.toggle('hbt', g?.hintsTop != null);
      el.innerHTML = `
        <div class="ttl"><b>${esc(m.icon || '')} ${esc(t.title || m.defaults?.title)}</b>${g?.noSub ? '' : `<small>${esc(t.subtitle || m.defaults?.subtitle || '')}</small>`}</div>
        <div class="dyn"></div>${g?.fxWorld ? '' : '<div class="fxl"></div>'}
        ${g?.hintsTop != null
          ? `<div class="hb" style="top:${g.hintsTop}px"><div class="pills">${rows.map(([e, k, v]) => `<span class="pill"><i>${e}</i><b>${esc(k)}</b>${esc(v)}</span>`).join('')}</div>
            ${g.foot ? `<div class="foot">${esc(g.foot)}</div>` : ''}</div>`
          : `<div class="bot bx">${rows.map(([e, k, v]) => `<div><i>${e}</i><span><b>${esc(k)}</b> → ${esc(v)}</span></div>`).join('')}
          ${g?.foot ? `<div class="foot">${esc(g.foot)}</div>` : ''}</div>`}`;
      dyn = el.querySelector('.dyn');
      // แผงสถานะของเกมวางต่อใต้แถบวิธีเล่นพอดี (top: var(--hb-end)) — วัดใหม่เมื่อฟอนต์โหลดเสร็จ
      const hb = el.querySelector('.hb');
      const fit = () => hb && el.style.setProperty('--hb-end', Math.ceil(hb.offsetTop + hb.offsetHeight + 12) + 'px');
      fit();
      document.fonts?.ready.then(fit);
      // fxWorld: ป้ายเหนือหัว/ตัวเลขเด้ง อยู่ชั้นเดียวกับภาพเกม (ไม่ย่อตามโหมดเผื่อขอบมือถือ ซึ่งย่อแค่ #ui) → ตรงหัวตัวละครเสมอ
      if (g?.fxWorld) {
        if (!fxWorld) {
          fxWorld = document.createElement('div');
          fxWorld.className = 'mg-hud mg-fx';
          cv.after(fxWorld);
        }
        fxl = fxWorld;
      } else fxl = el.querySelector('.fxl');
      renderDyn();
    }
    function renderDyn() {
      if (!dyn) return;
      const nl = S.next && S.nextAt ? Math.max(0, Math.ceil((S.nextAt - performance.now()) / 1000)) : 0;
      const html = (game()?.hud?.(ctx) || '') + (S.next && nl > 0 && nl <= 300 ? `<div class="nextg">🎮 เกมถัดไป ${esc(S.next.icon)} ${esc(S.next.name)} · ${ctx.mmss(nl)}</div>` : '');
      if (dyn._h !== html) {
        dyn._h = html;
        dyn.innerHTML = html;
      }
      if (fxWorld && game()?.world) {
        let wd = fxWorld.querySelector(':scope > .wd');
        if (!wd) {
          wd = document.createElement('div');
          wd.className = 'wd';
          fxWorld.prepend(wd);
        }
        const wh = game().world(ctx) || '';
        if (wd._h !== wh) {
          wd._h = wh;
          wd.innerHTML = wh;
        }
      }
    }
    function css() {
      const p = meta().hud?.palette || {};
      const r = `#root.theme-${id}`;
      const BOX = 'border: 6px solid #ffffff; box-shadow: 8px 8px 0 #000; border-radius: 0;';
      return `
        ${r} { --glass: ${p.panel}; --panel-border: #ffffff; --heading: ${p.soft}; --toast-bg: ${p.accent}; --toast-glow: ${p.accent};
          --big-grad: linear-gradient(180deg, #ffffff, ${p.accent2}); --big-bg: radial-gradient(circle at 50% 45%, rgba(0,0,0,.2), rgba(0,0,0,.66) 70%);
          --card-bg: ${p.panel}; --card-top: 700px; --team-top: 640px; --fortune-top: 720px; }
        ${r} #header, ${r} #songPanel, ${r} #giftPanel, ${r} #topPanel, ${r} #feed, ${r} #hype, ${r} #crowd { display: none !important; }
        ${r} #toasts { top: ${game()?.toastTop || 900}px; }
        ${r} .toast { border-radius: 0 !important; ${BOX} font-size: 34px; white-space: normal; max-width: 900px; text-align: center; line-height: 1.25; }
        ${r} .toast.big { font-size: 38px; }
        .mg-hud { position: absolute; inset: 0; pointer-events: none; font-family: 'Kanit', 'Leelawadee UI', sans-serif; color: #fff; z-index: 3; }
        .mg-hud * { box-sizing: border-box; }
        .mg-hud .bx { background: ${p.panel}; ${BOX} }
        .mg-hud .ttl { position: absolute; left: 50%; top: 32px; transform: translateX(-50%); padding: 14px 44px 18px; text-align: center; white-space: nowrap; background: ${p.accent}; ${BOX} max-width: 1010px; }
        .mg-hud .ttl b { display: block; font-size: 54px; line-height: 1.05; font-weight: 800; overflow: hidden; text-overflow: ellipsis; }
        .mg-hud .ttl small { display: block; font-size: 28px; font-weight: 500; opacity: .95; overflow: hidden; text-overflow: ellipsis; }
        .mg-hud .pn { position: absolute; padding: 12px 18px 14px; font-size: 27px; font-weight: 600; background: ${p.panel}; ${BOX} }
        .mg-hud .pn .h { font-size: 32px; font-weight: 800; display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
        .mg-hud .pn .h small { font-size: 24px; opacity: .8; font-weight: 600; }
        .mg-hud .row { display: flex; justify-content: space-between; gap: 10px; margin-top: 6px; }
        .mg-hud .bar { border: 4px solid #1b1426; margin-top: 4px; position: relative; }
        .mg-hud .bar i { position: absolute; left: 0; top: 0; bottom: 0; transition: width .3s; box-shadow: inset 0 -5px 0 rgba(0,0,0,.25); }
        .mg-hud .gold { color: #ffd166; }
        .mg-hud .bot { position: absolute; left: 20px; right: 20px; bottom: 20px; padding: 14px 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px; }
        .mg-hud .bot div { display: flex; gap: 10px; align-items: center; font-size: 27px; font-weight: 600; line-height: 1.25; }
        .mg-hud .bot i { font-style: normal; font-size: 34px; flex: none; }
        .mg-hud .bot b { color: ${p.soft}; }
        .mg-hud .bot .foot { grid-column: 1 / -1; border-top: 3px dashed rgba(255,255,255,.25); padding-top: 6px; margin-top: 2px; font-size: 23px; opacity: .9; }
        .mg-hud .hb { position: absolute; left: 24px; right: 24px; display: grid; justify-items: center; gap: 8px; }
        .mg-hud .hb .pills { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px 12px; }
        .mg-hud .hb .pill { display: inline-flex; align-items: center; gap: 8px; padding: 3px 16px 5px 6px; font-size: 25px; font-weight: 600; line-height: 1.3; white-space: nowrap;
          background: rgba(12,8,24,.66); border: 3px solid rgba(255,255,255,.55); box-shadow: 4px 4px 0 rgba(0,0,0,.55); }
        .mg-hud .hb .pill i { font-style: normal; font-size: 26px; }
        .mg-hud .hb .pill b { padding: 0 10px 2px; background: ${p.accent}; border: 3px solid #fff; font-weight: 800; color: #fff; }
        .mg-hud .slim { position: absolute; left: 50%; transform: translateX(-50%); width: 900px; padding: 6px 16px 8px; font-size: 23px; font-weight: 600; line-height: 1.3;
          background: rgba(12,8,24,.7); border: 3px solid rgba(255,255,255,.55); box-shadow: 4px 4px 0 rgba(0,0,0,.55); }
        .mg-hud .slim .l { display: flex; align-items: center; gap: 12px; white-space: nowrap; }
        .mg-hud .slim .l + .l { margin-top: 3px; }
        .mg-hud .slim .l .bar { flex: 1; margin: 0; height: 18px; border-width: 3px; }
        .mg-hud .slim .l .sp { flex: 1; }
        .mg-hud .slim .s { margin-top: 2px; font-size: 20px; opacity: .92; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .mg-hud .slim .hot { margin-top: 3px; color: #ffd166; font-weight: 800; }
        .mg-fx .mg-lab { font-size: 21px; padding: 0 8px 2px; border-width: 3px; line-height: 1.25; }
        .mg-fx .mg-lab.gold { font-size: 22px; }
        .mg-fx .mg-lab.say { font-size: 24px; }
        .mg-hud.hbt .nextg { top: 2px; left: auto; right: 34px; transform: rotate(2deg); padding: 0 12px 2px; font-size: 22px; border-width: 3px; }
        .mg-hud .hb .foot { padding: 1px 14px 3px; font-size: 20px; line-height: 1.35; color: #fff; background: rgba(12,8,24,.5); text-shadow: 2px 2px 0 #000; }
        .mg-hud .fxl { position: absolute; inset: 0; }
        .mg-hud .nextg { position: absolute; left: 50%; top: 154px; transform: translateX(-50%); padding: 2px 18px 4px; background: #ffd166; color: #1b1426; border: 4px solid #1b1426; font-size: 26px; font-weight: 800; white-space: nowrap; }
        .mg-num { position: absolute; transform: translate(-50%, 0); font-family: 'Kanit', sans-serif; font-weight: 800; white-space: nowrap;
          -webkit-text-stroke: 3px #1b1426; paint-order: stroke fill; text-shadow: 5px 0 0 #1b1426, -5px 0 0 #1b1426, 0 5px 0 #1b1426, 0 -5px 0 #1b1426, 6px 6px 0 #1b1426; animation: mgNum 1.2s steps(12) forwards; }
        @keyframes mgNum { 0% { transform: translate(-50%, 10px) scale(.6); opacity: 1; } 20% { transform: translate(-50%, -18px) scale(1.15); } 70% { opacity: 1; } 100% { transform: translate(-50%, -70px) scale(1); opacity: 0; } }
        .mg-lab { position: absolute; transform: translate(-50%, -100%); white-space: nowrap; padding: 2px 12px 4px; background: rgba(12,8,24,.92); border: 4px solid #ffd166; font-size: 26px; font-weight: 700; line-height: 1.3; }
        .mg-lab.say { background: #ffffff; color: #1b1426; border: 0; border-radius: 16px; box-shadow: 4px 4px 0 #1b1426; font-size: 30px; font-weight: 800; }
        .mg-lab.gold { background: #ffd166; color: #1b1426; border-color: #1b1426; }
        .mg-lab small { font-size: .8em; opacity: .85; }
        ${game()?.css?.(p) || ''}
      `;
    }
    return T;
  };
})();
