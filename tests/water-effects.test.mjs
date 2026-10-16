import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import { WaterEffects, waterContact } from '../dist/src/water-effects.js';
import { getGolfHole, terrainAt } from '../dist/src/golf-courses.js';
import { GameManager } from '../dist/src/game.js';

function fixture(settings={}) {
  return {scene:new THREE.Scene(),mode:'play',settings};
}
test('impact produces rising water, airborne spray and spreading ripples, then releases the camera',()=>{
  const world=fixture(),fx=new WaterEffects(world),contact={x:12,y:3,z:-25,vx:8,vy:-10,vz:-5};
  fx.splash(contact);assert.deepEqual(world.cameraHold,{x:12,y:3,z:-25});
  fx.update(.16);assert.ok(fx.crown.visible);assert.ok(fx.crown.scale.y>.5);assert.ok(fx.spray.count>20);
  const firstRadius=fx.rings[0].scale.x;
  fx.update(.2);assert.ok(fx.rings[0].scale.x>firstRadius);assert.ok(fx.rings[1].visible);
  world.presentationPaused=true;const age=fx.moment.age;fx.update(.5);assert.equal(fx.moment.age,age);
  world.presentationPaused=false;
  for(let i=0;i<60;i++)fx.update(1/30);
  assert.equal(world.cameraHold,null);assert.equal(world.waterMoment,null);
  for(let i=0;i<30;i++)fx.update(1/30);
  assert.equal(fx.root.visible,false);assert.equal(fx.spray.count,0);
});
test('splash pools stay bounded, honor reduced effects and clear on leaving a hole',()=>{
  for(const settings of [{graphics:'low'},{particles:false},{reducedMotion:true}]){
    const world=fixture(settings),fx=new WaterEffects(world),objects=world.scene.children.length;
    for(let i=0;i<50;i++)fx.splash({x:i,y:0,z:-i,vx:100,vy:-100,vz:0});
    assert.equal(world.scene.children.length,objects);assert.ok(fx.drops.length<=64);
    if(settings.particles===false)assert.equal(fx.spray.count,0);
    fx.update(.2);assert.ok(fx.rings[0].visible);
    world.mode='menu';fx.update(.01);assert.equal(fx.root.visible,false);assert.equal(world.cameraHold,null);
  }
});
test('water penalties animate the impact before reset, award one penalty, and do not splash dry out-of-bounds',()=>{
  globalThis.window={addEventListener(){}};globalThis.document={addEventListener(){}};
  let contact;const world={canvas:{addEventListener(){}},equipment:{},settings:{},load(){},setAim(){},update(){},waterSplash:c=>contact=c};
  const game=new GameManager(world);game.start(0,true,{mode:'golf'});
  const pond=game.hole.water[0],surface=terrainAt(game.hole,pond.x,pond.z);
  game.physics.ball={x:pond.x,y:surface.height+.02,z:pond.z,vx:1,vy:-3,vz:0};
  game.physics.active=game.physics.airborne=true;game.physics.shotTime=0;game.strokes=1;
  game.update(1/60);
  assert.ok(contact);assert.ok(Math.hypot(contact.x-pond.x,contact.z-pond.z)<.2);
  assert.equal(contact.y,surface.height);assert.equal(game.strokes,2);assert.equal(game.round.penalties,1);
  assert.equal(game.physics.ball.x,game.hole.start.x);assert.equal(game.physics.ball.z,game.hole.start.z);
  assert.equal(waterContact(getGolfHole(0,0),{x:350,y:0,z:0}),null);
  world.waterMoment={};game.beginPower();assert.equal(game.charging,false);
});
