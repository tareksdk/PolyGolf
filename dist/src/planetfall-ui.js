import * as THREE from '../vendor/three.module.js';
import { PLANETS, PLANETFALL_INDEX, PLANETFALL_CLUBS, nextPlanet, readPlanetfallBoard, recordPlanetfall } from './planetfall.js';
import { PlanetfallCamera, updatePlanetfallScene } from './planetfall-render.js';
import { button, esc, minutes } from './views.js';

function boardRows() {
  const rows=readPlanetfallBoard();
  return rows.length ? `<div class="table-scroll"><table class="ranking-table planetfall-board"><thead><tr><th>#</th><th>Golfer</th><th>Farthest reached</th><th>Shots</th><th>Time</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.name)}</td><td><i style="--planet:${PLANETS[r.reached].color}"></i>${PLANETS[r.reached].name}${r.finished?' · Holed out':''}</td><td>${r.shots}</td><td>${minutes(r.time)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="planetfall-empty"><strong>The first launch is yours.</strong><p>Land on another planet to set your first distance record.</p></div>';
}
export function installPlanetfall(ui) {
  const g=ui.game,w=ui.world;
  const render=ui.render.bind(ui),tick=ui.tick.bind(ui),launch=ui.launch.bind(ui),action=ui.action.bind(ui),pause=ui.pause.bind(ui),holeComplete=ui.holeComplete.bind(ui);
  const load=w.load.bind(w),update=w.update.bind(w),event=g.onEvent,leave=g.leave.bind(g);
  const projection=new THREE.Vector3();
  let runId=null,boardOpen=false,stored=false,lastReached=0;
  const active=()=>!!g.hole?.space && g.state!=='menu';
  const saveRun=()=>{
    if(!runId || !g.hole?.space || (g.strokes===0 && g.round.penalties===0))return;
    try {
      recordPlanetfall({id:runId,name:ui.progress.data.name,reached:g.physics.reached||0,shots:g.strokes,time:g.elapsed,finished:g.physics.sunk});stored=true;
    } catch {stored=false;ui.toast('Device storage is full or unavailable. This run could not be saved.');}
  };
  const briefing=()=>`<div class="planetfall-brief"><span class="eyebrow">THE INTERPLANETARY CHALLENGE</span><h2>One hole.<br>All the way to the Sun.</h2><p>Launch from Neptune and land on each planet in order. Every gap is longer. Every landing is tighter.</p><div class="planetfall-rules"><div><strong>01</strong><span><b>Pick an iron. Land precisely.</b>Only the small, flat cap is safe. The dotted shot guide includes bounce and roll.</span></div><div><strong>02</strong><span><b>Three chances per launch.</b>A miss or asteroid hit costs one chance. Return to your last safe landing. R recalls the ball for one chance.</span></div><div><strong>03</strong><span><b>Thread the asteroid belt.</b>Moving rocks between Jupiter and Mars can hit your ball. Watch, wait, then swing.</span></div><div><strong>04</strong><span><b>Finish on the Sun.</b>All eight planets, then the Sun. Use the putter for the final cup. No par, no stroke limit.</span></div></div><p class="small-note">Hold Space and release to lock power; press Space again to lock direction. ← / → fine aim · C changes iron · F resets the camera. On touch, tap and hold the course instead.</p>${button('Launch from Neptune →','planetfall-go','','button yellow wide')}<p class="planetfall-local-note">Best runs saved on this device · No account needed.</p></div>`;
  ui.launch=async(index,practice=false)=>{
    if(ui.mode!=='golf'||index!==PLANETFALL_INDEX)return launch(index,practice);
    if(ui.cloud.room){ui.toast('Leave your multiplayer room before launching Planetfall.');return;}
    ui.closeModal();ui.modal(briefing(),{wide:true,close:true});
  };
  w.load=h=>{
    if(!h.space && w.cameraRig instanceof PlanetfallCamera){w.cameraRig=w.planetfallPreviousRig;w.planetfallScene=null;w.renderer.localClippingEnabled=false;}
    load(h);
    if(h.space){
      if(!(w.cameraRig instanceof PlanetfallCamera))w.planetfallPreviousRig=w.cameraRig;
      w.cameraRig=new PlanetfallCamera(w);
    }
  };
  w.update=(dt,ball,physics)=>{
    if(w.hole.space)updatePlanetfallScene(w,w.presentationPaused?0:dt,physics);
    update(dt,ball,physics);
  };
  g.onEvent=name=>{
    if(!g.hole?.space)return event(name);
    if(name==='space-miss')return;
    if(name==='space-lost'){
      const b=g.physics.ball;w.burst(b.x,b.y,b.z,'#f1b176',22);
      const remaining=Math.max(0,3-g.round.penalties);
      ui.toast(`${g.round.missReason} · ${remaining} ${remaining===1?'chance':'chances'} left`);
      saveRun();ui.audio.play('penalty');return;
    }
    if(name==='planet'){
      if(g.physics.reached>lastReached){
        lastReached=g.physics.reached;saveRun();
        const p=PLANETS[lastReached];w.burst(p.x,1,p.z,p.padColor,18);
        ui.toast(lastReached===8?(g.physics.sunk?'Holed out on the Sun!':'Sun landing secured. Putt for the finish.'):`${p.name} landing secured · Next: ${nextPlanet(lastReached).name}`);
      }
      return;
    }
    if(name==='cup'&&!g.physics.sunk)return;
    return event(name);
  };
  g.leave=()=>{if(active())saveRun();return leave();};
  ui.render=()=>{
    render();document.body.classList.toggle('planetfall-playing',active());
    if(!active())return;
    const hud=ui.root.querySelector('.play-hud');if(!hud)return;
    hud.classList.add('planetfall-hud');
    const reached=g.physics.reached||0,current=PLANETS[reached],next=nextPlanet(reached),stats=hud.querySelector('.ph-stats');
    stats.innerHTML=`<div class="ph-stat"><span>On planet</span><strong>${current.name}</strong></div><div class="ph-stat"><span>Chances</span><strong>${Math.max(0,3-g.round.penalties)}<small>/3</small></strong></div><div class="ph-stat ph-strokes"><span>Shots</span><strong>${g.strokes}</strong></div><div class="ph-stat"><span>Journey</span><strong>${reached}<small>/8</small></strong></div>`;
    hud.querySelector('.ph-wind')?.remove();hud.querySelector('.camera-mode')?.remove();hud.querySelector('.camera-skip')?.remove();
    const reset=hud.querySelector('[data-action="reset"]');if(reset){reset.title='Recall ball (costs one chance)';reset.setAttribute('aria-label',reset.title);}
    const club=hud.querySelector('#shot-club');
    for(const opt of [...club.options])if(!PLANETFALL_CLUBS.includes(opt.value)&&!(opt.value==='putter'&&reached===8))opt.remove();
    for(const opt of hud.querySelectorAll('.club-option'))if(!PLANETFALL_CLUBS.includes(opt.dataset.id)&&!(opt.dataset.id==='putter'&&reached===8))opt.remove();
    club.value=g.club;
    hud.querySelector('.ph-tools')?.insertAdjacentHTML('beforeend',button('↺','planetfall-recenter','aria-label="Recenter camera (F)" title="Recenter camera (F)"','icon-button'));
    const overview=hud.querySelector('[data-action="overview"]');if(overview){overview.dataset.action='planetfall-overview';overview.textContent='Wide view';}
    hud.insertAdjacentHTML('afterbegin',`<header class="planetfall-heading"><div><span class="planetfall-kicker">PLANETFALL <b>01 / 01 · NO PAR</b></span><h1>${g.physics.sunk?'Hello, sunshine.':reached===8?'The final putt.':`Next stop: ${next.name}.`}</h1><p>${g.physics.sunk?'Eight planets. One hole. Holed out.':reached===8?'Find the cup on the Sun.':`${Math.round(Math.hypot(next.x-g.physics.ball.x,next.z-g.physics.ball.z))} m to landing · ${(next.pad*2).toFixed(0)} m safe cap`}${reached===3?' · Watch the asteroid belt':''}</p></div>${button('Distance board ↗','planetfall-board','','planetfall-board-button')}</header><nav class="planetfall-route" aria-label="Journey from Neptune to the Sun">${PLANETS.map(p=>`<span style="--planet:${p.color}" class="${p.index<reached?'visited':p.index===reached?'current':''}" ${p.index===reached?'aria-current="step"':''}><i></i><b>${p.name}</b></span>`).join('')}</nav><div class="planetfall-target" id="planetfall-target"><span>${g.physics.sunk?'HOLED OUT':reached===8?'FINAL CUP':`LANDING ${String(reached+2).padStart(2,'0')}`}</span><strong>${reached===8?'Sun':next.name}</strong><small>${g.physics.sunk?'Mission complete':reached===8?'Putt to finish':`${(next.pad*2).toFixed(0)} m safe cap`}</small></div>`);
    document.getElementById('hole-intro')?.remove();
    ui.cacheHud();
  };
  ui.tick=()=>{
    tick();if(!active())return;
    const p=g.physics.reached===8?g.hole.cup:nextPlanet(g.physics.reached),target=document.getElementById('planetfall-target');
    if(target){
      projection.set(p.x,8,p.z).project(w.camera);
      target.style.transform=`translate(${(projection.x+1)*innerWidth/2}px,${(1-projection.y)*innerHeight/2}px) translate(-50%,-100%)`;
      target.hidden=projection.z>1||projection.z< -1||projection.x<-.95||projection.x>.95||projection.y>.7||projection.y<-.5;
    }
    if(ui.hud?.surface?.isConnected)ui.hud.surface.textContent=g.physics.airborne?'IN FLIGHT':`${PLANETS[g.physics.reached||0].name.toUpperCase()} · SAFE CAP`;
    const distance=document.getElementById('distance-label');if(distance)distance.textContent=`${Math.hypot(p.x-g.physics.ball.x,p.z-g.physics.ball.z).toFixed(1)} m to ${g.physics.reached===8?'cup':p.name}`;
    const plate=ui.hud?.plate;if(plate)plate.style.opacity='0';
  };
  ui.holeComplete=async result=>{
    if(!result.round.planetfall)return holeComplete(result);
    saveRun();const reached=g.physics.reached||0,won=!!g.physics.sunk;
    const summary=won?'Eight planets behind you. One hole, finally holed.':g.strokes===0&&g.round.penalties===0?'No shots taken. Launch again when you’re ready.':`${g.round.penalties>=3?'Three chances spent. ':''}Your farthest safe landing was ${PLANETS[reached].name}. Launch again to go farther.`;
    ui.pendingResult=null;
    ui.modal(`<div class="planetfall-result"><span class="eyebrow">${won?'MISSION COMPLETE':'LAUNCH COMPLETE'}</span><h2>${won?'Hello, sunshine.':`${PLANETS[reached].name} reached.`}</h2><p>${summary}</p><div class="result-score"><div><strong>${reached}<small>/8</small></strong><span>Landings</span></div><div><strong>${g.strokes}</strong><span>Shots</span></div><div><strong>${minutes(g.elapsed)}</strong><span>Time</span></div></div><p class="planetfall-local-note">${stored?'Saved to the farthest-planet board on this device.':'This result has not been saved to device storage.'}</p><div class="modal-actions">${button('Launch again','planetfall-go','','button yellow')}${button('View distance board','planetfall-board','','button secondary')}${button('Course selection','planetfall-exit','','button secondary')}</div></div>`,{close:false});
  };
  ui.pause=paused=>{
    if(!active())return pause(paused);
    if(!paused){ui.closeModal();return;}
    ui.modal(`<div class="eyebrow">PLANETFALL · PAUSED</div><h2>Hold your orbit.</h2><p>The asteroid belt waits with you.</p><div class="pause-menu">${button('Keep playing','resume','','button yellow wide')}${button('Farthest-planet board','planetfall-board','','button secondary wide')}${button('End launch & save progress','planetfall-end','','button secondary wide')}${button('Course selection','planetfall-exit','','text-button')}</div>`,{close:false});
  };
  ui.action=async(name,data={})=>{
    if(active()&&['shot-club-prev','shot-club-next','shot-club-pick'].includes(name)){
      if(g.state!=='playing'||g.charging||g.physics.active||g.pendingSwing)return;
      const select=ui.root.querySelector('#shot-club'),bag=[...select.options].map(o=>o.value),index=bag.indexOf(g.club),id=name==='shot-club-pick'?data.id:bag[(index+(name==='shot-club-next'?1:-1)+bag.length)%bag.length];
      if(!bag.includes(id))return;
      select.value=id;select.dispatchEvent(new Event('input'));select.dispatchEvent(new Event('change'));ui.render();w.canvas.focus({preventScroll:true});return;
    }
    if(name==='planetfall-go'){
      if(active())saveRun();
      runId=globalThis.crypto?.randomUUID?.()||String(Date.now());lastReached=0;stored=false;boardOpen=false;
      ui.closeModal();ui.mode='golf';ui.shotPanelCollapsed=true;ui.audio.start();w.equip(ui.progress.data.equipment,ui.items);
      g.start(PLANETFALL_INDEX,false,{mode:'golf',round:{planetfall:true,...(ui.localPreview?{localPreview:true}:{})}});w.canvas.focus({preventScroll:true});return;
    }
    if(name==='planetfall-board'){
      saveRun();ui.pauseForDialog();boardOpen=true;
      ui.modal(`<div class="planetfall-board-view"><span class="eyebrow">PLANETFALL · LOCAL LEADERBOARD</span><h2>How far did you get?</h2><p>Farthest safe landing first. A Sun finish beats a Sun landing; then fewer shots, then faster time. Best 50 launches on this device.</p>${boardRows()}<div class="modal-actions">${button(active()?'Back to launch':'Back to courses','planetfall-close-board','','button yellow')}${g.state==='complete'?button('Launch again','planetfall-go','','button secondary'):''}</div></div>`,{wide:true,close:false});return;
    }
    if(name==='planetfall-close-board'){
      boardOpen=false;ui.closeModal();if(g.state==='complete')await ui.holeComplete({round:g.round});else if(g.state==='paused')ui.pause(true);return;
    }
    if(name==='planetfall-exit'){
      boardOpen=false;ui.closeModal();g.leave();ui.screen='courses';ui.render();return;
    }
    if(name==='planetfall-end'){ui.closeModal();if(g.state==='paused')g.setPaused(false,false);g.finishHole();return;}
    if(active()&&name==='planetfall-recenter'){w.zoom=13;w.pitch=.24;w.orbit=Math.atan2(-g.direction.x,-g.direction.z);w.cameraRig?.reset(g.physics.ball);return;}
    if(active()&&name==='planetfall-overview'){w.zoom=w.zoom>18?13:24;return;}
    if(active()&&name==='exit-confirm'){g.setPaused(true,false);ui.pause(true);return;}
    if(active()&&name==='round-exit'){saveRun();}
    return action(name,data);
  };
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&boardOpen){e.preventDefault();e.stopImmediatePropagation();void ui.action('planetfall-close-board');}
  },true);
  window.addEventListener('pagehide',()=>{if(active())saveRun();});
}
