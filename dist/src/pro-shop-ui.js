import { shopView, lockerDetail, lockerArt, selectedLockerCount } from "./shop-view.js";
import { LOCKERS, shopBundles, openLockers, buyBundle, lockerPool, lockerQuote } from "./pro-shop.js";
import { ITEM_BY_ID, CATEGORIES, RARITY } from "./catalog.js";
import { button, esc, coins, rarityClass } from "./views.js";
import { icon } from "./icons.js";
import { patternLabel, finishItem } from './finishes.js';
import { lockerMotion } from './locker-motion.js';

const priceFor = (ui, b) =>
  Math.ceil((b.price * b.items.filter((i) => !ui.progress.data.owned.includes(i.id)).length) / b.items.length);
const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
const STEP = 164; // reel card width + gap, in CSS pixels
const WINNER = 44;

export function proShopView(ui) {
  return shopView(ui);
}

let listening = false;
function listen(ui) {
  if (listening) return;
  listening = true;
  document.addEventListener("change", (e) => {
    if (e.target.id !== "shop-sort") return;
    ui.shopSort = e.target.value;
    ui.render();
  });
  document.addEventListener("keydown", (e) => {
    const stage = document.getElementById("crate-stage");
    if (!stage) return;
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      if (stage.dataset.phase === "reveal" || stage.dataset.phase === "error") closeStage(ui);
      else stage.skip?.();
    }
    if (e.key === "Tab") {
      const controls = [...stage.querySelectorAll("button:not(:disabled)")];
      if (!controls.length) return;
      const first = controls[0],
        last = controls.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, true);
}

function closeStage(ui) {
  const stage = document.getElementById("crate-stage");
  if (!stage) return;
  stage.classList.add("leaving");
  ui.root.inert = !!ui.modalRoot.children.length;
  setTimeout(() => stage.remove(), 260);
  ui.crateOpening = false;
  ui.world.suspended = false;
  ui.render();
  ui.lastFocus?.isConnected && ui.lastFocus.focus?.();
}

// Visual filler for the reel, drawn with the locker's real published odds.
function filler(pack) {
  const r = Math.random() * 100;
  let acc = 0;
  for (const [rarity, weight] of Object.entries(pack.odds)) {
    acc += weight;
    if (r < acc && weight > 0) {
      const pool = lockerPool(rarity, pack.id);
      if (pool.length) return pool[Math.floor(Math.random() * pool.length)];
    }
  }
  const any = Object.keys(pack.odds).flatMap((r) => lockerPool(r, pack.id));
  return any[Math.floor(Math.random() * any.length)];
}

function reelCard(ui, item) {
  return `<div class="reel-card ${rarityClass(item)}" style="--rarity:${RARITY[item.rarity]}"><img src="${ui.world.itemThumbnail(item)}" alt=""><span>${esc(item.name)}</span></div>`;
}

async function runOpening(ui, pack, count = 1) {
  const quote = lockerQuote(ui.progress.data, pack.id, count);
  if (ui.pendingLocker && (ui.pendingLocker.id !== pack.id || ui.pendingLocker.count !== count))
    throw Error('Retry your previous locker opening first so its rewards can be confirmed.');
  if (!ui.pendingLocker && !quote.affordable) throw Error(quote.available ? `You need ${(quote.cost - ui.progress.data.coins).toLocaleString()} more coins for this opening.` : 'Only Halloween lockers you already own can be opened after the event.');
  const earned = quote.earned === count;
  ui.lastFocus = document.activeElement;
  ui.closeModal();
  ui.crateOpening = true;
  ui.audio.start();
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches,
    stage = document.createElement("div");
  stage.id = "crate-stage";
  stage.className = "crate-stage" + (count > 1 ? " crate-batch" : "");
  stage.style.setProperty('--batch-count', count);
  stage.dataset.phase = "unlock";
  stage.setAttribute("role", "dialog");
  stage.setAttribute("aria-modal", "true");
  stage.setAttribute("aria-label", "Opening " + pack.name);
  stage.style.setProperty("--crate", pack.color);
  stage.style.setProperty("--gem", pack.gem);
  stage.innerHTML = `<div class="crate-backdrop"></div><div class="crate-shell"><header><span class="eyebrow">${earned ? "Earned" : "Opening"} · ${count} locker${count > 1 ? 's' : ''}</span><h2>${esc(pack.name)}</h2></header><div class="crate-hero"><img class="crate-model" src="${lockerArt(ui, pack)}" alt=""><div class="crate-status" aria-live="polite">Unlocking…</div></div><div class="locker-reel" hidden>${Array.from({length:count}, (_,i)=>`<div class="reel-window" aria-label="Locker ${i+1}"><div class="reel-strip"></div><div class="reel-marker" aria-hidden="true"></div></div>`).join('')}</div><div class="crate-reveal" hidden></div><footer>${button("Skip", "crate-skip", "", "text-button crate-skip")}</footer></div>`;
  document.body.append(stage);
  ui.root.inert = true;
  setTimeout(() => stage.isConnected && (ui.world.suspended = true), 320);
  stage.querySelector(".crate-skip").focus();
  const motion = lockerMotion();
  const artLoading = new AbortController();
  stage.skip = () => {motion.skip(); artLoading.abort();};
  // Reuse a small weighted set of reel art while the server unlocks the item.
  const fillers = Array.from({length:12}, () => filler(pack));
  const prepared = reduce ? Promise.resolve() : ui.world.prepareItemThumbnails?.(fillers, {signal:artLoading.signal});

  // Server (or local guest) decides the result before any animation plays.
  ui.pendingLocker ??= { id: pack.id, count, requestId: crypto.randomUUID() };
  const request = ui.pendingLocker;
  let result;
  try {
    [result] = await Promise.all([
      ui.cloud.session
        ? ui.cloud.call("open_locker", request).then((r) => r.outcome)
        : Promise.resolve().then(() =>
            openLockers(ui.progress, request.id, request.count, request.requestId, () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296),
          ),
      motion.wait(reduce ? 0 : 1100),
    ]);
  } catch (e) {
    artLoading.abort();
    if (!/timeout|network|fetch|connect|reach|took too long/i.test(e.message)) ui.pendingLocker = null;
    stage.dataset.phase = "error";
    const message = /unknown locker/i.test(e.message) ? "This locker isn’t available on the server yet. Please try again later." : e.message;
    stage.querySelector(".crate-status").textContent = "";
    stage.querySelector(".crate-hero").classList.add("is-error");
    stage.querySelector(".crate-reveal").hidden = false;
    stage.querySelector(".crate-reveal").innerHTML = `<p class="crate-error">${esc(message)}</p><div class="modal-actions">${button("Close", "crate-close", "", "button yellow")}</div>`;
    stage.querySelector("footer").hidden = true;
    stage.querySelector('[data-action="crate-close"]').focus();
    return;
  }
  ui.pendingLocker = null;
  ui.render();
  const receipts = result.items || [result];
  const items = receipts.map(r => finishItem({ ...(ITEM_BY_ID[r.item] || { id: r.item, name: "New item", rarity: "Rare", category: "ball", color: "#dddddd" }), ...(r.seed===undefined?{}:{seed:r.seed}) }));
  const winner = count > 1 ? 22 : WINNER;
  stage.querySelector(".crate-status").textContent = "Spinning up…";
  if (!motion.skipped && !reduce) await motion.race(Promise.all([prepared, ui.world.prepareItemThumbnails?.(items, {signal:artLoading.signal})]));
  if (!motion.skipped && !reduce) {
    stage.dataset.phase = "reel";
    const reel = stage.querySelector(".locker-reel"), strips = [...stage.querySelectorAll('.reel-strip')];
    strips.forEach((strip, n) => {
      const cards = Array.from({length:winner+8}, (_,i) => i === winner ? items[n] : fillers[Math.floor(Math.random()*fillers.length)]);
      strip.innerHTML = cards.map(c => reelCard(ui,c)).join('');
    });
    reel.hidden = false;
    stage.querySelector(".crate-hero").classList.add("is-open");
    await frame();
    const animations = strips.map((strip, n) => {
      const windowWidth = strip.parentElement.clientWidth, jitter = (Math.random() - 0.5) * STEP * 0.62;
      const target = winner * STEP + STEP / 2 - windowWidth / 2 + jitter;
      const anim = strip.animate([{ transform: "translateX(0)" }, { transform: `translateX(${-target}px)` }], {
        duration: 6200 + n * 70,
        easing: "cubic-bezier(0.08, 0.72, 0.1, 1)",
        fill: "forwards",
      });
      motion.animate(anim);
      return anim;
    });
    const strip = strips[0], anim = animations[0], windowWidth = strip.parentElement.clientWidth;
    let last = -1;
    const marker = stage.querySelector(".reel-marker");
    const tick = () => {
      if (!stage.isConnected || anim.playState === "finished") return;
      const x = -new DOMMatrixReadOnly(getComputedStyle(strip).transform).m41,
        index = Math.floor((x + windowWidth / 2) / STEP);
      if (index !== last) {
        last = index;
        ui.audio.tone?.(760 + (index % 2) * 90, 0.035, "square", 0.08);
        marker.classList.remove("pulse");
        void marker.offsetWidth;
        marker.classList.add("pulse");
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    await motion.race(Promise.all(animations.map(a => a.finished.catch(() => {}))));
    strips.forEach(s => s.children[winner]?.classList.add('is-winner'));
    await motion.wait(450);
  }
  artLoading.abort();
  if (count > 1) revealBatch(ui, stage, pack, items, result);
  else reveal(ui, stage, pack, items[0], receipts[0]);
}

function revealBatch(ui, stage, pack, items, result) {
  if (!stage.isConnected) return;
  stage.dataset.phase = 'reveal';
  stage.classList.add('revealed');
  stage.querySelector('.crate-hero').hidden = true;
  stage.querySelector('footer').hidden = true;
  const box = stage.querySelector('.crate-reveal');
  const again = lockerQuote(ui.progress.data, pack.id, items.length).affordable;
  box.hidden = false;
  box.innerHTML = `<h2>${items.length} lockers opened</h2><div class="batch-rewards">${items.map((item,i) => {
    const r = result.items[i];
    return `<article class="batch-reward" style="--rarity:${RARITY[item.rarity]}"><img src="${ui.world.itemThumbnail(item)}" alt="${esc(item.name)}"><span class="rarity-chip">${item.rarity}</span><h3>${esc(item.name)}</h3>${item.finish ? `<p>Pattern ${String(r.seed).padStart(3,'0')}${item.finish==='case-hardened'?' · '+patternLabel(r.seed):''}</p>` : ''}<small>${r.duplicate ? r.refund ? `${r.refund.toLocaleString()} coins refunded` : 'Already owned' : 'Added to your caddie'}</small></article>`;
  }).join('')}</div><p>${result.cost.toLocaleString()} coins spent${result.refund ? ' · '+result.refund.toLocaleString()+' refunded' : ''}</p><div class="modal-actions">${button('Open '+items.length+' again','open-locker',`data-id="${pack.id}" data-count="${items.length}" ${again?'':'disabled'}`,'button secondary')}${button('Done','crate-close','','button yellow')}</div>`;
  ui.audio.play(items.some(i => ['Legendary','Black Market'].includes(i.rarity)) ? 'level' : 'reward');
  box.querySelector('button:not(:disabled)')?.focus();
}

function reveal(ui, stage, pack, item, result) {
  if (!stage.isConnected) return;
  stage.dataset.phase = "reveal";
  const high = item.rarity === "Legendary" || item.rarity === "Black Market",
    category = CATEGORIES.find((c) => c.id === item.category)?.name || "",
    d = ui.progress.data,
    again = (d.lockers?.[pack.id] || 0) > 0 || d.coins >= pack.price,
    box = stage.querySelector(".crate-reveal");
  stage.style.setProperty("--rarity", RARITY[item.rarity]);
  stage.classList.add("revealed", rarityClass(item));
  stage.querySelector(".crate-hero").hidden = true;
  stage.querySelector("footer").hidden = true;
  box.hidden = false;
  box.innerHTML = `<div class="reveal-burst" aria-hidden="true">${high ? Array.from({ length: 18 }, (_, i) => `<i style="--a:${i * 20}deg;--d:${(i % 3) * 0.08}s"></i>`).join("") : ""}</div><div class="reveal-art"><img src="${ui.world.itemThumbnail(item)}" alt="${esc(item.name)}"></div><span class="rarity-chip" style="--rarity:${RARITY[item.rarity]}">${item.rarity} · ${category}</span><h2>${esc(item.name)}</h2><p>${result.duplicate ? `Already in your caddie${result.refund ? ` · ${coins(result.refund)} refunded` : ""}` : "Added to your caddie"}</p><div class="modal-actions">${!result.duplicate && ["ball", "club", "driver", "trail", "hole", "emote", "nameplate"].includes(item.category) ? button("Equip now", "crate-equip", `data-id="${item.id}"`, "button yellow") : ""}${button(again ? "Open another" : "Need more tokens", "open-locker", `data-id="${pack.id}" ${again ? "" : "disabled"}`, "button secondary")}${button("Done", "crate-close", "", "button secondary")}</div>`;
  ui.audio.play(high ? "level" : "reward");
  if (item.finish) {
    const description=document.createElement('p');
    description.className='pattern-reveal-label';
    description.textContent='Pattern '+String(result.seed).padStart(3,'0')+(item.finish==='case-hardened'?' · '+patternLabel(result.seed):'');
    box.querySelector('h2').after(description);
    const equip=box.querySelector('[data-action="crate-equip"]');
    if(equip)equip.dataset.seed=result.seed;
  }
  box.querySelector("button:not(:disabled)")?.focus();
}

export async function proShopAction(ui, name, data) {
  listen(ui);
  if (name === 'locker-quantity') {
    ui.lockerCount = Number(data.count);
    ui.render();
    if (data.id) ui.modal(lockerDetail(ui, data.id), {wide:true});
    return true;
  }
  if (name === "shop-shelf") {
    ui.shopShelf = data.id;
    ui.shopCategory = "all";
    ui.render();
    return true;
  }
  if (name === "shop-owned") {
    ui.shopHideOwned = !ui.shopHideOwned;
    ui.render();
    return true;
  }
  if (name === "shop-code") {
    ui.modal(
      `<h2>Redeem a gift code</h2><p>Codes are case-sensitive and can be redeemed once ${ui.cloud.localPreview ? 'in this local preview. Preview rewards save on this device.' : 'per account. Country Club items remain exclusive to membership.'}</p><form id="gift-form" class="gift-redemption"><label for="gift-code">Gift code</label><input id="gift-code" name="code" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="80" placeholder="Enter your code" required><button type="submit" class="button yellow wide">${ui.cloud.session || ui.cloud.localPreview ? "Redeem" : "Sign in to redeem"}</button></form>`,
    );
    return true;
  }
  if (name === "locker-detail") {
    ui.modal(lockerDetail(ui, data.id), { wide: true });
    return true;
  }
  if (name === "crate-skip") {
    document.getElementById("crate-stage")?.skip?.();
    return true;
  }
  if (name === "crate-close") {
    closeStage(ui);
    return true;
  }
  if (name === "crate-equip") {
    closeStage(ui);
    await ui.action(data.seed===undefined?"equip":"equip-pattern", { id: data.id, seed: data.seed });
    return true;
  }
  if (name === "bundle-detail") {
    const b = shopBundles().find((b) => b.id === data.id);
    if (!b) throw Error("This bundle has rotated out.");
    const cost = priceFor(ui, b);
    ui.modal(
      `<span class="eyebrow">Bundle exclusive</span><h2>${esc(b.name)}</h2><div class="bundle-detail-items">${b.items.map((i) => `<button class="odds-item ${ui.progress.data.owned.includes(i.id) ? "is-owned" : ""}" data-action="item-detail" data-id="${i.id}" style="--rarity:${RARITY[i.rarity]}"><img src="${ui.world.itemThumbnail(i)}" alt=""><span>${esc(i.name)}</span><small>${ui.progress.data.owned.includes(i.id) ? "Owned" : i.rarity}</small></button>`).join("")}</div><div class="modal-actions"><span>Only missing pieces are charged.</span>${coins(cost)}${button("Buy collection", "buy-bundle", `data-id="${b.id}" ${!cost || ui.progress.data.coins < cost ? "disabled" : ""}`, "button yellow")}</div>`,
      { wide: true },
    );
    return true;
  }
  if (!["open-locker", "buy-bundle"].includes(name)) return false;
  if (ui.shopBusy) return true;
  ui.shopBusy = true;
  try {
    if (name === "open-locker") {
      const pack = LOCKERS.find((p) => p.id === data.id);
      if (!pack) throw Error("This locker is unavailable.");
      document.getElementById("crate-stage")?.remove();
      ui.crateOpening = false;
      await runOpening(ui, pack, Number(data.count) || selectedLockerCount(ui));
    } else {
      if (ui.cloud.session) await ui.cloud.call("buy_bundle", { id: data.id });
      else buyBundle(ui.progress, data.id);
      ui.closeModal();
      ui.render();
      ui.audio.play("purchase");
      ui.toast("Collection added to your caddie.");
    }
  } finally {
    ui.shopBusy = false;
  }
  return true;
}

export function installShopExtras(ui) {
  listen(ui);
  const reveal = ui.revealItems;
  ui.revealItems = (ids) => {
    if (ui.crateOpening || document.getElementById("crate-stage")) return;
    reveal(ids);
  };
}
