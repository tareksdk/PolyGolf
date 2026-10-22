import * as THREE from '../vendor/three.module.js';
import { terrainHeight, pathDistance, fairwayWidth } from './golf-courses.js';
import { lavaSample } from './volcanic-layouts.js';

const TAU=Math.PI*2;
const noise=(i,seed=0)=>{const n=Math.sin(i*127.1+seed*311.7)*43758.5453;return n-Math.floor(n);};
const palette=['#38363a','#474448','#555153','#625a55','#766c60'];
function lavaMaterial(channels=null) {
  const mask=channels?channels.flatMap(path=>path.slice(1).map((b,i)=>{
    const a=path[i];return `d=min(d,channel(p,vec3(${a.map(n=>n.toFixed(2)).join(',')}),vec3(${b.map(n=>n.toFixed(2)).join(',')})));`;
  })).join('\n'):'';
  return new THREE.ShaderMaterial({uniforms:{time:{value:0},vertical:{value:0}},side:THREE.DoubleSide,
    vertexShader:`uniform float vertical;varying vec2 vWorld;void main(){vec4 p=modelMatrix*vec4(position,1.0);vWorld=mix(p.xz,vec2(p.x,-p.y),vertical);gl_Position=projectionMatrix*viewMatrix*p;}`,
    fragmentShader:`uniform float time;varying vec2 vWorld;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
      float channel(vec2 p,vec3 a,vec3 b){vec2 v=b.xy-a.xy;float t=clamp(dot(p-a.xy,v)/dot(v,v),0.,1.);return length(p-a.xy-v*t)-mix(a.z,b.z,t);}
      void main(){vec2 p=vWorld;float d=-1.;${channels?'d=10000.;'+mask+'if(d>.24)discard;':''}
        vec2 flow=p*.16+vec2(time*.08,-time*.14);
        float n=noise(flow)+.45*noise(flow*2.1+3.7);
        float river=sin(p.x*.31+p.y*.16+2.8*n-time*.8);
        float hot=pow(1.-abs(river),5.);
        float crust=smoothstep(.94,1.18,n)*(1.-hot*.8);
        vec3 c=mix(vec3(1.,.19,.012),vec3(1.,.71,.08),hot);
        c=mix(c,vec3(.22,.055,.023),crust*.88);
        c+=vec3(.1,.05,0.)*smoothstep(.78,.98,sin(p.y*.8+n*6.-time));
        c=mix(c,vec3(.92,.27,.025),smoothstep(4.,18.,length(fwidth(p)))*.85);
        gl_FragColor=vec4(c,1.);
        #include <colorspace_fragment>
      }`});
}

function meshGeometry(points,colors=null) {
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
  if(colors)g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;
}
function lavaChannelGeometry(channels,y){
  // Bound the shader to the river ribbons. The analytical mask still trims
  // their exact edges, but no lava shader runs underneath the entire fairway.
  const points=[],vertex=(x,z)=>[x,y,z];
  for(const path of channels){
    for(let i=1;i<path.length;i++){
      const a=path[i-1],b=path[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),nx=-dz/len,nz=dx/len;
      const q=[vertex(a[0]+nx*(a[2]+.4),a[1]+nz*(a[2]+.4)),vertex(a[0]-nx*(a[2]+.4),a[1]-nz*(a[2]+.4)),vertex(b[0]+nx*(b[2]+.4),b[1]+nz*(b[2]+.4)),vertex(b[0]-nx*(b[2]+.4),b[1]-nz*(b[2]+.4))];
      for(const k of [0,1,2,1,3,2])points.push(...q[k]);
    }
    for(const [x,z,r] of path)for(let i=0;i<24;i++){
      const a=i*TAU/24,b=(i+1)*TAU/24;
      points.push(...vertex(x,z),...vertex(x+Math.cos(a)*(r+.4),z+Math.sin(a)*(r+.4)),...vertex(x+Math.cos(b)*(r+.4),z+Math.sin(b)*(r+.4)));
    }
  }
  return meshGeometry(points);
}
function crystalGeometry(){
  const p=[];
  for(let i=0;i<6;i++){
    const a=i*TAU/6,b=(i+1)*TAU/6,lo=[Math.cos(a)*.43,0,Math.sin(a)*.43],lb=[Math.cos(b)*.43,0,Math.sin(b)*.43],hi=[lo[0],.68,lo[2]],hb=[lb[0],.68,lb[2]];
    p.push(...lo,...lb,...hi,...hi,...lb,...hb,...hi,...hb,0,1,0);
  }
  return meshGeometry(p);
}

