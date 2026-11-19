import test from 'node:test';
import assert from 'node:assert/strict';
import {backendFixture,A,B} from './helpers/backend-usage-fixture.mjs';
import {publicProfile} from '../dist/src/profile-data.js';

const f=await backendFixture({largeSave:true});

test('notification checks authenticate every call but never load saves or friend profiles',async()=>{
  f.resetStats();
  const data=await f.call('notifications');
  assert.deepEqual(data,{tradeInbox:0,friends:[{id:B}],incoming:[],outgoing:[]});
  const queries=f.stats.requests.filter(r=>r.path.endsWith('/golf_players'));
  assert.equal(queries.length,1);
  assert.match(queries[0].select,/equipment:state->equipment/);
  assert.ok(!queries[0].select.split(',').includes('state'));
  assert.ok(f.stats.bytes<2000,'the 100 KB private save must not cross the service boundary');
  await f.call('notifications');
  assert.equal(f.stats.requests.filter(r=>r.path==='/auth/v1/user').length,2);
  const reads=f.stats.requests.length;
  await assert.rejects(f.call('notifications',{},null),/Sign in/);
  assert.equal(f.stats.requests.length,reads);
  await assert.rejects(f.call('notifications',{},'unknown'),/Unauthorized/);
});

test('friend lists use summary columns; a separately opened profile retains its details',async()=>{
  const p=f.players.get(B);p.bio='Profile details stay available';p.state.stats.aces=7;
  f.resetStats();
  const friends=await f.call('friends');
  assert.equal(friends.friends[0].username,p.username);
  assert.equal(friends.friends[0].bio,undefined);
  assert.equal(friends.friends[0].state,undefined);
  const query=f.stats.requests.filter(r=>r.path.endsWith('/golf_players')).at(-1);
  assert.ok(!query.select.includes('owned')&&!query.select.includes('state,'));
  const detailed=await f.call('profile',{userId:B});
  const expected=publicProfile(p);
  for(const key of ['bio','equipment','stats','items','joined'])assert.deepEqual(detailed.profile[key],expected[key]);
  assert.equal(detailed.profile.state,undefined);
});

test('unchanged room revisions avoid writes and large replies, including legacy clients',async()=>{
  f.resetStats();const room=f.rooms.get('room-fixture');
  const data=await f.call('room',{roomId:room.id,knownRevision:room.revision});
  assert.equal(data.unchanged,true);assert.equal(data.revision,room.revision);assert.equal(data.room,undefined);
  assert.equal(f.stats.roomWrites,0);
  assert.ok(JSON.stringify(data).length<160);
  const legacy=await f.call('room',{roomId:room.id});
  assert.equal(legacy.room.id,room.id);assert.equal(f.stats.roomWrites,0);
  await assert.rejects(f.call('room',{roomId:room.id,knownRevision:room.revision},B),/not a member/);
});

test('room heartbeats persist every 30 seconds and score changes still update immediately',async t=>{
  t.mock.timers.enable({apis:['Date'],now:Date.now()});
  const room=f.rooms.get('room-fixture'),member=room.state.members[0];member.seen=Date.now();
  room.state.phase='playing';room.state.botHoleStartedAt=Date.now();room.state.deadline=Date.now()+360000;
  Object.assign(member,{scores:[],nextHole:0,roundId:'round-fixture'});
  f.rounds.push({id:'round-fixture',user_id:A,room_id:room.id,next_hole:0,holes:[],unneededReplayData:'x'.repeat(10000)});
  f.resetStats();
  await f.call('room',{roomId:room.id});
  t.mock.timers.tick(29000);await f.call('room',{roomId:room.id});assert.equal(f.stats.roomWrites,0);
  t.mock.timers.tick(1000);await f.call('room',{roomId:room.id});assert.equal(f.stats.roomWrites,1);
  const query=f.stats.requests.filter(r=>r.path.endsWith('/golf_rounds')).at(-1);
  assert.equal(query.select,'id,user_id,next_hole,holes');
  f.rounds[0].holes=[{strokes:4}];f.rounds[0].next_hole=1;
  await f.call('room',{roomId:room.id});assert.equal(f.stats.roomWrites,2);
  assert.equal(room.state.hole,1);assert.deepEqual(room.state.members[0].scores,[4]);
  room.state.phase='waiting';room.state.members[0].seen=Date.now();
});

test('profile writes request no echoed save and refreshes can omit editor layouts',async()=>{
  f.resetStats();const state=structuredClone(f.players.get(A).state);
  const updated=await f.call('update_profile',{bio:'Updated bio',avatar:''});
  assert.equal(updated.profile.bio,'Updated bio');assert.deepEqual(f.players.get(A).state,state);
  assert.equal(f.stats.requests.find(r=>r.method==='PATCH').prefer,'return=minimal');
  f.resetStats();const fresh=await f.call('me',{includeMaps:false});
  assert.equal(fresh.usageVersion,1);assert.equal(fresh.maps,undefined);assert.equal(fresh.state.coins,state.coins);
  assert.ok(!f.stats.requests.some(r=>r.path.endsWith('/golf_maps')));
  const legacy=await f.call('me');assert.equal(legacy.maps[0].name,'Saved fixture');
});

test('preflight permissions are cacheable without invoking Auth or the database',async()=>{
  f.resetStats();const r=await f.options();
  assert.equal(r.status,200);assert.equal(r.headers.get('Access-Control-Max-Age'),'600');
  assert.equal(r.headers.get('Access-Control-Allow-Origin'),'https://littlelinks.study');
  assert.equal(f.stats.requests.length,0);
});
