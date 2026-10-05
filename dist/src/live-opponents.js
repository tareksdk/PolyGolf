import * as THREE from '../vendor/three.module.js';
import { ITEMS, ITEM_BY_ID } from './catalog.js';
import { createGolfer } from './golfer.js';
import { installTrails } from './trails.js';
import { ballFinish } from './item-designs.js';
import { finishItem } from './finishes.js';
import { applyFinish } from './finish-material.js';
import { nameplate } from './nameplates.js';
import { emoteKind } from './emotes.js';
import { LiveBuffer } from './live-state.js';

export class LiveOpponent {
  constructor(world,member,layer){
    this.world=world;this.member=member;this.buffer=new LiveBuffer();this.group=new THREE.Group();world.scene.add(this.group);
    this.group.name='opponent-'+member.id;
    this.context={scene:this.group,camera:world.camera,geometries:world.geometries,mesh:world.mesh.bind(world),mat:world.mat.bind(world),
      renderGround:world.renderGround.bind(world),mode:'play',remote:true,hole:world.hole,items:ITEMS};
    this.avatar=createGolfer(this.context);
    this.ball=new THREE.Group();this.group.add(this.ball);this.context.ball=this.ball;
    installTrails(this.context);
    this.pulse=new THREE.Mesh(new THREE.RingGeometry(.75,1,32),new THREE.MeshBasicMaterial({color:'#e9c567',transparent:true,depthWrite:false,side:THREE.DoubleSide}));
    this.pulse.rotation.x=-Math.PI/2;this.pulse.visible=false;this.group.add(this.pulse);
    this.label=document.createElement('div');this.label.className='opponent-label';
    this.label.innerHTML=nameplate(member.name,member.nameplate,{compact:true})+'<small></small>';layer.append(this.label);
    this.status=this.label.querySelector('small');this.projected=new THREE.Vector3();this.eventIds={};
  }
  equip(equipment){
    this.context.equipment=equipment;
    this.context.trailColor=equipment.trail==='trail-none'?null:ITEM_BY_ID[equipment.trail]?.color;
    const item=finishItem(ITEM_BY_ID[equipment.ball],equipment),key=item.id+':'+(item.seed??'');
    if(this.ballKey===key)return;this.ballKey=key;this.clearBall();
    const material=new THREE.MeshStandardMaterial({color:item.color,roughness:.7});
    const mesh=new THREE.Mesh(this.world.geometries.golf,material);mesh.scale.setScalar(.24);this.ball.add(mesh);
    applyFinish(mesh,item);if(mesh.material!==material)material.dispose();
    this.ballMesh=mesh;this.detail=ballFinish(this.context,item,this.ball,.24);
  }
  clearBall(){
    this.ballMesh?.material.dispose();
    this.detail?.traverse(o=>{if(o.geometry&&!Object.values(this.world.geometries).includes(o.geometry))o.geometry.dispose();if(o.userData.ownedMaterial){o.material.map?.dispose();o.material.dispose();}});
    this.ball.clear();
  }
  update(dt,now,hole,visible,delay){
    const s=this.buffer.sample(now,delay);this.label.hidden=!visible;this.group.visible=!!s&&visible&&s.hole===hole;
    if(!visible)return;
    if(!s){this.status.textContent='Connecting…';this.label.classList.add('is-away');return;}
    if(s.hole!==hole){this.label.classList.add('is-away');this.label.style.transform='';this.status.textContent=s.hole.startsWith('sudden')?'Sudden death':`On hole ${Number(s.hole)+1}`;return;}
    this.label.classList.remove('is-away');
    this.equip(s.equipment);
    const w=this.world,c=this.context,b=s.ball,golf=w.hole.mode==='golf',radius=golf?(w.visualBallRadius||.065):.24;
    c.hole=w.hole;c.settings=w.settings;c.clock=w.clock;c.activeClub=s.club;c.aimDirection={x:s.dx,z:s.dz};
    this.ball.visible=!s.sunk;this.ball.scale.setScalar(radius/.24);
    this.ball.position.set(b.x,golf?Math.max(b.y-.021335,w.renderGround(b.x,b.z))+radius+.008:Math.max(b.y,w.renderGround(b.x,b.z)+.245),b.z);
    this.ball.rotation.x+=b.vz*dt*2;this.ball.rotation.z-=b.vx*dt*2;
    for(const kind of ['swing','emote']){
      const event=s[kind];if(!event||this.eventIds[kind]===event.id)continue;
      this.eventIds[kind]=event.id;
      const age=Math.max(0,(s.at-event.at)/1000);
      if(kind==='swing'&&age<1.6){c.beginSwing(s.anchor,{x:s.dx,z:s.dz},s.club);c.swingPose.time=age;}
      if(kind==='emote'&&age<2.8&&event.item){c.emotePose={kind:emoteKind(ITEM_BY_ID[event.item]),time:age};this.emoteName=ITEM_BY_ID[event.item].name;}
    }
    c.updateGolfer(dt,s.anchor,{active:false,sunk:false});
    // Golfers stay beside their last shot while the ball flies, including on mini courses.
    c.updateRibbon(dt,b,{active:s.active,sunk:s.sunk});
    if(s.sunk&&!this.wasSunk){
      this.celebration=0;const color=ITEM_BY_ID[s.equipment.hole]?.color||'#e9c567';
      this.pulse.material.color.set(color);this.pulse.position.set(b.x,w.renderGround(b.x,b.z)+.04,b.z);
      w.burst(b.x,w.renderGround(b.x,b.z)+.4,b.z,color,w.settings.graphics==='low'?10:24);
    }
    this.wasSunk=s.sunk;
    this.pulse.visible=this.celebration!==undefined&&this.celebration<1.6&&w.settings.particles!==false;
    if(this.pulse.visible){this.celebration+=dt;this.pulse.scale.setScalar((golf?.3:.7)+this.celebration*2.2);this.pulse.material.opacity=Math.max(0,.9-this.celebration/1.6);}
    this.projected.copy(s.active?this.ball.position:this.avatar.position).y+=s.active?.6:2.15;
    this.projected.project(w.camera);
    let x=(this.projected.x+1)*innerWidth/2,y=(1-this.projected.y)*innerHeight/2;
    const behind=this.projected.z>1;
    if(behind){x=innerWidth-x;y=innerHeight-60;}
    x=Math.max(85,Math.min(innerWidth-85,x));y=Math.max(40,Math.min(innerHeight-45,y));
    this.label.style.transform=`translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) translate(-50%,-100%)`;
    const stale=now-this.buffer.samples.at(-1).time>5000;
    const status=stale?'Connection interrupted':c.emotePose?this.emoteName:s.sunk?'In the cup!':s.active?'Ball in motion':hole.startsWith('sudden')?'Sudden death':`Hole ${Number(hole)+1}`;
    if(this.status.textContent!==status)this.status.textContent=status;
  }
  dispose(){this.label.remove();this.context.disposeRibbon();this.context.disposeGolfer();this.clearBall();this.pulse.geometry.dispose();this.pulse.material.dispose();this.group.removeFromParent();}
}
