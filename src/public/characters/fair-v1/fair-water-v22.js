(function(g){'use strict';
const W=1080,H=1920,clamp=v=>Math.max(0,Math.min(1,v));
function heading(x){return x<.38?1:x>.62?-1:0;}
function origin(a,height){const direction=heading(a.pos.x);return{x:a.pos.x+direction*height*.20/W,y:a.pos.y-height*.10/H,direction};}
async function load(src){const image=new Image();image.src=src;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const c=canvas.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0);const data=c.getImageData(0,0,canvas.width,canvas.height),frames=g.FairCharacters.frameBounds(data.data,canvas.width,canvas.height,6,4);return{canvas,frames,heights:Array.from({length:4},(_,r)=>Math.max(...frames.slice(r*6,r*6+6).map(f=>f.h)))};}
function draw(c,pack,a,p,height,time){if(a.zone!=='water'||a.state!=='active'||!pack)return false;const age=Math.max(0,time-a.since),side=heading(a.pos.x),pair=side===1?0:side===-1?4:2,row=a.character%4,x=a.pos.x*W,y=a.pos.y*H,scale=height*.72/pack.heights[row];
 c.save();c.fillStyle='rgba(0,0,0,.15)';c.beginPath();c.ellipse(x,y+2,height*.20,height*.035,0,0,Math.PI*2);c.fill();
 const kneel=clamp(age/500)*clamp((8100-age)/700),opening=clamp((age-2200)/800);
 if(kneel<1){c.save();c.globalAlpha=1-kneel;p.draw(c,{x,y,height,action:'stand',facing:'front',direction:side<0?-1:1,time:0,shadow:false,effects:false});c.restore();}
 for(const [index,alpha]of [[pair,1-opening],[pair+1,opening]]){if(alpha*kneel<=0)continue;const f=pack.frames[row*6+index];c.save();c.globalAlpha=alpha*kneel;c.drawImage(pack.canvas,f.x,f.y,f.w,f.h,x-f.w*scale/2,y-f.h*scale,f.w*scale,f.h*scale);c.restore();}
 if(age<3000){const h=origin(a,height);c.save();c.globalAlpha=clamp((age-300)/500);g.FairFestivalFX?.prop(c,'krathong',h.x*W,h.y*H,30,a.variant??0,time);c.restore();}c.restore();return true;
}
g.FairWater={load,heading,origin,draw};
})(typeof window!=='undefined'?window:globalThis);
