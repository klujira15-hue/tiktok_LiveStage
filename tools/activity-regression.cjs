const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const dir=path.resolve(__dirname,'../src/public/characters/fair-v1');
const A=require(dir+'/activity-runtime.js');
assert.equal(A.sample('lantern',2999).frame,8);assert.equal(A.sample('lantern',3000).frame,9);assert(A.sample('lantern',3000).released);
assert.equal(A.sample('krathong',2999).frame,10);assert.equal(A.sample('krathong',3000).frame,11);
assert.equal(A.sample('lantern',9000,false).released,false);assert.equal(A.sample('lantern',9000,false).frame,0);
assert.equal(A.sample('rise',1000,false).frame,0);assert.equal(A.sample('sit',99999,false).frame,2);
assert.equal(A.sample('pray',1000).frame,1);assert.equal(A.sample('stand',1000).frame,0);
assert.equal(Object.keys(A.zoneActions).length,7);for(const action of Object.values(A.zoneActions)){assert(A.definitions[action]);for(const f of A.definitions[action].frames)assert(f>=0&&f<12);}
const m=JSON.parse(fs.readFileSync(dir+'/manifest.json'));for(const c of m.characters){assert(fs.existsSync(dir+'/'+c.activities.source));assert.equal(c.activities.columns*c.activities.rows,12);}
console.log('PASS: seven destinations, seated hold, rise-to-stand, empty hands after release, one-shot release without duplicate props, four activity atlases');
