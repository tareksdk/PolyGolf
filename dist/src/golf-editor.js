import { CourseStudio, range } from "./studio.js";
import { newGolfMap, validateGolfMap, buildGolfMap } from "./golf-maps.js";
import { GOLF_COURSES, fairwayWidth } from "./golf-courses.js";
import { button, esc } from "./views.js";

// Golf holes are drawn sideways: the tee sits on the left and the green on the right.
// Screen x is distance from the tee (-z); screen y is the lateral offset (x).
const TEMPLATES = [
  { name: "Parkland dogleg", note: "Par 4 · 340 m · pond on the left", map: newGolfMap() },
  {
    name: "Lakeside par 3",
    note: "Par 3 · 175 m · water guards the green",
    map: {
      version: 2,
      mode: "golf",
      name: "Lakeside par 3",
      par: 3,
      theme: 0,
      width: 32,
      contour: 0.8,
      density: 0.7,
      points: [
        [0, 0],
        [4, -60],
        [10, -120],
        [6, -175],
      ],
      greenSize: 14,
      water: [{ x: -52, z: -140, rx: 20, rz: 34 }],
      bunkers: [{ x: 32, z: -170, rx: 6, rz: 8 }],
    },
  },
  {
    name: "Clifftop par 5",
    note: "Par 5 · 520 m · Saltwind setting",
    map: {
      version: 2,
      mode: "golf",
      name: "Clifftop par 5",
      par: 5,
      theme: 1,
      width: 40,
      contour: 1.2,
      density: 0.8,
      points: [
        [0, 0],
        [-18, -120],
        [-40, -250],
        [-22, -380],
        [8, -520],
      ],
      greenSize: 16,
      water: [{ x: 45, z: -300, rx: 24, rz: 40 }],
      bunkers: [
        { x: -82, z: -250, rx: 8, rz: 18 },
        { x: 40, z: -500, rx: 8, rz: 10 },
      ],
    },
  },
  {
    name: "Golden corridor",
    note: "Par 4 · 360 m · tight autumn fairway",
    map: {
      version: 2,
      mode: "golf",
      name: "Golden corridor",
      par: 4,
      theme: 2,
      width: 28,
      contour: 1.4,
      density: 1,
      points: [
        [0, 0],
        [6, -110],
        [-6, -230],
        [4, -360],
      ],
      greenSize: 13,
      water: [],
      bunkers: [
        { x: -30, z: -235, rx: 7, rz: 12 },
        { x: 32, z: -250, rx: 7, rz: 12 },
        { x: 28, z: -350, rx: 6, rz: 7 },
      ],
    },
  },
  { name: "Blank fairway", note: "Par 4 · straight · no hazards", map: { ...newGolfMap(), name: "My golf hole", points: [[0, 0], [0, -120], [0, -240], [0, -330]], water: [], bunkers: [] } },
];
export const GOLF_TEMPLATES = TEMPLATES;

const HAZARD = { water: { label: "Pond", fill: "#74afbd", rx: 16, rz: 24, maxRx: 35, maxRz: 55 }, bunkers: { label: "Bunker", fill: "#eddbb4", rx: 6, rz: 9, maxRx: 35, maxRz: 55 } };

