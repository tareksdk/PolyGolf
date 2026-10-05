import * as THREE from "../vendor/three.module.js";

// Trees between the camera and the ball gently shrink away so the golfer is never
// hidden behind a trunk or canopy. Visual only: collisions and replays are unchanged.
const CELL = 12;
const key = (x, z) => Math.floor(x / CELL) + ":" + Math.floor(z / CELL);

export function resetOccluders(world) {
  world.occluders = { sets: [], cells: new Map(), active: new Map() };
}

export function registerOccluders(world, mesh, places, height, radius) {
  world.occluders ??= { sets: [], cells: new Map(), active: new Map() };
  const set = { mesh, places, height, radius, index: world.occluders.sets.length };
  world.occluders.sets.push(set);
  places.forEach((p, i) => {
    const k = key(p.x, p.z);
    if (!world.occluders.cells.has(k)) world.occluders.cells.set(k, []);
    world.occluders.cells.get(k).push([set, i]);
  });
}

export function installOcclusion(world) {
  const dummy = new THREE.Object3D(),
    lastCam = new THREE.Vector3(Infinity, 0, 0),
    lastLook = new THREE.Vector3();
  let scan = 0,
    target = new Set();
  const write = (set, i, factor) => {
    const p = set.places[i];
    dummy.position.set(p.x, p.y, p.z);
    dummy.rotation.set(0, p.angle, 0);
    dummy.scale.set(p.scale * Math.max(0.001, factor), p.scale * Math.max(0.001, factor), p.scale * Math.max(0.001, factor));
    dummy.updateMatrix();
    set.mesh.setMatrixAt(i, dummy.matrix);
    set.mesh.instanceMatrix.needsUpdate = true;
  };
  const find = () => {
    const o = world.occluders,
      cam = world.camera.position,
      look = world.look,
      dx = look.x - cam.x,
      dz = look.z - cam.z,
      len2 = dx * dx + dz * dz || 1,
      found = new Set(),
      len = Math.sqrt(len2),
      minX = Math.min(cam.x, look.x) - 16,
      maxX = Math.max(cam.x, look.x) + 16,
      minZ = Math.min(cam.z, look.z) - 16,
      maxZ = Math.max(cam.z, look.z) + 16;
    if ((maxX - minX) * (maxZ - minZ) > 160000) return found;
    for (let cx = Math.floor(minX / CELL); cx <= Math.floor(maxX / CELL); cx++)
      for (let cz = Math.floor(minZ / CELL); cz <= Math.floor(maxZ / CELL); cz++)
        for (const [set, i] of o.cells.get(cx + ":" + cz) || []) {
          const p = set.places[i],
            t = Math.max(0, Math.min(1, ((p.x - cam.x) * dx + (p.z - cam.z) * dz) / len2)),
            hx = cam.x + dx * t - p.x,
            hz = cam.z + dz * t - p.z,
            reach = set.radius * p.scale * 0.8 + 0.9;
          // Trees hugging the camera fill the frame even when they are not on the sight line:
          // any tree right beside the camera, and a wider band just in front of it that stops well
          // short of the ball, so trees the shot could hit stay visible.
          const rx = p.x - cam.x,
            rz = p.z - cam.z,
            d = Math.hypot(rx, rz),
            crown = set.radius * p.scale,
            ahead = (rx * dx + rz * dz) / len,
            near = (d < crown + 3 || (d < crown + 8 && ahead > -crown && ahead < len * 0.7)) && cam.y < p.y + set.height * p.scale + 1;
          if (!near) {
            if (hx * hx + hz * hz > reach * reach || t > 0.93) continue;
            const lineY = cam.y + (look.y - cam.y) * t;
            if (p.y + set.height * p.scale < lineY - 0.4 || p.y > lineY + 1) continue;
          }
          found.add(set.index + ":" + i);
        }
    return found;
  };
  const restore = () => {
    for (const [id, state] of world.occluders?.active || []) write(state.set, state.i, 1);
    world.occluders?.active.clear();
    target = new Set();
  };
  const update = world.update.bind(world);
  world.update = (dt, ...args) => {
    const o = world.occluders;
    if (o?.sets.length && world.hole?.mode === "golf") {
      if (world.mode !== "play") {
        if (o.active.size) restore();
      } else {
        scan -= dt;
        if (scan <= 0 && (lastCam.distanceToSquared(world.camera.position) > 0.04 || lastLook.distanceToSquared(world.look) > 0.04)) {
          scan = 0.08;
          lastCam.copy(world.camera.position);
          lastLook.copy(world.look);
          target = find();
          for (const id of target)
            if (!o.active.has(id)) {
              const [s, i] = id.split(":").map(Number);
              o.active.set(id, { set: o.sets[s], i, factor: 1 });
            }
        }
        for (const [id, state] of o.active) {
          const goal = target.has(id) ? 0 : 1;
          state.factor += (goal - state.factor) * Math.min(1, dt * 10);
          if (goal === 1 && state.factor > 0.985) {
            write(state.set, state.i, 1);
            o.active.delete(id);
          } else write(state.set, state.i, state.factor);
        }
      }
    }
    update(dt, ...args);
  };
  const load = world.load.bind(world);
  world.load = (h) => {
    resetOccluders(world);
    target = new Set();
    lastCam.set(Infinity, 0, 0);
    load(h);
  };
}
