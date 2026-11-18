/* ตัวละคร 3D (VRM) บนหน้าเวที — v2
 * - แสงตามธีม + ขอบเรืองแสง (rim) + เงาใต้เท้า + ขอบภาพเนียน (render ละเอียดกว่าจอ)
 * - ขยับว่าง ๆ: หายใจ ถ่ายน้ำหนักขา กะพริบตา ตากลอกเล็ก ๆ, ท่าว่างสุ่ม (เอียงคอ จับผม บิดขี้เกียจ ชูสองนิ้ว ฯลฯ), เดินเล่นซ้าย-ขวา
 * - นิ้วมือ: ผ่อนคลาย กำมือ ชูสองนิ้ว มือแบ (ไหว้)
 * - ท่าทาง: wave wai bow clap happy heart think kiss surprised peace shy dance spin scared splash cheer
 * - ท่าจากไฟล์ mocap: .vrma (VRM Animation) และ .fbx (Mixamo) — ผสมกับท่าในโค้ดได้นุ่ม ๆ
 * - ปากขยับตามเสียง (เสียงพูดอัตโนมัติ / ไมค์จากหลังบ้าน)
 * ใช้ผ่าน window.StageAvatar (stage.js เรียก)
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as VRMLIB from '@pixiv/three-vrm';
import { OUTFITS, PERSONAS, THEME_MODEL, THEME_LAYOUT, HALF_LAYOUT, applyOutfit, outlineProps } from './avatar-outfits.js';

const { VRMLoaderPlugin, VRMUtils } = VRMLIB;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const bell = (t, a, b) => Math.sin(clamp((t - a) / (b - a), 0, 1) * Math.PI); // 0 → 1 → 0 ระหว่าง a..b

// ---------------------------------------------------------------- แสงของแต่ละธีม
const LIGHTS = {
  concert: { key: 0xfff4fb, keyI: 2.2, fill: 0xb8a0ff, fillI: 0.9, rim: 0xff4fa3, amb: 0.65, dyn: [0xff4fa3, 0x39d5ff, 0xffd23f, 0x8b5cff] },
  shrine: { key: 0xfff2e0, keyI: 2.3, fill: 0xffc890, fillI: 0.6, rim: 0xffc860, amb: 0.72 },
  krathong: { key: 0xdfe8ff, keyI: 2.0, fill: 0xffb070, fillI: 0.8, rim: 0x9fc0ff, amb: 0.6 },
  fishing: { key: 0xffd9b0, keyI: 2.4, fill: 0xffa070, fillI: 0.7, rim: 0xff9a50, amb: 0.7 },
  songkran: { key: 0xffffff, keyI: 2.6, fill: 0xbfe8ff, fillI: 0.8, rim: 0x7fd8ff, amb: 0.85 },
  cny: { key: 0xffe0c0, keyI: 2.3, fill: 0xff7050, fillI: 0.8, rim: 0xffc040, amb: 0.6 },
  ghost: { key: 0xc8d8ff, keyI: 1.8, fill: 0x60ffb0, fillI: 0.6, rim: 0x7fffd0, amb: 0.5 },
  newyear: { key: 0xfff6e8, keyI: 2.3, fill: 0xffc0c0, fillI: 0.7, rim: 0xffe08a, amb: 0.7 },
};

// ---------------------------------------------------------------- ท่าพัก
// มุม (เรเดียน) ของกระดูก humanoid แบบ normalized: [x, y, z] — โมเดลหันหน้าเข้ากล้อง (+Z), แขนซ้ายตัวละคร = ฝั่ง +X
const REST = {
  leftUpperArm: [0, 0, -1.22],
  rightUpperArm: [0, 0, 1.22],
  leftLowerArm: [0, -0.18, 0],
  rightLowerArm: [0, 0.18, 0],
  leftHand: [0, 0, -0.1],
  rightHand: [0, 0, 0.1],
};

// ---------------------------------------------------------------- รูปมือ (นิ้ว)
// f = มุมงอ [โคน, กลาง, ปลาย] ของนิ้วชี้-ก้อย, thumb = [โคน, กลาง, ปลาย], open = นิ้วที่เหยียด, spread = กางนิ้ว
const HANDS = {
  relax: { f: [0.25, 0.3, 0.2], thumb: [0.15, 0.2, 0.1] },
  flat: { f: [0.05, 0.05, 0.03], thumb: [0, 0.05, 0] },
  fist: { f: [1.35, 1.5, 1.1], thumb: [0.45, 0.5, 0.6] },
  peace: { f: [1.35, 1.5, 1.1], thumb: [0.45, 0.5, 0.6], open: ['index', 'middle'], spread: 0.18 },
  point: { f: [1.35, 1.5, 1.1], thumb: [0.45, 0.5, 0.6], open: ['index'] },
  open: { f: [0, 0, 0], thumb: [-0.1, 0, 0], spread: 0.12 },
};
const FINGERS = ['Index', 'Middle', 'Ring', 'Little'];

// ---------------------------------------------------------------- ท่าทาง
// dur (วิ), expr (สีหน้า), hands {left, right}, pose(t, beats) → มุมกระดูก, hop → กระโดด (เมตร), spin → หมุนตัว (เรเดียน)
const POSES = {
  wave: {
    dur: 2.6,
    expr: { happy: 0.8 },
    hands: { right: 'open' },
    pose: (t) => ({
      rightUpperArm: [0, 0.25, -0.15],
      rightLowerArm: [0, 0.35, -1.35 + Math.sin(t * 9) * 0.38],
      rightHand: [0, 0, -0.2 + Math.sin(t * 9 + 0.6) * 0.2],
      head: [0.04, -0.12, -0.12 + Math.sin(t * 4.5) * 0.04],
      spine: [0, 0, -0.04],
    }),
  },
  wai: {
    dur: 2.8,
    expr: { relaxed: 0.9 },
    hands: { left: 'flat', right: 'flat' },
    pose: (t) => {
      const bow = bell(t, 0.5, 2.1) * 0.32;
      return {
        // พนมมือระดับคาง (ปรับจากการดูภาพจริง)
        leftUpperArm: [-0.45, -0.83, -0.95],
        rightUpperArm: [-0.45, 0.83, 0.95],
        leftLowerArm: [0, -1.78, 0.1],
        rightLowerArm: [0, 1.78, -0.1],
        leftHand: [0, 0.4, 1.0],
        rightHand: [0, -0.4, -1.0],
        spine: [bow * 0.5, 0, 0],
        chest: [bow * 0.4, 0, 0],
        head: [0.12 + bow * 0.6, 0, 0],
      };
    },
  },
  bow: {
    dur: 2.4,
    expr: { happy: 0.6 },
    hands: { left: 'flat', right: 'flat' },
    pose: (t) => {
      const b = bell(t, 0.3, 2.0);
      return {
        leftUpperArm: [0.15, -0.35, -1.25],
        rightUpperArm: [0.15, 0.35, 1.25],
        leftLowerArm: [0, -0.7, 0],
        rightLowerArm: [0, 0.7, 0],
        spine: [b * 0.35, 0, 0],
        chest: [b * 0.25, 0, 0],
        head: [b * 0.25, 0, 0],
      };
    },
  },
  clap: {
    dur: 2.4,
    expr: { happy: 1 },
    hands: { left: 'flat', right: 'flat' },
    pose: (t) => {
      const c = (Math.sin(t * 14) + 1) / 2;
      return {
        leftUpperArm: [0.2, -0.85, -1.0],
        rightUpperArm: [0.2, 0.85, 1.0],
        leftLowerArm: [0, -1.25 - c * 0.3, 0.1],
        rightLowerArm: [0, 1.25 + c * 0.3, -0.1],
        leftHand: [0, -0.2, 0.3],
        rightHand: [0, 0.2, -0.3],
        head: [Math.sin(t * 7) * 0.05, 0, 0],
      };
    },
  },
  happy: {
    dur: 2.4,
    expr: { happy: 1 },
    hands: { left: 'open', right: 'open' },
    hop: (t) => Math.max(0, Math.sin(t * Math.PI * 2.5)) * 0.05 * (1 - t / 2.4),
    pose: (t) => {
      const sway = Math.sin(t * 7) * 0.12;
      return {
        leftUpperArm: [0, 0, 0.75 + sway],
        rightUpperArm: [0, 0, -0.75 + sway],
        leftLowerArm: [0, 0, 0.3],
        rightLowerArm: [0, 0, -0.3],
        head: [-0.1, 0, sway * 0.5],
        spine: [-0.05, 0, sway * 0.3],
      };
    },
  },
  heart: {
    dur: 2.8,
    expr: { happy: 0.9 },
    hands: { left: 'relax', right: 'relax' },
    pose: (t) => ({
      leftUpperArm: [0, 0.15, 1.7],
      rightUpperArm: [0, -0.15, -1.7],
      leftLowerArm: [0, 0, 1.45],
      rightLowerArm: [0, 0, -1.45],
      leftHand: [0, 0, 0.4],
      rightHand: [0, 0, -0.4],
      head: [0, 0, Math.sin(t * 3) * 0.12],
      spine: [0, 0, Math.sin(t * 3) * 0.04],
    }),
  },
  think: {
    dur: 2.6,
    expr: { neutral: 0.5 },
    hands: { right: 'point' },
    pose: (t) => ({
      rightUpperArm: [-0.4, 0.9, 1.0],
      rightLowerArm: [0, 2.15, -0.15],
      rightHand: [0, -0.3, -0.9],
      head: [0.05, 0.1, 0.18 + Math.sin(t * 2) * 0.04],
    }),
  },
  // ส่งจูบ: มือแตะปาก แล้วส่งออกไป + ขยิบตา
  kiss: {
    dur: 2.6,
    expr: { happy: 0.7 },
    wink: (t) => bell(t, 0.9, 2.2),
    hands: { right: 'flat' },
    pose: (t) => {
      const out = ease(clamp((t - 0.9) / 0.5, 0, 1));
      return {
        rightUpperArm: [-0.4 + out * 0.2, 0.9 - out * 0.7, 1.0 - out * 0.9],
        rightLowerArm: [0, 2.15 - out * 1.6, -0.15],
        rightHand: [0, -0.3, -0.9 + out * 0.6],
        head: [0.05 - out * 0.08, 0.1, 0.15],
        spine: [0, 0, 0.04],
      };
    },
  },
  // ตกใจดีใจ: มือแนบแก้ม กระโดดถอย
  surprised: {
    dur: 2.4,
    expr: { surprised: 1 },
    hands: { left: 'open', right: 'open' },
    hop: (t) => bell(t, 0, 0.35) * 0.04,
    pose: (t) => ({
      leftUpperArm: [-0.5, -0.75, -0.85],
      rightUpperArm: [-0.5, 0.75, 0.85],
      leftLowerArm: [0, -2.25, 0.2],
      rightLowerArm: [0, 2.25, -0.2],
      leftHand: [0, 0.3, 0.8],
      rightHand: [0, -0.3, -0.8],
      head: [-0.12, 0, Math.sin(t * 6) * 0.06],
      spine: [-0.08, 0, 0],
    }),
  },
  // ชูสองนิ้วข้างหน้า + เอียงคอ
  peace: {
    dur: 2.6,
    expr: { happy: 1 },
    hands: { right: 'peace' },
    pose: () => ({
      rightUpperArm: [-0.3, 0.6, 0.55],
      rightLowerArm: [0, 1.7, -0.5],
      rightHand: [0, -0.2, -0.6],
      head: [0, 0.05, 0.22],
      spine: [0, 0, 0.05],
    }),
  },
  // เขิน: มือประสานข้างหน้า ก้มหน้า
  shy: {
    dur: 2.6,
    expr: { happy: 0.6, relaxed: 0.4 },
    hands: { left: 'relax', right: 'relax' },
    pose: (t) => ({
      leftUpperArm: [0.2, -0.45, -1.2],
      rightUpperArm: [0.2, 0.45, 1.2],
      leftLowerArm: [0, -1.1, 0],
      rightLowerArm: [0, 1.1, 0],
      head: [0.25, Math.sin(t * 2) * 0.12, 0.12],
      spine: [0.05, 0, 0],
    }),
  },
  // เต้น: ตามจังหวะ (bpm ของดนตรีพื้นหลัง/ธีม)
  dance: {
    dur: 6,
    expr: { happy: 1 },
    hands: { left: 'fist', right: 'fist' },
    hop: (t, b) => Math.abs(Math.sin(b * Math.PI)) * 0.025,
    pose: (t, b) => {
      const s = Math.sin(b * Math.PI); // -1..1 ทุกจังหวะ
      const side = Math.sin(b * Math.PI * 0.5);
      const phase = Math.floor(b / 8) % 2; // เปลี่ยนท่าทุก 8 จังหวะ
      if (phase === 0)
        return {
          hips: [0, side * 0.25, s * 0.06],
          spine: [0, -side * 0.15, -s * 0.06],
          leftUpperArm: [0, 0, -0.6 + Math.max(0, s) * 1.6],
          rightUpperArm: [0, 0, 0.6 - Math.max(0, -s) * 1.6],
          leftLowerArm: [0, -0.9, 0],
          rightLowerArm: [0, 0.9, 0],
          head: [Math.abs(s) * 0.08, side * 0.1, s * 0.08],
          leftUpperLeg: [-Math.max(0, s) * 0.25, 0, 0],
          rightUpperLeg: [-Math.max(0, -s) * 0.25, 0, 0],
          leftLowerLeg: [Math.max(0, s) * 0.4, 0, 0],
          rightLowerLeg: [Math.max(0, -s) * 0.4, 0, 0],
        };
      return {
        hips: [0, 0, s * 0.08],
        spine: [0, 0, -s * 0.1],
        leftUpperArm: [-0.3, -0.6, -0.4 + s * 0.3],
        rightUpperArm: [-0.3, 0.6, 0.4 + s * 0.3],
        leftLowerArm: [0, -1.4 + Math.abs(s) * 0.4, 0],
        rightLowerArm: [0, 1.4 - Math.abs(s) * 0.4, 0],
        head: [Math.abs(s) * 0.1, 0, -s * 0.1],
        leftUpperLeg: [0, 0, s > 0 ? 0.08 : 0],
        rightUpperLeg: [0, 0, s < 0 ? -0.08 : 0],
      };
    },
  },
  spin: {
    dur: 1.8,
    expr: { happy: 1 },
    hands: { left: 'open', right: 'open' },
    spin: (t) => ease(clamp((t - 0.2) / 1.2, 0, 1)) * Math.PI * 2,
    hop: (t) => bell(t, 0.2, 1.4) * 0.03,
    pose: () => ({
      leftUpperArm: [0, 0, -0.25],
      rightUpperArm: [0, 0, 0.25],
      leftLowerArm: [0, -0.3, 0],
      rightLowerArm: [0, 0.3, 0],
      head: [-0.1, 0, 0],
    }),
  },
  // ธีมบ้านผีสิง: ตกใจกลัว ตัวสั่น
  scared: {
    dur: 2.4,
    expr: { surprised: 0.8, sad: 0.3 },
    hands: { left: 'fist', right: 'fist' },
    pose: (t) => {
      const sh = Math.sin(t * 40) * 0.03;
      return {
        leftUpperArm: [-0.3, -0.8, -0.9],
        rightUpperArm: [-0.3, 0.8, 0.9],
        leftLowerArm: [0, -2.1, 0.3],
        rightLowerArm: [0, 2.1, -0.3],
        head: [0.15, sh * 3, sh * 2],
        spine: [0.1, sh, 0],
      };
    },
  },
  // ธีมสงกรานต์: สาดน้ำ
  splash: {
    dur: 2.0,
    expr: { happy: 1 },
    hands: { left: 'open', right: 'open' },
    pose: (t) => {
      const back = bell(t, 0, 0.6);
      const fwd = ease(clamp((t - 0.6) / 0.25, 0, 1)) * (1 - clamp((t - 1.4) / 0.5, 0, 1));
      return {
        leftUpperArm: [0.4 - fwd * 1.6, -0.3, -1.0 + back * 0.4],
        rightUpperArm: [0.4 - fwd * 1.6, 0.3, 1.0 - back * 0.4],
        leftLowerArm: [0, -0.6 + fwd * 0.5, 0],
        rightLowerArm: [0, 0.6 - fwd * 0.5, 0],
        spine: [back * 0.15 - fwd * 0.1, 0, 0],
        head: [-fwd * 0.1, 0, 0],
      };
    },
  },
  // ธีมปีใหม่: ชูกำปั้นเชียร์
  cheer: {
    dur: 2.4,
    expr: { happy: 1 },
    hands: { right: 'fist', left: 'fist' },
    hop: (t) => Math.max(0, Math.sin(t * Math.PI * 3)) * 0.03,
    pose: (t) => {
      const p = Math.max(0, Math.sin(t * Math.PI * 3));
      return {
        rightUpperArm: [0, 0, -1.1 - p * 0.5],
        rightLowerArm: [0, 0, -0.6 + p * 0.5],
        leftUpperArm: [0.2, -0.5, -1.0],
        leftLowerArm: [0, -1.6, 0],
        head: [-0.12, 0, 0.05],
      };
    },
  },
  // พยักหน้ารับ (สุขุม)
  nod: {
    dur: 1.8,
    expr: { relaxed: 0.8 },
    pose: (t) => ({ head: [Math.max(0, Math.sin(t * 7)) * 0.22 * bell(t, 0, 1.8), 0, 0], neck: [Math.max(0, Math.sin(t * 7)) * 0.06, 0, 0] }),
  },
  // ให้พร: ยกมือขวาแบตั้งระดับอก พยักหน้า
  bless: {
    dur: 3.0,
    expr: { relaxed: 1 },
    hands: { right: 'flat' },
    pose: (t) => {
      const w = bell(t, 0.6, 2.6);
      return {
        rightUpperArm: [-0.55, 0.5, 0.8],
        rightLowerArm: [0, 1.45, -0.35],
        rightHand: [0, -0.2, -1.0],
        head: [0.08 + w * 0.12, 0.08, 0.05],
      };
    },
  },
  // ---------- ท่าว่าง (เล่นเองตอนไม่มีอะไร) ----------
  idleTilt: {
    dur: 2.4,
    idle: true,
    expr: { happy: 0.5 },
    pose: (t) => ({ head: [0, 0.1, 0.28 * bell(t, 0, 2.4)], spine: [0, 0, 0.05 * bell(t, 0, 2.4)] }),
  },
  idleHair: {
    dur: 3.0,
    idle: true,
    expr: { relaxed: 0.6 },
    hands: { right: 'relax' },
    pose: (t) => {
      const w = bell(t, 0, 3.0);
      // แขนยกด้านข้าง ศอกออก มือแตะผมข้างหู (ปรับจากการดูภาพจริง)
      return {
        rightUpperArm: [0, 0.55, 1.22 - w * 1.95],
        rightLowerArm: [0, 0.18 + w * 0.5, -w * 2.1],
        rightHand: [0, 0, -w * 0.4],
        head: [0, 0, -w * 0.14],
      };
    },
  },
  idleStretch: {
    dur: 3.4,
    idle: true,
    expr: { relaxed: 0.8 },
    hands: { left: 'open', right: 'open' },
    pose: (t) => {
      const w = bell(t, 0, 3.4);
      return {
        leftUpperArm: [0, 0, -1.22 + w * 2.95],
        rightUpperArm: [0, 0, 1.22 - w * 2.95],
        leftLowerArm: [0, 0, w * 0.4],
        rightLowerArm: [0, 0, -w * 0.4],
        spine: [-w * 0.12, 0, Math.sin(t * 1.8) * 0.06 * w],
        head: [-w * 0.15, 0, 0],
      };
    },
  },
  idlePeace: {
    dur: 2.4,
    idle: true,
    expr: { happy: 1 },
    hands: { right: 'peace' },
    pose: () => ({ rightUpperArm: [-0.3, 0.6, 0.55], rightLowerArm: [0, 1.7, -0.5], rightHand: [0, -0.2, -0.6], head: [0, 0.05, 0.22] }),
  },
  idleLook: {
    dur: 3.4,
    idle: true,
    expr: {},
    look: (t) => (t < 1.6 ? -0.8 : 0.8),
    pose: () => ({}),
  },
};
const IDLE_POOL = ['idleTilt', 'idleHair', 'idleStretch', 'idlePeace', 'idleLook', 'idleTilt'];
const THEME_IDLE = { ghost: ['scared'], songkran: ['splash'], newyear: ['cheer'], concert: ['dance'], shrine: ['wai'] };

// เหตุการณ์ → ท่า (แก้ได้ในหลังบ้าน: ชื่อท่า หรือ file:ชื่อไฟล์ mocap)
const DEFAULT_MAP = { join: 'wave', giftS: 'heart', giftM: 'clap', giftL: 'surprised', giftXL: 'dance', follow: 'bow', win: 'clap', game: 'think', big: 'dance', regular: 'bow', hello: 'wave', laugh: 'happy', love: 'heart' };
const THEME_MAP = {
  shrine: { giftS: 'wai', follow: 'wai' },
  krathong: { giftS: 'wai', follow: 'wai' },
  songkran: { giftM: 'splash' },
  ghost: { giftS: 'shy', game: 'scared' },
  newyear: { giftM: 'cheer' },
};

// ---------------------------------------------------------------- Mixamo → VRM
const MIXAMO = {
  mixamorigHips: 'hips', mixamorigSpine: 'spine', mixamorigSpine1: 'chest', mixamorigSpine2: 'upperChest', mixamorigNeck: 'neck', mixamorigHead: 'head',
  mixamorigLeftShoulder: 'leftShoulder', mixamorigLeftArm: 'leftUpperArm', mixamorigLeftForeArm: 'leftLowerArm', mixamorigLeftHand: 'leftHand',
  mixamorigLeftHandThumb1: 'leftThumbMetacarpal', mixamorigLeftHandThumb2: 'leftThumbProximal', mixamorigLeftHandThumb3: 'leftThumbDistal',
  mixamorigLeftHandIndex1: 'leftIndexProximal', mixamorigLeftHandIndex2: 'leftIndexIntermediate', mixamorigLeftHandIndex3: 'leftIndexDistal',
  mixamorigLeftHandMiddle1: 'leftMiddleProximal', mixamorigLeftHandMiddle2: 'leftMiddleIntermediate', mixamorigLeftHandMiddle3: 'leftMiddleDistal',
  mixamorigLeftHandRing1: 'leftRingProximal', mixamorigLeftHandRing2: 'leftRingIntermediate', mixamorigLeftHandRing3: 'leftRingDistal',
  mixamorigLeftHandPinky1: 'leftLittleProximal', mixamorigLeftHandPinky2: 'leftLittleIntermediate', mixamorigLeftHandPinky3: 'leftLittleDistal',
  mixamorigRightShoulder: 'rightShoulder', mixamorigRightArm: 'rightUpperArm', mixamorigRightForeArm: 'rightLowerArm', mixamorigRightHand: 'rightHand',
  mixamorigRightHandPinky1: 'rightLittleProximal', mixamorigRightHandPinky2: 'rightLittleIntermediate', mixamorigRightHandPinky3: 'rightLittleDistal',
  mixamorigRightHandRing1: 'rightRingProximal', mixamorigRightHandRing2: 'rightRingIntermediate', mixamorigRightHandRing3: 'rightRingDistal',
  mixamorigRightHandMiddle1: 'rightMiddleProximal', mixamorigRightHandMiddle2: 'rightMiddleIntermediate', mixamorigRightHandMiddle3: 'rightMiddleDistal',
  mixamorigRightHandIndex1: 'rightIndexProximal', mixamorigRightHandIndex2: 'rightIndexIntermediate', mixamorigRightHandIndex3: 'rightIndexDistal',
  mixamorigRightHandThumb1: 'rightThumbMetacarpal', mixamorigRightHandThumb2: 'rightThumbProximal', mixamorigRightHandThumb3: 'rightThumbDistal',
  mixamorigLeftUpLeg: 'leftUpperLeg', mixamorigLeftLeg: 'leftLowerLeg', mixamorigLeftFoot: 'leftFoot', mixamorigLeftToeBase: 'leftToes',
  mixamorigRightUpLeg: 'rightUpperLeg', mixamorigRightLeg: 'rightLowerLeg', mixamorigRightFoot: 'rightFoot', mixamorigRightToeBase: 'rightToes',
};

async function loadMixamoClip(url, vrm) {
  const { FBXLoader } = await import('three/addons/loaders/FBXLoader.js');
  const asset = await new FBXLoader().loadAsync(url);
  const clip = THREE.AnimationClip.findByName(asset.animations, 'mixamo.com') || asset.animations[0];
  if (!clip) throw new Error('ไฟล์นี้ไม่มีท่าทาง');
  const tracks = [];
  const restInv = new THREE.Quaternion();
  const parentRest = new THREE.Quaternion();
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const hipsNode = asset.getObjectByName('mixamorigHips');
  const motionHipsH = hipsNode ? hipsNode.position.y : 1;
  const vrmHipsH = Math.abs(vrm.humanoid.getNormalizedBoneNode('hips').getWorldPosition(v).y - vrm.scene.getWorldPosition(new THREE.Vector3()).y);
  const scale = vrmHipsH / (motionHipsH || 1);
  const isV0 = vrm.meta?.metaVersion === '0';
  for (const track of clip.tracks) {
    const [rig, prop] = track.name.split('.');
    const node = vrm.humanoid.getNormalizedBoneNode(MIXAMO[rig]);
    const src = asset.getObjectByName(rig);
    if (!node || !src) continue;
    src.getWorldQuaternion(restInv).invert();
    src.parent.getWorldQuaternion(parentRest);
    if (track instanceof THREE.QuaternionKeyframeTrack) {
      const vals = Array.from(track.values);
      for (let i = 0; i < vals.length; i += 4) {
        q.fromArray(vals, i).premultiply(parentRest).multiply(restInv);
        q.toArray(vals, i);
      }
      tracks.push(new THREE.QuaternionKeyframeTrack(`${node.name}.${prop}`, track.times, vals.map((x, i) => (isV0 && i % 2 === 0 ? -x : x))));
    } else if (track instanceof THREE.VectorKeyframeTrack && MIXAMO[rig] === 'hips') {
      tracks.push(new THREE.VectorKeyframeTrack(`${node.name}.${prop}`, track.times, Array.from(track.values).map((x, i) => (isV0 && i % 3 !== 1 ? -x : x) * scale)));
    }
  }
  return new THREE.AnimationClip('mixamo', clip.duration, tracks);
}

async function loadVrmaClip(url, vrm) {
  const { VRMAnimationLoaderPlugin, createVRMAnimationClip } = await import('@pixiv/three-vrm-animation');
  const loader = new GLTFLoader();
  loader.register((p) => new VRMAnimationLoaderPlugin(p));
  const gltf = await loader.loadAsync(url);
  const anim = gltf.userData.vrmAnimations?.[0];
  if (!anim) throw new Error('ไฟล์นี้ไม่ใช่ .vrma');
  return createVRMAnimationClip(anim, vrm);
}

// ---------------------------------------------------------------- engine
class Avatar {
  constructor() {
    this.cfg = { enabled: false, x: 540, y: 1700, h: 780, theme: 'concert', map: {}, bpm: 112 };
    this.vrm = null;
    this.actions = []; // { name, t, dur, idle }
    this.queue = [];
    this.mouth = 0;
    this.mouthNow = 0;
    this.extMouth = 0;
    this.extMouthAt = 0;
    this.speaking = false;
    this.look = { x: 0, y: 0, until: 0 };
    this.saccade = { x: 0, y: 0, next: 0 };
    this.nextBlink = 2;
    this.blinkT = -1;
    this.nextIdle = 6;
    this.walk = { x: 0, target: 0, phase: 0, next: 18, dir: 0, amt: 0 };
    this.yaw = 0;
    this.clock = new THREE.Clock();
    this.lastFrame = 0;
    this.modelUrl = '';
    this.loading = false;
    this.fps = 30;
    this.clips = new Map(); // url → Promise<AnimationClip>
    this.clip = null; // { action, t, dur, name }
    this.persona = PERSONAS.young;
    this.outfitKey = null;
    this.dressed = null;
  }

  // back = อยู่ในฉาก (หลังกล่องข้อความ), front = อยู่หน้ากล่องข้อความ
  mount(scene, before, frontParent, frontBefore) {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'avatar';
    this.canvas.style.cssText = 'position:absolute;pointer-events:none;display:none;';
    this.slots = { back: [scene, before || null], front: [frontParent || scene, frontBefore || null] };
    scene.insertBefore(this.canvas, before || null);
    this.layer = 'back';
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
    this.canvas.style.imageRendering = 'auto'; // ย่อภาพแบบนุ่ม
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene3 = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(18, 1, 0.1, 40);
    this.key = new THREE.DirectionalLight(0xffffff, 2.3);
    this.key.position.set(0.6, 1.6, 2.2);
    this.fill = new THREE.DirectionalLight(0xffffff, 0.8);
    this.fill.position.set(-1.4, 0.6, 1);
    this.amb = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene3.add(this.key, this.fill, this.amb);
    this.lookTarget = new THREE.Object3D();
    this.scene3.add(this.lookTarget);
    // เงาใต้เท้า (วงรีจาง ๆ)
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0, 'rgba(0,0,0,0.55)');
    grad.addColorStop(0.55, 'rgba(0,0,0,0.25)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    this.shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.42),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.003;
    this.scene3.add(this.shadow);
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  // ตั้งค่า: { enabled, x, y, h, url, fps, theme, map, bpm, quality }
  set(cfg) {
    Object.assign(this.cfg, cfg);
    if (cfg.fps) this.fps = cfg.fps;
    const { enabled, x, y, h } = this.cfg;
    this.canvas.style.display = enabled && this.vrm ? '' : 'none';
    const W = Math.round(h * 1.1); // กว้างพอให้เดินซ้าย-ขวาได้
    const H = Math.round(h * 1.16);
    if (W !== this.W || H !== this.H || this.framing !== this.cfg.framing) {
      this.W = W;
      this.H = H;
      this.framing = this.cfg.framing;
      this.canvas.style.width = W + 'px';
      this.canvas.style.height = H + 'px';
      this.camera.aspect = W / H;
      this.pr = 0;
      this.sharpen();
      this.frame();
    }
    this.canvas.style.left = Math.round(x - W / 2) + 'px';
    this.canvas.style.top = Math.round(y - H * 0.985) + 'px';
    this.applyLights();
    // ชั้นของตัวละคร: หน้า/หลังกล่องข้อความ
    const layer = this.cfg.front ? 'front' : 'back';
    if (layer !== this.layer && this.slots) {
      const [parent, before] = this.slots[layer];
      parent.insertBefore(this.canvas, before);
      this.canvas.style.zIndex = layer === 'front' ? '6' : '';
      this.layer = layer;
    }
    this.applyOutline();
    if (this.aaMode !== this.cfg.aa) {
      this.aaMode = this.cfg.aa;
      this.pr = 0;
      this.sharpen();
    }
    const P = OUTFITS[this.cfg.outfit]?.persona;
    this.persona = PERSONAS[P] || PERSONAS.young;
    if (enabled && cfg.url && cfg.url !== this.modelUrl) this.load(cfg.url);
    else if (this.vrm && this.outfitKey !== (this.cfg.outfit || '')) this.dress();
  }

  // เส้นขอบตัวละครแบบการ์ตูน (MToon outline): 0 ปิด, 1 บาง, 2 กลาง, 3 หนา
  applyOutline() {
    if (!this.vrm) return;
    const level = Number(this.cfg.outline ?? 2);
    if (level === this.outlineLevel) return;
    this.outlineLevel = level;
    const width = [0, 0.0016, 0.0028, 0.0042][level] ?? 0.0028;
    if (this.dressed?.props) outlineProps(this.dressed.props, width * 0.8);
    this.vrm.scene.traverse((o) => {
      for (const m of [].concat(o.material || [])) {
        if (!m?.isOutline) continue;
        if (m.userData.origOutline == null) m.userData.origOutline = m.outlineWidthFactor;
        m.outlineWidthFactor = width || 0.00001;
        m.visible = width > 0;
        if (m.outlineColorFactor) m.outlineColorFactor.setHex(0x1e1418); // เส้นเข้มเกือบดำ (โทนน้ำตาลอมม่วง)
        if ('outlineLightingMixFactor' in m) m.outlineLightingMixFactor = 0.15;
      }
    });
  }

  // ขอบเนียน (anti-aliasing): วาดละเอียดกว่าพิกเซลจริงบนจอ ~1.8 เท่า แล้วให้เบราว์เซอร์ย่อลง (supersampling)
  // + MSAA ของ WebGL — ขอบผม/เสื้อ/เส้นขอบจะไม่เป็นขั้นบันได
  sharpen() {
    const rect = this.canvas.getBoundingClientRect();
    const shown = rect.width && this.W ? rect.width / this.W : 1;
    const lite = this.cfg.quality === 'lite' || this.cfg.aa === 'lite';
    // 8x: MSAA 8 ตัวอย่าง/พิกเซล + วาดเกินจอ 1.3 เท่า • 4x: MSAA 4 + วาดเกิน 1.8 เท่า • ประหยัด: MSAA 4 + 1.3 เท่า
    const msaa8 = !lite && this.aaSamples() >= 8;
    const factor = lite ? 1.3 : msaa8 ? 1.3 : 1.8;
    const cap = lite ? 1.4 : msaa8 ? 2.0 : 2.6;
    const pr = Math.round(clamp(shown * (window.devicePixelRatio || 1) * factor, 1, cap) * 10) / 10;
    if (Math.abs(pr - (this.pr || 0)) < 0.1) return;
    this.pr = pr;
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(this.W, this.H, false);
  }

  // แต่งตัวตามธีม (เปลี่ยนสีผ้า + พร็อพ)
  dress() {
    this.dressed?.undo();
    this.dressed = null;
    this.outfitKey = this.cfg.outfit || '';
    const outfit = OUTFITS[this.outfitKey];
    if (!outfit || !this.vrm) return;
    const B = this.bones;
    const F = this.flip;
    this.vrm.scene.updateMatrixWorld(true);
    const head = B.head;
    const headW = head.getWorldPosition(new THREE.Vector3());
    // ตำแหน่งตา (ใช้วางแว่น)
    let eyesLocal = new THREE.Vector3(0, 0.06, 0.08 * F);
    let eyeGap = 0.064;
    if (B.leftEye && B.rightEye) {
      const l = B.leftEye.getWorldPosition(new THREE.Vector3());
      const r = B.rightEye.getWorldPosition(new THREE.Vector3());
      eyeGap = Math.max(0.04, l.distanceTo(r));
      eyesLocal = head.worldToLocal(l.add(r).multiplyScalar(0.5));
    }
    // ยอดผมจริงจากรูปทรงโมเดล (หมวกจะได้วางบนผมพอดี)
    const box = new THREE.Box3().setFromObject(this.vrm.scene, true);
    const info = {
      bones: B,
      flip: F,
      headSize: 0.24,
      headTop: Math.max(0.12, Math.min(0.32, box.max.y - headW.y)), // ยอดผมสูงจากกระดูกหัวกี่เมตร
      // พิกัดแบบ VRM 1.0 (+Z หน้า, +X ซ้าย) — พร็อพถูกหมุนให้ตรงกับโมเดล VRM 0.x เอง
      eyesLocal: new THREE.Vector3(eyesLocal.x * F, eyesLocal.y, eyesLocal.z * F),
      eyeGap,
      krathongY: -0.03,
      // จุดกำมือ (พิกัดในกระดูกมือ): เลื่อนไปทางนิ้ว + ฝั่งฝ่ามือ
      handGrip: (side) => new THREE.Vector3((side === 'left' ? 1 : -1) * 0.055, -0.025, 0.005),
    };
    try {
      this.dressed = applyOutfit(this.vrm, outfit, info);
      this.outlineLevel = null; // ใส่เส้นขอบให้พร็อพใหม่ด้วย
      this.applyOutline();
    } catch (e) {
      console.warn('[avatar] แต่งตัวไม่สำเร็จ', e);
    }
    this.setRim(this.rimHex);
  }

  applyLights() {
    const L = LIGHTS[this.cfg.theme] || LIGHTS.concert;
    this.key.color.setHex(L.key);
    this.key.intensity = L.keyI;
    this.fill.color.setHex(L.fill);
    this.fill.intensity = L.fillI;
    this.amb.intensity = L.amb;
    this.dynI = -1;
    this.rimHex = L.rim;
    this.setRim(L.rim);
  }
  // ขอบเรืองแสงของวัสดุ MToon
  setRim(hex) {
    if (!this.vrm) return;
    const col = new THREE.Color(hex).multiplyScalar(0.55);
    this.vrm.scene.traverse((o) => {
      for (const m of [].concat(o.material || [])) {
        if (m && m.parametricRimColorFactor) {
          m.parametricRimColorFactor.copy(col);
          m.parametricRimFresnelPowerFactor = 3.2;
          m.parametricRimLiftFactor = 0.05;
        }
      }
    });
  }

  async load(url) {
    this.modelUrl = url;
    if (this.loading) return;
    this.loading = true;
    try {
      const loader = new GLTFLoader();
      loader.register((parser) => new VRMLoaderPlugin(parser));
      const gltf = await loader.loadAsync(url);
      const vrm = gltf.userData.vrm;
      if (!vrm) throw new Error('ไฟล์นี้ไม่ใช่ VRM');
      VRMUtils.removeUnnecessaryVertices(gltf.scene);
      VRMUtils.combineSkeletons?.(gltf.scene);
      VRMUtils.rotateVRM0(vrm);
      vrm.scene.traverse((o) => (o.frustumCulled = false));
      if (this.vrm) {
        this.scene3.remove(this.root);
        VRMUtils.deepDispose(this.vrm.scene);
      }
      this.vrm = vrm;
      this.root = new THREE.Group(); // ใช้เลื่อน/หมุนทั้งตัว (เดิน หมุน)
      this.root.add(vrm.scene);
      this.scene3.add(this.root);
      if (vrm.lookAt) vrm.lookAt.target = this.lookTarget;
      const names = VRMLIB.VRMHumanBoneList || Object.keys(vrm.humanoid.humanBones || {});
      this.bones = {};
      for (const n of names) {
        const node = vrm.humanoid.getNormalizedBoneNode(n);
        if (node) this.bones[n] = node;
      }
      this.hipsY = this.bones.hips?.position.y || 0;
      // VRM 0.x หมุนกลับหลัง 180° → แกน x/z ของกระดูกกลับด้านเมื่อเทียบกับ VRM 1.0
      this.flip = vrm.meta?.metaVersion === '0' ? -1 : 1;
      vrm.scene.updateMatrixWorld(true);
      const head = this.bones.head?.getWorldPosition(new THREE.Vector3());
      this.modelH = head ? head.y + 0.16 : 1.6;
      // เท็กซ์เจอร์คมขึ้นเวลามองเอียง/ย่อ
      const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
      vrm.scene.traverse((o) => {
        for (const m of [].concat(o.material || [])) {
          for (const k of ['map', 'shadeMultiplyTexture', 'normalMap']) {
            if (m?.[k]) {
              m[k].anisotropy = maxAniso;
              m[k].needsUpdate = true;
            }
          }
        }
      });
      this.mixer = new THREE.AnimationMixer(vrm.scene);
      this.clips.clear();
      this.clip = null;
      this.procQ = null;
      this.dressed = null;
      this.outfitKey = null;
      this.outlineLevel = null;
      this.applyOutline();
      this.frame();
      this.applyLights();
      this.dress();
      this.canvas.style.display = this.cfg.enabled ? '' : 'none';
      this.play(this.persona.calm ? 'nod' : 'wave');
    } catch (e) {
      console.warn('[avatar] โหลดโมเดลไม่สำเร็จ', e);
    } finally {
      this.loading = false;
      if (this.modelUrl !== url) this.load(this.modelUrl);
    }
  }

  frame() {
    if (!this.modelH) return;
    // ครึ่งตัว: เห็นตั้งแต่สะโพกขึ้นไป หน้าใหญ่ คมชัดบนมือถือ
    const half = this.cfg.framing === 'half';
    const bottom = half ? this.hipsY * 0.78 : 0;
    const visH = (this.modelH - bottom) * (half ? 1.1 : 1.16);
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    const d = visH / 2 / Math.tan(fov / 2);
    const cy = bottom + visH / 2 - this.modelH * 0.015;
    this.shadow.visible = !half;
    this.camera.position.set(0, cy, d);
    this.camera.lookAt(0, cy, 0);
    this.camera.updateProjectionMatrix();
    this.walkRange = Math.max(0, visH * this.camera.aspect * 0.5 - 0.42); // เดินได้ไกลแค่ไหนโดยแขนไม่หลุดกรอบ
  }

  // ---------------- คำสั่ง
  busy() {
    return this.actions.some((a) => !a.idle && a.t < a.dur - 0.4) || !!(this.clip && this.clip.t < this.clip.dur - 0.4);
  }
  // ชื่อท่า หรือ "file:ชื่อไฟล์"
  play(name, opts = {}) {
    if (!name || !this.vrm) return;
    if (name.startsWith('file:')) return this.playClip(name.slice(5), opts);
    const P = POSES[name];
    if (!P) return;
    // ท่าว่างที่เล่นอยู่ → หยุดให้ท่าจริงแทน
    if (!P.idle) for (const a of this.actions) if (a.idle) a.dur = Math.min(a.dur, a.t + 0.35);
    if (this.busy()) {
      if (opts.queue !== false && this.queue.length < 2 && this.queue[this.queue.length - 1] !== name) this.queue.push(name);
      return;
    }
    this.walk.target = this.walk.x; // หยุดเดิน
    this.actions.push({ name, t: 0, dur: opts.dur || P.dur, idle: !!P.idle });
  }
  async playClip(file, opts = {}) {
    if (this.busy()) {
      if (opts.queue !== false && this.queue.length < 2) this.queue.push('file:' + file);
      return;
    }
    const url = '/motions/' + encodeURIComponent(file);
    let p = this.clips.get(url);
    if (!p) {
      p = (/\.fbx$/i.test(file) ? loadMixamoClip(url, this.vrm) : loadVrmaClip(url, this.vrm)).then((clip) => this.flattenHips(clip));
      this.clips.set(url, p);
    }
    try {
      const clip = await p;
      if (this.clip) this.clip.action.stop();
      const action = this.mixer.clipAction(clip);
      action.reset();
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.play();
      this.walk.target = this.walk.x;
      for (const a of this.actions) if (a.idle) a.dur = Math.min(a.dur, a.t + 0.35);
      this.clip = { action, t: 0, dur: Math.max(0.5, clip.duration), name: file };
    } catch (e) {
      this.clips.delete(url);
      console.warn('[avatar] โหลดท่าไม่สำเร็จ', file, e);
    }
  }
  // ท่าจากไฟล์: ให้ตัวละครอยู่กับที่ (เก็บแค่การขยับขึ้นลงของสะโพก)
  flattenHips(clip) {
    const hipsName = this.bones.hips?.name;
    for (const tr of clip.tracks) {
      if (tr.name === `${hipsName}.position`) {
        const v = tr.values;
        const y0 = v[1];
        for (let i = 0; i < v.length; i += 3) {
          v[i] = 0;
          v[i + 2] = 0;
          v[i + 1] = this.hipsY + (v[i + 1] - y0);
        }
      }
    }
    return clip;
  }
  // เหตุการณ์ในไลฟ์ → ท่า (ตารางในหลังบ้าน > ค่าเริ่มต้นของธีม > ค่าเริ่มต้น)
  react(kind) {
    const user = Object.fromEntries(Object.entries(this.cfg.map || {}).filter(([, v]) => v));
    const m = { ...DEFAULT_MAP, ...(THEME_MAP[this.cfg.theme] || {}), ...(this.persona.map || {}), ...user };
    const name = m[kind];
    if (name && name !== 'none') this.play(name, { queue: kind !== 'join' && kind !== 'game' });
  }
  lookAt(px, py, sec = 2.5) {
    const { x, y, h } = this.cfg;
    const headY = y - h * 0.92;
    this.look = { x: clamp((px - x) / 500, -1, 1), y: clamp((headY - py) / 700, -0.6, 0.6), until: performance.now() + sec * 1000 };
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

  // ---------------- ทุกเฟรม
  loop(now) {
    requestAnimationFrame(this.loop);
    if (!this.vrm || !this.cfg.enabled) return;
    if (now - this.lastFrame < 1000 / this.fps - 2) return;
    this.lastFrame = now;
    if (now - (this.lastSharp || 0) > 2000) {
      this.lastSharp = now;
      this.sharpen();
    }
    const dt = Math.min(0.1, this.clock.getDelta());
    const T = this.clock.elapsedTime;
    this.animate(dt, T);
    this.vrm.update(dt);
    this.renderFrame();
  }

  // จำนวนตัวอย่าง MSAA ที่ใช้จริง (8x ต้องใช้ WebGL2 และการ์ดจอรองรับ)
  aaSamples() {
    if (this.cfg.aa !== '8x' || this.cfg.quality === 'lite') return 0;
    if (this._maxSamples == null) {
      const gl = this.renderer.getContext();
      this._maxSamples = this.renderer.capabilities.isWebGL2 ? gl.getParameter(gl.MAX_SAMPLES) || 0 : 0;
    }
    return Math.min(8, this._maxSamples);
  }

  // วาด 1 เฟรม: โหมด 8x วาดลงเฟรมบัฟเฟอร์ MSAA 8 ตัวอย่างก่อน แล้วค่อยแปะลงจอ
  renderFrame() {
    const samples = this.aaSamples();
    if (samples < 8) {
      this.renderer.render(this.scene3, this.camera);
      return;
    }
    const r = this.renderer;
    const size = r.getDrawingBufferSize(this._sz || (this._sz = new THREE.Vector2()));
    if (!this.rt || this.rt.width !== size.x || this.rt.height !== size.y) {
      this.rt?.dispose();
      this.rt = new THREE.WebGLRenderTarget(size.x, size.y, { samples, type: THREE.HalfFloatType });
      if (!this.blit) {
        // แปะภาพลงจอ: แปลงสี linear → sRGB (ภาพเป็นแบบ premultiplied alpha อยู่แล้ว)
        const mat = new THREE.ShaderMaterial({
          uniforms: { tMap: { value: null } },
          vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
          fragmentShader: `uniform sampler2D tMap; varying vec2 vUv;
            void main(){
              vec4 c = texture2D(tMap, vUv);
              if (c.a <= 0.0001) { gl_FragColor = vec4(0.0); return; }
              vec3 lin = clamp(c.rgb / c.a, 0.0, 1.0);
              vec3 s = mix(lin * 12.92, 1.055 * pow(lin, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, lin));
              gl_FragColor = vec4(s * c.a, c.a);
            }`,
          depthTest: false,
          depthWrite: false,
          blending: THREE.NoBlending,
        });
        this.blit = { scene: new THREE.Scene(), cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), mat };
        const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
        quad.frustumCulled = false;
        this.blit.scene.add(quad);
      }
      this.blit.mat.uniforms.tMap.value = this.rt.texture;
    }
    r.setRenderTarget(this.rt);
    r.setClearColor(0x000000, 0);
    r.clear();
    r.render(this.scene3, this.camera);
    r.setRenderTarget(null);
    r.clear();
    r.render(this.blit.scene, this.blit.cam);
  }

  // ท่าว่าง + เดินเล่น (เมื่อไม่มีท่าอื่น)
  idleBrain(dt) {
    const free = !this.busy() && !this.actions.length && !this.clip && !this.speaking && !this.queue.length;
    if (!free) return;
    this.nextIdle -= dt;
    this.walk.next -= dt;
    const still = Math.abs(this.walk.target - this.walk.x) < 0.01;
    const PW = this.persona.walk || [0.32, 14, 28];
    if (this.walk.next <= 0 && still && this.walkRange > 0.05 && this.cfg.framing !== 'half') {
      this.walk.next = rand(PW[1], PW[2]);
      let t = rand(-this.walkRange, this.walkRange);
      if (Math.abs(t - this.walk.x) < 0.15) t = -t;
      this.walk.target = t;
      return;
    }
    if (this.nextIdle <= 0 && still) {
      this.nextIdle = rand(7, 14);
      const n = pick(this.persona.idle || [...IDLE_POOL, ...(THEME_IDLE[this.cfg.theme] || [])]);
      this.actions.push({ name: n, t: 0, dur: POSES[n].dur, idle: true });
    }
  }

  animate(dt, T) {
    const B = this.bones;
    const target = {};
    const PS = this.persona;
    for (const [b, r] of Object.entries({ ...REST, ...(PS.rest || {}) })) target[b] = [...r];
    const breath = Math.sin(T * (PS.calm ? 1.2 : 1.6));
    // ถ่ายน้ำหนักขาซ้าย-ขวาช้า ๆ
    const shift = Math.sin(T * 0.27);
    target.spine = [breath * 0.012, Math.sin(T * 0.37) * 0.03, -shift * 0.03];
    target.chest = [breath * 0.018, 0, 0];
    target.hips = [0, Math.sin(T * 0.37) * 0.04, shift * 0.035];
    target.leftUpperLeg = [0, 0, -shift * 0.035];
    target.rightUpperLeg = [0, 0, -shift * 0.035];
    target.leftLowerLeg = [Math.max(0, shift) * 0.08, 0, 0];
    target.rightLowerLeg = [Math.max(0, -shift) * 0.08, 0, 0];
    target.leftUpperArm[2] += breath * 0.015;
    target.rightUpperArm[2] -= breath * 0.015;
    target.leftShoulder = [0, 0, breath * 0.015];
    target.rightShoulder = [0, 0, -breath * 0.015];
    // หลังค่อมนิด ๆ (คนสูงวัย) แต่ยังเงยหน้ามองคนดู
    const nh = PS.hunch || 0;
    target.spine[0] += nh;
    target.chest[0] += nh * 0.6;

    this.idleBrain(dt);

    // ---- เดิน
    const Wk = this.walk;
    const dist = Wk.target - Wk.x;
    const walking = Math.abs(dist) > 0.01;
    Wk.amt += ((walking ? 1 : 0) - Wk.amt) * Math.min(1, dt * 5);
    if (walking) {
      Wk.dir = Math.sign(dist);
      Wk.x += Wk.dir * Math.min(Math.abs(dist), dt * (PS.walk?.[0] || 0.32));
      Wk.phase += dt * (PS.calm ? 5 : 7.5);
    }
    const wa = Wk.amt;
    if (wa > 0.01) {
      const s = Math.sin(Wk.phase);
      const c = Math.cos(Wk.phase);
      target.leftUpperLeg = [-s * 0.38 * wa, 0, target.leftUpperLeg[2]];
      target.rightUpperLeg = [s * 0.38 * wa, 0, target.rightUpperLeg[2]];
      target.leftLowerLeg = [Math.max(0, -c) * 0.65 * wa, 0, 0];
      target.rightLowerLeg = [Math.max(0, c) * 0.65 * wa, 0, 0];
      target.leftUpperArm[0] += s * 0.3 * wa;
      target.rightUpperArm[0] -= s * 0.3 * wa;
    }
    // หันตัวไปทางที่เดิน (เกือบด้านข้าง) แล้วกลับมาหน้าตรง
    const yawTarget = wa * Wk.dir * 0.75;
    this.yaw += (yawTarget - this.yaw) * Math.min(1, dt * 4);
    const bob = wa * Math.abs(Math.sin(Wk.phase)) * 0.018;

    // ---- หัว/ตา
    const nowMs = performance.now();
    let lx, ly;
    if (nowMs < this.look.until) {
      lx = this.look.x;
      ly = this.look.y;
    } else {
      lx = Math.sin(T * 0.23) * 0.3 + Math.sin(T * 0.71) * 0.08;
      ly = Math.sin(T * 0.31) * 0.08;
    }
    for (const a of this.actions) {
      const lk = POSES[a.name].look;
      if (lk) lx = lk(a.t) * ease(Math.min(a.t / 0.4, (a.dur - a.t) / 0.4, 1)) + lx * 0.2;
    }
    this.lx = this.lx == null ? lx : this.lx + (lx - this.lx) * Math.min(1, dt * 4);
    this.ly = this.ly == null ? ly : this.ly + (ly - this.ly) * Math.min(1, dt * 4);
    const talkNod = this.mouthNow * Math.sin(T * 9) * 0.04;
    target.head = [-this.ly * 0.35 + talkNod - nh * 0.9, this.lx * 0.45, -this.lx * 0.05];
    target.neck = [-this.ly * 0.15 + nh * 0.4, this.lx * 0.2, 0];
    // หันตัวตามที่มองนิดหน่อย (ตอนมองคนส่งของขวัญ)
    if (nowMs < this.look.until) {
      target.spine[1] += this.look.x * 0.15;
      target.hips[1] += this.look.x * 0.12;
    }
    // ตากลอกเล็ก ๆ แบบคนจริง
    if (T > this.saccade.next) this.saccade = { x: rand(-0.12, 0.12), y: rand(-0.06, 0.06), next: T + rand(0.4, 1.8) };
    this.lookTarget.position.set(this.lx * 1.2 + this.saccade.x + Wk.x, (this.modelH || 1.5) * 0.93 + this.ly * 0.8 + this.saccade.y, 2);

    // ---- ท่าทาง (ผสมทับ)
    const exprs = {};
    const hands = { left: ['relax', 1], right: ['relax', 1] };
    let hop = 0;
    let spin = 0;
    let wink = 0;
    const bpm = this.cfg.bpm || 112;
    for (const a of this.actions) {
      a.t += dt * (PS.speed || 1);
      const P = POSES[a.name];
      const w = ease(Math.min(a.t / 0.35, (a.dur - a.t) / 0.45, 1));
      const beats = (a.t * bpm) / 60;
      const pose = P.pose(a.t, beats);
      for (const [b, r] of Object.entries(pose)) {
        const base = target[b] || [0, 0, 0];
        target[b] = base.map((val, i) => val + (r[i] - val) * w);
      }
      for (const [k, val] of Object.entries(P.expr || {})) exprs[k] = Math.max(exprs[k] || 0, val * w);
      for (const side of ['left', 'right']) if (P.hands?.[side] && w > 0.3) hands[side] = [P.hands[side], w];
      if (P.hop) hop += P.hop(a.t, beats) * w;
      if (P.spin) spin += P.spin(a.t);
      if (P.wink) wink = Math.max(wink, P.wink(a.t));
    }
    this.actions = this.actions.filter((a) => a.t < a.dur);
    if (this.queue.length && !this.busy()) this.play(this.queue.shift(), { queue: false });
    if (PS.calm) {
      hop = 0; // สุขุม: ไม่กระโดด
      if (exprs.happy) exprs.happy = Math.min(exprs.happy, 0.55);
    }

    const F = this.flip;
    for (const [b, r] of Object.entries(target)) {
      const node = B[b];
      if (node) node.rotation.set(r[0] * F, r[1], r[2] * F);
    }
    this.applyHand('left', ...hands.left);
    this.applyHand('right', ...hands.right);
    if (B.hips) B.hips.position.y = this.hipsY + hop + bob;
    this.root.position.x = Wk.x;
    this.root.rotation.y = this.yaw + spin;
    this.shadow.position.x = Wk.x;
    const sh = 1 - clamp((hop + bob) * 6, 0, 0.5);
    this.shadow.scale.set(sh, sh, sh);

    // ---- ท่าจากไฟล์ mocap: ผสมกับท่าในโค้ดแบบนุ่ม ๆ
    if (this.clip) {
      const C = this.clip;
      C.t += dt;
      const w = ease(Math.min(C.t / 0.4, (C.dur - C.t) / 0.5, 1));
      if (!this.procQ) this.procQ = {};
      for (const [n, node] of Object.entries(B)) (this.procQ[n] ||= new THREE.Quaternion()).copy(node.quaternion);
      const hipsPos = B.hips ? B.hips.position.clone() : null;
      this.mixer.update(dt);
      const tmp = (this._tmpQ ||= new THREE.Quaternion());
      for (const [n, node] of Object.entries(B)) {
        tmp.copy(node.quaternion); // ค่าจากไฟล์ (ต้องเก็บก่อน — slerpQuaternions จะเขียนทับตัวเอง)
        node.quaternion.copy(this.procQ[n]).slerp(tmp, w);
      }
      if (hipsPos) B.hips.position.lerpVectors(hipsPos, B.hips.position, w);
      exprs.happy = Math.max(exprs.happy || 0, 0.6 * w);
      if (C.t >= C.dur) {
        C.action.stop();
        this.clip = null;
      }
    }

    // ---- ไฟคอนเสิร์ต: ขอบเรืองแสงเปลี่ยนสีตามจังหวะ
    const L = LIGHTS[this.cfg.theme];
    if (L?.dyn) {
      const i = Math.floor((T * bpm) / 60 / 2) % L.dyn.length;
      if (i !== this.dynI) {
        this.dynI = i;
        this.setRim(L.dyn[i]);
      }
    }

    // ---- สีหน้า + กะพริบตา + ปาก
    const em = this.vrm.expressionManager;
    if (!em) return;
    if (!exprs.happy && !exprs.relaxed && !exprs.surprised) exprs.relaxed = 0.25 + Math.sin(T * 0.2) * 0.1;
    for (const k of ['happy', 'relaxed', 'surprised', 'sad', 'neutral']) {
      const cur = em.getValue(k) ?? 0;
      em.setValue(k, cur + ((exprs[k] || 0) - cur) * Math.min(1, dt * 6));
    }
    this.nextBlink -= dt;
    if (this.nextBlink <= 0 && this.blinkT < 0) this.blinkT = 0;
    let blink = 0;
    if (this.blinkT >= 0) {
      this.blinkT += dt;
      blink = Math.sin(clamp(this.blinkT / 0.16, 0, 1) * Math.PI);
      if (this.blinkT >= 0.16) {
        this.blinkT = -1;
        this.nextBlink = Math.random() < 0.15 ? 0.25 : rand(2, 5.5); // บางทีกะพริบ 2 ครั้งติด
      }
    }
    const happyNow = em.getValue('happy') || 0;
    em.setValue('blink', blink * (1 - happyNow * 0.8));
    em.setValue('blinkLeft', wink);

    const ext = nowMs - this.extMouthAt < 300 ? this.extMouth : 0;
    let m = Math.max(this.mouth, ext);
    if (this.speaking && !ext && !(nowMs - (this.mouthAt || 0) < 300)) m = (Math.sin(T * 17) * 0.5 + 0.5) * 0.6;
    if (!this.speaking && !(nowMs - (this.mouthAt || 0) < 300)) m = ext;
    this.mouthNow += (m - this.mouthNow) * Math.min(1, dt * 18);
    const v = this.mouthNow;
    const ph = Math.sin(T * 5.3);
    em.setValue('aa', v * (0.65 + ph * 0.25));
    em.setValue('oh', v * Math.max(0, -ph) * 0.4);
    em.setValue('ih', v * Math.max(0, ph) * 0.3);
  }

  // นิ้วมือ: งอทุกข้อตามรูปมือ (ผสมกับมือผ่อนคลายตามน้ำหนัก w)
  applyHand(side, shape, w) {
    const B = this.bones;
    const H = HANDS[shape] || HANDS.relax;
    const R = HANDS.relax;
    const sgn = side === 'left' ? -1 : 1; // ทิศงอเข้าหาฝ่ามือ
    const mix = (a, b) => a + (b - a) * w;
    FINGERS.forEach((f, fi) => {
      const open = H.open?.includes(f.toLowerCase());
      const seg = open ? [0, 0, 0] : H.f;
      ['Proximal', 'Intermediate', 'Distal'].forEach((j, ji) => {
        const node = B[`${side}${f}${j}`];
        if (!node) return;
        const curl = mix(R.f[ji], seg[ji]);
        const spread = ji === 0 && H.spread && (open || !H.open) ? (fi - 1.5) * H.spread * -sgn : 0;
        node.rotation.set(0, spread, sgn * curl * this.flip);
      });
    });
    ['Metacarpal', 'Proximal', 'Distal'].forEach((j, ji) => {
      const node = B[`${side}Thumb${j}`];
      if (!node) return;
      const curl = mix(R.thumb[ji], H.thumb[ji]);
      node.rotation.set(0, -sgn * curl * 0.8, sgn * curl * 0.4 * this.flip);
    });
  }
}

// ---------------------------------------------------------------- expose
const avatar = new Avatar();
window.StageAvatar = {
  mount: (scene, before, fp, fb) => avatar.mount(scene, before, fp, fb),
  set: (c) => avatar.set(c),
  play: (n, o) => avatar.play(n, o),
  react: (k) => avatar.react(k),
  lookAt: (x, y, s) => avatar.lookAt(x, y, s),
  setMouth: (v) => avatar.setMouth(v),
  setExternalMouth: (v) => avatar.setExternalMouth(v),
  setSpeaking: (on) => avatar.setSpeaking(on),
  poses: Object.keys(POSES).filter((k) => !POSES[k].idle),
  defaultMap: DEFAULT_MAP,
  themeModel: (t) => THEME_MODEL[t] || 'fumiriya',
  themeLayout: (t) => THEME_LAYOUT[t] || { x: 540, y: 1700, h: 780 },
  halfLayout: HALF_LAYOUT,
  outfits: Object.fromEntries(Object.entries(OUTFITS).map(([k, o]) => [k, o.label])),
  themeMap: THEME_MAP,
  get ready() {
    return !!avatar.vrm;
  },
  _a: avatar,
  _poses: POSES,
  _hands: HANDS,
};
window.dispatchEvent(new Event('avatar-ready'));
