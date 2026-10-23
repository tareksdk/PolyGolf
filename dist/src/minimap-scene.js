import { terrainHeight, ovalBoundary, coastBounds, fairwayWidth } from './golf-courses.js';
import { heightAt, nearestPoint, surfaceAt } from './courses.js';
import { islandRadius } from './sky-island-layouts.js';

// A cached, orthographic illustration. Relief changes the lighting, never the
// ground coordinates: markers and all feature footprints share one projection.
const W = 240, H = 212;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const f = n => Number(n).toFixed(2);
const noise = (x, z, seed = 0) => { const n = Math.sin(x * 12.9898 + z * 78.233 + seed * 4.713) * 43758.5453; return n - Math.floor(n); };
export const mapColor = (value, fallback) => /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(value || '') ? value : fallback;
const rgb = value => {
  const hex = value.length === 4 ? value.slice(1).split('').map(c => c + c).join('') : value.slice(1);
  return [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16));
};
function tint(value, amount = 1) { return '#' + rgb(value).map(n => Math.round(clamp(n * amount, 0, 255)).toString(16).padStart(2, '0')).join(''); }
function mix(a, b, t) { const c = rgb(b); return '#' + rgb(a).map((n, i) => Math.round(n + (c[i] - n) * t).toString(16).padStart(2, '0')).join(''); }
const pointsPath = points => points.map((p, i) => `${i ? 'L' : 'M'}${f(p.x)},${f(p.y)}`).join(' ') + ' Z';
const shape = (points, fill, attrs = '') => `<path d="${pointsPath(points)}" fill="${fill}" ${attrs}/>`;
const groundHeight = (hole, x, z) => hole.mode === 'golf' ? terrainHeight(hole, x, z) : heightAt(hole, nearestPoint(hole, x, z).t);

export function terrainFacets(hole, model) {
  const rows = 7, columns = 7, grid = [], seed = hole.seed ?? 0;
  for (let row = 0; row <= rows; row++) {
    const line = [];
    for (let col = 0; col <= columns; col++) {
      const px = -5 + (W + 10) * (col + (col && col < columns ? (noise(col, row, seed) - .5) * .48 : 0)) / columns;
      const py = -5 + (H + 10) * (row + (row && row < rows ? (noise(row, col, seed + 5) - .5) * .48 : 0)) / rows;
      const x = (px - W / 2) / model.scale + (model.minX + model.maxX) / 2;
      const z = (py - H / 2) / model.scale + (model.minZ + model.maxZ) / 2;
      line.push({ x, z, height: groundHeight(hole, x, z), screen: { x: px, y: py } });
    }
    grid.push(line);
  }
  const faces = [];
  for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
    const a = grid[row][col], b = grid[row][col + 1], c = grid[row + 1][col], d = grid[row + 1][col + 1];
    for (const vertices of (row + col) % 2 ? [[a, b, c], [b, d, c]] : [[a, b, d], [a, d, c]]) {
      const [p, q, r] = vertices, ux = q.x - p.x, uy = (q.height - p.height) * 3.2, uz = q.z - p.z;
      const vx = r.x - p.x, vy = (r.height - p.height) * 3.2, vz = r.z - p.z;
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      if (ny < 0) { nx *= -1; ny *= -1; nz *= -1; }
      const n = Math.hypot(nx, ny, nz) || 1;
      // Relief is exaggerated in lighting only; every footprint stays undistorted.
      const light = clamp((nx * -.48 + ny * .81 + nz * -.34) / n, 0, 1);
      faces.push({ vertices, light: .7 + light * .38 + (noise(col, row, seed) - .5) * .035 });
    }
  }
  return faces;
}

export function minimapForest(hole, model) {
  const candidates = (hole.trees || []).filter(tree => {
    const p = model.project(tree.x, tree.z);
    return p.x > 3 && p.x < W - 3 && p.y > 7 && p.y < H - 3;
  }).map(tree => ({ tree, point: model.project(tree.x, tree.z), rank: noise(tree.x, tree.z, hole.seed) })).sort((a, b) => a.rank - b.rank);
  const chosen = [];
  // Screen-space thinning preserves real positions and silhouettes, rather than
  // turning every tree on a long hole into an unreadable subpixel speck.
  for (const p of candidates) {
    if (chosen.some(q => (p.point.x - q.point.x) ** 2 + (p.point.y - q.point.y) ** 2 < 6.6 ** 2)) continue;
    chosen.push(p);
    if (chosen.length === 112) break;
  }
  return chosen.sort((a, b) => a.point.y - b.point.y);
}

