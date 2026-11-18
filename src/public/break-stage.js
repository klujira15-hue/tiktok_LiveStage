/* หน้าเวที: ฉากรอเริ่มไลฟ์ / พักเบรก — นับถอยหลังกลางจอ ทับฉากแบบโปร่ง (คนในฉาก เกม ของขวัญ ยังทำงาน)
 * ข้อมูลจาก server ('stageMode'): { kind: 'soon'|'brb', until, now, title, sub, early[], earlyCount }
 */
(() => {
  'use strict';
  if (new URLSearchParams(location.search).has('thumb')) return;
  const css = `
  #brkDim{position:absolute;inset:0;z-index:38;background:radial-gradient(ellipse at 50% 40%,rgba(10,6,24,.55),rgba(5,3,14,.82));opacity:0;transition:opacity .6s;pointer-events:none}
  #brkDim.on{opacity:1}
  #brkBox{position:absolute;left:60px;right:60px;top:300px;z-index:46;text-align:center;font-family:'IBM Plex Sans Thai','Kanit','Leelawadee UI',sans-serif;color:#fff;pointer-events:none;opacity:0;transform:translateY(30px);transition:opacity .5s,transform .5s}
  #brkBox.on{opacity:1;transform:none}
  #brkBox .kick{display:inline-block;padding:10px 34px;border-radius:99px;font-size:34px;font-weight:700}
  #brkBox.soon .kick{background:rgba(255,79,163,.25);color:#ff9bcf}
  #brkBox.brb .kick{background:rgba(79,195,255,.22);color:#9fdcff}
  #brkBox .big{font:800 240px/1 Kanit,sans-serif;margin-top:30px;letter-spacing:4px}
  #brkBox.soon .big{text-shadow:0 0 70px rgba(255,79,163,.65)}
  #brkBox.brb .big{color:#4fc3ff;text-shadow:0 0 70px rgba(79,195,255,.55)}
  #brkBox .head{font:700 64px/1.2 Kanit,sans-serif;margin-top:20px}
  #brkBox .ttl{font:600 46px/1.3 Kanit,sans-serif;margin-top:34px}
  #brkBox .sub{font-size:34px;color:#e2d8f2;margin-top:10px}
  #brkEarly{position:absolute;left:70px;right:70px;top:1180px;z-index:46;padding:30px 36px;border-radius:40px;background:rgba(20,12,40,.9);border:4px solid #ffd166;font-family:'IBM Plex Sans Thai','Kanit',sans-serif;color:#fff;pointer-events:none;opacity:0;transition:opacity .5s}
  #brkEarly.on{opacity:1}
  #brkEarly h4{margin:0;font:700 44px Kanit,sans-serif}
  #brkEarly p{margin:6px 0 0;font-size:32px;color:#e9e0f7}
  #brkEarly p b{color:#ffd166}
  #brkEarly .names{display:flex;flex-wrap:wrap;gap:14px;margin-top:20px}
  #brkEarly .names span{padding:8px 22px;border-radius:20px;background:rgba(255,209,102,.2);font-size:30px;font-weight:600}
  #brkEarly .names span:first-child{background:#ffd166;color:#1d1714}
  `;
  const st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);
  const ui = document.getElementById('ui') || document.getElementById('root');
  const root = document.getElementById('root');
  const dim = document.createElement('div');
  dim.id = 'brkDim';
  (root || ui).insertBefore(dim, ui);
  const box = document.createElement('div');
  box.id = 'brkBox';
  box.innerHTML = '<div class="kick"></div><div class="big">--:--</div><div class="head"></div><div class="ttl"></div><div class="sub"></div>';
  ui.appendChild(box);
  const early = document.createElement('div');
  early.id = 'brkEarly';
  early.innerHTML = '<h4>มาก่อนได้แต้มพิเศษ</h4><p>พิมพ์ <b>มาแล้ว</b> เพื่อจองที่หน้าเวที</p><div class="names"></div>';
  ui.appendChild(early);
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  let M = null;
  let offset = 0;
  function render() {
    const on = !!M;
    dim.classList.toggle('on', on);
    box.classList.toggle('on', on);
    early.classList.toggle('on', on && M.kind === 'soon');
    if (!on) return;
    box.className = 'on ' + M.kind;
    const soon = M.kind === 'soon';
    box.querySelector('.kick').textContent = soon ? 'ไลฟ์กำลังจะเริ่ม' : 'พักเบรกแป๊บนึงนะ';
    box.querySelector('.head').textContent = soon ? '' : 'อย่าเพิ่งไปไหน เดี๋ยวกลับมา';
    box.querySelector('.ttl').textContent = M.title || (soon ? '' : 'คอมเมนต์ทิ้งไว้ได้ เดี๋ยวกลับมาอ่าน');
    box.querySelector('.sub').textContent = M.sub || '';
    const names = M.early || [];
    early.querySelector('.names').innerHTML = names.map((n, i) => `<span>${i + 1} · ${esc(n)}</span>`).join('') + (M.earlyCount > names.length ? `<span>+ ${M.earlyCount - names.length} คน</span>` : '');
  }
  setInterval(() => {
    if (!M) return;
    const big = box.querySelector('.big');
    if (!M.until) {
      big.textContent = M.kind === 'soon' ? 'เร็ว ๆ นี้' : 'แป๊บเดียว';
      big.style.fontSize = '150px';
      return;
    }
    big.style.fontSize = '';
    const s = Math.max(0, Math.ceil((M.until - (Date.now() + offset)) / 1000));
    big.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }, 250);
  const socket = window.io && io();
  if (!socket) return;
  socket.on('stageMode', (d) => {
    M = d || null;
    if (M) offset = M.now - Date.now();
    render();
  });
})();
