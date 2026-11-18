// ธีมผีสุสาน 2 ธีม (โหมดหลอน ไม่มีเพลง) — ฉาก/ผี/เอฟเฟกต์อยู่ที่ public/themes/cemetery.js และ ghostgate.js
// ของขวัญทุกชิ้นมีผีออกมา • เรียงจากของขวัญเล็กไปใหญ่ (ชิ้นสุดท้าย = เต็มจอ)

const giftList = (effects) => {
  const names = [
    ['Rose', 1], ['Finger Heart', 5], ['Rosa', 10], ['Perfume', 20], ['Doughnut', 30],
    ['Confetti', 100], ['Peeka-Bro', 199], ['Corgi', 299], ['Travel with You', 999],
  ];
  return names.map(([name, diamonds], i) => ({ name, diamonds, effect: effects[i] }));
};

const GRAVE_THEMES = {
  cemetery: {
    id: 'cemetery',
    name: 'ป่าช้าคืนเดือนดับ',
    icon: '🪦',
    desc: 'ป่าช้าวัดไทยกลางดึก ธาตุเก่า ต้นตะเคียนผูกผ้าแพร หมอกเลื้อย ไฟผีลอย — พิมพ์ "จุดเทียน" เทียนชื่อคุณติดหน้าธาตุ ส่งของขวัญแล้วผีออกมา',
    fields: [],
    requestAction: 'read',
    bigEffect: 'awaken',
    noMusic: true,
    hint: 'พิมพ์ "จุดเทียน" จุดเทียนหน้าธาตุ 🕯️',
    texts: {
      gifts: '👻 ส่งของขวัญถ้ากล้าปลุกผี',
      top: '💀 Top 5 คนใจกล้า',
      queue: '🕯️ เรื่องหลอนจากคนดู',
      queueEmpty: 'ยังไม่มีใครเล่าเรื่องหลอน',
      queueBy: 'จาก',
      hype: '😱 ระดับความหลอน',
      hypeFull: 'ป่าช้าเริ่มตื่นแล้ว...',
      bigWord: 'ป่าช้าตื่นแล้ว!!!',
      bigSubUser: 'ปลุกวิญญาณทั้งป่าช้า',
      bigSubAll: 'วิญญาณทุกดวงออกมาแล้ว...',
      joinVerb: 'กล้าเดินเข้าป่าช้า',
      emptyTop: 'ยังไม่มีใครกล้าส่งของขวัญ<br>ลองดูไหม...',
    },
    effects: {
      candle: { icon: '🕯️', label: 'จุดเทียนหน้าธาตุ ผีน้อยลอยออก' },
      fireball: { icon: '🟢', label: 'ไฟผีพุ่งไต้ มีหน้าผีในลูกไฟ' },
      lanterns: { icon: '🏮', label: 'ตะเกียงเปลี่ยนสีทั้งกลุ่ม' },
      wind: { icon: '🎐', label: 'ลมหวน นางผีชุดขาวลอยมา' },
      souls: { icon: '👻', label: 'วิญญาณออกจากธาตุ' },
      spot: { icon: '💡', label: 'แสงวิญญาณส่องคุณ' },
      lightning: { icon: '⚡', label: 'ฟ้าผ่า เห็นผียืนทุกธาตุ' },
      bloodmoon: { icon: '🌕', label: 'จันทร์สีเลือด เปรตโผล่หลังโบสถ์' },
      awaken: { icon: '👑', label: 'ป่าช้าตื่น! หน้าผียักษ์กลางฟ้า' },
    },
    defaults: {
      title: 'ป่าช้าคืนเดือนดับ',
      subtitle: 'พิมพ์ "จุดเทียน" • ส่งของขวัญถ้ากล้าปลุกวิญญาณ',
      requestCommand: 'เล่า',
      gifts: giftList(['candle', 'fireball', 'lanterns', 'wind', 'souls', 'spot', 'lightning', 'bloodmoon', 'awaken']),
    },
  },
  ghostgate: {
    id: 'ghostgate',
    name: 'คืนประตูผีเปิด',
    icon: '🏮',
    desc: 'ฮวงซุ้ยร้างบนเขาคืนสารทจีน โคมแดงสลัว ประตูผีปิดสนิท — พิมพ์ "จุดธูป" ธูปชื่อคุณปักหน้าฮวงซุ้ย ส่งของขวัญแล้วผีออกมา',
    fields: [],
    requestAction: 'read',
    bigEffect: 'gate',
    noMusic: true,
    hint: 'พิมพ์ "จุดธูป" ปักธูปหน้าฮวงซุ้ย 🧧',
    texts: {
      gifts: '🏮 ส่งของขวัญถ้ากล้าเปิดประตูผี',
      top: '💀 Top 5 คนใจกล้า',
      queue: '🕯️ เรื่องหลอนจากคนดู',
      queueEmpty: 'ยังไม่มีใครเล่าเรื่องหลอน',
      queueBy: 'จาก',
      hype: '😱 ระดับความหลอน',
      hypeFull: 'ประตูผีกำลังจะเปิด...',
      bigWord: 'ประตูผีเปิดแล้ว...',
      bigSubUser: 'เปิดประตูผี',
      bigSubAll: 'ขบวนผีกำลังเดินออกมา...',
      joinVerb: 'กล้าขึ้นเขาคืนนี้',
      emptyTop: 'ยังไม่มีใครกล้าส่งของขวัญ<br>ลองดูไหม...',
    },
    effects: {
      incense: { icon: '🧧', label: 'จุดธูป ควันกลายเป็นผี' },
      paper: { icon: '💴', label: 'เผากระดาษเงินทอง ผีหิวโหยมารับ' },
      crows: { icon: '🐦‍⬛', label: 'กาแตกรัง เรียงเป็นหน้าผี' },
      eyes: { icon: '👀', label: 'ดวงตาแดงทั่วเขา' },
      lanterns: { icon: '🏮', label: 'โคมดับ แล้วทุกดวงมีหน้า' },
      footprints: { icon: '👣', label: 'รอยเท้าเดินเข้ามา ผีเด็กยืนรอ' },
      hands: { icon: '🖐️', label: 'มือโผล่จากหลุม ผีคลานออกมา' },
      redlady: { icon: '👘', label: 'ผีชุดแดงกระตุกเข้ามาใกล้' },
      gate: { icon: '👑', label: 'ประตูผีเปิด! ขบวนผีเดินออกมา' },
    },
    defaults: {
      title: 'คืนประตูผีเปิด',
      subtitle: 'พิมพ์ "จุดธูป" • ส่งของขวัญถ้ากล้าเปิดประตูผี',
      requestCommand: 'เล่า',
      gifts: giftList(['incense', 'paper', 'crows', 'eyes', 'lanterns', 'footprints', 'hands', 'redlady', 'gate']),
    },
  },
};

module.exports = { GRAVE_THEMES };
