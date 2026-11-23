import test from 'node:test';
import assert from 'node:assert/strict';
import {COURSES, getHole} from '../dist/src/courses.js';
import {GOLF_COURSES, getGolfHole, golfHoleCount} from '../dist/src/golf-courses.js';
import {teeFanSpots} from '../dist/src/tee-fans.js';
import {openingHole, drivingRange} from '../dist/src/onboarding.js';
import {golferTag} from '../dist/src/nameplates.js';
import {GolfPhysics} from '../dist/src/golf-physics.js';
import {golfGear} from '../dist/src/equipment.js';
import {DEFAULT_EQUIPMENT} from '../dist/src/catalog.js';

test('both sidelines have spectators across the course catalogue and practice lessons',()=>{
  const holes=[openingHole(),drivingRange(),
    ...GOLF_COURSES.flatMap((_,i)=>Array.from({length:golfHoleCount(i)},(_,j)=>getGolfHole(i,j))),
    ...COURSES.flatMap((_,i)=>Array.from({length:9},(_,j)=>getHole(i,j)))];
  for(const hole of holes){
    const spots=teeFanSpots(hole);
    assert.ok(spots.some(p=>p.variant<3)&&spots.some(p=>p.variant>=3),hole.name);
    assert.ok(spots.every(p=>Number.isFinite(p.angle) && Math.hypot(p.x-hole.start.x,p.z-hole.start.z)>2),hole.name);
  }
});

test('a centred 80 percent putt reaches the practice cup with the tutorial equipment',()=>{
  const p=new GolfPhysics();p.load(openingHole());
  p.shoot(0,-1,.8,{club:'putter',gear:golfGear(DEFAULT_EQUIPMENT)});
  for(let i=0;i<2400 && p.active;i++)p.update(1/120);
  assert.equal(p.sunk,true);
});

test('in-round nametags render player names as text',()=>{
  assert.equal(golferTag('A & <B>'),'<span class="golfer-tag">A &amp; &lt;B&gt;</span>');
});
