// Original, numbered golf finishes. Seeds are minted when an item is awarded;
// previews, equipping and reloads must never roll another finish.
export const FINISHES = [
  { key: 'field-camo', name: 'Field Camo', rarity: 'Uncommon', color: '#637460', accent: '#c6c09c' },
  { key: 'tiger-grain', name: 'Tiger Grain', rarity: 'Rare', color: '#bb874c', accent: '#303b37' },
  { key: 'frostline', name: 'Frostline', rarity: 'Rare', color: '#789faa', accent: '#e2e5dc' },
  { key: 'damascus', name: 'Folded Steel', rarity: 'Epic', color: '#728895', accent: '#c2d1d0' },
  { key: 'oil-spill', name: 'Oil Slick', rarity: 'Epic', color: '#446e86', accent: '#ac879c' },
  { key: 'case-hardened', name: 'Case Hardened', rarity: 'Legendary', color: '#4879b0', accent: '#c99f4d' },
];
export const validSeed = n => Number.isInteger(n) && n >= 0 && n < 1000;
export function patternLabel(seed) {
  return seed < 10 ? 'Gold finish' : seed >= 990 ? 'Blue finish' : seed < 250 ? 'Gold dominant' : seed > 749 ? 'Blue dominant' : 'Blue & gold';
}
export function rollPattern(random) {
  const r = random();
  if (!Number.isFinite(r) || r < 0 || r >= 1) throw Error('Invalid pattern roll.');
  return Math.floor(r * 1000);
}
export function grantPattern(data, item, seed) {
  if (!item.finish || !validSeed(seed)) throw Error('Invalid finish.');
  data.patterns ??= {};
  const seeds = data.patterns[item.id] ??= [];
  const duplicate = seeds.includes(seed);
  if (!duplicate) seeds.push(seed);
  data.equipment.patterns ??= {};
  data.equipment.patterns[item.id] ??= seed;
  return duplicate;
}
export function finishItem(item, equipment) {
  if (!item?.finish || validSeed(item.seed)) return item;
  const seed = equipment?.patterns?.[item.id];
  return { ...item, seed: validSeed(seed) ? seed : 500 };
}
export function normalizePatterns(data, catalog) {
  const patterns = {};
  const selected = {};
  for (const id of data.owned) {
    if (!catalog[id]?.finish) continue;
    const seeds = [...new Set((Array.isArray(data.patterns?.[id]) ? data.patterns[id] : []).filter(validSeed))];
    // Deterministic compatibility for previously granted catalogue items.
    if (!seeds.length) seeds.push(500);
    patterns[id] = seeds;
    const chosen = data.equipment?.patterns?.[id];
    selected[id] = seeds.includes(chosen) ? chosen : seeds[0];
  }
  data.patterns = patterns;
  data.equipment.patterns = selected;
  return data;
}
