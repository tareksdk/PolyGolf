import {botPresentation} from './bots.js';
import { SUPABASE_URL, PUBLISHABLE_KEY } from './cloud.js';
import { liveScope, liveHole, cleanLiveState } from './live-state.js';
import { LiveTransport } from './live-transport.js';
import { LiveOpponent } from './live-opponents.js';

export function installLiveRound(ui){
  let transport,key,scope,anchor,anchorHole,lastSend=0,lastFlags='',lastRefresh=0,seq=0,swing=null,emote=null;
  const peers=new Map(),world=ui.world,game=ui.game;
  const layer=document.createElement('div');layer.className='opponents-layer';layer.setAttribute('aria-label','Live opponents');document.body.append(layer);
  const clear=()=>{transport?.close();transport=null;key=null;scope=null;for(const p of peers.values())p.dispose();peers.clear();anchor=null;lastFlags='';};
  const receive=(id,packet)=>{const peer=peers.get(id),state=cleanLiveState(packet);if(peer&&state)peer.buffer.push(state,performance.now());};
  const capture=()=>{
    const b=game.physics.ball;if(!b)return null;
    const hole=liveHole(game);
    if(anchorHole!==hole||!anchor){anchor={x:b.x,y:b.y,z:b.z};anchorHole=hole;swing=null;emote=null;}
    if(!game.physics.active&&!game.pendingSwing&&!game.physics.sunk)anchor={x:b.x,y:b.y,z:b.z};
    return {v:1,seq:++seq,at:Date.now(),hole,ball:{x:b.x,y:b.y,z:b.z,vx:b.vx||0,vy:b.vy||0,vz:b.vz||0},anchor,
      dx:game.direction.x,dz:game.direction.z,club:game.mode==='mini'?'putter':game.club,active:!!game.physics.active,sunk:!!game.physics.sunk,
      equipment:world.equipment,swing,emote};
  };
  const update=world.update.bind(world);
  world.update=(dt,...args)=>{
    const next=liveScope(ui),id=ui.cloud.session?.user.id;
    const nextKey=next?`${id}:${next.key}:${next.members.map(p=>p.id).sort().join(',')}`:null;
    if(nextKey!==key){
      clear();key=nextKey;scope=next;
      if(next){
        for(const m of next.members)if(m.id!==id)peers.set(m.id,new LiveOpponent(world,m,layer));
        if(next.members.some(m=>m.id!==id&&!m.bot)&&ui.cloud.session?.access_token)transport=new LiveTransport({url:SUPABASE_URL,key:PUBLISHABLE_KEY,token:ui.cloud.session.access_token,user:id,scope:{...next,members:next.members.filter(m=>!m.bot)},receive});
      }
    }
    const now=performance.now();
    if(scope){
      const moving=game.physics.active||game.pendingSwing||world.emotePose;
      const interval=moving?(peers.size>3?334:167):1000;
      const flags=`${liveHole(game)}:${!!game.physics.active}:${!!game.physics.sunk}:${swing?.id}:${emote?.id}`;
      if(transport&&(now-lastSend>=interval||flags!==lastFlags)){const state=capture();if(state&&transport.publish(state)){lastSend=now;lastFlags=flags;}}
      if(now-lastRefresh>30000){lastRefresh=now;ui.cloud.refresh?.().then(()=>transport?.updateToken(ui.cloud.session?.access_token)).catch(()=>{});}
      for(const p of peers.values())if(p.member.bot&&now-(p.botSampleAt||0)>=100){
        p.botSampleAt=now;
        const packet=botPresentation(p.member,ui,Date.now()+(ui.cloud.serverOffset||0));
        if(packet?.ball)p.buffer.push(packet,now);
        else if(packet){const last=p.buffer.samples.at(-1)?.state;if(last)p.buffer.push({...last,hole:packet.hole,at:Date.now(),seq:Date.now()},now);else {p.group.visible=false;p.label.hidden=ui.progress.data.settings.showOpponents===false;p.label.classList.add('is-away');p.status.textContent='Bot · On hole '+(Number(packet.hole)+1);}}
      }
      for(const p of peers.values())p.update(dt,now,liveHole(game),ui.progress.data.settings.showOpponents!==false,peers.size>3?370:200);
    }
    update(dt,...args);
  };
  const beginSwing=world.beginSwing?.bind(world);
  world.beginSwing=(ball,dir,club)=>{
    anchor={x:ball.x,y:ball.y,z:ball.z};anchorHole=liveHole(game);swing={id:Date.now(),at:Date.now()};lastSend=0;
    beginSwing?.(ball,dir,club);
  };
  const fire=game.fire.bind(game);
  game.fire=shot=>{if(game.mode==='mini'){const b=game.physics.ball;anchor={x:b.x,y:b.y,z:b.z};anchorHole=liveHole(game);swing={id:Date.now(),at:Date.now()};lastSend=0;}return fire(shot);};
  ui.liveRound={emote:id=>{emote={id:Date.now(),at:Date.now(),item:id};lastSend=0;},clear};
  window.addEventListener('pagehide',clear);
}
