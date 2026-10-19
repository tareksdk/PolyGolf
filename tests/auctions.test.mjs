import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import {defaultSave} from '../dist/src/save.js';
import {ITEMS,DEFAULT_EQUIPMENT} from '../dist/src/catalog.js';
import {tradeable} from '../dist/src/trades.js';
import {validateListing,minimumBid,publicAuction} from '../dist/src/auctions.js';
import {filterAuctions,timeLeft} from '../dist/src/auction-ui.js';
let source=await readFile(new URL('../backend/auctions.ts',import.meta.url),'utf8');
source=source.replaceAll("'./shared/","'"+new URL('../dist/src/',import.meta.url).href);
const {auctionAction}=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source)).toString('base64'));
const A='00000000-0000-0000-0000-00000000000a',B='00000000-0000-0000-0000-00000000000b',ID='00000000-0000-0000-0000-000000000001',RQ='00000000-0000-0000-0000-000000000002';
const plain=ITEMS.filter(i=>tradeable(i)&&!i.finish),finish=ITEMS.find(i=>tradeable(i)&&i.finish);
function golfer(id,xp=10000){const state=defaultSave();state.xp=xp;state.coins=5000;state.owned.push(plain[0].id);return{id,username:'golfer_'+id.slice(-1),revision:3,state};}
function fixture(){
 const calls=[],rows=[];
 const db={limited:async()=>{},table:async(name,q)=>{if(name==='players')return[{id:A,username:'seller_a'},{id:B,username:'buyer_b'}];if(name==='auctions'){calls.push({name:'table',q});return rows;}throw Error(name);},
  rpc:async(name,params)=>{calls.push({name,params});
   if(name==='auction_sweep')return 0;
   const auction={id:params.p_id,seller_id:A,item:params.p_item||{id:plain[0].id,category:plain[0].category,fallback:'x'},starting_bid:params.p_start||100,buyout:params.p_buyout??null,highest_bid:0,bidder_id:null,bid_count:0,status:'active',ends_at:new Date(Date.now()+3600e3).toISOString(),created_at:new Date().toISOString()};
   return{auction,state:{coins:1}};}};
 return{db,calls,rows};
}
test('listings only accept tradable items the seller holds, with sane prices and lengths',()=>{
 const s=golfer(A).state;
 const ok=validateListing({id:plain[0].id},s,100,250,24);
 assert.deepEqual(ok.item,{id:plain[0].id,category:plain[0].category,fallback:DEFAULT_EQUIPMENT[plain[0].category]});
 assert.throws(()=>validateListing({id:plain[1].id},s,100,null,24),/cannot be listed/);
 assert.throws(()=>validateListing({id:DEFAULT_EQUIPMENT.ball},s,100,null,24),/cannot be listed/);
 assert.throws(()=>validateListing({id:plain[0].id},s,0,null,24),/starting bid/);
 assert.throws(()=>validateListing({id:plain[0].id},s,1.5,null,24),/starting bid/);
 assert.throws(()=>validateListing({id:plain[0].id},s,100,99,24),/instant-buy/);
 assert.throws(()=>validateListing({id:plain[0].id},s,100,null,5),/length/);
 if(finish){s.owned.push(finish.id);s.patterns={[finish.id]:[7]};
  assert.equal(validateListing({id:finish.id,seed:7},s,10,null,6).item.seed,7);
  assert.throws(()=>validateListing({id:finish.id,seed:8},s,10,null,6),/cannot be listed/);}
});
test('minimum bids match the database rule and public rows hide other golfers',()=>{
 assert.equal(minimumBid({highest_bid:0,starting_bid:40}),40);
 assert.equal(minimumBid({highest_bid:100,starting_bid:40}),105);
 assert.equal(minimumBid({highest_bid:10,starting_bid:1}),11);
 assert.equal(minimumBid({highest_bid:1001,starting_bid:1}),1052);
 const row={id:ID,seller_id:A,bidder_id:B,item:{id:'x',category:'ball',fallback:'y'},starting_bid:5,buyout:null,highest_bid:9,bid_count:2,status:'active',ends_at:new Date(Date.now()-1).toISOString()};
 const view=publicAuction(row,B,{[A]:'seller_a'});
 assert.equal(view.seller,'seller_a');assert.equal(view.leading,true);assert.equal(view.status,'ending');
 assert.equal(view.bidder_id,undefined);assert.equal(view.seller_id,undefined);assert.deepEqual(view.item,{id:'x'});
 assert.equal(publicAuction(row,A).leading,false);
});
test('auction API rejects guests and low levels, and sends server-built listings to the atomic RPC',async()=>{
 const f=fixture();
 await assert.rejects(auctionAction('auctions',{...golfer(A),is_guest:true},{},f.db),/level 5/);
 await assert.rejects(auctionAction('auctions',golfer(A,100),{},f.db),/level 5/);
 const p=golfer(A),r=await auctionAction('auction_create',p,{requestId:ID,item:{id:plain[0].id,category:'ball',fallback:'ball-pirate'},startingBid:100,buyout:300,hours:72},f.db);
 const call=f.calls.find(c=>c.name==='auction_create').params;
 assert.equal(call.p_user,A);assert.equal(call.p_revision,3);assert.equal(call.p_hours,72);assert.equal(call.p_buyout,300);
 assert.equal(call.p_item.fallback,DEFAULT_EQUIPMENT[plain[0].category],'Clients cannot choose the fallback equipment');
 assert.equal(call.p_item.category,plain[0].category);
 assert.equal(r.auction.seller,'seller_a');assert.equal(r.auction.mine,true);
 await assert.rejects(auctionAction('auction_create',p,{requestId:'nope',item:{id:plain[0].id},startingBid:1,hours:6},f.db),/Invalid/);
});
test('bids, instant buys and cancels pass whole amounts and request IDs through',async()=>{
 const f=fixture(),p=golfer(B);
 await auctionAction('auction_bid',p,{auctionId:ID,requestId:RQ,amount:150},f.db);
 await auctionAction('auction_buy',p,{auctionId:ID,requestId:RQ,amount:300},f.db);
 await auctionAction('auction_cancel',p,{auctionId:ID,requestId:RQ,amount:999},f.db);
 const sent=f.calls.filter(c=>c.name==='auction_action').map(c=>[c.params.p_action,c.params.p_amount,c.params.p_user,c.params.p_request]);
 assert.deepEqual(sent,[['bid',150,B,RQ],['buy',300,B,RQ],['cancel',null,B,RQ]]);
 for(const amount of [0,-5,1.5,'100',2e9])await assert.rejects(auctionAction('auction_bid',p,{auctionId:ID,requestId:RQ,amount},f.db),/whole coin/);
 await assert.rejects(auctionAction('auction_bid',p,{auctionId:'x',requestId:RQ,amount:5},f.db),/Choose/);
 await assert.rejects(auctionAction('auction_steal',p,{},f.db),/Unknown/);
});
test('loading the auction house settles ended listings first and returns listable inventory',async()=>{
 const f=fixture(),p=golfer(A);
 f.rows.push({id:ID,seller_id:B,bidder_id:A,item:{id:plain[0].id,category:'ball',fallback:'y'},starting_bid:5,buyout:50,highest_bid:5,bid_count:1,status:'active',ends_at:new Date(Date.now()+60e3).toISOString(),created_at:new Date().toISOString()});
 const r=await auctionAction('auctions',p,{},f.db);
 assert.equal(f.calls[0].name,'auction_sweep');
 assert.ok(f.calls.some(c=>c.name==='table'&&c.q.includes('status=eq.active')));
 assert.ok(f.calls.some(c=>c.name==='table'&&c.q.includes('or=(seller_id.eq.'+A+',bidder_id.eq.'+A+')')));
 assert.equal(r.auctions[0].leading,true);assert.equal(r.auctions[0].seller,'buyer_b');
 assert.deepEqual(r.inventory,[{id:plain[0].id}]);assert.equal(r.coins,5000);
});
test('browse filters by name, seller and category, and sorts by price, ending time or rarity',()=>{
 const t=Date.now(),mk=(i,item,seller,price,mins)=>({id:String(i),item:{id:item.id},seller,starting_bid:price,highest_bid:0,ends_at:new Date(t+mins*60e3).toISOString(),created_at:new Date(t-i*1e3).toISOString()});
 const list=[mk(1,plain[0],'alice',500,30),mk(2,plain[1],'bob',100,90),mk(3,plain[2],'carol',300,10)];
 assert.deepEqual(filterAuctions(list,{sort:'price'}).map(a=>a.id),['2','3','1']);
 assert.deepEqual(filterAuctions(list,{sort:'ending'}).map(a=>a.id),['3','1','2']);
 assert.deepEqual(filterAuctions(list,{query:'BOB'}).map(a=>a.id),['2']);
 assert.deepEqual(filterAuctions(list,{query:plain[2].name.slice(0,6)}).map(a=>a.id).includes('3'),true);
 assert.ok(filterAuctions(list,{category:plain[0].category}).every(a=>ITEMS.find(i=>i.id===a.item.id).category===plain[0].category));
 assert.equal(timeLeft(new Date(t+(26*60+5)*60e3).toISOString(),t),'1d 2h left');
 assert.equal(timeLeft(new Date(t+125*60e3).toISOString(),t),'2h 5m left');
 assert.equal(timeLeft(new Date(t-1).toISOString(),t),'Ending now');
});
