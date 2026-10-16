import * as THREE from '../vendor/three.module.js';
import { pirateShipFor } from './course-features.js';
import { coastWaterLevel } from './golf-courses.js';

// The brig keeps the authored course-kit silhouette, with brighter trim,
// oversized dynamite and a few readable, camera-facing treasure glints.
export function buildPirateShip(world, hole, geometry, material) {
  const ship=pirateShipFor(hole);
  if(!ship||!geometry)return;
  const root=new THREE.Group();root.name='pirate-target';
  root.position.set(ship.x,ship.y,ship.z);root.rotation.y=ship.angle;
  root.scale.setScalar(ship.scale||1);root.userData.ship=ship;
  const model=new THREE.Mesh(geometry,material);model.castShadow=model.receiveShadow=true;
  root.add(model);world.group.add(root);world.pirateShipMesh=root;
  world.pirateShipGlints=[];
  if(hole.index!==0)return;
  // The red bundle and its broad gold straps read as cartoon TNT from the tee.
  const red=world.mat('#dc4938',{roughness:.7}), gold=world.mat('#f1bd58',{roughness:.4,emissive:'#b47c1e',emissiveIntensity:.16}),
    dark=world.mat('#352d32'), cream=world.mat('#fff0cb',{emissive:'#e7b75d',emissiveIntensity:.12});
  const cylinder=new THREE.CylinderGeometry(.46,.46,3.4,8);cylinder.rotateZ(Math.PI/2);
  const sticks=new THREE.InstancedMesh(cylinder,red,5),dummy=new THREE.Object3D();
  for(let i=0;i<5;i++){
    dummy.position.set(0,4.8+Math.sin(i*Math.PI*.4)*.7,-3+Math.cos(i*Math.PI*.4)*.7);
    dummy.updateMatrix();sticks.setMatrixAt(i,dummy.matrix);
  }
  root.add(sticks);
  for(const x of [-1.1,1.1]){
    const strap=new THREE.Mesh(new THREE.BoxGeometry(.23,2.05,2.05),gold);
    strap.position.set(x,5.25,-3);root.add(strap);
  }
  const fuse=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,1.5,5),dark);
  fuse.position.set(1.4,6.2,-2.9);fuse.rotation.z=-.6;root.add(fuse);
  const spark=new THREE.Mesh(new THREE.IcosahedronGeometry(.38,0),cream);
  spark.position.set(1.85,6.85,-2.9);root.add(spark);
  // A deliberately oversized skull gives the cream mainsail a comic face.
  const skull=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),cream);
  skull.position.set(0,11.3,2.35);skull.scale.set(1.65,1.9,.2);root.add(skull);
  const eyes=new THREE.InstancedMesh(new THREE.SphereGeometry(1,8,6),dark,3);
  for(let i=0;i<3;i++){
    dummy.position.set(i===2?0:i===0?-.6:.6,i===2?10.65:11.65,2.56);
    dummy.scale.set(i===2?.2:.34,i===2?.27:.43,.1);dummy.updateMatrix();eyes.setMatrixAt(i,dummy.matrix);
  }
  root.add(eyes);
  const jaw=new THREE.Mesh(new THREE.BoxGeometry(1.8,.65,.24),cream);jaw.position.set(0,9.85,2.4);root.add(jaw);
  const shape=new THREE.Shape();shape.moveTo(0,1);
  for(let i=1;i<8;i++){const a=i*Math.PI/4,r=i%2?.22:1;shape.lineTo(Math.sin(a)*r,Math.cos(a)*r);}shape.closePath();
  const star=new THREE.ShapeGeometry(shape),glow=world.mat('#fff4ac',{emissive:'#ffe79e',emissiveIntensity:1.1,side:THREE.DoubleSide,depthWrite:false});
  for(const [x,y,z,phase] of [[-4.2,5.6,-6,0],[3.8,5.4,7,1.8],[1.4,18.5,1.5,3.6],[-3.4,11.3,2.4,5.4]]){
    const glint=new THREE.Mesh(star,glow);glint.position.set(x,y,z);glint.scale.setScalar(.68);
    glint.userData.phase=phase;root.add(glint);world.pirateShipGlints.push(glint);
  }
}

