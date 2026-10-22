import * as THREE from '../vendor/three.module.js';
import { terrainAt, coastWaterLevel } from './golf-courses.js';

// Visual feedback only: penalty scoring and fixed-step replays stay in GameManager.
export function waterContact(hole, ball) {
  if (hole.mode === 'golf') {
    const surface = terrainAt(hole, ball.x, ball.z);
    if (surface.hazard !== 'water') return null;
    return {...ball,kind:surface.hazardKind||'water', y: hole.courseIndex === 1 && (surface.height===-43||surface.height===coastWaterLevel(hole)) ? coastWaterLevel(hole) : surface.height};
  }
  return {...ball, y: -.04};
}

export class WaterEffects {
  constructor(world) {
    this.world = world;
    this.root = new THREE.Group();
    this.root.name = 'water-impact';
    this.root.visible = false;
    world.scene.add(this.root);
    this.dummy = new THREE.Object3D();
    this.drops = [];
    this.spray = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1),
      new THREE.MeshBasicMaterial({color:'#d0f6fa', transparent:true, opacity:.95}), 64);
    this.spray.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.spray.frustumCulled = false;
    this.spray.count = 0;
    this.root.add(this.spray);
    const rings = new THREE.RingGeometry(.94, 1, 64);
    this.rings = Array.from({length:4}, () => {
      const ring = new THREE.Mesh(rings, new THREE.MeshBasicMaterial({color:'#d9fbf7',
        transparent:true, opacity:0, side:THREE.DoubleSide, depthWrite:false}));
      ring.rotation.x = -Math.PI / 2;
      this.root.add(ring);
      return ring;
    });
    // A scalloped sheet of water rises around the entry point, then falls into foam.
    const crownGeo = new THREE.CylinderGeometry(1, .4, 1, 48, 5, true);
    const positions = crownGeo.attributes.position;
    for (let i=0; i<positions.count; i++) {
      const y=positions.getY(i)+.5, a=Math.atan2(positions.getX(i), positions.getZ(i));
      positions.setY(i, -.5+y*(.7+.3*Math.sin(a*9)**2));
    }
    crownGeo.computeVertexNormals();
    crownGeo.translate(0,.5,0);
    this.crown = new THREE.Mesh(crownGeo, new THREE.MeshBasicMaterial({color:'#bceef1',
      transparent:true, opacity:.7, side:THREE.DoubleSide, depthWrite:false}));
    this.root.add(this.crown);
  }
  reset() {
    this.root.visible = false;
    this.drops.length = 0;
    this.spray.count = 0;
    this.moment = null;
    this.world.waterMoment = null;
    this.world.cameraHold = null;
  }
  splash(contact) {
    if (!contact || ![contact.x,contact.y,contact.z].every(Number.isFinite)) return;
    this.reset();
    const w=this.world, reduced=w.settings?.reducedMotion;
    const lava=contact.kind==='lava';
    this.spray.material.color.set(lava?'#ffd867':'#d0f6fa');
    this.crown.material.color.set(lava?'#8c301c':'#bceef1');
    for(const ring of this.rings)ring.material.color.set(lava?'#7c3322':'#d9fbf7');
    for(const mesh of [this.spray,this.crown,...this.rings]){
      if(mesh.material.toneMapped!==!lava){mesh.material.toneMapped=!lava;mesh.material.needsUpdate=true;}
    }
    const speed=Math.hypot(contact.vx||0,contact.vy||0,contact.vz||0);
    const size=Math.min(1.8,.85+speed*.018), hold=reduced?.65:1.25;
    this.moment={age:0, size, hold, kind:lava?'lava':'water', x:contact.x,y:contact.y,z:contact.z};
    w.waterMoment=this.moment;
    w.cameraHold={x:contact.x,y:contact.y,z:contact.z};
    this.root.position.set(contact.x,contact.y+.035,contact.z);
    this.root.visible=true;
    const count=w.settings?.particles===false?0:reduced?12:w.settings?.graphics==='low'?28:56;
    for(let i=0;i<count;i++) {
      const angle=i*2.399963+(Math.random()-.5)*.3, radial=(1.2+Math.random()*2.4)*size;
      this.drops.push({x:Math.sin(angle)*.15,y:.1,z:Math.cos(angle)*.15,
        vx:Math.sin(angle)*radial+(contact.vx||0)*.018,
        vy:(2.4+Math.random()*4.6)*size, vz:Math.cos(angle)*radial+(contact.vz||0)*.018,
        size:(.045+Math.random()*.055)*size, hit:false});
    }
    this.update(0);
  }
  update(dt) {
    if(!this.moment) return;
    const w=this.world, m=this.moment;
    if(w.mode!=='play'){this.reset();return;}
    if(w.presentationPaused)return;
    m.age+=dt;
    if(m.age>m.hold && w.waterMoment===m){w.waterMoment=null;w.cameraHold=null;}
    if(m.age>2.5){this.reset();return;}
    const t=m.age, size=m.size;
    const rise=Math.sin(Math.min(1,t/.62)*Math.PI);
    this.crown.visible=t<.62;
    this.crown.scale.set(size*(.2+t*1.8),size*rise*1.25,size*(.2+t*1.8));
    this.crown.material.opacity=(m.kind==='lava'?.95:.75)*(1-t/.7);
    this.rings.forEach((ring,i)=>{
      const age=t-i*.16, active=age>=0&&age<1.85;
      ring.visible=active;
      if(!active)return;
      const radius=size*(.18+age*(1.8-i*.13));
      ring.scale.setScalar(radius);
      ring.position.y=i*.004;
      ring.material.opacity=(.8-i*.1)*(1-age/1.85)**1.5;
    });
    let count=0;
    for(const p of this.drops){
      if(p.hit)continue;
      p.vy-=12*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
      if(p.y<.02){p.hit=true;continue;}
      this.dummy.position.set(p.x,p.y,p.z);
      this.dummy.scale.set(p.size,p.size*(1+Math.min(2,Math.abs(p.vy)*.18)),p.size);
      this.dummy.rotation.set(p.vz*.06,0,-p.vx*.06);
      this.dummy.updateMatrix();this.spray.setMatrixAt(count++,this.dummy.matrix);
    }
    this.spray.count=count;this.spray.instanceMatrix.needsUpdate=true;
  }
}
