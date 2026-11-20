/* Templefair choreography. Legacy preview actions retain their original banks. */
(function(global){
 'use strict';
 function sequence(person,action){
  if(action==='danceExtra'&&person.meta.danceShow)return person.meta.danceShow.phrases.map(p=>({...p,bank:'danceShow'}));
  const extra=person.meta.extraDance;if(!extra)return null;
  if(/^extra[1-4]$/.test(action)){const i=Number(action.at(-1))-1;return[{bank:'original',frame:extra.frames[i],ms:extra.durations[i],label:extra.poseNames[i]}];}
  const added=extra.frames.map((frame,i)=>({bank:'original',frame,ms:extra.durations[i],label:extra.poseNames[i]}));
  if(action==='danceExtra')return added;
  if(action==='danceMix'){const old=person.meta.signature.dance;return old.frames.map((frame,i)=>({bank:'signature',frame,ms:old.durations[i],label:'รำวง '+(i+1)})).concat(added);}
  return null;
 }
 function sample(person,action,time){
  const steps=sequence(person,action);if(!steps)return null;
  const total=steps.reduce((s,p)=>s+p.ms,0);
  // The stage owns the 30-second activity clock. Hold the finale at the boundary.
  let t=person.meta.danceShow&&action==='danceExtra'?Math.max(0,Math.min(total-.001,time)):((time%total)+total)%total;
  for(let i=0;i<steps.length;i++){
   const p=steps[i];if(t<p.ms){
    if(p.bank==='danceShow'){
     const move=person.meta.danceShow.moves[p.move],phase=(t%move.cycleMs)/move.cycleMs;
     return{...p,index:i,total,label:move.label,moveId:move.id,frame:move.frames[Math.floor(phase*move.frames.length)],phase,localTime:t};
    }
    return{...p,index:i,total};
   }t-=p.ms;
  }
  return{...steps[0],index:0,total};
 }
 function draw(c,p,{x,y,height,time,action,direction=1,alpha=1,shadow=true}){
  const state=sample(p,action,time);if(!state)return false;
  const pack=state.bank==='danceShow'?p.danceShow:state.bank==='signature'?p.signature:{canvas:p.canvas,frames:p.frames,height:p.height};
  if(!pack)throw Error('Missing dance bank '+state.bank);
  const f=pack.frames[state.frame],scale=height/pack.height;
  c.save();c.globalAlpha=alpha;if(shadow){c.fillStyle='rgba(0,0,0,.16)';c.beginPath();c.ellipse(x,y+2,height*.15,height*.03,0,0,Math.PI*2);c.fill();}
  c.translate(x,y);c.scale(direction<0?-1:1,1);
  // Keyframes carry the articulated dance. Small continuous weight shifts connect beats,
  // stay within the reserved stage slot, and differ for each character's movement style.
  if(state.bank==='danceShow'){
   const wave=Math.sin(state.phase*Math.PI*2),pulse=Math.sin(state.phase*Math.PI*4);
   const style=p.meta.id;
   if(style==='boy-strawhat'){c.translate(wave*height*.012,-Math.abs(pulse)*height*.008);c.rotate(wave*.012);}
   else if(style==='girl-thai'){c.translate(wave*height*.008,0);c.transform(1,0,wave*.012,1,0,0);}
   else if(style==='girl-pink'){c.rotate(wave*.009);}
   else if(style==='boy-plaid'){const tick=Math.round(wave*2)/2;c.translate(tick*height*.006,0);c.rotate(tick*.008);}
  }
  c.drawImage(pack.canvas,f.x,f.y,f.w,f.h,-f.w*scale/2,-f.h*scale,f.w*scale,f.h*scale);c.restore();return true;
 }
 const api={sequence,sample,draw};global.FairDanceExtras=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
