(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const mix = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = clamp((x-a)/(b-a),0,1); return t*t*(3-2*t); };
  const rotate = ([x,y], a) => [x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a)];
  const animations=Object.freeze([
    {id:'run',name:'Run across',symbol:'↗',hint:'Left to right',duration:8,period:.64},
    {id:'jump',name:'Jump',symbol:'↟',hint:'Crouch, lift, land',duration:8,period:2},
    {id:'dance',name:'Dance',symbol:'♫',hint:'Step to the rhythm',duration:12,period:2.4},
    {id:'walk',name:'Walk',symbol:'➝',hint:'Easy steps in place',duration:10,period:1.25},
    {id:'march',name:'March',symbol:'⇧',hint:'High knees',duration:10,period:1.1},
    {id:'shuffle',name:'Shuffle',symbol:'⇆',hint:'Quick little slides',duration:10,period:1.2},
    {id:'sidestep',name:'Sidestep',symbol:'↔',hint:'Step out, step in',duration:10,period:2.8},
    {id:'sway',name:'Sway',symbol:'∿',hint:'Rock side to side',duration:10,period:2.4},
    {id:'bow',name:'Bow',symbol:'⌄',hint:'Take a little bow',duration:8,period:2.4},
    {id:'twist',name:'Twist',symbol:'⤨',hint:'Turn to the beat',duration:10,period:1.8},
    {id:'squat',name:'Squat',symbol:'↧',hint:'Down and up',duration:8,period:2.4},
    {id:'kick',name:'Kick',symbol:'⌁',hint:'Chamber, kick, recover',duration:10,period:2.8},
    {id:'spin',name:'Spin',symbol:'⟳',hint:'Turn all the way',duration:10,period:2.4},
    {id:'swap',name:'Swap places',symbol:'⇄',hint:'One pair at a time',duration:10,period:10},
    {id:'chase',name:'Chase',symbol:'»',hint:'Follow the little leader',duration:10,period:10},
    {id:'solo',name:'Solo return',symbol:'①',hint:'One character steals the show',duration:8,period:8},
    {id:'ball',name:'Pass the ball',symbol:'●',hint:'A kick, a catch, a relay',duration:12,period:11.2},
    {id:'confetti',name:'Confetti',symbol:'✺',hint:'Pop apart and reassemble',duration:10,period:7},
    {id:'peek',name:'Peekaboo',symbol:'◉',hint:'Hide below, peek above',duration:10,period:7}
  ].concat(root.StageAntics?.animations||[]).map(Object.freeze));
  const enabledActions=Object.freeze(Object.fromEntries(animations.map(a=>[a.id,a.id==='run'||a.id==='dance'])));
  const defaults = Object.freeze({preset:'scene',cast:'all',character:2,duration:24,size:.30,energy:1,tempo:1,ground:.78,loop:true,glow:0,colorWave:false,colorBlend:'smooth',sizeWave:false,sizeWaveAmount:.65,direction:'ltr',random:false,randomEffects:false,randomSeed:1,enabledActions,colors:['#f4c044','#d86c3c','#c4d078','#589448','#4460a0'],warp:[[0,0],[1,0],[1,1],[0,1]]});
  function normalizeSettings(input = {}) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) input = {};
    const num = (k,a,b) => clamp(Number.isFinite(Number(input[k])) ? Number(input[k]) : defaults[k],a,b);
    return {
      preset:input.preset==='scene'||animations.some(a=>a.id===input.preset)?input.preset:defaults.preset,
      cast:input.cast==='solo'?'solo':'all', character:Math.round(num('character',0,4)),
      duration:num('duration',6,180),size:num('size',.10,.48),energy:num('energy',.25,1.8),
      tempo:num('tempo',.5,2),ground:num('ground',.45,.95),glow:num('glow',0,24),
      loop:typeof input.loop==='boolean'?input.loop:defaults.loop,
      colorWave:typeof input.colorWave==='boolean'?input.colorWave:defaults.colorWave,
      colorBlend:input.colorBlend==='steps'?'steps':'smooth',
      sizeWave:typeof input.sizeWave==='boolean'?input.sizeWave:defaults.sizeWave,sizeWaveAmount:num('sizeWaveAmount',.1,1.2),
      direction:['ltr','rtl','alternate'].includes(input.direction)?input.direction:defaults.direction,
      random:typeof input.random==='boolean'?input.random:defaults.random,randomSeed:Math.floor(num('randomSeed',1,4294967295)),
      randomEffects:typeof input.randomEffects==='boolean'?input.randomEffects:defaults.randomEffects,
      enabledActions:Object.fromEntries(animations.map(a=>[a.id,typeof input.enabledActions?.[a.id]==='boolean'?input.enabledActions[a.id]:enabledActions[a.id]])),
      colors:defaults.colors.map((c,i)=>/^#[0-9a-f]{6}$/i.test(input.colors?.[i])?input.colors[i]:c),
      warp:root.ProjectionWarp?root.ProjectionWarp.normalize(input.warp):defaults.warp.map(p=>[...p])
    };
  }
  function randomShowSettings(input){
    const s=normalizeSettings(input),enabled={...s.enabledActions};
    for(const id of ['swap','chase','solo','ball','confetti','peek','kick',...(root.StageAntics?.ids||[])])enabled[id]=true;
    enabled.sleep=false;
    return normalizeSettings({...s,preset:'scene',cast:'all',random:true,randomEffects:true,loop:true,sizeWave:true,colorWave:true,enabledActions:enabled,
      duration:Math.max(s.duration,Object.values(enabled).filter(Boolean).length*3)});
  }
  function addCollectionSettings(input){
    const s=normalizeSettings(input),enabled={...s.enabledActions};
    for(const id of root.StageCollection?.ids||[])enabled[id]=true;
    return normalizeSettings({...s,preset:'scene',cast:'all',loop:true,enabledActions:enabled,duration:Math.max(s.duration,Object.values(enabled).filter(Boolean).length*3)});
  }
  const rest = [
    {hip:[-.085,0],knee:[-.145,.27],ankle:[-.15,.50]},
    {hip:[.105,0],knee:[.155,.27],ankle:[.17,.50]}
  ];
  const UPPER=.285,LOWER=.275,SOLE=.06;
  const mod=(x,n)=>((x%n)+n)%n;
  const wrapStage=x=>mod(x+.20,1.40)-.20;
  // Playback controls decide when the clock stops. Motion always receives its absolute time.
  function playhead(s,seconds){if(seconds<=s.duration)return clamp(seconds,0,s.duration);return mod(seconds,s.duration)||s.duration;}
  function loopIndex(s,seconds){return Math.max(0,Math.ceil(seconds/s.duration)-1);}
  function randomUnit(seed,salt){let x=((seed||1)^Math.imul(salt+1,0x9e3779b9))>>>0||1;x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;}
  function sceneSegments(s,cycle=0){
    if(s.preset!=='scene')return [{action:s.preset,start:0,end:1}];
    const enabled=s.enabledActions||enabledActions;
    let selected=animations.filter(a=>enabled[a.id]);
    if(!selected.length)return [{action:'idle',start:0,end:1}];
    if(s.random){
      const surprise=enabled.solo&&enabled.run;
      if(surprise)selected=selected.filter(a=>a.id!=='solo');
      let state=((s.randomSeed||1)^Math.imul(cycle+1,0x9e3779b9))>>>0||1;
      for(let i=selected.length-1;i>0;i--){
        state^=state<<13;state^=state>>>17;state^=state<<5;
        const j=Math.floor((state>>>0)/4294967296*(i+1));[selected[i],selected[j]]=[selected[j],selected[i]];
      }
      if(surprise&&randomUnit(s.randomSeed,cycle+113)<.4)selected.splice(selected.findIndex(a=>a.id==='run')+1,0,animations.find(a=>a.id==='solo'));
    }
    return selected.map((a,i)=>({action:a.id,start:i/selected.length,end:(i+1)/selected.length}));
  }
  function sampleColor(s,seconds,index,stageX=.5){
    const effects=sampleEffects(s,seconds);
    if(!effects.colorWave)return s.colors[index];
    const elapsed=Math.max(0,seconds);
    const phase=Math.max(0,elapsed*s.tempo/1.5-clamp(stageX,0,1)*.85);
    const step=Math.floor(phase),blend=smooth(.55,1,phase-step);
    const a=s.colors[mod(index+step,5)],b=s.colors[mod(index+step+1,5)];
    if(s.colorBlend==='steps')return !effects.automatic||effects.weight>.5?a:s.colors[index];
    const target=blendColor(a,b,blend);
    return effects.automatic?blendColor(s.colors[index],target,effects.weight):target;
  }
  function blendColor(a,b,blend){return '#'+[1,3,5].map(offset=>Math.round(mix(parseInt(a.slice(offset,offset+2),16),parseInt(b.slice(offset,offset+2),16),blend)).toString(16).padStart(2,'0')).join('');}
  function sceneContext(s,seconds){
    const elapsed=Math.max(0,Number.isFinite(seconds)?seconds:0),t=playhead(s,elapsed),cycle=loopIndex(s,elapsed);
    const segments=sceneSegments(s,cycle),f=t/s.duration,index=segments.findIndex(seg=>f<seg.end),segmentIndex=index<0?segments.length-1:index,segment=segments[segmentIndex];
    const progress=clamp((f-segment.start)/(segment.end-segment.start),0,1),length=s.duration*(segment.end-segment.start);
    const multi=s.preset==='scene'&&segments.length>1;
    const local=multi?progress*length:elapsed;
    const storyBeat=segment.action==='swap'?1.25:1.4;
    const storyLocal=multi&&['swap','ball','confetti','peek','kick'].includes(segment.action)?progress*Math.max(length,storyBeat/s.tempo):local;
    return {elapsed,cycle,segmentIndex,action:segment.action,progress,length,local,storyLocal,
      weight:multi?Math.min(smooth(0,.08,progress),1-smooth(.92,1,progress)):1,
      opacity:multi?smooth(0,.035,progress)*(1-smooth(.965,1,progress)):1};
  }
  function sampleEffects(s,seconds,context){
    const automatic=s.preset==='scene'&&s.random&&s.randomEffects;
    if(!automatic)return {automatic:false,sizeWave:s.sizeWave,colorWave:s.colorWave,weight:1};
    context=context||sceneContext(s,seconds);
    const salt=context.cycle*1031+context.segmentIndex*37;
    return {automatic:true,sizeWave:!!s.sizeWave&&randomUnit(s.randomSeed,salt+701)<.4,
      colorWave:!!s.colorWave&&randomUnit(s.randomSeed,salt+1907)<.5,
      weight:Math.min(smooth(0,.06,context.progress),1-smooth(.94,1,context.progress))};
  }
  function swapState(n,index,local){
    if(n<2)return {x:.5,offsetY:0,scale:1,depth:0};
    const path=[...Array(n-1).keys(),...Array(n-1).keys()].map((v,i)=>i<n-1?v:n-2-v);
    const phase=mod(local/1.25,path.length),step=Math.floor(phase),u=phase-step,order=Array.from({length:n},(_,i)=>i);
    for(let i=0;i<step;i++){const a=path[i];[order[a],order[a+1]]=[order[a+1],order[a]];}
    const a=path[step],position=order.indexOf(index),moving=position===a||position===a+1,sign=position===a?1:-1;
    return {x:(position+.5+(moving?sign*smooth(0,1,u):0))/n,offsetY:moving?(sign===1?-.95:.65)*Math.sin(Math.PI*u):0,scale:1+(moving?sign*.10*Math.sin(Math.PI*u):0),depth:moving?sign:0};
  }
  function relayState(n,local,tempo){
    const phase=local*tempo/1.4,step=Math.floor(phase),u=mod(phase,1),count=Math.max(1,2*(n-1)),p=mod(step,count);
    const sender=n<2?0:p<n-1?p:2*(n-1)-p,receiver=n<2?0:p<n-1?p+1:sender-1;
    return {sender,receiver,direction:receiver<sender?-1:1,u,step};
  }
  function pulseState(n,local,tempo){const phase=local*tempo/1.4;return {index:mod(Math.floor(phase),n),u:mod(phase,1)};}
  function kickTarget(u,start,rootHeight){
    const chamber=[-.035,.20],extension=[.44,.07],floor=[start,rootHeight-SOLE];
    let a,b,v;
    if(u<.20){a=floor;b=chamber;v=smooth(0,.20,u);}
    else if(u<.42){a=chamber;b=extension;v=smooth(.20,.42,u);}
    else if(u<.58)return extension;
    else if(u<.80){a=extension;b=chamber;v=smooth(.58,.80,u);}
    else {a=chamber;b=floor;v=smooth(.80,1,u);}
    return [mix(a[0],b[0],v),mix(a[1],b[1],v)];
  }
  function solveLeg(hip,target,bend,footAngle=0,contact=false,facing=1) {
    const dx=target[0]-hip[0],dy=target[1]-hip[1],distance=Math.hypot(dx,dy);
    const reach=clamp(distance,Math.abs(UPPER-LOWER)+1e-5,UPPER+LOWER-1e-5);
    const angle=Math.atan2(dy,dx);
    const offset=Math.acos(clamp((UPPER*UPPER+reach*reach-LOWER*LOWER)/(2*UPPER*reach),-1,1));
    const knee=[hip[0]+UPPER*Math.cos(angle-bend*offset),hip[1]+UPPER*Math.sin(angle-bend*offset)];
    const ankle=[hip[0]+reach*Math.cos(angle),hip[1]+reach*Math.sin(angle)];
    return {hip,knee,ankle,footAngle,contact,facing};
  }
  function sampleActor(s, seconds, index, aspect=16/9) {
    const context=sceneContext(s,seconds),{elapsed}=context,t=playhead(s,elapsed);
    const n=s.cast==='all'?5:1, order=s.cast==='all'?index:0;
    const slot=(order+.5)/n;
    let x=slot,action=context.action,local=context.local,travelSpeed=0,motionWeight=context.weight,jumpOffset=order*.065;
    let scale=1,offsetY=0,opacity=context.opacity,depth=0,floorClip=false,actorFacing=1,kickInfo=null;
    if(s.preset==='scene') {
      if(action==='run'){x=wrapStage(slot+1.4*context.progress);travelSpeed=1.4/context.length;local=elapsed;}
      jumpOffset=order*.065*Math.sin(context.progress*Math.PI);
      if(action==='idle')motionWeight=0;
    } else if(action==='run') {
      x=n===1?-.25+1.5*t/s.duration:wrapStage(slot+1.4*t/s.duration);
      travelSpeed=(n===1?1.5:1.4)/s.duration;
    }
    const direction=s.direction==='rtl'||s.direction==='alternate'&&context.cycle%2?-1:1;
    let rigAction=action;
    if(action==='run'){
      actorFacing=direction;
      if(direction<0)x=n===1&&s.preset!=='scene'?1-x:wrapStage(slot-1.4*context.progress);
    }
    if(action==='swap'){
      const state=swapState(n,order,context.storyLocal*s.tempo);rigAction='walk';
      x=mix(slot,state.x,motionWeight);offsetY=state.offsetY*motionWeight;scale=1+(state.scale-1)*motionWeight;depth=state.depth;
    }
    if(action==='chase'||action==='solo'){
      const count=action==='solo'?1:n,star=Math.floor(randomUnit(s.randomSeed,context.cycle+31)*n);
      if(action==='solo'&&order!==star)opacity=0;
      const position=action==='solo'?0:order,distance=1.5+(count-1)*.18;
      const progress=context.progress,lag=.18*position*(1-.22*Math.sin(progress*Math.PI)**4);
      const leader=-.25+distance*(progress+.04*Math.sin(TAU*progress));
      x=direction>0?leader-lag:1-(leader-lag);actorFacing=direction;
      const velocity=distance*(1+.04*TAU*Math.cos(TAU*progress))+.18*position*.88*Math.PI*Math.sin(progress*Math.PI)**3*Math.cos(progress*Math.PI);
      travelSpeed=velocity/context.length;local=elapsed;rigAction='run';
    }
    if(action==='ball'){
      const relay=relayState(n,context.storyLocal,s.tempo);actorFacing=relay.direction;
      rigAction=order===relay.sender?'kick':'idle';
      if(rigAction==='kick')kickInfo={leg:relay.sender%2,u:relay.u};
    }
    if(action==='confetti'){
      const pulse=pulseState(n,context.storyLocal,s.tempo);
      if(order===pulse.index){
        scale*=1-.55*smooth(0,.25,pulse.u)*(1-smooth(.65,.95,pulse.u));
        opacity*=1-smooth(.25,.40,pulse.u)+smooth(.65,.90,pulse.u);
      }
      rigAction='idle';
    }
    if(action==='peek'){
      const pulse=pulseState(n,context.storyLocal,s.tempo),reveal=order===pulse.index?Math.sin(Math.PI*pulse.u)**2:0;
      offsetY=2.2-1.45*reveal;floorClip=true;rigAction='idle';
    }
    const theatrical=root.StageAntics?.actor(s,context,index);
    if(theatrical){
      x=theatrical.x;rigAction=theatrical.rigAction;offsetY=theatrical.offsetY??0;scale=theatrical.scale??1;
      depth=theatrical.depth??0;actorFacing=theatrical.facing??1;travelSpeed=theatrical.travelSpeed??0;
      local=theatrical.local??context.elapsed;
      kickInfo=theatrical.kickInfo??kickInfo;
    }
    const effects=sampleEffects(s,seconds,context);
    if(effects.sizeWave){
      const pulse=pulseState(n,elapsed,s.tempo);
      if(order===pulse.index)scale*=1+s.sizeWaveAmount*Math.sin(Math.PI*pulse.u)**2*effects.weight;
    }
    const e=s.energy*(theatrical?.motionEnergy??1),phaseIndex=theatrical?.phaseIndex??order;
    let lean=0,lift=0,head=0,rootHeight=.60,phase=0,scaleX=1,hipSpread=.09,targets=[],bend=[-1,1],footAngles=[0,0],contact=[true,true],facing=[-1,1];
    if(rigAction==='run') {
      const speed=travelSpeed*aspect*1.8/s.size;
      const period=Math.min(.64/s.tempo,.60/(Math.max(.001,speed)*.44));
      const cycle=local/period+phaseIndex*.13;
      phase=cycle*TAU;hipSpread=.025;bend=[1,1];facing=[1,1];
      const reach=clamp(speed*period*.44/2,.001,.30);
      const safeHeight=SOLE+Math.sqrt(Math.max(.01,.55*.55-(reach+hipSpread)**2));
      rootHeight=Math.min(safeHeight,.50+.022*e*Math.cos(phase*2));
      lean=.10+.025*e;head=-.025*Math.sin(phase*2);
      for(let i=0;i<2;i++){
        const p=mod(cycle+i*.5,1),stance=p<.44;
        contact[i]=stance;
        if(stance){targets[i]=[mix(reach,-reach,p/.44),rootHeight-SOLE];}
        else{
          const u=(p-.44)/.56;
          const recovery=u<.24?Math.sin(u/.24*Math.PI/2):Math.cos((u-.24)/.76*Math.PI/2);
          const clearance=recovery*(.25+.07*e);
          const heelBack=u<.46?.11*Math.sin(u/.46*Math.PI):0;
          targets[i]=[mix(-reach,reach,smooth(.20,1,u))-heelBack,rootHeight-SOLE-clearance];
          footAngles[i]=-.7*recovery;
        }
      }
    } else if(rigAction==='jump') {
      const cycle=mod(local*s.tempo+jumpOffset,2)/2;
      phase=cycle*TAU;
      const crouch=Math.min(.22,.15*e);
      if(cycle<.18)rootHeight=.60-crouch*smooth(0,.18,cycle);
      else if(cycle<.24)rootHeight=.60-crouch*(1-smooth(.18,.24,cycle));
      else if(cycle<.72){
        const u=(cycle-.24)/.48;
        lift=.80*e*4*u*(1-u);rootHeight=.60+lift;
        const tuck=.075*Math.sin(Math.PI*u);
        targets=[[-.15,.54-tuck],[.15,.54-tuck]];
        footAngles=[.18*Math.sin(Math.PI*u),-.18*Math.sin(Math.PI*u)];contact=[false,false];
      }else if(cycle<.88)rootHeight=.60-crouch*Math.sin((cycle-.72)/.16*Math.PI);
      else rootHeight=.60;
      lean=.025*Math.sin(phase);head=-.025*Math.sin(phase*2);
      if(!targets.length)targets=[[-.15,rootHeight-SOLE],[.15,rootHeight-SOLE]];
    } else if(['dance','sidestep','shuffle'].includes(rigAction)) {
      const side=rigAction==='sidestep',shuffle=rigAction==='shuffle',beatLength=side?.70:shuffle?.30:.60;
      const beat=mod(local*s.tempo/beatLength+phaseIndex*.20,4),step=Math.floor(beat),u=beat-step,v=smooth(0,1,u),width=side?1.35:shuffle?.70:1;
      phase=beat*Math.PI/2;
      const steps=[{left:-.18,right:.12,body:-.03},{left:-.18,right:.34,body:.10},{left:.12,right:.34,body:.22},{left:-.18,right:.34,body:.10},{left:-.18,right:.12,body:-.03}];
      const a=steps[step],b=steps[step+1],sway=mix(a.body,b.body,v)*Math.min(e,1.35)*width;
      x+=sway*s.size/(1.8*aspect)*motionWeight;
      rootHeight=(shuffle?.48:.565)-.025*e*Math.cos(beat*TAU);
      lean=(shuffle?.11:side?.035:.07)*e*Math.sin(phase);head=-.045*e*Math.sin(phase+.5)+.015*Math.sin(beat*TAU);
      targets=['left','right'].map((key,i)=>{
        const moving=a[key]!==b[key],height=moving?(shuffle?.03:side?.09:.14)*Math.min(e,1.5)*Math.sin(Math.PI*u):0;
        contact[i]=!moving||height<1e-6;
        footAngles[i]=moving?(i===0?1:-1)*.25*Math.sin(Math.PI*u):0;
        return [mix(a[key],b[key],v)*Math.min(e,1.35)*width-sway,rootHeight-SOLE-height];
      });
    } else if(rigAction==='walk'||rigAction==='march'){
      const marching=rigAction==='march',cycle=local*s.tempo/(marching?1.1:1.25)+phaseIndex*.13;
      phase=cycle*TAU;hipSpread=.035;bend=[1,1];facing=[1,1];
      rootHeight=(marching?.555:.54)+.012*e*Math.cos(phase*2);lean=marching?.025:.065;head=-.025*Math.sin(phase*2);
      targets=[0,1].map(i=>{
        const p=mod(cycle+i*.5,1),stance=p<.6,u=stance?p/.6:(p-.6)/.4,reach=marching?.07:.16;
        contact[i]=stance;
        const clearance=stance?0:Math.sin(Math.PI*u)*(marching?.30:.13)*Math.min(e,1.4);
        footAngles[i]=stance?0:-.3*Math.sin(Math.PI*u);
        return [stance?mix(reach,-reach,u):mix(-reach,reach,smooth(0,1,u)),rootHeight-SOLE-clearance];
      });
    } else if(['sway','bow','twist','squat','kick','spin'].includes(rigAction)){
      const period=animations.find(a=>a.id===rigAction).period,cycle=(rigAction==='kick'?context.storyLocal:local)*s.tempo/period;
      phase=cycle*TAU;
      const wave=Math.sin(phase),pulse=(1-Math.cos(phase))/2;
      let sway=0;
      if(rigAction==='sway'){sway=.15*Math.min(e,1.4)*wave;lean=.12*e*wave;head=-.05*wave;rootHeight=.56;}
      if(rigAction==='bow'){lean=.48*Math.min(e,1.3)*pulse;head=.08*pulse;rootHeight=.57-.07*pulse;}
      if(rigAction==='twist'){scaleX=.76+.24*Math.cos(phase);lean=.06*e*wave;head=-.10*e*wave;rootHeight=.55-.018*pulse;}
      if(rigAction==='squat'){rootHeight=.60-.22*Math.min(e,1.5)*pulse;hipSpread=.12;lean=.035*wave;}
      if(rigAction==='kick'){rootHeight=.535;lean=-.10*Math.sin(Math.PI*(kickInfo?.u??mod(cycle*2,1)));}
      if(rigAction==='spin'){scaleX=Math.cos(phase);rootHeight=.565-.012*Math.sin(phase*2);lean=.025*wave;head=.025*wave;}
      x+=sway*s.size/(1.8*aspect)*motionWeight;
      const spread=rigAction==='squat'?.23:.15;
      targets=[[-spread-sway,rootHeight-SOLE],[spread-sway,rootHeight-SOLE]];
      if(rigAction==='kick'){
        const beat=mod(cycle,1)*2,leg=kickInfo?.leg??Math.floor(beat),u=kickInfo?.u??(beat-Math.floor(beat));
        contact[leg]=u<.002||u>.998;facing[leg]=1;
        targets[leg]=kickTarget(u,targets[leg][0],rootHeight);
        footAngles[leg]=-.06*Math.sin(Math.PI*u);bend[leg]=1;
      }
    }
    if(theatrical?.posture){
      const p=theatrical.posture;rootHeight=p.rootHeight??rootHeight;lean=p.lean??lean;head=p.head??head;scaleX=p.scaleX??scaleX;
      targets=p.targets??targets;contact=p.contact??contact;bend=p.bend??bend;
    }
    if(!targets.length)targets=[[-.15,rootHeight-SOLE],[.15,rootHeight-SOLE]];
    const hips=[rotate([-hipSpread,0],lean),rotate([hipSpread,0],lean)];
    let supportedHeight=rootHeight;
    for(let i=0;i<2;i++)if(contact[i]){
      const dx=targets[i][0]-hips[i][0];
      supportedHeight=Math.min(supportedHeight,SOLE+hips[i][1]+Math.sqrt(Math.max(0,(UPPER+LOWER-.001)**2-dx*dx)));
    }
    const supportDrop=supportedHeight-rootHeight;
    if(supportDrop<0){rootHeight=supportedHeight;targets=targets.map(([x,y])=>[x,y+supportDrop]);}
    let legs=targets.map((target,i)=>solveLeg(hips[i],target,bend[i],footAngles[i],contact[i],facing[i]));
    if(motionWeight<1){
      const w=motionWeight;
      const standing=[solveLeg([-.09,0],[-.15,.54],-1,0,true,-1),solveLeg([.09,0],[.15,.54],1,0,true,1)];
      legs=legs.map((leg,i)=>{
        const out={...leg,footAngle:leg.footAngle*w,facing:mix(standing[i].facing,leg.facing,w)};
        for(const joint of ['hip','knee','ankle'])out[joint]=leg[joint].map((v,k)=>mix(standing[i][joint][k],v,w));
        return out;
      });
      rootHeight=mix(.60,rootHeight,w);lift*=w;lean*=w;head*=w;scaleX=mix(1,scaleX,w);
    }
    return {x,action,rigAction,lift,lean,head,squat:0,rootHeight,legs,phase,scaleX,scale,offsetY,opacity:clamp(opacity,0,1),depth,floorClip,facing:actorFacing,motionWeight,
      ...(theatrical?{role:theatrical.role,rotation:theatrical.rotation,groundRotation:theatrical.groundRotation,hideSymbols:theatrical.hideSymbols,hideLegs:theatrical.hideLegs,drawingTip:theatrical.drawingTip}: {})};
  }
  function transformBody(point,pose) {
    const [x,y]=point;
    const pelvisWeight=smooth(-.26,.025,y);
    const bodyX=x*(1-pelvisWeight*((pose.rigAction||pose.action)==='run'?.06+.22*(pose.motionWeight??1):.06));
    const headWeight=1-smooth(-.38,-.24,y);
    const h=rotate([bodyX,y+.27],pose.head*headWeight);
    return rotate([h[0],h[1]-.27],pose.lean);
  }
  function sampleProps(s,seconds){
    const context=sceneContext(s,seconds),n=s.cast==='all'?5:1,props=[],alpha=context.opacity;
    if(context.action==='ball'||context.action==='cloudball'){
      const relay=context.action==='cloudball'?root.StageAntics.cloudRelay(s,context):relayState(n,context.storyLocal,s.tempo),u=smooth(.22,.78,relay.u),reach=s.size*.16/(16/9);
      const from=(relay.sender+.5)/n+reach*relay.direction,to=(relay.receiver+.5)/n-reach*relay.direction;
      const previous=mod(relay.step-1,Math.max(1,2*(n-1))),previousDirection=n<2?1:previous<n-1?1:-1;
      const incoming=(relay.sender+.5)/n-reach*previousDirection;
      const x=relay.u<.22?mix(incoming,from,smooth(0,.22,relay.u)):mix(from,to,u);
      props.push({type:'symbol',symbol:'cloud',role:'ball',part:mod(relay.step,3),x,y:s.ground-.025-.16*Math.sin(Math.PI*u),h:.065,rotation:context.action==='cloudball'?.12*Math.sin(Math.PI*u):TAU*u,color:s.colors[4],opacity:alpha});
    }
    if(context.action==='confetti'){
      const pulse=pulseState(n,context.storyLocal,s.tempo),age=(pulse.u-.25)/.60;
      if(age>0&&age<1){
        const actor=sampleActor(s,seconds,pulse.index),center=s.ground-s.size*.64;
        for(let i=0;i<20;i++){
          const angle=i/20*TAU+randomUnit(s.randomSeed,i)*.28,speed=.65+randomUnit(s.randomSeed,i+91)*.45;
          props.push({type:'circle',x:actor.x+Math.cos(angle)*s.size*.55*age*speed/(16/9),y:center+Math.sin(angle)*s.size*.55*age*speed+.12*age*age,r:.0035+.0015*(i%3),color:s.colors[i%5],opacity:Math.sin(Math.PI*age)*alpha});
        }
      }
    }
    if(context.action==='peek')for(let i=0;i<n;i++)props.push({type:'ellipse',x:(i+.5)/n,y:s.ground+.003,rx:s.size*.19,ry:.007,color:s.colors[s.cast==='all'?i:s.character],opacity:.3*alpha,behind:true});
    return props.concat(root.StageAntics?.props(s,context)||[]);
  }
  root.Motion={defaults,animations,normalizeSettings,randomShowSettings,addCollectionSettings,sceneSegments,playhead,loopIndex,sceneContext,sampleEffects,sampleColor,sampleActor,sampleProps,transformBody,skinPoint:transformBody,solveLeg,rest,rotate,sceneDuration:s=>s.duration};
})(globalThis);
