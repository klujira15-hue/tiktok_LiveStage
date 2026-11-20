(function(g){'use strict';const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),ease=v=>{v=clamp(v);return v*v*(3-2*v);};
class OfferingFX{
 constructor(image,onCue=()=>{},lotusImage=null){this.image=image;this.lotusImage=lotusImage;this.onCue=onCue;this.items=[];this.seen=new Set();this.events=[];}
 start(a,time){const key=a.ticketId||'actor-'+a.id+'-'+a.since;if(this.seen.has(key))return;this.seen.add(key);const h=(68+a.pos.y*22)*1.43;this.items.push({key,userId:a.userId,name:a.name,slot:a.slot||0,seed:[...String(key)].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0),kind:a.activity,start:time,x:a.pos.x*1080,y:a.pos.y*1920-h*.50,offered:false});this.onCue('offering');}
 pause(ms){for(const e of this.items)e.start+=ms;}
 update(time){for(const e of this.items){if(!e.offered&&time-e.start>=4500){e.offered=true;this.events.push({type:'offered',ticketId:e.key,kind:e.kind,userId:e.userId,time});this.onCue('offered');}}this.items=this.items.filter(e=>time-e.start<(e.kind==='sangha'?11500:8500));}
 glow(c,x,y,r,a){const gr=c.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(255,229,150,'+a+')');gr.addColorStop(.4,'rgba(244,175,55,'+(a*.5)+')');gr.addColorStop(1,'rgba(255,191,60,0)');c.fillStyle=gr;c.fillRect(x-r,y-r,r*2,r*2);}
 drawBack(c,time){for(const e of this.items){const age=time-e.start;if(age<2300)continue;const a=ease((age-2300)/1000)*(1-ease((age-10000)/1200));c.save();c.globalAlpha=a;this.glow(c,215,610,285,.40);c.globalCompositeOperation='lighter';for(let i=0;i<7;i++){const x=95+i*38,w=6+i%3*2,gr=c.createLinearGradient(x,270,x,690);gr.addColorStop(0,'rgba(255,226,142,0)');gr.addColorStop(1,'rgba(255,222,124,.22)');c.fillStyle=gr;c.beginPath();c.moveTo(x-w,290);c.lineTo(x+w,290);c.lineTo(x+60,690);c.lineTo(x-60,690);c.fill();}c.restore();}}

 lotusPlan(e,age){const frac=v=>v-Math.floor(v),seed=(e.seed%997)/997,tx=215+(e.slot%2)*58,ty=665,out=[];
  for(let i=0;i<36;i++){const delay=Math.floor(i/12)*380,u=(age-4400-delay)/2800;if(u<=0||u>=1)continue;const q=ease(Math.min(1,u/.85)),targetX=55+frac(i*.618034+seed)*970,targetY=245+frac(i*.414214+seed*.7)*860,cx=(tx+targetX)/2,cy=Math.min(ty,targetY)-110-(i%4)*35,x=(1-q)*(1-q)*tx+2*(1-q)*q*cx+q*q*targetX,y=(1-q)*(1-q)*ty+2*(1-q)*q*cy+q*q*targetY+u*u*95,size=(58+i%5*17)*ease(u/.16)*(1-u*.18),dx=Math.max(105-x,0,x-280),dy=Math.max(300-y,0,y-535),clearance=Math.hypot(dx,dy),alpha=Math.sin(u*Math.PI)**.55*.94*clamp(clearance/(size*.65));out.push({x,y,size,alpha,rotation:Math.sin(i*1.7+u*4)*.32});}
  return out;
 }
 lotusSprite(c,x,y,width,rotation=0){if(!this.lotusImage)return;const height=width*this.lotusImage.height/this.lotusImage.width;c.save();c.translate(x,y);c.rotate(rotation);c.drawImage(this.lotusImage,-width/2,-height/2,width,height);c.restore();}
 lotusPetal(c,x,y,size,rotation,index){c.save();c.translate(x,y);c.rotate(rotation);c.fillStyle=index%3?'#f7aed5':'#ffe0ed';c.strokeStyle='rgba(255,229,168,.65)';c.lineWidth=.8;c.beginPath();c.moveTo(0,-size);c.bezierCurveTo(size*.85,-size*.3,size*.58,size*.8,0,size);c.bezierCurveTo(-size*.58,size*.8,-size*.85,-size*.3,0,-size);c.fill();c.stroke();c.restore();}
 drawLotus(c,e,time){if(!this.lotusImage)return;const age=time-e.start,fade=1-ease((age-7400)/1100),tx=215+(e.slot%2)*58,ty=665;c.save();c.globalAlpha=fade;
  if(age>=1800&&age<4400){const q=ease((age-1800)/1400);this.glow(c,e.x,e.y-25,70+q*90,.28*q);for(let i=0;i<12;i++){const a=i*Math.PI/6+age/700,r=45+(1-q)*80;this.lotusPetal(c,e.x+Math.cos(a)*r,e.y-25+Math.sin(a)*r*.55,5+q*3,a,i);}}
  if(age>=3200){const q=ease((age-3200)/1300),x=e.x+(tx-e.x)*q,y=e.y+(ty-55-e.y)*q-Math.sin(q*Math.PI)*45;this.lotusSprite(c,x,y,78+q*122);}
  if(age>=4400){const reveal=ease((age-4400)/550);this.glow(c,tx,ty-35,230,.4*reveal);c.save();c.translate(tx,ty);c.scale(1,.24);c.strokeStyle='#ffd98b';c.lineWidth=4;c.beginPath();c.arc(0,0,85+reveal*135,0,Math.PI*2);c.stroke();c.lineWidth=1.5;c.beginPath();c.arc(0,0,110+reveal*150,0,Math.PI*2);c.stroke();c.restore();
   for(const flower of this.lotusPlan(e,age)){c.globalAlpha=fade*flower.alpha;this.lotusSprite(c,flower.x,flower.y,flower.size,flower.rotation);}
   for(let i=0;i<84;i++){const delay=(i%7)*85,u=(age-4400-delay)/3500;if(u<=0||u>=1)continue;const seed=(e.seed%101)/101,x=25+((i*.618034+seed)%1)*1030+Math.sin(u*5+i)*25,y=160+u*(1020+i%4*85)+(i%5)*30,dx=Math.max(105-x,0,x-280),dy=Math.max(300-y,0,y-535);if(Math.hypot(dx,dy)<22)continue;c.globalAlpha=fade*Math.sin(u*Math.PI)*.85;this.lotusPetal(c,x,y,9+i%4*3,u*5+i,i);}
   for(let i=0;i<9;i++){const q=ease((age-4700-i*70)/450);if(q<=0)continue;c.globalAlpha=fade*.83*q;this.lotusSprite(c,55+i*55,750+(i%2)*26,60*q,Math.sin(i)*.08);}
   for(let i=0;i<36;i++){const u=((age-4400)/1400+i*.137)%1,angle=i*2.399;c.globalAlpha=fade*(1-u)*.75;c.fillStyle='#fff1b6';const x=tx+Math.cos(angle)*(55+u*210),y=ty-20+Math.sin(angle)*(35+u*140)-u*90;c.fillRect(x-2,y-6,4,12);c.fillRect(x-6,y-2,12,4);}
   c.globalAlpha=fade;c.shadowColor='#1a1b30';c.shadowBlur=9;c.fillStyle='rgba(36,24,48,.9)';c.strokeStyle='#f0c77f';c.lineWidth=2;const by=500+(e.slot%2)*96;c.beginPath();c.roundRect(310,by,480,86,20);c.fill();c.stroke();c.textAlign='center';c.font='bold 29px sans-serif';c.fillStyle='#ffe1ed';c.fillText('🪷 โปรยดอกบัวถวายพระ',550,by+35,450);c.font='23px sans-serif';c.fillStyle='#ffe7b7';c.fillText('คุณ'+e.name+' · บุปผาบูชา ขอให้สมหวัง',550,by+69,450);
  }c.restore();
 }

 drawFront(c,time){for(const e of this.items){if(e.kind==='lotus'&&this.lotusImage){this.drawLotus(c,e,time);continue;}const age=time-e.start,fade=1-ease((age-(e.kind==='sangha'?10000:7300))/1200);if(age<3200)continue;const q=ease((age-3200)/1300),tx=245,ty=657,x=e.x+(tx-e.x)*q,y=e.y+(ty-e.y)*q-Math.sin(q*Math.PI)*45;
  c.save();c.globalAlpha=fade;const reveal=ease((age-4500)/700);this.glow(c,tx,ty-70,140+reveal*80,reveal*.6);
  if(e.kind==='sangha'){const width=76+q*134,h=width*this.image.height/this.image.width;c.drawImage(this.image,x-width/2,y-h,width,h);}else{c.save();c.translate(x,y-45);c.strokeStyle='#52ab62';c.lineWidth=5;c.beginPath();c.moveTo(0,25);c.lineTo(0,-10);c.stroke();for(let i=-2;i<=2;i++){c.fillStyle=i%2?'#f4a4d2':'#ffd5e9';c.beginPath();c.ellipse(i*9,-24,13,32,i*.28,0,Math.PI*2);c.fill();}c.restore();}
  if(age>=4500){c.save();c.translate(tx,ty);c.scale(1,.32);c.strokeStyle='rgba(255,226,139,'+(fade*.8)+')';c.lineWidth=4;c.beginPath();c.arc(0,0,75+reveal*115,0,Math.PI*2);c.stroke();c.lineWidth=1.5;c.beginPath();c.arc(0,0,95+reveal*115,0,Math.PI*2);c.stroke();c.restore();
   for(let i=0;i<48;i++){const phase=((age-4500)/1800+i*.193)%1,angle=i*2.399,rad=30+phase*195,px=tx+Math.cos(angle)*rad,py=ty-55+Math.sin(angle)*rad*.62-phase*80;c.globalAlpha=fade*(1-phase)*.85;c.fillStyle=i%3?'#ffe6a1':'#fff6db';c.save();c.translate(px,py);c.rotate(age/700+i);c.fillRect(-2,-7,4,14);c.fillRect(-7,-2,14,4);c.restore();}
   for(let i=0;i<16;i++){const t=((age-4500)/2600+i*.137)%1;c.globalAlpha=fade*Math.sin(t*Math.PI)*.7;c.fillStyle=i%2?'#ed98bf':'#ffe0a1';c.beginPath();c.ellipse(40+i*24+Math.sin(t*5+i)*24,380+t*410,6,11,t*3+i,0,Math.PI*2);c.fill();}
   c.globalAlpha=fade;c.shadowColor='#111d31';c.shadowBlur=10;c.fillStyle='rgba(22,30,46,.9)';c.strokeStyle='#efc879';c.lineWidth=2;c.beginPath();c.roundRect(315,500,460,92,18);c.fill();c.stroke();c.textAlign='center';c.font='bold 29px sans-serif';c.fillStyle='#ffe4a3';c.fillText(e.kind==='sangha'?'🧺 ถวายสังฆทาน':'🪷 ถวายดอกบัว',545,536,430);c.font='24px sans-serif';c.fillStyle='#fff4d3';c.fillText('คุณ'+e.name+' · ขอให้มีความสุข สมหวัง',545,572,425);
  }c.restore();
 }}
}
g.FairOfferingFX={OfferingFX};if(typeof module!=='undefined')module.exports={OfferingFX};
})(typeof window!=='undefined'?window:globalThis);

