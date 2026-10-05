import { ITEM_BY_ID, DEFAULT_EQUIPMENT } from './catalog.js';
import { validSeed } from './finishes.js';
import { LEVEL_REWARDS } from './equipment.js';

const sources = new Set(['daily','weekly','permanent','pack','bundle']);
// These older shop items are also permanently restored by level progression.
const boundItems = new Set([...Object.values(DEFAULT_EQUIPMENT),...LEVEL_REWARDS.map(r=>r.id)]);
export const tradeKey = entry => entry.id + (entry.seed === undefined ? '' : ':' + entry.seed);
export const tradeable = item => !!item && sources.has(item.source) && !boundItems.has(item.id);
export function tradeInventory(state) {
  return [...new Set(state.owned || [])].flatMap(id => {
    const item = ITEM_BY_ID[id];
    if (!tradeable(item)) return [];
    return item.finish ? (state.patterns?.[id] || []).filter(validSeed).map(seed=>({id,seed})) : [{id}];
  });
}
export function validateOffer(entries, state) {
  if (!Array.isArray(entries) || entries.length < 1 || entries.length > 5) throw Error('Choose 1–5 items on each side.');
  const owned = new Set(tradeInventory(state).map(tradeKey)), keys = new Set();
  return entries.map(entry => {
    if (!entry || typeof entry.id !== 'string') throw Error('Invalid trade item.');
    const item = ITEM_BY_ID[entry.id], clean = item?.finish ? {id:entry.id,seed:entry.seed} : {id:entry.id};
    if (!tradeable(item) || (item.finish && !validSeed(entry.seed)) || (!item.finish && entry.seed !== undefined)) throw Error('This item cannot be traded.');
    const key = tradeKey(clean);
    if (!owned.has(key) || keys.has(key)) throw Error('A selected item is no longer available.');
    keys.add(key); return clean;
  }).sort((a,b)=>tradeKey(a).localeCompare(tradeKey(b)));
}
export function exchangeItems(sender, receiver, offered, requested) {
  const a = structuredClone(sender), b = structuredClone(receiver);
  const give = validateOffer(offered,a), take = validateOffer(requested,b);
  if (give.some(x=>take.some(y=>tradeKey(x)===tradeKey(y)))) throw Error('Choose different items for each side.');
  function remove(s, entries) {
    for (const e of entries) {
      const item = ITEM_BY_ID[e.id];
      if (item.finish) {
        s.patterns[e.id] = s.patterns[e.id].filter(seed=>seed!==e.seed);
        if (s.equipment.patterns?.[e.id] === e.seed) {
          if (s.patterns[e.id].length) s.equipment.patterns[e.id] = s.patterns[e.id][0];
          else delete s.equipment.patterns[e.id];
        }
        if (s.patterns[e.id].length) continue;
        delete s.patterns[e.id];
      }
      s.owned = s.owned.filter(id=>id!==e.id);
      if (s.equipment[item.category] === e.id) s.equipment[item.category] = DEFAULT_EQUIPMENT[item.category];
    }
  }
  function add(s, entries) {
    for (const e of entries) {
      const item = ITEM_BY_ID[e.id];
      if (item.finish) {
        s.patterns ??= {}; s.patterns[e.id] ??= [];
        if (s.patterns[e.id].includes(e.seed)) throw Error('A golfer already owns this exact pattern.');
        s.patterns[e.id].push(e.seed);
        s.equipment.patterns ??= {}; s.equipment.patterns[e.id] ??= e.seed;
      } else if (s.owned.includes(e.id)) throw Error('A golfer already owns one of the offered items.');
      if (!s.owned.includes(e.id)) s.owned.push(e.id);
    }
  }
  remove(a,give); remove(b,take); add(a,take); add(b,give);
  return {sender:a,receiver:b};
}
