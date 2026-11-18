// ธีมเวที 4 ธีม — คนดูมีตัวละคร (ชื่อ + รูปโปรไฟล์) ขึ้นไปเต้นบนเวที (หน้าเวทีวาดด้วย public/dance-engine.js, ภาพใน public/stages/)
// คอมเมนต์ = ขึ้นเวที (เต็มแล้วคนที่อยู่นานสุดลงไปหน้าเวที) • ของขวัญ = ไฟส่อง/กลางเวที/โชว์ใหญ่ • คำสั่งพิมพ์ = ท่าเต้นพิเศษ
// เพลงของแต่ละเวทีอยู่ใน public/music.js (ชื่อสไตล์ = ชื่อธีม) ท่าเต้นตรงจังหวะเพลง

const GIFTS = [['Rose', 1], ['Finger Heart', 5], ['Rosa', 10], ['Perfume', 20], ['Doughnut', 30], ['Confetti', 100], ['Peeka-Bro', 199], ['Corgi', 299], ['Travel with You', 999]];
const KEYS = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9'];
const TIER = [1, 1, 2, 2, 2, 3, 3, 3, 3];

const STAGES = {
  ramwong: {
    name: 'รำวงงานวัด', icon: '🎡', bpm: 124, pageant: false,
    desc: 'เวทีรำวงงานวัดยามค่ำ ชิงช้าสวรรค์ ธงราว — คอมเมนต์แล้วตัวละครคนดูขึ้นเวทีรำวงพร้อมชื่อ',
    sub: 'พิมพ์อะไรก็ได้ = ขึ้นเวทีรำวง', count: ['บนเวที', 'หน้าเวที'],
    cmds: [{ c: 'รำ', a: 'รำเดี่ยวกลางเวที', kind: 'dance', emoji: '💃', alias: ['รำวง', 'เต้น'] }, { c: 'จีบ', a: 'ส่งหัวใจให้คนบนเวที', kind: 'emote', emoji: '💗' }],
    gifts: ['คล้องพวงมาลัย + ไฟส่อง', 'รำเดี่ยวกลางเวที', 'พลุกลางงาน + ทั้งงานรำพร้อมกัน'],
    goals: [{ label: 'เพชร', reward: 'พลุกลางงาน', max: 300, effect: 'g9' }, { label: 'ใจ', reward: 'ทั้งลานรำพร้อมกัน', max: 3000, effect: 'g6' }],
    pal: ['#7a1f1a', '#e8a33a', 'rgba(40,14,30,.9)', '#ffd166'],
  },
  pageant: {
    name: 'ประกวดดาวไลฟ์', icon: '👑', bpm: 100, pageant: true,
    desc: 'เวทีประกวดม่านแดง รันเวย์ ไฟสปอต — พิมพ์ "ประกวด" ขึ้นเดินแบบ ของขวัญคือคะแนนโหวต ที่ 1 ได้มงกุฎ',
    sub: 'พิมพ์ “ประกวด” = เดินแบบบนรันเวย์', count: ['ผู้เข้าประกวด', 'กองเชียร์'],
    cmds: [{ c: 'ประกวด', a: 'รับเบอร์ เดินรันเวย์', kind: 'dance', emoji: '💃', alias: ['เดินแบบ', 'สมัคร'] }, { c: 'เชียร์', a: 'ส่งกำลังใจผู้เข้าประกวด', kind: 'emote', emoji: '📣' }],
    gifts: ['คะแนนโหวต + ไฟสปอต', 'เดินแบบพิเศษ + แฟลชกล้อง', 'สวมมงกุฎ + โชว์ใหญ่'],
    goals: [{ label: 'เพชร', reward: 'ประกาศผลรอบนี้', max: 300, effect: 'g9' }, { label: 'ใจ', reward: 'ผู้เข้าประกวดโพสท่าพร้อมกัน', max: 3000, effect: 'g6' }],
    pal: ['#b8182e', '#ff8fb8', 'rgba(30,8,30,.9)', '#ffd0e0'],
  },
  molam: {
    name: 'หมอลำซิ่ง', icon: '🪇', bpm: 138, pageant: false,
    desc: 'เวทีหมอลำจอ LED ยักษ์ ไฟเลเซอร์ ควัน — คอมเมนต์แล้วขึ้นเป็นหางเครื่องชุดขนนก พลังเต็มเข้าโหมดซิ่ง',
    sub: 'พิมพ์ “ม่วน” = ขึ้นเป็นหางเครื่อง', count: ['หางเครื่อง', 'หน้าเวที'],
    cmds: [{ c: 'ม่วน', a: 'ขึ้นเป็นหางเครื่อง', kind: 'dance', emoji: '🪇', alias: ['ม่วนซื่น', 'เต้น'] }, { c: 'ซิ่ง', a: 'เร่งจังหวะทั้งเวที', kind: 'emote', emoji: '🔥' }],
    gifts: ['ควัน + ไฟเลเซอร์ส่อง', 'ขึ้นกลางเวที + พลุเย็น', 'โหมดซิ่ง! ทั้งเวทีเต้นพร้อมกัน'],
    goals: [{ label: 'เพชร', reward: 'โหมดซิ่ง', max: 300, effect: 'g9' }, { label: 'ใจ', reward: 'พลุเย็นทั้งเวที', max: 3000, effect: 'g6' }],
    pal: ['#ff2d8a', '#ffb020', 'rgba(14,8,26,.9)', '#ffb020'],
  },
  disco: {
    name: 'ดิสโก้ย้อนยุค', icon: '🪩', bpm: 120, pageant: false,
    desc: 'ดิสโก้ยุค 80s ลูกบอลกระจก ฟลอร์ไฟ LED — คอมเมนต์ลงฟลอร์ พิมพ์ "ชมพู" หรือ "ฟ้า" แข่งเต้นสองทีม',
    sub: 'พิมพ์อะไรก็ได้ = ลงฟลอร์ · “ชมพู/ฟ้า” แข่งทีม', count: ['บนฟลอร์', 'ขอบฟลอร์'],
    cmds: [{ c: 'ชมพู', a: 'เข้าทีมชมพู', kind: 'zone', zone: 'pink', emoji: '🩷' }, { c: 'ฟ้า', a: 'เข้าทีมฟ้า', kind: 'zone', zone: 'blue', emoji: '🩵' }, { c: 'ดิ้น', a: 'ท่าเต้นเดี่ยว', kind: 'dance', emoji: '🕺', alias: ['เต้น', 'แดนซ์'] }],
    zones: [{ id: 'pink', label: 'ทีมชมพู', stat: 'ชมพู {n}' }, { id: 'blue', label: 'ทีมฟ้า', stat: 'ฟ้า {n}' }],
    gifts: ['ไฟสปอตส่อง + ท่าพิเศษ', 'ลงกลางฟลอร์ + ไฟวิ่ง', 'ลูกบอลกระจกหมุน ทั้งฟลอร์เต้น'],
    goals: [{ label: 'เพชร', reward: 'ไฟฟลอร์เต็มจังหวะ', max: 300, effect: 'g9' }, { label: 'ใจ', reward: 'ทั้งฟลอร์เต้นพร้อมกัน', max: 3000, effect: 'g6' }],
    pal: ['#b07cff', '#ff4fd8', 'rgba(20,8,36,.9)', '#5de0ff'],
  },
};

