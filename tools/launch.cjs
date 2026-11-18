'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
function sha(file){return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')}
function prepareRuntime(){
 const pkg=JSON.parse(fs.readFileSync(path.join(root,'node_modules','electron','package.json'),'utf8'));
 const source=path.join(root,'node_modules','electron','dist');
 if(!fs.existsSync(path.join(source,'electron.exe')))throw Error('Electron runtime missing. Run Setup-Runtime.cmd.');
 const local=process.env.LOCALAPPDATA||path.join(os.homedir(),'AppData','Local');
 const cacheBase=path.resolve(local,'TikTokLiveStage','Runtime');
 const target=path.resolve(cacheBase,'electron-'+pkg.version);
 if(!target.startsWith(cacheBase+path.sep))throw Error('Invalid runtime cache path');
 const sourceStat=fs.statSync(path.join(source,'electron.exe'));
 let stamp=null;try{stamp=JSON.parse(fs.readFileSync(path.join(target,'runtime-ready.json'),'utf8'))}catch{}
 const metadataMatches=stamp&&stamp.sourceSize===sourceStat.size&&stamp.sourceMtimeMs===sourceStat.mtimeMs;
 const sourceHash=metadataMatches?stamp.sourceHash:sha(path.join(source,'electron.exe'));
 if(!stamp||stamp.sourceHash!==sourceHash||!fs.existsSync(path.join(target,'electron.exe'))||sha(path.join(target,'electron.exe'))!==sourceHash){
  console.log('Preparing local Electron runtime (project remains on Z:)...');
  fs.mkdirSync(target,{recursive:true});fs.cpSync(source,target,{recursive:true,force:true});
  for(const file of ['electron.exe','resources.pak','icudtl.dat','snapshot_blob.bin','v8_context_snapshot.bin'])if(sha(path.join(source,file))!==sha(path.join(target,file)))throw Error('Runtime copy verification failed: '+file);
  fs.writeFileSync(path.join(target,'runtime-ready.json'),JSON.stringify({version:pkg.version,sourceHash,sourceSize:sourceStat.size,sourceMtimeMs:sourceStat.mtimeMs,preparedAt:new Date().toISOString()},null,2));
 }
 if(stamp&&(!metadataMatches))fs.writeFileSync(path.join(target,'runtime-ready.json'),JSON.stringify({...stamp,sourceHash,sourceSize:sourceStat.size,sourceMtimeMs:sourceStat.mtimeMs},null,2));
 return path.join(target,'electron.exe');
}
async function main(){
 const executable=prepareRuntime();
 if(process.argv.includes('--prepare-only')){console.log(JSON.stringify({runtime:executable,project:root,sandbox:true}));return}
 const userData=path.join(root,'.local','user-data');const logs=path.join(root,'.local','logs');fs.mkdirSync(userData,{recursive:true});fs.mkdirSync(logs,{recursive:true});
 const logPath=path.join(logs,'desktop-launch.log'),fd=fs.openSync(logPath,'a');fs.writeSync(fd,'\nLaunch '+new Date().toISOString()+'\n');
 console.log('Opening LiveStage. The source project stays on Z:.');
 const child=spawn(executable,[root],{cwd:root,env:{...process.env,LIVESTAGE_USERDATA:userData},detached:true,windowsHide:false,stdio:['ignore',fd,fd]});
 let spawnError=null,earlyExit=null;child.once('error',e=>spawnError=e);child.once('exit',(code,signal)=>earlyExit={code,signal});
 await new Promise(resolve=>setTimeout(resolve,3000));
 fs.closeSync(fd);
 if(spawnError)throw spawnError;
 if(earlyExit&&earlyExit.code!==0)throw Error('LiveStage exited ('+earlyExit.code+'). See '+logPath);
 child.unref();console.log('LiveStage started. Log: '+logPath);
}
main().catch(error=>{console.error(error.message);process.exitCode=1});
