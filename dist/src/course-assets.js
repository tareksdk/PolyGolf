import * as THREE from "../vendor/three.module.js";
import { terrainHeight, terrainAt, pathDistance, fairwayWidth, ovalBoundary } from "./golf-courses.js";
import { nearbyTrees } from "./forest.js";
import { registerOccluders } from "./occlusion.js";
import { pirateShipFor, pumpkinFor } from "./course-features.js";
import { scenicLayout } from "./scenic-layout.js";
import { halloweenActive } from './season.js';
import { buildPirateShip } from './pirate-effects.js';
import { coastWaterLevel } from './golf-courses.js';

// Places the Blender-authored course kit (assets/source/build_course_kit.py) around each
// full-golf hole. Everything here is visual only: collisions, terrain and replays use
// the shared course modules. Props are placed only on ground that is clear of tree
// trunks, and never on greens, tees or hazards unless a prop is meant for the water.
const TREE = /^(oak|pine|willow|juniper|larch|autumn-oak|fruit-tree)(-low)?$/;
let kit;

export async function loadCourseAssets() {
  const response = await fetch(new URL("../assets/course-kit.json", import.meta.url));
  if (!response.ok) throw Error("Course assets could not load.");
  const data = await response.json();
  kit = {};
  for (const [name, a] of Object.entries(data.assets)) {
    // v5 kits store triangle positions and one palette colour per triangle.
    if (a.p) {
      const color = new Float32Array(a.p.length);
      a.c.forEach((c, t) => {
        const rgb = data.palette[c];
        for (let v = 0; v < 3; v++) color.set(rgb, t * 9 + v * 3);
      });
      kit[name] = { position: a.p, color, height: a.height, radius: a.radius };
    } else kit[name] = a;
  }
}

function geometryFor(name) {
  const data = kit?.[name];
  if (!data) return null;
  data.geometry ??= (() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(data.position, 3));
    geo.setAttribute(
      "color",
      data.color instanceof Float32Array ? new THREE.BufferAttribute(data.color, 3) : new THREE.Float32BufferAttribute(data.color, 3),
    );
    if (data.normal) geo.setAttribute("normal", new THREE.Float32BufferAttribute(data.normal, 3));
    else geo.computeVertexNormals();
    geo.userData.shared = true;
    return geo;
  })();
  return data.geometry;
}

