import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import { World } from '../dist/src/world.js';
import { getGolfHole } from '../dist/src/golf-courses.js';
import { encodeCoursePreview, installCoursePreviews, releasePreviewStudio } from '../dist/src/course-previews.js';

function pointerWorld() {
  const w = Object.create(World.prototype);
  w.canvas = {getBoundingClientRect:()=>({left:100, top:50, width:800, height:600})};
  w.ball = new THREE.Group(); w.ball.position.set(30,2,-75);
  w.camera = new THREE.PerspectiveCamera(45, 4/3, .5, 3000);
  w.camera.position.set(40,10,40); w.camera.lookAt(w.ball.position); w.camera.updateMatrixWorld();
  w.hole = {length:420};
  w.pointerRay = new THREE.Raycaster(); w.pointerNdc = new THREE.Vector2();
  w.pointerPlane = new THREE.Plane(new THREE.Vector3(0,1,0)); w.pointerPoint = new THREE.Vector3();
  return w;
}

test('pointer aim respects canvas offsets and stays continuous through the sky horizon',()=>{
  const w = pointerWorld();
  assert.ok(w.pointerToWorld(500,350).distanceTo(w.ball.position)<1e-8);
  const scratch = w.pointerPoint;
  let previous;
  for(let y=50;y<=280;y+=.25) {
    const p=w.pointerToWorld(610,y), dx=p.x-w.ball.position.x, dz=p.z-w.ball.position.z;
    assert.equal(p,scratch); assert.ok([p.x,p.y,p.z].every(Number.isFinite));
    assert.ok(Math.hypot(dx,dz)>20,'aiming at the sky must keep pointing beyond the ball');
    const angle=Math.atan2(dx,dz);
    if(previous!==undefined)assert.ok(Math.abs(Math.atan2(Math.sin(angle-previous),Math.cos(angle-previous)))<.01,'no origin snap at the horizon');
    previous=angle;
  }
});

function updateWorld() {
  const w=Object.create(World.prototype), calls={render:0,flight:0,obstacles:0,weather:0};
  const noop=()=>{};
  Object.assign(w,{
    clock:0, mode:'play', hole:getGolfHole(0,0), settings:{graphics:'medium'},
    group:new THREE.Group(), garageStage:new THREE.Group(), scene:new THREE.Scene(),
    animations:[{type:'cloud',mesh:new THREE.Group(),base:0,phase:0}],
    flag:new THREE.Mesh(new THREE.PlaneGeometry(1,1,5,2)),
    ball:new THREE.Group(), ballHalo:new THREE.Group(), club:new THREE.Group(),
    camera:new THREE.PerspectiveCamera(), look:new THREE.Vector3(),
    cameraTarget:new THREE.Vector3(), cameraPosition:new THREE.Vector3(),
    orbit:0,zoom:13,pitch:.24,renderGround:()=>0,
    updateFlight:()=>calls.flight++, atmosphere:{update:()=>calls.weather++},
    renderer:{shadowMap:{},info:{render:{calls:0}},setRenderTarget:noop,setScissorTest:noop,setViewport:noop,
      state:{buffers:{color:{setMask:noop},depth:{setMask:noop},stencil:{setMask:noop}}},
      clear:noop,render:()=>calls.render++},
  });
  const particle={mesh:new THREE.Mesh(),life:10,vx:1,vy:2,vz:3};w.particles=[particle];
  const physics={active:false,airborne:false,sunk:false,obstacles:()=>{calls.obstacles++;return[];}};
  return {w,calls,particle,physics,ball:{x:0,y:.03,z:0,vx:0,vz:0}};
}

test('a full-screen locker freezes hidden course work and resumes with reused camera vectors',()=>{
  globalThis.innerWidth=1280; globalThis.innerHeight=720;
  const {w,calls,particle,physics,ball}=updateWorld(), target=w.cameraTarget, position=w.cameraPosition;
  w.update(1/60,ball,physics);
  assert.deepEqual(calls,{render:1,flight:1,obstacles:1,weather:1});
  const before={clock:w.clock,particle:particle.mesh.position.clone(),flagVersion:w.flag.geometry.attributes.position.version};
  w.suspended=true;
  for(let i=0;i<600;i++)w.update(1/60,ball,physics);
  assert.deepEqual(calls,{render:1,flight:1,obstacles:1,weather:1});
  assert.equal(w.clock,before.clock); assert.deepEqual(particle.mesh.position,before.particle);
  assert.equal(w.flag.geometry.attributes.position.version,before.flagVersion);
  w.suspended=false; w.update(1/60,ball,physics);
  assert.deepEqual(calls,{render:2,flight:2,obstacles:2,weather:2});
  assert.equal(w.cameraTarget,target); assert.equal(w.cameraPosition,position);
});

