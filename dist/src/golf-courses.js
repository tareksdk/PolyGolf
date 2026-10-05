import { populateForest } from "./forest.js";
import { samplePath } from "./courses.js";
// All distances are metres. Layouts are shared by the renderer and score verifier.
export const GOLF_COURSES = [
  {
    id: "willow",
    name: "Willow Park",
    subtitle: "Forest fairways in a ring of alpine peaks.",
    tag: "THE PARKLAND COLLECTION",
    theme: "forest",
    level: 1,
    difficulty: "Relaxed",
    sky: "#c7dfeb",
    grass: "#72a655",
    edge: "#637a47",
    water: "#5da4b6",
    accent: "#e8bd68",
    color: "#aac585",
  },
  {
    id: "saltwind",
    name: "Saltwind Links",
    subtitle: "Pine-lined fairways above sheer cliffs and blue water.",
    tag: "THE COASTAL COLLECTION",
    theme: "desert",
    level: 3,
    difficulty: "Balanced",
    sky: "#cfdfdf",
    grass: "#9faf65",
    edge: "#b8a57b",
    water: "#629da9",
    accent: "#e2a576",
    color: "#d4c596",
  },
  {
    id: "redstone",
    name: "Autumn Pines",
    subtitle: "Golden larches, deep pines and mountain-framed greens.",
    tag: "THE AUTUMN COLLECTION",
    theme: "forest",
    level: 5,
    difficulty: "Challenging",
    sky: "#dbcbd0",
    grass: "#86a567",
    edge: "#a57b62",
    water: "#72a7ae",
    accent: "#d98567",
    color: "#c5a887",
  },
];
export const GOLF_HOLE_COUNT = 3;
export const RULES_VERSION = "polygolf-v7";
export function courseRecordKey(mode, index) {
  return mode === "golf" ? `golf:${RULES_VERSION}:${index}` : `mini:${index}`;
}
// Each loop has a short hole, a strategic par four and a long finishing hole.
const layouts = [
  [
    {
      name: "The Boathouse",
      par: 4,
      points: [
        [0, 0],
        [-10, -76],
        [-24, -158],
        [-10, -251],
        [8, -338],
      ],
      width: 37,
      green: [8, -336, 13, 17],
      water: [[-61, -182, 25, 53]],
      bunkers: [
        [33, -312, 9, 13],
        [-20, -354, 8, 7],
      ],
      landmark: "boathouse",
    },
    {
      name: "Heron Pond",
      par: 3,
      points: [
        [0, 0],
        [8, -38],
        [13, -77],
        [8, -115],
        [0, -158],
      ],
      width: 33,
      green: [0, -156, 14, 18],
      water: [
        [-40, -102, 22, 34],
        [39, -119, 17, 28],
      ],
      bunkers: [
        [24, -155, 7, 10],
        [-22, -174, 7, 6],
      ],
      landmark: "garden",
    },
    {
      name: "The Orchard",
      par: 5,
      points: [
        [0, 0],
        [22, -108],
        [49, -224],
        [32, -355],
        [-4, -488],
      ],
      width: 40,
      green: [-4, -486, 15, 18],
      water: [[-32, -313, 24, 46]],
      bunkers: [
        [77, -228, 8, 16],
        [22, -467, 9, 14],
        [-31, -499, 9, 7],
      ],
      landmark: "orchard",
    },
  ],
  [
    {
      name: "Lighthouse Point",
      par: 4,
      points: [
        [0, 0],
        [14, -84],
        [30, -172],
        [17, -268],
        [-3, -362],
      ],
      width: 38,
      green: [-3, -360, 14, 17],
      water: [[-66, -249, 27, 49]],
      bunkers: [
        [-9, -191, 8, 15],
        [22, -342, 8, 12],
        [-29, -377, 9, 7],
      ],
      landmark: "lighthouse",
    },
    {
      name: "The Tidal Pool",
      par: 3,
      points: [
        [0, 0],
        [-8, -36],
        [-13, -72],
        [-7, -110],
        [4, -149],
      ],
      width: 31,
      green: [4, -147, 14, 17],
      water: [[-40, -99, 23, 27]],
      bunkers: [
        [29, -130, 8, 9],
        [-21, -159, 7, 9],
      ],
      landmark: "tide",
    },
    {
      name: "Dune Walk",
      par: 5,
      points: [
        [0, 0],
        [-21, -112],
        [-47, -232],
        [-29, -365],
        [10, -510],
      ],
      width: 40,
      green: [10, -508, 15, 19],
      water: [[44, -314, 27, 45]],
      bunkers: [
        [-76, -241, 9, 20],
        [-8, -481, 8, 12],
        [37, -522, 10, 8],
      ],
      landmark: "dunes",
    },
  ],
  [
    {
      name: "Amber Corridor",
      par: 4,
      points: [
        [0, 0],
        [-16, -78],
        [-35, -163],
        [-24, -255],
        [3, -346],
      ],
      width: 35,
      green: [3, -344, 14, 17],
      water: [[47, -237, 23, 36]],
      bunkers: [
        [-62, -176, 8, 16],
        [-22, -334, 8, 12],
        [29, -361, 8, 7],
      ],
      landmark: "arch",
    },
    {
      name: "Larch Hollow",
      par: 3,
      points: [
        [0, 0],
        [7, -40],
        [17, -83],
        [11, -127],
        [0, -174],
      ],
      width: 32,
      green: [0, -172, 14, 18],
      water: [[-42, -120, 24, 32]],
      bunkers: [
        [26, -161, 8, 11],
        [-24, -188, 8, 7],
      ],
      landmark: "spring",
    },
    {
      name: "Golden Canopy",
      par: 5,
      points: [
        [0, 0],
        [24, -116],
        [51, -244],
        [29, -371],
        [-6, -501],
      ],
      width: 39,
      green: [-6, -499, 15, 18],
      water: [[-39, -309, 23, 47]],
      bunkers: [
        [79, -239, 9, 18],
        [20, -485, 8, 13],
        [-33, -514, 10, 8],
      ],
      landmark: "mesa",
    },
  ],
];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function getGolfHole(courseIndex = 0, index = 0) {
  const course = GOLF_COURSES[courseIndex],
    layout = layouts[courseIndex]?.[index];
  if (!course || !Number.isInteger(index) || !layout) throw Error("Unknown golf hole");
  return buildGolfLayout(courseIndex, index, layout);
}
export function buildGolfLayout(courseIndex, index, layout) {
  const course = GOLF_COURSES[courseIndex];
  const points = layout.points.map((p) => [...p]),
    length = -points.at(-1)[1],
    cup = { x: points.at(-1)[0], z: -length },
    start = { x: 0, z: 0 };
  const oval = ([x, z, rx, rz]) => ({ x, z, rx, rz }),
    bunkers = layout.bunkers.map(oval),
    water = layout.water.map(oval);
  const h = {
    mode: "golf",
    course,
    courseIndex,
    index,
    name: layout.name,
    par: layout.par,
    length,
    points,
    start,
    cup,
    width: layout.width,
    contour: layout.contour ?? 1,
    bunkers,
    water,
    green: oval(layout.green),
    landmark: layout.landmark,
    wind: { x: courseIndex === 0 ? 0.9 : 2.4 + courseIndex * 0.6, z: (index - 1) * 1.2 },
    seed: index + courseIndex * 19,
    ob: [],
    moving: [],
    samples: points.map(([x, z], i) => ({ x, z, t: i / 4 })),
  };
  h.route = samplePath(points, 64).map((p) => [p.x, p.z]);
  h.trees = [];
  populateForest(h, layout.density ?? 1);
  h.start.y = terrainHeight(h, 0, 0);
  h.cup.y = terrainHeight(h, cup.x, cup.z);
  return h;
}
export function pathDistance(h, x, z) {
  const points = h.route || h.points;
  let best = Infinity;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i],
      dx = b[0] - a[0],
      dz = b[1] - a[1],
      t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz), 0, 1);
    best = Math.min(best, Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t));
  }
  return best;
}
export function fairwayWidth(h, t) {
  return h.width * (0.76 + 0.24 * Math.sin(t * Math.PI) + 0.12 * Math.sin(t * 8 + h.seed));
}
export function coastBounds(h, z) {
  const ps = h.points;
  let x = ps.at(-1)[0];
  if (z >= ps[0][1]) x = ps[0][0];
  else
    for (let i = 1; i < ps.length; i++)
      if (z >= ps[i][1]) {
        const t = (z - ps[i - 1][1]) / (ps[i][1] - ps[i - 1][1]);
        x = ps[i - 1][0] + (ps[i][0] - ps[i - 1][0]) * t;
        break;
      }
  let right = x + fairwayWidth(h, clamp(-z / h.length, 0, 1)) / 2 + 14;
  for (const p of [...h.water, ...h.bunkers, h.green]) {
    const d = Math.abs(z - p.z);
    if (d < p.rz + 26) {
      const t = clamp((p.rz + 26 - d) / 26, 0, 1);
      right += Math.max(0, p.x + p.rx + 12 - right) * t * t * (3 - 2 * t);
    }
  }
  return [-150 + Math.sin(z * 0.027) * 7, right];
}
const ellipse = (p, x, z) => ((x - p.x) / p.rx) ** 2 + ((z - p.z) / p.rz) ** 2;
function baseHeight(h, x, z) {
  return (
    (Math.sin(x * 0.014 + h.seed * 0.3) * 1.8 + Math.sin(z * 0.018) * 2.1 + Math.sin((x + z) * 0.008) * 2.5) *
    (h.contour ?? 1)
  );
}
export function terrainHeight(h, x, z) {
  const g = h.green,
    d = Math.sqrt(ellipse(g, x, z)),
    u = clamp((1.6 - d) / 0.6, 0, 1),
    blend = u * u * (3 - 2 * u);
  // A gentle planar green blends smoothly into the surrounding rolling terrain.
  const green = baseHeight(h, g.x, g.z) + (x - g.x) * 0.004 + (z - g.z) * 0.006;
  let y = baseHeight(h, x, z) * (1 - blend) + green * blend;
  const teeDistance = Math.max(Math.abs(x) / 4, Math.abs(z) / 6),
    teeBlend = clamp((1.7 - teeDistance) / 0.7, 0, 1);
  y = y * (1 - teeBlend) + baseHeight(h, 0, 0) * teeBlend;
  for (const b of h.bunkers) {
    const d = ellipse(b, x, z);
    if (d < 1) {
      const u = clamp((1 - Math.sqrt(d)) / 0.65, 0, 1);
      y -= 1.45 * u * u * (3 - 2 * u);
    }
  }
  for (const p of h.water) {
    const d = Math.sqrt(ellipse(p, x, z)),
      u = clamp((1.2 - d) / 0.2, 0, 1),
      blend = u * u * (3 - 2 * u);
    y = y * (1 - blend) + (waterLevel(h, p) - 0.65) * blend;
  }
  return y;
}
export function terrainAt(h, x, z) {
  if (h.courseIndex === 1) {
    const [left, right] = coastBounds(h, z);
    if (x < left || x > right || z > 100 || z < -h.length - 120)
      return { height: -43, normal: { x: 0, y: 1, z: 0 }, surface: "rough", hazard: "water" };
  }
  let surface = "rough";
  if (z < -30 && pathDistance(h, x, z) < fairwayWidth(h, -z / h.length) / 2) surface = "fairway";
  if (Math.abs(x) < 4 && Math.abs(z) < 6) surface = "tee";
  if (ellipse(h.green, x, z) < 1) surface = "green";
  if (h.bunkers.some((p) => ellipse(p, x, z) < 1)) surface = "sand";
  const hazard = h.water.some((p) => ellipse(p, x, z) < 1)
    ? "water"
    : Math.abs(x) > 150 || z > 65 || z < -h.length - 80
      ? "bounds"
      : null;
  const pond = h.water.find((p) => ellipse(p, x, z) < 1),
    height = pond ? waterLevel(h, pond) : terrainHeight(h, x, z),
    dx = (terrainHeight(h, x + 0.1, z) - terrainHeight(h, x - 0.1, z)) / 0.2,
    dz = (terrainHeight(h, x, z + 0.1) - terrainHeight(h, x, z - 0.1)) / 0.2,
    n = Math.hypot(dx, 1, dz);
  return { height, normal: { x: -dx / n, y: 1 / n, z: -dz / n }, surface, hazard };
}

export function waterLevel(h, p) {
  return baseHeight(h, p.x, p.z) - 0.35;
}
