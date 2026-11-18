// ธีม "ปาร์ตี้ผจญภัย" — เกมพิกเซลอาร์ตเล่นกับคนดู (public/adventure-engine.js วาดฉาก • adventure.js คุมเกม/เก็บเลเวลคนดูข้ามไลฟ์)
// คนดู = นักผจญภัยในปาร์ตี้ • พิมพ์ “ตี” “เวท” “ฮีล” • ทางแยกโหวต “ซ้าย”/“ขวา” • 3 ขั้นฉาก แต่ละขั้นมีบอสประจำ

const GIFTS = [['Rose', 1], ['Finger Heart', 5], ['Rosa', 10], ['Perfume', 20], ['Doughnut', 30], ['Confetti', 100], ['Peeka-Bro', 199], ['Corgi', 299], ['Travel with You', 999]];
const KEYS = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9'];
const TIER = [1, 1, 1, 2, 2, 2, 3, 3, 3];
const LABEL = ['ลูกไฟถล่มศัตรู', 'ลูกไฟถล่มศัตรู', 'ลูกไฟถล่มศัตรู', 'หมาป่าเงินมาช่วยรบ', 'หมาป่าเงินมาช่วยรบ', 'หมาป่าเงินมาช่วยรบ', 'มังกรผู้พิทักษ์!', 'มังกรผู้พิทักษ์!', 'มังกรผู้พิทักษ์!'];
const ICON = ['🔥', '🔥', '🔥', '🐺', '🐺', '🐺', '🐉', '🐉', '🐉'];

const effects = {};
KEYS.forEach((k, i) => (effects[k] = { icon: ICON[i], label: LABEL[i], kind: 'adv' + TIER[i], emoji: '' }));

