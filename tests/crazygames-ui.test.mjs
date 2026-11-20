import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioManager } from '../dist/src/audio.js';
import { defaultSave, ProgressionManager } from '../dist/src/save.js';
import { createCrazyGamesPlatform } from '../dist/src/crazygames.js';
import { installCrazyGamesUI } from '../dist/src/crazygames-ui.js';
import { homeMenu } from '../dist/src/home-menu.js';
import { socialRewards } from '../dist/src/social-view.js';

test('portal navigation and fullscreen actions cannot bypass removed controls', () => {
  let calls = 0;
  const node = {dataset:{action:'fullscreen'},remove() { this.removed = true; }};
  const root = {querySelectorAll: selector => selector === '[data-action]' ? [node] : []};
  globalThis.document = {body:{dataset:{}}};
  const ui = {platform:{active:true},root,modalRoot:root,render() {},modal() {},action() { calls++; },navigate() { calls++; }};
  installCrazyGamesUI(ui);
  assert.equal(node.removed, true);
  for (const action of ['fullscreen','multiplayer','competitive','community','editor-publish']) {
    ui.action(action); ui.navigate(action);
  }
  assert.equal(calls, 0);
  ui.action('shop-shelf', {id:'coins'}); ui.action('shop-code'); ui.action('visit-social');
  assert.equal(calls, 0);
  ui.action('daily'); ui.navigate('garage'); assert.equal(calls, 2);
});

test('portal cleanup leaves ordinary website handlers unchanged', () => {
  const original = () => {};
  const ui = {platform:{active:false},action:original};
  installCrazyGamesUI(ui); assert.equal(ui.action, original);
});

test('portal home removes online launch tiles and social rewards remain ordinary-site only', () => {
  const progress = new ProgressionManager({load:defaultSave,save:()=>true});
  const ui = {platform:{active:true},progress,cloud:{session:null}};
  assert.doesNotMatch(homeMenu(ui), /data-action="(?:competitive|multiplayer)"/);
  assert.doesNotMatch(homeMenu(ui), /Create account|Collect free coins/);
  const links = socialRewards(ui);
  assert.match(links, /discord.gg/); assert.doesNotMatch(links, /visit-social|1,000|instagram/);
  ui.platform.active = false;
  assert.match(homeMenu(ui), /data-action="multiplayer"/);
  assert.match(socialRewards(ui), /1,000/);
});

test('platform muting survives volume changes and restores the chosen volume on unmute', () => {
  const settings = {...defaultSave().settings,master:.65};
  const audio = new AudioManager(settings), values = [];
  audio.ctx = {currentTime:0};
  audio.master = {gain:{setValueAtTime: value => values.push(value),cancelScheduledValues() {},setTargetAtTime: value => values.push(value)}};
  audio.music = audio.effects = {gain:{setTargetAtTime() {}}};
  audio.setPlatformMuted(true); audio.apply({...settings,master:1});
  assert.deepEqual(values,[0,0]);
  audio.setPlatformMuted(false); assert.equal(values.at(-1),1);
});

test('SDK settings control audio initially and when platform settings change', () => {
  let listener, muted;
  const sdk = {user:{addAuthListener() {}},game:{settings:{muteAudio:true},addSettingsChangeListener(fn) {listener=fn;}}};
  createCrazyGamesPlatform(sdk).bindAudio({setPlatformMuted(value) {muted=value;}});
  assert.equal(muted,true); listener({muteAudio:false}); assert.equal(muted,false);
});
