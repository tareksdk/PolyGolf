import { courseRotationKey } from "./rotating-courses.js";
import { recommendClub } from "./club-distances.js";
import { getHole, scoreName } from "./courses.js";
import { getGolfHole, terrainAt, golfHoleCount } from "./golf-courses.js";
import { GolfPhysics, CLUBS } from "./golf-physics.js";
import { PhysicsManager, FIXED_STEP } from "./physics.js";
import { miniStats, golfGear } from "./equipment.js";
import { waterContact } from './water-effects.js';
export class GameManager {
  constructor(world, callbacks = {}) {
    Object.assign(this, {
      world,
      onUpdate: () => {},
      onHole: () => {},
      onCourse: () => {},
      onEvent: () => {},
      onPause: () => {},
      ...callbacks,
    });
    this.physics = new GolfPhysics();
    this.state = "menu";
    this.direction = { x: 0, z: -1 };
    this.power = 0.85;
    this.shape = 0;
    this.spin = 0;
    this.club = "driver";
    this.charging = false;
    this.shotPhase = 'aim';
    this.accuracy = 0;
    this.accumulator = 0;
    this.elapsed = 0;
    this.heldKeys = new Set();
    this.bindInput();
  }
  start(courseIndex, practice = false, options = {}) {
    this.mode = options.mode || "golf";
    this.club = this.mode === "golf" ? "driver" : "putter";
    this.customHole = options.customHole;
    this.round = {
      courseIndex,
      rotationKey:this.mode === "golf"?courseRotationKey(courseIndex):"",
      mode: this.mode,
      practice: practice || !!this.customHole,
      strokes: [],
      time: 0,
      penalties: 0,
      collectibles: 0,
      holeCount: this.customHole ? 1 : this.mode === "golf" ? golfHoleCount(courseIndex) : 9,
      ...options.round,
    };
    this.physics = this.mode === "golf" ? new GolfPhysics() : new PhysicsManager();
    this.elapsed = 0;
    const random = new Uint32Array(1);
    globalThis.crypto?.getRandomValues?.(random);
    this.pirateRoundSeed = random[0] || Math.floor(Math.random() * 0xffffffff);
    this.loadHole(0);
  }
  loadHole(index) {
    this.clearInput();
    this.world.presentationPaused = false;
    this.index = index;
    this.strokes = 0;
    this.holeTime = 0;
    this.ticks = 0;
    this.transcript = [];
    this.accumulator = 0;
    this.charging = false;
    this.shotPhase = 'aim';
    this.pendingSwing = null;
    this.holeReveal = null;
    this.aimTarget = null;
    this.state = "playing";
    this.hole =
      this.customHole || (this.mode === "golf" ? getGolfHole : getHole)(this.round.courseIndex, index);
    // Random ship placements are a local-preview/practice variation. Verified online
    // rounds continue to use the course's deterministic replay seed.
    if (this.mode === 'golf' && (this.round.practice || this.round.localPreview)) this.hole.pirateSeed = this.pirateRoundSeed;
    this.physics.load(this.hole);
    this.world.load(this.hole);
    this.world.mode = "play";
    this.direction = { x: this.hole.cup.x - this.hole.start.x, z: this.hole.cup.z - this.hole.start.z };
    if (this.mode === "mini")
      this.direction = {
        x: this.hole.samples[25].x - this.hole.start.x,
        z: this.hole.samples[25].z - this.hole.start.z,
      };
    this.normalizeAim();
    this.world.orbit = Math.atan2(-this.direction.x, -this.direction.z);
    this.world.zoom = this.hole.volcanic ? 17 : this.mode === "golf" ? 13 : 18;
    this.world.pitch = 0.24;
    this.shape = this.spin = 0;
    this.autoAim();
    this.cancelShot();
    this.onUpdate();
  }
  normalizeAim() {
    const d = Math.hypot(this.direction.x, this.direction.z) || 1;
    this.direction.x /= d;
    this.direction.z /= d;
  }
  autoAim() {
    if (this.mode !== "golf") return;
    const b = this.physics.ball;
    this.club = golfGear(this.world.equipment).mysteryAce ? 'driver' : recommendClub(this.hole, b, this.world.equipment);
    this.power = 0.85;
    this.direction = { x: this.hole.cup.x - b.x, z: this.hole.cup.z - b.z };
    this.normalizeAim();
    this.aimTarget = null;
    this.shape = this.spin = 0;
    this.world.orbit = Math.atan2(-this.direction.x, -this.direction.z);
    this.world.pitch = 0.24;
  }
  shotOptions() {
    return {
      club: this.club,
      shape: this.shape,
      spin: this.spin,
      ...(this.mode === "mini"
        ? { gear: miniStats(this.world.equipment) }
        : { gear: golfGear(this.world.equipment) }),
    };
  }
  cancelShot() {
    const input = this.shotInput;
    this.shotInput = null;
    if (input?.type === 'pointer') this.releasePointer(input.id);
    this.charging = false;
    this.shotPhase = 'aim';
    this.accuracy = 0;
    this.displayedAccuracy = 0;
    this.lockedAccuracy = null;
    this.directionTime = 0;
  }
  releasePointer(id) {
    const canvas = this.world.canvas;
    if (id != null && canvas.hasPointerCapture?.(id)) canvas.releasePointerCapture(id);
  }
  clearInput() {
    const id = this.cameraPointer;
    this.cameraPointer = null;
    this.rotating = false;
    this.lastPointer = null;
    this.heldKeys.clear();
    this.aimTarget = null;
    this.cancelShot();
    this.releasePointer(id);
  }
  meterStyle() { return this.world.settings?.shotMeter === 'fluid' ? 'fluid' : 'classic'; }
  beginPower() {
    if (this.state !== 'playing' || this.physics.active || this.pendingSwing || this.charging || this.world.waterMoment || (this.world.pirateMoment || this.world.adventureMoment)) return;
    this.charging = true;
    this.shotPhase = 'power';
    this.chargeTime = 0;
    this.lockedAccuracy = this.meterStyle() === 'fluid' ? (this.displayedAccuracy ?? this.accuracy) : null;
    this.accuracy = this.lockedAccuracy ?? 0;
    this.power = .01;
    this.aimTarget = null;
  }
  lockPower() {
    if (this.shotPhase !== 'power' || !this.charging) return;
    if (this.meterStyle() === 'fluid') { this.shoot(); return; }
    this.shotPhase = 'direction';
    this.directionTime = 0;
    this.accuracy = 0;
    this.displayedAccuracy = 0;
  }
  shoot() {
    const fluid = this.meterStyle() === 'fluid';
    if (!this.charging || this.shotPhase !== (fluid ? 'power' : 'direction')) return;
    if (
      this.state !== "playing" ||
      this.pendingSwing ||
      this.physics.active ||
      this.strokes >= this.hole.par + 8
    )
      return;
    this.charging = false;
    this.shotPhase = 'aim';
    const shot = { dir: shotDirection(this.direction, fluid ? this.lockedAccuracy : (this.displayedAccuracy ?? this.accuracy), this.club === 'putter' || this.mode === 'mini'), power: this.power, options: this.shotOptions() };
    if (this.mode === "golf") {
      this.pendingSwing = { ...shot, remaining: this.club === "putter" ? 0.36 : 0.56 };
      this.world.beginSwing?.(this.physics.ball, shot.dir, this.club);
    } else this.fire(shot);
  }
  fire(shot) {
    const { dir, power, options } = shot;
    if (this.physics.shoot(dir.x, dir.z, power, options)) {
      this.transcript.push({
        kind: "shot",
        tick: this.ticks,
        dx: dir.x,
        dz: dir.z,
        power,
        club: options.club,
        shape: options.shape,
        spin: options.spin,
      });
      this.strokes++;
      this.world.hit();
      this.onEvent("hit");
      this.onUpdate();
    }
  }

