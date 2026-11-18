/* ตัวละครภาพวาด 2D (ธีมศาล) — เด็กไทยผมจุก จากภาพที่ผู้ใช้วาดด้วย AI (public/kid/*.png)
 *  - คนดู: เดินเข้าฉาก (ภาพเดิน 2 ท่าสลับกัน) → ย่อตัวนั่งพนมมือ (ภาพนั่ง) • ขยับด้วย CSS ทั้งตัว (stage.html .kid)
 *  - สีเสื้อ/โจงกระเบนต่างกันทุกคน: เลื่อนสีเฉพาะพิกเซลเสื้อส้ม/ผ้าม่วง แล้วเก็บผลไว้ใช้ซ้ำ (35 แบบ)
 *  - เด็กวัดถือกระบอกเซียมซี (มาสคอต): ยืนข้างโต๊ะบูชา • ของขวัญ = เขย่ากระบอก + ใบเซียมซีของคนส่ง
 *  ใช้: hud.fan = 'kid' และ hud.kid = { mascot: { x, y, s } } (scenethemes.js)
 */
(() => {
  const SRC = { walk1: '/kid/walk1.png', walk2: '/kid/walk2.png', kneel: '/kid/kneel.png', front: '/kid/front.png' };
  const VEST = [0, 0, -22, 36, 118, 185, 255]; // เลื่อนสีจากเสื้อส้มเดิม (0 = สีเดิม)
  const PANTS = [0, -40, -80, 120, 160]; // เลื่อนสีจากโจงกระเบนม่วงเดิม
  const IMG = {};
  let loadP = null;
  let ready = false;
  const cache = new Map();

  const hash = (s) => {
    let h = 2166136261;
    for (const ch of String(s)) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
    return h >>> 0;
  };
  function load() {
    loadP ||= Promise.all(
      Object.entries(SRC).map(
        ([k, src]) =>
          new Promise((r) => {
            const i = new Image();
            i.onload = () => r((IMG[k] = i));
            i.onerror = () => r(null);
            i.src = src;
          }),
      ),
    ).then(() => {
      ready = Object.keys(SRC).every((k) => IMG[k]);
      // คนที่เข้ามาก่อนภาพโหลดเสร็จใช้สีเดิมไปก่อน → เปลี่ยนเป็นสีของตัวเอง
      if (ready) for (const el of document.querySelectorAll('.kid[data-h]')) paint(el, Number(el.dataset.h));
    });
    return loadP;
  }

  function rgb2hsv(r, g, b) {
    const mx = Math.max(r, g, b);
    const d = mx - Math.min(r, g, b);
    let h = 0;
    if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
    return [h, mx ? d / mx : 0, mx / 255];
  }
  function hsv2rgb(h, s, v) {
    h = ((h % 360) + 360) % 360;
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
  }
  function tint(name, vest, pants) {
    const key = `${name}|${vest}|${pants}`;
    if (cache.has(key)) return cache.get(key);
    if (!ready) return SRC[name];
    if (!vest && !pants) {
      cache.set(key, SRC[name]);
      return SRC[name];
    }
    const src = IMG[name];
    const c = document.createElement('canvas');
    c.width = src.width;
    c.height = src.height;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(src, 0, 0);
    const im = x.getImageData(0, 0, c.width, c.height);
    const d = im.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 8) continue;
      const [h, s, v] = rgb2hsv(d[i], d[i + 1], d[i + 2]);
      let nh = null;
      // เสื้อ: ส้มอมแดงสด (ผิว/แก้มชมพูอิ่มตัวน้อยกว่า ไม่โดน) • ผ้า: ม่วงน้ำเงิน
      if (vest && (h < 26 || h > 345) && s > 0.42 && v > 0.55) nh = h + vest;
      else if (pants && h > 205 && h < 285 && s > 0.12) nh = h + pants;
      if (nh === null) continue;
      const [r, g, b] = hsv2rgb(nh, s, v);
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
    }
    x.putImageData(im, 0, 0);
    const url = c.toDataURL('image/png');
    cache.set(key, url);
    return url;
  }
  const look = (h) => [VEST[h % VEST.length], PANTS[(h >>> 4) % PANTS.length]];
  function paint(el, h) {
    const [v, p] = look(h);
    for (const img of el.querySelectorAll('img[data-k]')) img.src = tint(img.dataset.k, v, p);
  }

  // HTML ของคนดู 1 คน (ใส่ใน .fan .body) — ท่าเดิน/นั่ง สลับด้วยคลาสของ .fan (enter / talk / bow / happy / wave / leave)
  function fan(id) {
    load();
    const h = hash(id);
    const [v, p] = look(h);
    return `<div class="kid" data-h="${h}"><div class="kwalk"><img data-k="walk1" class="kw1" src="${tint('walk1', v, p)}" alt=""><img data-k="walk2" class="kw2" src="${tint('walk2', v, p)}" alt=""></div><img data-k="kneel" class="kkn" src="${tint('kneel', v, p)}" alt=""></div>`;
  }

  // ---------------------------------------------------------------- เด็กวัดถือกระบอกเซียมซี
  const FORTUNE = [
    ['การงาน', 'งานที่ทำอยู่จะมีคนเห็นฝีมือ ผู้ใหญ่ช่วยหนุน'],
    ['การงาน', 'เรื่องที่ติดขัดจะคลี่คลาย ลงมือได้เลย'],
    ['การงาน', 'มีโอกาสใหม่เข้ามา รับไว้แล้วจะไปได้ดี'],
    ['การเงิน', 'เงินเข้าหลายทาง ค้าขายคล่องมือ'],
    ['การเงิน', 'ของที่ตั้งใจจะได้สมหวัง อย่าใช้เงินเกินตัว'],
    ['การเงิน', 'มีโชคจากคนรอบข้าง เก็บออมไว้จะงอกเงย'],
    ['ความรัก', 'คนใกล้ตัวคิดถึงอยู่ ทักไปก่อนได้เลย'],
    ['ความรัก', 'ความรักอบอุ่นมั่นคง คนรอบข้างเมตตา'],
    ['ความรัก', 'คนโสดมีเกณฑ์เจอคนถูกใจ'],
    ['สุขภาพ', 'ร่างกายแข็งแรงขึ้น เรื่องกังวลจะเบาลง'],
    ['สุขภาพ', 'พักผ่อนให้พอ แล้วทุกอย่างจะดีขึ้นเอง'],
    ['โชคลาภ', 'สิ่งศักดิ์สิทธิ์คุ้มครอง สิ่งไม่ดีผ่านพ้นไป'],
    ['โชคลาภ', 'ขอสิ่งใดด้วยใจบริสุทธิ์ จะสมหวังดังตั้งใจ'],
    ['โชคลาภ', 'บ้านร่มเย็น มีเรื่องดีเข้ามาไม่ขาดสาย'],
  ];
  let mascot = null;
  let cardEl = null;
  let cardUntil = 0;
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  function mount(crowd, o = {}) {
    load();
    unmount();
    const m = o.mascot;
    if (!crowd || !m) return;
    const s = m.s || 1;
    mascot = document.createElement('div');
    mascot.className = 'kid-mascot';
    mascot.style.cssText = `left:${m.x}px;top:${m.y}px;z-index:${Math.round(m.y)};--ms:${s}`;
    mascot.innerHTML = `<div class="km-body"><img src="${SRC.front}" alt=""></div><div class="km-stick"></div>`;
    crowd.appendChild(mascot);
    cardEl = document.createElement('div');
    cardEl.className = 'kid-card';
    cardEl.style.top = (o.cardY || 760) + 'px';
    (document.getElementById('ui') || crowd).appendChild(cardEl); // อยู่บนสุด เหนือป้าย/แผงต่าง ๆ
  }
  function unmount() {
    mascot?.remove();
    cardEl?.remove();
    mascot = cardEl = null;
  }
  // ของขวัญเข้ามา: เขย่ากระบอก → ไม้เซียมซีกระเด็น → ใบคำทำนายของคนส่ง (ครั้งละใบ ไม่ซ้อนกัน)
  const pend = [];
  function gift(d) {
    if (!mascot?.isConnected) return;
    const t = Date.now();
    if (t < cardUntil) {
      if (pend.length < 4) pend.push(d); // ใบก่อนหน้ายังขึ้นอยู่ → รอคิว
      return;
    }
    const b = mascot.querySelector('.km-body');
    b.classList.remove('shake');
    void b.offsetWidth;
    b.classList.add('shake');
    cardUntil = t + 5200;
    setTimeout(() => pend.length && gift(pend.shift()), 5260);
    const n = 1 + Math.floor(Math.random() * 28);
    const [topic, text] = FORTUNE[Math.floor(Math.random() * FORTUNE.length)];
    setTimeout(() => {
      if (!mascot?.isConnected) return;
      const st = mascot.querySelector('.km-stick');
      st.classList.remove('fly');
      void st.offsetWidth;
      st.classList.add('fly');
      cardEl.innerHTML = `<div class="kc-n">เซียมซีใบที่ ${n}</div><div class="kc-who">ของ ${esc(d?.user?.name || 'คนใจบุญ')}</div><div class="kc-t"><b>${topic}</b> ${esc(text)}</div>`;
      cardEl.classList.remove('show');
      void cardEl.offsetWidth;
      cardEl.classList.add('show');
    }, 1000);
  }

  window.StageKid = { fan, mount, unmount, gift, load };
})();
