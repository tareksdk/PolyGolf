import * as THREE from "../vendor/three.module.js";
import { applyFinish } from './finish-material.js';

// Low-poly club models shared by shop thumbnails, the caddie stage and the golfer's hands.
// Model space: the shaft runs along +Y, the grip ends near y = 1.6 and the striking area
// sits around (0.25, -1, 0). The toe points +X and the face looks toward -Z.
// Shapes are purely visual; distance and mini-golf effects come from equipment rules.
export const CLUB_SHAPES = ["driver", "putter", "iron", "hockey", "oar", "bat", "rocket", "baguette", "candycane", "flamingo", "umbrella", "broom", "lollipop", "pan"];

export function trimClubCache(cache) {
  // Thousands of collectible patterns must not become thousands of GPU materials.
  while (cache.size > 16) {
    const key = cache.keys().next().value, model = cache.get(key);
    model.traverse(mesh => { if (mesh.userData.finishMaterial) mesh.material.dispose(); });
    cache.delete(key);
  }
}

const geo = (w, key, make) => (w.geometries["club:" + key] ??= make());
const shapeScale = { driver: 1.05, putter: 1.15, iron: 1.1 };

export function clubShape(item) {
  return item?.shape || (item?.category === "driver" ? "driver" : "putter");
}

export function buildClub(w, item, parent, { lie = 0, gameplay = false } = {}) {
  const root = new THREE.Group(),
    head = new THREE.Group();
  root.name = "club-model";
  // Keep the grip-to-head length while bringing head widths and grip diameters
  // into proportion with the 1.8 m golfer. The display model stays easy to inspect.
  if (gameplay) root.scale.set(0.48, 1, 0.48);
  head.position.set(0, -1, 0);
  head.rotation.z = lie;
  head.scale.setScalar(shapeScale[clubShape(item)] ?? 1.25);
  root.add(head);
  parent.add(root);
  const shape = clubShape(item),
    d = item?.design || 0,
    color = item?.color || "#7a8477",
    accent = item?.pattern || "#e9dcb7",
    metal = { metalness: 0.22, roughness: 0.64, flatShading: true },
    m = (g, c, x, y, z, sx = 1, sy = 1, sz = 1, p = root, extra = {}) => w.mesh(g, c, x, y, z, sx, sy, sz, p, { ...extra, roughness: Math.max(0.62, extra.roughness || 0.78), metalness: Math.min(0.25, extra.metalness || 0), flatShading: true }),
    rod = (a, b, r, c, p = root, extra = {}, g = "cylinder") => {
      const from = new THREE.Vector3(...a),
        to = new THREE.Vector3(...b),
        dir = to.clone().sub(from),
        mesh = m(g, c, 0, 0, 0, r, dir.length(), r, p, extra);
      mesh.position.copy(from).addScaledVector(dir, 0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      return mesh;
    };
  const taper = geo(w, "taper", () => new THREE.CylinderGeometry(1, 0.72, 1, 10)),
    gripGeo = geo(w, "grip", () => new THREE.CylinderGeometry(1, 0.84, 1, 12));
  const steelShaft = (from = -0.93, to = 1.55, c = "#c6cdc9") => {
    const s = m(taper, c, 0, (from + to) / 2, 0, 0.034, to - from, 0.034, root, metal);
    m("cylinder", "#1f2a24", 0, from + 0.03, 0, 0.044, 0.08, 0.044); // ferrule
    return s;
  };
  const grip = (c = "#2f4037", wrap = accent, top = 1.6) => {
    m(gripGeo, c, 0, top - 0.33, 0, 0.074, 0.66, 0.074);
    for (let i = 0; i < 6; i++) {
      const radius = 0.074 * (0.84 + 0.16 * (0.06 + i * 0.1) / 0.66) + 0.002;
      m("cylinder", wrap, 0, top - 0.6 + i * 0.1, 0, radius, 0.012, radius);
    }
    m("round", c, 0, top, 0, 0.068, 0.03, 0.068);
  };

  if (shape === "driver") {
    steelShaft();
    grip();
    // A single bevelled shell with a planar face: all inserts lie on real surfaces.
    const body = geo(w, 'driver-shell', () => {
      const s = new THREE.Shape();
      s.moveTo(-0.36, -0.15); s.lineTo(0.36, -0.15); s.lineTo(0.43, -0.05);
      s.lineTo(0.4, 0.11); s.lineTo(0.29, 0.19); s.lineTo(-0.24, 0.19);
      s.lineTo(-0.38, 0.1); s.closePath();
      const g = new THREE.ExtrudeGeometry(s, { depth: 0.52, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.028, bevelSegments: 1, steps: 1, curveSegments: 1 });
      return g.translate(0, 0, -0.28);
    });
    m(body, color, 0.3, 0, 0, 1, 1, 1, head, metal);
    m('box', '#b9c2bf', 0.3, 0.01, -0.318, 0.61, 0.20, 0.012, head, metal);
    for (let i = 0; i < 4; i++) m('box', '#56635e', 0.3, -0.06 + i * 0.047, -0.325, 0.49, 0.007, 0.003, head);
    m('box', accent, 0.3, 0.224, -0.01, 0.027, 0.009, 0.28, head);
    m('box', '#34443d', 0.3, -0.184, 0.02, 0.42, 0.008, 0.28, head);
    rod([0, 0.02, 0], [0, 0.22, 0], 0.045, color, head, metal);
  } else if (shape === "putter") {
    steelShaft(-0.8);
    grip("#34463c");
    const style = d % 4,
      mallet = style !== 0;
    rod([0, 0.2, 0], [0.06, 0.08, -0.02], 0.028, "#c6cdc9", head, metal);
    m("box", "#c6cdc9", 0.08, 0.08, -0.03, 0.12, 0.05, 0.05, head, metal);
    if (style === 2) {
      m("cylinder", color, 0.28, 0, 0.1, 0.36, 0.2, 0.36, head, { metalness: 0.45, roughness: 0.3 });
      m("box", color, 0.28, 0, -0.12, 0.72, 0.2, 0.2, head, { metalness: 0.45, roughness: 0.3 });
    } else m("box", color, 0.28, 0, mallet ? 0.1 : 0, 0.82, 0.2, mallet ? 0.46 : 0.2, head, { metalness: 0.45, roughness: 0.3 });
    m("box", accent, 0.28, 0, style === 2 ? -0.265 : mallet ? -0.14 : -0.11, style === 2 ? 0.48 : 0.72, 0.13, 0.018, head);
    m("box", "#f5efd9", 0.28, 0.105, mallet ? 0.05 : 0, 0.02, 0.01, mallet ? 0.36 : 0.16, head);
    if (style === 1) for (const x of [-0.08, 0.64]) m("box", color, x, 0, 0.3, 0.16, 0.2, 0.34, head, { metalness: 0.45, roughness: 0.3 });
    if (style === 3) for (const x of [0.05, 0.51]) m("box", accent, x, 0.105, 0.08, 0.05, 0.012, 0.28, head);
  } else if (shape === "iron") {
    steelShaft();
    grip();
    const blade = m("box", "#c3cac6", 0.26, 0.04, 0, 0.56, 0.26, 0.07, head, metal);
    blade.rotation.y = 0.08;
    for (let i = 0; i < 5; i++) m("box", "#8f9893", 0.26, -0.04 + i * 0.04, -0.038, 0.44, 0.008, 0.008, head);
    m("box", color, 0.3, 0.02, 0.04, 0.36, 0.12, 0.02, head);
    rod([0.02, 0.18, 0], [0.04, 0.02, 0], 0.035, "#c3cac6", head, metal);
  } else if (shape === "hockey") {
    m("box", color, 0, 0.3, 0, 0.085, 2.5, 0.058);
    m("box", accent, 0, 1.4, 0, 0.096, 0.36, 0.068);
    m("box", "#1f1f22", 0, 1.6, 0, 0.1, 0.06, 0.072);
    m("box", accent, 0, 0.35, 0, 0.088, 0.28, 0.061);
    const heel = m("box", color, 0.05, 0.1, 0, 0.1, 0.28, 0.058, head);
    heel.rotation.z = 0.55;
    const blade = new THREE.Group();
    blade.position.set(0.1, 0.02, 0);
    head.add(blade);
    m("box", color, 0.2, 0, 0, 0.42, 0.2, 0.052, blade);
    const toe = m("box", color, 0.58, 0.01, -0.035, 0.38, 0.2, 0.052, blade);
    toe.rotation.y = 0.22;
    for (let i = 0; i < 6; i++) {
      const wrap = m("box", i % 2 ? accent : "#f4f1e8", 0.08 + i * 0.1, 0, 0, 0.045, 0.21, 0.058, blade);
      wrap.rotation.z = 0.12;
    }
  } else if (shape === "oar") {
    rod([0, -0.02, 0], [0, 1.58, 0], 0.045, "#caa370");
    m("cylinder", "#7d5a3c", 0, 1.43, 0, 0.055, 0.34, 0.055);
    m("cylinder", accent, 0, 0.55, 0, 0.056, 0.12, 0.056);
    m("round", color, 0.02, 0.48, 0, 0.19, 0.52, 0.045, head);
    m("round", accent, 0.02, 0.08, 0, 0.17, 0.12, 0.047, head);
    m("box", "#caa370", 0.02, 0.62, 0, 0.03, 0.62, 0.05, head);
  } else if (shape === "bat") {
    const lathe = geo(
      w,
      "bat",
      () =>
        new THREE.LatheGeometry(
          [
            [0, -1.03],
            [0.07, -1.02],
            [0.112, -0.96],
            [0.118, -0.8],
            [0.1, -0.3],
            [0.062, 0.3],
            [0.043, 0.9],
            [0.04, 1.48],
            [0.078, 1.53],
            [0.074, 1.6],
            [0, 1.61],
          ].map(([r, y]) => new THREE.Vector2(r, y)),
          12,
        ),
    );
    m(lathe, color, 0, 0, 0, 1, 1, 1, root, { roughness: 0.55 });
    for (let i = 0; i < 5; i++) {
      const tape = m("cylinder", accent, 0, 1.0 + i * 0.09, 0, 0.047, 0.05, 0.047);
      tape.rotation.z = 0.25;
    }
    m("box", accent, 0, -0.55, -0.1, 0.05, 0.22, 0.02);
  } else if (shape === "rocket") {
    steelShaft(-0.86);
    grip("#2a3440", accent);
    const body = m("cylinder", color, 0.32, 0.06, 0, 0.17, 0.52, 0.17, head, { metalness: 0.2, roughness: 0.4 });
    body.rotation.z = Math.PI / 2;
    const nose = m("cone", accent, 0.73, 0.06, 0, 0.17, 0.32, 0.17, head);
    nose.rotation.z = -Math.PI / 2;
    const exhaust = m("cylinder", "#4a5058", 0.03, 0.06, 0, 0.12, 0.1, 0.12, head, { metalness: 0.6, roughness: 0.3 });
    exhaust.rotation.z = Math.PI / 2;
    const flame = m("cone", "#f6b44b", -0.1, 0.06, 0, 0.08, 0.2, 0.08, head, { emissive: "#f08a3c", emissiveIntensity: 0.8 });
    flame.rotation.z = Math.PI / 2;
    for (let i = 0; i < 3; i++) {
      const fin = new THREE.Group();
      fin.position.set(0.13, 0.06, 0);
      fin.rotation.x = (i * Math.PI * 2) / 3;
      head.add(fin);
      m("box", accent, 0, 0.2, 0, 0.18, 0.14, 0.02, fin);
    }
    m("round", "#9fd8ea", 0.38, 0.1, -0.165, 0.065, 0.065, 0.02, head, { emissive: "#5cb8d8", emissiveIntensity: 0.25 });
    m("cylinder", accent, 0.2, 0.06, 0, 0.175, 0.03, 0.175, head).rotation.z = Math.PI / 2;
  } else if (shape === "baguette") {
    steelShaft(-0.9, 1.55, "#c9a36e");
    grip("#6d4a2f", "#e8d3a6");
    const capsule = geo(w, "capsule", () => new THREE.CapsuleGeometry(1, 3.2, 4, 10));
    const loaf = m(capsule, color, 0.32, 0.05, 0.02, 0.13, 0.13, 0.13, head, { roughness: 0.75 });
    loaf.rotation.z = Math.PI / 2;
    for (let i = 0; i < 4; i++) {
      const cut = m("box", accent, 0.12 + i * 0.13, 0.17, 0.02, 0.11, 0.02, 0.05, head);
      cut.rotation.y = 0.7;
    }
  } else if (shape === "candycane") {
    const base = item?.base || "#fbf6ee";
    m("cylinder", base, 0, 0.4, 0, 0.058, 2.4, 0.058);
    for (let y = -0.72; y < 1.56; y += 0.14) {
      const stripe = m("cylinder", color, 0, y, 0, 0.061, 0.045, 0.061);
      stripe.rotation.z = 0.42;
    }
    m("round", base, 0, 1.6, 0, 0.058, 0.03, 0.058);
    const hook = geo(w, "hook", () => new THREE.TorusGeometry(0.2, 0.058, 8, 18, Math.PI));
    const curve = m(hook, base, 0.2, 0.2, 0, 1, 1, 1, head);
    curve.rotation.z = Math.PI;
    for (let i = 1; i < 7; i++) {
      const a = Math.PI + (i / 7) * Math.PI,
        band = m("cylinder", color, 0.2 + Math.cos(a) * 0.2, 0.2 + Math.sin(a) * 0.2, 0, 0.061, 0.045, 0.061, head);
      band.rotation.z = a + 0.3;
    }
    m("cylinder", base, 0.4, 0.26, 0, 0.058, 0.12, 0.058, head);
    m("round", base, 0.4, 0.32, 0, 0.058, 0.03, 0.058, head);
  } else if (shape === "flamingo") {
    const pink = color,
      deep = "#d9687f";
    m("round", pink, 0.02, 1.36, 0, 0.26, 0.15, 0.14);
    m("round", deep, 0.04, 1.39, -0.09, 0.18, 0.08, 0.05);
    const tail = m("cone", deep, -0.26, 1.4, 0, 0.07, 0.16, 0.07);
    tail.rotation.z = Math.PI / 2.4;
    for (const z of [-0.04, 0.04]) {
      rod([0.05, 1.46, z], [0.02, 1.72, z], 0.016, "#e98fa0");
      m("box", "#e98fa0", 0.05, 1.73, z, 0.08, 0.02, 0.04);
    }
    rod([0.02, 1.26, 0], [0.08, 0.3, 0], 0.04, pink);
    rod([0.08, 0.3, 0], [0.02, -0.82, 0], 0.036, pink);
    m("round", pink, 0.06, 0.1, 0, 0.1, 0.1, 0.1, head);
    const beak = m("cone", "#f3e7d3", 0.25, 0.04, 0, 0.055, 0.24, 0.055, head);
    beak.rotation.z = -Math.PI / 2 - 0.25;
    const tip = m("cone", accent, 0.37, 0.005, 0, 0.03, 0.08, 0.03, head);
    tip.rotation.z = -Math.PI / 2 - 0.25;
    m("round", "#1f1f22", 0.1, 0.15, -0.08, 0.018, 0.018, 0.018, head);
  } else if (shape === "umbrella") {
    const handle = geo(w, "handle", () => new THREE.TorusGeometry(0.12, 0.034, 8, 14, Math.PI));
    m(handle, "#8a5a3a", 0.12, 1.5, 0, 1, 1, 1);
    m("cylinder", "#8a5a3a", 0.24, 1.44, 0, 0.034, 0.12, 0.034);
    m("round", "#8a5a3a", 0.24, 1.38, 0, 0.034, 0.02, 0.034);
    m("cylinder", "#c6cdc9", 0, 0.35, 0, 0.02, 2.3, 0.02, root, metal);
    const canopy = geo(
      w,
      "canopy",
      () =>
        new THREE.LatheGeometry(
          [
            [0.02, -0.82],
            [0.05, -0.62],
            [0.1, -0.2],
            [0.1, 0.2],
            [0.06, 0.62],
            [0.028, 0.86],
          ].map(([r, y]) => new THREE.Vector2(r, y)),
          8,
        ),
    );
    m(canopy, color, 0, 0.05, 0, 1, 1, 1, root, { flatShading: true });
    m("cylinder", accent, 0, 0.4, 0, 0.104, 0.07, 0.104);
    m("round", accent, 0.1, 0.4, -0.04, 0.03, 0.03, 0.03);
    m("cylinder", "#c6cdc9", 0, 0.08, 0, 0.02, 0.1, 0.02, head, metal);
    m("round", "#c6cdc9", 0, 0.02, 0, 0.03, 0.03, 0.03, head, metal);
  } else if (shape === "broom") {
    rod([0, -0.7, 0], [0, 1.58, 0], 0.036, accent);
    m("round", "#c85a4a", 0, 1.6, 0, 0.045, 0.03, 0.045);
    const flare = geo(w, "flare", () => {
      const g = new THREE.BoxGeometry(1, 1, 1, 2, 1, 1),
        p = g.attributes.position;
      for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setX(i, p.getX(i) * 0.46);
      g.computeVertexNormals();
      return g;
    });
    m(flare, color, 0.12, 0.2, 0, 0.64, 0.42, 0.13, head, { flatShading: true });
    for (const y of [0.34, 0.26]) m("box", "#c85a4a", 0.12, y, 0, 0.36 - (0.34 - y), 0.025, 0.14, head);
    for (let i = 0; i < 7; i++) m("box", "#b28f4a", -0.14 + i * 0.087, 0.07, -0.066, 0.012, 0.16, 0.004, head);
  } else if (shape === "lollipop") {
    rod([0, -0.72, 0], [0, 1.56, 0], 0.03, "#f6efe2");
    m("round", "#f6efe2", 0, 1.57, 0, 0.03, 0.02, 0.03);
    const disc = m("cylinder", color, 0.02, 0.3, 0, 0.3, 0.09, 0.3, head);
    disc.rotation.x = Math.PI / 2;
    const ring = geo(w, "swirl", () => new THREE.TorusGeometry(1, 0.1, 6, 28));
    for (const [r, c] of [
      [0.25, accent],
      [0.17, "#fff8f0"],
      [0.09, accent],
    ])
      for (const z of [-0.047, 0.047]) m(ring, c, 0.02, 0.3, z, r, r, r * 1.2, head);
    m("round", accent, 0.02, 0.3, -0.05, 0.035, 0.035, 0.01, head);
  } else if (shape === "pan") {
    rod([0, -0.33, 0], [0, 0.9, 0], 0.04, color, root, { metalness: 0.45, roughness: 0.4 });
    m("cylinder", "#8a5a3a", 0, 1.22, 0, 0.055, 0.66, 0.055);
    const hang = geo(w, "hang", () => new THREE.TorusGeometry(0.04, 0.012, 6, 12));
    m(hang, "#8a5a3a", 0, 1.6, 0, 1, 1, 1);
    const pan = m("cylinder", color, 0.02, 0.36, 0.02, 0.34, 0.06, 0.34, head, { metalness: 0.45, roughness: 0.4 });
    pan.rotation.x = Math.PI / 2;
    const rim = geo(w, "rim", () => new THREE.TorusGeometry(1, 0.08, 6, 24));
    m(rim, color, 0.02, 0.36, -0.02, 0.34, 0.34, 0.4, head, { metalness: 0.45, roughness: 0.4 });
    m("round", "#fbf8ef", 0.0, 0.34, -0.035, 0.2, 0.16, 0.02, head);
    m("round", accent, 0.03, 0.36, -0.05, 0.075, 0.075, 0.035, head, { emissive: accent, emissiveIntensity: 0.15 });
  }
  if (item?.finish) head.traverse(mesh => {
    if (mesh.isMesh && mesh.material.color.getHexString() === new THREE.Color(color).getHexString()) applyFinish(mesh, item);
  });
  return root;
}

// Places a club model so its striking area sits at `headPoint` and the shaft runs to `grip`.
export function mountClub(group, headPoint, grip, scale) {
  const up = grip.clone().sub(headPoint).normalize(),
    toe = new THREE.Vector3(0, 0, -1).addScaledVector(up, up.z).normalize(),
    face = new THREE.Vector3().crossVectors(toe, up);
  group.matrixAutoUpdate = true;
  group.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(toe, up, face));
  group.scale.setScalar(scale);
  group.position.copy(headPoint).addScaledVector(up, scale);
}
