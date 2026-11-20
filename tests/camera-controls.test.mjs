import test from 'node:test';
import assert from 'node:assert/strict';
import { GameManager } from '../dist/src/game.js';
import { CameraRig } from '../dist/src/camera-rig.js';
import * as THREE from '../dist/vendor/three.module.js';

function fixture(mode = 'golf') {
  const keyboard = {}, pointer = {}, events = {}, calls = [];
  globalThis.window = { addEventListener: (name, handler) => keyboard[name] = handler };
  globalThis.document = { activeElement: {tagName: 'CANVAS'}, addEventListener: (name, handler) => events[name] = handler };
  const world = {
    canvas: {addEventListener: (name, handler) => pointer[name] = handler},
    equipment: {}, settings: {cinematicCamera: true}, cameraRig: {isCinematic: false},
    load() {}, update() {}, setAim() {}, hit() {}, beginSwing() {},
    cameraManualInput: () => calls.push({type: 'manual'}),
    cameraShot: ball => calls.push({type: 'shot', ball: {...ball}}),
    resetCamera: (ball, options) => calls.push({type: 'reset', ball: {...ball}, ...options}),
    skipCamera() { const active = this.cameraRig.isCinematic; this.cameraRig.isCinematic = false; calls.push({type: 'skip'}); return active; },
    pointerToWorld: () => ({x: 15, z: -20}),
  };
  const game = new GameManager(world);
  game.start(0, true, {mode});
  return {game, world, keyboard, pointer, events, calls};
}
const key = code => ({code, preventDefault() {}});
const drag = {button: 2, buttons: 2, pointerId: 4, clientX: 80, clientY: 100, preventDefault() {}};

test('camera shot notification occurs once after a successful physics launch', () => {
  const {game, calls} = fixture();
  const shot = {dir: {...game.direction}, power: .7, options: game.shotOptions()};
  game.fire(shot);
  const launches = calls.filter(call => call.type === 'shot');
  assert.equal(launches.length, 1);
  assert.ok(Math.hypot(launches[0].ball.vx, launches[0].ball.vz) > 20);
  assert.equal(launches[0].ball.vy, game.physics.ball.vy);
  game.fire(shot);
  assert.equal(calls.filter(call => call.type === 'shot').length, 1);
  assert.equal(game.strokes, 1);
});

test('hole loads cut while resets and water respawns blend without changing penalties', () => {
  const {game, calls} = fixture();
  assert.equal(calls.at(-1).type, 'reset');
  assert.equal(calls.at(-1).cut, true);
  game.reset();
  assert.equal(calls.at(-1).cut, false);
  assert.equal(game.round.penalties, 1);
  game.physics.ball.x += 40;
  game.physics.events.push('water');
  game.update(1 / 120);
  assert.equal(calls.at(-1).type, 'reset');
  assert.equal(calls.at(-1).cut, false);
  assert.equal(calls.at(-1).ball.x, game.physics.lastSafe.x);
  assert.equal(game.round.penalties, 2);
  assert.equal(game.strokes, 2);
  game.loadHole(1);
  assert.equal(calls.at(-1).cut, true);
});

test('drag ownership lasts between pointer events and all manual controls notify tracking', () => {
  const {game, world, pointer, keyboard, calls} = fixture();
  pointer.pointerdown(drag);
  assert.equal(calls.at(-1).type, 'manual');
  const count = calls.length;
  for (let i = 0; i < 3; i++) game.update(1 / 60);
  assert.equal(calls.length, count + 3);
  const orbit = world.orbit;
  pointer.pointermove({...drag, clientX: 110});
  assert.equal(world.orbit, orbit - .18);
  pointer.pointerup(drag);
  const released = calls.length;
  game.update(1 / 60);
  assert.equal(calls.length, released);
  keyboard.keydown(key('KeyE'));
  game.update(.1);
  assert.equal(calls.at(-1).type, 'manual');
  keyboard.keyup(key('KeyE'));
  pointer.wheel({deltaY: 10, preventDefault() {}});
  assert.equal(calls.at(-1).type, 'manual');
  const paused = calls.length;
  game.pause();
  pointer.wheel({deltaY: 20, preventDefault() {}});
  game.update(.1);
  assert.equal(calls.length, paused);
});

test('F restores default view without touching aim, power, scoring or cinematic preference', () => {
  for (const mode of ['golf', 'mini']) {
    const {game, world, keyboard, calls} = fixture(mode);
    game.beginPower();
    game.update(.4);
    const power = game.power, direction = {...game.direction};
    world.orbit = 2.8; world.pitch = 1.1; world.zoom = 100;
    world.cameraRig.isCinematic = true;
    keyboard.keydown(key('KeyF'));
    assert.equal(world.orbit, Math.atan2(-direction.x, -direction.z));
    assert.equal(world.zoom, mode === 'golf' ? 13 : 18);
    assert.equal(world.pitch, .24);
    assert.equal(calls.at(-1).cut, false);
    assert.deepEqual(game.direction, direction);
    assert.equal(game.power, power);
    assert.equal(game.charging, true);
    assert.equal(game.strokes, 0);
    assert.equal(world.settings.cinematicCamera, true);
    assert.equal(world.cameraRig.isCinematic, false);
    const count = calls.length;
    document.activeElement = {tagName: 'INPUT'};
    keyboard.keydown(key('KeyF'));
    assert.equal(calls.length, count);
  }
});

