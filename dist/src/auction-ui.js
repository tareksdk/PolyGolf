import { page, button, esc, rarityClass, coins } from './views.js';
import { ITEM_BY_ID, RARITY, CATEGORIES } from './catalog.js';
import { tradeKey, MAX_TRADE_COINS } from './trades.js';
import { AUCTION_HOURS, AUCTION_LEVEL, MAX_AUCTION_LISTINGS, auctionCoins } from './auctions.js';
import { icon } from './icons.js';

const itemName = e => (ITEM_BY_ID[e.id]?.name || e.id) + (e.seed === undefined ? '' : ' · Pattern #' + String(e.seed).padStart(3,'0'));
const art = (ui,e) => `<img src="${ui.world.itemThumbnail({...ITEM_BY_ID[e.id],...(e.seed===undefined?{}:{seed:e.seed})})}" alt="" loading="lazy" decoding="async" width="216" height="150">`;
export function timeLeft(endsAt, now = Date.now()) {
  const s = Math.max(0, Math.floor((Date.parse(endsAt) - now) / 1000));
  if (!s) return 'Ending now';
  const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60);
  return h >= 24 ? Math.floor(h / 24) + 'd ' + (h % 24) + 'h left' : h ? h + 'h ' + m + 'm left' : Math.max(1, m) + 'm left';
}
const STATUS = {active:'Live',ending:'Ending',sold:'Sold',expired:'Unsold',cancelled:'Cancelled',refunded:'Refunded'};
export const AUCTION_SORTS = [['ending','Ending soon'],['price','Lowest price'],['newest','Newest'],['rarity','Rarest']];
const RANKS = Object.keys(RARITY);
const price = a => a.highest_bid || a.starting_bid;
export function filterAuctions(list, {query = '', category = 'all', sort = 'ending'} = {}) {
  const q = query.toLowerCase().trim();
  const rows = list.filter(a => ITEM_BY_ID[a.item.id] && (category === 'all' || ITEM_BY_ID[a.item.id].category === category) && (!q || itemName(a.item).toLowerCase().includes(q) || a.seller.toLowerCase().includes(q)));
  const by = {ending:(a,b)=>Date.parse(a.ends_at)-Date.parse(b.ends_at),price:(a,b)=>price(a)-price(b),newest:(a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at),rarity:(a,b)=>RANKS.indexOf(ITEM_BY_ID[b.item.id].rarity)-RANKS.indexOf(ITEM_BY_ID[a.item.id].rarity)}[sort];
  return by ? rows.sort(by) : rows;
}
function lot(ui, a, coinsHeld) {
  const i = ITEM_BY_ID[a.item.id]; if (!i) return '';
  const live = a.status === 'active', owned = ui.progress.data.owned.includes(a.item.id) && (a.item.seed === undefined || (ui.progress.data.patterns?.[a.item.id] || []).includes(a.item.seed));
  const tag = a.mine ? '<span class="auction-tag">Your listing</span>' : a.leading && live ? '<span class="auction-tag lead">You lead</span>' : a.won ? '<span class="auction-tag lead">Won</span>' : '';
  let actions = '';
  if (live && a.mine) actions = a.bid_count ? '<small class="auction-note">Bids placed. It sells when the timer ends.</small>' : button('Cancel listing','auction-cancel',`data-id="${a.id}"`,'button secondary');
  else if (live && owned) actions = '<small class="auction-note">Already in your caddie.</small>';
  else if (live) actions = button(a.leading ? 'Raise bid' : 'Bid','auction-bid-open',`data-id="${a.id}"`,'button secondary') + (a.buyout ? button('Buy now','auction-buy-open',`data-id="${a.id}" ${a.buyout > coinsHeld + (a.leading ? a.highest_bid : 0) ? 'disabled title="Not enough coins"' : ''}`,'button yellow') : '');
  return `<article class="panel auction-lot ${rarityClass(i)}" style="--rarity:${RARITY[i.rarity]}"><div class="auction-art">${art(ui,a.item)}${tag}</div><div class="auction-body"><span class="rarity-chip" style="--rarity:${RARITY[i.rarity]}">${esc(i.rarity)} · ${esc(CATEGORIES.find(c=>c.id===i.category)?.name || i.category)}</span><h3>${esc(itemName(a.item))}</h3><small>Sold by ${esc(a.seller)}</small><dl class="auction-facts"><div><dt>${a.bid_count ? 'Current bid' : 'Starting bid'}</dt><dd>${coins(price(a))}</dd></div><div><dt>${a.buyout ? 'Buy now' : 'Bids'}</dt><dd>${a.buyout ? coins(a.buyout) : a.bid_count}</dd></div></dl><p class="auction-time ${live ? '' : 'done'}">${icon('clock')}${live ? timeLeft(a.ends_at) + (a.bid_count ? ' · ' + a.bid_count + (a.bid_count === 1 ? ' bid' : ' bids') : '') : STATUS[a.status] || a.status}</p><div class="auction-actions">${actions}</div></div></article>`;
}
function view(ui) {
  const me = ui.cloud.session?.user.id, d = ui.auctionData;
  const switcher = `<nav class="market-tabs" aria-label="Trading">${button('Friend trades','trades','','')}${button('Auction house','auctions','aria-current="page"','active')}</nav>`;
  if (!me || ui.cloud.isGuest) return page(ui,'Auction House','List items for bids or sell them instantly.',`${switcher}<section class="panel empty-state"><h2>Open a stall.</h2><p>Sign in to an account to bid on and list items.</p>${button('Sign in','account','','button yellow')}</section>`);
  if (ui.progress.level.level < AUCTION_LEVEL) return page(ui,'Auction House','List items for bids or sell them instantly.',`${switcher}<section class="panel empty-state"><h2>Reach level ${AUCTION_LEVEL}.</h2><p>The auction house opens at level ${AUCTION_LEVEL}. Finish a few more rounds to start bidding.</p>${button('Find a course','courses','','button yellow')}</section>`);
  const f = ui.auctionFilters, tab = ui.auctionTab || 'browse';
  const list = !d ? [] : tab === 'mine' ? d.mine : filterAuctions(d.auctions, f);
  const cats = [['all','All items'],...CATEGORIES.filter(c=>c.id!=='all').map(c=>[c.id,c.name])];
  const active = d ? d.mine.filter(a=>a.mine&&a.status==='active').length : 0;
  const toolbar = `<div class="auction-toolbar"><div class="auction-tabs" role="tablist">${[['browse','Browse'],['mine','My auctions']].map(([id,label])=>`<button role="tab" data-action="auction-tab" data-tab="${id}" aria-selected="${tab===id}" class="${tab===id?'active':''}">${label}${id==='mine'&&d?.mine.some(a=>a.leading&&a.status==='active')?' <span class="auction-dot" aria-label="You are leading a bid"></span>':''}</button>`).join('')}</div>${tab==='browse'?`<label class="caddie-search auction-search">${icon('search')}<input data-auction-filter="query" type="search" value="${esc(f.query)}" placeholder="Find an item or seller" aria-label="Search auctions" autocomplete="off"></label><select data-auction-filter="category" aria-label="Item type">${cats.map(([id,label])=>`<option value="${id}" ${f.category===id?'selected':''}>${esc(label)}</option>`).join('')}</select><select data-auction-filter="sort" aria-label="Sort auctions">${AUCTION_SORTS.map(([id,label])=>`<option value="${id}" ${f.sort===id?'selected':''}>${label}</option>`).join('')}</select>`:''}${button(icon('reset')+'Refresh','auction-refresh','aria-label="Refresh auctions"','button secondary')}${button('List an item','auction-list-open',active>=MAX_AUCTION_LISTINGS?'disabled title="You have 10 active listings"':'','button yellow')}</div>`;
  const body = ui.auctionLoading && !d ? '<p>Loading the auction house…</p>' : !list.length ? `<section class="panel empty-state"><h2>${tab==='mine'?'No auctions yet.':'Nothing on the block.'}</h2><p>${tab==='mine'?'Items you list or bid on appear here.':f.query||f.category!=='all'?'No listings match your search.':'Be the first to list an item from your caddie.'}</p></section>` : `<div class="auction-grid">${list.map(a=>lot(ui,a,d.coins)).join('')}</div>`;
  return page(ui,'Auction House','Bid on items from other golfers, or buy them instantly. Outbid coins return to you right away.',`${switcher}${toolbar}${body}<p class="small-note">Listed items leave your caddie until the auction ends. Sellers are paid when the timer ends or someone buys instantly. Unsold items come back automatically.</p>`);
}

