/* ชุดแต่งกาย + พร็อพ + บุคลิก ของตัวละคร 3D ตามธีม
 * - เปลี่ยนสี/ลายเสื้อผ้าจากเท็กซ์เจอร์เดิม (เก็บรอยยับ/แสงเงาของผ้าไว้) แยกตามชิ้น: เสื้อ กางเกง รองเท้า ผม เนคไท
 * - พร็อพ 3D ติดกับกระดูก: แว่น หมวก ผ้าพาดบ่า ผ้าขาวม้า คันเบ็ด ปืนฉีดน้ำ ไฟฉาย ไมค์ กระทง
 * - บุคลิก (persona): ท่ายืน ความเร็ว ท่าว่าง และท่าตอบสนอง เช่น ธีมศาล = มัคทายกสูงวัย ท่าทางสุขุม
 */
import * as THREE from 'three';

// ตัวละครเริ่มต้นของแต่ละธีม (เลือกเองทับได้ในหลังบ้าน)
export const THEME_MODEL = {
  shrine: 'base_male',
  krathong: 'fumiriya',
  fishing: 'hair_male',
  songkran: 'fumiriya',
  cny: 'base_male',
  ghost: 'hair_male',
  newyear: 'hair_male',
  concert: 'fumiriya',
};

// ตำแหน่งเริ่มต้นในแต่ละฉาก (1080x1920): x กลางตัว, y ระดับเท้า, h ความสูง — ปรับแยกธีมได้ในหลังบ้าน
// (หัวต้องต่ำกว่ากล่องของขวัญ/Top 5 ฝั่งขวาที่ลงมาถึง y≈960)
export const THEME_LAYOUT = {
  shrine: { x: 790, y: 1660, h: 640 },
  krathong: { x: 760, y: 1640, h: 650 },
  fishing: { x: 300, y: 1540, h: 720 },
  songkran: { x: 720, y: 1690, h: 690 },
  cny: { x: 770, y: 1660, h: 660 },
  ghost: { x: 740, y: 1680, h: 680 },
  newyear: { x: 780, y: 1690, h: 690 },
  concert: { x: 540, y: 1700, h: 720 },
  // ธีมสวนสัตว์: คุณครูยืนมุมขวา
  sea: { x: 980, y: 1500, h: 390 },
  dino: { x: 980, y: 1500, h: 390 },
  safari: { x: 980, y: 1500, h: 390 },
  rainforest: { x: 980, y: 1500, h: 390 },
  nightzoo: { x: 980, y: 1500, h: 390 },
  mookata: { x: 960, y: 1660, h: 390 },
  adventure: { x: 960, y: 1660, h: 390 },
  boatrace: { x: 960, y: 1660, h: 390 },
  angler: { x: 960, y: 1660, h: 390 },
  village: { x: 960, y: 1660, h: 390 },
  pixelquiz: { x: 960, y: 1660, h: 390 },
  kitchen: { x: 960, y: 1660, h: 390 },
  castle: { x: 960, y: 1660, h: 390 },
  // ธีมเวที: พิธีกรยืนข้างเวที
  ramwong: { x: 110, y: 1300, h: 390 },
  pageant: { x: 960, y: 1230, h: 390 },
  molam: { x: 110, y: 1300, h: 390 },
  disco: { x: 960, y: 1300, h: 390 },
  // ธีมสัตว์เลี้ยง: ยืนมุมขวาล่าง ไม่บังน้องกลางจอ
  cat: { x: 905, y: 1660, h: 560 },
  shiba: { x: 905, y: 1660, h: 560 },
  bunny: { x: 905, y: 1660, h: 560 },
  hamster: { x: 905, y: 1660, h: 560 },
  penguin: { x: 905, y: 1660, h: 560 },
  panda: { x: 905, y: 1660, h: 560 },
  capybara: { x: 905, y: 1660, h: 560 },
  hippo: { x: 905, y: 1660, h: 560 },
  elephant: { x: 905, y: 1660, h: 560 },
  duckling: { x: 905, y: 1660, h: 560 },
};
// ครึ่งตัว: วางฝั่งซ้าย (ฝั่งขวามีกล่องของขวัญ/Top 5)
export const HALF_LAYOUT = { x: 330, y: 1950, h: 1150 };

