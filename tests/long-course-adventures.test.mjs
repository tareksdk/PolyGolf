import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from '../dist/vendor/three.module.js';
import {getGolfHole,golfHoleCount,courseRecordKey,terrainAt,RULES_VERSION} from '../dist/src/golf-courses.js';
import {courseAvailable,courseRotationKey,featuredCourses} from '../dist/src/rotating-courses.js';
import {GolfPhysics} from '../dist/src/golf-physics.js';
import {encounterBoxes,stepEncounter} from '../dist/src/course-encounters.js';
import {buildLongCourseScenery} from '../dist/src/course-adventure-render.js';
import {hudStylePicker,obstructs} from '../dist/src/smart-hud.js';
import {defaultSave,LocalSaveRepository,ProgressionManager} from '../dist/src/save.js';

test('old course layouts, best keys and replay version remain unchanged',()=>{
 const baseline=JSON.parse(fs.readFileSync(new URL('fixtures/classic-course-shapes-v11.json',import.meta.url)));
 assert.equal(RULES_VERSION,'polygolf-v11');
 for(const [course,data] of Object.entries(baseline)){
  assert.equal(courseRecordKey('golf',Number(course),'fixed'),data.key);
  data.holes.forEach((hash,i)=>{const h=getGolfHole(Number(course),i,false);const shape=JSON.stringify({points:h.points,par:h.par,wind:h.wind,seed:h.seed,start:h.start,cup:h.cup,water:h.water,bunkers:h.bunkers,elevation:h.elevation});assert.equal(createHash('sha256').update(shape).digest('hex'),hash);});
 }
});
test('two new permanent nine-hole collections contain varied par 3–5 routes and safe endpoints',()=>{
 for(const course of [15,16]){
  assert.equal(golfHoleCount(course),9);let par=0;const lengths=[];
  for(let i=0;i<9;i++){
   const h=getGolfHole(course,i);par+=h.par;lengths.push(h.length);
   assert.ok([3,4,5].includes(h.par));assert.equal(h.layoutCourse,course===15?1:2);
   for(const p of [h.start,h.cup]){const t=terrainAt(h,p.x,p.z);assert.equal(t.hazard,null);assert.ok(Number.isFinite(t.height));}
   if(i>=3){assert.ok(h.elevation.length>=3);assert.ok(h.vignette);assert.ok(h.trees.length>50);}
  }
  assert.equal(par,36);assert.ok(Math.min(...lengths)<190);assert.ok(Math.max(...lengths)>550);
  for(const date of ['2026-10-18','2026-12-01']){assert.ok(courseAvailable(course,Date.parse(date)));assert.equal(courseRotationKey(course,Date.parse(date)),'');assert.ok(featuredCourses(Date.parse(date)).some(f=>f.index===course));}
 }
});
test('completing a long course writes a separate record without replacing short-course or Willow bests',()=>{
 const save=defaultSave();for(const course of [0,1,2,14])save.bests[courseRecordKey('golf',course)]={score:-9,time:123,strokes:27};
 const old=JSON.stringify(save.bests),p=new ProgressionManager({load:()=>save,save:()=>true});
 for(const course of [15,16]){const pars=Array.from({length:9},(_,i)=>getGolfHole(course,i,false).par);p.completeCourse({mode:'golf',courseIndex:course,rotationKey:'',strokes:pars,time:1200},pars);assert.equal(save.bests[courseRecordKey('golf',course)].strokes,36);}
 const keys=JSON.parse(old);for(const key of Object.keys(keys))assert.deepEqual(save.bests[key],keys[key]);
});
test('mountain walls stop high shots while the actual low passage can be crossed',()=>{
 const h=getGolfHole(16,3,false),e=h.encounter,p=new GolfPhysics();p.load(h);
 const old={x:e.x,y:e.y+e.height+5,z:e.z+30},ball={...old,z:e.z-30,vx:0,vy:0,vz:-50};
 stepEncounter(p,old,ball);assert.ok(ball.vz>0);assert.equal(p.encounter.passed,false);assert.equal(encounterBoxes(e).length,3);
 p.load(h);const low={x:e.x,y:e.y+8,z:e.z+30},safe={...low,z:e.z-30,vx:0,vy:0,vz:-50};stepEncounter(p,low,safe);assert.equal(p.encounter.passed,true);assert.equal(safe.vz,-50);
});
test('TNT requires hitting the marked target, opens the physical route once and stays open across resets',()=>{
 const h=getGolfHole(15,4,false),e=h.encounter,p=new GolfPhysics();p.load(h);
 const old={x:e.x+e.width/2-3,y:e.y+8,z:e.z+30},b={...old,z:e.z-30,vx:0,vy:0,vz:-50};stepEncounter(p,old,b);assert.ok(b.vz>0);assert.equal(p.encounter.cleared,false);
 const low={x:e.x,y:e.y-.5,z:e.z+30},roller={...low,z:e.z-30,vx:0,vy:0,vz:-50};stepEncounter(p,low,roller);assert.ok(roller.vz>0);assert.equal(p.encounter.cleared,false);
 const a={x:e.x,y:e.y+7,z:e.z+30},hit={...a,z:e.z-30,vx:0,vy:0,vz:-50};stepEncounter(p,a,hit);assert.equal(p.encounter.cleared,true);assert.equal(hit.vz,-50);assert.equal(p.events.filter(x=>x==='dynamite').length,1);
 stepEncounter(p,a,{...hit});assert.equal(p.events.filter(x=>x==='dynamite').length,1);p.reset();assert.equal(p.encounter.cleared,true);p.load(h);assert.equal(p.encounter.cleared,false);
});
test('real tee shots can trigger each encounter deterministically with the normal golf physics',()=>{
 for(const f of [{c:15,i:4,p:.85},{c:15,i:5,p:.75},{c:16,i:3,p:.75},{c:16,i:5,p:.9}]){
  const h=getGolfHole(f.c,f.i,false),e=h.encounter,results=[];
  for(let replay=0;replay<2;replay++){
   const p=new GolfPhysics();p.load(h);p.shoot(e.x,e.z,f.p,{club:'driver',spin:-1});
   for(let i=0;i<1000&&p.active&&!p.encounter.cleared&&!p.encounter.passed;i++)p.update(1/120);
   assert.ok(p.encounter.cleared||p.encounter.passed);results.push({...p.ball});
  }
  assert.deepEqual(results[0],results[1]);
 }
});
test('adventure sparkle and explosion pools stay bounded and reuse geometry',()=>{
 const h=getGolfHole(15,4,false),scene=new THREE.Scene(),group=new THREE.Group();scene.add(group);
 const w={group,settings:{graphics:'low'},renderer:{shadowMap:{}},camera:new THREE.PerspectiveCamera(),mat:c=>new THREE.MeshStandardMaterial({color:c}),mesh(g,c,x,y,z,sx,sy,sz,parent){const geometry=g==='cone'?new THREE.ConeGeometry(1,1,8):g==='cylinder'?new THREE.CylinderGeometry(1,1,1,8):new THREE.BoxGeometry(1,1,1);const m=new THREE.Mesh(geometry,this.mat(c));m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;}};
 buildLongCourseScenery(w,h);const fx=w.courseAdventure,geometry=fx.burst.geometry;const physics={encounter:{cleared:true}};
 for(let i=0;i<500;i++){fx.update(1/120,physics);assert.ok(fx.burst.count<=24);assert.equal(fx.burst.geometry,geometry);}
 assert.equal(fx.gate.visible,false);assert.equal(fx.target.visible,false);assert.equal(fx.stars.visible,false);assert.equal(fx.burst.count,0);
 assert.equal(w.adventureMoment,null);assert.equal(w.zoom,13);
 w.settings={graphics:'low',reducedMotion:true,particles:false};buildLongCourseScenery(w,h);w.courseAdventure.update(.5,physics);
 assert.equal(w.courseAdventure.burst.count,0);assert.equal(w.courseAdventure.smoke.count,0);assert.ok(!w.courseAdventure.focus);
});
test('Clear View can be equipped, persists, and detects real screen obstruction',()=>{
 let raw;const repo=new LocalSaveRepository({getItem:()=>raw,setItem:(k,v)=>raw=v}),save=defaultSave();save.settings.hudStyle='smart';repo.save(save);assert.equal(repo.load().settings.hudStyle,'smart');
 assert.match(hudStylePicker(save.settings),/Clear View · equipped/);
 assert.equal(obstructs([{x:100,y:120,visible:true}],{left:80,right:180,top:100,bottom:140}),true);
 assert.equal(obstructs([{x:500,y:120,visible:true}],{left:80,right:180,top:100,bottom:140}),false);
 assert.equal(obstructs([{x:100,y:120,visible:false}],{left:80,right:180,top:100,bottom:140}),false);
});
