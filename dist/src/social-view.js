import { SOCIAL_REWARDS } from './community-rewards.js';
import { button, coins } from './views.js';
const marks={instagram:'◎',x:'𝕏',youtube:'▶',discord:'↗'};
export function socialView(ui){
  return `<main class="arcade-page community-menu"><header class="arcade-page-header">${button('← Back','home','','arcade-button')}<h1>Room310</h1><span>${coins(ui.progress.data.coins)}</span></header>${socialRewards(ui)}</main>`;
}
export function socialRewards(ui){
  const claimed=ui.progress.data.socialRewards||[];
  return `<section class="community-menu-content"><h2>Stay in the loop.</h2><p>Follow the project, see what we’re building, or find someone to play with.</p><div class="community-links">${SOCIAL_REWARDS.map(s=>`<a class="community-link" href="${s.url}" target="_blank" rel="noopener noreferrer" data-action="visit-social" data-id="${s.id}"><i aria-hidden="true">${marks[s.id]}</i><span><strong>${s.name}</strong><small>${s.action}</small></span><b>${claimed.includes(s.id)?'✓ Collected':'+1,000 coins'}<span aria-hidden="true"> ↗</span></b></a>`).join('')}</div><p class="community-terms">Click a link to get its one-time 1,000-coin thank-you. Following or joining is optional; we don’t verify your social accounts. ${ui.cloud.session?'Rewards are saved to your account.':'Guest rewards stay on this device. Sign in first to save them across devices.'}</p>${ui.cloud.session?'':button('Sign in','account','','arcade-button')}</section>`;
}
