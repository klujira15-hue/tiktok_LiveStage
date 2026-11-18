/* ห้องควบคุมไลฟ์ (control.html) — หน้าต่างลอยระหว่างไลฟ์
 * ใช้คำสั่ง/ค่าตั้งเดียวกับหลังบ้านทั้งหมด → ปรับที่นี่หรือที่หลังบ้านก็ได้ผลเหมือนกัน ค่าตรงกันเสมอ
 *  - หน้าจอ: mode:set / mode:clear (รอเริ่ม/พักเบรก) • รูปโปรไฟล์คนดู: admin:saveConfig { pfp }
 *  - เสียงพูด: admin:saveConfig { tts } • ดนตรีพื้นหลัง: { music } • เพลงในไลฟ์: music:cmd + /api/music/upload|remove + { playlist }
 *  - เอฟเฟกต์ของธีมที่ใช้อยู่: admin:effect
 *  - คอมเมนต์วิ่งแบบ TikTok: ฟังเหตุการณ์ chat / gift / join / social ที่หน้าเวทีได้อยู่แล้ว (ไม่มีช่องพิมพ์ส่ง)
 */
(() => {
  const $ = (id) => document.getElementById(id);
  const socket = io();
  const desk = window.liveStage || null;
  let config = null;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const fmtN = (n) => (n >= 10000 ? (n / 1000).toFixed(n >= 100000 ? 0 : 1) + 'k' : Number(n || 0).toLocaleString('en-US'));
  // เวลาไลฟ์ 00:02:30 (ชม:นาที:วินาที เสมอ)
  const clockT = (sec) => [sec / 3600, (sec % 3600) / 60, sec % 60].map((v) => String(Math.floor(v)).padStart(2, '0')).join(':');
  const fmtT = (sec) => {
    sec = Math.max(0, Math.round(sec || 0));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
  };
  function toast(t) {
    const e = $('toast');
    e.textContent = t;
    e.classList.add('on');
    clearTimeout(e._t);
    e._t = setTimeout(() => e.classList.remove('on'), 1500);
  }
  const saveCfg = (patch) => socket.emit('admin:saveConfig', patch);
  // ปรับแถบเลื่อนต่อเนื่อง → ส่งค่าเมื่อหยุดเลื่อนสักครู่ (ไม่ยิงถี่)
  const later = (fn, ms = 150) => {
    let t = null;
    return (...a) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...a), ms);
    };
  };

  // ---------------------------------------------------------------- แถบบน: สถานะไลฟ์ + ตัวเลข
  let startAt = 0;
  let coins = 0;
  function setStatus(s) {
    const live = $('live');
    live.className = 'live' + (s.status === 'connected' ? ' on' : s.status === 'connecting' ? ' wait' : '');
    $('liveT').textContent = s.status === 'connected' ? 'LIVE' : s.status === 'connecting' ? 'กำลังเชื่อมต่อ…' : 'ยังไม่ได้เชื่อมต่อ';
    if (s.username !== undefined) $('who').textContent = s.username ? '@' + s.username : '';
  }
  // เสียงพูดออกจากหน้าเวทีที่มีเสียง (ใน LIVE Studio) — หน้านี้ปิดเสียง เลยบอกให้รู้ว่าตอนนี้มีหน้าเวทีที่ส่งเสียงอยู่ไหม
  function showWhere(stages) {
    const real = (stages || []).filter((s) => !s.silent && !s.thumb);
    const el = $('ttsWhere');
    const ok = real.some((s) => s.audio);
    el.classList.toggle('ok', ok);
    el.textContent = ok
      ? '🔊 เสียงพูดออกทางหน้าเวทีใน LIVE Studio — เปิด/ปิดแล้วมีผลทันที (หน้านี้ไม่มีเสียง)'
      : real.length
        ? '⚠️ หน้าเวทีเปิดอยู่แต่ยังไม่มีเสียง — คลิกที่หน้าเวทีหนึ่งครั้ง หรือรีเฟรชแหล่ง Link ใน LIVE Studio'
        : '🔇 ยังไม่ได้เปิดหน้าเวทีใน LIVE Studio — เสียงพูดจะดังจากตรงนั้น (หน้านี้ไม่มีเสียง)';
  }
  function pullSession() {
    socket.emit('pre:get', null, (r) => {
      if (r) showWhere(r.stages);
      const s = r?.session;
      if (!s) return;
      startAt = s.startAt || 0;
      coins = s.diamonds || 0;
      $('coins').textContent = fmtN(coins);
    });
  }
  setInterval(() => {
    $('clock').textContent = startAt ? clockT((Date.now() - startAt) / 1000) : '00:00:00';
  }, 1000);
  setInterval(pullSession, 5000);
  socket.on('status', setStatus);
  socket.on('viewers', (n) => ($('viewers').textContent = fmtN(n)));
  socket.on('counters', (c) => {
    $('viewers').textContent = fmtN(c.viewers);
    $('likes').textContent = fmtN(c.totalLikes);
  });
  socket.on('like', (d) => d.total && ($('likes').textContent = fmtN(d.total)));

  // ---------------------------------------------------------------- คอมเมนต์วิ่งแบบ TikTok
  const people = new Map(); // id → { avatar, color } (รูป/สีของคนดู)
  const COLORS = ['#e86a8a', '#4cd3c2', '#ffb347', '#8f7bff', '#5fd36b', '#ff7a59'];
  const colorOf = (id) => {
    let h = 0;
    for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return COLORS[h % COLORS.length];
  };
  const remember = (p) => p?.id && people.set(p.id, { avatar: p.avatar || people.get(p.id)?.avatar || '', color: p.color || people.get(p.id)?.color || colorOf(p.id) });
  function avatar(id, name) {
    const p = people.get(id);
    const bg = p?.color || colorOf(id);
    const img = p?.avatar ? `<img src="${esc(p.avatar)}" alt="" referrerpolicy="no-referrer">` : esc((name || '?').trim().charAt(0));
    return `<span class="av" style="background:${esc(bg)}">${img}</span>`;
  }
  const giftIcon = (name, image) => image || config?.giftIcons?.[String(name || '').trim().toLowerCase()] || '';
  function push(cls, html) {
    const box = $('chat');
    const el = document.createElement('div');
    el.className = 'msg ' + cls;
    el.innerHTML = html;
    box.appendChild(el);
    while (box.children.length > 40) box.firstChild.remove();
    $('empty').hidden = true;
  }
  socket.on('chat', (d) => push('', `${avatar(d.id, d.name)}<span class="tx"><span class="nm">${esc(d.name)}</span>${esc(d.text)}</span>`));
  socket.on('gift', (d) => {
    remember(d.user);
    const ic = giftIcon(d.gift.name, d.gift.image);
    const g = ic ? `<img class="gi" src="${esc(ic)}" alt="" referrerpolicy="no-referrer">` : esc(d.gift.name);
    push('gift', `${avatar(d.user.id, d.user.name)}<span class="tx"><span class="nm">${esc(d.user.name)}</span>ส่ง ${g} ×${Number(d.gift.count) || 1}</span>`);
    coins += Number(d.gift.total) || 0;
    $('coins').textContent = fmtN(coins);
  });
  socket.on('join', (a) => {
    remember(a);
    push('join', `${avatar(a.id, a.name)}<span class="tx"><span class="nm">${esc(a.name)}</span>เข้าร่วมแล้ว</span>`);
  });
  socket.on('social', (d) => {
    if (d.kind === 'follow') push('follow', `${avatar(d.id, d.name)}<span class="tx"><span class="nm">${esc(d.name)}</span>ติดตามผู้จัดไลฟ์แล้ว ➕</span>`);
    else if (d.kind === 'share') push('join', `${avatar(d.id, d.name)}<span class="tx"><span class="nm">${esc(d.name)}</span>แชร์ไลฟ์แล้ว ↗</span>`);
  });
  // แจ้งเตือนครั้งแรก: หน้านี้ไม่มีเสียง + คนดูเห็นช้ากว่า (กด ℹ️ ดูซ้ำได้)
  const NOTE_KEY = 'livestage.control.noteSeen';
  const noteSeen = () => {
    try {
      return localStorage.getItem(NOTE_KEY) === '1';
    } catch {
      return false;
    }
  };
  const openNote = () => {
    $('noteHide').checked = noteSeen();
    $('note').hidden = false;
    $('noteOk').focus();
  };
  $('noteOk').onclick = () => {
    $('note').hidden = true;
    try {
      if ($('noteHide').checked) localStorage.setItem(NOTE_KEY, '1');
      else localStorage.removeItem(NOTE_KEY);
    } catch {}
  };
  $('note').onkeydown = (e) => e.key === 'Escape' && $('noteOk').click();
  $('infoBtn').onclick = openNote;
  if (!noteSeen()) openNote();

  $('hideChat').onclick = () => {
    const off = $('chat').classList.toggle('off');
    $('hideChat').textContent = off ? '💬 แสดงคอมเมนต์' : '💬 ซ่อนคอมเมนต์';
  };

  // ---------------------------------------------------------------- หน้าจอตอนนี้ (รอเริ่ม / พักเบรก)
  let mode = null;
  function showMode(m) {
    mode = m;
    const k = m?.kind || 'live';
    $('mode').querySelectorAll('button').forEach((b) => {
      b.classList.toggle('on', b.dataset.m === k);
      b.classList.toggle('warn', b.dataset.m === k && k !== 'live');
    });
    $('modeOpt').hidden = k === 'live';
    $('mtag').textContent = { live: '🎬 ไลฟ์ปกติ', soon: '⏳ รอเริ่มไลฟ์', brb: '☕ พักเบรก' }[k];
  }
  socket.on('stageMode', showMode);
  $('mode').onclick = (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.m === 'live') socket.emit('mode:clear', null, () => toast('กลับเข้าไลฟ์ปกติแล้ว'));
    else socket.emit('mode:set', { kind: b.dataset.m, minutes: Number($('modeMin').value) || 0 }, () => toast(b.dataset.m === 'soon' ? 'ขึ้นฉากรอเริ่มไลฟ์แล้ว' : 'ขึ้นฉากพักเบรกแล้ว'));
  };
  $('modeMin').onchange = () => mode && socket.emit('mode:set', { kind: mode.kind, minutes: Number($('modeMin').value) || 0, title: mode.title, sub: mode.sub });

  // ---------------------------------------------------------------- รูปโปรไฟล์คนดู
  $('pf').onclick = (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    saveCfg({ pfp: b.dataset.p });
    toast('รูปโปรไฟล์คนดู: ' + b.textContent);
  };

  // ---------------------------------------------------------------- เสียงพูดอัตโนมัติ
  document.querySelectorAll('#ttsCard .sw').forEach((s) => {
    s.onclick = () => {
      if (!config) return;
      const on = !s.classList.contains('on');
      saveCfg({ tts: { ...config.tts, [s.dataset.k]: on } });
      toast((on ? 'เปิด: ' : 'ปิด: ') + s.querySelector('.lb').firstChild.textContent.trim());
    };
  });
  const saveTtsVol = later((v) => saveCfg({ tts: { ...config.tts, volume: v } }));
  $('vTts').oninput = () => {
    $('vTtsV').textContent = $('vTts').value + '%';
    if (config) saveTtsVol(Number($('vTts').value) / 100);
  };

  // ---------------------------------------------------------------- ซูมหาคนส่งของขวัญ (config.zoom — ใช้ได้ทุกธีมที่มีคนดูในฉาก)
  const ZDEF = { enabled: true, min: 0, k: 2, sec: 5, hideHud: true, kidQueue: true };
  const zc = () => ({ ...ZDEF, ...(config?.zoom || {}) });
  const ZTXT = { min: { 0: 'ทุกชิ้น', 5: '🪙5 ขึ้นไป', 30: '🪙30 ขึ้นไป', 100: '🪙100 ขึ้นไป' }, k: { 1.5: 'ห่าง', 2: 'กลาง', 2.5: 'ใกล้' }, sec: { 3: '3 วินาที', 5: '5 วินาที', 7: '7 วินาที' } };
  function renderZoom() {
    const z = zc();
    const card = $('zoomCard');
    card.classList.toggle('off', !z.enabled);
    card.querySelectorAll('.sw').forEach((s) => s.classList.toggle('on', !!z[s.dataset.k]));
    for (const [id, k] of [['zMin', 'min'], ['zK', 'k'], ['zSec', 'sec']]) $(id).querySelectorAll('button').forEach((b) => b.classList.toggle('on', Number(b.dataset.v) === z[k]));
    // ธีมเกม (มินิเกม/เลี้ยงน้อง/ตีกัน ฯลฯ) ไม่มีคนดูในฉาก → ไม่ซูม
    const th = config?.themes?.[config.theme];
    const game = th?.meta?.feature === 'games';
    const w = $('zoomWhere');
    w.classList.toggle('ok', !game);
    w.textContent = game ? '⚠️ ธีมเกมนี้ไม่มีคนดูในฉาก — ไม่ซูม (ใช้ได้กับธีมอื่นทั้งหมด)' : '✅ ใช้กับธีมนี้ได้ — ทีละคน ของขวัญใหญ่ได้ก่อน';
    $('zKid').hidden = !th?.meta?.hud?.kid;
  }
  // อัปเดตบนหน้านี้ทันที (กดหลายปุ่มติดกันก่อนเซิร์ฟเวอร์ตอบกลับ ค่าไม่ทับกัน)
  const saveZoom = (patch, msg) => {
    config.zoom = { ...zc(), ...patch };
    renderZoom();
    saveCfg({ zoom: config.zoom });
    toast(msg);
  };
  $('zoomCard').querySelectorAll('.sw').forEach((s) => {
    s.onclick = () => {
      if (!config) return;
      const on = !zc()[s.dataset.k];
      saveZoom({ [s.dataset.k]: on }, (on ? 'เปิด: ' : 'ปิด: ') + s.querySelector('.lb').firstChild.textContent.trim());
    };
  });
  for (const [id, k, lb] of [['zMin', 'min', 'ซูมเมื่อส่ง'], ['zK', 'k', 'ระยะซูม'], ['zSec', 'sec', 'ซูมนาน']]) {
    $(id).onclick = (e) => {
      const b = e.target.closest('button');
      if (!b || !config) return;
      const v = Number(b.dataset.v);
      saveZoom({ [k]: v }, `${lb}: ${ZTXT[k][v]}`);
    };
  }
  $('zoomTest').onclick = () => {
    socket.emit('zoom:test');
    toast(zc().enabled ? 'ลองซูมบนหน้าเวทีแล้ว' : 'ลองซูมให้ดู (ตอนนี้ปิดซูมอยู่ ของขวัญจริงจะไม่ซูม)');
  };

  // ---------------------------------------------------------------- เพลงในไลฟ์ + ดนตรีพื้นหลัง
  let st = { id: null, playing: false, pos: 0, dur: 0, at: 0 };
  let stAt = 0;
  const cmd = (action, extra = {}) => socket.emit('music:cmd', { action, ...extra });
  const pl = () => config?.playlist || { items: [] };
  function renderSongs() {
    const items = pl().items || [];
    $('plist').innerHTML = items.length
      ? items.map((x) => `<div class="it${x.id === st.id ? ' on' : ''}" data-id="${esc(x.id)}"><span class="t">${x.id === st.id && st.playing ? '▶ ' : ''}${esc(x.title)}</span><span class="d">${x.dur ? fmtT(x.dur) : ''}</span><button class="x" type="button" title="ลบออกจากรายการ" data-del="${esc(x.id)}">✕</button></div>`).join('')
      : '<div class="none">ยังไม่มีเพลง — กด “＋ เพิ่มเพลง” หรือลากไฟล์มาวาง</div>';
    $('ackRow').hidden = !!pl().ack;
  }
  function renderNow() {
    const it = (pl().items || []).find((x) => x.id === st.id);
    const pos = st.playing ? st.pos + (Date.now() - stAt) / 1000 : st.pos;
    $('song').textContent = it ? it.title : (pl().items || []).length ? 'ยังไม่ได้เล่น — กด ▶ เริ่มเพลงแรก' : 'ยังไม่มีเพลงในรายการ';
    $('songT').textContent = it && st.dur ? `${fmtT(Math.min(pos, st.dur))} / ${fmtT(st.dur)}${st.playing ? '' : ' • หยุดอยู่'}` : '-';
    $('songP').style.width = it && st.dur ? Math.min(100, (pos / st.dur) * 100) + '%' : '0';
    $('mPlay').textContent = st.playing ? '⏸' : '▶';
  }
  setInterval(() => st.playing && renderNow(), 1000);
  socket.on('music:state', (s) => {
    st = s || st;
    stAt = Date.now();
    renderNow();
    renderSongs();
  });
  $('mPrev').onclick = () => cmd('prev');
  $('mNext').onclick = () => cmd('next');
  $('mPlay').onclick = () => cmd('toggle');
  $('plist').addEventListener('click', async (e) => {
    const del = e.target.closest('[data-del]');
    if (del) {
      const it = pl().items.find((x) => x.id === del.dataset.del);
      if (!confirm(`ลบ “${it?.title || ''}” ออกจากรายการเพลง?`)) return;
      await fetch('/api/music/remove', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: del.dataset.del }) });
      return toast('ลบเพลงแล้ว');
    }
    const row = e.target.closest('.it');
    if (!row) return;
    if (row.dataset.id === st.id) cmd(st.playing ? 'pause' : 'toggle');
    else cmd('play', { id: row.dataset.id });
  });
  $('ack').onchange = () => {
    if (!$('ack').checked) return;
    $('ack').disabled = true; // ติ๊กแล้วเอาออกไม่ได้ — บันทึกครั้งเดียวใช้ทุกหน้า
    saveCfg({ playlist: { ...pl(), ack: true } });
  };
  // เพิ่มเพลง: เลือกไฟล์ / ลากมาวาง → อัปโหลดเข้าโฟลเดอร์เพลงของโปรแกรม (เหมือนหน้า "เพลงในไลฟ์")
  const ACCEPT = /\.(mp3|mp4|m4a|m4v|wav|ogg|oga|aac|flac|webm)$/i;
  const duration = (file) =>
    new Promise((res) => {
      const a = document.createElement(file.type.startsWith('video') ? 'video' : 'audio');
      const url = URL.createObjectURL(file);
      const done = (v) => {
        URL.revokeObjectURL(url);
        res(v);
      };
      a.preload = 'metadata';
      a.onloadedmetadata = () => done(Number.isFinite(a.duration) ? a.duration : 0);
      a.onerror = () => done(-1);
      setTimeout(() => done(0), 8000);
      a.src = url;
    });
  let busy = false;
  async function upload(files) {
    if (busy || !files.length) return;
    if (!pl().ack) return toast('ติ๊กยืนยันเรื่องสิทธิ์เพลงก่อน (ใต้รายการเพลง)');
    busy = true;
    let done = 0;
    const failed = [];
    for (const f of files) {
      if (!ACCEPT.test(f.name)) {
        failed.push(f.name);
        continue;
      }
      toast(`กำลังเพิ่ม ${done + 1}/${files.length}: ${f.name}`);
      const dur = await duration(f);
      if (dur < 0) {
        failed.push(f.name);
        continue;
      }
      try {
        const r = await fetch('/api/music/upload', { method: 'POST', headers: { 'Content-Type': 'application/octet-stream', 'X-Name': encodeURIComponent(f.name), 'X-Dur': String(Math.round(dur)) }, body: f });
        if (r.ok) done++;
        else failed.push(f.name);
      } catch {
        failed.push(f.name);
      }
    }
    busy = false;
    $('songFile').value = '';
    toast((done ? `เพิ่มแล้ว ${done} เพลง ✓` : '') + (failed.length ? `${done ? ' • ' : ''}เพิ่มไม่ได้ ${failed.length} ไฟล์` : ''));
  }
  $('addSong').onclick = () => (pl().ack ? $('songFile').click() : toast('ติ๊กยืนยันเรื่องสิทธิ์เพลงก่อน (ใต้รายการเพลง)'));
  $('songFile').onchange = () => upload([...$('songFile').files]);
  // ลากไฟล์เพลงมาวางที่ไหนก็ได้ในการ์ดเพลง
  const card = $('musicCard');
  let depth = 0;
  card.addEventListener('dragenter', (e) => {
    e.preventDefault();
    depth++;
    card.classList.add('over');
  });
  card.addEventListener('dragover', (e) => e.preventDefault());
  card.addEventListener('dragleave', () => --depth <= 0 && ((depth = 0), card.classList.remove('over')));
  card.addEventListener('drop', (e) => {
    e.preventDefault();
    depth = 0;
    card.classList.remove('over');
    upload([...e.dataTransfer.files]);
  });
  const saveSongVol = later((v) => saveCfg({ playlist: { ...pl(), volume: v } }));
  $('vSong').oninput = () => {
    $('vSongV').textContent = $('vSong').value + '%';
    if (config) saveSongVol(Number($('vSong').value) / 100);
  };
  const saveBgVol = later((v) => saveCfg({ music: { ...config.music, volume: v, enabled: v > 0 } }));
  $('vBg').oninput = () => {
    $('vBgV').textContent = $('vBg').value + '%';
    if (config) saveBgVol(Number($('vBg').value) / 100);
  };

  // ---------------------------------------------------------------- เอฟเฟกต์ของธีมที่ใช้อยู่
  let fxSig = '';
  // ธีมเกม → ปุ่มควบคุมเกม (รายการเดียวกับกล่อง "เกม" ในหลังบ้าน: public/game-events.js)
  const gameKey = (meta) => (meta.adv ? 'adventure' : meta.mg || null);
  const gameEvents = (meta) => window.LIVESTAGE_GAME_EVENTS?.[gameKey(meta)] || [];
  function renderFx() {
    const meta = config.themes?.[config.theme]?.meta || {};
    const fx = Object.entries(meta.effects || {});
    const gm = gameEvents(meta);
    const sig = config.theme + fx.map(([k, e]) => k + e.label).join() + '|' + gm.length;
    if (sig === fxSig) return;
    fxSig = sig;
    $('gmBox').hidden = !gm.length;
    $('fxLbl').hidden = !gm.length;
    $('gm').innerHTML = gm.map(([ic, name, desc, act], i) => `<button type="button" class="gm${act.confirm ? ' warn' : ''}" data-i="${i}" title="${esc(name + ' — ' + desc)}"><b>${esc(ic)}</b><span>${esc(name)}</span></button>`).join('');
    $('fxTheme').textContent = meta.name ? `— ${meta.icon || ''} ${meta.name}` : '';
    $('fx').innerHTML = fx.map(([k, e]) => `<button type="button" class="fx${/^g[789]$/.test(k) ? ' big' : ''}" data-k="${esc(k)}" title="${esc(e.label)}"><b>${esc(e.icon || '✨')}</b><span>${esc(e.label)}</span></button>`).join('');
  }
  $('fx').onclick = (e) => {
    const b = e.target.closest('.fx');
    if (!b) return;
    socket.emit('admin:effect', b.dataset.k);
    b.classList.remove('hit');
    void b.offsetWidth;
    b.classList.add('hit');
  };

  $('gm').onclick = (e) => {
    const b = e.target.closest('.gm');
    if (!b || !config) return;
    const meta = config.themes?.[config.theme]?.meta || {};
    const ev = gameEvents(meta)[Number(b.dataset.i)];
    if (!ev) return;
    const [ic, name, , act] = ev;
    if (act.confirm && !confirm(act.confirm)) return;
    const done = (r) => toast(r?.ok === false ? `⚠️ ${r.error || 'ใช้ไม่ได้ตอนนี้'}` : `${ic} ${name}`);
    if (act.ev) socket.emit(act.ev, act.arg ?? null, done);
    else socket.emit('mg:admin', { ...act, action: act.mg }, done);
    b.classList.remove('hit');
    void b.offsetWidth;
    b.classList.add('hit');
  };

  // ---------------------------------------------------------------- ค่าตั้งจากโปรแกรม (อัปเดตสดเมื่อมีคนปรับจากหลังบ้าน)
  function apply(c) {
    if (!c) return;
    config = c;
    document.querySelectorAll('#ttsCard .sw').forEach((s) => s.classList.toggle('on', c.tts?.[s.dataset.k] !== false && !!c.tts?.[s.dataset.k]));
    const setSl = (id, v) => {
      if (document.activeElement === $(id)) return; // กำลังเลื่อนอยู่ ไม่กระโดดกลับ
      $(id).value = Math.round(v * 100);
      $(id + 'V').textContent = Math.round(v * 100) + '%';
    };
    setSl('vTts', c.tts?.volume ?? 0.9);
    setSl('vSong', c.playlist?.volume ?? 0.7);
    setSl('vBg', c.music?.enabled === false ? 0 : c.music?.volume ?? 0.35);
    $('pf').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.p === (c.pfp || 'small')));
    renderZoom();
    renderFx();
    renderSongs();
    renderNow();
  }
  socket.on('config', apply);
  socket.on('snapshot', (s) => {
    for (const a of s.audience || []) remember(a);
    apply(s.config);
    setStatus({ status: s.status, username: s.config?.username });
    $('viewers').textContent = fmtN(s.viewers);
    $('likes').textContent = fmtN(s.totalLikes);
    pullSession();
  });

  // ---------------------------------------------------------------- ในโปรแกรม: ปักหมุดหน้าต่างให้อยู่บนสุด
  if (desk?.setControlPin) {
    const pin = $('pin');
    pin.hidden = false;
    const show = (on) => {
      pin.classList.toggle('on', on);
      pin.setAttribute('aria-pressed', String(on));
    };
    show(desk.getControlPin());
    pin.onclick = () => {
      const on = !pin.classList.contains('on');
      desk.setControlPin(on);
      show(on);
    };
  }
})();
