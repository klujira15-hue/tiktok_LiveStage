// ธีมเลย์เอาต์ "งานวัด LIVE" 8 ธีม — ใช้แม่แบบเดียวกัน (public/hud-engine.js วาดฉาก/แผง/เอฟเฟกต์)
// แต่ละธีมกำหนด: สี ฉาก ของขวัญ→กิจกรรม คำสั่งพิมพ์ โซนกิจกรรม เป้าหมาย 2 แถบ
// effect kind: shower = โปรยของจากฟ้า • burst = พุ่งจากคนส่ง • spot = ไฟส่องคนส่ง • parade = คนดูทั้งฉากเต้น
//              fireworks = พลุ • big = โชว์ใหญ่เต็มจอ
// คำสั่ง kind: dance = ตัวละครคนพิมพ์ออกมาเต้น • zone = ทำกิจกรรมในโซน (นับแต้ม) • emote = อีโมจิลอยเหนือหัว

const GIFTS = [['Rose', 1], ['Finger Heart', 5], ['Rosa', 10], ['Perfume', 20], ['Doughnut', 30], ['Confetti', 100], ['Peeka-Bro', 199], ['Corgi', 299], ['Travel with You', 999]];
const KEYS = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9'];

function texts(t) {
  return {
    gifts: '🎁 ส่งของขวัญ', top: '👑 อันดับของขวัญ', queue: '📜 คำขอ', queueEmpty: 'ยังไม่มีคำขอ', queueBy: 'โดย',
    hype: '⚡ พลังคนดู', hypeFull: t.hypeFull, bigWord: t.bigWord, bigSubUser: 'ขอบคุณสำหรับของขวัญใหญ่!', bigSubAll: 'ขอบคุณทุกคน!',
    joinVerb: t.joinVerb, emptyTop: 'ยังไม่มีใครส่งของขวัญ<br>เป็นคนแรกเลย!',
  };
}

// ธีมใหม่ยืมเพลง/ชุดตัวละคร/คลังคำถามจากธีมเดิมที่ใกล้เคียง
const ALIAS = { temple: 'shrine', floating: 'krathong', nightmarket: 'concert', muay: 'concert', beach: 'songkran', farm: 'fishing', cafe: 'fishing', school: 'songkran', valentine: 'concert', rocket: 'songkran', mother: 'shrine', moon: 'cny' };

function build(id, t) {
  const effects = {};
  t.fx.forEach(([icon, label, kind, emoji], i) => (effects[KEYS[i]] = { icon, label, kind, emoji }));
  return {
    id, name: t.name, icon: t.icon, desc: t.desc, layout: 'hud', alias: t.alias || ALIAS[id], fields: ['host'], requestAction: 'list', bigEffect: 'g9', noMusic: t.noMusic,
    texts: texts(t), effects,
    defaults: {
      title: t.title, subtitle: t.subtitle, requestCommand: t.requestCommand || '', host: t.host,
      gifts: GIFTS.map(([name, diamonds], i) => ({ name, diamonds, effect: KEYS[i] })),
    },
    hud: {
      palette: t.palette, scene: t.scene, tap: t.tap, podiumTitle: t.podiumTitle, role: t.role,
      goals: t.goals, cmds: t.cmds, zones: t.zones, boardTitle: t.boardTitle, cards: t.cards, figs: t.figs,
      // ธีมภาพสำเร็จรูป (scenethemes.js): ฉาก 2.5D, แถวคนดูตามพื้นในภาพ, ท่าตัวละคร, โหมดสงบ (ไม่เต้น/ไม่จุดพลุ)
      pic: t.pic, rows: t.rows, fan: t.fan, calm: t.calm, pews: t.pews, fxSet: t.fxSet, imam: t.imam, bpm: t.bpm, band: t.band, dj: t.dj, skin: t.skin, kid: t.kid, ui: t.ui,
      // แถบวิ่งล่างสุดโดนช่องพิมพ์คอมเมนต์ของ TikTok บังมิด → ธีมสำเร็จรูปซ่อนไว้ (ธีมที่สร้างเองตั้งเองในหน้าสร้างธีม)
      layout: { ...t.layout, blocks: { tick: { hide: true }, ...t.layout?.blocks } },
    },
  };
}

