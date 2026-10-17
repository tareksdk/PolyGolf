import { pathDistance } from './golf-courses.js';

// Small themed groves occupy the rough, with clear breaks for buildings and shots.
// Deterministic, render-only decoration: no new obstacles in the score replay.
export function adventurePlanting(h,quality='medium') {
  const theme=h.course.eventTheme,step=quality==='low'?13:10,plots=[];
  if(!theme)return plots;
  for(let z=82;z>-h.length-102;z-=step)for(let x=-195;x<=195;x+=step){
    const j=Math.sin(x*1.73+z*.37+h.seed),px=x+j*2.2,pz=z+Math.cos(x*.41+z*1.17)*2.2;
    if(pathDistance(h,px,pz)<h.width/2+26)continue;
    // Keep building streets and the castle wall unplanted.
    if(Math.abs(Math.abs(px)-101)<16||Math.abs(Math.abs(px)-155)<10)continue;
    const cluster=Math.sin(px*.075+pz*.025)+Math.cos(pz*.083-px*.031);
    if(cluster<-.8)continue;
    plots.push({x:px,z:pz,scale:.65+(j+1)*.27,angle:j*3,
      id:theme==='halloween'?'bare-tree':theme==='space'?'crystal':'garden-tree'});
  }
  return plots;
}
