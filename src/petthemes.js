// ธีมสัตว์เลี้ยง 10 ธีม — ไลฟ์ให้อาหารน้อง (หน้าเวทีวาดด้วย public/pet-engine.js, ภาพอยู่ใน public/pets/)
// เล่นเหมือนกันทุกธีม: พิมพ์ชื่ออาหาร → ตัวละครคนดูโยนอาหาร • ส่งของขวัญ = อาหารพิเศษ 3 ระดับ • ไลค์ = ท่าน่ารัก
// หลอดอิ่มเก็บที่โปรแกรม (play.js) ทุกหน้าจอเห็นตรงกัน

const GIFTS = [['Rose', 1], ['Finger Heart', 5], ['Rosa', 10], ['Perfume', 20], ['Doughnut', 30], ['Confetti', 100], ['Peeka-Bro', 199], ['Corgi', 299], ['Travel with You', 999]];
const KEYS = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9'];
// ของขวัญ → ระดับ: 1-9 เพชร = อาหารพิเศษ • 10-99 = ขนมจานใหญ่ • 100+ = ท่าพิเศษ
const TIER = [1, 1, 2, 2, 2, 3, 3, 3, 3];

const PETS = {
  cat: {
    name: 'คาเฟ่เหมียว', icon: '🐱', pet: 'น้องส้มจี๊ด', sprite: 'cat', mood: 'อยากเล่นไม้ตกแมว',
    desc: 'คาเฟ่แมวอบอุ่น หน้าต่างพระอาทิตย์ตก — พิมพ์ "ปลา" ป้อนน้องแมว ส่งกุหลาบเป็นปลาทูน่า',
    foods: [{ c: 'ปลา', a: 'ป้อนปลา', food: 'fish', emoji: '🐟', alias: ['ให้อาหาร', 'ข้าว'] }, { c: 'ขนมเลีย', a: 'ขนมแมวเลีย', food: 'treat', emoji: '🍬', alias: ['ขนม'] }],
    trick: { c: 'เล่น', a: 'โบกไม้ตกแมว', emoji: '🪶' },
    gifts: [['fish', 'ปลาทูน่า'], ['treat', 'ขนมแมวเลียจัมโบ้'], ['box', 'กล่องลัง + ปาร์ตี้ปลา']], like: 'ไม้ตกแมวโบกไปมา น้องตะครุบ',
    pal: ['#c0703a', '#ff9f6b', 'rgba(60,32,18,.88)', '#ffd0a8'],
  },
  shiba: {
    name: 'สวนหลังบ้าน', icon: '🐶', pet: 'น้องถั่วแดง', sprite: 'dog', mood: 'อยากวิ่งเล่น',
    desc: 'สนามหญ้ารั้วขาว ดอกไฮเดรนเยีย — พิมพ์ "กระดูก" ให้น้องชิบะ ส่งกุหลาบเป็นสเต๊ก',
    foods: [{ c: 'กระดูก', a: 'แทะกระดูก', food: 'bone', emoji: '🦴', alias: ['ให้อาหาร', 'ข้าว'] }, { c: 'ขนม', a: 'ขนมหมา', food: 'steak', emoji: '🍖' }],
    trick: { c: 'โยน', a: 'โยนลูกบอล', emoji: '🎾' },
    gifts: [['steak', 'สเต๊กชิ้นน้อย'], ['cake', 'เค้กน้องหมา'], ['frisbee', 'จานร่อน กระโดดงับ']], like: 'ลูบหัว หางกระดิก',
    pal: ['#2f80ed', '#56ccf2', 'rgba(18,42,70,.88)', '#bfe3ff'],
  },
  bunny: {
    name: 'สวนผักยามเช้า', icon: '🐰', pet: 'น้องนุ่นนิ่ม', sprite: 'bun', mood: 'สดชื่นยามเช้า',
    desc: 'แปลงแครอทยามเช้า ฟ้าสีพีช — พิมพ์ "แครอท" ให้น้องกระต่าย ส่งกุหลาบเป็นสตรอว์เบอร์รี',
    foods: [{ c: 'แครอท', a: 'แครอท', food: 'carrot', emoji: '🥕', alias: ['ให้อาหาร', 'ข้าว'] }, { c: 'ผัก', a: 'ผักกาด', food: 'apple', emoji: '🥬' }],
    trick: { c: 'กระโดด', a: 'กระโดดดีใจ', emoji: '✨' },
    gifts: [['straw', 'สตรอว์เบอร์รี'], ['carrot', 'ตะกร้าผักสด'], ['carrot', 'แครอทยักษ์']], like: 'กระโดดตัวลอยดีใจ',
    pal: ['#ff7a59', '#ffb36b', 'rgba(70,34,24,.88)', '#ffd0c0'],
  },
  hamster: {
    name: 'บ้านแฮมสเตอร์', icon: '🐹', pet: 'น้องข้าวปั้น', sprite: 'ham', mood: 'เก็บเมล็ดใส่แก้ม',
    desc: 'ในกรงแบบซูมใกล้ ล้อวิ่งสีชมพู — พิมพ์ "เมล็ด" ให้น้องเก็บใส่แก้มจนแก้มตุ่ย',
    foods: [{ c: 'เมล็ด', a: 'ใส่แก้ม', food: 'seed', emoji: '🌻', alias: ['ให้อาหาร', 'ข้าว'] }, { c: 'ข้าวโพด', a: 'ข้าวโพด', food: 'corn', emoji: '🌽' }],
    trick: { c: 'วิ่ง', a: 'วิ่งล้อ', emoji: '💨' },
    gifts: [['seed', 'เมล็ดทานตะวัน ×5'], ['corn', 'ข้าวโพดทั้งฝัก'], ['seedpile', 'กองเมล็ดยักษ์']], like: 'ล้อหมุนเร็วขึ้น',
    pal: ['#ff8fab', '#ffb86b', 'rgba(70,30,44,.88)', '#ffd0dc'],
  },
  penguin: {
    name: 'ขั้วโลกแสงเหนือ', icon: '🐧', pet: 'น้องปิงปอง', sprite: 'peng', mood: 'อยากไถลน้ำแข็ง',
    desc: 'คืนขั้วโลก แสงเหนือ อิกลู หิมะตก — พิมพ์ "ปลา" ให้น้องเพนกวิน ส่งของขวัญใหญ่แสงเหนือสว่างทั้งฟ้า',
    foods: [{ c: 'ปลา', a: 'ปลา', food: 'fish', emoji: '🐟', alias: ['ให้อาหาร', 'ข้าว'] }, { c: 'กุ้ง', a: 'กุ้ง', food: 'shrimp', emoji: '🦐' }],
    trick: { c: 'สไลด์', a: 'ไถลน้ำแข็ง', emoji: '❄️' },
    gifts: [['fish', 'ปลาแซลมอน'], ['bucket', 'ถังปลาเต็มถัง'], ['bucket', 'แสงเหนือเต็มฟ้า']], like: 'ตบปีกดีใจ',
    pal: ['#4f7cff', '#7ce0d6', 'rgba(10,24,52,.9)', '#a8e6ff'],
  },
  panda: {
    name: 'ป่าไผ่สายหมอก', icon: '🐼', pet: 'น้องซาลาเปา', sprite: 'panda', mood: 'ง่วงนิด ๆ',
    desc: 'ป่าไผ่หมอกยามเช้า ดอกท้อปลิว — พิมพ์ "ไผ่" ให้น้องแพนด้า ส่งกุหลาบเป็นหน่อไม้หวาน',
    foods: [{ c: 'ไผ่', a: 'ไผ่', food: 'bamboo', emoji: '🎋', alias: ['ให้อาหาร', 'ข้าว'] }, { c: 'แอปเปิ้ล', a: 'แอปเปิ้ล', food: 'apple', emoji: '🍎' }],
    trick: { c: 'กลิ้ง', a: 'ตีลังกา', emoji: '🌀' },
    gifts: [['bamboo', 'หน่อไม้หวาน'], ['bao', 'ซาลาเปา'], ['cake', 'เค้กไผ่']], like: 'โบกมือทักทาย',
    pal: ['#2e9e5b', '#9ccc65', 'rgba(20,50,30,.88)', '#c8f0b0'],
  },
  capybara: {
    name: 'ออนเซ็นหิมะตก', icon: '🧖', pet: 'น้องยูซุ', sprite: 'capy', mood: 'ชิลสุด ๆ',
    desc: 'บ่อน้ำพุร้อนยามโพล้เพล้ หิมะตก — พิมพ์ "ส้ม" วางส้มซ้อนบนหัวน้องคาปิบาร่า',
    foods: [{ c: 'ส้ม', a: 'วางบนหัว', food: 'yuzu', emoji: '🍊', alias: ['ให้อาหาร', 'ข้าว'] }, { c: 'แตงโม', a: 'แตงโม', food: 'melon', emoji: '🍉' }],
    trick: { c: 'อุ่น', a: 'ไอน้ำฟุ้ง', emoji: '♨️' },
    gifts: [['yuzu', 'ส้มบนหัว'], ['yuzu', 'ตะกร้าส้ม'], ['yuzu', 'ส้มลอยเต็มบ่อ']], like: 'ไอน้ำอุ่นฟุ้ง',
    pal: ['#e0703a', '#ffb15c', 'rgba(40,30,50,.9)', '#ffd29a'],
  },
  hippo: {
    name: 'บึงฮิปโปแคระ', icon: '🦛', pet: 'น้องตุ๊บป่อง', sprite: 'hippo', mood: 'หิวแตงโม!',
    desc: 'บึงน้ำใส น้ำตกเล็ก ใบไม้เขตร้อน — พิมพ์ "แตงโม" ให้น้องฮิปโป ของขวัญใหญ่ได้แตงโมทั้งลูก',
    foods: [{ c: 'แตงโม', a: 'แตงโม', food: 'melon', emoji: '🍉', alias: ['ให้อาหาร', 'ข้าว'] }, { c: 'ฟักทอง', a: 'ฟักทอง', food: 'pumpkin', emoji: '🎃' }],
    trick: { c: 'ผัก', a: 'ผักกาด', emoji: '🥬' },
    gifts: [['melon', 'แตงโมชิ้น'], ['pumpkin', 'ฟักทองทั้งลูก'], ['wmelon', 'แตงโมทั้งลูก']], like: 'ตีน้ำกระจาย',
    pal: ['#14b8a6', '#7dd3fc', 'rgba(10,50,60,.88)', '#a7f3eb'],
  },
  elephant: {
    name: 'ลำธารป่าใหญ่', icon: '🐘', pet: 'น้องทองดี', sprite: 'ele', mood: 'อยากเล่นน้ำ',
    desc: 'ลำธารป่าเขาไทย น้ำตกจากหน้าผา — พิมพ์ "กล้วย" ให้ช้างน้อย กดไลค์ช้างพ่นน้ำเป็นสายรุ้ง',
    foods: [{ c: 'กล้วย', a: 'กล้วย', food: 'banana', emoji: '🍌', alias: ['ให้อาหาร', 'ข้าว'] }, { c: 'อ้อย', a: 'อ้อย', food: 'cane', emoji: '🎋' }],
    trick: { c: 'อาบน้ำ', a: 'พ่นน้ำ', emoji: '💦' },
    gifts: [['banana', 'กล้วย 1 หวี'], ['cane', 'อ้อยมัดใหญ่'], ['banana', 'ช้างน้อยเต้นรำ']], like: 'พ่นน้ำเป็นสายรุ้ง',
    pal: ['#b8860b', '#e8b84a', 'rgba(40,40,30,.88)', '#ffe08a'],
  },
  duckling: {
    name: 'บึงบัวยามเย็น', icon: '🦆', pet: 'แม่เป็ดกับลูก ๆ', sprite: 'dkl', mood: 'ว่ายตามแม่',
    desc: 'บึงบัวยามพระอาทิตย์ตก หิ่งห้อย ศาลาริมน้ำ — พิมพ์ "ขนมปัง" ให้ลูกเป็ด ของขวัญใหญ่ได้ลูกเป็ดตัวใหม่',
    foods: [{ c: 'ขนมปัง', a: 'ขนมปัง', food: 'bread', emoji: '🍞', alias: ['ให้อาหาร'] }, { c: 'ข้าว', a: 'ข้าวเปลือก', food: 'corn', emoji: '🌾' }],
    trick: { c: 'ว่าย', a: 'ว่ายตามแม่', emoji: '🌊' },
    gifts: [['bread', 'ขนมปังก้อน'], ['corn', 'ข้าวเปลือกถุงใหญ่'], ['egg', 'ไข่ฟัก ลูกเป็ดตัวใหม่']], like: 'ลูกเป็ดร้องก๊าบ ๆ',
    pal: ['#c2407a', '#ff9a5a', 'rgba(40,16,40,.9)', '#ffc2d8'],
  },
};

