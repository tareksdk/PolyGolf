import { DEFAULT_EQUIPMENT } from './catalog.js';

export const BOT_NAMES = ['Birdie Bot','Cedar Bot','Chip Bot','Putter Bot','Sandy Bot','Robin Bot','Bogey Bot'];
// Round totals: 30% +1, 40% even, 26% -1, 3% -2, 1% -3.
export function botRound(pars, random = Math.random) {
  const roll=random(), offset=roll<.01?-3:roll<.04?-2:roll<.30?-1:roll<.70?0:1;
  const strokes=pars.slice();
  for(let n=0;n<Math.abs(offset);n++){
    const candidates=strokes.map((v,i)=>i).filter(i=>offset>0||strokes[i]>1);
    const i=candidates[Math.min(candidates.length-1,Math.floor(random()*candidates.length))];
    if(i!==undefined)strokes[i]+=Math.sign(offset);
  }
  return strokes.map((strokes,i)=>({par:pars[i],strokes}));
}
export const botHoleDuration = strokes => (strokes*7+4)*1000;
export function makeBot(pars, index=0, random=Math.random) {
  return {id:'bot-'+crypto.randomUUID(),name:BOT_NAMES[index%BOT_NAMES.length],bot:true,ready:true,
    nameplate:'nameplate-classic',delay:index*.65,lane:index-3,equipment:{...DEFAULT_EQUIPMENT,trail:'trail-fire'},plan:botRound(pars,random),scores:[],nextHole:0};
}

// Presentation follows the server's saved score plan and clock. It never submits scores.
export function botPresentation(member, ui, time) {
  const match=ui.ranked?.match, room=ui.cloud.room?.state, ranked=!!match?.bot&&ui.game.round?.competitiveId===match.id;
  let index=room?.hole||0, started=room?.botHoleStartedAt, plan=member.plan, sudden=false;
  if(ranked){
    plan=match.bot.plan;started=Date.parse(match.created_at);index=0;
    if(match.phase==='sudden'){sudden=true;started=Date.parse(match.sudden_started);index=ui.game.index;}
    else while(index<plan.length-1&&time-started>=botHoleDuration(plan[index].strokes)){started+=botHoleDuration(plan[index].strokes);index++;}
  }
  if(!plan?.[index]||!Number.isFinite(started))return null;
  if(!ranked)started+=(member.delay||0)*1000;
  const hole=ui.game.hole, key=sudden?`sudden:${match.sudden_round}`:String(index);
  // Other-hole packets retain their hole key; the renderer shows an away marker.
  const count=sudden?1:plan[index].strokes, elapsed=Math.max(0,(time-started)/1000), shot=Math.min(count-1,Math.floor(Math.max(0,elapsed-2)/7)), phase=(elapsed-2-shot*7), moving=phase>=.7&&phase<4.7;
  const route=hole.route||hole.samples?.map(p=>[p.x,p.z])||[[hole.start.x,hole.start.z],[hole.cup.x,hole.cup.z]];
  const point=t=>{if(t>=1)return{x:hole.cup.x,z:hole.cup.z};if(t<=0)return{x:hole.start.x,z:hole.start.z};const f=t*(route.length-1),a=route[Math.floor(f)],b=route[Math.min(route.length-1,Math.floor(f)+1)],u=f%1;return{x:a[0]+(b[0]-a[0])*u,z:a[1]+(b[1]-a[1])*u};};
  const from=point(shot/count),to=point((shot+1)/count),lane=(member.lane??1)*(hole.mode==='golf'?.65:.09);
  from.x+=lane*(1-shot/count);to.x+=lane*(1-(shot+1)/count);
  if(sudden){to.x+=Number(match.bot.distance)||7;}
  const f=Math.max(0,Math.min(1,(phase-.7)/4)),dist=Math.hypot(to.x-from.x,to.z-from.z),golf=hole.mode==='golf',flight=golf&&dist>22;
  const x=from.x+(to.x-from.x)*f,z=from.z+(to.z-from.z)*f,y=ui.world.renderGround(x,z)+(golf?.03:.25)+(flight?Math.sin(f*Math.PI)*Math.min(20,dist*.16):0);
  const at=Math.round(time),sunk=!sudden&&elapsed>=count*7;
  return {v:1,seq:at,at,hole:key,ball:{x,y,z,vx:moving?(to.x-from.x)/4:0,vy:0,vz:moving?(to.z-from.z)/4:0},anchor:{...from,y:ui.world.renderGround(from.x,from.z)},dx:(to.x-from.x)/(dist||1),dz:(to.z-from.z)/(dist||1),club:flight?'driver':'putter',active:moving&&!sunk,sunk,equipment:member.equipment||match?.bot?.equipment||DEFAULT_EQUIPMENT,swing:phase>=0?{id:Math.round(started+shot*7000),at:Math.round(started+2000+shot*7000)}:null};
}
