import {courseAvailable,courseRotationKey} from './shared/rotating-courses.js';
import {levelInfo} from './shared/save.js';
import {GOLF_COURSES,getGolfHole,golfHoleCount,RULES_VERSION} from './shared/golf-courses.js';
import {COURSES,getHole} from './shared/courses.js';
import {makeBot,botHoleDuration,BOT_NAMES} from './shared/bots.js';
export async function roomAction(action:string,p:any,b:any,api:any){
 const {table,rpc,insert,player,submit}=api;
 const info=(mode:string,index:number)=>{const c=(mode==='golf'?GOLF_COURSES:mode==='mini'?COURSES:[])[index];if(!c)throw Error('Unknown course.');return c;};
 if(action==='create_room'){info(b.mode,b.course);const c=info(b.mode,b.course);if(b.mode==='golf'&&!courseAvailable(b.course))throw Error('This featured course has rotated. Choose the current course.');if(levelInfo(p.state.xp).level<c.level)throw Error('Unlock this course before hosting it.');const code=Array.from(crypto.getRandomValues(new Uint8Array(6)),v=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[v%32]).join('');const state={host:p.id,phase:'waiting',mode:b.mode,course:b.course,rulesVersion:RULES_VERSION,rotationKey:b.mode==='golf'?courseRotationKey(b.course):'',hole:0,members:[{id:p.id,name:p.username,nameplate:p.state.equipment.nameplate,ready:true,seen:Date.now()}],deadline:0};return{serverNow:Date.now(),room:(await insert('rooms',{code,state}))[0]};}
 for(let attempt=0;attempt<4;attempt++){
  const query=action==='join_room'?'code=eq.'+encodeURIComponent(String(b.code).trim().toUpperCase()):'id=eq.'+encodeURIComponent(b.roomId);const r=(await table('rooms',query))[0];if(!r)throw Error('Room not found. Check the six-character code.');const s=structuredClone(r.state);let member=s.members.find((m:any)=>m.id===p.id);
  if(action==='join_room'){if(s.phase!=='waiting')throw Error('This round has already started.');if(!member){if(s.members.length>=8){const bot=s.members.findIndex((m:any)=>m.bot);if(bot<0)throw Error('This room is full.');s.members.splice(bot,1);}s.members.push({id:p.id,name:p.username,nameplate:p.state.equipment.nameplate,ready:false,seen:Date.now()});member=s.members.at(-1);}}
  if(!member)throw Error('You are not a member of this room.');if(action!=='leave_room'&&s.rulesVersion!==RULES_VERSION)throw Error('This lobby uses an older course. Leave it and create a new room.');if(s.phase==='starting'){if(action==='room')return{serverNow:Date.now(),room:r};throw Error('The round is starting. Please wait.');}member.seen=Date.now();member.nameplate=p.state.equipment.nameplate;
  if(action==='leave_room'){s.members=s.members.filter((m:any)=>m.id!==p.id);if(s.host===p.id)s.host=s.members.find((m:any)=>!m.bot)?.id||null;if(!s.members.some((m:any)=>!m.bot)){s.members=[];s.phase='closed';}}
  if(['add_room_bot','fill_room_bots','remove_room_bot'].includes(action)){
   if(s.host!==p.id||s.phase!=='waiting')throw Error('Only the host can change bots before the round starts.');
   if(action==='remove_room_bot'){if(!s.members.some((m:any)=>m.bot&&m.id===b.botId))throw Error('Bot not found.');s.members=s.members.filter((m:any)=>m.id!==b.botId);}
   else {if(s.members.length>=8)throw Error('This room is full.');const count=action==='fill_room_bots'?8-s.members.length:1;
    const pars=Array.from({length:s.mode==='golf'?golfHoleCount(s.course):9},(_,i)=>(s.mode==='golf'?getGolfHole(s.course,i):getHole(s.course,i)).par);
    for(let i=0;i<count;i++){const used=new Set(s.members.map((m:any)=>m.name));const nameIndex=BOT_NAMES.findIndex(n=>!used.has(n));s.members.push(makeBot(pars,Math.max(0,nameIndex)));}
   }
  }
  if(action==='ready_room'){if(s.phase!=='waiting')throw Error('The round has started.');member.ready=!member.ready;}
  if(action==='start_room'){
   if(s.host!==p.id||s.phase!=='waiting'||s.members.length<2||s.members.some((m:any)=>!m.ready))throw Error('The host can start when at least two golfers are ready.');
   s.phase='starting';try{await rpc('room_cas',{p_id:r.id,p_revision:r.revision,p_state:s});}catch(e){if(attempt<3)continue;throw e;}
   try{const players=await table('players','id=in.('+s.members.filter((m:any)=>!m.bot).map((m:any)=>m.id).join(',')+')');const rounds=await insert('rounds',players.map((pl:any)=>({user_id:pl.id,room_id:r.id,mode:s.mode,course:s.course,equipment:pl.state.equipment,rules_version:RULES_VERSION,hole_count:s.mode==='golf'?golfHoleCount(s.course):9,rotation_key:s.rotationKey||''})));s.members.filter((m:any)=>!m.bot).forEach((m:any)=>m.roundId=rounds.find((rr:any)=>rr.user_id===m.id).id);s.phase='playing';s.botHoleStartedAt=Date.now();s.deadline=Date.now()+360000;await rpc('room_cas',{p_id:r.id,p_revision:r.revision+1,p_state:s});return{serverNow:Date.now(),room:{...r,state:s,revision:r.revision+2}};}catch(e){s.phase='waiting';await rpc('room_cas',{p_id:r.id,p_revision:r.revision+1,p_state:s}).catch(()=>{});throw e;}
  }
  if(s.phase==='playing'){
   let rounds=await table('rounds','room_id=eq.'+r.id);if(Date.now()>s.deadline){for(const rr of rounds.filter((rr:any)=>rr.next_hole<=s.hole&&s.members.some((m:any)=>m.id===rr.user_id))){const pl=await player(rr.user_id);await submit(pl,{roundId:rr.id,index:rr.next_hole,transcript:[{kind:'skip',tick:0}],endTick:0});}rounds=await table('rounds','room_id=eq.'+r.id);}
   s.members.forEach((m:any)=>{if(m.bot){if(Date.now()-s.botHoleStartedAt>=botHoleDuration(m.plan[s.hole].strokes)+(m.delay||0)*1000&&m.nextHole===s.hole){m.scores.push(m.plan[s.hole].strokes);m.nextHole++;}return;}const rr=rounds.find((rr:any)=>rr.user_id===m.id);m.scores=rr?.holes.map((h:any)=>h.strokes)||[];m.nextHole=rr?.next_hole||0;});
   if(s.members.every((m:any)=>m.nextHole>s.hole)){s.hole++;s.botHoleStartedAt=Date.now();s.deadline=Date.now()+360000;if(s.hole>=(s.mode==='golf'?golfHoleCount(s.course):9))s.phase='finished';}
  }
  if(s.host&&!s.members.some((m:any)=>m.id===s.host&&Date.now()-m.seen<120000))s.host=p.id;
  try{const rev=await rpc('room_cas',{p_id:r.id,p_revision:r.revision,p_state:s});return{serverNow:Date.now(),room:{...r,state:s,revision:rev}};}catch(e){if(attempt===3)throw e;}
 }
}
