import test from 'node:test';
import assert from 'node:assert/strict';
import {GolfCloud} from '../dist/src/cloud.js';
import {DEFAULT_EQUIPMENT} from '../dist/src/catalog.js';
import {ProgressionManager,defaultSave} from '../dist/src/save.js';
import {compactLiveState,cleanLiveState} from '../dist/src/live-state.js';
import {installNotifications} from '../dist/src/notifications.js';
import {installHonors} from '../dist/src/honors-ui.js';
import {installActivity} from '../dist/src/online-activity.js';
import {BACKGROUND_POLL_MS,SITE_SETTINGS_TTL_MS,roomPollInterval} from '../dist/src/network-policy.js';
import {writeSession,readSession} from '../dist/src/session-store.js';

function cloudFixture(){
  const cloud=Object.create(GolfCloud.prototype);
  cloud.session={user:{id:'fixture-user'},access_token:'fixture-access'};
  cloud.refresh=async()=>{};cloud.accept=()=>{};cloud.ui={syncRoom:()=>{}};
  return cloud;
}
const store=()=>{const rows=new Map();return{getItem:k=>rows.get(k)||null,setItem:(k,v)=>rows.set(k,v),removeItem:k=>rows.delete(k)};};
function globalValue(t,name,value){
  const previous=Object.getOwnPropertyDescriptor(globalThis,name);
  Object.defineProperty(globalThis,name,{value,writable:true,configurable:true});
  t.after(()=>{if(previous)Object.defineProperty(globalThis,name,previous);else delete globalThis[name];});
}

function uiFixture(t){
  const timers=[],listeners=new Map();
  t.mock.method(globalThis,'setInterval',(fn,ms)=>{timers.push({fn,ms});return 1;});
  globalValue(t,'document',{hidden:false,querySelector:()=>null,getElementById:()=>null,addEventListener:(name,fn)=>listeners.set(name,fn)});
  globalValue(t,'localStorage',store());
  const progress=new ProgressionManager({load:defaultSave,save:()=>true});
  const ui={progress,cloud:{session:{user:{id:'fixture-user'}},usageVersion:1,isGuest:false},screen:'home',game:{state:'menu'},root:{querySelectorAll:()=>[]},modalRoot:{children:[]},render:()=>{},action:()=>{},closeModal:()=>{}};
  return{ui,timers,listeners};
}

test('simultaneous reads share one request; writes and different users stay separate',async t=>{
  const c=cloudFixture();let calls=0,release;
  t.mock.method(globalThis,'fetch',async()=>{calls++;await new Promise(r=>{release=r;});return new Response('{"friends":[],"incoming":[],"outgoing":[]}');});
  const first=c.call('friends'),second=c.call('friends');
  await Promise.resolve();assert.equal(calls,1);release();await Promise.all([first,second]);
  assert.equal(c.pendingReads.size,0);
  t.mock.method(globalThis,'fetch',async()=>{calls++;return new Response('{}');});
  await Promise.all([c.call('equip',{id:'ball-classic'}),c.call('equip',{id:'ball-classic'})]);
  assert.equal(calls,3);
  const seen=[];t.mock.method(globalThis,'fetch',async(_url,o)=>{seen.push(o.headers.Authorization);return new Response('{}');});
  const a=c.call('friends');c.session={user:{id:'other-user'},access_token:'other-access'};const b=c.call('friends');
  await Promise.all([a,b]);assert.equal(seen.length,2);
});

test('failed reads are not cached and the next explicit action can retry',async t=>{
  const c=cloudFixture();let calls=0;
  t.mock.method(globalThis,'fetch',async()=>{calls++;return calls===1?new Response('{"error":"Unavailable"}',{status:503}):new Response('{"friends":[]}');});
  await assert.rejects(c.call('friends'),/Unavailable/);await c.call('friends');assert.equal(calls,2);
});

