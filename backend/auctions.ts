import {tradeInventory} from './shared/trades.js';
import {validateListing,publicAuction,AUCTION_LEVEL} from './shared/auctions.js';
import {levelInfo} from './shared/save.js';
const uuid = (s:any) => typeof s==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
// Items and coins only move inside the service-only golf_auction_* functions, which lock rows and are idempotent per request ID.
export async function auctionAction(action:string,p:any,b:any,db:any) {
 const {table,rpc,limited}=db;
 if(p.is_guest||levelInfo(p.state.xp||0).level<AUCTION_LEVEL)throw Error('The auction house unlocks for accounts at level 5.');
 async function names(rows:any[]) {
  const ids=[...new Set(rows.map((a:any)=>a.seller_id))];
  const people=ids.length?await table('players','id=in.('+ids.join(',')+')&select=id,username'):[];
  return Object.fromEntries(people.map((x:any)=>[x.id,x.username]));
 }
 const shown=async(row:any)=>publicAuction(row,p.id,await names([row]));
 if(action==='auctions') {
  // Settle ended listings lazily so sellers are paid even without a scheduled sweep.
  await rpc('auction_sweep',{}).catch(()=>0);
  const now=new Date().toISOString();
  const [market,mine]=await Promise.all([
   table('auctions','status=eq.active&ends_at=gt.'+now+'&order=ends_at.asc&limit=80'),
   table('auctions','or=(seller_id.eq.'+p.id+',bidder_id.eq.'+p.id+')&order=created_at.desc&limit=40')
  ]);
  const people=await names([...market,...mine]);
  return {auctions:market.map((a:any)=>publicAuction(a,p.id,people)),mine:mine.map((a:any)=>publicAuction(a,p.id,people)),inventory:tradeInventory(p.state),coins:p.state.coins||0};
 }
 if(action==='auction_create') {
  await limited('auction:'+p.id,10,600);
  if(!uuid(b.requestId))throw Error('Invalid auction request.');
  const listing=validateListing(b.item,p.state,b.startingBid,b.buyout??null,b.hours);
  const outcome=await rpc('auction_create',{p_user:p.id,p_id:b.requestId,p_revision:p.revision,p_item:listing.item,p_start:listing.start,p_buyout:listing.buyout,p_hours:listing.hours});
  return {auction:await shown(outcome.auction),state:outcome.state,duplicate:!!outcome.duplicate};
 }
 if(!['auction_bid','auction_buy','auction_cancel'].includes(action))throw Error('Unknown auction action.');
 await limited('auction-bid:'+p.id,40,600);
 if(!uuid(b.auctionId)||!uuid(b.requestId))throw Error('Choose an auction first.');
 const kind=action.slice(8),amount=kind==='cancel'?null:b.amount;
 // Instant buys send the buyout the golfer saw; the database rejects a changed price.
 if(kind!=='cancel'&&!(Number.isSafeInteger(amount)&&amount>=1&&amount<=1000000000))throw Error('Enter a whole coin amount.');
 const outcome=await rpc('auction_action',{p_user:p.id,p_id:b.auctionId,p_action:kind,p_amount:amount,p_request:b.requestId});
 return {auction:await shown(outcome.auction),state:outcome.state,closed:!!outcome.closed,duplicate:!!outcome.duplicate};
}
