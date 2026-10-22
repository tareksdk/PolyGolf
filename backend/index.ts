import { tradeUp } from './shared/trade-ups.js';
import {auctionAction} from './auctions.ts';
import { NEW_HOLE_EFFECT_IDS } from './shared/hole-effects-catalog.js';
import {courseAvailable,courseRotationKey} from './shared/rotating-courses.js';
import {roomAction} from './rooms.ts';
import {rankFor,awardRankPlates} from './shared/ranks.js';
import {halloweenActive} from './shared/season.js';
import {grantPattern,rollPattern} from './shared/finishes.js';
import {claimSocialReward} from './shared/community-rewards.js';
import {openLocker,openLockers,buyBundle,LOCKERS} from './shared/pro-shop.js';
import {tradingAction} from './trading.ts';
import {socialAction} from './social.ts';
import {competitiveAction} from './competitive.ts';
import {publicProfile} from './shared/profile-data.js';
import {defaultSave,ProgressionManager,levelInfo} from './shared/save.js';
import {ITEM_BY_ID,ITEMS,ALPHA_ITEMS} from './shared/catalog.js';
import {GOLF_COURSES,getGolfHole,golfHoleCount,RULES_VERSION} from './shared/golf-courses.js';
import {COURSES,getHole} from './shared/courses.js';
import {joinClub,claimTier,claimClubDaily,requireEditor,buyMemberItem,membership} from './shared/equipment.js';
import {validateMap} from './shared/maps.js';
import {normalizeUsername} from './shared/usernames.js';
import {verifyHole} from './shared/replay.js';

