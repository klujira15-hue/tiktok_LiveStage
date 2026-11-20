/* Existing character sheets -> reusable canvas animations. Source PNGs stay unchanged. */
(function(global){
  'use strict';
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  function removeGreen(data){
    for(let i=0;i<data.length;i+=4){
      const r=data[i],g=data[i+1],b=data[i+2],other=Math.max(r,b);
      // Restrict the key to green, preserving turquoise costume fabric and gold.
      if(g>75&&g>r*1.28&&g>b*1.28&&g-other>35){
        const key=clamp((g-other-35)/105,0,1);
        data[i+3]=Math.round(data[i+3]*(1-key));
        if(key>0&&key<1)data[i+1]=Math.min(g,other+25);
      }
    }
    return data;
  }
  function frameBounds(data,width,height,columns=4,rows=2){
    const frames=[];
    for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
      const left=Math.round(col*width/columns),right=Math.round((col+1)*width/columns),top=Math.round(row*height/rows),bottom=Math.round((row+1)*height/rows);
      let x0=right,y0=bottom,x1=left,y1=top;
      for(let y=top;y<bottom;y++)for(let x=left;x<right;x++)if(data[(y*width+x)*4+3]>50){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
      if(x0>x1)throw Error('ไม่พบตัวละครในช่อง '+frames.length);
      x0=Math.max(left,x0-3);y0=Math.max(top,y0-3);x1=Math.min(right-1,x1+3);y1=Math.min(bottom-1,y1+3);
      frames.push({x:x0,y:y0,w:x1-x0+1,h:y1-y0+1,anchorX:(x0+x1+1)/2,anchorY:y1+1});
    }
    return frames;
  }
  function timeline(sequence,time,step){const p=((time/step)%sequence.length+sequence.length)%sequence.length;return{frame:sequence[Math.floor(p)],phase:p%1};}
  const facingDirections=['right','front-right','front','front-left','left','back-left','back','back-right'];
  function selectFacing(dx,dy,previous='front'){
    if(Math.hypot(dx,dy)<.01)return previous;
    const angle=Math.atan2(dy,dx),old=facingDirections.indexOf(previous);if(old>=0){const center=old*Math.PI/4,difference=Math.atan2(Math.sin(angle-center),Math.cos(angle-center));if(Math.abs(difference)<=Math.PI/8+.06)return previous;}
    return facingDirections[((Math.round(angle/(Math.PI/4))%8)+8)%8];
  }
  class Character {
    constructor(meta,canvas,frames){this.meta=meta;this.canvas=canvas;this.frames=frames;this.height=Math.max(...frames.map(f=>f.h));}
    static async load(meta,base=''){
      const img=new Image();img.src=base+meta.source;await img.decode();
      const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
      const c=canvas.getContext('2d',{willReadFrequently:true});c.drawImage(img,0,0);
      const pixels=c.getImageData(0,0,canvas.width,canvas.height);removeGreen(pixels.data);c.putImageData(pixels,0,0);
      const character=new Character(meta,canvas,frameBounds(pixels.data,canvas.width,canvas.height));
      if(meta.walk){
        const image=new Image();image.src=base+meta.walk.source;await image.decode();
        const sheet=document.createElement('canvas');sheet.width=image.naturalWidth;sheet.height=image.naturalHeight;
        const ctx=sheet.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
        const px=ctx.getImageData(0,0,sheet.width,sheet.height);removeGreen(px.data);ctx.putImageData(px,0,0);
        const columns=meta.walk.columns,rows=meta.walk.rows,row=meta.walk.row;
        const frames=frameBounds(px.data,sheet.width,sheet.height,columns,rows).slice(row*columns,(row+1)*columns);
        const cellW=sheet.width/columns,cellH=sheet.height/rows;
        const baseline=Math.max(...frames.map(f=>f.anchorY-row*cellH));
        character.walk={canvas:sheet,frames,height:Math.max(...frames.map(f=>f.h)),baseline,cellW,cellH,row};
      }
      if(meta.activities){
        const image=new Image();image.src=base+meta.activities.source;await image.decode();
        const sheet=document.createElement('canvas');sheet.width=image.naturalWidth;sheet.height=image.naturalHeight;
        const ctx=sheet.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
        const px=ctx.getImageData(0,0,sheet.width,sheet.height);
        const frames=frameBounds(px.data,sheet.width,sheet.height,4,3),standingHeight=frames[0].h;
        const tips={};for(const index of [6,7]){const f=frames[index],side=meta.activities.sparklerSide||1,x0=side<0?f.x:f.x+f.w-9,x1=x0+9;let sum=0,count=0;for(let yy=f.y;yy<f.y+f.h;yy++)for(let xx=x0;xx<x1;xx++)if(px.data[(yy*sheet.width+xx)*4+3]>150){sum+=yy;count++;}tips[index]=[side*(f.w/2-4)/standingHeight,((count?sum/count:f.y+f.h*.3)-f.anchorY)/standingHeight];}
        character.activities={canvas:sheet,frames,height:standingHeight,tips};
      }
      if(meta.walkViews){
        const image=new Image();image.src=base+meta.walkViews.source;await image.decode();
        const sheet=document.createElement('canvas');sheet.width=image.naturalWidth;sheet.height=image.naturalHeight;
        const ctx=sheet.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
        const px=ctx.getImageData(0,0,sheet.width,sheet.height);if(meta.walkViews.chromaKey){removeGreen(px.data);ctx.putImageData(px,0,0);}
        const frames=frameBounds(px.data,sheet.width,sheet.height,4,2);
        character.walkViews={canvas:sheet,frames,height:Math.max(...frames.map(f=>f.h)),cellW:sheet.width/4,cellH:sheet.height/2,baselines:[0,1].map(row=>Math.max(...frames.slice(row*4,row*4+4).map(f=>f.anchorY-row*sheet.height/2)))};
      }
      if(meta.signature){
        const image=new Image();image.src=base+meta.signature.source;await image.decode();
        const sheet=document.createElement('canvas');sheet.width=image.naturalWidth;sheet.height=image.naturalHeight;
        const ctx=sheet.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);const px=ctx.getImageData(0,0,sheet.width,sheet.height);
        const frames=frameBounds(px.data,sheet.width,sheet.height,4,2);
        character.signature={canvas:sheet,frames,height:Math.max(...frames.slice(4).map(f=>f.h))};
      }
      if(meta.danceShow){
        const image=new Image();image.src=base+meta.danceShow.source;await image.decode();
        const sheet=document.createElement('canvas');sheet.width=image.naturalWidth;sheet.height=image.naturalHeight;
        const ctx=sheet.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
        const px=ctx.getImageData(0,0,sheet.width,sheet.height),columns=meta.danceShow.columns,rows=meta.danceShow.rows;
        const frames=frameBounds(px.data,sheet.width,sheet.height,columns,rows);
        character.danceShow={canvas:sheet,frames,height:Math.max(...frames.map(f=>f.h))};
      }
      return character;
    }
    draw(c,{x,y,height=300,time=0,action='dance',moving=false,direction=1,facing=null,alpha=1,shadow=true,loop=true,effects=true}={}){
      const aliases={walkFront:'front',walkBack:'back',walkLeft:'left',walkRight:'right'};
      if(aliases[action]){facing=aliases[action];action='walk';}
      facing=facing||(direction<0?'left':'right');
      if((moving||action==='walk')&&(this.walkViews||this.walk)){
        const back=facing==='back'||facing.startsWith('back-'),frontal=this.walkViews&&(facing==='front'||back),w=frontal?this.walkViews:this.walk;
        if(w){const step=frontal?(this.meta.walkViews.step||180):(this.meta.walk.step||160),sample=timeline([0,1,2,3],time,step),row=frontal?(back?1:0):0,index=row*4+sample.frame,scale=height/w.height;
          c.save();c.globalAlpha=alpha;if(shadow){c.fillStyle='rgba(0,0,0,.18)';c.beginPath();c.ellipse(x,y+2,height*.15,height*.035,0,0,Math.PI*2);c.fill();}c.translate(x,y);if(facing==='left'||facing.endsWith('-left'))c.scale(-1,1);
          const f=w.frames[index];c.globalAlpha=alpha;c.drawImage(w.canvas,f.x,f.y,f.w,f.h,-f.w*scale/2,-f.h*scale,f.w*scale,f.h*scale);c.restore();return;
        }
      }
      if(global.FairDanceExtras?.draw(c,this,{x,y,height,time,action,direction,alpha,shadow}))return;
      if(global.FairActivities?.draw(c,this,{x,y,height,time,action,direction,facing,alpha,shadow,loop,effects}))return;
      const state=this.meta.actions[action]||this.meta.actions.idle;
      const sample=timeline(state.frames,time,state.step||400);
      const f=this.frames[sample.frame],scale=height/this.height;
      const beat=time/420;const bob=moving?Math.abs(Math.sin(time/130))*5:action==='dance'?Math.abs(Math.sin(beat))*5:Math.sin(time/650)*1.5;
      c.save();c.globalAlpha=alpha;
      if(shadow){c.fillStyle='rgba(0,0,0,.18)';c.beginPath();c.ellipse(x,y+2,height*.15,height*.035,0,0,Math.PI*2);c.fill();}
      c.translate(x,y-bob);c.rotate(moving?Math.sin(time/130)*.025:action==='dance'?Math.sin(beat)*.028:0);
      c.drawImage(this.canvas,f.x,f.y,f.w,f.h,-f.w*scale/2,-f.h*scale,f.w*scale,f.h*scale);c.restore();
    }
  }
  const api={Character,removeGreen,frameBounds,timeline,selectFacing};global.FairCharacters=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
