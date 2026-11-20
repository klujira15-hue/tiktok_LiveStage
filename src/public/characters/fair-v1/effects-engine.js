(function(global){
 'use strict';
 const TAU=Math.PI*2,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t,ease=t=>t*t*(3-2*t);
 const cfg={wheel:{x:.80,y:.215,rx:.135,ry:.105,size:115,seats:8,period:48000,board:{x:.80,y:.36}},water:{x:.50,y:.85,line:.866},lantern:{x:.76,y:.64}};
 function route(layout,from,to){const q=[[from]],seen=new Set([from]);while(q.length){const p=q.shift(),last=p.at(-1);if(last===to)return p.slice(1);for(const[a,b]of layout.edges){const n=a===last?b:b===last?a:null;if(n&&!seen.has(n)){seen.add(n);q.push([...p,n]);}}}return[];}
 function bucket(angle,i){const a=angle+i*TAU/cfg.wheel.seats;return{x:cfg.wheel.x+Math.cos(a)*cfg.wheel.rx,y:cfg.wheel.y+Math.sin(a)*cfg.wheel.ry,tilt:0};}
 function travel(effect,t){const u=clamp((t-effect.start)/effect.life),side=effect.side||1;
  if(effect.type==='krathong'){if(u<.045){const q=ease(u/.045);return{x:mix(effect.x,effect.waterX,q),y:mix(effect.y,.883,q),size:mix(effect.heldSize??effect.size,effect.size,q),alpha:1};}const q=(u-.045)/.955;return{x:effect.waterX+(effect.driftX!==undefined?q*effect.driftX:effect.laneX!==undefined?Math.sin(q*2.5)*.008:side*Math.sin(q*2.5)*.085),y:.883+q*.105+Math.sin(t/1200)*.0008,size:effect.size*(1+q*.22),alpha:1-clamp((q-.85)/.15)};}
  if(effect.type==='lantern'&&!effect.burst){return{x:effect.x,y:effect.y-u*(effect.y+.14),size:mix(effect.heldSize??effect.size,effect.size,ease(clamp(u/.06)))*(1-u*.5),alpha:1-clamp((u-.9)/.1)};}
  return{x:effect.burst?effect.x+Math.sin(u*3.5+effect.seed)*.025:mix(effect.x,.5,u)+Math.sin(u*3.5)*.025,y:effect.y-u*(effect.y+.14),size:effect.size*(1-u*.72),alpha:1-clamp((u-.8)/.2)};
 }
 function positions(effects,t){const list=effects.filter(e=>t>=e.start&&t-e.start<e.life).map(e=>({e,p:travel(e,t)}));
  const lanterns=list.filter(v=>v.e.type==='lantern').sort((a,b)=>b.p.y-a.p.y||b.e.id-a.e.id);
  for(let i=0;i<lanterns.length;i++){const upper=lanterns[i];upper.p.y=Math.min(upper.p.y,upper.e.displayY??Infinity);for(let j=0;j<i;j++){const lower=lanterns[j],minX=(upper.p.size+lower.p.size)/2+8,minY=global.FairFestivalFX?.propHeight?(global.FairFestivalFX.propHeight('lantern',upper.p.size,upper.e.variant)+global.FairFestivalFX.propHeight('lantern',lower.p.size,lower.e.variant))/2+32:Math.max(upper.p.size,lower.p.size)*1.5+20;if(Math.abs(upper.p.x-lower.p.x)*1080<minX&&lower.p.y>=upper.p.y)upper.p.y=Math.min(upper.p.y,lower.p.y-minY/1920);}upper.e.displayY=upper.p.y;}
  const group=list.filter(v=>v.e.type==='krathong').sort((a,b)=>a.p.x-b.p.x||a.e.id-b.e.id);
  for(let pass=0;pass<100;pass++){let changed=false;for(let i=0;i<group.length;i++)for(let j=i+1;j<group.length;j++){const a=group[i].p,b=group[j].p,dx=(b.x-a.x)*1080,dy=Math.abs(b.y-a.y)*1920,minX=(a.size+b.size)/2+8,minY=Math.max(a.size,b.size)*1.1+24;if(dy<minY&&Math.abs(dx)<minX){const push=(minX-Math.abs(dx))/2160+.0001;a.x=clamp(a.x-push,.045,.955);b.x=clamp(b.x+push,.045,.955);changed=true;}}if(!changed)break;}
  return new Map(list.map(v=>[v.e.id,v.p]));
 }
 class Engine{
  constructor(people,layout,assets,onCue=()=>{}){const N=global.FairNavigation||(typeof require==='function'?require('./navigation.js'):null),data=layout.navigation||(typeof require==='function'?require('../../scenes/temple-fair/navigation-v8.json'):null);this.navigation=new N.Navigator(data);this.people=people;this.layout=layout;this.assets=assets;this.onCue=onCue;this.time=0;this.effects=[];this.queue=[];this.angle=Math.PI/2;this.pauseUntil=0;this.seats=Array(8).fill(null);this.sky=null;this.burst=[];this.events=[];this.serial=0;this.actors=people.map((p,i)=>({p,id:i,name:p.meta.name,node:'entry',pos:{x:data.spawn[i][0],y:data.spawn[i][1]},layer:'ground',state:'idle',action:'stand',route:[],facing:'front',since:0,walk:0}));}
  request(index,type,name){const a=this.actors[index];if(!a||a.exitAt||a.state!=='idle'||!['wheel','water','lantern'].includes(type))return false;const target=this.navigation.goal(type==='water'?'water':type==='wheel'?'wheel':'lantern'),planned=this.navigation.plan(a.pos,target,a.layer,target.layer);if(!planned)return false;a.name=(name||a.p.meta.name).slice(0,40);a.type=type;a.state='walk';a.route=planned;a.emitted=false;return true;}
  log(type,a){this.events.push({type,id:a?.id,time:this.time});}
  arrive(a){if(a.type==='wheel'){a.state='queue';a.action='stand';this.queue.push(a);this.log('queued',a);}else{a.state='prepare';a.action=a.type==='water'?'krathong':'lantern';a.since=this.time;a.facing='front';this.log('prepare',a);}}
  update(dt){this.time+=dt*1000;const t=this.time;if(this.externalWheel){this.effects=this.effects.filter(e=>t-e.start<e.life);this.burst=this.burst.filter(e=>t-e.start<e.life);if(this.sky&&t-this.sky.start>this.sky.duration)this.sky=null;return;}
   for(const a of this.actors){
    if(a.state==='walk'){
     const before=a.pos,result=this.navigation.advance(a.pos,a.layer,a.route,150*dt);a.pos=result.position;a.layer=result.layer;a.walk+=result.travelled/150*1000;
     if(result.travelled>.001)a.facing=global.FairCharacters?global.FairCharacters.selectFacing((a.pos.x-before.x)*1080,(a.pos.y-before.y)*1920,a.facing):'front';
     if(result.blocked){a.state='idle';a.action='stand';this.log('blocked',a);}
     else if(result.done){if(a.type==='exit'){a.state='idle';a.action='stand';this.log('exited',a);}else this.arrive(a);}
    }
    if(a.state==='prepare'){
     const age=t-a.since;if(age>=3000&&!a.emitted){a.emitted=true;const h=105+a.pos.y*105,side=a.p.meta.activities.releaseSide||1;
      const type=a.type==='water'?'krathong':'lantern';this.effects.push({id:++this.serial,type,name:a.name,start:t,life:type==='krathong'?35000:15000,x:a.pos.x+(type==='krathong'?side*h*.28/1080:0),y:a.pos.y-(type==='krathong'?h*.12:h*.82)/1920,waterX:a.pos.x+side*.055,side,size:type==='krathong'?56:65});this.log(type+'Released',a);this.onCue(type);
     }if(age>7800){a.state='recover';a.action='rise';a.since=t;}
    }else if(a.state==='recover'&&t-a.since>700){a.state='idle';a.action='stand';}
    if(a.state==='boarding'){const step=this.navigation.advance(a.pos,a.layer,a.boardPath,190*dt);a.pos=step.position;a.layer=step.layer;a.walk+=step.travelled/190*1000;}
    if(a.state==='boarding'&&t>=a.boardEnd&&!a.boardPath.length){a.state='riding';a.rideAngle=this.angle;this.seats[a.seat]=a;this.log('boarded',a);this.onCue('board');}
   }
   if(t>=this.pauseUntil){const before=this.angle;this.angle+=dt*TAU*1000/cfg.wheel.period;
    for(let i=0;i<8;i++){const b=Math.floor((before+i*TAU/8-Math.PI/2+1e-8)/TAU),n=Math.floor((this.angle+i*TAU/8-Math.PI/2+1e-8)/TAU);if(n<=b)continue;
     const passenger=this.seats[i],target=n*TAU+Math.PI/2-i*TAU/8;
     if(passenger&&this.angle-passenger.rideAngle>=TAU-.02){this.angle=target;this.pauseUntil=t+1000;this.seats[i]=null;passenger.state='recover';passenger.action='rise';passenger.since=t;passenger.pos={...cfg.wheel.board};passenger.node='wheelBoard';passenger.exitAt=t+750;this.log('unloaded',passenger);break;}
     if(!passenger&&this.queue.length){this.angle=target;this.pauseUntil=t+1300;const a=this.queue.shift();a.boardPath=this.navigation.plan(a.pos,cfg.wheel.board,a.layer,'ground');if(!a.boardPath){this.queue.unshift(a);break;}let length=0,prev=a.pos;for(const p of a.boardPath){length+=Math.hypot((p.x-prev.x)*1080,(p.y-prev.y)*1920);prev=p;}a.state='boarding';a.from={...a.pos};a.boardSince=t;a.boardEnd=t+Math.max(1200,length/190*1000);this.pauseUntil=a.boardEnd+100;a.seat=i;this.log('boarding',a);break;}
    }
   }
   for(const a of this.actors){if(a.state==='riding'){const p=bucket(this.angle,a.seat);a.pos={x:p.x,y:p.y+cfg.wheel.size*.78/1920};}if(a.exitAt&&t>=a.exitAt){a.exitAt=null;a.state='walk';a.type='exit';a.layer='ground';a.route=this.navigation.plan(a.pos,this.navigation.goal('exit'),'ground','ground')||[];}}
   for(let i=0;i<this.queue.length;i++){const a=this.queue[i],p=this.layout.nodes.wheelQueue;if(a.queueRank!==i){a.queueRank=i;a.queuePath=this.navigation.plan(a.pos,{x:p[0]-i*.045,y:p[1]+i*.025},a.layer,'ground')||[];}const step=this.navigation.advance(a.pos,a.layer,a.queuePath,65*dt);a.pos=step.position;a.layer=step.layer;a.queueWalking=step.travelled>.001;a.walk+=step.travelled/65*1000;}
   this.effects=this.effects.filter(e=>t-e.start<e.life);this.burst=this.burst.filter(e=>t-e.start<e.life);if(this.sky&&t-this.sky.start>this.sky.duration)this.sky=null;
  }
  skyBurst(duration=14000,name){this.sky={start:this.time,duration,name:name||this.actors[2]?.name||'ผู้ร่วมงาน'};this.burst=Array.from({length:20},(_,i)=>({type:'lantern',name:'',burst:true,seed:i,start:this.time+i*55,life:duration-700,x:.05+(i*.381966%1)*.9,y:.95+(i%4)*.12,variant:Math.floor(Math.random()*3),size:88+(i%5)*18}));this.onCue('lantern');}
  positions(){return positions(this.effects,this.time);}
  snapshot(){return{time:this.time,angle:this.angle,queue:this.queue.length,seats:this.seats.map(a=>a?.id??null),actors:this.actors.map(a=>({id:a.id,state:a.state,pos:{...a.pos},layer:a.layer,seat:a.seat})),effects:this.effects.map(e=>({type:e.type,id:e.id,userId:e.userId,ticketId:e.ticketId,...(this.positions().get(e.id)||travel(e,this.time))})),events:this.events.slice(),sky:!!this.sky};}
  prop(c,index,x,y,size,cell=false){const p=this.assets.props,rect=p.rects[index];if(cell){c.drawImage(p.image,rect.x,rect.y,rect.w,rect.h,x,y,size,size);return;}const f=p.tight[index],h=size*f.h/f.w;c.drawImage(p.image,f.x,f.y,f.w,f.h,x-size/2,y-h/2,size,h);}
  glow(c,x,y,r,alpha=.35){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(255,211,112,'+alpha+')');g.addColorStop(1,'rgba(255,181,61,0)');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
  wheel(c){const w=cfg.wheel,x=w.x*1080,y=w.y*1920,rx=w.rx*1080,ry=w.ry*1920;
   c.save();c.lineCap='round';c.strokeStyle='#f0c967';c.lineWidth=14;for(const side of [-1,1]){c.beginPath();c.moveTo(x,y);c.lineTo(x+side*100,y+ry+78);c.stroke();}c.strokeStyle='#b93232';c.lineWidth=8;for(const side of [-1,1]){c.beginPath();c.moveTo(x,y);c.lineTo(x+side*100,y+ry+78);c.stroke();}
   c.lineWidth=6;c.strokeStyle='#d35839';c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.stroke();c.lineWidth=2;c.strokeStyle='#ffe5a0';c.beginPath();c.ellipse(x,y,rx-5,ry-5,0,0,TAU);c.stroke();
   for(let i=0;i<8;i++){const p=bucket(this.angle,i);c.strokeStyle='#f4d994';c.lineWidth=3;c.beginPath();c.moveTo(x,y);c.lineTo(p.x*1080,p.y*1920);c.stroke();}
   for(let i=0;i<48;i++){const a=this.angle+i*TAU/48;c.fillStyle=['#fff0aa','#ffc8df','#bdffec'][Math.floor(this.time/220+i)%3];c.shadowColor=c.fillStyle;c.shadowBlur=8;c.beginPath();c.arc(x+Math.cos(a)*rx,y+Math.sin(a)*ry,2.5,0,TAU);c.fill();}
   c.fillStyle='#d64a32';c.beginPath();c.arc(x,y,21,0,TAU);c.fill();c.strokeStyle='#ffe099';c.lineWidth=5;c.stroke();c.fillStyle='#fff2ae';c.beginPath();c.arc(x,y,8,0,TAU);c.fill();c.restore();
   for(let i=0;i<8;i++){const p=bucket(this.angle,i),bx=p.x*1080-w.size/2,by=p.y*1920;this.prop(c,2,bx,by,w.size,true);const a=this.seats[i];if(a){const blend=a.boardFrom?clamp((this.time-a.boardedAt)/350):1;a.p.draw(c,{x:p.x*1080,y:by+w.size*.78,height:62,alpha:blend,time:0,action:'sit',shadow:false,effects:false});}this.prop(c,3,bx,by,w.size,true);}
  }
  actor(c,a){if(a.state==='riding')return;let x=a.pos.x*1080,y=a.pos.y*1920,height=a.displayHeight||105+a.pos.y*105,action=a.action,time=this.time-a.since;
   if(a.state==='walk'||a.queueWalking&&a.state==='queue'){action='walk';time=a.walk;}
   if(a.state==='boarding'){const p=bucket(this.angle,a.seat),u=ease(clamp((this.time-a.boardSince)/1200));x=a.pos.x*1080;y=a.pos.y*1920;height=mix(height,62,u);action=u>.7?'sit':'walk';time=a.walk+u*1200;}
   a.p.draw(c,{x,y,height,time,action,moving:a.state==='walk'||a.queueWalking&&a.state==='queue',facing:a.facing,loop:false,effects:false,shadow:a.state!=='boarding'});
  }
  floating(c,e,position){const t=this.time;if(t<e.start)return;const p=position||travel(e,t);if(global.FairFestivalFX){global.FairFestivalFX.floating(c,e,p,t);return;}const x=p.x*1080,y=p.y*1920;c.save();c.globalAlpha=p.alpha;
   if(e.type==='krathong'){
    const age=t-e.start;if(age>e.life*.045){c.save();c.beginPath();c.rect(0,cfg.water.line*1920,1080,1920);c.clip();c.strokeStyle='rgba(255,221,145,.45)';c.lineWidth=1.5;const r=12+(age%1800)/1800*20;c.beginPath();c.ellipse(x,y+12,r*1.7,r*.35,0,0,TAU);c.stroke();c.translate(x,y+32);c.scale(1,-.32);c.globalAlpha*=.24;this.prop(c,0,0,0,p.size);c.restore();}this.glow(c,x,y-15,45,.18);this.prop(c,0,x,y,p.size);
   }else{this.glow(c,x,y,p.size,.24);this.prop(c,1,x,y,p.size);}
   if(e.name){c.font='19px Thai,sans-serif';c.textAlign='center';c.fillStyle='#fff0c1';c.shadowColor='#251d18';c.shadowBlur=4;if(e.type==='lantern'&&e.slot!==undefined){c.textAlign=e.slot%2?'left':'right';c.fillText(e.name,x+(e.slot%2?1:-1)*(p.size*.55+4),y+6,170);}else c.fillText(e.name,x,y+p.size*.65+15);}c.restore();
  }
  draw(c){c.clearRect(0,0,1080,1920);c.drawImage(this.assets.background,0,0,1080,1920);this.wheel(c);for(const a of [...this.actors].sort((a,b)=>a.pos.y-b.pos.y))this.actor(c,a);for(const e of this.effects)this.floating(c,e);
   if(this.sky){const age=this.time-this.sky.start,alpha=Math.min(clamp(age/650),clamp((this.sky.duration-age)/650));c.save();c.globalAlpha=alpha;c.drawImage(this.assets.sky,0,0,1080,1920);for(const e of this.burst)this.floating(c,e);c.restore();}
   c.save();c.font='bold 36px Thai,sans-serif';c.textAlign='center';c.fillStyle='#ffe3a0';c.shadowColor='#162036';c.shadowBlur=10;c.fillText(this.sky?'ปล่อยโคมลอย':'งานวัด · ลอยกระทง',540,63);if(this.sky){c.font='bold 34px Thai,sans-serif';c.fillText(this.sky.name+'  ปล่อยโคมลอย',540,1360);}else{c.font='20px Thai,sans-serif';c.fillText('กระทง '+this.effects.filter(e=>e.type==='krathong').length+'  •  บนชิงช้า '+this.seats.filter(Boolean).length+'  •  คิว '+this.queue.length,540,99);}c.restore();
  }
 }
 const api={Engine,cfg,bucket,travel,route,positions};global.FairEffects=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
