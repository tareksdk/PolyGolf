import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeCrazyGames, isCrazyGamesContext, migrateCrazyGamesSave,
  createCrazyGamesPlatform, PROGRESS_KEYS, MIGRATION_KEY } from '../dist/src/crazygames.js';
import { defaultSave, LocalSaveRepository, ProgressionManager, SAVE_KEY } from '../dist/src/save.js';
import { progressStorage, setProgressStorage } from '../dist/src/progress-storage.js';
import { readPlanetfallBoard, recordPlanetfall } from '../dist/src/planetfall.js';
import { GolfCloud } from '../dist/src/cloud.js';
import { CourseStudio } from '../dist/src/studio.js';

function storage(entries = []) {
  const values = new Map(entries), writes = [];
  return { values, writes, getItem: key => values.get(key) ?? null,
    setItem(key, value) { values.set(key, String(value)); writes.push([key, String(value)]); },
    removeItem(key) { values.delete(key); } };
}
function sdkFixture(data = storage()) {
  const calls = [], listeners = [];
  return { environment: 'crazygames', data, calls, listeners, async init() {},
    user: { addAuthListener(fn) { listeners.push(fn); } },
    game: Object.fromEntries(['loadingStart', 'loadingStop', 'gameplayStart', 'gameplayStop'].map(name => [name, () => calls.push(name)])) };
}
function targetFixture(sdk) {
  return { location: { href: 'https://littlelinks.study/?platform=crazygames', search: '?platform=crazygames', reload() {} },
    document: { referrer: '' }, CrazyGames: { SDK: sdk }, localStorage: storage() };
}

test('portal detection accepts hosted iframe flag or real portal ancestor, not lookalike domains', () => {
  assert.equal(isCrazyGamesContext(targetFixture()), true);
  for (const host of ['https://www.crazygames.com/game/polygolf', 'https://games.crazygames.com/']) {
    assert.equal(isCrazyGamesContext({location: {href: 'https://littlelinks.study/', ancestorOrigins: [host]}}), true);
  }
  assert.equal(isCrazyGamesContext({location: {href: 'https://littlelinks.study/'}, document: {referrer: 'https://crazygames.com.evil.example/'}}), false);
  assert.equal(isCrazyGamesContext({location: {href: 'http://127.0.0.1:5190/'}}), false);
});

test('normal website boot does not load or initialize the portal SDK', async () => {
  const target = targetFixture(); target.location.search = ''; target.location.href = 'https://polygolf.lol/';
  target.CrazyGames = { get SDK() { throw Error('must not access SDK'); } };
  assert.deepEqual(await initializeCrazyGames(target), {active: false});
});

test('SDK initialization finishes before any progress is read', async () => {
  let ready = false, finish;
  const sdk = sdkFixture();
  sdk.init = () => new Promise(resolve => { finish = () => { ready = true; resolve(); }; });
  sdk.data.getItem = () => { assert.equal(ready, true); return null; };
  const pending = initializeCrazyGames(targetFixture(sdk));
  assert.equal(ready, false); finish();
  const platform = await pending;
  assert.equal(platform.active, true); assert.deepEqual(sdk.calls, ['loadingStart']);
});

test('disabled, unreadable and malformed cloud saves stop boot without creating defaults', async () => {
  for (const kind of ['disabled', 'read-error', 'corrupt', 'wrong-version']) {
    const data = storage(), sdk = sdkFixture(data);
    if (kind === 'disabled') sdk.environment = 'disabled';
    if (kind === 'read-error') data.getItem = () => { throw Error('dataModuleDisabled'); };
    if (kind === 'corrupt') data.values.set(SAVE_KEY, '{broken');
    if (kind === 'wrong-version') data.values.set(SAVE_KEY, '{"version":999,"owned":[]}');
    await assert.rejects(initializeCrazyGames(targetFixture(sdk)), error => error.crazygamesSave === true);
    assert.equal(data.writes.length, 0, kind);
  }
});

test('one-time migration preserves local progress and excludes website login and caches', () => {
  const saved = defaultSave(); saved.coins = 18400; saved.xp = 500;
  const local = storage([[SAVE_KEY, JSON.stringify(saved)], ['little-links.preferences', '{"master":0.2}'],
    ['polygolf.first-swing.v1', 'done'], ['little-links.session', 'private-fixture'],
    ['polygolf.preview.large-image', 'device-cache']]);
  const data = storage(); migrateCrazyGamesSave(data, local);
  assert.deepEqual(JSON.parse(data.getItem(SAVE_KEY)), saved);
  assert.equal(data.getItem('polygolf.first-swing.v1'), 'done');
  assert.equal(local.getItem(SAVE_KEY), JSON.stringify(saved));
  assert.equal(local.getItem(MIGRATION_KEY), 'done');
  assert.ok(data.writes.every(([key]) => PROGRESS_KEYS.includes(key)));
  assert.equal(data.getItem('little-links.session'), null);
  assert.equal(data.writes.at(-1)[0], SAVE_KEY);
});

