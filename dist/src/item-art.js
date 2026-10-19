import { HoleCelebration } from './hole-effects.js';
import * as THREE from "../vendor/three.module.js";
import { ballFinish } from "./item-designs.js";
import { applyFinish } from './finish-material.js';
import { buildClub } from "./club-models.js";
import { RARITY } from "./catalog.js";
import { badgeFor, drawBadge } from './nameplate-badges.js';
import { artCanvas } from './art-canvas.js';

// Studio renders for every collectible: rarity-tinted backdrop, soft contact shadow,
// key and rim light, and a dedicated low-poly model per category.
const W = 864,
  H = 600;
const backdrops = new Map();
let shadowTexture;

function backdrop(rarity) {
  const key = rarity || "none";
  if (backdrops.has(key)) return backdrops.get(key);
  const c = artCanvas(360, 250);
  c.width = 360;
  c.height = 250;
  const g = c.getContext("2d"),
    tint = RARITY[rarity] || "#a0ac9b",
    strong = rarity === "Legendary" || rarity === "Black Market";
  g.fillStyle = rarity === "Black Market" ? "#2b2640" : "#eef2e6";
  g.fillRect(0, 0, 360, 250);
  const glow = g.createRadialGradient(180, 118, 10, 180, 125, 230);
  glow.addColorStop(0, rarity === "Black Market" ? "#6d5aa8" : "#fbfcf5");
  glow.addColorStop(0.45, tint + (strong ? "88" : "44"));
  glow.addColorStop(1, rarity === "Black Market" ? "#1d1a2c" : tint + "22");
  g.fillStyle = glow;
  g.fillRect(0, 0, 360, 250);
  if (strong)
    for (let i = 0; i < 14; i++) {
      g.save();
      g.translate(180, 125);
      g.rotate((i / 14) * Math.PI * 2);
      g.fillStyle = rarity === "Black Market" ? "#b2a1ed14" : "#fff4c818";
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(-18, -260);
      g.lineTo(18, -260);
      g.fill();
      g.restore();
    }
  const floor = g.createLinearGradient(0, 170, 0, 250);
  floor.addColorStop(0, "#00000000");
  floor.addColorStop(1, rarity === "Black Market" ? "#0000004a" : "#4a6a4a1c");
  g.fillStyle = floor;
  g.fillRect(0, 170, 360, 80);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  backdrops.set(key, texture);
  return texture;
}

function contactShadow(w, parent, y, sx, sz, opacity = 0.28) {
  if (!shadowTexture) {
    const c = artCanvas(128, 128);
    c.width = c.height = 128;
    const g = c.getContext("2d"),
      r = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    r.addColorStop(0, "#000000ff");
    r.addColorStop(1, "#00000000");
    g.fillStyle = r;
    g.fillRect(0, 0, 128, 128);
    shadowTexture = new THREE.CanvasTexture(c);
  }
  const plane = new THREE.Mesh(
    w.geometries["art:plane"] ??= new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, opacity, depthWrite: false }),
  );
  plane.userData.ownedMaterial = true;
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = y;
  plane.scale.set(sx, sz, 1);
  parent.add(plane);
}

function shapeGeometry(w, key, draw, depth = 0.18) {
  return (w.geometries["art:" + key] ??= (() => {
    const s = new THREE.Shape();
    draw(s);
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 1, curveSegments: 8 });
    g.center();
    return g;
  })());
}
const heart = (s) => {
  s.moveTo(0, -0.55);
  s.bezierCurveTo(-0.9, 0.05, -0.45, 0.72, 0, 0.3);
  s.bezierCurveTo(0.45, 0.72, 0.9, 0.05, 0, -0.55);
};
const star = (s) => {
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5,
      r = i % 2 ? 0.26 : 0.62;
    i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
};
const bubble = (s) => {
  const r = 0.28,
    w = 1.9,
    h = 1.25;
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(-0.35, -h / 2);
  s.lineTo(-0.62, -h / 2 - 0.34);
  s.lineTo(-0.02, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r);
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
};
const plaque = (s) => {
  const w = 2.5,
    h = 1.1,
    r = 0.22;
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r);
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
};
const shield = (s) => {
  s.moveTo(0, -0.5);
  s.quadraticCurveTo(0.42, -0.3, 0.42, 0.18);
  s.lineTo(0.42, 0.42);
  s.lineTo(-0.42, 0.42);
  s.lineTo(-0.42, 0.18);
  s.quadraticCurveTo(-0.42, -0.3, 0, -0.5);
};

