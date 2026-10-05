import { page, button, esc } from "./views.js";
import { icon } from "./icons.js";
import { requireEditor } from "./equipment.js";
import { encodeMap, decodeMap, shareLink, copyText } from "./map-share.js";

// Course Studio: the shared shell for the golf-hole and mini-golf editors. Subclasses
// provide the canvas drawing, hit-testing and mode-specific panels; this class owns
// history, persistence, templates, previews, saving and sharing.
const TOOL_ICONS = {
  select: "M5 3l13 8-6 1.5L9.5 19Z",
  point: "M12 5v14M5 12h14",
  pond: "M3 14c3-3 6 3 9 0s6 3 9 0M3 9c3-3 6 3 9 0s6 3 9 0",
  bunker: "M3 16c4-5 14-5 18 0ZM8 12l1-2m4 1 1-2",
  challenge: "m12 3 2.6 5.8 6.4.7-4.8 4.3 1.3 6.2L12 16.9 6.5 20l1.3-6.2L3 9.5l6.4-.7Z",
};
const toolIcon = (name) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${TOOL_ICONS[name]}"/></svg>`;

export function hashText(text) {
  let n = 2166136261;
  for (let i = 0; i < text.length; i++) n = Math.imul(n ^ text.charCodeAt(i), 16777619);
  return (n >>> 0).toString(36);
}

export class CourseStudio {
  constructor(ui, cfg) {
    this.ui = ui;
    this.cfg = cfg;
    this.draft = cfg.fresh();
    this.undo = [];
    this.redo = [];
    this.saved = [];
    this.sel = { kind: "point", i: 0 };
    this.tool = "select";
    this.tab = "setup";
    this.showTrees = true;
    try {
      const saved = JSON.parse(localStorage.getItem(cfg.savedKey) || "[]");
      this.saved = Array.isArray(saved) ? saved.map((m) => cfg.validate(m)) : [];
      const draft = localStorage.getItem(cfg.draftKey);
      if (draft) this.draft = cfg.validate(JSON.parse(draft));
    } catch {}
    document.addEventListener("change", (e) => this.change(e));
    document.addEventListener("keydown", (e) => this.shortcut(e));
  }
  get active() {
    return this.ui.screen === "editor" && this.ui.editor === this && this.ui.game.state === "menu";
  }
  get selected() {
    return this.sel?.kind === "point" ? this.sel.i : 0;
  }
  set selected(i) {
    this.sel = { kind: "point", i };
  }
  remember() {
    this.undo.push(JSON.stringify(this.draft));
    if (this.undo.length > 60) this.undo.shift();
    this.redo = [];
  }
  persist() {
    try {
      localStorage.setItem(this.cfg.draftKey, JSON.stringify(this.draft));
    } catch {
      this.ui.toast("Your draft couldn’t be saved on this device. Export a copy to keep it.");
    }
  }
  storeSaved() {
    try {
      localStorage.setItem(this.cfg.savedKey, JSON.stringify(this.saved));
    } catch {
      this.ui.toast("This device is out of storage. Export your map to keep a copy.");
    }
  }
  // Apply a change; invalid results are rolled back with a clear message.
  edit(fn, { quiet = false } = {}) {
    requireEditor(this.ui.progress);
    const old = JSON.stringify(this.draft);
    try {
      fn(this.draft);
      this.draft = this.cfg.validate(this.draft);
      if (JSON.stringify(this.draft) !== old) {
        this.undo.push(old);
        if (this.undo.length > 60) this.undo.shift();
        this.redo = [];
        this.persist();
      }
      this.problem = null;
    } catch (e) {
      this.draft = JSON.parse(old);
      this.problem = e.message;
      if (!quiet) this.ui.toast(e.message);
    }
    this.fixSelection();
    this.ui.render();
  }
  fixSelection() {
    const s = this.sel;
    if (!s) return;
    if (s.kind === "point" && s.i >= this.draft.points.length) this.sel = { kind: "point", i: this.draft.points.length - 1 };
    if (s.kind !== "point" && !this.draft[s.key]?.[s.i] && !(s.key && this.draft[s.key] && !Array.isArray(this.draft[s.key]))) this.sel = null;
  }
  status() {
    try {
      this.cfg.validate(this.draft);
      return { ok: true, text: this.problem ? "Change reverted: " + this.problem : "Ready to play test, save and share" };
    } catch (e) {
      return { ok: false, text: e.message };
    }
  }
  svgPoint(e) {
    const svg = document.getElementById("studio-svg"),
      p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
    return this.fromSvg(p.x, p.y);
  }
  previewKey() {
    return "draft-" + this.cfg.mode + "-" + hashText(JSON.stringify(this.draft));
  }