test('room reconciliation slows in play and hidden tabs while failures back off',async t=>{
  t.mock.timers.enable({apis:['Date'],now:100000});
  globalValue(t,'sessionStorage',store());
  globalValue(t,'document',{hidden:false});
  const c=cloudFixture();c.room={id:'room',revision:7,state:{phase:'playing'}};
  let calls=0;c.call=async()=>{calls++;return{unchanged:true,roomId:'room',revision:7};};
  await c.poll();await c.poll();assert.equal(calls,1);
  t.mock.timers.tick(7999);await c.poll();assert.equal(calls,1);
  t.mock.timers.tick(1);await c.poll();assert.equal(calls,2);
  document.hidden=true;t.mock.timers.tick(8000);await c.poll();assert.equal(calls,3);
  t.mock.timers.tick(29999);await c.poll();assert.equal(calls,3);
  t.mock.timers.tick(1);await c.poll();assert.equal(calls,4);
  c.call=async()=>{calls++;throw Error('Offline');};
  t.mock.timers.tick(30000);await c.poll();assert.equal(calls,5);
  await c.poll();assert.equal(calls,5);
  t.mock.timers.tick(8000);await c.poll();assert.equal(calls,6);
  t.mock.timers.tick(15000);await c.poll();assert.equal(calls,6);
  t.mock.timers.tick(1000);await c.poll();assert.equal(calls,7);
  assert.ok(c.nextRoomPoll-Date.now()<=60000);
  assert.equal(roomPollInterval({state:{phase:'waiting'}}),4000);
});

test('old room responses cannot restore a room after leaving or switching accounts',async t=>{
  globalValue(t,'sessionStorage',store());
  const c=cloudFixture();c.room={id:'room',revision:1,state:{phase:'waiting'}};
  let finish,synced=0;c.ui.syncRoom=()=>synced++;
  c.call=()=>new Promise(r=>{finish=r;});
  const pending=c.poll();c.room=null;finish({room:{id:'room',revision:2,state:{phase:'playing'}}});
  await pending;assert.equal(c.room,null);assert.equal(synced,0);assert.equal(c.busy,false);
});

test('leaderboard reads are shared, expire after a minute and refresh after a saved action',async t=>{
  t.mock.timers.enable({apis:['Date'],now:100000});
  const c=cloudFixture();let calls=0;
  t.mock.method(globalThis,'fetch',async()=>{calls++;return new Response('[{"rank":1,"username":"Fixture"}]');});
  const [a,b]=await Promise.all([c.rankings('golf',0),c.rankings('golf',0)]);
  assert.equal(calls,1);a[0].username='Changed';assert.equal(b[0].username,'Fixture');
  await c.rankings('golf',0);assert.equal(calls,1);
  t.mock.timers.tick(60000);await c.rankings('golf',0);assert.equal(calls,2);
  t.mock.method(globalThis,'fetch',async()=>{calls++;return new Response('{}');});
  await c.call('submit_hole');
  t.mock.method(globalThis,'fetch',async()=>{calls++;return new Response('[]');});
  await c.rankings('golf',0);assert.equal(calls,4);
});

test('routine save refreshes omit maps; initial account attachment can request them',async t=>{
  const c=cloudFixture(),bodies=[];
  t.mock.method(globalThis,'fetch',async(_url,o)=>{bodies.push(JSON.parse(o.body));return new Response('{}');});
  await c.call('me');await c.call('me',{includeMaps:true});
  assert.equal(bodies[0].includeMaps,false);assert.equal(bodies[1].includeMaps,true);
});

test('notification summaries run at five-minute intervals and stop for guests, play and hidden tabs',async t=>{
  t.mock.timers.enable({apis:['Date'],now:100000});
  const {ui,timers}=uiFixture(t);let calls=0;
  ui.cloud.call=async action=>{assert.equal(action,'notifications');calls++;return{friends:[],incoming:[],outgoing:[],tradeInbox:2};};
  installNotifications(ui);ui.render();const tick=timers.find(t=>t.ms===10000).fn;
  await tick();await tick();assert.equal(calls,1);assert.equal(ui.tradeInbox,2);
  t.mock.timers.tick(BACKGROUND_POLL_MS);await tick();assert.equal(calls,2);
  t.mock.timers.tick(BACKGROUND_POLL_MS);ui.game.state='playing';await tick();assert.equal(calls,2);
  ui.game.state='menu';document.hidden=true;await tick();assert.equal(calls,2);
  document.hidden=false;ui.cloud.isGuest=true;await tick();assert.equal(calls,2);
});

