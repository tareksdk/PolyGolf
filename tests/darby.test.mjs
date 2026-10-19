import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {getGolfHole,terrainAt,pathDistance,fairwayWidth} from '../dist/src/golf-courses.js';
import {darbyFor,hitsDarby,DARBY_EDGE} from '../dist/src/course-features.js';
import {GolfPhysics} from '../dist/src/golf-physics.js';
import {verifyHole} from '../dist/src/replay.js';
import {defaultSave,ProgressionManager,ACHIEVEMENTS} from '../dist/src/save.js';
import {ITEM_BY_ID} from '../dist/src/catalog.js';
import {badgeFor} from '../dist/src/nameplate-badges.js';

test('Darby rests only on the first Willow Park hole, in the rough between fairway and cart path, facing the play',()=>{
  const h=getGolfHole(0,0),d=darbyFor(h);assert.ok(d);
  assert.deepEqual(darbyFor(getGolfHole(14,0)),d);
  for(const [c,i] of [[0,1],[0,2],[1,0],[2,0]])assert.equal(darbyFor(getGolfHole(c,i)),null);
  assert.equal(darbyFor({...h,custom:true}),null);
  // In the rough: paws stop short of the fairway and the tail short of the cart path (edge + 5.1 m).
  const edge=pathDistance(h,d.x,d.z)-fairwayWidth(h,-d.z/h.length)/2;
  assert.ok(Math.abs(edge-DARBY_EDGE)<.1,'rough strip '+edge);
  assert.ok(h.trees.every(t=>t===d.tree||Math.hypot(t.x-d.x,t.z-d.z)>=2.6),'no trunk through the dog');
  // Every point under the model is dry, gently sloped turf.
  const s=Math.sin(d.angle),c=Math.cos(d.angle);
  for(const [lx,lz] of [[0,1.1],[0,-1],[.45,0],[-.45,0],[.35,-1.4]]){
    const x=d.x+lx*c+lz*s,z=d.z-lx*s+lz*c,t=terrainAt(h,x,z);
    assert.equal(t.hazard,null);assert.ok(Math.abs(t.height-d.y)<.2);
  }
  // Front of the model points at the fairway.
  assert.ok(pathDistance(h,d.x+s*3,d.z+c*3)<pathDistance(h,d.x,d.z));
});

test('Darby hit detection is swept, rotated with the dog and fires once per hole',()=>{
  const d=darbyFor(getGolfHole(0,0)),s=Math.sin(d.angle),c=Math.cos(d.angle);
  const at=(lx,ly,lz)=>({x:d.x+lx*c+lz*s,y:d.y+ly,z:d.z-lx*s+lz*c});
  assert.equal(hitsDarby(d,at(-3,.5,0),at(3,.5,0)),true,'fast ball crossing the body');
  assert.equal(hitsDarby(d,at(-3,2,0),at(3,2,0)),false,'flying over');
  assert.equal(hitsDarby(d,at(0,.3,4),at(0,.3,1)),true,'rolling up to the paws');
  assert.equal(hitsDarby(null,at(0,0,0),at(1,0,0)),false);
  const physics=new GolfPhysics();physics.load(getGolfHole(0,0));
  physics.ball={...physics.ball,...at(-.3,.4,0),vx:2,vy:0,vz:0};physics.active=true;physics.airborne=true;
  for(let i=0;i<20;i++)physics.update(1/120);
  assert.equal(physics.darbyHit,true);assert.equal(physics.events.filter(e=>e==='darby').length,1);
});

test('a real tee shot reaches Darby under replay verification; a short one does not',()=>{
  const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/darby-shot.json',import.meta.url)));
  const round={mode:'golf',course:0,equipment:defaultSave().equipment};
  const result=verifyHole(round,0,fixture.commands,fixture.endTick,{featureOnly:'darby'});
  assert.equal(result.darbyHit,true);assert.equal(result.strokes,1);assert.equal(result.pirateHit,false);
  assert.throws(()=>verifyHole(round,0,[{...fixture.commands[0],power:.3}],fixture.endTick,{featureOnly:'darby'}),/did not reach Darby/);
});

test('finding Darby is a one-time achievement that unlocks the tennis ball and paw nameplate',()=>{
  const p=new ProgressionManager({load:()=>defaultSave(),save:()=>true});
  assert.equal(p.discoverDarby(),true);assert.equal(p.discoverDarby(),false);
  for(const id of ['ball-darby','nameplate-darby'])assert.equal(p.data.owned.filter(i=>i===id).length,1);
  assert.ok(p.data.achievements.includes('darby'));
  const a=ACHIEVEMENTS.find(a=>a.id==='darby');assert.deepEqual(a.items,['ball-darby','nameplate-darby']);
  assert.equal(ITEM_BY_ID['ball-darby'].motif,'tennis');assert.equal(ITEM_BY_ID['ball-darby'].source,'achievement');
  assert.equal(badgeFor(ITEM_BY_ID['nameplate-darby']),'paw');
});

test('Darby ships as a small three-part Blender export with valid palette indices',()=>{
  const data=JSON.parse(fs.readFileSync(new URL('../dist/assets/darby.json',import.meta.url)));
  assert.deepEqual(Object.keys(data.assets).sort(),['darby-body','darby-head','darby-tail']);
  let total=0;
  for(const a of Object.values(data.assets)){
    assert.equal(a.p.length,a.c.length*9);assert.equal(a.triangles,a.c.length);assert.equal(a.pivot.length,3);
    assert.ok(a.c.every(i=>Number.isInteger(i)&&i>=0&&i<data.palette.length));assert.ok(a.p.every(Number.isFinite));
    total+=a.triangles;
  }
  assert.ok(total<2500,'stays light for low-power devices: '+total);
  // Nothing sinks below the grass or floats: the lowest paw vertex touches the ground.
  const body=data.assets['darby-body'],ys=body.p.filter((_,i)=>i%3===1);
  assert.ok(Math.min(...ys)>=-.01&&Math.min(...ys)<.03);
});
