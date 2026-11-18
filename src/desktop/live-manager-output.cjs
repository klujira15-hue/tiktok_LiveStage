'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),cp=require('child_process');
const NAME='LiveStage Output',PROFILE='LiveStage Vertical';
const OBS='C:/Program Files/obs-studio/bin/64bit/obs64.exe';
function makeScene(url){
  const sourceId=crypto.randomUUID(),sceneId=crypto.randomUUID();
  const base={prev_ver:536936450,mixers:0,sync:0,flags:0,volume:1,balance:.5,enabled:true,muted:false,hotkeys:{},private_settings:{}};
  return {name:NAME,current_scene:NAME,current_program_scene:NAME,scene_order:[{name:NAME}],sources:[
    {...base,name:'LiveStage Scene',uuid:sourceId,id:'browser_source',versioned_id:'browser_source',settings:{url,width:1080,height:1920,fps:30,fps_custom:true,reroute_audio:true,shutdown:false,restart_when_active:false,css:'body { margin: 0; overflow: hidden; }'},mixers:1},
    {...base,name:NAME,uuid:sceneId,id:'scene',versioned_id:'scene',settings:{id_counter:1,custom_size:false,items:[{name:'LiveStage Scene',source_uuid:sourceId,visible:true,locked:true,rot:0,pos:{x:0,y:0},scale:{x:1,y:1},align:5,bounds_type:0,bounds_align:0,bounds:{x:0,y:0},crop_left:0,crop_top:0,crop_right:0,crop_bottom:0,id:1,scale_filter:'disable',blend_method:'default',blend_type:'normal',show_transition:{duration:0},hide_transition:{duration:0},private_settings:{}}]}}
  ],groups:[],transitions:[],quick_transitions:[],saved_projectors:[],current_transition:'Fade',transition_duration:300,preview_locked:true,scaling_enabled:false,'virtual-camera':{type2:0},modules:{},resolution:{x:1080,y:1920},version:2};
}
function prepare(origin,baseDir=path.join(process.env.APPDATA,'obs-studio')){
  if(!fs.existsSync(OBS))throw Error('ยังไม่พบ OBS Studio ในเครื่อง');
  if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin))throw Error('Invalid local stage origin');
  const scenes=path.join(baseDir,'basic','scenes'),profiles=path.join(baseDir,'basic','profiles',PROFILE.replace(/ /g,'_'));
  fs.mkdirSync(scenes,{recursive:true});fs.mkdirSync(profiles,{recursive:true});
  const dest=path.join(scenes,'LiveStage_Output.json');
  if(!fs.existsSync(dest))fs.writeFileSync(dest,JSON.stringify(makeScene(origin+'/stage.html'),null,2));
  else {const scene=JSON.parse(fs.readFileSync(dest));const source=scene.sources?.find(x=>x.name==='LiveStage Scene'&&x.id==='browser_source');if(!source)throw Error('ฉาก LiveStage ถูกเปลี่ยนโครงสร้าง กรุณาตรวจใน OBS');source.settings.url=origin+'/stage.html';fs.writeFileSync(dest,JSON.stringify(scene,null,2));}
  const ini=path.join(profiles,'basic.ini');
  if(!fs.existsSync(ini))fs.writeFileSync(ini,'[General]\nName='+PROFILE+'\n\n[Video]\nBaseCX=1080\nBaseCY=1920\nOutputCX=1080\nOutputCY=1920\nFPSType=0\nFPSCommon=30\n\n[Audio]\nSampleRate=48000\nChannelSetup=Stereo\n\n[Output]\nMode=Simple\n');
  return {prepared:true,collection:NAME,profile:PROFILE,width:1080,height:1920};
}
function running(){return /obs64\.exe/i.test(cp.execFileSync('tasklist.exe',['/FI','IMAGENAME eq obs64.exe','/FO','CSV','/NH'],{encoding:'utf8',windowsHide:true}));}
function start(origin){if(running())return {started:false,message:'OBS เปิดอยู่แล้ว เลือก Scene Collection: LiveStage Output แล้วกด Start Virtual Camera'};prepare(origin);const child=cp.spawn(OBS,['--profile',PROFILE,'--collection',NAME,'--scene',NAME,'--startvirtualcam','--disable-updater','--disable-missing-files-check'],{cwd:path.dirname(OBS),detached:true,windowsHide:false,stdio:'ignore'});child.on('error',()=>{});child.unref();return {started:true,message:'เปิด OBS พร้อมฉาก LiveStage · เลือก OBS Virtual Camera ใน LIVE Manager (ยังไม่เริ่มไลฟ์)'};}
function install({getWindow,getOrigin}){const {ipcMain}=require('electron');ipcMain.handle('live-output:start',e=>{if(e.sender!==getWindow()?.webContents||e.senderFrame!==e.sender.mainFrame||!e.senderFrame.url.startsWith(getOrigin()+'/'))throw Error('Untrusted window');return start(getOrigin());});}
module.exports={makeScene,prepare,start,install,OBS};
