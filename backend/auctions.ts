import {tradeInventory,validateOffer} from './shared/trades.js';
import {ITEM_BY_ID,DEFAULT_EQUIPMENT} from './shared/catalog.js';
import {levelInfo} from './shared/save.js';
const uuid=(s:any)=>typeof s==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
export async function auctionAction(action:string,p:any,b:any,db:any){
 const {table,rpc,limited}=db;
 if(p.is_guest||levelInfo(p.state.xp||0).level<5)throw Error('The auction house unlocks for accounts at level 5.');
 if(action==='auctions'){
  await rpc('auction_sweep',{});
  const scope=['mine','bids'].includes(b.scope)?b.scope:'market';
  const filter=scope==='mine'?'seller_id=eq.'+p.id:scope==='bids'?'bidder_id=eq.'+p.id:'status=eq.active&ends_at=gt.'+new Date().toISOString();
  const offset=Number.isSafeInteger(b.offset)?Math.max(0,Math.min(10000,b.offset)):0;
  const rows=await table('auctions',filter+'&order=created_at.desc,id.desc&limit=101&offset='+offset);
  const ids=[...new Set(rows.slice(0,100).map((a:any)=>a.seller_id))];
  const people=ids.length?await table('players','id=in.('+ids.join(',')+')&select=id,username'):[];
  const fresh=(await table('players','id=eq.'+p.id))[0];
  return {auctions:rows.slice(0,100).map((a:any)=>({...a,seller:people.find((x:any)=>x.id===a.seller_id)?.username||'Golfer'})),more:rows.length>100,inventory:tradeInventory(fresh.state),state:fresh.state};
 }
 await limited('auction:'+p.id,30,60);
 if(action==='auction_create'){
  if(!uuid(b.requestId))throw Error('Invalid auction request.');
  // Retried listing calls must reach the idempotent database function after escrow removal.
  const existing=(await table('auctions','id=eq.'+b.requestId))[0];
  if(existing){if(existing.seller_id!==p.id)throw Error('Invalid auction request.');return {auction:existing,state:p.state,duplicate:true};}
  const entry=validateOffer([b.item],p.state)[0],item=ITEM_BY_ID[entry.id];
  if(!Number.isSafeInteger(b.start)||b.start<1||b.start>1e9||![6,24,72].includes(b.hours)||!(b.buyout===null||Number.isSafeInteger(b.buyout)&&b.buyout>=b.start&&b.buyout<=1e9))throw Error('Enter whole coin prices and a valid duration.');
  return await rpc('auction_create',{p_user:p.id,p_id:b.requestId,p_revision:p.revision,p_item:{...entry,category:item.category,fallback:DEFAULT_EQUIPMENT[item.category]},p_start:b.start,p_buyout:b.buyout,p_hours:b.hours});
 }
 const operation={auction_bid:'bid',auction_buy:'buy',auction_cancel:'cancel'}[action];
 if(!operation||!uuid(b.auctionId)||!uuid(b.requestId))throw Error('Invalid auction request.');
 if(operation!=='cancel'&&(!Number.isSafeInteger(b.amount)||b.amount<1||b.amount>1e9))throw Error('Enter a whole coin amount between 1 and 1,000,000,000.');
 return await rpc('auction_action',{p_user:p.id,p_id:b.auctionId,p_action:operation,p_amount:operation==='cancel'?null:b.amount,p_request:b.requestId});
}
