import { page, button, esc, rarityClass, coins } from './views.js';
import { ITEM_BY_ID, RARITY } from './catalog.js';
import { tradeKey, MAX_TRADE_COINS } from './trades.js';
import { icon } from './icons.js';

const itemName = e => (ITEM_BY_ID[e.id]?.name || e.id) + (e.seed === undefined ? '' : ' · Pattern #' + String(e.seed).padStart(3,'0')) + ((e.quantity||1)>1?' · ×'+e.quantity:'');
const sides = [['give','You give','yours'],['take','You receive','theirs']];
function art(ui,e) {
  const i=ITEM_BY_ID[e.id];
  return `<img src="${ui.world.itemThumbnail({...i,...(e.seed===undefined?{}:{seed:e.seed})})}" alt="" loading="lazy" decoding="async" width="216" height="150">`;
}
function card(ui,e) {
  const i=ITEM_BY_ID[e.id]; if(!i)return '';
  return `<div class="trade-item ${rarityClass(i)}" style="--rarity:${RARITY[i.rarity]}">${art(ui,e)}<span>${esc(itemName(e))}<small>${esc(i.rarity)}</small></span></div>`;
}
const coinOffer = n => `<div class="trade-coin-offer">${coins(n||0)}<small>coins</small></div>`;
function offerSide(ui,entries,amount) {return entries.map(e=>card(ui,e)).join('')+coinOffer(amount);}
export function visibleTrades(trades, me, filter = 'all') {
  if (filter === 'received') return trades.filter(t => t.receiver_id === me && t.status === 'pending');
  if (filter === 'sent') return trades.filter(t => t.sender_id === me && t.status === 'pending');
  if (filter === 'history') return trades.filter(t => t.status !== 'pending');
  return trades;
}
export function tradingView(ui) {
  const me=ui.cloud.session?.user.id, all=ui.tradesData || [], filter=ui.tradeFilter || 'all';
  const trades=visibleTrades(all, me, filter);
  const steps = `<aside class="trade-guide"><span class="eyebrow">A FAIR EXCHANGE</span><h2>From one caddie to another.</h2><ol><li><strong>Find your golfer</strong><span>Open a friend’s profile and choose Trade items.</span></li><li><strong>Build the offer</strong><span>Up to five item stacks per side, plus coins. Exact patterns and quantities stay attached.</span></li><li><strong>Review and exchange</strong><span>Your friend has 24 hours to accept. Both collections are checked again.</span></li></ol><p>Country Club, level, rank, code and achievement rewards stay with their original owner.</p></aside>`;
  const tabs=`<nav class="trade-tabs" aria-label="Trade offers">${[['all','All offers'],['received','Received'],['sent','Sent'],['history','History']].map(([id,label])=>button(label,'trade-filter',`data-id="${id}" aria-pressed="${filter===id}"`,'chip '+(filter===id?'active':''))).join('')}</nav>`;
  const message = !me ? `<section class="trade-empty empty-state">${icon('shuffle')}<span class="eyebrow">${ui.cloud.localPreview?'LOCAL PREVIEW':'YOUR TRADE INBOX'}</span><h2>${ui.cloud.localPreview?'Trading lives in the online clubhouse.':'Good gear deserves a good trade.'}</h2><p>${ui.cloud.localPreview?'Explore your Caddie here. Sending offers and exchanging items require an online account on the live game.':'Sign in to trade items and coins with friends. Trading unlocks at level 5.'}</p>${button(ui.cloud.localPreview?'Browse your collection':'Sign in to trade',ui.cloud.localPreview?'garage':'account','','button yellow')}</section>` : `${tabs}${ui.tradesError?`<div class="trade-error" role="alert"><strong>Couldn’t load your offers.</strong><p>${esc(ui.tradesError)}</p>${button('Try again','trades-refresh','','button secondary')}</div>`:''}${ui.tradesLoading?'<div class="trade-loading" role="status">Checking your trade inbox…</div>':!trades.length?`<section class="trade-empty empty-state">${icon('shuffle')}<span class="eyebrow">${filter==='all'?'YOUR TRADE INBOX':esc(filter.toUpperCase())}</span><h2>${filter==='all'?'Your next find starts with a friend.':'No '+(filter==='history'?'past':filter)+' offers.'}</h2><p>Open a friend’s profile and choose Trade items to start an offer.</p>${button('Find a friend','friends','','button yellow')}</section>`:`<div class="trade-list">${trades.map(t=>{
    const sent=t.sender_id===me;
    return `<article class="panel trade-offer"><header><div><small>${sent?'SENT TO':'FROM'}</small><h2>${esc(sent?t.receiver:t.sender)}</h2></div><span class="trade-status ${t.status}">${esc(t.status)}</span></header><div class="trade-sides"><section><h3>You give</h3>${offerSide(ui,sent?t.offered:t.requested,sent?t.offered_coins:t.requested_coins)}</section><section><h3>You receive</h3>${offerSide(ui,sent?t.requested:t.offered,sent?t.requested_coins:t.offered_coins)}</section></div><footer><small>${t.status==='pending'?'Expires '+new Date(t.expires_at).toLocaleString():'Updated '+new Date(t.resolved_at||t.created_at).toLocaleDateString()}</small>${t.status==='pending'?button(!sent?'Review offer':'Cancel offer',!sent?'trade-review':'trade-close',`data-id="${t.id}"`,'button '+(!sent?'yellow':'secondary')):''}${t.status==='pending'&&!sent?button('Decline','trade-close',`data-id="${t.id}"`,'text-button'):''}</footer></article>`;
  }).join('')}</div>`}`;
  return page(ui,'Trading','Find a new favourite. Make an offer. Keep the exact finish.', `<div class="trading-layout">${steps}<section class="trade-inbox"><header><div><span class="eyebrow">PLAYER EXCHANGES</span><h2>Your offers</h2></div><div class="trade-inbox-actions">${button('Auction house','auctions','','button secondary')}${me?button(ui.tradesLoading?'Refreshing…':'Refresh','trades-refresh',ui.tradesLoading?'disabled':'','button secondary'):''}</div></header>${message}</section></div>`).replace('class="page"','class="page trading-page"');
}

