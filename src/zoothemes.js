// ธีมสวนสัตว์ 5 ธีม — คนดูเป็นเด็กนักเรียนมาทัศนศึกษา ยืนหันหลังดูสัตว์ (หน้าเวทีวาดด้วย public/zoo-engine.js, ภาพใน public/zoo/)
// พิมพ์ชื่อสัตว์ = เรียกสัตว์ตัวนั้นมาใกล้ ๆ + ติ๊กสมุดสะสมสัตว์ • ของขวัญ = ให้อาหาร / สัตว์มาโชว์ / สัตว์พิเศษ

const GIFTS = [['Rose', 1], ['Finger Heart', 5], ['Rosa', 10], ['Perfume', 20], ['Doughnut', 30], ['Confetti', 100], ['Peeka-Bro', 199], ['Corgi', 299], ['Travel with You', 999]];
const KEYS = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9'];
const TIER = [1, 1, 2, 2, 2, 3, 3, 3, 3];

const ZOOS = {
  sea: {
    name: 'โลกใต้ทะเล', icon: '🐠', alias: 'krathong',
    desc: 'ตู้ปลายักษ์ ฉลาม เต่าทะเล แมงกะพรุน — คนดูเป็นเด็กนักเรียนยืนดูหน้าตู้ พิมพ์ชื่อสัตว์เรียกมาใกล้ ๆ',
    sub: 'พิมพ์ชื่อสัตว์ = เรียกให้ว่ายมาใกล้ ๆ',
    book: [{ key: 'fish', name: 'ปลาการ์ตูน', c: 'ปลา', emoji: '🐠' }, { key: 'turtle', name: 'เต่าทะเล', c: 'เต่า', emoji: '🐢' }, { key: 'jelly', name: 'แมงกะพรุน', c: 'แมงกะพรุน', emoji: '🪼' }, { key: 'shark', name: 'ฉลาม', c: 'ฉลาม', emoji: '🦈' }],
    special: { key: 'whale', name: 'ปลาวาฬ' }, action: null,
    gifts: ['ให้อาหารปลา ฝูงปลาแห่มา', 'สัตว์ว่ายมาโชว์หน้ากระจก', 'ปลาวาฬยักษ์ว่ายผ่าน!'],
    pal: ['#0a6abf', '#5de0ff', 'rgba(6,20,48,.9)', '#5de0ff'],
  },
  dino: {
    name: 'ไดโนเสาร์พาร์ค', icon: '🦖', alias: 'songkran',
    desc: 'ภูเขาไฟ ทีเร็กซ์ คอยาว สามเขา เทอโรแดคทิล — พิมพ์ "โฮก" ทีเร็กซ์คำรามจอสั่น ของขวัญใหญ่ไข่ฟักเป็นลูกไดโนเสาร์',
    sub: 'พิมพ์ “โฮก” = ไดโนเสาร์คำรามตอบ',
    book: [{ key: 'trex', name: 'ทีเร็กซ์', c: 'ทีเร็กซ์', emoji: '🦖' }, { key: 'bronto', name: 'คอยาว', c: 'คอยาว', emoji: '🦕' }, { key: 'trike', name: 'สามเขา', c: 'สามเขา', emoji: '🦏' }, { key: 'ptero', name: 'เทอโรแดคทิล', c: 'เทอโร', emoji: '🪽' }],
    special: { key: 'egg', name: 'ลูกไดโนเสาร์' }, action: { c: 'โฮก', a: 'ทีเร็กซ์คำรามตอบ', emoji: '🦖', key: 'trex', alias: ['โฮกก', 'คำราม'] },
    gifts: ['โยนเนื้อ/ผักให้ไดโนเสาร์', 'ไดโนเสาร์เดินมาใกล้ + คำราม', 'ไข่ฟัก! ลูกไดโนเสาร์ออกมา'],
    pal: ['#c2410c', '#f59e0b', 'rgba(40,20,10,.9)', '#ffd166'],
  },
  safari: {
    name: 'ซาฟารียามเย็น', icon: '🦒', alias: 'fishing',
    desc: 'ทุ่งหญ้าพระอาทิตย์ตก ยีราฟ ช้าง ม้าลาย สิงโต — เด็กนักเรียนยืนดูบนระเบียงไม้ ของขวัญใหญ่รถซาฟารีพาเที่ยว',
    sub: 'พิมพ์ชื่อสัตว์ = ส่องกล้องดูใกล้ ๆ',
    book: [{ key: 'giraffe', name: 'ยีราฟ', c: 'ยีราฟ', emoji: '🦒' }, { key: 'elephant', name: 'ช้าง', c: 'ช้าง', emoji: '🐘' }, { key: 'zebra', name: 'ม้าลาย', c: 'ม้าลาย', emoji: '🦓' }, { key: 'lion', name: 'สิงโต', c: 'สิงโต', emoji: '🦁' }],
    special: { key: 'jeep', name: 'รถซาฟารี' }, action: null,
    gifts: ['ยื่นใบไม้ให้ยีราฟ', 'สัตว์เดินมาใกล้ + สิงโตคำราม', 'รถซาฟารีพาเที่ยวรอบทุ่ง'],
    pal: ['#c2410c', '#ffb347', 'rgba(50,24,10,.9)', '#ffd9a0'],
  },
  rainforest: {
    name: 'ป่าฝนลิงกับนก', icon: '🐒', alias: 'songkran',
    desc: 'ป่าฝนเขตร้อน น้ำตก ลิงห้อยโหน นกแก้ว นกทูแคน สลอธ — พิมพ์ "กล้วย" โยนกล้วยให้ลิง',
    sub: 'พิมพ์ “กล้วย” = โยนกล้วยให้ลิง',
    book: [{ key: 'monkey', name: 'ลิง', c: 'ลิง', emoji: '🐒' }, { key: 'parrot', name: 'นกแก้ว', c: 'นกแก้ว', emoji: '🦜' }, { key: 'toucan', name: 'นกทูแคน', c: 'ทูแคน', emoji: '🐦' }, { key: 'sloth', name: 'สลอธ', c: 'สลอธ', emoji: '🦥' }],
    special: { key: 'flock', name: 'นกฝูงใหญ่' }, action: { c: 'กล้วย', a: 'โยนกล้วยให้ลิง', emoji: '🍌', key: 'monkey' },
    gifts: ['นกแก้วบินมาทักทาย', 'ลิงห้อยโหนมาใกล้ ๆ', 'นกฝูงใหญ่บินผ่าน + สายรุ้ง'],
    pal: ['#15803d', '#84cc16', 'rgba(10,36,20,.9)', '#c8f0b0'],
  },
  nightzoo: {
    name: 'ซาฟารีกลางคืน', icon: '🦉', alias: 'krathong',
    desc: 'คืนพระจันทร์เต็มดวง เสือโคร่ง นกฮูก ค้างคาว หิ่งห้อย — พิมพ์ "ส่องไฟ" ไฟฉายส่องหาสัตว์ที่ซ่อนอยู่',
    sub: 'พิมพ์ “ส่องไฟ” = ไฟฉายส่องหาสัตว์',
    book: [{ key: 'tiger', name: 'เสือ', c: 'เสือ', emoji: '🐯' }, { key: 'owl', name: 'นกฮูก', c: 'นกฮูก', emoji: '🦉' }, { key: 'bat', name: 'ค้างคาว', c: 'ค้างคาว', emoji: '🦇' }, { key: 'firefly', name: 'หิ่งห้อย', c: 'หิ่งห้อย', emoji: '✨' }],
    special: { key: 'eyes', name: 'ตาเรืองแสง' }, action: { c: 'ส่องไฟ', a: 'ไฟฉายส่องหาสัตว์', emoji: '🔦', key: 'eyes', alias: ['ไฟฉาย'] },
    gifts: ['หิ่งห้อยบินวนเป็นรูปหัวใจ', 'สัตว์ออกมาในไฟส่อง', 'เสือโคร่งเดินมาหน้าคอก'],
    pal: ['#312e81', '#6366f1', 'rgba(10,12,36,.92)', '#ffe08a'],
  },
};

