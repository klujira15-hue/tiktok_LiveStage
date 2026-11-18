/* ธีม "เวทีหมอลำ 3D" — ข้อมูลธีมอยู่ใน molamtheme.js • ไฟล์ธีม public/themes/molamstage.js เรียก window.makeMolamStageTheme('molamstage')
 * ฉาก: ภาพเวทีจริงที่ถ่ายตรงหน้า (scenes/molamstage/stage.jpg) ฉายลงบนพื้นผิว 3 มิติ (พื้นหญ้า รั้ว หน้าเวที พื้นเวที ฉากหลัง)
 *   ด้วยกล้องตัวเดียวกับที่ถ่ายภาพ → ตอนกล้องอยู่ที่เดิมได้ภาพเป๊ะ พอกล้องโยก/ซูมจะเห็นมิติ (ของใกล้เลื่อนมากกว่าของไกล)
 * ตัวละคร: ภาพคนจริงตัดพื้นออก (webp) ยืนในโลก 3D ตามระยะจริง (ไกล = เล็ก) มีเงาที่พื้น แสงไฟเวทีส่องตัว ขอบตัวเรืองแสงจากไฟหลังเวที
 * ไฟ: ลำแสงมูฟวิ่งเฮด เลเซอร์ วงไฟบนพื้น ไฟหน้าเวที หมอกควัน จอ LED เปลี่ยนสี/ขึ้นชื่อคน — ขยับตามจังหวะเพลงของหน้าเวที
 * คนดู = ที่ยืนหน้าเวที (TH.slots คำนวณจากกล้องเดียวกัน) → หน้าเวทีวางป้ายชื่อ/ฟองคำพูด ไฟล์นี้เลื่อนป้ายตามตัวละครทุกเฟรม
 */