// ---------------------------------------------------------------- บุคลิก
// rest: ท่ายืนพื้นฐาน (ทับ REST), speed: ความเร็วท่าทาง, walk: [ความเร็ว, เดินทุกกี่วิ], hunch: หลังค่อม,
// idle: ท่าว่างที่สุ่ม, map: ท่าตามเหตุการณ์, calm: สีหน้าสุขุม (ไม่ยิ้มกว้าง ไม่กระโดด)
export const PERSONAS = {
  young: { speed: 1, walk: [0.32, 14, 28], hunch: 0 },
  // มัคทายก: สูงวัย สุขุม น่าเชื่อถือ — ประสานมือด้านหน้า หลังค่อมนิด เดินช้า ไม่เต้น ไม่กระโดด
  elder: {
    speed: 0.72,
    walk: [0.15, 28, 50],
    hunch: 0.13,
    calm: true,
    rest: {
      // ประสานมือไว้ด้านหน้าระดับท้อง (ปรับจากการดูภาพจริง)
      leftUpperArm: [0.1, -0.75, -1.25],
      rightUpperArm: [0.1, 0.75, 1.25],
      leftLowerArm: [0, -1.55, 0.05],
      rightLowerArm: [0, 1.55, -0.05],
      leftHand: [0, -0.1, 0.2],
      rightHand: [0, 0.1, -0.2],
    },
    idle: ['nod', 'wai', 'idleLook', 'nod', 'bless'],
    map: { join: 'nod', giftS: 'wai', giftM: 'bow', giftL: 'bless', giftXL: 'bless', follow: 'wai', win: 'nod', game: 'think', big: 'bless' },
  },
  // ถือกระทงด้วยสองมือ
  krathong: {
    speed: 0.9,
    walk: [0.22, 20, 36],
    hunch: 0.02,
    rest: {
      // สองมือประคองกระทงไว้ด้านหน้า
      leftUpperArm: [0.05, -0.75, -1.22],
      rightUpperArm: [0.05, 0.75, 1.22],
      leftLowerArm: [0, -1.62, 0.2],
      rightLowerArm: [0, 1.62, -0.2],
      leftHand: [0, 0, 0.35],
      rightHand: [0, 0, -0.35],
    },
    idle: ['idleTilt', 'idleLook', 'wai', 'shy'],
    map: { giftS: 'wai', follow: 'wai', giftM: 'bow', join: 'nod' },
  },
};

// ---------------------------------------------------------------- ชุดของแต่ละธีม
// parts: tops bottoms shoes hair tie accessory → { color, pattern } • props: รายชื่อพร็อพ
export const OUTFITS = {
  // มัคทายก: ชุดขาวทั้งชุด ผมสีดอกเลา ผ้าขาวพาดบ่า (ไม่ใส่แว่น)
  shrine: {
    persona: 'elder',
    label: 'มัคทายก (ชุดขาว ผมดอกเลา ผ้าพาดบ่า)',
    parts: { tops: { color: '#f3f0e8' }, tie: { color: '#f3f0e8' }, accessory: { color: '#f3f0e8' }, bottoms: { color: '#ece8de' }, shoes: { color: '#4a3a2c' }, hair: { color: '#c9c9cc' } },
    props: ['sash'],
  },
  // ลอยกระทง: เสื้อไทยสีครีม โจงกระเบนแดงเลือดนก ถือกระทง
  krathong: {
    persona: 'krathong',
    label: 'ชุดไทย (เสื้อครีม โจงกระเบนแดง) ถือกระทง',
    parts: { tops: { color: '#f2e6c8' }, tie: { color: '#c9a24a' }, accessory: { color: '#c9a24a' }, bottoms: { color: '#8a1f2a' }, shoes: { color: '#3a2a22' } },
    props: ['krathong'],
  },
  // ตกปลา: เสื้อลายสก๊อต หมวกสาน ผ้าขาวม้าพันคอ คันเบ็ด
  fishing: {
    label: 'ชาวประมง (เสื้อลายสก๊อต หมวกสาน ผ้าขาวม้า คันเบ็ด)',
    parts: { tops: { pattern: 'flannel', color: '#3f6f8f' }, bottoms: { color: '#6b5a3a' }, shoes: { color: '#3a3a3a' } },
    props: ['strawHat', 'pakama', 'rod'],
  },
  // สงกรานต์: เสื้อลายดอก แว่นกันแดด ปืนฉีดน้ำ
  songkran: {
    label: 'สงกรานต์ (เสื้อลายดอก แว่นกันแดด ปืนฉีดน้ำ)',
    parts: { tops: { pattern: 'floral', color: '#2fa8e0' }, tie: { color: '#ff8a3d' }, accessory: { color: '#ff8a3d' }, bottoms: { color: '#d9c7a0' }, shoes: { color: '#f0f0f0' } },
    props: ['sunglasses', 'waterGun'],
  },
  // ตรุษจีน: เสื้อจีนแดงลายทอง หมวกจีน
  cny: {
    label: 'ตรุษจีน (เสื้อจีนแดงลายทอง หมวกแก๊ปจีน)',
    parts: { tops: { pattern: 'cny', color: '#c0141e' }, tie: { color: '#e8b830' }, accessory: { color: '#e8b830' }, bottoms: { color: '#1a1a1a' }, shoes: { color: '#1a1a1a' } },
    props: ['chineseCap'],
  },
  // บ้านผีสิง: นักสำรวจผี เสื้อเข้ม ไฟฉาย
  ghost: {
    label: 'นักล่าผี (เสื้อสีเข้ม ไฟฉาย)',
    parts: { tops: { color: '#2b3348' }, bottoms: { color: '#2a2a30' }, shoes: { color: '#222' } },
    props: ['flashlight'],
  },
  // ปีใหม่: ชุดแดงซานต้า หมวกซานต้า
  newyear: {
    label: 'ซานต้าหนุ่ม (เสื้อแดง หมวกซานต้า)',
    parts: { tops: { color: '#c8202a' }, bottoms: { color: '#b01c24' }, shoes: { color: '#1a1a1a' } },
    props: ['santaHat'],
  },
  // คอนเสิร์ต: เสื้อดำกากเพชร เนคไทชมพู ไมค์
  concert: {
    label: 'นักร้อง (เสื้อดำกากเพชร ไมค์)',
    parts: { tops: { pattern: 'sparkle', color: '#1c1a26' }, tie: { color: '#ff4fa3' }, accessory: { color: '#ff4fa3' }, bottoms: { color: '#141218' } },
    props: ['mic'],
  },
};

