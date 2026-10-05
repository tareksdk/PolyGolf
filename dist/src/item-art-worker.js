import * as THREE from '../vendor/three.module.js';
import { renderItemArt } from './item-art.js';

// A dedicated offscreen studio leaves the menu and game canvas on the UI thread.
const context = {
  geometries: {
    box:new THREE.BoxGeometry(1,1,1), sphere:new THREE.IcosahedronGeometry(1,1),
    round:new THREE.SphereGeometry(1,24,16), cylinder:new THREE.CylinderGeometry(1,1,1,12), cone:new THREE.ConeGeometry(1,1,7),
  },
  materials:new Map(),
  mat(color, extra = {}) {
    const key = color + JSON.stringify(extra);
    if (!this.materials.has(key)) this.materials.set(key, new THREE.MeshStandardMaterial({color, roughness:.85, ...extra}));
    return this.materials.get(key);
  },
  mesh(geo, color, x=0, y=0, z=0, sx=1, sy=1, sz=1, parent, extra={}) {
    const m = new THREE.Mesh(typeof geo === 'string' ? this.geometries[geo] : geo, this.mat(color,extra));
    m.position.set(x,y,z); m.scale.set(sx,sy,sz); parent.add(m); return m;
  },
};
self.onmessage = async ({data}) => {
  try {self.postMessage({blob:await renderItemArt(context, data.item, {blob:true})});}
  catch (error) {self.postMessage({error:error.message});}
};