function forestFloor(trees, base) {
  const cells = new Map();
  for (const { point: p } of trees) {
    const key = Math.floor(p.x / 36) + ':' + Math.floor(p.y / 34);
    if (!cells.has(key)) cells.set(key, []); cells.get(key).push(p);
  }
  let out = '';
  for (const points of cells.values()) {
    if (points.length < 2) continue;
    const x = points.reduce((n, p) => n + p.x, 0) / points.length, y = points.reduce((n, p) => n + p.y, 0) / points.length;
    const rx = Math.max(...points.map(p => Math.abs(p.x - x))) + 7, ry = Math.max(...points.map(p => Math.abs(p.y - y))) + 8;
    out += shape(Array.from({ length: 7 }, (_, i) => { const a = i * Math.PI * 2 / 7; return { x: x + Math.cos(a) * rx, y: y + Math.sin(a) * ry }; }), mix(base, '#254c3e', .18));
  }
  return out;
}

// Shared SVG geometry is instanced with <use>, keeping forests compact and sharp.
const TREE_SHAPES = (() => {
  const trunk = '<path d="M-.15 -.6 V.55 H.15 V-.6Z" fill="#79684b"/>';
  let pine = trunk, canopy = trunk;
  for (const [radius, y, height] of [[1, 0, 2.1], [.73, -.588, 1.722], [.46, -1.218, 1.176]]) {
    pine += shape([{ x: -radius, y }, { x: 0, y: y - height }, { x: 0, y: y + .12 }], 'var(--tree-light)');
    pine += shape([{ x: 0, y: y - height }, { x: radius, y }, { x: 0, y: y + .12 }], 'var(--tree-dark)');
    pine += shape([{ x: -radius, y }, { x: 0, y: y - height * .2 }, { x: radius, y }], 'var(--tree-mid)');
  }
  const ring = Array.from({ length: 7 }, (_, i) => { const a = i / 7 * Math.PI * 2; return { x: Math.cos(a), y: Math.sin(a) - .75 }; });
  for (let i = 0; i < ring.length; i++) canopy += shape([{ x: -.22, y: -1.1 }, ring[i], ring[(i + 1) % ring.length]], 'var(--tree-' + ['mid', 'dark', 'dark', 'mid', 'light', 'light', 'mid'][i] + ')');
  return `<g id="minimap-pine">${pine}</g><g id="minimap-canopy">${canopy}</g><path id="minimap-tree-shadow" d="M-.8 0 L.6 -.3 L1.7 .7 L.4 1.1 L-.5 .5Z" fill="#213d36" opacity=".23"/>`;
})();
function treeGlyph({ tree, point: p }, hole) {
  const kind = /pine|larch|juniper/.test(tree.type || 'pine') ? 'pine' : 'canopy', autumn = /larch|autumn/.test(tree.type || '');
  const radius = clamp((tree.size || 1) * 3.8, 3.4, 5.7), angle = (noise(tree.x, tree.z, hole.seed) - .5) * 18;
  const base = autumn ? '#c09245' : kind === 'pine' ? '#497d5b' : tree.type === 'willow' ? '#91ad61' : '#7ca15c';
  return `<g data-map-tree="${kind}" transform="translate(${f(p.x)} ${f(p.y)})" style="--tree-light:${tint(base, 1.22)};--tree-dark:${tint(base, .72)};--tree-mid:${tint(base, .96)}"><use href="#minimap-tree-shadow" transform="scale(${f(radius)})"/><use href="#minimap-${kind}" transform="rotate(${f(angle)}) scale(${f(radius)})"/></g>`;
}

function annotations(scale) {
  const meters = [1, 2, 5, 10, 20, 50, 100].find(n => n * scale >= 22) || 100;
  return `<g class="minimap-scale" transform="translate(12 196)"><rect x="-5" y="-20" width="${f(meters * scale + 10)}" height="26" rx="3"/><path d="M0 -3 V0 H${f(meters * scale)} V-3 M${f(meters * scale / 2)} 0 V-2"/><text x="0" y="-7">${meters} m</text></g><g class="minimap-north" transform="translate(222 20)"><path class="north-shadow" d="M0 -7 L5 6 L0 3 L-5 6Z"/><path class="north-light" d="M0 -7 L0 3 L-5 6Z"/><text x="0" y="-11">N</text></g>`;
}

