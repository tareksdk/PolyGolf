import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {PhysicsManager,FIXED_STEP} from '../dist/src/physics.js';
import {getHole,nearestPoint} from '../dist/src/courses.js';
import {verifyHole} from '../dist/src/replay.js';
import {RULES_VERSION} from '../dist/src/golf-courses.js';
import {SUPABASE_URL,PUBLISHABLE_KEY} from '../dist/src/cloud.js';
const qa=JSON.parse(await readFile('.sites-runtime/golf-qa.json','utf8')),session=qa.b.session;
async function call(action,data={}){const res=await fetch(SUPABASE_URL+'/functions/v1/little-links',{method:'POST',headers:{apikey:PUBLISHABLE_KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({action,rulesVersion:RULES_VERSION,...data})});const value=await res.json();if(value.error)throw Error(value.error);return value;}
const start=Date.now(),round=await call('start_round',{mode:'mini',course:0}),transcript=[];let p=new PhysicsManager();p.load(getHole(0,0));let ticks=0;
while(!p.sunk&&transcript.length<8){const n=nearestPoint(p.hole,p.ball.x,p.ball.z),targets=[.13,.3,.5,.8].map(v=>p.hole.samples[Math.min(153,Math.round((n.t+v)*160))]);targets.push(p.hole.cup);let best;
 for(const target of targets)for(const power of [.02,.06,.16,.28,.45,.65,.85]){const q=new PhysicsManager();q.load(p.hole);q.ball={...p.ball};q.time=p.time;const len=Math.hypot(target.x-q.ball.x,target.z-q.ball.z),dx=(target.x-q.ball.x)/len,dz=(target.z-q.ball.z)/len;q.shoot(dx,dz,power);let steps=0;while(q.active&&steps<5000){q.update(FIXED_STEP);steps++;if(q.events.includes('water'))break;}const np=nearestPoint(q.hole,q.ball.x,q.ball.z),distance=Math.hypot(q.ball.x-q.hole.cup.x,q.ball.z-q.hole.cup.z),score=q.sunk?100000:q.events.includes('water')||q.active?-1000:np.t*100-distance*.2-np.distance*.4;if(!best||score>best.score)best={q,steps,score,command:{kind:'shot',tick:ticks,dx,dz,power,shape:0,spin:0,club:'putter'}};}
 transcript.push(best.command);ticks+=best.steps;p=best.q;p.events=[];
}
assert.ok(p.sunk);const verified=verifyHole({mode:'mini',course:0,equipment:{}},0,transcript,ticks);assert.equal(verified.strokes,transcript.length);const remaining=ticks/120*1000-(Date.now()-start);if(remaining>0)await new Promise(r=>setTimeout(r,remaining));
const before=(await call('me')).state.coins,result=await call('submit_hole',{roundId:round.roundId,index:0,transcript,endTick:ticks});assert.ok(result.reward.coins>0);assert.ok(result.state.coins>before);const dup=await call('submit_hole',{roundId:round.roundId,index:0,transcript,endTick:ticks});assert.equal(dup.state.coins,result.state.coins);console.log(JSON.stringify({shots:transcript.length,seconds:ticks/120,reward:result.reward,duplicateRewardPrevented:true}));
