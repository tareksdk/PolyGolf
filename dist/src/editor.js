import { CourseStudio, range } from "./studio.js";
import { newMap, validateMap, buildMap } from "./maps.js";
import { COURSES, samplePath } from "./courses.js";
import { button, esc } from "./views.js";

// Mini-golf courses live in a 30 × 30 metre plot. Challenges sit along the path and
// can be dragged along it; path points can be dragged anywhere in the plot.
export const CHALLENGES = {
  sand: { label: "Sand strip", color: "#e7cd96", kind: "surface" },
  ice: { label: "Ice strip", color: "#9acdd9", kind: "surface" },
  mud: { label: "Mud strip", color: "#9a815f", kind: "surface" },
  boost: { label: "Boost strip", color: "#ecd368", kind: "surface" },
  jump: { label: "Jump pad", color: "#e8a091", kind: "surface" },
  bumper: { label: "Bumper", color: "#b48d61", kind: "ob" },
  moving: { label: "Moving bumper", color: "#d7816d", kind: "moving" },
  ramp: { label: "Raised ramp", color: "#c9b28a", kind: "ramp" },
  bridge: { label: "Narrow bridge", color: "#e1bb87", kind: "bridge" },
};
const T = (m) => ({ version: 1, surface: [], ob: [], moving: [], ramp: null, bridge: null, ...m });
const TEMPLATES = [
  { name: "Gentle bend", note: "Par 3 · a friendly warm-up", map: newMap() },
  {
    name: "Hairpin",
    note: "Par 3 · a tight U-turn with a boost",
    map: T({ name: "Hairpin", par: 3, theme: 0, width: 4.5, points: [[-6, 12], [-6, -4], [0, -11], [6, -4], [6, 11]], surface: [{ a: 0.42, b: 0.52, type: "boost" }] }),
  },
  {
    name: "Zig-zag gauntlet",
    note: "Par 4 · bumpers and a moving gate",
    map: T({ name: "Zig-zag gauntlet", par: 4, theme: 1, width: 5, points: [[-10, 12], [2, 6], [-8, 0], [4, -6], [-4, -12]], ob: [{ t: 0.3, r: 0.6 }, { t: 0.62, r: 0.6 }], moving: [{ t: 0.46, r: 0.65, speed: 1.2 }] }),
  },
  {
    name: "Frozen crossing",
    note: "Par 3 · ice and a narrow bridge",
    map: T({ name: "Frozen crossing", par: 3, theme: 2, width: 5, points: [[0, 13], [-5, 4], [4, -4], [0, -13]], surface: [{ a: 0.2, b: 0.34, type: "ice" }], bridge: [0.5, 0.64] }),
  },
  {
    name: "Neon jump",
    note: "Par 4 · ramp, jump pad and mud",
    map: T({ name: "Neon jump", par: 4, theme: 3, width: 5.5, points: [[-12, 10], [-4, 10], [2, 2], [8, -4], [10, -12]], surface: [{ a: 0.18, b: 0.26, type: "mud" }, { a: 0.72, b: 0.8, type: "jump" }], ramp: [0.4, 0.58, 1.2] }),
  },
];
export const MINI_TEMPLATES = TEMPLATES;