const URL=Deno.env.get('SUPABASE_URL')!,KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const origins=new Set(['https://littlelinks.study','https://www.littlelinks.study','https://polygolf.lol','https://www.polygolf.lol','https://room-310.com','https://www.room-310.com','https://papaya-gecko-9391bd.netlify.app','https://dapper-mochi-14469a.netlify.app','https://little-links-golf-room310.tarekgreenfield.chatgpt.site','https://little-links-golf.netlify.app','http://127.0.0.1:5173','http://localhost:5173']);
async function api(path:string,body?:unknown,method=body?'POST':'GET',token=KEY){const r=await fetch(URL+path,{method,headers:{apikey:KEY,Authorization:'Bearer '+token,'Content-Type':'application/json',Prefer:'return=representation'},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json().catch(()=>null);if(!r.ok)throw Error(data?.msg||data?.message||data?.error_description||'The server could not complete that request.');return data;}
const table=(name:string,q='')=>api('/rest/v1/golf_'+name+'?'+q);
const rpc=(name:string,body:unknown)=>api('/rest/v1/rpc/golf_'+name,body);
const insert=(name:string,body:unknown)=>api('/rest/v1/golf_'+name,body);
const update=(name:string,q:string,body:unknown)=>api('/rest/v1/golf_'+name+'?'+q,body,'PATCH');
async function player(id:string){const p=(await table('players','id=eq.'+id))[0];if(!p)throw Error('This account is not a PolyGolf golfer.');return p;}
function progress(p:any){return new ProgressionManager({load:()=>structuredClone(p.state),save:()=>true});}
async function save(p:any,manager:any,extra={}){await rpc('commit',{p_user:p.id,p_revision:p.revision,p_state:manager.data,...extra});return manager.data;}
const info=(mode:string,index:number)=>{const c=(mode==='golf'?GOLF_COURSES:mode==='mini'?COURSES:[])[index];if(!c)throw Error('Unknown course.');return c;};
async function limited(key:string,limit=60,seconds=60){if(!await rpc('rate',{p_key:key,p_limit:limit,p_seconds:seconds}))throw Error('Too many requests. Please wait a minute.');}
async function hash(value:string){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join('');}
async function roundRandom(roundId:string,userId:string){
 // Server-secret deterministic rolls prevent retries or revision conflicts from rerolling a drop.
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(KEY),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const digest=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode('round-locker-v1:'+roundId+':'+userId));
 const view=new DataView(digest);let offset=0;return()=>view.getUint32((offset++%8)*4)/4294967296;
}
async function auth(action:string,b:any,req:Request){
 if(action==='guest'){
  const ip=req.headers.get('x-forwarded-for')?.split(',')[0]||'unknown';
  await limited('guest-ip:'+await hash(ip),20,3600);
  const username='guest_'+crypto.randomUUID().replaceAll('-','').slice(0,12),email=username+'@guests.littlelinks.invalid',password=crypto.randomUUID()+crypto.randomUUID();
  const user=await api('/auth/v1/admin/users',{email,password,email_confirm:true,app_metadata:{polygolf_guest:true}});
  try{
   const state=defaultSave();state.name=username;
   await insert('players',{id:user.id,username,state,is_guest:true});
   const session=await api('/auth/v1/token?grant_type=password',{email,password});
   return{session,username,state};
  }catch(e){await api('/auth/v1/admin/users/'+user.id,undefined,'DELETE').catch(()=>{});throw e;}
 }
 const username=String(b.username||'').trim().toLowerCase(),password=String(b.password||'');if(!/^[a-z0-9_]{3,20}$/.test(username))throw Error('Use 3–20 letters, numbers or underscores for your username.');if(password.length<6||password.length>128)throw Error('Password must contain 6–128 characters.');
 const ip=req.headers.get('x-forwarded-for')?.split(',')[0]||'unknown';await limited('auth-ip:'+await hash(ip),20,600);await limited('auth-name:'+await hash(username),12,600);
 let email:string,accountId:string;
 if(action==='signup'){
  if(b.policyAccepted!==true)throw Error('Confirm the age requirements and terms before creating an account.');
  if((await table('players','username=eq.'+username)).length)throw Error('That username is unavailable.');
  // Login names may change or be reused. Auth credentials belong to an immutable ID.
  email=crypto.randomUUID()+'@players.polygolf.invalid';
  const user=await api('/auth/v1/admin/users',{email,password,email_confirm:true,user_metadata:{display_name:username}});const id=user.id;
  accountId=id;
  try{const state=defaultSave();state.coins=5000;state.totalEarned=5000;state.name=username;state.policyAcceptance={version:'2026-10-04',at:new Date().toISOString(),ageConfirmed:true};await insert('players',{id,username,state});}catch(e){await api('/auth/v1/admin/users/'+id,undefined,'DELETE');throw e;}
 }else{
  try{
   const p=(await table('players','username=eq.'+username))[0];
   if(!p||p.is_guest)throw Error('Unavailable account.');
   const user=await api('/auth/v1/admin/users/'+p.id);
   if(!user?.email)throw Error('Unavailable credentials.');
   email=user.email;accountId=p.id;
  }catch{throw Error('Username or password is incorrect.');}
 }
 try{const session=await api('/auth/v1/token?grant_type=password',{email,password});if(session.user.id!==accountId)throw Error('Account mismatch.');const p=await player(accountId);return{session,state:p.state,username:p.username,usernameChanges:p.username_changes||0};}catch(e){if(action==='login')throw Error('Username or password is incorrect.');throw e;}
}
async function submit(p:any,b:any){
 const r=(await table('rounds','id=eq.'+encodeURIComponent(b.roundId)+'&user_id=eq.'+p.id))[0];if(!r)throw Error('Round not found.');if(r.rules_version!==RULES_VERSION)throw Error('This round uses an older course. Return to the clubhouse and start a new round.');if(!Number.isInteger(b.index)||b.index<0)throw Error('Invalid hole.');
 if(r.next_hole>b.index)return{state:p.state,result:r.holes[b.index],duplicate:true,finished:r.finished,bonus:r.holes[b.index]?.bonus};if(r.finished||r.next_hole!==b.index)throw Error('Finish the current hole first.');
 if(r.competitive_id){const s=await rpc('ranked_status',{p_user:p.id});if(s.match?.id!==r.competitive_id||s.match.phase!=='playing')throw Error('This competitive match has ended.');}
 if(r.room_id){const room=(await table('rooms','id=eq.'+r.room_id))[0];if(!room||room.state.phase!=='playing'||room.state.hole!==b.index||!room.state.members.some((m:any)=>m.id===p.id))throw Error('This room is not playing that hole.');}
 const result=verifyHole(r,b.index,b.transcript,b.endTick);const elapsed=(Date.now()-new Date(r.updated_at).getTime())/1000;if(result.time>elapsed+3)throw Error('Replay time is ahead of the server.');
 result.skipped=b.transcript.some((c:any)=>c.kind==='skip');const pm=progress(p);if(result.pirateHit)pm.discoverPirate();if(result.pumpkinHit)pm.discoverPumpkin();if(result.darbyFound)pm.discoverDarby();if(b.index===0)pm.data.stats.games++;const reward=result.skipped?{coins:0,xp:0}:pm.completeHole({...result,time:elapsed,round:{practice:false}});if(result.collectible&&!result.skipped)pm.collectible(false);
 const holes=[...r.holes,result],count=r.hole_count,finished=holes.length===count;let record=null,bonus={coins:0,xp:0};
 if(finished){const seconds=Math.round((Date.now()-new Date(r.created_at).getTime())/1000),round={mode:r.mode,courseIndex:r.course,rotationKey:r.rotation_key,practice:holes.some(h=>h.skipped),strokes:holes.map(h=>h.strokes),time:seconds};bonus=pm.completeCourse(round,holes.map(h=>h.par),await roundRandom(r.id,p.id));if(!holes.some(h=>h.skipped))record={username:p.username,strokes:round.strokes.reduce((a,b)=>a+b,0),score:holes.reduce((sum,h)=>sum+h.strokes-h.par,0),seconds,level:pm.level.level};}
 result.finished=finished;if(finished)result.bonus=bonus;const state=await save(p,pm,{p_round:r.id,p_hole:b.index,p_result:result,p_record:record});return{state,result,reward,bonus,finished};
}
const matchPlates=new Map();
async function enrichRanked(p:any,result:any){
 const pm=progress(p);if(awardRankPlates(pm,result.rating))result.state=await save(p,pm);
 const m=result.match;if(m){let plates=matchPlates.get(m.id);if(!plates){
  const rows=await table('rounds','id=in.('+[m.a_round,m.b_round].filter(Boolean).join(',')+')&select=id,equipment');
  plates={a_plate:rows.find((r:any)=>r.id===m.a_round)?.equipment?.nameplate,b_plate:m.bot?.equipment?.nameplate||rows.find((r:any)=>r.id===m.b_round)?.equipment?.nameplate};
  if(matchPlates.size>200)matchPlates.clear();matchPlates.set(m.id,plates);
 }Object.assign(m,plates);}return result;
}
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'',headers={'Content-Type':'application/json','Access-Control-Allow-Origin':origins.has(origin)?origin:'https://littlelinks.study','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin'};
 if(req.method==='OPTIONS')return new Response(null,{headers});if(req.method!=='POST')return new Response(JSON.stringify({error:'Use POST.'}),{status:405,headers});
 try{
  if(Number(req.headers.get('content-length')||0)>64000)throw Error('Request is too large.');const raw=await req.text();if(raw.length>64000)throw Error('Request is too large.');const b=JSON.parse(raw),action=b.action;if(['signup','login','guest'].includes(action))return new Response(JSON.stringify(await auth(action,b,req)),{headers});
  if(action==='ranked_leaderboard'){
   const ratings=await table('ratings','select=user_id,elo,wins,losses,matches&matches=gt.0&order=elo.desc,wins.desc,user_id.asc&limit=100');
   const players=ratings.length?await table('players','select=id,username&id=in.('+ratings.map((r:any)=>r.user_id).join(',')+')'):[];
   const rows=ratings.flatMap((r:any)=>{const p=players.find((p:any)=>p.id===r.user_id);return p?[{user_id:r.user_id,username:p.username,elo:r.elo,rank:rankFor(r.elo).name,wins:r.wins,losses:r.losses,matches:r.matches}]:[];});
   return new Response(JSON.stringify({rows}),{headers});
  }
  if(action==='community_maps'&&!req.headers.get('authorization'))return new Response(JSON.stringify({maps:await rpc('community_v2',{p_user:null,p_offset:Number.isInteger(b.offset)?b.offset:0,p_mode:b.mode==='golf'?'golf':'mini'})}),{headers});
  // Gateway JWT checks are disabled because signup is public. Every other action
  // verifies the bearer token with Supabase Auth; IDs supplied by clients never authorize access.
  const token=req.headers.get('authorization')?.replace(/^Bearer /i,'');if(!token)throw Error('Sign in to continue.');const user=await api('/auth/v1/user',undefined,'GET',token);const p=await player(user.id);p.state=progress(p).data;await limited('player:'+p.id,100,60);let result:any;if(['start_round','submit_hole','create_room','join_room','start_room'].includes(action)&&b.rulesVersion!==RULES_VERSION)throw Error('The courses have been updated. Reload PolyGolf before starting or continuing a round.');
  if(p.is_guest&&(['ranked_queue','ranked_status','ranked_shot','ranked_leave','trades','trade_inventory','trade_create','trade_accept','trade_close','redeem_code','publish_map','unpublish_map','like_map','friend_action'].includes(action)))throw Error('Create an account or sign in to use this feature. Guest multiplayer is available with room codes.');
  if(action==='community_maps')result={maps:await rpc('community_v2',{p_user:p.id,p_offset:Number.isInteger(b.offset)?b.offset:0,p_mode:b.mode==='golf'?'golf':'mini'})};
  else if(action==='me'){const rating=(await table('ratings','user_id=eq.'+p.id))[0],pm=progress(p);if(awardRankPlates(pm,rating)){p.state=await save(p,pm);}result={state:p.state,username:p.username,usernameChanges:p.username_changes||0,profile:publicProfile(p),maps:await table('maps','user_id=eq.'+p.id)};}
  else if(action==='honors_inbox')result={awards:await rpc('accolade_inbox',{p_user:p.id})};
  else if(action==='ack_accolade'){
   if(typeof b.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(b.id))throw Error('Choose a valid accolade.');
   result=await rpc('ack_accolade',{p_user:p.id,p_id:b.id});
  }
  else if(action==='gift_accolade'){
   if(p.is_guest)throw Error('Sign in to an account to give accolades.');
   if(typeof b.userId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(b.userId)||!['player','staff','oneshotstudios','room310','studios'].includes(b.kind)||!Number.isInteger(b.expectedCost))throw Error('Review the accolade before sending.');
   await limited('accolade:'+p.id,20,600);
   result=await rpc('gift_accolade',{p_user:p.id,p_target:b.userId,p_kind:b.kind,p_expected_cost:b.expectedCost});
  }
  else if(action==='change_username'){
   if(p.is_guest)throw Error('Sign in to a registered account to change your username.');
   const username=normalizeUsername(b.username);
   if(!Number.isInteger(b.expectedCost)||b.expectedCost<0||typeof b.requestId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(b.requestId))throw Error('Refresh your profile and try again.');
   await limited('username-change:'+p.id,12,600);
   result=await rpc('change_username',{p_user:p.id,p_username:username,p_expected_cost:b.expectedCost,p_request_id:b.requestId});
  }
  else if(['auctions','auction_create','auction_bid','auction_buy','auction_cancel'].includes(action))result=await auctionAction(action,p,b,{table,rpc,limited});
  else if(['trades','trade_inventory','trade_create','trade_accept','trade_close'].includes(action))result=await tradingAction(action,p,b,{table,rpc,insert,limited});
  else if(['profile','update_profile','search_players','friends','friend_action'].includes(action))result=await socialAction(action,p,b,{table,rpc,update});
  else if(['ranked_status','ranked_queue','ranked_leave','ranked_shot'].includes(action))result=await enrichRanked(p,await competitiveAction(action,p,b,{table,rpc}));
  else if(action==='start_round'){const c=info(b.mode,b.course);if(b.mode==='golf'&&!courseAvailable(b.course))throw Error('This featured course has rotated. Choose the current course.');if(levelInfo(p.state.xp).level<c.level)throw Error('Reach level '+c.level+' to unlock ranked play here.');const r=(await insert('rounds',{user_id:p.id,mode:b.mode,course:b.course,equipment:p.state.equipment,rules_version:RULES_VERSION,hole_count:b.mode==='golf'?golfHoleCount(b.course):9,rotation_key:b.mode==='golf'?courseRotationKey(b.course):''}))[0];result={roundId:r.id,rotationKey:r.rotation_key};}
  else if(action==='submit_hole')result=await submit(p,b);
  else if(action==='claim_ship'||action==='claim_pumpkin'||action==='claim_darby'){
   const darby=action==='claim_darby',pumpkin=action==='claim_pumpkin',discovery=darby?'darby':pumpkin?'pumpkin':'pirate';
   if(pumpkin&&!halloweenActive())throw Error('The Halloween event has ended. Your earned items are yours to keep.');
   if(p.state.achievementRewards?.includes(discovery))result={state:p.state,already:true};
   else {const r=(await table('rounds','id=eq.'+encodeURIComponent(b.roundId)+'&user_id=eq.'+p.id))[0];
    if(!r||r.finished||r.mode!=='golf'||!(darby?[0,14]:pumpkin?[2,16]:[1,15]).includes(r.course)||r.next_hole!==b.index||r.rules_version!==RULES_VERSION)throw Error('Start an online round on the discovery’s course to claim this reward.');
    const hit=verifyHole(r,b.index,b.transcript,b.endTick,{featureOnly:darby?'darby':pumpkin?'pumpkin':true});
    if(hit.time>(Date.now()-Date.parse(r.updated_at))/1000+3)throw Error('Replay time is ahead of the server.');
    const pm=progress(p);darby?pm.discoverDarby():pumpkin?pm.discoverPumpkin():pm.discoverPirate();result={state:await save(p,pm),unlocked:darby?['nameplate-darby']:pumpkin?['ball-pumpkin-find','nameplate-pumpkin-find']:['ball-pirate','nameplate-pirate']};
   }
  }
  else if(action==='claim_social'){const pm=progress(p),outcome=claimSocialReward(pm,b.id);result={state:outcome.duplicate?p.state:await save(p,pm),outcome};}
  else if(action==='buy_member_item'){const pm=progress(p),outcome=buyMemberItem(pm,b.id);result={state:await save(p,pm),outcome};}
  else if(action==='redeem_code'){
   await limited('gift:'+p.id,8,600);
   const digest=typeof b.code==='string'?await hash(b.code.trim()):'';
   const rewards:any={'f8f474a55befde8bbea518f35f96edfaa2a72a282104b96df2bf521ebde6a675':{id:'supreme-israel-ball-2026',tokens:0,items:['ball-israel'],message:'Israel Flag ball unlocked. Equip it in your caddie for a flag and fireworks on every sunk putt.'},
    '1e6288fee2b560c035a4d08666ef0038f035ad6b0bccc7f78f96ddc5195d6377':{id:'mystery-driver-2026',tokens:0,items:['driver-mystery'],message:'??? unlocked. Equip your secret driver in the Caddie.'},
    'e0c36904590e80e8a87c3feaf5ba196b706ca6fb6321e433c4a6a6fe0b33912e':{id:'new-hole-effects-2026',tokens:0,items:NEW_HOLE_EFFECT_IDS,message:'All ten new hole effects unlocked. Equip them in your Caddie.'},
    '43b1564ce21d50e46d7e23cccb9a5b5104c75f2bade76dded361c33cc052bf56':{id:'five-custom-plates-2026',tokens:0,items:['nameplate-midnight-ace','nameplate-solar-crown','nameplate-lucky-clover','nameplate-neon-comet','nameplate-royal-flush'],message:'Five custom nameplates unlocked: Midnight Ace, Solar Crown, Lucky Clover, Neon Comet and Royal Flush.'},
    'ad57366865126e55649ecb23ae1d48887544976efea46a48eb5d85a6eeb4d306':{id:'100-ten-thousand-coins-2026',tokens:10000,items:[],message:'10,000 coins added.'},
    '575da2ed41dccaedd5ae78a934f0398f5c15549a8b1417952d42e0ff1721f74b':{id:'oliver-everything-2026',tokens:1000000000,items:ITEMS.filter(i=>!i.supremeOnly).map(i=>i.id),allCollection:true,lockers:Object.fromEntries(LOCKERS.map(l=>[l.id,1])),message:'Collection items, Country Club membership, one of every locker, and 1,000,000,000 coins added. Exclusive ball codes remain separate.'},
    '1c4e54ee5d38af18f31e3d3053be138dcb77d65e25a415607ea9918939f20a57':{id:'room310-plate-2026',tokens:0,items:['nameplate-room310'],message:'Room310 nameplate unlocked.'},
    '3beeb4070bd955ee402745e021e359e7c9bd0e1d04942feff08a616223b5f793':{id:'oneshotstudios-plate-2026',tokens:0,items:['nameplate-oneshotstudios'],message:'OneShotStudios nameplate unlocked.'},
    '82b2706cdf507848ef25f499d99d7a23d03f671301cdd15604fcedf1cb290a32':{id:'studio-collab-plate-2026',tokens:0,items:['nameplate-studio-collab'],message:'Room310 X OneShotStudios nameplate unlocked.'},
    'bb8044c95c4fda5669c9bdfcce024a57601ae648a00c61ddf6dc3cc326228d65':{id:'developer-plate-2026',tokens:0,items:['nameplate-developer'],message:'Developer nameplate unlocked.'},
    '63b37ef73ba78fbaa2cdd1fb34e4ecb49cf1983f119cfd8f909d857fe4c33e14':{id:'staff-plate-2026',tokens:0,items:['nameplate-staff'],message:'Staff nameplate unlocked.'},
    '16d1551686f4cb08f88335d39d505708f5618bd8762c62fba9f9d1d3f3bdb850':{id:'100k-coins-2026',tokens:100000,items:[],message:'100,000 coins added.'},
    'c9d2b73882b29dd383e4fad19b9475907530ae174ef5ba7a1443069e694e2bcb':{id:'levi-forge-2026',tokens:0,items:[],lockers:{forge:20},message:'20 Forge Lockers added. Open them in Shop → Lockers. Thanks, Levi!'},
    '55e035849acb335467736ccd1b9f0fc5bf605d2a361ead01d2b505d2834bd382':{id:'million-links-2026',tokens:1000000,items:[],message:'1,000,000 tokens added.'},
    '109735c93d69a8c8ba909ecdc84cfc0d2fdacad225890aad720a25989bc11902':{id:'alpha-set-2026',tokens:0,items:ALPHA_ITEMS,message:'The complete Alpha Set is yours.'},
    '5b4e7aae7d6603c272aa47feb8dcbae3fb5cfb9e8f8cfba1869ee4afa83ea273':{id:'all-items-2026',tokens:0,items:ITEMS.filter(i=>!['membership','code','founder'].includes(i.source)&&(halloweenActive()||(!i.id.includes('halloween')&&!i.id.includes('pumpkin')))).map(i=>i.id),message:'Collection items added. Country Club, OG and code-only nameplates retain their exclusive unlocks.'}
   };
   const reward=rewards[digest];if(!reward)throw Error('That gift code is not active. Codes are case-sensitive.');
   const pm=progress(p);pm.data.giftClaims??=[];if(pm.data.giftClaims.includes(reward.id))throw Error('You have already redeemed this gift code.');
   if(reward.allCollection){
    // This explicit all-access code includes membership cosmetics. Persist their
    // entitlement so normal inventory cleanup and equipping keep them available.
    const pass=membership(pm);pass.member=true;
    pass.legacyItems=[...new Set([...(pass.legacyItems||[]),...ITEMS.filter(i=>i.source==='membership').map(i=>i.id)])];
   }
   const unlocked=reward.items.filter((id:string)=>!pm.data.owned.includes(id));pm.data.giftClaims.push(reward.id);pm.data.owned.push(...unlocked);pm.data.coins+=reward.tokens;pm.data.totalEarned+=reward.tokens;
   for(const id of unlocked)if(ITEM_BY_ID[id]?.finish)grantPattern(pm.data,ITEM_BY_ID[id],rollPattern(()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296));
   if(reward.lockers){pm.data.lockers??={};for(const [id,count] of Object.entries(reward.lockers))pm.data.lockers[id]=(pm.data.lockers[id]||0)+Number(count);}
   result={state:await save(p,pm),tokens:reward.tokens,unlocked,message:reward.message};
  }else if(action==='publish_map'){requireEditor(progress(p));
   const layout=validateMap(b.map);const rows=await table('public_maps','user_id=eq.'+p.id),existing=rows.find((m:any)=>m.name===layout.name);
   if(!existing&&rows.length>=30)throw Error('You can publish up to 30 maps. Update an existing name or unpublish one.');
   const values={name:layout.name,layout,author:p.username,published_at:new Date().toISOString()};
   const maps=existing?await update('public_maps','id=eq.'+existing.id,values):await insert('public_maps',{...values,user_id:p.id});result={map:maps[0]};
  }else if(action==='unpublish_map'){
   await api('/rest/v1/golf_public_maps?id=eq.'+encodeURIComponent(b.id)+'&user_id=eq.'+p.id,undefined,'DELETE');result={ok:true};
  }else if(action==='like_map'){
   if(typeof b.liked!=='boolean')throw Error('Choose whether to like this map.');result=await rpc('like_map',{p_user:p.id,p_map:b.id,p_liked:b.liked});
  }

  else if(['buy','equip','claim_login','claim_challenge','join_club','claim_tier','claim_club_daily'].includes(action)){
   const pm=progress(p);let outcome:any=true;
   if(action==='buy'){outcome=pm.buy(b.id);if(!outcome.ok)throw Error(outcome.message);}if(action==='equip'){if(!pm.equip(b.id,b.seed))throw Error('Earn or buy that item and pattern before equipping it.');}
   if(action==='claim_login'){outcome=pm.claimLogin();if(!outcome)throw Error('Today’s reward is already claimed.');}if(action==='claim_challenge'&&!pm.claimChallenge(b.id))throw Error('This challenge is not ready to claim.');if(action==='join_club')joinClub(pm);if(action==='claim_tier')claimTier(pm,b.tier);if(action==='claim_club_daily')claimClubDaily(pm);result={state:await save(p,pm),outcome};
  }else if(action==='trade_up'){
   if(p.is_guest)throw Error('Sign in to trade up items.');
   await limited('trade-up:'+p.id,20,60);const pm=progress(p);
   const random=await roundRandom('trade-up:'+b.requestId,p.id);
   const outcome=tradeUp(pm,b.items,b.requestId,random);result={state:await save(p,pm),outcome};
  }else if(action==='open_locker'||action==='buy_bundle'){const pm=progress(p);const random=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296;const outcome=action==='open_locker'?(b.count===undefined?openLocker(pm,b.id,b.requestId,random):openLockers(pm,b.id,b.count,b.requestId,random)):buyBundle(pm,b.id);result={state:await save(p,pm),outcome};}
  else if(action==='claim_achievement'){const pm=progress(p),outcome=pm.claimAchievement(b.id);result={state:await save(p,pm),outcome};}
  else if(action==='save_map'){requireEditor(progress(p));const layout=validateMap(b.map),existing=(await table('maps','user_id=eq.'+p.id+'&name=eq.'+encodeURIComponent(layout.name)))[0];if(existing)await update('maps','id=eq.'+existing.id,{layout,updated_at:new Date().toISOString()});else{const count=await table('maps','user_id=eq.'+p.id+'&select=id');if(count.length>=30)throw Error('Your account holds up to 30 maps. Reuse a name to update one.');await insert('maps',{user_id:p.id,name:layout.name,layout});}result={ok:true};}
  else if(['create_room','join_room','ready_room','replay_room','start_room','leave_room','room','add_room_bot','fill_room_bots','remove_room_bot'].includes(action))result=await roomAction(action,p,b,{table,rpc,insert,player,submit});
  else throw Error('Unknown action.');return new Response(JSON.stringify(result),{headers});
 }catch(e){return new Response(JSON.stringify({error:e instanceof Error?e.message:'Something went wrong.'}),{status:400,headers});}
});