// ---------------------------------------------------------------- เปลี่ยนสีเท็กซ์เจอร์ (เก็บรอยยับเดิม)
const partOf = (name) => {
  const n = String(name || '');
  if (/HAIR/i.test(n)) return 'hair';
  if (/Accessory_Tie/i.test(n)) return 'tie';
  if (/Tops/i.test(n)) return 'tops';
  if (/Bottoms/i.test(n)) return 'bottoms';
  if (/Shoes/i.test(n)) return 'shoes';
  if (/Accessory/i.test(n)) return 'accessory';
  return null;
};

function patternCanvas(kind, base, w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  const u = Math.max(w, h) / 1024; // ขนาดลายตามความละเอียดเท็กซ์เจอร์
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  if (kind === 'floral') {
    // ลายดอกชบา + ใบไม้ (เสื้อฮาวาย)
    for (let i = 0; i < 70; i++) {
      const x = rnd() * w, y = rnd() * h, r = (18 + rnd() * 16) * u;
      g.fillStyle = '#2f9e5a';
      for (let k = 0; k < 2; k++) {
        g.save();
        g.translate(x, y);
        g.rotate(rnd() * 6.3);
        g.beginPath();
        g.ellipse(r * 1.3, 0, r * 0.9, r * 0.35, 0, 0, 7);
        g.fill();
        g.restore();
      }
      g.fillStyle = ['#ff4f6e', '#ffd23f', '#ffffff', '#ff8a3d'][i % 4];
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        g.beginPath();
        g.arc(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.5, 0, 7);
        g.fill();
      }
      g.fillStyle = '#ffe9a0';
      g.beginPath();
      g.arc(x, y, r * 0.22, 0, 7);
      g.fill();
    }
  } else if (kind === 'flannel') {
    // ลายสก๊อตเสื้อเชิ้ตผ้าสำลี
    const s = 64 * u;
    g.globalAlpha = 0.55;
    for (let x = 0; x < w; x += s) {
      g.fillStyle = '#1f3448';
      g.fillRect(x, 0, s * 0.35, h);
      g.fillStyle = '#c9d6df';
      g.fillRect(x + s * 0.55, 0, s * 0.06, h);
    }
    for (let y = 0; y < h; y += s) {
      g.fillStyle = '#1f3448';
      g.fillRect(0, y, w, s * 0.35);
      g.fillStyle = '#c9d6df';
      g.fillRect(0, y + s * 0.55, w, s * 0.06);
    }
    g.globalAlpha = 1;
  } else if (kind === 'plaid') {
    // ผ้าขาวม้า: ตาราง แดง/ขาว/น้ำเงิน
    const s = 40 * u;
    for (let x = 0; x < w; x += s * 2) {
      g.fillStyle = 'rgba(255,255,255,.55)';
      g.fillRect(x, 0, s * 0.5, h);
      g.fillStyle = 'rgba(30,50,140,.55)';
      g.fillRect(x + s, 0, s * 0.4, h);
    }
    for (let y = 0; y < h; y += s * 2) {
      g.fillStyle = 'rgba(255,255,255,.55)';
      g.fillRect(0, y, w, s * 0.5);
      g.fillStyle = 'rgba(30,50,140,.55)';
      g.fillRect(0, y + s, w, s * 0.4);
    }
  } else if (kind === 'cny') {
    // ลายเหรียญทอง/เมฆจีนบนผ้าแดง
    g.strokeStyle = '#e8b830';
    g.fillStyle = '#e8b830';
    g.lineWidth = 3 * u;
    const s = 90 * u;
    for (let y = 0; y < h; y += s) {
      for (let x = (y / s) % 2 ? s / 2 : 0; x < w; x += s) {
        g.beginPath();
        g.arc(x, y, s * 0.22, 0, 7);
        g.stroke();
        g.fillRect(x - s * 0.06, y - s * 0.06, s * 0.12, s * 0.12);
      }
    }
  } else if (kind === 'sparkle') {
    // กากเพชรบนผ้าสีเข้ม
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = ['#ffffff', '#ff8fd0', '#9fe7ff', '#ffd23f'][i % 4];
      g.globalAlpha = 0.35 + rnd() * 0.6;
      const r = (1 + rnd() * 2.2) * u;
      g.fillRect(rnd() * w, rnd() * h, r, r);
    }
    g.globalAlpha = 1;
  }
  return c;
}

