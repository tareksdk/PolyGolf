import { page, button, esc } from "./views.js";
import { buildMap } from "./maps.js";
export function communityView(ui) {
  return page(
    ui,
    "Community Maps",
    ui.mode === "golf"
      ? "Full-size golf holes made by the community. Find your next favourite."
      : "Mini-golf courses made by the community. Find your next favourite.",
    `<div class="community-toolbar">${button("← Official courses", "courses", "", "button secondary")}${button("Create a map", "editor", "", "button yellow")}${button("Refresh", "community-refresh", "", "button secondary")}<span>${ui.localPreview?'Published maps · Play locally · Likes and publishing require the live game.':'Custom maps are practice rounds.'}</span></div><div id="community-list" class="course-grid"><section class="panel">Loading community courses…</section></div><div class="community-toolbar">${button("Previous", "community-prev", (ui.communityOffset || 0) === 0 ? "disabled" : "", "button secondary")}${button("Next", "community-next", "", "button secondary")}</div>`,
  );
}
export async function loadCommunity(ui) {
  const request = (ui.communityRequest = (ui.communityRequest || 0) + 1);
  try {
    const { maps } = await ui.cloud.call("community_maps", {
      offset: ui.communityOffset || 0,
      mode: ui.mode,
    });
    if (ui.screen !== "community" || request !== ui.communityRequest) return;
    ui.communityMaps = maps;
    const list = document.querySelector("#community-list");
    if (!list) return;
    list.innerHTML = maps.length
      ? maps
          .map(
            (m) =>
              `<article data-card class="course-card panel"><div class="course-image"><img data-course-preview="custom:${m.id}:${Date.parse(m.published_at)}" src="${ui.world.mapThumbnail(m.layout, m.id + ":" + Date.parse(m.published_at))}" alt="${esc(m.name)} course preview"></div><div class="course-body"><span class="course-number">PAR ${m.layout.par} · BY ${esc(m.author)}</span><h2>${esc(m.name)}</h2><div class="community-actions">${button("Play map", "community-play", `data-card-primary data-id="${m.id}"`, "button yellow")}${button((m.liked ? "♥" : "♡") + " " + m.likes, "community-like", `data-id="${m.id}" aria-label="${m.liked ? "Unlike" : "Like"} ${esc(m.name)}" ${m.own || ui.localPreview ? "disabled" : ""}`, "button secondary")}${button("Edit a copy", "community-copy", `data-id="${m.id}"`, "text-button")}${m.own ? button("Unpublish", "community-unpublish", `data-id="${m.id}"`, "text-button") : ""}</div></div></article>`,
          )
          .join("")
      : '<section class="panel empty-state"><h2>A fresh patch of green.</h2><p>No maps on this page yet. Publish yours from the map editor.</p></section>';
    const next = document.querySelector('[data-action="community-next"]');
    if (next) next.disabled = maps.length < 24;
  } catch (e) {
    const el = document.querySelector("#community-list");
    if (el && request === ui.communityRequest)
      el.innerHTML = `<section class="panel load-error"><p>${esc(e.message)}</p>${button("Try again", "community-refresh", "", "button secondary")}</section>`;
  }
}
export async function communityAction(ui, action, data) {
  if (action === "community-refresh") {
    await loadCommunity(ui);
    return;
  }
  if (action === "community-prev" || action === "community-next") {
    ui.communityOffset = Math.max(0, (ui.communityOffset || 0) + (action === "community-next" ? 24 : -24));
    await loadCommunity(ui);
    return;
  }
  if (action === "return-community") {
    ui.closeModal();
    ui.game.leave();
    ui.screen = "community";
    ui.render();
    return;
  }
  const map = ui.communityMaps?.find((m) => m.id === data.id);
  if (!map) throw Error("Refresh the community courses and try again.");
  if (action === "community-play") {
    if (ui.cloud.room) throw Error("Leave your multiplayer room before playing a community map.");
    ui.closeModal();
    ui.world.equip(ui.progress.data.equipment, ui.items);
    ui.audio.start();
    ui.game.start(0, true, {
      mode: map.layout.mode || "mini",
      customHole: buildMap(map.layout),
      round: { customOrigin: "community" },
    });
  }
  if (action === "community-copy") {
    if (ui.progress.level.level < 10) throw Error("Map creation unlocks at level 10.");
    ui.editor = map.layout.mode === "golf" ? ui.golfEditor : ui.miniEditor;
    ui.editor.remember();
    ui.editor.draft = structuredClone(map.layout);
    ui.editor.draft.name = (map.name + " remix").slice(0, 40);
    ui.editor.selected = 0;
    ui.editor.persist();
    ui.navigate("editor");
  }
  if (action === "community-like") {
    if (!ui.cloud.session) {
      ui.action("account");
      return;
    }
    const result = await ui.cloud.call("like_map", { id: map.id, liked: !map.liked });
    Object.assign(map, result);
    await loadCommunity(ui);
  }
  if (action === "community-unpublish") {
    await ui.cloud.call("unpublish_map", { id: map.id });
    ui.toast("Map unpublished. Your editor saves are unchanged.");
    await loadCommunity(ui);
  }
}
