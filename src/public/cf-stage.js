/* หน้าเวที: โหมดขายของ (CF) — การ์ดสินค้า นับถอยหลังปิดรับ แจ้งออเดอร์ แถบสินค้า
 * ข้อมูลมาจาก cf.js ผ่าน socket ('cf' สถานะ, 'cfOrder' ออเดอร์ใหม่) · แสดงเฉพาะตอนคนไลฟ์เปิดโหมดขายของ
 */
(() => {
  'use strict';
  const params = new URLSearchParams(location.search);
  if (params.has('thumb')) return;
  const SILENT = params.has('silent');
  const css = `
  .cf-box{position:absolute;z-index:45;font-family:'IBM Plex Sans Thai','Kanit','Leelawadee UI',sans-serif;color:#fff;pointer-events:none;transition:opacity .35s,transform .35s}
  .cf-hide{opacity:0;transform:translateY(-16px)}
  #cfCard{left:30px;top:250px;width:470px;border-radius:34px;overflow:hidden;background:#fffaf3;color:#1d1714;box-shadow:0 24px 60px rgba(0,0,0,.55)}
  #cfCard .top{position:relative;height:150px;background:linear-gradient(135deg,#ffd9c2,#ffb3a7);display:flex;align-items:center;justify-content:center}
  #cfCard .code{position:absolute;left:20px;top:20px;padding:4px 20px;border-radius:16px;background:#1d1714;color:#ffd166;font:800 48px Kanit,sans-serif}
  #cfCard .left{position:absolute;right:20px;top:24px;padding:6px 16px;border-radius:14px;background:#e8453c;color:#fff;font-weight:700;font-size:26px}
  #cfCard .left.out{background:#5a5250}
  #cfCard .big{opacity:.45}
  #cfCard .body{padding:20px 26px 26px}
  #cfCard .name{font:600 40px/1.2 Kanit,sans-serif}
  #cfCard .price{font:800 60px Kanit,sans-serif;color:#e8453c;margin-top:6px}
  #cfCard .how{margin-top:14px;padding:14px;border-radius:18px;background:#1d1714;color:#fff;text-align:center;font-size:30px;font-weight:600}
  #cfCard .how b{color:#ffd166;font-family:Kanit,sans-serif}
  #cfCard .closed{background:#5a5250}
  #cfClock{right:30px;top:250px;width:330px;padding:22px 24px;border-radius:30px;background:rgba(12,10,20,.88);border:2px solid rgba(255,255,255,.15)}
  #cfClock small{display:block;font-size:24px;color:#c9c2d6}
  #cfClock .t{font:800 74px/1.05 Kanit,sans-serif;color:#ffd166}
  #cfClock .bar{height:12px;border-radius:12px;background:rgba(255,255,255,.15);margin-top:8px;overflow:hidden}
  #cfClock .bar i{display:block;height:12px;background:#ffd166;transition:width 1s linear}
  #cfClock .tot{font:700 48px Kanit,sans-serif}
  #cfClock .top{margin-top:12px;font-size:24px}
  #cfClock .top div{display:flex;justify-content:space-between;padding:3px 0}
  #cfClock .top b{color:#ffd166}
  #cfClock .top .so{color:#8f879c}
  #cfToast{left:50%;top:1020px;width:820px;margin-left:-410px;padding:26px 34px;border-radius:36px;background:linear-gradient(90deg,#e8453c,#ff7a45);box-shadow:0 20px 60px rgba(232,69,60,.55);display:flex;align-items:center;gap:24px;transform:scale(.7);opacity:0;transition:opacity .3s,transform .4s cubic-bezier(.2,1.6,.4,1)}
  #cfToast.on{opacity:1;transform:scale(1)}
  #cfToast.wait{background:linear-gradient(90deg,#6b4b1f,#a0702a)}
  #cfToast.closed{background:linear-gradient(90deg,#4a4458,#6a6478)}
  #cfToast svg{flex:none}
  #cfToast b{display:block;font:700 50px/1.15 Kanit,sans-serif}
  #cfToast span{font-size:28px;opacity:.95}
  #cfStrip{left:30px;right:30px;bottom:30px;padding:20px 24px;border-radius:30px;background:rgba(12,10,20,.88);border:2px solid rgba(255,255,255,.15);display:flex;gap:14px;align-items:center;overflow:hidden;white-space:nowrap}
  #cfStrip small{flex:none;font-size:24px;color:#c9c2d6}
  #cfStrip span{display:inline-flex;align-items:center;gap:10px;padding:8px 18px;border-radius:16px;background:rgba(255,255,255,.12);font-size:28px;font-weight:600}
  #cfStrip span img{width:52px;height:52px;border-radius:12px;object-fit:cover;margin-left:-10px}
  #cfCard .top{height:300px}
  #cfCard .top .photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:none}
  #cfCard.hasimg .top .photo{display:block}
  #cfCard.hasimg .top .big{display:none}
  /* กด "โชว์" → รูปใหญ่กลางจอ แล้วย่อเป็นการ์ด */
  #cfBig{left:50%;top:330px;width:760px;margin-left:-380px;border-radius:44px;overflow:hidden;background:#fffaf3;color:#1d1714;border:6px solid #ffd166;box-shadow:0 0 120px rgba(255,209,102,.5),0 40px 90px rgba(0,0,0,.6);transform:scale(.7);opacity:0;transition:opacity .4s,transform .5s cubic-bezier(.2,1.5,.4,1)}
  #cfBig.on{opacity:1;transform:scale(1)}
  #cfBig.out{opacity:0;transform:translate(-340px,-120px) scale(.45);transition:opacity .6s,transform .6s ease-in}
  #cfBig .ph{position:relative;height:640px;background:linear-gradient(160deg,#ffe3d3,#ffc9b8);display:flex;align-items:center;justify-content:center}
  #cfBig .ph img{width:100%;height:100%;object-fit:cover}
  #cfBig .code{position:absolute;left:24px;top:24px;padding:6px 26px;border-radius:20px;background:#1d1714;color:#ffd166;font:800 64px Kanit,sans-serif}
  #cfBig .stock{position:absolute;right:24px;top:30px;padding:8px 22px;border-radius:16px;background:#e8453c;color:#fff;font-weight:700;font-size:32px}
  #cfBig .bd{padding:26px 30px 32px;text-align:center}
  #cfBig .nm{font:600 52px/1.2 Kanit,sans-serif}
  #cfBig .pr{font:800 96px/1.1 Kanit,sans-serif;color:#e8453c}
  #cfBig .how{margin-top:16px;padding:20px;border-radius:24px;background:#1d1714;color:#fff;font-size:42px;font-weight:600}
  #cfBig .how b{color:#ffd166;font-family:Kanit,sans-serif}
  #cfBigKick{left:50%;top:250px;transform:translateX(-50%);padding:12px 34px;border-radius:99px;background:#e8453c;font-size:34px;font-weight:700;opacity:0;transition:opacity .3s}
  #cfBigKick.on{opacity:1}
  #cfStrip span.on{background:#ffd166;color:#1d1714;font-weight:700}
  #cfStrip span.out{text-decoration:line-through;color:#8f879c}
  `;
  const st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);
  const ui = document.getElementById('ui') || document.getElementById('root');
  const mk = (id, html, cls = 'cf-box cf-hide') => {
    const d = document.createElement('div');
    d.id = id;
    d.className = cls;
    d.innerHTML = html;
    ui.appendChild(d);
    return d;
  };
  const card = mk('cfCard', '<div class="top"><img class="photo" alt=""><svg class="big" width="110" height="110" viewBox="0 0 24 24" fill="none" stroke="#8a4a3a" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 7h12l-1 13H7z"></path><path d="M9 9V6a3 3 0 0 1 6 0v3"></path></svg><div class="code"></div><div class="left"></div></div><div class="body"><div class="name"></div><div class="price"></div><div class="how"></div></div>');
  const clock = mk('cfClock', '<small>ปิดรับใน</small><div class="t">--:--</div><div class="bar"><i></i></div><small style="margin-top:14px">ยอด CF ไลฟ์นี้</small><div class="tot">0 ออเดอร์</div><div class="top"></div>');
  const big = mk('cfBig', '<div class="ph"><img alt=""><div class="code"></div><div class="stock"></div></div><div class="bd"><div class="nm"></div><div class="pr"></div><div class="how"></div></div>', 'cf-box');
  const bigKick = mk('cfBigKick', 'สินค้าใหม่ขึ้นแล้ว!', 'cf-box');
  const toast = mk('cfToast', '<svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6h15l-1.5 9h-12z"></path><path d="M6 6L5 3H2"></path><circle cx="9" cy="20" r="1.5"></circle><circle cx="18" cy="20" r="1.5"></circle></svg><div><b></b><span></span></div>', 'cf-box');
  const strip = mk('cfStrip', '<small>สินค้าในไลฟ์</small><div style="display:flex;gap:12px"></div>');
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const money = (n) => (n === '' || n == null ? '' : '฿' + Number(n).toLocaleString('en-US'));
  let S = null;
  let offset = 0;
  let span = 0;
  function render() {
    const on = S && S.enabled;
    const sh = on && S.showing;
    card.classList.toggle('cf-hide', !sh);
    clock.classList.toggle('cf-hide', !sh);
    strip.classList.toggle('cf-hide', !on || !S.products.length);
    if (!on) return;
    if (sh) {
      card.querySelector('.code').textContent = sh.code;
      card.classList.toggle('hasimg', !!sh.img);
      const ph = card.querySelector('.photo');
      if (sh.img && ph.getAttribute('src') !== sh.img) ph.src = sh.img;
      const left = card.querySelector('.left');
      left.textContent = sh.left == null ? 'มีของ' : sh.left > 0 ? `เหลือ ${sh.left} ชิ้น` : 'หมดแล้ว';
      left.classList.toggle('out', sh.left === 0);
      card.querySelector('.name').textContent = sh.name;
      card.querySelector('.price').textContent = money(sh.price);
      const how = card.querySelector('.how');
      how.classList.toggle('closed', !sh.open);
      how.innerHTML = !sh.open ? 'ปิดรับแล้ว' : sh.left === 0 ? `พิมพ์ <b>CF ${esc(sh.code)}</b> เข้าคิวสำรอง` : `พิมพ์ <b>CF ${esc(sh.code)}</b> เพื่อสั่งซื้อ`;
    }
    clock.querySelector('.tot').textContent = `${S.total} ออเดอร์`;
    clock.querySelector('.top').innerHTML = (S.top || []).map((x) => `<div class="${x.soldOut ? 'so' : ''}"><span>${esc(x.code)} ${esc(x.name)}</span><b>${x.soldOut ? 'หมด' : x.n}</b></div>`).join('');
    strip.querySelector('div').innerHTML = S.products.slice(0, 8).map((p) => `<span class="${sh && p.code === sh.code ? 'on' : p.left === 0 ? 'out' : ''}">${p.imgUrl ? `<img src="${esc(p.imgUrl)}" alt="">` : ''}${esc(p.code)} ${p.left === 0 ? 'หมด' : esc(money(p.price) || p.name)}</span>`).join('');
  }
  setInterval(() => {
    if (!S?.showing) return;
    const t = clock.querySelector('.t');
    if (!S.closeAt) {
      t.textContent = 'เปิดรับ';
      clock.querySelector('.bar i').style.width = '100%';
      clock.querySelector('small').textContent = 'สถานะ';
      return;
    }
    clock.querySelector('small').textContent = 'ปิดรับใน';
    const ms = Math.max(0, S.closeAt - (Date.now() + offset));
    const s = Math.ceil(ms / 1000);
    t.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    clock.querySelector('.bar i').style.width = (span ? Math.min(100, (ms / span) * 100) : 0) + '%';
  }, 250);
  let toastTimer = null;
  function showToast(d) {
    toast.className = 'cf-box on' + (d.status === 'wait' ? ' wait' : d.status === 'closed' ? ' closed' : '');
    toast.querySelector('b').textContent = d.status === 'closed' ? `${d.name}: ปิดรับ ${d.code} แล้ว` : d.status === 'wait' ? `${d.name} เข้าคิวสำรอง ${d.code}` : `${d.name} CF ${d.code}${d.qty > 1 ? ' ×' + d.qty : ''} สำเร็จ!`;
    toast.querySelector('span').textContent = d.status === 'ok' ? `ออเดอร์ที่ ${d.no}${d.left != null ? ` · ${d.code} เหลือ ${d.left} ชิ้น` : ''}` : d.status === 'wait' ? 'ของหมดแล้ว ถ้ามีคนยกเลิกจะได้ก่อน' : '';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('on'), 3200);
  }
  const socket = window.io && io();
  if (!socket) return;
  // กด "โชว์" ใหม่ → รูปใหญ่กลางจอ 5 วิ แล้วย่อไปเป็นการ์ดมุมซ้าย
  let bigTimer = null;
  let seenShowAt = 0;
  function reveal(sh) {
    big.querySelector('.code').textContent = sh.code;
    big.querySelector('.stock').textContent = sh.left == null ? 'มีของ' : `มี ${sh.left} ชิ้น`;
    const img = big.querySelector('.ph img');
    img.style.display = sh.img ? '' : 'none';
    if (sh.img) img.src = sh.img;
    big.querySelector('.nm').textContent = sh.name;
    big.querySelector('.pr').textContent = money(sh.price);
    big.querySelector('.how').innerHTML = `พิมพ์ <b>CF ${esc(sh.code)}</b> เพื่อสั่งซื้อ`;
    card.classList.add('cf-hide');
    big.className = 'cf-box on';
    bigKick.classList.add('on');
    clearTimeout(bigTimer);
    bigTimer = setTimeout(() => {
      big.className = 'cf-box out';
      bigKick.classList.remove('on');
      bigTimer = setTimeout(() => {
        big.className = 'cf-box';
        render();
      }, 600);
    }, 5000);
  }
  socket.on('cf', (d) => {
    const prevClose = S?.closeAt;
    S = d;
    offset = d.now - Date.now();
    if (d.closeAt && d.closeAt !== prevClose) span = Math.max(1, d.closeAt - d.now);
    render();
    const fresh = d.enabled && d.showing && d.showAt && d.showAt !== seenShowAt && d.now - d.showAt < 4000;
    if (d.showAt) seenShowAt = d.showAt;
    if (fresh) reveal(d.showing);
    else if (bigTimer && big.classList.contains('on')) card.classList.add('cf-hide');
  });
  socket.on('cfOrder', (d) => {
    if (!S?.enabled) return;
    showToast(d);
    if (!SILENT && d.announce && d.status === 'ok') window.__stage?.api?.speak?.(`ขอบคุณ ${d.name} ที่ซีเอฟ ${d.code.split('').join(' ')} ค่ะ`);
  });
})();
