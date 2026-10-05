import test from 'node:test';
import assert from 'node:assert/strict';
import {cupCapture} from '../dist/src/cup-capture.js';
import {getGolfHole,terrainHeight} from '../dist/src/golf-courses.js';
import {verifyHole} from '../dist/src/replay.js';
import {pirateShipFor,hitsPirateShip} from '../dist/src/course-features.js';
import {defaultSave,ProgressionManager} from '../dist/src/save.js';
import {awardRankPlates} from '../dist/src/ranks.js';
import {MEMBER_COLLECTION,memberRotation,buyMemberItem,PASS_TIERS,claimTier} from '../dist/src/equipment.js';
import {ITEMS} from '../dist/src/catalog.js';
import {notificationSections} from '../dist/src/notifications.js';
const pm=()=>new ProgressionManager({load:()=>defaultSave(),save:()=>true});
test('cup captures moderate centre putts, rejects missiles and wide misses, and sweeps between ticks',()=>{
 const cup={x:0,z:0},a={x:0,z:.4},b={x:0,z:-.4,vx:0,vz:-3.4};
 assert.ok(cupCapture(a,b,cup,.245,4.2));assert.ok(!cupCapture(a,{...b,vz:-12},cup,.245,4.2));
 assert.ok(!cupCapture({...a,x:.4},{...b,x:.4},cup,.245,4.2));
 assert.ok(cupCapture({...a,x:.18},{...b,x:.18,vz:-.8},cup,.245,4.2));
});
test('a real Saltwind tee shot reaches the pirate ship and is replay-verifiable',()=>{
 const round={mode:'golf',course:1,equipment:defaultSave().equipment};
 const shot={kind:'shot',tick:0,dx:.5527052028734385,dz:-.8333768407609076,power:.9950000000000006,club:'7i',shape:0,spin:0};
 assert.ok(verifyHole(round,0,[shot],952,{featureOnly:true}).pirateHit);
 assert.throws(()=>verifyHole(round,0,[shot],200,{featureOnly:true}),/did not hit/);
 assert.throws(()=>verifyHole({...round,course:0},0,[shot],952,{featureOnly:true}),/did not hit/);
 const h=getGolfHole(1,0),s=pirateShipFor(h);assert.ok(s&&s.y<0);assert.equal(pirateShipFor({...h,custom:true}),null);
 assert.equal(hitsPirateShip(s,{x:0,y:100,z:0},{x:1,y:99,z:0}),false);
});
test('pirate rewards grant the skull ball and plate once with saved progress',()=>{
 const p=pm(),before=p.data.coins;assert.equal(p.discoverPirate(),true);assert.equal(p.discoverPirate(),false);
 assert.equal(p.data.coins,before+350);assert.ok(p.data.owned.includes('ball-pirate'));assert.ok(p.data.owned.includes('nameplate-pirate'));
 const again=new ProgressionManager({load:()=>structuredClone(p.data),save:()=>true});assert.equal(again.discoverPirate(),false);
});
test('rank nameplates require a completed match and survive relegation',()=>{
 const p=pm();assert.equal(awardRankPlates(p,{elo:1000,matches:0,wins:0,losses:0}),false);
 assert.ok(awardRankPlates(p,{elo:1920,matches:8,wins:8,losses:0}));assert.ok(p.data.owned.includes('nameplate-rank-elite'));
 awardRankPlates(p,{elo:1800,matches:9,wins:8,losses:1});assert.equal(p.data.competitive.peak,1920);assert.ok(p.data.owned.includes('nameplate-rank-elite'));
});
test('30 tiers each grant one member item, and claiming repairs missing equipment once',()=>{
 const p=pm();p.data.xp=180000;p.data.clubPass={version:2,member:true,claimed:[],premiumClaimed:[]};
 for(const t of PASS_TIERS)claimTier(p,t.tier);
 assert.equal(PASS_TIERS.length,30);assert.equal(ITEMS.filter(i=>i.source==='membership').length,78);
 assert.ok(PASS_TIERS.every(t=>t.items.length===1&&p.data.owned.includes(t.item)));assert.ok(MEMBER_COLLECTION.every(i=>!p.data.owned.includes(i.id)));
 const before=p.data.coins,t=PASS_TIERS[1];p.data.owned=p.data.owned.filter(id=>id!==t.items[0]);claimTier(p,t.tier);
 assert.equal(p.data.coins,before);assert.throws(()=>claimTier(p,t.tier),/Already/);
});
test('bunker terrain is visibly depressed without changing the surrounding course',()=>{
 const h=getGolfHole(0,0),b=h.bunkers[0],plain={...h,bunkers:[]};
 assert.ok(terrainHeight(plain,b.x,b.z)-terrainHeight(h,b.x,b.z)>1.3);
 assert.ok(Math.abs(terrainHeight(h,b.x+b.rx*1.1,b.z)-terrainHeight(plain,b.x+b.rx*1.1,b.z))<1e-9);
});
test('member collection requires membership and coins and retains bought and legacy rewards',()=>{
 const p=pm(),item=memberRotation()[0];p.data.coins=100000;
 assert.throws(()=>buyMemberItem(p,item.id),/Join/);
 p.data.clubPass.member=true;buyMemberItem(p,item.id);const balance=p.data.coins;
 assert.throws(()=>buyMemberItem(p,item.id),/Already/);assert.equal(p.data.coins,balance);
 const again=new ProgressionManager({load:()=>structuredClone(p.data),save:()=>true});assert.ok(again.data.owned.includes(item.id));
 assert.throws(()=>buyMemberItem(p,PASS_TIERS[0].item),/tiers/);
 assert.throws(()=>buyMemberItem(p,MEMBER_COLLECTION.find(i=>!memberRotation().includes(i)).id),/week/);p.data.coins=0;assert.throws(()=>buyMemberItem(p,memberRotation()[1].id),/coins/);
});
test('section notifications clear after rewards are claimed and new friends are viewed',()=>{
 const p=pm();p.data.xp=6000;const ui={progress:p,friendsData:{friends:[{id:'friend'}],incoming:[]}};
 let f=notificationSections(ui,{friends:[]});assert.ok(f.friends&&f['club-pass']);
 claimTier(p,1);f=notificationSections(ui,{friends:['friend']});assert.equal(f.friends,false);assert.equal(f['club-pass'],false);
 ui.friendsData.incoming=[{id:'request'}];assert.ok(notificationSections(ui,{friends:['friend']}).friends);
 const seen={owned:[...p.data.owned]};p.data.owned.push('ball-pirate');assert.ok(notificationSections(ui,seen).garage);
});