function symbolFor(item) {
  if (/love|heart/.test(item.id)) return "heart";
  if (/cheer|secret|achievement/.test(item.id)) return "star";
  if (/wave/.test(item.id)) return "flag";
  return ["heart", "star", "flag", "spark"][(item.design || 0) % 4];
}

export function renderItemArt(w, item, {blob = false} = {}) {
  const scene = new THREE.Scene(),
    g = new THREE.Group(),
    rarity = item.rarity || (item.category === "locker" ? item.tier : null);
  scene.background = backdrop(rarity);
  scene.add(g, new THREE.HemisphereLight("#ffffff", "#9fb08c", 2.1));
  const key = new THREE.DirectionalLight("#fff3dc", 2.1),
    rim = new THREE.DirectionalLight(rarity === "Black Market" ? "#b9a8ff" : "#e6f4ff", 1.35);
  key.position.set(-3, 4.5, 5);
  rim.position.set(4, 3, -4);
  scene.add(key, rim);
  const camera = new THREE.PerspectiveCamera(32, W / H, 0.1, 60);
  camera.position.set(3.1, 2.1, 5.4);
  let look = new THREE.Vector3(0, 0, 0);
  const m = (geo, c, x, y, z, sx = 1, sy = 1, sz = 1, p = g, extra = {}) => w.mesh(geo, c, x, y, z, sx, sy, sz, p, { ...extra, roughness: Math.max(0.64, extra.roughness || 0.78), metalness: Math.min(0.2, extra.metalness || 0), emissiveIntensity: Math.min(0.08, extra.emissiveIntensity || 0) });
  const accent = item.pattern || "#f4e7c4";

  if (item.category === "ball") {
    const holder = new THREE.Group();
    holder.position.y = 0.18;
    holder.rotation.set(0.35, -0.5, 0.1);
    if (!!item.motif) holder.rotation.set(-0.22, 0.55, 0);
    g.add(holder);
    const body = m(item.id === "ball-pixel" ? "sphere" : "round", item.color, 0, 0, 0, 1, 1, 1, holder, {
      metalness: item.motif === "tennis" ? 0 : item.id === "ball-gold" || item.rarity === "Legendary" ? 0.45 : 0.06,
      roughness: item.motif === "tennis" ? 0.95 : 0.32,
      emissive: item.rarity === "Black Market" ? item.pattern || "#000" : "#000000",
      emissiveIntensity: 0.12,
    });
    applyFinish(body, item);
    ballFinish(w, item, holder);
    m("cone", "#e6d8b5", 0, -1.05, 0, 0.26, 0.5, 0.26);
    m("cylinder", "#e6d8b5", 0, -0.82, 0, 0.3, 0.06, 0.3);
    contactShadow(w, g, -1.29, 1.9, 1.3, 0.3);
    look.set(0, -0.1, 0);
  } else if (item.category === "club" || item.category === "driver") {
    // Clubs lie on a diagonal so the full length and the head design fill the frame.
    const tilt = new THREE.Group(),
      lean = new THREE.Group(),
      spin = new THREE.Group(),
      special = !!item.shape && !["driver", "putter"].includes(item.shape);
    tilt.rotation.x = 0.28;
    lean.rotation.z = -0.92;
    spin.rotation.y = item.category === "driver" && !special ? 2.25 : 2.55;
    spin.position.set(0.1, 0.02, 0);
    g.add(tilt);
    tilt.add(lean);
    lean.add(spin);
    const model = buildClub(w, item, spin);
    model.position.set(-0.12, -0.3, 0);
    contactShadow(w, g, -1.02, 2.6, 0.8, 0.2);
    camera.position.set(1.25, 0.75, 3.55);
    look.set(-0.12, -0.02, 0);
  } else if (item.id === "trail-none") {
    m("round", "#fbf8ee", 0.7, 0.2, 0, 0.3, 0.3, 0.3, g, { roughness: 0.35 });
    for (let i = 0; i < 6; i++) m("sphere", "#c9d2c1", 0.25 - i * 0.32, 0.2 - i * 0.05, 0, 0.05, 0.05, 0.05, g);
    contactShadow(w, g, -0.3, 1.2, 0.6, 0.2);
  } else if (item.category === "trail") {
    const curve = new THREE.CatmullRomCurve3(Array.from({length:12},(_,i)=>{
      const t=i/11; return new THREE.Vector3(1.05-t*2.5,0.25+Math.sin(t*3.2)*0.35-t*0.2,Math.sin(t*5)*0.18);
    }));
    const tube=new THREE.TubeGeometry(curve,40,0.09,6,false);
    m(tube,item.color,0,0,0,1,1,1,g);
    const core=new THREE.TubeGeometry(curve,40,0.035,5,false);
    m(core,item.pattern||'#f7f3dd',0,0,0.07,1,1,1,g);
    m('round','#fbf8ee',1.18,0.25,0,0.27,0.27,0.27,g);
    contactShadow(w, g, -0.62, 2.8, 0.9, 0.16);
  } else if (item.category === "hole") {
    m("cylinder", "#8fb96d", 0, -0.74, 0, 1.3, 0.12, 1.3, g, { roughness: 0.9 });
    m("cylinder", "#a9cc86", 0, -0.69, 0, 1.18, 0.04, 1.18, g, { roughness: 0.9 });
    m("cylinder", "#1d3a2d", 0, -0.66, 0, 0.42, 0.04, 0.42, g);
    const ring = m(new THREE.TorusGeometry(0.44, 0.05, 8, 32), "#fbf5e0", 0, -0.64, 0, 1, 1, 1, g);
    ring.rotation.x = Math.PI / 2;
    m("cylinder", "#f4f0dd", 0.15, 0.2, 0, 0.025, 1.75, 0.025, g);
    const flag = m("box", item.color, 0.45, 0.88, 0, 0.58, 0.36, 0.02, g);
    flag.rotation.y = -0.3;
    if(item.effect) {
      const effect=new HoleCelebration(item,{low:true});effect.update(item.effect==='meteor'?.65:1.3);
      effect.root.scale.setScalar(.42);effect.root.position.y=-.62;
      effect.root.traverse(o=>{if(o.material)o.userData.ownedMaterial=true;});g.add(effect.root);
    }
    for (let i = 0; i < (item.effect ? 0 : 38); i++) {
      const a = i * 2.399,
        r = 0.3 + (i % 5) * 0.22,
        y = -0.35 + ((i * 7) % 11) * 0.13,
        piece = m(i % 4 === 3 ? "sphere" : "box", [item.color, accent, "#fff6d6"][i % 3], Math.cos(a) * r, y, Math.sin(a) * r * 0.7, 0.1, i % 4 === 3 ? 0.1 : 0.17, 0.035, g, {
          emissive: [item.color, accent, "#fff6d6"][i % 3],
          emissiveIntensity: 0.12,
        });
      piece.rotation.set(a, a * 0.7, a * 1.3);
    }
    contactShadow(w, g, -0.78, 3, 2.2, 0.18);
    look.set(0, -0.05, 0);
  } else if (item.category === "emote") {
    const holder = new THREE.Group();
    holder.rotation.set(-0.08, 0.42, 0.04);
    holder.scale.setScalar(1.12);
    g.add(holder);
    m(shapeGeometry(w, "bubble", bubble, 0.26), "#fbf8ee", 0, 0.12, 0, 1, 1, 1, holder, { roughness: 0.55 });
    const sym = symbolFor(item),
      front = 0.2;
    if (sym === "heart") m(shapeGeometry(w, "heart", heart, 0.16), item.color, 0, 0.2, front, 0.78, 0.78, 0.78, holder, { roughness: 0.45 });
    else if (sym === "star") m(shapeGeometry(w, "star", star, 0.16), item.color, 0, 0.18, front, 0.95, 0.95, 0.95, holder, { roughness: 0.45 });
    else if (sym === "flag") {
      m("cylinder", "#56705f", -0.28, 0.12, front, 0.03, 0.9, 0.03, holder);
      m("box", item.color, 0.02, 0.38, front, 0.56, 0.34, 0.06, holder);
    } else
      for (let i = 0; i < 3; i++) m("sphere", i === 1 ? item.color : accent, -0.45 + i * 0.45, 0.15, front, 0.14, 0.14, 0.08, holder);
    m("box", item.pattern || "#e5d7aa", 0, -0.47, 0.02, 1.5, 0.05, 0.05, holder);
    contactShadow(w, g, -0.95, 2.4, 1, 0.16);
  } else if (item.category === "nameplate") {
    const holder = new THREE.Group();
    holder.rotation.set(-0.12, 0.4, 0);
    holder.scale.setScalar(1.05);
    g.add(holder);
    m(shapeGeometry(w, "plaque", plaque, 0.16), item.color, 0, 0, 0, 1, 1, 1, holder, { metalness: 0.2, roughness: 0.45 });
    m(shapeGeometry(w, "plaque-inset", plaque, 0.05), "#f7f1dc", 0.25, 0, 0.13, 0.72, 0.72, 1, holder);
    const badge = badgeFor(item);
    if (badge) {
      m('round', item.color, -0.85, 0.02, 0.19, 0.47, 0.47, 0.065, holder);
      const canvas = artCanvas(256, 256);
      canvas.width = canvas.height = 256;
      drawBadge(canvas.getContext('2d'), badge, accent);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const emblem = new THREE.Mesh(w.geometries['art:plane'] ??= new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}));
      emblem.position.set(-0.85, 0.02, 0.275);
      emblem.scale.setScalar(0.78);
      emblem.userData.ownedMaterial = true;
      holder.add(emblem);
    } else m(shapeGeometry(w, "shield", shield, 0.12), accent, -0.85, 0.02, 0.14, 0.9, 0.9, 1, holder, { metalness: 0.35, roughness: 0.35 });
    if (!badge && item.motif === 'skull') {
      for(const angle of [-0.5,0.5])m('box','#f5ecd0',-0.85,-0.12,0.27,0.35,0.045,0.02,holder).rotation.z=angle;
      m('round','#f5ecd0',-0.85,0.09,0.27,0.14,0.14,0.025,holder);
      m('box','#f5ecd0',-0.85,-0.015,0.27,0.17,0.09,0.03,holder);
      for(const x of [-0.90,-0.80])m('round',item.color,x,0.09,0.3,0.031,0.04,0.009,holder);
    } else if (!badge) m(shapeGeometry(w, "star", star, 0.16), item.color, -0.85, 0.06, 0.24, 0.32, 0.32, 0.5, holder);
    for (const [y, l] of [
      [0.12, 1.15],
      [-0.12, 0.8],
    ])
      m("box", "#6a7f6c", 0.28 - (1.15 - l) / 2, y, 0.17, l, 0.07, 0.02, holder);
    for (const x of [-1.08, 1.08]) m("round", "#d9c38a", x, 0.36, 0.13, 0.05, 0.05, 0.02, holder, { metalness: 0.6 });
    if (item.shine) {
      // Thin inlaid rails and a restrained highlight leave the badge unobstructed.
      for (const y of [-0.44, 0.44]) m('box', accent, 0, y, 0.16, 2.05, 0.035, 0.035, holder);
      for (const [x,y,size] of [[0.97,0.33,0.16],[-1.04,-0.3,0.1],...(item.shine === 'prismatic' ? [[0.4,-0.33,0.12],[0.76,0.1,0.09]] : [])]) {
        m('box','#fff8dc',x,y,0.205,size,0.018,0.018,holder);
        m('box','#fff8dc',x,y,0.205,0.018,size,0.018,holder);
      }
    }
    contactShadow(w, g, -0.8, 3, 1, 0.14);
  } else if (item.category === "locker") {
    const trim = item.pattern || "#e1c38b",
      gem = item.gem || "#f7f2dc",
      shine = { metalness: 0.55, roughness: 0.32 },
      holder = new THREE.Group();
    holder.rotation.set(0.05, 0.08, 0);
    holder.position.y = -0.22;
    g.add(holder);
    m("box", item.color, 0, -0.1, 0, 1.9, 1.05, 1.2, holder, { roughness: 0.7 });
    for (let i = 1; i < 5; i++) m("box", "#51493b", -0.95 + i * 0.38, -0.1, 0.602, 0.012, 1.02, 0.003, holder);
    const dome = m("cylinder", item.color, 0, 0.42, 0, 0.62, 1.94, 0.62, holder, { roughness: 0.65 });
    dome.rotation.z = Math.PI / 2;
    dome.scale.set(0.6, 1.94, 0.62);
    for (const x of [-0.62, 0.62]) {
      const band = m("cylinder", trim, x, 0.42, 0, 0.64, 0.14, 0.64, holder, shine);
      band.rotation.z = Math.PI / 2;
      band.scale.set(0.62, 0.14, 0.64);
      m("box", trim, x, -0.1, 0.61, 0.14, 1.05, 0.04, holder, shine);
    }
    m("box", trim, 0, 0.43, 0, 1.98, 0.06, 1.26, holder, shine);
    for (const x of [-0.96, 0.96])
      for (const z of [-0.61, 0.61]) m("box", trim, x, -0.1, z, 0.08, 1.09, 0.08, holder, shine);
    m("box", trim, 0, 0.42, 0.64, 0.36, 0.34, 0.06, holder, shine);
    m("sphere", gem, 0, 0.42, 0.68, 0.11, 0.11, 0.06, holder, { emissive: gem, emissiveIntensity: 0.45, roughness: 0.2 });
    const plate = m("cylinder", trim, 0, -0.18, 0.61, 0.26, 0.04, 0.26, holder, shine);
    plate.rotation.x = Math.PI / 2;
    m("cylinder", "#fbf6e8", -0.05, -0.18, 0.645, 0.012, 0.3, 0.012, holder);
    m("box", gem, 0.04, -0.09, 0.645, 0.15, 0.1, 0.012, holder);
    m("round", "#fbf8ef", 0.07, -0.3, 0.645, 0.05, 0.05, 0.02, holder);
    contactShadow(w, g, -0.78, 3.2, 2.3, 0.28);
    camera.position.set(2.5, 2.05, 4.9);
    look.set(0, 0.02, 0);
  } else if (item.category === "tokens") {
    m("box", "#315b49", 0, -0.65, 0, 1.85, 0.65, 1.1, g);
    m("box", "#d5ac58", 0, -0.28, 0, 1.95, 0.12, 1.18, g, { metalness: 0.4 });
    for (let i = 0; i < 24; i++) {
      const coin = m("cylinder", i % 3 ? "#f2cd65" : "#e5ae47", ((i % 5) - 2) * 0.27, -0.15 + Math.floor(i / 5) * 0.12, ((Math.floor(i / 5) % 2) - 0.5) * 0.3, 0.23, 0.09, 0.23, g, {
        metalness: 0.35,
        roughness: 0.4,
      });
      coin.rotation.z = ((i % 3) - 1) * 0.12;
    }
    m("sphere", "#ffe99c", 0.25, 0.8, 0, 0.37, 0.37, 0.2, g, { emissive: "#f1c34d", emissiveIntensity: 0.3 });
    contactShadow(w, g, -0.99, 2.8, 1.8, 0.24);
  }
  camera.lookAt(look);
  const r = studio();
  r.render(scene, camera);
  const url = blob
    ? r.domElement.convertToBlob ? r.domElement.convertToBlob({type:'image/webp', quality:.94}) : new Promise((resolve, reject) => r.domElement.toBlob(value => value ? resolve(value) : reject(Error('Could not encode item art')), 'image/webp', 0.94))
    : r.domElement.toDataURL("image/webp", 0.96);
  g.traverse((o) => {
    if (o.userData.ownedMaterial) { if (o.material.map !== shadowTexture) o.material.map?.dispose(); o.material.dispose(); }
    if (o.geometry && !Object.values(w.geometries).includes(o.geometry)) o.geometry.dispose();
  });
  return url;
}

// A small dedicated renderer keeps thumbnails from resizing or flashing the main canvas.
let artRenderer;
function studio() {
  if (!artRenderer) {
    artRenderer = new THREE.WebGLRenderer({ canvas: artCanvas(W, H), antialias: true, preserveDrawingBuffer: true });
    artRenderer.setPixelRatio(1);
    artRenderer.setSize(W, H, false);
    artRenderer.outputColorSpace = THREE.SRGBColorSpace;
    artRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    artRenderer.toneMappingExposure = 1.08;
  }
  return artRenderer;
}