function recolorTexture(tex, part) {
  const img = tex?.image;
  if (!img || !img.width) return null;
  const k = Math.min(1, 1024 / Math.max(img.width, img.height));
  const w = Math.round(img.width * k);
  const h = Math.round(img.height * k);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h);
  const px = d.data;
  // ความสว่างเฉลี่ยของผ้าเดิม → ใช้รักษารอยยับ/เงาผ้าแบบสัมพัทธ์ (ผ้าดำเปลี่ยนเป็นขาวได้)
  let sum = 0, n = 0;
  for (let i = 0; i < px.length; i += 16) {
    if (px[i + 3] < 20) continue;
    sum += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
    n++;
  }
  const avg = Math.max(8, sum / Math.max(1, n));
  const target = new THREE.Color(part.color || '#ffffff');
  const tr = target.r * 255, tg = target.g * 255, tb = target.b * 255;
  const pat = part.pattern ? patternCanvas(part.pattern, part.color || '#888', w, h).getContext('2d').getImageData(0, 0, w, h).data : null;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 4) continue;
    const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
    const rel = Math.min(1.35, lum / avg);
    const l = 0.62 + 0.38 * Math.min(1, rel); // รอยยับ/เงา ±
    const hi = Math.max(0, rel - 1) * 0.25; // ไฮไลต์
    const R = pat ? pat[i] : tr, G = pat ? pat[i + 1] : tg, B = pat ? pat[i + 2] : tb;
    px[i] = Math.min(255, R * l + 255 * hi);
    px[i + 1] = Math.min(255, G * l + 255 * hi);
    px[i + 2] = Math.min(255, B * l + 255 * hi);
  }
  g.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.flipY = tex.flipY;
  t.colorSpace = tex.colorSpace;
  t.wrapS = tex.wrapS;
  t.wrapT = tex.wrapT;
  t.offset.copy(tex.offset);
  t.repeat.copy(tex.repeat);
  t.anisotropy = tex.anisotropy;
  t.needsUpdate = true;
  return t;
}

// ---------------------------------------------------------------- พร็อพ
// พิกัดพร็อพเขียนแบบ VRM 1.0: +Z = ด้านหน้าตัวละคร, +X = ซ้ายของตัวละคร, +Y = ขึ้น
// (โมเดล VRM 0.x จะถูกหมุนให้ตรงกันอัตโนมัติใน applyOutfit)
const toon = (color, extra = {}) => new THREE.MeshToonMaterial({ color, ...extra });

