import { installOnboarding } from './onboarding.js';
import { CLUBS } from './golf-physics.js';
import { clubYards } from './club-distances.js';
import { LOCKERS } from './pro-shop.js';
import { lockerArt } from './shop-view.js';
import { button, esc } from './views.js';
export function installOpeningUpdate(ui) {
  const render=ui.render.bind(ui),action=ui.action.bind(ui),tick=ui.tick.bind(ui);
  const seen=new WeakSet();let award=null,returnDialog=null;
  const busy=()=>ui.game.state!=='playing'||ui.game.charging||!!ui.game.pendingSwing||ui.game.physics.active;
  ui.render=()=>{
    render();const select=ui.root.querySelector('#shot-club');
    if(select){select.closest('label').hidden=true;select.closest('label').insertAdjacentHTML('afterend',`<div class="club-selector"><span class="ph-label">YOUR CLUB</span><div>${button('‹','shot-club-prev','aria-label="Previous club"','club-arrow')}<button class="club-current" data-action="shot-club-list" aria-expanded="false"><strong>${ui.game.club==='driver'&&ui.progress.data.equipment.driver==='driver-mystery'?'???':CLUBS.find(c=>c.id===ui.game.club)?.name}</strong><small>${clubYards(ui.game.club,ui.progress.data.equipment)} yd <span>▾</span></small></button>${button('›','shot-club-next','aria-label="Next club"','club-arrow')}</div><div class="club-options" hidden>${CLUBS.map(c=>button(c.name,'shot-club-pick',`data-id="${c.id}" aria-pressed="${c.id===ui.game.club}"`,'club-option')).join('')}</div></div>`);}
    const meter=ui.root.querySelector('#shot-meter');if(meter){meter.closest('label').hidden=true;meter.closest('label').insertAdjacentHTML('afterend',button(ui.game.meterStyle()==='fluid'?'Flow meter · Change':'Classic meter · Change','shot-meter-toggle','','ph-chip meter-switch'));}
  };
  ui.showEarnedLocker=(id,round)=>{
    if(!round||seen.has(round)||award)return;
    const pack=LOCKERS.find(p=>p.id===id);if(!pack)return;
    seen.add(round);ui.earnedLockerPending=null;
    award=document.createElement('div');award.className='earned-locker-overlay';award.setAttribute('role','dialog');award.setAttribute('aria-modal','true');award.setAttribute('aria-label','You earned a locker');
    award.innerHTML=`<section class="earned-locker-popup"><span class="eyebrow">A LITTLE LUCK. A BIG FINISH.</span><h2>You earned a locker!</h2><img src="${lockerArt(ui,pack)}" alt="${esc(pack.name)}"><h3>${esc(pack.name)}</h3><p>Yours to keep. This opening is free.</p><div>${button('Open right now','reward-open','','button yellow')}${button('Save for later','reward-later','','button secondary')}</div></section>`;
    document.body.append(award);ui.root.inert=true;ui.modalRoot.inert=true;
    const close=()=>{award?.remove();award=null;ui.modalRoot.inert=false;ui.root.inert=!!ui.modalRoot.children.length;};
    award.addEventListener('click',async e=>{const name=e.target.closest('button')?.dataset.action;if(!name)return;if(name==='reward-later'){close();ui.modalRoot.querySelector('button')?.focus();return;}if(name==='reward-open'){returnDialog=ui.modalRoot.innerHTML;close();await ui.action('open-locker',{id,count:1});}});
    award.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const buttons=[...award.querySelectorAll('button')],i=buttons.indexOf(document.activeElement);e.preventDefault();buttons[(i+(e.shiftKey?-1:1)+buttons.length)%buttons.length].focus();}});
    award.querySelector('button').focus();
  };
  ui.tick=()=>{
    tick();for(const el of ui.root.querySelectorAll('.club-selector button,.meter-switch'))el.disabled=busy();
    const settingShot=ui.game.charging||!!ui.game.pendingSwing;
    ui.root.querySelector('.play-hud')?.classList.toggle('is-setting-shot',settingShot);
    ui.root.querySelector('#first-swing')?.classList.toggle('is-compact',settingShot||ui.game.physics.active);
    const pending=ui.earnedLockerPending;
    if(pending&&ui.game.state==='finished'&&(!ui.ranked?.match||ui.ranked.match.phase==='finished'))ui.showEarnedLocker(pending.id,pending.round);
  };
  ui.action=async(name,data={})=>{
    if(name.startsWith('shot-club-')){
      if(busy())return;const sel=ui.root.querySelector('#shot-club');if(!sel)return;
      if(name==='shot-club-list'){const menu=ui.root.querySelector('.club-options');menu.hidden=!menu.hidden;ui.root.querySelector('.club-current').setAttribute('aria-expanded',String(!menu.hidden));return;}
      const i=CLUBS.findIndex(c=>c.id===ui.game.club);sel.value=name==='shot-club-pick'?data.id:CLUBS[(i+(name==='shot-club-next'?1:-1)+CLUBS.length)%CLUBS.length].id;
      sel.dispatchEvent(new Event('input'));sel.dispatchEvent(new Event('change'));ui.render();return;
    }
    if(name==='shot-meter-toggle'){if(busy()||ui.tutorialActive)return;const select=ui.root.querySelector('#shot-meter');select.value=ui.game.meterStyle()==='fluid'?'classic':'fluid';select.dispatchEvent(new Event('change'));ui.render();return;}
    const result=await action(name,data);
    if(name==='crate-close'&&returnDialog){ui.modalRoot.innerHTML=returnDialog;returnDialog=null;ui.root.inert=true;ui.modalRoot.querySelector('button')?.focus();}
    return result;
  };
  installOnboarding(ui);
}
