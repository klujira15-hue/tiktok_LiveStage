/* แม่แบบธีม "ลานกิจกรรม" — ใช้ร่วมกันทุกธีมที่มี meta.hud (ดู hudthemes.js)
 * ไฟล์ธีมแต่ละตัว (public/themes/<id>.js) แค่เรียก window.makeHudTheme('<id>')
 * แผงบนจอ: การ์ดชื่อไลฟ์ (ซ้ายบน) • วงแหวนเป้าหมาย 2 วง (ขวาบน) • หลอดพลัง/ภารกิจ (กลาง)
 *          • ทำเนียบ 3 อันดับ (ซ้าย) • ป้ายแขวนคำสั่งพิมพ์ (ขวา) • ตัวนับโซน + เซียนประจำโซน (ซ้ายล่าง)
 *          • แถบวิ่งของขวัญ→กิจกรรม (ล่างสุด)
 */
(() => {
  const S = 2; // พิกัดในดีไซน์ (540 กว้าง) → เวทีจริง 1080
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const meta = () => window.__stage?.api?.meta || {};
  const hud = () => meta().hud || {};

  function css(id) {
    const h = hud();
    const p = h.palette || {};
    const r = `#root.theme-${id}`;
    return `
      ${r} { --hud-accent: ${p.accent}; --hud-accent2: ${p.accent2}; --hud-ink: ${p.ink}; --hud-panel: rgba(14,12,24,.82);
        --glass: rgba(14,12,24,.82); --panel-border: rgba(255,255,255,.18); --heading: ${p.accent2}; --muted: #e9e4ff;
        --feed-bg: linear-gradient(90deg, rgba(14,12,24,.85), rgba(0,0,0,0)); --toast-bg: ${p.accent}; --toast-glow: ${p.accent};
        --big-grad: linear-gradient(180deg, #ffffff, ${p.accent2}); --big-bg: radial-gradient(circle at 50% 45%, rgba(0,0,0,.25), rgba(0,0,0,.72) 70%);
        --card-bg: rgba(14,12,24,.9); --card-top: 700px; --team-top: 640px; --fortune-top: 720px; }
      ${r} #header, ${r} #songPanel, ${r} #giftPanel, ${r} #topPanel { display: none !important; }
      /* หลอดพลัง + ภารกิจ: ใต้การ์ดชื่อไลฟ์ (กลางจอเว้นว่างให้เห็นฉาก) */
      ${r} #hype { left: 24px; width: 530px; top: 212px; padding: 10px 18px 12px; border-radius: 20px; background: rgba(14,12,24,.78); border: 2px solid rgba(255,255,255,.14); }
      ${r} #hype .label { font-size: 22px; }
      ${r} #hype .bar { height: 18px; }
      ${r} #feed { top: 640px !important; left: 24px; width: 470px; }
      ${r} #toasts { top: 980px; }
      ${r} .toast { color: var(--hud-ink); }
      .hud { position: absolute; inset: 0; pointer-events: none; font-family: 'Kanit', 'Leelawadee UI', sans-serif; color: #fff; z-index: 3; }
      .hud * { box-sizing: border-box; }
      .hud .hpanel { background: rgba(14,12,24,.8); border: 2px solid rgba(255,255,255,.16); border-radius: 26px; box-shadow: 0 10px 30px rgba(0,0,0,.35); }

      /* การ์ดชื่อไลฟ์ */
      .hud .ttl { position: absolute; left: 24px; top: 24px; width: 530px; display: flex; gap: 18px; align-items: center; padding: 16px 22px 16px 16px;
        border-radius: 30px; background: linear-gradient(120deg, var(--hud-accent), var(--hud-accent2)); color: var(--hud-ink); box-shadow: 0 10px 26px rgba(0,0,0,.35); }
      .hud .ttl .ico { flex: none; width: 92px; height: 92px; border-radius: 24px; background: rgba(255,255,255,.55); display: grid; place-items: center; font-size: 56px; }
      .hud .ttl b { display: block; font-size: 37px; line-height: 1.15; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .hud .ttl small { display: block; font-size: 22px; line-height: 1.3; font-weight: 600; opacity: .85; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .hud .host { position: absolute; left: 44px; top: 160px; display: flex; align-items: center; gap: 0; font-size: 24px; font-weight: 700; }
      .hud .host i { font-style: normal; padding: 6px 16px; border-radius: 0 0 0 16px; background: rgba(14,12,24,.85); color: var(--hud-accent2); }
      .hud .host span { padding: 6px 20px; border-radius: 0 0 16px 0; background: #fff; color: #1c1830; }

      /* วงแหวนเป้าหมาย */
      .hud .rings { position: absolute; right: 150px; top: 22px; display: flex; gap: 14px; }
      .hud .ring { width: 176px; text-align: center; }
      .hud .ring .dial { position: relative; width: 150px; height: 150px; margin: 0 auto; border-radius: 50%; background: rgba(14,12,24,.82); box-shadow: 0 8px 22px rgba(0,0,0,.35); }
      .hud .ring svg { position: absolute; inset: 0; transform: rotate(-90deg); }
      .hud .ring circle { fill: none; stroke-width: 14; }
      .hud .ring .bg { stroke: rgba(255,255,255,.14); }
      .hud .ring .fg { stroke-linecap: round; stroke-dasharray: 377; stroke-dashoffset: 377; transition: stroke-dashoffset .6s; }
      .hud .ring .num { position: absolute; inset: 0; display: grid; place-items: center; align-content: center; line-height: 1.05; }
      .hud .ring .num b { font-size: 32px; }
      .hud .ring .num small { font-size: 17px; opacity: .8; }
      .hud .ring .cap { margin-top: 6px; font-size: 19px; font-weight: 700; line-height: 1.25; text-shadow: 0 2px 4px #000; }
      .hud .ring .cap em { font-style: normal; color: var(--hud-accent2); }
      .hud .ring.pop .dial { animation: hudPop .7s ease-out; }
      @keyframes hudPop { 0% { transform: scale(1.18); box-shadow: 0 0 40px var(--hud-accent2); } 100% { transform: none; } }

      /* ทำเนียบ 3 อันดับ */
      .hud .hrank { position: absolute; left: 24px; top: 356px; width: 300px; padding: 14px 16px; }
      .hud .hrank h4, .hud .signs h4, .hud .zbox h4 { margin: 0 0 8px; font-size: 20px; line-height: 1.3; color: var(--hud-accent2); }
      .hud .hrank .r { display: flex; align-items: center; gap: 10px; padding: 6px 0; border-top: 1px solid rgba(255,255,255,.1); }
      .hud .hrank .r:first-of-type { border-top: 0; }
      .hud .hrank .md { flex: none; width: 34px; font-size: 30px; text-align: center; }
      .hud .hrank .av { flex: none; width: 46px; height: 46px; border-radius: 14px; overflow: hidden; display: grid; place-items: center; font-weight: 800; font-size: 22px; background: var(--hud-accent); color: var(--hud-ink); }
      .hud .hrank .av img { width: 100%; height: 100%; object-fit: cover; }
      .hud .hrank .nm { flex: 1; min-width: 0; font-size: 21px; font-weight: 600; line-height: 1.2; }
      .hud .hrank .nm span { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .hud .hrank .nm small { font-size: 17px; color: #ffd9a0; }
      .hud .hrank .empty { font-size: 19px; opacity: .75; padding: 8px 0; }

      /* ป้ายแขวนคำสั่งพิมพ์ */
      .hud .signs { position: absolute; right: 24px; top: 238px; width: 300px; display: flex; flex-direction: column; align-items: stretch; gap: 14px; }
      .hud .signs h4 { text-align: center; text-shadow: 0 2px 4px #000; margin: 0; }
      .hud .sign { position: relative; display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 18px; background: #fffaf0; color: #2a2116;
        border-left: 10px solid var(--hud-accent); box-shadow: 0 6px 0 rgba(0,0,0,.25); }
      .hud .sign:nth-child(odd) { transform: rotate(-1.6deg); } .hud .sign:nth-child(even) { transform: rotate(1.4deg); }
      .hud .sign::before { content: ''; position: absolute; left: 50%; top: -14px; width: 2px; height: 14px; background: rgba(255,255,255,.6); }
      .hud .sign .em { flex: none; font-size: 40px; line-height: 1; }
      .hud .sign b { display: block; font-size: 28px; line-height: 1.15; }
      .hud .sign small { display: block; font-size: 17px; line-height: 1.25; color: #6b5a44; }
      .hud .sign.on { animation: hudPing .6s ease-out; }
      @keyframes hudPing { 0% { transform: scale(1.1); background: #fff2a8; } 100% { } }

      /* ตัวนับโซน + เซียน */
      .hud .zbox { position: absolute; left: 24px; bottom: 124px; width: 360px; padding: 14px 16px; }
      .hud .zone { display: flex; align-items: center; gap: 10px; font-size: 22px; font-weight: 600; line-height: 1.5; }
      .hud .zone .em { flex: none; font-size: 26px; }
      .hud .zone span { flex: 1; min-width: 0; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .hud .zone b { font-size: 26px; color: var(--hud-accent2); }
      .hud .zone.on b { animation: hudBump .5s ease-out; display: inline-block; }
      @keyframes hudBump { 0% { transform: scale(1.5); } 100% { transform: none; } }
      .hud .zbox .lead { margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,.12); font-size: 18px; line-height: 1.4; color: #e2dcf5; }

      /* แถบวิ่งของขวัญ → กิจกรรม */
      .hud .tick { position: absolute; left: 0; right: 0; bottom: 0; height: 96px; overflow: hidden; display: flex; align-items: center;
        background: linear-gradient(0deg, rgba(10,8,18,.95), rgba(10,8,18,.75)); border-top: 3px solid var(--hud-accent); }
      .hud .tick .run { display: flex; gap: 48px; padding-left: 40px; white-space: nowrap; animation: hudRun 38s linear infinite; }
      .hud .tick .it { font-size: 24px; font-weight: 600; }
      .hud .tick .it b { color: var(--hud-accent2); }
      @keyframes hudRun { from { transform: translateX(0); } to { transform: translateX(-50%); } }

      /* สติกเกอร์ที่วางเอง (ธีมที่สร้างเอง) */
      .hud .stk { position: absolute; white-space: nowrap; line-height: 1; font-weight: 800; transform-origin: 0 0; text-shadow: 0 3px 10px rgba(0,0,0,.45); }

      /* ม้านั่งโบสถ์ (hud.pews): พนักพิงไม้สีครีมขอบทอง วางทับครึ่งล่างของคนที่นั่งแถวนั้น อยู่หลังคนแถวถัดไป */
      .pew { position: absolute; pointer-events: none; border-radius: calc(var(--s) * 8px) calc(var(--s) * 8px) 3px 3px;
        background: repeating-linear-gradient(90deg, rgba(120,80,50,.07) 0 2px, transparent 2px calc(var(--s) * 46px)), linear-gradient(180deg, #f4e6d4, #dcc2a2);
        border-top: calc(var(--s) * 7px) solid #c99d68; box-shadow: 0 calc(var(--s) * 8px) calc(var(--s) * 10px) rgba(70,40,80,.28), inset 0 -3px 0 rgba(120,80,50,.18); }
      .pew::before, .pew::after { content: ''; position: absolute; top: calc(var(--s) * -20px); bottom: 0; width: calc(var(--s) * 13px);
        background: linear-gradient(180deg, #f6e8d6, #d8bb95); border-radius: calc(var(--s) * 7px) calc(var(--s) * 7px) 2px 2px; border-top: calc(var(--s) * 5px) solid #e2b866; }
      .pew::before { left: calc(var(--s) * -7px); }
      .imam-fig { position: absolute; pointer-events: none; }
      .imam-fig svg { width: 100%; height: 100%; overflow: visible; }
      .imam-fig.bow .salah .up { animation: salahBow 1.1s ease-in-out 1; }
      .pew::after { right: calc(var(--s) * -7px); }

      .fan.hdance .body { animation: hudDance .32s ease-in-out 8 alternate !important; transform-origin: 50% 100%; }
      @keyframes hudDance { from { transform: rotate(-9deg) translateY(0); } to { transform: rotate(9deg) translateY(-14px); } }

      /* ---------- หน้าตาแบบศาล (hud.ui = 'shrine'): ป้ายไม้แกะสลักสีหยกขอบทอง 2 ฝั่ง เว้นกลางจอให้เห็นองค์เทพ
         ซ้าย = ชื่อศาล + ของขวัญแต่ละชิ้นทำอะไร (รูปจริงของ TikTok ไม่บอกราคา) • ขวา = เป้าบุญรวม (+ พลังคนดู/ภารกิจ) • เจ้าภาพ • คำที่พิมพ์ได้
         ทุกแผงอยู่ระหว่างแถบบนของ TikTok (y 230) กับช่องคอมเมนต์/ปุ่มขวา (y ~1080) */
      .hud.ui-shrine { --sp-gold: #f0c76a; --sp-gold2: #ffe3a0; --sp-mint: #9fe3bd; --sp-ink: #2b1d06; }
      .hud .sp-plate { position: absolute; border-radius: 22px; background: linear-gradient(180deg, var(--sp-bg1, rgba(18,62,47,.93)), var(--sp-bg2, rgba(7,33,24,.93))); color: #fff6dc;
        border: 3px solid var(--sp-gold); box-shadow: 0 10px 30px rgba(0,0,0,.4), inset 0 0 0 2px rgba(255,227,160,.22), inset 0 0 0 9px rgba(0,0,0,.18); }
      .hud .sp-right .sp-plate { position: relative; }
      .hud .sp-plate::before, .hud .sp-plate::after { content: '❖'; position: absolute; top: -21px; font-size: 30px; color: var(--sp-gold); text-shadow: 0 2px 0 #5a3d0a; }
      .hud .sp-plate::before { left: 18px; } .hud .sp-plate::after { right: 18px; }
      .hud .sp-rib { position: absolute; left: 50%; top: -26px; transform: translateX(-50%); padding: 4px 26px; border-radius: 99px; white-space: nowrap;
        background: linear-gradient(180deg, #ffe7a6, #e2a93c); color: var(--sp-ink); font-size: 26px; font-weight: 700; box-shadow: 0 3px 0 #8a5b12; }
      .hud .sp-title { left: 28px; top: 236px; width: 340px; padding: 16px 20px 14px; text-align: center; }
      .hud .sp-title b { display: block; font-size: 40px; line-height: 1.15; font-weight: 700; color: var(--sp-gold2); text-shadow: 0 2px 0 #3a2a0a; }
      .hud .sp-title b.long { font-size: 33px; }
      .hud .sp-title span { display: block; margin-top: 6px; font-size: 21px; line-height: 1.3; color: var(--sp-mint); }
      .hud .sp-gifts { left: 28px; top: 430px; width: 340px; padding: 34px 14px 12px; }
      .hud .sp-gifts .note { text-align: center; font-size: 21px; color: var(--sp-gold2); margin-bottom: 6px; }
      .hud .sp-g { display: flex; align-items: center; gap: 9px; height: 62px; padding: 0 10px; border-radius: 14px; }
      .hud .sp-g + .sp-g { margin-top: 3px; }
      .hud .sp-g .gi { width: 54px; height: 54px; flex: none; display: grid; place-items: center; font-size: 38px; }
      .hud .sp-g .gi img { width: 54px; height: 54px; object-fit: contain; filter: drop-shadow(0 2px 3px rgba(0,0,0,.5)); }
      .hud .sp-g .ar { color: var(--sp-gold); font-size: 22px; flex: none; }
      .hud .sp-g .fx { min-width: 0; font-size: 22px; font-weight: 500; line-height: 1.15; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .hud .sp-g .fx small { display: block; font-size: 16px; color: #cfe6d8; font-weight: 400; overflow: hidden; text-overflow: ellipsis; }
      .hud .sp-g.big { background: linear-gradient(90deg, rgba(240,199,106,.28), rgba(240,199,106,.06)); }
      .hud .sp-g.big .fx { color: var(--sp-gold2); font-weight: 600; }
      .hud .sp-g.flash { animation: spFlash 1.4s ease-out; }
      @keyframes spFlash { 0% { background: rgba(159,227,189,.55); transform: scale(1.06); } 100% { } }
      .hud .sp-right { position: absolute; left: 712px; top: 236px; width: 340px; display: flex; flex-direction: column; gap: 30px; }
      .hud .sp-goals { padding: 34px 18px 14px; }
      .hud .sp-goal + .sp-goal { margin-top: 10px; }
      .hud .sp-goal .row { display: flex; justify-content: space-between; gap: 8px; font-size: 21px; white-space: nowrap; }
      .hud .sp-goal .row b { font-weight: 600; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
      .hud .sp-goal .row span { color: var(--sp-mint); flex: none; }
      .hud .sp-bar { height: 15px; margin-top: 5px; border-radius: 99px; background: rgba(0,0,0,.4); overflow: hidden; }
      .hud .sp-bar i { display: block; height: 100%; width: 0; border-radius: 99px; background: linear-gradient(90deg, #e2a93c, #ffe7a6); transition: width .6s; }
      .hud .sp-goal.pop .sp-bar i { animation: spPop .8s ease-out; }
      @keyframes spPop { 0% { box-shadow: 0 0 22px #ffe7a6; filter: brightness(1.6); } 100% { } }
      .hud .sp-goals .hy:not(:empty) { margin-top: 12px; padding-top: 10px; border-top: 1px solid rgba(255,227,160,.22); }
      .hud .sp-host { padding: 34px 16px 12px; }
      .hud .sp-host .r { display: flex; align-items: center; gap: 10px; font-size: 23px; height: 46px; }
      .hud .sp-host .r:first-child { font-size: 26px; height: 54px; }
      .hud .sp-host .md { flex: none; width: 30px; text-align: center; font-size: 24px; }
      .hud .sp-host .av { flex: none; width: 40px; height: 40px; border-radius: 50%; overflow: hidden; display: grid; place-items: center; font-weight: 700; font-size: 20px;
        background: #e86a8a; color: #fff; border: 2px solid var(--sp-gold); }
      .hud .sp-host .r:first-child .av { width: 48px; height: 48px; }
      .hud .sp-host .av img { width: 100%; height: 100%; object-fit: cover; }
      .hud .sp-host .nm { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .hud .sp-host .pt { flex: none; color: var(--sp-gold2); font-weight: 600; font-size: 20px; }
      .hud .sp-host .empty { font-size: 20px; line-height: 1.4; color: #cfe6d8; text-align: center; padding: 4px 0 6px; }
      .hud .sp-cmds { padding: 34px 14px 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .hud .sp-cmd { border-radius: 14px; background: rgba(255,246,220,.94); color: var(--sp-ink); padding: 7px 8px; text-align: center; min-width: 0; }
      .hud .sp-cmd b { display: block; font-size: 25px; line-height: 1.2; white-space: nowrap; }
      .hud .sp-cmd span { display: block; font-size: 17px; color: #6b5420; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .hud .sp-cmd.on { animation: spPing .6s ease-out; }
      @keyframes spPing { 0% { transform: scale(1.12); background: #fff2a8; } 100% { } }
      ${h.ui === 'shrine' ? `
      ${p.plate ? `${r} { --sp-bg1: ${p.plate[0]}; --sp-bg2: ${p.plate[1]}; }` : ''}
      /* หลอดพลังคนดู/ภารกิจ ย้ายเข้าไปอยู่ในป้าย "เป้าบุญรวม" • รายการของขวัญที่เพิ่งส่ง + ข้อความเด้ง อยู่กลางจอเหนือโต๊ะบูชา (ไม่ทับป้ายสองฝั่ง) */
      ${r} .hud .sp-goals #hype { position: static; left: auto; top: auto; width: auto; padding: 0; background: none; border: 0; border-radius: 0; }
      ${r} .hud .sp-goals #hype .label { font-size: 20px; margin-bottom: 3px; }
      ${r} .hud .sp-goals #hype .bar { height: 14px; }
      ${r} .hud .sp-goals #hype .ml { font-size: 17px; }
      ${r} .hud .sp-goals #hype .mbar { height: 10px; }
      ${r} #feed { top: 960px !important; left: 372px; width: 336px; }
      ${r} #toasts { top: 250px; }
      /* ของขวัญใหญ่: ข้อความ "สาธุ!" เต็มจอแบบไม่ทำให้ฉากมืด → เห็นยันต์/แสง/เหรียญทองชัด */
      ${r} { --big-bg: radial-gradient(circle at 50% 45%, rgba(0,0,0,0) 30%, rgba(0,0,0,.38) 82%); }` : ''}
    `;
  }

  const ROWS = [
    { y: 1060, s: 0.62, n: 7, x0: 380, x1: 1020, vip: true },
    { y: 1210, s: 0.74, n: 9, x0: 60, x1: 1020 },
    { y: 1380, s: 0.86, n: 9, x0: 60, x1: 1020 },
    { y: 1560, s: 0.98, n: 8, x0: 400, x1: 1010 },
    { y: 1750, s: 1.1, n: 6, x0: 400, x1: 1000 },
  ];

  function emojiParticle(api, emoji, x, y, o = {}) {
    api.spawn({
      x, y, vx: o.vx ?? api.rand(-60, 60), vy: o.vy ?? api.rand(-260, -120), g: o.g ?? 260, max: o.max ?? 1.8, size: o.size ?? api.rand(38, 58),
      draw(c, p) {
        window.drawEmoji(c, emoji, p.x, p.y, p.size);
      },
    });
  }

  // แสงนวลโปรยลงทั้งฉาก (แทนพลุในธีมสถานที่ศักดิ์สิทธิ์)
  function glowRain(api, emoji, ms) {
    api.emitter(ms, () => {
      if (Math.random() < 0.5) api.spawn({ type: 'glow', x: api.rand(60, 1020), y: api.rand(-20, 600), vy: api.rand(60, 160), max: api.rand(2.5, 4), size: api.rand(3, 6), color: '#ffe3a0', twinkle: 4 });
      if (Math.random() < 0.18) emojiParticle(api, emoji, api.rand(0, 1080), -40, { vx: api.rand(-20, 20), vy: api.rand(120, 220), g: 40, max: 6, size: api.rand(32, 46) });
    });
  }

  window.makeHudTheme = function makeHudTheme(id) {
    let el = null;
    let lastTop = [];
    const T = {
      // จังหวะเพลง → ตัวละครเด้งตาม (ธีมรถแห่ตั้ง bpm ให้ตรงเพลงแดนซ์)
      get bpm() {
        return hud().bpm || 100;
      },
      // ความสูงตัวละคร (ใช้วางบอลลูนคำพูด/มงกุฎเหนือหัว) — ท่านั่งพนมมือเตี้ยกว่าท่ายืน
      get fanH() {
        return { kneel: 90, pew: 98, salah: 92, party: 156, kid: 118 }[hud().fan] || 116;
      },
      // ฉากภาพ 2.5D เลื่อนแถวคนดูขึ้น/ลงให้ยืนบนพื้นของภาพได้ (pic.floor = -300..200 px)
      get rows() {
        const base = hud().rows || ROWS; // ธีมภาพสำเร็จรูปกำหนดแถวให้ตรงพื้นในภาพเองได้
        const dy = Number(hud().pic?.img && hud().pic.floor) || 0;
        return dy ? base.map((r) => ({ ...r, y: r.y + dy })) : base;
      },
      get css() {
        return css(id);
      },
      // ธีมศาล (hud.kid): เด็กเดินเข้าทีละคน นั่งรวมกันจากแถวหน้า • ส่งของขวัญ = เดินไปไหว้หน้าศาล + กล้องซูมเข้า (stage.js kidOffer)
      get kid() {
        return hud().kid || null;
      },
      fanSvg(color, fid, api) {
        const body = hud().palette?.body || [color];
        if (hud().fan === 'kid' && window.StageKid) return window.StageKid.fan(fid); // ภาพวาดเด็กผมจุก (public/kid-fan.js)
        if (hud().fan === 'salah' && api.salahFan) return api.salahFan(color, fid);
        if (hud().fan === 'party' && api.partyFan) return api.partyFan(color, fid, { tops: hud().palette?.body });
        if (hud().fan === 'pew' && api.pewFan) return api.pewFan(color, fid, { shirtColor: (_c, h) => body[h % body.length] });
        if (hud().fan === 'kneel' && api.kneelFan) return api.kneelFan(color, fid, { shirtColor: (_c, h) => body[h % body.length], sabai: hud().palette?.sabai, sarongs: hud().palette?.sarong });
        return api.standingFan(color, fid, { legs: '#2a2438', shirtColor: (_c, h) => body[h % body.length] });
      },
      // พรีวิวหน้า "สร้างธีมเอง" (stage.js refreshTheme) — วาดแผงใหม่จาก meta ล่าสุด
      refresh(api) {
        if (el) render(api);
      },
      init(api) {
        el = document.createElement('div');
        el.className = 'hud';
        document.getElementById('ui').appendChild(el);
        render(api);
        const hy = document.getElementById('hype');
        if (hy && window.ResizeObserver) new ResizeObserver(() => placeRank()).observe(hy);
        // ม้านั่งโบสถ์: 1 ตัวต่อแถว วางทับครึ่งล่างของคนในแถว (z-index = แถว + 1 → อยู่หลังคนแถวถัดไป)
        if (hud().pews) {
          const crowd = document.getElementById('crowd');
          for (const r of T.rows) {
            const pw = document.createElement('div');
            pw.className = 'pew';
            const s = r.s;
            const pad = 44 * s;
            const hgt = 30 * s; // พนักพิงสูงถึงช่วงไหล่ของคนนั่ง
            pw.style.cssText = `--s:${s};left:${r.x0 - pad}px;width:${r.x1 - r.x0 + pad * 2}px;top:${r.y - hgt}px;height:${hgt + 4 * s}px;z-index:${Math.round(r.y) + 1}`;
            crowd?.appendChild(pw);
          }
        }
        // อิหม่ามนำละหมาด (hud.imam): นั่งหน้าแถวแรก หันไปทางมิห์รอบ
        let imamEl = null;
        if (hud().imam && api.salahFan) {
          const m = hud().imam;
          imamEl = document.createElement('div');
          imamEl.className = 'imam-fig';
          imamEl.style.cssText = `left:${m.x - 35 * m.s}px;top:${m.y - 116 * m.s}px;width:${70 * m.s}px;height:${116 * m.s}px;z-index:${Math.round(m.y)}`;
          imamEl.innerHTML = api.salahFan('#ffffff', 'imam', { imam: true });
          document.getElementById('crowd')?.appendChild(imamEl);
        }
        // วงดนตรีบนเวที (hud.band — ธีมรถแห่): นักร้อง กีตาร์ พิณ กลอง เล่นตามจังหวะ (public/band.js)
        if (hud().band && window.StageBand) window.StageBand.mount(document.getElementById('crowd'), hud().band, { host: api.t?.host || meta().defaults?.host });
        // ดีเจหลังบูธ + จอ LED (hud.dj — ธีมดีเจคลับ) • หน้าตาแผงแบบกระจกนีออน (hud.skin) (public/dj.js)
        // เด็กวัดถือกระบอกเซียมซีข้างโต๊ะบูชา (hud.kid.mascot — ธีมศาล)
        if (hud().kid && window.StageKid) window.StageKid.mount(document.getElementById('crowd'), hud().kid);
        // บรรยากาศต่อเนื่องของฉาก (scene-fx.js ambientSets — เช่น ศาลพระพิฆเนศ: ควันธูป กลีบดาวเรืองร่วง)
        if (hud().fxSet) window.SceneFX?.ambient?.(hud().fxSet, api);
        if (hud().dj && window.StageDJ) window.StageDJ.mount(document.getElementById('crowd'), hud().dj, { host: api.t?.host || meta().defaults?.host, skin: hud().skin });
        // ละหมาดพร้อมกัน: ทุกแถว (และอิหม่าม) ก้มลงพร้อมกันเป็นระยะ ~16 วินาที
        let tick = 0;
        setInterval(() => {
          if (document.hidden || hud().fan !== 'salah') return;
          if (++tick % 12 !== 0) return;
          api.crowdWave('bow');
          if (imamEl) {
            imamEl.classList.remove('bow');
            void imamEl.offsetWidth;
            imamEl.classList.add('bow');
          }
        }, 1300);
        // ท่านั่งไหว้พระ: สุ่มให้ 1-2 คนก้มกราบเองเป็นระยะ ฉากดูมีชีวิต
        setInterval(() => {
          if (document.hidden || !['kneel', 'pew', 'kid'].includes(hud().fan) || !api.fans?.size) return;
          const ids = [...api.fans.keys()];
          for (let i = 0; i < 1 + (ids.length > 20 ? 1 : 0); i++) api.bump(ids[(Math.random() * ids.length) | 0], 'bow', 1100);
        }, 1300);
        // แดนซ์หน้ารถแห่: สุ่ม 2-4 คนกระโดดสูงเองทุก ~1 จังหวะครึ่ง ฝูงคนดูดูมันส์ไม่หยุด
        setInterval(() => {
          if (document.hidden || hud().fan !== 'party' || !api.fans?.size) return;
          const ids = [...api.fans.keys()];
          const n = Math.min(ids.length, 2 + (ids.length > 15 ? 1 : 0) + (ids.length > 30 ? 1 : 0));
          for (let i = 0; i < n; i++) api.bump(ids[(Math.random() * ids.length) | 0], 'pjump', 640);
        }, 700);
        // ฝุ่นแสงลอย ๆ ให้ฉากมีชีวิต
        api.emitter(1e9, () => {
          if (Math.random() < 0.08) api.spawn({ type: 'glow', x: api.rand(0, 1080), y: api.rand(700, 1800), vy: api.rand(-30, -8), max: api.rand(1.5, 3), size: api.rand(1.5, 3), color: '#ffffff', twinkle: 5 });
        });
      },
      drawStatic(c) {
        if (hud().pic?.img && window.PicScene) return; // ฉากภาพ 2.5D วาดใน drawBg ทุกเฟรม
        // ฉากวาดละเอียดของแต่ละธีม (hud-scenes.js) — ธีมที่สร้างเองใช้ฉากของธีมต้นแบบ
        const sc = window.HUD_SCENES?.[meta().previewOf || id];
        if (sc) return sc.draw(c, hud().palette || {});
        const h = hud();
        const p = h.palette || {};
        let g = c.createLinearGradient(0, 0, 0, 880);
        g.addColorStop(0, p.sky);
        g.addColorStop(1, p.sky2);
        c.fillStyle = g;
        c.fillRect(0, 0, 1080, 880);
        for (const [x, y, w, hh, col, rad] of h.scene || []) {
          c.fillStyle = col;
          c.beginPath();
          c.roundRect(x * S, y * S, w * S, hh * S, rad * S);
          c.fill();
        }
        g = c.createLinearGradient(0, 880, 0, 1920);
        g.addColorStop(0, p.ground);
        g.addColorStop(1, p.ground2);
        c.fillStyle = g;
        c.fillRect(0, 880, 1080, 1040);
        c.fillStyle = 'rgba(0,0,0,.08)';
        c.beginPath();
        c.ellipse(540, 1370, 400, 150, 0, 0, Math.PI * 2);
        c.fill();
        // สายไฟหลอดกลมขึงเหนือลาน (โค้งลง)
        c.strokeStyle = 'rgba(40,30,20,.55)';
        c.lineWidth = 3;
        c.beginPath();
        for (let x = 0; x <= 1080; x += 20) {
          const y = 872 + Math.sin((x / 1080) * Math.PI) * 26;
          x ? c.lineTo(x, y) : c.moveTo(x, y);
        }
        c.stroke();
        const bulbs = [p.accent, p.accent2, '#ffffff'];
        for (let i = 0; i < 18; i++) {
          const x = 30 + i * 60;
          const y = 872 + Math.sin((x / 1080) * Math.PI) * 26 + 12;
          const gl = c.createRadialGradient(x, y, 0, x, y, 22);
          gl.addColorStop(0, 'rgba(255,240,200,.55)');
          gl.addColorStop(1, 'rgba(255,240,200,0)');
          c.fillStyle = gl;
          c.fillRect(x - 22, y - 22, 44, 44);
          c.fillStyle = bulbs[i % bulbs.length];
          c.beginPath();
          c.arc(x, y, 8, 0, Math.PI * 2);
          c.fill();
        }
      },
      drawBg(c, t) {
        if (hud().pic?.img && window.PicScene?.draw(c, t, hud().pic)) {
          window.SceneFX?.drawBack(c); // แสงที่องค์พระ/หน้าต่าง ลำแสง คลื่น (หลังคนดู)
          return;
        }
        const sc = window.HUD_SCENES?.[meta().previewOf || id];
        if (sc) return sc.anim?.(c, t);
        // เมฆ/แสงเคลื่อนช้า ๆ
        c.fillStyle = 'rgba(255,255,255,.18)';
        for (let i = 0; i < 4; i++) {
          const x = ((t / 60 + i * 300) % 1400) - 200;
          c.beginPath();
          c.ellipse(x, 120 + i * 140, 120, 34, 0, 0, Math.PI * 2);
          c.fill();
        }
        if (id === 'cafe') {
          c.strokeStyle = 'rgba(200,220,255,.35)';
          c.lineWidth = 2;
          for (let i = 0; i < 40; i++) {
            const x = (i * 97 + t / 3) % 460 + 60;
            const y = (i * 53 + t / 1.5) % 240 + 600;
            c.beginPath();
            c.moveTo(x, y);
            c.lineTo(x - 6, y + 22);
            c.stroke();
          }
        }
      },
      // ---------------- เอฟเฟกต์ของขวัญ (สร้างจากชนิดใน meta.effects)
      effects: new Proxy({}, {
        get(_o, key) {
          const fx = meta().effects?.[key];
          if (!fx) return undefined;
          return (user, n, label, api) => effect(fx, user, n, label, api, key);
        },
        has: (_o, key) => !!meta().effects?.[key],
        ownKeys: () => Object.keys(meta().effects || {}),
        getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
      }),
      onEvent(d, api) {
        if (d.type === 'hud') return updateHud(d, api);
        if (d.type === 'cmd') return onCmd(d, api);
        if (d.type === 'goal') {
          window.HUD_SCENES?.[meta().previewOf || id]?.onGoal?.(d);
          api.toast(`🎯 ${d.key === 'coins' ? 'เหรียญ' : 'ใจ'}ครบ${d.times > 1 ? ` ${d.times} รอบ` : ''}! → ${d.reward}`, 'big');
          const fx = meta().effects?.[d.effect];
          if (fx) effect(fx, null, 1, d.reward, api, d.effect);
          api.speak(`เป้าหมายครบแล้ว ${d.reward}`);
        }
      },
      onTop(list) {
        lastTop = list;
        renderPodium();
      },
    };

    function effect(fx, user, n, label, api, key) {
      if (hud().dj) window.StageDJ?.hype(key === 'g9' ? 6500 : 2500);
      if (hud().band) window.StageBand?.hype(key === 'g9' ? 6500 : key === 'g8' || key === 'g7' || key === 'g6' ? 3500 : 2000); // วงเล่นมันส์ขึ้นตามของขวัญ
      // ธีมภาพสำเร็จรูป: เอฟเฟกต์วาดเองของฉากนั้น (scene-fx.js) แทนการโปรยไอคอน
      if (hud().fxSet && key && window.SceneFX?.play(hud().fxSet, key, api, user, n, label || fx.label)) return;
      const o = api.originFor(user);
      const e = fx.emoji || '✨';
      const calm = !!hud().calm; // ธีมสถานที่ศักดิ์สิทธิ์: ไม่ให้คนดูเต้น ไม่จุดพลุ ใช้แสงนวล ๆ แทน
      if (fx.kind === 'shower') {
        api.emitter(2600, () => {
          if (Math.random() < 0.5) emojiParticle(api, e, api.rand(0, 1080), -40, { vx: api.rand(-30, 30), vy: api.rand(160, 320), g: 120, max: 6 });
        });
        api.sfx.chime(784);
      } else if (fx.kind === 'burst') {
        for (let i = 0; i < 10 + Math.min(n, 5) * 2; i++) emojiParticle(api, e, o.x, o.y - 40, { vx: api.rand(-300, 300), vy: api.rand(-520, -200), g: 600, max: 1.6 });
        api.sfx.pop();
      } else if (fx.kind === 'spot') {
        window.PicScene?.kick();
        api.spot(user, { rgb: '255,240,200', fallback: { x: 540, y: 1350 } });
        for (let i = 0; i < 12; i++) emojiParticle(api, e, o.x, o.y - 60, { vx: api.rand(-200, 200), vy: api.rand(-420, -200), g: 400, max: 2 });
        api.sfx.chime(660);
      } else if (fx.kind === 'parade') {
        api.crowdWave(calm ? 'happy' : 'hdance');
        api.emitter(2200, () => {
          if (Math.random() < 0.4) emojiParticle(api, e, api.rand(0, 1080), -40, { vx: api.rand(-30, 30), vy: api.rand(200, 340), g: 100, max: 5 });
        });
        api.sfx.cheer?.();
      } else if (fx.kind === 'fireworks') {
        window.PicScene?.kick();
        if (calm) glowRain(api, e, 2600);
        else api.fireworks(6);
      } else if (fx.kind === 'big') {
        window.PicScene?.kick();
        api.bigShow(user, label || fx.label);
        if (calm) {
          api.crowdWave('happy');
          glowRain(api, '✨', 4000);
        } else api.fireworks(8);
        api.emitter(4000, () => {
          if (Math.random() < 0.6) emojiParticle(api, e, api.rand(0, 1080), -40, { vx: api.rand(-40, 40), vy: api.rand(200, 360), g: 120, max: 6 });
        });
      }
    }

    function onCmd(d, api) {
      window.HUD_SCENES?.[meta().previewOf || id]?.onCmd?.(d);
      const p = api.fanPos(d.id);
      const x = p ? p.x : api.rand(200, 880);
      const y = p ? p.y - 70 : 1500;
      // ทั้งลานกระโดดพร้อมกัน (คำสั่ง "ดรอป" ธีมดีเจ) — กันพิมพ์รัว: อย่างมากทุก 2.5 วินาที
      if (d.kind === 'wave' && !hud().calm) {
        if (Date.now() - (T._wave || 0) > 2500) {
          T._wave = Date.now();
          api.crowdWave('wave');
          window.StageDJ?.hype(1800);
        }
        emojiParticle(api, d.emoji || '🙌', x, y, { vx: 0, vy: -160, g: 0, max: 1.4, size: 56 });
      } else if (d.kind === 'dance' && !hud().calm) {
        api.bump(d.id, 'hdance', 2700);
        for (let i = 0; i < 6; i++) emojiParticle(api, d.emoji || '🎵', x, y, { vx: api.rand(-120, 120), vy: api.rand(-300, -160), g: 200, max: 1.6, size: 40 });
      } else {
        // ธีมที่มีท่าคำสั่งของตัวเอง (scene-fx.js cmdSets — เช่น ศาล: สาธุ = ลำแสงรับพร) ไม่ต้องลอยอีโมจิ
        if (!(hud().fxSet && window.SceneFX?.cmd?.(hud().fxSet, d, api))) emojiParticle(api, d.emoji || '✨', x, y, { vx: 0, vy: -160, g: 0, max: 1.4, size: 56 });
        if (d.zone) {
          const z = el?.querySelector(`[data-zone="${d.zone}"]`);
          if (z) {
            z.classList.remove('on');
            void z.offsetWidth;
            z.classList.add('on');
          }
        }
      }
      const cmdEl = el?.querySelector(`.sign[data-cmd="${CSS.escape(d.cmd)}"], .sp-cmd[data-cmd="${CSS.escape(d.cmd)}"]`);
      if (cmdEl) {
        cmdEl.classList.remove('on');
        void cmdEl.offsetWidth;
        cmdEl.classList.add('on');
      }
    }

    const RING = 2 * Math.PI * 60; // เส้นรอบวงของวงแหวน (r = 60)
    const fmtN = (n) => (n >= 10000 ? (n / 1000).toFixed(n >= 100000 ? 0 : 1) + 'k' : String(n));
    function render(api) {
      const h = hud();
      const m = meta();
      // แผงพลังคนดูถูกย้ายเข้าป้ายศาลไว้ → เอากลับที่เดิมก่อนวาดใหม่ (ไม่งั้นหายไปกับ innerHTML)
      const hy = document.getElementById('hype');
      if (hy && el.contains(hy)) document.getElementById('ui')?.appendChild(hy);
      if (h.ui === 'shrine') return renderShrine(api);
      el.className = 'hud';
      const t = api.t || {};
      const gifts = (t.gifts || m.defaults?.gifts || []).slice(0, 9);
      const fx = m.effects || {};
      const ringCol = [h.palette?.accent || '#ffb84d', h.palette?.accent2 || '#ff6f9c'];
      const zoneEmoji = (zid) => (h.cmds || []).find((c) => c.zone === zid)?.emoji || '📍';
      const items = gifts.map((g) => `<span class="it">${window.giftIconHtml?.(g.name, fx[g.effect]?.icon || '🎁') || esc(fx[g.effect]?.icon || '🎁')} ${window.giftIcon?.(g.name) ? '' : esc(g.name) + ' '}→ <b>${esc(fx[g.effect]?.label || '')}</b></span>`);
      if (h.tap) items.push(`<span class="it">✨ ${esc(h.tap)}</span>`);
      el.innerHTML = `
        <div class="ttl"><div class="ico">${esc(m.icon || '🎪')}</div><div style="min-width:0"><b>${esc(t.title || m.defaults?.title)}</b><small>${esc(t.subtitle || m.defaults?.subtitle || '')}</small></div></div>
        <div class="host"><i>${esc(h.role)}</i><span>${esc(t.host || m.defaults?.host || '')}</span></div>
        <div class="rings">${(h.goals || [])
          .map(
            (g, i) => `<div class="ring" data-goal="${i}"><div class="dial"><svg viewBox="0 0 150 150"><circle class="bg" cx="75" cy="75" r="60"/><circle class="fg" cx="75" cy="75" r="60" style="stroke:${ringCol[i]}"/></svg>
              <div class="num"><b>0%</b><small>0/${fmtN(g.max)}</small></div></div><div class="cap">${esc(g.label)} → <em>${esc(g.reward)}</em></div></div>`,
          )
          .join('')}</div>
        <div class="hrank hpanel"><h4>🏆 ${esc(h.podiumTitle)}</h4><div class="rows"></div></div>
        <div class="signs"><h4>⌨️ พิมพ์ในคอมเมนต์ได้เลย</h4>${(h.cmds || [])
          .map((c) => `<div class="sign" data-cmd="${esc(c.c)}"><div class="em">${esc(c.emoji || '✨')}</div><div style="min-width:0"><b>${esc(c.c)}</b><small>${esc(c.a)}</small></div></div>`)
          .join('')}</div>
        <div class="zbox hpanel"><h4>📍 ลานกิจกรรม</h4>${(h.zones || [])
          .map((z) => `<div class="zone" data-zone="${esc(z.id)}"><span class="em">${esc(zoneEmoji(z.id))}</span><span>${esc(z.label)}</span><b>0</b></div>`)
          .join('')}<div class="lead">${esc(h.boardTitle)}: ยังไม่มีใครเล่น</div></div>
        <div class="tick"><div class="run">${items.join('')}${items.join('')}</div></div>`;
      applyLayout(h.layout);
      renderPodium();
    }

    // หน้าตาแบบศาล (แบบ A ที่ผู้ใช้เลือก): ป้ายไม้แกะสลักสองฝั่ง กลางจอเว้นให้เห็นองค์เทพเต็ม ๆ
    function renderShrine(api) {
      const h = hud();
      const m = meta();
      const t = api.t || {};
      const gifts = (t.gifts || m.defaults?.gifts || []).slice(0, 9);
      const fx = m.effects || {};
      const title = t.title || m.defaults?.title || m.name || '';
      const sub = t.subtitle || m.defaults?.subtitle || '';
      el.className = 'hud ui-shrine';
      const rows = gifts
        .map((g) => {
          const e = fx[g.effect] || {};
          const icon = window.giftIcon?.(g.name);
          const gi = icon ? window.giftIconHtml(g.name) : esc(e.icon || '🎁');
          const big = /^g[789]$/.test(g.effect || '');
          return `<div class="sp-g${big ? ' big' : ''}" data-gift="${esc(String(g.name || '').toLowerCase())}"><div class="gi">${gi}</div><span class="ar">➜</span><div class="fx">${esc(e.label || '')}${icon ? '' : `<small>${esc(g.name)}</small>`}</div></div>`;
        })
        .join('');
      const goals = (h.goals || [])
        .map((g, i) => `<div class="sp-goal" data-goal="${i}"><div class="row"><b>${esc(fx[g.effect]?.icon || '🎯')} ${esc(g.reward)}</b><span>0/${fmtN(g.max)} ${esc(g.label)}</span></div><div class="sp-bar"><i></i></div></div>`)
        .join('');
      const cmds = (h.cmds || [])
        .slice(0, 4)
        .map((c) => `<div class="sp-cmd" data-cmd="${esc(c.c)}"${c.zone ? ` data-zone="${esc(c.zone)}"` : ''}><b>${esc(c.emoji || '✨')} ${esc(c.c)}</b><span class="zc">${esc(c.a)}</span></div>`)
        .join('');
      el.innerHTML = `
        <div class="sp-plate sp-title"><b class="${title.length > 14 ? 'long' : ''}">${esc(title)}</b>${sub ? `<span>${esc(sub)}</span>` : ''}</div>
        <div class="sp-plate sp-gifts"><div class="sp-rib">ถวายของ ได้บุญ</div>${h.kid?.mascot ? '<div class="note">🎋 ทุกชิ้นได้เสี่ยงเซียมซี 1 ใบ</div>' : ''}${rows}</div>
        <div class="sp-right">
          <div class="sp-plate sp-goals"><div class="sp-rib">เป้าบุญรวม</div>${goals}<div class="hy"></div></div>
          <div class="sp-plate sp-host"><div class="sp-rib">เจ้าภาพวันนี้</div><div class="rows"></div></div>
          ${cmds ? `<div class="sp-plate sp-cmds"><div class="sp-rib">พิมพ์ในแชท</div>${cmds}</div>` : ''}
        </div>`;
      const hy = document.getElementById('hype');
      if (hy) el.querySelector('.sp-goals .hy').appendChild(hy);
      renderPodium();
    }

    // แผงพลังคนดู (#hype) สูงขึ้นเมื่อมีภารกิจ/แชร์/ฉากถัดไป → เลื่อนแผงอันดับลงไม่ให้ทับกัน (ยกเว้นตำแหน่งที่ลากวางเอง)
    function placeRank() {
      const rank = el?.querySelector('.hrank');
      const hy = document.getElementById('hype');
      if (!rank || !hy || hud().layout?.blocks?.hrank?.y !== undefined) return;
      const bottom = hy.offsetParent ? hy.offsetTop + hy.offsetHeight : 0;
      rank.style.top = Math.max(356, bottom + 14) + 'px';
    }

    // เลย์เอาต์ที่ลากวางเอง: ย้าย/ย่อขยาย/ซ่อน/เปลี่ยนสีแต่ละแผง + สติกเกอร์ (ไม่มี = ตำแหน่งปกติของ CSS)
    function applyLayout(L) {
      const blocks = L?.blocks || {};
      for (const k of ['ttl', 'host', 'rings', 'hrank', 'signs', 'zbox', 'tick', 'hype']) {
        const node = k === 'hype' ? document.getElementById('hype') : el.querySelector('.' + k);
        if (!node) continue;
        const b = blocks[k] || {};
        const st = node.style;
        const full = k === 'tick'; // แถบวิ่งกว้างเต็มจอ: ย้ายได้แค่ขึ้นลง
        st.left = b.x !== undefined && !full ? b.x + 'px' : '';
        st.top = b.y !== undefined ? b.y + 'px' : '';
        if (b.x !== undefined && !full) st.right = 'auto';
        else st.right = '';
        if (b.y !== undefined) st.bottom = 'auto';
        else st.bottom = '';
        st.transform = b.s && b.s !== 1 && !full ? `scale(${b.s})` : '';
        st.transformOrigin = b.s && b.s !== 1 ? '0 0' : '';
        st.zIndex = b.z ? String(b.z) : '';
        st.display = b.hide ? 'none' : '';
        for (const v of ['--hud-accent', '--hud-accent2']) (b.c ? node.style.setProperty(v, b.c) : node.style.removeProperty(v));
      }
      placeRank();
      el.querySelectorAll('.stk').forEach((n) => n.remove());
      (L?.stickers || []).forEach((s, i) => {
        const n = document.createElement('div');
        n.className = 'stk';
        n.dataset.i = i;
        n.textContent = s.v;
        n.style.cssText = `left:${s.x}px;top:${s.y}px;font-size:${Math.round((s.k === 'text' ? 64 : 110) * (s.s || 1))}px;color:${s.c || '#fff'};z-index:${s.z ?? 5}`;
        el.appendChild(n);
      });
    }

    function renderPodium() {
      const box = el?.querySelector('.hrank .rows, .sp-host .rows');
      if (!box) return;
      const top = lastTop.slice(0, 3);
      if (hud().ui === 'shrine') {
        box.innerHTML = top.length
          ? top
              .map((u, i) => {
                const av = u.avatar ? `<img src="${esc(u.avatar)}" alt="" referrerpolicy="no-referrer">` : esc((u.name || '?').trim().charAt(0));
                return `<div class="r"><div class="md">${['👑', '🥈', '🥉'][i]}</div><div class="av">${av}</div><div class="nm">${esc(u.name)}</div><div class="pt">🪙 ${fmtN(Number(u.diamonds || 0))}</div></div>`;
              })
              .join('')
          : '<div class="empty">ส่งของขวัญชิ้นแรก<br>เป็นเจ้าภาพคนแรกเลย!</div>';
        return;
      }
      if (!top.length) {
        box.innerHTML = '<div class="empty">ส่งของขวัญชิ้นแรก ขึ้นทำเนียบเลย!</div>';
        return;
      }
      const medal = ['🥇', '🥈', '🥉'];
      box.innerHTML = top
        .map((u, i) => {
          const av = u.avatar ? `<img src="${esc(u.avatar)}" alt="" referrerpolicy="no-referrer">` : esc((u.name || '?').trim().charAt(0));
          return `<div class="r"><div class="md">${medal[i]}</div><div class="av">${av}</div><div class="nm"><span>${esc(u.name)}</span><small>💎 ${Number(u.diamonds || 0).toLocaleString('en-US')}</small></div></div>`;
        })
        .join('');
    }

    function updateHud(d) {
      if (!el) return;
      const h = hud();
      (d.goals || []).forEach((g, i) => {
        const node = el.querySelector(`[data-goal="${i}"]`);
        if (!node) return;
        const pct = Math.min(100, Math.round((g.cur / g.max) * 100));
        const fg = node.querySelector('.fg');
        if (fg) {
          fg.style.strokeDashoffset = String(RING * (1 - pct / 100));
          node.querySelector('.num').innerHTML = `<b>${pct}%</b><small>${fmtN(g.cur)}/${fmtN(g.max)}${g.done ? ` • ครบ ${g.done}` : ''}</small>`;
        } else {
          // แบบศาล: แถบตรง + ตัวเลข
          node.querySelector('.sp-bar i').style.width = pct + '%';
          node.querySelector('.row span').textContent = `${fmtN(g.cur)}/${fmtN(g.max)} ${h.goals?.[i]?.label || ''}`;
        }
        if (g.done && node.dataset.done !== String(g.done)) {
          node.dataset.done = String(g.done);
          node.classList.remove('pop');
          void node.offsetWidth;
          node.classList.add('pop');
        }
      });
      for (const z of h.zones || []) {
        const n = d.zones?.[z.id] || 0;
        const zc = el.querySelector(`.sp-cmd[data-zone="${z.id}"] .zc`);
        if (zc) {
          if (n) zc.textContent = (z.stat || '{n}').replace('{n}', n.toLocaleString('en-US'));
          continue;
        }
        const node = el.querySelector(`[data-zone="${z.id}"] b`);
        if (node) node.textContent = (d.zones?.[z.id] || 0).toLocaleString('en-US');
      }
      const lead = el.querySelector('.zbox .lead');
      if (lead) {
        lead.textContent = d.zboard?.length
          ? `${h.boardTitle}: ${d.zboard.map((r, i) => `${['🥇', '🥈', '🥉'][i]} ${r.n} ${r.s}`).join('  ')}`
          : `${h.boardTitle}: ยังไม่มีใครเล่น`;
      }
      // มงกุฎที่แลกแต้มมา
      for (const fid of d.crowned || []) window.__stage?.api?.bump?.(fid, 'crowned', 6 * 3600_000);
    }

    return T;
  };
})();
