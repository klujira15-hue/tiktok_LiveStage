// เกมปีนขึ้นฟ้า 2 ฉาก — ข้อมูลธีม (เกม: minigames.js + mg/climb.js • ภาพ: public/climb-engine.js)
// น้องเด้งกระโดดขึ้นเอง • ของขวัญ = แกล้งให้ตก (ผลทันที ไม่สุ่ม) • พิมพ์ "ฮึบ" = โล่ • กดใจ = จรวด
'use strict';

const GIFTS = [['Rose', 1], ['Finger Heart', 5], ['Rosa', 10], ['Perfume', 20], ['Doughnut', 30], ['Confetti', 100], ['Peeka-Bro', 199], ['Corgi', 299], ['Travel with You', 999]];
const KEYS = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9'];
const TIER = [1, 1, 1, 2, 2, 2, 3, 3, 3];
const PRANKS = [
  ['🍌', 'วางเปลือกกล้วย'], ['💨', 'ลมพัด'], ['🧱', 'แท่นหลอกพัง'], ['🌫️', 'หมอกบังทาง'], ['🫳', 'มือยักษ์ผลัก'],
  ['🦅', 'นกโฉบ'], ['🌧️', 'ฝนตกแท่นลื่น'], ['💣', 'ระเบิดแท่น 3 อัน'], ['🌋', 'แผ่นดินไหวตก 30 ม.!'],
];

function build(o) {
  const effects = {};
  KEYS.forEach((k, i) => (effects[k] = { icon: PRANKS[i][0], label: PRANKS[i][1], kind: 'mg' + TIER[i], emoji: '' }));
  return {
    id: o.id, name: o.name, icon: o.icon, layout: 'hud', alias: o.alias, fields: ['host'], requestAction: 'list', bigEffect: 'g9', mg: 'climb',
    desc: o.desc,
    texts: {
      gifts: '🎁 ส่งของขวัญ = แกล้ง', top: '😈 จอมแกล้ง', queue: '📜 คำขอ', queueEmpty: 'ยังไม่มีคำขอ', queueBy: 'โดย',
      hype: '🔥 ความมันส์', hypeFull: 'มันส์สุด ๆ!', bigWord: 'แกล้งหนัก!', bigSubUser: 'ขอบคุณที่ส่งของขวัญ!', bigSubAll: 'ขอบคุณทุกคน!',
      joinVerb: 'มาเชียร์น้องเด้ง', emptyTop: 'ยังไม่มีใครแกล้ง<br>ลองส่งกุหลาบดูสิ!',
    },
    effects,
    defaults: {
      title: o.title, subtitle: 'ส่งของขวัญแกล้งน้องเด้งให้ตก • พิมพ์ “ฮึบ” ช่วยกันเชียร์', requestCommand: '', host: 'น้องเด้ง',
      gifts: GIFTS.map(([name, diamonds], i) => ({ name, diamonds, effect: KEYS[i] })),
    },
    hud: {
      palette: o.palette,
      // เป้าเพชรครบ = พายุจอมแกล้ง (ปีนช้า) • เป้าใจครบ = จรวดฟรี +20 ม. (mg/climb.js onGoal)
      goals: [{ label: 'เพชร', reward: 'พายุจอมแกล้ง ปีนช้า 15 วิ', max: 300, effect: 'g2' }, { label: 'ใจ', reward: 'จรวดฟรี +20 ม.', max: 5000, effect: 'g2' }],
      cmds: [{ c: 'ฮึบ', a: 'ช่วยน้องสะสมโล่กันแกล้ง', kind: 'emote', emoji: '💪', alias: ['สู้', 'สู้ๆ', 'เชียร์'] }],
      zones: [],
      boardTitle: 'ทีมช่วยน้อง', podiumTitle: 'จอมแกล้ง', role: 'ตัวเอก',
      climb: { scene: o.scene, zones: o.zones },
    },
  };
}

const CLIMB_THEMES = {
  climbcity: build({
    id: 'climbcity', name: 'ปีนตึกนีออน', icon: '🏙️', alias: 'disco', scene: 'city', title: 'ปีนตึกนีออน LIVE',
    desc: 'เกมปีนตึกกลางเมืองยามค่ำ — น้องเด้งกระโดดขึ้นเองจากตลาดนัดถึงอวกาศ คนดูส่งของขวัญแกล้งให้ตก (กล้วย ลม มือยักษ์ นก ระเบิด แผ่นดินไหว) พิมพ์ "ฮึบ" ช่วยกันทำโล่ กดใจเติมจรวด',
    zones: ['🌃 ตลาดนัด', '🏢 ตึกระฟ้า', '🌆 ดาดฟ้า', '☁️ เหนือเมฆ', '🚀 อวกาศ'],
    palette: { sky: '#0b0726', sky2: '#2a1150', ground: '#2b1658', ground2: '#1d0f3d', accent: '#ff4fd8', accent2: '#7c5cff', ink: '#ffffff', panel: 'rgba(18,12,48,.84)', soft: '#ffd6f5' },
  }),
  climbsky: build({
    id: 'climbsky', name: 'เกาะลอยฟ้า', icon: '🏝️', alias: 'songkran', scene: 'sky', title: 'เกาะลอยฟ้า LIVE',
    desc: 'เกมกระโดดขึ้นเกาะลอยฟ้าจากทุ่งดอกไม้ถึงปราสาทบนเมฆ — น้องเด้งกระโดดเอง คนดูส่งของขวัญแกล้งให้ตก พิมพ์ "ฮึบ" ช่วยกันทำโล่ กดใจเติมจรวด',
    zones: ['🌼 ทุ่งดอกไม้', '🍄 ป่าเห็ด', '☁️ ทะเลเมฆ', '🌈 สะพานรุ้ง', '🏰 ปราสาท'],
    palette: { sky: '#7fd3ff', sky2: '#fff3d9', ground: '#6ccf5a', ground2: '#b07a4a', accent: '#ffd23f', accent2: '#ff8fb5', ink: '#2a1a3a', panel: 'rgba(255,255,255,.86)', soft: '#ff6fae' },
  }),
};

module.exports = { CLIMB_THEMES };
