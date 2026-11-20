/* หน้าตั้งค่า "เพลงในไลฟ์" — เพลย์ลิสต์ไฟล์ในเครื่อง (อัปโหลดเข้าโฟลเดอร์ข้อมูลของโปรแกรม)
 * เล่นที่หน้าเวทีที่มีเสียง • หน้านี้ส่งคำสั่ง (music:cmd) และแสดงสถานะ (music:state) */
(() => {
  const $ = (id) => document.getElementById(id);
  if (!$('page-music')) return;
  const socket = io();
  let pl = null; // config.playlist
  let st = { id: null, playing: false, pos: 0, dur: 0, at: 0 };
  let stAt = 0;
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const fmt = (sec) => {
    sec = Math.max(0, Math.round(sec || 0));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
  };
  const previewBox=document.createElement('div');
  previewBox.className='card';
  previewBox.innerHTML='<h3>ฟังทดสอบในเครื่อง</h3><p class="muted">กด ▶ ที่แถบเสียงนี้เพื่อฟังเพลงในเครื่องได้เลย หรือกด “ฟังในเครื่อง” ข้างเพลง · “เล่นเข้าไลฟ์” ต้องเปิดหน้าเวที</p><audio id="mLocalAudio" controls preload="none" style="width:100%" aria-label="ฟังเพลงทดสอบในเครื่อง"></audio><p id="mLocalStatus" role="status">ยังไม่ได้เลือกเพลงทดสอบ</p>';
  $('mList').closest('.card').insertAdjacentElement('beforebegin',previewBox);
  const localAudio=$('mLocalAudio');let localId=null;
  function stopPreview(message){localAudio.pause();localAudio.removeAttribute('src');localAudio.load();localId=null;$('mLocalStatus').textContent=message||'หยุดฟังทดสอบแล้ว';}
  function selectPreview(it){
    localId=it.id;localAudio.volume=Math.max(0,Math.min(1,pl.volume??0.7));
    localAudio.src='/music-files/'+encodeURIComponent(it.file);localAudio.load();
    $('mLocalStatus').textContent='พร้อมฟัง: '+it.title+' — กด ▶ ที่แถบเสียงด้านบน (ฟังในเครื่อง)';
  }
  localAudio.addEventListener('play',()=>{if(st.playing&&st.at&&Date.now()-stAt<6000){localAudio.pause();$('mLocalStatus').textContent='หน้าเวทีกำลังเล่นเพลง กรุณาหยุดเพลงเข้าไลฟ์ก่อนฟังทดสอบ';}});
  localAudio.addEventListener('playing',()=>{$('mLocalStatus').textContent='กำลังฟังทดสอบในเครื่อง · ไม่ได้สั่งเล่นเข้าไลฟ์';});
  localAudio.addEventListener('ended',()=>{$('mLocalStatus').textContent='ฟังทดสอบจบแล้ว';});
  localAudio.addEventListener('error',()=>{$('mLocalStatus').textContent='เปิดไฟล์เพลงนี้ไม่ได้ กรุณาตรวจไฟล์หรือแปลงเป็น MP3 / WAV แล้วเพิ่มใหม่';});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&localId){localAudio.pause();$('mLocalStatus').textContent='พักเพลงทดสอบแล้ว — กด ▶ ที่แถบเสียงเพื่อฟังต่อ';}});
  const cmd = (action, extra = {}) => {
    if(!st.at || Date.now()-stAt>=6000){
      const message='ยังเล่นเข้าไลฟ์ไม่ได้ เพราะไม่มีหน้าเวทีเปิดเสียง · หากต้องการฟังตอนนี้ กด “ฟังในเครื่อง” หรือ ▶ ที่แถบเสียง';
      $('mWarn').hidden=false;$('mWarn').textContent=message;$('mLocalStatus').textContent=message;$('mLocalStatus').scrollIntoView({block:'center',behavior:'smooth'});return;
    }
    stopPreview('หยุดฟังทดสอบเพื่อควบคุมเพลงบนหน้าเวที');
    socket.emit('music:cmd', { action, ...extra });
  };
  const save = (patch, cb) => socket.emit('admin:saveConfig', { playlist: { ...pl, ...patch } }, cb);

  socket.on('snapshot', (s) => apply(s.config));
  socket.on('config', apply);
  socket.on('music:state', (s) => {
    st = s || st;
    if(st.playing && localId) stopPreview('หยุดฟังทดสอบ เพราะหน้าเวทีกำลังเล่นเพลง');
    stAt = Date.now();
    renderNow();
    markPlaying();
  });

  function apply(c) {
    if (!c?.playlist) return;
    const first = !pl;
    pl = c.playlist;
    if(localId && !pl.items.some(x=>x.id===localId))stopPreview('เพลงทดสอบถูกนำออกจากรายการแล้ว');
    if(!localId && pl.items.length && !st.playing)selectPreview(pl.items[0]);
    if (first || !$('page-music').contains(document.activeElement)) fillOptions();
    $('mAck').checked = !!pl.ack;
    $('mAck').disabled = !!pl.ack;
    $('mAckRow').classList.toggle('done', !!pl.ack);
    $('mAckNote').textContent = pl.ack ? 'ยืนยันแล้ว ✓' : 'ติ๊กครั้งเดียว ถึงจะเพิ่มเพลงได้';
    $('mDrop').classList.toggle('off', !pl.ack);
    renderList();
    renderNow();
  }

  // ---------------- ตัวเลือก
  function fillOptions() {
    $('mVol').value = Math.round((pl.volume ?? 0.7) * 100);
    $('mDuck').value = Math.round((pl.duckTo ?? 0.35) * 100);
    $('mVolV').textContent = $('mVol').value + '%';
    $('mDuckV').textContent = $('mDuck').value + '%';
    $('mLoop').value = pl.loop === false ? 'stop' : 'loop';
    $('mShuffle').checked = !!pl.shuffle;
    $('mFade').value = String(pl.fade ?? 2);
    $('mStopBg').checked = pl.stopBg !== false;
    $('mShow').checked = pl.showTitle !== false;
    $('mAuto').checked = !!pl.autoStart;
  }
  let volT = 0;
  for (const [id, key, out] of [['mVol', 'volume', 'mVolV'], ['mDuck', 'duckTo', 'mDuckV']]) {
    $(id).addEventListener('input', () => {
      $(out).textContent = $(id).value + '%';
      clearTimeout(volT);
      volT = setTimeout(() => save({ [key]: Number($(id).value) / 100 }), 120); // ปรับสด — หน้าเวทีเฟดตามเอง
    });
  }
  $('mAck').onchange = () => $('mAck').checked && save({ ack: true });
  $('mLoop').onchange = () => save({ loop: $('mLoop').value === 'loop' });
  $('mFade').onchange = () => save({ fade: Number($('mFade').value) });
  for (const [id, key] of [['mShuffle', 'shuffle'], ['mStopBg', 'stopBg'], ['mShow', 'showTitle'], ['mAuto', 'autoStart']]) $(id).onchange = () => save({ [key]: $(id).checked });

  // ---------------- กำลังเล่น
  $('mPrev').onclick = () => cmd('prev');
  $('mNext').onclick = () => cmd('next');
  $('mStop').onclick = () => cmd('stop');
  $('mPlay').onclick = () => cmd('toggle');
  $('mSeek').addEventListener('change', () => cmd('seek', { pos: (Number($('mSeek').value) / 1000) * (st.dur || 0) }));
  function renderNow() {
    if (!pl) return;
    const items = pl.items || [];
    const alive = st.at && Date.now() - stAt < 6000;
    for(const id of ['mPrev','mNext','mPlay','mStop','mSeek']) $(id).disabled=!items.length;
    const it = items.find((x) => x.id === st.id);
    const idx = it ? items.indexOf(it) + 1 : 0;
    $('mTitle').textContent = it ? it.title : items.length ? 'ยังไม่ได้เล่น — กด ▶ เพื่อเริ่มจากเพลงแรก' : 'ยังไม่มีเพลง — เพิ่มไฟล์ด้านล่าง';
    $('mSub').textContent = it ? `${st.playing ? 'กำลังเล่น' : 'หยุดชั่วคราว'} • เพลงที่ ${idx} จาก ${items.length}` : `${items.length} เพลงในรายการ`;
    $('mPlay').textContent = st.playing ? '⏸' : '▶';
    if (!$('mSeek').matches(':active')) $('mSeek').value = it && st.dur ? Math.round((st.pos / st.dur) * 1000) : 0;
    $('mPos').textContent = fmt(it ? st.pos : 0);
    $('mDur').textContent = fmt(it ? st.dur || it.dur : 0);
    $('mEq').hidden = !st.playing;
    let warn = '';
    if (!alive) warn = '⚠️ ยังไม่มีหน้าเวทีที่เปิดเสียงอยู่ — เปิดหน้าเวทีใน LIVE Studio / OBS (หรือ “เปิดหน้าเวที”) ก่อน เพลงถึงจะเล่นเข้าไลฟ์ · หากต้องการฟังในเครื่อง กด 🎧 ข้างเพลงด้านล่าง';
    else if (st.blocked) warn = '🔊 หน้าเวทียังไม่ได้เปิดเสียง — คลิกที่หน้าเวที 1 ครั้ง (ใน LIVE Studio: คลิกขวาที่ภาพ → Interact → คลิกในจอ)';
    $('mWarn').hidden = !warn;
    $('mWarn').textContent = warn;
  }
  setInterval(renderNow, 2000);

  // ---------------- เพิ่มไฟล์
  const ACCEPT = /\.(mp3|mp4|m4a|m4v|wav|ogg|oga|aac|flac|webm)$/i;
  $('mPick').onclick = () => $('mFile').click();
  $('mFile').onchange = () => upload([...$('mFile').files]);
  const drop = $('mDrop');
  drop.addEventListener('dragover', (e) => {
    e.preventDefault();
    drop.classList.add('over');
  });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('over');
    upload([...e.dataTransfer.files]);
  });
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
    if (!pl?.ack) return void ($('mUpMsg').textContent = 'ติ๊กยืนยันเรื่องลิขสิทธิ์ด้านบนก่อน');
    busy = true;
    const bad = files.filter((f) => !ACCEPT.test(f.name));
    const ok = files.filter((f) => ACCEPT.test(f.name));
    const msg = $('mUpMsg');
    let done = 0, failed = bad.map((f) => `${f.name} (ไม่รองรับไฟล์ชนิดนี้)`);
    for (const f of ok) {
      msg.textContent = `กำลังเพิ่ม ${done + 1}/${ok.length}: ${f.name}`;
      if (f.size > 600 * 1024 * 1024) {
        failed.push(`${f.name} (ใหญ่เกิน 600 MB)`);
        continue;
      }
      const dur = await duration(f);
      if (dur < 0) {
        failed.push(`${f.name} (เปิดไฟล์นี้ไม่ได้ — อาจไม่มีเสียงหรือไฟล์เสีย)`);
        continue;
      }
      try {
        const r = await fetch('/api/music/upload', { method: 'POST', headers: { 'Content-Type': 'application/octet-stream', 'X-Name': encodeURIComponent(f.name), 'X-Dur': String(Math.round(dur)) }, body: f });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) failed.push(`${f.name} (${j.error || 'อัปโหลดไม่สำเร็จ'})`);
        else done++;
      } catch {
        failed.push(`${f.name} (อัปโหลดไม่สำเร็จ)`);
      }
    }
    msg.textContent = (done ? `เพิ่มแล้ว ${done} เพลง ✓` : '') + (failed.length ? `${done ? ' • ' : ''}ข้าม: ${failed.join(', ')}` : '');
    $('mFile').value = '';
    busy = false;
  }

  // ---------------- รายการเพลง (ลากสลับลำดับได้)

  // HTML dialog works in Electron; window.prompt is unsupported in the desktop app.
  const renameDialog=document.createElement('dialog');renameDialog.id='mRename';
  renameDialog.setAttribute('aria-labelledby','mRenameTitle');
  renameDialog.innerHTML='<form id="mRenameForm"><h2 id="mRenameTitle">เปลี่ยนชื่อเพลง</h2><label for="mRenameInput">ชื่อที่แสดงบนหน้าเวที</label><input id="mRenameInput" type="text" maxlength="120" autocomplete="off" required style="width:100%;box-sizing:border-box;margin:12px 0"><p id="mRenameError" role="alert" style="color:#ff9c9c;min-height:1.4em"></p><div style="display:flex;gap:10px;justify-content:flex-end"><button type="button" id="mRenameCancel" class="btn ghost">ยกเลิก</button><button type="submit" id="mRenameSave" class="btn">บันทึก</button></div></form>';
  const renameStyle=document.createElement('style');renameStyle.textContent='#mRename{width:min(480px,calc(100vw - 48px));padding:26px;border:1px solid #68534c;border-radius:20px;background:#201b19;color:#fff;box-shadow:0 20px 90px #000a}#mRename::backdrop{background:#0009}#mRename:not([open]){display:none}#mRename h2{margin-top:0}';document.head.append(renameStyle);document.body.append(renameDialog);
  let renameId=null,renameBusy=false;
  function openRename(it){renameId=it.id;$('mRenameInput').value=it.title;$('mRenameError').textContent='';if(!renameDialog.open)renameDialog.showModal();$('mRenameInput').focus();$('mRenameInput').select();}
  $('mRenameCancel').onclick=()=>renameDialog.close();
  renameDialog.addEventListener('cancel',e=>{if(renameBusy)e.preventDefault();});
  renameDialog.addEventListener('close',()=>{document.querySelector('#mList [data-ren="'+CSS.escape(renameId||'')+'"]')?.focus();});
  $('mRenameForm').addEventListener('submit',e=>{
    e.preventDefault();if(renameBusy)return;const title=$('mRenameInput').value.trim();
    if(!title){$('mRenameError').textContent='กรุณาใส่ชื่อเพลง';$('mRenameInput').focus();return;}
    if(!pl.items.some(x=>x.id===renameId)){$('mRenameError').textContent='เพลงนี้ไม่อยู่ในรายการแล้ว';return;}
    const items=pl.items.map(x=>x.id===renameId?{...x,title}:x);
    renameBusy=true;$('mRenameSave').disabled=true;$('mRenameCancel').disabled=true;$('mRenameError').textContent='กำลังบันทึก…';
    socket.timeout(8000).emit('admin:saveConfig',{playlist:{...pl,items}},(error,result)=>{
      renameBusy=false;$('mRenameSave').disabled=false;$('mRenameCancel').disabled=false;
      if(error||!result?.ok){$('mRenameError').textContent='บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง';return;}
      $('mRenameError').textContent='';renameDialog.close();$('mLocalStatus').textContent='บันทึกชื่อเพลงแล้ว';
    });
  });

  function renderList() {
    const items = pl.items || [];
    const box = $('mList');
    $('mCount').textContent = items.length ? `${items.length} เพลง • รวม ${fmt(items.reduce((a, x) => a + (x.dur || 0), 0))}` : '';
    if (!items.length) {
      box.innerHTML = '<div class="m-empty">ยังไม่มีเพลง — กด “เพิ่มไฟล์จากเครื่อง” หรือลากไฟล์มาวางด้านบน</div>';
      return;
    }
    box.innerHTML = items
      .map((x, i) => `<div class="m-row" draggable="true" data-id="${esc(x.id)}">
        <span class="m-h" title="ลากเพื่อสลับลำดับ">⠿</span><span class="m-n">${i + 1}</span>
        <span class="m-ic">${/^(mp4|m4v|webm)$/.test(x.ext) ? '🎬' : '🎵'}</span>
        <div class="m-tt"><div class="m-name" title="${esc(x.title)}">${esc(x.title)}</div><small>${esc((x.ext || '').toUpperCase())}${/^(mp4|m4v|webm)$/.test(x.ext) ? ' • เล่นเฉพาะเสียง' : ''}</small></div>
        <span class="m-d">${x.dur ? fmt(x.dur) : ''}</span>
        <span class="m-act"><button class="btn sm" data-preview="${esc(x.id)}" title="ฟังทดสอบในเครื่อง" aria-label="ฟังทดสอบในเครื่อง">🎧 ฟังในเครื่อง</button><button class="btn sm" data-play="${esc(x.id)}" title="เล่นเพลงนี้ผ่านหน้าเวที">▶ เล่นเข้าไลฟ์</button><button class="btn sm" data-ren="${esc(x.id)}" title="เปลี่ยนชื่อ" aria-label="เปลี่ยนชื่อเพลง ${esc(x.title)}">✎</button><button class="btn sm danger" data-del="${esc(x.id)}" title="ลบ">✕</button></span>
      </div>`)
      .join('');
    markPlaying();
  }
  function markPlaying() {
    document.querySelectorAll('#mList .m-row').forEach((r) => r.classList.toggle('on', r.dataset.id === st.id));
    document.querySelectorAll('#mList [data-play]').forEach((b) => (b.textContent = b.dataset.play === st.id && st.playing ? '⏸ พักเพลงเข้าไลฟ์' : '▶ เล่นเข้าไลฟ์'));
  }
  $('mList').addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if(b.dataset.preview){
      const it=pl.items.find(x=>x.id===b.dataset.preview);if(!it)return;
      if(st.playing && st.at && Date.now()-stAt<6000){$('mLocalStatus').textContent='หน้าเวทีกำลังเล่นเพลงอยู่ กรุณาหยุดเพลงบนหน้าเวทีก่อนฟังทดสอบ';return;}
      stopPreview();selectPreview(it);
      $('mLocalStatus').textContent='กำลังโหลดเพลงทดสอบ: '+it.title;
      try{await localAudio.play();}catch(e){$('mLocalStatus').textContent=e.name==='NotAllowedError'?'กดเล่นที่แถบเสียงเพื่ออนุญาตเล่นเพลง':'เล่นไฟล์เพลงนี้ไม่ได้ กรุณาตรวจไฟล์เพลง';}
      return;
    }
    if (b.dataset.play) return b.dataset.play === st.id && st.playing ? cmd('pause') : b.dataset.play === st.id ? cmd('toggle') : cmd('play', { id: b.dataset.play });
    if (b.dataset.ren) {
      const it = pl.items.find((x) => x.id === b.dataset.ren);
      if (it) openRename(it);
      return;
    }
    if (b.dataset.del) {
      const it = pl.items.find((x) => x.id === b.dataset.del);
      if (!confirm(`ลบ “${it?.title}” ออกจากรายการ?`)) return;
      await fetch('/api/music/remove', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: b.dataset.del }) });
    }
  });
  let dragId = null;
  $('mList').addEventListener('dragstart', (e) => {
    const r = e.target.closest('.m-row');
    dragId = r?.dataset.id;
    r?.classList.add('drag');
  });
  $('mList').addEventListener('dragend', (e) => e.target.closest('.m-row')?.classList.remove('drag'));
  $('mList').addEventListener('dragover', (e) => {
    const r = e.target.closest('.m-row');
    if (!r || !dragId || r.dataset.id === dragId) return;
    e.preventDefault();
    const from = $('mList').querySelector(`[data-id="${CSS.escape(dragId)}"]`);
    const below = e.clientY > r.getBoundingClientRect().top + r.offsetHeight / 2;
    r.parentNode.insertBefore(from, below ? r.nextSibling : r);
  });
  $('mList').addEventListener('drop', (e) => {
    e.preventDefault();
    const order = [...$('mList').querySelectorAll('.m-row')].map((r) => r.dataset.id);
    dragId = null;
    save({ items: order.map((id) => pl.items.find((x) => x.id === id)).filter(Boolean) });
  });
})();
