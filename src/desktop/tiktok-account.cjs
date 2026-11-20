'use strict';
// User-owned embedded TikTok login. Cookies stay inside the Electron partition.
const PARTITION='persist:livestage-tiktok-account';
function findRoom(data,username){
  let room=null,visited=0;
  function walk(value,depth){
    if(room||!value||typeof value!=='object'||depth>18||++visited>40000)return;
    const id=String(value.uniqueId||value.unique_id||'').toLowerCase();
    if(id===username.toLowerCase()){
      const candidate=String(value.roomId||value.room_id||'');
      if(/^[1-9]\d{8,24}$/.test(candidate))room=candidate;
    }
    for(const item of Object.values(value))walk(item,depth+1);
  }walk(data,0);return room;
}
function parseRoom(html,username){
  for(const id of ['SIGI_STATE','__UNIVERSAL_DATA_FOR_REHYDRATION__']){
    const pattern=new RegExp('<script[^>]*id=["\\\']'+id+'["\\\'][^>]*>([\\s\\S]*?)<\\/script>','i');
    const match=pattern.exec(html);if(!match)continue;
    try{const room=findRoom(JSON.parse(match[1]),username);if(room)return room;}catch{}
  }return null;
}
module.exports={PARTITION,parseRoom,findRoom,install};
function install({getWindow,getOrigin}){
  const {BrowserWindow,session,ipcMain}=require('electron');
  const store=session.fromPartition(PARTITION);let login=null,manager=null,timer=null,checking=false;
  store.setPermissionRequestHandler((wc,permission,done)=>{
    let trustedManager=false;try{trustedManager=wc===manager?.webContents&&new URL(wc.getURL()).hostname==='shop.tiktok.com';}catch{}
    if(permission!=='media'||!trustedManager)return done(false);
    require('electron').dialog.showMessageBox(manager,{type:'question',title:'สิทธิ์กล้องและไมโครโฟนสำหรับ LIVE Manager',message:'อนุญาตให้ TikTok LIVE Manager ใช้กล้องและไมโครโฟนหรือไม่?',detail:'เลือก OBS Virtual Camera ในหน้าตั้งค่าของ LIVE Manager เพื่อส่งภาพฉาก แทนกล้องจริง',buttons:['อนุญาต','ไม่อนุญาต'],defaultId:1,cancelId:1}).then(r=>done(r.response===0)).catch(()=>done(false));
  });
  const status=async()=>({saved:(await store.cookies.get({url:'https://www.tiktok.com',name:'sessionid'})).some(c=>!!c.value),opened:!!login&&!login.isDestroyed()});
  const trusted=e=>e.sender===getWindow()?.webContents&&e.senderFrame===e.sender.mainFrame&&e.senderFrame.url.startsWith(getOrigin()+'/');
  function assert(e){if(!trusted(e))throw Error('Untrusted window');}
  async function open(){
    if(login&&!login.isDestroyed()){login.show();login.focus();return {opened:true};}
    login=new BrowserWindow({width:1050,height:820,title:'เข้าสู่ระบบ TikTok — LiveStage',autoHideMenuBar:true,parent:getWindow()||undefined,webPreferences:{partition:PARTITION,contextIsolation:true,nodeIntegration:false,sandbox:true}});
    // No app preload/IPC or renderer access to cookies in this remote window.
    const ua=login.webContents.getUserAgent().replace(/\s\S*LiveStage\S*/gi,'').replace(/\sElectron\/\S+/g,'');login.webContents.setUserAgent(ua);
    login.webContents.setWindowOpenHandler(({url})=>({action:/^https:\/\//i.test(url)?'allow':'deny',overrideBrowserWindowOptions:{autoHideMenuBar:true,webPreferences:{partition:PARTITION,contextIsolation:true,nodeIntegration:false,sandbox:true}}}));
    login.webContents.on('will-navigate',(e,url)=>{if(!/^https:\/\//i.test(url))e.preventDefault();});
    login.on('closed',()=>{clearInterval(timer);timer=null;login=null;});
    const initiallySaved=(await status()).saved;
    timer=setInterval(async()=>{if(checking||!login)return;checking=true;try{if(!initiallySaved&&(await status()).saved){await store.cookies.flushStore();store.flushStorageData();getWindow()?.webContents.send('tiktok-account-changed',{saved:true});clearInterval(timer);timer=null;}}catch{}finally{checking=false;}},1200);
    login.loadURL('https://www.tiktok.com/login').then(()=>console.log('[TikTok account] Embedded login page loaded')).catch(()=>console.log('[TikTok account] Login page load failed'));
    return {opened:true,saved:initiallySaved};
  }
  async function readLiveRoom(username,{timeoutMs=15000}={}){
    if(!(await status()).saved||!/^[A-Za-z0-9_.]{1,64}$/.test(username))return null;
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),Math.max(1000,Math.min(15000,timeoutMs)));
    try{
      // Only official TikTok sees the partition's session. Never pass cookies to connector/signers.
      const response=await store.fetch('https://www.tiktok.com/@'+encodeURIComponent(username)+'/live',{signal:controller.signal});
      if(!response.ok)return null;const html=await response.text();if(html.length>12000000)return null;
      return parseRoom(html,username);
    }catch{return null;}finally{clearTimeout(timeout);}
  }
  ipcMain.handle('tiktok-account:manager',e=>{assert(e);if(manager&&!manager.isDestroyed()){manager.show();manager.focus();return {opened:true};}manager=new BrowserWindow({width:1400,height:950,title:'TikTok Shop LIVE Manager',autoHideMenuBar:true,webPreferences:{partition:PARTITION,contextIsolation:true,nodeIntegration:false,sandbox:true}});manager.webContents.setWindowOpenHandler(()=>({action:'deny'}));manager.webContents.on('will-navigate',(event,url)=>{if(!/^https:\/\//i.test(url))event.preventDefault();});manager.on('closed',()=>manager=null);manager.loadURL('https://shop.tiktok.com/streamer/welcome').catch(()=>{});return {opened:true};});
  ipcMain.handle('tiktok-account:status',e=>{assert(e);return status();});
  ipcMain.handle('tiktok-account:login',e=>{assert(e);return open();});
  ipcMain.handle('tiktok-account:logout',async e=>{assert(e);if(login&&!login.isDestroyed())login.close();await store.clearStorageData();return {saved:false};});
  return {status,open,readLiveRoom};
}
