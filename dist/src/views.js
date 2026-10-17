import { honorsCabinet, profileBests } from './honors-view.js';
import { usernameChangeCost } from './usernames.js';
import { APP_VERSION } from "./version.js";
import { caddieItems, CADDIE_RARITIES, CADDIE_SORTS } from './caddie-collection.js';
import { finishItem } from './finishes.js';
import { nameplate } from "./nameplates.js";
import { GOLF_COURSES, courseRecordKey } from "./golf-courses.js";
import { icon, brandMark } from "./icons.js";
import { COURSES, getHole, relative } from "./courses.js";
import { ITEMS, ITEM_BY_ID, CATEGORIES, RARITY, shopRotation, shopAvailable, itemSource } from "./catalog.js";
import { ACHIEVEMENTS, challengesFor } from "./save.js";
import { halloweenActive } from './season.js';
export const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
export const coins = (n) => `<span class="money"><i class="coin-icon" aria-hidden="true">P</i>${n.toLocaleString()}</span>`;
export const button = (text, action, extra = "", cls = "button") =>
  `<button class="${cls}" data-action="${action}" ${action === "favorites" ? 'aria-label="Show favorite cosmetics"' : ""} ${extra}>${text}</button>`;
export const minutes = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
export function header(ui) {
  const d = ui.progress.data,
    l = ui.progress.level;
  return `<header class="topbar"><button class="logo" data-action="home" aria-label="PolyGolf clubhouse">${brandMark()}<span class="wordmark">Poly<span>Golf</span> <small>v${APP_VERSION}</small></span></button><nav class="nav" aria-label="Main menu">${[
    ["home", "Home"],
    ["courses", "Courses"],
    ["garage", "Caddie"],
    ["shop", "Shop"],
    ["leaderboards", "Rankings"],
    ["friends", "Friends"],
    ["trades", "Trading"],
    ["club-pass", "Country Club"],
  ]
    .map(
      ([id, label]) =>
        `<button class="${ui.screen === id ? "active" : ""}" data-action="${id}" ${ui.screen === id ? 'aria-current="page"' : ""}>${label}</button>`,
    )
    .join(
      "",
    )}</nav><div class="player-bar"><span class="wallet" aria-label="${d.coins} coins">${coins(d.coins)}</span><button class="player-button" data-action="profile" aria-label="${esc(d.name)} profile"><span class="avatar">${ui.cloud?.profile?.avatar ? `<img src="${esc(ui.cloud.profile.avatar)}" alt="Your profile picture">` : esc(d.name.charAt(0).toUpperCase())}</span><div><strong>${esc(d.name)}</strong><small>Level ${l.level} · ${l.xp} / ${l.required} XP</small><span class="tiny-xp"><i style="width:${l.progress * 100}%"></i></span></div></button><button class="header-settings" data-action="settings" aria-label="Settings">${icon("sliders")}</button></div></header>`;
}
export function homeView(ui) {
  const c = COURSES[ui.selectedCourse];
  return `<div class="home-shade"></div>${header(ui)}<section class="home-main"><div class="eyebrow">THE GREAT LITTLE GOLF ESCAPE</div><h1>Good day<br>for a <span>round.</span></h1><p class="intro">A little fresh air. A few friendly bounces.<br>Your next favorite round starts here.</p><button class="play-button" data-action="start" data-course="${ui.selectedCourse}">${icon("play")}Let's play ${icon("arrow")}</button><div class="play-meta">${c.name} <b></b> 9 holes <b></b> ${c.difficulty}</div><div class="home-actions">${button(icon("ball") + "Your caddie", "garage", "", "soft-button")}${button(icon("gift") + "Daily reward", "daily", "", "soft-button")}</div><div class="equipped-label">${icon("check")}${ITEM_BY_ID[ui.progress.data.equipment.ball].name} equipped</div></section><div class="world-label"><span class="location-line"></span><div class="overline">${c.tag.toUpperCase()}</div><h3>${c.name}</h3><p>${c.subtitle}</p></div><section class="bottom-home"><div class="rail-heading"><strong>Find your fairway</strong>${button("Explore all courses " + icon("arrow"), "courses", "", "text-button")}</div><div class="course-rail">${COURSES.map(
    (c, i) => {
      const unlocked = ui.progress.level.level >= c.level;
      return `<button class="mini-course ${i === ui.selectedCourse ? "selected" : ""}" data-action="select-course" data-course="${i}"><img src="${ui.world.thumbnail(i)}" alt="${c.name} golf course"><span class="lock">${icon(unlocked ? "flag" : "lock")} ${unlocked ? "Unlocked" : "Level " + c.level}</span><span class="course-info"><strong>${c.name}</strong><small>09 HOLES · ${c.difficulty.toUpperCase()}</small></span></button>`;
    },
  ).join(
    "",
  )}</div><div class="footer-line"><span>${icon("sun")} Made for a little downtime.</span><span>SOLO PLAY · SAVED ON THIS DEVICE</span>${button(icon("help") + "How to play", "help", "", "text-button")}</div></section>`;
}
export function page(ui, title, subtitle, content, action = "") {
  return `<div class="panel-backdrop"></div>${header(ui)}<main class="page"><div class="page-heading"><div><h1>${title}</h1><p>${subtitle}</p></div>${action}</div>${content}</main>`;
}
export function coursesView(ui) {
  return page(
    ui,
    "Find your fairway.",
    "Five little worlds. Forty-five reasons for one more round.",
    `<div class="course-grid">${COURSES.map((c, i) => {
      const unlocked = ui.progress.level.level >= c.level,
        best = ui.progress.data.bests[i];
      return `<article class="course-card panel"><div class="course-image"><img src="${ui.world.thumbnail(i)}" alt="${c.name} preview"><span class="badge ${c.difficulty.toLowerCase()}">${c.difficulty}</span>${!unlocked ? `<span class="course-level">${icon("lock")} Level ${c.level}</span>` : ""}</div><div class="course-body"><div class="course-number">COURSE 0${i + 1} · 9 HOLES</div><h2>${c.name}</h2><p>${c.subtitle}</p><div class="course-facts"><span>${icon("flag")} Par ${Array.from({ length: 9 }, (_, j) => getHole(i, j).par).reduce((a, b) => a + b, 0)}</span><span>${icon("trophy")} Best ${best ? relative(best.score) : "-"}</span></div>${button((unlocked ? "Play course" : "Explore in practice") + icon("arrow"), unlocked ? "start" : "practice", `data-course="${i}"`, "button " + (unlocked ? "yellow" : "secondary") + " wide")}</div></article>`;
    }).join(
      "",
    )}</div><p class="small-note">Ranked rounds unlock as you level up. Practice lets you explore any course without rewards or records.</p>`,
  );
}
const RARITY_GLYPH = { Common: "●", Uncommon: "◆", Rare: "◆◆", Epic: "✦", Legendary: "✦✦", "Black Market": "✦✦✦" };
export const rarityClass = (item) => "r-" + item.rarity.toLowerCase().replaceAll(" ", "-");
export function itemCard(ui, item, { garage = false, featured = false } = {}) {
  const d = ui.progress.data,
    owned = d.owned.includes(item.id),
    equipped = d.equipment[item.category] === item.id,
    buyable = !owned && !item.exclusive && shopAvailable(item.id),
    category = CATEGORIES.find((c) => c.id === item.category).name,
    fav = d.favorites.includes(item.id),
    isNew = !!item.shape && item.id !== "club-candy";
  const foot =
    garage && owned
      ? button(icon(fav ? "heart" : "star"), "favorite", `data-id="${item.id}" aria-label="${fav ? "Remove favorite" : "Favorite"} ${esc(item.name)}"`, "favorite-button pg-fav " + (fav ? "favorited" : ""))
      : owned
        ? `<span class="pg-owned">${icon("check")}Owned</span>`
        : item.exclusive || !item.price
          ? `<span class="pg-source">${itemSource(item)}</span>`
          : coins(item.price);
  const cta = button(
    item.finish && owned ? 'Patterns · '+(d.patterns?.[item.id]?.length || 1) : equipped ? "Equipped" : owned ? "Equip" : buyable ? "Buy" : "View",
    item.finish ? "item-detail" : owned ? "equip" : "item-detail",
    `data-id="${item.id}" ${equipped && !item.finish ? "disabled" : ""} aria-label="${item.finish?'View patterns for':equipped ? "Equipped" : owned ? "Equip" : buyable ? "Buy" : "View"} ${esc(item.name)}"`,
    "item-button pg-cta " + (buyable ? "is-buy" : ""),
  );
  return `<article data-card class="pg-card ${rarityClass(item)} ${featured ? "is-featured" : ""} ${owned ? "is-owned" : ""} ${equipped ? "is-equipped" : ""} ${ui.previewId === item.id ? "previewed" : ""}" style="--rarity:${RARITY[item.rarity]}"><button data-card-primary class="pg-art" data-action="${garage && owned ? "preview" : "item-detail"}" data-id="${item.id}" aria-label="${garage && owned ? "Preview" : "View"} ${esc(item.name)}"><img loading="lazy" decoding="async" width="864" height="600" src="${ui.world.itemThumbnail(item)}" alt="">${isNew ? '<span class="pg-new">New</span>' : ""}${equipped ? `<span class="pg-flag">${icon("check")} Equipped</span>` : ""}</button><div class="pg-body"><div class="pg-meta"><span class="pg-rarity"><i aria-hidden="true">${RARITY_GLYPH[item.rarity] || "●"}</i>${item.rarity}</span><span>${category}</span></div><h3>${esc(item.name)}</h3><div class="pg-foot">${foot}${cta}</div></div></article>`;
}
export function shopView(ui) {
  const rotation = shopRotation(),
    cat = ui.shopCategory;
  const tabs = `<div class="category-tabs" role="tablist" aria-label="Shop category">${[{ id: "all", name: "For you", icon: "star" }, ...CATEGORIES].map((c) => button(icon(c.icon) + c.name, "shop-category", `data-id="${c.id}" role="tab" aria-selected="${cat === c.id}"`, "category-tab " + (cat === c.id ? "active" : ""))).join("")}</div>`;
  const cards = (items) =>
    items
      .filter((i) => cat === "all" || i.category === cat)
      .map((i) => itemCard(ui, i))
      .join("");
  let content;
  if (cat !== "all") {
    const available = [
      ...new Map(
        [...rotation.featured, ...rotation.daily, ...rotation.permanent]
          .filter((i) => i.category === cat)
          .map((i) => [i.id, i]),
      ).values(),
    ];
    content = `<section class="shop-section"><div class="section-heading"><h2>${CATEGORIES.find((c) => c.id === cat).name}</h2><span>${available.length} in today's shop</span></div><div class="items-grid">${cards(available) || '<div class="panel empty-state">Nothing in this category today. A new collection arrives tomorrow.</div>'}</div></section>`;
  } else
    content = `<section class="shop-section"><div class="section-heading"><h2>A little something special</h2><span>FEATURED COLLECTION</span></div><div class="items-grid featured-grid">${rotation.featured.map((i) => itemCard(ui, i, { featured: true })).join("")}</div></section><section class="shop-section"><div class="section-heading"><h2>Today's little finds</h2><span>DAILY ROTATION</span></div><div class="items-grid six">${cards(rotation.daily)}</div></section><section class="shop-section"><div class="section-heading"><h2>The everyday collection</h2><span>ALWAYS HERE</span></div><div class="items-grid six">${cards(rotation.permanent)}</div></section>`;
  return page(
    ui,
    "Make it your kind of round.",
    "Cosmetic in full golf. Useful equipment effects in mini-golf.",
    tabs +
      `<section class="panel gift-code-panel"><div><h2>Have a gift code?</h2><p>Redeem once per account. Codes are case-sensitive.</p></div><label>Gift code<input id="gift-code" autocomplete="off" maxlength="80" placeholder="Enter your code"></label>${button(ui.cloud?.session ? "Redeem code" : "Sign in to redeem", "redeem-code", "", "button yellow")}</section>` +
      content,
    `<span class="rotation-pill">${icon("clock")} Refreshes in <b id="rotation-countdown"></b></span>`,
  );
}
function collectionItems(ui) {
  return caddieItems(ui.progress.data, {category:ui.garageCategory, query:ui.caddieQuery, rarity:ui.caddieRarity, sort:ui.caddieSort, showAll:ui.showAllItems, favorites:ui.favoritesOnly});
}
function caddieCards(ui, items) {
  return items.map(item => itemCard(ui, item, {garage:true})).join('') || `<div class="empty-state"><h3>No items match.</h3><p>Try another name, rarity or category.</p>${button('Clear filters','caddie-clear','','button secondary')}</div>`;
}
export function updateCaddieGrid(ui) {
  const grid = ui.root.querySelector('.garage-items');
  if (!grid) return;
  const items = collectionItems(ui);
  grid.innerHTML = caddieCards(ui, items); grid.scrollTop = 0;
  ui.root.querySelector('#caddie-result-count').textContent = items.length + (items.length === 1 ? ' item' : ' items');
}
function caddieTools(ui, count) {
  return `<div class="caddie-toolbar"><label class="caddie-search">${icon('search')}<input id="caddie-search" type="search" maxlength="80" placeholder="Search collection" aria-label="Search collection" value="${esc(ui.caddieQuery || '')}" autocomplete="off"></label>${button(icon('sliders') + 'Filter & sort','caddie-filters',`aria-expanded="${!!ui.caddieFiltersOpen}" aria-controls="caddie-filters"`,'button secondary caddie-filter-toggle')}<small id="caddie-result-count" role="status">${count} ${count === 1 ? 'item' : 'items'}</small></div>${ui.caddieFiltersOpen ? `<div class="caddie-filters" id="caddie-filters"><div role="group" aria-label="Filter by rarity"><span>Rarity</span>${['all',...CADDIE_RARITIES].map(r=>button(r==='all'?'All rarities':r,'caddie-rarity',`data-id="${r}" aria-pressed="${(ui.caddieRarity || 'all')===r}"`,'caddie-filter-chip')).join('')}</div><div role="group" aria-label="Sort collection"><span>Sort</span>${CADDIE_SORTS.map(([id,name])=>button(name,'caddie-sort',`data-id="${id}" aria-pressed="${(ui.caddieSort || 'collection')===id}"`,'caddie-filter-chip')).join('')}</div></div>` : ''}`;
}
function caddieSetup(ui) {
  const d=ui.progress.data, cat=ui.garageCategory;
  return `<div class="garage-equipped"><div class="caddie-setup-copy"><span class="caddie-setup-label">${icon("check")} ${ui.previewId ? "Preview" : "Your setup"}</span><h2>${esc(ITEM_BY_ID[ui.previewId || d.equipment[cat]]?.name || 'Your equipment')}</h2>${cat === 'nameplate' ? nameplate(d.name, ui.previewId || d.equipment.nameplate) : `<p>${esc(ITEM_BY_ID[d.equipment.nameplate].name)} · ${esc(ITEM_BY_ID[d.equipment.club].name)}</p>`}</div><div class="caddie-setup-actions">${button(icon("shuffle") + "Surprise me", "randomize", "", "button secondary")}${button("Equip preview", "equip-preview", ui.previewId ? "" : "disabled", "button")}</div></div>`;
}
export function updateCaddieCategory(ui) {
  const setup = ui.root.querySelector('.garage-equipped');
  if (!setup) {ui.render(); return;}
  setup.outerHTML = caddieSetup(ui);
  for (const tab of ui.root.querySelectorAll('[data-action="garage-category"]')) {
    const active = tab.dataset.id === ui.garageCategory;
    tab.classList.toggle('active', active); tab.setAttribute('aria-selected', String(active));
  }
  const reset=ui.root.querySelector('[data-action="unequip"]');
  if (reset) reset.textContent='Reset '+CATEGORIES.find(c=>c.id===ui.garageCategory).name.toLowerCase();
  updateCaddieGrid(ui);
}
export function garageView(ui) {
  const d = ui.progress.data,
    cat = ui.garageCategory,
    items = collectionItems(ui);
  return `${header(ui)}<main class="garage-page"><section class="garage-preview"><div class="caddie-stage" role="img" aria-label="Floating island with your equipped ball and club"></div></section><section class="garage-inventory panel">${caddieSetup(ui)}<div class="garage-collection-header"><h2>Your collection <span class="muted">${d.owned.length} / ${ITEMS.length}</span></h2><div class="collection-tools">${button(ui.showAllItems ? "Owned only" : "All finishes", "collection-filter", "", "text-button collection-toggle")}${button(icon("heart"), "favorites", "", "favorite-button " + (ui.favoritesOnly ? "favorited" : ""))}</div></div><div class="category-tabs" role="tablist" aria-label="Caddie category">${CATEGORIES.map((c) => button(icon(c.icon) + c.name, "garage-category", `data-id="${c.id}" role="tab" aria-selected="${cat === c.id}"`, "category-tab " + (cat === c.id ? "active" : ""))).join("")}</div>${caddieTools(ui, items.length)}<div class="garage-items pg-grid">${caddieCards(ui, items)}</div><div class="garage-bottom">${button("Reset " + CATEGORIES.find((c) => c.id === cat).name.toLowerCase(), "unequip", "", "text-button")}${button("Find something new " + icon("arrow"), "shop", "", "text-button")}</div></section></main>`;
}
export function profileView(ui) {
  const d = ui.progress.data,
    l = ui.progress.level;
  const stats = [
    ["Rounds played", d.stats.games],
    ["Courses finished", d.stats.courses],
    ["Holes completed", d.stats.holes],
    ["Total strokes", d.stats.strokes],
    ["Holes in one", d.stats.aces],
    ["Birdies or better", d.stats.birdies],
    ["Cosmetics owned", d.owned.length],
    ["Time on the green", `${Math.floor(d.stats.playTime / 60)} min`],
  ];
  return page(
    ui,
    "Your golfer",
    "Statistics, rewards and your account.",
    `<div class="profile-layout"><section class="panel profile-card"><span class="profile-avatar">${ui.cloud?.profile?.avatar ? `<img src="${esc(ui.cloud.profile.avatar)}" alt="Your profile picture">` : esc(d.name.charAt(0).toUpperCase())}</span>${nameplate(d.name,d.equipment.nameplate)}<p class="golfer-bio">${esc(ui.cloud?.profile?.bio || "")}</p>${ui.cloud?.session ? button("Edit photo & bio", "edit-profile", "", "text-button") : ""}<span class="badge">LEVEL ${l.level}</span><div class="xp-track"><i style="width:${l.progress * 100}%"></i></div><div class="row between muted small"><span>${l.xp} XP</span><span>${l.required} XP</span></div><div class="divider"></div>${button(ui.cloud?.session ? "Manage account" : "Sign in / Create account", "account", "", "button secondary wide")}${usernameFields(ui)}<div class="divider"></div><div class="row between"><span>Coin balance</span>${coins(d.coins)}</div><div class="profile-stats">${stats.map(([a, b]) => `<div><strong>${b}</strong><span>${a}</span></div>`).join("")}</div></section><div>${honorsCabinet(ui.cloud?.profile,{own:true})}${ui.cloud?.session?profileBests(ui.cloud.profile):''}<section class="panel challenge-panel"><div class="section-heading"><h2>A little goal for today</h2><span>RESETS AT 00:00 UTC</span></div>${challengesFor()
      .map((c) => {
        const n = Math.min(c.target, c.value(d.daily)),
          claimed = d.daily.claimed.includes(c.id);
        return `<div class="challenge"><span class="challenge-icon">${icon("flag")}</span><div class="challenge-details"><h3>${c.name}</h3><p>${c.desc}</p><div class="challenge-track"><i style="width:${(n / c.target) * 100}%"></i></div><small>${n} / ${c.target} · ${c.coins} coins + ${c.xp} XP</small></div>${button(claimed ? "Claimed" : n >= c.target ? "Claim" : "In progress", "claim-challenge", `data-id="${c.id}" ${claimed || n < c.target ? "disabled" : ""}`, "button secondary")}</div>`;
      })
      .join(
        "",
      )}</section>${ui.cloud?.session?'':`<section class="panel best-panel"><div class="section-heading"><h2>Personal bests</h2>${icon("trophy")}</div>${[...GOLF_COURSES.map((c,i)=>({c,key:courseRecordKey("golf",i)})),...COURSES.map((c,i)=>({c,key:courseRecordKey("mini",i)}))].map(({c,key}) => `<div class="best-row"><span>${esc(c.name)}</span><b>${d.bests[key] ? relative(d.bests[key].score) : "-"}</b><span class="muted">${d.bests[key] ? minutes(d.bests[key].time) : "Not played"}</span></div>`).join("")}</section>`}</div></div><div class="section-heading achievement-heading"><h2>Little milestones</h2><span>${d.achievements.length} / ${ACHIEVEMENTS.length} UNLOCKED</span></div><section class="achievement-grid">${ACHIEVEMENTS.filter(a=>(!a.secret||d.achievements.includes(a.id))&&(a.id!=='pumpkin'||halloweenActive()||d.achievements.includes(a.id))).map(
      (a) => {
        const done = d.achievements.includes(a.id),
          n = Math.min(a.target, a.value(d));
        return `<article class="achievement panel ${done ? "achieved" : ""}"><span class="achievement-icon">${icon(a.icon)}</span><h3>${a.name}</h3><p>${a.desc}</p><div class="challenge-track"><i style="width:${(n / a.target) * 100}%"></i></div><div class="row between small"><span>${done ? "✓ Unlocked" : `${n} / ${a.target}`}</span><span>+${a.coins} coins</span></div></article>`;
      },
    ).join("")}</section>`,
    button(icon("gift") + "Daily reward", "daily", "", "button yellow"),
  );
}
export function leaderboardView(ui) {
  const labels = {
    score: "Lowest score",
    time: "Fastest round",
    aces: "Holes in one",
    level: "Player level",
  };
  return page(
    ui,
    "A friendly little rivalry.",
    "Example players share the board with your records from this device.",
    `<div class="panel ranking-panel"><div class="ranking-filters"><div class="category-tabs">${Object.entries(
      labels,
    )
      .map(([id, label]) =>
        button(
          label,
          "ranking-metric",
          `data-id="${id}"`,
          "category-tab " + (ui.rankingMetric === id ? "active" : ""),
        ),
      )
      .join(
        "",
      )}</div><select id="ranking-course" aria-label="Leaderboard course">${COURSES.map((c, i) => `<option value="${i}" ${i === ui.rankingCourse ? "selected" : ""}>${c.name}</option>`).join("")}</select></div><div class="table-scroll"><table class="ranking-table"><thead><tr><th>RANK</th><th>PLAYER</th><th>LEVEL</th><th>${labels[ui.rankingMetric].toUpperCase()}</th></tr></thead><tbody id="rankings-body"><tr><td colspan="4">Getting the scorecard…</td></tr></tbody></table></div><p class="small-note">DEMO LEADERBOARD · Example results are illustrative. Online competition is not connected.</p></div>`,
  );
}
export function hudView(ui) {
  const g = ui.game,
    d = ui.progress.data,
    total = g.round.strokes.reduce((a, b, i) => a + b - getHole(g.round.courseIndex, i).par, 0);
  return `<section class="hud"><div class="hud-top"><div class="hud-card hud-hole"><div><span class="hud-small">HOLE</span><div class="number">${g.index + 1}<span class="hole-count"> / 9</span></div></div><div><span class="hud-small">PAR</span><div class="number">${g.hole.par}</div></div></div><div class="hud-title"><h3>${g.hole.course.name}</h3><p>${g.hole.name}${g.round.practice ? " · PRACTICE" : ""}</p></div><div class="hud-card hud-score"><span class="hud-small">STROKES</span><strong>${g.strokes}</strong></div></div><div class="ball-nameplate" id="ball-nameplate" style="--plate:${ITEM_BY_ID[d.equipment.nameplate].color}">${esc(d.name)}</div><div class="hud-total">THIS ROUND <strong>${relative(total)}</strong><span id="surface-label">GRASS</span></div><div class="power-panel"><div class="power-card"><div class="power-header"><span id="shot-status">MAKE IT A GOOD ONE</span><span id="power-text">35%</span></div><div class="power-track"><div class="power-fill" id="power-fill"></div></div><div class="power-hint">Aim with your mouse · Hold to charge · Release to putt</div></div><p class="controls-hint">RIGHT DRAG to orbit &nbsp; SCROLL to zoom &nbsp; R to reset &nbsp; ESC to pause</p></div><div class="hud-tools">${button(icon("heart"), "emote", 'aria-label="Use equipped emote"', "icon-button")}${button(icon("help"), "help", 'aria-label="Controls and surfaces"', "icon-button")}${button(icon("camera"), "camera", 'aria-label="Rotate camera"', "icon-button")}${button(icon("reset"), "reset", 'aria-label="Reset ball, one stroke penalty"', "icon-button")}${button(icon("pause"), "pause", 'aria-label="Pause game"', "icon-button")}</div></section>`;
}

export function usernameFields(ui) {
  const registered = ui.cloud?.session && !ui.cloud.isGuest;
  const price = registered ? usernameChangeCost(ui.cloud.usernameChanges ?? 0) : 0;
  const guest = ui.cloud?.isGuest;
  return `<div class="username-fields"><label class="input-label" for="player-name">${ui.cloud?.session ? 'Account username' : 'Guest name'}</label><div class="row"><input id="player-name" ${guest ? 'disabled' : ''} maxlength="20" value="${esc(ui.progress.data.name)}" autocomplete="off" autocapitalize="none" spellcheck="false" aria-describedby="username-price">${button(registered ? 'Change' : 'Save', 'save-name', guest ? 'disabled' : '')}</div><p id="username-price" class="small-note">${registered ? `Next change: <strong>${price ? price.toLocaleString()+' coins' : 'Free'}</strong>. You will review the change before confirming.` : guest ? 'Create an account to choose your username.' : 'Your guest name is saved on this device.'}</p></div>`;
}
