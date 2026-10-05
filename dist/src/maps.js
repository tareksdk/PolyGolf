import { validateGolfMap, buildGolfMap } from "./golf-maps.js";
import { COURSES, samplePath } from "./courses.js";
const finite = (v, a, b, name) => {
  if (typeof v !== "number" || !Number.isFinite(v) || v < a || v > b) throw Error(`Invalid ${name}.`);
  return v;
};
export function newMap() {
  return {
    version: 1,
    name: "My little course",
    par: 3,
    theme: 0,
    width: 5,
    points: [
      [0, 12],
      [0, 4],
      [7, -3],
      [8, -12],
    ],
    surface: [],
    ob: [],
    moving: [],
    ramp: null,
    bridge: null,
  };
}
export function validateMap(raw) {
  if (raw?.mode === "golf") return validateGolfMap(raw);
  if (!raw || raw.version !== 1 || typeof raw.name !== "string" || !raw.name.trim() || raw.name.length > 40)
    throw Error("Map needs a name of 1–40 characters.");
  if (!Array.isArray(raw.points) || raw.points.length < 3 || raw.points.length > 16)
    throw Error("Use 3–16 path points.");
  const m = {
    version: 1,
    name: raw.name.trim(),
    par: finite(raw.par, 2, 8, "par"),
    theme: finite(raw.theme, 0, 4, "theme"),
    width: finite(raw.width, 3, 8, "width"),
    points: raw.points.map((p) => {
      if (!Array.isArray(p) || p.length !== 2) throw Error("Invalid point.");
      return p.map((v) => finite(v, -15, 15, "point"));
    }),
    surface: [],
    ob: [],
    moving: [],
    ramp: null,
    bridge: null,
  };
  if (!Number.isInteger(m.par) || !Number.isInteger(m.theme))
    throw Error("Par and theme must be whole numbers.");
  for (let i = 1; i < m.points.length; i++)
    if (Math.hypot(m.points[i][0] - m.points[i - 1][0], m.points[i][1] - m.points[i - 1][1]) < 2)
      throw Error("Keep adjacent path points at least 2 metres apart.");
  for (const key of ["surface", "ob", "moving"]) {
    if (!Array.isArray(raw[key] || []) || (raw[key] || []).length > 12)
      throw Error("Too many obstacles or surfaces.");
    m[key] = (raw[key] || []).map((o) => {
      if (key === "surface") {
        if (!["sand", "ice", "mud", "boost", "jump"].includes(o.type)) throw Error("Unknown surface.");
        const a = finite(o.a, 0.1, 0.8, "surface start"),
          b = finite(o.b, 0.15, 0.9, "surface end");
        if (b <= a) throw Error("Surface end must follow its start.");
        return { a, b, type: o.type };
      }
      return {
        t: finite(o.t, 0.12, 0.85, "obstacle position"),
        r: finite(o.r, 0.25, 1.2, "radius"),
        ...(key === "moving" ? { speed: finite(o.speed, 0.2, 3, "speed") } : {}),
      };
    });
  }
  if (raw.ramp) {
    const [a, b, h] = raw.ramp;
    finite(a, 0.1, 0.7, "ramp");
    finite(b, 0.2, 0.9, "ramp");
    finite(h, 0.2, 2, "ramp height");
    if (b - a < 0.15) throw Error("Ramp is too short.");
    m.ramp = [a, b, h];
  }
  if (raw.bridge) {
    const [a, b] = raw.bridge;
    finite(a, 0.1, 0.7, "bridge");
    finite(b, 0.2, 0.9, "bridge");
    if (b - a < 0.1) throw Error("Bridge is too short.");
    m.bridge = [a, b];
  }
  const samples = samplePath(m.points);
  for (let i = 1; i < samples.length - 1; i++)
    if (Math.hypot(samples[i + 1].x - samples[i - 1].x, samples[i + 1].z - samples[i - 1].z) < 0.001)
      throw Error("Avoid folding the path directly back on itself.");
  return m;
}
export function buildMap(raw) {
  if (raw?.mode === "golf") return buildGolfMap(raw);
  const m = validateMap(raw),
    samples = samplePath(m.points),
    start = { ...samples[5] },
    cup = { ...samples[samples.length - 8] };
  return {
    ...m,
    mode: "mini",
    custom: true,
    index: 0,
    courseIndex: m.theme,
    course: COURSES[m.theme],
    samples,
    start,
    cup,
    collectible: { ...samples[115] },
    wind: null,
  };
}
