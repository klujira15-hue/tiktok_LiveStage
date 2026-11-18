/* มินิเกม: ทายภาพพิกเซล (ภาพ) — เวทีเกมโชว์ ม่านแดง ไฟกะพริบรอบกรอบ สปอตไลต์ส่ายไปมา พิธีกรถือไมค์
 * ภาพปริศนา = อีโมจิวาดลงแคนวาส 24×24 แล้วขยายแบบพิกเซล • ผู้ชม (คนดู) นั่ง 3 แถวด้านล่าง ยกมือตอนตอบ
 */
(() => {
  const K = window.PixelKit;
  const { P, O, W, H, hsh, rnd, esc } = K;
  const N = 24; // ความละเอียดภาพ
  const B = 4; // พิกเซลจอต่อจุดภาพ
  const FX = (W - N * B) / 2;
  const FY = 74;
  const ROWS = [218, 236, 254];
  let stage = null;
  const picCache = new Map();
  const st = { hands: new Map(), seat: new Map(), confetti: 0, flash: 0, near: 0 };

  function picOf(e) {
    if (picCache.has(e)) return picCache.get(e);
    const big = document.createElement('canvas');
    big.width = big.height = 96;
    const bc = big.getContext('2d');
    bc.textAlign = 'center';
    bc.textBaseline = 'middle';
    bc.font = '80px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
    bc.fillText(e, 48, 54);
    const sm = document.createElement('canvas');
    sm.width = sm.height = N;
    const sc = sm.getContext('2d');
    sc.imageSmoothingEnabled = true;
    sc.drawImage(big, 0, 0, N, N);
    // เก็บสีแบบไม่โปร่งใส (พื้นหลังกรมท่า) + ขอบเข้มรอบรูป ให้ดูเป็นพิกเซลอาร์ต
    const img = sc.getImageData(0, 0, N, N);
    const d = img.data;
    const solid = new Uint8Array(N * N);
    for (let i = 0; i < N * N; i++) solid[i] = d[i * 4 + 3] > 110 ? 1 : 0;
    const out = sc.createImageData(N, N);
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const i = y * N + x;
        let r = 26, g = 42, b = 74;
        if (solid[i]) {
          // ลดจำนวนสี (ดูเป็นพิกเซลอาร์ต)
          r = Math.round(d[i * 4] / 32) * 32;
          g = Math.round(d[i * 4 + 1] / 32) * 32;
          b = Math.round(d[i * 4 + 2] / 32) * 32;
        } else if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, c]) => solid[(y + c) * N + x + a] && x + a >= 0 && x + a < N && y + c >= 0 && y + c < N)) {
          r = 14; g = 10; b = 30;
        }
        out.data.set([Math.min(255, r), Math.min(255, g), Math.min(255, b), 255], i * 4);
      }
    }
    sc.putImageData(out, 0, 0);
    picCache.set(e, sm);
    return sm;
  }

  function makeStage() {
    const R = rnd(4);
    const p = P(W, H);
    p.rect(0, 0, W, H, '#1a0c24');
    // ม่านแดงจับจีบ
    for (let x = 0; x < W; x++) {
      const fold = Math.sin(x / 3.2);
      p.rect(x, 0, 1, 196, fold > 0.5 ? '#c8303a' : fold > -0.3 ? '#9a1f2a' : '#6a141c');
    }
    for (let x = 0; x < W; x += 12) for (let y = 0; y < 196; y += 2) if (Math.sin(x / 3.2) > 0.7) p.px(x, y, '#e04a52');
    // ระบายทอง + พู่
    p.rect(0, 0, W, 9, '#e0a81e');
    p.rect(0, 9, W, 2, '#b07a12');
    for (let x = 0; x < W; x += 10) {
      p.poly([[x, 11], [x + 5, 19], [x + 10, 11]], '#e0a81e');
      p.px(x + 5, 20, '#ffd166');
    }
    // ฉากหลังเวที (ผนังม่วงลายดาว) หลังกรอบภาพ
    p.rect(14, 40, W - 28, 152, '#2a1640');
    for (let i = 0; i < 40; i++) p.px(16 + Math.floor(R() * (W - 32)), 42 + Math.floor(R() * 148), R() < 0.5 ? '#5a3a8a' : '#3a2458');
    // ป้ายเกมโชว์ใต้กรอบ
    p.orect(36, 178, 108, 12, '#7a3fd1');
    p.rect(37, 179, 106, 2, '#9a6ae0');
    // พื้นเวทีมันวาว
    p.rect(0, 192, W, 6, '#e0a81e');
    p.rect(0, 197, W, 1, '#b07a12');
    for (let y = 198; y < 212; y++) for (let x = 0; x < W; x++) p.px(x, y, ((x >> 3) + (y >> 2)) % 2 ? '#3a2458' : '#2a1840');
    // ที่นั่งผู้ชม (อัฒจันทร์)
    for (const [i, y] of ROWS.entries()) {
      p.rect(0, y - 2, W, 4, i % 2 ? '#3a1a3a' : '#4a2048');
      p.rect(0, y - 2, W, 1, '#6a3060');
    }
    p.dither(258, H, '#2a1238', '#140820');
    return p.cv;
  }

  const G = {
    toastTop: 1176, // ป้ายของขวัญอยู่ขอบเวที เหนือแถวคนดู (ใต้กรอบภาพเป็นแผงสถานะ)
    // วิธีเล่นเป็นแถบป้ายเล็ก ๆ ใต้ชื่อเกม (พอดีช่องเหนือกรอบภาพ) • แผงสถานะอยู่บนแถบม่วงใต้กรอบภาพ แทนป้ายหมวด
    hintsTop: 146,
    noSub: true, // ไม่มีคำโปรยใต้ชื่อเกม (ป้ายวิธีเล่นบอกแล้ว) — ช่องเหนือกรอบภาพแคบ
    fxWorld: true,
    hints: [
      ['⌨️', 'พิมพ์คำตอบ', '5 คนแรกได้แต้ม'],
      ['❤️', 'ไลก์', 'เปิดภาพเร็วขึ้น'],
      ['🏆', 'คะแนน', 'ดูแต้มสะสม'],
      ['🎁', 'ของขวัญ', 'เปิดช่อง · คำใบ้ · เปิดครึ่งภาพ'],
    ],
    init() {
      stage = makeStage();
    },
    onEv(d, ctx) {
      if (d.ev === 'round') {
        ctx.toast(d.team ? `⚔️ รอบทีม! แดง vs น้ำเงิน · หมวด ${d.c}` : `🖼️ รอบที่ ${d.round} · หมวด ${d.c}${d.double ? ' · แต้ม ×2!' : ''}`, d.team ? 'big' : '');
        ctx.sfx('chime', 784);
      } else if (d.ev === 'correct') {
        st.hands.set(d.id, 4);
        const s = st.seat.get(d.id);
        const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][d.rank - 1] || '✅';
        if (s) ctx.label('a' + d.id, s.x + 6, s.y - 16, `${medal} ${ctx.nm(d.id, d.name)} +${d.pts}`, 4, 'gold');
        if (d.rank === 1) {
          st.confetti = 3;
          st.flash = 0.6;
          ctx.toast(`✅ ${d.name} ตอบถูกคนแรก! +${d.pts} — ยังตอบได้อีก 7 วิ (ได้แต้มลดหลั่น)`, 'big');
          ctx.sfx('chime', 1319);
        } else ctx.sfx('chime', 1047);
      } else if (d.ev === 'answer') {
        if (!d.winner) ctx.toast(`⌛ หมดเวลา! คำตอบคือ “${d.a}”`, 'big');
        else ctx.api.bigShow({ id: d.winner.id, name: d.winner.name }, `“${d.a}” · ตอบถูก ${d.solved.length} คน`);
        if (d.team?.win) setTimeout(() => ctx.toast(d.team.win === 'draw' ? `🤝 รอบทีมเสมอ ${d.team.r}:${d.team.b}` : `🏆 ${d.team.win === 'r' ? 'ทีมแดง' : 'ทีมน้ำเงิน'}ชนะรอบทีม! (${d.team.r}:${d.team.b})`, 'big'), 1600);
      } else if (d.ev === 'near') {
        st.near = 1.5;
        const s = st.seat.get(d.id);
        if (s) ctx.label('n' + d.id, s.x + 6, s.y - 16, `🤏 ${esc(d.name)} ใกล้แล้ว!`, 2.5, 'gold');
        else ctx.toast(`🤏 ${d.name} ใกล้แล้ว!`);
      } else if (d.ev === 'likeOpen') {
        ctx.sparkles(90, FY + 48, 14, '#ff8fab', 80);
      } else if (d.ev === 'double') {
        ctx.toast('✨ รอบโบนัส แต้ม ×2 ทั้งไลฟ์!', 'big');
      }
    },
    gift(tier, user, n, f, ctx) {
      ctx.toast(`${f.icon} ${user?.name || 'มีคน'} → ${f.label}`, tier === 3 ? 'big' : '');
      ctx.sparkles(90, FY + 48, 30, '#ffd166', 90);
    },
    frame(c, ts, dt, ctx) {
      const S = ctx.S;
      st.confetti = Math.max(0, st.confetti - dt);
      st.flash = Math.max(0, st.flash - dt);
      st.near = Math.max(0, st.near - dt);
      c.drawImage(stage, 0, 0);
      // สปอตไลต์ส่าย
      for (let k = 0; k < 2; k++) {
        const cx = 90 + Math.sin(ts * 0.8 + k * 2.5) * 60;
        c.fillStyle = 'rgba(255,240,200,.07)';
        for (let y = 12; y < 200; y += 2) {
          const w = 4 + (y - 12) * 0.25;
          const x = (k ? 170 : 10) + (cx - (k ? 170 : 10)) * ((y - 12) / 188);
          c.fillRect(Math.round(x - w / 2), y, Math.round(w), 2);
        }
      }
      // กรอบทอง + ไฟกะพริบรอบกรอบ
      const fw = N * B;
      c.fillStyle = O;
      c.fillRect(FX - 7, FY - 7, fw + 14, fw + 14);
      c.fillStyle = '#e0a81e';
      c.fillRect(FX - 6, FY - 6, fw + 12, fw + 12);
      c.fillStyle = '#b07a12';
      c.fillRect(FX - 3, FY - 3, fw + 6, fw + 6);
      const bulbs = [];
      for (let i = 0; i <= 12; i++) bulbs.push([FX - 5 + (i * (fw + 10)) / 12, FY - 5], [FX - 5 + (i * (fw + 10)) / 12, FY + fw + 4]);
      for (let i = 1; i < 12; i++) bulbs.push([FX - 5, FY - 5 + (i * (fw + 10)) / 12], [FX + fw + 4, FY - 5 + (i * (fw + 10)) / 12]);
      bulbs.forEach(([x, y], i) => {
        c.fillStyle = (Math.floor(ts * 6) + i) % 2 ? '#fff3c4' : '#e8453c';
        c.fillRect(Math.round(x), Math.round(y), 2, 2);
      });
      // ภาพปริศนา + ช่องที่ยังปิด
      if (S.e) {
        const pic = picOf(S.e);
        c.imageSmoothingEnabled = false;
        c.drawImage(pic, FX, FY, fw, fw);
        const tw = fw / 4;
        for (let i = 0; i < 16; i++) {
          if ((S.mask || 0) & (1 << i)) continue;
          const x = FX + (i % 4) * tw;
          const y = FY + Math.floor(i / 4) * tw;
          c.fillStyle = '#3a2e5e';
          c.fillRect(x, y, tw, tw);
          c.fillStyle = '#5c4a8a';
          c.fillRect(x, y, tw, 1);
          c.fillRect(x, y, 1, tw);
          c.fillStyle = '#241a40';
          c.fillRect(x, y + tw - 1, tw, 1);
          c.fillRect(x + tw - 1, y, 1, tw);
          // เครื่องหมายคำถามพิกเซล
          const qx = x + tw / 2 - 3;
          const qy = y + tw / 2 - 5;
          c.fillStyle = (Math.floor(ts * 2) + i) % 3 ? '#ffd166' : '#fff3c4';
          for (const [a, b] of [[1, 0], [2, 0], [3, 0], [4, 1], [4, 2], [3, 3], [2, 4], [2, 5], [2, 8]]) c.fillRect(qx + a, qy + b, 1, 1);
        }
      } else {
        c.fillStyle = '#1a2a4a';
        c.fillRect(FX, FY, fw, fw);
      }
      if (st.flash > 0) {
        c.globalAlpha = st.flash * 0.6;
        c.fillStyle = '#ffffff';
        c.fillRect(FX, FY, fw, fw);
        c.globalAlpha = 1;
      }
      // พิธีกรถือไมค์ (ซ้ายเวที)
      const host = K.hero('host-mc', Math.floor(ts * 2) % 2 && st.near > 0 ? 1 : 0, { shirt: ['#1b1426', '#3a3050'], arm: Math.sin(ts * 2) > 0.5 ? 'up' : '' });
      c.drawImage(host, 4 - K.HX, 177 - K.HY);
      c.fillStyle = '#9aa6b8';
      c.fillRect(15, 183, 2, 3);
      c.fillStyle = O;
      c.fillRect(15, 182, 2, 1);
      // ผู้ชม (คนดู) 3 แถว
      const actors = ctx.actors().slice(-30);
      st.seat.clear();
      actors.forEach((a, i) => {
        const row = i % 3;
        const col = Math.floor(i / 3);
        const x = 4 + col * 17 + (row % 2) * 8;
        const y = ROWS[row];
        st.seat.set(a.id, { x, y });
        const hv = st.hands.get(a.id) || 0;
        if (hv > 0) st.hands.set(a.id, hv - dt);
        const jump = hv > 0 && S.winner?.id === a.id ? Math.round(Math.abs(Math.sin(ts * 10)) * 3) : 0;
        const spr = K.hero(a.id, 0, { arm: hv > 0 ? 'up' : '', crown: a.id === S.lead });
        c.drawImage(spr, x - K.HX, y - 15 - K.HY - jump);
      });
      // พลุกระดาษ
      if (st.confetti > 0) for (let i = 0; i < 5; i++) ctx.parts.push({ x: Math.random() * W, y: 12, vx: (Math.random() - 0.5) * 30, vy: 30 + Math.random() * 30, life: 3, c: ['#ffd166', '#e8453c', '#5fd068', '#3b6fd8', '#ff8fab'][i], g: 10, sz: 2 });
      // คำใบ้/หมวดบนป้ายใต้กรอบ
      const sub = S.phase === 'answer' ? (S.answer ? `เฉลย: ${S.answer}` : '') : S.hint ? `💡 ${S.hint}` : `หมวด: ${S.c || '-'}`;
      st.sub = sub; // แสดงในแผงสถานะใต้กรอบภาพ
    },
    hud(ctx) {
      const S = ctx.S;
      const left = ctx.left();
      const board = (S.board || []).map((x, i) => `${['🥇', '🥈', '🥉'][i]} ${esc(x.n)} ${x.s}`).join(' · ');
      const fame = (S.fame || [])[0];
      const sub = st.sub || `หมวด: ${S.c || '-'}`;
      const n = (S.solved || []).length;
      const info = S.teamMode ? `⚔️ รอบทีม <b style="color:#ff8a6a">แดง ${S.tround?.r || 0}</b> vs <b style="color:#7aa8ff">น้ำเงิน ${S.tround?.b || 0}</b> · รวม ${S.tscore?.r || 0}:${S.tscore?.b || 0}`
        : n && S.phase === 'show' ? `<span style="color:#5fd068">✅ ตอบถูกแล้ว ${n}/5 คน — ยังทันได้แต้ม!</span>`
        : board || (fame ? `👑 เซียนตลอดกาล ${esc(fame.n)} ${fame.s.toLocaleString('en-US')} แต้ม` : 'ยังไม่มีคนตอบถูก');
      return `<div class="slim" style="top:1083px;width:860px">
          <div class="l"><span>🖼️ รอบที่ ${S.round || 1}${S.double ? ' · <b class="gold">แต้ม ×2</b>' : ''}</span><b class="${S.phase === 'answer' ? 'gold' : ''}">${esc(sub)}</b><span class="sp"></span><span>เปิด ${S.opened || 0}/16</span><b class="gold">${S.phase === 'show' ? `⏱️ ${left}` : '⏳'}</b></div>
          <div class="s">${info}</div>
        </div>`;
    },
    onChat(d, ctx) {
      const s = st.seat.get(d.id);
      st.hands.set(d.id, 2);
      if (s) ctx.label('a' + d.id, s.x + 6, s.y - 16, esc(String(d.text).slice(0, 20)), 2.5, 'say');
    },
    css: () => '.mg-lab.say { font-size: 26px; }',
  };

  window.MG_GAMES.quiz = G;
})();
