const {app,BrowserWindow}=require('electron'),fs=require('fs');const root='Z:/Rujira/tiktok_LiveStage';app.setPath('userData',root+'/.local/music-preview-check');
app.whenReady().then(async()=>{const w=new BrowserWindow({show:false,webPreferences:{sandbox:true,autoplayPolicy:'no-user-gesture-required'}}),r={};try{
const port=JSON.parse(fs.readFileSync(root+'/.local/user-data/port.json')).port;await w.loadURL('http://127.0.0.1:'+port+'/admin.html');await new Promise(x=>setTimeout(x,1800));
r.count=await w.webContents.executeJavaScript("document.querySelectorAll('[data-preview]').length");
if(!r.count)throw Error('No uploaded music found');
await w.webContents.executeJavaScript("document.querySelector('[data-preview]').click()",true);
for(let n=0;n<100;n++){await new Promise(x=>setTimeout(x,100));r.audio=await w.webContents.executeJavaScript("(()=>{const a=document.getElementById('mLocalAudio');return {paused:a.paused,time:a.currentTime,duration:a.duration,ready:a.readyState,error:a.error?.code||null,status:document.getElementById('mLocalStatus').textContent}})()");if(r.audio.time>0.6||r.audio.error)break;}
await w.webContents.executeJavaScript("document.getElementById('mLocalAudio').pause()",true);
r.paused=await w.webContents.executeJavaScript("document.getElementById('mLocalAudio').paused");
r.ok=r.audio.time>0.6&&r.audio.duration>0&&!r.audio.error&&r.paused;
}catch(e){r.error=e.message;}fs.writeFileSync(root+'/docs/music-preview-browser-check.json',JSON.stringify(r,null,2));w.destroy();app.quit();});
