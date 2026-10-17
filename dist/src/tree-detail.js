import { pathDistance } from './golf-courses.js';
export function treeModel(h,t,quality='medium') {
  const distance=pathDistance(h,t.x,t.z),orchard=(h.course.layoutCourse??h.courseIndex)===0&&h.index===2&&!h.custom;
  const base=orchard&&t.type!=='pine'&&distance<70?'fruit-tree':t.type;
  if(t.far||distance>(quality==='low'?48:88))return base+'-far';
  if(quality==='low')return (['pine','larch','autumn-oak','fruit-tree'].includes(base)?base:'oak')+'-low';
  return base;
}
