import { availableLockers } from './pro-shop.js';

export function rollRoundLocker(round, random = Math.random, now=Date.now()) {
  const count = round.mode === 'golf' ? 3 : round.mode === 'mini' ? 9 : 0;
  if (!count || round.practice || round.skipped || round.customOrigin || round.sudden ||
      round.strokes?.length !== count || !round.strokes.every(n => Number.isInteger(n) && n > 0)) return null;
  if (random() >= 0.1) return null;
  const lockers=availableLockers(now);
  return lockers[Math.min(lockers.length - 1, Math.floor(random() * lockers.length))].id;
}