export class MapEditor extends CourseStudio {
  constructor(ui) {
    super(ui, {
      mode: "mini",
      fresh: newMap,
      validate: validateMap,
      build: buildMap,
      draftKey: "little-links.map-draft",
      savedKey: "little-links.maps",
      templates: TEMPLATES,
    });
    this.challenge = "sand";
    document.addEventListener("input", (e) => {
      if (e.target.dataset?.studioField && e.target.type === "range" && this.active) {
        const out = e.target.nextElementSibling;
        if (out?.tagName === "OUTPUT") out.textContent = this.format(e.target.dataset.studioField, Number(e.target.value));
      }
    });
  }
  format(field, v) {
    if (field.endsWith(":at")) return Math.round(v * 100) + "%";
    return field === "width" ? v + " m" : v;
  }
  tools() {
    return [
      ["select", "Select"],
      ["point", "Add point"],
      ["challenge", "Place " + CHALLENGES[this.challenge].label.toLowerCase()],
    ];
  }
  pathLength(d = this.draft) {
    const s = samplePath(d.points);
    let l = 0;
    for (let i = 1; i < s.length; i++) l += Math.hypot(s[i].x - s[i - 1].x, s[i].z - s[i - 1].z);
    return l;
  }
  challengeCount(d = this.draft) {
    return d.surface.length + d.ob.length + d.moving.length + (d.ramp ? 1 : 0) + (d.bridge ? 1 : 0);
  }
  suggestPar() {
    const l = this.pathLength();
    return Math.min(8, (l < 18 ? 2 : l < 30 ? 3 : l < 42 ? 4 : 5) + (this.challengeCount() >= 3 ? 1 : 0));
  }
  stats() {
    const d = this.draft;
    return `<b>${this.pathLength().toFixed(1)} m</b> · Par ${d.par}${d.par !== this.suggestPar() ? ` <button class="link-button" data-action="editor-par">suggest par ${this.suggestPar()}</button>` : ""} · ${this.challengeCount()} challenge${this.challengeCount() === 1 ? "" : "s"}`;
  }
  hint() {
    return {
      select: "Drag numbered points to reshape the path; drag a challenge marker along the track. Arrow keys nudge; Delete removes.",
      point: "Click near the track to add a path point there. Adjacent points need at least 2 m between them.",
      challenge: `Click on the track to place a ${CHALLENGES[this.challenge].label.toLowerCase()}. Choose other challenges in the Challenges tab.`,
    }[this.tool];
  }
  toSvg(x, z) {
    return [x, z];
  }
  fromSvg(x, z) {
    return { x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10 };
  }
  features(d = this.draft) {
    return [
      ...d.surface.map((f, i) => ({ key: "surface", i, type: f.type, at: (f.a + f.b) / 2 })),
      ...d.ob.map((f, i) => ({ key: "ob", i, type: "bumper", at: f.t })),
      ...d.moving.map((f, i) => ({ key: "moving", i, type: "moving", at: f.t })),
      ...(d.ramp ? [{ key: "ramp", i: 0, type: "ramp", at: (d.ramp[0] + d.ramp[1]) / 2 }] : []),
      ...(d.bridge ? [{ key: "bridge", i: 0, type: "bridge", at: (d.bridge[0] + d.bridge[1]) / 2 }] : []),
    ];
  }
  canRemove() {
    const s = this.sel;
    return !!s && ((s.kind === "point" && this.draft.points.length > 3) || s.kind === "feature");
  }
  draggable() {
    return true;
  }
  removeSelection(d) {
    const s = this.sel;
    if (s.kind === "point") d.points.splice(s.i, 1);
    else this.removeFeature(d, s.key, s.i);
  }
  removeFeature(d, key, i) {
    if (key === "ramp" || key === "bridge") d[key] = null;
    else d[key].splice(i, 1);
  }
  nearestT(p) {
    const samples = samplePath(this.draft.points);
    let best = samples[0],
      dist = Infinity;
    for (const s of samples) {
      const q = Math.hypot(s.x - p.x, s.z - p.z);
      if (q < dist) {
        dist = q;
        best = s;
      }
    }
    return { t: best.t, dist };
  }
  moveFeature(d, key, i, at) {
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    if (key === "surface") {
      const f = d.surface[i],
        half = (f.b - f.a) / 2,
        c = clamp(at, 0.1 + half, 0.8 + half);
      f.a = +(c - half).toFixed(3);
      f.b = +Math.min(0.9, c + half).toFixed(3);
    } else if (key === "ob" || key === "moving") d[key][i].t = +clamp(at, 0.12, 0.85).toFixed(3);
    else {
      const f = d[key],
        half = (f[1] - f[0]) / 2,
        c = clamp(at, 0.1 + half, Math.min(0.9 - half, 0.7 + half));
      f[0] = +(c - half).toFixed(3);
      f[1] = +(c + half).toFixed(3);
    }
  }
  nudge(d, s, [dx, dy], step) {
    if (s.kind === "point") {
      d.points[s.i][0] += dx * 0.5 * step;
      d.points[s.i][1] += dy * 0.5 * step;
    } else {
      const f = this.features(d).find((f) => f.key === s.key && f.i === s.i);
      this.moveFeature(d, s.key, s.i, f.at + (dx || dy) * 0.02 * step);
    }
  }
  dragTo(s, p) {
    const d = this.draft;
    if (s.kind === "point") d.points[s.i] = [Math.max(-15, Math.min(15, p.x)), Math.max(-15, Math.min(15, p.z))];
    else this.moveFeature(d, s.key, s.i, this.nearestT(p).t);
  }
  place(p) {
    const near = this.nearestT(p);
    if (this.tool === "point") {
      const d = this.draft,
        i = Math.min(d.points.length - 1, Math.floor(near.t * (d.points.length - 1)) + 1);
      if (d.points.length >= 16) return this.ui.toast("Use 3–16 path points.");
      this.edit((draft) => draft.points.splice(i, 0, [Math.max(-15, Math.min(15, p.x)), Math.max(-15, Math.min(15, p.z))]));
      this.sel = { kind: "point", i };
      this.ui.render();
      return;
    }
    if (near.dist > this.draft.width / 2 + 1.5) {
      this.ui.toast("Click on the track to place a challenge.");
      return;
    }
    this.addChallenge(this.challenge, near.t);
  }
  addChallenge(type, t) {
    const kind = CHALLENGES[type].kind;
    this.edit((d) => {
      const at = Math.max(0.2, Math.min(0.75, t));
      if (kind === "ob") d.ob.push({ t: at, r: 0.65 });
      else if (kind === "moving") d.moving.push({ t: at, r: 0.65, speed: 1.2 });
      else if (kind === "ramp") d.ramp = [Math.max(0.1, at - 0.12), Math.min(0.9, at + 0.12), 1.2];
      else if (kind === "bridge") d.bridge = [Math.max(0.1, at - 0.08), Math.min(0.9, at + 0.08)];
      else d.surface.push({ a: +(at - 0.06).toFixed(3), b: +(at + 0.06).toFixed(3), type });
    });
    const f = this.features().filter((f) => f.type === type).at(-1);
    if (f) this.sel = { kind: "feature", key: f.key, i: f.i };
    this.ui.render();
  }
  setField(d, field, value) {
    if (field.endsWith(":at")) {
      const [key, i] = field.split(":");
      this.moveFeature(d, key, Number(i), value);
    } else if (field.endsWith(":speed")) d.moving[Number(field.split(":")[1])].speed = value;
    else if (field === "ramp:height") d.ramp[2] = value;
    else d[field] = value;
  }
  modeAction(action, data) {
    if (action === "editor-challenge") {
      this.challenge = data.id;
      this.tool = "challenge";
      this.ui.render();
    }
    if (action === "editor-add-challenge") this.addChallenge(data.id, 0.45);
  }