function buildStage(id, p) {
  const effects = {};
  KEYS.forEach((k, i) => {
    const tier = TIER[i];
    effects[k] = { icon: ['🌹', '💝', '🎆'][tier - 1], label: p.gifts[tier - 1], kind: 'st' + tier, emoji: '' };
  });
  return {
    id, name: p.name, icon: p.icon, desc: p.desc, layout: 'hud', alias: 'concert', fields: ['host'], requestAction: 'list', bigEffect: 'g9', dance: true,
    texts: {
      gifts: '🎁 ส่งของขวัญ', top: '👑 อันดับของขวัญ', queue: '📜 คำขอ', queueEmpty: 'ยังไม่มีคำขอ', queueBy: 'โดย',
      hype: '⚡ พลังคนดู', hypeFull: 'ทั้งเวทีมันส์สุด ๆ!', bigWord: p.pageant ? 'ผู้ชนะ!' : 'สุดยอด!', bigSubUser: 'ขอบคุณสำหรับของขวัญใหญ่!', bigSubAll: 'ขอบคุณทุกคน!',
      joinVerb: 'มาถึงงาน', emptyTop: 'ยังไม่มีใครส่งของขวัญ<br>เป็นคนแรกเลย!',
    },
    effects,
    defaults: {
      title: p.name, subtitle: p.sub, requestCommand: '', host: 'พิธีกร',
      gifts: GIFTS.map(([name, diamonds], i) => ({ name, diamonds, effect: KEYS[i] })),
    },
    hud: {
      palette: { accent: p.pal[0], accent2: p.pal[1], panel: p.pal[2], soft: p.pal[3], ink: '#ffffff', body: ['#ff8fab', '#a78bfa', '#ffb020', '#3b82f6', '#22c55e', '#e8453c'] },
      goals: p.goals, cmds: p.cmds, zones: p.zones || [{ id: 'stage', label: 'บนเวที', stat: '{n}' }], boardTitle: 'สายเต้นตัวตึง', podiumTitle: 'เสี่ยใหญ่ประจำไลฟ์', role: 'พิธีกร',
      dance: { bpm: p.bpm, pageant: p.pageant, count: p.count, gifts: p.gifts },
    },
  };
}

const DANCE_THEMES = {};
for (const [id, p] of Object.entries(STAGES)) DANCE_THEMES[id] = buildStage(id, p);

module.exports = { DANCE_THEMES };