test('honors check when returning to the menu but do not poll throughout a round',async t=>{
  t.mock.timers.enable({apis:['Date'],now:100000});
  const {ui,timers}=uiFixture(t);let calls=0;
  ui.cloud.call=async action=>{assert.equal(action,'honors_inbox');calls++;return{awards:[]};};
  installHonors(ui);const tick=timers.find(t=>t.ms===1500).fn;
  await tick();await tick();assert.equal(calls,1);
  ui.game.state='playing';t.mock.timers.tick(BACKGROUND_POLL_MS);await tick();assert.equal(calls,1);
  ui.game.state='menu';await tick();assert.equal(calls,2);
  document.hidden=true;t.mock.timers.tick(BACKGROUND_POLL_MS);await tick();assert.equal(calls,2);
  document.hidden=false;ui.cloud.isGuest=true;await tick();assert.equal(calls,2);
});

test('home settings cache is shared between tabs and is not fetched off the home screen',async t=>{
  t.mock.timers.enable({apis:['Date'],now:100000});
  const {ui,timers}=uiFixture(t);let calls=0;
  t.mock.method(globalThis,'fetch',async()=>{calls++;return new Response('[{"online_base":100,"enabled":true,"home_message":"Fixture"}]');});
  installActivity(ui);await new Promise(r=>setImmediate(r));assert.equal(calls,1);
  const next={...ui,render:()=>{}};installActivity(next);await new Promise(r=>setImmediate(r));assert.equal(calls,1);
  t.mock.timers.tick(SITE_SETTINGS_TTL_MS);ui.screen='shop';await timers[0].fn();assert.equal(calls,1);
  ui.screen='home';await timers[0].fn();assert.equal(calls,2);
});

test('compact cosmetic packets remain readable by v1 clients and preserve shot direction',()=>{
  const state={v:1,seq:10,at:100000,hole:'0',ball:{x:123.123456789,y:12.23456789,z:-39.3456789,vx:16.123456789,vy:8.234567891,vz:-22.123456789},anchor:{x:98.123456789,y:1.23456789,z:38.123456789},dx:.123456789,dz:.99234987,club:'7i',active:true,sunk:false,equipment:{...DEFAULT_EQUIPMENT,patterns:{}},swing:{id:1,at:99000},emote:null};
  const before=JSON.stringify(state),packet=compactLiveState(state);
  assert.ok(cleanLiveState(packet));assert.equal(packet.v,1);
  assert.ok(Math.abs(packet.ball.x-state.ball.x)<.0051);assert.ok(Math.abs(packet.dx-state.dx)<.000051);
  assert.ok(JSON.stringify(packet).length<before.length);assert.equal(JSON.stringify(state),before);
  assert.equal(compactLiveState({...state,ball:{...state.ball,x:Infinity}}),null);
});

test('quota failures preserve sign-in and stop refresh, API and ranking retries for ten minutes',async t=>{
  t.mock.timers.enable({apis:['Date'],now:1000000});
  globalValue(t,'localStorage',store());
  const c=cloudFixture();delete c.refresh;
  Object.assign(c.session,{expires_at:1,refresh_token:'fixture-refresh'});writeSession(c.session);
  let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;return new Response('{}',{status:402});});
  await assert.rejects(c.refresh(),/usage limit/);
  await assert.rejects(c.refresh(),/usage limit/);
  await assert.rejects(c.call('friends'),/usage limit/);
  await assert.rejects(c.rankings('golf',0),/usage limit/);
  assert.equal(calls,1);assert.ok(c.session);assert.equal(readSession().refresh_token,'fixture-refresh');
  t.mock.timers.tick(600001);
  t.mock.method(globalThis,'fetch',async()=>{calls++;return new Response(JSON.stringify({...c.session,expires_at:Date.now()/1000+3600}));});
  await c.refresh();assert.equal(calls,2);
});
