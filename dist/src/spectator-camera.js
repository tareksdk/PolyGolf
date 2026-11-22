import * as THREE from '../vendor/three.module.js';
import { createCameraClearance } from './camera-clearance.js';
import { minimapModel } from './minimap.js';

const clamp = THREE.MathUtils.clamp;
const moveKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']);
const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');

// A separate viewing camera leaves the player's ball, aim and shot camera alone.
export class SpectatorCamera {
  constructor(world, findPeer) {
    this.world = world;
    this.findPeer = findPeer;
    this.clearance = createCameraClearance(world);
    this.freeTarget = new THREE.Vector3();
    this.focus = new THREE.Vector3();
    this.position = new THREE.Vector3();
    this.keys = new Set();
  }

  start(hole, ball) {
    this.bounds = minimapModel(hole);
    this.origin = ball;
    this.golf = hole.mode === 'golf';
    this.active = true;
    this.targetId = null;
    this.zoom = this.golf ? 20 : 13;
    const view = this.position.subVectors(this.world.camera.position, this.world.look);
    this.bearing = Math.atan2(view.x, view.z);
    this.pitch = clamp(Math.atan2(view.y, Math.hypot(view.x, view.z)), .28, 1.15);
    this.freeTarget.copy(this.world.look);
    this.clearance.reset();
  }

  stop() {
    this.active = false;
    this.targetId = null;
    this.clearInput();
  }

  clearInput() {
    this.keys.clear();
    this.releaseDrag?.();
  }

  follow(id) {
    if (!this.active || this.targetId === id) return;
    this.freeTarget.copy(this.world.look);
    this.targetId = id;
    this.needsFrame = !!id;
    this.clearInput();
  }

  recenter() {
    if (!this.active) return;
    this.zoom = this.golf ? 20 : 13;
    this.pitch = .45;
    if (this.targetId) this.needsFrame = true;
    else this.freeTarget.set(this.origin.x, this.origin.y, this.origin.z);
  }

  zoomBy(factor) {
    if (this.active) this.zoom = clamp(this.zoom * factor, this.golf ? 6 : 4, this.golf ? 90 : 30);
  }

  pan(right, forward) {
    const sin = Math.sin(this.bearing), cos = Math.cos(this.bearing);
    this.freeTarget.x += right * cos - forward * sin;
    this.freeTarget.z -= right * sin + forward * cos;
  }

  update(dt) {
    const w = this.world, moving = this.keys;
    const peer = this.targetId ? this.findPeer(this.targetId) : null;
    const target = peer?.viewTarget;
    let speed = 0;
    if (target) {
      this.focus.copy(target);
      this.focus.y += this.golf ? .5 : .32;
      const ball = peer.sample?.ball;
      if (peer.sample?.active) speed = Math.hypot(ball.vx, ball.vz);
    } else if (!this.targetId) {
      const right = Number(moving.has('KeyD') || moving.has('ArrowRight')) - Number(moving.has('KeyA') || moving.has('ArrowLeft'));
      const forward = Number(moving.has('KeyW') || moving.has('ArrowUp')) - Number(moving.has('KeyS') || moving.has('ArrowDown'));
      const pace = this.zoom * .85 * dt / (right && forward ? Math.SQRT2 : 1);
      this.pan(right * pace, forward * pace);
      const { minX, maxX, minZ, maxZ } = this.bounds;
      this.freeTarget.x = clamp(this.freeTarget.x, minX, maxX);
      this.freeTarget.z = clamp(this.freeTarget.z, minZ, maxZ);
      this.freeTarget.y = this.clearance.ground(this.freeTarget.x, this.freeTarget.z) + 1.15;
      this.focus.copy(this.freeTarget);
    } else {
      // Hold the framing while a chosen golfer connects or reconnects.
      this.focus.copy(w.look);
    }

    const reduced = w.settings?.reducedMotion || reducedMotion?.matches;
    const cut = this.needsFrame && target && (reduced || w.look.distanceTo(this.focus) > (this.golf ? 40 : 10));
    if (target) this.needsFrame = false;
    w.look.lerp(this.focus, cut ? 1 : 1 - Math.exp(-dt * (target ? 15 : 11)));
    const distance = this.zoom + (reduced ? 0 : Math.min(this.zoom * .65, speed * .17));
    const horizontal = distance * Math.cos(this.pitch);
    this.position.set(
      w.look.x + horizontal * Math.sin(this.bearing),
      w.look.y + distance * Math.sin(this.pitch),
      w.look.z + horizontal * Math.cos(this.bearing),
    );
    this.clearance.resolve(w.look, this.position);
    w.camera.position.lerp(this.position, cut ? 1 : 1 - Math.exp(-dt * 11));
    w.camera.position.y = Math.max(w.camera.position.y, this.clearance.ground(w.camera.position.x, w.camera.position.z) + 1);
    w.camera.lookAt(w.look);
    if (w.camera.fov !== 48) {
      w.camera.fov = 48;
      w.camera.updateProjectionMatrix();
    }
    w.cameraPosition.copy(w.camera.position);
    w.cameraTarget.copy(w.look);
  }

  bind(canvas, blocked) {
    let drag = null;
    const endDrag = () => {
      const id = drag?.id;
      drag = null;
      if (id != null && canvas.hasPointerCapture?.(id)) canvas.releasePointerCapture(id);
    };
    this.releaseDrag = endDrag;
    const enabled = () => this.active && !blocked();
    canvas.addEventListener('pointerdown', event => {
      if (!enabled() || drag || ![0, 2].includes(event.button)) return;
      event.preventDefault();
      canvas.focus({ preventScroll: true });
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY,
        pan: !this.targetId && (event.pointerType === 'touch' || event.shiftKey || event.button === 2) };
      canvas.setPointerCapture?.(event.pointerId);
    });
    canvas.addEventListener('pointermove', event => {
      if (drag?.id !== event.pointerId) return;
      if (!enabled()) { endDrag(); return; }
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      const sensitivity = this.world.settings?.cameraSensitivity || 1;
      if (drag.pan) this.pan(-dx * this.zoom * .003 * sensitivity, dy * this.zoom * .003 * sensitivity);
      else {
        this.bearing -= dx * .006 * sensitivity;
        this.pitch = clamp(this.pitch + dy * .004 * sensitivity, .18, 1.35);
      }
      drag.x = event.clientX;
      drag.y = event.clientY;
    });
    for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      canvas.addEventListener(eventName, event => { if (drag?.id === event.pointerId) endDrag(); });
    }
    canvas.addEventListener('wheel', event => {
      if (!enabled()) return;
      event.preventDefault();
      const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 100 : 1;
      const amount = clamp(event.deltaY * scale * .002 * (this.world.settings?.zoomSensitivity || 1), -.5, .5);
      this.zoomBy(Math.exp(amount));
    }, { passive: false });
    window.addEventListener('keydown', event => {
      if (!enabled() || this.targetId || !moveKeys.has(event.code) || event.ctrlKey || event.metaKey || event.altKey ||
          document.activeElement?.closest('button,input,select,textarea,summary,[contenteditable],[tabindex]:not(canvas)')) return;
      event.preventDefault();
      this.keys.add(event.code);
    });
    window.addEventListener('keyup', event => this.keys.delete(event.code));
    window.addEventListener('blur', () => this.clearInput());
    document.addEventListener('focusin', event => {
      if (event.target !== canvas) this.clearInput();
    });
  }
}
