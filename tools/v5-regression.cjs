const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const d=path.resolve(__dirname,'../src/public/characters/fair-v1');
const U=require(d+'/scene-usage.js'),A=require(d+'/activity-runtime.js');
for(let i=0;i<4;i++){const p=U.placement('prayer',i);assert.equal(U.facingAltar(p),'back-left');assert(p.x>U.altar.x&&p.y>U.altar.y,'Prayer body must be below and right of Buddha, facing toward it');assert(U.onStage(U.placement('dance',i)),'Dancer feet must lie on stage ellipse');}
const m=JSON.parse(fs.readFileSync(d+'/manifest.json'));assert(m.version>=5);
for(const p of m.characters){assert.equal(p.signature.prayerFacing,'back-left');assert.equal(new Set(p.signature.dance.frames).size,4);assert.deepEqual([...p.signature.dance.frames].sort(),[4,5,6,7]);assert.equal(p.signature.dance.durations.length,4);assert(fs.existsSync(d+'/'+p.signature.source));}
const calls=[],ctx={save(){},restore(){},translate(){},scale(...a){calls.push(['scale',...a]);},drawImage(...a){calls.push(['image',...a]);}};
const meta=m.characters[0],person={meta,signature:{canvas:{},height:100,frames:Array.from({length:8},(_,i)=>({x:i*20,y:0,w:18,h:100}))}};
for(let n=1;n<=4;n++){calls.length=0;A.draw(ctx,person,{x:0,y:0,height:100,time:0,action:'ramwong'+n,shadow:false});assert.equal(calls.find(a=>a[0]==='image')[2],(n+3)*20);}
calls.length=0;A.draw(ctx,person,{x:0,y:0,height:100,time:0,action:'pray',direction:-1,facing:'back-left',shadow:false});assert.deepEqual(calls.find(a=>a[0]==='scale'),['scale',1,1],'Walking heading must not mirror prayer away from Buddha');
calls.length=0;A.draw(ctx,person,{x:0,y:0,height:100,time:0,action:'pray',direction:1,facing:'back-right',shadow:false});assert.deepEqual(calls.find(a=>a[0]==='scale'),['scale',-1,1]);
console.log('PASS: altar-relative prayer facing, prayer does not inherit walking mirror, four explicit ramwong poses per character, all dancer feet inside stage');