const HUD_THEMES = {
  temple: build('temple', {
    name: 'งานวัด', icon: '🛕', desc: 'งานวัดเช้า ตักบาตร ท่าน้ำ ตลาดเช้า — คนดูพิมพ์ "รำ" ออกมาเต้นได้',
    title: 'งานวัดเช้า LIVE', subtitle: 'พิมพ์ "รำ" ออกมาเต้น • ส่งของขวัญร่วมทำบุญ', host: 'คุณปุ่น', role: 'มัคทายก',
    hypeFull: 'บุญเต็มลานวัด!', bigWord: 'สาธุ!', joinVerb: 'เข้ามาในงานวัด',
    palette: { sky: '#a9dcf5', sky2: '#d7efe0', ground: '#ead2a0', ground2: '#e0c286', accent: '#ff7aa2', accent2: '#ffd166', ink: '#4a0f22', panel: 'rgba(40,30,90,.88)', host: '#ffffff', body: ['#ff9a2e', '#ff7aa2', '#7aa7ff', '#5ed6a0'] },
    scene: [[170, 300, 200, 26, '#c0392b', 6], [196, 326, 148, 60, '#e74c3c', 4], [252, 342, 36, 44, '#8e1b12', 4], [30, 350, 90, 70, '#c0392b', 8], [420, 360, 100, 60, '#d35400', 8]],
    tap: 'กดใจ = ออกมาเต้น • ฟอล = ได้หมาวัด • แชร์ = ไก่ขัน', podiumTitle: 'อันดับเจ้าภาพงาน (ของขวัญสูงสุด)',
    fx: [['🪷', 'ตักบาตร', 'burst', '🍚'], ['🎋', 'เซียมซี', 'burst', '🎋'], ['🪷', 'ถวายดอกบัว', 'shower', '🪷'], ['✨', 'ปิดทองพระ', 'spot', '✨'], ['🍲', 'เปิดโรงทาน', 'parade', '🍲'], ['🎏', 'แห่ผ้าป่า', 'parade', '🎏'], ['🔔', 'ตีระฆัง', 'shower', '🔔'], ['🎆', 'พลุงานวัด', 'fireworks', ''], ['🛕', 'งานบุญใหญ่', 'big', '🪷']],
    goals: [{ label: 'เหรียญ', reward: 'ตีกลองเพล', max: 100, effect: 'g7' }, { label: 'ใจ', reward: 'ตีระฆัง', max: 1000, effect: 'g8' }],
    cmds: [{ c: 'รำ', a: 'ออกมาเต้นหน้าเวที', kind: 'dance', emoji: '💃' }, { c: 'ให้อาหารปลา', a: 'ท่าน้ำ สะสมแต้ม', kind: 'zone', zone: 'pond', emoji: '🐟', alias: ['ให้อาหาร'] }, { c: 'ตักบาตร', a: 'ใส่บาตรพระ', kind: 'zone', zone: 'alms', emoji: '🍚' }, { c: 'กวาด', a: 'กวาดลานวัด', kind: 'emote', emoji: '🧹' }],
    zones: [{ id: 'alms', label: 'ตักบาตรพระ', stat: 'ใส่บาตรแล้ว {n} ที่' }, { id: 'pond', label: 'ท่าน้ำ', stat: 'ให้อาหารปลา {n} ครั้ง' }],
    boardTitle: 'เซียนท่าน้ำ', figs: ['#ff9a2e', '#ff9a2e', '#ff9a2e'],
    cards: { big: [['โดนัท (30)', 'เปิดโรงทาน'], ['น้ำหอม (20)', 'ปิดทองพระ']], featured: ['กุหลาบ (1)', 'ตักบาตร'], hot: [['กุหลาบ (1)', 'ตักบาตร'], ['Finger Heart (5)', 'เซียมซี']] },
  }),
  floating: build('floating', {
    name: 'ตลาดน้ำ', icon: '🛶', desc: 'ตลาดน้ำยามเช้า เรือขายของ พายเรือแข่ง ลอยโคม',
    title: 'ตลาดน้ำยามเช้า LIVE', subtitle: 'พิมพ์ "พาย" พายเรือเข้าตลาด • ส่งของขวัญอุดหนุนแม่ค้า', host: 'ป้าสมศรี', role: 'แม่ค้าเรือ',
    hypeFull: 'ตลาดน้ำคึกคักสุด ๆ!', bigWord: 'ลอยโคม!', joinVerb: 'พายเรือเข้าตลาด',
    palette: { sky: '#ffd9a8', sky2: '#8fd3c7', ground: '#3fa7b8', ground2: '#2f8fa1', accent: '#ffb347', accent2: '#ffe08a', ink: '#4a2500', panel: 'rgba(12,60,80,.88)', host: '#e8572a', body: ['#2e86de', '#e8572a', '#ffb347', '#5ed6a0'] },
    scene: [[0, 360, 540, 30, '#5a9e5a', 0], [40, 300, 110, 70, '#8d5a3b', 6], [390, 290, 120, 80, '#8d5a3b', 6], [170, 410, 120, 22, '#7a4a2a', 30], [330, 420, 110, 20, '#7a4a2a', 30]],
    tap: 'กดใจ = พายเรือเข้ามา • ฟอล = ได้หมวกงอบ • แชร์ = ปลาตะเพียนกระโดด', podiumTitle: 'เถ้าแก่ตลาดน้ำ (ของขวัญสูงสุด)',
    fx: [['🍜', 'ก๋วยเตี๋ยวเรือ', 'burst', '🍜'], ['🥭', 'ขายผลไม้', 'burst', '🥭'], ['🍧', 'ไอติมกะทิ', 'shower', '🍧'], ['🥥', 'เรือมะพร้าว', 'spot', '🥥'], ['🍲', 'เลี้ยงทั้งตลาด', 'parade', '🍲'], ['🌺', 'ล่องเรือชมสวน', 'shower', '🌺'], ['🏮', 'ลอยโคม', 'shower', '🏮'], ['🎆', 'พลุริมคลอง', 'fireworks', ''], ['🛶', 'แข่งเรือยาว', 'big', '🛶']],
    goals: [{ label: 'เหรียญ', reward: 'แข่งพายเรือ', max: 100, effect: 'g9' }, { label: 'ใจ', reward: 'ลอยโคมทั้งคลอง', max: 1000, effect: 'g7' }],
    cmds: [{ c: 'พาย', a: 'พายเรือเข้าตลาด', kind: 'dance', emoji: '🛶' }, { c: 'ซื้อ', a: 'แวะซื้อของในเรือ', kind: 'zone', zone: 'noodle', emoji: '🍜' }, { c: 'ให้อาหารปลา', a: 'ท่าน้ำ สะสมแต้ม', kind: 'zone', zone: 'fish', emoji: '🐟' }, { c: 'ร้องเพลง', a: 'เพลงเรือ แหล่ ๆ', kind: 'emote', emoji: '🎶' }],
    zones: [{ id: 'noodle', label: 'เรือก๋วยเตี๋ยว', stat: 'ขายไปแล้ว {n} ชาม' }, { id: 'fish', label: 'ท่าน้ำ', stat: 'ให้อาหารปลา {n} ครั้ง' }],
    boardTitle: 'ขาประจำตลาดน้ำ', figs: ['#2e86de', '#2e86de', '#e8572a'],
    cards: { big: [['โดนัท (30)', 'เลี้ยงทั้งตลาด'], ['น้ำหอม (20)', 'เรือมะพร้าว']], featured: ['กุหลาบ (1)', 'ก๋วยเตี๋ยวเรือ'], hot: [['กุหลาบ (1)', 'ก๋วยเตี๋ยวเรือ'], ['Finger Heart (5)', 'ขายผลไม้']] },
  }),
  nightmarket: build('nightmarket', {
    name: 'ตลาดนัดกลางคืน', icon: '🏮', desc: 'ตลาดนัดไฟประดับ ร้านหมูปิ้ง ซุ้มยิงปืน ลานดนตรีสด',
    title: 'ตลาดนัดกลางคืน LIVE', subtitle: 'พิมพ์ "ช้อป" เดินตลาด • ส่งของขวัญเหมาร้าน', host: 'เฮียโต้ง', role: 'พ่อค้าหมูปิ้ง',
    hypeFull: 'ตลาดแตก!', bigWord: 'เหมาตลาด!', joinVerb: 'เดินเข้าตลาด',
    palette: { sky: '#1d1b46', sky2: '#2c2861', ground: '#3b3350', ground2: '#4a4063', accent: '#ff5fa2', accent2: '#ffd166', ink: '#ffffff', panel: 'rgba(15,12,40,.9)', host: '#e74c3c', body: ['#e74c3c', '#f39c12', '#8e44ad', '#2980b9'] },
    scene: [[20, 330, 120, 90, '#c0392b', 10], [160, 340, 110, 80, '#2980b9', 10], [290, 330, 110, 90, '#27ae60', 10], [420, 340, 110, 80, '#8e44ad', 10], [0, 316, 540, 6, '#ffd166', 3]],
    tap: 'กดใจ = เดินช้อป • ฟอล = ได้ถุงผ้าลายตลาด • แชร์ = ไฟประดับกะพริบ', podiumTitle: 'ขาช้อปตัวท็อป (ของขวัญสูงสุด)',
    fx: [['🍢', 'หมูปิ้ง 1 ไม้', 'burst', '🍢'], ['🎯', 'ยิงปืนลูกโป่ง', 'burst', '🎈'], ['🧋', 'ชาไทยปั่น', 'shower', '🧋'], ['🧸', 'ตุ๊กตาหมีใหญ่', 'spot', '🧸'], ['🛍️', 'เหมาร้านทั้งแผง', 'parade', '🛍️'], ['🎡', 'ชิงช้าสวรรค์', 'shower', '✨'], ['🎸', 'ดนตรีสดขึ้นเวที', 'parade', '🎵'], ['🎆', 'พลุดอกใหญ่', 'fireworks', ''], ['🏮', 'เหมาตลาด!', 'big', '🏮']],
    goals: [{ label: 'เหรียญ', reward: 'พลุดอกใหญ่', max: 100, effect: 'g8' }, { label: 'ใจ', reward: 'ดนตรีสดขึ้นเวที', max: 1000, effect: 'g7' }],
    cmds: [{ c: 'หิว', a: 'ต่อคิวร้านอาหาร', kind: 'zone', zone: 'pork', emoji: '🍢' }, { c: 'ช้อป', a: 'เดินดูของ', kind: 'emote', emoji: '🛍️' }, { c: 'เต้น', a: 'ลานดนตรีสด', kind: 'dance', emoji: '🕺' }, { c: 'ยิง', a: 'ซุ้มยิงปืน ชิงตุ๊กตา', kind: 'zone', zone: 'shoot', emoji: '🎯' }],
    zones: [{ id: 'pork', label: 'ร้านหมูปิ้ง', stat: 'ขายแล้ว {n} ไม้' }, { id: 'shoot', label: 'ซุ้มยิงปืน', stat: 'ยิงโดน {n} นัด' }],
    boardTitle: 'มือปืนลูกโป่ง', figs: ['#e74c3c', '#f39c12', '#e74c3c'],
    cards: { big: [['โดนัท (30)', 'เหมาร้าน'], ['น้ำหอม (20)', 'ตุ๊กตาหมี']], featured: ['กุหลาบ (1)', 'หมูปิ้ง'], hot: [['กุหลาบ (1)', 'หมูปิ้ง'], ['Finger Heart (5)', 'ยิงลูกโป่ง']] },
  }),
  muay: build('muay', {
    name: 'เวทีมวยไทย', icon: '🥊', desc: 'ศึกมวยไทย กองเชียร์มุมแดง/น้ำเงิน ปี่มวย ระฆังยก',
    title: 'ศึกมวยไทยกลางไลฟ์', subtitle: 'พิมพ์ "แดง" หรือ "น้ำเงิน" เข้ากองเชียร์', host: 'คู่เอก: แดง vs น้ำเงิน', role: 'โฆษกเวที',
    hypeFull: 'กองเชียร์เดือดทั้งสนาม!', bigWord: 'น็อก!', joinVerb: 'เข้าสนามมวย',
    palette: { sky: '#151320', sky2: '#24202f', ground: '#2e2a38', ground2: '#2f6fd6', accent: '#e8453c', accent2: '#ffd166', ink: '#ffffff', panel: 'rgba(10,8,18,.9)', host: '#1f1f1f', body: ['#e8453c', '#2f6fd6', '#e8453c', '#2f6fd6'] },
    scene: [[120, 360, 300, 70, '#2f6fd6', 4], [120, 366, 300, 4, '#ffffff', 0], [120, 384, 300, 4, '#ffffff', 0], [112, 340, 10, 90, '#e8453c', 3], [418, 340, 10, 90, '#2f6fd6', 3]],
    tap: 'กดใจ = ตะโกนเชียร์ • ฟอล = ได้ผ้าประเจียด • แชร์ = ระฆังยก', podiumTitle: 'เซียนมวยขอบเวที (ของขวัญสูงสุด)',
    fx: [['🔴', 'ส่งน้ำมุมแดง', 'burst', '💧'], ['🔵', 'ส่งน้ำมุมน้ำเงิน', 'burst', '💧'], ['🎗️', 'มงคลนักมวย', 'spot', '🎗️'], ['🥊', 'หมัดตรง!', 'burst', '🥊'], ['🏆', 'เข็มขัดแชมป์', 'spot', '🏆'], ['🙏', 'รำไหว้ครูทั้งเวที', 'parade', '🙏'], ['🔔', 'ระฆังยก', 'shower', '🔔'], ['🎆', 'พลุกลางสนาม', 'fireworks', ''], ['🥊', 'น็อก!', 'big', '🥊']],
    goals: [{ label: 'เหรียญ', reward: 'ขึ้นยกต่อไป', max: 100, effect: 'g7' }, { label: 'ใจ', reward: 'ปี่มวยเร่งจังหวะ', max: 1000, effect: 'g6' }],
    cmds: [{ c: 'แดง', a: 'เข้ากองเชียร์มุมแดง', kind: 'zone', zone: 'red', emoji: '🔴' }, { c: 'น้ำเงิน', a: 'เข้ากองเชียร์มุมน้ำเงิน', kind: 'zone', zone: 'blue', emoji: '🔵' }, { c: 'ไหว้ครู', a: 'รำไหว้ครูตาม', kind: 'dance', emoji: '🙏' }, { c: 'ต่อย', a: 'ซ้อมกระสอบทราย', kind: 'emote', emoji: '🥊' }],
    zones: [{ id: 'red', label: 'กองเชียร์มุมแดง', stat: 'เสียงเชียร์ {n}' }, { id: 'blue', label: 'กองเชียร์มุมน้ำเงิน', stat: 'เสียงเชียร์ {n}' }],
    boardTitle: 'กองเชียร์ตัวตึง', figs: ['#e8453c', '#2f6fd6', '#e8453c'],
    cards: { big: [['โดนัท (30)', 'เข็มขัดแชมป์'], ['น้ำหอม (20)', 'หมัดตรง']], featured: ['กุหลาบ (1)', 'น้ำมุมแดง'], hot: [['กุหลาบ (1)', 'น้ำมุมแดง'], ['Finger Heart (5)', 'น้ำมุมน้ำเงิน']] },
  }),
  beach: build('beach', {
    name: 'ปาร์ตี้ชายหาด', icon: '🏖️', desc: 'ปาร์ตี้ริมหาด ว่ายน้ำ โต้คลื่น ก่อปราสาททราย',
    title: 'ปาร์ตี้ริมหาด LIVE', subtitle: 'พิมพ์ "เต้น" ขึ้นฟลอร์ริมหาด • ส่งของขวัญเปิดปาร์ตี้', host: 'DJ ต้นกล้า', role: 'ดีเจริมหาด',
    hypeFull: 'ปาร์ตี้สุดเหวี่ยง!', bigWord: 'ปาร์ตี้!', joinVerb: 'มาถึงชายหาด',
    palette: { sky: '#7fd3f7', sky2: '#1fa5c8', ground: '#f4dd9b', ground2: '#ead08a', accent: '#ff6b6b', accent2: '#ffe66d', ink: '#ffffff', panel: 'rgba(8,70,100,.88)', host: '#ffd93d', body: ['#ff6b6b', '#4ecdc4', '#ffe66d', '#a29bfe'] },
    scene: [[30, 70, 70, 70, '#ffe66d', 35], [420, 330, 12, 110, '#8b5a2b', 6], [380, 312, 90, 30, '#2ecc71', 15], [60, 400, 80, 40, '#ff6b6b', 20], [200, 418, 140, 16, '#ffffff', 8]],
    tap: 'กดใจ = ออกมาเต้น • ฟอล = ได้แว่นกันแดด • แชร์ = คลื่นลูกใหญ่', podiumTitle: 'VIP ริมหาด (ของขวัญสูงสุด)',
    fx: [['🥥', 'มะพร้าวปั่น', 'burst', '🥥'], ['🦆', 'ห่วงยางเป็ด', 'burst', '🦆'], ['🍦', 'ไอติมแท่ง', 'shower', '🍦'], ['🍌', 'บานาน่าโบ๊ต', 'spot', '🍌'], ['🍢', 'บาร์บีคิวทั้งหาด', 'parade', '🍢'], ['🐬', 'โลมากระโดด', 'shower', '🐬'], ['🫧', 'ปาร์ตี้ฟองโฟม', 'shower', '🫧'], ['🎆', 'พลุริมหาด', 'fireworks', ''], ['🏖️', 'ปาร์ตี้ใหญ่!', 'big', '🌴']],
    goals: [{ label: 'เหรียญ', reward: 'ปาร์ตี้ฟองโฟม', max: 100, effect: 'g7' }, { label: 'ใจ', reward: 'พลุริมหาด', max: 1000, effect: 'g8' }],
    cmds: [{ c: 'ว่าย', a: 'ลงทะเลว่ายน้ำ', kind: 'emote', emoji: '🏊' }, { c: 'เซิร์ฟ', a: 'โต้คลื่น สะสมแต้ม', kind: 'zone', zone: 'surf', emoji: '🏄' }, { c: 'ปราสาท', a: 'ก่อปราสาททราย', kind: 'zone', zone: 'castle', emoji: '🏰' }, { c: 'เต้น', a: 'ฟลอร์ริมหาด', kind: 'dance', emoji: '🕺' }],
    zones: [{ id: 'castle', label: 'ลานก่อปราสาททราย', stat: 'ปราสาทแล้ว {n} หลัง' }, { id: 'surf', label: 'จุดโต้คลื่น', stat: 'โต้คลื่น {n} รอบ' }],
    boardTitle: 'เซียนเซิร์ฟ', figs: ['#ff6b6b', '#4ecdc4', '#ffe66d'],
    cards: { big: [['โดนัท (30)', 'บาร์บีคิว'], ['น้ำหอม (20)', 'บานาน่าโบ๊ต']], featured: ['กุหลาบ (1)', 'มะพร้าวปั่น'], hot: [['กุหลาบ (1)', 'มะพร้าวปั่น'], ['Finger Heart (5)', 'ห่วงยางเป็ด']] },
  }),
  farm: build('farm', {
    name: 'ทุ่งนาหน้าเกี่ยว', icon: '🌾', desc: 'ทุ่งนาสีทอง ลงแขกเกี่ยวข้าว ควาย ยุ้งฉาง',
    title: 'ทุ่งนาหน้าเกี่ยว LIVE', subtitle: 'พิมพ์ "เกี่ยว" ช่วยเกี่ยวข้าว • ส่งของขวัญเลี้ยงข้าวทั้งทุ่ง', host: 'ผู้ใหญ่มี', role: 'ผู้ใหญ่บ้าน',
    hypeFull: 'ข้าวเต็มยุ้ง!', bigWord: 'ข้าวเต็มยุ้ง!', joinVerb: 'เดินลงทุ่งนา',
    palette: { sky: '#ffc98b', sky2: '#9ccf6a', ground: '#e8c14f', ground2: '#d9ad3c', accent: '#3f9b4b', accent2: '#ffe08a', ink: '#ffffff', panel: 'rgba(60,40,10,.88)', host: '#2c6fbb', body: ['#2c6fbb', '#c0392b', '#3f9b4b', '#8d5a3b'] },
    scene: [[40, 290, 120, 90, '#7a4a2a', 8], [30, 270, 140, 26, '#5a3a20', 6], [380, 60, 64, 64, '#fff1b8', 32], [300, 380, 200, 40, '#6dbb4a', 20], [0, 418, 540, 6, '#8a6a2a', 0]],
    tap: 'กดใจ = ลงนามาช่วย • ฟอล = ได้หมวกงอบ • แชร์ = นกบินผ่านทุ่ง', podiumTitle: 'เจ้าของนาใจดี (ของขวัญสูงสุด)',
    fx: [['🌱', 'ดำนา 1 กอ', 'burst', '🌱'], ['🐔', 'ให้อาหารไก่', 'burst', '🌽'], ['🍙', 'ข้าวต้มมัด', 'shower', '🍙'], ['🐃', 'ควายเต้นรำ', 'spot', '🐃'], ['🍚', 'เลี้ยงข้าวทั้งทุ่ง', 'parade', '🍚'], ['🚜', 'รถเกี่ยวข้าว', 'shower', '🌾'], ['🌧️', 'ฝนแรกของปี', 'shower', '💧'], ['🎆', 'พลุงานบุญข้าว', 'fireworks', ''], ['🌾', 'ข้าวเต็มยุ้ง!', 'big', '🌾']],
    goals: [{ label: 'เหรียญ', reward: 'ลงแขกเกี่ยวข้าว', max: 100, effect: 'g6' }, { label: 'ใจ', reward: 'ฝนแรกของปี', max: 1000, effect: 'g7' }],
    cmds: [{ c: 'ดำนา', a: 'ลงปักดำ สะสมแต้ม', kind: 'zone', zone: 'plant', emoji: '🌱' }, { c: 'เกี่ยว', a: 'เกี่ยวข้าวเข้ายุ้ง', kind: 'zone', zone: 'rice', emoji: '🌾' }, { c: 'ควาย', a: 'ให้อาหารเจ้าทุย', kind: 'emote', emoji: '🐃' }, { c: 'ร้อง', a: 'ร้องเพลงลูกทุ่ง', kind: 'dance', emoji: '🎶' }],
    zones: [{ id: 'rice', label: 'ลานตากข้าว', stat: 'ข้าวเปลือก {n} ถัง' }, { id: 'plant', label: 'แปลงดำนา', stat: 'ปักดำแล้ว {n} กอ' }],
    boardTitle: 'ชาวนาดีเด่น', figs: ['#2c6fbb', '#c0392b', '#2c6fbb'],
    cards: { big: [['โดนัท (30)', 'เลี้ยงข้าว'], ['น้ำหอม (20)', 'ควายเต้นรำ']], featured: ['กุหลาบ (1)', 'ดำนา'], hot: [['กุหลาบ (1)', 'ดำนา'], ['Finger Heart (5)', 'ให้อาหารไก่']] },
  }),
  cafe: build('cafe', {
    name: 'คาเฟ่ฝนพรำ', icon: '☕', desc: 'คาเฟ่อบอุ่นวันฝนตก กาแฟ แมว หนังสือ เพลงชิล ๆ',
    title: 'คาเฟ่ฝนพรำ LIVE', subtitle: 'พิมพ์ "กาแฟ" สั่งเครื่องดื่ม • ส่งของขวัญเลี้ยงกาแฟ', host: 'พี่ฝน', role: 'บาริสต้า',
    hypeFull: 'ร้านอบอุ่นเต็มที่!', bigWord: 'เลี้ยงทั้งร้าน!', joinVerb: 'เข้ามาหลบฝนในร้าน',
    palette: { sky: '#4a5a73', sky2: '#6b5a4a', ground: '#8a6a4f', ground2: '#a07c5c', accent: '#f2b880', accent2: '#ffe2b8', ink: '#3a220e', panel: 'rgba(40,28,20,.9)', host: '#2f2f2f', body: ['#3b2a1e', '#f2b880', '#8fb8ff', '#c39bff'] },
    scene: [[30, 300, 200, 120, '#7f9cc1', 8], [126, 300, 8, 120, '#5a3f2a', 0], [30, 356, 200, 8, '#5a3f2a', 0], [300, 330, 220, 90, '#5a3f2a', 8], [320, 300, 40, 34, '#c9c9c9', 6]],
    tap: 'กดใจ = เข้ามานั่ง • ฟอล = ได้บัตรสะสมแต้ม • แชร์ = ฟ้าแลบเบา ๆ', podiumTitle: 'ลูกค้าคนโปรด (ของขวัญสูงสุด)',
    fx: [['☕', 'ลาเต้ 1 แก้ว', 'burst', '☕'], ['🥐', 'ครัวซองต์', 'burst', '🥐'], ['🍨', 'อัฟโฟกาโต้', 'shower', '🍨'], ['🐈', 'แมวขึ้นตัก', 'spot', '🐈'], ['☕', 'เลี้ยงกาแฟทั้งร้าน', 'parade', '☕'], ['💗', 'ลาเต้อาร์ตหัวใจ', 'shower', '💗'], ['🌧️', 'ฝนพรำทั้งร้าน', 'shower', '💧'], ['🎆', 'ไฟประดับวิบวับ', 'fireworks', ''], ['🍰', 'เลี้ยงทั้งร้าน!', 'big', '🍰']],
    goals: [{ label: 'เหรียญ', reward: 'เค้กชิ้นใหญ่', max: 100, effect: 'g9' }, { label: 'ใจ', reward: 'ฝนพรำทั้งร้าน', max: 1000, effect: 'g7' }],
    cmds: [{ c: 'กาแฟ', a: 'สั่งเครื่องดื่ม', kind: 'zone', zone: 'bar', emoji: '☕' }, { c: 'นั่ง', a: 'หาที่นั่งริมหน้าต่าง', kind: 'emote', emoji: '🪑' }, { c: 'แมว', a: 'เล่นกับแมวร้าน', kind: 'zone', zone: 'cat', emoji: '🐈' }, { c: 'อ่าน', a: 'หยิบหนังสือมาอ่าน', kind: 'emote', emoji: '📖' }],
    zones: [{ id: 'bar', label: 'เคาน์เตอร์บาร์', stat: 'ชงไปแล้ว {n} แก้ว' }, { id: 'cat', label: 'มุมแมว', stat: 'ลูบแมว {n} ครั้ง' }],
    boardTitle: 'ลูกค้าประจำ', figs: ['#3b2a1e', '#f2b880', '#3b2a1e'],
    cards: { big: [['โดนัท (30)', 'เลี้ยงกาแฟ'], ['น้ำหอม (20)', 'แมวขึ้นตัก']], featured: ['กุหลาบ (1)', 'ลาเต้'], hot: [['กุหลาบ (1)', 'ลาเต้'], ['Finger Heart (5)', 'ครัวซองต์']] },
  }),
  school: build('school', {
    name: 'โรงเรียนวันกีฬาสี', icon: '🏫', desc: 'วันกีฬาสี แข่งวิ่ง กองเชียร์ ครูประจำชั้น โรงอาหาร',
    title: 'กีฬาสีโรงเรียน LIVE', subtitle: 'พิมพ์ "แดง" หรือ "น้ำเงิน" เข้าสี • ส่งของขวัญเชียร์', host: 'ครูสมใจ', role: 'ครูประจำชั้น',
    hypeFull: 'กองเชียร์ดังทั้งโรงเรียน!', bigWord: 'แชมป์!', joinVerb: 'มาโรงเรียน',
    palette: { sky: '#9fd8ff', sky2: '#cfe9d6', ground: '#6bbf59', ground2: '#c9774a', accent: '#ffd23f', accent2: '#ffffff', ink: '#3a2a00', panel: 'rgba(25,45,95,.9)', host: '#ffffff', body: ['#e74c3c', '#2f6fd6', '#f1c40f', '#27ae60'] },
    scene: [[120, 290, 300, 120, '#f5e6c8', 6], [110, 276, 320, 20, '#c0392b', 4], [250, 360, 40, 50, '#8e5a2b', 4], [470, 260, 6, 160, '#9aa3ad', 3], [476, 262, 40, 26, '#2f6fd6', 2]],
    tap: 'กดใจ = ลงสนามเชียร์ • ฟอล = ได้เสื้อกีฬาสี • แชร์ = นกหวีดปรี๊ด', podiumTitle: 'นักเรียนดีเด่น (ของขวัญสูงสุด)',
    fx: [['📒', 'ส่งการบ้าน', 'burst', '📒'], ['🔔', 'ตีระฆังเข้าเรียน', 'burst', '🔔'], ['🍡', 'ไอติมหลอด', 'shower', '🍡'], ['🏃', 'ผลัด 4x100', 'spot', '🏃'], ['🍛', 'เลี้ยงโรงอาหาร', 'parade', '🍛'], ['🏅', 'เหรียญทองทั้งสี', 'shower', '🏅'], ['📣', 'กองเชียร์แปรอักษร', 'parade', '📣'], ['🎆', 'พลุปิดงาน', 'fireworks', ''], ['🏆', 'แชมป์!', 'big', '🏆']],
    goals: [{ label: 'เหรียญ', reward: 'ระฆังพักเที่ยง', max: 100, effect: 'g2' }, { label: 'ใจ', reward: 'กองเชียร์แปรอักษร', max: 1000, effect: 'g7' }],
    cmds: [{ c: 'แดง', a: 'เข้าสีแดง', kind: 'zone', zone: 'red', emoji: '🔴' }, { c: 'น้ำเงิน', a: 'เข้าสีน้ำเงิน', kind: 'zone', zone: 'blue', emoji: '🔵' }, { c: 'วิ่ง', a: 'ลงแข่งวิ่ง', kind: 'dance', emoji: '🏃' }, { c: 'ยกมือ', a: 'ตอบคำถามครู', kind: 'emote', emoji: '🙋' }],
    zones: [{ id: 'red', label: 'สีแดง', stat: 'คะแนนสีแดง {n}' }, { id: 'blue', label: 'สีน้ำเงิน', stat: 'คะแนนสีน้ำเงิน {n}' }],
    boardTitle: 'นักกีฬาดีเด่น', figs: ['#e74c3c', '#2f6fd6', '#f1c40f'],
    cards: { big: [['โดนัท (30)', 'เลี้ยงโรงอาหาร'], ['น้ำหอม (20)', 'ผลัด 4x100']], featured: ['กุหลาบ (1)', 'ส่งการบ้าน'], hot: [['กุหลาบ (1)', 'ส่งการบ้าน'], ['Finger Heart (5)', 'ตีระฆัง']] },
  }),
  // ---------------------------------------------------------------- ธีมเทศกาลรอบปี
  valentine: build('valentine', {
    name: 'วาเลนไทน์', icon: '💘', desc: 'ลานหัวใจยามค่ำ ซุ้มกุหลาบ คู่รักนั่งม้านั่ง — ทีมคนโสด vs ทีมมีคู่',
    title: 'วาเลนไทน์กลางไลฟ์', subtitle: 'พิมพ์ "จับคู่" ลุ้นเป็นคู่รักประจำไลฟ์ • "โสด" หรือ "มีคู่" เข้าทีม', host: 'คิวปิดประจำลาน', role: 'คิวปิด',
    hypeFull: 'ความรักล้นลาน!', bigWord: 'รักแท้!', joinVerb: 'เดินเข้าลานหัวใจ',
    palette: { sky: '#2a0b2a', sky2: '#c2407a', ground: '#6a2450', ground2: '#ff8fab', accent: '#ff4f8b', accent2: '#ffd0de', ink: '#ffffff', panel: 'rgba(40,8,34,.9)', host: '#ff4f8b', body: ['#ff4f8b', '#a78bfa', '#ffd166', '#3b82f6'] },
    scene: [[160, 250, 220, 200, '#ff4f8b', 100], [40, 400, 90, 60, '#ffe3ec', 6], [410, 410, 90, 40, '#8a4a2a', 4]],
    tap: 'กดใจ = หัวใจลอย • ฟอล = ได้กุหลาบ • แชร์ = พลุหัวใจ', podiumTitle: 'คนรักใจดี (ของขวัญสูงสุด)',
    fx: [['🌹', 'กุหลาบหนึ่งดอก', 'burst', '🌹'], ['💗', 'หัวใจลอย', 'shower', '💗'], ['🍫', 'ช็อกโกแลต', 'burst', '🍫'], ['💌', 'จดหมายรัก', 'spot', '💌'], ['🧸', 'ตุ๊กตาหมี', 'burst', '🧸'], ['💞', 'คู่รักเต้นทั้งลาน', 'parade', '💞'], ['🌸', 'ฝนกลีบกุหลาบ', 'shower', '🌸'], ['🎆', 'พลุหัวใจ', 'fireworks', ''], ['💘', 'รักแท้กลางไลฟ์!', 'big', '💘']],
    goals: [{ label: 'เหรียญ', reward: 'ซุ้มกุหลาบเปิดไฟ', max: 100, effect: 'g7' }, { label: 'ใจ', reward: 'หัวใจลอยเต็มฟ้า', max: 1000, effect: 'g2' }],
    cmds: [{ c: 'โสด', a: 'เข้าทีมคนโสด', kind: 'zone', zone: 'single', emoji: '🙋' }, { c: 'มีคู่', a: 'เข้าทีมมีคู่', kind: 'zone', zone: 'couple', emoji: '💑' }, { c: 'รัก', a: 'ส่งหัวใจ', kind: 'emote', emoji: '💗' }, { c: 'จับคู่', a: 'ลุ้นเป็นคู่รักประจำไลฟ์', kind: 'emote', emoji: '💘' }],
    zones: [{ id: 'single', label: 'ทีมคนโสด', stat: 'โสดแต่ใจ {n}' }, { id: 'couple', label: 'ทีมมีคู่', stat: 'หวานใจ {n}' }],
    boardTitle: 'คนรักตัวตึง', figs: ['#ff4f8b', '#a78bfa', '#ffd166'],
    cards: { big: [['โดนัท (30)', 'ตุ๊กตาหมี'], ['น้ำหอม (20)', 'จดหมายรัก']], featured: ['กุหลาบ (1)', 'กุหลาบหนึ่งดอก'], hot: [['กุหลาบ (1)', 'กุหลาบหนึ่งดอก'], ['Finger Heart (5)', 'หัวใจลอย']] },
  }),
  rocket: build('rocket', {
    name: 'บุญบั้งไฟ', icon: '🚀', desc: 'ทุ่งนาอีสาน ค้างบั้งไฟ ขบวนพญานาค — ทีมแดง vs ทีมน้ำเงิน แข่งบั้งไฟใครขึ้นสูงกว่า',
    title: 'บุญบั้งไฟกลางไลฟ์', subtitle: 'พิมพ์ "แดง" หรือ "น้ำเงิน" เติมเชื้อเพลิงบั้งไฟทีมตัวเอง', host: 'หมอแคนประจำงาน', role: 'พิธีกรงานบุญ',
    hypeFull: 'บั้งไฟพุ่งทะลุเมฆ!', bigWord: 'บั้งไฟแสน!', joinVerb: 'มาถึงงานบุญ',
    palette: { sky: '#2a6fb8', sky2: '#ffe2b0', ground: '#7dae58', ground2: '#4f8f34', accent: '#e8453c', accent2: '#ffd166', ink: '#ffffff', panel: 'rgba(13,30,52,.88)', host: '#ff9f43', body: ['#e8453c', '#3b82f6', '#e8453c', '#3b82f6'] },
    scene: [[250, 120, 20, 300, '#a07a44', 4], [80, 400, 380, 30, '#2f9a5a', 15]],
    tap: 'กดใจ = เติมเชื้อเพลิง • ฟอล = ได้ธงบั้งไฟ • แชร์ = จุดชนวน', podiumTitle: 'เจ้าภาพบั้งไฟ (ของขวัญสูงสุด)',
    fx: [['🎋', 'ธงบั้งไฟ', 'burst', '🎋'], ['🔥', 'จุดชนวน', 'burst', '🔥'], ['🥁', 'กลองยาว', 'spot', '🥁'], ['🎶', 'หมอแคน', 'burst', '🎶'], ['🐍', 'ขบวนพญานาค', 'spot', '🐍'], ['💃', 'เซิ้งทั้งลาน', 'parade', '💃'], ['💨', 'ควันบั้งไฟ', 'shower', '💨'], ['🎆', 'พลุกลางทุ่ง', 'fireworks', ''], ['🚀', 'บั้งไฟแสน!', 'big', '🚀']],
    goals: [{ label: 'เหรียญ', reward: 'จุดบั้งไฟลูกใหญ่', max: 100, effect: 'g9' }, { label: 'ใจ', reward: 'เซิ้งทั้งลาน', max: 1000, effect: 'g6' }],
    cmds: [{ c: 'แดง', a: 'เติมเชื้อเพลิงทีมแดง', kind: 'zone', zone: 'red', emoji: '🔴' }, { c: 'น้ำเงิน', a: 'เติมเชื้อเพลิงทีมน้ำเงิน', kind: 'zone', zone: 'blue', emoji: '🔵' }, { c: 'เซิ้ง', a: 'ออกมาเซิ้ง', kind: 'dance', emoji: '💃' }, { c: 'จุด', a: 'ตะโกนจุดบั้งไฟ', kind: 'emote', emoji: '🔥' }],
    zones: [{ id: 'red', label: 'บั้งไฟทีมแดง', stat: 'เชื้อเพลิง {n}' }, { id: 'blue', label: 'บั้งไฟทีมน้ำเงิน', stat: 'เชื้อเพลิง {n}' }],
    boardTitle: 'ช่างบั้งไฟตัวตึง', figs: ['#e8453c', '#3b82f6', '#ffd166'],
    cards: { big: [['โดนัท (30)', 'ขบวนพญานาค'], ['น้ำหอม (20)', 'หมอแคน']], featured: ['กุหลาบ (1)', 'ธงบั้งไฟ'], hot: [['กุหลาบ (1)', 'ธงบั้งไฟ'], ['Finger Heart (5)', 'จุดชนวน']] },
  }),
  mother: build('mother', {
    name: 'วันแม่', icon: '💐', desc: 'สวนยามเช้า เรือนไทย พวงมาลัยมะลิ — ร้อยมาลัยและเขียนการ์ดถึงแม่',
    title: 'วันแม่กลางไลฟ์', subtitle: 'พิมพ์ "รักแม่" ส่งดอกมะลิ • "มาลัย" หรือ "การ์ด" เข้าทีม', host: 'ลูกรักของแม่', role: 'พิธีกร',
    hypeFull: 'มะลิบานทั้งสวน!', bigWord: 'รักแม่!', joinVerb: 'มาร่วมงานวันแม่',
    palette: { sky: '#8ec5f5', sky2: '#fff3df', ground: '#a8d68e', ground2: '#6aa85a', accent: '#2f6fb8', accent2: '#ffffff', ink: '#ffffff', panel: 'rgba(28,60,110,.88)', host: '#5a8fd0', body: ['#5a8fd0', '#ffffff', '#ffd166', '#a78bfa'] },
    scene: [[300, 260, 180, 120, '#c4935e', 6], [20, 400, 160, 60, '#4f8f46', 30]],
    tap: 'กดใจ = ดอกมะลิลอย • ฟอล = ได้มาลัย • แชร์ = มาลัยยาวขึ้น', podiumTitle: 'ลูกกตัญญู (ของขวัญสูงสุด)',
    fx: [['🌼', 'ดอกมะลิ', 'burst', '🌼'], ['💐', 'ช่อดอกไม้', 'burst', '💐'], ['💌', 'การ์ดถึงแม่', 'spot', '💌'], ['🫖', 'น้ำชาให้แม่', 'burst', '🫖'], ['🧣', 'ผ้าพันคอ', 'spot', '🧣'], ['🙏', 'ไหว้แม่ทั้งลาน', 'parade', '🙏'], ['🌸', 'ฝนดอกมะลิ', 'shower', '🌼'], ['🎆', 'พลุวันแม่', 'fireworks', ''], ['💙', 'รักแม่ที่สุด!', 'big', '💙']],
    goals: [{ label: 'เหรียญ', reward: 'มาลัยพวงใหญ่', max: 100, effect: 'g7' }, { label: 'ใจ', reward: 'ฝนดอกมะลิ', max: 1000, effect: 'g7' }],
    cmds: [{ c: 'มาลัย', a: 'ร้อยมาลัยให้แม่', kind: 'zone', zone: 'garland', emoji: '🌼' }, { c: 'การ์ด', a: 'เขียนการ์ดถึงแม่', kind: 'zone', zone: 'card', emoji: '💌' }, { c: 'รักแม่', a: 'ส่งดอกมะลิ', kind: 'emote', emoji: '💙' }, { c: 'ไหว้', a: 'ไหว้แม่', kind: 'dance', emoji: '🙏' }],
    zones: [{ id: 'garland', label: 'ทีมร้อยมาลัย', stat: 'มาลัย {n} พวง' }, { id: 'card', label: 'ทีมการ์ดวันแม่', stat: 'การ์ด {n} ใบ' }],
    boardTitle: 'ลูกรักตัวตึง', figs: ['#5a8fd0', '#ffffff', '#ffd166'],
    cards: { big: [['โดนัท (30)', 'ผ้าพันคอ'], ['น้ำหอม (20)', 'น้ำชาให้แม่']], featured: ['กุหลาบ (1)', 'ดอกมะลิ'], hot: [['กุหลาบ (1)', 'ดอกมะลิ'], ['Finger Heart (5)', 'ช่อดอกไม้']] },
  }),
  moon: build('moon', {
    name: 'ไหว้พระจันทร์', icon: '🥮', desc: 'คืนเพ็ญ โคมแดง โต๊ะไหว้ ขนมไหว้พระจันทร์ — ปล่อยโคมขอพรพร้อมชื่อ',
    title: 'ไหว้พระจันทร์กลางไลฟ์', subtitle: 'พิมพ์ "ขอพร" ปล่อยโคม • "โคม" หรือ "ขนม" เข้าทีม', host: 'เจ้าภาพงานไหว้', role: 'พิธีกร',
    hypeFull: 'โคมเต็มฟ้า!', bigWord: 'จันทร์เพ็ญ!', joinVerb: 'มาไหว้พระจันทร์',
    palette: { sky: '#060a24', sky2: '#2e2456', ground: '#1a1f4a', ground2: '#2a1a3a', accent: '#d62f2f', accent2: '#ffd166', ink: '#ffffff', panel: 'rgba(10,16,48,.9)', host: '#d62f2f', body: ['#d62f2f', '#ffd166', '#a78bfa', '#3b82f6'] },
    scene: [[200, 80, 140, 140, '#fff4cf', 70], [140, 360, 260, 30, '#b8322a', 4]],
    tap: 'กดใจ = โคมลอย • ฟอล = ได้ขนมไหว้ • แชร์ = จุดโคมทั้งแถว', podiumTitle: 'เจ้าภาพโต๊ะไหว้ (ของขวัญสูงสุด)',
    fx: [['🏮', 'โคมแดง', 'burst', '🏮'], ['🥮', 'ขนมไหว้พระจันทร์', 'burst', '🥮'], ['🍵', 'น้ำชา', 'burst', '🍵'], ['🐇', 'กระต่ายดวงจันทร์', 'spot', '🐇'], ['🪭', 'พัดจีน', 'spot', '🪭'], ['💃', 'รำโคมทั้งลาน', 'parade', '🏮'], ['✨', 'ฝนดาว', 'shower', '✨'], ['🎆', 'พลุคืนเพ็ญ', 'fireworks', ''], ['🌕', 'จันทร์เพ็ญอวยพร!', 'big', '🌕']],
    goals: [{ label: 'เหรียญ', reward: 'โคมแดงสว่างทั้งแถว', max: 100, effect: 'g7' }, { label: 'ใจ', reward: 'โคมลอยเต็มฟ้า', max: 1000, effect: 'g6' }],
    cmds: [{ c: 'โคม', a: 'เข้าทีมโคมแดง', kind: 'zone', zone: 'lantern', emoji: '🏮' }, { c: 'ขนม', a: 'เข้าทีมขนมไหว้', kind: 'zone', zone: 'cake', emoji: '🥮' }, { c: 'ขอพร', a: 'ปล่อยโคมขอพร', kind: 'emote', emoji: '🙏' }, { c: 'เต้น', a: 'ออกมารำโคม', kind: 'dance', emoji: '💃' }],
    zones: [{ id: 'lantern', label: 'ทีมโคมแดง', stat: 'โคม {n} ดวง' }, { id: 'cake', label: 'ทีมขนมไหว้', stat: 'ขนม {n} ชิ้น' }],
    boardTitle: 'คนขอพรตัวตึง', figs: ['#d62f2f', '#ffd166', '#a78bfa'],
    cards: { big: [['โดนัท (30)', 'พัดจีน'], ['น้ำหอม (20)', 'กระต่ายดวงจันทร์']], featured: ['กุหลาบ (1)', 'โคมแดง'], hot: [['กุหลาบ (1)', 'โคมแดง'], ['Finger Heart (5)', 'ขนมไหว้พระจันทร์']] },
  }),
};

