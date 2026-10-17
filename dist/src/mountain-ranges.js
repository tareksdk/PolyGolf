import * as THREE from '../vendor/three.module.js';

// Continuous asymmetric ridges; scenery never changes the playable heightfield.
export function mountainRangeData(h,layer,quality='medium') {
  const segments=quality==='low'?96:176,bands=quality==='low'?8:12,positions=[],colors=[];
  const center=-h.length/2,seed=(h.seed||1)*.137+layer*2.7;
  const scale={garden:.65,meadow:.77,wetland:.7,lookout:1.15,'alpine-pass':1.18,lake:.88}[h.backdrop]||1;
  const inside=[70,490,950][layer],width=[350,490,510][layer];
  const rock=new THREE.Color(['#8b9581','#819397','#91a4b3'][layer]),green=new THREE.Color(h.courseIndex===2?'#747e55':'#68816a'),snow=new THREE.Color(['#e5e6d6','#dce6e3','#ccdde5'][layer]);
  const point=(i,j)=>{
    const a=i/segments*Math.PI*2,t=j/bands,lobes=.7+.17*Math.sin(a*5+seed)+.1*Math.cos(a*9-seed)+.055*Math.sin(a*17+seed);
    const radius=inside+width*t*(1+.065*Math.sin(a*7+t*4+seed));
    const opening=h.backdrop==='lake'&&layer===0?.3+.7*(1-Math.max(0,Math.cos(a))):1;
    const crest=.43+.1*Math.sin(a*3+seed),slope=Math.max(0,1-Math.abs(t-crest)/(t<crest?crest:1-crest));
    const profile=Math.pow(slope,1.15);
    const height=(-14+profile*[72,145,235][layer]*lobes*scale+Math.sin(a*19+t*11+seed)*2.5*Math.sin(t*Math.PI))*opening;
    return [Math.cos(a)*radius,height,center+Math.sin(a)*(radius+h.length*.32)];
  };
  for(let i=0;i<segments;i++)for(let j=0;j<bands;j++){
    const v=[point(i,j),point(i+1,j),point(i,j+1),point(i+1,j+1)];
    for(const tri of [[0,2,1],[1,2,3]]){
      const vertices=tri.map(k=>v[k]),height=vertices.reduce((s,p)=>s+p[1],0)/3;
      const col=rock.clone().lerp(green,Math.max(0,1-height/110)*(1-layer*.32));
      const frost=height-[90,100,145][layer]*scale+Math.sin(i*.42+seed)*12;
      col.lerp(snow,Math.max(0,Math.min(1,frost/32))).multiplyScalar(.94+.08*(.5+.5*Math.sin(i*1.73+j*.7+seed)));
      for(const p of vertices){positions.push(...p);colors.push(col.r,col.g,col.b);}
    }
  }
  return {positions,colors};
}
export function buildMountainRanges(w,h) {
  if(h.courseIndex===1)return;
  const group=new THREE.Group();group.name='layered-mountain-ranges';
  for(let layer=2;layer>=0;layer--){
    const data=mountainRangeData(h,layer,w.settings?.graphics),geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(data.colors,3));geo.computeVertexNormals();
    const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true,side:THREE.DoubleSide});
    const mesh=new THREE.Mesh(geo,material);mesh.userData.ownedMaterial=true;mesh.name='mountain-layer-'+layer;group.add(mesh);
  }
  w.group.add(group);
}
