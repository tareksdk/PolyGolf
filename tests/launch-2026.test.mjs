import test,{mock} from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';
import {HALLOWEEN_END,halloweenActive} from '../dist/src/season.js';
import {availableLockers,openLocker} from '../dist/src/pro-shop.js';
import {rollRoundLocker} from '../dist/src/round-rewards.js';
mock.timers.enable({apis:['Date'],now:Date.parse('2026-10-15T12:00:00Z')});
import {GameManager,chargePower} from '../dist/src/game.js';
import {getGolfHole,terrainHeight,coastBounds,coastWaterLevel} from '../dist/src/golf-courses.js';
import {pumpkinFor,hitsPumpkin} from '../dist/src/course-features.js';
import {GolfPhysics} from '../dist/src/golf-physics.js';
import {verifyHole} from '../dist/src/replay.js';
import {defaultSave,ProgressionManager,DAILY_REWARDS} from '../dist/src/save.js';
import {ITEMS,shopRotation} from '../dist/src/catalog.js';
import {LOCKERS,lockerContents,rollLocker} from '../dist/src/pro-shop.js';
import {homeMessage} from '../dist/src/online-activity.js';
import {socialRewards} from '../dist/src/social-view.js';
import {buildBackdrop} from '../dist/src/golf-environment.js';
import * as THREE from '../dist/vendor/three.module.js';

