// เสียงพูดธรรมชาติด้วย Microsoft Edge Read Aloud (ฟรี ไม่เป็นทางการ)
// บริการนี้บางครั้งตัดสายกลางทาง (โดยเฉพาะเสียงเปรมวดี) จึงยิงคำขอคู่ขนาน 2 ทางแล้วเอาอันที่เสร็จก่อน
// ถ้ายังใช้ไม่ได้ หน้าเวทีจะสลับไปใช้เสียงของเครื่องเอง
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

const VOICES = {
  'th-TH-NiwatNeural': 'นิวัฒน์ (ผู้ชาย) — เสถียร แนะนำ',
  'th-TH-PremwadeeNeural': 'เปรมวดี (ผู้หญิง) — แจ้งเตือนเมื่อบริการไม่พร้อม',
};

const cache = new Map(); // key -> Buffer (LRU)
const MAX_CACHE = 400;
const inflight = new Map(); // key -> Promise (ข้อความเดียวกันที่กำลังสร้าง ไม่ต้องสร้างซ้ำ)

const xmlEscape = (s) => String(s).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]);

async function synthOnce(text, voice, rate, pitch) {
  const tts = new MsEdgeTTS({ connectionTimeoutMs: 8000, synthesisTimeoutMs: 12000 });
  try {
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = await tts.toStream(xmlEscape(text), { rate, pitch });
    const chunks = [];
    await new Promise((res, rej) => {
      audioStream.on('data', (d) => chunks.push(d));
      audioStream.on('close', res);
      audioStream.on('error', rej);
    });
    const buf = Buffer.concat(chunks);
    if (!buf.length) throw new Error('empty audio');
    return buf;
  } finally {
    try {
      tts.close();
    } catch {}
  }
}

const FALLBACK = 'th-TH-NiwatNeural'; // เสียงที่เสถียรกว่า

async function generate(t, voice, rate, pitch) {
  let lastErr;
  // ลองทีละครั้ง (ยิงพร้อมกันหลายทางโดนจำกัดหนักกว่า)
  const tries = voice === FALLBACK ? 3 : 2;
  for (let i = 0; i < tries; i++) {
    try {
      return await synthOnce(t, voice, rate, pitch);
    } catch (e) {
      lastErr = e;
      console.warn(`[tts] ${voice} ครั้งที่ ${i + 1} ไม่สำเร็จ: ${e?.message || e}`);
    }
  }
  // Respect the selected speaker. Never silently substitute a different voice.
  throw lastErr;
}

async function speak(text, opts = {}) {
  const voice = VOICES[opts.voice] ? opts.voice : FALLBACK;
  const rate = Math.min(1.6, Math.max(0.6, Number(opts.rate) || 1));
  const p = Math.round(Math.min(30, Math.max(-30, Number(opts.pitch) || 0)));
  const pitch = `${p >= 0 ? '+' : ''}${p}%`;
  const t = String(text || '').slice(0, 220).trim();
  if (!t) throw new Error('no text');
  const key = `${opts.strict ? "exact" : "auto"}|${voice}|${rate}|${pitch}|${t}`;
  if (cache.has(key)) {
    const b = cache.get(key);
    cache.delete(key);
    cache.set(key, b);
    return b;
  }
  if (!inflight.has(key)) {
    const job = (opts.strict ? synthOnce(t, voice, rate, pitch) : generate(t, voice, rate, pitch)).finally(() => inflight.delete(key));
    inflight.set(key, job);
  }
  const buf = await inflight.get(key);
  cache.set(key, buf);
  if (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value);
  return buf;
}

// ทดสอบการเชื่อมต่อตอนเปิดเซิร์ฟเวอร์ (และทำให้ครั้งแรกเร็วขึ้น)
function warmup() {
  for (const v of Object.keys(VOICES)) speak('สวัสดี', { voice: v }).catch(() => {});
}

module.exports = { speak, warmup, VOICES };
