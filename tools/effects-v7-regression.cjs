const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),d=root+'/src/public/characters/fair-v1/',F=require(d+'effects-engine.js'),layout=JSON.parse(fs.readFileSync(root+'/src/public/scenes/temple-fair/layout.json'));
const people=Array.from({length:4},(_,i)=>({meta:{name:'character '+i,activities:{releaseSide:1}}}));
const e=new F.Engine(people,layout,{});assert(e.request(0,'wheel'));assert.equal(e.request(0,'water'),false);assert(e.request(3,'wheel'));assert(e.request(1,'water'));assert(e.request(2,'lantern'));assert.equal(e.request(9,'water'),false);
const exits=[];let n=0;for(let i=0;i<90*60;i++){e.update(1/60);for(const event of e.events.slice(n)){if(event.type==='unloaded'){assert.equal(e.actors[event.id].pos.x,F.cfg.wheel.board.x);assert.equal(e.actors[event.id].pos.y,F.cfg.wheel.board.y);exits.push(event.id);}}n=e.events.length;}
assert.deepEqual(exits.sort(),[0,3]);for(const id of [0,3])for(const type of ['queued','boarding','boarded','unloaded','exited'])assert.equal(e.events.filter(x=>x.id===id&&x.type===type).length,1,type+' once');
assert.equal(e.events.filter(x=>x.type==='krathongReleased').length,1);assert.equal(e.events.filter(x=>x.type==='lanternReleased').length,1);assert(e.actors.every(a=>a.state==='idle'));assert.equal(e.queue.length,0);assert(e.seats.every(a=>a===null));
for(const id of [0,3]){const t=type=>e.events.find(x=>x.id===id&&x.type===type).time;assert(t('unloaded')-t('boarded')>=23000);}
for(let a=0;a<Math.PI*4;a+=.2)for(let i=0;i<8;i++)assert.equal(F.bucket(a,i).tilt,0);
const k={type:'krathong',start:0,life:21000,x:.5,y:.85,waterX:.55,size:56,side:1},l={type:'lantern',start:0,life:15000,x:.7,y:.6,size:65};assert.equal(F.travel(k,0).y,k.y);assert(F.travel(k,1000).y>=F.cfg.water.line);assert(F.travel(l,7000).y<F.travel(l,3000).y);assert(F.travel(l,7000).size<F.travel(l,3000).size);
console.log(JSON.stringify({ok:true,checks:['queue and boarding','two complete rides return to boarding point','upright gondolas','one prop release per action','water landing and drift','lantern ascends and shrinks','actors reusable after activity']}));
