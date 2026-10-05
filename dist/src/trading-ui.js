import { page, button, esc, rarityClass } from './views.js';
import { ITEM_BY_ID, RARITY } from './catalog.js';
import { tradeKey } from './trades.js';

const itemName = e => (ITEM_BY_ID[e.id]?.name || e.id) + (e.seed === undefined ? '' : ' · Pattern #' + String(e.seed).padStart(3,'0'));
function card(ui,e) {
  const i=ITEM_BY_ID[e.id]; if(!i)return '';
  return `<div class="trade-item ${rarityClass(i)}" style="--rarity:${RARITY[i.rarity]}"><img src="${ui.world.itemThumbnail({...i,...(e.seed===undefined?{}:{seed:e.seed})})}" alt=""><span>${esc(itemName(e))}<small>${esc(i.rarity)}</small></span></div>`;
}
function view(ui) {
  const me=ui.cloud.session?.user.id, trades=ui.tradesData || [];
  return page(ui,'Trading','Swap shop and locker items with friends. Every offer expires after 24 hours.', !me ? `<section class="panel empty-state"><h2>Bring your collection.</h2><p>Sign in to send and receive trade offers.</p>${button('Sign in','account','','button yellow')}</section>` : `<div class="trade-toolbar"><span>Country Club, level, rank, code and achievement rewards stay with their original owner.</span>${button('Find a friend','friends','','button secondary')}${button('Refresh','trades-refresh','','button secondary')}</div>${ui.tradesLoading?'<p>Loading offers…</p>':!trades.length?'<section class="panel empty-state"><h2>No offers yet.</h2><p>Open a friend’s profile and choose Trade items to start.</p></section>':`<div class="trade-list">${trades.map(t=>`<article class="panel trade-offer"><header><div><small>${t.sender_id===me?'SENT TO':'FROM'}</small><h2>${esc(t.sender_id===me?t.receiver:t.sender)}</h2></div><span class="trade-status ${t.status}">${esc(t.status)}</span></header><div class="trade-sides"><section><h3>You give</h3>${(t.sender_id===me?t.offered:t.requested).map(e=>card(ui,e)).join('')}</section><section><h3>You receive</h3>${(t.sender_id===me?t.requested:t.offered).map(e=>card(ui,e)).join('')}</section></div><footer><small>${t.status==='pending'?'Expires '+new Date(t.expires_at).toLocaleString():'Updated '+new Date(t.resolved_at||t.created_at).toLocaleDateString()}</small>${t.status==='pending'?button(t.receiver_id===me?'Review offer':'Cancel offer',t.receiver_id===me?'trade-review':'trade-close',`data-id="${t.id}"`,'button '+(t.receiver_id===me?'yellow':'secondary')):''}${t.status==='pending'&&t.receiver_id===me?button('Decline','trade-close',`data-id="${t.id}"`,'text-button'):''}</footer></article>`).join('')}</div>`}`);
}
export function installTrading(ui) {
  const render=ui.render.bind(ui),action=ui.action.bind(ui);
  let draft=null,busy=false,owner=null;
  async function load() {ui.tradesLoading=true;ui.render();const actor=ui.cloud.session?.user.id;try{const d=await ui.cloud.call('trades');if(actor===ui.cloud.session?.user.id){ui.tradesData=d.trades;ui.tradeInbox=d.trades.filter(t=>t.receiver_id===actor&&t.status==='pending').length;}}finally{ui.tradesLoading=false;ui.render();}}
  function compose() {
    ui.modal(`<section class="trade-compose"><span class="menu-kicker">NEW OFFER</span><h2>Trade with ${esc(draft.profile.username)}</h2><p>Pick up to five items on each side. Items move only when your friend accepts.</p><div class="trade-sides">${[['give','You give','yours'],['take','You receive','theirs']].map(([side,label,pool])=>`<section><h3>${label}</h3><label class="sr-only" for="trade-${side}">${label}</label><select id="trade-${side}"><option value="">Choose an item…</option>${draft[pool].filter(e=>!draft[side].some(x=>tradeKey(e)===tradeKey(x))).map(e=>`<option value="${esc(tradeKey(e))}">${esc(itemName(e))} · ${esc(ITEM_BY_ID[e.id].rarity)}</option>`).join('')}</select>${button('Add item','trade-add',`data-side="${side}" ${draft[side].length>=5?'disabled':''}`,'button secondary wide')}<div class="trade-selection">${draft[side].map(e=>`<div>${card(ui,e)}${button('Remove','trade-remove',`data-side="${side}" data-key="${esc(tradeKey(e))}"`,'text-button')}</div>`).join('')||'<p>No items selected.</p>'}</div></section>`).join('')}</div><p class="small-note">Exact pattern numbers are included. Coins, lockers and exclusive earned rewards cannot be traded. An offer can become unavailable if either inventory changes.</p>${button('Send offer','trade-send',!draft.give.length||!draft.take.length?'disabled':'','button yellow wide')}</section>`,{wide:true});
  }
  ui.render=()=>{const actor=ui.cloud.session?.user.id||'guest';if(owner!==actor){owner=actor;draft=null;ui.tradesData=[];ui.tradeInbox=0;}if(ui.game.state==='menu'&&ui.screen==='trades'){ui.root.innerHTML=view(ui);ui.root.classList.add('clubhouse-menu');ui.root.dataset.screen='trades';}else render();};
  ui.action=async(name,data={})=>{
    if(!['trades','trades-refresh','trade-start','trade-add','trade-remove','trade-send','trade-review','trade-accept','trade-close'].includes(name))return action(name,data);
    try {
      if(!ui.cloud.session){ui.toast('Sign in to trade items.');return action('account');}
      if(busy)return;
      if(name==='trades'||name==='trades-refresh'){ui.closeModal();ui.navigate('trades');await load();return;}
      if(name==='trade-start'){busy=true;const actor=ui.cloud.session.user.id,inventory=await ui.cloud.call('trade_inventory',{userId:data.user});if(actor!==ui.cloud.session?.user.id)return;draft={...inventory,give:[],take:[],requestId:crypto.randomUUID()};compose();return;}
      if(name==='trade-add'&&draft){const side=data.side;if(!['give','take'].includes(side))return;const key=document.getElementById('trade-'+side)?.value,e=draft[side==='give'?'yours':'theirs'].find(e=>tradeKey(e)===key);if(e&&draft[side].length<5&&!draft[side].some(x=>tradeKey(x)===key))draft[side].push(e);compose();return;}
      if(name==='trade-remove'&&draft){if(!['give','take'].includes(data.side))return;draft[data.side]=draft[data.side].filter(e=>tradeKey(e)!==data.key);compose();return;}
      if(name==='trade-send'&&draft){busy=true;await ui.cloud.call('trade_create',{userId:draft.profile.id,offered:draft.give,requested:draft.take,requestId:draft.requestId});draft=null;ui.closeModal();ui.navigate('trades');await load();ui.toast('Offer sent. Your friend has 24 hours to accept.');return;}
      if(name==='trade-review'){
        const t=ui.tradesData?.find(t=>t.id===data.id);if(!t)return;
        ui.modal(`<span class="menu-kicker">REVIEW TRADE</span><h2>Offer from ${esc(t.sender)}</h2><div class="trade-sides"><section><h3>You give</h3>${t.requested.map(e=>card(ui,e)).join('')}</section><section><h3>You receive</h3>${t.offered.map(e=>card(ui,e)).join('')}</section></div><p>This exchanges the items shown above, including their exact patterns. The exchange is final.</p><div class="modal-actions">${button('Back','close-modal','','button secondary')}${button('Accept exchange','trade-accept',`data-id="${t.id}"`,'button yellow')}</div>`,{wide:true});return;
      }
      if(name==='trade-accept'||name==='trade-close'){busy=true;await ui.cloud.call(name.replace('-','_'),{tradeId:data.id});ui.closeModal();await ui.cloud.call('me');ui.world.equip(ui.progress.data.equipment,ui.items);await load();ui.toast(name==='trade-accept'?'Trade completed. Your collection is updated.':'Offer closed.');}
    }catch(e){ui.toast(e.message);}finally{busy=false;}
  };
  // The same friends poll carries the inbox count; no extra rapid polling loop.
  const call=ui.cloud.call.bind(ui.cloud);
  ui.cloud.call=async(...args)=>{const actor=ui.cloud.session?.user.id,result=await call(...args);if(args[0]==='friends'&&actor===ui.cloud.session?.user.id)ui.tradeInbox=result.tradeInbox||0;return result;};
}
