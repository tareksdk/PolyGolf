import assert from 'node:assert/strict';
import {GolfPhysics,CLUBS} from '../dist/src/golf-physics.js';
import {getGolfHole,terrainAt} from '../dist/src/golf-courses.js';
// A bounded, deterministic planner plays the actual authored courses, including wind and hazards.
for(let c=0;c<3;c++)for(let index=0;index<3;index++){
 const h=getGolfHole(c,index);let current=new GolfPhysics();current.load(h);let shots=0;
 while(!current.sunk&&shots<14){
  const distance=Math.hypot(h.cup.x-current.ball.x,h.cup.z-current.ball.z),angle=Math.atan2(h.cup.x-current.ball.x,h.cup.z-current.ball.z),lie=terrainAt(h,current.ball.x,current.ball.z).surface;
  const clubs=distance<16?[CLUBS.at(-1)]:CLUBS.filter(v=>v.id!=='putter'&&v.carry>distance*.7&&v.carry<distance*1.65);if(!clubs.length)clubs.push(CLUBS[0]);let best;
  const tryShot=(club,power,a)=>{const p=new GolfPhysics();p.load(h);p.ball={...current.ball};p.shoot(Math.sin(a),Math.cos(a),Math.max(.01,Math.min(1,power)),{club});let steps=0;while(p.active&&steps++<5500)p.update(1/120);const score=p.sunk?-1:p.events.includes('water')||p.active?1e5:Math.hypot(h.cup.x-p.ball.x,h.cup.z-p.ball.z);if(!best||score<best.score)best={p,score,club,power:Math.max(.01,Math.min(1,power)),a};};
  for(const club of clubs){const power=club.id==='putter'?Math.sqrt(distance/36):Math.min(1,(distance/club.carry)**.6)/(lie==='rough'?.87:1);for(const offset of[-.06,0,.06])tryShot(club.id,power+offset,angle);}
  for(const [dp,da] of[[.08,.035],[.025,.012],[.008,.004],[.0025,.0013],[.0008,.0004]]){for(let cycle=0;cycle<3&&best.score>0;cycle++){const b=best;for(const offset of[-1,1]){tryShot(b.club,b.power+dp*offset,b.a);tryShot(b.club,b.power,b.a+da*offset);}if(best===b)break;}}
  current=best.p;shots++;if(best.score>=1e5)break;
 }
 assert.ok(current.sunk,`${h.course.name} / ${h.name} did not finish`);console.log(`${h.course.name} / ${h.name}: ${shots} shots, cup reached.`);
}