// ================================================================ ธีมที่สร้างเอง (ผู้สนับสนุน)
// เริ่มจากธีมเลย์เอาต์งานวัด LIVE ตัวใดตัวหนึ่ง (base) แล้วแก้ชื่อ สี คำสั่ง โซน เป้าหมาย เอฟเฟกต์ของขวัญได้
const FX_KINDS = ['shower', 'burst', 'spot', 'parade', 'fireworks', 'big'];
const CMD_KINDS = ['dance', 'zone', 'emote'];
const PAL_KEYS = ['sky', 'sky2', 'ground', 'ground2', 'accent', 'accent2', 'ink', 'host'];

// แปลงธีมที่ build แล้วกลับเป็นข้อมูลตั้งต้น (ใช้เติมฟอร์มในหลังบ้าน)
function specOf(m) {
  return {
    name: m.name, icon: m.icon, desc: m.desc, title: m.defaults.title, subtitle: m.defaults.subtitle, host: m.defaults.host,
    role: m.hud.role, hypeFull: m.texts.hypeFull, bigWord: m.texts.bigWord, joinVerb: m.texts.joinVerb,
    palette: { ...m.hud.palette }, scene: m.hud.scene, tap: m.hud.tap, podiumTitle: m.hud.podiumTitle, boardTitle: m.hud.boardTitle,
    fx: KEYS.map((k) => [m.effects[k].icon, m.effects[k].label, m.effects[k].kind, m.effects[k].emoji]),
    goals: m.hud.goals.map((g) => ({ ...g })), cmds: m.hud.cmds.map((c) => ({ ...c })), zones: m.hud.zones.map((z) => ({ ...z })),
    cards: m.hud.cards, figs: m.hud.figs,
  };
}

