import { ITEM_BY_ID, DEFAULT_EQUIPMENT } from './catalog.js';
import { validSeed } from './finishes.js';
import { LEVEL_REWARDS } from './equipment.js';
import { itemCount, addItem, removeItem, MAX_STACK } from './item-stacks.js';

const sources = new Set(['daily','weekly','permanent','pack','bundle']);
// These older shop items are also permanently restored by level progression.
const boundItems = new Set([...Object.values(DEFAULT_EQUIPMENT),...LEVEL_REWARDS.map(r=>r.id)]);
export const tradeKey = entry => entry.id + (entry.seed === undefined ? '' : ':' + entry.seed);
export const tradeable = item => !!item && sources.has(item.source) && !boundItems.has(item.id);
export function tradeInventory(state) {
  return [...new Set(state.owned || [])].flatMap(id => {
    const item = ITEM_BY_ID[id];
    if (!tradeable(item)) return [];
    const entries = item.finish ? (state.patterns?.[id] || []).filter(validSeed).map(seed=>({id,seed})) : [{id}];
    return entries.map(e => { const quantity = itemCount(state,e); return quantity > 1 ? {...e,quantity} : e; });
  });
}
export const MAX_TRADE_COINS = 1_000_000_000;
export function validateCoins(coins, state) {
  if (!Number.isSafeInteger(coins) || coins < 0 || coins > MAX_TRADE_COINS) throw Error('Enter a whole coin amount between 0 and 1,000,000,000.');
  if (coins > (state.coins || 0)) throw Error('A golfer no longer has enough coins for this offer.');
  return coins;
}
export function validateOffer(entries, state, coins = 0) {
  validateCoins(coins, state);
  if (!Array.isArray(entries) || entries.length > 5 || (!entries.length && !coins)) throw Error('Choose up to five items or add coins on each side.');
  const keys = new Set();
  return entries.map(entry => {
    if (!entry || typeof entry.id !== 'string') throw Error('Invalid trade item.');
    const item = ITEM_BY_ID[entry.id], clean = item?.finish ? {id:entry.id,seed:entry.seed} : {id:entry.id};
    if (!tradeable(item) || (item.finish && !validSeed(entry.seed)) || (!item.finish && entry.seed !== undefined)) throw Error('This item cannot be traded.');
    const key = tradeKey(clean);
    const quantity = entry.quantity ?? 1;
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_STACK || quantity > itemCount(state,clean) || keys.has(key)) throw Error('A selected item is no longer available in that quantity.');
    keys.add(key); return quantity > 1 ? {...clean,quantity} : clean;
  }).sort((a,b)=>tradeKey(a).localeCompare(tradeKey(b)));
}
export function exchangeItems(sender, receiver, offered, requested, offeredCoins = 0, requestedCoins = 0) {
  const a = structuredClone(sender), b = structuredClone(receiver);
  const give = validateOffer(offered,a,offeredCoins), take = validateOffer(requested,b,requestedCoins);
  // Validate the original balances. Incoming coins cannot fund the same offer.
  a.coins = (a.coins || 0) - offeredCoins + requestedCoins;
  b.coins = (b.coins || 0) - requestedCoins + offeredCoins;
  if (!Number.isSafeInteger(a.coins) || !Number.isSafeInteger(b.coins)) throw Error('This exchange would exceed the coin balance limit.');
  if (give.some(x=>take.some(y=>tradeKey(x)===tradeKey(y)))) throw Error('Choose different items for each side.');
  for (const e of give) removeItem(a,e,e.quantity||1);
  for (const e of take) removeItem(b,e,e.quantity||1);
  for (const e of take) addItem(a,e,e.quantity||1);
  for (const e of give) addItem(b,e,e.quantity||1);
  return {sender:a,receiver:b};
}
