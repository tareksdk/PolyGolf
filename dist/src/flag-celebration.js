import * as THREE from '../vendor/three.module.js';
import { israelTexture } from './israel-flag.js';
import { SUPREME_BALL } from './supreme-ball.js';

export const FLAG_CELEBRATION_SECONDS = 3.6;

export class FlagCelebration {
  constructor(world) {
    this.world = world;
    this.root = new THREE.Group();
    this.root.name = 'israel-cup-celebration';
    this.root.visible = false;
    world.scene.add(this.root);
    const material = (color, extra = {}) => new THREE.MeshBasicMaterial({color, toneMapped:false, ...extra});
    this.pole = new THREE.Mesh(new THREE.CylinderGeometry(.025, .035, 3.3, 12), material('#c9d5e7'));
    this.pole.position.set(-1.3, 1.65, 0);
    this.root.add(this.pole);
    const finial = new THREE.Mesh(new THREE.SphereGeometry(.065, 12, 8), material('#f8d68a'));
    finial.position.set(-1.3, 3.33, 0); this.root.add(finial);
    this.flag = new THREE.Mesh(new THREE.PlaneGeometry(2.64, 1.92, 32, 20), material('#ffffff', {
      map:israelTexture(), side:THREE.DoubleSide,
    }));
    this.flag.position.set(.04, 2.29, 0);
    this.root.add(this.flag);
    this.base = this.flag.geometry.attributes.position.array.slice();
    this.ring = new THREE.Mesh(new THREE.RingGeometry(.9, 1, 64), material('#bedbff', {
      side:THREE.DoubleSide, transparent:true, opacity:.6, depthWrite:false,
    }));
    this.ring.rotation.x = -Math.PI / 2; this.ring.position.y = .03;
    this.root.add(this.ring);
    // One pooled draw for the entire firework show, including the spark trails.
    this.sparks = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 5, 4), material('#ffffff', {
      transparent:true, opacity:1, depthWrite:false,
    }), 720);
    this.sparks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.sparks.frustumCulled = false; this.sparks.count = 0;
    this.root.add(this.sparks);
    this.dummy = new THREE.Object3D();
    this.particles = [];
  }
  reset() {
    for (const [mesh, visible] of this.hiddenPin || []) mesh.visible = visible;
    this.hiddenPin = [];
    this.root.visible = false;
    this.moment = null;
    this.sparks.count = 0;
    this.particles.length = 0;
    this.world.flagMoment = null;
  }
  start(cup) {
    this.reset();
    if (this.world.equipment?.ball !== SUPREME_BALL.id) return false;
    const w = this.world;
    this.hiddenPin = [w.flag, w.flagPole].filter(Boolean).map(mesh => [mesh, mesh.visible]);
    for (const [mesh] of this.hiddenPin) mesh.visible = false;
    this.moment = {age:0, duration:FLAG_CELEBRATION_SECONDS, reduced:!!w.settings?.reducedMotion};
    w.flagMoment = this.moment;
    this.root.position.set(cup.x, w.renderGround(cup.x, cup.z) + .06, cup.z);
    // Keep the flag legible at the current mini/full-golf camera distance.
    this.scale = Math.max(.65, Math.min(2.8, (w.zoom || 20) * .065));
    this.root.visible = true;
    const bursts = this.moment.reduced ? 1 : w.settings?.graphics === 'low' ? 3 : 5;
    const count = w.settings?.particles === false ? 0 : this.moment.reduced ? 18 : 42;
    for (let b = 0; b < bursts; b++) for (let i = 0; i < count; i++) {
      const a = i * 2.399963, ny = 1 - 2 * (i + .5) / count, r = Math.sqrt(1 - ny * ny);
      this.particles.push({
        x:Math.sin(b * 2.4) * 2.15, y:3.1 + (b % 2) * 1.3, z:Math.cos(b * 2.4) * .65,
        vx:Math.cos(a) * r * 2.5, vy:ny * 2.5 + .6, vz:Math.sin(a) * r * 1.5,
        delay:.15 + b * .4, life:1.15 + (i % 4) * .12, color:new THREE.Color(['#2877ff','#ffffff','#ffd781'][i % 3]),
      });
    }
    this.update(0);
    return true;
  }
  update(dt) {
    if (!this.moment) return;
    const w = this.world;
    if (w.mode !== 'play') { this.reset(); return; }
    if (w.suspended || w.presentationPaused) return;
    const m = this.moment;
    m.age += dt;
    if (m.age > FLAG_CELEBRATION_SECONDS) { this.reset(); return; }
    const fade = Math.min(1, m.age / .2);
    this.root.scale.setScalar(this.scale * (m.reduced ? 1 : .85 + .15 * fade));
    this.root.rotation.y = Math.atan2(w.camera.position.x - this.root.position.x, w.camera.position.z - this.root.position.z);
    const positions = this.flag.geometry.attributes.position;
    if (!m.reduced) {
      for (let i = 0; i < positions.count; i++) {
        const x = this.base[i * 3], y = this.base[i * 3 + 1], edge = (x + 1.32) / 2.64;
        positions.setZ(i, Math.sin(edge * 7 - m.age * 5 + y * 1.3) * .14 * edge);
      }
      positions.needsUpdate = true;
    }
    this.ring.scale.setScalar(1 + (m.reduced ? .2 : m.age * .65));
    this.ring.material.opacity = Math.max(0, .65 - m.age * .18);
    this.sparks.material.opacity = Math.min(1, (FLAG_CELEBRATION_SECONDS - m.age) * 2);
    let n = 0;
    for (const p of this.particles) {
      const age = m.age - p.delay;
      if (age < 0 || age > p.life) continue;
      for (let trail = 0; trail < 3; trail++) {
        const t = Math.max(0, age - trail * .035), size = (.045 - trail * .012) * (1 - age / p.life);
        this.dummy.position.set(p.x + p.vx * t, p.y + p.vy * t - 1.3 * t * t, p.z + p.vz * t);
        this.dummy.scale.setScalar(Math.max(.001, size)); this.dummy.updateMatrix();
        this.sparks.setMatrixAt(n, this.dummy.matrix);
        this.sparks.setColorAt(n++, p.color);
      }
    }
    this.sparks.count = n;
    this.sparks.instanceMatrix.needsUpdate = true;
    if (this.sparks.instanceColor) this.sparks.instanceColor.needsUpdate = true;
  }
}

export function installFlagCelebration(world) {
  const effect = new FlagCelebration(world);
  const celebrate = world.celebrate?.bind(world), load = world.load.bind(world), update = world.update.bind(world);
  world.flagCelebration = effect;
  world.celebrate = (cup, color, sunk = true) => {
    const duration = celebrate?.(cup, color) || 1.15;
    return sunk && effect.start(cup) ? Math.max(duration, FLAG_CELEBRATION_SECONDS) : duration;
  };
  world.load = (...args) => { effect.reset(); return load(...args); };
  world.update = (dt, ...args) => { effect.update(dt); return update(dt, ...args); };
}