const str = (v, n, d = '') => (typeof v === 'string' ? v.replace(/[\x00-\x1f<>]/g, '').trim().slice(0, n) : '') || d;
const color = (v, d) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : d);
const int = (v, lo, hi, d) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.min(hi, Math.max(lo, Math.round(Number(v)))) : d);

function sanitizeCustom(x) {
  const base = HUD_THEMES[x?.base] ? x.base : 'temple';
  const b = specOf(HUD_THEMES[base]);
  const s = { ...b, base, desc: 'ธีมที่คุณสร้างเอง (ผู้สนับสนุน TubHool)' };
  s.name = str(x?.name, 30, 'ธีมของฉัน');
  s.icon = str(x?.icon, 8, '🎨');
  for (const [k, n] of [['title', 40], ['subtitle', 80], ['host', 30], ['role', 30], ['hypeFull', 40], ['bigWord', 20], ['joinVerb', 30], ['tap', 120], ['podiumTitle', 50], ['boardTitle', 30]]) s[k] = str(x?.[k], n, b[k]);
  s.palette = { ...b.palette };
  for (const k of PAL_KEYS) s.palette[k] = color(x?.palette?.[k], b.palette[k]);
  s.fx = b.fx.map((d, i) => {
    const f = Array.isArray(x?.fx?.[i]) ? x.fx[i] : [];
    return [str(f[0], 8, d[0]), str(f[1], 24, d[1]), FX_KINDS.includes(f[2]) ? f[2] : d[2], str(f[3], 8, d[3])];
  });
  s.goals = b.goals.map((g, i) => {
    const y = x?.goals?.[i] || {};
    return { label: g.label, reward: str(y.reward, 30, g.reward), max: int(y.max, 10, 10_000_000, g.max), effect: KEYS.includes(y.effect) ? y.effect : g.effect };
  });
  s.zones = b.zones.map((z, i) => {
    const y = x?.zones?.[i] || {};
    const stat = str(y.stat, 40, z.stat);
    return { id: z.id, label: str(y.label, 24, z.label), stat: stat.includes('{n}') ? stat : `${stat} {n}` };
  });
  const cmds = Array.isArray(x?.cmds) ? x.cmds : b.cmds;
  s.cmds = cmds
    .slice(0, 4)
    .map((c) => {
      const kind = CMD_KINDS.includes(c?.kind) ? c.kind : 'emote';
      const out = { c: str(c?.c, 20), a: str(c?.a, 30, '—'), kind, emoji: str(c?.emoji, 8, '✨') };
      if (kind === 'zone') out.zone = s.zones.some((z) => z.id === c.zone) ? c.zone : s.zones[0].id;
      return out;
    })
    .filter((c) => c.c);
  // การ์ดแนะนำของขวัญ ทำใหม่จากชื่อกิจกรรมที่แก้แล้ว
  s.cards = {
    big: [[`${GIFTS[4][0]} (${GIFTS[4][1]})`, s.fx[4][1]], [`${GIFTS[3][0]} (${GIFTS[3][1]})`, s.fx[3][1]]],
    featured: [`${GIFTS[0][0]} (${GIFTS[0][1]})`, s.fx[0][1]],
    hot: [[`${GIFTS[0][0]} (${GIFTS[0][1]})`, s.fx[0][1]], [`${GIFTS[1][0]} (${GIFTS[1][1]})`, s.fx[1][1]]],
  };
  return s;
}