  reset() {
    if (this.round?.sudden) return;
    if (this.state !== "playing" || this.pendingSwing || this.physics.sunk) return;
    this.clearInput();
    this.transcript.push({ kind: "reset", tick: this.ticks });
    this.strokes++;
    this.round.penalties++;
    this.physics.reset();
    this.autoAim();
    this.accumulator = 0;
    this.onEvent("penalty");
    this.onUpdate();
    if (this.strokes >= this.hole.par + 8) this.skip();
  }
  pause() {
    if (!["playing", "paused"].includes(this.state)) return;
    this.setPaused(this.state !== 'paused');
  }
  setPaused(paused, notify = true) {
    if (!["playing", "paused"].includes(this.state)) return;
    this.clearInput();
    this.state = paused ? 'paused' : 'playing';
    this.world.presentationPaused = paused;
    if (notify) this.onPause(paused);
  }
  leave() {
    this.holeReveal = null;
    this.pendingSwing = null;
    this.clearInput();
    this.world.presentationPaused = false;
    this.state = "menu";
    this.world.mode = "menu";
    // The menu backdrop follows the selected mode and course when the UI provides one.
    this.world.load(this.menuHole?.() || getGolfHole(0, 0));
    this.world.setGhosts?.([]);
    this.onUpdate();
  }
  next() {
    if (this.state !== "complete") return;
    if (this.index < this.round.holeCount - 1) this.loadHole(this.index + 1);
    else {
      this.state = "finished";
      this.round.time = this.elapsed;
      this.onCourse(this.round);
    }
  }
  skip() {
    if (this.round?.sudden) return;
    if (!["paused", "playing"].includes(this.state)) return;
    this.pendingSwing = null;
    this.world.swingPose = null;
    this.transcript.push({ kind: "skip", tick: this.ticks });
    this.strokes = Math.max(this.strokes, this.hole.par + 6);
    this.physics.active = false;
    this.finishHole();
  }
  finishHole() {
    if (this.round?.sudden) {
      this.finishSudden();
      return;
    }
    if (this.state === "complete") return;
    this.state = "complete";
    this.clearInput();
    this.world.presentationPaused = false;
    this.round.strokes[this.index] = this.strokes;

    this.onEvent("cup");
    const result = {
      index: this.index,
      strokes: this.strokes,
      par: this.hole.par,
      time: this.holeTime,
      label: scoreName(this.strokes, this.hole.par),
      round: this.round,
      transcript: this.transcript,
      endTick: this.ticks,
    };
    const duration = this.physics.sunk ? this.world.celebrate?.(this.hole.cup, this.world.holeColor) : 1.15;
    this.holeReveal = { remaining: duration || 1.15, result };
    this.onUpdate();
  }
  finishSudden() {
    if (this.state === "complete") return;
    this.state = "complete";
    this.clearInput();
    this.world.presentationPaused = false;
    const result = { round: this.round, index: 0, transcript: this.transcript, endTick: this.ticks };
    let duration=1.15;
    if (this.physics.sunk) {
      duration=this.world.celebrate?.(this.hole.cup, this.world.holeColor) || 1.15;
      this.onEvent("cup");
    }
    this.holeReveal = { remaining: duration, result };
    this.onUpdate();
  }
  bindInput() {
    const canvas = this.world.canvas;
    const orbit = (e) => {
      this.cancelShot();
      this.aimTarget = null;
      this.rotating = true;
      this.cameraPointer = e.pointerId;
      this.cameraButtons = e.button === 0 ? 1 : 2;
      this.lastPointer = { x: e.clientX, y: e.clientY };
      canvas.setPointerCapture?.(e.pointerId);
    };
    const stopOrbit = () => {
      const id = this.cameraPointer;
      this.rotating = false;
      this.cameraPointer = null;
      this.lastPointer = null;
      this.releasePointer(id);
    };
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    canvas.addEventListener("pointerdown", (e) => {
      if (this.state !== "playing" || this.pendingSwing || this.world.waterMoment || (this.world.pirateMoment || this.world.adventureMoment)) return;
      e.preventDefault?.();
      canvas.focus?.({ preventScroll: true });
      this.onEvent("interact");
      if (e.button === 2 || (e.button === 0 && e.ctrlKey)) {
        if (this.cameraPointer == null) orbit(e);
      } else if (e.button === 0 && !this.physics.active && !this.shotInput && !this.rotating) {
        if (this.shotPhase === 'direction') this.shoot();
        else {
          this.beginPower();
          if (this.charging) {
            this.shotInput = { type: 'pointer', id: e.pointerId };
            canvas.setPointerCapture?.(e.pointerId);
          }
        }
      }
    });
    canvas.addEventListener("pointermove", (e) => {
      if (this.state !== 'playing' || this.world.waterMoment || (this.world.pirateMoment || this.world.adventureMoment)) return;
      // A mouse chord sends pointermove, not a second pointerdown. Orbit wins
      // over a held shot so releasing the last button cannot fire accidentally.
      if (!this.rotating && (e.buttons & 2) && !this.pendingSwing) orbit({ pointerId:e.pointerId, clientX:e.clientX, clientY:e.clientY, button:2 });
      if (this.rotating) {
        if (e.pointerId !== this.cameraPointer) return;
        if (e.buttons !== undefined && !(e.buttons & this.cameraButtons)) { stopOrbit(); return; }
        this.world.orbit -=
          (e.clientX - this.lastPointer.x) * 0.006 * (this.world.settings?.cameraSensitivity || 1);
        this.world.pitch = Math.max(
          0.16,
          Math.min(1.2, (this.world.pitch || 0.32) + (e.clientY - this.lastPointer.y) * 0.003),
        );
        this.lastPointer = { x: e.clientX, y: e.clientY };
      } else if (!e.buttons && !this.physics.active && !this.pendingSwing && !this.charging) this.aimAt(e);
    });
    canvas.addEventListener("pointerup", (e) => {
      if (e.pointerId === this.cameraPointer) { stopOrbit(); return; }
      if (e.button === 0 && this.shotInput?.type === 'pointer' && this.shotInput.id === e.pointerId) {
        this.shotInput = null;
        this.lockPower();
        this.releasePointer(e.pointerId);
      }
    });
    const cancelPointer = (e) => {
      if (e.pointerId === this.cameraPointer) stopOrbit();
      if (this.shotInput?.type === 'pointer' && this.shotInput.id === e.pointerId) this.cancelShot();
    };
    canvas.addEventListener('pointercancel', cancelPointer);
    canvas.addEventListener('lostpointercapture', cancelPointer);
    canvas.addEventListener(
      "wheel",
      (e) => {
        if (this.state === "playing") {
          e.preventDefault();
          this.world.zoom = Math.max(
            this.mode === "golf" ? 8 : 10,
            Math.min(
              this.mode === "golf" ? 240 : 34,
              this.world.zoom + e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1) * (this.mode === "golf" ? 0.05 : 0.013) * (this.world.settings?.zoomSensitivity || 1),
            ),
          );
        }
      },
      { passive: false },
    );
    window.addEventListener("keydown", (e) => {
      if (
        ["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(document.activeElement?.tagName) &&
        e.code !== "Escape"
      )
        return;
      if (e.code === "Escape") {
        e.preventDefault();
        if (!e.repeat) this.pause();
        return;
      }
      if (this.state !== "playing" || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.code === "KeyR" && !e.repeat) this.reset();
      if (['KeyQ','KeyE','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','ShiftLeft','ShiftRight'].includes(e.code)) {
        this.heldKeys.add(e.code);
        if (e.code.startsWith('Arrow')) e.preventDefault();
      }
      if (e.code === "KeyC" && !e.repeat && this.mode === "golf" && !this.charging && !this.physics.active && !this.pendingSwing) {
        this.club = CLUBS[(CLUBS.findIndex((c) => c.id === this.club) + 1) % CLUBS.length].id;
        this.onUpdate();
      }
      if (e.code === "Space" && !e.repeat && !this.physics.active && !this.pendingSwing && !this.shotInput && !this.rotating) {
        e.preventDefault();
        if (this.shotPhase === 'direction') this.shoot();
        else {
          this.beginPower();
          if (this.charging) this.shotInput = { type: 'keyboard' };
        }
        this.onEvent("interact");
      }
    });
    window.addEventListener("keyup", (e) => {
      this.heldKeys.delete(e.code);
      if (e.code === "Space" && this.shotInput?.type === 'keyboard') {
        e.preventDefault();
        this.shotInput = null;
        this.lockPower();
      }
    });
    window.addEventListener("blur", () => {
      this.clearInput();
      if (this.state === "playing") this.pause();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.state === "playing") this.pause();
    });
    document.addEventListener('focusin', (e) => {
      if (['INPUT','SELECT','TEXTAREA','BUTTON'].includes(e.target?.tagName) || e.target?.isContentEditable) this.clearInput();
    });
  }
  aimAt(e) {
    const p = this.world.pointerToWorld(e.clientX, e.clientY);
    if (!p) return;
    const x = p.x - this.physics.ball.x,
      z = p.z - this.physics.ball.z,
      n = Math.hypot(x, z);
    if (n < 0.6 || !Number.isFinite(n)) return;
    this.aimTarget = { x: x / n, z: z / n };
  }
  update(dt) {
    if (this.holeReveal) {
      this.holeReveal.remaining -= dt;
      if (this.holeReveal.remaining <= 0) {
        const result = this.holeReveal.result;
        this.holeReveal = null;
        if (this.state === "complete" && this.round === result.round) this.onHole(result);
      }
    }
    if (this.state === "playing") {
      const keys = this.heldKeys;
      this.world.orbit += ((keys.has('KeyE')?1:0) - (keys.has('KeyQ')?1:0)) * 1.2 * dt;
      if (!this.pendingSwing && !this.physics.active && !this.charging) {
        const turn = ((keys.has('ArrowRight')?1:0) - (keys.has('ArrowLeft')?1:0));
        if (turn) {
          const a = Math.atan2(this.direction.z,this.direction.x) + turn * dt * (keys.has('ShiftLeft') || keys.has('ShiftRight') ? .14 : .48);
          this.direction = {x:Math.cos(a),z:Math.sin(a)};
          this.aimTarget = null;
        }
        this.power = Math.max(.01,Math.min(1,this.power + ((keys.has('ArrowUp')?1:0) - (keys.has('ArrowDown')?1:0)) * dt * .35));
        if (this.meterStyle() === 'fluid' && !this.world.waterMoment && !(this.world.pirateMoment || this.world.adventureMoment)) {
          this.directionTime = (this.directionTime || 0) + dt;
          this.accuracy = directionAccuracy(this.directionTime);
        }
      }
      if (this.aimTarget && !this.pendingSwing && !this.physics.active && !this.charging) {
        const a = Math.atan2(this.direction.x, this.direction.z),
          b = Math.atan2(this.aimTarget.x, this.aimTarget.z),
          delta = Math.atan2(Math.sin(b - a), Math.cos(b - a)),
          next = a + delta * (1 - Math.exp(-dt * 15));
        this.direction = { x: Math.sin(next), z: Math.cos(next) };
      }
      if (this.pendingSwing) {
        this.pendingSwing.remaining -= dt;
        if (this.pendingSwing.remaining <= 0) {
          const shot = this.pendingSwing;
          this.pendingSwing = null;
          this.fire(shot);
        }
      }
      this.elapsed += dt;
      this.holeTime += dt;
      if (this.charging && this.shotPhase === 'power') {
        this.chargeTime += dt;
        this.power = this.meterStyle() === 'fluid' ? flowPower(this.chargeTime) : chargePower(this.chargeTime);
      } else if (this.charging && this.shotPhase === 'direction') {
        this.directionTime += dt;
        this.accuracy = directionAccuracy(this.directionTime);
      }
      this.accumulator = Math.min(this.accumulator + dt, 0.1);
      while (this.accumulator >= FIXED_STEP && this.state === "playing") {
        this.physics.update(FIXED_STEP);
        this.ticks++;
        this.accumulator -= FIXED_STEP;
        for (const event of this.physics.events.splice(0)) {
          if (event === "cup") this.finishHole();
          else if (event === "water") {
            this.world.waterSplash?.(waterContact(this.hole,this.physics.ball));
            if (this.round.sudden) {
              this.finishSudden();
              break;
            }
            this.onEvent("water");
            this.strokes++;
            this.round.penalties++;
            this.physics.reset();
            this.autoAim();
            this.onUpdate();
          } else {
            if (event === 'sand-impact' || event === 'sand-shot') this.world.sandBurst?.(this.physics.sandContact);
            if (event === 'pirate-ship') this.world.pirateHit?.(this.physics.ball);
            this.onEvent(event);
            if (event === "rest") {
              if (this.round.sudden) {
                this.finishSudden();
                break;
              }
              this.autoAim();
              if (this.strokes >= this.hole.par + 8) this.skip();
              else this.onUpdate();
            }
          }
        }
      }
      const coin = this.world.coin,
        b = this.physics.ball;
      if (
        coin &&
        !coin.userData.collected &&
        this.strokes > 0 &&
        Math.hypot(b.x - coin.position.x, b.z - coin.position.z) < 0.9
      ) {
        coin.visible = false;
        coin.userData.collected = true;
        this.round.collectibles++;
        this.onEvent("collectible");
        this.world.burst(b.x, 1, b.z, "#f2ca63", 12);
      }
    }
    const inRound = ["playing", "paused", "complete", "finished"].includes(this.state),
      b = this.physics.ball || { x: 0, y: 0, z: 0 },
      prev = this.physics.previous || b,
      alpha = this.accumulator / FIXED_STEP,
      renderBall = {
        ...b,
        x: prev.x + (b.x - prev.x) * alpha,
        y: prev.y + (b.y - prev.y) * alpha,
        z: prev.z + (b.z - prev.z) * alpha,
      };
    this.world.presentationPaused = this.state === "paused";
    this.world.shotOptions = this.shotOptions();
    const c = CLUBS.find((c) => c.id === this.club);
    this.world.activeClub = this.club;
    this.world.aimDistance =
      c?.id === "putter" ? 36 * this.power ** 2 : (c?.carry || 30) * this.power ** 1.65;
    this.world.setAim(
      b,
      this.charging || this.meterStyle() === 'fluid' ? shotDirection(this.direction, this.accuracy, this.club === 'putter' || this.mode === 'mini') : this.direction,
      this.power,
      this.state === "playing" &&
        !this.pendingSwing &&
        !this.world.waterMoment &&
        !(this.world.pirateMoment || this.world.adventureMoment) &&
        !this.physics.active &&
        this.world.settings?.aimGuide !== false,
    );
    this.world.update(dt, inRound ? renderBall : null, inRound ? this.physics : null);
  }
}

