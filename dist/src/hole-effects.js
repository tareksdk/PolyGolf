import * as THREE from '../vendor/three.module.js';
import { ITEM_BY_ID } from './catalog.js';
import { holeEffectDuration } from './hole-effects-catalog.js';

const TAU=Math.PI*2, clamp=x=>Math.max(0,Math.min(1,x)), ease=x=>1-(1-clamp(x))**3;
const UP=new THREE.Vector3(0,1,0);

// A celebration owns a bounded set of instanced draws. No geometry, textures,
// lights or post-processing buffers are allocated while its animation runs.
export class HoleCelebration {
  constructor(item,{low=false,reduced=false,ground=null}={}) {
    this.item=item;this.kind=item.effect||'classic';this.reduced=reduced;this.ground=ground;
    this.duration=holeEffectDuration(item,{reducedMotion:reduced});
    this.root=new THREE.Group();this.root.name='hole-celebration-'+this.kind;
    this.dummy=new THREE.Object3D();this.vector=new THREE.Vector3();this.color=new THREE.Color();
    this.count=reduced?0:low?32:72;
    const material=color=>new THREE.MeshBasicMaterial({color,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});
    const shard=this.kind==='crown'?new THREE.ConeGeometry(1,1,5):new THREE.BoxGeometry(1,1,1);
    this.dots=new THREE.InstancedMesh(new THREE.SphereGeometry(1,8,6),material('#ffffff'),Math.max(1,this.count));
    this.streaks=new THREE.InstancedMesh(shard,material('#ffffff'),Math.max(1,this.count));
    for(const mesh of [this.dots,this.streaks]){
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;mesh.count=0;
      for(let i=0;i<this.count;i++)mesh.setColorAt(i,this.color.set(this.kind==='crown'?(mesh===this.streaks?item.color:item.pattern):this.kind==='storm'&&mesh===this.dots&&i<12?'#526b89':[item.color,item.pattern||'#fff3c7','#fff2dc'][i%3]));
      this.root.add(mesh);
    }
    this.rings=Array.from({length:reduced?1:3},(_,i)=>{
      const ring=new THREE.Mesh(new THREE.RingGeometry(.94,1,64),material(i===1?item.pattern||item.color:item.color));
      ring.rotation.x=-Math.PI/2;this.root.add(ring);return ring;
    });
    this.core=new THREE.Mesh(this.kind==='crown'?new THREE.TorusGeometry(1.45,.14,8,40):new THREE.SphereGeometry(1,16,12),material(item.color));
    this.root.add(this.core);this.heights=[];
    this.ribbons=[];
    if(this.kind==='aurora'&&!reduced)for(let band=0;band<3;band++){
      const segments=low?20:32,positions=new Float32Array((segments+1)*6),colors=new Float32Array(positions.length),indices=[];
      const bottom=new THREE.Color(band===1?item.pattern:item.color),top=new THREE.Color('#edf8ff');
      for(let i=0;i<=segments;i++){
        bottom.toArray(colors,i*6);top.toArray(colors,i*6+3);
        if(i<segments){const v=i*2;indices.push(v,v+2,v+1,v+1,v+2,v+3);}
      }
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.setIndex(indices);
      const ribbon=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.45,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));ribbon.frustumCulled=false;
      this.root.add(ribbon);this.ribbons.push({mesh:ribbon,positions,segments,band});
    }
    for(let i=0;i<this.count;i++){
      const x=((i%9)-4)*.65,z=Math.floor(i/9)*.7-2;
      this.heights.push(ground?.(x,z)||0);
    }
    this.update(0);
  }
  instance(mesh,index,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0){
    const d=this.dummy;d.position.set(x,y,z);d.rotation.set(rx,ry,rz);d.scale.set(sx,sy,sz);d.updateMatrix();mesh.setMatrixAt(index,d.matrix);
  }
  segment(index,x,y,z,dx,dy,dz,width){
    const d=this.dummy;this.vector.set(dx,dy,dz);const length=this.vector.length();
    d.position.set(x+dx/2,y+dy/2,z+dz/2);d.quaternion.setFromUnitVectors(UP,this.vector.normalize());d.scale.set(width,length,width);d.updateMatrix();this.streaks.setMatrixAt(index,d.matrix);
  }
  update(time){
    const t=Math.max(0,time),u=clamp(t/this.duration),fade=1-clamp((u-.68)/.32),opening=ease(t*2.5),k=this.kind,n=this.count;
    this.root.visible=t<this.duration;this.dots.count=this.streaks.count=0;
    this.dots.material.opacity=.9*fade;this.streaks.material.opacity=.85*fade;
    this.core.visible=false;
    for(let i=0;i<this.rings.length;i++){
      const ring=this.rings[i],age=Math.max(0,t-i*.18);
      ring.visible=age>0;ring.rotation.set(-Math.PI/2,0,0);ring.position.set(0,.06+i*.035,0);
      ring.scale.setScalar(.25+age*(this.reduced?1.2:1.9));ring.material.opacity=(this.reduced?.55:.65)*Math.max(0,1-age/(this.duration-i*.18));
    }
    if(this.reduced)return;
    for(const {mesh,positions,segments,band} of this.ribbons){
      for(let i=0;i<=segments;i++){
        const x=(i/segments-.5)*6,base=.65+Math.sin(x*.7+t+band)*.35,z=(band-1)*.65+Math.sin(x*.9+t*.7+band)*.6,height=(1.65+.55*Math.sin(x+t*.8+band))*opening;
        const j=i*6;positions[j]=x;positions[j+1]=base;positions[j+2]=z;positions[j+3]=x;positions[j+4]=base+height;positions[j+5]=z+.15*Math.sin(x+t);
      }
      mesh.geometry.attributes.position.needsUpdate=true;mesh.material.opacity=.48*fade*opening;
    }
    for(let i=0;i<n;i++){
      const f=i/n,a=i*2.399963,band=i%3,r=1+3*((i%11)/10);let x=0,y=0,z=0,s=.08;
      if(k==='fireworks'){
        const shell=i%4,age=t-shell*.18,cx=Math.cos(shell*1.8)*1.4,cz=Math.sin(shell*1.8)*1.4;
        if(age<0||age>2.7)continue;
        const burst=Math.max(0,age-.55),lat=1-2*((i*7%23)/22),rad=Math.sqrt(1-lat*lat),exp=ease(burst*.75)*2.8;
        x=cx+Math.cos(a)*rad*exp;y=Math.min(age/.55,1)*(3.2+shell*.38)+lat*exp-burst*burst*.55;z=cz+Math.sin(a)*rad*exp;
        s=(burst>0?.075:.09)*fade;
        this.segment(this.streaks.count++,x,y,z,-Math.cos(a)*rad*.23,-lat*.23+.05,-Math.sin(a)*rad*.23,.025*fade);
      }else if(k==='glitch'){
        x=((i%9)-4)*.65+Math.sin(t*4+Math.floor(i/9))*.25;y=.08+this.heights[i];z=Math.floor(i/9)*.7-2;
        this.instance(this.streaks,this.streaks.count++,x,y,z,.52*opening,.025,.12+.32*(.5+.5*Math.sin(i+t*4)));
        continue;
      }else if(k==='portal'){
        const q=(f+t*.4)%1,rad=(.4+q*2.4)*opening,angle=a+t*2.8;
        x=Math.cos(angle)*rad;y=.2+q*q*3.6;z=Math.sin(angle)*rad;s=.05+q*.06;
      }else if(k==='solar'){
        const angle=a+t*.32,lat=1-f*2,rad=Math.sqrt(1-lat*lat)*1.5*opening;
        x=Math.cos(angle)*rad;y=1.9+lat*1.5*opening;z=Math.sin(angle)*rad;s=.065;
        this.segment(this.streaks.count++,x,y,z,x*.32,(y-1.9)*.32,z*.32,.045*fade);
      }else if(k==='aurora'){
        if(i>=12)continue;x=(f*2.5-.5)*5;y=2.6+Math.sin(a+t*.6)*.4;z=Math.sin(a)*.9;s=.035*fade;
      }else if(k==='tidal'){
        const age=t*.85,rad=(.4+age*1.8),height=Math.sin(clamp(age/2)*Math.PI)*1.5;
        x=Math.cos(a)*rad;y=.16+height+Math.sin(i*2+t*3)*.13;z=Math.sin(a)*rad;s=.13;
        this.instance(this.streaks,this.streaks.count++,x,y-.25,z,.09,.5*opening,.09,0,a,.28*Math.sin(a));
      }else if(k==='meteor'){
        const shell=i%3,age=t-shell*.27,travel=clamp(age/.9),tail=Math.floor(i/3)/(n/3)*.9;
        if(age<0)continue;
        if(travel<1){x=5*(1-travel)+shell*.55+tail;y=6*(1-travel)+tail*1.3;z=(shell-1)*.6;s=.1*(1-tail*.7);}
        else{const v=age-.9;x=shell*.55+Math.cos(a)*v*2;y=.15+Math.max(0,Math.sin(v*1.5)*1.3);z=(shell-1)*.6+Math.sin(a)*v*2;s=.06*fade;}
        this.segment(this.streaks.count++,x,y,z,.22,.3,0,.03*fade);
      }else if(k==='bloom'){
        const angle=a+t*.7,rad=(.3+f*2.5)*opening;
        x=Math.cos(angle)*rad;y=.3+Math.sin(clamp(t/2.3)*Math.PI)*(1+f*2.2);z=Math.sin(angle)*rad;
        this.instance(this.dots,this.dots.count++,x,y,z,.17*fade,.035*fade,.3*fade,t+a,angle,a);continue;
      }else if(k==='storm'){
        if(i<12){x=Math.cos(a)*(.5+f*6);y=3.7+Math.sin(i)*.25;z=Math.sin(a)*.8;s=.5;}
        else if(i<24){
          const j=i-12,progress=j/12,bend=Math.sin(j*2.4)*.33;
          if(t<.4||t>2.1)continue;
          this.segment(this.streaks.count++,bend,3.5*(1-progress),0,Math.sin((j+1)*2.4)*.33-bend,-3.5/12,(j%3-1)*.15,.06*fade);continue;
        }else{x=Math.cos(a)*r;y=3.6-((f+t*.7)%1)*3.4;z=Math.sin(a)*r;s=.025;this.segment(this.streaks.count++,x,y,z,-.07,.27,0,.025*fade);continue;}
      }else if(k==='crown'){
        if(i>=12)continue;
        const angle=i/12*TAU+t*.3;
        x=Math.cos(angle)*1.45;y=1+opening*.5;z=Math.sin(angle)*1.45;
        this.instance(this.streaks,this.streaks.count++,x,y+.32,z,.42,(i%2?.6:1.05)*opening,.42,0,angle,0);
        this.instance(this.dots,this.dots.count++,x,y+.95,z,.15,.19,.15);continue;
      }else{
        x=Math.cos(a)*t*1.4;y=Math.max(.1,1+t*2.2-t*t*1.3);z=Math.sin(a)*t*1.4;s=.07*fade;
      }
      this.instance(this.dots,this.dots.count++,x,y,z,s,s,s);
    }
    if(k==='glitch'){
      this.rings.forEach((r,i)=>{r.rotation.set(-Math.PI/2,0,t*.2);r.scale.setScalar(1.3+i*.8);r.material.opacity=.25*fade;});
    }else if(['portal','solar','crown'].includes(k)){
      this.rings.forEach((r,i)=>{r.position.y=k==='crown'?1.15+i*.16:k==='solar'?1.9:.12+i*.32;r.scale.setScalar((k==='portal'?2-i*.35:k==='solar'?1.8+i*.3:1.5)*opening);r.rotation.set(k==='solar'?Math.PI*.3+i*.7:-Math.PI/2,k==='solar'?t*.4:0,t*.25);r.material.opacity=.7*fade;});
    }else if(k==='aurora')this.rings.forEach(r=>r.material.opacity*=.3);
    if(k==='solar') {this.core.visible=true;this.core.position.y=1.9;this.core.scale.setScalar(.9*opening);this.core.material.opacity=.85*fade;}
    if(k==='crown') {this.core.visible=true;this.core.position.y=1+opening*.5;this.core.rotation.x=-Math.PI/2;this.core.material.opacity=.95*fade;}
    this.dots.instanceMatrix.needsUpdate=this.streaks.instanceMatrix.needsUpdate=true;
  }
  dispose(){
    this.root.removeFromParent();const geos=new Set(),mats=new Set();
    this.root.traverse(o=>{if(o.geometry)geos.add(o.geometry);if(o.material)mats.add(o.material);});
    geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());
  }
}