function game(mode){const keys={},pointer={};globalThis.window={addEventListener:(k,f)=>keys[k]=f};globalThis.document={activeElement:{tagName:'CANVAS'},addEventListener(){}};const world={canvas:{addEventListener:(k,f)=>pointer[k]=f,setPointerCapture(){}},equipment:{},settings:{},load(){},setAim(){},update(){},hit(){},beginSwing(){},pointerToWorld:()=>({x:0,z:-100})};const g=new GameManager(world);g.start(0,true,{mode});return {g,keys,pointer};}
test('mouse power release never shoots; second click selects direction, locks power and fires once',()=>{
 for(const mode of ['golf','mini']){const {g,pointer}=game(mode),e={button:0,pointerId:1};
 pointer.pointerdown(e);g.update(.8);assert.equal(g.shotPhase,'power');const power=g.power;
 pointer.pointerup(e);assert.equal(g.shotPhase,'direction');assert.equal(g.strokes,0);assert.equal(g.pendingSwing,null);
 g.update(.3);assert.equal(g.power,power);assert.notEqual(g.accuracy,0);
 pointer.pointerdown(e);pointer.pointerup(e);g.update(.6);assert.equal(g.strokes,1);assert.equal(g.transcript.length,1);assert.equal(g.transcript[0].power,power);
 }
});
test('both stages bounce and interruption or a held key cannot release an unintended shot',()=>{
 const {g,keys}=game('golf'),e={code:'Space',preventDefault(){}};keys.keydown(e);g.update(1.65);assert.equal(g.power,1);g.update(.5);assert.ok(g.power<1);
 keys.keyup(e);g.update(.55);assert.ok(Math.abs(g.accuracy-1)<.0001);g.update(.55);assert.ok(Math.abs(g.accuracy)<.0001);g.update(.55);assert.ok(Math.abs(g.accuracy+1)<.0001);
 keys.keydown({...e,repeat:true});assert.equal(g.pendingSwing,null);g.pause();keys.keyup(e);g.pause();assert.equal(g.shotPhase,'aim');assert.equal(g.charging,false);assert.equal(g.strokes,0);
 keys.keydown({code:'Enter',preventDefault(){}});assert.equal(g.pendingSwing,null);
});
test('pumpkin is unique to Autumn hole one, under a tree beside the fairway, and swept hit detection avoids tunnelling',()=>{
 const h=getGolfHole(2,0),p=pumpkinFor(h);assert.ok(p);assert.equal(Math.round(Math.hypot(p.x-p.tree.x,p.z-p.tree.z)*10),24);
 assert.equal(p.y,terrainHeight(h,p.x,p.z));assert.ok(h.trees.includes(p.tree));
 assert.ok(hitsPumpkin(p,{x:p.x-8,y:p.y+.6,z:p.z},{x:p.x+8,y:p.y+.6,z:p.z}));
 assert.ok(!hitsPumpkin(p,{x:p.x-8,y:p.y+5,z:p.z},{x:p.x+8,y:p.y+5,z:p.z}));
 for(const [c,i] of [[0,0],[1,0],[2,1],[2,2]])assert.equal(pumpkinFor(getGolfHole(c,i)),null);
 assert.equal(pumpkinFor({...h,custom:true}),null);
 const physics=new GolfPhysics();physics.load(h);physics.ball={x:p.x-1.4,y:p.y+.65,z:p.z,vx:30,vy:0,vz:0};physics.active=true;physics.airborne=true;
 for(let i=0;i<10;i++)physics.update(1/120);assert.equal(physics.pumpkinHit,true);assert.equal(physics.events.filter(e=>e==='pumpkin').length,1);
});
test('discovery reward is one-time and rejects a replay that never hit the pumpkin',()=>{
 const p=new ProgressionManager({load:()=>defaultSave(),save:()=>true});assert.equal(p.discoverPumpkin(),true);const before=JSON.stringify(p.data);assert.equal(p.discoverPumpkin(),false);assert.equal(JSON.stringify(p.data),before);
 for(const id of ['ball-pumpkin-find','nameplate-pumpkin-find'])assert.equal(p.data.owned.filter(i=>i===id).length,1);
 const shot={kind:'shot',tick:0,dx:0,dz:-1,power:.1,club:'putter',shape:0,spin:0};assert.throws(()=>verifyHole({mode:'golf',course:2,equipment:defaultSave().equipment},0,[shot],10,{featureOnly:'pumpkin'}),/did not hit the pumpkin/);
});
test('Halloween odds total 100 with a real pool for every rarity; exclusives never appear in rotations',()=>{
 const pack=LOCKERS.find(p=>p.id==='halloween');assert.equal(Object.values(pack.odds).reduce((a,b)=>a+b,0),100);
 for(const row of lockerContents(pack.id)){assert.ok(row.items.length);assert.ok(row.items.every(i=>i.crate==='halloween'&&i.source==='pack'));}
 for(let n=0;n<1000;n++)assert.equal(rollLocker('halloween',n/1000,.5).crate,'halloween');
 const r=shopRotation();assert.ok([...r.daily,...r.weekly,...r.featured,...r.permanent].every(i=>!['nameplate-og','nameplate-staff','nameplate-developer'].includes(i.id)&&i.crate!=='halloween'));
 assert.equal(ITEMS.length,646);
});
test('daily reward display source matches actual payouts, including cycle restart and no double claim',()=>{
 const p=new ProgressionManager({load:()=>defaultSave(),save:()=>true});for(let i=0;i<7;i++){const date=new Date(Date.UTC(2026,9,5+i));assert.equal(p.claimLogin(date).coins,DAILY_REWARDS[i]);assert.equal(p.claimLogin(date),null);}assert.ok(p.data.owned.includes('ball-streak'));assert.equal(p.claimLogin(new Date('2026-10-12')).coins,300);
});
test('splash text is optional, size is bounded and arbitrary CSS is not accepted',()=>{
 assert.equal(homeMessage({home_message:'  '}).text,'');assert.equal(homeMessage({home_message:'Hello',home_message_color:'url(bad)',home_message_size:1000}).color,'#f1d982');assert.equal(homeMessage({home_message_size:1000}).size,40);assert.equal(homeMessage({home_message_size:1}).size,12);assert.equal(homeMessage({home_message_color:'#12abEF'}).color,'#12abEF');
});
test('home rotation accepts zero, signed and fractional angles, with a safe default and bounds',()=>{
 assert.equal(homeMessage({}).rotation,-3);
 for(const angle of [0,-12,15,2.5])assert.equal(homeMessage({home_message_rotation:angle}).rotation,angle);
 assert.equal(homeMessage({home_message_rotation:999}).rotation,180);
 assert.equal(homeMessage({home_message_rotation:-999}).rotation,-180);
 for(const angle of [null,Infinity,'rotate(20deg)'])assert.equal(homeMessage({home_message_rotation:angle}).rotation,-3);
});
test('community rewards contains all four direct links and no second-page button',()=>{
 const html=socialRewards({progress:{data:defaultSave()},cloud:{session:{}}});assert.equal((html.match(/data-action="visit-social"/g)||[]).length,4);assert.ok(html.includes('discord.gg/VCEvxCfF6m'));assert.ok(!html.includes('View community rewards'));assert.ok(!html.includes('<main'));
});
test('coastal cliff bands share every seam vertex and finish below the ocean',()=>{
 const h=getGolfHole(1,0),outline=[];for(let z=100;z>=-h.length-120;z-=2)outline.push([coastBounds(h,z)[1],terrainHeight(h,coastBounds(h,z)[1],z),z]);
 const w={coastOutline:outline,group:new THREE.Group(),mat:(color,extra)=>new THREE.MeshStandardMaterial({color,...extra})};buildBackdrop(w,h);
 const cliffs=w.group.children.find(m=>m.geometry.getAttribute('color')),v=cliffs.geometry.getAttribute('position'),point=i=>[v.getX(i),v.getY(i),v.getZ(i)];
 for(let band=0;band<2;band++)for(let i=0;i<outline.length;i++){assert.deepEqual(point((band*outline.length+i)*6+2),point(((band+1)*outline.length+i)*6));assert.deepEqual(point((band*outline.length+i)*6+4),point(((band+1)*outline.length+i)*6+1));}
 for(let i=0;i<outline.length;i++){assert.ok(point((2*outline.length+i)*6+2)[1]<coastWaterLevel(h));assert.ok(Math.abs(point(i*6)[0]-outline[i][0])<.0001);}
 w.group.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
});

