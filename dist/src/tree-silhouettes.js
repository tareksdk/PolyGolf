import * as THREE from '../vendor/three.module.js';

// Opaque low-poly crowns for distant trees, with the same trunk positions and size.
// No transparent billboards or screen-door fading on integrated GPUs.
export function treeSilhouette(type) {
  const parts=[],positions=[],colors=[];
  const add=(geo,color,x,y,z,sx,sy,sz)=>{geo=geo.index?geo.toNonIndexed():geo;geo.scale(sx,sy,sz);geo.translate(x,y,z);parts.push(geo);const rgb=new THREE.Color(color),a=geo.attributes.position.array;positions.push(...a);for(let i=0;i<a.length;i+=3)colors.push(rgb.r,rgb.g,rgb.b);};
  const autumn=type==='larch'||type==='autumn-oak',pine=type==='pine'||type==='larch';
  add(new THREE.CylinderGeometry(.2,.28,4,5),'#796044',0,2,0,1,1,1);
  if(pine){
    add(new THREE.ConeGeometry(3.2,6.4,6),autumn?'#c4a751':'#446c47',0,5.3,0,1,1,1);
    add(new THREE.ConeGeometry(2.1,4.7,6),autumn?'#e0bb63':'#6e925b',0,8,0,1,1,1);
  }else add(new THREE.IcosahedronGeometry(1,0),autumn?'#c78c45':type==='willow'?'#8bab67':'#739a56',0,6.7,0,4.1,type==='willow'?4:3.1,3.9);
  parts.forEach(g=>g.dispose());
  return {position:positions,color:new Float32Array(colors),height:pine?10.4:10.7,radius:4.1};
}