  view() {
    const s = this.status(),
      golf = this.cfg.mode === "golf",
      tools = this.tools();
    const toolbar = `<div class="studio-toolbar" role="toolbar" aria-label="Editing tools"><div class="tool-group">${tools
      .map(([id, label]) => `<button class="pe-tool ${this.tool === id ? "active" : ""}" data-action="editor-tool" data-id="${id}" aria-pressed="${this.tool === id}" title="${label}">${toolIcon(id === "challenge" ? "challenge" : id)}<span>${label}</span></button>`)
      .join("")}</div><div class="tool-group">${button('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h8l4 4v14H6ZM14 3v4h4M12 11v6m-3-3h6"/></svg><span>New</span>', "editor-new", 'title="Start a new map from a template"', "pe-tool")}${button(icon("reset") + "<span>Undo</span>", "editor-undo", `${this.undo.length ? "" : "disabled"} title="Undo (Ctrl+Z)"`, "pe-tool")}${button('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M20 9a8 8 0 1 0 0 8m0-13v6h-6"/></svg><span>Redo</span>', "editor-redo", `${this.redo.length ? "" : "disabled"} title="Redo (Ctrl+Shift+Z)"`, "pe-tool")}${button('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M5 7h14M9 7V4h6v3m-8 0 1 13h8l1-13"/></svg><span>Delete</span>', "editor-remove-selected", `${this.canRemove() ? "" : "disabled"} title="Delete selection (Del)"`, "pe-tool")}</div></div>`;
    const tabs = [
      ["setup", golf ? "Hole setup" : "Course setup"],
      ["features", golf ? "Hazards" : "Challenges"],
      ["share", "Preview & share"],
    ];
    const inspector = `<div class="studio-tabs" role="tablist">${tabs.map(([id, label]) => button(label, "editor-tab", `data-id="${id}" role="tab" aria-selected="${this.tab === id}"`, "studio-tab " + (this.tab === id ? "active" : ""))).join("")}</div><div class="studio-panel">${this.tab === "setup" ? this.setupPanel() : this.tab === "features" ? this.featurePanel() : this.sharePanel()}</div>`;
    return page(
      this.ui,
      "Course studio",
      golf ? "Shape a full-size golf hole, preview it in 3D and share it with a code." : "Draw a mini-golf course, add challenges, preview it in 3D and share it.",
      `<div class="studio"><section class="panel studio-stage">${toolbar}<div class="studio-canvas ${golf ? "is-golf" : "is-mini"}" data-tool="${this.tool}">${this.canvas()}</div><div class="studio-status"><span class="status-pill ${s.ok && !this.problem ? "ok" : "warn"}">${icon(s.ok && !this.problem ? "check" : "help")}${esc(s.text)}</span><span class="studio-stats">${this.stats()}</span></div><p class="studio-hint">${this.hint()}</p></section><aside class="panel studio-inspector pe-inspector">${inspector}</aside></div>`,
      `<div class="mode-tabs studio-mode" role="group" aria-label="Editor mode">${button("Golf hole", "editor-mode", `data-id="golf" aria-pressed="${golf}"`, "mode-tab " + (golf ? "active" : ""))}${button("Mini-golf", "editor-mode", `data-id="mini" aria-pressed="${!golf}"`, "mode-tab " + (!golf ? "active" : ""))}</div>`,
    ).replace('class="page"', 'class="page studio-page"');
  }

