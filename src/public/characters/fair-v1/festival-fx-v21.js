(function(g){'use strict';
const TAU=Math.PI*2,clamp=v=>Math.max(0,Math.min(1,v));
let illustrated=null,artPromise=null;
 async function loadArt(src){if(artPromise)return artPromise;artPromise=(async()=>{const image=new Image();image.src=src;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const c=canvas.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0);const data=c.getImageData(0,0,canvas.width,canvas.height).data,split=Math.round(canvas.height*.42),rects=[];for(let row=0;row<2;row++)for(let col=0;col<3;col++){const x0=Math.round(col*canvas.width/3),x1=Math.round((col+1)*canvas.width/3),y0=row?split:0,y1=row?canvas.height:split;let left=x1,right=x0,top=y1,bottom=y0;for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(data[(y*canvas.width+x)*4+3]>80){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}if(right<=left||bottom<=top)throw Error('Empty prop atlas cell');rects.push({x:left,y:top,w:right-left+1,h:bottom-top+1});}illustrated={canvas,rects};return illustrated;})();return artPromise;}
 function propHeight(type,size,variant=0){if(!illustrated)return size*(type==='lantern'?1.4:.95);const f=illustrated.rects[(type==='lantern'?3:0)+((variant%3)+3)%3];return size*f.h/f.w;}
 function lanternOrigin(a,height,age){const lift=Math.max(0,Math.min(1,(age-2000)/1000)),smooth=lift*lift*(3-2*lift),bottom=a.pos.y*1920-height*(.92+smooth*.18);return{x:a.pos.x,y:(bottom-propHeight('lantern',48,a.variant??0)/2)/1920};}
 function heldLantern(c,a,height,age){if(a.zone!=='lantern'||a.state!=='active'||age>=3000)return;const p=lanternOrigin(a,height,age);prop(c,'lantern',p.x*1080,p.y*1920,48,a.variant??0,age);}
 function star(c,x,y,r,color='#fff3b1',angle=0){c.save();c.translate(x,y);c.rotate(angle);c.fillStyle=color;c.beginPath();for(let i=0;i<8;i++){const a=i*TAU/8,s=i%2?r*.23:r;c.lineTo(Math.cos(a)*s,Math.sin(a)*s);}c.closePath();c.fill();c.restore();}
function glow(c,x,y,r,color='255,201,90',alpha=.4){const f=c.createRadialGradient(x,y,0,x,y,r);f.addColorStop(0,`rgba(${color},${alpha})`);f.addColorStop(1,`rgba(${color},0)`);c.fillStyle=f;c.fillRect(x-r,y-r,r*2,r*2);}
// Vector game props remain crisp at both preview and 1080p output sizes.
function prop(c,type,x,y,size,variant=0,time=0){if(illustrated){const f=illustrated.rects[(type==='lantern'?3:0)+((variant%3)+3)%3],h=size*f.h/f.w;c.drawImage(illustrated.canvas,f.x,f.y,f.w,f.h,x-size/2,y-h/2,size,h);return;}c.save();c.translate(x,y);c.scale(size/100,size/100);const v=((variant%3)+3)%3;
 if(type==='lantern'){
  const colors=[['#e68c30','#fff0bf','#efa447'],['#dc628f','#ffe1df','#f19aba'],['#39a8a3','#edffdf','#7fd2ba']][v];
  glow(c,0,25,85,v===1?'255,159,188':'255,203,92',.32);
  const f=c.createLinearGradient(-48,0,48,0);f.addColorStop(0,colors[0]);f.addColorStop(.45,colors[1]);f.addColorStop(1,colors[2]);c.fillStyle=f;c.strokeStyle='#ffe3a1';c.lineWidth=2;
  c.beginPath();c.moveTo(-30,-67);c.bezierCurveTo(-62,-55,-49,24,-34,47);c.quadraticCurveTo(0,65,34,47);c.bezierCurveTo(49,24,62,-55,30,-67);c.quadraticCurveTo(0,-78,-30,-67);c.fill();c.stroke();
  c.save();c.globalAlpha=.25;c.strokeStyle='#975e35';c.lineWidth=1;for(const k of [-.7,-.35,0,.35,.7]){c.beginPath();c.moveTo(k*30,-67);c.bezierCurveTo(k*54,-22,k*48,24,k*34,49);c.stroke();}c.restore();
  c.strokeStyle='rgba(255,241,192,.85)';for(const yy of [-52,32]){c.beginPath();c.ellipse(0,yy,yy<0?38:38,6,0,0,TAU);c.stroke();}
  c.fillStyle='#b86321';c.beginPath();c.ellipse(0,48,34,10,0,0,TAU);c.fill();glow(c,0,49,31,'255,198,59',.9);
  c.fillStyle='#fff3ba';c.beginPath();c.moveTo(0,25);c.bezierCurveTo(-14,44,-13,54,0,56);c.bezierCurveTo(14,52,10,40,0,25);c.fill();
  c.strokeStyle='#b98546';c.lineWidth=1.4;c.beginPath();c.moveTo(-27,46);c.lineTo(27,46);c.stroke();
  c.save();c.globalAlpha=.65;for(let i=0;i<8;i++){const a=i*TAU/8;c.fillStyle='#e8b24d';c.beginPath();c.ellipse(Math.cos(a)*9,-12+Math.sin(a)*9,5,10,a+Math.PI/2,0,TAU);c.fill();}c.fillStyle='#fff3bb';c.beginPath();c.arc(0,-12,5,0,TAU);c.fill();c.restore();
 }else{
  const pink=v===0?'#f991c4':v===1?'#ffdc8c':'#d0b0ff',dark=v===0?'#bd407f':v===1?'#c77721':'#8258bb';
  glow(c,0,-15,85,v===2?'199,163,255':'255,205,107',.24);
  const base=c.createLinearGradient(0,5,0,31);base.addColorStop(0,'#82ad46');base.addColorStop(1,'#205d45');c.fillStyle=base;c.strokeStyle='#e5c566';c.lineWidth=2;c.beginPath();c.ellipse(0,16,49,18,0,0,TAU);c.fill();c.stroke();
  for(let i=0;i<12;i++){const a=i*TAU/12,xx=Math.cos(a)*37,yy=11+Math.sin(a)*11;c.save();c.translate(xx,yy);c.rotate(a*.25);c.fillStyle=i%2?'#4f9c55':'#2f7747';c.strokeStyle='#acd078';c.lineWidth=.8;c.beginPath();c.moveTo(-8,8);c.quadraticCurveTo(-15,-7,0,-22);c.quadraticCurveTo(14,-8,8,8);c.closePath();c.fill();c.stroke();c.restore();}
  for(let row=0;row<2;row++)for(let i=0;i<9;i++){const a=i*TAU/9+(row?.35:0),xx=Math.cos(a)*(row?15:29),yy=2+Math.sin(a)*(row?5:10);c.save();c.translate(xx,yy);c.rotate(Math.cos(a)*.55);const f=c.createLinearGradient(0,-28,0,13);f.addColorStop(0,'#fff3d8');f.addColorStop(.45,pink);f.addColorStop(1,dark);c.fillStyle=f;c.strokeStyle='rgba(255,230,173,.8)';c.lineWidth=.7;c.beginPath();c.moveTo(-10,9);c.bezierCurveTo(-20,-5,-7,-19,0,-29);c.bezierCurveTo(8,-16,19,-4,10,9);c.quadraticCurveTo(0,18,-10,9);c.fill();c.stroke();c.restore();}
  for(let i=-1;i<=1;i++){const xx=i*7;c.fillStyle='#c89b61';c.fillRect(xx-1,-48,2,36);c.strokeStyle='rgba(225,217,204,.4)';c.lineWidth=1;c.beginPath();c.moveTo(xx,-49);c.bezierCurveTo(xx-8,-61,xx+7,-66,xx,-78);c.stroke();}
  c.fillStyle='#fff3bc';c.fillRect(-3,-37,6,33);glow(c,0,-44,30,'255,201,77',.8);c.fillStyle='#fffbe0';c.beginPath();c.ellipse(0,-45,4,9+Math.sin(time/110),0,0,TAU);c.fill();
  for(let i=0;i<9;i++){const a=i*TAU/9;star(c,Math.cos(a)*40,9+Math.sin(a)*12,2,'#fff1ba');}
 }c.restore();}
function floating(c,e,p,time){const age=time-e.start,u=clamp(age/e.life),x=p.x*1080,y=p.y*1920;c.save();c.globalAlpha=p.alpha;
 if(e.type==='krathong'){
  c.save();c.beginPath();c.rect(0,1662,1080,258);c.clip();glow(c,x,y+18,p.size*1.2,'255,199,90',.27);for(let i=0;i<3;i++){const q=((age/2000+i/3)%1);c.strokeStyle=`rgba(255,229,155,${(1-q)*.6})`;c.lineWidth=1.8;c.beginPath();c.ellipse(x,y+p.size*.2,p.size*(.5+q*.7),p.size*(.10+q*.17),0,0,TAU);c.stroke();}c.save();c.translate(x,y+p.size*.6);c.scale(1,-.35);c.globalAlpha*=.24;prop(c,e.type,0,0,p.size,e.variant,time);c.restore();c.restore();
 }else{glow(c,x,y,p.size*1.1,'255,204,106',.28);}
 prop(c,e.type,x,y,p.size,e.variant,time);
 for(let i=0;i<16;i++){const q=((age/1800+i*.137)%1),a=i*2.399;const xx=x+Math.cos(a)*p.size*(.35+q*.6),yy=y+(e.type==='lantern'?1:-1)*q*p.size*.95+Math.sin(a)*p.size*.25;c.globalAlpha=p.alpha*(1-q)*.85;star(c,xx,yy,2+(i%3),'#fff2ba',time/900+i);}c.globalAlpha=p.alpha;
 if(e.name){c.font='bold 20px Thai,sans-serif';c.textAlign='center';c.shadowColor='#16213c';c.shadowBlur=5;c.fillStyle='#fff1cb';c.fillText(e.name,x,y+Math.max(p.size*.6,propHeight(e.type,p.size,e.variant)/2+22),150);}c.restore();}
function activity(c,a,time,height){if(a.state!=='active'||['lotus','sangha','lantern','water'].includes(a.activity))return;const age=time-a.since,x=a.pos.x*1080,y=a.pos.y*1920,fade=Math.min(1,age/700,Math.max(0,((a.duration||10000)-age)/700));c.save();c.globalAlpha=Math.max(0,fade);
 if(a.zone==='dance'){const colors=['#ffbd69','#fc9fca','#83e2d0','#d2acff'];const color=colors[a.character%4];c.strokeStyle=color;c.lineWidth=2;c.beginPath();c.ellipse(x,y+4,29+Math.sin(time/210)*4,10,0,0,TAU);c.stroke();for(let i=0;i<5;i++){const q=(age/1800+i*.2)%1;c.globalAlpha=fade*(1-q);c.font='bold 26px sans-serif';c.fillStyle=color;c.fillText(i%2?'♪':'♫',x+Math.sin(i*3+a.id)*45,y-height*.55-q*65);}}
 else if(a.zone==='prayer'){glow(c,x,y-height*.5,height*.7,'255,216,121',.16);for(let i=0;i<12;i++){const q=(age/2400+i/12)%1;c.globalAlpha=fade*Math.sin(q*Math.PI);star(c,x+Math.sin(i*2.399)*height*.4,y-q*height*1.2,2+i%3,'#ffeab7');}}
 c.restore();}
g.FairFestivalFX={prop,floating,activity,star,glow,loadArt,propHeight,getArt:()=>illustrated,lanternOrigin,heldLantern};
})(typeof window!=='undefined'?window:globalThis);