export class GolfMapEditor extends CourseStudio {
  constructor(ui) {
    super(ui, {
      mode: "golf",
      fresh: newGolfMap,
      validate: validateGolfMap,
      build: buildGolfMap,
      draftKey: "little-links.golf-draft",
      savedKey: "little-links.golf-maps",
      templates: TEMPLATES,
    });
    document.addEventListener("input", (e) => {
      if (e.target.dataset?.studioField && e.target.type === "range" && this.active) {
        const out = e.target.nextElementSibling;
        if (out?.tagName === "OUTPUT") out.textContent = this.format(e.target.dataset.studioField, Number(e.target.value));
      }
    });
  }
  format(field, v) {
    if (field.includes(":")) return Math.round(v) + " m";
    return { width: v + " m", greenSize: v + " m", contour: v.toFixed(1) + "×", density: Math.round(v * 100) + "%" }[field] ?? v;
  }
  tools() {
    return [
      ["select", "Select"],
      ["point", "Add point"],
      ["pond", "Pond"],
      ["bunker", "Bunker"],
    ];
  }
  length(d = this.draft) {
    return Math.round(-d.points.at(-1)[1]);
  }
  suggestPar() {
    const l = this.length();
    return l <= 230 ? 3 : l <= 450 ? 4 : l <= 580 ? 5 : 6;
  }
  stats() {
    const d = this.draft;
    return `<b>${this.length()} m</b> · Par ${d.par}${d.par !== this.suggestPar() ? ` <button class="link-button" data-action="editor-par">suggest par ${this.suggestPar()}</button>` : ""} · ${d.water.length} pond${d.water.length === 1 ? "" : "s"} · ${d.bunkers.length} bunker${d.bunkers.length === 1 ? "" : "s"}`;
  }
  hint() {
    return {
      select: "Drag points, ponds and bunkers. Drag the corner handle to resize a hazard. Arrow keys nudge the selection; Delete removes it.",
      point: "Click on the map to add a fairway point. Points must progress toward the green at least 25 m apart.",
      pond: "Click on the map to place a pond. Hazards must stay clear of the tee, the green and each other.",
      bunker: "Click on the map to place a bunker. Resize it from the Hazards tab or the corner handle.",
    }[this.tool];
  }
  toSvg(x, z) {
    return [-z, x];
  }
  fromSvg(sx, sy) {
    return { x: Math.round(sy), z: Math.round(-sx) };
  }
  canRemove() {
    const s = this.sel;
    return !!s && ((s.kind === "point" && s.i > 0 && this.draft.points.length > 3) || s.kind === "hazard");
  }
  draggable(s) {
    return s.kind === "hazard" || (s.kind === "point" && s.i > 0);
  }
  removeSelection(d) {
    const s = this.sel;
    if (s.kind === "point") d.points.splice(s.i, 1);
    else d[s.key].splice(s.i, 1);
  }
  removeFeature(d, key, i) {
    d[key].splice(i, 1);
  }
  nudge(d, s, [dx, dy], step) {
    if (s.kind === "point") {
      if (!s.i) throw Error("The tee stays at the start of the hole.");
      d.points[s.i][0] += dy * step * 2;
      d.points[s.i][1] -= dx * step * 2;
    } else {
      d[s.key][s.i].x += dy * step * 2;
      d[s.key][s.i].z -= dx * step * 2;
    }
  }
  dragTo(s, p, resize) {
    const d = this.draft;
    if (s.kind === "point") d.points[s.i] = [Math.max(-80, Math.min(80, p.x)), Math.max(-620, Math.min(0, p.z))];
    else {
      const h = d[s.key][s.i];
      if (resize) {
        h.rx = Math.max(3, Math.min(HAZARD[s.key].maxRx, Math.abs(p.x - h.x)));
        h.rz = Math.max(3, Math.min(HAZARD[s.key].maxRz, Math.abs(p.z - h.z)));
      } else Object.assign(h, { x: Math.max(-130, Math.min(130, p.x)), z: Math.min(30, p.z) });
    }
  }
  place(p) {
    if (this.tool === "point") {
      const d = this.draft,
        i = d.points.findIndex((q) => q[1] < p.z);
      if (i <= 0) {
        this.ui.toast("Add points between the tee and the green, or drag the green further out.");
        return;
      }
      this.edit((draft) => draft.points.splice(i, 0, [p.x, p.z]));
      this.sel = { kind: "point", i };
      this.ui.render();
    } else if (this.tool === "pond" || this.tool === "bunker") {
      const key = this.tool === "pond" ? "water" : "bunkers";
      this.edit((draft) => {
        if (draft[key].length >= 8) throw Error("Use at most eight ponds and eight bunkers.");
        draft[key].push({ x: p.x, z: p.z, rx: HAZARD[key].rx, rz: HAZARD[key].rz });
      });
      const i = this.draft[key].length - 1;
      if (this.draft[key][i]?.x === p.x && this.draft[key][i]?.z === p.z) this.sel = { kind: "hazard", key, i };
      this.ui.render();
    }
  }
  setField(d, field, value) {
    if (field.includes(":")) {
      const [key, i, prop] = field.split(":");
      d[key][Number(i)][prop] = value;
    } else d[field] = value;
  }
  modeAction(action, data) {
    if (action === "editor-add-hazard") {
      const key = data.id,
        d = this.draft;
      return this.edit((draft) => {
        let found;
        for (let z = -55; z > d.points.at(-1)[1] + 55 && !found; z -= 40)
          for (const x of [-66, 66, -100, 100]) {
            const candidate = { x, z, rx: HAZARD[key].rx, rz: HAZARD[key].rz };
            try {
              validateGolfMap({ ...draft, [key]: [...draft[key], candidate] });
              found = candidate;
              break;
            } catch {}
          }
        if (!found) throw Error("No clear space for another hazard. Try dragging the fairway or resizing hazards.");
        draft[key].push(found);
        this.sel = { kind: "hazard", key, i: draft[key].length - 1 };
      });
    }
  }

