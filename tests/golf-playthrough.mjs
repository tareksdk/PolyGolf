import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { GolfPhysics, CLUBS } from '../dist/src/golf-physics.js';
import { getGolfHole, golfHoleCount, terrainAt } from '../dist/src/golf-courses.js';
import { verifyHole } from '../dist/src/replay.js';

// A bounded planner uses real clubs, wind, terrain and fairway lay-ups. Every
// solution is replayed by the server verifier with the starting equipment.
const option = name => process.argv.find(a => a.startsWith(name + '='))?.slice(name.length + 1);
const solutions = [];
const requestedCourse=option('--course');
for (const c of requestedCourse===undefined?[0,1,2]:[Number(requestedCourse)]) for (let index = 0; index < golfHoleCount(c); index++) {
  if (option('--course') !== undefined && c !== Number(option('--course'))) continue;
  if (option('--hole') !== undefined && index !== Number(option('--hole'))) continue;
  const h = getGolfHole(c, index), commands = [], landings = [];
  let current = new GolfPhysics(), shots = 0, ticks = 0;
  current.load(h);
  while (!current.sunk && shots < h.par + 6) {
    const distance = Math.hypot(h.cup.x - current.ball.x, h.cup.z - current.ball.z),
      lie = terrainAt(h, current.ball.x, current.ball.z).surface;
    let best;
    const tryShot = (club, power, a) => {
      power = Math.max(.01, Math.min(1, power));
      const p = new GolfPhysics();
      p.load(h); p.ball = { ...current.ball };
      p.shoot(Math.sin(a), Math.cos(a), power, { club });
      let steps = 0;
      while (p.active && steps < 5500) { p.update(1 / 120); steps++; }
      const remaining = Math.hypot(h.cup.x - p.ball.x, h.cup.z - p.ball.z),
        surface = terrainAt(h, p.ball.x, p.ball.z).surface,
        score = p.sunk ? -1 : p.events.includes('water') || p.active ? 1e5 :
          remaining + (remaining > 35 ? surface === 'sand' ? 8 : surface === 'rough' ? 4 : 0 : 0);
      if (!best || score < best.score) best = { p, score, club, power, a, steps };
    };
    const aim = target => {
      const d = Math.hypot(target.x - current.ball.x, target.z - current.ball.z),
        a = Math.atan2(target.x - current.ball.x, target.z - current.ball.z),
        clubs = d < 16 ? [CLUBS.at(-1)] : CLUBS.filter(v => v.id !== 'putter' && v.carry > d * .7 && v.carry < d * 1.65);
      if (!clubs.length) clubs.push(CLUBS[0]);
      for (const club of clubs) {
        const power = club.id === 'putter' ? Math.sqrt(d / 36) : Math.min(1, (d / club.carry) ** .6) / (lie === 'rough' ? .87 : 1);
        for (const offset of [-.06, 0, .06]) tryShot(club.id, power + offset, a);
      }
    };
    aim(h.cup);
    if (distance > 100) for (const carry of [95, 155, 215]) {
      const z = Math.max(h.cup.z + 30, current.ball.z - carry);
      if (z >= current.ball.z - 40) continue;
      const [x, rz] = h.route.reduce((a, b) => Math.abs(a[1] - z) < Math.abs(b[1] - z) ? a : b);
      aim({ x, z: rz });
    }
    for (const [dp, da] of [[.08,.035],[.025,.012],[.008,.004],[.0025,.0013],[.0008,.0004]]) {
      for (let cycle = 0; cycle < 3 && best.score > 0; cycle++) {
        const b = best;
        for (const offset of [-1, 1]) { tryShot(b.club, b.power + dp * offset, b.a); tryShot(b.club, b.power, b.a + da * offset); }
        if (best === b) break;
      }
    }
    commands.push({ kind: 'shot', tick: ticks, dx: Math.sin(best.a), dz: Math.cos(best.a), power: best.power, club: best.club, shape: 0, spin: 0 });
    ticks += best.steps;
    current = best.p; shots++;
    landings.push({ ...current.ball, club: best.club });
    if (process.argv.includes('--debug')) console.log(h.name, shots, best.club, best.power.toFixed(3), current.ball.x.toFixed(1), current.ball.z.toFixed(1), best.score.toFixed(2));
    if (best.score >= 1e5) break;
  }
  assert.ok(current.sunk, `${h.course.name} / ${h.name} did not finish`);
  const replay = verifyHole({ mode: 'golf', course: c, equipment: {} }, index, commands, ticks);
  assert.equal(replay.strokes, shots);
  assert.equal(replay.penalties, 0);
  solutions.push({ course: c, index, commands, endTick: ticks, landings });
  console.log(`${h.course.name} / ${h.name}: ${shots} shots, cup reached and replay verified.`);
}
if (option('--output')) await writeFile(option('--output'), JSON.stringify(solutions, null, 2));
