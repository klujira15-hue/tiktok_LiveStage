(function(g){'use strict';const TAU=Math.PI*2,STEP=TAU/8;
class ContinuousWheel{
 constructor(d,e,people,cfg){this.d=d;this.e=e;this.people=people;this.cfg=cfg;this.events=[];this.incoming=null;this.boardPoint={x:.765,y:.355};this.phase='rotating';this.exitSpots=d.zones.wheel.exitSlots.map(([x,y])=>({x,y}));this.berths=Array(this.exitSpots.length).fill(null);e.externalWheel=true;}
 log(type,a,extra={}){this.events.push({type,id:a?.id,ticketId:a?.ticketId,userId:a?.userId,time:this.e.time,angle:this.e.angle,...extra});if(this.events.length>1000)this.events.splice(0,200);}
 snapshot(){return{phase:'rotating',capacity:8,occupied:this.e.seats.filter(Boolean).length,seats:this.e.seats.map(a=>a?.id??null),members:this.e.seats.filter(Boolean).map(a=>a.id),waiting:this.d.actors.filter(a=>a.zone==='wheel'&&['waiting','entering','arriving','wheelReady','wheelApproach','wheelAtDock'].includes(a.state)).length,incoming:this.incoming?.id??null,round:Math.floor(this.e.angle/TAU)};}
 foot(angle,i){const t=angle+i*STEP;return{x:this.cfg.x+Math.cos(t)*this.cfg.rx,y:this.cfg.y+Math.sin(t)*this.cfg.ry+this.cfg.size*.78/1920};}
 exitPath(a,pos,target){return this.d.plan({...a,pos,layer:'ground',airborne:false,scope:'wheel',target,targetLayer:'ground',legs:null});}
 unload(i,angle){const d=this.d,e=this.e,a=e.seats[i],pos=this.foot(angle,i);for(let berth=0;berth<this.exitSpots.length;berth++){if(this.berths[berth])continue;const path=this.exitPath(a,pos,this.exitSpots[berth]);if(!path)continue;this.berths[berth]=a;a.exitBerth=berth;a.exitReached=false;e.seats[i]=null;a.pos=pos;a.layer='ground';a.airborne=false;a.hidden=false;a.moving=false;a.state='wheelExit';d.served++;a.activityDone=true;d.intent(a,this.exitSpots[berth],'wheel','ground',()=>{a.exitReached=true;d.leave(a);});a.route=path;a.partialRoute=!!path.at(-1)?.partial;this.log('unloaded',a,{travelledAngle:angle-a.boardedAngle,seat:i});return true;}return false;}

 update(dt){const d=this.d,e=this.e;for(let i=0;i<this.berths.length;i++){const a=this.berths[i],p=this.exitSpots[i];if(a&&(a.state==='gone'||a.exitReached&&Math.hypot((a.pos.x-p.x)*1080,(a.pos.y-p.y)*1920)>d.config.gap*1.5)){this.berths[i]=null;delete a.exitBerth;}}const omega=TAU*1000/this.cfg.period;
  for(const a of d.actors)if(a.zone==='wheel'&&a.state==='active'){a.state='wheelReady';a.p=this.people[a.character%this.people.length];this.log('ready',a);}
  const before=e.angle,after=before+dt*omega;e.angle=after;
  const crossings=[];for(let i=0;i<8;i++){const k=Math.floor((before+i*STEP-Math.PI/2+1e-8)/TAU)+1,angle=k*TAU+Math.PI/2-i*STEP;if(angle<=after+1e-8)crossings.push({i,angle});}crossings.sort((a,b)=>a.angle-b.angle);
  for(const {i,angle}of crossings){const rider=e.seats[i];
   if(rider&&angle-rider.boardedAngle>=TAU-1e-6){if(!this.unload(i,angle)){rider.unloadDeadline=angle+STEP*.5;this.log('exitDeferred',rider,{seat:i});}}
   if(!e.seats[i]&&this.incoming?.state==='wheelAtDock'){
    const a=this.incoming;a.unloadDeadline=null;a.boardFrom={...a.pos};a.boardedAt=e.time;a.boardedAngle=angle;a.seat=i;a.state='riding';a.hidden=true;a.airborne=true;a.layer='air';a.pos=this.foot(angle,i);a.route=[];a.target=null;d.release(a,'slot');e.seats[i]=a;this.incoming=null;this.log('boarded',a,{seat:i});e.onCue('board');
   }
  }
  for(let i=0;i<8;i++){const rider=e.seats[i];if(rider){rider.pos=this.foot(after,i);if(rider.unloadDeadline&&after<=rider.unloadDeadline)this.unload(i,after);}}
  if(!this.incoming){const ready=d.actors.filter(a=>a.zone==='wheel'&&a.state==='wheelReady').sort((a,b)=>(a.queueOrder||a.id)-(b.queueOrder||b.id));for(const a of ready){const path=d.plan({...a,scope:'wheel',target:this.boardPoint,targetLayer:'ground',legs:null});if(!path)continue;let length=0,p=a.pos;for(const q of path){length+=Math.hypot((p.x-q.x)*1080,(p.y-q.y)*1920);p=q;}
    // Reserve the approach before a due passenger reaches the dock.
    let nextDue=Infinity;for(let i=0;i<8;i++){const rider=e.seats[i];if(!rider)continue;let angle=rider.boardedAngle+TAU;while(angle<=after+1e-8)angle+=TAU;nextDue=Math.min(nextDue,(angle-after)/omega);}
    if(nextDue<length/d.config.speed+.5)break;
    this.incoming=a;a.state='wheelApproach';d.intent(a,this.boardPoint,'wheel','ground',()=>{a.state='wheelAtDock';a.moving=false;this.log('atDock',a);});a.route=path;a.partialRoute=!!path.at(-1)?.partial;break;
   }}
 }
}
g.FairWheelRounds={ContinuousWheel,BatchWheel:ContinuousWheel};if(typeof module!=='undefined')module.exports=g.FairWheelRounds;
})(typeof window!=='undefined'?window:globalThis);