test('preview encoding is asynchronous and reports a failed canvas snapshot',async()=>{
  const OriginalReader=globalThis.FileReader;
  globalThis.FileReader=class {readAsDataURL(blob){this.result='data:'+blob.type+';base64,preview';queueMicrotask(()=>this.onload());}};
  try {
    let callback, requested;
    const promise=encodeCoursePreview({toBlob:(fn,type,quality)=>{callback=fn;requested={type,quality};}});
    let completed=false;promise.then(()=>completed=true);
    await Promise.resolve();assert.equal(completed,false);
    assert.deepEqual(requested,{type:'image/webp',quality:.88});
    callback(new Blob(['preview'],{type:'image/webp'}));
    assert.equal(await promise,'data:image/webp;base64,preview');
    await assert.rejects(encodeCoursePreview({toBlob:fn=>fn(null)}),/Could not encode/);
  } finally {globalThis.FileReader=OriginalReader;}
});

test('releasing a preview frees its own GPU assets while preserving shared game primitives',()=>{
  const w=Object.create(World.prototype);w.scene=new THREE.Scene();w.group=new THREE.Group();w.scene.add(w.group);
  const shared=new THREE.BoxGeometry(),owned=new THREE.SphereGeometry(),map=new THREE.Texture(),material=new THREE.MeshStandardMaterial({map});
  const sharedMaterial=new THREE.MeshStandardMaterial(); w.geometries={box:shared};
  const ownedMesh=new THREE.Mesh(owned,material);ownedMesh.userData.ownedMaterial=true;
  w.group.add(new THREE.Mesh(shared,sharedMaterial),ownedMesh);
  const disposed={shared:0,sharedMaterial:0,geometry:0,material:0,map:0,shadow:0,renderer:0,context:0};
  for(const [name,asset] of Object.entries({shared,sharedMaterial,geometry:owned,material,map}))asset.addEventListener('dispose',()=>disposed[name]++);
  w.sun={shadow:{dispose:()=>disposed.shadow++}};
  w.renderer={dispose:()=>disposed.renderer++,forceContextLoss:()=>disposed.context++};w.canvas={width:1080,height:660};
  releasePreviewStudio(w);
  assert.deepEqual(disposed,{shared:0,sharedMaterial:0,geometry:1,material:1,map:1,shadow:1,renderer:1,context:1});
  assert.equal(w.scene.children.length,0);assert.equal(w.canvas.width,1);assert.equal(w.canvas.height,1);
});

test('thumbnail jobs reuse placeholders, purge obsolete cache generations and skip abandoned cards',async()=>{
  const originals={localStorage:globalThis.localStorage,document:globalThis.document,setTimeout:globalThis.setTimeout,requestIdleCallback:globalThis.requestIdleCallback};
  const cache=new Map([['little-links.preview.old','old'],['polygolf.preview.v27.october.golf:0','old'],['polygolf-save-v1','save']]);
  const timers=[];
  globalThis.localStorage={get length(){return cache.size;},key:i=>[...cache.keys()][i],removeItem:key=>cache.delete(key),getItem:key=>cache.get(key)};
  globalThis.document={hidden:false,querySelectorAll:()=>[]};
  globalThis.setTimeout=fn=>timers.push(fn);globalThis.requestIdleCallback=undefined;
  try {
    const world={thumbCache:new Map(),mode:'menu'};installCoursePreviews(world);
    const first=world.thumbnail(0,'golf');assert.equal(world.thumbnail(0,'golf'),first);assert.equal(timers.length,1);
    assert.deepEqual([...cache.keys()],['polygolf-save-v1']);
    while(timers.length){timers.shift()();await Promise.resolve();}
    world.thumbnail(0,'golf');assert.equal(timers.length,1,'an abandoned job can be queued again on returning to Courses');
  } finally {Object.assign(globalThis,originals);}
});
