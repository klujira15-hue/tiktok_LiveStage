/* อ่านแชทไลฟ์ YouTube (ไม่ใช้ API key) — อ่านจากหน้าเว็บสาธารณะแบบเดียวกับที่เบราว์เซอร์ทำ
 * ไม่ใช่ API ทางการ: ถ้า YouTube เปลี่ยนระบบอาจต้องอัปเดตโปรแกรม (เหมือนตัวเชื่อม TikTok)
 *
 * รับได้: @ชื่อช่อง, ลิงก์ช่อง, ลิงก์ไลฟ์ (watch?v= / youtu.be / /live/), หรือรหัสวิดีโอ 11 ตัว
 * เหตุการณ์ที่ส่งออก: chat, superchat (เงิน → ของขวัญ), member (สมาชิกใหม่ → เหมือนกดติดตาม), viewers, end
 */
'use strict';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36';
const HEADERS = { 'User-Agent': UA, 'Accept-Language': 'th-TH,th;q=0.9,en;q=0.8', Cookie: 'CONSENT=YES+1' };

// เงินจาก Super Chat → "เพชร" (เทียบราคาเหรียญ TikTok ราว 0.45 บาท) เพื่อใช้เอฟเฟกต์/อันดับ/เป้าหมายชุดเดียวกัน
const TO_THB = { '฿': 1, THB: 1, $: 35, USD: 35, US$: 35, '€': 38, EUR: 38, '£': 45, GBP: 45, '¥': 0.23, JPY: 0.23, '₩': 0.026, KRW: 0.026, SGD: 26, MYR: 7.5, RM: 7.5, '₱': 0.6, PHP: 0.6, Rp: 0.0022, IDR: 0.0022, '₫': 0.0014, VND: 0.0014, HK$: 4.5, HKD: 4.5, NT$: 1.1, TWD: 1.1, A$: 23, AUD: 23, CA$: 25, CAD: 25, '₹': 0.42, INR: 0.42 };
function moneyToDiamonds(text) {
  const s = String(text || '').replace(/\s/g, '');
  const num = Number((s.match(/[\d.,]+/) || ['0'])[0].replace(/,(?=\d{3}\b)/g, '').replace(',', '.'));
  if (!num) return 0;
  const cur = s.replace(/[\d.,]+/, '');
  const rate = TO_THB[cur] ?? TO_THB[cur.toUpperCase()] ?? 35;
  return Math.max(1, Math.round((num * rate) / 0.45));
}

