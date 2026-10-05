import { buildGolfLayout } from "./golf-courses.js";
const number = (v, min, max, label) => {
  if (!Number.isFinite(v) || v < min || v > max) throw Error(`${label} must be between ${min} and ${max}.`);
  return v;
};
export function newGolfMap() {
  return {
    version: 2,
    mode: "golf",
    name: "My parkland hole",
    par: 4,
    theme: 0,
    width: 38,
    contour: 1,
    density: 0.8,
    points: [
      [0, 0],
      [-12, -80],
      [8, -165],
      [20, -250],
      [6, -340],
    ],
    greenSize: 15,
    water: [{ x: -52, z: -185, rx: 19, rz: 30 }],
    bunkers: [{ x: 31, z: -330, rx: 7, rz: 11 }],
  };
}
export function validateGolfMap(raw) {
  if (
    !raw ||
    raw.version !== 2 ||
    raw.mode !== "golf" ||
    typeof raw.name !== "string" ||
    !raw.name.trim() ||
    raw.name.length > 40
  )
    throw Error("Give this golf hole a name of 1–40 characters.");
  if (!Array.isArray(raw.points) || raw.points.length < 3 || raw.points.length > 12)
    throw Error("Use 3–12 fairway points.");
  const m = {
    version: 2,
    mode: "golf",
    name: raw.name.trim(),
    par: number(raw.par, 3, 6, "Par"),
    theme: number(raw.theme, 0, 2, "Theme"),
    width: number(raw.width, 24, 56, "Fairway width"),
    contour: number(raw.contour, 0, 2, "Terrain contours"),
    density: number(raw.density, 0, 1, "Tree density"),
    greenSize: number(raw.greenSize, 11, 22, "Green size"),
    points: raw.points.map((p) => {
      if (!Array.isArray(p) || p.length !== 2) throw Error("Invalid fairway point.");
      return [number(p[0], -80, 80, "Fairway position"), number(p[1], -620, 0, "Fairway distance")];
    }),
    water: [],
    bunkers: [],
  };
  if (!Number.isInteger(m.par) || !Number.isInteger(m.theme))
    throw Error("Par and theme must be whole numbers.");
  if (m.points[0][0] !== 0 || m.points[0][1] !== 0) throw Error("Keep the tee at the origin.");
  if (-m.points.at(-1)[1] < 100) throw Error("Golf holes must be at least 100 metres long.");
  for (let i = 1; i < m.points.length; i++)
    if (m.points[i][1] > m.points[i - 1][1] - 25)
      throw Error("Keep fairway points at least 25 metres apart toward the green.");
  const [cx, cz] = m.points.at(-1),
    all = [];
  for (const key of ["water", "bunkers"]) {
    if (!Array.isArray(raw[key]) || raw[key].length > 8)
      throw Error("Use at most eight ponds and eight bunkers.");
    m[key] = raw[key].map((p) => {
      const q = {
        x: number(p.x, -130, 130, "Hazard position"),
        z: number(p.z, cz - 50, 30, "Hazard distance"),
        rx: number(p.rx, 3, 35, "Hazard width"),
        rz: number(p.rz, 3, 55, "Hazard length"),
      };
      if (
        Math.hypot(q.x / (q.rx + 7), q.z / (q.rz + 10)) < 1 ||
        Math.hypot((q.x - cx) / (q.rx + m.greenSize + 2), (q.z - cz) / (q.rz + m.greenSize * 1.2 + 2)) < 1
      )
        throw Error("Keep hazards clear of the tee and putting green.");
      if (all.some((p) => Math.hypot((p.x - q.x) / (p.rx + q.rx + 2), (p.z - q.z) / (p.rz + q.rz + 2)) < 1))
        throw Error("Leave a grass border between hazards.");
      all.push(q);
      return q;
    });
  }
  return m;
}
export function buildGolfMap(raw) {
  const m = validateGolfMap(raw),
    [x, z] = m.points.at(-1);
  const h = buildGolfLayout(m.theme, 0, {
    ...m,
    green: [x, z, m.greenSize, m.greenSize * 1.2],
    water: m.water.map((p) => [p.x, p.z, p.rx, p.rz]),
    bunkers: m.bunkers.map((p) => [p.x, p.z, p.rx, p.rz]),
    landmark: "community",
  });
  h.custom = true;
  return h;
}
