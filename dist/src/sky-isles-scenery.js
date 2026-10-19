import * as THREE from '../vendor/three.module.js';
import { terrainHeight, ovalBoundary, ellipse, pathDistance, islandAt } from './golf-courses.js';
import { VOID_HEIGHT } from './sky-isles.js';

// Shattered Crown scenery. Every island surface and rock skirt is built from the same
// outline the physics reads, so the visible rim is exactly where a ball starts to fall.
// Everything here is render-only and deterministic; nothing adds collisions.
let kit, kitInfo;
export async function loadSkyIslesKit() {
  const r = await fetch(new URL('../assets/sky-isles-kit.json', import.meta.url));
  if (!r.ok) throw Error('Sky isles scenery could not load.');
  const data = await r.json();
  kit = {}; kitInfo = {};
  for (const [id, a] of Object.entries(data.assets)) {
    const colors = new Float32Array(a.p.length);
    a.c.forEach((c, i) => { for (let v = 0; v < 3; v++) colors.set(data.palette[c], i * 9 + v * 3); });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(a.p, 3));
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals(); g.computeBoundingSphere(); g.userData.shared = true;
    kit[id] = g; kitInfo[id] = { radius: a.radius, height: a.height };
  }
}
export const skyIslesKitInfo = () => kitInfo;

const hash = (x, z, s = 0) => { const n = Math.sin(x * 127.1 + z * 311.7 + s * 74.7) * 43758.5453; return n - Math.floor(n); };
const quality = w => w.settings?.graphics === 'low' ? 'low' : w.settings?.graphics === 'high' ? 'high' : 'medium';

