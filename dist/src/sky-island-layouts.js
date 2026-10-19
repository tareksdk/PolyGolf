export const SKY_COURSE_INDEX = 17;
export const SKY_COURSE = {id:'aetherfall',name:'Aetherfall Isles',subtitle:'Three holes above the clouds. Cross the gaps, find the ruined keep and follow the waterfalls.',theme:'forest',eventTheme:'sky',slot:'monthly',holeCount:3,level:1,difficulty:'Island hopping',tag:'MAP OF THE MONTH',sky:'#9fd6e8',grass:'#4d9964',edge:'#687c83',water:'#55cce0',accent:'#f2dc99',color:'#79b978',fairway:'#97ce79',stripe:'#80bb65',green:'#c5df8e',zenith:'#338fc5',horizon:'#b4daeb'};
const island=(x,z,rx,rz)=>({x,z,rx,rz});
const layouts=[
 {name:'The Broken Gate',par:4,points:[[0,0],[-22,-116],[18,-232]],islands:[island(0,0,37,39),island(-22,-116,47,43),island(18,-232,43,46)]},
 {name:'Waterfall Crossing',par:3,points:[[0,0],[24,-146]],islands:[island(0,0,35,32),island(24,-146,39,44)]},
 {name:'The Crown Beyond',par:5,points:[[0,0],[30,-120],[-22,-250],[14,-385]],islands:[island(0,0,37,39),island(30,-120,45,43),island(-22,-250,46,46),island(14,-385,46,49)]},
];
export function skyIslandLayout(index){
 const d=structuredClone(layouts[index]);if(!d)throw Error('Unknown sky hole');const [x,z]=d.points.at(-1);
 return {...d,width:36,green:[x,z+1,13,16],water:[],bunkers:[[x+22,z-9,6,8,-.3,.12]],contour:.42,density:0,
  elevation:d.points.map((p,i)=>[-p[1]/-z,[0,4,8,5][i]]),
  mounds:d.islands.flatMap((p,i)=>[[p.x+p.rx*.65,p.z-p.rz*.34,16,19,2.1],[p.x-p.rx*.72,p.z+p.rz*.42,15,16,1.7]]),
  wind:{x:.65,z:.15},landmark:'sky-islands',atmosphere:{horizon:'#b4daeb',zenith:'#338fc5',sun:'#ffe7b3',intensity:2.3}};
}
// Polygon edge is shared by physics and the mesh, including the small natural scallops.
export function islandRadius(island,angle){return 1+.065*Math.sin(angle*5+island.x*.1)+.04*Math.cos(angle*7+island.z*.03);}
export function islandContains(island,x,z){const u=(x-island.x)/island.rx,v=(z-island.z)/island.rz;return Math.hypot(u,v)<=islandRadius(island,Math.atan2(v,u));}
export function islandAt(h,x,z){return h.islands?.find(i=>islandContains(i,x,z));}

const springs=new WeakMap();
// The same spring outline cuts the terrain and supplies the water mesh and hazards.
export function islandSprings(h){
 if(!springs.has(h))springs.set(h,(h.islands||[]).map((island,index)=>{
  const angle=index%2?.18:Math.PI+.16,dx=Math.cos(angle),dz=Math.sin(angle),r=islandRadius(island,angle)*1.055;
  return {x:island.x+dx*island.rx*r,z:island.z+dz*island.rz*r,dx,dz,points:[[-17,1,.12],[-14,1.6,3.9],[-10,.8,4.2],[-6,-.5,2.2],[-2,.15,1.9],[.3,0,2]]};
 }));
 return springs.get(h);
}
export function springAt(h,x,z,margin=0){
 for(const spring of islandSprings(h)){
  const u=(x-spring.x)*spring.dx+(z-spring.z)*spring.dz,v=-(x-spring.x)*spring.dz+(z-spring.z)*spring.dx;
  if(u < -18-margin || u > 1+margin || Math.abs(v)>7+margin)continue;
  for(let i=1;i<spring.points.length;i++){
   const a=spring.points[i-1],b=spring.points[i],du=b[0]-a[0],dv=b[1]-a[1],t=Math.max(0,Math.min(1,((u-a[0])*du+(v-a[1])*dv)/(du*du+dv*dv)));
   const distance=Math.hypot(u-a[0]-du*t,v-a[1]-dv*t),width=a[2]+(b[2]-a[2])*t;
   if(distance<width+margin)return {spring,distance,width};
  }
 }
 return null;
}
