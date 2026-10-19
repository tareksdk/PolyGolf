import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultSave, ProgressionManager } from '../dist/src/save.js';
import { LOCKERS, lockerContents } from '../dist/src/pro-shop.js';
import { lockerDetail } from '../dist/src/shop-view.js';
import { visibleTrades, tradingView, installTrading } from '../dist/src/trading-ui.js';

const progress = () => new ProgressionManager({ load: defaultSave, save: () => true });

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
