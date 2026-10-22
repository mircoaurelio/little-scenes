(function(root) {
  'use strict';
  const torsoCache=new WeakMap();
  function torsoContours(figure){
    if(torsoCache.has(figure))return torsoCache.get(figure);
    const clipped=figure.polygons.map(poly=>{
      const out=[];
      for(let i=0;i<poly.length;i++){
        const a=poly[i],b=poly[(i+1)%poly.length],insideA=a[1]<=.025,insideB=b[1]<=.025;
        if(insideA)out.push(a);
        if(insideA!==insideB){const u=(.025-a[1])/(b[1]-a[1]);out.push([a[0]+u*(b[0]-a[0]),.025]);}
      }
      return out;
    }).filter(poly=>poly.length>2);
    torsoCache.set(figure,clipped);return clipped;
  }
  function clockwiseUnion(poly){
    const area=poly.reduce((sum,p,i)=>{const q=poly[(i+1)%poly.length];return sum+p[0]*q[1]-q[0]*p[1];},0);
    return area>0?poly.reverse():poly;
  }
  function circle(center,radius){
    return Array.from({length:24},(_,i)=>{const a=-i*Math.PI/12;return [center[0]+Math.cos(a)*radius,center[1]+Math.sin(a)*radius];});
  }
  function bone(a,b,ra,rb){
    const length=Math.hypot(b[0]-a[0],b[1]-a[1]),nx=-(b[1]-a[1])/length,ny=(b[0]-a[0])/length;
    return [clockwiseUnion([[a[0]+nx*ra,a[1]+ny*ra],[b[0]+nx*rb,b[1]+ny*rb],[b[0]-nx*rb,b[1]-ny*rb],[a[0]-nx*ra,a[1]-ny*ra]]),circle(a,ra),circle(b,rb)];
  }
  function foot(leg){
    const corners=[[-.075,-.035],[.18,-.035],[.18,.06],[-.075,.06]],r=.025,points=[];
    const centers=[[corners[0][0]+r,corners[0][1]+r],[corners[1][0]-r,corners[1][1]+r],[corners[2][0]-r,corners[2][1]-r],[corners[3][0]+r,corners[3][1]-r]];
    for(let c=0;c<4;c++)for(let i=0;i<=5;i++){
      const angle=Math.PI+(c+i/5)*Math.PI/2;
      const p=globalThis.Motion.rotate([(centers[c][0]+r*Math.cos(angle))*leg.facing,centers[c][1]+r*Math.sin(angle)],leg.footAngle);
      points.push([leg.ankle[0]+p[0],leg.ankle[1]+p[1]]);
    }
    return clockwiseUnion(points);
  }
  function legContours(leg){return [...bone(leg.hip,leg.knee,.105,.082),...bone(leg.knee,leg.ankle,.082,.055),foot(leg)];}
  const symbolCache=new Map();
  function symbolContours(name,part=0){
    const key=name+':'+part;if(symbolCache.has(key))return symbolCache.get(key);
    const A=root.CharacterArtwork;let polys;
    if(name==='eye'){
      const almond=(size,reverse=false)=>Array.from({length:64},(_,i)=>{const a=(reverse?1:-1)*i/64*Math.PI*2;return [Math.cos(a)*size,Math.sin(a)*(.35+.15*Math.abs(Math.sin(a)))*size];});
      polys=[almond(1),almond(.73,true),circle([0,0],.30)];
    }else if(name==='cloud')polys=[A[4].polygons[3+part%3]];
    else if(name==='bolt')polys=[A[0].polygons[5+part%3]];
    else if(name==='bar')polys=[A[2].polygons[part%2===0?4:5]];
    else if(name==='bars')polys=[4,5,6,7].map(i=>A[2].polygons[i]);
    else if(name==='crest')polys=[A[3].polygons[0]];
    else if(name==='hat')polys=[A[1].polygons[2],clipFloor(A[1].polygons[3],-.60)].filter(p=>p.length>2);
    else polys=[];
    if(name!=='eye'&&polys.length){
      const all=polys.flat(),xmin=Math.min(...all.map(p=>p[0])),xmax=Math.max(...all.map(p=>p[0])),ymin=Math.min(...all.map(p=>p[1])),ymax=Math.max(...all.map(p=>p[1]));
      const divisor=name==='bar'?Math.max(xmax-xmin,ymax-ymin):ymax-ymin;
      polys=polys.map(poly=>poly.map(([x,y])=>[(x-(xmin+xmax)/2)/divisor,(y-(ymin+ymax)/2)/divisor]));
    }
    symbolCache.set(key,polys);return polys;
  }
  function viewport(width,height,thumbnail=false){const h=thumbnail?height:Math.min(height,width*9/16),w=thumbnail?width:h*16/9;return {width:w,height:h,x:(width-w)/2,y:(height-h)/2};}
  function clipFloor(poly,floor){
    const out=[];
    for(let i=0;i<poly.length;i++){
      const a=poly[i],b=poly[(i+1)%poly.length],inside=a[1]<=floor,next=b[1]<=floor;
      if(inside)out.push(a);
      if(inside!==next){const u=(floor-a[1])/(b[1]-a[1]);out.push([a[0]+u*(b[0]-a[0]),floor]);}
    }
    return out;
  }
  function simplifyStroke(points,tolerance){
    if(points.length<3)return points;
    const keep=new Set([0,points.length-1]),stack=[[0,points.length-1]],threshold=tolerance*tolerance;
    while(stack.length){
      const [start,end]=stack.pop(),a=points[start],b=points[end],dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy;
      let farthest=-1,distance=threshold;
      for(let i=start+1;i<end;i++){
        const p=points[i],u=length?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/length)):0;
        const d=(p[0]-a[0]-u*dx)**2+(p[1]-a[1]-u*dy)**2;
        if(d>distance){distance=d;farthest=i;}
      }
      if(farthest>=0){keep.add(farthest);stack.push([start,farthest],[farthest,end]);}
    }
    return [...keep].sort((a,b)=>a-b).map(i=>points[i]);
  }
  function simplifyClosed(points,tolerance){
    const first=points[0];let split=1,max=0;
    points.forEach((p,i)=>{const d=(p[0]-first[0])**2+(p[1]-first[1])**2;if(d>max){max=d;split=i;}});
    return [...simplifyStroke(points.slice(0,split+1),tolerance).slice(0,-1),...simplifyStroke([...points.slice(split),first],tolerance).slice(0,-1)];
  }
  const curveSourceCache=new WeakMap();
  function curveSource(poly){
    if(curveSourceCache.has(poly))return curveSourceCache.get(poly);
    const points=poly.filter((p,i)=>i===0||Math.hypot(p[0]-poly[i-1][0],p[1]-poly[i-1][1])>1e-7);
    if(points.length>2&&Math.hypot(points[0][0]-points.at(-1)[0],points[0][1]-points.at(-1)[1])<1e-7)points.pop();
    const coarse=points.length>3?simplifyClosed(points,.004):points;
    curveSourceCache.set(poly,coarse);return coarse;
  }
  function roundedPath(points,radius,closed=false){
    let clean=points.filter((p,i)=>i===0||Math.hypot(p[0]-points[i-1][0],p[1]-points[i-1][1])>1e-7);
    if(clean.length>2&&Math.hypot(clean[0][0]-clean.at(-1)[0],clean[0][1]-clean.at(-1)[1])<1e-7){closed=true;clean.pop();}
    if(clean.length<3)return clean.map((p,i)=>[i?'L':'M',...p]);
    // Remove subpixel samples before rounding, so dense source contours also get soft tips.
    if(closed)clean=simplifyClosed(clean,radius*.10);else clean=simplifyStroke(clean,radius*.10);
    if(clean.length<3)return clean.map((p,i)=>[i?'L':'M',...p]);
    const corners=clean.map((p,i)=>{
      if(!closed&&(i===0||i===clean.length-1))return {point:p,entry:p,exit:p};
      const prev=clean[(i+clean.length-1)%clean.length],next=clean[(i+1)%clean.length];
      const before=Math.hypot(prev[0]-p[0],prev[1]-p[1]),after=Math.hypot(next[0]-p[0],next[1]-p[1]);
      const cut=Math.min(radius,before*.46,after*.46);
      return {point:p,entry:p.map((v,k)=>v+(prev[k]-v)*cut/before),exit:p.map((v,k)=>v+(next[k]-v)*cut/after)};
    });
    const commands=[['M',...(closed?corners[0].exit:corners[0].point)]];
    for(let j=1;j<corners.length+(closed?1:0);j++){
      const c=corners[j%corners.length];commands.push(['L',...c.entry]);
      if(closed||j<corners.length-1)commands.push(['Q',...c.point,...c.exit]);
    }
    if(closed)commands.push(['Z']);
    return commands;
  }
  function tracePath(ctx,commands){
    for(const [type,...v] of commands){
      if(type==='M')ctx.moveTo(...v);else if(type==='L')ctx.lineTo(...v);else if(type==='Q')ctx.quadraticCurveTo(...v);else ctx.closePath();
    }
  }
  const pathData=commands=>commands.map(([type,...v])=>type+v.map(n=>n.toFixed(2)).join(',')).join('');
  function contourRadius(poly,limit){
    if(!poly.length)return 0;
    const xs=poly.map(p=>p[0]),ys=poly.map(p=>p[1]);
    return Math.min(limit,(Math.max(...xs)-Math.min(...xs))*.22,(Math.max(...ys)-Math.min(...ys))*.22);
  }
  function primitives(s,seconds,width,height){
    const v=viewport(width,height);
    return root.Motion.sampleProps(s,seconds).map(p=>{
      const out={...p};
      if(p.x!==undefined)out.x=v.x+p.x*v.width;
      if(p.y!==undefined)out.y=v.y+p.y*v.height;
      for(const key of ['r','rx','ry'])if(p[key]!==undefined)out[key]=p[key]*v.height;
      out.opacity=p.opacity??1;
      if(p.points)out.points=p.points.map(([x,y])=>[v.x+x*v.width,v.y+y*v.height]);
      if(p.width!==undefined)out.width=p.width*v.height;
      if(p.type==='symbol'){
        const h=p.h*v.height;
        const project=point=>{
          const q=root.Motion.rotate(point,p.rotation||0);return [out.x+q[0]*h,out.y+q[1]*h];
        };
        const source=symbolContours(p.symbol,p.part??0);
        out.polygons=source.map(poly=>poly.map(project));
        out.paths=source.map((poly,i)=>roundedPath(curveSource(poly).map(project),contourRadius(out.polygons[i],v.height*.016),true));
      }
      if(p.type==='line')out.path=roundedPath(out.points,Math.max(out.width*2,v.height*.012));
      if(p.type==='polygon')out.paths=[roundedPath(out.points,contourRadius(out.points,v.height*.016),true)];
      return out;
    });
  }
  function drawPrimitive(ctx,p){
    ctx.globalAlpha=p.opacity??1;ctx.fillStyle=p.color;ctx.beginPath();
    if(p.type==='line'){
      ctx.strokeStyle=p.color;ctx.lineWidth=p.width;ctx.lineCap='round';ctx.lineJoin='round';
      tracePath(ctx,p.path);ctx.stroke();
    }else{
      if(p.paths)for(const path of p.paths)tracePath(ctx,path);
      else if(p.type==='ellipse')ctx.ellipse(p.x,p.y,p.rx,p.ry,0,0,Math.PI*2);else ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fill('nonzero');
    }
    ctx.globalAlpha=1;
  }
  function geometry(s, seconds, width, height, options={}) {
    const M=root.Motion, artwork=root.CharacterArtwork;
    const indices=options.character!==undefined?[options.character]:s.cast==='all'?[0,1,2,3,4]:[s.character];
    // Keep the editor's 16:9 composition intact on differently shaped projectors.
    const v=viewport(width,height,options.thumbnail),viewHeight=v.height,viewWidth=v.width,offset=[v.x,v.y];
    const unit=viewHeight*(options.thumbnail ? .78 : s.size)/1.8;
    return indices.map((index,order)=> {
      const figure=artwork[index];
      const pose=options.thumbnail ? {x:.5,action:'idle',lift:0,rootHeight:figure.bottom,lean:0,head:0,legs:[]} : M.sampleActor(s,seconds,order,16/9);
      const actorUnit=unit*(pose.scale??1);
      const source=options.thumbnail?figure.polygons:torsoContours(figure).filter((_,j)=>!pose.hideSymbols||!root.StageAntics?.ornaments[index].includes(j));
      const deform=p=>options.thumbnail?p:M.transformBody(p,pose);
      const body=source.map(poly=>poly.map(deform)),curveBody=source.map(poly=>curveSource(poly).map(deform));
      const limbs=options.thumbnail||pose.hideLegs?[]:pose.legs.flatMap(legContours);
      const local=[...body,...limbs],curveLocal=[...curveBody,...limbs];
      const floor=offset[1]+(options.thumbnail ? .92 : s.ground)*viewHeight;
      const origin=[offset[0]+pose.x*viewWidth,floor+((pose.offsetY??0)-pose.rootHeight)*actorUnit];
      const rotated=p=>M.rotate(p,pose.rotation||0);
      if(pose.groundRotation){const maxY=Math.max(...local.flat().map(p=>rotated(p)[1]));origin[1]=floor-maxY*actorUnit;}
      else if(!options.thumbnail&&!pose.floorClip){
        const bottom=origin[1]+Math.max(...local.flat().map(p=>rotated(p)[1]))*actorUnit;
        if(bottom>floor)origin[1]-=bottom-floor;
      }
      const project=p=>{p=rotated(p);return [origin[0]+p[0]*actorUnit*(pose.scaleX??1)*(pose.facing??1),origin[1]+p[1]*actorUnit];};
      const joints=pose.legs.map(leg=>[leg.hip,leg.knee,leg.ankle].map(project));
      let polygons=local.map(poly=>poly.map(project));
      let curvePolygons=curveLocal.map(poly=>poly.map(project));
      if(pose.floorClip){
        const visible=polygons.map((poly,i)=>({poly:clipFloor(poly,floor),curve:clipFloor(curvePolygons[i],floor)})).filter(p=>p.poly.length>2);
        polygons=visible.map(p=>p.poly);curvePolygons=visible.map(p=>p.curve.length>2?p.curve:p.poly);
      }
      const paths=curvePolygons.map((poly,i)=>roundedPath(poly,contourRadius(polygons[i],actorUnit*.045),true));
      return {index,color:options.thumbnail?s.colors[index]:M.sampleColor(s,seconds,index,pose.x),pose,opacity:pose.opacity??1,polygons,paths,joints,origin};
    }).sort((a,b)=>(a.pose.depth??0)-(b.pose.depth??0));
  }
  function draw(canvas,s,seconds,options={}) {
    const ctx=canvas.getContext('2d'), w=canvas.width,h=canvas.height;
    ctx.clearRect(0,0,w,h);
    if(!options.transparent) {ctx.fillStyle='#000000';ctx.fillRect(0,0,w,h);}
    if(options.blackout) return;
    if(options.calibration){
      ctx.strokeStyle='#87ac4c88';ctx.lineWidth=Math.max(1,w/1400);ctx.beginPath();
      for(let i=0;i<=10;i++){ctx.moveTo(w*i/10,0);ctx.lineTo(w*i/10,h);ctx.moveTo(0,h*i/10);ctx.lineTo(w,h*i/10);}
      ctx.stroke();ctx.strokeStyle='#d5ef73';ctx.lineWidth=Math.max(2,w/600);ctx.strokeRect(1,1,w-2,h-2);
      ctx.beginPath();ctx.moveTo(w*.45,h*.5);ctx.lineTo(w*.55,h*.5);ctx.moveTo(w*.5,h*.4);ctx.lineTo(w*.5,h*.6);ctx.stroke();
      ctx.fillStyle='#d5ef73';ctx.font=`${Math.max(10,w/70)}px monospace`;ctx.fillText('TOP LEFT',w*.02,h*.05);ctx.fillText('TOP RIGHT',w*.83,h*.05);
    }
    if(options.guides) {
      ctx.strokeStyle='#252822';ctx.lineWidth=1;
      ctx.setLineDash([4,8]);ctx.beginPath();ctx.moveTo(0,h*s.ground);ctx.lineTo(w,h*s.ground);ctx.stroke();ctx.setLineDash([]);
      ctx.strokeStyle='#191c17';ctx.strokeRect(w*.05,h*.05,w*.9,h*.9);
    }
    const actors=geometry(s,seconds,w,h,options);
    const props=options.thumbnail?[]:primitives(s,seconds,w,h);
    for(const p of props.filter(p=>p.behind))drawPrimitive(ctx,p);
    for(const actor of actors) {
      if(actor.opacity<=0)continue;
      ctx.globalAlpha=actor.opacity;
      ctx.fillStyle=actor.color;
      ctx.shadowColor=actor.color;ctx.shadowBlur=options.thumbnail?0:s.glow*w/1000;
      ctx.beginPath();
      for(const path of actor.paths)tracePath(ctx,path);
      ctx.fill('nonzero');ctx.shadowBlur=0;
      if(options.rig) {
        const dot=Math.max(3,w/260);
        ctx.strokeStyle='#ffffffcc';ctx.lineWidth=dot*.45;
        for(const joints of actor.joints) {
          ctx.beginPath();joints.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.stroke();
          joints.forEach(p=>{ctx.beginPath();ctx.arc(...p,dot,0,Math.PI*2);ctx.fillStyle='#10140f';ctx.fill();ctx.stroke();});
        }
        ctx.fillStyle='#ffffffaa';ctx.font=`${Math.max(10,w/95)}px monospace`;
        ctx.fillText('HIP',actor.joints[1][0][0]+8,actor.joints[1][0][1]);
      }
      ctx.globalAlpha=1;
    }
    for(const p of props.filter(p=>!p.behind))drawPrimitive(ctx,p);
    return actors;
  }
  root.StageRenderer={draw,geometry,primitives,symbolContours,roundedPath,pathData};
})(globalThis);
