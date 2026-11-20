/* TikTok Live Stage — แผงควบคุม */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  if (new URLSearchParams(location.search).has('embed')) document.body.classList.add('embed');
  const socket = io();
  let config = null;
  let renderedThemeId = null;

  const activeId = () => config?.theme;
  const meta = () => config.themes[config.theme].meta;
  const tset = () => config.themes[config.theme].t;

  // ---------------- nav
  let currentPage = 'theme';
  function showPage(name) {
    currentPage = name;
    document.querySelectorAll('.nav').forEach((x) => x.classList.toggle('on', x.dataset.page === name));
    document.querySelectorAll('.page').forEach((p) => p.classList.toggle('on', p.id === 'page-' + name));
    history.replaceState(null, '', '#' + name);
    syncThemePreviews();
    if (name === 'pre') refreshPre();
    if (name === 'summary') refreshSummary();
  }
  document.querySelectorAll('.nav').forEach((b) => b.addEventListener('click', () => showPage(b.dataset.page)));

  const stageUrl = `${location.origin}/stage.html`;
  $('stageUrl').textContent = stageUrl;
  $('openStage').href = stageUrl;
  $('openStage2').href = stageUrl;

  function flashSaved(id) {
    $(id).classList.add('on');
    setTimeout(() => $(id).classList.remove('on'), 1600);
  }
  const saveGlobal = (patch, cb) => socket.emit('admin:saveConfig', patch, cb);
  const saveTheme = (patch, cb) => socket.emit('admin:saveTheme', { id: activeId(), patch }, cb);

  function setStatus(s) {
    liveStatus = s;
    // ระหว่างไลฟ์จริง → ล็อกหน้าทดสอบ (เซิร์ฟเวอร์ก็ไม่รับอยู่แล้ว)
    const live = s.status === 'connected' || s.status === 'connecting' || (s.status === 'offline' && !!config?.autoConnect);
    $('testLock').hidden = !live;
    $('page-test').classList.toggle('locked', live);
    document.querySelectorAll('[data-live-lock]').forEach((x) => (x.hidden = !live));
    if (config) renderPre();
    $('dot').className = 'dot ' + s.status;
    $('statusText').textContent = s.statusText;
  }

  // ---------------- theme cards
  function renderThemeCards() {
    const box = $('themeCards');
    // ซ่อน: สร้างธีมเอง (ปิดเมนู) • ธีมที่ผูกสวิตช์หลังบ้าน (meta.feature เช่น ธีมเกม) ที่ยังไม่เปิด
    const ids = Object.keys(config.themes).filter((id) => (id !== 'custom' || config.features?.custom !== false) && (!config.themes[id]?.meta?.feature || config.features?.[config.themes[id].meta.feature] === true));
    if (box.children.length !== ids.length) {
      box.innerHTML = '';
      for (const id of ids) {
        const m = config.themes[id].meta;
        const card = document.createElement('div');
        card.className = 'theme-card';
        card.dataset.id = id;
        card.innerHTML = `<div class="shot"><iframe title="preview" loading="lazy"></iframe></div>
          <div class="info"><div class="nm"></div><div class="ds"></div><button class="btn"></button></div>`;
        card.querySelector('.nm').textContent = `${m.icon} ${m.name}`;
        card.querySelector('.ds').textContent = m.desc;
        card.querySelector('button').onclick = () => {
          if (id === activeId()) return;
          socket.emit('admin:setTheme', id);
        };
        box.appendChild(card);
      }
    }
    for (const card of box.children) {
      const on = card.dataset.id === activeId();
      card.classList.toggle('on', on);
      const b = card.querySelector('button');
      b.textContent = on ? '✓ กำลังใช้อยู่' : 'ใช้ธีมนี้';
      b.className = on ? 'btn' : 'btn primary';
      b.disabled = on;
    }
    syncThemePreviews();
  }
  // โหลดพรีวิวเฉพาะตอนเปิดหน้าเลือกธีม (ประหยัดเครื่อง)
  // โหลดเฉพาะการ์ดที่มองเห็นบนจอ + เลิกโหลดเมื่อเลื่อนพ้น (ประหยัดเครื่องตอนไลฟ์)
  function cardVisible(card) {
    const r = card.getBoundingClientRect();
    return r.bottom > -200 && r.top < innerHeight + 200 && r.width > 0;
  }
  function syncThemePreviews() {
    document.querySelectorAll('.theme-card').forEach((card) => {
      const fr = card.querySelector('iframe');
      const want = currentPage === 'theme' && cardVisible(card) ? `stage.html?silent&thumb&theme=${card.dataset.id}` : '';
      if (want && fr.getAttribute('src') !== want) fr.src = want;
      if (!want && fr.getAttribute('src')) fr.removeAttribute('src');
    });
  }
  let scrollTimer = null;
  document.querySelector('main').addEventListener('scroll', () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(syncThemePreviews, 150);
  });
  addEventListener('resize', () => syncThemePreviews());

  // ---------------- fill forms
  function fillForms(c) {
    const firstLoad = !config;
    const themeChanged = renderedThemeId !== c.theme;
    config = c;
    renderedThemeId = c.theme;
    const m = meta();
    const t = tset();
    const label = `${m.icon} ${m.name}`;
    $('curTheme').textContent = label;
    $('giftsTheme').textContent = label;
    $('stageTheme').textContent = label;
    $('fxTheme').textContent = label;
    $('navQueue').textContent = m.texts.queue;
    $('queueTitle').textContent = m.texts.queue;
    $('cmdHint').textContent = `${t.requestCommand || '...'} ข้อความ`;
    $('queueLead').textContent = m.requestAction === 'sing' ? 'กด "ร้องเพลงนี้" เพื่อตั้งเป็นเพลงบนจอ LED' : '(แสดงคำขอล่าสุด 6 รายการบนจอ)';
    $('cmdLabel').textContent = `คำสั่งในคอมเมนต์ เช่น "${m.defaults.requestCommand}" (เว้นว่าง = ปิด)`;
    document.querySelectorAll('[data-field]').forEach((el) => (el.style.display = m.fields.includes(el.dataset.field) ? '' : 'none'));

    const editing = document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'SELECT';
    if (firstLoad || themeChanged || !editing) {
      $('username').value = c.username || '';
      $('platform').value = c.platform === 'youtube' ? 'youtube' : 'tiktok';
      $('ytTarget').value = c.youtube || '';
      $('ttField').hidden = c.platform === 'youtube';
      $('ytField').hidden = c.platform !== 'youtube';
      $('signApiKey').placeholder = c.hasSignKey ? 'บันทึกไว้แล้ว (ใส่ใหม่เพื่อเปลี่ยน)' : 'เว้นว่างได้';
      for (const k of ['title', 'subtitle', 'requestCommand', 'nowPlaying', 'artist', 'bpm', 'host']) $(k).value = t[k] ?? '';
      $('showPerformer').checked = t.showPerformer !== false;
      for (const k of ['maxAudience', 'idleMinutes', 'hypeGoal']) $(k).value = c[k] ?? '';
      $('bustle').value = String(c.bustle ?? 2);
      $('sound').checked = !!c.sound;

    }
    if (firstLoad || themeChanged || !$('page-gifts').contains(document.activeElement)) renderGiftTable(t.gifts);
    renderTestGifts(t.gifts);
    renderFxButtons();
    renderThemeCards();
    fillGameCfg(c);
    fillHints(c);
    fillTts(c);
    fillMusic(c);
    fillSafeArea(c);
    fillAvatar(c);
    if (themeChanged || firstLoad) loadBank();
    fillLan(c);
  }

  function fairSettings(){let box=document.getElementById('fairSettings');if(activeId()!=='templefair'){if(box)box.remove();return;}if(box)return;box=document.createElement('section');box.id='fairSettings';box.className='card';const title=document.createElement('h3');title.textContent='🏮 บรรยากาศงานวัด';box.append(title);const current=tset().fair||{};for(const [key,label]of [['ambient','ผู้ชมเดินเที่ยวฟรี'],['showSigns','ป้ายชื่อและคำแนะนำ'],['sound','เสียงกิจกรรม'],['paused','พักเวลาฉาก เก็บสิทธิ์เข้าคิวไว้']]){const l=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.dataset.fair=key;input.checked=key==='paused'?!!current[key]:current[key]!==false;l.append(input,document.createTextNode(' '+label+' '));box.append(l);}const b=document.createElement('button');b.className='btn';b.textContent='บันทึกบรรยากาศ';b.onclick=()=>{const fair=Object.fromEntries([...box.querySelectorAll('[data-fair]')].map(i=>[i.dataset.fair,i.checked]));saveTheme({fair},r=>{b.textContent=r?.ok?'บันทึกแล้ว':'บันทึกไม่สำเร็จ';});};box.append(b);document.getElementById('page-stage').append(box);}
  setInterval(()=>{if(config)fairSettings();},1000);
  // ---------------- gifts table
  function effectSelect(value) {
    const sel = document.createElement('select');
    for (const [k, e] of Object.entries(meta().effects)) {
      const o = document.createElement('option');
      o.value = k;
      o.textContent = `${e.icon} ${e.label}`;
      sel.appendChild(o);
    }
    sel.value = value;
    return sel;
  }
  function giftRow(g) {
    const tr = document.createElement('tr');
    const name = Object.assign(document.createElement('input'), { type: 'text', value: g.name, placeholder: 'เช่น Rose' });
    const dm = Object.assign(document.createElement('input'), { type: 'number', value: g.diamonds, min: 0 });
    const sel = effectSelect(g.effect);
    const test = Object.assign(document.createElement('button'), { className: 'btn sm', textContent: 'ลอง' });
    test.onclick = () => socket.emit('admin:effect', sel.value);
    const del = Object.assign(document.createElement('button'), { className: 'btn sm danger', textContent: 'ลบ' });
    del.onclick = () => tr.remove();
    for (const el of [name, dm, sel]) {
      const td = document.createElement('td');
      td.appendChild(el);
      tr.appendChild(td);
    }
    const td = document.createElement('td');
    td.className = 'row';
    td.append(test, del);
    tr.appendChild(td);
    return tr;
  }
  function renderGiftTable(gifts) {
    const body = $('giftRows');
    body.innerHTML = '';
    for (const g of gifts) body.appendChild(giftRow(g));
  }
  $('addGift').onclick = () => $('giftRows').appendChild(giftRow({ name: '', diamonds: 1, effect: Object.keys(meta().effects)[0] }));
  $('saveGifts').onclick = () => {
    const gifts = [...$('giftRows').children]
      .map((tr) => {
        const [n, d, e] = tr.querySelectorAll('input, select');
        return { name: n.value.trim(), diamonds: Number(d.value) || 0, effect: e.value };
      })
      .filter((g) => g.name);
    saveTheme({ gifts }, () => flashSaved('giftsSaved'));
  };

  // ---------------- stage settings
  $('saveStage').onclick = () => {
    const patch = { title: $('title').value, subtitle: $('subtitle').value, requestCommand: $('requestCommand').value.trim() };
    const fields = meta().fields;
    if (fields.includes('nowPlaying')) patch.nowPlaying = $('nowPlaying').value;
    if (fields.includes('host')) patch.host = $('host').value.trim().slice(0, 40);
    if (fields.includes('artist')) patch.artist = $('artist').value;
    if (fields.includes('bpm')) patch.bpm = Number($('bpm').value);
    if (fields.includes('showPerformer')) patch.showPerformer = $('showPerformer').checked;
    // อ่านค่าทั้งหมดก่อนส่ง (ตอนบันทึกธีม เซิร์ฟเวอร์จะส่ง config กลับมาเติมฟอร์มใหม่)
    const global = {
      maxAudience: Number($('maxAudience').value),
      idleMinutes: Number($('idleMinutes').value),
      hypeGoal: Number($('hypeGoal').value),
      bustle: Number($('bustle').value),
      sound: $('sound').checked,
    };
    saveTheme(patch, () => saveGlobal(global, () => flashSaved('stageSaved')));
  };
  $('resetTheme').onclick = () => {
    if (confirm(`คืนค่าข้อความและของขวัญของธีม "${meta().name}" เป็นค่าเริ่มต้น?`)) {
      socket.emit('admin:resetTheme', activeId(), () => {
        renderedThemeId = null; // บังคับให้เติมฟอร์มใหม่
        fillForms(config);
      });
    }
  };

  // ---------------- connect
  $('btnConnect').onclick = () => {
    const patch = { platform: $('platform').value, username: $('username').value.trim().replace(/^@/, ''), youtube: $('ytTarget').value.trim() };
    if ($('signApiKey').value.trim()) patch.signApiKey = $('signApiKey').value.trim();
    saveGlobal(patch, () => {
      $('signApiKey').value = '';
      socket.emit('admin:connect');
    });
  };
  $('btnDisconnect').onclick = () => socket.emit('admin:disconnect');
  $('platform').onchange = () => {
    $('ttField').hidden = $('platform').value === 'youtube';
    $('ytField').hidden = $('platform').value !== 'youtube';
  };

  // ---------------- requests
  let lastRequests = [];
  function renderRequests(list) {
    lastRequests = list;
    if (!config) return;
    $('songCount').textContent = list.length ? `(${list.length})` : '';
    const box = $('songList');
    box.innerHTML = '';
    if (!list.length) {
      box.innerHTML = `<div class="muted">${meta().texts.queueEmpty}</div>`;
      return;
    }
    const sing = meta().requestAction === 'sing';
    list.forEach((s, i) => {
      const row = document.createElement('div');
      row.className = 'song-item';
      row.innerHTML = '<div class="n"></div><div class="t"><div></div><div class="muted"></div></div>';
      row.querySelector('.n').textContent = i + 1;
      row.querySelector('.t div').textContent = s.text;
      row.querySelector('.t .muted').textContent = `${meta().texts.queueBy} ${s.by}`;
      if (sing) {
        const b = Object.assign(document.createElement('button'), { className: 'btn sm primary', textContent: '🎤 ร้องเพลงนี้' });
        b.onclick = () => {
          saveTheme({ nowPlaying: s.text });
          $('nowPlaying').value = s.text;
          socket.emit('admin:requestDone', s.id);
        };
        row.append(b);
      }
      const done = Object.assign(document.createElement('button'), { className: 'btn sm', textContent: sing ? 'ข้าม' : '✓ อ่านแล้ว' });
      done.onclick = () => socket.emit('admin:requestDone', s.id);
      row.append(done);
      box.appendChild(row);
    });
  }
  $('clearSongs').onclick = () => confirm('ล้างทั้งหมด?') && socket.emit('admin:clearRequests');

  // ---------------- test
  const SAMPLE = {
    concert: ['ทะเลสีดำ', 'คิดถึงเธอทุกที', 'ดาวหางฮัลเลย์', 'แค่คุณ', 'ฝนตกไหม'],
    shrine: ['ให้ครอบครัวมีความสุข', 'การงานรุ่งเรือง', 'สุขภาพแข็งแรง', 'ความรักสมหวัง', 'ค้าขายร่ำรวย'],
    krathong: ['ขอให้ปีนี้ดีกว่าเดิม', 'ขอให้เจอคนที่ใช่', 'ขอให้ทุกคนปลอดภัย', 'ขอให้สอบผ่าน', 'ขอให้มีโชค'],
  };
  const tName = () => $('tName').value.trim() || 'คนดูทดสอบ';
  function renderTestGifts(gifts) {
    const box = $('tGifts');
    box.innerHTML = '';
    [...gifts].sort((a, b) => a.diamonds - b.diamonds).forEach((g) => {
      const b = Object.assign(document.createElement('button'), { className: 'btn sm', textContent: `${g.name} · ${g.diamonds}` });
      b.onclick = () => socket.emit('test:gift', { name: tName(), gift: g.name, count: 1 });
      box.appendChild(b);
    });
  }
  function renderFxButtons() {
    const box = $('fxButtons');
    box.innerHTML = '';
    for (const [k, e] of Object.entries(meta().effects)) {
      const b = Object.assign(document.createElement('button'), { className: 'btn sm', textContent: `${e.icon} ${e.label}` });
      b.onclick = () => socket.emit('admin:effect', k);
      box.appendChild(b);
    }
  }
  $('tChat').onclick = () => socket.emit('test:chat', { name: tName(), text: $('tText').value });
  $('tText').addEventListener('keydown', (e) => e.key === 'Enter' && $('tChat').click());
  document.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => socket.emit('test:' + b.dataset.t, { name: tName() })));
  $('tSong').onclick = () => {
    const list = SAMPLE[activeId()] || SAMPLE.concert;
    const cmd = tset().requestCommand || meta().defaults.requestCommand;
    socket.emit('test:chat', { name: tName(), text: `${cmd} ${list[Math.floor(Math.random() * list.length)]}` });
  };
  $('tCrowd').onclick = () => socket.emit('test:crowd',{});
  $('clearAudience').onclick = () => {if(demoTimer){clearInterval(demoTimer);demoTimer=null;$('tAuto').textContent='▶ โหมดเดโมอัตโนมัติ';}socket.emit(activeId()==='templefair'?'test:reset':'admin:clearAudience',{});};
  $('clearTop').onclick = () => socket.emit('admin:clearTop');
  $('resetHype').onclick = () => socket.emit('admin:resetHype');

  // โหมดเดโม: สุ่มเหตุการณ์ (คอมเมนต์ใช้ชุดตัวอย่างของธีมจากเซิร์ฟเวอร์)
  const DEMO_NAMES = ['น้องเมย์', 'พี่ต้น', 'ปลาทู', 'แม่ค้าออนไลน์', 'ก้อย_99', 'มะม่วง', 'ลูกชิ้น', 'ฟ้าใส', 'คุณชายไอติม', 'บอสใหญ่', 'แพรวา', 'จูน'];
  let demoTimer = null;
  $('tAuto').onclick = () => {
    if (demoTimer) {
      clearInterval(demoTimer);
      demoTimer = null;
      $('tAuto').textContent = '▶ โหมดเดโมอัตโนมัติ';
      return;
    }
    $('tAuto').textContent = '■ หยุดเดโม';
    demoTimer = setInterval(() => {
      const name = DEMO_NAMES[Math.floor(Math.random() * DEMO_NAMES.length)];
      const r = Math.random();
      if (r < 0.45) socket.emit('test:chat', { name });
      else if (r < 0.75) socket.emit('test:like', { name });
      else if (r < 0.97) {
        const gifts = tset().gifts.filter((g) => g.diamonds < 500&&(activeId()!=='templefair'||!['sky','petals'].includes(meta().effects[g.effect]?.activity)));
        const g = gifts[Math.floor(Math.random() * gifts.length)];
        if (g) socket.emit('test:gift', { name, gift: g.name, count: Math.random() < 0.2 ? 5 : 1 });
      } else socket.emit('test:follow', { name });
    }, 1400);
  };

  // ---------------- ลิงก์สำหรับมือถือ (Wi-Fi เดียวกัน)
  let lanShown = '';
  function fillLan(c) {
    $('lanToggleRow').style.display = c.desktop ? '' : 'none';
    $('lanAccess').checked = !!c.lanAccess;
    const list = c.lanUrls || [];
    const main = list[0]?.url;
    if (!main) {
      $('lanStage').textContent = c.desktop && !c.lanAccess ? 'ติ๊ก “เปิดให้มือถือในวง Wi-Fi เดียวกันเข้าได้” ด้านบนก่อน แล้วเปิดโปรแกรมใหม่' : 'ไม่พบเครือข่าย — ตรวจว่าคอมต่อ Wi-Fi/สายแลนอยู่';
      return;
    }
    const stageUrl = `${main}/stage.html?mobile`;
    $('lanStage').textContent = stageUrl;
    $('lanAdmin').textContent = `${main}/admin.html`;
    $('lanOthers').textContent = list.length > 1 ? `ถ้าลิงก์บนใช้ไม่ได้ ลอง: ${list.slice(1).map((u) => u.url + '/stage.html?mobile').join('  ,  ')}` : '';
    if (lanShown !== stageUrl && window.QRCode) {
      lanShown = stageUrl;
      $('lanQr').innerHTML = '';
      new QRCode($('lanQr'), { text: stageUrl, width: 180, height: 180 });
    }
  }

  // ---------------- เสียงพูดอัตโนมัติ
  function fillTts(c) {
    const t = c.tts || {};
    const sel = $('ttsVoice');
    if (!sel.options.length) {
      for (const [id, name] of Object.entries(c.voices || {})) {
        const o = document.createElement('option');
        o.value = id;
        o.textContent = name;
        sel.appendChild(o);
      }
    }
    if ($('ttsCard').contains(document.activeElement)) return;
    $('ttsEngine').value = t.engine || 'edge';
    sel.value = t.voice || 'th-TH-NiwatNeural';
    $('ttsRate').value = t.rate ?? 1.05;
    $('ttsPitch').value = t.pitch ?? 0;
    $('ttsVol').value = t.volume ?? 0.9;
    $('ttsGifts').checked = t.gifts !== false;
    $('ttsMin').value = t.minDiamonds || 0;
    $('ttsFollows').checked = t.follows !== false;
    $('ttsWins').checked = t.wins !== false;
    $('ttsWelcome').checked = t.welcome !== false;
    $('ttsJoins').checked = !!t.joins;
    $('ttsComments').checked = !!t.comments;
    $('ttsGiftNames').value = t.giftNames || '';
    showTtsValues();
  }
  function showTtsValues() {
    $('ttsRateV').textContent = `${Number($('ttsRate').value).toFixed(2)}x`;
    const p = Number($('ttsPitch').value);
    $('ttsPitchV').textContent = `${p > 0 ? '+' : ''}${p}%`;
    $('ttsVolV').textContent = `${Math.round(Number($('ttsVol').value) * 100)}%`;
    $('ttsVoice').disabled = $('ttsEngine').value === 'browser';
  }
  ['ttsRate', 'ttsPitch', 'ttsVol', 'ttsEngine'].forEach((id) => $(id).addEventListener('input', showTtsValues));
  function ttsForm() {
    return {
      engine: $('ttsEngine').value,
      voice: $('ttsVoice').value,
      rate: Number($('ttsRate').value),
      pitch: Number($('ttsPitch').value),
      volume: Number($('ttsVol').value),
      gifts: $('ttsGifts').checked,
      minDiamonds: Number($('ttsMin').value) || 0,
      follows: $('ttsFollows').checked,
      wins: $('ttsWins').checked,
      welcome: $('ttsWelcome').checked,
      joins: $('ttsJoins').checked,
      comments: $('ttsComments').checked,
      giftNames: $('ttsGiftNames').value,
    };
  }
  $('ttsSave').onclick = () => saveGlobal({ tts: ttsForm() }, () => flashSaved('ttsSaved'));
  $('ttsHere').onclick = async () => {
    const f = ttsForm();
    const text = $('ttsTestText').value.trim() || 'ทดสอบเสียง';
    $('ttsStatus').textContent = 'กำลังสร้างเสียง...';
    if (f.engine === 'browser') {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'th-TH';
      u.rate = f.rate;
      u.volume = f.volume;
      speechSynthesis.speak(u);
      $('ttsStatus').textContent = 'เล่นด้วยเสียงของเครื่อง';
      return;
    }
    const t0 = performance.now();
    try {
      const q = new URLSearchParams({ text, voice: f.voice, rate: f.rate, pitch: f.pitch });
      const res = await fetch('/api/tts?' + q);
      if (!res.ok) throw new Error((await res.json()).error || res.status);
      const blob = await res.blob();
      const a = new Audio(URL.createObjectURL(blob));
      a.volume = f.volume;
      await a.play();
      $('ttsStatus').textContent = `✓ เสียงธรรมชาติใช้ได้ (สร้างเสียง ${((performance.now() - t0) / 1000).toFixed(1)} วิ)`;
    } catch (e) {
      $('ttsStatus').textContent = `✕ เสียงที่เลือกใช้ไม่ได้ตอนนี้ (${e.message}) — เปรมวดีจะข้ามประโยค ไม่สลับเสียงผู้ชาย`;
    }
  };
  $('ttsStage').onclick = () => saveGlobal({ tts: ttsForm() }, () => socket.emit('admin:ttsTest', $('ttsTestText').value.trim() || 'ทดสอบเสียง'));

  // ---------------- ตัวละคร 3D
  const AV_EVENTS = {
    join: '👋 คนเข้าไลฟ์', giftS: '🌹 ของขวัญเล็ก (ต่ำกว่า 10 เพชร)', giftM: '💝 ของขวัญ 10–99 เพชร', giftL: '🎁 ของขวัญ 100–999 เพชร',
    giftXL: '🌌 ของขวัญ 1,000+ เพชร', follow: '➕ กดติดตาม', win: '🏆 มีคนชนะเกม', game: '🎮 เกมเริ่ม', big: '🔥 หลอดพลังเต็ม',
    regular: '🎖️ แฟนประจำมาครบรอบ (5/10/20… ไลฟ์)', hello: '🙋 คอมเมนต์ทักทาย (สวัสดี)', laugh: '😂 คอมเมนต์หัวเราะ (555)', love: '💕 คอมเมนต์บอกรัก',
  };
  const AV_POSES = {
    wave: '👋 โบกมือ', wai: '🙏 ไหว้', bow: '🙇 โค้ง', clap: '👏 ปรบมือ', happy: '🥳 ดีใจ', heart: '🫶 มือหัวใจ', think: '🤔 คิด', kiss: '😘 ส่งจูบ',
    surprised: '😲 ตกใจดีใจ', peace: '✌️ ชูสองนิ้ว', shy: '☺️ เขิน', dance: '💃 เต้น', spin: '🌀 หมุนตัว', scared: '😱 กลัวผี', splash: '💦 สาดน้ำ', cheer: '🎉 เชียร์',
    nod: '🙂 พยักหน้า', bless: '🤚 ให้พร',
  };
  // ข้อมูลชุดแต่ละธีม (ชื่อชุด ตำแหน่งเริ่มต้น ตัวละครเริ่มต้น) จาก avatar-outfits.js
  let OUT = null;
  import('/avatar-outfits.js').then((m) => {
    OUT = m;
    if (config) fillAvatar(config);
  }).catch(() => {});
  const avTheme = () => config?.theme || 'concert';
  const av2d = () => $('avStyle').value === '2d';
  const avLayoutKey = () => avTheme() + ($('avFraming').value === 'half' ? '_half' : '') + (av2d() ? '_2d' : '');
  function avLayoutOf(a) {
    const saved = a.layouts?.[avLayoutKey()];
    if (saved) return saved;
    if (av2d()) {
      const A2 = window.StageAvatar2D;
      return $('avFraming').value === 'half' ? A2.halfLayout : A2.themeLayout(avTheme());
    }
    const def = OUT?.THEME_LAYOUT?.[avTheme()] || { x: 540, y: 1700, h: 780 };
    return $('avFraming').value === 'half' ? OUT?.HALF_LAYOUT || { x: 330, y: 1950, h: 1150 } : def;
  }
  let avMap = {};
  let motions = [];
  function renderAvMap() {
    const tbl = $('avMapTbl');
    if ($('avMapTbl').contains(document.activeElement)) return;
    tbl.innerHTML = '';
    for (const [ev, label] of Object.entries(AV_EVENTS)) {
      const tr = document.createElement('tr');
      const td1 = document.createElement('td');
      td1.textContent = label;
      const td2 = document.createElement('td');
      const sel = document.createElement('select');
      sel.dataset.ev = ev;
      sel.add(new Option('ค่าเริ่มต้น (ตามธีม)', ''));
      sel.add(new Option('— ไม่ทำท่า —', 'none'));
      for (const [k, n] of Object.entries(AV_POSES)) sel.add(new Option(n, k));
      for (const m of motions) sel.add(new Option(`🎞️ ${m.name}`, 'file:' + m.name));
      sel.value = avMap[ev] || '';
      if (sel.value !== (avMap[ev] || '')) sel.value = '';
      td2.appendChild(sel);
      tr.append(td1, td2);
      tbl.appendChild(tr);
    }
  }
  async function loadMotions() {
    try {
      motions = await (await fetch('/api/motions')).json();
    } catch {
      motions = [];
    }
    const box = $('mvList');
    box.innerHTML = motions.length ? '' : '<span class="muted">ยังไม่มีไฟล์ท่าทาง</span>';
    for (const m of motions) {
      const row = document.createElement('div');
      row.className = 'mv-row';
      const b = document.createElement('b');
      b.textContent = `🎞️ ${m.name}`;
      const sz = document.createElement('span');
      sz.className = 'muted';
      sz.textContent = `${(m.size / 1e6).toFixed(1)} MB`;
      const play = document.createElement('button');
      play.className = 'btn sm';
      play.textContent = '▶ ทดสอบ';
      play.onclick = () => socket.emit('avatar:pose', 'file:' + m.name);
      const del = document.createElement('button');
      del.className = 'btn sm danger';
      del.textContent = 'ลบ';
      del.onclick = async () => {
        if (!confirm(`ลบท่า ${m.name}?`)) return;
        await fetch('/api/motions/' + encodeURIComponent(m.name), { method: 'DELETE' });
        loadMotions();
      };
      row.append(b, sz, play, del);
      box.appendChild(row);
    }
    // ปุ่มทดสอบท่าจากไฟล์
    const btns = $('avClipBtns');
    btns.innerHTML = '';
    for (const m of motions) {
      const bt = document.createElement('button');
      bt.className = 'btn';
      bt.textContent = `🎞️ ${m.name.replace(/\.(fbx|vrma)$/i, '')}`;
      bt.onclick = () => socket.emit('avatar:pose', 'file:' + m.name);
      btns.appendChild(bt);
    }
    renderAvMap();
  }
  $('mvUpload').onclick = async () => {
    const files = [...$('mvFile').files];
    if (!files.length) return ($('mvMsg').textContent = 'เลือกไฟล์ .fbx หรือ .vrma ก่อน');
    for (const f of files) {
      $('mvMsg').textContent = `กำลังอัปโหลด ${f.name}...`;
      const r = await fetch('/api/motions?name=' + encodeURIComponent(f.name), { method: 'POST', body: f, headers: { 'Content-Type': 'application/octet-stream' } });
      const j = await r.json().catch(() => ({}));
      if (!j.ok) return ($('mvMsg').textContent = `✕ ${f.name}: ${j.error || 'อัปโหลดไม่สำเร็จ'}`);
    }
    $('mvMsg').textContent = `✓ เพิ่มแล้ว ${files.length} ไฟล์`;
    $('mvFile').value = '';
    loadMotions();
  };
  $('avMapSave').onclick = () => {
    avMap = {};
    document.querySelectorAll('#avMapTbl select').forEach((s) => s.value && (avMap[s.dataset.ev] = s.value));
    saveGlobal({ avatar: { ...avForm(), map: avMap } }, () => flashSaved('avMapSaved'));
  };
  $('avModelSel').addEventListener('change', () => saveGlobal({ avatar: avForm(false) }));
  // เปลี่ยนมุมกล้อง/รูปแบบ → ตำแหน่งของแบบนั้น (เก็บแยกกัน)
  $('avStyle').addEventListener('change', () => $('avFraming').dispatchEvent(new Event('change')));
  $('avFraming').addEventListener('change', () => {
    const lay = avLayoutOf(config?.avatar || {});
    $('avX').value = lay.x;
    $('avY').value = lay.y;
    $('avH').value = lay.h;
    showAv();
    saveGlobal({ avatar: avForm(false) });
  });
  // ปุ่มลัด ฝั่งซ้าย/กลาง/ขวา (ซ้าย-ขวาหลบกล่องข้อความ)
  document.querySelectorAll('[data-avx]').forEach((b) => {
    b.onclick = () => {
      const half = $('avFraming').value === 'half';
      $('avX').value = { left: half ? 330 : 270, center: 540, right: half ? 760 : 800 }[b.dataset.avx];
      $('avX').dispatchEvent(new Event('input'));
    };
  });
  $('avResetPos').onclick = () => {
    const a = config?.avatar || {};
    const layouts = { ...(a.layouts || {}) };
    delete layouts[avLayoutKey()];
    saveGlobal({ avatar: { ...avForm(false), layouts } }, () => {
      const lay = avLayoutOf({ ...a, layouts });
      $('avX').value = lay.x;
      $('avY').value = lay.y;
      $('avH').value = lay.h;
      showAv();
    });
  };
  $('avPreview').onclick = () => {
    const v = $('avModelSel').value;
    window.open(`/stage.html?silent${v !== 'auto' && v !== 'custom' ? '&avatar=' + v : ''}`, '_blank');
  };
  let motionsLoaded = false;

  function fillAvatar(c) {
    const a = c.avatar || {};
    if (!motionsLoaded) {
      motionsLoaded = true;
      loadMotions();
    }
    avMap = a.map || {};
    renderAvMap();
    const th = avTheme();
    $('avThemeName').textContent = c.themes?.[th]?.meta?.name || th;
    const sel = $('avModelSel');
    const defModel = OUT?.THEME_MODEL?.[th];
    const autoName = `อัตโนมัติ — ${(a.models || {})[defModel] || 'ตามธีม'} (แนะนำ)`;
    const want = 1 + Object.keys(a.models || {}).length + (a.custom ? 1 : 0);
    if (sel.options.length !== want) {
      sel.innerHTML = '';
      sel.add(new Option(autoName, 'auto'));
      for (const [k, n] of Object.entries(a.models || {})) sel.add(new Option(n, k));
      if (a.custom) sel.add(new Option('📦 ตัวที่อัปโหลดเอง', 'custom'));
    }
    sel.options[0].textContent = autoName;
    const cur = a.themeModels?.[th] || (a.model && a.model !== 'auto' ? a.model : 'auto');
    if (document.activeElement !== sel) sel.value = cur;
    $('avModel').textContent = cur === 'custom' ? 'ตัวละครที่อัปโหลดเอง' : (a.models || {})[cur === 'auto' ? defModel : cur] || '-';
    $('avOutfitLabel').textContent = OUT?.OUTFITS?.[th]?.label || '';
    if ($('page-avatar').contains(document.activeElement)) return;
    $('avOn').checked = !!a.enabled;
    $('avReact').checked = a.react !== false;
    $('avOutfit').checked = a.outfit !== false;
    $('avOutline').value = String(a.outline ?? 2);
    $('avFront').checked = !!a.front;
    $('avAA').value = a.aa || '8x';
    $('avStyle').value = a.style === '2d' ? '2d' : '3d';
    $('avFraming').value = a.framing === 'half' ? 'half' : 'full';
    const lay = avLayoutOf(a);
    $('avX').value = lay.x;
    $('avY').value = lay.y;
    $('avH').value = lay.h;
    showAv();
  }
  function showAv() {
    $('avXV').textContent = $('avX').value;
    $('avYV').textContent = $('avY').value;
    $('avHV').textContent = $('avH').value + ' px';
    $('avSensV').textContent = $('avSens').value;
  }
  // ค่าที่ส่งไปบันทึก: ตำแหน่งเก็บแยกตามธีม, ตัวละครเลือกแยกตามธีม
  const avForm = (withLayout = true) => {
    const a = config?.avatar || {};
    const themeModels = { ...(a.themeModels || {}) };
    const m = $('avModelSel').value;
    if (m === 'auto') delete themeModels[avTheme()];
    else themeModels[avTheme()] = m;
    const layouts = { ...(a.layouts || {}) };
    if (withLayout) layouts[avLayoutKey()] = { x: Number($('avX').value), y: Number($('avY').value), h: Number($('avH').value) };
    return {
      enabled: $('avOn').checked, react: $('avReact').checked, outfit: $('avOutfit').checked, framing: $('avFraming').value,
      outline: Number($('avOutline').value), front: $('avFront').checked, aa: $('avAA').value, style: $('avStyle').value,
      bubble: $('avBubble').checked, wander: $('avWander').checked,
      x: a.x, y: a.y, h: a.h, model: 'auto', themeModels, layouts, map: avMap,
    };
  };
  let avTimer = null;
  // เลื่อนแล้วหน้าเวทีเปลี่ยนตามทันที
  for (const id of ['avX', 'avY', 'avH', 'avOn', 'avReact', 'avOutfit', 'avFront', 'avOutline', 'avAA', 'avBubble', 'avWander']) {
    $(id).addEventListener('input', () => {
      showAv();
      clearTimeout(avTimer);
      avTimer = setTimeout(() => saveGlobal({ avatar: avForm() }), 200);
    });
  }
  $('avSens').addEventListener('input', showAv);
  $('avSave').onclick = () => saveGlobal({ avatar: avForm() }, () => flashSaved('avSaved'));
  document.querySelectorAll('[data-pose]').forEach((b) => (b.onclick = () => socket.emit('avatar:pose', b.dataset.pose)));
  $('avUpload').onclick = async () => {
    const f = $('avFile').files[0];
    if (!f) return ($('avUpMsg').textContent = 'เลือกไฟล์ .vrm ก่อน');
    $('avUpMsg').textContent = `กำลังอัปโหลด ${(f.size / 1e6).toFixed(1)} MB...`;
    try {
      const r = await fetch('/api/avatar', { method: 'POST', body: f, headers: { 'Content-Type': 'application/octet-stream' } });
      const j = await r.json();
      $('avUpMsg').textContent = j.ok ? '✓ อัปโหลดแล้ว หน้าเวทีกำลังโหลดตัวละครใหม่' : `✕ ${j.error || 'อัปโหลดไม่สำเร็จ'}`;
    } catch (e) {
      $('avUpMsg').textContent = `✕ ${e.message}`;
    }
  };
  $('avReset').onclick = async () => {
    if (!confirm('ลบตัวละครที่อัปโหลด แล้วกลับไปใช้ตัวอย่าง?')) return;
    await fetch('/api/avatar', { method: 'DELETE' });
    $('avUpMsg').textContent = '✓ กลับไปใช้ตัวอย่างแล้ว';
  };
  // ไมค์ → ระดับเสียง → ส่งให้หน้าเวที (ปากขยับตามเสียงคนไลฟ์)
  let avMic = null;
  $('avMic').onclick = async () => {
    if (avMic) {
      clearInterval(avMic.timer);
      avMic.stream.getTracks().forEach((t) => t.stop());
      avMic.ctx.close();
      avMic = null;
      socket.emit('avatar:mouth', 0);
      $('avMic').textContent = '🎤 เริ่มขยับปากตามไมค์';
      $('avMicMeter').textContent = '';
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const ctx = new AudioContext();
      const an = ctx.createAnalyser();
      an.fftSize = 1024;
      ctx.createMediaStreamSource(stream).connect(an);
      const buf = new Float32Array(an.fftSize);
      const timer = setInterval(() => {
        an.getFloatTimeDomainData(buf);
        let sum = 0;
        for (const v of buf) sum += v * v;
        const rms = Math.sqrt(sum / buf.length);
        const lv = Math.min(1, Math.max(0, (rms - 0.008) * Number($('avSens').value) * 4));
        socket.emit('avatar:mouth', lv);
        $('avMicMeter').textContent = '▮'.repeat(Math.round(lv * 12)) || '·';
      }, 50);
      avMic = { stream, ctx, timer };
      $('avMic').textContent = '⏹ หยุดขยับปากตามไมค์';
    } catch (e) {
      $('avMicMeter').textContent = `✕ เปิดไมค์ไม่ได้ (${e.message})`;
    }
  };

  // ---------------- เผื่อขอบมือถือ
  function fillSafeArea(c) {
    if ($('safeAreaCard').contains(document.activeElement)) return;
    $('safeOn').checked = !!c.safeArea?.enabled;
    $('safeLevel').value = c.safeArea?.level || 'mid';
  }
  $('safeSave').onclick = () => saveGlobal({ safeArea: { enabled: $('safeOn').checked, level: $('safeLevel').value } }, () => flashSaved('safeSaved'));

  // ---------------- ดนตรีพื้นหลัง
  function fillMusic(c) {
    const m = c.music || {};
    const sel = $('musicStyle');
    const autoName = `อัตโนมัติ ตามธีม (ตอนนี้: ${StageMusic.STYLES[c.theme]?.name || '-'})`;
    if (!sel.options.length) {
      sel.add(new Option(autoName, 'auto'));
      for (const s of StageMusic.list()) sel.add(new Option(s.name, s.id));
    }
    sel.options[0].textContent = autoName;
    if ($('musicCard').contains(document.activeElement)) return;
    $('musicOn').checked = m.enabled !== false;
    $('musicVol').value = m.volume ?? 0.35;
    $('musicDuck').checked = m.duck !== false;
    sel.value = m.style || 'auto';
    showMusicVol();
  }
  const showMusicVol = () => ($('musicVolV').textContent = `${Math.round(Number($('musicVol').value) * 100)}%`);
  const musicForm = () => ({ enabled: $('musicOn').checked, volume: Number($('musicVol').value), duck: $('musicDuck').checked, style: $('musicStyle').value });
  const musicStyleNow = () => ($('musicStyle').value === 'auto' ? (StageMusic.has(config.theme) ? config.theme : 'concert') : $('musicStyle').value);
  $('musicSave').onclick = () => saveGlobal({ music: musicForm() }, () => flashSaved('musicSaved'));
  // ฟังตัวอย่างในหน้านี้ (ไม่ออกไลฟ์)
  let preview = null;
  let previewCtx = null;
  $('musicHere').onclick = () => {
    if (!previewCtx) previewCtx = new AudioContext();
    if (!preview) preview = StageMusic.create(previewCtx, previewCtx.destination);
    previewCtx.resume();
    const on = !preview.playing;
    preview.set({ style: musicStyleNow(), volume: Number($('musicVol').value), enabled: on });
    $('musicHere').textContent = on ? '■ หยุดตัวอย่าง' : '▶ ฟังตัวอย่างที่นี่';
  };
  $('musicVol').addEventListener('input', () => {
    showMusicVol();
    if (preview?.playing) preview.set({ volume: Number($('musicVol').value) });
  });
  $('musicStyle').addEventListener('change', () => preview?.playing && preview.set({ style: musicStyleNow() }));

  // ---------------- ข้อความแนะนำคำสั่ง (กล่องซ้ายบนจอ)
  function fillHints(c) {
    const h = c.hints || {};
    const g = c.games || {};
    const t = tset();
    $('hRequestLbl').innerHTML = t.requestCommand ? `คำสั่งคำขอ <span class="muted">— "${t.requestCommand} ..."</span>` : 'คำสั่งคำขอ <span class="muted">(ธีมนี้ปิดคำสั่งคำขออยู่)</span>';
    $('hThemeRow').style.display = meta().hint ? '' : 'none';
    $('hThemeLbl').innerHTML = `คำสั่งของธีม <span class="muted">— ${meta().hint || ''}</span>`;
    $('hFortuneLbl').innerHTML = `เซียมซี <span class="muted">— "${g.fortuneCommand || 'เซียมซี'}"${g.fortune === false ? ' (ปิดเซียมซีอยู่ในหน้าเกม)' : ''}</span>`;
    $('hLevelLbl').innerHTML = `เลเวล <span class="muted">— "เลเวล"${g.levels === false ? ' (ปิดเลเวลอยู่ในหน้าเกม)' : ''}</span>`;
    if (!$('hintsCard').contains(document.activeElement)) {
      $('hRequest').checked = h.request !== false;
      $('hTheme').checked = h.theme !== false;
      $('hFortune').checked = h.fortune !== false;
      $('hLevel').checked = h.level !== false;
      $('hTeam').checked = h.team !== false;
      $('hGame').checked = h.game !== false;
      $('hCustom').value = (h.custom || []).join('\n');
      $('hSec').value = h.seconds || 4;
    }
    renderHintPreview();
  }
  function hintForm() {
    return {
      request: $('hRequest').checked,
      theme: $('hTheme').checked,
      fortune: $('hFortune').checked,
      level: $('hLevel').checked,
      team: $('hTeam').checked,
      game: $('hGame').checked,
      custom: $('hCustom').value.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 10),
      seconds: Number($('hSec').value) || 4,
    };
  }
  // พรีวิวว่าตอนนี้บนจอจะหมุนข้อความอะไรบ้าง (คิดแบบเดียวกับหน้าเวที)
  function renderHintPreview() {
    if (!config) return;
    const h = hintForm();
    const g = config.games || {};
    const t = tset();
    const rows = [];
    const add = (on, text, why) => rows.push({ on, text, why });
    if (t.requestCommand) add(h.request, `พิมพ์ "${t.requestCommand} ..."`, 'ปิดอยู่');
    if (meta().hint) add(h.theme, meta().hint, 'ปิดอยู่');
    add(h.fortune && g.fortune !== false, `พิมพ์ "${g.fortuneCommand || 'เซียมซี'}" เสี่ยงทาย 🎋`, g.fortune === false ? 'ปิดเซียมซีอยู่' : 'ปิดอยู่');
    add(h.level && g.levels !== false, 'พิมพ์ "เลเวล" ดูเลเวลตัวเอง', g.levels === false ? 'ปิดเลเวลอยู่' : 'ปิดอยู่');
    const team = gstate.team;
    add(h.team && team?.status === 'running', team ? `พิมพ์ "${team.nameA}" หรือ "${team.nameB}" เข้าทีม` : 'เข้าทีม', team?.status === 'running' ? 'ปิดอยู่' : 'ยังไม่ได้เริ่มแข่งทีม');
    const c = gstate.card;
    add(h.game && c?.status === 'running', c ? (c.kind === 'poll' ? `โหวต! พิมพ์ 1-${c.options.length}` : c.kind === 'quiz' ? 'ควิซ! พิมพ์คำตอบในคอมเมนต์' : `ทายเลข! พิมพ์ ${c.min}-${c.max}`) : 'การ์ดเกม', c?.status === 'running' ? 'ปิดอยู่' : 'ไม่มีเกมเปิดอยู่');
    for (const x of h.custom) add(true, x, '');
    const box = $('hPreview');
    box.innerHTML = '';
    const onRows = rows.filter((r) => r.on);
    if (!onRows.length) box.innerHTML = '<li class="off">ไม่มี — บรรทัดแนะนำจะถูกซ่อน</li>';
    for (const r of rows) {
      const li = document.createElement('li');
      if (!r.on) {
        li.className = 'off';
        li.style.listStyle = 'none';
        li.textContent = `✕ ${r.text} (${r.why})`;
      } else li.textContent = r.text;
      box.appendChild(li);
    }
  }
  ['hRequest', 'hTheme', 'hFortune', 'hLevel', 'hTeam', 'hGame', 'hCustom'].forEach((id) => $(id).addEventListener('input', renderHintPreview));
  $('hSave').onclick = () => saveGlobal({ hints: hintForm() }, () => flashSaved('hSaved'));

  // ---------------- เกมคอมเมนต์
  let gstate = { team: null, card: null };
  let lastSecret = null;
  let lastQuizAnswers = [];
  const SIM_NAMES = ['น้องเมย์', 'พี่ต้น', 'ปลาทู', 'แม่ค้าออนไลน์', 'ก้อย_99', 'มะม่วง', 'ลูกชิ้น', 'ฟ้าใส', 'คุณชายไอติม', 'บอสใหญ่', 'แพรวา', 'จูน', 'เต้ย', 'มิ้นท์'];
  const simName = () => SIM_NAMES[Math.floor(Math.random() * SIM_NAMES.length)];

  function renderGames(g) {
    gstate = g;
    const t = g.team;
    $('teamStatus').textContent = !t ? 'ยังไม่เริ่ม' : t.status === 'running' ? '🟢 กำลังแข่ง' : '🏁 จบแล้ว';
    $('teamScore').textContent = t ? `${t.nameA} ${t.scoreA} (${t.countA} คน)  vs  ${t.nameB} ${t.scoreB} (${t.countB} คน)` : '';
    const c = g.card;
    const names = { poll: '📊 โพล', quiz: '❓ ควิซ', guess: '🔢 ทายเลข', type: '⚡ พิมพ์ไว' };
    $('cardStatus').textContent = !c ? 'ว่าง' : `${names[c.kind]}${c.auto ? ' (อัตโนมัติ)' : ''} • ${c.status === 'running' ? '🟢 กำลังเล่น' : '🏁 จบแล้ว'}`;
    let info = '';
    if (c?.kind === 'poll') info = `โหวตแล้ว ${c.total} คน`;
    if (c?.kind === 'quiz') info = c.winner ? `ผู้ชนะ: ${c.winner.name}` : `คำตอบ: ${lastQuizAnswers.join(' / ') || '(ซ่อน)'}`;
    if (c?.kind === 'type') info = c.winner ? `ผู้ชนะ: ${c.winner.name}${c.sec ? ` (${c.sec} วิ)` : ''}` : `ข้อความ: ${c.question}`;
    if (c?.kind === 'guess') info = c.winner ? `ผู้ชนะ: ${c.winner.name}` : `เลขลับ: ${lastSecret ?? '?'} • ทายแล้ว ${c.count || 0} ครั้ง • ช่วง ${c.lo}-${c.hi}`;
    $('cardInfo').textContent = info;
    $('gameLive').textContent = (t?.status === 'running' ? '⚔️' : '') + (c?.status === 'running' ? '🎯' : '') + (g.auto?.enabled ? '🤖' : '');
    renderHintPreview();
    renderAuto(g.auto);
  }

  // ---------------- เกมอัตโนมัติ
  let autoState = null;
  let autoFilled = false;
  function renderAuto(a) {
    if (!a) return;
    autoState = a;
    const phase = {
      off: '⏸ ปิดอยู่',
      offline: '📡 รอเชื่อมต่อไลฟ์ (เกมอัตโนมัติทำงานเฉพาะตอนไลฟ์)',
      busy: '🎯 มีเกมเล่นอยู่ — จะสุ่มเกมถัดไปหลังเกมนี้จบ',
      wait: '',
      announce: '',
    }[a.phase] ?? '';
    $('autoBadge').textContent = a.enabled ? '🟢 เปิด' : 'ปิด';
    $('autoStatus').dataset.phase = a.phase;
    $('autoStatus').textContent = phase || '...';
    updateAutoClock();
    $('autoNoNum').style.display = a.noNumber ? '' : 'none';
    {
      if (!autoFilled) {
        $('autoOn').checked = !!a.enabled;
        $('autoMin').value = a.minMin;
        $('autoMax').value = a.maxMin;
        $('autoQuiet').checked = !!a.quiet;
        $('autoQuietSec').value = a.quietSec;
        $('autoQuiz').checked = !!a.types.quiz;
        $('autoType').checked = !!a.types.type;
        $('autoPoll').checked = !!a.types.poll;
        $('autoGuess').checked = !!a.types.guess;
        autoFilled = true;
      }
    }
  }
  function updateAutoClock() {
    const a = autoState;
    if (!a) return;
    const left = (t) => {
      const s = Math.max(0, Math.ceil((t - Date.now()) / 1000));
      return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    };
    if (a.phase === 'wait') $('autoStatus').textContent = a.nextAt ? `⏳ เกมถัดไปใน ${left(a.nextAt)} — ${a.label || 'สุ่ม'}${a.note ? ' • ' + a.note : ''}` : '⏳ กำลังสุ่มเกมถัดไป';
    if (a.phase === 'announce') $('autoStatus').textContent = `📣 ประกาศบนจอแล้ว — ${a.label} เริ่มใน ${left(a.startAt)}`;
  }
  setInterval(updateAutoClock, 1000);
  function loadBank() {
    socket.emit('game:bank', null, (b) => {
      if (!b) return;
      $('bankTheme').textContent = config?.themes?.[b.theme]?.meta?.name || b.theme;
      if (!$('autoCard').matches(':focus-within')) {
        $('bankQuiz').value = b.custom.quiz || '';
        $('bankPoll').value = b.custom.poll || '';
        $('bankType').value = b.custom.type || '';
      }
      const cnt = (k) => (b.counts[k] ? `(${b.counts[k]} ข้อ)` : b.builtin[k] ? '(ปิดอยู่เพื่อความปลอดภัย)' : '(ธีมนี้ไม่มี)');
      $('cntQuiz').textContent = cnt('quiz');
      $('cntType').textContent = cnt('type');
      $('cntPoll').textContent = cnt('poll');
      $('cntGuess').textContent = cnt('guess');
    });
  }
  const autoForm = () => ({
    enabled: $('autoOn').checked,
    minMin: Number($('autoMin').value),
    maxMin: Number($('autoMax').value),
    quiet: $('autoQuiet').checked,
    quietSec: Number($('autoQuietSec').value),
    types: { quiz: $('autoQuiz').checked, type: $('autoType').checked, poll: $('autoPoll').checked, guess: $('autoGuess').checked },
  });
  $('autoSave').onclick = () => {
    const custom = { quiz: $('bankQuiz').value, poll: $('bankPoll').value, type: $('bankType').value };
    socket.emit('game:autoSave', { auto: autoForm(), custom }, (r) => {
      flashSaved('autoSaved');
      $('autoMsg').textContent = r?.rejected?.length ? `🛡️ ไม่บันทึก ${r.rejected.length} ข้อที่มีคำต้องห้าม: ${r.rejected.slice(0, 3).join(' • ')}` : '';
      autoFilled = false;
      loadBank();
    });
  };
  $('autoNow').onclick = () => socket.emit('game:autoNow', null, (r) => ($('autoMsg').textContent = r?.ok ? '' : `✕ ${r?.error || 'เริ่มไม่ได้'}`));
  $('autoSkip').onclick = () => socket.emit('game:autoSkip');
  socket.on('game:answer', (a) => {
    lastQuizAnswers = a;
    renderGames(gstate);
  });
  function fillGameCfg(c) {
    const g = c.games || {};
    if (document.activeElement && $('page-games').contains(document.activeElement)) return;
    $('gFortune').checked = g.fortune !== false;
    $('gFortuneCmd').value = g.fortuneCommand || 'เซียมซี';
    $('gLevels').checked = g.levels !== false;
    $('gWelcome').checked = g.welcome !== false;
  }

  $('teamStart').onclick = () => socket.emit('game:teamStart', { nameA: $('teamA').value, nameB: $('teamB').value, minutes: Number($('teamMin').value) });
  $('teamEnd').onclick = () => socket.emit('game:teamEnd');
  $('teamClear').onclick = () => socket.emit('game:teamClear');
  $('pollStart').onclick = () => {
    const options = [...document.querySelectorAll('.pollOpt')].map((i) => i.value.trim()).filter(Boolean);
    if (options.length < 2) return alert('ใส่ตัวเลือกอย่างน้อย 2 ข้อ');
    socket.emit('game:pollStart', { question: $('pollQ').value, options, seconds: Number($('pollSec').value) });
  };
  $('quizStart').onclick = () => {
    if (!$('quizA').value.trim()) return alert('ใส่คำตอบก่อน');
    lastQuizAnswers = $('quizA').value.split('|').map((x) => x.trim()).filter(Boolean);
    socket.emit('game:quizStart', { question: $('quizQ').value, answer: $('quizA').value, seconds: Number($('quizSec').value) });
  };
  $('typeStart').onclick = () => {
    const p = $('typeP').value.trim();
    if (!p) return alert('ใส่ข้อความให้พิมพ์ก่อน');
    lastQuizAnswers = [p];
    socket.emit('game:typeStart', { phrase: p, seconds: Number($('typeSec').value) });
  };
  $('guessStart').onclick = () => socket.emit('game:guessStart', { min: Number($('guessMin').value), max: Number($('guessMax').value), seconds: Number($('guessSec').value) });
  $('cardEnd').onclick = () => socket.emit('game:cardEnd');
  $('cardClear').onclick = () => socket.emit('game:cardClear');
  $('gSave').onclick = () =>
    saveGlobal({ games: { fortune: $('gFortune').checked, fortuneCommand: $('gFortuneCmd').value.trim() || 'เซียมซี', levels: $('gLevels').checked, welcome: $('gWelcome').checked } }, () => flashSaved('gSaved'));

  function loadTopFans() {
    socket.emit('game:topFans', null, (list) => {
      const box = $('topFans');
      box.innerHTML = '';
      if (!list.length) return (box.textContent = 'ยังไม่มีข้อมูล');
      list.slice(0, 10).forEach((f, i) => {
        const d = document.createElement('div');
        d.style.padding = '3px 0';
        d.style.color = 'var(--text)';
        d.textContent = `${i + 1}. ${f.name} — Lv.${f.lv} (XP ${f.xp}) • มา ${f.lives} ไลฟ์`;
        box.appendChild(d);
      });
    });
  }
  $('fansRefresh').onclick = loadTopFans;
  $('fansReset').onclick = () => confirm('ล้างเลเวลและประวัติแฟนทั้งหมด? (ย้อนกลับไม่ได้)') && socket.emit('game:resetFans', null, loadTopFans);

  // จำลองคนดูเล่นเกม (ทดสอบ)
  $('simPlay').onclick = () => {
    const t = gstate.team;
    const c = gstate.card;
    if (!t && !c) return alert('ยังไม่มีเกมที่เปิดอยู่ — เริ่มแข่งทีมหรือการ์ดเกมก่อน');
    for (let i = 0; i < 10; i++) {
      setTimeout(() => {
        const name = simName();
        if (t?.status === 'running' && Math.random() < 0.6) {
          socket.emit('test:chat', { name, text: Math.random() < 0.5 ? t.nameA : t.nameB });
          if (Math.random() < 0.5) socket.emit('test:like', { name });
          return;
        }
        if (c?.status !== 'running') return;
        if (c.kind === 'poll') socket.emit('test:chat', { name, text: String(1 + Math.floor(Math.random() * c.options.length)) });
        if (c.kind === 'type') socket.emit('test:chat', { name, text: i === 9 ? c.question : c.question.slice(0, -1) + 'ๆ' });
        if (c.kind === 'quiz') {
          const right = i === 9 && lastQuizAnswers.length;
          socket.emit('test:chat', { name, text: right ? lastQuizAnswers[0] : ['ไม่รู้อ่ะ', 'เชียงใหม่', 'ภูเก็ต', '555', 'ข้อนี้ยาก'][i % 5] });
        }
        if (c.kind === 'guess') {
          const g = gstate.card;
          const n = i === 9 && lastSecret != null ? lastSecret : g.lo + Math.floor(Math.random() * (g.hi - g.lo + 1));
          socket.emit('test:chat', { name, text: String(n) });
        }
      }, i * 450);
    }
  };
  $('simFortune').onclick = () => {
    const cmd = $('gFortuneCmd').value.trim() || 'เซียมซี';
    [0, 1, 2].forEach((i) => setTimeout(() => socket.emit('test:chat', { name: simName(), text: cmd }), i * 700));
  };
  $('simLevel').onclick = () => socket.emit('test:chat', { name: $('tName').value.trim() || simName(), text: 'เลเวล' });

  socket.on('games', renderGames);
  socket.on('game:secret', (n) => {
    lastSecret = n;
    renderGames(gstate);
  });

  // ================================================================ ความปลอดภัย
  let safetyData = null;
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const hhmm = (t) => new Date(t).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  socket.on('connect', () => socket.emit('admin:hello'));
  socket.on('safetyFull', (d) => {
    safetyData = d;
    renderSafetyForm();
    renderRecent();
    renderFiltered();
    renderBlocked();
  });
  socket.on('filtered', (item) => {
    if (!safetyData) return;
    safetyData.filtered.unshift(item);
    safetyData.filtered.length = Math.min(safetyData.filtered.length, 100);
    renderFiltered();
  });
  socket.on('modChat', (item) => {
    if (!safetyData) return;
    safetyData.recent.unshift(item);
    safetyData.recent.length = Math.min(safetyData.recent.length, 40);
    renderRecent();
  });

  function renderSafetyForm() {
    const c = safetyData.cfg;
    $('safeCard').classList.toggle('on', !!c.safeMode);
    $('sfSafeBadge').textContent = c.safeMode ? 'เปิดอยู่ ✓' : 'ปิดอยู่';
    $('safeNav').textContent = c.safeMode ? '🟢' : '!';
    $('safeNav').className = c.safeMode ? 'muted' : 'nwarn';
    $('safeNav').title = c.safeMode ? 'โหมดปลอดภัยเปิดอยู่' : 'ยังไม่ได้เปิดโหมดปลอดภัย';
    if ($('page-safety').contains(document.activeElement)) return;
    $('sfSafe').checked = !!c.safeMode;
    $('sfFilter').checked = c.filter !== false;
    $('sfMode').value = c.mode || 'hide';
    $('sfLinks').checked = c.links !== false;
    $('sfPhones').checked = c.phones !== false;
    $('sfContacts').checked = c.contacts !== false;
    const box = $('sfCats');
    box.innerHTML = '';
    for (const [cat, label] of Object.entries(safetyData.labels)) {
      const wrap = document.createElement('div');
      wrap.className = 'field';
      wrap.innerHTML = `<label class="check" style="margin:2px 0"><input type="checkbox" data-cat="${cat}" /> ${esc(label)}</label><textarea rows="2" data-words="${cat}"></textarea>`;
      wrap.querySelector('input').checked = c.cats?.[cat] !== false;
      const ta = wrap.querySelector('textarea');
      ta.value = c.words?.[cat] || '';
      ta.placeholder = `เว้นว่าง = ใช้รายการเริ่มต้น: ${safetyData.defaults[cat]}`;
      box.appendChild(wrap);
    }
    $('sfCustom').value = c.words?.custom || '';
    $('sfAllow').value = c.allow || '';
  }
  function safetyForm() {
    const cats = {};
    const words = { custom: $('sfCustom').value };
    document.querySelectorAll('#sfCats [data-cat]').forEach((i) => (cats[i.dataset.cat] = i.checked));
    document.querySelectorAll('#sfCats [data-words]').forEach((t) => (words[t.dataset.words] = t.value));
    return { safeMode: $('sfSafe').checked, filter: $('sfFilter').checked, mode: $('sfMode').value, links: $('sfLinks').checked, phones: $('sfPhones').checked, contacts: $('sfContacts').checked, cats, words, allow: $('sfAllow').value };
  }
  $('sfSafe').addEventListener('change', () => socket.emit('safety:save', { safeMode: $('sfSafe').checked }));
  $('sfSave').onclick = () => socket.emit('safety:save', safetyForm(), () => flashSaved('sfSaved'));
  $('sfReset').onclick = () => {
    document.querySelectorAll('#sfCats [data-words]').forEach((t) => (t.value = ''));
    socket.emit('safety:save', safetyForm(), () => flashSaved('sfSaved'));
  };
  $('sfTestBtn').onclick = () =>
    socket.emit('safety:check', $('sfTest').value, (r) => {
      $('sfTestOut').innerHTML = r.hit
        ? `<span style="color:var(--bad)">✕ ถูกกรอง</span> — ${esc(r.reasons.join(', '))}<br>ถ้าตั้งเป็นแบบ *** จะขึ้นว่า: <b style="color:var(--text)">${esc(r.masked)}</b>`
        : '<span style="color:var(--ok)">✓ ผ่าน ขึ้นจอได้</span>';
    });
  $('sfTest').addEventListener('keydown', (e) => e.key === 'Enter' && $('sfTestBtn').click());

  function modButtons(item) {
    const row = document.createElement('div');
    row.className = 'row';
    row.style.flexWrap = 'nowrap';
    const hide = Object.assign(document.createElement('button'), { className: 'btn sm', textContent: '🙈 ซ่อน', title: 'ซ่อนบับเบิลบนหน้าเวทีทันที' });
    hide.onclick = () => socket.emit('safety:hide', item.id);
    const block = Object.assign(document.createElement('button'), { className: 'btn sm danger', textContent: '🚫 บล็อก' });
    block.onclick = () => confirm(`บล็อก "${item.name}"? ข้อความของคนนี้จะไม่ขึ้นหน้าเวทีอีก`) && socket.emit('safety:block', { id: item.id, name: item.name });
    row.append(hide, block);
    return row;
  }
  function renderRecent() {
    const box = $('sfRecent');
    box.innerHTML = '';
    if (!safetyData.recent.length) return (box.innerHTML = '<div class="muted">ยังไม่มีคอมเมนต์</div>');
    for (const it of safetyData.recent) {
      const d = document.createElement('div');
      d.className = 'mod-item' + (it.hidden ? ' hid' : '');
      d.innerHTML = `<div class="mt"><span class="muted">${hhmm(it.t)}</span> <b>${esc(it.name)}</b>: ${esc(it.text)}${it.hidden ? ' <span class="why">(ถูกกรอง ไม่ขึ้นจอ)</span>' : ''}</div>`;
      d.appendChild(modButtons(it));
      box.appendChild(d);
    }
  }
  function renderFiltered() {
    const box = $('sfFiltered');
    box.innerHTML = '';
    if (!safetyData.filtered.length) return (box.innerHTML = '<div class="muted">ยังไม่มีข้อความถูกกรอง 👍</div>');
    for (const it of safetyData.filtered) {
      const d = document.createElement('div');
      d.className = 'mod-item hid';
      d.innerHTML = `<div class="mt"><span class="muted">${hhmm(it.t)} • ${esc(it.where)}</span> <b>${esc(it.name)}</b>: ${esc(it.text)}<div class="why">${esc(it.reasons.join(', '))}</div></div>`;
      const block = Object.assign(document.createElement('button'), { className: 'btn sm danger', textContent: '🚫 บล็อก' });
      block.onclick = () => confirm(`บล็อก "${it.name}"?`) && socket.emit('safety:block', { id: it.id, name: it.name });
      d.appendChild(block);
      box.appendChild(d);
    }
  }
  function renderBlocked() {
    const box = $('sfBlocked');
    box.innerHTML = '';
    const list = safetyData.cfg.blocked || [];
    if (!list.length) return (box.innerHTML = '<div class="muted">ยังไม่ได้บล็อกใคร</div>');
    for (const b of list) {
      const d = document.createElement('div');
      d.className = 'mod-item';
      d.innerHTML = `<div class="mt"><b>${esc(b.name)}</b> <span class="muted">(${esc(b.id)})</span></div>`;
      const un = Object.assign(document.createElement('button'), { className: 'btn sm', textContent: 'ปลดบล็อก' });
      un.onclick = () => socket.emit('safety:unblock', b.id);
      d.appendChild(un);
      box.appendChild(d);
    }
  }

  // ---------------- เช็กก่อนไลฟ์ (จำไว้ในเครื่อง รีเซ็ตทุกวัน)
  const CHECKS = [
    'คนไลฟ์อายุ 18 ปีขึ้นไป และไม่มีเด็กอยู่ในเฟรมตามลำพัง',
    'ไม่ได้ไลฟ์ในรถ หรือในสถานที่ราชการที่เห็นโลโก้หน่วยงาน',
    'ไม่ใส่ชุดนักเรียน หรือชุดอาชีพ (หมอ ตำรวจ พยาบาล ครู)',
    'ไม่มีเหล้า บุหรี่ บุหรี่ไฟฟ้า ยา หรืออาวุธติดกล้อง',
    'เพลงพื้นหลังมาจากคลังเพลงของ TikTok เท่านั้น',
    'ไม่มีเบอร์โทร ไอดีไลน์ QR หรือโลโก้แอปอื่นบนจอ',
    'เปิดโหมดปลอดภัย / ตัวกรองคำต้องห้ามแล้ว',
    'จะอยู่คุยกับคนดูตลอด ไม่เปิดหน้าเวทีทิ้งไว้',
    'ไม่พูดเรื่องหวย/การพนัน และไม่แจกรางวัลจริงให้คนส่งของขวัญแล้วสุ่มได้',
    '(ไลฟ์จากมือถือ) เปิดโหมดห้ามรบกวนแล้ว',
  ];
  const ckKey = () => 'prelive-' + new Date().toISOString().slice(0, 10);
  const ckLoad = () => {
    try {
      return JSON.parse(localStorage.getItem(ckKey()) || '[]');
    } catch {
      return [];
    }
  };
  const ckSave = (v) => {
    try {
      localStorage.setItem(ckKey(), JSON.stringify(v));
    } catch {}
  };
  function renderChecklist() {
    const done = ckLoad();
    const box = $('ckList');
    box.innerHTML = '';
    CHECKS.forEach((text, i) => {
      const l = document.createElement('label');
      l.className = 'ck-item';
      l.innerHTML = '<input type="checkbox" /><span></span>';
      l.querySelector('span').textContent = text;
      const cb = l.querySelector('input');
      cb.checked = done.includes(i);
      cb.onchange = () => {
        const v = new Set(ckLoad());
        cb.checked ? v.add(i) : v.delete(i);
        ckSave([...v]);
        updateCkBadge();
      };
      box.appendChild(l);
    });
    updateCkBadge();
  }
  function updateCkBadge() {
    const n = ckLoad().length;
    $('ckBadge').textContent = `${n}/${CHECKS.length}`;
    $('ckBadge').style.color = n === CHECKS.length ? 'var(--ok)' : 'var(--warn)';
  }
  $('ckClear').onclick = () => {
    ckSave([]);
    renderChecklist();
  };
  renderChecklist();
  // ก่อนกดเชื่อมต่อ ถ้ายังเช็กไม่ครบ ถามก่อน
  $('btnConnect').addEventListener(
    'click',
    (e) => {
      const n = ckLoad().length;
      if (n < CHECKS.length && !confirm(`ยังเช็กรายการก่อนไลฟ์ไม่ครบ (${n}/${CHECKS.length}) — ดูได้ที่หน้า 🛡️ ความปลอดภัย\nเชื่อมต่อต่อเลยไหม?`)) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    },
    true,
  );

  // ---------------- ตัวเตือนไลฟ์เงียบ (ฟังไมค์ในหลังบ้าน)
  const SN_KEY = 'silence-cfg';
  let sn = { on: false, min: 3, sens: 8 };
  try {
    sn = { ...sn, ...JSON.parse(localStorage.getItem(SN_KEY) || '{}') };
  } catch {}
  let snStream = null;
  let snTimer = null;
  let lastVoice = Date.now();
  let lastBeep = 0;
  const snSave = () => {
    try {
      localStorage.setItem(SN_KEY, JSON.stringify(sn));
    } catch {}
  };
  function snShowSens() {
    $('snSensV').textContent = sn.sens;
    $('snThr').style.left = Math.min(100, sn.sens * 2) + '%';
  }
  async function snStart() {
    try {
      snStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } });
    } catch (e) {
      $('snStatus').textContent = `เปิดไมค์ไม่ได้: ${e.message} — กดอนุญาตไมค์ในเบราว์เซอร์`;
      $('snOn').checked = sn.on = false;
      snSave();
      return;
    }
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const an = ac.createAnalyser();
    an.fftSize = 1024;
    ac.createMediaStreamSource(snStream).connect(an);
    const buf = new Float32Array(an.fftSize);
    lastVoice = Date.now();
    snTimer = setInterval(() => {
      an.getFloatTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) sum += v * v;
      const level = Math.min(100, Math.sqrt(sum / buf.length) * 400); // 0-100
      $('snLevel').style.width = level + '%';
      const now = Date.now();
      if (level > sn.sens * 2) lastVoice = now;
      const quiet = (now - lastVoice) / 1000;
      const limit = sn.min * 60;
      $('snStatus').textContent = quiet < 5 ? '🎙️ ได้ยินเสียงคนไลฟ์อยู่' : `เงียบมา ${Math.floor(quiet / 60)}:${String(Math.floor(quiet % 60)).padStart(2, '0')} นาที (เตือนที่ ${sn.min} นาที)`;
      const alertEl = $('silenceAlert');
      if (quiet >= limit) {
        alertEl.textContent = `🎙️ เงียบมา ${Math.floor(quiet / 60)} นาทีแล้ว — คุยกับคนดูหน่อย กันไลฟ์โดนตัด`;
        alertEl.className = 'on';
        if (now - lastBeep > 30000) {
          lastBeep = now;
          const o = ac.createOscillator();
          const g = ac.createGain();
          o.frequency.value = 880;
          g.gain.setValueAtTime(0.15, ac.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.6);
          o.connect(g).connect(ac.destination);
          o.start();
          o.stop(ac.currentTime + 0.6);
        }
      } else alertEl.className = '';
    }, 200);
    snStop.ac = ac;
  }
  function snStop() {
    clearInterval(snTimer);
    snStream?.getTracks().forEach((t) => t.stop());
    snStream = null;
    snStop.ac?.close?.();
    $('snLevel').style.width = '0%';
    $('silenceAlert').className = '';
    $('snStatus').textContent = 'ปิดอยู่';
  }
  $('snOn').checked = sn.on;
  $('snMin').value = sn.min;
  $('snSens').value = sn.sens;
  snShowSens();
  if (sn.on) $('snStatus').textContent = 'กดที่หน้านี้ 1 ครั้งเพื่อเริ่มฟังไมค์';
  $('snOn').onchange = () => {
    sn.on = $('snOn').checked;
    snSave();
    sn.on ? snStart() : snStop();
  };
  $('snMin').onchange = () => {
    sn.min = Math.min(30, Math.max(1, Number($('snMin').value) || 3));
    snSave();
  };
  $('snSens').oninput = () => {
    sn.sens = Number($('snSens').value);
    snShowSens();
    snSave();
  };
  // เบราว์เซอร์ต้องการการคลิกก่อนเปิดไมค์ → เปิดอัตโนมัติเมื่อคลิกครั้งแรก
  if (sn.on) document.addEventListener('pointerdown', () => !snStream && snStart(), { once: true });

  // ---------------- log
  function logLine(e) {
    const d = document.createElement('div');
    const tm = document.createElement('span');
    tm.className = 'tm';
    tm.textContent = new Date(e.t).toLocaleTimeString('th-TH');
    const tx = document.createElement('span');
    tx.className = e.type;
    tx.textContent = e.text;
    d.append(tm, tx);
    return d;
  }


  // ================================================================ เช็คก่อนไลฟ์
  let stagesNow = [];
  let preInfo = {};
  let liveStatus = {};
  const todayStr = () => new Date().toLocaleDateString('sv-SE');
  function preItem(state, title, detail) {
    const icon = { ok: '✓', warn: '!', bad: '✗' }[state] || 'i';
    return `<div class="pre-item ${state}"><span class="pi">${icon}</span><div><b>${esc(title)}</b><div class="muted">${esc(detail)}</div></div></div>`;
  }
  function renderPre() {
    if (!config) return;
    const out = [];
    let bad = 0;
    const item = (state, title, detail) => {
      if (state === 'bad') bad++;
      out.push(preItem(state, title, detail));
    };
    item(socket.connected ? 'ok' : 'bad', 'โปรแกรมหลังบ้าน', socket.connected ? 'ทำงานอยู่' : 'ติดต่อเซิร์ฟเวอร์ไม่ได้ — เปิด start.bat ใหม่');
    if (config.platform === 'youtube') item(config.youtube ? 'ok' : 'bad', 'ช่อง YouTube', config.youtube || 'ยังไม่ได้ใส่ — ไปที่หน้า 📡 เชื่อมต่อไลฟ์');
    else item(config.username ? 'ok' : 'bad', 'ชื่อ TikTok', config.username ? '@' + config.username : 'ยังไม่ได้ใส่ — ไปที่หน้า 📡 เชื่อมต่อไลฟ์');
    const st = liveStatus.status;
    item(st === 'connected' ? 'ok' : st === 'connecting' ? 'warn' : 'info', 'การเชื่อมต่อไลฟ์',
      st === 'connected' ? 'เชื่อมต่อแล้ว — คอมเมนต์/ของขวัญจะขึ้นบนหน้าเวที' : `${liveStatus.statusText || 'ยังไม่เชื่อมต่อ'} • เริ่มไลฟ์ใน LIVE Studio แล้วกดเชื่อมต่อ`);
    const act = stagesNow.filter((s) => !s.silent && !s.thumb);
    if (!act.length) item('bad', 'หน้าเวที', `ยังไม่มีหน้าเวทีเปิดอยู่ — ใน LIVE Studio เพิ่มแหล่ง "Link" ใส่ ${stageUrl} ขนาด 1080 × 1920`);
    else if (act.length > 1) item('bad', `หน้าเวทีเปิดอยู่ ${act.length} ที่ → เสียงพูดจะดังซ้อนกัน`, `ปิดอันที่ไม่ใช้ (กด "ขึ้นเลขบนหน้าเวทีทุกจอ" ด้านล่างเพื่อหา) • ${act.map((s) => s.ua).join(', ')}`);
    else item('ok', 'หน้าเวที', `เปิดอยู่ 1 ที่ (${act[0].ua})`);
    if (act.length) {
      const small = act.filter((s) => s.px < 1070);
      if (small.length) item('warn', 'ความคมชัด', `หน้าเวทีถูกวาดกว้างแค่ ${small.map((s) => s.px).join(', ')} px (เต็ม = 1080) → ภาพจะเบลอ • ตั้งขนาดแหล่ง Link เป็น 1080 × 1920`);
      else item('ok', 'ความคมชัด', `วาดเต็มความละเอียด (${act.map((s) => s.px).join(', ')} px)`);
      const off = act.filter((s) => s.w && s.h && Math.abs(s.w / s.h - 9 / 16) > 0.03);
      if (off.length) item('warn', `ขนาดแหล่ง Link ไม่ใช่ 9:16 (ตอนนี้ ${off[0].w} × ${off[0].h})`, 'ใน LIVE Studio ตั้ง Custom resolution เป็น 1080 × 1920 กด Apply แล้วเลือก “Fill” (ลูกศร ˅ ข้างปุ่ม ⤢ บนแถบเครื่องมือ) — ไม่งั้นภาพหดและมีขอบในไลฟ์');
      const mute = act.filter((s) => !s.audio);
      if (mute.length) item('bad', 'เสียงบนหน้าเวที', 'เสียงยังไม่เปิด — คลิกที่หน้าเวทีใน LIVE Studio 1 ครั้ง (คลิกขวาที่แหล่ง Link → Interact แล้วคลิกในจอ)');
      else item('ok', 'เสียงบนหน้าเวที', 'เปิดอยู่ (เสียงพูด/ดนตรีพร้อม) • ถ้าในไลฟ์เสียงซ้อน หรือไม่มีเสียง ลองสลับเปิด/ปิด “Turn on sound” ในแหล่ง Link ของ LIVE Studio');
      const q = Math.max(0, ...act.map((s) => s.qual || 0));
      const slow = act.filter((s) => s.fps && s.fps < 24);
      if (slow.length) item('warn', 'ความลื่น', `${slow.map((s) => s.fps).join(', ')} เฟรม/วิ — เครื่องทำงานหนัก${q ? ` (ระบบลดคุณภาพให้แล้ว ระดับ ${q})` : ''} • ปิดโปรแกรมอื่น หรือใช้ตัวละคร 2D`);
      else item('ok', 'ความลื่น', `${act.map((s) => s.fps || '-').join(', ')} เฟรม/วิ${q ? ` • ลดคุณภาพอัตโนมัติอยู่ระดับ ${q}` : ''}`);
    }
    const n = ckLoad().length;
    item(n >= CHECKS.length ? 'ok' : 'warn', 'รายการเช็คความปลอดภัย', `ติ๊กแล้ว ${n}/${CHECKS.length} ข้อ — ดูที่หน้า 🛡️ ความปลอดภัย`);
    item(preInfo.lastBackup === todayStr() ? 'ok' : 'warn', 'สำรองข้อมูล', preInfo.lastBackup ? `ล่าสุด ${preInfo.lastBackup}` : 'ยังไม่เคยสำรอง');
    $('preList').innerHTML = out.join('');
    $('preNav').textContent = bad ? `⚠ ${bad}` : '✓';
    $('preNav').style.color = bad ? 'var(--bad)' : 'var(--ok)';
    $('preStages').innerHTML = stagesNow.length
      ? stagesNow.map((s) => `<div class="mv-row"><span>${s.silent ? '👁 พรีวิวในหลังบ้าน (ปิดเสียง ไม่นับ)' : '📺 ' + esc(s.ua)}</span><span class="muted">${s.w}×${s.h} • วาดกว้าง ${s.px}px • ${s.fps || '-'} fps${s.silent ? '' : s.audio ? ' • 🔊 เสียงเปิด' : ' • 🔇 เสียงยังไม่เปิด'}${s.mobile ? ' • โหมดมือถือ' : ''}${s.qual ? ` • ลดคุณภาพระดับ ${s.qual}` : ''}</span></div>`).join('')
      : '<div class="muted">ไม่มี</div>';
    $('preBackup').textContent = preInfo.lastBackup ? `สำรองล่าสุด: ${preInfo.lastBackup}` : 'ยังไม่เคยสำรอง';
    const qs = act.map((s) => s.qual || 0);
    $('perfNow').textContent = act.length ? `ตอนนี้: ${qs.some((x) => x) ? `ลดคุณภาพอยู่ระดับ ${Math.max(...qs)} (เพื่อให้ภาพลื่น)` : 'คุณภาพเต็ม'}` : '';
  }
  function refreshPre() {
    socket.emit('pre:get', null, (d) => {
      if (!d) return;
      stagesNow = d.stages || [];
      preInfo = d;
      showLiveAlert(d.alert);
      renderPre();
    });
  }
  socket.on('stages', (l) => {
    stagesNow = l || [];
    renderPre();
  });
  setInterval(() => (currentPage === 'pre' || !preInfo.lastBackup) && socket.connected && refreshPre(), 5000);
  socket.on('connect', () => setTimeout(refreshPre, 800));
  $('preRefresh').onclick = refreshPre;
  $('preIdentify').onclick = () => socket.emit('pre:identify');
  $('preTts').onclick = () => socket.emit('admin:ttsTest', 'ทดสอบเสียง หนึ่ง สอง สาม ได้ยินชัดไหม');
  $('prePose').onclick = () => socket.emit('avatar:pose', 'wave');
  $('preFx').onclick = () => socket.emit('admin:effect', meta().bigEffect);
  $('preBackupNow').onclick = () => socket.emit('pre:backupNow', null, refreshPre);

  // ตัวเฝ้าการเชื่อมต่อ: แถบแดงบนสุด + เสียงเตือน
  let alertCtx = null;
  let alertBeep = 0;
  function showLiveAlert(a) {
    const el = $('liveAlert');
    if (!a) {
      el.className = '';
      return;
    }
    el.textContent = a.text;
    el.className = 'on';
    if (Date.now() - alertBeep > 30000) {
      alertBeep = Date.now();
      try {
        alertCtx ||= new (window.AudioContext || window.webkitAudioContext)();
        const o = alertCtx.createOscillator();
        const g = alertCtx.createGain();
        o.frequency.value = 660;
        g.gain.setValueAtTime(0.15, alertCtx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, alertCtx.currentTime + 0.8);
        o.connect(g).connect(alertCtx.destination);
        o.start();
        o.stop(alertCtx.currentTime + 0.8);
      } catch {}
    }
  }
  socket.on('liveAlert', showLiveAlert);
  const wdForm = () => ({ enabled: $('wdOn').checked, minutes: Number($('wdMin').value) || 2, autoFix: $('wdFix').checked });
  for (const id of ['wdOn', 'wdMin', 'wdFix']) $(id).addEventListener('change', () => saveGlobal({ watchdog: wdForm() }, () => flashSaved('wdSaved')));
  $('perfAuto').addEventListener('change', () => saveGlobal({ perf: { auto: $('perfAuto').checked } }, () => flashSaved('perfSaved')));

  // ================================================================ ภารกิจ & สรุปไลฟ์
  const MS_KINDS = { likes: '❤ ไลค์', diamonds: '💎 เพชร', follows: '➕ ผู้ติดตามใหม่', shares: '↗ แชร์ไลฟ์', comments: '💬 คอมเมนต์' };
  const MS_REWARDS = {
    cheer: '🎉 เชียร์', dance: '💃 เต้น', bow: '🙇 โค้ง', wai: '🙏 ไหว้', bless: '🤚 ให้พร', heart: '🫶 มือหัวใจ', happy: '🥳 ดีใจ',
    clap: '👏 ปรบมือ', spin: '🌀 หมุนตัว', big: '🔥 โชว์ใหญ่ของธีม', fireworks: '🎆 พลุอย่างเดียว',
  };
  let msRows = [];
  let msLoaded = false;
  function renderMs() {
    const tbl = $('msTbl');
    tbl.innerHTML = '<tr><td>ขั้น</td><td>เป้าหมาย</td><td>จำนวน</td><td>ฉลองด้วย</td><td></td></tr>';
    msRows.forEach((r, i) => {
      const tr = document.createElement('tr');
      const kind = document.createElement('select');
      for (const [k, n] of Object.entries(MS_KINDS)) kind.add(new Option(n, k));
      kind.value = r.kind;
      kind.onchange = () => (r.kind = kind.value);
      const num = document.createElement('input');
      num.type = 'number';
      num.min = 1;
      num.value = r.target;
      num.style.width = '120px';
      num.oninput = () => (r.target = Number(num.value) || 1);
      const rw = document.createElement('select');
      for (const [k, n] of Object.entries(MS_REWARDS)) rw.add(new Option(n, k));
      rw.value = r.reward;
      rw.onchange = () => (r.reward = rw.value);
      const del = document.createElement('button');
      del.className = 'btn sm danger';
      del.textContent = 'ลบ';
      del.onclick = () => {
        msRows.splice(i, 1);
        renderMs();
      };
      const cells = [String(i + 1), kind, num, rw, del];
      for (const c of cells) {
        const td = document.createElement('td');
        if (typeof c === 'string') td.textContent = c;
        else td.appendChild(c);
        tr.appendChild(td);
      }
      tbl.appendChild(tr);
    });
  }
  function fillExtras(c) {
    if (!$('page-pre').contains(document.activeElement)) {
      $('wdOn').checked = c.watchdog?.enabled !== false;
      $('wdMin').value = c.watchdog?.minutes || 2;
      $('wdFix').checked = c.watchdog?.autoFix !== false;
      $('perfAuto').checked = c.perf?.auto !== false;
    }
    if (!msLoaded || !$('page-summary').contains(document.activeElement)) {
      $('msOn').checked = c.missions?.enabled !== false;
      msRows = structuredClone(c.missions?.steps || []);
      msLoaded = true;
      renderMs();
    }
    if (!$('page-summary').contains(document.activeElement)) {
      $('shOn').checked = c.shareGoal?.enabled !== false;
      $('shTarget').value = c.shareGoal?.target || 20;
      const sc = c.sceneLevels || {};
      $('scOn').checked = sc.enabled !== false;
      $('scL2').value = sc.l2Likes || 5000;
      $('scD2').value = sc.l2Diamonds || 300;
      $('scL3').value = sc.l3Likes || 20000;
      $('scD3').value = sc.l3Diamonds || 1000;
    }
    $('avBubble').checked = c.avatar?.bubble !== false;
    $('avWander').checked = c.avatar?.wander !== false;
    renderPre();
  }
  $('msAdd').onclick = () => {
    const last = msRows[msRows.length - 1];
    msRows.push({ kind: last?.kind || 'likes', target: last ? last.target * 2 : 1000, reward: 'cheer' });
    renderMs();
  };
  $('msSave').onclick = () => socket.emit('missions:save', { enabled: $('msOn').checked, steps: msRows }, () => flashSaved('msSaved'));
  $('msOn').onchange = () => $('msSave').click();
  $('scSave').onclick = () =>
    socket.emit('scene:save', { enabled: $('scOn').checked, l2Likes: +$('scL2').value, l2Diamonds: +$('scD2').value, l3Likes: +$('scL3').value, l3Diamonds: +$('scD3').value }, (r) => {
      if (r?.sceneLevels) {
        $('scL3').value = r.sceneLevels.l3Likes;
        $('scD3').value = r.sceneLevels.l3Diamonds;
      }
      flashSaved('scSaved');
    });
  $('scOn').onchange = () => $('scSave').click();
  $('shSave').onclick = () => socket.emit('share:save', { enabled: $('shOn').checked, target: Number($('shTarget').value) }, (r) => {
    if (r?.shareGoal) $('shTarget').value = r.shareGoal.target;
    flashSaved('shSaved');
  });
  $('shOn').onchange = () => $('shSave').click();
  $('shReset').onclick = () => socket.emit('share:reset');
  document.querySelectorAll('[data-sc]').forEach((b) => (b.onclick = () => socket.emit('scene:setLevel', Number(b.dataset.sc) || null)));
  socket.on('sceneLevel', (d) => {
    if (!d) return;
    const f = (n) => Number(n || 0).toLocaleString('en-US');
    $('scNow').textContent = !d.enabled && !d.forced ? 'ปิดอยู่' : `ตอนนี้: ขั้น ${d.level}${d.forced ? ' (เลือกเอง)' : ''} • ไลค์ ${f(d.likes)} • เพชร ${f(d.diamonds)}${d.next ? ` • ขั้นถัดไปเมื่อไลค์ ${f(d.next.likes)} หรือเพชร ${f(d.next.diamonds)}` : ''}`;
  });
  $('msReset').onclick = () => confirm('เริ่มภารกิจใหม่ตั้งแต่ขั้นแรก (ยอดไลค์/เพชร/ผู้ติดตามที่นับไว้ในรอบนี้จะเริ่มที่ 0)?') && socket.emit('missions:reset');
  socket.on('missions', (m) => {
    $('msNow').textContent = !m?.enabled ? 'ปิดอยู่' : m.allDone ? `ตอนนี้: ครบทุกขั้นแล้ว (${m.total}/${m.total}) 🎉` : `ตอนนี้: ขั้น ${m.idx + 1}/${m.total} • ${m.label} ${m.value.toLocaleString('en-US')} / ${m.target.toLocaleString('en-US')}`;
  });

  const fmtDur = (ms) => {
    const m = Math.max(0, Math.round(ms / 60000));
    return m >= 60 ? `${Math.floor(m / 60)} ชม. ${m % 60} น.` : `${m} นาที`;
  };
  const nf = (n) => Number(n || 0).toLocaleString('en-US');
  function refreshSummary() {
    socket.emit('session:get', null, (d) => {
      if (!d) return;
      const s = d.current;
      $('sumTime').textContent = s ? `เริ่ม ${new Date(s.startAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} • ${fmtDur(s.endAt - s.startAt)}` : 'ยังไม่เริ่ม';
      const cells = s
        ? [['❤ ไลค์', nf(s.likes)], ['💬 คอมเมนต์', nf(s.comments)], ['🙋 คนคอมเมนต์', nf(s.chatterCount)], ['➕ ผู้ติดตามใหม่', nf(s.follows)], ['↗ แชร์', nf(s.shares)], ['💎 เพชร', nf(s.diamonds)], ['👁 คนดูสูงสุด', nf(s.peakViewers)], ['🎯 ภารกิจ', nf(s.missionsDone) + ' ขั้น']]
        : [];
      $('sumNow').innerHTML = cells.length ? cells.map(([k, v]) => `<div><span class="muted">${k}</span><b>${v}</b></div>`).join('') : '<span class="muted">ยังไม่มีข้อมูล — จะเริ่มนับเมื่อเชื่อมต่อไลฟ์ (หรือมีคอมเมนต์ทดสอบ)</span>';
      $('sumPast').innerHTML = d.past.length
        ? '<table class="tbl past-tbl"><tr><td>วันที่</td><td>ยาว</td><td>❤</td><td>💬</td><td>➕</td><td>💎</td><td>👁 สูงสุด</td><td>ผู้สนับสนุนอันดับ 1</td></tr>' +
          d.past.map((p) => `<tr><td>${new Date(p.startAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}</td><td>${fmtDur(p.endAt - p.startAt)}</td><td>${nf(p.likes)}</td><td>${nf(p.comments)}</td><td>${nf(p.follows)}</td><td>${nf(p.diamonds)}</td><td>${nf(p.peakViewers)}</td><td>${p.gifters[0] ? esc(p.gifters[0].name) + ' (' + nf(p.gifters[0].d) + '💎)' : '-'}</td></tr>`).join('') + '</table>'
        : 'ยังไม่มี (บันทึกให้อัตโนมัติเมื่อไลฟ์จบหรือกดตัดการเชื่อมต่อ)';
    });
    socket.emit('champs:get', null, (c) => {
      const li = (l) => (l.length ? l.map((u) => `<li>${esc(u.name)} <span class="muted">— ${nf(u.pts)} แต้ม • ชนะ ${u.wins} ครั้ง</span></li>`).join('') : '<li class="muted" style="list-style:none;margin-left:-22px">ยังไม่มี</li>');
      $('chToday').innerHTML = li(c.today);
      $('chWeek').innerHTML = li(c.week);
    });
  }
  setInterval(() => currentPage === 'summary' && socket.connected && refreshSummary(), 5000);
  socket.on('champs', () => currentPage === 'summary' && refreshSummary());
  $('creditsShow').onclick = () => socket.emit('credits:show');
  $('creditsStop').onclick = () => socket.emit('credits:stop');
  $('sumNew').onclick = () => confirm('เริ่มนับไลฟ์รอบใหม่? (รอบเดิมจะถูกบันทึกไว้ใน "ไลฟ์ที่ผ่านมา")') && socket.emit('session:new', null, refreshSummary);
  $('chResetToday').onclick = () => confirm('ล้างคะแนนแชมป์เกมของวันนี้?') && socket.emit('champs:reset', 'today', refreshSummary);
  $('chResetAll').onclick = () => confirm('ล้างคะแนนแชมป์เกมทั้งหมด (ย้อนกลับไม่ได้)?') && socket.emit('champs:reset', 'all', refreshSummary);

  $('lanAccess').onchange = () => saveGlobal({ lanAccess: $('lanAccess').checked }, () => flashSaved('lanSaved'));

  // ---------------- socket
  let crowd = 0;
  socket.on('snapshot', (s) => {
    applyFeatures(s.config.features);
    fillForms(s.config);
    fillExtras(s.config);
    fillPlay(s.config);
    setStatus(s);
    $('viewers').textContent = s.viewers;
    $('likes').textContent = s.totalLikes;
    crowd = s.audience.length;
    $('crowdCount').textContent = crowd;
    renderRequests(s.requests);
    if (s.games) renderGames(s.games);
    loadTopFans();
  });
  // ---------------------------------------------------------------- ไฮไลต์ไลฟ์
  let hlItems = [];
  const hms = (t) => {
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = t % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : String(m)) + ':' + String(s).padStart(2, '0');
  };
  function renderHl() {
    const ol = $('hlList');
    ol.innerHTML = '';
    if (!hlItems.length) ol.innerHTML = '<li class="muted">ยังไม่มี — ของขวัญ 100 เพชรขึ้นไป ภารกิจ/เป้าหมายสำเร็จ หลอดพลังเต็ม หัวใจทุก 10,000 คนดูพุ่ง จะถูกจดไว้เอง</li>';
    for (const h of hlItems) {
      const li = document.createElement('li');
      li.textContent = `${hms(h.t)} — ${h.text}`;
      ol.appendChild(li);
    }
  }
  function loadHl() {
    socket.emit('session:get', null, (r) => {
      hlItems = r?.current?.highlights || [];
      renderHl();
    });
  }
  socket.on('highlight', () => loadHl());
  socket.on('connect', loadHl);
  $('hlCopy').onclick = async () => {
    // รูปแบบ chapters: บรรทัดแรกต้องเป็น 0:00
    const lines = ['0:00 เริ่มไลฟ์', ...hlItems.filter((h) => h.t > 0).map((h) => `${hms(h.t)} ${h.text.replace(/^\S+\s/, '')}`)];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      flashSaved('hlSaved');
    } catch {
      alert(lines.join('\n'));
    }
  };

  // ---------------------------------------------------------------- ธีมที่สร้างเอง (จัดวางบนจอ: ลากบล็อกไปวางบนหน้าเวทีจริง กดที่อะไรก็แก้ตรงนั้น)
  const CU_PAL = [['accent', 'สีหลัก'], ['accent2', 'สีรอง'], ['ink', 'ตัวหนังสือบนสีหลัก'], ['host', 'สีพิธีกร'], ['sky', 'ท้องฟ้าบน'], ['sky2', 'ท้องฟ้าล่าง'], ['ground', 'พื้นบน'], ['ground2', 'พื้นล่าง']];
  const CU_PRESETS = [
    ['#e8453c', '#ffb347', '#ffffff', '#ffd166'], ['#e84a8a', '#ff8fab', '#ffffff', '#ffe0ec'], ['#7c3aed', '#c4b5fd', '#ffffff', '#e9d5ff'],
    ['#2563eb', '#5de0ff', '#ffffff', '#bfefff'], ['#15803d', '#84cc16', '#ffffff', '#d9f99d'], ['#b45309', '#ffd166', '#1a1410', '#fff3b0'], ['#111827', '#f472b6', '#ffffff', '#fbcfe8'],
  ];
  const CU_SWATCH = ['#e8453c', '#ff8fab', '#a78bfa', '#3b82f6', '#22c55e', '#ffd166', '#ffffff', '#111827'];
  const CU_FX = [['shower', 'โปรย'], ['burst', 'พุ่ง'], ['spot', 'ไฟส่อง'], ['parade', 'ขบวน'], ['fireworks', 'พลุ'], ['big', 'โชว์ใหญ่']];
  const CU_TIER = { burst: 'เบา', shower: 'เบา', spot: 'กลาง', parade: 'กลาง', fireworks: 'ใหญ่', big: 'ใหญ่' };
  const CU_CMD = [['dance', 'ออกมาเต้น'], ['zone', 'นับในโซน'], ['emote', 'อีโมจิลอย']];
  const CU_GIFTS = [['🌹', 'Rose', 1], ['🫰', 'Finger Heart', 5], ['💐', 'Rosa', 10], ['🧴', 'Perfume', 20], ['🍩', 'Doughnut', 30], ['🎊', 'Confetti', 100], ['🙈', 'Peeka-Bro', 199], ['🐶', 'Corgi', 299], ['🧳', 'Travel with You', 999]];
  const CU_BLOCKS = [
    ['ttl', '🏷️', 'ป้ายหัวข้อ', 'ชื่อไลฟ์ + คำอธิบาย'], ['host', '🎤', 'ป้ายพิธีกร', 'ชื่อ + บทบาท'], ['rings', '🎯', 'วงแหวนเป้าหมาย', 'เพชร / ใจ'], ['hype', '⚡', 'หลอดพลังคนดู', 'พลัง + ภารกิจ'],
    ['hrank', '🥇', 'โพเดียม', '3 อันดับของขวัญ'], ['signs', '⌨️', 'ป้ายคำสั่ง', 'คำที่ให้คนดูพิมพ์'], ['zbox', '📍', 'โซนกิจกรรม', 'ตัวนับ + กระดานผู้นำ'], ['tick', '🎞️', 'แถบวิ่งของขวัญ', 'ของขวัญ → เอฟเฟกต์'],
  ];
  const CU_STK = ['Aa', '🎉', '⭐', '🏮', '🌸', '💖', '🔥', '🎵', '👑', '✨', '🎈', '🍀', '🌙', '🙏', '😂', '💎'];
  // พื้นที่ที่ TikTok บังบนมือถือ (พิกัดหน้าเวที 1080 x 1920)
  const CU_SAFE = [[0, 0, 1080, 110, 'ชื่อช่อง / คนดู TikTok'], [960, 820, 120, 700, 'ปุ่ม TikTok'], [0, 1380, 700, 420, 'คอมเมนต์ TikTok'], [0, 1800, 1080, 120, 'ช่องพิมพ์ TikTok']];
  const SC = 378 / 1080; // หน้าเวทีในหน้านี้ย่อเหลือ 35%
  const cu = { spec: null, bases: [], lib: { fx: [], cmds: [] }, sel: null, hist: [], fut: [], tab: 'blocks', drag: null };
  const opt = (list, v) => list.map(([k, l]) => `<option value="${k}"${k === v ? ' selected' : ''}>${esc(l)}</option>`).join('');
  let cuTipT = 0;
  function cuTip(msg) {
    $('cuTip').textContent = msg;
    clearTimeout(cuTipT);
    cuTipT = setTimeout(() => ($('cuTip').textContent = ''), 3500);
  }
  const L = () => (cu.spec.layout ||= { blocks: {}, stickers: [] });
  const blk = (k) => (L().blocks[k] ||= {});

  // ---------------- ย้อนกลับ / ทำซ้ำ
  function cuSnap() {
    cu.hist.push(JSON.stringify(cu.spec));
    if (cu.hist.length > 60) cu.hist.shift();
    cu.fut = [];
  }
  function cuUndo(redo) {
    const from = redo ? cu.fut : cu.hist;
    const to = redo ? cu.hist : cu.fut;
    if (!from.length) return;
    to.push(JSON.stringify(cu.spec));
    cu.spec = JSON.parse(from.pop());
    cuAll();
    cuChanged();
  }
  $('cuUndo').onclick = () => cuUndo(false);
  $('cuRedo').onclick = () => cuUndo(true);
  // พิมพ์ในช่อง = จำค่าก่อนแก้ครั้งเดียวต่อการโฟกัส
  $('page-custom').addEventListener('focusin', (e) => e.target.matches('input,select') && !e.target.closest('#cuTabs') && cu.spec && cuSnap());

  function cuChanged() {
    $('cuDirty').hidden = false;
    cuLive();
    requestAnimationFrame(cuDraw);
  }

  // ---------------- พรีวิว: แก้ meta ในหน้าเวทีพรีวิวแล้ววาดใหม่ทันที (ไม่บันทึก ไม่กระทบไลฟ์จริง)
  const cuWin = () => {
    try {
      return $('cuPrev').contentWindow;
    } catch {
      return null;
    }
  };
  const cuStage = () => {
    const st = cuWin()?.__stage;
    return st?.refreshTheme && st.api?.meta?.hud ? st : null;
  };
  function cuLive() {
    const st = cuStage();
    const s = cu.spec;
    if (!st || !s) return false;
    const m = st.api.meta;
    m.icon = s.icon;
    m.name = s.name;
    m.previewOf = s.base;
    m.defaults = { ...m.defaults, title: s.title, subtitle: s.subtitle, host: s.host };
    const t = st.api.t;
    if (t) Object.assign(t, { title: s.title, subtitle: s.subtitle, host: s.host });
    m.texts = { ...m.texts, bigWord: s.bigWord, hypeFull: s.hypeFull, joinVerb: s.joinVerb };
    m.hud = {
      ...m.hud, role: s.role, tap: s.tap, podiumTitle: s.podiumTitle, boardTitle: s.boardTitle, palette: { ...m.hud.palette, ...s.palette }, layout: JSON.parse(JSON.stringify(L())),
      cmds: s.cmds.filter((c) => c.c).map((c) => ({ ...c })), zones: s.zones.map((z) => ({ ...z })), goals: s.goals.map((g, i) => ({ ...(m.hud.goals?.[i] || {}), ...g })),
      pic: s.pic ? { ...s.pic } : null,
    };
    m.effects = { ...m.effects };
    s.fx.forEach((f, i) => (m.effects['g' + (i + 1)] = { ...(m.effects['g' + (i + 1)] || {}), icon: f[0], label: f[1], kind: f[2], emoji: f[3] || '' }));
    st.refreshTheme();
    return true;
  }
  function cuTry(i) {
    const st = cuStage();
    if (!st) return cuTip('พรีวิวยังโหลดไม่เสร็จ');
    cuLive();
    st.runEffect('g' + (i + 1), null, 1);
  }
  $('cuTryBig').onclick = () => cuTry(8);

  // ---------------- หาบล็อกบนหน้าเวที (พิกัดในหน้านี้ = พิกัดหน้าเวที x SC)
  function cuNode(sel) {
    const d = cuWin()?.document;
    if (!d || !sel) return null;
    if (sel.t === 'stk') return d.querySelector(`.hud .stk[data-i="${sel.i}"]`);
    return sel.k === 'hype' ? d.getElementById('hype') : d.querySelector('.hud > .' + sel.k);
  }
  function cuRect(node) {
    if (!node || node.offsetParent === null) return null;
    const r = node.getBoundingClientRect();
    return { x: r.left / SC, y: r.top / SC, w: r.width / SC, h: r.height / SC };
  }
  function cuHit(ox, oy) {
    const d = cuWin()?.document;
    if (!d) return null;
    for (const el of d.elementsFromPoint(ox, oy)) {
      const s = el.closest?.('.hud > .stk');
      if (s) return { t: 'stk', i: Number(s.dataset.i) };
      if (el.closest?.('#hype')) return { t: 'blk', k: 'hype' };
      const b = el.closest?.('.hud > div');
      if (b) {
        const k = CU_BLOCKS.find(([key]) => b.classList.contains(key))?.[0];
        if (k) return { t: 'blk', k };
      }
    }
    return null;
  }
  const sameSel = (a, b) => a && b && a.t === b.t && a.k === b.k && a.i === b.i;

  // ---------------- วาดกรอบเลือก / ตัวช่วยบนหน้าเวที
  const ov = $('cuOv');
  function cuDraw() {
    ov.querySelectorAll('.cu-box,.cu-tb,.cu-sz').forEach((n) => n.remove());
    if ($('cuSafe').checked)
      for (const [x, y, w, h, lb] of CU_SAFE) {
        const z = document.createElement('div');
        z.className = 'cu-sz';
        z.style.cssText = `left:${x * SC}px;top:${y * SC}px;width:${w * SC}px;height:${h * SC}px`;
        z.innerHTML = `<span${x > 900 ? ' style="left:auto;right:2px"' : ''}>${esc(lb)}</span>`;
        ov.appendChild(z);
      }
    if (cu.hov && !sameSel(cu.hov, cu.sel)) box(cu.hov, 'hov');
    if (cu.sel) {
      const r = box(cu.sel, 'sel');
      if (r) {
        const tb = document.createElement('div');
        tb.className = 'cu-tb';
        tb.innerHTML = `<button type="button" data-a="edit">✏️ แก้</button><button type="button" data-a="front" title="นำขึ้นหน้า">⬆</button>${cu.sel.t === 'stk' ? '<button type="button" data-a="dup" title="ทำซ้ำ">⧉</button>' : ''}<button type="button" data-a="del" title="${cu.sel.t === 'stk' ? 'ลบ' : 'ซ่อน'}">🗑</button>`;
        tb.style.left = Math.max(0, Math.min(378 - 150, r.x * SC)) + 'px';
        tb.style.top = Math.max(0, r.y * SC - 34) + 'px';
        tb.onmousedown = (e) => e.stopPropagation();
        tb.onclick = (e) => cuAct(e.target.closest('button')?.dataset.a);
        ov.appendChild(tb);
      }
    }
    cuRenderTiles();
  }
  function box(sel, cls) {
    const r = cuRect(cuNode(sel));
    if (!r) return null;
    const b = document.createElement('div');
    b.className = 'cu-box ' + cls;
    b.style.cssText = `left:${r.x * SC}px;top:${r.y * SC}px;width:${r.w * SC}px;height:${r.h * SC}px`;
    if (cls === 'sel' && !(sel.t === 'blk' && sel.k === 'tick')) b.innerHTML = '<div class="cu-hd"></div>';
    ov.appendChild(b);
    return r;
  }
  $('cuSafe').onchange = cuDraw;

  // ---------------- ลากย้าย / ย่อขยาย
  const SNAP = 10;
  function cuSnapTo(v, cands) {
    let best = null;
    for (const [edge, off] of v) for (const c of cands) if (Math.abs(edge - c) < SNAP && (!best || Math.abs(edge - c) < Math.abs(best.d))) best = { d: c - edge, line: c };
    return best;
  }
  ov.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || !cu.spec) return;
    const ox = e.offsetX + (e.target === ov ? 0 : e.target.offsetLeft);
    const oy = e.offsetY + (e.target === ov ? 0 : e.target.offsetTop);
    const resize = e.target.classList.contains('cu-hd');
    const sel = resize ? cu.sel : cuHit(e.clientX - ov.getBoundingClientRect().left, e.clientY - ov.getBoundingClientRect().top);
    cu.sel = sel;
    cuRenderProps();
    cuDraw();
    if (!sel) return;
    e.preventDefault();
    const node = cuNode(sel);
    const r0 = cuRect(node);
    if (!r0) return;
    const others = [];
    for (const [k] of CU_BLOCKS) {
      if (sel.t === 'blk' && sel.k === k) continue;
      const r = cuRect(cuNode({ t: 'blk', k }));
      if (r) others.push(r);
    }
    const s0 = sel.t === 'stk' ? L().stickers[sel.i].s || 1 : blk(sel.k).s || 1;
    cu.drag = { sel, node, r0, s0, resize, sx: e.clientX, sy: e.clientY, moved: false, others, ox, oy };
  });
  window.addEventListener('mousemove', (e) => {
    const dg = cu.drag;
    if (!dg) {
      if (e.target === ov || ov.contains(e.target)) {
        const r = ov.getBoundingClientRect();
        const h = cuHit(e.clientX - r.left, e.clientY - r.top);
        if (!sameSel(h, cu.hov)) ((cu.hov = h), cuDraw());
      }
      return;
    }
    const dx = (e.clientX - dg.sx) / SC;
    const dy = (e.clientY - dg.sy) / SC;
    if (!dg.moved && Math.abs(dx) + Math.abs(dy) < 4) return;
    if (!dg.moved) ((dg.moved = true), cuSnap());
    ov.querySelectorAll('.cu-gl').forEach((n) => n.remove());
    const st = dg.node.style;
    const isTick = dg.sel.t === 'blk' && dg.sel.k === 'tick';
    if (dg.resize) {
      const s = Math.min(2.5, Math.max(0.4, Math.round(dg.s0 * ((dg.r0.w + dx) / dg.r0.w) * 100) / 100));
      dg.s = s;
      if (dg.sel.t === 'stk') st.fontSize = Math.round((L().stickers[dg.sel.i].k === 'text' ? 64 : 110) * s) + 'px';
      else ((st.transformOrigin = '0 0'), (st.transform = `scale(${s})`), (st.left = dg.r0.x + 'px'), (st.top = dg.r0.y + 'px'), (st.right = 'auto'), (st.bottom = 'auto'));
    } else {
      let x = dg.r0.x + dx;
      let y = dg.r0.y + dy;
      if ($('cuSnap').checked && !e.altKey) {
        const { w, h } = dg.r0;
        const cx = [24, 540, 1056, ...dg.others.flatMap((o) => [o.x, o.x + o.w / 2, o.x + o.w])];
        const cy = [24, 960, 1896, ...dg.others.flatMap((o) => [o.y, o.y + o.h / 2, o.y + o.h])];
        const bx = isTick ? null : cuSnapTo([[x], [x + w / 2], [x + w]].map((a) => [a[0]]), cx);
        const by = cuSnapTo([[y], [y + h / 2], [y + h]].map((a) => [a[0]]), cy);
        if (bx) ((x += bx.d), guide('v', bx.line));
        if (by) ((y += by.d), guide('h', by.line));
      }
      dg.x = Math.round(x);
      dg.y = Math.round(y);
      if (!isTick) ((st.left = dg.x + 'px'), (st.right = 'auto'));
      st.top = dg.y + 'px';
      st.bottom = 'auto';
    }
    const b = ov.querySelector('.cu-box.sel');
    const r = cuRect(dg.node);
    if (b && r) b.style.cssText = `left:${r.x * SC}px;top:${r.y * SC}px;width:${r.w * SC}px;height:${r.h * SC}px`;
    ov.querySelector('.cu-tb')?.remove();
  });
  function guide(dir, v) {
    const g = document.createElement('div');
    g.className = 'cu-gl';
    g.style.cssText = dir === 'v' ? `left:${v * SC}px;top:0;bottom:0;width:1px` : `top:${v * SC}px;left:0;right:0;height:1px`;
    ov.appendChild(g);
  }
  window.addEventListener('mouseup', () => {
    const dg = cu.drag;
    cu.drag = null;
    ov.querySelectorAll('.cu-gl').forEach((n) => n.remove());
    if (!dg?.moved) return;
    const isTick = dg.sel.t === 'blk' && dg.sel.k === 'tick';
    if (dg.sel.t === 'stk') {
      const s = L().stickers[dg.sel.i];
      if (dg.resize) s.s = dg.s;
      else Object.assign(s, { x: dg.x, y: dg.y });
    } else {
      const b = blk(dg.sel.k);
      if (dg.resize) Object.assign(b, { s: dg.s, x: Math.round(dg.r0.x), y: Math.round(dg.r0.y) });
      else Object.assign(b, isTick ? { y: dg.y } : { x: dg.x, y: dg.y });
    }
    cuChanged();
    cuRenderProps();
  });
  ov.addEventListener('dblclick', () => cuAct('edit'));
  ov.addEventListener('mouseleave', () => cu.hov && ((cu.hov = null), cuDraw()));

  // ---------------- ปุ่มบนกรอบเลือก + คีย์ลัด
  function cuAct(a) {
    const sel = cu.sel;
    if (!sel || !a) return;
    if (a === 'edit') {
      const i = $('cuSelProps').querySelector('input:not([type=color]):not([type=range])');
      i?.focus();
      i?.select?.();
      if (!i) cuTip('บล็อกนี้ไม่มีข้อความให้แก้ — แก้สีและขนาดได้ทางขวา');
      return;
    }
    cuSnap();
    if (a === 'front') {
      const zs = [...Object.values(L().blocks).map((b) => b.z || 0), ...L().stickers.map((s) => s.z ?? 5)];
      const z = Math.min(40, Math.max(0, ...zs) + 1);
      if (sel.t === 'stk') L().stickers[sel.i].z = z;
      else blk(sel.k).z = z;
    } else if (a === 'back') {
      if (sel.t === 'stk') L().stickers[sel.i].z = 1;
      else blk(sel.k).z = 1;
    } else if (a === 'dup' && sel.t === 'stk') {
      const s = L().stickers[sel.i];
      if (L().stickers.length >= 30) return cuTip('สติกเกอร์ได้สูงสุด 30 ชิ้น');
      L().stickers.push({ ...s, x: s.x + 40, y: s.y + 40 });
      cu.sel = { t: 'stk', i: L().stickers.length - 1 };
    } else if (a === 'del') {
      if (sel.t === 'stk') L().stickers.splice(sel.i, 1);
      else blk(sel.k).hide = true;
      cu.sel = null;
    } else if (a === 'show') blk(sel.k).hide = false;
    else if (a === 'home') {
      if (sel.t === 'blk') {
        const b = blk(sel.k);
        for (const k of ['x', 'y', 's', 'z']) delete b[k];
      }
    }
    cuChanged();
    cuRenderProps();
  }
  document.addEventListener('keydown', (e) => {
    if (!$('page-custom').classList.contains('on') && !$('page-custom').offsetParent) return;
    if (e.target.matches('input,select,textarea')) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') return (e.preventDefault(), cuUndo(e.shiftKey));
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') return (e.preventDefault(), cuUndo(true));
    if (!cu.sel) return;
    if (e.key === 'Delete' || e.key === 'Backspace') return (e.preventDefault(), cuAct('del'));
    const mv = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!mv) return;
    e.preventDefault();
    const step = e.shiftKey ? 20 : 4;
    const r = cuRect(cuNode(cu.sel));
    if (!r) return;
    cuSnap();
    if (cu.sel.t === 'stk') {
      const s = L().stickers[cu.sel.i];
      s.x += mv[0] * step;
      s.y += mv[1] * step;
    } else {
      const b = blk(cu.sel.k);
      if (cu.sel.k !== 'tick') b.x = Math.round(b.x ?? r.x) + mv[0] * step;
      b.y = Math.round(b.y ?? r.y) + mv[1] * step;
    }
    cuChanged();
  });

  // ---------------- แผงซ้าย: บล็อก / ฉาก / ตกแต่ง
  $('cuTabs').onclick = (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    cu.tab = b.dataset.t;
    $('cuTabs').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
    document.querySelectorAll('#page-custom [data-tp]').forEach((p) => (p.hidden = p.dataset.tp !== cu.tab));
  };
  function cuDragSrc(el, payload, onClick) {
    el.draggable = true;
    el.ondragstart = (e) => {
      cu.dnd = payload;
      e.dataTransfer.setData('text/plain', 'cu');
      e.dataTransfer.effectAllowed = 'copy';
    };
    el.ondragend = () => ((cu.dnd = null), ov.classList.remove('drop'));
    el.onclick = onClick;
  }
  ov.addEventListener('dragover', (e) => {
    if (!cu.dnd) return;
    e.preventDefault();
    ov.classList.add('drop');
  });
  ov.addEventListener('dragleave', () => ov.classList.remove('drop'));
  ov.addEventListener('drop', (e) => {
    e.preventDefault();
    ov.classList.remove('drop');
    const p = cu.dnd;
    cu.dnd = null;
    if (!p || !cu.spec) return;
    const r = ov.getBoundingClientRect();
    cuDropAt(p, (e.clientX - r.left) / SC, (e.clientY - r.top) / SC);
  });
  function cuDropAt(p, x, y) {
    cuSnap();
    if (p.t === 'blk') {
      const b = blk(p.k);
      b.hide = false;
      if (p.k !== 'tick') b.x = Math.round(x - 60);
      b.y = Math.round(y - 30);
      cu.sel = { t: 'blk', k: p.k };
    } else {
      if (L().stickers.length >= 30) return cuTip('สติกเกอร์ได้สูงสุด 30 ชิ้น');
      const text = p.v === 'Aa';
      L().stickers.push({ k: text ? 'text' : 'emoji', v: text ? 'ข้อความของฉัน' : p.v, x: Math.round(x - (text ? 160 : 55)), y: Math.round(y - (text ? 32 : 55)), s: 1, z: 5, c: text ? '#ffffff' : '#ffffff' });
      cu.sel = { t: 'stk', i: L().stickers.length - 1 };
    }
    cuChanged();
    cuRenderProps();
  }
  function cuRenderTiles() {
    const box = $('cuTiles');
    if (!cu.spec) return;
    box.innerHTML = '';
    for (const [k, ic, name, sub] of CU_BLOCKS) {
      const hidden = !!L().blocks[k]?.hide;
      const el = document.createElement('div');
      el.className = 'cu-tile' + (hidden ? ' off' : '') + (cu.sel?.t === 'blk' && cu.sel.k === k ? ' sel' : '');
      el.innerHTML = `<span class="g">⋮⋮</span><span class="e">${ic}</span><span style="min-width:0"><b>${esc(name)}</b><small>${hidden ? 'ซ่อนอยู่ — ลากไปวาง' : esc(sub)}</small></span>`;
      cuDragSrc(el, { t: 'blk', k }, () => {
        if (hidden) ((cu.sel = { t: 'blk', k }), cuAct('show'));
        cu.sel = { t: 'blk', k };
        cuRenderProps();
        cuDraw();
      });
      box.appendChild(el);
    }
  }
  function cuRenderStickers() {
    const box = $('cuStks');
    box.innerHTML = '';
    for (const v of CU_STK) {
      const el = document.createElement('div');
      el.className = 'cu-stk';
      el.textContent = v;
      el.title = v === 'Aa' ? 'ข้อความ' : 'สติกเกอร์';
      cuDragSrc(el, { t: 'stk', v }, () => cuDropAt({ t: 'stk', v }, 540, 900));
      box.appendChild(el);
    }
  }
  // ---------------- ภาพของฉัน (2.5D): ภาพ + แผนที่ความลึกที่ AI ทำในเครื่องนี้ → อัปโหลดเก็บไว้ที่ /pics
  function cuRenderPic() {
    const p = cu.spec.pic;
    $('cuPicOpts').hidden = !p;
    $('cuPicUp').textContent = p ? '🔁 เปลี่ยนภาพ' : '📤 อัปโหลดภาพ';
    $('cuScenes').classList.toggle('dim', !!p);
    if (!p) return;
    $('cuPicFx').value = p.fx || 'gold';
    $('cuPicMotion').value = p.motion ?? 1;
    $('cuPicGlow').value = p.glow ?? 1;
    $('cuPicRays').checked = !!p.rays;
    $('cuPicFloor').value = p.floor || 0;
  }
  $('cuPicUp').onclick = () => $('cuPicFile').click();
  $('cuPicFile').onchange = async () => {
    const f = $('cuPicFile').files[0];
    $('cuPicFile').value = '';
    if (!f) return;
    const st = (t) => ($('cuPicStat').textContent = t);
    $('cuPicUp').disabled = true;
    try {
      const { makeDepth } = await import('./depth-gen.js');
      const r = await makeDepth(f, st);
      st('กำลังบันทึกภาพ…');
      const up = async (blob) => {
        const j = await (await fetch('/api/pic', { method: 'POST', body: blob })).json();
        if (!j.ok) throw new Error(j.error || 'อัปโหลดไม่สำเร็จ');
        return j.url;
      };
      const [img, depth] = await Promise.all([up(r.img), up(r.depth)]);
      cuSnap();
      cu.spec.pic = { fx: 'gold', motion: 1, glow: 1, rays: false, floor: 0, ...(cu.spec.pic || {}), img, depth };
      cuRenderPic();
      cuChanged();
      st(r.mode === 'ai' ? '✓ ทำความลึกด้วย AI แล้ว — กด 💾 บันทึกธีม' : '⚠️ ใช้ความลึกแบบง่าย (โหลดตัวช่วย AI ไม่ได้ — ต่อเน็ตแล้วอัปโหลดใหม่ได้)');
    } catch (e) {
      st('ทำไม่สำเร็จ: ' + (e.message || e));
    } finally {
      $('cuPicUp').disabled = false;
    }
  };
  const cuPicSet = (k, v) => {
    if (!cu.spec.pic) return;
    cu.spec.pic[k] = v;
    cuChanged();
  };
  $('cuPicFx').onchange = () => cuPicSet('fx', $('cuPicFx').value);
  $('cuPicMotion').oninput = () => cuPicSet('motion', Number($('cuPicMotion').value));
  $('cuPicGlow').oninput = () => cuPicSet('glow', Number($('cuPicGlow').value));
  $('cuPicRays').onchange = () => cuPicSet('rays', $('cuPicRays').checked);
  $('cuPicFloor').onchange = () => cuPicSet('floor', Number($('cuPicFloor').value));
  $('cuPicDel').onclick = () => {
    cuSnap();
    cu.spec.pic = null;
    $('cuPicStat').textContent = '';
    cuRenderPic();
    cuChanged();
  };
  function cuRenderScenes() {
    $('cuScenes').innerHTML = cu.bases
      .map((b) => `<button type="button" class="cu-scene${b.id === cu.spec.base ? ' on' : ''}" data-id="${esc(b.id)}"><img loading="lazy" alt="" src="theme-previews/${esc(b.id)}.jpg"><span>${esc(b.icon)} ${esc(b.name)}</span></button>`)
      .join('');
  }
  $('cuScenes').onclick = (e) => {
    const b = e.target.closest('.cu-scene');
    if (!b || b.dataset.id === cu.spec.base) return;
    // เปลี่ยนฉาก = ใช้ฉาก + โซน + สีฉากของธีมนั้น (ชื่อ สีแผง คำสั่ง ของขวัญ ตำแหน่งที่จัดไว้ยังอยู่)
    socket.emit('custom:base', b.dataset.id, (r) => {
      if (!r) return;
      cuSnap();
      const s = cu.spec;
      s.base = r.spec.base;
      s.zones = r.spec.zones;
      for (const k of ['sky', 'sky2', 'ground', 'ground2']) s.palette[k] = r.spec.palette[k];
      for (const c of s.cmds) if (c.kind === 'zone' && !s.zones.some((z) => z.id === c.zone)) c.zone = s.zones[0]?.id;
      cuRenderScenes();
      cuRenderPal();
      cuChanged();
    });
  };
  $('cuReset').onclick = () => {
    if (!confirm('แทนที่ชื่อ สี คำสั่ง และของขวัญทั้งหมดด้วยค่าของฉากนี้? (ตำแหน่งที่จัดไว้ยังอยู่)')) return;
    socket.emit('custom:base', cu.spec.base, (r) => {
      if (!r) return;
      cuSnap();
      const layout = L();
      cu.spec = { ...r.spec, layout };
      cuAll();
      cuChanged();
    });
  };
  $('cuResetLayout').onclick = () => {
    if (!confirm('คืนทุกบล็อกไปตำแหน่งเดิม และลบสติกเกอร์ทั้งหมด?')) return;
    cuSnap();
    cu.spec.layout = { blocks: {}, stickers: [] };
    cu.sel = null;
    cuChanged();
    cuRenderProps();
  };

  // ---------------- แผงขวา: บล็อกที่เลือก
  const field = (label, f, max, val) => `<label>${esc(label)} <input data-f="${f}" maxlength="${max}" value="${esc(val ?? '')}"></label>`;
  function cuSwatches(cur, auto) {
    return `<div class="cu-sw">${auto ? `<button type="button" class="auto${cur ? '' : ' on'}" data-c="">ตามธีม</button>` : ''}${CU_SWATCH.map((c) => `<button type="button" data-c="${c}" style="background:${c}"${cur === c ? ' class="on"' : ''}></button>`).join('')}<input type="color" data-c-pick value="${esc(cur || '#ffffff')}" title="สีอื่น"></div>`;
  }
  function cuOverlap(r) {
    if (!r) return '';
    const hit = CU_SAFE.filter(([x, y, w, h]) => r.x < x + w && r.x + r.w > x && r.y < y + h && r.y + r.h > y).map((z) => z[4]);
    return hit.length ? `<div class="cu-warn">⚠️ บล็อกนี้ทับ${esc(hit.join(', '))} — บนมือถือคนดูอาจมองไม่เห็นบางส่วน</div>` : '';
  }
  function cuRenderProps() {
    const box = $('cuSelProps');
    const sel = cu.sel;
    if (!sel || !cu.spec) {
      box.innerHTML = '<p class="cu-hint" style="margin:0 0 10px">กดที่บล็อกบนหน้าเวทีเพื่อแก้ข้อความ สี และขนาด</p>';
      return;
    }
    const s = cu.spec;
    const r = cuRect(cuNode(sel));
    if (sel.t === 'stk') {
      const k = L().stickers[sel.i];
      if (!k) return ((cu.sel = null), cuRenderProps());
      box.innerHTML = `<h3>${k.k === 'text' ? '🔤 ข้อความ' : '✨ สติกเกอร์'}<span class="cu-row2" style="margin:0"><button class="btn sm" data-a="dup" type="button">⧉</button><button class="btn sm danger" data-a="del" type="button">ลบ</button></span></h3>
        <label>${k.k === 'text' ? 'ข้อความ' : 'อีโมจิ'} <input data-sk="v" maxlength="40" value="${esc(k.v)}"></label>
        ${k.k === 'text' ? `<div class="cu-hint">สี</div>${cuSwatches(k.c, false)}` : ''}
        <label>ขนาด <span data-sv>${Math.round((k.s || 1) * 100)}%</span><input type="range" min="30" max="400" value="${Math.round((k.s || 1) * 100)}" data-size></label>
        <div class="cu-row2"><button class="btn sm" data-a="front" type="button">⬆ นำขึ้นหน้า</button><button class="btn sm" data-a="back" type="button">⬇ ส่งไปหลัง</button></div>${cuOverlap(r)}`;
    } else {
      const [k, ic, name] = CU_BLOCKS.find((b) => b[0] === sel.k);
      const b = L().blocks[k] || {};
      let body = '';
      if (k === 'ttl') body = field('ไอคอน', 'icon', 8, s.icon) + field('หัวข้อบนจอ', 'title', 40, s.title) + field('คำอธิบายใต้หัวข้อ', 'subtitle', 80, s.subtitle);
      else if (k === 'host') body = field('ชื่อพิธีกร', 'host', 30, s.host) + field('ป้ายบทบาท', 'role', 30, s.role);
      else if (k === 'hrank') body = field('หัวโพเดียม', 'podiumTitle', 50, s.podiumTitle);
      else if (k === 'zbox')
        body = s.zones.map((z, i) => `<div class="cu-line"><input class="w" data-z="${i}" data-zk="label" maxlength="24" value="${esc(z.label)}" title="ชื่อโซน"><input class="grow" data-z="${i}" data-zk="stat" maxlength="40" value="${esc(z.stat)}" title="ข้อความนับ ต้องมี {n}"></div>`).join('') + field('หัวกระดานผู้นำ', 'boardTitle', 30, s.boardTitle);
      else if (k === 'rings')
        body = s.goals
          .map((g, i) => `<div class="cu-line"><b style="width:36px;flex:none;font-size:13px">${esc(g.label)}</b><input class="grow" data-g="${i}" data-gk="reward" maxlength="30" value="${esc(g.reward)}" title="ครบแล้วได้"><input class="w" type="number" data-g="${i}" data-gk="max" value="${g.max}" title="เป้า" style="width:74px"></div>
            <div class="cu-line" style="margin-left:41px"><select class="grow" data-g="${i}" data-gk="effect" title="เอฟเฟกต์ตอนครบ">${s.fx.map((f, j) => `<option value="g${j + 1}"${g.effect === 'g' + (j + 1) ? ' selected' : ''}>${CU_GIFTS[j][0]} ${esc(f[1])}</option>`).join('')}</select></div>`)
          .join('');
      else if (k === 'signs') body = '<button class="btn sm" type="button" data-open="cuDCmd">⌨️ แก้คำสั่งพิมพ์ ↓</button>';
      else if (k === 'tick') body = field('บรรทัดท้ายแถบวิ่ง', 'tap', 120, s.tap) + '<button class="btn sm" type="button" data-open="cuDFx">🎁 แก้ของขวัญ → เอฟเฟกต์ ↓</button>';
      else if (k === 'hype') body = '<p class="cu-hint">หลอดพลังคนดู + ภารกิจ (ข้อความตั้งในเมนู “ภารกิจ & สรุปไลฟ์”)</p>';
      box.innerHTML = `<h3>${ic} ${esc(name)}<span class="cu-row2" style="margin:0"><button class="btn sm" data-a="home" type="button" title="กลับตำแหน่งเดิม">↺</button><button class="btn sm danger" data-a="del" type="button">ซ่อน</button></span></h3>${body}
        ${k === 'tick' || k === 'hype' ? '' : `<div class="cu-hint" style="margin-top:6px">สีของบล็อก</div>${cuSwatches(b.c, true)}`}
        ${k === 'tick' ? '' : `<label>ขนาด <span data-sv>${Math.round((b.s || 1) * 100)}%</span><input type="range" min="40" max="250" value="${Math.round((b.s || 1) * 100)}" data-size></label>`}
        <div class="cu-row2"><button class="btn sm" data-a="front" type="button">⬆ นำขึ้นหน้า</button><button class="btn sm" data-a="back" type="button">⬇ ส่งไปหลัง</button></div>${cuOverlap(r)}`;
    }
  }
  $('cuSelProps').addEventListener('click', (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a) return cuAct(a);
    const op = e.target.closest('[data-open]')?.dataset.open;
    if (op) {
      $(op).open = true;
      $(op).scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }
    const sw = e.target.closest('.cu-sw button');
    if (sw) {
      cuSnap();
      cuSetColor(sw.dataset.c);
    }
  });
  function cuSetColor(c) {
    if (cu.sel.t === 'stk') L().stickers[cu.sel.i].c = c || '#ffffff';
    else if (c) blk(cu.sel.k).c = c;
    else delete blk(cu.sel.k).c;
    cuChanged();
    cuRenderProps();
  }
  $('cuSelProps').addEventListener('input', (e) => {
    const t = e.target;
    const s = cu.spec;
    if (t.dataset.f) {
      s[t.dataset.f] = t.value;
      if ($('cu_' + t.dataset.f)) $('cu_' + t.dataset.f).value = t.value;
    }
    else if (t.dataset.sk) L().stickers[cu.sel.i][t.dataset.sk] = t.value;
    else if (t.dataset.z) s.zones[t.dataset.z][t.dataset.zk] = t.value;
    else if (t.dataset.g) s.goals[t.dataset.g][t.dataset.gk] = t.dataset.gk === 'max' ? Number(t.value) || s.goals[t.dataset.g].max : t.value;
    else if (t.hasAttribute('data-size')) {
      const v = Number(t.value) / 100;
      if (cu.sel.t === 'stk') L().stickers[cu.sel.i].s = v;
      else {
        const r = cuRect(cuNode(cu.sel));
        const b = blk(cu.sel.k);
        if (r && b.x === undefined) Object.assign(b, { x: Math.round(r.x), y: Math.round(r.y) }); // ย่อขยายจากมุมซ้ายบน
        b.s = v;
      }
      t.parentElement.querySelector('[data-sv]').textContent = t.value + '%';
    } else if (t.hasAttribute('data-c-pick')) return cuSetColor(t.value);
    else return;
    cuChanged();
  });

  // ---------------- ตั้งค่าทั้งธีม
  for (const k of ['name', 'icon', 'bigWord', 'hypeFull', 'joinVerb'])
    $('cu_' + k).addEventListener('input', (e) => {
      cu.spec[k] = e.target.value;
      cuChanged();
    });
  function cuRenderPal() {
    $('cuPals').innerHTML = CU_PRESETS.map((p, i) => `<button type="button" class="cu-pal" data-i="${i}" title="ใช้ชุดสีนี้">${p.map((c) => `<i style="background:${c}"></i>`).join('')}</button>`).join('');
    $('cuPal').innerHTML = CU_PAL.map(([k, l]) => `<label><input type="color" data-pal="${k}" value="${esc(cu.spec.palette[k])}"> ${esc(l)}</label>`).join('');
  }
  $('cuPals').onclick = (e) => {
    const b = e.target.closest('.cu-pal');
    if (!b) return;
    cuSnap();
    const [accent, accent2, ink, host] = CU_PRESETS[b.dataset.i];
    Object.assign(cu.spec.palette, { accent, accent2, ink, host });
    cuRenderPal();
    cuChanged();
  };
  $('cuPal').oninput = (e) => {
    const k = e.target.dataset.pal;
    if (!k) return;
    cu.spec.palette[k] = e.target.value;
    cuChanged();
  };
  // ของขวัญ → เอฟเฟกต์: เลือกจากคลัง (เอฟเฟกต์จากทุกธีม) แล้วแก้ชื่อ/อีโมจิต่อได้
  function cuRenderFx() {
    const lib = cu.lib.fx;
    const libOpts = ['ใหญ่', 'กลาง', 'เบา']
      .map((t) => `<optgroup label="${t}">${lib.map((f, i) => (CU_TIER[f.kind] === t ? `<option value="${i}">${esc(f.icon)} ${esc(f.label)}</option>` : '')).join('')}</optgroup>`)
      .join('');
    $('cuFx').innerHTML = cu.spec.fx
      .map(
        (f, i) => `<div class="cu-line" data-fx="${i}"><span class="gift" title="${CU_GIFTS[i][1]} (${CU_GIFTS[i][2]})">${CU_GIFTS[i][0]}</span><input class="em" data-k="0" maxlength="8" value="${esc(f[0])}" title="ไอคอน"><input class="grow" data-k="1" maxlength="24" value="${esc(f[1])}" title="ชื่อเอฟเฟกต์"><button class="btn sm" type="button" data-try title="ลองบนพรีวิว">▶</button></div>
        <div class="cu-line" data-fx="${i}" style="margin:-2px 0 10px 31px"><select class="grow" data-pick title="เลือกจากคลัง"><option value="">เลือกจากคลัง…</option>${libOpts}</select><select data-k="2" title="แบบ" style="width:84px">${opt(CU_FX, f[2])}</select><input class="em" data-k="3" maxlength="8" value="${esc(f[3] || '')}" title="อีโมจิที่ลอย"></div>`,
      )
      .join('');
  }
  $('cuFx').addEventListener('input', (e) => {
    const row = e.target.closest('[data-fx]');
    if (!row) return;
    const i = Number(row.dataset.fx);
    const f = cu.spec.fx[i];
    if (e.target.hasAttribute('data-pick')) {
      const it = cu.lib.fx[e.target.value];
      if (!it) return;
      cu.spec.fx[i] = [it.icon, it.label, it.kind, it.emoji];
      cuRenderFx();
      cuChanged();
      return cuTry(i);
    }
    f[e.target.dataset.k] = e.target.value;
    cuChanged();
  });
  $('cuFx').addEventListener('click', (e) => e.target.closest('[data-try]') && cuTry(Number(e.target.closest('[data-fx]').dataset.fx)));
  $('cuFxAuto').onclick = () => {
    cuSnap();
    const want = ['burst', 'burst', 'shower', 'spot', 'spot', 'parade', 'shower', 'fireworks', 'big'];
    const used = new Set();
    cu.spec.fx = want.map((k, i) => {
      const pool = cu.lib.fx.filter((f) => f.kind === k && !used.has(f.label));
      const f = pool[Math.floor(Math.random() * pool.length)];
      if (!f) return cu.spec.fx[i];
      used.add(f.label);
      return [f.icon, f.label, f.kind, f.emoji];
    });
    cuRenderFx();
    cuChanged();
  };
  $('cuFxBase').onclick = () => socket.emit('custom:base', cu.spec.base, (r) => r && (cuSnap(), (cu.spec.fx = r.spec.fx), cuRenderFx(), cuChanged()));
  // คำสั่งพิมพ์ (สูงสุด 4)
  function cuRenderCmds() {
    const s = cu.spec;
    $('cuCmds').innerHTML = s.cmds
      .map(
        (c, i) => `<div class="cu-line" data-cm="${i}"><input class="em" data-k="emoji" maxlength="8" value="${esc(c.emoji)}" title="อีโมจิ"><input class="w" data-k="c" maxlength="20" value="${esc(c.c)}" title="คำที่คนดูพิมพ์"><input class="grow" data-k="a" maxlength="30" value="${esc(c.a)}" title="บอกคนดูว่า"><button class="btn sm" type="button" data-del title="เอาออก">✕</button></div>
        <div class="cu-line" data-cm="${i}" style="margin:-2px 0 10px 45px"><select data-k="kind" title="ทำอะไร">${opt(CU_CMD, c.kind)}</select>${c.kind === 'zone' ? `<select class="grow" data-k="zone" title="นับในโซน">${s.zones.map((z) => `<option value="${esc(z.id)}"${z.id === c.zone ? ' selected' : ''}>${esc(z.label)}</option>`).join('')}</select>` : ''}</div>`,
      )
      .join('');
    $('cuCmdAdd').hidden = s.cmds.length >= 4;
    $('cuCmdAdd').innerHTML = `<option value="">＋ เพิ่มคำสั่ง (${s.cmds.length}/4)…</option><option value="new">✨ คำสั่งใหม่ (ตั้งเอง)</option>${cu.lib.cmds.map((c, i) => `<option value="${i}">${esc(c.emoji)} ${esc(c.c)} — ${esc(c.a)}</option>`).join('')}`;
  }
  $('cuCmds').addEventListener('input', (e) => {
    const row = e.target.closest('[data-cm]');
    if (!row) return;
    const c = cu.spec.cmds[row.dataset.cm];
    const k = e.target.dataset.k;
    c[k] = e.target.value;
    if (k === 'kind') {
      if (c.kind === 'zone') c.zone = c.zone || cu.spec.zones[0]?.id;
      else delete c.zone;
      cuRenderCmds();
    }
    cuChanged();
  });
  $('cuCmds').addEventListener('click', (e) => {
    if (!e.target.closest('[data-del]')) return;
    cuSnap();
    cu.spec.cmds.splice(Number(e.target.closest('[data-cm]').dataset.cm), 1);
    cuRenderCmds();
    cuChanged();
  });
  $('cuCmdAdd').onchange = (e) => {
    const v = e.target.value;
    if (!v) return;
    const it = v === 'new' ? { c: 'คำใหม่', a: 'บอกคนดูว่าพิมพ์แล้วได้อะไร', kind: 'emote', emoji: '✨' } : cu.lib.cmds[v];
    if (cu.spec.cmds.some((c) => c.c === it.c)) return ((e.target.value = ''), cuTip(`มีคำสั่ง “${it.c}” อยู่แล้ว`));
    cuSnap();
    const c = { c: it.c, a: it.a, kind: it.kind, emoji: it.emoji };
    if (c.kind === 'zone') c.zone = cu.spec.zones[0]?.id;
    cu.spec.cmds.push(c);
    cuRenderCmds();
    cuChanged();
  };

  // ---------------- โหลด / บันทึก
  function cuAll() {
    for (const k of ['name', 'icon', 'bigWord', 'hypeFull', 'joinVerb']) $('cu_' + k).value = cu.spec[k] || '';
    if (cu.sel?.t === 'stk' && !L().stickers[cu.sel.i]) cu.sel = null;
    cuRenderScenes();
    cuRenderPic();
    cuRenderStickers();
    cuRenderPal();
    cuRenderFx();
    cuRenderCmds();
    cuRenderProps();
    cuDraw();
  }
  function cuFill(s) {
    cu.spec = JSON.parse(JSON.stringify(s));
    L();
    cuAll();
    cuLive();
  }
  function cuWaitPrev() {
    let n = 0;
    const tick = () => {
      if (cuLive()) {
        try {
          // ให้ชี้โดนแผงบนพรีวิวได้ (หน้าเวทีจริงแผงพวกนี้ทะลุคลิก)
          const d = cuWin().document;
          if (!d.getElementById('cuEditCss')) {
            const css = d.createElement('style');
            css.id = 'cuEditCss';
            css.textContent = '.hud > *, #hype { pointer-events: auto !important; }';
            d.head.appendChild(css);
          }
        } catch {}
        return setTimeout(() => (cuRenderProps(), cuDraw()), 120);
      }
      if (n++ < 60) setTimeout(tick, 200);
    };
    tick();
  }
  $('cuPrev').addEventListener('load', cuWaitPrev);
  function cuLoad() {
    socket.emit('custom:get', null, (r) => {
      if (!r) return;
      cu.bases = r.bases;
      cu.lib = r.library || { fx: [], cmds: [] };
      $('cuLocked').hidden = r.allowed;
      $('cuUse').disabled = !r.allowed;
      $('cuDirty').hidden = true;
      cu.hist = [];
      cu.fut = [];
      cuFill(r.spec);
      if (!$('cuPrev').src) $('cuPrev').src = 'stage.html?theme=custom&silent&desktop&r=' + Date.now();
    });
  }
  function cuSave(then) {
    socket.emit('custom:save', cu.spec, (r) => {
      if (!r?.ok) return r?.error && alert(r.error);
      cuFill(r.spec);
      $('cuDirty').hidden = true;
      flashSaved('cuSaved');
      then?.();
    });
  }
  $('cuSave').onclick = () => cuSave();
  $('cuUse').onclick = () => cuSave(() => socket.emit('admin:setTheme', 'custom', (r) => (r?.ok ? flashSaved('cuSaved') : r?.error && alert(r.error))));
  document.querySelector('.nav[data-page="custom"]')?.addEventListener('click', cuLoad);
  if (location.hash === '#custom') setTimeout(cuLoad, 600);

  // ---------------------------------------------------------------- บัญชี TubHool (สรุปไลฟ์ / สำรองการตั้งค่า)
  let cloudUrl = '';
  const thTime = (t) => (t ? new Date(t).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
  function renderCloud(i) {
    if (!i) return;
    const on = i.desktop && i.signedIn;
    $('cloudOff').hidden = on;
    $('cloudOn').hidden = !on;
    cloudUrl = i.reportsUrl;
    const bits = [];
    if (i.lastReport) bits.push(`ส่งสรุปไลฟ์ล่าสุด ${thTime(i.lastReport)}`);
    if (i.lastBackup) bits.push(`สำรองการตั้งค่าล่าสุด ${thTime(i.lastBackup)}`);
    if (i.lastError) bits.push(`ปัญหาล่าสุด: ${i.lastError}`);
    $('cloudMsg').textContent = bits.join(' • ');
  }
  socket.on('cloud', renderCloud);
  socket.on('connect', () => socket.emit('cloud:info', null, renderCloud));
  const saveCloud = () => saveGlobal({ cloud: { reports: $('cloudReports').checked, autoBackup: $('cloudAuto').checked } }, () => flashSaved('cloudSaved'));
  $('cloudReports').onchange = saveCloud;
  $('cloudAuto').onchange = saveCloud;
  $('cloudOpen').onclick = () => {
    if (!cloudUrl) return;
    if (window.parent?.liveStage?.openExternal) window.parent.liveStage.openExternal(cloudUrl);
    else window.open(cloudUrl, '_blank', 'noopener');
  };
  $('cloudBackup').onclick = () => {
    $('cloudBackup').disabled = true;
    socket.emit('cloud:backup', null, (r) => {
      $('cloudBackup').disabled = false;
      renderCloud(r?.info);
      alert(r?.ok ? 'สำรองการตั้งค่าขึ้นบัญชี TubHool แล้ว' : 'สำรองไม่สำเร็จ: ' + (r?.error || ''));
    });
  };
  $('cloudRestore').onclick = () => {
    if (!confirm('แทนที่การตั้งค่าในเครื่องนี้ด้วยค่าที่สำรองไว้ในบัญชี?\n(ของเดิมจะถูกเก็บไว้ในโฟลเดอร์ backups)')) return;
    $('cloudRestore').disabled = true;
    socket.emit('cloud:restore', null, (r) => {
      $('cloudRestore').disabled = false;
      renderCloud(r?.info);
      alert(r?.ok ? 'ดึงการตั้งค่าจากบัญชีแล้ว' : 'ดึงไม่สำเร็จ: ' + (r?.error || ''));
    });
  };

  // ---------------------------------------------------------------- คำสั่ง & แต้ม
  function fillAi(c) {
    if ($('page-play').contains(document.activeElement)) return;
    const a = c.ai || {};
    $('aiOn').checked = !!a.enabled;
    $('aiName').value = a.name || '';
    $('aiRole').value = a.role || '';
    $('aiStyle').value = a.style || '';
    $('aiChance').value = String(a.chance >= 0.5 ? 0.6 : a.chance >= 0.2 ? 0.3 : 0.1);
    $('aiGap').value = a.gap || 20;
    $('aiQ').checked = !!a.questionsOnly;
    socket.emit('ai:info', null, (i) => {
      if (!i) return;
      $('aiNote').textContent = !i.desktop
        ? 'ใช้ได้ในโปรแกรม Live Stage ที่เข้าสู่ระบบบัญชีผู้สนับสนุน TubHool'
        : i.plan !== 'supporter'
          ? 'สำหรับผู้สนับสนุน TubHool — สนับสนุนแล้วเปิดใช้ได้ทันที'
          : `ไลฟ์นี้ตอบไปแล้ว ${i.used} ครั้ง${i.lastError ? ` • ล่าสุด: ${i.lastError}` : ''}`;
    });
  }
  $('aiSave').onclick = () =>
    saveGlobal({ ai: { enabled: $('aiOn').checked, name: $('aiName').value, role: $('aiRole').value, style: $('aiStyle').value, chance: Number($('aiChance').value), gap: Number($('aiGap').value), questionsOnly: $('aiQ').checked } }, () => flashSaved('aiSaved'));
  function fillPlay(c) {
    fillAi(c);
    $('cloudReports').checked = c.cloud?.reports !== false;
    $('cloudAuto').checked = c.cloud?.autoBackup !== false;
    if ($('page-play').contains(document.activeElement)) return;
    const p = c.play || {};
    $('plOn').checked = p.enabled !== false;
    $('plPts').checked = p.points !== false;
    $('plShop').checked = p.shop !== false;
    $('plCd').value = p.cooldown || 20;
    const tbl = $('plItems');
    tbl.innerHTML = '<tr><th>ของ</th><th>ทำอะไร</th><th>ใช้แต้ม</th><th>เปิด</th></tr>';
    for (const s of c.shopItems || []) {
      const it = (p.items || []).find((i) => i.key === s.key) || { cost: s.cost, on: true };
      const tr = document.createElement('tr');
      tr.dataset.key = s.key;
      tr.innerHTML = `<td><b></b><br><small class="muted"></small></td><td class="muted"></td><td><input type="number" min="1" max="100000" style="width:90px"></td><td><input type="checkbox"></td>`;
      tr.querySelector('b').textContent = s.name;
      tr.querySelector('small').textContent = `พิมพ์ “แลก ${s.name}”`;
      tr.cells[1].textContent = s.desc;
      tr.querySelector('input[type=number]').value = it.cost;
      tr.querySelector('input[type=checkbox]').checked = it.on !== false;
      tbl.appendChild(tr);
    }
    const g = c.petGrow || {};
    $('pgOn').checked = g.on !== false;
    $('pgStep').value = g.step || 10;
    $('pgKeep').checked = !!g.keep;
    pgHint();
    $('pgNote').textContent = c.themes?.[c.theme]?.meta?.pet ? '' : 'ธีมที่ใช้อยู่ไม่ใช่ธีมสัตว์เลี้ยง — ตั้งค่าไว้ได้ จะทำงานเมื่อเปลี่ยนเป็นธีมสัตว์เลี้ยง (เมนู “ธีม” หมวดสัตว์เลี้ยง)';
    const hud = c.themes?.[c.theme]?.meta?.hud;
    $('plCmds').innerHTML = '';
    if (!hud) $('plCmds').textContent = 'ธีมนี้ไม่มีคำสั่งพิมพ์ — เลือกธีมเลย์เอาต์งานวัด LIVE เพื่อใช้ (แต้มและร้านแลกยังใช้ได้ทุกธีม)';
    else {
      const ul = document.createElement('ul');
      for (const x of hud.cmds) {
        const li = document.createElement('li');
        li.textContent = `“${x.c}” → ${x.a}${x.zone ? ' (นับโซน)' : ''}`;
        ul.appendChild(li);
      }
      $('plCmds').appendChild(ul);
    }
  }
  function loadPlayTop() {
    socket.emit('play:topPoints', null, (list) => {
      const ol = $('plTop');
      ol.innerHTML = '';
      if (!list?.length) ol.innerHTML = '<li class="muted">ยังไม่มีใครมีแต้ม</li>';
      for (const r of list || []) {
        const li = document.createElement('li');
        li.textContent = `${r.n} — ${r.p.toLocaleString('en-US')} แต้ม`;
        ol.appendChild(li);
      }
    });
  }
  $('plSave').onclick = () => {
    const items = [...$('plItems').querySelectorAll('tr[data-key]')].map((tr) => ({
      key: tr.dataset.key,
      cost: Number(tr.querySelector('input[type=number]').value),
      on: tr.querySelector('input[type=checkbox]').checked,
    }));
    saveGlobal({ play: { enabled: $('plOn').checked, points: $('plPts').checked, shop: $('plShop').checked, cooldown: Number($('plCd').value), items } }, () => flashSaved('plSaved'));
  };
  // ---- น้องโตตามเช็คพอยต์ (ธีมสัตว์เลี้ยง)
  function pgHint() {
    const n = Math.max(1, Math.round(Number($('pgStep').value) || 10));
    $('pgHint').textContent = `ร่าง 2 ที่ ${n} • ร่าง 3 ที่ ${n * 2} • ร่าง 4 ที่ ${n * 3} • ร่าง 5 (ร่างตำนาน) ที่ ${n * 5} เพชร — นับรวมของขวัญทั้งไลฟ์`;
  }
  $('pgStep').addEventListener('input', pgHint);
  $('pgSave').onclick = () => saveGlobal({ petGrow: { on: $('pgOn').checked, step: Number($('pgStep').value), keep: $('pgKeep').checked } }, () => flashSaved('pgSaved'));
  document.querySelectorAll('[data-pg]').forEach((b) => {
    b.onclick = () => socket.emit('pet:growSet', Number(b.dataset.pg), (r) => r?.ok === false && alert(r.error));
  });
  $('pgReset').onclick = () => {
    if (!confirm('ให้น้องทุกธีมกลับเป็นร่าง 1?')) return;
    socket.emit('pet:growReset', null, () => {});
  };
  // ================================================================ 🕹️ เกมในไลฟ์ (ศูนย์ควบคุมตามเกมที่เล่นอยู่)
  const lgEsc = (t) => String(t ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  // ปุ่มเรียกเหตุการณ์ของแต่ละเกม: [ไอคอน, ชื่อ, คำอธิบาย, การกระทำ]
  const LG_EVENTS = window.LIVESTAGE_GAME_EVENTS || {}; // public/game-events.js (ใช้ร่วมกับห้องควบคุมไลฟ์)
  const lgThemes = () => Object.entries(config?.themes || {}).filter(([, t]) => t.meta?.mg || t.meta?.adv);
  const lgKey = () => {
    const m = config?.themes?.[config.theme]?.meta;
    return m?.adv ? 'adventure' : m?.mg || null;
  };
  let lgRendered = '';
  function lgRenderStatic() {
    if (!config) return;
    const m = config.themes[config.theme]?.meta || {};
    const key = lgKey();
    $('lgIcon').textContent = key ? m.icon : '🕹️';
    $('lgName').textContent = key ? m.name : 'ยังไม่ได้เลือกเกม';
    $('lgState').innerHTML = key ? '<span class="dot connected"></span>กำลังเล่นอยู่' : `ธีมที่ใช้อยู่: ${lgEsc(m.icon || '')} ${lgEsc(m.name || '')} (ไม่ใช่เกม)`;
    $('lgNav').textContent = key ? m.icon : '';
    // เปลี่ยนเกม ▾
    const pick = $('lgPick');
    const opts = `<option value="">— เลือกเกม —</option>` + lgThemes().map(([id, t]) => `<option value="${id}"${id === config.theme ? ' selected' : ''}>${lgEsc(t.meta.icon)} ${lgEsc(t.meta.name)}</option>`).join('');
    if (pick._h !== opts) {
      pick._h = opts;
      pick.innerHTML = opts;
    }
    pick.value = key ? config.theme : '';
    // ปุ่มเหตุการณ์ (สร้างใหม่เฉพาะตอนเปลี่ยนเกม)
    const sig = key + '|' + config.theme;
    if (lgRendered !== sig) {
      lgRendered = sig;
      const box = $('lgEvents');
      box.innerHTML = '';
      for (const [ic, name, desc, act] of LG_EVENTS[key] || []) {
        const b = document.createElement('button');
        b.className = 'btn lg-tile';
        b.innerHTML = `<b>${ic} ${lgEsc(name)}</b><span>${lgEsc(desc)}</span>`;
        b.onclick = () => {
          const done = (r) => (r?.ok === false ? alert(r.error || 'ใช้ไม่ได้ตอนนี้') : lgPoll());
          if (act.confirm && !confirm(act.confirm)) return;
          if (act.ev) socket.emit(act.ev, act.arg ?? null, done);
          else socket.emit('mg:admin', { ...act, action: act.mg }, done);
        };
        box.appendChild(b);
      }
      $('lgEvNote').textContent = key ? 'ปุ่มเปลี่ยนตามเกมที่เล่นอยู่ — เปลี่ยนเกมจากมุมขวาบนหรือคิวเกม' : 'เลือกเกมจาก “เปลี่ยนเกม” ด้านบนก่อน';
      if (!key) $('lgLive').innerHTML = '<p class="muted">ยังไม่ได้เล่นเกม — เลือกเกมจาก “เปลี่ยนเกม” หรือเปิดคิวเกมให้เปลี่ยนอัตโนมัติ</p>';
      $('lgChips').innerHTML = '';
      lgRenderSettings(key);
      $('lgStatsBody').innerHTML = '<p class="muted">กำลังโหลด…</p>';
    }
    lgRenderQueue();
  }
  $('lgPick').onchange = () => {
    const id = $('lgPick').value;
    if (!id || id === config.theme) return;
    if (liveStatus === 'connected' && !confirm(`เปลี่ยนเป็น “${config.themes[id].meta.name}” ตอนนี้เลย? (กำลังไลฟ์อยู่)`)) return lgRenderStatic();
    socket.emit('admin:setTheme', id);
  };

  // ---- คิวเกม (เปลี่ยนเกมอัตโนมัติ) — แก้แล้วบันทึกทันที
  let rotDraft = null;
  const rotSave = () => saveGlobal({ mgRotate: rotDraft }, () => flashSaved('rotSaved'));
  function lgRenderQueue() {
    if (!config) return;
    if (!rotDraft || document.activeElement !== $('rotMin')) rotDraft = structuredClone(config.mgRotate || { on: false, minutes: 15, list: [] });
    $('rotOn').checked = !!rotDraft.on;
    if (document.activeElement !== $('rotMin')) $('rotMin').value = rotDraft.minutes || 15;
    const box = $('rotList');
    const html = rotDraft.list.map((id, i) => {
      const t = config.themes[id]?.meta;
      if (!t) return '';
      const now = id === config.theme;
      return `<div class="lg-qi${now ? ' now' : ''}"><span class="nm">${i + 1}. ${lgEsc(t.icon)} ${lgEsc(t.name)}${now ? ' <small class="muted">· เล่นอยู่</small>' : ''}</span>
        <button class="btn sm" data-q="up" data-i="${i}" ${i === 0 ? 'disabled' : ''}>↑</button><button class="btn sm" data-q="down" data-i="${i}" ${i === rotDraft.list.length - 1 ? 'disabled' : ''}>↓</button><button class="btn sm" data-q="del" data-i="${i}">✕</button></div>`;
    }).join('') || '<p class="muted">ยังไม่มีเกมในคิว — เพิ่มด้านล่าง (อย่างน้อย 2 เกม)</p>';
    if (box._h !== html) {
      box._h = html;
      box.innerHTML = html;
    }
    const add = $('rotAdd');
    const opts = lgThemes().filter(([id]) => !rotDraft.list.includes(id)).map(([id, t]) => `<option value="${id}">${lgEsc(t.meta.icon)} ${lgEsc(t.meta.name)}</option>`).join('');
    if (add._h !== opts) {
      add._h = opts;
      add.innerHTML = opts || '<option value="">ครบทุกเกมแล้ว</option>';
    }
  }
  $('rotList').onclick = (e) => {
    const b = e.target.closest('button[data-q]');
    if (!b) return;
    const i = Number(b.dataset.i);
    const L = rotDraft.list;
    if (b.dataset.q === 'up' && i > 0) [L[i - 1], L[i]] = [L[i], L[i - 1]];
    if (b.dataset.q === 'down' && i < L.length - 1) [L[i + 1], L[i]] = [L[i], L[i + 1]];
    if (b.dataset.q === 'del') L.splice(i, 1);
    if (L.length < 2) rotDraft.on = false;
    rotSave();
  };
  $('rotAddBtn').onclick = () => {
    const id = $('rotAdd').value;
    if (!id) return;
    rotDraft.list.push(id);
    rotSave();
  };
  $('rotOn').onchange = () => {
    if ($('rotOn').checked && rotDraft.list.length < 2) {
      $('rotOn').checked = false;
      return alert('เพิ่มเกมในคิวอย่างน้อย 2 เกมก่อน');
    }
    rotDraft.on = $('rotOn').checked;
    rotSave();
  };
  $('rotMin').onchange = () => {
    rotDraft.minutes = Number($('rotMin').value) || 15;
    rotSave();
  };
  $('rotNow').onclick = () => socket.emit('mg:rotateNow', null, (r) => r?.ok === false && alert(r.error));

  // ---- ตั้งค่าเกมนี้
  function lgRenderSettings(key) {
    const b = $('lgSetBody');
    if (key === 'quiz') {
      b.innerHTML = `<p class="muted" style="margin-top:0">คำถามของช่อง — บรรทัดละข้อ: <b>อีโมจิ | คำตอบ1, คำตอบ2</b> เช่น “🎤 | พี่ต้น, ต้น” ออกทุก 3 รอบ</p>
        <textarea id="qcText" rows="6" style="width:100%" placeholder="🎤 | พี่ต้น, ต้น&#10;🐱 | เจ้าเหมียว, เหมียว"></textarea>
        <div class="row"><button class="btn primary" id="qcSave">บันทึกคำถาม</button><span class="saved" id="qcSaved">บันทึกแล้ว ✓</span><span class="muted" id="qcCount"></span></div>`;
      const show = (r) => {
        if (!r) return;
        if (document.activeElement !== $('qcText')) $('qcText').value = r.text || '';
        $('qcCount').textContent = `ใช้ได้ ${r.count || 0} ข้อ`;
      };
      socket.emit('mg:quizCustom', null, show);
      $('qcSave').onclick = () => socket.emit('mg:quizCustom', { text: $('qcText').value }, (r) => (show(r), flashSaved('qcSaved')));
    } else if (key) {
      b.innerHTML = '<p class="muted" style="margin:0">เกมนี้ใช้ค่าที่ปรับมาให้แล้ว ไม่ต้องตั้งเพิ่ม · แก้หัวข้อ/คำโปรยบนจอได้ที่ “🎛️ ตั้งค่าหน้าไลฟ์” · ของขวัญแต่ละชิ้นทำอะไร ดู/เปลี่ยนได้ที่ “🎁 ของขวัญ”</p>';
    } else b.innerHTML = '<p class="muted" style="margin:0">เลือกเกมก่อน</p>';
  }

  // ---- สถานะสด + สถิติ (ถามเซิร์ฟเวอร์ทุก 1.5 วิ ตอนเปิดหน้านี้)
  const ln = (a, b, warn) => `<div class="ln${warn ? ' warn' : ''}"><span>${a}</span><b>${b}</b></div>`;
  const bar = (pct) => `<div class="bar"><i style="width:${Math.max(0, Math.min(100, pct)).toFixed(0)}%"></i></div>`;
  const chip = (t, warn) => `<span class="lg-chip${warn ? ' warn' : ''}">${t}</span>`;
  const TEAMN = { r: 'แดง', b: 'น้ำเงิน' };
  function lgLive(key, s, extra) {
    let chips = '';
    let live = '';
    let stats = '';
    const fameList = (arr, fmt) => (arr?.length ? arr.map((x, i) => `${['🥇', '🥈', '🥉', '4.', '5.'][i]} ${fmt(x)}`).join('<br>') : 'ยังไม่มีข้อมูล');
    if (key === 'adventure') {
      chips = chip(`🗺️ ขั้น ${s.stage + 1} · ด่าน ${s.wave}/${s.waves}`) + chip(`❤️ HP ${s.hp}/100`, s.hp < 35) + chip(`⏰ ช่วงทอง ${s.boost?.on ? 'เปิดอยู่' : `อีก ${Math.ceil((s.boost?.left || 0) / 60)} นาที`}`);
      live = (s.enemy ? `${ln(s.enemy.boss ? '👹 บอส' : '⚔️ ศัตรู', lgEsc(s.enemy.name))}${bar((s.enemy.hp / s.enemy.max) * 100)}${s.charge ? ln('⚠️ บอสชาร์จ', `${s.charge.n}/${s.charge.need} คนพิมพ์ “กัน”`, true) : ''}` : ln('สถานะ', { walk: 'กำลังเดินทาง', vote: 'โหวตทางแยก', loot: 'เก็บของ', clear: 'ชนะบอส!', retreat: 'ถอยไปตั้งหลัก' }[s.phase] || s.phase)) +
        ln('📜 ภารกิจไลฟ์', `${lgEsc(s.quest?.text || '-')} ${s.quest?.n || 0}/${s.quest?.need || 0}`) + ln('🥇 ตีแรงสุด', s.top?.[0] ? `${lgEsc(s.top[0].n)} ${s.top[0].d}` : '-');
      stats = extra ? `<p style="margin-top:0">${fameList(extra.lv, (x) => `${lgEsc(x.n)} — ${lgEsc(x.t)} Lv.${x.lv}`)}</p><p class="muted">นักผจญภัยทั้งหมด ${extra.heroes || 0} คน</p>` : '';
    } else if (key === 'boat') {
      chips = chip(`🏁 รอบที่ ${s.round}`) + chip(s.phase === 'race' ? 'กำลังแข่ง' : s.phase === 'ready' ? `เริ่มใน ${s.left} วิ` : 'จบรอบ') + chip(`🔴 ${s.n?.r || 0} · 🔵 ${s.n?.b || 0} คน`);
      live = ln('🔴 ทีมแดง', `${Math.floor(s.p?.r || 0)}%`) + bar(s.p?.r || 0) + ln('🔵 ทีมน้ำเงิน', `${Math.floor(s.p?.b || 0)}%`) + bar(s.p?.b || 0) +
        (s.heave ? ln('🥁 ฮึบ!', `แดง ${s.heave.cnt.r}/${s.heave.need.r} · น้ำเงิน ${s.heave.cnt.b}/${s.heave.need.b}`, true) : '') + ln('🏆 ชนะสะสม', `แดง ${s.wins?.r || 0} · น้ำเงิน ${s.wins?.b || 0}`);
      stats = `<p style="margin-top:0">${fameList(s.fame, (x) => `${lgEsc(x.n)} — พาย ${x.s} ครั้ง · ชนะ ${x.w}`)}</p>`;
    } else if (key === 'fish') {
      chips = chip(`📖 สมุดห้อง ${s.room}/${s.total}`) + chip(`🎣 ตกได้ไลฟ์นี้ ${s.catches}`) + ((s.season || []).length ? chip('🌙 ปลาประจำเวลาออก') : '');
      live = (s.recent || []).map((x) => ln(lgEsc(x.n), `${lgEsc(x.name)} ${x.cm} ซม.`)).join('') || '<p class="muted">ยังไม่มีใครตก — กด “ฝูงปลาว่ายผ่าน” ชวนคนดู</p>';
      stats = `<p style="margin-top:0">🏆 ใหญ่สุดสัปดาห์:<br>${fameList(s.week, (x) => `${lgEsc(x.n)} — ${lgEsc(x.name)} ${x.cm} ซม.`)}</p>`;
    } else if (key === 'village') {
      chips = chip(`🏡 รอบที่ ${s.lv} · สร้างแล้ว ${(s.built || []).length}/10`) + chip(`🥬 ${s.res?.veg || 0} · 🌾 ${s.res?.rice || 0}`);
      const ripe = (s.plots || []).filter((p) => p[0] === 4).length;
    } else if (key === 'adventure') {
      const NAMES = { 1: 'ตายไว ×1', 1.5: 'อึดขึ้น ×1.5', 2: 'อึด ×2 (แนะนำ)', 3: 'อึดมาก ×3' };
      b.innerHTML = `<div class="row" style="margin-top:0"><label>👹 ความอึดของศัตรู <select id="advTough"></select></label><span class="saved" id="advToughSaved">บันทึกแล้ว ✓</span></div>
        <p class="muted" style="margin-bottom:0">คูณเลือดมอนสเตอร์และบอส ยิ่งมากยิ่งตีนาน · คนดูเยอะเลือดเพิ่มให้เองอยู่แล้ว · เปลี่ยนแล้วมีผลกับตัวที่สู้อยู่ทันที</p>`;
      const show = (r) => {
        if (!r) return;
        $('advTough').innerHTML = r.choices.map((v) => `<option value="${v}"${v === r.tough ? ' selected' : ''}>${NAMES[v] || '×' + v}</option>`).join('');
      };
      socket.emit('adv:tough', null, show);
      $('advTough').onchange = () => socket.emit('adv:tough', { tough: Number($('advTough').value) }, (r) => (show(r), flashSaved('advToughSaved')));
      const empty = (s.plots || []).filter((p) => p[0] === 0).length;
      live = ln('🏗️ กำลังสร้าง', lgEsc(s.cur?.name || '-')) + bar(((s.cur?.prog || 0) / (s.cur?.need || 1)) * 100) + ln('🌱 แปลง', `สุก ${ripe} · ว่าง ${empty} · จองแล้ว ${(s.plots || []).filter((p) => p[4]).length}`) +
        (s.crows ? ln('🐦 อีกาบุก', `${s.crows.n}/${s.crows.need} คนพิมพ์ “ไล่” · ${s.crows.left} วิ`, true) : '') + (s.merchant ? ln('🛒 พ่อค้าเร่', `${s.merchant.n} คนขายแล้ว · ${s.merchant.left} วิ`) : '');
      stats = `<p style="margin-top:0">${Object.entries(s.names || {}).map(([k, v]) => `🏗️ ${lgEsc(k)}: ${v.map(lgEsc).join(', ')}`).join('<br>') || 'ยังไม่มีสิ่งก่อสร้าง'}</p>`;
    } else if (key === 'quiz') {
      const q = extra;
      chips = chip(`🖼️ รอบที่ ${s.round}${s.teamMode ? ' · รอบทีม' : ''}`) + chip(s.phase === 'show' ? `⏱️ ${s.left} วิ · เปิด ${s.opened}/16` : 'เฉลยแล้ว');
      live = q?.e ? `<div class="qa-box" style="margin:0 0 8px"><div class="qa-h">🔒 เฉลย (เห็นเฉพาะหลังบ้าน)</div><div class="qa-a">${lgEsc(q.e)} ${lgEsc(q.a[0] || '')}</div><div class="muted">รับ: ${q.a.map(lgEsc).join(', ')} · หมวด ${lgEsc(q.c)}</div></div>` : '';
      live += ln('✅ ตอบถูก', (s.solved || []).map((x) => lgEsc(x.n)).join(', ') || '-') + (s.teamMode ? ln('⚔️ ทีม', `แดง ${s.tround?.r || 0} : น้ำเงิน ${s.tround?.b || 0}`) : '');
      stats = `<p style="margin-top:0">${fameList(s.fame, (x) => `${lgEsc(x.n)} — ${x.s} แต้ม (ถูก ${x.w} ครั้ง)`)}</p>`;
    } else if (key === 'kitchen') {
      chips = chip('⭐'.repeat(s.stars || 3)) + chip(`🔥 คอมโบ ×${s.combo}`) + chip(`🍽️ ${s.served} จาน · 💰 ${s.tips}`) + (s.vip ? chip('💎 VIP') : '');
      live = (s.bills || []).map((b) => ln(`${b.celeb ? '🌟 ' : b.vip ? '💎 ' : ''}${lgEsc(b.dish)}`, b.ready ? '✅ รอเสิร์ฟ' : `ขาด ${b.need.filter((x) => !b.have.includes(x)).join(' ')} · ${b.left} วิ`, !b.ready && b.left < 10)).join('') || '<p class="muted">ยังไม่มีบิล</p>';
      live += ln('👨‍🍳 สถานี', `🔪 ${s.stations?.cut || 0} · 🔥 ${s.stations?.fry || 0} · 🍲 ${s.stations?.boil || 0}`);
      stats = `<p style="margin-top:0">${fameList(s.fame, (x) => `${lgEsc(x.n)} — ใส่วัตถุดิบ ${x.c}`)}</p><p class="muted">เสิร์ฟทั้งหมด ${s.total || 0} จาน · คอมโบสูงสุด ${s.best || 0}</p>`;
    } else if (key === 'castle') {
      const n = s.lanes || [0, 0, 0];
      const mx = Math.max(...n);
      chips = chip(`🌊 ระลอก ${s.wave}`) + chip(`🏰 ${s.hp}/${s.max}`, s.hp < 350) + chip(`👥 ${n.join(' · ')}`, mx > 2 && Math.min(...n) < mx / 3);
      live = ln('🏰 ปราสาท', `${s.hp}/${s.max}`) + bar((s.hp / s.max) * 100) + ['⬅️ เลนซ้าย', '⬆️ เลนกลาง', '➡️ เลนขวา'].map((t, i) => ln(t, `${n[i]} คน${mx > 2 && n[i] < mx / 3 ? ' ⚠️ น้อย' : ''}`, mx > 2 && n[i] < mx / 3)).join('') +
        ln('ป้อม', `🔥${s.up?.fire || 0} ❄️${s.up?.ice || 0} 🏹${s.up?.arrow || 0}`) + (s.vote ? ln(`🗳️ โหวต · ${s.vote.left} วิ`, `🔥${s.vote.c.fire} ❄️${s.vote.c.ice} 🏹${s.vote.c.arrow}`, true) : '');
      stats = `<p style="margin-top:0">${fameList(s.fame, (x) => `${lgEsc(x.n)} — ล้มศัตรู ${x.k}`)}</p><p class="muted">ระลอกสูงสุด ${s.best || 0}</p>`;
    }
    if ($('lgChips')._h !== chips) ($('lgChips')._h = chips), ($('lgChips').innerHTML = chips);
    if ($('lgLive')._h !== live) ($('lgLive')._h = live), ($('lgLive').innerHTML = live);
    const reset = `<div class="row" style="margin-top:8px"><button class="btn sm danger" id="lgReset">ล้างข้อมูลข้ามไลฟ์ของเกมนี้</button><span class="muted">ย้อนกลับไม่ได้</span></div>`;
    if ($('lgStats').open && $('lgStatsBody')._h !== stats + reset) {
      $('lgStatsBody')._h = stats + reset;
      $('lgStatsBody').innerHTML = stats + reset;
      $('lgReset').onclick = () => {
        if (!confirm(key === 'adventure' ? 'ล้างเลเวล/ทอง/ชุดของคนดูทั้งหมด?' : key === 'pet' ? 'เริ่มเลี้ยงตัวใหม่ตั้งแต่ไข่ และล้างรายชื่อคนดูแลสะสม? น้องตัวเดิมจะหายไป' : 'ล้างสถิติข้ามไลฟ์ของเกมนี้ (เช่น สมุดปลา หมู่บ้าน แต้มสะสม)?')) return;
        if (key === 'adventure') socket.emit('adv:resetHeroes', null, () => lgPoll());
        else socket.emit('mg:admin', { action: 'reset' }, () => lgPoll());
      };
    }
  }
  function lgPoll() {
    if (currentPage !== 'live' || document.hidden || !config) return;
    lgRenderStatic();
    const key = lgKey();
    const r = config.mgRotate;
    $('rotLeft').textContent = r?.on ? 'เปิดอยู่' : 'ปิดอยู่';
    if (!key) return;
    if (key === 'adventure') socket.emit('adv:get', null, (s) => s && ($('lgStats').open ? socket.emit('adv:fame', null, (f) => lgLive(key, s, f)) : lgLive(key, s)));
    else
      socket.emit('mg:get', null, (s) => {
        if (!s) return;
        if (s.next) $('rotLeft').textContent = `${s.next.icon} ${s.next.name} ใน ${Math.floor(s.next.left / 60)}:${String(s.next.left % 60).padStart(2, '0')}`;
        if (key === 'quiz') socket.emit('mg:quizAnswer', null, (q) => lgLive(key, s, q));
        else lgLive(key, s);
      });
  }
  setInterval(lgPoll, 1500);
  document.querySelector('.nav[data-page="live"]')?.addEventListener('click', () => setTimeout(lgPoll, 50));
  $('lgStats').addEventListener('toggle', lgPoll);
  socket.on('config', () => setTimeout(() => {
    lgRenderStatic();
    lgPoll();
  }, 30));
  $('plRefresh').onclick = loadPlayTop;
  $('plReset').onclick = () => {
    if (!confirm('ล้างแต้มของคนดูทุกคน? (ย้อนกลับไม่ได้)')) return;
    socket.emit('play:resetPoints', null, loadPlayTop);
  };
  document.querySelector('.nav[data-page="play"]')?.addEventListener('click', loadPlayTop);

  // ---------------- รอเริ่ม / พักเบรก
  $('bkSoon').onclick = () => socket.emit('mode:set', { kind: 'soon', minutes: Number($('bkMin').value), title: $('bkTitle').value, sub: $('bkSub').value });
  $('bkBrb').onclick = () => socket.emit('mode:set', { kind: 'brb', minutes: Number($('bkBrbMin').value) });
  $('bkEnd').onclick = () => socket.emit('mode:clear');
  socket.on('stageMode', (m) => {
    $('bkNow').textContent = !m ? 'ตอนนี้: ไลฟ์ปกติ' : m.kind === 'soon' ? `ตอนนี้: ฉากรอเริ่ม • มาก่อน ${m.earlyCount} คน` : 'ตอนนี้: พักเบรก';
  });

  // ---------------- ขายของ (CF)
  let cfRows = [];
  let cfSel = -1; // แถวที่เลือก (สำหรับ Ctrl+V วางรูป)
  const cfFromState = (st) => (st.products || []).map((p) => ({ code: p.code, name: p.name, price: p.price, stock: p.stock, img: p.img || '' }));
  let cfLoaded = false;
  let cfState = null;
  const cfMoney = (n) => (n === '' || n == null ? '' : Number(n).toLocaleString('en-US'));
  function renderCfProducts() {
    const showing = cfState?.showing?.code;
    const live = Object.fromEntries((cfState?.products || []).map((p) => [p.code, p]));
    $('cfTbl').innerHTML =
      '<tr><td><b>รูป</b></td><td><b>รหัส</b></td><td><b>ชื่อสินค้า</b></td><td><b>ราคา</b></td><td><b>จำนวน</b></td><td><b>ขายแล้ว</b></td><td></td><td></td></tr>' +
      cfRows.map((r, i) => {
        const lp = live[r.code];
        const left = lp ? (lp.left == null ? 'ไม่จำกัด' : `เหลือ ${lp.left}`) : '';
        const img = r.img ? `<img src="/cf-img/${esc(r.img)}" alt=""><div class="ov"><span data-imgpick="${i}">เปลี่ยน</span><span class="rm" data-imgrm="${i}">ลบรูป</span></div>` : '+ รูป';
        return `<tr class="${showing && r.code === showing ? 'on' : ''}${i === cfSel ? ' sel' : ''}" data-row="${i}">
          <td><button class="cf-img${r.img ? ' has' : ''}" type="button" data-imgpick="${i}" aria-label="รูปสินค้า ${esc(r.code)}">${img}</button></td>
          <td><input data-i="${i}" data-k="code" value="${esc(r.code)}" placeholder="A1" style="width:70px"></td>
          <td><input data-i="${i}" data-k="name" value="${esc(r.name)}" placeholder="ชื่อสินค้า"></td>
          <td><input data-i="${i}" data-k="price" type="number" min="0" value="${esc(r.price)}" placeholder="ราคา" style="width:90px"></td>
          <td><input data-i="${i}" data-k="stock" type="number" min="0" value="${esc(r.stock ?? '')}" placeholder="ไม่จำกัด" style="width:90px"></td>
          <td class="muted">${lp ? `${lp.sold} • ${left}` : '-'}</td>
          <td><button class="btn sm primary" data-show="${i}">${showing && r.code === showing ? 'โชว์อยู่' : 'โชว์'}</button></td>
          <td><button class="btn sm" data-del="${i}">ลบ</button></td></tr>`;
      }).join('');
    $('cfCount').textContent = cfRows.length ? `${cfRows.length} รายการ` : '';
  }
  function renderCfOrders() {
    const st = cfState;
    if (!st) return;
    $('cfTotal').textContent = `${st.total} ออเดอร์ • ${st.buyers} คน`;
    const th = { ok: 'รับแล้ว', wait: 'คิวสำรอง', cancel: 'ยกเลิก' };
    $('cfOrders').innerHTML =
      '<tr><td><b>#</b></td><td><b>เวลา</b></td><td><b>คนดู</b></td><td><b>รหัส</b></td><td><b>จำนวน</b></td><td><b>หมายเหตุ</b></td><td><b>สถานะ</b></td></tr>' +
      (st.orders || []).map((o) => `<tr class="${o.status}">
        <td>${o.id}</td><td class="muted">${new Date(o.at).toLocaleTimeString('th-TH', { hour12: false })}</td><td>${esc(o.name)}</td><td><b>${esc(o.code)}</b></td><td>${o.qty}</td><td>${esc(o.note || '')}</td>
        <td><select data-oid="${o.id}">${Object.entries(th).map(([k, v]) => `<option value="${k}"${k === o.status ? ' selected' : ''}>${v}</option>`).join('')}</select></td></tr>`).join('') +
      (st.orders?.length ? '' : '<tr><td colspan="7" class="muted">ยังไม่มีออเดอร์ — ลองพิมพ์ “CF A1” ในหน้าทดสอบ</td></tr>');
    const sh = st.showing;
    $('cfShowNow').textContent = !st.enabled ? 'ปิดอยู่ — คอมเมนต์ CF จะไม่ถูกจด' : sh ? `กำลังโชว์ ${sh.code} ${sh.name}${sh.open ? '' : ' (ปิดรับแล้ว)'}` : 'เปิดรับอยู่ • ยังไม่ได้โชว์การ์ดสินค้าบนหน้าเวที';
  }
  function applyCf(st) {
    cfState = st;
    $('page-cf').classList.toggle('locked', !!st.locked);
    $('cfLock').hidden = !st.locked;
    if (!cfLoaded || !$('page-cf').contains(document.activeElement)) {
      $('cfOn').checked = !!st.enabled;
      $('cfAnn').checked = st.announce !== false;
      if (!cfLoaded) cfRows = cfFromState(st);
      cfLoaded = true;
    }
    renderCfProducts();
    renderCfOrders();
  }
  const cfLoad = () => socket.emit('cf:get', null, applyCf);
  $('cfUnlock').onclick = () => (window.parent?.lsGo ? window.parent.lsGo('unlock') : window.open('https://tubhool.com/', '_blank'));
  socket.on('cfAdmin', applyCf);
  document.querySelector('.nav[data-page="cf"]')?.addEventListener('click', cfLoad);
  if (location.hash === '#cf') setTimeout(cfLoad, 500);
  $('cfTbl').addEventListener('input', (e) => {
    const i = e.target.dataset.i;
    if (i == null) return;
    cfRows[i][e.target.dataset.k] = e.target.value;
  });
  // ---- รูปสินค้า: ย่อในหน้านี้ (ด้านยาวสุด 800 px, JPEG) แล้วส่งให้โปรแกรมเก็บไว้ในเครื่อง
  async function cfShrink(file) {
    if (!file || !/^image\//.test(file.type)) throw new Error('ไม่ใช่ไฟล์รูป');
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 800 / Math.max(bmp.width, bmp.height));
    const cv = document.createElement('canvas');
    cv.width = Math.round(bmp.width * k);
    cv.height = Math.round(bmp.height * k);
    const g = cv.getContext('2d');
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, cv.width, cv.height);
    g.drawImage(bmp, 0, 0, cv.width, cv.height);
    return cv.toDataURL('image/jpeg', 0.85);
  }
  const cfEmit = (ev, data) => new Promise((res) => socket.emit(ev, data, (r) => res(r || {})));
  // บันทึกแถวที่แก้ค้างไว้ก่อน แล้วค่อยทำเรื่องรูป (ไม่ให้ข้อมูลที่พิมพ์ไว้หาย)
  async function cfSaveRows() {
    const r = await cfEmit('cf:save', { products: cfRows });
    if (r.state) {
      cfRows = cfFromState(r.state);
      applyCf(r.state);
    }
  }
  async function cfSetImage(i, file) {
    try {
      const data = await cfShrink(file);
      await cfSaveRows();
      const code = cfRows[i]?.code;
      if (!code) return alert('ใส่รหัสสินค้าก่อนแนบรูป');
      const r = await cfEmit('cf:image', { code, data });
      if (r.ok === false) return alert(r.error);
      cfRows = cfFromState(r.state);
      applyCf(r.state);
    } catch (err) {
      alert('ใส่รูปไม่สำเร็จ: ' + err.message);
    }
  }
  async function cfAddImages(files) {
    const list = [...files].filter((f) => /^image\//.test(f.type));
    if (!list.length) return;
    await cfSaveRows();
    for (const f of list) {
      try {
        const r = await cfEmit('cf:addWithImage', { data: await cfShrink(f) });
        if (r.ok === false) {
          alert(r.error);
          break;
        }
        cfRows = cfFromState(r.state);
        applyCf(r.state);
      } catch (err) {
        alert('ใส่รูปไม่สำเร็จ: ' + err.message);
      }
    }
  }
  let cfPickRow = -1;
  $('cfFile').onchange = () => {
    const f = $('cfFile').files[0];
    $('cfFile').value = '';
    if (f && cfPickRow >= 0) cfSetImage(cfPickRow, f);
  };
  $('cfFiles').onchange = () => {
    const fs = [...$('cfFiles').files];
    $('cfFiles').value = '';
    cfAddImages(fs);
  };
  $('cfPickMany').onclick = () => $('cfFiles').click();
  const dropOn = (el, on) => el.classList.toggle(el.id === 'cfDrop' ? 'over' : 'drag', on);
  $('cfDrop').addEventListener('dragover', (e) => (e.preventDefault(), dropOn($('cfDrop'), true)));
  $('cfDrop').addEventListener('dragleave', () => dropOn($('cfDrop'), false));
  $('cfDrop').addEventListener('drop', (e) => {
    e.preventDefault();
    dropOn($('cfDrop'), false);
    cfAddImages(e.dataTransfer.files);
  });
  $('cfTbl').addEventListener('dragover', (e) => {
    const tr = e.target.closest('tr[data-row]');
    if (!tr) return;
    e.preventDefault();
    $('cfTbl').querySelectorAll('tr.drag').forEach((x) => x !== tr && x.classList.remove('drag'));
    tr.classList.add('drag');
  });
  $('cfTbl').addEventListener('dragleave', (e) => e.target.closest('tr[data-row]')?.classList.remove('drag'));
  $('cfTbl').addEventListener('drop', (e) => {
    const tr = e.target.closest('tr[data-row]');
    if (!tr) return;
    e.preventDefault();
    tr.classList.remove('drag');
    const f = e.dataTransfer.files[0];
    if (f) cfSetImage(Number(tr.dataset.row), f);
  });
  $('cfTbl').addEventListener('focusin', (e) => {
    const tr = e.target.closest('tr[data-row]');
    if (tr) cfSel = Number(tr.dataset.row);
  });
  document.addEventListener('paste', (e) => {
    if (!$('page-cf').classList.contains('on') || cfSel < 0 || !cfRows[cfSel]) return;
    const f = [...(e.clipboardData?.files || [])].find((x) => /^image\//.test(x.type));
    if (!f) return;
    e.preventDefault();
    cfSetImage(cfSel, f);
  });
  $('cfTbl').addEventListener('click', (e) => {
    const rm = e.target.closest('[data-imgrm]')?.dataset.imgrm;
    const pick = e.target.closest('[data-imgpick]')?.dataset.imgpick;
    if (rm != null) {
      e.stopPropagation();
      cfSaveRows().then(() => cfEmit('cf:imageRemove', { code: cfRows[rm]?.code })).then((r) => r.state && (cfRows = cfFromState(r.state), applyCf(r.state)));
      return;
    }
    if (pick != null) {
      cfSel = cfPickRow = Number(pick);
      $('cfFile').click();
      return;
    }
    const del = e.target.dataset.del;
    const show = e.target.dataset.show;
    if (del != null) {
      cfRows.splice(Number(del), 1);
      renderCfProducts();
    } else if (show != null) {
      const code = String(cfRows[show].code || '').toUpperCase().replace(/\s+/g, '');
      socket.emit('cf:save', { products: cfRows }, () => socket.emit('cf:show', { code, seconds: Number($('cfSec').value) }, (r) => r?.ok === false && alert(r.error)));
    }
  });
  $('cfAdd').onclick = () => {
    const last = cfRows[cfRows.length - 1];
    const m = /^([A-Za-zก-๙]*)(\d+)$/.exec(last?.code || '');
    cfRows.push({ code: m ? m[1] + (Number(m[2]) + 1) : last ? '' : 'A1', name: '', price: '', stock: '' });
    renderCfProducts();
  };
  $('cfSave').onclick = () => socket.emit('cf:save', { products: cfRows }, (r) => {
    cfRows = cfFromState(r.state);
    applyCf(r.state);
    flashSaved('cfSaved');
  });
  $('cfOn').onchange = () => socket.emit('cf:save', { enabled: $('cfOn').checked }, (r) => applyCf(r.state));
  $('cfAnn').onchange = () => socket.emit('cf:save', { announce: $('cfAnn').checked }, (r) => applyCf(r.state));
  $('cfHide').onclick = () => socket.emit('cf:hide');
  $('cfOrders').addEventListener('change', (e) => {
    const id = Number(e.target.dataset.oid);
    if (id) socket.emit('cf:status', { id, status: e.target.value });
  });
  $('cfExport').onclick = () =>
    socket.emit('cf:export', null, (r) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([r.csv], { type: 'text/csv;charset=utf-8' }));
      a.download = r.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    });
  $('cfCopy').onclick = () => {
    const list = (cfState?.orders || []).filter((o) => o.status !== 'cancel').slice().reverse();
    const text = list.map((o, i) => `${i + 1}. ${o.name} — ${o.code}${o.qty > 1 ? ' x' + o.qty : ''}${o.note ? ' (' + o.note + ')' : ''}${o.status === 'wait' ? ' [คิวสำรอง]' : ''}`).join(String.fromCharCode(10));
    navigator.clipboard?.writeText(text).then(() => flashSaved('cfCopied'));
  };
  $('cfClear').onclick = () => confirm('เริ่มรอบขายใหม่? ออเดอร์ทั้งหมดในรายการนี้จะถูกล้าง (ส่งออก Excel เก็บไว้ก่อนได้)') && socket.emit('cf:clear');
  if (location.hash === '#play') setTimeout(loadPlayTop, 800);

  // ซ่อนเมนู/การ์ดที่หลังบ้าน TubHool ปิดไว้
  function applyFeatures(f) {
    if (!f) return;
    document.querySelectorAll('[data-feature]').forEach((el) => (el.hidden = f[el.dataset.feature] === false));
  }
  socket.on('config', (c) => {
    applyFeatures(c.features);
    fillForms(c);
    fillExtras(c);
    fillPlay(c);
    renderRequests(lastRequests);
  });
  socket.on('status', setStatus);
  socket.on('viewers', (n) => ($('viewers').textContent = n));
  socket.on('like', (d) => ($('likes').textContent = d.total));
  socket.on('counters', (c) => {
    $('viewers').textContent = c.viewers;
    $('likes').textContent = c.totalLikes;
  });
  socket.on('join', () => ($('crowdCount').textContent = ++crowd));
  socket.on('leave', () => ($('crowdCount').textContent = crowd = Math.max(0, crowd - 1)));
  socket.on('requests', renderRequests);
  socket.on('logs', (list) => {
    const box = $('log');
    box.innerHTML = '';
    list.forEach((e) => box.appendChild(logLine(e)));
  });
  socket.on('log', (e) => {
    const box = $('log');
    box.prepend(logLine(e));
    while (box.children.length > 300) box.lastChild.remove();
  });

  const startPage = location.hash.slice(1);
  if (startPage && $('page-' + startPage)) showPage(startPage);
})();
