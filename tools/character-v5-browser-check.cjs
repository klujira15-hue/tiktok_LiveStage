'use strict';
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.local','character-v5-check');fs.mkdirSync(out,{recursive:true});app.setPath('userData',out);
for(const flag of ['disable-background-timer-throttling','disable-renderer-backgrounding','disable-backgrounding-occluded-windows'])app.commandLine.appendSwitch(flag);
const report={ok:false,errors:[]};let win;
app.whenReady().then(async()=>{try{
 win=new BrowserWindow({show:false,width:1400,height:1000,webPreferences:{offscreen:true,backgroundThrottling:false,sandbox:true,contextIsolation:true,nodeIntegration:false}});win.webContents.setFrameRate(30);win.webContents.session.setPermissionRequestHandler((_w,_p,cb)=>cb(false));
 win.webContents.on('console-message',(_event,level,msg)=>{if(level>=3)report.errors.push(String(msg).slice(0,200));});
 await win.loadURL('http://127.0.0.1:3031/characters/fair-v1/preview.html');
 const js=s=>win.webContents.executeJavaScript(s),sleep=ms=>new Promise(r=>setTimeout(r,ms));
 report.loaded=await js(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(window.__fairCharacterCheck){clearInterval(timer);resolve(window.__fairCharacterCheck);}else if(++n>300){clearInterval(timer);reject(Error(document.getElementById('status').textContent));}},100);})`);assert(report.loaded.signatureFrames.every(n=>n===8));
 async function capture(id,name){const data=await js(`document.getElementById('${id}').toDataURL('image/png')`),p=path.join(out,name);fs.writeFileSync(p,Buffer.from(data.split(',')[1],'base64'));return p;}
 report.danceSheets=[];for(let n=1;n<=4;n++){await js(`(()=>{document.querySelectorAll('.card select').forEach(s=>{s.value='ramwong${n}';s.dispatchEvent(new Event('change'));});})()`);await sleep(200);report.danceSheets.push(await capture('show','ramwong-'+n+'.png'));}
 const video=path.join(root,'src/public/characters/fair-v1/examples/fair-characters-v5-in-scene.webm');if(fs.existsSync(video))throw Error('Output exists; do not overwrite');
 const download=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Video timeout')),65000);win.webContents.session.once('will-download',(_e,item)=>{item.setSavePath(video);item.once('done',(_e,state)=>{clearTimeout(timer);state==='completed'?resolve():reject(Error(state));});});});
 await js(`document.getElementById('record').click()`);await sleep(3000);
 report.prayer=await js(`window.__fairActivityTest.getWalkers()`);assert(report.prayer.every(w=>w.action==='pray'&&!w.moving&&w.facing==='back-left'));report.prayerImage=await capture('stage','prayer-in-scene.png');
 let dancers;for(let n=0;n<110;n++){dancers=await js(`window.__fairActivityTest.getWalkers()`);if(dancers.every(w=>w.action==='festivalDance'&&!w.moving))break;await sleep(300);}
 assert(dancers.every(w=>w.action==='festivalDance'&&!w.moving));
 report.dance=dancers;report.feetInsideStage=await js(`window.__fairActivityTest.getWalkers().every(w=>FairSceneUsage.onStage(w.position))`);assert(report.feetInsideStage);report.danceImage=await capture('stage','dance-in-scene.png');
 await download;assert(fs.statSync(video).size>100000);report.video=video;assert.equal(report.errors.length,0);report.ok=true;
 }catch(e){report.error=e.message;process.exitCode=1;}finally{fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));win?.destroy();app.quit();}});
