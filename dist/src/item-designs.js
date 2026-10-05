import * as THREE from "../vendor/three.module.js";
import { artCanvas } from './art-canvas.js';

// Shared decorative meshes. These never participate in collision or shot calculations.
export function ballFinish(w, item, parent, r = 1) {
  const group = new THREE.Group();
  parent.add(group);
  if (item.finish) return group;
  const color = item.pattern || item.color,
    d = item.design || 0;
  if (["skull", "pumpkin", "ghost"].includes(item.motif)) {
    // A conforming surface decal: no floating plates or intersecting decorations.
    const canvas = artCanvas(256, 256);
    const c=canvas.getContext('2d');c.fillStyle='#273b42';
    if(item.motif==='pumpkin') {
      c.fillStyle=item.pattern||'#273b32';
      for(const x of [88,168]){c.beginPath();c.moveTo(x-23,104);c.lineTo(x+23,104);c.lineTo(x,65);c.closePath();c.fill();}
      c.beginPath();c.moveTo(128,114);c.lineTo(114,136);c.lineTo(142,136);c.fill();
      c.beginPath();c.moveTo(49,154);c.lineTo(78,183);c.lineTo(113,196);c.lineTo(148,196);c.lineTo(183,179);c.lineTo(207,153);c.lineTo(164,170);c.lineTo(153,157);c.lineTo(138,175);c.lineTo(115,174);c.lineTo(99,158);c.lineTo(86,169);c.closePath();c.fill();
    } else if(item.motif==='ghost') {
      c.fillStyle='#31434a';for(const x of [92,164]){c.beginPath();c.ellipse(x,102,17,28,0,0,Math.PI*2);c.fill();}c.beginPath();c.ellipse(128,167,25,30,0,0,Math.PI*2);c.fill();
    } else {
    c.save();c.translate(128,170);
    for(const angle of [-0.45,0.45]){c.save();c.rotate(angle);c.fillRect(-83,-9,166,18);for(const x of [-83,83])for(const y of [-7,7]){c.beginPath();c.arc(x,y,11,0,Math.PI*2);c.fill();}c.restore();}c.restore();
    c.beginPath();c.ellipse(128,98,59,54,0,0,Math.PI*2);c.fill();c.fillRect(94,125,68,30);
    c.globalCompositeOperation='destination-out';for(const x of [105,151]){c.beginPath();c.ellipse(x,100,14,17,0,0,Math.PI*2);c.fill();}c.beginPath();c.moveTo(128,116);c.lineTo(120,130);c.lineTo(136,130);c.fill();for(const x of [110,127,144])c.fillRect(x,143,5,13);
    }
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const positions=[],uv=[],indices=[],n=20;
    for(let y=0;y<=n;y++)for(let x=0;x<=n;x++){const px=(x/n-.5)*1.25,py=(y/n-.5)*1.25;positions.push(px*r,py*r,Math.sqrt(Math.max(0,1-px*px-py*py))*r*1.007);uv.push(x/n,y/n);}
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){const a=y*(n+1)+x;indices.push(a,a+1,a+n+1,a+1,a+n+2,a+n+1);}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
    const decal=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({map:texture,transparent:true,roughness:1,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));decal.userData.ownedMaterial=true;group.add(decal);return group;
  }
  const ring = (angle, offset = 0) => {
    const ring = w.mesh(
      new THREE.TorusGeometry(r * 1.008, r * 0.025, 5, 36),
      color,
      0,
      offset,
      0,
      1,
      1,
      1,
      group,
    );
    ring.rotation.x = angle;
    return ring;
  };
  if (item.pattern) {
    if (d === 0 || d === 3) {
      ring(Math.PI / 2);
      if (d === 3) {
        ring(Math.PI / 2, r * 0.17).scale.setScalar(0.985);
        ring(Math.PI / 2, -r * 0.17).scale.setScalar(0.985);
      }
    } else if (d === 1 || d === 4) {
      ring(Math.PI / 2);
      ring(0);
      if (d === 4) ring(Math.PI / 3);
    } else if (d === 2 || d === 6) {
      for (let i = 0; i < 12; i++) {
        const y = 1 - (i + 0.5) / 6,
          a = i * 2.4,
          q = Math.sqrt(1 - y * y);
        w.mesh(
          d === 2 ? "sphere" : "box",
          color,
          Math.cos(a) * q * r,
          y * r,
          Math.sin(a) * q * r,
          r * 0.08,
          r * 0.08,
          r * 0.08,
          group,
        );
      }
    } else if (d === 5) {
      for (const x of [-1, 1]) {
        const mark = w.mesh("box", color, x * r * 0.17, 0, r * 0.99, r * 0.07, r * 0.42, r * 0.025, group);
        mark.rotation.z = x * -0.35;
      }
      w.mesh("box", color, 0, -r * 0.03, r * 1.005, r * 0.24, r * 0.05, r * 0.025, group);
      ring(Math.PI / 2);
    } else {
      ring(Math.PI / 4);
      ring(-Math.PI / 4);
    }
  }
  return group;
}
