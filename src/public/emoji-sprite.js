/* วาดอีโมจิเป็นภาพที่เตรียมไว้ (แทน fillText ทุกเฟรม)
 * อีโมจิสี (🪷 🎆 🍜 …) วาดด้วย fillText แพงมาก — ตอนของขวัญเข้ารัว ๆ มีอีโมจิลอยหลายร้อยตัว ทำให้หน้าเวทีกระตุก
 * วิธีนี้วาดอีโมจิแต่ละตัวครั้งเดียวลงแคนวาสเล็ก แล้วใช้ drawImage (เร็วกว่าหลายสิบเท่า)
 * ใช้: drawEmoji(ctx, '🪷', x, y, size)  — x, y = จุดกึ่งกลาง, size = ขนาดฟอนต์ (px) เท่ากับที่เคยใช้กับ fillText
 */
(function () {
  const BASE = 96; // ขนาดที่เตรียมไว้ (อีโมจิบนเวทีใหญ่สุด ~70px — ภาพยังคม)
  const cache = new Map();
  function sprite(e) {
    let c = cache.get(e);
    if (c) return c;
    c = document.createElement('canvas');
    c.width = c.height = Math.round(BASE * 1.3);
    const x = c.getContext('2d');
    x.font = `${BASE}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText(e, c.width / 2, c.height / 2);
    if (cache.size > 300) cache.delete(cache.keys().next().value);
    cache.set(e, c);
    return c;
  }
  window.drawEmoji = function drawEmoji(ctx, e, x, y, size) {
    const s = sprite(String(e));
    const d = (s.width / BASE) * size;
    ctx.drawImage(s, x - d / 2, y - d / 2, d, d);
  };
})();
