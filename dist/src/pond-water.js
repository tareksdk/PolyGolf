import * as THREE from '../vendor/three.module.js';
import { ovalBoundary, waterLevel } from './golf-courses.js';

export function buildPondWater(world,h,pond) {
  const segments=96,rings=10,p=[],c=[],indices=[],y=waterLevel(h,pond);
  const deep=new THREE.Color(h.meadowcrestRange?'#397e87':h.course.water).multiplyScalar(.78),edge=new THREE.Color('#84c8b7');
  for(let r=0;r<=rings;r++)for(let j=0;j<=segments;j++){
    const t=r/rings,point=ovalBoundary(pond,j/segments*Math.PI*2,t),shade=deep.clone().lerp(edge,Math.pow(t,5)*.7);
    p.push(point.x,y,point.z);c.push(shade.r,shade.g,shade.b);
  }
  for(let r=0;r<rings;r++)for(let j=0;j<segments;j++){const a=r*(segments+1)+j,b=a+segments+1;indices.push(a,a+1,b,a+1,b+1,b);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(c,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  const water=new THREE.Mesh(geometry,world.mat('#ffffff',{vertexColors:true,roughness:.24,metalness:.08}));water.name='contoured-pond';world.group.add(water);
  for(let i=0;i<4;i++){
    const vertices=[],radius=.33+i*.14,start=i*1.7;
    for(let j=0;j<32;j++){const point=ovalBoundary(pond,start+j/31*1.4,radius);vertices.push(point.x,y+.016,point.z);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    const line=new THREE.Line(g,new THREE.LineBasicMaterial({color:'#c4e5db',transparent:true,opacity:.25,depthWrite:false}));line.name='pond-ripple';line.userData.ownedMaterial=true;world.group.add(line);
  }
}
