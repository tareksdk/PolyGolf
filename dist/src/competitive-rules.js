import { buildGolfLayout } from "./golf-courses.js";
import { GolfPhysics } from "./golf-physics.js";
import { golfGear } from "./equipment.js";
export const COMPETITIVE_LEVEL = 1;
export { RANKS, rankFor } from "./ranks.js";
export function eloChange(winner, loser) {
  return Math.max(1, Math.round(32 * (1 - 1 / (1 + 10 ** ((loser - winner) / 400)))));
}
export function suddenHole() {
  const h = buildGolfLayout(0, 0, {
    name: "Closest to the Pin",
    par: 3,
    points: [
      [0, 0],
      [0, -40],
      [0, -95],
    ],
    width: 48,
    green: [0, -95, 20, 22],
    water: [],
    bunkers: [],
    contour: 0.2,
    density: 0.8,
  });
  h.wind = { x: 1.1, z: 0 };
  return h;
}
export function verifySudden(equipment, commands, endTick) {
  if (
    !Array.isArray(commands) ||
    commands.length !== 1 ||
    commands[0].kind !== "shot" ||
    !Number.isInteger(endTick) ||
    endTick < 1 ||
    endTick > 24000
  )
    throw Error("Sudden death allows exactly one shot.");
  const c = commands[0];
  if (
    !Number.isInteger(c.tick) ||
    c.tick < 0 ||
    c.tick >= endTick ||
    ![c.dx, c.dz, c.power, c.shape, c.spin].every(Number.isFinite) ||
    Math.abs(Math.hypot(c.dx, c.dz) - 1) > 0.001 ||
    c.power < 0.01 ||
    c.power > 1 ||
    Math.abs(c.shape) > 1 ||
    Math.abs(c.spin) > 1
  )
    throw Error("Invalid sudden-death shot.");
  const h = suddenHole(),
    p = new GolfPhysics();
  p.load(h);
  if (
    !p.shoot(c.dx, c.dz, c.power, { club: c.club, shape: c.shape, spin: c.spin, gear: golfGear(equipment) })
  )
    throw Error("Invalid club.");
  let hazard = false;
  for (let tick = c.tick; tick < endTick && p.active; tick++) {
    p.update(1 / 120);
    if (p.events.includes("water")) {
      hazard = true;
      break;
    }
    p.events = [];
  }
  if (p.active && !hazard) throw Error("Wait for the shot to finish.");
  return {
    distance: hazard
      ? 1000000
      : p.sunk
        ? 0
        : Math.round(Math.hypot(p.ball.x - h.cup.x, p.ball.z - h.cup.z) * 1000) / 1000,
    time: endTick / 120,
  };
}