export class PumpkinBurst {
  constructor(world,target){
    this.root=new THREE.Group();this.root.position.copy(target.position);world.scene.add(this.root);
    this.duration=2.5;this.dummy=new THREE.Object3D();this.reduced=world.settings?.reducedMotion||world.settings?.particles===false;
    this.count=this.reduced?0:world.settings?.graphics==='low'?12:24;
    const shell=new THREE.SphereGeometry(1,8,6,0,.8,.3,1.4);
    this.rind=new THREE.InstancedMesh(shell,new THREE.MeshStandardMaterial({color:'#ed8b32',side:THREE.DoubleSide,roughness:.8}),Math.max(1,this.count));
    this.seeds=new THREE.InstancedMesh(new THREE.SphereGeometry(1,6,4),new THREE.MeshBasicMaterial({color:'#ffe1a0'}),Math.max(1,this.count));
    for(const mesh of [this.rind,this.seeds]){mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.root.add(mesh);}
    this.wave=new THREE.Mesh(new THREE.RingGeometry(.88,1,48),new THREE.MeshBasicMaterial({color:'#f5b359',transparent:true,depthWrite:false,side:THREE.DoubleSide}));
    this.wave.rotation.x=-Math.PI/2;this.wave.position.y=.1;this.root.add(this.wave);this.update(0);
  }
  update(t){
    this.root.visible=t<this.duration;this.rind.count=this.seeds.count=this.count;
    const fade=Math.max(0,1-(t-1.3)/1.2),d=this.dummy;
    for(let i=0;i<this.count;i++){
      const a=i*2.39996,speed=1.3+(i%5)*.45,y=Math.max(.04,.65+(2+i%4*.35)*t-3.5*t*t);
      d.position.set(Math.cos(a)*speed*t,y,Math.sin(a)*speed*t);d.rotation.set(a+t*3,t*2,a);d.scale.setScalar((.3+(i%3)*.12)*fade);d.updateMatrix();this.rind.setMatrixAt(i,d.matrix);
      d.position.y+=.12;d.scale.set(.07*fade,.035*fade,.13*fade);d.updateMatrix();this.seeds.setMatrixAt(i,d.matrix);
    }
    this.rind.instanceMatrix.needsUpdate=this.seeds.instanceMatrix.needsUpdate=true;
    this.wave.scale.setScalar(.7+t*2);this.wave.material.opacity=Math.max(0,.6-t*.5);
  }
  dispose(){this.root.removeFromParent();this.root.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}
}

