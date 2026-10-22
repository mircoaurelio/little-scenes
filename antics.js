(function(root){
  'use strict';
  const TAU=Math.PI*2,aspect=16/9,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const mix=(a,b,t)=>a+(b-a)*t,mod=(v,n)=>((v%n)+n)%n;
  const ease=v=>{v=clamp(v);return v*v*(3-2*v);};
  const definitions=[
    ['car','Eye car','▰','Eye wheels and a chaotic tow',10],
    ['tag','Tag!','☞','You are it! Pass it on',10],
    ['disco','Eye disco','✧','An eye mirror ball and flying symbols',12],
    ['hide','Hide behind friends','◐','A very unconvincing hiding place',12],
    ['chat','Symbol chat','☏','They speak in their own symbols',12],
    ['cloudball','Cloud football','☁','Kick the original clouds around',12],
    ['juggle','Lightning juggler','ϟ','Three lightning clubs in the air',10],
    ['sleep','Sleep & roll','☾','The mushroom snores and somersaults',12],
    ['sword','Stripe sword','†','A toy sword made of its own bars',10],
    ['draw','Living scribble','〰','Watch the original squiggle being drawn',12]
  ];
  const animations=definitions.map(([id,name,symbol,hint,period])=>Object.freeze({id,name,symbol,hint,period,duration:period}));
  const ids=animations.map(a=>a.id),symbols=['bolt','hat','bars','crest','cloud'];
  const ornaments=[[5,6,7],[],[4,5,6,7],[0],[3,4,5]];
  function curves(start,segments){
    const points=[start];let from=start;
    for(const [a,b,end] of segments){
      for(let i=1;i<=12;i++){const u=i/12,v=1-u;points.push([0,1].map(k=>v*v*v*from[k]+3*v*v*u*a[k]+3*v*u*u*b[k]+u*u*u*end[k]));}
      from=end;
    }
    return points;
  }
  function clock(s,c){
    const period=animations.find(a=>a.id===c.action)?.period||12;
    const multi=s.preset==='scene'&&root.Motion.sceneSegments(s,c.cycle).length>1;
    return multi?c.progress:mod(c.elapsed*s.tempo/period,1);
  }
  function base(s,c){const n=s.cast==='all'?5:1,p=clock(s,c);return {n,p,t:p*TAU,unit:s.size/1.8,direction:s.direction==='rtl'||s.direction==='alternate'&&c.cycle%2?-1:1};}
  function cloudRelay(s,c){
    const {n,p}=base(s,c),count=Math.max(1,2*(n-1)),phase=p*count,step=Math.floor(phase),u=mod(phase,1),k=mod(step,count);
    const sender=n===1?0:k<n-1?k:2*(n-1)-k,receiver=n===1?0:k<n-1?k+1:sender-1;
    return {sender,receiver,direction:receiver<sender?-1:1,u,step};
  }
  function carLayout(s,c){const b=base(s,c),x=-.52+2.64*b.p;return {...b,x,driver:s.cast==='all'?1:0};}
  function scribble(s,c){
    const {p}=base(s,c),poly=root.CharacterArtwork?.[3]?.polygons[0]||[[0,0],[1,1]];
    const xs=poly.map(v=>v[0]),ys=poly.map(v=>v[1]),xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys);
    const path=poly.filter((_,i)=>i%3===0).map(([x,y])=>[.38+(x-xmin)/(xmax-xmin)*.27,s.ground-.30+(y-ymin)/(ymax-ymin)*.13]);
    const count=Math.max(2,Math.min(path.length,Math.ceil(ease(p/.76)*(path.length-1))+1));
    return {points:path.slice(0,count),opacity:1-ease((p-.91)/.09),p};
  }
  function actor(s,c,index){
    if(!ids.includes(c.action))return null;
    const {n,p,t,unit,direction}=base(s,c),actual=s.cast==='all'?index:s.character,slot=(index+.5)/n;
    const protagonist=id=>n===1||actual===id;
    const out={x:slot,rigAction:'idle',role:'audience',rotation:0,offsetY:0,depth:0,hideSymbols:false};
    if(c.action==='car'){
      const car=carLayout(s,c),driver=index===car.driver,rank=n===1?0:[4,3,2,0].indexOf(index);
      const forward=driver?car.x:car.x-.245-.15*rank;
      out.x=direction>0?forward:1-forward;out.facing=direction;out.role=driver?'driver':'towed';
      out.scale=driver?.76:.82;out.hideLegs=driver;out.rigAction=driver?'idle':'run';out.travelSpeed=2.64/c.length;
      out.offsetY=driver?-.39:0;
      out.rotation=driver?0:.18*Math.sin(t*3+rank);
      out.hideSymbols=!driver&&[0,3,4].includes(actual);
    }
    if(c.action==='tag'){
      const beat=p*n,seeker=Math.min(n-1,Math.floor(beat)),u=mod(beat,1);
      out.role=index===seeker?'seeker':'runner';out.rigAction='run';out.travelSpeed=.15;
      const angle=t+index*TAU/n+(index===seeker?.88*TAU/n*Math.sin(Math.PI*u)**2:0);
      out.x=.5+.34*Math.cos(angle);out.offsetY=0;out.depth=Math.sin(angle);
      
    }
    if(c.action==='disco'){
      out.rigAction='dance';out.rotation=.13*Math.sin(t*4+index);
      out.hideSymbols=actual!==1;
    }
    if(c.action==='hide'){
      const host=n===1?0:2,seeker=0,hide=Math.sin(Math.PI*p)**2;
      out.role=index===seeker?'seeker':index===host?'host':'hider';out.rigAction=index===seeker?'walk':'idle';
      if(index!==host&&index!==seeker){out.x=mix(slot,(host+.5)/n+.018*(index-host)+.045*Math.sin(t*5+index),hide);out.depth=-2;out.scale=1-.16*hide;}
      if(index===seeker){out.x=.5+.35*Math.cos(t);}
      if(index===host)out.scale=1+.12*hide;
    }
    if(c.action==='chat'){
      const speaker=Math.min(n-1,Math.floor(p*n));out.role=index===speaker?'speaker':'listener';
      
      out.rotation=(index===speaker?.07:.025)*Math.sin(t*12);out.hideSymbols=index===speaker&&actual!==1;
    }
    if(c.action==='cloudball'){
      const relay=cloudRelay(s,c),kicker=index===relay.sender;
      out.rigAction=kicker?'kick':'idle';out.role=kicker?'kicker':'receiver';out.hideSymbols=actual===4;out.facing=relay.direction;
      if(kicker)out.kickInfo={leg:relay.sender%2,u:relay.u};
    }
    if(c.action==='juggle'){
      if(protagonist(0)){
        out.x=.48;out.role='juggler';out.hideSymbols=true;out.rigAction='sway';out.motionEnergy=.4;
        
      }else{out.x=({1:.12,2:.29,3:.73,4:.89})[actual];out.rotation=.018*Math.sin(t*6+index);}
    }
    if(c.action==='sleep'){
      if(protagonist(1)){
        out.x=.5+.18*Math.sin(TAU*ease(clamp((p-.34)/.52)));
        out.role=p<.3||p>.87?'sleeper':'tumbler';out.groundRotation=true;
        out.rotation=p<.3?Math.PI/2:p<.4?Math.PI/2*(1-ease((p-.3)/.1)):p<.8?TAU*ease((p-.4)/.4):TAU+Math.PI/2*ease((p-.8)/.2);
        out.rigAction='squat';
      }else{out.x=({0:.12,2:.29,3:.75,4:.91})[actual];out.rigAction='walk';}
    }
    if(c.action==='sword'){
      if(protagonist(2)){out.x=.5;out.hideSymbols=true;out.role='swordsman';out.rigAction='sidestep';out.rotation=.08*Math.sin(t*2);}
      else{out.x=({0:.09,1:.26,3:.77,4:.93})[actual];out.rotation=.12*Math.sin(t*2+index);}
    }
    if(c.action==='draw'){
      if(protagonist(3)){
        const line=scribble(s,c),last=line.points.at(-1),first=line.points[0],reset=ease((p-.91)/.09),tip=last.map((v,i)=>mix(v,first[i],reset));out.drawingTip=tip;out.x=tip[0]-.055;
        out.hideSymbols=true;out.role='artist';out.rigAction='walk';
        
      }else{out.x=({0:.09,1:.23,2:.78,4:.93})[actual];}
    }
    return out;
  }
  function props(s,c){
    if(!ids.includes(c.action))return [];
    const M=root.Motion,{n,p,t,unit,direction}=base(s,c),alpha=c.opacity,items=[];
    const symbol=(name,x,y,h,color,extra={})=>items.push({type:'symbol',symbol:name,x,y,h,color,opacity:alpha,rotation:0,...extra});
    const line=(points,color,width=.005,extra={})=>items.push({type:'line',points,color,width,opacity:alpha,...extra});
    const polygon=(points,color,extra={})=>items.push({type:'polygon',points,color,opacity:alpha,...extra});
    const actorAt=i=>M.sampleActor(s,c.elapsed,i);
    const anchorAt=(i,h=[0,-.05])=>{
      const a=actorAt(i),u=unit*(a.scale??1),v=M.rotate(h,a.rotation||0);
      return [a.x+v[0]*u/aspect*(a.facing??1),s.ground+((a.offsetY??0)-a.rootHeight+v[1])*u];
    };
    if(c.action==='car'){
      const car=carLayout(s,c),x=car.x,y=s.ground;
      // All pieces share the same forward coordinates before an optional mirror.
      const outline=curves([-.142,-.07],[
        [[-.15,-.08],[-.15,-.10],[-.142,-.12]],
        [[-.132,-.152],[-.111,-.172],[-.08,-.175]],
        [[-.05,-.178],[.01,-.178],[.055,-.171]],
        [[.080,-.165],[.085,-.135],[.118,-.132]],
        [[.15,-.13],[.153,-.1],[.15,-.080]],
        [[.148,-.052],[.12,-.05],[.08,-.05]],
        [[.025,-.05],[-.07,-.05],[-.11,-.052]],
        [[-.125,-.052],[-.14,-.055],[-.142,-.07]]
      ]).map(([dx,dy])=>[x+dx,y+dy]);
      polygon(outline,s.colors[1],{role:'car-body'});
      line(curves([x+.025,y-.17],[[[x+.022,y-.23],[x+.025,y-.257],[x+.058,y-.25]],[[x+.068,y-.249],[x+.074,y-.245],[x+.078,y-.24]]]),s.colors[1],.009,{role:'windscreen'});
      for(const wheelX of [x-.082,x+.093])items.push({type:'ellipse',x:wheelX,y:y-.074,rx:.076,ry:.038,color:'#000000',opacity:alpha,role:'wheel-cutout'});
      symbol('eye',x-.082,y-.074,.073,s.colors[1],{role:'wheel',rotation:-t*6});
      symbol('eye',x+.093,y-.074,.073,s.colors[1],{role:'wheel',rotation:-t*6});
      symbol('eye',x+.035,y-.15,.035,s.colors[1],{role:'steering',rotation:-.3+.1*Math.sin(t*4)});
      if(n>1){
        const rope=[[x-.14,y-.09]];
        for(const rider of [4,3,2,0]){const anchor=anchorAt(rider);rope.push([direction>0?anchor[0]:1-anchor[0],anchor[1]]);}
        line(rope,s.colors[0],.006,{role:'tow',behind:true});
        symbol('cloud',x-.245,y-.37,.06,s.colors[4],{rotation:Math.sin(t*3),part:1});
        for(let k=0;k<3;k++)symbol('bolt',x-.69+.06*k,y-.40-.10*Math.sin(t*3+k)**2,.075,s.colors[0],{rotation:t*2+k,part:k});
        line([[x-.42,y-.39],[x-.46,y-.47],[x-.39,y-.50],[x-.33,y-.43]],s.colors[3],.009,{role:'chaos'});
      }
      if(direction<0)for(const item of items){if(item.x!==undefined)item.x=1-item.x;if(item.points)item.points=item.points.map(([px,py])=>[1-px,py]);if(item.rotation!==undefined)item.rotation=-item.rotation;}
    }
    if(c.action==='tag'){
      const seeker=Math.min(n-1,Math.floor(p*n)),a=actorAt(seeker);
      symbol('bolt',a.x,s.ground-s.size*1.1,.055,s.colors[0],{role:'tag',rotation:.3*Math.sin(t*5)});
    }
    if(c.action==='disco'){
      for(let i=0;i<5;i++){
        const anchor=.5+.30*Math.sin(t+i*1.3);
        polygon([[.5,.12],[anchor-.10,s.ground],[anchor+.10,s.ground]],s.colors[i],{behind:true,opacity:.11*alpha,role:'light-beam'});
      }
      line([[.5,0],[.5,.19]],s.colors[2],.003,{behind:true});symbol('eye',.5,.22,.13,s.colors[Math.floor(p*10)%5],{role:'mirrorball',rotation:t});
      for(let i=0;i<n;i++){
        const actual=s.cast==='all'?i:s.character,a=actorAt(i);
        if(actual!==1)symbol(symbols[actual],a.x+Math.sin(t*4+i)*.025,s.ground-s.size*1.08-Math.abs(Math.cos(t*4+i))*.04,.065,s.colors[actual],{rotation:.4*Math.sin(t*4+i)});
      }
    }
    if(c.action==='hide'){
      const seeker=0,a=actorAt(seeker);
      symbol('eye',a.x,s.ground-s.size*1.15,.055,s.colors[2],{role:'search',rotation:.25*Math.sin(t*4)});
    }
    if(c.action==='chat'){
      const speaker=Math.min(n-1,Math.floor(p*n)),actual=s.cast==='all'?speaker:s.character,a=actorAt(speaker);
      const x=clamp(a.x,.10,.90),y=s.ground-s.size*1.13;
      // One continuous cloud outline: the lower arc stops where the tail begins.
      const outline=curves([-.028,.055],[
        [[-.052,.05],[-.070,.032],[-.070,.004]],
        [[-.082,-.012],[-.076,-.042],[-.054,-.049]],
        [[-.050,-.075],[-.017,-.080],[-.004,-.065]],
        [[.024,-.085],[.055,-.070],[.056,-.049]],
        [[.080,-.044],[.083,-.016],[.069,-.003]],
        [[.080,.024],[.059,.053],[.026,.058]],
        [[.017,.062],[.011,.062],[.006,.060]]
      ]);
      outline.push([-.043,.086],outline[0]);
      line(outline.map(([dx,dy])=>[x+dx,y+dy]),s.colors[actual],.004,{role:'speech'});
      symbol(symbols[actual],x,y,.07,s.colors[actual],{rotation:.12*Math.sin(t*15),role:'spoken-symbol'});
    }
    if(c.action==='juggle'){
      const a=actorAt(0),u=unit*(a.scale??1),baseY=s.ground+((a.offsetY??0)-a.rootHeight-.95)*u;
      for(let i=0;i<3;i++){
        const phase=mod(p*6+i/3,1);
        symbol('bolt',a.x+.50*u/aspect*Math.sin(TAU*phase),baseY-.9*u*(1-Math.cos(TAU*phase))/2,.30*u,s.colors[0],{part:i,rotation:(phase*2+i)*TAU,role:'club'});
      }
    }
    if(c.action==='sleep'&&(p<.30||p>.87)){
      for(let i=0;i<3;i++)symbol('cloud',.59+i*.04,s.ground-.12-i*.05-.015*Math.sin(t*3),.025+i*.009,s.colors[1],{role:'snore',part:i,opacity:(.35+.2*i)*alpha});
    }
    if(c.action==='sleep'&&p>=.30&&p<=.87)symbol('eye',.5,s.ground-.39,.055,s.colors[1],{role:'dizzy',rotation:t*4});
    if(c.action==='sword'){
      const index=n===1?0:2,anchor=anchorAt(index,[.55,-.35]),angle=.45+.6*Math.sin(t*2);
      symbol('bar',anchor[0]+Math.sin(angle)*.070/aspect,anchor[1]-Math.cos(angle)*.070,.115,s.colors[2],{rotation:angle+Math.PI/2,role:'blade',part:0});
      symbol('bar',anchor[0],anchor[1],.040,s.colors[2],{rotation:angle,role:'guard',part:0});
      symbol('bar',anchor[0]-Math.sin(angle)*.018/aspect,anchor[1]+Math.cos(angle)*.018,.018,s.colors[2],{rotation:angle+Math.PI/2,role:'pommel',part:1});
    }
    if(c.action==='draw'){
      const art=scribble(s,c);line(art.points,s.colors[3],.012,{role:'drawing',opacity:art.opacity*alpha});
      const end=art.points.at(-1);symbol('bar',end[0],end[1],.03,s.colors[3],{rotation:-.65,role:'pencil'});
    }
    return items;
  }
  root.StageAntics={animations,ids,ornaments,actor,props,clock,cloudRelay};
})(globalThis);
