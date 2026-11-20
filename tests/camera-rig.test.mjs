import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import { CameraRig, spring } from '../dist/src/camera-rig.js';

function setup({ cinematic = false, golf = true, aspect = 16 / 9 } = {}) {
  const world = {
    camera: new THREE.PerspectiveCamera(golf ? 45 : 39, aspect, .1, 3000),
    look: new THREE.Vector3(), cameraTarget: new THREE.Vector3(), cameraPosition: new THREE.Vector3(),
    hole: {mode: golf ? 'golf' : 'mini'}, group: new THREE.Group(),
    settings: {cinematicCamera: cinematic}, orbit: 0, zoom: golf ? 13 : 18, pitch: .24,
    renderGround: () => 0,
  };
  const rig = new CameraRig(world);
  world.cameraRig = rig;
  const ball = {x:0, y:golf ? .022 : .24, z:0, vx:0, vy:0, vz:0};
  const physics = {active:false, sunk:false, airborne:false};
  rig.reset(ball,{cut:true});
  rig.update(1 / 60,ball,physics);
  return {world,rig,ball,physics};
}
function advance(ctx, seconds, fps = 60) {
  const {rig,ball,physics} = ctx;
  for (let i = 0; i < Math.round(seconds * fps); i++) {
    ball.x += ball.vx / fps; ball.y += ball.vy / fps; ball.z += ball.vz / fps;
    rig.update(1 / fps,ball,physics);
  }
}

test('exact spring is independent of timestep and tracks a moving target without lag', () => {
  const results = [30,60,144].map(fps => {
    const s = {value:0,velocity:0};
    for(let i=1;i<=fps*2;i++) spring(s,20*i/fps,8,1/fps,20);
    return s.value;
  });
  assert.ok(Math.max(...results)-Math.min(...results)<1e-10);
  assert.ok(Math.abs(results[0]-40)<.001);
});

test('default fast follow keeps ball framed and converges across frame rates', () => {
  const final = [];
  for(const fps of [30,60,144]) {
    const c=setup(); c.physics.active=true; c.ball.vz=-65;
    c.rig.beginShot(c.ball);
    advance(c,3,fps);
    const p=new THREE.Vector3(c.ball.x,c.ball.y,c.ball.z).project(c.world.camera);
    assert.ok(Math.abs(p.x)<.7 && Math.abs(p.y)<.7 && p.z<1,JSON.stringify(p));
    assert.ok(c.rig.anchor.z<c.ball.z,'anticipates travel');
    assert.ok(c.rig.distance.value>25,'widens for speed');
    final.push(c.world.camera.position.clone());
  }
  assert.ok(final[0].distanceTo(final[2])<.4);
});

test('cinematic selection holds through brief bounces and returns to preparation', () => {
  const c=setup({cinematic:true}); c.physics.active=true; c.ball.vz=-60; c.ball.vy=10; c.physics.airborne=true;
  c.rig.beginShot(c.ball); advance(c,2);
  assert.equal(c.rig.state,'wide');
  c.ball.y=.022;c.ball.vy=0;c.physics.airborne=false;advance(c,.15);
  assert.equal(c.rig.state,'wide');
  c.ball.y=3;c.physics.airborne=true;advance(c,.15);
  assert.equal(c.rig.state,'wide');
  c.physics.active=false;c.ball.vz=0;c.ball.y=.022;advance(c,3);
  assert.equal(c.rig.state,'follow');
  assert.ok(c.rig.blend.value<.001);
});

test('manual takeover preserves rendered angle and suspends auto directing', () => {
  const c=setup({cinematic:true}); c.physics.active=true;c.ball.vz=-40;c.ball.vx=15;
  c.rig.beginShot(c.ball);advance(c,2);
  const before=c.rig.angle.value;
  c.rig.manualInput();
  assert.equal(c.world.orbit,before);
  c.world.orbit+=.8;advance(c,1);
  assert.equal(c.rig.isCinematic,false);
  assert.equal(c.rig.manualActive,true);
  assert.ok(Math.abs(c.rig.angle.value-c.world.orbit)<.06);
  advance(c,2);
  assert.equal(c.rig.manualActive,false);
});

test('skip stays off for current shot, next shot re-enables; reduced motion disables direction changes', () => {
  const c=setup({cinematic:true});c.physics.active=true;c.ball.vz=-35;
  c.rig.beginShot(c.ball);advance(c,1);
  assert.equal(c.rig.isCinematic,true);
  c.rig.skip();advance(c,2);assert.equal(c.rig.isCinematic,false);
  c.rig.beginShot(c.ball);advance(c,1);assert.equal(c.rig.isCinematic,true);
  c.world.settings.reducedMotion=true;advance(c,2);assert.equal(c.rig.isCinematic,false);
});

test('stationary framing is stable, portrait frame fits, pause freezes, reset clears momentum', () => {
  for(const aspect of [.48,16/9]) {
    const c=setup({aspect});advance(c,4);
    const before=c.world.camera.position.clone();advance(c,1);
    assert.ok(before.distanceTo(c.world.camera.position)<.001);
    c.physics.active=true;c.ball.vx=50;advance(c,1);
    c.world.presentationPaused=true;
    const paused=c.world.camera.position.clone();advance(c,.5);
    assert.ok(paused.equals(c.world.camera.position));
    c.world.presentationPaused=false;c.ball.x=0;c.ball.vx=0;c.physics.active=false;
    c.rig.reset(c.ball,{cut:false});advance(c,3);
    assert.ok(c.rig.anchor.distanceTo(new THREE.Vector3(c.ball.x,c.ball.y,c.ball.z))<.03);
    const p=new THREE.Vector3(c.ball.x,c.ball.y,c.ball.z).project(c.world.camera);
    assert.ok(Math.abs(p.x)<.7 && Math.abs(p.y)<.7);
  }
});

