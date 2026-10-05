import test, {mock} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import {defaultSave} from '../dist/src/save.js';
import {ITEMS,ALPHA_ITEMS,shopRotation,shopAvailable} from '../dist/src/catalog.js';
import {createHmac} from 'node:crypto';
import {PhysicsManager,FIXED_STEP} from '../dist/src/physics.js';
import {getHole,nearestPoint} from '../dist/src/courses.js';
import {miniStats} from '../dist/src/equipment.js';
import {RULES_VERSION} from '../dist/src/golf-courses.js';
import {newMap} from '../dist/src/maps.js';
import {newGolfMap} from '../dist/src/golf-maps.js';

// Seasonal positive cases remain reproducible after the event has ended.
mock.timers.enable({apis:['Date'],now:new Date('2026-10-15T12:00:00Z')});

// Execute the actual Edge handler, with all network I/O replaced by an in-memory service.
const players=new Map([['a',{id:'a',username:'local_a',revision:0,state:defaultSave()}],['b',{id:'b',username:'local_b',revision:0,state:defaultSave()}]]),maps=[];
let handler;
const rounds=new Map();let ratings=[];
globalThis.Deno={env:{get:k=>k==='SUPABASE_URL'?'https://local-supabase.invalid':'local-test-only'},serve:fn=>{handler=fn;}};
globalThis.fetch=async(raw,options={})=>{
 const url=new URL(raw);assert.equal(url.origin,'https://local-supabase.invalid','No external network is allowed in this test');
 const body=options.body?JSON.parse(options.body):null,path=url.pathname,method=options.method||'GET';
 const reply=(value,status=200)=>new Response(JSON.stringify(value),{status});
 if(path==='/auth/v1/user'){const id=options.headers.Authorization.slice(7);return players.has(id)?reply({id}):reply({message:'Unauthorized'},401);}
 if(path.endsWith('/rpc/golf_rate'))return reply(true);
 if(path.endsWith('/rpc/golf_ranked_join')){assert.equal(body.p_user,'a');assert.deepEqual(body.p_equipment,players.get('a').state.equipment);return reply({queued:true,rating:{elo:1000},match:null});}
 if(path.endsWith('/rpc/golf_commit')){const p=players.get(body.p_user);if(p.revision!==body.p_revision)return reply({message:'State changed. Refresh and try again.'},409);if(body.p_round){const r=rounds.get(body.p_round);if(r.next_hole!==body.p_hole||r.finished)return reply({message:'Already recorded'},409);r.holes.push(body.p_result);r.next_hole++;r.finished=body.p_result.finished;}p.state=body.p_state;p.revision++;return reply(p.revision);}
 if(path.endsWith('/golf_ratings')){assert.equal(url.searchParams.get('matches'),'gt.0');assert.equal(url.searchParams.get('order'),'elo.desc,wins.desc,user_id.asc');assert.equal(url.searchParams.get('limit'),'100');return reply(ratings);}
 if(path.endsWith('/golf_rounds')&&method==='GET'){const r=rounds.get(url.searchParams.get('id')?.slice(3));return reply(r&&r.user_id===url.searchParams.get('user_id')?.slice(3)?[structuredClone(r)]:[]);}
 if(path.endsWith('/golf_players')){if(url.searchParams.get('id')?.startsWith('in.(')){const ids=url.searchParams.get('id').slice(4,-1).split(',');return reply(ids.map(id=>players.get(id)).filter(Boolean).map(p=>structuredClone(p)));}const id=url.searchParams.get('id')?.slice(3),row=players.get(id);if(method==='PATCH'){Object.assign(row,body);return reply([row]);}if(!id)return reply([...players.values()].map(p=>structuredClone(p)));return reply(row?[structuredClone(row)]:[]);}
 if(path.endsWith('/golf_trades'))return reply([]);
 if(path.endsWith('/golf_friends'))return reply([]);
 if(path.endsWith('/golf_rounds')&&method==='POST')return reply([{...body,id:'round-test'}]);
 if(path.endsWith('/golf_public_maps')){
  if(method==='POST'){const row={...body,id:'map-'+maps.length};maps.push(row);return reply([row]);}
  const rows=maps.filter(m=>(!url.searchParams.has('user_id')||m.user_id===url.searchParams.get('user_id').slice(3))&&(!url.searchParams.has('id')||m.id===url.searchParams.get('id').slice(3)));
  if(method==='PATCH'){rows.forEach(m=>Object.assign(m,body));return reply(rows);}
  if(method==='DELETE'){rows.forEach(m=>maps.splice(maps.indexOf(m),1));return reply(rows);}
  return reply(rows);
 }
 throw Error('Unexpected service request: '+method+' '+url.pathname);
};
let source=await readFile(new URL('../backend/index.ts',import.meta.url),'utf8');source=source.replaceAll("'./shared/","'"+new URL('../dist/src/',import.meta.url).href);
let social=await readFile(new URL('../backend/social.ts',import.meta.url),'utf8');social=social.replaceAll("'./shared/","'"+new URL('../dist/src/',import.meta.url).href);
source=source.replace("'./social.ts'",JSON.stringify('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(social)).toString('base64')));
let competitive=await readFile(new URL('../backend/competitive.ts',import.meta.url),'utf8');competitive=competitive.replaceAll("'./shared/","'"+new URL('../dist/src/',import.meta.url).href);
source=source.replace("'./competitive.ts'",JSON.stringify('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(competitive)).toString('base64')));
let trading=await readFile(new URL('../backend/trading.ts',import.meta.url),'utf8');trading=trading.replaceAll("'./shared/","'"+new URL('../dist/src/',import.meta.url).href);
source=source.replace("'./trading.ts'",JSON.stringify('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(trading)).toString('base64')));
await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source)).toString('base64'));
async function call(action,data={},id='a'){const response=await handler(new Request('http://game.local',{method:'POST',headers:{'Content-Type':'application/json',...(id?{Authorization:'Bearer '+id}:{})},body:JSON.stringify({action,rulesVersion:RULES_VERSION,...data})}));const result=await response.json();if(!response.ok)throw Error(result.error);return result;}

test('staff codes award only their exact cosmetic nameplate once and reject altered codes and unsigned requests',async()=>{
 const p=players.get('a');p.state=defaultSave();p.revision=0;
 for(const [code,item] of [['4hjxh80f2jefndarn201mXa6','nameplate-developer'],['98fh2pbfesfvyqdnsanf2m10','nameplate-staff']]){
  await assert.rejects(call('redeem_code',{code:code.toUpperCase()}),/not active/);
  await assert.rejects(call('redeem_code',{code},null),/Sign in/);
  const coins=p.state.coins,replies=await Promise.allSettled([call('redeem_code',{code}),call('redeem_code',{code})]);
  assert.equal(replies.filter(r=>r.status==='fulfilled').length,1);assert.equal(p.state.owned.filter(id=>id===item).length,1);assert.equal(p.state.coins,coins);
 }
 assert.equal(p.state.owned.includes('nameplate-og'),false);
});
test('signup requires an affirmative age and terms acknowledgement before it can create an account',async()=>{
 await assert.rejects(call('signup',{username:'testplayer',password:'example123'},null),/Confirm the age/);
});
test('pumpkin claim checks the actual replay, round ownership and one-time inventory award',async()=>{
 const fixture=JSON.parse(await readFile(new URL('./fixtures/pumpkin-shot.json',import.meta.url),'utf8'));
 const p=players.get('a');p.state=defaultSave();p.revision=0;
 rounds.set('pumpkin-test',{id:'pumpkin-test',user_id:'a',mode:'golf',course:2,equipment:p.state.equipment,rules_version:RULES_VERSION,next_hole:0,finished:false,updated_at:new Date(Date.now()-60000).toISOString()});
 const payload={roundId:'pumpkin-test',index:0,transcript:fixture.commands,endTick:fixture.endTick};
 await assert.rejects(call('claim_pumpkin',payload,'b'),/Start an online round/);
 await assert.rejects(call('claim_pumpkin',{...payload,transcript:[{...fixture.commands[0],dx:0,dz:-1}]}),/did not hit/);
 const first=await call('claim_pumpkin',payload);assert.deepEqual(first.unlocked,['ball-pumpkin-find','nameplate-pumpkin-find']);const coins=p.state.coins;
 const retry=await call('claim_pumpkin',payload);assert.equal(retry.already,true);assert.equal(p.state.coins,coins);assert.equal(p.state.owned.filter(i=>i==='ball-pumpkin-find').length,1);
});
test('gift redemption uses the exact code and credits one million tokens once, including concurrent requests',{skip:!process.env.LITTLE_LINKS_TEST_CODE},async()=>{
 const code=process.env.LITTLE_LINKS_TEST_CODE,before=players.get('a').state.coins;
 await assert.rejects(call('redeem_code',{code:code.toLowerCase()}),/not active/);await assert.rejects(call('redeem_code',{code:'invalid'}),/not active/);await assert.rejects(call('redeem_code',{code},null),/Sign in/);
 const requests=await Promise.allSettled([call('redeem_code',{code}),call('redeem_code',{code})]);assert.equal(requests.filter(r=>r.status==='fulfilled').length,1);assert.equal(players.get('a').state.coins-before,1000000);
 await assert.rejects(call('redeem_code',{code}),/already redeemed/);
});
test('published maps derive ownership from auth and reject invalid layouts',async()=>{
 await assert.rejects(call('publish_map',{map:newMap()}),/level 10/);players.get('a').state.xp=10000;const {map}=await call('publish_map',{map:newMap(),user_id:'b'});assert.equal(map.user_id,'a');
 await call('unpublish_map',{id:map.id},'b');assert.equal(maps.length,1);
 await assert.rejects(call('publish_map',{map:{...newMap(),points:[[0,0],[0,0],[0,0]]}}),/adjacent/);
 await call('publish_map',{map:{...newMap(),width:7}});assert.equal(maps.length,1);assert.equal(maps[0].layout.width,7);
 await call('unpublish_map',{id:map.id});assert.equal(maps.length,0);
});

test('Alpha and all-item codes are case-sensitive, complete, atomic and one-time',async()=>{
 const p=players.get('b');p.state=defaultSave();p.revision=0;
 await assert.rejects(call('redeem_code',{code:'8hw2m7xp51vzx'},'b'),/not active/);
 const coins=p.state.coins,alpha=await call('redeem_code',{code:'8HW2M7XP51VZX'},'b');assert.equal(alpha.unlocked.length,7);assert.ok(ALPHA_ITEMS.every(id=>p.state.owned.includes(id)));assert.equal(p.state.coins,coins);
 await assert.rejects(call('redeem_code',{code:'8HW2M7XP51VZX'},'b'),/already redeemed/);
 const results=await Promise.allSettled([call('redeem_code',{code:'4137275028'},'b'),call('redeem_code',{code:'4137275028'},'b')]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(new Set(p.state.owned).size,ITEMS.filter(i=>!['membership','founder','code'].includes(i.source)).length);assert.equal(p.state.owned.length,ITEMS.filter(i=>!['membership','founder','code'].includes(i.source)).length);assert.equal(p.state.coins,coins);
 await assert.rejects(call('redeem_code',{code:'4137275028'},'b'),/already redeemed/);
});
test('profile updates cannot change currency or another account; invalid images are rejected',async()=>{
 const before=structuredClone(players.get('a').state);const result=await call('update_profile',{bio:'Weekend golfer',avatar:'',id:'b',state:{coins:999999}});assert.equal(result.profile.bio,'Weekend golfer');assert.equal(players.get('a').bio,'Weekend golfer');assert.deepEqual(players.get('a').state,before);assert.equal(players.get('b').bio,undefined);assert.equal(result.profile.state,undefined);assert.equal(result.profile.coins,undefined);
 await assert.rejects(call('update_profile',{bio:'x'.repeat(281),avatar:''}),/280/);await assert.rejects(call('update_profile',{bio:'hello',avatar:'data:image/svg+xml;base64,PHN2Zz4='}),/WebP/);
});
test('shop rejects unavailable or exclusive items even with sufficient balance',async()=>{
 const p=players.get('a');p.state=defaultSave();p.state.coins=100000;const rotation=shopRotation(),active=[...rotation.featured,...rotation.weekly,...rotation.daily,...rotation.permanent],inactive=ITEMS.find(i=>i.price>0&&!active.includes(i));await assert.rejects(call('buy',{id:inactive.id}),/rotated/);await assert.rejects(call('buy',{id:'ball-alpha'}),/collection/);const item=active.find(i=>i.category==='ball');await call('buy',{id:item.id});assert.ok(p.state.owned.includes(item.id));assert.equal(p.state.coins,100000-item.price);
});
test('old clients cannot start a mismatched replay version; new golf rounds store three holes',async()=>{
 await assert.rejects(call('start_round',{mode:'golf',course:0,rulesVersion:'legacy-v1'}),/Reload/);const r=await call('start_round',{mode:'golf',course:0});assert.equal(r.roundId,'round-test');
});

test('locker openings are atomic and retries do not spend a second time',async()=>{
 const p=players.get('a');p.state=defaultSave();p.state.coins=10000;
 const payload={id:'fairway',requestId:'same-opening-request-12345',rarity:'Black Market',item:'driver-alpha'};
 const results=await Promise.allSettled([call('open_locker',payload),call('open_locker',payload)]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(p.state.coins,8500);
 const receipt=results.find(r=>r.status==='fulfilled').value.outcome;
 assert.equal(ITEMS.find(i=>i.id===receipt.item).source,'pack');
 const retry=await call('open_locker',payload);assert.deepEqual(retry.outcome,receipt);assert.equal(p.state.coins,8500);
 await assert.rejects(call('open_locker',{id:'tour',requestId:payload.requestId}),/already used/);
});
test('normal golf publishing checks level and validates water, without trusting the author ID',async()=>{
 const p=players.get('a');p.state=defaultSave();
 await assert.rejects(call('save_map',{map:newGolfMap()}),/level 10/);
 await assert.rejects(call('publish_map',{map:newGolfMap()}),/level 10/);
 p.state.xp=10000;const {map}=await call('publish_map',{map:newGolfMap(),user_id:'b'});assert.equal(map.user_id,'a');assert.equal(map.layout.mode,'golf');
 await assert.rejects(call('publish_map',{map:{...newGolfMap(),water:[{x:0,z:0,rx:5,rz:5}]}}),/tee/);
});
test('custom domain preflight permits the new site and does not reflect unrelated origins',async()=>{
 for(const origin of ['https://littlelinks.study','https://www.littlelinks.study','https://polygolf.lol','https://www.polygolf.lol']){const r=await handler(new Request('http://test.local',{method:'OPTIONS',headers:{Origin:origin}}));assert.equal(r.headers.get('Access-Control-Allow-Origin'),origin);}
 const r=await handler(new Request('http://test.local',{method:'OPTIONS',headers:{Origin:'https://unrelated.invalid'}}));assert.notEqual(r.headers.get('Access-Control-Allow-Origin'),'https://unrelated.invalid');
});
test('ranked queue authenticates the player, enforces level 15 and snapshots server equipment',async()=>{const p=players.get('a');p.state=defaultSave();await assert.rejects(call('ranked_queue',{},null),/Sign in/);p.state.xp=18374;await assert.rejects(call('ranked_queue'),/level 15/);p.state.xp=18375;await assert.rejects(call('ranked_queue',{rulesVersion:'old'}),/Reload/);const s=await call('ranked_queue',{userId:'b',equipment:{driver:'driver-alpha'}});assert.equal(s.queued,true);});

test('community visits award once without confirmation, including concurrent requests and retries',async()=>{
 const p=players.get('a');p.state=defaultSave();const before=p.state.coins;
 await assert.rejects(call('claim_social',{id:'fake',confirmed:true}),/community/);
 const attempts=await Promise.allSettled([call('claim_social',{id:'instagram',confirmed:true}),call('claim_social',{id:'instagram',confirmed:true})]);
 assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);assert.equal(p.state.coins,before+1000);
 assert.equal((await call('claim_social',{id:'instagram'})).outcome.coins,0);
 for(const id of ['x','youtube','discord'])await call('claim_social',{id});
 assert.equal(p.state.coins,before+4000);assert.equal(p.state.socialRewards.length,4);
});

test('Levi code grants exactly 20 Forge lockers once, even concurrently; paid currency is unchanged',async()=>{
 const p=players.get('a');p.state=defaultSave();const coins=p.state.coins;
 await assert.rejects(call('redeem_code',{code:'greatidealevi'},null),/Sign in/);
 await assert.rejects(call('redeem_code',{code:'GREATIDEALEVI'}),/not active/);
 const results=await Promise.allSettled([call('redeem_code',{code:'greatidealevi'}),call('redeem_code',{code:'greatidealevi'})]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(p.state.lockers.forge,20);assert.equal(p.state.coins,coins);
 await assert.rejects(call('redeem_code',{code:'greatidealevi'}),/already redeemed/);
 const result=await call('open_locker',{id:'forge',requestId:'levi-test-opening-0001',item:'driver-case-hardened',seed:999});
 assert.equal(result.outcome.earned,true);assert.equal(p.state.lockers.forge,19);assert.equal(p.state.coins,coins);
 const {item,seed}=result.outcome;assert.ok(Number.isInteger(seed));assert.ok(p.state.patterns[item].includes(seed));
 await assert.rejects(call('equip',{id:item,seed:(seed+1)%1000}),/pattern/);
 await call('equip',{id:item,seed});
 assert.equal(p.state.equipment.patterns[item],seed);
 assert.equal((await call('open_locker',{id:'forge',requestId:'levi-test-opening-0001'})).outcome.seed,seed);
 assert.equal(p.state.lockers.forge,19);
});
test('member collection purchases enforce membership and debit only once concurrently',async()=>{
 const {memberRotation,memberPrice}=await import('../dist/src/equipment.js');
 const item=memberRotation()[0],p=players.get('a');p.state=defaultSave();p.state.coins=100000;
 await assert.rejects(call('buy_member_item',{id:item.id}),/Join/);
 p.state.clubPass={version:3,member:true,claimed:[],premiumClaimed:[]};
 const attempts=await Promise.allSettled([call('buy_member_item',{id:item.id}),call('buy_member_item',{id:item.id})]);
 assert.equal(attempts.filter(x=>x.status==='fulfilled').length,1);
 assert.equal(p.state.coins,100000-memberPrice(item));assert.ok(p.state.owned.includes(item.id));
 await assert.rejects(call('buy_member_item',{id:item.id}),/Already/);
});

test('100k code is exact, authenticated and grants 100,000 once under concurrent redemption',async()=>{
 const p=players.get('a');p.state=defaultSave();const before=structuredClone(p.state);
 await assert.rejects(call('redeem_code',{code:'100K'}),/not active/);
 await assert.rejects(call('redeem_code',{code:'100k'},null),/Sign in/);
 const attempts=await Promise.allSettled([call('redeem_code',{code:'100k'}),call('redeem_code',{code:'100k'})]);
 assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(p.state.coins,before.coins+100000);assert.equal(p.state.totalEarned,before.totalEarned+100000);assert.deepEqual(p.state.owned,before.owned);
 await assert.rejects(call('redeem_code',{code:'100k'}),/already redeemed/);
});
test('server equips owned off-rotation gear and rejects unowned gear without a charge',async()=>{
 const p=players.get('a');p.state=defaultSave();const item=ITEMS.find(i=>i.source==='weekly'&&!shopAvailable(i.id));assert.ok(item);
 await assert.rejects(call('equip',{id:item.id}),/before equipping/);
 p.state.owned.push(item.id);const before=p.state.coins;await call('equip',{id:item.id});
 assert.equal(p.state.equipment[item.category],item.id);assert.equal(p.state.coins,before);
});
test('public Elo leaderboard returns only safe rating fields and usernames',async()=>{
 ratings=[{user_id:'b',elo:1930,wins:12,losses:3,matches:15},{user_id:'a',elo:1200,wins:4,losses:2,matches:6}];
 const result=await call('ranked_leaderboard',{},null);assert.equal(result.rows[0].rank,'Elite');assert.equal(result.rows[1].rank,'Silver');
 assert.deepEqual(Object.keys(result.rows[0]).sort(),['user_id','username','elo','rank','wins','losses','matches'].sort());
 ratings=[];assert.deepEqual((await call('ranked_leaderboard',{},null)).rows,[]);
});
test('verified final-hole crate grant is atomic and retries return the same completion receipt',async()=>{
 const player=players.get('a');player.state=defaultSave();
 const equipment=player.state.equipment,hole=getHole(0,8),transcript=[];let p=new PhysicsManager(),ticks=0;p.load(hole);
 while(!p.sunk && transcript.length<24){
  const n=nearestPoint(hole,p.ball.x,p.ball.z),targets=[-.03,0,.03,.06,.13,.22,.34,.5,.8].map(v=>hole.samples[Math.max(0,Math.min(153,Math.round((n.t+v)*160)))]);targets.push(hole.cup);let best;
  for(const target of targets){for(const power of [.015,.035,.06,.1,.16,.22,.28,.45,.65,.85]){
   const q=new PhysicsManager();q.load(hole);q.ball={...p.ball};q.time=p.time;const len=Math.hypot(target.x-q.ball.x,target.z-q.ball.z),dx=(target.x-q.ball.x)/len,dz=(target.z-q.ball.z)/len;
   q.shoot(dx,dz,power,miniStats(equipment));let steps=0;while(q.active&&steps<5000){q.update(FIXED_STEP);steps++;if(q.events.includes('water'))break;}
   const np=nearestPoint(hole,q.ball.x,q.ball.z),score=q.sunk?100000:q.events.includes('water')||q.active?-1000:np.t*100-Math.hypot(q.ball.x-hole.cup.x,q.ball.z-hole.cup.z)*.2-np.distance*.4;
   if(!best||score>best.score)best={q,steps,score,command:{kind:'shot',tick:ticks,dx,dz,power,shape:0,spin:0,club:'putter'}};if(q.sunk)break;
  }if(best?.q.sunk)break;}
  assert.ok(best&&best.score>=0);transcript.push(best.command);ticks+=best.steps;p=best.q;p.events=[];
 }
 assert.ok(p.sunk,'Planner must finish the real last hole');
 let id;for(let i=0;i<1000;i++){const candidate='fixture-drop-'+i;if(createHmac('sha256','local-test-only').update('round-locker-v1:'+candidate+':a').digest().readUInt32BE(0)/4294967296<.1){id=candidate;break;}}assert.ok(id);
 rounds.set(id,{id,user_id:'a',mode:'mini',course:0,equipment,rules_version:RULES_VERSION,hole_count:9,next_hole:8,holes:Array.from({length:8},()=>({strokes:3,par:3,skipped:false})),finished:false,created_at:new Date(Date.now()-900000).toISOString(),updated_at:new Date(Date.now()-900000).toISOString()});
 const payload={roundId:id,index:8,transcript,endTick:ticks};const attempts=await Promise.allSettled([call('submit_hole',payload),call('submit_hole',payload)]);
 assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);const result=attempts.find(r=>r.status==='fulfilled').value;
 assert.ok(result.bonus.locker);assert.equal(player.state.lockers[result.bonus.locker],1);const coins=player.state.coins;
 const retry=await call('submit_hole',payload);assert.equal(retry.duplicate,true);assert.deepEqual(retry.bonus,result.bonus);assert.equal(player.state.coins,coins);assert.equal(player.state.lockers[result.bonus.locker],1);
});
