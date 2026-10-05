import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultSave} from '../dist/src/save.js';
import {ITEMS} from '../dist/src/catalog.js';
import {tradeable,exchangeItems,validateOffer,MAX_TRADE_COINS} from '../dist/src/trades.js';
import {caddieItems,CADDIE_RARITIES} from '../dist/src/caddie-collection.js';
import {directionAccuracy,GameManager} from '../dist/src/game.js';
import {previewTask,ShotPreview} from '../dist/src/shot-preview.js';
import {getGolfHole} from '../dist/src/golf-courses.js';
import {GolfPhysics} from '../dist/src/golf-physics.js';
import {lockerMotion} from '../dist/src/locker-motion.js';
import {installTrails} from '../dist/src/trails.js';
import * as THREE from '../dist/vendor/three.module.js';

test('coins buy an item with no item required on the paying side; balances are conserved',()=>{
 const a=defaultSave(),b=defaultSave(),item=ITEMS.find(i=>tradeable(i)&&!i.finish);
 a.coins=5000;b.coins=1200;b.owned.push(item.id);const original=structuredClone([a,b]);
 const result=exchangeItems(a,b,[],[{id:item.id}],3000,0);
 assert.equal(result.sender.coins,2000);assert.equal(result.receiver.coins,4200);assert.equal(result.sender.coins+result.receiver.coins,6200);
 assert.ok(result.sender.owned.includes(item.id));assert.ok(!result.receiver.owned.includes(item.id));assert.deepEqual([a,b],original);
});
test('coin values reject invalid, unaffordable and empty offers without mutating state',()=>{
 const a=defaultSave(),b=defaultSave();a.coins=b.coins=5000;const original=structuredClone([a,b]);
 for(const value of [-1,.5,NaN,Infinity,'100',MAX_TRADE_COINS+1,5001])assert.throws(()=>exchangeItems(a,b,[],[],value,1));
 assert.throws(()=>validateOffer([],a,0),/add coins/);
 assert.throws(()=>exchangeItems(a,b,[],[],6000,6000),/enough coins/);
 a.coins=Number.MAX_SAFE_INTEGER;assert.throws(()=>exchangeItems(a,b,[],[],1,5),/balance limit/);a.coins=5000;
 assert.deepEqual([a,b],original);
});
test('caddie combines category, ownership, rarity, favorites, word search and stable sorting',()=>{
 const data=defaultSave();data.owned=ITEMS.map(i=>i.id);data.favorites=ITEMS.filter(i=>i.category==='ball').slice(0,20).map(i=>i.id);
 const before=JSON.stringify(data),found=caddieItems(data,{query:'CASE hardened'});
 assert.ok(found.length);assert.ok(found.every(i=>i.name.toLowerCase().includes('case hardened')&&i.category==='ball'));
 const favored=caddieItems(data,{favorites:true,rarity:'Rare'});assert.ok(favored.every(i=>data.favorites.includes(i.id)&&i.rarity==='Rare'));
 const sorted=caddieItems(data,{sort:'rarity-desc'});for(let i=1;i<sorted.length;i++)assert.ok(CADDIE_RARITIES.indexOf(sorted[i-1].rarity)>=CADDIE_RARITIES.indexOf(sorted[i].rarity));
 const recent=caddieItems(data,{sort:'recent'});assert.equal(recent[0].id,ITEMS.filter(i=>i.category==='ball').at(-1).id);
 assert.equal(caddieItems(data,{query:'not-an-item'}).length,0);assert.equal(JSON.stringify(data),before);
 data.owned=[];assert.equal(caddieItems(data).length,0);assert.ok(caddieItems(data,{showAll:true}).length>0);
});
test('direction meter reverses continuously on a slower 2.2-second cycle',()=>{
 for(const [t,v] of [[0,0],[.55,1],[1.1,0],[1.65,-1],[2.2,0]])assert.ok(Math.abs(directionAccuracy(t)-v)<1e-10);
 for(let t=0;t<10;t+=1/60)assert.ok(Math.abs(directionAccuracy(t+1/60)-directionAccuracy(t))<.048);
});
test('a click locks the direction that was last displayed, not an unseen later update',()=>{
 const savedWindow=globalThis.window,savedDocument=globalThis.document;
 globalThis.window={addEventListener(){}};globalThis.document={addEventListener(){},activeElement:{tagName:'CANVAS'}};
 try{
  const w={canvas:{addEventListener(){}},equipment:{},load(){},setAim(){},update(){},beginSwing(){}};
  const g=new GameManager(w);g.start(0,true,{mode:'golf'});g.beginPower();g.lockPower();
  g.displayedAccuracy=0;g.accuracy=.9;const aim={...g.direction};g.shoot();assert.deepEqual(g.pendingSwing.dir,aim);
 }finally{globalThis.window=savedWindow;globalThis.document=savedDocument;}
});
test('skipping before or during the reel finishes presentation once and cancels follow-up waits',async()=>{
 for(const before of [true,false]){
  const motion=lockerMotion();let finishes=0;const animation={playState:'running',finish(){finishes++;this.playState='finished';}};
  if(before)motion.skip();motion.animate(animation);if(!before)motion.skip();motion.skip();
  assert.equal(finishes,1);assert.equal(motion.skipped,true);
  const result=await Promise.race([motion.wait(10000).then(()=>true),new Promise(r=>setTimeout(()=>r(false),30))]);assert.equal(result,true);
  assert.equal(await motion.race(new Promise(()=>{})),undefined);
 }
});
test('chunked shot guides match fixed-step physics for putts and drives on all three courses',()=>{
 for(let c=0;c<3;c++)for(const club of ['putter','driver']){
  const h=getGolfHole(c,0),g=new GolfPhysics();g.load(h);const ball={...g.ball},dir={x:0,z:-1},options={club,shape:.2,spin:.1};
  const task=previewTask(h,ball,dir,.7,options);let chunks=0;while(!task.step(17)){assert.ok(++chunks<300);}
  g.shoot(dir.x,dir.z,.7,options);const points=[];
  for(let t=0;t<4200&&g.active;t++){g.update(1/120);if(t%(club==='putter'?8:12)===0)points.push(g.ball.x,g.ball.y,g.ball.z);if(g.events.includes('water')||g.sunk)break;}
  assert.deepEqual(task.result(),new Float32Array(points));
 }
});
test('shot preview coalesces queued requests and discards results from an old hole',()=>{
 const original=globalThis.Worker,posted=[],received=[];let worker;
 globalThis.Worker=class{constructor(){worker=this;}postMessage(value){posted.push(value);}terminate(){}};
 try{
  const p=new ShotPreview((points,job)=>received.push(job.power)),h=getGolfHole(0,0),ball={x:0,y:0,z:0},dir={x:0,z:-1};
  p.request(h,ball,dir,.1,{club:'putter'});p.request(h,ball,dir,.2,{club:'putter'});p.request(h,ball,dir,.3,{club:'putter'});
  assert.equal(posted.length,1);worker.onmessage({data:{id:posted[0].id,points:new Float32Array([1,2,3])}});
  assert.equal(posted.length,2);assert.equal(posted[1].power,.3);assert.equal(posted[1].hole,undefined);
  p.reset();worker.onmessage({data:{id:posted[1].id,points:new Float32Array([1,2,3])}});assert.deepEqual(received,[.1]);
 }finally{globalThis.Worker=original;}
});
test('caddie ribbon is continuous with particles disabled and disappears for no-trail equipment',()=>{
 const world={scene:new THREE.Scene(),mode:'garage',trailColor:'#57bea8',hole:{mode:'golf'},settings:{particles:false},ball:{position:new THREE.Vector3(0,1,0)},camera:{position:new THREE.Vector3(0,4,10)},clock:1};
 installTrails(world);world.updateRibbon(1/60);const ribbon=world.scene.children[0],positions=ribbon.geometry.attributes.position.array;
 assert.equal(ribbon.visible,true);assert.equal(ribbon.geometry.drawRange.count,47*6);assert.ok([...positions].every(Number.isFinite));
 const snapshot=positions.slice();world.clock+=1;world.updateRibbon(1/60);assert.notDeepEqual(positions,snapshot);
 world.trailColor=null;world.updateRibbon(1/60);assert.equal(ribbon.visible,false);
 ribbon.geometry.dispose();ribbon.material.dispose();
});
