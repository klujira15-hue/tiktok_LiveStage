/* ธีม "หมูกระทะริมทาง" — ฉาก 3D low-poly (three.js) ข้อมูลธีมอยู่ใน mookatatheme.js
 * ไฟล์ธีม public/themes/mookata.js เรียก window.makeMookataTheme('mookata')
 * คนดู = ที่นั่งรอบโต๊ะ (TH.slots: ตำแหน่งบนจอคำนวณจากกล้องเดียวกับฉาก 3D) → หน้าเวทีวางป้ายชื่อ/ฟองคำพูด ส่วนตัวละครวาดเป็น 3D
 * ลื่นไหล: ใช้วัสดุ/รูปทรงร่วมกัน • ไม่สร้างออบเจกต์ใหม่ทุกเฟรม • เครื่องช้า (ระบบลดคุณภาพของหน้าเวที) → ลดความละเอียด/ปิดเงา/ลดไฟ
 */
(() => {
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const meta = () => window.__stage?.api?.meta || {};
  const hud = () => meta().hud || {};

  // ---------------- กล้อง (ใช้ทั้งฉาก 3D และคำนวณตำแหน่งป้ายชื่อบนจอ)
  const CAM = { pos: [0, 9.6, 15.2], at: [0, 3.0, -4.6], fov: 58 };
  const W = 1080;
  const H = 1920;
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (a) => {
    const l = Math.hypot(...a);
    return [a[0] / l, a[1] / l, a[2] / l];
  };
  const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const FWD = nrm(sub(CAM.at, CAM.pos));
  const RGT = nrm(crs(FWD, [0, 1, 0]));
  const UP = crs(RGT, FWD);
  const TANY = Math.tan((CAM.fov * Math.PI) / 360);
  const TANX = TANY * (W / H);
  function project(p) {
    const d = sub(p, CAM.pos);
    const z = dot(d, FWD);
    return { x: ((dot(d, RGT) / (z * TANX) + 1) / 2) * W, y: ((1 - dot(d, UP) / (z * TANY)) / 2) * H, z };
  }
  // จุดบนจอ → จุดบนพื้น (คนที่ยืนรอโต๊ะ)
  function floorAt(sx, sy) {
    const nx = (sx / W) * 2 - 1;
    const ny = 1 - (sy / H) * 2;
    const dir = nrm([FWD[0] + RGT[0] * nx * TANX + UP[0] * ny * TANY, FWD[1] + RGT[1] * nx * TANX + UP[1] * ny * TANY, FWD[2] + RGT[2] * nx * TANX + UP[2] * ny * TANY]);
    const t = -CAM.pos[1] / dir[1];
    return [CAM.pos[0] + dir[0] * t, 0, CAM.pos[2] + dir[2] * t];
  }

  // ---------------- โต๊ะ + ที่นั่ง (หลังโต๊ะ 3 = หันหน้ามาหากล้อง, หน้าโต๊ะ 2 = หันหลัง)
  const TABLES = [
    { x: -4.4, z: -6.2 }, { x: 0, z: -6.2 }, { x: 4.4, z: -6.2 },
    { x: -2.8, z: -1.6 }, { x: 2.8, z: -1.6 },
    { x: -2.7, z: 2.8 }, { x: 2.7, z: 2.8, vip: true },
  ];
  const SEATS = [];
  TABLES.forEach((t, ti) => {
    for (let i = 0; i < 3; i++) {
      const a = Math.PI + 0.55 + (i / 2) * (Math.PI - 1.1);
      SEATS.push({ t: ti, x: t.x + Math.cos(a) * 1.45, z: t.z + Math.sin(a) * 1.0 - 0.15, face: true, vip: !!t.vip });
    }
    for (const dx of [-0.62, 0.62]) SEATS.push({ t: ti, x: t.x + dx, z: t.z + 1.35, face: false, vip: !!t.vip });
  });
  const SLOTS = SEATS.map((s) => {
    const p = project([s.x, 2.18, s.z]);
    return { x: p.x, y: p.y, s: Math.max(0.7, Math.min(1.25, 15 / p.z)), vip: s.vip };
  });
  // คนเกินที่นั่ง: ยืนรอโต๊ะตรงทางเดินกลางร้าน
  const ROWS = [{ y: 1450, s: 1.1, n: 4, x0: 430, x1: 650, jy: 30 }];

  const SKIN = ['#f1c7a0', '#e0ac85', '#c98e66', '#f6d2b0'];
  const HAIR = ['#2a1f1a', '#3a2418', '#1a1a22', '#5a3a22'];
  const hsh = (s) => {
    let h = 2166136261;
    for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return h >>> 0;
  };

  window.makeMookataTheme = function makeMookataTheme(id) {
    let API = null;
    let el = null;
    let G = null; // ของ three.js ทั้งหมด (โหลดเสร็จแล้ว)
    let loading = null;
    const st = { flash: 0, last: 0, lv: 1 };

    if (window.SceneLevels?.themes) window.SceneLevels.themes[id] = { names: { 2: 'โคมไฟสีเพิ่ม ร้านคึกคัก', 3: 'ป้ายไฟ “ร้านแตก!” + พลุ' }, s2() {}, s3() {} };

    const T = {
      bpm: 124,
      fanH: 1,
      rows: ROWS,
      slots: SLOTS,
      get css() {
        return css();
      },
      fanSvg() {
        return '';
      },
      init(api) {
        API = api;
        el = document.createElement('div');
        el.className = 'mk-hud';
        document.getElementById('ui').appendChild(el);
        render(api);
        loading ||= boot(api);
      },
      drawStatic(c) {
        c.fillStyle = '#1a1030';
        c.fillRect(0, 0, 1080, 1920);
      },
      drawBg(_c, t) {
        if (G) frame(t / 1000);
      },
      effects: new Proxy({}, {
        get(_o, key) {
          const fx = meta().effects?.[key];
          if (!fx) return undefined;
          return (user, n, label, api) => gift(fx, user, n, label, api);
        },
        has: (_o, key) => !!meta().effects?.[key],
        ownKeys: () => Object.keys(meta().effects || {}),
        getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
      }),
      onEvent(d, api) {
        if (d.type === 'cmd') return onCmd(d, api);
        if (d.type === 'goal') {
          api.toast(`🎯 ${d.key === 'coins' ? 'เพชร' : 'ใจ'}ครบ! → ${d.reward}`, 'big');
          if (d.key === 'coins') buffet(api, null);
          else cheersAll(api);
        }
      },
      onLike(d, api) {
        const p = api.fanPos(d.id);
        api.spawn({ type: 'heart', x: p ? p.x : api.rand(200, 880), y: p ? p.y - 60 : 1300, vy: api.rand(-300, -200), max: 1.8, size: api.rand(12, 18), color: '#ff4fa3', fadeIn: 0.1 });
      },
    };

    // ================================================================ สร้างฉาก 3D
    async function boot(api) {
      let THREE;
      try {
        THREE = await import('/vendor/three/build/three.module.js');
      } catch (e) {
        console.warn('mookata: three.js โหลดไม่ได้', e);
        return;
      }
      const cv = document.createElement('canvas');
      cv.id = 'mk3d';
      cv.style.cssText = 'position:absolute;left:0;top:0;width:1080px;height:1920px;';
      document.getElementById('bg').after(cv);
      let renderer;
      try {
        renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
      } catch (e) {
        cv.remove();
        console.warn('mookata: WebGL ใช้ไม่ได้', e);
        return;
      }
      renderer.setPixelRatio(1);
      renderer.shadowMap.enabled = true;
      // เงาคำนวณใหม่แค่บางเฟรม (คน/โต๊ะแทบไม่ขยับ) • ไม่เคยเปิด/ปิดเงากลางไลฟ์ (จะทำให้ shader คอมไพล์ใหม่ = ภาพค้าง)
      renderer.shadowMap.type = THREE.PCFShadowMap;
      renderer.shadowMap.autoUpdate = false;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#1a1030');
      scene.fog = new THREE.Fog('#1a1030', 26, 46);
      const cam = new THREE.PerspectiveCamera(CAM.fov, W / H, 0.1, 100);
      cam.position.set(...CAM.pos);
      cam.lookAt(...CAM.at);

      // วัสดุ/รูปทรงใช้ร่วมกัน
      const mats = new Map();
      const M = (color, o) => {
        const k = color + (o ? JSON.stringify(o) : '');
        if (!mats.has(k)) mats.set(k, o?.std ? new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: o.r ?? 0.4, metalness: o.m ?? 0.5 }) : new THREE.MeshLambertMaterial({ color, flatShading: true, ...(o?.e ? { emissive: o.e } : {}) }));
        return mats.get(k);
      };
      const bmats = new Map();
      const B = (c) => (bmats.has(c) || bmats.set(c, new THREE.MeshBasicMaterial({ color: c })), bmats.get(c));
      const geo = {
        body: new THREE.CylinderGeometry(0.3, 0.38, 0.85, 7), head: new THREE.IcosahedronGeometry(0.3, 1), hair: new THREE.SphereGeometry(0.31, 7, 5, 0, Math.PI * 2, 0, Math.PI / 2),
        arm: new THREE.BoxGeometry(0.12, 0.55, 0.12), stool: new THREE.CylinderGeometry(0.26, 0.24, 0.55, 7), glass: new THREE.CylinderGeometry(0.1, 0.08, 0.26, 7),
        leg: new THREE.CylinderGeometry(0.1, 0.1, 0.9, 6), crown: new THREE.CylinderGeometry(0.2, 0.24, 0.18, 5, 1, true), cap: new THREE.CylinderGeometry(0.32, 0.32, 0.12, 8),
        meat: new THREE.BoxGeometry(0.2, 0.025, 0.09), shrimp: new THREE.TorusGeometry(0.1, 0.04, 5, 8, Math.PI * 1.3), plate: new THREE.CylinderGeometry(0.22, 0.2, 0.03, 12),
        veg: new THREE.IcosahedronGeometry(0.05, 0), bulb: new THREE.IcosahedronGeometry(0.12, 0),
      };
      // ของที่ไม่ขยับ (bakeOn) → รวมเป็นก้อนเดียวต่อวัสดุตอนสร้างเสร็จ: วาดไม่กี่สิบครั้งแทนหลายร้อยครั้งต่อเฟรม
      let bakeOn = true;
      const bakeList = [];
      const add = (g, m, x, y, z, parent = scene, cast = false) => {
        const o = new THREE.Mesh(g, m);
        o.position.set(x, y, z);
        o.castShadow = cast;
        o.receiveShadow = true;
        parent.add(o);
        if (bakeOn && parent === scene) bakeList.push(o);
        return o;
      };
      const bake = () => {
        const groups = new Map();
        for (const o of bakeList) {
          const k = o.material.uuid + (o.castShadow ? '+' : '');
          if (!groups.has(k)) groups.set(k, []);
          groups.get(k).push(o);
        }
        for (const list of groups.values()) {
          const parts = list.map((o) => {
            o.updateMatrixWorld(true);
            const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
            g.applyMatrix4(o.matrixWorld);
            scene.remove(o);
            return g;
          });
          const n = parts.reduce((s, g) => s + g.attributes.position.count, 0);
          const pos = new Float32Array(n * 3);
          const nor = new Float32Array(n * 3);
          const hasUv = parts.every((g) => g.attributes.uv);
          const uv = hasUv ? new Float32Array(n * 2) : null;
          let off = 0;
          for (const g of parts) {
            pos.set(g.attributes.position.array, off * 3);
            nor.set(g.attributes.normal.array, off * 3);
            if (uv) uv.set(g.attributes.uv.array, off * 2);
            off += g.attributes.position.count;
            g.dispose();
          }
          const mg = new THREE.BufferGeometry();
          mg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
          mg.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
          if (uv) mg.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
          const m = new THREE.Mesh(mg, list[0].material);
          m.castShadow = list[0].castShadow;
          m.receiveShadow = true;
          m.matrixAutoUpdate = false;
          scene.add(m);
        }
        bakeList.length = 0;
      };
      let seed = 7;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      const pick = (a) => a[Math.floor(rnd() * a.length)];

      // พื้น ผนัง หลังคา ตึก
      add(new THREE.PlaneGeometry(40, 40), M('#5a4034'), 0, 0, -2).rotation.x = -Math.PI / 2;
      add(new THREE.BoxGeometry(18, 6.2, 0.4), M('#5a2e24'), 0, 3.1, -10.2);
      for (let x = -8.6; x <= 8.6; x += 0.45) add(new THREE.BoxGeometry(0.42, 0.12, 3.0), M(Math.round(x / 0.45) % 2 ? '#8a8f99' : '#7a7f89'), x, 7.1, -8.9).rotation.x = -0.12;
      for (let i = 0; i < 9; i++) {
        const h = 6 + rnd() * 6;
        const w = 2.2 + rnd() * 1.6;
        const x = -9 + i * 2.3;
        const z = -15 - rnd() * 3;
        add(new THREE.BoxGeometry(w, h, 2), M('#2a1836'), x, h / 2 + 0.5, z);
        for (let wy = 7; wy < h; wy += 1.1) for (let wx = -w / 2 + 0.4; wx < w / 2 - 0.3; wx += 0.7) if (rnd() < 0.5) add(new THREE.PlaneGeometry(0.34, 0.5), B(pick(['#ffd27a', '#ffb347', '#ffe9b0'])), x + wx, wy, z + 1.01);
      }
      // ป้ายนีออน (ตัวหนังสือวาดลง canvas)
      const sc = document.createElement('canvas');
      sc.width = 1024;
      sc.height = 256;
      const g = sc.getContext('2d');
      try {
        await document.fonts.load('800 150px Kanit');
      } catch {}
      g.fillStyle = '#1a0e24';
      g.fillRect(0, 0, 1024, 256);
      g.strokeStyle = '#ff4fa3';
      g.lineWidth = 10;
      g.strokeRect(10, 10, 1004, 236);
      g.shadowColor = '#ff4fa3';
      g.shadowBlur = 30;
      g.fillStyle = '#ffe0f0';
      g.font = "800 150px Kanit, 'Leelawadee UI', sans-serif";
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('หมูกระทะ', 590, 140);
      g.shadowBlur = 0;
      g.fillStyle = '#ffb3c7';
      g.beginPath();
      g.arc(150, 128, 78, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#ff8fab';
      g.beginPath();
      g.ellipse(150, 150, 36, 26, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#2a1f1a';
      for (const x of [122, 178]) (g.beginPath(), g.arc(x, 105, 9, 0, Math.PI * 2), g.fill());
      g.fillStyle = '#b5303a';
      for (const x of [138, 162]) (g.beginPath(), g.arc(x, 150, 7, 0, Math.PI * 2), g.fill());
      const tex = new THREE.CanvasTexture(sc);
      tex.colorSpace = THREE.SRGBColorSpace;
      const signMat = new THREE.MeshBasicMaterial({ map: tex, color: '#ffffff' });
      add(new THREE.PlaneGeometry(7.2, 1.8), signMat, 0, 5.1, -9.95);
      const pinkL = new THREE.PointLight('#ff4fa3', 30, 12, 1.6);
      pinkL.position.set(0, 4.6, -8.6);
      scene.add(pinkL);
      add(new THREE.BoxGeometry(2, 0.5, 0.1), B('#ffd166'), 2.3, 3.95, -9.9);
      // ไฟราว (ขั้น 2 เพิ่มอีกแถวใกล้กล้อง)
      const bulbs = [];
      const lv2 = new THREE.Group();
      lv2.visible = false;
      scene.add(lv2);
      for (let i = 0; i <= 26; i++) {
        const x = -8.5 + i * 0.66;
        const tt = ((i % 9) - 4) / 4;
        bulbs.push(add(geo.bulb, B(pick(['#ffd27a', '#ffb347', '#ff8fab', '#ffe9b0'])), x, 4.2 + tt * tt * 0.35, -6.2));
        add(geo.bulb, B(pick(['#ff4fa3', '#7cc6f2', '#5fd068', '#ffd166'])), x, 5.6 + tt * tt * 0.4, -1.5, lv2);
      }
      const warm = [];
      for (const x of [-6, -2, 2, 6]) {
        const l = new THREE.PointLight('#ffc27a', 22, 11, 1.5);
        l.position.set(x, 4, -6);
        scene.add(l);
        warm.push(l);
      }
      // ป้าย “ร้านแตก!” (ขั้น 3)
      const lv3 = new THREE.Group();
      lv3.visible = false;
      scene.add(lv3);
      {
        const c3 = document.createElement('canvas');
        c3.width = 512;
        c3.height = 128;
        const x3 = c3.getContext('2d');
        x3.fillStyle = '#ffd166';
        x3.fillRect(0, 0, 512, 128);
        x3.fillStyle = '#7a1f1a';
        x3.font = "800 84px Kanit, 'Leelawadee UI', sans-serif";
        x3.textAlign = 'center';
        x3.textBaseline = 'middle';
        x3.fillText('ร้านแตก! 🔥', 256, 70);
        const t3 = new THREE.CanvasTexture(c3);
        t3.colorSpace = THREE.SRGBColorSpace;
        add(new THREE.PlaneGeometry(3.6, 0.9), new THREE.MeshBasicMaterial({ map: t3 }), -5.2, 5.1, -9.9, lv3);
      }
      // ตู้แช่ เมนู
      add(new THREE.BoxGeometry(1.6, 3, 1), M('#d9dde3'), -7, 1.5, -9.3);
      add(new THREE.PlaneGeometry(1.3, 2.4), new THREE.MeshBasicMaterial({ color: '#7cc6f2', transparent: true, opacity: 0.55 }), -7, 1.55, -8.79);
      for (let r = 0; r < 3; r++) for (let i = 0; i < 5; i++) add(new THREE.CylinderGeometry(0.07, 0.07, 0.42, 6), M(pick(['#2f9e44', '#f2b632', '#e8453c', '#ff8fab'])), -7.5 + i * 0.25, 0.7 + r * 0.75, -8.9);
      add(new THREE.BoxGeometry(2, 2.4, 0.15), M('#c98e4a'), 7, 2.4, -9.95);
      add(new THREE.PlaneGeometry(1.7, 2.1), M('#1d2a22'), 7, 2.4, -9.86);

      // โต๊ะ + กระทะ + ไฟถ่าน + ควัน
      const smokeTex = (() => {
        const c = document.createElement('canvas');
        c.width = c.height = 64;
        const x = c.getContext('2d');
        const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, 'rgba(255,255,255,.9)');
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = gr;
        x.fillRect(0, 0, 64, 64);
        return new THREE.CanvasTexture(c);
      })();
      const glowMat = (() => {
        const c = document.createElement('canvas');
        c.width = c.height = 64;
        const x = c.getContext('2d');
        const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, 'rgba(255,170,90,1)');
        gr.addColorStop(0.35, 'rgba(255,110,40,.55)');
        gr.addColorStop(1, 'rgba(255,80,20,0)');
        x.fillStyle = gr;
        x.fillRect(0, 0, 64, 64);
        return new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending });
      })();
      const tables = TABLES.map((t) => {
        add(new THREE.CylinderGeometry(1.15, 1.15, 0.08, 14), M(t.vip ? '#ffd166' : '#cfd3da', { std: 1, m: 0.6, r: 0.3 }), t.x, 1.02, t.z, scene, true);
        for (const a of [0.8, 2.4, 4, 5.6]) add(new THREE.CylinderGeometry(0.04, 0.04, 1, 5), M('#7b7f88'), t.x + Math.cos(a) * 0.9, 0.5, t.z + Math.sin(a) * 0.9);
        add(new THREE.CylinderGeometry(0.42, 0.36, 0.22, 10), M('#8a4a2a'), t.x, 1.16, t.z);
        add(new THREE.TorusGeometry(0.46, 0.11, 6, 14), M('#d9a35a'), t.x, 1.3, t.z).rotation.x = -Math.PI / 2;
        add(new THREE.SphereGeometry(0.38, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), M('#3a3d45', { std: 1, m: 0.7, r: 0.35 }), t.x, 1.27, t.z, scene, true);
        for (let i = 0; i < 6; i++) add(geo.veg, M(pick(['#5fd068', '#fff3c4', '#ff7a3a'])), t.x + Math.cos(i) * 0.47, 1.36, t.z + Math.sin(i) * 0.47);
        for (const [dx, dz] of [[-0.75, 0.35], [0.7, 0.45]]) {
          add(geo.plate, M('#ffffff'), t.x + dx, 1.08, t.z + dz);
          for (let i = 0; i < 3; i++) add(geo.meat, M('#e8907a'), t.x + dx - 0.08 + i * 0.08, 1.11, t.z + dz);
        }
        add(new THREE.CylinderGeometry(0.08, 0.07, 0.22, 7), M('#7a3b1e'), t.x + 0.4, 1.17, t.z + 0.75);
        bakeOn = false;
        // แสงถ่าน = sprite เรืองแสง (เดิมเป็นไฟจริงโต๊ะละดวง ทำให้ทุกพิกเซลต้องคำนวณไฟเพิ่ม 7 ดวง)
        const fire = new THREE.Sprite(glowMat.clone());
        fire.position.set(t.x, 1.45, t.z + 0.1);
        fire.scale.set(2.6, 1.5, 1);
        scene.add(fire);
        const smoke = [];
        for (let i = 0; i < 4; i++) {
          const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, opacity: 0.14, depthWrite: false }));
          sp.userData = { ph: i / 4, dx: (rnd() - 0.5) * 0.4 };
          scene.add(sp);
          smoke.push(sp);
        }
        // หมูบนโดม (สูงสุด 8 ชิ้น หมุนเวียน) + ถาดทะเล
        const meat = [];
        for (let i = 0; i < 8; i++) {
          const a = rnd() * Math.PI * 2;
          const r = 0.1 + rnd() * 0.2;
          const m = add(geo.meat, M('#e8907a'), t.x + Math.cos(a) * r, 1.27 + Math.sqrt(0.144 - r * r) + 0.02, t.z + Math.sin(a) * r);
          m.rotation.set(-Math.sin(a) * 0.6, a, Math.cos(a) * 0.6);
          m.visible = i < 3;
          meat.push(m);
        }
        const tray = new THREE.Group();
        tray.position.set(t.x - 0.1, 1.07, t.z + 0.75);
        tray.visible = false;
        scene.add(tray);
        add(new THREE.CylinderGeometry(0.42, 0.4, 0.04, 14), M('#e9ecef'), 0, 0, 0, tray);
        for (let i = 0; i < 5; i++) add(geo.shrimp, M('#ff7a3a'), -0.24 + i * 0.12, 0.05, (i % 2) * 0.1 - 0.05, tray).rotation.x = -Math.PI / 2;
        bakeOn = true;
        return { ...t, fire, smoke, meat, mi: 3, tray, trayT: 0, burst: 0 };
      });
      bakeOn = false;
      bake();

      // พนักงานเสิร์ฟ (วิ่งเอาถาดไปส่งตอนของขวัญ)
      const waiter = new THREE.Group();
      waiter.position.set(0, 0, 0.6);
      scene.add(waiter);
      add(geo.leg, M('#343a40'), -0.14, 0.45, 0, waiter);
      add(geo.leg, M('#343a40'), 0.14, 0.45, 0, waiter);
      add(new THREE.CylinderGeometry(0.3, 0.34, 0.9, 7), M('#212529'), 0, 1.35, 0, waiter);
      add(geo.head, M('#e0ac85'), 0, 2.05, 0, waiter);
      add(geo.hair, M('#2a1f1a'), 0, 2.09, -0.02, waiter);
      const wtray = new THREE.Group();
      wtray.position.set(0.5, 2.25, 0.1);
      waiter.add(wtray);
      add(new THREE.CylinderGeometry(0.62, 0.6, 0.05, 14), M('#e9ecef'), 0, 0, 0, wtray);
      for (let i = 0; i < 4; i++) add(geo.shrimp, M('#ff7a3a'), -0.2 + i * 0.15, 0.07, 0, wtray);
      // ว่างงาน = อยู่หลังประตูครัว (ซ่อน) • มีของขวัญ = เดินออกจากประตูไปส่งแล้วเดินกลับ
      const W0 = { x: 7, z: -9.3 };
      waiter.position.set(W0.x, 0, W0.z);
      waiter.visible = false;

      // แสงรวม + ไฟหลักมีเงา
      scene.add(new THREE.HemisphereLight('#7a6aa8', '#3a2418', 0.9));
      const key = new THREE.SpotLight('#ffd9a8', 120, 40, 0.75, 0.6, 1.2);
      key.position.set(2, 14, 8);
      key.target.position.set(0, 0, -3);
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      scene.add(key, key.target);

      // หมูที่ลอยลงกระทะ (pool)
      const flying = [];
      for (let i = 0; i < 24; i++) {
        const m = add(geo.meat, M('#e8907a'), 0, -5, 0);
        m.scale.setScalar(1.6);
        m.visible = false;
        flying.push({ m, on: false });
      }

      G = { THREE, renderer, scene, cam, cv, M, geo, add, tables, waiter, wtray, W0, wjob: null, flying, fc: 0, people: new Map(), signMat, pinkL, warm, bulbs, lv2, lv3, key, q: -1, size: 0 };
      window.__mookata = G; // ดีบัก/วัดผล
      syncPeople();
      // คอมไพล์ shader ล่วงหน้า (รวมของที่ซ่อนอยู่) → ตอนของขวัญ/ขึ้นขั้นฉากครั้งแรกไม่สะดุด
      const hidden = [];
      scene.traverse((o) => !o.visible && (hidden.push(o), (o.visible = true)));
      try {
        renderer.compile(scene, cam);
      } catch {}
      for (const o of hidden) o.visible = false;
      renderer.shadowMap.needsUpdate = true;
      api.redrawStatic?.();
    }

    // ================================================================ คนดูเป็น 3D (ตามที่นั่งของหน้าเวที)
    function makePerson(f) {
      const { THREE, M, geo, add, scene } = G;
      const d = f.data;
      const h = hsh(d.id);
      const grp = new THREE.Group();
      scene.add(grp);
      const shirt = M(d.color || '#ff6b6b');
      const skin = M(SKIN[h % SKIN.length]);
      add(geo.stool, M(['#e8453c', '#4dabf7', '#ffd43b'][h % 3]), 0, 0.28, 0, grp);
      const body = add(geo.body, shirt, 0, 0.98, 0, grp, true);
      const head = add(geo.head, skin, 0, 1.68, 0, grp, true);
      add(geo.hair, M(HAIR[(h >> 3) % HAIR.length]), 0, 1.72, -0.02, grp);
      const armL = add(geo.arm, shirt, -0.38, 1.05, 0.12, grp);
      const armR = add(geo.arm, shirt, 0.38, 1.05, 0.12, grp);
      armL.rotation.x = armR.rotation.x = -0.9;
      const glass = add(geo.glass, M('#f2b632', { e: '#5a3a00' }), 0.6, 1.92, 0.05, grp);
      glass.visible = false;
      const crown = add(geo.crown, M('#ffd166', { e: '#6a4a00' }), 0, 2.02, 0, grp);
      crown.visible = false;
      const cap = add(geo.cap, M(['#e8453c', '#3b82f6', '#c8a160'][h % 3]), 0, 1.92, 0, grp);
      cap.visible = false;
      const p = { grp, body, head, armL, armR, glass, crown, cap, skin, red: M('#ff5a4a'), ph: (h % 100) / 16, act: '', actT: 0, slot: null, color: d.color };
      return p;
    }
    function placePerson(p, f) {
      const s = f.slot;
      p.slot = s;
      if (s && s.i !== undefined) {
        const seat = SEATS[s.i];
        p.grp.position.set(seat.x, 0, seat.z);
        const t = TABLES[seat.t];
        p.grp.rotation.y = Math.atan2(t.x - seat.x, t.z - seat.z);
        p.grp.children[0].visible = true; // เก้าอี้
        p.stand = false;
      } else if (s) {
        // ยืนรอโต๊ะ: จุดบนจอ → พื้น (ยกตัวขึ้นแทนเก้าอี้)
        const fp = floorAt(s.x, s.y + 40);
        p.grp.position.set(fp[0], 0.3, fp[2]);
        p.grp.rotation.y = 0;
        p.grp.children[0].visible = false;
        p.stand = true;
      }
    }
    function syncPeople() {
      if (!G || !API?.fans) return;
      const seen = new Set();
      for (const [fid, f] of API.fans) {
        seen.add(fid);
        let p = G.people.get(fid);
        if (!p) {
          p = makePerson(f);
          G.people.set(fid, p);
          p.enter = 1;
        }
        if (p.slot !== f.slot) placePerson(p, f);
        if (p.color !== f.data.color) {
          p.color = f.data.color;
          p.body.material = p.armL.material = p.armR.material = G.M(f.data.color);
        }
        p.crown.visible = !!(f.data.vip || f.el?.classList.contains('crowned'));
        p.cap.visible = !p.crown.visible && !!f.data.wear?.hat;
        p.el = f.el;
      }
      for (const [fid, p] of G.people) {
        if (seen.has(fid)) continue;
        G.scene.remove(p.grp);
        G.people.delete(fid);
      }
    }
    const seatTable = (fid) => {
      const f = API?.fans?.get(fid);
      const i = f?.slot?.i;
      return i === undefined ? null : SEATS[i].t;
    };

    // ================================================================ ทุกเฟรม
    let lastSync = 0;
    let lastT = 0;
    function frame(ts) {
      // จอ 120/144Hz: วาดฉาก 3D ไม่เกิน ~60 ครั้ง/วินาที (ภาพเท่าเดิม แต่การ์ดจอทำงานครึ่งเดียว)
      if (ts - lastT < 0.0145 && ts > lastT) return;
      const dt = Math.min(0.05, ts - lastT || 0.016);
      lastT = ts;
      if (ts - lastSync > 0.4) {
        lastSync = ts;
        syncPeople();
        quality();
      }
      // คน: หายใจ/กิน + ท่าตามคำสั่ง + ท่าจากระบบคนดู (เต้น/โบกมือ)
      for (const p of G.people.values()) {
        const t = ts + p.ph;
        let lift = 0;
        if (p.enter > 0) {
          p.enter = Math.max(0, p.enter - dt * 1.5);
          lift = p.enter * 0.6;
        }
        const party = p.el && (p.el.classList.contains('hdance') || p.el.classList.contains('wave') || p.el.classList.contains('jump'));
        if (p.actT > 0) p.actT = Math.max(0, p.actT - dt);
        const act = p.actT > 0 ? p.act : '';
        p.body.scale.y = 1 + Math.sin(t * 2.2) * 0.02;
        p.grp.position.y = (p.stand ? 0.3 : 0) + lift + (party ? Math.abs(Math.sin(t * 9)) * 0.18 : 0);
        p.glass.visible = act === 'cheers';
        if (act === 'cheers') {
          p.armR.rotation.set(0, 0, 0.3);
          p.armR.position.set(0.48, 1.55 + Math.sin(ts * 10) * 0.04, 0.05);
          p.glass.position.y = 1.92 + Math.sin(ts * 10) * 0.04;
        } else if (act === 'grill') {
          p.armR.rotation.set(-1.5 + Math.sin(ts * 8) * 0.3, 0, 0);
          p.armR.position.set(0.38, 1.25, 0.32);
        } else {
          p.armR.rotation.set(-0.9 + (Math.sin(t * 1.3) > 0.85 ? -0.6 : 0), 0, 0);
          p.armR.position.set(0.38, 1.05, 0.12);
        }
        p.armL.rotation.z = party ? Math.sin(t * 9) * 0.6 : 0;
        p.head.material = act === 'spicy' ? p.red : p.skin;
        p.head.rotation.z = act === 'spicy' ? Math.sin(ts * 20) * 0.12 : 0;
      }
      // โต๊ะ: ไฟถ่านกะพริบ ควันลอย
      const lvl = API?.level || 1;
      for (const tb of G.tables) {
        tb.burst = Math.max(0, tb.burst - dt);
        tb.fire.material.opacity = 0.42 + Math.sin(ts * 7 + tb.x) * 0.06 + tb.burst * 0.4;
        for (const sp of tb.smoke) {
          const u = (ts * (0.22 + tb.burst * 0.4) + sp.userData.ph) % 1;
          sp.position.set(tb.x + sp.userData.dx + Math.sin(ts + u * 6) * 0.15, 1.7 + u * 2.6, tb.z);
          sp.scale.setScalar(0.45 + u * 1.1 + tb.burst * 0.3);
          sp.material.opacity = (0.18 + tb.burst * 0.1) * (1 - u);
        }
        if (tb.trayT > 0) {
          tb.trayT -= dt;
          tb.tray.visible = tb.trayT > 0;
        }
      }
      // หมูลอยลงกระทะ
      for (const fl of G.flying) {
        if (!fl.on) continue;
        fl.vy -= 9.8 * dt;
        fl.m.position.y += fl.vy * dt;
        fl.m.position.x += (fl.tx - fl.m.position.x) * dt * 3;
        fl.m.position.z += (fl.tz - fl.m.position.z) * dt * 3;
        fl.m.rotation.x += dt * 6;
        fl.m.rotation.z += dt * 4;
        if (fl.m.position.y <= 1.5) {
          fl.on = false;
          fl.m.visible = false;
          const tb = G.tables[fl.t];
          tb.meat[tb.mi % tb.meat.length].visible = true;
          tb.mi++;
          tb.burst = Math.min(1.2, tb.burst + 0.4);
        }
      }
      // พนักงานเดินไปส่งถาด
      const w = G.waiter;
      const job = G.wjob;
      if (job) {
        job.el += dt;
        w.visible = true;
        const tgt = job.path[job.k];
        const dx = tgt.x - w.position.x;
        const dz = tgt.z - w.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.08) {
          const v = Math.min(dist, dt * 5.5);
          w.position.x += (dx / dist) * v;
          w.position.z += (dz / dist) * v;
          w.rotation.y = Math.atan2(dx, dz);
          w.position.y = Math.abs(Math.sin(job.el * 12)) * 0.08;
        } else if (job.k < job.path.length - 1) {
          job.k++;
        } else if (!job.back) {
          // ถึงโต๊ะ: วางถาด แล้วเดินทางเดิมกลับประตู
          const tb = G.tables[job.ti];
          tb.tray.visible = true;
          tb.trayT = 30;
          G.wtray.visible = false;
          job.back = true;
          job.path = [...job.path].reverse().slice(1).concat(G.W0);
          job.k = 0;
        } else {
          G.wjob = G.wq?.shift() || null;
          G.wtray.visible = true;
          w.position.y = 0;
          if (!G.wjob) w.visible = false;
        }
      }
      // นีออนกะพริบตอนบุฟเฟ่ต์ + ขั้นฉาก
      st.flash = Math.max(0, st.flash - dt);
      G.pinkL.intensity = 30 + (st.flash > 0 ? Math.abs(Math.sin(ts * 14)) * 60 : Math.sin(ts * 2) * 3);
      G.signMat.color.setScalar(st.flash > 0 && Math.sin(ts * 14) < 0 ? 0.5 : 1);
      G.lv2.visible = lvl >= 2;
      G.lv3.visible = lvl >= 3;
      if (lvl >= 3 && ts - st.last > 9) {
        st.last = ts;
        API?.fireworks?.(2);
      }
      if (++G.fc % (G.q ? 8 : 3) === 0) G.renderer.shadowMap.needsUpdate = true;
      G.renderer.render(G.scene, G.cam);
    }
    // คุณภาพตามเครื่อง: หน้าเวทีลดคุณภาพเองเมื่อกระตุก (window.__perf.PERF.q 0-3)
    function quality() {
      const q = Math.min(3, window.__perf?.PERF?.q || 0);
      if (q === G.q) return;
      G.q = q;
      // เปลี่ยนแค่ความละเอียด/จำนวนควัน — ห้ามเปิดปิดไฟหรือเงา (shader คอมไพล์ใหม่ทั้งฉาก = ค้างเป็นช่วง)
      const k = [0.8, 0.66, 0.55, 0.45][q];
      G.renderer.setSize(Math.round(W * k), Math.round(H * k), false);
      for (const tb of G.tables) tb.smoke.forEach((sp, i) => (sp.visible = i < (q >= 2 ? 2 : 4)));
    }

    // ================================================================ คำสั่ง / ของขวัญ
    function emoji(api, e, x, y, n = 1) {
      for (let i = 0; i < n; i++)
        api.spawn({
          x: x + api.rand(-30, 30), y, vx: api.rand(-60, 60), vy: api.rand(-280, -180), g: 160, max: 1.6, size: 52,
          draw(c, p) {
            window.drawEmoji(c, e, p.x, p.y, p.size);
          },
        });
    }
    function act(fid, a, sec) {
      const p = G?.people.get(fid);
      if (!p) return;
      p.act = a;
      p.actT = sec;
    }
    function dropMeat(t, n) {
      if (!G) return;
      const tb = G.tables[t];
      for (let i = 0; i < n; i++) {
        const fl = G.flying.find((x) => !x.on);
        if (!fl) return;
        fl.on = true;
        fl.t = t;
        fl.tx = tb.x + (Math.random() - 0.5) * 0.3;
        fl.tz = tb.z + (Math.random() - 0.5) * 0.3;
        fl.m.position.set(tb.x + (Math.random() - 0.5) * 3, 6 + i * 0.6, tb.z + (Math.random() - 0.5) * 2);
        fl.vy = -1 - Math.random();
        fl.m.visible = true;
      }
    }
    function serve(t) {
      if (!G) return;
      const tb = G.tables[t];
      // เดินออกประตู → ลงทางเดินข้างร้าน → เลี้ยวเข้าทางเดินหน้าโต๊ะ (ไม่เดินทะลุโต๊ะ/คน)
      const az = tb.z + 2.1;
      const path = [{ x: 6.6, z: G.W0.z + 0.6 }, { x: 6.6, z: az }, { x: tb.x + (tb.x < 0 ? 1.3 : -1.3), z: az }];
      const job = { path, k: 0, ti: t, el: 0, back: false };
      if (!G.wjob) G.wjob = job;
      else (G.wq ||= []).push(job);
    }
    const tableScreen = (t) => {
      const tb = TABLES[t];
      return project([tb.x, 2.2, tb.z]);
    };
    function onCmd(d, api) {
      const p = api.fanPos(d.id);
      const t = seatTable(d.id);
      if (d.zone === 'grill') {
        act(d.id, 'grill', 2.2);
        if (t !== null) dropMeat(t, 2);
        api.sfx.pop?.();
        if (p) emoji(api, '🥓', p.x, p.y - 40, 2);
      } else if (d.zone === 'cheers') {
        // ทั้งโต๊ะชนแก้ว
        for (const [fid, f] of api.fans) if (t !== null ? seatTable(fid) === t : fid === d.id) act(fid, 'cheers', 2.6);
        const sp = t !== null ? tableScreen(t) : p;
        if (sp) emoji(api, '🍻', sp.x, sp.y - 60, 3);
        api.sfx.chime?.(880);
      } else if (d.zone === 'spicy') {
        act(d.id, 'spicy', 2.6);
        if (p) emoji(api, '🌶️', p.x, p.y - 40, 2), emoji(api, '💨', p.x, p.y - 50, 2);
      } else if (p) emoji(api, d.emoji || '✨', p.x, p.y - 40);
    }
    const lastGift = new Map();
    function gift(fx, user, n, label, api) {
      const tier = Number(String(fx.kind).slice(2)) || 1;
      const key = (user?.id || '?') + '|' + tier;
      if (performance.now() - (lastGift.get(key) || 0) < 1800) return;
      lastGift.set(key, performance.now());
      let t = user?.id ? seatTable(user.id) : null;
      if (t === null) t = Math.floor(Math.random() * TABLES.length);
      if (tier === 1) {
        api.toast(`${fx.icon || '🥓'} ${user?.name || 'มีคน'} ${fx.label}ให้โต๊ะ ${t + 1}`);
        dropMeat(t, Math.min(8, 2 + (n || 1)));
        if (user?.id) act(user.id, 'grill', 2);
        api.sfx.chime?.(784);
      } else if (tier === 2) {
        api.toast(`🦐 ${user?.name || 'มีคน'} → ${fx.label} โต๊ะ ${t + 1}!`);
        serve(t);
        dropMeat(t, 3);
        for (const [fid] of api.fans) if (seatTable(fid) === t) act(fid, 'cheers', 3);
        api.sfx.pop?.();
      } else buffet(api, user);
    }
    function buffet(api, user) {
      st.flash = 4;
      api.bigShow(user, 'บุฟเฟ่ต์จัดเต็มทั้งร้าน!');
      api.fireworks(6);
      TABLES.forEach((_, t) => {
        dropMeat(t, 3);
        if (G) G.tables[t].trayT = 30, (G.tables[t].tray.visible = true);
      });
      cheersAll(api);
    }
    function cheersAll(api) {
      for (const [fid] of api.fans) act(fid, 'cheers', 3.4);
      api.toast('🍻 ชนแก้วทั้งร้าน!', 'big');
    }

    // ================================================================ แผงบนจอ
    function css() {
      const p = hud().palette || {};
      const r = `#root.theme-${id}`;
      return `
        ${r} { --glass: ${p.panel}; --panel-border: rgba(255,255,255,.2); --heading: ${p.soft}; --toast-bg: ${p.accent}; --toast-glow: ${p.accent};
          --big-grad: linear-gradient(180deg, #ffffff, ${p.accent2}); --big-bg: radial-gradient(circle at 50% 45%, rgba(0,0,0,.2), rgba(0,0,0,.66) 70%);
          --card-bg: ${p.panel}; --card-top: 700px; --team-top: 640px; --fortune-top: 720px; }
        ${r} #header, ${r} #songPanel, ${r} #giftPanel, ${r} #topPanel { display: none !important; }
        ${r} #hype { left: 24px; width: 470px; top: 212px; padding: 10px 14px 12px; border-radius: 22px; background: ${p.panel}; border: 2px solid rgba(255,255,255,.18); }
        ${r} #hype .label { font-size: 21px; }
        ${r} #hype .bar { height: 16px; }
        ${r} #feed { top: 212px !important; left: auto !important; right: 24px; width: 470px; }
        ${r} #toasts { top: 418px; }
        ${r} .fan .body, ${r} .fan .crown, ${r} .fan .wear-pet { display: none !important; }
        ${r} .fan .tag { top: -46px; }
        ${r} .fan .bubble { bottom: 52px !important; }
        .mk-hud { position: absolute; inset: 0; pointer-events: none; font-family: 'Kanit', 'Leelawadee UI', sans-serif; color: #fff; z-index: 3; }
        .mk-hud * { box-sizing: border-box; }
        .mk-hud .hp { background: ${p.panel}; border: 2px solid rgba(255,255,255,.2); border-radius: 30px; box-shadow: 0 10px 28px rgba(0,0,0,.35); }
        .mk-hud .ttl { position: absolute; left: 50%; top: 36px; transform: translateX(-50%); padding: 16px 52px 20px; border-radius: 44px; text-align: center; white-space: nowrap;
          background: linear-gradient(90deg, ${p.accent}, ${p.accent2}); box-shadow: 0 16px 40px rgba(0,0,0,.4); max-width: 1000px; }
        .mk-hud .ttl b { display: block; font-size: 58px; line-height: 1.05; font-weight: 800; overflow: hidden; text-overflow: ellipsis; }
        .mk-hud .ttl small { display: block; font-size: 26px; font-weight: 500; opacity: .95; overflow: hidden; text-overflow: ellipsis; }
        .mk-hud .cnt { position: absolute; right: 24px; top: 1600px; padding: 10px 22px; font-size: 24px; color: ${p.soft}; display: none; }
        .mk-hud .bot { position: absolute; left: 24px; right: 24px; bottom: 22px; padding: 14px 22px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px 22px; }
        .mk-hud .bot div { display: flex; gap: 12px; align-items: center; font-size: 22px; line-height: 1.25; }
        .mk-hud .bot i { font-style: normal; font-size: 30px; flex: none; }
        .mk-hud .bot b { color: ${p.soft}; }
      `;
    }
    function render(api) {
      const m = meta();
      const t = api.t || {};
      const cmds = hud().cmds || [];
      const g = hud().mk?.gifts || [];
      const rows = [
        ['💬', 'คอมเมนต์', 'เข้าร้าน นั่งโต๊ะ มีชื่อเหนือหัว'],
        ...cmds.map((c) => [c.emoji, `พิมพ์ “${c.c}”`, c.a]),
        [window.giftIconHtml?.('Rose', '🌹') || '🌹', 'กุหลาบ', g[0] || 'เติมหมู'], // รูปกุหลาบจริงจาก TikTok ถ้ามี
        ['🦐', 'ของขวัญ 20+', g[1] || 'ถาดทะเล'],
        ['🎉', 'ของขวัญใหญ่ 169+', g[2] || 'บุฟเฟ่ต์ทั้งร้าน'],
      ].slice(0, 6);
      el.innerHTML = `
        <div class="ttl"><b>🐷 ${esc(t.title || m.defaults?.title)}</b><small>${esc(t.subtitle || m.defaults?.subtitle || '')}</small></div>
        <div class="bot hp">${rows.map(([e, k, v]) => `<div><i>${e}</i><span><b>${esc(k)}</b> → ${esc(v)}</span></div>`).join('')}</div>`;
    }

    return T;
  };
})();
