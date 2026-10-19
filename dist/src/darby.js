import * as THREE from "../vendor/three.module.js";
import { darbyFor } from "./course-features.js";

// Darby, the black Labrador on Willow Park's first hole. The Blender model
// (assets/source/darby.py) ships as three parts so the head and tail can move:
// a slow wag and breathing at rest, the head following a nearby ball, and a happy
// hop with a fast wag and floating hearts when a shot reaches Darby. Visual only;
// placement and the hit box live in course-features.js for physics and replays.
let parts;

export async function loadDarby() {
  const response = await fetch(new URL("../assets/darby.json", import.meta.url));
  if (!response.ok) throw Error("Darby could not load.");
  const data = await response.json();
  parts = {};
  for (const [name, a] of Object.entries(data.assets)) {
    const color = new Float32Array(a.p.length);
    a.c.forEach((c, t) => { for (let v = 0; v < 3; v++) color.set(data.palette[c], t * 9 + v * 3); });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(a.p, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(color, 3));
    geo.computeVertexNormals();
    geo.userData.shared = true;
    parts[name.replace("darby-", "")] = { geo, pivot: a.pivot };
  }
}

function heartTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const c = canvas.getContext("2d");
  c.fillStyle = "#ef6f7d";
  c.strokeStyle = "#fff6ea";
  c.lineWidth = 5;
  const heart = new Path2D("M32 54C12 40 6 30 6 21 6 12 13 7 20 7c5 0 9 3 12 7 3-4 7-7 12-7 7 0 14 5 14 14 0 9-6 19-26 33Z");
  c.stroke(heart);
  c.fill(heart);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function buildDarby(world, h) {
  const spot = darbyFor(h);
  if (!spot || !parts) return null;
  const material = world.mat("#ffffff", { vertexColors: true }),
    root = new THREE.Group(),
    pose = new THREE.Group();
  root.name = "darby";
  root.userData.courseDynamic = true;
  // Sit on the displayed turf and follow its slope from paws to rump.
  const ground = (x, z) => world.surfaceHeight?.(x, z) ?? spot.y,
    s = Math.sin(spot.angle), c = Math.cos(spot.angle),
    front = ground(spot.x + s, spot.z + c), back = ground(spot.x - s, spot.z - c);
  root.position.set(spot.x, ground(spot.x, spot.z) - 0.02, spot.z);
  root.rotation.y = spot.angle;
  pose.rotation.x = Math.atan2(back - front, 2);
  root.add(pose);
  const part = (name) => {
    const mesh = new THREE.Mesh(parts[name].geo, material);
    mesh.position.fromArray(parts[name].pivot);
    mesh.castShadow = mesh.receiveShadow = true;
    pose.add(mesh);
    return mesh;
  };
  const darby = { root, pose, body: part("body"), head: part("head"), tail: part("tail"), spot, time: 0, greet: -1, look: 0 };
  world.group.add(root);
  return darby;
}

export function installDarby(world) {
  if (world.darbyInstalled) return;
  world.darbyInstalled = true;
  const load = world.load.bind(world), update = world.update.bind(world);
  let hearts = null;
  world.load = (hole, ...args) => {
    // Shared heart sprites must not be disposed with the old hole.
    hearts?.forEach((heart) => heart.removeFromParent());
    const result = load(hole, ...args);
    world.darby = hole?.mode === "golf" ? buildDarby(world, hole) : null;
    return result;
  };
  world.greetDarby = () => {
    const d = world.darby;
    if (!d) return false;
    d.greet = 0;
    if (world.settings?.reducedMotion || world.settings?.particles === false) return true;
    hearts ??= Array.from({ length: 3 }, () => new THREE.Sprite(new THREE.SpriteMaterial({ map: heartTexture(), transparent: true, depthWrite: false })));
    for (const heart of hearts) d.root.add(heart);
    return true;
  };
  world.update = (dt, ball, ...args) => {
    const d = world.darby;
    if (d && world.mode !== "garage") animate(d, dt, ball, hearts, world.settings);
    return update(dt, ball, ...args);
  };
}

function animate(d, dt, ball, hearts, settings = {}) {
  d.time += dt;
  const t = d.time, still = settings.reducedMotion;
  // Turn toward a ball that comes to rest or rolls nearby, within a comfortable neck range.
  let look = 0;
  if (ball && Math.hypot(ball.x - d.spot.x, ball.z - d.spot.z) < 28) {
    const dx = ball.x - d.spot.x, dz = ball.z - d.spot.z;
    look = Math.atan2(dx * Math.cos(d.spot.angle) - dz * Math.sin(d.spot.angle), dx * Math.sin(d.spot.angle) + dz * Math.cos(d.spot.angle));
    look = Math.max(-0.75, Math.min(0.75, look));
  }
  d.look += (look - d.look) * Math.min(1, dt * 3);
  let hop = 0, wag = Math.sin(t * 2.4) * 0.22, tilt = 0, lift = 0;
  if (d.greet >= 0) {
    const g = (d.greet += dt);
    if (g > 3.2) d.greet = -1;
    else {
      const ease = Math.min(1, g * 4) * Math.min(1, (3.2 - g) * 2);
      if (!still && g < 1.1) hop = Math.max(0, Math.sin(g * Math.PI * 1.8)) * 0.3;
      wag = Math.sin(t * 17) * 0.55 * ease;
      tilt = Math.sin(g * 2.6) * 0.28 * ease;
      lift = -0.22 * ease;
    }
  }
  d.pose.position.y = hop;
  d.body.scale.y = 1 + Math.sin(t * 1.7) * 0.012;
  d.tail.rotation.y = wag;
  d.head.rotation.set(lift + Math.sin(t * 0.7) * 0.03, d.look + (look ? 0 : Math.sin(t * 0.35) * 0.12), tilt);
  if (hearts) hearts.forEach((heart, i) => {
    const g = d.greet - i * 0.35, on = g >= 0 && g < 2.2;
    heart.visible = on;
    if (!on) return;
    heart.position.set(Math.sin(i * 2.1 + g * 2) * 0.35, 1.45 + g * 0.75, 0.85 + i * 0.05);
    heart.scale.setScalar(0.32 + Math.min(g, 0.3));
    heart.material.opacity = Math.min(1, (2.2 - g) * 1.5);
  });
}
