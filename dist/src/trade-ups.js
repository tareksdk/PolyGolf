import { ITEMS, ITEM_BY_ID } from './catalog.js';
import { tradeable } from './trades.js';
import { stackKey, itemCount, addItem, removeItem } from './item-stacks.js';
import { validSeed, rollPattern } from './finishes.js';
import { halloweenActive } from './season.js';

export const TRADE_UP_RARITIES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Black Market'];
export const TRADE_UP_SIZE = 10;
export function tradeUpPool(rarity, now = Date.now()) {
  const next = TRADE_UP_RARITIES[TRADE_UP_RARITIES.indexOf(rarity) + 1];
  if (!TRADE_UP_RARITIES.includes(rarity) || !next) return [];
  return ITEMS.filter(i => i.rarity === next && tradeable(i) && !i.secret && (i.crate !== 'halloween' || halloweenActive(now)));
}
export function tradeUpEligible(item, now = Date.now()) {
  return tradeable(item) && !item.secret && tradeUpPool(item.rarity, now).length > 0;
}
export function tradeUp(progress, entries, requestId, random, now = Date.now()) {
  if (typeof requestId !== 'string' || !/^[a-zA-Z0-9-]{16,64}$/.test(requestId)) throw Error('Invalid trade-up request.');
  if (!Array.isArray(entries) || !entries.length || entries.length > 10) throw Error('Select ten items of the same rarity.');
  const clean = entries.map(e => ({id: e?.id, ...(e?.seed === undefined ? {} : {seed:e.seed}), quantity:e?.quantity ?? 1})).sort((a,b) => stackKey(a).localeCompare(stackKey(b)));
  const signature = JSON.stringify(clean), previous = progress.data.tradeUpReceipts?.find(r => r.requestId === requestId);
  if (previous) { if (previous.signature !== signature) throw Error('Trade-up request was already used.'); return previous; }
  const rarity = ITEM_BY_ID[clean[0].id]?.rarity, keys = new Set();
  let count = 0;
  for (const e of clean) {
    const item = ITEM_BY_ID[e.id], key = stackKey(e);
    if (!tradeUpEligible(item, now) || item.rarity !== rarity || (item.finish ? !validSeed(e.seed) : e.seed !== undefined) || keys.has(key)) throw Error('Choose tradable items of one rarity. Special rewards cannot be traded up.');
    if (!Number.isSafeInteger(e.quantity) || e.quantity < 1 || e.quantity > 10 || e.quantity > itemCount(progress.data, e)) throw Error('A selected item is no longer available in that quantity.');
    keys.add(key); count += e.quantity;
  }
  if (count !== TRADE_UP_SIZE) throw Error('Select exactly ten items of the same rarity.');
  const pool = tradeUpPool(rarity, now), roll = random();
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) throw Error('Invalid trade-up roll.');
  const item = pool[Math.floor(roll * pool.length)], reward = {id:item.id, ...(item.finish ? {seed:rollPattern(random)} : {})};
  const draft = structuredClone(progress.data);
  for (const e of clean) removeItem(draft, e, e.quantity);
  const quantity = addItem(draft, reward);
  const receipt = {requestId, signature, reward, quantity, rarity:item.rarity};
  draft.tradeUpReceipts = [...(draft.tradeUpReceipts || []), receipt].slice(-100);
  Object.assign(progress.data, draft); progress.save();
  return receipt;
}
