import * as THREE from '../vendor/three.module.js';
import { ShotPreview } from './shot-preview.js';
import { GOLF_RADIUS } from './golf-physics.js';

// The original complete physics preview: flight, bounce, roll and final landing.
// Keep its buffers and meshes for the life of the renderer instead of rebuilding
// a tube every time the aim changes.
export function createFullShotGuide(world) {
  const group = new THREE.Group();
  group.name = 'full-shot-path';
  group.visible = false;
  const capacity = 526;
  const positions = new THREE.BufferAttribute(new Float32Array(capacity * 3), 3).setUsage(THREE.DynamicDrawUsage);
  const geometry = new THREE.BufferGeometry().setAttribute('position', positions);
  geometry.setDrawRange(0, 0);
  const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({color:'#fff4c8', transparent:true, opacity:.65, depthWrite:false}));
  const stroke = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 5), new THREE.MeshBasicMaterial({color:'#fff9df', transparent:true, opacity:.82, depthWrite:false}), capacity - 1);
  const beads = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({color:'#fff8d9', transparent:true, opacity:.9, depthWrite:false}), 64);
  const landing = new THREE.Mesh(new THREE.RingGeometry(.82, 1, 48), new THREE.MeshBasicMaterial({color:'#f7cc66', side:THREE.DoubleSide, transparent:true, opacity:.85, depthWrite:false}));
  stroke.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  beads.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  stroke.count = beads.count = 0;
  landing.visible = false;
  landing.rotation.x = -Math.PI / 2;
  for (const mesh of [line, stroke, beads, landing]) { mesh.frustumCulled = false; group.add(mesh); }
  const dummy = new THREE.Object3D(), from = new THREE.Vector3(), to = new THREE.Vector3(), tangent = new THREE.Vector3(), unit = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  let cached = '', lastPreview = -Infinity;
  const preview = new ShotPreview((samples, job) => {
    if (!group.visible || world.hole !== job.hole) return;
    const count = Math.min(capacity, samples.length / 3 + 1), putting = job.options.club === 'putter';
    if (count < 2) return;
    const point = (i) => i === 0 ? job.ball : {x:samples[(i - 1) * 3], y:samples[(i - 1) * 3 + 1], z:samples[(i - 1) * 3 + 2]};
    for (let i = 0; i < count; i++) {
      const p = point(i), y = Math.max(p.y - GOLF_RADIUS, world.renderGround(p.x, p.z)) + .07;
      positions.setXYZ(i, p.x, y, p.z);
      if (i) {
        from.fromBufferAttribute(positions, i - 1); to.set(p.x, y, p.z); tangent.subVectors(to, from);
        dummy.position.copy(from).add(to).multiplyScalar(.5);
        dummy.quaternion.setFromUnitVectors(up, unit.copy(tangent).normalize());
        dummy.scale.set(.065, Math.max(.001, tangent.length()), .065);
        dummy.updateMatrix(); stroke.setMatrixAt(i - 1, dummy.matrix);
      }
    }
    positions.needsUpdate = true; geometry.setDrawRange(0, count);
    line.material.color.set(putting ? '#c9f1c6' : '#fff4c8');
    stroke.visible = !putting; stroke.count = count - 1; stroke.instanceMatrix.needsUpdate = true;
    beads.count = Math.min(64, count);
    for (let i = 0; i < beads.count; i++) {
      const index = Math.round(i * (count - 1) / (beads.count - 1));
      dummy.position.fromBufferAttribute(positions, index); dummy.quaternion.identity();
      dummy.scale.setScalar((putting ? .035 : .085) * (1 - i / beads.count * .35));
      dummy.updateMatrix(); beads.setMatrixAt(i, dummy.matrix);
    }
    beads.instanceMatrix.needsUpdate = true;
    to.fromBufferAttribute(positions, count - 1);
    landing.position.set(to.x, world.renderGround(to.x, to.z) + .035, to.z);
    landing.scale.setScalar(putting ? .24 : 1.25); landing.visible = true;
  });
  const reset = () => { cached = ''; lastPreview = -Infinity; preview.reset(); geometry.setDrawRange(0, 0); stroke.count = beads.count = 0; landing.visible = false; group.visible = false; };
  return {
    group, reset,
    setAim(ball, dir, power, visible) {
      if (!visible) { if (group.visible) reset(); return; }
      group.visible = true;
      const options = world.shotOptions || {club:world.activeClub};
      const key = [world.hole.seed,ball.x,ball.y,ball.z,dir.x,dir.z,power,options.club,options.shape,options.spin,options.gear?.driverYards].join(':');
      if (key === cached || world.clock - lastPreview < .08) return;
      cached = key; lastPreview = world.clock;
      preview.request(world.hole, ball, dir, power, options);
    },
  };
}
