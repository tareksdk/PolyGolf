import { ITEMS } from './catalog.js';
export const CADDIE_RARITIES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Black Market'];
export const CADDIE_SORTS = [['collection','Collection order'],['rarity-desc','Rarity: highest'],['rarity-asc','Rarity: lowest'],['name','Name: A to Z'],['recent','Recently collected']];
export function caddieItems(data, {category='ball', query='', rarity='all', sort='collection', showAll=false, favorites=false} = {}) {
  const owned = new Set(data.owned), liked = new Set(data.favorites), words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const items = ITEMS.filter(item => item.category === category && (showAll || owned.has(item.id)) && (!favorites || liked.has(item.id)) && (rarity === 'all' || item.rarity === rarity) && words.every(word => item.name.toLowerCase().includes(word)));
  const byName = (a,b) => a.name.localeCompare(b.name);
  if (sort === 'name') items.sort(byName);
  if (sort === 'rarity-desc' || sort === 'rarity-asc') items.sort((a,b) => (CADDIE_RARITIES.indexOf(a.rarity)-CADDIE_RARITIES.indexOf(b.rarity)) * (sort === 'rarity-desc' ? -1 : 1) || byName(a,b));
  if (sort === 'recent') {
    const order = new Map(data.owned.map((id,i) => [id,i]));
    items.sort((a,b) => (order.get(b.id) ?? -1) - (order.get(a.id) ?? -1) || byName(a,b));
  }
  return items;
}