(() => {
  'use strict';
  const W = 1080;
  const H = 1920;
  const PI = Math.PI;
  const meta = () => window.__stage?.api?.meta || {};
  const hud = () => meta().hud || {};
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
  const hsh = (s) => {
    let h = 2166136261;
    for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return h >>> 0;
  };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const BASE = '/scenes/molamstage/';

  // ---------------------------------------------------------------- ภาพตัวละคร: [กว้าง, สูง, แถวเท้า, กลางลำตัว x, หัวถึงเท้า(px)] (วัดจากภาพที่ตัดพื้นแล้ว)
  const SPR = {"ca-1":[354,740,736,179,733],"ca-2":[381,742,738,188,726],"ca-3":[222,728,725,120,723],"cb-1":[330,804,801,179,711],"cb-2":[306,771,767,131,708],"cb-3":[251,795,789,120,784],"cg-1":[287,800,796,146,692],"cg-2":[296,811,808,170,698],"cg-3":[271,749,745,134,736],"cu-1":[354,713,709,202,704],"cu-2":[304,713,709,160,705],"cu-3":[415,758,755,193,752],"d1-1":[368,816,812,207,799],"d1-2":[401,821,817,165,787],"d1-3":[277,844,840,130,830],"d2-1":[354,837,831,169,819],"d2-2":[426,833,829,167,818],"d2-3":[342,857,853,158,845],"d3-1":[451,732,729,201,720],"d3-2":[475,747,744,293,716],"d3-3":[246,776,772,122,769],"d4-1":[315,770,766,187,763],"d4-2":[437,771,767,285,765],"d4-3":[257,776,773,126,770],"sf-1":[340,800,797,136,724],"sf-2":[363,744,741,159,738],"sf-3":[249,771,768,124,766],"sm-1":[309,777,773,124,771],"sm-2":[259,777,774,128,772],"sm-3":[272,769,766,113,764]};
  // ความสูงจริง (เมตร ถึงยอดหัว/เครื่องประดับหัว) • หางเครื่อง d1 d2 รวมขนนก
  const CH = { d1: 2.25, d2: 2.3, d3: 1.7, d4: 1.74, sf: 1.63, sm: 1.8, cb: 1.72, cg: 1.6, cu: 1.66, ca: 1.55 };
  const BAD_TOP = new Set(['cb-3', 'cg-3', 'cu-3']); // มือ/ผ้าอยู่เหนือหัว → ใช้ขนาดจากท่าอื่นของคนเดียวกัน
  const STAGE_K = 1.32; // คนบนเวทีตัวใหญ่กว่าจริงนิดหน่อย ให้เห็นชัดบนจอมือถือ
  const AUD = ['cb', 'cg', 'cu', 'ca'];
  const DANCERS = ['d1', 'd2', 'd3', 'd4'];
  // เมตรต่อพิกเซลของแต่ละภาพ (ทุกท่าของคนเดียวกันสูงเท่ากัน)
  const MPP = {};
  for (const c of Object.keys(CH)) {
    const ks = [1, 2, 3].map((i) => `${c}-${i}`);
    const ok = ks.filter((k) => !BAD_TOP.has(k)).map((k) => SPR[k][4]).sort((a, b) => a - b);
    const ref = ok[Math.floor(ok.length / 2)];
    const k0 = c[0] === 'c' ? 1 : STAGE_K;
    for (const k of ks) MPP[k] = (CH[c] * k0) / (BAD_TOP.has(k) || Math.abs(SPR[k][4] / ref - 1) > 0.06 ? ref : SPR[k][4]);
  }

  // ---------------------------------------------------------------- กล้องที่ถ่ายภาพเวที (หน่วยพิกเซลของภาพกว้าง 1080)
  // จุดในโลก (X, Y, ระยะ d) → ภาพ: x = 540 + f·X/d • y = yh + f·(hc − Y)/d  (กล้องสูง hc เมตร มองตรง ไม่ก้ม)
  const C0 = { f: 1200, hc: 5, yh: 870, ph: 1935 };
  const HF = 2 * Math.max(C0.yh, C0.ph - C0.yh); // ความสูงภาพเต็มที่เส้นขอบฟ้าอยู่กลาง (สำหรับ setViewOffset)
  // มุมกล้องปกติ: ซูม 1.25 เท่ารอบจุด (540, 1000) ของภาพ — เวทีใหญ่ขึ้น พื้นหญ้าว่าง ๆ ด้านล่างหายไป
  const V0 = { z: 1.25, cx: 540, cy: 1000 };
  const DK = { fence: 14.46, front: 16, deckY: 1.5, deckBack: 23.3, back: 24, side: 16.5 };
  const rest = (X, Y, d) => {
    const px = 540 + (C0.f * X) / d;
    const py = C0.yh + (C0.f * (C0.hc - Y)) / d;
    return { x: (px - V0.cx) * V0.z + 540, y: (py - V0.cy) * V0.z + 960 };
  };
  const restInv = (sx, sy, Y) => {
    const px = (sx - 540) / V0.z + V0.cx;
    const py = (sy - 960) / V0.z + V0.cy;
    const d = clamp((C0.f * (C0.hc - Y)) / Math.max(30, py - C0.yh), 8.6, 13.6);
    return { x: ((px - 540) * d) / C0.f, d };
  };

  // ---------------------------------------------------------------- ที่ยืนคนดู: 5 แถวหน้าเวที (แถวหน้าสุดชิดรั้ว) ไม่ลงไปถึงขอบล่างจอ
  const SEATS = [];
  [12.6, 11.5, 10.5, 9.6, 8.8].forEach((d, row) => {
    const half = 0.36 * d - 0.55;
    const sp = 0.86;
    const n = Math.floor((half * 2) / sp) + 1;
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * sp + (row % 2 ? 0.2 : -0.2);
      if (Math.abs(x) > half) continue;
      SEATS.push({ x, d: d + (((i * 7 + row * 3) % 5) - 2) * 0.07, row });
    }
  });
  const SLOTS = SEATS.map((s) => {
    const p = rest(s.x, 1.72, s.d);
    return { x: p.x, y: p.y, s: clamp(7.6 / s.d, 0.62, 0.86), row: s.row };
  });
  // คนเกินที่ยืน: แถวหลังสุด (ตำแหน่งบนจอ แปลงกลับเป็นตำแหน่งในโลกตอนวาด)
  const ROWS = [{ y: Math.round(rest(0, 1.72, 9.2).y), s: 0.8, n: 10, x0: 220, x1: 860, jy: 26 }];

  // ---------------------------------------------------------------- shader
  const VS_WORLD = `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
  // ภาพเวทีฉายลงพื้นผิว + จอ LED เคลื่อนไหว + วงไฟบนพื้น
  const FS_PHOTO = `
    uniform sampler2D uMap; uniform sampler2D uLed;
    uniform float uF, uHc, uYh, uPH, uFloor, uTime, uBeat, uHue, uTxt, uDim, uStrobe;
    uniform vec4 uSp[6]; uniform vec3 uSpC[6]; uniform float uSpY[6];
    uniform vec3 uWash;
    varying vec3 vW;
    vec3 hue(vec3 c, float a){ const vec3 k = vec3(0.57735); float ca = cos(a); return c*ca + cross(k,c)*sin(a) + k*dot(k,c)*(1.-ca); }
    void main(){
      float d = max(0.5, -vW.z);
      vec2 p = vec2(540. + uF*vW.x/d, uYh + uF*(uHc - vW.y)/d);
      vec3 c = texture2D(uMap, clamp(vec2(p.x/1080., 1. - p.y/uPH), vec2(.001), vec2(.999))).rgb;
      if (p.y > 775. && p.y < 938.) {
        bool mn = p.x > 398. && p.x < 681.;
        bool sd = (p.x > 267. && p.x < 298.) || (p.x > 330. && p.x < 362.) || (p.x > 717. && p.x < 749.) || (p.x > 779. && p.x < 811.);
        if (mn || sd) {
          vec2 l = mn ? (p - vec2(398., 775.)) / vec2(283., 163.) : vec2(fract(p.x / 31.), (p.y - 775.) / 163.);
          vec3 led = hue(c, uHue) * (0.78 + 0.5 * uBeat);
          float bar = smoothstep(0.9, 1., sin((l.y * 5. - uTime * 1.8) * 3.14159));
          led += bar * 0.35 * hue(vec3(1., .25, .6), uHue * 1.7);
          if (sd) led *= 0.7 + 0.6 * step(0.5, fract(l.y * 6. + uTime * 2.));
          if (mn && uTxt > 0.) {
            vec4 tx = texture2D(uLed, vec2(l.x, 1. - l.y));
            led = mix(led, mix(led * 0.3, tx.rgb, tx.a), uTxt);
          }
          c = led;
        }
      }
      if (uFloor > 0.5) {
        vec3 add = vec3(0.);
        for (int i = 0; i < 6; i++) {
          if (abs(vW.y - uSpY[i]) < 0.3) {
            vec4 s = uSp[i];
            float r = length(vec2(vW.x - s.x, (-vW.z - s.y) * 0.8)) / s.z;
            add += uSpC[i] * s.w * smoothstep(1., 0.15, r);
          }
        }
        c += add * (0.16 + c * 1.5);
      }
      c = c * uDim + uWash * uStrobe;
      gl_FragColor = vec4(c, 1.);
    }`;
  // ตัวละคร: ภาพตัดพื้น + แสงไฟส่อง + ขอบเรืองแสง (ไฟจากหลังเวที) + ไล่เงาเข้าขอบตัวให้ดูมีปริมาตร
  const VS_UV = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`;
  const FS_SPR = `
    uniform sampler2D uMap; uniform vec2 uTexel; uniform vec3 uLit; uniform vec3 uRim; uniform float uRimK, uFlash, uA, uFlip;
    varying vec2 vUv;
    void main(){
      vec2 uv = vec2(uFlip > .5 ? 1. - vUv.x : vUv.x, vUv.y);
      vec4 t = texture2D(uMap, uv);
      if (t.a < 0.02) discard;
      vec2 e = uTexel * 5.;
      float m = min(min(texture2D(uMap, uv + vec2(e.x, 0.)).a, texture2D(uMap, uv - vec2(e.x, 0.)).a), min(texture2D(uMap, uv + vec2(0., e.y)).a, texture2D(uMap, uv - vec2(0., e.y)).a));
      float rim = clamp(t.a - m, 0., 1.);
      vec2 E = uTexel * 22.;
      float v = (texture2D(uMap, uv + vec2(E.x, 0.)).a + texture2D(uMap, uv - vec2(E.x, 0.)).a + texture2D(uMap, uv + vec2(0., E.y * .6)).a + texture2D(uMap, uv - vec2(0., E.y * .6)).a) * .25;
      vec3 c = t.rgb * uLit * mix(0.7, 1.05, v);
      c += uRim * rim * uRimK;
      c = mix(c, vec3(1.), uFlash);
      gl_FragColor = vec4(c, t.a * uA);
    }`;
  // ภาพเรืองแสง/ข้อความ/ของในมือ (หันหน้าเข้ากล้อง)
  const FS_QUAD = `uniform sampler2D uMap; uniform vec3 uC; uniform float uA; varying vec2 vUv;
    void main(){ vec4 t = texture2D(uMap, vUv); gl_FragColor = vec4(t.rgb * uC, t.a * uA); }`;
  // ลำแสงไฟ: กรวยโปร่ง สว่างที่ต้นแสง จางที่ปลายและขอบ
  const VS_BEAM = `varying float vT; varying float vE;
    void main(){ vT = -position.y; vec4 mv = modelViewMatrix * vec4(position,1.); vec3 n = normalize(normalMatrix * normal);
      vE = abs(dot(n, normalize(-mv.xyz))); gl_Position = projectionMatrix * mv; }`;
  const FS_BEAM = `uniform vec3 uC; uniform float uI; varying float vT; varying float vE;
    void main(){ float a = pow(1. - vT * 0.9, 1.4) * pow(vE, 1.6) * uI; gl_FragColor = vec4(uC, a); }`;

  const PALS = [
    ['#ff2a6d', '#05d9e8', '#ffd319'], ['#a742ff', '#ff3fa4', '#00f5d4'], ['#ff7b00', '#ffd000', '#ff2e63'],
    ['#00e5ff', '#3d7bff', '#ffffff'], ['#39ff14', '#ff00c8', '#ffe600'], ['#ff3b3b', '#ffb000', '#ff6ad5'],
  ];
  const hex3 = (h) => {
    const n = parseInt(h.slice(1), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  };
  // ไฟหน้าเวที (แถบไฟบนขอบพื้นเวที) — ตำแหน่ง x บนภาพ
  const FOOT = [105, 210, 310, 425, 535, 648, 765, 865, 975];
  // มูฟวิ่งเฮดบนทรัสหน้า — ตำแหน่ง x บนภาพ (แถวเดียวกัน y≈560)
  const HEADS = [278, 400, 492, 585, 680, 800];
  // แถวหางเครื่อง (x, ระยะ) หลายแบบ — เปลี่ยนทุก 16 จังหวะ
  const FORMS = [
    [[-3.4, 17.9], [-1.7, 17.9], [1.7, 17.9], [3.4, 17.9]],
    [[-3.1, 17.3], [-1.4, 18.5], [1.4, 18.5], [3.1, 17.3]],
    [[-2.9, 19.0], [-1.35, 19.0], [1.35, 19.0], [2.9, 19.0]],
    [[-3.6, 18.4], [-2.1, 17.4], [2.1, 17.4], [3.6, 18.4]],
  ];
  const SINGER_D = 16.75;

  window.makeMolamStageTheme = function makeMolamStageTheme(id) {
    let API = null;
    let el = null;
    let scn = null; // ชั้นในฉาก (ซูมไปพร้อมฉาก): ป้ายชื่อนักร้อง + ฟองคำพูด
    let G = null;
    let loading = null;
    const A = new Map(); // id คนดู → ตัวละคร
    const pickOf = new Map(); // id → ลำดับตัวละครที่เลือก (เปลี่ยนตัวแล้วออก/เข้าใหม่ก็ยังได้ตัวเดิม)
    const timers = [];
    let tNow = 0;
    const later = (s, fn) => timers.push({ at: tNow + s, fn });
    const sfx = (k, ...a) => API?.sfx?.[k]?.(...a);
    const $ = (s) => el?.querySelector(s);
    const singers = () => hud().molam?.singers || [{ key: 'sf', name: 'แพรวา' }, { key: 'sm', name: 'ภูผา' }];

    const T = {
      bpm: 148, // เท่ากับดนตรีพื้นหลังของธีมนี้ (music.js molamstage หมอลำซิ่งโจ๊ะ ๆ) — เต้นตรงจังหวะ
      fanH: 1,
      rows: ROWS,
      slots: SLOTS,
      fillFront: true, // คนดูเข้ามายืนแถวหน้ากลางเวทีก่อน
      get css() {
        return css();
      },
      fanSvg() {
        return '';
      },
      init(api) {
        API = api;
        window.__molamDbg = () => ({ G, A, P, hit: (a, b) => doHit(A.get(a), b && A.get(b)), rose: (a) => doRose(A.get(a), true), swap: (a) => doSwap(A.get(a)), singer: () => switchSinger('ทดสอบ'), gift: (t, uid) => giftTier(t, uid ? { id: uid, name: A.get(uid)?.name || uid } : null, '🌹', 'ทดสอบ') });
        el = document.createElement('div');
        el.className = 'ml-hud';
        document.getElementById('ui').appendChild(el);
        scn = document.createElement('div');
        scn.className = 'ml-scn';
        scn.innerHTML = '<div class="ml-sname"></div><div class="ml-sbub"></div>';
        document.getElementById('crowd').after(scn);
        render();
        loading ||= boot();
      },
      onConfig() {
        render();
      },
      drawStatic(c) {
        c.fillStyle = '#07040c';
        c.fillRect(0, 0, W, H);
      },
      drawBg(_c, _tt, bt, _api, now) {
        if (G) frame((now ?? performance.now()) / 1000, bt);
      },
      // จุดที่กล้องซูมของหน้าเวทีเล็ง (ของขวัญ): กลางตัวละครตามตำแหน่งจริงตอนนี้
      zoomFocus(f) {
        const a = A.get(f?.data?.id);
        if (!a || !G) return null;
        const h = a.h;
        const c = proj(a.x, a.y + h * 0.55, a.d);
        const top = proj(a.x, a.y + h + 0.1, a.d);
        return [c.x, c.y, top.y];
      },
      effects: new Proxy({}, {
        get(_o, key) {
          const fx = meta().effects?.[key];
          if (!fx) return undefined;
          return (user) => gift(fx, user);
        },
        has: (_o, key) => !!meta().effects?.[key],
        ownKeys: () => Object.keys(meta().effects || {}),
        getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
      }),
      onEvent(d) {
        if (d.type === 'cmd') return onCmd(d);
        if (d.type === 'goal') {
          API?.toast(`🎯 ${d.key === 'coins' ? 'เพชร' : 'ใจ'}ครบ! → ${d.reward}`, 'big');
          if (d.key === 'coins') giftTier(3, null, '👑', d.reward);
          else laserShow(8), jumpAll(4);
        }
      },
      onLike(d, api) {
        const p = api.fanPos(d.id);
        const a = A.get(d.id);
        const q = a && G ? proj(a.x, a.y + a.h + 0.2, a.d) : p;
        api.spawn({ type: 'heart', x: q ? q.x : api.rand(200, 880), y: q ? q.y : 1300, vy: api.rand(-300, -200), max: 1.8, size: api.rand(12, 18), color: '#ff4fa3', fadeIn: 0.1 });
      },
    };

    // ================================================================ สร้างฉาก 3D
    async function boot() {
      let THREE;
      try {
        THREE = await import('/vendor/three/build/three.module.js');
      } catch (e) {
        console.warn('molam: three.js โหลดไม่ได้', e);
        return;
      }
      const cv = document.createElement('canvas');
      cv.id = 'ml3d';
      cv.width = W;
      cv.height = H;
      cv.style.cssText = 'position:absolute;left:0;top:0;width:1080px;height:1920px;';
      document.getElementById('bg').after(cv);
      let R;
      try {
        R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
      } catch (e) {
        cv.remove();
        console.warn('molam: WebGL ใช้ไม่ได้', e);
        return;
      }
      R.setPixelRatio(1);
      R.setSize(W, H, false);
      // สีทุกอย่างคิดเป็นค่าเดียวกับภาพ (ไม่แปลงช่วงสี) — shader ของเราเองทั้งหมด
      R.outputColorSpace = THREE.LinearSRGBColorSpace;
      R.setClearColor(0x05030a, 1);
      const scene = new THREE.Scene();
      const cam = new THREE.PerspectiveCamera((2 * Math.atan(HF / 2 / C0.f) * 180) / PI, W / HF, 0.1, 200);
      const loader = new THREE.TextureLoader();
      const load = (url) => new Promise((res) => loader.load(url, (t) => {
        t.colorSpace = THREE.NoColorSpace;
        t.anisotropy = 4;
        res(t);
      }, undefined, () => res(null)));
      const keys = Object.keys(SPR);
      const [photo, ...sprs] = await Promise.all([load(BASE + 'stage.jpg'), ...keys.map((k) => load(BASE + k + '.webp'))]);
      if (!photo) {
        console.warn('molam: โหลดภาพเวทีไม่ได้');
        return;
      }
      const tex = {};
      keys.forEach((k, i) => (tex[k] = sprs[i]));
      const v3 = (a) => new THREE.Vector3(...a);
      G = { THREE, R, scene, cam, tex, quad: new THREE.PlaneGeometry(1, 1), v: new THREE.Vector3(), t0: 0 };

      // ---- ภาพเวทีบนพื้นผิว 3 มิติ
      const ledCv = document.createElement('canvas');
      ledCv.width = 512;
      ledCv.height = 295;
      const ledTex = new THREE.CanvasTexture(ledCv);
      ledTex.colorSpace = THREE.NoColorSpace;
      G.led = { cv: ledCv, tex: ledTex, until: 0, k: 0 };
      const U = {
        uMap: { value: photo }, uLed: { value: ledTex }, uF: { value: C0.f }, uHc: { value: C0.hc }, uYh: { value: C0.yh }, uPH: { value: C0.ph },
        uTime: { value: 0 }, uBeat: { value: 0 }, uHue: { value: 0 }, uTxt: { value: 0 }, uDim: { value: 1 }, uStrobe: { value: 0 }, uWash: { value: new THREE.Vector3() },
        uSp: { value: Array.from({ length: 6 }, () => new THREE.Vector4(0, 0, 1, 0)) }, uSpC: { value: Array.from({ length: 6 }, () => new THREE.Vector3()) },
        uSpY: { value: [1.5, 1.5, 1.5, 0, 0, 0] },
      };
      G.U = U;
      const photoMat = (floor) => new THREE.ShaderMaterial({ uniforms: { ...U, uFloor: { value: floor } }, vertexShader: VS_WORLD, fragmentShader: FS_PHOTO });
      const wall = (w, h, x, y, z, floor = 0) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), photoMat(floor));
        m.position.set(x, y, z);
        scene.add(m);
        return m;
      };
      const flat = (w, dep, x, y, z, floor = 1) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, dep), photoMat(floor));
        m.rotation.x = -PI / 2;
        m.position.set(x, y, z);
        scene.add(m);
        return m;
      };
      wall(46, 34, 0, 14, -DK.back); // ฉากหลัง: จอ LED ทรัส ท้องฟ้า เลเซอร์
      flat(32, DK.deckBack - DK.front + 0.8, 0, DK.deckY, -(DK.front + DK.deckBack + 0.8) / 2); // พื้นเวที
      wall(32, DK.deckY, 0, DK.deckY / 2, -DK.front); // หน้าเวที
      wall(4.4, 12, -6.75, 6, -DK.side); // ทรัส/ลำโพง/พญานาคซ้าย (อยู่หน้าเวที ไม่ใช่ฉากหลัง)
      wall(4.4, 12, 6.75, 6, -DK.side);
      flat(34, DK.front - 1, 0, 0, -(DK.front + 1) / 2); // พื้นหญ้า
      wall(34, 1.08, 0, 0.54, -DK.fence); // รั้ว

      // ---- ของใช้ร่วม
      const cvTex = (w, h, draw) => {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        draw(c.getContext('2d'), w, h);
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.NoColorSpace;
        return t;
      };
      const radial = (stops) => cvTex(128, 128, (c) => {
        const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
        for (const [k, col] of stops) g.addColorStop(k, col);
        c.fillStyle = g;
        c.fillRect(0, 0, 128, 128);
      });
      G.glowTex = radial([[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,.45)'], [1, 'rgba(255,255,255,0)']]);
      G.hazeTex = radial([[0, 'rgba(255,255,255,.55)'], [0.6, 'rgba(255,255,255,.18)'], [1, 'rgba(255,255,255,0)']]);
      G.shadowTex = radial([[0, 'rgba(0,0,0,.62)'], [0.55, 'rgba(0,0,0,.35)'], [1, 'rgba(0,0,0,0)']]);
      const emoji = (e, s = 128) => cvTex(s, s, (c) => {
        c.font = `${s * 0.78}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(e, s / 2, s * 0.54);
      });
      G.roseTex = emoji('🌹');
      G.bouquetTex = emoji('💐');
      G.heartTex = emoji('💖');
      G.starTex = emoji('⭐', 96);
      G.bottleTex = cvTex(64, 160, (c) => {
        // ขวดน้ำพลาสติกใส ฝาฟ้า ฉลากแดง
        c.fillStyle = '#2f8cff';
        c.fillRect(24, 2, 16, 14);
        c.fillStyle = 'rgba(190,230,255,.9)';
        c.beginPath();
        c.moveTo(26, 16);
        c.lineTo(38, 16);
        c.quadraticCurveTo(52, 30, 52, 48);
        c.lineTo(52, 150);
        c.quadraticCurveTo(52, 158, 44, 158);
        c.lineTo(20, 158);
        c.quadraticCurveTo(12, 158, 12, 150);
        c.lineTo(12, 48);
        c.quadraticCurveTo(12, 30, 26, 16);
        c.fill();
        c.fillStyle = '#e8343a';
        c.fillRect(12, 70, 40, 34);
        c.fillStyle = '#fff';
        c.font = 'bold 15px sans-serif';
        c.textAlign = 'center';
        c.fillText('น้ำ', 32, 93);
        c.fillStyle = 'rgba(255,255,255,.75)';
        c.fillRect(16, 40, 5, 100);
        c.strokeStyle = 'rgba(30,60,90,.6)';
        c.lineWidth = 2;
        c.strokeRect(12.5, 48, 39, 106);
      });
      G.textTex = new Map();
      G.word = (txt, col = '#ffe14d') => {
        const k = txt + col;
        if (!G.textTex.has(k)) G.textTex.set(k, cvTex(320, 160, (c) => {
          c.translate(160, 84);
          c.rotate(-0.12);
          // ดาวระเบิดหลังตัวอักษร
          c.beginPath();
          for (let i = 0; i < 24; i++) {
            const a = (i / 24) * PI * 2;
            const r = i % 2 ? 52 : 78;
            c.lineTo(Math.cos(a) * r * 1.7, Math.sin(a) * r * 0.85);
          }
          c.closePath();
          c.fillStyle = '#ffffff';
          c.fill();
          c.lineWidth = 6;
          c.strokeStyle = '#1b1020';
          c.stroke();
          c.font = '900 72px Kanit, "Leelawadee UI", sans-serif';
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          c.lineWidth = 12;
          c.strokeStyle = '#1b1020';
          c.strokeText(txt, 0, 4);
          c.fillStyle = col;
          c.fillText(txt, 0, 4);
        }));
        return G.textTex.get(k);
      };
      const quadMat = (map, add, c = [1, 1, 1], a = 1) => new THREE.ShaderMaterial({
        uniforms: { uMap: { value: map }, uC: { value: v3(c) }, uA: { value: a } }, vertexShader: VS_UV, fragmentShader: FS_QUAD,
        transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending,
      });
      G.mkQuad = (map, add, w, h, order, c, a) => {
        const m = new THREE.Mesh(G.quad, quadMat(map, add, c, a));
        m.scale.set(w, h, 1);
        m.renderOrder = order;
        scene.add(m);
        return m;
      };

      // ---- ลำแสงมูฟวิ่งเฮด
      const coneG = new THREE.ConeGeometry(1, 1, 28, 1, true).translate(0, -0.5, 0);
      G.beams = HEADS.map((px, i) => {
        const d = 18;
        const m = new THREE.Mesh(coneG, new THREE.ShaderMaterial({
          uniforms: { uC: { value: new THREE.Vector3(1, 1, 1) }, uI: { value: 0.2 } }, vertexShader: VS_BEAM, fragmentShader: FS_BEAM,
          transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        }));
        m.position.set(((px - 540) * d) / C0.f, C0.hc + ((C0.yh - 560) * d) / C0.f, -d);
        m.renderOrder = 5;
        scene.add(m);
        const glow = G.mkQuad(G.glowTex, true, 1.1, 1.1, 6);
        glow.position.copy(m.position);
        glow.position.z += 0.3;
        return { m, glow, i, tgt: new THREE.Vector3(0, 0, -10) };
      });
      // ---- เลเซอร์ (จากบนจอ LED พุ่งข้ามหัวคนดู)
      const rayG = new THREE.CylinderGeometry(0.022, 0.022, 1, 6, 1, true).translate(0, -0.5, 0);
      G.lasers = Array.from({ length: 12 }, (_, i) => {
        const m = new THREE.Mesh(rayG, new THREE.ShaderMaterial({
          uniforms: { uC: { value: new THREE.Vector3(0, 1, 0.3) }, uI: { value: 0 } }, vertexShader: VS_BEAM, fragmentShader: `uniform vec3 uC; uniform float uI; varying float vT; void main(){ gl_FragColor = vec4(uC, (1. - vT * .8) * uI); }`,
          transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        }));
        m.position.set(0, 7.0, -DK.back + 0.4);
        m.renderOrder = 6;
        m.visible = false;
        scene.add(m);
        return { m, i };
      });
      // ---- ไฟหน้าเวที + หมอกควัน
      G.foot = FOOT.map((px) => {
        const g = G.mkQuad(G.glowTex, true, 0.9, 0.55, 6);
        g.position.set(((px - 540) * DK.front) / C0.f, DK.deckY + 0.04, -DK.front + 0.05);
        return g;
      });
      G.haze = Array.from({ length: 8 }, (_, i) => {
        const g = G.mkQuad(G.hazeTex, true, 9, 5, 2, [1, 1, 1], 0.07);
        g.userData = { x0: (i - 3.5) * 2.6, y0: 2.6 + (i % 3) * 1.4, d: 18.5 + (i % 4) * 1.2, sp: 0.06 + (i % 5) * 0.02, ph: i * 1.7 };
        return g;
      });

      buildPerformers();
      G.ready = true;
      render();
      ledShow(API?.t?.title || meta().defaults?.title || 'หมอลำ LIVE', '🎤 ' + singers()[P.si].name, 6);
    }

    // ================================================================ ตัวละคร (ใช้ทั้งบนเวทีและคนดู)
    function sprMesh() {
      const { THREE } = G;
      return new THREE.Mesh(G.quad, new THREE.ShaderMaterial({
        uniforms: { uMap: { value: null }, uTexel: { value: new THREE.Vector2() }, uLit: { value: new THREE.Vector3(1, 1, 1) }, uRim: { value: new THREE.Vector3() }, uRimK: { value: 0 }, uFlash: { value: 0 }, uA: { value: 1 }, uFlip: { value: 0 } },
        vertexShader: VS_UV, fragmentShader: FS_SPR, transparent: true, depthWrite: false,
      }));
    }
    function applySpr(m, key, flip) {
      const [w, h, feet, cx] = SPR[key];
      const k = MPP[key];
      const u = m.material.uniforms;
      u.uMap.value = G.tex[key];
      u.uTexel.value.set(1 / w, 1 / h);
      u.uFlip.value = flip ? 1 : 0;
      m.scale.set(w * k, h * k, 1);
      m.position.set((w / 2 - cx) * k * (flip ? -1 : 1), (feet - h / 2) * k, 0);
      m.userData.key = key;
    }
    function mkChar(kind, pose, stage) {
      const { THREE, scene } = G;
      const grp = new THREE.Group();
      const body = new THREE.Group();
      grp.add(body);
      const mA = sprMesh();
      const mB = sprMesh();
      mB.visible = false;
      body.add(mB, mA);
      const sh = new THREE.Mesh(G.quad, new THREE.ShaderMaterial({ uniforms: { uMap: { value: G.shadowTex }, uC: { value: new THREE.Vector3(1, 1, 1) }, uA: { value: 1 } }, vertexShader: VS_UV, fragmentShader: FS_QUAD, transparent: true, depthWrite: false }));
      sh.rotation.x = -PI / 2;
      sh.position.y = 0.025;
      sh.renderOrder = 1;
      grp.add(sh);
      scene.add(grp);
      const c = { grp, body, mA, mB, sh, kind, key: '', flip: false, fadeK: 1, stage, x: 0, y: 0, d: 10, h: CH[kind] * (stage ? STAGE_K : 1), lit: [1, 1, 1], flash: 0 };
      setKey(c, `${kind}-${pose}`, true);
      return c;
    }
    function setKey(c, key, instant) {
      if (c.key === key && !instant) return;
      if (!instant && c.key) {
        applySpr(c.mB, c.key, c.flip);
        c.mB.visible = true;
        c.fadeK = 0;
      } else c.mB.visible = false;
      c.key = key;
      applySpr(c.mA, key, c.flip);
      const sw = (SPR[key][0] * MPP[key]) / (c.stage ? 2.4 : 2.1);
      c.sh.scale.set(clamp(sw, 0.55, 1.1), 0.42, 1);
    }
    function setKind(c, kind, pose = 1) {
      c.kind = kind;
      c.h = CH[kind] * (c.stage ? STAGE_K : 1);
      setKey(c, `${kind}-${pose}`, true);
    }
    function charStep(c, dt, order) {
      if (c.fadeK < 1) {
        c.fadeK = Math.min(1, c.fadeK + dt / 0.13);
        if (c.fadeK >= 1) c.mB.visible = false;
      }
      c.grp.position.set(c.x, c.y, -c.d);
      const u = c.mA.material.uniforms;
      u.uA.value = c.mB.visible ? ease(c.fadeK) : c.alpha ?? 1;
      u.uLit.value.set(...c.lit);
      u.uRim.value.set(...(c.rim || [0, 0, 0]));
      u.uRimK.value = c.rimK || 0;
      u.uFlash.value = c.flash;
      const ub = c.mB.material.uniforms;
      ub.uLit.value.copy(u.uLit.value);
      ub.uRim.value.copy(u.uRim.value);
      ub.uRimK.value = u.uRimK.value;
      ub.uA.value = c.alpha ?? 1;
      c.mA.renderOrder = order + 0.002;
      c.mB.renderOrder = order + 0.001;
      c.sh.material.uniforms.uA.value = (c.alpha ?? 1) * clamp(1 - c.y / 1.2, 0.3, 1);
      c.sh.position.y = (c.floorY ?? 0) - c.y + 0.025;
    }

    // ================================================================ คนบนเวที
    const P = { dancers: [], singer: null, si: 0, form: 0, sw: null, lastSw: -99, swAt: 0, wai: 0, waiD: 0, front: 0, frontD: 0, sx: 0, sxT: 0, point: 0 };
    function buildPerformers() {
      P.si = Math.random() < 0.5 ? 0 : 1;
      P.dancers = DANCERS.map((k, i) => {
        const c = mkChar(k, 1, true);
        const [x, d] = FORMS[0][i];
        Object.assign(c, { x, d, y: DK.deckY, floorY: DK.deckY, tx: x, td: d, slot: i });
        return c;
      });
      P.singer = mkChar(singers()[P.si].key, 1, true);
      Object.assign(P.singer, { x: 0, d: SINGER_D, y: DK.deckY, floorY: DK.deckY, tx: 0 });
      P.swAt = 0;
    }
    const sKey = (pose) => {
      const k = P.singer.kind;
      // ท่าของนักร้อง: ร้อง / ชี้ไมค์หาคนดู / ไหว้
      const map = k === 'sm' ? { sing: 1, point: 3, wai: 2 } : { sing: 1, point: 2, wai: 3 };
      return `${k}-${map[pose]}`;
    };
    function switchSinger(by) {
      if (!G || P.sw) return false;
      if (by && tNow - P.lastSw < 12) return false;
      const next = 1 - P.si;
      P.sw = { ph: 'out', t0: tNow, next };
      P.lastSw = tNow;
      const nm = singers()[next].name;
      if (by && by !== 'auto') API?.toast(`🎤 ${by} ขอเปลี่ยนนักร้อง → ${nm}`);
      ledShow('🎤 ต่อไปพบกับ', nm, 5);
      sayAbove('ขอบคุณทุกคนจ้า 🙏', 2.2);
      return true;
    }
    function stepPerformers(t, dt, b) {
      const beatN = b.n + b.ph;
      // หางเครื่องเปลี่ยนแถวทุก 16 จังหวะ (สลับคนบ้าง)
      const form = Math.floor(b.n / 16) % FORMS.length;
      if (form !== P.form) {
        P.form = form;
        const order = [0, 1, 2, 3];
        if (Math.random() < 0.5) [order[0], order[1], order[2], order[3]] = [order[1], order[0], order[3], order[2]];
        P.dancers.forEach((c, i) => (c.slot = order[i]));
      }
      const front = P.front > t;
      P.dancers.forEach((c, i) => {
        let [tx, td] = FORMS[P.form][c.slot];
        if (front) {
          tx = [-3.0, -1.2, 1.2, 3.0][c.slot];
          td = 16.55;
        }
        c.x = lerp(c.x, tx, 1 - Math.exp(-dt * 2.2));
        c.d = lerp(c.d, td, 1 - Math.exp(-dt * 2.2));
        const moving = Math.abs(tx - c.x) + Math.abs(td - c.d) > 0.15;
        const wai = P.wai > t;
        let pose;
        if (wai) pose = 3;
        else if (P.hype > t) pose = 1 + ((b.n + i) % 2);
        else pose = 1 + ((Math.floor(b.n / 2) + (i % 2)) % 2);
        setKey(c, `${c.kind}-${pose}`);
        const hop = wai ? 0 : Math.pow(1 - b.ph, 3) * (P.hype > t ? 0.12 : 0.05) + (moving ? Math.abs(Math.sin(t * 9 + i)) * 0.05 : 0);
        c.y = DK.deckY + hop;
        c.body.rotation.z = wai ? 0 : Math.sin(beatN * PI + i) * 0.035;
        c.flip = false;
      });
      // นักร้อง
      const s = P.singer;
      const sw = P.sw;
      if (sw) {
        const k = tNow - sw.t0;
        if (sw.ph === 'out') {
          if (k < 1.4) setKey(s, sKey('wai'));
          else {
            setKey(s, sKey('sing'));
            s.x += dt * 4.2;
            s.y = DK.deckY + Math.abs(Math.sin(t * 9)) * 0.05;
            if (s.x > 8) {
              P.si = sw.next;
              setKind(s, singers()[P.si].key, 1);
              s.x = -8;
              sw.ph = 'in';
              sw.t0 = tNow;
            }
          }
        } else {
          s.x = Math.min(0, s.x + dt * 4.2);
          s.y = DK.deckY + (s.x < 0 ? Math.abs(Math.sin(t * 9)) * 0.05 : 0);
          setKey(s, sKey('sing'));
          if (s.x >= 0) {
            P.sw = null;
            P.wai = 0;
            P.swAt = tNow;
            sayAbove(`สวัสดีพี่น้องทุกคน 🎤`, 2.6);
            ledShow('🎤 ' + singers()[P.si].name, 'ม่วนกันเลย!', 4);
            render();
          }
        }
      } else {
        // เดินไปมาหน้าเวทีช้า ๆ ทุก 16 จังหวะ • ชี้ไมค์หาคนดูทุก 8 จังหวะ
        const bar16 = Math.floor(b.n / 16);
        if (bar16 !== P.sxBar) {
          P.sxBar = bar16;
          P.sxT = [0, -0.7, 0.2, 0.7, -0.4, 0.5][bar16 % 6]; // ไม่เดินไปบังหางเครื่อง
        }
        s.x = lerp(s.x, P.sxT, 1 - Math.exp(-dt * 0.9));
        const wai = P.wai > t;
        const point = !wai && b.n % 8 >= 6;
        setKey(s, sKey(wai ? 'wai' : point ? 'point' : 'sing'));
        s.y = DK.deckY + (wai ? 0 : Math.pow(1 - b.ph, 3) * 0.035);
        s.body.rotation.z = wai ? 0 : Math.sin(beatN * PI * 0.5) * 0.025;
        const min = (hud().molam?.singerMin || 4) * 60;
        if (tNow - P.swAt > min) switchSinger('auto');
      }
      s.d = P.wai > t && P.waiFront ? lerp(s.d, 16.45, 0.08) : lerp(s.d, SINGER_D, 0.05);
      const pal = G.pal;
      const lit = [0.94 + pal[0][0] * 0.14 + b.pulse * 0.08, 0.92 + pal[0][1] * 0.12 + b.pulse * 0.08, 0.94 + pal[0][2] * 0.14 + b.pulse * 0.08];
      for (const c of [...P.dancers, s]) {
        c.lit = lit;
        c.rim = pal[1];
        c.rimK = 0.18 + b.pulse * 0.14;
        c.flash = Math.max(0, c.flash - dt * 4);
        charStep(c, dt, 3 + (30 - c.d) * 0.01);
      }
    }

    // ================================================================ คนดู
    function seatWorld(f) {
      const s = f.slot;
      if (!s) return { x: 0, d: 11 };
      if (s.i !== undefined && SEATS[s.i]) return { x: SEATS[s.i].x, d: SEATS[s.i].d };
      return restInv(s.x, s.y, 1.72);
    }
    function addAud(fid, f) {
      if (!pickOf.has(fid)) pickOf.set(fid, hsh(fid) % AUD.length);
      const kind = AUD[pickOf.get(fid)];
      const c = mkChar(kind, 1 + (hsh(fid + 'p') % 3), false);
      const home = seatWorld(f);
      Object.assign(c, { id: fid, name: f.data.name, f, slot: f.slot, home, x: home.x, d: home.d, y: 0, floorY: 0, off: hsh(fid) % 4, seq: [[1, 2, 1, 3], [2, 1, 3, 1], [1, 3, 2, 3], [3, 2, 1, 2]][hsh(fid + 's') % 4], job: null, busy: 0, jump: 0, jumpN: 0, kx: 0, tilt: 0, dizzy: 0, tag: [NaN, NaN] });
      c.flip = hsh(fid + 'f') % 2 === 1;
      setKey(c, c.key, true);
      // เพิ่งเข้าไลฟ์: เดินเข้ามาจากข้างเวที
      if (f.el.classList.contains('enter')) {
        const side = home.x < 0 ? -1 : 1;
        c.x = side * (0.36 * home.d + 1.2);
        walk(c, [{ x: home.x, d: home.d }], 2.2);
      }
      A.set(fid, c);
    }
    function dropAud(c) {
      A.delete(c.id);
      c.leaving = 1;
      G.gone ||= [];
      G.gone.push(c);
    }
    function walk(c, path, speed, done, pose) {
      c.job = { path, k: 0, speed, done, pose };
    }
    function goHome(c, done) {
      walk(c, [{ x: c.home.x, d: c.home.d }], 1.8, () => {
        c.busy = 0;
        done?.();
      });
    }
    function idleList(except) {
      return [...A.values()].filter((c) => c !== except && !c.busy && !c.job && !c.leaving);
    }

    function stepAud(t, dt, b) {
      // ซิงก์กับรายชื่อคนดูของหน้าเวที
      for (const [fid, f] of API.fans) {
        const c = A.get(fid);
        if (!c) {
          if (f.slot) addAud(fid, f);
        } else if (f.slot !== c.slot) {
          c.slot = f.slot;
          c.f = f;
          c.home = seatWorld(f);
          if (!c.busy) goHome(c);
        } else c.name = f.data.name;
      }
      for (const c of [...A.values()]) if (!API.fans.has(c.id)) dropAud(c);
      const pal = G.pal;
      const sp = G.U.uSp.value;
      for (const c of A.values()) {
        let moving = false;
        if (c.job) {
          const j = c.job;
          const p = j.path[j.k];
          const dx = p.x - c.x;
          const dd = p.d - c.d;
          const dist = Math.hypot(dx, dd);
          const st = j.speed * dt;
          if (dist <= st) {
            c.x = p.x;
            c.d = p.d;
            j.k += 1;
            if (j.k >= j.path.length) {
              c.job = null;
              j.done?.();
            }
          } else {
            c.x += (dx / dist) * st;
            c.d += (dd / dist) * st;
            moving = true;
          }
        }
        // ท่าเต้น: เปลี่ยนทุก 2 จังหวะตามลำดับของแต่ละคน
        if (!c.hold) setKey(c, `${c.kind}-${moving ? (c.job?.pose || 2) : c.seq[(Math.floor((b.n + c.off) / 2)) % c.seq.length]}`);
        let y = 0;
        if (moving) y = Math.abs(Math.sin(t * 10 + c.off)) * 0.07;
        else if (c.jumpN > 0) {
          c.jump += dt / 0.42;
          y = Math.sin(Math.min(1, c.jump) * PI) * 0.38;
          if (c.jump >= 1) {
            c.jump = 0;
            c.jumpN -= 1;
          }
        } else y = Math.pow(1 - b.ph, 2) * 0.045;
        c.y = y;
        c.kx *= Math.exp(-dt * 4);
        c.tilt *= Math.exp(-dt * 3);
        c.body.position.x = c.kx;
        c.body.rotation.z = c.tilt + (moving ? Math.sin(t * 10 + c.off) * 0.05 : c.dizzy > t ? Math.sin(t * 7) * 0.09 : Math.sin((b.n + b.ph + c.off) * PI) * 0.03);
        if (c.squash !== undefined) {
          c.squash = Math.min(1, c.squash + dt / 0.35);
          const k = c.squash;
          c.body.scale.set(k < 0.5 ? 1 - k * 1.8 : (k - 0.5) * 2 * 1.1 - (k - 0.5) * 0.2, 1 + Math.sin(k * PI) * 0.12, 1);
          if (k >= 1) {
            c.body.scale.set(1, 1, 1);
            c.squash = undefined;
          }
        }
        // แสงบนตัว: มืดกว่าบนเวที + วงไฟที่กวาดผ่าน + ขอบเรืองแสงจากไฟเวทีด้านหน้า (คนดูหันหลังให้กล้อง)
        let L = 0.6 + b.pulse * 0.05;
        const add = [0, 0, 0];
        for (let i = 3; i < 6; i++) {
          const s = sp[i];
          const r = Math.hypot(c.x - s.x, (c.d - s.y) * 0.8) / s.z;
          if (r < 1) {
            const k = (1 - r) * s.w * 0.6;
            const col = G.U.uSpC.value[i];
            add[0] += col.x * k;
            add[1] += col.y * k;
            add[2] += col.z * k;
          }
        }
        c.lit = [L + add[0], L + add[1], L + add[2]];
        c.rim = pal[(c.off + 1) % 3];
        c.rimK = 0.28 + b.pulse * 0.18;
        c.flash = Math.max(0, c.flash - dt * 5);
        charStep(c, dt, 10 + (20 - c.d) * 0.01);
      }
      // คนที่ออกจากไลฟ์: จางหาย
      if (G.gone?.length) {
        for (const c of G.gone) {
          c.alpha = (c.alpha ?? 1) - dt * 2;
          charStep(c, dt, 10);
          if (c.alpha <= 0) {
            G.scene.remove(c.grp);
            c.dead = 1;
          }
        }
        G.gone = G.gone.filter((c) => !c.dead);
      }
    }

    // ป้ายชื่อ/ฟองคำพูดของหน้าเวทีเลื่อนตามตัวละคร (ตำแหน่งบนจอจากกล้องตอนนี้)
    function proj(x, y, d) {
      const v = G.v.set(x, y, -d).project(G.cam);
      return { x: (v.x + 1) * 540, y: (1 - v.y) * 960 };
    }
    function stepTags() {
      for (const c of A.values()) {
        const f = c.f;
        if (!f?.el || !f.slot) continue;
        const p = proj(c.x + c.kx, c.y + c.h + 0.06, c.d);
        const tx = p.x - f.slot.x;
        const ty = p.y - f.slot.y;
        if (!(Math.abs(tx - c.tag[0]) <= 0.4 && Math.abs(ty - c.tag[1]) <= 0.4)) {
          c.tag = [tx, ty];
          f.el.style.translate = `${tx.toFixed(1)}px ${ty.toFixed(1)}px`;
        }
      }
      // ป้ายชื่อนักร้อง + ฟองคำพูด
      if (P.singer && scn) {
        const s = P.singer;
        const p = proj(s.x, s.y + s.h + 0.12, s.d);
        const nm = scn.querySelector('.ml-sname');
        if (nm) nm.style.transform = `translate(${(p.x - 540).toFixed(1)}px, ${(p.y - 900).toFixed(1)}px) translate(-50%, -100%)`;
        const sb = scn.querySelector('.ml-sbub');
        if (sb) sb.style.transform = `translate(${(p.x - 540).toFixed(1)}px, ${(p.y - 900).toFixed(1)}px) translate(-50%, calc(-100% - 54px))`;
      }
    }

    // ================================================================ เหตุการณ์ (คำสั่ง / ของขวัญ)
    const fx = []; // { m, t0, dur, step(k, dt), end() }
    function addFx(o) {
      o.t0 = tNow;
      fx.push(o);
      return o;
    }
    function stepFx(dt) {
      for (let i = fx.length - 1; i >= 0; i--) {
        const o = fx[i];
        const k = (tNow - o.t0) / o.dur;
        if (k >= 1) {
          o.end?.();
          if (o.m) {
            o.m.parent?.remove(o.m);
            o.m.material.dispose();
          }
          fx.splice(i, 1);
        } else o.step?.(k, dt);
      }
    }
    // ข้อความการ์ตูนเด้งขึ้น (ป๊อก! วืด!)
    function popWord(txt, x, y, d, col) {
      const m = G.mkQuad(G.word(txt, col), false, 1.3, 0.65, 20);
      addFx({ m, dur: 0.95, step(k) {
        const s = k < 0.18 ? ease(k / 0.18) * 1.15 : 1.15 - (k - 0.18) * 0.2;
        m.scale.set(1.3 * s, 0.65 * s, 1);
        m.position.set(x, y + k * 0.45, -d + 0.2);
        m.material.uniforms.uA.value = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      } });
    }
    // ดาวหมุนรอบหัว (มึน)
    function dizzyStars(c, sec) {
      for (let i = 0; i < 3; i++) {
        const m = G.mkQuad(G.starTex, false, 0.24, 0.24, 20);
        addFx({ m, dur: sec, step(k) {
          const a = tNow * 6 + (i * PI * 2) / 3;
          m.position.set(c.x + c.kx + Math.cos(a) * 0.32, c.y + c.h + 0.08 + Math.sin(a) * 0.06, -c.d + Math.sin(a) * 0.2 + 0.1);
          m.material.uniforms.uA.value = k > 0.85 ? (1 - k) / 0.15 : 1;
        } });
      }
    }
    // ของลอยเป็นโค้งจาก a ไป b
    function fly(map, a, b, sec, size, done) {
      const m = G.mkQuad(map, false, size, size, 20);
      addFx({ m, dur: sec, step(k) {
        const e = k;
        m.position.set(lerp(a[0], b[0], e), lerp(a[1], b[1], e) + Math.sin(e * PI) * 2.2, -lerp(a[2], b[2], e));
        m.rotation.z = k * PI * 3;
      }, end: done });
    }

    // ---- 🌹 ให้ดอกไม้นักร้อง (walk = เดินไปหน้ารั้วก่อน • ไม่เดิน = โยนจากที่ยืน)
    function doRose(c, walkUp, map, name) {
      if (!G) return;
      const s = P.singer;
      const who = name || c?.name || 'แฟนคลับ';
      const throwIt = (from) => {
        sfx('whoosh');
        fly(map || G.roseTex, from, [s.x, s.y + s.h * 0.6, s.d], 0.95, 0.42, () => singerThanks(who, map === G.heartTex ? '💖' : '🌹'));
      };
      if (!c) return throwIt([rnd(-2, 2), 1.6, 7.5]);
      if (c.busy || c.job) {
        if (!walkUp) throwIt([c.x, c.y + c.h, c.d]);
        return;
      }
      c.busy = 1;
      const holdRose = () => {
        const m = G.mkQuad(map || G.roseTex, false, 0.34, 0.34, 21);
        c.body.add(m);
        m.position.set(0.22, c.h * 1.02, 0.05);
        return m;
      };
      if (!walkUp) {
        c.jumpN = Math.max(c.jumpN, 1);
        const m = holdRose();
        later(0.35, () => {
          c.body.remove(m);
          throwIt([c.x, c.y + c.h, c.d]);
          c.busy = 0;
        });
        return;
      }
      const tx = clamp(lerp(c.x, s.x, 0.6), -3.6, 3.6);
      walk(c, [{ x: tx, d: DK.fence - 0.45 }], 1.9, () => {
        c.hold = true;
        setKey(c, `${c.kind}-1`);
        const m = holdRose();
        later(0.55, () => {
          c.body.remove(m);
          throwIt([c.x, c.y + c.h * 1.05, c.d]);
          later(0.8, () => {
            c.hold = false;
            goHome(c);
          });
        });
      }, 2);
    }
    function singerThanks(name, icon = '🌹', front = 0) {
      if (!G) return;
      P.wai = tNow + (front ? 3 : 2.4);
      P.waiFront = front;
      sfx('chime', 880);
      const s = P.singer;
      const p = proj(s.x, s.y + s.h * 0.75, s.d);
      for (let i = 0; i < 9; i++) API.spawn({ type: 'heart', x: p.x + rnd(-40, 40), y: p.y, vx: rnd(-90, 90), vy: rnd(-320, -180), max: rnd(1.4, 2.1), size: rnd(12, 20), color: ['#ff4fa3', '#ff2d6f', '#ff8fc8'][i % 3], fadeIn: 0.05 });
      sayAbove(`ขอบคุณ ${name} จ้า 💕`, 3);
      ledShow(`${icon} ขอบคุณ`, name, 4);
    }

    // ---- 💥 ตี: ถือขวดน้ำเดินไปตีคนดูคนอื่นแบบสุ่ม
    function doHit(c, target) {
      if (!G || !c || c.busy || c.job) return;
      let t = target && !target.busy && !target.job && target !== c ? target : null;
      if (!t) {
        // สุ่มจากคนที่อยู่ใกล้ ๆ 4 คน (เดินไม่ไกล ไม่บังเวทีนาน)
        const near = idleList(c).sort((p, q) => Math.hypot(p.x - c.x, p.d - c.d) - Math.hypot(q.x - c.x, q.d - c.d)).slice(0, 4);
        t = near[Math.floor(Math.random() * near.length)] || null;
      }
      c.busy = 1;
      const bottle = G.mkQuad(G.bottleTex, false, 0.19, 0.46, 21);
      c.body.add(bottle);
      const side = t ? (c.x <= t.x ? 1 : -1) : 1;
      bottle.position.set(side * 0.26, c.h * 0.98, 0.06);
      bottle.rotation.z = side * 0.9;
      const swing = (onHit) => {
        addFx({ dur: 0.32, step(k) {
          bottle.rotation.z = side * (0.9 - Math.sin(Math.min(1, k * 1.6) * PI * 0.5) * 2.4);
          if (k > 0.4 && !this.hit) {
            this.hit = 1;
            onHit();
          }
        }, end() {
          bottle.rotation.z = side * 0.9;
        } });
      };
      const done = () => {
        c.body.remove(bottle);
        bottle.material.dispose();
        goHome(c);
      };
      if (!t) {
        // ไม่มีใครให้ตี → ฟาดลม
        swing(() => popWord('วืด!', c.x + side * 0.4, c.y + c.h + 0.2, c.d, '#9be7ff'));
        later(0.7, () => {
          c.body.remove(bottle);
          c.busy = 0;
        });
        return;
      }
      t.busy = 1;
      const lim = 0.36 * t.d - 0.45; // ไม่ยืนตีตกขอบจอ
      walk(c, [{ x: clamp(t.x - side * 0.62, -lim, lim), d: t.d - 0.06 }], 2.6, () => {
        let n = 0;
        const one = () => {
          swing(() => {
            sfx('pop');
            t.flash = 0.85;
            t.kx = side * 0.22;
            t.tilt = -side * 0.32;
            popWord(['ป๊อก!', 'โป๊ก!', 'ตุ้บ!'][Math.floor(Math.random() * 3)], t.x + side * 0.1, t.y + t.h + 0.25, t.d);
            n += 1;
            if (n === 1) {
              t.dizzy = tNow + 2.4;
              dizzyStars(t, 2.4);
              const pp = proj(t.x, t.y + t.h, t.d);
              for (let i = 0; i < 6; i++) API.spawn({ type: 'spark', x: pp.x, y: pp.y, vx: rnd(-260, 260), vy: rnd(-300, -60), g: 400, max: 0.6, size: rnd(3, 5), color: '#ffe14d' });
            }
          });
        };
        one();
        later(0.45, one);
        later(1.0, () => {
          t.busy = 0;
          done();
        });
      }, 1);
    }

    // ---- 🔄 เปลี่ยนตัวละคร
    function doSwap(c) {
      if (!G || !c) return;
      const i = ((pickOf.get(c.id) ?? 0) + 1) % AUD.length;
      pickOf.set(c.id, i);
      c.squash = 0;
      sfx('pop');
      const p = proj(c.x, c.y + c.h * 0.5, c.d);
      for (let k = 0; k < 6; k++) API.spawn({ type: 'smoke', x: p.x + rnd(-40, 40), y: p.y + rnd(-60, 60), vx: rnd(-40, 40), vy: rnd(-60, -20), max: 0.9, size: rnd(40, 60) });
      for (let k = 0; k < 8; k++) API.spawn({ type: 'spark', x: p.x, y: p.y, vx: rnd(-300, 300), vy: rnd(-300, 100), g: 200, max: 0.7, size: rnd(3, 5), color: ['#ffe14d', '#ff6ad5', '#7df9ff'][k % 3] });
      later(0.17, () => setKind(c, AUD[i], 1 + (Math.floor(Math.random() * 3))));
    }

    function jumpAll(n = 3) {
      for (const c of A.values()) if (!c.job) c.jumpN = Math.max(c.jumpN, n);
    }

    function onCmd(d) {
      if (!G) return;
      const c = A.get(d.id);
      if (d.zone === 'rose') doRose(c, true);
      else if (d.zone === 'hit') doHit(c);
      else if (d.zone === 'swap') doSwap(c);
      else if (d.zone === 'singer') {
        if (!switchSinger(d.name)) API?.toast('🎤 เพิ่งเปลี่ยนนักร้องไป รอสักครู่นะ');
      } else if (d.zone === 'dance' && c && !c.job) {
        c.jumpN = Math.max(c.jumpN, 4);
        const p = proj(c.x, c.y + c.h, c.d);
        for (let k = 0; k < 5; k++) API.spawn({ type: 'spark', x: p.x, y: p.y, vx: rnd(-200, 200), vy: rnd(-260, -80), g: 300, max: 0.8, size: rnd(3, 5), color: '#ffd23f' });
      }
    }

    // ---- ของขวัญ
    const lastGift = new Map();
    function gift(f, user) {
      const tier = Number(String(f.kind).slice(2)) || 1;
      const key = (user?.id || '?') + '|' + f.icon;
      if (performance.now() - (lastGift.get(key) || 0) < 1500) return;
      lastGift.set(key, performance.now());
      giftTier(tier, user, f.icon, f.label);
    }
    function giftTier(tier, user, icon, label) {
      if (!G) return;
      const c = user?.id ? A.get(user.id) : null;
      const name = user?.name || 'แฟนคลับ';
      if (tier === 1) {
        doRose(c, false, icon === '💖' ? G.heartTex : icon === '💐' ? G.bouquetTex : G.roseTex, name);
        return;
      }
      ledShow(`${icon} ${name}`, label || '', 4);
      if (c && !c.job) c.jumpN = Math.max(c.jumpN, 3);
      if (tier === 2) {
        P.front = tNow + 6;
        P.hype = tNow + 6;
        later(icon === '🙏' ? 1.6 : 4.4, () => {
          singerThanks(name, icon, 1);
        });
        if (icon === '🎊' || icon !== '🙏') confetti(icon === '🎊' ? 140 : 70);
        G.strobe = tNow + 1.2;
        return;
      }
      // ใหญ่: พลุ เลเซอร์ กล้องเข้าใกล้เวที ทุกคนกระโดด แล้วทั้งเวทีไหว้ขอบคุณ
      API.bigShow?.(user, label || 'ม่วนคักแท้!');
      API.fireworks?.(8, { y0: 1150, yMin: 180, yMax: 620 });
      laserShow(9);
      confetti(180);
      jumpAll(5);
      P.front = tNow + 9;
      P.hype = tNow + 9;
      G.push = tNow + 6;
      G.strobe = tNow + 2;
      later(6, () => {
        singerThanks(name, icon || '👑', 1);
      });
    }
    function confetti(n) {
      const cols = ['#ff3d8b', '#ffd23f', '#3de0ff', '#7dff6b', '#ffffff', '#b56bff'];
      for (let i = 0; i < n; i++) API.spawn({ type: 'confetti', x: rnd(80, 1000), y: rnd(-200, 200), vx: rnd(-60, 60), vy: rnd(120, 300), g: 60, drag: 0.4, max: rnd(3, 5), size: rnd(10, 18), rot: rnd(0, 6), vr: rnd(-6, 6), color: cols[i % cols.length] });
    }
    function laserShow(sec) {
      if (G) G.laserUntil = Math.max(G.laserUntil || 0, tNow + sec);
    }

    // ---- จอ LED: ขึ้นชื่อ/ข้อความ
    function ledShow(l1, l2, sec) {
      if (!G) return;
      const L = G.led;
      const c = L.cv.getContext('2d');
      c.clearRect(0, 0, 512, 295);
      const g = c.createLinearGradient(0, 0, 0, 295);
      g.addColorStop(0, 'rgba(40,0,60,.92)');
      g.addColorStop(1, 'rgba(120,0,70,.92)');
      c.fillStyle = g;
      c.fillRect(0, 0, 512, 295);
      c.strokeStyle = '#ffd23f';
      c.lineWidth = 8;
      c.strokeRect(10, 10, 492, 275);
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      const fit = (txt, max, size, y, col) => {
        let s = size;
        do {
          c.font = `800 ${s}px Kanit, "Leelawadee UI", sans-serif`;
          s -= 4;
        } while (c.measureText(txt).width > max && s > 20);
        c.lineWidth = 8;
        c.strokeStyle = 'rgba(0,0,0,.6)';
        c.strokeText(txt, 256, y);
        c.fillStyle = col;
        c.fillText(txt, 256, y);
      };
      if (l2) {
        fit(String(l1), 460, 70, 100, '#ffe9a8');
        fit(String(l2), 470, 84, 200, '#ffffff');
      } else fit(String(l1), 470, 96, 150, '#ffffff');
      L.tex.needsUpdate = true;
      L.until = tNow + sec;
    }
    // ฟองคำพูดของนักร้อง
    let sayT = 0;
    function sayAbove(text, sec) {
      const b = scn?.querySelector('.ml-sbub');
      if (!b) return;
      b.textContent = text;
      b.classList.add('on');
      clearTimeout(sayT);
      sayT = setTimeout(() => b.classList.remove('on'), sec * 1000);
    }

    // ================================================================ ทุกเฟรม
    let lastT = 0;
    let pid = -1;
    function frame(t, b) {
      const dt = clamp(t - (lastT || t), 0, 0.1);
      lastT = t;
      tNow = t;
      for (let i = timers.length - 1; i >= 0; i--) if (t >= timers[i].at) {
        const fn = timers[i].fn;
        timers.splice(i, 1);
        try {
          fn();
        } catch (e) {
          console.warn('molam fx', e);
        }
      }
      if (!G?.ready) return;
      const { U, cam, R } = G;
      b = b || { n: Math.floor(t * 2.27), ph: (t * 2.27) % 1, pulse: Math.pow(1 - ((t * 2.27) % 1), 3) };
      // ชุดสีเปลี่ยนทุก 32 จังหวะ
      const sec = Math.floor(b.n / 32);
      if (sec !== pid) {
        pid = sec;
        G.pal = PALS[sec % PALS.length].map(hex3);
      }
      const pal = G.pal;
      const big = (G.laserUntil || 0) > t;
      U.uTime.value = t;
      U.uBeat.value = b.pulse;
      U.uHue.value = (t * 0.25 + sec * 1.3) % (PI * 2);
      const L = G.led;
      L.k = lerp(L.k, L.until > t ? 1 : 0, 1 - Math.exp(-dt * 6));
      U.uTxt.value = L.k;
      U.uDim.value = 0.9 + b.pulse * 0.1;
      const strobe = (G.strobe || 0) > t ? (b.n % 2 === 0 && b.ph < 0.25 ? 0.35 : 0) : 0;
      U.uStrobe.value = strobe;
      U.uWash.value.set(...pal[0]);
      // วงไฟบนพื้น: 3 วงบนเวที (ตามนักร้อง/หางเครื่อง) + 3 วงกวาดคนดู
      const sp = U.uSp.value;
      const spc = U.uSpC.value;
      const s0 = P.singer;
      sp[0].set(s0.x, s0.d, 1.3, 0.9);
      sp[1].set(Math.sin(t * 0.7) * 3.2, 18 + Math.sin(t * 0.5) * 1.2, 1.6, 0.7 + b.pulse * 0.4);
      sp[2].set(Math.sin(t * 0.6 + 2) * 3.4, 19 + Math.cos(t * 0.45) * 1.5, 1.6, 0.7 + b.pulse * 0.4);
      for (let i = 0; i < 3; i++) sp[3 + i].set(Math.sin(t * (0.35 + i * 0.1) + i * 2.1) * 3.6, 11 + Math.sin(t * (0.3 + i * 0.07) + i) * 1.8, 1.25, big ? 1.1 : 0.75);
      spc[0].set(1, 0.95, 0.85);
      for (let i = 1; i < 6; i++) spc[i].set(...pal[i % 3]);

      // ลำแสง: เปลี่ยนท่าทุก 8 จังหวะ
      const mode = Math.floor(b.n / 8) % 5;
      for (const bm of G.beams) {
        const i = bm.i;
        const k = i - 2.5;
        let tx;
        let ty = 0;
        let td;
        if (mode === 0) {
          tx = Math.sin(t * 0.8 + i * 1.1) * 4.5;
          td = 10.5 + Math.sin(t * 0.6 + i) * 2.5;
        } else if (mode === 1) {
          tx = k * 3.4 * (0.6 + 0.4 * Math.sin(t * 1.2));
          td = 5.5;
          ty = 1.5;
        } else if (mode === 2) {
          tx = k * 1.1 + Math.sin(t * 2 + i) * 0.4;
          ty = DK.deckY;
          td = 17.8;
        } else if (mode === 3) {
          tx = -k * 2.8 + Math.sin(t) * 1.2;
          td = 9;
        } else {
          tx = Math.cos(t * 1.4 + i * 1.05) * 3.2;
          td = 12 + Math.sin(t * 1.4 + i * 1.05) * 3;
        }
        bm.tgt.set(tx, ty, -td);
        const dir = bm.tgt.clone().sub(bm.m.position);
        const len = dir.length();
        dir.normalize();
        bm.m.quaternion.setFromUnitVectors(G.down || (G.down = new G.THREE.Vector3(0, -1, 0)), dir);
        bm.m.scale.set(len * 0.09, len, len * 0.09);
        const col = pal[(i + Math.floor(b.n / 4)) % 3];
        bm.m.material.uniforms.uC.value.set(...col);
        bm.m.material.uniforms.uI.value = (big ? 0.34 : 0.2) + b.pulse * 0.12;
        bm.glow.material.uniforms.uC.value.set(...col);
        bm.glow.material.uniforms.uA.value = 0.65 + b.pulse * 0.35;
      }
      // เลเซอร์: ทุก 4 ชุดเพลง 1 ชุด หรือตอนของขวัญใหญ่
      const lzOn = big || sec % 4 === 2;
      for (const lz of G.lasers) {
        lz.m.visible = lzOn;
        if (!lzOn) continue;
        const i = lz.i;
        const a = (i - 5.5) / 5.5;
        const tgt = new G.THREE.Vector3(a * 9 + Math.sin(t * 0.9) * 3, 1.5 + Math.sin(t * 1.7 + i * 0.5) * 2.2 + 1.8, 1.5);
        const dir = tgt.sub(lz.m.position);
        const len = dir.length();
        lz.m.quaternion.setFromUnitVectors(G.down, dir.normalize());
        lz.m.scale.set(1, len, 1);
        const col = [[0.2, 1, 0.3], [1, 0.15, 0.25], [0.3, 0.5, 1]][(i + Math.floor(b.n / 8)) % 3];
        lz.m.material.uniforms.uC.value.set(...col);
        lz.m.material.uniforms.uI.value = 0.55 + b.pulse * 0.3;
      }
      G.foot.forEach((g, i) => {
        g.material.uniforms.uC.value.set(...pal[(i + Math.floor(b.n / 2)) % 3]);
        g.material.uniforms.uA.value = 0.45 + b.pulse * 0.55 * ((i + b.n) % 2 ? 1 : 0.5);
      });
      for (const g of G.haze) {
        const u = g.userData;
        g.position.set(u.x0 + Math.sin(t * u.sp + u.ph) * 1.5, u.y0 + Math.sin(t * u.sp * 0.7 + u.ph) * 0.4, -u.d);
        g.material.uniforms.uC.value.set(...pal[0]);
        g.material.uniforms.uA.value = 0.05 + b.pulse * 0.03;
      }

      stepPerformers(t, dt, b);
      stepAud(t, dt, b);
      stepFx(dt);

      // กล้อง: โยกช้า ๆ (เห็นมิติ) + ดันเข้าเวทีตอนของขวัญใหญ่
      const push = ease(clamp(((G.push || 0) - t) / 1.2, 0, 1));
      G.pk = lerp(G.pk || 0, push, 1 - Math.exp(-dt * 2));
      const z = V0.z * (1 + 0.025 * Math.sin(t * 0.09)) * (1 + G.pk * 0.2);
      const cx = V0.cx + Math.sin(t * 0.05) * 8;
      const cy = V0.cy - G.pk * 70;
      const w = W / z;
      const h = H / z;
      cam.position.set(Math.sin(t * 0.13) * 0.32 + Math.sin(t * 0.071) * 0.12, C0.hc + Math.sin(t * 0.11) * 0.1, -(0.5 + 0.5 * Math.sin(t * 0.047)) * 0.6);
      cam.setViewOffset(W, HF, cx - w / 2, cy - h / 2 + (HF / 2 - C0.yh), w, h);
      cam.updateMatrixWorld();
      R.render(G.scene, cam);
      stepTags();
    }

    // ================================================================ หน้าจอ (HTML)
    function css() {
      const p = hud().palette || {};
      const r = `#root.theme-${id}`;
      return `
        ${r} { --glass: ${p.panel}; --panel-border: rgba(255,255,255,.2); --heading: ${p.soft}; --toast-bg: ${p.accent}; --toast-glow: ${p.accent};
          --big-grad: linear-gradient(180deg, #ffffff, ${p.accent2}); --big-bg: radial-gradient(circle at 50% 45%, rgba(0,0,0,.2), rgba(0,0,0,.66) 70%);
          --card-bg: ${p.panel}; --card-top: 700px; --team-top: 640px; --fortune-top: 720px; }
        ${r} #header, ${r} #songPanel, ${r} #giftPanel, ${r} #topPanel { display: none !important; }
        ${r} #hype { left: 24px; width: 420px; top: 448px; padding: 10px 14px 12px; border-radius: 22px; background: ${p.panel}; border: 2px solid rgba(255,255,255,.18); }
        ${r} #hype .label { font-size: 21px; }
        ${r} #hype .bar { height: 16px; }
        ${r} #feed { top: 615px !important; left: 24px !important; right: auto; width: 420px; }
        ${r} #toasts { top: 610px; }
        ${r} .fan .body, ${r} .fan .crown, ${r} .fan .wear-pet { display: none !important; }
        ${r} .fan .tag { top: -40px; }
        ${r} .fan .bubble { bottom: 46px !important; }
        .ml-hud { position: absolute; inset: 0; pointer-events: none; font-family: 'Kanit', 'Leelawadee UI', sans-serif; color: #fff; z-index: 3; }
        .ml-hud * { box-sizing: border-box; }
        /* ป้ายชื่อไลฟ์แบบบ้าน ๆ: กรอบลายผ้าขาวม้า + กระดานเขียว ขอบทอง + หลอดไฟปิงปองห้อยเป็นโค้งด้านบน */
        .ml-hud .bulbs { position: absolute; left: 50%; top: 10px; width: 820px; height: 80px; transform: translateX(-50%); }
        .ml-hud .bulbs svg { position: absolute; inset: 0; overflow: visible; }
        .ml-hud .bulb { position: absolute; width: 24px; height: 28px; border-radius: 50% 50% 46% 46%; transform: translate(-50%, 0); animation: mlBlink 1.1s steps(1) infinite; }
        .ml-hud .bulb::before { content: ''; position: absolute; left: 8px; top: -7px; width: 8px; height: 8px; background: #2a2a2a; border-radius: 2px; }
        @keyframes mlBlink { 50% { filter: brightness(.4); box-shadow: none; } }
        .ml-hud .ttl { position: absolute; left: 50%; top: 70px; transform: translateX(-50%); max-width: 1000px; padding: 20px; border-radius: 16px;
          background: repeating-linear-gradient(0deg, rgba(210,30,50,.9) 0 16px, rgba(255,255,255,.95) 16px 22px, rgba(210,30,50,.9) 22px 38px, rgba(40,70,170,.9) 38px 44px),
                      repeating-linear-gradient(90deg, #d21e32 0 16px, #fff 16px 22px, #d21e32 22px 38px, #2846aa 38px 44px);
          background-blend-mode: multiply; box-shadow: 0 14px 26px rgba(0,0,0,.6); }
        .ml-hud .ttl .in { padding: 10px 48px 12px; border-radius: 8px; text-align: center; white-space: nowrap;
          background: radial-gradient(120% 120% at 50% 0%, #2c4a22, #18301a 70%, #0f2010); box-shadow: inset 0 0 0 3px #f2d27a, inset 0 0 22px rgba(0,0,0,.6); }
        .ml-hud .ttl b { display: block; font-size: 70px; line-height: 1.05; font-weight: 800; color: #fff; text-shadow: 0 4px 0 #0a1606; overflow: hidden; text-overflow: ellipsis; }
        .ml-hud .ttl b span { color: #ffd84a; }
        .ml-hud .ttl small { display: block; margin-top: 2px; font-size: 23px; color: #ffe9a8; overflow: hidden; text-overflow: ellipsis; }
        .ml-hud .ttl small:empty { display: none; }
        .ml-hud .now { position: absolute; left: 50%; top: 398px; transform: translateX(-50%); padding: 6px 22px; border-radius: 99px; background: ${p.panel}; border: 2px solid rgba(255,255,255,.2); font-size: 25px; white-space: nowrap; }
        .ml-hud .now b { color: ${p.soft}; }
        .ml-scn { position: absolute; inset: 0; pointer-events: none; font-family: 'Kanit', 'Leelawadee UI', sans-serif; color: #fff; }
        #root.kzoomed .ml-hud { opacity: 0; }
        .ml-hud { transition: opacity .5s; }
        .ml-scn .ml-sname { position: absolute; left: 540px; top: 900px; padding: 3px 16px 5px; border-radius: 99px; font-size: 24px; font-weight: 700; white-space: nowrap;
          background: linear-gradient(90deg, ${p.accent}, ${p.accent2}); box-shadow: 0 6px 18px rgba(0,0,0,.4); will-change: transform; }
        .ml-scn .ml-sbub { position: absolute; left: 540px; top: 900px; max-width: 520px; padding: 8px 20px 10px; border-radius: 22px; background: #fff; color: #2a1030; font-size: 28px; font-weight: 700;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity: 0; transition: opacity .25s; box-shadow: 0 8px 22px rgba(0,0,0,.35); will-change: transform; }
        .ml-scn .ml-sbub.on { opacity: 1; }
        /* กล่องคำสั่ง: อยู่บนจอใต้ชื่อไลฟ์ (ด้านล่างโดนช่องคอมเมนต์/ของขวัญของ TikTok บัง) */
        .ml-hud .bot { position: absolute; left: 60px; right: 60px; top: 272px; padding: 10px 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px;
          background: ${p.panel}; border: 2px solid rgba(255,255,255,.2); border-radius: 28px; }
        .ml-hud .bot div { display: flex; gap: 10px; align-items: center; font-size: 22px; line-height: 1.25; white-space: nowrap; overflow: hidden; }
        .ml-hud .bot i { font-style: normal; font-size: 28px; flex: none; }
        .ml-hud .bot b { color: ${p.soft}; }
        /* รายการของขวัญ (ขวาบน ใต้กล่องคำสั่ง) */
        .ml-hud .gl { position: absolute; right: 18px; top: 448px; width: 300px; padding: 8px 12px 10px; border-radius: 22px; background: ${p.panel}; border: 2px solid rgba(255,255,255,.2); }
        .ml-hud .gl h4 { margin: 0 0 2px; font-size: 21px; color: ${p.soft}; }
        .ml-hud .gl div { display: flex; align-items: center; gap: 6px; font-size: 16.5px; line-height: 1.5; white-space: nowrap; overflow: hidden; }
        .ml-hud .gl div span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
        .ml-hud .gl div em { flex: none; font-style: normal; color: ${p.soft}; font-size: 15px; }
        .ml-hud .gl .gicon { width: 28px; height: 28px; vertical-align: -7px; }
        .ml-hud .gl .gi { flex: none; width: 28px; text-align: center; font-size: 22px; }
        .ml-hud .gl.flash div.hot { color: #ffe14d; }
      `;
    }
    // รายการของขวัญ: ไอคอน + สิ่งที่เกิดบนเวที (เรียงถูกไปแพง ไม่โชว์ราคา)
    function giftRows() {
      const efx = meta().effects || {};
      const gifts = [...(API?.t?.gifts || meta().defaults?.gifts || [])].sort((a, b) => a.diamonds - b.diamonds).slice(0, 9);
      return gifts.map((g) => {
        const e = efx[g.effect] || {};
        const ic = window.giftIconHtml ? window.giftIconHtml(g.name, e.icon || '🎁') : esc(e.icon || '🎁');
        return `<div><i class="gi">${ic}</i><span>${esc(e.label || g.name)}</span></div>`;
      }).join('');
    }
    // ชื่อไลฟ์: คำสุดท้ายเป็นสีเหลือง (หมอลำ LIVE → LIVE สีเหลือง)
    function titleHtml(txt) {
      const w = String(txt).trim().split(/\s+/);
      return w.length > 1 ? `${esc(w.slice(0, -1).join(' '))} <span>${esc(w[w.length - 1])}</span>` : esc(txt);
    }
    // หลอดไฟปิงปองห้อยเป็นโค้ง กะพริบสลับกัน
    function bulbs() {
      const BW = 820;
      const n = 15;
      const cols = ['#ff3b3b', '#ffd23f', '#3de06a', '#3da5ff', '#ff6ad5', '#ff9a1f'];
      const y = (k) => 8 + Math.sin(k * Math.PI) * 46;
      let d = '';
      for (let i = 0; i <= 40; i++) d += `${i ? 'L' : 'M'}${((i / 40) * BW).toFixed(1)} ${y(i / 40).toFixed(1)}`;
      let h = `<svg width="${BW}" height="80"><path d="${d}" stroke="#1d1d1d" stroke-width="3" fill="none"/></svg>`;
      for (let i = 0; i < n; i++) {
        const k = (i + 0.5) / n;
        const c = cols[i % cols.length];
        h += `<i class="bulb" style="left:${(k * BW).toFixed(1)}px;top:${(y(k) + 4).toFixed(1)}px;background:radial-gradient(circle at 40% 35%, #fff 0 3px, ${c} 7px);box-shadow:0 0 14px ${c},0 0 26px ${c};animation-delay:${(i % 2) * 0.55}s"></i>`;
      }
      return h;
    }
    function render() {
      if (!el) return;
      const t = API?.t || {};
      const d = meta().defaults || {};
      const cmds = hud().cmds || [];
      const sg = singers()[P.si] || singers()[0];
      const nm = scn?.querySelector('.ml-sname');
      if (nm) nm.textContent = '🎤 ' + sg.name;
      el.innerHTML = `
        <div class="bulbs">${bulbs()}</div>
        <div class="ttl"><div class="in"><b>${titleHtml(t.title || d.title || 'หมอลำ LIVE')}</b><small>${esc(t.subtitle || d.subtitle || '')}</small></div></div>
        <div class="now">🎤 ตอนนี้ร้องโดย <b>${esc(sg.name)}</b></div>
        <div class="gl"><h4>${esc(t.giftsTitle || meta().texts?.gifts || '🎁 ส่งของขวัญ')}</h4>${giftRows()}</div>
        <div class="bot">${cmds.map((c) => `<div><i>${esc(c.emoji)}</i><span>พิมพ์ <b>${esc(c.c)}</b> ${esc(c.a)}</span></div>`).join('')}</div>`;
    }

    return T;
  };
})();
