import { buildLongCourseScenery } from './course-adventure-render.js';
import { eventScenery } from './event-scenery.js';
import { buildMeadowcrestRange } from './meadowcrest-range.js';
import { buildBackdrop } from "./golf-environment.js";
import { turfMaterial } from './turf.js';
import { buildSky } from './sky.js';
import { buildCourseVignettes } from './course-vignettes.js';
import { CUP_RADIUS } from "./golf-physics.js";
import { courseAssets } from "./course-assets.js";
import { golfTrees, signatureDetails } from "./golf-scenery.js";
import { detailGolf } from "./course-detail.js";
import * as THREE from "../vendor/three.module.js";
import {
  terrainAt,
  terrainHeight,
  coastBounds,
  fairwayWidth,
  pathDistance,
  waterLevel,
  GOLF_COURSES,
  getGolfHole,
  golfHoleCount,
} from "./golf-courses.js";
import { COURSES, getHole } from "./courses.js";
export function batchScenery(world) {
  const moving = new Set([
    world.flag,
    world.coin,
    world.pirateShipMesh,
    ...world.obstacleMeshes,
    ...world.animations.map((a) => a.mesh),
    ...(world.scenicFloaters || []).map(p=>p.object),
  ]);
  const buckets = new Map();
  world.group.updateMatrixWorld(true);
  world.group.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh) return;
    let p = o;
    while (p && p !== world.group) {
      if (!p.visible || p.userData.halloween || p.userData.courseDynamic || moving.has(p)) return;
      p = p.parent;
    }
    const key = o.geometry.uuid + o.material.uuid;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(o);
  });
  for (const meshes of buckets.values()) {
    if (meshes.length < 2) continue;
    const first = meshes[0],
      batch = new THREE.InstancedMesh(first.geometry, first.material, meshes.length);
    batch.castShadow = first.castShadow;
    batch.receiveShadow = true;
    meshes.forEach((m, i) => {
      batch.setMatrixAt(i, m.matrixWorld);
      m.removeFromParent();
    });
    world.group.add(batch);
  }
  world.renderer.shadowMap.needsUpdate = true;
}
export function buildGolf(world, h) {
  world.clear();
  world.pirateShipMesh=null;
  world.pirateShipGlints=[];
  world.hole = h;
  world.group = new THREE.Group();
  world.scene.add(world.group);
  world.animations = [];
  world.obstacleMeshes = [];
  world.coin = null;
  world.flag = null;
  const c = h.course;
  world.scene.background = new THREE.Color(h.atmosphere?.horizon || c.sky);
  buildSky(world,h);
  world.scene.fog = new THREE.Fog(h.atmosphere?.horizon || c.sky, 750, 2400);
  // Golf cameras stay metres away. Preserve depth precision across the forest.
  world.camera.near = 0.5;
  world.camera.fov = 45;
  world.camera.far = 3000;
  world.camera.updateProjectionMatrix();
  world.renderer.toneMappingExposure = 1.05;
  world.golfSunColor ??= world.sun.color.clone();
  world.sun.color.copy(world.golfSunColor);
  if (h.atmosphere?.sun) world.sun.color.set(h.atmosphere.sun);
  world.sun.intensity = h.atmosphere?.intensity ?? 2.4;
  if (world.hemi) world.hemi.intensity = 1.8;
  world.shadowCenter = null;
  world.flightPoints = [];
  if (world.flightTrail) world.flightTrail.visible = false;
  world.sun.position.set(-100, 190, 60);
  world.sun.target.position.set(0, 0, -h.length * 0.35);
  world.scene.add(world.sun.target);
  Object.assign(world.sun.shadow.camera, {
    left: -120,
    right: 120,
    top: 220,
    bottom: -220,
    near: 1,
    far: 900,
  });
  world.sun.shadow.camera.updateProjectionMatrix();
  // One heightfield owns every land surface. Colours describe the cut of grass;
  // no overlapping fairway/green/sand meshes can z-fight or swallow the ball.
  const nx = h.courseIndex>=15 ? (world.settings?.graphics === "low" ? 110 : 160) : world.settings?.graphics === "low" ? 140 : 210,
    nz = Math.ceil((h.length + 220) / (h.courseIndex>=15 ? (world.settings?.graphics === "low" ? 3.4 : 2.6) : world.settings?.graphics === "low" ? 2.8 : 2)),
    width = 420,
    depth = h.length + 220,
    top = 100,
    positions = [],
    uvs = [],
    indices = [];
  for (let j = 0; j <= nz; j++)
    for (let i = 0; i <= nx; i++) {
      const z = top - (j / nz) * depth,
        edges = (h.layoutCourse ?? h.courseIndex) === 1 ? coastBounds(h, z) : [-width / 2, width / 2],
        x = edges[0] + (i / nx) * (edges[1] - edges[0]);
      positions.push(x, terrainHeight(h, x, z), z);
      uvs.push(x / width + 0.5, 1 - j / nz);
    }
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i,
        b = a + nx + 1;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  // The cliff starts on the exact edge vertices of this surface, at every quality.
  world.coastOutline = [];
  const edge = (i,j) => world.coastOutline.push(positions.slice((j*(nx+1)+i)*3,(j*(nx+1)+i)*3+3));
  for(let j=0;j<=nz;j++)edge(nx,j);
  for(let i=nx-1;i>=0;i--)edge(i,nz);
  for(let j=nz-1;j>=0;j--)edge(0,j);
  for(let i=1;i<nx;i++)edge(i,0);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const material = turfMaterial(h, width, depth, top, world.settings?.graphics),
    terrain = new THREE.Mesh(geo, material);
  terrain.name='golf-terrain';
  terrain.userData.ownedMaterial = true;
  terrain.receiveShadow = true;
  world.group.add(terrain);
  world.surfaceHeight = (x, z) => {
    const edges = (h.layoutCourse ?? h.courseIndex) === 1 ? coastBounds(h, z) : [-width / 2, width / 2];
    if ((h.layoutCourse ?? h.courseIndex) === 1 && (x < edges[0] || x > edges[1] || z>100 || z<-h.length-120)) return terrainAt(h,x,z).height;
    const fx = Math.max(0, Math.min(nx - 0.00001, ((x - edges[0]) / (edges[1] - edges[0])) * nx)),
      fz = Math.max(0, Math.min(nz - 0.00001, ((top - z) / depth) * nz)),
      i = Math.floor(fx),
      j = Math.floor(fz),
      u = fx - i,
      v = fz - j,
      a = j * (nx + 1) + i,
      y = (k) => positions[k * 3 + 1];
    return u + v <= 1
      ? y(a) * (1 - u - v) + y(a + 1) * u + y(a + nx + 1) * v
      : y(a + 1) * (1 - v) + y(a + nx + 1) * (1 - u) + y(a + nx + 2) * (u + v - 1);
  };
  for (const p of h.water) {
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(1, 96),
      world.mat(c.water, { roughness: 0.3, metalness: 0.08, side: THREE.DoubleSide }),
    );
    water.rotation.x = -Math.PI / 2;
    water.scale.set(p.rx, p.rz, 1);
    water.position.set(p.x, waterLevel(h, p), p.z);
    world.group.add(water);
    for (let i = 0; i < 3; i++) {
      const ripple = new THREE.Mesh(
        new THREE.RingGeometry(0.985, 1, 64),
        world.mat("#96c9ce", { side: THREE.DoubleSide, transparent: true, opacity: 0.28, depthWrite: false }),
      );
      ripple.rotation.x = -Math.PI / 2;
      ripple.position.set(p.x, waterLevel(h, p) + 0.012 + i * 0.002, p.z);
      ripple.scale.set(p.rx * (0.35 + i * 0.16), p.rz * (0.35 + i * 0.16), 1);
      world.group.add(ripple);
    }
  }
  if(c.eventTheme) eventScenery(world,h);
  else { courseAssets(world,h); if(h.meadowcrestRange)buildMeadowcrestRange(world);else {buildBackdrop(world,h); buildCourseVignettes(world,h);} }
  const cup = h.cup,
    y = world.surfaceHeight(cup.x, cup.z);
  if(!h.meadowcrestRange){
  world.mesh("cylinder", "#223c2b", cup.x, y + 0.012, cup.z, CUP_RADIUS + 0.025, 0.015, CUP_RADIUS + 0.025);
  world.mesh("cylinder", "#f4edcf", cup.x, y + 1.2, cup.z, 0.017, 2.4, 0.017);
  world.flag = world.mesh(
    new THREE.PlaneGeometry(0.65, 0.42, 5, 2),
    "#df8667",
    cup.x + 0.325,
    y + 2.12,
    cup.z,
    1,
    1,
    1,
    world.group,
    { side: THREE.DoubleSide },
  );
  }
  // Tee markers, distance posts and course furniture come from the Blender kit (course-assets.js).
  world.ball.position.set(h.start.x, world.surfaceHeight(h.start.x, h.start.z) + 0.1, h.start.z);
  world.previewPosition = new THREE.Vector3(0, 0, -h.length * 0.3);
  buildLongCourseScenery(world,h);
  batchScenery(world);
}

