import test from 'node:test';
import assert from 'node:assert/strict';
import { PLANETS, PLANETFALL_CLUBS, PLANETFALL_GAPS, PLANETFALL_INDEX, planetfallHole, planetAt, asteroidPosition, hitsAsteroid, readPlanetfallBoard, recordPlanetfall, PLANETFALL_BOARD_KEY } from '../dist/src/planetfall.js';
import { GolfPhysics } from '../dist/src/golf-physics.js';
import { GameManager } from '../dist/src/game.js';
import { getGolfHole, golfHoleCount, terrainAt } from '../dist/src/golf-courses.js';
import { previewTask } from '../dist/src/shot-preview.js';
import { recommendClub } from '../dist/src/club-distances.js';
import { courseMenu } from '../dist/src/course-menu.js';
import { defaultSave, ProgressionManager } from '../dist/src/save.js';

const dt=1/120;
const settle=p=>{let ticks=0;while(p.active&&ticks++<5500)p.update(dt);assert.equal(p.active,false,'shot settles within the time budget');return ticks;};
const newPhysics=()=>{const p=new GolfPhysics();p.load(planetfallHole());return p;};

test('one continuous, par-free course includes exactly the eight planets then the Sun',()=>{
  assert.deepEqual(PLANETS.map(p=>p.name),['Neptune','Uranus','Saturn','Jupiter','Mars','Earth','Venus','Mercury','Sun']);
  const h=getGolfHole(PLANETFALL_INDEX,0);
  assert.equal(golfHoleCount(PLANETFALL_INDEX),1);assert.equal(h.par,0);assert.equal(h.strokeLimit,Infinity);
  assert.equal(h.space,true);assert.equal(planetAt(h.start.x,h.start.z).name,'Neptune');assert.equal(planetAt(h.cup.x,h.cup.z).name,'Sun');
  assert.throws(()=>getGolfHole(PLANETFALL_INDEX,1),/Unknown golf hole/);
});
test('every gap grows, caps stay narrow, and the space between them is a real void',()=>{
  const h=planetfallHole();let previous=0,previousEdgeGap=0;
  for(let i=1;i<9;i++){
    const a=PLANETS[i-1],b=PLANETS[i],distance=Math.hypot(a.x-b.x,a.z-b.z),edgeGap=distance-a.pad-b.pad;
    assert.ok(Math.abs(distance-PLANETFALL_GAPS[i-1])<1e-9);assert.ok(distance>previous);assert.ok(edgeGap>previousEdgeGap);
    assert.ok(b.pad<=10.5);assert.equal(terrainAt(h,b.x,b.z).hazard,null);
    assert.equal(terrainAt(h,(a.x+b.x)/2,(a.z+b.z)/2).hazard,'void');previous=distance;previousEdgeGap=edgeGap;
  }
});
test('woods, driver and wedges cannot bypass the iron challenge, and putting opens on the Sun',()=>{
  for(const club of ['driver','3w','5w','pw','gw','sw','lw','putter'])assert.equal(newPhysics().shoot(0,-1,.8,{club}),false,club);
  for(const club of PLANETFALL_CLUBS)assert.equal(newPhysics().shoot(0,-1,.8,{club}),true,club);
  const p=newPhysics();p.reached=8;p.lastSafe={x:PLANETS[8].x,z:PLANETS[8].z};p.reset();assert.ok(p.shoot(0,-1,.2,{club:'putter'}));
  for(let i=0;i<8;i++)assert.ok(PLANETFALL_CLUBS.includes(recommendClub({...p.hole,cup:PLANETS[i+1]},PLANETS[i])));
});
test('eight consecutive real iron shots land on every planet, then a putt finishes the same hole',()=>{
  const p=newPhysics();
  const shots=[['6i',.54],['4i',.56],['9i',.78],['5i',.68],['5i',.74],['7i',.92],['6i',.94],['4i',.86]];
  for(let i=0;i<8;i++){
    const destination=PLANETS[i+1],before=p.reached;
    assert.ok(p.shoot(destination.x-p.ball.x,destination.z-p.ball.z,shots[i][1],{club:shots[i][0]}));
    assert.equal(p.reached,before,'flight alone does not secure a landing');settle(p);
    assert.equal(p.events.includes('water'),false,destination.name+' reached without a miss');
    assert.equal(p.reached,i+1,destination.name);assert.equal(planetAt(p.ball.x,p.ball.z).index,i+1);assert.deepEqual(p.lastSafe,{x:p.ball.x,z:p.ball.z});
    p.events.length=0;
  }
  assert.equal(p.sunk,false,'landing on the Sun still requires the cup');
  const dx=p.hole.cup.x-p.ball.x,dz=p.hole.cup.z-p.ball.z;
  assert.ok(p.shoot(dx,dz,.27,{club:'putter'}));settle(p);assert.equal(p.sunk,true);assert.ok(p.events.includes('cup'));
});
test('a miss returns to the last secured landing, preserves progress, and costs no fake checkpoint',()=>{
  const p=newPhysics();p.shoot(PLANETS[1].x,PLANETS[1].z,.54,{club:'6i'});settle(p);
  assert.equal(p.reached,1);const checkpoint={...p.lastSafe};p.events.length=0;
  p.shoot(1,0,1,{club:'4i'});settle(p);assert.ok(p.events.includes('space-miss'));p.reset();
  assert.equal(p.reached,1);assert.equal(p.ball.x,checkpoint.x);assert.equal(p.ball.z,checkpoint.z);
});
test('landing on a later planet out of sequence cannot unlock it',()=>{
  const p=newPhysics(),future=PLANETS[3];
  Object.assign(p.ball,{x:future.x,z:future.z,y:.021335,vx:0,vy:0,vz:0});p.active=true;p.airborne=false;p.shotTime=0;
  settle(p);assert.equal(p.reached,0);assert.ok(p.events.includes('water'));
});
test('the moving belt is between Jupiter and Mars and collides with real flight segments',()=>{
  const p=asteroidPosition(5,12),q=asteroidPosition(5,18);
  assert.ok(p.z<PLANETS[3].z&&p.z>PLANETS[4].z);assert.notDeepEqual(p,q);
  assert.equal(hitsAsteroid({x:p.x-10,y:p.y,z:p.z},{x:p.x+10,y:p.y,z:p.z},12),true);
  assert.equal(hitsAsteroid({x:300,y:200,z:0},{x:301,y:201,z:0},12),false);
  const physics=newPhysics();physics.clock=12-dt;physics.ball={x:p.x,y:p.y,z:p.z,vx:0,vy:0,vz:0};physics.airborne=true;physics.active=true;physics.shotTime=0;
  physics.update(dt);assert.equal(physics.active,false);assert.equal(physics.missReason,'Asteroid collision');assert.ok(physics.events.includes('water'));
});
test('the shot preview uses the live checkpoint and belt clock, including the final putt',()=>{
  const h=planetfallHole(),b={x:PLANETS[8].x,y:.021335,z:PLANETS[8].z,vx:0,vy:0,vz:0},options={club:'putter',reached:8,clock:37};
  const task=previewTask(h,b,{x:0,z:-1},.27,options);while(!task.step(512)){}
  const points=task.result();assert.ok(points.length>3);assert.ok(Math.abs(points.at(-1)-h.cup.z)<.3);
});
function gameFixture(){
  globalThis.window={addEventListener(){}};globalThis.document={addEventListener(){}};
  const w={canvas:{addEventListener(){}},equipment:{},settings:{},load(){},update(){},setAim(){},hit(){},resetCamera(){}};
  const g=new GameManager(w);g.start(PLANETFALL_INDEX,false,{mode:'golf',round:{planetfall:true,localPreview:true}});return g;
}
test('three misses end the run; paused time freezes the belt and run timer',()=>{
  const g=gameFixture();g.update(.05);const clock=g.physics.clock,time=g.elapsed;
  g.setPaused(true,false);for(let i=0;i<20;i++)g.update(.05);assert.equal(g.physics.clock,clock);assert.equal(g.elapsed,time);
  g.setPaused(false,false);g.planetfallMiss('Missed');g.planetfallMiss('Missed');assert.equal(g.state,'playing');
  g.planetfallMiss('Missed');assert.equal(g.round.penalties,3);assert.equal(g.state,'complete');assert.equal(g.physics.active,false);
});
test('the challenge permits more than eight shots and restarts cleanly',()=>{
  const g=gameFixture();g.strokes=50;g.beginPower();g.lockPower();g.shoot();assert.ok(g.pendingSwing);
  g.start(PLANETFALL_INDEX,false,{mode:'golf',round:{planetfall:true}});
  assert.equal(g.strokes,0);assert.equal(g.physics.reached,0);assert.equal(g.round.penalties,0);assert.equal(g.pendingSwing,null);assert.equal(g.physics.clock,0);
});
test('the device leaderboard sorts distance, Sun finishes, shots and time; updates persist without duplicate runs',()=>{
  const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
  assert.deepEqual(readPlanetfallBoard(storage),[]);
  for(const [id,reached,finished,shots,time] of [['a',2,false,2,30],['b',6,false,9,80],['c',6,false,8,90],['d',8,false,10,100],['e',8,true,15,120],['f',6,false,8,85]])recordPlanetfall({id,name:'Golfer',reached,finished,shots,time},storage);
  assert.deepEqual(readPlanetfallBoard(storage).map(r=>r.id),['e','d','f','c','b','a']);
  recordPlanetfall({id:'a',name:'Golfer',reached:7,shots:11,time:90},storage);
  assert.equal(readPlanetfallBoard(storage).length,6);assert.equal(readPlanetfallBoard(storage)[2].id,'a');
  storage.setItem(PLANETFALL_BOARD_KEY,'invalid');assert.deepEqual(readPlanetfallBoard(storage),[]);
  assert.throws(()=>recordPlanetfall({id:'x',name:'x',reached:0,shots:1,time:1},{getItem:()=>null,setItem(){throw Error('Storage full');}}),/Storage full/);
});
test('the live course card stays within Other Maps and uses its own device board',()=>{
  const data=defaultSave(),progress=new ProgressionManager({load:()=>data,save:()=>true});
  const ui={mode:'golf',screen:'courses',localPreview:true,progress,world:{thumbnail:()=>''}};
  const menu=courseMenu(ui);assert.match(menu,/Play Planetfall/);assert.match(menu,/1 continuous hole · No par/);assert.match(menu,/Farthest-planet board/);
  const live=courseMenu({...ui,localPreview:false});assert.match(live,/Play Planetfall/);assert.match(live,/Hole of the day/);assert.doesNotMatch(live,/daily-courses-heading/);
  const other=live.match(/<section class="course-section course-section-other"[\s\S]*?<\/section>/)?.[0];assert.ok(other?.includes('data-course-card="19"'));assert.match(live,/saved on this device/);
  assert.match(live,/Hole of the week/);assert.equal((live.match(/data-course-card="18"/g)||[]).length,1);assert.equal((live.match(/data-course-card="19"/g)||[]).length,1);
});
