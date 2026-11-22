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

const STALE_AFTER = 5200;
const FLIGHT_COLOR = '#b4f4da';
const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
let glowTexture;

export const roomTagWidth = name => Math.max(34, Math.min(112, String(name).length * 6.1 + 10));

function flightGlow() {
  if (!glowTexture) {
    const size = 48, data = new Uint8Array(size * size * 4);
    for (let i = 0; i < size * size; i++) {
      const r = Math.hypot((i % size + .5) / size * 2 - 1, (Math.floor(i / size) + .5) / size * 2 - 1);
      const alpha = Math.max(0, 1 - r) ** 2 * .55 + Math.exp(-((r - .37) ** 2) / .015) * .34;
      data.set([255, 255, 255, Math.round(255 * alpha)], i * 4);
    }
    glowTexture = new THREE.DataTexture(data, size, size);
    glowTexture.minFilter = glowTexture.magFilter = THREE.LinearFilter;
    glowTexture.needsUpdate = true;
  }
  const material = new THREE.SpriteMaterial({ map: glowTexture, color: FLIGHT_COLOR, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity: .78 });
  const sprite = new THREE.Sprite(material);
  sprite.name = 'remote-flight-glow';
  sprite.visible = false;
  return sprite;
}

export class LiveOpponent {
  constructor(world,member,layer,{room=false}={}){
    this.world=world;this.member=member;this.buffer=new LiveBuffer();this.group=new THREE.Group();world.scene.add(this.group);
    this.room=room;
    this.group.name='opponent-'+member.id;
    this.context={scene:this.group,camera:world.camera,geometries:world.geometries,mesh:world.mesh.bind(world),mat:world.mat.bind(world),
      renderGround:world.renderGround.bind(world),mode:'play',remote:true,hole:world.hole,items:ITEMS};
    this.avatar=createGolfer(this.context);
    this.ball=new THREE.Group();this.ball.name='remote-ball';this.group.add(this.ball);this.context.ball=this.ball;
    if (room) { this.glow = flightGlow(); this.group.add(this.glow); }
    installTrails(this.context);
    this.pulse=new THREE.Mesh(new THREE.RingGeometry(.75,1,32),new THREE.MeshBasicMaterial({color:'#e9c567',transparent:true,depthWrite:false,side:THREE.DoubleSide}));
    this.pulse.rotation.x=-Math.PI/2;this.pulse.visible=false;this.group.add(this.pulse);
    this.label=document.createElement('div');this.label.className='opponent-label';
    if (room) {
      this.label.classList.add('room-opponent-label');
      const name=document.createElement('span');name.className='room-opponent-name';name.textContent=member.name;
      this.label.append(name,document.createElement('small'));
    } else this.label.innerHTML=nameplate(member.name,member.nameplate,{compact:true})+'<small></small>';
    this.label.hidden = true;
    layer.append(this.label);
    this.status=this.label.querySelector('small');this.projected=new THREE.Vector3();this.eventIds={};
  }
  equip(equipment){
    this.context.equipment=equipment;
    this.trailColor=equipment.trail==='trail-none'?null:ITEM_BY_ID[equipment.trail]?.color;
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
    const s=this.buffer.sample(now,delay), last=this.buffer.samples.at(-1);
    this.stale = !!last && now-last.time>STALE_AFTER;
    this.sample = s?.hole===hole && !this.stale ? s : null;
    this.viewTarget = null;
    this.label.hidden = !visible || (this.room && !this.sample);
    this.group.visible=!!s&&visible&&s.hole===hole&&(!this.room||!this.stale);
    if(!visible || (this.room && !this.sample))return;
    if(!s){this.status.textContent='Connecting…';this.label.classList.add('is-away');return;}
    if(s.hole!==hole){this.label.classList.add('is-away');this.label.style.transform='';this.status.textContent=s.hole.startsWith('sudden')?'Sudden death':`On hole ${Number(s.hole)+1}`;return;}
    this.label.classList.remove('is-away');
    this.equip(s.equipment);
    const w=this.world,c=this.context,b=s.ball,golf=w.hole.mode==='golf',radius=golf?(w.visualBallRadius||.065):.24;
    c.hole=w.hole;c.settings=w.settings;c.clock=w.clock;c.activeClub=s.club;c.aimDirection={x:s.dx,z:s.dz};
    const ground = w.renderGround(b.x,b.z);
    const flight = this.room && s.active && !s.sunk && b.y-ground > (golf ? .22 : .46);
    this.ball.visible=!s.sunk;
    this.ball.position.set(b.x,golf?Math.max(b.y-.021335,ground)+radius+.008:Math.max(b.y,ground+.245),b.z);
    let viewRadius = radius;
    if (this.room) {
      const unitsPerPixel = 2*w.camera.position.distanceTo(this.ball.position) *
        Math.tan(w.camera.fov*Math.PI/360) / Math.max(1,innerHeight);
      const goal = flight ? Math.max(radius*1.25,Math.min(golf?.34:.44,unitsPerPixel*3)) : radius;
      this.viewRadius ??= radius;
      this.viewRadius += (goal-this.viewRadius)*(1-Math.exp(-dt*14));
      viewRadius = this.viewRadius;
      this.glow.visible = flight && w.settings?.particles!==false;
      if (this.glow.visible) {
        this.glow.position.copy(this.ball.position);
        this.glow.scale.setScalar(viewRadius*6.6);
      }
      this.wakeTime = flight ? .75 : Math.max(0,(this.wakeTime||0)-dt);
      if (!s.sunk) this.viewTarget = this.ball.position;
    }
    this.ball.scale.setScalar(viewRadius/.24);
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
    const wake = this.room && this.wakeTime > 0 && !w.settings?.reducedMotion && !reducedMotion?.matches;
    c.trailColor = this.trailColor || (wake ? FLIGHT_COLOR : null);
    c.visualBallRadius = viewRadius;
    c.updateRibbon(dt,b,{active:s.active && (!!this.trailColor || flight),sunk:s.sunk});
    if(s.sunk&&!this.wasSunk){
      this.celebration=0;const color=ITEM_BY_ID[s.equipment.hole]?.color||'#e9c567';
      this.pulse.material.color.set(color);this.pulse.position.set(b.x,w.renderGround(b.x,b.z)+.04,b.z);
      w.playHoleEffect?.(w.hole.cup,s.equipment.hole,{remote:true});
    }
    this.wasSunk=s.sunk;
    this.pulse.visible=!w.playHoleEffect&&this.celebration!==undefined&&this.celebration<1.6&&w.settings.particles!==false;
    if(this.pulse.visible){this.celebration+=dt;this.pulse.scale.setScalar((golf?.3:.7)+this.celebration*2.2);this.pulse.material.opacity=Math.max(0,.9-this.celebration/1.6);}
    const status=this.stale?'Connection interrupted':c.emotePose?this.emoteName:s.sunk?'In the cup!':
      this.room?'':s.active?'Ball in motion':hole.startsWith('sudden')?'Sudden death':`Hole ${Number(hole)+1}`;
    if(this.status.textContent!==status)this.status.textContent=status;
    this.moving = s.active;
  }
  projectLabel(occupied){
    if (!this.group.visible) return;
    const w=this.world;
    this.projected.copy(this.moving?this.ball.position:this.avatar.position).y+=this.moving?.45:2.15;
    this.projected.project(w.camera);
    let x=(this.projected.x+1)*innerWidth/2,y=(1-this.projected.y)*innerHeight/2;
    const behind=this.projected.z>1;
    if(this.room){
      this.label.hidden=behind||this.projected.z<-1||x<14||x>innerWidth-14||y<25||y>innerHeight-10;
      if(this.label.hidden)return;
      const half = roomTagWidth(this.member.name) / 2;
      const height = this.status.textContent ? 32 : 17;
      const left = x - half, right = x + half;
      const intersects = () => occupied.some(r => left < r.right + 3 && right + 3 > r.left &&
        y - height < r.bottom + 2 && y + 2 > r.top);
      for (let lane = 0; lane < 2 && intersects(); lane++) y -= height + 3;
      this.label.hidden = y < 25 || intersects();
      if(this.label.hidden)return;
      occupied.push({ left, right, top:y-height, bottom:y });
    }else{
      if(behind){x=innerWidth-x;y=innerHeight-60;}
      x=Math.max(85,Math.min(innerWidth-85,x));y=Math.max(40,Math.min(innerHeight-45,y));
    }
    this.label.style.transform=`translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) translate(-50%,-100%)`;
  }
  dispose(){this.label.remove();this.context.disposeRibbon();this.context.disposeGolfer();this.clearBall();this.pulse.geometry.dispose();this.pulse.material.dispose();this.glow?.material.dispose();this.group.removeFromParent();}
}
