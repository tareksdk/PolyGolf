import { renderScale } from './render-quality.js';
import { halloweenActive } from './season.js';
import { ballFinish } from "./item-designs.js";
import { buildClub, trimClubCache } from "./club-models.js";
import { finishItem } from './finishes.js';
import { applyFinish } from './finish-material.js';
import { renderItemArt } from "./item-art.js";
import { buildGolf, batchScenery, coursePreview } from "./landscape.js";
import { terrainHeight, terrainAt } from "./golf-courses.js";
import * as THREE from "../vendor/three.module.js";
import { heightAt, surfaceAt, getHole, COURSES, nearestPoint } from "./courses.js";
const UP = new THREE.Vector3(0, 1, 0);
const SURFACES = { sand: "#e5cd93", ice: "#acdfe8", mud: "#8b7558", boost: "#ead175", jump: "#de9b87" };
export class World {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: false,
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.24;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(39, innerWidth / innerHeight, 0.1, 250);
    this.camera.position.set(34, 31, 40);
    this.look = new THREE.Vector3();
    this.sun = new THREE.DirectionalLight("#fff0d7", 3);
    this.sun.position.set(-15, 30, 15);
    this.sun.castShadow = true;
    Object.assign(this.sun.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 1, far: 85 });
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.03;
    this.hemi = new THREE.HemisphereLight("#e9f8ff", "#789262", 2.3);
    this.scene.add(this.sun, this.hemi);
    this.materials = new Map();
    this.geometries = {
      box: new THREE.BoxGeometry(1, 1, 1),
      sphere: new THREE.IcosahedronGeometry(1, 1),
      round: new THREE.SphereGeometry(1, 24, 16),
      cylinder: new THREE.CylinderGeometry(1, 1, 1, 12),
      cone: new THREE.ConeGeometry(1, 1, 7),
    };
    this.mode = "menu";
    this.orbit = 0.25;
    this.zoom = 20;
    this.clock = 0;
    this.particles = [];
    this.thumbCache = new Map();
    this.itemCache = new Map();
    this.resize();
    window.addEventListener("resize", () => this.resize());
    this.createBall();
    this.createAim();
    this.load(getHole(0, 0));
  }
  mat(color, extra = {}) {
    const key = color + JSON.stringify(extra);
    if (!this.materials.has(key))
      this.materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra }));
    return this.materials.get(key);
  }
  mesh(geo, color, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, parent = this.group, extra = {}) {
    const m = new THREE.Mesh(typeof geo === "string" ? this.geometries[geo] : geo, this.mat(color, extra));
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  resize() {
    if (this.settings) {
      const cap=renderScale(this.settings.graphics,devicePixelRatio,innerWidth,innerHeight);
      this.renderer.setPixelRatio(this.settings.graphics==='high'?cap:Math.min(cap,this.dynamicRatio??cap));
    }
    this.renderer.setSize(innerWidth, innerHeight);
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
  }
  clear() {
    if (!this.group) return;
    this.scene.remove(this.group);
    this.group.traverse((o) => {
      if (o.isInstancedMesh) o.dispose();
      if (o.userData.ownedMaterial) {
        o.material.map?.dispose();
        o.material.dispose();
      }
      if (o.geometry && !o.geometry.userData?.shared && !Object.values(this.geometries).includes(o.geometry)) o.geometry.dispose();
    });
  }
  load(h) {
    if (h.mode === "golf") return buildGolf(this, h);
    this.camera.far = 250;
    this.camera.updateProjectionMatrix();
    this.renderer.toneMappingExposure = 1.24;
    if (this.hemi) this.hemi.intensity = 2.3;
    this.sun.position.set(-15, 30, 15);
    this.sun.target.position.set(0, 0, 0);
    Object.assign(this.sun.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 1, far: 85 });
    this.sun.shadow.camera.updateProjectionMatrix();
    this.clear();
    this.hole = h;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.animations = [];
    const c = h.course;
    this.scene.background = new THREE.Color(c.sky);
    this.scene.fog = new THREE.Fog(c.sky, 65, 155);
    this.sun.intensity = c.theme === "city" ? 1.4 : 3;
    this.mesh(new THREE.CylinderGeometry(22, 19, 4, 18), c.edge, 0, -2.5, 0, 1.2, 1, 1);
    this.mesh(new THREE.CylinderGeometry(22, 22, 0.8, 32), c.grass, 0, -0.48, 0, 1.2, 1, 1);
    this.mesh(
      new THREE.CylinderGeometry(20, 13, 5, 12),
      c.theme === "sky" ? "#e2d4c6" : "#9c8663",
      0,
      -6.3,
      0,
      1.2,
      1,
      1,
    );
    this.mesh(
      new THREE.CylinderGeometry(12, 3, 5, 10),
      c.theme === "sky" ? "#e7dbd3" : "#b49b74",
      0,
      -10.5,
      0,
      1.2,
      1,
      1,
    );
    // Fairway fringe, alternating mown bands and warm wooden bumpers.
    this.ribbon(h, h.width + 0.6, -0.02, ["#639352"]);
    const green =
      c.theme === "forest"
        ? ["#a3cd72", "#99c568"]
        : c.theme === "desert"
          ? ["#d9b578", "#d4ad6d"]
          : c.theme === "snow"
            ? ["#d6eff0", "#cce8eb"]
            : c.theme === "city"
              ? ["#59678f", "#63729a"]
              : ["#b8dca9", "#afd3a0"];
    this.ribbon(h, h.width, 0.04, green, true);
    this.rails(h);
    if (h.shortcut) {
      const m = this.mesh("box", green[0], 0, 0.03, 8, 19, 0.2, 2.9);
      m.rotation.y = 0.05;
      for (let x = -8; x <= 8; x += 2) this.mesh("box", "#ebd4ad", x, 0.08, 8, 0.13, 0.06, 2.8);
    }
    if (h.bridge) {
      const [a, b] = h.bridge;
      for (let i = Math.round(a * 160); i < b * 160; i += 2) {
        const p = h.samples[i],
          q = h.samples[i + 1],
          a2 = Math.atan2(q.z - p.z, q.x - p.x);
        const m = this.mesh("box", "#e1bb87", p.x, heightAt(h, p.t) + 0.09, p.z, 0.35, 0.18, h.width * 0.47);
        m.rotation.y = -a2;
      }
    }
    this.decorate(c, h);
    const cup = h.cup;
    this.mesh(
      new THREE.CylinderGeometry(0.49, 0.43, 0.15, 32),
      "#183c32",
      cup.x,
      heightAt(h, cup.t) + 0.015,
      cup.z,
    );
    this.mesh(
      new THREE.TorusGeometry(0.51, 0.045, 6, 32),
      "#f9e8be",
      cup.x,
      heightAt(h, cup.t) + 0.06,
      cup.z,
    ).rotation.x = Math.PI / 2;
    this.mesh("cylinder", "#f5f0dd", cup.x, heightAt(h, cup.t) + 1.7, cup.z, 0.045, 3.4, 0.045);
    const flag = this.mesh(
      new THREE.PlaneGeometry(1.2, 0.72, 5, 2),
      "#ed8468",
      cup.x + 0.6,
      heightAt(h, cup.t) + 2.85,
      cup.z,
      1,
      1,
      1,
      this.group,
      { side: THREE.DoubleSide },
    );
    this.flag = flag;
    this.mesh(
      new THREE.CircleGeometry(0.72, 32),
      "#deecd0",
      h.start.x,
      heightAt(h, h.start.t) + 0.065,
      h.start.z,
    ).rotation.x = -Math.PI / 2;
    this.obstacleMeshes = [...(h.ob || []), ...(h.moving || [])].map((o, i) => {
      const p = h.samples[Math.round(o.t * 160)];
      return this.mesh(
        "cylinder",
        i < (h.ob || []).length ? "#e1ad78" : c.accent,
        p.x,
        heightAt(h, p.t) + 0.52,
        p.z,
        o.r,
        1.05,
        o.r,
      );
    });
    const coin = h.collectible;
    this.coin = this.mesh(
      new THREE.TorusGeometry(0.33, 0.12, 8, 16),
      "#f5cd61",
      coin.x + Math.min(h.width * 0.24, 1.2),
      heightAt(h, coin.t) + 0.9,
      coin.z,
    );
    this.coin.userData.collected = false;
    this.ball.position.set(h.start.x, 0.24, h.start.z);
    this.previewPosition = new THREE.Vector3(-6, 2.5, 10);
    if(halloweenActive()&&!h.custom){
      const decorations=new THREE.Group();decorations.userData.halloween=true;this.group.add(decorations);
      for(const [x,z,s] of [[-13,14,.5],[-14,14.4,.36],[14,-13,.42]]){
        this.mesh('sphere','#bd702c',x,s*.72,z,s,s*.75,s,decorations);
        this.mesh('cylinder','#536743',x,s*1.55,z,s*.1,s*.27,s*.1,decorations);
      }
    }
    batchScenery(this);
  }
  ribbon(h, width, y, colors, surfaces = false) {
    const pos = [],
      col = [],
      color = new THREE.Color();
    const sides = h.samples.map((p, i) => {
      const a = h.samples[Math.max(0, i - 1)],
        b = h.samples[Math.min(h.samples.length - 1, i + 1)],
        dx = b.x - a.x,
        dz = b.z - a.z,
        len = Math.hypot(dx, dz),
        nx = ((-dz / len) * width) / 2,
        nz = ((dx / len) * width) / 2;
      return [
        [p.x + nx, heightAt(h, p.t) + y, p.z + nz],
        [p.x - nx, heightAt(h, p.t) + y, p.z - nz],
      ];
    });
    for (let i = 0; i < h.samples.length - 1; i++) {
      const p = h.samples[i];
      let c = colors[h.custom ? 0 : Math.floor(i / 10) % colors.length];
      if (surfaces) c = SURFACES[surfaceAt(h, p.t)] || c;
      if (surfaces && h.bridge && p.t > h.bridge[0] && p.t < h.bridge[1]) c = h.course.water;
      color.set(c);
      const verts = [sides[i][0], sides[i + 1][0], sides[i][1], sides[i + 1][1]];
      for (const j of [0, 1, 2, 2, 1, 3]) {
        pos.push(...verts[j]);
        col.push(color.r, color.g, color.b);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, this.mat("#ffffff", { vertexColors: true, side: THREE.DoubleSide }));
    mesh.receiveShadow = true;
    this.group.add(mesh);
  }
  rails(h) {
    // Follow a continuous offset edge. Inner edges buried in another part of a
    // custom path are omitted, matching the physics' union of playable strips.
    const edges = h.samples.map((p, i) => {
      const a = h.samples[Math.max(0, i - 1)],
        b = h.samples[Math.min(h.samples.length - 1, i + 1)],
        dx = b.x - a.x,
        dz = b.z - a.z,
        len = Math.hypot(dx, dz) || 1;
      return [-1, 1].map((sign) => ({
        x: p.x - (((dz / len) * h.width) / 2) * sign,
        z: p.z + (((dx / len) * h.width) / 2) * sign,
        y: heightAt(h, p.t) + 0.24,
      }));
    });
    for (let i = 0; i < edges.length - 1; i++)
      for (let side = 0; side < 2; side++) {
        const p = edges[i][side],
          q = edges[i + 1][side],
          x = (p.x + q.x) / 2,
          z = (p.z + q.z) / 2,
          dx = q.x - p.x,
          dz = q.z - p.z,
          len = Math.hypot(dx, dz);
        if (len < 0.01) continue;
        if (h.custom && [p, q, { x, z }].some((v) => nearestPoint(h, v.x, v.z).distance < h.width / 2 - 0.08))
          continue;
        const m = this.mesh("box", h.course.edge, x, (p.y + q.y) / 2, z, len + 0.025, 0.45, 0.23);
        m.rotation.y = -Math.atan2(dz, dx);
        m.rotation.z = Math.atan2(q.y - p.y, len);
      }
  }

  tree(x, z, s = 1, c) {
    const g = new THREE.Group();
    g.position.set(x, -0.1, z);
    g.scale.setScalar(s);
    this.group.add(g);
    this.mesh("cylinder", "#9c7957", 0, 1, 0, 0.2, 2, 0.2, g);
    if (c.theme === "desert") {
      this.mesh("cylinder", "#829b67", 0, 1.8, 0, 0.4, 3.6, 0.4, g);
      this.mesh("box", "#829b67", 0.6, 2, 0, 1.4, 0.45, 0.5, g);
      this.mesh("cylinder", "#829b67", 1.2, 2.6, 0, 0.25, 1.5, 0.25, g);
    } else if (c.theme === "snow") {
      for (let j = 0; j < 3; j++)
        this.mesh(
          "cone",
          j % 2 ? "#a1c5bd" : "#608e89",
          0,
          2 + j * 0.9,
          0,
          1.3 - j * 0.24,
          2,
          1.3 - j * 0.24,
          g,
        );
      this.mesh("cone", "#edf5ed", 0, 4, 0, 0.78, 1.3, 0.78, g);
    } else {
      const green = c.theme === "sky" ? "#a5bd89" : "#548b53";
      this.mesh("sphere", green, 0, 3, 0, 1.6, 1.9, 1.5, g);
      this.mesh("sphere", c.theme === "sky" ? "#d8bdc9" : "#82ad67", -0.8, 2.9, 0.35, 1.1, 1.25, 1.1, g);
      this.mesh("sphere", c.theme === "sky" ? "#d5c4aa" : "#9cbd73", 0.7, 3.6, -0.2, 1.1, 1.3, 1.1, g);
    }
    return g;
  }
  decorate(c, h) {
    // Deterministic scenery keeps course identity stable between visits.
    const trees = [
      [-17, -8, 1.15],
      [-20, -2, 0.85],
      [-17, 6, 1.3],
      [-14, 13, 0.95],
      [-6, -15, 1.1],
      [-14, -15, 1.25],
      [1, -17, 1],
      [15, -11, 1.1],
      [19, -4, 1.35],
      [18, 6, 0.8],
      [14, 14, 1.1],
      [-2, 17, 0.7],
    ];
    if (c.theme !== "city") for (const [x, z, s] of trees) this.tree(x, z, s, c);
    else
      for (let i = 0; i < 13; i++) {
        const a = (i / 13) * Math.PI * 2,
          x = Math.cos(a) * 20,
          z = Math.sin(a) * 17,
          height = 4 + (i % 4) * 2;
        this.mesh("box", ["#646584", "#787392", "#8c81a2"][i % 3], x, height / 2, z, 2.6, height, 2.3);
        this.mesh("box", i % 2 ? "#eca5d8" : "#83d9cf", x, height + 0.04, z, 2.7, 0.13, 2.4, this.group, {
          emissive: i % 2 ? "#ab6aab" : "#56a39d",
          emissiveIntensity: 0.5,
        });
        for (let j = 1; j < height; j += 1.5) this.mesh("box", "#f0ca91", x, j, z + 1.17, 1.8, 0.18, 0.04);
      }
    for (let i = 0; i < 14; i++) {
      const a = i * 2.4,
        x = Math.cos(a) * (17 + (i % 3)),
        z = Math.sin(a) * (14 + (i % 3));
      this.mesh(
        "sphere",
        c.theme === "snow" ? "#c9dde1" : c.theme === "desert" ? "#b27955" : "#a2b394",
        x,
        0.5,
        z,
        0.6 + (i % 3) * 0.4,
        0.5 + (i % 2) * 0.4,
        0.7,
      );
    }
    // Water basin with ripples and stepping stones, separate from the playing green.
    const pond = this.mesh(new THREE.CircleGeometry(1, 40), c.water, 9, -0.04, 9, 5, 3, 1, this.group, {
      roughness: 0.3,
      metalness: 0.05,
    });
    pond.rotation.x = -Math.PI / 2;
    for (let i = 0; i < 5; i++) {
      const r = this.mesh(
        new THREE.TorusGeometry(1 + i * 0.6, 0.025, 4, 40),
        "#c0e6df",
        9,
        0.015 + i * 0.002,
        9,
        1,
        0.65,
        1,
      );
      r.rotation.x = -Math.PI / 2;
      this.animations.push({ type: "water", mesh: r, phase: i });
    }
    for (let i = 0; i < 5; i++)
      this.mesh("sphere", "#d1c4a0", 5.3 + i * 0.5, 0.05, 6.5 - i * 0.6, 0.45, 0.23, 0.38);
    if (c.theme === "forest" || c.theme === "desert") {
      this.windmill(9, -13, c);
      for (let i = 0; i < 8; i++) {
        this.mesh("cylinder", "#c4aa80", -17 + i * 2, 0.55, 12, 0.08, 1.2, 0.08);
        if (i < 7) this.mesh("box", "#dac295", -16 + i * 2, 0.75, 12, 2, 0.14, 0.12);
      }
    }
    if (c.theme === "snow") {
      const arch = this.mesh(new THREE.TorusGeometry(2.2, 0.5, 5, 12, Math.PI), "#e1f3ee", -14, 0.15, -9);
      arch.rotation.y = 0.5;
    }
    if (c.theme === "desert") {
      const arch = this.mesh(new THREE.TorusGeometry(3, 0.9, 5, 12, Math.PI), "#b97e56", -12, 0.1, -12);
      arch.rotation.y = 0.4;
    }
    if (c.theme === "sky") {
      for (let i = 0; i < 3; i++) {
        this.mesh(new THREE.CylinderGeometry(2.3, 0.5, 3, 7), "#c4b4a5", -26 + i * 27, -3, -13 - i * 4);
        this.mesh("cylinder", c.grass, -26 + i * 27, -1.4, -13 - i * 4, 2.4, 0.3, 2.4);
        this.mesh("box", "#a9dbe8", 22, -4, 2, 1, 8, 0.35, this.group, { transparent: true, opacity: 0.65 });
      }
    }
    // Flowers are instanced, so the little details cost only two draw calls.
    const stem = new THREE.InstancedMesh(this.geometries.cylinder, this.mat("#799155"), 55),
      petals = new THREE.InstancedMesh(
        this.geometries.sphere,
        this.mat(c.theme === "snow" ? "#ffffff" : "#f5df97"),
        55,
      ),
      dummy = new THREE.Object3D();
    for (let i = 0; i < 55; i++) {
      const a = i * 2.399,
        x = Math.cos(a) * (14 + (i % 5) * 1.5),
        z = Math.sin(a) * (12 + (i % 4) * 1.2);
      dummy.position.set(x, 0.13, z);
      dummy.scale.set(0.03, 0.4, 0.03);
      dummy.updateMatrix();
      stem.setMatrixAt(i, dummy.matrix);
      dummy.position.y = 0.34;
      dummy.scale.set(0.13, 0.13, 0.13);
      dummy.updateMatrix();
      petals.setMatrixAt(i, dummy.matrix);
    }
    this.group.add(stem, petals);
    for (let i = 0; i < 9; i++) {
      const cloud = new THREE.Group();
      for (let j = 0; j < 4; j++)
        this.mesh(
          "sphere",
          c.theme === "city" ? "#73758e" : "#f5f6e9",
          j * 1.2,
          Math.sin(j) * 0.35,
          0,
          1.6,
          1,
          1.1,
          cloud,
        );
      cloud.position.set(-35 + i * 9, 7 + (i % 3) * 3, -29 - (i % 2) * 7);
      cloud.scale.setScalar(1.3);
      this.group.add(cloud);
      this.animations.push({ type: "cloud", mesh: cloud, phase: i, base: cloud.position.x });
    }
    for (let i = 0; i < 7; i++) {
      const m = this.mesh(
        "cone",
        c.theme === "desert" ? "#d7ab83" : c.theme === "snow" ? "#b9d5d8" : "#b4cbb2",
        -42 + i * 14,
        -4,
        -45 - (i % 2) * 8,
        8 + (i % 3) * 4,
        16 + (i % 3) * 4,
        7,
      );
      m.castShadow = false;
    }
  }
  windmill(x, z, c) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    this.group.add(g);
    this.mesh(new THREE.CylinderGeometry(0.9, 1.5, 4.4, 8), "#f2e2bf", 0, 2.2, 0, 1, 1, 1, g);
    this.mesh("cone", "#8a7e64", 0, 5, 0, 1.65, 1.8, 1.65, g);
    this.mesh("box", "#7c876c", 0, 0.65, 1.4, 0.65, 1.3, 0.09, g);
    const rotor = new THREE.Group();
    rotor.position.set(0, 3.9, 1.1);
    g.add(rotor);
    for (let i = 0; i < 4; i++) {
      const arm = new THREE.Group();
      arm.rotation.z = (i * Math.PI) / 2;
      rotor.add(arm);
      this.mesh("box", "#f9e8ca", 0, 1.1, 0.05, 0.45, 2.25, 0.1, arm);
      for (let j = 0; j < 5; j++) this.mesh("box", "#b6a07c", 0, 0.3 + j * 0.38, 0.12, 0.6, 0.07, 0.05, arm);
    }
    this.mesh("sphere", "#a8997c", 0, 3.9, 1.24, 0.3, 0.3, 0.2, g);
    this.animations.push({ type: "rotor", mesh: rotor });
  }
  createBall() {
    const golf = new THREE.SphereGeometry(1, 96, 64),
      vertices = golf.attributes.position,
      centers = [];
    for (let i = 0; i < 180; i++) {
      const y = 1 - (i / 179) * 2,
        r = Math.sqrt(1 - y * y),
        a = i * 2.4;
      centers.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
    }
    const v = new THREE.Vector3();
    for (let i = 0; i < vertices.count; i++) {
      v.fromBufferAttribute(vertices, i).normalize();
      let best = 0;
      for (const c of centers) best = Math.max(best, v.dot(c));
      const angle = Math.acos(Math.min(1, best));
      const depression = angle < 0.105 ? 0.018 * Math.pow(1 - (angle / 0.105) ** 2, 2) : 0;
      v.multiplyScalar(1 - depression);
      vertices.setXYZ(i, v.x, v.y, v.z);
    }
    golf.computeVertexNormals();
    this.geometries.golf = golf;
    this.ball = new THREE.Group();
    this.scene.add(this.ball);
    this.ballMesh = this.mesh("golf", "#fcf7e8", 0, 0, 0, 0.24, 0.24, 0.24, this.ball, { roughness: 0.45 });
    this.ballHalo = new THREE.Mesh(
      new THREE.RingGeometry(0.38, 0.43, 36),
      new THREE.MeshBasicMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
      }),
    );
    this.ballHalo.rotation.x = -Math.PI / 2;
    this.scene.add(this.ballHalo);
    // The mini-golf putter and caddie display use the equipped item's full club model.
    this.club = new THREE.Group();
    this.clubMount = new THREE.Group();
    this.clubMount.scale.setScalar(0.64);
    this.clubMount.position.set(-0.16, 0.66, 0);
    this.club.add(this.clubMount);
    this.clubModels = new Map();
    this.scene.add(this.club);
    this.club.visible = false;
    this.garageStage = new THREE.Group();
    this.scene.add(this.garageStage);
    this.mesh("cylinder", "#c5b593", -1, 1.15, 8, 2.3, 1.1, 2.3, this.garageStage);
    this.mesh("cylinder", "#e2e8ca", -1, 1.72, 8, 2.35, 0.12, 2.35, this.garageStage);
    this.garageStage.visible = false;
  }
  equip(equipment, items) {
    items = items.map(item => finishItem(item, equipment));
    const ball = items.find((i) => i.id === equipment.ball);
    if (this.ballMesh.userData.finishMaterial) { this.ballMesh.material.dispose(); this.ballMesh.userData.finishMaterial = false; }
    this.ballMesh.material = this.mat(ball?.color || "#faf9ec", {
      roughness: 0.7,
      metalness: ball?.id === "ball-gold" ? 0.2 : 0,
      emissive: ball?.rarity === "Legendary" ? ball.color : "#000000",
      emissiveIntensity: 0.03,
    });
    if (this.ballFinish) {
      this.ball.remove(this.ballFinish);
      this.ballFinish.traverse((o) => {
        if (o.geometry && !Object.values(this.geometries).includes(o.geometry)) o.geometry.dispose();
        if (o.userData.ownedMaterial) { o.material.map?.dispose(); o.material.dispose(); }
      });
    }
    applyFinish(this.ballMesh, ball);
    this.ballFinish = ballFinish(this, ball || {}, this.ball, 0.24);
    this.equipment = equipment;
    this.items = items;
    this.trailColor =
      equipment.trail === "trail-none" ? null : items.find((i) => i.id === equipment.trail)?.color;
    this.holeColor = items.find((i) => i.id === equipment.hole)?.color || "#f2cb63";
  }
  showClubModel(id) {
    const key = id + ':' + (this.equipment?.patterns?.[id] ?? '');
    if (this.clubModelId === key) return;
    this.clubModelId = key;
    this.clubMount.clear();
    const item = this.items?.find((i) => i.id === id) || { id: "club-default", category: "club", color: "#7a8477" };
    if (!this.clubModels.has(key)) {
      const holder = new THREE.Group();
      buildClub(this, item, holder);
      this.clubModels.set(key, holder);
      trimClubCache(this.clubModels);
    }
    this.clubMount.add(this.clubModels.get(key));
  }
  createAim() {
    this.aim = new THREE.Group();
    this.scene.add(this.aim);
    const geo = new THREE.SphereGeometry(0.06, 6, 4);
    for (let i = 0; i < 24; i++) {
      const m = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({
          color: i > 18 ? "#f6cb64" : "#ffffff",
          transparent: true,
          opacity: 1 - i / 32,
        }),
      );
      this.aim.add(m);
    }
    this.arrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(),
      3,
      0xffffff,
      0.5,
      0.3,
    );
    this.scene.add(this.arrow);
  }
  setAim(ball, dir, power, visible) {
    this.aim.visible = this.arrow.visible = visible;
    if (!visible) return;
    const golf = this.hole.mode === "golf",
      length = golf ? this.aimDistance || 30 : 3 + power * 11;
    for (let i = 0; i < 24; i++) {
      const t = i / 24,
        d = length * t,
        arc = golf && this.activeClub !== "putter" ? length * 0.11 * 4 * t * (1 - t) : 0;
      this.aim.children[i].position.set(
        ball.x + dir.x * d,
        golf ? terrainHeight(this.hole, ball.x + dir.x * d, ball.z + dir.z * d) + 0.12 + arc : ball.y + 0.09,
        ball.z + dir.z * d,
      );
      this.aim.children[i].scale.setScalar(golf ? 1 + t * 5 : 1);
    }
    this.arrow.position.set(ball.x, ball.y + 0.09, ball.z);
    this.arrow.setDirection(new THREE.Vector3(dir.x, 0, dir.z));
    this.arrow.setLength(length, 0.5, 0.28);
    if (golf) this.arrow.visible = false;
  }
  pointerToWorld(x, y) {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((x / innerWidth) * 2 - 1, (-y / innerHeight) * 2 + 1), this.camera);
    const result = new THREE.Vector3();
    ray.ray.intersectPlane(new THREE.Plane(UP, -this.ball.position.y), result);
    return result;
  }
  burst(x, y, z, color, count = 24) {
    if (this.settings?.particles === false) return;
    for (let i = 0; i < count && this.particles.length < 120; i++) {
      const m = new THREE.Mesh(
        this.geometries.box,
        this.mat(color || ["#f3d276", "#ec9985", "#b3d497"][i % 3]),
      );
      m.scale.set(0.09, 0.13, 0.09);
      m.position.set(x, y, z);
      this.scene.add(m);
      this.particles.push({
        mesh: m,
        vx: (Math.random() - 0.5) * 5,
        vy: 2 + Math.random() * 4,
        vz: (Math.random() - 0.5) * 5,
        life: 1.2 + Math.random(),
      });
    }
  }
  hit() {
    this.swingOrigin = this.ball.position.clone();
    this.flightPoints = [];
    if (this.flightTrail) this.flightTrail.visible = false;
    this.swingTime = 0.35;
    this.club.visible = true;
  }
  settingsChanged(s) {
    this.settings = s;
    this.dynamicRatio = null;
    this.renderer.setPixelRatio(
      renderScale(s.graphics, devicePixelRatio, innerWidth, innerHeight),
    );
    this.renderer.shadowMap.enabled = s.shadows;
    const size = s.graphics === "high" ? 4096 : s.graphics === "low" ? 512 : 1024;
    if (this.sun.shadow.mapSize.x !== size) {
      this.sun.shadow.mapSize.set(size, size);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
    }
    this.renderer.shadowMap.needsUpdate = true;
    this.resize();
  }
  observeFrame(elapsed) {
    if (document.hidden || elapsed > 0.15 || this.suspended || this.settings?.graphics === 'high') return;
    this.frameAverage = (this.frameAverage ?? elapsed) * 0.985 + elapsed * 0.015;
    this.adaptiveFrames = (this.adaptiveFrames || 0) + 1;
    if (this.adaptiveFrames < 180) return;
    this.adaptiveFrames = 0;
    const cap=renderScale(this.settings?.graphics,devicePixelRatio,innerWidth,innerHeight),current=this.dynamicRatio??cap;
    const next=Math.max(this.settings?.graphics === 'low' ? .8 : 1,Math.min(cap,current+(this.frameAverage>0.027?-0.15:this.frameAverage<0.018?0.05:0)));
    if(Math.abs(next-current)>0.01){this.dynamicRatio=next;this.renderer.setPixelRatio(next);this.resize();}
  }
  update(dt, ball, physics) {
    this.clock += dt;
    if(this.clock>=(this.nextSeasonCheck||0)){
      this.nextSeasonCheck=this.clock+1;
      const visible=halloweenActive();
      this.group?.traverse(o=>{if(o.userData.halloween&&o.visible!==visible){o.visible=visible;this.renderer.shadowMap.needsUpdate=true;}});
    }
    if(this.oceanTime)this.oceanTime.value=this.clock;
    this.group.visible = this.mode !== "garage";
    this.garageStage.visible = this.mode === "garage";
    if (this.hole.mode !== "golf" || this.mode === "garage") {
      const driver = this.mode === "garage" && this.previewCategory === "driver";
      this.showClubModel(this.equipment?.[driver ? "driver" : "club"]);
    }
    if (this.mode === "garage") {
      this.club.visible = true;
      this.club.position.set(-2.4, 1.85, 8.3);
      this.club.scale.setScalar(1.15);
      this.club.rotation.z = -0.24;
    } else {
      this.club.scale.setScalar(1);
      if (!this.swingTime || this.swingTime <= 0) this.club.visible = false;
    }
    for (const a of this.animations) {
      if (a.type === "rotor") a.mesh.rotation.z = this.clock * 0.4;
      if (a.type === "cloud") a.mesh.position.x = a.base + Math.sin(this.clock * 0.025 + a.phase) * 3;
      if (a.type === "water") a.mesh.scale.setScalar(1 + Math.sin(this.clock + a.phase) * 0.04);
    }
    if (this.flag) {
      const pos = this.flag.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++)
        pos.setZ(i, Math.sin(this.clock * 2 + pos.getX(i) * 4) * 0.09 * (pos.getX(i) + 0.6));
      pos.needsUpdate = true;
    }
    if (this.coin && !this.coin.userData.collected) {
      this.coin.rotation.y = this.clock * 1.5;
      this.coin.position.y =
        heightAt(this.hole, this.hole.collectible.t) + 0.8 + Math.sin(this.clock * 2) * 0.15;
    }
    if (physics) {
      const obs = physics.obstacles();
      obs.forEach((o, i) => this.obstacleMeshes[i]?.position.set(o.x, o.y + 0.52, o.z));
    }
    if (this.mode === "play" && ball && this.hole.mode === "golf") {
      this.updateFlight(dt, ball, physics);
    }
    if (this.mode === "play" && ball) {
      const visualScale = this.hole.mode === "golf" ? (this.visualBallRadius || 0.065) / 0.24 : 1;
      this.ball.visible = !physics?.sunk;
      const floor = this.renderGround?.(ball.x, ball.z) ?? ball.y - 0.24;
      this.ball.position.set(
        ball.x,
        this.hole.mode === "golf"
          ? Math.max(ball.y - 0.021335, floor) + 0.24 * visualScale + 0.008
          : Math.max(ball.y, floor + 0.245),
        ball.z,
      );
      this.ball.scale.setScalar(visualScale);
      this.ball.rotation.x += ball.vz * dt * 2;
      this.ball.rotation.z -= ball.vx * dt * 2;
      const moving = Math.hypot(ball.vx, ball.vz) > 1;
      // Trails use a continuous ribbon (updated just before rendering).
      this.ballHalo.visible = !physics?.active && !physics?.sunk;
      this.ballHalo.scale.setScalar(this.hole.mode === "golf" ? 0.35 : 1);
      this.ballHalo.position.set(
        ball.x,
        this.hole.mode === "golf" ? terrainHeight(this.hole, ball.x, ball.z) + 0.16 : ball.y - 0.2,
        ball.z,
      );
    } else {
      this.ball.visible = true;
      if (this.groundShadow) this.groundShadow.visible = false;
      if (this.flightTrail) this.flightTrail.visible = false;
      this.ball.position.copy(
        this.mode === "garage" ? new THREE.Vector3(0, 3.05, 8) : new THREE.Vector3(-7, 0.75, 11),
      );
      this.ball.scale.setScalar(this.mode === "garage" ? 3.8 : 3);
      this.ball.position.y += Math.sin(this.clock * 1.6) * 0.09;
      this.ball.rotation.y = this.clock * 0.18;
      this.ballHalo.visible = false;
      this.aim.visible = this.arrow.visible = false;
    }
    if (this.swingTime > 0) {
      this.swingTime -= dt;
      this.club.position.copy(this.swingOrigin || this.ball.position);
      this.club.position.x -= 0.3;
      this.club.rotation.z = Math.sin((this.swingTime / 0.35) * Math.PI) * -0.9;
      this.club.visible = this.swingTime > 0;
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.vy -= 8 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.mesh.rotation.x += dt * 3;
      p.mesh.scale.multiplyScalar(1 - dt * 0.5);
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
      }
    }
    let target, position;
    if (this.mode === "menu" && this.hole.mode === "golf") {
      target = new THREE.Vector3(0, 0, -this.hole.length * 0.25);
      const drift = this.settings?.reducedMotion ? 0 : this.clock * .008;
      position = new THREE.Vector3(95 + Math.sin(drift) * 10, 85 + Math.sin(drift * .7) * 2, 30 + Math.cos(drift) * 5);
    } else if (this.mode === "play" && ball) {
      ball = this.cameraHold || ball;
      target = new THREE.Vector3(ball.x, ball.y, ball.z);
      if (this.hole.mode === "golf") {
        target.x -= Math.sin(this.orbit) * Math.min(10, this.zoom * 0.22);
        target.z -= Math.cos(this.orbit) * Math.min(10, this.zoom * 0.22);
      }
      const zoom = this.zoom * (this.hole.mode === "golf" && physics?.airborne ? 1.8 : 1);
      position = new THREE.Vector3(
        ball.x + Math.sin(this.orbit) * zoom,
        ball.y + (this.hole.mode === "golf" ? Math.max(2.5, zoom * (this.pitch || 0.32)) : zoom * 0.83),
        ball.z + Math.cos(this.orbit) * zoom,
      );
    } else if (this.mode === "garage") {
      target = new THREE.Vector3(-1, 2.5, 8);
      position = new THREE.Vector3(3, 6, 17);
    } else {
      const t = this.clock * 0.025;
      target = new THREE.Vector3(-7, 0, 2);
      position = new THREE.Vector3(30 + Math.sin(t) * 1.7, 30, 40 + Math.cos(t) * 1.5);
    }
    this.camera.position.lerp(position, 1 - Math.exp(-dt * 3));
    this.look.lerp(target, 1 - Math.exp(-dt * 4));
    this.camera.lookAt(this.look);
    if (this.golfer?.visible) this.club.visible = false;
    if (this.clock - (this.lastShadow || 0) > (this.settings?.graphics === "low" ? 0.3 : 0.16)) {
      this.renderer.shadowMap.needsUpdate = true;
      this.lastShadow = this.clock;
    }
    // Full-screen overlays (such as the locker stage) suspend the 3D view to save power.
    if (this.suspended) return;
    this.updateRibbon?.(dt, ball, physics);
    const stage = this.mode === 'garage' && this.caddieViewport?.isConnected ? this.caddieViewport.getBoundingClientRect() : null;
    const aspect = stage?.height > 0 ? stage.width / stage.height : innerWidth / innerHeight;
    if (this.camera.aspect !== aspect) { this.camera.aspect = aspect; this.camera.updateProjectionMatrix(); }
    if (stage?.height > 0) {
      // Render the live island into its UI window, including when the mobile page scrolls.
      this.renderer.setClearColor(this.scene.background); this.renderer.clear();
      this.renderer.setViewport(stage.left, innerHeight-stage.bottom, stage.width, stage.height);
      this.renderer.setScissor(Math.max(0,stage.left), Math.max(0,innerHeight-stage.bottom), Math.max(0,Math.min(innerWidth,stage.right)-Math.max(0,stage.left)), Math.max(0,Math.min(innerHeight,stage.bottom)-Math.max(0,stage.top)));
      this.renderer.setScissorTest(true);
    }
    this.renderer.render(this.scene, this.camera);
    if (stage) { this.renderer.setScissorTest(false); this.renderer.setViewport(0,0,innerWidth,innerHeight); }
    this.drawCalls = this.renderer.info.render.calls;
  }
  updateFlight(dt, ball, physics) {
    if (!this.groundShadow) {
      this.groundShadow = new THREE.Mesh(
        new THREE.CircleGeometry(0.11, 24),
        new THREE.MeshBasicMaterial({
          color: "#233e29",
          transparent: true,
          opacity: 0.28,
          depthWrite: false,
        }),
      );
      this.groundShadow.rotation.x = -Math.PI / 2;
      this.scene.add(this.groundShadow);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(900), 3));
      geometry.setDrawRange(0, 0);
      this.flightTrail = new THREE.Line(
        geometry,
        new THREE.LineBasicMaterial({
          color: "#fffbe4",
          transparent: true,
          opacity: 0.85,
          depthWrite: false,
        }),
      );
      this.flightTrail.frustumCulled = false;
      this.scene.add(this.flightTrail);
    }
    const ground = this.renderGround?.(ball.x, ball.z) ?? terrainHeight(this.hole, ball.x, ball.z);
    this.groundShadow.visible = !physics.sunk;
    this.groundShadow.position.set(ball.x, ground + 0.012, ball.z);
    this.groundShadow.scale.setScalar(1 + Math.min(2, (ball.y - ground) * 0.02));
    if (physics.airborne) {
      this.flightFade = 1.2;
      this.flightTrail.material.opacity = 0.8;
      this.flightPoints ??= [];
      this.trailTimer = (this.trailTimer || 0) + dt;
      if (this.trailTimer > 0.035) {
        this.trailTimer = 0;
        this.flightPoints.push([ball.x, ball.y + 0.05, ball.z]);
        if (this.flightPoints.length > 300) this.flightPoints.shift();
        const positions = this.flightTrail.geometry.attributes.position;
        this.flightPoints.forEach((p, i) => positions.setXYZ(i, ...p));
        positions.needsUpdate = true;
        this.flightTrail.geometry.setDrawRange(0, this.flightPoints.length);
      }
      this.flightTrail.visible = true;
    } else if (!physics.active) {
      this.flightFade = Math.max(0, (this.flightFade || 0) - dt);
      this.flightTrail.material.opacity = (0.8 * this.flightFade) / 1.2;
      this.flightTrail.visible = this.flightFade > 0;
    }
    if (!this.shadowCenter || Math.hypot(ball.x - this.shadowCenter.x, ball.z - this.shadowCenter.z) > 25) {
      this.shadowCenter = { x: ball.x, z: ball.z };
      this.sun.position.set(ball.x - 80, ground + 140, ball.z + 60);
      this.sun.target.position.set(ball.x, ground, ball.z);
      Object.assign(this.sun.shadow.camera, {
        left: -90,
        right: 90,
        top: 110,
        bottom: -110,
        near: 1,
        far: 360,
      });
      this.sun.shadow.camera.updateProjectionMatrix();
      this.renderer.shadowMap.needsUpdate = true;
    }
  }
  thumbnail(index, mode = "mini") {
    return coursePreview(index, mode);
  }
  itemThumbnail(item) {
    item = finishItem(item, this.equipment);
    const key = item.id + ':' + (item.seed ?? '') + ":" + (item.color || "") + ":v3";
    if (this.itemCache.has(key)) return this.itemCache.get(key);
    const url = renderItemArt(this, item);
    this.itemCache.set(key, url);
    if (this.itemCache.size > 220) this.itemCache.delete(this.itemCache.keys().next().value);
    return url;
  }
  ballScreen() {
    const p = this.ball.position.clone();
    p.y += 0.85;
    p.project(this.camera);
    return { x: (p.x * 0.5 + 0.5) * innerWidth, y: (-0.5 * p.y + 0.5) * innerHeight, visible: p.z < 1 };
  }
}
