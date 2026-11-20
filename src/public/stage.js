/* TikTok Live Stage — engine กลาง (1080x1920)
 * ส่วนที่ทุกธีมใช้ร่วมกัน: ย่อขยายจอ, socket, คนดู, ของขวัญ, อนุภาค, เสียง, TTS
 * ภาพฉากและเอฟเฟกต์ของแต่ละธีมอยู่ที่ public/themes/<id>.js (ลงทะเบียนใน window.STAGE_THEMES)
 */
(() => {
  'use strict';

  // ============================================================ scale to window
  const root = document.getElementById('root');
  function fit() {
    const de = document.documentElement;
    const s = Math.min(de.clientWidth / 1080, de.clientHeight / 1920);
    root.style.transform = `translate(${(-1080 * s) / 2}px, ${(-1920 * s) / 2}px) scale(${s})`;
    if (SIZE_CHECK) showSize(de.clientWidth, de.clientHeight, s);
  }
  // ?size = บอกว่าหน้านี้ถูกวาดที่ความละเอียดเท่าไหร่ (เช็กแหล่ง Link ใน LIVE Studio ว่าเล็กไปจนภาพเบลอไหม)
  const SIZE_CHECK = new URLSearchParams(location.search).has('size');
  function showSize(w, h, s) {
    let el = document.getElementById('sizeCheck');
    if (!el) {
      el = document.createElement('div');
      el.id = 'sizeCheck';
      el.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:999;padding:18px 26px;border-radius:16px;' +
        'background:rgba(0,0,0,.88);color:#fff;font:700 22px/1.5 Kanit,sans-serif;text-align:center;border:3px solid;max-width:90vw';
      document.body.appendChild(el);
    }
    const dpr = window.devicePixelRatio || 1;
    const px = Math.round(1080 * s * dpr);
    const ok = px >= 1070;
    el.style.borderColor = ok ? '#3dff9e' : '#ff4f7a';
    el.innerHTML = `ขนาดหน้าต่าง ${w}×${h} • สเกลจอ ${dpr}<br>หน้าเวทีถูกวาดกว้าง <b>${px}</b> พิกเซล (เต็ม = 1080)<br>` +
      (ok ? '<span style="color:#3dff9e">✓ ความละเอียดเต็ม คมชัดสุดแล้ว</span>' : `<span style="color:#ff8aa5">✗ เล็กไป ${Math.round((1 - px / 1080) * 100)}% → ภาพโดนยืดจึงเบลอ<br>ตั้งขนาดแหล่ง Link เป็น 1080 × 1920</span>`) +
      '<br><small style="font-weight:400;opacity:.7">ลบ ?size ออกจากลิงก์เมื่อเช็กเสร็จ</small>';
  }
  addEventListener('resize', fit);
  fit();
  if (SIZE_CHECK) setInterval(fit, 2000); // บางโปรแกรมโหลดหน้าก่อนกำหนดขนาด → วัดซ้ำเรื่อย ๆ

  const params = new URLSearchParams(location.search);
  const SILENT = params.has('silent');
  const THUMB = params.has('thumb'); // ภาพย่อในแผงควบคุม: วาดช้าลงเพื่อประหยัดเครื่อง
  // โหมดมือถือ: ?mobile หรือเปิดจากมือถือ/แท็บเล็ตเอง (?desktop = บังคับปิด)
  const STANDALONE = matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches || navigator.standalone === true;
  const MOBILE = !THUMB && !params.has('desktop') && (params.has('mobile') || STANDALONE || (matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 900));
  const LITE = MOBILE && !params.has('full'); // ประหยัดเครื่อง: 30 fps + อนุภาคน้อยลง
  // ปรับคุณภาพอัตโนมัติ: q 0 = เต็ม, 1 = ลดอนุภาค/เฟรมตัวละคร, 2 = ประหยัดสุด
  const PERF = { q: 0, frames: 0, t0: performance.now(), fps: 0, best: 30, low: 0, high: 0, lastDown: 0, work: 0, long: 0 };
  const maxParts = () => (PERF.q >= 2 ? 500 : PERF.q >= 1 ? 1200 : LITE ? 900 : 2600);
  const THEME_OVERRIDE = params.get('theme'); // ใช้ในพรีวิวธีมของแผงควบคุม

  const $ = (id) => document.getElementById(id);
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const now = () => performance.now();
  const PALETTE = ['#ff4fa3', '#39d5ff', '#ffd23f', '#8b5cff', '#3dff9e', '#ff7b39', '#ff3b5c', '#4fffe6'];
  const fmt = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(n));
  function hash(s) {
    let h = 0;
    for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return h;
  }
  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
  }
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, (n >> 16) + amt));
    const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
    const b = Math.max(0, Math.min(255, (n & 255) + amt));
    return `rgb(${r},${g},${b})`;
  }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function wrapText(ctx, text, maxW) {
    const lines = [];
    let line = '';
    for (const ch of [...String(text)]) {
      if (ctx.measureText(line + ch).width > maxW && line) {
        lines.push(line);
        line = ch;
      } else line += ch;
    }
    if (line) lines.push(line);
    return lines;
  }

  let config = null; // publicConfig จากเซิร์ฟเวอร์
  let THEME_ID = null;
  let TH = null; // โมดูลธีม (ภาพ/เอฟเฟกต์)
  let META = null; // ข้อมูลธีมจากเซิร์ฟเวอร์ (ชื่อเอฟเฟกต์, ข้อความ)
  let T = {}; // ค่าที่ผู้ใช้ตั้งของธีมนี้ (title, gifts, ...)
  const t0 = now();

  // ============================================================ helpers
  function avatarEl(user, cls = 'pic') {
    const fallback = () => {
      const d = document.createElement('div');
      d.className = cls;
      d.style.background = user.color || PALETTE[hash(user.id || user.name) % PALETTE.length];
      d.textContent = (user.name || '?').trim().charAt(0).toUpperCase();
      return d;
    };
    if (!user.avatar) return fallback();
    const img = document.createElement('img');
    img.className = cls;
    img.referrerPolicy = 'no-referrer';
    img.src = user.avatar;
    img.onerror = () => img.replaceWith(fallback());
    return img;
  }
  const effectUi = (key) => {
    const e = META?.effects?.[key] || { icon: '🎁', label: key };
    return config?.safety?.safeMode && e.safeLabel ? { ...e, label: e.safeLabel, icon: e.safeIcon || e.icon } : e;
  };

  // ============================================================ panels
  function applyTexts() {
    const tx = META.texts;
    $('title').textContent = T.title || META.defaults.title;
    $('subtitle').textContent = T.subtitle || '';
    $('giftTitle').textContent = tx.gifts;
    $('topTitle').textContent = tx.top;
    $('queueTitle').textContent = tx.queue;
    $('hypeLabel').textContent = tx.hype;
    updateHints();
    $('songPanel').style.display = T.requestCommand || TH.renderLeft ? '' : 'none';
    const bpm = T.bpm || TH.bpm || 100;
    document.documentElement.style.setProperty('--beat', (60 / bpm).toFixed(3) + 's');
    renderGifts();
    fitHeader();
    layoutPanels();
    checkUnlock();
  }

  // ย่อตัวอักษรหัวจอ/คำโปรยอัตโนมัติถ้ายาวเกินกรอบ (แทนการตัดเป็น ...)
  function fitText(el, maxW, minPx) {
    el.style.fontSize = '';
    let size = parseFloat(getComputedStyle(el).fontSize);
    while ((el.scrollWidth > el.clientWidth + 1 || el.offsetWidth > maxW) && size > minPx) {
      size -= 2;
      el.style.fontSize = size + 'px';
    }
  }
  function fitHeader() {
    fitText($('title'), 800, 44);
    fitText($('subtitle'), 820, 24);
    for (const h of document.querySelectorAll('.panel h3')) fitText(h, 232, 18);
    for (const e of document.querySelectorAll('.gift-row .eff')) fitText(e, 9999, 15);
  }
  document.fonts?.ready.then(() => TH && fitHeader());

  function renderGifts() {
    const box = $('gifts');
    box.innerHTML = '';
    const list = [...(T.gifts || [])].sort((a, b) => a.diamonds - b.diamonds);
    for (const g of list) {
      const ui = effectUi(g.effect);
      const row = document.createElement('div');
      row.className = 'gift-row';
      row.dataset.gift = g.name.toLowerCase();
      row.innerHTML = `<div class="ico"></div><div class="txt"><div class="eff"></div><div class="gname"></div></div>`;
      const icon = window.giftIcon(g.name);
      if (icon) {
        row.querySelector('.ico').innerHTML = window.giftIconHtml(g.name);
        if(config.theme!=='templefair'){const badge=document.createElement('span');badge.className='fx';badge.textContent=ui.icon;row.querySelector('.ico').append(badge);}
      } else row.querySelector('.ico').textContent = ui.icon;
      row.querySelector('.eff').textContent = ui.label.replace(/ เต็มจอ$| โชว์ใหญ่เต็มจอ$/, '');
      // ไม่บอกราคา — รูปของขวัญจริงพอ • ยังไม่มีรูป (ยังโหลดรายการจาก TikTok ไม่ได้) ค่อยบอกชื่อ
      if (icon&&config.theme!=='templefair') row.querySelector('.gname').remove();
      else row.querySelector('.gname').textContent = THEME_ID==='templefair'?g.diamonds+' เหรียญ':g.name;
      if(THEME_ID==='templefair')row.title=g.name+' · '+g.diamonds+' เหรียญ';
      box.appendChild(row);
    }
    if(THEME_ID==='templefair'){
      const rows=[...box.querySelectorAll('.gift-row')];box.replaceChildren();
      for(let i=0;i<2;i++){
        const half=document.createElement('section');half.className='fair-gift-half';
        for(const row of rows.slice(i*4,i*4+4)){
          const price=row.querySelector('.gname');price.textContent=price.textContent.replace(' เหรียญ','');
          const coin=document.createElement('span');coin.textContent='🪙';price.append(coin);half.append(row);
        }
        const hint=document.createElement('div');hint.className='fair-mini-command';hint.textContent=i?'เซียมซี · เสี่ยงทาย':'สาธุ · สังฆทาน';half.append(hint);box.append(half);
      }
    }
  }

  let lastTop = [];
  let topMode = 'gift'; // กล่องขวา: gift = อันดับของขวัญ, today/week = แชมป์เกม
  function renderTop(list) {
    lastTop = list;
    TH?.onTop?.(list, api);
    if (topMode !== 'gift') return; // กำลังโชว์แชมป์เกมอยู่ — สลับกลับมาแล้วค่อยวาด
    const box = $('top');
    box.innerHTML = '';
    if (!list.length) box.innerHTML = `<div class="empty">${META.texts.emptyTop}</div>`;
    const rankBg = ['linear-gradient(135deg,#fff4b0,#ffb800)', 'linear-gradient(135deg,#fff,#9fb3c8)', 'linear-gradient(135deg,#ffd2a6,#c46a2b)'];
    list.forEach((u, i) => {
      const row = document.createElement('div');
      row.className = 'top-row';
      const rk = document.createElement('div');
      rk.className = 'rank';
      rk.textContent = i + 1;
      if (rankBg[i]) rk.style.background = rankBg[i];
      const nm = document.createElement('div');
      nm.className = 'nm';
      nm.innerHTML = '<div></div><div class="dm"></div>';
      nm.firstChild.textContent = u.name;
      nm.lastChild.textContent = `💎 ${fmt(u.diamonds)}`;
      row.append(rk, avatarEl(u), nm);
      box.appendChild(row);
    });
    layoutPanels();
  }

  function renderRequests(list) {
    const box = $('songs');
    box.innerHTML = '';
    if (TH.renderLeft) {
      TH.renderLeft(box, api);
      layoutPanels();
      return;
    }
    if (!list.length) box.innerHTML = `<div class="empty">${META.texts.queueEmpty}</div>`;
    // ธีมเพลง = คิว (เก่าก่อน), ธีมอื่น = คำขอล่าสุดก่อน
    const shown = META.requestAction === 'sing' ? list.slice(0, 6) : list.slice(-6).reverse();
    shown.forEach((s, i) => {
      const row = document.createElement('div');
      row.className = 'song';
      row.innerHTML = '<div class="no"></div><div class="wrap"><div class="st"></div><div class="sb"></div></div>';
      row.querySelector('.no').textContent = META.requestAction === 'sing' ? i + 1 : '•';
      row.querySelector('.st').textContent = s.text;
      row.querySelector('.sb').textContent = `${META.texts.queueBy} ${s.by}`;
      box.appendChild(row);
    });
    if (list.length > 6 && META.requestAction === 'sing') {
      const more = document.createElement('div');
      more.className = 'hint';
      more.textContent = `+ อีก ${list.length - 6}`;
      box.appendChild(more);
    }
    layoutPanels();
  }

  function layoutPanels() {
    const g = $('giftPanel');
    $('topPanel').style.top = g.offsetTop + g.offsetHeight + 14 + 'px';
    const sp = $('songPanel');
    $('feed').style.top = (sp.style.display === 'none' ? sp.offsetTop : sp.offsetTop + sp.offsetHeight + 14) + 'px';
  }

  function setHype(h, goal) {
    const pct = Math.max(0, Math.min(100, (h / (goal || 1)) * 100));
    $('hypeFill').style.width = pct + '%';
    $('hypePct').textContent = Math.floor(pct) + '%';
  }

  function setStatus(s) {
    const chip = $('liveChip');
    if (s.status === 'connected') {
      chip.className = 'chip live';
      chip.textContent = '● LIVE';
    } else {
      chip.className = 'chip test';
      chip.textContent = s.status === 'connecting' ? 'กำลังเชื่อม…' : 'TEST';
    }
  }

  // ============================================================ crowd
  const crowdEl = $('crowd');
  let ROWS = [];
  const slots = [];
  const fans = new Map(); // id -> { el, slot, data, bubbleTimer }
  let stick = null; // { color, until } สีอุปกรณ์ในมือของทุกคน (แท่งไฟ/ธูป/เทียน)
  let FAN_H = 116;

  function buildSlots() {
    slots.length = 0;
    // ธีมที่กำหนดที่นั่งตายตัว (ธีม 3D: ที่นั่งรอบโต๊ะ) — คนเกินที่นั่งไปยืนตามแถว ROWS
    if (TH?.slots) {
      TH.slots.forEach((s, i) => slots.push({ x: Math.round(s.x), y: Math.round(s.y), s: s.s || 1, row: s.row || 0, vip: !!s.vip, who: null, i }));
      return;
    }
    ROWS.forEach((r, ri) => {
      for (let i = 0; i < r.n; i++) {
        const step = (r.x1 - r.x0) / Math.max(1, r.n - 1);
        const off = ri % 2 ? step * 0.25 : -step * 0.15;
        slots.push({
          x: Math.round(Math.min(r.x1, Math.max(r.x0, r.x0 + step * i + off + rand(-12, 12)))),
          y: Math.round(r.y + rand(-(r.jy ?? 14), r.jy ?? 14)),
          s: r.s,
          row: ri,
          vip: !!r.vip,
          tag: r.tag || '', // ส่วนของแถว (เช่น มัสยิด: m = แถวผู้ชาย, w = แถวผู้หญิง) → ชุดตัวละครเปลี่ยนตาม
          who: null,
        });
      }
    });
  }

  function findSlot(vip) {
    // ธีมศาล/เวทีหมอลำ: อยู่รวมกันเป็นกลุ่ม — แถวหน้าก่อน เริ่มจากกลางแถว (ไม่สุ่มกระจาย)
    if (TH?.kid || TH?.fillFront) {
      const free = slots.filter((s) => !s.who && !s.extra).sort((a, b) => a.row - b.row || Math.abs(a.x - 540) - Math.abs(b.x - 540));
      if (free.length) return free[0];
    }
    let free = slots.filter((s) => !s.who && s.vip === vip);
    if (!free.length && vip) free = slots.filter((s) => !s.who);
    if (free.length) return pick(free);
    const general = ROWS.filter((r) => !r.vip);
    const r = pick(general.length ? general : ROWS);
    const s = { x: Math.round(rand(r.x0, r.x1)), y: Math.round(r.y + rand(-(r.jy ?? 16), r.jy ?? 16)), s: r.s, row: ROWS.indexOf(r), vip: false, tag: r.tag || '', who: null, extra: true };
    slots.push(s);
    return s;
  }

  function releaseSlot(f) {
    if (!f.slot) return;
    f.slot.who = null;
    if (f.slot.extra) slots.splice(slots.indexOf(f.slot), 1);
  }

  function placeFan(f, slot) {
    releaseSlot(f);
    slot.who = f.data.id;
    f.slot = slot;
    const el = f.el;
    el.style.left = slot.x + 'px';
    el.style.top = slot.y + 'px';
    el.style.zIndex = Math.round(slot.y);
    el.dataset.rowtag = slot.tag || '';
    el.style.setProperty('--sx', slot.x > 540 ? -1 : 1); // ตัวละครที่หันข้าง (ธีมศาล) หันเข้าหากลางจอ
    el.style.setProperty('--fs', slot.s); // ธีมที่วางป้ายชื่อเหนือหัว (สวนสัตว์) ใช้ขนาดนี้คำนวณตำแหน่ง
    el.querySelector('.wrap').style.transform = `scale(${slot.s})`;
    el.querySelector('.tag').style.transform = `translateX(-50%) scale(${Math.max(0.72, slot.s)})`;
    const headTop = FAN_H * slot.s + (/^big/.test(root.dataset.pfp || '') ? 50 * slot.s : 0); // รูปใหญ่เหนือหัว → ดันมงกุฎ/ข้อความขึ้นไป
    el.querySelector('.crown').style.bottom = headTop + 22 * slot.s + 'px';
    const b = el.querySelector('.bubble');
    b.style.bottom = headTop + 40 * slot.s + 'px';
    b.style.fontSize = Math.round(22 + 8 * slot.s) + 'px';
  }

  function addFan(d, entering = true) {
    if (fans.has(d.id)) return updateFan(d);
    const el = document.createElement('div');
    el.className = 'fan' + (entering ? ' enter' : '') + (d.vip ? ' vip' : '');
    el.style.setProperty('--fc', d.color);
    el.style.setProperty('--sc', stick ? stick.color : TH.stickColor ? TH.stickColor(d) : d.color);
    el.style.setProperty('--ph', (-Math.random() * 0.25).toFixed(2) + 's');
    el.innerHTML = `<div class="wrap"><div class="body">${TH.fanSvg(d.color, d.id, api)}</div><div class="hpic"></div></div>
      <div class="crown">👑</div><div class="bubble"></div><div class="tag"><span></span></div>`;
    applyWear(el, d.wear);
    const tag = el.querySelector('.tag');
    tag.querySelector('span').textContent = d.name;
    tag.prepend(avatarEl(d));
    el.querySelector('.hpic').append(avatarEl(d));
    crowdEl.appendChild(el);
    const f = { el, slot: null, data: d, bubbleTimer: 0 };
    fans.set(d.id, f);
    placeFan(f, findSlot(!!d.vip));
    if (entering && TH?.kid && zcfg().kidQueue) {
      el.classList.remove('enter');
      el.classList.add('kq');
      kidQueue.push(f);
      kidNext();
    } else if (entering) setTimeout(() => el.classList.remove('enter'), 1500);
    return f;
  }

  // ============================================================ ธีมศาล: เดินเข้าทีละคน • ส่งของขวัญ = เดินไปไหว้หน้าศาล + กล้องซูมเข้า
  const kidQueue = [];
  let kidBusyUntil = 0;
  let kidTimer = 0;
  // เดินจาก (dx,dy) ที่ห่างจากตำแหน่งจริง ไปยัง (tx,ty) — ภาพเดินสลับท่า หันตามทางเดิน • ขนาดตัวเปลี่ยนตามระยะ (ไกล = เล็ก)
  function kidWalk(f, from, to, s0, s1, sec, done) {
    const el = f.el;
    const wrap = el.querySelector('.wrap');
    el.style.setProperty('--wsx', to[0] - from[0] >= 0 ? 1 : -1);
    el.classList.add('kwalking');
    el.style.transition = 'none';
    wrap.style.transition = 'none';
    el.style.translate = `${from[0]}px ${from[1]}px`;
    wrap.style.transform = `scale(${s0})`;
    void el.offsetWidth;
    el.style.transition = `translate ${sec}s linear`;
    wrap.style.transition = `transform ${sec}s linear`;
    el.style.translate = `${to[0]}px ${to[1]}px`;
    wrap.style.transform = `scale(${s1})`;
    clearTimeout(f.walkT);
    f.walkT = setTimeout(() => {
      el.classList.remove('kwalking');
      el.style.transition = '';
      wrap.style.transition = '';
      done?.();
    }, sec * 1000);
  }
  // คนถัดไปในคิวเดินเข้า (ห่างกันพอให้เห็นทีละคน • คิวยาวก็เร่งขึ้น)
  function kidNext() {
    if (kidTimer) return;
    const f = kidQueue.shift();
    if (!f) return;
    if (!f.el.isConnected || !fans.has(f.data.id)) return kidNext();
    const sx = 540 + rand(-50, 50); // ทางเดินกลางล่างจอ
    const from = [sx - f.slot.x, 2050 - f.slot.y];
    const dist = Math.hypot(from[0], from[1]);
    const sec = Math.min(2.6, Math.max(1.2, dist / 430));
    f.el.classList.remove('kq');
    if (f.el.style.zIndex < 2000) f.el.style.zIndex = Math.round(f.slot.y);
    kidWalk(f, from, [0, 0], f.slot.s * 1.35, f.slot.s, sec, () => bump(f.data.id, 'bow', 1300));
    const gap = kidQueue.length > 10 ? 250 : kidQueue.length > 4 ? 450 : 750;
    kidTimer = setTimeout(() => {
      kidTimer = 0;
      kidNext();
    }, gap);
  }
  // ---------------------------------------------------------------- ซูมหาคนส่งของขวัญ (ทุกธีมที่มีคนดูในฉาก) — ตั้งค่า config.zoom ที่ห้องควบคุมไลฟ์
  // ทีละคน (รอได้ 4 คน ของขวัญใหญ่แซงคิว) • ธีมเกมที่ซ่อนคนดู (#crowd ซ่อน / ที่นั่งนอกจอ) ไม่ซูม
  const ZDEF = { enabled: true, min: 0, k: 2, sec: 5, hideHud: true, kidQueue: true };
  const zcfg = () => ({ ...ZDEF, ...(config?.zoom || {}) });
  const zoomQ = [];
  let zoomOn = null;
  let zoomT = 0;
  const crowdShown = () => getComputedStyle(crowdEl).display !== 'none';
  const zoomable = (f) => f?.slot && f.slot.y < 1900 && !f.el.classList.contains('kq') && crowdShown();
  // r = { id, total, name, gift, focus(f) → [x, y, headY], onZoom, done, force }  • คืน true ถ้าเข้าคิวซูม (แล้ว done จะถูกเรียกเสมอ)
  function zoomReq(r) {
    if(META?.fair)return false;
    const Z = zcfg();
    if (!r.force && (!Z.enabled || r.total < Z.min)) return false;
    if (!zoomable(fans.get(r.id)) || zoomOn?.id === r.id || zoomQ.some((x) => x.id === r.id)) return false;
    if (zoomQ.length >= 4) {
      const low = zoomQ[zoomQ.length - 1];
      if (low.total >= r.total) return false;
      zoomQ.pop();
      low.done?.();
    }
    zoomQ.push(r);
    zoomQ.sort((a, b) => b.total - a.total);
    zoomNext();
    return true;
  }
  function zoomNext() {
    if (zoomOn || !zoomQ.length) return;
    const r = zoomQ.shift();
    const f = fans.get(r.id);
    if (!zoomable(f)) {
      r.done?.();
      return zoomNext();
    }
    zoomOn = r;
    const Z = zcfg();
    const k = Z.k;
    const h = FAN_H * f.slot.s;
    // ธีม 3D ที่ตัวละครขยับได้ (เวทีหมอลำ) บอกตำแหน่งตัวจริงตอนนี้เอง
    const [fx, fy, hy] = r.focus ? r.focus(f) : TH.zoomFocus?.(f) || [f.slot.x, f.slot.y - h * 0.55, f.slot.y - h];
    // จุดโฟกัสไปอยู่กลางจอ (เหนือช่องคอมเมนต์ของ TikTok) แต่ไม่ให้เห็นขอบฉาก
    const sx = Math.min(fx * k, Math.max(1080 - (1080 - fx) * k, 540));
    const sy = Math.min(fy * k, Math.max(1920 - (1920 - fy) * k, 1000));
    const sc = $('scene');
    sc.classList.add('kzoom');
    sc.style.transformOrigin = `${fx}px ${fy}px`;
    sc.style.translate = `${sx - fx}px ${sy - fy}px`;
    sc.style.scale = String(k);
    root.style.setProperty('--zx', sx + 'px');
    root.style.setProperty('--zy', sy + 'px');
    root.classList.toggle('kzoomed', Z.hideHud);
    root.classList.add('kzooming');
    if (!r.focus) {
      f.el.classList.add('spot');
      f.el.style.zIndex = 3500;
    }
    // ป้ายชื่อเหนือหัว (ตำแหน่งบนจอหลังซูม)
    const nm = $('kidName');
    const g = r.gift;
    nm.innerHTML = `${r.icon || '🎁'} ${esc(r.name || f.data.name)}${g?.name ? `<small>${esc(g.name)}${g.count > 1 ? ' ×' + g.count : ''}</small>` : ''}`;
    nm.style.left = Math.min(860, Math.max(220, sx)) + 'px';
    nm.style.top = Math.max(260, sy + (hy - fy) * k - 100) + 'px';
    nm.classList.add('on');
    r.onZoom?.();
    clearTimeout(zoomT);
    zoomT = setTimeout(zoomEnd, Z.sec * 1000);
  }
  function zoomEnd() {
    const r = zoomOn;
    const sc = $('scene');
    sc.style.translate = '0px 0px';
    sc.style.scale = '1';
    root.classList.remove('kzoomed', 'kzooming');
    $('kidName').classList.remove('on');
    const f = r && fans.get(r.id);
    if (f && !r.focus) {
      f.el.classList.remove('spot');
      if (f.slot) f.el.style.zIndex = Math.round(f.slot.y);
    }
    setTimeout(() => {
      zoomOn = null;
      r?.done?.();
      zoomNext();
    }, 1000);
  }
  // ปุ่ม "ลองซูม" ที่ห้องควบคุมไลฟ์ — สุ่มคนดูในฉากหนึ่งคน (ธีมศาลเดินไปไหว้ด้วย แต่ไม่มีใบเซียมซี)
  function zoomTest() {
    if (!TH) return;
    const list = [...fans.values()].filter(zoomable);
    const f = pick(list);
    if (!f) return toast('ยังไม่มีคนดูในฉากให้ซูม');
    const d = { user: { id: f.data.id, name: f.data.name }, gift: { name: 'ทดสอบซูม', count: 1, total: 999 }, test: true };
    if (TH.kid && window.StageKid) kidOffer(d);
    else zoomReq({ id: f.data.id, total: 999, name: f.data.name, gift: d.gift, force: true, onZoom: () => (bump(f.data.id, 'wave', 1600), bump(f.data.id, 'happy', 2600)) });
  }

  // ---------------------------------------------------------------- ธีมศาล: ส่งของขวัญ = เดินไปไหว้หน้าศาล (5 จุด คนละจุด หลายคนพร้อมกันได้)
  const kidAt = new Map(); // id → จุดไหว้ที่จองไว้
  const kidWait = []; // ของขวัญที่รอจุดว่าง
  function altarSpots() {
    const K = TH.kid;
    const m = K.mascot || { x: 880, y: 1150 };
    const y = K.altar?.y ?? m.y - 22;
    const xs = K.altar?.xs || [310, 425, 540, 655, 770];
    return xs.map((x, i) => ({ i, x, y: y + (i % 2 ? 10 : 0) }));
  }
  function kidOffer(d) {
    const id = d.user.id;
    if (kidAt.has(id) || kidWait.some((x) => x.user.id === id)) return; // กำลังไปไหว้อยู่แล้ว (ส่งรัว)
    const f = fans.get(id);
    if (!f?.slot || f.el.classList.contains('kq')) {
      if (!d.test) window.StageKid?.gift?.(d);
      return;
    }
    const used = new Set([...kidAt.values()].map((v) => v.i));
    const free = altarSpots().filter((p) => !used.has(p.i)).sort((a, b) => Math.abs(a.x - f.slot.x) - Math.abs(b.x - f.slot.x));
    if (!free.length) {
      if (kidWait.length < 6) kidWait.push(d);
      else if (!d.test) window.StageKid?.gift?.(d);
      return;
    }
    const sp = free[0];
    kidAt.set(id, sp);
    const as = TH.kid.altar?.s ?? ROWS[0]?.s ?? 0.8;
    const el = f.el;
    const to = [sp.x - f.slot.x, sp.y - f.slot.y];
    const sec = Math.min(2.2, Math.max(1, Math.hypot(to[0], to[1]) / 420));
    el.classList.add('koffer');
    el.style.zIndex = Math.round(sp.y) + 1;
    const total = Number(d.gift?.total) || 0;
    const back = () => {
      bump(id, 'happy', 900);
      setTimeout(() => {
        const fin = () => {
          el.classList.remove('koffer');
          el.style.translate = '';
          if (f.slot) {
            el.style.setProperty('--sx', f.slot.x > 540 ? -1 : 1);
            el.style.zIndex = Math.round(f.slot.y);
          }
          kidAt.delete(id);
          const nx = kidWait.shift();
          if (nx) kidOffer(nx);
        };
        if (fans.get(id) === f && f.slot) kidWalk(f, to, [0, 0], as, f.slot.s, sec * 0.9, fin);
        else fin();
      }, 700);
    };
    kidWalk(f, [0, 0], to, f.slot.s, as, sec, () => {
      // ถึงหน้าศาล: หันเข้าหากลางศาล กราบ แล้วเด็กวัดเขย่าเซียมซีให้
      el.style.setProperty('--sx', sp.x <= 540 ? 1 : -1);
      bump(id, 'bow', 1700);
      if (!d.test) window.StageKid?.gift?.(d);
      const zoomed = zoomReq({ id, total: d.test ? 999 : total, force: !!d.test, name: d.user.name, gift: d.gift, icon: '🙏', focus: () => [sp.x, sp.y - 118 * as * 0.55, sp.y - 118 * as], done: back });
      if (!zoomed) setTimeout(back, 3800);
    });
  }

  // ชุดคนดู: หมวก/สัตว์เลี้ยง (SVG วาดเอง) — สีเสื้อเปลี่ยนที่ตัวละครเลย
  const WEAR_SVG = {
    hat: '<svg viewBox="0 0 60 30"><path d="M4 24 Q30 -14 56 24Z" fill="#c8a160"/><ellipse cx="30" cy="24" rx="29" ry="6" fill="#a8823e"/><path d="M14 18 h32" stroke="#e8453c" stroke-width="3"/></svg>',
    cap: '<svg viewBox="0 0 60 30"><path d="M8 24 Q10 2 32 2 Q52 2 52 24Z" fill="#3b82f6"/><path d="M40 22 h20 q2 4 -4 5 h-16z" fill="#2563eb"/><circle cx="31" cy="4" r="3" fill="#fff"/></svg>',
    tiara: '<svg viewBox="0 0 60 30"><path d="M6 26 L10 6 L22 18 L30 2 L38 18 L50 6 L54 26Z" fill="#ffd166" stroke="#e6a817" stroke-width="2"/><circle cx="30" cy="16" r="4" fill="#e8453c"/></svg>',
    cat: '<svg viewBox="0 0 40 34"><ellipse cx="22" cy="24" rx="15" ry="9" fill="#ff9f43"/><circle cx="10" cy="16" r="8" fill="#ff9f43"/><path d="M4 12 L5 3 L10 9Z M12 9 L17 3 L17 12Z" fill="#ff9f43"/><circle cx="8" cy="15" r="1.4" fill="#1d1714"/><circle cx="13" cy="15" r="1.4" fill="#1d1714"/><path d="M36 22 Q42 12 36 6" stroke="#ff9f43" stroke-width="3" fill="none"/></svg>',
    dog: '<svg viewBox="0 0 40 34"><ellipse cx="22" cy="24" rx="15" ry="9" fill="#c99a6b"/><circle cx="10" cy="15" r="8" fill="#c99a6b"/><ellipse cx="4" cy="16" rx="3" ry="6" fill="#8a5a34"/><circle cx="8" cy="14" r="1.4" fill="#1d1714"/><circle cx="4" cy="19" r="1.6" fill="#1d1714"/><path d="M36 20 l5 -6" stroke="#c99a6b" stroke-width="3"/></svg>',
  };
  function applyWear(el, w) {
    el.querySelector('.wear-hat')?.remove();
    el.querySelector('.wear-pet')?.remove();
    if (!w) return;
    const body = el.querySelector('.body');
    if (w.hat && WEAR_SVG[w.hat]) body.insertAdjacentHTML('beforeend', `<div class="wear-hat">${WEAR_SVG[w.hat]}</div>`);
    if (w.pet && WEAR_SVG[w.pet]) el.querySelector('.wrap').insertAdjacentHTML('beforeend', `<div class="wear-pet">${WEAR_SVG[w.pet]}</div>`);
  }

  function updateFan(d) {
    const f = fans.get(d.id);
    if (!f) return;
    const oldPic = f.data.avatar;
    f.data = { ...f.data, ...d };
    f.el.querySelector('.tag span').textContent = f.data.name;
    if (d.avatar && d.avatar !== oldPic) {
      f.el.querySelector('.tag .pic')?.replaceWith(avatarEl(f.data));
      f.el.querySelector('.hpic').replaceChildren(avatarEl(f.data));
    }
    return f;
  }

  function removeFan(id) {
    const f = fans.get(id);
    if (!f) return;
    fans.delete(id);
    releaseSlot(f);
    f.el.classList.add('leave');
    setTimeout(() => f.el.remove(), 800);
  }

  function setVip(id, vip) {
    const f = fans.get(id);
    if (!f) return;
    f.data.vip = vip;
    f.el.classList.toggle('vip', vip);
    if (vip !== f.slot.vip) placeFan(f, findSlot(vip));
  }

  function sayBubble(id, text) {
    const f = fans.get(id);
    if (!f) return;
    const b = f.el.querySelector('.bubble');
    b.textContent = text;
    b.classList.add('show');
    f.el.style.zIndex = 3000;
    clearTimeout(f.bubbleTimer);
    f.bubbleTimer = setTimeout(() => {
      b.classList.remove('show');
      f.el.style.zIndex = Math.round(f.slot.y);
    }, 5500);
  }

  // ย้ายคนดูไปแถวที่กำหนด (เช่น ขึ้นเวที) — ถ้าเต็ม สลับกับคนที่อยู่แถวนั้นนานสุด (ไม่ยุ่งกับ VIP)
  function moveToRows(id, rows) {
    const f = id && fans.get(id);
    if (!f || !f.slot || rows.includes(f.slot.row)) return false;
    const free = slots.filter((x) => !x.who && !x.vip && rows.includes(x.row));
    if (free.length) {
      placeFan(f, pick(free));
    } else {
      const occ = [...fans.values()].filter((x) => x !== f && x.slot && !x.slot.vip && rows.includes(x.slot.row)).sort((a, b) => (a.at || 0) - (b.at || 0))[0];
      if (!occ) return false;
      const theirs = occ.slot;
      const mine = f.slot;
      theirs.who = null;
      occ.slot = null;
      placeFan(f, theirs);
      placeFan(occ, mine.extra || mine.who ? findSlot(false) : mine);
    }
    f.at = now();
    return true;
  }

  function fanPos(id) {
    const f = id && fans.get(id);
    if (!f) return null;
    return { x: f.slot.x, y: f.slot.y - FAN_H * 0.6 * f.slot.s, feetY: f.slot.y, s: f.slot.s, f };
  }

  // ใส่ท่าทางชั่วคราว — บังคับคำนวณหน้าใหม่ (offsetWidth) เฉพาะตอนต้องเริ่มท่าเดิมซ้ำ ไม่งั้นของขวัญรัว ๆ ทำให้กระตุก
  function bump(id, cls, ms = 2000) {
    const f = fans.get(id);
    if (!f) return;
    if (f.el.classList.contains(cls)) {
      f.el.classList.remove(cls);
      void f.el.offsetWidth;
    }
    f.el.classList.add(cls);
    clearTimeout(f['t_' + cls]);
    f['t_' + cls] = setTimeout(() => f.el.classList.remove(cls), ms);
  }

  // กะพริบตาตัวละครจิบิ: สุ่มทีละ 1-2 คน (เปลี่ยนแค่จุดเล็ก ๆ ไม่ต้องวาดใหม่ทั้งฝูง)
  setInterval(() => {
    if (document.hidden || !fans.size) return;
    const list = [...fans.values()];
    for (let i = 0; i < Math.min(2, Math.ceil(list.length / 20)); i++) {
      const el = list[(Math.random() * list.length) | 0].el;
      if (el.classList.contains('blink')) continue;
      el.classList.add('blink');
      setTimeout(() => el.classList.remove('blink'), 140);
    }
  }, 220);

  // ทั้งฝูงทำท่าพร้อมกัน: ถอดคลาสทุกคนก่อน คำนวณหน้าใหม่ครั้งเดียว แล้วค่อยใส่ (แทนการบังคับทีละคน)
  function crowdWave(cls = 'wave') {
    const list = [...fans.values()];
    for (const f of list) {
      f.el.style.setProperty('--wd', ((f.slot.x / 1080) * 0.9 + f.slot.row * 0.05).toFixed(2) + 's');
      f.el.classList.remove(cls);
    }
    if (list.length) void list[0].el.offsetWidth;
    for (const f of list) {
      f.el.classList.add(cls);
      clearTimeout(f['t_' + cls]);
      f['t_' + cls] = setTimeout(() => f.el.classList.remove(cls), 1900);
    }
  }

  function applySticks() {
    for (const f of fans.values()) f.el.style.setProperty('--sc', stick ? stick.color : TH.stickColor ? TH.stickColor(f.data) : f.data.color);
  }
  function setStick(color, ms = 20000) {
    stick = { color, until: now() + ms };
    applySticks();
  }

  // ============================================================ canvases
  const bg = $('bg');
  const bctx = bg.getContext('2d');
  const staticLayer = document.createElement('canvas');
  staticLayer.width = 1080;
  staticLayer.height = 1920;
  const fxc = $('fx').getContext('2d');

  function beat(t) {
    const b = ((t / 1000) * (T.bpm || TH.bpm || 100)) / 60;
    return { n: Math.floor(b), ph: b % 1, pulse: Math.pow(1 - (b % 1), 3) };
  }

  // ============================================================ particles
  const parts = [];
  const spots = [];
  const emitters = [];
  let flashFx = null;
  let bigUntil = 0;

  function spawn(p) {
    if (parts.length > maxParts()) parts.shift();
    const q = { life: 0, max: 2, vx: 0, vy: 0, g: 0, drag: 0, rot: 0, vr: 0, size: 10, color: '#fff', alpha: 1, ph: Math.random() * 6, ...p };
    parts.push(q);
    return q;
  }

  function heartPath(c, s) {
    c.beginPath();
    c.moveTo(0, s * 0.35);
    c.bezierCurveTo(-s, -s * 0.3, -s * 0.5, -s, 0, -s * 0.45);
    c.bezierCurveTo(s * 0.5, -s, s, -s * 0.3, 0, s * 0.35);
    c.closePath();
  }

  function drawParticle(c, p) {
    const k = p.life / p.max;
    const fadeOutAt = p.fadeOut ?? 0.7;
    const a = p.alpha * (p.fadeIn ? Math.min(1, p.life / p.fadeIn) : 1) * (k > fadeOutAt ? 1 - (k - fadeOutAt) / (1 - fadeOutAt) : 1);
    if (a <= 0) return;
    c.globalAlpha = a;
    if (p.draw) {
      p.draw(c, p, k, a);
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'source-over';
      return;
    }
    switch (p.type) {
      case 'heart':
        c.save();
        c.translate(p.x + Math.sin(p.life * 4 + p.ph) * 14, p.y);
        c.rotate(Math.sin(p.life * 3 + p.ph) * 0.25);
        c.fillStyle = p.color;
        heartPath(c, p.size);
        c.fill();
        c.restore();
        break;
      case 'rose':
        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.rot);
        c.fillStyle = p.color;
        for (let i = 0; i < 5; i++) {
          const an = (i / 5) * Math.PI * 2;
          c.beginPath();
          c.arc(Math.cos(an) * p.size * 0.5, Math.sin(an) * p.size * 0.5, p.size * 0.55, 0, Math.PI * 2);
          c.fill();
        }
        c.fillStyle = p.center || '#ffe36b';
        c.beginPath();
        c.arc(0, 0, p.size * 0.35, 0, Math.PI * 2);
        c.fill();
        c.restore();
        break;
      case 'petal':
        c.save();
        c.translate(p.x + Math.sin(p.life * 2 + p.ph) * 18, p.y);
        c.rotate(p.rot);
        c.scale(1, Math.abs(Math.cos(p.life * 3 + p.ph)) * 0.8 + 0.2);
        c.fillStyle = p.color;
        c.beginPath();
        c.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
        c.fill();
        c.restore();
        break;
      case 'confetti':
        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.rot);
        c.scale(Math.cos(p.life * 9 + p.ph), 1);
        c.fillStyle = p.color;
        c.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        c.restore();
        break;
      case 'coin':
        c.save();
        c.translate(p.x, p.y);
        c.scale(Math.cos(p.life * 6 + p.ph), 1);
        c.fillStyle = '#ffcf33';
        c.beginPath();
        c.arc(0, 0, p.size, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#fff3a8';
        c.beginPath();
        c.arc(-p.size * 0.25, -p.size * 0.25, p.size * 0.4, 0, Math.PI * 2);
        c.fill();
        c.restore();
        break;
      case 'spark':
      case 'rocket':
        c.globalCompositeOperation = 'lighter';
        c.strokeStyle = p.color;
        c.lineWidth = p.size;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(p.x, p.y);
        c.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04);
        c.stroke();
        break;
      case 'flame': {
        c.globalCompositeOperation = 'lighter';
        const r = p.size * (0.6 + k);
        const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        const col = k < 0.3 ? '255,240,170' : k < 0.6 ? '255,150,40' : '220,50,20';
        g.addColorStop(0, `rgba(${col},0.9)`);
        g.addColorStop(1, `rgba(${col},0)`);
        c.fillStyle = g;
        c.fillRect(p.x - r, p.y - r, r * 2, r * 2);
        break;
      }
      case 'smoke': {
        const r = p.size * (0.5 + k * 1.6);
        const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        g.addColorStop(0, `rgba(${p.rgb || '220,215,230'},0.35)`);
        g.addColorStop(1, `rgba(${p.rgb || '220,215,230'},0)`);
        c.fillStyle = g;
        c.fillRect(p.x - r, p.y - r, r * 2, r * 2);
        break;
      }
      case 'glow': {
        // หิ่งห้อย / ประกายไฟ กะพริบ
        c.globalCompositeOperation = 'lighter';
        const tw = p.twinkle ? 0.4 + 0.6 * Math.abs(Math.sin(p.life * p.twinkle + p.ph)) : 1;
        const r = p.size * 3;
        const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        g.addColorStop(0, hexA(p.color, 0.95 * tw));
        g.addColorStop(0.25, hexA(p.color, 0.35 * tw));
        g.addColorStop(1, hexA(p.color, 0));
        c.fillStyle = g;
        c.fillRect(p.x - r, p.y - r, r * 2, r * 2);
        break;
      }
      case 'ring':
        c.globalCompositeOperation = 'lighter';
        c.strokeStyle = p.color;
        c.lineWidth = (p.width || 4) * (1 - k);
        c.beginPath();
        c.arc(p.x, p.y, p.size * (0.2 + k * 1.2), 0, Math.PI * 2);
        c.stroke();
        break;
    }
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
  }

  function stepParticles(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life += dt;
      if (p.land != null && p.life >= p.land) {
        p.vx = p.vy = p.g = p.vr = 0;
        p.land = null;
        p.onLand?.(p);
      }
      p.vy += p.g * dt;
      if (p.drag) {
        const d = Math.exp(-p.drag * dt);
        p.vx *= d;
        p.vy *= d;
      }
      if (p.sway) p.x += Math.sin(p.life * p.sway + p.ph) * 20 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.update?.(p, dt);
      if (p.life >= p.max) {
        parts.splice(i, 1);
        if (p.type === 'rocket') explode(p.x, p.y, p.burst);
      }
    }
  }

  function explode(x, y, color, n = 80) {
    const col2 = pick(PALETTE);
    for (let i = 0; i < n; i++) {
      const an = Math.random() * Math.PI * 2;
      const sp = rand(180, 520);
      spawn({ type: 'spark', x, y, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, g: 160, drag: 1.1, max: rand(1.1, 1.9), size: rand(2.5, 4.5), color: i % 3 ? color : col2 });
    }
    spawn({ type: 'ring', x, y, size: 220, max: 0.7, color });
    sfx.boom();
  }

  function fireworks(n = 5, opt = {}) {
    if (THEME_ID === 'templefair') return; // The fair owns its ten-shell show, depth and water launch point.

    const { y0 = 1080, yMin = 280, yMax = 720, xMin = 160, xMax = 920, colors = PALETTE } = opt;
    for (let i = 0; i < n; i++) {
      setTimeout(() => {
        const x = rand(xMin, xMax);
        const ty = rand(yMin, yMax);
        const T2 = rand(0.8, 1.1);
        spawn({ type: 'rocket', x, y: y0, vx: rand(-40, 40), vy: (ty - y0) / T2, max: T2, size: 4, color: '#fff2c0', burst: pick(colors) });
        sfx.whistle();
      }, i * 320);
    }
  }

  // ลำแสงส่องคน (สปอตไลต์ / แสงศักดิ์สิทธิ์ / แสงจันทร์)
  function spot(user, opt = {}) {
    const p = user && fanPos(user.id);
    const s = {
      id: p ? user.id : null,
      start: now(),
      until: now() + (opt.dur || 7000),
      sx: opt.sx ?? (p ? (p.x < 540 ? 330 : 750) : 540),
      sy: opt.sy ?? 240,
      rgb: opt.rgb || '255,250,220',
      fallback: opt.fallback || { x: 540, y: 900 },
      f: p?.f,
    };
    if (p) p.f.el.classList.add('lit');
    spots.push(s);
    return s;
  }

  function drawSpots(c, t) {
    for (let i = spots.length - 1; i >= 0; i--) {
      const S = spots[i];
      if (t > S.until) {
        spots.splice(i, 1);
        S.f?.el.classList.remove('lit');
        continue;
      }
      const pos = S.id ? fanPos(S.id) : null;
      const tx = pos ? pos.x : S.fallback.x;
      const ty = pos ? pos.feetY - 10 * pos.s : S.fallback.y;
      const fade = Math.min(1, (t - S.start) / 300, (S.until - t) / 500);
      const rad = pos ? 80 * pos.s + 30 : 120;
      c.save();
      c.globalCompositeOperation = 'lighter';
      const g = c.createLinearGradient(S.sx, S.sy, tx, ty);
      g.addColorStop(0, `rgba(${S.rgb},${0.55 * fade})`);
      g.addColorStop(1, `rgba(${S.rgb},${0.18 * fade})`);
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(S.sx - 10, S.sy);
      c.lineTo(tx - rad, ty);
      c.lineTo(tx + rad, ty);
      c.lineTo(S.sx + 10, S.sy);
      c.closePath();
      c.fill();
      const rg = c.createRadialGradient(tx, ty, 0, tx, ty, rad * 1.2);
      rg.addColorStop(0, `rgba(${S.rgb},${0.5 * fade})`);
      rg.addColorStop(1, `rgba(${S.rgb},0)`);
      c.fillStyle = rg;
      c.beginPath();
      c.ellipse(tx, ty, rad * 1.2, rad * 0.45, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
  }

  function emitter(dur, fn) {
    const e = { start: now(), until: now() + dur, fn };
    emitters.push(e);
    return e;
  }
  function stepEmitters(t, dt) {
    for (let i = emitters.length - 1; i >= 0; i--) {
      const e = emitters[i];
      if (t > e.until) {
        emitters.splice(i, 1);
        continue;
      }
      e.fn(t, dt, (t - e.start) / 1000);
    }
  }

  function flash(color, dur = 700, a = 0.35) {
    flashFx = { color, t0: now(), dur, a };
  }

  function shake() {
    const s = $('scene');
    s.classList.remove('shake');
    void s.offsetWidth;
    s.classList.add('shake');
    setTimeout(() => s.classList.remove('shake'), 1400);
  }

  // โชว์ใหญ่เต็มจอ — คืนค่า false ถ้ากำลังโชว์อยู่แล้ว (จากหลอดพลัง) จะได้ไม่ทับ
  function bigShow(user, label, ms = 7500) {
    if (!user && bigUntil > now()) return false;
    bigUntil = now() + ms;
    avatarReact('big');
    const tx = META.texts;
    const box = $('big');
    $('bigWord').textContent = tx.bigWord;
    $('bigWho').textContent = user ? user.name : label || '';
    $('bigSub').textContent = user ? tx.bigSubUser : tx.bigSubAll;
    box.classList.remove('on');
    void box.offsetWidth;
    box.classList.add('on');
    clearTimeout(bigShow._t);
    bigShow._t = setTimeout(() => box.classList.remove('on'), ms);
    return true;
  }

  function originFor(user) {
    const p = user && fanPos(user.id);
    return p ? { x: p.x, y: p.y } : { x: rand(140, 940), y: 1950 };
  }

  // ============================================================ feed / toasts
  const feedItems = [];
  function feedGift(d) {
    const key = d.user.id + '|' + d.gift.name;
    let it = feedItems.find((x) => x.key === key);
    if (it) {
      it.count += d.gift.count;
      it.el.querySelector('.x').textContent = 'x' + it.count;
      it.el.querySelector('.x').animate([{ transform: 'scale(1.6)' }, { transform: 'scale(1)' }], { duration: 300 });
      clearTimeout(it.timer);
    } else {
      const el = document.createElement('div');
      el.className = 'feed-item';
      const txt = document.createElement('div');
      txt.style.minWidth = '0';
      txt.innerHTML = '<div class="who"></div><div class="what"></div>';
      txt.firstChild.textContent = d.user.name;
      txt.lastChild.textContent = `ส่ง ${d.gift.name}`;
      let gi;
      const gimg = d.gift.image || window.giftIcon(d.gift.name);
      if (gimg) {
        gi = document.createElement('img');
        gi.className = 'gimg';
        gi.referrerPolicy = 'no-referrer';
        gi.src = gimg;
      } else {
        gi = document.createElement('div');
        gi.className = 'gemo';
        gi.textContent = effectUi(d.effect).icon;
      }
      const x = document.createElement('div');
      x.className = 'x';
      x.textContent = 'x' + d.gift.count;
      el.append(avatarEl(d.user), txt, gi, x);
      $('feed').appendChild(el);
      it = { key, el, count: d.gift.count };
      feedItems.push(it);
      while (feedItems.length > 4) dropFeed(feedItems[0]);
    }
    it.timer = setTimeout(() => dropFeed(it), 5000);
  }
  function dropFeed(it) {
    const i = feedItems.indexOf(it);
    if (i < 0) return;
    feedItems.splice(i, 1);
    clearTimeout(it.timer);
    it.el.classList.add('out');
    setTimeout(() => it.el.remove(), 400);
  }

  function toast(text, cls = '') {
    const el = document.createElement('div');
    el.className = 'toast ' + cls;
    el.textContent = text;
    $('toasts').appendChild(el);
    while ($('toasts').children.length > 3) $('toasts').firstChild.remove();
    setTimeout(() => el.remove(), 3300);
  }

  function flashGiftRow(name) {
    const row = document.querySelector(`.gift-row[data-gift="${CSS.escape(String(name).toLowerCase())}"], .sp-g[data-gift="${CSS.escape(String(name).toLowerCase())}"]`);
    if (!row) return;
    row.classList.remove('flash');
    void row.offsetWidth;
    row.classList.add('flash');
  }

  // ============================================================ audio + TTS
  let actx = null;
  try {
    actx = new (window.AudioContext || window.webkitAudioContext)();
  } catch {}
  const fairAudioGate=actx?actx.createGain():null;if(fairAudioGate)fairAudioGate.connect(actx.destination);
  const master = actx ? actx.createGain() : null;
  if (master) {
    master.gain.value = 0.45;
    master.connect(fairAudioGate||actx.destination);
  }
  // Temple fair uses one audible renderer across OBS, Studio and previews.
  const FAIR_AUDIO={allowed:false,candidate:null,since:0,owner:null};let speechCancel=null;
  const fairAudioAllowed=()=>THEME_ID!=='templefair'||(!SILENT&&!THUMB&&FAIR_AUDIO.allowed);
  function fairAudioChoice(stages,t=Date.now()){
    return stages.filter(s=>s.theme==='templefair'&&!s.silent&&!s.thumb&&!s.mobile&&t-s.at<12000)
      .sort((a,b)=>{const rank=s=>/TikTok LIVE Studio/i.test(s.ua)?0:/OBS/i.test(s.ua)?1:2;return rank(a)-rank(b)||a.since-b.since||a.id.localeCompare(b.id)})[0]?.id||null;
  }
  function fairAudioSet(allowed){
    if(FAIR_AUDIO.allowed===allowed)return;FAIR_AUDIO.allowed=allowed;if(fairAudioGate)fairAudioGate.gain.value=allowed?1:0;
    if(!allowed){sayQ.length=0;for(const h of giftHold.values())clearTimeout(h.timer);giftHold.clear();speechCancel?.();plStop();for(const el of PL.els){el.pause();el.volume=0;}PL.pending=false;PL.fairDancing=false;}
    else{socket.emit('music:hello');const count=window.__templeFair?.crowd?.director.actors.filter(a=>a.zone==='dance'&&a.state==='active').length||0;fairDanceMusic(count);}
    applyMusic();stageStat(true);
  }
  function fairAudioPoll(){
    if(THEME_ID!=='templefair'||SILENT||THUMB||!socket.connected)return;
    socket.emit('pre:get',null,r=>{if(!(r?.stages||[]).some(s=>s.id===socket.id&&s.theme==='templefair')){stageStat(true);return;}const id=fairAudioChoice(r?.stages||[]);FAIR_AUDIO.owner=id;
      if(id!==FAIR_AUDIO.candidate){FAIR_AUDIO.candidate=id;FAIR_AUDIO.since=now();}
      // A new speaker waits for old renderers to observe the change and stop first.
      fairAudioSet(id===socket.id&&now()-FAIR_AUDIO.since>=2200);if(FAIR_AUDIO.allowed)socket.emit('music:hello');
    });
  }
  setInterval(fairAudioPoll,1000);
  window.__fairAudio=FAIR_AUDIO;
  const ok = () => !SILENT && fairAudioAllowed() && actx && config?.sound && actx.state === 'running';

  function tone(freq, start, dur, type = 'sine', vol = 0.3) {
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(vol, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, start + dur);
    o.connect(g).connect(master);
    o.start(start);
    o.stop(start + dur + 0.05);
  }
  let noiseBuf = null;
  function noise(start, dur, filterType, f0, f1, vol) {
    if (!noiseBuf) {
      noiseBuf = actx.createBuffer(1, actx.sampleRate * 2, actx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = actx.createBufferSource();
    src.buffer = noiseBuf;
    const f = actx.createBiquadFilter();
    f.type = filterType;
    f.frequency.setValueAtTime(f0, start);
    f.frequency.exponentialRampToValueAtTime(f1, start + dur);
    const g = actx.createGain();
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(vol, start + Math.min(0.3, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.001, start + dur);
    src.connect(f).connect(g).connect(master);
    src.start(start);
    src.stop(start + dur + 0.05);
  }
  const sfx = {
    chime(f = 660) {
      if (!ok()) return;
      const t = actx.currentTime;
      [1, 1.25, 1.5, 2].forEach((m, i) => tone(f * m, t + i * 0.07, 0.5, 'sine', 0.18));
    },
    pop() {
      if (!ok()) return;
      const t = actx.currentTime;
      noise(t, 0.25, 'highpass', 800, 3000, 0.5);
      noise(t + 0.05, 0.25, 'highpass', 800, 3000, 0.4);
    },
    boom() {
      if (!ok()) return;
      const t = actx.currentTime;
      noise(t, 0.9, 'lowpass', 900, 60, 0.6);
      noise(t + 0.05, 1.2, 'highpass', 3000, 6000, 0.08);
    },
    whistle() {
      if (!ok()) return;
      const t = actx.currentTime;
      const o = actx.createOscillator();
      const g = actx.createGain();
      o.frequency.setValueAtTime(900, t);
      o.frequency.exponentialRampToValueAtTime(2200, t + 0.8);
      g.gain.setValueAtTime(0.04, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.85);
      o.connect(g).connect(master);
      o.start(t);
      o.stop(t + 0.9);
    },
    zap() {
      if (!ok()) return;
      const t = actx.currentTime;
      for (let i = 0; i < 4; i++) {
        const o = actx.createOscillator();
        const g = actx.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(1800, t + i * 0.12);
        o.frequency.exponentialRampToValueAtTime(200, t + i * 0.12 + 0.25);
        g.gain.setValueAtTime(0.06, t + i * 0.12);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.25);
        o.connect(g).connect(master);
        o.start(t + i * 0.12);
        o.stop(t + i * 0.12 + 0.3);
      }
    },
    whoosh() {
      if (!ok()) return;
      const t = actx.currentTime;
      noise(t, 1.6, 'bandpass', 300, 1800, 0.55);
      noise(t, 1.2, 'lowpass', 200, 80, 0.5);
    },
    cheer() {
      if (!ok()) return;
      const t = actx.currentTime;
      noise(t, 2.8, 'bandpass', 900, 1500, 0.35);
      noise(t + 0.1, 2.5, 'bandpass', 2200, 1700, 0.18);
    },
    fanfare() {
      if (!ok()) return;
      const t = actx.currentTime;
      [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, t + i * 0.13, i === 5 ? 1.2 : 0.3, 'triangle', 0.22));
    },
    bell(f = 196) {
      // ระฆัง/ฆ้อง: เสียงต่ำ + ฮาร์มอนิกยาว
      if (!ok()) return;
      const t = actx.currentTime;
      [[1, 0.35, 4], [2.76, 0.12, 2.5], [5.4, 0.06, 1.5], [1.5, 0.08, 3]].forEach(([m, v, d]) => tone(f * m, t, d, 'sine', v));
    },
    // เสียงคำราม (ธีมพญานาค): เสียงต่ำครางสั่น + ลมหายใจ + สะเทือนต่ำ ๆ — v = 0-1 ดังและยาวแค่ไหน
    roar(v = 1) {
      if (!ok()) return;
      const t = actx.currentTime;
      const dur = 1.2 + 0.9 * v;
      const o = actx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(95, t);
      o.frequency.exponentialRampToValueAtTime(62, t + dur);
      const lfo = actx.createOscillator();
      lfo.frequency.value = 23;
      const lg = actx.createGain();
      lg.gain.value = 18;
      lfo.connect(lg).connect(o.frequency);
      const f = actx.createBiquadFilter();
      f.type = 'lowpass';
      f.Q.value = 4;
      f.frequency.setValueAtTime(380, t);
      f.frequency.linearRampToValueAtTime(900, t + 0.25);
      f.frequency.exponentialRampToValueAtTime(260, t + dur);
      const g = actx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.5 * v, t + 0.18);
      g.gain.setValueAtTime(0.5 * v, t + dur * 0.55);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(f).connect(g).connect(master);
      o.start(t);
      lfo.start(t);
      o.stop(t + dur + 0.05);
      lfo.stop(t + dur + 0.05);
      noise(t, dur, 'bandpass', 500, 220, 0.45 * v);
      noise(t, dur * 0.8, 'lowpass', 160, 50, 0.6 * v);
    },
    // เสียงขู่ฟ่อ (งู/นาค)
    hiss() {
      if (!ok()) return;
      noise(actx.currentTime, 0.9, 'highpass', 2600, 5200, 0.22);
    },
    soft(f = 523) {
      // เสียงระฆังลมเบา ๆ
      if (!ok()) return;
      const t = actx.currentTime;
      [1, 1.5, 2.01].forEach((m, i) => tone(f * m, t + i * 0.11, 1.4, 'sine', 0.1));
    },
  };

  // ============================================================ ดนตรีพื้นหลัง (public/music.js)
  const music = actx && window.StageMusic && !SILENT && !THUMB ? StageMusic.create(actx, fairAudioGate||actx.destination) : null;
  function applyMusic() {
    if (!music || !config) return;
    if(fairAudioGate)fairAudioGate.gain.value=fairAudioAllowed()?1:0;
    const m = config.music || {};
    const id = m.style && m.style !== 'auto' && StageMusic.has(m.style) ? m.style : StageMusic.has(THEME_ID) ? THEME_ID : StageMusic.has(META.alias) ? META.alias : 'concert';
    // คอนเสิร์ต: ใช้ BPM ที่ตั้งไว้ในธีม ไฟเวทีจะเต้นตรงกับเพลง
    const bpm = id === 'concert' && THEME_ID === 'concert' ? Number(T.bpm || TH?.bpm) || 0 : 0;
    const quiet = META?.noMusic && (!m.style || m.style === 'auto'); // ธีมที่ไม่ควรมีเพลง (มัสยิด) — เลือกเพลงเองได้
    const songOn = PL.playing && (config.playlist?.stopBg !== false || THEME_ID === 'templefair'); // เพลย์ลิสต์เล่นอยู่ → พักดนตรีพื้นหลัง
    music.set({ style: id, volume: m.volume ?? 0.35, enabled: !!m.enabled && fairAudioAllowed() && !quiet && !songOn, bpm });
  }
  const duckMusic = (on) => {
    PL.duck = on;
    return config?.music?.duck !== false && music?.duck(on);
  };

  // ============================================================ เพลงในไลฟ์ (เพลย์ลิสต์ไฟล์ในเครื่อง)
  // เล่นเฉพาะหน้าเวทีที่มีเสียง (ไม่ silent) — เซิร์ฟเวอร์ส่งคำสั่งไปที่หน้าเวทีล่าสุดตัวเดียว กันเพลงซ้อน
  // 2 เครื่องเล่นสลับกัน → เฟดข้ามเพลงได้ • เสียงพูดอัตโนมัติพูด = ลดเหลือ duckTo
  const PL = { els: [], cur: null, id: null, playing: false, duck: false, pending: false, blocked: false };
  const PLAYER = !SILENT && !THUMB;
  let songState = null;
  const plCfg = () => config?.playlist || {};
  const plItems = () => plCfg().items || [];
  const plVol = () => Math.min(1, Math.max(0, plCfg().volume ?? 0.7)) * (PL.duck ? Math.min(1, Math.max(0, plCfg().duckTo ?? 0.35)) : 1);
  function plEl() {
    const a = new Audio();
    a.preload = 'auto';
    a.volume = 0;
    a.onended = () => a === PL.cur && plNext(true);
    a.onerror = () => {
      if (a !== PL.cur || !PL.id) return;
      toast('🎵 เล่นไฟล์เพลงนี้ไม่ได้ ข้ามไปเพลงถัดไป', 'share');
      setTimeout(() => a === PL.cur && plNext(true), 800);
    };
    return a;
  }
  function plStart(el) {
    el.play().then(() => {
      PL.blocked = false;
      plReport();
    }).catch(() => {
      // ยังไม่ได้คลิกหน้าเวที (เบราว์เซอร์กันเสียงเล่นเอง) → รอคลิก
      PL.blocked = true;
      PL.pending = true;
      checkUnlock(true);
      plReport();
    });
  }
  function plPlay(id) {
    const it = plItems().find((x) => x.id === id);
    if (!it || !PLAYER || !fairAudioAllowed()) return;
    const old = PL.cur;
    const el = PL.els[0] === old ? PL.els[1] : PL.els[0];
    el.src = '/music-files/' + encodeURIComponent(it.file);
    el.volume = 0;
    PL.cur = el;
    PL.id = id;
    PL.playing = true;
    if (old && (THEME_ID==='templefair'||!(plCfg().fade > 0))) old.pause();
    plStart(el);
    applyMusic();
    plReport();
  }
  function plResume() {
    if (!PL.cur || !PL.id) return plPlay((THEME_ID === 'templefair' && PL.fairId) || (plItems()[0] || {}).id);
    PL.playing = true;
    plStart(PL.cur);
    applyMusic();
  }
  function plPause() {
    PL.playing = false; // เฟดลงแล้วหยุดเอง (plTick)
    applyMusic();
    plReport();
  }
  function plStop() {
    PL.playing = false;
    PL.id = null;
    applyMusic();
    plReport();
  }
  function applyFairMusic() {
    if (!PLAYER || THEME_ID !== 'templefair') return;
    const binding = T?.fair?.music;
    const item = binding?.enabled && plItems().find(x => x.id === binding.id);
    const key = item?.id || null;
    PL.fairLoop = binding?.loop !== false;
    if (key === (PL.fairKey || null)) return; // Saving unrelated settings must not restart music.
    const owned = PL.id && PL.id === PL.fairId;
    PL.fairKey = key;PL.fairId = key;
    if (key && PL.fairDancing) plPlay(key);
    else if (owned) plStop();
  }
  function fairDanceMusic(count) {
    if (!PLAYER || THEME_ID !== 'templefair' || !fairAudioAllowed()) return;
    const dancing = Number(count) > 0;
    if (dancing === !!PL.fairDancing) return;
    PL.fairDancing = dancing;
    if (dancing && PL.fairId) plPlay(PL.fairId);
    else if (!dancing && PL.id === PL.fairId) plStop();
  }
  function plNext(auto) {
    if (auto && THEME_ID === 'templefair' && PL.fairLoop && PL.id === PL.fairId && plItems().some(x => x.id === PL.fairId)) return plPlay(PL.fairId);
    const items = plItems();
    if (!items.length) return plStop();
    const i = items.findIndex((x) => x.id === PL.id);
    let j = i + 1;
    if (plCfg().shuffle && items.length > 1) do j = Math.floor(Math.random() * items.length); while (items[j].id === PL.id);
    if (j >= items.length) {
      if (auto && plCfg().loop === false) return plStop();
      j = 0;
    }
    plPlay(items[j].id);
  }
  function plPrev() {
    if (PL.cur && PL.cur.currentTime > 3) {
      PL.cur.currentTime = 0;
      return;
    }
    const items = plItems();
    if (!items.length) return;
    const i = items.findIndex((x) => x.id === PL.id);
    plPlay(items[i <= 0 ? items.length - 1 : i - 1].id);
  }
  // เฟดเสียง: เพลงปัจจุบันไล่ไปที่ความดังที่ตั้ง • เพลงเก่า/หยุด ไล่ลง 0 แล้วหยุด
  function plTick() {
    const fade = Math.max(0.3, Number(plCfg().fade) || 0);
    for (const el of PL.els) {
      const target = el === PL.cur && PL.playing ? plVol() : 0;
      const step = (el === PL.cur && PL.playing && Math.abs(el.volume - target) < 0.4 ? 0.05 / 0.35 : 0.05 / fade);
      const v = el.volume + Math.max(-step, Math.min(step, target - el.volume));
      el.volume = Math.min(1, Math.max(0, v));
      if (el.volume <= 0.001 && !el.paused && (el !== PL.cur || !PL.playing)) el.pause();
    }
  }
  let plLast = 0;
  function plReport() {
    if (!PLAYER || !fairAudioAllowed()) return;
    plLast = now();
    const el = PL.cur;
    socket.emit('music:status', { id: PL.id, playing: PL.playing && !PL.blocked, blocked: PL.blocked && PL.playing, pos: el ? el.currentTime : 0, dur: el && Number.isFinite(el.duration) ? el.duration : 0 });
  }
  function plInit() {
    socket.on('music:state', (st) => {
      songState = st;
      renderSongChip();
    });
    if (!PLAYER) return;
    PL.els = [plEl(), plEl()];
    setInterval(plTick, 50);
    setInterval(() => now() - plLast > 900 && plReport(), 1000);
    socket.on('connect', () => {if(fairAudioAllowed())socket.emit('music:hello')});
    if (socket.connected && fairAudioAllowed()) socket.emit('music:hello');
    socket.on('music:cmd', (c) => {
      const a = c?.action;
      if (a === 'play') return c.id ? plPlay(c.id) : PL.playing ? null : plResume();
      if (a === 'toggle') return PL.playing ? plPause() : plResume();
      if (a === 'pause') return plPause();
      if (a === 'next') return plNext(false);
      if (a === 'prev') return plPrev();
      if (a === 'stop') return plStop();
      if (a === 'seek' && PL.cur && Number.isFinite(PL.cur.duration)) {
        PL.cur.currentTime = Math.min(PL.cur.duration - 0.5, Math.max(0, c.pos || 0));
        plReport();
      }
    });
    document.addEventListener('pointerdown', () => {
      if (PL.pending && PL.cur && PL.playing) {
        PL.pending = false;
        plStart(PL.cur);
      }
    });
  }
  // ป้าย "กำลังเล่น" บนหน้าเวที (ทุกหน้าเวที รวมพรีวิว) — ใช้สถานะจากเซิร์ฟเวอร์
  // ข้อมูลเพลงปัจจุบันให้ธีมใช้ (จอ LED ของธีมดีเจ): เพลงจากเมนูเพลงในไลฟ์ + ชื่อดนตรีพื้นหลังที่เปิดอยู่
  window.StageSong = () => {
    const m = config?.music || {};
    const bgId = music?.style;
    return { st: songState, items: plItems(), bpm: Number(T?.bpm || TH?.bpm) || 0, bg: m.enabled && music?.playing && bgId ? window.StageMusic?.STYLES?.[bgId]?.name || '' : '' };
  };
  function renderSongChip() {
    const chip = $('songChip');
    if (!chip) return;
    const on = !!(songState?.playing && songState.title && plCfg().showTitle !== false && !THUMB);
    chip.hidden = !on;
    if (!on) return;
    chip.querySelector('.t').textContent = songState.title;
    const hd = $('header');
    const vis = hd && getComputedStyle(hd).display !== 'none';
    chip.style.top = (vis ? hd.offsetTop + hd.offsetHeight + 4 : 206) + 'px';
  }

  // ============================================================ ตัวละคร 3D (public/avatar.js)
  const AV = { mounted: false, lastWave: 0, analyser: null, buf: null };
  // รูปแบบตัวละคร: 3D (VRM) หรือ 2D (วาดลายเส้นแบบเดียวกับฉาก) • ?style=2d ใช้ลองดู
  const avStyle = () => (params.get('style') || config?.avatar?.style) === '2d' ? '2d' : '3d';
  const av = () => {
    if (THUMB) return null;
    if (avStyle() === '2d') {
      const A2 = window.StageAvatar2D;
      if (A2 && !A2.mounted) A2.mount($('scene'), $('crowd'), $('root'), $('themeTop'));
      return A2 || null;
    }
    return AV.mounted ? window.StageAvatar : null;
  };
  function mountAvatar() {
    if (AV.mounted || THUMB || !window.StageAvatar) return;
    window.StageAvatar.mount($('scene'), $('crowd'), $('root'), $('themeTop')); // ปกติอยู่ในฉาก (หลังคนดู) — เลือกให้อยู่หน้ากล่องข้อความได้
    AV.mounted = true;
    applyAvatar();
  }
  addEventListener('avatar-ready', mountAvatar);
  if (window.StageAvatar) setTimeout(mountAvatar);
  function applyAvatar() {
    if (!config) return;
    // ซ่อนตัวละครอีกแบบที่ไม่ได้ใช้
    const two = avStyle() === '2d';
    if (two && AV.mounted) window.StageAvatar.set({ enabled: false });
    if (!two && window.StageAvatar2D?.mounted) window.StageAvatar2D.set({ enabled: false });
    const A = av();
    if (!A) return;
    const c = config.avatar || {};
    // ตัวละคร: ?avatar=ชื่อ (ดูชั่วคราว) > เลือกไว้ของธีมนี้ > เลือกไว้รวม > ตามธีม
    const pick = params.get('avatar');
    let id = pick && /^[a-z_0-9]+$/.test(pick) ? pick : c.themeModels?.[THEME_ID] || (c.model && c.model !== 'auto' ? c.model : A.themeModel(THEME_ID));
    const url = id === 'custom' ? `/avatar/current.vrm?rev=${c.rev || 0}` : `/avatar/${id}.vrm`;
    // ตำแหน่ง: ปรับเองแยกธีม (เต็มตัว/ครึ่งตัวเก็บแยก) หรือค่าเริ่มต้นที่เข้ากับฉาก
    const half = c.framing === 'half';
    const def = A.themeLayout(THEME_ID);
    const lay = c.layouts?.[THEME_ID + (half ? '_half' : '') + (two ? '_2d' : '')] || (half ? A.halfLayout : def);
    AV.lay = lay;
    // ชุด: ตามธีม (ปิดได้ในหลังบ้าน) • ?outfit=ธีม ใช้ลองชุด
    const outfit = params.get('outfit') ?? (c.outfit !== false ? THEME_ID : '');
    // จังหวะเต้น = BPM ของดนตรีพื้นหลัง (คอนเสิร์ต = BPM ของธีม)
    const ms = config.music?.style && config.music.style !== 'auto' ? config.music.style : THEME_ID;
    const bpm = THEME_ID === 'concert' ? Number(T.bpm) || 112 : window.StageMusic?.STYLES?.[ms]?.bpm || 100;
    A.set({
      enabled: !!c.enabled || !!pick || !!params.get('style'), x: lay.x, y: lay.y, h: lay.h, url, fps: LITE || PERF.q >= 1 ? 24 : 30, theme: THEME_ID,
      map: c.map || {}, bpm, quality: LITE || PERF.q >= 2 ? 'lite' : 'hi', outfit, framing: half ? 'half' : 'full',
      outline: c.outline ?? 1, front: !!c.front, aa: PERF.q >= 2 ? 'lite' : c.aa || '8x', wander: c.wander !== false,
    });
  }
  // สมาชิกฟรีของ TubHool: ชื่อเว็บเล็ก ๆ ที่มุมจอ (ผู้สนับสนุนไม่มี) — ไม่มีลิงก์/URL กัน TikTok มองว่าชวนออกนอกแอป
  function applyPlan() {
    $('thMark').style.display = config?.plan?.watermark && !THUMB ? '' : 'none';
  }
  const avOn = () => (config?.avatar?.enabled && config.avatar.react !== false ? av() : null);
  // เหตุการณ์ในไลฟ์ → ท่าทางตัวละคร
  function avatarReact(kind, d = {}) {
    const A = avOn();
    if (!A) return;
    const p = d.id ? fanPos(d.id) : null;
    if (p) A.lookAt(p.x, p.y, 2.5);
    // ท่าของแต่ละเหตุการณ์ตั้งได้ในหลังบ้าน (แท็บตัวละคร 3D)
    if (kind === 'join') {
      if (now() - AV.lastWave < 6000) return;
      AV.lastWave = now();
      A.react('join');
    } else if (kind === 'gift') {
      const total = d.total || 0;
      A.react(total >= 1000 ? 'giftXL' : total >= 100 ? 'giftL' : total >= 10 ? 'giftM' : 'giftS');
    } else A.react(kind);
  }
  // ปากขยับตามเสียงพูดอัตโนมัติ: ส่งเสียงผ่านตัววัดระดับ
  function routeSpeech(audio) {
    if (!actx || actx.state !== 'running' || !avOn()) return;
    try {
      if (!AV.analyser) {
        AV.analyser = actx.createAnalyser();
        AV.analyser.fftSize = 512;
        AV.buf = new Float32Array(512);
        AV.analyser.connect(fairAudioGate||actx.destination);
      }
      actx.createMediaElementSource(audio).connect(AV.analyser);
      AV.routed = true; // ประโยคนี้วัดระดับเสียงได้
    } catch {}
  }
  function updateMouth() {
    const A = avOn();
    if (!A || !AV.analyser || !saying || !AV.routed) return; // วัดไม่ได้ (เช่น เสียงของเครื่อง) → ให้ตัวละครขยับปากจำลองแทน
    AV.analyser.getFloatTimeDomainData(AV.buf);
    let sum = 0;
    for (const v of AV.buf) sum += v * v;
    const rms = Math.sqrt(sum / AV.buf.length);
    A.setMouth(Math.min(1, Math.max(0, (rms - 0.012) * 9)));
  }

  // ============================================================ โหมดเผื่อขอบมือถือ
  // มือถือคนดูจอยาวกว่า 9:16 → TikTok ตัดขอบซ้าย/ขวา และแถบบนของแอปทับหัวจอ
  // ย่อชั้นกล่องข้อความ (#ui) เข้ามาในพื้นที่ที่เห็นแน่ ๆ — ฉากหลัง/คนในฉากยังเต็มจอ
  const SAFE_LEVELS = { low: { side: 70, top: 150 }, mid: { side: 100, top: 190 }, high: { side: 125, top: 220 } };
  function safeBox() {
    const a = config?.safeArea || {};
    // ธีมที่จัดกรอบข้อความไว้ในพื้นที่ปลอดภัยเองแล้ว (เกมปีน) ไม่ต้องย่อซ้ำ
    if (!a.enabled || THUMB || TH?.ownSafe) return { side: 0, top: 0, on: false };
    return { ...(SAFE_LEVELS[a.level] || SAFE_LEVELS.mid), on: true };
  }
  function applySafeArea() {
    const { side, top, on } = safeBox();
    const s = (1080 - 2 * side) / 1080;
    $('ui').style.transform = on ? `translate(${side}px, ${top}px) scale(${s})` : '';
    if (GUIDE) drawGuide();
  }
  // ?guide = แสดงกรอบพื้นที่ที่มือถือคนดูโดนตัด/โดนปุ่ม TikTok ทับ (ใช้ตอนจัดฉาก อย่าใช้ลิงก์นี้ตอนไลฟ์)
  const GUIDE = params.has('guide');
  function drawGuide() {
    let g = $('safeGuide');
    if (!g) {
      g = document.createElement('div');
      g.id = 'safeGuide';
      root.appendChild(g);
    }
    // ค่าประมาณจากมือถือจอ 20:9 (ตัดข้างละ ~108px) — แต่ละรุ่น/เวอร์ชันแอปต่างกันเล็กน้อย
    const C = 108;
    const z = (x, y, w, h, t, soft) => `<div class="z${soft ? ' soft' : ''}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px">${t}</div>`;
    const { side, top, on } = safeBox();
    const s = (1080 - 2 * side) / 1080;
    g.innerHTML =
      z(0, 0, C, 1920, 'มือถือ<br>จอยาว<br>ตัดทิ้ง') +
      z(1080 - C, 0, C, 1920, 'มือถือ<br>จอยาว<br>ตัดทิ้ง') +
      z(C, 0, 1080 - 2 * C, 170, 'แถบบนของ TikTok (โปรไฟล์ • คนดู • ปุ่มปิด)', true) +
      z(C, 1330, 600, 470, 'คอมเมนต์ของ TikTok ลอยทับตรงนี้', true) +
      z(1080 - C - 120, 1330, 120, 470, 'ปุ่ม<br>ของขวัญ<br>แชร์', true) +
      z(C, 1810, 1080 - 2 * C, 110, 'ช่องพิมพ์คอมเมนต์', true) +
      `<div class="ok" style="left:${side}px;top:${top}px;width:${1080 - 2 * side}px;height:${Math.round(1920 * s)}px;display:${on ? '' : 'none'}"><b>✓ กล่องข้อความทั้งหมดอยู่ในกรอบนี้</b></div>`;
  }

  let thVoice = null;
  function loadVoices() {
    const vs = speechSynthesis.getVoices();
    thVoice = vs.find((v) => /th(-|_)?TH/i.test(v.lang)) || vs.find((v) => /^th/i.test(v.lang)) || null;
  }
  if ('speechSynthesis' in window) {
    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
  }
  // ============================================================ เสียงพูด (TTS)
  // เสียงธรรมชาติจากเซิร์ฟเวอร์ (/api/tts) → ถ้าใช้ไม่ได้สลับเป็นเสียงของเครื่องอัตโนมัติ
  // มีคิว ไม่พูดทับกัน รวบเมื่อคิวยาว ประโยคหลากหลาย ชื่อของขวัญเป็นภาษาไทย
  const GIFT_TH = {
    rose: ['กุหลาบ', 'ดอก'], tiktok: ['ติ๊กต็อก', 'อัน'], 'finger heart': ['นิ้วหัวใจ', 'อัน'], 'heart me': ['ฮาร์ทมี', 'อัน'],
    gg: ['จีจี', 'อัน'], 'ice cream cone': ['ไอศกรีม', 'โคน'], lollipop: ['อมยิ้ม', 'อัน'], perfume: ['น้ำหอม', 'ขวด'],
    doughnut: ['โดนัท', 'ชิ้น'], donut: ['โดนัท', 'ชิ้น'], 'hand hearts': ['มือหัวใจ', 'อัน'], 'hand heart': ['มือหัวใจ', 'อัน'],
    butterfly: ['ผีเสื้อ', 'ตัว'], swan: ['หงส์', 'ตัว'], 'gold mine': ['เหมืองทอง', 'อัน'], galaxy: ['กาแล็กซี่', 'อัน'],
    lion: ['สิงโต', 'ตัว'], universe: ['จักรวาล', 'อัน'], corgi: ['คอร์กี้', 'ตัว'], 'money gun': ['ปืนยิงเงิน', 'กระบอก'],
    confetti: ['กระดาษสี', 'ชุด'], sunglasses: ['แว่นกันแดด', 'อัน'], mic: ['ไมค์', 'อัน'], 'paper crane': ['นกกระเรียนกระดาษ', 'ตัว'],
    heart: ['หัวใจ', 'ดวง'], 'love you': ['เลิฟยู', 'อัน'], cap: ['หมวก', 'ใบ'], rosa: ['โรซ่า', 'ดอก'], 'cake slice': ['เค้ก', 'ชิ้น'],
    'hat and mustache': ['หมวกกับหนวด', 'ชุด'], 'friendship necklace': ['สร้อยมิตรภาพ', 'เส้น'], 'tiny diny': ['ไดโนจิ๋ว', 'ตัว'],
  };
  function giftWords(name) {
    const key = String(name || '').trim().toLowerCase();
    for (const line of String(config?.tts?.giftNames || '').split('\n')) {
      const m = line.match(/^\s*(.+?)\s*=\s*([^|]+?)\s*(?:\|\s*(.+?))?\s*$/);
      if (m && m[1].toLowerCase() === key) return [m[2], m[3] || 'ชิ้น'];
    }
    return GIFT_TH[key] || [name, 'ชิ้น'];
  }
  // ชื่อที่อ่านออกเสียงได้: ตัดอีโมจิ/สัญลักษณ์ ตัวซ้ำยาว ๆ และจำกัดความยาว
  function sayName(n) {
    let s = String(n || '').normalize('NFC');
    s = s.replace(/[\p{Extended_Pictographic}‍️\u{1F3FB}-\u{1F3FF}]/gu, '');
    s = s.replace(/[_\-.~|•·*#@!$%^&()+=[\]{}<>\\/"'`:;,?]+/g, ' ');
    s = s.replace(/(.)\1{2,}/gu, '$1$1').replace(/\s+/g, ' ').trim();
    const chars = [...s];
    if (chars.length > 20) s = chars.slice(0, 20).join('');
    return s || 'คุณผู้ชม';
  }
  function cleanSpeech(t) {
    return String(t || '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[\p{Extended_Pictographic}‍️]/gu, '')
      .replace(/5{3,}/g, ' ฮ่า ๆ ')
      .replace(/(.)\1{3,}/gu, '$1$1')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80);
  }
  const P = () => ((config?.tts?.voice || '').includes('Niwat') ? { k: 'ครับ', na: 'นะครับ' } : { k: 'ค่ะ', na: 'นะคะ' });
  const pickLine = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const sayQ = [];
  let saying = false;
  let edgeDownUntil = 0;
  const SAY_KEY = { gift: 'gifts', batch: 'gifts', follow: 'follows', chat: 'comments', join: 'joins', welcome: 'welcome', win: 'wins', game: 'wins' };
  function purgeSay() {
    const t = config?.tts || {};
    for (let i = sayQ.length - 1; i >= 0; i--) if (SAY_KEY[sayQ[i].kind] && !t[SAY_KEY[sayQ[i].kind]]) sayQ.splice(i, 1);
    if (!t.gifts) {
      for (const h of giftHold.values()) clearTimeout(h.timer);
      giftHold.clear();
    }
  }
  function enqueue(item) {
    if (SILENT || !fairAudioAllowed() || !item.text) return;
    sayQ.push(item);
    sayQ.sort((a, b) => b.prio - a.prio);
    // คิวยาวเกิน: ทิ้งอันที่สำคัญน้อย แล้วรวบคำขอบคุณของขวัญเป็นประโยคเดียว
    if (sayQ.length > 4) {
      for (let i = sayQ.length - 1; i >= 0 && sayQ.length > 4; i--) if (sayQ[i].prio < 2) sayQ.splice(i, 1);
      const gifts = sayQ.filter((x) => x.kind === 'gift');
      if (sayQ.length > 4 && gifts.length >= 3) {
        const names = [...new Set(gifts.map((g) => g.name))];
        const rest = sayQ.filter((x) => x.kind !== 'gift');
        sayQ.length = 0;
        sayQ.push({ kind: 'batch', prio: 2, text: `ขอบคุณ ${names.slice(0, 3).join(' ')}${names.length > 3 ? ` และอีก ${names.length - 3} คน` : ''} ที่ส่งของขวัญมา${P().na}` }, ...rest);
      }
    }
    if (!saying) nextSay();
  }
  async function nextSay() {
    const it = sayQ.shift();
    if (THEME_ID==='templefair'&&!fairAudioAllowed()){sayQ.length=0;saying=false;duckMusic(false);return;}
    if (!it) {
      saying = false;
      duckMusic(false);
      av()?.setSpeaking(false);
      return;
    }
    saying = true;
    AV.routed = false;
    duckMusic(true);
    av()?.setSpeaking(true);
    avBubble(it.text);
    try {
      await playSpeech(it.text);
    } catch {}
    avBubbleOff();
    setTimeout(nextSay, 180);
  }
  async function playSpeech(text) {
    const t = config?.tts || {};
    if (t.engine !== 'browser' && now() > edgeDownUntil) {
      try {
        return await playEdge(text, t);
      } catch (e) {
        if (e?.name === 'NotAllowedError') return checkUnlock(true);
        edgeDownUntil = now() + 20000; // ใช้ไม่ได้ชั่วคราว → เสียงเครื่องไปก่อน 20 วิ แล้วลองใหม่
      }
    }
    if (t.voice === 'th-TH-PremwadeeNeural' && t.engine !== 'browser') {
      toast('เสียงเปรมวดีไม่พร้อมชั่วคราว · ข้ามประโยคนี้ ไม่สลับผู้พูด', 'big');
      return;
    }
    return playBrowser(text, t);
  }
  function playEdge(text, t) {
    return new Promise((resolve, reject) => {
      const q = new URLSearchParams({ text, voice: t.voice || '', rate: t.rate ?? 1, pitch: t.pitch ?? 0 });
      const a = new Audio('/api/tts?' + q);
      a.volume = t.volume ?? 0.9;
      routeSpeech(a);
      let done = false;
      const fin = (err) => {
        if (done) return;
        done = true;
        clearTimeout(to);
        if(THEME_ID==='templefair'){a.pause();a.onended=a.onerror=null;if(speechCancel===cancel)speechCancel=null;}
        err ? reject(err) : resolve();
      };
      const cancel=()=>fin();if(THEME_ID==='templefair')speechCancel=cancel;
      const to = setTimeout(() => fin(new Error('timeout')), 15000 + text.length * 150);
      a.onended = () => fin();
      a.onerror = () => fin(new Error('audio error'));
      a.play().catch((e) => fin(e));
    });
  }
  function playBrowser(text, t) {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) return resolve();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'th-TH';
      if (thVoice) u.voice = thVoice;
      u.rate = t.rate || 1;
      u.volume = t.volume ?? 0.9;
      if(THEME_ID==='templefair'){
        let done=false;const finish=(stop=false)=>{if(done)return;done=true;clearTimeout(timer);if(stop)speechSynthesis.cancel();if(speechCancel===cancel)speechCancel=null;resolve();},cancel=()=>finish(true),timer=setTimeout(cancel,15000);
        speechCancel=cancel;u.onend=()=>finish();u.onerror=()=>finish(true);speechSynthesis.speak(u);
      }else{u.onend=()=>resolve();u.onerror=()=>resolve();speechSynthesis.speak(u);setTimeout(resolve,15000);}
    });
  }

  // ของขวัญแบบคอมโบส่งมาทีละชิ้น → รอรวมจำนวนก่อนค่อยพูดครั้งเดียว
  const giftHold = new Map();
  function sayGift(d) {
    const t = config?.tts || {};
    if (!t.gifts) return;
    const key = d.user.id + '|' + d.gift.name;
    let h = giftHold.get(key);
    if (!h) {
      h = { d, count: 0, total: 0, first: now() };
      giftHold.set(key, h);
    }
    h.count += d.gift.count;
    h.total += d.gift.total;
    clearTimeout(h.timer);
    const wait = Math.max(0, Math.min(1500, 4000 - (now() - h.first)));
    h.timer = setTimeout(() => {
      giftHold.delete(key);
      if (h.total < (t.minDiamonds || 0)) return;
      const [g, unit] = giftWords(d.gift.name);
      const n = sayName(d.user.name);
      const qty = h.count > 1 ? ` ${h.count} ${unit}` : '';
      const { k, na } = P();
      const lines = h.total >= 100
        ? [`โอ้โห ${n} ส่ง${g}${qty}มาเลย ขอบคุณมาก ๆ เลย${k}`, `ว้าว ${n} จัดเต็มมาก ขอบคุณสำหรับ${g}${qty}${na}`, `ขอบคุณ ${n} ใจดีที่สุดเลย ที่ส่ง${g}${qty}มาให้${na}`]
        : [`ขอบคุณ ${n} ที่ส่ง${g}${qty}มา${na}`, `ว้าว ${n} ส่ง${g}${qty}มา ขอบคุณ${k}`, `ขอบคุณ${g}${qty}จาก ${n}${na}`, `${n} ใจดีจัง ขอบคุณสำหรับ${g}${na}`];
      enqueue({ kind: 'gift', prio: 2, name: n, text: pickLine(lines) });
    }, wait);
  }
  function sayJoin(a) {
    if (!config?.tts?.joins) return;
    const n = sayName(a.name);
    const { k, na } = P();
    enqueue({ kind: 'join', prio: 0, text: pickLine([`สวัสดี${k} ${n}`, `ยินดีต้อนรับ ${n}${na}`, `${n} มาแล้ว สวัสดี${k}`]) });
  }
  function sayChat(d) {
    if (!config?.tts?.comments || config?.safety?.safeMode) return; // โหมดปลอดภัย: ไม่อ่านคอมเมนต์
    const txt = cleanSpeech(d.text);
    if (!txt) return;
    enqueue({ kind: 'chat', prio: 1, text: `${sayName(d.name)} บอกว่า ${txt}` });
  }
  function sayFollow(d) {
    if (!config?.tts?.follows) return;
    const n = sayName(d.name);
    const { k, na } = P();
    enqueue({ kind: 'follow', prio: 2, text: pickLine([`ขอบคุณ ${n} ที่กดติดตาม${na}`, `${n} กดติดตามแล้ว ขอบคุณมาก${k}`]) });
  }
  function sayWin(d) {
    if (!config?.tts?.wins) return;
    const { na } = P();
    enqueue({ kind: 'win', prio: 2, text: `ยินดีด้วย ${sayName(d.user.name)} ${d.kind === 'quiz' ? 'ตอบถูก' : d.kind === 'type' ? 'พิมพ์ไวที่สุด' : 'ทายถูก'}${na}` });
  }
  function sayWelcome(d) {
    if (!config?.tts?.welcome) return;
    enqueue({ kind: 'welcome', prio: 1, text: `ยินดีต้อนรับกลับ ${sayName(d.name)}${P().na}` });
  }
  window.__say = { sayName, cleanSpeech, giftWords, enqueue };

  let audioBlocked = false;
  // ============================================================ โหมดมือถือ
  // ขอบบน/ล่างที่เกินสัดส่วน 9:16 → เติมด้วยสีขอบฉากแทนแถบดำ (ใช้ได้ทุกธีม)
  function fillLetterbox() {
    try {
      const c = staticLayer.getContext('2d');
      const avg = (y) => {
        const d = c.getImageData(0, y, 1080, 6).data;
        let r = 0, g = 0, b = 0;
        for (let i = 0; i < d.length; i += 4) {
          r += d[i];
          g += d[i + 1];
          b += d[i + 2];
        }
        const n = d.length / 4;
        return `rgb(${Math.round(r / n)},${Math.round(g / n)},${Math.round(b / n)})`;
      };
      const top = avg(0);
      const bot = avg(1914);
      const bg = `linear-gradient(${top} 0 50%, ${bot} 50% 100%)`;
      document.documentElement.style.background = bg;
      document.body.style.background = bg;
    } catch {}
  }

  let wakeLock = null;
  async function keepAwake() {
    try {
      if ('wakeLock' in navigator && document.visibilityState === 'visible') {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => (wakeLock = null));
      }
    } catch {}
  }
  async function goFullscreen() {
    const el = document.documentElement;
    try {
      if (!document.fullscreenElement && el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
      else if (!document.webkitFullscreenElement && el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    } catch {}
    try {
      await screen.orientation?.lock?.('portrait');
    } catch {}
    setTimeout(fit, 300);
  }
  if (MOBILE) {
    const ov = $('mstart');
    const canFull = !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
    if (!STANDALONE) ov.classList.add('on');
    if (!canFull && !STANDALONE) ov.querySelector('.ios').style.display = 'block';
    ov.addEventListener('click', () => {
      actx?.resume().then(checkUnlock);
      if ('speechSynthesis' in window && !SILENT) speechSynthesis.speak(new SpeechSynthesisUtterance(''));
      goFullscreen();
      keepAwake();
      ov.classList.remove('on');
    });
    if (STANDALONE) document.addEventListener('pointerdown', keepAwake, { once: true });
    // แตะ 2 ครั้ง = กลับเต็มจอ
    document.addEventListener('dblclick', () => {
      goFullscreen();
      keepAwake();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !wakeLock) keepAwake();
    });
    addEventListener('orientationchange', () => setTimeout(fit, 300));
  }

  function checkUnlock(blockedAudio) {
    if (blockedAudio === true) audioBlocked = true;
    const t = config?.tts || {};
    const needs = config && (config.sound || config.music?.enabled || PL.playing || t.gifts || t.comments || t.joins || t.follows || t.wins);
    const blocked = (actx && actx.state !== 'running') || audioBlocked;
    $('unlock').style.display = needs && blocked && !SILENT && !MOBILE ? 'block' : 'none';
  }
  document.addEventListener('pointerdown', () => {
    audioBlocked = false;
    actx?.resume().then(checkUnlock);
    if ('speechSynthesis' in window && !SILENT) speechSynthesis.speak(new SpeechSynthesisUtterance(''));
  });
  setTimeout(() => actx?.resume().then(checkUnlock).catch(() => {}), 300);

  // ============================================================ คนเดินไปมา (NPC บรรยากาศ) — วาดบน canvas พื้นหลัง
  const NPC_SKIN = ['#f1c7a3', '#e0ac85', '#c98e66', '#f7d8bd'];
  const NPC_HAIR = ['#1b1210', '#2b1a12', '#3a2416', '#0f0f14', '#4a2e1c'];
  const NPC_CLOTH = ['#d94f7c', '#e0803a', '#4f8fd9', '#3fae7a', '#8a5cd6', '#d9b23a', '#c43a3a', '#2fa8a8', '#e8e2d6'];

  // style: thai-f | thai-m | casual | white | monk | kid | shadow
  function makeLook(style, opts = {}) {
    const look = {
      style,
      skin: pick(NPC_SKIN),
      hair: pick(NPC_HAIR),
      shirt: pick(NPC_CLOTH),
      bottom: pick(NPC_CLOTH),
      female: style === 'thai-f' || (style !== 'thai-m' && style !== 'monk' && Math.random() < 0.5),
      dim: opts.dim ?? 0.18, // ทำให้สีหม่นลงนิดหน่อย คนดูจริงจะเด่นกว่า
      ...opts,
    };
    if (style === 'white') look.shirt = '#f3eee4';
    if (style === 'white') look.bottom = '#e4ddd0';
    if (style === 'monk') {
      look.shirt = '#d9781e';
      look.bottom = '#c4661a';
      look.hair = null;
    }
    if (style === 'thai-m') look.shirt = pick(['#f3eee4', '#e8e2d6', '#d9c9a8']);
    return look;
  }

  function drawCarry(c, kind, hx, hy, t) {
    if (!kind) return;
    c.save();
    c.translate(hx, hy);
    switch (kind) {
      case 'krathong': {
        c.fillStyle = '#2f7a3a';
        c.beginPath();
        c.ellipse(0, 2, 13, 4, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#ff8fc8';
        c.beginPath();
        c.moveTo(-10, 1);
        c.lineTo(0, -12);
        c.lineTo(10, 1);
        c.fill();
        c.fillStyle = '#fff6e0';
        c.fillRect(-1.5, -20, 3, 9);
        glowDot(c, 0, -22, 10, '255,200,110', 0.75 + 0.2 * Math.sin(t / 90));
        break;
      }
      case 'lantern':
        glowDot(c, 0, 4, 22, '255,170,70', 0.55);
        c.fillStyle = '#ffb35a';
        rr(c, -6, -4, 12, 16, 4);
        c.fill();
        c.strokeStyle = '#5a3a1a';
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(0, -4);
        c.lineTo(0, -12);
        c.stroke();
        break;
      case 'incense':
        c.strokeStyle = '#8a5a3a';
        c.lineWidth = 1.4;
        for (const dx of [-3, 0, 3]) {
          c.beginPath();
          c.moveTo(0, 0);
          c.lineTo(dx * 1.6, -24);
          c.stroke();
        }
        for (const dx of [-3, 0, 3]) glowDot(c, dx * 1.6, -24, 6, '255,120,40', 0.9);
        break;
      case 'garland':
        for (let i = 0; i < 9; i++) {
          const an = (i / 9) * Math.PI * 2;
          c.fillStyle = i % 3 === 0 ? '#fff8ec' : i % 3 === 1 ? '#ff9f1a' : '#ffd23f';
          c.beginPath();
          c.arc(Math.cos(an) * 7, 8 + Math.sin(an) * 7, 2.6, 0, Math.PI * 2);
          c.fill();
        }
        break;
      case 'basket':
        c.fillStyle = '#9a6a3a';
        c.beginPath();
        c.ellipse(0, 2, 11, 7, 0, 0, Math.PI);
        c.fill();
        for (const [dx, col] of [[-5, '#ff9a1a'], [1, '#e8d24a'], [6, '#d94f2a']]) {
          c.fillStyle = col;
          c.beginPath();
          c.arc(dx, 0, 4, 0, Math.PI * 2);
          c.fill();
        }
        break;
      case 'sparkler':
        c.strokeStyle = '#777';
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(6, -20);
        c.stroke();
        glowDot(c, 6, -21, 14, '255,240,190', 0.8 + 0.2 * Math.sin(t / 30));
        break;
      case 'phone':
        c.fillStyle = '#111';
        c.fillRect(-3, -6, 6, 10);
        glowDot(c, 0, -1, 8, '200,220,255', 0.5);
        break;
    }
    c.restore();
  }

  function glowDot(c, x, y, r, rgb, a) {
    const prev = c.globalCompositeOperation;
    c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb},${a})`);
    g.addColorStop(0.3, `rgba(${rgb},${a * 0.4})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    c.fillStyle = g;
    c.fillRect(x - r, y - r, r * 2, r * 2);
    c.globalCompositeOperation = prev;
  }

  // วาดคน (เท้าอยู่ที่ x,y) — view: side | back | front, pose: walk | stand | bow | kneel
  function drawPerson(c, x, y, s, look, o = {}) {
    const { phase = 0, view = 'side', dir = 1, pose = 'walk', carry = null, t = 0, alpha = 1 } = o;
    const sw = pose === 'walk' ? Math.sin(phase) : 0;
    const bob = pose === 'walk' ? -Math.abs(Math.cos(phase)) * 2.5 : 0;
    const shadow = look.style === 'shadow';
    const col = (hex) => (shadow ? '#0a0d26' : look.dim ? mix(hex, '#1a1630', look.dim) : hex);
    const skin = col(look.skin);
    const hair = look.hair ? col(look.hair) : skin;
    const shirt = col(look.shirt);
    const bottom = col(look.bottom);
    const robe = look.style === 'monk';
    const skirt = !robe && look.female && (look.style === 'thai-f' || look.style === 'white');

    c.save();
    c.globalAlpha *= alpha;
    c.translate(x, y);
    if (!shadow) {
      c.fillStyle = 'rgba(0,0,0,0.32)';
      c.beginPath();
      c.ellipse(0, 0, 15 * s, 3.6 * s, 0, 0, Math.PI * 2);
      c.fill();
    }
    c.scale(s * (view === 'side' ? dir : 1), s);
    c.translate(0, bob);
    c.lineCap = 'round';
    c.lineJoin = 'round';

    if (pose === 'kneel') {
      // นั่งยอง ๆ ริมน้ำ
      c.fillStyle = bottom;
      c.beginPath();
      c.ellipse(-2, -14, 15, 12, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = shirt;
      rr(c, -10, -52, 20, 36, 8);
      c.fill();
      c.strokeStyle = skirt ? skin : shirt;
      c.lineWidth = 7;
      c.beginPath();
      c.moveTo(4, -44);
      c.lineTo(14, -22);
      c.lineTo(20, -10);
      c.stroke();
      drawHead(c, 2, -62, hair, skin, look, view);
      drawCarry(c, carry, 22, -10, t);
      c.restore();
      return;
    }

    const bowY = pose === 'bow' ? 10 : 0;
    const bowK = pose === 'bow' ? 0.86 : 1;

    // ขา
    const legW = 8;
    if (view === 'side') {
      if (robe || skirt) {
        c.strokeStyle = skin;
        c.lineWidth = 6;
        c.beginPath();
        c.moveTo(-sw * 2, -14);
        c.lineTo(-sw * 9, 0);
        c.moveTo(sw * 2, -14);
        c.lineTo(sw * 9, 0);
        c.stroke();
      } else {
        c.strokeStyle = bottom;
        c.lineWidth = legW;
        c.beginPath();
        c.moveTo(0, -48);
        c.lineTo(-sw * 14, 0);
        c.moveTo(0, -48);
        c.lineTo(sw * 14, 0);
        c.stroke();
      }
    } else {
      const l = Math.max(0, sw) * 5;
      const r = Math.max(0, -sw) * 5;
      c.strokeStyle = robe || skirt ? skin : bottom;
      c.lineWidth = robe || skirt ? 6 : legW;
      c.beginPath();
      c.moveTo(-6, robe || skirt ? -14 : -48);
      c.lineTo(-6, -l);
      c.moveTo(6, robe || skirt ? -14 : -48);
      c.lineTo(6, -r);
      c.stroke();
    }

    c.save();
    c.translate(0, bowY);
    c.scale(1, bowK);
    // แขนหลัง
    const armSw = -sw;
    if (view === 'side') {
      c.strokeStyle = robe ? shirt : skirt ? skin : shirt;
      c.lineWidth = 6.5;
      c.beginPath();
      c.moveTo(0, -82);
      c.lineTo(-armSw * 12, -54);
      c.stroke();
    }
    // กระโปรง/ผ้าถุง/จีวร
    if (robe) {
      c.fillStyle = shirt;
      c.beginPath();
      c.moveTo(-13, -90);
      c.lineTo(13, -90);
      c.lineTo(15, -12);
      c.lineTo(-15, -12);
      c.closePath();
      c.fill();
      c.strokeStyle = bottom;
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(-12, -88);
      c.lineTo(12, -50);
      c.stroke();
    } else {
      if (skirt) {
        c.fillStyle = bottom;
        c.beginPath();
        c.moveTo(-11, -52);
        c.lineTo(11, -52);
        c.lineTo(13, -13);
        c.lineTo(-13, -13);
        c.closePath();
        c.fill();
        c.fillStyle = 'rgba(224,176,74,0.7)';
        c.fillRect(-13, -22, 26, 4);
      }
      // ลำตัว
      c.fillStyle = look.style === 'thai-f' ? skin : shirt;
      rr(c, -11, -90, 22, 42, 8);
      c.fill();
      if (look.style === 'thai-f') {
        // สไบ
        c.fillStyle = shirt;
        c.beginPath();
        c.moveTo(-11, -88);
        c.lineTo(-2, -90);
        c.lineTo(11, -60);
        c.lineTo(11, -48);
        c.lineTo(-11, -48);
        c.closePath();
        c.fill();
      }
    }
    // หัว
    drawHead(c, view === 'side' ? 2 : 0, -100, hair, skin, look, view);
    // แขนหน้า + ของในมือ
    c.strokeStyle = robe ? shirt : look.style === 'thai-f' ? skin : shirt;
    c.lineWidth = 6.5;
    c.beginPath();
    if (view === 'side') {
      if (carry) {
        c.moveTo(0, -82);
        c.lineTo(10, -66);
        c.lineTo(17, -62);
      } else {
        c.moveTo(0, -82);
        c.lineTo(armSw * 12, -54);
      }
    } else if (pose === 'bow' || carry === 'incense') {
      // พนมมือ
      c.moveTo(-10, -84);
      c.lineTo(-4, -96);
      c.moveTo(10, -84);
      c.lineTo(4, -96);
    } else {
      c.moveTo(-11, -84);
      c.lineTo(-13 - armSw * 2, -56);
      c.moveTo(11, -84);
      c.lineTo(13 + armSw * 2, -56);
    }
    c.stroke();
    if (view === 'side') drawCarry(c, carry, 18, -62, t);
    else if (pose === 'bow' || carry === 'incense') drawCarry(c, carry === 'incense' ? 'incense' : null, 0, -98, t);
    else if (carry) drawCarry(c, carry, 13, -56, t);
    c.restore();
    c.restore();
  }

  function drawHead(c, hx, hy, hair, skin, look, view) {
    c.fillStyle = look.hair ? hair : skin;
    c.beginPath();
    c.arc(hx, hy, 11.5, 0, Math.PI * 2);
    c.fill();
    if (look.hair && view !== 'back') {
      c.fillStyle = skin;
      c.beginPath();
      if (view === 'side') c.arc(hx + 5, hy + 2, 7.5, 0, Math.PI * 2);
      else c.ellipse(hx, hy + 3, 8, 7.5, 0, 0, Math.PI * 2);
      c.fill();
    }
    if (look.female && look.hair && look.style !== 'kid') {
      c.fillStyle = hair;
      c.beginPath();
      c.arc(hx - (view === 'side' ? 9 : 0), hy - (view === 'side' ? 6 : 11), 5.5, 0, Math.PI * 2);
      c.fill();
      if (look.style === 'thai-f') {
        c.fillStyle = '#fff8ec';
        c.beginPath();
        c.arc(hx - (view === 'side' ? 6 : 4), hy - 12, 2.2, 0, Math.PI * 2);
        c.fill();
      }
    }
  }

  function mix(hex, toHex, k) {
    const a = parseInt(hex.slice(1), 16);
    const b = parseInt(toHex.slice(1), 16);
    const ch = (sh) => Math.round(((a >> sh) & 255) * (1 - k) + ((b >> sh) & 255) * k);
    return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
  }

  // ตัวละครคนดูแบบยืนหันหลัง ปรับชุด/หมวก/ของในมือได้ (ใช้กับธีมใหม่ ๆ)
  // o.item(h): SVG ของในมือ (จุด 0,0 = มือ), o.hat(h): SVG บนหัว (0,0 = กลางหัว), o.pattern: 'floral' | 'stripe' | 'dots'
  // ตัวละครคนดูแบบจิบิ (หัวโต ตาโต แก้มชมพู) — หน้าตา/ทรงผม/ของบนหัว สุ่มจากไอดีคนดู (คนเดิมได้หน้าเดิมทุกครั้ง)
  // ท่าทาง (CSS ใน stage.html): กะพริบตา • .talk = โบกมือ+อ้าปาก • .happy = ตายิ้ม ^^ • .wave = กระโดด
  // o: shirtColor(color,h) • legs • hairs[] • pattern • hat(h,color) (พิกัดหัวเดิม r15) • item(h,color) (ถือในมือที่ยก)
  const CHIBI_HAIR = ['#2b1a12', '#3a2416', '#1b1210', '#5a3a22', '#7a4a2a', '#c27a3a', '#e8c070', '#2b1a12', '#3a2416', '#f4a6c6', '#9ac8ff', '#b9a3ff'];
  const CHIBI_EYE = ['#3a2418', '#2a1a2e', '#1f3a6a', '#4a2a5a', '#2a4a2a'];
  function standingFan(color, id, o = {}) {
    const h = hash(id) >>> 0;
    const b = (k, n) => (h >>> k) % n;
    const hairs = o.hairs || CHIBI_HAIR;
    const hair = hairs[b(0, hairs.length)];
    const hairD = shade(hair, -28);
    const skin = NPC_SKIN[b(4, NPC_SKIN.length)];
    const shirt = o.shirtColor ? o.shirtColor(color, h) : color;
    const dark = shade(shirt.startsWith('#') ? shirt : color, -50);
    const legs = o.legs || '#2a2438';
    const eye = CHIBI_EYE[b(9, CHIBI_EYE.length)];
    const style = b(12, 8); // 0 บ๊อบ 1 ยาว 2 แกละ 3 จุก 4 ชี้ตั้ง 5 แสกข้าง 6 หางม้า 7 ฟู
    const acc = o.hat ? -1 : b(16, 11); // 0 หูแมว 1 หูกระต่าย 2 โบว์ 3 ดอกไม้ 4 ต้นอ่อน 5 กิ๊บดาว 6+ ไม่มี
    const dress = b(20, 3) === 0; // กระโปรงบาน
    // ---- ผมด้านหลัง (อยู่หลังหัว)
    let back = '';
    if (style === 1) back = `<path d="M13 36 Q11 62 15 80 Q35 86 55 80 Q59 62 57 36Z" fill="${hairD}"/>`;
    else if (style === 2) back = `<ellipse cx="9" cy="54" rx="7" ry="15" fill="${hairD}" transform="rotate(12 9 54)"/><ellipse cx="61" cy="54" rx="7" ry="15" fill="${hairD}" transform="rotate(-12 61 54)"/><circle cx="13" cy="40" r="3" fill="#ff6b9d"/><circle cx="57" cy="40" r="3" fill="#ff6b9d"/>`;
    else if (style === 3) back = `<circle cx="35" cy="12" r="9" fill="${hair}"/><path d="M29 18 h12" stroke="#ff6b9d" stroke-width="3" stroke-linecap="round"/>`;
    else if (style === 6) back = `<path d="M54 30 Q70 40 62 66 Q58 74 54 70 Q62 50 52 38Z" fill="${hairD}"/>`;
    else if (style === 7) back = `<circle cx="35" cy="34" r="29" fill="${hairD}"/>`;
    // ---- ผมด้านหน้า (หน้าม้า)
    const FRONT = [
      `M12 42 Q10 13 35 12 Q60 13 58 42 Q56 30 50 27 Q44 34 35 29 Q26 34 20 27 Q14 30 12 42Z`,
      `M12 44 Q10 13 35 12 Q60 13 58 44 Q55 30 48 26 Q42 33 35 27 Q28 33 22 26 Q15 30 12 44Z`,
      `M12 42 Q10 13 35 12 Q60 13 58 42 Q56 31 49 28 Q43 33 35 30 Q27 33 21 28 Q14 31 12 42Z`,
      `M12 40 Q11 14 35 13 Q59 14 58 40 Q55 30 48 27 Q42 32 35 28 Q28 32 22 27 Q15 30 12 40Z`,
      `M12 38 Q10 14 35 11 Q60 14 58 38 L55 29 L51 33 L47 25 L41 31 L35 23 L29 31 L23 25 L19 33 L15 29Z`,
      `M12 42 Q10 12 37 12 Q60 14 58 40 Q54 28 44 25 Q30 34 16 33 Q13 36 12 42Z`,
      `M12 40 Q11 13 35 12 Q59 13 58 40 Q55 29 47 27 Q41 33 35 29 Q28 33 22 27 Q15 30 12 40Z`,
      `M10 42 Q8 10 35 9 Q62 10 60 42 Q57 28 49 26 Q43 33 35 28 Q27 33 21 26 Q13 28 10 42Z`,
    ][style];
    const shine = `<path d="M22 20 Q30 16 38 17" stroke="rgba(255,255,255,.35)" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    // ---- ของบนหัว
    const ACC = [
      `<path d="M14 24 L12 6 L27 16Z M56 24 L58 6 L43 16Z" fill="${hair}"/><path d="M16 20 L15 10 L23 16Z M54 20 L55 10 L47 16Z" fill="#ffb3c9"/>`,
      `<ellipse cx="25" cy="2" rx="5" ry="14" fill="#fff" transform="rotate(-10 25 2)"/><ellipse cx="45" cy="2" rx="5" ry="14" fill="#fff" transform="rotate(10 45 2)"/><ellipse cx="25" cy="3" rx="2.4" ry="9" fill="#ffc2d6" transform="rotate(-10 25 3)"/><ellipse cx="45" cy="3" rx="2.4" ry="9" fill="#ffc2d6" transform="rotate(10 45 3)"/>`,
      `<path d="M46 14 L37 8 L38 22Z M46 14 L55 8 L54 22Z" fill="#ff5c93"/><circle cx="46" cy="14" r="3.4" fill="#ff8fb5"/>`,
      `<g transform="translate(50 18)">${[0, 72, 144, 216, 288].map((a) => `<circle cx="${(Math.cos((a * Math.PI) / 180) * 4.6).toFixed(1)}" cy="${(Math.sin((a * Math.PI) / 180) * 4.6).toFixed(1)}" r="3.6" fill="#fff"/>`).join('')}<circle r="2.8" fill="#ffd23f"/></g>`,
      `<path d="M35 13 Q35 4 35 2" stroke="#4caf50" stroke-width="2" fill="none"/><ellipse cx="30" cy="3" rx="5" ry="2.6" fill="#7bd36b" transform="rotate(-25 30 3)"/><ellipse cx="40" cy="3" rx="5" ry="2.6" fill="#7bd36b" transform="rotate(25 40 3)"/>`,
      `<path d="M21 22 l2 4.4 4.8 .6 -3.6 3.2 1 4.8 -4.2 -2.4 -4.2 2.4 1 -4.8 -3.6 -3.2 4.8 -.6Z" fill="#ffd23f" stroke="#e6a817" stroke-width=".8"/>`,
    ];
    const accSvg = acc >= 0 && acc < ACC.length ? ACC[acc] : '';
    // ---- ลายเสื้อ
    let pattern = '';
    if (o.pattern === 'floral') pattern = [[26, 76], [40, 80], [31, 89], [45, 92]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="#fff" opacity=".85"/><circle cx="${x}" cy="${y}" r="1.1" fill="#ffd23f"/>`).join('');
    else if (o.pattern === 'stripe') pattern = [76, 84, 92].map((y) => `<rect x="20" y="${y}" width="30" height="2.6" fill="rgba(255,255,255,.35)"/>`).join('');
    else if (o.pattern === 'dots') pattern = [[27, 77], [41, 80], [31, 89], [44, 92]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.8" fill="#ffd23f"/>`).join('');
    else if (o.pattern === 'tang') pattern = `<line x1="35" y1="68" x2="35" y2="98" stroke="#ffd23f" stroke-width="2"/>` + [74, 82, 90].map((y) => `<rect x="31" y="${y}" width="8" height="2.2" rx="1" fill="#ffd23f"/>`).join('');
    else if (b(23, 3) === 0) pattern = `<path d="M30 66 L35 72 L40 66" stroke="#fff" stroke-width="2.2" fill="none" opacity=".8"/>`; // ปกเสื้อ
    const bodyPath = dress ? 'M22 70 Q22 64 30 63 L40 63 Q48 64 48 70 L55 99 Q35 104 15 99 Z' : 'M20 72 Q20 64 29 63 L41 63 Q50 64 50 72 L51 98 Q35 102 19 98 Z';
    const holding = !!o.item;
    // ---- หน้า
    const face = `
      <g class="ec"><path d="M23 44 Q26.5 46 30 44 M40 44 Q43.5 46 47 44" stroke="${eye}" stroke-width="2" fill="none" stroke-linecap="round"/></g>
      <g class="eo"><g class="eyes">
        <ellipse cx="26.5" cy="43" rx="3.8" ry="4.9" fill="${eye}"/><ellipse cx="43.5" cy="43" rx="3.8" ry="4.9" fill="${eye}"/>
        <circle cx="27.9" cy="41.2" r="1.6" fill="#fff"/><circle cx="44.9" cy="41.2" r="1.6" fill="#fff"/>
        <circle cx="25.6" cy="45" r=".8" fill="#fff" opacity=".8"/><circle cx="42.6" cy="45" r=".8" fill="#fff" opacity=".8"/></g></g>
      <g class="eh"><path d="M22.5 44 Q26.5 38.5 30.5 44 M39.5 44 Q43.5 38.5 47.5 44" stroke="${eye}" stroke-width="2.3" fill="none" stroke-linecap="round"/></g>
      <ellipse cx="21" cy="50" rx="4.2" ry="2.4" fill="#ff7fa5" opacity=".5"/><ellipse cx="49" cy="50" rx="4.2" ry="2.4" fill="#ff7fa5" opacity=".5"/>
      <path class="ms" d="M32 50.5 Q35 53.2 38 50.5" stroke="#8a3a3a" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <path class="mo" d="M31.5 50 Q35 50 38.5 50 Q38 55.5 35 55.5 Q32 55.5 31.5 50Z" fill="#a8323e"/>`;
    return `<svg class="chibi" viewBox="0 0 70 116" width="70" height="116" overflow="visible">
      <ellipse cx="35" cy="113" rx="19" ry="3.6" fill="rgba(0,0,0,.45)"/>
      ${back}
      <rect x="25" y="94" width="8.5" height="15" rx="4" fill="${legs}"/><rect x="36.5" y="94" width="8.5" height="15" rx="4" fill="${legs}"/>
      <ellipse cx="28.5" cy="110" rx="6" ry="3.4" fill="${shade(legs, -20)}"/><ellipse cx="41.5" cy="110" rx="6" ry="3.4" fill="${shade(legs, -20)}"/>
      <line x1="21" y1="70" x2="15.5" y2="88" stroke="${dark}" stroke-width="7.5" stroke-linecap="round"/><circle cx="15.5" cy="89" r="3.8" fill="${skin}"/>
      <path d="${bodyPath}" fill="${shirt}"/>${pattern}
      <circle cx="35" cy="38" r="23" fill="${skin}"/>
      ${face}
      <path d="${FRONT}" fill="${hair}"/>${shine}
      ${accSvg}
      ${o.hat ? `<g transform="translate(35 37) scale(1.45)">${o.hat(h, color)}</g>` : ''}
      <g class="arm${holding ? ' hold' : ''}" style="transform-origin:49px 69px">
        ${holding ? `<line x1="49" y1="69" x2="58" y2="56" stroke="${dark}" stroke-width="7.5" stroke-linecap="round"/><g transform="translate(58.5 55)">${o.item(h, color)}</g><circle cx="58.5" cy="55" r="4" fill="${skin}"/>`
          : `<line x1="49" y1="70" x2="54.5" y2="88" stroke="${dark}" stroke-width="7.5" stroke-linecap="round"/><circle cx="54.5" cy="89" r="3.8" fill="${skin}"/>`}
      </g>
    </svg>`;
  }

  // ตัวละครนั่งพับเพียบพนมมือไหว้พระ (หันหลังให้กล้อง = หันหน้าเข้าหาพระ) — ใช้ในฉากในโบสถ์
  // o.shirtColor(color, h) = สีเสื้อ, o.sarongs = สีผ้าถุง/โจงกระเบน, o.sabai = สีสไบ
  // ท่าทาง: .talk = ก้มกราบ, .happy = แสงบุญรอบมือ (ไม่มีแอนิเมชันวนตลอด — ประหยัดเครื่อง)
  const KNEEL_SARONG = ['#7a2e3a', '#3b4f8a', '#5b3a7a', '#2f6b4f', '#8a5a1e', '#9a3050'];
  function kneelFan(color, id, o = {}) {
    const h = hash(id) >>> 0;
    const b = (k, n) => (h >>> k) % n;
    const hairs = o.hairs || CHIBI_HAIR.slice(0, 9);
    const hair = hairs[b(0, hairs.length)];
    const hairD = shade(hair, -26);
    const skin = NPC_SKIN[b(4, NPC_SKIN.length)];
    const top = o.shirtColor ? o.shirtColor(color, h) : color;
    const topD = shade(top.startsWith('#') ? top : color, -30);
    const sarongs = o.sarongs || KNEEL_SARONG;
    const sarong = sarongs[b(8, sarongs.length)];
    const sabai = o.sabai ? o.sabai[b(11, o.sabai.length)] : '#e8b04a';
    const style = b(14, 6); // 0 ผมยาว 1 มวยต่ำ 2 หางม้า 3 สั้นชาย 4 บ๊อบ 5 เปีย
    const man = style === 3;
    const deco = man ? -1 : b(18, 4); // 0 ดอกมะลิทัดหู 1 โบว์ 2 ปิ่นทอง 3 ไม่มี
    const feetR = b(21, 2) === 0; // พับเพียบไปทางขวา/ซ้าย
    const fx = feetR ? 1 : -1;
    // ---- มือพนม (อยู่หลังหัว เห็นแค่ปลายนิ้วโผล่เหนือศีรษะ)
    const hands = `<g class="hands"><ellipse class="halo" cx="35" cy="27" rx="15" ry="15" fill="rgba(255,214,110,.55)"/>
      <path d="M35 17 Q30 25 30.6 37 L39.4 37 Q40 25 35 17Z" fill="${skin}" stroke="${shade(skin, -18)}" stroke-width=".8"/>
      <line x1="35" y1="19.5" x2="35" y2="37" stroke="${shade(skin, -22)}" stroke-width=".7"/></g>`;
    // ---- ผมด้านหลังศีรษะ
    let hairBack = `<circle cx="35" cy="56" r="23.5" fill="${hair}"/>`;
    if (style === 0) hairBack += `<path d="M13 58 Q12 86 20 96 L50 96 Q58 86 57 58Z" fill="${hair}"/><path d="M27 64 Q26 82 29 94 M43 64 Q44 82 41 94" stroke="${hairD}" stroke-width="1.4" fill="none"/>`;
    else if (style === 1) hairBack += `<circle cx="35" cy="73" r="8.5" fill="${hairD}"/><path d="M28 72 Q35 68 42 72" stroke="#ffd166" stroke-width="2" fill="none"/>`;
    else if (style === 2) hairBack += `<path d="M31 70 Q29 84 33 94 Q35 97 37 94 Q41 84 39 70Z" fill="${hairD}"/><circle cx="35" cy="69" r="3" fill="#ff6b9d"/>`;
    else if (style === 3) hairBack = `<circle cx="35" cy="56" r="23.5" fill="${hair}"/><path d="M14 64 Q35 76 56 64 L56 70 Q35 80 14 70Z" fill="${skin}"/>`;
    else if (style === 4) hairBack += `<path d="M12 56 Q12 74 18 76 L52 76 Q58 74 58 56Z" fill="${hair}"/>`;
    else hairBack += `<path d="M33 72 Q30 80 33 88 Q30 94 34 100 L36 100 Q40 94 37 88 Q40 80 37 72Z" fill="${hairD}"/><circle cx="35" cy="101" r="2.4" fill="#ff6b9d"/>`;
    const shine = `<path d="M24 42 Q32 36 42 38" stroke="rgba(255,255,255,.28)" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M20 56 Q35 62 50 56" stroke="${hairD}" stroke-width="1.2" fill="none" opacity=".6"/>`;
    const DECO = [
      `<g transform="translate(55 52)">${[0, 72, 144, 216, 288].map((a) => `<circle cx="${(Math.cos((a * Math.PI) / 180) * 3.6).toFixed(1)}" cy="${(Math.sin((a * Math.PI) / 180) * 3.6).toFixed(1)}" r="2.8" fill="#fff"/>`).join('')}<circle r="2" fill="#ffe08a"/></g>`,
      `<path d="M35 46 L27 41 L28 51Z M35 46 L43 41 L42 51Z" fill="#ff5c93"/><circle cx="35" cy="46" r="2.6" fill="#ff8fb5"/>`,
      `<path d="M22 40 L48 48" stroke="#ffd166" stroke-width="2.4" stroke-linecap="round"/><circle cx="48.5" cy="48.2" r="3" fill="#ffd166"/>`,
    ];
    const decoSvg = deco >= 0 && deco < DECO.length ? DECO[deco] : '';
    // ---- แขนยกพนมมือ (ศอกกางออกด้านข้าง)
    const arm = (sx) => `<path d="M${35 + sx * 13} 80 Q${35 + sx * 24} 76 ${35 + sx * 22} 66 Q${35 + sx * 19} 58 ${35 + sx * 10} 52" stroke="${topD}" stroke-width="7" fill="none" stroke-linecap="round"/>`;
    // ---- ลำตัวด้านหลัง + สไบ + ผ้าถุงพับเพียบ + ฝ่าเท้า
    const body = `<path d="M21 82 Q21 74 29 73 L41 73 Q49 74 49 82 L51 100 Q35 104 19 100Z" fill="${top}"/>
      ${man ? `<path d="M30 73 L35 79 L40 73" stroke="${topD}" stroke-width="1.6" fill="none"/>` : `<path d="M${feetR ? 22 : 48} 75 L${feetR ? 30 : 40} 74 L${feetR ? 51 : 19} 98 L${feetR ? 43 : 27} 101Z" fill="${sabai}"/><path d="M${feetR ? 24 : 46} 77 L${feetR ? 47 : 23} 99" stroke="${shade(sabai, -25)}" stroke-width="1" opacity=".6"/>`}`;
    const seat = `<ellipse cx="${35 + fx * 2}" cy="104" rx="25" ry="9" fill="${sarong}"/><path d="M${12 + fx * 2} 104 Q35 110 ${58 + fx * 2} 104" stroke="${shade(sarong, 40)}" stroke-width="2.2" fill="none" opacity=".75"/>
      <ellipse cx="${35 + fx * 25}" cy="107" rx="5" ry="3.2" fill="${shade(skin, -6)}" transform="rotate(${fx * -18} ${35 + fx * 25} 107)"/><ellipse cx="${35 + fx * 21}" cy="110" rx="4.6" ry="3" fill="${shade(skin, -12)}"/>`;
    return `<svg class="kneel" viewBox="0 0 70 116" width="70" height="116" overflow="visible">
      <ellipse cx="35" cy="113" rx="24" ry="3.8" fill="rgba(0,0,0,.4)"/>
      ${seat}
      <g class="upper">${hands}${body}${arm(-1)}${arm(1)}${hairBack}${shine}${decoSvg}</g>
    </svg>`;
  }

  // ตัวละครนั่งม้านั่งในโบสถ์ ก้มศีรษะอธิษฐาน (หันหลังให้กล้อง = หันหน้าเข้าแท่นบูชา) — ม้านั่งวาดทับครึ่งล่าง (hud-engine)
  // ใช้คลาส kneel ร่วมกับท่าไหว้พระ → ได้ท่าโยก/ก้ม/แสงพรชุดเดียวกัน
  function pewFan(color, id, o = {}) {
    const h = hash(id) >>> 0;
    const b = (k, n) => (h >>> k) % n;
    const hairs = o.hairs || CHIBI_HAIR;
    const hair = hairs[b(0, hairs.length)];
    const hairD = shade(hair, -26);
    const skin = NPC_SKIN[b(4, NPC_SKIN.length)];
    const top = o.shirtColor ? o.shirtColor(color, h) : color;
    const topD = shade(top.startsWith('#') ? top : color, -28);
    const style = b(8, 7); // 0 ผมยาว 1 มวย 2 หางม้าโบว์ 3 สั้นชาย 4 บ๊อบ 5 ผ้าคลุมลูกไม้ 6 เปียคู่
    const man = style === 3;
    // ---- แสงพร (ของขวัญ/ใจ)
    const halo = `<ellipse class="halo" cx="35" cy="40" rx="27" ry="11" fill="none" stroke="rgba(255,236,170,.9)" stroke-width="3"/>`;
    // ---- ไหล่/หลัง (ส่วนล่างโดนพนักม้านั่งบัง)
    const body = `<path d="M15 116 L17 92 Q19 82 29 80 L41 80 Q51 82 53 92 L55 116Z" fill="${top}"/>
      ${man ? `<path d="M28 80 Q35 86 42 80 L42 83 Q35 89 28 83Z" fill="#fff"/>` : `<path d="M24 81 Q35 90 46 81" stroke="${topD}" stroke-width="1.6" fill="none"/>`}
      <path d="M17 95 Q12 100 15 112" stroke="${topD}" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M53 95 Q58 100 55 112" stroke="${topD}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
    // ---- ศีรษะด้านหลัง (ก้มเล็กน้อย: ศีรษะต่ำลง เห็นท้ายทอย)
    const ears = `<ellipse cx="12.5" cy="63" rx="3" ry="4.5" fill="${skin}"/><ellipse cx="57.5" cy="63" rx="3" ry="4.5" fill="${skin}"/>`;
    const nape = `<path d="M27 76 Q35 82 43 76 L42 82 Q35 85 28 82Z" fill="${shade(skin, -8)}"/>`;
    let hb = `<circle cx="35" cy="60" r="23" fill="${hair}"/>`;
    if (style === 0) hb += `<path d="M13 62 Q12 90 18 104 L52 104 Q58 90 57 62Z" fill="${hair}"/><path d="M28 70 Q27 88 30 102 M42 70 Q43 88 40 102" stroke="${hairD}" stroke-width="1.3" fill="none"/>`;
    else if (style === 1) hb += `<circle cx="35" cy="43" r="9" fill="${hairD}"/><path d="M27 46 Q35 50 43 46" stroke="#f6c4d6" stroke-width="2.4" fill="none"/>`;
    else if (style === 2) hb += `<path d="M31 72 Q29 88 33 100 Q35 103 37 100 Q41 88 39 72Z" fill="${hairD}"/><path d="M35 70 L27 64 L28 75Z M35 70 L43 64 L42 75Z" fill="#ff8fb5"/><circle cx="35" cy="70" r="2.6" fill="#ffc2d6"/>`;
    else if (style === 3) hb = `${nape}<circle cx="35" cy="59" r="22.5" fill="${hair}"/>${ears}`;
    else if (style === 4) hb += `<path d="M12 60 Q12 80 18 82 L52 82 Q58 80 58 60Z" fill="${hair}"/>`;
    else if (style === 5) hb += `<path d="M10 58 Q10 34 35 34 Q60 34 60 58 L62 92 Q48 98 35 96 Q22 98 8 92Z" fill="rgba(255,255,255,.82)"/>${[14, 22, 30, 38, 46, 54].map((x) => `<circle cx="${x}" cy="${93 + (x % 16 ? 1 : 0)}" r="3.2" fill="rgba(255,255,255,.9)"/>`).join('')}<path d="M16 50 Q35 40 54 50" stroke="rgba(220,210,240,.8)" stroke-width="1.2" fill="none"/>`;
    else hb += `<path d="M18 70 Q12 86 17 100 Q20 103 22 99 Q19 86 24 72Z M52 70 Q58 86 53 100 Q50 103 48 99 Q51 86 46 72Z" fill="${hairD}"/><circle cx="20" cy="100" r="2.6" fill="#9ac8ff"/><circle cx="50" cy="100" r="2.6" fill="#9ac8ff"/>`;
    const shine = style === 5 ? '' : `<path d="M24 46 Q32 40 42 42" stroke="rgba(255,255,255,.3)" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    // ยกทั้งตัวขึ้น 16 หน่วย: พนักม้านั่งบังแค่ช่วงกลางหลังลงไป → เห็นศีรษะ + ไหล่ + หลังส่วนบน
    return `<svg class="kneel pewfig" viewBox="0 0 70 116" width="70" height="116" overflow="visible">
      <g transform="translate(0 -16)">${halo}${body}${hb}${shine}</g>
    </svg>`;
  }

  // ตัวละครนั่งละหมาด (นั่งบนส้นเท้าบนพรมละหมาด หันหลังให้กล้อง = หันหน้าไปทางมิห์รอบ/กิบลัต)
  // มีทั้งชุดผู้ชาย (หมวกกะปิเยาะห์ + เสื้อยาว) และผู้หญิง (ฮิญาบคลุมถึงหลัง) ในภาพเดียว
  // แสดงชุดไหนตามแถวที่นั่ง: .fan[data-rowtag="w"] = แถวผู้หญิง (ดู stage.html) • o.imam = อิหม่ามนำละหมาด
  const SALAH_HIJAB = ['#c9b8f0', '#a8dcd0', '#f4c2d0', '#bcd8f2', '#f2e2c4', '#d6c7e8', '#b9e0c2'];
  const SALAH_RUG = [['#1f6b6a', '#d9b35b'], ['#7a2e3a', '#e2c27a'], ['#2d4f8a', '#e6c46e'], ['#5a3a7a', '#e2c27a'], ['#2f6b4f', '#f0d27a']];
  function salahFan(color, id, o = {}) {
    const h = hash(id) >>> 0;
    const b = (k, n) => (h >>> k) % n;
    const skin = NPC_SKIN[b(4, NPC_SKIN.length)];
    const hair = CHIBI_HAIR[b(0, 6)];
    const hj = SALAH_HIJAB[b(8, SALAH_HIJAB.length)];
    const hjD = shade(hj, -30);
    const robe = o.imam ? '#ffffff' : ['#ffffff', '#f6f2e8', '#eef3f1', '#f3eee4'][b(12, 4)];
    const robeD = shade(robe, -22);
    const [rug, fringe] = SALAH_RUG[b(15, SALAH_RUG.length)];
    const kufiBand = o.imam ? '#2f8f6a' : ['#d9b35b', '#5fc9b8', '#c9b8f0', '#ffffff'][b(18, 4)];
    const halo = `<ellipse class="halo" cx="35" cy="34" rx="26" ry="10" fill="none" stroke="rgba(255,236,170,.9)" stroke-width="3"/>`;
    // พรมละหมาด (มุมมองเอียง) — หันยาวไปข้างหน้า
    const mat = `<path d="M10 116 L60 116 L54 92 L16 92Z" fill="${rug}"/><path d="M13 113 L57 113 L52.5 95 L17.5 95Z" fill="none" stroke="${fringe}" stroke-width="1.4"/>
      <path d="M35 96 L39 101 L35 106 L31 101Z" fill="${fringe}" opacity=".8"/>${[12, 20, 28, 36, 44, 52, 58].map((x) => `<line x1="${x}" y1="116" x2="${x}" y2="119" stroke="${fringe}" stroke-width="1.2"/>`).join('')}`;
    // ฝ่าเท้า (นั่งบนส้นเท้า เห็นจากด้านหลัง)
    const feet = `<ellipse cx="28" cy="107" rx="5" ry="3.4" fill="${shade(skin, -8)}"/><ellipse cx="42" cy="107" rx="5" ry="3.4" fill="${shade(skin, -8)}"/>`;
    // ผู้ชาย: เสื้อยาว + หมวกกะปิเยาะห์
    const man = `<g class="gm">
      <path d="M12 106 Q12 84 20 76 Q27 71 35 71 Q43 71 50 76 Q58 84 58 106 Q35 112 12 106Z" fill="${robe}"/>
      <path d="M35 74 L35 104" stroke="${robeD}" stroke-width="1" opacity=".6"/><path d="M18 98 Q35 104 52 98" stroke="${robeD}" stroke-width="1.2" fill="none" opacity=".6"/>
      <path d="M27 72 Q35 77 43 72 L42 76 Q35 80 28 76Z" fill="${shade(skin, -8)}"/>
      <circle cx="35" cy="52" r="21" fill="${hair}"/><ellipse cx="14" cy="55" rx="3" ry="4.5" fill="${skin}"/><ellipse cx="56" cy="55" rx="3" ry="4.5" fill="${skin}"/>
      <path d="M14 46 Q14 28 35 28 Q56 28 56 46 Z" fill="#ffffff"/><rect x="14" y="42" width="42" height="5" rx="2" fill="${kufiBand}"/>
      ${[20, 27, 35, 43, 50].map((x) => `<circle cx="${x}" cy="36" r="1.3" fill="${kufiBand}" opacity=".7"/>`).join('')}
      ${o.imam ? `<path d="M10 74 Q35 66 60 74 L60 80 Q35 72 10 80Z" fill="#2f8f6a" opacity=".85"/>` : ''}
    </g>`;
    // ผู้หญิง: ฮิญาบคลุมศีรษะยาวถึงหลัง + ชุดยาว
    const woman = `<g class="gw">
      <path d="M12 106 Q12 86 20 80 L50 80 Q58 86 58 106 Q35 112 12 106Z" fill="${hjD}"/>
      <path d="M14 52 Q14 29 35 29 Q56 29 56 52 Q56 64 50 71 Q60 79 62 93 Q48 100 35 99 Q22 100 8 93 Q10 79 20 71 Q14 64 14 52Z" fill="${hj}"/><path d="M20 71 Q35 78 50 71" stroke="${hjD}" stroke-width="1.3" fill="none" opacity=".6"/>
      <path d="M20 76 Q18 86 21 94 M50 76 Q52 86 49 94 M35 78 L35 97" stroke="${hjD}" stroke-width="1.2" fill="none" opacity=".55"/>
      <path d="M20 40 Q35 33 50 40" stroke="rgba(255,255,255,.45)" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    </g>`;
    return `<svg class="salah" viewBox="0 0 70 116" width="70" height="116" overflow="visible">
      ${mat}<g class="up">${halo}${feet}${o.imam ? man.replace('class="gm"', 'class="gm imam"') : man + woman}</g>
    </svg>`;
  }

  // คนดูยืนแดนซ์หน้ารถแห่ (หันหลังให้กล้อง = หันหน้าเข้าหารถ) — วัยรุ่นสายปาร์ตี้ หุ่นเพรียว สูง (หัว 1 : ตัว 5) ชูขวดโยกแขนตามเพลง
  // 2 ชั้น: .party = ตัว (เด้ง + เอียงซ้ายขวาตามจังหวะ) • .party-arms = แขนที่ชูขึ้น (แกว่งทั้งชั้น) → ขยับด้วย transform ทั้งชิ้น การ์ดจอทำให้ ไม่กินเครื่อง
  // ขวดเป็นน้ำอัดลม/เครื่องดื่มชูกำลังสีสด (ไม่ใช่เบียร์ — TikTok ไม่ให้โชว์แอลกอฮอล์ในไลฟ์) • viewBox 70x156 (สูงกว่าตัวจิบิ 116)
  const PARTY_TOP = ['#ff4fa3', '#7c5cff', '#29c7ff', '#3ddc84', '#ffd23f', '#ff7a3d', '#f5f5f8', '#24243a', '#ff5e5e', '#00d2b4'];
  const PARTY_PANTS = ['#2c3e66', '#23232e', '#3a3f52', '#4a5a7a', '#1d2a44', '#e9e2d0', '#7c5cff', '#24243a'];
  const PARTY_DRINK = [['#3ccf6e', '#ff9b2e'], ['#e8f4ff', '#ff4f6d'], ['#3a7bd5', '#9be7ff'], ['#2fb36b', '#d7ff5a'], ['#ff8a00', '#ffd76a'], ['#b44bff', '#ff8af0']];
  const PARTY_GLOW = ['#5ef0ff', '#ff4fd8', '#3ddc84', '#ffd23f'];
  const PARTY_HAIR = ['#1b1210', '#2b1a12', '#3a2416', '#5a3a22', '#7a4a2a', '#c27a3a', '#d9b26a', '#e86aa8', '#7fb2ff'];
  const PARTY_STYLES = ['wavy', 'buns', 'bob', 'long', 'undercut', 'puff', 'beanie', 'cap'];
  function partyFan(color, id, o = {}) {
    const h = hash(id) >>> 0;
    const b = (k, n) => (h >>> k) % n;
    const tops = o.tops || PARTY_TOP;
    const top = tops[b(0, tops.length)];
    const topD = shade(top, -32);
    const pn = PARTY_PANTS[b(4, PARTY_PANTS.length)];
    const pnD = shade(pn, -25);
    const sk = NPC_SKIN[b(7, NPC_SKIN.length)];
    const skD = shade(sk, -16);
    const style = PARTY_STYLES[b(9, PARTY_STYLES.length)];
    const masc = ['undercut', 'beanie', 'cap'].includes(style) || (style === 'puff' && b(12, 2) === 0);
    const hr = style === 'bob' || style === 'wavy' ? PARTY_HAIR[b(13, PARTY_HAIR.length)] : PARTY_HAIR[b(13, 6)];
    const hrD = shade(hr, -28);
    const topStyle = masc ? (b(16, 2) ? 'shirt' : 'tank') : ['crop', 'tank', 'shirt'][b(16, 3)];
    const lower = masc ? (b(18, 2) ? 'jeans' : 'shorts') : ['skirt', 'shorts', 'jeans'][b(18, 3)];
    const boots = !masc && b(20, 3) === 0 ? ['#1b1b24', '#f4f4f6', '#6b3a2a'][b(21, 3)] : null;
    const sole = PARTY_GLOW[b(22, PARTY_GLOW.length)];
    const glow = b(24, 3) === 0 ? PARTY_GLOW[b(25, PARTY_GLOW.length)] : null;
    const bag = b(26, 4) === 0 ? ['#e9e2d0', '#24243a', '#ff4fa3'][b(27, 3)] : null;
    const tied = !bag && lower !== 'skirt' && b(28, 5) === 0 ? ['#5b6fa8', '#3a3f52', '#c94f6d'][b(29, 3)] : null;
    const pattern = topStyle === 'shirt' && b(30, 2) === 0 ? '#ffffff' : null;
    const oneArm = b(31, 5) === 0; // ชูขวดข้างเดียว อีกข้างแนบตัว
    const drink = PARTY_DRINK[(h >>> 3) % PARTY_DRINK.length];
    const capCol = PARTY_TOP[(h >>> 5) % PARTY_TOP.length];
    // ---- ขา + รองเท้า
    const feet = boots
      ? `<path d="M26 128 L33.5 128 L34 151 L25 151 Q24.5 148 26 147Z M36.5 128 L44 128 L45 147 Q46 148 45.5 151 L36.5 151Z" fill="${boots}"/><path d="M25 150.5 h9 M36.5 150.5 h9" stroke="${shade(boots, -40)}" stroke-width="2.4"/>`
      : `<path d="M25 145 Q24.5 152 28 152.5 L34 152.5 Q35 149 34 145Z M36 145 Q35 149 36 152.5 L42 152.5 Q45.5 152 45 145Z" fill="#f4f4f6"/><path d="M24.8 151 h9.5 M35.7 151 h9.5" stroke="${sole}" stroke-width="2"/>`;
    let legs;
    if (lower === 'skirt') legs = `<rect x="27" y="112" width="6.5" height="36" rx="3" fill="${sk}"/><rect x="36.5" y="112" width="6.5" height="36" rx="3" fill="${sk}"/><path d="M24.5 94 L45.5 94 L50 118 Q35 121 20 118Z" fill="${pn}"/>${[26, 31, 35, 39, 44].map((x) => `<path d="M${x} 96 L${x + (x - 35) * 0.25} 118" stroke="${pnD}" stroke-width="1"/>`).join('')}`;
    else if (lower === 'shorts') legs = `<rect x="27" y="104" width="6.5" height="44" rx="3" fill="${sk}"/><rect x="36.5" y="104" width="6.5" height="44" rx="3" fill="${sk}"/><path d="M24.5 93 L45.5 93 L46.5 110 L35.6 110 L35 104 L34.4 110 L23.5 110Z" fill="${pn}"/><path d="M24 109 h10.5 M35.5 109 h10.5" stroke="${pnD}" stroke-width="1.5"/>`;
    else legs = `<path d="M25 93 L34.6 93 L34 147 L26.5 147Z M35.4 93 L45 93 L43.5 147 L36 147Z" fill="${pn}"/><path d="M30 98 Q30.5 122 30 144 M40 98 Q39.5 122 40 144" stroke="${pnD}" stroke-width="1" fill="none" opacity=".7"/>`;
    // ---- เสื้อ: ครอป / กล้าม / เชิ้ตแขนสั้น
    let shirt;
    if (topStyle === 'crop') shirt = `<path d="M24.5 89 L45.5 89 L45.5 95 L24.5 95Z" fill="${pnD}"/><path d="M25.5 78 L44.5 78 L45.5 90 L24.5 90Z" fill="${sk}"/><path d="M23 60 Q23.5 55 29.5 54.5 L40.5 54.5 Q46.5 55 47 60 L45.5 79 Q35 82 24.5 79Z" fill="${top}"/>`;
    else if (topStyle === 'tank') shirt = `<path d="M24.5 92 L45.5 92 L45.5 97 L24.5 97Z" fill="${pnD}"/><path d="M26 58 Q27 54 31 54 L39 54 Q43 54 44 58 L46 93 Q35 96 24 93Z" fill="${top}"/><path d="M21 59 Q22 54.5 26.5 54 L26 66Z M49 59 Q48 54.5 43.5 54 L44 66Z" fill="${sk}"/>`;
    else shirt = `<path d="M24.5 92 L45.5 92 L45.5 97 L24.5 97Z" fill="${pnD}"/><path d="M20.5 61 Q21 54 29 53.5 L41 53.5 Q49 54 49.5 61 L47 95 Q35 98 23 95Z" fill="${top}"/><path d="M27 54 L35 60 L43 54" stroke="${topD}" stroke-width="1.4" fill="none"/>` + (pattern ? [[28, 68], [41, 66], [33, 79], [44, 84], [26, 87]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="${pattern}"/>`).join('') : '');
    const bagSvg = bag ? `<path d="M45 55 L25 92" stroke="${bag}" stroke-width="2.6"/><rect x="18.5" y="88" width="11" height="9" rx="2.5" fill="${bag}"/><rect x="19.5" y="89.5" width="9" height="2" fill="rgba(255,255,255,.3)"/>` : '';
    const tiedSvg = tied ? `<path d="M22 92 Q35 99 48 92 L50 104 Q44 101 40 106 L35 99 L30 106 Q26 101 20 104Z" fill="${tied}"/>` : '';
    const armDown = oneArm ? `<path d="M23 59 Q19 74 20 90" stroke="${topStyle === 'shirt' ? top : sk}" stroke-width="5.6" fill="none" stroke-linecap="round"/><path d="M20.5 76 Q19.6 84 20 90" stroke="${sk}" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="20" cy="92" r="3.2" fill="${sk}"/>` : '';
    // ---- หัว (ด้านหลัง) r 12.5
    const ears = `<ellipse cx="22.6" cy="35" rx="2" ry="3.2" fill="${skD}"/><ellipse cx="47.4" cy="35" rx="2" ry="3.2" fill="${skD}"/>`;
    const neck = `<rect x="31.8" y="42" width="6.4" height="13" rx="2.6" fill="${skD}"/>`;
    let head;
    if (style === 'wavy') head = `<circle cx="35" cy="31" r="12.5" fill="${hr}"/><path d="M22.5 30 Q19 46 22 52 Q20 60 24 66 L46 66 Q50 60 48 52 Q51 46 47.5 30Z" fill="${hr}"/><path d="M26 44 Q24 52 27 58 Q25 62 27 65 M44 44 Q46 52 43 58 Q45 62 43 65 M35 44 Q33 54 35 64" stroke="${hrD}" stroke-width="1.1" fill="none"/>`;
    else if (style === 'buns') head = `<circle cx="35" cy="31" r="12.5" fill="${hr}"/><circle cx="25" cy="21" r="5.5" fill="${hrD}"/><circle cx="45" cy="21" r="5.5" fill="${hrD}"/><path d="M27 38 Q35 44 43 38" stroke="${hrD}" stroke-width="1.2" fill="none"/>`;
    else if (style === 'bob') head = `<circle cx="35" cy="31" r="12.5" fill="${hr}"/><path d="M22 30 Q21.5 44 25 46 L45 46 Q48.5 44 48 30Z" fill="${hr}"/><path d="M24 45 h22" stroke="${hrD}" stroke-width="1.3"/>`;
    else if (style === 'long') head = `<circle cx="35" cy="31" r="12.5" fill="${hr}"/><path d="M22.6 30 Q21 58 25 70 L45 70 Q49 58 47.4 30Z" fill="${hr}"/><path d="M30 46 Q29 58 31 68 M40 46 Q41 58 39 68" stroke="${hrD}" stroke-width="1.1" fill="none"/>`;
    else if (style === 'undercut') head = `${ears}<circle cx="35" cy="30" r="12.5" fill="${hr}"/><path d="M23.5 33 Q35 41 46.5 33 L46 38 Q35 45 24 38Z" fill="${shade(sk, -28)}"/>`;
    else if (style === 'puff') head = `${ears}<circle cx="35" cy="31" r="12.5" fill="${hr}"/><circle cx="35" cy="16" r="8.5" fill="${hr}"/>${[[30, 12], [39, 11], [35, 9], [31, 19], [40, 19]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="${hrD}" opacity=".6"/>`).join('')}<path d="M28 23 h14" stroke="#ffd23f" stroke-width="2.2"/>`;
    else if (style === 'beanie') head = `${ears}<circle cx="35" cy="31" r="12.5" fill="${hr}"/><path d="M22.4 31 Q22 17 35 16.5 Q48 17 47.6 31Z" fill="${capCol}"/><path d="M22.4 29 h25.2" stroke="${shade(capCol, -30)}" stroke-width="3.4"/><circle cx="35" cy="15.5" r="3.2" fill="${shade(capCol, 40)}"/>`;
    else head = `${ears}<circle cx="35" cy="31" r="12.5" fill="${hr}"/><path d="M22.5 30 Q23.5 18 35 18 Q46.5 18 47.5 30 Q41.5 27.5 35 27.5 Q28.5 27.5 22.5 30Z" fill="${capCol}"/><path d="M30.5 28 Q35 25.5 39.5 28 L39 31.5 Q35 30 31 31.5Z" fill="${shade(capCol, -40)}"/><path d="M32 27.5 v-1.8 h6 v1.8" stroke="#fff" stroke-width="1.2" fill="none" opacity=".8"/>`; // แก๊ปกลับหลัง
    const shine = style === 'beanie' || style === 'cap' ? '' : `<path d="M27.5 23 Q33 19 41 20" stroke="rgba(255,255,255,.25)" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
    // ---- แขนชู + ขวด + ริสแบนด์เรืองแสง
    const slv = topStyle === 'shirt' ? top : null;
    const band = (x, y) => (glow ? `<rect x="${x - 1}" y="${y - 1}" width="9" height="5.6" rx="2.8" fill="${glow}" opacity=".35"/><rect x="${x}" y="${y}" width="7" height="3.6" rx="1.6" fill="${glow}"/>` : '');
    const bottleSvg = `<g transform="translate(56.5 8) rotate(8)"><rect x="-4.2" y="-3" width="8.4" height="19" rx="3.2" fill="${drink[0]}" opacity=".93"/><rect x="-4.2" y="4" width="8.4" height="6.5" fill="${drink[1]}"/><rect x="-2.2" y="-10" width="4.4" height="7.5" rx="1.5" fill="${drink[0]}" opacity=".93"/><rect x="-2.6" y="-12.3" width="5.2" height="2.8" rx="1" fill="#f4f4f4"/><path d="M-2.4 -1 v13" stroke="rgba(255,255,255,.55)" stroke-width="1.3" stroke-linecap="round"/></g>`;
    const armL = oneArm ? '' : `<path d="M24 58 Q16 40 14.5 18" stroke="${sk}" stroke-width="5.2" fill="none" stroke-linecap="round"/>${slv ? `<path d="M24 58 L20.5 48" stroke="${slv}" stroke-width="7" stroke-linecap="round"/>` : ''}${band(11, 23)}<circle cx="14.5" cy="15.5" r="3.6" fill="${sk}"/>`;
    const armR = `<path d="M46 58 Q54 40 55.5 18" stroke="${sk}" stroke-width="5.2" fill="none" stroke-linecap="round"/>${slv ? `<path d="M46 58 L49.5 48" stroke="${slv}" stroke-width="7" stroke-linecap="round"/>` : ''}${band(53.5, 22)}${bottleSvg}<circle cx="55.5" cy="15.5" r="3.6" fill="${sk}"/>`;
    return `<svg class="party" viewBox="0 0 70 156" width="70" height="156" overflow="visible">
      <ellipse cx="35" cy="153" rx="15" ry="3.2" fill="rgba(0,0,0,.45)"/>
      ${legs}${feet}${tiedSvg}${armDown}${shirt}${bagSvg}${neck}${head}${shine}
    </svg><svg class="party-arms" viewBox="0 0 70 156" width="70" height="156" overflow="visible">${armL}${armR}</svg>`;
  }

  // ป้ายเด้งเหนือหัวคนดู (หลบป้ายอื่นอัตโนมัติ) — html ต้องปลอดภัยแล้ว (ใช้ textContent กับชื่อ)
  const popBadges = new Map();
  function popBadge(user, build, opt = {}) {
    const key = user?.id || 'anon' + Math.random();
    popBadges.get(key)?.remove();
    while (popBadges.size >= (opt.max || 6)) {
      const [k, el] = popBadges.entries().next().value;
      el.remove();
      popBadges.delete(k);
    }
    const p = user && fanPos(user.id);
    const x0 = Math.max(150, Math.min(930, p ? p.x : 540 + rand(-160, 160)));
    const y0 = Math.max(420, p ? p.feetY - FAN_H * p.s - 40 * p.s : opt.fallbackY || 900);
    const others = [...popBadges.values()].map((b) => ({ x: parseFloat(b.style.left), y: parseFloat(b.style.top) }));
    const hits = (x, y) => others.some((q) => Math.abs(q.x - x) < 280 && Math.abs(q.y - y) < 170);
    let x = x0;
    let y = y0;
    found: for (let lift = 0; lift < 4; lift++) {
      for (const dx of [0, 290, -290, 580, -580]) {
        const cx = x0 + dx;
        if (cx < 150 || cx > 930) continue;
        if (!hits(cx, y0 - lift * 175)) {
          x = cx;
          y = Math.max(300, y0 - lift * 175);
          break found;
        }
      }
    }
    const el = document.createElement('div');
    el.className = 'pop-badge ' + (opt.cls || '');
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    build(el);
    $('themeTop').appendChild(el);
    popBadges.set(key, el);
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => {
        el.remove();
        if (popBadges.get(key) === el) popBadges.delete(key);
      }, 500);
    }, opt.dur || 6500);
    return { el, x, y };
  }

  // ระดับความพลุกพล่าน 0-3 (ตั้งในแผงควบคุม)
  const bustle = () => (config?.bustle ?? 2);

  // ============================================================ API ให้ธีมใช้
  const api = {
    W: 1080, H: 1920, PALETTE,
    fairDanceMusic,
    rand, pick, hexA, shade, hash, rr, wrapText, now, fmt,
    get t() { return T; },
    get meta() { return META; },
    get cfg() { return config; },
    get stick() { return stick && stick.until > now() ? stick.color : null; },
    get bigActive() { return bigUntil > now(); },
    get safeMode() { return !!config?.safety?.safeMode; },
    get avatarOn() { return !!(config?.avatar?.enabled && av()); },
    get level() { return SCENE.level || 1; },
    fans, fanPos, bump, crowdWave, setStick, originFor, moveToRows,
    spawn, parts, explode, fireworks, spot, emitter, flash, shake, bigShow, toast,
    sfx, tone, noise, speak: (text) => enqueue({ kind: 'theme', prio: 1, text }),
    makeLook, drawPerson, glowDot, bustle, standingFan, kneelFan, pewFan, salahFan, partyFan, popBadge, avatarEl,
    redrawStatic: () => drawStaticLayer(), // ธีมที่โหลดภาพฉากทีหลัง (ธีมสัตว์เลี้ยง)
    refreshLeft: () => {
      if (!TH?.renderLeft) return;
      const box = $('songs');
      box.innerHTML = '';
      TH.renderLeft(box, api);
      layoutPanels();
    },
    top: $('themeTop'),
    root,
  };

  function runEffect(effect, user, count, label) {
    const fx = TH.effects[effect] || TH.effects[Object.keys(TH.effects)[0]];
    const reps = effect === META.bigEffect ? 1 : Math.min(count || 1, 4);
    for (let i = 0; i < reps; i++) setTimeout(() => fx(user, count || 1, label, api), i * 650);
  }

  // ============================================================ theme init
  // โหลดไฟล์ธีมเฉพาะที่ใช้ (ไม่มี/ล็อก → ใช้ฉากคอนเสิร์ตแทน)
  function loadTheme(id) {
    if (window.STAGE_THEMES[id]) return Promise.resolve();
    return new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = `themes/${encodeURIComponent(id)}.js`;
      s.onload = s.onerror = () => resolve();
      document.head.appendChild(s);
    });
  }
  function initTheme(id) {
    THEME_ID = id;
    TH = window.STAGE_THEMES[id] || window.STAGE_THEMES.concert;
    META = config.themes[id]?.meta || config.themes.concert.meta;
    T = config.themes[id]?.t || {};
    root.classList.add('theme-' + id);
    if (TH.css) {
      const st = document.createElement('style');
      st.id = 'themeCss';
      st.textContent = TH.css;
      document.head.appendChild(st);
    }
    ROWS = TH.rows;
    FAN_H = TH.fanH || 116;
    root.style.setProperty('--fanh', FAN_H + 'px');
    buildSlots();
    TH.init?.(api);
    drawStaticLayer();
    renderScene();
    root.classList.add('ready');
    requestAnimationFrame(frame);
  }

  // ============================================================ เกมคอมเมนต์ (ทีม / โพล / ควิซ / ทายเลข / เซียมซี / เลเวล)
  let games = { team: null, card: null, cfg: {} };
  let clockOffset = 0;
  const srvNow = () => Date.now() + clockOffset;
  const fmtLeft = (endsAt) => {
    if (!endsAt) return '';
    const s = Math.max(0, Math.ceil((endsAt - srvNow()) / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  function setGames(g) {
    clockOffset = g.now - Date.now();
    const prevCard = games.card;
    const c = g.card;
    // เกมใหม่เริ่ม → อ่านคำถามออกเสียง (ใช้สวิตช์ "ประกาศคนชนะเกม")
    if (c && c.status === 'running' && (!prevCard || prevCard.startAt !== c.startAt) && config?.tts?.wins) {
      const { na } = P();
      avatarReact('game');
      if (c.kind === 'quiz') enqueue({ kind: 'game', prio: 2, text: `คำถาม ${cleanSpeech(c.question)}` });
      else if (c.kind === 'poll') enqueue({ kind: 'game', prio: 2, text: `โหวตกัน${na} ${cleanSpeech(c.question)}` });
      else if (c.kind === 'type') enqueue({ kind: 'game', prio: 2, text: `ใครพิมพ์ไวสุดชนะ พิมพ์ว่า ${cleanSpeech(c.question)}` });
      else if (c.kind === 'guess') enqueue({ kind: 'game', prio: 2, text: c.question ? cleanSpeech(c.question) : `ทายเลขกัน${na}` });
    }
    games = g;
    renderTeam();
    renderCard(prevCard);
    applyTeamMarks();
    updateHints();
  }

  function renderTeam() {
    const el = $('teamBar');
    const t = games.team;
    if (!t) {
      el.className = '';
      positionOverlays();
      return;
    }
    const total = t.scoreA + t.scoreB;
    const pa = total ? (t.scoreA / total) * 100 : 50;
    if (!el.classList.contains('on')) {
      el.innerHTML = `<div class="tb-head"><span class="tb-a"><span class="na"></span> <span class="sa"></span><br><small class="ca"></small></span>
        <span class="tb-mid"></span><span class="tb-b" style="text-align:right"><span class="sb"></span> <span class="nb"></span><br><small class="cb"></small></span></div>
        <div class="tb-bar"><div class="tb-fill"></div><div class="tb-knot"></div></div><div class="tb-hint"></div>`;
      el.className = 'on';
    }
    el.querySelector('.na').textContent = `🔴 ${t.nameA}`;
    el.querySelector('.nb').textContent = `${t.nameB} 🔵`;
    el.querySelector('.sa').textContent = fmt(t.scoreA);
    el.querySelector('.sb').textContent = fmt(t.scoreB);
    el.querySelector('.ca').textContent = `${t.countA} คน`;
    el.querySelector('.cb').textContent = `${t.countB} คน`;
    el.querySelector('.tb-fill').style.width = pa + '%';
    el.querySelector('.tb-knot').style.left = pa + '%';
    el.classList.toggle('won', t.status === 'ended');
    const hint = el.querySelector('.tb-hint');
    if (t.status === 'ended') {
      hint.textContent = t.winner === 'draw' ? '🤝 เสมอกัน!' : `🏆 ทีม${t.winner === 'a' ? t.nameA : t.nameB}ชนะ!`;
    } else {
      hint.textContent = `พิมพ์ "${t.nameA}" หรือ "${t.nameB}" เพื่อเข้าทีม • ไลก์/ของขวัญช่วยดึง`;
    }
    el.querySelector('.tb-mid').textContent = t.status === 'ended' ? 'จบเกม' : t.endsAt ? `⏱ ${fmtLeft(t.endsAt)}` : '⚔️';
    positionOverlays();
  }

  function applyTeamMarks() {
    const m = games.team?.members || {};
    for (const f of fans.values()) {
      const side = games.team ? m[f.data.id] : null;
      f.el.classList.toggle('team-a', side === 'a');
      f.el.classList.toggle('team-b', side === 'b');
    }
  }

  const RING = 2 * Math.PI * 34;
  function timerHtml(c) {
    if (!c.endsAt || c.status !== 'running') return '';
    return `<div class="gp-timer"><svg viewBox="0 0 84 84"><circle class="bg" cx="42" cy="42" r="34"/><circle class="fg" cx="42" cy="42" r="34" stroke-dasharray="${RING}" stroke-dashoffset="0"/></svg><span></span></div>`;
  }
  function updateTimer() {
    const c = games.card;
    const el = document.querySelector('#gamePanel .gp-timer');
    if (!el || !c?.endsAt) return;
    const left = Math.max(0, c.endsAt - srvNow());
    const frac = c.dur ? left / c.dur : 1;
    el.querySelector('.fg').style.strokeDashoffset = String(RING * (1 - frac));
    el.querySelector('span').textContent = Math.ceil(left / 1000);
    el.classList.toggle('urgent', left < 10_000);
  }

  function renderCard(prev) {
    const el = $('gamePanel');
    const c = games.card;
    if (!c) {
      el.className = '';
      el.innerHTML = '';
      positionOverlays();
      return;
    }
    const fresh = !prev || prev.kind !== c.kind || prev.question !== c.question || prev.min !== c.min || prev.endsAt !== c.endsAt;
    const running = c.status === 'running';
    let html = timerHtml(c);
    if (c.kind === 'poll') {
      const total = c.counts.reduce((a, b) => a + b, 0);
      html += `<div class="gp-badge">📊 โหวต!</div><div class="gp-q"></div>` +
        c.options.map((_, i) => {
          const pct = total ? Math.round((c.counts[i] / total) * 100) : 0;
          return `<div class="gp-opt${!running && c.winners?.includes(i) ? ' win' : ''}"><div class="bar" style="width:${pct}%"></div><div class="no">${i + 1}</div><div class="tx"></div><div class="pc">${pct}%<small>${c.counts[i]} โหวต</small></div></div>`;
        }).join('') +
        (running ? `<div class="gp-cta">💬 พิมพ์ <b>${c.options.map((_, i) => i + 1).join(' / ')}</b> ในคอมเมนต์</div>` : `<div class="gp-cta">🏁 ปิดโหวตแล้ว • ${total} คน</div>`);
    } else if (c.kind === 'quiz') {
      html += `<div class="gp-badge">❓ ควิซ!</div><div class="gp-q"></div>` +
        (running
          ? (c.hint ? `<div class="gp-hint">💡 คำใบ้: <b></b></div>` : '') + `<div class="gp-cta">💬 พิมพ์คำตอบในคอมเมนต์<br><b>คนแรกที่ตอบถูกชนะ!</b></div>`
          : resultHtml(c, 'ตอบถูก! 🎉'));
    } else if (c.kind === 'type') {
      html += `<div class="gp-badge">⚡ ใครพิมพ์ไวสุดชนะ!</div><div class="gp-q gp-type"></div>` +
        (running ? `<div class="gp-cta">💬 พิมพ์ข้อความนี้ในคอมเมนต์ให้ตรง<br><b>คนแรกที่พิมพ์ถูกชนะ!</b> <small>(เว้นวรรคไม่ต้องเป๊ะ)</small></div>` : resultHtml(c, c.sec ? `พิมพ์ไวสุด! ⚡ ${c.sec} วิ` : 'พิมพ์ไวสุด! ⚡'));
    } else if (c.kind === 'guess') {
      const span = c.max - c.min || 1;
      html += `<div class="gp-badge">🔢 ทายเลข!</div>` + (c.question ? `<div class="gp-q gp-small"></div>` : '') +
        (running
          ? `<div class="gp-range">${c.lo} – ${c.hi}</div><div class="gp-track"><i style="left:${((c.lo - c.min) / span) * 100}%;width:${((c.hi - c.lo) / span) * 100}%"></i></div>` +
            (c.guesses || []).slice(0, 3).map((g) => `<div class="gp-g"><span class="gn"></span><span><b>${g.n}</b> ${g.dir > 0 ? '⬆️ มากกว่านี้' : '⬇️ น้อยกว่านี้'}</span></div>`).join('') +
            `<div class="gp-cta">💬 พิมพ์ตัวเลข <b>${c.min}-${c.max}</b> ในคอมเมนต์</div>`
          : resultHtml(c, 'ทายถูก! 🎉'));
    }
    el.innerHTML = html;
    const q = el.querySelector('.gp-q');
    if (q) q.textContent = c.question;
    el.querySelectorAll('.gp-opt .tx').forEach((t, i) => (t.textContent = c.options[i]));
    el.querySelectorAll('.gp-g .gn').forEach((t, i) => (t.textContent = c.guesses[i].name));
    const w = el.querySelector('.gp-win');
    if (w && c.winner) {
      w.prepend(avatarEl({ ...c.winner, color: PALETTE[hash(c.winner.id) % PALETTE.length] }));
      w.querySelector('.wn').textContent = c.winner.name;
    }
    const rv = el.querySelector('.gp-reveal b');
    if (rv) rv.textContent = c.reveal ?? '';
    const hb = el.querySelector('.gp-hint b');
    if (hb) hb.textContent = c.hint;
    // ถ้าคำถามยาว ย่อตัวอักษรลงให้พอดี
    if (q) {
      q.style.fontSize = '';
      let size = 46;
      if (q.classList.contains('gp-small')) size = 38;
      while (q.offsetHeight > 190 && size > 28) q.style.fontSize = (size -= 3) + 'px';
    }
    if (fresh || !el.classList.contains('on')) {
      el.className = '';
      void el.offsetWidth;
      el.className = 'on';
    }
    updateTimer();
    positionOverlays();
  }

  function resultHtml(c, word) {
    if (c.winner) return `<div class="gp-win"><span class="wn"></span>${word}</div><div class="gp-reveal">คำตอบ: <b></b></div>`;
    return `<div class="gp-win none">${c.cancelled ? '🛑 ยกเลิกเกม' : '⏰ หมดเวลา!'}</div><div class="gp-reveal">เฉลย: <b></b></div>`;
  }

  // จัดตำแหน่ง: แถบทีม → การ์ดเกม → เซียมซี ไม่ให้ทับกัน
  function positionOverlays() {
    const tb = $('teamBar');
    const card = $('gamePanel');
    const fo = $('fortune');
    card.style.top = tb.classList.contains('on') ? tb.offsetTop + tb.offsetHeight + 44 + 'px' : '';
    fo.style.top = card.classList.contains('on') ? card.offsetTop + card.offsetHeight + 20 + 'px' : '';
  }

  // นับเวลาถอยหลังบนจอ
  setInterval(() => {
    if (games.team?.endsAt && games.team.status === 'running') {
      const mid = document.querySelector('#teamBar .tb-mid');
      if (mid) mid.textContent = `⏱ ${fmtLeft(games.team.endsAt)}`;
    }
    updateTimer();
  }, 250);

  // เซียมซี: แสดงทีละใบ
  const fortuneQ = [];
  let fortuneBusy = false;
  function showFortune(d) {
    if (fortuneQ.length >= 4) return;
    fortuneQ.push(d);
    if (!fortuneBusy) nextFortune();
  }
  function nextFortune() {
    const d = fortuneQ.shift();
    const el = $('fortune');
    if (!d) {
      fortuneBusy = false;
      el.className = '';
      return;
    }
    fortuneBusy = true;
    el.innerHTML = `<div class="fo-who"><span></span></div><div class="fo-no">🎋 ใบที่ ${d.no}</div><span class="fo-lv l-${d.level}">${d.level}</span><div class="fo-tx"></div>`;
    const who = el.querySelector('.fo-who');
    who.prepend(avatarEl({ ...d.user, color: PALETTE[hash(d.user.id) % PALETTE.length] }));
    who.querySelector('span').textContent = `${d.user.name} เสี่ยงเซียมซีได้`;
    el.querySelector('.fo-tx').textContent = d.text;
    el.className = '';
    void el.offsetWidth;
    el.className = 'on';
    positionOverlays();
    sfx.soft(659);
    if (d.level === 'ดีเยี่ยม') {
      const p = fanPos(d.user.id);
      if (p) for (let i = 0; i < 20; i++) spawn({ type: 'glow', x: p.x + rand(-40, 40), y: p.y - rand(0, 40), vy: rand(-120, -50), max: 1.5, size: 3, color: '#ffd23f' });
    }
    setTimeout(() => {
      el.className = 'on out';
      setTimeout(nextFortune, 400);
    }, 5500);
  }

  function setLevel(id, lv) {
    const f = fans.get(id);
    if (!f) return;
    f.data.lv = lv;
    let chip = f.el.querySelector('.tag .lv');
    if (lv >= 2) {
      if (!chip) {
        chip = document.createElement('em');
        chip.className = 'lv';
        f.el.querySelector('.tag').appendChild(chip);
      }
      chip.textContent = `Lv.${lv}`;
    } else chip?.remove();
  }

  // ข้อความแนะนำคำสั่งในกล่องซ้าย (หมุนตามที่ตั้งในหลังบ้าน)
  let hintIdx = 0;
  let hintTimer = null;
  let hintSec = 0;
  function hintList() {
    const h = config?.hints || {};
    const g = config?.games || {};
    const list = [];
    if (h.request !== false && T.requestCommand) list.push(`พิมพ์ "${T.requestCommand} ..."`);
    if (h.theme !== false && META?.hint) list.push(META.hint);
    if (h.fortune !== false && g.fortune !== false) list.push(`พิมพ์ "${g.fortuneCommand || 'เซียมซี'}" เสี่ยงทาย 🎋`);
    if (h.level !== false && g.levels !== false) list.push('พิมพ์ "เลเวล" ดูเลเวลตัวเอง');
    if (h.team !== false && games.team?.status === 'running') list.push(`พิมพ์ "${games.team.nameA}" หรือ "${games.team.nameB}" เข้าทีม`);
    const c = games.card;
    if (h.game !== false && c?.status === 'running') {
      list.push(c.kind === 'poll' ? `โหวต! พิมพ์ 1-${c.options.length}` : c.kind === 'quiz' ? 'ควิซ! พิมพ์คำตอบในคอมเมนต์' : c.kind === 'type' ? '⚡ พิมพ์ข้อความบนจอให้ไวที่สุด!' : `ทายเลข! พิมพ์ ${c.min}-${c.max}`);
    }
    for (const x of h.custom || []) list.push(x);
    return list;
  }
  function updateHints() {
    const list = hintList();
    const el = $('songHint');
    el.style.display = list.length ? '' : 'none';
    el.textContent = list.length ? list[hintIdx % list.length] : '';
    const sec = Math.min(30, Math.max(2, Number(config?.hints?.seconds) || 4));
    if (sec !== hintSec) {
      hintSec = sec;
      clearInterval(hintTimer);
      hintTimer = setInterval(() => {
        hintIdx++;
        if (TH) updateHints();
      }, sec * 1000);
    }
  }

  // ============================================================ socket
  const socket = io();
  socket.on('disconnect',()=>{if(THEME_ID==='templefair')fairAudioSet(false)});
  plInit(); // เพลงในไลฟ์
  socket.on('games', (g) => TH && setGames(g));
  socket.on('themeEvent', (d) => TH && TH.onEvent?.(d, api));
  socket.on('say', ({ id, text }) => TH && sayBubble(id, text));
  // ตัวละคร AI ตอบคอมเมนต์: พูดผ่านคิวเสียง (บอลลูนเหนือหัวตัวละครขึ้นเอง) + โชว์ว่าตอบใคร
  socket.on('aiReply', (d) => {
    if (!TH || THUMB) return;
    if (!avOn()) toast(`💬 ${d.by}: ${d.text}`, 'share');
    if (fans.has(d.id)) bump(d.id, 'wave', 1600);
    enqueue({ kind: 'ai', prio: 2, text: d.text });
  });

  // ร้านแลกแต้ม (play.js) — ใช้ได้ทุกธีม
  socket.on('shop', ({ item, name, user }) => {
    if (!TH || THUMB) return;
    const who = user?.name || 'แฟนคลับ';
    if (item === 'wave') {
      crowdWave();
      avatarReact('join', user);
      toast(`👋 ${who} แลกแต้ม: ${name}`, 'share');
      enqueue({ kind: 'theme', prio: 1, text: `สวัสดีค่ะคุณ ${who}` });
    } else if (item === 'spot') {
      spot(user, { dur: 6000 });
      toast(`🔦 ${who} แลกแต้ม: ${name}`, 'share');
      enqueue({ kind: 'theme', prio: 1, text: `ไฟส่องไปที่คุณ ${who}` });
    } else if (item === 'fireworks') {
      fireworks(8);
      toast(`🎆 ${who} แลกแต้ม: ${name}`, 'big');
    } else if (item === 'crown') {
      bump(user.id, 'crowned', 6 * 3600_000);
      toast(`👑 ${who} สวมมงกุฎแล้ว!`, 'big');
      sfx.fanfare?.();
    }
  });
  // แอดมินกดซ่อน/บล็อก → ซ่อนบับเบิลของคนนั้นทันที
  socket.on('hideBubble', ({ id }) => {
    const f = fans.get(id);
    if (!f) return;
    clearTimeout(f.bubbleTimer);
    f.el.querySelector('.bubble').classList.remove('show');
    f.el.style.zIndex = Math.round(f.slot.y);
  });
  socket.on('lv', ({ id, lv }) => TH && setLevel(id, lv));
  socket.on('teamJoin', () => {});
  socket.on('fortune', (d) => TH && showFortune(d));
  socket.on('welcome', (d) => {
    if (!TH) return;
    // แฟนประจำมาครบรอบ (5, 10, 20 ... ไลฟ์) → ฉลองพิเศษ
    if ([3, 5, 10, 20, 30, 50, 75, 100, 150, 200, 300, 365, 500].includes(d.lives)) {
      toast(`🎖️ ${d.name} มาไลฟ์ครบ ${d.lives} ครั้งแล้ว! ขอบคุณที่มาเป็นประจำ`, 'big');
      fireworks(2);
      const p = fanPos(d.id);
      if (p) for (let i = 0; i < 20; i++) spawn({ type: 'glow', x: p.x + rand(-30, 30), y: p.y, vy: rand(-180, -90), max: 1.4, size: 3, color: '#ffd23f' });
      if (config?.tts?.welcome) enqueue({ kind: 'welcome', prio: 2, text: `ขอบคุณ ${sayName(d.name)} ที่มาไลฟ์ครบ ${d.lives} ครั้งแล้ว${P().na}` });
      avatarReact('regular', d);
      return;
    }
    toast(`👋 ยินดีต้อนรับกลับ ${d.name} • Lv.${d.lv} • ไลฟ์ที่ ${d.lives}`, 'share');
    sayWelcome(d);
    avatarReact('join', d);
  });
  socket.on('ttsTest', (d) => enqueue({ kind: 'test', prio: 3, text: d.text }));
  socket.on('levelup', (d) => {
    if (!TH || d.lv < 3) return;
    toast(`⭐ ${d.name} เลเวลอัป! Lv.${d.lv}`);
    const p = fanPos(d.id);
    if (p) for (let i = 0; i < 16; i++) spawn({ type: 'glow', x: p.x + rand(-30, 30), y: p.y, vy: rand(-160, -80), max: 1.2, size: 3, color: '#ffd23f' });
  });
  // เกมอัตโนมัติ: ประกาศล่วงหน้า
  socket.on('gameSoon', (d) => {
    if (!TH || d.cancel) return;
    toast(`🎮 อีก ${d.sec} วิ มาเล่น ${d.label} กัน!`, 'big');
    sfx.chime(784);
    if (config?.tts?.wins) enqueue({ kind: 'game', prio: 2, text: `อีก ${d.sec} วินาที มาเล่นเกมกัน${P().na}` });
  });
  socket.on('gameWin', (d) => {
    if (!TH) return;
    if (d.kind === 'team') {
      toast(d.winner === 'draw' ? '🤝 แข่งทีมเสมอกัน!' : `🏆 ทีม${d.name}ชนะ!`, 'big');
      fireworks(6);
      for (const f of fans.values()) if (d.winner !== 'draw' && games.team?.members?.[f.data.id] === d.winner) bump(f.data.id, 'wave', 1900);
      sfx.fanfare();
    } else {
      toast(`🎉 ${d.user.name} ${d.kind === 'quiz' ? 'ตอบถูก!' : d.kind === 'type' ? `พิมพ์ไวสุด! ${d.sec ? d.sec + ' วิ' : ''}` : 'ทายถูก!'}`, 'big');
      spot(d.user, { dur: 6000 });
      fireworks(3);
      sfx.fanfare();
      sayWin(d);
      avatarReact('win', d.user);
    }
  });
  let pendingSnap = null;
  socket.on('snapshot', (s) => {
    const firstTime = !config;
    config = s.config;
    const wanted = THEME_OVERRIDE && config.themes[THEME_OVERRIDE] ? THEME_OVERRIDE : config.theme;
    if (firstTime) {
      // โหลดไฟล์ธีมก่อน แล้วค่อยวาดทุกอย่าง (ข้อมูลที่มาระหว่างรอ → ใช้อันล่าสุด)
      THEME_ID = wanted;
      pendingSnap = s;
      loadTheme(wanted).then(() => {
        initTheme(wanted);
        const p = pendingSnap;
        pendingSnap = null;
        applySnapshot(p);
      });
      return;
    }
    if (wanted !== THEME_ID) return location.reload();
    if (!TH) {
      pendingSnap = s;
      return;
    }
    applySnapshot(s);
  });
  function applySnapshot(s) {
    T = config.themes[THEME_ID].t;
    applyTexts();
    applyMusic();
    applyFairMusic();
    applySafeArea();
    applyAvatar();
    applyPfp();
    applyPlan();
    setStatus(s);
    $('viewChip').textContent = '👁 ' + fmt(s.viewers || 0);
    $('likeChip').textContent = '❤ ' + fmt(s.totalLikes || 0);
    for (const id of [...fans.keys()]) if (!s.audience.find((a) => a.id === id)) removeFan(id);
    for (const a of s.audience) {
      if (fans.has(a.id)) setVip(a.id, a.vip);
      else addFan(a, false);
    }
    renderTop(s.top || []);
    renderRequests(s.requests || []);
    setHype(s.hype, s.config.hypeGoal);
    if (s.games) setGames(s.games);
    TH.onSnapshot?.(s, api);
    for (const a of s.audience) setLevel(a.id, a.lv || 1);
  }
  // รูปโปรไฟล์คนดู: off / small (ข้างชื่อ) / big (เหนือหัว) — เปลี่ยนตอนไลฟ์ได้ทันที
  function applyPfp() {
    const m = ['off', 'small', 'big', 'bigname'].includes(config?.pfp) ? config.pfp : 'small';
    if (root.dataset.pfp === m) return;
    root.dataset.pfp = m;
    for (const f of fans.values()) if (f.slot) placeFan(f, f.slot);
  }
  socket.on('config', (c) => {
    config = c;
    const wanted = THEME_OVERRIDE && c.themes[THEME_OVERRIDE] ? THEME_OVERRIDE : c.theme;
    if (wanted !== THEME_ID) return location.reload();
    if (!TH) return; // ยังโหลดธีมไม่เสร็จ — เดี๋ยว applySnapshot ใช้ config ล่าสุดเอง
    T = c.themes[THEME_ID].t;
    applyTexts();
    applyMusic();
    applyFairMusic();
    applySafeArea();
    applyAvatar();
    applyPfp();
    applyPlan();
    checkUnlock();
    renderTop(lastTop);
    renderSongChip();
    TH.onConfig?.(api);
  });
  socket.on('status', setStatus);
  socket.on('viewers', (n) => ($('viewChip').textContent = '👁 ' + fmt(n)));
  socket.on('counters', (c) => {
    $('viewChip').textContent = '👁 ' + fmt(c.viewers);
    $('likeChip').textContent = '❤ ' + fmt(c.totalLikes);
  });
  socket.on('join', (a) => {
    purgeSay();
    if (!TH) return;
    addFan(a, true);
    setLevel(a.id, a.lv || 1);
    applyTeamMarks();
    TH.onJoin?.(a, api);
    sayJoin(a);
    avatarReact('join', a);
  });
  socket.on('leave', ({ id }) => { TH?.onLeave?.({id}, api); removeFan(id); });
  socket.on('vip', ({ id, vip }) => setVip(id, vip));
  socket.on('chat', (d) => {
    if (!TH) return;
    sayBubble(d.id, d.text);
    bump(d.id, 'talk', 2400);
    TH.onChat?.(d, api);
    sayChat(d);
    avatarChat(d);
  });
  socket.on('gift', (d) => {
    if (!TH) return;
    window.StageDJ?.shout?.(d); // ธีมดีเจ: ชื่อคนส่งขึ้นจอ LED หน้าบูธ
    feedGift(d);
    flashGiftRow(d.gift.name);
    runEffect(d.effect, d.user, d.gift.count);
    const ui = effectUi(d.effect);
    if (d.gift.total >= 100 && d.effect !== META.bigEffect) toast(`${ui.icon} ${d.user.name} ${ui.label}!`, 'big');
    sayGift(d);
    avatarReact('gift', { id: d.user.id, total: d.gift.total });
  });
  socket.on('effect', (d) => TH && runEffect(d.effect, d.user, d.count, d.label));
  socket.on('zoomTest', zoomTest);
  // ตัวละคร: ปุ่มทดสอบท่าในหลังบ้าน / ปากขยับตามไมค์คนไลฟ์
  socket.on('avatar:pose', (n) => {
    const A = av();
    if (!A) return;
    if (n === 'lookL') A.lookAt(150, 1500, 2.5);
    else if (n === 'lookR') A.lookAt(930, 1500, 2.5);
    else A.play(n, { queue: false });
  });
  socket.on('avatar:mouth', (v) => av()?.setExternalMouth(v));
  socket.on('top', (l) => TH && renderTop(l));
  socket.on('requests', (l) => {
    // ธีมศาล: คนส่งเดินไปไหว้หน้าศาล (คนละจุด) แล้วเด็กวัดเขย่าเซียมซีให้ • ธีมอื่น: เด้งดีใจ • กล้องซูมหาคนส่ง (ตั้งค่าที่ห้องควบคุมไลฟ์)
    if (TH.kid && window.StageKid) kidOffer(d);
    else {
      window.StageKid?.gift?.(d);
      bump(d.user.id, 'happy', 3000);
      bump(d.user.id, 'wave', 1600);
      zoomReq({ id: d.user.id, total: Number(d.gift?.total) || 0, name: d.user.name, gift: d.gift, onZoom: () => (bump(d.user.id, 'wave', 1600), bump(d.user.id, 'happy', 2600)) });
    }
    window.StageDJ?.requests?.(l); // ธีมดีเจ: คำขอใหม่ขึ้นจอ LED
    if (TH) renderRequests(l);
  });
  socket.on('hype', (h) => setHype(h.hype, h.goal));
  let lastLikeFx = 0;
  socket.on('like', (d) => {
    $('likeChip').textContent = '❤ ' + fmt(d.total);
    if (!TH) return;
    const t = now();
    if (t - lastLikeFx < 120) return;
    lastLikeFx = t;
    bump(d.id, 'happy', 1500);
    if (TH.onLike) return TH.onLike(d, api);
    const p = fanPos(d.id);
    const qty = Math.min(4, 1 + Math.floor(d.count / 5));
    for (let i = 0; i < qty; i++) {
      spawn({
        type: 'heart', x: p ? p.x + rand(-20, 20) : rand(860, 1040), y: p ? p.y - 20 : rand(1700, 1880),
        vy: rand(-300, -200), max: rand(1.6, 2.2), size: rand(12, 18), color: pick(['#ff4fa3', '#ff2d6f', '#ff8fc8']), fadeIn: 0.1,
      });
    }
  });
  socket.on('social', (d) => {
    if (!TH) return;
    if (d.kind === 'follow') {
      toast(`💖 ${d.name} กดติดตามแล้ว!`);
      sayFollow(d);
      avatarReact('follow', d);
      (TH.onFollow || TH.effects[Object.keys(TH.effects)[1]])({ id: d.id, name: d.name }, 1, '', api);
    } else {
      toast(`🔗 ${d.name} แชร์ไลฟ์!`, 'share');
    }
  });


  // ============================================================ ภารกิจไลฟ์ (หลายขั้น ใต้หลอดพลัง)
  const fmtN = (n) => (n >= 100000 ? fmt(n) : Number(n || 0).toLocaleString('en-US'));
  function renderMission(m) {
    const el = $('mission');
    if (!m || !m.enabled || THUMB) {
      el.style.display = 'none';
      return;
    }
    el.style.display = '';
    if (m.allDone) {
      $('mLabel').textContent = `🎯 ภารกิจครบ ${m.total}/${m.total} แล้ว ขอบคุณทุกคน!`;
      $('mVal').textContent = '🎉';
      $('mFill').style.width = '100%';
      return;
    }
    $('mLabel').textContent = `🎯 ภารกิจ ${m.idx + 1}/${m.total} • ${m.label}`;
    $('mVal').textContent = `${fmtN(Math.min(m.value, m.target))} / ${fmtN(m.target)}`;
    $('mFill').style.width = Math.min(100, (m.value / Math.max(1, m.target)) * 100) + '%';
  }
  socket.on('missions', renderMission);

  // ============================================================ ฉากเปลี่ยนตามเป้า (ขั้น 1-3 · ของที่เพิ่มอยู่ใน scene-levels.js)
  let SCENE = { level: 1 };
  const sceneId = () => META?.previewOf || THEME_ID; // ธีมสร้างเองใช้ชุดของธีมต้นแบบ
  function drawStaticLayer() {
    if (!TH) return;
    const c = staticLayer.getContext('2d');
    c.clearRect(0, 0, 1080, 1920);
    TH.drawStatic?.(c, api);
    if (SCENE.level > 1) window.SceneLevels?.drawStatic(c, sceneId(), SCENE.level, api);
    fillLetterbox();
  }
  function renderScene() {
    const el = $('sceneBar');
    const d = SCENE;
    if (!TH || THUMB || !d.enabled || !window.SceneLevels?.label(sceneId(), 2)) {
      el.style.display = 'none';
      return;
    }
    el.style.display = '';
    if (!d.next) {
      $('sLabel').textContent = '🏮 ฉากเต็มรูปแบบแล้ว ขอบคุณทุกคน!';
      $('sVal').textContent = '✨';
      $('sFill').style.width = '100%';
      return;
    }
    const name = SceneLevels.label(sceneId(), d.level + 1);
    const k = Math.max(d.likes / Math.max(1, d.next.likes), d.diamonds / Math.max(1, d.next.diamonds));
    $('sLabel').textContent = `🏮 ขั้น ${d.level} • ถัดไป: ${name}`;
    $('sVal').textContent = `${fmtN(Math.min(d.likes, d.next.likes))} / ${fmtN(d.next.likes)} ❤`;
    $('sFill').style.width = Math.min(100, k * 100) + '%';
  }
  let unlockTimer = null;
  function sceneUnlock(level) {
    const name = SceneLevels?.label(sceneId(), level);
    if (!name) return;
    $('suKick').textContent = `ปลดล็อกฉากขั้น ${level}!`;
    $('suText').textContent = name;
    const el = $('sceneUnlock');
    el.classList.add('on');
    clearTimeout(unlockTimer);
    unlockTimer = setTimeout(() => el.classList.remove('on'), 4200);
    flash('#fff2c4', 600, 0.3);
    sfx.chime(784);
  }
  let sceneSynced = false; // ข้อความแรกหลังเปิดหน้า = แค่ซิงก์ ไม่ขึ้นป้ายปลดล็อกซ้ำ
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  // รูปของขวัญจริงจาก TikTok (เซิร์ฟเวอร์จำลิงก์ไว้ตอนเชื่อมต่อไลฟ์) — ทุกธีมเรียกใช้ได้: window.giftIcon('Rose') → ลิงก์รูป หรือ ''
  // window.giftIconHtml('Rose', '🌹') → <img> รูปจริง หรืออีโมจิสำรอง (ยังไม่เคยเชื่อมต่อ/ทดสอบก่อนไลฟ์ครั้งแรก)
  let giftIconsLive = null;
  window.giftIcon = (name) => {const key=String(name||'').trim().toLowerCase();if(config?.theme==='templefair'){const gift=(T?.gifts||[]).find(g=>String(g.name).toLowerCase()===key||g.aliases?.some(a=>a.toLowerCase()===key));if(gift?.image)return gift.image;}return (giftIconsLive || config?.giftIcons || {})[key] || '';};
  window.giftIconHtml = (name, fallback = '🎁', cls = 'gicon') => {
    const u = window.giftIcon(name);
    return u ? `<img class="${cls}" src="${esc(u)}" referrerpolicy="no-referrer" alt="">` : esc(fallback);
  };
  socket.on('giftIcons', (icons) => {
    giftIconsLive = icons || {};
    renderGifts();
    TH?.refresh?.(api);
  });
  // ---------------- รางวัลชวนแชร์ (แถบใต้หลอดพลัง)
  socket.on('shareGoal', (d) => {
    const el = $('shareBar');
    if (!d || !d.enabled || THUMB) {
      el.style.display = 'none';
      return;
    }
    el.style.display = '';
    $('shLabel').textContent = d.done ? `🔗 แชร์ครบ ${d.target} แล้ว! ขอบคุณทุกคน` : `🔗 ช่วยกันแชร์ไลฟ์ → โชว์ใหญ่ทั้งเวที`;
    $('shVal').textContent = `${Math.min(d.count, d.target)} / ${d.target}`;
    $('shFill').style.width = Math.min(100, (d.count / Math.max(1, d.target)) * 100) + '%';
    const top = d.top || [];
    $('shWall').textContent = top.length ? 'ขอบคุณ: ' + top.slice(0, 5).map((x) => x.name + (x.n > 1 ? ' ×' + x.n : '')).join(' · ') : '';
    // ครบเป้า → กำแพงขอบคุณคนแชร์กลางจอ
    if (d.done && top.length) {
      $('swSub').textContent = `แชร์ครบ ${d.target} ครั้ง ได้โชว์ใหญ่ทั้งเวที`;
      $('swNames').innerHTML = top.map((x) => `<span>${esc(x.name)}${x.n > 1 ? ' ×' + x.n : ''}</span>`).join('');
      const w = $('shareWall');
      w.classList.add('on');
      clearTimeout(w._t);
      w._t = setTimeout(() => w.classList.remove('on'), 8000);
    }
  });
  // ---------------- วาเลนไทน์: คู่รักประจำไลฟ์ (ป้ายค้างไว้จนมีคู่ใหม่ / เปลี่ยนธีม)
  socket.on('couple', (d) => {
    if (!TH || THUMB || !d || THEME_ID !== 'valentine') return;
    $('cpNames').textContent = `${d.a.name} ♥ ${d.b.name}`;
    $('coupleCard').classList.add('on');
    for (const u of [d.a, d.b]) {
      if (fans.has(u.id)) {
        bump(u.id, 'wave', 2400);
        sayBubble(u.id, '💘');
      }
    }
    sfx.chime(880);
  });
  // ---------------- ชุดคนดู
  socket.on('wear', (d) => {
    const f = d && fans.get(d.id);
    if (!f || !TH) return;
    const w = d.wear || {};
    const color = w.color || f.data.baseColor || f.data.color;
    f.data.baseColor ||= f.data.color;
    if (color !== f.data.color) {
      f.data.color = color;
      f.el.style.setProperty('--fc', color);
      f.el.querySelector('.body').innerHTML = TH.fanSvg(color, d.id, api);
    }
    f.data.wear = w;
    applyWear(f.el, w);
    bump(d.id, 'wave', 1600);
    if (d.got) toast(`👕 ${d.name} แต่งตัว: ${d.got}`, 'share');
  });

  socket.on('sceneLevel', (d) => {
    if (!d) return;
    const prev = SCENE.level || 1;
    SCENE = d;
    const first = !sceneSynced;
    sceneSynced = true;
    if (!TH) return;
    if (d.level !== prev) {
      drawStaticLayer();
      if (d.level > prev && !first) sceneUnlock(d.level);
    }
    renderScene();
  });
  socket.on('missionDone', (d) => {
    if (!TH || THUMB) return;
    toast(`🎯 ภารกิจสำเร็จ! (${d.idx}/${d.total})`, 'big');
    toast(d.label, 'share');
    sfx.fanfare();
    const A = avOn();
    if (d.reward === 'big') {
      runEffect(META.bigEffect, null, 1, d.allDone ? 'ภารกิจครบทุกขั้น!' : 'ภารกิจสำเร็จ!');
      A?.play('dance', { queue: false });
    } else {
      fireworks(d.reward === 'fireworks' ? 9 : 4);
      if (A && d.reward !== 'fireworks') A.play(d.reward, { queue: false });
    }
    if (config?.tts?.wins) {
      const words = String(d.label).replace(/[^\p{L}\p{N}\p{M}\s]/gu, '').replace(/\s+/g, ' ').trim();
      enqueue({ kind: 'mission', prio: 2, text: `เย้ ภารกิจสำเร็จ ${words} แล้ว ขอบคุณทุกคน${P().na}` });
    }
  });

  // ============================================================ แชมป์เกม (สลับกับอันดับของขวัญในกล่องขวา)
  let champs = { today: [], week: [] };
  function renderChamps(list, title) {
    $('topTitle').textContent = title;
    const box = $('top');
    box.innerHTML = '';
    const rankBg = ['linear-gradient(135deg,#fff4b0,#ffb800)', 'linear-gradient(135deg,#fff,#9fb3c8)', 'linear-gradient(135deg,#ffd2a6,#c46a2b)'];
    list.forEach((u, i) => {
      const row = document.createElement('div');
      row.className = 'top-row';
      const rk = document.createElement('div');
      rk.className = 'rank';
      rk.textContent = i + 1;
      if (rankBg[i]) rk.style.background = rankBg[i];
      const nm = document.createElement('div');
      nm.className = 'nm';
      nm.innerHTML = '<div></div><div class="dm"></div>';
      nm.firstChild.textContent = u.name;
      nm.lastChild.textContent = `🏆 ${fmt(u.pts)} แต้ม • ชนะ ${u.wins}`;
      row.append(rk, avatarEl({ id: u.id, name: u.name }), nm);
      box.appendChild(row);
    });
    layoutPanels();
  }
  function showTopMode() {
    if (topMode === 'today') renderChamps(champs.today, '🏆 แชมป์เกมวันนี้');
    else if (topMode === 'week') renderChamps(champs.week, '🏆 แชมป์เกม 7 วัน');
    else {
      $('topTitle').textContent = META.texts.top;
      renderTop(lastTop);
    }
  }
  socket.on('champs', (c) => {
    champs = c || champs;
    if (TH && topMode !== 'gift') showTopMode();
  });
  setInterval(() => {
    if (!TH || THUMB) return;
    const modes = ['gift'];
    if (champs.today.length) modes.push('today');
    if (champs.week.length && JSON.stringify(champs.week) !== JSON.stringify(champs.today)) modes.push('week');
    const next = modes[(modes.indexOf(topMode) + 1) % modes.length];
    if (next === topMode) return;
    topMode = next;
    showTopMode();
  }, 12000);

  // ============================================================ เครดิตขอบคุณท้ายไลฟ์
  let creditsTimer = null;
  function showCredits(d) {
    const el = $('credits');
    clearTimeout(creditsTimer);
    if (!d) {
      el.className = '';
      el.innerHTML = '';
      return;
    }
    const roll = document.createElement('div');
    roll.className = 'roll';
    const add = (tag, text, cls = '') => {
      const e = document.createElement(tag);
      if (cls) e.className = cls;
      e.textContent = text;
      roll.appendChild(e);
      return e;
    };
    add('div', META.icon || '🎬', 'ic');
    add('h1', 'ขอบคุณทุกคน');
    add('div', 'ที่มาร่วมไลฟ์ด้วยกันวันนี้', 'sub');
    const min = Math.max(1, Math.round(((d.endAt || Date.now()) - (d.startAt || Date.now())) / 60000));
    const stats = document.createElement('div');
    stats.className = 'stats';
    const st = [['⏱️', min >= 60 ? `${Math.floor(min / 60)} ชม. ${min % 60} นาที` : `${min} นาที`], ['❤', fmtN(d.likes) + ' ไลค์'], ['💬', fmtN(d.comments) + ' คอมเมนต์'], ['➕', fmtN(d.follows) + ' ผู้ติดตามใหม่']];
    if (d.peakViewers) st.push(['👁', `คนดูสูงสุด ${fmtN(d.peakViewers)}`]);
    if (d.missionsDone) st.push(['🎯', `ภารกิจสำเร็จ ${d.missionsDone} ขั้น`]);
    for (const [i, t] of st) {
      const s = document.createElement('div');
      s.innerHTML = '<b></b><span></span>';
      s.firstChild.textContent = i;
      s.lastChild.textContent = t;
      stats.appendChild(s);
    }
    roll.appendChild(stats);
    const section = (title, list, fmtRow) => {
      if (!list?.length) return;
      add('h2', title);
      for (const x of list) add('div', fmtRow(x), 'nm');
    };
    section('💝 ขอบคุณผู้สนับสนุน', d.gifters, (x) => `${x.name}  •  💎 ${fmtN(x.d)}`);
    section('🏆 แชมป์เกม', d.winners, (x) => `${x.name}  •  ชนะ ${x.w} ครั้ง`);
    section('➕ เพื่อนใหม่ที่กดติดตาม', d.followers, (x) => x);
    section('💬 เพื่อนที่มาคุยกัน', (d.chatters || []).filter((x) => !(d.gifters || []).some((g) => g.id === x.id)).slice(0, 30), (x) => x.name);
    add('div', 'แล้วพบกันใหม่ไลฟ์หน้า 🙏', 'end');
    el.innerHTML = '';
    el.appendChild(roll);
    el.className = 'on';
    const lines = roll.children.length + (d.gifters?.length || 0) * 0.2;
    const dur = Math.min(70, Math.max(22, lines * 1.3));
    roll.style.animationDuration = dur + 's';
    avOn()?.play(['shrine', 'krathong'].includes(THEME_ID) ? 'wai' : 'bow', { queue: false });
    enqueue({ kind: 'credits', prio: 3, text: `ขอบคุณทุกคนที่มาร่วมไลฟ์วันนี้ แล้วพบกันใหม่${P().na}` });
    creditsTimer = setTimeout(() => {
      el.className = 'out';
      creditsTimer = setTimeout(() => showCredits(null), 1200);
    }, dur * 1000 + 1500);
  }
  socket.on('credits', (d) => !THUMB && TH && showCredits(d));

  // ============================================================ บอลลูนคำพูดของตัวละคร
  function avHead() {
    const A = avOn();
    if (!A || !config?.avatar?.enabled) return null;
    if (A.headPos) return A.headPos();
    const l = AV.lay;
    if (!l) return null;
    return { x: l.x, y: l.y - l.h * (config.avatar.framing === 'half' ? 0.8 : 0.95) };
  }
  let bubbleTimer = null;
  function avBubble(text) {
    const el = $('avBubble');
    clearTimeout(bubbleTimer);
    const head = text && config?.avatar?.bubble !== false && !THUMB ? avHead() : null;
    if (!head) {
      el.className = '';
      return;
    }
    el.firstChild.textContent = text.length > 90 ? text.slice(0, 88) + '…' : text;
    const right = head.x < 540; // ตัวละครอยู่ซ้าย → บอลลูนไปทางขวา
    el.style.left = right ? Math.max(20, Math.min(head.x - 10, 600)) + 'px' : '';
    el.style.right = right ? '' : Math.max(20, Math.min(1080 - head.x - 10, 600)) + 'px';
    el.style.top = Math.max(200, head.y - 14) + 'px';
    el.className = 'on' + (right ? ' r' : '');
  }
  const avBubbleOff = () => {
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => $('avBubble').classList.remove('on'), 500);
  };

  // ============================================================ ตัวละครตอบสนองคอมเมนต์
  const chatReactAt = {};
  function avatarChat(d) {
    const t = String(d.text || '');
    const kind = /555|ฮ่า|ฮา{2,}|😂|🤣|lol/i.test(t) ? 'laugh' : /^(สวัสดี|หวัดดี|ดีจ้า|ดีค่ะ|ดีครับ|hello|hi\b)/i.test(t) ? 'hello' : /รัก|❤|💕|😍|🥰|love/i.test(t) ? 'love' : null;
    if (!kind) return;
    const n = now();
    if (n - (chatReactAt[kind] || 0) < 12000 || n - (chatReactAt.any || 0) < 5000) return;
    chatReactAt[kind] = chatReactAt.any = n;
    avatarReact(kind, { id: d.id });
  }

  // ============================================================ รายงานสถานะหน้าเวที (ให้หน้า "เช็คก่อนไลฟ์")
  const uaShort = () => {
    const u = navigator.userAgent;
    return /OBS/i.test(u) ? 'OBS' : /TikTok|LiveStudio|Live Studio/i.test(u) ? 'TikTok LIVE Studio' : /iPhone|iPad|Android|Mobile/i.test(u) ? 'มือถือ/แท็บเล็ต' : /Edg\//.test(u) ? 'Edge' : /Chrome\//.test(u) ? 'Chrome' : /Firefox/i.test(u) ? 'Firefox' : 'เบราว์เซอร์';
  };
  function stageStat(changed = false) {
    if (THUMB) return;
    const de = document.documentElement;
    const s = Math.min(de.clientWidth / 1080, de.clientHeight / 1920);
    const dpr = window.devicePixelRatio || 1;
    socket.emit('stage:stat', {
      silent: SILENT, thumb: THUMB, mobile: MOBILE, theme: THEME_ID, w: de.clientWidth, h: de.clientHeight, dpr, px: Math.round(1080 * s * dpr),
      audio: !SILENT && fairAudioAllowed() && !!actx && actx.state === 'running' && !audioBlocked, fps: PERF.fps, qual: PERF.q, ua: uaShort(), changed,
    });
  }
  socket.on('connect', () => {
    if (window.__stageOff) return location.reload(); // โปรแกรมเปิดกลับมาแล้ว → โหลดหน้าเวทีใหม่
    stageStat(true);
  });
  // ปิดโปรแกรม Live Stage (ตั้งใจปิด) → จอดำพร้อมข้อความ + หยุดเสียงทั้งหมด
  // (ถ้าหลุดเพราะโปรแกรมค้าง/รีสตาร์ท ไม่เข้าเงื่อนไขนี้ ฉากยังอยู่ระหว่างรอต่อกลับ)
  // ธีมที่สร้างเองถูกแก้ระหว่างใช้อยู่ → โหลดหน้าเวทีใหม่ให้เห็นทันที
  socket.on('stage:reload', () => !THUMB && setTimeout(() => location.reload(), 300));
  socket.on('stage:shutdown', () => {
    if (THUMB || window.__stageOff) return;
    window.__stageOff = true;
    try {
      sayQ.length = 0;
      if ('speechSynthesis' in window) speechSynthesis.cancel();
      document.querySelectorAll('audio').forEach((a) => a.pause());
      actx?.suspend();
    } catch {}
    const el = document.createElement('div');
    el.id = 'stageOff';
    el.innerHTML = '<div><b>Live Stage ปิดอยู่</b><span>เปิดโปรแกรม Live Stage แล้วหน้านี้จะกลับมาเอง</span></div>';
    $('root').appendChild(el);
  });
  if (socket.connected) stageStat(true);
  setInterval(stageStat, 5000);
  // แอดมินกด "ระบุหน้าเวที" → ขึ้นเลขตัวใหญ่ จะได้รู้ว่าเปิดซ้อนอยู่ที่ไหน
  socket.on('stage:identify', ({ no } = {}) => {
    let el = $('stageId');
    if (!el) {
      el = document.createElement('div');
      el.id = 'stageId';
      $('root').appendChild(el);
    }
    const de = document.documentElement;
    const s = Math.min(de.clientWidth / 1080, de.clientHeight / 1920);
    el.innerHTML = `<b>หน้าเวที #${Number(no) || 1}</b><span></span>`;
    el.lastChild.textContent = `${uaShort()} • วาดกว้าง ${Math.round(1080 * s * (window.devicePixelRatio || 1))} px`;
    el.className = 'on';
    clearTimeout(el.t);
    el.t = setTimeout(() => (el.className = ''), 6000);
  });

  // ============================================================ ปรับคุณภาพภาพอัตโนมัติ (เครื่องเริ่มกระตุก → ลดภาระเอง)
  // งานหนักจริง = มี long task (งานค้างเกิน 50ms) หรือวาดแต่ละเฟรมนาน — ถ้าแค่เฟรมน้อยเพราะหน้าต่างถูกบัง/ย่อ ไม่นับ
  try {
    new PerformanceObserver((l) => (PERF.long += l.getEntries().length)).observe({ type: 'longtask' });
  } catch {}
  function setQual(q) {
    if (q === PERF.q) return;
    PERF.q = q;
    console.info('[stage] ปรับคุณภาพอัตโนมัติ → ระดับ', q, '(0 = เต็ม)');
    applyAvatar();
    stageStat(true);
  }
  setInterval(() => {
    const t = now();
    const fps = (PERF.frames * 1000) / Math.max(1, t - PERF.t0);
    const work = PERF.work / Math.max(1, PERF.frames);
    const loaded = PERF.long >= 2 || work > 9;
    PERF.work = PERF.long = 0;
    PERF.frames = 0;
    PERF.t0 = t;
    PERF.fps = Math.round(fps);
    if (THUMB) return;
    if (config?.perf?.auto === false) return setQual(0);
    if (document.hidden || fps < 1) return; // หน้าถูกซ่อน (เบราว์เซอร์หยุดวาด) ไม่ใช่เครื่องช้า
    PERF.best = Math.max(PERF.best * 0.995, fps);
    const target = Math.min(60, PERF.best);
    if (fps < target * 0.62 && loaded) {
      PERF.low++;
      PERF.high = 0;
    } else if (fps > target * 0.88) {
      PERF.high++;
      PERF.low = 0;
    } else PERF.low = PERF.high = 0;
    if (PERF.low >= 4 && PERF.q < 2) {
      PERF.low = 0;
      PERF.lastDown = t;
      setQual(PERF.q + 1);
    } else if (PERF.high >= 30 && PERF.q > 0 && t - PERF.lastDown > 120000) {
      PERF.high = 0;
      setQual(PERF.q - 1);
    }
  }, 2000);
  window.__perf = { PERF, setQual };

  // ============================================================ main loop
  let last = now();
  let lastThumb = 0;
  function frame(t) {
    const gap = THUMB ? 125 : LITE ? 31 : 0;
    if (gap && t - lastThumb < gap) {
      requestAnimationFrame(frame);
      return;
    }
    lastThumb = t;
    PERF.frames++;
    const w0 = now();
    updateMouth();
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    const tt = t - t0;
    const bt = beat(tt);

    if (stick && stick.until < t) {
      stick = null;
      applySticks();
    }

    bctx.drawImage(staticLayer, 0, 0);
    TH.drawBg?.(bctx, tt, bt, api, t);
    if (SCENE.level > 1) window.SceneLevels?.drawAnim(bctx, sceneId(), SCENE.level, tt, api);

    fxc.clearRect(0, 0, 1080, 1920);
    stepEmitters(t, dt);
    stepParticles(dt);
    TH.drawFxBack?.(fxc, tt, bt, api, t);
    drawSpots(fxc, t);
    TH.drawFx?.(fxc, tt, bt, api, t);
    if (SCENE.level > 1) window.SceneLevels?.drawFront(fxc, sceneId(), SCENE.level, tt, api);
    for (const p of parts) drawParticle(fxc, p);
    if (flashFx) {
      const k = (t - flashFx.t0) / flashFx.dur;
      if (k >= 1) flashFx = null;
      else {
        fxc.globalAlpha = flashFx.a * (1 - k);
        fxc.fillStyle = flashFx.color;
        fxc.fillRect(0, 0, 1080, 1920);
        fxc.globalAlpha = 1;
      }
    }
    PERF.work += now() - w0;
    requestAnimationFrame(frame);
  }

  // พรีวิวหน้า "สร้างธีมเอง": หลังบ้านแก้ META ในหน้านี้แล้วเรียกตัวนี้ → วาดแผง/สี/ฉากใหม่ทันที (ไม่ต้องบันทึก ไม่กระทบหน้าเวทีจริง)
  const refreshTheme = () => {
    if (!TH?.refresh) return;
    const st = document.getElementById('themeCss');
    if (st) st.textContent = TH.css;
    TH.refresh(api);
    drawStaticLayer();
  };
  window.__stage = { runEffect, fans, api, music, refreshTheme };
})();



