import * as THREE from '../vendor/three.module.js';
import { PLANETS, ASTEROIDS, asteroidPosition, nextPlanet } from './planetfall.js';

const hash = n => {const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
const owned = mesh => {mesh.userData.ownedMaterial=true;return mesh;};

function planetGeometry(p) {
  const vertices=[], colors=[], segments=30, rows=15,
    cut=Math.acos(Math.sqrt(p.radius*p.radius-p.pad*p.pad)/p.radius), center=-Math.sqrt(p.radius*p.radius-p.pad*p.pad),
    base=new THREE.Color(p.color), color=new THREE.Color();
  const point=(row,col)=>{
    const theta=cut+(Math.PI-cut)*row/rows, a=col/segments*Math.PI*2+(row%2)*Math.PI/segments,
      r=p.radius*Math.sin(theta), rough=row===0||row===rows?1:1+(hash(row*47+col*3+p.index)*2-1)*.018;
    return [Math.cos(a)*r*rough,center+Math.cos(theta)*p.radius,Math.sin(a)*r*rough];
  };
  const triangle=(a,b,c,row,col)=>{
    vertices.push(...a,...b,...c);
    const latitude=row/rows, noise=hash(row*83+col*7+p.index*101);
    color.copy(base).multiplyScalar(.82+noise*.31);
    if(p.name==='Jupiter') {
      color.set(['#e6c9a4','#c5a28a','#b56d52','#ebd3b6','#926858','#dbaf8c'][Math.floor(latitude*19)%6]);
      if(row>=3&&row<=5&&col>=16&&col<=19)color.set('#b75a3f');
      color.multiplyScalar(.87+noise*.23);
    }
    if(p.name==='Saturn')color.multiplyScalar(.84+Math.sin(latitude*42)*.12);
    if(p.name==='Earth') {
      const continent=Math.sin(col*.72+row*.51)+Math.cos(col*.4-row*.9)+Math.sin(row*1.45);
      color.set(continent>.65?['#3d8057','#79a456','#9db86c'][Math.floor(noise*3)]:['#2364a0','#2c85bb','#1e548a'][Math.floor(noise*3)]);
      if(row<2||row>12)color.set('#c8e6ec');
      if(noise>.92)color.lerp(new THREE.Color('#e8f3ed'),.7);
    }
    if(p.name==='Mars'&&noise>.88)color.multiplyScalar(.62);
    if(p.name==='Mercury'&&noise>.78)color.multiplyScalar(.65);
    if(p.name==='Neptune'&&row===5&&col>14&&col<18)color.multiplyScalar(.65);
    if(p.name==='Sun')color.set(['#e36a13','#ffb12b','#ffe475','#f58b16','#cc5110'][Math.floor(noise*5)]);
    for(let i=0;i<3;i++)colors.push(color.r,color.g,color.b);
  };
  for(let r=0;r<rows;r++)for(let c=0;c<segments;c++){
    const a=point(r,c),b=point(r,c+1),d=point(r+1,c),e=point(r+1,c+1);
    triangle(a,b,d,r,c);triangle(b,e,d,r,c);
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();return geo;
}
function atmosphere(group,p) {
  const mat=new THREE.ShaderMaterial({
    uniforms:{tint:{value:new THREE.Color(p.name==='Sun'?'#ffb42f':p.color)}, strength:{value:p.name==='Sun'?.64:.25}},
    vertexShader:'varying vec3 n; varying vec3 v; varying float height; void main(){height=(modelMatrix*vec4(position,1.)).y;vec4 mv=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
    fragmentShader:'uniform vec3 tint; uniform float strength; varying vec3 n; varying vec3 v; varying float height; void main(){if(height>-.15)discard;float edge=pow(1.-abs(dot(normalize(n),normalize(v))),3.);gl_FragColor=vec4(tint,edge*strength);}',
    transparent:true,side:THREE.FrontSide,depthWrite:false,blending:THREE.AdditiveBlending,
  });
  const shell=owned(new THREE.Mesh(new THREE.SphereGeometry(p.radius*1.025,40,24),mat));
  shell.position.y=-Math.sqrt(p.radius*p.radius-p.pad*p.pad);group.add(shell);
  // The shell is cut at the same height as the landing surface.
  mat.clippingPlanes=[new THREE.Plane(new THREE.Vector3(0,-1,0),-.08)];
}
function makeRings(w,group,p) {
  const rings=new THREE.Group();rings.position.y=-Math.sqrt(p.radius*p.radius-p.pad*p.pad);
  rings.rotation.set(.18,0,p.name==='Uranus'?1.13:.31);group.add(rings);
  const inner=p.radius*1.23,width=p.name==='Saturn'?p.radius*.65:p.radius*.13;
  for(let i=0;i<(p.name==='Saturn'?9:3);i++){
    const band=w.mesh(new THREE.RingGeometry(inner+i*width/9,inner+(i+.77)*width/9,80),['#d8c5a2','#9c8d83','#e9ddbd','#b8aba0'][i%4],0,0,0,1,1,1,rings,{side:THREE.DoubleSide,roughness:1});
    band.rotation.x=-Math.PI/2;
  }
}
function sunProminences(w,group,p) {
  const root=new THREE.Group();root.position.y=-Math.sqrt(p.radius*p.radius-p.pad*p.pad);group.add(root);
  for(let i=0;i<7;i++){
    const a=i*2.399, pts=[];
    for(let j=0;j<=22;j++){
      const u=j/22*Math.PI, r=p.radius+Math.sin(u)*(3+i%3), longitude=a+(j/22-.5)*.33;
      pts.push(new THREE.Vector3(Math.cos(longitude)*r,Math.sin(longitude)*r,Math.sin(u)*2));
    }
    const curve=new THREE.CatmullRomCurve3(pts),mesh=owned(new THREE.Mesh(new THREE.TubeGeometry(curve,24,.45,5,false),new THREE.MeshBasicMaterial({color:'#ff8828',transparent:true,opacity:.85})));
    mesh.rotation.y=a*.7;root.add(mesh);
  }
  return root;
}

export function buildPlanetfallWorld(w,h) {
  w.clear();w.hole=h;w.group=new THREE.Group();w.group.name='planetfall-solar-system';w.scene.add(w.group);
  w.animations=[];w.obstacleMeshes=[];w.coin=w.flag=w.pirateShipMesh=null;w.pirateShipGlints=[];w.sky=null;
  w.scene.background=new THREE.Color('#030b1d');w.scene.fog=null;
  w.camera.near=.25;w.camera.far=6500;w.camera.fov=43;w.camera.updateProjectionMatrix();
  w.renderer.toneMappingExposure=1.12;w.renderer.localClippingEnabled=true;
  w.sun.color.set('#fff1d4');w.sun.intensity=2.6;
  w.hemi?.color.set('#b5d8ff');w.hemi?.groundColor.set('#12213e');if(w.hemi)w.hemi.intensity=1.6;
  w.sun.position.set(-90,160,60);w.sun.target.position.set(0,0,-70);w.scene.add(w.sun.target);
  w.surfaceHeight=(x,z)=>h.planets.find(p=>Math.hypot(x-p.x,z-p.z)<=p.pad)?0:-45;
  w.flightPoints=[];w.shadowCenter=null;if(w.flightTrail)w.flightTrail.visible=false;
  const data=w.planetfallScene={planets:[],time:0};
  for(const p of PLANETS){
    const group=new THREE.Group();group.name='planet-'+p.name.toLowerCase();group.position.set(p.x,0,p.z);w.group.add(group);
    const bodyMat=new THREE.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:1,side:THREE.DoubleSide,...(p.index===8?{emissive:'#ff871b',emissiveIntensity:.55}:{})});
    const body=owned(new THREE.Mesh(planetGeometry(p),bodyMat));body.castShadow=true;body.receiveShadow=false;group.add(body);
    // Exactly circular playing surface. Its edge is shared with planetAt().
    const pad=w.mesh(new THREE.CircleGeometry(p.pad,60),p.padColor,0,0,0,1,1,1,group,{roughness:.95,side:THREE.DoubleSide});pad.rotation.x=-Math.PI/2;pad.receiveShadow=false;
    const edge=owned(new THREE.Mesh(new THREE.RingGeometry(p.pad-.09,p.pad,60),new THREE.MeshBasicMaterial({color:p.padColor,transparent:true,opacity:.8,side:THREE.DoubleSide})));
    edge.rotation.x=-Math.PI/2;edge.position.y=.015;group.add(edge);
    // Tee blocks mark the safe landing cap without adding invisible collisions.
    for(const side of [-1,1])w.mesh('box',p.index===8?'#c5601e':'#f1d6a0',side*p.pad*.62,.35,2.8,.65,.7,.75,group);
    if(p.index===0)for(let i=0;i<8;i++){
      const a=i*2.399,rock=w.mesh('sphere','#477ed1',Math.cos(a)*p.radius*.72,-9-i%3*2,Math.sin(a)*p.radius*.7,2+i%3,3.5,2,group);rock.rotation.z=a;
    }
    if(p.name==='Earth')for(const [x,z,s] of [[-5,3,1.6],[5.3,1.8,1.2],[-4,-4,1]]){
      w.mesh('cylinder','#684d35',x,s*.3,z,.1,s*.6,.1,group);
      w.mesh('cone','#2c6743',x,s*.9,z,s*.45,s*1.3,s*.45,group);
    }
    if(p.name==='Mercury'||p.name==='Mars')for(let i=0;i<15;i++){
      const a=i*2.399,y=-7-(i%4)*7,r=Math.sqrt(Math.max(0,p.radius**2-(y+Math.sqrt(p.radius**2-p.pad**2))**2));
      const crater=w.mesh(new THREE.TorusGeometry(1.1+i%3*.5,.22,3,10),p.name==='Mars'?'#8b412e':'#596576',Math.cos(a)*r,y,Math.sin(a)*r,1,1,1,group);
      crater.lookAt(p.x+Math.cos(a)*r*2,y,p.z+Math.sin(a)*r*2);
    }
    if(p.name==='Saturn'||p.name==='Uranus')makeRings(w,group,p);
    if(p.index===8)data.prominences=sunProminences(w,group,p);
    if(!['Mercury','Mars'].includes(p.name))atmosphere(group,p);
    data.planets.push(group);
  }
  const cup=h.cup;
  w.mesh('cylinder','#301b13',cup.x,.012,cup.z,.26,.02,.26);
  const lip=w.mesh(new THREE.TorusGeometry(.28,.045,5,24),'#ffedb5',cup.x,.025,cup.z);lip.rotation.x=Math.PI/2;
  w.flagPole=w.mesh('cylinder','#fff0cd',cup.x,3,cup.z,.05,6,.05);
  w.flag=w.mesh(new THREE.PlaneGeometry(2,1.2,6,2),'#f25c39',cup.x+1,5.1,cup.z,1,1,1,w.group,{side:THREE.DoubleSide});
  const starPoints=[],starColors=[];
  for(let i=0;i<2600;i++){
    const a=hash(i+1)*Math.PI*2,y=hash(i+5001)*2-1,r=Math.sqrt(1-y*y),radius=2400+hash(i+200)*700;
    starPoints.push(Math.cos(a)*r*radius,y*radius,-h.length/2+Math.sin(a)*r*radius);
    const c=new THREE.Color(i%9===0?'#ffdca2':i%4===0?'#8db5f5':'#e3ecfb');c.multiplyScalar(.5+hash(i*2.7)*.7);starColors.push(c.r,c.g,c.b);
  }
  const starsGeo=new THREE.BufferGeometry();starsGeo.setAttribute('position',new THREE.Float32BufferAttribute(starPoints,3));starsGeo.setAttribute('color',new THREE.Float32BufferAttribute(starColors,3));
  const stars=owned(new THREE.Points(starsGeo,new THREE.PointsMaterial({size:1.55,sizeAttenuation:false,vertexColors:true,transparent:true,opacity:.9})));stars.name='deep-starfield';w.group.add(stars);
  // A faint dust lane gives depth without competing with the planets.
  const dustPoints=[];for(let i=0;i<1300;i++){
    const a=hash(i+80)*Math.PI*2,r=2100+hash(i+400)*300;
    dustPoints.push(Math.cos(a)*r,Math.sin(a)*r*.28+(hash(i+900)-.5)*150,-h.length/2+Math.sin(a)*r);
  }
  const dustGeo=new THREE.BufferGeometry();dustGeo.setAttribute('position',new THREE.Float32BufferAttribute(dustPoints,3));
  w.group.add(owned(new THREE.Points(dustGeo,new THREE.PointsMaterial({color:'#31538b',size:3,sizeAttenuation:false,transparent:true,opacity:.16,depthWrite:false}))));
  data.rocks=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),w.mat('#7b7c89',{flatShading:true,roughness:1}),ASTEROIDS.length);
  data.rocks.name='collidable-asteroid-belt';data.rocks.castShadow=true;data.rocks.frustumCulled=false;data.rocks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);w.group.add(data.rocks);
  const dummy=new THREE.Object3D();data.dummy=dummy;
  for(let i=0;i<ASTEROIDS.length;i++)data.rocks.setColorAt(i,new THREE.Color(['#8e8c96','#606575','#aa9f92','#777986'][i%4]));
  data.comets=[];
  for(let i=0;i<5;i++){
    const root=new THREE.Group();w.group.add(root);
    const head=w.mesh('sphere',i%2?'#ffe2ad':'#cef3ff',0,0,0,.6,.6,.6,root,{emissive:i%2?'#ffcd8a':'#95ddff',emissiveIntensity:2});
    const pts=[],colors=[];for(let j=0;j<40;j++){pts.push(j*1.1,j*.22,0);const c=new THREE.Color('#9cdfff').multiplyScalar((1-j/40)*.7);colors.push(c.r,c.g,c.b);}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    root.add(owned(new THREE.Line(geo,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.65,blending:THREE.AdditiveBlending,depthWrite:false}))));
    data.comets.push({root,head});
  }
  updatePlanetfallScene(w,0,{clock:0});
  w.renderer.shadowMap.needsUpdate=true;
}

