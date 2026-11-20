'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=process.env.LIVESTAGE_TEST_ROOT||path.resolve(__dirname,'..');
const events=[];const cfg={theme:'wessuwan',missions:{enabled:false,steps:[]}};
const moduleBox={exports:{}};
const sandbox={module:moduleBox,exports:moduleBox.exports,require,console,Buffer,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0};
vm.runInNewContext(fs.readFileSync(path.join(root,'src/extras.js'),'utf8'),sandbox);
const extra=moduleBox.exports({io:{emit:(event,payload)=>events.push({event,payload}),to:()=>({emit(){}})},log(){},dataDir:path.join(root,'.local','scene-goal-unit'),config:()=>cfg,save(){},status:()=> 'offline',reconnect(){},theme:()=>({name:'test'})});
const user={id:'fixture-user',name:'Fixture'};
extra.onConnected('fixture-room',true);
extra.onEvent('like',user,{count:4999,total:4999});assert.equal(extra.sceneState().level,1);
extra.onEvent('like',user,{count:1,total:5000});assert.equal(extra.sceneState().level,2);
extra.onEvent('like',user,{count:74,total:5074});assert.equal(extra.sceneState().likes,5074);
extra.onEvent('like',user,{count:1,total:5001});assert.equal(extra.sceneState().likes,5074);
extra.onConnected('fixture-room',false);assert.equal(extra.sceneState().level,2);
extra.onEvent('like',user,{count:14926,total:20000});assert.equal(extra.sceneState().level,3);
assert(events.some(e=>e.event==='sceneLevel'&&e.payload.level===2));
const browser={window:{},Math};vm.runInNewContext(fs.readFileSync(path.join(root,'src/public/scene-levels.js'),'utf8'),browser);
const levels=browser.window.SceneLevels;assert(levels.label('wessuwan',2));assert(levels.label('wessuwan',3));assert.equal(levels.label('unsupported',2),'');
function drawing(){const ops=[];const gradient={addColorStop(...args){for(const a of args)if(typeof a==='number')assert(Number.isFinite(a));}};const c=new Proxy({}, {get(_t,k){if(k==='createLinearGradient'||k==='createRadialGradient')return(...args)=>{args.forEach(n=>assert(Number.isFinite(n)));return gradient;};return(...args)=>{args.filter(a=>typeof a==='number').forEach(n=>assert(Number.isFinite(n)));if(['fill','stroke','fillRect'].includes(k))ops.push(k);};},set(){return true;}});return{c,ops};}
for(const level of [2,3])for(const t of [0,1500,10000]){const d=drawing();levels.drawAnim(d.c,'wessuwan',level,t,{});assert(d.ops.length>20,'Level artwork must paint after the photo background');levels.drawFront(d.c,'wessuwan',level,t,{});assert(d.ops.length>40,'Level artwork must visibly add petals');}
const stage=fs.readFileSync(path.join(root,'src/public/stage.js'),'utf8');assert(stage.includes('!window.SceneLevels?.label(sceneId(), 2)'));assert(!stage.includes("SceneLevels.label(sceneId(), d.level + 1) || 'ฉากใหม่'"));
console.log(JSON.stringify({ok:true,checks:['4999 below goal','5000 unlocks level 2','5074 retained after stale update','reconnect retains level','20000 unlocks level 3','both levels draw after photo layer','unsupported themes do not promise missing artwork']}));
