import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import { GOLF_COURSES, getGolfHole, terrainAt } from '../dist/src/golf-courses.js';
import { getHole } from '../dist/src/courses.js';
import { GolfPhysics } from '../dist/src/golf-physics.js';
import { mountainRangeData } from '../dist/src/mountain-ranges.js';
import { installCourseAtmosphere } from '../dist/src/course-weather.js';
import { weatherProfile } from '../dist/src/weather-config.js';
import {settingsDialog} from '../dist/src/dialogs.js';
import {defaultSave} from '../dist/src/save.js';
import { verifyHole } from '../dist/src/replay.js';

function worldFixture() {
  const w={scene:new THREE.Scene(),group:new THREE.Group(),camera:new THREE.PerspectiveCamera(),sun:new THREE.DirectionalLight(),hemi:new THREE.HemisphereLight(),renderer:{shadowMap:{},getPixelRatio:()=>1},hole:getGolfHole(0,0),settings:{graphics:'low'},mode:'play',clock:1};
  w.scene.add(w.group);w.load=h=>{w.scene.remove(w.group);w.group=new THREE.Group();w.scene.add(w.group);w.hole=h;};
  return w;
}
test('every course and next hole starts Normal after either optional atmosphere',()=>{
  const w=worldFixture(),ui={world:w,action(){},root:{querySelectorAll:()=>[]},game:{state:'playing'}};
  installCourseAtmosphere(ui);
  for(const h of [...GOLF_COURSES.map((_,c)=>getGolfHole(c,0)),getGolfHole(14,8),...Array.from({length:5},(_,c)=>getHole(c,0))]){
    w.load(h);
    if(h.space){assert.equal(w.weather,'space');assert.equal(w.sky,null);assert.equal(w.setWeather('rainy'),false);assert.equal(w.atmosphere.rainRoot.visible,false);continue;}
    assert.equal(w.weather,'normal');
    const normalNight=Number(['halloween','space','cyberpunk'].includes(h.course?.eventTheme));
    assert.equal(w.sky.uniforms.night.value,normalNight);
    assert.equal(w.sky.uniforms.rain.value,0);
    for(const mode of ['night','rainy']){
      assert.ok(w.setWeather(mode));assert.equal(w.weather,mode);assert.equal(w.atmosphere.rainRoot.visible,mode==='rainy');
      assert.equal(w.sky.uniforms.night.value,Number(mode==='night'),'every sky shader uniform must be a finite 0 or 1');
      assert.equal(w.sky.uniforms.rain.value,Number(mode==='rainy'));
      w.load(h);assert.equal(w.weather,'normal');assert.equal(w.atmosphere.rainRoot.visible,false);
      assert.equal(w.sky.uniforms.night.value,normalNight);
      const profile=weatherProfile(h);assert.equal(w.sun.intensity,profile.sunIntensity);assert.equal(w.renderer.toneMappingExposure,profile.exposure);
    }
  }
  assert.equal(w.setWeather('invalid'),false);assert.equal(w.weather,'normal');
  assert.equal((settingsDialog(defaultSave().settings).match(/name="setting-courseWeather"/g)||[]).length,3);
});
test('atmosphere switches restore materials, preserve gameplay state, and leave only bounded effect pools',()=>{
  const w=worldFixture(),ui={world:w,action(){},root:{querySelectorAll:()=>[]},game:{state:'playing'}};
  const material=new THREE.MeshStandardMaterial({roughness:.94});w.group.add(new THREE.Mesh(new THREE.BoxGeometry(),material));
  installCourseAtmosphere(ui);const p=new GolfPhysics();p.load(w.hole);p.shoot(0,-1,.7,{club:'7i'});
  const before=JSON.stringify({ball:p.ball,omega:p.omega,hole:p.hole.wind});
  for(let i=0;i<25;i++){w.setWeather('rainy');assert.equal(material.roughness,.62);w.setWeather('night');assert.equal(material.roughness,.94);w.setWeather('normal');}
  assert.equal(JSON.stringify({ball:p.ball,omega:p.omega,hole:p.hole.wind}),before);
  assert.equal(w.atmosphere.rainPositions.length,500*6);assert.equal(w.atmosphere.sand.grains.instanceMatrix.count,180);
});
test('mountain ridges are deterministic, varied, continuous at the seam and bounded at both qualities',()=>{
  const h=getGolfHole(14,5);
  for(const quality of ['low','high'])for(let layer=0;layer<3;layer++){
    const data=mountainRangeData(h,layer,quality);assert.deepEqual(data,mountainRangeData(h,layer,quality));
    assert.equal(data.positions.length,data.colors.length);assert.ok(data.positions.length<60000);
    assert.ok(data.positions.every(Number.isFinite));assert.ok(data.colors.every(v=>v>=0&&v<=1));
    const ys=data.positions.filter((_,i)=>i%3===1);assert.ok(Math.max(...ys)-Math.min(...ys)>50);
  }
});
test('sand landing keeps a visible skid then settles, and emits one impact contact',()=>{
  const h=getGolfHole(0,0),b=h.bunkers[0],p=new GolfPhysics();p.load(h);
  p.ball={x:b.x,y:terrainAt(h,b.x,b.z).height+1.5,z:b.z,vx:7,vy:-5,vz:-2};p.airborne=true;p.active=true;p.shotTime=0;
  let contact;
  for(let tick=0;tick<1200&&p.active;tick++){
    p.update(1/120);
    if(!contact&&p.events.includes('sand-impact'))contact={...p.ball};
  }
  assert.ok(contact);assert.ok(Math.hypot(contact.vx,contact.vz)>2,'landing should not stop dead');
  assert.ok(Math.hypot(p.ball.x-contact.x,p.ball.z-contact.z)>1,'ball should skid through the sand');
  assert.equal(p.active,false);assert.equal(p.events.filter(e=>e==='sand-impact').length,1);assert.equal(p.sandContact.kind,'impact');
});
test('sand wedge leaves the bunker with a sand-shot event, and skips still verify on all nine holes',()=>{
  const h=getGolfHole(0,0),b=h.bunkers[0],p=new GolfPhysics();p.load(h);p.lastSafe={x:b.x,z:b.z};p.reset();
  assert.ok(p.shoot(0,-1,.65,{club:'sw'}));assert.ok(p.ball.vy>0);assert.ok(p.events.includes('sand-shot'));assert.equal(p.sandContact.kind,'shot');
  for(let index=0;index<9;index++)assert.equal(verifyHole({mode:'golf',course:14,equipment:{}},index,[{kind:'skip',tick:0}],0).strokes,getGolfHole(14,index).par+6);
});
