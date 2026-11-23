import * as THREE from '../vendor/three.module.js';
import { nearestPoint } from './courses.js';
import { terrainAt } from './golf-courses.js';
import { nearbyTrees } from './forest.js';

const shirts = ['#bf624d', '#527d84', '#d6aa52', '#667e58', '#8b7290', '#7389a2'];
const skins = ['#c98f68', '#80533f', '#e6bc93', '#a16b4d'];
const hats = ['#f0e5cb', '#264c48', '#9d5146'];

// Work in tee-local coordinates so doglegs and rotated mini courses have a clear opening.
export function teeFanSpots(hole) {
  const mini = hole.mode !== 'golf', start = hole.start;
  const target = mini ? hole.samples[15] : { x: hole.points[1][0], z: hole.points[1][1] };
  const dx = target.x - start.x, dz = target.z - start.z, length = Math.hypot(dx, dz) || 1;
  const spots = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const along = mini ? i * 1.25 + .15 : 1.8 + i * 1.55;
      const offset = side * ((mini ? hole.width / 2 + 1 : 4.7) + (i % 2) * .5);
      const x = start.x + (dx * along - dz * offset) / length;
      const z = start.z + (dz * along + dx * offset) / length;
      if (mini) {
        // The minigolf base is an ellipse with a decorative pond off the ribbon.
        if (Math.hypot(x / 25, z / 21) > 1 || Math.hypot((x-9)/5.4, (z-9)/3.4) < 1 ||
            nearestPoint(hole, x, z).distance < hole.width / 2 + .45) continue;
      } else if (!hole.space && (terrainAt(hole, x, z).hazard ||
          nearbyTrees(hole, x, z).some(t => Math.hypot(x-t.x,z-t.z) < 1.2 * t.size))) continue;
      spots.push({x, z, angle: Math.atan2(start.x - x, start.z - z), variant: i + (side < 0 ? 3 : 0)});
    }
  }
  return spots;
}

export function addTeeFans(world, hole) {
  const spots = teeFanSpots(hole);
  if (!spots.length) return;
  const matrices = [], colors = [], pose = new THREE.Object3D(), part = new THREE.Object3D();
  for (const {x, z, angle, variant} of spots) {
    const seed = variant + (hole.index || 0) + (hole.courseIndex || 0);
    const shirt = shirts[seed % shirts.length], skin = skins[seed % skins.length];
    const cap = hats[seed % hats.length], trousers = seed % 2 ? '#494d55' : '#afa48a';
    pose.position.set(x, hole.mode === 'golf' ? world.surfaceHeight(x, z) : -.08, z);
    pose.scale.setScalar(.92 + (seed % 4) * .05);
    pose.rotation.y = angle;
    pose.updateMatrix();
    const box = (color, px, py, pz, width, height, depth, tilt = 0) => {
      part.position.set(px, py, pz);
      part.scale.set(width, height, depth);
      part.rotation.z = tilt;
      part.updateMatrix();
      matrices.push(new THREE.Matrix4().multiplyMatrices(pose.matrix, part.matrix));
      colors.push(color);
    };
    for (const side of [-1, 1]) {
      box(trousers, side*.118, .42, 0, .18, .72, .21);
      box('#f2e7d4', side*.118, .075, .045, .21, .15, .34);
      const wave = side === 1 && seed % 3 === 0;
      box(shirt, side*.275, 1.19, 0, .17, .24, .23, wave ? .7 : side*.12);
      box(skin, side*(wave ? .39 : .30), wave ? 1.38 : .98, .025, .13, .31, .14, wave ? -.32 : side*.12);
    }
    box(shirt, 0, 1.05, 0, .45, .55, .27);
    box(skin, 0, 1.52, .012, .30, .35, .29);
    box(cap, 0, 1.70, 0, .34, .10, .32);
    if (seed % 3 !== 1) box(cap, 0, 1.66, .17, .32, .045, .18);
    if (hole.space) box('#263f5e', 0, 1.53, .163, .31, .20, .045);
  }
  const fans = new THREE.InstancedMesh(world.geometries.box, world.mat('#ffffff'), matrices.length);
  fans.name = 'tee-fans';
  fans.castShadow = fans.receiveShadow = true;
  matrices.forEach((matrix, i) => {
    fans.setMatrixAt(i, matrix);
    fans.setColorAt(i, new THREE.Color(colors[i]));
  });
  world.group.add(fans);
}