function makeProp(name, ctx) {
  const g = new THREE.Group();
  const H = ctx.headSize; // ~0.24 ม. ใช้เทียบขนาดพร็อพบนหัว
  switch (name) {
    case 'glasses':
    case 'sunglasses': {
      const sun = name === 'sunglasses';
      const rim = toon(sun ? 0x111111 : 0x2a1c12);
      const r = ctx.eyeGap * 0.5;
      for (const s of [-1, 1]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 1.09, r * 0.13, 8, 32), rim);
        ring.position.x = (s * ctx.eyeGap) / 2;
        g.add(ring);
        if (sun) {
          const lens = new THREE.Mesh(new THREE.CircleGeometry(r * 0.95, 20), new THREE.MeshBasicMaterial({ color: 0x101820, transparent: true, opacity: 0.88 }));
          lens.position.x = (s * ctx.eyeGap) / 2;
          g.add(lens);
        }
      }
      const bridge = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.07, r * 0.07, ctx.eyeGap - r * 2, 6), rim);
      bridge.rotation.z = Math.PI / 2;
      g.add(bridge);
      // กระดูกตาอยู่กลางลูกตา → เลื่อนออกมาหน้าผิวหน้า ~6.5 ซม.
      return { obj: g, bone: 'head', pos: ctx.eyesLocal.clone().add(new THREE.Vector3(0, 0.004, 0.065)) };
    }
    case 'strawHat': {
      const mat = toon(0xd9b46a);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(H * 0.45, H * 0.55, H * 0.42, 24), mat);
      crown.position.y = H * 0.21;
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(H * 1.15, H * 1.15, H * 0.04, 32), mat);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(H * 0.56, H * 0.56, H * 0.08, 24), toon(0x7a2a1a));
      band.position.y = H * 0.05;
      g.add(crown, brim, band);
      return { obj: g, bone: 'head', pos: new THREE.Vector3(0, ctx.headTop - H * 0.3, -0.01), rot: new THREE.Euler(-0.08, 0, 0) };
    }
    case 'santaHat': {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(H * 0.56, H * 1.0, 24), toon(0xd0202a));
      cone.position.set(0, H * 0.46, -H * 0.1);
      cone.rotation.x = -0.4; // ปลายหมวกพับไปด้านหลัง
      const band = new THREE.Mesh(new THREE.TorusGeometry(H * 0.56, H * 0.11, 10, 28), toon(0xffffff));
      band.rotation.x = Math.PI / 2;
      const ball = new THREE.Mesh(new THREE.SphereGeometry(H * 0.13, 14, 10), toon(0xffffff));
      ball.position.set(0, H * 0.9, -H * 0.42);
      g.add(cone, band, ball);
      return { obj: g, bone: 'head', pos: new THREE.Vector3(0, ctx.headTop - H * 0.36, -0.01), rot: new THREE.Euler(-0.12, 0, 0) };
    }
    case 'chineseCap': {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(H * 0.58, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), toon(0x151515));
      const knot = new THREE.Mesh(new THREE.SphereGeometry(H * 0.09, 12, 8), toon(0xc0141e));
      knot.position.y = H * 0.58;
      g.add(cap, knot);
      return { obj: g, bone: 'head', pos: new THREE.Vector3(0, ctx.headTop - H * 0.5, -0.008), rot: new THREE.Euler(-0.1, 0, 0) };
    }
    case 'sash':
      return { special: 'sash' }; // สร้างแนบลำตัวใน applyOutfit
    case 'pakama': {
      // ผ้าขาวม้าพันคอ
      const tex = new THREE.CanvasTexture(patternCanvas('plaid', '#c0272d', 256, 256));
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(4, 1);
      const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.022, 10, 28), toon(0xffffff, { map: tex }));
      scarf.rotation.x = Math.PI / 2 - 0.25;
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.012), toon(0xffffff, { map: tex }));
      tail.position.set(0.04, -0.1, 0.07);
      tail.rotation.z = -0.15;
      g.add(scarf, tail);
      return { obj: g, bone: 'neck', pos: new THREE.Vector3(0, 0.02, 0.01) };
    }
    case 'rod': {
      // คันเบ็ดในมือขวา ชี้ขึ้นไปด้านหน้า
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.011, 1.25, 8), toon(0x6a4a2a));
      rod.position.y = 0.5;
      const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 14), toon(0x333333));
      reel.rotation.z = Math.PI / 2;
      reel.position.y = 0.05;
      g.add(rod, reel);
      return { obj: g, bone: 'rightHand', pos: ctx.handGrip('right'), rot: new THREE.Euler(0.9, 0, 0) };
    }
    case 'waterGun': {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.2), toon(0xff7a1a));
      body.position.set(0, 0.04, 0.06);
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.08, 14), toon(0x2fa8e0, { transparent: true, opacity: 0.85 }));
      tank.position.set(0, 0.1, 0.02);
      const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.06, 8), toon(0xffd23f));
      nozzle.rotation.x = Math.PI / 2;
      nozzle.position.set(0, 0.05, 0.19);
      g.add(body, tank, nozzle);
      return { obj: g, bone: 'rightHand', pos: ctx.handGrip('right') };
    }
    case 'flashlight': {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.17, 12), toon(0x2a2a2a));
      tube.rotation.x = Math.PI / 2;
      tube.position.z = 0.05;
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.02, 14), new THREE.MeshBasicMaterial({ color: 0xfff6c0 }));
      lens.position.z = 0.136;
      const beam = new THREE.Mesh(
        new THREE.ConeGeometry(0.22, 1.3, 20, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
      );
      beam.rotation.x = -Math.PI / 2;
      beam.position.z = 0.79;
      g.add(tube, lens, beam);
      // ส่องลงพื้นด้านหน้า (ไม่ส่องเข้ากล้อง)
      return { obj: g, bone: 'rightHand', pos: ctx.handGrip('right'), rot: new THREE.Euler(1.05, 0, 0) };
    }
    case 'mic': {
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.011, 0.15, 12), toon(0x1a1a1a));
      handle.position.y = 0.04;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.026, 16, 12), toon(0xc8c8d0));
      head.position.y = 0.13;
      g.add(handle, head);
      return { obj: g, bone: 'rightHand', pos: ctx.handGrip('right'), rot: new THREE.Euler(1.1, 0, 0) };
    }
    case 'krathong': {
      // กระทงใบตอง ถือไว้ด้านหน้าระดับเอว
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.035, 20), toon(0x3f8a3a));
      const petals = new THREE.Group();
      for (let ring = 0; ring < 2; ring++) {
        for (let i = 0; i < 8; i++) {
          const p = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.07 - ring * 0.015, 6), toon(ring ? 0xffffff : 0xf6a6c8));
          const a = (i / 8) * Math.PI * 2 + ring * 0.4;
          const rr = 0.065 - ring * 0.025;
          p.position.set(Math.cos(a) * rr, 0.045 + ring * 0.02, Math.sin(a) * rr);
          p.rotation.set(Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4);
          petals.add(p);
        }
      }
      const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.07, 8), toon(0xfff2d0));
      candle.position.y = 0.09;
      const flame = new THREE.Mesh(new THREE.SphereGeometry(0.01, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffb030 }));
      flame.position.y = 0.13;
      flame.scale.y = 1.6;
      g.add(base, petals, candle, flame);
      g.userData.flame = flame;
      return { obj: g, bone: 'spine', pos: new THREE.Vector3(0, ctx.krathongY, 0.25) };
    }
  }
  return null;
}

