import { ITEM_BY_ID, DEFAULT_EQUIPMENT } from './catalog.js';
import { validSeed } from './finishes.js';

export const stackKey = e => e.id + (e.seed === undefined ? '' : ':' + e.seed);
export const MAX_STACK = 1_000_000;
export function itemCount(state, entry) {
  if (!state.owned?.includes(entry.id)) return 0;
  const item = ITEM_BY_ID[entry.id];
  if (!item || (item.finish && !state.patterns?.[entry.id]?.includes(entry.seed))) return 0;
  const n = state.itemCounts?.[stackKey(entry)];
  return Number.isSafeInteger(n) && n > 0 ? Math.min(n, MAX_STACK) : 1;
}
export function totalItemCount(state, id) {
  return ITEM_BY_ID[id]?.finish ? (state.patterns?.[id] || []).reduce((n, seed) => n + itemCount(state, {id, seed}), 0) : itemCount(state, {id});
}
export function normalizeStacks(state) {
  const counts = {};
  for (const id of state.owned || []) {
    const entries = ITEM_BY_ID[id]?.finish ? (state.patterns?.[id] || []).map(seed => ({id, seed})) : [{id}];
    for (const e of entries) { const n = itemCount(state, e); if (n > 1) counts[stackKey(e)] = n; }
  }
  state.itemCounts = counts;
  return state;
}
function quantity(n) {
  if (!Number.isSafeInteger(n) || n < 1 || n > MAX_STACK) throw Error('Choose a valid whole item quantity.');
}
export function addItem(state, entry, amount = 1) {
  quantity(amount);
  const item = ITEM_BY_ID[entry.id];
  if (!item || (item.finish ? !validSeed(entry.seed) : entry.seed !== undefined)) throw Error('Invalid item or pattern.');
  const before = itemCount(state, entry), next = before + amount;
  if (next > MAX_STACK) throw Error('This item stack is full.');
  state.itemCounts ??= {};
  if (next > 1) state.itemCounts[stackKey(entry)] = next;
  else delete state.itemCounts[stackKey(entry)];
  if (!state.owned.includes(entry.id)) state.owned.push(entry.id);
  if (item.finish) {
    state.patterns ??= {}; state.patterns[entry.id] ??= [];
    if (!state.patterns[entry.id].includes(entry.seed)) state.patterns[entry.id].push(entry.seed);
    state.equipment.patterns ??= {}; state.equipment.patterns[entry.id] ??= entry.seed;
  }
  return next;
}
export function removeItem(state, entry, amount = 1) {
  quantity(amount);
  const before = itemCount(state, entry);
  if (before < amount) throw Error('A selected item is no longer available in that quantity.');
  state.itemCounts ??= {};
  if (before > amount) {
    if (before-amount > 1) state.itemCounts[stackKey(entry)] = before - amount;
    else delete state.itemCounts[stackKey(entry)];
    return;
  }
  delete state.itemCounts[stackKey(entry)];
  const item = ITEM_BY_ID[entry.id];
  if (item.finish) {
    state.patterns[entry.id] = state.patterns[entry.id].filter(seed => seed !== entry.seed);
    if (state.equipment.patterns?.[entry.id] === entry.seed) {
      if (state.patterns[entry.id].length) state.equipment.patterns[entry.id] = state.patterns[entry.id][0];
      else delete state.equipment.patterns[entry.id];
    }
    if (state.patterns[entry.id].length) return;
    delete state.patterns[entry.id];
  }
  state.owned = state.owned.filter(id => id !== entry.id);
  if (state.equipment[item.category] === entry.id) state.equipment[item.category] = DEFAULT_EQUIPMENT[item.category];
}
