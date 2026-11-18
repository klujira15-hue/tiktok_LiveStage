const {app,BrowserWindow}=require('electron'),fs=require('fs');const root='Z:/Rujira/tiktok_LiveStage';
app.setPath('userData',root+'/.local/particles-preview-check');
app.whenReady().then(async()=>{const w=new BrowserWindow({show:false,webPreferences:{sandbox:true,autoplayPolicy:'no-user-gesture-required'}}),result={};try{
const port=JSON.parse(fs.readFileSync(root+'/.local/user-data/port.json')).port;
await w.loadURL('http://127.0.0.1:'+port+'/app.html');await new Promise(r=>setTimeout(r,1600));
result.controls=await w.webContents.executeJavaScript("({questionDisabled:document.getElementById('testKhaQuestion').disabled,statementDisabled:document.getElementById('testKhaStatement').disabled,gemini:!!document.getElementById('testGeminiParticles')})");
await w.webContents.executeJavaScript("document.getElementById('testGeminiParticles').click()",true);
result.states=[];
for(let n=0;n<200;n++){await new Promise(r=>setTimeout(r,100));const s=await w.webContents.executeJavaScript('window.__voiceTestStatus');if(s&&!result.states.some(x=>x.status===s.status))result.states.push(s);if(['ended','error'].includes(s?.status))break;}
result.caption=await w.webContents.executeJavaScript("document.getElementById('particleCaption').textContent");
await w.webContents.executeJavaScript("document.getElementById('testGeminiParticles').click()",true);await new Promise(r=>setTimeout(r,300));await w.webContents.executeJavaScript("document.getElementById('testGeminiParticles').click()",true);
result.stop=await w.webContents.executeJavaScript('window.__voiceTestStatus');
result.ok=result.controls.questionDisabled&&result.controls.statementDisabled&&result.states.some(s=>s.status==='playing'&&s.voice==='Gemini-Kore')&&result.states.some(s=>s.status==='ended')&&result.stop.status==='stopped';
}catch(e){result.error=e.message;}fs.writeFileSync(root+'/docs/particles-preview-browser-check.json',JSON.stringify(result,null,2));w.destroy();app.quit();});