export function coursePreview(index, mode = "mini") {
  const h = mode === "golf" ? getGolfHole(index, 0, false) : getHole(index, 0),
    c = h.course;
  let path;
  if (mode === "golf") {
    path = h.points
      .map(([x, z], i) => `${i ? "L" : "M"}${220 + x * 1.7},${230 + (z / h.length) * 210}`)
      .join(" ");
  } else
    path = h.samples
      .filter((_, i) => i % 5 === 0)
      .map((p, i) => `${i ? "L" : "M"}${220 + p.x * 8},${130 + p.z * 8}`)
      .join(" ");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 260"><rect width="440" height="260" fill="${c.sky}"/><ellipse cx="220" cy="159" rx="235" ry="145" fill="${c.grass}"/><ellipse cx="330" cy="180" rx="58" ry="38" fill="${c.water}"/><path d="${path}" fill="none" stroke="${c.edge}" stroke-width="${mode === "golf" ? 40 : 45}" stroke-linecap="round" stroke-linejoin="round"/><path d="${path}" fill="none" stroke="#b4cc89" stroke-width="${mode === "golf" ? 34 : 38}" stroke-linecap="round" stroke-linejoin="round"/>${Array.from({ length: 10 }, (_, i) => `<circle cx="${25 + ((i * 61) % 390)}" cy="${20 + ((i * 83) % 220)}" r="${8 + (i % 3) * 4}" fill="#527550" opacity=".65"/>`).join("")}<circle cx="220" cy="230" r="4" fill="#fffbed"/><text x="20" y="238" font-family="sans-serif" font-size="12" letter-spacing="3" fill="#fffbed">${mode === "golf" ? `${golfHoleCount(index)} HOLES • SIGNATURE LOOP` : "9 HOLES • MINI GOLF"}</text></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
