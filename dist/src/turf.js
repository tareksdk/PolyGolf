import * as THREE from '../vendor/three.module.js';
import { fairwayWidth } from './golf-courses.js';

// Only the fairway silhouette is rasterized. Stripe and hazard edges are drawn
// in world metres with a one-pixel antialiasing fringe, independent of texture LOD.
export function turfMaterial(h, width, depth, top, quality='medium') {
  const canvas=document.createElement('canvas');
  canvas.width=quality==='low'?1024:2048;canvas.height=canvas.width;
  const c=canvas.getContext('2d');
  c.fillStyle='#000';c.fillRect(0,0,canvas.width,canvas.height);
  c.scale(canvas.width/width,canvas.height/depth);c.translate(width/2,top);
  const sides=[[],[]];
  h.route.forEach(([x,z],i)=>{
    const a=h.route[Math.max(0,i-1)],b=h.route[Math.min(h.route.length-1,i+1)],dx=b[0]-a[0],dz=b[1]-a[1],n=Math.hypot(dx,dz)||1;
    const r=fairwayWidth(h,Math.max(0,Math.min(1,-z/h.length)))/2;
    sides[0].push([x-dz/n*r,-z-dx/n*r]);sides[1].push([x+dz/n*r,-z+dx/n*r]);
  });
  c.beginPath();[...sides[0],...sides[1].reverse()].forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle='#fff';c.fill();
  const mask=new THREE.CanvasTexture(canvas);mask.colorSpace=THREE.NoColorSpace;mask.anisotropy=quality==='low'?4:8;
  const material=new THREE.MeshStandardMaterial({map:mask,roughness:1});
  const rgb=hex=>{const v=new THREE.Color(hex);return `vec3(${v.r.toFixed(7)},${v.g.toFixed(7)},${v.b.toFixed(7)})`;};
  const number=n=>Number(n).toFixed(6);
  const oval=(p,scale)=>p.angle||p.scallop
    ? `turfShapedOval(vTurfXZ,vec2(${number(p.x)},${number(p.z)}),vec2(${number(p.rx*scale)},${number(p.rz*scale)}),vec2(${number(Math.cos(p.angle||0))},${number(Math.sin(p.angle||0))}),${number(p.scallop||0)})`
    : `turfOval(vTurfXZ,vec2(${number(p.x)},${number(p.z)}),vec2(${number(p.rx*scale)},${number(p.rz*scale)}))`;
  const fill=(coverage,color)=>`turf=mix(turf,${rgb(color)},${coverage});`;
  const layers=[fill(oval(h.green,1.12),h.course.stripe||'#648f43'),fill(oval(h.green,1),h.course.green||'#a9d66b'),fill('turfInside(max(abs(vTurfXZ.x)-4.0,abs(vTurfXZ.y)-6.0))',h.course.green||'#97bd65')];
  for(const b of h.bunkers)layers.push(fill(oval(b,1.035),'#bca16f'),fill(oval(b,1),'#e3c990'));
  for(const p of h.water)layers.push(fill(oval(p,1.07),'#a2a76d'),fill(oval(p,1),h.course.water));
  const fragment=`
    float coverage=texture2D(map,vMapUv).r;
    float aa=max(fwidth(coverage)*0.5,0.001);
    float fairway=smoothstep(0.5-aa,0.5+aa,coverage);
    float stripe=turfInside(abs(mod(-vTurfXZ.y-5.5,22.0)-11.0)-5.5);
    vec3 turf=mix(${rgb(h.course.eventTheme?h.course.grass:h.courseIndex===2?'#718e3b':h.courseIndex===1?'#6d9645':'#5f923e')},mix(${rgb(h.course.fairway||'#8db954')},${rgb(h.course.stripe||'#80af49')},stripe),fairway);
    ${layers.join('\n')}
    diffuseColor.rgb*=turf;
  `;
  material.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vTurfXZ;').replace('#include <begin_vertex>','#include <begin_vertex>\nvTurfXZ=position.xz;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      varying vec2 vTurfXZ;
      float turfInside(float d){float aa=max(fwidth(d)*0.5,0.0001);return 1.0-smoothstep(-aa,aa,d);}
      float turfOval(vec2 p,vec2 center,vec2 radius){return turfInside(length((p-center)/radius)-1.0);}
      float turfShapedOval(vec2 p,vec2 center,vec2 radius,vec2 rotation,float scallop){
        vec2 q=mat2(rotation.x,-rotation.y,rotation.y,rotation.x)*(p-center)/radius;
        float aa=max(length(fwidth(q))*0.5,0.0001);
        if(dot(q,q)>1.5)return 0.0;
        float a=atan(q.y,q.x+0.0000001);
        float edge=1.0+scallop*(0.65*sin(3.0*a)+0.35*cos(5.0*a));
        return 1.0-smoothstep(-aa,aa,length(q)/edge-1.0);
      }
    `).replace('#include <map_fragment>',fragment);
  };
  material.customProgramCacheKey=()=>fragment;
  return material;
}
