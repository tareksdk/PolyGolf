import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultSave,ProgressionManager,LocalSaveRepository} from '../dist/src/save.js';
import {rollRoundLocker} from '../dist/src/round-rewards.js';
import {LOCKERS,openLocker} from '../dist/src/pro-shop.js';
import {ITEMS,shopAvailable} from '../dist/src/catalog.js';
import {ownedEmotes} from '../dist/src/emotes.js';
import {installTheme,readTheme} from '../dist/src/theme.js';
import {cardActionTarget} from '../dist/src/card-actions.js';

const full={mode:'golf',courseIndex:0,practice:false,strokes:[4,3,4],time:210};
const storage=()=>{const m=new Map();return{getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v)};};
test('ten percent round roll is exact and all available lockers can drop equally',()=>{
  let drops=0;
  for(let i=0;i<10000;i++){let n=0;const drop=rollRoundLocker(full,()=>n++===0?i/10000:.5);if(drop)drops++;}
  assert.equal(drops,1000);
  for(let i=0;i<LOCKERS.length;i++){let n=0;assert.equal(rollRoundLocker(full,()=>n++===0?.099999:(i+.5)/LOCKERS.length),LOCKERS[i].id);}
  assert.equal(rollRoundLocker(full,()=>.1),null);
});
test('no locker roll for incomplete, skipped, practice, custom or sudden-death rounds',()=>{
  for(const changes of [{strokes:[4,3]},{strokes:[4,3,NaN]},{practice:true},{skipped:true},{customOrigin:'community'},{sudden:true}])
    assert.equal(rollRoundLocker({...full,...changes},()=>{throw Error('Ineligible round rolled');}),null);
  assert.ok(rollRoundLocker({...full,mode:'mini',strokes:Array(9).fill(3)},()=>0));
});
test('round locker saves across reload and opens free without changing completion bonus',()=>{
  const repo=new LocalSaveRepository(storage()),p=new ProgressionManager(repo),before=p.data.coins;
  const reward=p.completeCourse(full,[4,3,4],()=>0);assert.equal(reward.locker,'forge');assert.equal(p.data.coins,before+110);
  const reload=new ProgressionManager(repo);assert.equal(reload.data.lockers.forge,1);
  const coins=reload.data.coins;const r=openLocker(reload,'forge','round-drop-opening-001',()=>.5);
  assert.equal(r.earned,true);assert.equal(reload.data.coins,coins);assert.equal(reload.data.lockers.forge,0);
});
test('owned off-rotation items equip and persist without purchasing or spending coins',()=>{
  const repo=new LocalSaveRepository(storage()),p=new ProgressionManager(repo);
  const item=ITEMS.find(i=>i.source==='daily'&&!shopAvailable(i.id));assert.ok(item);
  p.data.owned.push(item.id);const coins=p.data.coins;assert.equal(p.equip(item.id),true);
  assert.equal(new ProgressionManager(repo).data.equipment[item.category],item.id);assert.equal(p.data.coins,coins);
});
test('appearance switches live and survives account data replacement and a reload',()=>{
  globalThis.localStorage=storage();globalThis.window={addEventListener(){}};
  globalThis.document={documentElement:{dataset:{},style:{}}};
  const makeUI=()=>({progress:{data:defaultSave()},render(){},changeSetting(input){this.progress.data.settings[input.dataset.setting]=input.value;}});
  const ui=makeUI();installTheme(ui);ui.changeSetting({dataset:{setting:'theme'},value:'light'});
  assert.equal(document.documentElement.dataset.theme,'light');assert.equal(readTheme(),'light');
  ui.progress.data=defaultSave();ui.render();assert.equal(ui.progress.data.settings.theme,'light');
  const reload=makeUI();installTheme(reload);assert.equal(reload.progress.data.settings.theme,'light');
  reload.changeSetting({dataset:{setting:'theme'},value:'dark'});assert.equal(readTheme(),'dark');
});
test('card backgrounds resolve primary actions without overriding nested controls',()=>{
  const primary={dataset:{action:'practice'}},secondary={dataset:{action:'community-like'}};
  const target=matches=>({closest:selector=>matches[selector]||null});
  assert.equal(cardActionTarget(target({'[data-card]':{querySelector:()=>primary}})),primary);
  assert.equal(cardActionTarget(target({'[data-action]':secondary,'[data-card]':{querySelector:()=>primary}})),secondary);
  assert.equal(cardActionTarget(target({'button,a,input,select,textarea,label,[contenteditable]':{}})),null);
});
test('wheel only includes owned emotes and places the equipped one first',()=>{
  const d=defaultSave(),item=ITEMS.find(i=>i.category==='emote'&&!d.owned.includes(i.id));d.owned.push(item.id);d.equipment.emote=item.id;
  const list=ownedEmotes(d);assert.equal(list[0].id,item.id);assert.equal(list.length,2);assert.ok(list.every(i=>i.category==='emote'&&d.owned.includes(i.id)));
});
