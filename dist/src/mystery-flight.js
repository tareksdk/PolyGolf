// This trajectory is shared by the client and the server's verified shot replay.
// The capability is derived from owned equipment, never from submitted shot data.
export function startMysteryFlight(physics, ground) {
  const from = {...physics.ball}, cup = physics.hole.cup;
  const to = {x:cup.x, y:ground(cup.x,cup.z)+.021335, z:cup.z};
  const distance = Math.hypot(to.x-from.x,to.z-from.z);
  let arc = Math.max(4,Math.min(65,distance*.18));
  for(let i=1;i<24;i++) {
    const t=i/24, x=from.x+(to.x-from.x)*t, z=from.z+(to.z-from.z)*t;
    arc=Math.max(arc,(ground(x,z)+12-(from.y+(to.y-from.y)*t))/Math.sin(Math.PI*t));
  }
  physics.mysteryFlight={from,to,arc,duration:Math.max(2.4,Math.min(5,distance/85)),elapsed:0};
  physics.active=true;physics.airborne=true;physics.shotTime=0;physics.still=0;
  physics.previous={...physics.ball};
}
export function updateMysteryFlight(physics,dt) {
  const f=physics.mysteryFlight;if(!f)return false;
  f.elapsed+=dt;const t=Math.min(1,f.elapsed/f.duration),u=t*t*(3-2*t),b=physics.ball;
  const x=f.from.x+(f.to.x-f.from.x)*u,z=f.from.z+(f.to.z-f.from.z)*u;
  const y=f.from.y+(f.to.y-f.from.y)*u+Math.sin(Math.PI*u)*f.arc;
  b.vx=(x-b.x)/dt;b.vy=(y-b.y)/dt;b.vz=(z-b.z)/dt;
  b.x=x;b.y=y;b.z=z;
  if(t===1){b.vx=b.vy=b.vz=0;physics.active=false;physics.airborne=false;physics.sunk=true;physics.mysteryFlight=null;physics.events.push('cup');}
  return true;
}