export function updatePlanetfallScene(w,dt,physics) {
  const data=w.planetfallScene;if(!data||!w.hole.space)return;
  if(!w.presentationPaused)data.time+=dt;
  const clock=physics?.clock||0,dummy=data.dummy;
  for(let i=0;i<ASTEROIDS.length;i++){
    const p=asteroidPosition(i,clock);dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(clock*.15+i,clock*.08+i*2.4,i*.7);dummy.scale.setScalar(p.radius);dummy.updateMatrix();data.rocks.setMatrixAt(i,dummy.matrix);
  }
  data.rocks.instanceMatrix.needsUpdate=true;
  data.screenPoint??=new THREE.Vector3();
  for(let i=0;i<data.comets.length;i++){
    const c=data.comets[i],cycle=(data.time+i*7)%18,
      x=i<2?1.3-cycle*3.6:1.35-((data.time*.027+i*.79)%2.7),y=i<2?.77-cycle*.2:.42+i*.065;
    c.root.visible=!w.settings?.reducedMotion && (i>=2||cycle<.75);
    data.screenPoint.set(x,y,.99).unproject(w.camera).sub(w.camera.position).normalize().multiplyScalar(600).add(w.camera.position);
    c.root.position.copy(data.screenPoint);c.root.quaternion.copy(w.camera.quaternion);
    c.head.scale.setScalar(i<2?.45:1.1);
  }
  if(data.prominences)data.prominences.rotation.y=data.time*.018;
}

