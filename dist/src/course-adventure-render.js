import * as THREE from '../vendor/three.module.js';
import { terrainHeight, coastBounds, coastWaterLevel } from './golf-courses.js';

export function buildLongCourseScenery(w,h) {
  w.courseAdventure=null;
  if(![15,16].includes(h.courseIndex)||h.index<3)return;
  const root=new THREE.Group();root.name='long-course-story';w.group.add(root);
  const part=(g,c,x,y,z,sx,sy,sz,parent=root)=>w.mesh(g,c,x,y,z,sx,sy,sz,parent);
  const ground=(x,z)=>terrainHeight(h,x,z),coast=h.layoutCourse===1;
  const rock=coast?'#9fa78f':'#9a978b',wood='#91633f',gold='#edc87b';
  const house=(x,y,z,s=1,color='#d5b991')=>{
    const g=new THREE.Group();g.position.set(x,y,z);g.scale.setScalar(s);root.add(g);
    part('box',color,0,3,0,7,6,6,g);const roof=part('cone','#6b776e',0,7,0,6,3.8,5,g);roof.rotation.y=Math.PI/4;
    part('box','#574b39',0,1.5,3.05,1.3,3,.15,g);for(const x of [-2,2])part('box','#ffe4a2',x,3.7,3.07,1.4,1.5,.15,g);
    return g;
  };
  // Quiet settlements stay well outside the playable strip; no props sit in play or in water.
  const vignette=h.vignette;
  if(vignette==='harbour'){
    for(let i=0;i<9;i++){
      const z=-180-i*22,x=coastBounds(h,z)[1]+70+i%3*15;
      const g=house(x,coastWaterLevel(h)+8,z,.9,['#d88968','#8ba99d','#dbc781'][i%3]);
      for(const dx of [-2.5,2.5])part('cylinder',wood,dx,-5,0,.25,14,.25,g);
    }
  }else if(vignette==='crown'){
    for(let i=0;i<7;i++)house(-65+i*20,10+i%3*3,-h.length-100-i%2*15,1.1,['#d7a45f','#b28b70','#d1bd91'][i%3]);
    for(const x of [-90,90]){const y=ground(x,-h.length-45);part('cylinder',rock,x,y+14,-h.length-45,6,28,6);part('cone','#6a7864',x,y+32,-h.length-45,9,11,9);}
  }else if(vignette){
    const x=coast?-58:58,z=-h.length*.7,y=ground(x,z);house(x,y,z,1.3);
    part('cylinder',wood,x+12,y+8,z,1,16,1);part('cone',gold,x+12,y+14,z,3,5,3);
    if(vignette==='cannons'){const cannon=part('cylinder','#42595c',x+13,y+3,z+12,2,11,2);cannon.rotation.x=Math.PI/2;}
  }
}

export function installCourseAdventures(ui) {
  const w=ui.world,load=w.load.bind(w);
  w.load=h=>{w.courseAdventure=null;return load(h);};
}
