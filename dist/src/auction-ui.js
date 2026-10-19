import {page,button,esc,coins} from './views.js';
import {ITEM_BY_ID} from './catalog.js';
import {tradeKey} from './trades.js';
const name=e=>(ITEM_BY_ID[e.id]?.name||e.id)+(e.seed===undefined?'':' · #'+String(e.seed).padStart(3,'0'))+((e.quantity||1)>1?' · ×'+e.quantity:'');
const minimum=a=>a.highest_bid?a.highest_bid+Math.max(1,Math.ceil(a.highest_bid*.05)):a.starting_bid;
const remaining=a=>{const m=Math.max(0,Math.ceil((Date.parse(a.ends_at)-Date.now())/60000));return m>=60?Math.floor(m/60)+'h '+m%60+'m':m+'m';};
function art(ui,e){const i=ITEM_BY_ID[e.id];return i?`<img src="${ui.world.itemThumbnail({...i,...(e.seed===undefined?{}:{seed:e.seed})})}" alt="" width="216" height="150" loading="lazy" decoding="async">`:'';}
export function installAuctions(ui){
 const render=ui.render.bind(ui),action=ui.action.bind(ui);let rows=[],pool=[],scope='market',loading=false,error='',more=false,owner=null,busy=false,draft=null,review=null,observer;
 const eligible=()=>ui.cloud.session&&!ui.cloud.isGuest&&ui.progress.level.level>=5;
 function view(){
  const me=ui.cloud.session?.user.id;
  const content=!eligible()?`<section class="panel empty-state"><h2>A new home for your rare finds.</h2><p>The auction house unlocks at level 5 with an account.</p>${button(ui.cloud.session&&!ui.cloud.isGuest?'Play a round':'Sign in / Create account',ui.cloud.session&&!ui.cloud.isGuest?'courses':'account','','button yellow')}</section>`:`<div class="auction-tools"><nav aria-label="Auction view">${[['market','Browse'],['mine','My listings'],['bids','My bids']].map(([id,label])=>button(label,'auction-scope',`data-id="${id}" aria-pressed="${scope===id}"`,'button '+(scope===id?'yellow':'secondary'))).join('')}</nav><div>${button('List an item','auction-compose','','button yellow')}${button('Refresh','auction-refresh','','button secondary')}</div></div><label class="auction-search">Search listings<input id="auction-search" type="search" placeholder="Item name or pattern number" autocomplete="off"></label>${error?`<p role="alert">${esc(error)}</p>`:''}<div class="auction-grid">${rows.map(a=>`<article class="auction-card" data-auction-name="${esc(name(a.item).toLowerCase())}">${art(ui,a.item)}<div><span class="eyebrow">${a.status==='active'?remaining(a)+' left':esc(a.status)}${a.bidder_id===me?' · Your bid leads':''}</span><h2>${esc(name(a.item))}</h2><p>Listed by ${esc(a.seller)}</p><div class="auction-prices"><span><small>${a.highest_bid?'Current bid':'Starting bid'}</small>${coins(a.highest_bid||a.starting_bid)}</span>${a.buyout?`<span><small>Buy now</small>${coins(a.buyout)}</span>`:''}</div><footer>${a.status==='active'?(a.seller_id===me?(a.bid_count?'<span>Bidding is underway</span>':button('Cancel listing','auction-review',`data-id="${a.id}" data-kind="cancel"`,'button secondary')):button('Place bid','auction-review',`data-id="${a.id}" data-kind="bid"`,'button secondary')+(a.buyout?button('Buy now','auction-review',`data-id="${a.id}" data-kind="buy"`,'button yellow'):'')):'<span>Item and coins delivered automatically</span>'}</footer></div></article>`).join('')}</div>${loading?'<p role="status">Loading the auction house…</p>':!rows.length?'<section class="panel empty-state"><h2>No listings here yet.</h2><p>List a tradable item from your Caddie to get things started.</p></section>':''}${more?'<div id="auction-more" role="status">Loading more listings…</div>':''}<p class="small-note">Items and leading bids are held until the auction ends. Outbid coins return immediately. Listings can be cancelled before their first bid. Purchased items stack in your Caddie, including matching patterns.</p>`;
  return page(ui,'Auction house','Bid on a rare find, buy it now, or give part of your collection a new home.',content,button('Trading','trades','','button secondary'));
 }
 async function load(append=false){
  if(!eligible()||loading)return;const actor=ui.cloud.session.user.id,currentScope=scope;loading=true;error='';ui.render();
  try{const d=await ui.cloud.call('auctions',{scope,offset:append?rows.length:0});if(actor!==ui.cloud.session?.user.id||currentScope!==scope)return;rows=append?[...rows,...d.auctions.filter(a=>!rows.some(b=>a.id===b.id))]:d.auctions;pool=d.inventory;more=d.more;owner=actor;}
  catch(e){error=e.message;}finally{loading=false;if(ui.screen==='auctions')ui.render();}
 }
 function drawCompose(){
  ui.modal(`<section class="auction-compose"><span class="eyebrow">FROM YOUR CADDIE</span><h2>List an item</h2><p>Select an item or exact pattern, then choose how many copies to list. Exclusive rewards stay with their original owner.</p><label>Search your items<input type="search" id="auction-inventory-search" placeholder="Search collection"></label><div class="auction-inventory">${pool.map(e=>button(art(ui,e)+`<span>${esc(name(e))}</span>`,'auction-pick',`data-key="${esc(tradeKey(e))}" data-item-name="${esc(name(e).toLowerCase())}" aria-pressed="${!!draft.item&&tradeKey(draft.item)===tradeKey(e)}"`,'auction-pick')).join('')||'<p>No tradable items available.</p>'}</div><strong id="auction-selected">${draft.item?esc(name(draft.item)):'Choose an item above'}</strong><div class="auction-form"><label>Copies in this listing<input id="auction-quantity" type="number" min="1" max="${draft.available||1}" step="1" value="${draft.quantity||1}"></label><label>Starting bid for the lot<input id="auction-start" type="number" min="1" max="1000000000" step="1" value="${draft.start}"></label><label>Buy now for the lot (optional)<input id="auction-buyout" type="number" min="1" max="1000000000" step="1" value="${draft.buyout??''}" placeholder="No instant buy"></label><fieldset><legend>Duration</legend>${[6,24,72].map(n=>button(n+' hours','auction-duration',`data-hours="${n}" aria-pressed="${draft.hours===n}"`,'button secondary')).join('')}</fieldset></div><p>Your item will be held in the auction house until it sells or returns to you. No listing fee.</p><div class="modal-actions">${button('Back','close-modal','','button secondary')}${button('Create listing','auction-submit',draft.item?'':'disabled','button yellow')}</div></section>`,{wide:true});
 }
 const values=()=>{if(!draft)return;draft.quantity=Number(document.querySelector('#auction-quantity')?.value||1);draft.start=Number(document.querySelector('#auction-start')?.value||1);const v=document.querySelector('#auction-buyout')?.value;draft.buyout=v?Number(v):null;};
 ui.render=()=>{
  if(ui.game.state==='menu'&&ui.screen==='auctions'){
   if(owner!==ui.cloud.session?.user.id){rows=[];pool=[];owner=ui.cloud.session?.user.id;}
   ui.root.innerHTML=view();ui.root.classList.add('clubhouse-menu');ui.root.dataset.screen='auctions';document.body.classList.remove('in-round');document.body.dataset.screen='auctions';const top=ui.root.querySelector('.topbar');if(top)ui.root.style.setProperty('--header-height',Math.ceil(top.getBoundingClientRect().height)+'px');observer?.disconnect();if(more&&!loading){observer=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting))load(true);});const el=ui.root.querySelector('#auction-more');if(el)observer.observe(el);}
  }else {observer?.disconnect();render();}
 };
 ui.action=async(n,d={})=>{
  if(!n.startsWith('auction')&&n!=='auctions')return action(n,d);
  if(n==='auctions'){ui.navigate('auctions');await load();return;}
  if(!eligible()){ui.toast('The auction house unlocks for accounts at level 5.');return;}
  if(n==='auction-refresh'){await load();return;}
  if(n==='auction-scope'){if(loading)return;scope=d.id;rows=[];more=false;await load();return;}
  if(n==='auction-compose'){draft={item:null,quantity:1,available:1,start:1000,buyout:null,hours:24,requestId:crypto.randomUUID()};drawCompose();return;}
  if(n==='auction-pick'&&draft){values();draft.item=pool.find(e=>tradeKey(e)===d.key);draft.available=draft.item.quantity||1;draft.quantity=1;const quantity=document.querySelector("#auction-quantity");quantity.max=draft.available;quantity.value=1;draft.requestId=crypto.randomUUID();document.querySelectorAll('.auction-pick').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.key===d.key)));document.querySelector('#auction-selected').textContent=name(draft.item);document.querySelector('[data-action="auction-submit"]').disabled=false;return;}
  if(n==='auction-duration'&&draft){draft.hours=Number(d.hours);draft.requestId=crypto.randomUUID();document.querySelectorAll('[data-action="auction-duration"]').forEach(el=>el.setAttribute('aria-pressed',String(Number(el.dataset.hours)===draft.hours)));return;}
  if(n==='auction-review'){
   const a=rows.find(a=>a.id===d.id);if(!a)return;review={a,kind:d.kind,requestId:crypto.randomUUID()};
   ui.modal(`<section class="auction-review">${art(ui,a.item)}<h2>${d.kind==='buy'?'Buy now':d.kind==='cancel'?'Cancel listing':'Place a bid'}</h2><h3>${esc(name(a.item))}</h3>${d.kind==='bid'?`<label>Your bid<input id="auction-amount" type="number" step="1" min="${minimum(a)}" max="1000000000" value="${minimum(a)}"></label><p>Minimum ${minimum(a).toLocaleString()} coins. Your leading bid is reserved until you win or are outbid.</p>`:d.kind==='buy'?`<p>Buy this item for <strong>${a.buyout.toLocaleString()} coins</strong>?</p>`:'<p>The item will return to your Caddie.</p>'}<div class="modal-actions">${button('Back','close-modal','','button secondary')}${button(d.kind==='buy'?'Buy for '+a.buyout.toLocaleString():d.kind==='cancel'?'Return item':'Confirm bid','auction-confirm','','button yellow')}</div></section>`);return;
  }
  if(busy)return;busy=true;document.querySelectorAll('[data-action="auction-submit"],[data-action="auction-confirm"]').forEach(el=>el.disabled=true);
  try{
   if(n==='auction-submit'&&draft?.item){values();await ui.cloud.call('auction_create',{...draft,item:{...draft.item,quantity:draft.quantity}});ui.closeModal();draft=null;scope='mine';await load();ui.toast('Your item is listed.');}
   if(n==='auction-confirm'&&review){const {a,kind}=review,amount=kind==='bid'?Number(document.querySelector('#auction-amount').value):kind==='buy'?a.buyout:null;
    const result=await ui.cloud.call('auction_'+(kind==='buy'?'buy':kind==='cancel'?'cancel':'bid'),{auctionId:a.id,amount,requestId:review.requestId});ui.closeModal();review=null;await load();ui.toast(result.closed?'That auction has ended.':result.auction.status==='sold'?'It’s yours. Find it in your Caddie.':kind==='cancel'?'Item returned to your Caddie.':'Your bid is in.');}
  }catch(e){ui.toast(e.message);}finally{busy=false;document.querySelectorAll('[data-action="auction-submit"],[data-action="auction-confirm"]').forEach(el=>el.disabled=false);}
 };
 document.addEventListener('input',e=>{
  if(e.target.id==='auction-search'||e.target.id==='auction-inventory-search'){
   const query=e.target.value.trim().toLowerCase(),inventory=e.target.id==='auction-inventory-search';document.querySelectorAll(inventory?'.auction-pick':'.auction-card').forEach(el=>el.hidden=!(inventory?el.dataset.itemName:el.dataset.auctionName).includes(query));
  }
  if(['auction-start','auction-buyout','auction-quantity'].includes(e.target.id)&&draft)draft.requestId=crypto.randomUUID();
  if(e.target.id==='auction-amount'&&review)review.requestId=crypto.randomUUID();
 });
}
