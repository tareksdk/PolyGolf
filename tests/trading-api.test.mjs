import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import {defaultSave} from '../dist/src/save.js';
import {ITEMS} from '../dist/src/catalog.js';
import {tradeable} from '../dist/src/trades.js';
let source=await readFile(new URL('../backend/trading.ts',import.meta.url),'utf8');
source=source.replaceAll("'./shared/","'"+new URL('../dist/src/',import.meta.url).href);
const {tradingAction}=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source)).toString('base64'));
const A='00000000-0000-0000-0000-000000000001',B='00000000-0000-0000-0000-000000000002',C='00000000-0000-0000-0000-000000000003',ID='00000000-0000-0000-0000-000000000004';
function fixture(){
 const items=ITEMS.filter(i=>tradeable(i)&&!i.finish),a={id:A,username:'Golfer A',revision:7,state:defaultSave()},b={id:B,username:'Golfer B',revision:9,state:defaultSave()};
 a.state.xp=b.state.xp=10000;a.state.owned.push(items[0].id);b.state.owned.push(items[1].id);
 const t={id:ID,sender_id:A,receiver_id:B,offered:[{id:items[0].id}],requested:[{id:items[1].id}],status:'pending',expires_at:new Date(Date.now()+86400000).toISOString()};
 let existing=null,friends=true,calls=[];
 const db={limited:async()=>{},table:async(name,q)=>{
   if(name==='friends')return friends?[{status:'accepted'}]:[];
   if(name==='players')return q.includes('id=in.')?[a,b]:q.includes(A)?[a]:q.includes(B)?[b]:[];
   if(name==='trades')return q.includes('sender_id=eq.')?[]:existing?[structuredClone(existing)]:[];
   throw Error(name);
 },insert:async(name,row)=>{existing={...t,...row};return[existing];},rpc:async(name,params)=>{calls.push({name,params});return{state:params.p_receiver_state,duplicate:false};}};
 return{a,b,t,db,calls,setExisting:v=>existing=v,setFriends:v=>friends=v};
}
test('trade API exposes only a public profile and tradable inventory to friends',async()=>{
 const f=fixture(),r=await tradingAction('trade_inventory',f.a,{userId:B},f.db);
 assert.equal(r.profile.id,B);assert.equal(r.profile.state,undefined);assert.equal(r.theirs.length,1);
 f.setFriends(false);await assert.rejects(tradingAction('trade_inventory',f.a,{userId:B},f.db),/friend/);
 await assert.rejects(tradingAction('trade_inventory',f.a,{userId:A},f.db),/Choose/);
});
test('trade creation validates ownership and retries do not duplicate an offer',async()=>{
 const f=fixture(),payload={userId:B,requestId:ID,offered:f.t.offered,requested:f.t.requested};
 const r=await tradingAction('trade_create',f.a,payload,f.db);assert.equal(r.trade.sender_id,A);assert.equal(r.trade.receiver_id,B);
 assert.equal((await tradingAction('trade_create',f.a,payload,f.db)).trade.id,ID);
 await assert.rejects(tradingAction('trade_create',f.b,payload,f.db),/Invalid/);
 f.setExisting(null);f.a.state.owned=[];await assert.rejects(tradingAction('trade_create',f.a,payload,f.db),/available/);
});
test('only the recipient accepts; verified inventories and revisions reach the atomic RPC',async()=>{
 const f=fixture();f.setExisting(f.t);
 await assert.rejects(tradingAction('trade_accept',f.a,{tradeId:ID},f.db),/recipient/);
 await assert.rejects(tradingAction('trade_accept',{...f.a,id:C},{tradeId:ID},f.db),/not found/);
 const r=await tradingAction('trade_accept',f.b,{tradeId:ID,state:{coins:99999999}},f.db),p=f.calls[0].params;
 assert.equal(p.p_sender_revision,7);assert.equal(p.p_receiver_revision,9);assert.equal(p.p_user,B);
 assert.ok(r.state.owned.includes(f.t.offered[0].id));assert.ok(!r.state.owned.includes(f.t.requested[0].id));
 assert.equal(r.state.coins,f.b.state.coins);assert.equal(f.a.state.owned.includes(f.t.offered[0].id),true);
 f.t.status='accepted';assert.equal((await tradingAction('trade_accept',f.b,{tradeId:ID},f.db)).duplicate,true);assert.equal(f.calls.length,1);
});
test('expired, declined, unfriended and stale inventory offers cannot execute',async()=>{
 for(const variant of ['expired','declined','unfriended','missing']){
  const f=fixture();if(variant==='expired')f.t.expires_at='2000-01-01T00:00:00Z';if(variant==='declined')f.t.status='declined';if(variant==='unfriended')f.setFriends(false);if(variant==='missing')f.a.state.owned=[];
  f.setExisting(f.t);await assert.rejects(tradingAction('trade_accept',f.b,{tradeId:ID},f.db));assert.equal(f.calls.length,0);
 }
});

test('coin-only and mixed offers persist exact amounts and debit verified balances',async()=>{
 const f=fixture();f.a.state.coins=5000;f.b.state.coins=9000;
 const payload={userId:B,requestId:ID,offered:[],requested:f.t.requested,offeredCoins:2500,requestedCoins:700};
 const {trade}=await tradingAction('trade_create',f.a,payload,f.db);
 assert.equal(trade.offered_coins,2500);assert.equal(trade.requested_coins,700);assert.deepEqual(trade.offered,[]);
 const result=await tradingAction('trade_accept',f.b,{tradeId:ID,tradeVersion:2,offeredCoins:1,state:{coins:1e9}},f.db);
 assert.equal(result.state.coins,10800);assert.equal(f.calls[0].params.p_sender_state.coins,3200);
 assert.equal(f.a.state.coins,5000);assert.equal(f.b.state.coins,9000);
 assert.equal((await tradingAction('trade_inventory',f.a,{userId:B},f.db)).yourCoins,5000);
});

test('coin trades require an updated review and recheck balances before acceptance',async()=>{
 const f=fixture();f.a.state.coins=5000;f.b.state.coins=5000;f.t.offered_coins=2000;f.t.requested_coins=1000;f.setExisting(f.t);
 await assert.rejects(tradingAction('trade_accept',f.b,{tradeId:ID},f.db),/Reload/);
 f.a.state.coins=1999;await assert.rejects(tradingAction('trade_accept',f.b,{tradeId:ID,tradeVersion:2},f.db),/enough coins/);
 f.a.state.coins=5000;f.b.state.coins=999;await assert.rejects(tradingAction('trade_accept',f.b,{tradeId:ID,tradeVersion:2},f.db),/enough coins/);
 assert.equal(f.calls.length,0);
});
