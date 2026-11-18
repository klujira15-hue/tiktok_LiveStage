/* ดีเจหลังบูธ + จอ LED หน้าบูธ (hud.dj — ธีมดีเจคลับใต้น้ำ)
 * ชั้น (หลัง → หน้า): ตัวดีเจ (ตัดที่ขอบบนบูธ) → เครื่องเล่นแผ่น 2 ตัว + มิกเซอร์ (วาดทับของในภาพ แผ่นหมุนได้) → แขนดีเจ → จอ LED
 * จอ LED อ่านเพลงที่เปิดจริงจากเมนู "เพลงในไลฟ์" (window.StageSong) • ของขวัญ = ขึ้นชื่อคนส่ง • ขอเพลง = ขึ้นคิว
 * ขยับด้วย CSS transform ทั้งชิ้น (การ์ดจอทำให้) • จังหวะ --beat ของหน้าเวที
 * hud.dj = { x, y (เอวดีเจบนจอ 1080x1920), s, clip (ขอบบนบูธ), decks: [{x,y}], mixer: {x,y}, led: {x,y,w,h} }
 */
(function () {
  'use strict';
  const B = 'var(--beat, .48s)';
  let root = null;
  let cfg = null;
  let host = '';
  let reqs = [];
  let shoutT = 0;
  let shoutUntil = 0;
  let reqUntil = 0;
  let poseT = 0;
  let hype = false;
  let hypeT = 0;

  const css = `
    /* ---- แผงแบบกระจกนีออน (hud.skin = 'glass') */
    .skin-glass .hud .hpanel, .skin-glass #hype { background: linear-gradient(160deg, rgba(14,22,62,.58), rgba(40,10,66,.58)) !important; border: 2px solid rgba(94,240,255,.62) !important;
      box-shadow: 0 0 18px rgba(94,240,255,.32), inset 0 0 22px rgba(255,79,216,.14) !important; backdrop-filter: blur(5px); }
    .skin-glass .hud .ttl { background: linear-gradient(120deg, rgba(16,30,86,.72), rgba(84,18,112,.72)) !important; color: #fff !important; border: 2px solid #5ef0ff; box-shadow: 0 0 24px rgba(94,240,255,.5), inset 0 0 18px rgba(255,79,216,.25) !important; }
    .skin-glass .hud .ttl b { text-shadow: 0 0 12px #ff4fd8; }
    .skin-glass .hud .ttl .ico { background: rgba(94,240,255,.16) !important; box-shadow: inset 0 0 0 2px rgba(94,240,255,.5); }
    .skin-glass .hud .sign { background: linear-gradient(120deg, rgba(14,22,62,.72), rgba(40,10,66,.72)) !important; color: #fff !important; border-left: 0 !important; border: 2px solid rgba(255,79,216,.75) !important; box-shadow: 0 0 14px rgba(255,79,216,.4) !important; }
    .skin-glass .hud .sign small { color: #d8ccff !important; }
    .skin-glass .hud .sign b { text-shadow: 0 0 10px rgba(94,240,255,.8); }
    .skin-glass .hud .ring .dial { background: rgba(10,14,40,.7) !important; box-shadow: 0 0 22px rgba(255,79,216,.45) !important; }
    .skin-glass #songChip { display: none !important; }

    .dj-clip { position: absolute; left: 0; top: 0; width: 1080px; overflow: hidden; pointer-events: none; }
    .dj-fig { position: absolute; width: 140px; height: 170px; transform-origin: 50% 100%; }
    .dj-fig > .bob { position: absolute; inset: 0; transform-origin: 50% 100%; animation: djBob ${B} ease-in-out infinite alternate; will-change: transform; }
    .dj-fig svg { position: absolute; left: 0; top: 0; width: 140px; height: 170px; overflow: visible; }
    .dj-fig .head { transform-box: view-box; transform-origin: 70px 84px; animation: djNod calc(${B} / 2) ease-in-out infinite alternate; }
    .dj-fig .shL { animation: djShade calc(${B} * 2) steps(1) infinite; }
    .dj-fig .shR { animation: djShade calc(${B} * 2) steps(1) infinite reverse; }
    .dj-arms .armR, .dj-arms .armL { transform-box: view-box; }
    .dj-arms .armR { transform-origin: 102px 104px; }
    .dj-arms .armL { transform-origin: 38px 104px; }
    .dj-arms.p-scratch .armR { animation: djScratch calc(${B} / 2) ease-in-out infinite alternate; }
    .dj-arms.p-up .armR, .dj-arms.p-up .armL { animation: djPump ${B} ease-in-out infinite alternate; }
    .dj-arms.p-point .armR { animation: djPoint ${B} ease-in-out infinite alternate; }
    .dj-arms.p-phones .armL { animation: djScratch ${B} ease-in-out infinite alternate; }
    .dj-wrap.hype .dj-fig > .bob { animation: djJump ${B} ease-out infinite; }
    @keyframes djBob { from { transform: translateY(0) rotate(-1.5deg); } to { transform: translateY(-6px) rotate(1.5deg); } }
    @keyframes djJump { 0% { transform: none; } 40% { transform: translateY(-16px) rotate(-2deg); } 100% { transform: none; } }
    @keyframes djNod { from { transform: rotate(-3deg); } to { transform: rotate(4deg) translateY(2px); } }
    @keyframes djShade { 0% { opacity: 1; } 50% { opacity: .25; } }
    @keyframes djScratch { from { transform: rotate(-7deg); } to { transform: rotate(6deg); } }
    @keyframes djPump { from { transform: rotate(-6deg); } to { transform: rotate(8deg) translateY(-4px); } }
    @keyframes djPoint { from { transform: rotate(-4deg); } to { transform: rotate(5deg); } }

    .dj-decks { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; overflow: visible; pointer-events: none; }
    .dj-decks .spin { transform-box: fill-box; transform-origin: center; animation: djSpin 1.8s linear infinite; }
    .dj-wrap.hype .dj-decks .spin { animation-duration: .6s; }
    .dj-decks .vu { transform-box: fill-box; transform-origin: 50% 100%; animation: djVu calc(${B} / 2) ease-in-out infinite alternate; }
    @keyframes djSpin { to { transform: rotate(360deg); } }
    @keyframes djVu { from { transform: scaleY(.25); } to { transform: scaleY(1); } }

    /* ---- จอ LED หน้าบูธ */
    .dj-led { position: absolute; overflow: hidden; pointer-events: none; font-family: 'IBM Plex Sans Thai', 'Leelawadee UI', sans-serif; color: #fff;
      background: radial-gradient(ellipse at 50% 120%, rgba(94,240,255,.10), rgba(4,3,12,.94) 70%); border-radius: 6px; }
    .dj-led::after { content: ''; position: absolute; inset: 0; pointer-events: none; background: repeating-linear-gradient(0deg, rgba(0,0,0,.3) 0 2px, transparent 2px 4px), repeating-linear-gradient(90deg, rgba(0,0,0,.24) 0 2px, transparent 2px 4px); }
    .dj-led .pg { position: absolute; inset: 0; opacity: 0; transition: opacity .35s; }
    .dj-led .pg.on { opacity: 1; }
    .dj-led .k { position: absolute; left: 16px; top: 10px; font-size: 15px; font-weight: 800; letter-spacing: 2px; color: #5ef0ff; text-shadow: 0 0 10px #5ef0ff; }
    .dj-led .bpm { position: absolute; right: 16px; top: 10px; font-size: 15px; font-weight: 800; color: #ffd23f; text-shadow: 0 0 10px #ffd23f; }
    .dj-led .t { position: absolute; left: 16px; right: 16px; top: 34px; height: 50px; font-size: 36px; font-weight: 800; white-space: nowrap; overflow: hidden; text-shadow: 0 0 14px #ff4fd8; }
    .dj-led .t span { display: inline-block; }
    .dj-led .t.run span { animation: djRun 9s linear infinite; padding-right: 60px; }
    @keyframes djRun { 0%, 12% { transform: translateX(0); } 100% { transform: translateX(-100%); } }
    .dj-led .s { position: absolute; left: 16px; right: 16px; top: 86px; font-size: 16px; color: #e0d4ff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .dj-led .bars { position: absolute; left: 16px; right: 16px; bottom: 40px; height: 56px; display: flex; align-items: flex-end; gap: 3px; }
    .dj-led .bars i { flex: 1; height: 100%; border-radius: 2px 2px 0 0; background: linear-gradient(0deg, #5ef0ff, #c9a6ff 60%, #ff4fd8); box-shadow: 0 0 8px rgba(255,79,216,.55);
      transform-origin: 50% 100%; animation: djBar calc(${B} / 2) ease-in-out infinite alternate; will-change: transform; }
    .dj-led .idle .bars i { animation-duration: ${B}; opacity: .7; }
    @keyframes djBar { from { transform: scaleY(var(--lo, .15)); } to { transform: scaleY(var(--hi, .9)); } }
    .dj-led .prog { position: absolute; left: 16px; right: 96px; bottom: 18px; height: 7px; border-radius: 4px; background: rgba(255,255,255,.15); }
    .dj-led .prog b { position: absolute; left: 0; top: 0; bottom: 0; width: 0; border-radius: 4px; background: linear-gradient(90deg, #5ef0ff, #ff4fd8); box-shadow: 0 0 10px #ff4fd8; transition: width .5s linear; }
    .dj-led .tm { position: absolute; right: 16px; bottom: 10px; font-size: 15px; color: #cfe9ff; }
    .dj-led .idle .t { text-align: center; font-size: 40px; text-shadow: 0 0 16px #5ef0ff; }
    .dj-led .idle .s { text-align: center; }
    .dj-led .q { position: absolute; left: 16px; right: 16px; bottom: 12px; font-size: 15px; color: #ffe9a8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: center; }
    .dj-led .shout { background: radial-gradient(ellipse at 50% 50%, rgba(255,79,216,.28), rgba(4,3,12,.95) 72%); }
    .dj-led .shout .k { left: 0; right: 0; text-align: center; color: #ffd23f; text-shadow: 0 0 10px #ffd23f; }
    .dj-led .shout .t { text-align: center; top: 38px; font-size: 46px; height: 60px; animation: djFlash .5s steps(1) infinite; }
    .dj-led .shout .s { text-align: center; top: 104px; font-size: 21px; }
    .dj-led .shout img { height: 1.3em; vertical-align: -.3em; }
    @keyframes djFlash { 50% { text-shadow: 0 0 26px #5ef0ff, 0 0 4px #fff; } }
    .dj-led .req .t { font-size: 30px; top: 44px; text-align: center; }
  `;

  const shade = (hex, p) => {
    const n = parseInt(hex.slice(1), 16);
    const f = (c) => Math.max(0, Math.min(255, Math.round(c + (p / 100) * (p < 0 ? c : 255 - c))));
    return '#' + [n >> 16, (n >> 8) & 255, n & 255].map((c) => f(c).toString(16).padStart(2, '0')).join('');
  };
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const fmt = (s) => (Number.isFinite(s) && s > 0 ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00');

  // ---- ดีเจ B หนุ่มสตรีท (หันหน้า ครึ่งตัวบน viewBox 140x170 — เอวอยู่ล่างสุด)
  const SK = '#e9b98f';
  function djBody() {
    return `<svg viewBox="0 0 140 170"><defs>
      <linearGradient id="djHd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2a40"/><stop offset="1" stop-color="#0f0f1a"/></linearGradient>
      <radialGradient id="djFc" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="#f3c79f"/><stop offset="1" stop-color="#b98058"/></radialGradient></defs>
      <path d="M32 110 Q34 92 56 89 L84 89 Q106 92 108 110 L112 172 L28 172Z" fill="url(#djHd)"/>
      <path d="M50 90 Q70 110 90 90" fill="none" stroke="#3a3a55" stroke-width="5"/>
      <path d="M36 112 L34 170 M104 112 L106 170" stroke="#5ef0ff" stroke-width="2" opacity=".55"/>
      <text x="70" y="150" text-anchor="middle" font-size="17" font-weight="900" font-family="Arial Black,Arial,sans-serif" fill="#ff4fd8" style="filter:drop-shadow(0 0 4px #ff4fd8)">DROP</text>
      <path d="M57 92 Q70 114 83 92" stroke="#ffd23f" stroke-width="2.4" fill="none"/><circle cx="70" cy="112" r="4.4" fill="#ffd23f"/>
      <ellipse cx="70" cy="96" rx="20" ry="8" fill="#20203a"/><ellipse cx="51" cy="95" rx="7.5" ry="6" fill="#20203a"/><ellipse cx="89" cy="95" rx="7.5" ry="6" fill="#20203a"/><ellipse cx="51" cy="95" rx="4.4" ry="3.4" fill="#5ef0ff"/><ellipse cx="89" cy="95" rx="4.4" ry="3.4" fill="#5ef0ff"/>
      <rect x="62" y="78" width="16" height="14" rx="4" fill="#b98058"/>
      <g class="head">
        <circle cx="70" cy="58" r="25" fill="url(#djFc)"/>
        <ellipse cx="45.5" cy="60" rx="3" ry="5" fill="#b98058"/><ellipse cx="94.5" cy="60" rx="3" ry="5" fill="#b98058"/>
        <path d="M46 52 Q48 30 70 30 Q92 30 94 52 L94 46 Q82 40 70 40 Q58 40 46 46Z" fill="#1b1210"/>
        <path d="M44 44 Q46 24 70 24 Q94 24 96 44 Q84 37 70 37 Q56 37 44 44Z" fill="#29c7ff"/><path d="M60 39 Q70 34 80 39 L79 44 Q70 40 61 44Z" fill="#1a7fa8"/><path d="M63 30 h14" stroke="#fff" stroke-width="1.6" opacity=".6"/>
        <rect x="48" y="53" width="44" height="13" rx="5.5" fill="#0c0c14"/>
        <g class="shL">${[0, 2, 4, 6].map((i) => `<rect x="${50.5 + i * 5.7}" y="54.6" width="3.2" height="9.8" rx="1" fill="#5ef0ff"/>`).join('')}</g>
        <g class="shR">${[1, 3, 5].map((i) => `<rect x="${50.5 + i * 5.7}" y="54.6" width="3.2" height="9.8" rx="1" fill="#ff4fd8"/>`).join('')}</g>
        <path d="M63 74 Q70 79 77 74" stroke="#7a3a2a" stroke-width="2.2" fill="none" stroke-linecap="round"/>
        <path d="M96 50 Q99 66 94 76" stroke="#20203a" stroke-width="3" fill="none"/><ellipse cx="97" cy="63" rx="7" ry="10" fill="#20203a"/><ellipse cx="97" cy="63" rx="4" ry="6.5" fill="#ff4fd8"/>
      </g></svg>`;
  }
  // แขน: ไหล่ → ศอก → มือ (ฮู้ดดี้แขนยาว ปลายแขนนีออน)
  const arm = (cls, sx, sy, ex, ey, hx, hy, cuff) => `<g class="${cls}"><path d="M${sx} ${sy} L${ex} ${ey}" stroke="#1d1d2e" stroke-width="14" stroke-linecap="round"/><path d="M${ex} ${ey} L${hx} ${hy}" stroke="#1d1d2e" stroke-width="12" stroke-linecap="round"/><path d="M${ex + (hx - ex) * 0.78} ${ey + (hy - ey) * 0.78} L${ex + (hx - ex) * 0.9} ${ey + (hy - ey) * 0.9}" stroke="${cuff}" stroke-width="12.5"/><circle cx="${hx}" cy="${hy}" r="6.2" fill="${SK}"/></g>`;
  // ท่า (พิกัดในกรอบ 140x170 • แผ่นซ้าย/ขวา/มิกเซอร์คำนวณจากตำแหน่งจริงบนบูธ)
  function poses(c) {
    const u = (x) => 70 + (x - c.x) / c.s;
    const v = (y) => 170 - (c.y - y) / c.s;
    const L = { x: u(c.decks[0].x), y: v(c.decks[0].y) + 2 };
    const R = { x: u(c.decks[1].x), y: v(c.decks[1].y) + 2 };
    const M = { x: u(c.mixer.x), y: v(c.mixer.y) };
    return {
      scratch: [[(38 + M.x) / 2 - 10, 120, M.x - 12, M.y + 2], [(102 + R.x) / 2, 122, R.x - 4, R.y]],
      phones: [[(38 + L.x) / 2, 122, L.x + 4, L.y], [112, 96, 99, 70]],
      up: [[26, 78, 16, 36], [114, 78, 124, 36]],
      point: [[(38 + M.x) / 2 - 10, 120, M.x - 14, M.y + 2], [118, 84, 142, 56]],
    };
  }
  function armsSvg(pose) {
    const P = poses(cfg)[pose];
    return `<svg viewBox="0 0 140 170">${arm('armL', 38, 104, ...P[0], '#5ef0ff')}${arm('armR', 102, 104, ...P[1], '#ff4fd8')}</svg>`;
  }

  // ---- เครื่องเล่นแผ่น + มิกเซอร์ (วาดทับของในภาพ พิกัดจอจริง)
  function decksSvg(c) {
    const deck = (d) => `<g transform="translate(${d.x} ${d.y})">
      <ellipse cx="0" cy="6" rx="58" ry="17" fill="#0b0d1c" stroke="#5ef0ff" stroke-width="2" opacity=".96"/>
      <g transform="scale(1 .28)"><g class="spin"><circle r="46" fill="#14142a"/><circle r="46" fill="none" stroke="rgba(94,240,255,.85)" stroke-width="4"/>
        ${[34, 26, 18].map((r) => `<circle r="${r}" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="2"/>`).join('')}
        <circle r="11" fill="#ff4fd8"/><rect x="-2" y="-46" width="4" height="20" fill="#fff"/></g></g>
      <circle cx="44" cy="2" r="3" fill="#3ddc84"/></g>`;
    const m = c.mixer;
    const vu = [0, 1, 2, 3, 4, 5].map((i) => `<rect class="vu" x="${m.x - 34 + i * 12}" y="${m.y - 18}" width="7" height="16" rx="1.5" fill="${i < 2 ? '#3ddc84' : i < 4 ? '#ffd23f' : '#ff4fd8'}" style="animation-delay:${(i * -0.07).toFixed(2)}s"/>`).join('');
    return `<svg class="dj-decks" viewBox="0 0 1080 1920">${c.decks.map(deck).join('')}
      <rect x="${m.x - 46}" y="${m.y - 24}" width="92" height="34" rx="5" fill="#0b0d1c" stroke="#c9a6ff" stroke-width="2"/>${vu}
      <rect x="${m.x - 40}" y="${m.y + 2}" width="80" height="4" rx="2" fill="#333a5a"/><rect x="${m.x - 6}" y="${m.y - 1}" width="12" height="10" rx="2" fill="#f4f4f6"/></svg>`;
  }

  // ---- จอ LED
  function ledHtml(c) {
    const bars = Array.from({ length: 30 }, (_, i) => `<i style="--lo:${(0.1 + 0.15 * Math.abs(Math.sin(i * 1.7))).toFixed(2)};--hi:${(0.45 + 0.55 * Math.abs(Math.sin(i * 0.53 + 1) * Math.cos(i * 0.23))).toFixed(2)};animation-delay:${((i * 0.037) % 0.24).toFixed(3)}s"></i>`).join('');
    return `<div class="dj-led" style="left:${c.led.x}px;top:${c.led.y}px;width:${c.led.w}px;height:${c.led.h}px">
      <div class="pg play"><div class="k">▶ NOW PLAYING</div><div class="bpm"></div><div class="t"><span></span></div><div class="s"></div><div class="bars">${bars}</div><div class="prog"><b></b></div><div class="tm"></div></div>
      <div class="pg idle on"><div class="k">🎧 DJ ON AIR</div><div class="bpm">LIVE</div><div class="t"><span></span></div><div class="s"></div><div class="bars">${bars}</div><div class="q"></div></div>
      <div class="pg req"><div class="k">🎶 ขอเพลงเข้าคิว</div><div class="t"><span></span></div><div class="s"></div></div>
      <div class="pg shout"><div class="k">★ SHOUTOUT ★</div><div class="t"><span></span></div><div class="s"></div></div>
    </div>`;
  }
  const $ = (sel) => root?.querySelector(sel);
  function page(name) {
    root.querySelectorAll('.dj-led .pg').forEach((p) => p.classList.toggle('on', p.classList.contains(name)));
  }
  function setTitle(el, text) {
    const span = el.querySelector('span');
    if (span.textContent !== text) span.textContent = text;
    el.classList.toggle('run', span.offsetWidth > el.clientWidth);
  }
  // อัปเดตจอทุกครึ่งวินาที: เพลงจริงจากเมนูเพลงในไลฟ์ > คิวขอเพลง/ป้ายดีเจ • ชื่อคนส่งของขวัญ/คนขอเพลงแทรกชั่วครู่
  function tick() {
    if (!root) return;
    const t = Date.now();
    if (t < shoutUntil) return page('shout');
    if (t < reqUntil) return page('req');
    const info = window.StageSong?.() || {};
    const st = info.st;
    const items = info.items || [];
    const it = st?.id && items.find((x) => x.id === st.id);
    if (it && st.playing) {
      const idx = items.indexOf(it);
      const next = items[(idx + 1) % items.length];
      setTitle($('.play .t'), it.title || 'เพลงไม่มีชื่อ');
      $('.play .s').textContent = `เพลงที่ ${idx + 1} / ${items.length}${items.length > 1 && next ? ` • ต่อไป: ${next.title}` : ''}`;
      $('.play .bpm').textContent = info.bpm ? `${info.bpm} BPM` : 'LIVE';
      const pos = (st.pos || 0) + (st.at ? Math.max(0, (t - st.at) / 1000) : 0);
      const dur = st.dur || it.dur || 0;
      $('.play .prog b').style.width = dur ? Math.min(100, (pos / dur) * 100).toFixed(1) + '%' : '0';
      $('.play .tm').textContent = `${fmt(Math.min(pos, dur || pos))} / ${fmt(dur)}`;
      return page('play');
    }
    setTitle($('.idle .t'), `DJ ${host || 'LIVE'}`);
    $('.idle .s').textContent = info.bg ? `🎵 ${info.bg}` : 'พิมพ์ “ขอเพลง ชื่อเพลง” เข้าคิวได้เลย';
    $('.idle .q').textContent = reqs.length ? `คิว: ${reqs.slice(0, 3).map((r, i) => `${i + 1}. ${r.text} (${r.by})`).join('  ')}` : 'พิมพ์ “ดรอป” ทั้งคลับกระโดดพร้อมกัน 🙌';
    page('idle');
  }
  // ดีเจเปลี่ยนท่าทุก ~4 จังหวะ (มันส์ = ชูมือ/ชี้คนดูบ่อยขึ้น)
  function nextPose() {
    const arms = $('.dj-arms');
    if (!arms) return;
    const r = Math.random();
    const pose = hype ? (r < 0.5 ? 'up' : r < 0.8 ? 'point' : 'scratch') : r < 0.45 ? 'scratch' : r < 0.7 ? 'phones' : r < 0.87 ? 'point' : 'up';
    if (!arms.classList.contains('p-' + pose)) {
      arms.className = 'dj-arms dj-fig p-' + pose;
      arms.querySelector('.bob').innerHTML = armsSvg(pose);
    }
    const beat = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--beat')) || 0.48;
    poseT = setTimeout(nextPose, beat * 1000 * (hype ? 2 : 4 + ((Math.random() * 3) | 0) * 2));
  }

  window.StageDJ = {
    mount(container, c, opt = {}) {
      if (!container || !c) return;
      cfg = c;
      host = opt.host || '';
      if (!document.getElementById('dj-css')) {
        const st = document.createElement('style');
        st.id = 'dj-css';
        st.textContent = css;
        document.head.appendChild(st);
      }
      if (opt.skin) document.getElementById('root')?.classList.add('skin-' + opt.skin);
      root?.remove();
      root = document.createElement('div');
      root.className = 'dj-wrap';
      const fig = (cls, inner, z) => `<div class="dj-clip" style="height:${c.clip}px;z-index:${z}"><div class="${cls}" style="left:${c.x - 70}px;top:${c.y - 170}px;transform:scale(${c.s})"><div class="bob">${inner}</div></div></div>`;
      root.innerHTML = fig('dj-fig dj-body', djBody(), c.clip - 3) + `<div style="position:absolute;inset:0;z-index:${c.clip - 2}">${decksSvg(c)}</div>` + fig('dj-arms dj-fig p-scratch', armsSvg('scratch'), c.clip - 1) +
        `<div style="position:absolute;inset:0;z-index:${c.clip}">${ledHtml(c)}</div>`;
      container.appendChild(root);
      clearInterval(this._t);
      this._t = setInterval(tick, 500);
      tick();
      clearTimeout(poseT);
      poseT = setTimeout(nextPose, 1500);
    },
    // ของขวัญเข้า: ชื่อคนส่งขึ้นจอ + ดีเจเล่นมันส์ชั่วครู่
    shout(d) {
      if (!root || !d?.user) return;
      setTitle($('.shout .t'), d.user.name || '');
      const icon = window.giftIconHtml ? window.giftIconHtml(d.gift?.name, '🎁') : '🎁';
      $('.shout .s').innerHTML = `ส่ง ${esc(d.gift?.name || 'ของขวัญ')} ${icon}${d.gift?.count > 1 ? ' x' + d.gift.count : ''} • ขอบคุณมากกก!`;
      shoutUntil = Date.now() + 4000;
      tick();
      this.hype((d.gift?.diamonds || 0) * (d.gift?.count || 1) >= 100 ? 5000 : 2200);
    },
    hype(ms = 2500) {
      if (!root) return;
      hype = true;
      root.classList.add('hype');
      clearTimeout(hypeT);
      hypeT = setTimeout(() => {
        hype = false;
        root?.classList.remove('hype');
      }, ms);
      clearTimeout(poseT);
      nextPose();
    },
    // คิวขอเพลงจากคอมเมนต์ (ขอเพลง ชื่อเพลง) — มีคำขอใหม่ = ขึ้นจอ 3 วินาที
    requests(list) {
      const fresh = list.length > reqs.length ? list[list.length - 1] : null;
      reqs = list.slice();
      if (!root || !fresh) return;
      setTitle($('.req .t'), fresh.text);
      $('.req .s').textContent = `ขอโดย ${fresh.by} • คิวที่ ${list.length}`;
      reqUntil = Date.now() + 3000;
      tick();
    },
    setHost(h) {
      host = h || '';
    },
  };
})();
