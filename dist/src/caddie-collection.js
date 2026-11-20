import { CATEGORIES, ITEMS } from './catalog.js';
import { totalItemCount } from './item-stacks.js';

export const CADDIE_RARITIES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Black Market'];
export const CADDIE_SORTS = [
  ['equipped', 'Equipped first'],
  ['recent', 'Recently collected'],
  ['rarity-desc', 'Rarity: highest'],
  ['rarity-asc', 'Rarity: lowest'],
  ['name', 'Name: A to Z'],
  ['copies', 'Most copies'],
];
const categoryNames = new Map(CATEGORIES.map(category => [category.id, category.name.toLowerCase()]));

export function caddieItems(data, {category='ball', query='', rarity='all', sort='collection', showAll=false, favorites=false} = {}) {
  const owned = new Set(data.owned), liked = new Set(data.favorites), words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const items = ITEMS.filter(item => {
    if (category !== 'all' && item.category !== category) return false;
    if (!owned.has(item.id) && (item.secret || !showAll)) return false;
    if (favorites && !liked.has(item.id)) return false;
    if (rarity !== 'all' && item.rarity !== rarity) return false;
    const description = item.name.toLowerCase() + ' ' + categoryNames.get(item.category) + ' ' + item.rarity.toLowerCase();
    return words.every(word => /^#\d{1,3}$/.test(word) ?
      data.patterns?.[item.id]?.includes(Number(word.slice(1))) : description.includes(word));
  });
  const byName = (a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
  const equipped = item => Number(data.equipment?.[item.category] === item.id);
  if (sort === 'name') items.sort(byName);
  if (sort === 'equipped') items.sort((a, b) => equipped(b) - equipped(a) || byName(a, b));
  if (sort === 'rarity-desc' || sort === 'rarity-asc') items.sort((a,b) => (CADDIE_RARITIES.indexOf(a.rarity)-CADDIE_RARITIES.indexOf(b.rarity)) * (sort === 'rarity-desc' ? -1 : 1) || byName(a,b));
  if (sort === 'recent') {
    const order = new Map(data.owned.map((id,i) => [id,i]));
    items.sort((a,b) => (order.get(b.id) ?? -1) - (order.get(a.id) ?? -1) || byName(a,b));
  }
  if (sort === 'copies') {
    const copies = new Map(items.map(item => [item.id, totalItemCount(data, item.id)]));
    items.sort((a, b) => copies.get(b.id) - copies.get(a.id) || byName(a, b));
  }
  return items;
}
