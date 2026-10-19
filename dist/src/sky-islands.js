import { buildIslandWater } from './island-water.js';
import { buildSkyVines } from './sky-vines.js';
import * as THREE from '../vendor/three.module.js';
import { terrainHeight, terrainAt } from './golf-courses.js';
import { islandRadius } from './sky-island-layouts.js';
import { turfMaterial } from './turf.js';
let kit;
export async function loadSkyDarbyAssets(){
 const r=await fetch(new URL('../assets/sky-darby-kit.json',import.meta.url));if(!r.ok)throw Error('Could not load the island assets.');
 const data=await r.json();kit={};
 for(const [name,a] of Object.entries(data.assets)){
  const geo=new THREE.BufferGeometry(),colors=new Float32Array(a.p.length);
  a.c.forEach((c,t)=>{const color=new THREE.Color().fromArray(data.palette[c]).convertSRGBToLinear();for(let v=0;v<3;v++)colors.set([color.r,color.g,color.b],t*9+v*3);});
  geo.setAttribute('position',new THREE.Float32BufferAttribute(a.p,3));geo.setAttribute('color',new THREE.BufferAttribute(colors,3));geo.computeVertexNormals();geo.userData.shared=true;kit[name]=geo;
 }
}
export function kitMesh(w,name,parent=w.group){
 if(!kit?.[name])return null;
 const mesh=new THREE.Mesh(kit[name],w.mat('#ffffff',{vertexColors:true,roughness:.92}));mesh.name=name;mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
export function buildSkyIslands(w,h){
 const topMaterial=turfMaterial(h,420,h.length+220,100,w.settings?.graphics);
 const sideMaterial=w.mat('#ffffff',{vertexColors:true,flatShading:true,roughness:1});
 const rockColors=['#7d8d84','#88968a','#96a08c','#758a82','#9fa998'];
 const point=(island,a,r)=>[island.x+Math.cos(a)*island.rx*islandRadius(island,a)*r,island.z+Math.sin(a)*island.rz*islandRadius(island,a)*r];
 function islandMesh(island,decor=false,drop=0){
  const segments=decor?24:128,rings=decor?1:24;
  const p=[],uv=[],idx=[],rim=[];
  for(let j=0;j<=rings;j++)for(let i=0;i<=segments;i++){
   const [x,z]=point(island,i/segments*Math.PI*2,j/rings),y=decor?drop:terrainHeight(h,x,z);
   p.push(x,y,z);uv.push(x/420+.5,1-(100-z)/(h.length+220));if(j===rings)rim.push([x,y,z]);
  }
  for(let j=0;j<rings;j++)for(let i=0;i<segments;i++){const a=j*(segments+1)+i,b=a+segments+1;idx.push(a,a+1,b,a+1,b+1,b);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();
  const mesh=new THREE.Mesh(geo,decor?w.mat('#5f9f77',{roughness:1}):topMaterial);mesh.name=decor?'distant-island':'island-turf';mesh.receiveShadow=true;if(!decor)mesh.userData.ownedMaterial=true;w.group.add(mesh);
  const sides=[],colors=[],depth=Math.min(island.rx,island.rz)*1.65;
  const v=(i,j)=>{const a=i/segments*Math.PI*2,[x,z]=point(island,a,[1,1.025,.78,.31,.07][j]);return j===0?rim[i]:[x,(decor?drop:terrainHeight(h,...point(island,a,1)))-[0,2.2,depth*.4,depth*.9,depth][j]+(j>1?Math.sin(i*.37+j)*2.5:0),z];};
  for(let i=0;i<segments;i++)for(let j=0;j<4;j++)for(const tri of [[v(i,j),v(i+1,j),v(i,j+1)],[v(i+1,j),v(i+1,j+1),v(i,j+1)]]){
   const c=new THREE.Color(rockColors[(Math.floor(i/7)+j)%rockColors.length]);for(const q of tri){sides.push(...q);colors.push(c.r,c.g,c.b);}
  }
  const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.Float32BufferAttribute(sides,3));sg.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));sg.computeVertexNormals();const cliff=new THREE.Mesh(sg,sideMaterial);cliff.name='floating-island-rock';cliff.castShadow=true;w.group.add(cliff);
 }
 h.islands.forEach(i=>islandMesh(i));
 w.surfaceHeight=(x,z)=>terrainAt(h,x,z).height;
 // Keep the playable landing areas clear. Ruins sit on the outward island shoulders.
 const ruins=[];
 h.islands.forEach((island,i)=>{
  const side=i%2?1:-1,x=island.x+side*island.rx*.66,z=island.z-island.rz*.12;
  const ruin=kitMesh(w,i===h.islands.length-1?'watchtower':'ruined-arch');if(ruin){ruin.position.set(x,terrainHeight(h,x,z)-.08,z);ruin.rotation.y=side*.45;ruin.scale.setScalar(i===h.islands.length-1?1.5:1.15);}
  const wall=kitMesh(w,'broken-wall');if(wall){const wx=x-side*3,wz=z-10;wall.position.set(wx,terrainHeight(h,wx,wz)-.1,wz);wall.rotation.y=side*.6;wall.scale.setScalar(1.1);}
  ruins.push(ruin,wall);buildIslandWater(w,h,island,i);
  // Small coherent clusters of trees on safe outer banks, using the Willow Park tree kit.
 });
 buildSkyVines(w,h,ruins);
 // Distant silhouettes and low cloud banks establish altitude and depth below the islands.
 for(let i=0;i<12;i++){
  const a=i/12*Math.PI*2,rx=180+(i%3)*90,x=Math.cos(a)*rx,z=-h.length*.5+Math.sin(a)*(h.length*.65+180);
  islandMesh({x,z,rx:22+(i%3)*13,rz:27+(i%4)*9},true,-38-(i%3)*30);
  if(i%3===0){const tower=kitMesh(w,'watchtower');if(tower){tower.position.set(x,-38-(i%3)*30,z);tower.scale.setScalar(1.8);}}
 }
 for(let i=0;i<18;i++){
  const a=i/18*Math.PI*2,r=130+(i%4)*45,cloud=new THREE.Group();cloud.position.set(Math.cos(a)*r,-72-(i%4)*18,-h.length*.5+Math.sin(a)*(h.length*.6+150));cloud.name='low-cloud-bank';w.group.add(cloud);
  for(let j=0;j<3;j++)w.mesh('sphere',j%2?'#daebef':'#edf4ec',(j-1)*20,Math.sin(j*2)*4,0,28,16+j*3,21,cloud,{roughness:1});
  w.animations.push({type:'cloud',mesh:cloud,phase:i,base:cloud.position.x});
 }
}
