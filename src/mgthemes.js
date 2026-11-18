// มินิเกม 6 ธีม — ข้อมูลธีม (เกม: minigames.js + mg/<เกม>.js • ภาพ: public/minigame-engine.js + public/mg/<เกม>.js)
// ของขวัญทุกเกม = ผลทันทีที่เห็นบนจอ ไม่มีการสุ่มของจากของขวัญ

const GIFTS = [['Rose', 1], ['Finger Heart', 5], ['Rosa', 10], ['Perfume', 20], ['Doughnut', 30], ['Confetti', 100], ['Peeka-Bro', 199], ['Corgi', 299], ['Travel with You', 999]];
const KEYS = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9'];
const TIER = [1, 1, 1, 2, 2, 2, 3, 3, 3];

function build(o) {
  const effects = {};
  KEYS.forEach((k, i) => {
    const t = TIER[i];
    effects[k] = { icon: o.giftIcons[t - 1], label: o.gifts[t - 1], kind: 'mg' + t, emoji: '' };
  });
  return {
    id: o.id, name: o.name, icon: o.icon, layout: 'hud', alias: o.alias, fields: ['host'], requestAction: 'list', bigEffect: 'g9', mg: o.key,
    desc: o.desc,
    texts: {
      gifts: '🎁 ส่งของขวัญ', top: '👑 ผู้สนับสนุน', queue: '📜 คำขอ', queueEmpty: 'ยังไม่มีคำขอ', queueBy: 'โดย',
      hype: '🔥 ความมันส์', hypeFull: 'มันส์สุด ๆ!', bigWord: o.bigWord || 'สุดยอด!', bigSubUser: 'ขอบคุณที่ส่งของขวัญ!', bigSubAll: 'ขอบคุณทุกคน!',
      joinVerb: o.joinVerb || 'เข้าร่วม', emptyTop: 'ยังไม่มีผู้สนับสนุน<br>เป็นคนแรกเลย!',
    },
    effects,
    defaults: {
      title: o.title, subtitle: o.subtitle, requestCommand: '', host: o.host || 'พิธีกร',
      gifts: GIFTS.map(([name, diamonds], i) => ({ name, diamonds, effect: KEYS[i] })),
    },
    hud: {
      palette: o.palette,
      goals: [{ label: 'เพชร', reward: o.goal || 'โบนัสใหญ่ทั้งห้อง', max: 300, effect: 'g9' }, { label: 'ใจ', reward: 'ทั้งห้องได้พลังพิเศษ', max: 3000, effect: 'g6' }],
      cmds: o.cmds,
      zones: [],
      boardTitle: o.board || 'คนเก่งประจำไลฟ์', podiumTitle: 'ผู้สนับสนุน', role: o.host || 'พิธีกร',
      mg: o.extra || {},
    },
  };
}
// ปลา 30 ชนิด (r: c ธรรมดา / r หายาก / l ตำนาน • ซม. min-max • ภาพ: k รูปทรง, c ตัว, b ท้อง, f ครีบ, L ยาว, h สูง, p ลาย)
const FISH = [
  { key: 'nil', name: 'ปลานิล', r: 'c', min: 15, max: 40, k: 'fish', c: '#8aa0b8', b: '#c8d4e0', f: '#5a6a8a', L: 11, h: 6, p: 'stripe' },
  { key: 'tubtim', name: 'ปลาทับทิม', r: 'c', min: 15, max: 38, k: 'fish', c: '#e87a6a', b: '#ffc8b8', f: '#c84a3a', L: 11, h: 6 },
  { key: 'tapian', name: 'ปลาตะเพียน', r: 'c', min: 10, max: 30, k: 'fish', c: '#c8c8b0', b: '#f2f0e0', f: '#e8a83a', L: 10, h: 6 },
  { key: 'chon', name: 'ปลาช่อน', r: 'c', min: 25, max: 70, k: 'fish', c: '#4a5a3a', b: '#a8a888', f: '#3a4a2a', L: 15, h: 4, p: 'spot' },
  { key: 'duk', name: 'ปลาดุก', r: 'c', min: 20, max: 50, k: 'cat', c: '#4a4a5a', b: '#8a8a9a', f: '#3a3a4a', L: 14, h: 4 },
  { key: 'mor', name: 'ปลาหมอ', r: 'c', min: 8, max: 20, k: 'fish', c: '#6a7a5a', b: '#b8b898', f: '#4a5a3a', L: 9, h: 5 },
  { key: 'kradi', name: 'ปลากระดี่', r: 'c', min: 5, max: 12, k: 'fish', c: '#8ab8a8', b: '#d8f0e8', f: '#5a8a7a', L: 8, h: 4, p: 'spot' },
  { key: 'salid', name: 'ปลาสลิด', r: 'c', min: 10, max: 22, k: 'fish', c: '#7a8a6a', b: '#c8d0b0', f: '#5a6a4a', L: 9, h: 5, p: 'stripe' },
  { key: 'siw', name: 'ปลาซิว', r: 'c', min: 3, max: 8, k: 'fish', c: '#c8d8e8', b: '#ffffff', f: '#e8453c', L: 7, h: 3 },
  { key: 'bu', name: 'ปลาบู่', r: 'c', min: 15, max: 45, k: 'fish', c: '#8a7a5a', b: '#c8b898', f: '#6a5a3a', L: 12, h: 4, p: 'spot' },
  { key: 'kung', name: 'กุ้งก้ามกราม', r: 'c', min: 12, max: 30, k: 'shrimp', c: '#3a7ab8', b: '#ff8a3d', f: '#2a5a8a', L: 11, h: 4 },
  { key: 'pu', name: 'ปูนา', r: 'c', min: 5, max: 10, k: 'crab', c: '#6a5a3a', b: '#a88a5a', f: '#4a3a2a', L: 8, h: 5 },
  { key: 'khayaeng', name: 'ปลาแขยง', r: 'c', min: 10, max: 30, k: 'cat', c: '#b8a878', b: '#e8e0c0', f: '#8a7a4a', L: 11, h: 4 },
  { key: 'kod', name: 'ปลากด', r: 'c', min: 20, max: 60, k: 'cat', c: '#9aa0a8', b: '#d8dce0', f: '#6a7078', L: 13, h: 4 },
  { key: 'sawai', name: 'ปลาสวาย', r: 'c', min: 30, max: 90, k: 'fish', c: '#6a7a8a', b: '#c8d0d8', f: '#4a5a6a', L: 15, h: 6 },
  { key: 'rad', name: 'ปลาแรด', r: 'c', min: 30, max: 70, k: 'fish', c: '#8a8a7a', b: '#d0d0c0', f: '#6a6a5a', L: 13, h: 8 },
  { key: 'yisok', name: 'ปลายี่สก', r: 'r', min: 40, max: 100, k: 'fish', c: '#c8a85a', b: '#f2e8c8', f: '#3a3a3a', L: 15, h: 6, p: 'stripe' },
  { key: 'suea', name: 'ปลาเสือตอ', r: 'r', min: 15, max: 40, k: 'fish', c: '#e8c87a', b: '#fff0c8', f: '#1b1426', L: 11, h: 7, p: 'tiger' },
  { key: 'krai', name: 'ปลากราย', r: 'r', min: 40, max: 100, k: 'knife', c: '#b8c0c8', b: '#e8ecf0', f: '#7a8088', L: 16, h: 6, p: 'spot' },
  { key: 'kaho', name: 'ปลากะโห้', r: 'r', min: 60, max: 150, k: 'fish', c: '#a8b0b8', b: '#e0e4e8', f: '#7a8088', L: 17, h: 8 },
  { key: 'betta', name: 'ปลากัดป่า', r: 'r', min: 4, max: 7, k: 'betta', c: '#c83a5a', b: '#3a5ac8', f: '#5fe0ff', L: 9, h: 5 },
  { key: 'arowana', name: 'ปลาตะพัด', r: 'r', min: 50, max: 90, k: 'fish', c: '#e8a83a', b: '#fff0c0', f: '#e8453c', L: 17, h: 5, p: 'scale' },
  { key: 'chado', name: 'ปลาชะโด', r: 'r', min: 50, max: 120, k: 'fish', c: '#3a4a3a', b: '#8a9a7a', f: '#e8453c', L: 17, h: 5, p: 'spot' },
  { key: 'koi', name: 'ปลาคาร์ฟลายทอง', r: 'r', min: 30, max: 80, k: 'fish', c: '#ffffff', b: '#ffffff', f: '#ff8a3d', L: 13, h: 6, p: 'koi' },
  { key: 'tao', name: 'เต่านา', r: 'r', min: 15, max: 30, k: 'turtle', c: '#5a6a3a', b: '#c8b878', f: '#3a4a2a', L: 11, h: 7 },
  { key: 'eel', name: 'ปลาไหลไฟฟ้าเรืองแสง', r: 'r', when: 'night', min: 40, max: 120, k: 'eel', c: '#3a5a8a', b: '#5fe0ff', f: '#ffd166', L: 18, h: 3 },
  { key: 'buek', name: 'ปลาบึกยักษ์', r: 'l', min: 150, max: 300, k: 'cat', c: '#7a8088', b: '#c8ccd0', f: '#5a6068', L: 20, h: 8 },
  { key: 'gray', name: 'ปลากระเบนทอง', r: 'l', min: 80, max: 200, k: 'ray', c: '#ffd166', b: '#fff3c4', f: '#e0a81e', L: 18, h: 12 },
  { key: 'ekoi', name: 'ปลาคาร์ฟจักรพรรดิ', r: 'l', when: 'weekend', min: 80, max: 140, k: 'fish', c: '#ffd166', b: '#fff8d8', f: '#e8453c', L: 17, h: 8, p: 'scale' },
  { key: 'dshrimp', name: 'กุ้งมังกรเพชร', r: 'l', when: 'night', min: 30, max: 60, k: 'shrimp', c: '#5fe0ff', b: '#b28cff', f: '#ffffff', L: 14, h: 5 },
];
const JUNK = [{ key: 'boot', name: 'รองเท้าเก่า' }, { key: 'can', name: 'กระป๋อง' }, { key: 'weed', name: 'สาหร่ายพันเบ็ด' }];
const PAL = (accent, accent2, panel = 'rgba(27,20,38,.92)', soft = '#ffd166') => ({ accent, accent2, panel, soft, ink: '#ffffff', body: ['#e8453c', '#3b6fd8', '#ffd166', '#5fd068', '#b28cff', '#ff8a3d', '#22d3c5', '#ff4fa3'] });

