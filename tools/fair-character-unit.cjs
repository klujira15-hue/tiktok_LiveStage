const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=process.env.LIVESTAGE_TEST_ROOT||path.resolve(__dirname,'..'),dir=path.join(root,'src/public/characters/fair-v1');
const {removeGreen,frameBounds,timeline}=require(path.join(dir,'animator.js'));
const samples=new Uint8ClampedArray([0,255,0,255,34,180,170,255,245,184,137,255,240,190,40,255,30,22,19,255]);removeGreen(samples);
assert.equal(samples[3],0);for(const i of [7,11,15,19])assert.equal(samples[i],255,'Keep turquoise, skin, gold and hair opaque');
const pixels=new Uint8ClampedArray(8*4*4);for(let row=0;row<2;row++)for(let col=0;col<4;col++)pixels[((row*2)*8+col*2)*4+3]=255;
const boxes=frameBounds(pixels,8,4);assert.equal(boxes.length,8);for(let i=0;i<8;i++){assert(boxes[i].w>0&&boxes[i].h>0);assert.equal(Math.floor(boxes[i].x/2),i%4);assert.equal(Math.floor(boxes[i].y/2),Math.floor(i/4));}
assert.equal(timeline([2,5],0,400).frame,2);assert.equal(timeline([2,5],400,400).frame,5);assert.equal(timeline([2,5],800,400).frame,2);
const m=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json')));assert.equal(m.characters.length,4);for(const c of m.characters){const b=fs.readFileSync(path.join(dir,c.source));assert.equal(crypto.createHash('sha256').update(b).digest('hex'),c.sha256);assert(c.actions.dance);for(const state of Object.values(c.actions)){assert(state.step>0);assert(state.frames.every(f=>Number.isInteger(f)&&f>=0&&f<8));}}
new vm.Script(fs.readFileSync(path.join(dir,'preview.js'),'utf8'));
console.log(JSON.stringify({ok:true,characters:4,poses:32,checks:['green removed','turquoise costume, skin, gold and hair preserved','eight frames remain within their cells','timelines loop','original sheet hashes match','all actions reference existing frames','preview syntax valid']}));