// เส้นขอบพร็อพแบบเดียวกับตัวละคร: ซ้อนเปลือกสีเข้มด้านหลัง (inverted hull) ขยายออกเท่ากันทุกด้าน
const LINE_MAT = new THREE.MeshBasicMaterial({ color: 0x1e1418, side: THREE.BackSide });
export function outlineProps(objs, width) {
  const fit = (pivot) => {
    const sz = pivot.userData.size;
    pivot.visible = width > 0;
    if (width > 0) pivot.scale.set((sz.x + width * 2) / sz.x, (sz.y + width * 2) / sz.y, (sz.z + width * 2) / sz.z);
  };
  for (const root of objs) {
    const meshes = [];
    root.traverse((o) => {
      if (o.userData.isPivot) fit(o);
      else if (o.isMesh && !o.userData.isLine && !o.userData.hasLine && !o.userData.noLine && !o.material?.transparent && !o.material?.isMeshBasicMaterial) meshes.push(o);
    });
    for (const o of meshes) {
      o.geometry.computeBoundingBox();
      const c = o.geometry.boundingBox.getCenter(new THREE.Vector3());
      const size = o.geometry.boundingBox.getSize(new THREE.Vector3());
      size.set(Math.max(size.x, 0.002), Math.max(size.y, 0.002), Math.max(size.z, 0.002));
      // (v - c) * scale + c → ขยายออกรอบจุดกลางรูปทรง
      const pivot = new THREE.Group();
      pivot.position.copy(c);
      pivot.userData = { isPivot: true, size };
      const line = new THREE.Mesh(o.geometry, LINE_MAT);
      line.position.copy(c).multiplyScalar(-1);
      line.userData.isLine = true;
      line.frustumCulled = false;
      pivot.add(line);
      o.add(pivot);
      o.userData.hasLine = true;
      fit(pivot);
    }
  }
}

