/* ฉากภาพ 2.5D — ภาพนิ่ง 1 ใบ + แผนที่ความลึก (depth map) → ฉากขยับมีมิติ
 * ใช้: window.PicScene.draw(ctx2d, tMs, pic)  (เรียกทุกเฟรมจาก drawBg ของธีม)
 * pic = { img, depth, fx: 'gold'|'petal'|'snow'|'firefly'|'bokeh'|'none', motion: 0-2, glow: 0-2, rays: bool, tone: 0.6-1.1 (ความสว่างรวม ภาพสว่างจ้าใช้ < 1),
 *         live: ภาพหน้ากากให้รูปปั้นในฉาก "มีชีวิต" (ไม่บังคับ) — แดง = ส่วนที่ส่ายซ้ายขวา (ยิ่งแดงยิ่งส่ายมาก), เขียว = คลื่นเลื้อย, น้ำเงิน = จุดเรืองแสง (ตา)
 *               ขยับในภาพเดียวกัน (เลื่อนจุดที่อ่านภาพ) → ไม่มีรอยตัดต่อ • PicScene.rage(0-1, ms) = ปลุกให้ส่ายแรง ตาลุกโชนชั่วคราว (ของขวัญ)
 *         livePivot / liveMouth: [x, y] ในภาพ (0-1, มุมซ้ายบน) = โคนคอ (จุดหมุนตอนชูคอ) / ปาก (จุดเริ่มคลื่นเสียงคำราม)
 *         liveG: 'wave' (ค่าเดิม — ลำตัวนาคเลื้อยขึ้นลง) | 'sway' (ไกวซ้ายขวา เช่น พวงมาลัยห้อย) • liveGlow: [r,g,b] สีจุดเรืองแสง • liveFlicker: true = ระริกแบบเปลวไฟ
 *         liveAmp: คูณแรงส่ายของช่องแดง (ค่าเดิม 1)
 *         live2: หน้ากากชุดที่ 2 (ไม่บังคับ) — แดง/เขียว = หูซ้าย/ขวาพัดออก-เข้า (น้ำหนักมากที่ขอบนอก), น้ำเงิน = ทั้งองค์หายใจ (ยืดหดรอบ liveBase [x,y])
 *         PicScene.act(0-1, { ms, roar }) = ชูคอขู่ (เศียรยกสูง+ขยาย ลำตัวเลื้อยแรง) • roar: เศียรสั่น + คลื่นเสียงบิดภาพแผ่จากปาก + จอสะเทือน }
 * - WebGL2: กล้องโยกช้า ๆ ของใกล้ขยับมากกว่าของไกล (parallax จากความลึก) + แสงเรือง (bloom) + ขอบมืด
 * - ไม่มี WebGL2: ซูมเข้าออกช้า ๆ แบบ Ken Burns
 * - ละอองแสง/กลีบดอกไม้/ลำแสง วาดซ้อนด้วย 2D (อยู่หลังตัวละครคนดู)
 */