test('existing cloud progress and preferences always win over this device', () => {
  const saved = defaultSave(); saved.coins = 8300;
  const raw = JSON.stringify(saved), data = storage([[SAVE_KEY, raw], ['little-links.preferences', '{"master":0.1}']]);
  migrateCrazyGamesSave(data, storage([[SAVE_KEY, JSON.stringify(defaultSave())]]));
  assert.equal(data.getItem(SAVE_KEY), raw); assert.equal(data.writes.length, 0);
});

test('migration does not re-import a previous account save into a new empty account', () => {
  const local = storage([[SAVE_KEY, JSON.stringify(defaultSave())]]);
  migrateCrazyGamesSave(storage(), local);
  const newAccount = storage(); migrateCrazyGamesSave(newAccount, local);
  assert.equal(newAccount.writes.length, 0);
});

test('failed migration keeps the source and can retry before committing the main save', () => {
  const local = storage([[SAVE_KEY, JSON.stringify(defaultSave())], ['little-links.preferences', '{}']]);
  const data = storage(), write = data.setItem;
  data.setItem = () => { throw Error('quota'); };
  assert.throws(() => migrateCrazyGamesSave(data, local), /quota/);
  assert.equal(data.getItem(SAVE_KEY), null); assert.equal(local.getItem(MIGRATION_KEY), null);
  data.setItem = write; migrateCrazyGamesSave(data, local);
  assert.ok(data.getItem(SAVE_KEY));
});

test('earned rewards and equipment survive repository reload through the Data Module', () => {
  const data = storage(), platform = createCrazyGamesPlatform(sdkFixture(data));
  const player = new ProgressionManager(new LocalSaveRepository(platform.storage));
  player.award(1200, 550); player.save();
  const next = new ProgressionManager(new LocalSaveRepository(platform.storage));
  assert.equal(next.data.coins, player.data.coins);
  assert.equal(next.data.xp, 550); assert.deepEqual(next.data.owned, player.data.owned);
  assert.deepEqual(next.data.equipment, player.data.equipment);
});

test('account switches lock all old writes, including pagehide saves, before reload', () => {
  const sdk = sdkFixture(); let reloaded = false;
  const platform = createCrazyGamesPlatform(sdk, () => { reloaded = true; });
  const repo = new LocalSaveRepository(platform.storage);
  const old = repo.load(); old.coins = 9999;
  sdk.listeners[0]({userId: 'different-player'});
  assert.equal(reloaded, true); assert.equal(platform.locked, true);
  assert.equal(repo.save(old), false); assert.equal(sdk.data.writes.length, 0);
});

test('save failures report failure instead of silently falling back to device storage', () => {
  const sdk = sdkFixture(); sdk.data.setItem = () => { throw Error('dataLimitExceeded'); };
  const repo = new LocalSaveRepository(createCrazyGamesPlatform(sdk).storage);
  assert.equal(repo.save(defaultSave()), false); assert.ok(repo.error);
});

test('gameplay events follow play, pause, completion and restart without duplicate starts', () => {
  const sdk = sdkFixture(), p = createCrazyGamesPlatform(sdk);
  p.loadingComplete();
  for (const state of ['menu','playing','playing','paused','playing','complete','finished','menu','playing']) p.updateGameplay(state);
  assert.deepEqual(sdk.calls, ['loadingStop','gameplayStart','gameplayStop','gameplayStart','gameplayStop','gameplayStart']);
});

test('Planetfall records use the same portal storage as golfer progress', () => {
  const data = storage(); setProgressStorage(data);
  try {
    recordPlanetfall({id:'portal-run',name:'Golfer',reached:2,shots:3,time:40,date:1});
    assert.equal(progressStorage(), data); assert.equal(readPlanetfallBoard()[0].reached, 2);
  } finally { setProgressStorage(undefined); }
});

test('portal solo rounds never restore website accounts or replace the Data Module repository', async () => {
  const repo = new LocalSaveRepository(storage()), ui = {platform:{active:true},progress:{repository:repo}};
  const cloud = new GolfCloud(ui);
  await cloud.restore(); await cloud.ensureGuest();
  assert.equal(cloud.session, null); assert.equal(ui.progress.repository, repo);
  await assert.rejects(cloud.call('guest'), /not available in this CrazyGames build/);
});

test('map save quota failures keep the saved collection intact and do not report success', async () => {
  const messages = [], editor = Object.create(CourseStudio.prototype);
  editor.ui = {progress:{level:{level:20}},toast: message => messages.push(message),render() {}};
  editor.cfg = {savedKey:'little-links.maps'};
  editor.saved = [{name:'Existing map'}]; editor.draft = {name:'New map'};
  setProgressStorage({setItem() { throw Error('quota'); }});
  try {
    await editor.action('editor-save');
    assert.deepEqual(editor.saved, [{name:'Existing map'}]);
    assert.equal(messages.length, 1); assert.match(messages[0], /full or unavailable/);
  } finally { setProgressStorage(undefined); }
});