  setupPanel() {
    const d = this.draft;
    return `<label>Hole name<input type="text" data-studio-field="name" maxlength="40" value="${esc(d.name)}"></label><div class="two-cols"><label>Par<select data-studio-field="par">${[3, 4, 5, 6].map((p) => `<option ${p === d.par ? "selected" : ""}>${p}</option>`).join("")}</select></label><label>Setting<select data-studio-field="theme">${GOLF_COURSES.slice(0,3).map((c, i) => `<option value="${i}" ${i === d.theme ? "selected" : ""}>${c.name}</option>`).join("")}</select></label></div>${range("Fairway width", "width", d.width, 24, 56, 1, (v) => v + " m")}${range("Green size", "greenSize", d.greenSize, 11, 22, 1, (v) => v + " m")}${range("Rolling terrain", "contour", d.contour, 0, 2, 0.1, (v) => Number(v).toFixed(1) + "×")}${range("Tree density", "density", d.density, 0, 1, 0.1, (v) => Math.round(v * 100) + "%")}<label class="toggle-row"><span>Show trees on the map</span><input type="checkbox" class="toggle" data-action="editor-trees" ${this.showTrees ? "checked" : ""}></label><p class="small-note">Tree placement, terrain and hazards match the 3D hole exactly. Distances are in metres.</p>`;
  }
  featurePanel() {
    const d = this.draft,
      s = this.sel;
    return `<div class="studio-actions">${button("+ Pond", "editor-add-hazard", 'data-id="water"', "button secondary")}${button("+ Bunker", "editor-add-hazard", 'data-id="bunkers"', "button secondary")}</div><p class="small-note">Or pick the Pond or Bunker tool and click where it should go.</p><div class="feature-list">${["water", "bunkers"]
      .flatMap((key) =>
        d[key].map((h, i) => {
          const active = s?.kind === "hazard" && s.key === key && s.i === i;
          return `<div class="feature-row ${active ? "active" : ""}"><button class="feature-name" data-action="editor-select" data-id="hazard:${key}:${i}"><i style="background:${HAZARD[key].fill}"></i>${HAZARD[key].label} ${i + 1}<small>${Math.round(-h.z)} m out · ${h.x < 0 ? "left" : h.x > 0 ? "right" : "centre"}</small></button>${button("×", "editor-remove", `data-id="${key}" data-index="${i}" aria-label="Remove ${HAZARD[key].label} ${i + 1}"`, "icon-button small")}${active ? range("Width", `${key}:${i}:rx`, h.rx, 3, HAZARD[key].maxRx, 1, (v) => Math.round(v) + " m") + range("Length", `${key}:${i}:rz`, h.rz, 3, HAZARD[key].maxRz, 1, (v) => Math.round(v) + " m") : ""}</div>`;
        }),
      )
      .join("") || '<p class="empty-list">No hazards yet. A pond or bunker near the landing zone makes a hole memorable.</p>'}</div>`;
  }

  miniature(map) {
    const h = buildGolfMap(map),
      len = -map.points.at(-1)[1],
      w = Math.max(360, len + 80),
      path = h.route.map(([x, z], i) => `${i ? "L" : "M"}${-z},${x}`).join(" ");
    return `<svg viewBox="-30 -120 ${w} 240" aria-hidden="true"><rect x="-30" y="-120" width="${w}" height="240" fill="#bfd09e"/><path d="${path}" fill="none" stroke="#9ec36f" stroke-width="${map.width}" stroke-linecap="round" stroke-linejoin="round"/>${[...map.water.map((p) => [p, "#74afbd"]), ...map.bunkers.map((p) => [p, "#eddbb4"])].map(([p, c]) => `<ellipse cx="${-p.z}" cy="${p.x}" rx="${p.rz}" ry="${p.rx}" fill="${c}"/>`).join("")}<ellipse cx="${len}" cy="${map.points.at(-1)[0]}" rx="${map.greenSize * 1.2}" ry="${map.greenSize}" fill="#d3e89c"/></svg>`;
  }