// ---------------------------------------------------------------- playable island meshes
export function buildIslandTerrain(w, h, material, width, depth, top) {
  const q = quality(w), rings = { low: 16, medium: 24, high: 30 }[q], segs = { low: 44, medium: 68, high: 84 }[q];
  const surfaces = [], skirt = { p: [], c: [] };
  const rimColour = new THREE.Color('#6d9a4f'), soil = new THREE.Color('#8b6b50');
  const rock = ['#a4968c', '#958a91', '#ab9a8b', '#877d8b', '#9b8f96'].map(c => new THREE.Color(c));
  for (const [n, p] of h.islands.entries()) {
    const positions = [], uvs = [], indices = [], rim = [];
    positions.push(p.x, terrainHeight(h, p.x, p.z), p.z); uvs.push(p.x / width + .5, 1 - (top - p.z) / depth);
    for (let k = 1; k <= rings; k++) {
      const r = 1 - (1 - k / rings) ** 1.25;
      for (let j = 0; j < segs; j++) {
        const a = j / segs * Math.PI * 2, b = ovalBoundary(p, a, r), y = terrainHeight(h, b.x, b.z);
        positions.push(b.x, y, b.z); uvs.push(b.x / width + .5, 1 - (top - b.z) / depth);
        if (k === rings) rim.push([b.x, y, b.z, a]);
      }
    }
    for (let j = 0; j < segs; j++) indices.push(0, 1 + (j + 1) % segs, 1 + j);
    for (let k = 1; k < rings; k++) for (let j = 0; j < segs; j++) {
      const a = 1 + (k - 1) * segs + j, b = 1 + (k - 1) * segs + (j + 1) % segs, c = a + segs, d = b + segs;
      indices.push(a, b, c, b, d, c);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices); geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, material);
    mesh.name = 'golf-terrain'; mesh.receiveShadow = true; mesh.userData.ownedMaterial = n === 0;
    w.group.add(mesh); surfaces.push(mesh);
    // Rock skirt: shared rim, a grassy lip, soil, then lilac-grey strata tapering to a spire.
    const size = Math.max(.65, Math.min(1.7, Math.sqrt(p.rx * p.rz) / 38)), seed = n * 13 + h.index * 7;
    const profile = [[1, 0], [1.012, -1.1], [.985, -3.2], [.9, -8], [.76, -15], [.58, -23], [.37, -31], [.17, -38]];
    const levels = profile.map(([s, dy], i) => rim.map(([x, y, z, a]) => {
      const j = i < 2 ? 0 : (hash(a * 9, i, seed) - .5) * .16, jy = i < 2 ? 0 : (hash(i, a * 7, seed) - .5) * 2.4;
      return [p.x + (x - p.x) * (s + j), y + dy * size + jy, p.z + (z - p.z) * (s + j)];
    }));
    const tip = [p.x + (hash(n, 1, seed) - .5) * 4, rim[0][1] - (46 + hash(n, 2, seed) * 10) * size, p.z + (hash(n, 3, seed) - .5) * 4];
    const face = (a, b, c, colour) => { skirt.p.push(...a, ...b, ...c); for (let i = 0; i < 3; i++) skirt.c.push(colour.r, colour.g, colour.b); };
    for (let i = 0; i < levels.length; i++) for (let j = 0; j < segs; j++) {
      const k = (j + 1) % segs, band = i === 0 ? rimColour : i === 1 ? soil : rock[(i + Math.floor(hash(j >> 2, i, seed) * 2.2)) % rock.length];
      const shade = band.clone().multiplyScalar(.94 + hash(j, i, seed + 5) * .1 - i * .018);
      if (i === levels.length - 1) { face(levels[i][j], levels[i][k], tip, shade); continue; }
      const a = levels[i][j], b = levels[i][k], c = levels[i + 1][j], d = levels[i + 1][k];
      face(a, c, b, shade); face(b, c, d, shade);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(skirt.p, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(skirt.c, 3));
  g.computeVertexNormals();
  const rocks = new THREE.Mesh(g, w.mat('#ffffff', { vertexColors: true, roughness: 1, flatShading: true }));
  rocks.name = 'isle-skirt'; rocks.castShadow = true; rocks.receiveShadow = true; w.group.add(rocks);
  w.coastOutline = [];
  // The physics heightfield is exact, and island meshes interpolate it at sub-centimetre error.
  w.surfaceHeight = (x, z) => islandAt(h, x, z) ? terrainHeight(h, x, z) : VOID_HEIGHT;
  return surfaces;
}

// ---------------------------------------------------------------- waterfalls
let streakTexture;
function waterfallTexture() {
  if (streakTexture) return streakTexture;
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const x = c.getContext('2d'); x.fillStyle = '#d8f6ff'; x.fillRect(0, 0, 64, 256);
  for (let i = 0; i < 46; i++) {
    const px = (i * 37) % 64, py = (i * 91) % 256, len = 40 + (i * 53) % 120;
    x.fillStyle = i % 3 ? 'rgba(255,255,255,.75)' : 'rgba(120,200,228,.55)';
    x.fillRect(px, py, 2 + i % 3, len); x.fillRect(px, py - 256, 2 + i % 3, len);
  }
  streakTexture = new THREE.CanvasTexture(c);
  streakTexture.wrapS = streakTexture.wrapT = THREE.RepeatWrapping; streakTexture.colorSpace = THREE.SRGBColorSpace;
  return streakTexture;
}
// One strip from the top edge downward: a short arc outwards, then a long fade into the clouds.
function fallSheet(out, x, y, z, nx, nz, width, length, offset) {
  const rows = 18, tx = -nz, tz = nx;
  const base = out.p.length / 3;
  for (let i = 0; i <= rows; i++) {
    const t = i / rows, drop = t * length, push = offset + Math.min(1, t * 6) ** .6 * width * .55 + t * width * .3;
    const half = width * (.5 + t * .35);
    for (const s of [-1, 1]) {
      out.p.push(x + nx * push + tx * half * s, y - drop, z + nz * push + tz * half * s);
      out.uv.push(s < 0 ? 0 : width / 6, drop / 18);
      out.a.push(1, 1, 1, Math.max(0, 1 - t ** 1.6) * .92);
    }
  }
  for (let i = 0; i < rows; i++) { const a = base + i * 2; out.i.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
}
function stream(out, h, from, to, width) {
  const steps = 8, dx = to[0] - from[0], dz = to[1] - from[1], len = Math.hypot(dx, dz) || 1, tx = -dz / len, tz = dx / len;
  const base = out.p.length / 3;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, x = from[0] + dx * t, z = from[1] + dz * t, wobble = Math.sin(t * 5.3 + from[0]) * .35;
    for (const s of [-1, 1]) {
      const px = x + tx * (width / 2 * s + wobble), pz = z + tz * (width / 2 * s + wobble);
      out.p.push(px, terrainHeight(h, px, pz) + .07, pz); out.uv.push(s < 0 ? 0 : .4, -t * len / 18); out.a.push(1, 1, 1, .95);
    }
  }
  for (let i = 0; i < steps; i++) { const a = base + i * 2; out.i.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
}
function waterMesh(w, out) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(out.p, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(out.uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(out.a, 4));
  g.setIndex(out.i); g.computeVertexNormals();
  const tex = waterfallTexture();
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: tex, vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, emissive: '#5aa9c9', emissiveIntensity: .35 }));
  m.userData.ownedMaterial = true; m.userData.courseDynamic = true; m.renderOrder = 2; m.name = 'isle-waterfalls';
  w.group.add(m);
  w.animations.push({ type: 'tick', tick: clock => { if (!w.settings?.reducedMotion) tex.offset.y = -clock * .9; } });
  return m;
}
export function fallSites(h) {
  return (h.falls || []).map(([index, angle, width]) => {
    const p = h.islands[index], edge = ovalBoundary(p, angle, 1), inner = ovalBoundary(p, angle, .955);
    const n = Math.hypot(edge.x - inner.x, edge.z - inner.z) || 1, nx = (edge.x - inner.x) / n, nz = (edge.z - inner.z) / n;
    const basinR = Math.min(.82, 1 - 9 / Math.min(p.rx, p.rz));
    return { p, angle, width, edge, nx, nz, basin: ovalBoundary(p, angle, basinR) };
  });
}

