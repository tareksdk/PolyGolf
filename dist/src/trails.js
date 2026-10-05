import * as THREE from '../vendor/three.module.js';

// One reusable ribbon mesh; no particle cubes, allocations or draw calls per sample.
export function installTrails(world) {
  const capacity = 64, positions = new Float32Array(capacity * 2 * 3), fades = new Float32Array(capacity * 2);
  const indices = [];
  for (let i=0;i<capacity-1;i++) indices.push(i*2,i*2+1,i*2+2,i*2+1,i*2+3,i*2+2);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('fade',new THREE.BufferAttribute(fades,1).setUsage(THREE.DynamicDrawUsage));
  geometry.setIndex(indices); geometry.setDrawRange(0,0);
  const material = new THREE.ShaderMaterial({
    uniforms:{ tint:{value:new THREE.Color('#ead9b4')} }, transparent:true, depthWrite:false, side:THREE.DoubleSide,
    vertexShader:'attribute float fade; varying float vFade; void main(){vFade=fade;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:'uniform vec3 tint; varying float vFade; void main(){gl_FragColor=vec4(tint,vFade*0.72);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',
  });
  const mesh = new THREE.Mesh(geometry,material); mesh.frustumCulled=false; mesh.renderOrder=2;
  world.scene.add(mesh);
  const points = [], tangent = new THREE.Vector3(), facing = new THREE.Vector3(), side = new THREE.Vector3();
  let hole, mode, lastColor;
  world.updateRibbon = (dt, ball, physics) => {
    if(hole!==world.hole || mode!==world.mode){points.length=0;hole=world.hole;mode=world.mode;}
    const enabled=world.mode==='play' && world.trailColor && world.settings?.particles!==false;
    mesh.visible=!!enabled;
    if(!enabled){points.length=0;return;}
    if(lastColor!==world.trailColor){material.uniforms.tint.value.set(world.trailColor);lastColor=world.trailColor;}
    for(const p of points)p.age+=dt;
    const lifetime=world.hole.mode==='golf'?0.8:0.5;
    while(points.length && points[0].age>lifetime)points.shift();
    if(ball && physics?.active && !physics.sunk && Math.hypot(ball.vx,ball.vz)>0.25){
      const p=world.ball.position;
      if(points.length && points.at(-1).position.distanceToSquared(p)>1600)points.length=0;
      if(!points.length || points.at(-1).position.distanceToSquared(p)>0.0004)points.push({position:p.clone(),age:0});
    }
    if(points.length>capacity)points.splice(0,points.length-capacity);
    for(let i=0;i<points.length;i++){
      const p=points[i],a=points[Math.max(0,i-1)].position,b=points[Math.min(points.length-1,i+1)].position;
      tangent.subVectors(b,a).normalize();facing.subVectors(world.camera.position,p.position).normalize();
      side.crossVectors(tangent,facing).normalize();
      const alpha=Math.max(0,1-p.age/lifetime),width=(world.hole.mode==='golf'?Math.max(0.045,(world.visualBallRadius||0.065)*0.75):0.16)*alpha*Math.min(1,(i+1)/4);
      for(let edge=0;edge<2;edge++){
        const at=(i*2+edge)*3,sign=edge?1:-1;
        positions[at]=p.position.x+side.x*width*sign;positions[at+1]=p.position.y+side.y*width*sign;positions[at+2]=p.position.z+side.z*width*sign;
        fades[i*2+edge]=alpha*Math.min(1,i/3);
      }
    }
    geometry.attributes.position.needsUpdate=true;geometry.attributes.fade.needsUpdate=true;
    geometry.setDrawRange(0,Math.max(0,points.length-1)*6);
  };
}
