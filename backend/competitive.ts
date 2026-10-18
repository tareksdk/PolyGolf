import {levelInfo} from './shared/save.js';
import {COMPETITIVE_LEVEL,verifySudden} from './shared/competitive-rules.js';
import {RULES_VERSION} from './shared/golf-courses.js';
export async function competitiveAction(action:string,p:any,b:any,api:any){
 const {rpc,table}=api;
 if(action==='ranked_status')return await rpc('ranked_status',{p_user:p.id});
 if(action==='ranked_queue'){if(p.is_guest)throw Error('Sign in to compete.');if(b.rulesVersion!==RULES_VERSION)throw Error('Reload PolyGolf before joining the queue.');return await rpc('ranked_join',{p_user:p.id,p_equipment:p.state.equipment,p_version:RULES_VERSION});}
 if(action==='ranked_leave')return await rpc('ranked_leave',{p_user:p.id,p_forfeit:b.forfeit===true});
 if(action==='ranked_shot'){
  const state=await rpc('ranked_status',{p_user:p.id}),m=state.match;if(!m||m.id!==b.matchId)throw Error('This sudden-death attempt is no longer active.');
  if(m.phase==='finished'||b.suddenRound<m.sudden_round||(m.phase==='sudden'&&b.suddenRound===m.sudden_round&&(m.a_id===p.id?m.a_distance:m.b_distance)!==null))return state;
  if(m.phase!=='sudden'||b.suddenRound!==m.sudden_round)throw Error('This sudden-death attempt is no longer active.');
  const round=(await table('rounds','id=eq.'+(m.a_id===p.id?m.a_round:m.b_round)+'&user_id=eq.'+p.id))[0];if(!round)throw Error('Match round not found.');
  const result=verifySudden(round.equipment,b.transcript,b.endTick),elapsed=(Date.now()-Date.parse(m.sudden_started))/1000;if(result.time>elapsed+3)throw Error('Replay time is ahead of the match clock.');
  return await rpc('ranked_shot',{p_user:p.id,p_match:m.id,p_round:m.sudden_round,p_distance:result.distance});
 }
 throw Error('Unknown competitive action.');
}
