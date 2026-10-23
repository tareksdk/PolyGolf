import test from 'node:test';
import assert from 'node:assert/strict';
import { GOLF_COURSES, getGolfHole, golfHoleCount, terrainHeight } from '../dist/src/golf-courses.js';
import { COURSES, getHole } from '../dist/src/courses.js';
import { minimapModel, minimapMarker, minimapPosition, minimapArtwork } from '../dist/src/minimap.js';
import { terrainFacets, minimapForest } from '../dist/src/minimap-scene.js';
import { newGolfMap, buildGolfMap } from '../dist/src/golf-maps.js';
import { PLANETFALL_INDEX, PLANETS } from '../dist/src/planetfall.js';

test('Planetfall keeps all nine planets and landing caps at their actual coordinates without grass bridges', () => {
  const hole = getGolfHole(PLANETFALL_INDEX, 0, false), before = JSON.stringify(hole);
  const model = minimapModel(hole), svg = minimapArtwork(hole, model);
  assert.equal((svg.match(/data-map-feature="planet"/g) || []).length, PLANETS.length);
  assert.equal((svg.match(/data-map-feature="landing-cap"/g) || []).length, PLANETS.length);
  assert.doesNotMatch(svg, /NaN|Infinity|undefined|data-map-layer="fairway"/);
  for (const planet of PLANETS) {
    const at = model.project(planet.x, planet.z);
    assert.equal(minimapMarker(model, planet).outside, false);
    assert.ok(svg.includes(planet.name));
    assert.ok(at.x - planet.radius * model.scale >= 18 && at.x + planet.radius * model.scale <= 222);
    assert.ok(at.y - planet.radius * model.scale >= 18 && at.y + planet.radius * model.scale <= 194);
    assert.ok(svg.includes(`cx="${at.x.toFixed(2)}" cy="${at.y.toFixed(2)}" r="${(planet.pad * model.scale).toFixed(2)}"`));
  }
  assert.equal(JSON.stringify(hole), before);
});

test('every authored golf and mini hole fits its tee and cup with an undistorted map scale', () => {
  const holes = [];
  for (let c = 0; c < GOLF_COURSES.length; c++) for (let i = 0; i < golfHoleCount(c); i++) holes.push(getGolfHole(c, i, false));
  for (let c = 0; c < COURSES.length; c++) for (let i = 0; i < 9; i++) holes.push(getHole(c, i));
  for (const hole of holes) {
    const m = minimapModel(hole), svg = minimapArtwork(hole, m);
    for (const at of [hole.start, hole.cup]) {
      const p = m.project(at.x, at.z);
      assert.ok(p.x >= 18 && p.x <= 222 && p.y >= 18 && p.y <= 194, hole.name);
      assert.equal(minimapMarker(m, at).outside, false, hole.name);
    }
    const p = m.project(0, 0), x = m.project(10, 0), z = m.project(0, 10);
    assert.ok(Math.abs((x.x - p.x) - (z.y - p.y)) < 1e-10);
    assert.doesNotMatch(svg, /NaN|Infinity|undefined/, hole.name);
  }
});

test('ball markers move with the ball and point off-map without disappearing beyond the frame', () => {
  const m = minimapModel(getGolfHole(0, 0, false));
  const a = minimapMarker(m, { x: 0, z: 0 }), b = minimapMarker(m, { x: 10, z: -50 });
  assert.notDeepEqual(a, b); assert.equal(b.outside, false);
  const right = minimapMarker(m, { x: 10000, z: -100 });
  assert.equal(right.x, 230); assert.equal(right.outside, true); assert.ok(Math.abs(right.angle) < 1);
  const above = minimapMarker(m, { x: 0, z: -10000 });
  assert.equal(above.y, 14); assert.equal(above.outside, true); assert.ok(above.angle < -89 && above.angle > -91);
});

test('expanded widgets keep their rim off the edge after dragging, reopening and resizing', () => {
  for (const [v, size] of [[{ width: 1280, height: 720 }, { width: 248, height: 293 }], [{ width: 390, height: 844 }, { width: 194, height: 244 }], [{ width: 907, height: 510 }, { width: 248, height: 293 }]]) {
    const start = minimapPosition(v, size, null, 106);
    assert.equal(start.x + size.width, v.width - 12); assert.equal(start.y, 106);
    for (const x of [-2, 0, .4, 1, 4]) for (const y of [-2, 0, .7, 1, 4]) {
      const p = minimapPosition(v, size, { x, y });
      assert.ok(p.x >= 12 && p.y >= 12);
      assert.ok(p.x + size.width <= v.width - 12 && p.y + size.height <= v.height - 12);
    }
  }
});

