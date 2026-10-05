import * as THREE from "../vendor/three.module.js";
import { buildOcean } from './ocean.js';
import { terrainHeight, coastBounds } from "./golf-courses.js";

export function buildBackdrop(w, h) {
  if (h.courseIndex === 1) {
    buildOcean(w,h);
    // Shared rings have no cracks: one top boundary, one vertex per adjoining band.
    const outline = w.coastOutline, rings=[outline];
    for(let band=1;band<=3;band++)rings.push(outline.map(([x,y,z],i)=>{
      const nx=x<0?-1:1, end=z>=99?1:z<=-h.length-119?-1:0;
      const spread=[0,2.8,5.4,8.2][band]+Math.sin(z*.085+band)*.7;
      return [x+nx*spread,[-0,-12,-27,-49][band]+(band===3?0:Math.sin(z*.047+band)*1.1),z+end*spread];
    }));
    const p=[],colors=[],palette=['#ae9d80','#9f907a','#8d8270'];
    for(let band=0;band<3;band++)for(let i=0;i<outline.length;i++){
      const n=(i+1)%outline.length,v=[rings[band][i],rings[band][n],rings[band+1][i],rings[band+1][n]];
      const col=new THREE.Color(palette[band]).multiplyScalar(.97+.025*Math.sin(outline[i][2]*.05));
      for(const j of [0,1,2,1,3,2]){p.push(...v[j]);colors.push(col.r,col.g,col.b);}
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();
    w.group.add(new THREE.Mesh(g,w.mat('#ffffff',{vertexColors:true,side:THREE.DoubleSide,roughness:1})));
    // The foot is submerged. Foam sits just above the ocean, outside the cliff face.
    const surf=[];
    const foam=i=>{const a=rings[2][i],b=rings[3][i],t=(-42.54-a[1])/(b[1]-a[1]);return [a[0]+(b[0]-a[0])*t,-42.54,a[2]+(b[2]-a[2])*t];};
    for(let i=0;i<outline.length;i++){
      const a=foam(i),b=foam((i+1)%outline.length);
      const outer=v=>[v[0]+Math.sign(v[0])*1.5,v[1],v[2]+(v[2]>99?1:v[2]<-h.length-119?-1:0)];
      for(const v of [a,b,outer(a),outer(a),b,outer(b)])surf.push(...v);
    }
    const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.Float32BufferAttribute(surf,3));sg.computeVertexNormals();
    w.group.add(new THREE.Mesh(sg,w.mat('#b9d9cf',{side:THREE.DoubleSide,roughness:1})));
    // Sparse long wavelets suggest scale without particle systems or animated textures.
    const waveVertices=[];
    for(let i=0;i<180;i++){
      const x=(i%2?1:-1)*(185+(i*53)%730),z=330-(i*97)%(h.length+850),len=5+i%11;
      const v=[[x,-42.53,z],[x+len,-42.53,z-.4],[x+len*.7,-42.53,z+.1],[x,-42.53,z+.18]];
      for(const k of [0,2,1,0,3,2])waveVertices.push(...v[k]);
    }
    const wg=new THREE.BufferGeometry();wg.setAttribute('position',new THREE.Float32BufferAttribute(waveVertices,3));wg.computeVertexNormals();
    w.group.add(new THREE.Mesh(wg,w.mat('#73afb9',{side:THREE.DoubleSide,roughness:1})));
    return;
  }
  // The surrounding massif meshes come from the Blender scenic kit.
  const valley = w.mesh('box',h.courseIndex===2?'#6b774d':'#597249',0,-13,-h.length/2,2300,2,2600);
  valley.castShadow=false;
}
