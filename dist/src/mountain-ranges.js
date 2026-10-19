import * as THREE from '../vendor/three.module.js';

// Continuous asymmetric ridges; scenery never changes the playable heightfield.
export function mountainRangeData(h,layer,quality='medium') {
  const segments=quality==='low'?96:176,bands=quality==='low'?8:12,positions=[],colors=[];
  const center=-h.length/2,seed=(h.seed||1)*.137+layer*2.7;
  const scale={garden:.65,meadow:.77,wetland:.7,lookout:1.15,'alpine-pass':1.18,lake:.88}[h.backdrop]||1;
  const inside=[70,490,950][layer],width=[350,490,510][layer];
  const rock=new THREE.Color(['#8b9581','#819397','#91a4b3'][layer]),green=new THREE.Color((h.layoutCourse ?? h.courseIndex) === 2?'#747e55':'#68816a'),snow=new THREE.Color(['#e5e6d6','#dce6e3','#ccdde5'][layer]);
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
  if((h.layoutCourse ?? h.courseIndex) === 1)return;
  const group=new THREE.Group();group.name='layered-mountain-ranges';
  for(let layer=2;layer>=0;layer--){
    const data=mountainRangeData(h,layer,w.settings?.graphics),geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(data.colors,3));geo.computeVertexNormals();
    const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true,side:THREE.DoubleSide});
    const mesh=new THREE.Mesh(geo,material);mesh.userData.ownedMaterial=true;mesh.name='mountain-layer-'+layer;group.add(mesh);
  }
  w.group.add(group);
}

// Height of the nearest mountain layer above the course, or -Infinity where
// there is none. Course props use it so nothing is buried in, or pokes
// through, a mountainside. Built from the same triangles the player sees.
export function mountainSurface(h,quality='medium') {
  if((h.layoutCourse ?? h.courseIndex) === 1)return null;
  const p=mountainRangeData(h,0,quality).positions,cell=5,x0=-300,z0=160,nx=121,nz=Math.ceil((h.length+460)/cell)+1;
  const grid=new Float32Array(nx*nz).fill(-Infinity);
  for(let k=0;k<p.length;k+=9){
    const ax=p[k],ay=p[k+1],az=p[k+2],bx=p[k+3],by=p[k+4],bz=p[k+5],cx=p[k+6],cy=p[k+7],cz=p[k+8];
    if(Math.max(ay,by,cy)<-13)continue;
    const den=(bz-cz)*(ax-cx)+(cx-bx)*(az-cz);if(Math.abs(den)<1e-9)continue;
    const i0=Math.max(0,Math.ceil((Math.min(ax,bx,cx)-x0)/cell)),i1=Math.min(nx-1,Math.floor((Math.max(ax,bx,cx)-x0)/cell));
    const j0=Math.max(0,Math.ceil((z0-Math.max(az,bz,cz))/cell)),j1=Math.min(nz-1,Math.floor((z0-Math.min(az,bz,cz))/cell));
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){
      const x=x0+i*cell,z=z0-j*cell,u=((bz-cz)*(x-cx)+(cx-bx)*(z-cz))/den,v=((cz-az)*(x-cx)+(ax-cx)*(z-cz))/den;
      if(u<-1e-6||v<-1e-6||u+v>1+1e-6)continue;
      const y=u*ay+v*by+(1-u-v)*cy,n=j*nx+i;if(y>grid[n])grid[n]=y;
    }
  }
  return (x,z)=>{
    const fx=(x-x0)/cell,fz=(z0-z)/cell,i=Math.floor(fx),j=Math.floor(fz);
    if(i<0||j<0||i>=nx-1||j>=nz-1)return -Infinity;
    const u=fx-i,v=fz-j,a=grid[j*nx+i],b=grid[j*nx+i+1],c=grid[(j+1)*nx+i],d=grid[(j+1)*nx+i+1];
    if(![a,b,c,d].every(Number.isFinite))return Math.max(a,b,c,d);
    return (a*(1-u)+b*u)*(1-v)+(c*(1-u)+d*u)*v;
  };
}
