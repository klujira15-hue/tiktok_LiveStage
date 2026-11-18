/* วงดนตรีบนรถแห่ (hud.band) — นักร้อง มือกีตาร์ มือพิณ มือกลอง ยืนบนพื้นเวทีหลังรถ หันหน้าเข้าหาคนดู
 * วาดเป็น SVG แบ่งชั้น (ตัว / แขนที่ขยับ) แล้วขยับด้วย CSS transform ทั้งชิ้น → การ์ดจอทำให้ ไม่กินเครื่อง
 * จังหวะใช้ --beat ของหน้าเวที (ธีมรถแห่ 128 BPM) • ของขวัญเข้า → StageBand.hype() วงเล่นมันส์ขึ้นชั่วครู่
 * ใช้: hud.band = [{ kind: 'vocal'|'guitar'|'phin'|'drums', x, y (ตำแหน่งเท้าบนจอ 1080x1920), s (ขนาด) }]
 */
(function () {
  'use strict';
  const SKIN = ['#f1c7a3', '#e0ac85', '#c98e66'];
  let wrap = null;
  let hypeT = 0;

  // แต่ละคนมีท่าของตัวเอง จังหวะไม่ตรงกัน (นักร้องสเต็ปซ้าย-ขวา • กีตาร์โยกร็อกหน้า-หลัง • พิณย่อเข่าสเต็ปสวนทาง ช้ากว่าครึ่งจังหวะ • กลองผงกหัว)
  // + ท่าโชว์สุ่ม (t-*) ทีละคนเป็นระยะ ของขวัญเข้า = เล่นเร็วขึ้น ท่าโชว์ถี่ขึ้น
  const B = 'var(--beat, .47s)';
  const css = `
    .band-m { position: absolute; width: 0; height: 0; pointer-events: none; }
    .band-m .bb { position: absolute; left: -35px; bottom: 0; width: 70px; height: 156px; transform-origin: 50% 100%; will-change: transform; }
    .band-m .bb > svg { position: absolute; left: 0; top: 0; width: 70px; height: 156px; overflow: visible; }
    .band-m .lyr { transform-box: view-box; will-change: transform; }
    .band-m.vocal .bb { animation: vGroove calc(${B} * 2) ease-in-out infinite; }
    .band-m.guitar .bb { animation: gRock ${B} ease-in-out infinite alternate; animation-delay: calc(${B} * -0.25); }
    .band-m.phin .bb { animation: pStep calc(${B} * 2) ease-in-out infinite; animation-delay: calc(${B} * -0.5); }
    .band-m.drums .bb { animation: dNod calc(${B} / 2) ease-out infinite alternate; }
    .band-m .wave { transform-origin: 44px 58px; animation: vPump ${B} ease-in-out infinite alternate; }
    .band-m.guitar .strum { transform-origin: 47px 64px; animation: strum calc(${B} / 2) ease-in-out infinite alternate; }
    .band-m.phin .strum { transform-origin: 47px 64px; animation: strum calc(${B} / 4) ease-in-out infinite alternate; animation-delay: calc(${B} / -8); }
    .band-m .stL { transform-origin: 22px 66px; animation: hit calc(${B} / 2) ease-in infinite alternate; }
    .band-m .stR { transform-origin: 48px 66px; animation: hit calc(${B} / 2) ease-in infinite alternate-reverse; }
    .band-m .cym { transform-origin: 50% 50%; animation: cym ${B} ease-out infinite; }
    .band-m .mo { animation: sing calc(${B} / 2) steps(1) infinite; }
    /* เล่นมันส์ (ของขวัญเข้า) */
    .band.hype .band-m.vocal .bb { animation-duration: ${B}; }
    .band.hype .band-m.guitar .bb { animation-duration: calc(${B} / 2); }
    .band.hype .band-m.phin .bb { animation-duration: ${B}; }
    .band.hype .band-m .wave { animation-duration: calc(${B} / 2); }
    .band.hype .band-m .strum, .band.hype .band-m .stL, .band.hype .band-m .stR { animation-duration: calc(${B} / 4); }
    /* ท่าโชว์ */
    .band-m.t-spin .bb { animation: tSpin .9s ease-in-out 1 !important; }
    .band-m.t-jump .bb { animation: tJump .75s ease-out 1 !important; }
    .band-m.t-point .wave { animation: tPoint 1.2s ease-in-out 1 !important; }
    .band-m.t-lean .bb { animation: tLean 1.3s ease-in-out 1 !important; }
    .band-m.t-lean .strum { animation-duration: calc(${B} / 4) !important; }
    .band-m.t-kick .bb { animation: tKick .8s ease-out 1 !important; }
    .band-m.t-dip .bb { animation: tDip .9s ease-in-out 1 !important; }
    .band-m.t-hop .bb { animation: tHop .8s ease-in-out 1 !important; }
    .band-m.t-crash .stL { animation: crashL .7s ease-out 1 !important; }
    .band-m.t-crash .stR { animation: crashR .7s ease-out 1 !important; }
    .band-m.t-crash .cym { animation: cymBig .7s ease-out 1 !important; }
    .band-m.t-stand .bb { animation: tStand 1.1s ease-in-out 1 !important; }
    @keyframes vGroove { 0%, 100% { transform: translate(-9px, 0) rotate(-5deg); } 25%, 75% { transform: translate(0, -13px) scaleY(1.03); } 50% { transform: translate(9px, 0) rotate(5deg); } }
    @keyframes gRock { from { transform: translateX(-2px) rotate(-8deg); } to { transform: translate(2px, -4px) rotate(6deg); } }
    @keyframes pStep { 0%, 100% { transform: translateX(7px); } 25% { transform: translate(2px, 3px) rotate(3deg) scaleY(.92); } 50% { transform: translateX(-7px); } 75% { transform: translate(-2px, 3px) rotate(-3deg) scaleY(.92); } }
    @keyframes dNod { from { transform: translateY(0); } to { transform: translateY(-4px) rotate(1deg); } }
    @keyframes vPump { from { transform: rotate(-26deg); } to { transform: rotate(14deg); } }
    @keyframes strum { from { transform: rotate(-10deg); } to { transform: rotate(10deg); } }
    @keyframes hit { from { transform: rotate(-18deg); } to { transform: rotate(14deg); } }
    @keyframes cym { 0% { transform: rotate(-6deg) scale(1.05); } 30% { transform: rotate(4deg); } 100% { transform: none; } }
    @keyframes sing { 0% { opacity: 1; } 50% { opacity: 0; } }
    @keyframes tSpin { 0%, 100% { transform: none; } 25% { transform: translateY(-20px) scaleX(.2); } 50% { transform: translateY(-28px) scaleX(-1); } 75% { transform: translateY(-14px) scaleX(.2); } }
    @keyframes tJump { 0%, 100% { transform: none; } 15% { transform: translateY(5px) scaleY(.9); } 45% { transform: translateY(-50px) rotate(-6deg); } 80% { transform: translateY(3px) scaleY(.95); } }
    @keyframes tPoint { 0%, 100% { transform: rotate(0); } 20%, 80% { transform: rotate(-48deg); } 50% { transform: rotate(-56deg); } }
    @keyframes tLean { 0%, 100% { transform: none; } 25%, 75% { transform: translateX(-8px) rotate(-19deg); } 50% { transform: translateX(-9px) rotate(-21deg); } }
    @keyframes tKick { 0%, 100% { transform: none; } 15% { transform: translateY(5px) scaleY(.9); } 45% { transform: translateY(-44px) rotate(12deg); } 80% { transform: translateY(2px); } }
    @keyframes tDip { 0%, 100% { transform: none; } 40% { transform: translateY(14px) scaleY(.78); } 70% { transform: translateY(-12px) scaleY(1.05); } }
    @keyframes tHop { 0%, 50%, 100% { transform: none; } 25% { transform: translate(-6px, -28px) rotate(-5deg); } 75% { transform: translate(6px, -28px) rotate(5deg); } }
    @keyframes crashL { 0%, 100% { transform: none; } 35% { transform: rotate(-58deg); } 60% { transform: rotate(22deg); } }
    @keyframes crashR { 0%, 100% { transform: none; } 35% { transform: rotate(58deg); } 60% { transform: rotate(-22deg); } }
    @keyframes cymBig { 0% { transform: none; } 55% { transform: rotate(-14deg) scale(1.15); } 100% { transform: none; } }
    @keyframes tStand { 0%, 100% { transform: none; } 20%, 80% { transform: translateY(-18px); } 50% { transform: translateY(-22px) rotate(2deg); } }
    .band-m .tag { position: absolute; left: 50%; top: 4px; transform: translateX(-50%); white-space: nowrap; padding: 2px 10px; border-radius: 99px; font: 700 13px 'IBM Plex Sans Thai', sans-serif; color: #fff; background: rgba(20,10,40,.78); border: 2px solid #ff4fd8; }
  `;
  // ท่าโชว์ของแต่ละคน [ชื่อคลาส, ระยะเวลา ms]
  const TRICKS = {
    vocal: [['t-spin', 900], ['t-jump', 750], ['t-point', 1200]],
    guitar: [['t-lean', 1300], ['t-kick', 800]],
    phin: [['t-dip', 900], ['t-hop', 800]],
    drums: [['t-crash', 700], ['t-stand', 1100]],
  };


  // ---- ชิ้นส่วนร่วม (หันหน้า)
  const face = (sk, o = {}) => `
    <circle cx="35" cy="31" r="12.5" fill="${sk}"/>
    <ellipse cx="30.4" cy="32" rx="1.7" ry="2.3" fill="#2b1a12"/><ellipse cx="39.6" cy="32" rx="1.7" ry="2.3" fill="#2b1a12"/>
    <circle cx="31" cy="31.2" r=".6" fill="#fff"/><circle cx="40.2" cy="31.2" r=".6" fill="#fff"/>
    <ellipse cx="27" cy="36.5" rx="2.6" ry="1.5" fill="#ff7fa5" opacity=".45"/><ellipse cx="43" cy="36.5" rx="2.6" ry="1.5" fill="#ff7fa5" opacity=".45"/>
    ${o.sing ? `<path d="M32.5 37.5 Q35 39.5 37.5 37.5" stroke="#8a3a3a" stroke-width="1.3" fill="none" stroke-linecap="round"/><path class="mo" d="M32.4 37 Q35 37 37.6 37 Q37.2 41.6 35 41.6 Q32.8 41.6 32.4 37Z" fill="#a8323e"/>`
      : `<path d="M32 37.4 Q35 40.4 38 37.4" stroke="#8a3a3a" stroke-width="1.4" fill="none" stroke-linecap="round"/>`}`;
  const neck = (sk) => `<rect x="31.8" y="42" width="6.4" height="13" rx="2.6" fill="${sk}"/>`;
  const sneakers = (c = '#f4f4f6', sole = '#ff4fd8') => `<path d="M25 145 Q24.5 152 28 152.5 L34 152.5 Q35 149 34 145Z M36 145 Q35 149 36 152.5 L42 152.5 Q45.5 152 45 145Z" fill="${c}"/><path d="M24.8 151 h9.5 M35.7 151 h9.5" stroke="${sole}" stroke-width="2"/>`;
  const jeans = (c, d) => `<path d="M25 93 L34.6 93 L34 147 L26.5 147Z M35.4 93 L45 93 L43.5 147 L36 147Z" fill="${c}"/><path d="M30 98 Q30.5 122 30 144 M40 98 Q39.5 122 40 144" stroke="${d}" stroke-width="1" fill="none" opacity=".7"/>`;
  const svg = (inner) => `<svg viewBox="0 0 70 156">${inner}</svg>`;
  const shade = (hex, p) => {
    const n = parseInt(hex.slice(1), 16);
    const f = (c) => Math.max(0, Math.min(255, Math.round(c + (p / 100) * (p < 0 ? c : 255 - c))));
    return '#' + [n >> 16, (n >> 8) & 255, n & 255].map((c) => f(c).toString(16).padStart(2, '0')).join('');
  };

  // ---- นักร้องนำ: ชุดเลื่อมชมพูประกาย ถือไมค์ร้อง อีกมือโบกเชียร์
  function vocal() {
    const sk = SKIN[0];
    const hair = '#3a2416';
    const sequin = [[28, 64], [36, 62], [43, 66], [30, 74], [39, 72], [45, 78], [27, 84], [35, 82], [42, 88], [31, 92]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4" fill="#fff" opacity=".85"/>`).join('');
    const body = `
      <ellipse cx="35" cy="153" rx="15" ry="3.2" fill="rgba(0,0,0,.45)"/>
      <rect x="27" y="104" width="6.5" height="42" rx="3" fill="${sk}"/><rect x="36.5" y="104" width="6.5" height="42" rx="3" fill="${sk}"/>
      <path d="M26 126 L33.5 126 L34 151 L25 151 Q24.5 148 26 147Z M36.5 126 L44 126 L45 147 Q46 148 45.5 151 L36.5 151Z" fill="#f4f4f6"/>
      <path d="M22 30 Q20 58 24 72 L46 72 Q50 58 48 30Z" fill="${hair}"/>
      <path d="M23.5 60 Q24 55 30 54.5 L40 54.5 Q46 55 46.5 60 L49 106 Q35 110 21 106Z" fill="#ff4fa3"/>${sequin}
      <path d="M21.5 104 Q35 108 48.5 104" stroke="#ffd23f" stroke-width="2"/>
      ${neck(sk)}${face(sk, { sing: true })}
      <path d="M22.5 31 Q21 16 35 16 Q49 16 47.5 31 Q44 22 35 22.5 Q26 22 22.5 31Z" fill="${hair}"/>
      <path d="M24 26 Q30 19 39 20" stroke="rgba(255,255,255,.3)" stroke-width="1.6" fill="none"/>
      <path d="M26 58 Q22 50 27 42 L30 39" stroke="${sk}" stroke-width="5" fill="none" stroke-linecap="round"/>
      <rect x="27.5" y="35" width="4" height="9" rx="1.6" fill="#2a2a33" transform="rotate(-24 29.5 39.5)"/><circle cx="31.6" cy="36.4" r="3" fill="#9aa0ad"/>`;
    const arm = `<g class="lyr wave"><path d="M44 58 Q52 44 56 22" stroke="${sk}" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="56" cy="19.5" r="3.6" fill="${sk}"/><rect x="51" y="27" width="8" height="3.4" rx="1.6" fill="#5ef0ff"/></g>`;
    return svg(body + arm);
  }
  // ---- มือกีตาร์: เสื้อยืดดำ แก๊ปกลับหลัง กีตาร์ไฟฟ้าสีแดง มือขวาดีดสาย
  function guitar() {
    const sk = SKIN[1];
    const body = `
      <ellipse cx="35" cy="153" rx="15" ry="3.2" fill="rgba(0,0,0,.45)"/>
      ${jeans('#23232e', '#111118')}${sneakers('#f4f4f6', '#5ef0ff')}
      <path d="M20.5 61 Q21 54 29 53.5 L41 53.5 Q49 54 49.5 61 L47 95 Q35 98 23 95Z" fill="#24243a"/>
      <text x="35" y="74" text-anchor="middle" font-size="7" font-weight="900" font-family="Arial,sans-serif" fill="#5ef0ff">BASS</text>
      ${neck(SKIN[1])}${face(sk)}
      <ellipse cx="22.6" cy="32" rx="2" ry="3.2" fill="${shade(sk, -14)}"/><ellipse cx="47.4" cy="32" rx="2" ry="3.2" fill="${shade(sk, -14)}"/>
      <path d="M22.5 29 Q23 17 35 17 Q47 17 47.5 29 Q41 25 35 25.5 Q29 25 22.5 29Z" fill="#1b1210"/>
      <path d="M22.4 25 Q23.5 15 35 15 Q46.5 15 47.6 25 Q41 21.5 35 21.5 Q29 21.5 22.4 25Z" fill="#29c7ff"/>
      <path d="M21 58 Q16 66 24 70" stroke="#24243a" stroke-width="6.6" fill="none" stroke-linecap="round"/><path d="M24 70 L15 64" stroke="${sk}" stroke-width="4.6" stroke-linecap="round"/>
      <g transform="rotate(-28 36 80)">
        <rect x="-6" y="77" width="44" height="4.2" rx="1.6" fill="#6b3a2a"/><rect x="-11" y="75.5" width="7" height="7" rx="1.6" fill="#2a2a33"/>
        <path d="M30 70 Q40 66 47 72 Q53 70 55 77 Q58 86 50 90 Q44 95 36 90 Q28 92 27 84 Q25 76 30 70Z" fill="#e8343c"/>
        <rect x="35" y="76" width="9" height="2.4" fill="#f4f4f6"/><rect x="35" y="81" width="9" height="2.4" fill="#f4f4f6"/>
        <circle cx="49" cy="84" r="2" fill="#ffd23f"/>
      </g>
      <circle cx="15" cy="64" r="3.4" fill="${sk}"/>`;
    const arm = `<g class="lyr strum"><path d="M49 58 Q55 66 47 76" stroke="#24243a" stroke-width="6.6" fill="none" stroke-linecap="round"/><path d="M47 76 L42 80" stroke="${sk}" stroke-width="4.6" stroke-linecap="round"/><circle cx="41.5" cy="80.5" r="3.4" fill="${sk}"/></g>`;
    return svg(body + arm);
  }
  // ---- มือพิณ: เสื้อลายสีสด ผ้าขาวม้าพาดบ่า พิณไม้หัวพญานาค
  function phin() {
    const sk = SKIN[2];
    const plaid = '#c94f6d';
    const body = `
      <ellipse cx="35" cy="153" rx="15" ry="3.2" fill="rgba(0,0,0,.45)"/>
      ${jeans('#3a3f52', '#262a38')}${sneakers('#f4f4f6', '#ffd23f')}
      <path d="M20.5 61 Q21 54 29 53.5 L41 53.5 Q49 54 49.5 61 L47 95 Q35 98 23 95Z" fill="#ff7a3d"/>
      ${[[28, 66], [41, 64], [33, 78], [44, 84], [26, 88]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.4" fill="#ffd23f"/>`).join('')}
      <path d="M24 54 L48 92 L43 95 L20 58Z" fill="${plaid}"/><path d="M26 57 L46 90 M22 60 L42 93" stroke="#fff" stroke-width="1" opacity=".55"/>
      <path d="M22 92 L48 92 L48 97 L22 97Z" fill="${plaid}"/><path d="M22 94.5 h26" stroke="#fff" stroke-width=".9" opacity=".55"/>
      ${neck(sk)}${face(sk)}
      <ellipse cx="22.6" cy="32" rx="2" ry="3.2" fill="${shade(sk, -14)}"/><ellipse cx="47.4" cy="32" rx="2" ry="3.2" fill="${shade(sk, -14)}"/>
      <path d="M22.5 30 Q22 16 35 16 Q48 16 47.5 30 L45 24 L41 27 L38 21 L33 26 L30 21 L26 26Z" fill="#1b1210"/>
      <path d="M22.5 26 Q35 21 47.5 26" stroke="#ff4fd8" stroke-width="2.6" fill="none"/>
      <path d="M21 58 Q14 62 18 70" stroke="#ff7a3d" stroke-width="6.6" fill="none" stroke-linecap="round"/><path d="M18 70 L13 62" stroke="${sk}" stroke-width="4.6" stroke-linecap="round"/>
      <g transform="rotate(-40 35 82)">
        <rect x="-10" y="80" width="40" height="3.6" rx="1.4" fill="#8a5a2b"/>
        <path d="M-14 79 L-10 76 L-7 81 L-10 86Z" fill="#d9a63a"/><path d="M-17 78 Q-14 72 -10 76" stroke="#d9a63a" stroke-width="1.6" fill="none"/>
        <path d="M30 74 L48 74 L52 82 L48 90 L30 90 L26 82Z" fill="#b5793a"/><path d="M30 74 L48 74 L52 82 L48 90 L30 90 L26 82Z" fill="none" stroke="#6b3a1a" stroke-width="1.4"/>
        <circle cx="39" cy="82" r="3.4" fill="#4a2a12"/><path d="M33 77 L45 77 M33 87 L45 87" stroke="#ffd23f" stroke-width="1"/>
      </g>
      <circle cx="13" cy="62" r="3.4" fill="${sk}"/>`;
    const arm = `<g class="lyr strum"><path d="M49 58 Q56 66 49 78" stroke="#ff7a3d" stroke-width="6.6" fill="none" stroke-linecap="round"/><path d="M49 78 L44 83" stroke="${sk}" stroke-width="4.6" stroke-linecap="round"/><circle cx="43.5" cy="83.5" r="3.4" fill="${sk}"/></g>`;
    return svg(body + arm);
  }
  // ---- มือกลอง: นั่งหลังกลองชุด เห็นครึ่งบน ผ้าคาดหัว ไม้กลอง 2 ข้างตีสลับ ฉาบโยก
  function drums() {
    const sk = SKIN[0];
    const kit = `
      <g class="cym" style="transform-origin:10px 70px"><ellipse cx="10" cy="70" rx="11" ry="2.6" fill="#e8c35a"/><ellipse cx="10" cy="69.4" rx="3" ry="1" fill="#fff3c0"/></g><path d="M10 72 L10 128" stroke="#9aa0ad" stroke-width="1.4"/>
      <g class="cym" style="transform-origin:61px 64px;animation-delay:calc(var(--beat,.47s) / -2)"><ellipse cx="61" cy="64" rx="12" ry="2.8" fill="#e8c35a"/><ellipse cx="61" cy="63.4" rx="3" ry="1" fill="#fff3c0"/></g><path d="M61 66 L61 128" stroke="#9aa0ad" stroke-width="1.4"/>
      <ellipse cx="24" cy="94" rx="10" ry="4.4" fill="#f4f4f6"/><rect x="14" y="94" width="20" height="9" fill="#7c5cff"/><ellipse cx="24" cy="103" rx="10" ry="4.4" fill="#5a3fd0"/>
      <ellipse cx="46" cy="94" rx="10" ry="4.4" fill="#f4f4f6"/><rect x="36" y="94" width="20" height="9" fill="#7c5cff"/><ellipse cx="46" cy="103" rx="10" ry="4.4" fill="#5a3fd0"/>
      <circle cx="35" cy="128" r="22" fill="#7c5cff"/><circle cx="35" cy="128" r="18.5" fill="#f4f4f6"/>
      <text x="35" y="126" text-anchor="middle" font-size="9" font-weight="900" font-family="'IBM Plex Sans Thai',sans-serif" fill="#ff4fa3">รถแห่</text>
      <text x="35" y="136" text-anchor="middle" font-size="6" font-weight="900" font-family="Arial,sans-serif" fill="#7c5cff">LIVE</text>
      <path d="M17 150 L22 140 M53 150 L48 140" stroke="#9aa0ad" stroke-width="1.6"/>`;
    const body = `
      <ellipse cx="35" cy="153" rx="24" ry="3.4" fill="rgba(0,0,0,.45)"/>
      <path d="M22 64 Q23 57 29 56.5 L41 56.5 Q47 57 48 64 L48 100 L22 100Z" fill="#24243a"/><path d="M19 64 Q20 58 25 57 L24 70Z M51 64 Q50 58 45 57 L46 70Z" fill="${sk}"/>
      ${neck(sk)}${face(sk)}
      <path d="M22.5 30 Q22 16 35 16 Q48 16 47.5 30 Q44 22 35 23 Q26 22 22.5 30Z" fill="#7a4a2a"/>
      <path d="M22.6 26 Q35 20 47.4 26" stroke="#ff4fd8" stroke-width="3.2" fill="none"/>`;
    const stick = (cls, sx, hx) => `<g class="lyr ${cls}"><path d="M${sx} 66 Q${(sx + hx) / 2} 76 ${hx} 84" stroke="${sk}" stroke-width="4.8" fill="none" stroke-linecap="round"/><circle cx="${hx}" cy="85" r="3.2" fill="${sk}"/><path d="M${hx} 85 L${hx + (hx < 35 ? -6 : 6)} 92" stroke="#e9d4a8" stroke-width="2" stroke-linecap="round"/></g>`;
    return svg(body + stick('stL', 22, 24) + stick('stR', 48, 46) + kit);
  }

  const MAKE = { vocal, guitar, phin, drums };

  window.StageBand = {
    // วางวงบนพื้นเวที (container = #crowd) — z-index ตามระดับเท้า อยู่หลังคนดูแถวหน้า
    mount(container, members, opt = {}) {
      if (!container || !Array.isArray(members)) return;
      if (!document.getElementById('band-css')) {
        const st = document.createElement('style');
        st.id = 'band-css';
        st.textContent = css;
        document.head.appendChild(st);
      }
      wrap?.remove();
      wrap = document.createElement('div');
      wrap.className = 'band';
      for (const m of members) {
        const make = MAKE[m.kind];
        if (!make) continue;
        const el = document.createElement('div');
        el.className = 'band-m ' + m.kind;
        el.style.cssText = `left:${m.x}px;top:${m.y}px;z-index:${Math.round(m.y)};transform:scale(${m.s || 1});transform-origin:0 0`;
        el.innerHTML = `<div class="bb">${make()}</div>`;
        if (m.kind === 'vocal' && opt.host) {
          const t = document.createElement('div');
          t.className = 'tag';
          t.textContent = '🎤 ' + opt.host;
          el.appendChild(t);
        }
        wrap.appendChild(el);
        // ท่าโชว์สุ่มของคนนี้ (แต่ละคนนับเวลาของตัวเอง ไม่ชนกัน)
        const list = TRICKS[m.kind] || [];
        const next = () => {
          const hype = wrap?.classList.contains('hype');
          el._tt = setTimeout(() => {
            if (!el.isConnected) return;
            if (!document.hidden && list.length) {
              const [cls, ms] = list[(Math.random() * list.length) | 0];
              el.classList.add(cls);
              setTimeout(() => el.classList.remove(cls), ms);
            }
            next();
          }, hype ? 900 + Math.random() * 1100 : 2600 + Math.random() * 4200);
        };
        next();
      }
      container.appendChild(wrap);
    },
    // ของขวัญเข้า: วงเล่นมันส์ขึ้น (กระโดด ดีดรัว ตีรัว) ชั่วครู่
    hype(ms = 2500) {
      if (!wrap) return;
      wrap.classList.add('hype');
      clearTimeout(hypeT);
      hypeT = setTimeout(() => wrap?.classList.remove('hype'), ms);
    },
    unmount() {
      wrap?.remove();
      wrap = null;
    },
  };
})();
