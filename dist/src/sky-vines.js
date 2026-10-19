import * as THREE from '../vendor/three.module.js';
import { terrainHeight } from './golf-courses.js';
import { islandRadius } from './sky-island-layouts.js';

// Broad ivy leaves use a shared four-triangle mesh, instanced once for the whole hole.
export function buildSkyVines(w,h,ruins){
 const leaves=[],stems=[],leafShape=new THREE.BufferGeometry();
 leafShape.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,-.52,.42,.06,-.22,.54,0,0,0,0,-.22,.54,0,0,.95,.09,0,0,0,0,.95,.09,.28,.51,0,0,0,0,.28,.51,0,.5,.35,.05],3));leafShape.computeVertexNormals();
 const stemMaterial=w.mat('#3d6044',{roughness:1});
 function vine(points,seed,density=2.2){
  const curve=new THREE.CatmullRomCurve3(points),length=curve.getLength(),steps=Math.ceil(length*2.8);
  const stem=new THREE.Mesh(new THREE.TubeGeometry(curve,steps,.055,4,false),stemMaterial);stem.name='ivy-stem';stems.push(stem);w.group.add(stem);
  const n=Math.ceil(length*density);
  for(let j=0;j<n;j++){
   const t=j/n,p=curve.getPoint(t),right=j%2?1:-1;
   p.x+=right*(.12+.15*Math.sin(j*1.7+seed));p.z+=Math.cos(j*2.1+seed)*.14;
   const size=.38+.19*(.5+.5*Math.sin(j*3.7+seed));leaves.push({p,size,rot:new THREE.Euler(.25*Math.sin(j),seed*.3+Math.sin(j*.6)*.7,right*.7),color:j%3});
  }
 }
 for(const [i,island] of h.islands.entries()){
  // Hanging curtains grow from a few planted shoulders, leaving waterfall channels open.
  for(const [j,angle] of [.66,1.95,4.28,5.5].entries()){
   const radius=islandRadius(island,angle),x=island.x+Math.cos(angle)*island.rx*radius,z=island.z+Math.sin(angle)*island.rz*radius,y=terrainHeight(h,x,z),dx=Math.cos(angle),dz=Math.sin(angle);
   for(let k=0;k<3;k++){
    const offset=k*.65-.65,len=5+(i+j+k)%5*1.5;
    vine([new THREE.Vector3(x-dx*.9+dz*offset,y+.15,z-dz*.9-dx*offset),new THREE.Vector3(x+dx*.7+dz*offset,y-.7,z+dz*.7-dx*offset),new THREE.Vector3(x+dx*1.1+dz*(offset+.3),y-len*.55,z+dz*1.1-dx*(offset+.3)),new THREE.Vector3(x+dx*.5+dz*(offset+.6),y-len,z+dz*.5-dx*(offset+.6))],i*5+j+k,2.1);
   }
  }
 }
 for(const [i,ruin] of ruins.entries()){
  if(!ruin)continue;ruin.updateMatrixWorld(true);
  const local=points=>points.map(p=>new THREE.Vector3(...p).applyMatrix4(ruin.matrixWorld));
  for(const [cluster,cx,cz] of [[0,-3.8,1.4],[1,3.4,.9]])for(let j=0;j<14;j++){
   const a=j*2.4+i,rad=.25+Math.sqrt(j/14)*1.05,p=local([[cx+Math.cos(a)*rad,0,cz+Math.sin(a)*rad]])[0];
   p.y=terrainHeight(h,p.x,p.z)+.055;
   leaves.push({p,size:.48+(j%3)*.09,rot:new THREE.Euler(-Math.PI/2,0,a),color:(j+cluster)%3});
  }
  if(ruin.name==='broken-wall'){
   vine(local([[-3.4,.2,.68],[-3.8,1.5,.7],[-3.4,2.7,.72],[-2.7,3.7,.7]]),i+7,3);
  }else if(ruin.name.includes('watchtower')){
   for(const x of [-1.5,1.8])vine(local([[x,.25,3.92],[x+.25,2.2,3.94],[x-.1,4.2,3.95],[x+.6,5.9,4.02]]),i+4,2.5);
  }else{
   vine(local([[-3.65,.25,.85],[-3.9,2.5,.85],[-3.6,4.8,1],[-2.5,7,1.05],[-.8,8.4,1.05]]),i,3.1);
   vine(local([[-2.9,5.1,1.1],[-2.3,4.4,1.05],[-2.55,3.2,1.03]]),i+2,3);
   vine(local([[3.6,.25,.85],[3.8,1.8,.85],[3.45,3.4,.86]]),i+5,2.7);
  }
 }
 const palette=['#528351','#6c9c58','#3c704e'];
 const ivy=new THREE.InstancedMesh(leafShape,w.mat('#ffffff',{vertexColors:false,side:THREE.DoubleSide,roughness:1}),leaves.length),dummy=new THREE.Object3D();ivy.name='ruin-and-cliff-ivy';
 leaves.forEach((leaf,i)=>{dummy.position.copy(leaf.p);dummy.rotation.copy(leaf.rot);dummy.scale.setScalar(leaf.size);dummy.updateMatrix();ivy.setMatrixAt(i,dummy.matrix);ivy.setColorAt(i,new THREE.Color(palette[leaf.color]));});
 ivy.receiveShadow=true;ivy.castShadow=false;w.group.add(ivy);
 // All stems share one material and draw call, keeping the decoration light on laptops.
 const positions=[],normals=[];
 for(const stem of stems){const g=stem.geometry.toNonIndexed();positions.push(...g.attributes.position.array);normals.push(...g.attributes.normal.array);g.dispose();stem.geometry.dispose();stem.removeFromParent();}
 const merged=new THREE.BufferGeometry();merged.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));merged.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));const branches=new THREE.Mesh(merged,stemMaterial);branches.name='ivy-stems';w.group.add(branches);
}
