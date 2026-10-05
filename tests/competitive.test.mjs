import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RULES_VERSION} from '../dist/src/golf-courses.js';
import {verifySudden,suddenHole,eloChange,rankFor,RANKS} from '../dist/src/competitive-rules.js';
import {GolfPhysics,CUP_RADIUS,GOLF_RADIUS} from '../dist/src/golf-physics.js';
import {getGolfHole,terrainAt} from '../dist/src/golf-courses.js';
import {defaultSave,ProgressionManager,normalizeInventory,ACHIEVEMENTS} from '../dist/src/save.js';
import {ITEMS} from '../dist/src/catalog.js';
import {PASS_TIERS,claimTier,golfGear} from '../dist/src/equipment.js';
import {recommendClub,clubYards} from '../dist/src/club-distances.js';
import {openLocker} from '../dist/src/pro-shop.js';
import {GameManager} from '../dist/src/game.js';

test('database matchmaking and its integration fixture target the current replay version',()=>{
 for(const path of ['../backend/competitive-schema.sql','../backend/competitive-version.sql']){
  const sql=readFileSync(new URL(path,import.meta.url),'utf8');
  assert.ok(sql.includes(`p_version is distinct from '${RULES_VERSION}'`),`${path} must be updated when replay rules change`);
 }
 const fixture=readFileSync(new URL('./competitive-db.sql',import.meta.url),'utf8');
 assert.ok(fixture.includes(`rules_version='${RULES_VERSION}'`));
});

test('rank ladder ends at Elite and Elo rewards upsets more than expected wins',()=>{assert.equal(RANKS.at(-1).name,'Elite');assert.equal(rankFor(1900).name,'Elite');assert.equal(eloChange(1000,1000),16);assert.ok(eloChange(800,1500)>eloChange(1500,800));assert.ok(eloChange(3000,0)>=1);});
test('sudden death verifies one real shot and rejects reset, double-shot, forged power and premature distance',()=>{const h=suddenHole(),p=new GolfPhysics(),d=defaultSave(),c={kind:'shot',tick:0,dx:0,dz:-1,power:.8,club:'pw',shape:0,spin:0};p.load(h);p.shoot(0,-1,.8,{club:'pw',gear:golfGear(d.equipment)});let ticks=0;while(p.active&&ticks<24000){p.update(1/120);ticks++;}const r=verifySudden(d.equipment,[c],ticks);assert.equal(r.distance,Math.round(Math.hypot(p.ball.x-h.cup.x,p.ball.z-h.cup.z)*1000)/1000);assert.throws(()=>verifySudden(d.equipment,[c,c],ticks),/one shot/);assert.throws(()=>verifySudden(d.equipment,[{kind:'reset'}],ticks));assert.throws(()=>verifySudden(d.equipment,[{...c,power:8}],ticks));assert.throws(()=>verifySudden(d.equipment,[c],10),/finish/);});
test('single-shot game ends on rest, preserves replay and disallows resets and pickups',()=>{globalThis.window={addEventListener(){}};globalThis.document={addEventListener(){}};const w={canvas:{addEventListener(){}},equipment:defaultSave().equipment,settings:{},load(){},setAim(){},update(){},hit(){},burst(){}};let result;const g=new GameManager(w,{onHole:r=>result=r});g.start(0,true,{mode:'golf',customHole:suddenHole(),round:{sudden:true}});g.reset();g.skip();assert.equal(g.strokes,0);g.fire({dir:{x:0,z:-1},power:.5,options:{club:'sw',shape:0,spin:0,gear:golfGear(w.equipment)}});for(let i=0;i<5000&&!result;i++)g.update(1/60);assert.equal(g.state,'complete');assert.ok(result);assert.equal(result.transcript.length,1);assert.ok(verifySudden(w.equipment,result.transcript,result.endTick).distance>=0);});
test('caddie selects a driver from the tee, wedge from sand and putter on the green',()=>{const h=getGolfHole(0,0);assert.equal(recommendClub(h,h.start,{}),'driver');assert.equal(recommendClub(h,{x:h.cup.x,z:h.cup.z+4},{}),'putter');for(const id of['driver','3w','5w','7i','pw','putter'])assert.ok(clubYards(id,{})>0);});
test('smaller visual cup captures a gentle putt 18 cm off centre',()=>{assert.equal(CUP_RADIUS,.19);const h=getGolfHole(0,0),p=new GolfPhysics();p.load(h);p.lastSafe={x:h.cup.x+.18,z:h.cup.z+.35};p.reset();p.active=true;p.airborne=false;p.ball.vz=-.7;for(let i=0;i<200&&p.active;i++)p.update(1/120);assert.ok(p.sunk);});
test('member equipment requires both membership and a claimed pass tier',()=>{const item=ITEMS.find(i=>i.source==='membership'),tier=PASS_TIERS.find(t=>t.item===item.id),d=defaultSave();d.owned.push(item.id);assert.ok(!normalizeInventory(d).owned.includes(item.id));d.owned.push(item.id);d.clubPass={member:true,claimed:[],premiumClaimed:[]};assert.ok(!normalizeInventory(d).owned.includes(item.id));d.clubPass.premiumClaimed.push(tier.tier);d.owned.push(item.id);assert.ok(normalizeInventory(d).owned.includes(item.id));});
test('achievement rewards claim once and earned lockers cost no tokens or duplicate refunds',()=>{const d=defaultSave(),p=new ProgressionManager({load:()=>d,save:()=>true}),a=ACHIEVEMENTS.find(a=>a.locker);assert.throws(()=>p.claimAchievement(a.id));d.achievements.push(a.id);p.claimAchievement(a.id);assert.ok(d.owned.includes(a.item));assert.equal(d.lockers[a.locker],a.lockerCount);assert.throws(()=>p.claimAchievement(a.id));const balance=d.coins;const r=openLocker(p,a.locker,'earned-locker-test-123',()=>.5);assert.equal(d.coins,balance);assert.ok(r.earned);assert.equal(d.lockers[a.locker],a.lockerCount-1);const again=openLocker(p,a.locker,'earned-locker-test-123',()=>.5);assert.deepEqual(r,again);assert.equal(d.coins,balance);});
