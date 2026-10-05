// Sweep the whole simulation step, so a putt cannot tunnel across the cup.
export function cupCapture(a, b, cup, radius, centreSpeed) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((cup.x - a.x) * dx + (cup.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
  const miss = Math.hypot(a.x + t * dx - cup.x, a.z + t * dz - cup.z);
  if (miss >= radius) return false;
  // A direct putt is forgiving; a glancing lip still needs a controlled pace.
  const allowance = centreSpeed * (0.38 + 0.62 * Math.sqrt(1 - (miss / radius) ** 2));
  return Math.hypot(b.vx, b.vz) <= allowance;
}
