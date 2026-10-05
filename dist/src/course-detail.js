import * as THREE from "../vendor/three.module.js";
import { terrainAt, terrainHeight, pathDistance } from "./golf-courses.js";

export function detailGolf(w, h) {
  const ground = (x, z) => w.surfaceHeight?.(x, z) ?? terrainHeight(h, x, z);
  // Cart path follows the outside of the rough, away from every playable surface.
  const vertices = [];
  for (let z = 22; z > -h.length - 26; z -= 3) {
    const x = 76 + Math.sin(z * 0.015 + h.seed) * 8,
      next = 76 + Math.sin((z - 3) * 0.015 + h.seed) * 8;
    for (const [px, pz] of [
      [x - 1.1, z],
      [next - 1.1, z - 3],
      [x + 1.1, z],
      [x + 1.1, z],
      [next - 1.1, z - 3],
      [next + 1.1, z - 3],
    ])
      vertices.push(px, ground(px, pz) + 0.03, pz);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geo.computeVertexNormals();
  const path = new THREE.Mesh(geo, w.mat("#d2b98a", { side: THREE.DoubleSide }));
  path.receiveShadow = true;
  w.group.add(path);
  // Flower clusters, leafy understory and warm timber accents echo the mini courses.
  const stem = new THREE.InstancedMesh(w.geometries.cylinder, w.mat("#557d46"), 520),
    flower = new THREE.InstancedMesh(w.geometries.sphere, w.mat("#ffffff"), 520),
    dummy = new THREE.Object3D();
  let count = 0;
  for (let i = 0; i < 900 && count < 520; i++) {
    const cluster = i % 18,
      angle = i * 2.399,
      x = (cluster % 2 ? 1 : -1) * (26 + (cluster % 4) * 9) + Math.cos(angle) * (1 + (i % 9) * 0.22),
      z = 15 - (Math.floor(cluster / 2) * h.length) / 8 + Math.sin(angle) * (2 + (i % 5) * 0.28),
      t = terrainAt(h, x, z);
    if (t.surface !== "rough" || t.hazard || pathDistance(h, x, z) < h.width / 2 + 3) continue;
    const y = ground(x, z);
    dummy.position.set(x, y + 0.21, z);
    dummy.scale.set(0.022, 0.42, 0.022);
    dummy.updateMatrix();
    stem.setMatrixAt(count, dummy.matrix);
    dummy.position.y = y + 0.43;
    dummy.scale.set(0.12, 0.1, 0.12);
    dummy.updateMatrix();
    flower.setMatrixAt(count, dummy.matrix);
    flower.setColorAt(count, new THREE.Color(["#f2d16c", "#e9a181", "#ecdfc4", "#d3a5c8"][cluster % 4]));
    count++;
  }
  stem.count = flower.count = count;
  w.group.add(stem, flower);
  // Small golf cart beside the tee path (about 2.4 by 1.3 metres).
  const cart = new THREE.Group();
  cart.position.set(12, ground(12, 12), 12);
  cart.rotation.y = -0.4;
  w.group.add(cart);
  const m = (g, c, x, y, z, sx, sy, sz) => w.mesh(g, c, x, y, z, sx, sy, sz, cart);
  m("box", "#f5e5bd", 0, 0.65, 0, 1.25, 0.25, 2.35);
  m("box", "#538874", 0, 0.95, 0.6, 1.12, 0.42, 0.72);
  m("box", "#e0c89e", 0, 1, -0.4, 1.05, 0.18, 0.5);
  m("box", "#e0c89e", 0, 1.25, -0.1, 1.05, 0.4, 0.12);
  m("box", "#f2d078", 0, 1.95, 0, 1.45, 0.12, 2.1);
  for (const x of [-0.62, 0.62]) {
    for (const z of [-0.76, 0.76]) {
      const wheel = m("cylinder", "#384c43", x, 0.35, z, 0.29, 0.16, 0.29);
      wheel.rotation.z = Math.PI / 2;
    }
    for (const z of [-0.8, 0.8]) m("box", "#647668", x, 1.4, z, 0.05, 1.05, 0.05);
  }
  for (const p of h.bunkers) {
    const x = p.x + p.rx * 0.87,
      z = p.z,
      y = ground(x, z);
    const rake = w.mesh("cylinder", "#b09061", x, y + 0.12, z, 0.025, 1.4, 0.025);
    rake.rotation.z = Math.PI / 2;
    w.mesh("box", "#777e62", x - 0.7, y + 0.13, z, 0.08, 0.06, 0.42);
  }
  // Fence and planted entrance are tucked behind the tee.
  for (let i = 0; i < 14; i++) {
    const x = -15 + i * 2,
      z = 23,
      y = ground(x, z);
    w.mesh("box", "#bd9a6b", x, y + 0.5, z, 0.11, 1, 0.11);
    if (i < 13) for (const lift of [0.35, 0.75]) w.mesh("box", "#dec28f", x + 1, y + lift, z, 2, 0.08, 0.07);
  }
}

export function keepMiniSceneryClear(world) {
  const original = world.decorate.bind(world);
  world.decorate = (course, h) => {
    const root = world.group,
      decor = new THREE.Group();
    root.add(decor);
    world.group = decor;
    original(course, h);
    world.group = root;
    decor.updateMatrixWorld(true);
    const box = new THREE.Box3(),
      matrix = new THREE.Matrix4(),
      point = new THREE.Vector3();
    const nearTrack = (x, z, r) =>
      h.samples.some((p) => Math.hypot(p.x - x, p.z - z) < h.width / 2 + r + 0.6);
    for (const object of [...decor.children]) {
      if (object.isInstancedMesh) {
        let count = 0;
        for (let i = 0; i < object.count; i++) {
          object.getMatrixAt(i, matrix);
          point.setFromMatrixPosition(matrix);
          if (nearTrack(point.x, point.z, 0.2)) continue;
          object.setMatrixAt(count++, matrix);
        }
        object.count = count;
        object.instanceMatrix.needsUpdate = true;
        continue;
      }
      box.setFromObject(object);
      if (box.min.y > 5 || box.max.y < -0.2) continue;
      const cx = (box.min.x + box.max.x) / 2,
        cz = (box.min.z + box.max.z) / 2,
        r = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) / 2;
      if (nearTrack(cx, cz, r)) {
        object.visible = false;
      }
    }
  };
}