function planetMinimap(hole, model) {
  const { project, scale } = model;
  const out = ['<rect width="240" height="212" fill="#101d35"/>'];
  for (let i = 0; i < 36; i++) {
    const x = 7 + noise(i, 1) * 226, y = 7 + noise(i, 2) * 198;
    out.push(`<path d="M${f(x)} ${f(y)}h.8" stroke="#b6cee0" stroke-width=".7" opacity="${f(.2 + noise(i, 3) * .4)}"/>`);
  }
  const route = hole.planets.map(p => project(p.x, p.z));
  out.push(`<path d="${route.map((p, i) => `${i ? 'L' : 'M'}${f(p.x)} ${f(p.y)}`).join(' ')}" stroke="#8198b3" stroke-width=".65" stroke-dasharray="1.5 3" fill="none"/>`);
  for (const planet of hole.planets) {
    const p = project(planet.x, planet.z), r = planet.radius * scale, base = mapColor(planet.color, '#739fc8');
    const boundary = Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r }; });
    out.push(`<g data-map-feature="planet">${shape(boundary, base)}`);
    for (let i = 0; i < boundary.length; i++) out.push(shape([{ x: p.x - r * .25, y: p.y - r * .3 }, boundary[i], boundary[(i + 1) % boundary.length]], tint(base, [1.08, .96, .81, .7, .77, .9, 1.05, 1.2, 1.25, 1.23, 1.18, 1.1][i])));
    const pad = planet.pad * scale;
    out.push(`<circle data-map-feature="landing-cap" cx="${f(p.x)}" cy="${f(p.y)}" r="${f(pad)}" fill="${mapColor(planet.padColor, '#d6e2cb')}" stroke="#e9f2df" stroke-width=".35"/>`);
    if (planet.name === 'Saturn') out.push(`<ellipse cx="${f(p.x)}" cy="${f(p.y)}" rx="${f(r * 1.55)}" ry="${f(r * .4)}" fill="none" stroke="#e0c28b" stroke-width=".7" transform="rotate(-18 ${f(p.x)} ${f(p.y)})"/>`);
    const name = String(planet.name).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    out.push(`<text x="${f(p.x + r + 7)}" y="${f(p.y + 2)}" fill="#dce9f0" style="font:600 6px system-ui,sans-serif">${name}</text></g>`);
  }
  return out.join('') + annotations(scale);
}

