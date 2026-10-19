import * as THREE from '../vendor/three.module.js';
import { darbyFor } from './course-features.js';
import { kitMesh } from './sky-islands.js';
import { terrainHeight } from './golf-courses.js';
export function buildDarby(w,h){
 w.darby=null;const spot=darbyFor(h);if(!spot)return;
 const root=new THREE.Group();root.name='Darby the black Labrador';root.userData.dynamic=true;root.position.set(spot.x,spot.y,spot.z);root.rotation.y=-.4;w.group.add(root);
 const body=kitMesh(w,'darby-body',root),head=kitMesh(w,'darby-head',root);
 const pivot=new THREE.Group();pivot.position.set(0,1,-.7);root.add(pivot);const tail=kitMesh(w,'darby-tail',pivot);if(tail)tail.position.set(0,-1,.7);
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=80;const ctx=canvas.getContext('2d');ctx.fillStyle='#173d32';ctx.beginPath();ctx.roundRect(5,5,246,70,18);ctx.fill();ctx.fillStyle='#f5e8b6';ctx.font='bold 34px sans-serif';ctx.textAlign='center';ctx.fillText('Darby',128,51);
 const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;const material=new THREE.SpriteMaterial({map,depthTest:true});const tag=new THREE.Sprite(material);tag.userData.ownedMaterial=true;tag.position.set(0,2.5,0);tag.scale.set(2.1,.65,1);root.add(tag);
 w.darby={root,pivot,head,spot,fetchTime:0};
}
export function installDarby(ui){
 const w=ui.world,update=w.update.bind(w),event=ui.game.onEvent;
 w.update=(dt,ball,physics)=>{
  if(w.darby){const d=w.darby;d.pivot.rotation.y=Math.sin(w.clock*8)*(d.fetchTime>0?.55:.17);
   if(d.fetchTime>0){d.fetchTime=Math.max(0,d.fetchTime-dt);const t=1-d.fetchTime/4,f=Math.sin(t*Math.PI);d.root.position.x=d.spot.x+(d.target.x-d.spot.x)*f;d.root.position.z=d.spot.z+(d.target.z-d.spot.z)*f;d.root.position.y=terrainHeight(w.hole,d.root.position.x,d.root.position.z)+Math.abs(Math.sin(w.clock*11))*.035;d.root.rotation.y=Math.atan2(d.target.x-d.spot.x,d.target.z-d.spot.z)+(t>.5?Math.PI:0);}
  }return update(dt,ball,physics);
 };
 ui.game.onEvent=name=>{event(name);if(name==='darby'&&w.darby){w.darby.target={...ui.game.physics.ball};w.darby.fetchTime=4;ui.toast('Darby found your ball! What a good dog.');}};
}