test('a real tee shot reaches the pumpkin and survives authoritative replay verification',()=>{
 const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/pumpkin-shot.json',import.meta.url)));
 const result=verifyHole({mode:'golf',course:2,equipment:defaultSave().equipment},0,fixture.commands,fixture.endTick,{featureOnly:'pumpkin'});
 assert.equal(result.pumpkinHit,true);assert.equal(result.strokes,1);assert.equal(result.pirateHit,false);
});
test('Halloween ends at midnight November 1: no new purchases, drops or discovery, and earned inventory stays usable',()=>{
 assert.equal(halloweenActive(HALLOWEEN_END-1),true);assert.equal(halloweenActive(HALLOWEEN_END),false);
 assert.equal(halloweenActive(Date.parse('2027-10-15')),false);
 assert.equal(pumpkinFor(getGolfHole(2,0),HALLOWEEN_END),null);
 assert.ok(!availableLockers(HALLOWEEN_END).some(p=>p.id==='halloween'));
 const p=new ProgressionManager({load:()=>defaultSave(),save:()=>true});p.data.coins=100000;
 assert.equal(p.discoverPumpkin(HALLOWEEN_END),false);
 assert.throws(()=>openLocker(p,'halloween','expired-request-0001',()=>.5,HALLOWEEN_END),/event has ended/);
 p.data.lockers={halloween:1};const receipt=openLocker(p,'halloween','earned-request-0001',()=>.5,HALLOWEEN_END);
 assert.ok(p.data.owned.includes(receipt.item));assert.equal(p.data.coins,100000);p.equip(receipt.item);assert.ok(Object.values(p.data.equipment).includes(receipt.item));
 const r={mode:'golf',strokes:[4,4,4]};for(let n=0;n<100;n++){let i=0;const drop=rollRoundLocker(r,()=>i++?n/100:0,HALLOWEEN_END);assert.notEqual(drop,'halloween');}
});
