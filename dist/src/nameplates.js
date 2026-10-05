import { ITEM_BY_ID } from './catalog.js';
import { badgeFor, badgeSvg } from './nameplate-badges.js';
// Markup shared by profiles, lobbies and match overlays. Never accept raw CSS from players.
const escape = s => String(s ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function nameplate(name, id, { compact = false } = {}) {
  const item = ITEM_BY_ID[id]?.category === 'nameplate' ? ITEM_BY_ID[id] : ITEM_BY_ID['nameplate-classic'];
  const badge = badgeFor(item), mark = badge ? badgeSvg(badge) : item.motif === 'skull' ? '☠' : item.rank ? '◆' : '⚑';
  return `<span class="golfer-nameplate ${compact?'compact':''} ${item.rank?'rank-nameplate':''} ${item.shine?'shiny-nameplate':''} ${item.shine === 'prismatic'?'prismatic-nameplate':''}" style="--plate:${item.color};--plate-accent:${item.pattern || '#eadfbf'}"><i class="${badge?'custom-plate-badge':''}" aria-hidden="true">${mark}</i><span><strong>${escape(name)}</strong>${compact?'':`<small>${escape(item.name)}</small>`}</span></span>`;
}
