import * as THREE from '../vendor/three.module.js';
import { terrainHeight, waterLevel } from './golf-courses.js';

// Little visual stories at the edge of play. No decorative prop is a new obstacle.
export function buildCourseVignettes(w,h) {
  if(h.courseIndex!==0)return;
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

  // A family of ridiculous rubber ducks and a tiny sheltered raft in each inland pond.
  if(h.courseIndex!==1)for(const [i,p] of h.water.entries()){
    const sign=p.x<0?-1:1,cx=p.x+sign*p.rx*.18,cz=p.z+p.rz*.12,y=waterLevel(h,p);
    const raft=new THREE.Group();raft.name='duck-raft';raft.position.set(cx,y+.05,cz);group.add(raft);
    const size=Math.min(1.3,p.rx/15,p.rz/12);raft.scale.setScalar(size);
    for(let j=0;j<6;j++)mesh('box','#a18659',-2.4+j*.85,.18,0,.8,.3,4,raft);
    for(const sx of [-2,2])mesh('box','#685c46',sx,-.1,0,.24,.3,4.4,raft);
    mesh('cylinder','#dbc9a0',0,2,0,.07,4,.07,raft);
    const parasol=mesh('cone',i%2?'#e0b678':'#b46f55',0,4.2,0,2.9,1.2,2.9,raft);parasol.rotation.y=.3;
    for(let j=0;j<3;j++){
      const duck=new THREE.Group();duck.name='pond-duck';duck.position.set(cx+sign*(4+j*2.4)*size,y+.08,cz+(j%2?2:-2)*size);duck.rotation.y=-sign*.7;duck.scale.setScalar(size*(j===0?1.3:.8));group.add(duck);
      mesh('sphere','#e5c669',0,.5,0,.95,.62,.68,duck);
      mesh('sphere','#f1d779',.68,1.17,0,.47,.51,.44,duck);
      mesh('box','#d99150',1.1,1.14,0,.5,.18,.3,duck);
      for(const eye of [-1,1])mesh('sphere','#304a42',.88,1.35,eye*.35,.065,.07,.045,duck);
      w.scenicFloaters.push({object:duck,y:y+.08,phase:j*1.8+i});
    }
    w.scenicFloaters.push({object:raft,y:y+.05,phase:i+2});
  }
  // A warm tee lantern makes the night mode feel inhabited without flooding the course.
  const lx=-7,lz=5,ly=w.surfaceHeight?.(lx,lz)??terrainHeight(h,lx,lz);
  mesh('cylinder','#566458',lx,ly+1.2,lz,.07,2.4,.07);
  const pane=mesh('box','#c6d8b4',lx,ly+2.5,lz,.45,.65,.45,group,{emissive:'#ffc570',emissiveIntensity:0});w.nightWindows.push(pane.material);
  mesh('cone','#4c665b',lx,ly+2.95,lz,.5,.32,.5);
  const light=new THREE.PointLight('#ffc478',0,17,2);light.position.set(lx,ly+2.6,lz);group.add(light);w.lanternLights.push(light);
}