function parseTarget(input) {
  const s = String(input || '').trim();
  if (!s) return null;
  let m = s.match(/(?:v=|youtu\.be\/|\/live\/|\/shorts\/)([\w-]{11})/);
  if (m) return { videoId: m[1] };
  if (/^[\w-]{11}$/.test(s) && !s.startsWith('@')) return { videoId: s };
  m = s.match(/youtube\.com\/(@[^/?#\s]+|channel\/[\w-]+|c\/[^/?#\s]+|user\/[^/?#\s]+)/i);
  if (m) return { channelPath: m[1] };
  if (s.startsWith('@')) return { channelPath: s.split(/[/?#\s]/)[0] };
  return { channelPath: '@' + s.split(/[/?#\s]/)[0] };
}

const text = (r) => (r?.simpleText ? r.simpleText : (r?.runs || []).map((x) => x.text ?? (x.emoji ? (x.emoji.isCustomEmoji ? '' : x.emoji.emojiId) : '')).join(''));
const photo = (r) => {
  const t = r?.authorPhoto?.thumbnails || [];
  return t[t.length - 1]?.url || '';
};

module.exports = function createYouTube(ev) {
  // ev: { chat(u, text), superchat(u, { name, diamonds, image }), member(u), viewers(n), end(), log(type, text) }
  let run = 0; // เปลี่ยนเลขทุกครั้งที่เชื่อมต่อใหม่ — ลูปเก่าจะหยุดเอง
  let timer = null;
  let viewTimer = null;

  async function getPage(url) {
    const res = await fetch(url, { headers: HEADERS, redirect: 'follow', signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`YouTube ตอบกลับ ${res.status}`);
    return res.text();
  }

  async function connect(input) {
    disconnect();
    const my = ++run;
    const t = parseTarget(input);
    if (!t) throw new Error('ยังไม่ได้ใส่ช่อง YouTube');
    const url = t.videoId ? `https://www.youtube.com/watch?v=${t.videoId}` : `https://www.youtube.com/${t.channelPath}/live`;
    const html = await getPage(url);
    const videoId = t.videoId || (html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/) || [])[1];
    if (!videoId) throw Object.assign(new Error('ช่องนี้ยังไม่ได้เปิดไลฟ์'), { offline: true });
    if (/['"]isReplay['"]:\s*true/.test(html)) throw Object.assign(new Error('ไลฟ์นี้จบไปแล้ว'), { offline: true });
    const key = (html.match(/['"]INNERTUBE_API_KEY['"]:\s*['"]([^'"]+)['"]/) || [])[1];
    const version = (html.match(/['"]INNERTUBE_CONTEXT_CLIENT_VERSION['"]:\s*['"]([\d.]+)['"]/) || html.match(/['"]clientVersion['"]:\s*['"]([\d.]+)['"]/) || [])[1];
    // หน้าวิดีโอที่ยังไม่เริ่มไลฟ์/ไม่ใช่ไลฟ์ จะไม่มีกล่องแชทสด
    const live = /"isLiveNow":true|"isLive":true/.test(html);
    const lcr = html.indexOf('"liveChatRenderer":{"continuations"');
    const cont0 = lcr >= 0 ? (html.slice(lcr, lcr + 3000).match(/"continuation":"([^"]+)"/) || [])[1] : null;
    let cont = cont0;
    const visitor = (html.match(/"VISITOR_DATA":"([^"]+)"/) || [])[1] || '';
    if (!key || !version || !cont || !live) throw Object.assign(new Error('ไม่พบแชทสดของไลฟ์นี้ (ยังไม่เริ่มไลฟ์ หรือปิดแชทไว้)'), { offline: true });
    const title = ((html.match(/<meta name="title" content="([^"]*)"/) || [])[1] || '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
    const ctx = { client: { clientName: 'WEB', clientVersion: version, hl: 'th', gl: 'TH', ...(visitor ? { visitorData: visitor } : {}) } };

    const api = async (path, body) => {
      const res = await fetch(`https://www.youtube.com/youtubei/v1/${path}?key=${key}&prettyPrint=false`, {
        method: 'POST',
        headers: { ...HEADERS, 'Content-Type': 'application/json', 'X-Youtube-Client-Name': '1', 'X-Youtube-Client-Version': version, Origin: 'https://www.youtube.com', ...(visitor ? { 'X-Goog-Visitor-Id': visitor } : {}) },
        body: JSON.stringify({ context: ctx, ...body }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`YouTube ตอบกลับ ${res.status}`);
      return res.json();
    };

    let backlog = 1; // ชุดแรกคือแชทย้อนหลัง — ไม่เล่นเอฟเฟกต์ซ้ำ
    let fails = 0;
    const seen = new Set();
    async function poll() {
      if (my !== run) return;
      let wait = 2000;
      try {
        const data = await api('live_chat/get_live_chat', { continuation: cont });
        if (my !== run) return;
        const lc = data?.continuationContents?.liveChatContinuation;
        if (process.env.YT_DEBUG) console.log('[yt] poll', backlog, (lc?.actions || []).length, Object.keys(lc?.continuations?.[0] || {}));
        const next = lc?.continuations?.[0];
        const nc = next?.invalidationContinuationData || next?.timedContinuationData || next?.reloadContinuationData;
        if (!lc || !nc?.continuation) {
          run++;
          return ev.end();
        }
        cont = nc.continuation;
        // invalidation = เบราว์เซอร์รอสัญญาณ push — เราใช้การถามซ้ำทุก ~1.5 วินาทีแทน
        wait = next.timedContinuationData ? Math.min(8000, Math.max(1000, Number(nc.timeoutMs) || 2000)) : 1500;
        fails = 0;
        if (!backlog) for (const a of lc.actions || []) handle(a);
        else {
          for (const a of lc.actions || []) seen.add(a.addChatItemAction?.item && Object.values(a.addChatItemAction.item)[0]?.id);
          backlog--;
          // เปลี่ยนจาก "Top chat" (YouTube กรองให้) เป็น "แชทสด" (ทุกข้อความ) — เมนูโหมดแชทอยู่ในหัวกล่องแชท
          const items = lc.header?.liveChatHeaderRenderer?.viewSelector?.sortFilterSubMenuRenderer?.subMenuItems || [];
          const all = items[items.length - 1]?.continuation?.reloadContinuationData?.continuation;
          if (all && items.length > 1 && !items[items.length - 1].selected) {
            cont = all;
            backlog = 1; // คำตอบถัดไปคือแชทย้อนหลังของโหมดแชทสด
            wait = 300;
          }
        }
      } catch (e) {
        if (++fails >= 6) {
          run++;
          return ev.end(new Error('อ่านแชท YouTube ไม่ได้: ' + (e?.message || e)));
        }
        wait = 3000 * fails;
      }
      timer = setTimeout(poll, wait);
    }
    function handle(a) {
      const item = a.addChatItemAction?.item;
      if (!item) return;
      const [kind, r] = Object.entries(item)[0] || [];
      if (!r?.id || seen.has(r.id)) return;
      seen.add(r.id);
      if (seen.size > 3000) seen.clear();
      const u = { id: 'yt:' + (r.authorExternalChannelId || r.authorName?.simpleText || r.id), name: text(r.authorName).replace(/^@/, '') || 'ผู้ชม', avatar: photo(r) };
      if (kind === 'liveChatTextMessageRenderer') {
        const msg = text(r.message).trim();
        if (msg) ev.chat(u, msg);
      } else if (kind === 'liveChatPaidMessageRenderer' || kind === 'liveChatPaidStickerRenderer') {
        const amount = text(r.purchaseAmountText);
        ev.superchat(u, { name: kind === 'liveChatPaidStickerRenderer' ? `Super Sticker ${amount}` : `Super Chat ${amount}`, diamonds: moneyToDiamonds(amount), image: '' });
        const msg = text(r.message).trim();
        if (msg) ev.chat(u, msg);
      } else if (kind === 'liveChatMembershipItemRenderer' || kind === 'liveChatSponsorshipsGiftPurchaseAnnouncementRenderer') {
        ev.member(u);
      }
    }
    // จำนวนคนดูสด (ทุก 30 วินาที)
    async function views() {
      if (my !== run) return;
      try {
        const d = await api('updated_metadata', { videoId });
        for (const x of d?.actions || []) {
          const v = x.updateViewershipAction?.viewCount?.videoViewCountRenderer;
          if (!v) continue;
          const n = Number(String(v?.originalViewCount ?? text(v?.viewCount)).replace(/[^\d]/g, ''));
          if (Number.isFinite(n) && n >= 0) ev.viewers(n);
        }
      } catch {}
      if (my === run) viewTimer = setTimeout(views, 30000);
    }
    poll();
    views();
    return { videoId, title };
  }

  function disconnect() {
    run++;
    clearTimeout(timer);
    clearTimeout(viewTimer);
  }

  return { connect, disconnect };
};
module.exports.parseTarget = parseTarget;
module.exports.moneyToDiamonds = moneyToDiamonds;
