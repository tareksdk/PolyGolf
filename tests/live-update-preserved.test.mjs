import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultSave,ProgressionManager,DAILY_REWARDS,levelInfo} from '../dist/src/save.js';
import {openLockers,lockerOpenLimit,lockerQuote} from '../dist/src/pro-shop.js';

test('live coin rewards and multi-locker unlocks survive the course menu update',()=>{
 assert.deepEqual(DAILY_REWARDS,[300,400,500,650,800,1000,1250]);
 for(const [level,limit] of [[1,1],[5,2],[10,3],[15,5],[20,10]]){
  let xp=0;while(levelInfo(xp).level<level)xp+=125;
  assert.equal(lockerOpenLimit(xp),limit);
 }
 const p=new ProgressionManager({load:defaultSave,save(){}});
 assert.throws(()=>openLockers(p,'fairway',2,'limited-opening-0001',()=>.5),/level allows/);
});
test('mixed earned and purchased multi-lockers use one atomic, idempotent receipt',()=>{
 let saves=0;const p=new ProgressionManager({load:defaultSave,save(){saves++;}});
 p.data.xp=10000;p.data.coins=10000;p.data.lockers={fairway:1};saves=0;
 const quote=lockerQuote(p.data,'fairway',2);assert.equal(quote.earned,1);assert.equal(quote.paid,1);assert.equal(quote.cost,1500);
 const receipt=openLockers(p,'fairway',2,'mixed-opening-0001',()=>.5);
 assert.equal(receipt.items.length,2);assert.equal(p.data.coins,10000-1500+receipt.refund);assert.equal(saves,1);
 const after=structuredClone(p.data);
 assert.deepEqual(openLockers(p,'fairway',2,'mixed-opening-0001',()=>.9),receipt);assert.deepEqual(p.data,after);assert.equal(saves,1);
 assert.throws(()=>openLockers(p,'fairway',3,'mixed-opening-0001',()=>.5),/already used/);
 let rolls=0;assert.throws(()=>openLockers(p,'fairway',2,'failed-opening-0001',()=>{if(++rolls===3)throw Error('roll failed');return .5;}),/roll failed/);
 assert.deepEqual(p.data,after);assert.equal(saves,1);
});
