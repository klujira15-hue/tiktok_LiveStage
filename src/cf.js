/* Live Stage — โหมดขายของ (CF)
 *  - คนไลฟ์ใส่สินค้า: รหัส (A1, B2 …) ชื่อ ราคา จำนวน
 *  - คนดูพิมพ์ "CF A1" / "cf a1 2" / "ซีเอฟ A1" ในคอมเมนต์ → จดออเดอร์ + ตัดสต็อก
 *  - ของหมด → เข้าคิวสำรอง • ปิดรับ (หมดเวลา) → ไม่รับเพิ่ม
 *  - หน้าเวทีโชว์การ์ดสินค้า นับถอยหลัง แจ้งออเดอร์ล่าสุด และยอดรวม
 *  - ส่งออกรายการเป็น CSV (เปิดใน Excel ได้) • ไม่เก็บเงินในโปรแกรม — แค่จดยอด
 * เก็บใน data/cf.json (สินค้า + ออเดอร์รอบปัจจุบัน)
 */
'use strict';
const fs = require('fs');
const path = require('path');

const MAX_PRODUCTS = 60;
const MAX_ORDERS = 3000;
const str = (v, n) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
const normCode = (s) => String(s || '').toUpperCase().replace(/\s+/g, '');
const IMG_RE = /^cf-[a-z0-9]{6,24}\.jpg$/;

function sanitizeProducts(list) {
  const out = [];
  const seen = new Set();
  for (const p of Array.isArray(list) ? list : []) {
    const code = normCode(p?.code).replace(/[^A-Z0-9ก-๙-]/g, '').slice(0, 8);
    if (!code || seen.has(code)) continue;
    seen.add(code);
    const stock = p?.stock === '' || p?.stock == null ? null : Math.max(0, Math.min(100000, Math.round(Number(p.stock) || 0)));
    const price = p?.price === '' || p?.price == null ? '' : Math.max(0, Math.min(10_000_000, Number(p.price) || 0));
    out.push({ code, name: str(p?.name, 60) || code, price, stock, img: IMG_RE.test(p?.img || '') ? p.img : '' });
    if (out.length >= MAX_PRODUCTS) break;
  }
  return out;
}

// "CF A1" "cf a1 2" "ซีเอฟ A1 x2" "CF1" → { code, qty } · ไม่ใช่ → null
// ต่อท้ายได้ เช่น "CF A1 สีแดง ไซซ์ L" → note
const CF_RE = /^\s*(?:c\.?\s*f|ซี\s*เอฟ|ซีเอฟ|เอฟ)\s*[:\-]?\s*([a-z]{0,2}\s*\d{1,3}|[a-z]{1,2})?(?:\s*[x×*]\s*(\d{1,2})|\s+(\d{1,2})(?=\s|$))?(?:\s*(?:ชิ้น|ตัว|อัน|ea|pcs))?(?:\s+(.{1,40}))?\s*$/i;
function parseCF(text) {
  const m = CF_RE.exec(String(text || '').slice(0, 80));
  if (!m) return null;
  return { code: m[1] ? normCode(m[1]) : '', qty: Math.max(1, Math.min(20, Number(m[2] || m[3]) || 1)), note: str(m[4], 40) };
}