// ---------------------------------------------------------------- ยิงรังสีหาผิวโมเดล
// ใช้ตอนท่ายืนพื้นฐาน: หาจุดบนผิวเสื้อ/หน้า เพื่อให้พร็อพแนบตัวจริง ไม่ลอย
function bodyRaycaster(vrm) {
  const meshes = [];
  vrm.scene.traverse((o) => o.isMesh && !o.userData.isLine && meshes.push(o));
  const rc = new THREE.Raycaster();
  const matName = (hit) => {
    const mats = [].concat(hit.object.material);
    const m = mats[hit.face?.materialIndex ?? 0] || mats[0];
    return m?.isOutline ? '' : m?.name || '';
  };
  // ยิงจากด้านหน้า (+Z ของโลก = หน้าตัวละคร) ไปข้างหลัง คืนจุดแรกที่ชื่อวัสดุตรง pattern
  return (x, y, pattern) => {
    rc.set(new THREE.Vector3(x, y, 2), new THREE.Vector3(0, 0, -1));
    for (const h of rc.intersectObjects(meshes, false)) {
      const n = matName(h);
      if (!n) continue;
      return { point: h.point, normal: h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : new THREE.Vector3(0, 0, 1), name: n, ok: pattern.test(n) };
    }
    return null;
  };
}

