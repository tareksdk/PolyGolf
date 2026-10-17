import { profileAccolades, profileMedals, profileBests } from './honors-view.js';
import { nameplate } from "./nameplates.js";
import { achievementsView } from "./collection-ui.js";
import { creditsDialog } from "./credits.js";
import { proShopView, proShopAction } from "./pro-shop-ui.js";
import { itemDescription, driverYards, MINI_EFFECTS } from "./equipment.js";
import { finishItem, validSeed, patternLabel } from './finishes.js';
import { page, button, esc, coins, itemCard, rarityClass, profileView } from "./views.js";
import { ITEMS, ITEM_BY_ID, CATEGORIES, RARITY, shopRotation, itemSource, shopAvailable } from "./catalog.js";
import { levelInfo, ACHIEVEMENTS, challengesFor } from "./save.js";
import { publicProfile } from "./profile-data.js";

const avatar = (p, size = "") =>
  `<span class="golfer-avatar ${size}">${p.avatar ? `<img src="${esc(p.avatar)}" alt="${esc(p.username)} profile picture">` : esc((p.username || "?")[0].toUpperCase())}</span>`;
function relationshipButtons(ui, p, relation) {
  if (p.id === ui.cloud.session?.user.id) return "";
  const attrs = `data-user="${p.id}"`;
  return relation?.status === "accepted"
    ? button("Trade items", "trade-start", attrs, "button yellow") + button("Friends · Remove", "friend-action", attrs + ' data-operation="remove"', "button secondary")
    : relation?.status === "pending"
      ? relation.incoming
        ? button("Accept request", "friend-action", attrs + ' data-operation="accept"', "button yellow") +
          button("Decline", "friend-action", attrs + ' data-operation="remove"', "button secondary")
        : button("Cancel request", "friend-action", attrs + ' data-operation="remove"', "button secondary")
      : button("Add friend", "friend-action", attrs + ' data-operation="request"', "button yellow");
}
export function golferCard(ui, p, relation) {
  const level = levelInfo(p.xp);
  return `<div class="public-profile"><div class="profile-cover"><span>POLYGOLF / GOLFER</span><span>${p.member ? "COUNTRY CLUB" : "EST. " + (p.joined ? new Date(p.joined).getFullYear() : 2026)}</span>${profileAccolades(p)}</div><div class="public-profile-head">${avatar(p, "large")}<div class="public-profile-identity">${nameplate(p.username,p.equipment?.nameplate)}<span>Level ${level.level}${p.member ? " · Country Club member" : ""}</span><p class="golfer-bio">${p.bio ? esc(p.bio) : "No bio yet."}</p></div>${profileMedals(p)}</div><div class="social-stats">${[
    ["Rounds", p.stats.games || 0], ["Courses", p.stats.courses || 0], ["Strokes", p.stats.strokes || 0], ["Time", Math.floor((p.stats.playTime || 0)/60) + " min"],
    ["Holes", p.stats.holes],
    ["Birdies", p.stats.birdies],
    ["Aces", p.stats.aces],
    ["Items", p.items],
  ]
    .map(([label, value]) => `<div><strong>${value}</strong><span>${label}</span></div>`)
    .join("")}</div><div class="profile-equipment">${["ball", "club", "driver"]
    .map((c) => {
      const item = finishItem(ITEM_BY_ID[p.equipment[c]], p.equipment);
      const seed = item?.finish && p.equipment.patterns?.[item.id];
      const pattern = validSeed(seed) ? `<span class="profile-pattern">Seed ${String(seed).padStart(3,'0')}${item.finish === 'case-hardened' ? ' · ' + patternLabel(seed) : ''}</span>` : '';
      return item
        ? `<div><img src="${ui.world.itemThumbnail(item)}" alt="${esc(item.name)}"><small>${esc(item.name)}</small>${pattern}</div>`
        : "";
    })
    .join(
      "",
    )}</div>${profileBests(p)}<div class="row profile-friend-actions">${p.honors?.canGive?.length ? button("Give an accolade", "accolade-options", `data-user="${esc(p.id)}"`, "button secondary") : ""}${relationshipButtons(ui, p, relation)}</div></div>`;
}
function ownProfile(ui) { return profileView(ui); }
function editProfile(ui) {
 const p = ui.cloud.profile || { username: ui.progress.data.name, bio: '', avatar: '' };
 ui.modal(`<h2>Edit your golfer</h2><form id="profile-form"><label class="avatar-upload">${avatar(p)}<span>Upload a profile picture<small>JPG, PNG or WebP · up to 5 MB</small></span><input id="profile-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp"></label><div class="row"><span id="photo-status" class="small-note"></span>${button("Remove picture", "remove-photo", "", "text-button")}</div><label>Bio<textarea id="profile-bio" name="bio" maxlength="280" rows="4" placeholder="Home course, favourite club, or a few words about you…">${esc(p.bio)}</textarea></label><p class="small-note">280 characters maximum. Photos are cropped to a square.</p><p id="profile-error" role="alert" class="form-error"></p><button type="submit" class="button yellow">Save profile</button></form>`);
}
function friendRow(ui, p, type) {
  return `<article data-card class="friend-row">${avatar(p)}<div>${button(esc(p.username), "view-profile", `data-card-primary data-user="${p.id}"`, "profile-link")}<small>Level ${levelInfo(p.xp).level}${p.member ? " · Member" : ""}</small></div><div class="friend-row-actions">${type === "incoming" ? button("Accept", "friend-action", `data-user="${p.id}" data-operation="accept"`, "button yellow") : type === "outgoing" ? '<span class="badge">REQUEST SENT</span>' : button("Profile", "view-profile", `data-user="${p.id}"`, "button secondary")}${type === "incoming" || type === "outgoing" ? button(type === "incoming" ? "Decline" : "Cancel", "friend-action", `data-user="${p.id}" data-operation="remove"`, "text-button") : ""}</div></article>`;
}
function friendsView(ui) {
  if (!ui.cloud.session)
    return page(
      ui,
      "Friends",
      "Find golfers and keep your regular group together.",
      `<section class="panel empty-state"><h2>Sign in to find your group</h2><p>Search usernames, send requests and view other golfers’ profiles.</p>${button("Sign in", "account", "", "button yellow")}</section>`,
    );
  const d = ui.friendsData || { friends: [], incoming: [], outgoing: [] };
  return page(
    ui,
    "Friends",
    "Your regulars, your next rivals, your favourite playing partners.",
    `<div class="friends-layout"><section class="panel"><form id="golfer-search" class="golfer-search"><label>Find a golfer<input name="query" value="${esc(ui.playerSearch || "")}" maxlength="20" minlength="2" placeholder="Search by username" required></label><button class="button yellow" type="submit">Search</button></form><p id="search-error" class="form-error" role="alert"></p><div id="player-results">${ui.searchResults ? (ui.searchResults.length ? ui.searchResults.map((p) => friendRow(ui, p, "search")).join("") : '<p class="empty-list">No golfers matched that username.</p>') : '<p class="empty-list">Enter at least two characters to find a golfer.</p>'}</div></section><section class="panel"><div class="section-heading"><h2>Your friends <span class="muted">${d.friends.length}</span></h2>${button("Refresh", "friends-refresh", "", "text-button")}</div>${ui.friendsLoading ? '<p class="empty-list">Loading your friends…</p>' : d.friends.map((p) => friendRow(ui, p, "friend")).join("") || '<p class="empty-list">Your group starts with the first request.</p>'}${button("Trade inbox", "trades", "", "button secondary wide")}${button("Host or join a round", "multiplayer", "", "button secondary wide")}</section></div>${d.incoming.length ? `<section class="panel request-panel"><h2>Friend requests</h2>${d.incoming.map((p) => friendRow(ui, p, "incoming")).join("")}</section>` : ""}${d.outgoing.length ? `<section class="panel request-panel"><h2>Sent requests</h2>${d.outgoing.map((p) => friendRow(ui, p, "outgoing")).join("")}</section>` : ""}`,
  );
}
function shopView(ui) {
  const r = shopRotation(),
    cat = ui.shopCategory;
  const filtered = (items) => items.filter((i) => cat === "all" || i.category === cat);
  const section = (title, caption, items) =>
    `<section class="shop-section"><div class="section-heading"><h2>${title}</h2><span>${caption}</span></div><div class="items-grid">${
      filtered(items)
        .map((i) => itemCard(ui, i))
        .join("") || '<p class="empty-list">No items in this category for this rotation.</p>'
    }</div></section>`;
  return page(
    ui,
    "Pro shop",
    "Equipment, finishes and the occasional rare find.",
    `<div class="shop-meta"><span>${ITEMS.length} ITEMS IN THE COLLECTION</span><span>Daily refresh: 00:00 UTC · Weekly refresh: Monday</span></div><div class="category-tabs">${[{ id: "all", name: "All items" }, ...CATEGORIES].map((c) => button(c.name, "shop-category", `data-id="${c.id}" aria-pressed="${cat === c.id}"`, "category-tab " + (cat === c.id ? "active" : ""))).join("")}</div>${section("This week", "RESETS " + new Date(r.nextWeek).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" }), [...r.featured, ...r.weekly])}${section("Today’s selection", "REFRESHES IN " + Math.floor((r.nextDay - Date.now()) / 3600000) + "H", r.daily)}<section class="panel gift-code-panel"><div><h2>Redeem a code</h2><p>Tester sets and special rewards. Codes are case-sensitive.</p></div><form id="gift-form"><label>Gift code<input id="gift-code" autocomplete="off" maxlength="80" placeholder="Enter your code"></label><button class="button yellow" type="submit">${ui.cloud.session ? "Redeem" : "Sign in to redeem"}</button></form></section><p class="small-note">Alpha items come from the tester code. Country Club rewards are earned on the member track. Four Black Market items sit above Legendary.</p>`,
  );
}

