import { pathDistance, fairwayWidth, coastBounds } from "./golf-courses.js";
const noise = (x, z, s) => {
  const n = Math.sin(x * 127.1 + z * 311.7 + s * 74.7) * 43758.5453;
  return n - Math.floor(n);
};
export function populateForest(h, density = 1) {
  const trees = [],
    grid = {},
    step = 6.1,
    limit = h.courseIndex === 1 ? 118 : 188;
  if (density <= 0) {
    h.trees = trees;
    h.treeGrid = grid;
    return;
  }
  const oval = (p, x, z) => Math.hypot((x - p.x) / p.rx, (z - p.z) / p.rz);
  for (let z = 96; z > -h.length - 116; z -= step)
    for (let x = -limit; x < limit; x += step) {
      const r = noise(x, z, h.seed),
        px = x + (r - 0.5) * 1.2,
        pz = z + (noise(z, x, h.seed) - 0.5) * 1.2;
      if (h.courseIndex === 1 && px > coastBounds(h, pz)[1] - 10) continue;
      if (
        r > density ||
        Math.hypot(px + 26, pz - 24) < 16 ||
        Math.hypot(px, pz) < 12 ||
        (h.courseIndex === 1 && Math.hypot(px + 105, pz + h.length * 0.65) < 18)
      )
        continue;
      if (
        pz < 8 &&
        pz > -h.length - 8 &&
        pathDistance(h, px, pz) < fairwayWidth(h, Math.max(0, Math.min(1, -pz / h.length))) / 2 + 9
      )
        continue;
      if (oval(h.green, px, pz) < 1.5 || [...h.water, ...h.bunkers].some((p) => oval(p, px, pz) < 1.3))
        continue;
      const far = Math.abs(px) > 145 || pz > 60 || pz < -h.length - 65;
      const type =
        h.courseIndex === 2
          ? r < 0.65
            ? "larch"
            : r < 0.92
              ? "pine"
              : "autumn-oak"
          : h.courseIndex === 1
            ? r < 0.87
              ? "pine"
              : "oak"
            : r < 0.65
              ? "pine"
              : r < 0.94
                ? "oak"
                : "willow";
      const t = { x: px, z: pz, type, size: 1.05 + noise(px, pz, 7) * 0.35, far };
      trees.push(t);
      const key = Math.floor(px / 10) + ":" + Math.floor(pz / 10);
      (grid[key] ??= []).push(t);
    }
  h.trees = trees;
  h.treeGrid = grid;
}
export function nearbyTrees(h, x, z) {
  if (!h.treeGrid) return h.trees || [];
  const result = [],
    gx = Math.floor(x / 10),
    gz = Math.floor(z / 10);
  for (let a = -1; a <= 1; a++)
    for (let b = -1; b <= 1; b++) result.push(...(h.treeGrid[gx + a + ":" + (gz + b)] || []));
  return result;
}
