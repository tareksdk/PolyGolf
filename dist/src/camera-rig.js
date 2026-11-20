import * as THREE from '../vendor/three.module.js';
import { createCameraClearance } from './camera-clearance.js';

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const angleDelta = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

// Exact critically damped spring. targetVelocity describes the movement ending
// at target this frame, so constant-speed travel has no trailing position error.
export function spring(state, target, frequency, dt, targetVelocity = 0) {
  const error = state.value - target + targetVelocity * dt;
  const relative = state.velocity - targetVelocity;
  const impulse = relative + frequency * error;
  const decay = Math.exp(-frequency * dt);
  state.value = target + (error + impulse * dt) * decay;
  state.velocity = targetVelocity + (relative - frequency * impulse * dt) * decay;
  return state.value;
}
const axis = (value = 0) => ({ value, velocity: 0 });

// One rig owns shot framing. It only observes physics; aiming, replay and ball
// simulation never depend on its output. All scratch vectors live with the rig.
export class CameraRig {
  constructor(world) {
    this.world = world;
    this.anchor = new THREE.Vector3();
    this.lastBall = new THREE.Vector3();
    this.shotOrigin = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.focus = new THREE.Vector3();
    this.candidate = new THREE.Vector3();
    this.offset = new THREE.Vector3();
    this.ideal = new THREE.Vector3();
    this.collision = [axis(), axis(), axis()];
    this.projected = new THREE.Vector3();
    this.subject = new THREE.Vector3();
    this.axes = [axis(), axis(), axis()];
    this.angle = axis();
    this.distance = axis();
    this.height = axis();
    this.fov = axis(45);
    this.blend = axis();
    this.clearance = createCameraClearance(world);
    this.reset();
  }
  get manualActive() { return this.manualTimer > 0; }
  get isCinematic() { return this.state !== 'follow' && !this.skipped && this.manualTimer <= 0; }
  reset(ball, { cut = false, skipCurrentShot = false } = {}) {
    this.state = 'follow';
    this.stateAge = this.shotAge = this.airTime = this.groundTime = this.stillTime = 0;
    this.manualTimer = 0;
    this.skipped = skipCurrentShot;
    this.ignoreHold = skipCurrentShot;
    this.wasActive = skipCurrentShot;
    this.wasSunk = false;
    this.finishAge = 0;
    this.safetyMix = 0;
    this.velocity.set(0, 0, 0);
    // Respawns preserve both the current boom and look anchor. Only a new-hole
    // cut initializes at the new ball; resetting just position would whip the
    // look direction around while the camera was still at the old location.
    this.initialized = !cut && !!this.initialized;
    this.recoveryTime = this.initialized ? 1.15 : 0;
    for (const a of [...this.axes, this.angle, this.distance, this.height, this.fov]) a.velocity = 0;
    this.cut = cut;
    if (cut) for (const a of this.collision) { a.value = 0; a.velocity = 0; }
    if (ball) this.lastBall.set(ball.x, ball.y, ball.z);
    this.clearance.reset?.();
  }
  beginShot(ball) {
    this.shotOrigin.set(ball.x, ball.y, ball.z);
    this.shotAge = this.airTime = this.groundTime = this.stillTime = this.stateAge = 0;
    this.skipped = false;
    this.ignoreHold = false;
    this.wasActive = true;
    this.wasSunk = false;
    this.state = 'follow';
    this.shotHeading = Math.hypot(ball.vx, ball.vz) > .1 ? Math.atan2(-ball.vx, -ball.vz) : this.world.orbit;
  }
  manualInput() {
    // Hand over the actual broadcast bearing, not the old preparation bearing.
    if (this.manualTimer <= 0 && this.blend.value > .08) {
      this.world.orbit = this.angle.value;
      this.world.pitch = clamp(this.height.value / Math.max(1, this.distance.value), .16, 1.2);
    }
    this.manualTimer = 2.6;
    this.ignoreHold = true;
    this.state = 'follow';
  }
  enableCinematic() { this.skipped = false; }
  skip() {
    this.skipped = true;
    this.ignoreHold = true;
    this.state = 'follow';
    this.manualTimer = 0;
  }
  selectShot(dt, ball, physics, height, speed, enabled) {
    this.stateAge += dt;
    if (physics.sunk && !this.wasSunk) {
      this.finishAge = 0;
      if (enabled) { this.state = 'finish'; this.stateAge = 0; this.finishAngle = this.angle.value; }
    }
    this.wasSunk = !!physics.sunk;
    if (this.state === 'finish') {
      this.finishAge += dt;
      if (!enabled || this.finishAge > 1.15) this.state = 'follow';
      return;
    }
    if (!enabled) { this.state = 'follow'; return; }
    const golf = this.world.hole.mode === 'golf';
    const air = height > (golf ? 1.2 : .55) && (physics.airborne !== false || !golf);
    this.airTime = air ? this.airTime + dt : 0;
    this.groundTime = air ? 0 : this.groundTime + dt;
    this.stillTime = speed < (golf ? 3 : 2) ? this.stillTime + dt : 0;
    if (!physics.active || this.stillTime > .35) { this.state = 'follow'; return; }
    this.shotAge += dt;
    const travel = this.shotOrigin.distanceTo(this.lastBall.set(ball.x, ball.y, ball.z));
    let next = this.state;
    if (this.state === 'follow' && speed > (golf ? 8 : 6) && this.shotAge > .12) next = 'chase';
    if (this.airTime > .22 && height > (golf ? 2.5 : .8)) next = 'airborne';
    if (this.airTime > .8 && travel > (golf ? 70 : 16) && height > (golf ? 7 : 1)) next = 'wide';
    // Once wide, retain the angle across the apex and small landing bounces.
    if (this.state === 'wide' && this.groundTime < .65) next = 'wide';
    if (this.groundTime > .65 && speed > (golf ? 5 : 3)) next = 'chase';
    if (next !== this.state && (this.state === 'follow' || this.stateAge > 1.25)) {
      this.state = next;
      this.stateAge = 0;
    }
  }
  update(dt, ball, physics = {}) {
    const w = this.world;
    if (w.presentationPaused && this.initialized) return;
    dt = clamp(Number.isFinite(dt) ? dt : 0, 0, .1);
    if (!dt || !ball || !Number.isFinite(ball.x + ball.y + ball.z)) return;
    const golf = w.hole.mode === 'golf';
    const baseFov = w.hole.space ? 43 : golf ? 45 : 39;
    const hold = !this.ignoreHold && w.cameraHold;
    const subject = hold || ball;
    const active = !!physics.active && !hold;
    if (physics.active && !this.wasActive) this.beginShot(ball);
    this.wasActive = !!physics.active;
    this.manualTimer = Math.max(0, this.manualTimer - dt);
    this.recoveryTime = Math.max(0, this.recoveryTime - dt);
    const rawSpeed = active ? Math.hypot(ball.vx || 0, ball.vz || 0) : 0;
    const filter = 1 - Math.exp(-dt * 7);
    this.velocity.x += ((active ? ball.vx || 0 : 0) - this.velocity.x) * filter;
    this.velocity.y += ((active ? ball.vy || 0 : 0) - this.velocity.y) * filter;
    this.velocity.z += ((active ? ball.vz || 0 : 0) - this.velocity.z) * filter;
    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    const sampledGround = this.clearance.ground?.(ball.x, ball.z);
    const ground = Number.isFinite(sampledGround) ? sampledGround : ball.y;
    const altitude = Math.max(0, ball.y - ground - (golf ? .022 : .24));
    const enabled = !!w.settings?.cinematicCamera && !w.settings?.reducedMotion && !this.skipped && this.manualTimer <= 0 && !hold;
    if (!this.initialized) {
      this.anchor.set(subject.x, subject.y, subject.z);
      this.axes.forEach((a, i) => { a.value = this.anchor.getComponent(i); a.velocity = 0; });
      this.offset.copy(w.camera.position).sub(this.anchor);
      this.angle.value = this.cut ? w.orbit : Math.atan2(this.offset.x, this.offset.z);
      this.distance.value = this.cut ? w.zoom : Math.max(2, Math.hypot(this.offset.x, this.offset.z));
      this.height.value = this.cut ? Math.max(2.5, w.zoom * (golf ? w.pitch || .24 : .83)) : this.offset.y;
      this.fov.value = w.camera.fov;
      for (const a of [this.angle, this.distance, this.height, this.fov, this.blend]) a.velocity = 0;
      this.blend.value = 0;
      this.initialized = true;
      this.shotOrigin.set(ball.x, ball.y, ball.z);
    }
    this.selectShot(dt, ball, physics, altitude, rawSpeed, enabled);
    const cinematic = this.isCinematic && enabled;
    const blend = spring(this.blend, cinematic ? 1 : 0, cinematic ? 4.5 : 9, dt);
    const manual = this.manualTimer > 0;
    const motion = w.settings?.reducedMotion ? .55 : 1;
    const leadTime = hold || !active ? 0 : (golf ? .11 : .14) * motion;
    const lead = Math.min(golf ? 6 : 2.5, speed * leadTime);
    const nx = speed > .1 ? this.velocity.x / speed : 0;
    const nz = speed > .1 ? this.velocity.z / speed : 0;
    this.focus.set(subject.x + nx * lead, subject.y, subject.z + nz * lead);
    // A tiny world-space dead zone suppresses resting-ball and low bounce noise.
    const quiet = !active && !hold && this.anchor.distanceToSquared(this.focus) < (golf ? .0004 : .0025);
    const rate = manual ? 12 : active ? 10 : 7;
    if (!quiet) {
      for (let i = 0; i < 3; i++) {
        const feed = active ? this.velocity.getComponent(i) : 0;
        this.anchor.setComponent(i, spring(this.axes[i], this.focus.getComponent(i), i === 1 ? 8 : rate, dt, feed));
      }
    } else for (const a of this.axes) a.velocity = 0;
    // Ground clearance and visibility are shared by every perspective.
    const aspect = w.camera.aspect || 1.6;
    const portrait = clamp(Math.sqrt(1.15 / aspect), 1, 1.55);
    const speedZoom = Math.min(golf ? 17 : 6, speed * (golf ? .24 : .24)) * motion;
    const flightZoom = Math.min(golf ? 14 : 4, altitude * .19) * motion;
    let distance = (w.zoom + (manual ? .25 : 1) * (speedZoom + flightZoom)) * portrait;
    let elevation = golf ? Math.max(2.5, distance * (w.pitch || .24)) : distance * .83;
    const lavaImpact = hold && w.waterMoment?.kind === 'lava';
    if (lavaImpact) {
      distance = clamp(w.zoom, 22, 36) * portrait;
      elevation = distance * .9;
    }
    let bearing = w.orbit;
    let targetFov = baseFov + Math.min(3, speed * .06) * motion;
    if (blend > .001) {
      let cineDistance = distance, cineHeight = elevation, cineAngle = this.shotHeading ?? w.orbit;
      let cineFov = golf ? 49 : 44;
      if (this.state === 'finish') {
        cineDistance = (golf ? 7 : 9) * portrait;
        cineHeight = golf ? 3.3 : 6;
        cineAngle = (this.finishAngle ?? this.angle.value) + Math.min(1, this.finishAge) * .16;
        cineFov = golf ? 42 : 39;
      } else if (this.state === 'wide') {
        cineDistance = Math.max(distance, (golf ? 38 : 23) + altitude * .35) * portrait;
        cineHeight = cineDistance * .55;
        cineAngle += .48;
        cineFov = 53;
      } else if (this.state === 'airborne') {
        cineDistance = Math.max(distance, (golf ? 23 : 15) + altitude * .23) * portrait;
        cineHeight = cineDistance * .40;
        cineAngle += .26;
      } else if (this.state === 'chase') {
        cineDistance = Math.max(w.zoom * .82, (golf ? 10 : 10) + speed * .20) * portrait;
        cineHeight = Math.max(golf ? 3 : 4, cineDistance * (golf ? .23 : .42));
        // Heading follows broad changes slowly; ricochets never flip the camera.
        if (rawSpeed > 3 && this.groundTime > .25) {
          const next = Math.atan2(-this.velocity.x, -this.velocity.z);
          this.shotHeading += clamp(angleDelta(this.shotHeading, next), -.35 * dt, .35 * dt);
        }
      }
      // Keep the outgoing shot's pose during its blend back to preparation.
      if (cinematic) {
        this.cineDistance = cineDistance; this.cineHeight = cineHeight; this.cineAngle = cineAngle; this.cineFov = cineFov;
      }
      distance += ((this.cineDistance ?? distance) - distance) * blend;
      elevation += ((this.cineHeight ?? elevation) - elevation) * blend;
      bearing += angleDelta(bearing, this.cineAngle ?? bearing) * blend;
      targetFov += ((this.cineFov ?? targetFov) - targetFov) * blend;
    }
    const angleGoal = this.angle.value + angleDelta(this.angle.value, bearing);
    spring(this.angle, angleGoal, manual ? 18 : 5, dt);
    spring(this.distance, distance, manual ? 14 : 4.5, dt);
    spring(this.height, elevation, manual ? 14 : 4, dt);
    spring(this.fov, targetFov, 4, dt);
    const sin = Math.sin(this.angle.value), cos = Math.cos(this.angle.value);
    this.candidate.set(this.anchor.x + sin * this.distance.value, this.anchor.y + this.height.value, this.anchor.z + cos * this.distance.value);
    // The look point favors the course in preparation, then centers the action.
    const lookAhead = golf && !lavaImpact ? Math.min(5, this.distance.value * .16) * (1 - blend * .75) : 0;
    w.look.set(this.anchor.x - sin * lookAhead, this.anchor.y, this.anchor.z - cos * lookAhead);
    if (this.recoveryTime > 0) this.focus.copy(this.anchor);
    else this.focus.set(subject.x, subject.y + (golf ? .15 : .25), subject.z);
    this.ideal.copy(this.candidate);
    this.clearance.resolve(this.focus, this.candidate, dt);
    for (let i = 0; i < 3; i++) {
      const correction = this.candidate.getComponent(i) - this.ideal.getComponent(i);
      spring(this.collision[i], correction, 5, dt);
      this.candidate.setComponent(i, this.ideal.getComponent(i) + this.collision[i].value);
    }
    // Contact is immediate for safety; returning to the unobstructed boom is
    // damped, so clearing the edge of a wall never pops back to full distance.
    this.clearance.resolve(this.focus, this.candidate, dt);
    for (let i = 0; i < 3; i++) this.collision[i].value = this.candidate.getComponent(i) - this.ideal.getComponent(i);
    w.camera.position.copy(this.candidate);
    this.subject.set(subject.x, subject.y, subject.z);
    if (this.recoveryTime <= 0) {
      const room = this.candidate.distanceTo(this.subject);
      // Prediction is useful in open space but can hide a ball when a wall
      // compresses the boom. Tight views frame the ball itself, not its lead.
      const center = 1 - clamp((room - 2) / 8, 0, 1);
      if (center > 0) w.look.lerp(this.subject, center);
    }
    // Keep the last framing correction while it eases away. A one-frame lerp
    // from the uncorrected look would never converge beside a close obstacle.
    this.safetyMix *= Math.exp(-dt * 3);
    if (this.recoveryTime <= 0) w.look.lerp(this.subject, this.safetyMix);
    w.camera.lookAt(w.look);
    if (Math.abs(w.camera.fov - this.fov.value) > .01) {
      w.camera.fov = this.fov.value;
      w.camera.updateProjectionMatrix();
    }
    w.camera.updateMatrixWorld();
    if (this.recoveryTime <= 0) {
      // Bounded, allocation-free correction protects portrait screens and fast
      // wall rebounds. It only engages outside the comfortable central frame.
      for (let i = 0; i < 5; i++) {
        this.projected.copy(this.subject).project(w.camera);
        if (Math.abs(this.projected.x) <= .68 && Math.abs(this.projected.y) <= .64 && this.projected.z < 1) break;
        const correction = i === 4 ? 1 : .5;
        w.look.lerp(this.subject, correction);
        this.safetyMix += (1 - this.safetyMix) * correction;
        w.camera.lookAt(w.look);
        w.camera.updateMatrixWorld();
      }
    }
    w.cameraTarget?.copy(w.look);
    w.cameraPosition?.copy(w.camera.position);
  }
}