export function chargePower(seconds) {
  const t = Math.max(0, seconds) / 1.65 % 2;
  return Math.max(0.01, 1 - Math.abs(t - 1));
}
export function flowPower(seconds) {
  // Eased reversals preserve the original timing without a hard corner at
  // either end of the hold meter.
  return Math.max(.01,.5-.5*Math.cos(Math.max(0,seconds)*Math.PI/1.65));
}
export function chargeAccuracy(seconds) {
  // Centre at full power; reversing the meter never makes a straight full shot impossible.
  const t = (Math.max(0, seconds) / 1.65 + .5) % 2;
  return 1 - 2 * Math.abs(t - 1);
}
// A continuous 2.2-second sweep. Accelerate through the green centre and ease
// into the outside turns without changing position discontinuously.
export function directionAccuracy(seconds) {
  return Math.tanh(1.25 * Math.sin(Math.max(0, seconds) * Math.PI / 1.1)) / Math.tanh(1.25);
}
export function shotDirection(dir, accuracy = 0, putting = false) {
  // A generous central sweet spot; the meter adds a small, visible angular miss.
  const signed = Math.sign(accuracy) * Math.max(0, Math.abs(accuracy) - .16) / .84;
  const angle = signed * (putting ? .035 : .09), c = Math.cos(angle), s = Math.sin(angle);
  return { x: dir.x * c - dir.z * s, z: dir.x * s + dir.z * c };
}
