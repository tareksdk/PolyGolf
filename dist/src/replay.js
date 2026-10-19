import { getHole } from "./courses.js";
import { getGolfHole } from "./golf-courses.js";
import { PhysicsManager, FIXED_STEP } from "./physics.js";
import { GolfPhysics } from "./golf-physics.js";
import { miniStats, golfGear } from "./equipment.js";
export function verifyHole(round, index, commands, endTick, { featureOnly = false } = {}) {
  if (
    !Array.isArray(commands) ||
    commands.length < 1 ||
    commands.length > 40 ||
    !Number.isInteger(endTick) ||
    endTick < 0 ||
    endTick > 108000
  )
    throw Error("Invalid replay.");
  const h = (round.mode === "golf" ? getGolfHole : getHole)(round.course, index),
    p = round.mode === "golf" ? new GolfPhysics() : new PhysicsManager();
  p.load(h);
  let tick = 0,
    strokes = 0,
    penalties = 0,
    done = false,
    collected = false, pirateHit = false, pumpkinHit = false, darbyFound = false;
  function step() {
    p.update(FIXED_STEP);
    tick++;
    for (const e of p.events.splice(0)) {
      if (e === "cup") done = true;
      if (e === "pirate-ship") pirateHit = true;
      if (e === "pumpkin") pumpkinHit = true;
      if (e === "darby") darbyFound = true;
      if (e === "water") {
        penalties++;
        strokes++;
        p.reset();
      }
    }
    if (
      round.mode === "mini" &&
      strokes &&
      Math.hypot(p.ball.x - h.collectible.x - Math.min(h.width * 0.24, 1.2), p.ball.z - h.collectible.z) < 0.9
    )
      collected = true;
  }
  for (const c of commands) {
    if (!Number.isInteger(c.tick) || c.tick < tick || c.tick > endTick || done)
      throw Error("Invalid replay sequence.");
    while (tick < c.tick && !done) step();
    if (done) throw Error("Shot after hole completion.");
    if (c.kind === "shot") {
      if (
        ![c.dx, c.dz, c.power, c.shape, c.spin].every(Number.isFinite) ||
        Math.abs(Math.hypot(c.dx, c.dz) - 1) > 0.001 ||
        c.power < 0.01 ||
        c.power > 1 ||
        Math.abs(c.shape) > 1 ||
        Math.abs(c.spin) > 1 ||
        strokes >= h.par + 8
      )
        throw Error("Invalid shot.");
      if (
        !p.shoot(c.dx, c.dz, c.power, {
          club: c.club,
          shape: c.shape,
          spin: c.spin,
          gear: round.mode === "golf" ? golfGear(round.equipment) : miniStats(round.equipment),
        })
      )
        throw Error("Cannot shoot a moving ball.");
      strokes++;
    } else if (c.kind === "reset") {
      p.reset();
      strokes++;
      penalties++;
    } else if (c.kind === "skip") {
      strokes = Math.max(strokes, h.par + 6);
      done = true;
    } else throw Error("Unknown replay action.");
  }
  while (tick < endTick && !done) step();
  if (!done && !featureOnly) throw Error("The replay did not finish the hole.");
  if (featureOnly === 'pumpkin' && !pumpkinHit) throw Error('The replay did not hit the pumpkin.');
  if(featureOnly==='darby'&&!darbyFound)throw Error('The replay did not find Darby.');
  if (featureOnly && featureOnly !== 'pumpkin' && featureOnly !== 'darby' && !pirateHit) throw Error("The replay did not hit the pirate ship.");
  return { index, strokes, par: h.par, penalties, collectible: collected, pirateHit, pumpkinHit, darbyFound, time: endTick / 120 };
}
