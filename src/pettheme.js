// เกม “เลี้ยงน้อง 3D” (เดิมชื่อ เลี้ยงน้องกวางวิเศษ) — ข้อมูลธีม (เกม: minigames.js + mg/pet.js • ภาพ 3D: public/pet3d-engine.js • โมเดล: public/models/pet-stag.glb)
// ทั้งไลฟ์ช่วยกันเลี้ยงน้อง 1 ตัว น้องโตข้ามไลฟ์ • คอมเมนต์ = คำสั่งดูแล • ของขวัญ = ของพิเศษ • กดใจ = ความสุข
'use strict';

const GIFTS = [['Rose', 1], ['Finger Heart', 5], ['Rosa', 10], ['Perfume', 20], ['Doughnut', 30], ['Confetti', 100], ['Peeka-Bro', 199], ['Corgi', 299], ['Travel with You', 999]];
const KEYS = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9'];
const TIER = [1, 1, 1, 2, 2, 2, 3, 3, 3];
const HELP = [
  ['🍬', 'ขนมหวาน อิ่ม+สุข'], ['😘', 'หอมแก้ม สุข +20'], ['⚽', 'ลูกบอล พาวิ่งเล่น'], ['🫧', 'สบู่ฟองฟู่ สะอาดเอี่ยม'], ['🧺', 'ตะกร้าผลไม้ อิ่มแปล้'],
  ['☁️', 'หมอนเมฆ พลังเต็ม'], ['🌸', 'มงกุฎดอกไม้ ใส่ทั้งไลฟ์'], ['🦋', 'ฝูงผีเสื้อทอง ทุกค่า +40'], ['🌟', 'พรแห่งป่า โตไวพิเศษ!'],
];

const PET_THEMES = {
  pet3d: {
    id: 'pet3d', name: 'เลี้ยงน้อง 3D', icon: '🐣', layout: 'hud', fields: ['host'], requestAction: 'list', bigEffect: 'g9', mg: 'pet',
    desc: 'เกมเลี้ยงสัตว์ 3D — ทั้งไลฟ์ช่วยกันฟักไข่และเลี้ยงน้องตัวเดียวกันบนเกาะลอยฟ้า (สุ่มได้ 9 ชนิด) คนดูพิมพ์ ให้อาหาร / เล่น / เดินเล่น / ลูบหัว / อาบน้ำ / นอน น้องทำท่าจริงแบบลื่นไหล ส่งของขวัญเป็นของพิเศษ น้องโตข้ามไลฟ์ จากเด็กน้อยจนโตเต็มวัย ร่างตอนโตแยกตามวิธีเลี้ยง',
    texts: {
      gifts: '🎁 ของขวัญ = ของพิเศษ', top: '💗 คนดูแลวันนี้', queue: '📜 คำขอ', queueEmpty: 'ยังไม่มีคำขอ', queueBy: 'โดย',
      hype: '💗 ความสุข', hypeFull: 'มีความสุขสุด ๆ!', bigWord: 'พรแห่งป่า!', bigSubUser: 'ขอบคุณที่ดูแลน้องนะ!', bigSubAll: 'ขอบคุณทุกคน!',
      joinVerb: 'มาเยี่ยมน้อง', emptyTop: 'ยังไม่มีใครดูแลน้อง<br>พิมพ์ “ให้อาหาร” เลย!',
    },
    effects: Object.fromEntries(KEYS.map((k, i) => [k, { icon: HELP[i][0], label: HELP[i][1], kind: 'mg' + TIER[i], emoji: '' }])),
    defaults: {
      title: 'เลี้ยงน้อง 3D', subtitle: 'พิมพ์ ให้อาหาร • เล่น • ลูบหัว • อาบน้ำ • นอน', requestCommand: '', host: 'น้องใบเตย',
      gifts: GIFTS.map(([name, diamonds], i) => ({ name, diamonds, effect: KEYS[i] })),
    },
    hud: {
      palette: { sky: '#bfe6ff', sky2: '#eaf7ff', ground: '#7fb53e', ground2: '#4f8a2a', accent: '#ff6fa8', accent2: '#7ed957', ink: '#ffffff', panel: 'rgba(24,30,20,.78)', soft: '#fff1f6' },
      // เป้าเพชรครบ = ฝูงผีเสื้อทอง • เป้าใจครบ = หอมแก้ม (mg/pet.js onGoal)
      goals: [{ label: 'เพชร', reward: 'ฝูงผีเสื้อทอง ทุกค่า +40', max: 300, effect: 'g8' }, { label: 'ใจ', reward: 'น้องหอมแก้มทุกคน', max: 5000, effect: 'g2' }],
      cmds: [], // คำสั่งดูแลน้อง เกมรับเอง (ไม่ใส่ในคลังคำสั่งของธีมสร้างเอง)
      zones: [],
      boardTitle: 'คนดูแล', podiumTitle: 'พ่อแม่ประจำวัน', role: 'คนดูแล',
    },
  },
};

module.exports = { PET_THEMES };
