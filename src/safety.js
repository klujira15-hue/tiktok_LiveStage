// ระบบกันความเสี่ยง: กรองข้อความ/ชื่อคนดูก่อนขึ้นจอหรืออ่านออกเสียง
// ลิงก์ เบอร์โทร ช่องทางติดต่อ คำพนัน/หวย คำหยาบ คำทางเพศ ยา-บุหรี่ การเงิน/หลอกลวง

const DEFAULT_WORDS = {
  gambling: 'บาคาร่า, สล็อต, slot, แทงบอล, เว็บตรง, เว็บพนัน, พนันออนไลน์, คาสิโน, casino, ufabet, ยูฟ่า, betflik, pgslot, ไฮโล, หวยออนไลน์, เลขเด็ด, ใบ้หวย, หวยงวด, เลขล็อก, แทงหวย, ฝากถอน, เครดิตฟรี, ทุนน้อย, ปั่นสล็อต',
  money: 'โอนเงิน, เลขบัญชี, พร้อมเพย์, promptpay, ปล่อยกู้, เงินกู้, กู้เงิน, เงินด่วน, ลงทุนได้, รายได้เสริม, ทำงานออนไลน์, รับสมัครงาน, สนใจทักแชท, ทักไลน์, แอดไลน์, ib มา, ทักinbox, ทักอินบ็อกซ์',
  profanity: 'เหี้ย, ควย, ไอ้สัส, อีสัส, ไอสัส, สันดาน, อีดอก, ส้นตีน, กะหรี่, ระยำ, จัญไร, ชาติหมา, พ่อมึงตาย, แม่มึงตาย, fuck, shit, bitch, asshole',
  sexual: 'เย็ด, porn, คลิปหลุด, ขายตัว, ไซด์ไลน์, sideline, nude, onlyfans, เงี่ยน, เสียว18, คลิปโป๊, xxx',
  drugs: 'ยาบ้า, ยาไอซ์, โคเคน, เฮโรอีน, ยาเค, บุหรี่ไฟฟ้า, พอตไฟฟ้า, vape, น้ำกระท่อม',
};
const CATEGORY_LABEL = { gambling: 'พนัน/หวย', money: 'การเงิน/ชวนติดต่อ', profanity: 'คำหยาบ', sexual: 'ทางเพศ', drugs: 'ยา/บุหรี่' };

const DEFAULTS = {
  filter: true,
  mode: 'hide', // hide = ไม่ขึ้นจอเลย, mask = เปลี่ยนส่วนที่ผิดเป็น ***
  safeMode: false,
  links: true,
  phones: true,
  contacts: true,
  cats: { gambling: true, money: true, profanity: true, sexual: true, drugs: true },
  words: {}, // { category: 'คำ, คำ' } ว่าง = ใช้ค่าเริ่มต้น
  allow: 'สัดส่วน, ห่าง',
  blocked: [], // [{ id, name }]
};

// ตัดช่องว่าง/จุด/ขีดที่คนใส่แทรกเพื่อหลบ เช่น "บ า ค า ร่ า", "s.l.o.t"
const compact = (s) => String(s || '').toLowerCase().normalize('NFC').replace(/[\s._\-*|/\\~^'"`]+/g, '');
const splitWords = (s) => String(s || '').split(/[,\n]/).map((w) => compact(w)).filter((w) => w.length >= 2);

const RE_LINK = /(https?:\/\/|www\.)\S+|[a-z0-9-]{2,}\s*(\.|ดอท|dot)\s*(com|net|org|co|th|io|me|ly|bet|vip|xyz|app|link|shop|site|club|online|top|info|cc|gg)\b/gi;
const RE_PHONE = /(?:\+?\s*66|0)(?:[\s.-]*\d){8,9}/g;
const RE_LONGNUM = /(?:\d[\s.-]*){9,}\d/g; // เลขบัญชี/เบอร์ที่เว้นวรรคแปลก ๆ
const RE_CONTACT = /(?<![a-z0-9])(line|ไลน์|ไลค์ไอดี|ig|ไอจี|instagram|facebook|เฟส|fb|telegram|เทเลแกรม|wechat|whatsapp|tg)\s*(id|ไอดี)?\s*[:：=]?\s*@?[a-z0-9._-]{3,}/gi;

function createSafety(getCfg) {
  const cfg = () => ({ ...DEFAULTS, ...(getCfg() || {}), cats: { ...DEFAULTS.cats, ...(getCfg()?.cats || {}) } });

  function wordList() {
    const c = cfg();
    const out = [];
    for (const cat of Object.keys(DEFAULT_WORDS)) {
      if (!c.cats[cat]) continue;
      const src = c.words?.[cat] != null && String(c.words[cat]).trim() !== '' ? c.words[cat] : DEFAULT_WORDS[cat];
      for (const w of splitWords(src)) out.push({ w, cat });
    }
    for (const w of splitWords(c.words?.custom || '')) out.push({ w, cat: 'custom' });
    return out;
  }

  // ตรวจข้อความ → { hit, reasons[], masked }
  function check(text) {
    const c = cfg();
    const raw = String(text || '');
    if (!c.filter && !c.safeMode) return { hit: false, reasons: [], masked: raw };
    const reasons = new Set();
    let masked = raw;
    const sub = (re, why) => {
      masked = masked.replace(re, (m) => {
        reasons.add(why);
        return '***';
      });
    };
    if (c.links) sub(RE_LINK, 'ลิงก์');
    if (c.contacts) sub(RE_CONTACT, 'ช่องทางติดต่อ');
    if (c.phones) {
      sub(RE_PHONE, 'เบอร์โทร/เลขบัญชี');
      sub(RE_LONGNUM, 'เบอร์โทร/เลขบัญชี');
    }
    // คำต้องห้าม: เทียบแบบตัดช่องว่าง (กันการเว้นวรรคหลบ) และยกเว้นคำในรายการอนุญาต
    let cmp = compact(masked);
    for (const a of splitWords(c.allow)) cmp = cmp.split(a).join(' ');
    let evaded = false;
    for (const { w, cat } of wordList()) {
      if (cmp.includes(w)) {
        reasons.add(CATEGORY_LABEL[cat] || 'คำที่ตั้งไว้');
        // ปิดคำในข้อความจริง (กรณีพิมพ์ติดกันปกติ)
        const re = new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const before = masked;
        masked = masked.replace(re, '***');
        if (masked === before) evaded = true; // พิมพ์เว้นวรรคหลบ → ปิดทั้งข้อความ
      }
    }
    if (evaded) masked = '***';
    return { hit: reasons.size > 0, reasons: [...reasons], masked: reasons.size ? masked : raw };
  }

  // ชื่อคนดู: ถ้ามีของต้องห้ามในชื่อ → แทนด้วยชื่อกลาง ๆ
  function safeName(name) {
    const r = check(name);
    if (!r.hit) return { name, hit: false, reasons: [] };
    return { name: 'ผู้ชม', hit: true, reasons: r.reasons };
  }

  const isBlocked = (id) => (cfg().blocked || []).some((b) => b.id === id);

  return { check, safeName, isBlocked, cfg };
}

module.exports = { createSafety, DEFAULTS, DEFAULT_WORDS, CATEGORY_LABEL };
