import test from 'node:test';
import assert from 'node:assert/strict';
import {GameManager,shotDirection,flowPower} from '../dist/src/game.js';
import {directionalGuideSpec,fillDirectionalGuide,GUIDE_SAMPLES} from '../dist/src/directional-guide.js';
import {LocalSaveRepository,SAVE_KEY,defaultSave} from '../dist/src/save.js';
import {UIManager} from '../dist/src/ui.js';
import {flowNeedleAngle,flowDirectionGauge} from '../dist/src/shot-meter-ui.js';

function game(style='classic') {
  const keys={},pointer={},events={},captures=new Set();
  globalThis.window={addEventListener:(name,fn)=>keys[name]=fn};
  globalThis.document={activeElement:{tagName:'CANVAS'},addEventListener:(name,fn)=>events[name]=fn};
  const world={canvas:{addEventListener:(name,fn)=>pointer[name]=fn,setPointerCapture:id=>captures.add(id),hasPointerCapture:id=>captures.has(id),releasePointerCapture:id=>captures.delete(id)},settings:{shotMeter:style},equipment:{},load(){},update(){},setAim(){},hit(){},beginSwing(){},pointerToWorld:()=>({x:.123456,z:-100})};
  const g=new GameManager(world);g.start(0,true);
  return {g,world,keys,pointer,events,captures};
}
const click={button:0,clientX:400,clientY:300,pointerId:1};

