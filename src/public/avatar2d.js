/* ตัวละคร 2D วาดลายเส้นแบนสไตล์เดียวกับฉาก (ไม่ต้องใช้ไฟล์โมเดล ไม่มีเรื่องลิขสิทธิ์)
 * - แต่งตัว/หน้าตา/บุคลิกตามธีม เช่น ไหว้ศาล = มัคทายกสูงวัย ชุดขาว ผมขาว แว่น หนวด ผ้าพาดบ่า
 * - ขยับ: หายใจ กะพริบตา มองไปมา ปากขยับตามเสียง + ท่าทาง (ไหว้ โบกมือ ให้พร ปรบมือ ฯลฯ)
 * - ใช้ API เดียวกับตัวละคร 3D (window.StageAvatar2D) → stage.js สลับได้ทันที
 */
(() => {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const bell = (t, a, b) => Math.sin(clamp((t - a) / (b - a), 0, 1) * Math.PI);
  const D = Math.PI / 180;

  // ---------------------------------------------------------------- ชุด + หน้าตาแต่ละธีม
  const SKIN = '#efc39c';
  const LOOKS = {
    // มัคทายก: สูงวัย ชุดขาว ผมขาวหวีเรียบ แว่น หนวด ผ้าขาวพาดบ่า
    shrine: {
      persona: 'elder', age: 'old', skin: '#e8b994', hair: '#e4e2dc', hairStyle: 'elder', brow: '#c9c6bd',
      shirt: '#fbf9f3', shirtLine: '#d8d2c2', collar: 'thai', sleeve: 'long', pants: '#f3f0e6', shoes: '#4a3424',
      acc: ['glasses', 'mustache', 'sash', 'wrinkles', 'buttons'],
    },
    // ลอยกระทง: หนุ่มชุดไทย เสื้อพระราชทานสีครีม โจงกระเบนแดง ถือกระทง
    krathong: {
      persona: 'krathong', skin: SKIN, hair: '#2a1d18', hairStyle: 'short', brow: '#2a1d18',
      shirt: '#f3e6c4', shirtLine: '#cdb98a', collar: 'thai', sleeve: 'long', pants: '#8a1f2a', pantsStyle: 'wide', shoes: '#3a2a22',
      acc: ['buttons', 'krathong'],
    },
    // ตกปลา: หมวกสาน เสื้อลายสก๊อต ผ้าขาวม้าพันคอ คันเบ็ด
    fishing: {
      skin: '#e2ae84', hair: '#2b2018', hairStyle: 'short', brow: '#2b2018',
      shirt: '#4b7a9a', shirtLine: '#2e5470', pattern: 'plaid', collar: 'shirt', sleeve: 'rolled', pants: '#6b5a3a', shoes: '#3a3a3a',
      acc: ['strawHat', 'pakama', 'rod'],
    },
    // สงกรานต์: เสื้อลายดอก กางเกงขาสั้น แว่นกันแดด ปืนฉีดน้ำ
    songkran: {
      skin: SKIN, hair: '#3a2418', hairStyle: 'spiky', brow: '#3a2418',
      shirt: '#2fa8e0', shirtLine: '#1d7fb0', pattern: 'floral', collar: 'open', sleeve: 'short', pants: '#d9c7a0', pantsStyle: 'shorts', shoes: '#f2f2f2',
      acc: ['sunglasses', 'waterGun'],
    },
    // ตรุษจีน: เสื้อจีนแดงคอจีน กระดุมทอง หมวกแก๊ปจีน
    cny: {
      skin: SKIN, hair: '#1a1410', hairStyle: 'short', brow: '#1a1410',
      shirt: '#c0141e', shirtLine: '#8a0c14', pattern: 'coins', collar: 'mandarin', sleeve: 'long', pants: '#1a1a1a', shoes: '#111',
      acc: ['chineseCap', 'frogButtons'],
    },
    // บ้านผีสิง: นักล่าผี เสื้อฮู้ดเข้ม ไฟฉาย
    ghost: {
      skin: '#e6c0a0', hair: '#141418', hairStyle: 'messy', brow: '#141418',
      shirt: '#2b3348', shirtLine: '#1a2030', collar: 'hood', sleeve: 'long', pants: '#25252c', shoes: '#1a1a1a',
      acc: ['flashlight'],
    },
    // ปีใหม่: ชุดแดงขอบขาว หมวกซานต้า
    newyear: {
      skin: SKIN, hair: '#3a2a20', hairStyle: 'short', brow: '#3a2a20',
      shirt: '#c8202a', shirtLine: '#8e141c', collar: 'furTrim', sleeve: 'long', pants: '#b01c24', shoes: '#1a1a1a',
      acc: ['santaHat', 'belt'],
    },
    // คอนเสิร์ต: นักร้อง แจ็กเก็ตดำกากเพชร เสื้อในชมพู ไมค์
    concert: {
      skin: SKIN, hair: '#5a2a6a', hairStyle: 'idol', brow: '#3a1a40',
      shirt: '#1c1a26', shirtLine: '#0c0a12', pattern: 'sparkle', inner: '#ff4fa3', collar: 'jacket', sleeve: 'long', pants: '#141218', shoes: '#222',
      acc: ['mic'],
    },
  };
  const THEME_LAYOUT = {
    shrine: { x: 800, y: 1700, h: 560 },
    krathong: { x: 790, y: 1660, h: 560 },
    fishing: { x: 290, y: 1560, h: 600 },
    songkran: { x: 760, y: 1720, h: 580 },
    cny: { x: 780, y: 1690, h: 560 },
    ghost: { x: 760, y: 1700, h: 580 },
    newyear: { x: 790, y: 1720, h: 580 },
    concert: { x: 540, y: 1720, h: 620 },
    // ธีมสวนสัตว์: คุณครูยืนมุมซ้าย
    sea: { x: 980, y: 1500, h: 330 },
    dino: { x: 980, y: 1500, h: 330 },
    safari: { x: 980, y: 1500, h: 330 },
    rainforest: { x: 980, y: 1500, h: 330 },
    nightzoo: { x: 980, y: 1500, h: 330 },
    mookata: { x: 960, y: 1660, h: 330 },
    adventure: { x: 960, y: 1660, h: 330 },
    boatrace: { x: 960, y: 1660, h: 330 },
    angler: { x: 960, y: 1660, h: 330 },
    village: { x: 960, y: 1660, h: 330 },
    pixelquiz: { x: 960, y: 1660, h: 330 },
    kitchen: { x: 960, y: 1660, h: 330 },
    castle: { x: 960, y: 1660, h: 330 },
    // ธีมเวที: พิธีกรยืนข้างเวที
    ramwong: { x: 110, y: 1300, h: 330 },
    pageant: { x: 960, y: 1230, h: 330 },
    molam: { x: 110, y: 1300, h: 330 },
    disco: { x: 960, y: 1300, h: 330 },
    // ธีมสัตว์เลี้ยง: ยืนมุมขวาล่าง ไม่บังน้องกลางจอ
    cat: { x: 905, y: 1660, h: 470 },
    shiba: { x: 905, y: 1660, h: 470 },
    bunny: { x: 905, y: 1660, h: 470 },
    hamster: { x: 905, y: 1660, h: 470 },
    penguin: { x: 905, y: 1660, h: 470 },
    panda: { x: 905, y: 1660, h: 470 },
    capybara: { x: 905, y: 1660, h: 470 },
    hippo: { x: 905, y: 1660, h: 470 },
    elephant: { x: 905, y: 1660, h: 470 },
    duckling: { x: 905, y: 1660, h: 470 },
  };
  const ALIAS = { temple: 'shrine', floating: 'krathong', nightmarket: 'concert', muay: 'concert', beach: 'songkran', farm: 'shrine', cafe: 'concert', school: 'songkran', cat: 'fishing', shiba: 'fishing', bunny: 'fishing', hamster: 'fishing', penguin: 'fishing', panda: 'fishing', capybara: 'fishing', hippo: 'fishing', elephant: 'fishing', duckling: 'fishing' };
  const HALF_LAYOUT = { x: 330, y: 1960, h: 980 };

  // ---------------------------------------------------------------- ท่าทาง
  // แขนแต่ละข้าง [ต้นแขน, ปลายแขน] = องศาจากแนวดิ่งลง (+ = กางออกด้านข้าง, - = เข้าหาลำตัว, 180 = ชี้ขึ้น)
  // hand: รูปมือ • lean: ก้มตัว • tilt: เอียงคอ • nod: ก้มหน้า • face: สีหน้า
  const REST = { R: [10, 4], L: [10, 4], hand: { R: 'relax', L: 'relax' } };
  const PERSONA = {
    young: { speed: 1, rest: REST, idle: ['tilt', 'look', 'peace', 'stretch', 'tilt'] },
    elder: {
      speed: 0.7, calm: true, hunch: 1,
      rest: { R: [-6, -31], L: [-6, -31], hand: { R: 'clasp', L: 'clasp' } },
      idle: ['nod', 'wai', 'look', 'nod', 'bless'],
      map: { join: 'nod', giftS: 'wai', giftM: 'bow', giftL: 'bless', giftXL: 'bless', follow: 'wai', win: 'nod', game: 'think', big: 'bless', hello: 'wai', laugh: 'nod', love: 'bless', regular: 'bless' },
    },
    krathong: {
      speed: 0.9,
      rest: { R: [-8, -42], L: [-8, -42], hand: { R: 'hold', L: 'hold' } },
      idle: ['tilt', 'look', 'wai', 'nod'],
      map: { giftS: 'wai', follow: 'wai', giftM: 'bow', join: 'nod', hello: 'wai', regular: 'wai' },
    },
  };
  const POSES = {
    wave: { dur: 2.6, face: 'happy', pose: (t) => ({ R: [112, 182 + Math.sin(t * 9) * 22], hand: { R: 'open' }, tilt: -5 }) },
    wai: { dur: 2.8, face: 'calm', pose: (t) => ({ R: [-24, -156], L: [-24, -156], hand: { R: 'wai', L: 'wai' }, nod: bell(t, 0.5, 2.2) * 9, lean: bell(t, 0.5, 2.2) * 4 }) },
    bow: { dur: 2.4, face: 'happy', pose: (t) => ({ R: [-6, -40], L: [-6, -40], hand: { R: 'flat', L: 'flat' }, nod: bell(t, 0.3, 2) * 12, lean: bell(t, 0.3, 2) * 9 }) },
    nod: { dur: 1.8, face: 'calm', pose: (t) => ({ nod: Math.max(0, Math.sin(t * 7)) * 7 * bell(t, 0, 1.8) }) },
    bless: { dur: 3, face: 'calm', pose: (t) => ({ R: [26, 176], hand: { R: 'palm' }, nod: bell(t, 0.8, 2.6) * 5 }) },
    clap: {
      dur: 2.4, face: 'happy',
      pose: (t) => {
        const c = (Math.sin(t * 14) + 1) / 2;
        return { R: [-14, -128 + c * 22], L: [-14, -128 + c * 22], hand: { R: 'flat', L: 'flat' }, nod: Math.sin(t * 7) * 2 };
      },
    },
    happy: { dur: 2.4, face: 'joy', hop: (t) => Math.max(0, Math.sin(t * Math.PI * 2.5)) * 6 * (1 - t / 2.4), pose: (t) => ({ R: [145 + Math.sin(t * 7) * 8, 165], L: [145 - Math.sin(t * 7) * 8, 165], hand: { R: 'open', L: 'open' } }) },
    heart: { dur: 2.8, face: 'joy', pose: (t) => ({ R: [150, 238], L: [150, 238], hand: { R: 'flat', L: 'flat' }, tilt: Math.sin(t * 3) * 6 }) },
    think: { dur: 2.6, face: 'think', pose: () => ({ R: [-28, -162], hand: { R: 'fist' }, tilt: 8 }) },
    kiss: { dur: 2.6, face: 'wink', pose: (t) => { const o = ease(clamp((t - 0.9) / 0.5, 0, 1)); return { R: [-28 + o * 90, -162 + o * 250], hand: { R: 'flat' }, tilt: 6 }; } },
    surprised: { dur: 2.4, face: 'wow', hop: (t) => bell(t, 0, 0.35) * 5, pose: () => ({ R: [-30, -168], L: [-30, -168], hand: { R: 'open', L: 'open' } }) },
    peace: { dur: 2.6, face: 'joy', pose: () => ({ R: [-20, -165], hand: { R: 'peace' }, tilt: 10 }) },
    shy: { dur: 2.6, face: 'shy', pose: (t) => ({ R: [-8, -36], L: [-8, -36], hand: { R: 'clasp', L: 'clasp' }, nod: 6, tilt: Math.sin(t * 2) * 6 }) },
    dance: {
      dur: 6, face: 'joy', beat: true,
      hop: (t, b) => Math.abs(Math.sin(b * Math.PI)) * 4,
      pose: (t, b) => {
        const s = Math.sin(b * Math.PI);
        return { R: [40 + Math.max(0, s) * 110, 120 + Math.max(0, s) * 60], L: [40 + Math.max(0, -s) * 110, 120 + Math.max(0, -s) * 60], hand: { R: 'fist', L: 'fist' }, sway: s * 5, tilt: s * 6 };
      },
    },
    spin: { dur: 1.8, face: 'joy', pose: (t) => ({ R: [70, 80], L: [70, 80], hand: { R: 'open', L: 'open' }, sway: Math.sin(t * 9) * 6, squash: Math.abs(Math.sin(t * 3.5)) }) },
    scared: { dur: 2.4, face: 'wow', pose: (t) => ({ R: [-28, -160], L: [-28, -160], hand: { R: 'fist', L: 'fist' }, sway: Math.sin(t * 40) * 1.2 }) },
    splash: { dur: 2, face: 'joy', pose: (t) => { const f = ease(clamp((t - 0.6) / 0.25, 0, 1)) * (1 - clamp((t - 1.4) / 0.5, 0, 1)); return { R: [30 + f * 70, 40 + f * 60], L: [30 + f * 70, 40 + f * 60], hand: { R: 'open', L: 'open' } }; } },
    cheer: { dur: 2.4, face: 'joy', hop: (t) => Math.max(0, Math.sin(t * Math.PI * 3)) * 4, pose: (t) => ({ R: [150 + Math.max(0, Math.sin(t * Math.PI * 3)) * 15, 175], hand: { R: 'fist' } }) },
    // ท่าว่าง
    tilt: { dur: 2.4, idle: true, face: 'happy', pose: (t) => ({ tilt: 10 * bell(t, 0, 2.4) }) },
    look: { dur: 3.4, idle: true, look: (t) => (t < 1.6 ? -0.9 : 0.9), pose: () => ({}) },
    stretch: { dur: 3.2, idle: true, face: 'calm', pose: (t) => { const w = bell(t, 0, 3.2); return { R: [10 + w * 150, 4 + w * 175], L: [10 + w * 150, 4 + w * 175], hand: { R: 'open', L: 'open' } }; } },
  };
  const DEFAULT_MAP = { join: 'wave', giftS: 'heart', giftM: 'clap', giftL: 'surprised', giftXL: 'dance', follow: 'bow', win: 'clap', game: 'think', big: 'dance', regular: 'bow', hello: 'wave', laugh: 'happy', love: 'heart' };
  const THEME_MAP = { krathong: { giftS: 'wai', follow: 'wai' }, songkran: { giftM: 'splash' }, ghost: { giftS: 'shy', game: 'scared' }, newyear: { giftM: 'cheer' } };

  // ---------------------------------------------------------------- ลวดลายผ้า (สร้างครั้งเดียว)
  const patterns = {};
  function patternFor(g, kind, base) {
    const key = kind + base;
    if (patterns[key]) return patterns[key];
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    x.fillStyle = base;
    x.fillRect(0, 0, 64, 64);
    if (kind === 'plaid') {
      x.fillStyle = 'rgba(20,40,60,.45)';
      x.fillRect(0, 0, 64, 18);
      x.fillRect(0, 0, 18, 64);
      x.fillStyle = 'rgba(230,240,245,.5)';
      x.fillRect(0, 30, 64, 3);
      x.fillRect(30, 0, 3, 64);
    } else if (kind === 'floral') {
      for (const [fx, fy, col] of [[14, 14, '#ffd23f'], [46, 40, '#ff6b8a'], [44, 10, '#fff'], [12, 48, '#ff8a3d']]) {
        x.fillStyle = '#2f9e5a';
        x.beginPath();
        x.ellipse(fx + 7, fy + 3, 7, 3, 0.5, 0, 7);
        x.fill();
        x.fillStyle = col;
        for (let p = 0; p < 5; p++) {
          const a = (p / 5) * Math.PI * 2;
          x.beginPath();
          x.arc(fx + Math.cos(a) * 4, fy + Math.sin(a) * 4, 3.4, 0, 7);
          x.fill();
        }
        x.fillStyle = '#ffe9a0';
        x.beginPath();
        x.arc(fx, fy, 1.8, 0, 7);
        x.fill();
      }
    } else if (kind === 'coins') {
      x.strokeStyle = '#e8b830';
      x.lineWidth = 2;
      for (const [cx, cy] of [[16, 16], [48, 48]]) {
        x.beginPath();
        x.arc(cx, cy, 8, 0, 7);
        x.stroke();
        x.strokeRect(cx - 2.5, cy - 2.5, 5, 5);
      }
    } else if (kind === 'sparkle') {
      for (let i = 0; i < 40; i++) {
        x.fillStyle = ['#fff', '#ff8fd0', '#9fe7ff', '#ffd23f'][i % 4];
        x.globalAlpha = 0.5 + Math.random() * 0.5;
        x.fillRect(Math.random() * 64, Math.random() * 64, 1.4, 1.4);
      }
    }
    const pat = g.createPattern(c, 'repeat');
    pat.setTransform(new DOMMatrix([0.3, 0, 0, 0.3, 0, 0])); // ลายเล็กพอดีตัว (1 ลาย ≈ 19 หน่วย)
    patterns[key] = pat;
    return pat;
  }

  // ---------------------------------------------------------------- engine
  class Avatar2D {
    constructor() {
      this.cfg = { enabled: false, x: 540, y: 1700, h: 560, theme: 'shrine', map: {}, bpm: 100 };
      this.actions = [];
      this.queue = [];
      this.mouth = 0;
      this.mouthNow = 0;
      this.mouthAt = 0;
      this.extMouth = 0;
      this.extMouthAt = 0;
      this.speaking = false;
      this.look = { x: 0, y: 0, until: 0 };
      this.lx = 0;
      this.ly = 0;
      this.blinkT = -1;
      this.nextBlink = 2;
      this.nextIdle = 6;
      // เดินไปมาในฉาก (เฉพาะมุมเต็มตัว): wx = ระยะจากจุดยืน (px บนเวที)
      this.wx = 0;
      this.wTarget = 0;
      this.walkPh = 0;
      this.walkW = 0;
      this.nextWalk = rand(10, 18);
      this.cur = null; // ท่าปัจจุบัน (ผสมแล้ว)
      this.mounted = false;
      this.T = 0;
      this.last = 0;
    }

    mount(scene, before, frontParent, frontBefore) {
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'avatar2d';
      this.canvas.style.cssText = 'position:absolute;pointer-events:none;display:none;';
      this.slots = { back: [scene, before || null], front: [frontParent || scene, frontBefore || null] };
      scene.insertBefore(this.canvas, before || null);
      this.layer = 'back';
      this.ctx = this.canvas.getContext('2d');
      this.mounted = true;
      const loop = (t) => {
        requestAnimationFrame(loop);
        if (!this.cfg.enabled) return;
        if (t - this.last < 1000 / (this.cfg.fps || 30) - 2) return;
        const dt = Math.min(0.1, (t - (this.last || t)) / 1000);
        this.last = t;
        this.step(dt);
        if (this.wx !== this.wxShown) {
          this.wxShown = this.wx;
          this.canvas.style.left = Math.round(this.cfg.x + this.wx - this.W / 2) + 'px';
        }
        this.draw();
      };
      requestAnimationFrame(loop);
    }

    set(cfg) {
      Object.assign(this.cfg, cfg);
      if (!this.canvas) return;
      const { enabled, x, y, h, framing } = this.cfg;
      this.canvas.style.display = enabled ? '' : 'none';
      const half = framing === 'half';
      // หน่วยภาพ: ตัวละครสูง 176 หน่วย (เท้า y=0 ถึงยอดผม -176) • ครึ่งตัว = แสดงตั้งแต่สะโพก (-70) ขึ้นไป
      const units = half ? 116 : 176;
      this.s = h / units;
      this.W = Math.round(h * (half ? 1.05 : 0.86));
      this.H = Math.round(h * (half ? 1.12 : 1.16));
      this.baseY = half ? this.H + 70 * this.s : this.H - 4 * this.s;
      const pr = clamp((window.devicePixelRatio || 1) * 1.5, 1, 3); // ลายเส้นคมชัด
      if (this.canvas.width !== Math.round(this.W * pr) || this.canvas.height !== Math.round(this.H * pr)) {
        this.canvas.width = Math.round(this.W * pr);
        this.canvas.height = Math.round(this.H * pr);
      }
      this.pr = pr;
      this.canvas.style.width = this.W + 'px';
      this.canvas.style.height = this.H + 'px';
      this.canvas.style.left = Math.round(x + this.wx - this.W / 2) + 'px';
      this.wxShown = this.wx;
      this.canvas.style.top = Math.round(y - this.H * (half ? 1 : 0.985)) + 'px';
      const layer = this.cfg.front ? 'front' : 'back';
      if (layer !== this.layer) {
        const [p, b] = this.slots[layer];
        p.insertBefore(this.canvas, b);
        this.canvas.style.zIndex = layer === 'front' ? '6' : '';
        this.layer = layer;
      }
      this.look2 = LOOKS[this.cfg.outfit || this.cfg.theme] || LOOKS[ALIAS[this.cfg.theme]] || LOOKS.shrine;
      this.persona = PERSONA[this.look2.persona] || PERSONA.young;
      if (!this.greeted && enabled) {
        this.greeted = true;
        this.play(this.persona.calm ? 'nod' : 'wave');
      }
    }

    // ---------------- คำสั่ง (เหมือนตัวละคร 3D)
    busy() {
      return this.actions.some((a) => !a.idle && a.t < a.dur - 0.4);
    }
    play(name, opts = {}) {
      const P = POSES[name];
      if (!P) return;
      if (!P.idle) for (const a of this.actions) if (a.idle) a.dur = Math.min(a.dur, a.t + 0.3);
      if (this.busy()) {
        if (opts.queue !== false && this.queue.length < 2 && this.queue[this.queue.length - 1] !== name) this.queue.push(name);
        return;
      }
      this.actions.push({ name, t: 0, dur: opts.dur || P.dur, idle: !!P.idle });
    }
    react(kind) {
      const user = Object.fromEntries(Object.entries(this.cfg.map || {}).filter(([, v]) => v && !String(v).startsWith('file:')));
      const m = { ...DEFAULT_MAP, ...(THEME_MAP[this.cfg.theme] || {}), ...(this.persona?.map || {}), ...user };
      const n = m[kind];
      if (n && n !== 'none') this.play(n, { queue: kind !== 'join' && kind !== 'game' });
    }
    // ตำแหน่งหัว (พิกัดบนเวที 1080x1920) — ใช้วางบอลลูนคำพูด
    headPos() {
      if (!this.canvas || !this.cfg.enabled || !this.s) return null;
      const { x, y, framing } = this.cfg;
      const top = y - this.H * (framing === 'half' ? 1 : 0.985);
      return { x: x + this.wx, y: top + this.baseY - (172 - (this.persona?.hunch || 0) * 2) * this.s };
    }
    lookAt(px, py, sec = 2.5) {
      const { x, y, h } = this.cfg;
      this.look = { x: clamp((px - x - this.wx) / 500, -1, 1), y: clamp((y - h * 0.9 - py) / 700, -0.6, 0.6), until: performance.now() + sec * 1000 };
    }
    setMouth(v) {
      this.mouth = clamp(v, 0, 1);
      this.mouthAt = performance.now();
    }
    setExternalMouth(v) {
      this.extMouth = clamp(v, 0, 1);
      this.extMouthAt = performance.now();
    }
    setSpeaking(on) {
      this.speaking = on;
      if (!on) this.mouth = 0;
    }

    // ---------------- คำนวณท่าแต่ละเฟรม
    step(dt) {
      this.T += dt;
      const T = this.T;
      const PS = this.persona || PERSONA.young;
      // ท่าว่าง
      if (!this.busy() && !this.actions.length && !this.speaking && !this.queue.length) {
        this.nextIdle -= dt;
        if (this.nextIdle <= 0) {
          this.nextIdle = rand(7, 14);
          const n = pick(PS.idle || PERSONA.young.idle);
          this.actions.push({ name: n, t: 0, dur: POSES[n].dur, idle: true });
        }
      }
      const rest = PS.rest || REST;
      const cur = { R: [...rest.R], L: [...rest.L], hand: { ...rest.hand }, tilt: 0, nod: 0, lean: 0, sway: 0, hop: 0, squash: 0, face: PS.calm ? 'calm' : 'smile' };
      // หายใจ/โยกตัว
      cur.breath = Math.sin(T * (PS.calm ? 1.2 : 1.6));
      cur.sway += Math.sin(T * 0.5) * 1.2;
      cur.R[0] += cur.breath * 1.2;
      cur.L[0] += cur.breath * 1.2;
      let lookOverride = null;
      for (const a of this.actions) {
        a.t += dt * (PS.speed || 1);
        const P = POSES[a.name];
        const w = ease(Math.min(a.t / 0.35, (a.dur - a.t) / 0.45, 1));
        const beats = (a.t * (this.cfg.bpm || 100)) / 60;
        const p = P.pose(a.t, beats);
        for (const side of ['R', 'L']) if (p[side]) cur[side] = cur[side].map((v, i) => v + (p[side][i] - v) * w);
        for (const k of ['tilt', 'nod', 'lean', 'sway', 'squash']) if (p[k] != null) cur[k] += p[k] * w;
        if (p.hand) for (const side of ['R', 'L']) if (p.hand[side] && w > 0.35) cur.hand[side] = p.hand[side];
        if (P.face && w > 0.3) cur.face = P.face;
        if (P.hop && !PS.calm) cur.hop += P.hop(a.t, beats) * w;
        if (P.look) lookOverride = P.look(a.t) * w;
      }
      this.actions = this.actions.filter((a) => a.t < a.dur);
      if (this.queue.length && !this.busy()) this.play(this.queue.shift(), { queue: false });
      if (PS.calm && (cur.face === 'joy' || cur.face === 'wink')) cur.face = 'happy';
      // เดินไปมา: ว่าง ๆ ก็เดินเล่นในระยะสั้น ๆ รอบจุดยืน (ทำท่า/พูดอยู่ = หยุดเดิน)
      const canWalk = this.cfg.wander !== false && this.cfg.framing !== 'half';
      if (!canWalk) this.wx = this.wTarget = 0;
      const still = this.busy() || this.speaking || this.queue.length > 0;
      if (canWalk && !still) {
        this.nextWalk -= dt;
        if (this.nextWalk <= 0) {
          const range = (this.cfg.h || 560) * 0.24;
          this.nextWalk = rand(14, 28);
          this.wTarget = Math.abs(this.wx) > range * 0.4 && Math.random() < 0.6 ? 0 : rand(-range, range);
          // ไม่เดินจนตกขอบจอ
          const m = (this.W || 400) * 0.36;
          this.wTarget = clamp(this.wTarget, m - this.cfg.x, 1080 - m - this.cfg.x);
        }
      }
      const wdx = this.wTarget - this.wx;
      const walking = canWalk && !still && Math.abs(wdx) > 1.5;
      if (walking) {
        const sp = (PS.calm ? 34 : 58) * (PS.speed || 1) * ((this.cfg.h || 560) / 560);
        this.wx += Math.sign(wdx) * Math.min(Math.abs(wdx), sp * dt);
        this.walkPh += dt * (PS.calm ? 5.5 : 7.5);
      }
      this.walkW += ((walking ? 1 : 0) - this.walkW) * Math.min(1, dt * 6);
      cur.walkPh = this.walkPh;
      cur.walkW = this.walkW;
      cur.hop += Math.abs(Math.sin(this.walkPh)) * 1.4 * this.walkW;
      // มอง
      const now = performance.now();
      let lx, ly;
      if (now < this.look.until) {
        lx = this.look.x;
        ly = this.look.y;
      } else {
        lx = Math.sin(T * 0.23) * 0.35 + Math.sin(T * 0.71) * 0.1;
        ly = Math.sin(T * 0.31) * 0.1;
      }
      if (lookOverride != null) lx = lookOverride;
      if (walking) lx = Math.sign(wdx) * 0.75;
      this.lx += (lx - this.lx) * Math.min(1, dt * 4);
      this.ly += (ly - this.ly) * Math.min(1, dt * 4);
      // กะพริบตา
      this.nextBlink -= dt;
      if (this.nextBlink <= 0 && this.blinkT < 0) this.blinkT = 0;
      cur.blink = 0;
      if (this.blinkT >= 0) {
        this.blinkT += dt;
        cur.blink = Math.sin(clamp(this.blinkT / 0.15, 0, 1) * Math.PI);
        if (this.blinkT >= 0.15) {
          this.blinkT = -1;
          this.nextBlink = Math.random() < 0.15 ? 0.25 : rand(2, 5.5);
        }
      }
      // ปาก
      const ext = now - this.extMouthAt < 300 ? this.extMouth : 0;
      let m = Math.max(this.mouth, ext);
      if (this.speaking && !ext && !(now - this.mouthAt < 300)) m = (Math.sin(T * 17) * 0.5 + 0.5) * 0.7;
      if (!this.speaking && !(now - this.mouthAt < 300)) m = ext;
      this.mouthNow += (m - this.mouthNow) * Math.min(1, dt * 18);
      cur.mouth = this.mouthNow;
      cur.talkNod = this.mouthNow * Math.sin(T * 9) * 1.5;
      this.cur = cur;
    }

    // ---------------- วาด
    draw() {
      const g = this.ctx;
      const c = this.cur;
      if (!g || !c) return;
      const L = this.look2;
      const s = this.s * this.pr;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, this.canvas.width, this.canvas.height);
      g.setTransform(s, 0, 0, s, (this.W / 2) * this.pr, this.baseY * this.pr);
      g.lineJoin = 'round';
      g.lineCap = 'round';
      const OUT = 'rgba(40,26,22,0.85)';
      const LW = 1.5;
      const hunch = this.persona?.hunch || 0;
      const lean = c.lean + hunch * 2;
      // ตำแหน่งข้อต่อ (y ลง = บวก, เท้าที่ y=0)
      const hop = -c.hop;
      const sx = c.sway;
      const hipY = -80 + hop + lean * 0.2;
      const shY = -130 + hop + lean + c.breath * 0.4;
      const neckY = shY - 6;
      const headY = neckY - 14 + c.nod * 0.6;
      const headX = sx * 1.2 + this.lx * 2;

      // ---- เงาใต้เท้า
      g.fillStyle = 'rgba(0,0,0,0.28)';
      g.beginPath();
      g.ellipse(0, 1, 30, 5, 0, 0, 7);
      g.fill();

      // ---- ขา + รองเท้า
      const legW = L.pantsStyle === 'wide' ? 14 : 10;
      for (const side of [-1, 1]) {
        const hx = side * 8.5 + sx * 0.3;
        // ก้าวขา (ตอนเดิน): ยกเท้าสลับซ้ายขวา
        const ph = (c.walkPh || 0) + (side > 0 ? 0 : Math.PI);
        const ww = c.walkW || 0;
        g.save();
        g.translate(Math.cos(ph) * 2.2 * ww, -Math.max(0, Math.sin(ph)) * 5 * ww);
        if (L.pantsStyle === 'wide') {
          // โจงกระเบน: กางเกงพองถึงเข่า + น่อง
          g.fillStyle = L.pants;
          g.strokeStyle = OUT;
          g.lineWidth = LW;
          g.beginPath();
          g.moveTo(hx - side * 6, hipY);
          g.quadraticCurveTo(hx + side * 13, hipY + 22, hx + side * 6, -30);
          g.lineTo(hx - side * 5, -30);
          g.closePath();
          g.fill();
          g.stroke();
          capsule(g, hx, -32, hx, -6, 4.2, L.skin, OUT, LW);
        } else if (L.pantsStyle === 'shorts') {
          capsule(g, hx, hipY + 2, hx, -44, legW / 2 + 1, L.pants, OUT, LW);
          capsule(g, hx, -46, hx, -6, 4.2, L.skin, OUT, LW);
        } else {
          capsule(g, hx, hipY + 2, hx, -6, legW / 2, L.pants, OUT, LW);
        }
        g.fillStyle = L.shoes;
        g.strokeStyle = OUT;
        g.beginPath();
        g.ellipse(hx + side * 2, -3, 7.5, 3.8, 0, 0, 7);
        g.fill();
        g.stroke();
        g.restore();
      }

      // ---- ลำตัว (เสื้อ)
      const torso = () => {
        g.beginPath();
        g.moveTo(-21 + sx * 0.6, shY + 2);
        g.quadraticCurveTo(0, shY - 3, 21 + sx * 0.6, shY + 2);
        g.lineTo(18.5 + sx * 0.3, hipY + 13);
        g.quadraticCurveTo(0, hipY + 16, -18.5 + sx * 0.3, hipY + 13);
        g.closePath();
      };
      g.lineWidth = LW;
      g.strokeStyle = OUT;
      torso();
      g.fillStyle = L.pattern ? patternFor(g, L.pattern, L.shirt) : L.shirt;
      g.fill();
      // เงาด้านข้างลำตัว
      g.save();
      torso();
      g.clip();
      g.fillStyle = 'rgba(0,0,0,0.08)';
      g.fillRect(8, shY - 5, 20, 80);
      g.restore();
      torso();
      g.stroke();
      this.drawCollar(g, L, shY, hipY, sx, OUT, LW);

      // ---- แขน (หลัง → หน้า: ซ้ายของตัวละครอยู่ฝั่งขวาจอ)
      const arm = (side, key) => {
        const [a1, af] = c[key];
        const shx = side * 20 + sx * 0.6;
        const sh = { x: shx, y: shY + 4 };
        const el = { x: sh.x + side * Math.sin(a1 * D) * 27, y: sh.y + Math.cos(a1 * D) * 27 };
        const ha = { x: el.x + side * Math.sin(af * D) * 25, y: el.y + Math.cos(af * D) * 25 };
        const sleeveEnd = L.sleeve === 'short' ? 0.45 : L.sleeve === 'rolled' ? 0.75 : 1;
        capsule(g, sh.x, sh.y, el.x, el.y, 5.4, L.pattern ? patternFor(g, L.pattern, L.shirt) : L.shirt, OUT, LW);
        if (L.sleeve === 'short') {
          capsule(g, lerp(sh.x, el.x, 0.5), lerp(sh.y, el.y, 0.5), el.x, el.y, 4.3, L.skin, OUT, LW);
          capsule(g, el.x, el.y, ha.x, ha.y, 4.2, L.skin, OUT, LW);
        } else {
          const cut = { x: lerp(el.x, ha.x, sleeveEnd), y: lerp(el.y, ha.y, sleeveEnd) };
          if (sleeveEnd < 1) capsule(g, cut.x, cut.y, ha.x, ha.y, 4.2, L.skin, OUT, LW);
          capsule(g, el.x, el.y, cut.x, cut.y, 5, L.pattern ? patternFor(g, L.pattern, L.shirt) : L.shirt, OUT, LW);
          // ข้อมือเสื้อ
          g.fillStyle = L.collar === 'furTrim' ? '#fff' : L.shirtLine;
          g.beginPath();
          g.arc(cut.x, cut.y, 4.6, 0, 7);
          g.fill();
        }
        this.drawHand(g, ha, Math.atan2(ha.y - el.y, ha.x - el.x), c.hand[key], side, L, OUT);
        return ha;
      };
      // มือที่ประสาน/ไหว้ต้องวาดทับกันให้ดูซ้อน
      const handR = arm(-1, 'R');
      const handL = arm(1, 'L');

      // ---- พร็อพที่ถือ
      this.drawHeld(g, L, handR, handL, c, OUT, LW);

      // ---- คอ + หัว
      capsule(g, headX * 0.4, neckY + 6, headX * 0.6, neckY - 2, 5.2, L.skin, OUT, LW);
      g.save();
      g.translate(headX, headY);
      g.rotate((c.tilt + c.sway * 0.5) * D);
      this.drawHead(g, L, c, OUT, LW);
      g.restore();
    }

    drawCollar(g, L, shY, hipY, sx, OUT, LW) {
      g.lineWidth = LW;
      g.strokeStyle = OUT;
      const cx = sx * 0.6;
      if (L.collar === 'thai' || L.collar === 'mandarin') {
        // คอตั้งแบบเสื้อไทย/จีน + แนวกระดุมกลาง
        g.fillStyle = L.shirt;
        g.beginPath();
        g.roundRect(cx - 7, shY - 6, 14, 6, 2);
        g.fill();
        g.stroke();
        g.strokeStyle = L.shirtLine;
        g.beginPath();
        g.moveTo(cx, shY);
        g.lineTo(cx * 0.6, hipY + 14);
        g.stroke();
        if (L.acc.includes('buttons') || L.acc.includes('frogButtons')) {
          g.fillStyle = L.acc.includes('frogButtons') ? '#e8b830' : '#c9a24a';
          for (let i = 0; i < 5; i++) {
            const y = shY + 6 + i * 9.5;
            g.beginPath();
            g.arc(cx - i * 0.15, y, L.acc.includes('frogButtons') ? 1.8 : 1.3, 0, 7);
            g.fill();
            if (L.acc.includes('frogButtons')) g.fillRect(cx - 4, y - 0.5, 8, 1);
          }
        }
      } else if (L.collar === 'shirt' || L.collar === 'open') {
        g.fillStyle = L.collar === 'open' ? L.skin : L.shirt;
        g.beginPath();
        g.moveTo(cx - 6, shY - 2);
        g.lineTo(cx, shY + 9);
        g.lineTo(cx + 6, shY - 2);
        g.closePath();
        g.fill();
        g.fillStyle = L.shirtLine;
        for (const side of [-1, 1]) {
          g.beginPath();
          g.moveTo(cx + side * 2, shY - 3);
          g.lineTo(cx + side * 9, shY - 1);
          g.lineTo(cx + side * 3, shY + 9);
          g.closePath();
          g.fill();
          g.stroke();
        }
      } else if (L.collar === 'hood') {
        g.fillStyle = L.shirtLine;
        g.beginPath();
        g.ellipse(cx, shY - 1, 13, 5, 0, 0, 7);
        g.fill();
        g.stroke();
        g.strokeStyle = '#d8d8e0';
        for (const side of [-1, 1]) {
          g.beginPath();
          g.moveTo(cx + side * 4, shY + 2);
          g.lineTo(cx + side * 4.5, shY + 16);
          g.stroke();
        }
        g.strokeStyle = OUT;
        g.beginPath();
        g.roundRect(cx - 10, hipY - 18, 20, 12, 3); // กระเป๋าหน้า
        g.stroke();
      } else if (L.collar === 'furTrim') {
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.roundRect(cx - 12, shY - 5, 24, 7, 3);
        g.fill();
        g.stroke();
        g.fillRect(cx - 1.8, shY + 2, 3.6, hipY - shY - 4);
        if (L.acc.includes('belt')) {
          g.fillStyle = '#1a1a1a';
          g.fillRect(cx - 17, hipY - 8, 34, 6);
          g.fillStyle = '#e8c040';
          g.fillRect(cx - 4, hipY - 9, 8, 8);
        }
      } else if (L.collar === 'jacket') {
        g.fillStyle = L.inner;
        g.beginPath();
        g.moveTo(cx - 7, shY - 2);
        g.lineTo(cx + 7, shY - 2);
        g.lineTo(cx + 3, hipY + 2);
        g.lineTo(cx - 3, hipY + 2);
        g.closePath();
        g.fill();
        g.fillStyle = L.shirtLine;
        for (const side of [-1, 1]) {
          g.beginPath();
          g.moveTo(cx + side * 6, shY - 3);
          g.lineTo(cx + side * 13, shY + 2);
          g.lineTo(cx + side * 5, shY + 28);
          g.closePath();
          g.fill();
          g.stroke();
        }
      }
      // ผ้าขาวพาดบ่า: จากบ่าซ้าย (ฝั่งขวาจอ) ลงสะโพกขวา
      if (L.acc.includes('sash')) {
        g.fillStyle = '#fffdf6';
        g.strokeStyle = 'rgba(150,140,120,.9)';
        g.beginPath();
        g.moveTo(cx + 12, shY - 1);
        g.lineTo(cx + 20, shY + 3);
        g.quadraticCurveTo(cx + 2, shY + 30, cx - 12, hipY + 13);
        g.lineTo(cx - 19, hipY + 9);
        g.quadraticCurveTo(cx - 4, shY + 26, cx + 12, shY - 1);
        g.closePath();
        g.fill();
        g.stroke();
        g.strokeStyle = 'rgba(200,170,90,.8)'; // ขอบดิ้นทองบาง ๆ
        g.lineWidth = 0.7;
        g.beginPath();
        g.moveTo(cx + 18, shY + 4);
        g.quadraticCurveTo(cx + 0, shY + 30, cx - 16, hipY + 10);
        g.stroke();
      }
      // ผ้าขาวม้าพันคอ
      if (L.acc.includes('pakama')) {
        g.fillStyle = patternFor(g, 'plaid', '#c0272d');
        g.strokeStyle = OUT;
        g.lineWidth = LW;
        g.beginPath();
        g.ellipse(cx, shY - 2, 11, 5, 0, 0, 7);
        g.fill();
        g.stroke();
        g.beginPath();
        g.roundRect(cx + 3, shY + 1, 7, 20, 2);
        g.fill();
        g.stroke();
      }
    }

    drawHand(g, p, ang, shape, side, L, OUT) {
      g.save();
      g.translate(p.x, p.y);
      g.rotate(ang - Math.PI / 2);
      g.fillStyle = L.skin;
      g.strokeStyle = OUT;
      g.lineWidth = 1.3;
      if (shape === 'fist' || shape === 'hold' || shape === 'clasp') {
        g.beginPath();
        g.ellipse(0, 3, 4.6, 4.2, 0, 0, 7);
        g.fill();
        g.stroke();
      } else if (shape === 'peace') {
        g.beginPath();
        g.ellipse(0, 3, 4.4, 4, 0, 0, 7);
        g.fill();
        g.stroke();
        for (const dx of [-1.6, 1.6]) {
          capsule(g, dx, 4, dx * 2.2, 13, 1.25, L.skin, OUT, 1.1);
        }
      } else if (shape === 'point') {
        g.beginPath();
        g.ellipse(0, 3, 4.4, 4, 0, 0, 7);
        g.fill();
        g.stroke();
        capsule(g, 0, 4, 0, 12, 1.3, L.skin, OUT, 1.1);
      } else {
        // มือแบ (open/flat/palm/wai/relax): ฝ่ามือ + นิ้วรวบ
        const open = shape === 'open' || shape === 'palm';
        g.beginPath();
        g.roundRect(-4.2, -0.5, 8.4, open ? 12 : 11, 3.5);
        g.fill();
        g.stroke();
        if (open) {
          g.strokeStyle = 'rgba(60,40,30,.45)';
          for (const dx of [-1.6, 0.6, 2.6]) {
            g.beginPath();
            g.moveTo(dx, 6);
            g.lineTo(dx, 11);
            g.stroke();
          }
        }
        // นิ้วโป้ง
        g.fillStyle = L.skin;
        g.strokeStyle = OUT;
        g.beginPath();
        g.ellipse(side * -4.2, 4, 1.8, 3.2, side * 0.4, 0, 7);
        g.fill();
        g.stroke();
      }
      g.restore();
    }

    drawHeld(g, L, hR, hL, c, OUT, LW) {
      g.lineWidth = LW;
      g.strokeStyle = OUT;
      if (L.acc.includes('krathong')) {
        // กระทงใบตองระหว่างสองมือ
        const x = (hR.x + hL.x) / 2;
        const y = Math.max(hR.y, hL.y) + 2;
        g.fillStyle = '#3f8a3a';
        g.beginPath();
        g.ellipse(x, y + 2, 15, 4.5, 0, 0, 7);
        g.fill();
        g.stroke();
        for (let i = 0; i < 7; i++) {
          const px = x - 12 + i * 4;
          g.fillStyle = i % 2 ? '#ffffff' : '#f6a6c8';
          g.beginPath();
          g.moveTo(px - 3, y);
          g.quadraticCurveTo(px, y - 14, px + 3, y);
          g.closePath();
          g.fill();
          g.stroke();
        }
        g.fillStyle = '#fff2d0';
        g.fillRect(x - 0.8, y - 16, 1.6, 10);
        g.fillStyle = '#ffb030';
        g.beginPath();
        g.ellipse(x, y - 19 + Math.sin(this.T * 12) * 0.4, 1.6, 3, 0, 0, 7);
        g.fill();
      }
      if (L.acc.includes('rod')) {
        g.strokeStyle = '#6a4a2a';
        g.lineWidth = 2.2;
        g.beginPath();
        g.moveTo(hR.x, hR.y + 4);
        g.lineTo(hR.x - 44, hR.y - 95);
        g.stroke();
        g.strokeStyle = 'rgba(240,240,240,.6)';
        g.lineWidth = 0.5;
        g.beginPath();
        g.moveTo(hR.x - 44, hR.y - 95);
        g.quadraticCurveTo(hR.x - 60, hR.y - 40, hR.x - 58, hR.y + 10);
        g.stroke();
        g.fillStyle = '#333';
        g.beginPath();
        g.arc(hR.x - 2, hR.y - 2, 2.6, 0, 7);
        g.fill();
      }
      if (L.acc.includes('waterGun')) {
        g.fillStyle = '#ff7a1a';
        g.beginPath();
        g.roundRect(hR.x - 16, hR.y - 6, 18, 7, 2);
        g.fill();
        g.stroke();
        g.fillStyle = '#2fa8e0';
        g.beginPath();
        g.arc(hR.x - 6, hR.y - 9, 4, 0, 7);
        g.fill();
        g.stroke();
      }
      if (L.acc.includes('flashlight')) {
        g.fillStyle = 'rgba(255,242,176,0.18)';
        g.beginPath();
        g.moveTo(hR.x - 4, hR.y + 6);
        g.lineTo(hR.x - 60, hR.y + 80);
        g.lineTo(hR.x + 10, hR.y + 86);
        g.closePath();
        g.fill();
        g.fillStyle = '#2a2a2a';
        g.beginPath();
        g.roundRect(hR.x - 3, hR.y - 2, 6, 12, 2);
        g.fill();
        g.stroke();
        g.fillStyle = '#fff6c0';
        g.fillRect(hR.x - 2.5, hR.y + 9, 5, 2);
      }
      if (L.acc.includes('mic')) {
        g.fillStyle = '#1a1a1a';
        g.beginPath();
        g.roundRect(hR.x - 1.6, hR.y - 10, 3.2, 12, 1.5);
        g.fill();
        g.fillStyle = '#c8c8d0';
        g.beginPath();
        g.arc(hR.x, hR.y - 12, 3.4, 0, 7);
        g.fill();
        g.stroke();
      }
    }

    drawHead(g, L, c, OUT, LW) {
      const old = L.age === 'old';
      g.lineWidth = LW;
      g.strokeStyle = OUT;
      // ผมด้านหลัง
      g.fillStyle = L.hair;
      if (L.hairStyle === 'idol' || L.hairStyle === 'messy') {
        g.beginPath();
        g.ellipse(0, -6, 18, 18, 0, 0, 7);
        g.fill();
      }
      // หู
      g.fillStyle = L.skin;
      for (const side of [-1, 1]) {
        g.beginPath();
        g.ellipse(side * 15.2, 1, 3.2, 4.6, 0, 0, 7);
        g.fill();
        g.stroke();
      }
      // หน้า
      g.beginPath();
      g.moveTo(-14.5, -6);
      g.quadraticCurveTo(-15, 10, -7, 15);
      g.quadraticCurveTo(0, 19, 7, 15);
      g.quadraticCurveTo(15, 10, 14.5, -6);
      g.quadraticCurveTo(14, -19, 0, -19);
      g.quadraticCurveTo(-14, -19, -14.5, -6);
      g.closePath();
      g.fill();
      g.stroke();
      // แก้มแดงนิด ๆ
      g.fillStyle = 'rgba(240,120,110,0.18)';
      for (const side of [-1, 1]) {
        g.beginPath();
        g.ellipse(side * 8.5, 6, 3.4, 2, 0, 0, 7);
        g.fill();
      }
      // ริ้วรอย (สูงวัย)
      if (old && L.acc.includes('wrinkles')) {
        g.strokeStyle = 'rgba(120,80,60,0.5)';
        g.lineWidth = 0.7;
        for (const y of [-13, -11]) {
          g.beginPath();
          g.moveTo(-6, y);
          g.quadraticCurveTo(0, y - 1, 6, y);
          g.stroke();
        }
        for (const side of [-1, 1]) {
          g.beginPath();
          g.moveTo(side * 4.5, 3);
          g.quadraticCurveTo(side * 6.5, 7, side * 5.5, 10);
          g.stroke();
          g.beginPath(); // ตีนกา
          g.moveTo(side * 11, -2);
          g.lineTo(side * 13, -3);
          g.moveTo(side * 11, -1);
          g.lineTo(side * 13, 0);
          g.stroke();
        }
      }
      // ตา
      const ex = this.lx * 1.4;
      const ey = this.ly * -1.2;
      const face = c.face;
      g.lineWidth = 1.3;
      for (const side of [-1, 1]) {
        const x = side * 6.2;
        const y = -1.5;
        const closed = c.blink > 0.5 || face === 'joy' || (face === 'wink' && side === 1);
        g.strokeStyle = '#2a1a14';
        if (closed) {
          g.beginPath();
          if (face === 'joy' || face === 'wink') {
            g.moveTo(x - 3, y + 0.5);
            g.quadraticCurveTo(x, y - 3, x + 3, y + 0.5);
          } else {
            g.moveTo(x - 3, y);
            g.quadraticCurveTo(x, y + 1.5, x + 3, y);
          }
          g.stroke();
          continue;
        }
        const h = face === 'wow' ? 4.4 : face === 'calm' ? 2.6 : 3.4;
        g.fillStyle = '#fff';
        g.beginPath();
        g.ellipse(x, y, 3.3, h, 0, 0, 7);
        g.fill();
        g.fillStyle = '#3a2418';
        g.beginPath();
        g.ellipse(x + ex, y + ey + 0.3, 2.1, Math.min(h, 2.8), 0, 0, 7);
        g.fill();
        g.fillStyle = '#fff';
        g.beginPath();
        g.arc(x + ex + 0.8, y + ey - 0.8, 0.7, 0, 7);
        g.fill();
        // เปลือกตา (คนสูงวัย/สุขุม ตาปรือนิด)
        if (old || face === 'calm') {
          g.fillStyle = L.skin;
          g.beginPath();
          g.ellipse(x, y - h + 0.6, 3.6, 1.6, 0, 0, 7);
          g.fill();
        }
        g.strokeStyle = '#2a1a14';
        g.beginPath();
        g.moveTo(x - 3.4, y - h * 0.55);
        g.quadraticCurveTo(x, y - h - 0.6, x + 3.4, y - h * 0.55);
        g.stroke();
      }
      // คิ้ว
      g.strokeStyle = L.brow;
      g.lineWidth = old ? 2 : 1.5;
      for (const side of [-1, 1]) {
        const lift = face === 'wow' ? -2 : face === 'think' && side === 1 ? -1.5 : 0;
        g.beginPath();
        g.moveTo(side * 3, -7.5 + lift);
        g.quadraticCurveTo(side * 6.5, -9.2 + lift, side * 10, -7.8 + lift);
        g.stroke();
      }
      // จมูก
      g.strokeStyle = 'rgba(120,70,50,0.7)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(0.4, 1.5);
      g.quadraticCurveTo(1.6, 5, -0.4, 5.6);
      g.stroke();
      // หนวด
      if (L.acc.includes('mustache')) {
        g.fillStyle = L.brow;
        g.beginPath();
        g.moveTo(-5, 8.6);
        g.quadraticCurveTo(-2.5, 6.6, 0, 7.8);
        g.quadraticCurveTo(2.5, 6.6, 5, 8.6);
        g.quadraticCurveTo(2.5, 8.8, 0, 8.6);
        g.quadraticCurveTo(-2.5, 8.8, -5, 8.6);
        g.fill();
      }
      // ปาก
      const m = c.mouth;
      g.strokeStyle = '#7a3a2c';
      g.lineWidth = 1.2;
      if (m > 0.08 || face === 'wow') {
        const oh = face === 'wow' ? 2.6 : 0.8 + m * 3.2;
        g.fillStyle = '#8a2a2a';
        g.beginPath();
        g.ellipse(0, 11, 2.6 + m * 0.8, oh, 0, 0, 7);
        g.fill();
        g.stroke();
      } else {
        const smile = face === 'joy' || face === 'happy' || face === 'wink' ? 2 : face === 'think' ? 0 : 1.1;
        g.beginPath();
        g.moveTo(-3.4, 10.5);
        g.quadraticCurveTo(0, 10.5 + smile, 3.4, 10.5);
        g.stroke();
      }
      // แว่น
      if (L.acc.includes('glasses') || L.acc.includes('sunglasses')) {
        const sun = L.acc.includes('sunglasses');
        g.strokeStyle = sun ? '#111' : '#6a5030';
        g.lineWidth = 1.1;
        g.fillStyle = sun ? 'rgba(20,26,34,0.92)' : 'rgba(200,230,255,0.12)';
        for (const side of [-1, 1]) {
          g.beginPath();
          if (sun) g.roundRect(side * 6.2 - 4.4, -5, 8.8, 6.6, 2.5);
          else g.arc(side * 6.2, -1.6, 4.1, 0, 7);
          g.fill();
          g.stroke();
        }
        g.beginPath();
        g.moveTo(-2, -2);
        g.quadraticCurveTo(0, -3, 2, -2);
        g.moveTo(-10.3, -2);
        g.lineTo(-14.5, -3);
        g.moveTo(10.3, -2);
        g.lineTo(14.5, -3);
        g.stroke();
      }
      // ผม (ด้านหน้า)
      this.drawHair(g, L, OUT, LW);
      // หมวก
      if (L.acc.includes('strawHat')) {
        g.fillStyle = '#d9b46a';
        g.strokeStyle = OUT;
        g.lineWidth = LW;
        g.beginPath();
        g.ellipse(0, -15, 30, 6, 0, 0, 7);
        g.fill();
        g.stroke();
        g.beginPath();
        g.moveTo(-14, -16);
        g.quadraticCurveTo(-13, -31, 0, -31);
        g.quadraticCurveTo(13, -31, 14, -16);
        g.closePath();
        g.fill();
        g.stroke();
        g.fillStyle = '#7a2a1a';
        g.fillRect(-14, -20, 28, 3.5);
      }
      if (L.acc.includes('santaHat')) {
        g.fillStyle = '#d0202a';
        g.strokeStyle = OUT;
        g.lineWidth = LW;
        g.beginPath();
        g.moveTo(-15, -15);
        g.quadraticCurveTo(-6, -40, 12, -38);
        g.quadraticCurveTo(22, -36, 25, -26);
        g.quadraticCurveTo(10, -30, 15, -15);
        g.closePath();
        g.fill();
        g.stroke();
        g.fillStyle = '#fff';
        g.beginPath();
        g.roundRect(-17, -19, 34, 7, 3.5);
        g.fill();
        g.stroke();
        g.beginPath();
        g.arc(25, -25, 4, 0, 7);
        g.fill();
        g.stroke();
      }
      if (L.acc.includes('chineseCap')) {
        g.fillStyle = '#151515';
        g.strokeStyle = OUT;
        g.lineWidth = LW;
        g.beginPath();
        g.moveTo(-15, -12);
        g.quadraticCurveTo(-15, -27, 0, -27);
        g.quadraticCurveTo(15, -27, 15, -12);
        g.closePath();
        g.fill();
        g.stroke();
        g.fillStyle = '#c0141e';
        g.beginPath();
        g.arc(0, -28, 2.6, 0, 7);
        g.fill();
      }
    }

    drawHair(g, L, OUT, LW) {
      g.fillStyle = L.hair;
      g.strokeStyle = OUT;
      g.lineWidth = LW;
      const st = L.hairStyle;
      g.beginPath();
      if (st === 'elder') {
        // ผมขาวบางแบบคนสูงวัย: ข้างหูหนา ด้านบนบางเห็นหนังศีรษะ หวีเสยไปด้านหลัง
        for (const side of [-1, 1]) {
          g.moveTo(side * 15.6, 2);
          g.quadraticCurveTo(side * 18, -10, side * 12, -17);
          g.quadraticCurveTo(side * 10, -12, side * 13.2, -6);
          g.quadraticCurveTo(side * 13, -1, side * 15.6, 2);
          g.closePath();
        }
        g.fill();
        g.stroke();
        // ผมบนศีรษะ: บาง หวีเสยเรียบ (โปร่งให้เห็นหนังศีรษะนิด ๆ)
        g.globalAlpha = 0.88;
        g.beginPath();
        g.moveTo(-13.6, -9);
        g.quadraticCurveTo(-15, -20.5, 0, -21.2);
        g.quadraticCurveTo(15, -20.5, 13.6, -9);
        g.quadraticCurveTo(9, -15.5, 0, -15.8);
        g.quadraticCurveTo(-9, -15.5, -13.6, -9);
        g.closePath();
        g.fill();
        g.globalAlpha = 1;
        g.stroke();
        // ริ้วรอยหวีผม
        g.strokeStyle = 'rgba(150,140,130,.6)';
        g.lineWidth = 0.6;
        for (let i = -2; i <= 2; i++) {
          g.beginPath();
          g.moveTo(i * 4, -16.4);
          g.quadraticCurveTo(i * 4.4, -19, i * 3.2, -20.6);
          g.stroke();
        }
        return;
      } else if (st === 'spiky') {
        g.moveTo(-15.5, -2);
        const tips = [[-17, -18], [-11, -15], [-9, -26], [-3, -19], [2, -28], [6, -19], [12, -24], [13, -15], [17, -14]];
        let px = -15.5;
        for (const [x, y] of tips) {
          g.lineTo(x, y);
          px = x;
        }
        g.lineTo(15.5, -2);
        g.quadraticCurveTo(12, -11, 4, -11);
        g.lineTo(0, -8);
        g.lineTo(-4, -12);
        g.quadraticCurveTo(-12, -12, -15.5, -2);
      } else if (st === 'messy') {
        g.moveTo(-16, 2);
        g.quadraticCurveTo(-19, -22, 0, -23);
        g.quadraticCurveTo(19, -22, 16, 2);
        g.lineTo(13, -6);
        g.lineTo(9, -2);
        g.lineTo(6, -9);
        g.lineTo(1, -3);
        g.lineTo(-3, -9);
        g.lineTo(-8, -2);
        g.lineTo(-11, -7);
        g.closePath();
      } else if (st === 'idol') {
        g.moveTo(-16, 4);
        g.quadraticCurveTo(-19, -23, 0, -23);
        g.quadraticCurveTo(19, -23, 16, 4);
        g.quadraticCurveTo(14, -10, 8, -10);
        g.quadraticCurveTo(2, -4, -3, -10);
        g.quadraticCurveTo(-10, -6, -12, -10);
        g.quadraticCurveTo(-15, -6, -16, 4);
      } else {
        // สั้นเรียบ
        g.moveTo(-15.5, -3);
        g.quadraticCurveTo(-17, -22, 0, -22.5);
        g.quadraticCurveTo(17, -22, 15.5, -3);
        g.quadraticCurveTo(14, -12, 7, -13);
        g.quadraticCurveTo(0, -10, -5, -13.5);
        g.quadraticCurveTo(-12, -12, -15.5, -3);
      }
      g.closePath();
      g.fill();
      g.stroke();
      // ไฮไลต์ผม
      g.strokeStyle = 'rgba(255,255,255,0.35)';
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(-8, -19);
      g.quadraticCurveTo(-2, -21, 4, -20);
      g.stroke();
    }
  }

  function capsule(g, x1, y1, x2, y2, r, fill, stroke, lw) {
    const a = Math.atan2(y2 - y1, x2 - x1);
    const len = Math.hypot(x2 - x1, y2 - y1);
    g.save();
    g.translate(x1, y1);
    g.rotate(a);
    g.beginPath();
    g.moveTo(0, -r);
    g.lineTo(len, -r);
    g.arc(len, 0, r, -Math.PI / 2, Math.PI / 2);
    g.lineTo(0, r);
    g.arc(0, 0, r, Math.PI / 2, -Math.PI / 2);
    g.closePath();
    g.fillStyle = fill;
    g.fill();
    if (stroke) {
      g.strokeStyle = stroke;
      g.lineWidth = lw;
      g.stroke();
    }
    g.restore();
  }
  const lerp = (a, b, t) => a + (b - a) * t;

  const av = new Avatar2D();
  window.StageAvatar2D = {
    get mounted() {
      return av.mounted;
    },
    mount: (scene, before, fp, fb) => av.mount(scene, before, fp, fb),
    set: (c) => av.set(c),
    play: (n, o) => av.play(n, o),
    react: (k) => av.react(k),
    lookAt: (x, y, s) => av.lookAt(x, y, s),
    headPos: () => av.headPos(),
    setMouth: (v) => av.setMouth(v),
    setExternalMouth: (v) => av.setExternalMouth(v),
    setSpeaking: (on) => av.setSpeaking(on),
    themeModel: () => '2d',
    themeLayout: (t) => THEME_LAYOUT[t] || (ALIAS[t] ? { x: 790, y: 1720, h: 560 } : { x: 540, y: 1700, h: 580 }),
    halfLayout: HALF_LAYOUT,
    poses: Object.keys(POSES).filter((k) => !POSES[k].idle),
    looks: LOOKS,
    get ready() {
      return av.mounted;
    },
    _a: av,
  };
})();
