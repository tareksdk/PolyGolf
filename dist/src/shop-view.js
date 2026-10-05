import { socialRewards } from "./social-view.js";
import { achievementCards } from './collection-ui.js';
import { LOCKERS, availableLockers, shopBundles, lockerContents } from "./pro-shop.js";
import { halloweenActive } from './season.js';
import { ITEMS, CATEGORIES, RARITY, shopRotation } from "./catalog.js";
import { itemDescription } from "./equipment.js";
import { page, button, esc, coins, itemCard, rarityClass } from "./views.js";
import { icon } from "./icons.js";

const RANK = { Common: 0, Uncommon: 1, Rare: 2, Epic: 3, Legendary: 4, "Black Market": 5 };
export const SHELVES = [
  ["featured", "Featured"],
  ["daily", "Daily"],
  ["weekly", "Weekly"],
  ["novelty", "Novelty Rack"],
  ["lockers", "Lockers"],
  ["bundles", "Bundles"],
  ["rewards", "Achievements"],
  ["coins", "Coins & membership"],
  ["socials", "Community rewards"],
];

const hours = (ms) => {
  const h = Math.max(0, Math.floor(ms / 3600000)),
    m = Math.max(0, Math.floor((ms % 3600000) / 60000));
  return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${h}h ${m}m`;
};

export function lockerArt(ui, p) {
  return ui.world.itemThumbnail({ id: "locker-" + p.id, category: "locker", color: p.color, pattern: p.pattern, gem: p.gem, tier: p.tier });
}

export function oddsBar(p) {
  return `<div class="odds-bar" role="img" aria-label="${Object.entries(p.odds)
    .filter(([, w]) => w > 0)
    .map(([r, w]) => `${r} ${w}%`)
    .join(", ")}">${Object.entries(p.odds)
    .filter(([, w]) => w > 0)
    .map(([r, w]) => `<i style="flex:${Math.max(w, 1.6)};background:${RARITY[r]}" title="${r} · ${w}%"></i>`)
    .join("")}</div>`;
}

function sortItems(ui, items) {
  const sort = ui.shopSort || "featured",
    list = items.filter((i) => (ui.shopCategory || "all") === "all" || i.category === ui.shopCategory).filter((i) => !ui.shopHideOwned || !ui.progress.data.owned.includes(i.id));
  if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
  if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
  if (sort === "rarity") list.sort((a, b) => RANK[b.rarity] - RANK[a.rarity] || a.price - b.price);
  return list;
}

function filters(ui, items) {
  const cat = ui.shopCategory || "all",
    counts = Object.fromEntries(CATEGORIES.map((c) => [c.id, items.filter((i) => i.category === c.id).length]));
  return `<div class="shop-filters"><div class="chip-row" role="group" aria-label="Category">${[{ id: "all", name: "All", icon: "star" }, ...CATEGORIES]
    .filter((c) => c.id === "all" || counts[c.id])
    .map((c) => button(`${c.name}${c.id === "all" ? "" : `<small>${counts[c.id]}</small>`}`, "shop-category", `data-id="${c.id}" aria-pressed="${cat === c.id}"`, "chip " + (cat === c.id ? "active" : "")))
    .join("")}</div><div class="shop-sorts"><label class="sort-select">Sort<select id="shop-sort" aria-label="Sort items">${[
    ["featured", "Featured"],
    ["rarity", "Rarity"],
    ["price-asc", "Price: low to high"],
    ["price-desc", "Price: high to low"],
  ]
    .map(([id, label]) => `<option value="${id}" ${(ui.shopSort || "featured") === id ? "selected" : ""}>${label}</option>`)
    .join("")}</select></label>${button(icon(ui.shopHideOwned ? "check" : "star") + "Hide owned", "shop-owned", `aria-pressed="${!!ui.shopHideOwned}"`, "chip " + (ui.shopHideOwned ? "active" : ""))}</div></div>`;
}

function grid(ui, items, empty = "Nothing here right now. A new selection arrives soon.") {
  const list = sortItems(ui, items);
  return list.length ? `<div class="pg-grid shop-grid">${list.map((i) => itemCard(ui, i)).join("")}</div>` : `<section class="panel empty-state"><h2>All caught up.</h2><p>${empty}</p></section>`;
}

function hero(ui, item, r) {
  const owned = ui.progress.data.owned.includes(item.id);
  return `<article class="shop-hero ${rarityClass(item)}" style="--rarity:${RARITY[item.rarity]}"><div class="hero-copy"><span class="eyebrow">Featured this week</span><h2>${esc(item.name)}</h2><p>${esc(itemDescription(item))}</p><div class="hero-tags"><span class="rarity-chip" style="--rarity:${RARITY[item.rarity]}">${item.rarity}</span><span>${CATEGORIES.find((c) => c.id === item.category).name}</span><span>${icon("clock")} Leaves in ${hours(r.nextWeek - Date.now())}</span></div><div class="hero-actions">${owned ? `<span class="pg-owned">${icon("check")}In your caddie</span>` : coins(item.price)}${button(owned ? "Equip" : "View item", owned ? "equip" : "item-detail", `data-id="${item.id}"`, "button yellow")}</div></div><button class="hero-art" data-action="item-detail" data-id="${item.id}" aria-label="View ${esc(item.name)}"><img src="${ui.world.itemThumbnail(item)}" alt=""></button></article>`;
}

function rail(ui, title, caption, items, shelf) {
  if (!items.length) return "";
  return `<section class="shop-rail"><div class="rail-head"><div><h2>${title}</h2><span>${caption}</span></div>${button("See all " + icon("arrow"), "shop-shelf", `data-id="${shelf}"`, "text-button")}</div><div class="pg-grid rail-grid">${items.map((i) => itemCard(ui, i)).join("")}</div></section>`;
}

function lockerCard(ui, p) {
  const earned = ui.progress.data.lockers?.[p.id] || 0,
    afford = earned || ui.progress.data.coins >= p.price,
    best = lockerContents(p.id).flatMap((r) => r.items).sort((a, b) => RANK[b.rarity] - RANK[a.rarity])[0];
  return `<article data-card class="crate-card" style="--crate:${p.color};--trim:${p.pattern};--gem:${p.gem}">${["forge", "workshop"].includes(p.id) ? '<span class="pg-new">New</span>' : ""}<button data-card-primary class="crate-art" data-action="locker-detail" data-id="${p.id}" aria-label="View ${esc(p.name)} contents"><img src="${lockerArt(ui, p)}" alt=""></button><div class="crate-body"><span class="eyebrow">${earned ? `${earned} earned · ready` : p.crate ? "Themed locker" : p.categories ? "Focused locker" : "Locker exclusives"}</span><h3>${esc(p.name)}</h3><p>${esc(p.tagline)}</p>${oddsBar(p)}<div class="crate-best">${best ? `Top prize: <b style="color:${RARITY[best.rarity]}">${esc(best.name)}</b>` : ""}</div><div class="crate-foot">${earned ? `<strong class="earned-tag">${icon("gift")}Earned</strong>` : coins(p.price)}<div class="row">${button("Contents", "locker-detail", `data-id="${p.id}"`, "button secondary")}${button(earned ? "Open earned" : "Open", "open-locker", `data-id="${p.id}" ${afford ? "" : "disabled"}`, "button yellow")}</div></div></div></article>`;
}

export function lockerDetail(ui, id) {
  const p = LOCKERS.find((l) => l.id === id);
  if (!p) throw Error("This locker is unavailable.");
  const earned = ui.progress.data.lockers?.[p.id] || 0,
    owned = ui.progress.data.owned;
  return `<div class="crate-detail" style="--crate:${p.color}"><div class="crate-detail-head"><img src="${lockerArt(ui, p)}" alt="${esc(p.name)}"><div><span class="eyebrow">${p.crate ? "Themed locker" : p.categories ? "Focused locker" : "Locker"}</span><h2>${esc(p.name)}</h2><p>${esc(p.tagline)}</p>${oddsBar(p)}<p class="small-note">Rarity is drawn first, then every item in that rarity is equally likely. Different patterns are separate collectibles; only an identical item and pattern counts as a duplicate. Purchased duplicates refund 35%. Earned lockers cost no tokens. Lockers use earned tokens only.</p></div></div>${lockerContents(p.id)
    .reverse()
    .map(
      (r) =>
        `<section class="odds-group"><header><span class="rarity-chip" style="--rarity:${RARITY[r.rarity]}">${r.rarity}</span><strong>${r.weight}%</strong><small>${r.items.length} item${r.items.length === 1 ? "" : "s"} · ${(r.each < 0.1 ? r.each.toFixed(3) : r.each.toFixed(2)).replace(/0+$/, "").replace(/\.$/, "")}% each</small></header><div class="odds-items">${r.items
          .map(
            (i) =>
              `<button class="odds-item ${owned.includes(i.id) ? "is-owned" : ""}" data-action="item-detail" data-id="${i.id}" style="--rarity:${RARITY[i.rarity]}"><img src="${ui.world.itemThumbnail(i)}" alt=""><span>${esc(i.name)}</span>${owned.includes(i.id) ? `<em>${icon("check")}</em>` : ""}</button>`,
          )
          .join("")}</div></section>`,
    )
    .join(
      "",
    )}<div class="modal-actions crate-detail-actions">${earned ? `<strong class="earned-tag">${icon("gift")}${earned} earned</strong>` : coins(p.price)}${button(earned ? "Open earned locker" : `Open for ${p.price.toLocaleString()}`, "open-locker", `data-id="${p.id}" ${earned || ui.progress.data.coins >= p.price ? "" : "disabled"}`, "button yellow")}</div></div>`;
}

export function shopView(ui) {
  queueMicrotask(() => (ui.lastShopShelf = ui.shopShelf || "featured"));
  const r = shopRotation(),
    shelf = ui.shopShelf || "featured",
    d = ui.progress.data,
    weekly = [...r.featured, ...r.weekly],
    tabs = `<div class="shop-toolbar"><div class="shop-tabs" role="tablist" aria-label="Shop sections">${SHELVES.map(([id, name]) => button(name + (id === "lockers" && Object.values(d.lockers || {}).some(Boolean) ? '<i class="dot" aria-label="Earned lockers ready"></i>' : ""), "shop-shelf", `data-id="${id}" role="tab" aria-selected="${shelf === id}"`, "shop-tab " + (shelf === id ? "active" : ""))).join("")}</div>${button(icon("gift") + "Redeem code", "shop-code", "", "text-button")}</div>`;
  let content = "";
  if (shelf === "featured") {
    const heroItem = [...r.featured].sort((a, b) => RANK[b.rarity] - RANK[a.rarity])[0] || weekly[0],
      odd = LOCKERS.find((l) => l.id === (halloweenActive()?"halloween":"forge"));
    content = `<div class="shop-featured">${hero(ui, heroItem, r)}<article class="promo-card" style="--crate:${odd.color}"><img src="${lockerArt(ui, odd)}" alt=""><div><span class="eyebrow">New locker</span><h3>${odd.name}</h3><p>${odd.tagline}</p>${button("Browse lockers " + icon("arrow"), "shop-shelf", 'data-id="lockers"', "button yellow")}</div></article></div>${rail(ui, "Novelty Rack", "Always in stock · usable clubs", r.permanent, "novelty")}${rail(ui, "Today’s picks", "Refreshes in " + hours(r.nextDay - Date.now()), r.daily.slice(0, 5), "daily")}${rail(ui, "This week", "Resets in " + hours(r.nextWeek - Date.now()), weekly.filter((i) => i !== heroItem).slice(0, 5), "weekly")}`;
  } else if (shelf === "daily" || shelf === "weekly" || shelf === "novelty") {
    const items = shelf === "daily" ? r.daily : shelf === "weekly" ? weekly : r.permanent,
      caption =
        shelf === "daily"
          ? `Two picks per category · refreshes in <b>${hours(r.nextDay - Date.now())}</b>`
          : shelf === "weekly"
            ? `Weekly stock · resets in <b>${hours(r.nextWeek - Date.now())}</b>`
            : "Usable novelty clubs, always in stock. Find more in the Oddities Locker.";
    content = `<p class="shelf-caption">${caption}</p>${filters(ui, items)}${grid(ui, items)}`;
  } else if (shelf === "lockers")
    content = `<p class="shelf-caption">Finish a full round for a 10% chance of a free random locker. Every locker shows its full odds and contents. Country Club, bundle and Alpha items never appear in lockers.${halloweenActive()?' Halloween ends November 1. Keep everything you earn.':''}</p><div class="crate-grid">${LOCKERS.filter(p=>availableLockers().includes(p)||(d.lockers?.[p.id]||0)>0).map((p) => lockerCard(ui, p)).join("")}</div>`;
  else if (shelf === "bundles")
    content = `<p class="shelf-caption">Coordinated finishes, available this week. You only pay for the pieces you’re missing.</p><div class="bundle-grid">${shopBundles()
      .map((b) => {
        const missing = b.items.filter((i) => !d.owned.includes(i.id)).length,
          cost = Math.ceil((b.price * missing) / b.items.length);
        return `<article data-card class="panel bundle-card"><div class="bundle-images">${b.items
          .slice(0, 4)
          .map((i) => `<img src="${ui.world.itemThumbnail(i)}" alt="${esc(i.name)}">`)
          .join("")}</div><span class="eyebrow">${b.items.length} pieces · bundle exclusive</span><h2>${esc(b.name)}</h2><p>${missing ? `${missing} of ${b.items.length} pieces still to collect` : "Complete in your caddie"}</p><div class="row between">${cost ? coins(cost) : `<span class="pg-owned">${icon("check")}Owned</span>`}${button(cost ? "View collection" : "Owned", "bundle-detail", `data-card-primary data-id="${b.id}" ${cost ? "" : "disabled"}`, "button yellow")}</div></article>`;
      })
      .join("")}</div>`;
  else if (shelf === "rewards")
    content = achievementCards(ui);
  else if (shelf === "coins") content = coinShop(ui);
  else if (shelf === "socials") content = socialRewards(ui);
  return page(
    ui,
    "Item shop",
    `Daily picks, weekly collections, and locker exclusives.`,
    tabs + `<div class="shop-shelf ${ui.lastShopShelf !== shelf ? "shelf-enter" : ""}" data-shelf="${shelf}">${content}</div>`,
    `<div class="shop-wallet">${coins(d.coins)}<small>Your coins</small></div>`,
  ).replace('class="page"', 'class="page shop-page"');
}

function coinShop(ui) {
  return '<section class="money-shop"><article class="membership-offer panel"><span class="eyebrow">Country Club</span><h2>A season of golf.</h2><p>30 tiers of member-only equipment. One exclusive item at each tier, plus a separate rotating members-only collection. Earn XP through play to reach each tier.</p><div class="membership-prices">'+coins(50000)+'<span>or</span><strong>$5.99 USD</strong></div><div class="row">'+button('View 30 tiers','club-pass','','button yellow')+button('$5.99 · Coming Soon','purchase-coming-soon','data-product="Country Club membership"','button secondary')+'</div></article><div class="coin-pack-grid">'+[[1000,'0.99'],[6000,'4.99'],[14000,'9.99']].map(([n,p])=>'<article class="panel coin-pack"><div class="coin-stack" aria-hidden="true">'+icon('gift')+'</div><h2>'+n.toLocaleString()+' coins</h2><p>$'+p+' USD</p>'+button('Coming Soon','purchase-coming-soon','data-product="'+n+' coins"','button secondary')+'</article>').join('')+'</div><p class="small-note">Prices are previews. Real-money purchases are not available and these buttons cannot charge you. Coins earned by playing can be spent now.</p></section>';
}