test('Escape exits cinematic before pause and does not override resume or blur', () => {
  const {game, world, keyboard} = fixture();
  world.cameraRig.isCinematic = true;
  keyboard.keydown(key('Escape'));
  assert.equal(game.state, 'playing');
  assert.equal(world.cameraRig.isCinematic, false);
  keyboard.keydown({...key('Escape'), repeat: true});
  assert.equal(game.state, 'playing');
  keyboard.keydown(key('Escape'));
  assert.equal(game.state, 'paused');
  world.cameraRig.isCinematic = true;
  keyboard.keydown(key('Escape'));
  assert.equal(game.state, 'playing');
  keyboard.blur();
  assert.equal(game.state, 'paused');
  assert.equal(world.presentationPaused, true);
});

test('rest auto-aim preserves a manually owned or cinematic camera; explicit resets restore it', () => {
  for (const ownership of ['manualActive', 'isCinematic', 'heldKey', 'drag']) {
    const {game, world, keyboard, pointer} = fixture();
    if (ownership === 'heldKey') keyboard.keydown(key('KeyQ'));
    else if (ownership === 'drag') pointer.pointerdown(drag);
    else world.cameraRig[ownership] = true;
    world.orbit = 1.7; world.pitch = .81;
    game.physics.ball.x += 10;
    game.autoAim();
    assert.equal(world.orbit, 1.7, ownership);
    assert.equal(world.pitch, .81, ownership);
    assert.ok(game.direction.x !== 0);
    game.reset();
    assert.equal(world.orbit, Math.atan2(-game.direction.x, -game.direction.z));
    assert.equal(world.pitch, .24);
  }
});

test('skipping the cinematic finish promptly reveals the same scored result', () => {
  const {game, world} = fixture();
  let revealed;
  game.onHole = result => revealed = result;
  game.strokes = 2;
  game.physics.sunk = true;
  game.finishHole();
  const result = game.holeReveal.result;
  world.cameraRig.isCinematic = true;
  assert.equal(game.skipCamera(), true);
  assert.equal(game.holeReveal.remaining, 0);
  game.update(1 / 60);
  assert.equal(revealed, result);
  assert.equal(game.round.strokes[0], 2);
  assert.equal(game.state, 'complete');
  assert.equal(game.skipCamera(), false);
});

test('F with the real rig keeps the current moving shot in default view until the next shot', () => {
  const {game, world, keyboard} = fixture();
  Object.assign(world, {
    hole: game.hole,
    group: new THREE.Group(),
    camera: new THREE.PerspectiveCamera(45, 16 / 9, .05, 2000),
    look: new THREE.Vector3(),
    renderGround: () => 0,
  });
  world.camera.position.set(0, 3.12, 13);
  world.cameraRig = new CameraRig(world);
  world.cameraShot = ball => world.cameraRig.beginShot(ball);
  world.resetCamera = (ball, options) => world.cameraRig.reset(ball, options);
  world.skipCamera = () => { const active = world.cameraRig.isCinematic; world.cameraRig.skip(); return active; };
  game.fire({dir: {x: 0, z: -1}, power: .8, options: game.shotOptions()});
  const ball = game.physics.ball;
  const advanceCamera = frames => {
    for (let i = 0; i < frames; i++) {
      ball.z += ball.vz / 60;
      world.cameraRig.update(1 / 60, ball, game.physics);
    }
  };
  advanceCamera(120);
  assert.equal(world.cameraRig.isCinematic, true);
  keyboard.keydown(key('KeyF'));
  advanceCamera(180);
  assert.equal(world.cameraRig.isCinematic, false);
  assert.equal(world.cameraRig.skipped, true);
  game.physics.active = false;
  world.cameraRig.update(1 / 60, ball, game.physics);
  game.fire({dir: {x: 0, z: -1}, power: .8, options: game.shotOptions()});
  advanceCamera(120);
  assert.equal(world.cameraRig.isCinematic, true);
});

test('a distant respawn blends the actual camera rotation instead of snapping toward the ball', () => {
  const {game, world} = fixture();
  Object.assign(world, {
    hole: game.hole,
    group: new THREE.Group(),
    camera: new THREE.PerspectiveCamera(45, 16 / 9, .05, 2000),
    look: new THREE.Vector3(),
    renderGround: () => 0,
  });
  world.camera.position.set(0, 3.12, 13);
  world.cameraRig = new CameraRig(world);
  world.cameraShot = ball => world.cameraRig.beginShot(ball);
  world.resetCamera = (ball, options) => world.cameraRig.reset(ball, options);
  world.cameraRig.reset(game.physics.ball, {cut: true});
  game.fire({dir: {x: 0, z: -1}, power: .8, options: game.shotOptions()});
  for (let i = 0; i < 180; i++) {
    game.physics.ball.z += game.physics.ball.vz / 60;
    world.cameraRig.update(1 / 60, game.physics.ball, game.physics);
  }
  const previous = world.camera.quaternion.clone();
  game.reset();
  world.cameraRig.update(1 / 60, game.physics.ball, game.physics);
  const degrees = previous.angleTo(world.camera.quaternion) * 180 / Math.PI;
  assert.ok(degrees < 15, `first respawn frame rotated ${degrees.toFixed(2)} degrees`);
});
