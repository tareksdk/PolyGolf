import * as THREE from '../vendor/three.module.js';
import { springWaterLevel } from './golf-courses.js';
import { islandSprings } from './sky-island-layouts.js';

// A single continuous ribbon forms the spring, meandering outlet, rounded lip and fall.
// Shared cross sections avoid seams between a horizontal box and a vertical box.
export function buildIslandWater(w,h,island,index) {
  const spring=islandSprings(h)[index],out=new THREE.Vector3(spring.dx,0,spring.dz),side=new THREE.Vector3(-out.z,0,out.x);
  const edge=new THREE.Vector3(spring.x,0,spring.z);
  const height=springWaterLevel(h,spring),fall=55+island.rz*.3;
  const point=(distance,y,bend=0)=>edge.clone().addScaledVector(out,distance).addScaledVector(side,bend).setY(y);
  const points=[point(-17,height,1),point(-14,height,1.6),point(-10,height,.8),point(-6,height,-.5),point(-2,height,.15),point(.3,height-.25),point(1.1,height-1.5),point(2.1,height-6),point(3.5,height-17),point(5,height-34),point(7,height-fall)];
  const curve=new THREE.CatmullRomCurve3(points,false,'centripetal');
  const widths=[.12,3.9,4.2,2.2,1.9,2,2.1,2.25,2.7,3.15,.5],steps=128,across=12;
  const p=[],uv=[],colors=[],indices=[];
  const deep=new THREE.Color('#168fa5'),shallows=new THREE.Color('#77ddcc'),fallColor=new THREE.Color('#69d2e0');
  const getWidth=t=>{const n=t*(widths.length-1),i=Math.min(widths.length-2,Math.floor(n)),f=n-i;return THREE.MathUtils.lerp(widths[i],widths[i+1],f);};
  for(let i=0;i<=steps;i++){
    const t=i/steps,c=curve.getPoint(t),width=getWidth(t),falling=THREE.MathUtils.smoothstep(t,.45,.7);
    for(let j=0;j<=across;j++){
      const s=j/across*2-1,ripple=Math.sin(t*53+s*5)*.035*(1-Math.abs(s)),pos=c.clone().addScaledVector(side,s*width);
      pos.y+=ripple;
      const color=deep.clone().lerp(shallows,Math.pow(Math.abs(s),2)*.82).lerp(fallColor,falling*.8);
      p.push(pos.x,pos.y,pos.z);uv.push(j/across,t);colors.push(color.r,color.g,color.b);
    }
  }
  for(let i=0;i<steps;i++)for(let j=0;j<across;j++){const a=i*(across+1)+j,b=a+across+1;indices.push(a,b,a+1,a+1,b,b+1);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();
  const time={value:0},material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.27,metalness:.06,side:THREE.DoubleSide});
  material.onBeforeCompile=shader=>{
    shader.uniforms.flowTime=time;
    shader.vertexShader='varying vec2 waterUV;\n'+shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nwaterUV = uv;');
    shader.fragmentShader='uniform float flowTime; varying vec2 waterUV;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float falling=smoothstep(.45,.67,waterUV.y);
      float veins=pow(.5+.5*sin(waterUV.x*63.+sin(waterUV.y*22.-flowTime*1.3)*.5),12.);
      float foam=pow(.5+.5*sin(waterUV.y*115.-flowTime*2.+sin(waterUV.x*18.)),18.);
      float lip=exp(-pow((waterUV.y-.48)*25.,2.));
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.76,.95,.9),min(.65,veins*falling*.28+foam*.19+lip*.25));`);
  };
  material.customProgramCacheKey=()=>'polygolf-curved-water-v1';
  const mesh=new THREE.Mesh(geo,material);mesh.name='curved-spring-waterfall';mesh.userData.ownedMaterial=true;mesh.onBeforeRender=()=>{time.value=performance.now()/1000;};mesh.receiveShadow=true;w.group.add(mesh);
  // Low, asymmetric stone banks frame the source without filling the landing area.
  for(const [distance,bend,scale,rotation] of [[-15,4.6,1.15,.3],[-11,-4.6,1.5,1.1],[-7,3.1,.8,.7],[-2,-2.8,1.1,1.7]]){
    const pos=point(distance,height-.25,bend),stone=w.mesh(new THREE.DodecahedronGeometry(1),index%2?'#7d9c93':'#9ba48b',pos.x,pos.y,pos.z,scale*1.7,scale*.75,scale*1.25,w.group,{roughness:1,flatShading:true});stone.rotation.y=rotation;
  }
  const mist=new THREE.Group();mist.name='waterfall-spray';mist.position.copy(points.at(-1));w.group.add(mist);
  for(let j=0;j<5;j++){
    const puff=w.mesh('sphere','#e0f3f1',Math.sin(j*2.3)*3,-j*.8,Math.cos(j*2.3)*2,2+j*.55,1.4+j*.2,1.6+j*.4,mist,{transparent:true,opacity:.22,depthWrite:false,roughness:1});
    w.animations.push({type:'cloud',mesh:puff,phase:j,base:puff.position.x});
  }
}
