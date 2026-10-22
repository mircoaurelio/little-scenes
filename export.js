(function(root) {
  'use strict';
  function serialize(settings) {
    return JSON.stringify({format:'little-scenes',version:1,settings:root.Motion.normalizeSettings(settings)},null,2);
  }
  function deserialize(text) {
    let data;
    try { data=JSON.parse(text); } catch {throw new Error('This is not a valid Little Scenes project.');}
    if(!data || data.format!=='little-scenes' || data.version!==1 || !data.settings || typeof data.settings!=='object' || Array.isArray(data.settings)) throw new Error('Choose a Little Scenes project saved by this studio.');
    return root.Motion.normalizeSettings(data.settings);
  }
  const safeScript=text=>text.replace(/<\/script/gi,'<\\/script');
  function buildStandalone(settings,sources) {
    const s=root.Motion.normalizeSettings(settings);
    for(const name of ['artwork','warp','antics','collection','motion','renderer']) if(typeof sources[name]!=='string') throw new Error('Missing animation source: '+name);
    const runtime=`
const settings=${JSON.stringify(s)};
const canvas=document.getElementById('screen');
let time=0,playing=true,blackout=false,last=performance.now();
function frame(now){
  const dt=Math.max(0,(now-last)/1000);last=now;
  if(playing){time+=dt;if(!settings.loop&&time>=settings.duration){time=settings.duration;playing=false;}}
  const ratio=Math.min(2,globalThis.devicePixelRatio||1);
  const w=Math.round(innerWidth*ratio),h=Math.round(innerHeight*ratio);
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  canvas.style.transformOrigin='0 0';
  canvas.style.transform=ProjectionWarp.isIdentity(settings.warp)?'none':ProjectionWarp.cssMatrix(settings.warp,innerWidth,innerHeight);
  StageRenderer.draw(canvas,settings,time,{blackout});requestAnimationFrame(frame);
}
addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();playing=!playing;}if(e.key.toLowerCase()==='r'){time=0;playing=true;}if(e.key.toLowerCase()==='b')blackout=!blackout;if(e.key.toLowerCase()==='f')document.documentElement.requestFullscreen?.().catch(()=>{});});
addEventListener('click',()=>document.documentElement.requestFullscreen?.().catch(()=>{}));
frame(performance.now());`;
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Little Scenes — Event playback</title><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#000}canvas{display:block;width:100%;height:100%;transform-origin:0 0}:fullscreen{cursor:none}</style></head><body><canvas id="screen" width="1920" height="1080" aria-label="Event animation. Click for fullscreen. Space pauses, R restarts, B blacks out."></canvas><script>${safeScript(sources.artwork+'\n'+sources.warp+'\n'+sources.antics+'\n'+sources.collection+'\n'+sources.motion+'\n'+sources.renderer+'\n'+runtime)}</script></body></html>`;
  }
  function buildSvg(settings,time,width=1920,height=1080,transparent=false) {
    const s=root.Motion.normalizeSettings(settings), actors=root.StageRenderer.geometry(s,time,width,height);
    const path=root.StageRenderer.pathData;
    const paths=actors.map(a=>'<path data-character="'+a.index+'" fill="'+a.color+'" fill-opacity="'+a.opacity.toFixed(4)+'" fill-rule="nonzero" d="'+a.paths.map(path).join('')+'"/>').join('');
    const primitives=root.StageRenderer.primitives(s,time,width,height);
    const shape=p=>{
      const meta=`data-role="${p.role||'prop'}" opacity="${p.opacity.toFixed(4)}"`;
      if(p.type==='line')return `<path ${meta} d="${path(p.path)}" fill="none" stroke="${p.color}" stroke-width="${p.width.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>`;
      if(p.paths)return `<path ${meta} d="${p.paths.map(path).join('')}" fill="${p.color}" fill-rule="nonzero"/>`;
      return p.type==='ellipse'?`<ellipse ${meta} cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" rx="${p.rx.toFixed(2)}" ry="${p.ry.toFixed(2)}" fill="${p.color}"/>`:`<circle ${meta} cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${p.r.toFixed(2)}" fill="${p.color}"/>`;
    };
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><title>Little Scenes animation frame</title>${transparent?'':`<rect width="${width}" height="${height}" fill="#000000"/>`}${primitives.filter(p=>p.behind).map(shape).join('')}${paths}${primitives.filter(p=>!p.behind).map(shape).join('')}</svg>`;
  }
  root.SceneExport={serialize,deserialize,buildStandalone,buildSvg};
})(globalThis);