export function renderMinimapScene(hole, model, landmarks = []) {
  if (hole.space && hole.planets?.length) return planetMinimap(hole, model);
  const { project, scale, route, golf } = model, c = hole.course || {};
  const rough = mapColor(c.grass, '#73975b'), fairway = mapColor(c.fairway, golf ? '#a5c56e' : mix(rough, '#e0edb0', .38));
  const green = mapColor(c.green, '#c7dc8e'), water = mapColor(c.water, '#62adbd'), sand = mapColor(c.sand, '#ebd29d');
  const projectPoints = points => points.map(p => project(p.x ?? p[0], p.z ?? p[1]));
  const oval = (p, count = 14, ratio = 1) => Array.from({ length: count }, (_, i) => ovalBoundary(p, (i + Math.sin(i * 2.3) * .17) / count * Math.PI * 2, ratio));
  const poly = (points, fill, attrs = '') => shape(projectPoints(points), fill, attrs);
  const rect = fill => `<rect x="-1" y="-1" width="242" height="214" fill="${fill}"/>`;
  let land = rect(rough), ocean = false;
  if (hole.islands) {
    ocean = true;
    land = hole.islands.map(p => poly(Array.from({ length: 22 }, (_, i) => { const a = i / 22 * Math.PI * 2, r = islandRadius(p, a); return [p.x + Math.cos(a) * p.rx * r, p.z + Math.sin(a) * p.rz * r]; }), rough)).join('');
  } else if (golf && (hole.layoutCourse ?? hole.courseIndex) === 1) {
    ocean = true; const left = [], right = [];
    for (let i = 0; i <= 30; i++) { const z = model.minZ - 180 + (model.maxZ - model.minZ + 360) * i / 30, [a, b] = coastBounds(hole, z); left.push([a, z]); right.push([b, z]); }
    land = poly([...left, ...right.reverse()], rough);
  }
  const background = hole.islands ? '#97cfdb' : water;
  const out = [rect(ocean ? background : rough), `<defs>${TREE_SHAPES}<clipPath id="minimap-land">${land}</clipPath></defs>`];
  if (ocean) {
    for (let i = 0; i < 6; i++) out.push(shape([{ x: 0, y: i * 43 - 8 }, { x: W, y: i * 31 + 3 }, { x: W, y: i * 31 + 46 }, { x: 0, y: i * 43 + 35 }], tint(background, i % 2 ? .98 : 1.035)));
    out.push(`<g transform="translate(1.8 4)" fill="${tint(rough, .58)}" opacity=".65">${land.replaceAll(/fill="#[\da-f]+"/gi, 'fill="' + tint(rough, .58) + '"')}</g>`);
    out.push(land);
  }
  out.push('<g clip-path="url(#minimap-land)"><g data-map-layer="relief">');
  for (const facet of terrainFacets(hole, model)) out.push(shape(facet.vertices.map(v => v.screen), tint(rough, facet.light), `stroke="${tint(rough, facet.light)}" stroke-width=".35"`));
  out.push('</g>');
  const trees = minimapForest(hole, model);
  out.push(`<g data-map-layer="woodland">${forestFloor(trees, rough)}</g>`);
  if (golf) {
    const sides = [[], []], center = [], count = clamp(Math.round(hole.length * scale / 9), 12, 32);
    for (let i = 0; i <= count; i++) {
      const index = Math.round(i / count * (route.length - 1)), [x, z] = route[index];
      const a = route[Math.max(0, index - 1)], b = route[Math.min(route.length - 1, index + 1)], dx = b[0] - a[0], dz = b[1] - a[1], n = Math.hypot(dx, dz) || 1;
      const radius = fairwayWidth(hole, clamp(-z / hole.length, 0, 1)) / 2;
      sides[0].push({ x: x - dz / n * radius, z: z + dx / n * radius }); sides[1].push({ x: x + dz / n * radius, z: z - dx / n * radius }); center.push({ x, z });
    }
    const silhouette = [...sides[0], ...sides[1].slice().reverse()];
    out.push(`<g data-map-layer="fairway">${poly(silhouette, tint(fairway, .7), 'transform="translate(.5 1)"')}${poly(silhouette, fairway)}`);
    for (let i = 1; i < center.length; i++) {
      const amount = i % 2 ? 1.015 : .95;
      out.push(poly([sides[0][i - 1], center[i - 1], center[i], sides[0][i]], tint(fairway, amount * 1.025)));
      out.push(poly([center[i - 1], sides[1][i - 1], sides[1][i], center[i]], tint(fairway, amount * .985)));
    }
    out.push('</g>');
    if (hole.green) {
      const boundary = oval(hole.green, 13), center = { x: hole.green.x - hole.green.rx * .15, z: hole.green.z - hole.green.rz * .2 };
      out.push(`<g data-map-feature="green">${poly(boundary, tint(green, .67), 'transform="translate(.5 1)"')}${poly(boundary, green, 'stroke="#d9e5a8" stroke-width=".5"')}`);
      for (let i = 0; i < boundary.length; i++) out.push(poly([center, boundary[i], boundary[(i + 1) % boundary.length]], tint(green, [1.02, .99, .96, .97, 1.01][i % 5])));
      out.push('</g>');
    }
    out.push(poly([{ x: hole.start.x - 4, z: hole.start.z - 6 }, { x: hole.start.x + 4, z: hole.start.z - 6 }, { x: hole.start.x + 4, z: hole.start.z + 6 }, { x: hole.start.x - 4, z: hole.start.z + 6 }], green, 'stroke="#456745" stroke-width=".5"'));
    for (const p of hole.bunkers || []) {
      const boundary = oval(p, 13), inner = oval(p, 13, .83);
      out.push(`<g data-map-feature="bunker">${poly(boundary, tint(sand, .65))}${poly(inner, sand)}`);
      for (let i = 0; i < inner.length; i++) out.push(poly([{ x: p.x - p.rx * .1, z: p.z - p.rz * .1 }, inner[i], inner[(i + 1) % inner.length]], tint(sand, [1.08, 1.02, .98, .92, .96][Math.floor(i / 3) % 5])));
      out.push('</g>');
    }
    for (const p of hole.water || []) {
      const boundary = oval(p, 15), center = { x: p.x - p.rx * .2, z: p.z + p.rz * .13 };
      out.push(`<g data-map-feature="water">${poly(boundary, '#d7d49a', 'stroke="#425d48" stroke-width=".6"')}`);
      const inner = oval(p, 15, .95);
      for (let i = 0; i < inner.length; i++) out.push(poly([center, inner[i], inner[(i + 1) % inner.length]], mix(water, '#387b9b', [.17, .08, 0, .07, .2][Math.floor(i / 3) % 5])));
      if (p.rx * scale > 5) {
        const at = project(p.x - p.rx * .25, p.z - p.rz * .35);
        out.push(`<path d="M${f(at.x - 3)} ${f(at.y + 1)} l5 -1.5 m-3 3.5 l5 -1" fill="none" stroke="#c9edf0" stroke-width=".65" opacity=".6"/>`);
      }
      out.push('</g>');
    }
    for (const channel of hole.lavaChannels || []) {
      const ribbon = channel.map((p, i) => {
        const a = channel[Math.max(0, i - 1)], b = channel[Math.min(channel.length - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], n = Math.hypot(dx, dz) || 1;
        return { left: { x: p[0] - dz / n * p[2], z: p[1] + dx / n * p[2] }, right: { x: p[0] + dz / n * p[2], z: p[1] - dx / n * p[2] }, center: { x: p[0], z: p[1] } };
      });
      out.push(`<g data-map-feature="lava">${poly([...ribbon.map(p => p.left), ...ribbon.map(p => p.right).reverse()], '#ff9a32', 'stroke="#923f29" stroke-width="1.5" stroke-linejoin="bevel"')}`);
      for (let i = 1; i < ribbon.length; i++) {
        const a = ribbon[i - 1], b = ribbon[i];
        out.push(poly([a.left, a.center, b.center, b.left], '#ffc14e'));
        out.push(poly([a.center, a.right, b.right, b.center], '#ef752d'));
        const p = project(a.center.x, a.center.z), q = project(b.center.x, b.center.z);
        out.push(`<path d="M${f(p.x)} ${f(p.y)} L${f(q.x)} ${f(q.y)}" stroke="#ffe070" stroke-width=".55" fill="none"/>`);
      }
      out.push('</g>');
    }
  } else {
    const colors = { grass: fairway, sand, ice: '#b6e1e9', mud: '#9d7e54', boost: '#64bf91', jump: '#d5a0a0' };
    const left = [], right = [], indices = [], count = Math.min(28, route.length - 1);
    for (let i = 0; i <= count; i++) {
      const index = Math.round(i / count * (route.length - 1)), [x, z] = route[index], a = route[Math.max(0, index - 1)], b = route[Math.min(route.length - 1, index + 1)];
      const dx = b[0] - a[0], dz = b[1] - a[1], n = Math.hypot(dx, dz) || 1, radius = hole.width / 2;
      left.push({ x: x - dz / n * radius, z: z + dx / n * radius }); right.push({ x: x + dz / n * radius, z: z - dx / n * radius }); indices.push(index);
    }
    const footprint = [...left, ...right.slice().reverse()];
    out.push(`<g data-map-layer="mini-fairway">${poly(footprint, tint(fairway, .62), 'transform="translate(.6 1.2)"')}${poly(footprint, fairway, `stroke="${tint(fairway, .66)}" stroke-width="1"`)}`);
    for (let i = 1; i < left.length; i++) {
      const t = (indices[i - 1] + indices[i]) / 2 / (route.length - 1), bridge = hole.bridge && t > hole.bridge[0] && t < hole.bridge[1];
      const fill = bridge ? water : colors[surfaceAt({ surface: hole.surface || [] }, t)] || fairway;
      const midA = { x: (left[i - 1].x + right[i - 1].x) / 2, z: (left[i - 1].z + right[i - 1].z) / 2 }, midB = { x: (left[i].x + right[i].x) / 2, z: (left[i].z + right[i].z) / 2 };
      out.push(poly([left[i - 1], left[i], midB, midA], tint(fill, i % 3 ? 1.015 : .99)));
      out.push(poly([midA, midB, right[i], right[i - 1]], tint(fill, i % 3 ? .98 : .965)));
    }
    out.push('</g>');
    for (const p of hole.ob || []) {
      const at = hole.samples[Math.round(p.t * (hole.samples.length - 1))];
      out.push(poly(oval({ x: at.x, z: at.z, rx: p.r, rz: p.r }, 6), '#718278', 'stroke="#d1d8b2" stroke-width=".5"'));
    }
  }
  out.push('<g data-map-layer="trees">');
  for (const tree of trees) out.push(treeGlyph(tree, hole));
  out.push('</g>');
  for (const feature of landmarks.slice(0, 24)) {
    const p = project(feature.x, feature.z);
    if (p.x < 8 || p.x > W - 8 || p.y < 8 || p.y > H - 8) continue;
    out.push(`<g data-map-feature="landmark" transform="translate(${f(p.x)} ${f(p.y)})"><path d="M-5 -2 L5 -2 L8 4 L-2 5 Z" fill="#233f323b"/><path d="M-4 -4 H4 V3 H-4Z" fill="#d6c398"/><path d="M-6 -4 L0 -8 L6 -4 L0 0 Z" fill="#9d674f"/><path d="M0 -8 L6 -4 L0 0 Z" fill="#754a3c"/><path d="M-2 0 H0 V3 H-2Z" fill="#4f6559"/></g>`);
  }
  out.push('</g>');
  out.push(annotations(scale));
  return out.join('');
}
