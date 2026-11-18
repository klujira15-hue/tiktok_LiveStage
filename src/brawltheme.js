// เกม “ศึกหัวร้อน” — ข้อมูลธีม (เกม: minigames.js + mg/brawl.js • ภาพ: public/brawl-engine.js)
// คนดูทุกคนมีตัวละครการ์ตูน + เลือด • พิมพ์ “ตี” ต่อยคนสุ่ม • ของขวัญ = สกิล • กดใจ = พลังโกรธ
'use strict';

const GIFTS = [['Rose', 1], ['Finger Heart', 5], ['Rosa', 10], ['Perfume', 20], ['Doughnut', 30], ['Confetti', 100], ['Peeka-Bro', 199], ['Corgi', 299], ['Travel with You', 999]];
const KEYS = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9'];
const TIER = [1, 1, 1, 2, 2, 2, 3, 3, 3];
const HELP = [
  ['👊', 'หมัดชุด ต่อยรัว 3 ที'], ['💚', 'ยาแดงวิเศษ ฮีล +50 (โดน KO = ฟื้นทันที)'], ['🦵', 'เตะลอยฟ้า แรง 45'], ['🛡️', 'โล่พลัง ไม่โดนตี 12 วิ'], ['🩴', 'ขว้างรองเท้าแตะ โดน 3 คน'],
  ['🔥', 'หมัดพลังไฟ โดน 5 คน'], ['👹', 'ร่างยักษ์ ตีแรง ×2 นาน 15 วิ'], ['🌪️', 'พายุทอร์นาโด ดูดครึ่งสนาม'], ['☄️', 'อุกกาบาตถล่ม โดนทุกคน!'],
];

const BRAWL_THEMES = {
  brawl: {
    id: 'brawl', name: 'ศึกหัวร้อน', icon: '👊', layout: 'hud', fields: ['host'], requestAction: 'list', bigEffect: 'g9', mg: 'brawl',
    desc: 'เกมตีกันแบบการ์ตูนหัวโต — คนดูทุกคนที่เข้าไลฟ์ได้ตัวละครของตัวเองพร้อมแถบเลือด พิมพ์ “ตี” ต่อยคนแบบสุ่ม “หลบ” หลบหมัด ส่งของขวัญปล่อยสกิลอลังการ (ทอร์นาโด ร่างยักษ์ อุกกาบาต) รอบละ 3 นาที KO ได้มากสุดเป็นแชมป์',
    texts: {
      gifts: '🎁 ส่งของขวัญ = สกิล', top: '👊 KO มากสุดรอบนี้', queue: '📜 คำขอ', queueEmpty: 'ยังไม่มีคำขอ', queueBy: 'โดย',
      hype: '🔥 พลังโกรธ', hypeFull: 'โกรธเต็ม!', bigWord: 'อุกกาบาตถล่ม!', bigSubUser: 'ขอบคุณสำหรับสกิลสุดแรง!', bigSubAll: 'ขอบคุณทุกคน!',
      joinVerb: 'ลงสนามแล้ว', emptyTop: 'ยังไม่มีใคร KO ใคร<br>พิมพ์ “ตี” เลย!',
    },
    effects: Object.fromEntries(KEYS.map((k, i) => [k, { icon: HELP[i][0], label: HELP[i][1], kind: 'mg' + TIER[i], emoji: '' }])),
    defaults: {
      title: 'ศึกหัวร้อน', subtitle: 'พิมพ์ “ตี” ต่อยคนสุ่ม • ส่งของขวัญปล่อยสกิล', requestCommand: '', host: 'กรรมการ',
      gifts: GIFTS.map(([name, diamonds], i) => ({ name, diamonds, effect: KEYS[i] })),
    },
    hud: {
      palette: { sky: '#5cc4ff', sky2: '#c9efff', ground: '#e9c98c', ground2: '#d4a865', accent: '#ffd23f', accent2: '#ff5a5f', ink: '#ffffff', panel: 'rgba(20,14,30,.82)', soft: '#fff1b8' },
      // เป้าเพชรครบ = ทุกคนเลือดเต็ม + ฟื้นหมด • เป้าใจครบ = ทุกคนพลังโกรธเต็ม (mg/brawl.js onGoal)
      goals: [{ label: 'เพชร', reward: 'ฮีลทั้งสนาม ทุกคนฟื้น', max: 300, effect: 'g2' }, { label: 'ใจ', reward: 'ทุกคนโกรธเต็ม หมัดคริติคอล', max: 5000, effect: 'g1' }],
      cmds: [], // คำสั่ง ตี/หลบ เกมรับเอง (ไม่ใส่ในคลังคำสั่งของธีมสร้างเอง)
      zones: [],
      boardTitle: 'นักสู้', podiumTitle: 'แชมป์สังเวียน', role: 'นักสู้',
    },
  },
};

module.exports = { BRAWL_THEMES };
