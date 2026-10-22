(function() {
  'use strict';
  const M=globalThis.Motion,R=globalThis.StageRenderer,E=globalThis.SceneExport,W=globalThis.ProjectionWarp;
  const $=id=>document.getElementById(id);
  const query=new URLSearchParams(location.search), isProjection=query.has('projection');
  const room=query.get('projection')||globalThis.crypto?.randomUUID?.()||String(Date.now());
  let channel;
  try{channel=new BroadcastChannel('little-scenes-'+room);}catch{}
  let settings=M.normalizeSettings(), baseTime=0, startedAt=performance.now(), playing=true;
  let stopAt=settings.duration,eventDuration=settings.duration;
  let rig=false,guides=false,blackout=false,projectionWindow=null,toastTimer,recording=false,cancelRecord=null;
  let commandNumber=0;
  let calibrating=false,lastWarpUi='';
  let lastTimelineCycle=-1;
  const seenCommands=new Set();
  const stage=$('stage'),projectionCanvas=$('projectionCanvas');
  const names=['Spark','Orbit','Halo','Wave','Cloud'];
  const presetNames={scene:'Event scene',idle:'Idle',...Object.fromEntries(M.animations.map(a=>[a.id,a.name]))};
  function time() {
    let value=baseTime+(playing?(performance.now()-startedAt)/1000:0);
    if(playing&&!settings.loop&&value>=stopAt) {
      value=stopAt;playing=false;baseTime=value;updatePlayButton();
    }
    return Math.max(0,value);
  }
  function seek(value) {baseTime=Math.max(0,Number.isFinite(value)?value:0);startedAt=performance.now();}
  function toast(message) {
    $('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3500);
  }
  function snapshot(){return {type:'little-scenes-state',settings,time:time(),stopAt,playing,blackout,calibrating,sentAt:Date.now()};}
  function broadcast(){
    if(isProjection)return;
    const data=snapshot();channel?.postMessage(data);
    if(projectionWindow&&!projectionWindow.closed)projectionWindow.postMessage(data,'*');
  }
  function receive(data){
    if(!isProjection&&data?.type==='little-scenes-command'&&data.room===room){
      if(seenCommands.has(data.id))return;
      seenCommands.add(data.id);if(seenCommands.size>100)seenCommands.delete(seenCommands.values().next().value);
      if(data.action==='blackout'){blackout=!!data.value;updateBlackoutUi();}
      else if(data.action==='calibration'){calibrating=!!data.value;updateAlignmentUi();}
      else if(data.action==='warp'&&W.isValid(data.value)){settings=M.normalizeSettings({...settings,warp:data.value});persistSettings();updateAlignmentUi();}
      else if(data.action==='play'){playing=!!data.playing;if(Number.isFinite(data.stopAt))stopAt=data.stopAt;seek(Number.isFinite(data.time)?data.time:time());updatePlayButton();}
      else if(data.action==='restart'){playing=true;stopAt=settings.duration;seek(0);updatePlayButton();}
      else return;
      broadcast();return;
    }
    if(!data||data.type!=='little-scenes-state'||!isProjection)return;
    settings=M.normalizeSettings(data.settings);playing=!!data.playing;blackout=!!data.blackout;calibrating=!!data.calibrating;updateAlignmentUi();
    stopAt=Number.isFinite(data.stopAt)?data.stopAt:settings.duration;
    const transit=playing?Math.max(0,Math.min(2,(Date.now()-data.sentAt)/1000)):0;
    seek((Number(data.time)||0)+transit);
  }
  channel?.addEventListener('message',event=>{
    if(event.data?.type==='little-scenes-ready')broadcast();else receive(event.data);
  });
  addEventListener('message',event=>{
    if(isProjection&&event.source===window.opener)receive(event.data);
    if(!isProjection&&event.origin===location.origin&&event.data?.type==='little-scenes-ready'&&event.data.room===room){projectionWindow=event.source;broadcast();}
    if(!isProjection&&event.source===projectionWindow&&event.data?.type==='little-scenes-command')receive(event.data);
  });
  function updatePlayButton(){if(!isProjection){$('playPause').textContent=playing?'Ⅱ':'▶';$('playPause').setAttribute('aria-label',playing?'Pause':'Play');}}
  function sendCommand(action,values={}){
    const data={type:'little-scenes-command',room,id:room+'-'+Date.now()+'-'+(++commandNumber),action,...values};
    channel?.postMessage(data);window.opener?.postMessage(data,'*');
  }
  function togglePlay(){const t=time();playing=!playing;if(!settings.loop&&t>=stopAt){stopAt=settings.duration;seek(0);}else seek(t);updatePlayButton();if(isProjection)sendCommand('play',{playing,time:time(),stopAt});else broadcast();}
  function updateBlackoutUi(){$('blackoutNotice').hidden=!blackout;$('blackout').textContent=blackout?'Resume output':'Blackout  B';}
  function setBlackout(){blackout=!blackout;updateBlackoutUi();if(isProjection)sendCommand('blackout',{value:blackout});else broadcast();}
  function restart(){playing=true;stopAt=settings.duration;seek(0);updatePlayButton();if(isProjection)sendCommand('restart');else broadcast();}
  function persistSettings(){try{localStorage.setItem('little-scenes-project',E.serialize(settings));}catch{}}
  function setCalibration(value=!calibrating){calibrating=value;updateAlignmentUi();if(isProjection)sendCommand('calibration',{value});else broadcast();}
  function setWarp(quad){
    if(!W.isValid(quad))return;
    settings=M.normalizeSettings({...settings,warp:quad});persistSettings();updateAlignmentUi();
    if(isProjection)sendCommand('warp',{value:settings.warp});else broadcast();
  }
  function updateAlignmentUi(){
    document.body.classList.toggle('calibrating',calibrating);
    $('alignmentToggle').setAttribute('aria-pressed',String(calibrating));
    $('alignProjection').textContent=calibrating?'Finish alignment':'Align corners ⤢';
    $('alignmentStatus').textContent=W.isIdentity(settings.warp)?'No correction applied':'Custom perspective saved';
    document.querySelectorAll('[data-warp-overlay]').forEach(el=>el.hidden=!calibrating);
    $('projectionFullscreen').hidden=calibrating||!!document.fullscreenElement;
    const signature=JSON.stringify(settings.warp);
    if(signature!==lastWarpUi){
      lastWarpUi=signature;
      const points=settings.warp.map(([x,y])=>`${x*1000},${y*1000}`).join(' ');
      $('stageQuad').setAttribute('points',points);$('projectionQuad').setAttribute('points',points);
      document.querySelectorAll('[data-warp-corner]').forEach(handle=>{
        const p=settings.warp[Number(handle.dataset.warpCorner)];handle.style.left=p[0]*100+'%';handle.style.top=p[1]*100+'%';
      });
    }
  }
  function applyAlignment(){
    const bounds=$('stageWrap').getBoundingClientRect();
    for(const [canvas,width,height] of [[stage,bounds.width,bounds.height],[projectionCanvas,innerWidth,innerHeight]]){
      if(width<1||height<1)continue;
      const transform=W.isIdentity(settings.warp)?'none':W.cssMatrix(settings.warp,width,height);
      if(canvas.style.transform!==transform)canvas.style.transform=transform;
    }
  }
  function initializeAlignment(){
    $('alignmentToggle').onclick=()=>setCalibration();$('alignProjection').onclick=()=>setCalibration();
    $('resetAlignment').onclick=()=>{setWarp(W.normalize());toast('Projector alignment reset.');};
    document.querySelectorAll('[data-warp-done]').forEach(b=>b.onclick=()=>setCalibration(false));
    document.querySelectorAll('[data-warp-reset]').forEach(b=>b.onclick=()=>setWarp(W.normalize()));
    document.querySelectorAll('[data-warp-corner]').forEach(handle=>{
      let dragging=false;
      const index=Number(handle.dataset.warpCorner);
      const move=event=>{
        const bounds=handle.closest('[data-warp-overlay]').getBoundingClientRect();
        if(bounds.width<1||bounds.height<1)return;
        const quad=W.normalize(settings.warp);
        quad[index]=[Math.max(0,Math.min(1,(event.clientX-bounds.left)/bounds.width)),Math.max(0,Math.min(1,(event.clientY-bounds.top)/bounds.height))];
        setWarp(quad);
      };
      handle.addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();handle.focus({preventScroll:true});dragging=true;handle.setPointerCapture(event.pointerId);});
      handle.addEventListener('pointermove',event=>{if(dragging)move(event);});
      handle.addEventListener('pointerup',()=>{dragging=false;});handle.addEventListener('pointercancel',()=>{dragging=false;});
      handle.addEventListener('keydown',event=>{
        const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];
        if(!delta)return;
        event.preventDefault();event.stopPropagation();
        const quad=W.normalize(settings.warp),step=event.shiftKey?.01:.0025;
        quad[index]=quad[index].map((v,i)=>Math.max(0,Math.min(1,v+delta[i]*step)));setWarp(quad);
      });
    });
    updateAlignmentUi();
  }
  function resize(canvas,fullscreen=false){
    const bounds=fullscreen?{width:innerWidth,height:innerHeight}:(canvas===stage?$('stageWrap'):canvas).getBoundingClientRect();
    const ratio=Math.min(devicePixelRatio||1,2),w=Math.max(1,Math.round(bounds.width*ratio)),h=Math.max(1,Math.round(bounds.height*ratio));
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  }
  function format(seconds){return String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(Math.floor(seconds%60)).padStart(2,'0');}
  function renderThumb(index){
    const canvas=$('thumb'+index);if(!canvas)return;
    R.draw(canvas,settings,0,{thumbnail:true,character:index,transparent:true});
  }
  function updateUi(){
    if(isProjection)return;
    document.querySelectorAll('[data-preset]').forEach(b=>b.classList.toggle('active',b.dataset.preset===settings.preset));
    document.querySelectorAll('[data-cast]').forEach(b=>b.classList.toggle('active',b.dataset.cast===settings.cast));
    document.querySelectorAll('.character-card').forEach((card,i)=>{
      card.classList.toggle('selected',settings.cast==='all'||settings.character===i);
      card.setAttribute('aria-pressed',String(settings.cast==='all'||settings.character===i));
      $('color'+i).value=settings.colors[i];$('colorLabel'+i).textContent=settings.colors[i];renderThumb(i);
    });
    const formats={duration:v=>Math.round(v)+' s',tempo:v=>v.toFixed(1)+'×',energy:v=>Math.round(v*100)+'%',size:v=>Math.round(v*100)+'%',ground:v=>Math.round(v*100)+'%',sizeWaveAmount:v=>Math.round(v*100)+'%'};
    for(const key of Object.keys(formats)){
      const el=$(key);el.value=settings[key];el.style.setProperty('--fill',((settings[key]-Number(el.min))/(Number(el.max)-Number(el.min))*100)+'%');
      $(key+'Value').textContent=formats[key](settings[key]);
    }
    $('timeline').max=settings.duration;
    $('presetBadge').textContent=presetNames[settings.preset].toUpperCase();
    for(let i=1;i<=4;i++)$('tick'+i).textContent=format(settings.duration*i/4);
    $('loopToggle').classList.toggle('active',settings.loop);$('loopToggle').setAttribute('aria-pressed',String(settings.loop));
    for(const action of M.animations){
      $('enable_'+action.id).checked=settings.enabledActions[action.id];
      $('state_'+action.id).textContent=String(settings.enabledActions[action.id]);
    }
    $('enabledActionCount').textContent=Object.values(settings.enabledActions).filter(Boolean).length+' / '+M.animations.length+' enabled';
    $('colorWave').checked=settings.colorWave;$('colorWaveValue').textContent=String(settings.colorWave);
    $('sizeWave').checked=settings.sizeWave;$('sizeWaveValue').textContent=String(settings.sizeWave);
    $('sizeWaveAmount').disabled=!settings.sizeWave;$('colorBlend').value=settings.colorBlend;$('direction').value=settings.direction;
    $('random').checked=settings.random;
    $('randomEffects').checked=settings.randomEffects;
    $('randomShow').classList.toggle('active',settings.preset==='scene'&&settings.random&&settings.randomEffects);
    $('addCollection').classList.toggle('active',globalThis.StageCollection.ids.every(id=>settings.enabledActions[id]));
    updateTimeline();
    persistSettings();updateAlignmentUi();
  }
  function updateTimeline(){
    lastTimelineCycle=M.loopIndex(settings,time());
    $('timelineSegments').replaceChildren();
    for(const segment of M.sceneSegments(settings,lastTimelineCycle)){
      const el=document.createElement('span');el.textContent=presetNames[segment.action].toUpperCase();el.title=el.textContent;
      el.style.width=((segment.end-segment.start)*100)+'%';$('timelineSegments').append(el);
    }
  }
  function changeSettings(change){
    const t=time();settings=M.normalizeSettings({...settings,...change});
    stopAt=(M.loopIndex(settings,t)+1)*settings.duration;
    seek(t);updateUi();broadcast();
  }
  function download(data,name,type){
    const blob=data instanceof Blob?data:new Blob([data],{type});const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),10000);
  }
  async function loadSources(){
    if(globalThis.StudioSources)return globalThis.StudioSources;
    const entries=await Promise.all(['artwork','warp','antics','collection','motion','renderer'].map(async name=>{
      const response=await fetch(name+'.js');if(!response.ok)throw new Error('Could not read the animation source.');return [name,await response.text()];
    }));return Object.fromEntries(entries);
  }
  async function fullscreen(){
    try {
      if(document.fullscreenElement){await document.exitFullscreen();return;}
      if(!isProjection){$('projection').hidden=false;document.body.classList.add('fullscreen-local');}
      await $('projection').requestFullscreen({navigationUI:'hide'});
      $('projectionFullscreen').hidden=true;
    }catch{if(!isProjection){$('projection').hidden=true;document.body.classList.remove('fullscreen-local');}toast('Use Open projection, then maximize that window.');}
  }
  document.addEventListener('fullscreenchange',()=>{
    if(!document.fullscreenElement&&!isProjection){$('projection').hidden=true;document.body.classList.remove('fullscreen-local');}
    updateAlignmentUi();
  });
  function openProjection(){
    broadcast();toast('Move the output window to your projector, then press F.');
  }
  const recordingMime=typeof MediaRecorder!=='undefined'?['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(m=>MediaRecorder.isTypeSupported(m)):null;
  async function recordVideo(){
    if(recording||!recordingMime)return;
    const wasPlaying=playing,oldTime=time(),recordSettings=M.normalizeSettings(settings),canvas=document.createElement('canvas');
    canvas.width=1920;canvas.height=1080;const ctx=canvas.getContext('2d');ctx.fillStyle='#000';ctx.fillRect(0,0,1920,1080);
    let stream,recorder,raf,stopRequested=false,completed=false,interrupted=false,watchdog;
    const dialog=$('recordDialog');recording=true;playing=false;seek(oldTime);updatePlayButton();broadcast();
    const chunks=[];
    try{
      stream=canvas.captureStream(30);recorder=new MediaRecorder(stream,{mimeType:recordingMime,videoBitsPerSecond:10000000});
      const done=new Promise((resolve,reject)=>{recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onstop=resolve;recorder.onerror=()=>reject(new Error('The browser could not finish the recording.'));});
      cancelRecord=()=>{stopRequested=true;if(recorder.state!=='inactive')recorder.stop();};
      $('recordProgress').textContent='1920 × 1080 · 30 fps · '+recordSettings.duration+' seconds';$('recordBar').value=0;dialog.showModal();
      recorder.start(1000);const start=performance.now();let previous=start;
      const capture=now=>{
        if(stopRequested)return;
        if(now-previous>1000){interrupted=true;if(recorder.state!=='inactive')recorder.stop();return;}
        previous=now;
        const t=Math.min((now-start)/1000,recordSettings.duration);
        R.draw(canvas,recordSettings,t);$('recordBar').value=t/recordSettings.duration;
        $('recordProgress').textContent='1920 × 1080 · '+t.toFixed(1)+' / '+recordSettings.duration+' s';
        if(t>=recordSettings.duration){completed=true;if(recorder.state!=='inactive')recorder.stop();}else raf=requestAnimationFrame(capture);
      };
      raf=requestAnimationFrame(capture);
      watchdog=setTimeout(()=>{interrupted=true;if(recorder.state!=='inactive')recorder.stop();},(recordSettings.duration+5)*1000);
      await done;
      if(!stopRequested&&(!completed||interrupted))throw new Error('Recording was interrupted. Keep the studio tab visible and try again.');
      if(!stopRequested){download(new Blob(chunks,{type:recordingMime}),'little-scenes-'+recordSettings.preset+'.webm');toast('Video exported at 1920 × 1080.');}
    }catch(error){toast(error.message||'Video recording is unavailable. Export the offline animation instead.');}
    finally{cancelAnimationFrame(raf);clearTimeout(watchdog);stream?.getTracks().forEach(t=>t.stop());if(dialog.open)dialog.close();cancelRecord=null;recording=false;playing=wasPlaying;seek(oldTime);updatePlayButton();broadcast();}
  }
  function initializeEditor(){
    try{const saved=localStorage.getItem('little-scenes-project');if(saved)settings=E.deserialize(saved);}catch{}
    stopAt=settings.duration;
    eventDuration=settings.preset==='scene'?settings.duration:Math.max(24,settings.random?Object.values(settings.enabledActions).filter(Boolean).length*3:24);
    const outputUrl=new URL(location.href);outputUrl.search='';outputUrl.searchParams.set('projection',room);
    $('openProjection').href=outputUrl.href;$('openProjection').target='little-scenes-output-'+room;
    for(const action of M.animations){
      const card=document.createElement('div');card.className='action-card';
      card.innerHTML='<button class="preset" data-preset="'+action.id+'" aria-label="Preview '+action.name+'"><span class="preset-symbol">'+action.symbol+'</span><span><strong>'+action.name+'</strong><small>'+action.hint+'</small></span></button><label class="action-toggle" for="enable_'+action.id+'"><span>In event</span><input type="checkbox" role="switch" id="enable_'+action.id+'" aria-label="Enable '+action.name+' in event"><output id="state_'+action.id+'">false</output></label>';
      $('presets').append(card);
      $('enable_'+action.id).addEventListener('change',e=>changeSettings({enabledActions:{...settings.enabledActions,[action.id]:e.target.checked}}));
    }
    for(let i=0;i<5;i++){
      const card=document.createElement('div');card.className='character-card';card.role='button';card.tabIndex=0;card.setAttribute('aria-label','Select '+names[i]);
      card.innerHTML='<canvas id="thumb'+i+'" width="100" height="145"></canvas><div class="character-info"><strong>'+names[i]+'</strong><small id="colorLabel'+i+'"></small></div><input id="color'+i+'" class="color-input" type="color" aria-label="'+names[i]+' color">';
      const select=()=>{changeSettings({character:i,cast:'solo'});};
      card.addEventListener('click',e=>{if(e.target.tagName!=='INPUT')select();});
      card.addEventListener('keydown',e=>{if(e.target===card&&(e.code==='Space'||e.code==='Enter')){e.preventDefault();select();}});
      $('characterList').append(card);
      $('color'+i).addEventListener('input',e=>{const colors=[...settings.colors];colors[i]=e.target.value;changeSettings({colors});});
    }
    document.querySelectorAll('[data-cast]').forEach(b=>b.addEventListener('click',()=>changeSettings({cast:b.dataset.cast})));
    document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>{
      if(settings.preset==='scene')eventDuration=settings.duration;
      const duration=b.dataset.preset==='scene'?Math.max(eventDuration,settings.random?Object.values(settings.enabledActions).filter(Boolean).length*3:6):M.animations.find(a=>a.id===b.dataset.preset).duration;
      settings=M.normalizeSettings({...settings,preset:b.dataset.preset,duration,loop:true});playing=true;stopAt=settings.duration;seek(0);updateUi();updatePlayButton();broadcast();
    }));
    $('colorWave').addEventListener('change',e=>changeSettings({colorWave:e.target.checked}));
    $('sizeWave').addEventListener('change',e=>changeSettings({sizeWave:e.target.checked}));
    for(const key of ['colorBlend','direction'])$(key).addEventListener('change',e=>changeSettings({[key]:e.target.value}));
    $('random').addEventListener('change',e=>changeSettings({random:e.target.checked,randomSeed:e.target.checked?1+Math.floor(Math.random()*4294967294):settings.randomSeed}));
    $('randomEffects').addEventListener('change',e=>changeSettings({randomEffects:e.target.checked}));
    $('randomShow').onclick=()=>{
      settings=M.randomShowSettings({...settings,randomSeed:1+Math.floor(Math.random()*4294967294)});
      eventDuration=settings.duration;
      playing=true;stopAt=settings.duration;seek(0);updateUi();updatePlayButton();broadcast();
      toast('Random show: new scenes, solo surprises, and occasional waves.');
    };
    $('addCollection').onclick=()=>{
      settings=M.addCollectionSettings({...settings,duration:settings.preset==='scene'?settings.duration:eventDuration});eventDuration=settings.duration;
      playing=true;stopAt=settings.duration;seek(0);updateUi();updatePlayButton();broadcast();
      toast('Collection 01 added: six scenes, thirty individual roles.');
    };
    for(const key of ['duration','tempo','energy','size','ground','sizeWaveAmount'])$(key).addEventListener('input',e=>changeSettings({[key]:Number(e.target.value)}));
    $('timeline').addEventListener('input',e=>{
      const offset=M.loopIndex(settings,time())*settings.duration,value=Number(e.target.value);
      // A later pass's start is distinct from the preceding pass's exact endpoint.
      const startNudge=value===0&&offset>0?Math.max(1e-7,offset*Number.EPSILON*4):value;
      seek(offset+startNudge);broadcast();
    });
    $('playPause').onclick=togglePlay;
    $('restart').onclick=restart;
    $('loopToggle').onclick=()=>changeSettings({loop:!settings.loop});
    $('rigToggle').onclick=()=>{rig=!rig;$('rigToggle').setAttribute('aria-pressed',String(rig));};
    $('guidesToggle').onclick=()=>{guides=!guides;$('guidesToggle').setAttribute('aria-pressed',String(guides));};
    $('fullscreen').onclick=fullscreen;$('openProjection').onclick=openProjection;$('blackout').onclick=setBlackout;
    $('restoreColors').onclick=()=>{changeSettings({colors:[...M.defaults.colors]});toast('Reference colors restored.');};
    $('saveProject').onclick=()=>{download(E.serialize(settings),'little-scenes-project.json','application/json');toast('Editable project saved.');};
    $('loadProject').onclick=()=>$('projectFile').click();
    $('projectFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>200000)throw new Error('Choose a Little Scenes JSON project smaller than 200 KB.');const next=E.deserialize(await file.text());settings=next;stopAt=settings.duration;seek(0);updateUi();broadcast();toast('Project opened.');}catch(error){toast(error.message);}finally{e.target.value='';}};
    $('exportPlayback').onclick=async()=>{const button=$('exportPlayback');button.disabled=true;try{download(E.buildStandalone(settings,await loadSources()),'little-scenes-'+settings.preset+'.html','text/html');toast('Offline animation exported. Click its stage for fullscreen.');}catch(error){toast(error.message+' Open the packaged studio or use the local server.');}finally{button.disabled=false;}};
    $('exportSvg').onclick=()=>{download(E.buildSvg(settings,time(),1920,1080,$('transparentExport').checked),'little-scenes-frame.svg','image/svg+xml');toast('1920 × 1080 SVG frame exported.');};
    $('exportPng').onclick=()=>{const c=document.createElement('canvas');c.width=1920;c.height=1080;R.draw(c,settings,time(),{transparent:$('transparentExport').checked});c.toBlob(blob=>{if(blob){download(blob,'little-scenes-frame.png');toast('1920 × 1080 PNG frame exported.');}});};
    $('videoExport').onclick=recordVideo;$('videoExport').hidden=!recordingMime||!HTMLCanvasElement.prototype.captureStream;
    $('cancelRecording').onclick=()=>cancelRecord?.();$('recordDialog').addEventListener('cancel',()=>cancelRecord?.());
    updateUi();
  }
  if(isProjection){
    document.body.classList.add('projection-mode');$('editor').hidden=true;$('projection').hidden=false;
    $('projectionFullscreen').onclick=fullscreen;
    try{window.opener?.postMessage({type:'little-scenes-ready',room},'*');channel?.postMessage({type:'little-scenes-ready',room});}catch{}
  }else initializeEditor();
  initializeAlignment();
  addEventListener('keydown',e=>{
    if(recording||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)||e.metaKey||e.ctrlKey||e.altKey)return;
    const key=e.key.toLowerCase();
    if(e.code==='Space'){e.preventDefault();togglePlay();}
    if(key==='r')restart();
    if(key==='f')fullscreen();if(key==='b')setBlackout();if(key==='c')setCalibration();
  });
  let lastSync=0;
  function frame(now){
    const t=time();
    applyAlignment();
    if(isProjection||document.fullscreenElement){resize(projectionCanvas,true);R.draw(projectionCanvas,settings,t,{blackout,calibration:calibrating});}
    if(!isProjection){
      resize(stage);R.draw(stage,settings,t,{rig,guides,blackout,calibration:calibrating});
      const playhead=M.playhead(settings,t),cycle=M.loopIndex(settings,t);
      $('timeLabel').innerHTML=format(playhead)+' <span>/ '+format(settings.duration)+'</span>';
      if(document.activeElement!==$('timeline'))$('timeline').value=playhead;
      if(cycle!==lastTimelineCycle)updateTimeline();
      const segments=M.sceneSegments(settings,cycle),segment=segments.find(s=>playhead/settings.duration<s.end)||segments.at(-1);
      $('currentAction').textContent=presetNames[segment.action].toUpperCase();
      const effects=M.sampleEffects(settings,t);
      $('randomWaveStatus').hidden=!effects.automatic;
      $('randomWaveStatus').textContent='Waves this scene: '+(effects.sizeWave?'Size ON':'Size OFF')+' · '+(effects.colorWave?'Color ON':'Color OFF');
      if(now-lastSync>1000){broadcast();lastSync=now;}
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