  canvas(inner = false, dragging = false) {
    const d = this.draft;
    let h;
    try {
      h = buildGolfMap(d);
      this.lastBuilt = h;
    } catch {
      h = this.lastBuilt || buildGolfMap(newGolfMap());
    }
    const len = -d.points.at(-1)[1],
      W = Math.max(380, len + 110),
      x0 = -45,
      y0 = -150,
      H = 300,
      s = this.sel;
    let out = `<rect x="${x0}" y="${y0}" width="${W}" height="${H}" fill="#c3d4a2"/>`;
    for (let m = 0; m <= W; m += 50)
      out += `<line x1="${m}" y1="${y0}" x2="${m}" y2="${y0 + H}" stroke="#90a878" stroke-width="${m % 100 ? 0.4 : 0.8}"/>${m % 100 === 0 ? `<text x="${m + 3}" y="${y0 + 11}" class="axis">${m} m</text>` : ""}`;
    for (let y = -100; y <= 100; y += 50) out += `<line x1="${x0}" y1="${y}" x2="${x0 + W}" y2="${y}" stroke="#90a878" stroke-width="0.4"/>`;
    // Fairway outline with the same width profile as the course renderer.
    const sides = [[], []];
    h.route.forEach(([x, z], i) => {
      const prev = h.route[Math.max(0, i - 1)],
        next = h.route[Math.min(h.route.length - 1, i + 1)],
        dx = next[0] - prev[0],
        dz = next[1] - prev[1],
        n = Math.hypot(dx, dz) || 1,
        r = fairwayWidth(h, Math.max(0, Math.min(1, -z / h.length))) / 2;
      sides[0].push([-(z + (dx / n) * r), x - (dz / n) * r]);
      sides[1].push([-(z - (dx / n) * r), x + (dz / n) * r]);
    });
    const outline = [...sides[0], ...sides[1].reverse()].map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("") + "Z";
    out += `<path d="${outline}" fill="#a3c677" stroke="#8fb465" stroke-width="1"/>`;
    if (this.showTrees && !dragging)
      out += `<g class="trees">${h.trees
        .filter((t) => -t.z > x0 && -t.z < x0 + W && t.x > y0 && t.x < y0 + H)
        .map((t) => `<circle cx="${(-t.z).toFixed(1)}" cy="${t.x.toFixed(1)}" r="${(2.3 * t.size).toFixed(1)}" fill="${t.type === "pine" ? "#5b8757" : t.type === "larch" ? "#c79a45" : "#6f9a5c"}"/>`)
        .join("")}</g>`;
    out += `<ellipse cx="${-h.green.z}" cy="${h.green.x}" rx="${h.green.rz}" ry="${h.green.rx}" fill="#d3e89c" stroke="#9cc26c"/>`;
    out += `<rect x="-5" y="-4" width="10" height="8" rx="2" fill="#b7d68c"/>`;
    for (const key of ["water", "bunkers"])
      d[key].forEach((p, i) => {
        const active = s?.kind === "hazard" && s.key === key && s.i === i;
        out += `<g data-hit="hazard:${key}:${i}" class="hazard ${active ? "selected" : ""}" tabindex="0" role="button" aria-label="${HAZARD[key].label} ${i + 1}"><ellipse cx="${-p.z}" cy="${p.x}" rx="${p.rz}" ry="${p.rx}" fill="${HAZARD[key].fill}" stroke="${active ? "#2f5a45" : "#667d5b"}" stroke-width="${active ? 2 : 1}" ${active ? 'stroke-dasharray="5 3"' : ""}/></g>`;
        if (active) out += `<circle data-hit="hazard:${key}:${i}" data-handle="resize" class="resize-handle" cx="${-p.z + p.rz}" cy="${p.x + p.rx}" r="5"/>`;
      });
    // Segment distances between control points.
    for (let i = 1; i < d.points.length; i++) {
      const [ax, az] = d.points[i - 1],
        [bx, bz] = d.points[i],
        dist = Math.round(Math.hypot(bx - ax, bz - az));
      out += `<line x1="${-az}" y1="${ax}" x2="${-bz}" y2="${bx}" stroke="#35584466" stroke-width="1.2" stroke-dasharray="3 4"/><text x="${(-(az + bz) / 2).toFixed(0)}" y="${((ax + bx) / 2 - 9).toFixed(0)}" class="dist">${dist} m</text>`;
    }
    d.points.forEach(([x, z], i) => {
      const active = s?.kind === "point" && s.i === i,
        last = i === d.points.length - 1;
      out += `<g data-hit="point:${i}" class="handle ${active ? "selected" : ""} ${i === 0 ? "fixed" : ""}" tabindex="0" role="button" aria-label="${i === 0 ? "Tee (fixed)" : last ? "Green" : "Fairway point " + i}"><circle cx="${-z}" cy="${x}" r="${i === 0 || last ? 8 : 6.5}"/>${last ? `<path d="M${-z - 1},${x + 3}v-10l7 3-7 3" class="flag"/>` : `<text x="${-z}" y="${x + 3}">${i === 0 ? "T" : i}</text>`}</g>`;
    });
    if (inner) return out;
    return `<svg id="studio-svg" viewBox="${x0} ${y0} ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="application" aria-label="Golf hole editor. Tee on the left, green on the right.">${out}</svg>`;
  }
}
