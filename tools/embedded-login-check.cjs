const fs=require('fs'),assert=require('assert'),{app,BrowserWindow,ipcMain}=require('electron');const root='Z:/Rujira/tiktok_LiveStage';app.setPath('userData',root+'/.local/embedded-login-test-profile');
const {parseRoom,install,PARTITION}=require(root+'/src/desktop/tiktok-account.cjs');
app.whenReady().then(async()=>{const r={};let w;try{
  assert.equal(parseRoom('<script id="SIGI_STATE">'+JSON.stringify({UserModule:{users:{a:{uniqueId:'example_creator',roomId:'7123456789012345678'}}}})+'</script>','example_creator'),'7123456789012345678');
  assert.equal(parseRoom('<script id="SIGI_STATE">'+JSON.stringify({user:{uniqueId:'other',roomId:'7123456789012345678'}})+'</script>','example_creator'),null);
  assert.equal(parseRoom('<script id="SIGI_STATE">invalid</script>','example_creator'),null);r.roomParser=true;
  const port=JSON.parse(fs.readFileSync(root+'/.local/user-data/port.json')).port,origin='http://127.0.0.1:'+port;
  ipcMain.on('app-info',e=>{e.returnValue={version:'test'};});
  const service=install({getWindow:()=>w,getOrigin:()=>origin});
  w=new BrowserWindow({show:false,webPreferences:{preload:root+'/src/desktop/preload.js',contextIsolation:true,nodeIntegration:false,sandbox:true}});
  await w.loadURL(origin+'/app.html');await new Promise(x=>setTimeout(x,1400));
  r.initial=await w.webContents.executeJavaScript('window.liveStage.tiktokAccountStatus()');
  const store=require('electron').session.fromPartition(PARTITION);await store.cookies.set({url:'https://www.tiktok.com',name:'sessionid',value:'isolated-test-only',secure:true,httpOnly:true});
  r.detected=await w.webContents.executeJavaScript('window.liveStage.tiktokAccountStatus()');
  r.safeStatusKeys=Object.keys(r.detected).every(k=>['saved','opened'].includes(k));
  await w.webContents.executeJavaScript('window.liveStage.tiktokAccountLogout()');r.cleared=!(await service.status()).saved;
  const remote=new BrowserWindow({show:false,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}});await remote.loadURL('data:text/html,isolated');r.noRemoteBridge=await remote.webContents.executeJavaScript('typeof window.liveStage === "undefined" && typeof require === "undefined"');remote.destroy();
  r.ok=r.roomParser&&!r.initial.saved&&r.detected.saved&&r.safeStatusKeys&&r.cleared&&r.noRemoteBridge;
}catch(e){r.error=e.message;}fs.writeFileSync(root+'/docs/embedded-login-check.json',JSON.stringify(r,null,2));if(w)w.destroy();app.quit();});
