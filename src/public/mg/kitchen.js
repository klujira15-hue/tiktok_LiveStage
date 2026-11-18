/* มินิเกม: ครัวช่วยกันทำ (ภาพ) — ครัวร้านอาหารไทย บิลแขวนบนราว เชฟ (คนดู) หลังเคาน์เตอร์ เตาไฟลุก
 * วัตถุดิบ 11 อย่างวาดเป็นไอคอนพิกเซล • ใส่วัตถุดิบ = ลอยจากถังเข้ากระทะ • ลูกค้ารอหน้าร้านตามบิล
 */
(() => {
  const K = window.PixelKit;
  const { P, O, W, H, hsh, rnd, esc } = K;
  const COUNTER = 196;
  const BILL_X = [4, 63, 122];
  const BINS = ['หมู', 'ไก่', 'กุ้ง', 'ไข่', 'ผัก', 'พริก', 'กระเทียม', 'ข้าว', 'เส้น', 'มะนาว', 'ซอส'];
  let room = null;
  const icons = {};
  const STX = { cut: [10, 32], fry: [62, 106], boil: [128, 150] };
  const ST_ICON = { cut: '🔪 หั่น', fry: '🔥 ผัด', boil: '🍲 ต้ม' };
  const st = { stOf: new Map(), flame: 0, fly: [], cust: new Map(), chefJob: new Map(), plates: [] };

  // ---------------------------------------------------------------- ไอคอนวัตถุดิบ 9x9
  const ICON = {
    หมู: (p) => { p.oell(4, 4, 4, 3, '#f2a0a0'); p.rect(2, 3, 5, 1, '#ffd0d0'); p.rect(2, 5, 5, 1, '#e88080'); },
    ไก่: (p) => { p.oell(5, 3, 3, 3, '#e0a050'); p.rect(1, 6, 3, 2, '#fff3e0'); p.px(1, 7, O); p.px(4, 2, '#f2c080'); },
    กุ้ง: (p) => { for (let i = 0; i < 7; i++) p.rect(1 + i, 4 + Math.round(Math.sin(i / 2) * -1.5), 1, 3, i % 2 ? '#ff8a3d' : '#ffb070'); p.px(7, 2, O); p.line(8, 3, 8, 0, '#ff8a3d'); },
    ไข่: (p) => { p.oell(4, 4, 3, 4, '#fff8e8'); p.px(3, 2, '#ffffff'); },
    ผัก: (p) => { p.oell(4, 4, 4, 3, '#4fae48'); p.rect(4, 2, 1, 5, '#c8f7c0'); p.px(2, 3, '#78c060'); },
    พริก: (p) => { p.line(1, 6, 6, 2, '#e8453c'); p.line(2, 6, 7, 2, '#c8303a'); p.px(7, 1, '#3f9a4a'); p.px(8, 0, '#3f9a4a'); },
    กระเทียม: (p) => { p.oell(4, 5, 3, 3, '#f2efe6'); p.line(4, 1, 4, 3, '#c8c2b0'); p.px(3, 5, '#d8d2c0'); p.px(5, 5, '#d8d2c0'); },
    ข้าว: (p) => { p.rect(1, 5, 7, 3, '#7cc6f2'); p.oell(4, 4, 3, 2, '#ffffff'); p.rect(2, 7, 5, 1, '#3a8ad0'); },
    เส้น: (p) => { for (let i = 0; i < 4; i++) p.line(1 + i * 2, 1, 2 + i * 2, 7, i % 2 ? '#ffd166' : '#f2c050'); },
    มะนาว: (p) => { p.oell(4, 4, 3, 3, '#8ad848'); p.ell(4, 4, 2, 2, '#c8f088'); p.px(4, 4, '#fff8c8'); },
    ซอส: (p) => { p.orect(3, 2, 3, 6, '#5a3420'); p.rect(4, 0, 1, 2, '#e8453c'); p.px(4, 4, '#ffd166'); },
  };
  function icon(k) {
    if (icons[k]) return icons[k];
    const p = P(9, 9);
    ICON[k]?.(p);
    icons[k] = p.cv;
    return p.cv;
  }

  // ---------------------------------------------------------------- ฉากครัว
  function makeRoom() {
    const R = rnd(6);
    const p = P(W, H);
    // ผนังกระเบื้องเขียวมิ้นต์
    for (let y = 0; y < COUNTER; y++) for (let x = 0; x < W; x++) {
      const tx = x % 9;
      const ty = y % 9;
      p.px(x, y, tx === 0 || ty === 0 ? '#b8d8c8' : tx + ty < 4 ? '#f0fff8' : '#d8f0e4');
    }
    // หน้าต่างมองเห็นถนนยามเย็น
    p.orect(130, 124, 44, 30, '#7a4a2a');
    p.dither(125, 153, '#ffb870', '#ff8a5a', 131, 173);
    for (let x = 132; x < 172; x += 7) p.rect(x, 140 - ((x * 3) % 9), 6, 13 + ((x * 3) % 9), '#5a3a5a');
    p.rect(151, 125, 2, 28, '#7a4a2a');
    p.rect(131, 138, 42, 2, '#7a4a2a');
    // ชั้นวางไห/ขวด + เครื่องเทศ
    p.rect(0, 150, 126, 3, '#9a6a3a');
    p.rect(0, 153, 126, 1, '#6a4428');
    for (let x = 4; x < 122; x += 10) {
      const col = ['#e8453c', '#ffd166', '#5fd068', '#c8925a', '#ffffff', '#ff8a3d'][Math.floor(R() * 6)];
      const h = 8 + Math.floor(R() * 5);
      p.orect(x, 150 - h, 8, h, col);
      p.rect(x + 2, 150 - h - 2, 4, 2, '#7a4a2a');
      p.rect(x + 1, 150 - h + 2, 6, 2, '#fffbe8');
    }
    // กระทะ/ทัพพีแขวน
    p.rect(0, 122, 126, 1, '#6b7280');
    for (const [x, k] of [[8, 'pan'], [24, 'ladle'], [36, 'pan'], [52, 'spat'], [64, 'ladle'], [78, 'pan'], [96, 'spat'], [108, 'ladle']]) {
      p.rect(x + 3, 122, 1, 4, '#3a3d45');
      if (k === 'pan') p.oell(x + 3, 131, 4, 4, '#3a3d45'), p.ell(x + 2, 130, 2, 2, '#5a5e68');
      else if (k === 'ladle') p.rect(x + 3, 126, 1, 8, '#9aa6b8'), p.oell(x + 3, 135, 2, 2, '#9aa6b8');
      else p.rect(x + 3, 126, 1, 7, '#7a4a2a'), p.rect(x + 1, 133, 5, 3, '#9aa6b8');
    }
    // เครื่องดูดควันเหนือเตา
    p.poly([[62, 156], [118, 156], [108, 170], [72, 170]], '#9aa6b8');
    p.rect(72, 170, 36, 2, '#6b7280');
    p.rect(64, 156, 52, 1, '#c8d0dc');
    // ราวบิล
    p.rect(0, 62, W, 3, '#9aa6b8');
    p.rect(0, 64, W, 1, '#6b7280');
    // เคาน์เตอร์สเตนเลส + ตู้ล่าง
    p.rect(0, COUNTER, W, 5, '#c8d0dc');
    p.rect(0, COUNTER, W, 1, '#f0f4f8');
    p.rect(0, COUNTER + 5, W, 1, '#6b7280');
    for (let y = COUNTER + 6; y < 262; y++) for (let x = 0; x < W; x++) p.px(x, y, x % 30 === 0 ? '#4a5060' : (y % 2 ? '#7a8090' : '#6b7280'));
    for (let x = 12; x < W; x += 30) p.rect(x, COUNTER + 18, 6, 2, '#c8d0dc');
    // พื้นร้าน (ลูกค้ายืน)
    for (let y = 262; y < H; y++) for (let x = 0; x < W; x++) p.px(x, y, ((x >> 3) + (y >> 3)) % 2 ? '#c8a878' : '#b8986a');
    // อุปกรณ์บนเคาน์เตอร์: เขียง, หม้อต้ม, หม้อหุงข้าว
    p.orect(6, COUNTER - 4, 40, 4, '#c8925a');
    p.orect(132, COUNTER - 20, 30, 20, '#9aa6b8');
    p.rect(130, COUNTER - 20, 34, 3, '#6b7280');
    p.orect(166, COUNTER - 12, 12, 12, '#f2efe6');
    p.rect(168, COUNTER - 8, 8, 1, '#e8453c');
    return p.cv;
  }

  function chefSpots(n) {
    const xs = [12, 34, 56, 104, 124, 146];
    return xs.slice(0, n);
  }

  const G = {
    toastTop: 872, // ป้ายของขวัญอยู่ใต้ชั้นวาง เหนือหัวเชฟ
    // ด้านบนเป็นกระดานบิล → แผงสถานะแบบบางแทรกใต้ชื่อเกม • วิธีเล่นวางบนชั้นวางเครื่องปรุง (ของตกแต่ง) เหนือเชฟ
    hintsTop: 688,
    noSub: true,
    fxWorld: true,
    hints: [
      ['🥢', 'หมู/ไข่/พริก…', 'ใส่ตามบิล'],
      ['🍽️', 'เสิร์ฟ', 'ส่งจานที่ครบ'],
      ['🔪', 'หั่น/ผัด/ต้ม', 'เลือกสถานี'],
      ['❤️', 'ไลก์', 'ไฟลุก·เติมของ'],
      ['🎁', 'ของขวัญ', 'ต่อเวลา·VIP'],
    ],
    foot: 'หั่น: ผัก พริก กระเทียม มะนาว · ผัด: หมู ไก่ กุ้ง ไข่ · ต้ม: ข้าว เส้น ซอส · 🌟 ลูกค้าดังทิป ×3',
    init() {
      room = makeRoom();
    },
    apply(S) {
      if (S.stationOf) for (const [id, s] of Object.entries(S.stationOf)) st.stOf.set(id, s);
    },
    onEv(d, ctx) {
      if (d.ev === 'station') {
        st.stOf.set(d.id, d.st);
        if (!d.auto) ctx.toast(`${ST_ICON[d.st]} ${d.name} ประจำสถานี${d.st === 'cut' ? 'หั่น' : d.st === 'fry' ? 'ผัด' : 'ต้ม'}`);
        return;
      }
      if (d.ev === 'add') {
        const bi = (ctx.S.bills || []).findIndex((b) => b.id === d.bid);
        const tx = bi >= 0 ? BILL_X[bi] + 27 : 90;
        const sx = 8 + BINS.indexOf(d.ing) * 15.5 + 4;
        st.fly.push({ ing: d.ing, x0: sx, y0: COUNTER + 22, x1: 88, y1: COUNTER - 12, t: 0, tx });
        st.flame = 0.6;
        if (d.id) {
          st.chefJob.set(d.id, 0.6);
          const spots = chefSpots(6);
          const i = [...st.chefs.keys()].indexOf(d.id);
          const p = st.chefPos?.get(d.id);
          if (p) ctx.label('c' + d.id, p + 6, COUNTER - 22, `${ctx.nm(d.id, d.name)} +${esc(d.ing)}${d.expert && d.n > 1 ? ' ×2' : ''}`, 1.6, d.expert ? 'gold' : '');
        }
        if (d.ready) ctx.sfx('chime', 1047);
      } else if (d.ev === 'waste') {
        const bx = 8 + BINS.indexOf(d.ing) * 15.5 + 7;
        ctx.label('w' + d.ing, bx, COUNTER + 15, `🤔 ไม่มีบิลใช้`, 1.4);
      } else if (d.ev === 'serve') {
        st.plates.push({ dish: d.dish, t: 0 });
        ctx.num(150, 238, `+${d.tip} 💰`, '#ffd166', 46);
        if (d.combo >= 3) ctx.toast(`🔥 คอมโบ ×${d.combo}! ${d.dish}${d.by ? ` (เสิร์ฟโดย ${d.by})` : ''}`, d.combo % 5 === 0 ? 'big' : '');
        ctx.sfx('chime', 1319);
        const c = st.cust.get(d.bid);
        if (c) (c.happy = 1), (c.leave = 1);
      } else if (d.ev === 'expire') {
        ctx.toast(`😤 ลูกค้า “${d.dish}” รอนานเกินไป เดินออกแล้ว`);
        const c = st.cust.get(d.bid);
        if (c) (c.angry = 1), (c.leave = 1);
      } else if (d.ev === 'bill') {
        ctx.sfx('pop');
        if (d.vip) ctx.toast('💎 ลูกค้า VIP มาแล้ว! ทิป ×4', 'big');
        if (d.celeb) {
          ctx.toast(`🌟 ลูกค้าดังมาแล้ว! สั่ง “${d.dish}” 5 อย่าง ทิป ×3`, 'big');
          ctx.sfx('chime', 1568);
        }
      }
    },
    gift(tier, user, n, f, ctx) {
      ctx.toast(`${f.icon} ${user?.name || 'มีคน'} → ${f.label}`, tier === 3 ? 'big' : '');
      st.flame = 2;
      if (tier === 3) ctx.api.bigShow(user, 'ลูกค้า VIP ทิปหนัก!');
    },
    frame(c, ts, dt, ctx) {
      const S = ctx.S;
      st.flame = Math.max(0, st.flame - dt);
      c.drawImage(room, 0, 0);
      // บิลแขวน (กระดาษ + หนีบ) — ข้อความเป็น DOM
      (S.bills || []).forEach((b, i) => {
        const x = BILL_X[i];
        const sway = Math.round(Math.sin(ts * 1.5 + i) * 0.6);
        c.fillStyle = O;
        c.fillRect(x - 1 + sway, 66, 56, 52);
        c.fillStyle = b.vip || b.celeb ? '#fff3c4' : '#fffbe8';
        c.fillRect(x + sway, 67, 54, 50);
        c.fillStyle = b.ready ? '#5fd068' : b.left < 10 ? (Math.sin(ts * 10) > 0 ? '#e8453c' : '#ff8a6a') : b.vip || b.celeb ? '#e0a81e' : '#ff8a3d';
        c.fillRect(x + sway, 67, 54, 6);
        c.fillStyle = '#9aa6b8';
        c.fillRect(x + 24 + sway, 62, 6, 5);
        // ไอคอนวัตถุดิบในบิล
        b.need.forEach((ing, k) => {
          const ix = x + 2 + sway + k * (b.need.length > 4 ? 10 : 12);
          c.drawImage(icon(ing), ix, 95);
          if (b.have.includes(ing)) {
            c.fillStyle = '#2f9e44';
            c.fillRect(ix + 6, 101, 3, 3);
            c.fillStyle = '#ffffff';
            c.fillRect(ix + 7, 102, 1, 1);
          } else {
            c.fillStyle = 'rgba(255,251,232,.55)';
            c.fillRect(ix, 95, 9, 9);
          }
        });
        // แถบเวลา
        const k = Math.max(0, b.left / b.max);
        c.fillStyle = '#d8d2c0';
        c.fillRect(x + 3 + sway, 106, 48, 3);
        c.fillStyle = k > 0.5 ? '#5fd068' : k > 0.25 ? '#ffd166' : '#e8453c';
        c.fillRect(x + 3 + sway, 106, Math.round(48 * k), 3);
        const miss = b.need.filter((x) => !b.have.includes(x));
        ctx.label('b' + b.id, x + 27, 74, `<div class="d">${b.vip ? '💎 ' : b.celeb ? '🌟 ' : ''}${esc(b.dish)}</div>${b.ready ? '<div class="ok">✅ พิมพ์ “เสิร์ฟ”</div>' : `<div class="miss">ขาด ${miss.map(esc).join(' ')}</div>`}`, 0.6, 'bill');
        ctx.label('bt' + b.id, x + 27, 110, `⏱️ ${b.left} วิ`, 0.6, 'billt');
      });
      // ไอน้ำหม้อ + ควันกระทะ
      if (Math.random() < 0.3) ctx.parts.push({ x: 140 + Math.random() * 16, y: COUNTER - 22, vx: (Math.random() - 0.5) * 4, vy: -14, life: 1.4, c: 'rgba(255,255,255,.7)', g: 0 });
      // เตา + กระทะ (ไฟลุกแรงขึ้นตอนใส่ของ)
      c.fillStyle = '#3a3d45';
      c.fillRect(70, COUNTER - 4, 40, 4);
      const fl = 6 + st.flame * 14;
      for (let k = 0; k < fl; k++) {
        c.fillStyle = ['#ffd166', '#ff8a3d', '#e8453c', '#fff3c4'][k % 4];
        c.fillRect(74 + Math.floor(Math.random() * 32), COUNTER - 6 - Math.floor(Math.random() * (4 + st.flame * 10)), 1, 2);
      }
      const toss = st.flame > 0 ? Math.round(Math.sin(ts * 20) * 2) : 0;
      c.fillStyle = O;
      c.fillRect(72, COUNTER - 12 + toss, 36, 6);
      c.fillStyle = '#4a4d55';
      c.fillRect(73, COUNTER - 11 + toss, 34, 4);
      c.fillStyle = '#7a4a2a';
      c.fillRect(107, COUNTER - 10 + toss, 9, 2);
      for (let k = 0; k < 5; k++) {
        c.fillStyle = ['#e8907a', '#5fd068', '#ffd166', '#ff8a3d', '#ffffff'][k];
        c.fillRect(78 + k * 6, COUNTER - 13 + toss - (st.flame > 0 ? Math.round(Math.abs(Math.sin(ts * 15 + k)) * 5) : 0), 3, 2);
      }
      // เชฟ (คนดู) หลังเคาน์เตอร์
      const all = ctx.actors();
      const by = { cut: [], fry: [], boil: [] };
      for (const a of all) {
        const s = st.stOf.get(a.id) || ['cut', 'fry', 'boil'][hsh(a.id) % 3];
        if (by[s].length < 2) by[s].push(a);
      }
      st.chefs = new Map();
      st.chefPos = new Map();
      for (const s of ['cut', 'fry', 'boil']) {
        by[s].forEach((a, i) => {
          const x = STX[s][i];
          st.chefs.set(a.id, a);
          st.chefPos.set(a.id, x);
          const j = st.chefJob.get(a.id) || 0;
          if (j > 0) st.chefJob.set(a.id, j - dt);
          const spr = K.hero(a.id, 0, { hat: 'chef', tool: j > 0 ? (s === 'cut' ? 'sword' : 'pan') : null, arm: j > 0 ? 'up' : '', crown: a.id === S.lead });
          c.drawImage(spr, x - K.HX, COUNTER - 15 - K.HY + (j > 0 ? -1 : 0));
        });
      }
      // ขอบหน้าเคาน์เตอร์ (บังขาเชฟ)
      c.fillStyle = '#c8d0dc';
      c.fillRect(0, COUNTER, W, 5);
      c.fillStyle = '#f0f4f8';
      c.fillRect(0, COUNTER, W, 1);
      // ถังวัตถุดิบหน้าตู้
      BINS.forEach((k, i) => {
        const x = 8 + i * 15.5;
        c.fillStyle = O;
        c.fillRect(Math.round(x) - 1, COUNTER + 16, 15, 14);
        c.fillStyle = '#9a6a3a';
        c.fillRect(Math.round(x), COUNTER + 17, 13, 12);
        c.fillStyle = '#c8925a';
        c.fillRect(Math.round(x), COUNTER + 17, 13, 2);
        c.drawImage(icon(k), Math.round(x) + 2, COUNTER + 19);
      });
      // วัตถุดิบลอยเข้ากระทะ
      for (let i = st.fly.length - 1; i >= 0; i--) {
        const f = st.fly[i];
        f.t += dt;
        const k = Math.min(1, f.t / 0.6);
        const x = f.x0 + (f.x1 - f.x0) * k;
        const y = f.y0 + (f.y1 - f.y0) * k - Math.sin(k * Math.PI) * 30;
        c.drawImage(icon(f.ing), Math.round(x) - 4, Math.round(y) - 4);
        if (k >= 1) {
          st.fly.splice(i, 1);
          for (let q = 0; q < 6; q++) ctx.parts.push({ x: 90, y: COUNTER - 12, vx: (Math.random() - 0.5) * 40, vy: -30 - Math.random() * 20, life: 0.4, c: '#ffd166', g: 80 });
        }
      }
      // ลูกค้าหน้าร้าน (1 คนต่อบิล)
      const bills = S.bills || [];
      for (const b of bills) if (!st.cust.has(b.id)) st.cust.set(b.id, { id: 'cust' + b.id, x: W + 10, tx: 20 + bills.indexOf(b) * 50, leave: 0, happy: 0, angry: 0 });
      for (const [bid, cu] of st.cust) {
        const bi = bills.findIndex((b) => b.id === bid);
        if (bi >= 0 && !cu.leave) cu.tx = 20 + bi * 50;
        if (cu.leave) cu.tx = W + 30;
        const dx = cu.tx - cu.x;
        cu.x += Math.sign(dx) * Math.min(Math.abs(dx), dt * 40);
        const walking = Math.abs(dx) > 1;
        const spr = K.hero(cu.id, walking ? [1, 0, 2, 0][Math.floor(ts * 8) % 4] : 0, { arm: cu.happy ? 'up' : '', crown: !!bills.find((b) => b.id === bid)?.celeb });
        c.drawImage(spr, Math.round(cu.x) - K.HX, 264 - 15 - K.HY);
        if (bills.find((b) => b.id === bid)?.celeb) {
          c.fillStyle = O;
          c.fillRect(Math.round(cu.x) + 2, 264 - 15 + 4, 8, 2);
          if (Math.random() < 0.1) ctx.parts.push({ x: cu.x + 6 + (Math.random() - 0.5) * 12, y: 246, vx: 0, vy: -10, life: 0.6, c: '#ffd166', g: 0, plus: true });
        }
        // อารมณ์ลูกค้า
        const b = bills[bi];
        const mood = cu.happy ? '#5fd068' : cu.angry ? '#e8453c' : b && b.left < 10 ? '#ff8a3d' : '#ffffff';
        c.fillStyle = O;
        c.fillRect(Math.round(cu.x) + 3, 236, 7, 6);
        c.fillStyle = mood;
        c.fillRect(Math.round(cu.x) + 4, 237, 5, 4);
        if (cu.leave && cu.x > W + 20) st.cust.delete(bid);
      }
      // จานที่เสิร์ฟ ไหลไปหาลูกค้า
      for (let i = st.plates.length - 1; i >= 0; i--) {
        const pl = st.plates[i];
        pl.t += dt;
        const x = 90 + pl.t * 60;
        c.fillStyle = O;
        c.fillRect(Math.round(x) - 6, COUNTER - 4, 13, 4);
        c.fillStyle = '#ffffff';
        c.fillRect(Math.round(x) - 5, COUNTER - 3, 11, 2);
        c.fillStyle = '#ff8a3d';
        c.fillRect(Math.round(x) - 2, COUNTER - 5, 5, 2);
        if (pl.t > 1.6) st.plates.splice(i, 1);
      }
    },
    hud(ctx) {
      const S = ctx.S;
      const stars = '⭐'.repeat(S.stars || 3) + '☆'.repeat(5 - (S.stars || 3));
      const top = (S.top || []).map((x) => esc(x.n)).join(' · ');
      return `<div class="slim" style="top:146px">
          <div class="l"><span>${stars}${S.vip ? ' <b class="gold">💎 VIP</b>' : ''}</span><span>🍽️ ${S.served || 0} จาน · 💰 ทิป ${(S.tips || 0).toLocaleString('en-US')}</span><span class="sp"></span><b class="gold">🔥 คอมโบ ×${S.combo || 0}</b></div>
          <div class="s">${top ? `👨‍🍳 ${top}` : `สถิติคอมโบ ${S.best || 0}`}</div>
        </div>`;
    },
    // ป้ายชื่อวัตถุดิบใต้ถัง + จำนวนเชฟแต่ละสถานี (วางตรงภาพเกม)
    world(ctx) {
      const S = ctx.S;
      return BINS.map((k, i) => `<div class="bin" style="left:${Math.round((8 + i * 15.5 + 6.5) * 6)}px">${k}</div>`).join('') +
        Object.entries(STX).map(([s, xs]) => `<div class="stn" style="left:${Math.round(((xs[0] + xs[1]) / 2 + 6) * 6)}px">${ST_ICON[s]} ${S.stations?.[s] || 0}</div>`).join('');
    },
    onChat(d, ctx) {
      // ฟองคำพูดของเชฟ (ไม่แสดงคำสั่งวัตถุดิบ)
      if (!st.chefs?.has(d.id)) return;
      const t = String(d.text).replace(/\s+/g, '');
      if (BINS.includes(t) || /^(เสิร์ฟ|เสริฟ|ส่ง|serve|หั่น|ผัด|ทอด|ต้ม)$/.test(t)) return;
      const p = st.chefPos?.get(d.id);
      if (p !== undefined) ctx.label('c' + d.id, p + 6, COUNTER - 22, esc(String(d.text).slice(0, 20)), 2.5, 'say');
    },
    css: () => `.mg-lab.bill { background: transparent; border: 0; color: #1b1426; text-align: center; padding: 0; transform: translate(-50%, 0); width: 316px; white-space: nowrap; }
      .mg-lab.bill .d { font-size: 26px; line-height: 1.05; overflow: hidden; text-overflow: ellipsis; }
      .mg-lab.bill .miss { font-size: 22px; line-height: 1.15; color: #c8303a; font-weight: 800; overflow: hidden; text-overflow: ellipsis; }
      .mg-lab.bill .ok { font-size: 22px; line-height: 1.15; color: #2f9e44; font-weight: 800; }
      .mg-lab.billt { background: transparent; border: 0; color: #5a4a3a; padding: 0; transform: translate(-50%, 0); font-size: 20px; font-weight: 800; }
      .mg-hud .stn { position: absolute; top: ${(COUNTER - 34) * 6}px; transform: translateX(-50%); padding: 0 10px 2px; background: rgba(12,8,24,.85); border: 3px solid #ffd166; font-size: 22px; font-weight: 800; white-space: nowrap; }
      .mg-hud .bin { position: absolute; top: ${(COUNTER + 30) * 6}px; transform: translateX(-50%); font-size: 20px; font-weight: 800; color: #fff; text-shadow: 3px 0 0 #1b1426, -3px 0 0 #1b1426, 0 3px 0 #1b1426, 0 -3px 0 #1b1426; white-space: nowrap; }`,
  };

  window.MG_GAMES.kitchen = G;
})();
