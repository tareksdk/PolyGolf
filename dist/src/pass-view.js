import { PASS_TIERS, PASS_TIER_XP, PASS_TIER_COUNT, membership, tierClaimed, MEMBERSHIP_COST, MEMBER_DAILY, memberRotation, memberPrice } from './equipment.js';
import { ITEM_BY_ID } from './catalog.js';
import { page, button, esc, coins } from './views.js';

export function clubPassView(ui) {
  const d = ui.progress.data, p = membership(ui.progress);
  const current = Math.min(PASS_TIER_COUNT, Math.floor(d.xp / PASS_TIER_XP));
  const start = Math.min(20, ui.passStart ?? Math.floor(current / 10) * 10);
  const tiers = PASS_TIERS.slice(start, start + 10);
  const collection=memberRotation();
  const progress = current === PASS_TIER_COUNT ? 100 : d.xp % PASS_TIER_XP / PASS_TIER_XP * 100;
  return page(ui, 'Country Club', 'The Founders pass · 30 tiers · No expiry', `
    <section class="pass-summary"><div><span class="eyebrow">${p.member ? 'MEMBER TRACK ACTIVE' : 'FREE TRACK ACTIVE'}</span>
      <h2>Tier ${current}<small> / 30</small></h2><div class="pass-progress" role="progressbar" aria-label="Progress to next tier" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.floor(progress)}"><i style="width:${progress}%"></i></div><p>${d.xp.toLocaleString()} lifetime XP · ${current === 30 ? 'All tiers unlocked' : (PASS_TIER_XP - d.xp % PASS_TIER_XP).toLocaleString() + ' XP to the next tier'}</p></div>
      <div class="pass-purchase">${p.member ? button(p.dailyClaim === new Date().toISOString().slice(0,10) ? 'Daily coins collected' : 'Collect ' + MEMBER_DAILY + ' daily coins', 'claim-club-daily', p.dailyClaim === new Date().toISOString().slice(0,10) ? 'disabled' : '', 'button yellow') : `<div class="row">${button('Join · ' + MEMBERSHIP_COST.toLocaleString() + ' coins', 'join-club', d.coins < MEMBERSHIP_COST || ui.progress.level.level < 10 ? 'disabled' : '', 'button yellow')}${button('$5.99 · Coming Soon', 'purchase-coming-soon', 'data-product="Country Club"', 'button secondary')}</div>`}
      <p>Coin membership unlocks at level 10.<br>One free reward and one exclusive item at every tier.</p></div></section>
    <div class="pass-navigation"><div>${button('← Previous', 'pass-page', `data-start="${Math.max(0,start-10)}" ${start===0?'disabled':''}`, 'button secondary')}${button('Your tier', 'pass-current', '', 'button secondary')}${button('Next →','pass-page',`data-start="${Math.min(20,start+10)}" ${start===20?'disabled':''}`,'button secondary')}</div><span>Tiers ${start+1}–${start+10} of 30</span></div>
    <div class="pass-track" aria-label="Country Club reward tiers" tabindex="0">${tiers.map(t=>{
      const open = d.xp >= t.xp, claimed = tierClaimed(ui.progress,t), items = t.items.map(id=>ITEM_BY_ID[id]);
      return `<article class="pass-column ${open?'available':''}"><header><strong><small>TIER</small>${String(t.tier).padStart(2,'0')}</strong><span>${t.xp.toLocaleString()} XP</span></header>
        <div class="pass-free"><span class="track-label">FREE</span>${coins(t.freeCoins)}<small>${p.claimed.includes(t.tier)?'✓ Collected':open?'Ready to claim':'Locked'}</small></div>
        <div class="pass-premium ${p.member?'':'member-locked'}"><span class="track-label">COUNTRY CLUB ${p.member?'':'· LOCKED'}</span>
        <div class="tier-items">${items.length ? items.map(item=>`<button data-action="item-detail" data-id="${item.id}" class="tier-item"><img loading="lazy" src="${ui.world.itemThumbnail(item)}" alt="${esc(item.name)}"><span>${esc(item.name)}</span></button>`).join('') : `<img src="${ui.world.itemThumbnail({id:'token-chest',category:'tokens',color:'#e8c162'})}" alt="Pocket of Sunshine"><h3>Pocket of Sunshine</h3>`}</div>
        <small>Member-exclusive item</small></div>
        ${button(claimed?'Collected':open?'Claim tier':'Keep playing','claim-tier',`data-tier="${t.tier}" ${!open||claimed?'disabled':''}`,'button secondary wide')}</article>`;
    }).join('')}</div><section class="member-collection"><div class="section-heading"><div><h2>Members’ collection</h2><p>Six additional member-only finishes each week. Separate from the pass.</p></div></div><div class="member-collection-grid">${collection.map(item=>`<article><button class="member-preview" data-action="item-detail" data-id="${item.id}"><img loading="lazy" src="${ui.world.itemThumbnail(item)}" alt="${esc(item.name)}"><strong>${esc(item.name)}</strong></button><span>${item.rarity}</span>${button(d.owned.includes(item.id)?'Owned':!p.member?'Membership required':memberPrice(item).toLocaleString()+' coins','buy-member-item',`data-id="${item.id}" ${!p.member||d.owned.includes(item.id)||d.coins<memberPrice(item)?'disabled':''}`,'button secondary wide')}</article>`).join('')}</div></section>`).replace('class="page"','class="page pass-page"');
}
