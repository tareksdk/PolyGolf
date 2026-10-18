import * as THREE from '../vendor/three.module.js';
let pending, meshGeometry, netGeometry;
export async function loadRangeAssets(){
  if(meshGeometry)return;
  pending??=fetch(new URL('../assets/meadowcrest-range.json',import.meta.url)).then(async r=>{
    if(!r.ok)throw Error('The driving range could not load. Please try again.');
    const data=await r.json(),colors=new Float32Array(data.p.length);
    data.c.forEach((c,t)=>{for(let v=0;v<3;v++)colors.set(data.palette[c],t*9+v*3);});
    meshGeometry=new THREE.BufferGeometry();meshGeometry.setAttribute('position',new THREE.Float32BufferAttribute(data.p,3));meshGeometry.setAttribute('color',new THREE.BufferAttribute(colors,3));meshGeometry.computeVertexNormals();meshGeometry.userData.shared=true;
    netGeometry=new THREE.BufferGeometry();netGeometry.setAttribute('position',new THREE.Float32BufferAttribute(data.netLines,3));netGeometry.userData.shared=true;
  }).catch(e=>{pending=null;throw e;});
  return pending;
}
export function buildMeadowcrestRange(w){
  if(!meshGeometry)return;
  const scenery=new THREE.Mesh(meshGeometry,w.mat('#ffffff',{vertexColors:true,side:THREE.DoubleSide}));scenery.name='meadowcrest-range';scenery.receiveShadow=scenery.castShadow=true;w.group.add(scenery);
  const nets=new THREE.LineSegments(netGeometry,new THREE.LineBasicMaterial({color:'#2b6654',transparent:true,opacity:.65,depthWrite:false}));nets.name='range-divider-nets';nets.userData.ownedMaterial=true;w.group.add(nets);
  const field=w.mesh('box','#69934b',0,-8,-100,1700,.1,1800);field.name='range-horizon-ground';field.castShadow=false;
  for(const [x,z,color] of [[-22,-54,'#f1db79'],[23,-86,'#eadfc2'],[14,-142,'#df9272'],[-17,-193,'#efd268'],[27,-235,'#eee7ce']]){
    const y=w.surfaceHeight(x,z);
    w.mesh('cylinder','#e9e4cd',x,y+.9,z,.028,1.8,.028);
    w.mesh(new THREE.PlaneGeometry(.75,.48),color,x+.375,y+1.55,z,1,1,1,w.group,{side:THREE.DoubleSide});
  }
  const sign=(text,x,y,z,width,height,rotation=0)=>{
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=256;const c=canvas.getContext('2d');
    c.fillStyle='#efece0';c.fillRect(0,0,768,256);c.fillStyle='#334f71';c.textAlign='center';c.font='italic 900 115px Georgia';c.fillText(text,384,133);c.font='600 43px sans-serif';c.fillText('DRIVE IN · GOLF RANGE',384,204);
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
    const face=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshStandardMaterial({map,roughness:1}));face.userData.ownedMaterial=true;face.position.set(x,y,z);face.rotation.y=rotation;w.group.add(face);
  };
  sign("SCOTTI'S",41,4.77,21.68,3.25,.86);
  sign("SCOTTI'S",31,3.85,13.32,2.85,.72,Math.PI);
}