test('presentation holds take precedence, manual input releases camera influence, physics is read-only', () => {
  const c=setup({cinematic:true});c.physics.active=true;c.ball.vz=-40;
  c.world.cameraHold={x:10,y:2,z:5};
  const original=JSON.stringify(c.ball);
  for(let i=0;i<90;i++)c.rig.update(1/60,c.ball,c.physics);
  assert.equal(JSON.stringify(c.ball),original);
  assert.equal(c.rig.isCinematic,false);
  assert.ok(Math.abs(c.rig.anchor.x-10)<.01);
  c.rig.manualInput();advance(c,.5);
  assert.ok(c.rig.anchor.x<1);
});

test('finish camera is brief and skippable, including a large frame interval', () => {
  const c=setup({cinematic:true});c.physics.sunk=true;
  c.rig.update(.1,c.ball,c.physics);assert.equal(c.rig.state,'finish');
  advance(c,1.2);assert.equal(c.rig.isCinematic,false);
  assert.ok(c.world.camera.position.toArray().every(Number.isFinite));
  c.rig.reset(c.ball,{cut:true});c.rig.update(.1,c.ball,c.physics);
  c.rig.skip();assert.equal(c.rig.isCinematic,false);
});

test('clearing a tall wall releases camera distance smoothly and keeps the nearby ball framed',()=>{
  const c=setup();
  const wall=new THREE.Mesh(new THREE.BoxGeometry(8,20,1),new THREE.MeshBasicMaterial());
  wall.position.set(0,10,4);c.world.group.add(wall);c.rig.clearance.reset();
  advance(c,2);
  const close=c.world.camera.position.clone();
  assert.ok(close.z<3.18,'camera is on the subject side of the wall');
  assert.ok(close.y>=1.4,'retracted camera remains above terrain');
  const subject=new THREE.Vector3(c.ball.x,c.ball.y,c.ball.z).project(c.world.camera);
  assert.ok(Math.abs(subject.x)<.85&&Math.abs(subject.y)<.85&&subject.z<1,'ball stays visible at a close wall');
  wall.removeFromParent();
  c.rig.update(1/60,c.ball,c.physics);
  assert.ok(close.distanceTo(c.world.camera.position)<.15,'first released frame cannot pop to the full boom');
  let previous=c.world.camera.position.clone(),largestStep=0;
  for(let i=0;i<180;i++){
    c.rig.update(1/60,c.ball,c.physics);
    largestStep=Math.max(largestStep,previous.distanceTo(c.world.camera.position));
    previous.copy(c.world.camera.position);
  }
  assert.ok(largestStep<.45,'distance recovers at a bounded rate');
  assert.ok(Math.abs(c.world.camera.position.z-c.world.zoom)<.02,'ordinary framing fully recovers');
});

test('clearing a low wall releases extra camera height without a vertical drop',()=>{
  const c=setup();c.world.pitch=.16;c.world.zoom=7;
  const wall=new THREE.Mesh(new THREE.BoxGeometry(6,1,.4),new THREE.MeshBasicMaterial());
  wall.position.set(0,.5,2.5);c.world.group.add(wall);c.rig.clearance.reset();
  advance(c,3);
  const raised=c.world.camera.position.clone();
  assert.ok(raised.y>4,'low wall creates a raised sight line');
  wall.visible=false;c.rig.update(1/60,c.ball,c.physics);
  assert.ok(raised.distanceTo(c.world.camera.position)<.1,'height release starts gently');
  advance(c,3);
  assert.ok(c.world.camera.position.y<2.6,'camera returns to the selected low angle');
});

test('fast lateral motion beside a close wall keeps the actual ball inside the safe frame',()=>{
  for(const golf of [false,true]) for(const speed of [12,golf?50:20]) for(const aspect of [16/9,.48]) {
    const c=setup({golf,aspect});
    const wall=new THREE.Mesh(new THREE.BoxGeometry(70,30,1),new THREE.MeshBasicMaterial());
    wall.position.set(15,15,2);c.world.group.add(wall);c.rig.clearance.reset();
    c.physics.active=true;c.ball.vx=speed;c.rig.beginShot(c.ball);
    const projected=new THREE.Vector3();let outside=0,maxExtent=0;
    for(let i=0;i<90;i++) {
      c.ball.x+=c.ball.vx/60;c.rig.update(1/60,c.ball,c.physics);
      projected.set(c.ball.x,c.ball.y,c.ball.z).project(c.world.camera);
      maxExtent=Math.max(maxExtent,Math.abs(projected.x),Math.abs(projected.y));
      if(Math.abs(projected.x)>.9||Math.abs(projected.y)>.9||projected.z>=1)outside++;
    }
    assert.equal(outside,0,`${golf?'golf':'mini'} ${speed}m/s aspect ${aspect}: ${outside} frames lost the ball; maximum projected extent ${maxExtent}`);
  }
});


test('explicitly enabling cinematic again releases a current-shot skip', () => {
  const c=setup({cinematic:true});c.physics.active=true;c.ball.vz=-35;
  c.rig.beginShot(c.ball);advance(c,1);c.rig.skip();advance(c,.3);
  assert.equal(c.rig.isCinematic,false);
  c.rig.enableCinematic();advance(c,1);
  assert.equal(c.rig.isCinematic,true);
});
