import { CLUBS } from './golf-physics.js';

export const GUIDE_SAMPLES = 33;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

// An aiming gesture, not a simulated shot: only the opening direction and loft
// are suggested. Wind, the lie, bounce and the eventual landing stay unread.
export function directionalGuideSpec(power = .85, options = {}) {
  const club = CLUBS.find(c => c.id === options.club) || CLUBS[0];
  const putting = club.id === 'putter', p = clamp(power, .01, 1);
  const length = putting ? 1.5 + p * 4.5 : clamp(club.carry * Math.pow(p, 1.3) * .27, 2.4, 68);
  const rise = putting ? 0 : Math.max(.45, length * Math.tan((club.loft + (options.spin || 0) * 3) * Math.PI / 180) * .8);
  return { putting, length, rise, bend: putting ? 0 : (options.shape || 0) * length * .055 };
}

// Writes into the same reusable array on every frame; there is no worker
// round trip, timer throttle, rounded angle cache or geometry replacement.
export function fillDirectionalGuide(target, ball, direction, power, options = {}, ground) {
  const { putting, length, rise, bend } = directionalGuideSpec(power, options);
  const n = Math.hypot(direction.x, direction.z) || 1, dx = direction.x / n, dz = direction.z / n;
  for (let i = 0; i < GUIDE_SAMPLES; i++) {
    const t = i / (GUIDE_SAMPLES - 1), d = length * t, sideways = bend * t * t;
    const x = ball.x + dx * d - dz * sideways, z = ball.z + dz * d + dx * sideways;
    const y = putting && ground ? ground(x, z) + .085 : ball.y + .1 + rise * (2 * t - .7 * t * t);
    target[i * 3] = x; target[i * 3 + 1] = y; target[i * 3 + 2] = z;
  }
  return GUIDE_SAMPLES;
}
