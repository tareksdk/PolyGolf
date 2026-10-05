import { ITEMS, ITEM_BY_ID, RARITY } from './catalog.js';
import { finishItem, patternLabel } from './finishes.js';
import { button, esc } from './views.js';

export function patternDialog(ui, id, previewSeed) {
  const item = ITEM_BY_ID[id];
  if (!item?.finish) return;
  const seeds = ui.progress.data.patterns?.[id] || [], selected = ui.progress.data.equipment.patterns?.[id],
    seed = seeds.includes(previewSeed) ? previewSeed : selected ?? 500,
    shown = finishItem({ ...item, seed }), equipped = ui.progress.data.equipment[item.category] === id && selected === seed;
  ui.modal(`<section class="pattern-detail"><div class="pattern-hero" style="--rarity:${RARITY[item.rarity]}"><img src="${ui.world.itemThumbnail(shown)}" alt="${esc(item.name)} pattern ${seed}"></div><div class="pattern-copy"><small>${item.rarity} · ${item.category==='club'?'Putter':item.category==='driver'?'Driver':'Ball'}</small><h2>${esc(item.name)}</h2><p>${esc(item.flavor)}</p><strong>Pattern ${String(seed).padStart(3,'0')}${item.finish==='case-hardened'?' · '+patternLabel(seed):''}</strong><p class="pattern-note">${seeds.length?seeds.length+' saved pattern'+(seeds.length===1?'':'s')+' in your Caddie.':'Example pattern. Your locker rolls its own finish.'}</p>${seeds.length?`<div class="pattern-picker" role="group" aria-label="Owned patterns">${[...seeds].sort((a,b)=>a-b).map(n=>button('#'+String(n).padStart(3,'0'),'pattern-view',`data-id="${id}" data-seed="${n}" aria-pressed="${n===seed}"`,'button secondary')).join('')}</div>${button(equipped?'Equipped':'Equip this pattern','equip-pattern',`data-id="${id}" data-seed="${seed}" ${equipped?'disabled':''}`,'button yellow')}`:button('View Forge Locker','locker-detail','data-id="forge"','button yellow')}<p class="pattern-note">Patterns change appearance only. All 1,000 seeds are equally likely. Case Hardened includes 10 full-gold and 10 full-blue seeds; each extreme is 1% of Case Hardened drops.</p></div></section>`,{wide:true});
}
export async function equipPattern(ui, id, seed) {
  if (ui.mutating) return;
  ui.mutating = true;
  try {
    if (ui.cloud.session) await ui.cloud.call('equip',{id,seed});
    else if (!ui.progress.equip(id,seed)) throw Error('That pattern is not in your Caddie.');
    ui.previewId=null;
    ui.world.equip(ui.progress.data.equipment,ITEMS);
    ui.closeModal(); ui.render(); ui.audio.play('reward');
  } catch(e) { ui.toast(e.message); } finally { ui.mutating=false; }
}
