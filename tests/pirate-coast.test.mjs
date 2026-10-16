import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {getGolfHole,coastBounds,coastBandPoint,coastWaterLevel,terrainAt,terrainHeight} from '../dist/src/golf-courses.js';
import {pirateShipFor,hitsPirateShip} from '../dist/src/course-features.js';
import {buildPirateShip,PirateEffects} from '../dist/src/pirate-effects.js';
import {waterContact} from '../dist/src/water-effects.js';
import {scenicLayout} from '../dist/src/scenic-layout.js';
import {batchScenery} from '../dist/src/landscape.js';

function world(settings={}) {
  const scene=new THREE.Scene(),group=new THREE.Group();scene.add(group);
  return {scene,group,settings,mode:'play',zoom:13,clock:0,hole:getGolfHole(1,0),
    camera:new THREE.PerspectiveCamera(),mat:(color,extra)=>new THREE.MeshStandardMaterial({color,...extra}),
    obstacleMeshes:[],animations:[],renderer:{shadowMap:{}}};
}
function shipWorld(settings={}) {
  const w=world(settings),geo=new THREE.BoxGeometry(1,1,1);
  buildPirateShip(w,w.hole,geo,w.mat('#ffffff'));
  return w;
}
test('Saltwind opening has a lower sea and a steep continuous slope matching all cliff bands',()=>{
  const h=getGolfHole(1,0),z=-h.length*.42,right=coastBounds(h,z)[1],top=terrainHeight(h,right,z);
  assert.equal(coastWaterLevel(h),-18.6);assert.ok(top-coastWaterLevel(h)<24);
  const heights=[];
  for(let d=0;d<=24;d+=.25)heights.push(terrainAt(h,right+d,z).height);
  for(let i=1;i<heights.length;i++){
    assert.ok(heights[i]<=heights[i-1]+1e-7);assert.ok(heights[i-1]-heights[i]<.65);
  }
  for(const band of [1,2]){
    const [x,y,zz]=coastBandPoint(h,[right,top,z],band);
    assert.ok(Math.abs(terrainAt(h,x,zz).height-y)<1e-8);
  }
  const wet=terrainAt(h,right+25,z);assert.equal(wet.hazard,'water');assert.equal(wet.height,coastWaterLevel(h));
  assert.equal(waterContact(h,{x:right+25,y:0,z}).y,coastWaterLevel(h));
  for(const index of [1,2]){
    const other=getGolfHole(1,index);assert.equal(coastWaterLevel(other),-42.6);
    assert.equal(terrainAt(other,coastBounds(other,-50)[1]+1,-50).height,-43);
  }
  const seaProps=scenicLayout(h).filter(p=>p.name.startsWith('sailboat'));
  assert.ok(seaProps.length);assert.ok(seaProps.every(p=>p.y===coastWaterLevel(h)));
});
test('pirate placement varies only within the safe cove, stays stable per seed and scales rotated hitboxes',()=>{
  const h=getGolfHole(1,0),positions=new Set();
  assert.deepEqual(pirateShipFor(h),pirateShipFor(getGolfHole(1,0)));
  for(let seed=0;seed<80;seed++){
    const hole={...h,pirateSeed:seed*19891},s=pirateShipFor(hole);positions.add(`${s.x},${s.z}`);
    assert.deepEqual(s,pirateShipFor(hole));assert.equal(s.scale,1.65);
    assert.ok(Math.abs(s.z+h.length*.42)<=11);assert.ok(s.x-coastBounds(hole,s.z)[1]>=48);
    const point=(x,y,z)=>({x:s.x+(x*Math.cos(s.angle)+z*Math.sin(s.angle))*s.scale,
      y:s.y+y*s.scale,z:s.z+(-x*Math.sin(s.angle)+z*Math.cos(s.angle))*s.scale});
    for(const x of [-5,5])for(const z of [-14,14]){
      const p=point(x,0,z);assert.equal(terrainAt(h,p.x,p.z).hazard,'water');
    }
    assert.ok(hitsPirateShip(s,point(-12,11,.3),point(12,11,.3)));
    assert.ok(!hitsPirateShip(s,point(-12,26,.3),point(12,26,.3)));
  }
  assert.equal(positions.size,80);
  assert.deepEqual(pirateShipFor({...getGolfHole(1,1),pirateSeed:88}),pirateShipFor(getGolfHole(1,1)));
});
test('cartoon ship stays outside static scenery batches and a hit bursts, lists and sinks once',()=>{
  const w=shipWorld(),ship=w.pirateShipMesh,fx=new PirateEffects(w),objects=w.scene.children.length;
  batchScenery(w);assert.equal(w.pirateShipMesh,ship);assert.equal(w.pirateShipGlints[0].parent,ship);
  assert.ok(w.pirateShipGlints.length);fx.update(.1);assert.ok(w.pirateShipGlints[0].visible);
  assert.equal(fx.hit(),true);assert.equal(fx.hit(),false);assert.ok(w.pirateMoment);assert.equal(w.zoom,55);
  fx.update(.2);assert.ok(fx.meshes.fire.count>0);assert.equal(fx.meshes.smoke.count,0);assert.ok(fx.meshes.wood.count>0);
  assert.ok(fx.core.visible);assert.ok(fx.blastRing.visible);
  fx.update(.5);assert.ok(fx.meshes.smoke.count>0);
  assert.ok(w.pirateShipGlints.every(g=>!g.visible));
  const age=fx.moment.age;w.presentationPaused=true;fx.update(.8);assert.equal(fx.moment.age,age);w.presentationPaused=false;
  for(let i=0;i<160;i++)fx.update(1/30);
  assert.ok(ship.rotation.z>.5);assert.equal(ship.visible,false);assert.equal(w.pirateMoment,null);assert.equal(w.cameraHold,null);assert.equal(w.zoom,13);
  for(let i=0;i<50;i++)fx.update(1/30);
  assert.equal(fx.root.visible,false);assert.equal(w.scene.children.length,objects);
});
test('TNT starts with a broad bright fireball before its smoke plume, within fixed pools',()=>{
  const w=shipWorld(),fx=new PirateEffects(w);fx.hit();
  for(let i=0;i<30;i++)fx.update(1/120);
  assert.equal(fx.meshes.fire.count,24);assert.equal(fx.meshes.smoke.count,0);
  const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3();
  let left=Infinity,right=-Infinity;
  for(let i=0;i<fx.meshes.fire.count;i++){
    fx.meshes.fire.getMatrixAt(i,matrix);matrix.decompose(position,rotation,scale);
    left=Math.min(left,position.x-scale.x);right=Math.max(right,position.x+scale.x);
  }
  assert.ok(right-left>18);assert.equal(fx.meshes.fire.material.toneMapped,false);
  for(let i=0;i<60;i++)fx.update(1/120);
  assert.ok(fx.meshes.fire.count>0);assert.ok(fx.meshes.smoke.count>0);
  for(let i=0;i<120;i++)fx.update(1/120);
  assert.equal(fx.meshes.fire.count,0);assert.ok(fx.meshes.smoke.count>0);
  assert.equal(fx.meshes.fire.instanceMatrix.count,24);assert.equal(fx.meshes.smoke.instanceMatrix.count,24);
});
test('pirate explosion respects effects settings and resets its pooled state between holes',()=>{
  for(const settings of [{particles:false},{reducedMotion:true},{graphics:'low'}]){
    const w=shipWorld(settings),fx=new PirateEffects(w);fx.hit();fx.update(.15);
    assert.ok(fx.particles.length<=72);
    if(settings.particles===false)assert.equal(fx.particles.length,0);
    if(settings.reducedMotion)assert.ok(fx.particles.length<=22);
    if(settings.graphics==='low')assert.ok(fx.particles.length<45);
    assert.ok(fx.wave.visible);w.mode='menu';fx.update(.01);
    assert.equal(fx.root.visible,false);assert.equal(w.pirateMoment,null);assert.equal(w.zoom,13);
    assert.ok(Object.values(fx.meshes).every(m=>m.count===0));
  }
});
