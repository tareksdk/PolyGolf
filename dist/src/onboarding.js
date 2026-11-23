import { firstSwingCard } from './first-swing-card.js';
import { progressStorage } from './progress-storage.js';
import { buildGolfLayout } from './golf-courses.js';
import { readSession } from './session-store.js';
import { DEFAULT_EQUIPMENT } from './catalog.js';
import { loadRangeAssets } from './meadowcrest-range.js';
export const TUTORIAL_KEY = 'polygolf.first-swing.v1';
export function openingHole() {
  const h=buildGolfLayout(0,0,{name:'Willow Practice Green',par:3,width:24,contour:0,density:.8,glades:[[0,14,32,32]],points:[[0,0],[0,-9],[0,-18]],green:[0,-10,12,22],water:[[23,-15,6.5,8,.3,.12]],bunkers:[],wind:{x:0,z:0},landmark:'garden',scenery:[]});
  h.custom=true;h.tutorialGarden=true;return h;
}
export function drivingRange() {
  const h=buildGolfLayout(0,0,{name:'Meadowcrest Golf Range',par:4,width:148,contour:0,density:.85,glades:[[18,32,105,62]],elevation:[[0,0],[.18,-.3],[.43,-.65],[.68,.3],[1,1.8]],mounds:[[-76,-100,55,95,2.4],[74,-180,48,82,3]],points:[[0,0],[0,-70],[0,-150],[0,-260]],green:[0,-260,2,2],water:[[-30,-105,15,8,-.25,.18]],bunkers:[],wind:{x:0,z:0},scenery:[]});
  for(const [x,z,type,size] of [[-51,-91,'oak',1.28],[-49,-125,'willow',1.15],[51,-160,'pine',1.38]]){
    const t={x,z,type,size,far:false};h.trees.push(t);(h.treeGrid[Math.floor(x/10)+':'+Math.floor(z/10)]??=[]).push(t);
  }
  h.custom=true;h.tutorialGarden=true;h.drivingRange=true;h.meadowcrestRange=true;return h;
}
export function shouldStartTutorial({session,done,played,preview,linked}) {return !session&&!done&&!played&&!preview&&!linked;}
export function installOnboarding(ui) {
  let done=false;try{done=progressStorage().getItem(TUTORIAL_KEY)==='done';}catch{}
  const params=new URLSearchParams(location.search);
  const eligible=shouldStartTutorial({session:ui.platform?.active ? null : readSession(),done,played:ui.progress.data.stats.holes>0||ui.progress.data.stats.games>0,preview:ui.localPreview,linked:params.has('invite')||params.has('map')||!!location.hash});
  let active=false, preparation='setup', phase='setup', lesson='putt', rangeResultShown=false, lessonId=0;
  let oldMeter, oldPanel, cameraStart, triedOrbit, triedZoom, card;
  const remember=()=>{try{progressStorage().setItem(TUTORIAL_KEY,'done');}catch{}};
  const restore=()=>{
    active=false;ui.tutorialActive=false;lessonId++;
    card?.remove();card=null;document.querySelector('#hole-intro')?.remove();
    ui.world.settings.shotMeter=oldMeter;
    ui.shotPanelCollapsed=oldPanel;
    ui.world.equip(ui.progress.data.equipment,ui.items);
  };
  const leave=()=>{remember();restore();ui.closeModal();ui.game.leave();ui.screen='home';ui.render();};
  const updateCameraChecks=()=>{
    if (!card || phase!=='setup' || lesson!=='putt' || !cameraStart) return;
    const w=ui.world;
    triedOrbit ||= Math.abs(w.orbit-cameraStart.orbit)>.06 || Math.abs(w.pitch-cameraStart.pitch)>.04;
    triedZoom ||= Math.abs(w.zoom-cameraStart.zoom)>.3;
    card.querySelector('[data-tried="orbit"]')?.classList.toggle('tried',triedOrbit);
    card.querySelector('[data-tried="zoom"]')?.classList.toggle('tried',triedZoom);
  };
  const draw=()=>{
    const g=ui.game;
    if(!active || !g.hole || !ui.root.querySelector('.play-hud'))return;
    if(!card?.isConnected){
      card=document.createElement('aside');card.id='first-swing';card.className='first-swing';
      card.setAttribute('aria-label','First Swing lesson');ui.root.append(card);
    }
    // Use the real HUD control, including its delegated actions and equipment data.
    const selector=ui.root.querySelector('.club-selector'),native=ui.root.querySelector('#shot-club');
    if(selector && card.contains(selector))native?.closest('label')?.after(selector);
    const distance=Math.hypot(g.hole.cup.x-g.physics.ball.x,g.hole.cup.z-g.physics.ball.z);
    const targetPower=lesson==='drive'?80:Math.min(95,Math.max(5,Math.round(16*Math.sqrt(distance/18))*5));
    card.innerHTML=firstSwingCard({phase,drive:lesson==='drive',targetPower,
      touch:ui.root.dataset?.touchControls === 'true' || matchMedia('(pointer: coarse)').matches,signIn:!ui.platform?.active});
    if(selector)card.querySelector('.lesson-club-slot')?.append(selector);
    card.dataset.phase=phase;
    updateCameraChecks();
  };
  const startLesson=async kind=>{
    const id=++lessonId;
    if(kind==='drive'){
      ui.modal('<div class="tutorial-finish"><h2>Setting up the range…</h2><p>Meadowcrest Golf Range at Scotti’s Drive In</p><button class="button secondary" data-action="tutorial-skip">Skip tutorial</button></div>',{close:false});
      try{await loadRangeAssets();}catch(e){if(!active || id!==lessonId)return;ui.toast(e.message);ui.modal('<div class="tutorial-finish"><h2>Range unavailable</h2><p>Please try loading the lesson again.</p><div class="modal-actions"><button class="button secondary" data-action="tutorial-skip">Skip tutorial</button><button class="button yellow" data-action="tutorial-drive">Try again</button></div></div>',{close:false});return;}
      if(!active || id!==lessonId)return;
    }
    lesson=kind;phase=preparation='setup';cameraStart=null;triedOrbit=triedZoom=false;rangeResultShown=false;ui.closeModal();
    ui.world.equip(DEFAULT_EQUIPMENT,ui.items);
    ui.game.start(0,true,{mode:'golf',customHole:kind==='drive'?drivingRange():openingHole(),round:{tutorial:true,customOrigin:'tutorial'}});
    ui.game.club='putter';ui.game.power=kind==='drive'?.8:.7;
    ui.world.zoom=kind==='drive'?27:18;ui.world.pitch=kind==='drive'?.3:.58;
    cameraStart={orbit:ui.world.orbit,pitch:ui.world.pitch,zoom:ui.world.zoom};ui.render();
  };
  const finishDrive=()=>{
    if(rangeResultShown)return;rangeResultShown=true;
    const distance=Math.round(Math.hypot(ui.game.physics.ball.x,ui.game.physics.ball.z));
    ui.game.setPaused(true,false);
    ui.modal(`<div class="tutorial-finish"><span class="eyebrow">DRIVING RANGE COMPLETE</span><div class="tutorial-trophy">⚑</div><h2>${distance} metres.</h2><p>You’ve tried the putter and the driver. You’re ready for Willow Park.</p><div class="modal-actions"><button class="button secondary" data-action="tutorial-drive">Try another drive</button><button class="button yellow" data-action="tutorial-done">Let’s play PolyGolf</button></div></div>`,{close:false});
  };
  const render=ui.render.bind(ui);ui.render=()=>{render();if(active){ui.root.classList.add('tutorial-round');ui.root.querySelector('.editor-return')?.remove();draw();}else ui.root.classList.remove('tutorial-round');};
  const beginPower=ui.game.beginPower.bind(ui.game);
  ui.game.beginPower=()=>{
    if(active && lesson==='drive' && ui.game.club!=='driver')return;
    beginPower();
  };
  const tick=ui.tick.bind(ui);
  ui.tick=()=>{
    tick();if(!active)return;
    const g=ui.game;
    if(g.state==='menu'){remember();restore();ui.render();return;}
    if(g.state!=='playing')return;
    const moving=g.physics.active || g.pendingSwing;
    if(lesson==='drive' && !moving && !g.charging){
      if(g.strokes && g.transcript.at(-1)?.club==='driver'){finishDrive();return;}
      if(g.club!=='driver')preparation='setup';
      else if(preparation==='setup')preparation='aim';
    }
    if(lesson==='putt' && g.strokes)preparation='power';
    const next=moving?'flight':g.charging?(g.shotPhase==='direction'?'strike':'power'):preparation;
    if(next!==phase){phase=next;draw();}
    else updateCameraChecks();
  };
  const hole=ui.holeComplete.bind(ui);ui.holeComplete=result=>{
    if(!active||!result.round.tutorial)return hole(result);
    if(lesson==='drive'){finishDrive();return;}
    ui.modal(`<div class="tutorial-finish"><span class="eyebrow">FIRST HOLE COMPLETE</span><div class="tutorial-trophy">⚑</div><h2>Nice putting.</h2><p>${result.strokes} ${result.strokes===1?'shot':'shots'}. Now try one drive on the range.</p><div class="modal-actions"><button class="button secondary" data-action="tutorial-done">Skip to courses</button><button class="button yellow" data-action="tutorial-drive">Try the driver</button></div></div>`,{close:false});
  };
  const action=ui.action.bind(ui);ui.action=async(name,data)=>{
    if(name==='tutorial-start' && !active && ui.game.state==='menu'){begin();return;}
    if(name==='tutorial-next' && active){
      phase=preparation=phase==='setup'?'aim':'power';draw();ui.world.canvas.focus();return;
    }
    if(name==='tutorial-drive'&&active){startLesson('drive');return;}
    if(['tutorial-skip','tutorial-done','tutorial-signin'].includes(name)){leave();if(name==='tutorial-signin')return action('account',{});if(name==='tutorial-done')return ui.navigate('courses');return;}
    return action(name,data);
  };
  const begin=()=>{
    active=true;ui.tutorialActive=true;oldPanel=ui.shotPanelCollapsed;ui.shotPanelCollapsed=true;
    oldMeter=ui.world.settings.shotMeter;ui.world.settings.shotMeter='classic';
    ui.mode='golf';startLesson('putt');
  };
  if(eligible)queueMicrotask(()=>{if(!ui.cloud.session && ui.game.state==='menu')begin();});
}
