import test from 'node:test';
import assert from 'node:assert/strict';
import {HOLES,CLUBS,UPGRADES,createSave,sanitizeSave,makeEquation,planShot,distance,terrainAt,maxDistance,buyUpgrade,rewardFor} from '../dist/math/engine.js';

test('every equation is solvable with its displayed integer answer',()=>{
 for(const difficulty of ['chill','classic','expert'])for(const club of CLUBS)for(let i=0;i<100;i++){
  const q=makeEquation(club.id,difficulty),[left,right]=q.text.split(' = ');let result;
  if(left.startsWith('x +'))result=q.answer+Number(left.split(' + ')[1]);
  else if(left.includes(' × '))result=Number(left.split(' × ')[0])*q.answer;
  else{const m=left.match(/^(\d+)x \+ (\d+)$/);assert.ok(m);result=Number(m[1])*q.answer+Number(m[2]);}
  assert.equal(result,Number(right));assert.ok(Number.isInteger(q.answer));
 }
});

test('all nine holes finish with the starting clubs and automatic flag aim',()=>{
 for(const h of HOLES){let ball=[...h.tee],strokes=0,holed=false;const upgrades=createSave().upgrades;
  while(strokes<6&&!holed){const d=distance(ball,h.pin),lie=terrainAt(ball,h);const club=CLUBS.find(c=>maxDistance(c.id,upgrades,lie)>=d)?.id||'driver';const shot=planShot({ball,angle:Math.atan2(h.pin[1]-ball[1],h.pin[0]-ball[0]),power:Math.max(2,Math.min(Math.round(d),maxDistance(club,upgrades,lie))),club,hole:h,upgrades});assert.equal(shot.penalty,false,h.name);ball=shot.end;holed=shot.holed;strokes++;}
  assert.ok(holed,h.name);assert.ok(strokes<=h.par,h.name);
 }
});

test('putts cannot jump water, while a lofted iron can',()=>{
 const hole={pin:[60,0],water:[[0,0,10,10]],sand:[]};const base={ball:[-20,0],angle:0,power:40,hole,upgrades:createSave().upgrades};
 assert.equal(planShot({...base,club:'putter'}).terrain,'water');assert.equal(planShot({...base,club:'iron'}).penalty,false);
 assert.equal(planShot({...base,power:200,club:'driver'}).terrain,'out');
});

test('upgrades enforce funds and caps and have real gameplay effects',()=>{
 const s=createSave();assert.equal(buyUpgrade(s,'power'),false);s.coins=10000;
 const before=maxDistance('driver',s.upgrades);assert.ok(buyUpgrade(s,'power'));assert.equal(maxDistance('driver',s.upgrades),before+12);assert.equal(s.coins,9930);
 for(let i=0;i<3;i++)assert.ok(buyUpgrade(s,'power'));const balance=s.coins;assert.equal(buyUpgrade(s,'power'),false);assert.equal(s.coins,balance);
 const base=rewardFor(2,3,0,s.upgrades);assert.ok(buyUpgrade(s,'coins'));assert.equal(rewardFor(2,3,0,s.upgrades),Math.round(base*1.2));
 assert.ok(maxDistance('iron',s.upgrades,'sand')<maxDistance('iron',s.upgrades));
 const h={pin:[10,0],water:[],sand:[]};const shot={ball:[0,0],power:13,angle:0,club:'putter',hole:h,upgrades:s.upgrades};assert.equal(planShot(shot).holed,false);buyUpgrade(s,'touch');assert.equal(planShot(shot).holed,true);
});

test('saved progress resumes valid rounds and rejects corrupt values',()=>{
 const s=createSave();s.coins=123;s.upgrades.power=2;s.round.hole=1;s.round.scores=[2];s.round.ball=[...HOLES[1].tee];assert.deepEqual(sanitizeSave(JSON.parse(JSON.stringify(s))),s);
 const corrupted={...s,coins:-1,upgrades:{power:Infinity},round:{...s.round,ball:[NaN,3]}};const repaired=sanitizeSave(corrupted);assert.equal(repaired.coins,0);assert.equal(repaired.upgrades.power,0);assert.equal(repaired.round.hole,0);
 assert.deepEqual(sanitizeSave(null),createSave());
});
