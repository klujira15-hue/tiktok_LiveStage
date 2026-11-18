/* ดนตรีพื้นหลัง — สังเคราะห์สดด้วย Web Audio
 * ไม่มีไฟล์เพลง ทำนองแต่งใหม่เรื่อย ๆ จากสเกล/คอร์ดของแต่ละสไตล์ → ไม่ใช่เพลงของใคร ไม่ติดลิขสิทธิ์
 * ใช้: const m = StageMusic.create(audioCtx, audioCtx.destination); m.set({ style:'shrine', volume:.35, enabled:true });
 */
(function () {
  'use strict';
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const chance = (p) => Math.random() < p;
  const mod12 = (x) => ((x % 12) + 12) % 12;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const MAJ = [0, 2, 4, 5, 7, 9, 11];
  const PENTA = [0, 2, 4, 7, 9];
  const HARM = [0, 2, 3, 5, 7, 8, 11];

  // ---------------------------------------------------------------- สไตล์ของแต่ละธีม
  // chords: โน้ตเทียบกับ root (ครึ่งเสียง) 1 คอร์ด/ห้อง · mel: เครื่องดนตรีทำนอง · bar/step: แบ็กกิ้งต่อห้อง/ต่อ 1/16
  const STYLES = {
    concert: {
      name: '🎤 ป็อปคอนเสิร์ต (ซินธ์ + บีต)',
      gain: 0.71, // ปรับให้ทุกสไตล์ดังพอ ๆ กัน
      bpm: 112, root: 60, scale: MAJ, melLo: 69, melHi: 84, verb: 0.22,
      chords: [[9, 12, 16], [5, 9, 12], [0, 4, 7], [7, 11, 14]],
      rhythm: [0.95, 0, 0.35, 0, 0.55, 0, 0.3, 0.15, 0.7, 0, 0.35, 0, 0.5, 0, 0.25, 0.1],
      mel: (I, t, m, d) => I.pluck(t, m, 0.075, Math.min(0.9, d + 0.15), 2400, 'sawtooth'),
      bar(I, t, ch, bar, S) {
        I.pad(t, S.notes(ch, 0), S.barDur, 0.03, 1300);
      },
      step(I, t, s, ch, bar, S) {
        if (s === 0 || s === 8 || (s === 10 && bar % 2)) I.kick(t, 0.3);
        if (s === 4 || s === 12) I.clap(t, 0.07);
        if (s % 4 === 2) I.hat(t, 0.028);
        else if (s % 2 === 0) I.hat(t, 0.012);
        if (s === 0 || s === 3 || s === 8 || s === 11) I.bass(t, S.root + ch[0] - 24, S.spb * 2.5, 0.16);
        if (s % 2 === 0) {
          const arp = [...S.notes(ch, 0), ...S.notes(ch, 12)];
          I.pluck(t, arp[(s / 2 + bar) % arp.length], 0.03, 0.25, 3200, 'square');
        }
      },
    },

    shrine: {
      name: '🙏 ไทยเดิม สงบ (ระนาด ฉิ่ง โหม่ง)',
      gain: 1.78, // ปรับให้ทุกสไตล์ดังพอ ๆ กัน
      bpm: 62, root: 62, scale: PENTA, melLo: 69, melHi: 86, verb: 0.42,
      chords: [[0, 7, 12], [0, 7, 12], [-3, 4, 9], [-5, 2, 7]],
      rhythm: [1, 0, 0.25, 0, 0.6, 0, 0.3, 0, 0.8, 0, 0.3, 0, 0.55, 0, 0.35, 0.1],
      mel(I, t, m, d, S) {
        I.ranat(t, m, 0.13);
        I.ranat(t + 0.004, m - 12, 0.06); // ตีคู่แปด
        // โน้ตยาว = รัวระนาด (กรอ)
        if (d >= S.spb * 4 && chance(0.45)) for (let x = S.spb; x < d - 0.05; x += S.spb / 2) I.ranat(t + x, m, 0.05);
      },
      bar(I, t, ch, bar, S) {
        I.pad(t, S.notes(ch, -12), S.barDur, 0.022, 650, 'triangle');
        if (bar % 4 === 0) I.gong(t, 0.07, 98);
      },
      step(I, t, s, ch, bar, S) {
        if (s === 8) I.ching(t, 0.03, true); // ฉิ่ง
        if (s === 0) I.ching(t, 0.026, false); // ฉับ
        if (s === 0 || s === 12) I.ranat(t, S.root + ch[0] - 24, 0.07, 0.7); // ระนาดทุ้ม
      },
    },

    krathong: {
      name: '🪷 ริมน้ำยามค่ำ (ขิม ขลุ่ย)',
      gain: 0.94, // ปรับให้ทุกสไตล์ดังพอ ๆ กัน
      bpm: 70, root: 65, scale: PENTA, melLo: 72, melHi: 89, verb: 0.4, bed: 'water',
      chords: [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]],
      rhythm: [1, 0, 0, 0, 0.35, 0, 0.2, 0, 0.6, 0, 0, 0, 0.35, 0, 0.15, 0],
      mel: (I, t, m, d) => I.flute(t, m, Math.min(d, 2.2), 0.06),
      bar(I, t, ch, bar, S) {
        I.pad(t, S.notes(ch, 0), S.barDur, 0.016, 900, 'triangle');
        I.bass(t, S.root + ch[0] - 24, S.barDur * 0.9, 0.1, 'sine');
      },
      step(I, t, s, ch, bar, S) {
        const roll = [0, 3, 6, 8, 11, 14];
        const k = roll.indexOf(s);
        if (k >= 0) {
          const arp = [...S.notes(ch, 0), ...S.notes(ch, 12)];
          I.khim(t, arp[(k + (bar % 2) * 2) % arp.length], 0.05);
        }
        if (s === 8 && bar % 2) I.ching(t, 0.014, true);
      },
    },

    fishing: {
      name: '🎣 ชิล ๆ ริมบึง (กีตาร์โปร่ง ผิวปาก)',
      gain: 0.89, // ปรับให้ทุกสไตล์ดังพอ ๆ กัน
      bpm: 84, root: 67, scale: MAJ, melLo: 74, melHi: 88, verb: 0.25, swing: 0.28,
      chords: [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]],
      rhythm: [0.9, 0, 0, 0, 0.4, 0, 0.3, 0, 0.6, 0, 0, 0, 0.35, 0, 0.2, 0],
      mel: (I, t, m, d) => I.flute(t, m, Math.min(d, 1.4), 0.04),
      bar(I, t, ch, bar, S) {
        if (chance(0.14)) I.chirp(t + rand(0.2, S.barDur - 0.5));
      },
      step(I, t, s, ch, bar, S) {
        if (s === 0) I.strum(t, [S.root + ch[0] - 12, ...S.notes(ch, 0)], 0.05, false);
        if (s === 6 || s === 10) I.strum(t, S.notes(ch, 0), 0.03, true);
        if (s === 12) I.strum(t, S.notes(ch, 0), 0.035, false);
        if (s === 0) I.bass(t, S.root + ch[0] - 24, S.spb * 6, 0.13);
        if (s === 8) I.bass(t, S.root + ch[2] - 24, S.spb * 6, 0.1);
        if (s % 4 === 2) I.shaker(t, 0.018);
      },
    },

    songkran: {
      name: '💦 สนุก ๆ ฉลองสงกรานต์ (สตีลดรัม)',
      gain: 1.58, // ปรับให้ทุกสไตล์ดังพอ ๆ กัน
      bpm: 118, root: 67, scale: PENTA, melLo: 74, melHi: 88, verb: 0.18,
      chords: [[0, 4, 7], [-7, -3, 0], [-5, -1, 2], [0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2], [-5, 0, 2]],
      rhythm: [0.9, 0, 0.5, 0, 0.6, 0, 0.5, 0.2, 0.8, 0, 0.5, 0, 0.6, 0, 0.45, 0.2],
      mel: (I, t, m) => I.steel(t, m, 0.09),
      bar(I, t, ch, bar, S) {},
      step(I, t, s, ch, bar, S) {
        if (s === 0 || s === 8) I.kick(t, 0.28);
        if (s === 4 || s === 12) I.clap(t, 0.07);
        if (s % 2 === 0) I.shaker(t, s % 4 === 2 ? 0.03 : 0.014, 7000);
        const bl = { 0: 0, 3: 0, 6: 12, 8: 7, 11: 7, 14: 12 };
        if (s in bl) I.pizz(t, S.root + ch[0] - 24 + bl[s], 0.17, 700);
        if (s % 4 === 2) for (const n of S.notes(ch, 0)) I.pluck(t, n, 0.016, 0.13, 2600, 'square');
      },
    },

    cny: {
      name: '🧧 จีน ตรุษจีน (กู่เจิง เกราะไม้ ฆ้อง)',
      gain: 1.12, // ปรับให้ทุกสไตล์ดังพอ ๆ กัน
      bpm: 92, root: 62, scale: PENTA, melLo: 69, melHi: 86, verb: 0.32,
      chords: [[0, 4, 7], [-3, 0, 4], [-5, 0, 4], [-5, 2, 7]],
      rhythm: [1, 0, 0.3, 0.15, 0.6, 0, 0.35, 0, 0.75, 0, 0.3, 0.15, 0.55, 0, 0.35, 0],
      mel: (I, t, m) => I.zheng(t, m, 0.1),
      bar(I, t, ch, bar, S) {
        if (bar % 2 === 0) {
          // กรีดสายกู่เจิงขึ้น
          const run = S.pool(S.root - 12 + ch[0], 8);
          run.forEach((n, i) => I.zheng(t + i * 0.045, n, 0.035));
        }
        if (bar % 4 === 0) I.gong(t, 0.05, 140);
        I.pad(t, S.notes(ch, -12), S.barDur, 0.014, 700, 'triangle');
      },
      step(I, t, s, ch, bar, S) {
        if (s === 4 || s === 12 || (s === 14 && bar % 2)) I.woodblock(t, 0.09, s === 14 ? 1250 : 980);
        if (s === 0 || s === 8 || s === 10) I.kick(t, 0.2);
        if (s === 0) I.bass(t, S.root + ch[0] - 24, S.barDur * 0.7, 0.12, 'sine');
      },
    },

    ghost: {
      name: '👻 ลึกลับแบบน่ารัก (กล่องดนตรี)',
      gain: 1.68, // ปรับให้ทุกสไตล์ดังพอ ๆ กัน
      bpm: 66, root: 57, scale: HARM, melLo: 72, melHi: 88, verb: 0.45, bed: 'wind',
      chords: [[0, 3, 7], [-4, 0, 3], [-7, -4, 0], [-5, -1, 2]],
      rhythm: [1, 0, 0.3, 0, 0.55, 0, 0.3, 0, 0.75, 0, 0.3, 0, 0.5, 0, 0.3, 0.1],
      mel: (I, t, m) => I.musicbox(t, m, 0.075),
      bar(I, t, ch, bar, S) {
        I.pad(t, S.notes(ch, -12), S.barDur, 0.02, 520, 'sawtooth');
        I.bass(t, S.root + ch[0] - 24, S.barDur * 0.95, 0.09, 'sine');
        if (bar % 4 === 3 && chance(0.5)) I.heart(t + S.barDur * 0.5, 0.12);
      },
      step(I, t, s, ch, bar, S) {
        // พิซซิกาโต้ย่อง ๆ
        if (s % 4 === 0) {
          const walk = S.notes(ch, -12);
          I.pizz(t, walk[(s / 4) % walk.length], 0.1, 1100);
        }
      },
    },

    newyear: {
      name: '🎄 ปีใหม่ คริสต์มาส (กระดิ่ง เซเลสตา)',
      gain: 1.78, // ปรับให้ทุกสไตล์ดังพอ ๆ กัน
      bpm: 100, root: 60, scale: MAJ, melLo: 72, melHi: 88, verb: 0.3,
      chords: [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]],
      rhythm: [1, 0, 0.35, 0, 0.6, 0, 0.35, 0, 0.8, 0, 0.35, 0, 0.55, 0, 0.3, 0.1],
      mel: (I, t, m) => I.bell(t, m, 0.075, 1.6),
      bar(I, t, ch, bar, S) {
        I.pad(t, S.notes(ch, 0), S.barDur, 0.022, 1500, 'sawtooth');
      },
      step(I, t, s, ch, bar, S) {
        if (s % 2 === 0) I.sleigh(t, s % 4 === 0 ? 0.03 : 0.016);
        if (s === 0 || s === 8) I.kick(t, 0.18);
        if (s % 4 === 0) {
          const walk = [ch[0], ch[1], ch[2], ch[0] + 12];
          I.pizz(t, S.root + walk[s / 4] - 24, 0.16, 800);
        }
      },
    },

    // โบสถ์คริสต์ (ธีมอธิษฐาน): ช้า สงบ แพดแบบออร์แกน + ระฆังแก้วเบา ๆ เสียงก้องกว้าง
    church: {
      name: '⛪ โบสถ์ สงบ (ออร์แกน ระฆังแก้ว)',
      gain: 1.6,
      bpm: 60, root: 60, scale: MAJ, melLo: 67, melHi: 84, verb: 0.55,
      chords: [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2], [0, 4, 7], [-8, -5, -1], [-7, -3, 0], [-5, -1, 2]],
      rhythm: [1, 0, 0, 0, 0.35, 0, 0, 0, 0.7, 0, 0, 0, 0.3, 0, 0.1, 0],
      mel: (I, t, m) => I.bell(t, m, 0.045, 2.6),
      bar(I, t, ch, bar, S) {
        I.pad(t, S.notes(ch, 0), S.barDur, 0.026, 900, 'square');
        I.pad(t, S.notes(ch, 12), S.barDur, 0.01, 1600, 'triangle');
        I.bass(t, S.root + ch[0] - 24, S.barDur * 0.95, 0.06);
      },
      step() {},
    },

    // ---------------------------------------------------------------- ธีมเวที (คนดูขึ้นเต้น) — BPM ตรงกับท่าเต้นใน dance-engine.js
    ramwong: {
      name: '🎡 รำวงย้อนยุค (ฉิ่ง ฉับ กลองรำมะนา)',
      gain: 1.2,
      bpm: 124, root: 62, scale: PENTA, melLo: 69, melHi: 86, verb: 0.2,
      chords: [[0, 4, 7], [0, 4, 7], [-5, -1, 2], [0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2], [0, 4, 7]],
      rhythm: [0.9, 0, 0.45, 0, 0.7, 0, 0.45, 0.15, 0.85, 0, 0.45, 0, 0.6, 0, 0.4, 0.2],
      mel(I, t, m, d) {
        I.flute(t, m, Math.min(d, 0.5), 0.07);
        I.pluck(t, m, 0.03, 0.18, 2200, 'square');
      },
      bar(I, t, ch, bar, S) {
        I.pad(t, S.notes(ch, -12), S.barDur, 0.012, 800, 'triangle');
      },
      step(I, t, s, ch, bar, S) {
        if (s % 4 === 0) I.ching(t, 0.026, s % 8 === 4); // ฉิ่ง-ฉับ
        if (s === 0 || s === 6 || s === 8 || s === 14) I.woodblock(t, 0.09, 260); // รำมะนา
        if (s === 4 || s === 12) I.woodblock(t, 0.07, 520);
        if (s === 0 || s === 8) I.kick(t, 0.2);
        if (s === 0 || s === 4 || s === 8 || s === 12) I.bass(t, S.root + ch[0] - 24 + (s === 4 || s === 12 ? 7 : 0), S.spb * 2, 0.14);
      },
    },

    pageant: {
      name: '👑 เวทีประกวด (ป็อปอลังการ ระฆัง)',
      gain: 0.82,
      bpm: 100, root: 63, scale: MAJ, melLo: 70, melHi: 86, verb: 0.3,
      chords: [[0, 4, 7, 11], [-3, 0, 4, 7], [-7, -3, 0, 4], [-5, -1, 2, 5]],
      rhythm: [0.9, 0, 0, 0.3, 0.6, 0, 0.3, 0, 0.8, 0, 0, 0.3, 0.5, 0, 0.3, 0.1],
      mel: (I, t, m) => I.bell(t, m, 0.07, 1.6),
      bar(I, t, ch, bar, S) {
        I.pad(t, S.notes(ch, 0), S.barDur, 0.026, 1500);
        if (bar % 4 === 0) I.gong(t, 0.04, 196);
      },
      step(I, t, s, ch, bar, S) {
        if (s === 0 || s === 8 || (s === 10 && bar % 2)) I.kick(t, 0.26);
        if (s === 4 || s === 12) I.clap(t, 0.06);
        if (s % 2 === 0) I.hat(t, s % 4 === 2 ? 0.022 : 0.01);
        if (s === 0 || s === 6 || s === 8) I.bass(t, S.root + ch[0] - 24, S.spb * 3, 0.15);
        if (s % 4 === 2) {
          const arp = [...S.notes(ch, 12)];
          I.musicbox(t, arp[(s / 2 + bar) % arp.length], 0.03);
        }
      },
    },

    molam: {
      name: '🪇 หมอลำซิ่ง (แคน พิณ กลองซิ่ง)',
      gain: 0.9,
      bpm: 138, root: 64, scale: [0, 3, 5, 7, 10], melLo: 71, melHi: 88, verb: 0.16,
      chords: [[0, 7, 12], [0, 7, 12], [-2, 5, 10], [0, 7, 12], [-4, 3, 8], [-2, 5, 10], [0, 7, 12], [-2, 5, 10]],
      rhythm: [0.9, 0.3, 0.6, 0.3, 0.8, 0.3, 0.6, 0.4, 0.9, 0.3, 0.6, 0.3, 0.8, 0.4, 0.6, 0.5],
      mel(I, t, m) {
        I.pluck(t, m, 0.07, 0.22, 3400, 'square'); // พิณ
        I.pluck(t + 0.012, m + 12, 0.02, 0.12, 4200, 'square');
      },
      bar(I, t, ch, bar, S) {
        I.pad(t, S.notes(ch, -12), S.barDur, 0.03, 1100, 'sawtooth'); // แคน (เสียงยืน)
      },
      step(I, t, s, ch, bar, S) {
        if (s % 4 === 0) I.kick(t, 0.3);
        if (s === 4 || s === 12) I.clap(t, 0.08);
        if (s % 4 === 2) I.hat(t, 0.03, true);
        else if (s % 2 === 1) I.hat(t, 0.01);
        if (s % 2 === 0) I.ching(t, 0.012, s % 4 === 2);
        if (s % 4 === 2) I.bass(t, S.root + ch[0] - 24 + (s === 6 || s === 14 ? 12 : 0), S.spb * 1.6, 0.17, 'sawtooth');
      },
    },

    // เวทีหมอลำ 3D: หมอลำซิ่งจังหวะโจ๊ะ ๆ 148 BPM — กลองเตะทุกจังหวะ (ห้องคู่มีเตะเบิ้ลท้ายห้อง) ฉาบเปิด "ฉ่า" จังหวะยก ฉิ่ง-ฉับ เชคเกอร์รัว
    // เบสปั๊มจังหวะยก แคนกระแทกคอร์ดจังหวะยก (ตัวทำให้ "โจ๊ะ") พิณเล่นทำนองรัว โปงลางไล่โน้ตในคอร์ด ห้องที่ 8 กลองรัวส่ง + ฉาบใหญ่ขึ้นท่อนใหม่
    molamstage: {
      name: '🎤 หมอลำซิ่งโจ๊ะ ๆ (แคน พิณ โปงลาง กลองแดนซ์)',
      gain: 0.77,
      bpm: 148, root: 62, scale: [0, 3, 5, 7, 10], melLo: 69, melHi: 86, verb: 0.12,
      chords: [[0, 7, 12], [0, 7, 12], [-2, 5, 10], [-2, 5, 10], [-4, 3, 8], [-2, 5, 10], [0, 7, 12], [0, 7, 12]],
      rhythm: [0.95, 0.35, 0.75, 0.45, 0.9, 0.3, 0.75, 0.55, 0.95, 0.35, 0.75, 0.45, 0.9, 0.45, 0.7, 0.6],
      mel(I, t, m) {
        I.pluck(t, m, 0.085, 0.18, 3800, 'square'); // พิณ
        I.pluck(t + 0.01, m + 12, 0.024, 0.1, 4800, 'square');
      },
      bar(I, t, ch, bar, S) {
        I.pad(t, S.notes(ch, -12), S.barDur, 0.014, 900, 'sawtooth'); // แคนเสียงยืน (เบา ๆ ใต้ทุกอย่าง)
        if (bar % 8 === 0) I.cymbal(t, 0.05); // ขึ้นท่อนใหม่
      },
      step(I, t, s, ch, bar, S) {
        const fill = bar % 8 === 7 && s >= 8; // ห้องที่ 8: กลองรัวส่ง
        if (s % 4 === 0 || (fill && s % 2 === 0) || (bar % 2 === 1 && s === 14)) I.kick(t, fill ? 0.28 : 0.36);
        if (s === 4 || s === 12) I.clap(t, 0.09);
        if (fill && s % 2 === 1) I.clap(t, 0.045);
        if (s % 4 === 2) I.hat(t, 0.042, true); // ฉ่า
        else I.hat(t, s % 2 ? 0.013 : 0.008);
        I.shaker(t, s % 2 ? 0.011 : 0.018);
        if (s % 8 === 0) I.ching(t, 0.016, true); // ฉิ่ง
        else if (s % 8 === 4) I.ching(t, 0.014, false); // ฉับ
        if (s % 4 === 2 || s % 4 === 3) I.bass(t, S.root + ch[0] - 24 + (s % 4 === 3 ? 12 : 0), S.spb * 0.9, 0.18, 'sawtooth'); // เบสปั๊ม
        // แคนกระแทกคอร์ดสั้น ๆ จังหวะยก
        if (s % 4 === 2 && !fill) for (const n of S.notes(ch, 0)) {
          I.pluck(t, n, 0.03, 0.17, 1900, 'sawtooth');
          I.pluck(t + 0.004, n + 0.08, 0.02, 0.15, 1500, 'sawtooth');
        }
        // โปงลาง: ไล่โน้ตในคอร์ดรัว ๆ ครึ่งหลังของห้องคี่
        if (bar % 2 === 1 && s >= 8 && s % 2 === 0 && !fill) {
          const ns = S.notes(ch, 12);
          I.ranat(t, ns[(s / 2) % ns.length] + (s >= 12 ? 12 : 0), 0.05, 0.25);
        }
      },
    },

    disco: {
      name: '🪩 ดิสโก้ย้อนยุค 80s (เบสเดิน ซินธ์)',
      gain: 0.78,
      bpm: 120, root: 60, scale: [0, 2, 3, 5, 7, 9, 10], melLo: 70, melHi: 86, verb: 0.2,
      chords: [[-3, 0, 4, 7], [2, 5, 9, 12], [-5, -2, 2, 5], [-1, 2, 5, 9]],
      rhythm: [0.9, 0, 0.4, 0, 0.6, 0, 0.4, 0.3, 0.8, 0, 0.4, 0, 0.6, 0.2, 0.4, 0.2],
      mel: (I, t, m, d) => I.pluck(t, m, 0.07, Math.min(0.7, d + 0.1), 2600, 'sawtooth'),
      bar(I, t, ch, bar, S) {
        I.pad(t, S.notes(ch, 0), S.barDur, 0.024, 1800);
      },
      step(I, t, s, ch, bar, S) {
        if (s % 4 === 0) I.kick(t, 0.3); // four on the floor
        if (s === 4 || s === 12) I.clap(t, 0.07);
        if (s % 4 === 2) I.hat(t, 0.034, true); // ฉาบเปิดจังหวะยก
        else I.hat(t, 0.008);
        if (s % 2 === 0) I.bass(t, S.root + ch[0] - 24 + (s % 4 === 2 ? 12 : 0), S.spb * 1.4, 0.16, 'sawtooth'); // เบสสลับคู่แปด
        if (s === 14 && bar % 2) for (const n of S.notes(ch, 12)) I.pluck(t, n, 0.02, 0.2, 3200, 'square');
      },
    },

    // รถแห่แดนซ์: บีตแดนซ์ 4 จังหวะเน้น เบสปั๊มจังหวะยก คอร์ดกระแทก + ทำนองพิณซิ่ง (สเกลห้าเสียงไมเนอร์) แบบรีมิกซ์รถแห่
    rodhae: {
      name: '🚚 แดนซ์รถแห่ (เบสหนัก พิณซิ่ง)',
      gain: 0.83,
      bpm: 128, root: 57, scale: [0, 3, 5, 7, 10], melLo: 69, melHi: 86, verb: 0.14,
      chords: [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]],
      rhythm: [0.9, 0, 0.5, 0.2, 0.7, 0, 0.5, 0.3, 0.9, 0, 0.5, 0.2, 0.7, 0.2, 0.5, 0.4],
      mel(I, t, m) {
        I.pluck(t, m, 0.06, 0.2, 3600, 'square'); // พิณ
        I.pluck(t + 0.01, m + 12, 0.016, 0.1, 4400, 'square');
      },
      bar(I, t, ch, bar, S) {
        I.pad(t, S.notes(ch, 0), S.barDur, 0.018, 1500);
      },
      step(I, t, s, ch, bar, S) {
        const fill = bar % 8 === 7 && s >= 8; // ห้องที่ 8: กลองรัวก่อนขึ้นท่อนใหม่
        if (s % 4 === 0 || (fill && s % 2 === 0)) I.kick(t, fill ? 0.26 : 0.34);
        if (s === 4 || s === 12) I.clap(t, 0.08);
        if (s % 4 === 2) I.hat(t, 0.036, true);
        else I.hat(t, s % 2 ? 0.012 : 0.007);
        if (s % 4 === 2 || s % 4 === 3) I.bass(t, S.root + ch[0] - 24 + (s % 4 === 3 ? 12 : 0), S.spb * 0.9, 0.17, 'sawtooth'); // เบสปั๊ม
        if ([0, 3, 6, 10].includes(s) && bar % 2 === 1) for (const n of S.notes(ch, 12)) I.pluck(t, n, 0.022, 0.16, 3000, 'sawtooth'); // คอร์ดกระแทก
      },
    },

    // ดีเจคลับใต้น้ำ: ดีปเฮาส์ 124 BPM — กลองเตะทุกจังหวะ ไฮแฮตจังหวะยก เบสลึก คอร์ดไมเนอร์เซเว่นกระแทก + อาร์เปจจิโอใส ๆ
    djclub: {
      name: '🎧 คลับเฮาส์ใต้น้ำ (EDM ดีปเฮาส์)',
      gain: 0.8,
      bpm: 124, root: 57, scale: [0, 2, 3, 5, 7, 8, 10], melLo: 72, melHi: 88, verb: 0.24,
      chords: [[0, 3, 7, 10], [-4, 0, 3, 7], [-7, -3, 0, 3], [-2, 2, 5, 9]],
      rhythm: [0.7, 0, 0.3, 0.4, 0, 0.5, 0, 0.3, 0.6, 0, 0.3, 0.4, 0, 0.5, 0.2, 0.2],
      mel: (I, t, m, d) => I.pluck(t, m, 0.05, Math.min(0.5, d + 0.1), 3400, 'sawtooth'),
      bar(I, t, ch, bar, S) {
        I.pad(t, S.notes(ch, 0), S.barDur, 0.016, 1100);
      },
      step(I, t, s, ch, bar, S) {
        const build = bar % 8 === 7 && s >= 8; // ห้องที่ 8: กลองรัวก่อนดรอป
        if (s % 4 === 0 || (build && s % 2 === 0)) I.kick(t, build ? 0.26 : 0.33);
        if ((s === 4 || s === 12) && bar % 2) I.clap(t, 0.06);
        if (s % 4 === 2) I.hat(t, 0.034, true);
        else if (s % 2) I.hat(t, 0.009);
        if (s % 4 === 2) I.bass(t, S.root + ch[0] - 24, S.spb * 1.6, 0.18, 'sine'); // เบสลึกจังหวะยก
        if (s === 3 || s === 10) for (const n of S.notes(ch, 12)) I.pluck(t, n, 0.016, 0.22, 2200, 'sawtooth'); // คอร์ดกระแทก
        if (bar % 4 >= 2 && s % 2 === 0) { const arp = [...S.notes(ch, 12), ...S.notes(ch, 24)]; I.pluck(t, arp[(s / 2 + bar) % arp.length], 0.012, 0.12, 4200, 'triangle'); }
      },
    },

    adventure: {
      name: '⚔️ ชิปทูนผจญภัย (เกม 8 บิต)',
      gain: 0.66,
      bpm: 132, root: 57, scale: [0, 2, 3, 5, 7, 8, 10], melLo: 69, melHi: 86, verb: 0.1,
      chords: [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]],
      rhythm: [0.95, 0, 0.5, 0, 0.7, 0, 0.45, 0.3, 0.9, 0, 0.5, 0.2, 0.7, 0, 0.5, 0.3],
      mel: (I, t, m, d) => I.pluck(t, m, 0.055, Math.min(0.45, d + 0.05), 3800, 'square'),
      bar() {},
      step(I, t, s, ch, bar, S) {
        if (s % 4 === 0) I.kick(t, 0.24);
        if (s === 4 || s === 12) I.clap(t, 0.05);
        if (s % 2 === 1) I.hat(t, 0.012);
        if (s % 2 === 0) I.bass(t, S.root + ch[s % 8 === 4 ? 2 : 0] - 24 + (s % 4 === 2 ? 12 : 0), S.spb * 0.9, 0.12, 'square'); // เบสกระโดดคู่แปดแบบเกมเก่า
        const arp = [...S.notes(ch, 0), ...S.notes(ch, 12)];
        I.pluck(t, arp[(s + bar) % arp.length], 0.016, 0.1, 4200, 'square');
      },
    },

    // มัสยิด: ไม่มีเครื่องดนตรีเลย — มีแต่เสียงนกร้อง นกเขาขันเบา ๆ (ไม่มีเสียงซ่า)
    mosque: {
      name: '🕌 บรรยากาศมัสยิด (นกร้อง ไม่มีดนตรี)',
      gain: 6,
      bpm: 60, root: 60, scale: MAJ, melLo: 72, melHi: 84, verb: 0.15,
      chords: [[0]],
      rhythm: new Array(16).fill(0),
      mel() {},
      bar(I, t, ch, bar, S) {
        if (chance(0.55)) I.chirp(t + rand(0.1, S.barDur - 0.6), 0.05);
        if (chance(0.25)) I.chirp(t + rand(0.1, S.barDur - 0.6), 0.04);
        if (bar % 3 === 1 && chance(0.55)) I.coo(t + rand(0.2, S.barDur - 2));
      },
      step() {},
    },
    // ---------------------------------------------------------------- ธีมศาล 5 ศาล — แต่ละศาลเพลงคนละแนว ให้เข้ากับองค์เทพและฉาก
    // ท้าวเวสสุวรรณ: ปี่พาทย์ไทยเต็มวง สง่า (ระนาดเอกตีคู่แปด + ฆ้องวงเดินทำนองคลอ + กลองทัด/ตะโพน + ฉิ่งฉับ + โหม่ง)
    wessuwan: {
      name: '💚 ปี่พาทย์ศาลเจ้า (ระนาดเอก ฆ้องวง กลองทัด)',
      gain: 1.45,
      bpm: 76, root: 62, scale: PENTA, melLo: 69, melHi: 88, verb: 0.38,
      chords: [[0, 7, 12], [-3, 4, 9], [-5, 2, 7], [0, 7, 12], [2, 9, 14], [-3, 4, 9], [-5, 2, 7], [0, 7, 12]],
      rhythm: [1, 0, 0.45, 0, 0.7, 0, 0.45, 0.15, 0.9, 0, 0.45, 0, 0.7, 0, 0.45, 0.2],
      mel(I, t, m, d, S) {
        I.ranat(t, m, 0.12);
        I.ranat(t + 0.004, m - 12, 0.055);
        if (d >= S.spb * 3 && chance(0.5)) for (let x = S.spb / 2; x < d - 0.04; x += S.spb / 2) I.ranat(t + x, m, 0.045);
      },
      bar(I, t, ch, bar, S) {
        I.pad(t, S.notes(ch, -12), S.barDur, 0.014, 600, 'triangle');
        if (bar % 2 === 0) I.gong(t, 0.08, 92);
        I.taphon(t, 0.16, true);
      },
      step(I, t, s, ch, bar, S) {
        if (s % 2 === 0 && chance(0.75)) {
          const arp = [...S.notes(ch, -12), ...S.notes(ch, 0)];
          I.kongwong(t, arp[(s / 2 + bar) % arp.length], 0.045);
        }
        if (s === 4 || s === 12) I.ching(t, 0.03, true);
        if (s === 0 || s === 8) I.ching(t, 0.024, false);
        if (s === 10 || (s === 14 && bar % 2)) I.taphon(t, 0.1, false);
      },
    },

    // พญานาค: ป่าหมอกลึกลับริมน้ำ (ขลุ่ยช้า ๆ สเกลไมเนอร์ + เสียงแคนต่ำ ๆ คลอ + หยดน้ำ + ฆ้องต่ำ + เสียงน้ำไหล)
    naga: {
      name: '🐉 ป่าหมอกลึกลับ (ขลุ่ย แคน หยดน้ำ ฆ้องต่ำ)',
      gain: 0.69,
      bpm: 58, root: 57, scale: [0, 3, 5, 7, 10], melLo: 64, melHi: 81, verb: 0.52, bed: 'water',
      chords: [[0, 7, 12], [0, 7, 12], [-2, 5, 10], [-4, 3, 8], [0, 7, 12], [3, 10, 15], [-2, 5, 10], [0, 7, 12]],
      rhythm: [1, 0, 0, 0, 0.3, 0, 0, 0, 0.65, 0, 0, 0.2, 0.3, 0, 0, 0],
      mel: (I, t, m, d) => I.flute(t, m, Math.min(d, 2.6), 0.055),
      bar(I, t, ch, bar, S) {
        I.pad(t, S.notes(ch, -12), S.barDur, 0.02, 850, 'square'); // แคน: ลิ้นโลหะต่ำ ๆ คลอยาว
        if (bar % 4 === 0) I.gong(t, 0.09, 62);
        if (chance(0.7)) I.drip(t + rand(0.2, S.barDur - 0.3), 0.05);
        if (chance(0.4)) I.drip(t + rand(0.2, S.barDur - 0.3), 0.035);
      },
      step(I, t, s, ch, bar, S) {
        if (s === 0) I.bass(t, S.root + ch[0] - 24, S.barDur * 0.9, 0.09, 'sine');
        if (s === 8 && bar % 2) I.taphon(t, 0.07, true);
      },
    },

    // พระพิฆเนศ: ภักติอินเดีย (ซิตาร์รูดโน้ต สเกลไภรวะ + ตันปุระดีดวนตลอด + ตับลา 16 จังหวะ + กระดิ่งวัด)
    ganesha: {
      name: '🐘 ภักติอินเดีย (ซิตาร์ ตันปุระ ตับลา กระดิ่ง)',
      gain: 1.73,
      bpm: 84, root: 60, scale: [0, 1, 4, 5, 7, 8, 11], melLo: 67, melHi: 84, verb: 0.3,
      chords: [[0, 7, 12]],
      rhythm: [1, 0, 0.4, 0.2, 0.6, 0, 0.4, 0.2, 0.85, 0, 0.4, 0.2, 0.6, 0, 0.5, 0.3],
      mel: (I, t, m, d) => I.sitar(t, m, 0.09, Math.min(1.6, d + 0.4)),
      bar(I, t, ch, bar, S) {
        const r = S.root - 12; // ตันปุระ: ปะ สะ สะ สะ(ต่ำ) วนทุกห้อง
        [r + 7, r + 12, r + 12, r].forEach((n, i) => I.tanpura(t + (i * S.barDur) / 4, n, 0.055));
        if (bar % 4 === 0) I.bell(t, S.root + 24, 0.03, 2.2);
      },
      step(I, t, s) {
        const k = ['dha', '', 'tin', 'na', 'dha', '', 'dha', 'tin', 'dha', '', 'tin', 'na', 'ta', '', 'dha', 'na'][s];
        if (k) I.tabla(t, k, 0.12);
      },
    },

    // พระตรีมูรติ: บัลลาดรัก (กล่องดนตรีเล่นทำนอง + ฮาร์ปไล่คอร์ด + เครื่องสายนุ่ม ๆ คอร์ดเมเจอร์เซเวนท์)
    trimurti: {
      name: '💗 บัลลาดรัก (กล่องดนตรี ฮาร์ป เครื่องสาย)',
      gain: 0.66,
      bpm: 66, root: 65, scale: MAJ, melLo: 72, melHi: 88, verb: 0.48,
      chords: [[0, 4, 7, 11], [-3, 0, 4, 7], [-7, -3, 0, 4], [-5, -1, 2, 5], [0, 4, 7, 11], [-8, -5, -1, 2], [-7, -3, 0, 4], [-5, -1, 2, 7]],
      rhythm: [1, 0, 0, 0.25, 0.55, 0, 0.2, 0, 0.8, 0, 0, 0.25, 0.5, 0, 0.2, 0],
      mel: (I, t, m) => I.musicbox(t, m, 0.07),
      bar(I, t, ch, bar, S) {
        I.pad(t, S.notes(ch, -12), S.barDur, 0.016, 900, 'triangle');
        I.strings(t, S.notes(ch, 0), S.barDur, 0.011);
        I.bass(t, S.root + ch[0] - 24, S.barDur * 0.9, 0.08, 'sine');
      },
      step(I, t, s, ch, bar, S) {
        if (s % 2 === 0) {
          const arp = [...S.notes(ch, -12), ...S.notes(ch, 0)];
          I.harp(t, arp[(s / 2) % arp.length], 0.04);
        }
        if (s === 0 && bar % 4 === 0) I.bell(t, S.root + 19, 0.02, 2.4);
      },
    },

    // ไฉ่ซิงเอี๊ยะ: จีนมงคล ครึกครื้น (เอ้อหูสีทำนอง + กู่เจิงกรีดสาย + กลองสิงโต + ฉาบ + ฆ้อง + เกราะไม้)
    caishen: {
      name: '💰 จีนมงคล (เอ้อหู กู่เจิง กลองสิงโต ฉาบ)',
      gain: 0.62,
      bpm: 104, root: 64, scale: PENTA, melLo: 71, melHi: 88, verb: 0.28,
      chords: [[0, 4, 7], [-3, 0, 4], [2, 7, 9], [-5, 0, 4], [0, 4, 7], [-3, 2, 7], [-5, -1, 2], [0, 4, 7]],
      rhythm: [1, 0, 0.3, 0.15, 0.7, 0, 0.35, 0.15, 0.85, 0, 0.3, 0.15, 0.65, 0, 0.4, 0.2],
      mel: (I, t, m, d) => I.erhu(t, m, Math.min(d, 1.6), 0.06),
      bar(I, t, ch, bar, S) {
        if (bar % 2 === 0) {
          const run = S.pool(S.root - 12 + ch[0], 8);
          run.forEach((n, i) => I.zheng(t + i * 0.04, n, 0.03));
        }
        if (bar % 4 === 0) {
          I.gong(t, 0.06, 150);
          I.cymbal(t, 0.045);
        }
        I.pad(t, S.notes(ch, -12), S.barDur, 0.012, 700, 'triangle');
      },
      step(I, t, s, ch, bar, S) {
        if (s === 0 || s === 6 || s === 8 || s === 11) I.bigdrum(t, s === 0 ? 0.26 : 0.18); // จังหวะกลองเชิดสิงโต
        if (s === 4 || s === 12) I.cymbal(t, 0.03, true);
        if (s % 4 === 2) I.woodblock(t, 0.06, 1100);
        if (s === 0) I.bass(t, S.root + ch[0] - 24, S.barDur * 0.5, 0.1, 'sine');
      },
    },
  };

  // ---------------------------------------------------------------- engine
  function create(ctx, dest) {
    const out = ctx.createGain();
    out.gain.value = 0;
    const duckG = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.ratio.value = 3;
    comp.attack.value = 0.01;
    comp.release.value = 0.3;
    const bus = ctx.createGain();
    const verbSend = ctx.createGain();
    const verb = ctx.createConvolver();
    verb.buffer = impulse(2.8);
    bus.connect(comp);
    bus.connect(verbSend);
    verbSend.connect(verb);
    verb.connect(comp);
    comp.connect(duckG);
    duckG.connect(out);
    // ลิมิตเตอร์ท้ายสุด กันเสียงแตกตอนเร่งความดังสุด
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -4;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.1;
    out.connect(limiter);
    limiter.connect(dest);

    function impulse(sec) {
      const len = Math.floor(ctx.sampleRate * sec);
      const b = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = b.getChannelData(c);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.4);
      }
      return b;
    }

    // ---- building blocks
    function osc(type, f, t, end, dst, detune = 0) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(f, t);
      if (detune) o.detune.value = detune;
      o.connect(dst);
      o.start(t);
      o.stop(end);
      return o;
    }
    // เสียงยาว: attack → hold → release
    function vca(t, a, peak, hold, rel, dst = bus) {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak, t + a);
      g.gain.setValueAtTime(peak, t + a + hold);
      g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel);
      g.connect(dst);
      return g;
    }
    // เสียงตี/ดีด: ขึ้นเร็วแล้วจางลง
    function perc(t, peak, d, dst = bus, a = 0.004) {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak, t + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
      g.connect(dst);
      return g;
    }
    function filt(type, f, q = 0.7, dst = bus) {
      const b = ctx.createBiquadFilter();
      b.type = type;
      b.frequency.value = f;
      b.Q.value = q;
      b.connect(dst);
      return b;
    }
    let nbuf = null;
    function noise(t, end, dst) {
      if (!nbuf) {
        nbuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        const d = nbuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      const s = ctx.createBufferSource();
      s.buffer = nbuf;
      s.loop = true;
      s.connect(dst);
      s.start(t, Math.random() * 1.5);
      s.stop(end);
      return s;
    }
    function vibrato(o, t, f, depth, rate, delay, end) {
      const l = ctx.createOscillator();
      l.frequency.value = rate;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(f * depth, t + delay);
      l.connect(g).connect(o.frequency);
      l.start(t);
      l.stop(end);
    }

    // ---- เครื่องดนตรี
    const I = {
      pad(t, notes, dur, vol, bright = 1200, type = 'sawtooth') {
        const f = filt('lowpass', bright, 0.5);
        const a = Math.min(1.2, dur * 0.3);
        const g = vca(t, a, vol / Math.sqrt(notes.length), Math.max(0.05, dur - a - 0.1), 1.4, f);
        for (const m of notes) for (const dt of [-8, 8]) osc(type, mtof(m), t, t + dur + 1.6, g, dt);
      },
      pluck(t, m, vel, decay = 0.6, bright = 3000, type = 'triangle') {
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.setValueAtTime(bright, t);
        f.frequency.exponentialRampToValueAtTime(Math.max(180, bright * 0.12), t + decay);
        f.connect(bus);
        osc(type, mtof(m), t, t + decay + 0.1, perc(t, vel, decay, f));
      },
      strum(t, notes, vel, up) {
        const ns = up ? [...notes].reverse() : notes;
        ns.forEach((m, i) => {
          const tt = t + i * 0.018;
          const f = ctx.createBiquadFilter();
          f.type = 'lowpass';
          f.frequency.setValueAtTime(2600, tt);
          f.frequency.exponentialRampToValueAtTime(400, tt + 1.1);
          f.connect(bus);
          const g = perc(tt, vel * (up ? 0.7 : 1), 1.1, f, 0.002);
          osc('triangle', mtof(m), tt, tt + 1.2, g);
          osc('sawtooth', mtof(m), tt, tt + 1.2, perc(tt, vel * 0.25, 0.25, f, 0.002));
        });
      },
      ranat(t, m, vel, decay = 0.45) {
        osc('sine', mtof(m), t, t + decay + 0.1, perc(t, vel, decay));
        osc('sine', mtof(m) * 2, t, t + 0.2, perc(t, vel * 0.25, 0.12));
        osc('triangle', mtof(m) * 3.98, t, t + 0.08, perc(t, vel * 0.35, 0.05, bus, 0.001));
      },
      khim(t, m, vel) {
        const f = filt('lowpass', 4200);
        const g = perc(t, vel, 1.6, f);
        osc('triangle', mtof(m), t, t + 1.8, g, -5);
        osc('triangle', mtof(m), t, t + 1.8, g, 6);
        osc('sawtooth', mtof(m), t, t + 0.3, perc(t, vel * 0.35, 0.2, f));
      },
      zheng(t, m, vel) {
        const f = filt('lowpass', 3600);
        const o = osc('triangle', mtof(m) * 0.97, t, t + 1.5, perc(t, vel, 1.3, f));
        o.frequency.exponentialRampToValueAtTime(mtof(m), t + 0.07);
        vibrato(o, t, mtof(m), 0.007, 5.5, 0.6, t + 1.5);
        osc('sawtooth', mtof(m), t, t + 0.35, perc(t, vel * 0.3, 0.25, f));
      },
      flute(t, m, dur, vel) {
        const f = filt('lowpass', 2600);
        const hold = Math.max(0.02, dur - 0.15);
        const o = osc('sine', mtof(m), t, t + dur + 0.5, vca(t, 0.08, vel, hold, 0.3, f));
        vibrato(o, t, mtof(m), 0.005, 5, 0.3, t + dur + 0.5);
        osc('triangle', mtof(m + 12), t, t + dur + 0.5, vca(t, 0.08, vel * 0.1, hold, 0.3, f));
        noise(t, t + 0.25, perc(t, vel * 0.3, 0.14, filt('bandpass', mtof(m) * 2, 2), 0.02));
      },
      bell(t, m, vel, decay = 2) {
        osc('sine', mtof(m), t, t + decay + 0.1, perc(t, vel, decay));
        osc('sine', mtof(m) * 2, t, t + decay * 0.4, perc(t, vel * 0.35, decay * 0.35));
        osc('sine', mtof(m) * 3.01, t, t + decay * 0.2, perc(t, vel * 0.15, decay * 0.15));
      },
      musicbox(t, m, vel) {
        osc('sine', mtof(m), t, t + 1.8, perc(t, vel, 1.6, bus, 0.002));
        osc('sine', mtof(m) * 2.997, t, t + 1, perc(t, vel * 0.2, 0.8, bus, 0.002));
        osc('sine', mtof(m) * 4.01, t, t + 0.5, perc(t, vel * 0.35, 0.35, bus, 0.002));
      },
      steel(t, m, vel) {
        const f = filt('lowpass', 5000);
        const o = osc('sine', mtof(m) * 1.012, t, t + 0.8, perc(t, vel, 0.7, f));
        o.frequency.exponentialRampToValueAtTime(mtof(m), t + 0.05);
        osc('sine', mtof(m) * 2, t, t + 0.5, perc(t, vel * 0.45, 0.35, f));
        osc('sine', mtof(m) * 3, t, t + 0.3, perc(t, vel * 0.2, 0.18, f));
      },
      bass(t, m, dur, vel, type = 'triangle') {
        const g = vca(t, 0.012, vel, Math.max(0.02, dur * 0.6), dur * 0.5 + 0.1, filt('lowpass', 480));
        osc(type, mtof(m), t, t + dur + 0.5, g);
        osc('sine', mtof(m), t, t + dur + 0.5, g);
      },
      pizz(t, m, vel, bright = 900) {
        osc('triangle', mtof(m), t, t + 0.4, perc(t, vel, 0.3, filt('lowpass', bright)));
      },
      kick(t, vel) {
        const o = osc('sine', 120, t, t + 0.4, perc(t, vel, 0.3));
        o.frequency.exponentialRampToValueAtTime(42, t + 0.25);
      },
      hat(t, vel, open = false) {
        noise(t, t + (open ? 0.3 : 0.06), perc(t, vel, open ? 0.22 : 0.035, filt('highpass', 7500), 0.002));
      },
      shaker(t, vel, f = 5200) {
        noise(t, t + 0.1, perc(t, vel, 0.06, filt('bandpass', f, 1.2), 0.015));
      },
      clap(t, vel) {
        const f = filt('bandpass', 1400, 0.9);
        [0, 0.012, 0.024].forEach((d, i) => noise(t + d, t + d + (i === 2 ? 0.22 : 0.02), perc(t + d, vel, i === 2 ? 0.16 : 0.012, f, 0.001)));
      },
      // ฉิ่ง (เปิด) / ฉับ (ปิด) — โลหะเสียงไม่ลงฮาร์มอนิก
      ching(t, vel, open) {
        const d = open ? 1.3 : 0.08;
        [2650, 3720, 5130, 6900].forEach((f, i) => osc('sine', f, t, t + d + 0.1, perc(t, vel / (i + 1), d * (1 - i * 0.15), bus, 0.001)));
        if (!open) noise(t, t + 0.05, perc(t, vel * 1.4, 0.03, filt('bandpass', 4500, 1), 0.001));
      },
      woodblock(t, vel, f0 = 900) {
        osc('sine', f0, t, t + 0.08, perc(t, vel, 0.05, bus, 0.001));
        osc('triangle', f0 * 2.7, t, t + 0.04, perc(t, vel * 0.4, 0.02, bus, 0.001));
      },
      gong(t, vel, f0 = 110) {
        [[1, 1, 4], [1.48, 0.4, 2.5], [2.11, 0.3, 2], [2.8, 0.15, 1.4]].forEach(([r, v, d]) => {
          const o = osc('sine', f0 * r * 1.01, t, t + d + 0.1, perc(t, vel * v, d, bus, 0.01));
          o.frequency.exponentialRampToValueAtTime(f0 * r, t + 0.6);
        });
      },
      sleigh(t, vel) {
        const f = filt('highpass', 6000);
        for (let i = 0; i < 4; i++) {
          const tt = t + i * 0.012 + Math.random() * 0.008;
          noise(tt, tt + 0.1, perc(tt, vel, 0.07, f, 0.002));
        }
      },
      heart(t, vel) {
        [0, 0.22].forEach((d, i) => {
          const o = osc('sine', 62, t + d, t + d + 0.3, perc(t + d, vel * (i ? 0.7 : 1), 0.22));
          o.frequency.exponentialRampToValueAtTime(38, t + d + 0.2);
        });
      },
      // ---- เครื่องดนตรีของธีมศาล
      // ฆ้องวง: ลูกฆ้องโลหะ มีเสียงสูงไม่ลงฮาร์มอนิก ก้องนาน
      kongwong(t, m, vel) {
        osc('sine', mtof(m), t, t + 1.6, perc(t, vel, 1.4, bus, 0.003));
        osc('sine', mtof(m) * 2.76, t, t + 0.5, perc(t, vel * 0.3, 0.35, bus, 0.002));
        osc('sine', mtof(m) * 5.4, t, t + 0.15, perc(t, vel * 0.12, 0.1, bus, 0.001));
      },
      // กลองทัด (ต่ำ) / ตะโพน (สูง): หนังตึง เสียงตกลง
      taphon(t, vel, low = true) {
        const f0 = low ? 110 : 190;
        const o = osc('sine', f0, t, t + 0.6, perc(t, vel, low ? 0.45 : 0.25));
        o.frequency.exponentialRampToValueAtTime(f0 * 0.62, t + 0.3);
        noise(t, t + 0.04, perc(t, vel * 0.4, 0.03, filt('bandpass', low ? 600 : 1200, 1), 0.001));
      },
      // หยดน้ำ
      drip(t, vel) {
        const o = osc('sine', 900, t, t + 0.25, perc(t, vel, 0.18, bus, 0.002));
        o.frequency.exponentialRampToValueAtTime(1900, t + 0.08);
      },
      // ตันปุระ: สายดีดยาว มีเสียงซ่าของสะพาน (ชวารี)
      tanpura(t, m, vel) {
        const f = filt('lowpass', 1800, 0.8);
        osc('sawtooth', mtof(m), t, t + 2.6, perc(t, vel, 2.3, f, 0.01));
        osc('sawtooth', mtof(m) * 1.003, t, t + 2.6, perc(t, vel * 0.6, 2.3, f, 0.01));
        noise(t, t + 0.3, perc(t, vel * 0.25, 0.25, filt('bandpass', mtof(m) * 6, 6), 0.01));
      },
      // ซิตาร์: ดีดแล้วรูดโน้ตขึ้น (มีนด์) + สั่นเสียง + สายก้อง
      sitar(t, m, vel, decay = 1.4) {
        const f = filt('bandpass', mtof(m) * 3, 0.9);
        const o = osc('sawtooth', mtof(m - 1), t, t + decay + 0.2, perc(t, vel, decay, f, 0.002));
        o.frequency.exponentialRampToValueAtTime(mtof(m), t + 0.09);
        vibrato(o, t, mtof(m), 0.006, 6, 0.4, t + decay + 0.2);
        osc('triangle', mtof(m), t, t + decay, perc(t, vel * 0.6, decay * 0.8, filt('lowpass', 2500), 0.002));
        osc('sine', mtof(m + 12) * 1.002, t, t + decay, perc(t, vel * 0.12, decay, bus, 0.01));
      },
      // ตับลา: dha (ทุ้ม+แหลม) • na/tin (แหลมก้อง) • ta (ทุ้มสั้น)
      tabla(t, kind, vel) {
        if (kind === 'dha' || kind === 'ta') {
          const o = osc('sine', kind === 'dha' ? 95 : 150, t, t + 0.5, perc(t, vel, kind === 'dha' ? 0.4 : 0.2));
          o.frequency.exponentialRampToValueAtTime(kind === 'dha' ? 70 : 110, t + 0.2);
        }
        if (kind !== 'ta') {
          const f0 = kind === 'tin' ? 720 : 520;
          osc('sine', f0, t, t + 0.4, perc(t, vel * 0.55, kind === 'tin' ? 0.35 : 0.12, bus, 0.001));
          osc('sine', f0 * 2.03, t, t + 0.15, perc(t, vel * 0.2, 0.08, bus, 0.001));
        }
        noise(t, t + 0.03, perc(t, vel * 0.35, 0.02, filt('bandpass', 3000, 1), 0.001));
      },
      // ฮาร์ป: ดีดใส ๆ ก้องยาว
      harp(t, m, vel) {
        const f = filt('lowpass', 3800);
        osc('triangle', mtof(m), t, t + 1.6, perc(t, vel, 1.4, f, 0.002));
        osc('sine', mtof(m) * 2, t, t + 0.6, perc(t, vel * 0.25, 0.5, f, 0.002));
      },
      // เครื่องสายวงออร์เคสตรา: ค่อย ๆ ดังขึ้น สั่นเสียงนิด ๆ
      strings(t, notes, dur, vol) {
        const f = filt('lowpass', 1500, 0.6);
        const a = Math.min(1.6, dur * 0.4);
        const g = vca(t, a, vol / Math.sqrt(notes.length), Math.max(0.05, dur - a - 0.2), 1.6, f);
        for (const m of notes) {
          const o = osc('sawtooth', mtof(m), t, t + dur + 1.8, g, -6);
          vibrato(o, t, mtof(m), 0.004, 5.2, 0.5, t + dur + 1.8);
          osc('sawtooth', mtof(m), t, t + dur + 1.8, g, 7);
        }
      },
      // เอ้อหู: ซอจีน สีเลื่อนเข้าโน้ต สั่นเสียงกว้าง
      erhu(t, m, dur, vel) {
        const f = filt('lowpass', 2400, 0.9);
        const hold = Math.max(0.05, dur - 0.12);
        const o = osc('sawtooth', mtof(m) * 0.985, t, t + dur + 0.4, vca(t, 0.09, vel, hold, 0.25, f));
        o.frequency.exponentialRampToValueAtTime(mtof(m), t + 0.1);
        vibrato(o, t, mtof(m), 0.011, 5.8, 0.25, t + dur + 0.4);
        osc('triangle', mtof(m + 12), t, t + dur + 0.4, vca(t, 0.09, vel * 0.15, hold, 0.25, f));
      },
      // ฉาบจีน (เปิดยาว / ตบสั้น)
      cymbal(t, vel, short = false) {
        noise(t, t + (short ? 0.25 : 1.4), perc(t, vel, short ? 0.18 : 1.1, filt('highpass', 5200), 0.002));
        noise(t, t + 0.3, perc(t, vel * 0.6, 0.2, filt('bandpass', 3200, 1.5), 0.002));
      },
      // กลองใหญ่ (กลองเชิดสิงโต)
      bigdrum(t, vel) {
        const o = osc('sine', 85, t, t + 0.6, perc(t, vel, 0.45));
        o.frequency.exponentialRampToValueAtTime(48, t + 0.3);
        noise(t, t + 0.06, perc(t, vel * 0.35, 0.05, filt('lowpass', 900), 0.001));
      },
      chirp(t, vel = 0.018) {
        const n = 2 + Math.floor(Math.random() * 3);
        const base = rand(2600, 3400);
        for (let i = 0; i < n; i++) {
          const tt = t + i * 0.13;
          const o = osc('sine', base, tt, tt + 0.1, perc(tt, vel, 0.07, bus, 0.005));
          o.frequency.exponentialRampToValueAtTime(base * 1.45, tt + 0.07);
        }
      },
      // นกเขาขัน "ครู่ ครู้ ครู่" เบา ๆ
      coo(t) {
        const f0 = rand(330, 380);
        const f = filt('lowpass', 900, 0.7);
        [[0, 0.32, 1], [0.42, 0.62, 1.06], [1.15, 0.38, 0.97]].forEach(([d, len, k]) => {
          const tt = t + d;
          const o = osc('sine', f0 * k, tt, tt + len + 0.1, vca(tt, 0.06, 0.05, len - 0.14, 0.12, f));
          o.frequency.linearRampToValueAtTime(f0 * k * 0.9, tt + len);
          vibrato(o, tt, f0, 0.012, 7, 0.05, tt + len + 0.1);
        });
      },
    };

    // ---- เสียงบรรยากาศต่อเนื่อง (ลม / น้ำ)
    let bed = null;
    function startBed(kind) {
      stopBed();
      if (!kind) return;
      const t = ctx.currentTime;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(kind === 'wind' ? 0.05 : 0.035, t + 3);
      const f = ctx.createBiquadFilter();
      f.type = kind === 'wind' ? 'bandpass' : 'lowpass';
      f.frequency.value = kind === 'wind' ? 500 : 380;
      f.Q.value = kind === 'wind' ? 1.5 : 0.5;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = kind === 'wind' ? 0.09 : 0.23;
      const lg = ctx.createGain();
      lg.gain.value = kind === 'wind' ? 300 : 120;
      lfo.connect(lg).connect(f.frequency);
      const src = noise(t, t + 36000, f);
      f.connect(g).connect(comp);
      lfo.start(t);
      bed = { g, src, lfo };
    }
    function stopBed() {
      if (!bed) return;
      const b = bed;
      bed = null;
      const t = ctx.currentTime;
      b.g.gain.cancelScheduledValues(t);
      b.g.gain.setTargetAtTime(0.0001, t, 0.4);
      try {
        b.src.stop(t + 2);
        b.lfo.stop(t + 2);
      } catch {}
    }

    // ---- แต่งทำนอง: วลีละ 2 ห้อง เดินทีละขั้นในสเกล ลงโน้ตในคอร์ดตอนจังหวะหนัก
    function poolOf(st) {
      const p = [];
      for (let m = st.melLo; m <= st.melHi; m++) if (st.scale.includes(mod12(m - st.root))) p.push(m);
      return p;
    }
    let lastIdx = null;
    function phrase(st, chords, cadence) {
      const pool = poolOf(st);
      const isChordTone = (m, ch) => ch.some((x) => mod12(x) === mod12(m - st.root));
      const toChord = (i, ch) => {
        for (let d = 0; d < pool.length; d++) {
          for (const j of [i - d, i + d]) if (j >= 0 && j < pool.length && isChordTone(pool[j], ch)) return j;
        }
        return i;
      };
      let idx = lastIdx ?? Math.floor(pool.length / 2);
      const notes = [];
      for (let s = 0; s < 32; s++) {
        const p = st.rhythm[s % 16];
        if (!chance(p)) continue;
        const ch = chords[s >> 4];
        idx = clamp(idx + pick([-2, -1, -1, -1, 0, 1, 1, 1, 2, -3, 3]), 0, pool.length - 1);
        // อย่าลอยไปขอบเสียงนานเกิน
        if (idx < 2) idx += 2;
        if (idx > pool.length - 3) idx -= 2;
        if (s % 8 === 0) idx = toChord(idx, ch);
        notes.push({ s, m: pool[idx] });
      }
      if (!notes.length) notes.push({ s: 0, m: pool[toChord(idx, chords[0])] });
      if (cadence) {
        const last = notes[notes.length - 1];
        // จบวลีที่โน้ตรากคอร์ด (ตัวที่ใกล้ที่สุด)
        const ch = chords[1];
        const roots = pool.filter((m) => mod12(m - st.root - ch[0]) === 0);
        if (roots.length) last.m = roots.reduce((a, b) => (Math.abs(b - last.m) < Math.abs(a - last.m) ? b : a));
      }
      lastIdx = idx;
      notes.forEach((n, i) => (n.len = Math.min((notes[i + 1]?.s ?? 32) - n.s, 8)));
      const by = {};
      for (const n of notes) by[n.s] = n;
      return by;
    }
    function varied(by) {
      // ท่อนซ้ำแต่เปลี่ยนท้ายวลีนิดหน่อย
      const copy = {};
      const keys = Object.keys(by).map(Number).sort((a, b) => a - b);
      keys.forEach((k, i) => {
        copy[k] = { ...by[k] };
        if (i >= keys.length - 2 && chance(0.7)) copy[k].m = by[k].m + pick([-2, 2, -3, 3, -5]);
      });
      return copy;
    }

    // ---- ตัวจับจังหวะ
    let st = null, styleId = null, bpm = 0;
    let enabled = false, volume = 0.35, running = false;
    let nextT = 0, step = 0, bar = 0, timer = null;
    let section = null, sectionN = 0, hook = null;

    const spb = () => 60 / (bpm || st.bpm) / 4;
    const S = {
      get spb() {
        return spb();
      },
      get barDur() {
        return spb() * 16;
      },
      get root() {
        return st.root;
      },
      notes: (ch, oct) => ch.map((x) => st.root + x + oct),
      pool(from, n) {
        const out = [];
        for (let m = from; out.length < n && m < from + 48; m++) if (st.scale.includes(mod12(m - st.root))) out.push(m);
        return out;
      },
    };

    function newSection() {
      const L = st.chords.length;
      const c = (i) => st.chords[(bar + i) % L];
      const A = hook && chance(0.6) ? hook : phrase(st, [c(0), c(1)], false);
      hook = A;
      sectionN++;
      section = {
        // ทุก ๆ ท่อนที่ 3 ทำนองพัก ให้เหลือแต่ดนตรีคลอ จะได้ไม่น่ารำคาญ
        melOn: sectionN % 3 !== 0,
        phr: [A, phrase(st, [c(2), c(3)], false), varied(A), phrase(st, [c(6), c(7)], true)],
      };
    }

    function schedule(t) {
      const ch = st.chords[bar % st.chords.length];
      const tt = st.swing && step % 4 === 2 ? t + st.swing * spb() : t;
      try {
        if (step === 0) {
          if (bar % 8 === 0) newSection();
          st.bar(I, t, ch, bar, S);
        }
        st.step(I, tt, step, ch, bar, S);
        if (section.melOn) {
          const n = section.phr[(bar % 8) >> 1][(bar % 2) * 16 + step];
          if (n) st.mel(I, tt, n.m, n.len * spb(), S);
        }
      } catch (e) {
        console.warn('[music]', e);
      }
      if (++step === 16) {
        step = 0;
        bar++;
      }
    }
    function tick() {
      if (!st) return;
      const ct = ctx.currentTime;
      if (nextT < ct - 0.2) nextT = ct + 0.05; // เครื่องค้าง/แท็บหลับ: เริ่มใหม่จากตอนนี้ ไม่ยิงโน้ตรัว
      const ahead = document.hidden ? 1.5 : 0.3;
      while (nextT < ct + ahead) {
        schedule(nextT);
        nextT += spb();
      }
    }
    function startClock() {
      if (running) return;
      running = true;
      nextT = ctx.currentTime + 0.1;
      step = 0;
      bar = 0;
      timer = setInterval(tick, 50);
      startBed(st.bed);
    }
    function stopClock() {
      running = false;
      clearInterval(timer);
      stopBed();
    }
    function applyGain(fade = 1.2) {
      const t = ctx.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setTargetAtTime(enabled ? volume * (st?.gain ?? 1) : 0, t, fade / 3);
    }

    return {
      STYLES,
      // set({ style, volume, enabled, bpm })
      set(o = {}) {
        if ('volume' in o) volume = clamp(Number(o.volume) || 0, 0, 1);
        if ('bpm' in o) bpm = Number(o.bpm) > 30 ? Number(o.bpm) : 0;
        const id = STYLES[o.style] ? o.style : styleId || 'concert';
        if (id !== styleId) {
          const was = running;
          styleId = id;
          if (was) {
            // เปลี่ยนสไตล์: ค่อย ๆ เบาลงแล้วเริ่มสไตล์ใหม่
            const t = ctx.currentTime;
            out.gain.cancelScheduledValues(t);
            out.gain.setTargetAtTime(0, t, 0.15);
            clearTimeout(this._sw);
            this._sw = setTimeout(() => {
              stopClock();
              st = STYLES[styleId];
              hook = null;
              sectionN = 0;
              if (enabled) startClock();
              applyGain(2);
            }, 600);
          } else st = STYLES[styleId];
          hook = null;
        }
        if ('enabled' in o) enabled = !!o.enabled;
        if (enabled && !running && st) startClock();
        if (!enabled && running) setTimeout(() => !enabled && stopClock(), 1500);
        applyGain();
      },
      duck(on) {
        const t = ctx.currentTime;
        duckG.gain.cancelScheduledValues(t);
        duckG.gain.setTargetAtTime(on ? 0.35 : 1, t, on ? 0.08 : 0.5);
      },
      get style() {
        return styleId;
      },
      get playing() {
        return running && enabled;
      },
      reverb(v) {
        verbSend.gain.value = v;
      },
      // ใช้ทดสอบกับ OfflineAudioContext: วางโน้ตล่วงหน้าจนถึงเวลา sec
      _fill(sec) {
        while (st && nextT < sec) {
          schedule(nextT);
          nextT += spb();
        }
      },
      _out: out,
    };
  }

  // ปรับระดับเสียงก้องตามสไตล์ (ห่อ create ไว้)
  window.StageMusic = {
    STYLES,
    has: (id) => !!STYLES[id],
    list: () => Object.entries(STYLES).map(([id, s]) => ({ id, name: s.name })),
    create(ctx, dest) {
      const m = create(ctx, dest);
      const set = m.set.bind(m);
      m.set = (o) => {
        set(o);
        const s = STYLES[m.style];
        if (s) m.reverb(s.verb ?? 0.3);
      };
      return m;
    },
  };
})();