test('Flow locks the visible direction on press, holds power and swings on the same release',()=>{
  const {g,pointer}=game('fluid');g.update(.3);
  assert.ok(g.accuracy>.5);g.displayedAccuracy=-.4;
  const expected=shotDirection(g.direction,-.4,false);
  pointer.pointerdown(click);assert.equal(g.lockedAccuracy,-.4);assert.equal(g.shotPhase,'power');
  g.update(.8);assert.equal(g.accuracy,-.4);assert.ok(g.power>.4);assert.equal(g.strokes,0);
  const power=g.power;pointer.pointerup(click);
  assert.ok(g.pendingSwing);assert.deepEqual(g.pendingSwing.dir,expected);assert.equal(g.pendingSwing.power,power);
  pointer.pointerup(click);g.update(.6);assert.equal(g.strokes,1);assert.equal(g.transcript.length,1);
});
test('Flow works with Space and cancellation never turns a release into a shot',()=>{
  const {g,keys,pointer}=game('fluid'),space={code:'Space',preventDefault(){}};
  keys.keydown(space);g.update(.7);keys.keyup(space);assert.ok(g.pendingSwing);
  g.loadHole(0);pointer.pointerdown(click);g.update(.5);pointer.pointercancel(click);pointer.pointerup(click);
  assert.equal(g.pendingSwing,null);assert.equal(g.strokes,0);assert.equal(g.shotPhase,'aim');
  keys.keydown(space);g.pause();keys.keyup(space);g.pause();assert.equal(g.pendingSwing,null);
});
test('Classic remains power first, then a second press locks direction',()=>{
  const {g,pointer}=game();pointer.pointerdown(click);g.update(.8);pointer.pointerup(click);
  assert.equal(g.shotPhase,'direction');assert.equal(g.pendingSwing,null);
  pointer.pointerdown(click);pointer.pointerup(click);assert.ok(g.pendingSwing);
});
test('Classic locks the last visible direction for both mouse and Space, even if the next frame advanced',()=>{
  for(const visible of [-1,-.73,0,.73,1])for(const input of ['mouse','keyboard']){
    const {g,pointer,keys}=game(),space={code:'Space',preventDefault(){}};
    pointer.pointerdown(click);g.update(.8);pointer.pointerup(click);
    const power=g.power;g.displayedAccuracy=visible;g.update(.05);
    const expected=shotDirection(g.direction,visible,false);
    if(input==='mouse')pointer.pointerdown(click);else keys.keydown(space);
    assert.deepEqual(g.pendingSwing.dir,expected);assert.equal(g.pendingSwing.power,power);
    pointer.pointerup(click);keys.keyup(space);g.update(.6);
    assert.equal(g.strokes,1);assert.equal(g.transcript.length,1);
  }
});
test('a quick Classic second click locks once without starting another power hold',()=>{
  const {g,pointer}=game();pointer.pointerdown(click);g.update(.8);pointer.pointerup(click);
  pointer.pointerdown(click);pointer.pointerup(click);pointer.pointerdown(click);pointer.pointerup(click);
  assert.ok(g.pendingSwing);assert.equal(g.charging,false);g.update(.6);
  assert.equal(g.strokes,1);assert.equal(g.transcript.length,1);
});
test('held arrow aiming and camera orbit are continuous and independent of key-repeat or refresh rate',()=>{
  const angleAt=fps=>{
    const {g,world,keys}=game();const before=Math.atan2(g.direction.z,g.direction.x),orbit=world.orbit;
    keys.keydown({code:'ArrowRight',preventDefault(){}});keys.keydown({code:'KeyE',preventDefault(){}});
    for(let i=0;i<fps;i++)g.update(1/fps);
    keys.keyup({code:'ArrowRight'});keys.keyup({code:'KeyE'});
    assert.ok(Math.abs(world.orbit-orbit-1.2)<1e-10);
    return Math.atan2(g.direction.z,g.direction.x)-before;
  };
  assert.ok(Math.abs(angleAt(60)-.48)<1e-10);assert.ok(Math.abs(angleAt(144)-.48)<1e-10);
  const {g,keys}=game(),before={...g.direction};keys.keydown({code:'ArrowRight',preventDefault(){}});keys.keydown({code:'ShiftLeft',preventDefault(){}});g.update(.01);
  assert.ok(Math.hypot(g.direction.x-before.x,g.direction.z-before.z)>.0013);
  assert.ok(Math.hypot(g.direction.x-before.x,g.direction.z-before.z)<.0015);
});
test('airborne arrow shows only an ascending opening gesture and updates for sub-degree movement',()=>{
  const points=new Float32Array(GUIDE_SAMPLES*3),ball={x:17,y:3,z:-9},options={club:'driver',shape:.2,spin:.3};
  fillDirectionalGuide(points,ball,{x:0,z:-1},.85,options);
  assert.equal(points.length,99);assert.ok([...points].every(Number.isFinite));
  const end=points.slice(-3),spec=directionalGuideSpec(.85,options);
  assert.ok(Math.hypot(end[0]-ball.x,end[2]-ball.z)<60);assert.ok(spec.length<245*.3);
  for(let i=1;i<GUIDE_SAMPLES;i++)assert.ok(points[i*3+1]>points[(i-1)*3+1]);
  const snapshot=points.slice();fillDirectionalGuide(points,ball,{x:.0001,z:-Math.sqrt(1-.0001**2)},.85,options);
  assert.notDeepEqual(points,snapshot);assert.ok(points.at(-3)>snapshot.at(-3));
});
test('putter arrow stays short, follows nearby terrain, and does not expose a final roll destination',()=>{
  const points=new Float32Array(GUIDE_SAMPLES*3),ground=(x,z)=>2+z*.02;
  fillDirectionalGuide(points,{x:0,y:2,z:0},{x:0,z:-1},1,{club:'putter'},ground);
  assert.equal(points.at(-1),-6);assert.ok(Math.abs(points.at(-2)-(ground(0,-6)+.085))<1e-6);
});
test('meter preference persists locally, defaults to Classic and rejects invalid saved values',()=>{
  let raw;const storage={getItem:key=>key===SAVE_KEY?raw:null,setItem:(key,value)=>{raw=value;}};
  const repository=new LocalSaveRepository(storage);assert.equal(repository.load().settings.shotMeter,'classic');
  const save=defaultSave();save.settings.shotMeter='fluid';repository.save(save);assert.equal(repository.load().settings.shotMeter,'fluid');
  save.settings.shotMeter='broken';repository.save(save);assert.equal(repository.load().settings.shotMeter,'classic');
});
test('Flow power reverses with an eased curve while keeping a reachable full-power sweet spot',()=>{
  assert.equal(flowPower(0),.01);assert.equal(flowPower(1.65),1);assert.equal(flowPower(3.3),.01);
  for(let t=0;t<10;t+=1/144)assert.ok(flowPower(t)>=.01&&flowPower(t)<=1);
  assert.ok(Math.abs(flowPower(1.65)-flowPower(1.65+1/60))<.0003);
});
test('direction marker spans the entire bar and its visible value is the value input will lock',()=>{
  const {g,world}=game('fluid');g.accuracy=.8;
  const attributes={};
  const hud={fill:{isConnected:true,style:{}},power:{},marker:{style:{}},accuracy:{},needle:{setAttribute:(name,value)=>attributes[name]=value},gauge:{dataset:{}}};
  const ui={game:g,world,hud,movingHud:false};
  UIManager.prototype.tickMeters.call(ui);
  assert.equal(hud.marker.style.left,'calc(90% + -1.6px)');assert.equal(hud.marker.style.transform,'translateX(-50%)');
  assert.equal(attributes.transform,'rotate(52 120 84)');assert.equal(hud.gauge.dataset.phase,'sweep');
  assert.equal(g.displayedAccuracy,.8);g.beginPower();assert.equal(g.lockedAccuracy,.8);
  UIManager.prototype.tickMeters.call(ui);assert.equal(attributes.transform,'rotate(52 120 84)');assert.equal(hud.gauge.dataset.phase,'locked');
});
test('Flow gauge has a real arc and needle, with bounded direction at both end stops',()=>{
  assert.equal(flowNeedleAngle(-1),-65);assert.equal(flowNeedleAngle(0),0);assert.equal(flowNeedleAngle(1),65);
  assert.equal(flowNeedleAngle(2),65);assert.equal(flowNeedleAngle(NaN),0);
  const html=flowDirectionGauge();assert.match(html,/<svg/);assert.match(html,/class="flow-gauge-sweet"/);assert.match(html,/id="flow-direction-needle"/);assert.doesNotMatch(html,/accuracy-track/);
});
test('Flow idle power is visually empty without changing the guide power; holding displays actual power',()=>{
  const {g,world}=game('fluid'),hud={fill:{isConnected:true,style:{}},power:{},accuracy:{}};
  const ui={game:g,world,hud,movingHud:false},guidePower=g.power;
  UIManager.prototype.tickMeters.call(ui);
  assert.equal(hud.fill.style.transform,'scaleX(0)');assert.equal(hud.power.textContent,'0%');assert.equal(g.power,guidePower);
  g.beginPower();g.update(.8);UIManager.prototype.tickMeters.call(ui);
  assert.equal(hud.fill.style.transform,`scaleX(${g.power})`);assert.equal(hud.power.textContent,(g.power*100).toFixed(1)+'%');
  g.cancelShot();world.settings.shotMeter='classic';g.power=.85;UIManager.prototype.tickMeters.call(ui);
  assert.equal(hud.fill.style.transform,'scaleX(0.85)');assert.equal(hud.power.textContent,'85.0%');
});

