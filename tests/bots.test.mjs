import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import {botRound,botHoleDuration,makeBot,botPresentation} from '../dist/src/bots.js';
import {defaultSave} from '../dist/src/save.js';
import {getGolfHole,RULES_VERSION} from '../dist/src/golf-courses.js';
import {cleanLiveState} from '../dist/src/live-state.js';
let source=await readFile(new URL('../backend/rooms.ts',import.meta.url),'utf8');
source=source.replaceAll("'./shared/","'"+new URL('../dist/src/',import.meta.url).href);
const {roomAction}=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source)).toString('base64'));
test('bot scores follow the specified weighted round totals without zero-stroke holes',()=>{
 const counts=new Map();
 for(let i=0;i<10000;i++){let first=true;const h=botRound([4,3,5],()=>{if(first){first=false;return i/10000;}return .4;});assert.ok(h.every(x=>x.strokes>=1));const d=h.reduce((n,x)=>n+x.strokes-x.par,0);counts.set(d,(counts.get(d)||0)+1);}
 assert.deepEqual(Object.fromEntries(counts),{'-3':100,'-2':300,'-1':2600,'0':4000,'1':3000});
 assert.equal(botHoleDuration(4),32000);
});
function fixture(){
 const host={id:'host',username:'Host',state:defaultSave()},guest={id:'guest',username:'Guest',state:defaultSave()};host.state.xp=20000;
 let room={id:'room',code:'ABC234',revision:1,state:{host:host.id,phase:'waiting',mode:'golf',course:0,rulesVersion:RULES_VERSION,hole:0,members:[{id:host.id,name:host.username,ready:true,seen:Date.now()}]}};
 let rounds=[];const api={table:async(name)=>name==='rooms'?[structuredClone(room)]:name==='players'?[host]:name==='rounds'?structuredClone(rounds):[],insert:async(name,rows)=>{assert.equal(name,'rounds');assert.ok(rows.every(r=>r.user_id==='host'));rounds=rows.map((r,i)=>({...r,id:'round'+i,holes:[],next_hole:0}));return rounds;},rpc:async(name,p)=>{assert.equal(name,'room_cas');assert.equal(p.p_revision,room.revision);room={...room,revision:room.revision+1,state:structuredClone(p.p_state)};return room.revision;},player:async()=>host,submit:async()=>{throw Error('Unexpected timeout');}};
 return {host,guest,api,get room(){return room;},set room(v){room=v;},get rounds(){return rounds;},set rounds(v){rounds=v;}};
}
test('host fills eight slots, removes bots and rejects non-host changes',async()=>{
 const f=fixture();await roomAction('fill_room_bots',f.host,{roomId:'room'},f.api);assert.equal(f.room.state.members.length,8);assert.equal(new Set(f.room.state.members.map(m=>m.name)).size,8);
 await assert.rejects(roomAction('add_room_bot',f.host,{roomId:'room'},f.api),/full/);
 const bot=f.room.state.members[1];await roomAction('remove_room_bot',f.host,{roomId:'room',botId:bot.id},f.api);assert.equal(f.room.state.members.length,7);
 f.room.state.members.push({id:'guest',name:'Guest',ready:true});await assert.rejects(roomAction('remove_room_bot',f.guest,{roomId:'room',botId:f.room.state.members[1].id},f.api),/Only the host/);
});
test('human join replaces a filled bot slot and leaving the last human closes the room',async()=>{
 const f=fixture();await roomAction('fill_room_bots',f.host,{roomId:'room'},f.api);await roomAction('join_room',f.guest,{code:'ABC234'},f.api);assert.equal(f.room.state.members.length,8);assert.equal(f.room.state.members.filter(m=>m.bot).length,6);
 await roomAction('leave_room',f.host,{roomId:'room'},f.api);assert.equal(f.room.state.host,'guest');await roomAction('leave_room',f.guest,{roomId:'room'},f.api);assert.equal(f.room.state.phase,'closed');assert.deepEqual(f.room.state.members,[]);
});
test('bot rooms create rounds only for humans and server clocks control bot scores',async()=>{
 const f=fixture();await roomAction('add_room_bot',f.host,{roomId:'room'},f.api);await roomAction('start_room',f.host,{roomId:'room'},f.api);assert.equal(f.rounds.length,1);
 assert.equal(f.rounds[0].hole_count,9);assert.equal(f.room.state.members[1].plan.length,9);
 await assert.rejects(roomAction('add_room_bot',f.host,{roomId:'room'},f.api),/Only the host/);
 await roomAction('room',f.host,{roomId:'room',scores:[1,1,1]},f.api);assert.deepEqual(f.room.state.members[1].scores,[]);
 const strokes=f.room.state.members[1].plan[0].strokes;f.room.state.botHoleStartedAt=Date.now()-botHoleDuration(strokes)-1;
 await roomAction('room',f.host,{roomId:'room'},f.api);assert.deepEqual(f.room.state.members[1].scores,[strokes]);assert.equal(f.room.state.hole,0);
 f.rounds[0].holes=[{strokes:4}];f.rounds[0].next_hole=1;await roomAction('room',f.host,{roomId:'room'},f.api);assert.equal(f.room.state.hole,1);
 await roomAction('room',f.host,{roomId:'room'},f.api);assert.deepEqual(f.room.state.members[1].scores,[strokes]);
});
test('a Willow bot room progresses through nine holes before ending',async()=>{
 const f=fixture();await roomAction('add_room_bot',f.host,{roomId:'room'},f.api);await roomAction('start_room',f.host,{roomId:'room'},f.api);
 for(let i=0;i<9;i++){
  f.rounds[0].holes.push({strokes:4});f.rounds[0].next_hole=i+1;
  f.room.state.botHoleStartedAt=Date.now()-60000;
  await roomAction('room',f.host,{roomId:'room'},f.api);
  assert.equal(f.room.state.hole,i+1);assert.equal(f.room.state.phase,i===8?'finished':'playing');
 }
});
test('bot presentation produces bounded live packets, motion, swings and cup completion',()=>{
 const bot=makeBot([4,3,5],0,()=>.5),start=Date.now(),hole=getGolfHole(0,0),ui={game:{hole,index:0,round:{}},world:{renderGround:()=>0},cloud:{room:{state:{hole:0,botHoleStartedAt:start}}}};
 const idle=botPresentation(bot,ui,start),flight=botPresentation(bot,ui,start+4000),sunk=botPresentation(bot,ui,start+31000);
 assert.ok(cleanLiveState(idle));assert.ok(cleanLiveState(flight));assert.equal(flight.active,true);assert.ok(flight.swing);assert.equal(sunk.sunk,true);
});
