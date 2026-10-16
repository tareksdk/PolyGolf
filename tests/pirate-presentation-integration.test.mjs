import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import { getGolfHole, coastWaterLevel } from '../dist/src/golf-courses.js';
import { installGolfPresentation } from '../dist/src/golf-presentation.js';
import { installPirateEffects, buildPirateShip } from '../dist/src/pirate-effects.js';
import { WaterEffects } from '../dist/src/water-effects.js';

function fixture() {
  let water;
  const frames=[],materials=new Map();
  const w={
    scene:new THREE.Scene(),group:new THREE.Group(),camera:new THREE.PerspectiveCamera(),
    hole:getGolfHole(1,0),mode:'play',clock:0,zoom:13,settings:{particles:false},equipment:{},
    geometries:{box:new THREE.BoxGeometry(),cylinder:new THREE.CylinderGeometry(),round:new THREE.SphereGeometry(),sphere:new THREE.IcosahedronGeometry()},
    ballMesh:new THREE.Mesh(),club:new THREE.Group(),aim:new THREE.Group(),arrow:new THREE.Group(),
    mat(color,extra={}) {
      const key=color+JSON.stringify(extra);
      if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,...extra}));
      return materials.get(key);
    },
    mesh(geometry,color,x,y,z,sx,sy,sz,parent,extra) {
      const mesh=new THREE.Mesh(typeof geometry==='string'?this.geometries[geometry]:geometry,this.mat(color,extra));
      mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);parent.add(mesh);return mesh;
    },
    load(hole) {
      water?.reset();this.hole=hole;this.group.clear();
      buildPirateShip(this,hole,this.geometries.box,this.mat('#ffffff'));
    },
    setAim(){},
    update(dt) {
      // World.update consumes cameraHold before its atmosphere updates water.
      frames.push({hold:this.cameraHold,pirate:!!this.pirateMoment,water:!!this.waterMoment,golfer:this.golfer.visible});
      this.clock+=dt;water.update(dt);
    },
  };
  w.scene.add(w.group);
  installGolfPresentation(w);
  water=new WaterEffects(w);
  installPirateEffects(w);
  w.load(w.hole);
  return {w,water,frames};
}

test('pirate focus survives the real golfer camera override and overlapping water reset',()=>{
  const {w,water,frames}=fixture(),ball={x:0,y:.04,z:0,vx:0,vy:0,vz:0},physics={active:false,sunk:false};
  w.activeClub='driver';w.beginSwing(ball,{x:0,z:-1},'driver');
  assert.ok(w.pirateHit());const focus=w.pirateEffects.focus;
  water.splash({x:focus.x+8,y:coastWaterLevel(w.hole),z:focus.z,vx:0,vy:-8,vz:0});
  for(let i=0;i<200;i++)w.update(1/60,ball,physics);
  assert.equal(w.waterMoment,null,'the shorter splash finishes during the ship cinematic');
  assert.ok(w.pirateMoment);
  assert.ok(frames.every(frame=>frame.hold===focus),'ship focus must win after both swing and splash camera writes');
  assert.ok(frames.every(frame=>frame.golfer===false));
  for(let i=0;i<220;i++)w.update(1/60,ball,physics);
  assert.equal(w.pirateMoment,null);assert.equal(w.pirateEffects.moment,null);
  assert.equal(w.cameraHold,null);assert.equal(w.zoom,13);
  assert.ok(frames.at(-1).golfer,'normal tee presentation resumes after the cinematic');
  water.splash({x:10,y:coastWaterLevel(w.hole),z:-80,vx:0,vy:-2,vz:0});
  w.update(1/60,ball,physics);
  assert.equal(frames.at(-1).hold,w.waterMoment,'a later ordinary water splash still controls the camera');
});

test('pause freezes both presentations and changing holes clears cinematic camera state',()=>{
  const {w,water}=fixture(),ball={x:0,y:.04,z:0,vx:0,vy:0,vz:0},physics={active:true,sunk:false};
  w.pirateHit();const focus=w.pirateEffects.focus;
  water.splash({x:focus.x,y:coastWaterLevel(w.hole),z:focus.z,vx:1,vy:-2,vz:0});
  w.presentationPaused=true;w.update(.5,ball,physics);
  assert.equal(w.pirateEffects.moment.age,0);assert.equal(water.moment.age,0);assert.equal(w.cameraHold,focus);
  w.presentationPaused=false;w.update(.5,ball,physics);
  assert.equal(w.pirateEffects.moment.age,.5);assert.equal(water.moment.age,.5);
  w.load(getGolfHole(1,1));
  assert.equal(w.pirateMoment,null);assert.equal(w.waterMoment,null);assert.equal(w.cameraHold,null);
  assert.equal(w.zoom,13);assert.equal(w.pirateEffects.root.visible,false);assert.equal(water.root.visible,false);
});