test('right and Ctrl drags orbit without aiming or charging, and release capture',()=>{
  for(const event of [{...click,button:2,buttons:2},{...click,ctrlKey:true,buttons:1}]) {
    const {g,world,pointer,captures}=game();
    g.aimTarget={x:1,z:0};const direction={...g.direction},orbit=world.orbit;
    pointer.pointerdown(event);
    pointer.pointermove({...event,clientX:500,clientY:340});g.update(.1);
    assert.equal(world.orbit,orbit-.6);assert.equal(world.pitch,.36);
    assert.deepEqual(g.direction,direction);assert.equal(g.charging,false);assert.equal(g.aimTarget,null);
    pointer.pointerup({...event,buttons:0});assert.equal(g.rotating,false);assert.equal(captures.size,0);
  }
});
test('power can only be released by the pointer or key that started it',()=>{
  for(const style of ['classic','fluid']) {
    const {g,pointer,keys}=game(style),space={code:'Space',preventDefault(){}};
    keys.keydown(space);g.update(.4);pointer.pointerdown(click);pointer.pointerup(click);
    assert.equal(g.shotPhase,'power');assert.equal(g.charging,true);keys.keyup(space);
    assert.equal(style==='fluid'?!!g.pendingSwing:g.shotPhase==='direction',true);
    g.loadHole(0);pointer.pointerdown(click);g.update(.4);keys.keydown(space);keys.keyup(space);
    pointer.pointerup({...click,pointerId:2});assert.equal(g.shotPhase,'power');
    pointer.pointerup(click);assert.equal(style==='fluid'?!!g.pendingSwing:g.shotPhase==='direction',true);
  }
});
test('mouse chords cancel the shot and do not shoot on the final release',()=>{
  const {g,pointer}=game('fluid');pointer.pointerdown(click);g.update(.5);
  pointer.pointermove({...click,button:2,buttons:3});
  assert.equal(g.rotating,true);assert.equal(g.charging,false);
  pointer.pointerup({...click,buttons:0});g.update(.6);
  assert.equal(g.pendingSwing,null);assert.equal(g.strokes,0);assert.equal(g.rotating,false);
});
test('lost capture, pause, reset, leave and hole changes discard active pointer and held keys',()=>{
  for(const transition of ['lostpointercapture','pause','reset','leave','loadHole']) {
    const {g,pointer,keys,captures,world}=game('fluid');
    keys.keydown({code:'KeyE'});pointer.pointerdown({...click,button:2});
    if(transition==='lostpointercapture') {pointer.lostpointercapture(click);keys.keyup({code:'KeyE'});}
    else if(transition==='loadHole') g.loadHole(1);
    else g[transition]();
    if(transition==='pause')g.pause();
    const orbit=world.orbit;pointer.pointermove({...click,buttons:0,clientX:800});g.update(.1);
    assert.ok(Math.abs(world.orbit-orbit)<1e-12,transition);assert.equal(g.rotating,false);assert.equal(captures.size,0);
    assert.equal(g.heldKeys.size,0);
  }
  const {g,pointer}=game('fluid');pointer.pointerdown(click);g.update(.5);
  pointer.lostpointercapture(click);pointer.pointerup(click);g.update(.6);
  assert.equal(g.strokes,0);assert.equal(g.charging,false);
});
test('dialogs use the same input cleanup as pause and focus the course after resume',()=>{
  const {g,world,keys,pointer}=game('fluid');let focused=0;
  world.canvas.focus=()=>focused++;
  const ui={game:g,world,resumeAfterModal:false,root:{},modalRoot:{innerHTML:'dialog'}};
  keys.keydown({code:'KeyE'});pointer.pointerdown({...click,button:2});
  focused=0;
  UIManager.prototype.pauseForDialog.call(ui);
  assert.equal(g.state,'paused');assert.equal(world.presentationPaused,true);assert.equal(g.rotating,false);assert.equal(g.heldKeys.size,0);
  UIManager.prototype.closeModal.call(ui);assert.equal(g.state,'playing');assert.equal(world.presentationPaused,false);assert.equal(focused,1);
});
test('focus changes clear held navigation keys, and a held Escape does not toggle repeatedly',()=>{
  const {g,keys,events}=game();keys.keydown({code:'KeyE'});
  events.focusin({target:{tagName:'SELECT'}});assert.equal(g.heldKeys.size,0);
  const escape={code:'Escape',preventDefault(){}};keys.keydown(escape);keys.keydown({...escape,repeat:true});
  assert.equal(g.state,'paused');keys.keydown(escape);assert.equal(g.state,'playing');
});
test('moving focus into a control disarms both meter styles before a delayed key release',()=>{
  for(const style of ['classic','fluid'])for(const tagName of ['BUTTON','INPUT','SELECT','TEXTAREA']){
    const {g,keys,events}=game(style),space={code:'Space',preventDefault(){}};
    keys.keydown(space);g.update(.6);
    events.focusin({target:{tagName}});keys.keyup(space);g.update(.6);
    assert.equal(g.charging,false,style+' '+tagName);assert.equal(g.shotPhase,'aim');
    assert.equal(g.pendingSwing,null);assert.equal(g.strokes,0);
  }
});
test('tabbing away from Classic direction selection cancels it, while returning to the canvas keeps normal input',()=>{
  const {g,keys,events}=game(),space={code:'Space',preventDefault(){}};
  keys.keydown(space);g.update(.7);keys.keyup(space);assert.equal(g.shotPhase,'direction');
  events.focusin({target:{tagName:'BUTTON'}});assert.equal(g.shotPhase,'aim');
  events.focusin({target:{tagName:'CANVAS'}});keys.keydown(space);g.update(.4);keys.keyup(space);
  assert.equal(g.shotPhase,'direction');assert.equal(g.strokes,0);
});
test('meter rendering clamps invalid power and direction at the display boundary',()=>{
  const {g,world}=game();g.charging=true;
  const hud={fill:{isConnected:true,style:{}},power:{},marker:{style:{}}},ui={game:g,world,hud,movingHud:false};
  for(const [power,accuracy,scale,left] of [[2,2,1,'calc(100% + -2px)'],[-2,-2,0,'calc(0% + 2px)'],[NaN,Infinity,0,'calc(50% + 0px)']]) {
    g.power=power;g.accuracy=accuracy;UIManager.prototype.tickMeters.call(ui);
    assert.equal(hud.fill.style.width,'100%');assert.equal(hud.fill.style.transform,`scaleX(${scale})`);assert.equal(hud.marker.style.left,left);
    assert.ok(Number.isFinite(g.displayedAccuracy));
  }
});
test('zoom sensitivity changes wheel response, clamps endpoints and respects pause',()=>{
  const {g,world,pointer}=game();world.zoom=20;world.settings.zoomSensitivity=2;
  pointer.wheel({deltaY:100,preventDefault(){}});assert.equal(world.zoom,30);
  pointer.wheel({deltaY:100000,preventDefault(){}});assert.equal(world.zoom,240);
  pointer.wheel({deltaY:-100000,preventDefault(){}});assert.equal(world.zoom,8);
  g.pause();pointer.wheel({deltaY:100,preventDefault(){}});assert.equal(world.zoom,8);
});
test('repeated resets finish at the stroke cap rather than leaving an unshootable hole',()=>{
  const {g,world}=game();world.burst=()=>{};
  for(let i=0;i<g.hole.par+8;i++)g.reset();
  assert.equal(g.state,'complete');assert.equal(g.charging,false);assert.equal(g.round.strokes[0],g.hole.par+8);
});
