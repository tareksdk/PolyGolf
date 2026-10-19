import test from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS } from '../dist/src/catalog.js';
import { defaultSave, ProgressionManager } from '../dist/src/save.js';
import { addItem, removeItem, itemCount, totalItemCount } from '../dist/src/item-stacks.js';
import { tradeUp, tradeUpEligible } from '../dist/src/trade-ups.js';
import { GOLF_COURSES, getGolfHole } from '../dist/src/golf-courses.js';

const progress = () => new ProgressionManager({ load: defaultSave, save: () => true });

test('live trade-ups consume ten stacked items once and reject incomplete selections without changing inventory', () => {
  const p = progress();
  const item = ITEMS.find(i => i.rarity === 'Uncommon' && !i.finish && tradeUpEligible(i));
  assert.ok(item);
  const entry = { id: item.id };
  addItem(p.data, entry, 10);
  const before = structuredClone(p.data);
  assert.throws(() => tradeUp(p, [{ ...entry, quantity: 9 }], 'short-trade-up-12345', () => 0), /exactly ten/);
  assert.deepEqual(p.data, before);
  const entries = [{ ...entry, quantity: 10 }];
  const receipt = tradeUp(p, entries, 'valid-trade-up-12345', () => 0);
  assert.equal(itemCount(p.data, entry), 0);
  assert.equal(receipt.rarity, 'Rare');
  const after = structuredClone(p.data);
  assert.deepEqual(tradeUp(p, entries, 'valid-trade-up-12345', () => .9), receipt);
  assert.deepEqual(p.data, after);
});

test('live patterned stacks preserve other finishes when a stack is removed', () => {
  const p = progress(), item = ITEMS.find(i => i.finish);
  assert.ok(item);
  const a = { id: item.id, seed: 123 }, b = { id: item.id, seed: 456 };
  addItem(p.data, a, 3); addItem(p.data, b, 2);
  assert.equal(totalItemCount(p.data, item.id), 5);
  removeItem(p.data, a, 3);
  assert.equal(itemCount(p.data, a), 0);
  assert.equal(itemCount(p.data, b), 2);
  assert.ok(p.data.owned.includes(item.id));
});

test('live Sky Islands and Darby rewards remain available after the clubhouse release', () => {
  assert.equal(GOLF_COURSES[17].name, 'Aetherfall Isles');
  for (let h = 0; h < 3; h++) {
    const hole = getGolfHole(17, h);
    assert.ok(Number.isFinite(hole.start.x) && Number.isFinite(hole.cup.z));
  }
  const p = progress();
  assert.equal(p.discoverDarby(), true);
  assert.ok(p.data.owned.includes('nameplate-darby'));
  const after = structuredClone(p.data);
  assert.equal(p.discoverDarby(), false);
  assert.deepEqual(p.data, after);
});