  setupPanel() {
    const d = this.draft;
    return `<label>Course name<input type="text" data-studio-field="name" maxlength="40" value="${esc(d.name)}"></label><div class="two-cols"><label>Par<select data-studio-field="par">${[2, 3, 4, 5, 6, 7, 8].map((p) => `<option ${p === d.par ? "selected" : ""}>${p}</option>`).join("")}</select></label><label>World<select data-studio-field="theme">${COURSES.map((c, i) => `<option value="${i}" ${d.theme === i ? "selected" : ""}>${c.name}</option>`).join("")}</select></label></div>${range("Track width", "width", d.width, 3, 8, 0.5, (v) => v + " m")}<p class="small-note">The tee sits near the first point and the cup near the last. Scenery is kept clear of the track automatically.</p>`;
  }
  featurePanel() {
    const s = this.sel;
    return `<p class="small-note">Pick a challenge, then click on the track to place it.</p><div class="challenge-palette">${Object.entries(CHALLENGES)
      .map(([id, c]) => `<button class="palette-item ${this.challenge === id && this.tool === "challenge" ? "active" : ""}" data-action="editor-challenge" data-id="${id}"><i style="background:${c.color}"></i>${c.label}</button>`)
      .join("")}</div><div class="feature-list">${
      this.features()
        .map((f) => {
          const active = s?.kind === "feature" && s.key === f.key && s.i === f.i,
            c = CHALLENGES[f.type];
          return `<div class="feature-row ${active ? "active" : ""}"><button class="feature-name" data-action="editor-select" data-id="feature:${f.key}:${f.i}"><i style="background:${c.color}"></i>${c.label}<small>${Math.round(f.at * 100)}% along the path</small></button>${button("×", "editor-remove", `data-id="${f.key}" data-index="${f.i}" aria-label="Remove ${c.label}"`, "icon-button small")}${active ? range("Position", `${f.key}:${f.i}:at`, f.at.toFixed(2), 0.12, 0.85, 0.01, (v) => Math.round(v * 100) + "%") + (f.key === "moving" ? range("Speed", `moving:${f.i}:speed`, this.draft.moving[f.i].speed, 0.2, 3, 0.1) : "") + (f.key === "ramp" ? range("Ramp height", "ramp:height", this.draft.ramp[2], 0.2, 2, 0.1) : "") : ""}</div>`;
        })
        .join("") || '<p class="empty-list">No challenges yet. Add a bumper or a boost strip to make it interesting.</p>'
    }</div>`;
  }