function buildPet(id, p) {
  const effects = {};
  KEYS.forEach((k, i) => {
    const tier = TIER[i];
    const [food, label] = p.gifts[tier - 1];
    effects[k] = { icon: ['🌹', '💝', '🎁'][tier - 1], label, kind: 'pet' + tier, emoji: '', food };
  });
  const cmds = [
    ...p.foods.map((f) => ({ c: f.c, a: f.a, kind: 'feed', zone: 'feed', emoji: f.emoji, food: f.food, alias: f.alias || [] })),
    { c: p.trick.c, a: p.trick.a, kind: 'trick', emoji: p.trick.emoji },
  ];
  return {
    id, name: p.name, icon: p.icon, desc: p.desc, layout: 'hud', alias: 'fishing', fields: ['host'], requestAction: 'list', bigEffect: 'g9', pet: true,
    texts: {
      gifts: '🎁 ส่งของขวัญ', top: '👑 อันดับของขวัญ', queue: '📜 คำขอ', queueEmpty: 'ยังไม่มีคำขอ', queueBy: 'โดย',
      hype: '⚡ พลังคนดู', hypeFull: `${p.pet}มีความสุขสุด ๆ!`, bigWord: 'อิ่มพุงกาง!', bigSubUser: 'ขอบคุณที่เลี้ยงน้อง!', bigSubAll: 'ขอบคุณทุกคนที่ช่วยเลี้ยง!',
      joinVerb: 'มาเยี่ยมน้อง', emptyTop: 'ยังไม่มีใครส่งของขวัญ<br>เป็นคนแรกเลย!',
    },
    effects,
    defaults: {
      title: p.name, subtitle: `พิมพ์ “${p.foods[0].c}” ป้อน${p.pet}`, requestCommand: '', host: 'เจ้าของน้อง',
      gifts: GIFTS.map(([name, diamonds], i) => ({ name, diamonds, effect: KEYS[i] })),
    },
    hud: {
      palette: { accent: p.pal[0], accent2: p.pal[1], panel: p.pal[2], soft: p.pal[3], ink: '#ffffff', body: ['#ff8fab', '#a78bfa', '#ffb020', '#3b82f6', '#22c55e', '#e8453c'] },
      goals: [{ label: 'เพชร', reward: 'ปาร์ตี้ขนม', max: 300, effect: 'g6' }, { label: 'ใจ', reward: `${p.pet}เต้นดีใจ`, max: 3000, effect: 'g3' }],
      cmds, zones: [{ id: 'feed', label: 'ป้อนอาหาร', stat: 'ป้อนแล้ว {n} ครั้ง' }], boardTitle: 'คนเลี้ยงใจดี', podiumTitle: 'คนเลี้ยงใจดี', role: 'เจ้าของ',
      pet: { name: p.pet, sprite: p.sprite, mood: p.mood, like: p.like, gifts: p.gifts, foods: p.foods.map((f) => f.food) },
    },
  };
}

const PET_THEMES = {};
for (const [id, p] of Object.entries(PETS)) PET_THEMES[id] = buildPet(id, p);

module.exports = { PET_THEMES };
