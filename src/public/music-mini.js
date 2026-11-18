/* แถบควบคุม "เพลงในไลฟ์" ในหน้าหลักของโปรแกรม — หยุด/ข้าม/ปรับเสียงระหว่างไลฟ์ (จัดการรายการที่หน้าตั้งค่า) */
(() => {
  const $ = (id) => document.getElementById(id);
  const box = $('mmCard');
  if (!box) return;
  const socket = io();
  // ---- รูปโปรไฟล์คนดู (ปุ่มเลือกบนหน้าหลัก) — กดแล้วหน้าเวทีเปลี่ยนทันที
  const PQ_HINT = { small: 'รูปวงกลมเล็กข้างชื่อ ใต้เท้าตัวละคร', big: 'รูปใหญ่ลอยเหนือหัวตัวละคร ไม่มีป้ายชื่อ (ไม่รก)', bigname: 'รูปใหญ่ลอยเหนือหัว + ป้ายชื่อใต้เท้า', off: 'แสดงแค่ชื่อ ไม่มีรูป' };
  function pqRender(v) {
    v = ['off', 'small', 'big', 'bigname'].includes(v) ? v : 'small';
    document.querySelectorAll('[data-pq]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.pq === v)));
    $('pqHint').textContent = PQ_HINT[v];
  }
  socket.on('snapshot', (s) => pqRender(s.config?.pfp));
  socket.on('config', (c) => pqRender(c?.pfp));
  document.querySelectorAll('[data-pq]').forEach((b) =>
    b.addEventListener('click', () => {
      pqRender(b.dataset.pq);
      socket.emit('admin:saveConfig', { pfp: b.dataset.pq });
    }),
  );
  let pl = null, st = {}, stAt = 0, volT = 0;
  const cmd = (action) => {
    if(!st.at || Date.now()-stAt>=6000){$('mmNote').textContent='ยังไม่มีหน้าเวทีเปิดเสียง — ไปที่ จัดการเพลง แล้วกด 🎧 เพื่อฟังทดสอบในเครื่อง';return;}
    socket.emit('music:cmd', { action });
  };
  socket.on('snapshot', (s) => setPl(s.config?.playlist));
  socket.on('config', (c) => setPl(c?.playlist));
  socket.on('music:state', (s) => {
    st = s || {};
    stAt = Date.now();
    render();
  });
  function setPl(p) {
    if (!p) return;
    pl = p;
    if (document.activeElement !== $('mmVol')) $('mmVol').value = Math.round((pl.volume ?? 0.7) * 100);
    $('mmVolV').textContent = $('mmVol').value + '%';
    render();
  }
  function render() {
    if (!pl) return;
    const items = pl.items || [];
    const it = items.find((x) => x.id === st.id);
    const alive = st.at && Date.now() - stAt < 6000;
    $('mmTitle').textContent = it ? it.title : items.length ? `${items.length} เพลงในรายการ — กด ▶ เพื่อเริ่ม` : 'ยังไม่มีไฟล์เพลงส่วนตัว — เพิ่มไฟล์ที่ “จัดการเพลง”';
    $('mmPlay').textContent = st.playing ? '⏸' : '▶';
    $('mmBar').style.width = it && st.dur ? Math.min(100, (st.pos / st.dur) * 100) + '%' : '0';
    $('mmNote').textContent = !alive ? 'ยังไม่มีหน้าเวทีที่เปิดเสียงอยู่ — เพลงจะเล่นที่หน้าเวทีใน LIVE Studio' : st.blocked ? 'คลิกที่หน้าเวที 1 ครั้งเพื่อเปิดเสียง' : '';
    for (const b of box.querySelectorAll('[data-mm]')) b.disabled = !items.length;
  }
  setInterval(render, 2000);
  box.addEventListener('click', (e) => {
    const b = e.target.closest('[data-mm]');
    if (b) cmd(b.dataset.mm);
  });
  $('mmVol').addEventListener('input', () => {
    $('mmVolV').textContent = $('mmVol').value + '%';
    clearTimeout(volT);
    volT = setTimeout(() => pl && socket.emit('admin:saveConfig', { playlist: { ...pl, volume: Number($('mmVol').value) / 100 } }), 120);
  });
})();
