import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultSave, ProgressionManager } from '../dist/src/save.js';
import { LOCKERS, lockerContents, availableLockers, shopBundles } from '../dist/src/pro-shop.js';
import { shopRotation } from '../dist/src/catalog.js';
import { memberRotation, memberPrice, nextMemberRotation } from '../dist/src/equipment.js';
import { lockerDetail, shopView } from '../dist/src/shop-view.js';
import { visibleTrades, tradingView, installTrading } from '../dist/src/trading-ui.js';
import { header, profileView } from '../dist/src/views.js';
import { homeMenu } from '../dist/src/home-menu.js';

const progress = () => new ProgressionManager({ load: defaultSave, save: () => true });

test('the continuous shop includes every rotating item, bundle and available locker without revisiting a section', () => {
  const now = new Date('2026-11-19T17:00:00Z');
  const ui = { screen: 'shop', progress: progress(), world: { itemThumbnail: () => 'art.png' }, cloud: { session: null } };
  ui.progress.data.lockers = { halloween: 1 };
  const html = shopView(ui, now);
  assert.doesNotMatch(html, /data-shop-section="rewards"/);
  const idsFor = action => [...html.matchAll(new RegExp(`data-action="${action}"\\s+data-id="([^"]+)"`, 'g'))]
    .map(match => match[1]).sort();
  const { featured, daily, weekly, permanent } = shopRotation(now);
  assert.deepEqual(idsFor('item-detail'), [...featured, ...daily, ...weekly, ...permanent].map(item => item.id).sort());
  const members = memberRotation(now);
  assert.deepEqual(idsFor('member-offer'), members.map(item => item.id).sort());
  assert.ok(members.every(item => html.includes(memberPrice(item).toLocaleString())));
  assert.equal(new Date(nextMemberRotation(now)).toISOString(), '2026-11-26T00:00:00.000Z');
  assert.deepEqual(idsFor('bundle-detail'), shopBundles(now).map(bundle => bundle.id).sort());
  assert.deepEqual(
    [...new Set(idsFor('locker-detail'))],
    [...availableLockers(now).map(locker => locker.id), 'halloween'].sort(),
  );
});

test('the home and clubhouse share three More groups while personal links live on Account', () => {
  const ui = { progress: progress(), screen: 'auctions', cloud: { session: null } };
  const actions = html => [...html.matchAll(/data-action="([^"]+)"/g)].map(match => match[1]);
  for (const html of [homeMenu(ui), header(ui)]) {
    const more = html.match(/<details class="[^"]*more-navigation"[\s\S]*?<\/details>/)[0];
    assert.deepEqual(actions(more), ['multiplayer', 'competitive', 'leaderboards', 'editor', 'community', 'trades', 'auctions', 'club-pass']);
    assert.match(more, /aria-selected="true" tabindex="0">Trading<\/button>/);
    assert.doesNotMatch(html, /data-action="(?:achievements|friends|auth-mode|account)"/);
  }
  const account = actions(profileView({ ...ui, screen: 'profile' }));
  for (const action of ['account', 'achievements', 'friends', 'daily']) assert.ok(account.includes(action));
  const portal = header({ ...ui, platform: { active: true } });
  assert.doesNotMatch(portal, /data-action="(?:multiplayer|competitive|leaderboards|community|trades|auctions)"/);
  assert.match(portal, /data-action="editor"/);
  assert.match(portal, /data-action="club-pass"/);
});

test('every locker catalog includes every eligible reward exactly once', () => {
  const ui = { progress: progress(), world: { itemThumbnail: () => 'art.png' } };
  for (const locker of LOCKERS) {
    const expected = lockerContents(locker.id).flatMap(group => group.items.map(item => item.id)).sort();
    const html = lockerDetail(ui, locker.id);
    const actual = [...html.matchAll(/data-action="item-detail" data-id="([^"]+)"/g)].map(match => match[1]).sort();
    assert.deepEqual(actual, expected, locker.id);
    assert.equal(new Set(actual).size, actual.length);
  }
});

test('offer filters separate incoming pending, outgoing pending and completed history', () => {
  const trades = [
    { id: 'incoming', sender_id: 'friend', receiver_id: 'me', status: 'pending' },
    { id: 'outgoing', sender_id: 'me', receiver_id: 'friend', status: 'pending' },
    { id: 'finished', sender_id: 'friend', receiver_id: 'me', status: 'accepted' },
    { id: 'expired', sender_id: 'me', receiver_id: 'friend', status: 'expired' },
  ];
  const ids = filter => visibleTrades(trades, 'me', filter).map(trade => trade.id);
  assert.deepEqual(ids('received'), ['incoming']);
  assert.deepEqual(ids('sent'), ['outgoing']);
  assert.deepEqual(ids('history'), ['finished', 'expired']);
  assert.deepEqual(ids('all'), trades.map(trade => trade.id));
  assert.equal(trades.length, 4);
});

test('failed inbox refresh clears loading, exposes retry and retains existing offers', async () => {
  const previous = globalThis.document;
  globalThis.document = { addEventListener() {} };
  const data = [{ id: 'existing', receiver_id: 'me', status: 'pending' }];
  const ui = {
    render() {}, action() {}, closeModal() {}, navigate() {}, toast() {},
    game: { state: 'playing' }, progress: { level: { level: 10 } },
    cloud: { session: { user: { id: 'me' } }, call: async () => { throw Error('Connection unavailable'); } },
  };
  try {
    installTrading(ui);
    ui.render();
    ui.tradesData = data;
    await ui.action('trades-refresh');
    assert.equal(ui.tradesLoading, false);
    assert.equal(ui.tradesError, 'Connection unavailable');
    assert.equal(ui.tradesData, data);
  } finally { globalThis.document = previous; }
});

test('localhost Trading opens without account calls and explains its online requirement', async () => {
  const previous = globalThis.document;
  globalThis.document = { addEventListener() {} };
  let screen, calls = 0;
  const ui = {
    render() {}, action() {}, closeModal() {}, navigate(value) { screen = value; },
    screen: 'trades', progress: progress(),
    cloud: { localPreview: true, session: null, call: async () => { calls++; } },
  };
  try {
    installTrading(ui);
    await ui.action('trades');
    assert.equal(screen, 'trades');
    assert.equal(calls, 0);
    const html = tradingView(ui);
    assert.match(html, /LOCAL PREVIEW/);
    assert.match(html, /require an online account/);
    assert.match(html, /Browse your collection/);
  } finally { globalThis.document = previous; }
});
