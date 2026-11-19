import { socialRewards } from "./social-view.js";
import { coinChestArt } from "./shop-coin-art.js";
import { shopRailPreview } from "./shop-backdrops.js";
import { LOCKERS, availableLockers, shopBundles, lockerContents, lockerOpenLimit, lockerQuote } from "./pro-shop.js";
import { halloweenActive } from './season.js';
import { CATEGORIES, RARITY, shopRotation } from "./catalog.js";
import { itemDescription, memberRotation, memberPrice, nextMemberRotation, MEMBERSHIP_COST } from "./equipment.js";
import { header, button, esc, coins } from "./views.js";
import { icon } from "./icons.js";
import { shopCover, shopLockerCover, shopBundleCover } from "./shop-art.js";

const RANK = { Common: 0, Uncommon: 1, Rare: 2, Epic: 3, Legendary: 4, "Black Market": 5 };
const hours = (ms) => {
  const h = Math.max(0, Math.floor(ms / 3600000)),
    m = Math.max(0, Math.floor((ms % 3600000) / 60000));
  return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${h}h ${m}m`;
};

export function lockerArt(ui, p) {
  return shopLockerCover(p);
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

function filters(ui) {
  const categories = [{ id: "all", name: "All gear" }, ...CATEGORIES];
  const sorts = [
    ["featured", "Shop order"],
    ["rarity", "Rarity"],
    ["price-asc", "Price: low to high"],
    ["price-desc", "Price: high to low"],
  ];
  return `<details class="store-filters" ${ui.shopFiltersOpen ? "open" : ""}>
    <summary>${icon("sliders")} Filters</summary>
    <div class="store-filter-fields">
      <p>Applies to Daily, Weekly, and Novelty Rack.</p>
      <label>Gear type <select id="shop-gear-type">${categories.map(({ id, name }) =>
        `<option value="${id}" ${(ui.shopCategory || "all") === id ? "selected" : ""}>${name}</option>`).join("")}</select></label>
      <label>Sort by <select id="shop-sort">${sorts.map(([id, label]) =>
        `<option value="${id}" ${(ui.shopSort || "featured") === id ? "selected" : ""}>${label}</option>`).join("")}</select></label>
      <label class="store-owned-filter"><input id="shop-hide-owned" type="checkbox" ${ui.shopHideOwned ? "checked" : ""}> Hide owned</label>
    </div>
  </details>`;
}

function filteredItems(ui, items) {
  const { owned } = ui.progress.data;
  const category = ui.shopCategory || "all";
  const visible = items.filter(item =>
    (category === "all" || item.category === category) &&
    (!ui.shopHideOwned || !owned.includes(item.id)));
  if (ui.shopSort === "price-asc") visible.sort((a, b) => a.price - b.price);
  if (ui.shopSort === "price-desc") visible.sort((a, b) => b.price - a.price);
  if (ui.shopSort === "rarity") visible.sort((a, b) => RANK[b.rarity] - RANK[a.rarity] || a.price - b.price);
  return visible;
}

function gearType(item) {
  const category = CATEGORIES.find(({ id }) => id === item.category);
  return `${item.rarity} · ${category.name}`;
}

function gearPrice(ui, item, price = item.price) {
  const { equipment, owned } = ui.progress.data;
  if (owned.includes(item.id)) {
    return `<span class="store-owned">${icon("check")}${equipment[item.category] === item.id ? "Equipped" : "Owned"}</span>`;
  }
  return coins(price);
}

function gearCard(ui, item, members = false) {
  return `<button type="button" class="store-tile store-gear" data-action="${members ? "member-offer" : "item-detail"}" data-id="${item.id}" style="--store-tint:${RARITY[item.rarity]}">
    <span class="store-tile-art"><img src="${shopCover(item)}" alt="" loading="lazy" decoding="async"></span>
    <span class="store-tile-copy">
      <span class="store-tile-type">${gearType(item)}</span>
      <strong class="store-tile-name">${esc(item.name)}</strong>
      <span class="store-tile-footer">${gearPrice(ui, item, members ? memberPrice(item) : item.price)}${icon("arrow")}</span>
    </span>
  </button>`;
}

function gearGrid(ui, items, featured = false) {
  const visible = featured ? items : filteredItems(ui, items);
  if (!visible.length) return '<p class="store-empty">No gear matches these filters.</p>';
  return `<div class="store-grid ${featured ? "store-grid-featured" : ""}">${visible.map(item => gearCard(ui, item)).join("")}</div>`;
}

function featuredGear(ui, items) {
  if (!items.length) return '<p class="store-empty">New featured gear arrives with the next rotation.</p>';
  const [spotlight, ...rest] = [...items].sort((a, b) => RANK[b.rarity] - RANK[a.rarity]);
  return `<article class="store-spotlight" style="--store-tint:${RARITY[spotlight.rarity]}">
    <div class="store-spotlight-copy">
      <span class="store-spotlight-type">${gearType(spotlight)}</span>
      <h3>${esc(spotlight.name)}</h3>
      <p>${esc(itemDescription(spotlight))}</p>
      <div class="store-spotlight-actions">
        ${gearPrice(ui, spotlight)}
        ${button("View item " + icon("arrow"), "item-detail", `data-id="${spotlight.id}"`, "button yellow")}
      </div>
    </div>
    <div class="store-spotlight-art">
      <img src="${shopCover(spotlight)}" alt="" fetchpriority="high" decoding="async">
    </div>
  </article>${rest.length ? gearGrid(ui, rest, true) : ""}`;
}

function lockerCard(ui, pack) {
  const earned = ui.progress.data.lockers?.[pack.id] || 0;
  const details = `data-id="${pack.id}"`;
  return `<article class="store-tile store-locker" style="--store-tint:${pack.color}">
    <button type="button" class="store-tile-art" data-action="locker-detail" ${details} aria-label="View ${esc(pack.name)} rewards">
      <img src="${lockerArt(ui, pack)}" alt="" loading="lazy" decoding="async">
      ${earned ? `<span class="store-earned">${earned} earned</span>` : ""}
    </button>
    <div class="store-tile-copy">
      <h3 class="store-tile-name">${esc(pack.name)}</h3>
      <p>${esc(pack.tagline)}</p>
      ${oddsBar(pack)}
      <div class="store-locker-total">${openingPrice(ui, pack)}</div>
      <div class="store-locker-actions">
        ${button("View rewards", "locker-detail", details, "button secondary")}
        ${openingButton(ui, pack)}
      </div>
    </div>
  </article>`;
}

export function selectedLockerCount(ui) {
  return Math.min(lockerOpenLimit(ui.progress.data.xp), Math.max(1, Number(ui.lockerCount) || 1));
}
export function lockerQuantity(ui, id = '') {
  const max = lockerOpenLimit(ui.progress.data.xp), count = selectedLockerCount(ui);
  const next = [[5, 2], [10, 3], [15, 5], [20, 10]].find(([, n]) => n > max);
  return `<section class="locker-quantity"><div><strong>Open at once</strong><span>${next ? `Level ${next[0]} unlocks ${next[1]} at once` : 'Maximum unlocked'}</span></div><div role="group" aria-label="Number of lockers to open">${Array.from({length:max}, (_,i) => button(String(i+1), 'locker-quantity', `data-count="${i+1}" data-id="${id}" aria-pressed="${count===i+1}"`, 'chip '+(count===i+1?'active':''))).join('')}</div></section>`;
}
function openingPrice(ui, pack) {
  const q = lockerQuote(ui.progress.data, pack.id, selectedLockerCount(ui));
  return `${q.earned ? `<span class="earned-tag">${q.earned} earned${q.paid ? ` + ${q.paid} paid` : ''}</span>` : ''}${q.cost ? coins(q.cost) : '<strong>Free</strong>'}`;
}
function openingButton(ui, pack) {
  const q = lockerQuote(ui.progress.data, pack.id, selectedLockerCount(ui));
  return button(`Open ${q.count === 1 ? 'locker' : q.count + ' lockers'}`, 'open-locker', `data-id="${pack.id}" data-count="${q.count}" ${q.affordable ? '' : 'disabled'}`, 'button yellow');
}

export function lockerDetail(ui, id) {
  const p = LOCKERS.find((l) => l.id === id);
  if (!p) throw Error("This locker is unavailable.");
  const owned = ui.progress.data.owned, groups = lockerContents(p.id).reverse();
  const rewards = groups.flatMap(r => r.items), collected = rewards.filter(i => owned.includes(i.id)).length;
  return `<div class="crate-detail" style="--crate:${p.color}"><div class="locker-dialog-title"><span class="eyebrow">LOCKER / REWARD CATALOG</span><span>${collected} / ${rewards.length} collected</span></div><div class="crate-content" tabindex="0" role="region" aria-label="Scrollable locker rewards"><div class="crate-detail-head"><img src="${lockerArt(ui, p)}" alt="${esc(p.name)}"><div><span class="eyebrow">${p.crate ? "Themed locker" : p.categories ? "Focused locker" : "Locker exclusives"}</span><h2>${esc(p.name)}</h2><p>${esc(p.tagline)}</p>${oddsBar(p)}<p class="small-note">One reward per opening. Every possible reward and its odds are listed below.</p></div></div><div class="locker-catalog-heading"><h3>Possible rewards</h3><span class="locker-result-count" role="status">${rewards.length} rewards</span></div><div class="locker-catalog-tools"><label>${icon('search')}<input id="locker-search" type="search" placeholder="Search rewards" aria-label="Search locker rewards" autocomplete="off"></label><select id="locker-rarity" aria-label="Filter locker rarity"><option value="all">All rarities</option>${groups.map(r=>`<option value="${esc(r.rarity)}">${esc(r.rarity)} · ${r.weight}%</option>`).join('')}</select></div><div class="locker-reward-groups">${groups
    .map(
      (r) =>
        `<section class="odds-group" data-rarity="${esc(r.rarity)}"><header><span class="rarity-chip" style="--rarity:${RARITY[r.rarity]}">${r.rarity}</span><strong>${r.weight}%</strong><small>${r.items.length} item${r.items.length === 1 ? "" : "s"} · ${(r.each < 0.1 ? r.each.toFixed(3) : r.each.toFixed(2)).replace(/0+$/, "").replace(/\.$/, "")}% each</small></header><div class="odds-items">${r.items
          .map(
            (i) =>
              `<button class="odds-item ${owned.includes(i.id) ? "is-owned" : ""}" data-action="item-detail" data-id="${i.id}" style="--rarity:${RARITY[i.rarity]}"><img src="${ui.world.itemThumbnail(i)}" alt="" loading="lazy"><span>${esc(i.name)}</span>${owned.includes(i.id) ? `<em aria-label="Collected">${icon("check")}</em>` : ""}</button>`,
          )
          .join("")}</div></section>`,
    )
    .join(
      "",
    )}</div><div class="locker-no-results empty-state" hidden><h3>No rewards match.</h3><p>Try a different name or rarity.</p><button type="button" class="button secondary locker-clear">Clear filters</button></div><details class="locker-rules"><summary>How the odds work</summary><p>Rarity is drawn first, then every item in that rarity is equally likely. Duplicates stack in your Caddie, including matching numbered patterns. Keep them, trade them, or combine ten of one rarity in a trade-up. Earned lockers open free. Lockers use earned coins only.</p></details></div><footer class="locker-opening-bar">${lockerQuantity(ui, p.id)}<div class="modal-actions crate-detail-actions"><div class="locker-total"><small>Opening total</small><div>${openingPrice(ui, p)}</div></div>${openingButton(ui, p)}</div></footer></div>`;
}

function bundleCard(ui, bundle) {
  const missing = bundle.items.filter(item => !ui.progress.data.owned.includes(item.id)).length;
  const cost = Math.ceil((bundle.price * missing) / bundle.items.length);
  return `<button type="button" class="store-tile" data-action="bundle-detail" data-id="${bundle.id}" style="--store-tint:${RARITY[bundle.items[0].rarity]}">
    <span class="store-tile-art store-bundle-art"><img src="${shopBundleCover(bundle)}" alt="" loading="lazy" decoding="async"></span>
    <span class="store-tile-copy">
      <span class="store-tile-type">${bundle.items.length} pieces · ${missing ? missing + " to collect" : "Complete"}</span>
      <strong class="store-tile-name">${esc(bundle.name)}</strong>
      <span class="store-tile-footer">${cost ? coins(cost) : `<span class="store-owned">${icon("check")}Owned</span>`}${icon("arrow")}</span>
    </span>
  </button>`;
}

function coinShop() {
  const packs = [[1000, "0.99"], [6000, "4.99"], [14000, "9.99"]];
  return `<div class="store-coin-packs">${packs.map(([amount, price], index) => `<article>
    <div class="store-coin-art">${coinChestArt(index + 1)}</div>
    <div class="store-coin-copy"><h3>${coins(amount)} coins</h3>
      <p>$${price} USD</p>
      ${button("Coming soon", "purchase-coming-soon", `data-product="${amount} coins" aria-label="${amount.toLocaleString()} coins, coming soon"`, "button secondary")}
    </div>
  </article>`).join("")}</div>
  <p class="store-note">Real-money purchases are coming soon. You can spend coins earned by playing today.</p>`;
}

export function shopView(ui, now = new Date()) {
  const rotation = shopRotation(now);
  const { coins: balance, lockers } = ui.progress.data;
  const available = new Set(availableLockers(now));
  const reset = time => `<span class="store-reset">${icon("clock")} Resets in ${hours(time - now)}</span>`;
  const lockerStock = LOCKERS.filter(pack => available.has(pack) || lockers?.[pack.id]);
  const shelves = [
    ["featured", "Featured", featuredGear(ui, rotation.featured), reset(rotation.nextWeek)],
    ["daily", "Daily", gearGrid(ui, rotation.daily), reset(rotation.nextDay)],
    ["weekly", "Weekly", gearGrid(ui, rotation.weekly), reset(rotation.nextWeek)],
    ["novelty", "Novelty Rack", gearGrid(ui, rotation.permanent), "Always in stock"],
    ["bundles", "Bundles", `<p class="store-note">You only pay for the pieces you’re missing.</p>
      <div class="store-grid store-grid-bundles">${shopBundles(now).map(bundle => bundleCard(ui, bundle)).join("")}</div>`, reset(rotation.nextWeek)],
    ["country-club", "Country Club", `<div class="store-club-intro">
      <p class="store-note">These six offers are for members. Join at level 10 for ${MEMBERSHIP_COST.toLocaleString()} coins.</p>
      ${button("View membership " + icon("arrow"), "club-pass", "", "button secondary")}</div>
      <div class="store-grid store-grid-members">${memberRotation(now).map(item => gearCard(ui, item, true)).join("")}</div>`, reset(nextMemberRotation(now))],
    ["lockers", "Lockers", `<p class="store-note">Finish a full round for a 10% chance to earn a locker. Check any locker for its rewards and odds.${halloweenActive(now) ? " The Halloween event ends November 1." : ""}</p>
      ${lockerQuantity(ui)}<div class="store-grid store-grid-lockers">${lockerStock.map(pack => lockerCard(ui, pack)).join("")}</div>`],
    ["coins", "Coins", coinShop()],
    ["socials", "Community rewards", socialRewards(ui, { showIntro: false, showChest: true })],
  ];
  const earned = Object.values(lockers || {}).some(Boolean);

  return `<div class="panel-backdrop"></div>${header(ui)}
    <main class="page shop-page" aria-labelledby="shop-title">
      <div class="store">
        <header class="store-header">
          <div class="store-title"><h1 id="shop-title">Item Shop</h1><span class="store-wallet" aria-label="${balance.toLocaleString()} coins">${coins(balance)}</span></div>
          <div class="store-tools">
            ${filters(ui)}
            ${button("Redeem code", "shop-code", "", "text-button")}
            ${button("Auction house " + icon("arrow"), "auctions", "", "text-button")}
          </div>
        </header>
        <div class="store-layout">
          <nav class="store-index" aria-label="Shop sections">
            <span class="store-index-label">Browse</span>
            <div class="store-index-links">
              ${shelves.map(([id, label]) => button(
                `<span class="store-index-text">${label}${id === "lockers" && earned ? '<span class="store-index-dot" aria-label="Earned lockers ready"></span>' : ""}</span>`,
                "shop-jump", `type="button" data-shop-link data-id="${id}" style="${shopRailPreview(id)}" aria-controls="shop-section-${id}"${id === "featured" ? ' aria-current="location"' : ""}`,
                "store-index-link")).join("")}
            </div>
          </nav>
          <div class="store-catalog">
            ${shelves.map(([id, label, content, note]) => `<section id="shop-section-${id}" data-shop-section="${id}" class="store-section" aria-labelledby="shop-heading-${id}">
              <header class="store-section-heading">
                <h2 id="shop-heading-${id}" tabindex="-1">${label}</h2>
                ${note ? `<div class="store-section-meta">${note}</div>` : ""}
              </header>
              ${content}
            </section>`).join("")}
            <footer class="store-footer">${button("Back to top", "shop-jump", 'type="button" data-id="featured"', "text-button")}</footer>
          </div>
        </div>
      </div>
    </main>`;
}