export function installAuctions(ui) {
  const render = ui.render.bind(ui), action = ui.action.bind(ui);
  let busy = false, owner = null, draft = null, timer = 0;
  ui.auctionFilters = {query:'',category:'all',sort:'ending'};
  async function load() {
    ui.auctionLoading = true; ui.render(); const actor = ui.cloud.session?.user.id;
    try { const d = await ui.cloud.call('auctions'); if (actor === ui.cloud.session?.user.id) ui.auctionData = d; }
    finally { ui.auctionLoading = false; ui.render(); }
  }
  const find = id => ui.auctionData && [...ui.auctionData.auctions, ...ui.auctionData.mine].find(a => a.id === id);
  function listing() {
    const query = (draft.query || '').toLowerCase().trim(), pool = ui.auctionData.inventory.filter(e => !query || itemName(e).toLowerCase().includes(query));
    return pool.map(e => { const i = ITEM_BY_ID[e.id], on = draft.item && tradeKey(draft.item) === tradeKey(e);
      return `<button class="trade-pick ${rarityClass(i)} ${on?'selected':''}" style="--rarity:${RARITY[i.rarity]}" data-action="auction-pick" data-key="${esc(tradeKey(e))}" aria-pressed="${!!on}" aria-label="List ${esc(itemName(e))}">${art(ui,e)}<span>${esc(itemName(e))}</span><small>${esc(i.rarity)}</small><i aria-hidden="true">${on?'✓':'+'}</i></button>`; }).join('') || '<p class="trade-empty">No listable items match. Country Club, level, rank, code and achievement rewards stay with their owner.</p>';
  }
  function validListing() { return !!draft.item && auctionCoins(draft.start) && (draft.buyout === null || (auctionCoins(draft.buyout) && draft.buyout >= draft.start)) && AUCTION_HOURS.includes(draft.hours); }
  function updateListing(full) {
    if (!draft) return;
    if (full) document.getElementById('auction-inventory').innerHTML = listing();
    const send = document.querySelector('[data-action="auction-list"]'); if (send) send.disabled = busy || !validListing();
    const note = document.getElementById('auction-validation');
    if (note) note.textContent = !draft.item ? 'Choose an item to list.' : !auctionCoins(draft.start) ? 'Enter a starting bid between 1 and 1,000,000,000 coins.' : draft.buyout !== null && !(auctionCoins(draft.buyout) && draft.buyout >= draft.start) ? 'The instant-buy price must be at least the starting bid.' : '';
  }
  function compose() {
    ui.modal(`<section class="auction-compose"><span class="menu-kicker">NEW LISTING</span><h2>List an item</h2><p>Pick an item, set a starting bid and, if you like, a price to buy it instantly.</p><div class="trade-inventory-heading"><strong>Your listable items</strong><label class="trade-search">${icon('search')}<input data-auction-draft="query" type="search" placeholder="Find an item" aria-label="Search your listable items" autocomplete="off"></label></div><div class="trade-inventory" id="auction-inventory">${listing()}</div><div class="auction-fields"><div class="trade-coins-field"><label for="auction-start">Starting bid</label><div><i class="coin-icon" aria-hidden="true">P</i><input id="auction-start" data-auction-draft="start" type="number" inputmode="numeric" min="1" max="${MAX_TRADE_COINS}" step="1" value="${draft.start}" autocomplete="off"></div></div><div class="trade-coins-field"><label for="auction-buyout">Buy now price <small>(optional)</small></label><div><i class="coin-icon" aria-hidden="true">P</i><input id="auction-buyout" data-auction-draft="buyout" type="number" inputmode="numeric" min="1" max="${MAX_TRADE_COINS}" step="1" placeholder="No instant buy" autocomplete="off"></div></div><div class="trade-coins-field"><label for="auction-hours">Length</label><select id="auction-hours" data-auction-draft="hours">${AUCTION_HOURS.map(h=>`<option value="${h}" ${h===draft.hours?'selected':''}>${h} hours</option>`).join('')}</select></div></div><p id="auction-validation" class="trade-validation" role="status"></p>${button('List item','auction-list','disabled','button yellow wide')}</section>`, {wide:true});
    updateListing();
  }
  function confirm(a, buy) {
    const held = ui.auctionData.coins, min = a.minimum;
    ui.modal(`<section class="auction-confirm"><span class="menu-kicker">${buy?'BUY NOW':'PLACE A BID'}</span><h2>${esc(itemName(a.item))}</h2><div class="auction-confirm-item ${rarityClass(ITEM_BY_ID[a.item.id])}" style="--rarity:${RARITY[ITEM_BY_ID[a.item.id].rarity]}">${art(ui,a.item)}<dl class="auction-facts"><div><dt>${a.bid_count?'Current bid':'Starting bid'}</dt><dd>${coins(price(a))}</dd></div><div><dt>Time left</dt><dd>${timeLeft(a.ends_at)}</dd></div></dl></div>${buy?`<p>Buy this item now for ${coins(a.buyout)}. It goes straight to your caddie.</p>`:`<div class="trade-coins-field"><label for="auction-amount">Your bid <small>(at least ${min.toLocaleString()})</small></label><div><i class="coin-icon" aria-hidden="true">P</i><input id="auction-amount" type="number" inputmode="numeric" min="${min}" max="${a.buyout || MAX_TRADE_COINS}" step="1" value="${min}" autocomplete="off"></div><small>${held.toLocaleString()} coins available. If someone outbids you, your coins come straight back.</small></div>`}<div class="modal-actions">${button('Back','close-modal','','button secondary')}${button(buy?'Buy now':'Place bid',buy?'auction-buy':'auction-bid',`data-id="${a.id}"`,'button yellow')}</div></section>`);
  }
  async function act(kind, a, amount) {
    busy = true; const actor = ui.cloud.session.user.id;
    const r = await ui.cloud.call('auction_' + kind, {auctionId:a.id, amount, requestId:crypto.randomUUID()});
    if (actor !== ui.cloud.session?.user.id) return;
    ui.closeModal(); ui.world.equip(ui.progress.data.equipment, ui.items); busy = false; await load();
    if (r.closed) ui.toast('That auction already ended. The results are updated.');
    else if (kind === 'cancel') ui.toast('Listing cancelled. The item is back in your caddie.');
    else if (r.auction.status === 'sold') { ui.audio?.play?.('purchase'); ui.toast(itemName(a.item) + ' is yours. Check your caddie.'); }
    else ui.toast('Bid placed. You are the top bidder.');
  }
  document.addEventListener('input', event => {
    const key = event.target.dataset.auctionFilter, field = event.target.dataset.auctionDraft;
    if (key && ui.screen === 'auctions') {
      ui.auctionFilters[key] = event.target.value;
      if (key === 'query') { clearTimeout(timer); timer = setTimeout(() => { const el = document.activeElement?.dataset?.auctionFilter; ui.render(); if (el) { const input = document.querySelector(`[data-auction-filter="${el}"]`); input?.focus(); input?.setSelectionRange?.(input.value.length, input.value.length); } }, 180); }
      else ui.render();
    }
    if (field && draft && !busy) {
      if (field === 'query') { draft.query = event.target.value; updateListing(true); return; }
      const raw = event.target.value.trim();
      draft[field] = field === 'buyout' && raw === '' ? null : event.target.validity.badInput ? NaN : Number(raw);
      draft.requestId = crypto.randomUUID(); updateListing();
    }
  });
  ui.render = () => {
    const actor = ui.cloud.session?.user.id || 'guest';
    if (owner !== actor) { owner = actor; draft = null; ui.auctionData = null; }
    if (ui.game.state === 'menu' && ui.screen === 'auctions') { ui.root.innerHTML = view(ui); ui.root.classList.add('clubhouse-menu'); ui.root.dataset.screen = 'auctions'; }
    else render();
  };
  ui.action = async (name, data = {}) => {
    if (!name?.startsWith?.('auction')) return action(name, data);
    try {
      if (name === 'auctions') { ui.closeModal(); ui.navigate('auctions'); if (ui.cloud.session && !ui.cloud.isGuest && ui.progress.level.level >= AUCTION_LEVEL) await load(); return; }
      if (name === 'auction-tab') { ui.auctionTab = data.tab === 'mine' ? 'mine' : 'browse'; ui.render(); return; }
      if (!ui.cloud.session || ui.cloud.isGuest) { ui.toast('Sign in to use the auction house.'); return action('account'); }
      if (ui.progress.level.level < AUCTION_LEVEL) { ui.toast('The auction house unlocks at level 5.'); return; }
      if (busy) return;
      if (name === 'auction-refresh') { await load(); return; }
      if (!ui.auctionData) await load();
      if (name === 'auction-list-open') { draft = {item:null, start:100, buyout:null, hours:24, requestId:crypto.randomUUID()}; compose(); return; }
      if (name === 'auction-pick' && draft) { const e = ui.auctionData.inventory.find(e => tradeKey(e) === data.key); draft.item = draft.item && tradeKey(draft.item) === data.key ? null : e || null; draft.requestId = crypto.randomUUID(); updateListing(true); return; }
      if (name === 'auction-list' && draft) {
        if (!validListing()) return; busy = true; updateListing(); const actor = ui.cloud.session.user.id;
        await ui.cloud.call('auction_create', {item:draft.item, startingBid:draft.start, buyout:draft.buyout, hours:draft.hours, requestId:draft.requestId});
        draft = null; if (actor !== ui.cloud.session?.user.id) return;
        ui.closeModal(); ui.world.equip(ui.progress.data.equipment, ui.items); busy = false; ui.auctionTab = 'mine'; await load(); ui.toast('Item listed. You can follow it in My auctions.'); return;
      }
      const a = find(data.id); if (!a) return;
      if (name === 'auction-bid-open') return confirm(a, false);
      if (name === 'auction-buy-open') return confirm(a, true);
      if (name === 'auction-bid') { const amount = Number(document.getElementById('auction-amount')?.value); if (!Number.isSafeInteger(amount) || amount < a.minimum) { ui.toast('Bid at least ' + a.minimum.toLocaleString() + ' coins.'); return; } return await act('bid', a, amount); }
      if (name === 'auction-buy') return await act('buy', a, a.buyout);
      if (name === 'auction-cancel') return await act('cancel', a);
    } catch (e) { ui.toast(e.message); if (/changed|ended|Refresh/i.test(e.message)) { busy = false; ui.closeModal(); await load().catch(() => {}); } }
    finally { busy = false; if (draft && document.querySelector('.auction-compose')) updateListing(); }
  };
}