export function installClubhouse(ui) {
  const render = ui.render.bind(ui),
    action = ui.action.bind(ui);
  let known = new Set(ui.progress.data.owned),
    actor = ui.cloud.session?.user.id || "guest";
  const track = () => {
    const current = ui.cloud.session?.user.id || "guest";
    if (actor !== current) {
      actor = current;
      known = new Set(ui.progress.data.owned);
      return;
    }
    const ids = ui.progress.data.owned.filter((id) => !known.has(id));
    known = new Set(ui.progress.data.owned);
    if (ids.length) queueMicrotask(() => ui.revealItems(ids));
  };
  ui.revealItems = (ids) => {
    clearTimeout(ui.unlockTimer);
    document.getElementById("item-reveal")?.remove();
    const items = ids.map((id) => ITEM_BY_ID[id]).filter(Boolean);
    if (!items.length) return;
    const item = items.find((i) => i.rarity === "Black Market") || items[0],
      box = document.createElement("aside");
    box.id = "item-reveal";
    box.className = "item-reveal";
    box.setAttribute("role", "status");
    box.style.setProperty("--reveal-color", RARITY[item.rarity]);
    box.innerHTML = `<button data-action="dismiss-reveal" class="reveal-close" aria-label="Dismiss item unlock">×</button><div class="reveal-image"><img src="${ui.world.itemThumbnail(item)}" alt="${esc(item.name)}"></div><div><small>${items.length > 1 ? items.length + " ITEMS UNLOCKED" : "ADDED TO YOUR CADDIE"}</small><h3>${items.length === 7 && items.every((i) => i.source === "alpha") ? "Alpha Set" : items.length > 30 ? "Full collection" : item.name}</h3><p>${
      items.length > 1
        ? items
            .slice(0, 3)
            .map((i) => i.name)
            .join(" · ") + (items.length > 3 ? " + " + (items.length - 3) + " more" : "")
        : item.rarity + " · " + CATEGORIES.find((c) => c.id === item.category).name
    }</p></div>`;
    document.body.append(box);
    ui.audio.play("reward");
    ui.unlockTimer = setTimeout(() => box.remove(), 7000);
  };
  ui.render = () => {
    track();
    if (ui.game.state === "menu" && ui.screen === "achievements") {
      ui.root.innerHTML = achievementsView(ui);
      return;
    }
    if (ui.game.state === "menu" && ui.screen === "friends") {
      ui.root.innerHTML = friendsView(ui);
      return;
    }
    if (ui.game.state === "menu" && ui.screen === "profile" && ui.cloud.session) {
      ui.root.innerHTML = ownProfile(ui);
      return;
    }
    if (ui.game.state === "menu" && ui.screen === "shop") {
      ui.root.innerHTML = proShopView(ui);
      return;
    }
    render();
  };
  const loadFriends = async () => {
    ui.friendsLoading = true;
    ui.render();
    try {
      ui.friendsData = await ui.cloud.call("friends");
    } finally {
      ui.friendsLoading = false;
      ui.render();
    }
  };
  const showProfile = async (userId) => {
    if (!ui.cloud.session) {
      await action("account");
      return;
    }
    const request = (ui.profileRequest = (ui.profileRequest || 0) + 1);
    ui.pauseForDialog();
    ui.modal("<h2>Loading golfer…</h2>");
    const data = await ui.cloud.call("profile", { userId });
    if (request !== ui.profileRequest || !ui.modalRoot.children.length) return;
    ui.viewedProfile = data;
    ui.modal(golferCard(ui, data.profile, data.relationship), { wide: true });
  };
  ui.action = async (name, data = {}) => {
    try {
      if (name === "achievements") {
        ui.navigate("achievements");
        return;
      }
      if (name === "claim-achievement") {
        if (ui.cloud.session) await ui.cloud.call("claim_achievement", { id: data.id });
        else ui.progress.claimAchievement(data.id);
        ui.render();
        ui.toast("Achievement equipment and lockers collected.");
        return;
      }
      if (name === "pass-page" || name === "pass-current") {
        ui.passStart =
          name === "pass-current" ? undefined : Math.max(0, Math.min(20, Number(data.start) || 0));
        ui.render();
        return;
      }
      if (name === "credits") {
        ui.pauseForDialog();
        ui.modal(creditsDialog(), { wide: true });
        return;
      }
      if (await proShopAction(ui, name, data)) return;
      if (name === "dismiss-reveal") {
        document.getElementById("item-reveal")?.remove();
        return;
      }
      if (name === "friends" || name === "friends-refresh") {
        ui.navigate("friends");
        if (ui.cloud.session) await loadFriends();
        return;
      }
      if (name === "edit-profile") { editProfile(ui); return; }
      if (name === "profile") {
        ui.photoDraft = undefined;
        await action(name, data);
        if (ui.cloud.session) {
          const r = await ui.cloud.call("profile", { userId: ui.cloud.session.user.id });
          ui.cloud.profile = r.profile;
          ui.render();
        }
        return;
      }
      if (name === "view-profile") {
        await showProfile(data.user);
        return;
      }
      if (name === "remove-photo") {
        ui.photoDraft = "";
        const preview = document.querySelector(".avatar-upload .golfer-avatar");
        if (preview) preview.textContent = (ui.cloud.username || "?")[0].toUpperCase();
        document.getElementById("photo-status").textContent = "Picture will be removed when you save.";
        return;
      }
      if (name === "friend-action") {
        if (ui.friendBusy) return;
        ui.friendBusy = true;
        try {
          const r = await ui.cloud.call("friend_action", { userId: data.user, operation: data.operation });
          if (ui.viewedProfile?.profile.id === data.user && ui.modalRoot.children.length) {
            ui.viewedProfile.relationship = r.relationship;
            ui.modal(golferCard(ui, ui.viewedProfile.profile, r.relationship), { wide: true });
          }
          if (ui.screen === "friends") await loadFriends();
          ui.toast(
            data.operation === "request"
              ? "Friend request sent."
              : data.operation === "accept"
                ? "Friend added."
                : "Request or friendship removed.",
          );
        } finally {
          ui.friendBusy = false;
        }
        return;
      }
      if (name === "collection-filter") {
        ui.showAllItems = !ui.showAllItems;
        ui.render();
        return;
      }
      if (name === "item-detail" || name === "buy") {
        const item = ITEM_BY_ID[data.id];
        if (!item) return;
        const owned = ui.progress.data.owned.includes(item.id),
          available = shopAvailable(item.id),
          equipped = ui.progress.data.equipment[item.category] === item.id,
          short = !owned && available && ui.progress.data.coins < item.price,
          facts = [
            ["Source", itemSource(item)],
            ...(item.category === "driver" ? [["Full golf", driverYards({ driver: item.id }) + " yd driver"]] : []),
            ...(["ball", "club"].includes(item.category) && (MINI_EFFECTS[item.id] || item.id.includes("-edition-"))
              ? [["Mini-golf", itemDescription({ ...item, flavor: "" }).split(" Full golf")[0].replace("Mini-golf: ", "")]]
              : []),
          ];
        ui.modal(
          `<div class="item-detail-v2 ${rarityClass(item)}" style="--rarity:${RARITY[item.rarity]}"><div class="detail-art"><img src="${ui.world.itemThumbnail(item)}" alt="${esc(item.name)}"></div><div class="detail-copy"><span class="rarity-chip" style="--rarity:${RARITY[item.rarity]}">${item.rarity} · ${CATEGORIES.find((c) => c.id === item.category).name}</span><h2>${esc(item.name)}</h2><p>${esc(item.flavor || (item.category === "driver" ? "A driver finish for your full-golf bag." : "A finish for your collection."))}</p><dl class="detail-facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl><div class="detail-actions">${owned ? `<span class="pg-owned">${equipped ? "Equipped" : "In your caddie"}</span>` : item.price ? coins(item.price) : `<span class="pg-source">${itemSource(item)}</span>`}${button(owned ? (equipped ? "Equipped" : "Equip") : available ? (short ? "Need more tokens" : "Buy item") : "Not in the shop now", owned ? "equip" : "confirm-buy", `data-id="${item.id}" ${equipped || (!owned && (!available || short)) ? "disabled" : ""}`, "button yellow")}</div>${short ? `<p class="small-note">${(item.price - ui.progress.data.coins).toLocaleString()} more tokens needed. Earn tokens on the course.</p>` : ""}</div></div>`,
          { wide: true },
        );
        return;
      }
      await action(name, data);
    } catch (e) {
      ui.toast(e.message || "Please try again.");
    }
  };
  document.addEventListener("submit", async (e) => {
    const form = e.target;
    if (form.id === "gift-form") {
      e.preventDefault();
      await ui.action("redeem-code");
      return;
    }
    if (!["profile-form", "golfer-search"].includes(form.id)) return;
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      if (form.id === "golfer-search") {
        ui.playerSearch = form.elements.query.value;
        const r = await ui.cloud.call("search_players", { query: ui.playerSearch });
        ui.searchResults = r.profiles;
        ui.render();
      } else {
        const r = await ui.cloud.call("update_profile", {
          bio: form.elements.bio.value,
          avatar: ui.photoDraft ?? ui.cloud.profile?.avatar ?? "",
        });
        ui.cloud.profile = r.profile;
        ui.photoDraft = undefined;
        ui.render();
        ui.toast("Profile saved.");
      }
    } catch (error) {
      const el =
        form.id === "golfer-search"
          ? document.getElementById("search-error")
          : document.getElementById("profile-error");
      if (el) el.textContent = error.message;
    } finally {
      btn.disabled = false;
    }
  });
  document.addEventListener("change", async (e) => {
    if (e.target.id !== "profile-photo") return;
    const file = e.target.files?.[0];
    if (!file) return;
    const status = document.getElementById("photo-status"),
      save = document.querySelector('#profile-form button[type="submit"]');
    save.disabled = true;
    try {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024)
        throw Error("Choose a JPG, PNG or WebP image under 5 MB.");
      status.textContent = "Preparing picture…";
      const bitmap = await createImageBitmap(file),
        canvas = document.createElement("canvas");
      canvas.width = canvas.height = 192;
      const side = Math.min(bitmap.width, bitmap.height);
      canvas
        .getContext("2d")
        .drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 192, 192);
      bitmap.close();
      const data = canvas.toDataURL("image/webp", 0.8);
      if (data.length > 54000) throw Error("This image is too detailed. Choose a smaller image.");
      ui.photoDraft = data;
      document.querySelector(".avatar-upload .golfer-avatar").innerHTML =
        `<img src="${data}" alt="New profile picture preview">`;
      status.textContent = "Ready. Save your profile to upload.";
    } catch (error) {
      status.textContent = error.message;
    } finally {
      save.disabled = false;
    }
  });
}
