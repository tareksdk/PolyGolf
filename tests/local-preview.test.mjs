import test from 'node:test';
import assert from 'node:assert/strict';
import {isLocalPreview,previewStorage,PREVIEW_SAVE_KEY,installLocalPreview} from '../dist/src/local-preview.js';
import {GolfCloud} from '../dist/src/cloud.js';
import {SAVE_KEY,defaultSave,LocalSaveRepository,ProgressionManager} from '../dist/src/save.js';

test('preview progress can read an existing local save but writes only its own copy',()=>{
 const original=defaultSave();original.coins=1234;
 const data=new Map([[SAVE_KEY,JSON.stringify(original)],['little-links.session','untouched']]);
 const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 const p=new ProgressionManager(new LocalSaveRepository(previewStorage(storage)));
 p.award(50,0);p.save();
 assert.equal(JSON.parse(data.get(SAVE_KEY)).coins,1234);
 assert.equal(JSON.parse(data.get(PREVIEW_SAVE_KEY)).coins,1284);
 assert.equal(data.get('little-links.session'),'untouched');
 assert.equal(new LocalSaveRepository(previewStorage(storage)).load().coins,1284);
});
test('localhost cloud starts no polling, restores no live session, and makes no network writes',async()=>{
 const previous=globalThis.location;globalThis.location={hostname:'127.0.0.1'};
 let network=0;const originalFetch=globalThis.fetch;globalThis.fetch=()=>{network++;throw Error('Unexpected network');};
 try{
  const cloud=new GolfCloud({progress:{repository:{}}});
  assert.equal(cloud.localPreview,true);assert.equal(cloud.session,null);assert.equal(cloud.timer,undefined);
  await cloud.ensureGuest();await cloud.logout();
  await assert.rejects(cloud.call('start_round'),/local preview/);
  await assert.rejects(cloud.call('login'),/local preview/);
  await cloud.restore();await cloud.refresh();
  await assert.rejects(cloud.rankings('golf',0),/local preview/);
  await assert.rejects(cloud.rankings('golf',0,'elo'),/local preview/);
  await assert.rejects(cloud.rest('golf_records'),/local preview/);
  assert.equal(network,0);
 }finally{globalThis.location=previous;globalThis.fetch=originalFetch;}
 for(const host of ['localhost','127.0.0.1','[::1]'])assert.ok(isLocalPreview({hostname:host}));
 for(const host of ['littlelinks.study','polygolf.lol','example.com'])assert.equal(isLocalPreview({hostname:host}),false);
});
test('local course launches keep local rewards and allow testing all courses without a cloud round',async()=>{
 let started,progressed;
 const ui={mode:'golf',items:[],cloud:{localPreview:true},progress:{data:{equipment:{}},startRound:v=>progressed=v},
  game:{start:(...args)=>started=args},world:{equip(){}},audio:{start(){}},closeModal(){}};
 installLocalPreview(ui);await ui.launch(1,false);
 assert.equal(ui.localPreview,true);assert.equal(progressed,false);
 assert.deepEqual(started,[1,false,{mode:'golf',round:{localPreview:true}}]);
 await ui.launch(2,true);assert.equal(started[1],true);
});
