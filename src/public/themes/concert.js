/* ธีมคอนเสิร์ต — เวที ไฟ เลเซอร์ คนดูถือแท่งไฟ */
(() => {
  const PALETTE = ['#ff4fa3', '#39d5ff', '#ffd23f', '#8b5cff', '#3dff9e', '#ff7b39', '#ff3b5c', '#4fffe6'];
  const HAIR = ['#1b1210', '#2b1a12', '#3a2416', '#0f0f14', '#5a3a22', '#c27a3a', '#d8d0ff', '#ff7eb6', '#7a4cff'];
  const SKIN = ['#f1c7a3', '#e0ac85', '#c98e66', '#f7d8bd'];
  const LED = { x: 290, y: 250, w: 500, h: 290 };
  const STAGE = { backY: 640, backL: 170, backR: 910, frontY: 990, frontL: 30, frontR: 1050, lip: 40 };
  const LAMPS = [70, 200, 330, 460, 620, 750, 880, 1010].map((x, i) => ({ x, y: 246, ph: i * 0.7 }));
  const silhouettes = [];
  const lasers = [];

  const theme = {
    bpm: 112,
    fanH: 116,
    css: `
      .theme-concert .fan .arm { transform-origin: 47px 48px; animation: swing calc(var(--beat) * 2) ease-in-out infinite alternate; animation-delay: var(--ph, 0s); }
      .theme-concert .fan.wave .arm { animation: armUp 0.7s ease-out 1; animation-delay: var(--wd, 0s); }
      @keyframes swing { from { transform: rotate(-16deg); } to { transform: rotate(14deg); } }
      @keyframes armUp { 0% { transform: rotate(0); } 40% { transform: rotate(-40deg); } 100% { transform: rotate(0); } }
    `,
    rows: [
      { y: 1110, s: 0.6, n: 7, x0: 210, x1: 870, vip: true },
      { y: 1255, s: 0.72, n: 9, x0: 70, x1: 1010 },
      { y: 1415, s: 0.84, n: 9, x0: 70, x1: 1010 },
      { y: 1590, s: 0.96, n: 8, x0: 80, x1: 1000 },
      { y: 1770, s: 1.08, n: 7, x0: 90, x1: 990 },
    ],

    fanSvg(color, id, api) {
      const h = api.hash(id);
      const hair = HAIR[h % HAIR.length];
      const skin = SKIN[(h >> 4) % SKIN.length];
      const dark = api.shade(color, -60);
      const longHair = (h >> 7) % 3 === 0;
      return `<svg viewBox="0 0 70 116" width="70" height="116" overflow="visible">
        <ellipse cx="35" cy="113" rx="22" ry="4" fill="rgba(0,0,0,.5)"/>
        <rect x="23" y="84" width="10" height="28" rx="4" fill="#1d1830"/>
        <rect x="37" y="84" width="10" height="28" rx="4" fill="#1d1830"/>
        <line x1="20" y1="50" x2="15" y2="80" stroke="${dark}" stroke-width="9" stroke-linecap="round"/>
        <circle cx="15" cy="81" r="4.2" fill="${skin}"/>
        <path d="M17 51 Q17 42 26 41 L44 41 Q53 42 53 51 L51 88 Q35 92 19 88 Z" fill="${color}"/>
        <path d="M17 51 Q17 42 26 41 L44 41 Q53 42 53 51 L52.5 58 Q35 62 17.5 58 Z" fill="rgba(255,255,255,.12)"/>
        <text x="35" y="76" text-anchor="middle" font-size="13" font-weight="800" fill="rgba(255,255,255,.55)" font-family="Kanit,sans-serif">${(h % 99) + 1}</text>
        <rect x="30" y="34" width="10" height="9" rx="3" fill="${skin}"/>
        <ellipse cx="20.5" cy="26" rx="2.6" ry="4" fill="${skin}"/>
        <ellipse cx="49.5" cy="26" rx="2.6" ry="4" fill="${skin}"/>
        ${longHair ? `<path d="M20 22 Q20 8 35 8 Q50 8 50 22 L52 46 Q35 50 18 46 Z" fill="${hair}"/>` : ''}
        <circle cx="35" cy="23" r="15" fill="${hair}"/>
        <path d="M24 14 Q35 6 46 14" stroke="rgba(255,255,255,.18)" stroke-width="3" fill="none" stroke-linecap="round"/>
        <g class="arm">
          <line x1="47" y1="48" x2="55" y2="20" stroke="${dark}" stroke-width="9" stroke-linecap="round"/>
          <line x1="56" y1="20" x2="60" y2="-12" style="stroke:var(--sc)" stroke-width="18" stroke-linecap="round" opacity=".28"/>
          <line x1="56" y1="20" x2="60" y2="-12" style="stroke:var(--sc)" stroke-width="7" stroke-linecap="round"/>
          <line x1="56.4" y1="16" x2="59.6" y2="-10" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".9"/>
          <circle cx="55.5" cy="20" r="4.6" fill="${skin}"/>
        </g>
      </svg>`;
    },

    init(api) {
      const { rand, pick } = api;
      const rows = [1060, 1150, 1240, 1330, 1430, 1530, 1640, 1750, 1860];
      rows.forEach((y, ri) => {
        const s = 0.45 + ri * 0.085;
        const n = Math.round(14 - ri * 0.6);
        for (let i = 0; i < n; i++) {
          silhouettes.push({ x: (i + (ri % 2 ? 0.5 : 0) + rand(-0.25, 0.25)) * (1080 / n), y: y + rand(-10, 10), s, ph: rand(0, Math.PI * 2), color: pick(PALETTE), stick: Math.random() < 0.75 });
        }
      });
    },

    drawStatic(c, api) {
      const { rr } = api;
      let g = c.createLinearGradient(0, 0, 0, 1920);
      g.addColorStop(0, '#0d0330');
      g.addColorStop(0.35, '#1a0640');
      g.addColorStop(0.55, '#0c0424');
      g.addColorStop(1, '#040109');
      c.fillStyle = g;
      c.fillRect(0, 0, 1080, 1920);
      c.fillStyle = 'rgba(255,255,255,0.05)';
      for (let y = 250; y < 640; y += 18) for (let x = 10; x < 1080; x += 18) c.fillRect(x, y, 3, 3);
      for (const sx of [180, 830]) {
        c.fillStyle = '#0a0716';
        rr(c, sx, 330, 70, 300, 8);
        c.fill();
        c.strokeStyle = 'rgba(255,255,255,0.12)';
        c.lineWidth = 2;
        c.stroke();
        c.fillStyle = '#171128';
        for (let i = 0; i < 5; i++) {
          c.beginPath();
          c.arc(sx + 35, 365 + i * 56, 22, 0, Math.PI * 2);
          c.fill();
        }
      }
      c.fillStyle = '#05030c';
      rr(c, LED.x - 14, LED.y - 14, LED.w + 28, LED.h + 28, 14);
      c.fill();
      c.strokeStyle = '#3a2f5c';
      c.lineWidth = 4;
      c.stroke();
      g = c.createLinearGradient(0, STAGE.backY, 0, STAGE.frontY);
      g.addColorStop(0, '#1b1236');
      g.addColorStop(1, '#2c1d4f');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(STAGE.backL, STAGE.backY);
      c.lineTo(STAGE.backR, STAGE.backY);
      c.lineTo(STAGE.frontR, STAGE.frontY);
      c.lineTo(STAGE.frontL, STAGE.frontY);
      c.closePath();
      c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.05)';
      c.lineWidth = 2;
      for (let i = 1; i < 10; i++) {
        const t = i / 10;
        c.beginPath();
        c.moveTo(STAGE.backL + (STAGE.backR - STAGE.backL) * t, STAGE.backY);
        c.lineTo(STAGE.frontL + (STAGE.frontR - STAGE.frontL) * t, STAGE.frontY);
        c.stroke();
      }
      c.fillStyle = '#0b0718';
      c.fillRect(STAGE.frontL, STAGE.frontY, STAGE.frontR - STAGE.frontL, STAGE.lip);
      g = c.createLinearGradient(0, 1030, 0, 1920);
      g.addColorStop(0, '#0e0822');
      g.addColorStop(1, '#030107');
      c.fillStyle = g;
      c.fillRect(0, STAGE.frontY + STAGE.lip, 1080, 1920);
      c.strokeStyle = '#4b4566';
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(0, 1062);
      c.lineTo(1080, 1062);
      c.moveTo(0, 1086);
      c.lineTo(1080, 1086);
      c.stroke();
      c.lineWidth = 3;
      for (let x = 10; x < 1080; x += 36) {
        c.beginPath();
        c.moveTo(x, 1062);
        c.lineTo(x, 1092);
        c.stroke();
      }
      c.fillStyle = '#2a2540';
      c.fillRect(0, 214, 1080, 6);
      c.fillRect(0, 236, 1080, 6);
      c.strokeStyle = '#3c3658';
      c.lineWidth = 3;
      c.beginPath();
      for (let x = 0; x < 1080; x += 22) {
        c.moveTo(x, 220);
        c.lineTo(x + 11, 236);
        c.lineTo(x + 22, 220);
      }
      c.stroke();
      for (const l of LAMPS) {
        c.fillStyle = '#16122a';
        rr(c, l.x - 14, l.y - 4, 28, 26, 6);
        c.fill();
      }
    },

    drawBg(c, t, bt, api, abs) {
      drawLED(c, t, bt, api);
      drawPerformer(c, t, bt, api);
      drawStageFront(c, t, bt, api);
      drawBeams(c, abs, bt, api);
      drawSilhouettes(c, abs, bt, api);
    },

    drawFx(c, t, bt, api, abs) {
      for (let i = lasers.length - 1; i >= 0; i--) {
        const L = lasers[i];
        if (abs > L.until) {
          lasers.splice(i, 1);
          continue;
        }
        const tt = (abs - L.start) / 1000;
        const fade = Math.min(1, tt * 3, (L.until - abs) / 400);
        const origins = [[260, 700], [820, 700], [540, 640]];
        c.save();
        c.globalCompositeOperation = 'lighter';
        origins.forEach(([ox, oy], oi) => {
          const col = L.colors[oi % L.colors.length];
          for (let b = 0; b < 6; b++) {
            const an = Math.PI / 2 + Math.sin(tt * 1.6 + oi * 2 + b * 0.45) * 0.9 + (b - 2.5) * 0.12;
            const ex = ox + Math.cos(an) * 1600;
            const ey = oy + Math.sin(an) * 1600;
            c.strokeStyle = api.hexA(col, 0.18 * fade);
            c.lineWidth = 10;
            c.beginPath();
            c.moveTo(ox, oy);
            c.lineTo(ex, ey);
            c.stroke();
            c.strokeStyle = api.hexA(col, 0.9 * fade);
            c.lineWidth = 2.5;
            c.beginPath();
            c.moveTo(ox, oy);
            c.lineTo(ex, ey);
            c.stroke();
          }
          c.fillStyle = api.hexA('#ffffff', fade);
          c.beginPath();
          c.arc(ox, oy, 7, 0, Math.PI * 2);
          c.fill();
        });
        c.restore();
      }
    },

    onConfig() {},

    effects: {
      flowers(user, n, _l, api) {
        const { rand, pick } = api;
        const o = api.originFor(user);
        const qty = Math.min(40, 10 + n * 4);
        for (let i = 0; i < qty; i++) {
          const T = rand(0.9, 1.4);
          const g = 1500;
          const tx = rand(220, 860);
          const ty = rand(740, 975);
          const x0 = o.x + rand(-20, 20);
          const y0 = o.y + rand(-10, 10);
          api.spawn({ type: 'rose', x: x0, y: y0, vx: (tx - x0) / T, vy: (ty - y0 - 0.5 * g * T * T) / T, g, land: T, max: T + rand(2, 3), size: rand(9, 14), color: pick(['#ff3b6b', '#ff5fa2', '#ff1f4b', '#ffb3cf']), rot: rand(0, 6), vr: rand(-6, 6), fadeIn: 0.05 });
        }
        api.sfx.chime(660);
      },
      hearts(user, n, _l, api) {
        const { rand, pick } = api;
        const qty = Math.min(70, 26 + n * 6);
        const o = user && api.fanPos(user.id);
        for (let i = 0; i < qty; i++) {
          const fromFan = o && i < qty / 2;
          api.spawn({ type: 'heart', x: fromFan ? o.x + rand(-40, 40) : rand(40, 1040), y: fromFan ? o.y : rand(1850, 1980), vy: rand(-520, -300), max: rand(2.4, 3.6), size: rand(14, 30), color: pick(['#ff4fa3', '#ff2d6f', '#ff8fc8', '#ff5fd2']), fadeIn: 0.2 });
        }
        api.sfx.chime(880);
      },
      lightstick(user, _n, _l, api) {
        const color = user?.color || api.pick(PALETTE);
        api.setStick(color, 20000);
        api.crowdWave();
        api.flash(color, 700, 0.35);
        api.sfx.cheer();
      },
      confetti(_u, _n, _l, api) {
        const { rand, pick } = api;
        for (const [x, dir] of [[150, 1], [930, -1]]) {
          for (let i = 0; i < 130; i++) {
            const an = -Math.PI / 2 + dir * rand(0.12, 0.55);
            const sp = rand(900, 1500);
            api.spawn({ type: 'confetti', x, y: 1000, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, g: 700, drag: 1.6, max: rand(3.5, 5), size: rand(12, 20), color: pick(PALETTE), rot: rand(0, 6), vr: rand(-8, 8) });
          }
        }
        api.sfx.pop();
      },
      spotlight(user, _n, _l, api) {
        api.spot(user, { sy: 240 });
        api.sfx.chime(520);
      },
      fireworks(_u, n, _l, api) {
        api.fireworks(Math.min(10, 4 + n));
      },
      laser(_u, _n, _l, api) {
        lasers.push({ start: api.now(), until: api.now() + 6500, colors: ['#3dff9e', '#39d5ff', '#ff4fa3'] });
        api.flash('#3dff9e', 400, 0.2);
        api.sfx.zap();
      },
      pyro(_u, _n, _l, api) {
        const { rand } = api;
        const xs = [120, 330, 750, 960];
        api.emitter(3000, (_t, _dt, sec) => {
          if (Math.sin(sec * Math.PI * 1.5) <= -0.3) return;
          for (const x of xs) for (let i = 0; i < 5; i++) api.spawn({ type: 'flame', x: x + rand(-14, 14), y: 990, vx: rand(-50, 50), vy: rand(-1250, -800), drag: 1.2, max: rand(0.55, 0.95), size: rand(26, 44) });
        });
        api.flash('#ff7b00', 900, 0.3);
        api.shake();
        api.sfx.whoosh();
      },
      encore(user, _n, label, api) {
        if (!api.bigShow(user, label)) return;
        const { rand } = api;
        lasers.push({ start: api.now(), until: api.now() + 7500, colors: ['#ffd23f', '#ff4fa3', '#39d5ff'] });
        api.emitter(5000, () => {
          for (let i = 0; i < 3; i++) api.spawn({ type: 'coin', x: rand(0, 1080), y: -20, vy: rand(250, 480), vx: rand(-30, 30), max: 5, size: rand(9, 16) });
        });
        api.fireworks(6);
        setTimeout(() => theme.effects.confetti(null, 1, '', api), 600);
        setTimeout(() => theme.effects.pyro(null, 1, '', api), 1200);
        api.crowdWave();
        api.flash('#ffd23f', 900, 0.45);
        api.sfx.fanfare();
        api.sfx.cheer();
      },
    },
  };

  // ---------------- drawing helpers
  function drawLED(c, t, bt, api) {
    const { x, y, w, h } = LED;
    const T = api.t;
    c.save();
    api.rr(c, x, y, w, h, 8);
    c.clip();
    const hue = (t / 60) % 360;
    const g = c.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, `hsl(${hue},80%,22%)`);
    g.addColorStop(1, `hsl(${(hue + 90) % 360},80%,14%)`);
    c.fillStyle = g;
    c.fillRect(x, y, w, h);
    c.globalCompositeOperation = 'lighter';
    const rg = c.createRadialGradient(x + w / 2, y + h * 0.45, 0, x + w / 2, y + h * 0.45, w * 0.6);
    rg.addColorStop(0, `hsla(${(hue + 40) % 360},100%,60%,${0.25 + bt.pulse * 0.35})`);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = rg;
    c.fillRect(x, y, w, h);
    const bars = 26;
    const bw = w / bars;
    for (let i = 0; i < bars; i++) {
      const v = 0.25 + 0.75 * Math.abs(Math.sin(t / 380 + i * 0.7) * Math.sin(t / 910 + i * 1.3)) * (0.55 + bt.pulse * 0.45);
      const bh = v * h * 0.38;
      c.fillStyle = `hsla(${(hue + i * 9) % 360},100%,62%,0.55)`;
      c.fillRect(x + i * bw + 2, y + h - bh, bw - 4, bh);
    }
    c.globalCompositeOperation = 'source-over';
    c.textAlign = 'center';
    c.fillStyle = 'rgba(255,255,255,0.75)';
    c.font = '600 22px Kanit, sans-serif';
    c.fillText('♪ NOW PLAYING ♪', x + w / 2, y + 42);
    c.fillStyle = '#fff';
    let size = 50;
    c.font = `800 ${size}px Kanit, sans-serif`;
    let lines = api.wrapText(c, T.nowPlaying || '', w - 40);
    while (lines.length > 2 && size > 28) {
      size -= 4;
      c.font = `800 ${size}px Kanit, sans-serif`;
      lines = api.wrapText(c, T.nowPlaying || '', w - 40);
    }
    lines = lines.slice(0, 2);
    const baseY = y + 108 + (lines.length === 1 ? 14 : 0);
    lines.forEach((ln, i) => c.fillText(ln, x + w / 2, baseY + i * (size + 4)));
    c.font = '600 26px Kanit, sans-serif';
    c.fillStyle = '#ffd6f0';
    c.fillText(T.artist || '', x + w / 2, baseY + lines.length * (size + 4) + 8);
    c.fillStyle = 'rgba(0,0,0,0.18)';
    for (let yy = y; yy < y + h; yy += 4) c.fillRect(x, yy, w, 1.5);
    c.restore();
  }

  function drawPerformer(c, t, bt, api) {
    if (api.t.showPerformer === false || api.avatarOn) return; // มีตัวละคร 3D แล้ว → ไม่ต้องวาดนักร้องเงา
    const cx = 540 + Math.sin(t / 900) * 6;
    const fy = 930;
    c.save();
    c.globalCompositeOperation = 'lighter';
    const rg = c.createRadialGradient(cx, fy - 120, 10, cx, fy - 120, 240);
    rg.addColorStop(0, `rgba(255,120,220,${0.35 + bt.pulse * 0.3})`);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = rg;
    c.fillRect(cx - 260, fy - 380, 520, 420);
    c.restore();

    c.save();
    c.translate(cx, fy);
    c.rotate(Math.sin(t / 450) * 0.05);
    c.fillStyle = '#07040f';
    c.beginPath();
    c.moveTo(-26, 0);
    c.lineTo(-14, -95);
    c.lineTo(14, -95);
    c.lineTo(28, 0);
    c.lineTo(14, 0);
    c.lineTo(2, -70);
    c.lineTo(-10, 0);
    c.closePath();
    c.fill();
    c.beginPath();
    c.moveTo(-36, -100);
    c.quadraticCurveTo(-42, -170, -28, -186);
    c.lineTo(28, -186);
    c.quadraticCurveTo(42, -170, 36, -100);
    c.closePath();
    c.fill();
    c.beginPath();
    c.arc(0, -212, 24, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.moveTo(-22, -222);
    c.quadraticCurveTo(-40 + Math.sin(t / 300) * 4, -200, -30, -175);
    c.lineTo(-18, -200);
    c.fill();
    c.lineCap = 'round';
    c.strokeStyle = '#07040f';
    c.lineWidth = 15;
    c.beginPath();
    c.moveTo(24, -176);
    c.lineTo(40, -140);
    c.lineTo(14, -206);
    c.stroke();
    const up = Math.sin(t / 700) > 0.2;
    c.beginPath();
    c.moveTo(-24, -176);
    if (up) {
      c.lineTo(-52, -220);
      c.lineTo(-66, -268 - bt.pulse * 6);
    } else {
      c.lineTo(-48, -140);
      c.lineTo(-56, -102);
    }
    c.stroke();
    c.fillStyle = '#999';
    c.beginPath();
    c.arc(12, -210, 6, 0, Math.PI * 2);
    c.fill();
    c.globalCompositeOperation = 'lighter';
    c.strokeStyle = `rgba(57,213,255,${0.5 + bt.pulse * 0.4})`;
    c.lineWidth = 3;
    c.beginPath();
    c.arc(0, -212, 25, -Math.PI * 0.9, -Math.PI * 0.2);
    c.moveTo(-28, -186);
    c.quadraticCurveTo(-42, -170, -36, -100);
    c.stroke();
    c.restore();
  }

  function drawBeams(c, t, bt, api) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    const boost = api.bigActive ? 1.6 : 1;
    LAMPS.forEach((l, i) => {
      const ang = Math.sin(t / 1300 + l.ph) * 0.55 + (i < 4 ? 0.15 : -0.15);
      const len = 1300;
      const spread = 0.13;
      const tx = l.x + Math.sin(ang) * len;
      const ty = l.y + Math.cos(ang) * len;
      const col = PALETTE[(i + Math.floor(t / 4000)) % PALETTE.length];
      const a = (0.1 + bt.pulse * 0.12) * boost;
      const g = c.createLinearGradient(l.x, l.y, tx, ty);
      g.addColorStop(0, api.hexA(col, a * 1.8));
      g.addColorStop(1, api.hexA(col, 0));
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(l.x - 6, l.y + 18);
      c.lineTo(l.x + Math.sin(ang - spread) * len, l.y + Math.cos(ang - spread) * len);
      c.lineTo(l.x + Math.sin(ang + spread) * len, l.y + Math.cos(ang + spread) * len);
      c.lineTo(l.x + 6, l.y + 18);
      c.closePath();
      c.fill();
      c.fillStyle = api.hexA(col, 0.9);
      c.beginPath();
      c.arc(l.x, l.y + 16, 7 + bt.pulse * 3, 0, Math.PI * 2);
      c.fill();
    });
    c.restore();
  }

  function drawStageFront(c, t, bt, api) {
    const y = STAGE.frontY + 12;
    const seg = 30;
    for (let x = STAGE.frontL; x < STAGE.frontR; x += seg) {
      const k = Math.floor((x + t / 6) / seg);
      c.fillStyle = api.hexA(PALETTE[Math.abs(k) % PALETTE.length], 0.35 + bt.pulse * 0.5);
      c.fillRect(x + 3, y, seg - 6, 14);
    }
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      const hx = (((t / 40) * (i % 2 ? 1 : -1) + i * 300) % 1400) - 160;
      const hy = 960 + i * 22;
      const rg = c.createRadialGradient(hx, hy, 0, hx, hy, 260);
      rg.addColorStop(0, 'rgba(160,140,255,0.10)');
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = rg;
      c.fillRect(hx - 260, hy - 260, 520, 520);
    }
    c.restore();
  }

  function drawSilhouettes(c, t, bt, api) {
    const override = api.stick;
    for (const p of silhouettes) {
      const bob = Math.sin(t / 260 + p.ph) * 3 * p.s - bt.pulse * 3 * p.s;
      const x = p.x;
      const y = p.y + bob;
      const s = p.s;
      if (p.stick) {
        const ang = Math.sin(t / 520 + p.ph) * 0.4;
        const hx = x + 16 * s;
        const hy = y - 52 * s;
        const ex = hx + Math.sin(ang) * 40 * s;
        const ey = hy - Math.cos(ang) * 40 * s;
        const col = override || p.color;
        c.strokeStyle = api.hexA(col, 0.22);
        c.lineWidth = 12 * s;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(hx, hy);
        c.lineTo(ex, ey);
        c.stroke();
        c.strokeStyle = col;
        c.lineWidth = 4 * s;
        c.beginPath();
        c.moveTo(hx, hy);
        c.lineTo(ex, ey);
        c.stroke();
      }
      c.fillStyle = '#0a0619';
      c.beginPath();
      c.arc(x, y - 40 * s, 15 * s, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.ellipse(x, y, 28 * s, 26 * s, 0, Math.PI, 0);
      c.fill();
    }
  }

  window.STAGE_THEMES.concert = theme;
})();
