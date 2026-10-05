import { button } from './views.js';
import { icon } from './icons.js';
import { PASS_TIER_COUNT } from './equipment.js';

// Called only after a confirmed membership purchase, never from a preview or retry.
export function welcomeToClub(ui){
  ui.audio.play('reward');
  ui.modal(`<section class="club-welcome" aria-labelledby="club-welcome-title">
    <div class="club-confetti" aria-hidden="true">${Array.from({length:28},(_,i)=>`<i style="--i:${i};--x:${(i*37)%100}%;--delay:${(i%7)*.09}s;--turn:${i*43}deg"></i>`).join('')}</div>
    <div class="club-seal" aria-hidden="true"><span class="club-seal-ring"></span>${icon('flag')}<small>COUNTRY CLUB</small></div>
    <span class="eyebrow">MEMBERSHIP ACTIVATED</span><h2 id="club-welcome-title">Welcome to the club.</h2>
    <p>A place on the green. A collection of your own.</p>
    <div class="club-perks"><div>${icon('star')}<strong>${PASS_TIER_COUNT} member tiers</strong><span>Earn XP and claim exclusive items.</span></div><div>${icon('gift')}<strong>Members’ collection</strong><span>A fresh selection every week.</span></div><div>${icon('sun')}<strong>Daily member reward</strong><span>A little extra for stopping by.</span></div></div>
    ${button('Explore your membership '+icon('arrow'),'club-welcome-done','','button yellow')}
  </section>`,{wide:true,close:false});
}