export function installHoleEffects(world){
  const active=[];const update=world.update.bind(world),load=world.load.bind(world);
  const clear=()=>{for(const e of active)e.effect.dispose();active.length=0;};
  const add=effect=>{const cap=world.settings?.graphics==='low'?2:4;while(active.length>=cap)active.shift().effect.dispose();active.push({effect,time:0});return effect;};
  world.playHoleEffect=(cup,id=world.equipment?.hole,{remote=false}={})=>{
    const item=ITEM_BY_ID[id];if(!item||item.category!=='hole')return 1.15;
    const y=world.renderGround(cup.x,cup.z),reduced=world.settings?.reducedMotion||world.settings?.particles===false;
    const effect=new HoleCelebration(item,{low:world.settings?.graphics==='low',reduced,
      ground:(x,z)=>world.renderGround(cup.x+x,cup.z+z)-y});
    effect.root.position.set(cup.x,y+.04,cup.z);world.scene.add(effect.root);effect.remote=remote;add(effect);return effect.duration;
  };
  world.explodePumpkin=()=>{
    const target=world.pumpkinTarget;if(!target?.visible)return false;
    target.visible=false;target.userData.destroyed=true;add(new PumpkinBurst(world,target));return true;
  };
  world.load=hole=>{clear();world.pumpkinTarget=null;return load(hole);};
  world.update=(dt,...args)=>{
    for(let i=active.length-1;i>=0;i--){const e=active[i];e.time+=dt;
      if((e.effect.remote&&world.settings?.showOpponents===false)||e.time>=e.effect.duration||world.mode!=='play'){e.effect.dispose();active.splice(i,1);}else e.effect.update(e.time);
    }
    return update(dt,...args);
  };
  world.holeEffects=active;
}
