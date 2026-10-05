import { cupCapture } from "./cup-capture.js";
import { heightAt, nearestPoint, surfaceAt } from "./courses.js";
export const BALL_RADIUS = 0.24;
export const FIXED_STEP = 1 / 120;
// Fixed-step arcade solver. Static geometry and surface sampling are deterministic.
export class PhysicsManager {
  constructor() {
    this.active = false;
    this.events = [];
    this.time = 0;
  }
  load(hole) {
    this.hole = hole;
    this.time = 0;
    this.lastSafe = { x: hole.start.x, z: hole.start.z };
    this.reset();
  }
  reset() {
    const p = nearestPoint(this.hole, this.lastSafe.x, this.lastSafe.z);
    this.ball = {
      x: this.lastSafe.x,
      z: this.lastSafe.z,
      y: heightAt(this.hole, p.t) + BALL_RADIUS,
      vx: 0,
      vz: 0,
      vy: 0,
    };
    this.previous = { ...this.ball };
    this.active = false;
    this.rest = 0;
    this.padCooldown = 0;
    this.sunk = false;
    this.events = [];
  }
  shoot(dx, dz, power, options = {}) {
    if (this.active || this.sunk || ![dx, dz, power, options.shape ?? 0].every(Number.isFinite) || power <= 0)
      return false;
    const len = Math.hypot(dx, dz);
    if (len < 0.01) return false;
    this.lastSafe = { x: this.ball.x, z: this.ball.z };
    this.gear = options.gear || { power: 1, friction: 1, curve: 0 };
    this.curve = (options.shape || 0) * this.gear.curve;
    const v = (0.15 + Math.max(0, Math.min(1, power)) * 19.2) * this.gear.power;
    this.ball.vx = (dx / len) * v;
    this.ball.vz = (dz / len) * v;
    this.active = true;
    this.rest = 0;
    return true;
  }
  obstacles() {
    return [...(this.hole.ob || []), ...(this.hole.moving || []).map((o) => ({ ...o, moving: true }))].map(
      (o) => {
        const i = Math.round(o.t * (this.hole.samples.length - 1)),
          p = this.hole.samples[i],
          q = this.hole.samples[Math.min(i + 1, this.hole.samples.length - 1)],
          a = Math.atan2(q.z - p.z, q.x - p.x);
        const shift = o.moving ? Math.sin(this.time * o.speed) * this.hole.width * 0.31 : 0;
        return {
          ...o,
          x: p.x - Math.sin(a) * shift,
          z: p.z + Math.cos(a) * shift,
          y: heightAt(this.hole, p.t),
        };
      },
    );
  }
  update(dt) {
    this.time += dt;
    this.previous = { ...this.ball };
    if (!this.active) return;
    const b = this.ball,
      h = this.hole;
    this.padCooldown = Math.max(0, this.padCooldown - dt);
    const near = nearestPoint(h, b.x, b.z),
      ground = heightAt(h, near.t),
      surface = surfaceAt(h, near.t),
      speed = Math.hypot(b.vx, b.vz);
    const grounded = b.y <= ground + BALL_RADIUS + 0.035 && b.vy <= 0;
    if (grounded) {
      b.y = ground + BALL_RADIUS;
      b.vy = 0;
      const friction = { grass: 3.05, sand: 8.8, ice: 0.78, mud: 6.8, boost: 1.3, jump: 2.6 }[surface];
      const next = Math.max(0, speed - friction * (this.gear?.friction || 1) * dt);
      if (speed) {
        b.vx *= next / speed;
        b.vz *= next / speed;
      }
      const before = heightAt(h, Math.max(0, near.t - 0.006)),
        after = heightAt(h, Math.min(1, near.t + 0.006));
      if (Math.abs(after - before) > 0.005) {
        const i = Math.round(near.t * (h.samples.length - 1)),
          p = h.samples[Math.max(0, i - 1)],
          q = h.samples[Math.min(h.samples.length - 1, i + 1)],
          len = Math.hypot(q.x - p.x, q.z - p.z);
        const force = (-9.8 * (after - before)) / Math.max(0.25, len);
        b.vx += ((force * (q.x - p.x)) / len) * dt;
        b.vz += ((force * (q.z - p.z)) / len) * dt;
      }
      if (this.padCooldown <= 0 && speed > 0.6) {
        if (surface === "jump") {
          b.vy = 5.4;
          this.padCooldown = 1;
          this.events.push("jump");
        }
        if (surface === "boost") {
          const boost = Math.min(1.18, 21 / Math.max(1, Math.hypot(b.vx, b.vz)));
          b.vx *= boost;
          b.vz *= boost;
          this.padCooldown = 1.8;
          this.events.push("boost");
        }
      }
    } else b.vy -= 12 * dt;
    if (h.wind && (!grounded || speed > 0.4)) {
      b.vx += h.wind.x * dt * 0.45;
      b.vz += h.wind.z * dt * 0.45;
    }
    if (this.curve) {
      const a = this.curve * dt * 0.6,
        c = Math.cos(a),
        s = Math.sin(a),
        vx = b.vx;
      b.vx = vx * c - b.vz * s;
      b.vz = vx * s + b.vz * c;
      this.curve *= Math.exp(-dt * 0.9);
    }
    b.x += b.vx * dt;
    b.z += b.vz * dt;
    b.y += b.vy * dt;
    const n = nearestPoint(h, b.x, b.z),
      floor = heightAt(h, n.t);
    const onBridge = h.bridge && n.t > h.bridge[0] && n.t < h.bridge[1];
    const shortcut = h.shortcut && Math.abs(b.z - 8) < 1.55 && Math.abs(b.x) < 10.2;
    if (onBridge && n.distance > h.width * 0.24 && b.y < 0.55) {
      this.events.push("water");
      this.active = false;
      return;
    }
    const limit = h.width / 2 - BALL_RADIUS;
    if (n.distance > limit && !shortcut && b.y < floor + 1) {
      const nx = (b.x - n.x) / n.distance,
        nz = (b.z - n.z) / n.distance;
      b.x = n.x + nx * limit;
      b.z = n.z + nz * limit;
      const dot = b.vx * nx + b.vz * nz;
      if (dot > 0) {
        b.vx = (b.vx - 1.42 * dot * nx) * 0.97;
        b.vz = (b.vz - 1.42 * dot * nz) * 0.97;
        if (speed > 1.2) this.events.push("bounce");
      }
    }
    for (const o of this.obstacles()) {
      const dx = b.x - o.x,
        dz = b.z - o.z,
        d = Math.hypot(dx, dz),
        r = o.r + BALL_RADIUS;
      if (d < r && b.y < o.y + 1.3) {
        const nx = dx / (d || 1),
          nz = dz / (d || 1);
        b.x = o.x + nx * r;
        b.z = o.z + nz * r;
        const dot = b.vx * nx + b.vz * nz;
        if (dot < 0) {
          b.vx = (b.vx - 1.45 * dot * nx) * 0.98;
          b.vz = (b.vz - 1.45 * dot * nz) * 0.98;
        }
        if (o.moving) {
          b.vx += nx * 0.4;
          b.vz += nz * 0.4;
        }
        this.events.push("bounce");
      }
    }
    if (b.y < floor + BALL_RADIUS && !onBridge) {
      if (b.vy < -3) {
        b.vy = -b.vy * 0.2;
        this.events.push("bounce");
      } else b.vy = 0;
      b.y = floor + BALL_RADIUS;
    }
    if (b.y < heightAt(h, h.cup.t) + 0.55 && Math.abs(b.vy) < 1.5 && cupCapture(this.previous, b, h.cup, 0.72, 6.2)) {
      b.x = h.cup.x;
      b.z = h.cup.z;
      b.y = heightAt(h, h.cup.t) - 0.12;
      this.active = false;
      this.sunk = true;
      this.events.push("cup");
      return;
    }
    if (n.distance > h.width * 1.6 || b.y < -4) {
      this.events.push("water");
      this.active = false;
      return;
    }
    if (Math.hypot(b.vx, b.vz) < 0.16 && Math.abs(b.vy) < 0.2) this.rest += dt;
    else this.rest = 0;
    if (this.rest > 0.13) {
      b.vx = b.vz = b.vy = 0;
      this.active = false;
      this.events.push("rest");
    }
  }
}
