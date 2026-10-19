import { terrainHeight, terrainAt, pathDistance, fairwayWidth, coastBounds, coastWaterLevel } from "./golf-courses.js";
import { halloweenActive } from './season.js';
// Shared course targets: render placement and verified replays use the same metres.
export function pirateShipFor(h) {
  if ((h.layoutCourse ?? h.courseIndex) !== 1 || h.custom) return null;
  if(h.index===0){
    // The round supplies one seed in local practice. A missing seed stays
    // deterministic for previews and replay fixtures; resets never reroll it.
    let seed=(Number.isFinite(h.pirateSeed)?h.pirateSeed:h.seed)>>>0;
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    const z=-h.length*.42+(random()-.5)*22, x=coastBounds(h,z)[1]+54+(random()-.5)*12;
    return {x,y:coastWaterLevel(h)-3.4,z,angle:-.2+(random()-.5)*.24,scale:1.65};
  }
  const z = -h.length * 0.42;
  let x = h.points[0][0];
  for (let i = 1; i < h.points.length; i++) {
    const a = h.points[i - 1], b = h.points[i];
    if (z <= a[1] && z >= b[1]) { x = a[0] + (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]); break; }
  }
  return { x: x + h.width / 2 + 74, y: -44.7, z, angle: 0 };
}

export function segmentBox(a, b, min, max) {
  let lo = 0, hi = 1;
  for (const k of ['x', 'y', 'z']) {
    const d = b[k] - a[k];
    if (Math.abs(d) < 1e-9) { if (a[k] < min[k] || a[k] > max[k]) return false; continue; }
    const t0 = (min[k] - a[k]) / d, t1 = (max[k] - a[k]) / d;
    lo = Math.max(lo, Math.min(t0, t1)); hi = Math.min(hi, Math.max(t0, t1));
    if (lo > hi) return false;
  }
  return true;
}

export function hitsPirateShip(ship, a, b) {
  if (!ship) return false;
  const c=Math.cos(ship.angle||0),s=Math.sin(ship.angle||0),scale=ship.scale||1;
  const local = p => ({ x: ((p.x-ship.x)*c-(p.z-ship.z)*s)/scale,
    y:(p.y-ship.y)/scale,z:((p.x-ship.x)*s+(p.z-ship.z)*c)/scale });
  const boxes = [
    [-3.7, 0, -11.6, 3.7, 4.2, 11.6], // hull and deck
    [-2.5, 4.2, 5.5, 2.5, 6.7, 9.5], // raised quarterdeck
    [-4.9, 7.0, -0.8, 4.9, 20.5, 1.4], // mainsail and upper sail; includes the earlier target
    [-3.6, 7, -7.1, 3.6, 16.5, -5.7], // foremast sails
    [-0.3, 4, 1, 0.3, 22, 1.6], // main mast
    [-0.3, 4, -6.3, 0.3, 18, -5.7], // foremast
    [-0.12, 6.5, -13.5, 0.12, 15.3, -6.2], // triangular jib and bowsprit
  ];
  return boxes.some(([x,y,z,X,Y,Z]) => segmentBox(local(a), local(b), {x,y,z}, {x:X,y:Y,z:Z}));
}

// Place one find beside the inner edge of a real tree on Autumn Pines, hole one.
export function pumpkinFor(h,now=Date.now()) {
  if(!halloweenActive(now) || h.custom || (h.layoutCourse ?? h.courseIndex) !== 2 || h.index!==0) return null;
  const trees=h.trees.filter(t=>t.z < -45 && t.z > -135 && !t.far);
  trees.sort((a,b)=>(pathDistance(h,a.x,a.z)-fairwayWidth(h,-a.z/h.length)/2)-(pathDistance(h,b.x,b.z)-fairwayWidth(h,-b.z/h.length)/2));
  const tree=trees[0];if(!tree)return null;
  const route=h.route.reduce((best,p)=>Math.hypot(p[0]-tree.x,p[1]-tree.z)<Math.hypot(best[0]-tree.x,best[1]-tree.z)?p:best);
  const d=Math.hypot(route[0]-tree.x,route[1]-tree.z),x=tree.x+(route[0]-tree.x)/d*2.4,z=tree.z+(route[1]-tree.z)/d*2.4;
  return {x,y:terrainHeight(h,x,z),z,tree};
}
export function hitsPumpkin(p,a,b,now=Date.now()) {
  return halloweenActive(now) && !!p && segmentBox(a,b,{x:p.x-1.05,y:p.y-.12,z:p.z-1.05},{x:p.x+1.05,y:p.y+1.7,z:p.z+1.05});
}

// Darby, the black Labrador, rests in the rough between the first Willow Park
// fairway and its cart path, below the nearest tree and facing the play. Placement
// follows the trees, so the spot survives layout edits; the replay verifier uses the
// same metres and hit box. The cart path runs 5.1-7.3 m beyond the fairway edge.
export const DARBY_EDGE=2.7;
export function darbyFor(h) {
  if(h.custom || (h.layoutCourse ?? h.courseIndex) !== 0 || h.index!==0) return null;
  const edge=(x,z)=>pathDistance(h,x,z)-fairwayWidth(h,-z/h.length)/2;
  const trees=h.trees.filter(t=>t.z < -h.length*.3 && t.z > -h.length*.5 && !t.far && edge(t.x,t.z)>7);
  trees.sort((a,b)=>edge(a.x,a.z)-edge(b.x,b.z));
  for(const tree of trees){
    const route=h.route.reduce((best,p)=>Math.hypot(p[0]-tree.x,p[1]-tree.z)<Math.hypot(best[0]-tree.x,best[1]-tree.z)?p:best);
    const d=Math.hypot(route[0]-tree.x,route[1]-tree.z),ux=(route[0]-tree.x)/d,uz=(route[1]-tree.z)/d;
    let step=0;while(step<d&&edge(tree.x+ux*step,tree.z+uz*step)>DARBY_EDGE)step+=.05;
    const x=tree.x+ux*step,z=tree.z+uz*step;
    // Leave room for the whole dog: no trunk, hazard or playing surface underneath.
    if(h.trees.some(t=>Math.hypot(t.x-x,t.z-z)<2.6)) continue;
    if([[0,0],[1.6,0],[-1.6,0],[0,1.6],[0,-1.6]].some(([dx,dz])=>terrainAt(h,x+dx,z+dz).hazard)) continue;
    return {x,y:terrainHeight(h,x,z),z,angle:Math.atan2(ux,uz),tree};
  }
  return null;
}
// Darby's swept volume in the dog's own frame: paws to rump, plus the lifted head.
export function hitsDarby(d,a,b) {
  if(!d)return false;
  const c=Math.cos(d.angle),s=Math.sin(d.angle);
  const local=p=>({x:(p.x-d.x)*c-(p.z-d.z)*s,y:p.y-d.y,z:(p.x-d.x)*s+(p.z-d.z)*c});
  return segmentBox(local(a),local(b),{x:-.62,y:-.1,z:-1},{x:.62,y:1.25,z:1.15});
}