// ---------------------------------------------------------------- decoration
export function islePlantings(h) {
  const plots = [], falls = fallSites(h), decor = h.decor || [];
  const types = ['blossom-tree', 'isle-cypress', 'lilac-tree', 'isle-cypress', 'gold-tree', 'isle-shrub', 'blossom-tree', 'isle-shrub'];
  for (const [n, p] of h.islands.entries()) {
    const perimeter = Math.PI * (p.rx + p.rz), count = Math.floor(perimeter / 8.5);
    for (const [ring, scale] of [[.82, 1], [.66, .8], [.5, .7]]) for (let i = 0; i < count * ring; i++) {
      const a = (i + hash(n, i, ring) * .6) / (count * ring) * Math.PI * 2, b = ovalBoundary(p, a, ring + (hash(i, n, 2) - .5) * .06);
      if (hash(b.x, b.z, 4) < (ring < .6 ? .55 : .3)) continue;
      if (!p.decor && pathDistance(h, b.x, b.z) < h.width / 2 + 9) continue;
      if (Math.hypot(b.x, b.z) < 20 || Math.sqrt(ellipse(h.green, b.x, b.z)) < 1.7 || h.bunkers.some(o => Math.sqrt(ellipse(o, b.x, b.z)) < 1.4)) continue;
      if (decor.some(([id, x, z, s]) => Math.hypot(b.x - x, b.z - z) < (kitInfo?.[id]?.radius ?? 6) * s + 3)) continue;
      if (falls.some(f => Math.hypot(b.x - f.basin.x, b.z - f.basin.z) < 6 || segmentDistance(b, f.basin, f.edge) < 3.5)) continue;
      const id = types[Math.floor(hash(b.z, b.x, 9) * types.length)];
      plots.push({ id, x: b.x, z: b.z, scale: (.82 + hash(b.x, 1, 3) * .4) * scale, angle: hash(b.z, 2, 5) * 6.3 });
    }
  }
  return plots;
}
function segmentDistance(p, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(p.x - a.x - dx * t, p.z - a.z - dz * t);
}