test('map artwork retains lava cuts, island gaps, coastal water and real faceted tree silhouettes', () => {
  const lava = minimapArtwork(getGolfHole(18, 0, false));
  assert.match(lava, /#ff9a32/); assert.match(lava, /#ffe070/);
  const sky = minimapArtwork(getGolfHole(17, 0, false)); assert.match(sky, /#97cfdb/);
  const coast = getGolfHole(1, 0, false); assert.match(minimapArtwork(coast), new RegExp(coast.course.water));
  const forest = getGolfHole(0, 0, false);
  forest.trees = Array.from({ length: 10000 }, (_, i) => ({ x: -150 + i % 100 * 3, z: -Math.floor(i / 100) * 4, size: 1.1, type: i % 2 ? 'pine' : 'oak' }));
  const svg = minimapArtwork(forest), selected = minimapForest(forest, minimapModel(forest));
  assert.ok(selected.length > 50 && selected.length <= 112);
  assert.equal((svg.match(/data-map-tree=/g) || []).length, selected.length);
  assert.match(svg, /data-map-tree="pine"/); assert.match(svg, /data-map-tree="canopy"/);
  assert.equal((svg.match(/id="minimap-pine"/g) || []).length, 1);
  assert.equal((svg.match(/id="minimap-canopy"/g) || []).length, 1);
  assert.match(svg, /<use href="#minimap-pine"/); assert.ok(svg.length < 100000);
  assert.doesNotMatch(svg, /<circle|<ellipse/);
  for (const p of selected) assert.ok(forest.trees.includes(p.tree));
  for (let i = 0; i < selected.length; i++) for (let j = i + 1; j < selected.length; j++)
    assert.ok(Math.hypot(selected[i].point.x - selected[j].point.x, selected[i].point.y - selected[j].point.y) >= 6.6);
  forest.course = { ...forest.course, grass: '\"><script>bad()</script>' };
  assert.doesNotMatch(minimapArtwork(forest), /<script|bad\(\)/);
});

test('relief faces sample the actual course heights and shade slopes without moving map coordinates', () => {
  const hole = getGolfHole(14, 4, false), model = minimapModel(hole), faces = terrainFacets(hole, model);
  assert.equal(faces.length, 98);
  assert.ok(Math.max(...faces.map(f => f.light)) - Math.min(...faces.map(f => f.light)) > .04);
  for (const face of faces) for (const p of face.vertices) {
    assert.equal(p.height, terrainHeight(hole, p.x, p.z));
    const screen = model.project(p.x, p.z);
    assert.ok(Math.hypot(screen.x - p.screen.x, screen.y - p.screen.y) < 1e-9);
  }
});

test('generated community layouts keep their own geometry, readable hazards and stable source coordinates', () => {
  for (let i = 0; i < 8; i++) {
    const draft = newGolfMap(), length = 180 + i * 55;
    Object.assign(draft, { name: 'Generated ' + i, theme: i % 3, width: 28 + i * 3, contour: i % 3, density: .2,
      points: [[0, 0], [i * 3, -length / 3], [-i * 4, -length * 2 / 3], [i * 2, -length]],
      water: [{ x: -56, z: -length * .55, rx: 12, rz: 18 }], bunkers: [{ x: 43, z: -length * .8, rx: 6, rz: 10 }] });
    const hole = buildGolfMap(draft), model = minimapModel(hole), before = JSON.stringify({ points: hole.points, water: hole.water, bunkers: hole.bunkers });
    const svg = minimapArtwork(hole, model, [{ name: 'cabin', x: 25, z: -length * .5 }]);
    assert.match(svg, /data-map-feature="water"/); assert.match(svg, /data-map-feature="bunker"/); assert.match(svg, /data-map-feature="landmark"/);
    assert.doesNotMatch(svg, /NaN|Infinity|undefined/);
    assert.equal(before, JSON.stringify({ points: hole.points, water: hole.water, bunkers: hole.bunkers }));
    assert.equal(minimapMarker(model, hole.cup).outside, false);
  }
});
