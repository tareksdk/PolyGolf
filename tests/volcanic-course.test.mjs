import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import { GOLF_COURSES,getGolfHole,golfHoleCount,terrainAt,terrainHeight,courseRecordKey } from '../dist/src/golf-courses.js';
import { volcanicLayout,lavaSample } from '../dist/src/volcanic-layouts.js';
import { buildVolcanicScenery } from '../dist/src/volcanic-render.js';
import { WaterEffects,waterContact } from '../dist/src/water-effects.js';
import { World } from '../dist/src/world.js';
import { GolfPhysics } from '../dist/src/golf-physics.js';
import { rotationSlots,courseRotationKey,featuredCourses,courseAvailable } from '../dist/src/rotating-courses.js';
import { courseMenu } from '../dist/src/course-menu.js';
import { defaultSave,ProgressionManager } from '../dist/src/save.js';
import { GolfCloud } from '../dist/src/cloud.js';

test('Cinder Crown adds a distinct three-hole par-12 course with safe tees and cups',()=>{
  assert.equal(GOLF_COURSES[18].id,'cinder-crown');assert.equal(golfHoleCount(18),3);
  const holes=[0,1,2].map(i=>getGolfHole(18,i));
  assert.deepEqual(holes.map(h=>h.par),[4,3,5]);
  assert.deepEqual(holes.map(h=>h.length),[332,168,496]);
  for(const h of holes){
    assert.equal(h.trees.length,0);assert.ok(h.volcanoes.length>=2);
    for(const p of [h.start,h.cup]){assert.equal(terrainAt(h,p.x,p.z).hazard,null);assert.ok(Number.isFinite(p.y));}
    for(const channel of h.lavaChannels)for(const [x,z] of channel){
      assert.equal(terrainAt(h,x,z).hazardKind,'lava');assert.equal(terrainAt(h,x,z).height,h.lavaLevel);
      assert.ok(terrainHeight(h,x,z)<h.lavaLevel);assert.ok(lavaSample(h,x,z).edge<0);
    }
  }
  const a=volcanicLayout(0);a.points[0][0]=999;assert.equal(volcanicLayout(0).points[0][0],0);
  for(const i of [-1,3,.5,NaN])assert.throws(()=>volcanicLayout(i));
});

test('real tee shots clear the hazards, while an underhit shot receives a lava penalty',()=>{
  for(const [index,power] of [[0,.85],[1,.75],[2,.95]]){
    const h=getGolfHole(18,index,false),results=[];
    for(let run=0;run<2;run++){
      const p=new GolfPhysics();p.load(h);p.shoot(h.cup.x,h.cup.z,power,{club:'driver',spin:0});
      for(let tick=0;tick<7200&&p.active;tick++)p.update(1/120);
      assert.equal(p.active,false);assert.equal(p.events.includes('water'),false);assert.ok(p.ball.z<-130);
      results.push({...p.ball});
    }
    assert.deepEqual(results[0],results[1]);
  }
  const h=getGolfHole(18,0,false),p=new GolfPhysics();p.load(h);p.shoot(h.cup.x,h.cup.z,.65,{club:'driver',spin:0});
  for(let tick=0;tick<7200&&p.active;tick++)p.update(1/120);
  assert.ok(p.events.includes('water'));assert.equal(waterContact(h,p.ball).kind,'lava');
  p.reset();assert.equal(terrainAt(h,p.ball.x,p.ball.z).hazard,null);
});

test('Planetfall daily and Cinder Crown weekly have independent reset windows and records',()=>{
  const wed=Date.parse('2026-10-21T12:00:00Z'),thu=wed+86400000,mon=Date.parse('2026-10-26T00:00:00Z');
  assert.equal(rotationSlots(wed).daily,13);assert.equal(rotationSlots(thu).daily,13);
  assert.notEqual(rotationSlots(mon).daily,13);
  assert.equal(courseRotationKey(13,wed),courseRotationKey(13,thu));
  assert.notEqual(courseRotationKey(19,wed),courseRotationKey(19,thu));
  assert.equal(courseRotationKey(18,wed),courseRotationKey(18,thu));
  assert.notEqual(courseRotationKey(18,wed),courseRotationKey(18,mon));
  assert.notEqual(courseRecordKey('golf',13,'day-9'),courseRecordKey('golf',13,courseRotationKey(13,wed)));
  assert.equal(featuredCourses(wed).filter(f=>f.label==='Hole of the day').length,1);
  assert.equal(featuredCourses(wed).find(f=>f.label==='Hole of the day').index,19);
  assert.ok(courseAvailable(18,wed));assert.ok(courseAvailable(19,wed));assert.equal(courseAvailable(20,wed),false);
});

