import { ITEMS, ITEM_BY_ID, dayNumber } from "./catalog.js";
import { rollPattern } from './finishes.js';
import { addItem, itemCount } from './item-stacks.js';
import { halloweenActive } from './season.js';
import { levelInfo } from './save.js';
import { recordLockerOpening } from './locker-milestones.js';
// Every locker discloses complete odds. Rarity is rolled first, then each item inside that
// rarity has an equal chance. Lockers never contain Country Club, bundle or Alpha items.
export const LOCKERS = [

  { id:'forge', name:'Forge Locker', price:6500, crate:'workshop', color:'#2d4964', pattern:'#c5a15e', gem:'#679fca', tier:'Legendary',
    tagline:'Numbered finishes. 8% Case Hardened: gold, blue and everything between.',
    odds:{ Rare:64, Epic:28, Legendary:8 } },
  { id:'workshop', name:'Workshop Locker', price:2800, crate:'workshop', color:'#657260', pattern:'#d0c5a4', gem:'#b7c796', tier:'Rare',
    tagline:'Camo, stripes, folded steel and a 2% chance of Case Hardened.',
    odds:{ Uncommon:40, Rare:43, Epic:15, Legendary:2 } },
  {
    id: "fairway",
    name: "Fairway Locker",
    price: 1500,
    color: "#698a64",
    pattern: "#e1c38b",
    gem: "#a6d58f",
    tier: "Uncommon",
    tagline: "The everyday locker. Finishes from the original collection.",
    odds: { Uncommon: 46, Rare: 40, Epic: 12, Legendary: 1.8, "Black Market": 0.2 },
  },
  {
    id: "tour",
    name: "Tour Locker",
    price: 4500,
    color: "#b5995b",
    pattern: "#f1dfae",
    gem: "#7fc0d6",
    tier: "Rare",
    tagline: "No Uncommons. Better odds at Epic and Legendary finishes.",
    odds: { Uncommon: 0, Rare: 65, Epic: 29, Legendary: 5.6, "Black Market": 0.4 },
  },
  {
    id: "oddities",
    name: "Oddities Locker",
    price: 3200,
    crate: "oddities",
    color: "#c8553d",
    pattern: "#f4e3c0",
    gem: "#f2c45a",
    tier: "Epic",
    tagline: "Novelty clubs only: oars, flamingos, frying pans and more.",
    odds: { Rare: 62, Epic: 30, Legendary: 7, "Black Market": 1 },
  },
  {
    id: "long-game",
    name: "Long Game Locker",
    price: 2250,
    categories: ["driver", "ball"],
    color: "#3f6f8f",
    pattern: "#e7d7aa",
    gem: "#9fd6e8",
    tier: "Rare",
    tagline: "Drivers and balls from the locker-exclusive collection.",
    odds: { Uncommon: 40, Rare: 44, Epic: 13, Legendary: 2.6, "Black Market": 0.4 },
  },
  {
    id: "short-game",
    name: "Short Game Locker",
    price: 2250,
    categories: ["club", "ball"],
    color: "#5b7f55",
    pattern: "#efe3bd",
    gem: "#c3df8f",
    tier: "Rare",
    tagline: "Putters and balls from the locker-exclusive collection.",
    odds: { Uncommon: 40, Rare: 44, Epic: 13, Legendary: 2.6, "Black Market": 0.4 },
  },
  {
    id: "showtime",
    name: "Showtime Locker",
    price: 1950,
    categories: ["trail", "hole", "emote", "nameplate"],
    color: "#8a6aa6",
    pattern: "#f2d98f",
    gem: "#f5b5cf",
    tier: "Epic",
    tagline: "Trails, hole finishes, salutes and nameplates.",
    odds: { Uncommon: 44, Rare: 40, Epic: 13, Legendary: 3 },
  },
  {
    id: "champions",
    name: "Champions Locker",
    price: 15000,
    color: "#2f3b4f",
    pattern: "#e2bd62",
    gem: "#f2c45a",
    tier: "Legendary",
    tagline: "Epic or better, every time.",
    odds: { Epic: 75, Legendary: 23, "Black Market": 2 },
  },
  {id:'halloween',name:'Halloween Locker',price:3200,crate:'halloween',color:'#493748',pattern:'#d78b3b',gem:'#dfc086',tier:'Epic',tagline:'Harvest finishes, ghostly gear and a chance at the Eclipse Ball.',odds:{Uncommon:35,Rare:40,Epic:20,Legendary:4.5,'Black Market':.5}},
];
export function lockerPool(rarity, id = "fairway") {
  const pack = LOCKERS.find((p) => p.id === id) || LOCKERS[0];
  return ITEMS.filter(
    (i) =>
      i.source === "pack" &&
      i.rarity === rarity &&
      (pack.crate ? i.crate === pack.crate : !i.crate) &&
      (!pack.categories || pack.categories.includes(i.category)),
  );
}
export function lockerContents(id) {
  const pack = LOCKERS.find((p) => p.id === id);
  if (!pack) return [];
  return Object.entries(pack.odds)
    .filter(([, weight]) => weight > 0)
    .map(([rarity, weight]) => {
      const items = lockerPool(rarity, id);
      return { rarity, weight, items, each: weight / items.length };
    });
}
export function rollLocker(id, rarityRoll, itemRoll) {
  const pack = LOCKERS.find((p) => p.id === id);
  if (!pack || ![rarityRoll, itemRoll].every((n) => Number.isFinite(n) && n >= 0 && n < 1))
    throw Error("Invalid locker.");
  let threshold = 0,
    rarity;
  for (const [r, weight] of Object.entries(pack.odds)) {
    threshold += weight / 100;
    if (rarityRoll < threshold) {
      rarity = r;
      break;
    }
  }
  rarity ||= Object.entries(pack.odds).filter(([, w]) => w > 0).at(-1)[0];
  const pool = lockerPool(rarity, id);
  if (!pool.length) throw Error("This locker is unavailable.");
  return pool[Math.floor(itemRoll * pool.length)];
}
export function availableLockers(now=Date.now()) { return LOCKERS.filter(p=>p.id!=='halloween'||halloweenActive(now)); }
export function lockerOpenLimit(xp) {
  const level = levelInfo(xp).level;
  return level >= 20 ? 10 : level >= 15 ? 5 : level >= 10 ? 3 : level >= 5 ? 2 : 1;
}
export function lockerQuote(data, id, count = 1, now = Date.now()) {
  const pack = LOCKERS.find(p => p.id === id);
  if (!pack) throw Error('Unknown locker.');
  if (!Number.isInteger(count) || count < 1 || count > 10) throw Error('Choose between 1 and 10 lockers.');
  const earned = Math.min(count, Math.max(0, data.lockers?.[id] || 0));
  const paid = count - earned, cost = paid * pack.price;
  const available = !paid || id !== 'halloween' || halloweenActive(now);
  return { count, earned, paid, cost, available, affordable: available && data.coins >= cost };
}
// One receipt and one save for the entire batch. A failed roll cannot partially charge a player.
export function openLockers(progress, id, count, requestId, random, now = Date.now()) {
  if (typeof requestId !== 'string' || !/^[-a-zA-Z0-9]{16,64}$/.test(requestId)) throw Error('Invalid opening request.');
  const d = progress.data;
  const previous = d.lockerBatches?.find(r => r.requestId === requestId);
  if (previous) {
    if (previous.pack !== id || previous.count !== count) throw Error('Opening request was already used.');
    return previous;
  }
  if (d.lockerReceipts?.some(r => r.requestId === requestId)) throw Error('Opening request was already used.');
  if (d.lockerReceipts?.some(r => r.requestId.startsWith(`batch-${requestId}-`))) throw Error('Opening request was already used.');
  if (!Number.isInteger(count) || count < 1 || count > lockerOpenLimit(d.xp))
    throw Error(`Your level allows up to ${lockerOpenLimit(d.xp)} lockers at once.`);
  const quote = lockerQuote(d, id, count, now);
  if (!quote.available) throw Error('The Halloween event has ended. You can still open Halloween lockers you already own.');
  if (!quote.affordable) throw Error(`You need ${(quote.cost - d.coins).toLocaleString()} more coins for this opening.`);
  const draft = { data: structuredClone(d), save() {} };
  const items = Array.from({ length: count }, (_, i) => openLocker(draft, id, `batch-${requestId}-${i}`, random, now));
  const receipt = { requestId, pack: id, count, items, cost: quote.cost, refund: items.reduce((sum, r) => sum + r.refund, 0) };
  draft.data.lockerBatches = [...(draft.data.lockerBatches || []), receipt].slice(-50);
  Object.assign(d, draft.data);
  progress.save();
  return receipt;
}
export function openLocker(progress, id, requestId, random, now=Date.now()) {
  if (typeof requestId !== "string" || !/^[-a-zA-Z0-9]{16,80}$/.test(requestId))
    throw Error("Invalid opening request.");
  const d = progress.data;
  if (d.lockerBatches?.some(r => r.requestId === requestId)) throw Error('Opening request was already used.');
  d.lockerReceipts ??= [];
  const previous = d.lockerReceipts.find((r) => r.requestId === requestId);
  if (previous) {
    if (previous.pack !== id) throw Error("Opening request was already used.");
    return previous;
  }
  const pack = LOCKERS.find((p) => p.id === id);
  if (!pack) throw Error("Unknown locker.");
  const earned = (d.lockers?.[id] || 0) > 0;
  if (!earned && id==='halloween' && !halloweenActive(now)) throw Error('The Halloween event has ended. You can still open Halloween lockers you already own.');
  if (!earned && d.coins < pack.price) throw Error("Earn more tokens before opening this locker.");
  const item = rollLocker(id, random(), random()),
    seed = item.finish ? rollPattern(random) : undefined,
    entry = {id:item.id, ...(item.finish ? {seed} : {})},
    duplicate = itemCount(d, entry) > 0,
    refund = 0;
  const quantity = addItem(d, entry);
  if (earned) d.lockers[id]--;
  else d.coins -= pack.price - refund;
  if (!d.owned.includes(item.id)) d.owned.push(item.id);
  recordLockerOpening(d);
  const receipt = { requestId, pack: id, item: item.id, duplicate, refund, quantity, earned, ...(item.finish ? { seed } : {}) };
  d.lockerReceipts.push(receipt);
  d.lockerReceipts = d.lockerReceipts.slice(-100);
  progress.save();
  return receipt;
}
const values = { Uncommon: 2400, Rare: 6800, Epic: 18200, Legendary: 54600, "Black Market": 88400 };
export function shopBundles(now = new Date()) {
  const week = Math.floor((dayNumber(now) + 3) / 7),
    ids = [
      ...new Set(ITEMS.filter((i) => i.source === "bundle").map((i) => i.id.split("-edition-")[1])),
    ].sort((a, b) => Number(a) - Number(b));
  return [0, 1, 2].map((offset) => {
    const edition = ids[(week * 3 + offset) % ids.length],
      items = ITEMS.filter((i) => i.source === "bundle" && i.id.endsWith("-edition-" + edition)),
      first = items[0];
    return {
      id: "collection-" + edition,
      name: first.name.replace(/ (Ball|Putter|Driver|Trail|Finish|Salute|Plate)$/, "") + " Collection",
      items,
      price: Math.round((items.reduce((sum, i) => sum + values[i.rarity], 0) * 0.65) / 100) * 100,
    };
  });
}
export function buyBundle(progress, id, now = new Date()) {
  const bundle = shopBundles(now).find((b) => b.id === id);
  if (!bundle) throw Error("That bundle has rotated out.");
  const missing = bundle.items.filter((i) => !progress.data.owned.includes(i.id));
  if (!missing.length) throw Error("You already own this bundle.");
  const price = Math.ceil((bundle.price * missing.length) / bundle.items.length);
  if (progress.data.coins < price) throw Error(`This bundle needs ${price.toLocaleString()} tokens.`);
  progress.data.coins -= price;
  progress.data.owned.push(...missing.map((i) => i.id));
  progress.save();
  return { items: missing.map((i) => i.id), price };
}
