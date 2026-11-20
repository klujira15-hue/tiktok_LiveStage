/* Temple fair ambient snack animation; no gifts, viewers or audio are fabricated. */
(function(g){'use strict';
 function eligible(a){return !!(a.ambient||a.ambientVisit)&&!a.airborne&&a.layer==='ground'&&!a.departing;}
 function sample(a,time){const t=(Math.max(0,time)+(a.id||0)*1733)%21000,phase=t%7000,back=String(a.facing||'').startsWith('back');let lift=0;if(!back&&phase>1300&&phase<4000){const u=(phase-1300)/2700;lift=Math.sin(Math.PI*u)**2;}return{lift,balls:Math.max(0,3-Math.floor(t/7000)-(phase>2650?1:0)),back,biting:!back&&phase>2450&&phase<2900};}
 function draw(c,a,h,time){if(!eligible(a))return false;const s=sample(a,time),mirror=a.facing==='left'||String(a.facing).endsWith('-left')?-1:1,swing=a.moving?Math.sin((a.walkTime||0)/180)*.014:Math.sin((time+a.id*233)/600)*.006;
  const rig=[{shoulder:.56,carry:.38,mouth:.68},{shoulder:.60,carry:.40,mouth:.70},{shoulder:.71,carry:.49,mouth:.82},{shoulder:.68,carry:.47,mouth:.76}][a.character%4];
  c.save();c.scale(mirror,1);const shoulder={x:h*.09,y:-h*rig.shoulder},elbow={x:h*(.19+s.lift*.03),y:h*(-rig.shoulder+.13-s.lift*.10)},hand={x:h*(s.back?.24:.19),y:h*(-rig.carry-s.lift*(rig.mouth-.04-rig.carry)+swing)};
  c.lineCap='round';c.lineJoin='round';c.strokeStyle='#f4c7a4';c.lineWidth=h*.047;c.beginPath();c.moveTo(shoulder.x,shoulder.y);c.lineTo(elbow.x,elbow.y);c.lineTo(hand.x,hand.y);c.stroke();
  const sleeve=a.character%4===1?.12:.53;c.strokeStyle=['#e9b634','#69b87c','#dc7792','#a94e74'][a.character%4];c.lineWidth=h*.061;c.beginPath();c.moveTo(shoulder.x,shoulder.y);c.lineTo(shoulder.x+(elbow.x-shoulder.x)*sleeve,shoulder.y+(elbow.y-shoulder.y)*sleeve);c.stroke();
  c.fillStyle='#f4c7a4';c.beginPath();c.ellipse(hand.x,hand.y,h*.032,h*.027,-.35,0,Math.PI*2);c.fill();
  const dx=-h*.16*s.lift,dy=-h*(.25-.21*s.lift);c.strokeStyle='#a66f35';c.lineWidth=Math.max(1.2,h*.012);c.beginPath();c.moveTo(hand.x-dx*.16,hand.y-dy*.16);c.lineTo(hand.x+dx,hand.y+dy);c.stroke();
  for(let i=0;i<s.balls;i++){const f=.34+i*.25,x=hand.x+dx*f,y=hand.y+dy*f,r=h*.037;c.fillStyle='#a84922';c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();c.fillStyle='#e6a464';c.beginPath();c.arc(x-r*.13,y-r*.2,r*.75,0,Math.PI*2);c.fill();c.strokeStyle='#ae3f1d';c.lineWidth=Math.max(1,h*.012);c.beginPath();c.moveTo(x-r*.5,y+r*.15);c.lineTo(x+r*.5,y-r*.1);c.stroke();}
  c.restore();return true;
 }
 function render(c,a,h,time,base){if(!eligible(a)){base();return;}const mirror=a.facing==='left'||String(a.facing).endsWith('-left')?-1:1,shoulder=[.56,.60,.71,.68][a.character%4],carry=[.38,.40,.49,.47][a.character%4];c.save();c.beginPath();c.rect(-h*2,-h*2,h*4,h*4);const points=[[.085,-shoulder-.035],[.34,-shoulder-.035],[.34,-carry+.15],[.115,-carry+.15],[.085,-shoulder+.13]];c.moveTo(points[0][0]*h*mirror,points[0][1]*h);for(const[x,y]of points.slice(1))c.lineTo(x*h*mirror,y*h);c.closePath();c.clip('evenodd');base();c.restore();draw(c,a,h,time);}
 const api={eligible,sample,draw,render};g.FairSnack=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
