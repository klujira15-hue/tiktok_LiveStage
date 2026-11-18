/* เกม “เลี้ยงน้องกวางวิเศษ” — ภาพ 3D ฝั่งหน้าเวที (ธีม pet3d)
 * เซิร์ฟเวอร์ (mg/pet.js) เก็บค่าอิ่ม/สุข/พลัง/สะอาด คิวท่าทาง และวัยของน้อง → ไฟล์นี้เล่นท่าของโมเดล 3D ตามท่าที่กำลังทำ
 * three.js โหลดแบบ import() (import map ใน stage.html) • เรนเดอร์ลงแคนวาส WebGL นอกจอแล้ววาดทับลงแคนวาสหลักของเวที
 * ตัวน้อง: ปั้นด้วยโค้ดทั้งหมด (pet3d-chibi.js) ไม่มีไฟล์โมเดล • ท่าทางขยับด้วยโค้ด • ร่างโตของมังกร/ผึ้งเป็นชุดแต่งอีกแบบ
 * แคนวาส 1080x1920 • ข้อความสำคัญอยู่ในพื้นที่ที่มือถือเห็นครบ (ข้าง 110 • บน 190 • ล่างไม่เกิน ~1330)
 */
(() => {
  'use strict';
  const W = 1080;
  const H = 1920;
  const TAU = Math.PI * 2;
  const meta = () => window.__stage?.api?.meta || {};
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
  let seed = 7;
  const R = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  // วัย → ขนาดตัว/ขนาดเขา • ร่างโตเต็มวัย → สี
  const AGE_SCALE = [0.62, 0.76, 0.88, 1.0];
  const HORN_SCALE = [0.12, 0.42, 0.72, 1.0];
  const ACT_TXT = {
    feed: ['🍓', 'ให้อาหาร'], play: ['⚽', 'พาเล่น'], walk: ['🐾', 'พาเดินเล่น'], pet: ['🤚', 'ลูบหัว'], bath: ['🫧', 'อาบน้ำให้'], evolve: ['🌟', ''],
  };
  const WANT_TXT = { feed: '🍖 หิวจังเลย... พิมพ์ “ให้อาหาร” หน่อย', bath: '🫧 ตัวเหนียวแล้ว อยาก “อาบน้ำ”', sleep: '💤 ง่วงจัง... พิมพ์ “นอน”', play: '⚽ เหงาจัง อยาก “เล่น” ด้วย', wake: '☀️ นอนอิ่มแล้ว พิมพ์ “ตื่น” ได้เลย' };
  const STAGE_TXT = ['เด็กน้อย', 'วัยเด็ก', 'วัยรุ่น', 'โตเต็มวัย'];
  // ชนิดน้อง (สุ่มตอนฟัก) — ตัวชิบิจาก pet3d-chibi.js • h = ความสูงตอนโตเต็มวัย (ถึงยอดหัว)
  // evo = มีร่างโต (หน้าตาเปลี่ยนตอนถึงวัย evoAt) • กบ: ร่างโต = ราชากบ (มงกุฎทอง + ตัวทอง)
  const SPECIES = {
    stag: { file: 'base', name: 'กวางวิเศษ', h: 2.52 },
    deer: { file: 'base', name: 'กวางน้อย', h: 2.46 },
    fox: { file: 'base', name: 'จิ้งจอกส้ม', h: 2.4 },
    shiba: { file: 'base', name: 'ชิบะ', h: 2.4 },
    alpaca: { file: 'base', name: 'อัลปาก้า', h: 2.52 },
    husky: { file: 'base', name: 'ฮัสกี้', h: 2.46 },
    dragon: { file: 'base', evo: 'evo', evoAt: 2, name: 'มังกรน้อย', evoName: 'มังกรเพลิง', h: 2.4, evoH: 2.82 },
    bee: { file: 'base', evo: 'evo', evoAt: 2, name: 'ผึ้งน้อย', evoName: 'ผึ้งนักรบ', h: 2.28, evoH: 2.64 },
    frog: { file: 'base', evoAt: 3, name: 'กบน้อย', evoName: 'ราชากบ', h: 2.28, king: '#ffd23f' },
  };
  const fileOf = (sp, stage) => {
    const SP = SPECIES[sp] || SPECIES.stag;
    return SP.evo && stage >= SP.evoAt ? SP.evo : SP.file;
  };
  const nameOf = (sp, stage) => {
    const SP = SPECIES[sp];
    return SP ? (SP.evoName && stage >= SP.evoAt ? SP.evoName : SP.name) : '';
  };
  const FORM_TINT = { feed: '#f2c14e', play: '#7cc8ff', pet: '#ffb3d1' };

  window.makePet3DTheme = function makePet3DTheme(id) {
    let API = null;
    let el = null;
    let S = { xp: 0, stage: 0, stageName: 'เด็กน้อย', nextNeed: 400, prevNeed: 0, form: null, st: { F: 70, H: 70, E: 80, C: 80 }, act: null, queue: [], sleep: false, want: null, crown: 0, glow: false, likes: 0, likeStep: 100, carers: [], parents: [], days: 1, lives: 1, items: {} };
    let G = null; // ของ three.js หลังโหลดเสร็จ
    let failed = '';
    let lastT = 0;
    let curPid = -1;
    const timers = [];
    const later = (d, fn) => timers.push({ at: lastT + d, fn });
    const sfx = (k, ...a) => API?.sfx?.[k]?.(...a);
    const $ = (s) => el?.querySelector(s);
    const host = () => (API?.t?.host || meta().defaults?.host || 'น้องใบเตย').trim();

    // ---------------------------------------------------------------- โหลด three.js + สร้างฉาก
    async function boot() {
      try {
        const THREE = await import('three');
        const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
        renderer.setPixelRatio(1);
        renderer.setSize(W, H, false);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.VSMShadowMap;
        const scene = new THREE.Scene();
        const pm = new THREE.PMREMGenerator(renderer);
        scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
        scene.environmentIntensity = 0.55;
        const camera = new THREE.PerspectiveCamera(36, W / H, 0.1, 200);
        const world = new THREE.Group();
        scene.add(world);
        const key = new THREE.DirectionalLight('#fff4e0', 2.6);
        key.position.set(4, 10, 6);
        key.castShadow = true;
        key.shadow.mapSize.set(2048, 2048);
        Object.assign(key.shadow.camera, { left: -4.5, right: 4.5, top: 4.5, bottom: -4.5, near: 1, far: 30 });
        key.shadow.radius = 6;
        key.shadow.blurSamples = 16;
        key.shadow.bias = -0.0005;
        scene.add(key);
        const rim = new THREE.DirectionalLight('#b8d4ff', 1.3);
        rim.position.set(-5, 4, -6);
        scene.add(rim);
        const hemi = new THREE.HemisphereLight('#dfefff', '#3a4a20', 0.6);
        scene.add(hemi);
        G = { THREE, renderer, scene, camera, world, key, rim, hemi, fx: [], acts: {}, mats: [] };
        buildBase();
        buildWorld();
        buildEgg();
        buildBgQuad();
        buildSky();
        await loadSpecies(S.species || 'stag');
        G.ready = true;
        applyLook(true);
        startAct(true);
      } catch (e) {
        failed = 'โหลดภาพ 3D ไม่สำเร็จ — ' + (e?.message || e);
        console.warn('pet3d', e);
      }
    }
    function canvasTex(w, h, draw, srgb = true) {
      const { THREE } = G;
      const cv = document.createElement('canvas');
      cv.width = w;
      cv.height = h;
      draw(cv.getContext('2d'), w, h);
      const t = new THREE.CanvasTexture(cv);
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      return t;
    }
    // ---------------------------------------------------------------- ท้องฟ้า (โดมไล่สี + ดวงอาทิตย์/จันทร์) เปลี่ยนตามเวลาจริง — นอนอยู่ = กลางคืน
    const PAL = {
      day: { top: '#2f7fd6', mid: '#86c8ff', bot: '#5fa8f0', sun: '#fff2c0', dir: [0.45, 0.42, -0.78], sunK: 1, fog: '#9fd0ff', key: '#fff4e0', keyI: 2.6, hemiI: 0.6, env: 0.55, night: 0 },
      dusk: { top: '#35357e', mid: '#ff9e7a', bot: '#c87a9a', sun: '#ffb070', dir: [0.62, 0.1, -0.78], sunK: 1.3, fog: '#ffcaa6', key: '#ffc89a', keyI: 2.1, hemiI: 0.5, env: 0.45, night: 0.25 },
      night: { top: '#050925', mid: '#1b2459', bot: '#33407e', sun: '#cfe0ff', dir: [-0.45, 0.4, -0.8], sunK: 0.45, fog: '#202a5e', key: '#b8c8ff', keyI: 0.75, hemiI: 0.35, env: 0.22, night: 1 },
    };
    function skyKind() {
      if (S.sleep) return 'night';
      const h = new Date().getHours();
      return h >= 6 && h < 16 ? 'day' : h >= 16 && h < 19 ? 'dusk' : 'night';
    }
    function buildSky() {
      const { THREE } = G;
      const k = skyKind();
      if (!G.sky) {
        const P0 = PAL[k];
        const col = (c) => new THREE.Color(c);
        G.pal = { top: col(P0.top), mid: col(P0.mid), bot: col(P0.bot), sun: col(P0.sun), fog: col(P0.fog), key: col(P0.key), dir: new THREE.Vector3(...P0.dir).normalize(), sunK: P0.sunK, keyI: P0.keyI, hemiI: P0.hemiI, env: P0.env, night: P0.night };
        const mat = new THREE.ShaderMaterial({
          side: THREE.BackSide, depthWrite: false, fog: false,
          uniforms: { top: { value: G.pal.top }, mid: { value: G.pal.mid }, bot: { value: G.pal.bot }, sunCol: { value: G.pal.sun }, sunDir: { value: G.pal.dir }, sunK: { value: 1 }, dim: { value: 1 } },
          vertexShader: 'varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
          fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 bot; uniform vec3 sunCol; uniform vec3 sunDir; uniform float sunK; uniform float dim; varying vec3 vD;
            void main(){ vec3 d = normalize(vD); float h = d.y;
              vec3 c = mix(bot, mid, smoothstep(-0.45, 0.02, h)); c = mix(c, top, smoothstep(0.02, 0.7, h));
              float s = max(dot(d, normalize(sunDir)), 0.0);
              c += sunCol * (pow(s, 900.0) * 6.0 + pow(s, 40.0) * 0.45 + pow(s, 5.0) * 0.14) * sunK;
              gl_FragColor = vec4(c * dim, 1.0);
              #include <colorspace_fragment>
            }`,
        });
        G.sky = new THREE.Mesh(new THREE.SphereGeometry(160, 48, 24), mat);
        G.scene.add(G.sky);
        G.scene.fog = new THREE.Fog(G.pal.fog.clone(), 70, 230);
        // ดาว
        const pos = [];
        for (let i = 0; i < 420; i++) {
          const a1 = R() * TAU;
          const e = 0.05 + R() * 0.9;
          pos.push(Math.cos(a1) * Math.cos(e) * 140, Math.sin(e) * 140, Math.sin(a1) * Math.cos(e) * 140);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        G.stars = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#ffffff', size: 2.4, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
        G.scene.add(G.stars);
        // พระจันทร์
        G.moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(256, 256, (c) => {
          const g = c.createRadialGradient(128, 128, 30, 128, 128, 128);
          g.addColorStop(0, 'rgba(255,255,240,1)');
          g.addColorStop(0.32, 'rgba(255,250,225,1)');
          g.addColorStop(0.36, 'rgba(210,225,255,.35)');
          g.addColorStop(1, 'rgba(160,190,255,0)');
          c.fillStyle = g;
          c.fillRect(0, 0, 256, 256);
          c.fillStyle = 'rgba(200,200,190,.35)';
          for (const [x, y, r] of [[110, 112, 12], [146, 140, 9], [124, 150, 6]]) {
            c.beginPath();
            c.arc(x, y, r, 0, TAU);
            c.fill();
          }
        }), transparent: true, depthWrite: false, fog: false }));
        G.moon.scale.setScalar(26);
        G.scene.add(G.moon);
      }
      G.skyTo = PAL[k];
      G.skyKind = k;
      // ภาพฉากหลังสำเร็จรูป (ถ้ามีไฟล์) แทนท้องฟ้าที่วาดเอง: models/pet-bg-day.jpg / -dusk.jpg / -night.jpg (1080x1920)
      if (!G.bgTex) {
        G.bgTex = {};
        // Dusk/night use the existing time-of-day color grade; only day bitmap is bundled.
        for (const kind of ['day']) {
          const url = `models/pet-bg-${kind}.jpg`;
          fetch(url, { method: 'HEAD' })
            .then((r) => r.ok && new THREE.TextureLoader().loadAsync(url))
            .then((tex) => {
              if (!tex) return;
              tex.colorSpace = THREE.SRGBColorSpace;
              G.bgTex[kind] = tex;
            })
            .catch(() => {});
        }
      }
    }
    function stepSky(dt) {
      const { THREE } = G;
      const P1 = G.skyTo;
      const k = 1 - Math.exp(-dt * 1.2);
      const pl = G.pal;
      for (const n of ['top', 'mid', 'bot', 'sun', 'fog', 'key']) pl[n].lerp(new THREE.Color(P1[n]), k);
      pl.dir.lerp(new THREE.Vector3(...P1.dir).normalize(), k).normalize();
      for (const n of ['sunK', 'keyI', 'hemiI', 'env', 'night']) pl[n] = lerp(pl[n], P1[n], k);
      const dram = G.dram || 0; // ช่วงคัทซีนฟักไข่: ฉากมืดลง
      // ภาพฉากหลัง: ใช้ภาพของช่วงเวลานั้น ถ้าไม่มีใช้ภาพกลางวันแล้วปรับโทนเอา
      const own = G.bgTex?.[G.skyKind] || null;
      const bg = own || G.bgTex?.day || null;
      G.useBg = !!bg;
      G.sky.visible = !bg;
      if (bg) {
        const u2 = G.bgMat.uniforms;
        u2.map.value = bg;
        G.duskK = lerp(G.duskK || 0, !own && G.skyKind === 'dusk' ? 1 : 0, k);
        u2.dusk.value = G.duskK;
        u2.night.value = own ? 0 : pl.night;
        u2.dim.value = 1 - dram * 0.45;
      }
      const u = G.sky.material.uniforms;
      u.sunK.value = pl.sunK * (1 - pl.night * 0.9);
      u.dim.value = 1 - dram * 0.45;
      G.scene.fog.color.copy(pl.fog).multiplyScalar(1 - dram * 0.45);
      G.key.color.copy(pl.key);
      G.key.intensity = pl.keyI * (1 - dram * 0.55);
      G.key.position.set(pl.dir.x * 12, Math.max(4, pl.dir.y * 14), pl.dir.z * 12 + 9);
      G.hemi.intensity = pl.hemiI * (1 - dram * 0.4);
      G.scene.environmentIntensity = pl.env * (1 - dram * 0.5);
      G.stars.material.opacity = pl.night;
      G.moon.position.copy(new THREE.Vector3(-0.45, 0.4, -0.8).normalize().multiplyScalar(130));
      G.moon.material.opacity = pl.night;
      return pl.night;
    }


    // ---------------------------------------------------------------- ภาพฉากหลังขยับได้ (shader ทั้งจอ วาดก่อนฉาก 3D)
    // พิกัดในภาพ (มุมซ้ายบน = 0,0) ของฉาก pet-bg-day.jpg: เกาะซ้าย/ขวา ต้นซากุระ น้ำตก ดวงอาทิตย์ — ขยับเฉพาะส่วน
    const BG_FRAG = `uniform sampler2D map; uniform float t; uniform float night; uniform float dusk; uniform float dim; varying vec2 vUv;
      float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }
      float box(vec2 p, vec4 r, float s) { return smoothstep(r.x - s, r.x + s, p.x) * (1.0 - smoothstep(r.z - s, r.z + s, p.x)) * smoothstep(r.y - s, r.y + s, p.y) * (1.0 - smoothstep(r.w - s, r.w + s, p.y)); }
      void main() {
        vec2 p = vec2(vUv.x, 1.0 - vUv.y);
        // หายใจช้า ๆ (ซูมเข้า-ออกนิดเดียว)
        float z = 0.984 - 0.008 * sin(t * 0.12);
        p = vec2(0.5, 0.55) + (p - vec2(0.5, 0.55)) * z;
        vec2 q = p;
        // เมฆก้อนใหญ่ด้านบนพลิ้ว
        float up = 1.0 - smoothstep(0.42, 0.6, p.y);
        q.x += (n2(p * vec2(3.0, 4.0) + vec2(t * 0.05, 0.0)) - 0.5) * 0.012 * up;
        q.y += (n2(p * vec2(4.0, 3.0) + vec2(0.0, t * 0.04)) - 0.5) * 0.009 * up;
        // ทะเลเมฆด้านล่างไหล
        float lo = smoothstep(0.6, 0.78, p.y);
        q.x += sin(p.y * 34.0 + t * 0.5) * 0.004 * lo + (n2(p * 6.0 + vec2(t * 0.09, 0.0)) - 0.5) * 0.01 * lo;
        q.y += cos(p.x * 18.0 + t * 0.4) * 0.0025 * lo;
        // เกาะลอยขึ้นลง (ซ้าย/ขวา จังหวะต่างกัน)
        float il = box(p, vec4(-0.05, 0.33, 0.21, 0.71), 0.035);
        float ir = box(p, vec4(0.8, 0.36, 1.05, 0.72), 0.035);
        q.y -= il * sin(t * 0.8) * 0.0065 + ir * sin(t * 0.8 + 2.1) * 0.0065;
        // ต้นซากุระไหวตามลม (ยอดไหวมากกว่าโคน)
        float tl = box(p, vec4(-0.02, 0.35, 0.16, 0.47), 0.02) * (1.0 - smoothstep(0.35, 0.47, p.y));
        float tr = box(p, vec4(0.85, 0.38, 1.02, 0.48), 0.02) * (1.0 - smoothstep(0.38, 0.48, p.y));
        q.x += (tl * sin(t * 1.4 + p.y * 30.0) + tr * sin(t * 1.3 + 1.0 + p.y * 30.0)) * 0.004;
        vec3 col = texture2D(map, vec2(q.x, 1.0 - q.y)).rgb;
        // น้ำตกไหล (ลายน้ำเลื่อนลง) + ละอองตรงปลาย
        float wl = box(q, vec4(0.083, 0.525, 0.122, 0.665), 0.005);
        float wl2 = box(q, vec4(0.006, 0.478, 0.04, 0.51), 0.004);
        float wr = box(q, vec4(0.865, 0.585, 0.895, 0.69), 0.005);
        float w = max(max(wl, wl2), wr);
        float st = n2(vec2(q.x * 300.0, q.y * 26.0 - t * 3.2));
        col += vec3(0.85, 0.95, 1.0) * pow(st, 3.0) * 0.4 * w;
        col += vec3(1.0) * 0.08 * w * sin(q.y * 140.0 - t * 9.0) * 0.5;
        float mist = exp(-pow((q.x - 0.103) * 30.0, 2.0) - pow((q.y - 0.67) * 40.0, 2.0)) + exp(-pow((q.x - 0.88) * 30.0, 2.0) - pow((q.y - 0.695) * 40.0, 2.0));
        col += vec3(1.0) * mist * (0.18 + 0.08 * sin(t * 2.0));
        // แสงอาทิตย์: ลำแสงหมุนช้า ๆ + เรืองแสงเต้นเบา ๆ
        vec2 d = (p - vec2(0.83, 0.205)) * vec2(1.0, 1.78);
        float r = length(d);
        float ang = atan(d.y, d.x);
        float rays = pow(0.5 + 0.5 * sin(ang * 11.0 + t * 0.15), 6.0) * 0.55 + pow(0.5 + 0.5 * sin(ang * 7.0 - t * 0.1), 8.0) * 0.45;
        float day = 1.0 - night;
        col += vec3(1.0, 0.95, 0.8) * (rays * exp(-r * 2.4) * 0.12 + exp(-r * r * 70.0) * (0.12 + 0.05 * sin(t * 1.5))) * day;
        // ประกายวิบวับบนฟ้า (กลางคืนเป็นดาว)
        vec2 gc = p * vec2(70.0, 125.0);
        float hs = h21(floor(gc));
        if (hs > 0.982) {
          float tw = 0.5 + 0.5 * sin(t * 3.0 + hs * 60.0);
          col += vec3(1.0, 0.98, 0.9) * smoothstep(0.14, 0.0, length(fract(gc) - 0.5)) * tw * (0.28 + night * 1.1) * (1.0 - smoothstep(0.48, 0.6, p.y));
        }
        // กลีบซากุระปลิวทั่วจอ
        for (int i = 0; i < 14; i++) {
          float fi = float(i);
          float sp = 0.025 + 0.02 * h21(vec2(fi, 1.0));
          vec2 pp = vec2(fract(h21(vec2(fi, 2.0)) + t * sp * 0.55), fract(h21(vec2(fi, 3.0)) + t * sp));
          pp.x += sin(t * 1.5 + fi) * 0.02;
          vec2 dd = (p - pp) * vec2(1.0, 1.78);
          float a = t * (0.8 + h21(vec2(fi, 4.0))) + fi;
          dd = mat2(cos(a), -sin(a), sin(a), cos(a)) * dd;
          float e = length(dd / vec2(0.007, 0.004));
          col = mix(col, vec3(1.0, 0.76, 0.86), smoothstep(1.0, 0.6, e) * 0.85 * (1.0 - night * 0.5));
        }
        // โทนเย็น / กลางคืน (ใช้ภาพกลางวันภาพเดียว ถ้าไม่มีภาพของช่วงนั้น)
        col = mix(col, col * vec3(1.08, 0.8, 0.76) + vec3(0.07, 0.02, 0.05), dusk);
        float lum = dot(col, vec3(0.3, 0.59, 0.11));
        col = mix(col, mix(vec3(lum), col, 0.35) * vec3(0.3, 0.38, 0.78), night * 0.92);
        gl_FragColor = vec4(col * dim, 1.0);
        #include <colorspace_fragment>
      }`;
    function buildBgQuad() {
      const { THREE } = G;
      G.bgScene = new THREE.Scene();
      G.bgCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      G.bgMat = new THREE.ShaderMaterial({
        uniforms: { map: { value: null }, t: { value: 0 }, night: { value: 0 }, dusk: { value: 0 }, dim: { value: 1 } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader: BG_FRAG,
        depthTest: false,
        depthWrite: false,
      });
      const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), G.bgMat);
      quad.frustumCulled = false;
      G.bgScene.add(quad);
    }
    // วาดฉากหลัง (ถ้ามีภาพ) แล้วต่อด้วยฉาก 3D
    function renderAll(t) {
      const r = G.renderer;
      if (G.useBg) {
        G.bgMat.uniforms.t.value = t % 1000;
        r.autoClear = false;
        r.clear();
        r.render(G.bgScene, G.bgCam);
        r.clearDepth();
        r.render(G.scene, G.camera);
        r.autoClear = true;
      } else r.render(G.scene, G.camera);
    }

    // ---------------------------------------------------------------- ฉากรอบเกาะ: เกาะลอยฟ้ากลางทะเลเมฆ
    const YAW = 0.35; // มุมกล้อง (นิ่ง ไม่หมุน)
    const FACE = 0.22; // มุมหันของน้องเทียบกับกล้อง (0 = หันตรงเข้าจอ)
    const BASE_S = 0.56; // ขนาดเกาะหลัก (รัศมีจริง ≈ 3 × ค่านี้)
    const fwd = (d, lat, y) => {
      const { THREE } = G;
      return new THREE.Vector3(-Math.sin(YAW) * d + Math.cos(YAW) * lat, y, -Math.cos(YAW) * d - Math.sin(YAW) * lat);
    };
    function puffTex() {
      return canvasTex(256, 256, (c) => {
        for (let i = 0; i < 14; i++) {
          const x = 60 + R() * 136;
          const y = 90 + R() * 80;
          const r = 34 + R() * 46;
          const g = c.createRadialGradient(x, y, r * 0.2, x, y, r);
          g.addColorStop(0, 'rgba(255,255,255,.95)');
          g.addColorStop(0.7, 'rgba(255,255,255,.55)');
          g.addColorStop(1, 'rgba(255,255,255,0)');
          c.fillStyle = g;
          c.beginPath();
          c.arc(x, y, r, 0, TAU);
          c.fill();
        }
      });
    }
    function miniIsland(r, trees) {
      const { THREE } = G;
      const g = new THREE.Group();
      const top = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.92, r * 0.25, 18), new THREE.MeshStandardMaterial({ color: '#79b847', roughness: 1 }));
      g.add(top);
      const rock = new THREE.Mesh(new THREE.ConeGeometry(r * 0.92, r * 1.9, 9).rotateX(Math.PI), new THREE.MeshStandardMaterial({ color: '#8b7a66', roughness: 1, flatShading: true }));
      rock.position.y = -r * 1.05;
      g.add(rock);
      for (let i = 0; i < trees; i++) {
        const a = R() * TAU;
        const rr = R() * r * 0.55;
        const tr = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.04, r * 0.06, r * 0.5, 6), new THREE.MeshStandardMaterial({ color: '#7a5236' }));
        trunk.position.y = r * 0.25;
        const can = new THREE.Mesh(new THREE.IcosahedronGeometry(r * 0.28, 1), new THREE.MeshStandardMaterial({ color: R() < 0.4 ? '#ffb7d5' : '#4fae4c', roughness: 0.9, flatShading: true }));
        can.position.y = r * 0.62;
        tr.add(trunk, can);
        tr.position.set(Math.cos(a) * rr, r * 0.12, Math.sin(a) * rr);
        g.add(tr);
      }
      return g;
    }
    function buildWorld() {
      const { THREE, world } = G;
      // ด้านใต้เกาะหลัก: หินย้อย + รากไม้ + น้ำตก (อยู่ในกลุ่มฐาน ย่อขนาดตามฐาน)
      const base = G.base;
      const rockMat = new THREE.MeshStandardMaterial({ color: '#8a7864', roughness: 1, flatShading: true });
      // หินใต้เกาะ: กรวยขรุขระ ไล่สีดิน → หินม่วงเทา
      const ug = new THREE.ConeGeometry(3.15, 3.6, 16, 6).rotateX(Math.PI);
      const up = ug.attributes.position;
      const ucol = [];
      const cTop = new THREE.Color('#8a6a4a');
      const cBot = new THREE.Color('#5d5870');
      for (let i = 0; i < up.count; i++) {
        const y = up.getY(i);
        const k = clamp((1.8 - y) / 3.6, 0, 1);
        if (y < 1.75 && y > -1.75) {
          const j = 1 + (Math.sin(i * 12.9898) * 43758.5453 % 1) * 0.22;
          up.setX(i, up.getX(i) * j);
          up.setZ(i, up.getZ(i) * j);
        }
        const c = cTop.clone().lerp(cBot, k);
        ucol.push(c.r, c.g, c.b);
      }
      ug.setAttribute('color', new THREE.Float32BufferAttribute(ucol, 3));
      ug.computeVertexNormals();
      const under = new THREE.Mesh(ug, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
      under.position.y = -2.05;
      base.add(under);
      for (let i = 0; i < 6; i++) {
        const a = R() * TAU;
        const sp = new THREE.Mesh(new THREE.ConeGeometry(0.35 + R() * 0.3, 1.4 + R() * 1.4, 6).rotateX(Math.PI), rockMat);
        sp.position.set(Math.cos(a) * 1.5, -1.0 - R() * 0.6, Math.sin(a) * 1.5);
        base.add(sp);
      }
      const vineMat = new THREE.MeshStandardMaterial({ color: '#3d6e22', roughness: 0.9 });
      for (let i = 0; i < 9; i++) {
        const a = R() * TAU;
        const len = 0.6 + R() * 1.1;
        const v = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.008, len, 4).translate(0, -len / 2, 0), vineMat);
        v.position.set(Math.cos(a) * 3.12, -0.2, Math.sin(a) * 3.12);
        v.rotation.z = (R() - 0.5) * 0.2;
        base.add(v);
      }
      // น้ำตก
      const wfTex = canvasTex(64, 256, (c, w, h) => {
        c.clearRect(0, 0, w, h);
        for (let i = 0; i < 70; i++) {
          const x = R() * w;
          const y = R() * h;
          const g = c.createLinearGradient(x, y, x, y + 60);
          g.addColorStop(0, 'rgba(255,255,255,0)');
          g.addColorStop(0.5, `rgba(${200 + R() * 55},${235 + R() * 20},255,${0.35 + R() * 0.5})`);
          g.addColorStop(1, 'rgba(255,255,255,0)');
          c.fillStyle = g;
          c.fillRect(x, y, 3 + R() * 5, 60);
        }
      });
      wfTex.wrapS = wfTex.wrapT = THREE.RepeatWrapping;
      wfTex.repeat.set(1, 2.5);
      const wfA = YAW + 0.75;
      const wf = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 9, 1, 8).translate(0, -4.5, 0), new THREE.MeshBasicMaterial({ map: wfTex, transparent: true, depthWrite: false, side: THREE.DoubleSide, color: '#e8f8ff' }));
      wf.position.set(Math.sin(wfA) * 3.25, 0.02, Math.cos(wfA) * 3.25);
      wf.rotation.y = wfA;
      base.add(wf);
      const lip = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 0.5), new THREE.MeshStandardMaterial({ color: '#6fc6ff', roughness: 0.2, emissive: '#3aa0ff', emissiveIntensity: 0.25 }));
      lip.position.set(Math.sin(wfA) * 2.9, 0.012, Math.cos(wfA) * 2.9);
      lip.rotation.y = wfA;
      base.add(lip);
      G.wfTex = wfTex;
      // ต้นซากุระใหญ่หลังน้อง
      const tree = new THREE.Group();
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.15, 1.2, 0.05), new THREE.Vector3(-0.1, 2.4, 0), new THREE.Vector3(0.25, 3.3, 0.1)]);
      const trunk = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.18, 8), new THREE.MeshStandardMaterial({ color: '#7a5236', roughness: 0.9 }));
      trunk.castShadow = true;
      tree.add(trunk);
      for (const [dx, dy, dz, l] of [[0.9, 0.5, 0.2, 1.1], [-0.8, 0.3, -0.1, 0.9], [0.2, 0.8, -0.6, 0.8]]) {
        const br = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.1, l, 6).translate(0, l / 2, 0), trunk.material);
        br.position.set(0, 2.2, 0);
        br.lookAt(new THREE.Vector3(dx, 2.2 + dy, dz));
        br.rotateX(Math.PI / 2);
        tree.add(br);
      }
      const blossom = [new THREE.MeshStandardMaterial({ color: '#ffb7d5', roughness: 0.85, flatShading: true, emissive: '#ff8ab8', emissiveIntensity: 0.06 }), new THREE.MeshStandardMaterial({ color: '#ffd2e6', roughness: 0.85, flatShading: true }), new THREE.MeshStandardMaterial({ color: '#ff9cc4', roughness: 0.85, flatShading: true })];
      for (let i = 0; i < 16; i++) {
        const a = R() * TAU;
        const rr = R() * 1.3;
        const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42 + R() * 0.38, 1), blossom[i % 3]);
        b.position.set(Math.cos(a) * rr, 3.0 + R() * 1.0 - rr * 0.25, Math.sin(a) * rr * 0.8);
        b.castShadow = true;
        tree.add(b);
      }
      const tp = fwd(1.85, -1.35, 0);
      tree.position.set(tp.x, 0, tp.z);
      base.add(tree);
      G.treeTop = new THREE.Vector3(tp.x * BASE_S, 3.5 * BASE_S, tp.z * BASE_S);
      // กลีบซากุระร่วง (instanced)
      const petalGeo = new THREE.PlaneGeometry(0.07, 0.05);
      const petals = new THREE.InstancedMesh(petalGeo, new THREE.MeshBasicMaterial({ color: '#ffc4dc', side: THREE.DoubleSide, transparent: true, opacity: 0.95 }), 140);
      petals.frustumCulled = false;
      G.petalData = [];
      for (let i = 0; i < 140; i++) G.petalData.push({ p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), w: 0, life: -R() * 8 });
      world.add(petals);
      G.petals = petals;
      // เกาะเล็กลอยไกล ๆ
      G.isles = [];
      for (const [d, lat, y, r, t] of [[24, -9, -6.5, 1.8, 2], [34, 8, -5, 2.4, 3], [50, -17, -7.5, 3.2, 3], [56, 17, -9, 2.6, 2], [20, 10, -9.5, 1.3, 1], [72, 1, -4.5, 4.0, 4]]) {
        const isl = miniIsland(r, t);
        isl.position.copy(fwd(d, lat, y));
        isl.userData = { y0: y, ph: R() * 6 };
        world.add(isl);
        G.isles.push(isl);
      }
      // ทะเลเมฆด้านล่าง + เมฆลอยไกล
      const pt = puffTex();
      G.clouds = [];
      for (let i = 0; i < 46; i++) {
        const low = i < 34;
        const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: pt, transparent: true, depthWrite: false, opacity: low ? 0.95 : 0.8 }));
        const d = low ? -6 + R() * 90 : 30 + R() * 60;
        const lat = (R() - 0.5) * (low ? 70 : 90);
        const y = low ? -11 - R() * 4 : -2 + R() * 6;
        m.position.copy(fwd(d, lat, y));
        const s = low ? 12 + R() * 16 : 10 + R() * 12;
        m.scale.set(s, s * 0.55, 1);
        m.userData = { v: 0.15 + R() * 0.35, low };
        world.add(m);
        G.clouds.push(m);
      }
      // ละอองน้ำตกด้านล่าง
      G.mist = [];
      for (let i = 0; i < 5; i++) {
        const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: pt, transparent: true, depthWrite: false, opacity: 0.6 }));
        m.userData = { ph: R() * 6 };
        world.add(m);
        G.mist.push(m);
      }
      G.wfA = wfA;
      // แสงลอดเมฆ (กลางวัน)
      const rayTex = canvasTex(64, 512, (c, w, h) => {
        const g = c.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, 'rgba(255,248,220,.9)');
        g.addColorStop(1, 'rgba(255,248,220,0)');
        c.fillStyle = g;
        c.fillRect(0, 0, w, h);
        const g2 = c.createLinearGradient(0, 0, w, 0);
        g2.addColorStop(0, 'rgba(0,0,0,1)');
        g2.addColorStop(0.5, 'rgba(0,0,0,0)');
        g2.addColorStop(1, 'rgba(0,0,0,1)');
        c.globalCompositeOperation = 'destination-out';
        c.fillStyle = g2;
        c.fillRect(0, 0, w, h);
      });
      G.rays = [];
      for (let i = 0; i < 4; i++) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(2.2 + i * 0.6, 22), new THREE.MeshBasicMaterial({ map: rayTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.1, side: THREE.DoubleSide, fog: false }));
        m.position.copy(fwd(8 + i * 3, -6 + i * 3.2, 9));
        m.rotation.set(0, YAW, 0.5);
        m.userData = { ph: i * 1.7 };
        world.add(m);
        G.rays.push(m);
      }
      // นกบินไกล ๆ
      const birdTex = canvasTex(64, 32, (c) => {
        c.strokeStyle = '#2a3550';
        c.lineWidth = 4;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(4, 10);
        c.quadraticCurveTo(18, 2, 32, 18);
        c.quadraticCurveTo(46, 2, 60, 10);
        c.stroke();
      });
      G.birds = [];
      for (let i = 0; i < 5; i++) {
        const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: birdTex, transparent: true, depthWrite: false }));
        m.userData = { ph: R() * TAU, off: new THREE.Vector3((R() - 0.5) * 3, (R() - 0.5) * 1.5, (R() - 0.5) * 3) };
        world.add(m);
        G.birds.push(m);
      }
    }
    const _m4 = { m: null, q: null };
    function stepWorld(t, dt, night) {
      const { THREE } = G;
      // มีภาพฉากหลังแล้ว ซ่อนเกาะไกล/เมฆ/แสง/นกที่วาดเอง (ภาพมีให้แล้ว)
      const own = !G.useBg;
      for (const o of [...G.clouds, ...G.isles, ...G.rays, ...G.birds]) o.visible = own;
      G.moon.visible = own;
      G.stars.visible = own;
      G.wfTex.offset.y -= dt * 1.6;
      for (const m of G.clouds) {
        const u = m.userData;
        m.position.x += u.v * dt * (u.low ? 1 : 0.6);
        if (m.position.x > 60) m.position.x -= 120;
        m.material.color.setRGB(1 - night * 0.55, 1 - night * 0.5, 1 - night * 0.3);
      }
      for (const isl of G.isles) isl.position.y = isl.userData.y0 + Math.sin(t * 0.5 + isl.userData.ph) * 0.35;
      const s = G.base.scale.x;
      const bx = Math.sin(G.wfA) * 3.25 * s;
      const bz = Math.cos(G.wfA) * 3.25 * s;
      G.mist.forEach((m, i) => {
        const k = (t * 0.25 + i / G.mist.length) % 1;
        m.position.set(bx + Math.sin(i * 2) * 0.6, -6.6 * s - k * 1.5, bz + Math.cos(i * 2) * 0.4);
        m.scale.set(2.2 + k * 2, 1.2 + k, 1);
        m.material.opacity = 0.55 * (1 - k) * (1 - night * 0.5);
      });
      for (const r of G.rays) r.material.opacity = (0.06 + Math.sin(t * 0.4 + r.userData.ph) * 0.035) * (1 - night) * (1 - (G.dram || 0));
      G.birds.forEach((b, i) => {
        const u = b.userData;
        b.position.copy(fwd(30, -25 + ((t * 2.2 + i * 1.5) % 50), 7 + Math.sin(t * 0.3 + i) * 0.6).add(u.off));
        b.scale.set(0.9, 0.45 * (0.4 + Math.abs(Math.sin(t * 7 + u.ph))), 1);
        b.material.opacity = 1 - night;
      });
      // กลีบซากุระ: ร่วงจากต้น ลอยไปตามลม
      _m4.m ||= new THREE.Matrix4();
      _m4.q ||= new THREE.Quaternion();
      const m4 = _m4.m;
      const q = _m4.q;
      const one = new THREE.Vector3(1, 1, 1);
      const zero = new THREE.Vector3(0, 0, 0);
      G.petalData.forEach((p, i) => {
        p.life += dt;
        if (p.life < 0) {
          G.petals.setMatrixAt(i, m4.compose(zero, q.identity(), zero));
          return;
        }
        if (p.w === 0 || p.p.y < -0.05 || p.life > 9) {
          p.p.copy(G.treeTop).add(new THREE.Vector3((R() - 0.5) * 1.6, (R() - 0.5) * 0.6, (R() - 0.5) * 1.2));
          p.v.set(0.25 + R() * 0.3, -0.25 - R() * 0.2, 0.15 + R() * 0.25);
          p.w = 1;
          p.life = 0;
        }
        p.p.addScaledVector(p.v, dt);
        p.p.x += Math.sin(t * 2 + i) * dt * 0.25;
        p.r.set(t * 2 + i, t * 1.3 + i * 0.5, 0);
        q.setFromEuler(p.r);
        G.petals.setMatrixAt(i, m4.compose(p.p, q, one));
      });
      G.petals.instanceMatrix.needsUpdate = true;
    }

    // ---------------------------------------------------------------- ไข่ในรัง
    function eggTexDraw(c, w, h, lvl, glow) {
      if (!glow) {
        const g = c.createLinearGradient(0, h, 0, 0);
        g.addColorStop(0, '#f7e8c8');
        g.addColorStop(1, '#fff8ea');
        c.fillStyle = g;
        c.fillRect(0, 0, w, h);
        let s = 3;
        const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
        for (let i = 0; i < 26; i++) {
          c.fillStyle = ['#93c95c', '#ff7ab0', '#b6e07c', '#ffb3d1'][i % 4];
          const x = r() * w;
          const y = h * (0.15 + r() * 0.75);
          const rr = 10 + r() * 22;
          for (const dx of [0, w, -w]) {
            c.beginPath();
            c.ellipse(x + dx, y, rr, rr * 0.8, 0, 0, TAU);
            c.fill();
          }
        }
        // แถบซิกแซกรอบไข่
        c.fillStyle = '#ff9ac8';
        c.beginPath();
        c.moveTo(0, h * 0.62);
        for (let x = 0; x <= w; x += 32) c.lineTo(x, h * (x % 64 ? 0.58 : 0.66));
        c.lineTo(w, h * 0.7);
        for (let x = w; x >= 0; x -= 32) c.lineTo(x, h * (x % 64 ? 0.64 : 0.72));
        c.fill();
      } else {
        c.fillStyle = '#000';
        c.fillRect(0, 0, w, h);
      }
      // รอยร้าวตามระดับ
      const cracks = [
        [[0.08, 0.5], [0.13, 0.56], [0.18, 0.52], [0.24, 0.6], [0.3, 0.55], [0.34, 0.62]],
        [[0.46, 0.58], [0.52, 0.52], [0.57, 0.6], [0.62, 0.54], [0.69, 0.61], [0.74, 0.56], [0.79, 0.63]],
        [[0.79, 0.63], [0.85, 0.57], [0.9, 0.64], [0.96, 0.58], [1.02, 0.62], [1.08, 0.5]],
        [[0.24, 0.6], [0.27, 0.7], [0.25, 0.78]], [[0.62, 0.54], [0.64, 0.44], [0.61, 0.36]], [[0.34, 0.62], [0.4, 0.57], [0.46, 0.58]],
      ];
      const n = lvl >= 3 ? 6 : lvl === 2 ? 4 : lvl === 1 ? 2 : 0;
      c.lineJoin = 'round';
      for (let i = 0; i < n; i++) {
        for (const pass of glow ? [[14, 'rgba(255,200,90,.45)'], [5, '#fff6c8']] : [[5, '#6a4a2a']]) {
          c.lineWidth = pass[0];
          c.strokeStyle = pass[1];
          for (const dx of [0, -w]) {
            c.beginPath();
            cracks[i].forEach(([u, v], j) => (j ? c.lineTo(u * w + dx, h - v * h) : c.moveTo(u * w + dx, h - v * h)));
            c.stroke();
          }
        }
      }
    }
    function buildEgg() {
      const { THREE } = G;
      const egg = new THREE.Group();
      // รัง
      const strawTex = canvasTex(256, 64, (c, w, h) => {
        c.fillStyle = '#a5753f';
        c.fillRect(0, 0, w, h);
        for (let i = 0; i < 260; i++) {
          c.strokeStyle = ['#d9a85a', '#8a5a2a', '#c49048', '#6e4520'][i % 4];
          c.lineWidth = 2;
          const x = R() * w;
          const y = R() * h;
          c.beginPath();
          c.moveTo(x, y);
          c.lineTo(x + 20 + R() * 30, y + (R() - 0.5) * 14);
          c.stroke();
        }
      });
      strawTex.wrapS = THREE.RepeatWrapping;
      strawTex.repeat.set(4, 1);
      const nest = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.24, 12, 40), new THREE.MeshStandardMaterial({ map: strawTex, roughness: 1 }));
      nest.rotation.x = Math.PI / 2;
      nest.position.y = 0.14;
      nest.scale.z = 0.8;
      nest.castShadow = nest.receiveShadow = true;
      egg.add(nest);
      const hay = new THREE.Mesh(new THREE.CircleGeometry(0.72, 30), new THREE.MeshStandardMaterial({ map: strawTex, roughness: 1 }));
      hay.rotation.x = -Math.PI / 2;
      hay.position.y = 0.06;
      egg.add(hay);
      const twigMat = new THREE.MeshStandardMaterial({ color: '#8a5a2a' });
      for (let i = 0; i < 18; i++) {
        const a = R() * TAU;
        const tw = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.5 + R() * 0.4, 4), twigMat);
        tw.position.set(Math.cos(a) * 0.72, 0.18 + R() * 0.12, Math.sin(a) * 0.72);
        tw.rotation.set(Math.PI / 2 + (R() - 0.5) * 0.5, 0, a + Math.PI / 2 + (R() - 0.5) * 0.6);
        egg.add(tw);
      }
      // ตัวไข่ (lathe) — จุดหมุนอยู่ที่ก้นไข่ โยกได้
      const pts = [];
      for (let i = 0; i <= 32; i++) {
        const k = i / 32;
        pts.push(new THREE.Vector2(Math.max(0.001, 0.6 * Math.pow(Math.sin(Math.PI * k), 0.9) * (1 - 0.2 * k)), k * 1.45));
      }
      const geo = new THREE.LatheGeometry(pts, 48);
      const mapCv = document.createElement('canvas');
      mapCv.width = 512;
      mapCv.height = 512;
      const emCv = document.createElement('canvas');
      emCv.width = 512;
      emCv.height = 512;
      const map = new THREE.CanvasTexture(mapCv);
      map.colorSpace = THREE.SRGBColorSpace;
      const em = new THREE.CanvasTexture(emCv);
      em.colorSpace = THREE.SRGBColorSpace;
      const mat = new THREE.MeshStandardMaterial({ map, emissiveMap: em, emissive: '#ffffff', emissiveIntensity: 0, roughness: 0.42, metalness: 0 });
      const shell = new THREE.Mesh(geo, mat);
      shell.castShadow = true;
      const pivot = new THREE.Group();
      pivot.position.y = 0.1;
      pivot.add(shell);
      egg.add(pivot);
      // แสงในไข่ (ตอนใกล้ฟัก)
      const light = new THREE.PointLight('#ffd27a', 0, 5, 1.6);
      light.position.y = 0.8;
      egg.add(light);
      G.world.add(egg);
      G.egg = { group: egg, pivot, shell, mat, map, em, mapCv, emCv, lvl: -1, wob: 0, nextWob: 0, light };
      setCracks(0);
    }
    function setCracks(lvl) {
      const E = G.egg;
      if (!E || E.lvl === lvl) return;
      E.lvl = lvl;
      eggTexDraw(E.mapCv.getContext('2d'), 512, 512, lvl, false);
      eggTexDraw(E.emCv.getContext('2d'), 512, 512, lvl, true);
      E.map.needsUpdate = true;
      E.em.needsUpdate = true;
    }
    function stepEgg(t, dt) {
      const E = G.egg;
      const hatchOn = !!G.hatch;
      const showEgg = (S.egg && !hatchOn) || (hatchOn && !G.hatch.burst);
      E.group.visible = showEgg || (hatchOn && G.hatch.burst); // รังยังอยู่หลังไข่แตก (จนจบคัทซีน)
      E.pivot.visible = showEgg;
      if (!E.group.visible) return;
      const k = S.warmNeed ? clamp(S.warm / S.warmNeed, 0, 1) : 0;
      if (!hatchOn) setCracks(k >= 0.85 ? 3 : k >= 0.6 ? 2 : k >= 0.3 ? 1 : 0);
      // โยกเองเป็นระยะ (ยิ่งใกล้ฟักยิ่งโยกบ่อย)
      if (!hatchOn && t > E.nextWob) {
        E.nextWob = t + lerp(6, 1.6, k) + R() * 2;
        E.wob = Math.max(E.wob, 0.25 + k * 0.6);
      }
      E.wob = Math.max(0, E.wob - dt * 0.9);
      let amp = E.wob;
      let glow = k >= 0.3 ? 0.35 + k * 0.6 + Math.sin(t * 3) * 0.15 : 0;
      if (hatchOn) {
        const h = t - G.hatch.t0;
        amp = Math.max(amp, lerp(0.2, 1.4, clamp(h / 4.2, 0, 1)));
        glow = lerp(1, 5, clamp(h / 4.2, 0, 1)) + Math.sin(t * 20) * 0.3;
      }
      E.pivot.rotation.z = Math.sin(t * 19) * amp * 0.22;
      E.pivot.rotation.x = Math.cos(t * 15) * amp * 0.12;
      E.pivot.position.y = 0.1 + Math.abs(Math.sin(t * 19)) * amp * 0.04;
      E.mat.emissiveIntensity = glow;
      E.light.intensity = glow * 2.2;
      const sc = 1 + Math.sin(t * 2.2) * 0.012;
      E.shell.scale.set(sc, 1 / sc, sc);
    }
    // ---------------------------------------------------------------- คัทซีนฟักไข่ (~10 วิ)
    function hatchCut(a) {
      const { THREE } = G;
      const el0 = Math.max(0, (a.dur - a.left) / 1000);
      if (el0 > 3.8) return; // เปิดหน้าเวทีกลางคัทซีน: ข้ามไปเลย
      const t0 = lastT - el0;
      G.hatch = { t0, burst: false };
      el.classList.add('cine');
      setCracks(3);
      big('🥚 ไข่กำลังจะฟัก!', 2.2);
      sfx('roar', 0.8);
      const at = (d, fn) => later(Math.max(0, d - el0), fn);
      // ละอองแสงหมุนวนเข้าไข่
      for (let i = 0; i < 46; i++) at(0.3 + i * 0.08, () => {
        const ph = R() * TAU;
        const r0 = 2.6 + R();
        const y0 = 0.3 + R() * 2.2;
        const m = sprite('✦', new THREE.Vector3(), { life: 0.9, size: 0.22, vy: 0 });
        G.fx[G.fx.length - 1].upd = (k) => {
          const r = r0 * (1 - k);
          const ang = ph + k * 4;
          m.position.set(Math.cos(ang) * r, lerp(y0, 0.8, k), Math.sin(ang) * r);
          m.material.opacity = Math.sin(k * Math.PI);
        };
      });
      at(1.2, () => sfx('bell', 220));
      at(2.4, () => sfx('bell', 330));
      at(3.4, () => sfx('bell', 440));
      // ลำแสงพุ่งจากรอยร้าว
      const beams = [];
      at(2.0, () => {
        for (let i = 0; i < 7; i++) {
          const b = new THREE.Mesh(new THREE.ConeGeometry(0.16, 4, 16, 1, true).translate(0, 2, 0), new THREE.MeshBasicMaterial({ color: '#fff3b0', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
          b.position.set(0, 0.8, 0);
          b.rotation.set((R() - 0.5) * 2.2, R() * TAU, (R() - 0.5) * 2.2);
          b.scale.setScalar(0.01);
          G.world.add(b);
          beams.push(b);
        }
        if (G.hatch) G.hatch.beams = beams;
      });
      // แตก!
      at(4.2, () => {
        if (!G.hatch) return;
        G.hatch.burst = true;
        for (const b of beams) G.world.remove(b);
        G.flash = 1.1;
        G.shake = 0.5;
        sfx('boom');
        later(0.15, () => sfx('fanfare'));
        // เปลือกไข่กระเด็น
        const shellMat = G.egg.mat.clone();
        shellMat.side = THREE.DoubleSide;
        for (let i = 0; i < 24; i++) {
          const phi = (i % 8) * (TAU / 8) + R() * 0.3;
          const th = 0.3 + Math.floor(i / 8) * 0.75 + R() * 0.2;
          const sh = new THREE.Mesh(new THREE.SphereGeometry(0.58, 4, 3, phi, TAU / 10, th, 0.55), shellMat.clone());
          sh.material.side = THREE.DoubleSide;
          sh.material.emissiveIntensity = 1.2;
          sh.castShadow = true;
          sh.position.set(0, 0.75, 0);
          const v = new THREE.Vector3(Math.cos(phi + 0.45), 0.6 + R() * 0.8, Math.sin(phi + 0.45)).normalize().multiplyScalar(3 + R() * 2.5);
          const spin = new THREE.Vector3((R() - 0.5) * 12, (R() - 0.5) * 12, (R() - 0.5) * 12);
          G.world.add(sh);
          let last = lastT;
          G.fx.push({ m: sh, t0: lastT, life: 4.5, upd: (k) => {
            const dt = clamp(lastT - last, 0, 0.05);
            last = lastT;
            if (sh.position.y > 0.06 || v.y > 0) {
              v.y -= 9.8 * dt;
              sh.position.addScaledVector(v, dt);
              sh.rotation.x += spin.x * dt;
              sh.rotation.y += spin.y * dt;
              sh.rotation.z += spin.z * dt;
            } else {
              sh.position.y = 0.06;
              v.set(0, 0, 0);
            }
            sh.material.emissiveIntensity = Math.max(0, 1.2 - k * 4);
            if (k > 0.75) sh.scale.setScalar(Math.max(0.01, (1 - k) / 0.25));
          } });
        }
        // คลื่นแสงกระจาย
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.9, 64), new THREE.MeshBasicMaterial({ color: '#fff6c8', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.08;
        G.world.add(ring);
        G.fx.push({ m: ring, t0: lastT, life: 1.1, upd: (k) => {
          ring.scale.setScalar(1 + k * 7);
          ring.material.opacity = 1 - k;
        } });
        for (let i = 0; i < 44; i++) sprite(['✦', '🌸', '✦', '💗'][i % 4], new THREE.Vector3((R() - 0.5) * 0.6, 0.9 + (R() - 0.5) * 0.6, (R() - 0.5) * 0.6), { vx: (R() - 0.5) * 5, vy: 1 + R() * 3, vz: (R() - 0.5) * 5, size: 0.2 + R() * 0.25, life: 1.6 });
        // น้องเผยตัว (เด้งขึ้นจากรัง)
        G.reveal = lastT;
        G.holder.position.set(0, 0, 0);
        G.holder.rotation.y = YAW + FACE;
        play('Jump_toIdle', 0.1, { once: true });
      });
      at(5.3, () => {
        const spn = nameOf(a.species, 0) || S.speciesName || '';
        big(`🐣 ได้น้อง${esc(spn)}!<br><span>ยินดีต้อนรับ ${esc(host())}</span>`, 3.4);
        hearts(8);
        say('สวัสดีทุกคน! 💕', 3.5);
        sfx('cheer');
      });
      at(6.6, () => play('Idle_2', 0.5));
      at(8.2, () => G.hatch && (G.hatch.out = true));
      at(9.6, () => {
        el.classList.remove('cine');
        G.hatch = null;
        G.reveal = 0;
        play('Idle', 0.6);
        updatePanels();
      });
    }
    // กล้องนิ่ง (เลื่อนเข้า/ออกเฉพาะคัทซีน)
    function stepCamera(t, dt) {
      const { THREE } = G;
      // น้องยังเล็ก = กล้องเข้าใกล้ขึ้น (เห็นหน้าชัด)
      const sg = clamp(S.stage | 0, 0, 3);
      let dist = [10.4, 11.2, 12.1, 13.0][sg];
      let hgt = [4.1, 4.5, 4.9, 5.3][sg];
      let look = [0.75, 0.8, 0.85, 0.9][sg];
      if (S.egg && !G.hatch) {
        dist = 10.8;
        hgt = 4.2;
        look = 0.75;
      }
      if (G.hatch && !G.hatch.out) {
        const h = t - G.hatch.t0;
        dist = h < 4.2 ? lerp(10.5, 7.2, clamp(h / 4, 0, 1)) : 8.4;
        hgt = h < 4.2 ? 3.2 : 3.6;
        look = h < 4.2 ? 0.8 : 1.0;
      }
      const want = new THREE.Vector3(Math.sin(YAW) * dist, hgt, Math.cos(YAW) * dist);
      const k = 1 - Math.exp(-dt * (G.hatch ? 1.6 : 1.1));
      G.camPos ||= want.clone();
      G.camLook ??= look;
      G.camPos.lerp(want, k);
      G.camLook = lerp(G.camLook, look, k);
      G.shake = Math.max(0, (G.shake || 0) - dt * 0.9);
      const rumble = G.hatch && !G.hatch.burst ? clamp((t - G.hatch.t0) / 4.2, 0, 1) * 0.06 : 0;
      const sh = G.shake * 0.35 + rumble;
      G.camera.position.set(G.camPos.x + (R() - 0.5) * sh, G.camPos.y + (R() - 0.5) * sh, G.camPos.z);
      G.camera.lookAt(0, G.camLook, 0);
      // ฉากมืดลงช่วงไข่สั่น แล้วสว่างวาบตอนแตก
      const dramTo = G.hatch && !G.hatch.burst ? clamp((t - G.hatch.t0) / 2.5, 0, 1) : 0;
      G.dram = lerp(G.dram || 0, dramTo, 1 - Math.exp(-dt * 2.5));
      if (G.hatch?.beams && !G.hatch.burst) {
        const k2 = clamp((t - G.hatch.t0 - 2.0) / 2.2, 0, 1);
        G.hatch.beams.forEach((b, i) => {
          b.scale.set(0.4 + k2 * 0.8, k2 * (1.2 + (i % 3) * 0.4), 0.4 + k2 * 0.8);
          b.material.opacity = k2 * 0.26 * (0.7 + Math.sin(t * 13 + i) * 0.3);
        });
      }
    }
    function buildBase() {
      const { THREE, world } = G;
      const BR = 3.0;
      const grassTex = canvasTex(1024, 1024, (c, w, h) => {
        const g = c.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, w / 2);
        g.addColorStop(0, '#7fb53e');
        g.addColorStop(1, '#4f8a2a');
        c.fillStyle = g;
        c.fillRect(0, 0, w, h);
        for (let i = 0; i < 9000; i++) {
          const x = R() * w;
          const y = R() * h;
          c.strokeStyle = ['#5f9c30', '#8cc44a', '#47802a', '#9fd060', '#6aa838'][i % 5];
          c.globalAlpha = 0.5;
          c.lineWidth = 2;
          c.beginPath();
          c.moveTo(x, y);
          c.lineTo(x + (R() - 0.5) * 6, y - 6 - R() * 8);
          c.stroke();
        }
        c.globalAlpha = 0.35;
        for (let i = 0; i < 26; i++) {
          c.fillStyle = R() < 0.5 ? '#3f6e22' : '#a8d86a';
          c.beginPath();
          c.ellipse(R() * w, R() * h, 30 + R() * 60, 20 + R() * 40, R() * 3, 0, TAU);
          c.fill();
        }
      });
      const stoneTex = canvasTex(1024, 128, (c, w, h) => {
        c.fillStyle = '#8f8a86';
        c.fillRect(0, 0, w, h);
        for (let i = 0; i < 400; i++) {
          c.fillStyle = R() < 0.5 ? 'rgba(60,55,52,.25)' : 'rgba(200,195,190,.2)';
          c.fillRect(R() * w, R() * h, 3 + R() * 12, 2 + R() * 5);
        }
        c.strokeStyle = 'rgba(50,45,42,.7)';
        c.lineWidth = 2;
        for (let i = 0; i < 16; i++) {
          let x = R() * w;
          c.beginPath();
          c.moveTo(x, 0);
          for (let y = 0; y < h; y += 16) c.lineTo((x += (R() - 0.5) * 14), y);
          c.stroke();
        }
      });
      stoneTex.wrapS = THREE.RepeatWrapping;
      const base = new THREE.Group();
      world.add(base);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(BR, BR, 0.12, 96), new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.95 }));
      top.position.y = -0.06;
      top.receiveShadow = true;
      base.add(top);
      const rimM = new THREE.Mesh(new THREE.CylinderGeometry(BR + 0.12, BR + 0.2, 0.26, 96, 1, true), new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.9 }));
      rimM.position.y = -0.19;
      base.add(rimM);
      const rimTop = new THREE.Mesh(new THREE.RingGeometry(BR - 0.02, BR + 0.12, 96), new THREE.MeshStandardMaterial({ color: '#a39d97', roughness: 0.9 }));
      rimTop.rotation.x = -Math.PI / 2;
      rimTop.position.y = -0.005;
      base.add(rimTop);
      // ใบหญ้ารอบขอบ (instanced)
      const blade = new THREE.ConeGeometry(0.025, 0.28, 3).translate(0, 0.14, 0);
      const n = 1100;
      const inst = new THREE.InstancedMesh(blade, new THREE.MeshStandardMaterial({ roughness: 0.8 }), n);
      const m4 = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const col = new THREE.Color();
      let k = 0;
      for (let i = 0; i < n * 4 && k < n; i++) {
        const r = BR * Math.sqrt(R());
        if (r < 2.0 && R() < 0.9) continue;
        const a = R() * TAU;
        q.setFromEuler(new THREE.Euler((R() - 0.5) * 0.6, R() * TAU, (R() - 0.5) * 0.6));
        const s = 0.45 + R() * 0.6 * (r > 2.4 ? 1.4 : 1);
        m4.compose(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r), q, new THREE.Vector3(s, s, s));
        inst.setMatrixAt(k, m4);
        inst.setColorAt(k, col.set(['#6aa838', '#8cc44a', '#4f8a2a', '#a6d468'][k % 4]));
        k++;
      }
      inst.count = k;
      inst.castShadow = true;
      inst.receiveShadow = true;
      base.add(inst);
      // เฟิร์น
      const fernTex = canvasTex(256, 512, (c, w, h) => {
        c.strokeStyle = '#3f7a25';
        c.lineWidth = 6;
        c.beginPath();
        c.moveTo(w / 2, h);
        c.quadraticCurveTo(w / 2 + 10, h / 2, w / 2, 10);
        c.stroke();
        for (let y = 30; y < h - 20; y += 22) {
          const len = 20 + (1 - Math.abs(y - h * 0.55) / (h * 0.55)) * 90;
          for (const sx of [-1, 1]) {
            c.fillStyle = y % 44 ? '#6fb33c' : '#5c9e32';
            c.beginPath();
            c.ellipse(w / 2 + sx * len * 0.5, y, len * 0.5, 9, sx * 0.25, 0, TAU);
            c.fill();
          }
        }
      });
      const fernMat = new THREE.MeshStandardMaterial({ map: fernTex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.85 });
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * TAU + R() * 0.4;
        const r = 2.35 + R() * 0.5;
        const fern = new THREE.Group();
        for (let j = 0; j < 6; j++) {
          const p = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.75).translate(0, 0.37, 0), fernMat);
          p.rotation.set(-0.9 - R() * 0.4, 0, 0);
          p.castShadow = true;
          const hd = new THREE.Group();
          hd.rotation.y = (j / 6) * TAU + R();
          hd.add(p);
          fern.add(hd);
        }
        fern.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
        fern.scale.setScalar(0.55 + R() * 0.45);
        base.add(fern);
      }
      // ดอกไม้เล็ก ๆ + ก้อนหิน
      for (let i = 0; i < 14; i++) {
        const a = R() * TAU;
        const r = 2.0 + R() * 0.85;
        const fl = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshStandardMaterial({ color: ['#ff7ab0', '#ffffff', '#ffd23f', '#b98cff'][i % 4], roughness: 0.6 }));
        fl.position.set(Math.cos(a) * r, 0.2 + R() * 0.1, Math.sin(a) * r);
        fl.castShadow = true;
        base.add(fl);
      }
      for (let i = 0; i < 7; i++) {
        const a = R() * TAU;
        const r = 1.7 + R() * 1.1;
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12 + R() * 0.12, 0), new THREE.MeshStandardMaterial({ color: '#7d7a6e', roughness: 1, flatShading: true }));
        rock.position.set(Math.cos(a) * r, 0.03, Math.sin(a) * r);
        rock.scale.y = 0.55;
        rock.castShadow = rock.receiveShadow = true;
        base.add(rock);
      }
      // หิ่งห้อยตอนกลางคืน
      const flies = [];
      for (let i = 0; i < 16; i++) {
        const f = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: '#e4ff8a', transparent: true, opacity: 0 }));
        f.userData = { a: R() * TAU, r: 1.2 + R() * 2.2, y: 0.4 + R() * 2.2, v: 0.15 + R() * 0.3 };
        base.add(f);
        flies.push(f);
      }
      G.flies = flies;
      base.scale.setScalar(BASE_S); // ฐานเล็กลงให้น้องเด่น + เห็นเกาะในภาพฉากหลังสองข้าง
      G.base = base;
    }
    // สร้างตัวน้องตามชนิด/ร่าง (เปลี่ยนได้ระหว่างไลฟ์ เช่น ตอนฟักไข่ หรือพิธีวิวัฒนาการ)
    async function loadSpecies(sp) {
      const { THREE } = G;
      const SP = SPECIES[sp] || SPECIES.stag;
      const want = SPECIES[sp] ? sp : 'stag';
      const file = fileOf(want, S.stage);
      const key = want + '|' + file;
      G.loadingSp = want;
      G.loadingKey = key;
      const P = window.makeChibiPet(THREE, want, file === SP.evo);
      // ถอดตัวเก่าออก
      if (G.pet) {
        G.sizer.remove(G.pet);
        G.pet.traverse((o) => o.isMesh && o.geometry.dispose());
      }
      G.baseScale = (file === SP.evo ? SP.evoH || SP.h : SP.h) / P.height;
      if (!G.holder) {
        G.holder = new THREE.Group();
        G.sizer = new THREE.Group();
        G.holder.add(G.sizer);
        G.world.add(G.holder);
      }
      G.sizer.add(P.root);
      G.pet = P.root;
      G.chibi = P;
      G.mats = P.mats;
      G.mainMat = P.mainMat;
      G.headBone = P.headTop;
      G.species = want;
      G.SP = SP;
      G.modelKey = key;
      G.ageK = AGE_SCALE[S.stage] ?? 1;
      if (G.crownObj) {
        G.world.remove(G.crownObj);
        G.crownObj = null;
      }
      if (G.kingObj) {
        G.world.remove(G.kingObj);
        G.kingObj = null;
      }
      applyLook(true);
      play('Idle', 0);
    }
    // เขากวางวิเศษโตตามวัย
    function setHorns(k) {
      G?.chibi?.setHorn(k);
    }
    function applyLook(now) {
      if (!G?.ready) return;
      const { THREE } = G;
      const SP = G.SP || SPECIES.stag;
      const adult = S.stage >= 3 && S.form;
      for (const m of G.mats) if (m.userData.orig) m.color.copy(m.userData.orig);
      // ร่างโตเต็มวัย: ย้อมสีขนหลักผสมสีเดิมให้ยังดูออกว่าเป็นตัวอะไร
      if (adult && G.mainMat) G.mainMat.color.copy(G.mainMat.userData.orig).lerp(new THREE.Color(SP.king || FORM_TINT[S.form]), SP.king ? 0.55 : 0.25);
      if (now) {
        G.ageK = AGE_SCALE[S.stage] ?? 1;
        setHorns(HORN_SCALE[S.stage] ?? 1);
      }
      void THREE;
    }
    // เปลี่ยนท่า (ค่อย ๆ ผสมจากท่าเดิม)
    function play(name, fade = 0.45, o = {}) {
      if (!G?.chibi) return;
      G.chibi.play(name, { ...o, fade });
      G.curName = name;
    }

    // ---------------------------------------------------------------- สไปรต์/ของประกอบ
    const texCache = {};
    function emojiTex(t) {
      if (texCache[t]) return texCache[t];
      return (texCache[t] = canvasTex(128, 128, (c) => {
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        if (t === 'Z' || t === '✦') {
          c.font = '800 96px Kanit, sans-serif';
          c.lineWidth = 10;
          c.strokeStyle = t === 'Z' ? '#2b2a4a' : '#7a5a00';
          c.strokeText(t, 64, 70);
          c.fillStyle = t === 'Z' ? '#d8e6ff' : '#fff3a0';
          c.fillText(t, 64, 70);
        } else if (t === 'bubble') {
          const g = c.createRadialGradient(46, 46, 4, 64, 64, 60);
          g.addColorStop(0, 'rgba(255,255,255,.95)');
          g.addColorStop(0.5, 'rgba(200,240,255,.25)');
          g.addColorStop(0.9, 'rgba(160,220,255,.55)');
          g.addColorStop(1, 'rgba(160,220,255,0)');
          c.fillStyle = g;
          c.beginPath();
          c.arc(64, 64, 60, 0, TAU);
          c.fill();
        } else if (t === 'glow') {
          const g = c.createRadialGradient(64, 64, 2, 64, 64, 64);
          g.addColorStop(0, 'rgba(255,250,200,1)');
          g.addColorStop(0.4, 'rgba(255,220,120,.5)');
          g.addColorStop(1, 'rgba(255,200,80,0)');
          c.fillStyle = g;
          c.fillRect(0, 0, 128, 128);
        } else if (t === 'fly') {
          // ผีเสื้อทอง
          c.fillStyle = '#ffd23f';
          c.strokeStyle = '#7a4a00';
          c.lineWidth = 4;
          for (const sx of [-1, 1]) {
            c.beginPath();
            c.ellipse(64 + sx * 28, 48, 26, 30, sx * 0.4, 0, TAU);
            c.fill();
            c.stroke();
            c.beginPath();
            c.ellipse(64 + sx * 22, 88, 16, 20, sx * -0.3, 0, TAU);
            c.fill();
            c.stroke();
          }
          c.fillStyle = '#4a2a00';
          c.fillRect(60, 36, 8, 64);
        } else {
          c.font = '92px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
          c.fillText(t, 64, 72);
        }
      }));
    }
    function sprite(t, pos, o = {}) {
      const { THREE } = G;
      const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTex(t), transparent: true, depthWrite: false, blending: o.add ? THREE.AdditiveBlending : THREE.NormalBlending }));
      m.position.copy(pos);
      const size = o.size || 0.4;
      m.scale.setScalar(size);
      G.world.add(m);
      G.fx.push({ m, t0: lastT, life: o.life || 1.6, vy: o.vy ?? 0.7, vx: o.vx || 0, vz: o.vz || 0, size, upd: o.upd, pop: o.pop ?? 1 });
      return m;
    }
    const headPos = (dy = 0) => {
      const { THREE } = G;
      const p = new THREE.Vector3();
      if (G.headBone) G.headBone.getWorldPosition(p);
      else G.holder.getWorldPosition(p).add(new THREE.Vector3(0, 2.2 * G.ageK, 0));
      p.y += dy;
      return G.world.worldToLocal(p);
    };
    const frontPos = (d = 1.25) => {
      const { THREE } = G;
      return new THREE.Vector3(0, 0, d * G.ageK + 0.2).applyMatrix4(G.holder.matrix);
    };
    function prop(obj, life) {
      G.world.add(obj);
      G.fx.push({ m: obj, t0: lastT, life, keep: 1 });
      return obj;
    }
    function makeFood(kind) {
      const { THREE } = G;
      const g = new THREE.Group();
      if (kind === 'candy') {
        for (let i = 0; i < 5; i++) {
          const b = new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 10), new THREE.MeshStandardMaterial({ color: ['#ff6fb5', '#7cc8ff', '#ffd23f', '#9be15d', '#ff8a3d'][i], roughness: 0.25 }));
          b.position.set((R() - 0.5) * 0.3, 0.08, (R() - 0.5) * 0.3);
          b.castShadow = true;
          g.add(b);
        }
      } else {
        const big = kind === 'basket';
        if (big) {
          const bk = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.26, 0.24, 20, 1, true), new THREE.MeshStandardMaterial({ color: '#c08a4a', roughness: 0.9, side: THREE.DoubleSide }));
          bk.position.y = 0.12;
          bk.castShadow = true;
          g.add(bk);
        }
        for (let i = 0; i < (big ? 14 : 9); i++) {
          const b = new THREE.Mesh(new THREE.SphereGeometry(big ? 0.085 : 0.07, 14, 10), new THREE.MeshStandardMaterial({ color: ['#e8364f', '#e8364f', '#7b3fd0', '#ff9a2e', '#9be15d'][i % 5], roughness: 0.35 }));
          b.position.set((R() - 0.5) * (big ? 0.42 : 0.25), (big ? 0.22 : 0.06) + (i > 7 ? 0.09 : 0), (R() - 0.5) * (big ? 0.42 : 0.25));
          b.castShadow = true;
          g.add(b);
        }
      }
      const leaf = new THREE.Mesh(new THREE.CircleGeometry(0.3, 20), new THREE.MeshStandardMaterial({ color: '#5aa33a', side: THREE.DoubleSide }));
      leaf.rotation.x = -Math.PI / 2;
      leaf.position.y = 0.012;
      leaf.userData.keep = 1;
      g.add(leaf);
      return g;
    }
    function makeKingCrown() {
      const { THREE } = G;
      const g = new THREE.Group();
      const gold = new THREE.MeshStandardMaterial({ color: '#ffcf3a', metalness: 0.85, roughness: 0.25, emissive: '#ff9a00', emissiveIntensity: 0.2 });
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.12, 24, 1, true), gold);
      band.material.side = THREE.DoubleSide;
      g.add(band);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const sp = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 6), gold);
        sp.position.set(Math.cos(a) * 0.24, 0.14, Math.sin(a) * 0.24);
        g.add(sp);
        const gem = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshStandardMaterial({ color: ['#ff3d6e', '#3dc8ff', '#7dff6b'][i % 3], emissive: ['#ff3d6e', '#3dc8ff', '#7dff6b'][i % 3], emissiveIntensity: 0.5, roughness: 0.2 }));
        gem.position.set(Math.cos(a) * 0.255, 0, Math.sin(a) * 0.255);
        g.add(gem);
      }
      g.traverse((o) => o.isMesh && (o.castShadow = true));
      return g;
    }
    function makeCrown() {
      const { THREE } = G;
      const g = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 8, 32), new THREE.MeshStandardMaterial({ color: '#5aa33a', roughness: 0.7 }));
      ring.rotation.x = Math.PI / 2;
      g.add(ring);
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * TAU;
        const f = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), new THREE.MeshStandardMaterial({ color: ['#ff6fa8', '#ffffff', '#ffd23f'][i % 3], roughness: 0.5, emissive: '#ff9ac8', emissiveIntensity: 0.15 }));
        f.position.set(Math.cos(a) * 0.22, 0.03, Math.sin(a) * 0.22);
        f.castShadow = true;
        g.add(f);
      }
      return g;
    }

    // ---------------------------------------------------------------- ท่าทางตามคิวของเซิร์ฟเวอร์
    let walkU = 0;
    let walking = 0;
    let food = null;
    let ball = null;
    let actEnd = 0;
    function clearAct() {
      timers.length = 0;
      walking = 0;
      if (food) G.world.remove(food);
      if (ball) G.world.remove(ball);
      food = ball = null;
    }
    function startAct(fromBoot) {
      if (!G?.ready) return;
      const a = S.act;
      if (!a) {
        if (curPid !== -2) {
          curPid = -2;
          clearAct();
          idleNow();
        }
        return;
      }
      if (a.pid === curPid) return;
      curPid = a.pid;
      clearAct();
      if (a.k === 'hatch') return hatchCut(a);
      const el0 = Math.max(0, (a.dur - a.left) / 1000);
      actEnd = lastT + a.left / 1000;
      if (el0 > 1.5 && !fromBoot) return idleNow();
      const it = a.item ? S.items?.[a.item] : null;
      const who = esc(a.by || '');
      const helpers = a.n > 1 ? ` <small>+${a.n - 1} คนช่วย</small>` : '';
      if (a.k === 'evolve') return evolve(a.stage);
      if (it) {
        banner(`${it.icon} <b>${who}</b> ให้ ${esc(it.name)}${a.count > 1 ? ` ×${a.count}` : ''}!`, a.item >= 'g7' ? 't3' : 't2', 4);
        if (a.item >= 'g7') big(`${it.icon} ${esc(it.name)}!`, 1.8);
      } else if (ACT_TXT[a.k]) banner(`${ACT_TXT[a.k][0]} <b>${who}</b> ${ACT_TXT[a.k][1]}${helpers}`, 't1', 3);
      const T0 = lastT;
      const at = (d, fn) => later(d, fn);
      const P = G.THREE;
      switch (a.k) {
        case 'feed': {
          const kind = a.item === 'g1' ? 'candy' : a.item === 'g5' ? 'basket' : 'berry';
          food = makeFood(kind);
          const fp = frontPos();
          food.position.set(fp.x, 2.6, fp.z);
          food.userData.drop = T0;
          G.world.add(food);
          sfx('pop');
          say(['ว้าว ของกิน!', 'หิวพอดีเลย!', 'ขอบคุณน้า~'][Math.floor(R() * 3)]);
          at(0.65, () => play('Eating', 0.4));
          for (let i = 1; i <= 3; i++) at(0.65 + i * 1.0, () => food && (food.userData.bite = i));
          at(4.3, () => {
            if (food) G.world.remove(food);
            food = null;
            play('Jump_toIdle', 0.3, { once: true });
            hearts(4);
            say('อร่อยมาก!');
            sfx('chime', 880);
          });
          at(5.4, () => play('Idle', 0.5));
          break;
        }
        case 'walk':
          walking = 1;
          walkU = Math.atan2(G.holder.position.x, G.holder.position.z);
          play('Walk', 0.5);
          say('ไปเดินเล่นกัน~');
          at(6.2, () => {
            walking = 0;
            play('Idle_2', 0.6);
          });
          break;
        case 'play': {
          play('Jump_toIdle', 0.25, { once: true });
          say(a.item ? 'ลูกบอล! เย้!' : 'เล่นกัน!');
          sfx('whoosh');
          if (a.item === 'g3') {
            ball = new P.Mesh(new P.SphereGeometry(0.2, 24, 16), new P.MeshStandardMaterial({ map: canvasTex(128, 64, (c, w, h) => {
              c.fillStyle = '#ffffff';
              c.fillRect(0, 0, w, h);
              c.fillStyle = '#ff4f6a';
              for (let x = 0; x < w; x += 32) c.fillRect(x, 0, 16, h);
            }), roughness: 0.4 }));
            ball.castShadow = true;
            ball.position.set(0, 0.2, 0);
            G.world.add(ball);
          }
          walkU = Math.atan2(G.holder.position.x, G.holder.position.z);
          at(1.0, () => {
            walking = 2;
            play('Gallop', 0.35);
          });
          at(4.6, () => {
            walking = 0;
            play('Gallop_Jump', 0.25, { once: true });
          });
          at(5.6, () => {
            play('Idle_2', 0.5);
            for (let i = 0; i < 3; i++) sprite('⭐', headPos(0.3).add(new P.Vector3((R() - 0.5) * 0.8, 0, 0)), { vy: 0.7 });
            if (ball) G.world.remove(ball);
            ball = null;
          });
          break;
        }
        case 'pet': {
          play(R() < 0.5 ? 'Idle_HitReact_Left' : 'Idle_HitReact_Right', 0.25, { once: true });
          say(a.item ? 'ม๊วฟ! 😘' : 'ชอบจัง~');
          for (let i = 0; i < (a.item ? 8 : 3); i++) at(i * 0.25, () => sprite(a.item ? '😘' : '💗', headPos(0.3).add(new P.Vector3((R() - 0.5) * 0.7, 0, 0)), { vy: 0.8, size: a.item ? 0.5 : 0.4 }));
          sfx('pop');
          at(1.3, () => play('Idle', 0.5));
          break;
        }
        case 'bath': {
          say('อาบน้ำ~ ฟองเยอะเลย!');
          sfx('whoosh');
          const n = a.item ? 46 : 26;
          for (let i = 0; i < n; i++) at(i * 0.08, () => {
            const h = headPos();
            const p = G.holder.position;
            sprite('bubble', new P.Vector3(p.x + (R() - 0.5) * 1.4 * G.ageK, 0.3 + R() * (h.y - 0.2), p.z + (R() - 0.5) * 1.2 * G.ageK), { vy: 0.3 + R() * 0.4, size: 0.18 + R() * 0.3, life: 2.2 });
          });
          at(0.8, () => play('Idle_HitReact_Left', 0.25, { once: true }));
          at(2.0, () => play('Idle_HitReact_Right', 0.25, { once: true }));
          at(3.4, () => {
            play('Jump_toIdle', 0.3, { once: true });
            for (let i = 0; i < 10; i++) sprite('✦', headPos(-0.4).add(new P.Vector3((R() - 0.5) * 1.6, (R() - 0.5) * 1.2, (R() - 0.5) * 0.8)), { vy: 0.2, size: 0.25, life: 1.2 });
            say('สะอาดเอี่ยม! ✨');
            sfx('chime', 1175);
          });
          at(4.6, () => play('Idle', 0.5));
          break;
        }
        case 'gift':
          giftFx(a);
          break;
      }
    }
    function giftFx(a) {
      const P = G.THREE;
      const at = (d, fn) => later(d, fn);
      if (a.item === 'g6') {
        // หมอนเมฆ: นอนพักแป๊บเดียว พลังเต็ม
        const cl = new P.Group();
        for (const [x, y, r] of [[0, 0, 0.45], [0.42, -0.05, 0.32], [-0.42, -0.05, 0.32], [0.15, 0.2, 0.3]]) {
          const b = new P.Mesh(new P.SphereGeometry(r, 20, 14), new P.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }));
          b.position.set(x, y, 0);
          b.castShadow = true;
          cl.add(b);
        }
        const fp = frontPos(0.6);
        cl.position.set(fp.x, 0.35, fp.z);
        cl.scale.setScalar(0.01);
        prop(cl, 4.2);
        G.fx[G.fx.length - 1].upd = (k) => cl.scale.setScalar(Math.max(0.01, Math.min(1, k * 6) * (k > 0.85 ? (1 - k) / 0.15 : 1)));
        play('Idle_Headlow', 0.6, { speed: 0.4 });
        say('นุ่มจัง... ชาร์จพลัง!');
        sfx('chime', 660);
        for (let i = 0; i < 12; i++) at(0.4 + i * 0.25, () => sprite('⚡', headPos(0.2).add(new P.Vector3((R() - 0.5) * 1, 0, 0)), { vy: 0.6, size: 0.3 }));
        at(3.4, () => play('Jump_toIdle', 0.3, { once: true }));
        at(4.2, () => play('Idle', 0.5));
      } else if (a.item === 'g7') {
        // มงกุฎดอกไม้ลอยลงมาสวมหัว
        const cr = makeCrown();
        const h = headPos(0.35);
        cr.position.set(h.x, h.y + 2.2, h.z);
        prop(cr, 2.2);
        G.fx[G.fx.length - 1].upd = (k) => {
          const hh = headPos(0.35);
          cr.position.set(hh.x, lerp(hh.y + 2.2, hh.y, ease(k)), hh.z);
          cr.rotation.y = k * TAU * 2;
          cr.scale.setScalar(G.ageK * 1.3);
        };
        say('สวยไหม~ 🌸');
        sfx('chime', 988);
        for (let i = 0; i < 14; i++) at(i * 0.12, () => sprite(['🌸', '✦'][i % 2], headPos(0.5).add(new P.Vector3((R() - 0.5) * 1.4, (R() - 0.5) * 0.6, 0)), { vy: -0.2, size: 0.3 }));
        at(2.0, () => (play('Jump_toIdle', 0.3, { once: true }), hearts(5)));
        at(3.2, () => play('Idle_2', 0.5));
      } else if (a.item === 'g8') {
        // ฝูงผีเสื้อทองบินวนรอบตัว
        say('ผีเสื้อทองเต็มเลย!');
        sfx('chime', 1318);
        for (let i = 0; i < 22; i++) {
          const ph = R() * TAU;
          const rr = 0.9 + R() * 1.2;
          const yy = 0.6 + R() * 2.2;
          const sp = 0.8 + R() * 0.8;
          const m = sprite('fly', headPos(), { life: 4.2, size: 0.3, vy: 0, pop: 0 });
          G.fx[G.fx.length - 1].upd = (k) => {
            const p = G.holder.position;
            const a1 = ph + k * TAU * sp;
            m.position.set(p.x + Math.cos(a1) * rr, yy + Math.sin(k * 12 + ph) * 0.2 + (k > 0.8 ? (k - 0.8) * 10 : 0), p.z + Math.sin(a1) * rr);
            m.scale.set(0.3 * Math.abs(Math.cos(lastT * 18 + ph)) + 0.05, 0.3, 1);
          };
        }
        play('Idle_2', 0.4);
        at(1.6, () => play('Jump_toIdle', 0.3, { once: true }));
        at(2.8, () => play('Idle', 0.5));
      } else if (a.item === 'g9') {
        // พรแห่งป่า: แสงลงจากฟ้า ตัวเรืองแสง
        say('รู้สึกพลังเต็มเปี่ยม!');
        sfx('fanfare');
        const pil = new P.Mesh(new P.CylinderGeometry(1.1, 1.4, 14, 32, 1, true), new P.MeshBasicMaterial({ color: '#fff3b0', transparent: true, opacity: 0, side: P.DoubleSide, depthWrite: false, blending: P.AdditiveBlending }));
        pil.position.set(G.holder.position.x, 7, G.holder.position.z);
        prop(pil, 3.6);
        G.fx[G.fx.length - 1].upd = (k) => (pil.material.opacity = Math.sin(k * Math.PI) * 0.25);
        G.flashUntil = lastT + 3.2;
        for (let i = 0; i < 40; i++) at(i * 0.07, () => sprite('✦', headPos(-0.6).add(new P.Vector3((R() - 0.5) * 2.2, (R() - 0.5) * 2, (R() - 0.5) * 1.4)), { vy: 0.4, size: 0.22 + R() * 0.2, life: 1.4 }));
        at(1.2, () => play('Jump_toIdle', 0.3, { once: true }));
        at(2.4, () => (play('Idle_2', 0.4), hearts(6)));
      }
    }
    function evolve(stage) {
      const P = G.THREE;
      const sp = G.species;
      const changeTo = SPECIES[sp]?.evoAt === stage ? SPECIES[sp].evoName : '';
      big(changeTo ? `🌟 วิวัฒนาการ!<br><span>กลายเป็น${esc(changeTo)}!</span>` : `🌟 ${esc(host())}<br><span>โตเป็น${STAGE_TXT[stage] || ''}แล้ว!</span>`, 3.4);
      sfx('fanfare');
      const pil = new P.Mesh(new P.CylinderGeometry(0.9, 1.3, 14, 32, 1, true), new P.MeshBasicMaterial({ color: '#fff6c8', transparent: true, opacity: 0, side: P.DoubleSide, depthWrite: false, blending: P.AdditiveBlending }));
      pil.position.set(G.holder.position.x, 7, G.holder.position.z);
      prop(pil, 5.5);
      G.fx[G.fx.length - 1].upd = (k) => (pil.material.opacity = Math.sin(k * Math.PI) * 0.28);
      G.evo = { t0: lastT, from: G.ageK, to: AGE_SCALE[stage] ?? 1, hornTo: HORN_SCALE[stage] ?? 1, hornFrom: HORN_SCALE[Math.max(0, stage - 1)] ?? 1 };
      play('Idle_Headlow', 0.5, { speed: 0.6 });
      later(2.4, () => {
        // ร่างใหม่ (โมเดลอีกตัว) โผล่ตอนแสงวาบ
        if (G.species + '|' + fileOf(G.species, stage) !== G.modelKey) loadSpecies(G.species).catch(() => {});
        applyLook(false);
        G.flash = 1;
        sfx('boom');
        play('Jump_toIdle', 0.2, { once: true });
        for (let i = 0; i < 50; i++) sprite('✦', headPos(-0.5).add(new P.Vector3((R() - 0.5) * 3, (R() - 0.5) * 2.4, (R() - 0.5) * 2)), { vy: 0.5, size: 0.25 + R() * 0.25, life: 1.8 });
      });
      later(3.6, () => (play('Idle_2', 0.5), hearts(6)));
    }
    function hearts(n) {
      const P = G.THREE;
      for (let i = 0; i < n; i++) later(i * 0.12, () => sprite('💗', headPos(0.3).add(new P.Vector3((R() - 0.5) * 0.9, 0, (R() - 0.5) * 0.3)), { vy: 0.6 + R() * 0.5 }));
    }
    function idleNow() {
      if (S.sleep) return play('Idle_Headlow', 0.8, { speed: 0.35 });
      play(S.want ? 'Idle_Headlow' : 'Idle', 0.6);
    }

    // ---------------------------------------------------------------- สถานะจากเซิร์ฟเวอร์
    function apply(s) {
      const prev = S;
      S = { ...S, ...s };
      if (G?.ready && S.species) {
        const evoWait = S.act?.k === 'evolve' || (S.queue || []).some((q) => q.k === 'evolve') || G.evo;
        const key = S.species + '|' + fileOf(S.species, S.stage);
        if (S.species !== G.loadingSp || (key !== G.loadingKey && !evoWait)) loadSpecies(S.species).catch((e) => console.warn('pet3d species', e));
      }
      if (G?.ready) {
        // วัย/ร่างเปลี่ยน: รอเล่นพิธีโตก่อน (ถ้ามีในคิว) ค่อยเปลี่ยนขนาดและสี
        const evoPending = S.act?.k === 'evolve' || (S.queue || []).some((q) => q.k === 'evolve');
        if (!evoPending && !G.evo && (prev.stage !== S.stage || prev.form !== S.form)) applyLook(prev.stage !== S.stage);
        if (prev.sleep !== S.sleep) {
          buildSky();
          clearAct();
          idleNow();
        }
        startAct(false);
      }
      updatePanels();
    }
    function onEv(d) {
      switch (d.ev) {
        case 'join':
          if (d.n >= 2) banner(`${ACT_TXT[d.k]?.[0] || '✨'} <b>${esc(d.by)}</b> มาช่วยด้วย! <small>(${d.n} คน)</small>`, 't1', 2.4);
          break;
        case 'busy':
          banner(`⏳ น้องยุ่งอยู่ รอคิวแป๊บนะ <b>${esc(d.by)}</b>`, 't1', 2);
          break;
        case 'sleep':
          banner(`🌙 <b>${esc(d.by || 'น้อง')}</b> พาน้องเข้านอน`, 't1', 3);
          say('ราตรีสวัสดิ์... 💤');
          sfx('chime', 392);
          break;
        case 'wake':
          banner(`☀️ ${d.by ? `<b>${esc(d.by)}</b> ปลุกน้องแล้ว` : 'น้องตื่นแล้ว!'}`, 't1', 3);
          say('อรุณสวัสดิ์!');
          sfx('chime', 784);
          if (G?.ready) play('Jump_toIdle', 0.4, { once: true });
          later(1.2, () => idleNow());
          break;
        case 'sleepPet':
          if (G?.ready) hearts(2);
          break;
        case 'want':
          if (WANT_TXT[d.k]) say(WANT_TXT[d.k], 5);
          break;
        case 'love':
          if (G?.ready) hearts(5);
          sfx('pop');
          break;
        case 'warm': {
          if (G?.ready && G.egg) {
            const P = G.THREE;
            G.egg.wob = Math.min(1.3, G.egg.wob + 0.18 + Math.min(0.6, d.pts / 30));
            const n = d.gift ? 12 : Math.min(4, 1 + Math.floor(d.pts / 6));
            for (let i = 0; i < n; i++) sprite(d.gift && i % 2 ? d.gift : d.pts >= 6 ? '🔥' : '💗', new P.Vector3((R() - 0.5) * 1.3, 0.5 + R() * 0.9, (R() - 0.5) * 0.7), { vy: 0.7, size: d.gift ? 0.36 : 0.24, life: 1.3 });
          }
          if (d.by && (d.pts >= 6 || d.gift)) chip(`${d.gift || '🔥'} ${esc(d.by)} +${d.pts}`);
          if (d.gift) banner(`${d.gift} <b>${esc(d.by)}</b> ช่วยอุ่นไข่ +${d.pts}!`, 't2', 3);
          if (R() < 0.35) sfx('pop');
          break;
        }
        case 'badge':
          banner(`${esc(d.icon)} <b>${esc(d.name)}</b> ได้ป้าย “${esc(d.title)}”`, 't2', 4);
          break;
      }
    }

    // ---------------------------------------------------------------- วาดต่อเฟรม
    function frame(c, t) {
      const dt = clamp(t - (lastT || t), 0, 0.1);
      lastT = t;
      for (let i = timers.length - 1; i >= 0; i--) if (t >= timers[i].at) {
        const fn = timers[i].fn;
        timers.splice(i, 1);
        try {
          fn();
        } catch (e) {
          console.warn('pet3d fx', e);
        }
      }
      if (!G?.ready) {
        const g = c.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#7cc6ff');
        g.addColorStop(1, '#dff3ff');
        c.fillStyle = g;
        c.fillRect(0, 0, W, H);
        c.font = '600 44px Kanit, sans-serif';
        c.textAlign = 'center';
        c.fillStyle = '#2b4a6b';
        c.fillText(failed || 'กำลังพาน้องมา... 🦌', W / 2, 960);
        tickBubble(t);
        return;
      }
      const P = G.THREE;
      if (Math.floor(t) % 20 === 0) buildSky();
      // เดิน/วิ่งวนรอบฐาน
      const hd = G.holder;
      if (walking) {
        const rad = walking === 2 ? 1.12 : 0.95;
        const sp = walking === 2 ? 1.25 : 0.42;
        walkU += sp * dt;
        hd.position.x = lerp(hd.position.x, Math.sin(walkU) * rad, 1 - Math.exp(-dt * 4));
        hd.position.z = lerp(hd.position.z, Math.cos(walkU) * rad, 1 - Math.exp(-dt * 4));
        hd.rotation.y = lerp(hd.rotation.y, walkU + Math.PI / 2, 1 - Math.exp(-dt * 6));
        if (ball) ball.position.set(Math.sin(walkU + 0.5) * rad, 0.2, Math.cos(walkU + 0.5) * rad);
      } else {
        hd.position.x = lerp(hd.position.x, 0, 1 - Math.exp(-dt * 1.5));
        hd.position.z = lerp(hd.position.z, 0, 1 - Math.exp(-dt * 1.5));
        // หันหน้าเข้าหากล้องเฉียง ๆ
        const want = YAW + FACE; // หันหน้าเข้าจอ (เฉียงนิดเดียวให้เห็นตัวเป็น 3D)
        const cur = hd.rotation.y;
        const d = Math.atan2(Math.sin(want - cur), Math.cos(want - cur));
        hd.rotation.y = cur + d * (1 - Math.exp(-dt * 1.2));
      }
      // วัย: ขนาดตัว (ค่อย ๆ โตตอนพิธีโต)
      if (G.evo) {
        const k = clamp((t - G.evo.t0 - 2.0) / 0.8, 0, 1);
        G.ageK = lerp(G.evo.from, G.evo.to, ease(k));
        setHorns(lerp(G.evo.hornFrom, G.evo.hornTo, ease(k)));
        const glow = Math.sin(clamp((t - G.evo.t0) / 3.2, 0, 1) * Math.PI);
        for (const m of G.mats) m.emissiveIntensity = glow * 0.55;
        if (t - G.evo.t0 > 3.4) {
          for (const m of G.mats) m.emissiveIntensity = 0;
          G.evo = null;
        }
      } else if (G.flashUntil && t < G.flashUntil) {
        const glow = Math.sin(((G.flashUntil - t) / 3.2) * Math.PI) * 0.5;
        for (const m of G.mats) m.emissiveIntensity = glow;
      } else if (G.flashUntil) {
        for (const m of G.mats) m.emissiveIntensity = 0;
        G.flashUntil = 0;
      }
      // ตอนเป็นไข่ซ่อนน้อง • ตอนฟักเด้งออกมาจากรัง
      G.holder.visible = !(S.egg && !(G.hatch && G.hatch.burst));
      let rv = 1;
      if (G.reveal) {
        const k = clamp((t - G.reveal) / 1.1, 0, 1);
        rv = k >= 1 ? 1 : 1 - Math.cos(k * Math.PI * 3) * Math.exp(-k * 6);
      }
      G.sizer.scale.setScalar(G.baseScale * G.ageK * Math.max(0.001, rv));
      // ยืนเฉย ๆ สลับท่าเองเป็นระยะ
      if (!S.act && !S.egg && !walking && !S.sleep && t > (G.idleNext || 0) && !G.evo) {
        G.idleNext = t + 6 + R() * 6;
        play(S.want ? 'Idle_Headlow' : ['Idle', 'Idle_2', 'Idle_Headlow', 'Idle'][Math.floor(R() * 4)], 0.7);
      }
      G.chibi?.update(t, dt, S);
      // มงกุฎดอกไม้ (ใส่ทั้งไลฟ์)
      // ราชากบ: มงกุฎทองถาวรตอนโตเต็มวัย
      const kingOn = !!(G.SP?.king && S.stage >= G.SP.evoAt && !G.evo);
      if (kingOn && !G.kingObj) {
        G.kingObj = makeKingCrown();
        G.world.add(G.kingObj);
      }
      if (G.kingObj) {
        G.kingObj.visible = kingOn;
        const kp = headPos(0.42 * G.ageK);
        G.kingObj.position.copy(kp);
        G.kingObj.rotation.y = hd.rotation.y + t * 0.4;
        G.kingObj.scale.setScalar(G.ageK * 1.1);
      }
      if (S.crown && !G.crownObj && G.headBone) {
        G.crownObj = makeCrown();
        G.world.add(G.crownObj);
      }
      if (G.crownObj) {
        const hp = headPos(0.32 * G.ageK);
        G.crownObj.position.copy(hp);
        G.crownObj.rotation.y = hd.rotation.y;
        G.crownObj.scale.setScalar(G.ageK * 1.3);
      }
      // ออร่าพรแห่งป่า
      if (S.glow) {
        if (!G.aura) {
          G.aura = new P.Sprite(new P.SpriteMaterial({ map: emojiTex('glow'), transparent: true, depthWrite: false, blending: P.AdditiveBlending }));
          G.world.add(G.aura);
        }
        G.aura.visible = true;
        const hp = headPos(-0.9 * G.ageK);
        G.aura.position.copy(hp);
        G.aura.scale.setScalar((3.2 + Math.sin(t * 3) * 0.2) * G.ageK);
        G.aura.material.opacity = 0.55;
        if (R() < dt * 4) sprite('✦', hp.clone().add(new P.Vector3((R() - 0.5) * 2, (R() - 0.5) * 2, (R() - 0.5))), { vy: 0.3, size: 0.2, life: 1.2 });
      } else if (G.aura) G.aura.visible = false;
      // อาหารหล่น + ถูกกินทีละคำ
      if (food) {
        const k = clamp((t - food.userData.drop) / 0.6, 0, 1);
        food.position.y = lerp(2.6, 0, k * k);
        const n = food.userData.bite || 0;
        const items = food.children.filter((c2) => !c2.userData.keep);
        items.forEach((c2, i) => (c2.visible = i >= Math.round((n / 3) * items.length)));
      }
      if (S.sleep && R() < dt * 0.9) sprite('Z', headPos(0.2).add(new P.Vector3(0.3, 0, 0)), { vy: 0.35, vx: 0.2, life: 2.6, size: 0.3 });
      // ท้องฟ้า/แสง/ฉากรอบเกาะ/ไข่
      const nk = stepSky(dt);
      stepWorld(t, dt, nk);
      stepEgg(t, dt);
      for (const [i, f] of G.flies.entries()) {
        const u = f.userData;
        f.position.set(Math.cos(u.a + t * u.v) * u.r, u.y + Math.sin(t * 1.5 + i) * 0.3, Math.sin(u.a + t * u.v) * u.r);
        f.material.opacity = nk * (0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i)));
      }
      // เอฟเฟกต์/สไปรต์
      for (let i = G.fx.length - 1; i >= 0; i--) {
        const f = G.fx[i];
        const k = (t - f.t0) / f.life;
        if (k >= 1) {
          G.world.remove(f.m);
          G.fx.splice(i, 1);
          continue;
        }
        if (f.upd) f.upd(k);
        if (f.keep || f.upd) continue;
        f.m.position.y += f.vy * dt;
        f.m.position.x += f.vx * dt;
        f.m.position.z += f.vz * dt;
        f.m.material.opacity = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
        f.m.scale.setScalar(f.size * (f.pop ? Math.min(1, k * 6) : 1));
      }
      stepCamera(t, dt);
      renderAll(t);
      c.drawImage(G.renderer.domElement, 0, 0, W, H);
      if (G.flash > 0.01) {
        c.fillStyle = `rgba(255,255,255,${Math.min(1, G.flash)})`;
        c.fillRect(0, 0, W, H);
        G.flash *= Math.exp(-dt * 4);
      }
      tickBubble(t);
    }

    // ---------------------------------------------------------------- แผง HTML
    let banT = 0;
    let bigT = 0;
    let sayT = 0;
    function banner(html, cls = 't1', sec = 3) {
      const b = $('.pt-ban');
      if (!b) return;
      b.className = `pt-ban ${cls} on`;
      b.innerHTML = html;
      clearTimeout(banT);
      banT = setTimeout(() => b.classList.remove('on'), sec * 1000);
    }
    function big(html, sec) {
      const b = $('.pt-big');
      if (!b) return;
      b.innerHTML = html;
      b.classList.remove('on');
      void b.offsetWidth;
      b.classList.add('on');
      clearTimeout(bigT);
      bigT = setTimeout(() => b.classList.remove('on'), sec * 1000);
    }
    let chipN = 0;
    function chip(html) {
      if (!el || chipN > 6 || !G?.ready) return;
      const p = new G.THREE.Vector3(0, 1.9, 0).project(G.camera);
      const c = document.createElement('div');
      c.className = 'pt-chip';
      c.innerHTML = html;
      c.style.left = (p.x * 0.5 + 0.5) * W + (R() - 0.5) * 340 + 'px';
      c.style.top = (-p.y * 0.5 + 0.5) * H + (R() - 0.5) * 60 + 'px';
      el.appendChild(c);
      chipN++;
      setTimeout(() => (c.remove(), chipN--), 1700);
    }
    function say(text, sec = 2.6) {
      const b = $('.pt-say');
      if (!b) return;
      b.textContent = text;
      b.classList.add('on');
      clearTimeout(sayT);
      sayT = setTimeout(() => b.classList.remove('on'), sec * 1000);
    }
    // บอลลูนคำพูดตามหัวน้อง
    function tickBubble() {
      const b = $('.pt-say');
      if (!b || !G?.ready) return;
      const p = headPos(0.9 * G.ageK).applyMatrix4(G.world.matrixWorld).project(G.camera);
      const x = clamp((p.x * 0.5 + 0.5) * W, 300, W - 300);
      const y = clamp((-p.y * 0.5 + 0.5) * H, 470, 1150);
      b.style.transform = `translate(${x - W / 2}px, ${y}px) translate(-50%, -100%)`;
    }
    function renderStatic() {
      const m = meta();
      const tt = API?.t || {};
      const gifts = (tt.gifts || m.defaults?.gifts || []).slice(0, 9);
      const efx = m.effects || {};
      el.innerHTML = `
        <div class="pt-top"><div class="ico">🦌</div><div class="tt"><b class="nm"></b><small class="sub"></small><div class="xp"><i><b></b></i><span></span></div></div><div class="form"></div></div>
        <div class="pt-stats">${[['F', '🍖', 'อิ่ม'], ['H', '💗', 'สุข'], ['E', '⚡', 'พลัง'], ['C', '🫧', 'สะอาด']].map(([k, i, n]) => `<div class="s s${k}"><span>${i} ${n}</span><i><b></b></i></div>`).join('')}</div>
        <div class="pt-egg"><div class="t">🥚 ช่วยกันอุ่นไข่ให้ฟัก!</div><i><b></b></i><div class="n"></div><div class="h">คอมเมนต์อะไรก็ได้ +6 • กดใจ +1 • ของขวัญ = อุ่นแรงพิเศษ</div></div>
        <div class="pt-ban"></div>
        <div class="pt-q"></div>
        <div class="pt-gl"><h4>🎁 ของขวัญ = ของพิเศษ</h4>${gifts.map((g) => `<div>${window.giftIconHtml ? window.giftIconHtml(g.name, efx[g.effect]?.icon || '🎁') : esc(efx[g.effect]?.icon || '🎁')} ${window.giftIcon?.(g.name) ? '' : `<b>${esc(g.name)}</b> `}${esc(efx[g.effect]?.label || '')}</div>`).join('')}</div>
        <div class="pt-rk"><h4 class="rt">💗 คนดูแลวันนี้</h4><div class="rows"></div><div class="pa"></div></div>
        <div class="pt-say"></div>
        <div class="pt-hint"><span class="hn">พิมพ์ <b>ให้อาหาร</b> • <b>เล่น</b> • <b>เดินเล่น</b> • <b>ลูบหัว</b> • <b>อาบน้ำ</b> • <b>นอน</b></span><span class="he">🥚 <b>คอมเมนต์อะไรก็ได้</b> หรือ <b>กดใจ</b> ช่วยกันอุ่นไข่ให้ฟัก!</span></div>
        <div class="pt-big"></div>`;
      updatePanels();
    }
    function updatePanels() {
      if (!el) return;
      $('.pt-top .nm').textContent = host();
      el.classList.toggle('egg', !!S.egg && !G?.hatch);
      if (S.egg) {
        const k = S.warmNeed ? clamp(S.warm / S.warmNeed, 0, 1) : 0;
        $('.pt-egg i b').style.width = (k * 100).toFixed(1) + '%';
        $('.pt-egg .n').textContent = `${S.warm.toLocaleString('en-US')} / ${S.warmNeed.toLocaleString('en-US')} (${Math.floor(k * 100)}%)${k >= 0.85 ? ' • ใกล้ฟักแล้ว!' : ''}`;
      }
      $('.pt-rk .rt').textContent = S.egg ? '🔥 คนช่วยอุ่นไข่' : '💗 คนดูแลวันนี้';
      $('.pt-top .sub').textContent = S.egg ? `🥚 ไข่ปริศนา • รอฟัก • ไลฟ์ที่ ${S.lives}` : `${S.species ? nameOf(S.species, S.stage) + ' • ' : ''}${S.stageName} • วันที่ ${S.days} • ไลฟ์ที่ ${S.lives}${S.sleep ? ' • 💤 หลับอยู่' : ''}`;
      const need = S.nextNeed;
      const k = need ? clamp((S.xp - S.prevNeed) / (need - S.prevNeed), 0, 1) : 1;
      $('.pt-top .xp b').style.width = (k * 100).toFixed(1) + '%';
      $('.pt-top .xp span').textContent = need ? `โตอีก ${Math.max(0, need - S.xp).toLocaleString('en-US')} แต้ม` : 'โตเต็มวัยแล้ว';
      $('.pt-top .form').textContent = S.formName ? `✨ ${S.formName}` : '';
      $('.pt-top .form').style.display = S.formName ? '' : 'none';
      for (const key of ['F', 'H', 'E', 'C']) {
        const v = S.st?.[key] ?? 0;
        const s = $(`.pt-stats .s${key}`);
        s.querySelector('b').style.width = v + '%';
        s.classList.toggle('low', v < 25);
      }
      const q = (S.queue || []).slice(0, 5);
      $('.pt-q').innerHTML = q.length ? `ต่อคิว: ${q.map((x) => (x.item ? S.items?.[x.item]?.icon : ACT_TXT[x.k]?.[0]) || '✨').join(' ')}` : '';
      $('.pt-q').style.display = q.length ? '' : 'none';
      const rows = (S.carers || []).slice(0, 4);
      $('.pt-rk .rows').innerHTML = rows.length ? rows.map((r, i) => `<div class="r">${['🥇', '🥈', '🥉'][i] || '•'} <span>${esc(r.n)}</span><b>${r.p}</b></div>`).join('') : '<div class="emp">ยังไม่มีใครดูแลน้อง<br>พิมพ์ “ให้อาหาร” เลย!</div>';
      const pa = S.parents?.[0];
      $('.pt-rk .pa').innerHTML = pa ? `👑 พ่อแม่ใจดีอันดับ 1<br><b>${esc(pa.n)}</b> ${pa.p.toLocaleString('en-US')} แต้ม` : '';
    }

    function css() {
      return `
        #root.theme-${id} #header, #root.theme-${id} #songPanel, #root.theme-${id} #giftPanel, #root.theme-${id} #topPanel, #root.theme-${id} #feed, #root.theme-${id} #hype, #root.theme-${id} #crowd { display: none !important; }
        #root.theme-${id} #avatar, #root.theme-${id} #avatar2d { display: none !important; }
        #root.theme-${id} { --toast-bg: #ff6fa8; --toast-glow: #ff6fa8; --big-grad: linear-gradient(180deg, #ffffff, #ffd1e4); }
        #root.theme-${id} #toasts { top: 1335px; left: 110px; right: 110px; }
        .pt-ui { position: absolute; inset: 0; pointer-events: none; font-family: 'Kanit', 'IBM Plex Sans Thai', sans-serif; color: #fff; z-index: 3; }
        .pt-ui * { box-sizing: border-box; }
        .pt-ui .pt-top { position: absolute; left: 110px; right: 110px; top: 196px; display: flex; align-items: center; gap: 14px; padding: 10px 18px; border-radius: 28px; background: rgba(28,40,24,.78); border: 3px solid rgba(255,255,255,.35); box-shadow: 0 8px 24px rgba(0,0,0,.25); }
        .pt-ui .pt-top .ico { flex: none; width: 72px; height: 72px; border-radius: 22px; display: grid; place-items: center; font-size: 46px; background: linear-gradient(135deg, #b8f08a, #ff9ac8); }
        .pt-ui .pt-top .tt { flex: 1; min-width: 0; }
        .pt-ui .pt-top .nm { display: block; font-size: 36px; font-weight: 800; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pt-ui .pt-top .sub { display: block; font-size: 20px; color: #e4ffd0; white-space: nowrap; }
        .pt-ui .pt-top .xp { display: flex; align-items: center; gap: 10px; margin-top: 4px; }
        .pt-ui .pt-top .xp i { flex: 1; height: 14px; border-radius: 8px; background: rgba(255,255,255,.18); overflow: hidden; }
        .pt-ui .pt-top .xp i b { display: block; height: 100%; border-radius: 8px; background: linear-gradient(90deg, #9be15d, #ffd23f); transition: width .8s; }
        .pt-ui .pt-top .xp span { flex: none; font-size: 17px; color: #fff3c4; }
        .pt-ui .pt-top .form { flex: none; font-size: 20px; font-weight: 700; padding: 4px 12px; border-radius: 14px; background: linear-gradient(90deg, #ff9ac8, #ffd23f); color: #3a1a2a; }
        .pt-ui .pt-stats { position: absolute; left: 110px; right: 110px; top: 330px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .pt-ui .pt-stats .s { background: rgba(28,40,24,.72); border-radius: 16px; padding: 6px 12px 9px; font-size: 20px; font-weight: 600; border: 2px solid transparent; }
        .pt-ui .pt-stats .s i { display: block; height: 11px; border-radius: 6px; background: rgba(255,255,255,.18); overflow: hidden; margin-top: 4px; }
        .pt-ui .pt-stats .s i b { display: block; height: 100%; border-radius: 6px; transition: width .8s; }
        .pt-ui .pt-stats .sF b { background: #ffb347; } .pt-ui .pt-stats .sH b { background: #ff6fa8; } .pt-ui .pt-stats .sE b { background: #5ee0ff; } .pt-ui .pt-stats .sC b { background: #9be7ff; }
        .pt-ui .pt-stats .s.low { border-color: #ff5a5a; animation: ptLow 1s ease-in-out infinite alternate; }
        @keyframes ptLow { to { background: rgba(120,20,30,.75); } }
        .pt-ui .pt-ban { position: absolute; left: 50%; top: 410px; transform: translateX(-50%) scale(.6); opacity: 0; max-width: 860px; padding: 8px 24px; border-radius: 18px; font-size: 27px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #2b1d2b; background: linear-gradient(90deg, #ffffff, #fff1f6); box-shadow: 0 6px 20px rgba(0,0,0,.3); transition: transform .25s cubic-bezier(.2,1.6,.4,1), opacity .25s; }
        .pt-ui .pt-ban.on { opacity: 1; transform: translateX(-50%) scale(1); }
        .pt-ui .pt-ban small { font-size: .75em; color: #8a5a7a; }
        .pt-ui .pt-ban.t2 { background: linear-gradient(90deg, #d8ffc4, #c8f0ff); }
        .pt-ui .pt-ban.t3 { background: linear-gradient(90deg, #ffd1e4, #ffe98a); font-size: 30px; }
        .pt-ui .pt-q { position: absolute; left: 50%; top: 472px; transform: translateX(-50%); font-size: 22px; padding: 2px 16px; border-radius: 999px; background: rgba(28,40,24,.7); white-space: nowrap; }
        .pt-ui .pt-gl { position: absolute; left: 110px; top: 520px; width: 320px; padding: 10px 14px; border-radius: 20px; background: rgba(28,40,24,.62); font-size: 16.5px; line-height: 1.38; }
        .pt-ui .pt-gl h4 { margin: 0 0 4px; font-size: 20px; color: #ffd1e4; }
        .pt-ui .pt-gl div { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pt-ui .pt-gl .gicon { width: 26px; height: 26px; vertical-align: -6px; }
        .pt-ui .pt-rk { position: absolute; right: 110px; top: 520px; width: 290px; padding: 10px 14px; border-radius: 20px; background: rgba(28,40,24,.62); font-size: 20px; }
        .pt-ui .pt-rk h4 { margin: 0 0 4px; font-size: 20px; color: #ffd1e4; }
        .pt-ui .pt-rk .r { display: flex; gap: 6px; white-space: nowrap; }
        .pt-ui .pt-rk .r span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
        .pt-ui .pt-rk .r b { color: #ffd23f; }
        .pt-ui .pt-rk .emp { font-size: 17px; color: #e4ffd0; line-height: 1.35; }
        .pt-ui .pt-rk .pa { margin-top: 6px; font-size: 16px; color: #fff3c4; line-height: 1.3; }
        .pt-ui .pt-rk .pa:empty { display: none; }
        .pt-ui .pt-say { position: absolute; left: 50%; top: 0; max-width: 520px; padding: 10px 20px; border-radius: 22px; background: #fff; color: #2b1d2b; font-size: 26px; font-weight: 600; box-shadow: 0 8px 20px rgba(0,0,0,.25); opacity: 0; transition: opacity .3s; text-align: center; }
        .pt-ui .pt-say::after { content: ''; position: absolute; left: 50%; bottom: -14px; margin-left: -12px; border: 12px solid transparent; border-top-color: #fff; border-bottom: 0; }
        .pt-ui .pt-say.on { opacity: 1; }
        .pt-ui .pt-hint { position: absolute; left: 110px; right: 110px; top: 1262px; text-align: center; font-size: 23px; padding: 8px 14px; border-radius: 18px; background: rgba(28,40,24,.78); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pt-ui .pt-hint b { color: #ffd1e4; }
        .pt-ui .pt-egg { display: none; position: absolute; left: 110px; right: 110px; top: 330px; padding: 10px 18px 12px; border-radius: 22px; background: rgba(28,40,24,.8); border: 3px solid #ffd27a; box-shadow: 0 0 26px rgba(255,210,122,.35); text-align: center; }
        .pt-ui .pt-egg .t { font-size: 30px; font-weight: 800; }
        .pt-ui .pt-egg i { display: block; height: 22px; border-radius: 12px; background: rgba(255,255,255,.15); overflow: hidden; margin: 6px 0 4px; }
        .pt-ui .pt-egg i b { display: block; height: 100%; border-radius: 12px; background: linear-gradient(90deg, #ffb347, #ffd27a, #fff3b0); box-shadow: 0 0 14px #ffd27a; transition: width .6s; }
        .pt-ui .pt-egg .n { font-size: 22px; color: #fff3c4; font-weight: 600; }
        .pt-ui .pt-egg .h { font-size: 18px; color: #e4ffd0; }
        .pt-ui.egg .pt-egg { display: block; }
        .pt-ui.egg .pt-stats, .pt-ui.egg .pt-top .xp, .pt-ui .pt-hint .he, .pt-ui.egg .pt-hint .hn { display: none; }
        .pt-ui.egg .pt-hint .he { display: inline; }
        .pt-ui .pt-top, .pt-ui .pt-stats, .pt-ui .pt-egg, .pt-ui .pt-gl, .pt-ui .pt-rk, .pt-ui .pt-hint, .pt-ui .pt-q { transition: opacity .7s; }
        .pt-ui.cine .pt-top, .pt-ui.cine .pt-stats, .pt-ui.cine .pt-egg, .pt-ui.cine .pt-gl, .pt-ui.cine .pt-rk, .pt-ui.cine .pt-hint, .pt-ui.cine .pt-q { opacity: 0; }
        .pt-ui .pt-chip { position: absolute; transform: translate(-50%, 0); font-size: 24px; font-weight: 700; color: #fff; text-shadow: 0 2px 6px rgba(0,0,0,.7); white-space: nowrap; animation: ptChip 1.7s ease-out forwards; }
        @keyframes ptChip { from { opacity: 0; transform: translate(-50%, 20px) scale(.7); } 15% { opacity: 1; transform: translate(-50%, 0) scale(1); } to { opacity: 0; transform: translate(-50%, -110px); } }
        .pt-ui .pt-big { position: absolute; left: 110px; right: 110px; top: 600px; text-align: center; font-size: 96px; font-weight: 800; line-height: 1.1; color: #fff; -webkit-text-stroke: 6px #6a2a52; paint-order: stroke fill; text-shadow: 0 8px 0 rgba(106,42,82,.5); opacity: 0; transform: scale(.4); }
        .pt-ui .pt-big span { font-size: .6em; color: #ffe98a; }
        .pt-ui .pt-big.on { animation: ptBig .4s cubic-bezier(.2,1.6,.4,1) forwards; }
        @keyframes ptBig { to { opacity: 1; transform: scale(1); } }
      `;
    }

    const T = {
      bpm: 90,
      fanH: 1,
      ownSafe: true,
      rows: [{ y: 2400, s: 1, n: 80, x0: 0, x1: 1080, jy: 0 }],
      get css() {
        return css();
      },
      fanSvg() {
        return '';
      },
      init(api) {
        API = api;
        window.__petDbg = () => ({ S, G, curPid, failed });
        el = document.createElement('div');
        el.className = 'pt-ui';
        document.getElementById('ui').appendChild(el);
        renderStatic();
        boot();
        try {
          const sk = window.io?.();
          sk?.emit('mg:get', null, (s) => {
            if (s) apply(s);
            sk.disconnect();
          });
        } catch {}
      },
      refresh() {
        if (el) renderStatic();
      },
      drawStatic(cx) {
        cx.fillStyle = '#bfe6ff';
        cx.fillRect(0, 0, W, H);
      },
      drawBg(c, _tt, _bt, _api, now) {
        frame(c, (now ?? performance.now()) / 1000);
      },
      effects: new Proxy({}, {
        get(_o, key) {
          return meta().effects?.[key] ? () => {} : undefined;
        },
        has: (_o, key) => !!meta().effects?.[key],
        ownKeys: () => Object.keys(meta().effects || {}),
        getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
      }),
      onEvent(d) {
        if (d.type === 'mgState') return apply(d);
        if (d.type === 'mg') return onEv(d);
      },
      onLike() {},
    };
    return T;
  };
})();
