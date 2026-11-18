# TikTok LiveStage — Local

โปรเจกต์เวอร์ชัน **1.8.0-local.4** สำหรับพัฒนาหน้าไลฟ์ กิจกรรม ตัวละคร เกม และระบบเสียงบน Windows

## เริ่มพัฒนา

ติดตั้ง Node.js 24 LTS และ Git จากนั้นรันใน PowerShell:

```powershell
git clone https://github.com/klujira15-hue/tiktok_LiveStage.git
cd tiktok_LiveStage
npm ci
npm ci --prefix src
npm start
```

หรือดับเบิลคลิก **Setup-Runtime.cmd** ครั้งแรก แล้วเปิด **Start-LiveStage.cmd**
ตัว launcher เก็บ Electron runtime ในเครื่องที่ %LOCALAPPDATA%\TikTokLiveStage\Runtime เพื่อรองรับโค้ดบนไดรฟ์เครือข่าย
ดู URL และพอร์ตจริงจากหน้าแอป พอร์ตอาจเปลี่ยนเมื่อมีโปรแกรมอื่นใช้อยู่

## จุดแก้ไขหลัก

| เส้นทาง | หน้าที่ |
| --- | --- |
| src/desktop/ | Electron, หน้าต่าง, TikTok login และการส่งภาพ OBS |
| src/server.js | เซิร์ฟเวอร์ในเครื่องและเหตุการณ์ LIVE |
| src/public/app.js | เมนูและหน้าควบคุม |
| src/public/stage.js | ภาพฉากและกิจกรรม |
| src/public/themes/ | ธีม |
| src/mg/ และ src/public/mg/ | เกมย่อย |
| src/tts.js | ระบบเสียงพูด |
| src/owned-gemini.js | บริการ Gemini ของผู้ใช้ |
| tools/ | launcher และเครื่องมือตรวจสอบ |

## บัญชีและข้อมูลส่วนตัว

แต่ละเครื่องต้องล็อกอิน TikTok และตั้ง Gemini API Key ของตนเองผ่านแอป ข้อมูลเหล่านี้ไม่รวมใน Git
ข้อมูลใช้งานถูกเก็บใน .local/ ซึ่งถูก ignore ไว้ รวมถึง session, API Key, เพลงส่วนตัว และบันทึกการทำงาน
อย่าเพิ่มข้อมูลเหล่านี้ด้วย git add -f

## ตรวจโค้ด

```powershell
npm run verify:local
npm run test:flow
npm run test:games
npm run test:gemini
```

## สถานะสำหรับผู้พัฒนาต่อ

- ใช้เมนู ธีม และเกมของโปรเจกต์ LiveStage ปัจจุบัน ไม่ใช้แมพงานวัดม็อกที่ยกเลิกแล้ว
- รุ่น Local ไม่ใช้บัญชีหรือบริการสมัครสมาชิก TubHool; สิทธิ์บริการต้นทางไม่ได้ถูกปลดล็อก
- เสียงเปรมวดีตัวอย่างใช้ได้ แต่การสังเคราะห์ข้อความใหม่ยังมีข้อจำกัดจากผู้ให้บริการ ต้องทดสอบจริงก่อนใช้
- การเชื่อม TikTok และการรับแชท/หัวใจ/ของขวัญต้องตรวจด้วยบัญชีที่กำลัง LIVE; การเปิดหน้าจอได้ไม่ใช่หลักฐานว่ารับทุกเหตุการณ์ครบ
- OBS Virtual Camera ส่งภาพ 1080x1920 ที่ 30 FPS และ CABLE Output ส่งเสียงได้ในการตรวจเครื่องเดิม แต่เครื่องใหม่ต้องตั้งเอง
- บัญชี TikTok อาจมีเงื่อนไขปลดล็อก Virtual Camera ใน LIVE Studio; repository นี้ไม่เปลี่ยนเงื่อนไขของ TikTok
- ปุ่ม LIVE Manager ปัจจุบันเปิด TikTok Shop Manager สำหรับงานร้านค้า ไลฟ์กิจกรรมทั่วไปให้ตั้งผ่าน TikTok LIVE Studio
- ยังไม่มีการยืนยันว่าการออกอากาศจริงจากคอมครบทั้งภาพ เสียง และกิจกรรมผ่านทั้งหมด

## ที่มาของโค้ด

มีโค้ดและทรัพยากรจากแพ็กเกจ Live Stage 1.8.0 ของ TubHool ที่ผู้ใช้ส่งมา พร้อมการแก้ไขสำหรับ Local edition
คงชื่อผู้สร้างและประกาศสิทธิ์เดิมไว้ ไม่ได้เพิ่มใบอนุญาตโอเพนซอร์สให้โค้ดหรือทรัพยากรของบุคคลอื่น
src/package.json ระบุ UNLICENSED ให้ตรวจสิทธิ์ของส่วนประกอบก่อนนำไปเผยแพร่หรือจำหน่ายต่อ
