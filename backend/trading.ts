import {tradeInventory,validateOffer,exchangeItems} from './shared/trades.js';
import {publicProfile} from './shared/profile-data.js';
const uuid = (s:any) => typeof s==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
export async function tradingAction(action:string,p:any,b:any,db:any) {
 const {table,rpc,insert,limited}=db;
 const participant=(t:any)=>t.sender_id===p.id||t.receiver_id===p.id;
 async function friend(target:string) {
  if(!uuid(target)||target===p.id)throw Error('Choose a friend to trade with.');
  const pair=[p.id,target].sort();
  const relation=(await table('friends','user_low=eq.'+pair[0]+'&user_high=eq.'+pair[1]+'&status=eq.accepted'))[0];
  if(!relation)throw Error('Add this golfer as a friend before trading.');
  const other=(await table('players','id=eq.'+target))[0];if(!other)throw Error('Golfer not found.');return other;
 }
 if(action==='trade_inventory') {
  const other=await friend(b.userId);
  return {profile:publicProfile(other),yours:tradeInventory(p.state),theirs:tradeInventory(other.state)};
 }
 if(action==='trades') {
  const rows=await table('trades','or=(sender_id.eq.'+p.id+',receiver_id.eq.'+p.id+')&order=created_at.desc&limit=60');
  const ids=[...new Set(rows.flatMap((t:any)=>[t.sender_id,t.receiver_id]))];
  const people=ids.length?await table('players','id=in.('+ids.join(',')+')&select=id,username'):[];
  return {trades:rows.map((t:any)=>({...t,status:t.status==='pending'&&Date.parse(t.expires_at)<Date.now()?'expired':t.status,sender:people.find((x:any)=>x.id===t.sender_id)?.username||'Golfer',receiver:people.find((x:any)=>x.id===t.receiver_id)?.username||'Golfer'}))};
 }
 if(action==='trade_create') {
  await limited('trade:'+p.id,10,600);
  if(!uuid(b.requestId))throw Error('Invalid trade request.');
  const existing=(await table('trades','id=eq.'+b.requestId))[0];
  if(existing){if(existing.sender_id!==p.id)throw Error('Invalid trade request.');return{trade:existing};}
  const other=await friend(b.userId),offered=validateOffer(b.offered,p.state),requested=validateOffer(b.requested,other.state);
  exchangeItems(p.state,other.state,offered,requested);
  const pending=await table('trades','sender_id=eq.'+p.id+'&status=eq.pending&expires_at=gt.'+new Date().toISOString()+'&select=id&limit=20');
  if(pending.length>=20)throw Error('Finish or cancel an existing offer first.');
  return{trade:(await insert('trades',{id:b.requestId,sender_id:p.id,receiver_id:other.id,offered,requested}))[0]};
 }
 if(!uuid(b.tradeId))throw Error('Choose a trade first.');
 const t=(await table('trades','id=eq.'+b.tradeId))[0];
 if(!t||!participant(t))throw Error('Trade not found.');
 if(action==='trade_accept') {
  if(t.receiver_id!==p.id)throw Error('Only the recipient can accept an offer.');
  if(t.status==='accepted')return{state:p.state,duplicate:true};
  if(t.status!=='pending'||Date.parse(t.expires_at)<Date.now())throw Error('This offer is no longer available.');
  const sender=await friend(t.sender_id);
  const states=exchangeItems(sender.state,p.state,t.offered,t.requested);
  const outcome=await rpc('trade_accept',{p_user:p.id,p_trade:t.id,p_sender_revision:sender.revision,p_receiver_revision:p.revision,p_sender_state:states.sender,p_receiver_state:states.receiver});
  return{state:outcome.state,duplicate:outcome.duplicate};
 }
 if(action==='trade_close')return{status:await rpc('trade_close',{p_user:p.id,p_trade:t.id})};
 throw Error('Unknown trade action.');
}
