import {publicProfile,validateProfile} from './shared/profile-data.js';

export async function socialAction(action:string,p:any,b:any,db:any){
 const {table,rpc,update}=db;
 if(action==='update_profile'){const values=validateProfile(b);await update('players','id=eq.'+p.id,values);return{profile:publicProfile({...p,...values})};}
 const relationQuery=(target:string)=>'user_low=eq.'+[p.id,target].sort()[0]+'&user_high=eq.'+[p.id,target].sort()[1];
 if(action==='search_players'){
  const q=String(b.query||'').trim().toLowerCase();if(!/^[a-z0-9_]{2,20}$/.test(q))throw Error('Search with at least two letters, numbers or underscores.');
  const rows=await table('players','username=ilike.'+encodeURIComponent(q.replaceAll('_','\\_')+'*')+'&order=username&limit=20');return{profiles:rows.map(publicProfile)};
 }
 if(action==='friends'){
  const inbox=await table('trades','receiver_id=eq.'+p.id+'&status=eq.pending&expires_at=gt.'+new Date().toISOString()+'&select=id&limit=100');
  const rows=await table('friends','or=(user_low.eq.'+p.id+',user_high.eq.'+p.id+')&order=updated_at.desc&limit=200');
  const ids=rows.map((r:any)=>r.user_low===p.id?r.user_high:r.user_low);if(!ids.length)return{friends:[],incoming:[],outgoing:[],tradeInbox:inbox.length};
  const players=await table('players','id=in.('+ids.join(',')+')');
  const list=rows.map((r:any)=>{const target=players.find((t:any)=>t.id===(r.user_low===p.id?r.user_high:r.user_low));return target?{...publicProfile(target),relationship:r.status,incoming:r.requested_by!==p.id}:null;}).filter(Boolean);
  return{tradeInbox:inbox.length,friends:list.filter((r:any)=>r.relationship==='accepted'),incoming:list.filter((r:any)=>r.relationship==='pending'&&r.incoming),outgoing:list.filter((r:any)=>r.relationship==='pending'&&!r.incoming)};
 }
 const target=String(b.userId||'').toLowerCase();if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(target))throw Error('Choose a golfer first.');
 if(action==='friend_action')return{relationship:await rpc('friend_action',{p_user:p.id,p_target:target,p_action:b.operation})};
 const row=(await table('players','id=eq.'+target))[0];if(!row)throw Error('This golfer could not be found.');
 const rel=target===p.id?null:(await table('friends',relationQuery(target)))[0];
 return{profile:publicProfile(row),relationship:rel?{status:rel.status,incoming:rel.requested_by!==p.id}:null};
}
