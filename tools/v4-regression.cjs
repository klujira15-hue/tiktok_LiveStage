const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const dir=path.resolve(__dirname,'../src/public/characters/fair-v1');
const C=require(dir+'/animator.js'),A=require(dir+'/activity-runtime.js');
for(const [dx,dy,want] of [[0,-10,'back'],[0,10,'front'],[-10,0,'left'],[10,0,'right'],[1,-10,'back'],[-1,10,'front']])assert.equal(C.selectFacing(dx,dy),want);assert.equal(C.selectFacing(0,0,'back'),'back');
const frames=Array.from({length:8},(_,i)=>({x:i%4*100,y:Math.floor(i/4)*200,w:80,h:180}));
const person=new C.Character({actions:{idle:{frames:[0],step:300}},walkViews:{step:180}}, {},frames);
person.walkViews={canvas:{},frames,height:180,cellW:100,cellH:200,baselines:[180,180]};
let call;const ctx={save(){},restore(){},drawImage(...a){call=a;}};
for(const [action,offset] of [['walkFront',0],['walkBack',4]])for(let phase=0;phase<4;phase++){person.draw(ctx,{x:10,y:20,height:180,time:phase*180,action,shadow:false});assert.equal(call[1],frames[offset+phase].x);assert.equal(call[2],frames[offset+phase].y);}
const m=JSON.parse(fs.readFileSync(dir+'/manifest.json'));const danceDurations=new Set(),prayerDurations=new Set(),sources=new Set();
for(const c of m.characters){assert(fs.existsSync(dir+'/'+c.walkViews.source));assert(fs.existsSync(dir+'/'+c.signature.source));sources.add(c.signature.source);for(const action of ['prayer','dance']){const spec=c.signature[action];assert.equal(spec.frames.length,spec.durations.length);assert(spec.durations.every(d=>d>0));assert(spec.frames.every(f=>action==='prayer'?f<4:f>=4&&f<8));}danceDurations.add(c.signature.dance.durations.reduce((a,b)=>a+b));prayerDurations.add(c.signature.prayer.durations.reduce((a,b)=>a+b));assert.equal(A.sampleSignature(c.signature,'pray',999999,false).frame,3);assert(A.sampleSignature(c.signature,'festivalDance',10000,false).frame>=4);}
assert.equal(sources.size,4);assert.equal(danceDurations.size,4);assert.equal(prayerDurations.size,4);
console.log('PASS: front/back/left/right heading, real rear row, four distinct prayer and dance assets, disjoint prayer/dance frames, four unique tempos, one-shot prayer end');
