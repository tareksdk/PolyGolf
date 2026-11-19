import { SOCIAL_REWARDS } from './community-rewards.js';
import { button, coins } from './views.js';
import { coinChestArt } from './shop-coin-art.js';
const marks={instagram:'◎',x:'𝕏',youtube:'▶',discord:'↗'};
export function socialView(ui){
  return `<main class="arcade-page community-menu"><header class="arcade-page-header">${button('← Back','home','','arcade-button')}<h1>Room310</h1><span>${coins(ui.progress.data.coins)}</span></header>${socialRewards(ui)}</main>`;
}
export function socialRewards(ui, { showIntro = true, showChest = false } = {}){
  const claimed=ui.progress.data.socialRewards||[];
  const intro = showIntro ? '<h2>Stay in the loop.</h2><p>Follow the project, see what we’re building, or find someone to play with.</p>' : '';
  return `<section class="community-menu-content">${intro}<div class="community-links">${SOCIAL_REWARDS.map(s=>`<a class="community-link${showChest ? ' community-chest-link' : ''}" href="${s.url}" target="_blank" rel="noopener noreferrer" data-action="visit-social" data-id="${s.id}"><i aria-hidden="true">${marks[s.id]}</i><span><strong>${s.name}</strong><small>${s.action}</small></span><b>${showChest ? coinChestArt() : ''}<span>${claimed.includes(s.id)?'✓ Collected':'+1,000 coins'}</span><span aria-hidden="true"> ↗</span></b></a>`).join('')}</div><p class="community-terms">Click a link to get its one-time 1,000-coin thank-you. Following or joining is optional; we don’t verify your social accounts. ${ui.cloud.session?'Rewards are saved to your account.':'Guest rewards stay on this device. Sign in first to save them across devices.'}</p>${ui.cloud.session?'':button('Sign in','account','','arcade-button')}</section>`;
}
