// ข้อมูลธีม (ใช้ทั้งฝั่งเซิร์ฟเวอร์และส่งให้หน้าเวที/แผงควบคุม)
// ส่วนภาพและเอฟเฟกต์จริงอยู่ที่ public/themes/<id>.js

const giftList = (effects) => {
  const names = [
    ['Rose', 1], ['Finger Heart', 5], ['Rosa', 10], ['Perfume', 20], ['Doughnut', 30],
    ['Confetti', 100], ['Peeka-Bro', 199], ['Corgi', 299], ['Travel with You', 999],
  ];
  return names.map(([name, diamonds], i) => ({ name, diamonds, effect: effects[i] }));
};

const THEMES = {
  concert: {
    id: 'concert',
    name: 'คอนเสิร์ต',
    icon: '🎤',
    desc: 'เวทีคอนเสิร์ต ไฟเวที เลเซอร์ พลุ คนดูถือแท่งไฟเต้นตามจังหวะ',
    fields: ['nowPlaying', 'artist', 'bpm', 'showPerformer'],
    requestAction: 'sing',
    bigEffect: 'encore',
    texts: {
      gifts: '🎁 ส่งของขวัญจุดโชว์',
      top: '👑 Top 5 แฟนคลับ',
      queue: '🎵 คิวขอเพลง',
      queueEmpty: 'ยังไม่มีคนขอเพลง',
      queueBy: 'โดย',
      hype: '⚡ พลังแฟนคลับ',
      hypeFull: 'พลังแฟนคลับเต็มหลอด!',
      bigWord: 'ENCORE!',
      bigSubUser: 'ขอบคุณสำหรับโชว์ใหญ่!',
      bigSubAll: 'ขอบคุณทุกพลังเชียร์!',
      joinVerb: 'เข้าฮอลล์',
      emptyTop: 'ยังไม่มีใครส่งของขวัญ<br>เป็นคนแรกเลย!',
    },
    effects: {
      flowers: { icon: '🌹', label: 'โยนดอกไม้ขึ้นเวที' },
      hearts: { icon: '💗', label: 'หัวใจลอยทั่วฮอลล์' },
      lightstick: { icon: '🪄', label: 'เปลี่ยนสีแท่งไฟทั้งฮอลล์' },
      confetti: { icon: '🎊', label: 'ยิงกระดาษสี' },
      spotlight: { icon: '🔦', label: 'สปอตไลต์ส่องคนส่ง' },
      fireworks: { icon: '🎆', label: 'จุดพลุ' },
      laser: { icon: '⚡', label: 'เลเซอร์โชว์' },
      pyro: { icon: '🔥', label: 'ไฟพุ่งหน้าเวที' },
      encore: { icon: '👑', label: 'ENCORE! โชว์ใหญ่เต็มจอ' },
    },
    defaults: {
      title: 'คอนเสิร์ตกลางไลฟ์',
      subtitle: 'คอมเมนต์เพื่อเข้าฮอลล์ • ส่งของขวัญเพื่อจุดโชว์',
      requestCommand: 'ขอเพลง',
      nowPlaying: 'เพลงเปิดฮอลล์',
      artist: 'ศิลปินบนเวที',
      bpm: 112,
      showPerformer: true,
      gifts: giftList(['flowers', 'hearts', 'lightstick', 'confetti', 'spotlight', 'fireworks', 'laser', 'pyro', 'encore']),
    },
  },

  shrine: {
    id: 'shrine',
    name: 'ไหว้ศาล',
    icon: '🙏',
    desc: 'ศาลกลางป่ายามค่ำ คนดูนั่งพนมมือถือธูป ส่งของขวัญถวาย ขอพร เลขมงคล',
    fields: [],
    requestAction: 'read',
    bigEffect: 'miracle',
    texts: {
      gifts: '🙏 ถวายของขวัญ',
      top: '🪷 Top 5 สายบุญ',
      queue: '📜 คำขอพร',
      queueEmpty: 'ยังไม่มีใครขอพร',
      queueBy: 'จาก',
      hype: '✨ พลังศรัทธา',
      hypeFull: 'พลังศรัทธาเต็มเปี่ยม!',
      bigWord: 'สาธุ!',
      bigSubUser: 'ขอให้สมปรารถนาทุกประการ',
      bigSubAll: 'ขอให้ทุกคนสมหวังดังใจ',
      joinVerb: 'มาไหว้ศาล',
      emptyTop: 'ยังไม่มีใครถวาย<br>ร่วมทำบุญเป็นคนแรก',
    },
    effects: {
      luckynum: { icon: '🍀', label: 'จุดธูปรับเลขนำโชค', safeLabel: 'จุดธูปรับพร' },
      incense: { icon: '🪔', label: 'จุดธูปขอพร' },
      garland: { icon: '🌼', label: 'ถวายพวงมาลัย' },
      candles: { icon: '🕯️', label: 'จุดเทียนทั้งลาน' },
      petals: { icon: '🏵️', label: 'โปรยกลีบดาวเรือง' },
      blessing: { icon: '✨', label: 'แสงศักดิ์สิทธิ์ส่องคุณ' },
      lucky: { icon: '🔢', label: 'เลขมงคลใหญ่เต็มจอ', safeLabel: 'พรศักดิ์สิทธิ์เต็มจอ', safeIcon: '✨' },
      fireflies: { icon: '🌟', label: 'หิ่งห้อยทั้งป่า' },
      bell: { icon: '🔔', label: 'ระฆังดังกังวาน' },
      miracle: { icon: '🙏', label: 'ปาฏิหาริย์! เต็มจอ' },
    },
    defaults: {
      title: 'ศาลศักดิ์สิทธิ์กลางไพร',
      subtitle: 'คอมเมนต์เพื่อเข้ามาไหว้ • ส่งของขวัญถวายศาล',
      requestCommand: 'ขอพร',
      gifts: giftList(['luckynum', 'garland', 'candles', 'petals', 'blessing', 'lucky', 'fireflies', 'bell', 'miracle']),
    },
  },

  krathong: {
    id: 'krathong',
    name: 'ลอยกระทง',
    icon: '🪷',
    desc: 'คืนเพ็ญริมแม่น้ำ คอมเมนต์แล้วกระทงชื่อคุณลอยไปตามน้ำ โคมลอย พลุ',
    fields: [],
    requestAction: 'read',
    bigEffect: 'fullmoon',
    texts: {
      gifts: '🪷 ส่งของขวัญร่วมงาน',
      top: '🏮 Top 5 ประจำคืน',
      queue: '🌕 คำอธิษฐาน',
      queueEmpty: 'ยังไม่มีคำอธิษฐาน',
      queueBy: 'จาก',
      hype: '🌕 พลังแสงจันทร์',
      hypeFull: 'แสงจันทร์เต็มดวง!',
      bigWord: 'คืนวันเพ็ญ',
      bigSubUser: 'ขอให้สิ่งไม่ดีลอยไปกับสายน้ำ',
      bigSubAll: 'สุขสันต์วันลอยกระทง',
      joinVerb: 'มาร่วมลอยกระทง',
      emptyTop: 'ยังไม่มีใครส่งของขวัญ<br>ร่วมงานเป็นคนแรก',
    },
    effects: {
      krathong: { icon: '🪷', label: 'ลอยกระทงพิเศษ' },
      lotus: { icon: '🌸', label: 'ดอกบัวบานทั้งน้ำ' },
      riverlights: { icon: '💡', label: 'เปลี่ยนสีไฟริมน้ำ' },
      sparklers: { icon: '🎇', label: 'ไฟเย็นทั้งท่าน้ำ' },
      moonbeam: { icon: '🌙', label: 'แสงจันทร์ส่องคุณ' },
      fireworks: { icon: '🎆', label: 'พลุเหนือแม่น้ำ' },
      khomloi: { icon: '🏮', label: 'ปล่อยโคมลอย' },
      golden: { icon: '👑', label: 'กระทงทองยักษ์' },
      fullmoon: { icon: '🌕', label: 'คืนวันเพ็ญ เต็มจอ' },
    },
    defaults: {
      title: 'ลอยกระทงกลางไลฟ์',
      subtitle: 'คอมเมนต์แล้วกระทงชื่อคุณจะลอยไปตามน้ำ',
      requestCommand: 'อธิษฐาน',
      gifts: giftList(['krathong', 'lotus', 'riverlights', 'sparklers', 'moonbeam', 'fireworks', 'khomloi', 'golden', 'fullmoon']),
    },
  },

  fishing: {
    id: 'fishing',
    name: 'ตกปลาริมบึง',
    icon: '🎣',
    desc: 'บึงยามเย็น คนดูยืนตกปลาบนท่าน้ำ พิมพ์ "ตก" แล้วลุ้นได้ปลาหายาก ส่งของขวัญได้เหยื่อดีขึ้น',
    fields: [],
    requestAction: 'read',
    bigEffect: 'goldfish',
    hint: 'พิมพ์ "ตก" เพื่อตกปลา 🎣',
    texts: {
      gifts: '🎣 ส่งของขวัญได้เหยื่อดี',
      top: '🏆 Top 5 นักตกปลา',
      queue: '🐟 ปลาตัวใหญ่วันนี้',
      queueEmpty: 'ยังไม่มีใครตกได้<br>พิมพ์ "ตก" เลย!',
      queueBy: 'โดย',
      hype: '🐟 พลังบึง',
      hypeFull: 'ปลาทองปรากฏตัว!',
      bigWord: 'ปลาทองยักษ์!',
      bigSubUser: 'ตกได้ปลาในตำนาน!',
      bigSubAll: 'ปลาทองขึ้นมาทักทายทุกคน!',
      joinVerb: 'มานั่งตกปลา',
      emptyTop: 'ยังไม่มีใครส่งของขวัญ<br>เป็นคนแรกเลย!',
    },
    effects: {
      splash: { icon: '🐟', label: 'ปลากระโดดน้ำ' },
      bait: { icon: '🪱', label: 'เหยื่อทองคำ' },
      lilies: { icon: '🪷', label: 'บัวบานทั้งบึง' },
      dragonfly: { icon: '🪰', label: 'แมลงปอบินทั่วบึง' },
      sunbeam: { icon: '🌅', label: 'แสงตะวันส่องคุณ' },
      frenzy: { icon: '🐠', label: 'ปลาแตกฝูงทั้งบึง' },
      boat: { icon: '🛶', label: 'เรือพายผ่านมา' },
      giant: { icon: '🐋', label: 'ปลาบึกยักษ์กระโดด' },
      goldfish: { icon: '👑', label: 'ปลาทองยักษ์ เต็มจอ' },
    },
    defaults: {
      title: 'ตกปลาริมบึง',
      subtitle: 'พิมพ์ "ตก" แล้วลุ้นปลาหายาก • ของขวัญ = เหยื่อดีขึ้น',
      requestCommand: '',
      gifts: giftList(['splash', 'bait', 'lilies', 'dragonfly', 'sunbeam', 'frenzy', 'boat', 'giant', 'goldfish']),
    },
  },

  songkran: {
    id: 'songkran',
    name: 'สงกรานต์',
    icon: '💦',
    desc: 'ถนนสาดน้ำกลางวัน คนดูถือปืนฉีดน้ำ คอมเมนต์แล้วยิงน้ำใส่เพื่อน ของขวัญได้ถังน้ำ โฟม ช้างพ่นน้ำ',
    fields: [],
    requestAction: 'read',
    bigEffect: 'songkran',
    hint: 'คอมเมนต์อะไรก็ได้ = ยิงน้ำใส่เพื่อน! 💦',
    texts: {
      gifts: '💦 ส่งของขวัญสาดน้ำ',
      top: '👑 Top 5 สายเปียก',
      queue: '🌸 คำอวยพรสงกรานต์',
      queueEmpty: 'ยังไม่มีคำอวยพร',
      queueBy: 'จาก',
      hype: '💧 พลังความสนุก',
      hypeFull: 'ความสนุกเต็มถนน!',
      bigWord: 'สุขสันต์วันสงกรานต์!',
      bigSubUser: 'สาดความสุขให้ทุกคน!',
      bigSubAll: 'ขอให้ชุ่มฉ่ำทั้งปี!',
      joinVerb: 'มาเล่นน้ำ',
      emptyTop: 'ยังไม่มีใครส่งของขวัญ<br>เป็นคนแรกเลย!',
    },
    effects: {
      watergun: { icon: '🔫', label: 'ปืนฉีดน้ำรัว ๆ' },
      bucket: { icon: '🪣', label: 'สาดน้ำทั้งถัง' },
      powder: { icon: '🤍', label: 'ประแป้งดินสอพอง' },
      bubbles: { icon: '🫧', label: 'ฟองสบู่ลอยทั่วถนน' },
      rainbow: { icon: '🌈', label: 'รุ้งส่องคุณ' },
      foam: { icon: '🧼', label: 'ปาร์ตี้โฟม' },
      elephant: { icon: '🐘', label: 'ช้างพ่นน้ำ' },
      firetruck: { icon: '🚒', label: 'ฝนห่าใหญ่ทั้งจอ' },
      songkran: { icon: '👑', label: 'สงกรานต์ใหญ่ เต็มจอ' },
    },
    defaults: {
      title: 'สงกรานต์กลางไลฟ์',
      subtitle: 'คอมเมนต์ = ยิงน้ำใส่เพื่อน • ส่งของขวัญสาดน้ำทั้งถนน',
      requestCommand: 'อวยพร',
      gifts: giftList(['watergun', 'bucket', 'powder', 'bubbles', 'rainbow', 'foam', 'elephant', 'firetruck', 'songkran']),
    },
  },

  cny: {
    id: 'cny',
    name: 'ตรุษจีน',
    icon: '🧧',
    desc: 'ศาลเจ้าจีนยามค่ำ โคมแดงเต็มฟ้า พิมพ์ "อั่งเปา" รับคำอวยพร เชิดสิงโต มังกรทอง ประทัด',
    fields: [],
    requestAction: 'read',
    bigEffect: 'fortune',
    hint: 'พิมพ์ "อั่งเปา" รับคำอวยพร 🧧',
    texts: {
      gifts: '🧧 ส่งของขวัญรับโชค',
      top: '💰 Top 5 เฮงที่สุด',
      queue: '🏮 คำขอพรปีใหม่',
      queueEmpty: 'ยังไม่มีใครขอพร',
      queueBy: 'จาก',
      hype: '💰 พลังโชคลาภ',
      hypeFull: 'โชคลาภเต็มเปี่ยม!',
      bigWord: 'ซินเจียยู่อี่',
      bigSubUser: 'ซินนี้ฮวดไช้ เฮงๆ ปังๆ!',
      bigSubAll: 'ขอให้ทุกคนร่ำรวยตลอดปี!',
      joinVerb: 'มาไหว้ศาลเจ้า',
      emptyTop: 'ยังไม่มีใครส่งของขวัญ<br>เฮงก่อนใครเลย!',
    },
    effects: {
      angpao: { icon: '🧧', label: 'อั่งเปาคำอวยพร' },
      lanterns: { icon: '🏮', label: 'โคมแดงลอยฟ้า' },
      firecrackers: { icon: '🧨', label: 'จุดประทัด' },
      coins: { icon: '🪙', label: 'ฝนเหรียญทอง' },
      blessing: { icon: '✨', label: 'แสงเทพเจ้าโชคลาภ' },
      lion: { icon: '🦁', label: 'เชิดสิงโต' },
      fireworks: { icon: '🎆', label: 'จุดพลุ' },
      dragon: { icon: '🐉', label: 'มังกรทองบินทั่วจอ' },
      fortune: { icon: '👑', label: 'ซินเจียยู่อี่ เต็มจอ' },
    },
    defaults: {
      title: 'ตรุษจีนกลางไลฟ์',
      subtitle: 'พิมพ์ "อั่งเปา" รับพร • ส่งของขวัญเรียกโชคลาภ',
      requestCommand: 'ขอพร',
      gifts: giftList(['angpao', 'lanterns', 'firecrackers', 'coins', 'blessing', 'lion', 'fireworks', 'dragon', 'fortune']),
    },
  },

  ghost: {
    id: 'ghost',
    name: 'บ้านผีสิง',
    icon: '👻',
    desc: 'เรือนไทยร้างกลางดง หมอกลง คนดูถือไฟฉาย ส่งของขวัญเรียกผีไทยสายน่ารัก นางตานี กระสือ',
    fields: [],
    requestAction: 'read',
    bigEffect: 'haunt',
    hint: 'พิมพ์ "ส่อง" ฉายไฟหาผี 🔦',
    texts: {
      gifts: '👻 ส่งของขวัญเรียกผี',
      top: '💀 Top 5 คนใจกล้า',
      queue: '🕯️ เรื่องหลอนจากคนดู',
      queueEmpty: 'ยังไม่มีใครเล่าเรื่องหลอน',
      queueBy: 'จาก',
      hype: '😱 ระดับความหลอน',
      hypeFull: 'ความหลอนพุ่งถึงขีดสุด!',
      bigWord: 'ผีมาแล้ว!!!',
      bigSubUser: 'ปลุกผีทั้งเรือน!',
      bigSubAll: 'ทุกคนอย่าหันหลังนะ...',
      joinVerb: 'กล้าเข้ามาในเรือน',
      emptyTop: 'ยังไม่มีใครกล้าส่งของขวัญ<br>ลองดูไหม...',
    },
    effects: {
      wisp: { icon: '👻', label: 'ผีน้อยลอยผ่าน' },
      eyes: { icon: '👀', label: 'ดวงตาในความมืด' },
      torches: { icon: '🔦', label: 'ไฟฉายเปลี่ยนสีทั้งกลุ่ม' },
      bats: { icon: '🦇', label: 'ค้างคาวบินว่อน' },
      torchspot: { icon: '💡', label: 'ไฟฉายส่องคุณ' },
      tani: { icon: '🍌', label: 'นางตานีโผล่' },
      krasue: { icon: '🔴', label: 'กระสือลอยมา' },
      jumpscare: { icon: '😱', label: 'ผีโผล่เต็มจอ' },
      haunt: { icon: '👑', label: 'ผีมาแล้ว!!! เต็มจอ' },
    },
    defaults: {
      title: 'บ้านผีสิงกลางไลฟ์',
      subtitle: 'พิมพ์ "ส่อง" ฉายไฟ • ส่งของขวัญถ้ากล้าเรียกผี',
      requestCommand: 'เล่า',
      gifts: giftList(['wisp', 'eyes', 'torches', 'bats', 'torchspot', 'tani', 'krasue', 'jumpscare', 'haunt']),
    },
  },

  newyear: {
    id: 'newyear',
    name: 'เคาท์ดาวน์ปีใหม่',
    icon: '🎄',
    desc: 'ลานเมืองคืนส่งท้ายปี ต้นคริสต์มาสยักษ์ หิมะตก นาฬิกานับถอยหลังสู่ปีใหม่ของจริง ซานต้า พลุ',
    fields: [],
    requestAction: 'read',
    bigEffect: 'newyear',
    hint: 'พิมพ์ "สวัสดีปีใหม่" จุดไฟเย็น 🎇',
    texts: {
      gifts: '🎁 ส่งของขวัญฉลองปีใหม่',
      top: '⭐ Top 5 ซานต้าใจดี',
      queue: '🎉 คำอวยพรปีใหม่',
      queueEmpty: 'ยังไม่มีคำอวยพร',
      queueBy: 'จาก',
      hype: '🎆 พลังเคาท์ดาวน์',
      hypeFull: 'พร้อมฉลองปีใหม่!',
      bigWord: 'HAPPY NEW YEAR!',
      bigSubUser: 'สวัสดีปีใหม่ ขอให้ปังทั้งปี!',
      bigSubAll: 'สวัสดีปีใหม่ทุกคน!',
      joinVerb: 'มาเคาท์ดาวน์',
      emptyTop: 'ยังไม่มีใครส่งของขวัญ<br>เป็นซานต้าคนแรกเลย!',
    },
    effects: {
      snow: { icon: '❄️', label: 'หิมะโปรยปราย' },
      giftbox: { icon: '🎁', label: 'กล่องของขวัญเด้ง' },
      treelights: { icon: '🎄', label: 'ไฟต้นคริสต์มาสเปลี่ยนสี' },
      confetti: { icon: '🎊', label: 'ยิงกระดาษสี' },
      spotlight: { icon: '🔦', label: 'สปอตไลต์ส่องคุณ' },
      fireworks: { icon: '🎆', label: 'จุดพลุ' },
      sleigh: { icon: '🛷', label: 'ซานต้าบินผ่าน' },
      countdown: { icon: '⏱️', label: 'นับถอยหลัง 10 วิ' },
      newyear: { icon: '👑', label: 'HAPPY NEW YEAR เต็มจอ' },
    },
    defaults: {
      title: 'เคาท์ดาวน์ปีใหม่',
      subtitle: 'ส่งท้ายปีเก่า ต้อนรับปีใหม่ไปด้วยกัน',
      requestCommand: 'อวยพร',
      gifts: giftList(['snow', 'giftbox', 'treelights', 'confetti', 'spotlight', 'fireworks', 'sleigh', 'countdown', 'newyear']),
    },
  },
};