  miniature(map) {
    const h = buildMap(map),
      p = h.samples.map((q, i) => `${i ? "L" : "M"}${q.x.toFixed(1)},${q.z.toFixed(1)}`).join(" ");
    return `<svg viewBox="-17 -17 34 34" aria-hidden="true"><rect x="-17" y="-17" width="34" height="34" fill="${h.course.sky}"/><path d="${p}" fill="none" stroke="${h.course.edge}" stroke-width="${map.width + 0.8}" stroke-linecap="round" stroke-linejoin="round"/><path d="${p}" fill="none" stroke="${h.course.grass}" stroke-width="${map.width}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  canvas(inner = false) {
    const d = this.draft;
    let h;
    try {
      h = buildMap(d);
      this.lastBuilt = h;
    } catch {
      h = this.lastBuilt || buildMap(newMap());
    }
    const s = this.sel,
      c = COURSES[d.theme] || COURSES[0],
      path = (list) => list.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(2)},${p.z.toFixed(2)}`).join(" "),
      span = (a, b) => path(h.samples.filter((p) => p.t >= a && p.t <= b)),
      at = (t) => h.samples[Math.max(0, Math.min(160, Math.round(t * 160)))];
    let out = `<rect x="-16.5" y="-16.5" width="33" height="33" rx="1.2" fill="#cad8b7"/>`;
    for (let g = -15; g <= 15; g += 1) out += `<line x1="${g}" y1="-15" x2="${g}" y2="15" class="grid ${g % 5 ? "" : "major"}"/><line x1="-15" y1="${g}" x2="15" y2="${g}" class="grid ${g % 5 ? "" : "major"}"/>`;
    out += `<rect x="-15" y="-15" width="30" height="30" fill="none" stroke="#7f9870" stroke-width=".12" stroke-dasharray=".5 .4"/>`;
    out += `<path d="${path(h.samples)}" fill="none" stroke="${c.edge}" stroke-width="${d.width + 0.7}" stroke-linejoin="round" stroke-linecap="round"/><path d="${path(h.samples)}" fill="none" stroke="${c.grass}" stroke-width="${d.width}" stroke-linejoin="round" stroke-linecap="round"/>`;
    for (const f of d.surface) out += `<path d="${span(f.a, f.b)}" fill="none" stroke="${CHALLENGES[f.type].color}" stroke-width="${d.width * 0.92}" stroke-linecap="butt"/>`;
    if (d.ramp) out += `<path d="${span(d.ramp[0], d.ramp[1])}" fill="none" stroke="#c9b28a" stroke-width="${d.width * 0.92}" stroke-dasharray=".35 .35"/>`;
    if (d.bridge) out += `<path d="${span(d.bridge[0], d.bridge[1])}" fill="none" stroke="${c.water}" stroke-width="${d.width + 0.6}"/><path d="${span(d.bridge[0], d.bridge[1])}" fill="none" stroke="#e1bb87" stroke-width="${d.width * 0.47}" stroke-dasharray=".3 .12"/>`;
    for (const o of d.ob) {
      const p = at(o.t);
      out += `<circle cx="${p.x}" cy="${p.z}" r="${o.r}" fill="#b48d61" stroke="#7b5d3e" stroke-width=".1"/>`;
    }
    for (const o of d.moving) {
      const p = at(o.t);
      out += `<circle cx="${p.x}" cy="${p.z}" r="${o.r}" fill="#d7816d"/><circle cx="${p.x}" cy="${p.z}" r="${o.r + 0.45}" fill="none" stroke="#d7816d" stroke-width=".1" stroke-dasharray=".3 .25"/>`;
    }
    out += `<circle cx="${h.start.x}" cy="${h.start.z}" r=".6" fill="#f4f8ee" stroke="#355343" stroke-width=".12"/><text x="${h.start.x + 1}" y="${h.start.z + 0.35}" class="tag">TEE</text>`;
    out += `<circle cx="${h.cup.x}" cy="${h.cup.z}" r=".48" fill="#183c32"/><path d="M${h.cup.x},${h.cup.z}v-2.1l1.4.6-1.4.6" fill="#ed8468" stroke="#355343" stroke-width=".08"/><text x="${h.cup.x + 1.6}" y="${h.cup.z - 1.2}" class="tag">CUP</text>`;
    for (const f of this.features(d)) {
      const p = at(f.at),
        active = s?.kind === "feature" && s.key === f.key && s.i === f.i;
      out += `<g data-hit="feature:${f.key}:${f.i}" class="challenge-handle ${active ? "selected" : ""}" tabindex="0" role="button" aria-label="${CHALLENGES[f.type].label}"><rect x="${p.x - 0.36}" y="${p.z - 0.36}" width=".72" height=".72" rx=".16" transform="rotate(45 ${p.x} ${p.z})" fill="${CHALLENGES[f.type].color}"/></g>`;
    }
    d.points.forEach(([x, z], i) => {
      const active = s?.kind === "point" && s.i === i;
      out += `<g data-hit="point:${i}" class="handle mini ${active ? "selected" : ""}" tabindex="0" role="button" aria-label="Path point ${i + 1}"><circle cx="${x}" cy="${z}" r=".85"/><text x="${x}" y="${z + 0.34}">${i + 1}</text></g>`;
    });
    if (inner) return out;
    return `<svg id="studio-svg" viewBox="-16.5 -16.5 33 33" role="application" aria-label="Mini-golf course editor">${out}</svg>`;
  }
}
