
const {app,BrowserWindow}=require('electron');const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'..');app.setPath('userData',path.join(root,'.local','voice-switch-regression-profile'));
app.whenReady().then(async()=>{const w=new BrowserWindow({show:false,width:1200,height:900,webPreferences:{sandbox:true,autoplayPolicy:'no-user-gesture-required'}});const result={};try{
 await w.loadURL('http://127.0.0.1:3047/app.html');await new Promise(r=>setTimeout(r,1200));
 result.button=await w.webContents.executeJavaScript("document.getElementById('preTts').textContent");
 await w.webContents.executeJavaScript("document.getElementById('testNiwat').click()",true);await new Promise(r=>setTimeout(r,150));await w.webContents.executeJavaScript("document.getElementById('testPremwadee').click()",true);
 const seen=[];for(let i=0;i<120;i++){await new Promise(r=>setTimeout(r,250));const st=await w.webContents.executeJavaScript('window.__voiceTestStatus');if(st&&!seen.includes(st.status))seen.push(st.status);if(st?.status==='ended'||st?.status==='error'){result.playback=st;break;}}
 result.transitions=seen;
 await w.webContents.executeJavaScript("document.getElementById('testPremwadee').click();document.getElementById('testPremwadee').click()",true);
 result.stop=await w.webContents.executeJavaScript('window.__voiceTestStatus');
 result.ok=result.playback?.status==='ended'&&result.playback?.backend==='local-sample'&&result.playback?.voice==='th-TH-PremwadeeNeural'&&result.stop?.status==='stopped';
 }catch(e){result.error=e.message;}fs.writeFileSync(path.join(root,'docs/voice-switch-regression.json'),JSON.stringify(result,null,2));w.destroy();app.quit();});
