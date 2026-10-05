import { validateMap, buildMap } from "./maps.js";
import { requireEditor } from "./equipment.js";
import { button, esc } from "./views.js";

// Share codes: "PG1." + base64url(deflate-raw(JSON)). Browsers without compression
// streams fall back to "PG0." + base64url(JSON). Every decoded map is validated with
// the same rules the server uses, so a code can never carry anything a map file couldn't.
const b64 = (bytes) => btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
const unb64 = (text) => {
  const s = text.replaceAll("-", "+").replaceAll("_", "/"),
    bin = atob(s + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};
async function pipe(bytes, stream) {
  const out = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

export async function encodeMap(map) {
  const clean = validateMap(map),
    bytes = new TextEncoder().encode(JSON.stringify(clean));
  if (globalThis.CompressionStream) return "PG1." + b64(await pipe(bytes, new CompressionStream("deflate-raw")));
  return "PG0." + b64(bytes);
}

export async function decodeMap(code) {
  const text = String(code || "")
    .trim()
    .replace(/^.*#map=/, "");
  if (text.length > 20000) throw Error("That share code is too long.");
  const [prefix, body] = text.split(".");
  if (!body || !["PG0", "PG1"].includes(prefix)) throw Error("That doesn’t look like a PolyGolf share code.");
  let bytes;
  try {
    bytes = unb64(body);
    if (prefix === "PG1") {
      if (!globalThis.DecompressionStream) throw Error("This browser can’t open compressed share codes.");
      bytes = await pipe(bytes, new DecompressionStream("deflate-raw"));
    }
  } catch (e) {
    throw Error(e.message?.includes("browser") ? e.message : "That share code is incomplete or damaged.");
  }
  if (bytes.length > 30000) throw Error("That shared map is too large.");
  return validateMap(JSON.parse(new TextDecoder().decode(bytes)));
}

export function shareLink(code) {
  return `${location.origin}${location.pathname}#map=${code}`;
}

export async function copyText(ui, text, label = "Copied to your clipboard.") {
  try {
    await navigator.clipboard.writeText(text);
    ui.toast(label);
  } catch {
    ui.modal(`<h2>Copy this code</h2><p>Your browser blocked automatic copying. Select the text below and copy it.</p><textarea class="share-code-box" readonly rows="4" onfocus="this.select()">${esc(text)}</textarea>`);
  }
}

// Opening a link with #map=… offers to play the shared map as a practice round.
export async function openSharedFromUrl(ui) {
  const hash = location.hash;
  if (!hash.startsWith("#map=")) return;
  history.replaceState(null, "", location.pathname + location.search);
  try {
    const map = await decodeMap(hash);
    ui.sharedMap = map;
    const golf = map.mode === "golf";
    ui.modal(
      `<div class="shared-map"><span class="eyebrow">Shared ${golf ? "golf hole" : "mini-golf course"}</span><h2>${esc(map.name)}</h2><p>Par ${map.par} · ${golf ? `${Math.round(-map.points.at(-1)[1])} m` : `${map.points.length} path points`} · Practice round, no rewards or records.</p><img class="shared-preview" data-course-preview="custom:shared" src="${ui.world.mapThumbnail(map, "shared")}" alt="Preview of ${esc(map.name)}"><div class="modal-actions">${button("Open in editor", "shared-edit", "", "button secondary")}${button("Play it now", "shared-play", "", "button yellow")}</div><p class="small-note">Editing and publishing unlock at player level 10.</p></div>`,
      { wide: true },
    );
  } catch (e) {
    ui.toast(e.message);
  }
}

export function playShared(ui, map) {
  if (ui.cloud.room) throw Error("Leave your multiplayer room before playing a shared map.");
  ui.closeModal();
  ui.world.equip(ui.progress.data.equipment, ui.items);
  ui.audio.start();
  const mode = map.mode === "golf" ? "golf" : "mini";
  if (mode !== ui.mode) ui.selectedCourse = ui.rankingCourse = 0;
  ui.mode = mode;
  ui.game.start(0, true, { mode: ui.mode, customHole: buildMap(map), round: { customOrigin: "shared" } });
}

export function installSharing(ui) {
  const action = ui.action.bind(ui);
  ui.action = async (name, data = {}) => {
    try {
      if (name === "shared-play") {
        if (!ui.sharedMap) return;
        if (ui.game.state !== "menu") {
          ui.closeModal();
          ui.game.leave();
        }
        playShared(ui, ui.sharedMap);
        return;
      }
      if (name === "shared-edit") {
        if (!ui.sharedMap) return;
        requireEditor(ui.progress);
        if (ui.game.state !== "menu") ui.game.leave();
        ui.closeModal();
        const golf = ui.sharedMap.mode === "golf";
        if ((golf ? "golf" : "mini") !== ui.mode) ui.selectedCourse = ui.rankingCourse = 0;
        ui.mode = golf ? "golf" : "mini";
        ui.editor = golf ? ui.golfEditor : ui.miniEditor;
        ui.editor.remember();
        ui.editor.draft = structuredClone(ui.sharedMap);
        ui.editor.selected = 0;
        ui.editor.persist();
        ui.screen = "editor";
        ui.render();
        ui.toast(`Opened “${ui.sharedMap.name}” in the course studio.`);
        return;
      }
    } catch (e) {
      ui.toast(e.message || "Please try again.");
      return;
    }
    return action(name, data);
  };
  addEventListener("hashchange", () => openSharedFromUrl(ui));
  setTimeout(() => openSharedFromUrl(ui), 400);
}
