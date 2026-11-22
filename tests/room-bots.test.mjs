import test from 'node:test';
import assert from 'node:assert/strict';
import { botPresentation, makeRoomBot, planRoomBotHole, ROOM_BOT_SKILLS } from '../dist/src/bots.js';
import { CLUB_MAX_YARDS } from '../dist/src/club-distances.js';
import { buildGolfLayout, getGolfHole } from '../dist/src/golf-courses.js';
import { getHole } from '../dist/src/courses.js';
import { GolfPhysics } from '../dist/src/golf-physics.js';
import { cleanLiveState } from '../dist/src/live-state.js';

const fixedBot = (skill, seed = 'opening-test') => ({ ...makeRoomBot(skill), botSeed: seed });

test('four room bot strengths offer distinct equipment, names, outfits and plausible driving limits', () => {
  const strengths = Object.entries(ROOM_BOT_SKILLS);
  assert.deepEqual(strengths.map(([id]) => id), ['duffer','weekend','stick','master']);
  assert.deepEqual(strengths.map(([, skill]) => skill.driverYards), [200,250,305,350]);
  assert.equal(new Set(strengths.map(([, skill]) => skill.outfit.join(':'))).size, 4);
  assert.equal(new Set(strengths.flatMap(([id]) => Array.from({length:7},(_,i)=>makeRoomBot(id,i).name))).size, 28);
  assert.equal(new Set(strengths.map(([id]) => makeRoomBot(id).equipment.ball)).size, 4);
  assert.throws(() => makeRoomBot('invented'), /valid bot skill/);
});

test('stock bot drivers reach the advertised yardages on a level fairway', () => {
  const flat = buildGolfLayout(0,0,{points:[[0,0],[0,-200],[0,-400],[0,-600]],width:50,bunkers:[],water:[],
    green:[0,-600,9,12],contour:0,wind:{x:0,z:0}},false);
  for (const [id,skill] of Object.entries(ROOM_BOT_SKILLS)) {
    const physics = new GolfPhysics();
    physics.load(flat);
    assert.ok(physics.shoot(0,-1,skill.driverPower,{gear:{driverYards:Math.max(265,skill.driverYards)}}));
    while (physics.active) physics.update(1/60);
    const yards = -physics.ball.z/.9144;
    assert.ok(yards >= skill.driverYards-1 && yards <= skill.driverYards, id + ' drove ' + yards + ' yards');
  }
});

test('bots hit real drives and approaches with bounded shot power and physics settle points', () => {
  const hole = getGolfHole(14,0);
  for (const [strength, skill] of Object.entries(ROOM_BOT_SKILLS)) {
    const plan = planRoomBotHole(fixedBot(strength), hole);
    assert.equal(plan.shots[0].club, 'driver');
    assert.ok(plan.shots.some(shot => !['driver','putter'].includes(shot.club)), strength);
    assert.ok(plan.shots.some(shot => shot.club === 'putter'), strength);
    assert.ok(!plan.shots.slice(0,-1).some(shot => shot.sunk), strength);
    assert.equal(plan.durationMs,plan.shots.reduce((total,shot)=>total+shot.durationMs,0));
    assert.equal(plan.strokes,plan.shots.reduce((total,shot)=>total+1+Number(shot.penalty),0));
    const replay = new GolfPhysics();
    replay.load(hole);
    for (const shot of plan.shots) {
      assert.ok(shot.power > 0 && shot.power <= 1);
      assert.ok(shot.club === 'driver' ? shot.power <= skill.driverPower : CLUB_MAX_YARDS[shot.club] <= skill.driverYards);
      replay.clock += Math.round(shot.waitMs*.06)/60;
      assert.ok(replay.shoot(shot.dx,shot.dz,shot.power,shot));
      for (let i=0;i<shot.ticks;i++) replay.update(1/60);
      assert.ok(Math.hypot(replay.ball.x-shot.ball.x,replay.ball.z-shot.ball.z)<.001);
      if (shot.penalty) replay.reset();
      else replay.events.length = 0;
    }
    assert.equal(replay.sunk,plan.finished);
  }
});

test('speed and free bot flight follows the round clock, with variation in prep time and no pre-start swing', () => {
  const bot = fixedBot('master'), hole = getGolfHole(14,0), plan = planRoomBotHole(bot,hole);
  assert.ok(new Set(plan.shots.map(shot => shot.waitMs)).size > 1);
  for (const rule of ['free','speed']) {
    const state = { rule, hole:0, holeStartAt:20000, members:[bot] };
    const ui = { game:{hole,index:0,round:{}},cloud:{room:{state}},world:{renderGround:()=>0} };
    const start = state.holeStartAt+bot.delay*1000;
    const before = botPresentation(bot,ui,start-500);
    const flight = botPresentation(bot,ui,start+plan.shots[0].waitMs+600);
    const finish = botPresentation(bot,ui,start+plan.durationMs+1);
    assert.equal(before.active,false);
    assert.equal(before.swing,null);
    assert.ok(cleanLiveState(flight) && flight.active && flight.swing);
    assert.equal(finish.strokes,plan.strokes);
    assert.equal(finish.sunk,plan.finished);
  }
});

test('ordered bots wait their turn and follow fresh server slot updates', () => {
  const bot = fixedBot('weekend'), hole = getHole(0,1), plan = planRoomBotHole(bot,hole);
  for (const rule of ['turn','distance']) {
    const member = { ...bot, botShotsPlayed:1, botShotStartedAt:null };
    const state = { rule, hole:1, holeStartAt:20000, members:[member] };
    const ui = { game:{hole,index:1,round:{}},cloud:{room:{state}},world:{renderGround:()=>0} };
    assert.ok(plan.shots.length>=2);
    const waiting = botPresentation(bot,ui,30000);
    assert.equal(waiting.active,false);
    assert.equal(waiting.swing,null);
    assert.equal(waiting.strokes,plan.shots[0].strokes);
    assert.equal(waiting.ball.x,plan.shots[1].origin.x);
    member.botShotStartedAt = 32000;
    const moving = botPresentation(bot,ui,32005+plan.shots[1].waitMs);
    assert.ok(cleanLiveState(moving) && moving.active);
  }
});
