(function(root){
  'use strict';
  const TAU=Math.PI*2,ASPECT=16/9,mod=x=>((x%1)+1)%1;
  const clamp=v=>Math.max(0,Math.min(1,v)),ease=v=>{v=clamp(v);return v*v*(3-2*v);};
  const names=['Spark','Orbit','Halo','Wave','Cloud'];
  const makeRoles=rows=>rows.map(([name,description,rig],index)=>({index,character:names[index],name,description,rig}));
  const scenes=[
    {id:'pilates',name:'Pilates club',symbol:'◡',description:'Five quiet exercises, five different rhythms. A small studio on one line.',roles:makeRoles([
      ['Balance','A grounded leg supports a slow, deliberate side lift.','idle'],
      ['Mat roll','The mushroom tucks its legs and rocks across its rounded dome.','idle'],
      ['Bridge','A side-on bridge opens and closes with a slow breathing arch.','idle'],
      ['Seated twist','A low seated pose gently turns from one side to the other.','idle'],
      ['Breathing','The body widens softly while its cloud marks expand and settle.','idle']])},
    {id:'garden',name:'Plant nursery',symbol:'♧',description:'Sow, tend, irrigate, prune and rain. Every plant has its own caretaker.',roles:makeRoles([
      ['Seed sower','Lightning warms a shower of little seeds falling into the planter.','bow'],
      ['Soil keeper','The mushroom compresses the soil while small clods tumble into place.','squat'],
      ['Irrigator','The floating stripes arrange an arched stream of blue water.','sway'],
      ['Vine tender','A curling green vine reveals itself and gathers fresh leaves.','twist'],
      ['Rain maker','The original clouds release a gentle shower over a growing bud.','walk']])},
    {id:'kitchen',name:'Cloud kitchen',symbol:'⌂',description:'A tiny kitchen brigade: warm toast, soup, plates, noodles and cloud foam.',roles:makeRoles([
      ['Toast master','A lightning oven flips a small golden toast and lets it land.','squat'],
      ['Soup keeper','A mushroom lid lifts as the little soup pot bubbles below.','sway'],
      ['Plate stacker','The stripes separate, line up and settle into a tidy plate stack.','bow'],
      ['Noodle maker','Green squiggles curl out of a bowl and coil gently back inside.','walk'],
      ['Cloud whisk','Clouds stretch into foam above the mixing bowl, then settle.','twist']])},
    {id:'orchestra',name:'Tiny orchestra',symbol:'♫',description:'Lightning percussion, dome bass, stripe keys, a squiggle conductor and cloud choir.',roles:makeRoles([
      ['Percussion','Three lightning marks answer a row of small percussion beats.','walk'],
      ['Dome bass','The mushroom dome resonates like a soft, slow bass drum.','bow'],
      ['Stripe keys','A stripe xylophone lights its keys in a little repeating phrase.','twist'],
      ['Conductor','The green crest traces a broad rhythmic cue for the whole ensemble.','sway'],
      ['Cloud choir','The cloud marks sing a visual phrase across the top of the stage.','squat']])},
    {id:'atelier',name:'Print & pottery',symbol:'✎',description:'Five stations, one workshop: lightning prints, clay, weaving, calligraphy and cloud ink.',roles:makeRoles([
      ['Stamp printer','A lightning stamp presses down and leaves a short trail of golden prints.','bow'],
      ['Clay turner','A little dome of clay rotates and changes profile above a pottery wheel.','twist'],
      ['Stripe weaver','Horizontal stripe threads slide across a small woven panel.','walk'],
      ['Calligrapher','A green stroke draws its own curl, pauses and quietly clears.','squat'],
      ['Cloud printer','Cloud-shaped ink marks appear one at a time on a small print bed.','sway']])},
    {id:'laundry',name:'Bubble laundry',symbol:'≈',description:'Warm air, a tumbling wash, folded towels, a curling line and a cloud rinse.',roles:makeRoles([
      ['Warm-air dryer','Lightning becomes a warm-air fan that lifts and lowers a small cloth.','sway'],
      ['Tumble wash','A round eye window turns its small load inside the washing tub.','walk'],
      ['Towel folder','The stripe towels unfold, realign and stack into a neat pile.','squat'],
      ['Line arranger','A curling clothesline carries three tiny cloths through a soft wave.','bow'],
      ['Cloud rinse','Cloud soap circles the rinse bowl while small bubbles rise and disappear.','twist']])}
  ].map(scene=>({...scene,duration:12,period:12,hint:scene.description}));
  const ids=scenes.map(s=>s.id);
  function clock(s,c){
    const multi=s.preset==='scene'&&root.Motion.sceneSegments(s,c.cycle).length>1;
    return multi?mod(c.progress*s.tempo):mod(c.elapsed*s.tempo/12);
  }
  function actor(s,c,index){
    const scene=scenes.find(v=>v.id===c.action);if(!scene)return null;
    const i=s.cast==='all'?index:s.character,n=s.cast==='all'?5:1,p=clock(s,c),t=p*TAU,role=scene.roles[i];
    const period=root.Motion.animations.find(a=>a.id===role.rig)?.period||2.4;
    const out={x:(index+.5)/n,rigAction:role.rig,role:role.name,phaseIndex:0,local:(p*(i%3+1)+i*.13)*period/s.tempo,
      rotation:(.018+i*.009)*Math.sin(t*(i%2+1)+i*.7),offsetY:0,hideSymbols:i!==1&&c.action!=='pilates',groundRotation:false};
    if(c.action==='pilates'){
      const wave=Math.sin(t),breath=(1-Math.cos(t))/2;
      out.rotation=0;out.hideSymbols=i===4;
      if(i===0)out.posture={rootHeight:.53,lean:-.045*wave,head:.02*wave,targets:[[-.23+.08*wave,.18+.06*Math.cos(t)],[.14,.47]],contact:[false,true],bend:[-1,1]};
      if(i===1){out.rotation=Math.PI/2+.60*wave;out.groundRotation=true;out.posture={rootHeight:.40,lean:.06*Math.sin(t*2),targets:[[-.18,.22],[.14,.25]],contact:[false,false]};}
      if(i===2){out.rotation=Math.PI/2-.13*breath;out.groundRotation=true;out.posture={rootHeight:.36+.08*breath,lean:-.14*wave,head:.04*wave,targets:[[.28,.42],[.12,.45]],contact:[false,false],bend:[1,1]};}
      if(i===3){out.groundRotation=true;out.posture={rootHeight:.27,lean:.08*wave,head:-.10*wave,scaleX:.88+.10*Math.cos(t),targets:[[-.28,.18],[.28,.18]],contact:[false,false]};}
      if(i===4)out.posture={rootHeight:.55,lean:.025*wave,head:.015*wave,scaleX:1+.045*wave,targets:[[-.15,.49],[.15,.49]],contact:[true,true]};
    }
    return out;
  }
  function props(s,c){
    const scene=scenes.find(v=>v.id===c.action);if(!scene)return [];
    const M=root.Motion,p=clock(s,c),t=p*TAU,k=s.size/.30,items=[];
    const actors=s.cast==='all'?[0,1,2,3,4]:[s.character];
    for(const [order,i] of actors.entries()){
      const a=M.sampleActor(s,c.elapsed,order),x=a.x,y=s.ground,color=M.sampleColor(s,c.elapsed,i,x),phase=t+i*.65,wave=Math.sin(phase),pulse=(1-Math.cos(phase))/2;
      const owner={owner:i,activity:scene.roles[i].name,opacity:c.opacity};
      const add=shape=>items.push({...owner,...shape});
      const line=(points,ink=color,width=.004,role='stroke',extra={})=>add({type:'line',points,color:ink,width:width*k,role,...extra});
      const disc=(cx,cy,r,ink=color,role='dot',extra={})=>add({type:'circle',x:cx,y:cy,r:r*k,color:ink,role,...extra});
      const oval=(cx,cy,rx,ry,ink=color,role='oval',extra={})=>add({type:'ellipse',x:cx,y:cy,rx:rx*k,ry:ry*k,color:ink,role,...extra});
      const poly=(points,ink=color,role='shape',extra={})=>add({type:'polygon',points,color:ink,role,...extra});
      const sym=(symbol,cx,cy,h,ink=color,role='symbol',extra={})=>add({type:'symbol',symbol,x:cx,y:cy,h:h*k,color:ink,rotation:0,role,...extra});
      const leaf=(cx,cy,angle,ink=s.colors[3],size=.023)=>{
        const points=Array.from({length:24},(_,j)=>{const q=j/24*TAU,dx=Math.cos(q)*size*k,dy=Math.sin(q)*size*k*.38;return [cx+(dx*Math.cos(angle)-dy*Math.sin(angle))/ASPECT,cy+dx*Math.sin(angle)+dy*Math.cos(angle)];});
        poly(points,ink,'leaf');
      };
      const pot=(cx,role='planter')=>{
        poly([[cx-.027*k,y-.065*k],[cx+.027*k,y-.065*k],[cx+.020*k,y-.008*k],[cx-.020*k,y-.008*k]],color,role);
        line([[cx-.030*k,y-.067*k],[cx+.030*k,y-.067*k]],color,.006,role+'-rim');
      };
      const bowl=(cx,ink=color)=>{
        const points=Array.from({length:25},(_,j)=>{const q=j/24*Math.PI;return [cx+.042*k*Math.cos(q),y-.063*k+.045*k*Math.sin(q)];});
        poly(points,ink,'bowl');line([[cx-.042*k,y-.065*k],[cx+.042*k,y-.065*k]],ink,.005,'bowl-rim');
      };
      const drops=(cx,top,bottom,count,ink=s.colors[4],spread=.035)=>{
        for(let j=0;j<count;j++){
          const u=mod(p*2+j/count),dx=(j-(count-1)/2)*spread*k/Math.max(1,count-1),cy=top+(bottom-top)*u;
          line([[cx+dx,cy],[cx+dx+.002*k,cy+.010*k]],ink,.002,'water',{opacity:c.opacity*Math.sin(Math.PI*u)});
        }
      };
      if(c.action==='pilates'){
        line([[x-.075*k,y-.004*k],[x+.075*k,y-.004*k]],color,.006,'mat',{behind:true,opacity:.60*c.opacity});
        if(i===0){sym('bar',x+.037*k,y-.16*k,.035,color,'balance-mark',{part:1,rotation:.15*wave});}
        if(i===1){sym('hat',x,y-.012*k,.030,color,'roll-mark',{opacity:.55*c.opacity});}
        if(i===2){line(Array.from({length:25},(_,j)=>{const q=j/24*Math.PI;return [x+.055*k*Math.cos(q),y-.02*k-.033*k*Math.sin(q)*(1+.2*pulse)];}),color,.003,'bridge-guide',{behind:true,opacity:.55*c.opacity});}
        if(i===3){sym('crest',x+.045*k,y-.13*k,.030,color,'twist-mark',{rotation:.4*wave});}
        if(i===4){
          const ring=.105+.018*wave;
          line(Array.from({length:65},(_,j)=>{const q=j/64*TAU;return [x+Math.cos(q)*ring*k/ASPECT,y-.17*k+Math.sin(q)*ring*k];}),color,.002,'breath-ring',{behind:true,opacity:.35*c.opacity});
          for(let j=0;j<3;j++)sym('cloud',x+(.035+.01*wave)*k*Math.cos(j/3*TAU),y-.28*k+.027*k*Math.sin(j/3*TAU),.026+.004*wave,color,'breath-cloud',{part:j});
        }
      }
      if(c.action==='garden'){
        const cx=x+.054*k,growth=.35+.65*(1-Math.cos(t))/2,soil=y-.069*k,height=(.07+.10*growth)*k;
        pot(cx);oval(cx,soil,.044,.009,s.colors[1],'soil');
        const stem=Array.from({length:25},(_,j)=>{const u=j/24;return [cx+.008*k*Math.sin(u*Math.PI*2+i*.7)*u,soil-height*u];});
        line(stem,s.colors[3],.005,'stem');
        for(let j=1;j<=3;j++){const u=j/4;leaf(cx+.003*k*Math.sin(u*6+i),soil-height*u,(j%2?-.45:3.6),s.colors[3],.014+.007*growth);}
        const top=stem.at(-1);for(let j=0;j<4;j++)disc(top[0]+Math.cos(j/4*TAU)*.011*k/ASPECT,top[1]+Math.sin(j/4*TAU)*.011*k,.007,s.colors[(i+1)%5],'bud');
        if(i===0){
          sym('bolt',cx-.025*k,soil-.20*k,.035,color,'sun-mark',{rotation:.15*wave});
          for(let j=0;j<5;j++){const u=mod(p*2+j/5);disc(x+(.015+.04*u)*k,soil-.12*k*(1-u),.003,color,'seed',{opacity:c.opacity*Math.sin(Math.PI*u)});}
        }
        if(i===1)for(let j=0;j<3;j++){const u=mod(p*2+j/3);oval(cx-.025*k+.05*k*u,soil-.06*k*Math.sin(Math.PI*u),.008,.005,color,'compost',{opacity:c.opacity*Math.sin(Math.PI*u)});}
        if(i===2){sym('bars',cx-.032*k,soil-.12*k,.045,color,'irrigation');drops(cx,soil-.11*k,soil,6);}
        if(i===3){
          const count=10+Math.ceil(24*growth),vine=Array.from({length:count},(_,j)=>{const u=j/34;return [cx+.028*k*Math.sin(u*TAU*1.7),soil-.19*k*u];});
          line(vine,s.colors[3],.004,'vine');sym('crest',cx+.014*k,soil-.20*k,.04,color,'pruning-mark',{rotation:.25*wave});
        }
        if(i===4){sym('cloud',cx,soil-.20*k,.045,color,'rain-cloud',{part:1});drops(cx,soil-.18*k,soil-.02*k,5);}
      }
      if(c.action==='kitchen'){
        const cx=x+.05*k;
        if(i===0){
          poly([[cx-.028*k,y-.105*k],[cx+.028*k,y-.105*k],[cx+.028*k,y-.01*k],[cx-.028*k,y-.01*k]],color,'oven');
          sym('eye',cx,y-.055*k,.025,'#000000','oven-window');
          sym('bar',cx,y-(.13+.08*pulse)*k,.045,color,'toast',{part:1,rotation:phase});
          for(let j=0;j<3;j++)sym('bolt',cx+(j-1)*.012*k,y-.03*k,.025,color,'heat',{rotation:Math.PI/2,opacity:(.4+.4*pulse)*c.opacity});
        }
        if(i===1){bowl(cx);sym('hat',cx,y-(.10+.035*pulse)*k,.052,color,'soup-lid');for(let j=0;j<4;j++){const u=mod(p*2+j/4);disc(cx+(j-1.5)*.012*k,y-(.07+.10*u)*k,.004,color,'soup-bubble',{opacity:c.opacity*Math.sin(Math.PI*u)});}}
        if(i===2)for(let j=0;j<5;j++)sym('bar',cx+.009*k*Math.sin(phase+j*.6),y-(.025+j*.018+.025*pulse*(j===4?1:0))*k,.06,color,'plate',{part:j%2});
        if(i===3){bowl(cx);for(let j=0;j<3;j++)line(Array.from({length:35},(_,z)=>{const u=z/34;return [cx+(j-1)*.012*k+.010*k*Math.sin(u*TAU*1.5+phase),y-(.065+.10*u*(.65+.35*pulse))*k];}),color,.004,'noodle');}
        if(i===4){bowl(cx);for(let j=0;j<3;j++)sym('cloud',cx+.018*k*Math.sin(phase+j*2),y-(.09+j*.025+.02*pulse)*k,.025+.006*pulse,color,'foam',{part:j,rotation:.2*wave});}
      }
      if(c.action==='orchestra'){
        const cx=x+.045*k;
        if(i===0)for(let j=0;j<3;j++){oval(cx+(j-1)*.026*k,y-.035*k,.025,.012,color,'drum');sym('bolt',cx+(j-1)*.026*k,y-(.07+.025*(1+Math.sin(t*3+j*2)))*k,.032,color,'beater',{part:j,rotation:.4*Math.sin(t*3+j)});}
        if(i===1){sym('hat',cx,y-.055*k,.072,color,'bass-drum',{rotation:.06*wave});oval(cx,y-.02*k,.045,.010,color,'resonator',{opacity:(.4+.3*pulse)*c.opacity});}
        if(i===2)for(let j=0;j<5;j++)sym('bar',cx+(j-2)*.014*k,y-(.035+.015*j+.012*Math.sin(t*3+j))*k,.045,color,'key',{part:1,rotation:.08*Math.sin(t*3+j)});
        if(i===3){
          sym('crest',cx,y-.27*k,.070,color,'conductor-cue',{rotation:.30*wave});
          line(Array.from({length:45},(_,j)=>{const u=j/44;return [x+(.12*u-.06)*k,y-(.33+.025*Math.sin(u*TAU+phase))*k];}),color,.002,'rhythm-ribbon',{behind:true,opacity:.55*c.opacity});
        }
        if(i===4)for(let j=0;j<4;j++){const u=mod(p+j/4);sym('cloud',x+(.04-.14*u)*k,y-(.31+.025*Math.sin(u*TAU))*k,.024,color,'choir-note',{part:j%3,opacity:c.opacity*Math.sin(Math.PI*u)});}
      }
      if(c.action==='atelier'){
        const cx=x+.052*k,bed=y-.055*k;
        line([[cx-.035*k,y-.012*k],[cx+.035*k,y-.012*k]],color,.006,'workbench');
        if(i===0){sym('bolt',cx,bed-(.05+.035*pulse)*k,.045,color,'stamp',{rotation:.1*wave});for(let j=0;j<3;j++)sym('bolt',cx+(j-1)*.021*k,bed+.020*k,.020,color,'stamp-print',{part:j,opacity:(.3+.6*(1+Math.sin(phase-j))*.5)*c.opacity});}
        if(i===1){oval(cx,bed+.020*k,.050,.008,color,'pottery-wheel');sym('hat',cx,bed-(.006+.012*pulse)*k,.050,color,'clay',{rotation:.04*wave});}
        if(i===2){
          for(let j=0;j<5;j++)line([[cx+(j-2)*.013*k,bed-.08*k],[cx+(j-2)*.013*k,bed+.025*k]],color,.002,'warp-thread',{opacity:.5*c.opacity});
          for(let j=0;j<4;j++)sym('bar',cx+.007*k*Math.sin(phase+j),bed+(.016-j*.022)*k,.070,color,'weft',{part:1});
        }
        if(i===3){
          const count=Math.max(2,Math.ceil(50*ease(p/.72))),stroke=Array.from({length:count},(_,j)=>{const u=j/49;return [cx+(.075*u-.04)*k,bed-(.06+.03*Math.sin(u*TAU*1.5))*k];});
          line(stroke,color,.004,'calligraphy',{opacity:c.opacity*(1-ease((p-.86)/.14))});sym('crest',cx,bed-.12*k,.035,color,'ink-mark',{opacity:.65*c.opacity});
        }
        if(i===4)for(let j=0;j<3;j++){const u=mod(p+j/3);sym('cloud',cx+(j-1)*.024*k,bed-(.005+.07*(1-ease(u)))*k,.027,color,'ink-print',{part:j,opacity:c.opacity*Math.sin(Math.PI*u)});}
      }
      if(c.action==='laundry'){
        const cx=x+.050*k;
        if(i===0){
          for(let j=0;j<3;j++)sym('bolt',cx-.01*k,y-(.05+j*.035)*k,.030,color,'warm-air',{part:j,rotation:Math.PI/2,opacity:(.45+.35*pulse)*c.opacity});
          poly([[cx+.010*k,y-(.09+.025*pulse)*k],[cx+.045*k,y-(.09+.015*pulse)*k],[cx+.040*k,y-.025*k],[cx+.006*k,y-.030*k]],color,'drying-cloth');
        }
        if(i===1){
          pot(cx,'wash-tub');sym('eye',cx,y-.075*k,.048,color,'wash-window',{rotation:phase});
          for(let j=0;j<3;j++)disc(cx+Math.cos(phase+j*2)*.015*k,y-.075*k+Math.sin(phase+j*2)*.024*k,.004,s.colors[(j+2)%5],'tumble-load');
        }
        if(i===2)for(let j=0;j<5;j++)sym('bar',cx+.012*k*pulse*(j%2?1:-1),y-(.025+j*.018)*k,.065,color,'towel',{part:1,rotation:.12*wave*(j===4?1:0)});
        if(i===3){
          const path=Array.from({length:40},(_,j)=>{const u=j/39;return [cx+(.095*u-.047)*k,y-(.155+.012*Math.sin(u*TAU+phase))*k];});line(path,color,.003,'clothesline');
          for(let j=0;j<3;j++){const xx=cx+(j-1)*.032*k,yy=y-(.15+.012*Math.sin(j+phase))*k;poly([[xx-.011*k,yy],[xx+.011*k,yy],[xx+.014*k,yy+.055*k],[xx-.009*k,yy+.055*k]],color,'cloth');}
        }
        if(i===4){bowl(cx);sym('cloud',cx+.015*k*wave,y-.11*k,.045,color,'soap-cloud',{part:1,rotation:.20*wave});for(let j=0;j<5;j++){const u=mod(p*2+j/5);oval(cx+.025*k*Math.sin(u*4+j),y-(.07+.13*u)*k,.006,.006,color,'rinse-bubble',{opacity:c.opacity*Math.sin(Math.PI*u)});}}
      }
    }
    return items;
  }
  function settingsFor(id,character){
    if(!ids.includes(id))throw new Error('Unknown collection scene: '+id);
    return root.Motion.normalizeSettings({preset:id,duration:12,size:character===undefined?.28:.40,energy:.85,ground:.80,cast:character===undefined?'all':'solo',character:character??0,
      enabledActions:Object.fromEntries(root.Motion.animations.map(a=>[a.id,a.id===id]))});
  }
  function manifest(){
    return {format:'little-scenes-collection',version:1,title:'Collection 01 — Ensemble studies',loopSeconds:12,referenceFps:24,
      constraints:['original armless figures','black background','characters above standing baseline'],
      scenes:scenes.map(scene=>({id:scene.id,title:scene.name,description:scene.description,project:'presets/'+scene.id+'.json',settings:settingsFor(scene.id),
        beats:[{seconds:0,label:'Prepare'},{seconds:3,label:'Action'},{seconds:6,label:'Release'},{seconds:9,label:'Recover'}],
        roles:scene.roles.map(role=>({...role,project:'presets/'+scene.id+'-'+role.character.toLowerCase()+'.json',
          samples:[1.5,4.5,8.5].map(time=>({seconds:time,file:'frames/'+scene.id+'-'+role.character.toLowerCase()+'-'+time+'.svg'}))})),
        samples:[1.5,4.5,8.5].map(time=>({seconds:time,file:'frames/'+scene.id+'-'+time+'.svg'}))}))};
  }
  const A=root.StageAntics,oldActor=A.actor,oldProps=A.props;
  A.animations.push(...scenes.map(({id,name,symbol,hint,duration,period})=>({id,name,symbol,hint,duration,period})));
  A.ids.push(...ids);
  A.actor=(s,c,index)=>ids.includes(c.action)?actor(s,c,index):oldActor(s,c,index);
  A.props=(s,c)=>ids.includes(c.action)?props(s,c):oldProps(s,c);
  root.StageCollection={scenes,ids,actor,props,clock,settingsFor,manifest};
})(globalThis);
