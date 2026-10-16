import * as THREE from '../vendor/three.module.js';
import { terrainAt } from './golf-courses.js';

// Bounded pools are reused between holes. Their randomness never enters physics/replays.
export class SandEffects {
  constructor(world) {
    this.world=world;this.particles=[];this.dust=[];this.slide=0;
    this.root=new THREE.Group();this.root.name='bunker-sand-effects';world.scene.add(this.root);
    this.grains=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),new THREE.MeshBasicMaterial({color:'#c49c62'}),180);
    this.grains.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.grains.frustumCulled=false;this.grains.count=0;this.root.add(this.grains);
    const geo=new THREE.BufferGeometry();this.dustPositions=new Float32Array(32*3);this.dustSizes=new Float32Array(32);
    geo.setAttribute('position',new THREE.BufferAttribute(this.dustPositions,3).setUsage(THREE.DynamicDrawUsage));geo.setAttribute('puffSize',new THREE.BufferAttribute(this.dustSizes,1).setUsage(THREE.DynamicDrawUsage));
    const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{pixelRatio:{value:1},tint:{value:new THREE.Color('#c3a171')}},
      vertexShader:`attribute float puffSize;uniform float pixelRatio;varying float visible;void main(){vec4 p=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*p;gl_PointSize=min(110.0,puffSize*pixelRatio*450.0/max(1.0,-p.z));visible=step(.001,puffSize);}`,
      fragmentShader:`uniform vec3 tint;varying float visible;void main(){float r=length(gl_PointCoord-.5)*2.0;gl_FragColor=vec4(tint,(1.0-smoothstep(.05,1.0,r))*.24*visible);
#include <colorspace_fragment>
}`});
    this.puffs=new THREE.Points(geo,mat);this.puffs.frustumCulled=false;geo.setDrawRange(0,0);this.root.add(this.puffs);this.dummy=new THREE.Object3D();
  }
  reset(){this.particles.length=this.dust.length=0;this.grains.count=0;this.puffs.geometry.setDrawRange(0,0);this.slide=0;}
  burst(c) {
    if(!c||this.world.settings?.particles===false)return;
    const low=this.world.settings?.graphics==='low',power=Math.min(1.5,.55+c.speed/25),n=c.kind==='skid'?4:c.kind==='shot'?(low?24:45):(low?30:58);
    const len=Math.hypot(c.vx,c.vz)||1,dx=c.vx/len,dz=c.vz/len;
    for(let i=0;i<n&&this.particles.length<180;i++){
      const side=(Math.random()-.5)*4,forward=(.4+Math.random()*3)*power;
      this.particles.push({x:c.x+(Math.random()-.5)*.2,y:c.y+.08,z:c.z+(Math.random()-.5)*.2,vx:dx*forward-dz*side,vy:(1.5+Math.random()*4)*power,vz:dz*forward+dx*side,floor:c.y,age:0,life:.6+Math.random()*.7,size:.025+Math.random()*.065});
    }
    for(let i=0;i<(c.kind==='skid'?1:low?3:6)&&this.dust.length<32;i++)this.dust.push({x:c.x+dx*i*.17,y:c.y+.16,z:c.z+dz*i*.17,vx:dx*(.5+Math.random()),vz:dz*(.5+Math.random()),age:0,life:.65+Math.random()*.4,size:.3+Math.random()*.45});
  }
  update(dt,ball,physics) {
    const enabled=this.world.mode==='play'&&this.world.hole.mode==='golf'&&this.world.settings?.particles!==false;
    this.root.visible=enabled;if(!enabled){this.reset();return;}
    if(ball&&physics?.active&&!physics.airborne&&Math.hypot(ball.vx,ball.vz)>1&&terrainAt(this.world.hole,ball.x,ball.z).surface==='sand'){
      this.slide+=dt;if(this.slide>.09){this.slide=0;this.burst({kind:'skid',x:ball.x,y:terrainAt(this.world.hole,ball.x,ball.z).height,z:ball.z,vx:ball.vx,vz:ball.vz,speed:2});}
    }else this.slide=0;
    let count=0;
    for(let i=this.particles.length-1;i>=0;i--){
      const p=this.particles[i];p.age+=dt;if(p.age>p.life){this.particles.splice(i,1);continue;}
      p.vy-=9.8*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
      if(p.y<p.floor+.025){p.y=p.floor+.025;p.vy=Math.abs(p.vy)*.13;p.vx*=.7;p.vz*=.7;}
      this.dummy.position.set(p.x,p.y,p.z);this.dummy.scale.setScalar(p.size*Math.min(1,(1-p.age/p.life)*3));this.dummy.rotation.set(p.age*4,p.age*7,0);this.dummy.updateMatrix();this.grains.setMatrixAt(count++,this.dummy.matrix);
    }
    this.grains.count=count;this.grains.instanceMatrix.needsUpdate=true;
    for(let i=this.dust.length-1;i>=0;i--){const p=this.dust[i];p.age+=dt;if(p.age>p.life){this.dust.splice(i,1);continue;}p.x+=p.vx*dt;p.z+=p.vz*dt;p.y+=dt*.4;}
    this.dust.forEach((p,i)=>{this.dustPositions.set([p.x,p.y,p.z],i*3);this.dustSizes[i]=p.size*(1+p.age*2)*Math.sin(Math.PI*p.age/p.life);});
    this.puffs.geometry.setDrawRange(0,this.dust.length);this.puffs.geometry.attributes.position.needsUpdate=true;this.puffs.geometry.attributes.puffSize.needsUpdate=true;this.puffs.material.uniforms.pixelRatio.value=this.world.renderer.getPixelRatio();
  }
}
