import test from 'node:test';
import assert from 'node:assert/strict';
import { GameManager } from '../dist/src/game.js';
import { courseRecordKey, getGolfHole, golfHoleCount, terrainAt, terrainHeight, ellipse, ovalBoundary, pathDistance, fairwayWidth } from '../dist/src/golf-courses.js';
import { defaultSave, ProgressionManager } from '../dist/src/save.js';

test('Willow keeps playing after hole three and produces a nine-hole round', () => {
  globalThis.window = { addEventListener() {} };
  globalThis.document = { addEventListener() {} };
  const world = { canvas: { addEventListener() {} }, equipment: {}, settings: {}, load() {}, setAim() {}, update() {}, burst() {} };
  let completed;
  const game = new GameManager(world, { onCourse: round => completed = round });
  for (const course of [0, 1, 2, 14]) {
    completed = null;
    game.start(course, true, { mode: 'golf' });
    const count = golfHoleCount(course);
    assert.equal(count, course === 14 ? 9 : 3);
    for (let i = 0; i < count; i++) {
      assert.equal(game.index, i);
      game.skip();
      game.next();
      if (i < count - 1) assert.equal(game.state, 'playing');
    }
    assert.equal(game.state, 'finished');
    assert.equal(completed.strokes.length, count);
  }
});

test('nine-hole Willow bests keep the old short-loop record and other course records intact', () => {
  const data = defaultSave();
  data.bests['golf:polygolf-v7:0'] = { score: -3, strokes: 9, time: 120 };
  data.bests['golf:polygolf-v7:1'] = { score: -1, strokes: 11, time: 180 };
  const old = structuredClone(data.bests);
  const progress = new ProgressionManager({ load: () => data, save: () => true });
  const pars = Array.from({ length: golfHoleCount(14) }, (_, i) => getGolfHole(14, i).par);
  assert.equal(pars.reduce((a, b) => a + b), 36);
  progress.completeCourse({ mode: 'golf', courseIndex: 14, strokes: pars, time: 600 }, pars);
  assert.equal(data.bests[courseRecordKey('golf', 14)].strokes, 36);
  for (const [key, record] of Object.entries(old)) assert.deepEqual(data.bests[key], record);
  assert.equal(courseRecordKey('golf', 1), 'golf:polygolf-v7:1');
  assert.equal(courseRecordKey('golf', 2), 'golf:polygolf-v7:2');
});

test('shaped bunker rims match the sand lie and recessed physical terrain', () => {
  for (let i = 3; i < 9; i++) {
    const h = getGolfHole(14, i), plain = { ...h, bunkers: [] };
    for (const bunker of h.bunkers) {
      assert.ok(terrainHeight(plain, bunker.x, bunker.z) - terrainHeight(h, bunker.x, bunker.z) > 1.3);
      for (let n = 0; n < 16; n++) {
        const a = n * Math.PI / 8, rim = ovalBoundary(bunker, a), inside = ovalBoundary(bunker, a, .6);
        assert.ok(Math.abs(ellipse(bunker, rim.x, rim.z) - 1) < 1e-8);
        const lie = terrainAt(h, inside.x, inside.z);
        assert.equal(lie.surface, 'sand', h.name);
        assert.equal(lie.hazard, null, h.name);
      }
    }
  }
});

test('the ascent, downhill hole and lake bank have real elevation with stable tees and greens', () => {
  const climb = getGolfHole(14, 5), downhill = getGolfHole(14, 7), lake = getGolfHole(14, 8);
  assert.ok(climb.cup.y - climb.start.y > 15);
  assert.ok(downhill.start.y - downhill.cup.y > 10);
  assert.ok(terrainHeight(lake, 205, -200) < -5.8);
  for (let i = 3; i < 9; i++) {
    const h = getGolfHole(14, i);
    for (const p of [h.start, h.cup]) {
      const ground = terrainAt(h, p.x, p.z);
      assert.equal(ground.hazard, null);
      assert.ok(ground.normal.y > .99, 'flat stance and putting surface');
    }
    for (const [x,z] of h.route) {
      const ground = terrainAt(h,x,z);
      assert.ok(Number.isFinite(ground.height));
      if (!ground.hazard && ground.surface === 'fairway') assert.ok(ground.normal.y > .8, 'fairway slopes stay playable');
    }
    for (const p of h.scenery) {
      assert.equal(terrainAt(h,p.x,p.z).hazard,null);
      assert.ok(pathDistance(h,p.x,p.z) > fairwayWidth(h,-p.z/h.length)/2+p.radius+3, 'landmarks stay out of play');
    }
  }
});
