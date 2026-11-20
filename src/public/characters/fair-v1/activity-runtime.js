/* Temple fair activity poses and timing; no LIVE events or account state. */
(function(global){
 'use strict';
 const definitions={
  ramwong1:{label:'รำวง · ท่า 1',frames:[4]},ramwong2:{label:'รำวง · ท่า 2',frames:[5]},ramwong3:{label:'รำวง · ท่า 3',frames:[6]},ramwong4:{label:'รำวง · ท่า 4',frames:[7]},
  stand:{label:'ยืนรอ / ต่อคิว',frames:[0]},pray:{label:'ไหว้เฉพาะตัว',frames:[3,1,3,0]},
  sit:{label:'นั่งกระเช้าชิงช้า',frames:[2]},rise:{label:'ลุกขึ้นยืน',frames:[3,0]},
  browse:{label:'ยืนชมร้านค้า',frames:[0]},festivalDance:{label:'รำวงบนเวที',frames:[4,5]},
  sparkler:{label:'จุดและถือไฟเย็น',frames:[6,7]},lantern:{label:'ถือและปล่อยโคม',frames:[8,9]},
  krathong:{label:'ก้มลอยกระทง',frames:[10,11]}
 };
 const zoneActions={prayer:'pray',wheel:'sit',shop:'browse',dance:'festivalDance',sparklers:'sparkler',lantern:'lantern',water:'krathong'};
 function sample(action,time,loop=true){
  const t=Math.max(0,loop?time%8000:time);
  if(!definitions[action])return null;
  let frame=0;
  if(action==='pray')frame=t<500?3:t<6000?1:t<6600?3:0;
  else if(action==='sit')frame=2;
  else if(action==='rise')frame=t<650?3:0;
  else if(action==='festivalDance')frame=4+(Math.floor(t/600)%2);
  else if(action==='sparkler')frame=6+(Math.floor(t/900)%2);
  else if(action==='lantern')frame=t<3000?8:t<7400?9:0;
  else if(action==='krathong')frame=t<3000?10:t<7400?11:3;
  return{frame,time:t,released:t>=3000&&t<7400,flight:Math.max(0,Math.min(1,(t-3000)/4400))};
 }
 function sampleSignature(meta,action,time,loop=true){
  const spec=action==='pray'?meta.prayer:meta.dance,frames=spec.frames,durations=spec.durations,total=durations.reduce((a,b)=>a+b,0);
  let t=Math.max(0,time);if(loop||action!=='pray')t%=total;else t=Math.min(t,total-.001);
  let i=0;while(i<frames.length-1&&t>=durations[i]){t-=durations[i];i++;}
  return{frame:frames[i],time:Math.max(0,time),released:false,flight:0};
 }
 function drawLantern(c,x,y,size){
  c.save();c.translate(x,y);const g=c.createLinearGradient(-size/2,0,size/2,0);g.addColorStop(0,'#de752b');g.addColorStop(.5,'#ffe1a0');g.addColorStop(1,'#dc702c');c.fillStyle=g;c.beginPath();c.roundRect(-size/2,-size*.75,size,size*1.2,size*.15);c.fill();c.strokeStyle='#edb765';c.lineWidth=1;c.stroke();c.fillStyle='#fff0b5';c.beginPath();c.ellipse(0,size*.45,size*.37,size*.1,0,0,Math.PI*2);c.fill();c.restore();
 }
 function drawKrathong(c,x,y,size){
  c.save();c.translate(x,y);c.fillStyle='#39844c';c.beginPath();c.ellipse(0,0,size*.6,size*.22,0,0,Math.PI*2);c.fill();for(let i=0;i<7;i++){const a=i*Math.PI*2/7;c.fillStyle=i%2?'#f5a2ca':'#e472ab';c.beginPath();c.ellipse(Math.cos(a)*size*.25,Math.sin(a)*size*.08-size*.12,size*.14,size*.10,a,0,Math.PI*2);c.fill();}c.fillStyle='#fff0bd';c.fillRect(-size*.025,-size*.47,size*.05,size*.30);c.fillStyle='#ffc656';c.beginPath();c.ellipse(0,-size*.5,size*.055,size*.11,0,0,Math.PI*2);c.fill();c.restore();
 }
 function draw(c,p,{x,y,height,time,action,direction=1,facing=null,alpha=1,shadow=true,loop=true,effects=true}){
  const signatureAction=p.signature?(['pray','wai'].includes(action)?'pray':(['festivalDance','dance'].includes(action)||/^ramwong[1-4]$/.test(action))?'festivalDance':null):null;
  const state=signatureAction?sampleSignature(p.meta.signature,signatureAction,time,loop):sample(action,time,loop);
  if(signatureAction&&/^ramwong[1-4]$/.test(action))state.frame=3+Number(action.at(-1));
  const pack=signatureAction?p.signature:p.activities;if(!state||!pack)return false;
  const f=pack.frames[state.frame],scale=height/pack.height;
  c.save();c.globalAlpha=alpha;
  if(shadow){c.fillStyle='rgba(0,0,0,.16)';c.beginPath();c.ellipse(x,y+2,height*.15,height*.03,0,0,Math.PI*2);c.fill();}
  c.translate(x,y);c.scale(signatureAction==='pray'?(facing==='back-right'?-1:1):(direction<0?-1:1),1);
  // Each pose retains standing anatomical scale; seated/kneeling figures stay shorter.
  c.drawImage(pack.canvas,f.x,f.y,f.w,f.h,-f.w*scale/2,-f.h*scale,f.w*scale,f.h*scale);
  if(action==='sparkler'&&state.time>700){
   const tip=p.meta.activities.sparklerTips?.[state.frame]||pack.tips[state.frame]||[.34,-.72];const sx=tip[0]*height,sy=tip[1]*height;
   c.save();c.globalCompositeOperation='lighter';const glow=c.createRadialGradient(sx,sy,0,sx,sy,height*.46);glow.addColorStop(0,'rgba(255,245,172,.78)');glow.addColorStop(.35,'rgba(255,193,64,.26)');glow.addColorStop(1,'rgba(255,165,25,0)');c.fillStyle=glow;c.fillRect(sx-height*.46,sy-height*.46,height*.92,height*.92);c.lineWidth=Math.max(1.3,height*.014);
   for(let i=0;i<42;i++){const angle=i*2.399+time*.002,phase=((time/520+i*.137)%1),r=height*(.065+phase*.31);c.globalAlpha=alpha*(1-phase*.8);c.strokeStyle=i%3?'#ffe49a':'#ffffff';c.beginPath();c.moveTo(sx+Math.cos(angle)*r*.24,sy+Math.sin(angle)*r*.24);c.lineTo(sx+Math.cos(angle)*r,sy+Math.sin(angle)*r);c.stroke();}c.globalAlpha=alpha;c.fillStyle='#fffbea';c.beginPath();c.arc(sx,sy,height*.028,0,Math.PI*2);c.fill();c.restore();
  }
  if(effects&&action==='lantern'&&state.released){const t=state.flight;c.globalAlpha=alpha*(1-Math.max(0,(t-.65)/.35));drawLantern(c,Math.sin(t*3)*height*.07,-height*(.9+t*.5),height*(.19-t*.065));}
  if(effects&&action==='krathong'&&state.released){const t=state.flight;c.globalAlpha=alpha*(1-Math.max(0,(t-.75)/.25));drawKrathong(c,(p.meta.activities.releaseSide||1)*height*(.28+t*.18),height*(.015+t*.06),height*.20);}
  c.restore();return true;
 }
 const api={definitions,zoneActions,sample,sampleSignature,draw};global.FairActivities=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
