/* น้องชิบิ 3D ของธีม pet3d — ปั้นด้วยโค้ดทั้งหมด (ไม่มีไฟล์โมเดล) + ท่าทางขยับด้วยโค้ด
 * window.makeChibiPet(THREE, species, evo) → { root, mats, mainMat, headTop, height, play(name, o), update(t, dt, st), setHorn(k) }
 * ชื่อท่าใช้ชื่อเดียวกับที่ตัวเกมเรียก: Idle, Idle_2, Idle_Headlow, Eating, Walk, Gallop, Gallop_Jump, Jump_toIdle, Idle_HitReact_Left/Right
 * น้องหันหน้าไปทาง +z • สูงประมาณ height หน่วย (ไม่รวมหู/เขา)
 */
(() => {
  'use strict';
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const sm = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));

  // สีและชิ้นส่วนของแต่ละชนิด • evo = ร่างโต (ทับค่าเดิม)
  const SPECIES = {
    stag: { col: '#f4eeff', belly: '#ffffff', iris: '#9b6bff', ears: 'leaf', inner: '#ffc3e1', antlers: '#ffd66b', muzzle: 'small', tail: 'puff', spots: '#d9c8ff' },
    deer: { col: '#dc9a66', belly: '#fff3e2', iris: '#7a4422', ears: 'leaf', inner: '#ffc0b8', muzzle: 'small', tail: 'puff', spots: '#fff3e2' },
    fox: { col: '#ff8a3a', belly: '#fff5e8', iris: '#d77a1c', ears: 'point', inner: '#fff5e8', muzzle: true, tail: 'fluffy', tip: '#fff5e8', paw: '#5b3a33' },
    shiba: { col: '#f3b26a', belly: '#fff5e6', iris: '#6b3b1c', ears: 'small', inner: '#fff5e6', muzzle: true, tail: 'curl' },
    alpaca: { col: '#fff6ea', belly: '#fff6ea', iris: '#55361f', ears: 'banana', inner: '#ffd2c4', muzzle: 'small', fluff: true, tail: 'puff' },
    husky: { col: '#8796b3', belly: '#ffffff', iris: '#48b7ff', ears: 'point', inner: '#ffd7e3', muzzle: true, mask: true, tail: 'fluffy', tip: '#ffffff' },
    dragon: {
      col: '#5fd69a', belly: '#ffe3b0', iris: '#ff8a3d', horns: '#fff1d0', hornH: 0.3, wings: 'bat', wing: '#ffb3c9', wingK: 1.25, tail: 'dragon', spikes: true,
      evo: { col: '#ff7046', belly: '#ffd66b', iris: '#ffd23f', horns: '#fff3c4', hornH: 0.46, wing: '#ffb03a', wingK: 1.7, flame: true, brows: true },
    },
    bee: {
      col: '#ffd23f', iris: '#5a3a1a', antenna: true, wings: 'bee', wingK: 1.35, float: true, stripes: '#5a3b26', tail: 'sting',
      evo: { col: '#ffc21a', stripes: '#2d1d14', iris: '#ff5a3d', wingK: 1.7, helmet: '#ffcf3a', plate: true, brows: true, wings4: true },
    },
    frog: { col: '#8fd86c', belly: '#f4ffd8', iris: '#3b2a12', frog: true, headR: [0.92, 0.6, 0.76], tail: null },
  };

  window.makeChibiPet = function makeChibiPet(THREE, sp, evo) {
    const V3 = THREE.Vector3;
    const base = SPECIES[sp] || SPECIES.stag;
    const D = evo && base.evo ? { ...base, ...base.evo } : base;
    // ---------------------------------------------------------------- วัสดุ (ของตัวนี้ตัวเดียว ย้อมสี/เรืองแสงแยกได้)
    const MC = new Map();
    const mats = [];
    function mat(color, o = {}) {
      const k = color + (o.side ? 'd' : '');
      if (!o.map && MC.has(k)) return MC.get(k);
      const c = new THREE.Color(color);
      const m = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.65, sheen: 0.8, sheenRoughness: 0.5, sheenColor: c.clone().lerp(new THREE.Color('#ffffff'), 0.25), emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0, envMapIntensity: 0.55, ...o });
      m.userData.orig = m.color.clone();
      mats.push(m);
      if (!o.map) MC.set(k, m);
      return m;
    }
    const SPH = new THREE.SphereGeometry(1, 40, 28);
    function ell(color, sx, sy, sz, x = 0, y = 0, z = 0, m) {
      const o = new THREE.Mesh(SPH, m || mat(color));
      o.scale.set(sx, sy, sz);
      o.position.set(x, y, z);
      o.castShadow = true;
      return o;
    }
    function surf(C, Rr, yaw, pitch, out = 0) {
      const d = new V3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
      const p = new V3(d.x * Rr.x, d.y * Rr.y, d.z * Rr.z);
      const n = new V3(p.x / Rr.x ** 2, p.y / Rr.y ** 2, p.z / Rr.z ** 2).normalize();
      return { p: p.add(C).addScaledVector(n, out), n };
    }
    function stick(o, s) {
      o.position.copy(s.p);
      o.quaternion.setFromUnitVectors(new V3(0, 0, 1), s.n);
      return o;
    }
    const DARK = new THREE.MeshStandardMaterial({ color: '#2a1724', roughness: 0.3 });
    function tube(pts, r, m = DARK) {
      const c = new THREE.CatmullRomCurve3(pts.map(([x, y, z = 0]) => new V3(x, y, z)));
      return new THREE.Mesh(new THREE.TubeGeometry(c, 20, r, 8), m);
    }
    const earGeo = (h, r) => {
      const pts = [];
      for (let i = 0; i <= 14; i++) {
        const u = i / 14;
        pts.push(new THREE.Vector2(r * Math.sqrt(Math.max(0, 1 - u * u)) * (1 - 0.42 * u) + 1e-4, u * h));
      }
      return new THREE.LatheGeometry(pts, 28);
    };
    // ---------------------------------------------------------------- หน้าตา
    const WHITE = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    function eye(irisCol, size = 1) {
      const g = new THREE.Group();
      const open = new THREE.Group();
      const black = new THREE.Mesh(SPH, new THREE.MeshStandardMaterial({ color: '#1c1028', roughness: 0.1 }));
      black.scale.set(0.135, 0.17, 0.06);
      const iris = new THREE.Mesh(SPH, new THREE.MeshStandardMaterial({ color: irisCol, roughness: 0.15, emissive: irisCol, emissiveIntensity: 0.35 }));
      iris.scale.set(0.1, 0.085, 0.04);
      iris.position.set(0, -0.062, 0.03);
      open.add(black, iris, ell(0, 0.048, 0.052, 0.02, -0.045, 0.06, 0.066, WHITE), ell(0, 0.022, 0.022, 0.015, 0.052, -0.04, 0.07, WHITE), ell(0, 0.012, 0.012, 0.01, -0.07, -0.02, 0.066, WHITE));
      open.traverse((o) => (o.castShadow = false));
      const happy = tube([[-0.1, -0.035, 0.03], [-0.05, 0.03, 0.05], [0, 0.055, 0.055], [0.05, 0.03, 0.05], [0.1, -0.035, 0.03]], 0.022);
      const shut = tube([[-0.1, 0.02, 0.03], [-0.05, -0.025, 0.05], [0, -0.035, 0.055], [0.05, -0.025, 0.05], [0.1, 0.02, 0.03]], 0.02);
      happy.visible = shut.visible = false;
      g.add(open, happy, shut);
      g.scale.setScalar(size);
      g.userData = { open, happy, shut, size };
      return g;
    }
    const blushTex = (() => {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const x = c.getContext('2d');
      const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,110,150,0.95)');
      gr.addColorStop(0.55, 'rgba(255,120,155,0.5)');
      gr.addColorStop(1, 'rgba(255,130,160,0)');
      x.fillStyle = gr;
      x.fillRect(0, 0, 64, 64);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    })();
    const BLM = new THREE.MeshBasicMaterial({ map: blushTex, transparent: true, depthWrite: false, opacity: 0.75 });
    function mouth(kind) {
      const g = new THREE.Group();
      const P0 = {
        w: [[-0.075, 0.014], [-0.04, -0.026], [0, 0.004], [0.04, -0.026], [0.075, 0.014]],
        smile: [[-0.17, 0.035], [-0.09, -0.02], [0, -0.035], [0.09, -0.02], [0.17, 0.035]],
        u: [[-0.06, 0.012], [-0.03, -0.022], [0, -0.03], [0.03, -0.022], [0.06, 0.012]],
      }[kind];
      const closed = tube(P0.map(([x, y]) => [x, y, -x * x * 1.6]), 0.013);
      const w = kind === 'smile' ? 1.4 : 1;
      const open = new THREE.Group();
      const hole = new THREE.Mesh(new THREE.CircleGeometry(0.07 * w, 24, Math.PI, Math.PI), new THREE.MeshBasicMaterial({ color: '#5a1e2e' }));
      hole.scale.y = 0.9;
      const tongue = new THREE.Mesh(new THREE.CircleGeometry(0.04 * w, 20, Math.PI, Math.PI), new THREE.MeshBasicMaterial({ color: '#ff7a96' }));
      tongue.position.set(0, -0.025 * w, 0.002);
      tongue.scale.y = 0.6;
      open.add(hole, tongue);
      open.position.y = 0.012;
      open.visible = false;
      g.add(closed, open);
      g.userData = { closed, open };
      return g;
    }

    // ---------------------------------------------------------------- ตัว
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);
    const R = { ears: [], wings: [], eyes: [], mouths: [], legs: [], antlers: [], blush: [] };
    const C = D.col;
    const BC = new V3(0, 0.56, 0), BR = new V3(0.56, 0.52, 0.52);
    let torsoMat;
    if (D.stripes) {
      const c = document.createElement('canvas');
      c.width = 8;
      c.height = 128;
      const x = c.getContext('2d');
      x.fillStyle = D.col;
      x.fillRect(0, 0, 8, 128);
      x.fillStyle = D.stripes;
      for (const y of [40, 66, 92]) x.fillRect(0, y, 8, 13);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      torsoMat = mat('#ffffff', { map: t });
    }
    body.add(ell(C, BR.x, BR.y, BR.z, BC.x, BC.y, BC.z, torsoMat));
    if (D.belly && !D.stripes) body.add(ell(D.belly, 0.36, 0.34, 0.2, 0, 0.5, 0.35));
    if (D.plate) {
      // เกราะอกผึ้งนักรบ
      const pm = new THREE.MeshStandardMaterial({ color: D.helmet, metalness: 0.75, roughness: 0.3, emissive: '#ff9a00', emissiveIntensity: 0.12 });
      body.add(ell(0, 0.34, 0.3, 0.16, 0, 0.62, 0.42, pm));
      const gem = ell(0, 0.07, 0.07, 0.05, 0, 0.66, 0.57, new THREE.MeshStandardMaterial({ color: '#ff3d6e', emissive: '#ff3d6e', emissiveIntensity: 0.6, roughness: 0.2 }));
      body.add(gem);
    }
    // ขา (จุดหมุนอยู่ที่ตัว → ยกขาเวลาเดิน)
    if (!D.float) {
      const legs = D.frog ? [[-0.34, 0.3, 0.26, 0.09, 0.3], [0.34, 0.3, 0.26, 0.09, 0.3], [-0.42, -0.1, 0.24, 0.12, 0.26], [0.42, -0.1, 0.24, 0.12, 0.26]] : [[-0.26, 0.26, 0.15, 0.17, 0.17], [0.26, 0.26, 0.15, 0.17, 0.17], [-0.32, -0.2, 0.16, 0.16, 0.17], [0.32, -0.2, 0.16, 0.16, 0.17]];
      legs.forEach(([x, z, sx, sy, sz], i) => {
        const l = ell(D.paw || C, sx, sy, sz, x, sy * 0.85, z);
        l.userData = { y0: sy * 0.85, ph: i === 0 || i === 3 ? 0 : Math.PI };
        body.add(l);
        R.legs.push(l);
      });
    } else for (const x of [-0.16, 0.16]) body.add(ell(D.stripes, 0.07, 0.09, 0.07, x, 0.06, 0.12));
    // ---------------------------------------------------------------- หัว
    const head = new THREE.Group();
    head.position.set(0, 0.92, 0.06);
    body.add(head);
    const HC = new V3(0, 0.5, 0), HR = D.headR ? new V3(...D.headR) : new V3(0.8, 0.7, 0.72);
    const hs = (y, p, o) => surf(HC, HR, y, p, o);
    head.add(ell(C, HR.x, HR.y, HR.z, HC.x, HC.y, HC.z));
    const headTop = new THREE.Object3D();
    headTop.position.set(0, HC.y + HR.y * 0.62, 0);
    head.add(headTop);
    if (D.mask) {
      head.add(ell('#ffffff', 0.64, 0.42, 0.5, 0, 0.34, 0.3));
      for (const s of [-1, 1]) head.add(stick(ell('#ffffff', 0.07, 0.05, 0.03), hs(s * 0.3, 0.3, 0.005)));
    }
    let mAt, mKind = 'w';
    const NOSE = new THREE.MeshStandardMaterial({ color: '#2b1820', roughness: 0.15 });
    if (D.muzzle === true) {
      const s = hs(0, -0.3, -0.12);
      head.add(stick(ell(D.belly, 0.27, 0.19, 0.2), s));
      const f = s.p.clone().addScaledVector(s.n, 0.19);
      head.add(stick(ell(0, 0.075, 0.055, 0.05, 0, 0, 0, NOSE), { p: f.clone().add(new V3(0, 0.07, 0)), n: s.n }));
      mAt = { p: f.clone().add(new V3(0, -0.06, -0.005)), n: s.n };
    } else if (D.muzzle === 'small') {
      const s = hs(0, -0.3, -0.06);
      head.add(stick(ell(D.belly, 0.22, 0.15, 0.13), s));
      const f = s.p.clone().addScaledVector(s.n, 0.12);
      head.add(stick(ell(0, 0.05, 0.035, 0.035, 0, 0, 0, NOSE), { p: f.clone().add(new V3(0, 0.05, 0)), n: s.n }));
      mAt = { p: f.clone().add(new V3(0, -0.045, -0.01)), n: s.n };
      mKind = 'u';
    } else if (D.frog) {
      mAt = hs(0, -0.12, 0.004);
      mKind = 'smile';
    } else mAt = hs(0, -0.3, 0.004);
    const mo = stick(mouth(mKind), mAt);
    head.add(mo);
    R.mouths.push(mo);
    const addBlush = (s) => {
      const b = stick(new THREE.Mesh(new THREE.PlaneGeometry(0.27, 0.17), BLM), s);
      head.add(b);
      R.blush.push(b);
    };
    if (D.frog) {
      for (const s of [-1, 1]) {
        const b = hs(s * 0.42, 0.62, -0.1);
        head.add(ell(C, 0.26, 0.25, 0.24, b.p.x, b.p.y, b.p.z));
        const e = eye(D.iris, 1.05);
        stick(e, { p: b.p.clone().add(new V3(s * 0.04, 0.03, 0.215)), n: new V3(s * 0.25, 0.12, 1).normalize() });
        head.add(e);
        R.eyes.push(e);
        addBlush(hs(s * 0.62, -0.12, 0.012));
      }
    } else {
      const ey = D.muzzle === true ? 0.06 : -0.02, ex = 0.36;
      for (const s of [-1, 1]) {
        const e = stick(eye(D.iris, 1.14), hs(s * ex, ey, -0.03));
        head.add(e);
        R.eyes.push(e);
        addBlush(hs(s * (ex + 0.26), ey - 0.26, 0.012));
        if (D.brows) {
          // คิ้วมุ่งมั่น (ร่างโต)
          const b = stick(tube([[-0.09, -0.02, 0.01], [0, 0.015, 0.02], [0.09, 0.03, 0.01]], 0.02), hs(s * ex, ey + 0.3, 0.005));
          b.scale.x = -s;
          head.add(b);
        }
      }
    }
    // ---- หู/เขา/หนวด
    function ear(s, geo, col, inner, yaw, pitch, tilt, flat = 0.5, back = 0) {
      const g = new THREE.Group();
      g.position.copy(hs(s * yaw, pitch, -0.08).p);
      g.rotation.set(-back, 0, -s * tilt);
      const o = new THREE.Mesh(geo, mat(col));
      o.scale.z = flat;
      o.castShadow = true;
      g.add(o);
      if (inner) {
        const i = new THREE.Mesh(geo, mat(inner));
        i.scale.set(0.62, 0.78, flat * 0.55);
        i.position.set(0, 0.03, 0.045);
        g.add(i);
      }
      g.userData.bx = g.rotation.x;
      head.add(g);
      R.ears.push(g);
      return g;
    }
    for (const s of [-1, 1]) {
      if (D.ears === 'point') ear(s, earGeo(0.44, 0.21), C, D.inner, 0.5, 0.7, 0.32);
      if (D.ears === 'small') ear(s, earGeo(0.34, 0.2), C, D.inner, 0.48, 0.72, 0.36);
      if (D.ears === 'banana') ear(s, earGeo(0.42, 0.12), C, D.inner, 0.55, 0.68, 0.42, 0.75);
      if (D.ears === 'leaf') {
        const g = new THREE.Group();
        g.position.copy(hs(s * 1.1, 0.38, -0.05).p);
        g.rotation.z = s * -0.35;
        g.add(ell(C, 0.25, 0.11, 0.07, s * 0.2, 0, 0), ell(D.inner, 0.17, 0.065, 0.03, s * 0.21, 0, 0.045));
        g.userData.bx = 0;
        head.add(g);
        R.ears.push(g);
      }
      if (D.horns) {
        const hm = mat(D.horns, evo ? { emissive: new THREE.Color('#ffb347'), emissiveIntensity: 0.25 } : {});
        const g = new THREE.Group();
        g.position.copy(hs(s * 0.36, 0.78, -0.08).p);
        g.rotation.set(-0.45, 0, -s * 0.25);
        const o = new THREE.Mesh(earGeo(D.hornH, 0.09 + D.hornH * 0.1), hm);
        o.castShadow = true;
        g.add(o);
        head.add(g);
        if (evo) {
          // เขาคู่เล็กด้านข้าง
          const g2 = new THREE.Group();
          g2.position.copy(hs(s * 0.75, 0.45, -0.06).p);
          g2.rotation.set(-0.3, 0, -s * 0.9);
          g2.add(new THREE.Mesh(earGeo(0.2, 0.07), hm));
          head.add(g2);
        }
      }
      if (D.antlers) {
        const g = new THREE.Group();
        g.position.copy(hs(s * 0.28, 0.82, -0.04).p);
        const gm = new THREE.MeshStandardMaterial({ color: D.antlers, emissive: '#ffb300', emissiveIntensity: 0.35, roughness: 0.35, metalness: 0.3 });
        g.add(tube([[0, 0], [s * 0.07, 0.17, -0.02], [s * 0.18, 0.32, -0.04], [s * 0.24, 0.46, -0.02]], 0.035, gm));
        g.add(tube([[s * 0.09, 0.2, -0.02], [s * 0.06, 0.3, 0.02], [s * 0.02, 0.36, 0.05]], 0.03, gm));
        g.add(tube([[s * 0.18, 0.32, -0.04], [s * 0.28, 0.36, -0.05], [s * 0.36, 0.4, -0.06]], 0.03, gm));
        for (const [x, y, z] of [[s * 0.24, 0.46, -0.02], [s * 0.02, 0.36, 0.05], [s * 0.36, 0.4, -0.06]]) g.add(ell(0, 0.05, 0.05, 0.05, x, y, z, gm));
        head.add(g);
        R.antlers.push(g);
      }
      if (D.antenna) {
        const g = new THREE.Group();
        g.position.copy(hs(s * 0.3, 0.8, -0.03).p);
        g.add(tube([[0, 0], [s * 0.05, 0.16, 0.02], [s * 0.14, 0.3, 0.06]], 0.022));
        if (evo) {
          const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.09), new THREE.MeshStandardMaterial({ color: '#fff3a0', emissive: '#ffcf3a', emissiveIntensity: 0.8, roughness: 0.3 }));
          star.position.set(s * 0.14, 0.33, 0.06);
          g.add(star);
        } else g.add(ell(0, 0.075, 0.075, 0.075, s * 0.14, 0.32, 0.06, mat(D.stripes)));
        g.userData.bx = 0;
        head.add(g);
        R.ears.push(g);
      }
    }
    if (D.helmet) {
      // หมวกเกราะผึ้งนักรบ (ครึ่งบนของหัว + ขนนก)
      const hm = new THREE.MeshStandardMaterial({ color: D.helmet, metalness: 0.75, roughness: 0.3, emissive: '#ff9a00', emissiveIntensity: 0.12 });
      const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI * 0.36), hm);
      cap.scale.set(HR.x * 1.04, HR.y * 1.06, HR.z * 1.04);
      cap.position.copy(HC);
      cap.rotation.x = -0.18;
      cap.castShadow = true;
      head.add(cap);
      const plume = ell(0, 0.08, 0.2, 0.22, 0, HC.y + HR.y + 0.1, -0.08, mat('#ff4f6a'));
      head.add(plume);
    }
    if (D.fluff) {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        head.add(stick(ell(C, 0.17, 0.15, 0.15), hs(Math.cos(a) * 0.38, 0.86 + Math.sin(a) * 0.08, -0.05)));
      }
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        body.add(ell(C, 0.2, 0.18, 0.2, Math.sin(a) * 0.5, 0.62 + (i % 2) * 0.12, Math.cos(a) * 0.46));
      }
    }
    if (D.spots) for (const [y, p] of [[2.3, 0.35], [2.7, 0.55], [-2.3, 0.35], [-2.7, 0.55], [3.14, 0.42], [1.9, 0.6], [-1.9, 0.6]]) body.add(stick(ell(D.spots, 0.065, 0.05, 0.02), surf(BC, BR, y, p, 0.003)));
    if (D.spikes) for (const p of [0.75, 0.45, 0.15]) {
      const s = surf(BC, BR, Math.PI, p, -0.02);
      const c = new THREE.Mesh(earGeo(evo ? 0.24 : 0.16, evo ? 0.1 : 0.08), mat(D.belly));
      c.position.copy(s.p);
      c.quaternion.setFromUnitVectors(new V3(0, 1, 0), s.n);
      c.castShadow = true;
      body.add(c);
    }
    // ---- หาง
    const tail = new THREE.Group();
    tail.position.set(0, 0.45, -0.42);
    if (D.tail === 'fluffy') for (const [y, z, r, tip] of [[0, 0, 0.14], [0.12, -0.16, 0.2], [0.32, -0.25, 0.24], [0.54, -0.22, 0.21, 1], [0.7, -0.14, 0.13, 1]]) tail.add(ell(tip ? D.tip : C, r, r, r, 0, y, z));
    if (D.tail === 'curl') {
      const t = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.085, 14, 36, Math.PI * 1.7), mat(C));
      t.position.set(0, 0.32, -0.08);
      t.rotation.set(0, Math.PI / 2, 0.6);
      t.castShadow = true;
      tail.add(t);
    }
    if (D.tail === 'puff') tail.add(ell(D.belly, 0.13, 0.13, 0.12, 0, 0.18, -0.06));
    if (D.tail === 'dragon') {
      for (const [x, y, z, r] of [[0, -0.12, 0, 0.2], [0.02, -0.18, -0.24, 0.15], [0.06, -0.14, -0.44, 0.11], [0.12, -0.04, -0.58, 0.08]]) tail.add(ell(C, r, r, r, x, y, z));
      if (D.flame) {
        // ไฟปลายหาง
        const fm = new THREE.MeshBasicMaterial({ color: '#ffb12e', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
        const f1 = new THREE.Mesh(earGeo(0.34, 0.14), fm);
        const f2 = new THREE.Mesh(earGeo(0.22, 0.09), new THREE.MeshBasicMaterial({ color: '#fff3a0', transparent: true, opacity: 0.95, depthWrite: false }));
        const fl = new THREE.Group();
        fl.position.set(0.15, 0.0, -0.64);
        fl.add(f1, f2);
        tail.add(fl);
        R.flame = fl;
      } else {
        const tip = new THREE.Mesh(earGeo(0.16, 0.1), mat(D.belly));
        tip.position.set(0.15, 0.03, -0.64);
        tip.rotation.set(-0.9, 0, -0.3);
        tip.scale.z = 0.5;
        tail.add(tip);
      }
    }
    if (D.tail === 'sting') {
      const st = new THREE.Mesh(new THREE.ConeGeometry(evo ? 0.09 : 0.07, evo ? 0.3 : 0.2, 16), evo ? new THREE.MeshStandardMaterial({ color: '#d8dde8', metalness: 0.8, roughness: 0.25 }) : mat(D.stripes));
      st.rotation.x = -Math.PI / 2;
      st.position.set(0, 0.05, -0.1);
      tail.add(st);
    }
    body.add(tail);
    // ---- ปีก
    for (const s of [-1, 1]) {
      if (D.wings === 'bat') {
        const sh = new THREE.Shape();
        sh.moveTo(0, 0);
        sh.quadraticCurveTo(0.18, 0.46, 0.62, 0.52);
        sh.quadraticCurveTo(0.52, 0.34, 0.58, 0.22);
        sh.quadraticCurveTo(0.44, 0.2, 0.44, 0.08);
        sh.quadraticCurveTo(0.3, 0.1, 0.26, -0.02);
        sh.quadraticCurveTo(0.12, 0.06, 0, 0);
        const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.025, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2 });
        const w = new THREE.Mesh(geo, mat(D.wing, { side: THREE.DoubleSide }));
        w.scale.x = s;
        w.castShadow = true;
        const g = new THREE.Group();
        g.position.set(s * 0.36, 0.86, -0.22);
        g.scale.setScalar(D.wingK);
        g.add(w);
        g.userData.s = s;
        body.add(g);
        R.wings.push(g);
      }
      if (D.wings === 'bee') {
        const g = new THREE.Group();
        g.position.set(s * 0.3, 1.0, -0.3);
        g.scale.setScalar(D.wingK);
        const wm = new THREE.MeshPhysicalMaterial({ color: '#eaf7ff', transparent: true, opacity: 0.55, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false, iridescence: 1 });
        const a = new THREE.Mesh(new THREE.CircleGeometry(0.3, 28), wm);
        a.scale.set(1, 0.62, 1);
        a.position.set(s * 0.26, 0.14, 0);
        a.rotation.z = s * 0.5;
        const b = new THREE.Mesh(new THREE.CircleGeometry(0.2, 28), wm);
        b.scale.set(1, 0.6, 1);
        b.position.set(s * 0.2, -0.06, 0.02);
        b.rotation.z = s * -0.3;
        g.add(a, b);
        if (D.wings4) {
          const c2 = a.clone();
          c2.position.set(s * 0.22, 0.32, -0.04);
          c2.rotation.z = s * 0.9;
          c2.scale.set(0.8, 0.5, 1);
          g.add(c2);
        }
        g.userData.s = s;
        body.add(g);
        R.wings.push(g);
      }
    }
    root.traverse((o) => o.isMesh && (o.frustumCulled = false));

    // ---------------------------------------------------------------- ท่าทาง
    // แต่ละท่า = ฟังก์ชันคืนท่าทาง (pose) ตามเวลาในท่านั้น • เปลี่ยนท่าแล้วค่อย ๆ ผสมจากท่าเดิม
    const POSES = {
      Idle: (lt) => ({ y: 0, sq: Math.sin(lt * 2.4) * 0.018, hx: Math.sin(lt * 1.3) * 0.04, hy: Math.sin(lt * 0.55) * 0.24, hz: Math.sin(lt * 0.9) * 0.08, tail: 0.25, tailF: 3, wing: 0.2, eyes: 'open', mouth: 0 }),
      Idle_2: (lt) => ({ y: Math.abs(Math.sin(lt * 3)) * 0.06, sq: Math.sin(lt * 6) * 0.025, roll: Math.sin(lt * 3) * 0.1, hx: -0.05, hy: Math.sin(lt * 1.1) * 0.15, hz: Math.sin(lt * 3) * 0.14, tail: 0.45, tailF: 7, wing: 0.35, eyes: lt % 3.2 < 1.6 ? 'happy' : 'open', mouth: 1 }),
      Idle_Headlow: (lt, st) => ({ y: 0, sq: Math.sin(lt * (st.sleep ? 1.2 : 2)) * 0.022 - (st.sleep ? 0.05 : 0), hx: st.sleep ? 0.22 : 0.2 + Math.sin(lt * 1.5) * 0.04, hy: st.sleep ? 0 : Math.sin(lt * 0.6) * 0.3, hz: st.sleep ? 0.18 : 0, tail: st.sleep ? 0.05 : 0.15, tailF: 2, wing: 0.05, ear: 0.25, eyes: st.sleep ? 'shut' : 'open', mouth: 0 }),
      Eating: (lt) => {
        const b = Math.max(0, Math.sin(lt * 7));
        return { y: 0, sq: -b * 0.04, hx: 0.14 + b * 0.14, hy: Math.sin(lt * 0.8) * 0.1, hz: Math.sin(lt * 3.5) * 0.06, tail: 0.45, tailF: 8, wing: 0.25, eyes: 'happy', mouth: b > 0.35 ? 1 : 0 };
      },
      Walk: (lt) => ({ y: Math.abs(Math.sin(lt * 7)) * 0.07, sq: Math.sin(lt * 14) * 0.02, roll: Math.sin(lt * 7) * 0.09, hx: 0, hy: 0, hz: -Math.sin(lt * 7) * 0.05, legs: 0.09, legF: 7, tail: 0.35, tailF: 7, wing: 0.4, eyes: 'open', mouth: 0 }),
      Gallop: (lt) => {
        const ph = lt * 10;
        return { y: Math.abs(Math.sin(ph)) * 0.24, sq: Math.cos(ph * 2) * 0.06, pitch: 0.12, hx: -0.12, hy: 0, hz: 0, legs: 0.14, legF: 10, tail: 0.5, tailF: 10, wing: 0.8, ear: -0.45, eyes: 'happy', mouth: 1 };
      },
      Jump: (lt) => {
        const d = 1.0;
        const u = lt / d;
        let y = 0, sq = 0;
        if (u < 0.2) sq = -sm(u / 0.2) * 0.14;
        else if (u < 0.72) {
          const k = (u - 0.2) / 0.52;
          y = Math.sin(k * Math.PI) * 0.6;
          sq = 0.12 * Math.sin(k * Math.PI);
        } else if (u < 0.95) sq = -Math.sin(((u - 0.72) / 0.23) * Math.PI) * 0.12;
        return { y, sq, hx: -0.15 * Math.sin(clamp(u, 0, 1) * Math.PI), hy: 0, hz: 0, tail: 0.5, tailF: 9, wing: 1, ear: -y * 0.8, eyes: u < 1.5 ? 'happy' : 'open', mouth: u < 1.3 ? 1 : 0 };
      },
      React: (lt, st, dir) => {
        const env = Math.sin(clamp(lt / 1.3, 0, 1) * Math.PI);
        return { y: 0, sq: Math.sin(lt * 9) * 0.03 * env, roll: Math.sin(lt * 14) * 0.05 * env, hx: -0.08 * env, hy: dir * 0.25 * env, hz: dir * 0.32 * env, tail: 0.6, tailF: 10, wing: 0.5, eyes: 'happy', mouth: 1, blush: 1 };
      },
    };
    const NAME = { Gallop_Jump: 'Jump', Jump_toIdle: 'Jump', Idle_HitReact_Left: 'ReactL', Idle_HitReact_Right: 'ReactR' };
    const poseOf = (name, lt, st) => {
      const n = NAME[name] || name;
      if (n === 'ReactL') return POSES.React(lt, st, 1);
      if (n === 'ReactR') return POSES.React(lt, st, -1);
      return (POSES[n] || POSES.Idle)(lt, st);
    };
    let now = 0;
    let cur = { name: 'Idle', t0: 0, speed: 1 };
    let prev = null;
    let fade = 0.3;
    function play(name, o = {}) {
      if (cur.name === name && !o.once) {
        cur.speed = o.speed || 1;
        return;
      }
      prev = cur;
      prev.tEnd = now;
      cur = { name, t0: now, speed: o.speed || 1, once: !!o.once };
      fade = clamp(o.fade ?? 0.3, 0.08, 0.8);
    }
    const lerp = (a, b, k) => a + (b - a) * k;
    const KEYS = ['y', 'sq', 'roll', 'pitch', 'hx', 'hy', 'hz', 'legs', 'tail', 'wing', 'ear', 'mouth', 'blush'];
    let blinkAt = 2;
    function update(t, dt, st = {}) {
      now = t;
      const ph = (t - cur.t0) * cur.speed;
      // ท่าครั้งเดียวจบแล้ว → ยืนเฉยต่อ (ท่าทางยังเป็นท่ายืน จนกว่าเกมจะสั่งท่าใหม่)
      let A = poseOf(cur.name, ph, st);
      if (cur.once && ph > 1.4) A = POSES.Idle(t, st);
      let Pz = A;
      if (prev) {
        const k = sm((t - cur.t0) / fade);
        if (k >= 1) prev = null;
        else {
          const B = poseOf(prev.name, (t - prev.t0) * prev.speed, st);
          Pz = { ...A };
          for (const key of KEYS) Pz[key] = lerp(B[key] || 0, A[key] || 0, k);
          if (k < 0.5) Pz.eyes = B.eyes;
        }
      }
      // ลอย (ผึ้ง) • ตัวยุบ/ยืด • เอียงตัว
      root.position.y = (Pz.y || 0) + (D.float ? 0.4 + Math.sin(t * 2) * 0.07 : 0);
      const sq = Pz.sq || 0;
      body.scale.set(1 - sq * 0.55, 1 + sq, 1 - sq * 0.55);
      body.rotation.set(Pz.pitch || 0, 0, Pz.roll || 0);
      head.rotation.set(Pz.hx || 0, Pz.hy || 0, Pz.hz || 0);
      // ตา: กระพริบเองเป็นระยะ
      if (t > blinkAt + 0.13) blinkAt = t + 2 + Math.random() * 3;
      const blink = t > blinkAt && t < blinkAt + 0.13;
      for (const e of R.eyes) {
        const u = e.userData;
        u.open.visible = Pz.eyes === 'open';
        u.happy.visible = Pz.eyes === 'happy';
        u.shut.visible = Pz.eyes === 'shut';
        e.scale.y = u.size * (Pz.eyes === 'open' && blink ? 0.12 : 1);
      }
      for (const m of R.mouths) {
        m.userData.open.visible = (Pz.mouth || 0) > 0.5;
        m.userData.closed.visible = !m.userData.open.visible;
      }
      BLM.opacity = 0.7 + (Pz.blush || 0) * 0.3;
      R.ears.forEach((e, i) => (e.rotation.x = (e.userData.bx || 0) + Math.sin(t * 3 + i * 2) * 0.05 + (Pz.ear || 0)));
      tail.rotation.y = Math.sin(t * (A.tailF || 3)) * (Pz.tail || 0.2);
      // ขาก้าว
      const lf = A.legF || 7;
      for (const l of R.legs) l.position.y = l.userData.y0 + Math.max(0, Math.sin(t * lf + l.userData.ph)) * (Pz.legs || 0);
      for (const w of R.wings) {
        const s = w.userData.s;
        if (D.wings === 'bee') w.rotation.y = s * (0.25 + Math.sin(t * 38) * 0.35);
        else {
          w.rotation.y = s * 0.15;
          w.rotation.z = s * Math.sin(t * (3 + (Pz.wing || 0) * 5)) * (0.15 + (Pz.wing || 0) * 0.45);
        }
      }
      if (R.flame) {
        const f = 1 + Math.sin(t * 17) * 0.12 + Math.sin(t * 29) * 0.08;
        R.flame.scale.set(1, f, 1);
        R.flame.rotation.z = Math.sin(t * 9) * 0.15;
      }
    }
    function setHorn(k) {
      for (const g of R.antlers) g.scale.setScalar(Math.max(0.15, k));
    }
    return { root, mats, mainMat: mat(C), headTop, height: D.frog ? 0.92 + 0.5 + 0.6 : 0.92 + HC.y + HR.y, play, update, setHorn, evo: !!(evo && base.evo) };
  };
})();