  sharePanel() {
    const key = this.previewKey(),
      signedIn = !!this.ui.cloud?.session;
    return `<div class="share-preview"><img data-course-preview="custom:${key}" src="${this.ui.world.mapThumbnail(this.draft, key)}" alt="3D preview of ${esc(this.draft.name)}"><span class="badge">3D preview</span></div>${button(icon("play") + "Play test in 3D", "editor-test", "", "button yellow wide")}<div class="studio-actions">${button("Save on this device", "editor-save", "", "button")}${signedIn ? button("Save to account", "editor-cloud", "", "button secondary") : ""}</div><h3 class="studio-subhead">Share</h3><p class="small-note">Anyone with the code or link can open this ${this.cfg.mode === "golf" ? "hole" : "course"} as a practice round.</p><div class="studio-actions">${button("Copy share code", "editor-share-code", "", "button secondary")}${button("Copy link", "editor-share-link", "", "button secondary")}</div><form id="share-code-form" class="code-import"><label>Open a share code<input id="share-code-input" autocomplete="off" spellcheck="false" placeholder="PG1.…"></label><button class="button secondary" type="submit">Open</button></form><div class="studio-actions">${button("Export file", "editor-export", "", "button secondary")}<label class="button secondary file-button">Import file<input id="studio-import" type="file" accept="application/json,.json" hidden></label></div>${button(signedIn ? "Publish to community" : "Sign in to publish", "editor-publish", "", "button wide")}${button("Browse community maps", "community", "", "text-button")}<h3 class="studio-subhead">Your saved ${this.cfg.mode === "golf" ? "holes" : "courses"} <span class="muted">${this.saved.length}</span></h3><div class="saved-list">${
      this.saved
        .map(
          (m, i) =>
            `<div class="saved-row"><div><strong>${esc(m.name)}</strong><small>Par ${m.par}${this.cfg.mode === "golf" ? ` · ${Math.round(-m.points.at(-1)[1])} m` : ` · ${m.points.length} points`}</small></div>${button("Load", "editor-load", `data-index="${i}"`, "text-button")}${button("Delete", "editor-delete-saved", `data-index="${i}" aria-label="Delete ${esc(m.name)}"`, "text-button danger")}</div>`,
        )
        .join("") || '<p class="empty-list">Nothing saved yet. “Save on this device” keeps a copy here.</p>'
    }</div>${button("Start a new " + (this.cfg.mode === "golf" ? "hole" : "course"), "editor-new", "", "button secondary wide")}`;
  }

  templatesDialog() {
    return `<span class="eyebrow">New ${this.cfg.mode === "golf" ? "golf hole" : "mini-golf course"}</span><h2>Start from a template.</h2><p>Every template is fully editable. Your current draft stays in undo history.</p><div class="template-grid">${this.cfg.templates
      .map(
        (t, i) =>
          `<button class="template-card" data-action="editor-template" data-index="${i}"><span class="template-art">${this.miniature(t.map)}</span><strong>${esc(t.name)}</strong><small>${esc(t.note)}</small></button>`,
      )
      .join("")}</div>`;
  }

