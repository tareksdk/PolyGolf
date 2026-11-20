import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {createCameraClearance} from '../dist/src/camera-clearance.js';

function fixture(mode='golf', ground=()=>0) {
  const world={group:new THREE.Group(),hole:{mode},renderGround:ground,animations:[],obstacleMeshes:[]};
  return {world,clearance:createCameraClearance(world),focus:new THREE.Vector3(0,.05,0)};
}
function box(world,x,y,z,w,h,d) {
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshBasicMaterial());
  mesh.position.set(x,y+h/2,z);world.group.add(mesh);return mesh;
}

test('camera clears the terrain endpoint and a ridge between it and the ball',()=>{
  const {clearance,focus}=fixture('golf',(x,z)=>z>4&&z<8?2:0);
  assert.equal(clearance.ground(0,6),2);
  const position=new THREE.Vector3(0,.2,12),original=position;
  assert.equal(clearance.resolve(focus,position),original);
  assert.ok(position.y>=1.4);
  for(let i=1;i<=12;i++) {
    const t=i/12,z=position.z*t,terrain=z>4&&z<8?2:0;
    assert.ok(focus.y+(position.y-focus.y)*t>terrain,'sight line stays above the intervening ridge');
  }
  assert.equal(position.x,0);assert.equal(position.z,12);
});
test('a low mini-golf wall raises the view while a tall wall retracts it',()=>{
  const low=fixture('mini');box(low.world,0,0,4,4,.5,.3);
  const lowPosition=new THREE.Vector3(0,1,10);
  low.clearance.resolve(low.focus,lowPosition);
  assert.ok(lowPosition.y>1.5);assert.equal(lowPosition.z,10);
  const high=fixture();box(high.world,0,0,4,4,20,1);
  const highPosition=new THREE.Vector3(0,4,12);
  high.clearance.resolve(high.focus,highPosition);
  assert.ok(highPosition.z<3.18,'camera stays on the ball side of a tall wall');
  assert.ok(highPosition.y>=1.4,'shortened camera still clears the ground');
});
test('tight-space overhead geometry shortens the view instead of passing through its roof',()=>{
  const {world,clearance,focus}=fixture();box(world,0,3,6,6,3,4);
  const position=new THREE.Vector3(0,4,10);
  clearance.resolve(focus,position);
  assert.ok(position.y<2.68);assert.ok(position.z<7);
  assert.ok(position.y>=1.4);
});
test('instanced solid structures obstruct the camera but forest occluders do not',()=>{
  const {world,clearance,focus}=fixture();
  const structures=new THREE.InstancedMesh(new THREE.BoxGeometry(4,20,1),new THREE.MeshBasicMaterial(),1);
  structures.setMatrixAt(0,new THREE.Matrix4().makeTranslation(0,10,4));world.group.add(structures);
  const position=new THREE.Vector3(0,4,12);clearance.resolve(focus,position);
  assert.ok(position.z<3.18);
  world.occluders={sets:[{mesh:structures}]};clearance.reset();position.set(0,4,12);
  clearance.resolve(focus,position);assert.equal(position.z,12);
});
test('solid index is cached, refreshes on a new course, and ignores hidden or removed props',()=>{
  const {world,clearance,focus}=fixture();let traversals=0;
  const traverse=world.group.traverse.bind(world.group);world.group.traverse=fn=>{traversals++;traverse(fn);};
  const wall=box(world,0,0,4,4,20,1),position=new THREE.Vector3();
  for(let i=0;i<180;i++){position.set(0,4,12);clearance.resolve(focus,position);assert.ok(position.z<3.18);}
  assert.equal(traversals,1,'no full scene traversal in following frames');
  wall.visible=false;position.set(0,4,12);clearance.resolve(focus,position);assert.equal(position.z,12);
  wall.visible=true;wall.removeFromParent();position.set(0,4,12);clearance.resolve(focus,position);assert.equal(position.z,12);
  world.group=new THREE.Group();box(world,0,0,6,4,20,1);
  position.set(0,4,12);clearance.resolve(focus,position);assert.ok(position.z>4&&position.z<5.18);
});
test('moving obstacles use their current location without rebuilding static scenery',()=>{
  const {world,clearance,focus}=fixture();
  const wall=box(world,10,0,4,4,20,1);world.obstacleMeshes.push(wall);
  const position=new THREE.Vector3(0,4,12);clearance.resolve(focus,position);assert.equal(position.z,12);
  wall.position.x=0;position.set(0,4,12);clearance.resolve(focus,position);assert.ok(position.z<3.18);
});
test('open-space conservative bounds and missing terrain cannot collapse or poison the camera',()=>{
  const {world,clearance,focus}=fixture('golf',()=>NaN);
  box(world,0,-1,0,8,10,8);
  const position=new THREE.Vector3(0,4,12);clearance.resolve(focus,position);
  assert.deepEqual(position.toArray(),[0,4,12]);
  assert.deepEqual(focus.toArray(),[0,.05,0],'the subject is never mutated');
});

test('golf uses the rendered heightfield without repeated physics surface queries',()=>{
  const {world,clearance,focus}=fixture('golf',()=>{throw Error('expensive surface query');});
  let samples=0;world.surfaceHeight=()=>{samples++;return 2;};
  focus.y=2.05;const position=new THREE.Vector3(0,2.2,12);
  clearance.resolve(focus,position);
  assert.ok(position.y>=3.4);assert.equal(samples,13);
});
