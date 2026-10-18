// Pure, deterministic encounter rules shared by the browser and verified replays.
export function mountainProfile(e) {
  return [[-.5,0],[-.33,.66],[-.12,.92],[0,1],[.21,.79],[.41,.37],[.5,0]].map(([x,y])=>[x*e.span,y*e.peak]);
}
export function encounterBoxes(e, cleared=false) {
  if (!e || cleared) return [];
  const box=(x,y,z,w,h,d)=>({min:{x:x-w/2,y,z:z-d/2},max:{x:x+w/2,y:y+h,z:z+d/2}});
  if(e.kind==='dynamite')return [box(e.x,e.y-3,e.z,e.width,e.height+3,e.depth)];
  const side=(e.span-e.width)/2;
  const profile=mountainProfile(e),planes=profile.slice(1).map(([x,y],i)=>{
    const [a,b]=profile[i],slope=(y-b)/(x-a);
    return {x:-slope,y:1,z:0,limit:e.y+b-slope*(e.x+a)};
  });
  return [box(e.x-e.width/2-side/2,e.y-3,e.z,side,e.peak+3,e.depth),box(e.x+e.width/2+side/2,e.y-3,e.z,side,e.peak+3,e.depth),box(e.x,e.y+e.height,e.z,e.width,e.peak-e.height,e.depth)].map(b=>({...b,planes}));
}
export function segmentHit(a,b,box) {
  let lo=0,hi=1,axis='z',sign=1;
  for(const k of ['x','y','z']){
    const d=b[k]-a[k];
    if(Math.abs(d)<1e-9){if(a[k]<box.min[k]||a[k]>box.max[k])return null;continue;}
    const p=(box.min[k]-a[k])/d,q=(box.max[k]-a[k])/d,near=Math.min(p,q);
    if(near>lo){lo=near;axis=k;sign=d>0?-1:1;}
    hi=Math.min(hi,Math.max(p,q));if(lo>hi)return null;
  }
  let normal={x:0,y:0,z:0};normal[axis]=sign;
  for(const p of box.planes||[]){
    const da=p.x*a.x+p.y*a.y+p.z*a.z-p.limit,db=p.x*b.x+p.y*b.y+p.z*b.z-p.limit;
    if(da>0&&db>0)return null;
    if(da>0){const t=da/(da-db);if(t>lo){lo=t;const length=Math.hypot(p.x,p.y,p.z);normal={x:p.x/length,y:p.y/length,z:p.z/length};}}
    else if(db>0)hi=Math.min(hi,da/(da-db));
    if(lo>hi)return null;
  }
  return {t:lo,axis,sign,normal};
}
export function encounterTarget(e) {return e?{x:e.x,y:e.y+7,z:e.z+e.depth/2+3}:null;}
export function stepEncounter(physics,old,ball) {
  const e=physics.hole.encounter,s=physics.encounter;if(!e)return;
  if(e.kind==='dynamite'&&!s.cleared){
    const t=encounterTarget(e),r=5;
    if(segmentHit(old,ball,{min:{x:t.x-r,y:t.y-r,z:t.z-r},max:{x:t.x+r,y:t.y+r,z:t.z+r}})){
      s.cleared=true;physics.events.push('dynamite');return;
    }
  }
  let closest=null;
  for(const box of s.boxes){const hit=segmentHit(old,ball,box);if(hit&&(!closest||hit.t<closest.t))closest=hit;}
  if(!closest||s.cleared){
    if(e.kind==='tunnel'&&!s.passed&&old.z>e.z-e.depth/2&&ball.z<=e.z-e.depth/2&&Math.abs(ball.x-e.x)<e.width/2&&ball.y>=e.y&&ball.y<e.y+e.height){s.passed=true;physics.events.push('mountain-pass');}
    return;
  }
  for(const k of ['x','y','z'])ball[k]=old[k]+(ball[k]-old[k])*Math.max(0,closest.t-.002);
  const n=closest.normal,dot=ball.vx*n.x+ball.vy*n.y+ball.vz*n.z;
  for(const k of ['x','y','z']){ball[k]+=n[k]*.08;if(dot<0)ball['v'+k]-=1.48*dot*n[k];}
  physics.events.push('bounce');
}
