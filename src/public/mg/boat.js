/* มินิเกม: แข่งเรือยาว (ภาพ) — มองจากมุมสูง แม่น้ำเลื่อนลง เรือพุ่งขึ้นไปหาเส้นชัย
 * ฝีพาย = คนดูในทีม (นั่งตามลำดับที่เข้าทีม 2 แถว × 10) • คนตีกลองหัวเรือ = คนส่งของขวัญมากสุดในทีม
 */
(() => {
  const K = window.PixelKit;
  const { P, O, W, H, hsh, rnd, esc } = K;
  const TEAM = { r: { c: '#e8453c', d: '#9a1f2a', l: '#ff8a6a', name: 'ทีมแดง', x: 62 }, b: { c: '#3b6fd8', d: '#24408a', l: '#7aa8ff', name: 'ทีมน้ำเงิน', x: 118 } };
  const TILE = 640;
  const BOAT_LEN = 150;
  const RIVER = [28, 152];
  let banks = null;
  let water = null;
  let boats = {};
  let st = { gold: new Set(), scroll: 0, order: { r: [], b: [] }, team: new Map(), anim: new Map(), dragon: { r: 0, b: 0 }, turbo: { r: 0, b: 0 }, drumFast: { r: 0, b: 0 }, cheer: 0, confetti: 0 };

  // ---------------------------------------------------------------- ฉาก (วาดครั้งเดียว)
  function makeWater() {
    const R = rnd(5);
    const p = P(W, TILE);
    p.rect(0, 0, W, TILE, '#2a78c0');
    // แถบน้ำลึก-ตื้นไล่สี + ระลอก
    for (let y = 0; y < TILE; y++) {
      for (let x = RIVER[0]; x < RIVER[1]; x++) {
        const edge = Math.min(x - RIVER[0], RIVER[1] - x);
        if (edge < 5) p.px(x, y, (x + y) % 2 ? '#3a90d0' : '#2a78c0');
        else if (((x * 7 + y * 3) % 23) === 0) p.px(x, y, '#2468b0');
      }
    }
    for (let i = 0; i < 260; i++) {
      const x = RIVER[0] + 4 + Math.floor(R() * (RIVER[1] - RIVER[0] - 10));
      const y = Math.floor(R() * TILE);
      const w = 3 + Math.floor(R() * 5);
      p.rect(x, y, w, 1, R() < 0.3 ? '#8ac8f0' : '#5aa8e0');
    }
    return p.cv;
  }
  function makeBanks() {
    const R = rnd(17);
    const p = P(W, TILE);
    const grass = (x0, x1) => {
      for (let y = 0; y < TILE; y++) for (let x = x0; x < x1; x++) p.px(x, y, ((x * 13 + y * 7) % 11 === 0) ? '#4f9a3a' : ((x + y * 3) % 17 === 0 ? '#78c060' : '#5fae48'));
    };
    grass(0, RIVER[0]);
    grass(RIVER[1], W);
    // ตลิ่งทราย + ขอบหิน
    for (let y = 0; y < TILE; y++) {
      for (const [x, d] of [[RIVER[0] - 3, 1], [RIVER[1], -1]]) {
        p.rect(x, y, 3, 1, (y % 5 === 0) ? '#c8a868' : '#e0c080');
        if (y % 9 === 0) p.px(x + (d > 0 ? 2 : 0), y, '#8a7048');
      }
    }
    // ทางเดินริมน้ำ (อิฐ) ฝั่งขวา
    for (let y = 0; y < TILE; y++) {
      p.px(RIVER[1] + 6, y, '#c87a5a');
      p.px(RIVER[1] + 7, y, y % 6 === 0 ? '#9a5a3a' : '#d88a6a');
      p.px(RIVER[1] + 8, y, '#c87a5a');
    }
    // ต้นมะพร้าว (มองบน) + พุ่มไม้ + ดอกไม้
    const palm = (cx, cy) => {
      for (let a = 0; a < 6; a++) {
        const ang = (a / 6) * Math.PI * 2 + 0.3;
        for (let r = 1; r < 9; r++) {
          const x = cx + Math.cos(ang) * r;
          const y = cy + Math.sin(ang) * r * 0.9;
          p.px(x, y, r > 6 ? '#2f7a3a' : '#3f9a4a');
          if (r % 2) p.px(x + Math.cos(ang + 1.57), y + Math.sin(ang + 1.57), '#5fd068');
        }
      }
      p.rect(cx - 1, cy - 1, 3, 3, '#7a4a2a');
      p.px(cx + 1, cy + 1, '#5a3420');
    };
    const bush = (cx, cy, r) => {
      p.oell(cx, cy, r, r - 1, '#3f8a3a');
      p.ell(cx - 1, cy - 1, r - 2, r - 3, '#5fae48');
      for (let i = 0; i < 3; i++) p.px(cx - r + 2 + Math.floor(R() * (r * 2 - 3)), cy - 1 + Math.floor(R() * 3), ['#ff8fab', '#ffd166', '#ffffff'][i]);
    };
    for (let y = 8; y < TILE; y += 46) palm(9 + Math.floor(R() * 6), y + Math.floor(R() * 10));
    for (let y = 30; y < TILE; y += 52) bush(14 + Math.floor(R() * 4), y, 5);
    for (let y = 20; y < TILE; y += 64) palm(171 - Math.floor(R() * 4), y);
    // บ้านริมน้ำ (หลังคากระเบื้องมองบน)
    for (let y = 60; y < TILE; y += 150) {
      const x = 162;
      p.orect(x, y, 18, 22, '#c8643a');
      for (let r = y + 2; r < y + 21; r += 3) p.rect(x + 1, r, 16, 1, '#a84a2a');
      p.rect(x + 8, y + 1, 2, 20, '#e8845a');
      p.rect(x - 2, y + 22, 6, 6, '#9a6a3a');
    }
    // ทุ่นแบ่งเลน + ศาลาริมน้ำฝั่งซ้าย
    for (let y = 110; y < TILE; y += 210) {
      p.orect(0, y, 22, 26, '#f2e6c8');
      p.poly([[0, y], [11, y - 6], [22, y]], '#e8453c');
      p.rect(0, y - 1, 22, 1, '#ffd166');
    }
    for (let i = 0; i < 70; i++) p.px(Math.floor(R() * 26), Math.floor(R() * TILE), ['#ff8fab', '#ffd166', '#ffffff', '#b28cff'][i % 4]);
    return p.cv;
  }
  function makeBoat(t) {
    const T = TEAM[t];
    const p = P(30, BOAT_LEN + 22);
    const cx = 15;
    const top = 12;
    for (let y = 0; y < BOAT_LEN; y++) {
      const k = y / BOAT_LEN;
      let w = k < 0.14 ? Math.max(1, Math.round((8 * k) / 0.14)) : k > 0.9 ? Math.max(3, Math.round((8 * (1 - k)) / 0.1)) : 8;
      p.rect(cx - w - 1, top + y, (w + 1) * 2, 1, O);
      p.rect(cx - w, top + y, w * 2, 1, y % 7 === 0 ? '#7a4422' : '#9a5a2a');
      p.px(cx - w, top + y, '#ffd166');
      p.px(cx + w - 1, top + y, '#ffd166');
      if (w > 3) p.px(cx - w + 1, top + y, '#c87a3a');
    }
    p.rect(cx - 1, top + 14, 2, BOAT_LEN - 26, T.c);
    // หัวเรือ: ลายทองโค้ง + พู่สีทีม
    for (let i = 0; i < 12; i++) p.px(cx + Math.round(Math.sin(i / 2) * 1.5), top - i, i % 3 ? '#ffd166' : '#e0a81e');
    p.rect(cx - 2, top - 12, 5, 2, '#ffd166');
    p.rect(cx + 2, top - 11, 6, 4, T.c);
    p.rect(cx + 2, top - 11, 6, 1, T.l);
    // ท้ายเรือยกโค้ง
    for (let i = 0; i < 6; i++) p.px(cx, top + BOAT_LEN + i, '#ffd166');
    return p.cv;
  }

  // ---------------------------------------------------------------- ตำแหน่งในเรือ
  const boatTop = (t, S) => {
    const p = S.p || { r: 0, b: 0 };
    const o = t === 'r' ? 'b' : 'r';
    let dy = Math.max(-26, Math.min(26, ((p[o] || 0) - (p[t] || 0)) * 1.6));
    if (S.phase === 'finish' && S.winner === t) dy -= 10;
    return 100 + dy;
  };
  const seatPos = (t, i, S) => {
    const top = boatTop(t, S);
    const row = Math.floor(i / 2);
    const side = i % 2 ? 1 : -1;
    return { x: TEAM[t].x + side * 4 - 3, y: top + 22 + row * 12, side };
  };

  const G = {
    toastTop: 1300, // ป้ายของขวัญอยู่ท้ายเรือ (ไม่ทับฝีพาย)
    // วิธีเล่นเป็นแถบป้ายเล็ก ๆ ใต้ชื่อเกม • แผงสถานะแบบบาง • ป้ายเหนือหัวตรงตัวละคร
    hintsTop: 188,
    fxWorld: true,
    hints: [
      ['💬', 'คอมเมนต์', 'ลงเรือ'],
      ['🚣', 'พาย', 'จ้ำพายพร้อมกัน'],
      ['🥁', 'ฮึบ', 'ตอนกลองตี'],
      ['❤️', 'ไลก์', 'แรงเชียร์'],
      ['💨', 'ของขวัญเล็ก', 'เทอร์โบ'],
      ['🐉', 'ของขวัญใหญ่', 'เรือมังกร'],
    ],
    foot: 'รอบละ ~2 นาที · ทีมตามหลังช่วงท้ายได้แรงฮึด · พายครบ 100 ครั้งได้ไม้พายทอง · “ทีมแดง/ทีมน้ำเงิน” ย้ายทีม',
    init() {
      water = makeWater();
      banks = makeBanks();
      boats = { r: makeBoat('r'), b: makeBoat('b') };
    },
    apply(S, prev, ctx) {
      if (S.teams) for (const [id, t] of Object.entries(S.teams)) setTeam(id, t);
      if (S.gold) st.gold = new Set(S.gold);
      // ลำดับที่นั่ง: คนที่ออกจากไลฟ์แล้วไม่ต้องวาด
      const here = new Set(ctx.actors().map((a) => a.id));
      for (const t of ['r', 'b']) st.order[t] = st.order[t].filter((id) => here.has(id) && st.team.get(id) === t);
    },
    onEv(d, ctx) {
      const S = ctx.S;
      if (d.ev === 'join') {
        setTeam(d.id, d.team);
        if (d.moved) ctx.toast(`🔁 ${d.name} ย้ายไป${TEAM[d.team].name}`);
      } else if (d.ev === 'strokes') {
        let shown = 0;
        for (const s of d.list) {
          setTeam(s.id, s.t);
          st.anim.set(s.id, 0.45);
          const i = st.order[s.t].indexOf(s.id);
          if (i < 0 || i >= 20) continue;
          const sp = seatPos(s.t, i, S);
          for (let k = 0; k < 4; k++) ctx.parts.push({ x: TEAM[s.t].x + sp.side * 15, y: sp.y + 6, vx: sp.side * (10 + Math.random() * 20), vy: 10 + Math.random() * 20, life: 0.4, c: k % 2 ? '#ffffff' : '#cfe8ff', g: 0 });
          if (shown++ < 4) {
            const a = ctx.actors().find((x) => x.id === s.id);
            if (a) ctx.label('say' + s.id, sp.x + 3, sp.y - 2, `🚣 ${ctx.nm(a.id, a.name)}`, 1.2);
          }
        }
      } else if (d.ev === 'start') {
        ctx.toast(`🚣 รอบที่ ${d.round} ปล่อยเรือ! พิมพ์ “พาย” เลย!`, 'big');
        ctx.sfx('whistle');
      } else if (d.ev === 'finish') {
        st.cheer = 6;
        st.confetti = 4;
        ctx.api.bigShow(null, `${TEAM[d.winner].name}ชนะ!`);
        ctx.api.fireworks(4);
        if (d.mvp) setTimeout(() => ctx.toast(`🏅 ฝีพายเด่นรอบนี้: ${d.mvp.name} (${d.mvp.n} ครั้ง)`, 'big'), 1500);
        if (d.streak >= 2) setTimeout(() => ctx.toast(`🔥 ${TEAM[d.winner].name}ชนะติดกัน ${d.streak} รอบ!`), 3000);
      } else if (d.ev === 'heave') {
        ctx.toast(`🥁 พิมพ์ “ฮึบ” พร้อมกันใน 6 วิ! (แดงต้อง ${d.need.r} · น้ำเงินต้อง ${d.need.b} คน)`, 'big');
        ctx.sfx('whistle');
      } else if (d.ev === 'heaveEnd') {
        const w = ['r', 'b'].filter((t) => d.ok[t]).map((t) => TEAM[t].name);
        ctx.toast(w.length ? `💥 ${w.join(' + ')} ฮึบพร้อมกัน เรือพุ่ง!` : '😅 ฮึบไม่พร้อมกัน ไม่มีทีมไหนพุ่ง');
        for (const t of ['r', 'b']) if (d.ok[t]) st.turbo[t] = 2.5;
      } else if (d.ev === 'gift') {
        const teams = d.team === 'all' ? ['r', 'b'] : [d.team];
        for (const t of teams) {
          if (d.tier === 1) st.turbo[t] = 2;
          else if (d.tier === 2) st.drumFast[t] = 10;
          else st.dragon[t] = 12;
        }
        ctx.fx.shake = d.tier === 3 ? 0.8 : 0.3;
      }
    },
    gift(tier, user, n, f, ctx) {
      const who = user?.name || 'มีคน';
      ctx.toast(`${f.icon} ${who} → ${f.label}`, tier === 3 ? 'big' : '');
      if (tier === 3) ctx.api.bigShow(user, 'เรือพลังมังกร!');
    },
    goal(d, ctx) {
      if (d.key === 'coins') ctx.api.bigShow(null, 'มังกรพาสองลำพุ่ง!');
    },
    frame(c, ts, dt, ctx) {
      const S = ctx.S;
      const racing = S.phase === 'race';
      const speed = racing ? 26 + ((S.p?.r || 0) + (S.p?.b || 0)) * 0.05 : S.phase === 'finish' ? 10 : 0;
      st.scroll = (st.scroll + dt * speed) % TILE;
      for (const k of ['cheer', 'confetti']) st[k] = Math.max(0, st[k] - dt);
      for (const t of ['r', 'b']) for (const k of ['turbo', 'drumFast', 'dragon']) st[k][t] = Math.max(0, st[k][t] - dt);
      // น้ำ + ตลิ่ง (เลื่อนลง)
      const oy = Math.floor(st.scroll);
      c.drawImage(water, 0, oy - TILE);
      c.drawImage(water, 0, oy);
      // ประกายแดดบนน้ำ
      for (let i = 0; i < 22; i++) {
        const x = RIVER[0] + 6 + ((i * 53) % (RIVER[1] - RIVER[0] - 12));
        const y = ((i * 97 + Math.floor(ts * 12) * 7 + oy) % H);
        if (Math.sin(ts * 3 + i) > 0.2) {
          c.fillStyle = '#e8f6ff';
          c.fillRect(x, y, 2, 1);
        }
      }
      // ทุ่นแบ่งเลนกลางแม่น้ำ
      for (let y = (oy % 10) - 10; y < H; y += 10) {
        c.fillStyle = O;
        c.fillRect(89, y, 3, 3);
        c.fillStyle = Math.floor((y - oy) / 10) % 2 ? '#ffffff' : '#e8453c';
        c.fillRect(89, y, 2, 2);
      }
      c.drawImage(banks, 0, oy - TILE);
      c.drawImage(banks, 0, oy);
      // คนดูริมตลิ่งเชียร์ (โบกธงสีทีม)
      for (let i = 0; i < 26; i++) {
        const side = i % 2;
        const y = ((i * 37 + oy) % (H + 20)) - 10;
        const x = side ? 156 : 18;
        const bob = Math.abs(Math.sin(ts * 6 + i)) * (racing || st.cheer > 0 ? 2 : 0.5);
        c.fillStyle = O;
        c.fillRect(x - 1, y - 1 - bob, 6, 6);
        c.fillStyle = ['#e8453c', '#3b6fd8', '#ffd166', '#5fd068', '#ff8fab'][i % 5];
        c.fillRect(x, y + 2 - bob, 4, 2);
        c.fillStyle = K.HAIR[i % 6];
        c.fillRect(x, y - bob, 4, 2);
        if (i % 3 === 0) {
          c.fillStyle = '#7a4a2a';
          c.fillRect(x + (side ? -2 : 5), y - 4 - bob, 1, 6);
          c.fillStyle = i % 2 ? '#e8453c' : '#3b6fd8';
          c.fillRect(x + (side ? -6 : 6), y - 4 - bob + (Math.sin(ts * 8 + i) > 0 ? 0 : 1), 4, 3);
        }
      }
      // เส้นชัย (โผล่เมื่อใกล้ถึง)
      const maxP = Math.max(S.p?.r || 0, S.p?.b || 0);
      if ((racing && maxP > 70) || S.phase === 'finish') {
        const fy = S.phase === 'finish' ? 76 : Math.round(-20 + (maxP - 70) * 3.2);
        for (let x = RIVER[0]; x < RIVER[1]; x += 4) {
          for (const yy of [0, 4]) {
            c.fillStyle = ((x - RIVER[0]) / 4 + yy / 4) % 2 ? '#1b1426' : '#ffffff';
            c.fillRect(x, fy + yy, 4, 4);
          }
        }
        for (const px of [RIVER[0] - 3, RIVER[1]]) {
          c.fillStyle = O;
          c.fillRect(px - 1, fy - 18, 5, 28);
          c.fillStyle = '#c8964a';
          c.fillRect(px, fy - 17, 3, 26);
        }
        c.fillStyle = O;
        c.fillRect(RIVER[0] + 18, fy - 16, RIVER[1] - RIVER[0] - 36, 10);
        c.fillStyle = '#e8453c';
        c.fillRect(RIVER[0] + 19, fy - 15, RIVER[1] - RIVER[0] - 38, 8);
        c.fillStyle = '#ffd166';
        c.fillRect(RIVER[0] + 19, fy - 15, RIVER[1] - RIVER[0] - 38, 1);
        ctx.label('finish', 90, fy - 6, '🏁 เส้นชัย', 0.6, 'gold');
      }
      // เรือ 2 ลำ
      for (const t of ['r', 'b']) drawBoat(c, t, ts, dt, ctx);
      // พลุกระดาษตอนจบ
      if (st.confetti > 0) for (let i = 0; i < 6; i++) ctx.parts.push({ x: Math.random() * W, y: -4, vx: (Math.random() - 0.5) * 30, vy: 40 + Math.random() * 40, life: 3, c: ['#ffd166', '#e8453c', '#3b6fd8', '#5fd068', '#ff8fab'][i % 5], g: 10, sz: 2 });
    },
    hud(ctx) {
      const S = ctx.S;
      const p = S.p || { r: 0, b: 0 };
      const n = S.n || { r: 0, b: 0 };
      const left = ctx.left();
      const w = S.wins || { r: 0, b: 0 };
      const streak = S.streak?.n >= 2 ? ` · 🔥 ${TEAM[S.streak.t].name}ชนะติด ${S.streak.n}` : '';
      const wins = `🏆 ชนะสะสม แดง ${w.r} · น้ำเงิน ${w.b}${streak}`;
      let body;
      if (S.phase === 'ready') {
        const fame = (S.fame || []).slice(0, 3).map((x, i) => `${['🥇', '🥈', '🥉'][i]} ${esc(x.n)}`).join(' ');
        body = `<div class="l"><span>🚣 รอบที่ ${S.round || 1} กำลังจะเริ่ม</span><span class="sp"></span><b class="gold">${left} วิ</b></div>
          <div class="l"><span>🔴 ทีมแดง ${n.r} คน</span><span class="sp"></span><span>🔵 ทีมน้ำเงิน ${n.b} คน</span></div>
          <div class="s">${fame ? `ฝีพายตลอดกาล ${fame} · ` : ''}${wins}</div>`;
      } else {
        const boost = (t) => (S.boost?.[t] ? ` <b class="gold">🥁×2</b>` : '') + (S.surge?.[t] ? ` <b style="color:#ff8a6a">🔥</b>` : '');
        const hv = S.heave;
        body = `<div class="l"><span>🏁 รอบที่ ${S.round || 1}${S.phase === 'finish' ? ' · จบแล้ว' : ''}</span><span class="sp"></span><b class="gold">⏱️ ${ctx.mmss(left)}</b></div>
          <div class="l"><span>🔴 ${n.r}${boost('r')}</span>${ctx.bar(p.r, 'linear-gradient(90deg,#9a1f2a,#e8453c)')}<b>${Math.floor(p.r)}%</b>
            <span>🔵 ${n.b}${boost('b')}</span>${ctx.bar(p.b, 'linear-gradient(90deg,#24408a,#3b6fd8)')}<b>${Math.floor(p.b)}%</b></div>
          ${hv ? `<div class="hot">🥁 พิมพ์ “ฮึบ”! แดง ${hv.cnt.r}/${hv.need.r} · น้ำเงิน ${hv.cnt.b}/${hv.need.b} · ${hv.left} วิ</div>` : `<div class="s">${wins}</div>`}`;
      }
      return `<div class="slim" style="top:var(--hb-end, 358px)">${body}</div>
        ${S.phase === 'ready' && left <= 5 ? `<div class="cd">${left || 'ไป!'}</div>` : ''}`;
    },
    onChat(d, ctx) {
      // ฟองคำพูดเหนือที่นั่ง (เฉพาะคนที่นั่งในเรือ)
      const t = st.team.get(d.id);
      if (!t || /^(พาย|พายเลย|จ้ำ|ซู่|row|พายๆ)$/i.test(String(d.text).replace(/\s+/g, ''))) return;
      const i = st.order[t].indexOf(d.id);
      if (i < 0 || i >= 20) return;
      const sp = seatPos(t, i, ctx.S);
      ctx.label('say' + d.id, sp.x + 3, sp.y - 2, esc(String(d.text).slice(0, 24)), 2.5, 'say');
    },
    css: () => `.mg-hud .cd { position: absolute; left: 50%; top: 820px; transform: translateX(-50%); font-size: 220px; font-weight: 800; color: #ffd166;
      -webkit-text-stroke: 10px #1b1426; paint-order: stroke fill; text-shadow: 12px 12px 0 #1b1426; animation: mgPop .5s steps(5) infinite alternate; }
      @keyframes mgPop { from { transform: translateX(-50%) scale(1); } to { transform: translateX(-50%) scale(1.08); } }`,
  };

  function setTeam(id, t) {
    if (st.team.get(id) === t && st.order[t].includes(id)) return;
    st.team.set(id, t);
    for (const k of ['r', 'b']) st.order[k] = st.order[k].filter((x) => x !== id);
    st.order[t].push(id);
  }

  function drawBoat(c, t, ts, dt, ctx) {
    const S = ctx.S;
    const T = TEAM[t];
    const top = boatTop(t, S);
    const racing = S.phase === 'race';
    const fast = st.drumFast[t] > 0 || S.boost?.[t] > 0;
    // คลื่นท้ายเรือ + เทอร์โบ
    const stern = top + BOAT_LEN;
    const wake = racing ? (st.turbo[t] > 0 ? 26 : 16) : 6;
    for (let k = 0; k < wake; k++) {
      const y = stern + k * 2;
      c.fillStyle = k % 3 === 0 ? '#ffffff' : '#cfe8ff';
      c.fillRect(T.x - 6 - k, y, 2, 1);
      c.fillRect(T.x + 5 + k, y, 2, 1);
    }
    if (st.turbo[t] > 0 || st.dragon[t] > 0) {
      for (let k = 0; k < 10; k++) ctx.parts.push({ x: T.x + (Math.random() - 0.5) * 6, y: stern + 4, vx: (Math.random() - 0.5) * 10, vy: 40 + Math.random() * 40, life: 0.4, c: ['#ffd166', '#ff8a3d', '#e8453c', '#fff3c4'][k % 4], g: 0 });
    }
    // มังกรทองว่ายคู่เรือ
    if (st.dragon[t] > 0) {
      for (let i = 0; i < 26; i++) {
        const y = top + 10 + i * 6;
        const x = T.x + (t === 'r' ? -20 : 20) + Math.sin(ts * 6 - i * 0.5) * 4;
        c.fillStyle = O;
        c.fillRect(Math.round(x) - 2, y - 2, 5, 5);
        c.fillStyle = i % 4 === 0 ? '#e0a81e' : '#ffd166';
        c.fillRect(Math.round(x) - 1, y - 1, 3, 3);
      }
      const hx = T.x + (t === 'r' ? -20 : 20) + Math.sin(ts * 6) * 4;
      c.fillStyle = O;
      c.fillRect(Math.round(hx) - 4, top + 2, 9, 8);
      c.fillStyle = '#ffd166';
      c.fillRect(Math.round(hx) - 3, top + 3, 7, 6);
      c.fillStyle = '#e8453c';
      c.fillRect(Math.round(hx) - 2, top + 4, 1, 1);
      c.fillRect(Math.round(hx) + 2, top + 4, 1, 1);
    }
    c.drawImage(boats[t], T.x - 15, top - 12);
    // ฝีพาย
    const beat = racing ? Math.sin(ts * (fast ? 14 : 7)) : Math.sin(ts * 2) * 0.2;
    const ids = st.order[t];
    const cheering = st.cheer > 0 && S.winner === t;
    for (let i = 0; i < 20; i++) {
      const sp = seatPos(t, i, S);
      const id = ids[i];
      if (!id) {
        // ที่นั่งว่าง
        c.fillStyle = '#7a4422';
        c.fillRect(sp.x + 1, sp.y + 2, 4, 2);
        continue;
      }
      const a = st.anim.get(id) || 0;
      if (a > 0) st.anim.set(id, a - dt);
      const stroke = a > 0 ? (a > 0.22 ? 1 : -1) : beat;
      const jump = cheering ? Math.round(Math.abs(Math.sin(ts * 10 + i)) * 2) : 0;
      // พาย
      const ox = T.x + sp.side * 7;
      const ex = T.x + sp.side * (stroke > 0 ? 17 : 14);
      const ey = sp.y + 3 + (stroke > 0 ? 6 : -4);
      const gold = st.gold.has(id);
      c.fillStyle = gold ? '#ffd166' : '#c8964a';
      line(c, ox, sp.y + 3, ex, ey);
      c.fillStyle = gold ? '#fff3c4' : '#e0c070';
      c.fillRect(ex - 1, ey - 1, 2, 3);
      if (gold && Math.random() < 0.04) ctx.parts.push({ x: ex, y: ey, vx: 0, vy: -10, life: 0.5, c: '#ffd166', g: 0 });
      c.drawImage(K.topPerson(id, T.c), sp.x, sp.y - jump);
      if (cheering && i % 3 === 0) {
        c.fillStyle = '#ffd166';
        c.fillRect(sp.x + 2, sp.y - 3 - jump, 2, 2);
      }
    }
    // คนตีกลองหัวเรือ
    const drum = S.drum?.[t];
    const dy = top + 6;
    c.fillStyle = O;
    c.fillRect(T.x - 4, dy + 6, 8, 5);
    c.fillStyle = '#e8453c';
    c.fillRect(T.x - 3, dy + 7, 6, 3);
    c.fillStyle = '#ffd166';
    c.fillRect(T.x - 3, dy + 7, 6, 1);
    c.drawImage(K.topPerson(drum?.id || 'drum' + t, '#ffd166'), T.x - 3, dy - (racing && Math.sin(ts * (fast ? 14 : 7)) > 0 ? 1 : 0));
    if (fast && Math.random() < 0.2) ctx.parts.push({ x: T.x + (Math.random() - 0.5) * 10, y: dy, vx: (Math.random() - 0.5) * 20, vy: -30, life: 0.8, c: '#ffd166', g: 0, plus: true });
    // ป้ายคนตีกลองอยู่ข้างหัวเรือ (ด้านนอก) — เหนือหัวเรือเป็นแผงสถานะ
    ctx.label('drum' + t, T.x + (t === 'r' ? -24 : 24), top + 18, `🥁 ${esc(drum ? drum.name : T.name)}`, 1, drum ? 'gold' : '');
    // คนเกินที่นั่ง
    if (ids.length > 20) ctx.label('more' + t, T.x, top + BOAT_LEN + 16, `+${ids.length - 20} คนรอเปลี่ยนมือ`, 1);
  }
  function line(c, x0, y0, x1, y1) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= n; i++) c.fillRect(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), 1, 1);
  }

  window.MG_GAMES.boat = G;
})();
