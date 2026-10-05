import {GolfWorld} from './world.js';
import {SAVE_KEY,CLUBS,HOLES,UPGRADES,createSave,sanitizeSave,distance,makeEquation,maxDistance,planShot,terrainAt,scoreName,rewardFor,upgradeCost,buyUpgrade} from './engine.js';
const $=id=>document.getElementById(id);
const paths={
 club:'<path d="m8 3 9 16M17 19l-5 3c-3 1-4-3-1-4l4-1"/>',
 putter:'<path d="M11 3v15m0 0H6v4h13v-4z"/>',
 iron:'<path d="m8 3 8 16-6 2c-3 0-3-3-1-4l5-1"/>',
 driver:'<path d="m7 3 9 15m-3-2c7-2 9 4 4 6-6 2-10-2-4-6Z"/>',
 flag:'<path d="M7 22V3l13 4-13 5M3 22h9"/>',
 bag:'<path d="m8 8-1-5m7 5 1-6m-9 9h13l-1 11H7Zm13 2 3 8M6 13 3 21"/>',
 target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 1v4m0 14v4M1 12h4m14 0h4"/>',
 spark:'<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/>',
 sound:'<path d="M11 4 6 8H2v8h4l5 4ZM15 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/>',
 mute:'<path d="M11 4 6 8H2v8h4l5 4ZM16 9l6 6m0-6-6 6"/>',
};
const icon=name=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.club}</svg>`;
let save;let storageAvailable=true;try{save=sanitizeSave(JSON.parse(localStorage.getItem(SAVE_KEY)));}catch{save=createSave();}
let world,club='driver',power=100,angle=0,equation,busy=false,closeAction=null,audioContext,toastTimer;
const hole=()=>HOLES[save.round.hole];
const persist=()=>{try{localStorage.setItem(SAVE_KEY,JSON.stringify(save));}catch{storageAvailable=false;document.querySelector('footer>span').textContent='Storage unavailable · playing this session';}};
const fmtScore=v=>v===0?'E':v>0?`+${v}`:`${v}`;
const totalScore=()=>save.round.scores.reduce((sum,n,i)=>sum+n-HOLES[i].par,0);
function toast(message){$('shot-toast').textContent=message;$('shot-toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('shot-toast').classList.remove('show'),2000);}
function sound(kind){if(!save.sound)return;try{audioContext??=new(window.AudioContext||window.webkitAudioContext)();audioContext.resume();const notes=kind==='win'?[523.25,659.25,783.99,1046.5]:kind==='hit'?[330,660]:kind==='buy'?[660,880]:[170];notes.forEach((f,i)=>{const o=audioContext.createOscillator(),g=audioContext.createGain(),t=audioContext.currentTime+i*.09;o.type=kind==='hit'?'sine':'triangle';o.frequency.setValueAtTime(f,t);if(kind==='hit')o.frequency.exponentialRampToValueAtTime(f*.6,t+.17);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.07,t+.01);g.gain.exponentialRampToValueAtTime(.001,t+.3);o.connect(g);g.connect(audioContext.destination);o.start(t);o.stop(t+.32);});}catch{}}
function updateSound(){$('sound').innerHTML=icon(save.sound?'sound':'mute');$('sound').setAttribute('aria-label',save.sound?'Turn sound off':'Turn sound on');$('sound').title=save.sound?'Turn sound off':'Turn sound on';}
function updateGlobal(){
 $('wallet').textContent=save.coins.toLocaleString();$('hole-number').textContent=String(save.round.hole+1).padStart(2,'0');$('hole-title').textContent=hole().name;$('par-label').textContent=`PAR ${hole().par}`;$('stroke').textContent=`SHOT ${save.round.strokes+1}`;$('distance').textContent=Math.round(distance(save.round.ball,hole().pin));$('total-score').textContent=fmtScore(totalScore());
 $('scorecard').innerHTML=HOLES.map((h,i)=>`<div class="score-hole ${i<save.round.scores.length?'done':i===save.round.hole?'current':''}" aria-label="Hole ${i+1}, par ${h.par}${i<save.round.scores.length?`, ${save.round.scores[i]} strokes`:i===save.round.hole?', current hole':''}" title="${h.name} · Par ${h.par}">${i<save.round.scores.length?`<small>${i+1}</small>${save.round.scores[i]}`:i+1}</div>`).join('');
 $('difficulty').innerHTML=`${{chill:'Chill',classic:'Classic',expert:'Expert'}[save.difficulty]} equations <span aria-hidden="true">⌄</span>`;
}
function newEquation(){equation=makeEquation(club,save.difficulty);$('equation').textContent=equation.text;$('answer').value='';$('answer').removeAttribute('aria-invalid');$('feedback').textContent='A correct answer makes a perfect swing.';$('feedback').className='answer-feedback';}
function updateClubs(){$('clubs').innerHTML=CLUBS.map(c=>`<button class="club" type="button" data-club="${c.id}" aria-pressed="${c.id===club}" ${busy?'disabled':''}>${icon(c.id)}<span>${c.name}</span></button>`).join('');}
function updatePower(){const max=maxDistance(club,save.upgrades,terrainAt(save.round.ball,hole()));power=Math.max(2,Math.min(max,power));$('power').max=max;$('power').value=power;$('power-value').textContent=power;$('power').style.setProperty('--power',`${(power-2)/(max-2)*100}%`);updateGuide();}
function currentShot(){return planShot({ball:save.round.ball,angle,power,club,hole:hole(),upgrades:save.upgrades});}
function updateGuide(){if(!world||busy||save.round.finished)return;world.setGuide(currentShot());const target=Math.atan2(hole().pin[1]-save.round.ball[1],hole().pin[0]-save.round.ball[0]);let offset=(angle-target)*180/Math.PI;offset=((offset+180)%360+360)%360-180;$('aim-angle').textContent=Math.abs(offset)<.8?'At the pin':`${Math.abs(Math.round(offset))}° ${offset<0?'left':'right'}`;}
function aimAtPin(){angle=Math.atan2(hole().pin[1]-save.round.ball[1],hole().pin[0]-save.round.ball[0]);updateGuide();}
function readyShot(){const d=distance(save.round.ball,hole().pin),lie=terrainAt(save.round.ball,hole());club=CLUBS.find(c=>maxDistance(c.id,save.upgrades,lie)>=d)?.id||'driver';power=Math.max(2,Math.min(Math.round(d),maxDistance(club,save.upgrades,lie)));aimAtPin();updateClubs();updatePower();newEquation();updateGlobal();}
function setBusy(value){busy=value;for(const id of ['swing','answer','power','aim-left','aim-right','aim-flag','shop-open','difficulty'])$(id).disabled=value;updateClubs();$('swing').innerHTML=value?'On its way… <span>↗</span>':'Take the shot <span aria-hidden="true">↗</span>';}
function activateHole(){setBusy(false);world.build(hole(),save.round.hole);world.setBall(save.round.ball);readyShot();}
function openModal(content,onClose=null){if($('dialog').open){$('dialog').close();const previous=closeAction;closeAction=null;previous?.();}closeAction=onClose;$('dialog').innerHTML=content;$('dialog').showModal();}
function closeModal(){const action=closeAction;closeAction=null;$('dialog').close();action?.();}
const modalHead=title=>`<div class="modal-head"><h2>${title}</h2><button class="close-button" data-close aria-label="Close">×</button></div>`;
function finishHole(){
 const r=save.round,h=hole(),strokes=r.strokes,reward=rewardFor(strokes,h.par,r.misses,save.upgrades),perfect=r.misses===0,title=scoreName(strokes,h.par);
 save.coins+=reward;r.scores.push(strokes);sound('win');world.celebrate(h.pin);
 const final=r.hole===8;
 if(final){r.finished=true;save.completedRounds++;save.best=save.best===null?totalScore():Math.min(save.best,totalScore());}
 else{r.hole++;r.ball=[...hole().tee];r.strokes=0;r.misses=0;}
 persist();$('wallet').textContent=save.coins.toLocaleString();
 const content=`<div class="result"><div class="result-mark">${final?'⚑':'✦'}</div><div class="eyebrow">${final?'NINE HOLES. NICELY DONE.':`${h.name.toUpperCase()} · PAR ${h.par}`}</div><h2>${final?'What a lovely round.':title}</h2><p>${final?`You finished the meadow in ${r.scores.reduce((a,b)=>a+b,0)} strokes.`:perfect?'Clean maths. Clean finish.':"Every shot is a little progress."}</p><div class="result-reward"><div><strong>${final?fmtScore(totalScore()):strokes}</strong><span>${final?'ROUND TO PAR':'STROKES'}</span></div><div><strong>+${reward} <span class="coin-inline">✦</span></strong><span>COINS EARNED</span></div><div><strong>${final?fmtScore(save.best):fmtScore(strokes-h.par)}</strong><span>${final?'PERSONAL BEST':'TO PAR'}</span></div></div><button class="swing-button" id="next-hole">${final?'Another lovely round':'On to the next hole'} <span>↗</span></button><div class="modal-note">${final?'Your coins and upgrades carry into the next round.':`Your balance: ${save.coins} coins. Upgrades are waiting in your kit.`}</div></div>`;
 setTimeout(()=>{openModal(content,final?showFinishedState:activateHole);$('next-hole').onclick=()=>{if(final){closeAction=null;$('dialog').close();startNewRound();}else closeModal();};},650);
}
function showFinishedState(){setBusy(true);$('swing').innerHTML='Play another round <span>↗</span>';$('swing').disabled=false;$('shop-open').disabled=false;$('difficulty').disabled=false;$('stroke').textContent='COMPLETE';$('distance').textContent='0';$('feedback').textContent='Nine holes down. Ready for another round?';updateGlobal();$('stroke').textContent='COMPLETE';}
function startNewRound(){save.round=createSave().round;persist();activateHole();toast('A fresh round. A fresh start.');}
function takeShot(event){
 event.preventDefault();if(save.round.finished){startNewRound();return;}if(busy)return;
 const raw=$('answer').value.trim();if(!raw){$('feedback').textContent='Pop your answer in the box first.';$('feedback').className='answer-feedback error';$('answer').focus();return;}
 if(!/^-?\d+$/.test(raw)||Number(raw)!==equation.answer){save.round.misses++;save.round.streak=0;persist();$('answer').setAttribute('aria-invalid','true');$('feedback').textContent=`Try again. ${equation.hint}`;$('feedback').className='answer-feedback error';const card=document.querySelector('.equation-card');card.classList.remove('shake');void card.offsetWidth;card.classList.add('shake');sound('miss');$('answer').select();return;}
 const shot=currentShot();save.round.strokes++;save.round.streak++;setBusy(true);$('answer').removeAttribute('aria-invalid');$('feedback').textContent=save.round.streak>=3?`${save.round.streak} correct swings in a row. Lovely!`:'That’s it. Perfect swing!';$('feedback').className='answer-feedback success';sound('hit');toast(save.round.streak>=3?`${save.round.streak} in a row ✦`:'Lovely shot!');
 world.animateShot(shot,()=>{
  if(shot.penalty){save.round.strokes++;world.setBall(save.round.ball);persist();setBusy(false);readyShot();toast(shot.terrain==='water'?'A splash! +1 penalty':'Out of bounds. +1 penalty');$('feedback').textContent=shot.terrain==='water'?'Try a lofted club or aim around the water.':'Aim for a landing inside the island.';}
  else{save.round.ball=[...shot.end];if(shot.holed){finishHole();return;}world.setBall(save.round.ball);persist();setBusy(false);readyShot();if(shot.terrain==='sand'){toast('In the sand. A softer next shot.');$('feedback').textContent='Sand reduces your club’s maximum distance.';}}
  if(matchMedia('(min-width:701px)').matches)$('answer').focus({preventScroll:true});
 });
}
function showShop(){
 if(world?.animating)return;
 openModal(`<div class="modal-inner">${modalHead('Good things in your kit.')}<p class="modal-copy">Little upgrades. Better rounds. <strong id="shop-balance">${save.coins} coins to spend.</strong></p><div id="upgrades"></div><p class="modal-note">Earn coins by finishing holes. Solve every equation on your first try for a 15-coin clean-maths bonus. Upgrades stay with you on this device.</p><div id="shop-message" class="modal-note" role="status" aria-live="polite"></div></div>`);renderUpgrades();
}
function renderUpgrades(){
 $('upgrades').innerHTML=UPGRADES.map(item=>{const level=save.upgrades[item.id],cost=upgradeCost(item,level);return`<div class="upgrade"><span class="upgrade-icon">${icon(item.icon)}</span><div class="upgrade-content"><h3>${item.name}</h3><p>${item.description}</p><div class="level-bars" aria-label="Level ${level} of 4">${[0,1,2,3].map(i=>`<span class="${i<level?'filled':''}"></span>`).join('')}</div></div><button class="buy-button" data-buy="${item.id}" ${level>=4||save.coins<cost?'disabled':''} aria-label="${level>=4?`${item.name} fully upgraded`:`Upgrade ${item.name} for ${cost} coins`}">${level>=4?'MAXED':`✦ ${cost}`}</button></div>`;}).join('');
 $('shop-balance').textContent=`${save.coins} coins to spend.`;
}
function showHelp(){openModal(`<div class="modal-inner">${modalHead('A little course guide.')}<div class="help-step"><span class="help-number">1</span><div><strong>Pick your line.</strong><p>Click the course to aim, or use the ↶ / ↷ buttons. The dotted line shows your flight; the ring marks your landing.</p></div></div><div class="help-step"><span class="help-number">2</span><div><strong>Choose your distance.</strong><p>A driver goes far. An iron flies over water. A putter rolls along the green. Use the distance slider to set your shot.</p></div></div><div class="help-step"><span class="help-number">3</span><div><strong>Solve it. Send it.</strong><p>Find x and press Enter or Take the shot. Wrong answers give you a hint, with no extra stroke. There’s no timer.</p></div></div><div class="help-step"><span class="help-number">4</span><div><strong>Make a little progress.</strong><p>Finish holes to earn coins and upgrade your kit. Water or an out-of-bounds landing costs one penalty stroke. Sand reduces your next shot’s reach.</p></div></div><p class="modal-note">Prefer simpler sums? Change the equation difficulty at the bottom of the page. Your round and upgrades save on this device.</p><button class="swing-button" data-close>Back to the green <span>↗</span></button></div>`);}
function showDifficulty(){if(busy&&!save.round.finished)return;openModal(`<div class="modal-inner">${modalHead('Find your happy medium.')}<p class="modal-copy">Same lovely course. Your kind of maths.</p>${[['chill','Chill','Simple addition. A gentle round.'],['classic','Classic','Addition, multiplication and a little algebra.'],['expert','Expert','Bigger numbers and two-step equations.']].map(([id,name,desc])=>`<button class="difficulty-option ${save.difficulty===id?'selected':''}" data-difficulty="${id}" aria-pressed="${save.difficulty===id}"><strong>${name}</strong><span>${desc}</span></button>`).join('')}<p class="modal-note">You can change this at any time between shots.</p></div>`);}
$('dialog').addEventListener('cancel',e=>{e.preventDefault();closeModal();});
$('dialog').addEventListener('click',e=>{if(e.target.closest('[data-close]'))closeModal();const buy=e.target.closest('[data-buy]');if(buy&&buyUpgrade(save,buy.dataset.buy)){persist();sound('buy');updateGlobal();renderUpgrades();updatePower();$('shop-message').textContent='Upgraded. A little extra magic for your next shot.';}const diff=e.target.closest('[data-difficulty]');if(diff){save.difficulty=diff.dataset.difficulty;persist();updateGlobal();newEquation();closeModal();}});
$('clubs').addEventListener('click',e=>{const el=e.target.closest('[data-club]');if(!el||busy)return;club=el.dataset.club;power=Math.min(Math.round(distance(save.round.ball,hole().pin)),maxDistance(club,save.upgrades,terrainAt(save.round.ball,hole())));updateClubs();updatePower();newEquation();});
$('power').addEventListener('input',e=>{if(busy)return;power=Number(e.target.value);updatePower();});
$('aim-left').onclick=()=>{if(!busy){angle-=Math.PI/36;updateGuide();}};$('aim-right').onclick=()=>{if(!busy){angle+=Math.PI/36;updateGuide();}};$('aim-flag').onclick=()=>{if(!busy)aimAtPin();};
$('shot-form').addEventListener('submit',takeShot);$('shop-open').onclick=showShop;$('help').onclick=showHelp;$('difficulty').onclick=showDifficulty;
$('sound').onclick=()=>{save.sound=!save.sound;persist();updateSound();sound('buy');};
$('scene').addEventListener('keydown',e=>{if(busy)return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();angle+=(e.key==='ArrowLeft'?-1:1)*Math.PI/36;updateGuide();}if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();power+=e.key==='ArrowUp'?1:-1;updatePower();}if(e.key==='Enter')$('answer').focus();});
$('shop-icon').innerHTML=icon('bag');$('round-icon').innerHTML=icon('flag');document.querySelector('.flag-icon').innerHTML=icon('flag');updateSound();
try{world=new GolfWorld($('scene'),point=>{if(busy||save.round.finished)return;angle=Math.atan2(point[1]-save.round.ball[1],point[0]-save.round.ball[0]);power=Math.max(2,Math.min(Math.round(distance(save.round.ball,point)),maxDistance(club,save.upgrades,terrainAt(save.round.ball,hole()))));updatePower();});activateHole();if(save.round.finished){world.setGuide(null);world.ball.visible=false;showFinishedState();}}catch(error){console.error(error);$('scene-error').hidden=false;setBusy(true);$('feedback').textContent='The 3D course could not start. Try reloading with WebGL enabled.';}
persist();