// Wide oblique framing shows the current globe AND the next landing. Manual
// orbit/zoom still work; the camera never drives shot direction or progression.
export class PlanetfallCamera {
  constructor(world){this.world=world;this.initialized=false;this.manualTimer=0;this.state='follow';this.isCinematic=false;this.position=new THREE.Vector3();this.target=new THREE.Vector3();}
  get manualActive(){return this.manualTimer>0;}
  reset(ball,{cut=false}={}){if(cut)this.initialized=false;this.manualTimer=0;}
  beginShot(){}
  skip(){}
  enableCinematic(){}
  manualInput(){this.manualTimer=3;}
  update(dt,ball,physics){
    const w=this.world;if(w.presentationPaused&&this.initialized)return;
    this.manualTimer=Math.max(0,this.manualTimer-dt);
    const p=PLANETS[physics.reached||0],next=nextPlanet(physics.reached),sun=physics.reached===8,
      aim=sun?w.hole.cup:next,span=sun?30:Math.hypot(aim.x-p.x,aim.z-p.z),
      portrait=Math.max(1,1.35/w.camera.aspect),scale=Math.min(2.8,Math.max(.58,w.zoom/13)),
      distance=Math.max(95,span*1.3)*portrait*scale,
      orbit=w.orbit+.67,focus=physics.active?.62:.48;
    this.target.set(p.x+(aim.x-p.x)*focus,-8+(physics.active?Math.max(0,ball.y)*.24:0),p.z+(aim.z-p.z)*focus);
    this.position.set(this.target.x+Math.sin(orbit)*distance,this.target.y+distance*(.56+Math.max(0,w.pitch-.24)*.5),this.target.z+Math.cos(orbit)*distance);
    const blend=this.initialized?1-Math.exp(-dt*3.5):1;
    w.camera.position.lerp(this.position,blend);w.look.lerp(this.target,blend);w.camera.lookAt(w.look);this.initialized=true;
    w.visualBallRadius=.32;
    if(w.ballHalo){w.ballHalo.scale.setScalar(2.4);w.ballHalo.visible=!physics.active&&!physics.sunk;}
  }
}
