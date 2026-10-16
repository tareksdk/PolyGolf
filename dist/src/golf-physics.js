import { nearbyTrees } from "./forest.js";
import { cupCapture } from "./cup-capture.js";
import { pirateShipFor, hitsPirateShip, pumpkinFor, hitsPumpkin } from "./course-features.js";
import { terrainAt, clamp } from "./golf-courses.js";
export const GOLF_RADIUS = 0.021335;
export const CUP_RADIUS = 0.19;
export const CUP_CAPTURE_RADIUS = 0.245;
export const CLUBS = [
  ["driver", "Driver", 75, 12, 2600, 245],
  ["3w", "3 Wood", 68, 12, 3400, 229],
  ["5w", "5 Wood", 64, 14, 4200, 211],
  ["4i", "4 Iron", 60, 14, 4700, 194],
  ["5i", "5 Iron", 57.5, 16, 5300, 181],
  ["6i", "6 Iron", 55, 17, 6100, 167],
  ["7i", "7 Iron", 52.5, 19, 6900, 154],
  ["8i", "8 Iron", 49.5, 21, 7700, 140],
  ["9i", "9 Iron", 47, 23, 8500, 128],
  ["pw", "Pitching wedge", 44, 26, 9000, 115],
  ["gw", "Gap wedge", 38, 30, 9200, 93],
  ["sw", "Sand wedge", 32, 34, 9000, 72],
  ["lw", "Lob wedge", 27, 39, 8600, 55],
  ["putter", "Putter", 6, 0, 0, 36],
].map(([id, name, speed, loft, rpm, carry]) => ({ id, name, speed, loft, rpm, carry }));
const cross = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const params = {
  green: [0.22, 0.25, 0.5],
  fairway: [0.25, 0.35, 1.0],
  tee: [0.28, 0.35, 1.0],
  rough: [0.12, 0.55, 2.5],
  sand: [0.06, 0.48, 2.8],
};
export class GolfPhysics {
  constructor() {
    this.events = [];
    this.sandContact = null;
    this.clock = 0;
  }
  load(h) {
    this.hole = h;
    this.ship = pirateShipFor(h);
    this.shipHit = false;
    this.pumpkin = pumpkinFor(h);
    this.pumpkinHit = false;
    this.lastSafe = { x: h.start.x, z: h.start.z };
    this.clock = 0;
    this.reset();
  }
  reset() {
    const p = this.lastSafe;
    this.ball = {
      x: p.x,
      z: p.z,
      y: terrainAt(this.hole, p.x, p.z).height + GOLF_RADIUS,
      vx: 0,
      vy: 0,
      vz: 0,
    };
    this.previous = { ...this.ball };
    this.omega = { x: 0, y: 0, z: 0 };
    this.active = this.sunk = false;
    this.airborne = false;
    this.still = 0;
    this.events = [];
  }
  obstacles() {
    return [];
  }
  shoot(dx, dz, power, { club = "driver", shape = 0, spin = 0, gear = {} } = {}) {
    if (this.active || this.sunk || ![dx, dz, power, shape, spin].every(Number.isFinite) || power <= 0)
      return false;
    const c = CLUBS.find((c) => c.id === club);
    if (!c) return false;
    const n = Math.hypot(dx, dz);
    if (!n) return false;
    dx /= n;
    dz /= n;
    power = clamp(power, 0.01, 1);
    shape = clamp(shape, -1, 1);
    spin = clamp(spin, -1, 1);
    const lie = terrainAt(this.hole, this.ball.x, this.ball.z).surface;
    const lieFactor = lie === "sand" ? (c.loft > 25 ? 0.87 : 0.56) : lie === "rough" ? 0.87 : 1;
    const driverSpeed = club === "driver" ? driverLaunchSpeed(gear.driverYards || 265) : c.speed;
    const speed = driverSpeed * power * lieFactor,
      loft = ((c.loft + spin * 3) * Math.PI) / 180,
      rpm = c.rpm * power ** 0.8 * (1 + spin * 0.2),
      w = (rpm * Math.PI) / 30;
    this.lastSafe = { x: this.ball.x, z: this.ball.z };
    this.ball.vx = dx * speed * Math.cos(loft);
    this.ball.vz = dz * speed * Math.cos(loft);
    this.ball.vy = club === "putter" ? 0 : speed * Math.sin(loft);
    this.omega = { x: -dz * w, y: shape * w * 0.24, z: dx * w };
    this.airborne = club !== "putter";
    this.active = true;
    this.still = 0;
    this.shotTime = 0;
    this.previous = { ...this.ball };
    if (lie === 'sand') {
      this.sandContact = {kind:'shot',x:this.ball.x,y:this.ball.y-GOLF_RADIUS,z:this.ball.z,vx:this.ball.vx,vz:this.ball.vz,speed};
      this.events.push('sand-shot');
    }
    return true;
  }
  update(dt) {
    this.clock += dt;
    this.previous = { ...this.ball };
    if (!this.active) return;
    this.shotTime += dt;
    const b = this.ball,
      old = { x: b.x, y: b.y, z: b.z };
    if (this.airborne) {
      const u = { x: b.vx - this.hole.wind.x, y: b.vy, z: b.vz - this.hole.wind.z },
        v = Math.hypot(u.x, u.y, u.z),
        cr = cross(this.omega, u),
        cn = Math.hypot(cr.x, cr.y, cr.z),
        S = (GOLF_RADIUS * cn) / Math.max(v * v, 1),
        cd = clamp(0.22 + 0.25 * S, 0.22, 0.55),
        cl = Math.min(0.32, (1.7 * S) / (1 + S)),
        k = 0.019069;
      const lift = (k * cl * v * v) / (cn || 1),
        ax = -k * cd * v * u.x + lift * cr.x,
        ay = -9.80665 - k * cd * v * u.y + lift * cr.y,
        az = -k * cd * v * u.z + lift * cr.z;
      b.x += b.vx * dt + 0.5 * ax * dt * dt;
      b.y += b.vy * dt + 0.5 * ay * dt * dt;
      b.z += b.vz * dt + 0.5 * az * dt * dt;
      b.vx += ax * dt;
      b.vy += ay * dt;
      b.vz += az * dt;
      const decay = Math.exp(-dt / 30);
      this.omega.x *= decay;
      this.omega.y *= decay;
      this.omega.z *= decay;
    } else {
      const t = terrainAt(this.hole, b.x, b.z),
        n = t.normal,
        roll = params[t.surface][2],
        v = { x: b.vx, y: b.vy, z: b.vz };
      const vn = dot(v, n);
      b.vx -= vn * n.x;
      b.vy -= vn * n.y;
      b.vz -= vn * n.z;
      b.vx += (5 / 7) * 9.80665 * n.y * n.x * dt;
      b.vz += (5 / 7) * 9.80665 * n.y * n.z * dt;
      b.vy = -((n.x * b.vx + n.z * b.vz) / n.y);
      const speed = Math.hypot(b.vx, b.vy, b.vz),
        factor = Math.max(0, 1 - (roll * dt) / (speed || 1));
      b.vx *= factor;
      b.vy *= factor;
      b.vz *= factor;
      b.x += b.vx * dt;
      b.z += b.vz * dt;
      b.y = terrainAt(this.hole, b.x, b.z).height + GOLF_RADIUS;
    }
    for (const tree of nearbyTrees(this.hole, b.x, b.z)) {
      const dx = b.x - old.x,
        dz = b.z - old.z,
        f = clamp(((tree.x - old.x) * dx + (tree.z - old.z) * dz) / (dx * dx + dz * dz || 1), 0, 1),
        px = old.x + dx * f,
        pz = old.z + dz * f,
        dist = Math.hypot(px - tree.x, pz - tree.z);
      if (dist >= 0.55) continue;
      const ground = terrainAt(this.hole, tree.x, tree.z).height;
      if (b.y < ground + 7 && b.y > ground) {
        const nx = (old.x - tree.x) / Math.max(0.001, Math.hypot(old.x - tree.x, old.z - tree.z)),
          nz = (old.z - tree.z) / Math.max(0.001, Math.hypot(old.x - tree.x, old.z - tree.z)),
          dot = b.vx * nx + b.vz * nz;
        if (dot < 0) {
          b.x = tree.x + nx * 0.56;
          b.z = tree.z + nz * 0.56;
          b.vx -= 1.35 * dot * nx;
          b.vz -= 1.35 * dot * nz;
          this.events.push("bounce");
        }
      }
    }
    if (!this.shipHit && hitsPirateShip(this.ship, old, b)) {
      this.shipHit = true;
      this.events.push("pirate-ship");
    }
    if (!this.pumpkinHit && hitsPumpkin(this.pumpkin, old, b)) {
      this.pumpkinHit = true;
      this.events.push('pumpkin');
    }
    let t = terrainAt(this.hole, b.x, b.z);
    if (
      (t.hazard && b.y <= t.height + 0.08) ||
      Math.abs(b.x) > 400 ||
      b.z > 300 ||
      b.z < -this.hole.length - 300
    ) {
      this.active = false;
      this.events.push("water");
      return;
    }
    if (this.airborne && b.y <= t.height + GOLF_RADIUS) {
      // Find the actual terrain crossing instead of bouncing below the surface.
      let lo = 0,
        hi = 1;
      for (let i = 0; i < 7; i++) {
        const f = (lo + hi) / 2,
          x = old.x + (b.x - old.x) * f,
          z = old.z + (b.z - old.z) * f,
          y = old.y + (b.y - old.y) * f;
        if (y > terrainAt(this.hole, x, z).height + GOLF_RADIUS) lo = f;
        else hi = f;
      }
      b.x = old.x + (b.x - old.x) * hi;
      b.z = old.z + (b.z - old.z) * hi;
      t = terrainAt(this.hole, b.x, b.z);
      b.y = t.height + GOLF_RADIUS;
      const n = t.normal,
        [e, mu] = params[t.surface],
        v = { x: b.vx, y: b.vy, z: b.vz },
        vn = dot(v, n);
      if (t.surface === 'sand' && vn < -.5) {
        this.sandContact = {kind:'impact',x:b.x,y:t.height,z:b.z,vx:v.x,vz:v.z,speed:Math.hypot(v.x,v.y,v.z)};
        this.events.push('sand-impact');
      }
      if (vn < 0) {
        const r = { x: -GOLF_RADIUS * n.x, y: -GOLF_RADIUS * n.y, z: -GOLF_RADIUS * n.z },
          rot = cross(this.omega, r),
          slip = { x: v.x + rot.x, y: v.y + rot.y, z: v.z + rot.z },
          sn = dot(slip, n);
        slip.x -= sn * n.x;
        slip.y -= sn * n.y;
        slip.z -= sn * n.z;
        const sl = Math.hypot(slip.x, slip.y, slip.z),
          jn = -(1 + e) * vn,
          jt = Math.min((2 / 7) * sl, mu * jn) / (sl || 1),
          j = { x: -slip.x * jt, y: -slip.y * jt, z: -slip.z * jt };
        b.vx += jn * n.x + j.x;
        b.vy += jn * n.y + j.y;
        b.vz += jn * n.z + j.z;
        const torque = cross(r, j);
        this.omega.x += torque.x / (0.4 * GOLF_RADIUS ** 2);
        this.omega.y += torque.y / (0.4 * GOLF_RADIUS ** 2);
        this.omega.z += torque.z / (0.4 * GOLF_RADIUS ** 2);
        // Shallow strikes lose energy while skidding through turf as well as compressing it.
        const normalSpeed = Math.abs(vn),
          tangentSpeed = Math.hypot(v.x - vn * n.x, v.y - vn * n.y, v.z - vn * n.z);
        const retention = Math.exp(
            -{ green: 0.07, fairway: 0.025, tee: 0.025, rough: 0.05, sand: 0.045 }[t.surface] * normalSpeed -
              (t.surface === 'sand' ? .009 : .035) * Math.max(0, tangentSpeed - normalSpeed),
          ),
          outN = b.vx * n.x + b.vy * n.y + b.vz * n.z;
        b.vx = outN * n.x + (b.vx - outN * n.x) * retention;
        b.vy = outN * n.y + (b.vy - outN * n.y) * retention;
        b.vz = outN * n.z + (b.vz - outN * n.z) * retention;
        this.omega.x *= retention;
        this.omega.y *= retention;
        this.omega.z *= retention;
        if (-vn > 0.8) this.events.push("bounce");
        if (dot({ x: b.vx, y: b.vy, z: b.vz }, n) < 0.45) {
          this.airborne = false;
          b.vy = 0;
        }
      }
    }
    const speed = Math.hypot(b.vx, b.vz),
      cup = this.hole.cup;
    // The visible cup is smaller; a slightly forgiving lip catches firm, centred putts.
    if (
      !this.airborne &&
      cupCapture(old, b, cup, CUP_CAPTURE_RADIUS, 4.2)
    ) {
      Object.assign(b, { x: cup.x, z: cup.z, y: cup.y - 0.08, vx: 0, vy: 0, vz: 0 });
      this.sunk = true;
      this.active = false;
      this.events.push("cup");
      return;
    }
    if (!this.airborne && speed < 0.035) {
      this.still += dt;
      if (this.still > 0.3) {
        b.vx = b.vy = b.vz = 0;
        this.active = false;
        this.events.push("rest");
      }
    } else this.still = 0;
    if (this.shotTime > 45) {
      this.active = false;
      b.vx = b.vy = b.vz = 0;
      this.events.push("rest");
    }
  }
}

// Calibrated against a level, windless fairway including the first bounce and roll.
export function driverLaunchSpeed(yards) {
  const y = clamp(Number(yards) || 265, 265, 350);
  const keys = [265, 285, 305, 330, 350],
    speeds = [69.16285, 73.88033, 78.90524, 85.65336, 91.48123];
  const i = keys.findIndex((v) => v >= y);
  if (i <= 0) return speeds[0];
  const t = (y - keys[i - 1]) / (keys[i] - keys[i - 1]);
  return speeds[i - 1] + (speeds[i] - speeds[i - 1]) * t;
}
