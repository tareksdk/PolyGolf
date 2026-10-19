import { ITEM_BY_ID, DEFAULT_EQUIPMENT } from './catalog.js';
import { tradeInventory, tradeKey, MAX_TRADE_COINS } from './trades.js';

// Auction listings use the same eligibility rules as friend trades.
export const AUCTION_HOURS = [6, 24, 72];
export const MAX_AUCTION_LISTINGS = 10;
export const AUCTION_LEVEL = 5;
export const auctionCoins = n => Number.isSafeInteger(n) && n >= 1 && n <= MAX_TRADE_COINS;
// Each new bid must beat the current one by 5%, rounded up, and at least one coin.
export const minimumBid = a => a.highest_bid > 0 ? a.highest_bid + Math.max(1, Math.ceil(a.highest_bid * 0.05)) : a.starting_bid;
export function validateListing(entry, state, start, buyout = null, hours = 24) {
  if (!entry || typeof entry.id !== 'string') throw Error('Choose an item to list.');
  const item = ITEM_BY_ID[entry.id], clean = item?.finish ? {id:entry.id,seed:entry.seed} : {id:entry.id};
  if (!tradeInventory(state).some(e => tradeKey(e) === tradeKey(clean))) throw Error('This item cannot be listed.');
  if (!auctionCoins(start)) throw Error('Enter a starting bid between 1 and 1,000,000,000 coins.');
  if (buyout !== null && (!auctionCoins(buyout) || buyout < start)) throw Error('The instant-buy price must be at least the starting bid.');
  if (!AUCTION_HOURS.includes(hours)) throw Error('Choose an auction length of 6, 24 or 72 hours.');
  // The database removes the item and resets equipment to this server-chosen fallback.
  return {item:{...clean,category:item.category,fallback:DEFAULT_EQUIPMENT[item.category]},start,buyout,hours};
}
export function publicAuction(row, me, names = {}) {
  const ended = row.status === 'active' && Date.parse(row.ends_at) <= Date.now();
  return {
    id:row.id,item:row.item.seed === undefined ? {id:row.item.id} : {id:row.item.id,seed:row.item.seed},
    seller:names[row.seller_id] || 'Golfer',mine:row.seller_id === me,leading:!!me && row.bidder_id === me,
    starting_bid:row.starting_bid,buyout:row.buyout,highest_bid:row.highest_bid,bid_count:row.bid_count,
    minimum:minimumBid(row),status:ended ? 'ending' : row.status,ends_at:row.ends_at,created_at:row.created_at,resolved_at:row.resolved_at,
    won:!!me && row.bidder_id === me && row.status === 'sold'
  };
}
