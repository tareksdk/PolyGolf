import { button, esc } from './views.js';
import { ITEMS, ITEM_BY_ID, RARITY } from './catalog.js';
import { tradeInventory, tradeKey } from './trades.js';
import { itemCount } from './item-stacks.js';
import { TRADE_UP_RARITIES, tradeUpEligible, tradeUpPool } from './trade-ups.js';

export function installTradeUps(ui) {
  const action = ui.action.bind(ui); let draft = null, busy = false;
  const title = e => ITEM_BY_ID[e.id].name + (e.seed === undefined ? '' : ' · #' + String(e.seed).padStart(3,'0'));
  const art = e => `<img src="${ui.world.itemThumbnail({...ITEM_BY_ID[e.id], ...(e.seed===undefined?{}:{seed:e.seed})})}" alt="" loading="lazy" decoding="async" width="216" height="150">`;
  const total = () => draft.items.reduce((n,e) => n+e.quantity,0);
  const changed = () => {draft.requestId=crypto.randomUUID();draft.review=false;};
  function draw() {
    const scroll = document.querySelector('.trade-up-inventory')?.scrollTop || 0;
    const available = tradeInventory(ui.progress.data).filter(e=>tradeUpEligible(ITEM_BY_ID[e.id]));
    const pool = available.filter(e=>ITEM_BY_ID[e.id].rarity===draft.rarity), rewards=tradeUpPool(draft.rarity), count=total();
    ui.modal(`<section class="trade-up"><span class="eyebrow">CADDIE WORKSHOP</span><h2>Ten finds. One upgrade.</h2><p>Combine 10 tradable items of the same rarity for one random item from the next rarity. Matching copies count individually.</p><nav class="trade-up-rarities" aria-label="Trade-up rarity">${TRADE_UP_RARITIES.slice(0,-1).map(r=>button(r,'trade-up-rarity',`data-rarity="${r}" aria-pressed="${draft.rarity===r}"`,'button '+(draft.rarity===r?'yellow':'secondary'))).join('')}</nav><div class="trade-up-workbench"><div><strong>${count} / 10 selected</strong><div class="trade-up-slots">${draft.items.map(e=>button(art(e)+`<span>${esc(title(e))}</span><b>×${e.quantity} <small>Remove one</small></b>`,'trade-up-remove',`data-key="${esc(tradeKey(e))}"`,'trade-up-slot')).join('')||'<p>Choose items below to fill your trade-up.</p>'}</div></div><div class="trade-up-result" style="--rarity:${RARITY[rewards[0]?.rarity]||'#e7ca72'}"><span aria-hidden="true">✦</span><strong>${rewards[0]?.rarity||'Next rarity'}</strong><small>One random item</small></div></div><label class="auction-search">Search your items<input id="trade-up-search" type="search" placeholder="Item name or pattern" value="${esc(draft.query)}"></label><div class="trade-up-inventory">${pool.map(e=>{const chosen=draft.items.find(x=>tradeKey(x)===tradeKey(e))?.quantity||0, left=itemCount(ui.progress.data,e)-chosen;return button(art(e)+`<span>${esc(title(e))}</span><small>×${left} available${chosen?' · '+chosen+' selected':''}</small>`,'trade-up-add',`data-key="${esc(tradeKey(e))}" data-search="${esc(title(e).toLowerCase())}" ${!left||count>=10?'disabled':''} ${title(e).toLowerCase().includes(draft.query.toLowerCase())?'':'hidden'}`,'trade-up-pick');}).join('')||'<p>No eligible items of this rarity yet. Special rewards, starter gear and code items stay in your collection.</p>'}</div><details class="trade-up-odds"><summary>Possible rewards · ${rewards.length} items</summary><p>Each item below has an equal chance. Numbered finishes then roll an equally likely seed from 000 to 999.</p><div>${rewards.map(i=>`<span>${esc(i.name)}</span>`).join('')}</div></details>${draft.review?'<p class="trade-up-warning" role="status">The 10 selected copies will be permanently exchanged. This includes any equipped copy you selected. Review the items above before confirming.</p>':''}<div class="modal-actions">${button('Back','close-modal','','button secondary')}${button(busy?'Trading up…':draft.review?'Confirm trade-up':'Review trade-up',draft.review?'trade-up-confirm':'trade-up-review',count===10&&!busy?'':'disabled','button yellow')}</div></section>`,{wide:true});
    const inventory=document.querySelector('.trade-up-inventory');if(inventory)inventory.scrollTop=scroll;
  }
  document.addEventListener('input',event=>{
    if(event.target.id!=='trade-up-search'||!draft)return;draft.query=event.target.value;
    document.querySelectorAll('.trade-up-pick').forEach(el=>el.hidden=!el.dataset.search.includes(draft.query.toLowerCase()));
  });
  ui.action = async (name,data={}) => {
    if(name!=='trade-up'&&!name.startsWith('trade-up-'))return action(name,data);
    if(!ui.cloud.session||ui.cloud.isGuest){ui.toast('Sign in to use trade-ups.');return action('account');}
    if(busy)return;
    const owner=ui.cloud.session.user.id;
    if(name==='trade-up') {draft={owner,rarity:'Uncommon',items:[],query:'',review:false,requestId:crypto.randomUUID()};draw();return;}
    if(!draft||draft.owner!==owner){draft=null;ui.closeModal();return;}
    if(name==='trade-up-rarity'&&TRADE_UP_RARITIES.slice(0,-1).includes(data.rarity)){draft.rarity=data.rarity;draft.items=[];changed();draw();return;}
    if(name==='trade-up-add'){
      const e=tradeInventory(ui.progress.data).find(e=>tradeKey(e)===data.key);
      if(!e||!tradeUpEligible(ITEM_BY_ID[e.id])||ITEM_BY_ID[e.id].rarity!==draft.rarity||total()>=10)return;
      const selected=draft.items.find(x=>tradeKey(x)===data.key);
      if((selected?.quantity||0)>=itemCount(ui.progress.data,e))return;
      if(selected)selected.quantity++;else draft.items.push({...e,quantity:1});changed();draw();return;
    }
    if(name==='trade-up-remove'){const e=draft.items.find(x=>tradeKey(x)===data.key);if(e){e.quantity--;if(!e.quantity)draft.items=draft.items.filter(x=>x!==e);}changed();draw();return;}
    if(name==='trade-up-review'&&total()===10){draft.review=true;draw();return;}
    if(name==='trade-up-confirm'&&draft.review&&total()===10){
      busy=true;draw();
      try{
        const result=await ui.cloud.call('trade_up',{items:draft.items,requestId:draft.requestId});
        if(ui.cloud.session?.user.id!==owner)return;
        const e=result.outcome.reward,item=ITEM_BY_ID[e.id];ui.world.equip(ui.progress.data.equipment,ITEMS);ui.render();
        ui.modal(`<section class="trade-up-reveal" style="--rarity:${RARITY[item.rarity]}"><span class="eyebrow">TRADE-UP COMPLETE</span>${art(e)}<span class="rarity-chip">${esc(item.rarity)}</span><h2>${esc(title(e))}</h2><p>Added to your Caddie${result.outcome.quantity>1?' · ×'+result.outcome.quantity:''}</p>${button('Back to Caddie','close-modal','','button yellow')}</section>`);draft=null;ui.audio.play('purchase');
      }catch(e){ui.toast(e.message);}finally{busy=false;if(draft&&ui.cloud.session?.user.id===owner)draw();}
    }
  };
}
