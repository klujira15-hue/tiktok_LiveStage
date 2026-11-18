// ธีม "หมูกระทะริมทาง" — ฉาก 3D low-poly (public/mookata-engine.js วาดด้วย three.js)
// คนดูนั่งล้อมโต๊ะปิ้งหมู • พิมพ์ “ปิ้ง” “ชน” “แซ่บ” • ของขวัญ = เติมหมู / ถาดทะเล / บุฟเฟ่ต์ทั้งร้าน

const GIFTS = [['Rose', 1], ['Finger Heart', 5], ['Rosa', 10], ['Perfume', 20], ['Doughnut', 30], ['Confetti', 100], ['Peeka-Bro', 199], ['Corgi', 299], ['Travel with You', 999]];
const KEYS = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9'];
const TIER = [1, 1, 1, 2, 2, 2, 3, 3, 3];
const LABEL = ['เติมหมูสามชั้น', 'เติมหมูสามชั้น', 'เติมหมูสันคอ', 'ถาดทะเลมาเสิร์ฟ', 'ชีสยืด + ถาดทะเล', 'ถาดทะเลจัดเต็ม', 'บุฟเฟ่ต์ทั้งร้าน!', 'บุฟเฟ่ต์ทั้งร้าน!', 'บุฟเฟ่ต์ทั้งร้าน!'];
const ICON = ['🥓', '🥓', '🥩', '🦐', '🧀', '🦐', '🎉', '🎉', '🎉'];

const effects = {};
KEYS.forEach((k, i) => (effects[k] = { icon: ICON[i], label: LABEL[i], kind: 'mk' + TIER[i], emoji: '' }));

const MOOKATA_THEMES = {
  mookata: {
    id: 'mookata', name: 'หมูกระทะริมทาง', icon: '🐷', layout: 'hud', alias: 'ramwong', fields: ['host'], requestAction: 'list', bigEffect: 'g9', mookata: true,
    desc: 'ร้านหมูกระทะยามค่ำแบบ 3D — คนดูนั่งล้อมโต๊ะปิ้งหมู พิมพ์ “ปิ้ง” “ชน” “แซ่บ” ของขวัญเติมหมู ถาดทะเล จนถึงบุฟเฟ่ต์ทั้งร้าน',
    texts: {
      gifts: '🎁 ส่งของขวัญ', top: '👑 เสี่ยเลี้ยงหมูกระทะ', queue: '📜 คำขอ', queueEmpty: 'ยังไม่มีคำขอ', queueBy: 'โดย',
      hype: '🔥 ไฟกระทะ', hypeFull: 'ชนแก้วทั้งร้าน!', bigWord: 'ฉ่า!', bigSubUser: 'ขอบคุณที่เลี้ยงหมูกระทะ!', bigSubAll: 'ขอบคุณทุกคน!',
      joinVerb: 'เข้าร้าน', emptyTop: 'ยังไม่มีใครเลี้ยง<br>เป็นเสี่ยคนแรกเลย!',
    },
    effects,
    defaults: {
      title: 'หมูกระทะ LIVE', subtitle: 'พิมพ์ “ปิ้ง” คีบหมู · ส่งของขวัญเติมหมูให้ทั้งร้าน', requestCommand: '', host: 'เจ้าของร้าน',
      gifts: GIFTS.map(([name, diamonds], i) => ({ name, diamonds, effect: KEYS[i] })),
    },
    hud: {
      palette: { accent: '#ff4fa3', accent2: '#ff9f43', panel: 'rgba(30,14,30,.86)', soft: '#ffb3d1', ink: '#ffffff', body: ['#ff6b6b', '#4dabf7', '#ffd43b', '#69db7c', '#b197fc', '#ff922b', '#f783ac', '#38d9a9'] },
      goals: [{ label: 'เพชร', reward: 'บุฟเฟ่ต์ทั้งร้าน!', max: 300, effect: 'g9' }, { label: 'ใจ', reward: 'ชนแก้วทั้งร้าน', max: 3000, effect: 'g6' }],
      cmds: [
        { c: 'ปิ้ง', a: 'คีบหมูลงกระทะ ฉ่า!', kind: 'zone', zone: 'grill', emoji: '🥢', alias: ['ปิ้งหมู', 'ย่าง'] },
        { c: 'ชน', a: 'ทั้งโต๊ะชนแก้ว', kind: 'zone', zone: 'cheers', emoji: '🍻', alias: ['ชนแก้ว', 'หมดแก้ว', 'ชนๆ'] },
        { c: 'แซ่บ', a: 'เผ็ดจนควันออกหู', kind: 'zone', zone: 'spicy', emoji: '🌶️', alias: ['เผ็ด', 'แซบ'] },
      ],
      zones: [{ id: 'grill', label: 'ปิ้งหมู', stat: 'ปิ้งแล้ว {n} ชิ้น' }, { id: 'cheers', label: 'ชนแก้ว', stat: 'ชนแก้ว {n} ครั้ง' }, { id: 'spicy', label: 'แซ่บ', stat: 'แซ่บ {n} ครั้ง' }],
      boardTitle: 'สายปิ้งตัวจริง', podiumTitle: 'เสี่ยเลี้ยงหมูกระทะ', role: 'เจ้าของร้าน',
      mk: { gifts: [LABEL[0], LABEL[3], LABEL[6]] },
    },
  },
};

module.exports = { MOOKATA_THEMES };
