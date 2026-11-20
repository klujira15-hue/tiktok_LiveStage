(async()=>{
  'use strict';
  const $=id=>document.getElementById(id),status=$('status');
  const labels={danceExtra:'เต้นชุดใหม่ 4 ท่า',danceMix:'รวมเต้น 8 ท่า',extra1:'เต้นใหม่ · ท่า 1',extra2:'เต้นใหม่ · ท่า 2',extra3:'เต้นใหม่ · ท่า 3',extra4:'เต้นใหม่ · ท่า 4',...Object.fromEntries(Object.entries(FairActivities.definitions).map(([k,v])=>[k,v.label])),walkFront:'เดินหันหน้า',walkBack:'เดินหันหลัง',walkLeft:'เดินไปซ้าย',walkRight:'เดินไปขวา',walk:'เดิน',idle:'ยืนพัก',dance:'เต้น / รำ',greet:'ทักทาย',heart:'ส่งหัวใจ',wai:'ไหว้',cheer:'ดีใจ',kiss:'ส่งจูบ',point:'ชี้ชวน'};
  try{
    const manifest=await fetch('manifest.json').then(r=>r.json());
    const people=await Promise.all(manifest.characters.map(m=>FairCharacters.Character.load(m)));
    let paused=false,clock=0,last=performance.now(),speed=1,recording=false,demo=false,demoStart=0,sceneDemo=null,recordDance=false;
    const states=people.map(()=> 'danceExtra'),canvases=[],starts=people.map(()=>0);
    let demoActions=['pray','sit','festivalDance','sparkler','lantern','krathong'],demoPhase=4000;
    const v4Demo=()=>{demo=true;demoStart=clock;demoActions=['walkFront','walkBack','pray','festivalDance'];demoPhase=6000;};
    for(const[p,i]of people.map((p,i)=>[p,i])){
      const card=document.createElement('article');card.className='card';
      const h=document.createElement('h2');h.textContent=p.meta.name;card.append(h);
      const canvas=document.createElement('canvas');canvas.width=450;canvas.height=600;card.append(canvas);canvases.push(canvas);
      const select=document.createElement('select');select.setAttribute('aria-label','ท่าของ'+p.meta.name);
      for(const action of [...Object.keys(p.meta.actions),...(p.walk?['walk','walkFront','walkBack','walkLeft','walkRight']:[]),...Object.keys(FairActivities.definitions),'danceExtra','danceMix','extra1','extra2','extra3','extra4']){const option=document.createElement('option');option.value=action;option.textContent=labels[action]||action;select.append(option);}select.value='danceExtra';select.onchange=()=>{demo=false;starts[i]=clock;states[i]=select.value;$('activityNow').textContent=labels[select.value];};card.append(select);const note=document.createElement('p');note.textContent=p.meta.extraDance.name+' · '+p.meta.extraDance.poseNames.join(' → ');card.append(note);$('cards').append(card);
      const option=document.createElement('option');option.value=i;option.textContent=p.meta.name;$('person').append(option);
    }
    const bg=new Image();bg.src='/scenes/temple-fair/scene.png';await bg.decode();
    const layout=await fetch('/scenes/temple-fair/layout.json').then(r=>r.json());
    const navData=await fetch('/scenes/temple-fair/navigation-v8.json').then(r=>r.json()),navigation=new FairNavigation.Navigator(navData);

    const crowdConfig=await fetch('/scenes/temple-fair/crowd-v17.json').then(r=>r.json());
    const crowd=await FairCrowdScene.create(people,navData,crowdConfig),director=crowd.director;
    const add=(zone,count=1)=>{for(let i=0;i<count;i++)director.request(zone,(Number($('person').value)+i)%people.length);};
    const startSceneDemo=()=>{director.demo(60);paused=false;};
    const startDanceStage=()=>{add('dance',4);paused=false;};
    $('sceneDemo').textContent='เพิ่มผู้ร่วมงาน 60 คน';$('sceneDemo').onclick=startSceneDemo;
    $('extraStage').onclick=startDanceStage;$('mixStage').onclick=startDanceStage;
    $('extraAll').onclick=()=>{demo=false;states.fill('danceExtra');starts.fill(clock);};
    $('mixAll').onclick=()=>{demo=false;states.fill('danceMix');starts.fill(clock);};
    $('recordDance').onclick=()=>{if(recording)return;recordDance=true;$('record').click();};
    for(const [key,zone]of Object.entries(director.zones)){const b=document.createElement('button');b.textContent=zone.label;b.onclick=()=>add(key);$('zones').append(b);}
    const show=$('show'),sc=show.getContext('2d'),stage=$('stage'),c=stage.getContext('2d');
    function render(t){const dt=Math.min(.05,(t-last)/1000);last=t;if(!paused)clock+=dt*1000*speed;
      const g=sc.createLinearGradient(0,0,1280,720);g.addColorStop(0,'#14263e');g.addColorStop(1,'#372441');sc.fillStyle=g;sc.fillRect(0,0,show.width,show.height);
      sc.textAlign='center';sc.fillStyle='#ffdf95';sc.font='32px Thai, sans-serif';sc.fillText('ตัวละครงานวัด · ชุดเคลื่อนไหว',640,62);
      if(demo){const elapsed=clock-demoStart,action=demoActions[Math.floor(elapsed/demoPhase)%demoActions.length];states.fill(action);starts.fill(clock-elapsed%demoPhase);$('activityNow').textContent=labels[action];}
      for(let i=0;i<people.length;i++){const p=people[i];p.draw(sc,{x:320+(i%2)*640,y:540+Math.floor(i/2)*620,height:430,time:clock-starts[i],action:states[i]});sc.font='23px Thai,sans-serif';sc.fillStyle='#fff2d7';sc.fillText(p.meta.name,320+(i%2)*640,600+Math.floor(i/2)*620);const cc=canvases[i].getContext('2d');cc.clearRect(0,0,450,600);p.draw(cc,{x:225,y:570,height:Math.min(530,390*(p.signature?.height||p.height)/Math.max(...(p.signature?.frames||p.frames).map(f=>f.w))),time:clock-starts[i],action:states[i],shadow:false});}
      if(!paused)crowd.update(dt*speed);crowd.draw(c,$('navDebug').checked);const counts=director.snapshot();$('destination').textContent='ในงาน '+counts.visible+' คน · กำลังเดิน '+counts.moving+' · รอเข้าฉาก '+counts.pending+' · เล่นเสร็จ '+counts.completed;
      requestAnimationFrame(render);
    }
    $('pause').onclick=()=>{if(recording)return;paused=!paused;$('pause').textContent=paused?'เล่นต่อ':'หยุดชั่วคราว';};$('speed').onchange=()=>speed=Number($('speed').value);
    $('demoV4').onclick=v4Demo;
    $('demoActivities').onclick=()=>{demo=true;demoStart=clock;demoActions=['pray','sit','festivalDance','sparkler','lantern','krathong'];demoPhase=4000;};
    $('walkAll').onclick=()=>{demo=false;states.fill('walk');document.querySelectorAll('.card select').forEach(s=>s.value='walk');};
    $('danceAll').onclick=()=>{demo=false;states.fill('dance');document.querySelectorAll('.card select').forEach(s=>s.value='dance');};
    $('record').disabled=!window.MediaRecorder||!HTMLCanvasElement.prototype.captureStream;
    $('record').onclick=()=>{if(recording)return;const danceOnly=recordDance;recordDance=false;const duration=danceOnly?16000:36000;recording=true;paused=false;if(danceOnly)startDanceStage('danceMix');else startSceneDemo();$('pause').disabled=true;$('record').disabled=true;$('record').textContent='กำลังบันทึก '+duration/1000+' วินาที…';const stream=stage.captureStream(30),chunks=[];const type=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));let recorder;try{recorder=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:4500000});}catch(error){stream.getTracks().forEach(t=>t.stop());recording=false;$('pause').disabled=false;$('record').disabled=false;status.textContent='บันทึกไม่ได้: '+error.message;return;}
      recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onerror=()=>status.textContent='การบันทึกวิดีโอมีปัญหา กรุณาลองใหม่';recorder.onstop=()=>{stream.getTracks().forEach(t=>t.stop());sceneDemo=null;const blob=new Blob(chunks,{type:recorder.mimeType}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='fair-characters-animation.webm';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);recording=false;$('pause').disabled=false;$('record').disabled=false;$('record').textContent='ดาวน์โหลดวิดีโอตัวอย่าง 36 วินาที';status.textContent='บันทึกเสร็จแล้ว · วิดีโอตรวจในฉากงานวัด ไม่มีเสียง';};recorder.start(250);setTimeout(()=>{if(recorder.state==='recording')recorder.stop();},duration);
    };
    const alpha=people.map(p=>{const d=p.canvas.getContext('2d').getImageData(0,0,p.canvas.width,p.canvas.height).data;let clear=0;for(let i=3;i<d.length;i+=4)if(!d[i])clear++;return clear/(d.length/4);});
    if(alpha.some(a=>a<.2||a>.95))throw Error('สัดส่วนความโปร่งใสผิดปกติ กรุณาตรวจภาพต้นฉบับ');
    status.textContent='พร้อมทดลองคิวงานวัด · ช่องยืนแยกกิจกรรม · จองทางก่อนเดิน · คนเกินช่องรอเข้าฉาก';
    window.__fairCrowdTest={director,crowd,ready:true};
    window.__fairCharacterCheck={directionalFrames:people.map(p=>p.walkViews?.frames.length||0),extraDanceFrames:people.map(p=>p.meta.extraDance.frames),signatureFrames:people.map(p=>p.signature?.frames.length||0),activityFrames:people.map(p=>p.activities?.frames.length||0),walkingFrames:people.map(p=>p.walk?.frames.length||0),loaded:people.length,frames:people.map(p=>p.frames.length),transparentFractions:alpha};requestAnimationFrame(render);
  }catch(error){status.textContent='เปิดชุดตัวละครไม่สำเร็จ: '+error.message;console.error(error);}
})();