// ผ้าพาดบ่า: แถบผ้าที่วางตามผิวเสื้อจริง (จากบ่าซ้ายลงสะโพกขวา)
function buildSash(vrm, info) {
  const B = info.bones;
  const cast = bodyRaycaster(vrm);
  const v = new THREE.Vector3();
  const sh = (B.leftUpperArm || B.leftShoulder).getWorldPosition(new THREE.Vector3());
  const hip = (B.rightUpperLeg || B.hips).getWorldPosition(new THREE.Vector3());
  const neck = (B.neck || B.upperChest).getWorldPosition(new THREE.Vector3());
  // ในโลก: ตัวละครหันหน้า +Z → ซ้ายของตัวละคร = +X
  const start = new THREE.Vector2(sh.x * 0.78, sh.y + 0.03);
  const end = new THREE.Vector2(hip.x * 1.3, hip.y - 0.06);
  const pts = [];
  const N = 22;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = start.x + (end.x - start.x) * t;
    const y = start.y + (end.y - start.y) * t;
    const hit = cast(x, y, /Tops|Bottoms|Accessory/i);
    if (hit && hit.ok) pts.push({ p: hit.point.clone().addScaledVector(hit.normal, 0.007), n: hit.normal.clone() });
  }
  if (pts.length < 4) return null;
  // ทำให้เส้นเรียบ (กันจุดสะดุดตรงรอยพับเสื้อ)
  for (let k = 0; k < 2; k++) for (let i = 1; i < pts.length - 1; i++) pts[i].p.lerp(v.copy(pts[i - 1].p).add(pts[i + 1].p).multiplyScalar(0.5), 0.5);
  const W = 0.09;
  const pos = [];
  const nor = [];
  const idx = [];
  pts.forEach((q, i) => {
    const a = pts[Math.max(0, i - 1)].p;
    const b = pts[Math.min(pts.length - 1, i + 1)].p;
    const tan = b.clone().sub(a).normalize();
    const side = new THREE.Vector3().crossVectors(q.n, tan).normalize().multiplyScalar(W / 2);
    for (const s of [-1, 1]) {
      const p = q.p.clone().addScaledVector(side, s);
      pos.push(p.x, p.y, p.z);
      nor.push(q.n.x, q.n.y, q.n.z);
    }
    if (i < pts.length - 1) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setIndex(idx);
  const mesh = new THREE.Mesh(geo, toon(0xf6f0e2, { side: THREE.DoubleSide }));
  // ติดกับกระดูกอก: แปลงพิกัดโลก → พิกัดของกระดูก
  const bone = B.chest || B.spine;
  bone.updateMatrixWorld(true);
  mesh.applyMatrix4(new THREE.Matrix4().copy(bone.matrixWorld).invert());
  mesh.frustumCulled = false;
  mesh.userData.noLine = true; // แถบผ้าบาง ไม่ต้องมีเส้นขอบแบบเปลือก
  bone.add(mesh);
  return mesh;
}

// แว่น: ใส่เฉพาะเมื่อมองเห็นตา (ผมหน้าม้าไม่ปิดตา) — ไม่งั้นแว่นจะดูลอยอยู่ใต้ผม
function eyesVisible(vrm, info) {
  const B = info.bones;
  if (!B.leftEye || !B.rightEye) return true;
  const cast = bodyRaycaster(vrm);
  // เช็กทั้งวงกรอบแว่น (บน ล่าง ซ้าย ขวา) — ถ้าผมบังส่วนไหนเลย จะเห็นแค่ครึ่งวงเป็นเส้นดำแปลก ๆ → ไม่ใส่
  const r = info.eyeGap * 0.55;
  for (const e of [B.leftEye, B.rightEye]) {
    const p = e.getWorldPosition(new THREE.Vector3());
    for (const [dx, dy] of [[0, 0], [0, r], [0, -r], [r, 0], [-r, 0], [r * 0.7, r * 0.7], [-r * 0.7, r * 0.7]]) {
      const hit = cast(p.x + dx, p.y + 0.004 + dy, /EYE|FACE|SKIN/i);
      if (!hit || !hit.ok) return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------- ใส่ชุด
// คืนค่า { props, undo() } — undo คืนเท็กซ์เจอร์เดิมและถอดพร็อพ
export function applyOutfit(vrm, outfit, info) {
  const changed = [];
  const props = [];
  if (!outfit) return { props, undo() {} };
  const cache = new Map();
  vrm.scene.traverse((o) => {
    for (const m of [].concat(o.material || [])) {
      if (!m || changed.some((c) => c.m === m)) continue;
      const part = outfit.parts?.[partOf(m.name)];
      if (!part || !m.map) continue;
      const key = m.map.uuid + JSON.stringify(part);
      let tex = cache.get(key);
      if (!tex) {
        tex = recolorTexture(m.map, part);
        cache.set(key, tex);
      }
      if (!tex) continue;
      changed.push({ m, map: m.map, shade: m.shadeMultiplyTexture, shadeColor: m.shadeColorFactor?.clone(), color: m.color?.clone() });
      m.map = tex;
      if ('shadeMultiplyTexture' in m) m.shadeMultiplyTexture = tex;
      if (m.shadeColorFactor) m.shadeColorFactor.setRGB(0.8, 0.79, 0.84);
      if (m.color) m.color.setRGB(1, 1, 1);
      m.needsUpdate = true;
    }
  });
  for (const name of outfit.props || []) {
    if (name === 'glasses' && !eyesVisible(vrm, info)) continue;
    const p = makeProp(name, info);
    if (p?.special === 'sash') {
      const m = buildSash(vrm, info);
      if (m) props.push(m);
      continue;
    }
    const bone = p && info.bones[p.bone];
    if (!bone) continue;
    p.obj.position.copy(p.pos);
    if (p.rot) p.obj.rotation.copy(p.rot);
    p.obj.traverse((o) => (o.frustumCulled = false));
    // กล่องครอบ: VRM 0.x หันกลับหลัง → หมุน 180° ให้พิกัดพร็อพตรงกับ VRM 1.0
    const holder = new THREE.Group();
    holder.name = 'prop:' + name;
    if (info.flip < 0) holder.rotation.y = Math.PI;
    holder.add(p.obj);
    bone.add(holder);
    props.push(holder);
  }
  return {
    props,
    undo() {
      for (const c of changed) {
        c.m.map = c.map;
        if ('shadeMultiplyTexture' in c.m) c.m.shadeMultiplyTexture = c.shade;
        if (c.shadeColor) c.m.shadeColorFactor.copy(c.shadeColor);
        if (c.color) c.m.color.copy(c.color);
        c.m.needsUpdate = true;
      }
      for (const t of cache.values()) t?.dispose();
      for (const p of props) p.parent?.remove(p);
    },
  };
}
