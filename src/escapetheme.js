// เกมหนีออกจากตึก “ตึกเงียบ 19 ชั้น” — ข้อมูลธีม (เกม: minigames.js + mg/escape.js • ภาพ: public/escape-engine.js)
// คนดูพิมพ์ 1/2/3 โหวตประตู • ของขวัญ = ตัวช่วย (ไฟฉาย กุญแจ หัวใจ เครื่องราง ลิฟต์) • กดใจ = แบตไฟฉาย / วิ่งหนีผี
'use strict';

const GIFTS = [['Rose', 1], ['Finger Heart', 5], ['Rosa', 10], ['Perfume', 20], ['Doughnut', 30], ['Confetti', 100], ['Peeka-Bro', 199], ['Corgi', 299], ['Travel with You', 999]];
const KEYS = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9'];
const TIER = [1, 1, 1, 2, 2, 2, 3, 3, 3];
const HELP = [
  ['🔦', 'ส่องไฟดูหลังประตู 1 บาน'], ['⏩', 'เร่ง! ตัดสินโหวตใน 3 วิ'], ['🗝️', 'กุญแจ +1'], ['❤️', 'หัวใจ +1'], ['🧿', 'เครื่องรางกันกับดัก/ผี'],
  ['💡', 'ไฟฉายแรงสูง ส่องทุกประตู'], ['🔔', 'ระฆังไล่ผี 5 ห้อง'], ['⚡', 'ไฟกลับมา! ลงทันที 1 ชั้น'], ['🛗', 'ลิฟต์ฉุกเฉิน ลง 3 ชั้น!'],
];

const ESCAPE_THEMES = {
  escape: {
    id: 'escape', name: 'ตึกเงียบ 19 ชั้น', icon: '🔦', layout: 'hud', alias: 'ghostgate', fields: ['host'], requestAction: 'list', bigEffect: 'g9', mg: 'escape',
    desc: 'เกมหนีออกจากตึกร้างตอนตี 3 — มองจากด้านหลังตัวละคร เห็นแค่ตรงที่ไฟฉายส่อง คนดูพิมพ์ 1/2 เลือกประตูทีละห้อง ลงจากชั้น 19 ถึงชั้น 1 ผ่าน 8 ฉาก (โรงแรม โรงพยาบาล ชั้น 13 โรงเรียน ห้องสมุด โรงละคร ห้องเครื่อง ล็อบบี้) มีเนื้อเรื่อง คัทซีน ผู้ดูแลไล่ล่า ของขวัญเป็นตัวช่วย',
    texts: {
      gifts: '🎁 ส่งของขวัญ = ตัวช่วย', top: '🧭 นักสำรวจตาไว', queue: '📜 คำขอ', queueEmpty: 'ยังไม่มีคำขอ', queueBy: 'โดย',
      hype: '🔦 แบตไฟฉาย', hypeFull: 'ไฟฉายเต็ม!', bigWord: 'ลิฟต์ฉุกเฉิน!', bigSubUser: 'ขอบคุณที่ช่วยพาหนี!', bigSubAll: 'ขอบคุณทุกคน!',
      joinVerb: 'มาช่วยหาทางออก', emptyTop: 'ยังไม่มีใครเลือกประตู<br>พิมพ์ 1 หรือ 2 เลย!',
    },
    effects: Object.fromEntries(KEYS.map((k, i) => [k, { icon: HELP[i][0], label: HELP[i][1], kind: 'mg' + TIER[i], emoji: '' }])),
    defaults: {
      title: 'ตึกเงียบ 19 ชั้น', subtitle: 'พิมพ์ 1 หรือ 2 เลือกประตู ช่วยกันหาทางออกก่อนฟ้าสาง', requestCommand: '', host: 'น้องกล้า',
      gifts: GIFTS.map(([name, diamonds], i) => ({ name, diamonds, effect: KEYS[i] })),
    },
    hud: {
      palette: { sky: '#05070a', sky2: '#11161a', ground: '#1a1f22', ground2: '#0b0d10', accent: '#ffd54a', accent2: '#2dff8f', ink: '#ffffff', panel: 'rgba(8,10,14,.82)', soft: '#ffe9a8' },
      // เป้าเพชรครบ = ไฟกลับมา (ลง 1 ชั้น) • เป้าใจครบ = หัวใจ +1 (mg/escape.js onGoal)
      goals: [{ label: 'เพชร', reward: 'ไฟกลับมา ลงทันที 1 ชั้น', max: 300, effect: 'g8' }, { label: 'ใจ', reward: 'หัวใจ +1', max: 5000, effect: 'g4' }],
      cmds: [], // คำสั่ง 1/2/วิ่ง เกมรับเอง (ไม่ใส่ในคลังคำสั่งของธีมสร้างเอง)
      zones: [],
      boardTitle: 'นักสำรวจ', podiumTitle: 'ผู้ส่องทาง', role: 'ตัวเอก',
    },
  },
};

module.exports = { ESCAPE_THEMES };
