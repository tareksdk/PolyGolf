import {publicProfile,validateProfile} from './shared/profile-data.js';

const listColumns='id,username,avatar,xp:state->xp,member:state->clubPass->member';
const profileColumns='id,username,bio,avatar,created_at,xp:state->xp,clubPass:state->clubPass,equipment:state->equipment,stats:state->stats,owned:state->owned';
const listProfile=(p:any)=>({id:p.id,username:p.username,avatar:p.avatar||'',xp:Number(p.xp??p.state?.xp)||0,member:!!(p.member??p.state?.clubPass?.member)});
const profileRow=(p:any)=>p.state?p:{...p,state:{xp:p.xp,clubPass:p.clubPass,equipment:p.equipment,stats:p.stats,owned:p.owned}};

export async function socialAction(action:string,p:any,b:any,db:any){
 const {table,rpc,update}=db;
 if(action==='update_profile'){const values=validateProfile(b);await update('players','id=eq.'+p.id,values,false);return{profile:publicProfile({...p,...values})};}
 const relationQuery=(target:string)=>'user_low=eq.'+[p.id,target].sort()[0]+'&user_high=eq.'+[p.id,target].sort()[1];
 if(action==='search_players'){
  const q=String(b.query||'').trim().toLowerCase();if(!/^[a-z0-9_]{2,20}$/.test(q))throw Error('Search with at least two letters, numbers or underscores.');
  const rows=await table('players','username=ilike.'+encodeURIComponent(q.replaceAll('_','\\_')+'*')+'&select='+listColumns+'&order=username&limit=20');return{profiles:rows.map(listProfile)};
 }
 if(action==='friends'||action==='notifications'){
  const inbox=await table('trades','receiver_id=eq.'+p.id+'&status=eq.pending&expires_at=gt.'+new Date().toISOString()+'&select=id&limit=100');
  const rows=await table('friends','or=(user_low.eq.'+p.id+',user_high.eq.'+p.id+')&select=user_low,user_high,status,requested_by&order=updated_at.desc&limit=200');
  if(action==='notifications'){
   const entries=rows.map((r:any)=>({id:r.user_low===p.id?r.user_high:r.user_low,relationship:r.status,incoming:r.requested_by!==p.id}));
   return{tradeInbox:inbox.length,friends:entries.filter((r:any)=>r.relationship==='accepted').map(({id}:any)=>({id})),incoming:entries.filter((r:any)=>r.relationship==='pending'&&r.incoming).map(({id}:any)=>({id})),outgoing:entries.filter((r:any)=>r.relationship==='pending'&&!r.incoming).map(({id}:any)=>({id}))};
  }
  const ids=rows.map((r:any)=>r.user_low===p.id?r.user_high:r.user_low);if(!ids.length)return{friends:[],incoming:[],outgoing:[],tradeInbox:inbox.length};
  const players=await table('players','id=in.('+ids.join(',')+')&select='+listColumns);
  const list=rows.map((r:any)=>{const target=players.find((t:any)=>t.id===(r.user_low===p.id?r.user_high:r.user_low));return target?{...listProfile(target),relationship:r.status,incoming:r.requested_by!==p.id}:null;}).filter(Boolean);
  return{tradeInbox:inbox.length,friends:list.filter((r:any)=>r.relationship==='accepted'),incoming:list.filter((r:any)=>r.relationship==='pending'&&r.incoming),outgoing:list.filter((r:any)=>r.relationship==='pending'&&!r.incoming)};
 }
 const target=String(b.userId||'').toLowerCase();if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(target))throw Error('Choose a golfer first.');
 if(action==='friend_action')return{relationship:await rpc('friend_action',{p_user:p.id,p_target:target,p_action:b.operation})};
 const row=(await table('players','id=eq.'+target+'&select='+profileColumns))[0];if(!row)throw Error('This golfer could not be found.');
 const [relations,honors,bests]=await Promise.all([
  target===p.id?Promise.resolve([]):table('friends',relationQuery(target)),
  rpc('profile_honors',{p_user:target,p_viewer:p.id}),rpc('profile_bests',{p_user:target})
 ]);
 const rel=relations[0];
 return{profile:{...publicProfile(profileRow(row)),honors,bests},relationship:rel?{status:rel.status,incoming:rel.requested_by!==p.id}:null};
}
