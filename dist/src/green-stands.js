import { ovalBoundary } from './golf-courses.js';

const stands = new WeakMap();

export function greenStand(hole, seat) {
  if (!hole || seat < 0) return null;
  let spots = stands.get(hole);
  if (!spots) { spots = []; stands.set(hole, spots); }
  return spots[seat] ??= standAt(hole, seat);
}

function standAt({ green, start, cup, samples, width }, seat) {
  if (green) {
    // Use the half of the green beyond the cup, away from approaching shots.
    const x = green.x - start.x, z = green.z - start.z;
    const c = Math.cos(green.angle || 0), s = Math.sin(green.angle || 0);
    const back = Math.atan2((z * c - x * s) / green.rz, (x * c + z * s) / green.rx);
    return ovalBoundary(green, back + (seat - 3.5) * .32, .95);
  }

  // Mini courses use a strip of turf. Alternate edges and stagger the rows.
  let i = Math.max(1, samples.indexOf(cup));
  let distance = .9 * Math.floor(seat / 2);
  while (i > 1 && distance > 0) {
    distance -= Math.hypot(samples[i].x - samples[i - 1].x, samples[i].z - samples[i - 1].z);
    i--;
  }
  const from = samples[i - 1], to = samples[i + 1], p = samples[i];
  const dx = to.x - from.x, dz = to.z - from.z;
  const offset = (width / 2 - .32) * (seat % 2 ? 1 : -1) / Math.hypot(dx, dz);
  return { x: p.x - dz * offset, z: p.z + dx * offset };
}
