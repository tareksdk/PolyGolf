import * as THREE from '../vendor/three.module.js';
import { artCanvas } from './art-canvas.js';

// Shared artwork for the enamel ball and the woven celebration flag.
export function drawIsraelFlag(c, x, y, width, height, {cloth = true} = {}) {
  c.save();
  c.translate(x, y);
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, width, height);
  c.fillStyle = '#0038b8';
  for (const top of [.15, .725]) c.fillRect(0, height * top, width, height * .125);
  c.strokeStyle = '#0038b8';
  c.lineWidth = height * .018;
  c.lineJoin = 'miter';
  for (const turn of [-Math.PI / 2, Math.PI / 2]) {
    c.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = turn + i * Math.PI * 2 / 3;
      const px = width / 2 + Math.cos(a) * height * .205;
      const py = height / 2 + Math.sin(a) * height * .205;
      i ? c.lineTo(px, py) : c.moveTo(px, py);
    }
    c.closePath(); c.stroke();
  }
  // Fine warp/weft threads and a double stitched hem stay subtle at game scale.
  if (cloth) {
    c.fillStyle = '#193e7710';
    for (let i = 0; i < width; i += 4) c.fillRect(i, 0, 1, height);
    c.fillStyle = '#ffffff25';
    for (let i = 0; i < height; i += 4) c.fillRect(0, i, width, 1);
    c.strokeStyle = '#b5c3d2'; c.lineWidth = 1;
    c.setLineDash([4, 4]);
    for (const inset of [5, 10]) c.strokeRect(inset, inset, width - inset * 2, height - inset * 2);
  }
  c.restore();
}

export function israelTexture(ball = false) {
  const canvas = artCanvas(ball ? 2048 : 1320, ball ? 1024 : 960);
  const c = canvas.getContext('2d');
  if (ball) {
    // Repeat on opposite hemispheres so the emblem stays visible as the ball rolls.
    for (let i = 0; i < 2; i++) drawIsraelFlag(c, i * 1024, 0, 1024, 1024, {cloth: false});
  } else drawIsraelFlag(c, 0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function israelBallFinish(world, parent, radius) {
  const geometry = world.geometries.golf || new THREE.SphereGeometry(1, 96, 64);
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
    map: israelTexture(true), roughness: .34, metalness: .04,
    polygonOffset: true, polygonOffsetFactor: -1,
  }));
  mesh.name = 'israel-flag-enamel';
  mesh.scale.setScalar(radius * 1.001);
  mesh.userData.ownedMaterial = true;
  parent.add(mesh);
  return mesh;
}
