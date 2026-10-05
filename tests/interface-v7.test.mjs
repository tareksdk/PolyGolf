import test from 'node:test';
import assert from 'node:assert/strict';
import { chargePower, chargeAccuracy, shotDirection } from '../dist/src/game.js';
import { renderScale } from '../dist/src/render-quality.js';
import { activityCount, activityRange } from '../dist/src/online-activity.js';
import { tradeInventory, exchangeItems, validateOffer, tradeable } from '../dist/src/trades.js';
import { LEVEL_REWARDS, unlockLevels } from '../dist/src/equipment.js';
import { defaultSave } from '../dist/src/save.js';
import { ITEMS, DEFAULT_EQUIPMENT } from '../dist/src/catalog.js';
import { SESSION_KEY, readSession, writeSession, clearSession, invalidRefresh } from '../dist/src/session-store.js';
import {hitsPirateShip} from '../dist/src/course-features.js';

test('power and direction reverse continuously at their limits; sweet spot stays straight',()=>{
  assert.equal(chargePower(1.65),1);assert.ok(Math.abs(chargePower(1.65-.001)-chargePower(1.65+.001))<1e-8);
  assert.equal(chargePower(3.3),.01);assert.ok(chargePower(3.5)>chargePower(3.3));
  assert.equal(chargeAccuracy(0),0);assert.equal(chargeAccuracy(.825),1);assert.ok(Math.abs(chargeAccuracy(2.475)+1)<1e-10);
  for(let cycle=0;cycle<8;cycle++)assert.ok(Math.abs(chargeAccuracy(1.65+3.3*cycle))<1e-10,'A full-power straight shot is reachable');
  for(let t=0;t<20;t+=.01){assert.ok(chargePower(t)>=.01&&chargePower(t)<=1);assert.ok(Math.abs(chargeAccuracy(t))<=1);}
  assert.deepEqual(shotDirection({x:0,z:-1},.15),{x:0,z:-1});
  const l=shotDirection({x:0,z:-1},-1),r=shotDirection({x:0,z:-1},1);
  assert.ok(l.x<0&&r.x>0);assert.ok(Math.abs(Math.hypot(r.x,r.z)-1)<1e-10);
  assert.ok(Math.abs(shotDirection({x:0,z:-1},1,true).x)<r.x);
});
test('high graphics supersamples 1080p, preserves native 4K and bounds framebuffer cost',()=>{
  assert.equal(renderScale('high',1,1920,1080),1.5);
  assert.ok(renderScale('high',2,1920,1080)>=1.99);
  assert.ok(renderScale('high',1,3840,2160)>=1);
  assert.equal(renderScale('low',2,1280,720),1);
});
test('new upper sails and quarterdeck remain hittable achievement targets',()=>{
 const ship={x:0,y:0,z:0};
 assert.ok(hitsPirateShip(ship,{x:1,y:19.5,z:2},{x:1,y:19.5,z:0}));
 assert.ok(hitsPirateShip(ship,{x:3,y:5.9,z:7},{x:2,y:5.9,z:7}));
 assert.equal(hitsPirateShip(ship,{x:10,y:19.5,z:2},{x:10,y:19.5,z:0}),false);
});
test('activity estimates always remain inside exact integer +/-5% bounds including zero',()=>{
  assert.deepEqual(activityRange(100),{min:95,max:105});
  for(const base of [0,1,10,100,137,999999,1000000])for(let phase=0;phase<40;phase+=.07){const n=activityCount(base,phase);assert.ok(Number.isInteger(n));assert.ok(n>=base*.95&&n<=base*1.05);}
  assert.equal(activityCount(100,Math.PI/2),105);assert.equal(activityCount(100,Math.PI*1.5),95);
});
test('trade exchanges exact patterns, resets removed equipment and preserves balances and progression',()=>{
  const a=defaultSave(),b=defaultSave(),id='driver-case-hardened',other='ball-lava';
  a.owned.push(id);a.patterns[id]=[0,999];a.equipment.driver=id;a.equipment.patterns[id]=999;b.owned.push(other);b.equipment.ball=other;
  const result=exchangeItems(a,b,[{id,seed:999}],[{id:other}]);
  assert.deepEqual(result.sender.patterns[id],[0]);assert.equal(result.sender.equipment.patterns[id],0);
  assert.deepEqual(result.receiver.patterns[id],[999]);assert.equal(result.receiver.equipment.ball,DEFAULT_EQUIPMENT.ball);
  for(const key of ['coins','xp','stats','giftClaims','clubPass']){assert.deepEqual(result.sender[key],a[key]);assert.deepEqual(result.receiver[key],b[key]);}
  assert.deepEqual(a.patterns[id],[0,999]);assert.ok(b.owned.includes(other));
  const final=exchangeItems(result.sender,result.receiver,[{id,seed:0}],[{id,seed:999}]);
  assert.deepEqual(final.sender.patterns[id],[999]);assert.deepEqual(final.receiver.patterns[id],[0]);
});
test('trades reject absent, duplicate, exclusive and already-owned items without mutating inventories',()=>{
  const a=defaultSave(),b=defaultSave(),items=['ball-lava','ball-gold','ball-marble'].map(id=>ITEMS.find(i=>i.id===id));a.owned.push(items[0].id,items[1].id);b.owned.push(items[1].id);
  const original=structuredClone(a);
  assert.throws(()=>exchangeItems(a,b,[{id:items[0].id}],[{id:items[1].id}]),/already owns/);
  assert.throws(()=>validateOffer([{id:items[0].id},{id:items[0].id}],a),/available/);
  assert.throws(()=>validateOffer([{id:items[2].id}],a),/available/);
  assert.throws(()=>validateOffer([{id:items[0].id,seed:5}],a),/cannot be traded/);
  for(const source of ['membership','starter','alpha','competitive','achievement']){const item=ITEMS.find(i=>i.source===source);if(item){a.owned.push(item.id);assert.throws(()=>validateOffer([{id:item.id}],a),/cannot be traded/);a.owned.pop();}}
  assert.deepEqual(a,original);assert.equal(tradeInventory(a).length,2);
});
test('automatically restored progression equipment can never be farmed through trades',()=>{
 const data=defaultSave();unlockLevels({data,level:{level:100},onNotify(){}});
 for(const r of LEVEL_REWARDS){assert.ok(data.owned.includes(r.id));assert.equal(tradeable(ITEMS.find(i=>i.id===r.id)),false);assert.throws(()=>validateOffer([{id:r.id}],data),/cannot be traded/);}
 assert.deepEqual(tradeInventory(data),[]);
});
test('session tokens migrate to persistent storage, survive tab closure and explicit logout clears both',()=>{
  const storage=()=>{const m=new Map();return{getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k),clear:()=>m.clear()};};
  globalThis.localStorage=storage();globalThis.sessionStorage=storage();
  const s={access_token:'fixture-access',refresh_token:'fixture-refresh',user:{id:'fixture'},expires_at:9999999999};
  sessionStorage.setItem(SESSION_KEY,JSON.stringify(s));assert.deepEqual(readSession(),s);assert.equal(sessionStorage.getItem(SESSION_KEY),null);
  sessionStorage.clear();assert.deepEqual(readSession(),s);writeSession({...s,refresh_token:'rotated'});assert.equal(readSession().refresh_token,'rotated');
  assert.equal(invalidRefresh({status:503}),false);assert.equal(invalidRefresh({status:429}),false);assert.equal(invalidRefresh({status:400}),true);
  clearSession();assert.equal(readSession(),null);assert.equal(localStorage.getItem(SESSION_KEY),null);
});
