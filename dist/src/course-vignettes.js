import * as THREE from '../vendor/three.module.js';
import { terrainHeight } from './golf-courses.js';

// Little visual stories at the edge of play. No decorative prop is a new obstacle.
export function buildCourseVignettes(w,h) {
  if((h.course.layoutCourse??h.courseIndex)!==0)return;
  const group=new THREE.Group();group.name='course-vignettes';w.group.add(group);
  w.nightWindows=[];w.lanternLights=[];w.scenicFloaters=[];
  const mesh=(g,c,x,y,z,sx,sy,sz,parent=group,extra={})=>w.mesh(g,c,x,y,z,sx,sy,sz,parent,extra);
  const window=(parent,x,y,z,sx,sy,sz)=>{
    const pane=mesh('box','#b3d3cc',x,y,z,sx,sy,sz,parent,{emissive:'#ffb64f',emissiveIntensity:0});
    w.nightWindows.push(pane.material);return pane;
  };
  // A crooked little hillside cabin beyond the back boundary, visible above the trees.
  const side=h.index%2?-1:1,x=side*(55+(h.index%3)*22),z=-h.length-150;
  const base=-3,site=new THREE.Group();site.name='hillside-cabin';site.position.set(x,base,z);site.rotation.y=side*.5;group.add(site);
  const m=(g,c,x,y,z,sx,sy,sz,extra)=>mesh(g,c,x,y,z,sx,sy,sz,site,extra);
  m('sphere',h.courseIndex===2?'#9c9b6a':'#809269',0,-1,0,23,13,23);
  m('sphere','#9ba18b',-14,-3,3,12,11,11);
  const colors=['#d5b57d','#d7ba9a','#bdc5a0','#dbc78f'];
  m('box',colors[h.index%4],0,13,0,10,8,8);
  const roof=m('cone',['#8a6657','#5a7b76','#916d53'][h.index%3],0,19,0,9,7,7.5);roof.rotation.y=Math.PI/4;roof.rotation.z=side*.05;
  m('box','#6e6a5e',2.5,20,-1.5,1.15,6,1.2);
  m('box','#56483b',0,11.7,4.08,1.8,5,.14);
  for(const wx of [-3,3]){window(site,wx,14,4.08,1.65,2,.15);m('box','#eee1bc',wx,14,4.2,.12,2.1,.14);}
  window(site,-5.05,14,0,.12,2,2);
  for(let i=0;i<5;i++)m('box','#d3c6a5',0,9-i*.8,5+i*.8,3,.8,1.2);
  // A precarious stack with a tiny pennant, deliberately a little absurd.
  const cairn=new THREE.Group();cairn.name='balancing-rocks';cairn.position.set(-side*65,terrainHeight(h,-side*65,-h.length-110)-2,-h.length-110);group.add(cairn);
  for(let i=0;i<5;i++){
    const r=mesh('sphere',['#a3aaa0','#b8b4a1','#8c9b97'][i%3],Math.sin(i*1.9)*.65,i*2.05,Math.cos(i)*.4,4.6-i*.65,1.65,3.6-i*.48,cairn);
    r.rotation.set(.1*i,.7*i,.13*Math.sin(i*2));
  }
  mesh('cylinder','#d5c7a0',0,12,0,.09,5,.09,cairn);
  const flag=mesh('box','#d79a66',1,14,0,2,.9,.08,cairn);flag.rotation.z=.15;

  // A warm tee lantern makes the night mode feel inhabited without flooding the course.
  const lx=-7,lz=5,ly=w.surfaceHeight?.(lx,lz)??terrainHeight(h,lx,lz);
  mesh('cylinder','#566458',lx,ly+1.2,lz,.07,2.4,.07);
  const pane=mesh('box','#c6d8b4',lx,ly+2.5,lz,.45,.65,.45,group,{emissive:'#ffc570',emissiveIntensity:0});w.nightWindows.push(pane.material);
  mesh('cone','#4c665b',lx,ly+2.95,lz,.5,.32,.5);
  const light=new THREE.PointLight('#ffc478',0,17,2);light.position.set(lx,ly+2.6,lz);group.add(light);w.lanternLights.push(light);
}