const MG_THEMES = {
  boatrace: build({
    id: 'boatrace', key: 'boat', name: 'แข่งเรือยาว', icon: '🚣', alias: 'ramwong', joinVerb: 'ลงเรือ',
    desc: 'แข่งเรือยาวแบ่งทีมแดง-น้ำเงิน มองจากมุมสูง — คนดูเป็นฝีพาย พิมพ์ “พาย” จ้ำพร้อมกัน รอบละ ~2 นาที ของขวัญ = เทอร์โบ/กลองเร่ง/เรือพลังมังกร',
    title: 'แข่งเรือยาว LIVE', subtitle: 'คอมเมนต์ = ลงเรือ · พิมพ์ “พาย” จ้ำให้สุดแรง', host: 'นายท่า',
    gifts: ['เทอร์โบพุ่งไปข้างหน้า', 'กลองเร่งจังหวะ ×2', 'เรือพลังมังกร!'], giftIcons: ['💨', '🥁', '🐉'],
    palette: PAL('#1f6fd0', '#e8453c'), goal: 'เรือพลังมังกรทั้งสองลำ', board: 'ฝีพายตัวจริง',
    cmds: [{ c: 'พาย', a: 'จ้ำพายให้เรือทีมตัวเอง', emoji: '🚣', alias: ['พายเลย', 'จ้ำ', 'ซู่', 'row'] }, { c: 'ทีมแดง', a: 'ย้ายไปทีมแดง', emoji: '🔴' }, { c: 'ทีมน้ำเงิน', a: 'ย้ายไปทีมน้ำเงิน', emoji: '🔵' }],
  }),
  angler: build({
    id: 'angler', key: 'fish', name: 'ตกปลาสะสม', icon: '🎣', alias: 'fishing', joinVerb: 'มาตกปลา',
    desc: 'ท่าเรือตกปลายามเย็น เห็นปลาว่ายใต้น้ำ — พิมพ์ “ตก” เหวี่ยงเบ็ด สะสมปลา 30 ชนิดลงสมุดปลา (เก็บข้ามไลฟ์) มีสถิติปลาตัวใหญ่สุดประจำสัปดาห์',
    title: 'ตกปลาสะสม LIVE', subtitle: 'พิมพ์ “ตก” เหวี่ยงเบ็ด · สะสมปลาลงสมุด', host: 'ลุงเจ้าของบ่อ',
    gifts: ['โปรยอาหารปลา ฝูงปลาแห่มา', 'ไฟส่องใต้น้ำ', 'วาฬยักษ์โผล่พ่นน้ำ!'], giftIcons: ['🍞', '🔦', '🐋'],
    palette: PAL('#1f7fb0', '#ffd166'), goal: 'วาฬยักษ์โผล่', board: 'นักตกปลาตัวยง',
    cmds: [{ c: 'ตก', a: 'เหวี่ยงเบ็ดตกปลา', emoji: '🎣', alias: ['ตกปลา', 'เหวี่ยง', 'fish'] }, { c: 'ดึง', a: 'ดึงเบ็ดตอนปลากิน (ได้ตัวใหญ่ขึ้น)', emoji: '💪' }, { c: 'สมุด', a: 'ดูปลาที่สะสม', emoji: '📖', alias: ['สมุดปลา'] }, { c: 'ร้าน', a: 'ร้านอุปกรณ์ (ใช้เหรียญ)', emoji: '🛒' }],
    extra: { fish: FISH, junk: JUNK },
  }),
  village: build({
    id: 'village', key: 'village', name: 'หมู่บ้านของเรา', icon: '🌾', alias: 'krathong', joinVerb: 'ย้ายเข้าหมู่บ้าน',
    desc: 'ทั้งห้องช่วยกันทำฟาร์มสร้างหมู่บ้านที่โตข้ามไลฟ์ — พิมพ์ “ปลูก” “รดน้ำ” “เก็บ” ผลผลิตครบปลดล็อกสิ่งก่อสร้างใหม่ สลักชื่อคนช่วยสร้าง',
    title: 'หมู่บ้านของเรา LIVE', subtitle: 'พิมพ์ “ปลูก” “รดน้ำ” “เก็บ” ช่วยกันสร้างหมู่บ้าน', host: 'ผู้ใหญ่บ้าน',
    gifts: ['ปุ๋ยวิเศษ ผักโตทันที', 'ช่างมาช่วยสร้าง', 'เทศกาลหมู่บ้าน!'], giftIcons: ['🌱', '🔨', '🎆'],
    palette: PAL('#3f9a4a', '#ffd166'), goal: 'เทศกาลหมู่บ้าน', board: 'ชาวนาดีเด่น',
    cmds: [{ c: 'ปลูก', a: 'หว่านเมล็ดในแปลงว่าง', emoji: '🌱' }, { c: 'รดน้ำ', a: 'ผักโตไวขึ้น', emoji: '💧', alias: ['รด'] }, { c: 'เก็บ', a: 'เก็บผลผลิตเข้าคลัง', emoji: '🧺', alias: ['เก็บเกี่ยว'] }, { c: 'จอง', a: 'จองแปลงของตัวเอง', emoji: '🏷️' }, { c: 'ไล่', a: 'ไล่อีกาตอนบุก', emoji: '🐦' }, { c: 'ขาย', a: 'ขายผักให้พ่อค้าเร่', emoji: '💰' }],
  }),
  pixelquiz: build({
    id: 'pixelquiz', key: 'quiz', name: 'ทายภาพพิกเซล', icon: '🖼️', alias: 'disco', joinVerb: 'เข้าเกมโชว์',
    desc: 'เกมโชว์ทายภาพ — ภาพพิกเซลค่อย ๆ เปิดทีละช่อง พิมพ์คำตอบในคอมเมนต์ ตอบถูกเร็วได้แต้มมาก มีคำใบ้ และบอก “ใกล้แล้ว!”',
    title: 'ทายภาพพิกเซล LIVE', subtitle: 'ภาพค่อย ๆ เปิด · พิมพ์คำตอบในคอมเมนต์', host: 'พิธีกรเกมโชว์',
    gifts: ['เปิดภาพทันที 1 ช่อง', 'เปิดคำใบ้', 'เปิดภาพครึ่งหนึ่ง!'], giftIcons: ['🔍', '💡', '✨'],
    palette: PAL('#8a3fd1', '#ffd166'), goal: 'รอบโบนัสแต้มคูณสอง', board: 'เซียนทายภาพ',
    cmds: [{ c: 'คะแนน', a: 'ดูแต้มทายภาพของตัวเอง', emoji: '🏆', alias: ['แต้มทาย'] }],
  }),
  kitchen: build({
    id: 'kitchen', key: 'kitchen', name: 'ครัวช่วยกันทำ', icon: '🍳', alias: 'concert', joinVerb: 'เข้าครัว',
    desc: 'ครัวร้านอาหารไทย — บิลออเดอร์มาเรื่อย ๆ พิมพ์ชื่อวัตถุดิบให้ครบตามบิลแล้วพิมพ์ “เสิร์ฟ” ก่อนหมดเวลา ทำทันได้ดาวและทิป คอมโบยิ่งสูงยิ่งได้มาก',
    title: 'ครัวช่วยกันทำ LIVE', subtitle: 'พิมพ์วัตถุดิบให้ครบตามบิล ก่อนหมดเวลา', host: 'เชฟใหญ่',
    gifts: ['ไฟแรง ทำไวขึ้น', 'ต่อเวลาทุกบิล', 'ลูกค้า VIP ทิปหนัก!'], giftIcons: ['🔥', '⏰', '💎'],
    palette: PAL('#e8453c', '#ffd166'), goal: 'ลูกค้า VIP ทั้งร้าน', board: 'เชฟมือทอง',
    cmds: [{ c: 'เสิร์ฟ', a: 'ส่งจานที่ครบแล้ว', emoji: '🍽️', alias: ['เสริฟ', 'ส่ง'] }, { c: 'หั่น', a: 'อยู่สถานีหั่น (ผัก พริก กระเทียม มะนาว)', emoji: '🔪' }, { c: 'ผัด', a: 'อยู่สถานีผัด (หมู ไก่ กุ้ง ไข่)', emoji: '🔥' }, { c: 'ต้ม', a: 'อยู่สถานีต้ม (ข้าว เส้น ซอส)', emoji: '🍲' }],
  }),
  castle: build({
    id: 'castle', key: 'castle', name: 'ป้องกันปราสาท', icon: '🏰', alias: 'adventure', joinVerb: 'ขึ้นกำแพง',
    desc: 'มอนสเตอร์บุกเป็นระลอก 3 เลน — พิมพ์ “ซ้าย” “กลาง” “ขวา” ไปเฝ้าเลนนั้น พิมพ์ “ยิง” ยิงศัตรูในเลนตัวเอง ทุก 10 ระลอกเจอบอส',
    title: 'ป้องกันปราสาท LIVE', subtitle: 'พิมพ์ “ซ้าย” “กลาง” “ขวา” แล้ว “ยิง”', host: 'แม่ทัพ',
    gifts: ['ฝนธนูทั้งสนาม', 'กำแพงไฟกันเลน', 'มังกรเผาทั้งสนาม!'], giftIcons: ['🏹', '🔥', '🐉'],
    palette: PAL('#3b6fd8', '#ffd166'), goal: 'มังกรเผาทั้งสนาม', board: 'มือธนูแม่นสุด',
    cmds: [{ c: 'ยิง', a: 'ยิงศัตรูในเลนตัวเอง', emoji: '🏹', alias: ['ยิงๆ', 'shoot'] }, { c: 'ซ้าย', a: 'ไปเฝ้าเลนซ้าย', emoji: '⬅️' }, { c: 'กลาง', a: 'ไปเฝ้าเลนกลาง', emoji: '⬆️' }, { c: 'ขวา', a: 'ไปเฝ้าเลนขวา', emoji: '➡️' }, { c: 'ไฟ', a: 'โหวตอัปเกรดป้อมไฟ (ช่วงพัก)', emoji: '🔥' }, { c: 'น้ำแข็ง', a: 'โหวตอัปเกรดป้อมน้ำแข็ง', emoji: '❄️' }, { c: 'ธนู', a: 'โหวตอัปเกรดป้อมธนู', emoji: '🏹' }],
  }),
};

module.exports = { MG_THEMES, FISH, JUNK };