export function buildSkyIsles(w, h) {
  const q = quality(w), groups = new Map(), centreZ = -h.length / 2;
  const add = (id, x, y, z, scale = 1, angle = 0) => { if (!groups.has(id)) groups.set(id, []); groups.get(id).push({ x, y, z, scale, angle }); };
  const ground = (x, z) => terrainHeight(h, x, z);
  w.sun.position.set(-160, 210, 40);
  // Authored landmarks, then rim planting.
  for (const [id, x, z, scale, angle] of h.decor || []) add(id, x, ground(x, z) - (id.startsWith('ruin') ? .25 : 0), z, scale, angle);
  const plots = islePlantings(h);
  for (const p of q === 'low' ? plots.filter((_, i) => i % 3 !== 2) : plots) add(p.id, p.x, ground(p.x, p.z) - .1, p.z, p.scale, p.angle);
  for (const [n, p] of h.islands.entries()) for (let i = 0; i < 4; i++) {
    const a = hash(n, i, 31) * 6.3, b = ovalBoundary(p, a, .3 + hash(i, n, 32) * .45);
    if ((!p.decor && pathDistance(h, b.x, b.z) < h.width / 2 + 4) || Math.hypot(b.x, b.z) < 14 || Math.sqrt(ellipse(h.green, b.x, b.z)) < 1.5) continue;
    add('rubble', b.x, ground(b.x, b.z), b.z, .5 + hash(a, 1, 1) * .4, a);
  }
  // Waterfalls: spring basin, a short stream across the rough, and a long falling sheet.
  const water = { p: [], uv: [], a: [], i: [] };
  for (const f of fallSites(h)) {
    const by = ground(f.basin.x, f.basin.z);
    add('fall-basin', f.basin.x, by - .15, f.basin.z, Math.max(.8, f.width / 6), Math.atan2(f.nx, f.nz));
    const gap = 2.7 * Math.max(.8, f.width / 6);
    stream(water, h, [f.basin.x + f.nx * gap, f.basin.z + f.nz * gap], [f.edge.x + f.nx * .4, f.edge.z + f.nz * .4], Math.max(1.4, f.width * .32));
    const size = Math.sqrt(f.p.rx * f.p.rz);
    fallSheet(water, f.edge.x, ground(f.edge.x, f.edge.z) + .05, f.edge.z, f.nx, f.nz, f.width, 70 + size * 1.4, .6 + size * .02);
  }
  // Floating backdrop isles circle the course at many heights, some with their own falls.
  const backdrop = q === 'low' ? 12 : 22;
  for (let i = 0; i < backdrop; i++) {
    const a = i / backdrop * Math.PI * 2 + hash(i, 1, 7) * .25, r = 260 + hash(i, 2, 7) * 620 + (i % 3) * 60;
    const x = Math.cos(a) * r * 1.05, z = centreZ + Math.sin(a) * (r + h.length * .45), y = -70 + hash(i, 3, 7) * 170;
    const id = i % 4 === 1 ? 'distant-isle-ruin' : i % 5 === 3 ? 'isle-rock' : 'distant-isle', scale = id === 'isle-rock' ? 3 + hash(i, 4, 7) * 3 : 1.4 + hash(i, 4, 7) * 2.6;
    add(id, x, y, z, scale, hash(i, 5, 7) * 6.3);
    if (i % 3 === 0 && id !== 'isle-rock') {
      const fa = Math.atan2(-z + centreZ, -x), er = 15 * scale;
      fallSheet(water, x + Math.cos(fa) * er, y - .3 * scale, z + Math.sin(fa) * er, Math.cos(fa), Math.sin(fa), 3.2 * scale, 60 * scale, .5);
    }
  }
  // A few small rocks drift close to the playable isles, kept clear of every shot line.
  for (let i = 0; i < (q === 'low' ? 6 : 12); i++) {
    const side = i % 2 ? 1 : -1, z = 40 - (i / 11) * (h.length + 80), x = side * (95 + hash(i, 6, 8) * 70);
    if (h.islands.some(p => Math.sqrt(ellipse(p, x, z)) < 1.6)) continue;
    add('isle-rock', x, -12 + hash(i, 7, 8) * 26, z, 1 + hash(i, 8, 8) * 1.4, i);
  }
  waterMesh(w, water);
  // Sea of clouds far below, lit warm on top so the void reads as sky, never empty white.
  const sea = new THREE.Mesh(new THREE.CircleGeometry(3200, 48), w.mat('#efdde6', { roughness: 1 }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(0, -168, centreZ); sea.receiveShadow = false; sea.castShadow = false; w.group.add(sea);
  const banks = q === 'low' ? 70 : q === 'high' ? 190 : 130;
  for (let i = 0; i < banks; i++) {
    const a = i * 2.39996, r = 60 + Math.sqrt(i / banks) * 1500;
    add(i % 3 ? 'cloud-bank' : 'cloud-puff', Math.cos(a) * r, -160 + hash(i, 1, 9) * 22, centreZ + Math.sin(a) * r * 1.15, 11 + hash(i, 2, 9) * 16, a);
  }
  for (let i = 0; i < (q === 'low' ? 10 : 22); i++) {
    const a = i * 1.7 + .4, r = 120 + hash(i, 3, 9) * 260;
    add('cloud-puff', Math.cos(a) * r, -55 - hash(i, 4, 9) * 50, centreZ + Math.sin(a) * (r + h.length * .4), 5 + hash(i, 5, 9) * 5, a);
  }
  for (let i = 0; i < 9; i++) {
    const a = i * .7 - 2.6, r = 900 + hash(i, 6, 9) * 500;
    add('cloud-bank', Math.cos(a) * r, 140 + hash(i, 7, 9) * 160, centreZ + Math.sin(a) * r, 14 + hash(i, 8, 9) * 10, a);
  }
  // Instanced kit pieces; crystals glow softly.
  const material = w.mat('#ffffff', { vertexColors: true, roughness: .9, flatShading: true });
  const glow = w.mat('#ffffff', { vertexColors: true, roughness: .4, emissive: '#6fd2ff', emissiveIntensity: .55, flatShading: true });
  const cloud = w.mat('#ffffff', { vertexColors: true, roughness: 1, emissive: '#fff1f2', emissiveIntensity: .32, flatShading: true });
  const dummy = new THREE.Object3D();
  for (const [id, items] of groups) {
    if (!kit?.[id]) continue;
    const batch = new THREE.InstancedMesh(kit[id], id === 'sky-crystal' ? glow : id.startsWith('cloud') ? cloud : material, items.length);
    items.forEach((a, i) => { dummy.position.set(a.x, a.y, a.z); dummy.rotation.set(0, a.angle, 0); dummy.scale.setScalar(a.scale); dummy.updateMatrix(); batch.setMatrixAt(i, dummy.matrix); });
    const far = id.startsWith('cloud') || id.startsWith('distant') || (id === 'isle-rock' && items.some(a => a.scale > 2.5));
    batch.castShadow = !far; batch.receiveShadow = !id.startsWith('cloud');
    batch.computeBoundingSphere(); w.group.add(batch);
  }
  // Drifting motes of light around the isles.
  const motes = q === 'low' ? 90 : 240, pts = [];
  for (let i = 0; i < motes; i++) { const p = h.islands[i % h.islands.length], a = i * 2.39996, r = .3 + hash(i, 1, 11) * 1.3; pts.push(p.x + Math.cos(a) * p.rx * r, p.y + 1 + hash(i, 2, 11) * 18, p.z + Math.sin(a) * p.rz * r); }
  const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const sparks = new THREE.Points(mg, new THREE.PointsMaterial({ color: '#fff4c8', size: 3, sizeAttenuation: false, transparent: true, opacity: .75, depthWrite: false }));
  sparks.userData.ownedMaterial = true; w.group.add(sparks);
  w.animations.push({ type: 'tick', tick: clock => { if (!w.settings?.reducedMotion) sparks.position.y = Math.sin(clock * .5) * .8; } });
  // Tee markers in the course accent.
  for (const x of [-3, 3]) w.mesh('box', h.course.accent, x, ground(x, 0) + .22, 0, .6, .44, .6);
}