// ธีมเลย์เอาต์ "งานวัด LIVE" 8 ธีม (แผงเป้าหมาย / โพเดียม / คำสั่งพิมพ์ / โซนกิจกรรม)
// added = เวอร์ชันที่ธีมชุดนั้นออก → เมนูธีมเอาชุดใหม่สุดขึ้นก่อน + ป้าย “ใหม่” (ธีมชุดแรกไม่มี added)
// มีธีมชุดใหม่: เพิ่มบรรทัด withAdded(..., 'เวอร์ชันที่จะออก') ต่อท้าย
const withAdded = (set, v) => { for (const t of Object.values(set)) t.added = v; return set; };
Object.assign(THEMES, withAdded(require('./hudthemes').HUD_THEMES, '1.1.0'));
Object.assign(THEMES, withAdded(require('./petthemes').PET_THEMES, '1.3.0')); // ธีมสัตว์เลี้ยง 10 ธีม
Object.assign(THEMES, withAdded(require('./dancethemes').DANCE_THEMES, '1.4.0')); // ธีมเวที 4 ธีม (คนดูขึ้นเต้น)
Object.assign(THEMES, withAdded(require('./zoothemes').ZOO_THEMES, '1.4.0')); // ธีมสวนสัตว์ 5 ธีม (เด็กนักเรียนทัศนศึกษา)
Object.assign(THEMES, withAdded(require('./mookatatheme').MOOKATA_THEMES, '1.5.0')); // หมูกระทะริมทาง (ฉาก 3D)
// ธีมเกม 7 ธีม: ซ่อนไว้จนกว่าหลังบ้าน TubHool จะเปิดสวิตช์ "ธีมเกม" (feature: 'games' — license.js)
const asGames = (set) => { for (const t of Object.values(set)) t.feature = 'games'; return set; };
Object.assign(THEMES, withAdded(asGames(require('./advtheme').ADV_THEMES), '1.5.0')); // ปาร์ตี้ผจญภัย (เกมพิกเซลอาร์ต)
Object.assign(THEMES, withAdded(asGames(require('./mgthemes').MG_THEMES), '1.5.0')); // มินิเกม 6 ธีม
Object.assign(THEMES, withAdded(require('./scenethemes').SCENE_THEMES, '1.5.0')); // ธีมภาพสำเร็จรูป 2.5D (ไหว้พระในโบสถ์ …)
Object.assign(THEMES, withAdded(require('./gravethemes').GRAVE_THEMES, '1.5.0')); // ธีมผีสุสาน 2 ธีม (ป่าช้าคืนเดือนดับ, คืนประตูผีเปิด)
Object.assign(THEMES, withAdded(require('./scenethemes').NEXT_SCENE_THEMES, '1.6.0')); // รถแห่แดนซ์มันส์ (ฉากภาพ 2.5D)
Object.assign(THEMES, withAdded(asGames(require('./climbthemes').CLIMB_THEMES), '1.6.0')); // เกมปีนขึ้นฟ้า 2 ฉาก (ซ่อนกับกลุ่มธีมเกม)
Object.assign(THEMES, withAdded(require('./scenethemes').SHRINE_THEMES, '1.7.0')); // ธีมศาลสิ่งศักดิ์สิทธิ์ (ตัวละครภาพวาด + เซียมซี)
Object.assign(THEMES, withAdded(asGames(require('./escapetheme').ESCAPE_THEMES), '1.8.0')); // เกมหนีออกจากตึก 19 ชั้น (ซ่อนกับกลุ่มธีมเกม)
Object.assign(THEMES, withAdded(asGames(require('./brawltheme').BRAWL_THEMES), '1.8.0')); // ศึกหัวร้อน (คนดูตีกัน)
Object.assign(THEMES, withAdded(asGames(require('./pettheme').PET_THEMES), '1.8.0')); // เลี้ยงน้องกวางวิเศษ (3D)
Object.assign(THEMES, withAdded(require('./molamtheme').MOLAM_STAGE_THEMES, '1.8.0')); // เวทีหมอลำ 3D (ภาพคนจริง + คำสั่งกุหลาบ/ตี/เปลี่ยนตัว)

module.exports = { THEMES };
