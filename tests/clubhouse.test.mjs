import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {ITEMS,CATEGORIES,ALPHA_ITEMS,shopRotation} from '../dist/src/catalog.js';
import {MEMBER_COLLECTION,buyMemberItem,PASS_TIERS,claimTier,tierClaimed} from '../dist/src/equipment.js';
import {defaultSave,ProgressionManager} from '../dist/src/save.js';
import {courseRecordKey,getGolfHole,golfHoleCount,pathDistance} from '../dist/src/golf-courses.js';
import {nearbyTrees} from '../dist/src/forest.js';
import {fairwayWidth} from '../dist/src/golf-courses.js';
import {GameManager} from '../dist/src/game.js';
import {createGolfer} from '../dist/src/golfer.js';

test('635 distinct items cover every category, with seven Alpha, seven Black Market items and 13 novelty clubs',()=>{
 assert.equal(ITEMS.length,635);assert.equal(new Set(ITEMS.map(i=>i.id)).size,635);assert.equal(new Set(ITEMS.map(i=>i.name)).size,635);
 const novelty=ITEMS.filter(i=>i.added==='polygolf-1');assert.equal(novelty.length,13);
 for(const c of CATEGORIES)assert.equal(ITEMS.filter(i=>i.category===c.id&&!['achievement','competitive','founder','code'].includes(i.source)&&i.crate!=='halloween'&&!novelty.includes(i)).length,['ball','club','driver'].includes(c.id)?86:80);
 assert.ok(novelty.every(i=>['club','driver'].includes(i.category)&&(i.source==='permanent'?i.price>0&&!i.exclusive:i.source==='pack'&&i.crate==='oddities'&&i.exclusive&&!i.price)));
 assert.equal(ALPHA_ITEMS.length,7);assert.equal(ITEMS.filter(i=>i.rarity==='Black Market').length,7);
 const rewards=PASS_TIERS.flatMap(t=>t.items);assert.equal(rewards.length,30);
 assert.deepEqual(new Set([...rewards,...MEMBER_COLLECTION.map(i=>i.id)]),new Set(ITEMS.filter(i=>i.source==='membership').map(i=>i.id)));
 for(let day=0;day<40;day++){const r=shopRotation(new Date(Date.UTC(2026,8,1+day)));assert.ok([...r.daily,...r.weekly,...r.featured].every(i=>i.source==='daily'||i.source==='weekly'));assert.ok(r.permanent.length===3&&r.permanent.every(i=>i.source==='permanent'));}
});

test('old completed member tiers retain rewards and cannot repay currency',()=>{
 const d=defaultSave();d.xp=180000;d.clubPass={member:true,claimed:Array.from({length:100},(_,i)=>i+1),premiumClaimed:Array.from({length:100},(_,i)=>i+1)};
 d.owned.push(...ITEMS.filter(i=>i.source==='membership').map(i=>i.id));const p=new ProgressionManager({load:()=>d,save:()=>true}),before=d.coins;
 assert.equal(d.clubPass.version,3);assert.equal(d.clubPass.claimed.length,30);
 for(const t of PASS_TIERS){assert.ok(tierClaimed(p,t));assert.throws(()=>claimTier(p,t.tier));}
 assert.equal(d.coins,before);
});

test('three-hole personal bests preserve and do not compete with old eighteen-hole records',()=>{
 const d=defaultSave();d.bests['golf:0']={score:-18,time:999,strokes:54};const p=new ProgressionManager({load:()=>d,save:()=>true});
 p.completeCourse({mode:'golf',courseIndex:0,strokes:[4,3,5],time:300},[4,3,5]);assert.equal(d.bests[courseRecordKey('golf',0)].score,0);assert.equal(d.bests['golf:0'].score,-18);
});

test('dense forests preserve fairways and landmarks with spaced trunks on all fifteen holes',()=>{
 for(let c=0;c<3;c++)for(let index=0;index<golfHoleCount(c);index++){const h=getGolfHole(c,index);assert.ok(h.trees.length>(h.backdrop?500:c===1?1000:3000));for(let i=0;i<h.trees.length;i++){const t=h.trees[i];if(t.z<8&&t.z>-h.length-8)assert.ok(pathDistance(h,t.x,t.z)>=fairwayWidth(h,Math.max(0,Math.min(1,-t.z/h.length)))/2+9);assert.ok(Math.hypot(t.x+26,t.z-24)>=16);if(c===1)assert.ok(Math.hypot(t.x+105,t.z+h.length*.65)>=18);for(const p of nearbyTrees(h,t.x,t.z))if(t!==p)assert.ok(Math.hypot(t.x-p.x,t.z-p.z)>=4.8);}}
});

function game(){
 globalThis.window={addEventListener(){}};globalThis.document={addEventListener(){}};
 const world={canvas:{addEventListener(){}},equipment:{},settings:{},load(){},setAim(){},update(){},burst(){},celebrate(){this.celebrations=(this.celebrations||0)+1;},hit(){},beginSwing(){}};
 const results=[];return{world,results,g:new GameManager(world,{onHole:r=>results.push(r)})};
}
test('both modes show celebration for a full second; changing rounds cancels stale scorecards',()=>{
 for(const mode of['golf','mini']){const{g,world,results}=game();g.start(0,true,{mode});g.strokes=2;g.finishHole();assert.equal(world.celebrations,1);g.update(.6);g.update(.5);assert.equal(results.length,0);g.update(.06);assert.equal(results.length,1);g.update(1);assert.equal(results.length,1);
  g.loadHole(1);g.finishHole();g.leave();g.update(2);assert.equal(results.length,1);
 }
});
test('a shot fires at club impact and cannot be fired twice during the backswing',()=>{
 const{g}=game();g.start(0,true);g.shoot();assert.equal(g.strokes,0);g.beginPower();g.power=.85;g.lockPower();g.shoot();g.shoot();g.update(.5);assert.equal(g.strokes,0);assert.equal(g.physics.active,false);g.update(.07);assert.equal(g.strokes,1);assert.equal(g.physics.active,true);
});
test('articulated club head meets the ball at impact from every aiming direction',()=>{
 const geometries={box:new THREE.BoxGeometry(),cylinder:new THREE.CylinderGeometry(),round:new THREE.SphereGeometry()},material=new THREE.MeshBasicMaterial();
 const w={scene:new THREE.Scene(),geometries,mode:'play',hole:{mode:'golf'},renderGround:()=>0,mat:()=>material,mesh(geo,color,x,y,z,sx,sy,sz,parent){const m=new THREE.Mesh(geometries[geo],material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;}};
 const root=createGolfer(w),head=root.getObjectByName('club-impact-head');
 for(const club of['driver','putter'])for(const dir of[{x:0,z:-1},{x:1,z:0},{x:-.6,z:.8}]){const b={x:4,y:.07,z:-8};w.beginSwing(b,dir,club);w.updateGolfer(club==='putter'?.36:.56,b,{active:true});root.updateMatrixWorld(true);const p=head.getWorldPosition(new THREE.Vector3());assert.ok(Math.hypot(p.x-b.x,p.z-b.z)<.001);assert.ok(Math.abs(p.y-b.y)<.02);}
});
