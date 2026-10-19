import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {SUPREME_BALL, redeemPreviewSupreme} from '../dist/src/supreme-ball.js';
import {ITEMS, shopAvailable, shopRotation} from '../dist/src/catalog.js';
import {tradeable} from '../dist/src/trades.js';
import {lockerPool, shopBundles} from '../dist/src/pro-shop.js';
import {ProgressionManager, defaultSave} from '../dist/src/save.js';
import {itemDescription, miniStats} from '../dist/src/equipment.js';
import {installFlagCelebration, FLAG_CELEBRATION_SECONDS} from '../dist/src/flag-celebration.js';
import {GameManager} from '../dist/src/game.js';

test('Israel ball is code-only, cannot be traded or bought, and keeps neutral physics', () => {
  const item = ITEMS.find(i => i.id === SUPREME_BALL.id);
  assert.equal(itemDescription(item), 'benjamin netanyahu');
  assert.equal(shopAvailable(item.id), false);
  assert.equal(tradeable(item), false);
  for (const rarity of ['Common','Uncommon','Rare','Epic','Legendary','Black Market'])
    assert.ok(!lockerPool(rarity).includes(item));
  assert.ok(shopBundles().every(bundle => !bundle.items.includes(item)));
  for (let day = 1; day <= 31; day++) {
    const r = shopRotation(new Date(Date.UTC(2026, 9, day)));
    assert.ok(![...r.daily, ...r.weekly, ...r.permanent].includes(item));
  }
  assert.deepEqual(miniStats({ball:item.id}), miniStats({ball:'ball-classic'}));
});

test('local preview redemption is exact, once-only, saves ownership and permits equipping', () => {
  let saved;
  const p = new ProgressionManager({load:defaultSave, save:d => { saved = structuredClone(d); return true; }});
  const coins = p.data.coins;
  assert.throws(() => redeemPreviewSupreme(p, 'Supreme'), /case-sensitive/);
  assert.ok(!p.data.owned.includes(SUPREME_BALL.id));
  assert.deepEqual(redeemPreviewSupreme(p, 'supreme').unlocked, [SUPREME_BALL.id]);
  assert.equal(p.data.coins, coins);
  p.equip(SUPREME_BALL.id);
  const loaded = new ProgressionManager({load:() => saved, save:() => true});
  assert.equal(loaded.data.equipment.ball, SUPREME_BALL.id);
  assert.throws(() => redeemPreviewSupreme(loaded, 'supreme'), /already redeemed/);
});

// Test the real Three.js scene and animation without requiring a GPU.
function world(mode = 'mini', settings = {}) {
  const previous = globalThis.OffscreenCanvas;
  globalThis.OffscreenCanvas = class {
    constructor(width, height) { this.width = width; this.height = height; }
    getContext() { return new Proxy({}, {get:(o,k) => o[k] ?? (() => {})}); }
  };
  const w = {scene:new THREE.Scene(), camera:new THREE.PerspectiveCamera(), mode:'play',
    settings, equipment:{ball:SUPREME_BALL.id}, hole:{mode}, zoom:20,
    flag:new THREE.Group(), flagPole:new THREE.Group(),
    renderGround:() => 2, load(){}, update(){}, celebrate(){this.normalCelebrations = (this.normalCelebrations || 0) + 1;}};
  w.camera.position.set(5, 8, 12);
  try { installFlagCelebration(w); } finally { globalThis.OffscreenCanvas = previous; }
  return w;
}

test('both modes celebrate at the cup, pause, clean up and only trigger for the equipped ball on sinks', () => {
  for (const mode of ['mini','golf']) {
    const w = world(mode), fx = w.flagCelebration;
    w.celebrate({x:3,z:7}, '#ffffff', false);
    assert.equal(fx.root.visible, false);
    w.equipment.ball = 'ball-classic'; w.celebrate({x:3,z:7}, '#ffffff');
    assert.equal(fx.root.visible, false);
    w.equipment.ball = SUPREME_BALL.id; w.celebrate({x:3,z:7}, '#ffffff');
    assert.equal(fx.root.visible, true);
    assert.equal(w.flag.visible, false); assert.equal(w.flagPole.visible, false);
    assert.deepEqual(fx.root.position.toArray(), [3,2.06,7]);
    w.update(.7); assert.ok(fx.sparks.count > 0); assert.ok(fx.sparks.count <= 720);
    w.presentationPaused = true; w.update(.2); assert.equal(w.flagMoment.age, .7);
    w.presentationPaused = false; w.update(FLAG_CELEBRATION_SECONDS); assert.equal(fx.root.visible, false);
    assert.equal(w.flag.visible, true); assert.equal(w.flagPole.visible, true);
    w.celebrate({x:3,z:7}, '#ffffff'); w.load({}); assert.equal(fx.root.visible, false);
    w.celebrate({x:3,z:7}, '#ffffff'); w.mode = 'menu'; w.update(.1); assert.equal(fx.root.visible, false);
  }
});

test('reduced motion and particles off retain the flag without the firework spray', () => {
  const w = world('golf', {reducedMotion:true, particles:false});
  w.celebrate({x:0,z:0}, '#ffffff'); w.update(.6);
  assert.equal(w.flagCelebration.root.visible, true);
  assert.equal(w.flagCelebration.sparks.count, 0);
});

test('scorecard waits for the flag show; a skipped hole keeps the normal timing', () => {
  const w = world();
  Object.assign(w, {canvas:{addEventListener(){}}, setAim(){}, burst(){}, hit(){}, beginSwing(){}});
  globalThis.window = {addEventListener(){}};
  globalThis.document = {addEventListener(){}};
  const g = new GameManager(w);
  g.start(0, true, {mode:'mini'}); g.physics.sunk = true; g.finishHole();
  assert.equal(g.holeReveal.remaining, FLAG_CELEBRATION_SECONDS);
  g.start(0, true, {mode:'mini'}); g.skip();
  assert.equal(g.holeReveal.remaining, 1.15);
});