function buildZoo(id, p) {
  const effects = {};
  KEYS.forEach((k, i) => {
    const tier = TIER[i];
    effects[k] = { icon: ['🌹', '💝', '🎆'][tier - 1], label: p.gifts[tier - 1], kind: 'zoo' + tier, emoji: '' };
  });
  const cmds = p.book.map((b) => ({ c: b.c, a: `เรียก${b.name}มาใกล้ ๆ`, kind: 'zone', zone: b.key, emoji: b.emoji, alias: b.c === b.name ? [] : [b.name] }));
  if (p.action) cmds.push({ c: p.action.c, a: p.action.a, kind: 'zone', zone: p.action.key, emoji: p.action.emoji, alias: p.action.alias || [] });
  return {
    id, name: p.name, icon: p.icon, desc: p.desc, layout: 'hud', alias: p.alias, fields: ['host'], requestAction: 'list', bigEffect: 'g9', zoo: true,
    texts: {
      gifts: '🎁 ส่งของขวัญ', top: '👑 อันดับของขวัญ', queue: '📜 คำขอ', queueEmpty: 'ยังไม่มีคำขอ', queueBy: 'โดย',
      hype: '⚡ พลังคนดู', hypeFull: 'เด็ก ๆ ตื่นเต้นสุด ๆ!', bigWord: 'ว้าว!', bigSubUser: 'ขอบคุณที่พาเด็ก ๆ เที่ยว!', bigSubAll: 'ขอบคุณทุกคน!',
      joinVerb: 'มาทัศนศึกษา', emptyTop: 'ยังไม่มีใครส่งของขวัญ<br>เป็นคนแรกเลย!',
    },
    effects,
    defaults: {
      title: p.name, subtitle: p.sub, requestCommand: '', host: 'คุณครู',
      gifts: GIFTS.map(([name, diamonds], i) => ({ name, diamonds, effect: KEYS[i] })),
    },
    hud: {
      palette: { accent: p.pal[0], accent2: p.pal[1], panel: p.pal[2], soft: p.pal[3], ink: '#ffffff', body: ['#ff4f7b', '#3b82f6', '#ffb020', '#22c55e', '#a78bfa', '#ff7a59', '#14b8a6'] },
      goals: [{ label: 'เพชร', reward: p.gifts[2], max: 300, effect: 'g9' }, { label: 'ใจ', reward: 'เด็ก ๆ กระโดดดีใจ', max: 3000, effect: 'g3' }],
      cmds, zones: p.book.map((b) => ({ id: b.key, label: b.name, stat: `${b.name} {n}` })), boardTitle: 'นักสำรวจตัวยง', podiumTitle: 'ผู้สนับสนุนทัศนศึกษา', role: 'คุณครู',
      zoo: { book: p.book.map((b) => ({ key: b.key, name: b.name, emoji: b.emoji })), special: p.special, gifts: p.gifts, action: p.action },
    },
  };
}

const ZOO_THEMES = {};
for (const [id, p] of Object.entries(ZOOS)) ZOO_THEMES[id] = buildZoo(id, p);

module.exports = { ZOO_THEMES };
