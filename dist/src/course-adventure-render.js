import * as THREE from '../vendor/three.module.js';
import { terrainHeight, coastBounds, coastWaterLevel } from './golf-courses.js';
import { encounterTarget, mountainProfile } from './course-encounters.js';

function batchMovingGroup(group) {
  const buckets=new Map();
  for(const m of [...group.children])if(m.isMesh&&!m.isInstancedMesh){
    const key=m.geometry.uuid+':'+m.material.uuid;
    if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(m);
  }
  for(const meshes of buckets.values())if(meshes.length>1){
    const first=meshes[0],batch=new THREE.InstancedMesh(first.geometry,first.material,meshes.length);
    batch.castShadow=batch.receiveShadow=true;
    meshes.forEach((m,i)=>{m.updateMatrix();batch.setMatrixAt(i,m.matrix);group.remove(m);});group.add(batch);
  }
}

export function buildLongCourseScenery(w,h) {
  w.courseAdventure=null;
  if(![15,16].includes(h.courseIndex)||h.index<3)return;
  const root=new THREE.Group();root.name='long-course-story';w.group.add(root);
  const part=(g,c,x,y,z,sx,sy,sz,parent=root)=>w.mesh(g,c,x,y,z,sx,sy,sz,parent);
  const ground=(x,z)=>terrainHeight(h,x,z),coast=h.layoutCourse===1;
  const rock=coast?'#9fa78f':'#9a978b',wood='#91633f',gold='#edc87b',cream='#f5e6ba';
  const eye=(parent,x,y,z,r=1)=>{part('sphere',cream,x,y,z,r,r,.22,parent);part('sphere','#263b34',x,y,z+.2,r*.4,r*.45,.15,parent);};
  const house=(x,y,z,s=1,color='#d5b991')=>{
    const g=new THREE.Group();g.position.set(x,y,z);g.scale.setScalar(s);root.add(g);
    part('box',color,0,3,0,7,6,6,g);const roof=part('cone','#6b776e',0,7,0,6,3.8,5,g);roof.rotation.y=Math.PI/4;
    part('box','#574b39',0,1.5,3.05,1.3,3,.15,g);for(const x of [-2,2])part('box','#ffe4a2',x,3.7,3.07,1.4,1.5,.15,g);
    return g;
  };
  const cairn=(x,z,face=false)=>{
    const g=new THREE.Group();g.position.set(x,ground(x,z),z);root.add(g);
    for(let i=0;i<5;i++){const m=part('sphere',i%2?rock:'#c1ba9b',Math.sin(i*2)*.6,i*2.2,0,5-i*.65,1.7,4-i*.5,g);m.rotation.y=i*.8;}
    if(face){eye(g,-.8,7,1.8,.8);eye(g,.8,7,1.8,.8);part('cone','#e2a666',0,6.2,2,.5,1.2,.5,g);}
    return g;
  };
  const vignette=h.vignette;
  cairn(coast?-55:58,-h.length*.7,true);
  // Small stories stay outside the playable strip, using the existing shared primitives.
  if(vignette==='harbour'){
    for(let i=0;i<9;i++){
      const z=-180-i*22,x=coastBounds(h,z)[1]+70+i%3*15;
      const g=house(x,coastWaterLevel(h)+8,z,.9,['#d88968','#8ba99d','#dbc781'][i%3]);
      for(const dx of [-2.5,2.5])part('cylinder',wood,dx,-5,0,.25,14,.25,g);
    }
  }else if(vignette==='crown'){
    for(let i=0;i<7;i++)house(-65+i*20,10+i%3*3,-h.length-100-i%2*15,1.1,['#d7a45f','#b28b70','#d1bd91'][i%3]);
    for(const x of [-90,90]){const y=ground(x,-h.length-45);part('cylinder',rock,x,y+14,-h.length-45,6,28,6);part('cone','#6a7864',x,y+32,-h.length-45,9,11,9);}
  }else if(vignette==='pelican'||vignette==='owl'||vignette==='acorn'||vignette==='fox'){
    const x=coast?-44:49,z=-h.length*.6,y=ground(x,z),g=new THREE.Group();g.position.set(x,y,z);root.add(g);
    part('sphere',vignette==='fox'?'#b87b4b':vignette==='acorn'?'#b39261':cream,0,8,0,6,8,5,g);
    part('sphere',wood,0,1,0,9,2,7,g);eye(g,-2,11,4.3,1.2);eye(g,2,11,4.3,1.2);
    const beak=part('cone','#dfa359',0,8.5,5,1.3,4,1.2,g);beak.rotation.x=Math.PI/2;
    part('cone','#7b8e68',0,17,0,7,3.5,7,g);
  }else if(vignette==='teapot'){
    const x=45,z=-105,y=ground(x,z);part('sphere','#c8d8b5',x,y+6,z,7,6,6);
    const spout=part('cone','#c8d8b5',x-7,y+8,z,2,8,2);spout.rotation.z=-.8;
    part('cylinder',gold,x,y+12,z,4,.7,4);eye(root,x-2,y+7,z+5,1);eye(root,x+2,y+7,z+5,1);
  }else{
    const x=coast?-58:58,z=-h.length*.7,y=ground(x,z);house(x,y,z,1.3);
    part('cylinder',wood,x+12,y+8,z,1,16,1);part('cone',gold,x+12,y+14,z,3,5,3);
    if(vignette==='cannons'){const cannon=part('cylinder','#42595c',x+13,y+3,z+12,2,11,2);cannon.rotation.x=Math.PI/2;}
  }
  const dynamic=new THREE.Group();dynamic.userData.courseDynamic=true;root.add(dynamic);
  const e=h.encounter;
  let gate=null,target=null;
  const markers=[];
  if(e){
    if(e.kind==='tunnel'){
      const shape=new THREE.Shape(),profile=mountainProfile(e);
      shape.moveTo(...profile[0]);for(const p of profile.slice(1))shape.lineTo(...p);
      shape.lineTo(e.width/2,0);shape.lineTo(e.width/2,e.height);shape.lineTo(-e.width/2,e.height);shape.lineTo(-e.width/2,0);shape.closePath();
      const geo=new THREE.ExtrudeGeometry(shape,{depth:e.depth,bevelEnabled:false,steps:1});
      const colors=new Float32Array(geo.attributes.position.count*3),tint=new THREE.Color();
      for(let i=0;i<colors.length/3;i++){tint.set(['#b5b3a0','#9f9f8f','#999b8b','#c0b89e'][Math.floor(i/3)%4]);tint.toArray(colors,i*3);}
      geo.setAttribute('color',new THREE.BufferAttribute(colors,3));
      part(geo,'#ffffff',e.x,e.y,e.z-e.depth/2,1,1,1,root).material=w.mat('#ffffff',{vertexColors:true});
      // Low foothills soften the silhouette without covering the passage.
      for(const s of [-1,1])part('cone',rock,e.x+s*(e.span*.5+9),e.y+11,e.z-6,18,23,e.depth*.85);
      // Gold keystones and a pair of silly eyes make the real opening readable.
      for(let i=0;i<9;i++)part('box','#d4bd8f',e.x-e.width/2+i*e.width/8,e.y+e.height+.2,e.z+e.depth/2+.3,3,1.2,1.2);
      eye(root,e.x-e.width/2-6,e.y+e.height+6,e.z+e.depth/2+.3,2);eye(root,e.x+e.width/2+6,e.y+e.height+6,e.z+e.depth/2+.3,2);
      for(let i=0;i<7;i++)markers.push({x:e.x,y:e.y+3+Math.sin(i)*.25,z:e.z+e.depth/2+16-i*9});
    }else{
      gate=new THREE.Group();gate.userData.courseDynamic=true;dynamic.add(gate);
      for(let i=0;i<14;i++){
        const x=e.x-e.width/2+3+(i%5)*(e.width-6)/4,y=e.y+3+Math.floor(i/5)*5;
        const b=part('sphere',rock,x,y,e.z+Math.sin(i)*2,5.5,4.2,e.depth*.55,gate);b.rotation.set(i*.4,i*.7,i*.2);
      }
      target=new THREE.Group();target.userData.courseDynamic=true;dynamic.add(target);const t=encounterTarget(e);target.position.set(t.x,t.y,t.z);
      for(let i=0;i<5;i++){const m=part('cylinder','#e05a45',Math.sin(i*1.25)*1.6,Math.cos(i*1.25)*1.6,0,.8,6,.8,target);m.rotation.x=Math.PI/2;}
      for(const z of [-1.7,1.7])part('box',gold,0,0,z,4.9,4.9,.35,target);
      eye(target,-.8,.3,3.2,.5);eye(target,.8,.3,3.2,.5);part('cylinder',wood,0,3.5,0,.14,3,.14,target);
      markers.push({x:t.x,y:t.y+6,z:t.z},{x:t.x-5,y:t.y+3,z:t.z+1},{x:t.x+5,y:t.y+3,z:t.z+1});
      batchMovingGroup(gate);batchMovingGroup(target);
    }
  }else{
    const x=h.cup.x,z=h.cup.z;
    for(let i=0;i<5;i++)markers.push({x:x+Math.sin(i*1.256)*4,y:h.cup.y+2.5,z:z+Math.cos(i*1.256)*4});
  }
  const star=new THREE.Shape();star.moveTo(0,1);for(let i=1;i<8;i++){const a=i*Math.PI/4,r=i%2?.22:1;star.lineTo(Math.sin(a)*r,Math.cos(a)*r);}star.closePath();
  const stars=new THREE.InstancedMesh(new THREE.ShapeGeometry(star),new THREE.MeshBasicMaterial({color:'#ffe49a',side:THREE.DoubleSide,transparent:true,opacity:.9,depthWrite:false,toneMapped:false}),markers.length);
  stars.frustumCulled=false;stars.userData.ownedMaterial=true;dynamic.add(stars);
  const count=w.settings?.graphics==='low'?24:48,burst=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),new THREE.MeshBasicMaterial({color:'#ffffff',toneMapped:false}),count);
  const tint=new THREE.Color();for(let i=0;i<count;i++)burst.setColorAt(i,tint.set(i<count*.4?['#ffe270','#ff9c35','#ffc04f'][i%3]:['#948c74','#c0b59a','#787b6c'][i%3]));
  burst.frustumCulled=false;burst.count=0;burst.userData.ownedMaterial=true;dynamic.add(burst);
  const smoke=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),new THREE.MeshBasicMaterial({color:'#938b78',transparent:true,opacity:.5,depthWrite:false}),w.settings?.graphics==='low'?8:14);
  smoke.frustumCulled=false;smoke.count=0;smoke.userData.ownedMaterial=true;dynamic.add(smoke);
  const flash=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),new THREE.MeshBasicMaterial({color:'#ffed9d',transparent:true,opacity:.9,depthWrite:false,toneMapped:false}));
  flash.visible=false;flash.userData.ownedMaterial=true;dynamic.add(flash);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.92,1,32),new THREE.MeshBasicMaterial({color:'#ffe8ac',transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}));
  ring.visible=false;ring.userData.ownedMaterial=true;dynamic.add(ring);
  const dummy=new THREE.Object3D(),particles=[];let age=-1,clock=0,cleared=false,previousZoom=13;
  const state={root,dynamic,stars,burst,smoke,gate,target,markers,update(dt,physics){
    if(w.presentationPaused||w.suspended)return;clock+=dt;
    const s=physics?.encounter;
    if(s?.cleared&&!cleared){
      cleared=true;age=0;if(gate)gate.visible=false;if(target)target.visible=false;
      if(!w.settings?.reducedMotion){previousZoom=w.zoom??13;state.focus={x:e.x,y:e.y+8,z:e.z};w.adventureMoment=state.focus;w.zoom=Math.max(55,previousZoom);}
      if(w.settings?.particles!==false)for(let i=0;i<(w.settings?.reducedMotion?12:count);i++)particles.push({a:i*2.39996,s:12+i%5*2,up:13+i%7*2,fire:i<count*.4});
      w.renderer.shadowMap.needsUpdate=true;
    }
    stars.visible=!(e?.kind==='dynamite'&&cleared)&&!(e?.kind==='tunnel'&&s?.passed);
    for(let i=0;i<markers.length;i++){
      const p=markers[i];dummy.position.set(p.x,p.y+(w.settings?.reducedMotion?0:Math.sin(clock*2+i)*.35),p.z);dummy.quaternion.copy(w.camera.quaternion);
      dummy.scale.setScalar(.7+(w.settings?.reducedMotion?.3:Math.sin(clock*2.2+i)**6)*.7);dummy.updateMatrix();stars.setMatrixAt(i,dummy.matrix);
    }
    stars.instanceMatrix.needsUpdate=true;
    if(age<0)return;age+=dt;let n=0;
    if(state.focus&&age>1.6){if(w.cameraHold===state.focus)w.cameraHold=null;w.adventureMoment=null;state.focus=null;if(w.zoom===Math.max(55,previousZoom))w.zoom=previousZoom;}
    if(age<3.4)for(const p of particles){
      const y=e.y+7+p.up*age-4*age*age;if(y<e.y)continue;
      dummy.position.set(e.x+Math.sin(p.a)*p.s*age,y,e.z+Math.cos(p.a)*p.s*age);
      dummy.rotation.set(age+p.a,age*2,p.a);const size=p.fire?Math.max(0,4.5*(1-age/1.3)):1.4*(1-age/4);if(size<=0)continue;dummy.scale.setScalar(size);dummy.updateMatrix();burst.setMatrixAt(n++,dummy.matrix);
    }
    burst.count=n;burst.instanceMatrix.needsUpdate=true;
    const effects=w.settings?.particles!==false,reduced=w.settings?.reducedMotion;
    flash.visible=effects&&!reduced&&age<.7;ring.visible=effects&&age<1;
    if(flash.visible){flash.position.set(e.x,e.y+8,e.z);flash.scale.setScalar(3+Math.sin(age/.7*Math.PI)*9);flash.material.opacity=.9*(1-age/.7);}
    if(ring.visible){ring.position.set(e.x,e.y+8,e.z);ring.quaternion.copy(w.camera.quaternion);ring.scale.setScalar(4+age*28);ring.material.opacity=.8*(1-age);}
    n=0;
    if(effects&&age>.25&&age<4.5)for(let i=0;i<(reduced?4:smoke.instanceMatrix.count);i++){
      const t=age-.25,a=i*2.39996;dummy.position.set(e.x+Math.sin(a)*(2+t*2),e.y+6+t*(3+i%3),e.z+Math.cos(a)*(2+t*2));
      dummy.rotation.set(a,age*.3,0);dummy.scale.setScalar(2+t*2.1);dummy.updateMatrix();smoke.setMatrixAt(n++,dummy.matrix);
    }
    smoke.count=n;smoke.material.opacity=Math.min(.5,Math.max(0,(4.5-age)/3));smoke.instanceMatrix.needsUpdate=true;
    if(age>4.5)age=-2;
  }};
  w.courseAdventure=state;state.update(0,null);
}

export function installCourseAdventures(ui) {
  const w=ui.world,load=w.load.bind(w),update=w.update.bind(w),event=ui.game.onEvent;
  w.load=h=>{
    if(w.cameraHold===w.adventureMoment)w.cameraHold=null;w.adventureMoment=null;w.courseAdventure=null;const result=load(h);
    if(h.encounter)ui.toast(h.encounter.kind==='tunnel'?'Thread the mountain’s sparkles. Lower spin keeps the shot beneath the rock.':'Hit the sparkling red TNT to clear the rockfall.');
    return result;
  };
  w.update=(dt,ball,physics)=>{w.courseAdventure?.update(dt,physics);return update(dt,ball,physics);};
  ui.game.onEvent=(name,...args)=>{
    if(name==='dynamite'){ui.game.clearInput();ui.toast('BOOM! The shortcut is clear.');ui.audio.play('pirate-ship');}
    if(name==='mountain-pass')ui.toast('Through the mountain! Beautiful line.');
    return event(name,...args);
  };
}
