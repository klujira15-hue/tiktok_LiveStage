const fs=require('node:fs'),assert=require('node:assert/strict');
const dir=require('node:path').resolve(__dirname,'../src/public/characters/fair-v1');
const {Character}=require(dir+'/animator.js');
const sheet={},frames=[0,1,2,3].map(i=>({x:i*100+25,y:20,w:50,h:180}));
const p=new Character({actions:{idle:{frames:[0],step:400}},walk:{step:160}},sheet,[frames[0]]);
p.walk={canvas:sheet,frames,height:180,baseline:200,cellW:100,cellH:220,row:0};
const calls=[];const c={save(){},restore(){},translate(...a){calls.push(['translate',...a]);},scale(...a){calls.push(['scale',...a]);},drawImage(...a){calls.push(['drawImage',...a]);},rotate(){throw Error('Walking torso must not rotate');}};
for(let i=0;i<5;i++){calls.length=0;p.draw(c,{x:300,y:500,height:180,time:i*160,action:'walk',direction:i%2?-1:1,shadow:false});const image=calls.find(a=>a[0]==='drawImage');assert.equal(image[2],(i%4)*100+25);assert.equal(image[6],-25);assert.equal(image[7],-180);assert.deepEqual(calls.find(a=>a[0]==='translate'),['translate',300,500]);assert.deepEqual(calls.find(a=>a[0]==='scale'),['scale',i%2?-1:1,1]);}
const m=JSON.parse(fs.readFileSync(dir+'/manifest.json'));assert.deepEqual(m.characters.map(c=>c.walk.row).sort(),[0,1,2,3]);for(const c of m.characters){assert.equal(c.walk.columns,4);assert.equal(c.walk.rows,4);assert(fs.existsSync(dir+'/'+c.walk.source));}
console.log('PASS: opposite facing, four phases, loop, fixed floor anchor, upright torso, four unique character rows');
