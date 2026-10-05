import { PASS_TIERS, membership, tierClaimed, MEMBERSHIP_COST, MEMBER_DAILY } from "./equipment.js";
import { ACHIEVEMENTS } from "./save.js";
import { ITEM_BY_ID } from "./catalog.js";
import { page, button, esc, coins } from "./views.js";
import { halloweenActive } from './season.js';
export { clubPassView } from "./pass-view.js";
export function achievementsView(ui) {
  return page(
    ui,
    "Achievements",
    "Play, reach a milestone, and collect exclusive equipment and earned lockers.",
    achievementCards(ui),
    button("Back to shop", "shop", "", "button secondary"),
  );
}

export function achievementCards(ui) {
  const d=ui.progress.data;
  return `<div class="achievement-rewards">${ACHIEVEMENTS.filter(a=>a.id!=='pumpkin'||halloweenActive()||d.achievements.includes(a.id)).map((a) => {
      const item = ITEM_BY_ID[a.item],
        n = Math.min(a.target, a.value(d)),
        ready = d.achievements.includes(a.id) || n >= a.target,
        claimed = d.achievementRewards?.includes(a.id);
      return `<article class="panel achievement-reward ${ready ? "ready" : ""}"><img src="${ui.world.itemThumbnail(item)}" alt="${esc(item.name)}"><div><span class="eyebrow">${claimed ? "REWARDS COLLECTED" : ready ? "READY TO CLAIM" : "ON THE COURSE"}</span><h2>${a.name}</h2><p>${a.desc}</p><div class="challenge-track"><i style="width:${(n / a.target) * 100}%"></i></div><small>${n.toLocaleString()} / ${a.target.toLocaleString()}</small><h3>${item.name}</h3><p>${a.locker ? `${a.lockerCount} ${a.locker === "tour" ? "Tour" : "Fairway"} Locker${a.lockerCount > 1 ? "s" : ""} + exclusive ${item.category === "club" ? "putter" : item.category}` : (a.items || [a.item]).map(id=>ITEM_BY_ID[id].name).join(" + ")}</p>${button(claimed ? "Collected" : "Collect rewards", "claim-achievement", `data-id="${a.id}" ${!ready || claimed ? "disabled" : ""}`, "button yellow")}</div></article>`;
    }).join("")}</div>`;
}
