import * as THREE from "../vendor/three.module.js";
import { terrainHeight, terrainAt, pathDistance, golfHoleCount } from "./golf-courses.js";

export function golfTrees(w, h) {
  const dummy = new THREE.Object3D(),
    n = h.trees.length;
  const wood = new THREE.InstancedMesh(w.geometries.cylinder, w.mat("#80694e"), n * 3),
    leaf = new THREE.InstancedMesh(w.geometries.sphere, w.mat("#ffffff"), n * 7),
    pine = new THREE.InstancedMesh(w.geometries.cone, w.mat("#ffffff"), n * 4);
  let wi = 0,
    li = 0,
    pi = 0;
  const place = (mesh, i, x, y, z, sx, sy, sz, color, rz = 0) => {
    dummy.position.set(x, y, z);
    dummy.scale.set(sx, sy, sz);
    dummy.rotation.set(0, 0, rz);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    if (color) mesh.setColorAt(i, new THREE.Color(color));
  };
  h.trees.forEach((p, i) => {
    const y = w.surfaceHeight?.(p.x, p.z) ?? terrainHeight(h, p.x, p.z),
      s = p.size || 1,
      conifer = p.type === "pine",
      willow = p.type === "willow",
      height = conifer ? 9 : willow ? 7.5 : 8.2;
    place(wood, wi++, p.x, y + height * 0.36 * s, p.z, 0.27 * s, height * 0.72 * s, 0.27 * s);
    if (conifer) {
      for (let k = 0; k < 4; k++)
        place(
          pine,
          pi++,
          p.x,
          y + (3.9 + k * 1.65) * s,
          p.z,
          (3.1 - k * 0.56) * s,
          4.1 * s,
          (3.1 - k * 0.56) * s,
          ["#3d694a", "#4c7953", "#638b5b", "#7a9e69"][k],
        );
    } else {
      for (const sign of [-1, 1])
        place(
          wood,
          wi++,
          p.x + sign * 0.55 * s,
          y + 4.1 * s,
          p.z,
          0.14 * s,
          2.9 * s,
          0.14 * s,
          null,
          sign * -0.5,
        );
      for (let k = 0; k < 7; k++) {
        const a = k * 2.399 + i * 0.7,
          r = k === 6 ? 0 : 1.9 * s,
          x = p.x + Math.cos(a) * r,
          z = p.z + Math.sin(a) * r,
          top = y + (k === 6 ? 8 : 6.4 + (k % 3) * 0.5) * s;
        place(
          leaf,
          li++,
          x,
          top,
          z,
          (k === 6 ? 2.2 : 2.5) * s,
          (willow ? 3.3 : 2.3) * s,
          2.35 * s,
          (p.type === "juniper"
            ? ["#66816a", "#748c68", "#8e9e75"]
            : willow
              ? ["#759b5a", "#8daf68", "#a4c47b"]
              : ["#56854e", "#699c58", "#7fab63", "#95b976"])[
            (i + k) % (p.type === "juniper" || willow ? 3 : 4)
          ],
        );
      }
    }
  });
  wood.count = wi;
  leaf.count = li;
  pine.count = pi;
  for (const mesh of [wood, leaf, pine]) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    w.group.add(mesh);
  }
}

