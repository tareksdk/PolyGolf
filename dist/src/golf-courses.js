import { populateForest } from "./forest.js";
import { samplePath } from "./courses.js";
import { EVENT_COURSES, eventLayout, courseRotationKey } from './rotating-courses.js';
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
GOLF_COURSES.push(...EVENT_COURSES);
GOLF_COURSES.push({...GOLF_COURSES[0], id:"willow-long", name:"Willow Park · Long Course", subtitle:"Nine holes across the full parkland collection.", tag:"THE LONG ROUND", layoutCourse:0, holeCount:9});
export const RULES_VERSION = "polygolf-v11";
export function golfHoleCount(index=0) {
  if(!GOLF_COURSES[index])throw Error("Unknown golf course");
  return index<3?3:GOLF_COURSES[index].holeCount;
}
export function courseRecordKey(mode,index,rotationKey=courseRotationKey(index)) {
  return mode==="golf" ? index<3?`golf:${"polygolf-v7"}:${index}`:`golf:${RULES_VERSION}:${index}:${rotationKey}` : `mini:${index}`;
}
// Willow keeps its original opening loop, then explores two more parkland loops.
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
    {
      name: "Willow Bend",
      par: 4,
      // An inside bunker chain tempts a corner cut; the wide left shelf is safer.
      points: [[0, 0], [-18, -80], [-77, -180], [-83, -274], [-42, -369]],
      width: 43,
      fairwayBands: [[0.43, 0.16, 0.78]],
      green: [-42, -367, 14, 18],
      water: [],
      bunkers: [[-37, -170, 10, 24, -0.55, 0.16], [-43, -211, 9, 16, -0.4, 0.14],
        [-99, -252, 7, 18, 0.2, 0.12], [-16, -349, 10, 16, 0.5, 0.18], [-65, -382, 10, 7, -0.2, 0.12]],
      elevation: [[0, 0], [0.28, 4], [0.52, 8], [0.75, 3], [1, 6]],
      mounds: [[22, -150, 57, 95, 12], [-123, -274, 45, 75, 9]],
      contour: 0.5,
      density: 0.83,
      treeStyle: "meadow",
      glades: [[20, -172, 64, 108], [-126, -273, 39, 78]],
      backdrop: "meadow",
      atmosphere: { zenith: "#7da8b9", horizon: "#d9dfc2", sun: "#fff0cf" },
      wind: { x: 1.3, z: -0.6 },
      landmark: "willow-bend",
      scenery: [
        { name: "gazebo", x: 11, z: -225, radius: 3.2, angle: -1.2 },
        ...[[21,-116,5], [37,-143,7], [28,-179,5.5], [-122,-255,6], [-131,-283,4]].map(([x,z,scale]) =>
          ({ name: "boulder", x, z, scale, radius: scale * 0.85, angle: x * 0.1 })),
        ...[0,1,2,3,4].map(i => ({ name: "fence", x: 51, z: -116-i*3, radius: 1.1, angle: Math.PI/2 })),
      ],
    },
    {
      name: "Lily Reach",
      par: 3,
      // Elevated tee, sunken garden and a raised green across the lily pond.
      points: [[0, 0], [6, -35], [9, -72], [-9, -110], [-22, -151]],
      width: 35,
      green: [-22, -149, 14, 17],
      water: [[4, -88, 34, 23]],
      bunkers: [[-47, -139, 8, 17, -0.35, 0.17], [1, -163, 9, 10, 0.65, 0.16], [-20, -179, 16, 5, 0, 0.13]],
      elevation: [[0, 7], [0.27, 0], [0.4, -2], [0.72, -2], [1, 3]],
      mounds: [[-71, -94, 35, 55, 6], [65, -108, 45, 60, 5]],
      contour: 0.3,
      density: 0.63,
      treeStyle: "wetland",
      glades: [[63, -94, 46, 62], [-74, -86, 35, 52]],
      backdrop: "garden",
      atmosphere: { zenith: "#85b6ca", horizon: "#e2e9d4", sun: "#fff7dc" },
      wind: { x: -0.8, z: 0.4 },
      landmark: "lily-reach",
      scenery: [
        { name: "gazebo", x: 57, z: -111, radius: 3.2, angle: -1.4 },
        { name: "spring-well", x: -68, z: -80, radius: 1.8, angle: 0.8 },
        ...[0,1,2,3,4,5,6].map(i => ({ name: "stone-wall", x: 49+i*3.8, z: -136, radius: 1.7 })),
        ...[0,1,2,3,4].map(i => ({ name: "flowers", x: 51+i*4, z: -128, radius: 1.4, scale: 2 })),
        { name: "bench", x: 68, z: -98, radius: 1.2, angle: -1.4 },
      ],
    },
    {
      name: "Foxglove Rise",
      par: 5,
      // A climb through three shelves; staggered cross-bunkers shape the lay-ups.
      points: [[0, 0], [9, -110], [43, -232], [18, -370], [47, -514]],
      width: 44,
      green: [47, -512, 15, 19],
      water: [],
      bunkers: [[-7, -179, 10, 24, -0.45, 0.18], [48, -214, 11, 18, 0.3, 0.15],
        [30, -323, 20, 8, -0.45, 0.17], [-2, -398, 8, 20, -0.3, 0.14],
        [22, -492, 10, 15, -0.3, 0.16], [73, -505, 10, 19, 0.2, 0.16], [43, -539, 18, 6, 0.15, 0.14]],
      elevation: [[0, 0], [0.23, 4], [0.48, 10], [0.73, 8], [1, 17]],
      mounds: [[-75, -252, 63, 120, 18], [111, -376, 49, 100, 15]],
      contour: 0.55,
      density: 0.78,
      treeStyle: "pine-slope",
      glades: [[-80, -261, 53, 103], [102, -373, 50, 100]],
      backdrop: "alpine-pass",
      atmosphere: { zenith: "#668fae", horizon: "#b7d1d5", sun: "#fff4e0" },
      wind: { x: 1.5, z: 0.5 },
      landmark: "foxglove-rise",
      scenery: [
        { name: "alpine-lodge", x: -78, z: -269, radius: 10, scale: 1, angle: 1.2 },
        { name: "golf-cart", x: -58, z: -253, radius: 1.8, angle: 0.3 },
        ...[[-94,-207,7], [-108,-235,9], [106,-340,8], [121,-372,6], [98,-403,5]].map(([x,z,scale]) =>
          ({ name: "boulder", x, z, scale, radius: scale * 0.85, angle: z * 0.1 })),
        ...[0,1,2,3].map(i => ({ name: "stone-wall", x: -95+i*4, z: -292, radius: 1.7, angle: 0.1 })),
      ],
    },
    {
      name: "Twin Ponds",
      par: 4,
      // Two shores squeeze the landing area; the higher left bank stays dry.
      points: [[0, 0], [-27, -83], [-63, -169], [-18, -257], [28, -346]],
      width: 40,
      fairwayBands: [[0.57, 0.15, 0.67]],
      green: [28, -344, 14, 17],
      water: [[-105, -204, 24, 48], [8, -198, 31, 52]],
      bunkers: [[-31, -139, 10, 20, 0.6, 0.17], [-45, -276, 8, 21, -0.45, 0.18],
        [7, -324, 7, 16, -0.5, 0.16], [54, -354, 9, 13, 0.4, 0.15]],
      elevation: [[0, 2], [0.36, -3], [0.63, -5], [1, 1]],
      mounds: [[-99, -100, 54, 70, 8], [89, -290, 47, 90, 7]],
      contour: 0.4,
      density: 0.67,
      treeStyle: "wetland",
      glades: [[66, -182, 43, 91], [-143, -203, 27, 80]],
      backdrop: "wetland",
      atmosphere: { zenith: "#8aaab3", horizon: "#d4e2d9", sun: "#f7f1db" },
      wind: { x: -1.1, z: -0.5 },
      landmark: "twin-ponds",
      scenery: [
        { name: "gazebo", x: 65, z: -177, radius: 3.2, angle: -1.6 },
        { name: "fallen-log", x: -137, z: -234, radius: 2, scale: 1.4, angle: 0.4 },
        ...[0,1,2,3,4,5].map(i => ({ name: "stone-wall", x: 68, z: -201-i*4, radius: 1.7, angle: Math.PI/2 })),
        ...[[64,-152], [77,-185], [-140,-172]].map(([x,z]) => ({ name: "heron", x, z, radius: 0.7 })),
      ],
    },
    {
      name: "The Lookout",
      par: 3,
      // A high tee looks across a dry hollow to a green on its own shoulder.
      points: [[0, 0], [6, -44], [19, -89], [34, -137], [43, -190]],
      width: 37,
      green: [43, -188, 14, 18],
      water: [],
      bunkers: [[26, -159, 18, 8, -0.4, 0.18], [67, -179, 9, 17, -0.25, 0.17],
        [19, -195, 8, 11, 0.2, 0.15], [46, -216, 18, 6, 0.2, 0.14]],
      elevation: [[0, 17], [0.21, 10], [0.49, -3], [0.72, -1], [1, 6]],
      mounds: [[-49, -38, 42, 60, 11], [103, -150, 43, 65, 13]],
      contour: 0.35,
      density: 0.48,
      treeStyle: "pine-slope",
      glades: [[-49, -77, 57, 95], [116, -130, 52, 106]],
      backdrop: "lookout",
      atmosphere: { zenith: "#778eae", horizon: "#efd9bc", sun: "#ffdab0", intensity: 2.1 },
      wind: { x: 1.7, z: -0.8 },
      landmark: "lookout",
      scenery: [
        { name: "stone-arch", x: -31, z: -61, radius: 5, scale: 1.2, angle: 0.45 },
        { name: "bench", x: -27, z: -25, radius: 1.2, angle: 1.3 },
        ...[[-63,-53,7], [-72,-83,5], [107,-112,9], [122,-146,6], [100,-183,5]].map(([x,z,scale]) =>
          ({ name: "boulder", x, z, scale, radius: scale * 0.85, angle: x * 0.1 })),
      ],
    },
    {
      name: "Lakeside Home",
      par: 5,
      // A generous opening, then a lake-side corner cut and an uphill final pitch.
      points: [[0, 0], [24, -118], [58, -246], [22, -378], [-18, -526]],
      width: 46,
      fairwayBands: [[0.6, 0.17, 0.75]],
      green: [-18, -524, 16, 19],
      water: [[79, -352, 34, 69], [27, -472, 23, 37]],
      bunkers: [[-2, -205, 11, 24, -0.3, 0.17], [75, -238, 10, 24, 0.2, 0.18],
        [-5, -368, 10, 18, -0.4, 0.16], [-45, -501, 10, 17, -0.4, 0.17],
        [7, -535, 9, 16, -0.3, 0.16], [-24, -555, 18, 6, 0.1, 0.14]],
      elevation: [[0, 3], [0.24, 0], [0.48, 3], [0.74, -1], [1, 7]],
      mounds: [[-96, -226, 57, 109, 11], [-99, -431, 47, 87, 7]],
      contour: 0.35,
      density: 0.64,
      treeStyle: "lakeside",
      glades: [[137, -270, 53, 270], [133, -480, 58, 125], [-86, -418, 33, 71]],
      backdrop: "lake",
      atmosphere: { zenith: "#839cb6", horizon: "#e5d7b7", sun: "#ffe3b7", intensity: 2.2 },
      wind: { x: 1, z: 0.7 },
      landmark: "lakeside-home",
      scenery: [
        { name: "boathouse", x: 128, z: -377, radius: 9, angle: 1.6 },
        { name: "alpine-lodge", x: -87, z: -424, radius: 10, scale: 0.85, angle: 1.2 },
        ...[0,1,2,3,4,5,6,7].map(i => ({ name: "fence", x: 143, z: -399-i*3, radius: 1.1, angle: Math.PI/2 })),
        { name: "bench", x: 131, z: -437, radius: 1.2, angle: 1.4 },
        ...[[-111,-193,6], [-125,-230,7], [-104,-268,5]].map(([x,z,scale]) =>
          ({ name: "boulder", x, z, scale, radius: scale * 0.85, angle: z * 0.1 })),
      ],
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
function golfLayout(courseIndex,index) {
  const course=GOLF_COURSES[courseIndex];
  if(!course||!Number.isInteger(index)||index<0||index>=golfHoleCount(courseIndex))throw Error("Unknown golf hole");
  return course.eventTheme?eventLayout(course,index):layouts[course.layoutCourse??courseIndex][index];
}
// Card summaries must not build terrain or thousands of collision trees.
export function golfPar(courseIndex,index) { return golfLayout(courseIndex,index).par; }
export function getGolfHole(courseIndex = 0, index = 0, scenery = true) {
  const course = GOLF_COURSES[courseIndex],
    layout = golfLayout(courseIndex,index);
  if (!course || !Number.isInteger(index) || !layout) throw Error("Unknown golf hole");
  const h=buildGolfLayout(course.layoutCourse??courseIndex,index,layout,scenery);
  h.course=course;h.courseIndex=courseIndex;return h;
}
export function buildGolfLayout(courseIndex, index, layout, scenery = true) {
  const course = GOLF_COURSES[courseIndex];
  const points = layout.points.map((p) => [...p]),
    length = -points.at(-1)[1],
    cup = { x: points.at(-1)[0], z: -length },
    start = { x: 0, z: 0 };
  const oval = ([x, z, rx, rz, angle, scallop]) => ({ x, z, rx, rz, ...(angle !== undefined ? { angle, scallop: scallop ?? 0 } : {}) }),
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
    scenery: (layout.scenery || []).map((p) => ({ ...p })),
    wind: layout.wind ? { ...layout.wind } : { x: course.eventTheme ? 1.4 + (index%2)*.7 : courseIndex === 0 ? 0.9 : 2.4 + courseIndex * 0.6, z: (index - 1) * 1.2 },
    seed: index + courseIndex * 19,
    ob: [],
    moving: [],
    samples: points.map(([x, z], i) => ({ x, z, t: i / 4 })),
  };
  for (const key of ["elevation", "mounds", "fairwayBands", "treeStyle", "glades", "backdrop", "atmosphere"])
    if (layout[key] !== undefined) h[key] = structuredClone(layout[key]);
  h.route = samplePath(points, 64).map((p) => [p.x, p.z]);
  h.trees = [];
  if(scenery)populateForest(h, layout.density ?? 1);
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
  let width = h.width * (0.76 + 0.24 * Math.sin(t * Math.PI) + 0.12 * Math.sin(t * 8 + h.seed));
  for (const [center, radius, scale] of h.fairwayBands || []) {
    const d = Math.abs(t - center) / radius;
    if (d < 1) width *= 1 - (1 - scale) * (1 - d * d) ** 2;
  }
  return width;
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
// Saltwind's opening cove is a lower, sloping headland. Keep the other two
// holes' silhouettes intact; every ocean prop and collision reads this level.
export const coastWaterLevel = h => h.index === 0 ? -18.6 : -42.6;
export function coastBandPoint(h, point, band) {
  const [x,y,z] = point;
  if (!band) return point;
  if(h.index!==0){
    const spread=[0,2.8,5.4,8.2][band]+Math.sin(z*.085+band)*.7,
      end=z>=99?1:z<=-h.length-119?-1:0;
    return [x+(x<0?-1:1)*spread,[-0,-12,-27,-49][band]+(band===3?0:Math.sin(z*.047+band)*1.1),z+end*spread];
  }
  const spread = [0,5.5,12,22][band],
    [left,right] = coastBounds(h,z), side = x < (left+right)/2 ? -1 : 1,
    end = z >= 99 ? 1 : z <= -h.length-119 ? -1 : 0,
    level = [y, y*.45-5.5, coastWaterLevel(h)+2.5, coastWaterLevel(h)-4][band];
  return [x+side*spread,level,z+end*spread];
}
function coastSurface(h,x,z) {
  const edgeZ = clamp(z,-h.length-120,100), [left,right] = coastBounds(h,edgeZ),
    edgeX = clamp(x,left,right), dx=x-edgeX,dz=z-edgeZ;
  if (!dx && !dz) return null;
  if(h.index!==0)return {height:-43,normal:{x:0,y:1,z:0},surface:'rough',hazard:'water'};
  const distance = Math.max(Math.abs(dx),Math.abs(dz)),
    top = terrainHeight(h,edgeX,edgeZ),distances=[0,5.5,12,22],
    heights=[top,top*.45-5.5,coastWaterLevel(h)+2.5,coastWaterLevel(h)-4];
  for(let i=1;i<distances.length;i++)if(distance<distances[i]){
    const slope=(heights[i]-heights[i-1])/(distances[i]-distances[i-1]),
      height=heights[i-1]+(distance-distances[i-1])*slope,
      nx=Math.abs(dx)>=Math.abs(dz)?-Math.sign(dx)*slope:0,
      nz=Math.abs(dz)>Math.abs(dx)?-Math.sign(dz)*slope:0,n=Math.hypot(nx,1,nz);
    if(height>coastWaterLevel(h))return {height,normal:{x:nx/n,y:1/n,z:nz/n},surface:'rough',hazard:null};
    break;
  }
  return {height:coastWaterLevel(h),normal:{x:0,y:1,z:0},surface:'rough',hazard:'water'};
}
export function ellipse(p, x, z) {
  if (!p.angle && !p.scallop) return ((x - p.x) / p.rx) ** 2 + ((z - p.z) / p.rz) ** 2;
  const c = Math.cos(p.angle || 0), s = Math.sin(p.angle || 0),
    u = ((x - p.x) * c + (z - p.z) * s) / p.rx,
    v = ((z - p.z) * c - (x - p.x) * s) / p.rz,
    a = Math.atan2(v, u),
    edge = 1 + (p.scallop || 0) * (0.65 * Math.sin(3 * a) + 0.35 * Math.cos(5 * a));
  return (u * u + v * v) / (edge * edge);
}
export function ovalBoundary(p, a, scale = 1) {
  const edge = scale * (1 + (p.scallop || 0) * (0.65 * Math.sin(3 * a) + 0.35 * Math.cos(5 * a))),
    x = Math.cos(a) * p.rx * edge, z = Math.sin(a) * p.rz * edge,
    c = Math.cos(p.angle || 0), s = Math.sin(p.angle || 0);
  return { x: p.x + x * c - z * s, z: p.z + x * s + z * c };
}
function baseHeight(h, x, z) {
  let height = (
    (Math.sin(x * 0.014 + h.seed * 0.3) * 1.8 + Math.sin(z * 0.018) * 2.1 + Math.sin((x + z) * 0.008) * 2.5) *
    (h.contour ?? 1)
  );
  if (h.elevation) {
    const t = clamp(-z / h.length, 0, 1);
    for (let i = 1; i < h.elevation.length; i++) {
      const [a, ya] = h.elevation[i - 1], [b, yb] = h.elevation[i];
      if (t <= b) { const u = clamp((t - a) / (b - a), 0, 1); height += ya + (yb - ya) * u * u * (3 - 2 * u); break; }
    }
  }
  for (const [cx, cz, rx, rz, rise] of h.mounds || []) {
    const d = ((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2;
    if (d < 1) height += rise * (1 - d) ** 3;
  }
  // Only the final hole opens onto the lake beyond its right-hand playing bounds.
  if (h.backdrop === "lake" && x > 130) {
    const shore = 145 + Math.sin(z * 0.013 + 1.3) * 11 + Math.cos(z * 0.023) * 4,
      u = clamp((x - shore) / 60, 0, 1), blend = u * u * (3 - 2 * u);
    height = height * (1 - blend) - 8 * blend;
  }
  return height;
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
    const coast=coastSurface(h,x,z);
    if(coast)return coast;
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
