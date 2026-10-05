import {PhysicsManager,FIXED_STEP} from '../dist/src/physics.js';
import {getHole,nearestPoint} from '../dist/src/courses.js';
// A deterministic shot planner exercises the real solver from tee to cup.
const courses=process.argv.includes('--all')?[0,1,2,3,4]:[0];let failed=0;
for(const c of courses){const scores=[];for(let h=0;h<9;h++){let p=new PhysicsManager();p.load(getHole(c,h));let shots=0;
 while(!p.sunk&&shots<24){const n=nearestPoint(p.hole,p.ball.x,p.ball.z),targets=[-.03,0,.03,.06,.13,.22,.34,.5,.8].map(v=>p.hole.samples[Math.max(0,Math.min(153,Math.round((n.t+v)*160)))]);targets.push(p.hole.cup);let best=null;
 for(const target of targets){for(const power of [.015,.035,.06,.1,.16,.22,.28,.45,.65,.85]){const q=new PhysicsManager();q.load(p.hole);q.ball={...p.ball};q.time=p.time;q.shoot(target.x-q.ball.x,target.z-q.ball.z,power);for(let step=0;step<5000&&q.active;step++){q.update(FIXED_STEP);if(q.events.includes('water'))break;}const np=nearestPoint(q.hole,q.ball.x,q.ball.z),distance=Math.hypot(q.ball.x-q.hole.cup.x,q.ball.z-q.hole.cup.z);const score=q.sunk?100000:q.events.includes('water')||q.active?-1000:np.t*100-distance*.2-np.distance*.4;if(!best||score>best.score)best={score,p:q};if(q.sunk)break;}if(best?.p.sunk)break;}
 if(!best||best.score<0)break;p=best.p;shots++;p.events=[];
 }scores.push(p.sunk?shots:'FAIL');if(!p.sunk)failed++;}
 console.log(`Course ${c+1}: ${scores.join(', ')}`);}
if(failed){console.error(`${failed} holes did not complete with the bounded shot planner.`);process.exitCode=1;}else console.log('Every tested hole completed from its actual tee using the shipped physics.');
