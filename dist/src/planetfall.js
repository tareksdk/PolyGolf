// Metres, deliberately compressed and progressively harder; this is a golf route,
// not an astronomical scale model. The renderer and collisions share these data.
export const PLANETFALL_INDEX = 19;
export const PLANETFALL_CLUBS = ['9i', '8i', '7i', '6i', '5i', '4i'];
export const PLANETFALL_COURSE = {
  id: 'planetfall', name: 'Planetfall', subtitle: 'Neptune to the Sun. Eight planets. One unforgiving hole.',
  tag: 'THE INTERPLANETARY CHALLENGE', theme: 'space', eventTheme: 'space',
  holeCount: 1, level: 1, difficulty: 'Expert · Precision irons',
  sky: '#030b1d', grass: '#498cdf', edge: '#133877', water: '#070f25',
  accent: '#f7c66e', color: '#548ce0', zenith: '#03091c', horizon: '#07152c',
};
const definitions = [
  ['Neptune', '#3063cc', '#9cc9fb', 25, 11.5, 0],
  ['Uranus', '#62c8d4', '#b3ece3', 23, 10.5, -13],
  ['Saturn', '#d5ac70', '#f4d69e', 31, 10, 18],
  ['Jupiter', '#c98b68', '#edc39b', 35, 9.8, -16],
  ['Mars', '#b85035', '#e39464', 21, 9, 14],
  ['Earth', '#2678ad', '#90c65c', 24, 8.5, -12],
  ['Venus', '#d2a25f', '#efd18b', 23, 8, 14],
  ['Mercury', '#828b9a', '#c1c7c9', 18, 7.5, -10],
  ['Sun', '#ffad35', '#ffe48b', 32, 8, 0],
];
export const PLANETFALL_GAPS = [66, 80, 96, 112, 128, 144, 160, 178];
let depth = 0;
export const PLANETS = definitions.map(([name, color, padColor, radius, pad, x], index) => {
  if (index) depth -= Math.sqrt(PLANETFALL_GAPS[index - 1] ** 2 - (x - definitions[index - 1][5]) ** 2);
  return Object.freeze({name, color, padColor, radius, pad, x, z: depth, index, y: 0});
});
export const planetAt = (x, z) => PLANETS.find(p => Math.hypot(x - p.x, z - p.z) <= p.pad);
export const nextPlanet = (reached = 0) => PLANETS[Math.min(8, reached + 1)];
export function planetfallHole(course = PLANETFALL_COURSE) {
  const sun = PLANETS[8];
  return {
    mode: 'golf', space: true, course, courseIndex: PLANETFALL_INDEX, index: 0,
    name: 'The long way to daylight', par: 0, strokeLimit: Infinity,
    length: -sun.z, start: {x: 0, y: 0, z: 0}, cup: {x: sun.x, y: 0, z: sun.z - 2.5},
    points: PLANETS.map(p => [p.x, p.z]), route: PLANETS.map(p => [p.x, p.z]),
    green: {x: sun.x, z: sun.z, rx: sun.pad, rz: sun.pad},
    width: 20, seed: 1801, wind: {x: 0, z: 0}, water: [], bunkers: [], trees: [], treeGrid: {},
    scenery: [], samples: [], ob: [], moving: [], planets: PLANETS,
  };
}
export function planetTerrain(x, z) {
  const p = planetAt(x, z);
  return {height: p ? 0 : -45, normal: {x: 0, y: 1, z: 0}, surface: p?.index === 8 ? 'green' : 'rough', hazard: p ? null : 'void'};
}

// A rotating, inclined belt BETWEEN Jupiter and Mars. Every displayed rock uses
// this exact transform in physics; the belt is a real obstacle, not a backdrop.
export const ASTEROIDS = Array.from({length: 64}, (_, i) => ({
  phase: i / 64 * Math.PI * 2, radius: 1.25 + (i * .618 % 1) * 2.5,
  speed: .13 + (i % 3) * .012, lane: (i % 3 - 1) * 3.7,
}));
export function asteroidPosition(index, clock) {
  const rock = ASTEROIDS[index], a = rock.phase + clock * rock.speed,
    j = PLANETS[3], m = PLANETS[4],
    x = (j.x + m.x) / 2 + Math.cos(a) * (40 + rock.lane),
    y = 10 + Math.sin(a) * (26 + rock.lane * .4),
    z = (j.z + m.z) / 2 + Math.sin(a) * (14 + rock.lane * .25);
  return {x, y, z, radius: rock.radius};
}
export function hitsAsteroid(old, ball, clock) {
  const midpoint = (PLANETS[3].z + PLANETS[4].z) / 2;
  if (Math.abs(ball.z - midpoint) > 23) return false;
  for (let i = 0; i < ASTEROIDS.length; i++) {
    const p = asteroidPosition(i, clock), previous = asteroidPosition(i, clock - 1 / 120),
      ax = old.x - previous.x, ay = old.y - previous.y, az = old.z - previous.z,
      dx = ball.x - p.x - ax, dy = ball.y - p.y - ay, dz = ball.z - p.z - az,
      t = Math.max(0, Math.min(1, -(ax * dx + ay * dy + az * dz) / (dx * dx + dy * dy + dz * dz || 1)));
    if (Math.hypot(ax + dx * t, ay + dy * t, az + dz * t) < p.radius + .1) return true;
  }
  return false;
}
export function settlePlanet(physics) {
  const p = planetAt(physics.ball.x, physics.ball.z);
  if (!p || p.index > physics.reached + 1 || p.index < physics.reached) {
    physics.missReason = p && p.index > physics.reached + 1 ? 'Skipped a planet' : 'Missed the next landing';
    physics.events.push('space-miss', 'water');
    return false;
  }
  if (p.index === physics.reached + 1) {
    physics.reached = p.index;
    physics.events.push('planet');
  }
  physics.lastSafe = {x: physics.ball.x, z: physics.ball.z};
  return true;
}

export const PLANETFALL_BOARD_KEY = 'polygolf.planetfall.records.v1';
export function readPlanetfallBoard(storage = globalThis.localStorage) {
  try {
    const rows = JSON.parse(storage.getItem(PLANETFALL_BOARD_KEY) || '[]');
    return Array.isArray(rows) ? rows.filter(r => typeof r.name === 'string' && Number.isInteger(r.reached) && r.reached >= 0 && r.reached <= 8 && Number.isFinite(r.shots) && Number.isFinite(r.time)) : [];
  } catch { return []; }
}
export function recordPlanetfall(run, storage = globalThis.localStorage) {
  const rows = readPlanetfallBoard(storage), clean = {
    id: run.id, name: String(run.name || 'Sunday Golfer').slice(0, 30), reached: run.reached,
    finished: !!run.finished, shots: run.shots, time: run.time, date: run.date || Date.now(),
  };
  const previous = rows.findIndex(r => r.id === clean.id);
  if (previous >= 0) rows.splice(previous, 1);
  rows.push(clean);
  rows.sort((a, b) => b.reached - a.reached || Number(b.finished) - Number(a.finished) || a.shots - b.shots || a.time - b.time);
  storage.setItem(PLANETFALL_BOARD_KEY, JSON.stringify(rows.slice(0, 50)));
  return rows;
}
