const {app,BrowserWindow}=require('electron');const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');app.setPath('userData',path.join(root,'.local','theme-smoke-profile'));
app.whenReady().then(async()=>{
 const {THEMES}=require('../src/themes');const ids=Object.keys(THEMES);const rows=[];
 const win=new BrowserWindow({show:false,width:540,height:960,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}});
 let errors=[];win.webContents.on('console-message',(_e,level,message)=>{if(typeof level==='object'){if(level.level==='error')errors.push(level.message);}else if(level===3)errors.push(message);});
 for(const id of ids){errors=[];try{
  await win.loadURL('http://127.0.0.1:3031/stage.html?silent&thumb&theme='+encodeURIComponent(id));
  let ready=false;for(let n=0;n<40;n++){await new Promise(r=>setTimeout(r,200));ready=await win.webContents.executeJavaScript("!!document.querySelector('#root.ready')");if(ready)break;}
  await new Promise(r=>setTimeout(r,200));
  const info=await win.webContents.executeJavaScript("({theme:window.__stage?.api?.meta?.id,registered:Object.keys(window.STAGE_THEMES||{}),canvases:document.querySelectorAll('canvas').length})");
  rows.push({id,ready,errors:[...new Set(errors)].slice(0,5),info});fs.appendFileSync(path.join(root,'docs','theme-smoke-progress.jsonl'),JSON.stringify(rows.at(-1))+'\n');
 }catch(e){rows.push({id,ready:false,error:e.message});fs.appendFileSync(path.join(root,'docs','theme-smoke-progress.jsonl'),JSON.stringify(rows.at(-1))+'\n');}}
 fs.writeFileSync(path.join(root,'docs','theme-smoke-results.json'),JSON.stringify(rows,null,2));win.destroy();app.quit();
});
