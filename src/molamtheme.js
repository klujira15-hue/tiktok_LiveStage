// ธีม "เวทีหมอลำ 3D" — ฉากเวทีจริง (ภาพ AI) ทำเป็น 3 มิติด้วย three.js: public/molam-engine.js • ภาพ: public/scenes/molamstage/
// บนเวที: หางเครื่อง 4 คน + นักร้อง 2 คนผลัดกันร้อง • คนดูได้ตัวละครสุ่ม 1 ใน 4 แบบ ยืนเต้นหน้าเวที
// พิมพ์ “กุหลาบ” เดินไปให้ดอกไม้นักร้อง • “ตี” ถือขวดน้ำไปตีคนข้าง ๆ • “เปลี่ยนตัว” • “เปลี่ยนคนร้อง” • “เต้น”

const GIFTS = [['Rose', 1], ['Finger Heart', 5], ['Rosa', 10], ['Perfume', 20], ['Doughnut', 30], ['Confetti', 100], ['Peeka-Bro', 199], ['Corgi', 299], ['Travel with You', 999]];
const KEYS = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9'];
const TIER = [1, 1, 1, 2, 2, 2, 3, 3, 3];
const LABEL = ['โยนกุหลาบให้นักร้อง', 'ส่งหัวใจขึ้นเวที', 'โยนช่อดอกไม้ให้นักร้อง', 'หางเครื่องไหว้ขอบคุณ', 'กระดาษโปรยทั้งเวที', 'หางเครื่องเต้นหน้าเวที', 'พลุ + เลเซอร์โชว์', 'พลุ + เลเซอร์โชว์', 'คอนเสิร์ตแตก! ไหว้ทั้งเวที'];
const ICON = ['🌹', '💖', '💐', '🙏', '🎊', '💃', '🎆', '🎆', '👑'];

const effects = {};
KEYS.forEach((k, i) => (effects[k] = { icon: ICON[i], label: LABEL[i], kind: 'ml' + TIER[i], emoji: '' }));

const MOLAM_STAGE_THEMES = {
  molamstage: {
    id: 'molamstage', name: 'เวทีหมอลำ 3D', icon: '🎤', layout: 'hud', alias: 'molam', fields: ['host'], requestAction: 'list', bigEffect: 'g9', molamStage: true,
    desc: 'คอนเสิร์ตหมอลำหน้าเวทีจริงแบบ 3 มิติ — หางเครื่อง 4 คนเต้นกับนักร้องที่ผลัดกันร้อง ไฟเวที เลเซอร์ จอ LED ขยับตามจังหวะ คนดูได้ตัวละครสุ่มยืนเต้นหน้าเวที พิมพ์ “กุหลาบ” เดินไปให้ดอกไม้นักร้อง “ตี” ถือขวดน้ำไปตีคนข้าง ๆ “เปลี่ยนตัว” “เปลี่ยนคนร้อง”',
    texts: {
      gifts: '🎁 ส่งของขวัญ', top: '👑 แฟนคลับตัวจริง', queue: '📜 คำขอเพลง', queueEmpty: 'ยังไม่มีคำขอ', queueBy: 'โดย',
      hype: '🔥 ความม่วน', hypeFull: 'ม่วนคักแท้!', bigWord: 'ม่วนคัก!', bigSubUser: 'ขอบคุณที่ทำให้คอนเสิร์ตแตก!', bigSubAll: 'ขอบคุณทุกคน!',
      joinVerb: 'มาหน้าเวทีแล้ว', emptyTop: 'ยังไม่มีใครส่งของขวัญ<br>เป็นแฟนคลับคนแรกเลย!',
    },
    effects,
    defaults: {
      title: 'หมอลำ LIVE', subtitle: 'พิมพ์ “กุหลาบ” ให้ดอกไม้นักร้อง • “ตี” ป่วนเพื่อน', requestCommand: '', host: 'นักร้อง',
      gifts: GIFTS.map(([name, diamonds], i) => ({ name, diamonds, effect: KEYS[i] })),
    },
    hud: {
      palette: { accent: '#ff3d8b', accent2: '#ffb020', panel: 'rgba(24,10,34,.84)', soft: '#ffd27a', ink: '#ffffff', body: ['#ff6b6b', '#4dabf7', '#ffd43b', '#69db7c', '#b197fc', '#ff922b', '#f783ac', '#38d9a9'] },
      goals: [{ label: 'เพชร', reward: 'พลุเต็มฟ้า ทั้งเวทีไหว้ขอบคุณ', max: 300, effect: 'g9' }, { label: 'ใจ', reward: 'เลเซอร์โชว์ ทุกคนกระโดด', max: 3000, effect: 'g7' }],
      cmds: [
        { c: 'กุหลาบ', a: 'เดินไปให้ดอกกุหลาบนักร้อง', kind: 'zone', zone: 'rose', emoji: '🌹', alias: ['🌹', 'ดอกไม้', 'ให้ดอกไม้', 'ให้กุหลาบ', 'ดอกกุหลาบ'] },
        { c: 'ตี', a: 'ถือขวดน้ำไปตีคนข้าง ๆ', kind: 'zone', zone: 'hit', emoji: '💥', alias: ['ตบ', 'ฟาด', 'ทุบ', 'ตีหัว', 'ตีๆ'] },
        { c: 'เปลี่ยนตัว', a: 'สุ่มตัวละครใหม่', kind: 'zone', zone: 'swap', emoji: '🔄', alias: ['เปลี่ยน', 'สุ่มตัว', 'ตัวใหม่', 'เปลี่ยนตัวละคร'] },
        { c: 'เปลี่ยนคนร้อง', a: 'เปลี่ยนนักร้องบนเวที', kind: 'zone', zone: 'singer', emoji: '🎤', alias: ['เปลี่ยนนักร้อง', 'คนร้อง', 'นักร้อง'] },
        { c: 'เต้น', a: 'กระโดดโยกสุดตัว', kind: 'zone', zone: 'dance', emoji: '💃', alias: ['ม่วน', 'โยก', 'ม่วนๆ', 'ม่วนคัก'] },
      ],
      zones: [{ id: 'rose', label: 'ดอกกุหลาบ', stat: 'ให้ดอกไม้ {n} ครั้ง' }, { id: 'hit', label: 'ตี', stat: 'ตีกัน {n} ครั้ง' }, { id: 'dance', label: 'เต้น', stat: 'เต้น {n} ครั้ง' }],
      boardTitle: 'สายม่วนตัวจริง', podiumTitle: 'แฟนคลับตัวจริง', role: 'นักร้อง',
      // นักร้อง 2 คน (ไฟล์ภาพ sf = หญิง, sm = ชาย) ผลัดกันร้องทุก singerMin นาที
      molam: { singers: [{ key: 'sf', name: 'แพรวา' }, { key: 'sm', name: 'ภูผา' }], singerMin: 4 },
    },
  },
};

module.exports = { MOLAM_STAGE_THEMES };
