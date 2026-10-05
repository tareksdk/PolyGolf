import { ITEM_BY_ID, DEFAULT_EQUIPMENT } from './catalog.js';
import { validSeed } from './finishes.js';

export const liveHole = game => game.round?.sudden ? `sudden:${game.round.suddenRound}` : String(game.index);
export function liveScope(ui) {
  const id = ui.cloud.session?.user.id, game = ui.game;
  if (!id || game.state === 'menu' || !game.round) return null;
  const m = ui.ranked?.match;
  if (m && game.round.competitiveId === m.id && ['playing','sudden'].includes(m.phase)) {
    return { key:`ranked:${m.id}`, members:[{id:m.a_id,name:m.a_name,nameplate:m.a_plate},{id:m.b_id,name:m.b_name,nameplate:m.b_plate}] };
  }
  const room = ui.cloud.room;
  if (room?.state.phase === 'playing' && room.state.members.some(p=>p.id===id && p.roundId===game.round.cloudId)) {
    return {key:`room:${room.id}`,members:room.state.members.slice(0,8)};
  }
  return null;
}
const finite = (x, max=10000) => typeof x==='number' && Number.isFinite(x) && Math.abs(x)<=max;
const point = p => p && ['x','y','z'].every(k=>finite(p[k]));
export function cleanLiveState(s) {
  if (!s || s.v!==1 || !Number.isSafeInteger(s.seq) || s.seq<0 || !Number.isSafeInteger(s.at) ||
      typeof s.hole!=='string' || !/^(?:[0-8]|sudden:\d{1,4})$/.test(s.hole) || !point(s.ball) || !point(s.anchor) ||
      !finite(s.dx,1.01) || !finite(s.dz,1.01) || !['driver','3w','5w','4i','5i','6i','7i','8i','9i','pw','gw','sw','lw','putter'].includes(s.club)) return null;
  const equipment={...DEFAULT_EQUIPMENT,patterns:{}};
  for (const category of ['ball','club','driver','trail','hole','nameplate','emote']) {
    const id=s.equipment?.[category];
    if (ITEM_BY_ID[id]?.category===category) equipment[category]=id;
    const seed=s.equipment?.patterns?.[id];
    if (validSeed(seed)) equipment.patterns[id]=seed;
  }
  const ball={};
  for(const key of ['x','y','z']) ball[key]=s.ball[key];
  for(const key of ['vx','vy','vz']) ball[key]=finite(s.ball[key],250)?s.ball[key]:0;
  const event = e => e && Number.isSafeInteger(e.id) && e.id>=0 && Number.isSafeInteger(e.at) ? {id:e.id,at:e.at} : null;
  const emote=event(s.emote), swing=event(s.swing);
  if(emote) emote.item=ITEM_BY_ID[s.emote.item]?.category==='emote'?s.emote.item:null;
  return {v:1,seq:s.seq,at:s.at,hole:s.hole,ball,anchor:{x:s.anchor.x,y:s.anchor.y,z:s.anchor.z},dx:s.dx,dz:s.dz,
    club:s.club,active:!!s.active,sunk:!!s.sunk,equipment,emote,swing};
}

// Arrival-time interpolation avoids relying on synchronized clocks. Extrapolation is
// bounded so a disconnected player can never keep flying across the course.
export class LiveBuffer {
  constructor(){this.samples=[];this.lastAt=0;this.seq=-1;}
  push(state,now){
    if(state.at<this.lastAt || (state.at===this.lastAt && state.seq<=this.seq)) return false;
    if(this.samples.at(-1)?.state.hole!==state.hole) this.samples.length=0;
    this.lastAt=state.at;this.seq=state.seq;
    this.samples.push({state,time:now});if(this.samples.length>12)this.samples.shift();return true;
  }
  sample(now,delay=200){
    const a=this.samples;if(!a.length)return null;
    const target=now-delay;
    let left=a[0],right=a[0];
    for(const row of a){if(row.time<=target)left=row;if(row.time>=target){right=row;break;}right=row;}
    if(left===right){
      const dt=right.state.active?Math.max(0,Math.min(.15,(target-right.time)/1000)):0;
      const ball={...right.state.ball};
      for(const [k,v] of [['x','vx'],['y','vy'],['z','vz']])ball[k]+=ball[v]*dt;
      return {...right.state,ball};
    }
    if(Math.hypot(left.state.ball.x-right.state.ball.x,left.state.ball.z-right.state.ball.z)>45) return left.state;
    const t=Math.max(0,Math.min(1,(target-left.time)/(right.time-left.time)));
    const ball={...left.state.ball},anchor={...left.state.anchor};
    for(const k of ['x','y','z']){ball[k]+=(right.state.ball[k]-ball[k])*t;anchor[k]+=(right.state.anchor[k]-anchor[k])*t;}
    return {...left.state,ball,anchor};
  }
}