(() => {
  const W = 1080;
  const H = 1920;
  let gl = null;
  let cv = null;
  let prog = null;
  let U = {};
  let glFailed = false;
  let texI = null;
  let texD = null;
  let texM = null; // หน้ากาก "รูปปั้นมีชีวิต" (pic.live)
  let texM2 = null; // หน้ากากชุดที่ 2 (pic.live2: หูพัด / หายใจ)
  let rageT = 0;
  let rageV = 0;
  let key = '';
  let img = null;
  let ready = false;
  let fit = [1, 1, 0, 0];
  let kickT = -1e9;

  const VS = `#version 300 es
in vec2 p; out vec2 v;
void main() { v = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;
  const FS = `#version 300 es
precision highp float;
in vec2 v; out vec4 o;
uniform sampler2D uI, uD, uM, uM2;
uniform vec2 uCam; uniform vec4 uFit; uniform float uZoom, uGlow, uT, uKick, uTone, uLive, uRage, uRear, uTrem, uWaveT, uWaveA;
uniform vec2 uPivot, uMouth;
uniform float uGMode, uFlick, uLive2, uRAmp; uniform vec3 uGlowC; uniform vec2 uBase;
vec2 fitUv(vec2 q) { return q * uFit.xy + uFit.zw; }
void main() {
  vec2 q = (v - 0.5) / uZoom + 0.5;
  // หาจุดในภาพที่ “มองเห็น” หลังเลื่อนกล้อง (ทำซ้ำ 4 รอบให้ขอบวัตถุไม่ยืด)
  vec2 off = vec2(0.0);
  for (int i = 0; i < 4; i++) {
    float d = textureLod(uD, fitUv(q - off), 1.5).r;
    off = uCam * (d - 0.45);
  }
  vec2 uv = clamp(fitUv(q - off), 0.001, 0.999);
  // รูปปั้นมีชีวิต (pic.live): หัวส่ายช้า ๆ + ลำตัวเลื้อยเป็นคลื่น + ตาเรืองแสง
  float eye = 0.0;
  float ring = 0.0;
  if (uLive > 0.5) {
    vec3 mk = texture(uM, uv).rgb;
    float rg = 1.0 + uRage * 1.6;
    vec2 dd = vec2(0.0);
    dd.x += mk.r * (sin(uT * 0.85) * 0.0085 + sin(uT * 1.9 + uv.y * 9.0) * 0.0018) * rg * uRAmp;
    dd.y += mk.r * sin(uT * 1.25 + 1.3) * 0.0032 * rg * uRAmp;
    if (uLive2 > 0.5) {
      vec3 m2 = texture(uM2, uv).rgb;
      // หูช้างพัดออก-เข้า (สองข้างพร้อมกัน จังหวะไม่สม่ำเสมอให้ดูเป็นธรรมชาติ) • ดีใจ (rage) = พัดแรงขึ้น
      float fl = sin(uT * 1.7) * 0.6 + sin(uT * 3.3 + 1.0) * 0.25;
      dd.x += (m2.g - m2.r) * fl * 0.009 * rg;
      // ทั้งองค์หายใจ: ยืดหดเล็กน้อยรอบฐาน (ฐานอยู่นิ่ง)
      dd += (uv - uBase) * m2.b * 0.011 * sin(uT * 0.9);
    }
    if (uGMode < 0.5) {
      dd.y += mk.g * sin(uv.x * 38.0 - uT * 2.0) * 0.0026 * rg;
      dd.x += mk.g * sin(uv.y * 26.0 - uT * 1.6) * 0.0013 * rg;
    } else {
      // ไกวซ้ายขวาเหมือนลมพัด (แต่ละสายจังหวะต่างกันนิดหน่อยตามตำแหน่ง)
      dd.x += mk.g * (sin(uT * 1.15 + uv.x * 9.0) * 0.006 + sin(uT * 2.6 + uv.y * 14.0) * 0.0012) * rg;
    }
    // ชูคอขู่: เศียรยกสูง + ใหญ่ขึ้นรอบโคนคอ • สั่นตอนคำราม • ลำตัวเลื้อยเป็นคลื่นแรงและเร็วขึ้น
    dd.y += mk.r * 0.017 * uRear;
    dd += (uv - uPivot) * mk.r * 0.085 * uRear;
    dd.x += mk.r * sin(uT * 38.0) * 0.003 * uTrem;
    dd.y += mk.g * sin(uv.x * 30.0 - uT * 6.5) * 0.0045 * uRear;
    // คลื่นเสียงคำราม: วงคลื่นบิดภาพแผ่ออกจากปากไปทั้งฉาก
    if (uWaveA > 0.0) {
      vec2 dv = (uv - uMouth) * vec2(1.0, 1.79);
      float dist = length(dv);
      float w = exp(-pow((dist - uWaveT * 0.75) * 16.0, 2.0)) * (1.0 - clamp(uWaveT / 2.4, 0.0, 1.0));
      dd += normalize(dv + 1e-5) * vec2(1.0, 1.0 / 1.79) * w * 0.014 * uWaveA;
      ring = w * uWaveA;
    }
    uv = clamp(uv - dd, 0.001, 0.999);
    eye = texture(uM, uv).b;
  }
  vec3 col = texture(uI, uv).rgb;
  // แสงเรือง: เอาส่วนสว่างของภาพเบลอ (mipmap) มาบวกเพิ่ม + กะพริบระยิบเบา ๆ
  vec3 b = textureLod(uI, uv, 4.0).rgb * 0.55 + textureLod(uI, uv, 5.5).rgb * 0.45;
  b = max(b - 0.5, 0.0);
  float sh = 0.8 + 0.2 * sin(uT * 1.6 + uv.y * 11.0 + uv.x * 6.0);
  col += b * (uGlow * 1.5 * sh + uKick * 2.2);
  col += uKick * 0.08;
  float pulse = uFlick > 0.5 ? 0.5 + 0.22 * sin(uT * 13.0 + uv.x * 90.0) + 0.16 * sin(uT * 7.3 + uv.y * 70.0) : 0.5 + 0.35 * sin(uT * 2.4);
  col += eye * uGlowC * (pulse + uRage * 1.6);
  col += ring * vec3(0.55, 0.95, 0.9) * 0.14;
  col *= uTone;
  float vg = smoothstep(1.15, 0.38, length((v - 0.5) * vec2(0.95, 0.78)));
  col *= mix(0.72, 1.0, vg);
  o = vec4(col, 1.0);
}`;

  function initGl() {
    if (gl || glFailed) return !!gl;
    try {
      cv = document.createElement('canvas');
      cv.width = W;
      cv.height = H;
      gl = cv.getContext('webgl2', { alpha: false, antialias: false, premultipliedAlpha: false });
      if (!gl) throw new Error('no webgl2');
      const sh = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
        return s;
      };
      prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'p');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      for (const n of ['uI', 'uD', 'uM', 'uCam', 'uFit', 'uZoom', 'uGlow', 'uT', 'uKick', 'uTone', 'uLive', 'uRage', 'uRear', 'uTrem', 'uWaveT', 'uWaveA', 'uPivot', 'uMouth', 'uGMode', 'uFlick', 'uGlowC', 'uM2', 'uLive2', 'uRAmp', 'uBase']) U[n] = gl.getUniformLocation(prog, n);
      gl.uniform1i(U.uI, 0);
      gl.uniform1i(U.uD, 1);
      gl.uniform1i(U.uM, 2);
      gl.uniform1i(U.uM2, 3);
      gl.viewport(0, 0, W, H);
      return true;
    } catch (e) {
      console.warn('PicScene: ใช้โหมดธรรมดา', e);
      glFailed = true;
      gl = null;
      return false;
    }
  }

  function tex(unit, im) {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  const loadImg = (src) =>
    new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = src;
    });

  function load(pic) {
    const k = pic.img + '|' + (pic.depth || '') + '|' + (pic.live || '') + '|' + (pic.live2 || '');
    if (k === key) return;
    key = k;
    ready = false;
    img = null;
    Promise.all([loadImg(pic.img), pic.depth ? loadImg(pic.depth).catch(() => null) : null, pic.live ? loadImg(pic.live).catch(() => null) : null, pic.live2 ? loadImg(pic.live2).catch(() => null) : null])
      .then(([im, dm, lm, lm2]) => {
        if (key !== k) return;
        img = im;
        // ครอบเต็มจอ 9:16 (ภาพกว้างกว่า = ตัดซ้ายขวา, สูงกว่า = ตัดบนล่าง)
        const a = im.naturalWidth / im.naturalHeight;
        const A = W / H;
        fit = a > A ? [A / a, 1, (1 - A / a) / 2, 0] : [1, a / A, 0, (1 - a / A) / 2];
        if (dm && initGl()) {
          if (texI) gl.deleteTexture(texI);
          if (texD) gl.deleteTexture(texD);
          if (texM) gl.deleteTexture(texM);
          if (texM2) gl.deleteTexture(texM2);
          texI = tex(0, im);
          texD = tex(1, dm);
          texM = lm ? tex(2, lm) : null;
          texM2 = lm && lm2 ? tex(3, lm2) : null;
        }
        ready = true;
      })
      .catch(() => console.warn('PicScene: โหลดภาพไม่ได้', pic.img));
  }

  // ---------------- ละออง / ลำแสง (2D)
  const sprites = {};
  function sprite(name, draw, s = 64) {
    if (sprites[name]) return sprites[name];
    const c = document.createElement('canvas');
    c.width = c.height = s;
    draw(c.getContext('2d'), s);
    return (sprites[name] = c);
  }
  const glowDot = (rgb) =>
    sprite('g' + rgb, (c, s) => {
      const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, `rgba(255,255,255,1)`);
      g.addColorStop(0.18, `rgba(${rgb},.95)`);
      g.addColorStop(0.5, `rgba(${rgb},.25)`);
      g.addColorStop(1, `rgba(${rgb},0)`);
      c.fillStyle = g;
      c.fillRect(0, 0, s, s);
    });
  const petal = () =>
    sprite('petal', (c, s) => {
      const g = c.createLinearGradient(0, 0, s, s);
      g.addColorStop(0, '#ffe3ef');
      g.addColorStop(1, '#ff8fbf');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(s / 2, 4);
      c.bezierCurveTo(s - 4, s * 0.25, s - 8, s * 0.8, s / 2, s - 4);
      c.bezierCurveTo(8, s * 0.8, 4, s * 0.25, s / 2, 4);
      c.fill();
    });
  const bokeh = () =>
    sprite('bokeh', (c, s) => {
      const g = c.createRadialGradient(s / 2, s / 2, s * 0.3, s / 2, s / 2, s / 2);
      g.addColorStop(0, 'rgba(255,240,210,.35)');
      g.addColorStop(0.85, 'rgba(255,240,210,.5)');
      g.addColorStop(1, 'rgba(255,240,210,0)');
      c.fillStyle = g;
      c.beginPath();
      c.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
      c.fill();
    }, 128);

  let parts = [];
  let partsFx = '';
  const R = (a, b) => a + Math.random() * (b - a);
  function seed(fx) {
    partsFx = fx;
    const n = { gold: 70, petal: 34, snow: 90, firefly: 40, bokeh: 16 }[fx] || 0;
    parts = Array.from({ length: n }, () => ({ x: R(0, W), y: R(0, H), z: R(0.4, 1.3), ph: R(0, 6.28), sp: R(0.6, 1.4), r: R(0, 6.28) }));
  }
  let lastT = 0;
  function drawParts(c, t, fx, cam) {
    if (fx !== partsFx) seed(fx);
    if (!parts.length) return;
    const dt = Math.min(0.05, Math.max(0, (t - lastT) / 1000));
    lastT = t;
    const s = t / 1000;
    c.save();
    if (fx === 'gold' || fx === 'firefly' || fx === 'bokeh') c.globalCompositeOperation = 'lighter';
    for (const p of parts) {
      const px = p.x + cam[0] * W * p.z * 0.6;
      const py = p.y - cam[1] * H * p.z * 0.6;
      if (fx === 'gold') {
        p.y -= 22 * p.sp * p.z * dt;
        p.x += Math.sin(s * 0.8 + p.ph) * 10 * dt;
        if (p.y < -20) (p.y = H + 20), (p.x = R(0, W));
        const sz = 10 + 16 * p.z;
        c.globalAlpha = (0.45 + 0.55 * Math.abs(Math.sin(s * 2.2 * p.sp + p.ph))) * 0.9;
        c.drawImage(glowDot('255,205,90'), px - sz / 2, py - sz / 2, sz, sz);
      } else if (fx === 'firefly') {
        p.x += Math.cos(s * 0.5 * p.sp + p.ph) * 26 * dt;
        p.y += Math.sin(s * 0.7 * p.sp + p.ph * 2) * 20 * dt;
        if (p.y < H * 0.35) p.y = H * 0.35 + 1;
        const sz = 14 + 18 * p.z;
        c.globalAlpha = Math.max(0, Math.sin(s * 1.3 * p.sp + p.ph)) ** 2;
        c.drawImage(glowDot('190,255,120'), px - sz / 2, py - sz / 2, sz, sz);
      } else if (fx === 'snow') {
        p.y += 70 * p.sp * p.z * dt;
        p.x += Math.sin(s + p.ph) * 18 * dt;
        if (p.y > H + 10) (p.y = -10), (p.x = R(0, W));
        c.globalAlpha = 0.55 + 0.35 * p.z;
        c.fillStyle = '#fff';
        c.beginPath();
        c.arc(px, py, 2 + 3.5 * p.z, 0, Math.PI * 2);
        c.fill();
      } else if (fx === 'petal') {
        p.y += 60 * p.sp * p.z * dt;
        p.x += (Math.sin(s * 0.9 + p.ph) * 40 + 18) * dt;
        p.r += dt * p.sp * 1.4;
        if (p.y > H + 30 || p.x > W + 30) (p.y = -30), (p.x = R(-100, W));
        const sz = 18 + 20 * p.z;
        c.globalAlpha = 0.9;
        c.setTransform(Math.cos(p.r), Math.sin(p.r) * 0.6, -Math.sin(p.r), Math.cos(p.r) * 0.6 + 0.4, px, py);
        c.drawImage(petal(), -sz / 2, -sz / 2, sz, sz);
        c.setTransform(1, 0, 0, 1, 0, 0);
      } else if (fx === 'bokeh') {
        p.y -= 8 * p.sp * dt;
        p.x += Math.sin(s * 0.3 + p.ph) * 6 * dt;
        if (p.y < -120) (p.y = H + 120), (p.x = R(0, W));
        const sz = 60 + 90 * p.z;
        c.globalAlpha = 0.25 + 0.2 * Math.sin(s * 0.7 + p.ph);
        c.drawImage(bokeh(), px - sz / 2, py - sz / 2, sz, sz);
      }
    }
    c.restore();
  }

  function drawRays(c, t, cam) {
    const s = t / 1000;
    c.save();
    c.globalCompositeOperation = 'lighter';
    const ox = W * 0.5 + cam[0] * W * 0.3;
    const oy = -120;
    for (let i = 0; i < 7; i++) {
      const a = Math.PI / 2 + Math.sin(s * 0.11 + i * 1.7) * 0.42 + (i - 3) * 0.13;
      const len = 1500;
      const wd = 70 + 50 * Math.sin(i * 2.3);
      const al = 0.07 + 0.05 * Math.sin(s * 0.5 + i * 1.3);
      const ex = ox + Math.cos(a) * len;
      const ey = oy + Math.sin(a) * len;
      const g = c.createLinearGradient(ox, oy, ex, ey);
      g.addColorStop(0, `rgba(255,236,180,${al * 1.6})`);
      g.addColorStop(0.6, `rgba(255,236,180,${al})`);
      g.addColorStop(1, 'rgba(255,236,180,0)');
      c.fillStyle = g;
      const nx = -Math.sin(a) * wd;
      const ny = Math.cos(a) * wd;
      c.beginPath();
      c.moveTo(ox - nx * 0.15, oy - ny * 0.15);
      c.lineTo(ox + nx * 0.15, oy + ny * 0.15);
      c.lineTo(ex + nx, ey + ny);
      c.lineTo(ex - nx, ey - ny);
      c.fill();
    }
    c.restore();
  }

  function draw(c, t, pic) {
    if (!pic?.img) return false;
    load(pic);
    const s = t / 1000;
    const m = pic.motion ?? 1;
    const kick = Math.max(0, 1 - (performance.now() - kickT) / 900);
    const k2 = kick * kick;
    const cam = [(Math.sin(s * 0.23) * 0.014 + Math.sin(s * 0.071 + 1) * 0.008) * m, (Math.sin(s * 0.17 + 2) * 0.006) * m];
    if (!ready) {
      c.fillStyle = '#0d0b14';
      c.fillRect(0, 0, W, H);
      return true;
    }
    const zoom = 1.06 + 0.012 * Math.sin(s * 0.13) * m + 0.035 * k2;
    // ท่าขู่ (PicScene.act): ชูคอขึ้นเร็ว ค้างไว้ (หายใจแรง) แล้วค่อย ๆ ลดลง • คำราม = สั่นช่วงกลาง + คลื่นเสียง + จอสะเทือน
    const now = performance.now();
    const ae = (now - actT0) / actDur;
    let rear = 0;
    let trem = 0;
    if (ae >= 0 && ae < 1) {
      rear = actV * (ae < 0.18 ? 1 - (1 - ae / 0.18) ** 3 : ae < 0.7 ? 1 + 0.05 * Math.sin(ae * 40) : 1 - ((ae - 0.7) / 0.3) ** 2);
      if (actRoar && ae > 0.15 && ae < 0.65) trem = actRoar * Math.sin(((ae - 0.15) / 0.5) * Math.PI);
    }
    const waveT = (now - actT0) / 1000 - (actDur / 1000) * 0.15;
    if (trem > 0) {
      cam[0] += Math.sin(s * 57) * 0.005 * trem;
      cam[1] += Math.cos(s * 49) * 0.004 * trem;
    }
    if (gl && texD) {
      gl.uniform2f(U.uCam, cam[0], cam[1]);
      gl.uniform4f(U.uFit, fit[0], fit[1], fit[2], fit[3]);
      gl.uniform1f(U.uZoom, zoom);
      gl.uniform1f(U.uGlow, pic.glow ?? 1);
      gl.uniform1f(U.uT, s);
      gl.uniform1f(U.uKick, k2);
      gl.uniform1f(U.uTone, Math.min(1.1, Math.max(0.6, Number(pic.tone) || 1)));
      gl.uniform1f(U.uLive, texM ? 1 : 0);
      // ความ "ตื่น" ของรูปปั้น: ขึ้นเร็ว ค้างตามเวลาที่สั่ง แล้วค่อย ๆ สงบลง
      const want = performance.now() < rageT ? rageV : 0;
      rage += (want - rage) * (want > rage ? 0.12 : 0.025);
      gl.uniform1f(U.uRage, rage);
      gl.uniform1f(U.uRear, rear);
      gl.uniform1f(U.uTrem, trem);
      gl.uniform1f(U.uWaveT, Math.max(0, waveT));
      gl.uniform1f(U.uWaveA, actRoar && waveT > 0 && waveT < 2.4 ? actRoar : 0);
      const pv = pic.livePivot || [0.5, 0.5];
      const mo = pic.liveMouth || [0.5, 0.3];
      gl.uniform2f(U.uPivot, pv[0], 1 - pv[1]);
      gl.uniform2f(U.uMouth, mo[0], 1 - mo[1]);
      gl.uniform1f(U.uGMode, pic.liveG === 'sway' ? 1 : 0);
      gl.uniform1f(U.uFlick, pic.liveFlicker ? 1 : 0);
      const gc = pic.liveGlow || [1, 0.5, 0.18];
      gl.uniform3f(U.uGlowC, gc[0], gc[1], gc[2]);
      if (texM) {
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, texM);
      }
      gl.uniform1f(U.uLive2, texM2 ? 1 : 0);
      gl.uniform1f(U.uRAmp, Number(pic.liveAmp) || 1);
      const bs = pic.liveBase || [0.5, 0.5];
      gl.uniform2f(U.uBase, bs[0], 1 - bs[1]);
      if (texM2) {
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, texM2);
      }
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texI);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, texD);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      c.drawImage(cv, 0, 0);
    } else {
      // โหมดธรรมดา: ซูม/เลื่อนช้า ๆ
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      const sc = Math.max(W / iw, H / ih) * zoom;
      const dw = iw * sc;
      const dh = ih * sc;
      c.drawImage(img, (W - dw) / 2 + cam[0] * W * 0.6, (H - dh) / 2 + cam[1] * H * 0.6, dw, dh);
      if (k2 > 0.01) {
        c.fillStyle = `rgba(255,240,200,${k2 * 0.18})`;
        c.fillRect(0, 0, W, H);
      }
      const tone = Number(pic.tone) || 1;
      if (tone < 1) {
        c.fillStyle = `rgba(20,12,40,${Math.min(0.4, 1 - tone)})`;
        c.fillRect(0, 0, W, H);
      }
    }
    if (pic.rays) drawRays(c, t, cam);
    drawParts(c, t, pic.fx || 'none', cam);
    return true;
  }

  // ของขวัญใหญ่: ฉากซูมเข้า + สว่างวาบ
  const kick = () => (kickT = performance.now());
  // ปลุกรูปปั้น (ฉากที่มี pic.live): v = 0-1 แรงแค่ไหน, ms = นานเท่าไร (ซ้อนกันได้ เอาค่าที่แรงกว่า/นานกว่า)
  let rage = 0;
  function wake(v = 1, ms = 2000) {
    const t = performance.now();
    rageV = t < rageT ? Math.max(rageV, v) : v;
    rageT = Math.max(rageT, t + ms);
  }
  // ท่าขู่ของรูปปั้น (ฉากที่มี pic.live): v = 0-1 แรงแค่ไหน • o.ms = นานเท่าไร • o.roar = คำราม (สั่น + คลื่นเสียง + จอสะเทือน)
  let actT0 = -1e9;
  let actDur = 1;
  let actV = 0;
  let actRoar = 0;
  function act(v = 1, o = {}) {
    actT0 = performance.now();
    actDur = o.ms || 2600;
    actV = v;
    actRoar = o.roar ? v : 0;
    wake(Math.max(0.5, v), actDur + 1200);
  }
  window.PicScene = { draw, kick, rage: wake, act };
})();