// เลย์เอาต์ที่ลากวางเอง (หน้า "สร้างธีมเอง"): ตำแหน่ง/ขนาด/สี/ชั้นของแต่ละแผง + สติกเกอร์ • พิกัดหน้าเวที 1080 x 1920
const LAYOUT_BLOCKS = ['ttl', 'host', 'rings', 'hrank', 'signs', 'zbox', 'tick', 'hype'];
const num = (v, lo, hi, d) => (Number.isFinite(Number(v)) ? Math.min(hi, Math.max(lo, Math.round(Number(v) * 100) / 100)) : d);
function sanitizeLayout(l) {
  const out = { blocks: {}, stickers: [] };
  for (const k of LAYOUT_BLOCKS) {
    const b = l?.blocks?.[k];
    if (!b || typeof b !== 'object') continue;
    const o = {};
    if (b.x !== undefined) o.x = num(b.x, -400, 1400, 0);
    if (b.y !== undefined) o.y = num(b.y, -400, 2200, 0);
    if (b.s !== undefined) o.s = num(b.s, 0.4, 2.5, 1);
    if (b.z !== undefined) o.z = num(b.z, 0, 40, 0);
    if (b.hide) o.hide = true;
    if (b.c) o.c = color(b.c, undefined);
    if (o.c === undefined) delete o.c;
    if (Object.keys(o).length) out.blocks[k] = o;
  }
  for (const s of (Array.isArray(l?.stickers) ? l.stickers : []).slice(0, 30)) {
    const v = str(s?.v, 40);
    if (!v) continue;
    out.stickers.push({ k: s.k === 'text' ? 'text' : 'emoji', v, x: num(s.x, -200, 1300, 540), y: num(s.y, -200, 2100, 960), s: num(s.s, 0.3, 4, 1), z: num(s.z, 0, 40, 5), c: color(s.c, '#ffffff') });
  }
  return out;
}