  shortcut(e) {
    if (!this.active || this.ui.modalRoot.children.length) return;
    if (["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === "z") {
      e.preventDefault();
      this.action(e.shiftKey ? "editor-redo" : "editor-undo");
    } else if (mod && e.key.toLowerCase() === "y") {
      e.preventDefault();
      this.action("editor-redo");
    } else if ((e.key === "Delete" || e.key === "Backspace") && this.canRemove()) {
      e.preventDefault();
      this.action("editor-remove-selected");
    } else if (e.key === "Escape" && this.tool !== "select") {
      this.tool = "select";
      this.ui.render();
    } else if (!mod && ["v", "p"].includes(e.key.toLowerCase())) {
      this.tool = e.key.toLowerCase() === "v" ? "select" : "point";
      this.ui.render();
    }
  }

  bind() {
    const svg = document.getElementById("studio-svg");
    if (!svg) return;
    let drag = null,
      frame = 0;
    svg.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      const hit = e.target.closest("[data-hit]");
      if (hit && this.tool === "select") {
        const [kind, key, i] = hit.dataset.hit.split(":");
        this.sel = kind === "point" ? { kind, i: Number(key) } : { kind, key, i: Number(i) };
        if (!this.draggable(this.sel)) {
          this.ui.render();
          return;
        }
        drag = { before: JSON.stringify(this.draft), handle: hit.dataset.handle === "resize", moved: false };
        svg.setPointerCapture(e.pointerId);
        svg.classList.add("dragging");
        e.preventDefault();
        return;
      }
      if (this.tool === "select") {
        this.sel = null;
        this.ui.render();
        return;
      }
      this.place(this.svgPoint(e));
    });
    svg.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const p = this.svgPoint(e);
      drag.moved = true;
      this.dragTo(this.sel, p, drag.handle);
      if (!frame)
        frame = requestAnimationFrame(() => {
          frame = 0;
          const fresh = document.getElementById("studio-svg");
          if (fresh) fresh.innerHTML = this.canvas(true, true);
        });
    });
    const end = () => {
      if (!drag) return;
      const before = drag.before,
        moved = drag.moved;
      drag = null;
      svg.classList.remove("dragging");
      if (!moved) {
        this.ui.render();
        return;
      }
      try {
        this.draft = this.cfg.validate(this.draft);
        this.undo.push(before);
        this.redo = [];
        this.problem = null;
        this.persist();
      } catch (err) {
        this.draft = JSON.parse(before);
        this.problem = err.message;
        this.ui.toast(err.message);
      }
      this.ui.render();
    };
    svg.addEventListener("pointerup", end);
    svg.addEventListener("pointercancel", end);
    svg.addEventListener("keydown", (e) => {
      const hit = e.target.closest("[data-hit]");
      if (!hit || !e.key.startsWith("Arrow")) return;
      e.preventDefault();
      const [kind, key, i] = hit.dataset.hit.split(":");
      this.sel = kind === "point" ? { kind, i: Number(key) } : { kind, key, i: Number(i) };
      const step = e.shiftKey ? 5 : 1,
        dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      this.edit((d) => this.nudge(d, this.sel, dir, step));
      document.querySelector(`[data-hit="${hit.dataset.hit}"]`)?.focus();
    });
    const form = document.getElementById("share-code-form");
    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      await this.ui.action("editor-open-code");
    });
  }

  async change(e) {
    if (!this.active) return;
    try {
      const field = e.target.dataset.studioField;
      if (field) {
        const value = e.target.type === "text" ? e.target.value : Number(e.target.value);
        this.edit((d) => this.setField(d, field, value));
        return;
      }
      if (e.target.id === "studio-import") {
        const f = e.target.files?.[0];
        if (!f || f.size > 30000) throw Error("Choose a map file smaller than 30 KB.");
        const m = this.cfg.validate(JSON.parse(await f.text()));
        this.sel = { kind: "point", i: 0 };
        this.edit((d) => Object.assign(d, m));
        this.ui.toast("Map imported.");
      }
    } catch (err) {
      this.ui.toast(err.message);
    }
  }
  setField(d, field, value) {
    d[field] = value;
  }

  async action(action, data = {}) {
    requireEditor(this.ui.progress);
    const d = this.draft,
      ui = this.ui;
    switch (action) {
      case "editor-mode": {
        ui.mode = data.id === "mini" ? "mini" : "golf";
        ui.editor = ui.mode === "golf" ? ui.golfEditor : ui.miniEditor;
        ui.render();
        return;
      }
      case "editor-tool":
        this.tool = data.id;
        if (data.id === "challenge" || data.id === "pond" || data.id === "bunker") this.tab = "features";
        ui.render();
        return;
      case "editor-tab":
        this.tab = data.id;
        ui.render();
        return;
      case "editor-undo":
      case "editor-redo": {
        const source = action === "editor-undo" ? this.undo : this.redo,
          target = action === "editor-undo" ? this.redo : this.undo;
        if (!source.length) return;
        target.push(JSON.stringify(d));
        this.draft = JSON.parse(source.pop());
        this.problem = null;
        this.fixSelection();
        this.persist();
        ui.render();
        return;
      }
      case "editor-select": {
        const [kind, key, i] = String(data.id).split(":");
        this.sel = kind === "point" ? { kind, i: Number(key) } : { kind, key, i: Number(i) };
        this.tool = "select";
        ui.render();
        return;
      }
      case "editor-remove-selected":
        if (!this.canRemove()) return;
        this.edit((draft) => this.removeSelection(draft));
        this.sel = null;
        ui.render();
        return;
      case "editor-remove":
        this.edit((draft) => this.removeFeature(draft, data.id, Number(data.index)));
        return;
      case "editor-par":
        this.edit((draft) => (draft.par = this.suggestPar()));
        return;
      case "editor-new":
        ui.modal(this.templatesDialog(), { wide: true });
        return;
      case "editor-template": {
        const t = this.cfg.templates[Number(data.index)];
        if (!t) return;
        ui.closeModal();
        this.sel = { kind: "point", i: 0 };
        this.edit((draft) => {
          for (const k of Object.keys(draft)) delete draft[k];
          Object.assign(draft, structuredClone(t.map));
        });
        ui.toast(`Started from “${t.name}”.`);
        return;
      }
      case "editor-test":
        ui.world.equip(ui.progress.data.equipment, ui.items);
        ui.audio.start();
        ui.game.start(0, true, { mode: this.cfg.mode, customHole: this.cfg.build(d) });
        return;
      case "editor-save": {
        const i = this.saved.findIndex((m) => m.name === d.name);
        if (i < 0) this.saved.push(structuredClone(d));
        else this.saved[i] = structuredClone(d);
        this.storeSaved();
        ui.toast(i < 0 ? "Saved on this device." : "Updated your saved copy.");
        ui.render();
        return;
      }
      case "editor-load": {
        const m = this.saved[Number(data.index)];
        if (!m) return;
        this.sel = { kind: "point", i: 0 };
        this.edit((draft) => {
          for (const k of Object.keys(draft)) delete draft[k];
          Object.assign(draft, structuredClone(m));
        });
        ui.toast(`Loaded “${m.name}”.`);
        return;
      }
      case "editor-delete-saved": {
        const i = Number(data.index),
          m = this.saved[i];
        if (!m) return;
        if (!this.confirmDelete || this.confirmDelete !== i) {
          this.confirmDelete = i;
          ui.toast(`Press Delete again to remove “${m.name}” from this device.`);
          setTimeout(() => (this.confirmDelete = null), 4000);
          return;
        }
        this.confirmDelete = null;
        this.saved.splice(i, 1);
        this.storeSaved();
        ui.toast(`Removed “${m.name}”. Account and community copies are unchanged.`);
        ui.render();
        return;
      }
      case "editor-export": {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: "application/json" }));
        a.download = (d.name.replace(/[^a-z0-9_-]+/gi, "-") || "polygolf-map") + ".json";
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        return;
      }
      case "editor-share-code":
        await copyText(ui, await encodeMap(d), "Share code copied.");
        return;
      case "editor-share-link":
        await copyText(ui, shareLink(await encodeMap(d)), "Share link copied.");
        return;
      case "editor-open-code": {
        const input = document.getElementById("share-code-input"),
          map = await decodeMap(input?.value);
        if ((map.mode === "golf") !== (this.cfg.mode === "golf")) {
          const other = map.mode === "golf" ? ui.golfEditor : ui.miniEditor;
          ui.mode = map.mode === "golf" ? "golf" : "mini";
          ui.editor = other;
          return other.action("editor-open-map", { map });
        }
        return this.action("editor-open-map", { map });
      }
      case "editor-open-map":
        this.sel = { kind: "point", i: 0 };
        this.edit((draft) => {
          for (const k of Object.keys(draft)) delete draft[k];
          Object.assign(draft, structuredClone(data.map));
        });
        ui.toast(`Opened “${data.map.name}”.`);
        return;
      case "editor-publish": {
        if (!ui.cloud.session) {
          ui.action("account");
          return;
        }
        if (this.publishing) return;
        this.publishing = true;
        try {
          this.cfg.validate(d);
          await ui.cloud.call("publish_map", { map: d });
          ui.toast("Published. Golfers can now play and like it.");
          ui.navigate("community");
        } finally {
          this.publishing = false;
        }
        return;
      }
      case "editor-cloud":
        await ui.cloud.call("save_map", { map: d });
        ui.toast("Saved to your account.");
        return;
      case "editor-trees":
        this.showTrees = !this.showTrees;
        ui.render();
        return;
      default:
        return this.modeAction(action, data);
    }
  }
}

export function range(label, field, value, min, max, step, format = (v) => v) {
  return `<label class="studio-range">${label}<span><input type="range" data-studio-field="${field}" min="${min}" max="${max}" step="${step}" value="${value}"><output>${format(value)}</output></span></label>`;
}
