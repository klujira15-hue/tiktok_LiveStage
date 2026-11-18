/* ทำแผนที่ความลึก (depth map) จากภาพ 1 ใบ — ใช้ในหน้า "สร้างธีมเอง" → ภาพของฉัน (2.5D)
 * AI: Depth Anything V2 (small) ผ่าน transformers.js รันในเครื่องนี้เลย ไม่ต้องใช้คีย์ ไม่เสียเงิน
 *     ครั้งแรกโหลดตัวช่วย ~30MB จากอินเทอร์เน็ต (เบราว์เซอร์จำไว้ ครั้งต่อไปเร็ว)
 * ออฟไลน์/โหลดไม่ได้: ใช้ความลึกแบบง่าย (บนไกล ล่างใกล้) ฉากยังขยับได้แต่มิติน้อยกว่า
 */
const LIB = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1';
const MODEL = 'onnx-community/depth-anything-v2-small';
let pipeP = null;

const toBlob = (c, type, q) => new Promise((r) => c.toBlob(r, type, q));

// ย่อภาพให้พอดีหน้าเวที (ด้านยาวสุด 2048px) แล้วบันทึกเป็น JPG
async function prepImage(file) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 2048 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return c;
}

async function getPipe(onStatus) {
  if (pipeP) return pipeP;
  pipeP = (async () => {
    const T = await import(LIB);
    let last = 0;
    const progress_callback = (p) => {
      if (p.status === 'progress' && p.total > 1e6 && Date.now() - last > 300) {
        last = Date.now();
        onStatus(`กำลังโหลดตัวช่วย AI… ${Math.round((p.loaded / p.total) * 100)}% (ครั้งแรกครั้งเดียว)`);
      }
    };
    if (navigator.gpu) {
      try {
        return await T.pipeline('depth-estimation', MODEL, { device: 'webgpu', dtype: 'fp16', progress_callback });
      } catch (e) {
        console.warn('depth: webgpu ใช้ไม่ได้ ใช้ CPU แทน', e);
      }
    }
    return T.pipeline('depth-estimation', MODEL, { progress_callback });
  })();
  pipeP.catch(() => (pipeP = null));
  return pipeP;
}

// ความลึกแบบง่าย: บนภาพไกล ล่างภาพใกล้
function simpleDepth(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#202020');
  g.addColorStop(0.45, '#5a5a5a');
  g.addColorStop(1, '#ffffff');
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
  return c;
}

export async function makeDepth(file, onStatus = () => {}) {
  onStatus('กำลังเตรียมภาพ…');
  const pic = await prepImage(file);
  const img = await toBlob(pic, 'image/jpeg', 0.9);
  let depthCanvas = null;
  let mode = 'ai';
  try {
    onStatus('กำลังโหลดตัวช่วย AI…');
    const pipe = await getPipe(onStatus);
    onStatus('AI กำลังวิเคราะห์ความลึกของภาพ… (10-60 วินาที)');
    const url = URL.createObjectURL(img);
    const out = await pipe(url);
    URL.revokeObjectURL(url);
    depthCanvas = out.depth.toCanvas();
  } catch (e) {
    console.warn('depth: ใช้ความลึกแบบง่าย', e);
    mode = 'simple';
    depthCanvas = simpleDepth(pic.width, pic.height);
  }
  // ขนาดเท่าภาพ + เบลอนิดหน่อยให้ขอบนุ่ม (ลดรอยฉีกตอนกล้องขยับ)
  const c = document.createElement('canvas');
  c.width = pic.width;
  c.height = pic.height;
  const x = c.getContext('2d');
  x.filter = `blur(${Math.max(1, Math.round(pic.width / 500))}px)`;
  x.drawImage(depthCanvas, 0, 0, c.width, c.height);
  const depth = await toBlob(c, 'image/png');
  return { img, depth, mode };
}