export function buildVolcanicScenery(w,h) {
  const low=w.settings?.graphics==='low',root=new THREE.Group();root.name='cinder-crown-scenery';w.group.add(root);
  const dummy=new THREE.Object3D();
  const makeBatch=(g,material,count,name)=>{const m=new THREE.InstancedMesh(g,material,count);m.name=name;m.count=0;root.add(m);return m;};
  const place=(batch,x,y,z,sx,sy,sz,angle=0,color=null,lean=0)=>{
    if(batch.count>=batch.instanceMatrix.count)return;
    dummy.position.set(x,y,z);dummy.rotation.set(lean,angle,lean*.4);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();batch.setMatrixAt(batch.count,dummy.matrix);
    if(color)batch.setColorAt(batch.count,new THREE.Color(color));batch.count++;
  };
  const ground=(x,z)=>terrainHeight(h,x,z);
  const basalt=new THREE.CylinderGeometry(.84,1,1,6,1),
    columns=makeBatch(basalt,w.mat('#ffffff',{flatShading:true,roughness:1}),950,'basalt-terraces'),
    rubble=makeBatch(new THREE.DodecahedronGeometry(1,0),w.mat('#ffffff',{flatShading:true,roughness:1}),850,'volcanic-rubble'),
    crystals=makeBatch(crystalGeometry(),w.mat('#e8b737',{flatShading:true,roughness:.48,metalness:.08}),330,'sulphur-crystals');
  columns.castShadow=columns.receiveShadow=true;rubble.receiveShadow=true;crystals.castShadow=true;
  const glintSites=[];
  // Clusters stay out of shot corridors. Large columns form broken terraces;
  // smaller chips and crystals connect them to the ash, rather than floating.
  for(let i=0;i<(low?190:320);i++){
    const z=65-noise(i,5)*(h.length+155),x=(i%2?1:-1)*(30+noise(i,9)*153);
    const clearance=pathDistance(h,x,z)-fairwayWidth(h,Math.max(0,Math.min(1,-z/h.length)))/2;
    if(clearance<12||Math.hypot(x-h.cup.x,z-h.cup.z)<29||lavaSample(h,x,z).edge<7)continue;
    const size=1.8+noise(i,7)*5.4,y=ground(x,z),height=size*(i%7===0?2.4:.65+noise(i,14)*.9);
    if(i%3===0)place(columns,x,y+height*.42,z,size,height,size*.84,i*.71,palette[i%palette.length],(noise(i,45)-.5)*.19);
    else place(rubble,x,y+height*.35,z,size,height*.68,size*.84,i*.71,palette[i%palette.length],.15);
    if(i%3===0)place(rubble,x+size*.9,y+height*.16,z+size*.7,size*.8,height*.55,size*.7,i*.3,palette[(i+1)%5]);
    for(let j=0;j<2;j++){const px=x+Math.cos(j*2.8+i)*size*1.6,pz=z+Math.sin(j*2.8+i)*size*1.6;if(lavaSample(h,px,pz).edge>4)place(rubble,px,ground(px,pz)+.3,pz,1.2,.9,1,i+j,palette[(i+j)%5]);}
    if(i%3===0){
      const px=x-size*1.2,pz=z+size*.8;if(lavaSample(h,px,pz).edge<5)continue;
      for(let j=0;j<3;j++)place(crystals,px+j*.5,ground(px+j*.5,pz),pz+(j%2)*.4,1.5,2.2+j*.9,1.5,j, null,(j-1)*.24);
      if(glintSites.length<24)glintSites.push([px+.5,ground(px,pz)+3.8,pz]);
    }
  }
  // Two deliberate foreground outcrops echo the gold formations in the
  // reference paintings and frame the opening shot without hiding the fairway.
  for(const [x,z] of [[-34,-25],[44,-37]]){
    for(let j=0;j<5;j++){
      const px=x+(j-2)*1.1,pz=z+Math.sin(j*1.8)*1.4;
      place(crystals,px,ground(px,pz),pz,2.1,3.2+(j%3)*1.5,2.1,j*.8,null,(j-2)*.15);
    }
    glintSites.unshift([x,ground(x,z)+6,z]);
  }
  glintSites.length=Math.min(24,glintSites.length);
  // Jagged basalt lips trace both sides of each channel. The playable edge is
  // the shared heightfield, not an invisible decoration collider.
  for(const channel of h.lavaChannels)for(let j=1;j<channel.length;j++){
    const a=channel[j-1],b=channel[j],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);
    for(let t=0;t<1;t+=5.5/len)for(const side of [-1,1]){
      const r=a[2]+(b[2]-a[2])*t+4.8,x=a[0]+dx*t-dz/len*r*side,z=a[1]+dz*t+dx/len*r*side;
      if(lavaSample(h,x,z).edge<4||columns.count>=950)continue;
      const top=ground(x,z)+.15,bottom=h.lavaLevel-1.4,size=2.8+noise(x,z)*1.2;
      place(columns,x,(top+bottom)/2,z,size,Math.max(1,top-bottom),size*.8,x,palette[Math.abs(Math.floor(x))%5]);
    }
  }
  const lava=new THREE.Mesh(lavaChannelGeometry(h.lavaChannels,h.lavaLevel),lavaMaterial(h.lavaChannels));
  lava.name='playable-lava';lava.userData.ownedMaterial=true;root.add(lava);
  const distantLava=new THREE.Mesh(new THREE.PlaneGeometry(2300,2600),lavaMaterial());
  distantLava.rotation.x=-Math.PI/2;distantLava.position.set(0,-16,-h.length/2);distantLava.name='distant-lava-field';distantLava.userData.ownedMaterial=true;root.add(distantLava);
  // Broken perimeter shelves conceal the heightfield's straight outer seam.
  const rim=[];
  for(let x=-208;x<=208;x+=24){rim.push([x,100],[x,-h.length-120]);}
  for(let z=80;z>-h.length-110;z-=26)rim.push([-208,z],[208,z]);
  for(const [i,[x,z]] of rim.entries()){
    if(lavaSample(h,x,z).edge<22)continue;
    const top=ground(x,z)+.3+noise(i,81)*1.2,bottom=-17,size=14+noise(i,83)*7;
    place(columns,x,(top+bottom)/2,z,size,top-bottom,size*.8,i*.46,palette[i%5]);
  }
  // Low mesas layer the distant lava field toward the horizon.
  for(let i=0;i<180;i++){
    const angle=i*2.39996,dist=280+noise(i,27)*850,x=Math.cos(angle)*dist,z=-h.length*.5+Math.sin(angle)*(dist+h.length*.25);
    const sx=22+noise(i,31)*74,sy=12+noise(i,17)*31;
    place(columns,x,-14+sy*.5,z,sx,sy,sx*.65,i*.27,palette[i%5]);
  }
  const eruptionSites=[],jets=[];
  for(const [v,[x,z,height,radius]] of h.volcanoes.entries()){
    const points=[],colors=[],segments=22;
    const radii=[1,.78,.53,.27,.21,.16],heights=[-9,height*.15,height*.46,height*.88,height,height*.83];
    const ring=(i,j)=>{const a=i/segments*TAU,r=radius*radii[j]*(1+.13*Math.sin(a*5+v)+.06*Math.cos(a*9+j*.6));return [x+Math.cos(a)*r,heights[j]+(j?Math.sin(a*7)*height*.04:0),z+Math.sin(a)*r];};
    for(let j=0;j<radii.length-1;j++)for(let i=0;i<segments;i++){
      const shade=new THREE.Color(palette[(i+j)%4]);
      for(const p of [ring(i,j),ring(i+1,j),ring(i,j+1),ring(i+1,j),ring(i+1,j+1),ring(i,j+1)]){points.push(...p);colors.push(shade.r,shade.g,shade.b);}
    }
    const mountain=new THREE.Mesh(meshGeometry(points,colors),w.mat('#fff',{vertexColors:true,flatShading:true,roughness:1,side:THREE.DoubleSide}));mountain.name='erupting-volcano';root.add(mountain);
    const crater=w.mesh('cylinder','#ff8923',x,height*.85,z,radius*.2,1,radius*.2,root,{emissive:'#ff5211',emissiveIntensity:2.2});crater.castShadow=false;
    // Narrow glowing veins descend the face of each volcano in broken ribbons.
    const face=(a,j)=>{const t=((a/TAU*segments)%segments+segments)%segments,i=Math.floor(t),u=t-i,A=ring(i,j),B=ring(i+1,j);return [A[0]+(B[0]-A[0])*u,A[1]+(B[1]-A[1])*u+2,A[2]+(B[2]-A[2])*u];};
    for(let stream=0;stream<9;stream++){
      const p=[];for(let j=0;j<4;j++){
        const a=stream*TAU/9+.22+.08*Math.sin(j*1.7),b=stream*TAU/9+.22+.08*Math.sin((j+1)*1.7);
        const q=[face(a-.023,j),face(a+.023,j),face(b-.035,j+1),face(b+.035,j+1)];
        for(const k of [0,1,2,1,3,2])p.push(...q[k]);
      }
      const vein=new THREE.Mesh(meshGeometry(p),w.mat('#ff9c2c',{emissive:'#ff5511',emissiveIntensity:1.8,side:THREE.DoubleSide}));root.add(vein);
    }
    const jet=new THREE.Group();jet.position.set(x,height*.86,z);jet.userData.dynamic=true;root.add(jet);
    for(let i=0;i<5;i++){
      const flame=w.mesh('cone',i%2?'#ffc42a':'#ff7416',Math.sin(i*2.4)*radius*.07,10+(i%3)*4,Math.cos(i*2.4)*radius*.07,4+i%2,28+i*2,4,jet,{emissive:i%2?'#ffa51b':'#ff5010',emissiveIntensity:2});
      flame.rotation.z=Math.sin(i)*.24;flame.castShadow=false;
    }
    jets.push(jet);
    eruptionSites.push({x,y:height*.93,z,scale:radius/80});
  }
  // A little hot-springs clubhouse, a bench and the absurdly large kettle.
  const hut=new THREE.Group();hut.position.set(-25,ground(-25,12),12);hut.rotation.y=.25;root.add(hut);
  const m=(g,c,x,y,z,sx,sy,sz,parent=hut,extra={})=>w.mesh(g,c,x,y,z,sx,sy,sz,parent,extra);
  m('box','#6d5541',0,1.8,0,8,3.6,5);m('box','#c6a466',0,3.4,2.55,8,.6,.2);
  const roof=m('cone','#3d3d42',0,4.8,0,6.7,2.4,5);roof.rotation.y=Math.PI/4;
  m('box','#f5be4a',0,2.05,2.56,5,1.3,.15);m('box','#332b27',0,1,2.66,5,.12,1);
  for(const x of [-3,3]){m('box','#a9854d',x,.7,4.3,2,.2,.9);for(const dx of [-.65,.65])m('box','#4f4640',x+dx,.3,4.3,.15,.6,.7);}
  m('cylinder','#4d4848',2.5,5.2,-1,.7,3,.7);eruptionSites.push({x:-22.8,y:hut.position.y+6.8,z:11.5,scale:.09});
  const kettle=new THREE.Group();kettle.position.set(42,ground(42,10),10);kettle.rotation.y=-.5;root.add(kettle);
  m('sphere','#d59c43',0,2,0,3.2,2.3,2.6,kettle);m('cylinder','#403c3c',0,4.1,0,2.1,.35,1.7,kettle);m('sphere','#c99441',0,4.5,0,.5,.4,.5,kettle);
  const spout=m('cone','#f0c568',-3.7,3.1,0,.65,3,.65,kettle);spout.rotation.z=-.9;
  const handle=new THREE.Mesh(new THREE.TorusGeometry(1.5,.25,6,12),w.mat('#4d4338'));handle.position.set(3.2,2.3,0);kettle.add(handle);
  for(const x of [-.9,.9]){m('sphere','#fff4cf',x,2.65,2.36,.48,.58,.17,kettle);m('sphere','#38313b',x-.08,2.65,2.52,.18,.25,.1,kettle);}
  // The last hole ends beside a ruined furnace, taking only the broad lava-fort
  // mood from the fifth reference, with original round, low-poly construction.
  if(h.index===2){
    const furnace=new THREE.Group();furnace.position.set(64,ground(64,-467),-467);root.add(furnace);
    for(const side of [-1,1]){
      m('box','#4c4542',side*8,7,0,6,14,8,furnace);m('box','#b29156',side*8,14.5,0,6.6,.8,8.4,furnace);
      for(let j=0;j<3;j++)m('box','#5b5350',side*8-2+j*2,16,0,1.4,2.2,8,furnace);
    }
    m('box','#5a5049',0,12,0,12,3,5,furnace);
    const fall=new THREE.Mesh(new THREE.PlaneGeometry(5,17),lavaMaterial());fall.material.uniforms.vertical.value=1;fall.position.set(0,6.5,2.6);fall.userData.ownedMaterial=true;fall.name='furnace-lavafall';furnace.add(fall);
    w.volcanicFalls=[fall];
  }else w.volcanicFalls=[];
  // Safe tee markers and small chevrons point at the shot corridor.
  for(const x of [-3.6,3.6]){m('cylinder','#3b3737',x,ground(x,0)+.35,0,.5,.7,.5,root);m('cylinder','#edbc48',x,ground(x,0)+.58,0,.51,.12,.51,root);}
  const smoke=makeBatch(w.geometries.sphere,w.mat('#ffffff',{flatShading:true,roughness:1,emissive:'#8e8585',emissiveIntensity:.23}),low?30:52,'volcano-smoke');
  const bombs=makeBatch(w.geometries.sphere,w.mat('#ffb532',{emissive:'#ff5310',emissiveIntensity:2}),low?20:36,'lava-bombs');
  smoke.userData.dynamic=bombs.userData.dynamic=true;smoke.instanceMatrix.setUsage(THREE.DynamicDrawUsage);bombs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const sparkGeo=new THREE.OctahedronGeometry(1,0),sparks=makeBatch(sparkGeo,w.mat('#ffed9a',{emissive:'#ffba3b',emissiveIntensity:1.2}),24,'crystal-glints');sparks.userData.dynamic=true;
  smoke.frustumCulled=bombs.frustumCulled=sparks.frustumCulled=false;
  const update=(time=0)=>{
    const t=w.settings?.reducedMotion?4:time;
    lava.material.uniforms.time.value=t;distantLava.material.uniforms.time.value=t;
    jets.forEach((jet,i)=>jet.scale.set(1+Math.sin(t*2+i)*.07,1+Math.sin(t*2.7+i)*.13,1));
    for(const f of w.volcanicFalls||[])f.material.uniforms.time.value=t;
    smoke.count=bombs.count=sparks.count=0;
    const particles=w.settings?.particles!==false,perSmoke=low?9:16,perBomb=low?10:18;
    for(const [s,site] of eruptionSites.entries()){
      for(let i=0;i<(particles?perSmoke:3);i++){
        const cycle=(t*.065+i/perSmoke+s*.2)%1,spread=(4+cycle*16)*site.scale;
        place(smoke,site.x+Math.sin(i*2.39)*spread+cycle*21*site.scale,site.y+(24+cycle*66)*site.scale,site.z+Math.cos(i*2.39)*spread,
          (6+cycle*14)*site.scale,(7+cycle*13)*site.scale,(6+cycle*13)*site.scale,i,['#77717b','#8f8490','#a69a9a'][i%3]);
      }
      if(s>=2||!particles)continue;
      for(let i=0;i<perBomb;i++){
        const age=(t*.24+i/perBomb)%1,a=i*2.399+s,spread=age*(30+noise(i,3)*35)*site.scale;
        place(bombs,site.x+Math.cos(a)*spread,site.y+Math.sin(age*Math.PI)*(30+noise(i,2)*28)*site.scale-age*12*site.scale,site.z+Math.sin(a)*spread,
          1.2*site.scale,2.7*site.scale,1.2*site.scale,t+i,null,a);
      }
    }
    if(particles)for(const [i,p] of glintSites.entries()){
      const scale=.15+.45*Math.max(0,Math.sin(t*1.8+i*1.7))**8;
      place(sparks,...p,scale,scale*2.8,scale,t*.4);
    }
    for(const batch of [smoke,bombs,sparks])batch.instanceMatrix.needsUpdate=true;
  };
  w.volcanic={update,smoke,bombs,sparks,lava};update(4);
  for(const mesh of [columns,rubble,crystals]){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
}

export function updateVolcanic(w){if(w.volcanic&&!w.presentationPaused)w.volcanic.update(w.clock);}