export function signatureDetails(w, h) {
  const ground = (x, z) => w.surfaceHeight?.(x, z) ?? terrainHeight(h, x, z),
    m = (g, c, x, y, z, sx, sy, sz, parent = w.group) => w.mesh(g, c, x, y, z, sx, sy, sz, parent);
  // Shore stones and reed groups stay outside the water and playing surfaces.
  const dummy = new THREE.Object3D(),
    stones = new THREE.InstancedMesh(
      w.geometries.sphere,
      w.mat((h.layoutCourse ?? h.courseIndex) === 2 ? "#ba967d" : "#c2c0a3"),
      220,
    ),
    reeds = new THREE.InstancedMesh(
      w.geometries.cone,
      w.mat((h.layoutCourse ?? h.courseIndex) === 1 ? "#b1ae73" : "#789b58"),
      600,
    );
  let st = 0,
    re = 0;
  const put = (mesh, i, x, y, z, sx, sy, sz, angle = 0) => {
    dummy.position.set(x, y, z);
    dummy.scale.set(sx, sy, sz);
    dummy.rotation.set(0, angle, 0.08 * Math.sin(i));
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  };
  for (const p of h.water) {
    for (let i = 0; i < 90; i++) {
      const a = (i / 90) * Math.PI * 2,
        x = p.x + Math.cos(a) * (p.rx + 1.0),
        z = p.z + Math.sin(a) * (p.rz + 1.0);
      if (pathDistance(h, x, z) < h.width / 2 + 3) continue;
      if (i % 3 === 0 && st < 220) put(stones, st++, x, ground(x, z) + 0.2, z, 0.65, 0.4, 0.48, a);
      for (let j = 0; j < 3 && re < 600; j++) {
        const rx = x + Math.sin(j * 2.3) * 0.35,
          rz = z + Math.cos(j * 2.3) * 0.35;
        put(reeds, re++, rx, ground(rx, rz) + 0.42, rz, 0.09, 0.75 + (i % 4) * 0.11, 0.09, a);
      }
    }
    const waterY = ground(p.x, p.z) + 0.17;
    for (let i = 0; i < 12; i++) {
      const a = i * 2.39,
        x = p.x + Math.cos(a) * p.rx * 0.64,
        z = p.z + Math.sin(a) * p.rz * 0.62;
      if ((h.layoutCourse ?? h.courseIndex) !== 0) continue;
      const lily = m("cylinder", "#77966c", x, waterY + 0.018, z, 0.42, 0.018, 0.34);
      lily.castShadow = false;
      if (i % 3 === 0) m("sphere", "#f4d6be", x, waterY + 0.075, z, 0.09, 0.09, 0.09);
    }
  }
  stones.count = st;
  reeds.count = re;
  w.group.add(stones, reeds);
  // The landmark footprint is reserved in the layout's tree placement.
  const x = -100,
    z = -h.length * 0.4,
    y = ground(x, z),
    site = new THREE.Group();
  site.position.set(x, y, z);
  w.group.add(site);
  const sm = (g, c, x, y, z, sx, sy, sz) => m(g, c, x, y, z, sx, sy, sz, site);
  if ((h.layoutCourse ?? h.courseIndex) === 0) {
    sm("box", "#cfb58b", 0, 0.12, 0, 13, 0.24, 9);
    for (const px of [-5, 5]) for (const pz of [-3, 3]) sm("box", "#826744", px, 2.1, pz, 0.25, 4.1, 0.25);
    sm("box", "#eadbc0", 0, 2, -3, 10, 3.6, 0.22);
    sm("box", "#5d806d", 0, 2.3, -2.85, 3.8, 1.3, 0.09);
    const roof = sm("cone", "#627964", 0, 5, 0, 9, 3.1, 7);
    roof.rotation.y = Math.PI / 4;
    for (const px of [-3.5, 3.5]) {
      sm("box", "#8f7555", px, 0.65, 0, 2, 0.12, 0.65);
      for (const dz of [-0.22, 0.22]) sm("box", "#647258", px, 0.32, dz, 1.65, 0.64, 0.07);
    }
    for (let i = 0; i < 5; i++) sm("box", "#b99871", 0, 0.12 - i * 0.12, 5 + i * 0.36, 3, 0.24, 0.36);
    if (h.index === 2)
      for (let i = 0; i < 7; i++) {
        const px = -9 + i * 3,
          zz = 10;
        sm("cylinder", "#997d50", px, 1, zz, 0.16, 2, 0.16);
        sm("sphere", "#7f9b53", px, 2.4, zz, 1.5, 1.6, 1.4);
        for (let j = 0; j < 4; j++)
          sm(
            "sphere",
            "#bc6949",
            px + Math.cos(j * 2) * 1.2,
            2.4 + Math.sin(j) * 0.4,
            zz + Math.sin(j * 2),
            0.12,
            0.13,
            0.12,
          );
      }
  } else if ((h.layoutCourse ?? h.courseIndex) === 1) {
    sm("cylinder", "#aab4a5", 0, 0.3, 0, 6, 0.6, 6);
    sm("cylinder", "#eee5cb", 0, 6, 0, 2.7, 12, 2.7);
    sm("cylinder", "#a45e4c", 0, 7.1, 0, 2.72, 1.2, 2.72);
    sm("cylinder", "#405d5c", 0, 12.3, 0, 3.1, 0.35, 3.1);
    sm("cylinder", "#9abbbc", 0, 13.1, 0, 2.05, 1.45, 2.05);
    sm("cone", "#4d6663", 0, 14.35, 0, 2.9, 1.25, 2.9);
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5;
      sm("cylinder", "#69786b", Math.cos(a) * 3, 12.8, Math.sin(a) * 3, 0.05, 1, 0.05);
    }
    sm("box", "#776a55", 0, 1.2, 2.73, 1.2, 2.4, 0.12);
    for (let i = 0; i < 8; i++) sm("sphere", "#d1c298", -6 - (i % 3) * 3, -1, 8 + i * 2.5, 5, 2.5, 4);
  } else {
    for (const sign of [-1, 1])
      for (let i = 0; i < 4; i++) {
        const rock = sm(
          "sphere",
          ["#b77f63", "#c28e70", "#d49f7b", "#b38770"][i],
          sign * (6 - i * 0.5),
          i * 2.3,
          0,
          3.8 - i * 0.35,
          3.1,
          4.1 - i * 0.3,
        );
        rock.rotation.z = sign * 0.13;
      }
    const lintel = sm("box", "#c99676", 0, 9.1, 0, 11, 2.4, 4.2);
    lintel.rotation.z = 0.06;
    sm("sphere", "#d6ab88", 0, 10.2, 0.1, 5.4, 1.3, 2.3);
    for (let i = 0; i < 12; i++) {
      const a = i * 2.399,
        r = 12 + (i % 3) * 2,
        px = Math.cos(a) * r,
        pz = Math.sin(a) * r;
      sm("sphere", "#be9173", px, 0, pz, 1.1 + (i % 3), 0.8, 1.2);
    }
  }
  // Clean slatted benches, bins and scorecard signs around the tee.
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#e9e1c9";
  ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = "#2f4e3d";
  ctx.font = "bold 27px sans-serif";
  ctx.fillText(h.course.name.toUpperCase(), 28, 46);
  ctx.font = "bold 42px Georgia";
  ctx.fillText(h.name, 28, 110);
  ctx.font = "26px sans-serif";
  ctx.fillText(`HOLE ${h.index + 1}  /  PAR ${h.par}  /  ${h.length} M`, 28, 172);
  ctx.fillRect(28, 194, 456, 2);
  ctx.font = "18px sans-serif";
  ctx.fillText(`POLYGOLF   •   ${golfHoleCount(h.courseIndex)}-HOLE COLLECTION`, 28, 229);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.9, 0.95),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9 }),
  );
  sign.position.set(-5, ground(-5, -2) + 1.45, -1.91);
  sign.userData.ownedMaterial = true;
  w.group.add(sign);
  for (const sx of [-5.8, -4.2]) m("box", "#715c41", sx, ground(sx, -2) + 0.8, -2, 0.075, 1.6, 0.075);
  for (const bx of [-10, 9]) {
    const bz = 8,
      by = ground(bx, bz);
    for (let i = 0; i < 4; i++) m("box", "#b79767", bx, by + 0.51, bz + i * 0.13, 1.8, 0.07, 0.1);
    for (const dx of [-0.65, 0.65]) m("box", "#425d4a", bx + dx, by + 0.25, bz + 0.2, 0.09, 0.5, 0.6);
    m("cylinder", "#536e56", bx + 2.2, by + 0.4, bz, 0.24, 0.8, 0.24);
  }
  // Low stone retaining accents sit beside the path, away from the golfer's line.
  for (let i = 0; i < 42; i++) {
    const pz = -35 - i * 3.2,
      px = 88 + Math.sin(pz * 0.015 + h.seed) * 8,
      py = ground(px, pz);
    m("box", i % 3 ? "#b8b59a" : "#a9ad93", px, py + 0.28, pz, 0.65, 0.56, 2.8);
  }
}
