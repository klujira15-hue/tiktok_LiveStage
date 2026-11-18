/* Live Stage by TubHool — หน้าต่างโปรแกรม */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const socket = io();
  const desk = window.liveStage || null; // มาจาก Electron (preload.js) — ถ้าเปิดในเบราว์เซอร์ปกติจะไม่มี
  let acct = null;
  let config = null;
  let status = { status: 'idle', statusText: 'ยังไม่เชื่อมต่อ' };
  let page = 'home';
  let stages = [];
  let connectionErrorText = '';

  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const nf = (n) => Number(n || 0).toLocaleString('en-US');
  const thDate = (iso) => (iso ? new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
  function openExt(url) {
    try { if (/(^|\.)tubhool\.com$/i.test(new URL(url, location.origin).hostname)) return toast('รุ่น Local ไม่ใช้บริการบัญชีภายนอก', true); } catch { return; }
    if (desk?.openExternal) desk.openExternal(url);
    else window.open(url, '_blank', 'noopener');
  }
  let toastT = 0;
  function toast(msg, bad = false) {
    const el = $('toast');
    el.textContent = msg;
    el.className = 'toast on' + (bad ? ' bad' : '');
    clearTimeout(toastT);
    toastT = setTimeout(() => (el.className = 'toast'), 3200);
  }
  const post = (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) }).then((r) => r.json());

  // ---------------------------------------------------------------- บัญชี
  async function loadAccount() {
    try {
      acct = await fetch('/api/account').then((r) => r.json());
    } catch {
      return;
    }
    render();
  }
  socket.on('account', (a) => {
    acct = a;
    render();
  });
  socket.on('snapshot', (s) => {
    config = s.config;
    status = { status: s.status, statusText: s.statusText };
    render();
  });
  socket.on('config', (c) => {
    config = c;
    render();
  });
  socket.on('status', (s) => {
    status = s;
    renderStatus();
  });
  socket.on('connect', () => {
    socket.emit('admin:hello');
    loadAccount();
  });
  socket.on('stages', (l) => {
    stages = l || [];
    renderPre();
  });

  // เวอร์ชันโปรแกรม: หน้าเข้าสู่ระบบ + ใต้โลโก้ในเมนู + การ์ดบัญชี
  function showVersion(v) {
    if (!v) return;
    const os = desk ? (desk.platform === 'darwin' ? 'macOS' : 'Windows') : '';
    $('verText').textContent = `Live Stage เวอร์ชัน ${v}${os ? ' • ' + os : ''}`;
    $('sideVer').textContent = 'v' + v;
    $('acVer').textContent = `เวอร์ชัน ${v} · มีอะไรใหม่`;
    wnVersion(v);
  }

  // ---------------------------------------------------------------- มีอะไรใหม่ (whatsnew.js)
  // ขึ้นเองครั้งแรกหลังอัปเดต (ครั้งเดียวต่อเวอร์ชัน) · กดเลขเวอร์ชันเพื่อดูอีกครั้ง + ประวัติทุกเวอร์ชัน
  const WN = window.WHATS_NEW || [];
  const WN_KEY = 'ls.wnSeen';
  let wnCur = '';
  let wnIdx = 0;
  const wnGet = () => {
    try {
      return localStorage.getItem(WN_KEY) || '';
    } catch {
      return '';
    }
  };
  const wnSet = (v) => {
    try {
      localStorage.setItem(WN_KEY, v);
    } catch {}
  };
  const wnEsc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const wnDate = (iso) => {
    const d = new Date(iso + 'T00:00:00');
    return isNaN(d) ? '' : d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  const wnEntry = () => WN.find((x) => x.version === wnCur && x.slides?.length);
  const wnTag = (line) => {
    const m = /^(ใหม่|ปรับปรุง|แก้ไข):\s*/.exec(line);
    if (!m) return wnEsc(line);
    const cls = { ใหม่: 'new', ปรับปรุง: 'improve', แก้ไข: 'fix' }[m[1]];
    return `<span class="wn-tag ${cls}">${m[1]}</span>${wnEsc(line.slice(m[0].length))}`;
  };
  function wnVersion(v) {
    wnCur = v;
    const e = wnEntry();
    const seen = wnGet();
    $('sideVer').classList.toggle('new', !!e && seen !== v);
    if (!e || seen === v) return;
    // ติดตั้งใหม่ (ยังไม่ผ่านตัวช่วยตั้งค่า) = ไม่ต้องโชว์ของใหม่ — ทุกอย่างใหม่หมดอยู่แล้ว
    let fresh = false;
    try {
      fresh = localStorage.getItem('ls.wizardDone') !== '1';
    } catch {}
    if (fresh) return wnSet(v);
    setTimeout(() => wnOpen('slides'), 600);
  }
  function wnClose() {
    $('wn').hidden = true;
    if (wnEntry()) wnSet(wnCur);
    $('sideVer').classList.remove('new');
  }
  function wnOpen(mode, idx = 0) {
    const e = wnEntry();
    if (mode === 'slides' && !e) mode = 'history';
    $('wn').hidden = false;
    if (mode === 'history') return wnHistory();
    wnIdx = idx;
    wnRender();
  }
  function wnRender() {
    const e = wnEntry();
    const n = e.slides.length;
    $('wnTitle').textContent = `มีอะไรใหม่ใน v${e.version}`;
    $('wnSub').textContent = `${n} อย่างใหม่${e.date ? ' · ' + wnDate(e.date) : ''}`;
    if (wnIdx >= n) {
      // สไลด์สรุป
      $('wnBody').innerHTML = `<div class="wn-kick">สรุป v${wnEsc(e.version)}</div><div class="wn-h" style="font-size:26px;margin-bottom:14px">ทั้งหมดที่ใหม่ในเวอร์ชันนี้</div>
        <div class="wn-grid">${e.slides.map((s, i) => `<button class="wn-card" type="button" data-wn-i="${i}"><img src="${wnEsc(s.imgs[s.imgs.length - 1].src)}" alt=""><div><b>${wnEsc(s.title)}</b><span>${wnEsc(s.bullets?.[0] || s.desc)}</span></div></button>`).join('')}</div>`;
      $('wnFoot').innerHTML = `<span class="muted">ดูหน้านี้อีกครั้งได้ที่ <b class="ink">เลขเวอร์ชัน</b> มุมซ้ายบน</span>
        <div class="row"><button class="btn ghost" type="button" data-wn-nav="prev">ย้อนกลับ</button><button class="btn red" type="button" data-wn-nav="done">เริ่มใช้งาน</button></div>`;
      return;
    }
    const s = e.slides[wnIdx];
    const pics = s.imgs.map((m) => `<figure><img src="${wnEsc(m.src)}" alt="${wnEsc(m.cap || s.title)}"${m.hi ? ' class="hi"' : ''}><figcaption>${wnEsc(m.cap || '')}</figcaption></figure>`);
    const arrow = '<svg class="wn-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
    const showArrow = s.imgs.length === 2 && s.imgs[1].hi;
    $('wnBody').innerHTML = `<div class="wn-slide">
      <div class="wn-pics${s.wide ? ' wide' : ''}">${showArrow ? pics[0] + arrow + pics[1] : pics.join('')}</div>
      <div class="wn-text"><div class="wn-kick">ใหม่ ${wnIdx + 1} / ${n}</div><div class="wn-h">${wnEsc(s.title)}</div><p class="wn-desc">${wnEsc(s.desc)}</p>
        <ul class="wn-list">${(s.bullets || []).map((b, i) => `<li><b>${i + 1}</b><span>${wnEsc(b)}</span></li>`).join('')}</ul>
        ${s.go ? `<button class="btn ghost wn-go" type="button" data-wn-go="${wnEsc(s.go)}">${wnEsc(s.goLabel || 'ไปดู')} →</button>` : ''}</div></div>`;
    const next = e.slides[wnIdx + 1];
    $('wnFoot').innerHTML = `<div class="wn-dots">${e.slides.map((_, i) => `<button type="button" class="${i === wnIdx ? 'on' : ''}" data-wn-i="${i}" aria-label="สไลด์ ${i + 1}"></button>`).join('')}</div>
      <div class="row">${wnIdx ? '<button class="btn ghost" type="button" data-wn-nav="prev">ย้อนกลับ</button>' : '<button class="btn ghost" type="button" data-wn-nav="done">ข้ามทั้งหมด</button>'}
      <button class="btn red" type="button" data-wn-nav="next">${next ? 'ถัดไป · ' + wnEsc(next.title) : 'ดูสรุป'}</button></div>`;
  }
  function wnHistory() {
    $('wnTitle').textContent = 'มีอะไรใหม่';
    $('wnSub').textContent = `ประวัติการอัปเดตทุกเวอร์ชัน${wnCur ? ' · คุณใช้ v' + wnCur + ' อยู่' : ''}`;
    $('wnBody').innerHTML = WN.map((v, i) => {
      const cur = v.version === wnCur;
      const items = [...(v.slides || []).map((s) => 'ใหม่: ' + s.title), ...(v.items || [])];
      const strip = v.slides ? `<div class="wn-strip">${v.slides.map((s, k) => `<img src="${wnEsc(s.imgs[s.imgs.length - 1].src)}" alt="${wnEsc(s.title)}" data-wn-i="${k}" style="cursor:pointer">`).join('')}</div>` : '';
      return `<details class="wn-ver${cur ? ' cur' : ''}"${i < 2 ? ' open' : ''}><summary><span class="row"><b style="font-size:18px">v${wnEsc(v.version)}</b>${cur ? '<span class="tag redfill" style="font-size:12px;padding:2px 10px">เวอร์ชันนี้</span>' : ''}<span class="muted" style="font-size:13px">${wnDate(v.date)}</span></span>
        ${v.slides ? '<button class="btn red" type="button" data-wn-nav="slides" style="min-height:36px;font-size:14px">ดูแบบสไลด์อีกครั้ง</button>' : ''}</summary>${strip}<ul>${items.map((l) => `<li>${wnTag(l)}</li>`).join('')}</ul></details>`;
    }).join('');
    $('wnFoot').innerHTML = '<span class="muted">โปรแกรมอัปเดตให้เองตอนเปิด ไม่ต้องดาวน์โหลดใหม่</span><button class="btn ghost" type="button" data-wn-nav="close">ปิด</button>';
  }
  $('wnClose').onclick = wnClose;
  $('wn').addEventListener('click', (ev) => {
    if (ev.target === $('wn')) return wnClose();
    const t = ev.target.closest('[data-wn-nav],[data-wn-i],[data-wn-go]');
    if (!t) return;
    if (t.dataset.wnGo) {
      wnClose();
      go(t.dataset.wnGo);
      return;
    }
    if (t.dataset.wnI != null) {
      wnIdx = Number(t.dataset.wnI);
      return wnRender();
    }
    const nav = t.dataset.wnNav;
    if (nav === 'next') wnIdx += 1;
    else if (nav === 'prev') wnIdx = Math.max(0, wnIdx - 1);
    else if (nav === 'slides') wnIdx = 0;
    else return wnClose();
    wnRender();
  });
  document.addEventListener('keydown', (ev) => {
    if ($('wn').hidden) return;
    if (ev.key === 'Escape') wnClose();
    else if (ev.key === 'ArrowRight' && wnEntry() && $('wnBody').querySelector('.wn-slide')) {
      wnIdx += 1;
      wnRender();
    } else if (ev.key === 'ArrowLeft' && wnEntry() && wnIdx > 0 && !$('wnBody').querySelector('.wn-ver')) {
      wnIdx -= 1;
      wnRender();
    }
  });
  $('sideVer').onclick = () => wnOpen(wnEntry() && wnGet() !== wnCur ? 'slides' : 'history');
  $('acVer').onclick = () => wnOpen('history');
  showVersion(desk?.version);
  $('loginBtn').onclick = async () => {
    $('loginBtn').disabled = true;
    try {
      const { url } = await post('/api/account/login');
      openExt(url);
      $('loginMsg').className = 'msg ok';
      $('loginMsg').textContent = 'เปิดเบราว์เซอร์แล้ว — ล็อกอินแล้วกด “อนุญาต” จากนั้นกลับมาที่หน้านี้ได้เลย';
    } catch {
      $('loginMsg').className = 'msg';
      $('loginMsg').textContent = 'เริ่มเข้าสู่ระบบไม่ได้ ลองใหม่อีกครั้ง';
    }
    setTimeout(() => ($('loginBtn').disabled = false), 2500);
  };
  document.querySelectorAll('[data-ext]').forEach((a) =>
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const site = acct?.site || 'https://tubhool.com';
      const u = acct?.user;
      const target = a.dataset.ext === '/donate/' && u?.donate_url ? u.donate_url : site + a.dataset.ext;
      openExt(target);
    }),
  );
  $('acLogout').onclick = async () => {
    if (!confirm('ออกจากระบบ TubHool บนเครื่องนี้?')) return;
    acct = await post('/api/account/logout');
    render();
  };
  $('recheck').onclick = async () => {
    $('recheck').disabled = true;
    acct = await post('/api/account/refresh');
    $('recheck').disabled = false;
    render();
    if (acct.plan === 'supporter') {
      toast('ขอบคุณที่สนับสนุน TubHool — ปลดลิมิตทุกธีมแล้ว');
      go('themes');
    } else toast(acct.error || 'ยังไม่พบการสนับสนุน — ถ้าเพิ่งส่งสลิป รอแอดมินตรวจสักครู่', !!acct.error);
  };

  // เปิดเมนูธีมแล้วดึงกรอบโปรโมต/ล็อกธีมล่าสุดจากหลังบ้าน (ไม่เกินนาทีละครั้ง) — ปกติตรวจแค่ตอนเปิดโปรแกรม + ทุก 1 ชม.
  let themesFetchedAt = 0;
  async function refreshThemesFromWeb() {
    if (acct?.mode !== 'desktop' || !acct?.signedIn || Date.now() - themesFetchedAt < 60_000) return;
    themesFetchedAt = Date.now();
    try {
      const a = await post('/api/account/refresh');
      if (a && !a.error) {
        acct = a;
        render();
      }
    } catch {}
  }

  // ---------------------------------------------------------------- เมนู
  function go(name) {
    page = name;
    document.querySelectorAll('.nav').forEach((b) => b.classList.toggle('on', b.dataset.go === name));
    const adm = name.startsWith('adm:');
    for (const id of ['home', 'preview', 'themes', 'unlock', 'widgets']) $('p-' + id).hidden = name !== id;
    if (name === 'widgets') renderWidgets();
    else $('wgrid').querySelectorAll('iframe').forEach((f) => (f.src = 'about:blank'));
    // พรีวิวโหลดเฉพาะตอนเปิดหน้านี้ (ไม่กินเครื่องตอนอยู่หน้าอื่น)
    if (name === 'preview') {
      if (!$('pvFrame').src || $('pvFrame').src.endsWith('about:blank')) $('pvFrame').src = 'stage.html?silent&desktop';
      renderGifts();
    } else if (!$('pvFrame').src.endsWith('about:blank') && $('pvFrame').src) $('pvFrame').src = 'about:blank';
    $('p-adm').hidden = !adm;
    if (adm) {
      const p = name.slice(4);
      $('admFrame').src = `admin.html?embed&p=${p}#${p}`;
    }
    if (name === 'home') refreshPre();
    if (name === 'themes') {
      if (renderThemes.dirty) renderThemes();
      refreshThemesFromWeb();
      loadClips();
    }
    window.scrollTo(0, 0);
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-go]');
    if (b) go(b.dataset.go);
  });

  // ---------------------------------------------------------------- วาดหน้าจอ
  // ซ่อนเมนูที่หลังบ้าน TubHool ปิดไว้
  window.lsGo = (name) => go(name); // หน้าใน iframe (admin) พาไปหน้าอื่นของแอป เช่น ปลดล็อก
  function applyFeatures(f) {
    document.querySelectorAll('[data-plan="supporter"]').forEach((el) => el.classList.toggle('locked', acct?.plan === 'member'));
    if (!f) return;
    document.querySelectorAll('[data-feature]').forEach((el) => (el.hidden = f[el.dataset.feature] === false));
    if (f[page === 'widgets' ? 'widgets' : page === 'adm:custom' ? 'custom' : ''] === false) go('home');
  }
  function render() {
    if (!acct) return;
    applyFeatures(config?.features);
    if (!desk?.version) showVersion(acct.version);
    const needLogin = acct.mode === 'desktop' && !acct.signedIn;
    $('login').hidden = !needLogin;
    $('main').hidden = needLogin || !config;
    if (needLogin) {
      $('loginBtn').disabled = !!acct.busy;
      if (acct.error) {
        $('loginMsg').className = 'msg';
        $('loginMsg').textContent = acct.error;
      }
      return;
    }
    if (!config) return;
    const u = acct.user;
    const plan = acct.plan;
    $('acName').textContent = 'TikTok LiveStage';
    $('acAv').textContent = (u?.name || 'L').trim().charAt(0).toUpperCase();
    $('acPlan').textContent = plan === 'supporter' ? `ผู้สนับสนุน • ถึง ${thDate(u?.supporter_until)}` : plan === 'member' ? 'สมาชิกฟรี • 1 ธีม' : 'ใช้งานในเครื่อง • ไม่ต้องสมัครบัญชี';
    $('acUnlock').hidden = plan !== 'member';
    $('acLogout').hidden = acct.mode !== 'desktop';
    const off = $('offlineBanner');
    off.hidden = !acct.offlineSince;
    if (acct.offlineSince) off.textContent = `ต่อเว็บ TubHool ไม่ได้ — ใช้ข้อมูลบัญชีล่าสุดไปก่อนได้ ${acct.offlineDays} วัน (ตรวจล่าสุด ${thDate(new Date(acct.offlineSince).toISOString())})`;

    const yt = config.platform === 'youtube';
    document.querySelectorAll('[data-pf]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.pf === (yt ? 'youtube' : 'tiktok'))));
    $('ttTitle').textContent = yt ? 'ช่อง YouTube ที่จะไลฟ์' : 'บัญชี TikTok ที่จะไลฟ์';
    $('ttLbl').textContent = yt ? '@ชื่อช่อง หรือลิงก์ไลฟ์ YouTube' : 'ชื่อผู้ใช้ TikTok';
    $('ttUser').placeholder = yt ? '@ชื่อช่อง หรือ youtube.com/watch?v=...' : '@ชื่อของคุณ';
    $('ttHint').firstChild.textContent = yt
      ? 'YouTube: Super Chat/Sticker = ของขวัญ • สมาชิกใหม่ = ผู้ติดตาม • ไม่มีหัวใจ/แชร์ • กดเชื่อมต่อหลังเริ่มไลฟ์ '
      : 'กดเชื่อมต่อหลังเริ่มไลฟ์ใน LIVE Studio — ถ้าหลุดระบบจะต่อกลับให้เอง • ';
    if (document.activeElement !== $('ttUser')) $('ttUser').value = yt ? config.youtube || '' : config.username ? '@' + config.username : '';
    $('stageLink').textContent = `http://127.0.0.1:${location.port || 80}/stage.html`;
    const th = config.themes[config.theme];
    $('curThemeName').textContent = th ? `${th.meta.icon} ${th.meta.name}` : '-';
    $('curThumb').src = previewSrc(config.theme);
    $('curThumb').alt = th ? 'ตัวอย่างธีม ' + th.meta.name : '';
    renderStatus();
    renderThemes();
    renderUnlock();
    if (!render.pre) {
      render.pre = true;
      refreshPre();
    } else renderPre();
  }

  // ระหว่างไลฟ์จริง (เชื่อมต่อ/กำลังต่อ/ต่อกลับ) → ล็อกปุ่มทดสอบ
  const isLive = () => {
    const s = status?.status;
    return s === 'connected' || s === 'connecting' || (s === 'offline' && !!config?.autoConnect);
  };
  function renderSafety() {
    const live = isLive();
    $('pvLock').hidden = !live;
    document.querySelector('.pv-right')?.classList.toggle('locked', live);
    document.querySelectorAll('[data-live-lock]').forEach((x) => (x.hidden = !live));
    const safe = !!config?.safety?.safeMode;
    $('safeOk').hidden = !safe;
    $('nbSafe').hidden = safe || !config;
  }
  socket.on('test:blocked', () => toast('ระหว่างไลฟ์จริงกดทดสอบไม่ได้ (เสี่ยงโดนแบน) — ตัดการเชื่อมต่อก่อน', true));
  function renderStatus() {
    renderSafety();
    const s = status.status;
    const el = $('liveStatus');
    el.className = 'status ' + (s === 'connected' ? 'on' : s === 'connecting' ? 'wait' : s === 'offline' || s === 'error' ? 'bad' : '');
    el.lastChild.textContent = s === 'connected' ? 'เชื่อมต่อไลฟ์แล้ว' : status.statusText || 'ยังไม่เชื่อมต่อ';
    const help=$('ttConnectionHelp');if(help){if(s==='connected'){connectionErrorText='';help.textContent='เชื่อมต่อไลฟ์แล้ว พร้อมรับเหตุการณ์จากผู้ชม';}else if(s==='offline'||s==='error'){help.textContent=connectionErrorText||status.statusText||'เชื่อมต่อไม่สำเร็จ ตรวจ @ชื่อผู้ใช้ และเปิด LIVE ก่อน';}else if(s==='connecting'){help.textContent=status.statusText||'กำลังเชื่อมต่อ';}}
    const live = s === 'connected' || s === 'connecting' || (s === 'offline' && config?.autoConnect);
    $('ttConnect').textContent = live ? 'ตัดการเชื่อมต่อ' : 'เชื่อมต่อ';
    $('ttConnect').className = 'btn ' + (live ? 'ghost' : 'red');
    // ห้องควบคุมไลฟ์เปิดได้เฉพาะตอนเชื่อมต่อไลฟ์แล้ว • สมาชิกฟรี: ปุ่มกดได้เสมอ แต่เปิดหน้าต่างชวนสมัครผู้สนับสนุนแทน
    const on = s === 'connected';
    const member = acct?.plan === 'member';
    $('openControl').disabled = !on && !member;
    $('openControl').classList.toggle('sup', member);
    $('openControl').title = member ? 'เฉพาะผู้สนับสนุน' : on ? '' : 'เชื่อมต่อไลฟ์ก่อน ถึงจะเปิดห้องควบคุมได้';
    $('ctlHint').textContent = member
      ? '👑 เฉพาะผู้สนับสนุน — ดูหน้าเวที + คอมเมนต์ สั่งเอฟเฟกต์ เพลง เสียงพูด ได้ในหน้าเดียว'
      : on ? 'ดูหน้าเวที + คอมเมนต์ สั่งเอฟเฟกต์ เพลง เสียงพูด รอเริ่ม/พักเบรก ได้ในหน้าเดียว' : 'เชื่อมต่อไลฟ์ก่อนถึงจะเปิดได้ — เด้งขึ้นเองตอนเชื่อมต่อ';
  }
  const outputPanel=document.createElement('div');outputPanel.className='card';outputPanel.style.marginTop='16px';outputPanel.innerHTML='<h3>ส่งภาพฉากไป LIVE Manager</h3><p class="hint">1. เตรียมภาพฉาก → 2. เปิด LIVE Manager → เลือก OBS Virtual Camera เป็นแหล่งภาพก่อนเริ่ม LIVE จากคอม</p><div class="row"><button class="btn yellow" id="startLiveOutput" type="button">1 · เตรียมภาพฉาก</button><button class="btn ghost" id="openLiveManager" type="button">2 · เปิด LIVE Manager</button></div><p id="liveOutputStatus" class="hint" role="status">ไม่เปลี่ยนภาพไลฟ์มือถืออัตโนมัติ · Virtual Camera ส่งภาพเท่านั้น ต้องเลือกไมโครโฟน/เสียงแยกใน LIVE Manager</p>';
  $('stageLink').closest('.card').appendChild(outputPanel);
  $('startLiveOutput').onclick=async()=>{try{if(!desk?.startLiveOutput)throw Error('เปิดโปรแกรมใหม่เพื่อใช้ส่วนส่งภาพ');$('liveOutputStatus').textContent=(await desk.startLiveOutput()).message;}catch(e){$('liveOutputStatus').textContent=e.message||'เตรียมภาพไม่สำเร็จ';}};
  $('openLiveManager').onclick=async()=>{try{if(!desk?.openLiveManager)throw Error('เปิดโปรแกรมใหม่เพื่อใช้ LIVE Manager ในแอป');await desk.openLiveManager();}catch(e){$('liveOutputStatus').textContent=e.message||'เปิด LIVE Manager ไม่สำเร็จ';}};
  const tikTokAccountBox=document.createElement('div');tikTokAccountBox.className='row';tikTokAccountBox.style.cssText='flex-wrap:wrap;margin-top:12px';
  tikTokAccountBox.innerHTML='<button class="btn ghost" type="button" id="ttEmbeddedLogin">ล็อกอิน TikTok ในโปรแกรม</button><button class="btn ghost" type="button" id="ttEmbeddedLogout" hidden>ล้าง session TikTok</button><small class="muted" id="ttAccountStatus" role="status">กำลังตรวจ session TikTok…</small>';
  $('ttUser').parentElement.insertAdjacentElement('afterend',tikTokAccountBox);
  async function refreshTikTokAccount(){
    if(!desk?.tiktokAccountStatus){$('ttEmbeddedLogin').disabled=true;$('ttAccountStatus').textContent='เปิดแอปใหม่เพื่อใช้หน้าล็อกอิน TikTok ภายในโปรแกรม';return;}
    try{const a=await desk.tiktokAccountStatus();$('ttEmbeddedLogout').hidden=!a.saved;$('ttAccountStatus').textContent=a.saved?'มี session TikTok ในเครื่องแล้ว · เริ่ม LIVE แล้วกดเชื่อมต่อ':a.opened?'กรุณาล็อกอินในหน้าต่าง TikTok ที่เปิดอยู่':'ยังไม่ได้ล็อกอิน TikTok ในโปรแกรม';}catch{$('ttAccountStatus').textContent='ตรวจ session ไม่สำเร็จ กรุณาเปิดแอปใหม่';}
  }
  $('ttEmbeddedLogin').onclick=async()=>{try{await desk.tiktokAccountLogin();await refreshTikTokAccount();}catch{$('ttAccountStatus').textContent='เปิดหน้าล็อกอินไม่ได้ กรุณาปิดและเปิดโปรแกรมใหม่';}};
  $('ttEmbeddedLogout').onclick=async()=>{if(!confirm('ล้าง session TikTok ที่บันทึกในโปรแกรมนี้?'))return;try{await desk.tiktokAccountLogout();await refreshTikTokAccount();}catch{$('ttAccountStatus').textContent='ล้าง session ไม่สำเร็จ';}};
  refreshTikTokAccount();setInterval(refreshTikTokAccount,3000);
  const connectionHelp=document.createElement('p');connectionHelp.id='ttConnectionHelp';connectionHelp.className='hint';connectionHelp.setAttribute('role','status');
  const usernameHelp='ใส่ @ชื่อผู้ใช้ จากหน้าโปรไฟล์ หรือวางลิงก์โปรไฟล์ TikTok (ชื่อที่ใช้ค้นหาบัญชี ไม่ใช่ชื่อแสดงผล) และเริ่ม LIVE ก่อนเชื่อมต่อ';
  connectionHelp.textContent=usernameHelp;$('ttUser').parentElement.insertAdjacentElement('afterend',connectionHelp);
  $('ttUser').setAttribute('aria-describedby','ttConnectionHelp');
  function showConnectionError(entry){
    if(entry?.type!=='error'||!['connecting','offline','error'].includes(status.status))return;
    const text=String(entry.text||'');
    if(/Failed to retrieve Room ID/i.test(text))connectionErrorText='หาไลฟ์ไม่พบ: ตรวจ @ชื่อผู้ใช้ จากโปรไฟล์ และตรวจว่าบัญชีนี้กำลังเปิด LIVE อยู่ หากถูกต้องแล้วอาจเป็นการดึงข้อมูลจาก TikTok ล้มเหลว';
    else if(/เชื่อมต่อไม่สำเร็จ:/.test(text))connectionErrorText=text.slice(0,240);
    if(connectionErrorText)connectionHelp.textContent=connectionErrorText;
  }
  socket.on('log',showConnectionError);socket.on('logs',entries=>{const item=(entries||[]).find(x=>x.type==='error'&&/Failed to retrieve Room ID|เชื่อมต่อไม่สำเร็จ:/.test(x.text||''));if(item)showConnectionError(item);});
  $('ttConnect').onclick = () => {
    const s = status.status;
    if (s === 'connected' || s === 'connecting' || (s === 'offline' && config?.autoConnect)) return socket.emit('admin:disconnect');
    const name = $('ttUser').value.trim();
    connectionErrorText='';
    connectionHelp.textContent='กำลังตรวจการเชื่อมต่อ…';
    const yt = config?.platform === 'youtube';
    if (!name) {connectionHelp.textContent=usernameHelp;return toast(yt ? 'ใส่ช่อง YouTube ก่อน' : 'ใส่ @ชื่อผู้ใช้ TikTok จากหน้าโปรไฟล์ก่อน', true);}
    socket.emit('admin:saveConfig', yt ? { youtube: name } : { username: name }, () =>
      socket.emit('admin:connect', null, (ack) => ack && ack.ok === false && toast(ack.error || 'เชื่อมต่อไม่ได้', true)),
    );
  };
  document.querySelectorAll('[data-pf]').forEach((b) =>
    b.addEventListener('click', () => {
      if (!config || config.platform === b.dataset.pf) return;
      const s = status.status;
      if (s === 'connected' || s === 'connecting') return toast('ตัดการเชื่อมต่อก่อน แล้วค่อยเปลี่ยนแพลตฟอร์ม', true);
      socket.emit('admin:saveConfig', { platform: b.dataset.pf });
    }),
  );
  $('copyLink').onclick = async () => {
    try {
      await navigator.clipboard.writeText($('stageLink').textContent);
      toast('คัดลอกลิงก์แล้ว — ไปวางในแหล่ง Link ของ LIVE Studio');
    } catch {
      toast('คัดลอกไม่ได้ — เลือกข้อความแล้วกด Ctrl+C', true);
    }
  };

  // ---------------------------------------------------------------- เช็คก่อนไลฟ์ (ย่อ)
  function refreshPre() {
    socket.emit('pre:get', null, (d) => {
      if (!d) return;
      stages = d.stages || [];
      renderPre();
    });
  }
  setInterval(() => page === 'home' && !$('main').hidden && refreshPre(), 5000);
  function renderPre() {
    const act = stages.filter((s) => !s.silent && !s.thumb);
    const items = [];
    if (!act.length) items.push(['bad', 'ยังไม่มีหน้าเวทีเปิดอยู่', 'คัดลอกลิงก์ขั้นที่ 2 ไปใส่ใน LIVE Studio']);
    else if (act.length > 1) items.push(['bad', `หน้าเวทีเปิดอยู่ ${act.length} ที่ — เสียงจะพูดซ้อน`, 'ปิดอันที่ไม่ใช้ (กด “ขึ้นเลขบนหน้าเวที” เพื่อหา)']);
    else items.push(['ok', 'หน้าเวทีเปิดอยู่ 1 ที่', act[0].ua]);
    if (act.length) {
      const small = act.filter((s) => s.px < 1070);
      items.push(small.length ? ['warn', `ภาพถูกวาดกว้างแค่ ${small[0].px} px`, 'ตั้งขนาดแหล่ง Link เป็น 1080 × 1920 จะคมขึ้น'] : ['ok', 'ความคมชัดเต็ม 1080 px', 'ภาพไม่เบลอ']);
      // แหล่ง Link ต้องเป็นแนวตั้ง 9:16 ไม่งั้นภาพหดและมีขอบบน/ล่างในไลฟ์
      const off = act.filter((s) => s.w && s.h && Math.abs(s.w / s.h - 9 / 16) > 0.03);
      if (off.length) items.push(['warn', `ขนาดแหล่ง Link ไม่ใช่ 9:16 (ตอนนี้ ${off[0].w} × ${off[0].h})`, 'ใน LIVE Studio ตั้ง Custom resolution เป็น W 1080 × H 1920 กด Apply แล้วกดลูกศร ˅ ข้างปุ่มปรับขนาด (⤢) ในแถบเครื่องมือด้านบน เลือก “Fill” — ไม่งั้นภาพจะเหลือขอบ']);
      const mute = act.filter((s) => !s.audio);
      items.push(mute.length ? ['warn', 'เสียงบนหน้าเวทียังไม่เปิด', 'คลิกขวาที่แหล่ง Link → Interact แล้วคลิกในจอ 1 ครั้ง'] : ['ok', 'เสียงบนหน้าเวทีเปิดแล้ว', 'ถ้าในไลฟ์เสียงซ้อน หรือไม่มีเสียง ลองสลับเปิด/ปิด “Turn on sound” ในแหล่ง Link']);
      const slow = act.filter((s) => s.fps && s.fps < 24);
      items.push(slow.length ? ['warn', `ภาพกระตุก ${slow[0].fps} เฟรม/วินาที`, 'ปิดโปรแกรมอื่น หรือเปลี่ยนเป็นตัวละคร 2D'] : ['ok', `ภาพลื่น ${act[0].fps || '-'} เฟรม/วินาที`, act.some((s) => s.qual) ? 'ระบบลดคุณภาพให้อัตโนมัติอยู่' : 'คุณภาพเต็ม']);
    }
    const plan = acct?.plan;
    if (plan === 'member' && config && !acct.themes?.includes(config.theme)) items.push(['bad', 'ยังไม่ได้เลือกธีมฟรี', 'ไปที่เมนู “ธีม” แล้วเลือก 1 ธีม']);
    // เป็นคำแนะนำ ไม่ใช่ข้อสอบ: ไม่นับ "ผ่าน/ไม่ผ่าน" แค่บอกว่ามีเรื่องน่าดูกี่ข้อ (ใช้สีเหลืองทั้งหมด ไม่ใช้สีแดง)
    const tips = items.filter((i) => i[0] !== 'ok').length;
    for (const i of items) if (i[0] === 'bad') i[0] = 'warn';
    $('preCount').textContent = tips ? `มีคำแนะนำ ${tips} ข้อ` : 'ทุกอย่างดูดี ✓';
    $('preList').innerHTML = items.map(([k, t, d]) => `<div class="${k}"><span class="ic">${k === 'ok' ? '✓' : 'i'}</span><div><b>${esc(t)}</b><small>${esc(d)}</small></div></div>`).join('');
  }
  // A local sound check: play here, without broadcasting to every stage window.
  let voiceTestAudio = null;
  let voiceTestTimer = null;
  const voiceTestButton = $('preTts');
  voiceTestButton.title = 'ฟังเสียงพูดบนเครื่องนี้ได้ทันที ไม่ต้องเปิดหน้าเวที';
  let voiceTestSequence = 0;
  let currentVoiceTestKey = '';
  const testLocalVoice = async (voiceOverride, exampleText, preview) => {
    const requestKey = String(voiceOverride||'configured')+'|'+(exampleText||'default')+'|'+(preview?.manifest||'');
    const switching = !!voiceOverride && currentVoiceTestKey !== requestKey;
    if (voiceTestAudio || voiceTestButton.dataset.busy) {
      voiceTestAudio?.pause();
      voiceTestAudio?.removeAttribute('src');
      window.speechSynthesis?.cancel();
      clearTimeout(voiceTestTimer);
      voiceTestAudio = null;
      delete voiceTestButton.dataset.busy;
      voiceTestButton.textContent = '🔊 ทดสอบเสียงบนเครื่องนี้';
      window.__voiceTestStatus = {status:'stopped'};
      if ($('particleCaption')) $('particleCaption').textContent='หยุดเล่นแล้ว · คะ ใช้ในคำถาม / ค่ะ ใช้ตอบรับหรือบอกเล่า';
      if (!switching) return;
    }
    currentVoiceTestKey = requestKey;
    const t = {...(config?.tts || {})};
    if (exampleText) {t.rate=1;t.pitch=0;}
    if (voiceOverride) { t.voice = voiceOverride; t.engine = 'edge'; }
    const localSample = !!preview || (voiceOverride === 'th-TH-PremwadeeNeural' && !exampleText);
    if(preview) t.voice=preview.voice;
    const voiceBackend = preview ? 'gemini-local-sample' : localSample ? 'local-sample' : 'edge';
    const text = exampleText || (localSample ? 'สวัสดีค่ะ ยินดีต้อนรับทุกคนเข้าสู่ไลฟ์ของเราค่ะ' : 'ทดสอบเสียง หนึ่ง สอง สาม ได้ยินชัดไหม');
    const token = String(++voiceTestSequence);
    voiceTestButton.dataset.busy = token;
    window.__voiceTestStatus = {status:'loading', backend:t.engine === 'browser' ? 'browser' : voiceBackend, voice:t.voice, text};
    voiceTestButton.textContent = '■ หยุดทดสอบเสียง';
    if(preview && $('particleCaption')) $('particleCaption').textContent='กำลังเล่น Gemini · Kore: ได้ยินไหมคะ? ได้ยินค่ะ. · ไม่เปลี่ยนเสียงหลัก';
    const active = () => voiceTestButton.dataset.busy === token;
    const finish = (status, backend, message) => {
      if (!active()) return;
      clearTimeout(voiceTestTimer);
      voiceTestAudio?.pause();
      voiceTestAudio = null;
      delete voiceTestButton.dataset.busy;
      voiceTestButton.textContent = '🔊 ทดสอบเสียงบนเครื่องนี้';
      window.__voiceTestStatus = {status, backend, voice:t.voice};
      if(preview && $('particleCaption')) $('particleCaption').textContent=status==='error'?'เล่นคลิป Gemini ไม่สำเร็จ กรุณาตรวจเสียงของเครื่อง': 'เล่นคลิป Gemini · Kore จบแล้ว · โปรดฟังเทียบ คะ กับ ค่ะ ก่อนเลือกใช้';
      if (message) toast(message, status === 'error');
    };
    let fallbackStarted = false;
    const fallback = () => {
      if (!active() || fallbackStarted) return;
      fallbackStarted = true;
      if (localSample) return finish('error',voiceBackend,'เล่นไฟล์ตัวอย่างเปรมวดีไม่ได้ กรุณาลองโหลดหน้าจอใหม่');
      if (voiceOverride) return finish('error',voiceBackend,'บริการเสียงที่เลือกยังไม่พร้อม กรุณาลองอีกครั้ง — ระบบไม่ได้สลับเป็นเสียงอื่น');
      clearTimeout(voiceTestTimer);
      voiceTestAudio?.pause();
      voiceTestAudio = null;
      if (!('speechSynthesis' in window)) return finish('error','browser','เครื่องนี้ไม่มีระบบเสียงสำรอง');
      const voices = speechSynthesis.getVoices();
      const voice = voices.find(v => /^th(-|_)/i.test(v.lang));
      if (!voice) return finish('error','browser','เสียงออนไลน์ใช้ไม่ได้ และเครื่องยังไม่มีเสียงภาษาไทยสำรอง');
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = voice;
      utterance.lang = 'th-TH';
      utterance.volume = t.volume ?? 0.9;
      utterance.rate = t.rate || 1.05;
      utterance.onstart = () => { if(active()) window.__voiceTestStatus = {status:'playing',backend:'browser',voice:voice.name}; };
      utterance.onend = () => finish('ended','browser','ทดสอบเสียงสำรองของเครื่องเสร็จแล้ว');
      utterance.onerror = () => finish('error','browser','เล่นเสียงสำรองไม่ได้ กรุณาตรวจลำโพง');
      voiceTestTimer = setTimeout(() => { speechSynthesis.cancel(); finish('error','browser','เสียงสำรองไม่ตอบสนอง'); },20000);
      speechSynthesis.speak(utterance);
    };
    if (t.engine === 'browser') return fallback();
    if (localSample) {
      let sample;
      try { const r=await fetch(preview?.manifest || '/audio-tests/premwadee-natural.json?v=3',{cache:'no-store'});if(!r.ok)throw Error('sample unavailable');sample=await r.json(); }
      catch { return finish('error',voiceBackend,'โหลดคลิปทักทายใหม่ไม่ได้ กรุณาโหลดหน้าจอใหม่'); }
      if(!active())return;
      if(!sample.clips?.length)return finish('error',voiceBackend,'ยังไม่มีคลิปตัวอย่างพร้อมใช้');
      const playPart = index => {
        if(!active())return;
        const clip=sample.clips[index],a=new Audio(clip.url+'?v=3');voiceTestAudio=a;
        a.volume=Math.max(0,Math.min(1,t.volume??.9));a.playbackRate=sample.playbackRate||1;a.preservesPitch=true;
        clearTimeout(voiceTestTimer);voiceTestTimer=setTimeout(()=>finish('error',voiceBackend,'คลิปเสียงไม่ตอบสนอง'),15000);
        a.onplaying=()=>{if(active())window.__voiceTestStatus={status:'playing',backend:voiceBackend,voice:t.voice,clip:index+1,total:sample.clips.length,text:clip.text,version:sample.version};};
        a.onerror=()=>finish('error',voiceBackend,'เล่นไฟล์ตัวอย่างเสียงไม่ได้');
        a.onended=()=>{if(!active())return;clearTimeout(voiceTestTimer);if(index+1>=sample.clips.length){finish('ended',voiceBackend,preview ? 'เล่นตัวอย่าง Gemini · Kore เสร็จแล้ว ยังไม่ได้เปลี่ยนเสียงหลัก' : 'เล่นคำทักทายใหม่ของเปรมวดีเสร็จแล้ว');return;}voiceTestAudio=null;window.__voiceTestStatus={status:'pause',backend:voiceBackend,voice:t.voice,clip:index+1,total:sample.clips.length,pauseMs:clip.pauseAfter||450,version:sample.version};voiceTestTimer=setTimeout(()=>playPart(index+1),clip.pauseAfter||450);};
        a.play().catch(e=>{if(active())finish('error',voiceBackend,e.name==='NotAllowedError'?'กดฟังอีกครั้งเพื่ออนุญาตเล่นเสียง':'เล่นไฟล์ตัวอย่างเสียงไม่ได้');});
      };
      playPart(0);return;
    }
    const query = new URLSearchParams({text,voice:t.voice || 'th-TH-NiwatNeural',rate:t.rate || 1.05,pitch:t.pitch || 0,strict:voiceOverride ? '1' : '0'});
    const audio = new Audio(localSample ? '/audio-tests/premwadee.mp3?v=1' : '/api/tts?' + query);
    voiceTestAudio = audio;
    audio.volume = Math.max(0,Math.min(1,t.volume ?? 0.9));
    audio.onplaying = () => { if(active()) window.__voiceTestStatus = {status:'playing',backend:voiceBackend,voice:t.voice,text}; };
    audio.onended = () => finish('ended',voiceBackend,localSample ? 'เล่นตัวอย่างเปรมวดีจากไฟล์ในเครื่องเสร็จแล้ว' : 'เล่นเสียงทดสอบเสร็จแล้ว หากไม่ได้ยินให้ตรวจลำโพงและระดับเสียง Windows');
    audio.onerror = fallback;
    voiceTestTimer = setTimeout(fallback,18000);
    try { await audio.play(); }
    catch (error) {
      if (!active()) return;
      if (error.name === 'NotAllowedError') return finish('error','edge','กรุณากดปุ่มทดสอบอีกครั้งเพื่ออนุญาตเล่นเสียง');
      fallback();
    }
  };
  voiceTestButton.onclick = () => testLocalVoice();
  voiceTestButton.textContent = '🔊 ทดสอบเสียงบนเครื่องนี้';
  const voiceCompare = document.createElement('div');
  voiceCompare.className = 'row';
  voiceCompare.style.cssText = 'flex-wrap:wrap;margin-top:12px';
  voiceCompare.innerHTML = '<button type="button" class="btn ghost" id="testNiwat">🔊 ฟังนิวัฒน์ (ผู้ชาย)</button><button type="button" class="btn ghost" id="testPremwadee">🔊 ฟังเปรมวดี (ผู้หญิง)</button><small class="muted">เปรมวดี: คำทักทายใหม่ เว้นช่วงระหว่างประโยค • ไม่เปลี่ยนเสียงหลัก</small>';
  voiceTestButton.parentElement.insertAdjacentElement('afterend',voiceCompare);
  $('testNiwat').onclick = () => testLocalVoice('th-TH-NiwatNeural');
  $('testPremwadee').onclick = () => testLocalVoice('th-TH-PremwadeeNeural');
  const particles = document.createElement('div');particles.className='row';particles.style.cssText='flex-wrap:wrap;margin-top:10px';
  particles.innerHTML='<button class="btn ghost" type="button" id="testKhaQuestion" disabled title="เปรมวดีออนไลน์ยังสร้างเสียงนี้ไม่ได้">คะ · เปรมวดีไม่พร้อม</button><button class="btn ghost" type="button" id="testKhaStatement" disabled title="เปรมวดีออนไลน์ยังสร้างเสียงนี้ไม่ได้">ค่ะ · เปรมวดีไม่พร้อม</button><button class="btn ghost" type="button" id="testGeminiParticles">🔊 ฟัง คะ / ค่ะ · Gemini (Kore)</button><small class="muted" role="status" id="particleCaption">เปรมวดีฟังได้จากคลิปทักทายด้านบน · คลิปเปรียบเทียบนี้เป็นเสียง Kore ของ Gemini ไม่ใช่เปรมวดี และไม่เปลี่ยนเสียงหลัก</small>';
  voiceCompare.insertAdjacentElement('afterend',particles);
  $('testGeminiParticles').onclick=()=>testLocalVoice('Gemini-Kore','ได้ยินไหมคะ? ได้ยินค่ะ.',{voice:'Gemini-Kore',manifest:'/audio-tests/gemini-kore-particles.json?v=1'});


  const localBackupPanel = document.createElement('section');
  localBackupPanel.className = 'card';
  localBackupPanel.style.marginTop = '18px';
  localBackupPanel.innerHTML = '<h2>สำรองข้อมูลในเครื่อง</h2><p class="muted">ตั้งค่า คะแนน เลเวล และสรุปไลฟ์ล่าสุด 100 รายการ · ไม่รวมไฟล์เพลง โมเดล และ API Key</p><div class="row"><a class="btn ghost" href="/api/local-backup" download>ดาวน์โหลดไฟล์สำรอง</a><label class="btn ghost">เลือกไฟล์เพื่อกู้คืน<input type="file" id="localRestoreFile" accept=".json" hidden></label></div><p id="localBackupStatus" role="status"></p>';
  $('p-home').appendChild(localBackupPanel);
  $('localRestoreFile').onchange = async e => {
    const file=e.target.files[0];if(!file)return;
    try{if(file.size>6000000)throw Error('ไฟล์ใหญ่เกิน 6 MB');const backup=JSON.parse(await file.text());if(!confirm('เตรียมกู้คืนจากไฟล์นี้? ต้องปิดและเปิดโปรแกรมใหม่เพื่อใช้ข้อมูล'))return;const r=await post('/api/local-backup/restore',backup);if(!r.ok)throw Error(r.error||'กู้คืนไม่ได้');$('localBackupStatus').textContent=r.message;}catch(error){$('localBackupStatus').textContent=error.message;}finally{e.target.value='';}
  };
  $('preIdentify').onclick = () => socket.emit('pre:identify');

  // ---------------------------------------------------------------- พรีวิว & ทดสอบ
  const FAKE = ['น้องเมย์ 🌸', 'พี่ต้น', 'ปลาทู', 'ก้อย_99', 'มะม่วง', 'ฟ้าใส', 'แพรวา', 'โอ๊ตโอ๊ต', 'จูน', 'ตังเม', 'ใบเตย', 'กาแฟเย็น'];
  const pvName = () => $('pvName').value.trim() || pick(FAKE);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  function test(kind, extra = {}) {
    const name = extra.name || pvName();
    if (kind === 'chat') socket.emit('test:chat', { name, text: extra.text });
    else if (kind === 'laugh') socket.emit('test:chat', { name, text: '555555 ฮาาา' });
    else if (kind === 'gift') socket.emit('test:gift', { name, gift: extra.gift, count: 1 });
    else socket.emit('test:' + kind, { name });
  }
  function renderGifts() {
    if (!config) return;
    const th = config.themes[config.theme];
    const gifts = th?.t?.gifts || [];
    const box = $('pvGifts');
    if (box.dataset.theme === config.theme && box.children.length) return;
    box.dataset.theme = config.theme;
    box.innerHTML = '';
    for (const g of gifts) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'giftbtn';
      const ef = th.meta.effects?.[g.effect];
      b.innerHTML = '<span></span><small></small>';
      b.firstChild.textContent = `${ef?.icon || '🎁'} ${g.name}`;
      b.lastChild.textContent = `${nf(g.diamonds)} 💎`;
      b.onclick = () => test('gift', { gift: g.name });
      box.appendChild(b);
    }
  }
  $('pvSend').onclick = () => {
    const text = $('pvMsg').value.trim();
    if (text) test('chat', { text });
  };
  $('pvMsg').addEventListener('keydown', (e) => e.key === 'Enter' && $('pvSend').click());
  $('pvQuick').addEventListener('click', (e) => {
    const b = e.target.closest('[data-t]');
    if (b) test(b.dataset.t);
  });
  $('pvCrowd').onclick = () => socket.emit('test:crowd');
  $('pvGame').onclick = () => socket.emit('game:autoNow', null, (r) => (r?.ok ? toast('อีก 5 วินาทีเกมเริ่ม') : toast(r?.error || 'เริ่มเกมไม่ได้', true)));
  $('pvClear').onclick = () => {
    socket.emit('admin:clearAudience');
    socket.emit('admin:clearTop');
    socket.emit('admin:resetHype');
    toast('ล้างฉากแล้ว');
  };
  $('pvReload').onclick = () => ($('pvFrame').src = 'stage.html?silent&desktop&r=' + Date.now());
  $('pvPop').onclick = () => openPreviewWindow();
  // โหมดเดโม: สุ่มคอมเมนต์ ไลก์ ของขวัญเรื่อย ๆ
  let demo = null;
  $('pvDemo').onclick = () => {
    if (demo) {
      clearInterval(demo);
      demo = null;
      $('pvDemo').textContent = '▶ โหมดเดโมอัตโนมัติ';
      return;
    }
    $('pvDemo').textContent = '■ หยุดเดโม';
    demo = setInterval(() => {
      const name = pick(FAKE);
      const r = Math.random();
      const gifts = config?.themes[config.theme]?.t?.gifts || [];
      if (r < 0.45) test('chat', { name });
      else if (r < 0.75) test('like', { name });
      else if (r < 0.9 && gifts.length) test('gift', { name, gift: pick(gifts.slice(0, 5)).name });
      else test('join', { name });
    }, 1400);
  };
  // แบบ B: หน้าต่างพรีวิวแยก (ในโปรแกรม = หน้าต่างลอยบนสุด, ในเบราว์เซอร์ = หน้าต่างป๊อปอัป)
  function openPreviewWindow() {
    if (desk?.openPreview) return desk.openPreview();
    window.open('preview.html', 'livestage-preview', 'width=380,height=780');
  }
  $('openPreview').onclick = openPreviewWindow;
  // ห้องควบคุมไลฟ์ (ในโปรแกรม = หน้าต่างลอย เด้งเองตอนเริ่มไลฟ์, ในเบราว์เซอร์ = หน้าต่างป๊อปอัป)
  $('openControl').onclick = () => {
    if (acct?.plan === 'member') return openControlLock();
    if (status.status !== 'connected') return toast('เชื่อมต่อไลฟ์ก่อน ถึงจะเปิดห้องควบคุมได้', true);
    if (desk?.openControl) return desk.openControl();
    window.open('control.html', 'livestage-control', 'width=1040,height=690');
  };

  // ---------------------------------------------------------------- ธีม
  // ธีมที่สร้างเองใช้ภาพตัวอย่างของธีมต้นแบบ
  const previewSrc = (id) => `theme-previews/${config?.themes?.[id]?.meta?.previewOf || id}.jpg`;
  const KIND = { concert: 'ดนตรี', shrine: 'สายมู', krathong: 'เทศกาล', fishing: 'ชิล', songkran: 'เทศกาล', cny: 'เทศกาล', ghost: 'สยองขวัญ', newyear: 'เทศกาล', custom: 'สร้างเอง', temple: 'งานวัด', floating: 'ตลาด', nightmarket: 'ตลาด', muay: 'กีฬา', beach: 'ปาร์ตี้', farm: 'ชิล', cafe: 'ชิล', school: 'กีฬา', cat: 'สัตว์เลี้ยง', shiba: 'สัตว์เลี้ยง', bunny: 'สัตว์เลี้ยง', hamster: 'สัตว์เลี้ยง', penguin: 'สัตว์เลี้ยง', panda: 'สัตว์เลี้ยง', capybara: 'สัตว์เลี้ยง', hippo: 'สัตว์เลี้ยง', elephant: 'สัตว์เลี้ยง', duckling: 'สัตว์เลี้ยง', ramwong: 'เวทีเต้น', pageant: 'เวทีเต้น', molam: 'เวทีเต้น', disco: 'เวทีเต้น', sea: 'สวนสัตว์', dino: 'สวนสัตว์', safari: 'สวนสัตว์', rainforest: 'สวนสัตว์', nightzoo: 'สวนสัตว์', mookata: 'ร้านอาหาร 3D', adventure: 'เกมพิกเซล', boatrace: 'มินิเกม', angler: 'มินิเกม', village: 'มินิเกม', pixelquiz: 'มินิเกม', kitchen: 'มินิเกม', castle: 'มินิเกม', climbcity: 'มินิเกม', climbsky: 'มินิเกม', escape: 'มินิเกม', brawl: 'มินิเกม', pet3d: 'มินิเกม', wessuwan: 'สายมู', naga: 'สายมู', ganesha: 'สายมู', trimurti: 'สายมู', caishen: 'สายมู', ubosot: 'สายบุญ', church: 'สายบุญ', mosque: 'สายบุญ', valentine: 'เทศกาล', rocket: 'เทศกาล', mother: 'เทศกาล', moon: 'เทศกาล', cemetery: 'สยองขวัญ', ghostgate: 'สยองขวัญ', rodhae: 'เวทีเต้น', djclub: 'ดนตรี', molamstage: 'เวทีเต้น' };
  // '1.4.0' → 10400 (ไว้เทียบเวอร์ชัน) • ไม่มี = 0 (ธีมชุดแรก)
  const verNum = (v) => String(v || '0').split('.').reduce((n, x, i) => n + (Number(x) || 0) * [10000, 100, 1][i], 0);
  function allowed(id) {
    if (acct?.mode === 'local') return acct.localThemes.includes(id);
    if (lockBlocked(id)) return false;
    return acct.themes === null || acct.themes === undefined || acct.themes.includes(id);
  }
  // ธีมที่ซ่อน: สร้างธีมเอง (ปิดเมนู) • ธีมที่ผูกสวิตช์หลังบ้าน (meta.feature เช่น ธีมเกม) ที่ยังไม่เปิด
  function themeVisible(id) {
    return (id !== 'custom' || config.features?.custom !== false) && (!config.themes[id]?.meta?.feature || config.features?.[config.themes[id].meta.feature] === true);
  }
  // ---------------------------------------------------------------- กรอบโปรโมต + ธีมล็อก (ตั้งจากหลังบ้าน tubhool.com)
  // ธีมล็อก = เฉพาะผู้สนับสนุน • ก่อนครบเวลาผู้สนับสนุนซื้อใช้ก่อนได้ (จ่ายบนเว็บ) • สมาชิกฟรีใช้ไม่ได้
  const PROMO_LABEL = { epic: '✨ เอฟเฟกต์อลังการ', game: '🎮 เล่นเกมในไลฟ์', hot: '🔥 ขายดี', premium: '💎 พรีเมียม', fest: '🏮 ช่วงเทศกาล', pick: '👍 แนะนำ' };
  const PROMO_CLASSES = ['promo', 'early', ...Object.keys(PROMO_LABEL).map((k) => 'p-' + k)];
  const lockBlocked = (id) => ['sup', 'early'].includes(acct?.locks?.[id]?.state);
  // เม้นปลดล็อก (หลังบ้านเปิดแคมเปญ): สมาชิกฟรีเม้นรหัสใต้โพสต์เพจ TubHool → ใช้ธีมนั้นฟรีชั่วคราว
  const commentOf = (id) => acct?.comment?.[id] || null;
  function promoOf(id) {
    const p = acct?.promos?.[id];
    return p && (!p.until || Date.parse(p.until) > Date.now()) ? p : null;
  }
  const lockLeft = (lk) => Date.parse(lk.until) - (Date.now() + (acct?.skew || 0));
  const lockDay = (iso) => new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
  function cdText(ms) {
    const s = Math.max(0, Math.floor(ms / 1000)), d = Math.floor(s / 86400), p2 = (n) => String(n).padStart(2, '0');
    return (d ? d + ' วัน ' : '') + p2(Math.floor(s / 3600) % 24) + ':' + p2(Math.floor(s / 60) % 60) + ':' + p2(s % 60);
  }
  const cheapestTier = () => (acct?.user?.tiers || []).reduce((m, t) => (!m || t.amount < m ? t.amount : m), 0);
  function decorateCard(b, id) {
    const p = promoOf(id), lk = acct?.locks?.[id];
    const st = p?.style && PROMO_LABEL[p.style] ? p.style : '';
    const ls = lk && lk.state !== 'open' ? lk.state : '';
    const cm = !ls && commentOf(id);
    const sig = JSON.stringify([st, p?.label, p?.line, p?.until, ls, lk?.until, lk?.price, cm && [cm.state, cm.active, cm.until, cm.hours]]);
    if (b.dataset.deco === sig) return; // เหมือนเดิม → ไม่วาดใหม่ (ภาพเคลื่อนไหวจะได้ไม่สะดุด)
    b.dataset.deco = sig;
    b.classList.remove(...PROMO_CLASSES);
    b.querySelectorAll('.ring, .ribbon, .pline, .sp, .lockband, .owned').forEach((x) => x.remove());
    const shot = b.querySelector('.shot');
    if (st) {
      b.classList.add('promo', 'p-' + st);
      const days = st === 'fest' && p.until ? Math.max(1, Math.ceil((Date.parse(p.until) - Date.now()) / 864e5)) : 0;
      b.insertAdjacentHTML('afterbegin', `<span class="ring"><i></i></span><span class="ribbon">${esc(p.label || PROMO_LABEL[st])}${days ? `<span class="cd">เหลือ ${days} วัน</span>` : ''}</span>`);
      if (['epic', 'premium', 'fest'].includes(st)) shot.insertAdjacentHTML('beforeend', '<i class="sp"></i><i class="sp"></i><i class="sp"></i>');
      if (p.line) shot.insertAdjacentHTML('beforeend', `<span class="pline">${esc(p.line)}</span>`);
    }
    if (cm) {
      if (cm.active) {
        const left = Date.parse(cm.until) - (Date.now() + (acct?.skew || 0));
        return void shot.insertAdjacentHTML('beforeend', `<span class="owned cmt">✓ เม้นปลดล็อกแล้ว • เหลือ <span class="cdn" data-until="${esc(cm.until)}">${cdText(left)}</span></span>`);
      }
      b.classList.add('early');
      const tier = cheapestTier();
      return void shot.insertAdjacentHTML('beforeend', cm.state === 'revoked' ? `<span class="lockband sup"><span class="lk">เม้นถูกลบ — สิทธิ์ทดลองจบแล้ว</span><span class="buy">สมัครผู้สนับสนุน${tier ? ` ฿${nf(tier)}` : ''}</span></span>`
        : cm.state === 'used' ? `<span class="lockband sup"><span class="lk">ใช้สิทธิ์เม้นของโพสต์นี้แล้ว</span><span class="buy">สมัครผู้สนับสนุน${tier ? ` ฿${nf(tier)}` : ''}</span></span>`
        : `<span class="lockband cmt"><span class="lk">💬 เม้นใต้โพสต์เพจ TubHool</span><span class="buy">🔓 ใช้ฟรี ${nf(cm.hours)} ชม.</span></span>`);
    }
    if (!ls) return;
    if (ls !== 'owned') b.classList.add('early');
    const cd = lockLeft(lk) > 0 ? `<span class="cdn" data-until="${esc(lk.until)}">${cdText(lockLeft(lk))}</span>` : '';
    const tier = cheapestTier();
    shot.insertAdjacentHTML('beforeend', ls === 'owned' ? '<span class="owned">✓ ซื้อแล้ว — ใช้ได้ก่อนใคร</span>'
      : ls === 'early' ? `<span class="lockband"><span class="lk">🔒 เปิดฟรี ${lockDay(lk.until)} • อีก</span>${cd}<span class="buy">⚡ ใช้ก่อนเลย ฿${nf(lk.price)}</span></span>`
      : `<span class="lockband sup"><span class="lk">👑 ธีมเฉพาะผู้สนับสนุน</span><span class="buy">สมัครผู้สนับสนุน${tier ? ` ฿${nf(tier)}` : ''}</span></span>`);
  }
  // การ์ดธีมเด่น (กว้างเต็มแถวบนสุด)
  function renderHero() {
    const el = $('themeHero');
    const id = Object.keys(acct?.promos || {}).find((t) => promoOf(t)?.hero && config.themes[t] && themeVisible(t));
    const lk = id && acct.locks?.[id];
    const sig = id ? JSON.stringify([id, promoOf(id), lk?.state, config.theme === id, clips.has(id)]) : '';
    if (el.dataset.sig === sig) return;
    el.dataset.sig = sig;
    el.hidden = !id;
    if (!id) return void (el.innerHTML = '');
    const p = promoOf(id), m = config.themes[id].meta, st = PROMO_LABEL[p.style] ? p.style : 'epic';
    const cta = lk?.state === 'sup' ? '👑 สมัครผู้สนับสนุน' : lk?.state === 'early' ? `⚡ ใช้ก่อน ฿${nf(lk.price)}` : config.theme === id ? '✓ ใช้อยู่' : 'ใช้ธีมนี้';
    const bullets = (p.bullets?.length ? p.bullets : [p.line]).filter(Boolean);
    el.innerHTML = `<div class="tcard promo promo-hero inview p-${st}" role="button" tabindex="0"><span class="ring"><i></i></span><span class="ribbon">⭐ ธีมเด่น</span>
      <div class="shot"><img alt="" src="${previewSrc(id)}"><i class="sp"></i><i class="sp"></i><i class="sp"></i>${clips.has(id) ? '<span class="clipbtn" role="button" tabindex="0">ดูตัวอย่าง</span>' : ''}</div>
      <div class="hero-body"><div class="hero-kick">${esc(p.label || PROMO_LABEL[st])}</div><div class="hero-title"></div>
      <ul>${bullets.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><div class="hero-cta"><span>${cta}</span></div></div></div>`;
    el.querySelector('.hero-title').textContent = `${m.icon} ${m.name}`;
    el.querySelector('img').alt = 'ตัวอย่างธีม ' + m.name;
    const card = el.firstElementChild;
    if (clips.has(id)) clipBtn(card.querySelector('.clipbtn'), id, m.name);
    card.onclick = () => pickTheme(id);
    card.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        pickTheme(id);
      }
    };
  }
  // นับถอยหลังบนการ์ด (แก้เฉพาะตัวเลข) • ครบเวลา → ดึงสิทธิ์ใหม่
  let lockTimer = 0;
  function tickLocks() {
    clearInterval(lockTimer);
    if (!document.querySelector('.cdn[data-until]')) return;
    lockTimer = setInterval(() => {
      let done = false;
      for (const el of document.querySelectorAll('.cdn[data-until]')) {
        const ms = Date.parse(el.dataset.until) - (Date.now() + (acct?.skew || 0));
        if (ms <= 0) done = true;
        else el.textContent = cdText(ms);
      }
      if (done) {
        clearInterval(lockTimer);
        loadAccount();
      }
    }, 1000);
  }
  // ห้องควบคุมไลฟ์ล็อก (สมาชิกฟรี): ใช้หน้าต่างเดียวกับธีมล็อก ชวนสมัครผู้สนับสนุน
  function openControlLock() {
    const tier = cheapestTier();
    $('lockBody').innerHTML = `<img alt="" src="whatsnew/170-control.jpg"><div><small>👑 ฟังก์ชันเฉพาะผู้สนับสนุน</small><h3>🎛️ ห้องควบคุมไลฟ์</h3>
      <p>ถ้าคุณชอบห้องควบคุมไลฟ์ — ดูหน้าเวทีกับคอมเมนต์ในหน้าเดียว กดเอฟเฟกต์ เปลี่ยนเพลง เปิด/ปิดเสียงพูด ตั้งรอเริ่ม/พักเบรก และตั้งค่าซูมหาคนส่งของขวัญ ระหว่างไลฟ์ได้ทันที
      สมัครผู้สนับสนุนเพื่อใช้ฟังก์ชันนี้ ห้องควบคุมจะเด้งขึ้นเองทุกครั้งที่เริ่มไลฟ์</p>
      <button class="opt main" type="button" autofocus data-act="unlock"><b>👑 สมัครผู้สนับสนุน${tier ? ` ฿${nf(tier)}` : ''}</b><span>ได้ห้องควบคุมไลฟ์ + ใช้ได้ทุกธีม</span></button>
      <button class="link" type="button" data-close>ไว้ก่อน</button></div>`;
    $('lockDlg').dataset.id = '';
    $('lockDlg').dataset.mode = '';
    if (!$('lockDlg').open) $('lockDlg').showModal();
  }
  // หน้าต่างธีมล็อก: สมาชิกฟรี → ชวนสมัครผู้สนับสนุน • ผู้สนับสนุน → ซื้อใช้ก่อน (จ่ายบนเว็บ แล้วกลับมาตรวจสถานะ)
  let lockWait = '';
  function openLock(id, waiting = false) {
    const lk = acct.locks[id], m = config.themes[id].meta, day = lockDay(lk.until), soon = lockLeft(lk) > 0;
    lockWait = waiting ? id : '';
    const title = `<h3>${esc(m.icon + ' ' + m.name)}</h3>`;
    let body;
    if (lk.state === 'sup')
      body = `<small>👑 ธีมเฉพาะผู้สนับสนุน</small>${title}<p>ธีมนี้สมาชิกฟรีเลือกใช้ไม่ได้ สมัครผู้สนับสนุนเพื่อใช้ธีมนี้และทุกธีม${soon ? ` — ผู้สนับสนุนใช้ได้ฟรีตั้งแต่ ${day} หรือซื้อใช้ก่อน ฿${nf(lk.price)}` : ''}</p>
        <button class="opt main" type="button" autofocus data-act="unlock"><b>👑 สมัครผู้สนับสนุน</b><span>ใช้ได้ทุกธีม รวมธีมเฉพาะผู้สนับสนุน</span></button>
        <button class="link" type="button" data-close>ไว้ก่อน</button>`;
    else if (!waiting)
      body = `<small>ธีมใหม่ ผู้สนับสนุนใช้ฟรี ${day}</small>${title}<p>ไม่อยากรอ? ซื้อแล้วใช้ได้ทันที ไม่ต้องรอถึง ${day} — จ่ายผ่านพร้อมเพย์บนเว็บ tubhool.com</p>
        <button class="opt main" type="button" autofocus data-act="buy"><b>⚡ ใช้ก่อนเลย ฿${nf(lk.price)}</b><span>เปิดหน้าชำระเงินในเบราว์เซอร์</span></button>
        <button class="link" type="button" data-close>ไว้ก่อน รอใช้ฟรี ${day}</button>`;
    else
      body = `<small>รอชำระเงิน</small>${title}<p>จ่ายเงินในหน้าเว็บที่เปิดขึ้นมา เสร็จแล้วกดปุ่มด้านล่าง ธีมจะปลดล็อกทันที</p>
        <button class="opt main" type="button" autofocus data-act="check"><b>✓ ซื้อเสร็จแล้ว ตรวจสถานะ</b><span>ดึงสิทธิ์ล่าสุดจาก tubhool.com</span></button>
        <button class="link" type="button" data-act="buy">เปิดหน้าชำระเงินอีกครั้ง</button>`;
    $('lockBody').innerHTML = `<img alt="" src="${previewSrc(id)}"><div>${body}</div>`;
    $('lockDlg').dataset.id = id;
    if (!$('lockDlg').open) $('lockDlg').showModal();
  }
  async function checkBought(id, quiet = false) {
    try {
      acct = await post('/api/account/refresh');
    } catch {
      return quiet || toast('เชื่อมต่อไม่ได้ ลองใหม่อีกครั้ง', true);
    }
    render();
    const st = acct.locks?.[id]?.state;
    if (st === 'owned' || st === 'open') {
      lockWait = '';
      $('lockDlg').close();
      toast(`ปลดล็อกธีม “${config.themes[id].meta.name}” แล้ว`);
      pickTheme(id);
    } else if (!quiet) toast(acct.error || 'ยังไม่พบการซื้อ — ถ้าเพิ่งจ่าย รอสักครู่แล้วกดอีกครั้ง', true);
  }
  // ---------------------------------------------------------------- เม้นปลดล็อก: รับรหัส → เม้นใต้โพสต์ → โปรแกรมตรวจให้เองทุก 20 วิ
  let cmtPoll = 0;
  let cmtBusy = false;
  // ข้อความเม้นสำเร็จรูป = คำชม + ความตั้งใจ + อีโมจิ + รหัส (15 × 14 × 9 ≈ 1,900 แบบ — เม้นไม่ซ้ำกันจน Facebook มองว่าสแปม)
  // ห้ามมีตัวอักษรอังกฤษ "ls" ติดกันในประโยค (ระบบหารหัสจาก LS + 5 ตัว)
  const CMT_A = ['ธีม{t}สวยมาก', 'ธีมสวยน่าลอง', 'ฉากสวยจริง', '{t}มาแล้ว', 'เห็นแล้วอยากลองเลย', 'ธีมนี้ดีย์มาก', 'สวยเกินต้าน', 'ธีมใหม่ปังมาก',
    'ชอบธีม{t}มาก', 'ดูแล้วมันส์แน่นอน', 'น่ารักมากธีมนี้', 'ฉากอลังมาก', 'ธีมนี้ต้องลอง', 'รอธีมนี้มานาน', 'ว้าว ธีม{t}'];
  const CMT_B = ['คืนนี้ต้องจัด', 'พลาดไม่ได้แล้ว', 'ไลฟ์คืนนี้ใช้เลย', 'ขอลองหน่อยนะ', 'ขอไปลองก่อนเลย', 'เอาไปไลฟ์แน่นอน', 'คนดูต้องชอบแน่',
    'ไลฟ์รอบหน้าจัดเลย', 'ขอบคุณ TubHool นะ', 'ลองแล้วจะมาบอก', 'อยากใช้มาก', 'รีบลองก่อนหมดเวลา', 'ไลฟ์นี้ต้องปัง', 'ใช้คู่กับไลฟ์คืนนี้เลย'];
  const CMT_E = ['🔥', '✨', '💜', '🎉', '🙏', '😍', '💯', '🎶', ''];
  const cmtPhrase = {}; // ธีม → { code, text } (ข้อความเดิมไม่เปลี่ยนตอนหน้าต่างวาดใหม่ทุก 20 วิ)
  const rnd = (a) => a[Math.floor(Math.random() * a.length)];
  function cmtText(id, cm, reroll = false) {
    const cur = cmtPhrase[id];
    if (!reroll && cur?.code === cm.code) return cur.text;
    let text;
    do {
      const name = config.themes[id].meta.name;
      text = [rnd(CMT_A).replace('{t}', name), rnd(CMT_B), rnd(CMT_E)].filter(Boolean).join(' ');
    } while (reroll && cur && text === cur.text);
    cmtPhrase[id] = { code: cm.code, text };
    return text;
  }
  function openComment(id, msg = '') {
    const cm = commentOf(id), m = config.themes[id].meta, tier = cheapestTier();
    if (!cm) return;
    const title = `<h3>${esc(m.icon + ' ' + m.name)}</h3>`;
    const sup = `<button class="link" type="button" data-act="unlock">หรือสมัครผู้สนับสนุน${tier ? ` ฿${nf(tier)}` : ''} ใช้ได้ทุกธีมไม่ต้องเม้น</button>`;
    let body;
    if (cm.state === 'pending' && cm.code) {
      const left = Math.max(0, Math.ceil((Date.parse(cm.code_expires) - Date.now()) / 60000));
      body = `<small>💬 เม้นปลดล็อก • ใช้ฟรี ${nf(cm.hours)} ชม.</small>${title}
        <ol class="cmt-steps"><li>กด <b>คัดลอกข้อความ</b> (มีรหัสของคุณต่อท้ายให้แล้ว)</li><li>เปิดโพสต์ แล้ว<b>วาง</b> (Ctrl+V) ในช่องเม้น กดส่ง</li><li>รอสักครู่ โปรแกรมตรวจให้เอง</li></ol>
        <div class="cmt-msg"><p>${esc(cmtText(id, cm))} <b>${esc(cm.code)}</b></p>
          <div class="cmt-msg-btns"><button class="btn" type="button" data-act="cmt-copy">📋 คัดลอกข้อความ</button><button class="btn ghost" type="button" data-act="cmt-reroll" title="สุ่มข้อความใหม่ (รหัสเดิม)">🎲 สุ่มใหม่</button></div></div>
        <p class="cmt-note">แก้ข้อความได้ แต่อย่าลบรหัส <b>${esc(cm.code)}</b> (<button class="link" type="button" data-act="cmt-copy-code">คัดลอกแค่รหัส</button>) • รหัสใช้ได้อีก ${left} นาที • 1 บัญชีใช้สิทธิ์ได้ 1 ครั้งต่อโพสต์ • ลบเม้นระหว่างใช้ = สิทธิ์จบทันที</p>
        ${cm.note === 'fb_used' ? '<p class="cmt-warn">⚠️ เฟซบุ๊กบัญชีที่เม้นใช้สิทธิ์ของโพสต์นี้ไปแล้ว — ต้องเม้นจากเฟซอีกบัญชี</p>' : ''}
        ${msg ? `<p class="cmt-warn">${esc(msg)}</p>` : ''}
        <button class="opt main" type="button" data-act="cmt-open"><b>📘 เปิดโพสต์ใน Facebook</b><span>เม้นรหัสใต้โพสต์ของเพจ TubHool</span></button>
        <button class="opt" type="button" data-act="cmt-check"><b>✓ เม้นแล้ว ตรวจเลย</b><span class="cmt-wait">กำลังรอเม้น… ตรวจให้เองทุก 20 วินาที</span></button>
        ${sup}`;
    } else if (cm.state === 'used' || cm.state === 'revoked') {
      body = `<small>💬 เม้นปลดล็อก</small>${title}<p>${cm.state === 'revoked' ? 'เม้นใต้โพสต์ถูกลบ สิทธิ์ทดลองธีมนี้จึงสิ้นสุดแล้ว' : 'บัญชีนี้ใช้สิทธิ์เม้นปลดล็อกของโพสต์นี้ไปแล้ว'} — รอแคมเปญโพสต์ถัดไปของเพจ หรือสมัครผู้สนับสนุนเพื่อใช้ได้ทุกธีม</p>
        <button class="opt main" type="button" autofocus data-act="unlock"><b>👑 สมัครผู้สนับสนุน</b><span>ใช้ได้ทุกธีม ไม่ต้องรอแคมเปญ</span></button>
        <button class="link" type="button" data-close>ไว้ก่อน</button>`;
    } else {
      body = `<small>💬 เม้นปลดล็อก • ใช้ฟรี ${nf(cm.hours)} ชม.</small>${title}
        <p>สมาชิกฟรีใช้ธีมนี้ได้ ${nf(cm.hours)} ชั่วโมง แค่เม้นรหัสใต้โพสต์ของเพจ TubHool${cm.ends ? ` (เปิดให้เม้นถึง ${lockDay(cm.ends)})` : ''} — ไม่ต้องแชร์ ไม่ต้องแท็กเพื่อน</p>
        ${msg ? `<p class="cmt-warn">${esc(msg)}</p>` : ''}
        <button class="opt main" type="button" autofocus data-act="cmt-code"><b>🔓 รับรหัสเม้น</b><span>ได้รหัสของบัญชีคุณ ใช้ได้ 30 นาที</span></button>
        ${sup}`;
    }
    $('lockBody').innerHTML = `<img alt="" src="${previewSrc(id)}"><div>${body}</div>`;
    $('lockDlg').dataset.id = id;
    $('lockDlg').dataset.mode = 'cmt';
    if (!$('lockDlg').open) $('lockDlg').showModal();
    clearInterval(cmtPoll);
    if (cm.state === 'pending') cmtPoll = setInterval(() => cmtCheck(id, false), 20000);
  }
  async function cmtCall(url, id, now) {
    if (cmtBusy) return null;
    cmtBusy = true;
    try {
      const r = await post(url, { theme: id, now });
      if (r.account) acct = r.account;
      render();
      return r;
    } catch {
      return { ok: false, error: 'เชื่อมต่อไม่ได้ ลองใหม่อีกครั้ง' };
    } finally {
      cmtBusy = false;
    }
  }
  async function cmtCheck(id, now) {
    if (!$('lockDlg').open || $('lockDlg').dataset.id !== id) return clearInterval(cmtPoll);
    const r = await cmtCall('/api/account/comment-check', id, now);
    if (!r) return;
    if (commentOf(id)?.active) {
      clearInterval(cmtPoll);
      $('lockDlg').close();
      toast(`ปลดล็อกธีม “${config.themes[id].meta.name}” แล้ว — ใช้ได้ ${nf(commentOf(id).hours)} ชั่วโมง`);
      return pickTheme(id);
    }
    const cm = commentOf(id);
    if (cm?.state !== 'pending') return openComment(id, r.ok ? '' : r.error);
    if (now) openComment(id, r.ok ? 'ยังไม่เจอรหัสในเม้น — ถ้าเพิ่งเม้น รอสักครู่ ระบบตรวจให้เองทุก 20 วินาที' : r.error);
  }
  $('lockDlg').addEventListener('close', () => {
    clearInterval(cmtPoll);
    delete $('lockDlg').dataset.mode;
  });
  // กลับมาจาก Facebook → ตรวจให้ทันที
  addEventListener('focus', () => $('lockDlg').open && $('lockDlg').dataset.mode === 'cmt' && commentOf($('lockDlg').dataset.id)?.state === 'pending' && cmtCheck($('lockDlg').dataset.id, true));

  $('lockDlg').addEventListener('click', async (e) => {
    const dlg = $('lockDlg'), id = dlg.dataset.id;
    if (e.target === dlg || e.target.closest('[data-close]')) return dlg.close();
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'cmt-code') {
      const r = await cmtCall('/api/account/comment-code', id);
      if (r) openComment(id, r.ok ? '' : r.error);
      return;
    }
    if (act === 'cmt-copy' || act === 'cmt-copy-code') {
      const cm = commentOf(id);
      if (!cm?.code) return;
      const full = act === 'cmt-copy';
      try {
        const text = full ? `${cmtText(id, cm)} ${cm.code}` : cm.code;
        await navigator.clipboard.writeText(text).catch(() => {
          // หน้าต่างไม่ได้โฟกัส (เช่นกดจากหน้าต่างอื่น) → ใช้วิธีเก่า
          const ta = Object.assign(document.createElement('textarea'), { value: text });
          $('lockDlg').append(ta);
          ta.select();
          const ok = document.execCommand('copy');
          ta.remove();
          if (!ok) throw new Error('copy');
        });
        toast(full ? 'คัดลอกข้อความแล้ว — เปิดโพสต์แล้ววางในช่องเม้นได้เลย' : `คัดลอก ${cm.code} แล้ว`);
      } catch {
        toast('คัดลอกไม่ได้ — พิมพ์รหัสเองได้เลย', true);
      }
      return;
    }
    if (act === 'cmt-reroll') {
      const cm = commentOf(id);
      if (cm?.code) cmtText(id, cm, true);
      return openComment(id);
    }
    if (act === 'cmt-open') return void (commentOf(id)?.post_url && openExt(commentOf(id).post_url));
    if (act === 'cmt-check') return void cmtCheck(id, true);
    if (act === 'unlock') {
      dlg.close();
      go('unlock');
    } else if (act === 'buy') {
      openExt(acct.locks[id].buy_url);
      openLock(id, true);
    } else if (act === 'check') checkBought(id);
  });
  $('lockDlg').addEventListener('close', () => (lockWait = ''));
  // กลับมาที่โปรแกรมหลังจ่ายเงิน → ตรวจให้เองเงียบ ๆ
  addEventListener('focus', () => lockWait && $('lockDlg').open && checkBought(lockWait, true));

  // ---------------------------------------------------------------- คลิปตัวอย่างธีม 10 วิ (ปุ่ม ▶ บนการ์ด → หน้าต่างดูพร้อมเสียง ไม่เปลี่ยนเวที)
  // รายการคลิปมาจาก tubhool.com (ผ่านเซิร์ฟเวอร์ในเครื่อง ซึ่งเก็บคลิปที่เคยดูไว้ให้) • ธีมที่ไม่มีคลิป = ไม่มีปุ่ม
  let clips = new Set();
  let clipMuted = null; // null = ยังไม่เคยกด (ตอนไลฟ์เริ่มแบบปิดเสียง)
  let clipCur = '';
  let clipRaf = 0;
  async function loadClips() {
    try {
      const r = await fetch('/api/theme-clips', { cache: 'no-store' });
      const list = r.ok ? await r.json() : [];
      const next = new Set(Array.isArray(list) ? list : []);
      if ([...next].join() === [...clips].join()) return;
      clips = next;
      if (config && acct) renderThemes();
    } catch {}
  }
  function clipBtn(el, id, name) {
    el.setAttribute('aria-label', 'ดูคลิปตัวอย่างธีม ' + name);
    const open = (e) => {
      e.stopPropagation();
      e.preventDefault();
      openClip(id);
    };
    el.onclick = open;
    el.onkeydown = (e) => (e.key === 'Enter' || e.key === ' ') && open(e);
  }
  // ลำดับเดียวกับการ์ดในหน้า (เฉพาะธีมที่มีคลิป)
  const clipOrder = () => [...$('themeGrid').children].map((b) => b.dataset.id).filter((id) => clips.has(id));
  // ปุ่มล่างตามสิทธิ์ของธีมนั้น → [ข้อความ, คำอธิบาย, ใช้อยู่แล้ว]
  function clipCta(id) {
    const lk = acct?.locks?.[id], cm = commentOf(id), ok = allowed(id), u = acct?.user;
    if (lk?.state === 'sup') return ['👑 สมัครผู้สนับสนุน', 'ธีมนี้เฉพาะผู้สนับสนุน • ใช้ได้ทุกธีม'];
    if (lk?.state === 'early') return [`⚡ ใช้ก่อนเลย ฿${nf(lk.price)}`, `หรือรอ — ผู้สนับสนุนใช้ฟรี ${lockDay(lk.until)}`];
    if (cm && !cm.active) return [`💬 เม้นปลดล็อก ใช้ฟรี ${nf(cm.hours)} ชม.`, 'เม้นใต้โพสต์เพจ TubHool'];
    if (ok && id === config.theme) return ['✓ ใช้ธีมนี้อยู่', 'ปิดหน้าต่างนี้', true];
    if (ok) return ['ใช้ธีมนี้', status.status === 'connected' ? 'กำลังไลฟ์ — หน้าเวทีจะโหลดใหม่' : 'เปลี่ยนเวทีเป็นธีมนี้'];
    if (acct?.plan === 'member') return u?.free_theme && u.free_theme_next_change ? ['👑 ปลดลิมิตทุกธีม', 'วันนี้เปลี่ยนธีมฟรีไปแล้ว'] : ['⭐ ใช้เป็นธีมฟรีของฉัน', 'สมาชิกฟรีเปลี่ยนธีมได้วันละครั้ง'];
    return ['👑 ปลดล็อกทุกธีม', 'สมัครผู้สนับสนุน TubHool'];
  }
  function clipTick() {
    cancelAnimationFrame(clipRaf);
    const v = $('clipVid');
    const f = () => {
      $('clipBar').style.width = v.duration ? (v.currentTime / v.duration) * 100 + '%' : '0';
      if (!v.paused) clipRaf = requestAnimationFrame(f);
    };
    f();
  }
  function clipSetMute(m) {
    $('clipVid').muted = m;
    $('clipMute').textContent = m ? '🔇' : '🔊';
    $('clipMute').setAttribute('aria-label', m ? 'เปิดเสียง' : 'ปิดเสียง');
  }
  function openClip(id) {
    const m = config.themes[id]?.meta;
    if (!m) return;
    clipCur = id;
    const order = clipOrder(), i = order.indexOf(id), live = status.status === 'connected';
    $('clipKind').textContent = KIND[id] || 'ธีม';
    $('clipName').textContent = `${m.icon} ${m.name}`;
    $('clipDesc').textContent = m.desc || '';
    $('clipLive').hidden = !(live && clipMuted === null);
    const [t, sub, cur] = clipCta(id);
    $('clipCta').querySelector('b').textContent = t;
    $('clipCta').querySelector('span').textContent = sub;
    $('clipCta').classList.toggle('cur', !!cur);
    $('clipPos').textContent = order.length > 1 ? `${i + 1} / ${order.length}` : '';
    $('clipPrev').hidden = $('clipNext').hidden = order.length < 2;
    const v = $('clipVid');
    $('clipBox').style.backgroundImage = `url("${previewSrc(id)}")`;
    $('clipMsg').hidden = false;
    $('clipMsg').textContent = 'กำลังโหลดคลิป…';
    $('clipBig').hidden = true;
    $('clipBar').style.width = '0';
    clipSetMute(clipMuted ?? live);
    v.src = `/theme-clips/${encodeURIComponent(id)}.mp4`;
    v.play().catch(() => {});
    if (!$('clipDlg').open) $('clipDlg').showModal();
  }
  {
    const dlg = $('clipDlg'), v = $('clipVid');
    v.addEventListener('playing', () => {
      $('clipMsg').hidden = true;
      $('clipBig').hidden = true;
      clipTick();
    });
    v.addEventListener('pause', () => {
      if (dlg.open && v.getAttribute('src')) $('clipBig').hidden = false;
    });
    v.addEventListener('error', () => {
      if (!v.getAttribute('src')) return;
      $('clipMsg').hidden = false;
      $('clipMsg').textContent = 'โหลดคลิปไม่ได้ — เช็กอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง';
    });
    $('clipBox').onclick = (e) => {
      if (e.target.closest('.cl-mute') || !v.getAttribute('src')) return;
      v.paused ? v.play().catch(() => {}) : v.pause();
    };
    $('clipMute').onclick = () => {
      clipMuted = !v.muted;
      clipSetMute(clipMuted);
      $('clipLive').hidden = true;
    };
    const step = (d) => {
      const o = clipOrder(), i = o.indexOf(clipCur);
      if (o.length > 1) openClip(o[(i + d + o.length) % o.length]);
    };
    $('clipPrev').onclick = () => step(-1);
    $('clipNext').onclick = () => step(1);
    dlg.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
    });
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg || e.target.closest('[data-close]')) dlg.close();
    });
    $('clipCta').onclick = () => {
      const id = clipCur;
      dlg.close();
      if (!allowed(id) && !lockBlocked(id) && !(commentOf(id) && !commentOf(id).active) && acct?.plan !== 'member') return go('unlock');
      if (id !== config.theme || !allowed(id)) pickTheme(id);
    };
    dlg.addEventListener('close', () => {
      cancelAnimationFrame(clipRaf);
      v.pause();
      v.removeAttribute('src');
      v.load();
      clipCur = '';
    });
  }

  // การ์ดที่อยู่บนจอเท่านั้นที่ขยับ (กรอบโปรโมต 50 ใบขยับพร้อมกันทำให้เครื่องหน่วง)
  const cardIO = 'IntersectionObserver' in window ? new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('inview', e.isIntersecting)), { rootMargin: '150px 0px' }) : null;
  function renderThemes() {
    // หน้าเลือกธีมซ่อนอยู่ → ยังไม่ต้องวาด (วาดตอนเปิดหน้า) — config/บัญชีอัปเดตบ่อย
    if ($('p-themes').hidden && $('themeGrid').children.length) return void (renderThemes.dirty = true); // สร้างการ์ดไว้ก่อนครั้งแรก เปิดหน้าแล้วไม่ต้องรอ
    renderThemes.dirty = false;
    const grid = $('themeGrid');
    // ธีมชุดใหม่สุดขึ้นก่อน (meta.added = เวอร์ชันที่ออก) • ในชุดเดียวกันเรียงตามเดิม • ธีมสร้างเองอยู่ท้ายสุด
    const ids = Object.keys(config.themes)
      .filter(themeVisible)
      .map((id, i) => ({ id, i, v: id === 'custom' ? -1 : verNum(config.themes[id].meta.added) }))
      .sort((a, b) => b.v - a.v || a.i - b.i)
      .map((x) => x.id);
    const newest = Math.max(0, ...ids.map((id) => verNum(config.themes[id].meta.added)));
    if (grid.children.length !== ids.length || [...grid.children].some((b, i) => b.dataset.id !== ids[i])) {
      grid.innerHTML = '';
      for (const id of ids) {
        const m = config.themes[id].meta;
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'tcard';
        b.dataset.id = id;
        b.innerHTML = `<div class="shot"><img loading="lazy" alt="" src="${previewSrc(id)}"><span class="clipbtn" role="button" tabindex="0" hidden>ดูตัวอย่าง</span></div><div class="nm"><small></small><b></b></div>`;
        clipBtn(b.querySelector('.clipbtn'), id, m.name);
        b.querySelector('img').alt = 'ตัวอย่างธีม ' + m.name;
        b.querySelector('small').textContent = KIND[id] || 'ธีม';
        b.querySelector('b').textContent = `${m.icon} ${m.name}`;
        b.onclick = () => pickTheme(id);
        b.disabled = acct?.mode === 'local' && !allowed(id);
        if (b.disabled) b.title = 'ยังไม่มีไฟล์ฉากในเครื่อง ต้องสร้างฉากของเราเพิ่ม';
        grid.appendChild(b);
        if (cardIO) cardIO.observe(b);
        else b.classList.add('inview');
      }
    }
    const mine = acct.user?.free_theme;
    for (const b of grid.children) {
      const id = b.dataset.id;
      const cur = id === config.theme;
      const ok = allowed(id);
      b.classList.toggle('cur', cur);
      b.classList.toggle('locked', !ok && !lockBlocked(id));
      b.querySelector('.clipbtn').hidden = !clips.has(id);
      b.querySelectorAll('.badge').forEach((x) => x.remove());
      const shot = b.querySelector('.shot');
      if (acct.plan === 'member' && id === mine) shot.insertAdjacentHTML('beforeend', '<span class="badge mine">ธีมของคุณ</span>');
      else if (cur) shot.insertAdjacentHTML('beforeend', '<span class="badge mine">ใช้อยู่</span>');
      if (newest && verNum(config.themes[id].meta.added) === newest) shot.insertAdjacentHTML('beforeend', '<span class="badge new">ใหม่</span>');
      if (!ok && !lockBlocked(id) && !commentOf(id) && !(acct.plan === 'member' && !mine)) shot.insertAdjacentHTML('beforeend', '<span class="badge lock">ยังไม่มีไฟล์ฉากในเครื่อง</span>');
      decorateCard(b, id);
    }
    renderHero();
    tickLocks();
    const note = $('themeNote');
    note.hidden = false;
    const u = acct.user;
    if (acct.plan === 'member') {
      if (!mine) note.innerHTML = '<b>เลือกธีมฟรีของคุณ 1 ธีม</b> — กดที่ธีมที่ชอบ (เปลี่ยนได้วันละครั้ง) • ผู้สนับสนุน TubHool ใช้ได้ทุกธีม';
      else {
        const nm = config.themes[mine]?.meta.name || mine;
        note.innerHTML = `<b>สมาชิกฟรี: ใช้ได้ 1 ธีม</b> — ธีมของคุณคือ “${esc(nm)}” • ${u.free_theme_next_change ? `วันนี้เปลี่ยนไปแล้ว — เปลี่ยนได้อีกครั้ง${nextChangeText(u.free_theme_next_change)}` : 'วันนี้ยังเปลี่ยนธีมฟรีได้ (กดที่ธีมอื่น)'} • <a href="#" data-go="unlock">ปลดลิมิตทุกธีม</a>`;
      }
    } else if (acct.plan === 'supporter') note.innerHTML = `<b>ผู้สนับสนุน TubHool</b> — ใช้ได้ทุกธีม ถึง ${thDate(u?.supporter_until)} ขอบคุณที่สนับสนุนครับ`;
    else if (acct.mode === 'local') note.textContent = `รุ่น Local: พร้อมเลือก ${acct.localThemes.length} ธีม • ไม่ต้องสมัครบัญชีภายนอก • ฉากรุ่นแรกใช้ภาพและเอฟเฟกต์ Local ที่สร้างเพิ่ม`;
    else note.hidden = true;
  }
  // เวลาที่เปลี่ยนธีมฟรีได้อีกครั้ง (รีเซ็ตเที่ยงคืนเวลาไทย)
  function nextChangeText(iso) {
    const t = new Date(iso);
    return t - Date.now() < 86400_000 ? 'หลังเที่ยงคืนคืนนี้' : ' ' + thDate(iso);
  }
  function pickTheme(id) {
    if (acct?.mode === 'local' && !allowed(id)) return toast('ยังไม่มีไฟล์ฉากนี้ในเครื่อง — ต้องสร้างฉากของเราเพิ่ม', true);
    if (lockBlocked(id)) return openLock(id);
    if (commentOf(id) && !commentOf(id).active) return openComment(id);
    if (id === config.theme && allowed(id)) return;
    const name = config.themes[id].meta.name;
    if (allowed(id)) {
      socket.emit('admin:setTheme', id, (ack) => (ack?.ok ? toast(`เปลี่ยนเป็นธีม “${name}” แล้ว`) : toast(ack?.error || 'เปลี่ยนธีมไม่ได้', true)));
      return;
    }
    if (acct.plan !== 'member') return;
    const u = acct.user;
    if (u.free_theme && u.free_theme_next_change) return go('unlock');
    if (status.status === 'connected' && !confirm('กำลังไลฟ์อยู่ — เปลี่ยนธีมตอนนี้หน้าเวทีจะโหลดใหม่ แน่ใจไหม?')) return;
    if (!confirm(`ใช้ “${name}” เป็นธีมฟรีของคุณ?\nสมาชิกฟรีเปลี่ยนธีมได้วันละครั้ง (เปลี่ยนได้อีกหลังเที่ยงคืน)`)) return;
    post('/api/account/free-theme', { theme: id }).then((r) => {
      if (r.account) acct = r.account;
      render();
      r.ok ? toast(`ธีมฟรีของคุณคือ “${name}” แล้ว`) : toast(r.error || 'เลือกธีมไม่สำเร็จ', true);
    });
  }

  // ---------------------------------------------------------------- ปลดลิมิต
  // ราคาเปิดตัวก่อนปรับราคา (จาก tubhool.com: price_promo) + โบนัสวันของผู้สนับสนุนเดิม (loyal_bonus)
  let promoTimer = 0;
  function renderUnlock() {
    const u = acct.user || {};
    const tiers = u.tiers || [];
    const pr = u.price_promo && Date.parse(u.price_promo.until) > Date.now() + (acct?.skew || 0) ? u.price_promo : null;
    const best = tiers.reduce((m, t) => (!m || t.amount / t.days < m.amount / m.days ? t : m), null);
    $('tiers').innerHTML = tiers.length
      ? tiers.map((t) => {
          const isBest = t === best && tiers.length > 1;
          return `<div class="tier${isBest ? ' best' : ''}">${t.was ? `<span class="off">ประหยัด ${nf(t.off)}%</span>` : isBest ? '<span class="best-tag">คุ้มกว่า</span>' : ''}
            <small>${nf(t.days)} วัน${t.was && isBest ? ' <span class="best-tag in">คุ้มสุด</span>' : ''}</small><b>฿${nf(t.amount)}</b>
            ${t.was ? `<span class="was">ราคาปกติ ฿${nf(t.was)}</span>` : ''}<span class="muted">ไม่จำกัด ${nf(t.days)} วัน</span>
            ${t.days >= 60 ? `<span class="avg">เฉลี่ยเดือนละ ฿${nf(Math.round((t.amount * 30) / t.days))}</span>` : ''}</div>`;
        }).join('')
      : '<div class="tier"><small>ราคา</small><b>ดูบนเว็บ</b><span class="muted">tubhool.com/donate</span></div>';
    const band = $('prBanner');
    band.hidden = !pr;
    if (pr) {
      const next = (pr.next || []).map((t) => `฿${nf(t.amount)} / ${nf(t.days)} วัน`).join(' และ ');
      band.innerHTML = `<div class="t"><small>🔥 ราคาเปิดตัว สมัครได้ถึง ${esc(pr.last_day)} เท่านั้น</small><b>สมัครตอนนี้ ประหยัดสูงสุด ${nf(pr.max_off)}%</b>
        <span>ตั้งแต่ ${esc(pr.from_day)} ราคาปรับเป็น ${next}</span></div>
        <div class="pr-cd"><div><i data-u="d">-</i><em>วัน</em></div><div><i data-u="h">--</i><em>ชม.</em></div><div><i data-u="m">--</i><em>นาที</em></div><div><i data-u="s">--</i><em>วิ</em></div></div>`;
    }
    const loyal = $('prLoyal');
    const ex = pr ? (pr.next || []).map((t) => `<span>ต่อ ฿${nf(t.amount)} → ได้ ${nf(t.days + pr.bonus_days)} วัน</span>`).join('') : '';
    loyal.hidden = !((pr && pr.bonus_days) || u.loyal_bonus);
    loyal.innerHTML = pr && pr.bonus_days
      ? `<div class="ic">💛</div><div>${pr.early
          ? `<b>คุณเป็นผู้สนับสนุนแล้ว — ต่ออายุหลังปรับราคา ได้วันเพิ่ม +${nf(pr.bonus_days)} วัน อัตโนมัติ</b><p>ต่ออายุครั้งแรกตั้งแต่ ${esc(pr.from_day)} ระบบบวกให้อีก ${nf(pr.bonus_days)} วันเอง ไม่ต้องกรอกโค้ด (ได้ 1 ครั้ง)</p>`
          : `<b>ผู้สนับสนุนเดิม ต่ออายุได้วันเพิ่ม +${nf(pr.bonus_days)} วัน อัตโนมัติ</b><p>สมัครเป็นผู้สนับสนุนภายใน ${esc(pr.last_day)} หลังปรับราคาแล้ว ต่ออายุครั้งแรกระบบบวกให้อีก ${nf(pr.bonus_days)} วันเอง ไม่ต้องกรอกโค้ด (ได้ 1 ครั้ง)</p>`}<div class="ex">${ex}</div></div>`
      : u.loyal_bonus
        ? `<div class="ic">💛</div><div><b>ขอบคุณผู้สนับสนุนเดิม — ต่ออายุครั้งนี้ได้วันเพิ่ม +${nf(u.loyal_bonus)} วัน อัตโนมัติ</b><p>เลือกแพ็กเกจไหนก็ได้บนเว็บ ระบบบวกให้อีก ${nf(u.loyal_bonus)} วันตอนชำระเงินสำเร็จ (ได้ 1 ครั้ง)</p></div>`
        : '';
    clearInterval(promoTimer);
    if (pr) {
      const el = band.querySelector('.pr-cd');
      const p2 = (n) => String(n).padStart(2, '0');
      const set = (k, v) => (el.querySelector(`[data-u="${k}"]`).textContent = v);
      const tick = () => {
        const s = Math.max(0, Math.floor((Date.parse(pr.until) - (Date.now() + (acct?.skew || 0))) / 1000));
        set('d', Math.floor(s / 86400));
        set('h', p2(Math.floor(s / 3600) % 24));
        set('m', p2(Math.floor(s / 60) % 60));
        set('s', p2(s % 60));
        if (s <= 0) {
          clearInterval(promoTimer);
          loadAccount(); // ราคาใหม่เริ่มแล้ว → ดึงราคาจากเว็บใหม่
        }
      };
      tick();
      promoTimer = setInterval(tick, 1000);
    }
  }

  // ---------------------------------------------------------------- วิดเจ็ต (ไลฟ์เกม / จอแนวนอน)
  const WIDGETS = [
    ['alerts', 'Alert ของขวัญ & ผู้ติดตาม', 'เด้งชื่อคนส่งของขวัญ/กดติดตามกลางล่างจอ มีเสียงกริ๊ง', 'แนะนำ 1000 × 300'],
    ['feed', 'แชทลอย', 'คอมเมนต์ล่าสุด 8 ข้อความ ค่อย ๆ จางหาย', 'แนะนำ 600 × 500'],
    ['top', 'อันดับคนให้ของขวัญ', 'ท็อป 5 ของไลฟ์นี้ อัปเดตทันที', 'แนะนำ 400 × 300'],
    ['goal', 'แถบภารกิจไลฟ์', 'เป้าหมายหัวใจ/เพชร/ผู้ติดตาม (ตั้งที่หน้า ภารกิจ & สรุปไลฟ์)', 'แนะนำ 900 × 90'],
  ];
  function renderWidgets() {
    const base = `http://127.0.0.1:${location.port || 80}/widget.html?w=`;
    const grid = $('wgrid');
    if (!grid.children.length) {
      for (const [id, name, desc, size] of WIDGETS) {
        const c = document.createElement('div');
        c.className = 'wcard';
        c.innerHTML = `<h3></h3><p class="hint"></p><div class="wprev"><iframe title="" tabindex="-1"></iframe></div><div class="row"><code></code><button class="btn lav" type="button">คัดลอก</button></div>`;
        c.querySelector('h3').textContent = name;
        c.querySelector('p').textContent = `${desc} • ${size}`;
        c.querySelector('iframe').title = 'ตัวอย่าง ' + name;
        c.querySelector('code').textContent = base + id;
        c.querySelector('button').onclick = async () => {
          try {
            await navigator.clipboard.writeText(base + id);
            toast(`คัดลอกลิงก์ “${name}” แล้ว — วางเป็นแหล่ง Link ใน LIVE Studio`);
          } catch {
            toast('คัดลอกไม่ได้ — เลือกข้อความแล้วกด Ctrl+C', true);
          }
        };
        c.dataset.id = id;
        grid.appendChild(c);
      }
    }
    // ตัวอย่างในโปรแกรม: ปิดเสียงและย่อ (scale=0.6)
    for (const c of grid.children) c.querySelector('iframe').src = `widget.html?w=${c.dataset.id}&scale=0.6&mute=1`;
  }

  // ---------------------------------------------------------------- ตัวช่วยตั้งค่าครั้งแรก
  const WIZ_KEY = 'ls.wizardDone';
  let wizStep = 1;
  const wizDone = () => {
    try {
      return localStorage.getItem(WIZ_KEY) === '1';
    } catch {
      return true;
    }
  };
  function wizShow(n) {
    wizStep = n;
    document.querySelectorAll('.wiz-step').forEach((s) => (s.hidden = Number(s.dataset.s) !== n));
    $('wizDots').innerHTML = [1, 2, 3, 4].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('');
    $('wizBack').hidden = n === 1;
    $('wizNext').textContent = n === 4 ? 'เสร็จแล้ว เริ่มใช้งาน' : 'ถัดไป';
    if (n === 1 && config) $('wizUser').value = config.username ? '@' + config.username : '';
    if (n === 2) wizThemes();
    if (n === 3) $('wizLink').textContent = $('stageLink').textContent;
  }
  function wizThemes() {
    const box = $('wizThemes');
    box.innerHTML = '';
    const mine = acct.user?.free_theme;
    $('wizThemeHint').textContent =
      acct.mode === 'local' ? 'ฉากที่มีไฟล์พร้อมใช้ในเครื่อง — ฉากอื่นต้องสร้างเพิ่ม ไม่ต้องสมัครบัญชี' : acct.plan === 'member' && !mine ? 'สมาชิกฟรีเลือกได้ 1 ธีม (เปลี่ยนได้วันละครั้ง) — ผู้สนับสนุนใช้ได้ทุกธีม' : 'กดเลือกธีมที่ชอบ — เปลี่ยนทีหลังได้ที่เมนู “ธีม”';
    for (const id of Object.keys(config.themes).filter(themeVisible).filter(id => acct?.mode !== 'local' || allowed(id))) {
      const m = config.themes[id].meta;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = (id === config.theme ? 'cur ' : '') + (!allowed(id) && !(acct.plan === 'member' && !mine) ? 'locked' : '');
      b.innerHTML = `<img alt="" loading="lazy" src="${previewSrc(id)}"><span></span>`;
      b.querySelector('span').textContent = `${m.icon} ${m.name}`;
      b.onclick = () => {
        pickTheme(id);
        setTimeout(wizThemes, 900);
      };
      box.appendChild(b);
    }
  }
  function wizOpen() {
    if (!config || !acct) return;
    $('wiz').hidden = false;
    wizShow(1);
    setTimeout(() => $('wizUser').focus(), 50);
  }
  function wizClose() {
    $('wiz').hidden = true;
    try {
      localStorage.setItem(WIZ_KEY, '1');
    } catch {}
  }
  $('wizSkip').onclick = wizClose;
  $('wizOpen').onclick = (e) => {
    e.preventDefault();
    wizOpen();
  };
  $('wizBack').onclick = () => wizShow(Math.max(1, wizStep - 1));
  $('wizNext').onclick = () => {
    if (wizStep === 1) {
      const name = $('wizUser').value.trim();
      if (!name) return toast('ใส่ชื่อผู้ใช้ TikTok ก่อน (ข้ามได้ด้วยปุ่ม “ข้ามไปก่อน”)', true);
      socket.emit('admin:saveConfig', { username: name }, () => wizShow(2));
      return;
    }
    if (wizStep < 4) return wizShow(wizStep + 1);
    wizClose();
    go('home');
    toast('พร้อมแล้ว! เริ่มไลฟ์ใน LIVE Studio แล้วกด “เชื่อมต่อ”');
  };
  $('wizUser').addEventListener('keydown', (e) => e.key === 'Enter' && $('wizNext').click());
  $('wizCopy').onclick = () => $('copyLink').click();
  $('wizPreview').onclick = openPreviewWindow;
  $('wizCrowd').onclick = () => socket.emit('test:crowd');
  $('wizGift').onclick = () => {
    const gifts = config?.themes[config.theme]?.t?.gifts || [];
    if (gifts.length) test('gift', { gift: gifts[Math.min(3, gifts.length - 1)].name });
  };
  // เปิดเองครั้งแรก (ยังไม่เคยตั้งชื่อ TikTok และยังไม่เคยผ่านตัวช่วย)
  const wizAuto = setInterval(() => {
    if (!acct || !config || $('main').hidden) return;
    clearInterval(wizAuto);
    if (!wizDone() && !config.username) wizOpen();
  }, 400);

  loadAccount();
})();