// ฉากภาพ 2.5D (ภาพของฉัน + แผนที่ความลึก) — ไฟล์อยู่ที่ /pics/<sha1>.jpg|png (อัปโหลดผ่าน /api/pic)
const PIC_URL = /^\/pics\/[a-f0-9]{40}\.(jpg|png)$/;
const PIC_FX = ['gold', 'petal', 'snow', 'firefly', 'bokeh', 'none'];
function sanitizePic(p) {
  if (!p || !PIC_URL.test(p.img || '')) return null;
  return {
    img: p.img,
    depth: PIC_URL.test(p.depth || '') ? p.depth : '',
    fx: PIC_FX.includes(p.fx) ? p.fx : 'gold',
    motion: num(p.motion, 0, 2, 1),
    glow: num(p.glow, 0, 2, 1),
    rays: !!p.rays,
    floor: Math.round(num(p.floor, -300, 200, 0)),
  };
}

function buildCustom(x) {
  const s = sanitizeCustom(x);
  s.layout = sanitizeLayout(x?.layout);
  s.pic = sanitizePic(x?.pic);
  const t = build('custom', s);
  t.hud.layout = s.layout;
  t.hud.pic = s.pic;
  t.alias = ALIAS[s.base];
  t.previewOf = s.base; // ใช้ภาพตัวอย่างของธีมต้นแบบ
  t.custom = true;
  t.spec = s;
  return t;
}

module.exports = { HUD_THEMES, specOf, sanitizeCustom, buildCustom, build };
