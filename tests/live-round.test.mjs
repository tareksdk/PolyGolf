import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanLiveState, LiveBuffer, liveScope, liveHole } from '../dist/src/live-state.js';
import { LiveTransport } from '../dist/src/live-transport.js';
import { DEFAULT_SETTINGS } from '../dist/src/save.js';
const packet=(at=1000,x=0)=>({v:1,seq:at,at,hole:'0',ball:{x,y:2,z:0,vx:10,vy:0,vz:0},anchor:{x:0,y:0,z:0},dx:1,dz:0,club:'driver',active:true,sunk:false,equipment:{ball:'ball-case-hardened',patterns:{'ball-case-hardened':999}},swing:{id:1,at:900},emote:null});
test('remote state is bounded, normalized and cannot inject arbitrary gear or markup',()=>{
 const p=packet();assert.equal(cleanLiveState(p).equipment.patterns['ball-case-hardened'],999);
 for(const bad of [{...p,ball:{...p.ball,x:NaN}},{...p,anchor:{x:Infinity,y:0,z:0}},{...p,club:'hacked'},{...p,hole:'<script>'},{...p,dx:10}])assert.equal(cleanLiveState(bad),null);
 p.equipment.driver='<img>';p.equipment.trail='ball-case-hardened';p.emote={id:2,at:1000,item:'<script>'};
 const clean=cleanLiveState(p);assert.notEqual(clean.equipment.driver,'<img>');assert.equal(clean.emote.item,null);assert.equal(clean.equipment.trail,'trail-none');
 for(const club of ['gw','lw','sw','putter'])assert.ok(cleanLiveState({...p,club}));
});
test('opponents interpolate through packet gaps and never extrapolate without a bound',()=>{
 const b=new LiveBuffer();b.push(cleanLiveState(packet(1000,0)),0);b.push(cleanLiveState(packet(1200,2)),200);
 assert.equal(b.sample(300,200).ball.x,1);assert.equal(b.sample(400,200).ball.x,2);
 assert.equal(b.sample(10000,200).ball.x,3.5);
 assert.equal(b.push(cleanLiveState(packet(1100,1)),300),false);
 b.push(cleanLiveState({...packet(1400,30),hole:'1'}),400);assert.equal(b.samples.length,1);assert.equal(b.sample(500).hole,'1');
});
test('private rooms and ranked use separate scopes, and leave/finished stops presence',()=>{
 const ui={cloud:{session:{user:{id:'a'}},room:{id:'r',state:{phase:'playing',members:[{id:'a',roundId:'round'},{id:'b'}]}}},game:{state:'playing',index:2,round:{cloudId:'round'}}};
 assert.equal(liveScope(ui).key,'room:r');assert.equal(liveHole(ui.game),'2');
 ui.ranked={match:{id:'m',a_id:'a',b_id:'b',phase:'sudden'}};ui.game.round={competitiveId:'m',sudden:true,suddenRound:2};
 assert.equal(liveScope(ui).key,'ranked:m');assert.equal(liveHole(ui.game),'sudden:2');
 ui.ranked.match.phase='finished';assert.equal(liveScope(ui),null);ui.game.state='menu';assert.equal(liveScope(ui),null);
 assert.equal(DEFAULT_SETTINGS.showOpponents,true);
});
test('broadcast only publishes as self, receives subscribed peers and rotates tokens',()=>{
 let ws;const received=[];
 class Socket{constructor(){ws=this;this.readyState=1;this.sent=[];}send(s){this.sent.push(JSON.parse(s));}close(){this.readyState=3;this.onclose?.();}}
 const t=new LiveTransport({url:'https://example.test',key:'public',token:'a',user:'self',scope:{key:'room:id',members:[{id:'self'},{id:'peer'}]},receive:(...v)=>received.push(v),socket:Socket});
 try{
  ws.onopen();assert.equal(ws.sent.length,2);for(const m of ws.sent){assert.equal(m.payload.config.private,true);ws.onmessage({data:JSON.stringify({event:'phx_reply',ref:m.ref,payload:{status:'ok'}})});}
  assert.equal(t.publish(packet()),true);assert.equal(ws.sent.at(-1).topic,'realtime:polygolf:room:id:self');
  for(const id of ['outsider','self','peer'])ws.onmessage({data:JSON.stringify({event:'broadcast',topic:t.topic(id),payload:{event:'state',payload:packet()}})});
  assert.equal(received.length,1);assert.equal(received[0][0],'peer');
  t.updateToken('new');assert.equal(ws.sent.at(-1).event,'access_token');assert.equal(ws.sent.at(-1).payload.access_token,'new');
 }finally{t.close();}
 assert.equal(ws.readyState,3);assert.equal(t.publish(packet()),false);assert.equal(t.retry,undefined);
});
