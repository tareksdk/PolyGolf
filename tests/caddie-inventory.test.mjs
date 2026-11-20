import test from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, ITEMS } from '../dist/src/catalog.js';
import { caddieItems } from '../dist/src/caddie-collection.js';
import { caddieView } from '../dist/src/caddie-view.js';
import { addItem } from '../dist/src/item-stacks.js';
import { defaultSave, ProgressionManager } from '../dist/src/save.js';

test('one Caddie view contains every owned item and a jump target for each category', () => {
  const progress = new ProgressionManager({ load: defaultSave, save: () => true });
  for (const category of CATEGORIES) {
    const item = ITEMS.find(item => item.category === category.id && item.source === 'daily');
    addItem(progress.data, { id: item.id });
  }
  const html = caddieView({ progress, world: { itemThumbnail: () => 'art.png' } });
  const tiles = [...html.matchAll(/data-action="preview" data-id="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(tiles.sort(), [...progress.data.owned].sort());
  for (const { id } of CATEGORIES) {
    assert.ok(html.includes(`aria-controls="caddie-section-${id}"`));
    assert.ok(html.includes(`id="caddie-section-${id}"`));
  }
});

test('equipped items, stack counts and exact pattern search use the current bag across categories', () => {
  const data = defaultSave();
  const finish = ITEMS.find(item => item.finish);
  addItem(data, { id: finish.id, seed: 42 }, 3);
  addItem(data, { id: finish.id, seed: 420 });
  assert.equal(caddieItems(data, { category: 'all', sort: 'copies' })[0].id, finish.id);
  assert.deepEqual(caddieItems(data, { category: 'all', query: '#042' }).map(item => item.id), [finish.id]);
  assert.deepEqual(caddieItems(data, { category: 'all', query: '#043' }), []);
  const sorted = caddieItems(data, { category: 'all', sort: 'equipped' });
  assert.equal(sorted.at(-1).id, finish.id);
  assert.ok(sorted.slice(0, -1).every(item => data.equipment[item.category] === item.id));
});
