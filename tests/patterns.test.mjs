import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultSave, ProgressionManager, LocalSaveRepository, SAVE_KEY } from '../dist/src/save.js';
import { ITEMS, ITEM_BY_ID } from '../dist/src/catalog.js';
import { LOCKERS, lockerContents, openLocker } from '../dist/src/pro-shop.js';
import { validSeed, rollPattern, patternLabel, finishItem } from '../dist/src/finishes.js';
import { publicProfile } from '../dist/src/profile-data.js';
import { driverYards } from '../dist/src/equipment.js';
const manager=()=>new ProgressionManager({load:defaultSave,save:()=>true});
const roll=(pm,seed,id)=>{pm.data.lockers={forge:20};let i=0;return openLocker(pm,'forge',id,()=>[.99,.01,seed/1000][i++]);};
test('18 original finishes and both new lockers have complete, isolated drop pools',()=>{
 assert.equal(ITEMS.filter(i=>i.finish).length,18);
 for(const id of ['forge','workshop']){
  const contents=lockerContents(id);assert.equal(contents.reduce((s,r)=>s+r.weight,0),100);
  assert.equal(contents.find(r=>r.rarity==='Legendary').items.length,3);
  for(const {items,each} of contents){assert.ok(items.length);assert.ok(each>0);assert.ok(items.every(i=>i.source==='pack'&&i.finish&&i.crate==='workshop'));}
 }
 for(const locker of LOCKERS.filter(l=>!['forge','workshop'].includes(l.id)))assert.ok(lockerContents(locker.id).every(r=>r.items.every(i=>!i.finish)));
});
test('Case Hardened seeds persist independently; rerolls, unowned equips and retries are rejected',()=>{
 const pm=manager(),a=roll(pm,0,'gold-opening-000001'),b=roll(pm,999,'blue-opening-000001');
 assert.equal(a.item,'driver-case-hardened');assert.equal(a.seed,0);assert.equal(b.seed,999);
 assert.equal(b.duplicate,false);assert.deepEqual(pm.data.patterns[a.item],[0,999]);
 assert.equal(pm.data.owned.filter(id=>id===a.item).length,1);
 assert.equal(pm.equip(a.item,999),true);assert.equal(pm.equip(a.item,400),false);
 const storage={getItem:k=>k===SAVE_KEY?JSON.stringify(pm.data):null,setItem(){}};
 const reloaded=new ProgressionManager(new LocalSaveRepository(storage));
 assert.deepEqual(reloaded.data.patterns[a.item],[0,999]);assert.equal(reloaded.data.equipment.patterns[a.item],999);
 assert.equal(finishItem(ITEM_BY_ID[a.item],reloaded.data.equipment).seed,999);
 assert.equal(openLocker(pm,'forge','blue-opening-000001',()=>{throw Error('rerolled');}).seed,999);
 const duplicate=roll(pm,999,'blue-opening-000002');assert.equal(duplicate.duplicate,true);assert.equal(pm.data.patterns[a.item].length,2);
 assert.equal(publicProfile({state:pm.data}).equipment.patterns[a.item],999);
 assert.equal(driverYards(pm.data.equipment),350);
});
test('all 1,000 seeds are reachable, with one percent full gold and one percent full blue',()=>{
 const seeds=Array.from({length:1000},(_,n)=>rollPattern(()=>(n+.5)/1000));
 assert.equal(new Set(seeds).size,1000);assert.ok(seeds.every(validSeed));
 assert.equal(seeds.filter(n=>patternLabel(n)==='Gold finish').length,10);
 assert.equal(seeds.filter(n=>patternLabel(n)==='Blue finish').length,10);
 for(const r of [-1,1,NaN,Infinity])assert.throws(()=>rollPattern(()=>r));
});
