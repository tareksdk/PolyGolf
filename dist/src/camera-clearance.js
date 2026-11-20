import * as THREE from '../vendor/three.module.js';

// A small camera-only collision layer. The terrain is sampled analytically and
// solid prop bounds are indexed once when a course is loaded. Tree visibility is
// still owned by occlusion.js; a camera never raycasts the full rendered forest.
const CELL = 16;
const cellKey = (x, z) => (x + 4096) * 8192 + z + 4096;
const IGNORE_NAME = /terrain|turf|island-rock|distant-island|cloud|sky|water|grass|flower|bush|tree|pine|oak|willow|larch|vine|particle|trail/i;
const IGNORE_SHAPE = /Sphere|Icosahedron|Cone|Plane|Circle|Ring|Torus/;
const MARGIN = .32;
const AXES = ['x', 'y', 'z'];

export function createCameraClearance(world) {
  let group = null, stamp = 0;
  const cells = new Map(), solids = [], moving = [], candidates = [];
  const matrix = new THREE.Matrix4(), instance = new THREE.Matrix4(), bounds = new THREE.Box3();
  const size = new THREE.Vector3();

  const add = (box, mesh, dynamic = false) => {
    const record = { box: box.clone(), mesh, stamp: 0 };
    if (dynamic) { moving.push(record); return; }
    solids.push(record);
    for (let x = Math.floor((box.min.x - MARGIN) / CELL); x <= Math.floor((box.max.x + MARGIN) / CELL); x++)
      for (let z = Math.floor((box.min.z - MARGIN) / CELL); z <= Math.floor((box.max.z + MARGIN) / CELL); z++) {
        const key = cellKey(x, z);
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key).push(record);
      }
  };
  const useful = box => {
    box.getSize(size);
    // Flat fairway surfaces, fine planting and distant scenery do not obstruct
    // a camera. Bounding a whole mountain would also fill its playable tunnel.
    return size.y >= .38 && size.x >= .16 && size.z >= .16 &&
      size.x < 80 && size.z < 80 && size.y < 65 && size.x * size.z < 1800;
  };
  const rebuild = () => {
    group = world.group;
    cells.clear(); solids.length = moving.length = 0;
    if (!group?.traverse) return;
    group.updateMatrixWorld(true);
    const trees = new Set((world.occluders?.sets || []).map(set => set.mesh));
    const dynamic = new Set(world.obstacleMeshes || []);
    const animated = new Set((world.animations || []).map(a => a.mesh));
    group.traverse(mesh => {
      if (!mesh.isMesh || trees.has(mesh) || IGNORE_NAME.test(mesh.name) ||
          IGNORE_SHAPE.test(mesh.geometry?.type || '')) return;
      let parent = mesh;
      while (parent && parent !== group) {
        if (!parent.visible || animated.has(parent) || parent.userData.dynamic || parent.userData.courseDynamic ||
            parent === world.pirateShipMesh || IGNORE_NAME.test(parent.name)) return;
        parent = parent.parent;
      }
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      if (materials.every(material => material?.transparent || material?.opacity < .8)) return;
      const geometry = mesh.geometry;
      if (!geometry.boundingBox) geometry.computeBoundingBox();
      if (!geometry.boundingBox || geometry.boundingBox.isEmpty()) return;
      if (mesh.isInstancedMesh) {
        for (let i = 0; i < mesh.count; i++) {
          mesh.getMatrixAt(i, instance);
          matrix.multiplyMatrices(mesh.matrixWorld, instance);
          bounds.copy(geometry.boundingBox).applyMatrix4(matrix);
          if (useful(bounds)) add(bounds, mesh);
        }
      } else {
        bounds.copy(geometry.boundingBox).applyMatrix4(mesh.matrixWorld);
        if (useful(bounds)) add(bounds, mesh, dynamic.has(mesh));
      }
    });
  };
  const visible = mesh => {
    for (let parent = mesh; parent; parent = parent.parent) {
      if (!parent.visible) return false;
      if (parent === group) return true;
    }
    return false;
  };
  const gather = (focus, position) => {
    candidates.length = 0; stamp++;
    const minX = Math.floor((Math.min(focus.x, position.x) - MARGIN) / CELL);
    const maxX = Math.floor((Math.max(focus.x, position.x) + MARGIN) / CELL);
    const minZ = Math.floor((Math.min(focus.z, position.z) - MARGIN) / CELL);
    const maxZ = Math.floor((Math.max(focus.z, position.z) + MARGIN) / CELL);
    if ((maxX - minX + 1) * (maxZ - minZ + 1) > 512) {
      for (const record of solids) candidates.push(record);
    } else for (let x = minX; x <= maxX; x++) for (let z = minZ; z <= maxZ; z++) {
      const records = cells.get(cellKey(x, z));
      if (!records) continue;
      for (const record of records) if (record.stamp !== stamp) {
        record.stamp = stamp; candidates.push(record);
      }
    }
    for (const record of moving) {
      record.mesh.updateWorldMatrix(true, false);
      record.box.copy(record.mesh.geometry.boundingBox).applyMatrix4(record.mesh.matrixWorld);
      candidates.push(record);
    }
  };
  const hit = (a, b, box) => {
    let lo = 0, hi = 1, inside = true;
    for (const axis of AXES) {
      const min = box.min[axis] - MARGIN, max = box.max[axis] + MARGIN;
      if (a[axis] < min || a[axis] > max) inside = false;
      const delta = b[axis] - a[axis];
      if (Math.abs(delta) < 1e-8) { if (a[axis] < min || a[axis] > max) return 2; }
      else {
        const t1 = (min - a[axis]) / delta, t2 = (max - a[axis]) / delta;
        lo = Math.max(lo, Math.min(t1, t2)); hi = Math.min(hi, Math.max(t1, t2));
        if (lo > hi) return 2;
      }
    }
    // Conservative bounds may enclose the open centre of a gazebo/arch. Never
    // force the camera to zero distance when its subject is in that open space.
    return inside ? 2 : lo;
  };
  const ground = (x, z) => {
    // The render heightfield is an O(1) mesh lookup on regular golf courses;
    // avoid renderGround's full physics surface/normal query for each sample.
    const value = world.hole?.mode === 'golf' && world.surfaceHeight
      ? world.surfaceHeight(x, z) + .006
      : world.renderGround?.(x, z);
    return Number.isFinite(value) ? value : -Infinity;
  };
  const clearTerrain = (focus, position) => {
    const floor = ground(position.x, position.z);
    position.y = Math.max(position.y, floor + (world.hole?.mode === 'golf' ? 1.4 : 1));
    const dx = position.x - focus.x, dz = position.z - focus.z;
    // Fixed work regardless of terrain detail or speed. A higher camera clears
    // a ridge naturally without rotating the player's selected viewing angle.
    for (let i = 1; i <= 12; i++) {
      const t = i / 12, y = ground(focus.x + dx * t, focus.z + dz * t);
      position.y = Math.max(position.y, focus.y + (y + .08 + .24 * t - focus.y) / t);
    }
  };
  return {
    ground(x, z) {
      const y = ground(x, z);
      return Number.isFinite(y) ? y : 0;
    },
    reset() { group = null; },
    resolve(focus, position) {
      if (!focus || !position || !Number.isFinite(focus.x + focus.y + focus.z + position.x + position.y + position.z)) return position;
      if (group !== world.group) rebuild();
      clearTerrain(focus, position);
      gather(focus, position);
      // Usually one pass. A second handles a low wall lifted into an overhang.
      for (let pass = 0; pass < 2; pass++) {
        let closest = null, entry = 2;
        for (const record of candidates) {
          if (!visible(record.mesh)) continue;
          const t = hit(focus, position, record.box);
          if (t < entry) { entry = t; closest = record.box; }
        }
        if (!closest || entry > 1) break;
        const distance = Math.hypot(position.x - focus.x, position.y - focus.y, position.z - focus.z);
        const lift = focus.y + (closest.max.y + MARGIN + .18 - focus.y) / Math.max(.06, entry);
        // Rise over rails and low walls; an overhead roof or tall structure
        // instead shortens the boom so the camera stays on the subject's side.
        if (pass === 0 && closest.min.y <= focus.y + .5 && lift - position.y < Math.min(8, distance * .55)) {
          position.y = Math.max(position.y, lift);
        } else {
          const t = Math.max(0, entry - .15 / Math.max(1, distance));
          position.x = focus.x + (position.x - focus.x) * t;
          position.y = focus.y + (position.y - focus.y) * t;
          position.z = focus.z + (position.z - focus.z) * t;
          clearTerrain(focus, position);
        }
      }
      return position;
    },
  };
}