// All particles are pooled: one burst submits three instanced draws and never
// creates scene objects during animation. Rules and rewards remain in physics.
export class PirateEffects {
  constructor(world) {
    this.world=world;this.root=new THREE.Group();this.root.name='pirate-explosion';
    this.root.visible=false;world.scene.add(this.root);this.dummy=new THREE.Object3D();this.inverse=new THREE.Quaternion();
    this.particles=[];this.meshes={};this.counts={fire:0,smoke:0,wood:0};
    const sphere=new THREE.IcosahedronGeometry(1,1),wood=new THREE.BoxGeometry(1,1,1);
    for(const [name,geometry,color,capacity] of [['fire',sphere,'#ffb12e',24],['smoke',sphere,'#706d73',24],['wood',wood,'#966031',32]]){
      const material=new THREE.MeshBasicMaterial({color:name==='fire'?'#ffffff':color,transparent:true,opacity:1,depthWrite:name==='wood',toneMapped:name!=='fire'}),
        mesh=new THREE.InstancedMesh(geometry,material,capacity);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;mesh.count=0;
      if(name==='fire'){
        const tint=new THREE.Color();
        for(let i=0;i<capacity;i++)mesh.setColorAt(i,tint.set(['#ffdf61','#ff9a24','#ffd039'][i%3]));
      }
      this.root.add(mesh);this.meshes[name]=mesh;
    }
    this.meshEntries=Object.entries(this.meshes);
    this.wave=new THREE.Mesh(new THREE.RingGeometry(.94,1,64),new THREE.MeshBasicMaterial({color:'#d2f8ec',transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false}));
    this.wave.rotation.x=-Math.PI/2;this.root.add(this.wave);
    this.core=new THREE.Mesh(sphere,new THREE.MeshBasicMaterial({color:'#fff0a5',transparent:true,opacity:.9,depthWrite:false,toneMapped:false}));
    this.core.position.y=7;this.root.add(this.core);
    this.blastRing=new THREE.Mesh(new THREE.RingGeometry(.96,1,64),new THREE.MeshBasicMaterial({color:'#ffd68a',transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}));
    this.blastRing.position.y=7;this.root.add(this.blastRing);
  }
  reset() {
    if(this.world.cameraHold===this.focus)this.world.cameraHold=null;
    this.restoreCamera();
    this.world.pirateMoment=null;this.moment=null;this.focus=null;
    this.root.visible=false;this.particles.length=0;
    for(const [,mesh] of this.meshEntries)mesh.count=0;
  }
  restoreCamera() {
    if(this.previousZoom!==undefined&&this.world.zoom===55)this.world.zoom=this.previousZoom;
    this.previousZoom=undefined;
  }
  hit() {
    const w=this.world,ship=w.pirateShipMesh;
    if(!ship||ship.userData.sunk||w.mode!=='play')return false;
    ship.userData.sunk=true;
    const s=ship.userData.ship,water=coastWaterLevel(w.hole),reduced=!!w.settings?.reducedMotion;
    this.root.position.set(s.x,water+.08,s.z);this.root.visible=true;
    this.moment={age:0,hold:reduced?3.8:5.4,ship,baseY:s.y,angle:s.angle,reduced};
    this.focus={x:s.x,y:water+12,z:s.z};w.pirateMoment=this.moment;
    w.cameraHold=this.focus;
    this.previousZoom=w.zoom;w.zoom=55;
    const quality=w.settings?.graphics==='low'?.55:1,
      count=w.settings?.particles===false?0:Math.round((reduced?22:72)*quality);
    for(let i=0;i<count;i++){
      const kind=i<Math.round(count/3)?'fire':i<Math.round(count*2/3)?'smoke':'wood',
        a=i*2.399963,spread=kind==='smoke'?2.8:kind==='fire'?12+(i%4)*2:11;
      this.particles.push({kind,x:Math.sin(a)*2,y:(kind==='smoke'?10:5)+(i%5)*.8,z:Math.cos(a)*2,
        vx:Math.sin(a)*spread,vy:kind==='smoke'?4.3+(i%5)*.4:kind==='fire'?8+(i%7)*1.1:6+(i%7)*1.2,vz:Math.cos(a)*spread,
        delay:kind==='smoke'?.55+(i%3)*.06:kind==='fire'?(i%3)*.025:0,
        life:kind==='fire'?1.1+(i%4)*.1:kind==='smoke'?5.5:3.8,size:kind==='wood'?.25+(i%4)*.12:kind==='fire'?2.5+(i%3)*.35:1.8,
        turn:a});
    }
    for(const glint of w.pirateShipGlints||[])glint.visible=false;
    this.update(0);return true;
  }
  update(dt) {
    const w=this.world,ship=w.pirateShipMesh;
    if(!this.moment){
      if(ship&&!ship.userData.sunk&&w.mode==='play')for(const glint of w.pirateShipGlints||[]){
        const strength=w.settings?.reducedMotion?.72:.35+.65*Math.sin((w.clock||0)*1.65+glint.userData.phase)**6;
        glint.visible=true;glint.scale.setScalar(.45+strength*.7);
        if(w.camera){this.inverse.copy(ship.quaternion).invert();glint.quaternion.copy(w.camera.quaternion).premultiply(this.inverse);}
      }
      return;
    }
    if(w.mode!=='play'){this.reset();return;}
    if(w.presentationPaused||w.suspended)return;
    const m=this.moment;m.age+=dt;const t=m.age;
    if(t<m.hold)w.cameraHold=this.focus;
    else if(w.pirateMoment===m){w.pirateMoment=null;if(w.cameraHold===this.focus)w.cameraHold=null;this.restoreCamera();}
    const sink=Math.max(0,Math.min(1,(t-.45)/(m.reduced?3:4.4)));
    m.ship.position.y=m.baseY-sink*sink*45;
    m.ship.rotation.set(sink*.38,m.angle,sink*.6);
    if(sink>=1)m.ship.visible=false;
    this.wave.visible=t<5;
    this.wave.scale.setScalar(2+t*4.4);this.wave.material.opacity=Math.max(0,.85*(1-t/5));
    // The first half-second reads as hot yellow/orange TNT. Smoke starts later
    // and rises above the deck instead of hiding every flame at the origin.
    this.core.visible=!m.reduced&&t<.7&&w.settings?.particles!==false;
    this.core.scale.setScalar(2+Math.sin(Math.min(1,t/.7)*Math.PI)*5);
    this.core.material.opacity=Math.max(0,.92*(1-t/.7));
    this.blastRing.visible=!m.reduced&&t<.7;
    this.blastRing.scale.setScalar(3+t*30);this.blastRing.material.opacity=Math.max(0,.78*(1-t/.7));
    if(w.camera)this.blastRing.quaternion.copy(w.camera.quaternion);
    const counts=this.counts;counts.fire=counts.smoke=counts.wood=0;
    for(const p of this.particles){
      const age=t-p.delay;
      if(age<0||age>p.life)continue;
      p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
      if(p.kind==='smoke'){p.vy*=Math.exp(-dt*.1);p.vx*=Math.exp(-dt*.6);p.vz*=Math.exp(-dt*.6);}
      else p.vy-=dt*(p.kind==='wood'?11:4);
      if(p.y<0)continue;
      const size=p.size*(p.kind==='smoke'?1+age*.65:p.kind==='fire'?(1+Math.min(.35,age)*2.8)*(1-age/p.life):1),mesh=this.meshes[p.kind];
      this.dummy.position.set(p.x,p.y,p.z);this.dummy.rotation.set(p.turn+t*2,t,p.turn);
      this.dummy.scale.set(size,p.kind==='wood'?size*.3:size,p.kind==='wood'?size*3:size);
      this.dummy.updateMatrix();mesh.setMatrixAt(counts[p.kind]++,this.dummy.matrix);
    }
    for(const [name,mesh] of this.meshEntries){mesh.count=counts[name];mesh.instanceMatrix.needsUpdate=true;}
    this.meshes.smoke.material.opacity=Math.min(.62,Math.max(0,(t-.5)*1.4),Math.max(0,(6.5-t)/2));
    if(t>6.5)this.reset();
  }
}

export function installPirateEffects(world) {
  if(world.pirateEffects)return;
  const effects=new PirateEffects(world),load=world.load.bind(world),update=world.update.bind(world);
  world.pirateEffects=effects;world.pirateHit=()=>effects.hit();
  world.load=hole=>{effects.reset();world.pirateShipMesh=null;world.pirateShipGlints=[];return load(hole);};
  world.update=(dt,...args)=>{effects.update(dt);return update(dt,...args);};
}