module.exports = function createCF(ctx) {
  // ctx: { io, log, dataDir, onOrder(order), allowed() → false = บัญชีนี้ใช้ CF ไม่ได้ (เฉพาะผู้สนับสนุน) }
  const { io, log } = ctx;
  const allowed = () => (ctx.allowed ? !!ctx.allowed() : true);
  const LOCKED = { ok: false, locked: true, error: 'ขายของ CF ใช้ได้กับบัญชีผู้สนับสนุน TubHool' };
  const FILE = path.join(ctx.dataDir, 'cf.json');
  const IMG_DIR = path.join(ctx.dataDir, 'cf-images');
  const imgUrl = (f) => (f ? '/cf-img/' + f : '');
  // บันทึกรูป (data URL ที่หน้าแอปย่อเป็น JPEG แล้ว) → ชื่อไฟล์ใหม่
  function saveImage(dataUrl) {
    const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
    if (!m) return null;
    const buf = Buffer.from(m[1], 'base64');
    if (buf.length < 200 || buf.length > 2_500_000 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
    fs.mkdirSync(IMG_DIR, { recursive: true });
    const name = 'cf-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + '.jpg';
    fs.writeFileSync(path.join(IMG_DIR, name), buf);
    return name;
  }
  // ลบไฟล์รูปที่ไม่มีสินค้าไหนใช้แล้ว
  function cleanImages() {
    try {
      const used = new Set(st.products.map((p) => p.img).filter(Boolean));
      for (const f of fs.readdirSync(IMG_DIR)) if (IMG_RE.test(f) && !used.has(f)) fs.rmSync(path.join(IMG_DIR, f), { force: true });
    } catch {}
  }
  // รหัสถัดไป: ตัวอักษรเดียวกับสินค้าตัวสุดท้าย เลขต่อจากเลขมากสุด (A1, A2 … ไม่มีสินค้า = A1)
  function nextCode() {
    const last = st.products[st.products.length - 1];
    const prefix = last ? last.code.replace(/\d+$/, '') || 'A' : 'A';
    let n = 0;
    for (const p of st.products) if (p.code.startsWith(prefix)) n = Math.max(n, Number(p.code.slice(prefix.length)) || 0);
    return prefix + (n + 1);
  }
  let st = { enabled: false, announce: true, products: [], orders: [], showing: null, closeAt: 0, seq: 0, round: Date.now() };
  try {
    const saved = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    st = { ...st, ...saved, products: sanitizeProducts(saved.products), orders: Array.isArray(saved.orders) ? saved.orders.slice(-MAX_ORDERS) : [] };
  } catch {}
  let dirty = false;
  const save = () => (dirty = true);
  setInterval(() => {
    if (!dirty) return;
    dirty = false;
    try {
      fs.mkdirSync(ctx.dataDir, { recursive: true });
      fs.writeFileSync(FILE, JSON.stringify(st));
    } catch (e) {
      log('error', 'บันทึกออเดอร์ CF ไม่สำเร็จ: ' + e.message);
    }
  }, 2000);

  const product = (code) => st.products.find((p) => p.code === code);
  const soldOf = (code) => st.orders.reduce((n, o) => n + (o.code === code && o.status === 'ok' ? o.qty : 0), 0);
  const leftOf = (p) => (p.stock == null ? null : Math.max(0, p.stock - soldOf(p.code)));
  const isOpen = () => !!st.showing && (!st.closeAt || Date.now() < st.closeAt);

  function publicState() {
    const live = st.orders.filter((o) => o.status !== 'cancel');
    const ok = live.filter((o) => o.status === 'ok');
    const per = {};
    for (const o of ok) per[o.code] = (per[o.code] || 0) + o.qty;
    const ok2 = allowed();
    const p = ok2 && st.showing && product(st.showing);
    return {
      locked: !ok2,
      enabled: st.enabled && ok2,
      announce: st.announce,
      showing: p ? { ...p, img: imgUrl(p.img), left: leftOf(p), open: isOpen() } : null,
      closeAt: st.closeAt,
      showAt: st.showAt || 0,
      now: Date.now(),
      total: ok.length,
      buyers: new Set(ok.map((o) => o.uid)).size,
      top: Object.entries(per).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([code, n]) => ({ code, name: product(code)?.name || code, n, soldOut: leftOf(product(code) || { stock: null }) === 0 })),
      products: st.products.map((x) => ({ code: x.code, name: x.name, price: x.price, stock: x.stock, img: x.img, imgUrl: imgUrl(x.img), left: leftOf(x), sold: soldOf(x.code) })),
    };
  }
  function adminState() {
    return { ...publicState(), orders: st.orders.slice(-300).reverse() };
  }
  let pushTimer = null;
  function push(now) {
    const send = () => {
      pushTimer = null;
      io.emit('cf', publicState());
      io.to('admin').emit('cfAdmin', adminState());
    };
    if (now) {
      clearTimeout(pushTimer);
      send();
    } else if (!pushTimer) pushTimer = setTimeout(send, 250);
  }
  // หมดเวลาปิดรับ → แจ้งหน้าเวที
  setInterval(() => {
    if (st.showing && st.closeAt && Date.now() >= st.closeAt && !st._closedSent) {
      st._closedSent = true;
      log('cf', `⏱ ปิดรับ ${st.showing} แล้ว`);
      push(true);
    }
  }, 1000);

  const recent = new Map(); // uid|code → เวลา (กันพิมพ์ซ้ำรัว ๆ)
  function onChat(u, text) {
    if (!st.enabled || !allowed()) return false;
    const cf = parseCF(text);
    if (!cf) return false;
    let code = cf.code;
    if (!code && st.showing) code = st.showing;
    // พิมพ์แค่ตัวเลข เช่น CF 1 → ใช้ตัวอักษรของสินค้าที่โชว์อยู่ (A1)
    if (/^\d+$/.test(code) && st.showing) {
      const prefix = st.showing.replace(/\d+$/, '');
      if (product(prefix + code)) code = prefix + code;
    }
    const p = product(code);
    if (!p) return true; // เป็นคำสั่ง CF แต่ไม่มีรหัสนี้ — ไม่ต้องไปเข้าเกม/AI
    const key = u.id + '|' + code;
    if (Date.now() - (recent.get(key) || 0) < 8000) return true;
    recent.set(key, Date.now());
    if (recent.size > 2000) recent.clear();
    if (st.showing === code && !isOpen()) {
      io.emit('cfOrder', { name: u.name, code, qty: cf.qty, status: 'closed' });
      return true;
    }
    const left = leftOf(p);
    const status = left == null || left >= cf.qty ? 'ok' : 'wait';
    const o = { id: ++st.seq, at: Date.now(), uid: u.id, name: u.name, code, qty: cf.qty, note: cf.note || '', status };
    st.orders.push(o);
    if (st.orders.length > MAX_ORDERS) st.orders.shift();
    save();
    const leftNow = leftOf(p);
    io.emit('cfOrder', { name: u.name, code, item: p.name, qty: cf.qty, status, left: leftNow, no: st.orders.filter((x) => x.status === 'ok').length, announce: st.announce });
    log('cf', `🛒 ${u.name} CF ${code}${cf.qty > 1 ? ' x' + cf.qty : ''}${status === 'wait' ? ' (คิวสำรอง)' : ''}`);
    ctx.onOrder?.(o);
    push();
    return true;
  }

  function csv() {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [['ลำดับ', 'เวลา', 'ชื่อคนดู', 'ไอดี', 'รหัสสินค้า', 'ชื่อสินค้า', 'จำนวน', 'ราคา/ชิ้น', 'รวม', 'หมายเหตุ', 'สถานะ']];
    const th = { ok: 'รับแล้ว', wait: 'คิวสำรอง', cancel: 'ยกเลิก' };
    for (const o of st.orders) {
      const p = product(o.code);
      const price = p && p.price !== '' ? p.price : '';
      rows.push([o.id, new Date(o.at).toLocaleString('th-TH', { hour12: false }), o.name, o.uid, o.code, p?.name || '', o.qty, price, price === '' ? '' : price * o.qty, o.note || '', th[o.status] || o.status]);
    }
    return '﻿' + rows.map((r) => r.map(esc).join(',')).join('\r\n');
  }

  function register(socket) {
    socket.emit('cf', publicState());
    socket.on('cf:get', (_, ack) => ack?.(adminState()));
    socket.on('cf:save', (v = {}, ack) => {
      if (!allowed()) return ack?.({ ...LOCKED, state: adminState() });
      if ('enabled' in v) st.enabled = !!v.enabled;
      if ('announce' in v) st.announce = !!v.announce;
      if (Array.isArray(v.products)) {
        st.products = sanitizeProducts(v.products);
        if (st.showing && !product(st.showing)) st.showing = null;
        cleanImages();
      }
      save();
      push(true);
      ack?.({ ok: true, state: adminState() });
    });
    socket.on('cf:show', (v = {}, ack) => {
      if (!allowed()) return ack?.(LOCKED);
      const code = normCode(v.code);
      if (!product(code)) return ack?.({ ok: false, error: 'ไม่มีสินค้ารหัสนี้' });
      st.showing = code;
      st.showAt = Date.now(); // หน้าเวทีขึ้นรูปใหญ่กลางจอสักครู่ก่อนย่อเป็นการ์ด
      const sec = Math.max(0, Math.min(3600, Math.round(Number(v.seconds) || 0)));
      st.closeAt = sec ? Date.now() + sec * 1000 : 0;
      st._closedSent = false;
      save();
      push(true);
      log('cf', `🛍 โชว์สินค้า ${code}${sec ? ` (ปิดรับใน ${sec} วิ)` : ''}`);
      ack?.({ ok: true });
    });
    socket.on('cf:hide', (_, ack) => {
      st.showing = null;
      st.closeAt = 0;
      save();
      push(true);
      ack?.({ ok: true });
    });
    socket.on('cf:status', ({ id, status } = {}, ack) => {
      const o = st.orders.find((x) => x.id === id);
      if (!o || !['ok', 'wait', 'cancel'].includes(status)) return ack?.({ ok: false });
      o.status = status;
      save();
      push(true);
      ack?.({ ok: true });
    });
    socket.on('cf:clear', (_, ack) => {
      st.orders = [];
      st.seq = 0;
      st.round = Date.now();
      save();
      push(true);
      log('cf', '🧾 เริ่มรอบขายใหม่ (ล้างออเดอร์)');
      ack?.({ ok: true });
    });
    // รูปสินค้า: ใส่/เปลี่ยนรูปของสินค้าที่มีอยู่
    socket.on('cf:image', ({ code, data } = {}, ack) => {
      if (!allowed()) return ack?.(LOCKED);
      const p = product(normCode(code));
      if (!p) return ack?.({ ok: false, error: 'ไม่มีสินค้ารหัสนี้ — กดบันทึกสินค้าก่อน' });
      const name = saveImage(data);
      if (!name) return ack?.({ ok: false, error: 'ไฟล์รูปไม่ถูกต้องหรือใหญ่เกินไป' });
      p.img = name;
      cleanImages();
      save();
      push(true);
      ack?.({ ok: true, state: adminState() });
    });
    socket.on('cf:imageRemove', ({ code } = {}, ack) => {
      const p = product(normCode(code));
      if (p) p.img = '';
      cleanImages();
      save();
      push(true);
      ack?.({ ok: true, state: adminState() });
    });
    // ลากหลายรูปมาวาง → สร้างสินค้าใหม่ 1 รูปต่อ 1 รายการ
    socket.on('cf:addWithImage', ({ data } = {}, ack) => {
      if (!allowed()) return ack?.(LOCKED);
      if (st.products.length >= MAX_PRODUCTS) return ack?.({ ok: false, error: `ใส่สินค้าได้สูงสุด ${MAX_PRODUCTS} รายการ` });
      const name = saveImage(data);
      if (!name) return ack?.({ ok: false, error: 'ไฟล์รูปไม่ถูกต้องหรือใหญ่เกินไป' });
      const code = nextCode();
      st.products.push({ code, name: code, price: '', stock: null, img: name });
      save();
      push(true);
      ack?.({ ok: true, code, state: adminState() });
    });
    socket.on('cf:export', (_, ack) => ack?.({ ok: true, csv: csv(), name: `CF-${new Date().toISOString().slice(0, 10)}.csv` }));
  }

  return { onChat, register, publicState, csv, IMG_DIR, IMG_RE, refresh: () => push(true), flush: () => fs.writeFileSync(FILE, JSON.stringify(st)) };
};
module.exports.parseCF = parseCF;
module.exports.sanitizeProducts = sanitizeProducts;