export function courseAssets(w, h) {
  const material = w.mat("#ffffff", { vertexColors: true }),
    dummy = new THREE.Object3D(),
    groups = new Map(),
    ground = (x, z) => w.surfaceHeight?.(x, z) ?? terrainHeight(h, x, z),
    taken = [];
  const add = (name, x, z, scale = 1, angle = 0, y = null) => {
    // Cull distant parts of the forest instead of submitting the entire course
    // whenever one tree enters the camera. Props stay batched by asset.
    const key = TREE.test(name) ? name + ':' + Math.floor(x / 150) + ':' + Math.floor(z / 150) : name;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ x, z, scale, angle, fixedY: y });
  };
  // Clear ground: no trunk (or canopy, for tall props), prop, hazard or playing surface nearby.
  const clear = (x, z, r, { play = false, water = false, canopy = 1.2 } = {}) => {
    if (nearbyTrees(h, x, z).some((t) => Math.hypot(t.x - x, t.z - z) < r + canopy * (t.size || 1))) return false;
    if (taken.some((p) => Math.hypot(p.x - x, p.z - z) < r + p.r)) return false;
    if (terrainAt(h, x, z).hazard) return false;
    for (const [dx, dz] of [
      [r, 0],
      [-r, 0],
      [0, r],
      [0, -r],
    ]) {
      const t = terrainAt(h, x + dx, z + dz);
      if ((t.hazard && (!water || t.height < -20)) || (!play && ["green", "tee", "sand"].includes(t.surface))) return false;
    }
    return !play ? !["green", "tee", "sand"].includes(terrainAt(h, x, z).surface) : true;
  };
  const claim = (x, z, r) => taken.push({ x, z, r });
  const firstClear = (candidates, r, options) => candidates.find(([x, z]) => clear(x, z, r, options));
  const facing = (fromX, fromZ, toX, toZ) => Math.atan2(toX - fromX, toZ - fromZ);
  const water = (p) => terrainAt(h, p.x, p.z).height;

  // ---- Forest: far trees use low-detail models; The Orchard swaps in fruit trees.
  const orchard = h.courseIndex === 0 && h.index === 2 && !h.custom;
  for (const t of h.trees) {
    const far = w.settings?.graphics === "low" || t.far || Math.abs(t.x) > 85;
    let type = t.type;
    if (orchard && t.type !== "pine" && pathDistance(h, t.x, t.z) < 70) type = far ? "fruit-tree-low" : "fruit-tree";
    else if (far) type = t.type === "larch" ? "larch-low" : t.type === "autumn-oak" ? "autumn-oak-low" : t.type === "pine" ? "pine-low" : "oak-low";
    add(type, t.x, t.z, t.size, (t.x + t.z) * 0.31);
  }

  // ---- Clubhouse facing the first tee, with a flag, parked cart and planters.
  const home = [-26, 24],
    toTee = facing(...home, 0, 0),
    front = (d, side = 0) => [home[0] + Math.sin(toTee) * d + Math.cos(toTee) * side, home[1] + Math.cos(toTee) * d - Math.sin(toTee) * side];
  const teeBuilding = !h.backdrop || h.backdrop === "lake" ? "clubhouse" :
    ["garden", "wetland"].includes(h.backdrop) ? "gazebo" : "starter-hut";
  add(teeBuilding, ...home, 1, toTee);
  claim(...home, 8.5);
  for (const [name, d, side, r, angle] of [
    ["flagpole", 9.5, -6.5, 0.6, toTee],
    ["golf-cart", 6.5, 9.5, 1.6, toTee + Math.PI / 2],
    ["planter", 7.4, 3.4, 0.7, toTee],
    ["planter", 7.4, -3.4, 0.7, toTee],
  ]) {
    const [x, z] = front(d, side);
    if (clear(x, z, r, { play: true })) {
      add(name, x, z, 1, angle);
      claim(x, z, r);
    }
  }
  const hut = firstClear(
    [
      [-12, 12],
      [-14, 9],
      [10, 11],
      [-9, 14],
      [12, 8],
    ],
    2.2,
    { play: true, canopy: 2 },
  );
  if (hut) {
    add(h.courseIndex === 1 ? "beach-hut" : "starter-hut", ...hut, 1, facing(...hut, 0, 0));
    claim(...hut, 2.4);
  }

  // ---- Tee complex: markers, hole sign, bench, ball washer, bin and planter.
  for (const x of [-2.8, 2.8]) add("tee-marker", x, 0, 1, 0);
  const sign = [5.8, 2];
  add("tee-sign", ...sign, 1, -0.18);
  holeCard(w, h, ...sign, -0.18, ground(...sign));
  claim(...sign, 1);
  for (const [name, x, z, angle, r] of [
    ["bench", -8, 4, 0.2, 1],
    ["ball-washer", -5.4, 1.4, 0.3, 0.4],
    ["bin", -6.4, 2.8, 0, 0.3],
    ["planter", 7.8, 4.8, -0.3, 0.7],
  ])
    if (clear(x, z, r, { play: true })) {
      add(name, x, z, 1, angle);
      claim(x, z, r);
    }

  // ---- Distance posts: white every 100 m to the green, red at the 50s.
  for (let remaining = 100; remaining < h.length - 40; remaining += 50) {
    const z = -h.length + remaining,
      route = h.route.reduce((a, b) => (Math.abs(a[1] - z) < Math.abs(b[1] - z) ? a : b)),
      x = route[0] + fairwayWidth(h, -z / h.length) / 2 + 2;
    add(remaining % 100 === 0 ? "distance-post-white" : "distance-post-red", x, z, 1, 0);
  }

  // ---- Green complex: a bench and bin set back beside the putting surface.
  const g = h.green,
    approach = h.route.at(-5),
    len = Math.hypot(g.x - approach[0], g.z - approach[1]) || 1,
    ux = (g.x - approach[0]) / len,
    uz = (g.z - approach[1]) / len;
  for (const side of [1, -1]) {
    const bx = g.x + ux * (g.rz + 6) + uz * side * (g.rx + 4),
      bz = g.z + uz * (g.rz + 6) - ux * side * (g.rx + 4);
    if (clear(bx, bz, 1.4)) {
      add("bench", bx, bz, 1, facing(bx, bz, g.x, g.z));
      add("bin", bx + uz * side * 1.7, bz - ux * side * 1.7, 1, 0);
      claim(bx, bz, 2.2);
      break;
    }
  }

  // ---- Bunkers get a rake resting on the lip.
  for (const b of h.bunkers) {
    const p = b.angle || b.scallop ? ovalBoundary(b, 0.18, 1.02) : { x: b.x + b.rx * 0.95, z: b.z + b.rz * 0.18 };
    add("rake", p.x, p.z, 1, Math.PI / 2 + 0.2 + (b.angle || 0));
  }

  // ---- Water: reeds and stones on the shore; lily pads (inland) or tide rocks (coast).
  for (const p of h.water)
    for (let j = 0; j < 44; j++) {
      const a = (j / 44) * Math.PI * 2,
        x = p.x + Math.cos(a) * (p.rx + 1.8),
        z = p.z + Math.sin(a) * (p.rz + 1.8);
      if (pathDistance(h, x, z) < h.width * 0.5 + 3) continue;
      add(h.courseIndex === 1 && j % 4 === 0 ? "tide-rocks" : j % 5 === 0 ? "boulder" : "reeds", x, z, 0.85 + (j % 4) * 0.15, a);
    }
  if (h.courseIndex !== 1)
    for (const p of h.water)
      for (let i = 0; i < 7; i++) {
        const a = i * 2.399 + h.seed,
          r = 0.28 + (i % 3) * 0.18;
        add("lily-pads", p.x + Math.cos(a) * p.rx * r, p.z + Math.sin(a) * p.rz * r, 1.3, a, water(p) + 0.015);
      }

  // ---- A signature landmark per hole on a clear shoreline, away from the line of play.
  const shore = (p) => {
    const spots = [];
    for (let k = 0; k < 32; k++) {
      const a = (k / 32) * Math.PI * 2,
        f = 1.08 + (k % 3) * 0.05,
        x = p.x + Math.cos(a) * p.rx * f,
        z = p.z + Math.sin(a) * p.rz * f;
      spots.push([x, z, pathDistance(h, x, z)]);
    }
    return spots.sort((a, b) => b[2] - a[2]).map(([x, z]) => [x, z]);
  };
  const lake = h.water[0],
    landmark = h.custom ? "community" : h.landmark;
  if (lake && landmark === "boathouse") {
    const spot = firstClear(shore(lake), 3.4, { water: true, canopy: 1.6 });
    if (spot) {
      const angle = facing(...spot, lake.x, lake.z),
        bx = spot[0] + Math.sin(angle) * 8 + Math.cos(angle) * 2.8,
        bz = spot[1] + Math.cos(angle) * 8 - Math.sin(angle) * 2.8;
      add("boathouse", ...spot, 1, angle, ground(...spot) - 0.15);
      add("rowboat", bx, bz, 1, angle + 0.5, water(lake) - 0.02);
      claim(...spot, 5);
    }
  }
  if (landmark === "garden" || landmark === "lily-reach") {
    for (const p of h.water) {
      const spot = firstClear(shore(p), 2.5, { water: true, canopy: 1.6 });
      if (spot) {
        add("gazebo", ...spot, 1, facing(...spot, p.x, p.z));
        claim(...spot, 2.8);
        break;
      }
    }
    for (const p of h.water)
      for (const a of [0.8, 3.7]) {
        const x = p.x + Math.cos(a) * p.rx * 0.92,
          z = p.z + Math.sin(a) * p.rz * 0.92;
        add("heron", x, z, 1.1, a + 2.2, water(p) - 0.04);
      }
  }
  if (h.courseIndex === 2 && !h.custom) {
    const logs = firstClear(
      [
        [11, 10],
        [-11, 9],
        [13, 6],
        [-13, 5],
      ],
      1.2,
      { play: true },
    );
    if (logs) {
      add("log-pile", ...logs, 1, 0.7);
      claim(...logs, 1.3);
    }
  }
  if (h.courseIndex === 1 && !h.custom) {
    const spots = [...(landmark === "tide" && lake ? shore(lake) : []), [14, 9], [-14, 6], [12, 13], [-12, 12]];
    let placed = 0;
    for (const spot of spots)
      if (placed < (landmark === "tide" ? 2 : 1) && clear(...spot, 2, { play: true, canopy: 1.6, water: true })) {
        add("beach-hut", ...spot, 1, facing(...spot, 0, -h.length / 2));
        claim(...spot, 2.6);
        placed++;
      }
  }
  if (landmark === "arch" && lake) {
    const spot = firstClear(shore(lake), 3.6, { water: true, canopy: 1.8 });
    if (spot) {
      add("stone-arch", ...spot, 1, facing(...spot, lake.x, lake.z) + Math.PI / 2);
      claim(...spot, 4);
    }
  }
  if (landmark === "spring" && lake) {
    const spot = firstClear(shore(lake), 1.6, { water: true, canopy: 1.4 });
    if (spot) {
      add("spring-well", ...spot, 1, facing(...spot, 0, 0));
      claim(...spot, 1.8);
    }
  }
  if (h.courseIndex === 2 && lake) {
    const spot = firstClear(shore(lake).slice(6), 1.8, { water: true });
    if (spot) {
      add("fallen-log", ...spot, 1, 1.1);
      claim(...spot, 2);
    }
  }

  // New parkland landmarks reuse the same merged, instanced Blender meshes.
  for (const p of h.scenery || []) {
    if (pathDistance(h, p.x, p.z) < fairwayWidth(h, -p.z / h.length) / 2 + p.radius + 3) continue;
    if (!clear(p.x, p.z, p.radius, { canopy: 2 })) continue;
    add(p.name, p.x, p.z, p.scale ?? 1, p.angle ?? 0);
    claim(p.x, p.z, p.radius);
  }

  // ---- The rough just beyond the fairway: soft, low planting only.
  for (let i = 0; i < 70; i++) {
    const t = 0.08 + (i / 70) * 0.84,
      z = -h.length * t,
      route = h.route.reduce((a, b) => (Math.abs(a[1] - z) < Math.abs(b[1] - z) ? a : b)),
      side = i % 2 ? 1 : -1,
      x = route[0] + side * (fairwayWidth(h, t) / 2 + 4.5 + ((i * 7) % 4));
    if (!clear(x, z, 0.7)) continue;
    const name = h.courseIndex === 1 ? "dune-grass" : h.courseIndex === 2 ? (i % 3 === 0 ? "autumn-flowers" : "mushrooms") : "flowers";
    add(name, x, z, name === "dune-grass" ? 1.3 : 1, i * 1.7);
    claim(x, z, 0.7);
  }
  // ---- Outer scenery.
  for (let j = 0; j < 40; j++) {
    const x = (j % 2 ? 1 : -1) * (75 + ((j * 31) % 45)),
      z = -((j * 83) % (h.length + 10));
    if (terrainAt(h, x, z).hazard || h.trees.some((t) => Math.hypot(t.x - x, t.z - z) < 3)) continue;
    add("boulder", x, z, 0.6 + (j % 3) * 0.25, j);
  }
  for (let i = 0; i < 240; i++) {
    const z = 36 - (i / 240) * (h.length + 90),
      x = (i % 2 ? 1 : -1) * (28 + ((i * 17) % 90));
    if (terrainAt(h, x, z).hazard || pathDistance(h, x, z) < h.width / 2 + 4 || Math.hypot(x - h.cup.x, z - h.cup.z) < 24) continue;
    add(i % 4 === 0 ? (h.courseIndex === 2 ? "autumn-flowers" : h.courseIndex === 1 ? "dune-grass" : "flowers") : "bush", x, z, 0.7 + (i % 3) * 0.18, i * 2.4);
  }
  for (const p of scenicLayout(h)) {
    if (['alpine-massif','alpine-ridge'].includes(p.name)) continue;
    add(p.name,p.x,p.z,p.scale,p.angle,p.y);
  }

  const pumpkin = pumpkinFor(h);
  if(pumpkin) add("halloween-pumpkin",pumpkin.x,pumpkin.z,1,0,ground(pumpkin.x,pumpkin.z));
  if(halloweenActive() && !h.custom) {
    // Small clusters beside the tee furniture, never on the playable surface.
    for(const [x,z,s] of [[-9.8,5.4,.46],[-10.5,5.9,.34],[9,6.8,.4]]) {
      if(clear(x,z,.65,{canopy:.7})) {add('halloween-pumpkin',x,z,s,x*.3);claim(x,z,.65);}
    }
  }
  const ship = pirateShipFor(h);
  if (ship) buildPirateShip(w,h,geometryFor('pirate-ship'),h.index===0?w.mat('#ffffff',{
    vertexColors:true,roughness:.74,emissive:'#b67a32',emissiveIntensity:.08}):material);
  if (h.courseIndex === 1) {
    for (let i = 0; i < 9; i++) {
      const side = i % 2 ? 1 : -1;
      add("sea-stack", side * (218 + (i % 3) * 44), 80 - i * (h.length + 130) / 9,
        0.65 + (i % 4) * 0.18, i * 1.7, coastWaterLevel(h)-2.9);
    }
  }
  cartPath(w, h, ground);

  for (const [key, places] of groups) {
    const name = key.split(':')[0];
    const geo = geometryFor(name);
    if (!geo) continue;
    const mesh = new THREE.InstancedMesh(geo, material, places.length);
    if(name.startsWith('halloween-'))mesh.userData.halloween=true;
    mesh.castShadow = !name.endsWith("-low") && !["lily-pads", "mushrooms", "rake", "alpine-massif", "alpine-ridge", "coastal-headland", "gull"].includes(name);
    mesh.receiveShadow = true;
    places.forEach((p, i) => {
      p.y = p.fixedY ?? ground(p.x, p.z);
      dummy.position.set(p.x, p.y, p.z);
      dummy.scale.setScalar(p.scale);
      dummy.rotation.set(0, p.angle, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.computeBoundingSphere();
    w.group.add(mesh);
    if (TREE.test(name)) registerOccluders(w, mesh, places, kit[name].height ?? 10.5, kit[name].radius ?? 3.8);
  }
}

// A sandy cart path runs along the quieter side of the hole, broken around hazards and greens.
function cartPath(w, h, ground) {
  const sample = (side) => {
    const rows = [];
    for (let d = 10; d < h.length - 10; d += 4) {
      const z = -d,
        t = d / h.length,
        a = h.route.reduce((p, q) => (Math.abs(p[1] - (z + 3)) < Math.abs(q[1] - (z + 3)) ? p : q)),
        b = h.route.reduce((p, q) => (Math.abs(p[1] - (z - 3)) < Math.abs(q[1] - (z - 3)) ? p : q)),
        dx = b[0] - a[0],
        dz = b[1] - a[1] || -1,
        n = Math.hypot(dx, dz),
        nx = -dz / n,
        nz = dx / n,
        off = side * (fairwayWidth(h, t) / 2 + 6.2),
        px = (a[0] + b[0]) / 2 + nx * off,
        pz = z + nz * off,
        ok =
          Math.hypot(px - h.cup.x, pz - h.cup.z) > h.green.rz * 1.9 &&
          ![0, 1.6, -1.6].some((o) => {
            const s = terrainAt(h, px + nx * o, pz + nz * o);
            return s.hazard || s.surface === "sand" || s.surface === "green";
          }) &&
          !nearbyTrees(h, px, pz).some((tr) => Math.hypot(tr.x - px, tr.z - pz) < 1.8);
      rows.push(ok ? { l: [px - nx * 1.1, pz - nz * 1.1], r: [px + nx * 1.1, pz + nz * 1.1] } : null);
    }
    return rows;
  };
  const left = sample(-1),
    right = sample(1),
    rows = right.filter(Boolean).length >= left.filter(Boolean).length ? right : left,
    verts = [];
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1],
      b = rows[i];
    if (!a || !b) continue;
    for (const [x, z] of [a.l, b.l, a.r, a.r, b.l, b.r]) verts.push(x, ground(x, z) + 0.05, z);
  }
  if (!verts.length) return;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  geo.computeVertexNormals();
  const path = new THREE.Mesh(
    geo,
    w.mat(h.courseIndex === 1 ? "#dccfa6" : h.courseIndex === 2 ? "#cdb58c" : "#d5c49c", {
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  );
  path.receiveShadow = true;
  w.group.add(path);
}

// Paints the hole card (course, hole, par, length) onto the tee sign's face.
function holeCard(w, h, x, z, angle, y) {
  if (typeof document === "undefined") return;
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 220;
  const c = canvas.getContext("2d");
  c.fillStyle = "#efe6cc";
  c.fillRect(0, 0, 512, 220);
  c.fillStyle = "#2f5a45";
  c.fillRect(0, 0, 150, 220);
  c.fillStyle = "#f7f1dc";
  c.font = "700 26px sans-serif";
  c.textAlign = "center";
  c.fillText("HOLE", 75, 64);
  c.font = "800 96px sans-serif";
  c.fillText(String(h.index + 1), 75, 160);
  c.textAlign = "left";
  c.fillStyle = "#2f4d3c";
  c.font = "700 22px sans-serif";
  c.fillText((h.custom ? "Custom hole" : h.course.name).toUpperCase(), 178, 52);
  c.font = "700 40px Georgia, serif";
  c.fillText(h.name.length > 16 ? h.name.slice(0, 15) + "…" : h.name, 178, 106);
  c.font = "600 28px sans-serif";
  c.fillText(`PAR ${h.par}  ·  ${Math.round(h.length)} M`, 178, 160);
  c.fillStyle = "#c9b98f";
  c.fillRect(178, 184, 300, 3);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const card = new THREE.Mesh(new THREE.PlaneGeometry(1.12, 0.48), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85 }));
  card.userData.ownedMaterial = true;
  card.position.set(x + Math.sin(angle) * 0.09, y + 1.12, z + Math.cos(angle) * 0.09);
  card.rotation.y = angle;
  card.receiveShadow = true;
  w.group.add(card);
}