export function installTrading(ui) {
  const render=ui.render.bind(ui),action=ui.action.bind(ui);
  let draft=null,busy=false,owner=null;
  async function load() {
    ui.tradesError=null;ui.tradesLoading=true;ui.render();const actor=ui.cloud.session?.user.id;
    try {const d=await ui.cloud.call('trades');if(actor===ui.cloud.session?.user.id){ui.tradesData=d.trades;ui.tradeInbox=d.trades.filter(t=>t.receiver_id===actor&&t.status==='pending').length;}}
    catch(error){if(actor===ui.cloud.session?.user.id)ui.tradesError=error.message || 'Please try again.';}
    finally{ui.tradesLoading=false;ui.render();}
  }
  function selection(side) {
    return draft[side].map(e=>{
      const i=ITEM_BY_ID[e.id];
      return `<button class="trade-slot filled ${rarityClass(i)}" data-action="trade-remove" data-side="${side}" data-key="${esc(tradeKey(e))}" style="--rarity:${RARITY[i.rarity]}" aria-label="Remove ${esc(itemName(e))} from ${side==='give'?'your offer':'requested items'}">${art(ui,e)}<span>${esc(itemName(e))}</span><i aria-hidden="true">×</i></button>`;
    }).join('')+Array.from({length:5-draft[side].length},()=>'<div class="trade-slot empty" aria-label="Empty item slot"><span aria-hidden="true">+</span></div>').join('');
  }
  function inventory(side) {
    const pool=draft[side==='give'?'yours':'theirs'],query=(draft[side+'Search']||'').toLowerCase().trim();
    const entries=pool.filter(e=>!query||itemName(e).toLowerCase().includes(query));
    return entries.map(e=>{
      const i=ITEM_BY_ID[e.id],chosen=draft[side].find(x=>tradeKey(x)===tradeKey(e)),selected=!!chosen,disabled=chosen?(chosen.quantity||1)>=(e.quantity||1):draft[side].length>=5;
      return `<button class="trade-pick ${rarityClass(i)} ${selected?'selected':''}" style="--rarity:${RARITY[i.rarity]}" data-action="trade-add" data-side="${side}" data-key="${esc(tradeKey(e))}" aria-pressed="${selected}" aria-label="${'Add one'} ${esc(itemName(e))}${side==='give'?' in your offer':' in requested items'}" ${disabled?'disabled':''}>${art(ui,e)}<span>${esc(itemName(e))}</span><small>${esc(i.rarity)}</small><i aria-hidden="true">${selected?'✓':'+'}</i></button>`;
    }).join('')||'<p class="trade-empty">No tradable items match.</p>';
  }
  function validDraft() {
    return sides.every(([side])=>Number.isSafeInteger(draft[side+'Coins'])&&draft[side+'Coins']>=0&&draft[side+'Coins']<=MAX_TRADE_COINS&&(draft[side].length>0||draft[side+'Coins']>0))&&draft.giveCoins<=draft.yourCoins;
  }
  function updateCompose(side) {
    if(!draft)return;
    if(side){
      document.getElementById('trade-'+side+'-selection').innerHTML=selection(side);
      document.getElementById('trade-'+side+'-inventory').innerHTML=inventory(side);
      document.getElementById('trade-'+side+'-count').textContent=draft[side].length+' / 5 items';
    }
    const send=document.querySelector('[data-action="trade-send"]');if(send)send.disabled=busy||!validDraft();
    const error=document.getElementById('trade-validation');
    if(error)error.textContent=draft.giveCoins>draft.yourCoins?'You do not have enough coins for this offer.':sides.some(([s])=>!Number.isSafeInteger(draft[s+'Coins'])||draft[s+'Coins']<0||draft[s+'Coins']>MAX_TRADE_COINS)?'Use whole coin amounts between 0 and 1,000,000,000.':'';
  }
  function changed() {draft.requestId=crypto.randomUUID();}
  function compose() {
    ui.modal(`<section class="trade-compose"><span class="menu-kicker">NEW OFFER</span><h2>Trade with ${esc(draft.profile.username)}</h2><p>Click items to add copies. Click a selected slot to remove one copy. Add coins on either side.</p><div class="trade-sides">${sides.map(([side,label])=>`<section class="trade-panel"><header><h3>${label}</h3><span id="trade-${side}-count">0 / 5 items</span></header><div class="trade-slots" id="trade-${side}-selection">${selection(side)}</div><div class="trade-coins-field"><label for="trade-${side}-coins">${side==='give'?'Coins you offer':'Coins you request'}</label><div><i class="coin-icon" aria-hidden="true">P</i><input id="trade-${side}-coins" data-trade-coins="${side}" type="number" inputmode="numeric" min="0" max="${MAX_TRADE_COINS}" step="1" value="0" autocomplete="off" aria-describedby="trade-${side}-balance"></div><small id="trade-${side}-balance">${side==='give'?draft.yourCoins.toLocaleString()+' available':'Paid by your friend if they accept'}</small></div><div class="trade-inventory-heading"><strong>${side==='give'?'Your items':'Their items'}</strong><label class="trade-search">${icon('search')}<input data-trade-search="${side}" type="search" placeholder="Find an item" aria-label="Search ${side==='give'?'your':'their'} tradable items" autocomplete="off"></label></div><div class="trade-inventory" id="trade-${side}-inventory">${inventory(side)}</div></section>`).join('')}</div><p class="small-note">Up to five item stacks per side, with exact patterns and quantities. Offers do not reserve items or coins. Both balances and collections are checked again when accepted.</p><p id="trade-validation" class="trade-validation" role="status"></p>${button('Send offer','trade-send','disabled','button yellow wide')}</section>`,{wide:true});
  }
  document.addEventListener('input',event=>{
    if(!draft||busy)return;
    const side=event.target.dataset.tradeCoins,search=event.target.dataset.tradeSearch;
    if(['give','take'].includes(side)) {draft[side+'Coins']=event.target.validity.badInput?NaN:Number(event.target.value);changed();updateCompose();}
    if(['give','take'].includes(search)) {draft[search+'Search']=event.target.value;document.getElementById('trade-'+search+'-inventory').innerHTML=inventory(search);}
  });
  ui.render=()=>{const actor=ui.cloud.session?.user.id||'guest';if(owner!==actor){owner=actor;draft=null;ui.tradesData=[];ui.tradeInbox=0;}if(ui.game.state==='menu'&&ui.screen==='trades'){ui.root.innerHTML=tradingView(ui);ui.root.classList.add('clubhouse-menu');ui.root.dataset.screen='trades';}else render();};
  ui.action=async(name,data={})=>{
    if(name==='trade-filter'){ui.tradeFilter=['all','received','sent','history'].includes(data.id)?data.id:'all';ui.render();return;}
    if(name==='trades'&&ui.cloud.localPreview){ui.closeModal();ui.navigate('trades');return;}
    if(!['trades','trades-refresh','trade-start','trade-add','trade-remove','trade-send','trade-review','trade-accept','trade-close'].includes(name))return action(name,data);
    try {
      if(!ui.cloud.session||ui.cloud.isGuest){ui.toast('Sign in to trade items and coins.');return action('account');}
      if(name!=='trade-close'&&ui.progress.level.level<5){ui.toast('Trading unlocks at level 5. Both golfers must reach level 5.');return;}
      if(busy)return;
      if(name==='trades'||name==='trades-refresh'){ui.closeModal();ui.navigate('trades');await load();return;}
      if(name==='trade-start'){busy=true;const actor=ui.cloud.session.user.id,inventory=await ui.cloud.call('trade_inventory',{userId:data.user});if(actor!==ui.cloud.session?.user.id)return;draft={...inventory,yourCoins:inventory.yourCoins??ui.progress.data.coins,give:[],take:[],giveCoins:0,takeCoins:0,requestId:crypto.randomUUID()};compose();return;}
      if(name==='trade-add'&&draft){const side=data.side;if(!['give','take'].includes(side))return;const e=draft[side==='give'?'yours':'theirs'].find(e=>tradeKey(e)===data.key);const chosen=draft[side].find(x=>tradeKey(x)===data.key);if(e&&chosen&&(chosen.quantity||1)<(e.quantity||1)){chosen.quantity=(chosen.quantity||1)+1;changed();}else if(e&&!chosen&&draft[side].length<5){draft[side].push({...e,quantity:1});changed();}updateCompose(side);return;}
      if(name==='trade-remove'&&draft){if(!['give','take'].includes(data.side))return;const chosen=draft[data.side].find(e=>tradeKey(e)===data.key);if((chosen?.quantity||1)>1)chosen.quantity--;else draft[data.side]=draft[data.side].filter(e=>tradeKey(e)!==data.key);changed();updateCompose(data.side);return;}
      if(name==='trade-send'&&draft){
        if(!validDraft())return;busy=true;updateCompose();
        const actor=ui.cloud.session.user.id;
        await ui.cloud.call('trade_create',{userId:draft.profile.id,offered:[...draft.give],requested:[...draft.take],offeredCoins:draft.giveCoins,requestedCoins:draft.takeCoins,requestId:draft.requestId,tradeVersion:3});
        draft=null;if(actor!==ui.cloud.session?.user.id)return;ui.closeModal();ui.navigate('trades');await load();ui.toast('Offer sent. Your friend has 24 hours to accept.');return;
      }
      if(name==='trade-review'){
        const t=ui.tradesData?.find(t=>t.id===data.id);if(!t)return;
        ui.modal(`<span class="menu-kicker">REVIEW TRADE</span><h2>Offer from ${esc(t.sender)}</h2><div class="trade-sides"><section><h3>You give</h3>${offerSide(ui,t.requested,t.requested_coins)}</section><section><h3>You receive</h3>${offerSide(ui,t.offered,t.offered_coins)}</section></div><p>This exchanges the items and coins shown above, including exact patterns. The exchange is final.</p><div class="modal-actions">${button('Back','close-modal','','button secondary')}${button('Accept exchange','trade-accept',`data-id="${t.id}"`,'button yellow')}</div>`,{wide:true});return;
      }
      if(name==='trade-accept'||name==='trade-close'){busy=true;await ui.cloud.call(name.replace('-','_'),{tradeId:data.id,tradeVersion:3});ui.closeModal();await ui.cloud.call('me');ui.world.equip(ui.progress.data.equipment,ui.items);await load();ui.toast(name==='trade-accept'?'Trade completed. Your collection and coins are updated.':'Offer closed.');}
    }catch(e){ui.toast(e.message);}finally{busy=false;if(draft&&document.querySelector('.trade-compose'))updateCompose();}
  };
  // The same friends poll carries the inbox count; no extra rapid polling loop.
  const call=ui.cloud.call.bind(ui.cloud);
  ui.cloud.call=async(...args)=>{const actor=ui.cloud.session?.user.id,result=await call(...args);if(args[0]==='friends'&&actor===ui.cloud.session?.user.id)ui.tradeInbox=result.tradeInbox||0;return result;};
}
