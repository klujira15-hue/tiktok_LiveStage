/* Local classic scenes. Original local engines handle the other scene families. */
(() => {
  const TAU=Math.PI*2;
  function dot(c,x,y,r,col){c.fillStyle=col;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();}
  function roof(c,x,y,w,col){c.fillStyle=col;c.beginPath();c.moveTo(x-w/2,y);c.lineTo(x,y-100);c.lineTo(x+w/2,y);c.closePath();c.fill();}
  function shrine(c,x,y){c.fillStyle='#8d492e';c.fillRect(x-110,y-100,220,170);roof(c,x,y-100,300,'#c73e39');roof(c,x,y-125,230,'#f0bd58');c.fillStyle='#f0bd58';c.fillRect(x-100,y+55,200,24);dot(c,x,y-50,20,'#ffe2a0');c.beginPath();c.ellipse(x,y+4,44,42,0,0,TAU);c.fill();}
  const nightIds=new Set(['krathong','shrine','cny','ghost','newyear','cemetery','ghostgate']);
  window.makeLocalClassicTheme=id=>({
    bpm:100,fanH:116,
    rows:[{y:1120,s:.65,n:7,x0:170,x1:910},{y:1300,s:.8,n:8,x0:90,x1:990},{y:1490,s:.95,n:8,x0:70,x1:1010},{y:1720,s:1.1,n:7,x0:90,x1:990}],
    fanSvg(color,fid,api){return api.standingFan(color,fid,{legs:'#292639'});},
    init(){},onConfig(){},
    effects:{
      sparkle(user,n,label,api){ api.fireworks(Math.min(7,2+(n||1))); if(label) api.bigShow(user,label); },
      hearts(user,n,label,api){ window.STAGE_THEMES.concert.effects.hearts(user,n,label,api); }
    },
    drawStatic(c){
      const night=nightIds.has(id),water=['krathong','fishing'].includes(id),ghost=['ghost','cemetery','ghostgate'].includes(id);
      const g=c.createLinearGradient(0,0,0,1920);g.addColorStop(0,night?'#07132e':'#45a9df');g.addColorStop(.5,night?'#302d57':'#b6e6e5');g.addColorStop(1,water?'#11394c':ghost?'#101c26':'#746255');c.fillStyle=g;c.fillRect(0,0,1080,1920);
      if(night){for(let i=0;i<90;i++)dot(c,(i*137)%1080,30+(i*79)%700,1+i%2,'#dceaff');dot(c,820,350,62,'#fff0be');}
      c.fillStyle=water?'#1c555d':ghost?'#23343b':'#b89979';c.fillRect(0,940,1080,980);
      if(!water){c.strokeStyle='rgba(34,22,18,.15)';for(let y=970;y<1920;y+=50){c.beginPath();c.moveTo(0,y);c.lineTo(1080,y);c.stroke();for(let x=(y/50%2)*60;x<1080;x+=120)c.strokeRect(x,y,120,50);}}
      if(['shrine','krathong','cny','ghostgate'].includes(id))shrine(c,540,750);
      if(id==='songkran'){
        c.fillStyle='#4c6472';c.beginPath();c.moveTo(470,760);c.lineTo(610,760);c.lineTo(1000,1920);c.lineTo(80,1920);c.closePath();c.fill();
        for(let side=0;side<2;side++)for(let i=0;i<4;i++){let x=side?820+i*25:200-i*25,y=700+i*170;c.fillStyle=['#f9c878','#f19595','#7dd0c1','#b5a5e9'][i];c.fillRect(x-90,y,180,240);roof(c,x,y,210,'#ed765e');c.fillStyle='#276585';c.fillRect(x-45,y+50,42,60);}
      }
      if(id==='newyear'){for(let i=0;i<14;i++){let h=100+(i*71)%300;c.fillStyle='#15243e';c.fillRect(i*84,960-h,78,h);for(let yy=980-h;yy<930;yy+=26)for(let xx=i*84+10;xx<i*84+65;xx+=20){c.fillStyle='#e5bb65';c.fillRect(xx,yy,6,10);}}c.fillStyle='#ffe2a0';c.font='bold 100px sans-serif';c.textAlign='center';c.fillText(String(new Date().getFullYear()+1),540,720);}
      if(id==='fishing'){c.fillStyle='#49785d';c.beginPath();c.ellipse(540,930,650,120,0,0,TAU);c.fill();c.fillStyle='#b18b61';c.fillRect(350,950,380,120);}
      if(ghost){for(let i=0;i<8;i++){c.fillStyle='#566575';c.beginPath();c.roundRect(70+i*135,760+(i%2)*120,64,100,28);c.fill();}c.fillStyle='rgba(190,210,220,.1)';for(let i=0;i<8;i++){c.beginPath();c.ellipse(i*170,1080+(i%3)*180,200,35,0,0,TAU);c.fill();}}
      c.strokeStyle='#584335';c.lineWidth=3;c.beginPath();c.moveTo(0,720);c.quadraticCurveTo(540,1000,1080,720);c.stroke();for(let i=0;i<20;i++){let x=20+i*55,y=720+140*(1-Math.pow((x-540)/540,2));dot(c,x,y,7,id==='cny'?'#ff6856':'#ffe1a0');}
    },
    drawBg(c,t){
      if(['krathong','fishing'].includes(id)){for(let i=0;i<60;i++){c.fillStyle=i%3?'rgba(150,225,235,.16)':'rgba(255,219,139,.35)';c.fillRect((i*173+Math.sin(t/1000+i)*30)%1080,1000+i*15,30+i%45,2);}if(id==='krathong')for(let i=0;i<8;i++){let x=(i*149+t/70)%1160-40,y=1200+i*80;dot(c,x,y,19,'#669258');dot(c,x,y-9,12,'#ef99b8');dot(c,x,y-28,4,'#ffd972');}}
      if(id==='songkran'){for(let i=0;i<24;i++){let x=(i*137+t*.07)%1080,y=750+(i*89+t*.18)%1100;dot(c,x,y,4+i%5,'rgba(170,242,255,.55)');}}
      if(id==='newyear'){for(let k=0;k<3;k++){let age=(t/1800+k*.31)%1,r=age*170,x=180+k*350,y=360+(k%2)*220;c.globalAlpha=1-age;for(let i=0;i<28;i++){let a=i*TAU/28;dot(c,x+Math.cos(a)*r,y+Math.sin(a)*r+age*30,3,['#ffd26c','#ef98cf','#7de4ee'][k]);}c.globalAlpha=1;}}
    },drawFx(){},
  });
})();
