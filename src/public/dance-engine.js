/* ธีมเวที (คนดูขึ้นไปเต้น) — ใช้ร่วมกัน 4 ธีม ข้อมูลธีมอยู่ใน dancethemes.js
 * ไฟล์ธีม public/themes/<id>.js เรียก window.makeDanceTheme('<id>')
 * ตัวละครคนดู = ระบบคนดูของหน้าเวที (ชื่อ + รูปโปรไฟล์ VIP ชุดที่แลกแต้ม) วาดชุดตามเวที + ท่าเต้นด้วย CSS ตามจังหวะเพลง (--beat)
 * ฉาก = ภาพ SVG วาดลงแคนวาสครั้งเดียว (public/stages/) • ไฟ/เลเซอร์/พลุ = วาดเบา ๆ ทุกเฟรม ไม่สร้างออบเจกต์ใหม่
 */
(() => {
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const meta = () => window.__stage?.api?.meta || {};
  const hud = () => meta().hud || {};
  const cfgD = () => hud().dance || {};

  // ---- แถวยืน: index แรก ๆ = บนเวที (stage) ที่เหลือ = หน้าเวที
  const LAYOUT = {
    ramwong: { stage: [0, 1], rows: [{ y: 1192, s: 1, n: 6, x0: 200, x1: 880, jy: 6 }, { y: 1262, s: 1.08, n: 3, x0: 380, x1: 700, vip: true, jy: 4 }, { y: 1520, s: 1.25, n: 6, x0: 80, x1: 1000 }, { y: 1640, s: 1.35, n: 5, x0: 110, x1: 970 }] },
    pageant: { stage: [0, 1], rows: [{ y: 1196, s: 0.95, n: 6, x0: 170, x1: 910, jy: 4 }, { y: 1440, s: 1.15, n: 2, x0: 470, x1: 610, vip: true, jy: 4 }, { y: 1560, s: 1.2, n: 3, x0: 70, x1: 330 }, { y: 1560, s: 1.2, n: 3, x0: 750, x1: 1010 }, { y: 1680, s: 1.3, n: 2, x0: 60, x1: 300 }, { y: 1680, s: 1.3, n: 2, x0: 780, x1: 1020 }] },
    molam: { stage: [0, 1], rows: [{ y: 1250, s: 0.98, n: 7, x0: 150, x1: 930, jy: 4 }, { y: 1280, s: 1.08, n: 3, x0: 410, x1: 670, vip: true, jy: 3 }, { y: 1560, s: 1.3, n: 5, x0: 90, x1: 990 }, { y: 1680, s: 1.4, n: 4, x0: 140, x1: 940 }] },
    disco: { stage: [0, 1], rows: [{ y: 1390, s: 1.15, n: 6, x0: 160, x1: 920 }, { y: 1530, s: 1.3, n: 3, x0: 380, x1: 700, vip: true }, { y: 1262, s: 1, n: 6, x0: 80, x1: 1000, jy: 6 }, { y: 1680, s: 1.45, n: 4, x0: 120, x1: 960 }] },
  };
  const FAN_H = 180;

  // ---- ตัวละคร (SVG) ชุดตามเวที — พิกัดเท้าที่ 0,0 สูงราว 100 หน่วย
  const SKIN = ['#f6d2b0', '#eec39a', '#d9a47c', '#f1c7a0', '#c98e66'];
  const HAIR = ['#2a1f1a', '#3a2418', '#5a3a22', '#1a1a22', '#7a4a2a'];
  const COL = {
    ramwong: ['#ff4fa3', '#ffd166', '#7cc6f2', '#a78bfa', '#5fd068', '#ff9f43', '#e8453c'],
    pageant: ['#e11d48', '#ff8fb8', '#7cc6f2', '#a78bfa', '#ffd166', '#ffffff', '#5fd068'],
    molam: ['#ff2d8a', '#2dd4ff', '#ffb020', '#5dff8a', '#b07cff', '#ff6b3c'],
    disco: ['#ff2d8a', '#2dd4ff', '#ffb020', '#5dff8a', '#b07cff', '#ff6b3c'],
  };
  function hsh(s) {
    let h = 2166136261;
    for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return h >>> 0;
  }
  function dancerSvg(id, fid) {
    const h = hsh(fid);
    const P = COL[id];
    const sk = SKIN[h % SKIN.length];
    const hr = HAIR[(h >>> 3) % HAIR.length];
    const male = (h >>> 6) % 5 < (id === 'pageant' ? 1 : 2);
    const c1 = P[(h >>> 9) % P.length];
    const c2 = P[(h >>> 13) % P.length];
    const o = ['<ellipse cx="0" cy="0" rx="17" ry="4" fill="#000" opacity=".28"/>'];
    let kind = male ? 'pants' : 'skirt';
    let style = male ? 'short' : ['bun', 'long', 'bun'][(h >>> 16) % 3];
    let top = c1;
    let bot = c2;
    let extra = '';
    let headExtra = '';
    if (id === 'ramwong') {
      if (male) { top = '#f4f1ec'; bot = ['#3b5bd6', '#7a1f1a', '#2f9e44'][(h >>> 9) % 3]; }
    } else if (id === 'pageant') {
      kind = male ? 'pants' : 'gown';
      if (male) { top = '#1a1a22'; bot = '#1a1a22'; }
      else bot = top;
      style = male ? 'short' : ['long', 'bun'][(h >>> 16) % 2];
      extra = `<path d="M-7 -52 L8 -35" stroke="${male ? '#ffd166' : '#ffffff'}" stroke-width="4"/><rect x="-6" y="-46" width="12" height="9" rx="2" fill="#fff"/><text x="0" y="-39" font-size="7.5" font-weight="700" text-anchor="middle" fill="#1d1714" font-family="Kanit,sans-serif">${(h % 29) + 1}</text>`;
    } else if (id === 'molam') {
      bot = male ? '#1a1a22' : c1;
      style = male ? 'short' : 'feather';
      extra = Array.from({ length: 8 }, (_, i) => `<circle cx="${(((h >>> i) % 14) - 7)}" cy="${-50 + ((h >>> (i + 3)) % 14)}" r=".9" fill="#fff"/>`).join('');
    } else if (id === 'disco') {
      kind = 'flare';
      style = ['afro', 'long', 'afro', 'short'][(h >>> 16) % 4];
    }
    // ขา/กระโปรง
    if (kind === 'skirt') {
      o.push(`<path d="M-6 -2 l-1 -12 M6 -2 l1 -12" stroke="${sk}" stroke-width="4" stroke-linecap="round"/><path d="M-17 -12 Q0 -6 17 -12 L8 -34 L-8 -34 Z" fill="${bot}"/><path d="M-14 -16 Q0 -11 14 -16" stroke="#ffd166" stroke-width="1.8" fill="none"/>`);
    } else if (kind === 'gown') {
      o.push(`<path d="M-15 -1 Q0 3 15 -1 L8 -36 L-8 -36 Z" fill="${bot}"/><path d="M-4 -34 L-10 -2" stroke="#fff" stroke-width="1.2" opacity=".4"/>`);
    } else if (kind === 'flare') {
      o.push(`<path d="M-9 -34 L-3 -34 L-2 -10 L-10 -1 L-15 -1 L-11 -12z M9 -34 L3 -34 L2 -10 L10 -1 L15 -1 L11 -12z" fill="${bot}"/><path d="M-15 -1 h6 M9 -1 h6" stroke="#1a1a22" stroke-width="3"/>`);
    } else {
      o.push(`<path d="M-8 -34 h16 l-1 32 h-6 l-1 -22 l-1 22 h-6z" fill="${bot}"/><path d="M-9 -1 h7 M2 -1 h7" stroke="#2a1f1a" stroke-width="3"/>`);
    }
    // ลำตัว (สีเสื้อเปลี่ยนตามทีมได้ผ่าน --top)
    o.push(`<path d="M-9 -34 Q-10 -48 -6 -52 L6 -52 Q10 -48 9 -34 Z" style="fill:var(--top,${top})"/>`, extra);
    // แขน (หมุนรอบไหล่ด้วย CSS)
    o.push(`<g class="al"><path d="M-6 -50 q-10 4 -12 -6 q-1 -6 -5 -10" stroke="${sk}" stroke-width="3.6" fill="none" stroke-linecap="round"/></g>`);
    o.push(`<g class="ar"><path d="M6 -50 q10 -2 13 6 q2 5 7 4" stroke="${sk}" stroke-width="3.6" fill="none" stroke-linecap="round"/></g>`);
    // หัว
    o.push(`<rect x="-2.5" y="-56" width="5" height="5" fill="${sk}"/><circle cx="0" cy="-63" r="9" fill="${sk}"/>`);
    if (style === 'bun') o.push(`<path d="M-9 -63 q0 -11 9 -11 q9 0 9 11 q-3 -6 -9 -6 q-6 0 -9 6z" fill="${hr}"/><circle cx="0" cy="-74" r="4.5" fill="${hr}"/><circle cx="5" cy="-73" r="2.6" fill="${id === 'ramwong' ? '#ffffff' : c2}"/>`);
    else if (style === 'long') o.push(`<path d="M-10 -62 q-1 -13 10 -13 q11 0 10 13 l1 14 q-4 -3 -4 -12 q-6 -6 -7 -6 q-1 0 -7 6 q0 9 -4 12z" fill="${hr}"/>`);
    else if (style === 'afro') o.push(`<circle cx="0" cy="-68" r="13" fill="${hr}"/><circle cx="0" cy="-62" r="8.6" fill="${sk}"/>`);
    else if (style === 'feather') {
      o.push(`<path d="M-9 -63 q0 -11 9 -11 q9 0 9 11 q-3 -6 -9 -6 q-6 0 -9 6z" fill="${hr}"/>`);
      headExtra = `<g class="plume">${[[-10, c2], [-4, '#ffd166'], [3, c2], [9, '#7cc6f2']].map(([dx, c]) => `<path d="M0 -72 q${dx} -14 ${Math.round(dx * 1.4)} -26" stroke="${c}" stroke-width="4" fill="none" stroke-linecap="round"/>`).join('')}<path d="M-9 -70 h18" stroke="#ffd166" stroke-width="2.4"/></g>`;
    } else o.push(`<path d="M-9 -63 q0 -12 9 -12 q9 0 9 12 q-2 -5 -9 -6 q-7 1 -9 6z" fill="${hr}"/>`);
    o.push(headExtra);
    const glasses = id === 'disco' && (h >>> 20) % 2 === 0;
    o.push(glasses ? '<path d="M-6 -64 h4 M2 -64 h4" stroke="#1a1a22" stroke-width="3.4" stroke-linecap="round"/>' : '<circle cx="-3.2" cy="-63" r="1.1" fill="#2a1f1a"/><circle cx="3.2" cy="-63" r="1.1" fill="#2a1f1a"/>');
    o.push('<path d="M-2.4 -59.5 q2.4 2.4 4.8 0" stroke="#b5503a" stroke-width="1" fill="none"/><circle cx="-5.5" cy="-60.5" r="1.6" fill="#ff8fa3" opacity=".5"/><circle cx="5.5" cy="-60.5" r="1.6" fill="#ff8fa3" opacity=".5"/>');
    return `<svg viewBox="-30 -100 60 104" width="104" height="180" preserveAspectRatio="xMidYMax meet" style="overflow:visible;display:block">${o.join('')}</svg>`;
  }

  // ---- ภาพ SVG → แคนวาส (ครั้งเดียว)
  const IMG = {};
  function raster(name) {
    if (IMG[name]) return IMG[name];
    const rec = (IMG[name] = { cv: null, p: null });
    rec.p = new Promise((res) => {
      const im = new Image();
      im.onload = () => {
        const cv = document.createElement('canvas');
        cv.width = 1080;
        cv.height = 1920;
        cv.getContext('2d').drawImage(im, 0, 0, 1080, 1920);
        rec.cv = cv;
        res(cv);
      };
      im.onerror = () => res(null);
      im.src = 'stages/' + name + '.svg';
    });
    return rec;
  }

  window.makeDanceTheme = function makeDanceTheme(id) {
    const L = LAYOUT[id] || LAYOUT.ramwong;
    let el = null;
    let API = null;
    const st = { hype: 0, flash: 0, spot: [], sweep: 0 };

    if (window.SceneLevels?.themes) {
      window.SceneLevels.themes[id] = {
        names: { 2: 'ไฟประดับเพิ่มทั้งงาน', 3: 'ฉากเต็มรูปแบบ + ลูกโป่ง' },
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
      get bpm() {
        return cfgD().bpm || 120;
      },
      fanH: FAN_H,
      rows: L.rows,
      get css() {
        return css();
      },
      fanSvg(_color, fid) {
        return dancerSvg(id, fid);
      },
      init(api) {
        API = api;
        el = document.createElement('div');
        el.className = 'dance-hud';
        document.getElementById('ui').appendChild(el);
        render(api);
        Promise.all([raster(id + '-bg').p, raster(id + '-front').p, raster(id + '-l2').p, raster(id + '-l3').p]).then(() => API?.redrawStatic?.());
        clearInterval(T._tick);
        T._tick = setInterval(count, 1000);
      },
      drawStatic(c) {
        const im = IMG[id + '-bg']?.cv;
        if (im) return c.drawImage(im, 0, 0);
        c.fillStyle = '#1a1028';
        c.fillRect(0, 0, 1080, 1920);
      },
      drawBg(c, t) {
        anim(c, t / 1000);
      },
      drawFx(c, t) {
        const fr = IMG[id + '-front']?.cv;
        if (fr) c.drawImage(fr, 0, 0);
        front(c, t / 1000);
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
      onChat(d, api) {
        // คอมเมนต์ = ขึ้นเวที (ประกวด: ต้องพิมพ์ "ประกวด")
        if (!cfgD().pageant) toStage(d.id, api);
      },
      onEvent(d, api) {
        if (d.type === 'cmd') return onCmd(d, api);
        if (d.type === 'goal') {
          api.toast(`🎯 ${d.key === 'coins' ? 'เพชร' : 'ใจ'}ครบ! → ${d.reward}`, 'big');
          hypeMode(api, 8);
          api.speak(`เป้าหมายครบแล้ว ${d.reward}`);
        }
        if (d.type === 'hud') updateZones(d);
      },
      onTop(list) {
        renderTop(list);
        // ประกวด: อันดับ 1 (คะแนนโหวต = ของขวัญ) สวมมงกุฎ
        if (cfgD().pageant && list?.[0]) API?.bump?.(list[0].id, 'crowned', 3600_000);
      },
    };

    // ================================================================ เหตุการณ์
    function toStage(fid, api) {
      if (!fid) return;
      api.moveToRows?.(fid, L.stage);
    }
    function solo(api, fid, ms = 3200) {
      api.bump(fid, 'solo', ms);
    }
    function walk(api, fid) {
      const p = api.fanPos(fid);
      if (!p) return;
      const e = p.f.el;
      e.style.setProperty('--dx', 540 - p.x + 'px');
      e.style.setProperty('--dy', 1500 - p.feetY + 'px');
      e.style.zIndex = 2600;
      api.bump(fid, 'walk', 4200);
      setTimeout(() => (e.style.zIndex = Math.round(p.feetY)), 4300);
      for (let i = 0; i < 3; i++) setTimeout(() => (st.flash = 1), 1500 + i * 380);
    }
    function onCmd(d, api) {
      const p = api.fanPos(d.id);
      if (d.kind === 'dance') {
        toStage(d.id, api);
        setTimeout(() => (cfgD().pageant ? walk(api, d.id) : solo(api, d.id)), 1700);
      } else if (d.zone === 'pink' || d.zone === 'blue') {
        const f = p?.f;
        if (f) {
          f.el.classList.toggle('team-a', d.zone === 'pink');
          f.el.classList.toggle('team-b', d.zone === 'blue');
          f.el.style.setProperty('--top', d.zone === 'pink' ? '#ff4fd8' : '#2dd4ff');
        }
        toStage(d.id, api);
      } else if (d.cmd === 'ซิ่ง') {
        hypeMode(api, 4);
      }
      if (p) emoji(api, d.emoji || '✨', p.x, p.y - 40);
    }
    function emoji(api, e, x, y) {
      api.spawn({
        x, y, vy: -170, max: 1.4, size: 54,
        draw(c, q) {
          window.drawEmoji(c, e, q.x, q.y - q.size * 0.35, q.size); // เส้นฐานตัวอักษร → กึ่งกลาง
        },
      });
    }
    function hypeMode(api, sec) {
      api.root?.classList.add('dance-hype');
      clearTimeout(hypeMode._t);
      hypeMode._t = setTimeout(() => api.root?.classList.remove('dance-hype'), sec * 1000);
      api.crowdWave?.('wave');
      st.hype = sec;
    }
    const lastGift = new Map();
    function gift(fx, user, n, label, api) {
      const tier = Number(String(fx.kind).slice(2)) || 1;
      const key = (user?.id || '?') + '|' + tier;
      const fresh = performance.now() - (lastGift.get(key) || 0) > 2500;
      lastGift.set(key, performance.now());
      if (!fresh) return;
      if (user?.id) toStage(user.id, api);
      const o = api.originFor(user);
      if (tier === 1) {
        api.spot(user, { rgb: '255,240,200', fallback: { x: 540, y: 1300 } });
        confetti(api, o.x, o.y - 160, 16);
        api.sfx.chime?.(784);
      } else if (tier === 2) {
        api.spot(user, { rgb: '255,220,255', fallback: { x: 540, y: 1300 } });
        setTimeout(() => (cfgD().pageant ? walk(api, user?.id) : solo(api, user?.id, 4000)), 1600);
        confetti(api, o.x, o.y - 160, 26);
        api.flash('#ffffff', 500, 0.25);
        api.sfx.pop?.();
      } else {
        api.bigShow(user, fx.label);
        api.fireworks(7);
        hypeMode(api, 9);
        if (cfgD().pageant && user?.id) api.bump(user.id, 'crowned', 3600_000);
        for (let i = 0; i < 5; i++) setTimeout(() => confetti(api, api.rand(100, 980), 300, 22), i * 500);
      }
      api.toast(`${tier === 3 ? '🎆' : '🌹'} ${user?.name || 'ทุกคน'} → ${fx.label}`, tier === 3 ? 'big' : '');
    }
    const CONF = ['#ff4f7b', '#ffd166', '#5de0ff', '#5fd068', '#ffffff', '#b07cff'];
    function confetti(api, x, y, k) {
      for (let i = 0; i < k; i++) {
        const col = CONF[i % CONF.length];
        api.spawn({
          x, y, vx: api.rand(-320, 320), vy: api.rand(-520, -160), g: 520, drag: 0.6, max: 2.2, vr: api.rand(-8, 8), size: api.rand(8, 13),
          draw(c, p) {
            c.save();
            c.translate(p.x, p.y);
            c.rotate(p.rot);
            c.fillStyle = col;
            c.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
            c.restore();
          },
        });
      }
    }

    // ================================================================ ไฟ/ของเคลื่อนไหว (ไม่สร้างออบเจกต์ใหม่ต่อเฟรม)
    const hs = (i, k) => {
      const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
      return s - Math.floor(s);
    };
    const beatT = (ts) => (ts * T.bpm) / 60;
    function anim(c, ts) {
      const b = beatT(ts);
      const pulse = Math.pow(1 - (b % 1), 2);
      if (id === 'ramwong') {
        // พลุวนเป็นจังหวะ (3 ลูก)
        for (let k = 0; k < 3; k++) {
          const ph = (ts * 0.32 + k / 3) % 1;
          if (ph > 0.55) continue;
          const cx = 160 + hs(k, Math.floor(ts * 0.32 + k / 3)) * 760;
          const cy = 380 + hs(k + 9, Math.floor(ts * 0.32 + k / 3)) * 260;
          const R = 30 + ph * 220;
          c.globalAlpha = Math.max(0, 1 - ph / 0.55);
          c.strokeStyle = CONF[k % CONF.length];
          c.lineWidth = 3;
          c.beginPath();
          for (let i = 0; i < 18; i++) {
            const a = (i * Math.PI) / 9;
            c.moveTo(cx + Math.cos(a) * R * 0.55, cy + Math.sin(a) * R * 0.55);
            c.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R + ph * 30);
          }
          c.stroke();
        }
        c.globalAlpha = 1;
      } else if (id === 'pageant') {
        // สปอตไลต์ส่ายไปมา 2 ดวง
        for (let k = 0; k < 2; k++) {
          const x0 = k ? 840 : 240;
          const sw = Math.sin(ts * 0.7 + k * 2) * 260;
          const g = c.createLinearGradient(x0, 500, x0 + sw, 1500);
          g.addColorStop(0, 'rgba(255,255,255,.28)');
          g.addColorStop(1, 'rgba(255,255,255,0)');
          c.fillStyle = g;
          c.beginPath();
          c.moveTo(x0 - 10, 500);
          c.lineTo(x0 + sw - 110, 1500);
          c.lineTo(x0 + sw + 110, 1500);
          c.lineTo(x0 + 10, 500);
          c.fill();
        }
      } else if (id === 'molam') {
        // จอ LED เปลี่ยนสีตามจังหวะ + เลเซอร์กวาด
        c.globalAlpha = 0.18 + pulse * 0.22;
        c.fillStyle = `hsl(${(ts * 60) % 360},100%,60%)`;
        c.fillRect(140, 560, 800, 460);
        c.globalAlpha = 0.75;
        c.lineWidth = 3;
        const LC = ['#5dff8a', '#ff2d8a', '#2dd4ff'];
        for (let k = 0; k < 6; k++) {
          const ox = [80, 1000, 540][k % 3];
          const a = Math.sin(ts * (0.6 + k * 0.13) + k) * 0.9 + Math.PI / 2;
          c.strokeStyle = LC[k % 3];
          c.beginPath();
          c.moveTo(ox, 510);
          c.lineTo(ox + Math.cos(a) * 1400, 510 + Math.sin(a) * 1400);
          c.stroke();
        }
        c.globalAlpha = 1;
      } else if (id === 'disco') {
        // ฟลอร์ไฟเปลี่ยนสีทุกจังหวะ
        const cols = ['#ff2d8a', '#2dd4ff', '#ffb020', '#5dff8a', '#b07cff', '#ff6b3c'];
        const rows = [[600, 640], [640, 690], [690, 750], [750, 820], [820, 900], [900, 960]];
        const bi = Math.floor(b);
        for (let ri = 0; ri < rows.length; ri++) {
          const [y0, y1] = rows[ri];
          const k0 = 1 - ((y0 - 600) / 600) * 0.6;
          const k1 = 1 - ((y1 - 600) / 600) * 0.6;
          for (let ci = 0; ci < 8; ci++) {
            if ((ri + ci + bi) % 3) continue;
            const xa0 = 270 + ((ci - 4) * 60) / k0 * 0.62;
            const xb0 = 270 + ((ci - 3) * 60) / k0 * 0.62;
            const xa1 = 270 + ((ci - 4) * 60) / k1 * 0.62;
            const xb1 = 270 + ((ci - 3) * 60) / k1 * 0.62;
            c.globalAlpha = 0.25 + pulse * 0.4;
            c.fillStyle = cols[(ri * 3 + ci * 5 + bi) % 6];
            c.beginPath();
            c.moveTo(xa0 * 2, y0 * 2);
            c.lineTo(xb0 * 2, y0 * 2);
            c.lineTo(xb1 * 2, y1 * 2);
            c.lineTo(xa1 * 2, y1 * 2);
            c.fill();
          }
        }
        // จุดแสงจากลูกบอลกระจก
        c.fillStyle = '#ffffff';
        for (let i = 0; i < 46; i++) {
          const a = hs(i, 1) * Math.PI * 2 + ts * 0.5;
          const r = 200 + hs(i, 2) * 900;
          const x = 540 + Math.cos(a) * r;
          const y = 592 + Math.abs(Math.sin(a)) * r * 0.9;
          if (x < 0 || x > 1080 || y > 1900) continue;
          c.globalAlpha = 0.5 + 0.5 * hs(i, 3);
          c.beginPath();
          c.arc(x, y, 3 + hs(i, 4) * 3, 0, Math.PI * 2);
          c.fill();
        }
        c.globalAlpha = 1;
      }
    }
    function front(c, ts) {
      // กระดาษสีโปรยเบา ๆ + แฟลชกล้อง (ประกวด) + โหมดมันส์
      const n = st.hype > 0 || document.getElementById('root')?.classList.contains('dance-hype') ? 30 : 12;
      for (let i = 0; i < n; i++) {
        const x = (hs(i, 1) * 1080 + Math.sin(ts + i) * 40 + 1080) % 1080;
        const y = ((ts * (60 + hs(i, 2) * 50) + hs(i, 3) * 1400) % 1400) + 420;
        c.globalAlpha = 0.8;
        c.fillStyle = CONF[i % CONF.length];
        c.save();
        c.translate(x, y);
        c.rotate(ts * 2 + i);
        c.fillRect(-6, -3, 12, 6);
        c.restore();
      }
      c.globalAlpha = 1;
      if (st.flash > 0) {
        st.flash = Math.max(0, st.flash - 0.08);
        c.globalAlpha = st.flash * 0.28;
        c.fillStyle = '#ffffff';
        c.fillRect(0, 0, 1080, 1920);
        c.globalAlpha = 1;
      }
    }

    // ================================================================ แผงบนจอ
    function css() {
      const p = hud().palette || {};
      const r = `#root.theme-${id}`;
      const D = DANCE_CSS[id] || DANCE_CSS.ramwong;
      return `
        ${r} { --glass: ${p.panel}; --panel-border: rgba(255,255,255,.2); --heading: ${p.soft}; --toast-bg: ${p.accent}; --toast-glow: ${p.accent};
          --big-grad: linear-gradient(180deg, #ffffff, ${p.accent2}); --big-bg: radial-gradient(circle at 50% 45%, rgba(0,0,0,.2), rgba(0,0,0,.66) 70%);
          --card-bg: ${p.panel}; --card-top: 700px; --team-top: 640px; --fortune-top: 720px; }
        ${r} #header, ${r} #songPanel, ${r} #giftPanel, ${r} #topPanel { display: none !important; }
        ${r} #hype { left: 372px; width: 336px; top: 214px; padding: 10px 14px 12px; border-radius: 22px; background: ${p.panel}; border: 2px solid rgba(255,255,255,.18); }
        ${r} #hype .label { font-size: 21px; }
        ${r} #hype .bar { height: 16px; }
        ${r} #feed { top: 470px !important; left: 24px; width: 420px; }
        ${r} #toasts { top: 560px; }
        ${r} .fan .body { left: -52px; width: 104px; height: 180px; animation: ${D.body}; animation-delay: var(--ph, 0s); }
        ${r} .fan .body svg { width: 104px; height: 180px; }
        ${r} .fan .al { transform-origin: -6px -50px; animation: ${D.al}; animation-delay: var(--ph, 0s); }
        ${r} .fan .ar { transform-origin: 6px -50px; animation: ${D.ar}; animation-delay: var(--ph, 0s); }
        ${r} .fan .plume { transform-origin: 0 -72px; animation: dPlume calc(var(--beat) * 1) ease-in-out infinite alternate; }
        ${r} .fan.solo .body { animation: dSolo calc(var(--beat) * 2) ease-in-out 3 !important; }
        ${r} .fan.walk { animation: dWalk 4s ease-in-out 1; }
        ${r}.dance-hype .fan .body { animation-duration: calc(var(--beat) * 0.5) !important; }
        ${r}.dance-hype .fan .al, ${r}.dance-hype .fan .ar { animation-duration: calc(var(--beat) * 0.5) !important; }
        ${r} .fan.enter .body { animation: walkIn 1.4s ease-out both !important; }
        ${D.keys}
        @keyframes dPlume { from { transform: rotate(-8deg); } to { transform: rotate(8deg); } }
        @keyframes dSolo { 0% { transform: none; } 25% { transform: translateY(-40px) rotate(-12deg); } 50% { transform: translateY(0) scaleX(-1); } 75% { transform: translateY(-40px) rotate(12deg) scaleX(-1); } 100% { transform: none; } }
        @keyframes dWalk { 0% { transform: none; } 35% { transform: translate(var(--dx), var(--dy)) scale(1.3); } 50% { transform: translate(var(--dx), var(--dy)) scale(1.3) rotate(-4deg); } 65% { transform: translate(var(--dx), var(--dy)) scale(1.3); } 100% { transform: none; } }

        .dance-hud { position: absolute; inset: 0; pointer-events: none; font-family: 'Kanit', 'Leelawadee UI', sans-serif; color: #fff; z-index: 3; }
        .dance-hud * { box-sizing: border-box; }
        .dance-hud .hp { background: ${p.panel}; border: 2px solid rgba(255,255,255,.2); border-radius: 30px; box-shadow: 0 10px 28px rgba(0,0,0,.35); }
        .dance-hud .dttl { position: absolute; left: 50%; top: 36px; transform: translateX(-50%); padding: 16px 52px 20px; border-radius: 44px; text-align: center; white-space: nowrap;
          background: linear-gradient(90deg, ${p.accent}, ${p.accent2}); box-shadow: 0 16px 40px rgba(0,0,0,.4); max-width: 1000px; }
        .dance-hud .dttl b { display: block; font-size: 58px; line-height: 1.05; font-weight: 800; overflow: hidden; text-overflow: ellipsis; }
        .dance-hud .dttl small { display: block; font-size: 26px; font-weight: 500; opacity: .95; overflow: hidden; text-overflow: ellipsis; }
        .dance-hud h4 { margin: 0; font-size: 24px; line-height: 1.3; color: ${p.soft}; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .dance-hud .dcnt { position: absolute; left: 24px; top: 214px; width: 332px; padding: 16px 20px; }
        .dance-hud .dcnt .row { display: flex; gap: 10px; margin-top: 8px; }
        .dance-hud .dcnt .row div { flex: 1; padding: 8px 10px; border-radius: 16px; background: rgba(255,255,255,.1); text-align: center; }
        .dance-hud .dcnt .row b { display: block; font-size: 38px; line-height: 1.1; color: #ffd166; }
        .dance-hud .dcnt .row small { font-size: 19px; opacity: .85; }
        .dance-hud .dcnt .zn { margin-top: 8px; font-size: 21px; display: none; }
        .dance-hud .dcnt .zn.on { display: flex; justify-content: space-between; }
        .dance-hud .dtop { position: absolute; right: 24px; top: 214px; width: 332px; padding: 16px 20px; }
        .dance-hud .dtop .r { display: flex; justify-content: space-between; gap: 8px; margin-top: 6px; font-size: 23px; }
        .dance-hud .dtop .r span:first-child { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .dance-hud .dtop .r b { color: #ffd166; margin-right: 6px; }
        .dance-hud .dtop .empty { margin-top: 8px; font-size: 20px; opacity: .8; }
        .dance-hud .dbot { position: absolute; left: 24px; right: 24px; bottom: 22px; padding: 16px 22px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px 22px; }
        .dance-hud .dbot div { display: flex; gap: 12px; align-items: center; font-size: 23px; line-height: 1.25; }
        .dance-hud .dbot i { font-style: normal; font-size: 32px; flex: none; }
        .dance-hud .dbot b { color: ${p.soft}; }
      `;
    }

    function render(api) {
      const m = meta();
      const t = api.t || {};
      const D = cfgD();
      const cmds = hud().cmds || [];
      const g = D.gifts || [];
      const rows = [
        ['💬', D.pageant ? `พิมพ์ “${cmds[0]?.c}”` : 'คอมเมนต์', D.pageant ? cmds[0]?.a : `ขึ้น${D.count?.[0] || 'เวที'} มีชื่อ + รูปโปรไฟล์`],
        [cmds[0]?.emoji || '💃', `พิมพ์ “${(D.pageant ? cmds[1] : cmds.find((c) => c.kind === 'dance'))?.c || ''}”`, (D.pageant ? cmds[1] : cmds.find((c) => c.kind === 'dance'))?.a || ''],
        [window.giftIconHtml?.('Rose', '🌹') || '🌹', 'ของขวัญ', g[0]], // รูปกุหลาบจริงจาก TikTok ถ้ามี
        ['🎆', 'ของขวัญใหญ่ 100+', g[2]],
      ];
      if (id === 'disco') rows[1] = ['🩷', 'พิมพ์ “ชมพู/ฟ้า”', 'แข่งเต้นสองทีม'];
      el.innerHTML = `
        <div class="dttl"><b>${esc(t.title || m.defaults?.title)}</b><small>${esc(t.subtitle || m.defaults?.subtitle || '')}</small></div>
        <div class="dcnt hp"><h4>🎭 ใครอยู่บนเวทีบ้าง</h4><div class="row"><div><b class="c1">0</b><small>${esc(D.count?.[0])}</small></div><div><b class="c2">0</b><small>${esc(D.count?.[1])}</small></div></div>
          <div class="zn${id === 'disco' ? ' on' : ''}"><span>🩷 ทีมชมพู <b class="zp">0</b></span><span>🩵 ทีมฟ้า <b class="zb">0</b></span></div></div>
        <div class="dtop hp"><h4>🏆 ${esc(D.pageant ? 'คะแนนโหวตสูงสุด' : 'เสี่ยใหญ่ประจำไลฟ์')}</h4><div class="rows"><div class="empty">ส่งของขวัญชิ้นแรก ขึ้นอันดับเลย!</div></div></div>
        <div class="dbot hp">${rows.map(([e, k, v]) => `<div><i>${e}</i><span><b>${esc(k)}</b> → ${esc(v)}</span></div>`).join('')}</div>`;
      count();
    }
    function count() {
      const api = API;
      if (!el || !api?.fans) return;
      let a = 0;
      let b = 0;
      for (const f of api.fans.values()) (f.slot && L.stage.includes(f.slot.row) ? a++ : b++);
      el.querySelector('.c1').textContent = String(a);
      el.querySelector('.c2').textContent = String(b);
    }
    function renderTop(list) {
      const rows = el?.querySelector('.dtop .rows');
      if (!rows) return;
      const top = (list || []).slice(0, 3);
      rows.innerHTML = top.length
        ? top.map((u, i) => `<div class="r"><span><b>${['👑', '2', '3'][i]}</b>${esc(u.name)}</span><span>💎 ${Number(u.diamonds || 0).toLocaleString('en-US')}</span></div>`).join('')
        : '<div class="empty">ส่งของขวัญชิ้นแรก ขึ้นอันดับเลย!</div>';
    }
    function updateZones(d) {
      if (id !== 'disco' || !el) return;
      el.querySelector('.zp').textContent = String(d.zones?.pink || 0);
      el.querySelector('.zb').textContent = String(d.zones?.blue || 0);
    }

    return T;
  };

  // ---- ท่าเต้นของแต่ละเวที (ตาม --beat = 1 จังหวะของเพลง)
  const DANCE_CSS = {
    ramwong: {
      body: 'dRam calc(var(--beat) * 2) ease-in-out infinite alternate',
      al: 'dRamL calc(var(--beat) * 2) ease-in-out infinite alternate',
      ar: 'dRamR calc(var(--beat) * 2) ease-in-out infinite alternate',
      keys: `@keyframes dRam { from { transform: translateX(-5px) rotate(-4deg); } 50% { transform: translateX(0) translateY(-5px); } to { transform: translateX(5px) rotate(4deg); } }
        @keyframes dRamL { from { transform: rotate(-14deg); } to { transform: rotate(12deg); } }
        @keyframes dRamR { from { transform: rotate(12deg); } to { transform: rotate(-14deg); } }`,
    },
    pageant: {
      body: 'dPg calc(var(--beat) * 2) ease-in-out infinite alternate',
      al: 'dPgL calc(var(--beat) * 4) ease-in-out infinite alternate',
      ar: 'dPgR calc(var(--beat) * 2) ease-in-out infinite alternate',
      keys: `@keyframes dPg { from { transform: rotate(-2deg); } to { transform: rotate(2deg) translateY(-3px); } }
        @keyframes dPgL { from { transform: rotate(0); } to { transform: rotate(-30deg); } }
        @keyframes dPgR { from { transform: rotate(10deg); } to { transform: rotate(-70deg); } }`,
    },
    molam: {
      body: 'dMl var(--beat) ease-in-out infinite alternate',
      al: 'dMlL var(--beat) ease-in-out infinite alternate',
      ar: 'dMlR var(--beat) ease-in-out infinite alternate',
      keys: `@keyframes dMl { from { transform: translateY(0) rotate(-5deg); } to { transform: translateY(-14px) rotate(5deg); } }
        @keyframes dMlL { from { transform: rotate(30deg); } to { transform: rotate(-60deg); } }
        @keyframes dMlR { from { transform: rotate(-30deg); } to { transform: rotate(60deg); } }`,
    },
    disco: {
      body: 'dDs calc(var(--beat) * 2) ease-in-out infinite alternate',
      al: 'dDsL var(--beat) ease-in-out infinite alternate',
      ar: 'dDsR calc(var(--beat) * 2) ease-in-out infinite alternate',
      keys: `@keyframes dDs { 0% { transform: rotate(-7deg) translateY(0); } 50% { transform: rotate(0) translateY(-10px); } 100% { transform: rotate(7deg) translateY(0); } }
        @keyframes dDsL { from { transform: rotate(10deg); } to { transform: rotate(-20deg); } }
        @keyframes dDsR { from { transform: rotate(20deg); } to { transform: rotate(-95deg); } }`,
    },
  };
})();