// ขั้นฉาก: แต่ละขั้น 5 ด่าน (ด่าน 5 = บอสประจำขั้น) • มอนสเตอร์ = ชื่อสไปรต์ใน adventure-engine.js
const STAGES = [
  { key: 'forest', name: 'ป่าลึก', icon: '🌲', mobs: ['slime', 'shroom', 'bat'], boss: { key: 'shroomking', name: 'ราชาเห็ดยักษ์' } },
  { key: 'cave', name: 'ถ้ำคริสตัล', icon: '💎', mobs: ['bat', 'cslime', 'spider'], boss: { key: 'spiderqueen', name: 'ราชินีแมงมุมคริสตัล' } },
  { key: 'castle', name: 'ปราสาทบอส', icon: '🏰', mobs: ['skeleton', 'wisp', 'pshroom'], boss: { key: 'golem', name: 'ราชาหินตาไฟ' } },
];
const MOB_NAMES = { gslime: 'สไลม์ทองคำ', slime: 'สไลม์', shroom: 'เห็ดพิษ', bat: 'ค้างคาว', cslime: 'สไลม์คริสตัล', spider: 'แมงมุมถ้ำ', skeleton: 'ทหารกระดูก', wisp: 'ผีไฟ', pshroom: 'เห็ดเงา' };
// อาชีพ: สุ่มจากไอดีคนดู (ฝั่งเซิร์ฟเวอร์กับหน้าเวทีใช้สูตรเดียวกัน)
const CLASSES = [
  { key: 'sword', name: 'นักดาบ' },
  { key: 'mage', name: 'นักเวท' },
  { key: 'archer', name: 'นักธนู' },
  { key: 'cleric', name: 'นักบวช' },
];
// อาชีพวิวัฒน์ตามเลเวล (ร่างบนจอเปลี่ยนด้วย)
const TIER_LV = [1, 10, 25, 50];
const TIER_NAMES = {
  sword: ['นักดาบ', 'อัศวิน', 'อัศวินศักดิ์สิทธิ์', 'ปรมาจารย์ดาบ'],
  mage: ['นักเวท', 'จอมเวท', 'ปราชญ์เวท', 'อาร์คเมจ'],
  archer: ['นักธนู', 'พรานป่า', 'มือธนูเงา', 'ราชันธนู'],
  cleric: ['นักบวช', 'ผู้รักษา', 'ผู้พิทักษ์แสง', 'นักบุญแห่งแสง'],
};
const tierOf = (lv) => (lv >= 50 ? 3 : lv >= 25 ? 2 : lv >= 10 ? 1 : 0);
// ร้านค้า (ใช้ทองจากการเล่น) — ของแต่งตัว เก็บข้ามไลฟ์ • quest = ได้จากภารกิจไลฟ์เท่านั้น
const ITEMS = {
  cape: { name: 'ผ้าคลุมแดง', slot: 'back', cost: 60, alias: ['ผ้าคลุม', 'เสื้อคลุม', 'cape'] },
  helm: { name: 'หมวกเหล็ก', slot: 'head', cost: 100, alias: ['หมวก', 'หมวกเกราะ', 'helm'] },
  pet: { name: 'สไลม์จิ๋ว', slot: 'pet', cost: 200, alias: ['สไลม์', 'สัตว์เลี้ยง', 'pet'] },
  wings: { name: 'ปีกนางฟ้า', slot: 'back', cost: 400, alias: ['ปีก', 'wings'] },
  aura: { name: 'ออร่าไฟ', slot: 'aura', cost: 800, alias: ['ออร่า', 'aura'] },
  band: { name: 'ผ้าคาดหัวนักผจญภัย', slot: 'head', cost: 0, quest: true, alias: ['ผ้าคาดหัว'] },
  gcrown: { name: 'มงกุฎผู้พิชิต', slot: 'head', cost: 0, quest: true, alias: ['มงกุฎ'] },
};
// ภารกิจของไลฟ์ (ทั้งห้องช่วยกัน) — ครบแล้วไปภารกิจถัดไป วนตามลำดับ
const QUESTS = [
  { kind: 'boss', need: 3, text: 'ล้มบอสให้ได้ 3 ตัว', reward: { item: 'band' }, rtext: 'ผ้าคาดหัวนักผจญภัย ทุกคน' },
  { kind: 'kill', need: 20, text: 'ล้มฝูงมอนสเตอร์ 20 ฝูง', reward: { gold: 40 }, rtext: 'ทอง 40 ทุกคน' },
  { kind: 'guard', need: 3, text: 'กันท่าไม้ตายบอสสำเร็จ 3 ครั้ง', reward: { gold: 60 }, rtext: 'ทอง 60 ทุกคน' },
  { kind: 'boss', need: 6, text: 'ล้มบอสให้ได้ 6 ตัว', reward: { item: 'gcrown' }, rtext: 'มงกุฎผู้พิชิต ทุกคน' },
];
function classOf(id) {
  let h = 2166136261;
  for (const ch of String(id)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return CLASSES[(h >>> 0) % 4].key;
}

const ADV_THEMES = {
  adventure: {
    id: 'adventure', name: 'ปาร์ตี้ผจญภัย', icon: '⚔️', layout: 'hud', alias: 'concert', fields: ['host'], requestAction: 'list', bigEffect: 'g9', adv: true,
    desc: 'เกมผจญภัยภาพพิกเซล — คนดูเข้าปาร์ตี้เป็นนักดาบ/นักเวท/นักธนู/นักบวช พิมพ์ “ตี” “เวท” “ฮีล” ช่วยกันสู้มอนสเตอร์ 3 ขั้นฉาก มีบอสประจำ เลเวลคนดูเก็บข้ามไลฟ์',
    texts: {
      gifts: '🎁 ส่งของขวัญ', top: '👑 ผู้สนับสนุนกองทัพ', queue: '📜 คำขอ', queueEmpty: 'ยังไม่มีคำขอ', queueBy: 'โดย',
      hype: '🔥 ไฟนักสู้', hypeFull: 'ทั้งปาร์ตี้ฮึกเหิม!', bigWord: 'ชนะ!', bigSubUser: 'ขอบคุณที่ช่วยปาร์ตี้!', bigSubAll: 'ขอบคุณทุกคน!',
      joinVerb: 'เข้าปาร์ตี้', emptyTop: 'ยังไม่มีผู้นำทัพ<br>ส่งของขวัญเป็นคนแรกเลย!',
    },
    effects,
    defaults: {
      title: 'ปาร์ตี้ผจญภัย LIVE', subtitle: 'คอมเมนต์ = เข้าปาร์ตี้ · พิมพ์ “ตี” ช่วยกันสู้', requestCommand: '', host: 'หัวหน้ากิลด์',
      gifts: GIFTS.map(([name, diamonds], i) => ({ name, diamonds, effect: KEYS[i] })),
    },
    hud: {
      palette: { accent: '#7a3fd1', accent2: '#e0a81e', panel: 'rgba(27,20,38,.9)', soft: '#ffd166', ink: '#ffffff', body: ['#3b6fd8', '#8a3fd1', '#3f9a4a', '#f2efe6', '#e8453c', '#ff8a3d', '#22d3c5', '#ff4fa3'] },
      goals: [{ label: 'เพชร', reward: 'มังกรผู้พิทักษ์!', max: 300, effect: 'g9' }, { label: 'ใจ', reward: 'ท่าไม้ตายรวม', max: 3000, effect: 'g6' }],
      cmds: [
        { c: 'ตี', a: 'โจมตีศัตรู', kind: 'zone', zone: 'atk', emoji: '⚔️', alias: ['โจมตี', 'ฟัน', 'ยิง', 'attack', 'hit'] },
        { c: 'เวท', a: 'ยิงเวท ดาเมจสูง', kind: 'zone', zone: 'magic', emoji: '✨', alias: ['เวทมนตร์', 'เวทย์', 'magic'] },
        { c: 'ฮีล', a: 'รักษาทั้งทีม', kind: 'zone', zone: 'heal', emoji: '💚', alias: ['รักษา', 'heal', 'ฮิล'] },
        { c: 'กัน', a: 'ช่วยกันรับท่าไม้ตายบอส (ตอนบอสชาร์จ)', kind: 'zone', zone: 'guard', emoji: '🛡️', alias: ['ป้องกัน', 'บล็อก', 'กันๆ', 'block', 'guard'] },
      ],
      zones: [{ id: 'atk', label: 'โจมตี', stat: 'ตีไป {n} ครั้ง' }, { id: 'magic', label: 'เวท', stat: 'ร่ายเวท {n} ครั้ง' }, { id: 'heal', label: 'ฮีล', stat: 'ฮีล {n} ครั้ง' }],
      boardTitle: 'ตีแรงสุด', podiumTitle: 'ผู้สนับสนุนกองทัพ', role: 'หัวหน้ากิลด์',
      adv: { stages: STAGES, mobs: MOB_NAMES, gifts: [LABEL[0], LABEL[3], LABEL[6]] },
    },
  },
};

module.exports = { ADV_THEMES, STAGES, MOB_NAMES, classOf, TIER_LV, TIER_NAMES, tierOf, ITEMS, QUESTS };
