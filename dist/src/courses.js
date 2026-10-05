// Authored hole layouts are sampled once; rendering and physics share the same surface.
export const COURSES = [
  {
    id: "meadow",
    name: "Meadow Valley",
    subtitle: "Take the scenic route.",
    tag: "A breath of fresh air",
    difficulty: "Easy",
    level: 1,
    color: "#659665",
    sky: "#d6e9de",
    grass: "#88bc64",
    edge: "#bd9365",
    water: "#64bdd1",
    accent: "#f2cd68",
    theme: "forest",
  },
  {
    id: "canyon",
    name: "Amber Canyon",
    subtitle: "Where the sand meets the sun.",
    tag: "Chase the golden hour",
    difficulty: "Medium",
    level: 3,
    color: "#ca7946",
    sky: "#f6ddbd",
    grass: "#d6a15a",
    edge: "#ad6547",
    water: "#52b6c1",
    accent: "#d2784e",
    theme: "desert",
  },
  {
    id: "frost",
    name: "Frostline Peaks",
    subtitle: "Keep your cool.",
    tag: "A fresh perspective",
    difficulty: "Medium",
    level: 5,
    color: "#76aabb",
    sky: "#dfeff4",
    grass: "#c9e7e9",
    edge: "#89b3c3",
    water: "#83c9e7",
    accent: "#80bccf",
    theme: "snow",
  },
  {
    id: "neon",
    name: "Afterglow City",
    subtitle: "One more round after dark.",
    tag: "Light up the leaderboard",
    difficulty: "Hard",
    level: 8,
    color: "#78639f",
    sky: "#292943",
    grass: "#515a80",
    edge: "#b07ab7",
    water: "#575db5",
    accent: "#f3a2d9",
    theme: "city",
  },
  {
    id: "sky",
    name: "Cloud Nine",
    subtitle: "A little closer to the sky.",
    tag: "Find your higher ground",
    difficulty: "Hard",
    level: 12,
    color: "#829fa0",
    sky: "#d5e6f1",
    grass: "#a9cfa1",
    edge: "#d3bba1",
    water: "#89d3e4",
    accent: "#d9b3df",
    theme: "sky",
  },
];
const layouts = [
  {
    name: "The Warm Welcome",
    par: 3,
    p: [
      [0, 10],
      [0, 4],
      [3, -2],
      [9, -5],
    ],
    width: 5.4,
  },
  {
    name: "Around the Bend",
    par: 3,
    p: [
      [-8, 9],
      [-8, 0],
      [-4, -5],
      [5, -5],
      [9, -9],
    ],
    width: 5,
    ob: [{ t: 0.54, r: 0.8 }],
  },
  {
    name: "A Sandy Detour",
    par: 4,
    p: [
      [-8, 10],
      [-3, 7],
      [2, 0],
      [-3, -5],
      [4, -10],
    ],
    width: 5,
    surface: [{ a: 0.25, b: 0.42, type: "sand" }],
    ob: [{ t: 0.68, r: 0.9 }],
  },
  {
    name: "Over the Brook",
    par: 3,
    p: [
      [-7, 10],
      [-3, 4],
      [0, 0],
      [3, -5],
      [8, -9],
    ],
    width: 5,
    bridge: [0.37, 0.6],
  },
  {
    name: "The Windmill Way",
    par: 4,
    p: [
      [-9, 9],
      [-4, 4],
      [0, 2],
      [4, -4],
      [10, -8],
    ],
    width: 5,
    moving: [{ t: 0.5, speed: 1.1, r: 0.8 }],
  },
  {
    name: "Up and Away",
    par: 4,
    p: [
      [-9, 10],
      [-4, 7],
      [0, 1],
      [2, -4],
      [8, -8],
    ],
    width: 5.4,
    ramp: [0.24, 0.56, 2.1],
    surface: [{ a: 0.45, b: 0.51, type: "jump" }],
  },
  {
    name: "The Long Way Home",
    par: 5,
    p: [
      [-11, 10],
      [-10, 0],
      [-5, -8],
      [4, -9],
      [9, -3],
      [9, 6],
    ],
    width: 4.8,
    ob: [
      { t: 0.34, r: 0.9 },
      { t: 0.68, r: 0.9 },
    ],
    surface: [{ a: 0.43, b: 0.52, type: "mud" }],
  },
  {
    name: "Two Ways to Sunday",
    par: 4,
    p: [
      [-9, 9],
      [-10, 0],
      [-4, -6],
      [4, -6],
      [10, 0],
      [9, 8],
    ],
    width: 5.5,
    shortcut: true,
    moving: [{ t: 0.46, speed: 1.35, r: 0.65 }],
    surface: [{ a: 0.18, b: 0.26, type: "boost" }],
  },
  {
    name: "The Victory Lap",
    par: 5,
    p: [
      [-11, 10],
      [-9, 2],
      [-3, 1],
      [0, -6],
      [7, -9],
      [11, -3],
    ],
    width: 4.6,
    bridge: [0.54, 0.68],
    moving: [{ t: 0.3, speed: 0.9, r: 0.65 }],
    ramp: [0.05, 0.25, 1.1],
    ob: [{ t: 0.8, r: 0.75 }],
  },
];
const names = [
  null,
  [
    "First Light",
    "Red Rock Run",
    "Dune Drifter",
    "The Dry Creek",
    "Canyon Swing",
    "Mesa Flight",
    "Copper Switchback",
    "The Outlaw Cut",
    "Golden Hour",
  ],
  [
    "Fresh Tracks",
    "Glacier Bend",
    "Snowdrift",
    "The Frozen Crossing",
    "Frostbite Gate",
    "Snowcap Leap",
    "Polar Passage",
    "Northern Shortcut",
    "Summit Finish",
  ],
  [
    "Neon Arrival",
    "Skyline Switch",
    "Midnight Drift",
    "Overpass",
    "Rush Hour",
    "Launch Sequence",
    "Electric Avenue",
    "Express Lane",
    "Last Light",
  ],
  [
    "Soft Landing",
    "Cloud Curves",
    "Garden Path",
    "Rainbow Bridge",
    "Wind Chimes",
    "Leap of Faith",
    "Stratosphere",
    "Secret Garden",
    "Ninth Heaven",
  ],
];
export function samplePath(points, count = 160) {
  const out = [];
  for (let i = 0; i <= count; i++) {
    const t = (i / count) * (points.length - 1),
      j = Math.min(points.length - 2, Math.floor(t)),
      f = t - j;
    const p0 = points[Math.max(0, j - 1)],
      p1 = points[j],
      p2 = points[j + 1],
      p3 = points[Math.min(points.length - 1, j + 2)];
    const coord = (k) =>
      0.5 *
      (2 * p1[k] +
        (-p0[k] + p2[k]) * f +
        (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * f * f +
        (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * f * f * f);
    out.push({ x: coord(0), z: coord(1), t: i / count });
  }
  return out;
}
export function getHole(courseIndex, index) {
  const base = layouts[index],
    c = COURSES[courseIndex];
  const angle = courseIndex * 0.22,
    scale = 1 + courseIndex * 0.05;
  const points = base.p.map(([x, z]) => [
    (x * Math.cos(angle) - z * Math.sin(angle)) * scale,
    (x * Math.sin(angle) + z * Math.cos(angle)) * scale,
  ]);
  const h = {
    ...structuredClone(base),
    name: names[courseIndex]?.[index] || base.name,
    index,
    courseIndex,
    course: c,
    points,
  };
  h.samples = samplePath(points);
  h.width = base.width - (courseIndex > 2 ? 0.35 : 0);
  h.surface = [...(h.surface || [])];
  if (courseIndex === 1 && index % 2 === 0) h.surface.push({ a: 0.6, b: 0.72, type: "sand" });
  if (courseIndex === 2) h.surface.push({ a: 0.12, b: 0.8, type: "ice" });
  if (courseIndex === 3)
    h.surface.push({ a: 0.2, b: 0.29, type: "boost" }, { a: 0.65, b: 0.72, type: "jump" });
  if (courseIndex === 4) {
    h.wind = { x: 1.2, z: -0.5 };
    h.surface.push({ a: 0.2, b: 0.25, type: "jump" });
  }
  h.start = h.samples[5];
  h.cup = h.samples[h.samples.length - 8];
  h.collectible = h.samples[Math.round(h.samples.length * 0.72)];
  return h;
}
export function heightAt(h, t) {
  if (!h.ramp) return 0;
  const [a, b, y] = h.ramp;
  if (t < a || t > b) return 0;
  return Math.sin(((t - a) / (b - a)) * Math.PI) * y;
}
export function nearestPoint(h, x, z) {
  let best = null,
    dist = Infinity;
  for (const p of h.samples) {
    const d = (p.x - x) ** 2 + (p.z - z) ** 2;
    if (d < dist) {
      dist = d;
      best = p;
    }
  }
  return { ...best, distance: Math.sqrt(dist) };
}
export function surfaceAt(h, t) {
  return [...h.surface].reverse().find((s) => t >= s.a && t <= s.b)?.type || "grass";
}
export function relative(n) {
  return n === 0 ? "E" : n > 0 ? "+" + n : String(n);
}
export function scoreName(strokes, par) {
  if (strokes === 1) return "Hole in one!";
  return (
    { "-3": "Albatross!", "-2": "Eagle!", "-1": "Birdie!", 0: "On par!", 1: "Bogey", 2: "Double bogey" }[
      strokes - par
    ] || `${strokes - par > 0 ? "+" : ""}${strokes - par} to par`
  );
}