test('the library shelves are ordered and each available course appears once',()=>{
  const progress=new ProgressionManager({load:defaultSave,save:()=>true}),ui={mode:'golf',screen:'courses',progress,world:{thumbnail:()=>''}};
  const html=courseMenu(ui),ids=[...html.matchAll(/data-course-card="(\d+)"/g)].map(m=>Number(m[1]));
  assert.deepEqual(ids.slice(0,7),[19,14,15,16,0,1,2]);assert.equal(new Set(ids).size,ids.length);
  assert.ok(html.indexOf('full-courses-heading')<html.indexOf('blitz-courses-heading'));
  assert.ok(html.indexOf('blitz-courses-heading')<html.indexOf('other-courses-heading'));
  assert.match(html,/Maps of the Week/);assert.match(html,/community-map-link/);
  assert.ok(html.indexOf('data-action="community"')<html.indexOf('full-courses-heading'));
});

function renderFixture(quality='low'){
  const w=Object.create(World.prototype);
  Object.assign(w,{scene:new THREE.Scene(),group:new THREE.Group(),settings:{graphics:quality},materials:new Map(),
    geometries:{sphere:new THREE.IcosahedronGeometry(1,1),cylinder:new THREE.CylinderGeometry(1,1,1,12),box:new THREE.BoxGeometry(1,1,1),cone:new THREE.ConeGeometry(1,1,7)},mode:'play'});
  w.scene.add(w.group);return w;
}

test('volcanic animation has bounded reusable meshes and respects reduced motion and disabled particles',()=>{
  for(const quality of ['low','medium']){
    const w=renderFixture(quality),h=getGolfHole(18,2,false);buildVolcanicScenery(w,h);
    const v=w.volcanic,geometries=new Set(),objects=[];w.group.traverse(o=>{objects.push(o);if(o.geometry)geometries.add(o.geometry);});
    for(let t=0;t<100;t++)v.update(t*.1);
    const after=[];w.group.traverse(o=>after.push(o));assert.deepEqual(after,objects);
    for(const mesh of after.filter(o=>o.isInstancedMesh))assert.ok(mesh.count<=mesh.instanceMatrix.count);
    assert.ok(v.smoke.count<=52);assert.ok(v.bombs.count<=36);assert.ok(v.sparks.count<=24);
    w.settings.reducedMotion=true;v.update(1);const matrix=Array.from(v.smoke.instanceMatrix.array);v.update(20);assert.deepEqual(Array.from(v.smoke.instanceMatrix.array),matrix);
    w.settings.particles=false;v.update(20);assert.equal(v.bombs.count,0);assert.equal(v.sparks.count,0);
    let disposed=0;v.lava.material.addEventListener('dispose',()=>disposed++);w.clear();assert.equal(disposed,1);assert.equal(w.volcanic,null);
  }
});

test('lava impact uses a hot crown and droplets and resets correctly for ordinary water',()=>{
  const w=renderFixture(),fx=new WaterEffects(w);
  fx.splash({x:0,y:0,z:0,vy:-10,kind:'lava'});assert.equal(fx.crown.material.color.getHexString(),'8c301c');assert.ok(fx.spray.count>0);
  assert.equal(fx.crown.material.toneMapped,false);const lavaVersion=fx.crown.material.version;
  fx.update(.3);assert.ok(fx.crown.visible);fx.update(3);assert.equal(fx.root.visible,false);assert.equal(w.waterMoment,null);
  fx.splash({x:0,y:0,z:0,vy:-10,kind:'water'});assert.equal(fx.crown.material.color.getHexString(),'bceef1');
  assert.equal(fx.crown.material.toneMapped,true);assert.ok(fx.crown.material.version>lavaVersion);
});

test('local community browsing is a fixed read-only request and cannot smuggle a write action',async()=>{
  const oldLocation=globalThis.location,oldFetch=globalThis.fetch;globalThis.location={hostname:'127.0.0.1'};
  const requests=[];globalThis.fetch=async(url,opts)=>{requests.push({url,opts});return {ok:true,json:async()=>({maps:[{id:'public-map'}],state:{coins:9999}})};};
  try{
    const c=new GolfCloud({progress:{repository:{}}});
    const result=await c.call('community_maps',{mode:'golf',offset:24,action:'publish_map',token:'not-sent'});
    assert.deepEqual(result,{maps:[{id:'public-map'}]});assert.equal(requests[0].url,'/__preview/community?mode=golf&offset=24');assert.equal(requests[0].opts.body,undefined);assert.equal(requests[0].opts.headers,undefined);
    await assert.rejects(c.call('publish_map'),/local preview/);await assert.rejects(c.call('like_map'),/local preview/);assert.equal(requests.length,1);assert.equal(c.session,null);
  }finally{globalThis.location=oldLocation;globalThis.fetch=oldFetch;}
});
