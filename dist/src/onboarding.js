import { buildGolfLayout } from './golf-courses.js';
import { readSession } from './session-store.js';
import { DEFAULT_EQUIPMENT } from './catalog.js';
import { loadRangeAssets } from './meadowcrest-range.js';
export const TUTORIAL_KEY = 'polygolf.first-swing.v1';
export function openingHole() {
  const h=buildGolfLayout(0,0,{name:'Willow Practice Green',par:3,width:24,contour:0,density:.8,glades:[[0,14,32,32]],points:[[0,0],[0,-9],[0,-18]],green:[0,-10,12,22],water:[],bunkers:[],wind:{x:0,z:0},landmark:'garden',scenery:[]});
  h.custom=true;h.tutorialGarden=true;return h;
}
export function drivingRange() {
  const h=buildGolfLayout(0,0,{name:'Meadowcrest Golf Range',par:4,width:148,contour:0,density:.85,glades:[[18,32,105,62]],elevation:[[0,0],[.18,-.3],[.43,-.65],[.68,.3],[1,1.8]],mounds:[[-76,-100,55,95,2.4],[74,-180,48,82,3]],points:[[0,0],[0,-70],[0,-150],[0,-260]],green:[0,-260,2,2],water:[[-30,-105,15,8]],bunkers:[],wind:{x:0,z:0},scenery:[]});
  for(const [x,z,type,size] of [[-51,-91,'oak',1.28],[-49,-125,'willow',1.15],[51,-160,'pine',1.38]]){
    const t={x,z,type,size,far:false};h.trees.push(t);(h.treeGrid[Math.floor(x/10)+':'+Math.floor(z/10)]??=[]).push(t);
  }
  h.custom=true;h.tutorialGarden=true;h.drivingRange=true;h.meadowcrestRange=true;return h;
}
export function shouldStartTutorial({session,done,played,preview,linked}) {return !session&&!done&&!played&&!preview&&!linked;}
export function installOnboarding(ui) {
  let done=false;try{done=localStorage.getItem(TUTORIAL_KEY)==='done';}catch{}
  const params=new URLSearchParams(location.search);
  const eligible=shouldStartTutorial({session:readSession(),done,played:ui.progress.data.stats.holes>0||ui.progress.data.stats.games>0,preview:ui.localPreview,linked:params.has('invite')||params.has('map')||!!location.hash});
  let active=false,step=0,oldMeter=null,lesson='putt',rangeResultShown=false;
  const remember=()=>{try{localStorage.setItem(TUTORIAL_KEY,'done');}catch{}};
  const restore=()=>{active=false;ui.tutorialActive=false;document.querySelector('#first-swing')?.remove();document.querySelector('#hole-intro')?.remove();if(oldMeter){ui.world.settings.shotMeter=oldMeter;oldMeter=null;}ui.world.equip(ui.progress.data.equipment,ui.items);};
  const leave=()=>{remember();restore();ui.closeModal();ui.game.leave();ui.screen='home';ui.render();};
  const draw=()=>{
    if(!active)return;
    let card=document.querySelector('#first-swing');
    if(!card){card=document.createElement('aside');card.id='first-swing';card.className='first-swing';ui.root.append(card);}
    card.innerHTML=`<div class="tutorial-heading"><span>${lesson==='drive'?'DRIVER · MEADOWCREST':'PUTTER · WILLOW PRACTICE GREEN'}</span><button data-action="tutorial-skip">Skip tutorial</button></div><div class="tutorial-steps"><i class="${step===0?'active':''}">1 · Aim</i><i class="${step===1?'active':''}">2 · Power</i><i class="${step>=2?'active':''}">3 · Shoot</i></div><div class="tutorial-visual" aria-hidden="true">${step===0?'<span class="tutorial-ball">●</span><span class="tutorial-line"></span><span>⚑</span>':step===1?'<span class="tutorial-demo-power"><i></i><b></b></span>':'<span class="tutorial-demo-direction"><i></i><b></b></span>'}</div><strong id="tutorial-title"></strong><p id="tutorial-copy"></p>${step===0?'<button class="button yellow" data-action="tutorial-aimed">I’m aimed · Next</button>':''}<button class="tutorial-signin" data-action="tutorial-signin">Already have an account? Sign in</button>`;
    text();
  };
  const text=()=>{if(!active)return;const g=ui.game,title=document.querySelector('#tutorial-title'),copy=document.querySelector('#tutorial-copy');if(!title)return;
    const moving=g.physics.active||g.pendingSwing;
    title.textContent=moving?'Watch your ball.':step===0?(lesson==='drive'?'Aim down the range.':'Point towards the flag.'):step===1?'Hold to build power.':'Click with the marker in the centre.';
    const nearby=Math.hypot(g.hole.cup.x-g.physics.ball.x,g.hole.cup.z-g.physics.ball.z)<5;
    copy.textContent=lesson==='drive'?(moving?'Your driver sends the ball into the air. Watch where it lands.':step===0?'The driver is already selected. Aim down the wide fairway. One drive is all you need.':step===1?'Hold on the course or hold Space. Release near 80% power, then time your direction click.':'Click the course or press Space again. Catch the green centre to send your drive straight.'):(moving?'Watch it roll towards the flag.':step===0?'Move your pointer over the course, or use ← and →. The guide shows where your shot will go.':step===1?(nearby?'You’re close! Hold briefly on the course or Space, then release for a gentle putt.':'Hold on the course or hold Space. Release around two-thirds power to lock it in.'):'Click the course or press Space again to shoot. Green means straight. You can take another shot if you miss.');
  };
  const startLesson=async kind=>{
    if(kind==='drive'){
      ui.modal('<div class="tutorial-finish"><h2>Setting up the range…</h2><p>Meadowcrest Golf Range at Scotti’s Drive In</p><button class="button secondary" data-action="tutorial-skip">Skip tutorial</button></div>',{close:false});
      try{await loadRangeAssets();}catch(e){ui.toast(e.message);ui.modal('<div class="tutorial-finish"><h2>Range unavailable</h2><p>Please try loading the lesson again.</p><div class="modal-actions"><button class="button secondary" data-action="tutorial-skip">Skip tutorial</button><button class="button yellow" data-action="tutorial-drive">Try again</button></div></div>',{close:false});return;}
      if(!active)return;
    }
    lesson=kind;step=0;rangeResultShown=false;ui.closeModal();
    ui.world.equip(DEFAULT_EQUIPMENT,ui.items);
    ui.game.start(0,true,{mode:'golf',customHole:kind==='drive'?drivingRange():openingHole(),round:{tutorial:true,customOrigin:'tutorial'}});
    ui.game.club=kind==='drive'?'driver':'putter';ui.game.power=kind==='drive'?.8:.7;
    ui.world.zoom=kind==='drive'?27:18;ui.world.pitch=kind==='drive'?.3:.58;ui.render();
  };
  const finishDrive=()=>{
    if(rangeResultShown)return;rangeResultShown=true;
    const distance=Math.round(Math.hypot(ui.game.physics.ball.x,ui.game.physics.ball.z));
    ui.game.setPaused(true,false);
    ui.modal(`<div class="tutorial-finish"><span class="eyebrow">DRIVING RANGE COMPLETE</span><div class="tutorial-trophy">⚑</div><h2>${distance} metres.</h2><p>You’ve tried the putter and the driver. You’re ready for Willow Park.</p><div class="modal-actions"><button class="button secondary" data-action="tutorial-drive">Try another drive</button><button class="button yellow" data-action="tutorial-done">Let’s play PolyGolf</button></div></div>`,{close:false});
  };
  const render=ui.render.bind(ui);ui.render=()=>{render();if(active){ui.root.classList.add('tutorial-round');ui.root.querySelector('.editor-return')?.remove();draw();}else ui.root.classList.remove('tutorial-round');};
  const tick=ui.tick.bind(ui);ui.tick=()=>{tick();if(!active)return;const g=ui.game;if(g.state==='menu'){remember();restore();ui.render();return;}const next=g.charging?(g.shotPhase==='direction'?2:1):g.physics.active||g.pendingSwing?2:g.strokes>0?1:step;if(next!==step){step=next;draw();}text();if(lesson==='drive'&&g.state==='playing'&&g.strokes>0&&!g.charging&&!g.pendingSwing&&!g.physics.active)finishDrive();};
  const hole=ui.holeComplete.bind(ui);ui.holeComplete=result=>{
    if(!active||!result.round.tutorial)return hole(result);
    if(lesson==='drive'){finishDrive();return;}
    ui.modal(`<div class="tutorial-finish"><span class="eyebrow">FIRST HOLE COMPLETE</span><div class="tutorial-trophy">⚑</div><h2>Nice putting.</h2><p>${result.strokes} ${result.strokes===1?'shot':'shots'}. Now try one drive on the range.</p><div class="modal-actions"><button class="button secondary" data-action="tutorial-done">Skip to courses</button><button class="button yellow" data-action="tutorial-drive">Try the driver</button></div></div>`,{close:false});
  };
  const action=ui.action.bind(ui);ui.action=async(name,data)=>{
    if(name==='tutorial-aimed'){step=1;draw();ui.world.canvas.focus();return;}
    if(name==='tutorial-drive'&&active){startLesson('drive');return;}
    if(['tutorial-skip','tutorial-done','tutorial-signin'].includes(name)){leave();if(name==='tutorial-signin')return action('account',{});if(name==='tutorial-done')return ui.navigate('courses');return;}
    return action(name,data);
  };
  // A saved login is checked synchronously, before the asynchronous account restore.
  if(eligible)queueMicrotask(()=>{
    if(ui.cloud.session||ui.game.state!=='menu')return;
    active=true;ui.tutorialActive=true;ui.shotPanelCollapsed=true;
    oldMeter=ui.world.settings.shotMeter;ui.world.settings.shotMeter='classic';
    ui.mode='golf';startLesson('putt');
  });
}
